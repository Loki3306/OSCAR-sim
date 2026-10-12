use anyhow::{Context, Result};
use async_trait::async_trait;
use tracing::info;
use bollard::Docker;
use bollard::models::{ContainerCreateBody, HostConfig};
use bollard::query_parameters::{CreateContainerOptionsBuilder, RemoveContainerOptionsBuilder, StartContainerOptions};

use crate::faults::executor::FaultExecutor;
use crate::models::{FaultType, FaultParameters};

pub struct PumbaExecutor {
    docker: Docker,
    container_id: String,
    fault_type: FaultType,
    params: Option<FaultParameters>,
}

impl PumbaExecutor {
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
impl FaultExecutor for PumbaExecutor {
    async fn start(&self) -> Result<()> {
        let pumba_container_name = format!("pumba_{}", self.container_id.chars().take(12).collect::<String>());
        
        info!("Starting Pumba fault container: {}", pumba_container_name);
        
        let mut cmd_args = vec![
            "netem".to_string(), 
            "--duration".to_string(), "10m".to_string()
        ];

        match self.fault_type {
            FaultType::NetworkDelay => {
                let delay = self.params.as_ref().and_then(|p| p.delay_ms).unwrap_or(100);
                cmd_args.push("delay".to_string());
                cmd_args.push("--time".to_string());
                cmd_args.push(delay.to_string());
            }
            FaultType::PacketLoss => {
                let loss = self.params.as_ref().and_then(|p| p.loss_percent).unwrap_or(10.0);
                cmd_args.push("loss".to_string());
                cmd_args.push("--percent".to_string());
                cmd_args.push(loss.to_string());
            }
            _ => anyhow::bail!("Unsupported fault type for Pumba"),
        }

        cmd_args.push(self.container_id.clone());

        let options = CreateContainerOptionsBuilder::default()
            .name(&pumba_container_name)
            .build();

        let config = ContainerCreateBody {
            image: Some("gaiaadm/pumba".to_string()),
            cmd: Some(cmd_args),
            host_config: Some(HostConfig {
                binds: Some(vec!["/var/run/docker.sock:/var/run/docker.sock".to_string()]),
                ..Default::default()
            }),
            ..Default::default()
        };

        // Clean up from potential previous runs
        let remove_options = Some(RemoveContainerOptionsBuilder::default().force(true).build());
        let _ = self.docker.remove_container(&pumba_container_name, remove_options).await;

        self.docker.create_container(Some(options), config).await
            .context("Failed to create pumba container via bollard")?;
            
        self.docker.start_container(&pumba_container_name, None::<StartContainerOptions>).await
            .context("Failed to start pumba container via bollard")?;

        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        let pumba_container_name = format!("pumba_{}", self.container_id.chars().take(12).collect::<String>());
        info!("Stopping Pumba fault container: {}", pumba_container_name);
        
        let remove_options = Some(RemoveContainerOptionsBuilder::default().force(true).build());
        
        if let Err(e) = self.docker.remove_container(&pumba_container_name, remove_options).await {
            tracing::warn!("Failed to cleanly remove pumba container: {}", e);
        }

        Ok(())
    }

    async fn status(&self) -> Result<String> {
        Ok("Active".to_string())
    }
}
