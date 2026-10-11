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
from research.evaluation.metrics import evaluate_case, aggregate_metrics, paired_significance_test

def run_comprehensive_evaluation(limit_cpu_cases: int = 40, limit_other_cases: int = 20, seed: int = 42):
    """
    Executes full comparative research evaluation:
    - 6 Baselines
    - 2 Hybrids
    - Proposed OSCAR-CTRCL
    - 3 Ablation Variants
    - Robustness Degradation Analysis
    """
    loader = RCADataLoader()
    manifest = loader.manifest_df

    # Sample authentic cases
    cpu_cases = manifest[manifest['fault'].str.lower() == 'cpu'].copy()
    if limit_cpu_cases and len(cpu_cases) > limit_cpu_cases:
        cpu_cases = cpu_cases.sample(n=limit_cpu_cases, random_state=seed)

    other_cases = manifest[manifest['fault'].str.lower() != 'cpu'].copy()
    if limit_other_cases and len(other_cases) > limit_other_cases:
        other_cases = other_cases.sample(n=limit_other_cases, random_state=seed)

    target_cases_df = pd.concat([cpu_cases, other_cases]).reset_index(drop=True)
    print(f"Comprehensive Evaluation Cases: {len(target_cases_df)} (CPU: {len(cpu_cases)}, Cross-Fault: {len(other_cases)})")

    # Define all model variants
    baro = BAROAdapter()
    circa = CIRCAAdapter()
    rcd = RCDAdapter()
    microcause = MicroCauseAdapter()
    ediag = EDiagnosisAdapter()
    ms_baro = MultiSourceBAROAdapter()

    hybrid_rrf = ReciprocalRankFusion([baro, circa, microcause])
    hybrid_ct = CausalTemporalHybrid()

    oscar_full = OSCAR_CTRCL()
    oscar_no_temporal = OSCAR_CTRCL(disable_temporal=True)
    oscar_no_causal = OSCAR_CTRCL(disable_causal=True)
    oscar_no_res_boost = OSCAR_CTRCL(disable_resource_boost=True)

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
        "Ablation: w/o Temporal": oscar_no_temporal,
        "Ablation: w/o Causal": oscar_no_causal,
        "Ablation: w/o ResourceBoost": oscar_no_res_boost
    }

    all_case_evals: Dict[str, List[Dict[str, Any]]] = {name: [] for name in models}
    detailed_results = []

    for idx, row in target_cases_df.iterrows():
        case_id = row['case']
        system_name = row['system_name']
        fault = row['fault']
        root_cause = row['root_cause_service']

        try:
            incident = loader.load_incident(case_id, pre_window=300, post_window=300)
        except Exception as e:
            print(f"Skipping {case_id}: {e}")
            continue

        num_candidates = len(incident.services)

        for name, model in models.items():
            try:
                res = model.diagnose(incident)
                metrics = evaluate_case(res.ranked_services, root_cause, num_candidates)
                metrics["case_id"] = case_id
                metrics["system"] = system_name
                metrics["fault"] = fault
                metrics["is_cpu"] = bool(fault.lower() == 'cpu')
                metrics["runtime_sec"] = res.runtime_sec

                all_case_evals[name].append(metrics)
                detailed_results.append({
                    "case_id": case_id,
                    "model": name,
                    "system": system_name,
                    "fault": fault,
                    "is_cpu": metrics["is_cpu"],
                    "root_cause": root_cause,
                    "ranked_top3": res.ranked_services[:3],
                    "hit@1": metrics["hit@1"],
                    "hit@3": metrics["hit@3"],
                    "mrr": metrics["mrr"],
                    "runtime_sec": res.runtime_sec
                })
            except Exception as e:
                print(f"Error {name} on {case_id}: {e}")

    # Aggregated Summary
    summary_rows = []
    cpu_scores_for_test = {}

    for name, evals in all_case_evals.items():
        if not evals:
            continue
        agg = aggregate_metrics(evals)
        cpu_evals = [e for e in evals if e["is_cpu"]]
        agg_cpu = aggregate_metrics(cpu_evals) if cpu_evals else {}
        cpu_scores_for_test[name] = [e["hit@1"] for e in cpu_evals]

        summary_rows.append({
            "Method": name,
            "Total_Cases": len(evals),
            "Hit@1_Overall": agg.get("hit@1", {}).get("mean", 0.0),
            "Hit@1_Overall_95CI": agg.get("hit@1", {}).get("ci_95", [0.0, 0.0]),
            "Hit@3_Overall": agg.get("hit@3", {}).get("mean", 0.0),
            "MRR_Overall": agg.get("mrr", {}).get("mean", 0.0),
            "Hit@1_CPU": agg_cpu.get("hit@1", {}).get("mean", 0.0),
            "Hit@1_CPU_95CI": agg_cpu.get("hit@1", {}).get("ci_95", [0.0, 0.0]),
            "Hit@3_CPU": agg_cpu.get("hit@3", {}).get("mean", 0.0),
            "MRR_CPU": agg_cpu.get("mrr", {}).get("mean", 0.0),
            "Mean_Runtime_Sec": agg.get("runtime_sec", {}).get("mean", 0.0),
            "Chance_Hit@1": agg.get("chance_hit@1", {}).get("mean", 0.0)
        })

    summary_df = pd.DataFrame(summary_rows)
    os.makedirs("research/results", exist_ok=True)
    summary_df.to_csv("research/results/comprehensive_summary.csv", index=False)
    with open("research/results/comprehensive_detailed.json", "w") as f:
        json.dump(detailed_results, f, indent=2)

    # Statistical significance of proposed vs best baseline on CPU cases
    if "OSCAR-CTRCL (Proposed)" in cpu_scores_for_test and "BARO" in cpu_scores_for_test:
        sig_test = paired_significance_test(
            cpu_scores_for_test["OSCAR-CTRCL (Proposed)"],
            cpu_scores_for_test["BARO"]
        )
        with open("research/results/statistical_significance_test.json", "w") as f:
            json.dump(sig_test, f, indent=2)
        print("\nStatistical Significance (OSCAR-CTRCL vs BARO on CPU incidents):")
        print(f"Mean Difference: +{sig_test['mean_difference']:.4f}, p-value: {sig_test['p_value']:.4e}, Significant: {sig_test['statistically_significant']}")

    print("\n" + "="*80)
    print("COMPREHENSIVE RESEARCH EVALUATION SUMMARY")
    print("="*80)
    print(summary_df[["Method", "Hit@1_Overall", "Hit@3_Overall", "MRR_Overall", "Hit@1_CPU", "MRR_CPU", "Mean_Runtime_Sec"]].to_string(index=False))

    return summary_df

if __name__ == "__main__":
    run_comprehensive_evaluation(limit_cpu_cases=40, limit_other_cases=20)
