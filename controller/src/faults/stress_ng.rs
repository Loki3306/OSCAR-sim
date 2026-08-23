use anyhow::{Context, Result};
use async_trait::async_trait;
use tracing::info;
use bollard::Docker;
use bollard::models::{ContainerCreateBody, HostConfig};
use bollard::query_parameters::{CreateContainerOptionsBuilder, RemoveContainerOptionsBuilder, StartContainerOptions};

use crate::faults::executor::FaultExecutor;
use crate::models::{FaultType, FaultParameters};

pub struct StressNgExecutor {
    docker: Docker,
    container_id: String,
    fault_type: FaultType,
    params: Option<FaultParameters>,
}

impl StressNgExecutor {
    pub fn new(container_id: String, fault_type: FaultType, params: Option<FaultParameters>) -> Result<Self> {
        let docker = Docker::connect_with_local_defaults()
            .context("Failed to connect to local Docker daemon")?;
        Ok(Self {
            docker,
            container_id,
            fault_type,
            params,
        })
    }
}

#[async_trait]
impl FaultExecutor for StressNgExecutor {
    async fn start(&self) -> Result<()> {
        let stress_container_name = format!("stress_{}", self.container_id.chars().take(12).collect::<String>());
        
        info!("Starting stress-ng fault container: {}", stress_container_name);
        
        let workers = self.params.as_ref().and_then(|p| p.workers).unwrap_or(2);
        let load = self.params.as_ref().and_then(|p| p.load).unwrap_or(80);

        let mut cmd_args = vec![];
        match self.fault_type {
            FaultType::CpuStress => {
                cmd_args.push("--cpu".to_string());
                cmd_args.push(workers.to_string());
                cmd_args.push("--cpu-load".to_string());
                cmd_args.push(load.to_string());
            }
            FaultType::MemorySpike => {
                cmd_args.push("--vm".to_string());
                cmd_args.push(workers.to_string());
                cmd_args.push("--vm-bytes".to_string());
                cmd_args.push("256M".to_string());
            }
            FaultType::DiskIo => {
                cmd_args.push("--hdd".to_string());
                cmd_args.push(workers.to_string());
            }
            _ => anyhow::bail!("Unsupported fault type for stress-ng"),
        }
        
        // Timeout ensures it dies eventually if we fail to kill it
        cmd_args.push("--timeout".to_string());
        cmd_args.push("600s".to_string());

        let options = CreateContainerOptionsBuilder::default()
            .name(&stress_container_name)
            .build();

        let config = ContainerCreateBody {
            image: Some("polinux/stress-ng".to_string()),
            cmd: Some(cmd_args),
            host_config: Some(HostConfig {
                pid_mode: Some(format!("container:{}", self.container_id)),
                ..Default::default()
            }),
            ..Default::default()
        };

        // If a previous run panicked and left it behind, attempt a silent clean up first.
        let remove_options = Some(RemoveContainerOptionsBuilder::default().force(true).build());
        let _ = self.docker.remove_container(&stress_container_name, remove_options).await;

        self.docker.create_container(Some(options), config).await
            .context("Failed to create stress-ng container via bollard")?;
            
        self.docker.start_container(&stress_container_name, None::<StartContainerOptions>).await
            .context("Failed to start stress-ng container via bollard")?;

        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        let stress_container_name = format!("stress_{}", self.container_id.chars().take(12).collect::<String>());
        info!("Stopping stress-ng fault container: {}", stress_container_name);
        
        let remove_options = Some(RemoveContainerOptionsBuilder::default().force(true).build());
        
        if let Err(e) = self.docker.remove_container(&stress_container_name, remove_options).await {
            tracing::warn!("Failed to cleanly remove stress-ng container: {}", e);
        }

        Ok(())
    }

    async fn status(&self) -> Result<String> {
        Ok("Active".to_string())
    }
}
