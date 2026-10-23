import pytest
from server.services.rca_service import rca_service
from server.services.propagation_tracer import propagation_tracer
from server.services.scenario_registry import scenario_registry
from server.services.report_generator import report_generator
from server.services.sim_service import sim_service
from server.models import FaultTriggerRequest, RCADiagnosisRequest

def test_redis_propagation_shockwave():
    """Verify that crashing Redis propagates through catalog-service -> api -> nginx -> client."""
    trace = propagation_tracer.build_trace("service_crash", "redis")
    assert trace.target_service == "redis"
    assert trace.blast_chain == ["redis", "catalog-service", "api", "nginx", "client"]
    assert "redis" not in trace.unaffected_services
    assert trace.hops[0].service == "redis"
    assert trace.hops[1].service == "catalog-service"
    assert trace.hops[1].edge["protocol"] == "RESP"
    assert trace.hops[2].service == "api"
    assert trace.hops[3].service == "nginx"

def test_scenario_registry_dynamic_expected_chain():
    """Verify expected impact chain uses dynamic topology paths for Redis, Postgres, Payment."""
    redis_chain = scenario_registry.get_expected_chain("service_crash", "redis")
    assert redis_chain == ["redis", "catalog-service", "api", "nginx"]
    assert "auth-service" not in redis_chain

    pg_chain = scenario_registry.get_expected_chain("slow_database", "postgres")
    assert pg_chain == ["postgres", "order-service", "catalog-service", "api", "nginx"]

    payment_chain = scenario_registry.get_expected_chain("network_latency", "payment-service")
    assert payment_chain == ["payment-service", "order-service", "api", "nginx"]

def test_rca_simulation_redis_localization():
    """Verify that when an incident targets redis, rca_service diagnoses redis and OSCAR hits Rank 1."""
    # 1. Trigger fault on redis
    status = sim_service.trigger_fault(FaultTriggerRequest(
        scenario_id="service_crash",
        target_service="redis",
        intensity=100.0,
        duration_seconds=30,
        fault_type="service_crash"
    ))
    assert status.status == "RUNNING"
    inc_id = status.incident_id

    # 2. Run RCA diagnosis using this incident ID
    diag_resp = rca_service.diagnose(RCADiagnosisRequest(
        incident_id=inc_id,
        algorithms=["OSCAR-CTRCL (Proposed)", "RCD", "BARO"]
    ))

    assert diag_resp.ground_truth_root_cause == "redis"
    oscar_res = diag_resp.results["OSCAR-CTRCL (Proposed)"]
    assert oscar_res.top_1_prediction == "redis"
    assert oscar_res.ranked_candidates[0].service == "redis"

    # 3. Post-inference evaluation against isolated ground truth
    eval_report = rca_service.evaluate_post_inference(inc_id, {
        k: {"top_1": v.top_1_prediction} for k, v in diag_resp.results.items()
    })
    assert eval_report["ground_truth"]["target_service"] == "redis"
    assert eval_report["algorithm_evaluations"]["OSCAR-CTRCL (Proposed)"]["hit_1"] is True

def test_report_unaffected_services_dynamic():
    """Verify report center never includes target service in unaffected list."""
    report = report_generator.get_incident_report_data(scenario_id="service_crash")
    # For redis target
    report_redis = report_generator.get_incident_report_data(incident_id=None, scenario_id="cache_failure")
    assert "redis" not in report_redis["propagation_summary"]["unaffected_services"]
    assert "redis" not in report_redis["statistical_verification"]["unaffected_branch_proof"]
