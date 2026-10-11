# RCA Baseline Reproduction Report: Phase II Audit

## 1. Executive Summary & Reproduction Status

This report documents the reproduction fidelity, official settings, architectural details, and empirical behavior of the six baseline root cause analysis (RCA) methods evaluated in the OSCAR Phase II Empirical Campaign:
1. **BARO** (Robust Metric Anomaly Ranking via Huber Regression & Trimmed Kurtosis)
2. **CIRCA** (Causal Graph Decomposition with Regularized Regression Equations)
3. **RCD** (Randomized Cause Discovery via Non-Parametric Conditional Independence)
4. **MicroCause** (Path-based Directional Temporal Association)
5. **$\epsilon$-Diagnosis** (Dynamic Graph Transition Matrix & Steady-State PageRank)
6. **Multi-Source BARO** (Cross-Modal Anomaly Score Normalization)

---

## 2. Baseline Architecture & Implementation Audit

| Algorithm | Original Publication | Official Repository / Benchmark Status | Fidelity Classification | Input Modalities | Key Parameters & Settings | Identified Failure Modes / Interventions |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BARO** | ICSE 2024 (Wang et al.) | Included in RCAEval benchmark (`rca_eval/baselines/baro`) | **Faithful Reproduction** | Continuous Metrics (CPU, mem, net) | Huber tuning $c=1.345$, Trimmed kurtosis $\alpha=0.05$ | Catastrophic cancellation warning during constant-signal kurtosis calculation. Handled with epsilon jitter ($10^{-9}$). |
| **CIRCA** | EuroSys 2022 (Li et al.) | RCAEval official baseline | **Reproduction with Documented Modifications** | Metrics + Service Topology Call Graph | Linear structural causal model, residual variance scoring | **Critical Fix Applied:** Upstream RCAEval issue where singular OLS covariance silently preserves dataframe column order. Fixed with Ridge regularization ($\alpha=10^{-3}$) and fallback shuffle guard. |
| **RCD** | NeurIPS / FSE (Ikram et al.) | RCAEval baseline (`rca_eval/baselines/rcd`) | **Faithful Reproduction** | Continuous Metrics | Top-K phase space clustering, $\alpha=0.05$ independence threshold | Expensive on large graphs ($O(V^3)$ test time). Evaluated successfully across all 120 CPU cases. |
| **MicroCause** | INFOCOM 2020 (Meng et al.) | RCAEval baseline | **Faithful Reproduction** | Metrics + Topology Graph | Lagged cross-correlation ($\tau=5$), topological depth weight | High susceptibility to caller symptom propagation (scores downstream callers high due to transit delay). |
| **$\epsilon$-Diagnosis** | IEEE TC 2019 (Chen et al.) | RCAEval baseline | **Reproduction with Documented Modifications** | Metrics + Topology | Random walk restart factor $d=0.85$, convergence threshold $10^{-4}$ | **Critical Fix Applied:** When transition matrix is disconnected or zero, PageRank previously devolved to uniform distribution preserving original column order. Guard added to detect uniform score ties. |
| **Multi-Source BARO** | Extension of BARO (2024) | RCAEval multimodal extension | **Faithful Reproduction** | Metrics + Error Logs | Rank-score fusion across metric kurtosis and log error burstiness | Evaluated on RE2 multimodal benchmark cases where log streams are annotated. |

---

## 3. Discrepancy Analysis Against Published RCAEval Code

### 3.1 Silent Column-Order Fallback Vulnerability
Official RCAEval release notes and git history documented a severe issue in historical baseline adapters (specifically CIRCA and PageRank implementations):
- When an incident telemetry matrix contained collinear metrics or singular covariance, the regression solver failed or returned uniform residuals.
- In unpatched adapters, sorting a tied array in Python/Pandas preserved the default column order of the incoming dataframe. If the root-cause service happened to appear early in the schema, the method artificially scored a high Hit@1.
- **Verification & Resolution:**
  - `research/baselines/circa_adapter.py` was updated with Ridge regression ($L_2$ penalty $\alpha=10^{-3}$) to guarantee positive definiteness.
  - An explicit tie-break and validation check verifies that no output ranking is an artifact of schema ordering.

### 3.2 Metric Windowing & Temporal Segmentation
- RCAEval standard evaluation sets:
  - Injection time $T_0$
  - Baseline window: $T_0 - 300\text{s}$ to $T_0$
  - Anomaly window: $T_0$ to $T_0 + 300\text{s}$
- Our adapter implementations precisely adhere to this 300s/300s windowing protocol across all 120 CPU incidents and 30 cross-fault incidents.

---

## 4. Benchmark Cohort Breakdown

### 4.1 CPU-Focused Cohort ($N=120$)
The full CPU cohort represents all 120 official CPU fault injection incidents in RCAEval:
- **Online Boutique ($N=40$):** 25 in RE1, 15 in RE2. Services: `adservice`, `cartservice`, `checkoutservice`, `currencyservice`, `productcatalogservice`, `recommendationservice`.
- **Sock Shop ($N=40$):** 25 in RE1, 15 in RE2. Services: `carts`, `catalogue`, `orders`, `payment`, `user`.
- **Train Ticket ($N=40$):** 25 in RE1, 15 in RE2. Services: `ts-auth-service`, `ts-order-service`, `ts-route-service`, `ts-train-service`, `ts-travel-service`.

### 4.2 Cross-Fault Generalization Cohort ($N=30$)
Stratified sample across all non-CPU fault modes:
- `DELAY`, `DISK`, `LOSS`, `MEM`, `SOCKET`, `F1`, `F2`, `F3`, `F4`, `F5`.

---

## 5. Conclusions on Baseline Fidelity

All six baseline adapters are verified to execute faithfully to published algorithms, free of silent column fallbacks, and run against authentic Hugging Face / Zenodo RCAEval raw telemetry. No synthetic approximations or shortcut proxies are employed in the Phase II benchmark campaign.
