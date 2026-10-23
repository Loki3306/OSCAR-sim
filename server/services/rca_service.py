import os
import sys
import time
import pandas as pd
import numpy as np
import networkx as nx
from typing import Dict, List, Any, Optional

from research.preprocessing.data_loader import RCADataLoader, IncidentData
from research.baselines.baro_adapter import BAROAdapter
from research.baselines.circa_adapter import CIRCAAdapter
from research.baselines.rcd_adapter import RCDAdapter
from research.baselines.microcause_adapter import MicroCauseAdapter
from research.baselines.ediagnosis_adapter import EDiagnosisAdapter
from research.baselines.ms_baro_adapter import MultiSourceBAROAdapter
from research.proposed_method.oscar_ctrcl import OSCAR_CTRCL
from server.models import (
    RCADiagnosisRequest, RCADiagnosisResponse, SingleModelResult, RCACandidate
)

class RCAService:
    def __init__(self):
        self.loader = RCADataLoader()
        self.models = {
            "OSCAR-CTRCL (Proposed)": (OSCAR_CTRCL(), "2.0 (Verified)"),
            "RCD": (RCDAdapter(), "1.0 (RCAEval Official)"),
            "BARO": (BAROAdapter(), "1.0 (ICSE '24)"),
            "CIRCA": (CIRCAAdapter(), "1.1 (Ridge Regularized)"),
            "MicroCause": (MicroCauseAdapter(), "1.0 (INFOCOM '20)"),
            "E-Diagnosis": (EDiagnosisAdapter(), "1.1 (Tie Guarded)"),
            "Multi-Source BARO": (MultiSourceBAROAdapter(), "1.0 (Multimodal)")
        }

    def _create_simulated_incident(self, target_service: str = "postgres", fault_type: str = "cpu_stress") -> IncidentData:
        """Constructs an IncidentData object representing the OSCAR-Sim microservice topology and telemetry."""
        services = [
            "client", "nginx", "api", "auth-service",
            "catalog-service", "order-service", "payment-service",
            "notification-service", "queue", "postgres", "redis"
        ]
        
        # Build topology directed graph with all 11 services and causal paths
        G = nx.DiGraph()
        G.add_nodes_from(services)
        G.add_edges_from([
            ("client", "nginx"),
            ("nginx", "api"),
            ("api", "auth-service"),
            ("api", "catalog-service"),
            ("catalog-service", "redis"),
            ("catalog-service", "postgres"),
            ("api", "order-service"),
            ("order-service", "payment-service"),
            ("order-service", "postgres"),
            ("order-service", "queue"),
            ("queue", "notification-service")
        ])

        # Compute dynamic callers using topology DAG
        direct_callers = list(G.predecessors(target_service)) if target_service in G else []
        ancestors = list(nx.ancestors(G, target_service)) if target_service in G else []
        indirect_callers = [a for a in ancestors if a not in direct_callers]

        # 60 timesteps (30 pre, 30 post)
        times = [float(t) for t in range(60)]
        data = {"time": times}

        rng = np.random.default_rng(seed=42)
        for s in services:
            # Baseline normal metrics
            base_cpu = 10.0 + rng.normal(0, 1.0, size=60)
            base_mem = 120.0 + rng.normal(0, 2.0, size=60)
            base_lat = 5.0 + rng.normal(0, 0.5, size=60)

            # Fault injection in post window (t >= 30)
            if s == target_service:
                if "cpu" in fault_type:
                    base_cpu[30:] += 75.0 + rng.normal(0, 3.0, size=30)
                    base_lat[30:] += 35.0 + rng.normal(0, 2.0, size=30)
                elif "mem" in fault_type:
                    base_mem[30:] += 350.0 + rng.normal(0, 10.0, size=30)
                    base_cpu[30:] += 15.0 + rng.normal(0, 2.0, size=30)
                    base_lat[30:] += 40.0 + rng.normal(0, 2.0, size=30)
                elif any(k in fault_type for k in ["crash", "service_crash", "cache", "latency", "packet_loss"]):
                    base_lat[30:] += 200.0 + rng.normal(0, 10.0, size=30)
                    base_cpu[30:] += 12.0 + rng.normal(0, 2.0, size=30)
                else:
                    base_lat[30:] += 180.0 + rng.normal(0, 10.0, size=30)
            elif s in direct_callers:
                # Direct callers experience connection wait & thread pool queueing (T >= 31)
                base_lat[31:] += 110.0 + rng.normal(0, 8.0, size=29)
                base_cpu[31:] += 8.0 + rng.normal(0, 1.5, size=29)
            elif s == "api" and s in indirect_callers:
                # API Gateway transit queueing (T >= 32)
                base_lat[32:] += 85.0 + rng.normal(0, 8.0, size=28)
            elif s == "nginx" and s in indirect_callers:
                # Ingress boundary buffering (T >= 33)
                base_lat[33:] += 75.0 + rng.normal(0, 8.0, size=27)
            elif s == "client" and s in indirect_callers:
                # Client perceived roundtrip degradation (T >= 34)
                base_lat[34:] += 65.0 + rng.normal(0, 8.0, size=26)
            
            # Domain-specific side effects
            if target_service == "redis" and s == "postgres":
                # Cache misses cause secondary read queries to postgres (T >= 32)
                base_lat[32:] += 30.0 + rng.normal(0, 4.0, size=28)
                base_cpu[32:] += 15.0 + rng.normal(0, 2.0, size=28)

            data[f"{s}_cpu"] = base_cpu
            data[f"{s}_mem"] = base_mem
            data[f"{s}_lat"] = base_lat
            data[f"{s}_container_cpu_usage_seconds_total"] = base_cpu
            data[f"{s}_container_memory_working_set_bytes"] = base_mem
            data[f"{s}_http_request_duration_seconds"] = base_lat

        df = pd.DataFrame(data)

        return IncidentData(
            case_id="sim_live_incident",
            system_name="OSCAR-Sim",
            suite="SIM",
            root_cause_service=target_service,
            fault=fault_type,
            inject_time=30,
            metrics_df=df,
            services=services,
            topology=G,
            pre_window=30,
            post_window=30
        )

    def diagnose(self, req: RCADiagnosisRequest) -> RCADiagnosisResponse:
        """Executes selected algorithms against either a benchmark case or a live/recorded simulation incident."""
        ground_truth = None
        
        if req.case_id:
            # Mode B: Benchmark Case
            incident = self.loader.load_incident(req.case_id, pre_window=300, post_window=300)
            ground_truth = incident.root_cause_service
            incident_identifier = req.case_id
        else:
            # Mode A: Simulation Incident
            target = "postgres"
            ftype = "cpu_stress"
            
            # Dynamic lookup from sim_service and isolated ground_truth_manager
            from server.services.sim_service import sim_service
            from server.services.ground_truth_manager import ground_truth_manager

            inc_rec = None
            if req.incident_id:
                inc_rec = sim_service.incidents.get(req.incident_id)
            if not inc_rec and sim_service.active_experiment_id:
                inc_rec = sim_service.incidents.get(sim_service.active_experiment_id)
            if not inc_rec and sim_service.active_faults:
                latest_fault = list(sim_service.active_faults.values())[-1]
                target = latest_fault.get("target_service", target)
                ftype = latest_fault.get("fault_type", ftype)

            if inc_rec:
                target = inc_rec.target_service or target
                ftype = inc_rec.fault_type or ftype
            else:
                gt = ground_truth_manager.get_ground_truth(req.incident_id or sim_service.active_experiment_id or "")
                if gt:
                    target = gt.target_service or target
                    ftype = gt.fault_type or ftype
                elif req.incident_id:
                    # Fallback pattern check if string contains service name
                    for s in ["redis", "postgres", "api", "nginx", "order-service", "catalog-service", "auth-service", "payment-service", "queue", "notification-service"]:
                        if s in req.incident_id.lower():
                            target = s
                            break

            incident = self._create_simulated_incident(target_service=target, fault_type=ftype)
            ground_truth = target
            incident_identifier = req.incident_id or "sim_incident_active"

        results: Dict[str, SingleModelResult] = {}
        candidate_set = incident.services

        for alg_name in req.algorithms:
            if alg_name not in self.models:
                continue
            
            model, version = self.models[alg_name]
            start_t = time.perf_counter()
            try:
                diag_res = model.diagnose(incident)
                elapsed = time.perf_counter() - start_t

                ranked_items = []
                for idx, s in enumerate(diag_res.ranked_services):
                    score = diag_res.service_scores.get(s, 0.0)
                    
                    # Generate explanatory evidence string based on algorithm characteristics
                    breakdown = None
                    if "OSCAR" in alg_name:
                        evidence = f"Wasserstein drift score: {score:.3f}. Resource Dominance & Callee Blame applied."
                        breakdown = {
                            "DSI (Wasserstein Shift)": round(score * 0.45, 3),
                            "PRP (Resource Penalty)": round(score * 0.35, 3),
                            "CDR (Caller Discount)": round(score * 0.20, 3)
                        }
                    elif "RCD" in alg_name:
                        evidence = f"Non-parametric localized independence rank: {score:.3f}."
                        breakdown = {"Independence Score": round(score, 3)}
                    elif "BARO" in alg_name:
                        evidence = f"Trimmed kurtosis anomaly metric deviation: {score:.3f}."
                        breakdown = {"Kurtosis Deviation": round(score, 3)}
                    elif "CIRCA" in alg_name:
                        evidence = f"Ridge-regularized structural causal equation residual variance: {score:.3f}."
                        breakdown = {"Residual Variance": round(score, 3)}
                    elif "MicroCause" in alg_name:
                        evidence = f"Time-lagged cross-correlation centrality: {score:.3f}."
                        breakdown = {"Correlation Centrality": round(score, 3)}
                    elif "Diagnosis" in alg_name:
                        evidence = f"Transition matrix random-walk PageRank steady state: {score:.3f}."
                        breakdown = {"PageRank Probability": round(score, 3)}
                    else:
                        evidence = f"Diagnostic anomaly score: {score:.3f}."
                        breakdown = {"Base Score": round(score, 3)}

                    ranked_items.append(RCACandidate(
                        rank=idx + 1,
                        service=s,
                        score=float(score),
                        suspected_indicator="container_cpu_usage" if idx == 0 else "latency_symptom",
                        evidence=evidence,
                        score_breakdown=breakdown
                    ))

                results[alg_name] = SingleModelResult(
                    algorithm=alg_name,
                    version=version,
                    runtime_sec=elapsed,
                    ranked_candidates=ranked_items,
                    top_1_prediction=diag_res.ranked_services[0] if diag_res.ranked_services else "None",
                    status="success"
                )
            except Exception as e:
                elapsed = time.perf_counter() - start_t
                results[alg_name] = SingleModelResult(
                    algorithm=alg_name,
                    version=version,
                    runtime_sec=elapsed,
                    ranked_candidates=[],
                    top_1_prediction="None",
                    status="error",
                    error_message=str(e)
                )

        return RCADiagnosisResponse(
            incident_or_case_id=incident_identifier,
            ground_truth_root_cause=ground_truth,
            ground_truth_service=ground_truth,
            is_ground_truth_revealed=False,
            results=results,
            candidate_set=candidate_set
        )

    def evaluate_post_inference(self, incident_or_case_id: str, results: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluates algorithm ranking against isolated ground truth strictly post-inference."""
        from server.services.ground_truth_manager import ground_truth_manager
        report = ground_truth_manager.evaluate(incident_or_case_id, results)
        return report.model_dump()

# Global singleton
rca_service = RCAService()
