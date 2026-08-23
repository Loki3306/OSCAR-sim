use once_cell::sync::Lazy;
use prometheus::{HistogramOpts, HistogramVec, IntCounterVec, IntGauge, Opts, Registry};

pub static REGISTRY: Lazy<Registry> = Lazy::new(Registry::new);

pub static HTTP_REQUESTS_TOTAL: Lazy<IntCounterVec> = Lazy::new(|| {
    let opts = Opts::new("http_requests_total", "Total number of HTTP requests");
    let counter = IntCounterVec::new(opts, &["method", "path", "status"]).unwrap();
    REGISTRY.register(Box::new(counter.clone())).unwrap();
    counter
});

pub static HTTP_REQUEST_DURATION_SECONDS: Lazy<HistogramVec> = Lazy::new(|| {
    let opts = HistogramOpts::new(
        "http_request_duration_seconds",
        "HTTP request duration in seconds",
    );
    let histogram = HistogramVec::new(opts, &["method", "path", "status"]).unwrap();
    REGISTRY.register(Box::new(histogram.clone())).unwrap();
    histogram
});

pub static ACTIVE_REQUESTS: Lazy<IntGauge> = Lazy::new(|| {
    let gauge = IntGauge::new(
        "active_requests",
        "Number of active HTTP requests",
    )
    .unwrap();
    REGISTRY.register(Box::new(gauge.clone())).unwrap();
    gauge
});

pub static CACHE_HITS_TOTAL: Lazy<prometheus::IntCounter> = Lazy::new(|| {
    let counter = prometheus::IntCounter::new("cache_hits_total", "Total number of cache hits").unwrap();
    REGISTRY.register(Box::new(counter.clone())).unwrap();
    counter
});

pub static CACHE_MISSES_TOTAL: Lazy<prometheus::IntCounter> = Lazy::new(|| {
    let counter = prometheus::IntCounter::new("cache_misses_total", "Total number of cache misses").unwrap();
    REGISTRY.register(Box::new(counter.clone())).unwrap();
    counter
});

pub static POSTGRES_QUERIES_TOTAL: Lazy<IntCounterVec> = Lazy::new(|| {
    let opts = Opts::new("postgres_queries_total", "Total number of Postgres queries executed");
    let counter = IntCounterVec::new(opts, &["operation", "table"]).unwrap();
    REGISTRY.register(Box::new(counter.clone())).unwrap();
    counter
});

pub static POSTGRES_QUERY_DURATION_SECONDS: Lazy<HistogramVec> = Lazy::new(|| {
    let opts = HistogramOpts::new(
        "postgres_query_duration_seconds",
        "Postgres query duration in seconds",
    );
    let histogram = HistogramVec::new(opts, &["operation", "table"]).unwrap();
    REGISTRY.register(Box::new(histogram.clone())).unwrap();
    histogram
});

pub static ACTIVE_CONNECTIONS: Lazy<prometheus::IntGaugeVec> = Lazy::new(|| {
    let opts = Opts::new("active_connections", "Number of active database/cache connections");
    let gauge = prometheus::IntGaugeVec::new(opts, &["pool"]).unwrap();
    REGISTRY.register(Box::new(gauge.clone())).unwrap();
    gauge
});

pub fn register_custom_metrics() {
    // Forcing evaluation of the Lazy instances ensures they are registered
    // with the global registry on startup before handling traffic.
    Lazy::force(&HTTP_REQUESTS_TOTAL);
    Lazy::force(&HTTP_REQUEST_DURATION_SECONDS);
    Lazy::force(&ACTIVE_REQUESTS);
    Lazy::force(&CACHE_HITS_TOTAL);
    Lazy::force(&CACHE_MISSES_TOTAL);
    Lazy::force(&POSTGRES_QUERIES_TOTAL);
    Lazy::force(&POSTGRES_QUERY_DURATION_SECONDS);
    Lazy::force(&ACTIVE_CONNECTIONS);
}
