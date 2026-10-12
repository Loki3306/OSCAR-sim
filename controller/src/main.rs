mod cli;
mod models;
mod targets;
mod faults;
mod experiment;
mod events;
mod safety;

use clap::Parser;
use cli::{Cli, Commands, FaultCommands, ExperimentCommands};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let cli = Cli::parse();

    match &cli.command {
        Commands::Fault { action } => {
            match action {
                FaultCommands::List => {
                    println!("Available faults: cpu_stress, memory_spike, disk_io, network_delay, packet_loss, container_pause, container_kill");
                }
                FaultCommands::Validate { fault_type, target } => {
                    println!("Validating fault '{}' against target '{}'...", fault_type, target);
                    let resolver = targets::resolver::TargetResolver::new()?;
                    let container_id = resolver.resolve(&target).await?;
                    println!("Successfully resolved '{}' to container ID: {}", target, container_id);
                }
                FaultCommands::Run { fault_type, target, duration } => {
                    println!("Running fault '{}' against '{}' for '{}'...", fault_type, target, duration);
                    
                    let resolver = targets::resolver::TargetResolver::new()?;
                    let container_id = resolver.resolve(&target).await?;
                    
                    // Parse fault type
                    let ftype: models::FaultType = serde_json::from_str(&format!("\"{}\"", fault_type))?;
                    
                    use faults::executor::FaultExecutor;
                    let executor: Box<dyn FaultExecutor> = match ftype {
                        models::FaultType::ContainerPause | models::FaultType::ContainerKill => {
                            Box::new(faults::docker::DockerExecutor::new(container_id.clone(), ftype)?)
                        }
                        models::FaultType::NetworkDelay | models::FaultType::PacketLoss => {
                            Box::new(faults::pumba::PumbaExecutor::new(container_id.clone(), ftype, None)?)
                        }
                        models::FaultType::CpuStress | models::FaultType::MemorySpike | models::FaultType::DiskIo => {
                            Box::new(faults::stress_ng::StressNgExecutor::new(container_id.clone(), ftype, None)?)
                        }
                    };
                    
                    println!("Starting fault...");
                    executor.start().await?;
                    
                    println!("Status: {}", executor.status().await?);
                    
                    let secs: u64 = duration.trim_end_matches('s').parse().unwrap_or(10);
                    println!("Waiting {} seconds...", secs);
                    tokio::time::sleep(tokio::time::Duration::from_secs(secs)).await;
                    
                    println!("Stopping fault...");
                    executor.stop().await?;
                    
                    println!("Fault complete.");
                }
            }
        }
        Commands::Experiment { action } => {
            match action {
                ExperimentCommands::Run { path } => {
                    println!("Running experiment from: {}", path);
                    
                    let yaml_content = std::fs::read_to_string(&path)
                        .unwrap_or_else(|e| panic!("Failed to read YAML file {}: {}", path, e));
                        
                    let experiment: models::Experiment = serde_yaml::from_str(&yaml_content)
                        .unwrap_or_else(|e| panic!("Failed to parse YAML: {}", e));
                        
                    println!("Parsed experiment: {}", experiment.name);
                    
                    let mut runner = experiment::runner::ExperimentRunner::new(experiment)?;
                    runner.run().await?;
                }
            }
        }
    }

    Ok(())
}
