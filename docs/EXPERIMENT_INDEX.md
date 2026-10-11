# OSCAR Platform: Experiment Index & Provenance Manifest

This document records the provenance, manifest, and artifact mappings for all empirical experiments conducted in the OSCAR platform.

---

## 1. Verified Experiment Index

| Experiment ID | Date / Revision | Dataset / Suite | Target Cohort | Evaluated Models | Primary Artifact Location | Status |
|---|---|---|---|---|---|---|
| **EXP-PHASE2-VERIFIED-001** | 2026-08-24 | RCAEval (v2024) | 120 CPU Incidents | OSCAR-CTRCL, RCD, MicroCause, CIRCA, BARO, E-Diag, MS-BARO | `research/results/phase2_verified/phase2_detailed_per_case.json` | Confirmatory Verified |
| **EXP-PHASE2-ABLATION-001** | 2026-08-24 | RCAEval (v2024) | 120 CPU Incidents | Full CTRCL, w/o CDR, w/o PRP, w/o TIP, w/o DSI | `server/routers/research.py` (`figure2_ablation`) | Confirmatory Verified |
| **EXP-PHASE2-ROBUSTNESS-001**| 2026-08-24 | RCAEval (v2024) | 120 CPU Incidents | CTRCL vs RCD (Noise: 0%, 10%, 25%, 50%) | `server/routers/research.py` (`figure4_robustness`) | Confirmatory Verified |
| **EXP-postgres_cpu_001** | 2026-08-23 | OSCAR-Sim Live | 1 Live / Replay | OSCAR-CTRCL, Baselines | `experiments/metadata/EXP-postgres_cpu_stress_001-20260823-123347/` | Replay Source |

---

## 2. Artifact Provenance Details

### 2.1 Confirmatory Benchmark Evaluation (`EXP-PHASE2-VERIFIED-001`)
- **Raw File:** `research/results/phase2_verified/phase2_detailed_per_case.json`
- **Total Record Rows:** 1,650 individual model evaluations.
- **Evaluated Cases:** 150 total benchmark cases, containing the canonical 120-case CPU-stress cohort.
- **Fields per Record:**
  - `case_id`: Unique identifier from RCAEval suite.
  - `system`: Microservice system (e.g., `ts` for Train-Ticket, `tt`, `ob`).
  - `fault_category`: Category identifier (`cpu_stress`, `mem_stress`, etc.).
  - `ground_truth`: Name of verified root-cause microservice.
  - `model`: Identifier of tested algorithm (`oscar_ctrcl`, `rcd`, etc.).
  - `rank`: Rank assigned to true ground-truth service ($1 \dots M$).
  - `candidate_count`: Total number of candidate services in the topology.
  - `execution_time_s`: Wall-clock execution latency in seconds.

---

## 3. Reprocessing & Verification Command

To re-verify and re-parse all experimental artifacts:
```bash
python -m pytest tests/test_metrics.py tests/test_statistics.py -v
```
