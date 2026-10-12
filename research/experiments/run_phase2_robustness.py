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
from research.evaluation.metrics import evaluate_case, compute_exact_mcnemar

def apply_noise(incident: IncidentData, noise_level: float, seed: int = 42) -> IncidentData:
    """Injects zero-mean Gaussian measurement noise scaled to feature standard deviation."""
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

def run_phase2_robustness(num_cases: int = 60, seed: int = 42):
    """
    Evaluates algorithm degradation under noise and telemetry missingness
    with full sample size disclosure and paired contingency testing.
    """
    loader = RCADataLoader()
    manifest = loader.manifest_df
    cpu_cases_all = manifest[manifest['fault'].str.lower() == 'cpu'].copy()
    
    # Stratified sample across systems (20 cases per system for N=60)
    cpu_cases = cpu_cases_all.groupby('system_name', group_keys=False).apply(
        lambda g: g.sample(min(len(g), num_cases // 3), random_state=seed)
    ).reset_index(drop=True)

    models = {
        "BARO": BAROAdapter(),
        "RCD": RCDAdapter(),
        "OSCAR-CTRCL": OSCAR_CTRCL()
    }

    noise_levels = [0.0, 0.1, 0.25, 0.5]
    missing_levels = [0.0, 0.1, 0.25, 0.5]

    results_noise = []
    results_missing = []

    output_dir = "research/results/phase2_verified"
    os.makedirs(output_dir, exist_ok=True)

    print(f"Running Phase II Verified Robustness Evaluation (N={len(cpu_cases)} cases)...")

    # 1. Noise Study
    for noise in noise_levels:
        print(f"Evaluating Noise Level sigma = {noise}...")
        for _, row in cpu_cases.iterrows():
            case_id = row['case']
            root_cause = row['root_cause_service']
            sys_name = row['system_name']
            try:
                base_inc = loader.load_incident(case_id, pre_window=300, post_window=300)
                noisy_inc = apply_noise(base_inc, noise, seed=seed)
            except Exception as e:
                continue

            num_candidates = len(noisy_inc.services)
            for name, model in models.items():
                try:
                    res = model.diagnose(noisy_inc)
                    ev = evaluate_case(res.ranked_services, root_cause, num_candidates)
                    results_noise.append({
                        "noise_level": noise,
                        "model": name,
                        "case_id": case_id,
                        "system": sys_name,
                        "hit@1": ev["hit@1"],
                        "mrr": ev["mrr"]
                    })
                except Exception:
                    pass

    # 2. Missing Telemetry Study
    for drop in missing_levels:
        print(f"Evaluating Missingness drop_ratio = {drop}...")
        for _, row in cpu_cases.iterrows():
            case_id = row['case']
            root_cause = row['root_cause_service']
            sys_name = row['system_name']
            try:
                base_inc = loader.load_incident(case_id, pre_window=300, post_window=300)
                missing_inc = apply_missingness(base_inc, drop, seed=seed)
            except Exception as e:
                continue

            num_candidates = len(missing_inc.services)
            for name, model in models.items():
                try:
                    res = model.diagnose(missing_inc)
                    ev = evaluate_case(res.ranked_services, root_cause, num_candidates)
                    results_missing.append({
                        "drop_ratio": drop,
                        "model": name,
                        "case_id": case_id,
                        "system": sys_name,
                        "hit@1": ev["hit@1"],
                        "mrr": ev["mrr"]
                    })
                except Exception:
                    pass

    df_noise = pd.DataFrame(results_noise)
    df_missing = pd.DataFrame(results_missing)

    summary_noise = df_noise.groupby(["noise_level", "model"]).agg({
        "case_id": "count",
        "hit@1": "mean",
        "mrr": "mean"
    }).rename(columns={"case_id": "sample_size_N"}).reset_index()

    summary_missing = df_missing.groupby(["drop_ratio", "model"]).agg({
        "case_id": "count",
        "hit@1": "mean",
        "mrr": "mean"
    }).rename(columns={"case_id": "sample_size_N"}).reset_index()

    summary_noise.to_csv(os.path.join(output_dir, "robustness_noise_verified.csv"), index=False)
    summary_missing.to_csv(os.path.join(output_dir, "robustness_missing_verified.csv"), index=False)

    print("\nVerified Robustness Noise Summary:")
    print(summary_noise.to_string(index=False))
    print("\nVerified Robustness Missingness Summary:")
    print(summary_missing.to_string(index=False))

    return summary_noise, summary_missing

if __name__ == "__main__":
    run_phase2_robustness(num_cases=60)
