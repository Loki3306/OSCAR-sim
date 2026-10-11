# RCA Literature Review & Prior-Art Novelty Matrix

## Executive Summary
This document provides an exhaustive, peer-reviewed literature matrix covering root cause analysis (RCA) in distributed microservice systems. It reviews core algorithmic paradigms (statistical, causal discovery, causal inference, random walk/graph, and multimodal fusion), delineates their core assumptions, required telemetry, strengths, and failure modes, and establishes the research gap addressed by OSCAR.

---

## 1. Baseline Algorithm Matrix

| Method | Venue & Year | Telemetry Required | Core Algorithmic Paradigm | Mathematical Mechanism | Strengths | Known Failure Modes |
|:---|:---|:---|:---|:---|:---|:---|
| **BARO** | FSE 2024 | Metrics (Timeseries) | Bayesian Change-Point Detection + Kurtosis | BOCPD calculates run-length posterior distribution $P(r_t \mid x_{1:t})$. Anomalousness scored by change magnitude and kurtosis ratio. | Highly robust to noisy normal baselines; no topology required; fast execution ($< 1$s). | Ignores service dependency graph; susceptible to mistaking downstream cascade victims (e.g. latency spikes) for root cause. |
| **CIRCA** | USENIX ATC 2022 | Metrics + Service Graph | Causal Graph Hypothesis Testing | Constructs hierarchical hypothesis graph from service topology; performs recursive statistical hypothesis testing along causal paths. | Prunes non-causal associations; aligns well with service dependencies. | Highly sensitive to incomplete or noisy topology; fails if causal link is delayed or indirect. |
| **RCD** | SIGMETRICS 2021 | Metrics | Localized Causal Discovery | Constraint-based causal discovery (modified PC algorithm) comparing normal ($D_{pre}$) and abnormal ($D_{post}$) distribution shifts. | Mathematically rigorous causal graph inference from observational data without prior topology. | Exponential/cubic complexity with metric dimensionality; unstable conditional independence tests under short time windows. |
| **MicroCause**| INFOCOM 2020 | Metrics + Traces | Temporal Causal Discovery (VAR + PC) | Constructs metric DAG using Vector Autoregression (VAR) and conditional independence testing, ranked via causal path centrality. | Captures lag-dependent metric influences across service boundaries. | High computation overhead; false positive edges caused by mutual downstream correlation. |
| **$\epsilon$-Diagnosis** | IMC 2020 | Metrics + Topology | Statistical Graph Random Walk | Computes anomaly score matrix over metric nodes; executes biased random walk with restart over dependency graph. | Fast, noise-tolerant, robust to mild telemetry gaps. | Random walk steady-state distribution often concentrates on high-degree hub services regardless of root cause. |
| **Multi-Source BARO** | WWW 2025 | Metrics, Logs, Traces | Multimodal Evidence Late Fusion | Extracts log template change-points via Drain parser + trace latency anomalies + BOCPD metric scores; fused via weighted score aggregation. | Captures complementary signals (e.g. error logs before metric degradation). | Requires uniform multimodal alignment; log parsing errors or trace sampling gaps degrade fusion reliability. |

---

## 2. Benchmark Landscape

| Benchmark | Systems Included | Failure Cases | Telemetry Modalities | Provenance & Nature | Ground Truth Quality |
|:---|:---|:---|:---|:---|:---|
| **RCAEval** (Pham et al., 2024/2025) | Online Boutique, Sock Shop, Train Ticket | 735 cases (375 RE1, 270 RE2, 90 RE3) | Metrics (RE1), Metrics+Logs+Traces (RE2, RE3) | Controlled fault injection (ChaosBlade/Pumba) on Kubernetes testbeds with real microservice workloads. | Exhaustive ground truth: root cause service, root cause metric, injection start/end timestamp, fault type. |
| **OpenRCA** (Microsoft, 2023) | Enterprise Cloud Services | ~300+ incidents | Multi-modal incident telemetry | Real-world and testbed cloud incidents. | Rich telemetry, but heterogeneous schemas and variable ground truth granularity across cases. |
| **MicroSS / AIOps Challenge** | Cloud gaming, e-commerce | ~100-200 cases | Metrics, traces | Competition testbeds. | Focused primarily on synthetic anomaly detection rather than multi-source RCA. |

---

## 3. Novelty Audit & The Research Gap

### Identified Deficiencies in Existing Methods:
1.  **Downstream Cascade Inversion (The CPU Problem):**
    When a CPU-exhaustion fault occurs (e.g., in a database or backend worker), downstream caller services experience queue backpressure, thread starvation, and latency spikes within 5–15 seconds. Purely statistical methods (BARO) frequently assign equal or higher kurtosis scores to the victim service's latency than to the culprit service's CPU metric.
2.  **Topology Blindness vs. Graph Instability Tradeoff:**
    Metric-only methods (BARO) completely discard service dependencies. Conversely, pure causal discovery algorithms (RCD, MicroCause) attempt to learn the full graph from scratch on short, highly non-stationary failure windows, resulting in spurious edges and slow execution.
3.  **Absence of Temporal Onset Differentiation:**
    Most graph algorithms aggregate anomaly scores over the entire incident window ($T_{start}$ to $T_{end}$), discarding the microscopic *temporal order of onset* ($\tau_{onset}$) between services.

### Proposed Contribution (OSCAR-CTRCL):
**OSCAR Causal-Temporal Root Cause Localizer (CTRCL)** addresses this exact gap:
*   Combines **BOCPD change-point onset estimation** (pinpointing the precise second an anomaly began) with a **Service Dependency Directed Graph (DAG)**.
*   Introduces an **Upstream Precedence Constraint**: if service $A$ calls service $B$, and $B$'s anomaly onset precedes $A$'s anomaly onset, $A$ receives a heavy downstream penalty, ensuring victim services cannot displace root-cause culprits.
*   Integrates **Entropy-Calibrated Multimodal Weighting** to fuse log error bursts and trace latency degradation without manual heuristic weight tuning.
