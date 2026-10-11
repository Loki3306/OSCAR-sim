import pytest
from fastapi.testclient import TestClient
from server.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "OSCAR Root Cause Analysis Platform"
    assert "version" in data

def test_system_health():
    response = client.get("/api/system/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "services" in data
    assert len(data["services"]) >= 5

def test_topology():
    response = client.get("/api/topology")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) >= 5
    assert len(data["edges"]) >= 4

def test_metrics_query():
    response = client.get("/api/metrics/query?service=postgres&metric=cpu")
    assert response.status_code == 200
    data = response.json()
    assert "series" in data
    assert len(data["series"]) >= 1
    assert data["series"][0]["service"] == "postgres"

def test_faults_lifecycle():
    # 1. Supported faults
    resp = client.get("/api/faults/supported")
    assert resp.status_code == 200
    assert len(resp.json()["supported_faults"]) >= 3

    # 2. Trigger fault
    trigger_resp = client.post("/api/faults/trigger", json={
        "fault_type": "cpu_stress",
        "target_service": "postgres",
        "duration_seconds": 10,
        "intensity": 80.0
    })
    assert trigger_resp.status_code == 200
    f_data = trigger_resp.json()
    assert f_data["status"] == "RUNNING"
    fault_id = f_data["fault_id"]

    # 3. Stop fault
    stop_resp = client.post(f"/api/faults/stop/{fault_id}")
    assert stop_resp.status_code == 200
    assert stop_resp.json()["status"] == "STOPPED"

def test_incidents_list():
    response = client.get("/api/incidents")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1  # includes loaded recorded replays

def test_rca_algorithms_and_diagnose():
    # 1. List algorithms
    resp = client.get("/api/rca/algorithms")
    assert resp.status_code == 200
    algs = resp.json()["algorithms"]
    assert len(algs) >= 6
    assert any("OSCAR" in a["name"] for a in algs)

    # 2. Diagnose simulated incident
    diag_resp = client.post("/api/rca/diagnose", json={
        "incident_id": "sim_test_inc",
        "algorithms": ["OSCAR-CTRCL (Proposed)", "RCD", "BARO"]
    })
    assert diag_resp.status_code == 200
    res = diag_resp.json()
    assert "results" in res
    assert "OSCAR-CTRCL (Proposed)" in res["results"]
    oscar_res = res["results"]["OSCAR-CTRCL (Proposed)"]
    assert len(oscar_res["ranked_candidates"]) >= 3
    assert oscar_res["top_1_prediction"] == "postgres"

def test_benchmark_cases():
    resp = client.get("/api/benchmark/cases?limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_cases"] >= 700
    assert len(data["cases"]) == 10

def test_research_endpoints():
    # Summary
    resp_sum = client.get("/api/research/summary")
    assert resp_sum.status_code == 200
    assert "verified_cpu_summary" in resp_sum.json()

    # Statistical tests
    resp_stat = client.get("/api/research/statistical_tests")
    assert resp_stat.status_code == 200
    assert "statistical_tests" in resp_stat.json()

    # Error decomposition
    resp_err = client.get("/api/research/error_decomposition")
    assert resp_err.status_code == 200
    assert "decomposition_summary" in resp_err.json()

    # Robustness
    resp_rob = client.get("/api/research/robustness")
    assert resp_rob.status_code == 200
    assert "noise_study" in resp_rob.json()

def test_reports_generation():
    resp = client.get("/api/reports/generate?report_type=incident&format=markdown")
    assert resp.status_code == 200
    assert "# OSCAR SRE Incident Diagnostic Report" in resp.text
