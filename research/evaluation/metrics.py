import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
from scipy import stats

def compute_hit_at_k(ranked_candidates: List[str], ground_truth: str, k: int) -> float:
    """Computes whether ground_truth appears in top-k ranked candidates (1.0 or 0.0)."""
    if not ranked_candidates or not ground_truth:
        return 0.0
    return 1.0 if ground_truth in ranked_candidates[:k] else 0.0

def compute_mrr(ranked_candidates: List[str], ground_truth: str) -> float:
    """Computes Reciprocal Rank (1/rank) for ground_truth in ranked_candidates."""
    if not ranked_candidates or not ground_truth:
        return 0.0
    try:
        idx = ranked_candidates.index(ground_truth)
        return 1.0 / (idx + 1)
    except ValueError:
        return 0.0

def compute_ndcg_at_k(ranked_candidates: List[str], ground_truth: str, k: int) -> float:
    """Computes Normalized Discounted Cumulative Gain at K for binary relevance."""
    if not ranked_candidates or not ground_truth:
        return 0.0
    top_k = ranked_candidates[:k]
    if ground_truth not in top_k:
        return 0.0
    rank = top_k.index(ground_truth) + 1
    dcg = 1.0 / np.log2(rank + 1)
    idcg = 1.0 / np.log2(1 + 1)
    return float(dcg / idcg)

def compute_chance_level(num_candidates: int, k: int = 1) -> float:
    """Theoretical uniform random guessing chance baseline for Hit@K."""
    if num_candidates <= 0:
        return 0.0
    return min(1.0, float(k) / float(num_candidates))

def compute_expected_mrr_chance(num_candidates: int) -> float:
    """Theoretical expected MRR under uniform random guessing: (1/N) * sum_{i=1}^N (1/i)."""
    if num_candidates <= 0:
        return 0.0
    harmonic = sum(1.0 / i for i in range(1, num_candidates + 1))
    return float(harmonic / num_candidates)

def evaluate_case(ranked_candidates: List[str], ground_truth: str, candidate_pool_size: Optional[int] = None) -> Dict[str, float]:
    """Computes all standard ranking metrics for a single evaluation case."""
    pool_size = candidate_pool_size if (candidate_pool_size and candidate_pool_size > 0) else len(ranked_candidates)
    res = {
        "hit@1": compute_hit_at_k(ranked_candidates, ground_truth, 1),
        "hit@3": compute_hit_at_k(ranked_candidates, ground_truth, 3),
        "hit@5": compute_hit_at_k(ranked_candidates, ground_truth, 5),
        "mrr": compute_mrr(ranked_candidates, ground_truth),
        "ndcg@3": compute_ndcg_at_k(ranked_candidates, ground_truth, 3),
        "chance_hit@1": compute_chance_level(pool_size, 1),
        "chance_hit@3": compute_chance_level(pool_size, 3),
        "chance_mrr": compute_expected_mrr_chance(pool_size),
    }
    return res

def compute_exact_mcnemar(y_true_a: List[float], y_true_b: List[float]) -> Dict[str, Any]:
    """
    Computes exact McNemar test on paired binary outcomes (Hit@1).
    Contingency table:
      n11: Both correct
      n10: Model A correct, Model B incorrect (discordant b)
      n01: Model B correct, Model A incorrect (discordant c)
      n00: Both incorrect
    """
    a = np.array(y_true_a, dtype=int)
    b = np.array(y_true_b, dtype=int)
    assert len(a) == len(b), "Mismatched sample lengths in paired test"
    n = len(a)

    n11 = int(np.sum((a == 1) & (b == 1)))
    n10 = int(np.sum((a == 1) & (b == 0)))
    n01 = int(np.sum((a == 0) & (b == 1)))
    n00 = int(np.sum((a == 0) & (b == 0)))

    discordant_total = n10 + n01
    if discordant_total == 0:
        p_value = 1.0
    else:
        # Exact two-sided binomial test
        binom_res = stats.binomtest(k=n10, n=discordant_total, p=0.5, alternative='two-sided')
        p_value = float(binom_res.pvalue)

    hit1_a = float(np.mean(a))
    hit1_b = float(np.mean(b))
    diff = hit1_a - hit1_b

    return {
        "contingency_table": {"n11": n11, "n10": n10, "n01": n01, "n00": n00},
        "hit1_model_a": hit1_a,
        "hit1_model_b": hit1_b,
        "absolute_difference": diff,
        "discordant_pairs": discordant_total,
        "p_value": p_value,
        "statistically_significant": bool(p_value < 0.05),
        "sample_size_n": n
    }

def compute_paired_ranking_tests(rr_a: List[float], rr_b: List[float], num_permutations: int = 10000, seed: int = 42) -> Dict[str, Any]:
    """
    Computes paired Wilcoxon signed-rank and paired permutation test on continuous Reciprocal Ranks (MRR).
    """
    a = np.array(rr_a, dtype=float)
    b = np.array(rr_b, dtype=float)
    assert len(a) == len(b), "Mismatched sample lengths"
    diff = a - b
    n = len(diff)
    mean_diff = float(np.mean(diff))

    # Wilcoxon signed-rank test on non-zero differences
    non_zero = diff[diff != 0]
    if len(non_zero) >= 5:
        try:
            w_stat, wilcoxon_p = stats.wilcoxon(diff, alternative='two-sided')
            wilcoxon_p_val = float(wilcoxon_p)
            w_statistic = float(w_stat)
        except Exception:
            wilcoxon_p_val = 1.0
            w_statistic = 0.0
    else:
        wilcoxon_p_val = 1.0
        w_statistic = 0.0

    # Paired Monte Carlo Permutation Test (10,000 permutations)
    rng = np.random.default_rng(seed=seed)
    obs_t = np.abs(np.mean(diff))
    signs = rng.choice([-1.0, 1.0], size=(num_permutations, n))
    perm_means = np.abs(np.mean(signs * diff, axis=1))
    perm_p_val = float(np.mean(perm_means >= obs_t))

    # Cohen's dz for paired observations
    std_diff = np.std(diff, ddof=1) if n > 1 else 0.0
    cohens_dz = float(mean_diff / std_diff) if std_diff > 1e-9 else 0.0

    # Bootstrap 95% CI on paired difference
    boot_diffs = [np.mean(rng.choice(diff, size=n, replace=True)) for _ in range(1000)]
    ci_95 = [float(np.percentile(boot_diffs, 2.5)), float(np.percentile(boot_diffs, 97.5))]

    return {
        "mean_mrr_a": float(np.mean(a)),
        "mean_mrr_b": float(np.mean(b)),
        "mean_difference": mean_diff,
        "ci_95": ci_95,
        "wilcoxon_statistic": w_statistic,
        "wilcoxon_p_value": wilcoxon_p_val,
        "permutation_p_value": perm_p_val,
        "cohens_dz": cohens_dz,
        "statistically_significant": bool(wilcoxon_p_val < 0.05),
        "n": n
    }

def paired_significance_test(scores_a: List[float], scores_b: List[float]) -> Dict[str, Any]:
    """Compatibility alias mapping to compute_paired_ranking_tests."""
    return compute_paired_ranking_tests(scores_a, scores_b)

def compute_stratified_bootstrap_ci(
    case_results: List[Dict[str, Any]],
    metric_key: str,
    strata_key: str = "system",
    n_resamples: int = 10000,
    seed: int = 42
) -> Tuple[float, float, float]:
    """
    Computes 10,000-resample stratified bootstrap confidence interval for a metric.
    Returns (mean, ci_lower, ci_upper).
    """
    df = pd.DataFrame(case_results)
    if df.empty or metric_key not in df.columns:
        return 0.0, 0.0, 0.0

    overall_mean = float(df[metric_key].mean())
    rng = np.random.default_rng(seed=seed)

    strata_groups = [group[metric_key].to_numpy() for _, group in df.groupby(strata_key)]
    if not strata_groups:
        strata_groups = [df[metric_key].to_numpy()]

    boot_means = np.empty(n_resamples)
    for i in range(n_resamples):
        sample_parts = []
        for g in strata_groups:
            resampled = rng.choice(g, size=len(g), replace=True)
            sample_parts.append(resampled)
        boot_means[i] = np.mean(np.concatenate(sample_parts))

    ci_lower = float(np.percentile(boot_means, 2.5))
    ci_upper = float(np.percentile(boot_means, 97.5))
    return overall_mean, ci_lower, ci_upper

def holm_bonferroni_correction(p_values: List[float]) -> List[float]:
    """Applies Holm-Bonferroni step-down correction to a list of p-values."""
    m = len(p_values)
    if m == 0:
        return []
    indexed_p = sorted(enumerate(p_values), key=lambda x: x[1])
    adjusted = [0.0] * m
    cum_max = 0.0
    for rank, (orig_idx, p) in enumerate(indexed_p):
        k = m - rank
        p_adj = min(1.0, p * k)
        cum_max = max(cum_max, p_adj)
        adjusted[orig_idx] = cum_max
    return adjusted

def aggregate_metrics(case_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Computes mean, standard deviation, and bootstrap 95% CI across numeric metrics."""
    if not case_results:
        return {}
    
    sample_size = len(case_results)
    numeric_keys = [
        k for k in case_results[0].keys()
        if isinstance(case_results[0][k], (int, float, np.number, bool)) and not isinstance(case_results[0][k], str)
    ]
    
    aggregated = {"sample_size_n": sample_size}
    for key in numeric_keys:
        vals = np.array([c[key] for c in case_results if key in c], dtype=float)
        mean_val = float(np.mean(vals))
        std_val = float(np.std(vals, ddof=1)) if len(vals) > 1 else 0.0
        
        # 10,000 resamples bootstrap
        if len(vals) > 1 and not np.all(vals == vals[0]):
            rng = np.random.default_rng(seed=42)
            boot = [np.mean(rng.choice(vals, size=len(vals), replace=True)) for _ in range(10000)]
            ci_l, ci_u = float(np.percentile(boot, 2.5)), float(np.percentile(boot, 97.5))
        else:
            ci_l, ci_u = mean_val, mean_val

        aggregated[key] = {
            "mean": mean_val,
            "std": std_val,
            "ci_95": [ci_l, ci_u],
            "count": len(vals)
        }
    return aggregated
