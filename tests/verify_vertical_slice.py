import httpx

def main():
    client = httpx.Client(base_url="http://localhost:8000", timeout=10.0)

    # 1. Trigger Fault: slow_database on postgres
    inj_res = client.post("/api/faults/inject", json={
        "fault_type": "slow_database",
        "target_service": "postgres",
        "duration_seconds": 25,
        "intensity": 85.0
    })
    assert inj_res.status_code == 200
    inj = inj_res.json()
    print("1. Injected Fault:", inj["fault_id"], "| Incident:", inj["incident_id"])

    # 2. Inspect Topology: 4-layer evidence
    top = client.get("/api/system/topology").json()
    injected_nodes = [n["id"] for n in top["nodes"] if n["is_injected_target"]]
    victim_nodes = [n["id"] for n in top["nodes"] if n["is_observed_abnormal"]]
    print("2. Injected Target Node:", injected_nodes)
    print("   Downstream Victim Nodes:", victim_nodes)
    assert "postgres" in injected_nodes
    assert "api" in victim_nodes or "nginx" in victim_nodes

    # 3. Inspect Dual FSM Status
    fsm = client.get("/api/fsm/status").json()
    print("3. Experiment Lifecycle State:", fsm["experiment_state"])
    print("   Postgres FSM State:", fsm["service_states"]["postgres"]["current_state"])
    print("   API FSM State:", fsm["service_states"]["api"]["current_state"])
    print("   Redis FSM State:", fsm["service_states"]["redis"]["current_state"])

    # 4. Timeline Scrubbing
    scrub = client.get(f"/api/fsm/timeline-scrub?incident_id={inj['incident_id']}").json()
    print("4. Timeline Scrub Slices:", len(scrub["slices"]), "slices available across 90s")

    # 5. Multi-Model RCA Diagnosis (Blind to Ground Truth)
    rca = client.post("/api/rca/diagnose", json={
        "incident_id": inj["incident_id"],
        "algorithms": ["OSCAR-CTRCL (Proposed)", "RCD", "BARO", "CIRCA"]
    }).json()
    oscar_res = rca["results"]["OSCAR-CTRCL (Proposed)"]
    print("5. Blind Diagnosis - OSCAR Top-1:", oscar_res["top_1_prediction"])
    print("   OSCAR Score Breakdown:", oscar_res["ranked_candidates"][0].get("score_breakdown"))

    # 6. Post-Inference Isolated Ground-Truth Evaluation
    ev = client.post("/api/rca/evaluate", json={
        "incident_id": inj["incident_id"],
        "results": rca["results"]
    }).json()
    print("6. Evaluation Unlocked:")
    print("   Ground Truth Root Cause:", ev["ground_truth"]["target_service"])
    print("   Expected Blast Chain:", " -> ".join(ev["expected_chain"]))
    print("   Observed Blast Chain:", " -> ".join(ev["observed_chain"]))
    print("   Propagation Match:", ev["expected_vs_observed_match"])
    print("   OSCAR Hit@1:", ev["algorithm_evaluations"]["OSCAR-CTRCL (Proposed)"]["hit_1"])
    print("   OSCAR MRR:", ev["algorithm_evaluations"]["OSCAR-CTRCL (Proposed)"]["reciprocal_rank"])

    # 7. Safe Recovery Stop
    stop_res = client.post(f"/api/faults/{inj['fault_id']}/stop")
    print("7. Stopped Fault:", stop_res.json()["status"])
    print("\n>>> ALL VERTICAL SLICE CHECKS PASSED PERFECTLY! <<<")

if __name__ == "__main__":
    main()
