param (
    [Parameter(Mandatory=$true)]
    [string]$WorkloadName,
    
    [string]$TargetUrl = "http://nginx:80"
)

$ErrorActionPreference = "Stop"

# Paths
$ScriptRoot = $PSScriptRoot
$RepoRoot = Split-Path $ScriptRoot -Parent
$MetadataDir = Join-Path $RepoRoot "experiments/metadata"

# Validate Workload
$ValidWorkloads = @("baseline", "normal", "load", "sustained", "spike", "burst")
if ($WorkloadName -notin $ValidWorkloads) {
    Write-Error "Invalid workload name. Must be one of: $($ValidWorkloads -join ', ')"
}

$ScenarioPath = "workloads/scenarios/$WorkloadName.js"
if (-not (Test-Path (Join-Path $RepoRoot $ScenarioPath))) {
    Write-Error "Scenario file not found: $ScenarioPath"
}

# Generate Metadata
$StartTime = (Get-Date).ToUniversalTime()
$ExpId = "exp-" + $StartTime.ToString("yyyyMMdd-HHmmss")
$MetadataFile = Join-Path $MetadataDir "$ExpId.json"

$Metadata = @{
    experiment_id = $ExpId
    workload = @{
        name = $WorkloadName
        profile_version = "1.0"
    }
    start_time = $StartTime.ToString("o")
    status = "running"
}

$Metadata | ConvertTo-Json | Out-File $MetadataFile

Write-Host "Starting workload: $WorkloadName (Experiment ID: $ExpId)"

# Run k6 via Docker
# Using the host network isn't needed if we attach to oscar_sim_net
# TargetUrl points to nginx directly inside the docker network.
$DockerCmd = "docker run --rm -i --network oscar_simulation_oscar_sim_net -e TARGET_URL=$TargetUrl -v ${RepoRoot}/workloads:/workloads grafana/k6 run /workloads/scenarios/$WorkloadName.js"

Write-Host "Executing: $DockerCmd"
Invoke-Expression $DockerCmd

# Update Metadata with End Time
$EndTime = (Get-Date).ToUniversalTime()
$Metadata.end_time = $EndTime.ToString("o")
$Metadata.status = "completed"

$Metadata | ConvertTo-Json | Out-File $MetadataFile

Write-Host "Workload completed. Metadata saved to $MetadataFile"
