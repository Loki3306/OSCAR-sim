use anyhow::Result;
use crate::models::Experiment;

pub struct SafetyValidator;

impl SafetyValidator {
    pub fn validate(experiment: &Experiment) -> Result<()> {
        // Validation: Maximum duration
        let fault_dur = crate::experiment::runner::parse_duration(&experiment.phases.fault)?;
        if fault_dur > 600 {
            anyhow::bail!("Safety Violation: Fault duration exceeds maximum allowed 600s");
        }

        // Validation: Target constraints
        if experiment.fault.target == "nginx" {
            // we could enforce Nginx is untouchable in some scenarios, but let's allow it for now.
        }

        // Validation: Parameters
        if let Some(params) = &experiment.fault.parameters {
            if let Some(workers) = params.workers {
                if workers > 8 {
                    anyhow::bail!("Safety Violation: Max CPU workers is 8");
                }
            }
            if let Some(load) = params.load {
                if load > 100 {
                    anyhow::bail!("Safety Violation: CPU load cannot exceed 100%");
                }
            }
        }

        Ok(())
    }
}
