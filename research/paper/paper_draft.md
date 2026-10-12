# Evaluating and Improving CPU-Centric Root Cause Localization in Microservice Systems Through Causal-Temporal and Multi-Source Hybrid Methods

**Authors:** OSCAR Research Program  
**Affiliation:** Systems and Software Engineering Laboratory  
**Target Venue:** IEEE Transactions on Software Engineering (TSE) / ACM Transactions on Software Engineering and Methodology (TOSEM)  
**Artifact Repository:** `https://github.com/Loki3306/OSCAR-sim/tree/main/research`

---

## Abstract
Root Cause Analysis (RCA) in distributed microservice architectures is fundamental to rapid incident remediation and site reliability engineering. During physical resource exhaustion—such as container CPU starvation—complex call topologies induce cascading performance degradation, manifesting as thread pool exhaustion, transit queuing delay, and elevated latency across upstream caller services. Existing state-of-the-art RCA methods either rely solely on statistical change-point detection (frequently mistaking downstream caller symptoms for root causes) or attempt unconstrained observational causal discovery (which suffers from graph estimation instability and high computational overhead on short, non-stationary incident windows).

In this work, we present an empirical research program evaluating six established baseline RCA algorithms (**BARO**, **CIRCA**, **RCD**, **MicroCause**, **$\epsilon$-Diagnosis**, and **Multi-Source BARO**) across the authentic **RCAEval** benchmark comprising 735 failure cases across three enterprise microservice testbeds (*Online Boutique*, *Sock Shop*, and *Train Ticket*). We focus systematically on the complete eligible cohort of **120 authentic CPU-exhaustion incidents** where cascading downstream failure is most acute, evaluating all cases without subsampling. Guided by empirical error decomposition, we propose **OSCAR-CTRCL** (*Causal Topology Resource Correlation Localization*), a novel framework integrating: (1) localized distribution shift invariance via Wasserstein-1 quantile drift, (2) physical resource dominance that prioritizes saturated container hardware counters above secondary operational symptoms, and (3) topological causal callee dominance that dampens caller services suffering from downstream backpressure.

On the full, matched 120-incident CPU cohort, OSCAR-CTRCL achieves **0.925 Hit@1** (111/120 cases correct) and **0.943 MRR**, outperforming the strongest baseline (**RCD** at 0.833 Hit@1 and 0.908 MRR; **Multi-Source BARO** at 0.758 Hit@1; **BARO** at 0.600 Hit@1). A confirmatory exact McNemar test on paired binary localization outcomes demonstrates that OSCAR-CTRCL achieves statistically significant superiority over RCD ($n_{11}=93, n_{10}=18, n_{01}=7, n_{00}=2$; two-sided exact binomial $p = 0.0433$), surviving Holm-Bonferroni multiple-comparison correction across all six baseline contrasts. On continuous reciprocal rank (MRR), OSCAR-CTRCL achieves a positive margin of $+0.0345$ ($p = 0.174$, paired permutation test), while RCD maintains strong Top-3 coverage (Hit@3 of 0.983 vs. 0.950). Mechanistic failure decomposition reveals that OSCAR-CTRCL reduces topological caller/callee symptom confusion from 21 incidents in $\epsilon$-Diagnosis and 8 incidents in RCD down to just 2 incidents. Component ablations confirm that physical resource dominance and causal callee dominance contribute $+0.050$ and $+0.033$ Hit@1 respectively. Controlled stress-testing across an $N=60$ multi-system cohort demonstrates zero degradation under Gaussian measurement noise ($\sigma \le 0.50$), with graceful degradation under up to 25% random telemetry loss. All code, data manifests, per-case predictions, and statistical test scripts are released in our reproducible research artifact package.

---

## 1. Introduction
Modern enterprise web applications are increasingly structured as distributed microservices deployed across containerized clusters. While microservice architectures provide deployment agility and elastic scaling, they introduce severe operational complexity during production incidents. A localized resource saturation fault—such as CPU exhaustion induced by unindexed database lookups, thread contention, or container CPU throttling—propagates rapid degradation across upstream caller chains within seconds.

When site reliability engineers (SREs) or automated incident triage pipelines inspect telemetry streams, upstream calling services frequently exhibit larger normalized shifts in transit latency and HTTP 5xx error rates than the original faulty service exhibits in raw resource utilization. This phenomenon—which we define as the **Downstream Cascade Inversion Problem**—causes diagnostic tools to misidentify healthy caller services as the root cause.

### 1.1 Limitations of Existing RCA Paradigms
Prior research in microservice RCA broadly divides into three paradigms:
1.  **Metric-Based Statistical Anomaly Detection (e.g., BARO [Wang et al., ICSE 2024]):** Methods utilizing Bayesian Online Change-Point Detection (BOCPD) and kurtosis anomaly scoring rank candidate metrics by distributional divergence. However, operating without topology awareness, they frequently rank downstream latency spikes above upstream CPU starvation.
2.  **Causal Discovery & Invariance Testing (e.g., CIRCA [Li et al., EuroSys 2022], RCD [Ikram et al., NeurIPS/FSE]):** Methods estimating conditional independence or structural equation models from time series. While topologically grounded, learning causal graphs from collinear microservice telemetry is vulnerable to matrix singularity; furthermore, as documented in benchmark release updates, unregularized regression implementations can silently fall back to dataframe schema column order.
3.  **Graph Random Walks (e.g., $\epsilon$-Diagnosis [Chen et al., IEEE TC 2019]):** Algorithms propagating anomaly weights across service dependency graphs via PageRank. While robust to random noise, they suffer from structural bias, concentrating probability mass on high-degree ingress gateway hubs.

### 1.2 Contributions of This Study
To address these limitations with rigorous empirical validation, this study makes four primary contributions:
1.  **Independent Benchmark Audit & Full-Cohort Evaluation:** We conduct an independent audit of the 735-case RCAEval benchmark, identify the complete eligible cohort of 120 CPU exhaustion incidents across Online Boutique, Sock Shop, and Train Ticket, and evaluate all 120 cases without sampling bias.
2.  **Baseline Fidelity Audit & Implementation Fixes:** We audit six established baseline adapters against official benchmark code, identifying and resolving silent column-order fallback vulnerabilities in regression and PageRank solvers via Ridge regularization ($L_2$ penalty $\alpha=10^{-3}$) and score-tie detection.
3.  **The OSCAR-CTRCL Framework:** We introduce a causal-temporal localization framework combining localized distribution shift invariance, physical resource dominance, and causal callee dominance to suppress downstream symptom confusion.
4.  **Rigorous Confirmatory Statistics & Failure Decomposition:** We replace heuristic significance claims with exact McNemar tests on paired binary outcomes, continuous paired permutation tests, 10,000-resample stratified bootstrap confidence intervals, and Holm-Bonferroni correction. We introduce a retrieval vs. ranking failure decomposition that mechanistically explains why OSCAR-CTRCL succeeds and delineates its operational trade-offs under severe telemetry loss.

---

## 2. Research Questions
Our empirical study investigates five specific research questions:
*   **RQ1 (Comparative Accuracy):** How accurately does OSCAR-CTRCL localize the root-cause service on the full eligible CPU failure cohort compared to faithfully reproduced baselines?
*   **RQ2 (Statistical Defensibility):** Does the observed localization gain achieve statistical significance under exact paired contingency testing and multiple-comparison adjustment?
*   **RQ3 (Mechanistic Error Decomposition):** Does OSCAR-CTRCL effectively suppress downstream caller and upstream callee symptom confusion compared to competing baselines?
*   **RQ4 (Component Value):** What are the individual contributions of physical resource dominance and causal callee dominance?
*   **RQ5 (Degradation Robustness):** How resilient is root cause localization under Gaussian measurement noise and random telemetry omission across heterogeneous microservice topologies?

---

## 3. The OSCAR-CTRCL Methodology

### 3.1 Problem Formulation
Let a distributed microservice application consist of $M$ services $\mathcal{S} = \{s_1, \dots, s_M\}$ communicating according to a service dependency directed acyclic graph $G = (\mathcal{S}, \mathcal{E})$, where directed edge $(u, v) \in \mathcal{E}$ indicates that service $u$ calls service $v$. Telemetry data consists of continuous multivariate time series $\mathbf{X}(t) = [x_m(s, t)]$ observed over a reference window $t \in [T_0 - W, T_0)$ and an incident window $t \in [T_0, T_0 + W]$, where $T_0$ is the fault injection timestamp and $W = 300\text{s}$. The metric set is partitioned into *Physical Resource Metrics* $\mathcal{R} = \{\text{cpu}, \text{mem}, \text{disk}\}$ and *Operational Symptom Metrics* $\mathcal{S}_{\text{symp}} = \{\text{latency}, \text{error}, \text{qps}\}$. The objective is to produce a ranking $(s_{(1)}, s_{(2)}, \dots, s_{(M)})$ maximizing Top-1 localization accuracy ($\text{Hit@1} = \mathbb{I}[s_{(1)} = s^*]$) and Mean Reciprocal Rank ($\text{MRR} = 1/\text{rank}(s^*)$).

### 3.2 Algorithmic Stages
OSCAR-CTRCL executes in three coordinated stages:

#### Stage 1: Localized Distribution Shift Invariance (DSI)
Rather than relying on parametric mean-variance thresholds, we quantify distributional anomaly divergence using the empirical two-sample Wasserstein-1 distance across standardized pre- and post-incident windows:
$$\mathcal{D}(s, m) = \int_0^1 |F_{\text{post}}^{-1}(u; s, m) - F_{\text{pre}}^{-1}(u; s, m)| \, du$$
This non-parametric quantile formulation is invariant to monotonic signal scaling and cancels out symmetric zero-mean measurement noise over the observation window.

#### Stage 2: Physical Resource Dominance (PRD)
To prevent downstream latency victims from overpowering the root cause, metrics are weighted by hardware domain specificity:
$$\mathcal{A}_{\text{res}}(s) = \max_{m \in \mathcal{R}(s)} \mathcal{D}(s, m), \quad \mathcal{A}_{\text{symp}}(s) = \max_{m \in \mathcal{S}_{\text{symp}}(s)} \mathcal{D}(s, m)$$
The composite anomaly score assigns primary mass to physical saturation:
$$\mathcal{S}_{\text{raw}}(s) = w_{\text{res}} \cdot \mathcal{A}_{\text{res}}(s) + w_{\text{symp}} \cdot \mathcal{A}_{\text{symp}}(s)$$
with $w_{\text{res}} = 0.75, w_{\text{symp}} = 0.25$.

#### Stage 3: Causal Callee Dominance Rule (CCD)
When callee $v \in \text{Succ}(u)$ suffers CPU exhaustion, caller $u \in \text{Pred}(v)$ experiences transit queue backup. We inspect the call graph $G$:
$$\mathcal{S}_{\text{CTRCL}}(s) = \mathcal{S}_{\text{raw}}(s) \cdot \prod_{v \in \text{Succ}(s)} \left(1 + \beta \cdot \max(0, \mathcal{A}_{\text{res}}(v) - \mathcal{A}_{\text{res}}(s))\right)^{-1}$$
where $\beta = 1.2$ penalizes caller $s$ whenever its callee $v$ exhibits equal or higher physical resource saturation. This guarantees that blame flows toward the leaf provider rather than accumulating at the ingress client.

---

## 4. Empirical Evaluation & Findings

### 4.1 Comparative Accuracy on the Full CPU Cohort (RQ1)
Table 1 presents the empirical evaluation across the complete, matched 120 CPU cases from RCAEval.

**Table 1: Confirmatory Evaluation on the Full Eligible CPU Cohort ($N=120$)**
| Method | CPU Sample Size $N$ | Hit@1 (CPU) | 95% Bootstrap CI | Hit@3 (CPU) | MRR (CPU) | 95% Bootstrap CI | Overall Hit@1 ($N=150$) | Overall MRR ($N=150$) | Mean Runtime (s) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **OSCAR-CTRCL (Proposed)** | **120** | **0.9250** | **[0.875, 0.967]** | **0.9500** | **0.9427** | **[0.901, 0.974]** | **0.9133** | **0.9345** | **0.0144** |
| **RCD** (Ikram et al.) | 120 | 0.8333 | [0.767, 0.892] | **0.9833** | 0.9082 | [0.865, 0.945] | 0.8400 | 0.9087 | 0.0160 |
| **Multi-Source BARO** (2024) | 120 | 0.7583 | [0.683, 0.825] | 0.9167 | 0.8449 | [0.793, 0.892] | 0.7667 | 0.8532 | 0.0104 |
| **E-Diagnosis** (Shan et al.) | 120 | 0.7083 | [0.625, 0.783] | 0.8833 | 0.7994 | [0.739, 0.853] | 0.7133 | 0.8021 | 0.0210 |
| **Hybrid-CausalTemporal** | 120 | 0.6250 | [0.533, 0.708] | 0.8667 | 0.7581 | [0.693, 0.819] | 0.6467 | 0.7704 | 0.0099 |
| **BARO** (Wang et al.) | 120 | 0.6000 | [0.508, 0.683] | 0.9000 | 0.7589 | [0.697, 0.817] | 0.6133 | 0.7647 | 0.0768 |
| **MicroCause** (Meng et al.) | 120 | 0.5000 | [0.408, 0.583] | 0.7750 | 0.6692 | [0.600, 0.735] | 0.4400 | 0.6107 | 0.2058 |
| **Hybrid-RRF** | 120 | 0.2833 | [0.208, 0.367] | 0.6000 | 0.4976 | [0.428, 0.566] | 0.2733 | 0.4896 | 0.2958 |
| **CIRCA** (Li et al.) | 120 | 0.0333 | [0.008, 0.067] | 0.0833 | 0.1504 | [0.098, 0.209] | 0.0333 | 0.1587 | 0.0133 |
| *Theoretical Random Chance* | 120 | 0.0812 | - | 0.2436 | 0.2307 | - | 0.0812 | 0.2307 | - |

---

### 4.2 Confirmatory Statistical Significance Testing (RQ2)
To establish whether the $+9.17$ percentage point improvement over RCD is statistically defensible, we constructed paired $2 \times 2$ contingency tables for all six baseline contrasts on the matched 120 incidents:

**Table 2: Confirmatory Exact McNemar Tests on Matched Binary Hit@1 Outcomes ($N=120$)**
| Comparison | $n_{11}$ | $n_{10}$ (OSCAR Wins) | $n_{01}$ (Base Wins) | $n_{00}$ | Exact McNemar $p_{\text{raw}}$ | Holm Multiplier | Holm-Adjusted $p_{\text{adj}}$ | Confirmatory Significance ($\alpha=0.05$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **OSCAR vs. RCD** | 93 | 18 | 7 | 2 | **0.043285** | 1 | **0.043285** | **YES ($p_{\text{adj}} < 0.05$)** |
| **OSCAR vs. Multi-Source BARO** | 85 | 26 | 6 | 3 | $5.3505 \times 10^{-4}$ | 2 | $1.0701 \times 10^{-3}$ | **YES ($p_{\text{adj}} < 0.01$)** |
| **OSCAR vs. E-Diagnosis** | 85 | 26 | 0 | 9 | $2.9802 \times 10^{-8}$ | 3 | $8.9407 \times 10^{-8}$ | **YES ($p_{\text{adj}} < 0.001$)** |
| **OSCAR vs. BARO** | 70 | 41 | 2 | 7 | $2.1532 \times 10^{-10}$ | 4 | $8.6129 \times 10^{-10}$ | **YES ($p_{\text{adj}} < 0.001$)** |
| **OSCAR vs. MicroCause** | 55 | 56 | 5 | 4 | $5.6456 \times 10^{-12}$ | 5 | $2.8228 \times 10^{-11}$ | **YES ($p_{\text{adj}} < 0.001$)** |
| **OSCAR vs. CIRCA** | 1 | 110 | 3 | 6 | $4.6334 \times 10^{-29}$ | 6 | $2.7800 \times 10^{-28}$ | **YES ($p_{\text{adj}} < 0.001$)** |

**Secondary Continuous MRR Ranking Analysis:**
- Paired difference in MRR over RCD: $+0.0345$ ($0.9427$ vs. $0.9082$).
- Wilcoxon signed-rank test: $p = 0.5847$.
- 10,000-iteration paired permutation test: $p = 0.1737$.
- Paired Cohen's $d_z$: $0.126$.
- **Nuanced Finding:** OSCAR-CTRCL achieves statistically significant superiority over RCD in Top-1 Localization Accuracy ($\text{Hit@1}$), successfully winning 18 cases where RCD fails while losing only 7 ($p = 0.0433$). However, on Top-3 recall, RCD remains exceptionally competitive (0.983 vs. 0.950), resulting in an MRR difference that does not achieve statistical significance.

---

### 4.3 Retrieval vs. Ranking Failure Decomposition (RQ3)
We categorized every incorrect prediction across the 150 evaluated benchmark incidents into four mechanistic failure classes:

**Table 3: Mechanistic Failure Decomposition across Benchmark Incidents ($N=150$)**
| Method | Total Failures | Caller Symptom Confusion | Callee Symptom Confusion | Retrieval Omission | Other Dispersion |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **CIRCA** | 145 | **35** | 0 | 1 | 109 |
| **MicroCause** | 84 | 3 | **12** | 0 | 69 |
| **Hybrid-RRF** | 109 | **31** | 1 | 0 | 77 |
| **BARO** | 58 | 4 | 2 | 0 | 52 |
| **E-Diagnosis** | 38 | **16** | 5 | **9** | 13 |
| **Multi-Source BARO** | 35 | 1 | 1 | 1 | 32 |
| **RCD** | 24 | 5 | 3 | 1 | 15 |
| **OSCAR-CTRCL (Proposed)** | **13** | **1** | **1** | **1** | **10** |

By applying Physical Resource Dominance and Causal Callee Dominance, OSCAR-CTRCL suppresses caller/callee symptom errors to just 2 incidents, whereas E-Diagnosis suffers 21 topological confusion errors and CIRCA suffers 35.

---

## 5. Component Ablations (RQ4)
Systematic component ablations on the full 120 CPU cohort:
*   **Full OSCAR-CTRCL:** Hit@1 = **0.9250** | MRR = **0.9427**
*   **Ablation: w/o Causal Callee Dominance:** Hit@1 = **0.8917** (-0.0333, -4 cases) | MRR = **0.9408**
*   **Ablation: w/o Physical Resource Dominance:** Hit@1 = **0.8750** (-0.0500, -6 cases) | MRR = **0.9158**
Both mechanisms contribute distinct, measurable value in isolating the faulty container.

---

## 6. Telemetry Degradation Stress-Testing (RQ5)
Evaluating across a stratified $N=60$ multi-system cohort (20 Online Boutique, 20 Sock Shop, 20 Train Ticket):

### 6.1 Gaussian Measurement Noise ($\sigma \in [0.0, 0.5]$)
*   **OSCAR-CTRCL:** Maintains **0.9000 Hit@1** across all noise levels ($\sigma = 0.0, 0.1, 0.25, 0.50$) with zero performance degradation. The integral quantile formulation of Wasserstein-1 distance cancels out zero-mean noise.
*   **RCD:** Drops from 0.8833 at $\sigma = 0.0$ to 0.8167 at $\sigma = 0.50$ (-7.5% degradation).
*   **BARO:** Fluctuates from 0.5667 to 0.6333.

### 6.2 Telemetry Missingness ($d \in [0.0, 0.5]$)
*   At 10% metric omission: OSCAR-CTRCL achieves **0.8833** vs. RCD's 0.8500.
*   At 25% metric omission: OSCAR-CTRCL achieves **0.8667** vs. RCD's 0.8500.
*   At 50% metric omission: RCD achieves **0.8000** vs. OSCAR-CTRCL's **0.7333**.
*   **Operational Trade-Off:** When 50% of telemetry metrics are dropped, OSCAR-CTRCL's resource dominance module occasionally loses the specific container CPU counters, forcing a fallback to unweighted distribution shifts. In contrast, RCD's phase space embeddings across all surviving nodes offer higher resilience under catastrophic metric omission.

---

## 7. Threats to Validity
1.  **Construct Validity:** Evaluating localization quality via Hit@1 and MRR is standard in AIOps. The theoretical chance baseline ($1/N \approx 0.081$) confirms that observed gains reflect genuine causal localization.
2.  **Internal Validity:** Fixed random seeds guarantee 100% deterministic reproducibility. Pre-incident baselines were fitted strictly on pre-fault windows ($t < T_0$), preventing lookahead bias.
3.  **External Validity:** While the 120 cases span three enterprise microservice testbeds (10 to 40+ microservices), they are controlled benchmark injections. Validating on unconstrained production outages with gradual memory leaks remains an important avenue for future research.

---

## 8. Conclusion
Through an independent empirical audit and expanded experimental campaign on the full 120-incident CPU cohort of RCAEval, we established that **OSCAR-CTRCL** achieves statistically significant superiority in Top-1 root-cause localization over existing state-of-the-art baselines ($p = 0.0433$ vs. RCD; $p < 0.001$ vs. BARO). Mechanistic failure decomposition confirms that combining physical resource dominance with causal callee dominance suppresses downstream symptom confusion, delivering high precision under measurement noise.
