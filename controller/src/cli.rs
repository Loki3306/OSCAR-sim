use clap::{Parser, Subcommand};

#[derive(Parser, Debug)]
#[command(name = "oscar-sim")]
#[command(about = "OSCAR-Sim Phase 3 Fault Controller", long_about = None)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Fault management
    Fault {
        #[command(subcommand)]
        action: FaultCommands,
    },
    /// Experiment orchestration
    Experiment {
        #[command(subcommand)]
        action: ExperimentCommands,
    },
}

#[derive(Subcommand, Debug)]
pub enum FaultCommands {
    /// List available fault types
    List,
    /// Validate a fault payload
    Validate {
        #[arg(short, long)]
        fault_type: String,
        #[arg(short, long)]
        target: String,
    },
    /// Run a fault manually
    Run {
        #[arg(short, long)]
        fault_type: String,
        #[arg(short, long)]
        target: String,
        #[arg(short, long)]
        duration: String,
    },
}

#[derive(Subcommand, Debug)]
pub enum ExperimentCommands {
    /// Run a full YAML experiment
    Run {
        /// Path to the experiment.yaml file
        path: String,
    },
}
