use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "event_type")]
pub enum ExecutionEvent {
    #[serde(rename = "experiment_started")]
    ExperimentStarted { experiment_id: String, timestamp: String },
    #[serde(rename = "workload_started")]
    WorkloadStarted { experiment_id: String, profile: String, timestamp: String },
    #[serde(rename = "baseline_started")]
    BaselineStarted { experiment_id: String, timestamp: String },
    #[serde(rename = "fault_requested")]
    FaultRequested { experiment_id: String, fault_id: String, fault_type: String, target: String, timestamp: String },
    #[serde(rename = "fault_started")]
    FaultStarted { experiment_id: String, fault_id: String, fault_type: String, target: String, timestamp: String },
    #[serde(rename = "fault_stopped")]
    FaultStopped { experiment_id: String, fault_id: String, timestamp: String },
    #[serde(rename = "recovery_started")]
    RecoveryStarted { experiment_id: String, timestamp: String },
    #[serde(rename = "experiment_completed")]
    ExperimentCompleted { experiment_id: String, timestamp: String },
}

pub struct EventWriter {
    file_path: PathBuf,
}

impl EventWriter {
    pub fn new(exp_name: &str) -> Result<Self> {
        let timestamp = chrono::Utc::now().format("%Y%m%d-%H%M%S");
        let dir = PathBuf::from(format!("../experiments/metadata/EXP-{}-{}", exp_name, timestamp));
        
        fs::create_dir_all(&dir).context("Failed to create experiment directory")?;
        
        let file_path = dir.join("timeline.jsonl");
        
        Ok(Self { file_path })
    }

    pub async fn record(&self, event: ExecutionEvent) -> Result<()> {
        let json = serde_json::to_string(&event)?;
        
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.file_path)?;
            
        writeln!(file, "{}", json)?;
        Ok(())
    }
}
