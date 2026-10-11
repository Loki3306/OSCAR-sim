# Telemetry Degradation & Empirical Robustness Report

## 1. Executive Summary & Reconciliation of Pilot Sample Size

This report audits the robustness of Root Cause Analysis algorithms under controlled measurement noise and telemetry missingness, reconciling historical pilot claims and presenting verified multi-system evaluations across $N=60$ benchmark cases (20 Online Boutique, 20 Sock Shop, 20 Train Ticket).

### 1.1 Resolution of the "0.960 Hit@1" Claim Discrepancy
- **Audit Finding:** In the initial walkthrough draft, a Hit@1 of 0.960 was reported under low noise. Because the primary CPU table evaluated 40 cases (steps of 0.025) and the overall table evaluated 60 cases (steps of 0.0167), 0.960 was mathematically incompatible with both stated sample sizes.
- **Root Cause & Code Provenance:** Inspection of `research/experiments/run_robustness_experiment.py` revealed that the pilot script was parameterized with `num_cases: int = 25`. At noise level $\sigma = 0.0$, OSCAR-CTRCL successfully localized **24 out of 25 cases** ($24/25 = 0.9600$). The sample denominator ($N=25$) had been omitted from the walkthrough text.
- **Correction Applied:** All Phase II evaluations now enforce strict sample size reporting ($N=60$, with 20 stratified cases per system) and document all denominators explicitly.

---

## 2. Measurement Noise Resilience ($N=60$ CPU Cases)

Controlled zero-mean Gaussian noise was injected into continuous telemetry features:
$$\tilde{x}_{ij}(t) = x_{ij}(t) + \epsilon(t), \quad \epsilon(t) \sim \mathcal{N}(0, \sigma^2 \cdot \text{Var}(x_{ij}))$$
for $\sigma \in \{0.0, 0.1, 0.25, 0.5\}$.

| Noise Level $\sigma$ | Model | Sample Size $N$ | Hit@1 | Relative Degradation | MRR |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **$\sigma = 0.00$ (Clean)** | **OSCAR-CTRCL** | 60 | **0.9000** (54/60) | **0.0%** | **0.9255** |
| | RCD | 60 | 0.8833 (53/60) | 0.0% | 0.9389 |
| | BARO | 60 | 0.5667 (34/60) | 0.0% | 0.7502 |
| **$\sigma = 0.10$** | **OSCAR-CTRCL** | 60 | **0.9000** (54/60) | **0.0%** | **0.9255** |
| | RCD | 60 | 0.8833 (53/60) | 0.0% | 0.9417 |
| | BARO | 60 | 0.8833 (53/60) | +55.9%* | 0.9375 |
| **$\sigma = 0.25$** | **OSCAR-CTRCL** | 60 | **0.9000** (54/60) | **0.0%** | **0.9260** |
| | RCD | 60 | 0.8833 (53/60) | 0.0% | 0.9361 |
| | BARO | 60 | 0.8333 (50/60) | +47.1%* | 0.9089 |
| **$\sigma = 0.50$ (Extreme Noise)** | **OSCAR-CTRCL** | 60 | **0.9000** (54/60) | **0.0%** | **0.9255** |
| | RCD | 60 | 0.8167 (49/60) | -7.5% | 0.8963 |
| | BARO | 60 | 0.6333 (38/60) | +11.8% | 0.7769 |

*\*Note: In BARO, adding continuous Gaussian jitter breaks kurtosis catastrophic cancellation ties on near-constant metrics, temporarily improving ranking stability before degrading at $\sigma=0.50$.*

### Analysis:
OSCAR-CTRCL displays extraordinary measurement noise resilience, maintaining exactly **0.9000 Hit@1** from $\sigma=0.0$ to $\sigma=0.5$. Because OSCAR's distribution shift metric relies on two-sample Wasserstein-1 quantile drift between pre- and post-fault windows, high-frequency symmetric Gaussian noise averages out over the 300-second window, leaving quantile drift unaltered. In contrast, RCD's non-parametric conditional independence kernel suffers a 7.5% drop at $\sigma=0.50$.

---

## 3. Telemetry Missingness Resilience ($N=60$ CPU Cases)

To simulate Prometheus agent crashes and dropped telemetry metrics, a fraction $d \in \{0.0, 0.10, 0.25, 0.50\}$ of all metric columns was uniformly dropped at random:

| Drop Ratio $d$ | Model | Sample Size $N$ | Hit@1 | Relative Degradation | MRR |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **$d = 0.00$ (Full Telemetry)** | **OSCAR-CTRCL** | 60 | **0.9000** (54/60) | **0.0%** | **0.9255** |
| | RCD | 60 | 0.8833 (53/60) | 0.0% | 0.9389 |
| | BARO | 60 | 0.5667 (34/60) | 0.0% | 0.7502 |
| **$d = 0.10$** | **OSCAR-CTRCL** | 60 | **0.8833** (53/60) | **-1.9%** | **0.9171** |
| | RCD | 60 | 0.8500 (51/60) | -3.8% | 0.9222 |
| | BARO | 60 | 0.5500 (33/60) | -2.9% | 0.7340 |
| **$d = 0.25$** | **OSCAR-CTRCL** | 60 | **0.8667** (52/60) | **-3.7%** | **0.9097** |
| | RCD | 60 | 0.8500 (51/60) | -3.8% | 0.9222 |
| | BARO | 60 | 0.5500 (33/60) | -2.9% | 0.7514 |
| **$d = 0.50$ (Severe Telemetry Loss)** | OSCAR-CTRCL | 60 | 0.7333 (44/60) | -18.5% | 0.7935 |
| | **RCD** | 60 | **0.8000** (48/60) | **-9.4%** | **0.8479** |
| | BARO | 60 | 0.5167 (31/60) | -8.8% | 0.6819 |

### Honest Scientific Trade-Off Analysis:
- Up to 25% missing telemetry, OSCAR-CTRCL remains the top-performing algorithm (0.8667 vs. 0.8500).
- At 50% missing telemetry, RCD outperforms OSCAR-CTRCL (0.8000 vs. 0.7333).
- **Why this occurs:** OSCAR-CTRCL's physical resource dominance module specifically looks for container CPU counters (`container_cpu_usage_seconds_total`, `node_cpu_seconds_total`). If random missingness drops the CPU metrics for the faulty service, OSCAR must fall back to unweighted distribution shift. In contrast, RCD constructs phase space embeddings across whatever metrics remain, giving it greater resilience under catastrophic loss of specific metric groups.
- This constitutes a key limitation and trade-off documented for the paper.
