use deadpool_redis::{Config, Runtime, Pool};
use redis::AsyncCommands;
use std::env;
use tracing::info;
use crate::metrics;
use crate::db::User;
use uuid::Uuid;

pub fn init_pool() -> Pool {
    let redis_url = env::var("REDIS_URL").expect("CRITICAL ERROR: REDIS_URL must be set");
    
    info!("Connecting to Redis...");
    let cfg = Config::from_url(redis_url);
    let pool = cfg.create_pool(Some(Runtime::Tokio1)).expect("Failed to create Redis pool");
    
    metrics::registry::ACTIVE_CONNECTIONS.with_label_values(&["redis"]).set(10);
    
    info!("Redis initialized successfully.");
    pool
}

pub async fn get_cached_user(pool: &Pool, id: &Uuid) -> Option<User> {
    let mut conn = match pool.get().await {
        Ok(conn) => conn,
        Err(e) => {
            tracing::error!("Redis connection error: {}", e);
            metrics::registry::CACHE_MISSES_TOTAL.inc();
            return None;
        }
    };
    
    let key = format!("user:{}", id);
    let result: redis::RedisResult<Option<String>> = conn.get(&key).await;
    
    match result {
        Ok(Some(json_str)) => {
            metrics::registry::CACHE_HITS_TOTAL.inc();
            serde_json::from_str(&json_str).ok()
        },
        Ok(None) => {
            metrics::registry::CACHE_MISSES_TOTAL.inc();
            None
        },
        Err(e) => {
            tracing::error!("Redis query error: {}", e);
            metrics::registry::CACHE_MISSES_TOTAL.inc();
            None
        }
    }
}

pub async fn cache_user(pool: &Pool, user: &User) {
    let mut conn = match pool.get().await {
        Ok(conn) => conn,
        Err(_) => return,
    };
    
    let key = format!("user:{}", user.id);
    if let Ok(json_str) = serde_json::to_string(user) {
        // Cache for 60 seconds
        let _: redis::RedisResult<()> = conn.set_ex(&key, json_str, 60).await;
    }
}
