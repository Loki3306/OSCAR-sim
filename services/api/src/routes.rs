use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use deadpool_redis::Pool as RedisPool;
use sqlx::PgPool;
use serde::{Deserialize};
use uuid::Uuid;
use tracing::error;
use crate::{cache, db::{self, User}};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: RedisPool,
}

#[derive(Deserialize, Debug)]
pub struct CreateUser {
    pub name: String,
    pub email: String,
}

#[tracing::instrument(skip(state))]
pub async fn create_user(
    State(state): State<AppState>,
    Json(payload): Json<CreateUser>,
) -> impl IntoResponse {
    let user = User {
        id: Uuid::new_v4(),
        name: payload.name,
        email: payload.email,
    };

    match db::insert_user(&state.db, &user).await {
        Ok(_) => {
            // Immediately cache the user after creation
            cache::cache_user(&state.redis, &user).await;
            (StatusCode::CREATED, Json(user)).into_response()
        }
        Err(e) => {
            error!("Failed to insert user: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

#[tracing::instrument(skip(state))]
pub async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // 1. Check Cache
    if let Some(user) = cache::get_cached_user(&state.redis, &id).await {
        return (StatusCode::OK, Json(user)).into_response();
    }

    // 2. Cache Miss -> Check DB
    match db::get_user(&state.db, id).await {
        Ok(Some(user)) => {
            // 3. Cache the result for future hits
            cache::cache_user(&state.redis, &user).await;
            (StatusCode::OK, Json(user)).into_response()
        }
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(e) => {
            error!("Failed to retrieve user: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

#[tracing::instrument(skip(state))]
pub async fn list_users(State(state): State<AppState>) -> impl IntoResponse {
    match db::get_all_users(&state.db).await {
        Ok(users) => (StatusCode::OK, Json(users)).into_response(),
        Err(e) => {
            error!("Failed to retrieve users: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

#[tracing::instrument(skip(state))]
pub async fn get_cache(State(state): State<AppState>) -> impl IntoResponse {
    // Generate cache telemetry by simulating a cache check for a nil UUID
    let dummy_id = Uuid::nil();
    let _ = cache::get_cached_user(&state.redis, &dummy_id).await;
    
    // Attempt a hit by checking an id we just cached (simulate)
    // For simplicity, just return OK to confirm the endpoint works.
    (StatusCode::OK, Json(serde_json::json!({"status": "cache telemetry generated"}))).into_response()
}
