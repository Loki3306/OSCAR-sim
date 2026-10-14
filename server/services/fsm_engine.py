import time
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel

class ExperimentState(str, Enum):
    CREATED = "CREATED"
    VALIDATING = "VALIDATING"
    BASELINING = "BASELINING"
    INJECTING = "INJECTING"
    OBSERVING = "OBSERVING"
    ANALYZING = "ANALYZING"
    EVALUATING = "EVALUATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    RECOVERY_FAILED = "RECOVERY_FAILED"

class ServiceState(str, Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    UNAVAILABLE = "UNAVAILABLE"
    RECOVERING = "RECOVERING"

class StateTransition(BaseModel):
    timestamp: str
    from_state: str
    to_state: str
    trigger_event: str
    evidence: Dict[str, Any] = {}

class ServiceFSM:
    def __init__(self, service_name: str, initial_state: ServiceState = ServiceState.HEALTHY):
        self.service_name = service_name
        self.current_state = initial_state
        self.history: List[StateTransition] = [
            StateTransition(
                timestamp=datetime.now(timezone.utc).isoformat(),
                from_state="INITIALIZING",
                to_state=initial_state.value,
                trigger_event="system_boot",
                evidence={"reason": "Service initialized with normal baseline"}
            )
        ]

    def transition_to(self, new_state: ServiceState, trigger_event: str, evidence: Dict[str, Any] = None):
        if self.current_state == new_state:
            return
        
        now_iso = datetime.now(timezone.utc).isoformat()
        transition = StateTransition(
            timestamp=now_iso,
            from_state=self.current_state.value,
            to_state=new_state.value,
            trigger_event=trigger_event,
            evidence=evidence or {}
        )
        self.history.append(transition)
        self.current_state = new_state

    def update_from_telemetry(self, latency_ms: float, error_rate: float, is_injected_target: bool = False):
        if is_injected_target:
            if latency_ms > 200.0 or error_rate > 0.05:
                self.transition_to(
                    ServiceState.UNAVAILABLE,
                    "fault_injection_critical",
                    {"latency_ms": latency_ms, "error_rate": error_rate, "injected": True}
                )
            else:
                self.transition_to(
                    ServiceState.DEGRADED,
                    "fault_injection_active",
                    {"latency_ms": latency_ms, "error_rate": error_rate, "injected": True}
                )
        elif latency_ms > 100.0 or error_rate > 0.02:
            self.transition_to(
                ServiceState.DEGRADED,
                "downstream_cascade_anomaly",
                {"latency_ms": latency_ms, "error_rate": error_rate, "injected": False}
            )
        elif self.current_state in [ServiceState.DEGRADED, ServiceState.UNAVAILABLE]:
            self.transition_to(
                ServiceState.RECOVERING,
                "telemetry_normalizing",
                {"latency_ms": latency_ms, "error_rate": error_rate}
            )
        elif self.current_state == ServiceState.RECOVERING:
            self.transition_to(
                ServiceState.HEALTHY,
                "baseline_restored",
                {"latency_ms": latency_ms, "error_rate": error_rate}
            )

class ExperimentLifecycleFSM:
    def __init__(self, experiment_id: str):
        self.experiment_id = experiment_id
        self.current_state = ExperimentState.CREATED
        self.history: List[StateTransition] = [
            StateTransition(
                timestamp=datetime.now(timezone.utc).isoformat(),
                from_state="NONE",
                to_state=ExperimentState.CREATED.value,
                trigger_event="experiment_instantiated",
                evidence={"experiment_id": experiment_id}
            )
        ]
        self.services_fsm: Dict[str, ServiceFSM] = {
            "client": ServiceFSM("client"),
            "nginx": ServiceFSM("nginx"),
            "api": ServiceFSM("api"),
            "auth-service": ServiceFSM("auth-service"),
            "catalog-service": ServiceFSM("catalog-service"),
            "order-service": ServiceFSM("order-service"),
            "payment-service": ServiceFSM("payment-service"),
            "notification-service": ServiceFSM("notification-service"),
            "queue": ServiceFSM("queue"),
            "postgres": ServiceFSM("postgres"),
            "redis": ServiceFSM("redis")
        }

    def transition_to(self, new_state: ExperimentState, trigger_event: str, evidence: Dict[str, Any] = None):
        if self.current_state == new_state:
            return
        
        now_iso = datetime.now(timezone.utc).isoformat()
        transition = StateTransition(
            timestamp=now_iso,
            from_state=self.current_state.value,
            to_state=new_state.value,
            trigger_event=trigger_event,
            evidence=evidence or {}
        )
        self.history.append(transition)
        self.current_state = new_state

    def to_dict(self) -> Dict[str, Any]:
        return {
            "experiment_id": self.experiment_id,
            "current_state": self.current_state.value,
            "history": [t.model_dump() for t in self.history],
            "service_states": {
                name: {
                    "current_state": fsm.current_state.value,
                    "history": [t.model_dump() for t in fsm.history]
                }
                for name, fsm in self.services_fsm.items()
            }
        }
