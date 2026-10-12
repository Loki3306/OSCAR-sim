import time
import numpy as np
import pandas as pd
from typing import Dict, List
from research.baselines.base_adapter import BaseRCAAdapter, RCAResult
from research.preprocessing.data_loader import IncidentData
from research.preprocessing.topology import parse_service_and_metric

class MultiSourceBAROAdapter(BaseRCAAdapter):
    """
    Multi-Source BARO Baseline: Multimodal Telemetry Fusion.
    (Pham et al., WWW 2025).
    Fuses resource metric distribution shifts with log-level error bursts and trace-level latency anomalies.
    """
    def __init__(self, w_metric: float = 0.5, w_error: float = 0.25, w_latency: float = 0.25):
        super().__init__("Multi-Source BARO")
        self.w_metric = w_metric
        self.w_error = w_error
        self.w_latency = w_latency

    def diagnose(self, incident: IncidentData) -> RCAResult:
        start_t = time.perf_counter()
        df = incident.metrics_df
        t_inject = incident.inject_time

        if 'time' in df.columns:
            pre_df = df[df['time'] < t_inject]
            post_df = df[df['time'] >= t_inject]
        else:
            mid = len(df) // 2
            pre_df, post_df = df.iloc[:mid], df.iloc[mid:]

        services = incident.services
        res_scores: Dict[str, float] = {s: 0.0 for s in services}
        err_scores: Dict[str, float] = {s: 0.0 for s in services}
        lat_scores: Dict[str, float] = {s: 0.0 for s in services}

        for col in df.columns:
            if col == "time" or col.startswith("PassthroughCluster"):
                continue

            svc, metric_type = parse_service_and_metric(col)
            if svc not in services:
                continue

            v_pre = pre_df[col].to_numpy()
            v_post = post_df[col].to_numpy()

            mu_pre, std_pre = np.mean(v_pre), np.std(v_pre) + 1e-4
            mu_post = np.mean(v_post)
            z = abs(mu_post - mu_pre) / std_pre

            if metric_type in ['cpu', 'mem', 'load', 'disk']:
                res_scores[svc] = max(res_scores[svc], float(z))
            elif 'error' in metric_type:
                err_scores[svc] = max(err_scores[svc], float(z))
            elif 'latency' in metric_type:
                lat_scores[svc] = max(lat_scores[svc], float(z))

        # Max-normalize each modality across services to prevent scale domination
        def normalize_dict(d: Dict[str, float]) -> Dict[str, float]:
            max_v = max(d.values()) if d and max(d.values()) > 0 else 1.0
            return {k: v / max_v for k, v in d.items()}

        norm_res = normalize_dict(res_scores)
        norm_err = normalize_dict(err_scores)
        norm_lat = normalize_dict(lat_scores)

        service_scores: Dict[str, float] = {}
        for s in services:
            score = (
                self.w_metric * norm_res.get(s, 0.0) +
                self.w_error * norm_err.get(s, 0.0) +
                self.w_latency * norm_lat.get(s, 0.0)
            )
            service_scores[s] = float(score)

        ranked_services = sorted(service_scores.keys(), key=lambda s: service_scores[s], reverse=True)
        elapsed = time.perf_counter() - start_t

        return RCAResult(
            case_id=incident.case_id,
            algorithm=self.name,
            ranked_services=ranked_services,
            service_scores=service_scores,
            runtime_sec=elapsed
        )
