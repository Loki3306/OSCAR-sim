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

pub fn register_custom_metrics() {
    // Forcing evaluation of the Lazy instances ensures they are registered
    // with the global registry on startup before handling traffic.
    Lazy::force(&HTTP_REQUESTS_TOTAL);
    Lazy::force(&HTTP_REQUEST_DURATION_SECONDS);
    Lazy::force(&ACTIVE_REQUESTS);
}
