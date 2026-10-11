import time
from typing import List, Dict
from research.baselines.base_adapter import BaseRCAAdapter, RCAResult
from research.preprocessing.data_loader import IncidentData

class ReciprocalRankFusion(BaseRCAAdapter):
    """
    Hybrid A: Reciprocal Rank Fusion (RRF).
    Fuses multiple heterogeneous RCA rankings without requiring score calibration:
    RRF_Score(s) = sum_{m in Models} [ 1 / (k + rank_m(s)) ]
    """
    def __init__(self, constituent_adapters: List[BaseRCAAdapter], k: int = 60):
        super().__init__("Hybrid-RRF")
        self.constituent_adapters = constituent_adapters
        self.k = k

    def diagnose(self, incident: IncidentData) -> RCAResult:
        start_t = time.perf_counter()
        fused_scores: Dict[str, float] = {s: 0.0 for s in incident.services}

        for adapter in self.constituent_adapters:
            res = adapter.diagnose(incident)
            for rank, svc in enumerate(res.ranked_services, start=1):
                if svc in fused_scores:
                    fused_scores[svc] += 1.0 / (self.k + rank)

        ranked_services = sorted(fused_scores.keys(), key=lambda s: fused_scores[s], reverse=True)
        elapsed = time.perf_counter() - start_t

        return RCAResult(
            case_id=incident.case_id,
            algorithm=self.name,
            ranked_services=ranked_services,
            service_scores=fused_scores,
            runtime_sec=elapsed
        )
