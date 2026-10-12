use anyhow::{Context, Result};
use bollard::Docker;
use bollard::query_parameters::ListContainersOptions;
use std::collections::HashMap;

pub struct TargetResolver {
    docker: Docker,
}

impl TargetResolver {
    pub fn new() -> Result<Self> {
        let docker = Docker::connect_with_local_defaults()
            .context("Failed to connect to local Docker daemon")?;
        Ok(Self { docker })
    }

    /// Resolves a logical target (e.g. "api", "postgres") to an actual Docker Container ID.
    pub async fn resolve(&self, logical_name: &str) -> Result<String> {
        // Query docker daemon for containers
        let mut filters = HashMap::new();
        // The compose service name label is what we use in Phase 1.5/2
        filters.insert(
            "label".to_string(),
            vec![format!("com.docker.compose.service={}", logical_name)],
        );

        let options = Some(ListContainersOptions {
            all: true,
            filters: Some(filters),
            ..Default::default()
        });

        let containers = self.docker.list_containers(options).await?;
        
        if containers.is_empty() {
            // Fallback: search by container name substring if label fails
            let all_options = Some(ListContainersOptions {
                all: true,
                ..Default::default()
            });
            let all_containers = self.docker.list_containers(all_options).await?;
            for c in all_containers {
                if let Some(names) = c.names {
                    if names.iter().any(|n| n.contains(logical_name)) {
                        return Ok(c.id.unwrap_or_default());
                    }
                }
            }
            anyhow::bail!("No running container found for logical target: {}", logical_name);
        }

        let container = containers.first().unwrap();
        let id = container.id.clone().context("Container missing ID")?;
        
        Ok(id)
    }
}
