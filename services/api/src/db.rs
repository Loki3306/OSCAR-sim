use sqlx::{postgres::PgPoolOptions, PgPool};
use std::env;
use tracing::info;
use crate::metrics;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub async fn init_pool() -> PgPool {
    let database_url = env::var("DATABASE_URL").expect("CRITICAL ERROR: DATABASE_URL must be set");
    
    info!("Connecting to Postgres...");
    
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&database_url)
        .await
        .expect("Failed to connect to Postgres");
        
    metrics::registry::ACTIVE_CONNECTIONS.with_label_values(&["postgres"]).set(20);
    
    // Run database migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");
    
    info!("Postgres initialized successfully.");
    pool
}

#[derive(Serialize, Deserialize, Debug, Clone, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub name: String,
    pub email: String,
}

pub async fn insert_user(pool: &PgPool, user: &User) -> Result<(), sqlx::Error> {
    metrics::registry::POSTGRES_QUERIES_TOTAL.with_label_values(&["INSERT", "users"]).inc();
    let start_time = std::time::Instant::now();
    
    let result = sqlx::query("INSERT INTO users (id, name, email) VALUES ($1, $2, $3)")
        .bind(user.id)
        .bind(&user.name)
        .bind(&user.email)
        .execute(pool)
        .await;
        
    metrics::registry::POSTGRES_QUERY_DURATION_SECONDS
        .with_label_values(&["INSERT", "users"])
        .observe(start_time.elapsed().as_secs_f64());
        
    result?;
    Ok(())
}

pub async fn get_user(pool: &PgPool, id: Uuid) -> Result<Option<User>, sqlx::Error> {
    metrics::registry::POSTGRES_QUERIES_TOTAL.with_label_values(&["SELECT", "users"]).inc();
    let start_time = std::time::Instant::now();
    
    let result = sqlx::query_as::<_, User>("SELECT id, name, email FROM users WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await;
        
    metrics::registry::POSTGRES_QUERY_DURATION_SECONDS
        .with_label_values(&["SELECT", "users"])
        .observe(start_time.elapsed().as_secs_f64());
        
    result
}

pub async fn get_all_users(pool: &PgPool) -> Result<Vec<User>, sqlx::Error> {
    metrics::registry::POSTGRES_QUERIES_TOTAL.with_label_values(&["SELECT", "users"]).inc();
    let start_time = std::time::Instant::now();
    
    let result = sqlx::query_as::<_, User>("SELECT id, name, email FROM users")
        .fetch_all(pool)
        .await;
        
    metrics::registry::POSTGRES_QUERY_DURATION_SECONDS
        .with_label_values(&["SELECT", "users"])
        .observe(start_time.elapsed().as_secs_f64());
        
    result
}
