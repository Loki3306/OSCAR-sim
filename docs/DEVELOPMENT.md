# OSCAR Developer & Operations Guide

This document describes the development environment, dependencies, testing protocols, and troubleshooting procedures for the OSCAR platform.

---

## 1. System Requirements & Prerequisites

- **Operating System:** Windows 10/11, macOS, or Linux
- **Python:** 3.11, 3.12, or 3.13 (with `pip`)
- **Node.js:** v18+ (tested on Node.js v22.16.0 with npm 10.9.2)
- **Docker Desktop / Docker Compose:** (Optional for live containers; platform operates in deterministic replay fallback when Docker is offline)

---

## 2. Setup & Installation

### 2.1 Backend Environment Setup
```bash
# Clone the repository
git clone https://github.com/Loki3306/OSCAR-sim.git
cd OSCAR_Simulation

# Install Python requirements
pip install -r requirements-research.txt
pip install fastapi uvicorn pydantic pytest anyio httpx
```

### 2.2 Frontend Environment Setup
```bash
cd frontend
npm install
npm run build
cd ..
```

---

## 3. Running Automated Tests

OSCAR includes automated unit and integration tests covering the full REST API, model parsing, algorithm diagnosis, and report generation:

```bash
# Run full test suite with verbose reporting
python -m pytest tests/test_api_server.py -v
```

Expected result:
```
tests/test_api_server.py::test_root PASSED
tests/test_api_server.py::test_system_health PASSED
tests/test_api_server.py::test_topology PASSED
tests/test_api_server.py::test_metrics_query PASSED
tests/test_api_server.py::test_faults_lifecycle PASSED
tests/test_api_server.py::test_incidents_list PASSED
tests/test_api_server.py::test_rca_algorithms_and_diagnose PASSED
tests/test_api_server.py::test_benchmark_cases PASSED
tests/test_api_server.py::test_research_endpoints PASSED
tests/test_api_server.py::test_reports_generation PASSED
============================== 10 passed in 11s ==============================
```

---

## 4. Running the Platform

### Option A: Unified Production Mode (Recommended)
```bash
python -m uvicorn server.main:app --host 0.0.0.0 --port 8000
```
This serves the API, Swagger documentation, and the React frontend unified on port 8000.

### Option B: Concurrent Development Mode
Terminal 1:
```bash
python -m uvicorn server.main:app --port 8000 --reload
```
Terminal 2:
```bash
cd frontend
npm run dev
```

---

## 5. Troubleshooting & FAQ

### Issue: "Docker daemon not reachable"
- **Behavior:** The status chip indicates `REPLAY_DEMO`.
- **Explanation:** OSCAR detects when the Docker socket (`npipe://` on Windows or `/var/run/docker.sock` on Linux) is stopped and automatically activates deterministic replay from recorded runs in `experiments/metadata/`.
- **Resolution:** To enable live container execution, start Docker Desktop and run `docker compose up -d` in the root directory.

### Issue: "Port 8000 already in use"
- Run on an alternative port:
  ```bash
  python -m uvicorn server.main:app --port 8080
  ```
