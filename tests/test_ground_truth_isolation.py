import pytest
from server.services.ground_truth_manager import ground_truth_manager
from server.services.rca_service import rca_service
from server.models import RCADiagnosisRequest

def test_ground_truth_isolation_and_evaluation():
    exp_id = "EXP-isolation-test-001"
    
    # 1. Register ground truth in isolated store
    record = ground_truth_manager.register_ground_truth(
        experiment_id=exp_id,
        scenario_id="slow_postgres_cascade",
        target_service="postgres",
        fault_type="slow_database",
        parameters={"duration_seconds": 30, "intensity": 80.0},
        expected_impact_chain=["postgres", "api", "nginx"],
        duration_seconds=30
    )
    assert record.target_service == "postgres"
    assert "postgres" in record.observed_impact_chain

    # 2. Record downstream propagation observations
    ground_truth_manager.record_observed_propagation(exp_id, "api")
    ground_truth_manager.record_observed_propagation(exp_id, "nginx")

    assert ground_truth_manager.get_ground_truth(exp_id).observed_impact_chain == ["postgres", "api", "nginx"]

    # 3. Perform Blind RCA diagnosis (the algorithm model receives only telemetry + topology)
    diag_req = RCADiagnosisRequest(
        incident_id=exp_id,
        algorithms=["OSCAR-CTRCL (Proposed)", "RCD", "BARO"]
    )
    diag_res = rca_service.diagnose(diag_req)
    assert "OSCAR-CTRCL (Proposed)" in diag_res.results
    
    # Verify intermediate score breakdown is exposed for OSCAR-CTRCL
    oscar_top = diag_res.results["OSCAR-CTRCL (Proposed)"].ranked_candidates[0]
    assert oscar_top.score_breakdown is not None
    assert "DSI (Wasserstein Shift)" in oscar_top.score_breakdown
    assert "PRP (Resource Penalty)" in oscar_top.score_breakdown
    assert "CDR (Caller Discount)" in oscar_top.score_breakdown

    # 4. Strict Post-Inference Evaluation
    eval_report = ground_truth_manager.evaluate(exp_id, diag_res.results)
    assert eval_report.ground_truth.target_service == "postgres"
    assert eval_report.expected_vs_observed_match is True
    assert eval_report.expected_chain == ["postgres", "api", "nginx"]
    assert eval_report.observed_chain == ["postgres", "api", "nginx"]

    oscar_eval = eval_report.algorithm_evaluations["OSCAR-CTRCL (Proposed)"]
    assert oscar_eval.top_1_prediction == "postgres"
    assert oscar_eval.hit_1 is True
    assert oscar_eval.reciprocal_rank == 1.0
