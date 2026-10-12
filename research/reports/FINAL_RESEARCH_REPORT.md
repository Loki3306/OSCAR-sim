# OSCAR Empirical Research Program: Final Research Report (Phase II Verified)

## Executive Summary
This document provides the final, authoritative scientific report for the **OSCAR Empirical Root Cause Analysis (RCA) Research Program**. Evolving beyond an initial Docker simulation prototype, this project executed a rigorous empirical campaign in microservice root cause analysis, focusing on **CPU-centric root cause localization** across authentic benchmark telemetry.

Following an independent empirical audit of initial pilot results, we evaluated the **complete eligible cohort of 120 CPU failure incidents** from the peer-reviewed **RCAEval** benchmark across three enterprise topologies (*Online Boutique*, *Sock Shop*, and *Train Ticket*), evaluated six established baseline RCA algorithms (**BARO**, **CIRCA**, **RCD**, **MicroCause**, **$\epsilon$-Diagnosis**, and **Multi-Source BARO**), investigated simple hybrid aggregation strategies, proposed the **OSCAR-CTRCL** algorithm, and validated its performance through exact McNemar tests on paired binary outcomes, continuous ranking tests, 10,000-resample stratified bootstrap confidence intervals, component ablations, and controlled degradation experiments.

---

## 1. Project Architecture & Research Scope
*   **Core Architectural Invariant:** The OSCAR-Sim simulator infrastructure (`services/`, `monitoring/`, `controller/`, `experiments/`) was preserved completely untouched. All research software resides in a dedicated, isolated research subsystem (`research/`).
*   **Data Provenance Policy:** In compliance with scientific integrity rules, primary experimental conclusions are derived exclusively from authentic, verified benchmark telemetry (RCAEval). Synthetic simulator-generated faults are reserved strictly for secondary local demonstrations.
*   **Preservation of Pilot History:** Initial pilot artifacts are preserved immutably under `research/results/pilot_v1/`. All Phase II verified outputs are versioned in `research/results/phase2_verified/`.

---

## 2. Dataset Feasibility & Provenance Audit
*   **Benchmark:** RCAEval (Pham et al., FSE 2024 / WWW 2025 / ASE 2024; Zenodo record 14590730; Hugging Face `phamquiluan/RCAEval`).
*   **Benchmark Inventory:** 735 total controlled failure incidents across 11 fault categories (CPU, Memory, Disk, Network Delay, Network Loss, Socket, and code-level faults F1–F5).
*   **Verified CPU Ground-Truth Cohort ($N=120$):**
    - **Suite RE1 (Metric Baseline):** 75 CPU cases (25 cases per system, 5 microservices $\times$ 5 repetitions).
    - **Suite RE2 (Multi-Source):** 45 CPU cases (15 cases per system, 5 microservices $\times$ 3 repetitions).
    - **Online Boutique ($N=40$):** `adservice`, `cartservice`, `checkoutservice`, `currencyservice`, `productcatalogservice`, `recommendationservice`.
    - **Sock Shop ($N=40$):** `carts`, `catalogue`, `orders`, `payment`, `user`.
    - **Train Ticket ($N=40$):** `ts-auth-service`, `ts-order-service`, `ts-route-service`, `ts-train-service`, `ts-travel-service`.
    - Ground truth annotations: Root cause service, fault type, injection start timestamp ($t_{\text{inject}}$), and metric labels.
    - Observation window: Standardized to 300 seconds pre-injection and 300 seconds post-injection.

---

## 3. Baseline Fidelity Audit & Implementation Interventions
In accordance with official RCAEval documentation, baseline adapters were audited against published settings and protected against silent fallback defects:
1.  **CIRCA (EuroSys 2022):** Unregularized linear regression in microservice topologies with collinear metrics previously suffered from singular covariance matrices, causing Pandas sorting to silently preserve incoming column orders. We incorporated Ridge regularization ($L_2$ penalty $\alpha = 10^{-3}$) and fallback shuffle guards to ensure genuine causal ranking.
2.  **$\epsilon$-Diagnosis (IEEE TC 2019):** Disconnected transition matrices previously caused PageRank to return uniform scores that retained column ordering. Added tie detection to flag degenerate graphs.
3.  **BARO (ICSE 2024):** Huber regression ($c=1.345$) with trimmed kurtosis. Constant-signal kurtosis catastrophic cancellation warnings resolved with epsilon jitter ($10^{-9}$).
4.  **RCD (NeurIPS / FSE):** Randomized phase-space clustering with non-parametric conditional independence ($\alpha = 0.05$).
5.  **MicroCause (INFOCOM 2020):** Directional lagged cross-correlation ($\tau = 5$) with topological depth penalties.
6.  **Multi-Source BARO (2024):** Multimodal metric kurtosis and error log burstiness score fusion.

---

## 4. Confirmatory Evaluation Results on the Full CPU Cohort ($N=120$)

All methods were evaluated under identical 300s/300s windowing across all 120 CPU cases.

| Algorithm | CPU Sample Size $N$ | Hit@1 (CPU) | 95% Bootstrap CI (Hit@1) | Hit@3 (CPU) | MRR (CPU) | 95% Bootstrap CI (MRR) | Overall Hit@1 ($N=150$) | Overall MRR ($N=150$) | Mean Runtime (s) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OSCAR-CTRCL (Proposed)** | **120** | **0.9250** | **[0.875, 0.967]** | **0.9500** | **0.9427** | **[0.901, 0.974]** | **0.9133** | **0.9345** | **0.0144** |
| **RCD** | 120 | 0.8333 | [0.767, 0.892] | 0.9833 | 0.9082 | [0.865, 0.945] | 0.8400 | 0.9087 | 0.0160 |
| **Multi-Source BARO** | 120 | 0.7583 | [0.683, 0.825] | 0.9167 | 0.8449 | [0.793, 0.892] | 0.7667 | 0.8532 | 0.0104 |
| **E-Diagnosis** | 120 | 0.7083 | [0.625, 0.783] | 0.8833 | 0.7994 | [0.739, 0.853] | 0.7133 | 0.8021 | 0.0210 |
| **Hybrid-CausalTemporal** | 120 | 0.6250 | [0.533, 0.708] | 0.8667 | 0.7581 | [0.693, 0.819] | 0.6467 | 0.7704 | 0.0099 |
| **BARO** | 120 | 0.6000 | [0.508, 0.683] | 0.9000 | 0.7589 | [0.697, 0.817] | 0.6133 | 0.7647 | 0.0768 |
| **MicroCause** | 120 | 0.5000 | [0.408, 0.583] | 0.7750 | 0.6692 | [0.600, 0.735] | 0.4400 | 0.6107 | 0.2058 |
| **Hybrid-RRF** | 120 | 0.2833 | [0.208, 0.367] | 0.6000 | 0.4976 | [0.428, 0.566] | 0.2733 | 0.4896 | 0.2958 |
| **CIRCA** | 120 | 0.0333 | [0.008, 0.067] | 0.0833 | 0.1504 | [0.098, 0.209] | 0.0333 | 0.1587 | 0.0133 |
| *Theoretical Random Chance* | 120 | 0.0812 | - | 0.2436 | 0.2307 | - | 0.0812 | 0.2307 | - |

---

## 5. Statistical Significance Analysis

### 5.1 Primary Endpoint: Exact McNemar Test on Hit@1 ($2 \times 2$ Contingency)
Constructing the contingency table of paired binary outcomes across the matched 120 cases:

| Comparison | $n_{11}$ | $n_{10}$ (OSCAR Wins) | $n_{01}$ (Base Wins) | $n_{00}$ | Exact McNemar $p_{\text{raw}}$ | Holm-Adjusted $p_{\text{adj}}$ | Significant ($\alpha=0.05$)? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OSCAR vs. RCD** | 93 | 18 | 7 | 2 | **0.043285** | **0.043285** | **YES (Statistically Significant)** |
| **OSCAR vs. Multi-Source BARO** | 85 | 26 | 6 | 3 | $5.3505 \times 10^{-4}$ | $1.0701 \times 10^{-3}$ | **YES (Statistically Significant)** |
| **OSCAR vs. E-Diagnosis** | 85 | 26 | 0 | 9 | $2.9802 \times 10^{-8}$ | $8.9407 \times 10^{-8}$ | **YES (Statistically Significant)** |
| **OSCAR vs. BARO** | 70 | 41 | 2 | 7 | $2.1532 \times 10^{-10}$ | $8.6129 \times 10^{-10}$ | **YES (Statistically Significant)** |
| **OSCAR vs. MicroCause** | 55 | 56 | 5 | 4 | $5.6456 \times 10^{-12}$ | $2.8228 \times 10^{-11}$ | **YES (Statistically Significant)** |
| **OSCAR vs. CIRCA** | 1 | 110 | 3 | 6 | $4.6334 \times 10^{-29}$ | $2.7800 \times 10^{-28}$ | **YES (Statistically Significant)** |

### 5.2 Key Secondary Endpoint: Continuous MRR Analysis
- **OSCAR vs. RCD:** MRR mean difference is $+0.0345$ ($0.9427$ vs $0.9082$).
  - Wilcoxon signed-rank test: $p = 0.5847$
  - 10,000-permutation test: $p = 0.1737$
  - Paired effect size: Cohen's $d_z = 0.126$
- **Academic Nuance:** While OSCAR-CTRCL achieves statistically significant superiority over RCD in Top-1 Localization Accuracy ($\text{Hit@1}$, $p = 0.0433$), RCD is highly competitive at Top-3 recall (Hit@3 of 0.9833 vs. OSCAR's 0.9500), resulting in an MRR difference that does not achieve statistical significance.

---

## 6. Retrieval vs. Ranking Failure Decomposition & Downstream Symptoms
By cross-referencing candidate predictions with benchmark service dependency graphs, failures were decomposed into mechanistic categories:
*   **Caller Symptom Confusion:** E-Diagnosis (16 cases), CIRCA (35 cases), and Hybrid-RRF (31 cases) frequently ranked upstream caller services as root causes due to latency propagation.
*   **Callee Symptom Confusion:** MicroCause suffered 12 callee symptom confusion errors due to directional correlation lag.
*   **OSCAR-CTRCL Suppression:** By combining **Physical Resource Dominance** (prioritizing saturated CPU metrics over transit latency) and **Causal Callee Dominance** (prioritizing leaf providers over calling clients), OSCAR-CTRCL reduced topological symptom errors to just **2 cases** (1 caller, 1 callee).

---

## 7. Component Ablations
On the full 120 CPU cohort:
*   **Full OSCAR-CTRCL:** Hit@1 = 0.9250 | MRR = 0.9427
*   **w/o Causal Propagation:** Hit@1 = 0.8917 (-0.0333) | MRR = 0.9408
*   **w/o Physical Resource Dominance:** Hit@1 = 0.8750 (-0.0500) | MRR = 0.9158
Both components provide distinct, quantifiable value in suppressing symptom misattribution.

---

## 8. Telemetry Degradation & Robustness ($N=60$ Multi-System Cohort)
*   **Measurement Noise ($\sigma \in [0.0, 0.5]$):** OSCAR-CTRCL maintains **0.9000 Hit@1** across all noise levels (zero degradation), whereas RCD drops from 0.8833 to 0.8167 (-7.5%).
*   **Telemetry Missingness ($d \in [0.0, 0.5]$):**
    - At 10% missingness: OSCAR-CTRCL achieves 0.8833 vs. RCD's 0.8500.
    - At 25% missingness: OSCAR-CTRCL achieves 0.8667 vs. RCD's 0.8500.
    - At 50% missingness: RCD achieves **0.8000** vs. OSCAR-CTRCL's **0.7333**.
    - **Trade-off Analysis:** If container CPU counters are omitted in extreme telemetry loss, OSCAR must fall back to unweighted distribution shift, whereas RCD's broad conditional independence testing across remaining graph vertices exhibits higher survivability.

---

## 9. Threats to Validity & Limitations
1.  **Construct Validity:** Controlled fault injections in microservice testbeds may exhibit sharper onset dynamics than naturally occurring memory leaks or gradual hardware degradation in production.
2.  **Internal Validity:** Pre/post window selection (300s/300s) relies on approximate alert timestamps.
3.  **External Validity:** While the 120 cases span three diverse, multi-tier architectures (10 to 40+ microservices), evaluation is conducted within the RCAEval benchmark. Independent benchmark transfer (e.g., to Train Ticket v2 or AIOps challenge datasets) remains a documented avenue for future work.
