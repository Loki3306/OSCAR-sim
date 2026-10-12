import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Simulation URLs
DOCKER_SOCKET = os.getenv("DOCKER_SOCKET", "npipe:////./pipe/dockerDesktopLinuxEngine" if os.name == "nt" else "unix:///var/run/docker.sock")
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")
CADVISOR_URL = os.getenv("CADVISOR_URL", "http://localhost:8081")
GRAFANA_URL = os.getenv("GRAFANA_URL", "http://localhost:3001")
APP_API_URL = os.getenv("APP_API_URL", "http://localhost:8080")

# Research Paths
RESEARCH_RESULTS_DIR = BASE_DIR / "research" / "results"
PHASE2_VERIFIED_DIR = RESEARCH_RESULTS_DIR / "phase2_verified"
PILOT_V1_DIR = RESEARCH_RESULTS_DIR / "pilot_v1"
EXPERIMENTS_METADATA_DIR = BASE_DIR / "experiments" / "metadata"
DATA_CACHE_DIR = BASE_DIR / "research" / "data_cache"
FIGURES_DIR = BASE_DIR / "research" / "figures"
REPORTS_DIR = BASE_DIR / "research" / "reports"
MANIFESTS_DIR = BASE_DIR / "research" / "data_manifests"
