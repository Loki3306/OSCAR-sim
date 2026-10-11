import os
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Style for top-tier IEEE / ACM publication quality
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['axes.edgecolor'] = '#333333'
plt.rcParams['axes.linewidth'] = 0.8
plt.rcParams['font.size'] = 10

FIGURES_DIR = "research/figures"
os.makedirs(FIGURES_DIR, exist_ok=True)
VERIFIED_DIR = "research/results/phase2_verified"

def plot_fig1_dataset_breakdown():
    audit_file = "research/data_manifests/audit_stats.json"
    if not os.path.exists(audit_file):
        return
    with open(audit_file) as f:
        stats = json.load(f)

    faults = stats["faults"]
    df = pd.DataFrame(list(faults.items()), columns=["Fault", "Count"]).sort_values("Count", ascending=False)
    
    fig, ax = plt.subplots(figsize=(8.5, 4.2), dpi=300)
    colors = ['#1f77b4' if f.lower() == 'cpu' else '#aec7e8' for f in df["Fault"]]
    bars = ax.bar(df["Fault"].str.upper(), df["Count"], color=colors, edgecolor='#333333', linewidth=0.7)
    
    for bar in bars:
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2.0, yval + 2, f"{int(yval)}", ha='center', va='bottom', fontsize=8)

    ax.set_ylabel("Number of Annotated Benchmark Incidents")
    ax.set_xlabel("Injected Fault Category")
    ax.set_title("RCAEval Benchmark: Fault Distribution Across 735 Microservice Cases (N=120 CPU Cohort)", fontweight='bold')
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, "fig1_dataset_breakdown.png"), dpi=300)
    plt.savefig(os.path.join(FIGURES_DIR, "fig1_dataset_breakdown.pdf"))
    plt.close()
    print("Saved fig1_dataset_breakdown")

def plot_fig2_full_cpu_comparison():
    summary_file = os.path.join(VERIFIED_DIR, "phase2_cpu_summary.csv")
    if not os.path.exists(summary_file):
        return
    df = pd.read_csv(summary_file)
    
    # Filter to main baselines, hybrids, and proposed
    models_to_show = [
        "CIRCA", "Hybrid-RRF", "MicroCause", "BARO", "Hybrid-CausalTemporal",
        "E-Diagnosis", "Multi-Source BARO", "RCD", "OSCAR-CTRCL (Proposed)"
    ]
    df_plot = df[df["Method"].isin(models_to_show)].copy()
    df_plot = df_plot.sort_values("Hit@1_CPU", ascending=True).reset_index(drop=True)

    fig, ax = plt.subplots(figsize=(10, 5.2), dpi=300)
    y_pos = np.arange(len(df_plot))

    colors = ['#2ca02c' if 'OSCAR' in m else ('#1f77b4' if 'RCD' in m or 'BARO' in m or 'Diagnosis' in m or 'Micro' in m or 'CIRCA' in m else '#ff7f0e') for m in df_plot["Method"]]
    
    # Parse bootstrap error bars if present
    x_err = None
    if "Hit@1_CPU_95CI" in df_plot.columns:
        lows = []
        highs = []
        for idx, row in df_plot.iterrows():
            ci = eval(row["Hit@1_CPU_95CI"]) if isinstance(row["Hit@1_CPU_95CI"], str) else row["Hit@1_CPU_95CI"]
            val = row["Hit@1_CPU"]
            lows.append(max(0, val - ci[0]))
            highs.append(max(0, ci[1] - val))
        x_err = [lows, highs]

    bars = ax.barh(y_pos, df_plot["Hit@1_CPU"], xerr=x_err, color=colors, edgecolor='#333333', height=0.6, capsize=3)
    
    # Random chance line
    chance = df_plot["Theoretical_Chance_Hit1"].iloc[0] if "Theoretical_Chance_Hit1" in df_plot.columns else 0.08
    ax.axvline(chance, color='#7f7f7f', linestyle='--', linewidth=1.2, label=f"Random Chance ({chance:.3f})")

    for bar, (_, row) in zip(bars, df_plot.iterrows()):
        w = bar.get_width()
        hit1 = row["Hit@1_CPU"]
        mrr = row["MRR_CPU"]
        ax.text(w + 0.02, bar.get_y() + bar.get_height()/2, f"Hit@1: {hit1:.3f} | MRR: {mrr:.3f}", va='center', fontsize=8.5, fontweight='bold')

    ax.set_yticks(y_pos)
    ax.set_yticklabels(df_plot["Method"])
    ax.set_xlabel("Hit@1 Root Cause Localization Accuracy (N=120 Verified CPU Cases)")
    ax.set_xlim(0, 1.15)
    ax.set_title("Full CPU Cohort Empirical Evaluation: Hit@1 & MRR with 95% Bootstrap CIs", fontweight='bold')
    ax.legend(loc='lower right', frameon=True)
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, "fig2_full_cpu_comparison.png"), dpi=300)
    plt.savefig(os.path.join(FIGURES_DIR, "fig2_full_cpu_comparison.pdf"))
    plt.close()
    print("Saved fig2_full_cpu_comparison")

def plot_fig3_mcnemar_contingency():
    tests_file = os.path.join(VERIFIED_DIR, "phase2_mcnemar_statistical_tests.json")
    if not os.path.exists(tests_file):
        return
    with open(tests_file) as f:
        tests = json.load(f)

    labels = []
    n10_wins = []
    n01_losses = []
    p_values = []

    for k, v in tests.items():
        comp = v["comparison"].replace("OSCAR-CTRCL vs ", "")
        mc = v["mcnemar"]
        labels.append(comp)
        n10_wins.append(mc["contingency_table"]["n10"])
        n01_losses.append(mc["contingency_table"]["n01"])
        p_values.append(mc.get("p_value_holm_adjusted", mc["p_value"]))

    fig, ax = plt.subplots(figsize=(9, 4.5), dpi=300)
    x = np.arange(len(labels))
    width = 0.35

    b1 = ax.bar(x - width/2, n10_wins, width, label="OSCAR Wins (n10: OSCAR=1, Base=0)", color="#2ca02c", edgecolor='#333333')
    b2 = ax.bar(x + width/2, n01_losses, width, label="Baseline Wins (n01: OSCAR=0, Base=1)", color="#d62728", edgecolor='#333333')

    for idx, (bar1, p) in enumerate(zip(b1, p_values)):
        y_max = max(n10_wins[idx], n01_losses[idx])
        p_str = f"p={p:.3e}" if p < 0.01 else f"p={p:.3f}"
        sig_str = " (p < 0.05)*" if p < 0.05 else " (n.s.)"
        ax.text(idx, y_max + 4, p_str + sig_str, ha='center', fontsize=8, fontweight='bold')

    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=15, ha='right')
    ax.set_ylabel("Discordant Incidents Count (N=120 Paired CPU Cases)")
    ax.set_title("Exact McNemar Paired Test Analysis: Discordant Pairs (n10 vs n01) & Holm-Adjusted p-values", fontweight='bold')
    ax.set_ylim(0, max(n10_wins) + 15)
    ax.legend(frameon=True, loc='upper left')
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, "fig3_mcnemar_contingency.png"), dpi=300)
    plt.savefig(os.path.join(FIGURES_DIR, "fig3_mcnemar_contingency.pdf"))
    plt.close()
    print("Saved fig3_mcnemar_contingency")

def plot_fig4_error_decomposition():
    decomp_file = os.path.join(VERIFIED_DIR, "phase2_error_decomposition.json")
    if not os.path.exists(decomp_file):
        return
    with open(decomp_file) as f:
        data = json.load(f)

    models_order = ["CIRCA", "MicroCause", "Hybrid-RRF", "BARO", "E-Diagnosis", "Multi-Source BARO", "RCD", "OSCAR-CTRCL (Proposed)"]
    caller_err = []
    callee_err = []
    retrieval_err = []
    other_err = []

    for m in models_order:
        items = data.get(m, [])
        c_caller = sum(1 for x in items if x["failure_type"] == "RANKING_CALLER_SYMPTOM")
        c_callee = sum(1 for x in items if x["failure_type"] == "RANKING_CALLEE_SYMPTOM")
        c_retrieval = sum(1 for x in items if x["failure_type"] == "RETRIEVAL_FAILURE")
        c_other = sum(1 for x in items if x["failure_type"] == "RANKING_OTHER")
        caller_err.append(c_caller)
        callee_err.append(c_callee)
        retrieval_err.append(c_retrieval)
        other_err.append(c_other)

    fig, ax = plt.subplots(figsize=(10, 4.8), dpi=300)
    y_pos = np.arange(len(models_order))

    b1 = ax.barh(y_pos, caller_err, label="Downstream Caller Symptom Confusion", color="#e41a1c", edgecolor='#333333', height=0.6)
    b2 = ax.barh(y_pos, callee_err, left=caller_err, label="Upstream Callee Symptom Confusion", color="#ff7f00", edgecolor='#333333', height=0.6)
    b3 = ax.barh(y_pos, retrieval_err, left=np.array(caller_err)+np.array(callee_err), label="Retrieval / Zero-Score Omission", color="#984ea3", edgecolor='#333333', height=0.6)
    b4 = ax.barh(y_pos, other_err, left=np.array(caller_err)+np.array(callee_err)+np.array(retrieval_err), label="Other Ranking Dispersion", color="#999999", edgecolor='#333333', height=0.6)

    ax.set_yticks(y_pos)
    ax.set_yticklabels(models_order)
    ax.set_xlabel("Number of Localization Failures (N=150 Evaluated Incidents)")
    ax.set_title("Root Cause Error Decomposition: Retrieval Omission vs. Caller/Callee Symptom Confusion", fontweight='bold')
    ax.legend(loc='lower right', frameon=True)
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, "fig4_error_decomposition.png"), dpi=300)
    plt.savefig(os.path.join(FIGURES_DIR, "fig4_error_decomposition.pdf"))
    plt.close()
    print("Saved fig4_error_decomposition")

def plot_fig5_ablation_study():
    summary_file = os.path.join(VERIFIED_DIR, "phase2_cpu_summary.csv")
    if not os.path.exists(summary_file):
        return
    df = pd.read_csv(summary_file)
    ablation_df = df[df["Method"].str.contains("OSCAR") | df["Method"].str.contains("Ablation")].copy()
    if ablation_df.empty:
        return

    fig, ax = plt.subplots(figsize=(7.5, 4), dpi=300)
    x = np.arange(len(ablation_df))
    width = 0.35

    ax.bar(x - width/2, ablation_df["Hit@1_CPU"], width, label="CPU Hit@1", color="#1f77b4", edgecolor='#333333')
    ax.bar(x + width/2, ablation_df["MRR_CPU"], width, label="CPU MRR", color="#aec7e8", edgecolor='#333333')

    for idx, (_, row) in enumerate(ablation_df.iterrows()):
        ax.text(idx - width/2, row["Hit@1_CPU"] + 0.02, f"{row['Hit@1_CPU']:.3f}", ha='center', fontsize=8.5)
        ax.text(idx + width/2, row["MRR_CPU"] + 0.02, f"{row['MRR_CPU']:.3f}", ha='center', fontsize=8.5)

    ax.set_ylabel("Metric Value")
    ax.set_title("Component Ablation on Full N=120 CPU Cohort", fontweight='bold')
    ax.set_xticks(x)
    labels = [m.replace("Ablation: ", "").replace("OSCAR-CTRCL (Proposed)", "Full CTRCL") for m in ablation_df["Method"]]
    ax.set_xticklabels(labels, rotation=10, ha='center')
    ax.set_ylim(0, 1.1)
    ax.legend(frameon=True, loc='lower right')
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, "fig5_ablation_study.png"), dpi=300)
    plt.savefig(os.path.join(FIGURES_DIR, "fig5_ablation_study.pdf"))
    plt.close()
    print("Saved fig5_ablation_study")

def plot_fig6_robustness():
    noise_file = os.path.join(VERIFIED_DIR, "robustness_noise_verified.csv")
    missing_file = os.path.join(VERIFIED_DIR, "robustness_missing_verified.csv")
    if not os.path.exists(noise_file) or not os.path.exists(missing_file):
        return

    df_noise = pd.read_csv(noise_file)
    df_missing = pd.read_csv(missing_file)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 4.5), dpi=300)

    # Plot 1: Noise Degradation
    colors = {"OSCAR-CTRCL": "#2ca02c", "RCD": "#1f77b4", "BARO": "#d62728"}
    for model in df_noise["model"].unique():
        sub = df_noise[df_noise["model"] == model]
        ax1.plot(sub["noise_level"], sub["hit@1"], marker='o', linewidth=2.2, label=model, color=colors.get(model, None))
    ax1.set_xlabel("Measurement Noise Level (sigma * std)")
    ax1.set_ylabel("Hit@1 Localization Accuracy")
    ax1.set_title("(A) Robustness to Measurement Noise (N=60)", fontweight='bold')
    ax1.set_ylim(0.4, 1.02)
    ax1.legend(frameon=True)

    # Plot 2: Missingness Degradation
    for model in df_missing["model"].unique():
        sub = df_missing[df_missing["model"] == model]
        ax2.plot(sub["drop_ratio"] * 100, sub["hit@1"], marker='s', linewidth=2.2, label=model, color=colors.get(model, None))
    ax2.set_xlabel("Dropped Metric Columns Ratio (%)")
    ax2.set_ylabel("Hit@1 Localization Accuracy")
    ax2.set_title("(B) Robustness to Telemetry Missingness (N=60)", fontweight='bold')
    ax2.set_ylim(0.4, 1.02)
    ax2.legend(frameon=True)

    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, "fig6_robustness_verified.png"), dpi=300)
    plt.savefig(os.path.join(FIGURES_DIR, "fig6_robustness_verified.pdf"))
    plt.close()
    print("Saved fig6_robustness_verified")

def generate_all_figures():
    plot_fig1_dataset_breakdown()
    plot_fig2_full_cpu_comparison()
    plot_fig3_mcnemar_contingency()
    plot_fig4_error_decomposition()
    plot_fig5_ablation_study()
    plot_fig6_robustness()

if __name__ == "__main__":
    generate_all_figures()
