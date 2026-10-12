use anyhow::{Context, Result};
use async_trait::async_trait;
use bollard::Docker;
use tracing::info;

use crate::faults::executor::FaultExecutor;
use crate::models::FaultType;

pub struct DockerExecutor {
    docker: Docker,
    container_id: String,
    fault_type: FaultType,
}

impl DockerExecutor {
    pub fn new(container_id: String, fault_type: FaultType) -> Result<Self> {
        let docker = Docker::connect_with_local_defaults()
            .context("Failed to connect to local Docker daemon")?;
            
        Ok(Self {
            docker,
            container_id,
            fault_type,
        })
    }
}

#[async_trait]
impl FaultExecutor for DockerExecutor {
    async fn start(&self) -> Result<()> {
        match self.fault_type {
            FaultType::ContainerPause => {
                info!("Pausing container: {}", self.container_id);
                self.docker.pause_container(&self.container_id).await?;
            }
            FaultType::ContainerKill => {
                info!("Killing container: {}", self.container_id);
                self.docker.kill_container(&self.container_id, None).await?;
            }
            _ => anyhow::bail!("Unsupported fault type for DockerExecutor"),
        }
        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        match self.fault_type {
            FaultType::ContainerPause => {
                info!("Unpausing container: {}", self.container_id);
                // Unpause the container
                self.docker.unpause_container(&self.container_id).await?;
            }
            FaultType::ContainerKill => {
                info!("Restarting killed container: {}", self.container_id);
                self.docker.start_container(&self.container_id, None).await?;
            }
            _ => anyhow::bail!("Unsupported fault type for DockerExecutor"),
        }
        Ok(())
    }

    async fn status(&self) -> Result<String> {
        let inspect = self.docker.inspect_container(&self.container_id, None).await?;
        if let Some(state) = inspect.state {
            if state.paused.unwrap_or(false) {
                return Ok("Paused".to_string());
            }
            if state.running.unwrap_or(false) {
                return Ok("Running".to_string());
            }
            if state.dead.unwrap_or(false) {
                return Ok("Dead".to_string());
            }
            Ok(format!("{:?}", state.status))
        } else {
            Ok("Unknown".to_string())
        }
    }
}
