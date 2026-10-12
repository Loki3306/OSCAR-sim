import pytest
from server.services.fsm_engine import ExperimentLifecycleFSM, ExperimentState, ServiceState, ServiceFSM
from server.services.sim_service import sim_service
from server.models import FaultTriggerRequest

def test_service_fsm_lifecycle():
    fsm = ServiceFSM("postgres")
    assert fsm.current_state == ServiceState.HEALTHY
    assert len(fsm.history) == 1

    # Inject critical latency
    fsm.update_from_telemetry(latency_ms=280.0, error_rate=0.06, is_injected_target=True)
    assert fsm.current_state == ServiceState.UNAVAILABLE
    assert len(fsm.history) == 2
    assert fsm.history[-1].trigger_event == "fault_injection_critical"
    assert fsm.history[-1].evidence["latency_ms"] == 280.0

    # Downstream recovery
    fsm.update_from_telemetry(latency_ms=18.0, error_rate=0.0, is_injected_target=False)
    assert fsm.current_state == ServiceState.RECOVERING

    # Restored
    fsm.update_from_telemetry(latency_ms=6.0, error_rate=0.0, is_injected_target=False)
    assert fsm.current_state == ServiceState.HEALTHY

def test_experiment_lifecycle_transitions():
    exp_fsm = ExperimentLifecycleFSM("EXP-test-001")
    assert exp_fsm.current_state == ExperimentState.CREATED

    exp_fsm.transition_to(ExperimentState.VALIDATING, "validating_target")
    exp_fsm.transition_to(ExperimentState.BASELINING, "measuring_baseline")
    exp_fsm.transition_to(ExperimentState.INJECTING, "applying_stress")
    exp_fsm.transition_to(ExperimentState.OBSERVING, "tracking_propagation")
    exp_fsm.transition_to(ExperimentState.ANALYZING, "rca_in_progress")
    exp_fsm.transition_to(ExperimentState.EVALUATING, "scoring_against_ground_truth")
    exp_fsm.transition_to(ExperimentState.COMPLETED, "experiment_finished")

    assert exp_fsm.current_state == ExperimentState.COMPLETED
    assert len(exp_fsm.history) == 8

def test_timeline_scrub_structure():
    scrub = sim_service.get_timeline_scrub("INC-test-timeline")
    assert scrub.total_duration_seconds == 90
    assert len(scrub.slices) > 10

    # Slice at T - 30s should be BASELINING
    slice_pre = next(s for s in scrub.slices if s.offset_seconds == -30)
    assert slice_pre.experiment_state == "BASELINING"
    assert slice_pre.system_health_status == "healthy"
    for n in slice_pre.nodes:
        assert not n.is_injected_target
        assert not n.is_observed_abnormal

    # Slice at T + 0s should be INJECTING
    slice_inj = next(s for s in scrub.slices if s.offset_seconds == 0)
    assert slice_inj.experiment_state == "INJECTING"
    pg_node = next(n for n in slice_inj.nodes if n.id == "postgres")
    assert pg_node.is_injected_target is True

    # Slice at T + 30s should be OBSERVING with downstream abnormalities
    slice_obs = next(s for s in scrub.slices if s.offset_seconds == 30)
    assert slice_obs.experiment_state == "OBSERVING"
    api_node = next(n for n in slice_obs.nodes if n.id == "api")
    assert api_node.is_observed_abnormal is True
    redis_node = next(n for n in slice_obs.nodes if n.id == "redis")
    assert redis_node.is_observed_abnormal is False
