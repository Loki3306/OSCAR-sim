use anyhow::{Context, Result};
use std::time::Duration;
use tokio::time::sleep;
use tracing::{info, warn};
use tokio::process::Command;

use crate::models::{Experiment, FaultType};
use crate::targets::resolver::TargetResolver;
use crate::faults::executor::FaultExecutor;
use crate::events::writer::{EventWriter, ExecutionEvent};
use crate::safety::limits::SafetyValidator;

pub struct ExperimentRunner {
    experiment: Experiment,
    event_writer: EventWriter,
}

impl ExperimentRunner {
    pub fn new(experiment: Experiment) -> Result<Self> {
        let event_writer = EventWriter::new(&experiment.name)?;
        Ok(Self { experiment, event_writer })
    }

    pub async fn run(&mut self) -> Result<()> {
        let exp_id = format!("EXP-{}", chrono::Utc::now().timestamp());
        
        // 1. Validation & Safety
        SafetyValidator::validate(&self.experiment)?;

        info!("Starting Experiment: {} ({})", self.experiment.name, exp_id);
        self.event_writer.record(ExecutionEvent::ExperimentStarted {
            experiment_id: exp_id.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }).await?;

        // 2. Start Workload (Phase 2 Integration)
        info!("Starting workload profile: {}", self.experiment.workload.profile);
        let mut workload_process = Command::new("powershell.exe")
            .args(&[
                "-ExecutionPolicy", "Bypass",
                "-File", "../scripts/run_workload.ps1", // Assuming running from controller/
                "-WorkloadName", &self.experiment.workload.profile
            ])
            .spawn()
            .context("Failed to spawn Phase 2 workload script")?;

        self.event_writer.record(ExecutionEvent::WorkloadStarted {
            experiment_id: exp_id.clone(),
            profile: self.experiment.workload.profile.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }).await?;

        // 3. Baseline
        let baseline_secs = parse_duration(&self.experiment.phases.baseline)?;
        info!("Observing baseline for {} seconds...", baseline_secs);
        self.event_writer.record(ExecutionEvent::BaselineStarted {
            experiment_id: exp_id.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }).await?;
        sleep(Duration::from_secs(baseline_secs)).await;

        // 4. Fault Injection
        let fault_secs = parse_duration(&self.experiment.phases.fault)?;
        let target_name = &self.experiment.fault.target;
        
        info!("Resolving target: {}", target_name);
        let resolver = TargetResolver::new()?;
        let container_id = resolver.resolve(target_name).await?;
        
        let fault_id = format!("FAULT-{}", chrono::Utc::now().timestamp());
        
        let executor: Box<dyn FaultExecutor> = match self.experiment.fault.fault_type {
            FaultType::CpuStress | FaultType::MemorySpike | FaultType::DiskIo => {
                Box::new(crate::faults::stress_ng::StressNgExecutor::new(
                    container_id, 
                    self.experiment.fault.fault_type.clone(), 
                    self.experiment.fault.parameters.clone()
                )?)
            }
            FaultType::ContainerPause | FaultType::ContainerKill => {
                Box::new(crate::faults::docker::DockerExecutor::new(
                    container_id, 
                    self.experiment.fault.fault_type.clone()
                )?)
            }
            FaultType::NetworkDelay | FaultType::PacketLoss => {
                Box::new(crate::faults::pumba::PumbaExecutor::new(
                    container_id, 
                    self.experiment.fault.fault_type.clone(),
                    self.experiment.fault.parameters.clone()
                )?)
            }
        };

        self.event_writer.record(ExecutionEvent::FaultRequested {
            experiment_id: exp_id.clone(),
            fault_id: fault_id.clone(),
            fault_type: format!("{:?}", self.experiment.fault.fault_type),
            target: target_name.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }).await?;

        info!("Starting fault: {:?}", self.experiment.fault.fault_type);
        executor.start().await?;
        
        self.event_writer.record(ExecutionEvent::FaultStarted {
            experiment_id: exp_id.clone(),
            fault_id: fault_id.clone(),
            fault_type: format!("{:?}", self.experiment.fault.fault_type),
            target: target_name.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }).await?;

        info!("Fault active for {} seconds...", fault_secs);
        sleep(Duration::from_secs(fault_secs)).await;

        info!("Stopping fault...");
        executor.stop().await?;

        self.event_writer.record(ExecutionEvent::FaultStopped {
            experiment_id: exp_id.clone(),
            fault_id: fault_id.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }).await?;

        // 5. Recovery
        let recovery_secs = parse_duration(&self.experiment.phases.recovery)?;
        info!("Observing recovery for {} seconds...", recovery_secs);
        self.event_writer.record(ExecutionEvent::RecoveryStarted {
            experiment_id: exp_id.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }).await?;
        sleep(Duration::from_secs(recovery_secs)).await;

        // Cleanup Workload
        info!("Stopping workload...");
        if let Err(e) = workload_process.kill().await {
            warn!("Failed to kill workload process: {}", e);
        }

        self.event_writer.record(ExecutionEvent::ExperimentCompleted {
            experiment_id: exp_id.clone(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }).await?;

        info!("Experiment {} completed successfully.", exp_id);
        Ok(())
    }
}

pub fn parse_duration(s: &str) -> Result<u64> {
    if s.ends_with('s') {
        let secs = s.trim_end_matches('s').parse::<u64>()?;
        Ok(secs)
    } else {
        anyhow::bail!("Unsupported duration format. Use 's' suffix (e.g., '60s')")
    }
}
