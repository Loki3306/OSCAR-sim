use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FaultType {
    #[serde(rename = "cpu_stress")]
    CpuStress,
    #[serde(rename = "memory_spike")]
    MemorySpike,
    #[serde(rename = "disk_io")]
    DiskIo,
    #[serde(rename = "network_delay")]
    NetworkDelay,
    #[serde(rename = "packet_loss")]
    PacketLoss,
    #[serde(rename = "container_pause")]
    ContainerPause,
    #[serde(rename = "container_kill")]
    ContainerKill,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FaultParameters {
    pub workers: Option<u32>,
    pub load: Option<u32>,     // % load
    pub delay_ms: Option<u32>,
    pub loss_percent: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Fault {
    #[serde(rename = "type")]
    pub fault_type: FaultType,
    pub target: String,
    pub parameters: Option<FaultParameters>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperimentPhases {
    pub baseline: String,
    pub fault: String,
    pub recovery: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkloadDef {
    pub profile: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Experiment {
    pub name: String,
    pub workload: WorkloadDef,
    pub phases: ExperimentPhases,
    pub fault: Fault,
}
