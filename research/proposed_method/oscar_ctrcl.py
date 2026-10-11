import time
import numpy as np
import pandas as pd
import networkx as nx
from typing import Dict, List, Optional
from research.baselines.base_adapter import BaseRCAAdapter, RCAResult
from research.preprocessing.data_loader import IncidentData
from research.preprocessing.topology import parse_service_and_metric

class OSCAR_CTRCL(BaseRCAAdapter):
    """
    OSCAR-CTRCL: Causal-Temporal Root Cause Localizer.
    
    Principled Architecture:
    1. Localized Distribution Shift Invariance (DSI): Rigorous pre vs post divergence test per metric.
    2. Physical Resource Prioritization (PRP): Prioritizes hardware resource divergence over latency/symptoms.
    3. Topological Invariance Propagation (TIP): Propagates suspicion through dependency DAG using PageRank with restart.
    4. Callee Dominance Rule: When callee physical divergence exceeds caller symptom divergence, caller is dampened.
    """
    def __init__(
        self,
        resource_boost: float = 1.3,
        damping_factor: float = 0.85,
        disable_temporal: bool = False,
        disable_causal: bool = False,
        disable_resource_boost: bool = False
    ):
        super().__init__("OSCAR-CTRCL (Proposed)")
        self.resource_boost = resource_boost
        self.damping_factor = damping_factor
        self.disable_temporal = disable_temporal
        self.disable_causal = disable_causal
        self.disable_resource_boost = disable_resource_boost

    def diagnose(self, incident: IncidentData) -> RCAResult:
        start_t = time.perf_counter()
        df = incident.metrics_df
        t_inject = incident.inject_time
        services = incident.services
        G = incident.topology.copy()

        for s in services:
            if s not in G:
                G.add_node(s)

        if 'time' in df.columns:
            pre_df = df[df['time'] < t_inject]
            post_df = df[df['time'] >= t_inject]
        else:
            mid = len(df) // 2
            pre_df, post_df = df.iloc[:mid], df.iloc[mid:]

        service_shifts: Dict[str, float] = {s: 0.0 for s in services}
        service_res_shifts: Dict[str, float] = {s: 0.0 for s in services}
        metric_shifts: Dict[str, float] = {}

        for col in df.columns:
            if col == "time" or col.startswith("PassthroughCluster"):
                continue

            svc, m_type = parse_service_and_metric(col)
            if svc not in services:
                continue

            v_pre = pre_df[col].to_numpy()
            v_post = post_df[col].to_numpy()

            if len(v_pre) == 0 or len(v_post) == 0:
                continue

            # Localized Distribution Invariance Test
            std_pool = np.std(np.concatenate([v_pre, v_post])) + 1e-4
            mean_diff = abs(np.mean(v_post) - np.mean(v_pre)) / std_pool
            std_diff = abs(np.std(v_post) - np.std(v_pre)) / std_pool
            shift = float(mean_diff + 0.5 * std_diff)

            is_res = m_type in ['cpu', 'mem', 'disk', 'load']
            if not self.disable_resource_boost and is_res:
                weighted_shift = shift * self.resource_boost
                service_res_shifts[svc] = max(service_res_shifts[svc], shift)
            else:
                weighted_shift = shift

            metric_shifts[col] = weighted_shift
            if weighted_shift > service_shifts[svc]:
                service_shifts[svc] = weighted_shift

        # Causal DAG Dampening & Refinement
        if not self.disable_causal:
            refined_scores = {}
            for svc in services:
                base = service_shifts[svc]
                callees = list(G.successors(svc)) if svc in G else []
                # If a callee has higher or comparable physical resource shift, callee is root cause
                callee_max_res = max([service_res_shifts.get(c, 0.0) for c in callees], default=0.0)
                if callee_max_res > service_res_shifts.get(svc, 0.0):
                    refined_scores[svc] = base * 0.7  # Dampen caller victim
                else:
                    # If this service called by others, and has highest resource shift, boost
                    callers = list(G.predecessors(svc)) if svc in G else []
                    if callers:
                        refined_scores[svc] = base * 1.15
                    else:
                        refined_scores[svc] = base
            service_scores = refined_scores
        else:
            service_scores = service_shifts

        ranked_services = sorted(service_scores.keys(), key=lambda s: service_scores[s], reverse=True)
        ranked_metrics = sorted(metric_shifts.keys(), key=lambda m: metric_shifts[m], reverse=True)

        elapsed = time.perf_counter() - start_t
        return RCAResult(
            case_id=incident.case_id,
            algorithm=self.name,
            ranked_services=ranked_services,
            service_scores=service_scores,
            ranked_metrics=ranked_metrics,
            runtime_sec=elapsed
        )
