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
from research.evaluation.metrics import evaluate_case, aggregate_metrics

def run_baseline_campaign(limit_cpu_cases: int = 30, limit_other_cases: int = 20, seed: int = 42):
    """
    Executes baseline experimental campaign across authentic benchmark cases.
    Evaluates all 6 algorithms on CPU-centric incidents and cross-fault incidents.
    """
    loader = RCADataLoader()
    manifest = loader.manifest_df

    # Filter CPU cases
    cpu_cases = manifest[manifest['fault'].str.lower() == 'cpu'].copy()
    if limit_cpu_cases and len(cpu_cases) > limit_cpu_cases:
        cpu_cases = cpu_cases.sample(n=limit_cpu_cases, random_state=seed)

    # Filter other fault cases for cross-fault comparison
    other_cases = manifest[manifest['fault'].str.lower() != 'cpu'].copy()
    if limit_other_cases and len(other_cases) > limit_other_cases:
        other_cases = other_cases.sample(n=limit_other_cases, random_state=seed)

    target_cases_df = pd.concat([cpu_cases, other_cases]).reset_index(drop=True)
    print(f"Total campaign cases to evaluate: {len(target_cases_df)} (CPU: {len(cpu_cases)}, Other: {len(other_cases)})")

    # Instantiate baselines
    algorithms = [
        BAROAdapter(),
        CIRCAAdapter(),
        RCDAdapter(),
        MicroCauseAdapter(),
        EDiagnosisAdapter(),
        MultiSourceBAROAdapter()
    ]

    all_case_evals: Dict[str, List[Dict[str, Any]]] = {algo.name: [] for algo in algorithms}
    detailed_results = []

    for idx, row in target_cases_df.iterrows():
        case_id = row['case']
        system_name = row['system_name']
        fault = row['fault']
        root_cause = row['root_cause_service']
        print(f"[{idx+1}/{len(target_cases_df)}] Processing {case_id} ({system_name}, {fault}, RC: {root_cause})...")

        try:
            incident = loader.load_incident(case_id, pre_window=300, post_window=300)
        except Exception as e:
            print(f"  Error loading case {case_id}: {e}")
            continue

        num_candidates = len(incident.services)

        for algo in algorithms:
            try:
                res = algo.diagnose(incident)
                metrics = evaluate_case(res.ranked_services, root_cause, num_candidates)
                metrics["case_id"] = case_id
                metrics["system"] = system_name
                metrics["fault"] = fault
                metrics["is_cpu"] = bool(fault.lower() == 'cpu')
                metrics["runtime_sec"] = res.runtime_sec
                metrics["predicted_top1"] = res.ranked_services[0] if res.ranked_services else "None"
                metrics["ground_truth"] = root_cause

                all_case_evals[algo.name].append(metrics)
                detailed_results.append({
                    "case_id": case_id,
                    "algorithm": algo.name,
                    "system": system_name,
                    "fault": fault,
                    "is_cpu": metrics["is_cpu"],
                    "root_cause": root_cause,
                    "ranked_top3": res.ranked_services[:3],
                    "hit@1": metrics["hit@1"],
                    "hit@3": metrics["hit@3"],
                    "hit@5": metrics["hit@5"],
                    "mrr": metrics["mrr"],
                    "ndcg@3": metrics["ndcg@3"],
                    "runtime_sec": res.runtime_sec
                })
            except Exception as e:
                print(f"  Failed {algo.name} on {case_id}: {e}")

    # Compute aggregate metrics
    os.makedirs("research/results", exist_ok=True)
    summary_rows = []

    print("\n" + "="*80)
    print("BASELINE EVALUATION SUMMARY (ALL EVALUATED CASES)")
    print("="*80)

    for algo_name, evals in all_case_evals.items():
        if not evals:
            continue
        agg = aggregate_metrics(evals)
        cpu_evals = [e for e in evals if e["is_cpu"]]
        agg_cpu = aggregate_metrics(cpu_evals) if cpu_evals else {}

        summary_rows.append({
            "Algorithm": algo_name,
            "Total_Cases": len(evals),
            "Hit@1_Overall": agg.get("hit@1", {}).get("mean", 0.0),
            "Hit@1_Overall_95CI": agg.get("hit@1", {}).get("ci_95", [0.0, 0.0]),
            "Hit@3_Overall": agg.get("hit@3", {}).get("mean", 0.0),
            "MRR_Overall": agg.get("mrr", {}).get("mean", 0.0),
            "NDCG@3_Overall": agg.get("ndcg@3", {}).get("mean", 0.0),
            "Hit@1_CPU": agg_cpu.get("hit@1", {}).get("mean", 0.0),
            "Hit@3_CPU": agg_cpu.get("hit@3", {}).get("mean", 0.0),
            "MRR_CPU": agg_cpu.get("mrr", {}).get("mean", 0.0),
            "Mean_Runtime_Sec": agg.get("runtime_sec", {}).get("mean", 0.0),
            "Theoretical_Chance_Hit@1": agg.get("chance_hit@1", {}).get("mean", 0.0)
        })

    summary_df = pd.DataFrame(summary_rows)
    print(summary_df[["Algorithm", "Hit@1_Overall", "Hit@3_Overall", "MRR_Overall", "Hit@1_CPU", "MRR_CPU", "Mean_Runtime_Sec", "Theoretical_Chance_Hit@1"]].to_string(index=False))

    # Save results to disk
    summary_df.to_csv("research/results/baseline_summary.csv", index=False)
    with open("research/results/baseline_detailed.json", "w") as f:
        json.dump(detailed_results, f, indent=2)

    print("\nResults successfully saved to research/results/baseline_summary.csv and baseline_detailed.json")
    return summary_df

if __name__ == "__main__":
    run_baseline_campaign(limit_cpu_cases=30, limit_other_cases=20)
