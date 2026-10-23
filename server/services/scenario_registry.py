from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

class ScenarioParameter(BaseModel):
    name: str
    label: str
    type: str  # "range", "number", "select"
    default: Any
    min: Optional[float] = None
    max: Optional[float] = None
    step: Optional[float] = None
    unit: Optional[str] = None
    description: str

class ScenarioDefinition(BaseModel):
    id: str
    name: str
    category: str  # "resource", "network", "application", "composite"
    description: str
    default_target: str
    allowed_targets: List[str]
    parameters: List[ScenarioParameter]
    expected_impact_chain: List[str]
    observable_effects: List[str]
    safety_max_duration: int = 300

class ScenarioRegistry:
    """
    Central catalog of parameterized distributed failure scenarios.
    Ensures safe bounded experiments, ground truth blast chain isolation,
    and realistic cascading effects.
    """
    def __init__(self):
        self._scenarios: Dict[str, ScenarioDefinition] = {}
        self._register_default_scenarios()

    def _register_default_scenarios(self):
        # 1. CPU Saturation
        self.register(ScenarioDefinition(
            id="cpu_saturation",
            name="CPU Saturation (stress-ng)",
            category="resource",
            description="Exhausts CPU execution threads on target service, inducing thread queueing, context switching, and response latency amplification.",
            default_target="order-service",
            allowed_targets=["order-service", "catalog-service", "auth-service", "api", "postgres"],
            parameters=[
                ScenarioParameter(name="intensity", label="CPU Intensity", type="range", default=85, min=20, max=100, step=5, unit="%", description="Thread workload utilization target"),
                ScenarioParameter(name="duration_seconds", label="Duration", type="range", default=45, min=10, max=300, step=5, unit="s", description="Fault active duration")
            ],
            expected_impact_chain=["order-service", "api", "nginx"],
            observable_effects=["CPU utilization > 80%", "Thread context switching", "Downstream latency increase", "Client timeouts"]
        ))

        # 2. Memory Pressure
        self.register(ScenarioDefinition(
            id="memory_pressure",
            name="Memory Pressure & Leak",
            category="resource",
            description="Allocates working heap pages to trigger garbage collection thrashing and memory exhaustion.",
            default_target="catalog-service",
            allowed_targets=["catalog-service", "api", "auth-service", "order-service"],
            parameters=[
                ScenarioParameter(name="intensity", label="Memory Limit Pressure", type="range", default=90, min=40, max=100, step=5, unit="%", description="RSS heap memory allocation rate"),
                ScenarioParameter(name="duration_seconds", label="Duration", type="range", default=60, min=15, max=300, step=5, unit="s", description="Duration of memory lock")
            ],
            expected_impact_chain=["catalog-service", "api", "nginx"],
            observable_effects=["Memory working set growth", "GC pauses (>100ms)", "API Gateway 504 timeouts"]
        ))

        # 3. Network Latency
        self.register(ScenarioDefinition(
            id="network_latency",
            name="Network Latency & Jitter",
            category="network",
            description="Injects artificial packet transit delay and jitter on service network interfaces via tc/netem.",
            default_target="payment-service",
            allowed_targets=["payment-service", "postgres", "redis", "order-service"],
            parameters=[
                ScenarioParameter(name="delay_ms", label="Packet Delay", type="range", default=250, min=50, max=1500, step=25, unit="ms", description="Base roundtrip latency delay"),
                ScenarioParameter(name="jitter_ms", label="Jitter", type="range", default=30, min=0, max=200, step=10, unit="ms", description="Variance in packet delay"),
                ScenarioParameter(name="duration_seconds", label="Duration", type="range", default=45, min=10, max=300, step=5, unit="s", description="Active fault window")
            ],
            expected_impact_chain=["payment-service", "order-service", "api", "nginx"],
            observable_effects=["Trace span latency spikes", "Upstream caller timeouts", "Connection pooling queue delay"]
        ))

        # 4. Packet Loss
        self.register(ScenarioDefinition(
            id="packet_loss",
            name="Packet Loss & Corruption",
            category="network",
            description="Drops a configured percentage of network packets, triggering TCP retransmission storms and connection resets.",
            default_target="payment-service",
            allowed_targets=["payment-service", "catalog-service", "order-service"],
            parameters=[
                ScenarioParameter(name="loss_rate", label="Packet Drop Rate", type="range", default=20, min=5, max=60, step=5, unit="%", description="Percentage of dropped TCP segments"),
                ScenarioParameter(name="duration_seconds", label="Duration", type="range", default=40, min=10, max=300, step=5, unit="s", description="Active injection duration")
            ],
            expected_impact_chain=["payment-service", "order-service", "api"],
            observable_effects=["TCP retransmission rate", "HTTP 502/504 errors", "Degraded throughput"]
        ))

        # 5. Service Crash / Pause
        self.register(ScenarioDefinition(
            id="service_crash",
            name="Service Crash / Availability Outage",
            category="application",
            description="Simulates unexpected container crash or SIGSTOP pause, triggering immediate connection refusal.",
            default_target="auth-service",
            allowed_targets=["auth-service", "payment-service", "notification-service", "redis"],
            parameters=[
                ScenarioParameter(name="duration_seconds", label="Downtime Duration", type="range", default=30, min=10, max=180, step=5, unit="s", description="Length of service outage before restart")
            ],
            expected_impact_chain=["auth-service", "api", "nginx"],
            observable_effects=["100% error rate on target", "Circuit breaker trip on caller", "Immediate HTTP 503 Service Unavailable"]
        ))

        # 6. Slow Database Cascade
        self.register(ScenarioDefinition(
            id="slow_database",
            name="Slow Database Query Cascade",
            category="application",
            description="Injects synthetic query locks on PostgreSQL, starving caller connection pools on order and catalog services and stalling API router threads.",
            default_target="postgres",
            allowed_targets=["postgres"],
            parameters=[
                ScenarioParameter(name="query_delay_ms", label="Query Stall Delay", type="range", default=300, min=50, max=2000, step=50, unit="ms", description="Database response latency delay"),
                ScenarioParameter(name="pool_saturation", label="Pool Saturation Target", type="range", default=95, min=50, max=100, step=5, unit="%", description="Target pool connection exhaustion"),
                ScenarioParameter(name="duration_seconds", label="Duration", type="range", default=60, min=15, max=300, step=5, unit="s", description="Active fault duration")
            ],
            expected_impact_chain=["postgres", "order-service", "catalog-service", "api", "nginx"],
            observable_effects=["Database active connections maxed", "Caller connection pool queue wait > 200ms", "Upstream API degradation", "Gateway 504 timeouts"]
        ))

        # 7. Cache Failure & Eviction Storm
        self.register(ScenarioDefinition(
            id="cache_failure",
            name="Cache Eviction Storm & Miss Spike",
            category="application",
            description="Flushes Redis cache keys or injects cache connection stalls, forcing 100% database read fallback.",
            default_target="redis",
            allowed_targets=["redis"],
            parameters=[
                ScenarioParameter(name="intensity", label="Eviction Rate", type="range", default=100, min=50, max=100, step=10, unit="%", description="Cache miss rate induced"),
                ScenarioParameter(name="duration_seconds", label="Duration", type="range", default=45, min=10, max=300, step=5, unit="s", description="Duration of cache bypass")
            ],
            expected_impact_chain=["redis", "catalog-service", "postgres"],
            observable_effects=["100% Redis cache misses", "Database query QPS doubles", "Catalog latency increases from 6ms to 55ms"]
        ))

        # 8. Ingress Traffic Spike
        self.register(ScenarioDefinition(
            id="traffic_spike",
            name="Ingress Traffic Spike & Overload",
            category="composite",
            description="Surges ingress client requests by 4x baseline load, saturating Nginx worker connections and triggering backpressure.",
            default_target="nginx",
            allowed_targets=["nginx", "api"],
            parameters=[
                ScenarioParameter(name="rate_multiplier", label="Traffic Multiplier", type="range", default=4, min=2, max=10, step=1, unit="x", description="Multiplier over baseline 45 QPS"),
                ScenarioParameter(name="duration_seconds", label="Duration", type="range", default=40, min=10, max=180, step=5, unit="s", description="Spike surge window")
            ],
            expected_impact_chain=["nginx", "api", "auth-service", "catalog-service", "order-service"],
            observable_effects=["Ingress QPS surge to 180 QPS", "Nginx CPU spike", "HTTP 429 Too Many Requests / 503"]
        ))

        # 9. Retry Storm Amplification
        self.register(ScenarioDefinition(
            id="retry_storm",
            name="Retry Storm Amplification",
            category="composite",
            description="Induces temporary payment failures with aggressive client retries (5x exponential retries without jitter), amplifying upstream connection pressure.",
            default_target="payment-service",
            allowed_targets=["payment-service", "order-service"],
            parameters=[
                ScenarioParameter(name="retry_multiplier", label="Retry Amplification", type="range", default=4, min=2, max=6, step=1, unit="x", description="Request amplification factor"),
                ScenarioParameter(name="duration_seconds", label="Duration", type="range", default=45, min=15, max=180, step=5, unit="s", description="Storm duration")
            ],
            expected_impact_chain=["payment-service", "order-service", "api"],
            observable_effects=["Order service thread starvation", "300% surge in outbound payment requests", "Cascading gateway timeout"]
        ))

        # 10. Queue Backpressure & Backlog
        self.register(ScenarioDefinition(
            id="queue_backlog",
            name="Message Queue Backpressure & Backlog",
            category="composite",
            description="Stalls notification worker consumption while orders continue to queue events, inflating queue backlog buffer.",
            default_target="queue",
            allowed_targets=["queue"],
            parameters=[
                ScenarioParameter(name="arrival_qps", label="Event Arrival Rate", type="range", default=30, min=10, max=80, step=5, unit="msg/s", description="Incoming message publish rate"),
                ScenarioParameter(name="duration_seconds", label="Duration", type="range", default=50, min=15, max=300, step=5, unit="s", description="Worker stall duration")
            ],
            expected_impact_chain=["queue", "notification-service"],
            observable_effects=["Queue depth grows from 0 to 1,500 messages", "Notification delay > 180ms", "Memory buffer growth on broker"]
        ))

    def register(self, scenario: ScenarioDefinition):
        self._scenarios[scenario.id] = scenario

    def get(self, scenario_id: str) -> Optional[ScenarioDefinition]:
        return self._scenarios.get(scenario_id)

    def list_all(self) -> List[ScenarioDefinition]:
        return list(self._scenarios.values())

    def get_expected_chain(self, scenario_id: str, target: str) -> List[str]:
        # Dynamic topology blast paths for OSCAR microservice architecture
        service_blast_paths = {
            "redis": ["redis", "catalog-service", "api", "nginx"],
            "postgres": ["postgres", "order-service", "catalog-service", "api", "nginx"],
            "payment-service": ["payment-service", "order-service", "api", "nginx"],
            "auth-service": ["auth-service", "api", "nginx"],
            "catalog-service": ["catalog-service", "api", "nginx"],
            "order-service": ["order-service", "api", "nginx"],
            "queue": ["queue", "order-service", "notification-service"],
            "api": ["api", "nginx"],
            "nginx": ["nginx", "client"],
            "notification-service": ["notification-service", "queue"],
            "client": ["client", "nginx"]
        }
        if target in service_blast_paths:
            return list(service_blast_paths[target])

        scenario = self.get(scenario_id)
        if scenario:
            chain = list(scenario.expected_impact_chain)
            if target not in chain:
                chain.insert(0, target)
            return chain
        return [target]

scenario_registry = ScenarioRegistry()
