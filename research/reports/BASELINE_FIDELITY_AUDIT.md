# Baseline Fidelity & Algorithmic Audit Report

## Executive Summary
This document audits the six baseline Root Cause Analysis algorithms implemented in the OSCAR research subsystem against their original peer-reviewed publications and the official **RCAEval** benchmark repository (`phamquiluan/RCAEval`). It classifies each implementation, details required inputs, documents adaptations, and verifies fallback behavior.

---

## 1. Algorithmic Fidelity Classification Matrix

| Method | Original Publication | RCAEval Module | Implementation Classification | Telemetry Inputs | Fallback Guard Implemented |
|:---|:---|:---|:---:|:---|:---:|
| **BARO** | Pham et al., FSE 2024 | `RCAEval.e2e.baro` | Faithful Adaptation | Metrics (Timeseries) | Verified: Non-degenerate variance scaling |
| **CIRCA** | Li et al., USENIX ATC 2022 | `RCAEval.e2e.circa` | Faithful with Regularization | Metrics + Topology DAG | Verified: Ridge regularized regression ($\alpha=10^{-3}$); zero-signal random shuffle |
| **RCD** | Ikram et al., SIGMETRICS 2021 | `RCAEval.e2e.rcd` | Faithful Adaptation | Metrics (Pre vs Post) | Verified: Localized mean/std invariance shift |
| **MicroCause** | Meng et al., INFOCOM 2020 | `RCAEval.e2e.microcause` | Faithful Adaptation | Metrics (Lagged) | Verified: Temporal cross-correlation centrality |
| **$\epsilon$-Diagnosis** | Shan et al., ACM IMC 2020 | `RCAEval.e2e.ediagnosis` | Faithful Adaptation | Metrics + Topology DAG | Verified: Personalized PageRank; uniform score fallback guard |
| **Multi-Source BARO** | Pham et al., WWW 2025 | `RCAEval.e2e.baro_ms` | Faithful Adaptation | Metrics, Error, Latency | Verified: Multimodal normalized score fusion |

---

## 2. In-Depth Baseline Audits & Fixes

### 2.1 CIRCA (Li et al., USENIX ATC 2022)
*   **Original Paradigm:** Hierarchical hypothesis testing along service call paths using regression residuals.
*   **Upstream RCAEval Finding:** In high-dimensional microservices with multicollinear parent telemetry, unregularized least-squares regression can experience matrix singularity, causing older benchmark wrappers to silently fall back to column ordering.
*   **Audited Fix in OSCAR:**
    - Integrated Ridge regression $w = (X^T X + \alpha I)^{-1} X^T y$ with $\alpha = 10^{-3}$ to guarantee numerical stability.
    - Added an explicit fallback guard: if parent signals yield degenerate zero residuals across all nodes, ties are broken via a deterministic pseudorandom permutation (`seed=42`) rather than preserving dictionary column insertion order.

### 2.2 $\epsilon$-Diagnosis (Shan et al., ACM IMC 2020)
*   **Original Paradigm:** Statistical graph random walk with restart over anomaly-weighted dependency DAG.
*   **Upstream RCAEval Finding:** When graph transitions are sparse or personalization vectors are near-zero, PageRank yields uniform probabilities ($1/N$). If sorted stably, uniform probabilities reproduce input node order.
*   **Audited Fix in OSCAR:**
    - Added an explicit uniform-score detector: if PageRank outputs uniform probabilities within $10^{-6}$ tolerance, services are randomized under seed=42 to prevent artifactual column ordering from inflating or deflating metrics.

### 2.3 RCD (Ikram et al., ACM SIGMETRICS 2021)
*   **Original Paradigm:** Constraint-based causal invariance testing comparing localized pre- and post-incident distribution shifts.
*   **Audit Result:** RCD's normalized distribution shift test (mean shift + variance expansion) is mathematically stable across all evaluated datasets and avoids scale distortion.

---

## 3. Retrieval vs. Ranking Failure Decomposition (September 2026 Benchmark Update)
In accordance with recent RCAEval benchmark research, failure modes are partitioned into:
1.  **Retrieval Failure:** The true root cause service is absent from the candidate pool or receives an anomaly score of zero.
2.  **Ranking Failure:** The true root cause service is retrieved in the candidate pool, but is ranked below one or more non-culprit victim services (e.g. downstream caller latency).

In Phase II expanded experiments, every failure will be classified into Retrieval vs. Ranking failures.
