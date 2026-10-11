import time
import numpy as np
import pandas as pd
import networkx as nx
from typing import Dict, List
from research.baselines.base_adapter import BaseRCAAdapter, RCAResult
from research.preprocessing.data_loader import IncidentData
from research.preprocessing.topology import parse_service_and_metric

class CausalTemporalHybrid(BaseRCAAdapter):
    """
    Hybrid B: Causal-Temporal Propagation Hybrid.
    Integrates microsecond/second onset changepoint sequencing with topological call graph propagation.
    Penalizes downstream symptom cascades and elevates upstream earliest culprits.
    """
    def __init__(self, z_threshold: float = 2.5, decay_rate: float = 0.05):
        super().__init__("Hybrid-CausalTemporal")
        self.z_threshold = z_threshold
        self.decay_rate = decay_rate

    def diagnose(self, incident: IncidentData) -> RCAResult:
        start_t = time.perf_counter()
        df = incident.metrics_df
        t_inject = incident.inject_time
        services = incident.services
        G = incident.topology

        times = df['time'].to_numpy() if 'time' in df.columns else np.arange(len(df))
        pre_mask = times < t_inject if 'time' in df.columns else np.arange(len(df)) < len(df) // 2

        onset_times: Dict[str, float] = {}
        anomaly_magnitudes: Dict[str, float] = {}

        for svc in services:
            svc_cols = [c for c in df.columns if parse_service_and_metric(c)[0] == svc]
            if not svc_cols:
                onset_times[svc] = float('inf')
                anomaly_magnitudes[svc] = 0.0
                continue

            max_z_series = np.zeros(len(df))
            for c in svc_cols:
                vals = df[c].to_numpy()
                mu_pre = np.mean(vals[pre_mask])
                std_pre = np.std(vals[pre_mask]) + 1e-4
                z = (vals - mu_pre) / std_pre
                max_z_series = np.maximum(max_z_series, np.abs(z))

            # Detect earliest onset after injection
            post_indices = np.where(~pre_mask)[0]
            exceeded = np.where((max_z_series >= self.z_threshold) & (~pre_mask))[0]
            if len(exceeded) > 0:
                onset_times[svc] = float(times[exceeded[0]])
            else:
                onset_times[svc] = float('inf')

            post_vals = max_z_series[~pre_mask]
            anomaly_magnitudes[svc] = float(np.mean(post_vals)) if len(post_vals) > 0 else 0.0

        # Global earliest onset among anomalous nodes
        finite_onsets = [t for t in onset_times.values() if t != float('inf')]
        min_onset = min(finite_onsets) if finite_onsets else t_inject

        service_scores: Dict[str, float] = {}
        for svc in services:
            mag = anomaly_magnitudes.get(svc, 0.0)
            t_s = onset_times.get(svc, float('inf'))

            # Temporal lead factor: earlier onset receives exponential priority
            if t_s != float('inf'):
                delay_sec = max(0.0, t_s - min_onset)
                temporal_factor = np.exp(-self.decay_rate * delay_sec)
            else:
                temporal_factor = 0.1

            # Topological causal consistency:
            # If svc is called by callers who failed AFTER svc, svc is upstream cause (+boost)
            # If callers of svc failed BEFORE svc, svc is downstream victim (-penalty)
            causal_multiplier = 1.0
            callers = list(G.predecessors(svc)) if svc in G else []
            for caller in callers:
                t_caller = onset_times.get(caller, float('inf'))
                if t_s <= t_caller:
                    causal_multiplier += 0.5  # Svc broke first, caller broke later -> Svc is true cause
                else:
                    causal_multiplier *= 0.6  # Caller broke first -> Svc is likely symptom

            callees = list(G.successors(svc)) if svc in G else []
            for callee in callees:
                t_callee = onset_times.get(callee, float('inf'))
                if t_callee < t_s:
                    causal_multiplier *= 0.5  # Callee broke earlier -> Callee is root cause, svc is victim

            service_scores[svc] = float(mag * temporal_factor * causal_multiplier)

        ranked_services = sorted(service_scores.keys(), key=lambda s: service_scores[s], reverse=True)
        elapsed = time.perf_counter() - start_t

        return RCAResult(
            case_id=incident.case_id,
            algorithm=self.name,
            ranked_services=ranked_services,
            service_scores=service_scores,
            runtime_sec=elapsed
        )
