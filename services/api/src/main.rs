mod metrics;

use axum::{
    extract::{MatchedPath, Request},
    middleware::{self, Next},
    response::Response,
    routing::get,
    Json, Router,
};
use prometheus::Encoder;
use serde::Serialize;
use std::env;
use std::time::Instant;
use tracing::info;
use tracing_subscriber::EnvFilter;

#[derive(Serialize)]
struct RootResponse {
    service: String,
    status: String,
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
}

async fn root() -> Json<RootResponse> {
    Json(RootResponse {
        service: "oscar-sim-api".to_string(),
        status: "running".to_string(),
    })
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
    })
}

async fn metrics_handler() -> String {
    let encoder = prometheus::TextEncoder::new();
    let mut buffer = vec![];
    encoder
        .encode(&metrics::registry::REGISTRY.gather(), &mut buffer)
        .unwrap();
    String::from_utf8(buffer).unwrap()
}

async fn track_metrics(req: Request, next: Next) -> Response {
    let path = if let Some(matched_path) = req.extensions().get::<MatchedPath>() {
        matched_path.as_str().to_owned()
    } else {
        req.uri().path().to_owned()
    };

    // EXCLUDE /metrics from instrumentation so we don't measure Prometheus scraping itself
    if path == "/metrics" {
        return next.run(req).await;
    }

    let method = req.method().clone().to_string();

    // Prevent cardinality explosion on unmatched/dynamic 404 paths
    let path = if req.extensions().get::<MatchedPath>().is_none() {
        "UNMATCHED_ROUTE".to_string()
    } else {
        path
    };

    metrics::registry::ACTIVE_REQUESTS.inc();
    let start = Instant::now();

    let response = next.run(req).await;

    let duration = start.elapsed().as_secs_f64();
    let status = response.status().as_u16().to_string();

    metrics::registry::ACTIVE_REQUESTS.dec();
    metrics::registry::HTTP_REQUEST_DURATION_SECONDS
        .with_label_values(&[&method, &path, &status])
        .observe(duration);
    metrics::registry::HTTP_REQUESTS_TOTAL
        .with_label_values(&[&method, &path, &status])
        .inc();

    response
}

#[tokio::main]
async fn main() {
    // Initialize tracing for production-grade logging
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("info".parse().unwrap()))
        .init();

    // Register Prometheus metrics
    metrics::registry::register_custom_metrics();

    // Build our application with the requested routes and metrics middleware
    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health))
        .route("/metrics", get(metrics_handler))
        .layer(middleware::from_fn(track_metrics));

    // Resolve port strictly from environment variable; fail fast if missing
    let port = env::var("API_PORT").expect("CRITICAL ERROR: API_PORT environment variable must be set");
    let addr = format!("0.0.0.0:{}", port);
    
    info!("Starting oscar-sim-api on {}", addr);
    
    // Bind the listener and start the server
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
