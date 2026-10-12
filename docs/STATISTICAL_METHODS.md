# OSCAR Platform: Statistical Methods & Significance Framework

This document specifies the mathematical formulations, hypothesis testing methodologies, and uncertainty estimations utilized in the empirical evaluation of the OSCAR platform.

---

## 1. Ranking Metrics

### 1.1 Hit@K
$$\text{Hit@}K = \frac{1}{N} \sum_{i=1}^N \mathbb{I}\left[\text{Rank}_i(\text{GroundTruth}_i) \le K\right]$$
Where $N$ is the total number of evaluated incidents, and $\mathbb{I}[\cdot]$ is the indicator function returning $1$ if true and $0$ otherwise.

### 1.2 Mean Reciprocal Rank (MRR)
$$\text{MRR} = \frac{1}{N} \sum_{i=1}^N \frac{1}{\text{Rank}_i(\text{GroundTruth}_i)}$$
Assigns harmonic weight to the position of the true root cause, rewarding models that place the ground truth near the top of the candidate list even when missing rank 1.

### 1.3 Normalized Discounted Cumulative Gain (NDCG@K)
$$\text{DCG@}K = \sum_{j=1}^K \frac{2^{\text{rel}_j} - 1}{\log_2(j + 1)}, \quad \text{NDCG@}K = \frac{\text{DCG@}K}{\text{IDCG@}K}$$
In our single-ground-truth evaluation, $\text{rel}_j = 1$ if candidate $j$ is the true root cause and $0$ otherwise, meaning $\text{IDCG@}K = 1.0$ for all $K \ge 1$.

---

## 2. Hypothesis Testing: Paired Comparison via McNemar's Test

### 2.1 Contingency Table Construction
When comparing two algorithms $A$ (OSCAR-CTRCL) and $B$ (RCD) evaluated on the identical set of $N$ benchmark incidents, the binary outcome (Hit@1 Success vs. Miss) produces a $2 \times 2$ paired contingency table:

```
                            Model B Correct    Model B Incorrect    Total
Model A Correct                    a                   b            a + b
Model A Incorrect                  c                   d            c + d
Total                            a + c               b + d            N
```

- $a$: Both models correct (concordant)
- $b$: Model A correct, Model B incorrect (discordant)
- $c$: Model B correct, Model A incorrect (discordant)
- $d$: Both models incorrect (concordant)

### 2.2 Exact Binomial McNemar Test Formulation
Under the null hypothesis $H_0$, both models have identical marginal probabilities of success, meaning each discordant pair is equally likely to favor Model A or Model B ($p = 0.5$).
Let $n = b + c$ be the total number of discordant pairs. The number of pairs favoring Model A follows a binomial distribution:
$$X \sim \text{Binomial}(n, 0.5)$$

For our observed values ($b = 18, c = 7, n = 25$):
$$p = 2 \times \sum_{k=\max(b, c)}^n \binom{n}{k} (0.5)^n = 2 \times \sum_{k=18}^{25} \binom{25}{k} (0.5)^{25} = 0.043285$$

Because $p = 0.043285 < 0.05$, the null hypothesis is rejected at significance level $\alpha = 0.05$.

---

## 3. Multiple Testing Correction: Holm-Bonferroni Method

When conducting multiple pairwise hypothesis tests (e.g., comparing OSCAR-CTRCL against all 6 baselines simultaneously), Family-Wise Error Rate (FWER) inflation must be controlled.

Given $m$ hypotheses with ordered raw p-values $p_{(1)} \le p_{(2)} \le \dots \le p_{(m)}$:
1. Compare $p_{(k)}$ to the adjusted threshold $\alpha / (m - k + 1)$ for $k = 1, 2, \dots, m$.
2. Reject $H_{(k)}$ if $p_{(k)} \le \alpha / (m - k + 1)$ and all preceding $H_{(j)}$ ($j < k$) were rejected.
3. Once a test fails to reject, stop and accept all remaining null hypotheses.

---

## 4. Uncertainty Estimation: Stratified Paired Bootstrap

To compute 95% Confidence Intervals for metric differences ($\Delta \text{Hit@1}$ and $\Delta \text{MRR}$):
1. **Resampling Unit:** Entire incident cases (preserving paired correlation between models).
2. **Stratification:** Stratified across benchmark systems (Train-Ticket, Online-Boutique, etc.) to maintain dataset balance.
3. **Resampling Size:** $B = 2,000$ bootstrap iterations with replacement.
4. **Confidence Interval Extraction:** Percentile method:
   $$\text{CI}_{95\%} = \left[ \theta^*_{(0.025 \cdot B)}, \theta^*_{(0.975 \cdot B)} \right]$$
