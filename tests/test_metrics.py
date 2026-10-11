import pytest
import numpy as np
from research.evaluation.metrics import (
    compute_hit_at_k,
    compute_mrr,
    compute_ndcg_at_k,
    compute_chance_level,
    evaluate_case,
    aggregate_metrics,
    paired_significance_test
)

def test_hit_at_k():
    ranks = ["service_b", "service_a", "service_c"]
    assert compute_hit_at_k(ranks, "service_b", 1) == 1.0
    assert compute_hit_at_k(ranks, "service_a", 1) == 0.0
    assert compute_hit_at_k(ranks, "service_a", 2) == 1.0
    assert compute_hit_at_k(ranks, "service_z", 3) == 0.0

def test_mrr():
    ranks = ["service_b", "service_a", "service_c"]
    assert compute_mrr(ranks, "service_b") == 1.0
    assert compute_mrr(ranks, "service_a") == 0.5
    assert compute_mrr(ranks, "service_c") == pytest.approx(1.0 / 3.0)
    assert compute_mrr(ranks, "service_z") == 0.0

def test_ndcg():
    ranks = ["service_b", "service_a", "service_c"]
    # If ground truth is at rank 1, NDCG is 1.0
    assert compute_ndcg_at_k(ranks, "service_b", 3) == 1.0
    # If ground truth is at rank 2: DCG = 1 / log2(3), IDCG = 1 / log2(2) = 1.0
    assert compute_ndcg_at_k(ranks, "service_a", 3) == pytest.approx(1.0 / np.log2(3))

def test_chance_level():
    assert compute_chance_level(10, 1) == 0.1
    assert compute_chance_level(10, 3) == 0.3
    assert compute_chance_level(0, 1) == 0.0

def test_aggregate_and_significance():
    case_results = [
        {"hit@1": 1.0, "mrr": 1.0},
        {"hit@1": 0.0, "mrr": 0.5},
        {"hit@1": 1.0, "mrr": 1.0},
        {"hit@1": 0.0, "mrr": 0.3333},
    ]
    agg = aggregate_metrics(case_results)
    assert agg["hit@1"]["mean"] == 0.5
    assert agg["hit@1"]["count"] == 4

    scores_a = [1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0]
    scores_b = [0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0]
    sig = paired_significance_test(scores_a, scores_b)
    assert sig["mean_difference"] > 0
    assert "ci_95" in sig
