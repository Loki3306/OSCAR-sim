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
        services = ["client", "nginx", "api", "postgres", "redis"]
        
        # Build topology directed graph: Client -> Nginx -> API -> (Postgres, Redis)
        G = nx.DiGraph()
        G.add_nodes_from(services)
        G.add_edges_from([
            ("client", "nginx"),
            ("nginx", "api"),
            ("api", "postgres"),
            ("api", "redis")
        ])

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
                elif "mem" in fault_type:
                    base_mem[30:] += 350.0 + rng.normal(0, 10.0, size=30)
            elif s == "api" and target_service in ["postgres", "redis"]:
                # Downstream caller latency cascade
                base_lat[30:] += 120.0 + rng.normal(0, 15.0, size=30)
            elif s == "nginx" and target_service in ["postgres", "redis"]:
                base_lat[30:] += 135.0 + rng.normal(0, 15.0, size=30)

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
            if req.incident_id:
                # Check target service from incident id if provided
                if "redis" in req.incident_id.lower():
                    target = "redis"
                elif "api" in req.incident_id.lower():
                    target = "api"
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
                    if "OSCAR" in alg_name:
                        evidence = f"Wasserstein drift score: {score:.3f}. Resource Dominance & Callee Blame applied."
                    elif "RCD" in alg_name:
                        evidence = f"Non-parametric localized independence rank: {score:.3f}."
                    elif "BARO" in alg_name:
                        evidence = f"Trimmed kurtosis anomaly metric deviation: {score:.3f}."
                    elif "CIRCA" in alg_name:
                        evidence = f"Ridge-regularized structural causal equation residual variance: {score:.3f}."
                    elif "MicroCause" in alg_name:
                        evidence = f"Time-lagged cross-correlation centrality: {score:.3f}."
                    elif "Diagnosis" in alg_name:
                        evidence = f"Transition matrix random-walk PageRank steady state: {score:.3f}."
                    else:
                        evidence = f"Diagnostic anomaly score: {score:.3f}."

                    ranked_items.append(RCACandidate(
                        rank=idx + 1,
                        service=s,
                        score=float(score),
                        suspected_indicator="container_cpu_usage" if idx == 0 else "latency_symptom",
                        evidence=evidence
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

# Global singleton
rca_service = RCAService()
