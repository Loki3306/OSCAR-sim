import time
import numpy as np
import pandas as pd
import networkx as nx
from typing import Dict, List
from research.baselines.base_adapter import BaseRCAAdapter, RCAResult
from research.preprocessing.data_loader import IncidentData
from research.preprocessing.topology import parse_service_and_metric

class EDiagnosisAdapter(BaseRCAAdapter):
    """
    epsilon-Diagnosis Baseline: Statistical Graph Random Walk with Restart.
    (Shan et al., ACM IMC 2020).
    Constructs anomaly-weighted transition matrix on dependency graph and computes PageRank stationary distribution.
    Audited against RCAEval: Guards against uniform PageRank column-order fallbacks.
    """
    def __init__(self, alpha: float = 0.85):
        super().__init__("E-Diagnosis")
        self.alpha = alpha

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
            post_df = df[df['time'] >= t_inject]
            pre_df = df[df['time'] < t_inject]
        else:
            mid = len(df) // 2
            pre_df, post_df = df.iloc[:mid], df.iloc[mid:]

        anomaly_weights: Dict[str, float] = {}
        for svc in services:
            cols = [c for c in df.columns if parse_service_and_metric(c)[0] == svc]
            if cols:
                v_pre = pre_df[cols].to_numpy()
                v_post = post_df[cols].to_numpy()
                z = np.max(np.abs(np.mean(v_post, axis=0) - np.mean(v_pre, axis=0)) / (np.std(v_pre, axis=0) + 1e-4))
                anomaly_weights[svc] = max(1e-4, float(z))
            else:
                anomaly_weights[svc] = 1e-4

        # Weight edges in graph based on target anomaly weight
        weighted_G = nx.DiGraph()
        for u in services:
            for v in services:
                if G.has_edge(u, v):
                    weighted_G.add_edge(u, v, weight=anomaly_weights.get(v, 1.0))
                elif G.has_edge(v, u):
                    weighted_G.add_edge(u, v, weight=0.5 * anomaly_weights.get(v, 1.0))

        total_w = sum(anomaly_weights.values())
        personalization = {s: anomaly_weights[s] / total_w for s in services} if total_w > 0 else None

        try:
            ranks = nx.pagerank(weighted_G, alpha=self.alpha, personalization=personalization, max_iter=200)
            service_scores = {s: float(ranks.get(s, 0.0)) for s in services}
        except Exception:
            service_scores = {s: anomaly_weights[s] for s in services}

        # Fallback Guard: Check if scores are degenerate/uniform
        unique_scores = set(np.round(list(service_scores.values()), 6))
        if len(unique_scores) <= 1:
            rng = np.random.default_rng(seed=42)
            shuffled_services = list(service_scores.keys())
            rng.shuffle(shuffled_services)
            ranked_services = shuffled_services
        else:
            ranked_services = sorted(service_scores.keys(), key=lambda s: service_scores[s], reverse=True)

        elapsed = time.perf_counter() - start_t
        return RCAResult(
            case_id=incident.case_id,
            algorithm=self.name,
            ranked_services=ranked_services,
            service_scores=service_scores,
            runtime_sec=elapsed
        )
