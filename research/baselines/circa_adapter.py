import time
import numpy as np
import pandas as pd
import networkx as nx
from typing import Dict, List
from research.baselines.base_adapter import BaseRCAAdapter, RCAResult
from research.preprocessing.data_loader import IncidentData
from research.preprocessing.topology import parse_service_and_metric

class CIRCAAdapter(BaseRCAAdapter):
    """
    CIRCA Baseline: Causal Inference for Root Cause Analysis in Microservices.
    (Li et al., USENIX ATC 2022).
    Evaluates causal hypothesis graph along call dependencies, scoring unexplained residual variance.
    Audited against RCAEval: Includes Ridge regularization and prevents silent column-order fallback.
    """
    def __init__(self, ridge_alpha: float = 1e-3):
        super().__init__("CIRCA")
        self.ridge_alpha = ridge_alpha

    def diagnose(self, incident: IncidentData) -> RCAResult:
        start_t = time.perf_counter()
        df = incident.metrics_df
        t_inject = incident.inject_time
        G = incident.topology

        # Extract per-service average anomaly vectors
        service_vectors: Dict[str, np.ndarray] = {}
        for svc in incident.services:
            svc_cols = [c for c in df.columns if parse_service_and_metric(c)[0] == svc]
            if not svc_cols:
                service_vectors[svc] = np.zeros(len(df))
            else:
                sub = df[svc_cols].to_numpy()
                sub_norm = (sub - np.mean(sub, axis=0)) / (np.std(sub, axis=0) + 1e-4)
                service_vectors[svc] = np.mean(np.abs(sub_norm), axis=1)

        if 'time' in df.columns:
            post_mask = (df['time'] >= t_inject).to_numpy()
        else:
            post_mask = np.zeros(len(df), dtype=bool)
            post_mask[len(df)//2:] = True

        service_scores: Dict[str, float] = {}

        for svc in incident.services:
            vec = service_vectors[svc]
            post_signal = vec[post_mask]
            base_score = float(np.mean(post_signal)) if len(post_signal) > 0 else 0.0

            parents = list(G.predecessors(svc)) if svc in G else []
            valid_parents = [p for p in parents if p in service_vectors]

            if valid_parents:
                parent_matrix = np.column_stack([service_vectors[p][post_mask] for p in valid_parents])
                y = post_signal
                # Ridge regression: (X^T X + alpha * I)^{-1} X^T y
                try:
                    xtx = parent_matrix.T @ parent_matrix
                    reg_xtx = xtx + self.ridge_alpha * np.eye(xtx.shape[0])
                    xty = parent_matrix.T @ y
                    coeffs = np.linalg.solve(reg_xtx, xty)
                    y_pred = parent_matrix @ coeffs
                    residual_score = float(np.mean(np.maximum(0, y - y_pred)))
                    circa_score = residual_score * (1.0 + base_score)
                except Exception:
                    circa_score = base_score
            else:
                circa_score = base_score * 1.2

            service_scores[svc] = float(circa_score)

        # Fallback Guard: If all scores are zero or identical, break ties randomly with deterministic seed
        unique_scores = set(service_scores.values())
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
