use anyhow::Result;
use async_trait::async_trait;

#[async_trait]
pub trait FaultExecutor {
    /// Start the fault injection
    async fn start(&self) -> Result<()>;
    
    /// Stop the fault injection and recover the system
    async fn stop(&self) -> Result<()>;
    
    /// Check the status of the injected fault
    async fn status(&self) -> Result<String>;
}
