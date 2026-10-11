import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
import json
import pandas as pd
import numpy as np
import copy
from typing import Dict, List, Any

from research.preprocessing.data_loader import RCADataLoader, IncidentData
from research.baselines.baro_adapter import BAROAdapter
from research.baselines.rcd_adapter import RCDAdapter
from research.proposed_method.oscar_ctrcl import OSCAR_CTRCL
from research.evaluation.metrics import evaluate_case, aggregate_metrics

def apply_noise(incident: IncidentData, noise_level: float, seed: int = 42) -> IncidentData:
    """Injects zero-mean Gaussian measurement noise into numeric metric columns."""
    df_noisy = incident.metrics_df.copy()
    rng = np.random.default_rng(seed=seed)
    for col in df_noisy.columns:
        if col == "time" or col.startswith("PassthroughCluster"):
            continue
        vals = df_noisy[col].to_numpy()
        std_col = np.std(vals)
        if std_col > 1e-4:
            noise = rng.normal(0, noise_level * std_col, size=len(vals))
            df_noisy[col] = vals + noise
    
    inc = copy.copy(incident)
    inc.metrics_df = df_noisy
    return inc

def apply_missingness(incident: IncidentData, drop_ratio: float, seed: int = 42) -> IncidentData:
    """Randomly removes drop_ratio fraction of metric columns to simulate telemetry loss."""
    df_dropped = incident.metrics_df.copy()
    metric_cols = [c for c in df_dropped.columns if c != "time" and not c.startswith("PassthroughCluster")]
    rng = np.random.default_rng(seed=seed)
    num_to_drop = int(len(metric_cols) * drop_ratio)
    if num_to_drop > 0:
        dropped_cols = rng.choice(metric_cols, size=num_to_drop, replace=False)
        df_dropped = df_dropped.drop(columns=dropped_cols)

    inc = copy.copy(incident)
    inc.metrics_df = df_dropped
    return inc

def run_robustness_experiment(num_cases: int = 25, seed: int = 42):
    """Evaluates algorithm degradation under noise and telemetry missingness."""
    loader = RCADataLoader()
    manifest = loader.manifest_df
    cpu_cases = manifest[manifest['fault'].str.lower() == 'cpu'].sample(n=num_cases, random_state=seed)

    models = {
        "BARO": BAROAdapter(),
        "RCD": RCDAdapter(),
        "OSCAR-CTRCL": OSCAR_CTRCL()
    }

    noise_levels = [0.0, 0.1, 0.25, 0.5]
    missing_levels = [0.0, 0.1, 0.25, 0.5]

    results_noise = []
    results_missing = []

    print("Running Robustness Evaluation (Noise & Telemetry Gaps)...")

    # 1. Noise Study
    for noise in noise_levels:
        print(f"Evaluating Noise Level sigma = {noise}...")
        for _, row in cpu_cases.iterrows():
            case_id = row['case']
            root_cause = row['root_cause_service']
            try:
                base_inc = loader.load_incident(case_id, pre_window=300, post_window=300)
                noisy_inc = apply_noise(base_inc, noise, seed=seed)
            except Exception:
                continue

            for name, model in models.items():
                res = model.diagnose(noisy_inc)
                hit1 = evaluate_case(res.ranked_services, root_cause)["hit@1"]
                mrr = evaluate_case(res.ranked_services, root_cause)["mrr"]
                results_noise.append({
                    "noise_level": noise,
                    "model": name,
                    "case_id": case_id,
                    "hit@1": hit1,
                    "mrr": mrr
                })

    # 2. Missing Telemetry Study
    for drop in missing_levels:
        print(f"Evaluating Missingness drop_ratio = {drop}...")
        for _, row in cpu_cases.iterrows():
            case_id = row['case']
            root_cause = row['root_cause_service']
            try:
                base_inc = loader.load_incident(case_id, pre_window=300, post_window=300)
                missing_inc = apply_missingness(base_inc, drop, seed=seed)
            except Exception:
                continue

            for name, model in models.items():
                res = model.diagnose(missing_inc)
                hit1 = evaluate_case(res.ranked_services, root_cause)["hit@1"]
                mrr = evaluate_case(res.ranked_services, root_cause)["mrr"]
                results_missing.append({
                    "drop_ratio": drop,
                    "model": name,
                    "case_id": case_id,
                    "hit@1": hit1,
                    "mrr": mrr
                })

    df_noise = pd.DataFrame(results_noise)
    df_missing = pd.DataFrame(results_missing)

    summary_noise = df_noise.groupby(["noise_level", "model"]).agg({"hit@1": "mean", "mrr": "mean"}).reset_index()
    summary_missing = df_missing.groupby(["drop_ratio", "model"]).agg({"hit@1": "mean", "mrr": "mean"}).reset_index()

    os.makedirs("research/results", exist_ok=True)
    summary_noise.to_csv("research/results/robustness_noise.csv", index=False)
    summary_missing.to_csv("research/results/robustness_missing.csv", index=False)

    print("\nRobustness Noise Summary:")
    print(summary_noise.to_string(index=False))
    print("\nRobustness Missingness Summary:")
    print(summary_missing.to_string(index=False))

    return summary_noise, summary_missing

if __name__ == "__main__":
    run_robustness_experiment(num_cases=25)
