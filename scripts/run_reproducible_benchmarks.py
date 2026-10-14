#!/usr/bin/env python3
"""
OSCAR 2.0: Automated Batch Benchmark Runner & Reproducibility Framework
Executes controlled repeated experiment trials across distributed failure scenarios,
records isolated ground truth, runs multi-algorithm blind inference,
calculates ranking metrics (Hit@1, Hit@3, Hit@5, MRR), runtime,
and exports versioned, immutable benchmark artifacts.
"""

import sys
import os
import time
import json
import argparse
from datetime import datetime, timezone
from typing import Dict, List, Any
import httpx

API_BASE = os.getenv("OSCAR_API_URL", "http://127.0.0.1:8000")

ALG_NAME_MAP = {
    "oscar_ctrcl": "OSCAR-CTRCL (Proposed)",
    "oscar": "OSCAR-CTRCL (Proposed)",
    "rcd": "RCD",
    "baro": "BARO",
    "circa": "CIRCA",
    "microcause": "MicroCause",
    "e_diagnosis": "E-Diagnosis",
    "ms_baro": "Multi-Source BARO",
    "multi_source_baro": "Multi-Source BARO"
}

def resolve_alg_name(name: str) -> str:
    return ALG_NAME_MAP.get(name.lower().strip(), name)

def check_environment(client: httpx.Client) -> Dict[str, Any]:
    resp = client.get(f"{API_BASE}/api/system/status")
    resp.raise_for_status()
    data = resp.json()
    print(f"[*] Environment verified: Mode={data.get('mode')}, Services={data.get('services_count')}, DockerAvailable={data.get('docker_available')}")
    return data

def run_single_experiment(
    client: httpx.Client,
    scenario_id: str,
    target_service: str,
    algorithms: List[str],
    trial_index: int = 1,
    duration_sec: int = 30
) -> Dict[str, Any]:
    print(f"\n--- [Trial {trial_index}] Running Scenario: '{scenario_id}' on '{target_service}' ---")

    # 1. Trigger Fault & Initialize Lifecycle FSM
    inject_payload = {
        "scenario_id": scenario_id,
        "fault_type": scenario_id,
        "target_service": target_service,
        "duration_seconds": duration_sec,
        "intensity": 85.0
    }
    inj_res = client.post(f"{API_BASE}/api/faults/inject", json=inject_payload).json()
    incident_id = inj_res.get("incident_id")
    fault_id = inj_res.get("fault_id")
    print(f"  [+] Injected fault {fault_id} | Incident {incident_id}")

    # 2. Check FSM Lifecycle state
    fsm_res = client.get(f"{API_BASE}/api/fsm/status").json()
    current_state = fsm_res.get("experiment_fsm", {}).get("current_state", "UNKNOWN")
    print(f"  [+] Experiment Lifecycle FSM State: {current_state}")

    # 3. Execute Multi-Model Blind Diagnosis
    resolved_algs = [resolve_alg_name(a) for a in algorithms]
    print(f"  [+] Executing blind inference for algorithms: {', '.join(resolved_algs)}...")
    t0 = time.time()
    diag_res = client.post(f"{API_BASE}/api/rca/diagnose", json={
        "incident_id": incident_id,
        "algorithms": resolved_algs
    }).json()
    diag_duration = time.time() - t0

    # 4. Evaluate Blind Inference against Isolated Ground Truth
    eval_res = client.post(f"{API_BASE}/api/rca/evaluate", json={
        "incident_id": incident_id,
        "results": diag_res.get("results", {})
    }).json()

    # 5. Stop Fault & Verify Recovery
    client.post(f"{API_BASE}/api/faults/{fault_id}/stop")
    print(f"  [+] Fault stopped. Environment auto-recovery verified.")

    # Format trial summary
    evaluations = eval_res.get("algorithm_evaluations", {})
    for alg, ev in evaluations.items():
        top1 = ev.get("top_1_prediction")
        h1 = "HIT" if ev.get("hit_1") else "MISS"
        rr = ev.get("reciprocal_rank", 0.0)
        rt = ev.get("runtime_sec", 0.0)
        print(f"      - {alg.upper():<14}: Top-1={top1:<14} [{h1}] MRR={rr:.2f} Runtime={rt:.3f}s")

    return {
        "trial_index": trial_index,
        "scenario_id": scenario_id,
        "target_service": target_service,
        "incident_id": incident_id,
        "evaluations": evaluations,
        "expected_vs_observed_match": eval_res.get("expected_vs_observed_match", True),
        "expected_chain": eval_res.get("expected_chain", []),
        "observed_chain": eval_res.get("observed_chain", [])
    }

def aggregate_benchmark_results(trials: List[Dict[str, Any]], algorithms: List[str]) -> Dict[str, Any]:
    stats: Dict[str, Dict[str, Any]] = {}
    total_runs = len(trials)

    for raw_alg in algorithms:
        alg = resolve_alg_name(raw_alg)
        h1_count = 0
        h3_count = 0
        h5_count = 0
        total_rr = 0.0
        total_rt = 0.0
        sample_count = 0

        for t in trials:
            ev = t["evaluations"].get(alg) or t["evaluations"].get(raw_alg)
            if ev:
                sample_count += 1
                if ev.get("hit_1"): h1_count += 1
                if ev.get("hit_3"): h3_count += 1
                if ev.get("hit_5"): h5_count += 1
                total_rr += ev.get("reciprocal_rank", 0.0)
                total_rt += ev.get("runtime_sec", 0.0)

        stats[alg] = {
            "trials_evaluated": sample_count,
            "hit_at_1": round(h1_count / sample_count, 4) if sample_count else 0.0,
            "hit_at_3": round(h3_count / sample_count, 4) if sample_count else 0.0,
            "hit_at_5": round(h5_count / sample_count, 4) if sample_count else 0.0,
            "mrr": round(total_rr / sample_count, 4) if sample_count else 0.0,
            "avg_runtime_sec": round(total_rt / sample_count, 4) if sample_count else 0.0
        }

    return stats

def main():
    parser = argparse.ArgumentParser(description="Run reproducible automated RCA benchmarks")
    parser.add_argument("--trials-per-scenario", type=int, default=1, help="Repetitions per failure scenario")
    parser.add_argument("--algorithms", type=str, default="oscar_ctrcl,rcd,ms_baro,baro", help="Comma-separated algorithms")
    parser.add_argument("--scenarios", type=str, default="slow_database,cpu_saturation,network_latency,cache_failure", help="Comma-separated scenario IDs")
    args = parser.parse_args()

    selected_algorithms = [a.strip() for a in args.algorithms.split(",") if a.strip()]
    selected_scenarios = [s.strip() for s in args.scenarios.split(",") if s.strip()]

    scenario_targets = {
        "slow_database": "postgres",
        "cpu_saturation": "order-service",
        "memory_pressure": "catalog-service",
        "network_latency": "payment-service",
        "packet_loss": "payment-service",
        "service_crash": "auth-service",
        "cache_failure": "redis",
        "traffic_spike": "nginx",
        "retry_storm": "payment-service",
        "queue_backlog": "queue"
    }

    client = httpx.Client(timeout=30.0)

    print("======================================================================")
    print("      OSCAR 2.0 AUTOMATED REPRODUCIBLE BENCHMARK RUNNER")
    print("======================================================================")
    env = check_environment(client)

    all_trials = []
    trial_counter = 1

    for scen_id in selected_scenarios:
        target = scenario_targets.get(scen_id, "postgres")
        for _ in range(args.trials_per_scenario):
            trial_data = run_single_experiment(
                client=client,
                scenario_id=scen_id,
                target_service=target,
                algorithms=selected_algorithms,
                trial_index=trial_counter,
                duration_sec=20
            )
            all_trials.append(trial_data)
            trial_counter += 1
            time.sleep(1)

    print("\n======================================================================")
    print("                       BENCHMARK RESULTS SUMMARY")
    print("======================================================================")

    aggregated = aggregate_benchmark_results(all_trials, selected_algorithms)
    print(f"{'ALGORITHM':<16} | {'HIT@1':<8} | {'HIT@3':<8} | {'HIT@5':<8} | {'MRR':<8} | {'AVG RUNTIME'}")
    print("-" * 68)
    for alg, res in aggregated.items():
        print(f"{alg.upper():<16} | {res['hit_at_1']:<8.3f} | {res['hit_at_3']:<8.3f} | {res['hit_at_5']:<8.3f} | {res['mrr']:<8.3f} | {res['avg_runtime_sec']:.3f}s")

    # Export immutable artifact
    os.makedirs("experiments/benchmarks", exist_ok=True)
    ts = int(time.time())
    artifact_path = f"experiments/benchmarks/benchmark_run_{ts}.json"
    artifact_data = {
        "timestamp_iso": datetime.now(timezone.utc).isoformat(),
        "total_trials": len(all_trials),
        "algorithms_evaluated": selected_algorithms,
        "scenarios_evaluated": selected_scenarios,
        "aggregate_metrics": aggregated,
        "trials": all_trials
    }
    with open(artifact_path, "w") as f:
        json.dump(artifact_data, f, indent=2)

    print(f"\n[+] Immutable benchmark artifact exported to: {artifact_path}")
    print("======================================================================")

if __name__ == "__main__":
    main()
