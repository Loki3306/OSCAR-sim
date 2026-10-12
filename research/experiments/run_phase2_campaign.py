import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
import json
import time
import pandas as pd
import numpy as np
from typing import List, Dict, Any

from research.preprocessing.data_loader import RCADataLoader, IncidentData
from research.baselines.baro_adapter import BAROAdapter
from research.baselines.circa_adapter import CIRCAAdapter
from research.baselines.rcd_adapter import RCDAdapter
from research.baselines.microcause_adapter import MicroCauseAdapter
from research.baselines.ediagnosis_adapter import EDiagnosisAdapter
from research.baselines.ms_baro_adapter import MultiSourceBAROAdapter
from research.hybrids.reciprocal_rank_fusion import ReciprocalRankFusion
from research.hybrids.causal_temporal_hybrid import CausalTemporalHybrid
from research.proposed_method.oscar_ctrcl import OSCAR_CTRCL
from research.evaluation.metrics import (
    evaluate_case,
    aggregate_metrics,
    compute_exact_mcnemar,
    compute_paired_ranking_tests,
    compute_stratified_bootstrap_ci,
    holm_bonferroni_correction
)

def run_phase2_campaign(seed: int = 42):
    """
    Phase II Expanded Campaign:
    - Complete eligible 120 CPU cohort evaluated across all 3 systems.
    - 30 Cross-fault incidents for generalization.
    - Retrieval vs. Ranking failure decomposition.
    - Exact McNemar test & paired ranking tests on verified full cohort.
    """
    loader = RCADataLoader()
    manifest = loader.manifest_df

    # 1. Full 120 CPU Cases (No sampling, entire eligible cohort)
    cpu_cases_df = manifest[manifest['fault'].str.lower() == 'cpu'].copy().reset_index(drop=True)
    print(f"Total CPU cohort cases: {len(cpu_cases_df)}")

    # 2. 30 Stratified Cross-Fault Cases
    other_cases = manifest[manifest['fault'].str.lower() != 'cpu'].copy()
    other_sample = other_cases.groupby('fault', group_keys=False).apply(
        lambda g: g.sample(min(len(g), 3), random_state=seed)
    ).head(30).reset_index(drop=True)

    all_target_cases = pd.concat([cpu_cases_df, other_sample]).reset_index(drop=True)
    print(f"Total Phase II evaluated cases: {len(all_target_cases)} (CPU: {len(cpu_cases_df)}, Cross-Fault: {len(other_sample)})")

    # Models
    baro = BAROAdapter()
    circa = CIRCAAdapter()
    rcd = RCDAdapter()
    microcause = MicroCauseAdapter()
    ediag = EDiagnosisAdapter()
    ms_baro = MultiSourceBAROAdapter()

    hybrid_rrf = ReciprocalRankFusion([baro, circa, microcause])
    hybrid_ct = CausalTemporalHybrid()

    oscar_full = OSCAR_CTRCL()
    oscar_no_causal = OSCAR_CTRCL(disable_causal=True)
    oscar_no_res = OSCAR_CTRCL(disable_resource_boost=True)

    models = {
        "BARO": baro,
        "CIRCA": circa,
        "RCD": rcd,
        "MicroCause": microcause,
        "E-Diagnosis": ediag,
        "Multi-Source BARO": ms_baro,
        "Hybrid-RRF": hybrid_rrf,
        "Hybrid-CausalTemporal": hybrid_ct,
        "OSCAR-CTRCL (Proposed)": oscar_full,
        "Ablation: w/o Causal": oscar_no_causal,
        "Ablation: w/o ResourceBoost": oscar_no_res
    }

    detailed_results = []
    case_predictions_cpu: Dict[str, Dict[str, Any]] = {m: {} for m in models}
    error_decomposition: Dict[str, List[Dict[str, Any]]] = {m: [] for m in models}

    for idx, row in all_target_cases.iterrows():
        case_id = row['case']
        system_name = row['system_name']
        suite = row['suite']
        fault = row['fault']
        root_cause = row['root_cause_service']
        is_cpu = bool(fault.lower() == 'cpu')

        try:
            incident = loader.load_incident(case_id, pre_window=300, post_window=300)
        except Exception as e:
            print(f"Error loading {case_id}: {e}")
            continue

        num_candidates = len(incident.services)
        G = incident.topology

        for name, model in models.items():
            try:
                res = model.diagnose(incident)
                metrics = evaluate_case(res.ranked_services, root_cause, num_candidates)
                
                # Check rank of ground truth
                try:
                    gt_rank = res.ranked_services.index(root_cause) + 1
                except ValueError:
                    gt_rank = 999

                # Retrieval vs Ranking Failure Decomposition
                # Retrieval failure: Root cause service absent or scored 0
                is_retrieved = root_cause in res.ranked_services and res.service_scores.get(root_cause, 0.0) > 0.0
                if metrics["hit@1"] == 1.0:
                    failure_type = "NONE"
                elif not is_retrieved:
                    failure_type = "RETRIEVAL_FAILURE"
                else:
                    # Ranking failure: Check if higher ranked service is caller/callee symptom
                    top1 = res.ranked_services[0] if res.ranked_services else "None"
                    is_caller_symptom = G.has_edge(top1, root_cause) if G else False
                    is_callee_symptom = G.has_edge(root_cause, top1) if G else False
                    if is_caller_symptom:
                        failure_type = "RANKING_CALLER_SYMPTOM"
                    elif is_callee_symptom:
                        failure_type = "RANKING_CALLEE_SYMPTOM"
                    else:
                        failure_type = "RANKING_OTHER"

                if failure_type != "NONE":
                    error_decomposition[name].append({
                        "case_id": case_id,
                        "system": system_name,
                        "root_cause": root_cause,
                        "predicted_top1": res.ranked_services[0] if res.ranked_services else "None",
                        "gt_rank": gt_rank,
                        "failure_type": failure_type
                    })

                record = {
                    "case_id": case_id,
                    "model": name,
                    "system": system_name,
                    "suite": suite,
                    "fault": fault,
                    "is_cpu": is_cpu,
                    "root_cause": root_cause,
                    "predicted_top1": res.ranked_services[0] if res.ranked_services else "None",
                    "gt_rank": gt_rank,
                    "hit@1": metrics["hit@1"],
                    "hit@3": metrics["hit@3"],
                    "hit@5": metrics["hit@5"],
                    "mrr": metrics["mrr"],
                    "chance_hit1": metrics["chance_hit@1"],
                    "chance_mrr": metrics["chance_mrr"],
                    "failure_type": failure_type,
                    "runtime_sec": res.runtime_sec
                }
                detailed_results.append(record)

                if is_cpu:
                    case_predictions_cpu[name][case_id] = record

            except Exception as e:
                print(f"Error {name} on {case_id}: {e}")

    output_dir = "research/results/phase2_verified"
    os.makedirs(output_dir, exist_ok=True)

    # Save detailed per-case JSON
    with open(os.path.join(output_dir, "phase2_detailed_per_case.json"), "w") as f:
        json.dump(detailed_results, f, indent=2)

    with open(os.path.join(output_dir, "phase2_error_decomposition.json"), "w") as f:
        json.dump(error_decomposition, f, indent=2)

    df_details = pd.DataFrame(detailed_results)
    cpu_df = df_details[df_details['is_cpu']].copy()

    # Aggregate metrics for CPU cohort (N=120) and Overall
    summary_rows = []
    for name in models:
        sub_cpu = cpu_df[cpu_df['model'] == name]
        sub_all = df_details[df_details['model'] == name]

        n_cpu = len(sub_cpu)
        hit1_cpu = float(sub_cpu['hit@1'].mean()) if n_cpu > 0 else 0.0
        hit3_cpu = float(sub_cpu['hit@3'].mean()) if n_cpu > 0 else 0.0
        mrr_cpu = float(sub_cpu['mrr'].mean()) if n_cpu > 0 else 0.0
        chance_hit1 = float(sub_cpu['chance_hit1'].mean()) if n_cpu > 0 else 0.0
        chance_mrr = float(sub_cpu['chance_mrr'].mean()) if n_cpu > 0 else 0.0
        runtime = float(sub_cpu['runtime_sec'].mean()) if n_cpu > 0 else 0.0

        # Stratified Bootstrap 95% CI on Hit@1 (10,000 resamples)
        _, hit1_ci_l, hit1_ci_u = compute_stratified_bootstrap_ci(
            sub_cpu.to_dict(orient='records'), "hit@1", strata_key="system", n_resamples=10000
        )
        _, mrr_ci_l, mrr_ci_u = compute_stratified_bootstrap_ci(
            sub_cpu.to_dict(orient='records'), "mrr", strata_key="system", n_resamples=10000
        )

        summary_rows.append({
            "Method": name,
            "CPU_Cohort_N": n_cpu,
            "Hit@1_CPU": hit1_cpu,
            "Hit@1_CPU_95CI": [hit1_ci_l, hit1_ci_u],
            "Hit@3_CPU": hit3_cpu,
            "MRR_CPU": mrr_cpu,
            "MRR_CPU_95CI": [mrr_ci_l, mrr_ci_u],
            "Hit@1_Overall": float(sub_all['hit@1'].mean()),
            "MRR_Overall": float(sub_all['mrr'].mean()),
            "Theoretical_Chance_Hit1": chance_hit1,
            "Theoretical_Chance_MRR": chance_mrr,
            "Mean_Runtime_Sec": runtime
        })

    summary_df = pd.DataFrame(summary_rows)
    summary_df.to_csv(os.path.join(output_dir, "phase2_cpu_summary.csv"), index=False)

    # Statistical Significance Testing on the Full 120 CPU Cohort
    oscar_cases = cpu_df[cpu_df['model'] == "OSCAR-CTRCL (Proposed)"].set_index('case_id')
    statistical_tests = {}
    raw_p_mcnemar = []
    baseline_names_for_mcnemar = []

    for name in ["BARO", "RCD", "E-Diagnosis", "Multi-Source BARO", "MicroCause", "CIRCA"]:
        base_cases = cpu_df[cpu_df['model'] == name].set_index('case_id')
        common_ids = [cid for cid in oscar_cases.index if cid in base_cases.index]
        
        y_oscar = [oscar_cases.loc[cid, 'hit@1'] for cid in common_ids]
        y_base = [base_cases.loc[cid, 'hit@1'] for cid in common_ids]
        rr_oscar = [oscar_cases.loc[cid, 'mrr'] for cid in common_ids]
        rr_base = [base_cases.loc[cid, 'mrr'] for cid in common_ids]

        # Exact McNemar on Hit@1
        mcnemar_res = compute_exact_mcnemar(y_oscar, y_base)
        # Paired Ranking test on MRR
        ranking_res = compute_paired_ranking_tests(rr_oscar, rr_base, num_permutations=10000)

        statistical_tests[f"OSCAR_vs_{name}"] = {
            "comparison": f"OSCAR-CTRCL vs {name}",
            "sample_size_n": len(common_ids),
            "mcnemar": mcnemar_res,
            "ranking_tests": ranking_res
        }
        baseline_names_for_mcnemar.append(f"OSCAR_vs_{name}")
        raw_p_mcnemar.append(mcnemar_res["p_value"])

    # Holm-Bonferroni correction
    adj_p = holm_bonferroni_correction(raw_p_mcnemar)
    for key, p_adj in zip(baseline_names_for_mcnemar, adj_p):
        statistical_tests[key]["mcnemar"]["p_value_holm_adjusted"] = p_adj
        statistical_tests[key]["mcnemar"]["significant_after_holm"] = bool(p_adj < 0.05)

    with open(os.path.join(output_dir, "phase2_mcnemar_statistical_tests.json"), "w") as f:
        json.dump(statistical_tests, f, indent=2)

    print("\n" + "="*85)
    print("PHASE II EXPANDED EVALUATION: FULL 120 CPU COHORT & COMPREHENSIVE BENCHMARK")
    print("="*85)
    print(summary_df[["Method", "CPU_Cohort_N", "Hit@1_CPU", "Hit@3_CPU", "MRR_CPU", "Hit@1_Overall", "MRR_Overall", "Mean_Runtime_Sec"]].to_string(index=False))

    print("\n" + "-"*85)
    print("CONFIRMATORY STATISTICAL TESTS (FULL 120 CPU COHORT)")
    print("-"*85)
    for k, v in statistical_tests.items():
        mc = v["mcnemar"]
        rk = v["ranking_tests"]
        print(f"{v['comparison']}:")
        print(f"  Hit@1 Contingency: n11={mc['contingency_table']['n11']}, n10={mc['contingency_table']['n10']}, n01={mc['contingency_table']['n01']}, n00={mc['contingency_table']['n00']}")
        print(f"  Hit@1 McNemar p-raw: {mc['p_value']:.4e}, p-Holm: {mc.get('p_value_holm_adjusted', 1.0):.4e}, Sig: {mc.get('significant_after_holm', False)}")
        print(f"  MRR Mean Diff: +{rk['mean_difference']:.4f}, Wilcoxon p: {rk['wilcoxon_p_value']:.4e}, Permutation p: {rk['permutation_p_value']:.4e}, Cohen's dz: {rk['cohens_dz']:.3f}\n")

    return summary_df

if __name__ == "__main__":
    run_phase2_campaign()
