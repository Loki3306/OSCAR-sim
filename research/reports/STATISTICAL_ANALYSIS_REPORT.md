# OSCAR Empirical Research: Confirmatory Statistical Analysis Report

## 1. Executive Summary & Predeclared Endpoints

This report documents the confirmatory statistical evaluation of the proposed **OSCAR-CTRCL** (Causal Topology Resource Correlation Localization) framework against six baseline methods and two hybrid baselines on the **full, eligible 120-incident CPU failure cohort** of the RCAEval benchmark.

### Predeclared Analysis Protocol:
- **Primary Endpoint:** CPU Localization Accuracy ($\text{Hit@1}$) evaluated on the complete eligible CPU ground-truth cohort ($N=120$).
- **Primary Hypothesis $H_1$:** OSCAR-CTRCL achieves superior $\text{Hit@1}$ compared to the strongest baseline (RCD) on paired binary localization outcomes.
- **Statistical Test for Primary Endpoint:** Exact McNemar Test ($2 \times 2$ contingency table with two-sided binomial calculation).
- **Multiple Comparisons Adjustment:** Holm-Bonferroni step-down correction across the confirmatory family of six baseline contrasts ($\alpha = 0.05$).
- **Key Secondary Endpoint:** Mean Reciprocal Rank (MRR) evaluated via two-sided Wilcoxon signed-rank tests and 10,000-iteration paired permutation tests.
- **Uncertainty Estimation:** 10,000-resample Stratified Bootstrap 95% Confidence Intervals stratified across microservice systems (Online Boutique, Sock Shop, Train Ticket).

---

## 2. Confirmatory Evaluation Results on the Full CPU Cohort ($N=120$)

| Method | CPU Sample Size $N$ | Hit@1 (CPU) | 95% Bootstrap CI (Hit@1) | Hit@3 (CPU) | MRR (CPU) | 95% Bootstrap CI (MRR) | Overall Hit@1 ($N=150$) | Overall MRR ($N=150$) | Mean Runtime (s) |
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

## 3. Confirmatory Paired Statistical Significance Tests

### 3.1 Primary Endpoint: Exact McNemar Test on Hit@1 ($2 \times 2$ Contingency)
For paired binary localization outcomes on the matched $N=120$ cases:
- $n_{11}$: Both methods correct
- $n_{10}$: OSCAR-CTRCL correct, Baseline incorrect (OSCAR Wins)
- $n_{01}$: Baseline correct, OSCAR-CTRCL incorrect (Baseline Wins)
- $n_{00}$: Both methods incorrect

| Comparison | $n_{11}$ | $n_{10}$ (Wins) | $n_{01}$ (Losses) | $n_{00}$ | Exact McNemar $p_{\text{raw}}$ | Holm Multiplier | Holm-Adjusted $p_{\text{adj}}$ | Significant ($\alpha=0.05$)? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OSCAR vs. RCD** | 93 | 18 | 7 | 2 | **0.043285** | 1 | **0.043285** | **YES (Statistically Significant)** |
| **OSCAR vs. Multi-Source BARO** | 85 | 26 | 6 | 3 | $5.3505 \times 10^{-4}$ | 2 | $1.0701 \times 10^{-3}$ | **YES (Statistically Significant)** |
| **OSCAR vs. E-Diagnosis** | 85 | 26 | 0 | 9 | $2.9802 \times 10^{-8}$ | 3 | $8.9407 \times 10^{-8}$ | **YES (Statistically Significant)** |
| **OSCAR vs. BARO** | 70 | 41 | 2 | 7 | $2.1532 \times 10^{-10}$ | 4 | $8.6129 \times 10^{-10}$ | **YES (Statistically Significant)** |
| **OSCAR vs. MicroCause** | 55 | 56 | 5 | 4 | $5.6456 \times 10^{-12}$ | 5 | $2.8228 \times 10^{-11}$ | **YES (Statistically Significant)** |
| **OSCAR vs. CIRCA** | 1 | 110 | 3 | 6 | $4.6334 \times 10^{-29}$ | 6 | $2.7800 \times 10^{-28}$ | **YES (Statistically Significant)** |

> [!IMPORTANT]
> **Resolution of Pilot Controversy:**
> In the 40-case pilot, the comparison between OSCAR-CTRCL and RCD yielded $n_{10}=3, n_{01}=0$, which produced an exact McNemar $p = 0.25$ (insufficient sample size to reject the null hypothesis).
> Upon evaluating the **complete 120-incident CPU cohort**, the discordant pairs expand to **18 wins vs. 7 losses** ($b=18, c=7, b+c=25$). The two-sided exact binomial test yields **$p = 0.0433$**, which survives Holm-Bonferroni correction ($p_{\text{adj}} = 0.0433 < 0.05$).
> Statistical superiority of OSCAR-CTRCL over RCD on CPU $\text{Hit@1}$ is empirically verified on the full cohort.

---

### 3.2 Key Secondary Endpoint: Paired Continuous Ranking Tests on MRR

| Comparison | MRR Mean Difference | Wilcoxon Signed-Rank $p$ | 10,000-Permutation $p$ | Paired Cohen's $d_z$ | Interpretation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **OSCAR vs. RCD** | **+0.0345** | 0.5847 | 0.1737 | 0.126 | Positive trend; not statistically significant on MRR |
| **OSCAR vs. Multi-Source BARO** | **+0.0978** | $6.66 \times 10^{-3}$ | $1.90 \times 10^{-3}$ | 0.295 | Statistically significant improvement |
| **OSCAR vs. E-Diagnosis** | **+0.1434** | $4.91 \times 10^{-7}$ | $< 1.0 \times 10^{-4}$ | 0.536 | Statistically significant improvement |
| **OSCAR vs. BARO** | **+0.1838** | $1.42 \times 10^{-7}$ | $< 1.0 \times 10^{-4}$ | 0.576 | Statistically significant improvement |
| **OSCAR vs. MicroCause** | **+0.2735** | $6.63 \times 10^{-9}$ | $< 1.0 \times 10^{-4}$ | 0.662 | Statistically significant improvement |
| **OSCAR vs. CIRCA** | **+0.7924** | $2.06 \times 10^{-20}$ | $< 1.0 \times 10^{-4}$ | 2.363 | Statistically significant improvement |

### Critical Analysis of RCD Contrast:
- **Hit@1 (Top-1 localization):** OSCAR-CTRCL achieves a net $+9.17$ percentage point gain (111 vs 100 cases correct), with 18 wins vs 7 losses ($p = 0.0433$).
- **Hit@3 / MRR (Top-K localization):** RCD achieves Hit@3 of 0.9833 (118/120 cases in top-3) versus OSCAR's 0.9500 (114/120 in top-3). RCD places almost all ground-truth causes within the top-3 through broad conditional independence testing, but OSCAR-CTRCL is more precise at placing the actual culprit at rank 1 due to physical resource dominance.
- **Reporting Invariant:** This nuanced distinction must be presented honestly in the paper draft. OSCAR-CTRCL is superior at Top-1 precision, while RCD remains highly competitive at Top-3 recall.

---

## 4. Stratified Uncertainty & Cluster Limitations
- **Stratification:** Stratified bootstrap resampling across the three benchmark systems (Online Boutique, Sock Shop, Train Ticket) confirms that confidence intervals remain bounded ($[0.875, 0.967]$ for OSCAR-CTRCL).
- **Cluster Awareness:** Because RCAEval contains 3 systems, the number of system-level clusters is small ($K=3$). While incidents within systems feature distinct microservices and independent fault injections, population-level inference to arbitrary, unobserved microservice architectures must be stated as an external validity threat.
