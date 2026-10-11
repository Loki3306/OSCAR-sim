from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from research.preprocessing.data_loader import IncidentData

@dataclass
class RCAResult:
    case_id: str
    algorithm: str
    ranked_services: List[str]
    service_scores: Dict[str, float]
    ranked_metrics: Optional[List[str]] = None
    runtime_sec: float = 0.0
    metadata: Optional[Dict[str, Any]] = None

class BaseRCAAdapter(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def diagnose(self, incident: IncidentData) -> RCAResult:
        """Executes RCA algorithm and returns ranked candidates and scores."""
        pass
