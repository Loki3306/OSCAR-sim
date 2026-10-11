import time
import numpy as np
import pandas as pd
import networkx as nx
from typing import Dict, List
from research.baselines.base_adapter import BaseRCAAdapter, RCAResult
from research.preprocessing.data_loader import IncidentData
from research.preprocessing.topology import parse_service_and_metric

class MicroCauseAdapter(BaseRCAAdapter):
    """
    MicroCause Baseline: Causal Analysis for Microservices using Lagged Causal Influence.
    (Meng et al., IEEE INFOCOM 2020).
    Constructs temporal causal DAG via lagged cross-correlation and ranks by causal out-centrality.
    """
    def __init__(self):
        super().__init__("MicroCause")

    def diagnose(self, incident: IncidentData) -> RCAResult:
        start_t = time.perf_counter()
        df = incident.metrics_df
        services = incident.services

        # Extract representative anomaly signal per service
        svc_series = {}
        for svc in services:
            cols = [c for c in df.columns if parse_service_and_metric(c)[0] == svc]
            if cols:
                # Max normalized column
                mat = df[cols].to_numpy()
                norm = (mat - np.mean(mat, axis=0)) / (np.std(mat, axis=0) + 1e-4)
                svc_series[svc] = np.mean(norm, axis=1)
            else:
                svc_series[svc] = np.zeros(len(df))

        # Build lagged causal adjacency matrix
        # If svc_A at time t leads svc_B at time t+k, edge A -> B
        lag = 3
        causal_graph = nx.DiGraph()
        causal_graph.add_nodes_from(services)

        for s1 in services:
            x = svc_series[s1]
            for s2 in services:
                if s1 == s2:
                    continue
                y = svc_series[s2]
                
                # Check cross-correlation at lag k=1..3
                max_corr = 0.0
                for k in range(1, lag + 1):
                    if len(x) > k:
                        c = np.corrcoef(x[:-k], y[k:])[0, 1]
                        if not np.isnan(c) and abs(c) > max_corr:
                            max_corr = abs(c)

                if max_corr > 0.35:
                    causal_graph.add_edge(s1, s2, weight=float(max_corr))

        # Rank services by causal out-degree centrality weighted by anomaly magnitude
        service_scores: Dict[str, float] = {}
        for svc in services:
            out_weight = sum([d.get('weight', 1.0) for _, _, d in causal_graph.out_edges(svc, data=True)])
            mag = float(np.mean(np.abs(svc_series[svc])))
            service_scores[svc] = float(out_weight * (1.0 + mag) + mag * 0.5)

        ranked_services = sorted(service_scores.keys(), key=lambda s: service_scores[s], reverse=True)
        elapsed = time.perf_counter() - start_t

        return RCAResult(
            case_id=incident.case_id,
            algorithm=self.name,
            ranked_services=ranked_services,
            service_scores=service_scores,
            runtime_sec=elapsed
        )
