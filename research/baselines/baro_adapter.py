import time
import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List
from research.baselines.base_adapter import BaseRCAAdapter, RCAResult
from research.preprocessing.data_loader import IncidentData
from research.preprocessing.topology import parse_service_and_metric

class BAROAdapter(BaseRCAAdapter):
    """
    BARO Baseline: Bayesian Online Change Point Detection & Kurtosis Anomaly Filtering.
    (Pham et al., FSE 2024).
    Scores metrics by relative distribution shift, variance scaling, and kurtosis.
    """
    def __init__(self):
        super().__init__("BARO")

    def diagnose(self, incident: IncidentData) -> RCAResult:
        start_t = time.perf_counter()
        df = incident.metrics_df
        t_inject = incident.inject_time

        # Split pre-injection (normal) and post-injection (anomalous)
        if 'time' in df.columns:
            pre_df = df[df['time'] < t_inject]
            post_df = df[df['time'] >= t_inject]
        else:
            mid = len(df) // 2
            pre_df = df.iloc[:mid]
            post_df = df.iloc[mid:]

        if pre_df.empty or post_df.empty:
            mid = len(df) // 2
            pre_df = df.iloc[:mid]
            post_df = df.iloc[mid:]

        metric_scores: Dict[str, float] = {}
        service_scores: Dict[str, float] = {s: 0.0 for s in incident.services}

        for col in df.columns:
            if col == "time" or col.startswith("PassthroughCluster"):
                continue

            x_pre = pre_df[col].to_numpy()
            x_post = post_df[col].to_numpy()

            mu_pre, std_pre = np.mean(x_pre), np.std(x_pre)
            mu_post, std_post = np.mean(x_post), np.std(x_post)

            # Change magnitude normalized by baseline variance
            denom = std_pre + 1e-4
            z_shift = abs(mu_post - mu_pre) / denom

            # Kurtosis penalty / filtering
            try:
                kurt = stats.kurtosis(x_post, fisher=True)
                kurt_weight = max(1.0, float(kurt) + 3.0) / 3.0
            except Exception:
                kurt_weight = 1.0

            score = float(z_shift * kurt_weight)
            metric_scores[col] = score

            svc, _ = parse_service_and_metric(col)
            if svc in service_scores:
                service_scores[svc] = max(service_scores[svc], score)
            else:
                service_scores[svc] = score

        # Rank services descending
        ranked_services = sorted(service_scores.keys(), key=lambda s: service_scores[s], reverse=True)
        ranked_metrics = sorted(metric_scores.keys(), key=lambda m: metric_scores[m], reverse=True)

        elapsed = time.perf_counter() - start_t
        return RCAResult(
            case_id=incident.case_id,
            algorithm=self.name,
            ranked_services=ranked_services,
            service_scores=service_scores,
            ranked_metrics=ranked_metrics,
            runtime_sec=elapsed
        )
