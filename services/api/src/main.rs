mod metrics;
mod db;
mod cache;
mod routes;

use axum::{
    extract::{MatchedPath, Request},
    middleware::{self, Next},
    response::Response,
    routing::{get, post},
    Json, Router,
};
use prometheus::Encoder;
use serde::Serialize;
use std::env;
use std::time::Instant;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use opentelemetry::KeyValue;
use opentelemetry_sdk::{trace as sdktrace, Resource};
use opentelemetry_otlp::WithExportConfig;

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

    if path == "/metrics" {
        return next.run(req).await;
    }

    let method = req.method().clone().to_string();

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
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    // Configure OTLP exporter
    let tracer = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(
            opentelemetry_otlp::new_exporter()
                .tonic()
                .with_endpoint("http://tempo:4317"),
        )
        .with_trace_config(
            sdktrace::config().with_resource(Resource::new(vec![KeyValue::new(
                "service.name",
                "oscar-sim-api",
            )])),
        )
        .install_batch(opentelemetry_sdk::runtime::Tokio)
        .expect("Failed to initialize OTLP tracer");

    let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);
    let fmt_layer = tracing_subscriber::fmt::layer();

    tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt_layer)
        .with(telemetry)
        .init();

    metrics::registry::register_custom_metrics();

    // Initialize Database and Cache pools
    let db_pool = db::init_pool().await;
    let redis_pool = cache::init_pool();

    let state = routes::AppState {
        db: db_pool,
        redis: redis_pool,
    };

    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health))
        .route("/metrics", get(metrics_handler))
        .route("/users", get(routes::list_users).post(routes::create_user))
        .route("/users/:id", get(routes::get_user))
        .route("/cache", get(routes::get_cache))
        .layer(middleware::from_fn(track_metrics))
        .with_state(state);

    let port = env::var("API_PORT").expect("CRITICAL ERROR: API_PORT environment variable must be set");
    let addr = format!("0.0.0.0:{}", port);
    
    info!("Starting oscar-sim-api on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
