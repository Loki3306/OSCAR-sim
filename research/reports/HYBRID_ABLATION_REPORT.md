# Hybrid Methods, Component Ablation & Error Decomposition Report

## 1. Executive Summary

This report evaluates hybrid rank aggregation baselines, analyzes the individual architectural components of **OSCAR-CTRCL**, and provides a mechanistic decomposition of localization failures across the RCAEval benchmark.

---

## 2. Hybrid Baseline Methods

Two hybrid baselines were evaluated to determine whether simple heuristic fusion of existing models suffices to match or exceed dedicated causal-temporal modeling:

1. **Reciprocal Rank Fusion (Hybrid-RRF):**
   - Combines rankings from BARO, CIRCA, and MicroCause via standard RRF formula:
     $$S_{\text{RRF}}(s) = \sum_{m \in M} \frac{1}{60 + r_m(s)}$$
   - **Empirical Performance on CPU Cohort ($N=120$):**
     - Hit@1: **0.2833** (34/120) | MRR: **0.4976**
   - **Failure Analysis:** Simple rank fusion without model calibration suffers severely from "noise contamination." Because CIRCA and MicroCause exhibit frequent caller symptom confusion (35 and 12 incidents respectively), their top-ranked downstream symptoms overpower BARO's true anomaly signal, resulting in 31 caller symptom confusion errors and severe performance degradation.

2. **Causal-Temporal Anomaly Fusion (Hybrid-CausalTemporal):**
   - Combines temporal lead-lag anomaly scores with call-graph depth weighting.
   - **Empirical Performance on CPU Cohort ($N=120$):**
     - Hit@1: **0.6250** (75/120) | MRR: **0.7581**
   - **Analysis:** Outperforms individual baselines BARO (0.6000) and MicroCause (0.5000), confirming that combining causal topology with temporal evidence is advantageous. However, lacking physical resource dominance, it still trails OSCAR-CTRCL (0.9250) by 30 percentage points.

---

## 3. Component Ablation Study ($N=120$ CPU Cohort)

To verify the necessity and individual contribution of each component in OSCAR-CTRCL, systematic ablations were conducted on the identical 120-incident CPU cohort:

| Variant | Hit@1 (CPU) | $\Delta \text{Hit@1}$ | MRR (CPU) | $\Delta \text{MRR}$ | Runtime (s) | Key Architectural Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Full OSCAR-CTRCL (Proposed)** | **0.9250** | **Baseline** | **0.9427** | **Baseline** | 0.0144 | Full combination: Distribution Shift Invariance + Physical Resource Dominance + Causal Callee Dominance |
| **Ablation: w/o Causal Topology** | 0.8917 | -0.0333 (-4 cases) | 0.9408 | -0.0019 | 0.0145 | Disables topological callee dominance and graph propagation. Reverts to resource-prioritized distribution shift. |
| **Ablation: w/o Resource Dominance** | 0.8750 | -0.0500 (-6 cases) | 0.9158 | -0.0269 | 0.0148 | Disables CPU resource metric prioritization. Treats all metric anomalies uniformly. |
| *Best Single Baseline (RCD)* | 0.8333 | -0.0917 (-11 cases) | 0.9082 | -0.0345 | 0.0160 | Standard conditional independence testing. |

### Interpretation:
1. **Physical Resource Dominance:** Provides the largest single localization lift (+0.0500 Hit@1, +0.0269 MRR). In microservice CPU exhaustion, downstream callers experience latency inflation and connection pool errors, but the faulty service alone undergoes primary saturated physical CPU utilization. Suppressing unspecific latency symptoms in favor of saturated physical metrics prevents caller misattribution.
2. **Causal Callee Dominance:** Contributes an additional +0.0333 Hit@1 lift (+4 correct localizations). When a deep dependency (e.g., `carts` in Sock Shop) exhausts CPU, its caller `front-end` experiences high latency and HTTP 500s. Topological callee dominance properly discounts the caller and boosts the leaf provider.

---

## 4. Failure Mode Decomposition ($N=150$ Evaluated Incidents)

Localization failures were classified into four mutually exclusive categories using the benchmark call-graph topology $G$:
1. **Downstream Caller Symptom Confusion:** Top-ranked candidate is an upstream client/caller of the root cause ($s_{\text{top1}} \to s_{\text{gt}}$).
2. **Upstream Callee Symptom Confusion:** Top-ranked candidate is a downstream provider/callee of the root cause ($s_{\text{gt}} \to s_{\text{top1}}$).
3. **Retrieval / Zero-Score Omission:** Ground-truth service omitted from candidate set or assigned score $\le 0$.
4. **Other Ranking Dispersion:** Failure unrelated to direct graph neighborhood.

| Method | Total Failures | Caller Symptom Errors | Callee Symptom Errors | Retrieval Omissions | Other Dispersion |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CIRCA** | 145 | **35** | 0 | 1 | 109 |
| **MicroCause** | 84 | 3 | **12** | 0 | 69 |
| **Hybrid-RRF** | 109 | **31** | 1 | 0 | 77 |
| **BARO** | 58 | 4 | 2 | 0 | 52 |
| **E-Diagnosis** | 38 | **16** | 5 | **9** | 13 |
| **Multi-Source BARO** | 35 | 1 | 1 | 1 | 32 |
| **RCD** | 24 | 5 | 3 | 1 | 15 |
| **OSCAR-CTRCL (Proposed)** | **13** | **1** | **1** | **1** | **10** |

### Key Insight:
OSCAR-CTRCL reduces topological symptom confusion to just **2 incidents** (1 caller, 1 callee), compared to **21 incidents** in E-Diagnosis, **15 incidents** in MicroCause, and **8 incidents** in RCD. This provides concrete evidence that OSCAR's callee-dominance and resource-prioritization mechanisms effectively resolve the downstream symptom discrimination challenge.
