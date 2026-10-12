# OSCAR Research Program: Statistical Analysis Plan (SAP)

## 1. Study Objectives & Primary Endpoints
*   **Primary Objective:** Determine whether OSCAR-CTRCL achieves a statistically defensible improvement in root cause localization over existing baselines on CPU failure incidents in microservices.
*   **Primary Endpoint:** **CPU Hit@1** on the complete eligible cohort of **120 CPU failure incidents** from RCAEval (75 cases in RE1, 45 cases in RE2 across Online Boutique, Sock Shop, and Train Ticket).
*   **Secondary Endpoints:**
    1.  **CPU Mean Reciprocal Rank (MRR)** on the 120 CPU incidents.
    2.  **Overall Hit@1 & MRR** across cross-fault incidents.
    3.  **Accuracy Retention Ratio** under Gaussian noise and missing telemetry perturbations.

---

## 2. Predeclared Confirmatory Hypothesis & Comparisons
*   **Primary Null Hypothesis ($H_{0,1}$):** There is no difference in the proportion of correctly localized CPU incidents (Hit@1) between OSCAR-CTRCL and the strongest baseline (RCD):
    $$H_{0,1}: P(\text{OSCAR}=1, \text{RCD}=0) = P(\text{OSCAR}=0, \text{RCD}=1)$$
*   **Secondary Null Hypothesis ($H_{0,2}$):** There is no difference in reciprocal rank distribution between OSCAR-CTRCL and RCD:
    $$H_{0,2}: \text{Median}(RR_{\text{OSCAR}} - RR_{\text{RCD}}) = 0$$

---

## 3. Statistical Testing Methodology

### 3.1 Paired Binary Outcomes (Hit@1)
*   **Contingency Table:** Formulate a $2 \times 2$ table of matched pairs:
    - $n_{11}$: Both methods correctly localize root cause at Rank 1.
    - $n_{10}$: OSCAR is correct, Baseline is incorrect (discordant pair $b$).
    - $n_{01}$: Baseline is correct, OSCAR is incorrect (discordant pair $c$).
    - $n_{00}$: Both methods fail to localize root cause at Rank 1.
*   **Exact McNemar Test:** Computed via exact two-sided binomial test on discordant pairs:
    $$\text{p-value} = \sum_{k=0}^{\min(b, c)} \binom{b+c}{k} (0.5)^{b+c} + \sum_{k=\max(b, c)}^{b+c} \binom{b+c}{k} (0.5)^{b+c}$$

### 3.2 Continuous / Ordinal Outcomes (MRR)
*   **Paired Permutation Test:** 10,000 sign-permutation resamples of paired differences $D_i = RR_{\text{OSCAR}, i} - RR_{\text{Baseline}, i}$.
*   **Wilcoxon Signed-Rank Test:** Applied to non-zero reciprocal rank differences.
*   **Effect Size:** Paired Cohen's $d_z = \frac{\bar{D}}{s_D}$.

### 3.3 Bootstrap Uncertainty Estimation
*   **Resample Count:** 10,000 bootstrap iterations.
*   **Stratification:** Stratified by microservice system (Online Boutique, Sock Shop, Train Ticket) to preserve system-level balance.
*   **Interval Construction:** 95% percentile confidence intervals $[CI_{2.5}, CI_{97.5}]$.

### 3.4 Multiple Comparison Correction
*   **Family:** Planned pairwise comparisons against the six baseline algorithms (RCD, BARO, E-Diagnosis, Multi-Source BARO, MicroCause, CIRCA).
*   **Adjustment Procedure:** Step-down Holm-Bonferroni correction to control Family-Wise Error Rate (FWER) at $\alpha = 0.05$. Both raw and adjusted p-values ($p_{adj}$) are reported.

### 3.5 Theoretical & Empirical Chance Baselines
*   For each case $i$ with candidate set size $C_i$:
    $$\text{Chance Hit@1}_i = \frac{1}{C_i}, \quad \text{Chance MRR}_i = \frac{1}{C_i} \sum_{j=1}^{C_i} \frac{1}{j}$$
    The aggregate chance baseline is the mean of per-case expectations across the evaluated cohort.
