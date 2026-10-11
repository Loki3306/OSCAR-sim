import pytest
from fastapi.testclient import TestClient
from server.main import app

client = TestClient(app)

def test_system_health_matrix_transparency():
    """Verifies multi-tier subsystem health reporting, avoiding zero-service anomalies."""
    resp = client.get("/api/system/status")
    assert resp.status_code == 200
    data = resp.json()

    assert data["services_count"] == 5
    assert data["healthy_count"] == 5
    assert data["unhealthy_count"] == 0
    assert data["mode"] == "REPLAY_DEMO"
    assert data["docker_available"] is False

    matrix = data.get("health_matrix")
    assert matrix is not None
    assert matrix["app_server"]["status"] == "operational"
    assert matrix["docker_engine"]["status"] == "offline"
    assert "socket unreachable" in matrix["docker_engine"]["detail"].lower()
    assert matrix["simulation_services"]["status"] == "replay_archive"
    assert matrix["telemetry_backend"]["status"] == "replay_cache"
    assert matrix["persistence_store"]["status"] == "in_memory_ephemeral"
    assert matrix["rca_workers"]["status"] == "operational"

def test_topology_baseline_services_and_edges():
    """Verifies that all 5 microservices and call edges are discovered in topology."""
    resp = client.get("/api/system/topology")
    assert resp.status_code == 200
    data = resp.json()

    services = {s["name"]: s for s in data["services"]}
    assert len(services) == 5
    for s_name in ["client", "nginx", "api", "postgres", "redis"]:
        assert s_name in services
        assert services[s_name]["status"] == "healthy"
        assert services[s_name]["is_root_cause"] is False

    assert len(data["edges"]) == 4

def test_replay_fault_lifecycle_and_incident_creation():
    """Verifies fault triggering, active state reflection in topology, and recovery stop."""
    # 1. Trigger fault
    inject_resp = client.post("/api/faults/inject", json={
        "target_service": "postgres",
        "fault_type": "cpu_stress",
        "intensity": 85,
        "duration_seconds": 60
    })
    assert inject_resp.status_code == 200
    fault = inject_resp.json()
    fault_id = fault["fault_id"]
    incident_id = fault["incident_id"]
    assert fault["status"] == "RUNNING"
    assert fault["target_service"] == "postgres"

    # 2. Check topology reflects degradation on postgres
    topo_resp = client.get("/api/system/topology")
    assert topo_resp.status_code == 200
    topo_data = topo_resp.json()
    postgres_node = next(s for s in topo_data["services"] if s["name"] == "postgres")
    assert postgres_node["status"] == "unhealthy"
    assert postgres_node["is_root_cause"] is True

    # 3. Stop fault
    stop_resp = client.post(f"/api/faults/{fault_id}/stop")
    assert stop_resp.status_code == 200

def test_multi_model_rca_diagnosis_and_candidate_ranking():
    """Verifies that multi-model RCA runs, ranks candidates, and isolates ground truth."""
    diag_resp = client.post("/api/rca/diagnose", json={
        "incident_id": "sim_live_incident",
        "algorithms": ["OSCAR-CTRCL (Proposed)", "RCD", "BARO"]
    })
    assert diag_resp.status_code == 200
    result = diag_resp.json()

    assert "results" in result
    assert "OSCAR-CTRCL (Proposed)" in result["results"]
    assert "RCD" in result["results"]
    assert "BARO" in result["results"]

    oscar = result["results"]["OSCAR-CTRCL (Proposed)"]
    assert oscar["top_1_prediction"] == "postgres"
    assert len(oscar["ranked_candidates"]) >= 3
    assert oscar["runtime_sec"] > 0.0

def test_incident_and_comparison_report_export():
    """Verifies that incident post-mortems and benchmark comparisons export to MD and HTML."""
    # Markdown incident report
    md_resp = client.get("/api/reports/generate?report_type=incident&format=markdown")
    assert md_resp.status_code == 200
    assert "# OSCAR SRE Incident Diagnostic Report" in md_resp.text
    assert "OSCAR-CTRCL" in md_resp.text

    # HTML incident report
    html_resp = client.get("/api/reports/generate?report_type=incident&format=html")
    assert html_resp.status_code == 200
    assert "<!DOCTYPE html>" in html_resp.text

    # Comparative benchmark audit report
    audit_resp = client.get("/api/reports/generate?report_type=comparison&format=markdown")
    assert audit_resp.status_code == 200
    assert "Hit@1 = **0.9250**" in audit_resp.text
    assert "McNemar" in audit_resp.text
