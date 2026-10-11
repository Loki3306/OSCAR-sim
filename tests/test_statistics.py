import pytest
import numpy as np
from research.evaluation.metrics import (
    compute_exact_mcnemar,
    compute_paired_ranking_tests,
    compute_expected_mrr_chance,
    holm_bonferroni_correction,
    compute_stratified_bootstrap_ci
)

def test_exact_mcnemar_basic():
    # Model A gets 14 correct that Model B gets wrong (b=14, c=0)
    y_a = [1]*14 + [1]*20 + [0]*6
    y_b = [0]*14 + [1]*20 + [0]*6
    res = compute_exact_mcnemar(y_a, y_b)
    
    assert res["contingency_table"]["n10"] == 14
    assert res["contingency_table"]["n01"] == 0
    assert res["contingency_table"]["n11"] == 20
    assert res["contingency_table"]["n00"] == 6
    assert res["p_value"] == pytest.approx(2 * (0.5**14))
    assert res["statistically_significant"] is True

def test_exact_mcnemar_tie():
    # Symmetric discordance (b=2, c=2) -> p = 1.0
    y_a = [1, 1, 0, 0]
    y_b = [0, 0, 1, 1]
    res = compute_exact_mcnemar(y_a, y_b)
    assert res["p_value"] == 1.0
    assert res["statistically_significant"] is False

def test_paired_ranking_tests():
    # Reciprocal ranks where Model A consistently outperforms Model B
    rr_a = [1.0, 1.0, 0.5, 1.0, 0.33, 1.0, 1.0, 0.5, 1.0, 0.5]
    rr_b = [0.2, 0.33, 0.2, 0.5, 0.1, 0.25, 0.33, 0.2, 0.33, 0.2]
    res = compute_paired_ranking_tests(rr_a, rr_b, num_permutations=2000)
    assert res["mean_difference"] > 0
    assert res["wilcoxon_p_value"] < 0.05
    assert res["permutation_p_value"] < 0.05
    assert res["cohens_dz"] > 0.8

def test_expected_mrr_chance():
    # For N=1, chance MRR is 1.0
    assert compute_expected_mrr_chance(1) == 1.0
    # For N=2, harmonic sum = 1 + 1/2 = 1.5, expected MRR = 0.75
    assert compute_expected_mrr_chance(2) == 0.75
    # For N=10, harmonic sum = 2.928968, expected MRR = ~0.2929
    assert compute_expected_mrr_chance(10) == pytest.approx(0.2928968, rel=1e-4)

def test_holm_bonferroni():
    p_vals = [0.01, 0.04, 0.03]
    # Sorted: 0.01 (k=3 -> 0.03), 0.03 (k=2 -> 0.06), 0.04 (k=1 -> 0.04 -> cummax 0.06)
    adj = holm_bonferroni_correction(p_vals)
    assert adj[0] == pytest.approx(0.03)
    assert adj[2] == pytest.approx(0.06)
    assert adj[1] == pytest.approx(0.06)

def test_stratified_bootstrap():
    case_results = [
        {"system": "OB", "hit@1": 1.0},
        {"system": "OB", "hit@1": 0.0},
        {"system": "SS", "hit@1": 1.0},
        {"system": "SS", "hit@1": 1.0},
        {"system": "TT", "hit@1": 0.0},
        {"system": "TT", "hit@1": 1.0},
    ]
    mean_val, ci_l, ci_u = compute_stratified_bootstrap_ci(case_results, "hit@1", n_resamples=1000)
    assert ci_l <= mean_val <= ci_u
