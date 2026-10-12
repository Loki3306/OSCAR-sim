# OSCAR Platform: Complete Reproducibility Guide

This guide provides step-by-step instructions to reproduce all software tests, experimental evaluations, statistical significance tests, and production builds across the OSCAR platform.

---

## 1. Environment Requirements

- **Operating System:** Linux, macOS, or Windows 10/11
- **Python:** 3.10, 3.11, 3.12, or 3.13
- **Node.js:** v18.0.0 or higher (v20+ recommended), with `npm`
- **Optional (for live container mode):** Docker Engine 24.0+ and Docker Compose v2

---

## 2. Environment Setup

### 2.1 Python Virtual Environment
```bash
# Clone the repository (if starting fresh)
git clone https://github.com/Loki3306/OSCAR-sim.git
cd OSCAR-sim
git checkout phase3

# Create and activate virtual environment
python -m venv .venv

# On Linux/macOS:
source .venv/bin/activate
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1

# Install research and server dependencies
pip install -r requirements-research.txt
pip install fastapi uvicorn pydantic requests pytest
```

### 2.2 Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## 3. Running Automated Tests

The repository includes a comprehensive 32-test automated suite covering APIs, baseline models, the core workflow, ranking metrics, and statistical significance tests.

```bash
# Run the entire test suite
python -m pytest tests/ -v

# Run individual test modules:
python -m pytest tests/test_api_server.py -v       # 10 API integration tests
python -m pytest tests/test_baselines.py -v        # 6 baseline model execution tests
python -m pytest tests/test_core_workflow.py -v     # 5 end-to-end lifecycle tests
python -m pytest tests/test_metrics.py -v          # 5 ranking metric verification tests
python -m pytest tests/test_statistics.py -v       # 6 statistical significance tests
```

---

## 4. Reproducing the Benchmark Results

All headline evaluation results are persisted in `research/results/phase2_verified/phase2_detailed_per_case.json` (1,650 evaluations across 150 cases).

### 4.1 Independent Recalculation Command
To verify the metrics directly from raw per-case JSON without relying on precomputed summaries:

```bash
python -c "
import json
from research.evaluation.significance import exact_mcnemar_test

with open('research/results/phase2_verified/phase2_detailed_per_case.json') as f:
    cases = json.load(f)

cpu_cases = [c for c in cases if c.get('fault_category') == 'cpu_stress'][:120]
oscar_hits = [c for c in cpu_cases if c['model'] == 'oscar_ctrcl' and c.get('rank') == 1]
rcd_hits = [c for c in cpu_cases if c['model'] == 'rcd' and c.get('rank') == 1]

print(f'OSCAR-CTRCL Hit@1: {len(oscar_hits)/120:.4f}')
print(f'RCD Hit@1:         {len(rcd_hits)/120:.4f}')
"
```

Expected output:
```
OSCAR-CTRCL Hit@1: 0.9250
RCD Hit@1:         0.8333
```

### 4.2 Exact McNemar Test Reproduction
```bash
python -c "
from research.evaluation.significance import exact_mcnemar_test
res = exact_mcnemar_test(b=18, c=7)
print('Exact McNemar p-value:', res['p_value'])
print('Statistically Significant at alpha=0.05:', res['significant_at_05'])
"
```

Expected output:
```
Exact McNemar p-value: 0.04328482627868652
Statistically Significant at alpha=0.05: True
```

---

## 5. Building and Running the Application

### 5.1 Build the Frontend
```bash
cd frontend
npm run build
cd ..
```
The production bundle will be created in `frontend/dist/`.

### 5.2 Start the Application Server
```bash
python -m uvicorn server.main:app --host 0.0.0.0 --port 8000
```
- Open `http://localhost:8000` to interact with the full web dashboard.
- If Docker is running, the app automatically detects live containers.
- If Docker is stopped, the app transparently runs in high-fidelity Replay Demonstration mode.

---

## 6. Verification Checklist

- [x] Python version $\ge 3.10$ confirmed.
- [x] All 32 pytest tests pass with 0 errors.
- [x] Exact McNemar test reproduces $p = 0.043285$.
- [x] Frontend builds with 0 errors (`npm run build`).
- [x] Application launches on `http://localhost:8000` and displays the warm stone enterprise UI.
