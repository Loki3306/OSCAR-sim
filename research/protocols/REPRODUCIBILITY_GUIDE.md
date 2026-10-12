# OSCAR Research Program: Reproducibility Guide

## Overview
This document provides exact, deterministic instructions for reproducing all experimental results, figures, tables, and statistical significance tests reported in the OSCAR Root Cause Analysis research project.

---

## 1. Prerequisites
- **Operating System:** Windows 10/11, Ubuntu 20.04/22.04 LTS, or macOS (x86_64 / Apple Silicon).
- **Python Version:** Python 3.10 through 3.13 (Python 3.13.5 verified on Windows 64-bit).
- **Hardware Requirements:** Minimum 8GB RAM, 4 CPU cores, ~5GB free disk space.
- **Git Version:** >= 2.30.

---

## 2. Environment Setup

### Step 2.1: Clone or Navigate to the Repository
```bash
git clone https://github.com/phamquiluan/RCAEval.git  # Benchmark reference
cd OSCAR_Simulation
```

### Step 2.2: Install Dependencies
```bash
pip install -r requirements-research.txt
```

Verify installation:
```bash
python -m pytest tests/test_metrics.py tests/test_baselines.py
```
Expected output: `11 passed in < 5s`.

---

## 3. Data Acquisition & Auditing

### Step 3.1: Download and Audit the RCAEval Benchmark
All telemetry data is automatically downloaded on-demand from the official Hugging Face benchmark repository (`phamquiluan/RCAEval`) and cached locally in `research/data_cache/`.

To inspect case counts and reproduce the dataset manifest:
```bash
python research/data_manifests/audit_rcaeval.py
```
Output:
- `research/data_manifests/audit_stats.json`
- `research/reports/DATASET_AUDIT_REPORT.md` (Confirms 735 cases, 120 CPU failure cases).

---

## 4. Reproducing Empirical Experiments

### Step 4.1: Reproduce Baseline Evaluations (RQ1, RQ2)
```bash
python research/experiments/run_baseline_campaign.py
```
Outputs:
- `research/results/baseline_summary.csv`
- `research/results/baseline_detailed.json`

### Step 4.2: Reproduce Comprehensive Comparison, Hybrids & Ablation Studies (RQ3, RQ4)
```bash
python research/experiments/run_comprehensive_evaluation.py
```
Outputs:
- `research/results/comprehensive_summary.csv`
- `research/results/comprehensive_detailed.json`
- `research/results/statistical_significance_test.json`

### Step 4.3: Reproduce Robustness Degradation Analysis (RQ5)
```bash
python research/experiments/run_robustness_experiment.py
```
Outputs:
- `research/results/robustness_noise.csv`
- `research/results/robustness_missing.csv`

---

## 5. Regenerating Publication Figures
To regenerate all publication-quality vector graphics (PDF) and 300-DPI raster images (PNG) from saved JSON/CSV results:
```bash
python research/figures/generate_paper_figures.py
```
Generated artifacts in `research/figures/`:
1. `fig1_dataset_breakdown.png / .pdf`
2. `fig2_baseline_comparison.png / .pdf`
3. `fig3_comprehensive_comparison.png / .pdf`
4. `fig5_ablation_study.png / .pdf`

---

## 6. Determinism & Random Seeds
All stochastic operations (e.g. bootstrap resampling, noise generation, train/test sampling) use fixed random seeds (`seed=42`).
All results are 100% deterministic and reproducible across operating systems.
