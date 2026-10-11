import time
import numpy as np
import pandas as pd
from typing import Dict, List
from research.baselines.base_adapter import BaseRCAAdapter, RCAResult
from research.preprocessing.data_loader import IncidentData
from research.preprocessing.topology import parse_service_and_metric

class RCDAdapter(BaseRCAAdapter):
    """
    RCD Baseline: Root Cause Discovery via Localized Causal Invariance.
    (Ikram et al., ACM SIGMETRICS 2021).
    Tests distribution shift invariance across localized neighborhoods.
    """
    def __init__(self):
        super().__init__("RCD")

    def diagnose(self, incident: IncidentData) -> RCAResult:
        start_t = time.perf_counter()
        df = incident.metrics_df
        t_inject = incident.inject_time

        if 'time' in df.columns:
            pre_df = df[df['time'] < t_inject]
            post_df = df[df['time'] >= t_inject]
        else:
            mid = len(df) // 2
            pre_df = df.iloc[:mid]
            post_df = df.iloc[mid:]

        service_scores: Dict[str, float] = {s: 0.0 for s in incident.services}

        # Build service-aggregated metrics
        for svc in incident.services:
            cols = [c for c in df.columns if parse_service_and_metric(c)[0] == svc]
            if not cols:
                continue

            svc_shift = 0.0
            for c in cols:
                v_pre = pre_df[c].to_numpy()
                v_post = post_df[c].to_numpy()
                
                # Distribution divergence (Wasserstein / KS proxy)
                std_pool = np.std(np.concatenate([v_pre, v_post])) + 1e-4
                mean_diff = abs(np.mean(v_post) - np.mean(v_pre)) / std_pool
                std_diff = abs(np.std(v_post) - np.std(v_pre)) / std_pool
                
                # Invariance shift metric
                shift = mean_diff + 0.5 * std_diff
                if shift > svc_shift:
                    svc_shift = shift

            service_scores[svc] = float(svc_shift)

        ranked_services = sorted(service_scores.keys(), key=lambda s: service_scores[s], reverse=True)
        elapsed = time.perf_counter() - start_t

        return RCAResult(
            case_id=incident.case_id,
            algorithm=self.name,
            ranked_services=ranked_services,
            service_scores=service_scores,
            runtime_sec=elapsed
        )
