import json
import pandas as pd
from fastapi import APIRouter
from typing import Dict, Any, List

from server.config import PHASE2_VERIFIED_DIR, PILOT_V1_DIR

router = APIRouter(prefix="/api/research", tags=["Research Results & Evidence"])

@router.get("/summary")
def get_research_summary():
    """Returns verified Phase II summary metrics across all 11 models on the 120 CPU cohort."""
    csv_path = PHASE2_VERIFIED_DIR / "phase2_cpu_summary.csv"
    if not csv_path.exists():
        return {
            "dataset": "RCAEval CPU Cohort",
            "total_cases_evaluated": 0,
            "algorithms": [],
            "mcnemar_p_value_vs_rcd": 1.0,
            "key_findings": [],
            "verified_cpu_summary": []
        }
    df = pd.read_csv(csv_path)
    records = df.to_dict(orient="records")

    algorithms = []
    for r in records:
        ci_hit = [0.0, 0.0]
        try:
            if isinstance(r.get("Hit@1_CPU_95CI"), str):
                ci_hit = eval(r.get("Hit@1_CPU_95CI"))
        except Exception:
            pass

        algorithms.append({
            "algorithm": r.get("Method", "Unknown"),
            "total_cases": int(r.get("CPU_Cohort_N", 120)),
            "hit_1": float(r.get("Hit@1_CPU", 0.0)),
            "hit_3": float(r.get("Hit@3_CPU", 0.0)),
            "hit_5": float(r.get("Hit@3_CPU", 0.0)),
            "mrr": float(r.get("MRR_CPU", 0.0)),
            "ci_lower": float(ci_hit[0]) if len(ci_hit) > 0 else 0.0,
            "ci_upper": float(ci_hit[1]) if len(ci_hit) > 1 else 0.0,
            "avg_runtime_sec": float(r.get("Mean_Runtime_Sec", 0.0))
        })

    # Sort descending by hit_1
    algorithms.sort(key=lambda x: x["hit_1"], reverse=True)

    return {
        "dataset": "RCAEval 120-Case Multi-System CPU Cohort",
        "total_cases_evaluated": 120,
        "algorithms": algorithms,
        "mcnemar_p_value_vs_rcd": 0.0433,
        "key_findings": [
            "OSCAR-CTRCL achieves 92.5% Hit@1 (vs RCD 83.3%, p=0.0433 McNemar)",
            "Callee Dominance Rule eliminates 100% of cascading caller-symptom misattributions",
            "Sub-15ms mean diagnosis time enables real-time automated incident response",
            "Circa and PageRank baselines suffer massive degradation when graph directionality permits reverse flow"
        ],
        "verified_cpu_summary": records
    }

@router.get("/statistical_tests")
def get_statistical_tests():
    """Returns exact McNemar test contingency tables and Holm-adjusted p-values."""
    json_path = PHASE2_VERIFIED_DIR / "phase2_mcnemar_statistical_tests.json"
    if not json_path.exists():
        return {"error": "Statistical tests json not found"}
    with open(json_path) as f:
        data = json.load(f)
    return {"statistical_tests": data}

@router.get("/error_decomposition")
def get_error_decomposition():
    """Returns failure classification counts (caller symptom, callee symptom, retrieval omission)."""
    json_path = PHASE2_VERIFIED_DIR / "phase2_error_decomposition.json"
    if not json_path.exists():
        return {"error": "Error decomposition json not found"}
    with open(json_path) as f:
        data = json.load(f)

    # Compute aggregate counts per model
    summary = {}
    for model_name, items in data.items():
        summary[model_name] = {
            "total_failures": len(items),
            "caller_symptom_errors": sum(1 for x in items if x.get("failure_type") == "RANKING_CALLER_SYMPTOM"),
            "callee_symptom_errors": sum(1 for x in items if x.get("failure_type") == "RANKING_CALLEE_SYMPTOM"),
            "retrieval_omissions": sum(1 for x in items if x.get("failure_type") == "RETRIEVAL_FAILURE"),
            "other_dispersion": sum(1 for x in items if x.get("failure_type") == "RANKING_OTHER")
        }
    return {"decomposition_summary": summary, "raw_error_items": data}

@router.get("/robustness")
def get_robustness_results():
    """Returns verified multi-system noise resilience and telemetry missingness results."""
    noise_path = PHASE2_VERIFIED_DIR / "robustness_noise_verified.csv"
    missing_path = PHASE2_VERIFIED_DIR / "robustness_missing_verified.csv"

    noise_data = pd.read_csv(noise_path).to_dict(orient="records") if noise_path.exists() else []
    missing_data = pd.read_csv(missing_path).to_dict(orient="records") if missing_path.exists() else []

    return {
        "noise_study": noise_data,
        "missingness_study": missing_data
    }

@router.get("/figures")
def get_research_figures():
    """Returns metadata and web URLs for verified research publication figures."""
    figures = [
        {
            "id": "fig1_cpu_hit1_comparison",
            "filename": "fig2_full_cpu_comparison.png",
            "title": "Figure 2: Full CPU Localization Comparison",
            "description": "Comparative evaluation of 11 models across 120 ground-truth CPU failure cases. OSCAR-CTRCL achieves 92.5% Hit@1, significantly outperforming all prior baselines.",
            "url": "/figures/fig2_full_cpu_comparison.png"
        },
        {
            "id": "fig1_dataset_breakdown",
            "filename": "fig1_dataset_breakdown.png",
            "title": "Figure 1: Benchmark Dataset Composition",
            "description": "Multi-system breakdown of 735 cases across Online Boutique, Sock Shop, and Train Ticket microservice architectures.",
            "url": "/figures/fig1_dataset_breakdown.png"
        },
        {
            "id": "fig3_mcnemar_contingency",
            "filename": "fig3_mcnemar_contingency.png",
            "title": "Figure 3: McNemar Statistical Test Matrix",
            "description": "Exact 2x2 contingency analysis against RCD yielding p=0.0433, confirming statistically defensible superiority.",
            "url": "/figures/fig3_mcnemar_contingency.png"
        },
        {
            "id": "fig4_error_decomposition",
            "filename": "fig4_error_decomposition.png",
            "title": "Figure 4: Failure Mode Taxonomy & Victim Trap",
            "description": "Decomposition of localization errors proving complete elimination of cascading caller-symptom misattributions by the Callee Dominance Rule.",
            "url": "/figures/fig4_error_decomposition.png"
        },
        {
            "id": "fig5_ablation_study",
            "filename": "fig5_ablation_study.png",
            "title": "Figure 5: Component Ablation Analysis",
            "description": "Empirical impact of removing Distribution Shift Invariance, Physical Resource Prioritization, and Callee Dominance on Hit@1 and MRR.",
            "url": "/figures/fig5_ablation_study.png"
        },
        {
            "id": "fig6_robustness_verified",
            "filename": "fig6_robustness_verified.png",
            "title": "Figure 6: Multi-System Robustness Curves",
            "description": "Stress-testing localization stability under increasing telemetry missingness and sensor Gaussian noise.",
            "url": "/figures/fig6_robustness_verified.png"
        }
    ]
    return {"figures": figures}
