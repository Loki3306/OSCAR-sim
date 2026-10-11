# OSCAR 5-Minute Demonstration Script

This script provides an exact, step-by-step walkthrough to present the OSCAR Root Cause Analysis platform to a professor, research advisor, or technical review committee.

---

## Preparation (30 Seconds)
1. Open PowerShell or Terminal in the repository root.
2. Launch the unified platform server:
   ```powershell
   python -m uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload
   ```
3. Open Google Chrome or Firefox to:
   ```
   http://localhost:8000/
   ```
4. Verify the top header bar:
   - Notice the environment indicator badge: `Replay Archive Mode` (or `Docker Cluster Live` if Docker Desktop is running).
   - Notice the calm, enterprise light palette (warm stone `#fcfbf9`, white cards `#ffffff`, charcoal typography `#181d27`).

---

## Step 1: System Overview & Subsystem Transparency (1 Minute)
* **Action:** Direct attention to the **Subsystem Health & Connectivity Matrix**:
  - Application API Server: `OPERATIONAL`
  - Docker Engine Daemon: `OFFLINE` (Named pipe unreachable on host)
  - Microservice Environment: `REPLAY ARCHIVE` (5 services discovered)
  - Telemetry (Prometheus & cAdvisor): `REPLAY CACHE` (EXP-postgres_cpu_stress_001)
  - State Persistence: `IN-MEMORY (EPHEMERAL)`
  - RCA Diagnostic Engine: `READY (7 MODELS)`
* **Talking Point:**
  > *"Professor, before running anything, notice the Subsystem Health Matrix. The platform does not give a misleading '0 services / fully operational' claim. Because Docker Desktop is offline on this host machine, the platform transparently reports the Docker and persistence status, and engages Transparent Replay Demonstration Mode using verified experiment telemetry without faking live container mutations."*
* **Action:** Click the **About & Research Guide** button in the header.
* **Talking Point:**
  > *"This guide explains the foundational engineering challenge we are solving: in a microservice call chain, when a leaf database exhausts its CPU, upstream callers experience severe latency delays. Naive monitoring tools alert on the API gateway or proxy, falling into the 'Cascading Victim Trap'. OSCAR was engineered to mathematically resolve this problem."*

---

## Step 2: Microservice Call Graph & Dependency Topology (1 Minute)
* **Action:** Click **Service Topology** in the left sidebar.
* **Talking Point:**
  > *"Here is the architecture of our distributed system. The synthetic client sends HTTP traffic to an Nginx reverse proxy, which routes to a Rust Axum API gateway, which in turn calls a PostgreSQL database for persistent storage and a Redis cache for session data. Clicking on any node displays real-time resource utilization, latency, and upstream/downstream blast radius."*

---

## Step 3: Triggering a Controlled Fault & Observing Telemetry (1 Minute)
* **Action:** Navigate to **Fault Laboratory**. Point out the `RECORDED REPLAY EXPERIMENT` badge.
* **Action:** Select Target: `POSTGRES`, Fault Type: `CPU Saturation (stress-ng)`, Duration: `60s`. Click **Initiate Replay Experiment**.
* **Action:** Navigate to **Live Observability**.
* **Talking Point:**
  > *"Look at the telemetry streams: PostgreSQL's CPU metric saturates to 88.5%. Now look at the upstream caller, the API gateway: its request duration escalates from 8.5ms to 240ms because its worker threads are blocked waiting on database connections. A conventional alert would blame the API gateway. Now let's see how Root Cause Analysis diagnoses this incident."*
* **Action:** Briefly show the **Incident Timeline** to display the chronological event stack from experiment start to recovery.

---

## Step 4: Multi-Model RCA & The Cascading Victim Trap (1 Minute)
* **Action:** Navigate to **RCA Workbench**.
* **Action:** Ensure `OSCAR-CTRCL (Proposed)`, `RCD`, and `BARO` are selected. Click **Execute Diagnosis**.
* **Talking Point:**
  > *"In under 30 milliseconds, the algorithms evaluate the topology and telemetry distribution shift. Notice the blind diagnosis rankings:
  > - OSCAR-CTRCL ranks `postgres` at #1 (Score: 3.019).
  > - Baseline RCD ranks `api` at #1 (Score: 2.097), misidentifying the caller victim!
  > - BARO ranks `nginx` at #1 (Score: 206.5), trapped by edge transit queueing!"*
* **Action:** Click **Reveal Ground Truth (Evaluation)**.
* **Talking Point:**
  > *"Revealing ground truth confirms PostgreSQL is the true injected fault. OSCAR-CTRCL is scored as **HIT @ 1**, while RCD and BARO receive **MISS**. The Callee Dominance Rule dampened the API gateway's suspicion score by 0.7x because its downstream callee exhibited hardware exhaustion."*

---

## Step 5: Research Verification & SRE Post-Mortem Export (1 Minute)
* **Action:** Navigate to **Research Results** in the left sidebar.
* **Talking Point:**
  > *"To ensure this was not an isolated lucky run, we conducted a comprehensive empirical campaign across 120 ground-truth CPU failure cases in the official RCAEval benchmark. OSCAR-CTRCL achieves **92.5% Hit@1** compared to 83.3% for RCD, with an exact McNemar test p-value of **0.0433**, establishing statistically significant superiority. Below the leaderboard, you can inspect all 6 publication figures generated directly from our reproducible experimental runs."*
* **Action:** Navigate to **Report Center**. Select **SRE Incident Diagnostic Post-Mortem** in Markdown, then show the live preview.
* **Closing Point:**
  > *"Finally, an SRE or researcher can immediately download or copy this standardized post-mortem report containing the complete incident timeline, metric measurements, and multi-model consensus."*
