# OSCAR Research Program: Research Questions & Protocol Specification

## Overview
This document specifies the research questions (RQ1–RQ6), operational definitions, hypotheses, experimental variables, metrics, and statistical hypothesis testing protocol for the OSCAR Root Cause Analysis (RCA) research program.

---

## RQ1: Baseline Performance on Microservice Fault Localization
*   **Question:** Which established RCA methods perform best at identifying root causes (faulty service and metric) across benchmark microservice telemetry?
*   **Hypothesis ($H_1$):** Statistical anomaly methods (such as BARO) achieve higher Top-1 accuracy on rapid onset resource spikes, whereas causal graph discovery methods (CIRCA, RCD) perform more consistently across structural dependencies, but degrade when telemetry dimensionality is high.
*   **Independent Variables:** RCA algorithm (BARO, CIRCA, RCD, MicroCause, $\epsilon$-Diagnosis, Multi-Source BARO).
*   **Dependent Variables:** Hit@1, Hit@3, Hit@5, Mean Reciprocal Rank (MRR), NDCG@K, Runtime per incident (seconds).
*   **Experimental Unit:** Single failure incident (with fixed observation window and ground-truth label).
*   **Statistical Analysis:** Paired bootstrap differences (1,000 resamples), Wilcoxon signed-rank test ($\alpha = 0.05$).
*   **Rejection Condition:** $H_{1,0}$ (no difference between algorithms) is rejected if $p < 0.05$ with non-overlapping 95% bootstrap confidence intervals.

---

## RQ2: Performance Variation Across Fault Categories, Systems, and Modalities
*   **Question:** How does RCA localization accuracy vary by fault category (CPU vs. Memory vs. Disk vs. Network Delay/Loss vs. Socket), microservice system (Online Boutique vs. Sock Shop vs. Train Ticket), and telemetry modality?
*   **Hypothesis ($H_2$):** CPU exhaustion exhibits pronounced cascading effects into downstream latency and queue length, causing purely correlational methods to mistake victim services for root causes.
*   **Sub-Analysis:** Dedicated evaluation on the CPU fault subset (75 cases in RE1, 45 cases in RE2, total 120 cases).
*   **Metrics:** Per-category Hit@1, Hit@3, MRR; Per-system Hit@1, Hit@3, MRR.
*   **Chance Baseline:** $1/N_s$ where $N_s$ is the number of services in the system candidate set.

---

## RQ3: Synergy in Hybrid RCA Methods
*   **Question:** Can hybrid methods combining statistical anomaly detection, causal dependency graphs, and multi-source signals outperform their individual constituent methods?
*   **Hypothesis ($H_3$):** Combining temporal change-point detection with causal topological propagation yields a statistically significant improvement ($\ge 15\%$ relative gain in Hit@1) over any single baseline constituent.
*   **Hybrids Tested:**
    1.  *Rank Fusion (RRF):* Reciprocal Rank Fusion combining top statistical and causal rankings.
    2.  *Causal-Temporal Hybrid:* Propagating anomaly change-point timestamps along dependency edges.
    3.  *Multimodal Late Fusion:* Calibrated ensemble combining metric anomaly ranks with log/trace evidence.
*   **Comparison Groups:** Constituent baseline vs. Hybrid counterpart on identical eligible cases.

---

## RQ4: Value of Causal, Temporal, and Cross-Modal Evidence Sources
*   **Question:** Does adding temporal change-point ordering, causal directionality, and log/trace telemetry measurably improve localization precision?
*   **Hypothesis ($H_4$):** Temporal change-point sequencing effectively filters out downstream symptom cascades, yielding the highest single-component marginal improvement in Hit@1 for CPU incidents.
*   **Ablation Design:**
    *   Full Proposed OSCAR-CTRCL
    *   w/o Temporal Changepoint Ordering
    *   w/o Causal Graph Directionality
    *   w/o Multi-metric Entropy Weighting
    *   w/o Multimodal Log/Trace signals

---

## RQ5: Robustness to Telemetry Degradation
*   **Question:** How resilient are RCA algorithms to missing telemetry, measurement noise, and downsampled telemetry frequencies?
*   **Perturbation Protocol:**
    1.  *Missing Metrics:* Randomly dropping 10%, 25%, 50% of available metric columns.
    2.  *Gaussian Telemetry Noise:* Adding zero-mean Gaussian noise $\mathcal{N}(0, \sigma^2)$ with $\sigma \in \{0.1, 0.25, 0.5\} \times \text{std}(X)$.
    3.  *Downsampling:* Subsampling telemetry intervals by factors of $2\times, 3\times, 5\times$.
*   **Metric:** Relative performance retention ratio $\text{Retention} = \text{Hit@1}_{\text{perturbed}} / \text{Hit@1}_{\text{clean}}$.

---

## RQ6: Benchmark Generalization and Negative Results
*   **Question:** Does the proposed method generalize across diverse microservice topologies and independent systems without hyperparameter re-tuning?
*   **Verification:** Cross-system transfer evaluation across Online Boutique, Sock Shop, and Train Ticket (10 to 40 services), recording all failure cases, unresolvable ambiguities, and negative results.
