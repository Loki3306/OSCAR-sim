from typing import Dict, List, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

class PropagationHop(BaseModel):
    hop_index: int
    offset_ms: int
    service: str
    display_name: str
    status: str  # "fault", "degraded", "healthy"
    fsm_state: str  # "UNAVAILABLE", "DEGRADED", "HEALTHY"
    role: str  # "root_cause", "immediate_caller", "gateway_transit", "ingress_boundary", "client_impact"
    edge: Optional[Dict[str, Any]] = None
    causal_mechanism: str
    telemetry_delta: Dict[str, Any]
    symptoms: List[str]

class ScenarioTrace(BaseModel):
    scenario_id: str
    title: str
    target_service: str
    total_propagation_ms: int
    blast_chain: List[str]
    unaffected_services: List[str]
    hops: List[PropagationHop]
    generated_at: str

class PropagationTracer:
    """
    Computes millisecond-resolution causal propagation shockwaves
    demonstrating how an injected fault travels hop-by-hop across
    the 11-service distributed topology.
    """

    SERVICE_LABELS = {
        "client": "k6 Workload Generator",
        "nginx": "Nginx Ingress (8080)",
        "api": "Axum API Router",
        "auth-service": "Auth & JWT Service",
        "catalog-service": "Product Catalog Service",
        "order-service": "Order Processing Service",
        "payment-service": "Payment Simulator",
        "notification-service": "Notification Worker",
        "queue": "Message Broker",
        "postgres": "PostgreSQL 16 Storage",
        "redis": "Redis 7 Cache Store"
    }

    ALL_SERVICES = [
        "client", "nginx", "api", "auth-service", "catalog-service",
        "order-service", "payment-service", "notification-service",
        "queue", "postgres", "redis"
    ]

    def build_trace(self, scenario_id: str = "slow_database", target_override: Optional[str] = None) -> ScenarioTrace:
        now_iso = datetime.now(timezone.utc).isoformat()

        # Auto-detect target service from active experiment in sim_service if not provided
        if not target_override:
            try:
                from server.services.sim_service import sim_service
                if sim_service.active_experiment_id:
                    active_inc = sim_service.incidents.get(sim_service.active_experiment_id)
                    if active_inc:
                        target_override = active_inc.target_service
                        if scenario_id in ["slow_database", "service_crash"] and active_inc.fault_type:
                            scenario_id = active_inc.fault_type
                elif sim_service.active_faults:
                    latest_fault = list(sim_service.active_faults.values())[-1]
                    target_override = latest_fault.get("target_service")
                    if scenario_id in ["slow_database", "service_crash"] and latest_fault.get("fault_type"):
                        scenario_id = latest_fault.get("fault_type")
            except Exception:
                pass

        if scenario_id == "slow_database" or target_override == "postgres":
            target = "postgres"
            blast_chain = ["postgres", "order-service", "catalog-service", "api", "nginx", "client"]
            unaffected = [s for s in self.ALL_SERVICES if s not in blast_chain]
            hops = [
                PropagationHop(
                    hop_index=0,
                    offset_ms=0,
                    service="postgres",
                    display_name=self.SERVICE_LABELS["postgres"],
                    status="fault",
                    fsm_state="UNAVAILABLE",
                    role="root_cause",
                    edge=None,
                    causal_mechanism="Synthetic query delay injected on PostgreSQL. Database worker threads lock; buffer cache stalls and disk I/O queues up.",
                    telemetry_delta={
                        "latency_before_ms": 6.0,
                        "latency_after_ms": 280.0,
                        "cpu_delta_pct": +55.0,
                        "error_rate": 0.05
                    },
                    symptoms=["Database query latency spike (>250ms)", "Active connections locked", "Disk queue backpressure"]
                ),
                PropagationHop(
                    hop_index=1,
                    offset_ms=18,
                    service="order-service",
                    display_name=self.SERVICE_LABELS["order-service"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="immediate_caller",
                    edge={
                        "from": "order-service",
                        "to": "postgres",
                        "protocol": "PostgreSQL (Port 5432)",
                        "latency_jump_ms": 274.0
                    },
                    causal_mechanism="Hikari / SQLx connection pool exhausted on Order Service. Outbound order transactions queue waiting for DB lease.",
                    telemetry_delta={
                        "latency_before_ms": 9.4,
                        "latency_after_ms": 240.0,
                        "cpu_delta_pct": +15.0,
                        "error_rate": 0.03
                    },
                    symptoms=["Order DB pool saturation", "Worker thread lock", "Transaction commit delays"]
                ),
                PropagationHop(
                    hop_index=2,
                    offset_ms=22,
                    service="catalog-service",
                    display_name=self.SERVICE_LABELS["catalog-service"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="immediate_caller",
                    edge={
                        "from": "catalog-service",
                        "to": "postgres",
                        "protocol": "PostgreSQL (Port 5432)",
                        "latency_jump_ms": 274.0
                    },
                    causal_mechanism="Uncached catalog queries hit locked PostgreSQL instance. Cache miss fallback threads block on database responses.",
                    telemetry_delta={
                        "latency_before_ms": 6.1,
                        "latency_after_ms": 220.0,
                        "cpu_delta_pct": +10.0,
                        "error_rate": 0.02
                    },
                    symptoms=["Catalog search latency > 200ms", "DB fallback thread starvation"]
                ),
                PropagationHop(
                    hop_index=3,
                    offset_ms=45,
                    service="api",
                    display_name=self.SERVICE_LABELS["api"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="gateway_transit",
                    edge={
                        "from": "api",
                        "to": "order-service",
                        "protocol": "HTTP / REST",
                        "latency_jump_ms": 230.6
                    },
                    causal_mechanism="Axum API gateway router threads queue waiting for downstream Order and Catalog HTTP response headers.",
                    telemetry_delta={
                        "latency_before_ms": 8.5,
                        "latency_after_ms": 240.0,
                        "cpu_delta_pct": +18.0,
                        "error_rate": 0.03
                    },
                    symptoms=["Axum worker queueing", "Client connection accumulation", "API latency degradation"]
                ),
                PropagationHop(
                    hop_index=4,
                    offset_ms=68,
                    service="nginx",
                    display_name=self.SERVICE_LABELS["nginx"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="ingress_boundary",
                    edge={
                        "from": "nginx",
                        "to": "api",
                        "protocol": "HTTP Reverse Proxy",
                        "latency_jump_ms": 231.5
                    },
                    causal_mechanism="Nginx proxy_pass upstream timeouts trigger. Ingress gateway starts responding with HTTP 504 Gateway Timeout.",
                    telemetry_delta={
                        "latency_before_ms": 7.2,
                        "latency_after_ms": 255.0,
                        "cpu_delta_pct": +8.5,
                        "error_rate": 0.04
                    },
                    symptoms=["HTTP 504 Gateway Timeouts", "Upstream response time surge", "Nginx connection backlog"]
                ),
                PropagationHop(
                    hop_index=5,
                    offset_ms=85,
                    service="client",
                    display_name=self.SERVICE_LABELS["client"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="client_impact",
                    edge={
                        "from": "client",
                        "to": "nginx",
                        "protocol": "HTTP (Port 8080)",
                        "latency_jump_ms": 247.8
                    },
                    causal_mechanism="k6 load client observes request failure cascade. End-user p99 latency breaches 250ms SLA; failed checks occur.",
                    telemetry_delta={
                        "latency_before_ms": 5.0,
                        "latency_after_ms": 260.0,
                        "cpu_delta_pct": 0.0,
                        "error_rate": 0.04
                    },
                    symptoms=["Client SLA breach (>250ms)", "Drop in successful RPS", "End-to-end user checkout failure"]
                )
            ]
            return ScenarioTrace(
                scenario_id="slow_database",
                title="Slow Database Query Cascade (PostgreSQL Stall)",
                target_service="postgres",
                total_propagation_ms=85,
                blast_chain=blast_chain,
                unaffected_services=unaffected,
                hops=hops,
                generated_at=now_iso
            )

        elif scenario_id == "cpu_saturation" or target_override == "order-service":
            target = "order-service"
            blast_chain = ["order-service", "api", "nginx", "client"]
            unaffected = [s for s in self.ALL_SERVICES if s not in blast_chain]
            hops = [
                PropagationHop(
                    hop_index=0,
                    offset_ms=0,
                    service="order-service",
                    display_name=self.SERVICE_LABELS["order-service"],
                    status="fault",
                    fsm_state="UNAVAILABLE",
                    role="root_cause",
                    edge=None,
                    causal_mechanism="stress-ng worker threads exhaust CPU cores on Order Service. Context switching increases 400%; thread scheduler queues up.",
                    telemetry_delta={"latency_before_ms": 9.4, "latency_after_ms": 195.0, "cpu_delta_pct": +82.0, "error_rate": 0.02},
                    symptoms=["CPU core saturation (>85%)", "Thread scheduling starvation", "Order processing delay"]
                ),
                PropagationHop(
                    hop_index=1,
                    offset_ms=25,
                    service="api",
                    display_name=self.SERVICE_LABELS["api"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="gateway_transit",
                    edge={"from": "api", "to": "order-service", "protocol": "HTTP / REST", "latency_jump_ms": 185.0},
                    causal_mechanism="API gateway router requests to /orders stall awaiting thread allocation on order service.",
                    telemetry_delta={"latency_before_ms": 8.5, "latency_after_ms": 190.0, "cpu_delta_pct": +14.0, "error_rate": 0.02},
                    symptoms=["API router connection backlog", "Latency surge on /orders"]
                ),
                PropagationHop(
                    hop_index=2,
                    offset_ms=48,
                    service="nginx",
                    display_name=self.SERVICE_LABELS["nginx"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="ingress_boundary",
                    edge={"from": "nginx", "to": "api", "protocol": "HTTP Reverse Proxy", "latency_jump_ms": 180.0},
                    causal_mechanism="Nginx buffers client requests while waiting for API responses, triggering micro-queueing.",
                    telemetry_delta={"latency_before_ms": 7.2, "latency_after_ms": 195.0, "cpu_delta_pct": +6.0, "error_rate": 0.02},
                    symptoms=["Ingress queue build-up", "Elevated p95 response time"]
                ),
                PropagationHop(
                    hop_index=3,
                    offset_ms=65,
                    service="client",
                    display_name=self.SERVICE_LABELS["client"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="client_impact",
                    edge={"from": "client", "to": "nginx", "protocol": "HTTP", "latency_jump_ms": 195.0},
                    causal_mechanism="Workload generator records degraded checkout throughput.",
                    telemetry_delta={"latency_before_ms": 5.0, "latency_after_ms": 200.0, "cpu_delta_pct": 0.0, "error_rate": 0.02},
                    symptoms=["Checkout degradation", "Client latency increase"]
                )
            ]
            return ScenarioTrace(
                scenario_id="cpu_saturation",
                title="Worker CPU Core Saturation (Order Service)",
                target_service="order-service",
                total_propagation_ms=65,
                blast_chain=blast_chain,
                unaffected_services=unaffected,
                hops=hops,
                generated_at=now_iso
            )

        elif scenario_id == "cache_failure" or target_override == "redis":
            target = "redis"
            blast_chain = ["redis", "catalog-service", "api", "nginx", "client"]
            unaffected = [s for s in self.ALL_SERVICES if s not in blast_chain]
            hops = [
                PropagationHop(
                    hop_index=0,
                    offset_ms=0,
                    service="redis",
                    display_name=self.SERVICE_LABELS["redis"],
                    status="fault",
                    fsm_state="UNAVAILABLE",
                    role="root_cause",
                    edge=None,
                    causal_mechanism="Redis cache failure / crash. In-memory keys unserviceable; 100% cache miss storm.",
                    telemetry_delta={"latency_before_ms": 2.1, "latency_after_ms": 210.0, "cpu_delta_pct": +15.0, "error_rate": 0.08},
                    symptoms=["100% cache miss rate", "RESP command failure", "Connection refused"]
                ),
                PropagationHop(
                    hop_index=1,
                    offset_ms=15,
                    service="catalog-service",
                    display_name=self.SERVICE_LABELS["catalog-service"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="immediate_caller",
                    edge={"from": "catalog-service", "to": "redis", "protocol": "RESP", "latency_jump_ms": 208.0},
                    causal_mechanism="Catalog service outbound RESP client times out. Worker threads fall back to direct SQL queries on PostgreSQL, increasing latency.",
                    telemetry_delta={"latency_before_ms": 6.1, "latency_after_ms": 145.0, "cpu_delta_pct": +18.0, "error_rate": 0.03},
                    symptoms=["Read latency jump 6ms -> 145ms", "Database fallback query surge", "Caller thread pool pressure"]
                ),
                PropagationHop(
                    hop_index=2,
                    offset_ms=35,
                    service="api",
                    display_name=self.SERVICE_LABELS["api"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="gateway_transit",
                    edge={"from": "api", "to": "catalog-service", "protocol": "HTTP", "latency_jump_ms": 138.0},
                    causal_mechanism="Axum API gateway router requests to /products stall waiting for catalog service fallback responses.",
                    telemetry_delta={"latency_before_ms": 8.5, "latency_after_ms": 150.0, "cpu_delta_pct": +10.0, "error_rate": 0.02},
                    symptoms=["API router connection hold", "Catalog endpoint latency elevation"]
                ),
                PropagationHop(
                    hop_index=3,
                    offset_ms=52,
                    service="nginx",
                    display_name=self.SERVICE_LABELS["nginx"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="ingress_boundary",
                    edge={"from": "nginx", "to": "api", "protocol": "HTTP Reverse Proxy", "latency_jump_ms": 142.0},
                    causal_mechanism="Nginx ingress buffers client browsing requests, observing P95 latency degradation.",
                    telemetry_delta={"latency_before_ms": 7.2, "latency_after_ms": 158.0, "cpu_delta_pct": +6.0, "error_rate": 0.02},
                    symptoms=["Ingress queue accumulation", "Elevated P95 latency"]
                ),
                PropagationHop(
                    hop_index=4,
                    offset_ms=70,
                    service="client",
                    display_name=self.SERVICE_LABELS["client"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="client_impact",
                    edge={"from": "client", "to": "nginx", "protocol": "HTTP", "latency_jump_ms": 151.0},
                    causal_mechanism="k6 synthetic workload generator records increased catalog browse latency.",
                    telemetry_delta={"latency_before_ms": 5.0, "latency_after_ms": 160.0, "cpu_delta_pct": 0.0, "error_rate": 0.02},
                    symptoms=["Degraded browsing latency", "Client throughput slowdown"]
                )
            ]
            return ScenarioTrace(
                scenario_id=scenario_id,
                title="Redis Cache Eviction Storm & Miss Spike",
                target_service="redis",
                total_propagation_ms=70,
                blast_chain=blast_chain,
                unaffected_services=unaffected,
                hops=hops,
                generated_at=now_iso
            )

        elif target_override == "payment-service" or scenario_id in ["network_latency", "retry_storm"]:
            target = "payment-service"
            blast_chain = ["payment-service", "order-service", "api", "nginx", "client"]
            unaffected = [s for s in self.ALL_SERVICES if s not in blast_chain]
            hops = [
                PropagationHop(
                    hop_index=0,
                    offset_ms=0,
                    service="payment-service",
                    display_name=self.SERVICE_LABELS["payment-service"],
                    status="fault",
                    fsm_state="UNAVAILABLE",
                    role="root_cause",
                    edge=None,
                    causal_mechanism="Packet delay / payment gateway outage injected. External gateway transactions stall.",
                    telemetry_delta={"latency_before_ms": 12.0, "latency_after_ms": 250.0, "cpu_delta_pct": +20.0, "error_rate": 0.05},
                    symptoms=["Latency spike", "Error rate surge"]
                ),
                PropagationHop(
                    hop_index=1,
                    offset_ms=22,
                    service="order-service",
                    display_name=self.SERVICE_LABELS["order-service"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="immediate_caller",
                    edge={"from": "order-service", "to": "payment-service", "protocol": "HTTPS", "latency_jump_ms": 238.0},
                    causal_mechanism="Outbound caller waits on payment response, depleting client connection pool.",
                    telemetry_delta={"latency_before_ms": 9.4, "latency_after_ms": 220.0, "cpu_delta_pct": +12.0, "error_rate": 0.03},
                    symptoms=["Connection timeout", "Caller queueing"]
                ),
                PropagationHop(
                    hop_index=2,
                    offset_ms=45,
                    service="api",
                    display_name=self.SERVICE_LABELS["api"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="gateway_transit",
                    edge={"from": "api", "to": "order-service", "protocol": "HTTP", "latency_jump_ms": 210.0},
                    causal_mechanism="API gateway router encounters blocked worker threads awaiting /checkout completion.",
                    telemetry_delta={"latency_before_ms": 8.5, "latency_after_ms": 215.0, "cpu_delta_pct": +8.0, "error_rate": 0.02},
                    symptoms=["API queueing", "Slow response"]
                ),
                PropagationHop(
                    hop_index=3,
                    offset_ms=65,
                    service="nginx",
                    display_name=self.SERVICE_LABELS["nginx"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="ingress_boundary",
                    edge={"from": "nginx", "to": "api", "protocol": "HTTP Reverse Proxy", "latency_jump_ms": 215.0},
                    causal_mechanism="Ingress proxy serves 504 Gateway Timeouts to clients.",
                    telemetry_delta={"latency_before_ms": 7.2, "latency_after_ms": 225.0, "cpu_delta_pct": +5.0, "error_rate": 0.03},
                    symptoms=["Gateway timeouts", "Proxy wait queue"]
                ),
                PropagationHop(
                    hop_index=4,
                    offset_ms=82,
                    service="client",
                    display_name=self.SERVICE_LABELS["client"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="client_impact",
                    edge={"from": "client", "to": "nginx", "protocol": "HTTP", "latency_jump_ms": 220.0},
                    causal_mechanism="Workload generator checkout transactions fail with HTTP 504.",
                    telemetry_delta={"latency_before_ms": 5.0, "latency_after_ms": 230.0, "cpu_delta_pct": 0.0, "error_rate": 0.04},
                    symptoms=["Checkout failure", "SLA violation"]
                )
            ]
            return ScenarioTrace(
                scenario_id=scenario_id,
                title="Payment Gateway Latency & Connection Exhaustion",
                target_service="payment-service",
                total_propagation_ms=82,
                blast_chain=blast_chain,
                unaffected_services=unaffected,
                hops=hops,
                generated_at=now_iso
            )

        elif target_override == "auth-service":
            target = "auth-service"
            blast_chain = ["auth-service", "api", "nginx", "client"]
            unaffected = [s for s in self.ALL_SERVICES if s not in blast_chain]
            hops = [
                PropagationHop(
                    hop_index=0,
                    offset_ms=0,
                    service="auth-service",
                    display_name=self.SERVICE_LABELS["auth-service"],
                    status="fault",
                    fsm_state="UNAVAILABLE",
                    role="root_cause",
                    edge=None,
                    causal_mechanism="Auth & JWT Service outage. Token verification requests rejected.",
                    telemetry_delta={"latency_before_ms": 4.0, "latency_after_ms": 180.0, "cpu_delta_pct": +20.0, "error_rate": 0.08},
                    symptoms=["JWT verification failure", "gRPC deadline exceeded"]
                ),
                PropagationHop(
                    hop_index=1,
                    offset_ms=18,
                    service="api",
                    display_name=self.SERVICE_LABELS["api"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="immediate_caller",
                    edge={"from": "api", "to": "auth-service", "protocol": "gRPC", "latency_jump_ms": 176.0},
                    causal_mechanism="Axum API gateway gRPC client channel blocks on token validation interceptors.",
                    telemetry_delta={"latency_before_ms": 8.5, "latency_after_ms": 185.0, "cpu_delta_pct": +12.0, "error_rate": 0.04},
                    symptoms=["API gRPC caller delay", "Auth middleware blockage"]
                ),
                PropagationHop(
                    hop_index=2,
                    offset_ms=38,
                    service="nginx",
                    display_name=self.SERVICE_LABELS["nginx"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="ingress_boundary",
                    edge={"from": "nginx", "to": "api", "protocol": "HTTP", "latency_jump_ms": 178.0},
                    causal_mechanism="Nginx ingress proxy receives HTTP 503 / 504 from API gateway.",
                    telemetry_delta={"latency_before_ms": 7.2, "latency_after_ms": 190.0, "cpu_delta_pct": +5.0, "error_rate": 0.03},
                    symptoms=["503 Service Unavailable", "Proxy queue build-up"]
                ),
                PropagationHop(
                    hop_index=3,
                    offset_ms=55,
                    service="client",
                    display_name=self.SERVICE_LABELS["client"],
                    status="degraded",
                    fsm_state="DEGRADED",
                    role="client_impact",
                    edge={"from": "client", "to": "nginx", "protocol": "HTTP", "latency_jump_ms": 185.0},
                    causal_mechanism="Client requests rejected due to token verification timeout.",
                    telemetry_delta={"latency_before_ms": 5.0, "latency_after_ms": 195.0, "cpu_delta_pct": 0.0, "error_rate": 0.03},
                    symptoms=["Client authentication failure", "Elevated latency"]
                )
            ]
            return ScenarioTrace(
                scenario_id=scenario_id,
                title="Authentication Service Outage Cascade",
                target_service="auth-service",
                total_propagation_ms=55,
                blast_chain=blast_chain,
                unaffected_services=unaffected,
                hops=hops,
                generated_at=now_iso
            )

        # Dynamic fallback for any target service
        target = target_override or "postgres"
        caller_map = {
            "catalog-service": "api",
            "order-service": "api",
            "api": "nginx",
            "nginx": "client",
            "queue": "order-service",
            "notification-service": "queue"
        }
        caller = caller_map.get(target, "api")
        blast_chain = [target, caller, "nginx", "client"]
        unaffected = [s for s in self.ALL_SERVICES if s not in blast_chain]
        hops = [
            PropagationHop(
                hop_index=0,
                offset_ms=0,
                service=target,
                display_name=self.SERVICE_LABELS.get(target, target),
                status="fault",
                fsm_state="UNAVAILABLE",
                role="root_cause",
                edge=None,
                causal_mechanism=f"Fault injection applied on {target}.",
                telemetry_delta={"latency_before_ms": 10.0, "latency_after_ms": 220.0, "cpu_delta_pct": +25.0, "error_rate": 0.05},
                symptoms=["Resource anomaly", "Latency spike"]
            ),
            PropagationHop(
                hop_index=1,
                offset_ms=20,
                service=caller,
                display_name=self.SERVICE_LABELS.get(caller, caller),
                status="degraded",
                fsm_state="DEGRADED",
                role="immediate_caller",
                edge={"from": caller, "to": target, "protocol": "HTTP", "latency_jump_ms": 200.0},
                causal_mechanism=f"{caller} outbound request blocks on {target} dependency response.",
                telemetry_delta={"latency_before_ms": 8.0, "latency_after_ms": 205.0, "cpu_delta_pct": +10.0, "error_rate": 0.03},
                symptoms=["Connection wait", "Caller delay"]
            ),
            PropagationHop(
                hop_index=2,
                offset_ms=45,
                service="nginx",
                display_name=self.SERVICE_LABELS["nginx"],
                status="degraded",
                fsm_state="DEGRADED",
                role="ingress_boundary",
                edge={"from": "nginx", "to": caller, "protocol": "HTTP Reverse Proxy", "latency_jump_ms": 195.0},
                causal_mechanism="Ingress proxy buffers client connections, serving elevated latency.",
                telemetry_delta={"latency_before_ms": 7.2, "latency_after_ms": 210.0, "cpu_delta_pct": +5.0, "error_rate": 0.02},
                symptoms=["Ingress queueing", "Proxy latency"]
            ),
            PropagationHop(
                hop_index=3,
                offset_ms=65,
                service="client",
                display_name=self.SERVICE_LABELS["client"],
                status="degraded",
                fsm_state="DEGRADED",
                role="client_impact",
                edge={"from": "client", "to": "nginx", "protocol": "HTTP", "latency_jump_ms": 200.0},
                causal_mechanism="Workload generator observes response time degradation.",
                telemetry_delta={"latency_before_ms": 5.0, "latency_after_ms": 215.0, "cpu_delta_pct": 0.0, "error_rate": 0.02},
                symptoms=["User latency degradation", "SLA warning"]
            )
        ]
        return ScenarioTrace(
            scenario_id=scenario_id,
            title=f"Cascading Degradation on {target}",
            target_service=target,
            total_propagation_ms=65,
            blast_chain=blast_chain,
            unaffected_services=unaffected,
            hops=hops,
            generated_at=now_iso
        )

propagation_tracer = PropagationTracer()
