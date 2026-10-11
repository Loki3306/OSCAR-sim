import time
import httpx
from fastapi import APIRouter, Query
from typing import Optional, List

from server.config import PROMETHEUS_URL
from server.models import MetricsQueryResponse, MetricSeries, MetricDataPoint
from server.services.sim_service import sim_service

router = APIRouter(prefix="/api/metrics", tags=["Metrics & Observability"])

@router.get("/query", response_model=MetricsQueryResponse)
def query_metrics(
    service: Optional[str] = Query(None),
    metric: Optional[str] = Query("cpu"),
    window_minutes: int = Query(15)
):
    """Queries Prometheus or returns generated/replayed telemetry for the requested service."""
    now = time.time()
    start = now - (window_minutes * 60)
    
    # Check if Prometheus is live
    health = sim_service.check_system_health()
    
    if health.prometheus_available:
        try:
            # Query real Prometheus query_range
            query_str = f'rate(container_cpu_usage_seconds_total{{container_label_io_kubernetes_container_name="{service}"}}[1m])' if metric == "cpu" else f'http_requests_total{{job="{service}"}}'
            resp = httpx.get(
                f"{PROMETHEUS_URL}/api/v1/query_range",
                params={"query": query_str, "start": start, "end": now, "step": "15s"},
                timeout=2.0
            )
            if resp.status_code == 200:
                data = resp.json().get("data", {}).get("result", [])
                series_list = []
                for item in data:
                    metric_labels = item.get("metric", {})
                    sname = metric_labels.get("container_label_io_kubernetes_container_name") or service or "unknown"
                    pts = [MetricDataPoint(timestamp=float(p[0]), value=float(p[1])) for p in item.get("values", [])]
                    series_list.append(MetricSeries(
                        metric_name=metric,
                        service=sname,
                        values=pts,
                        unit="%" if metric == "cpu" else "ops"
                    ))
                if series_list:
                    return MetricsQueryResponse(
                        series=series_list,
                        time_range_start=str(start),
                        time_range_end=str(now),
                        source="Prometheus (Live)"
                    )
        except Exception:
            pass

    # Deterministic simulation / replay curve
    services_to_query = [service] if service else ["nginx", "api", "postgres", "redis"]
    series_list = []
    
    # Generate 30 smooth points over the window
    timestamps = [start + i * ((now - start) / 30) for i in range(30)]
    faulted_services = [f["target_service"] for f in sim_service.active_faults.values() if f["status"] == "RUNNING"]

    for s in services_to_query:
        pts = []
        is_fault = (s in faulted_services)
        for idx, t in enumerate(timestamps):
            if metric == "cpu":
                # CPU spike on fault target
                base = 85.0 + (idx % 5) if is_fault and idx > 15 else (12.0 + (idx % 3))
                unit = "%"
            elif metric == "memory":
                base = 512.0 + (idx * 2) if is_fault and idx > 15 else 128.0
                unit = "MB"
            elif metric == "latency":
                # Latency spikes on caller services (API, Nginx) during Postgres fault
                base = 240.0 + (idx % 15) if (is_fault or s in ["api", "nginx"]) and idx > 15 else 8.5
                unit = "ms"
            else:
                base = 45.0 + (idx % 4)
                unit = "req/s"
            pts.append(MetricDataPoint(timestamp=t, value=float(base)))

        series_list.append(MetricSeries(
            metric_name=metric,
            service=s,
            values=pts,
            unit=unit
        ))

    return MetricsQueryResponse(
        series=series_list,
        time_range_start=str(start),
        time_range_end=str(now),
        source="Telemetry Replay Cache (Simulated)"
    )
