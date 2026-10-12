# OSCAR Root Cause Analysis Algorithms

This document provides a comprehensive, plain-English reference for the RCA algorithms integrated into the OSCAR platform, their mathematical foundations, input/output schemas, and empirical trade-offs.

---

## 1. Algorithm Overview & Comparison Matrix

| Algorithm | Method Family | Input Modalities | Topology Required | Phase II Hit@1 (N=120) | Mean Runtime |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **OSCAR-CTRCL (Proposed)** | Causal-Temporal Distribution Shift | Metrics (CPU, RAM, Latency) | Yes (DAG) | **0.9250** (111/120) | 0.08s |
| **RCD** | Constraint-based Causal Discovery (PC) | Metrics | No (Learns DAG) | **0.8333** (100/120) | 1.84s |
| **Multi-Source BARO** | Anomaly Scoring + Modality Fusion | Metrics + Topology | Yes (DAG) | **0.7583** (91/120) | 0.12s |
| **$\epsilon$-Diagnosis** | Statistical Distance + PageRank | Metrics | Yes (DAG) | **0.7083** (85/120) | 0.05s |
| **BARO** | Optimization-based Anomaly Ranking | Metrics | No | **0.6000** (72/120) | 0.09s |
| **MicroCause** | Structural Equation Modeling | Metrics + Topology | Yes (DAG) | **0.5000** (60/120) | 2.15s |
| **CIRCA** | Static Graph Traversal | Metrics + Topology | Yes (DAG) | **0.0333** (4/120) | 0.04s |

---

## 2. In-Depth Algorithm Specifications

### 2.1 OSCAR-CTRCL (Proposed Method)
**Full Name:** Causal-Temporal Root Cause Localizer.

#### Core Intuition & Architecture:
In microservice architectures, when a leaf service (e.g., a database or cache) experiences severe hardware saturation (e.g., 100% CPU exhaustion), upstream calling services (e.g., API gateways and proxies) experience thread blocking, request queuing, and high response latencies. Naive algorithms frequently mistake the upstream caller as the root cause because its latency anomaly is the first symptom visible to users.

OSCAR-CTRCL resolves this through four complementary principles:
1. **Localized Distribution Shift Invariance (DSI):** Computes normalized pre- vs. post-injection divergence per metric:
   $$\text{Shift}(m) = \frac{|\mu_{\text{post}} - \mu_{\text{pre}}|}{\sigma_{\text{pooled}}} + 0.5 \cdot \frac{|\sigma_{\text{post}} - \sigma_{\text{pre}}|}{\sigma_{\text{pooled}}}$$
2. **Physical Resource Prioritization (PRP):** Distinguishes hardware exhaustion from symptomatic queueing by boosting physical resource shifts (CPU, memory, disk) over transit latency:
   $$\text{Shift}_{\text{weighted}}(m) = \text{Shift}(m) \times \gamma_{\text{boost}} \quad (\gamma_{\text{boost}} = 1.3)$$
3. **Topological Invariance Propagation (TIP):** Propagates suspicion along directed call dependencies in the service DAG.
4. **Callee Dominance Rule:** If a callee service has higher or comparable hardware divergence than its caller, the caller's suspicion score is dampened ($\times 0.7$), recognizing that the caller is merely a victim of downstream queuing.

---

### 2.2 RCD (Robust Causal Discovery)
- **Concept:** Uses the Peter-Clark (PC) causal discovery algorithm to reconstruct causal graphs directly from time-series correlation changes, identifying root cause nodes with minimal inbound causal arrows.
- **Strengths:** Robust when static call topologies are completely missing or inaccurate.
- **Weaknesses:** High computational overhead ($O(N^4)$ in dense graphs) and sensitive to sample window size.

---

### 2.3 Multi-Source BARO & BARO
- **Concept:** Formulates root cause diagnosis as an optimization problem, modeling microservice metrics as a linear combination of baseline normal behavior and sparse anomalous shocks.
- **Multi-Source Extension:** Augments standard BARO with topological call-chain weighting to elevate leaf storage nodes.
- **Trade-off:** High precision on isolated pod failures, but lower recall during multi-tier cascading incidents.

---

### 2.4 $\epsilon$-Diagnosis
- **Concept:** Applies the two-sample Kolmogorov-Smirnov test to detect anomalous metric distributions, followed by PageRank random walks on the service call graph.
- **Known Bias:** PageRank random walks tend to accumulate stationary probability at central transit hubs (e.g., API gateways), occasionally causing hub misidentification.

---

### 2.5 CIRCA
- **Concept:** Uses static thresholding on latency and error rates followed by DFS/BFS graph traversal from entrypoint services.
- **Critical Benchmark Note:** As documented in recent RCAEval audits, CIRCA frequently suffers from ties and falls back to lexicographical service ordering when telemetry noise obscures hard thresholds, explaining its low Hit@1 score.
