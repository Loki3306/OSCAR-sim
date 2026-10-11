import os
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional

from research.preprocessing.data_loader import RCADataLoader
from server.models import BenchmarkCaseSummary, BenchmarkFilterResponse, BenchmarkCaseDetail

class BenchmarkService:
    def __init__(self):
        self.loader = RCADataLoader()
        self.manifest = self.loader.manifest_df

    def get_filter_summary(
        self,
        suite: Optional[str] = None,
        system: Optional[str] = None,
        fault: Optional[str] = None,
        limit: int = 100
    ) -> BenchmarkFilterResponse:
        """Returns filtered list of benchmark cases with metadata."""
        df = self.manifest.copy()

        if suite:
            df = df[df['suite'].str.upper() == suite.upper()]
        if system:
            df = df[df['system_name'].str.lower() == system.lower()]
        if fault:
            df = df[df['fault'].str.lower() == fault.lower()]

        total_matching = len(df)
        df_page = df.head(limit)

        case_summaries = []
        for _, row in df_page.iterrows():
            case_summaries.append(BenchmarkCaseSummary(
                case_id=row['case'],
                system=row['system_name'],
                suite=row['suite'],
                fault=row['fault'].upper(),
                root_cause_service=row['root_cause_service'],
                num_metrics=int(row.get('num_metrics', 137)),
                duration_sec=float(row.get('duration_seconds', 4201.0)),
                has_logs=bool(row.get('has_logs', False)),
                has_traces=bool(row.get('has_traces', False))
            ))

        return BenchmarkFilterResponse(
            total_cases=total_matching,
            suites=sorted(self.manifest['suite'].dropna().unique().tolist()),
            systems=sorted(self.manifest['system_name'].dropna().unique().tolist()),
            fault_types=sorted(self.manifest['fault'].str.upper().dropna().unique().tolist()),
            cases=case_summaries
        )

    def get_case_detail(self, case_id: str) -> BenchmarkCaseDetail:
        """Loads incident data for a single benchmark case with downsampled time-series for plotting."""
        incident = self.loader.load_incident(case_id, pre_window=300, post_window=300)
        
        df = incident.metrics_df
        # Downsample time series to ~60 points for lightweight frontend rendering
        num_rows = len(df)
        step = max(1, num_rows // 60)
        df_down = df.iloc[::step].copy()

        timestamps = df_down['time'].tolist() if 'time' in df_down.columns else list(range(len(df_down)))

        # Select representative metrics: root cause metrics + 2 caller metrics
        metric_samples: Dict[str, List[float]] = {}
        for col in df_down.columns:
            if col == 'time':
                continue
            # Keep metrics related to root cause or top services
            if incident.root_cause_service in col or len(metric_samples) < 5:
                vals = df_down[col].fillna(0.0).tolist()
                metric_samples[col] = [float(v) for v in vals]
            if len(metric_samples) >= 6:
                break

        return BenchmarkCaseDetail(
            case_id=case_id,
            system=incident.system_name,
            suite=incident.suite,
            fault=incident.fault_type.upper(),
            root_cause_service=incident.root_cause_service,
            injection_timestamp=float(incident.injection_timestamp),
            duration_sec=float(num_rows),
            services=incident.services,
            metric_sample=metric_samples,
            time_series_timestamps=[float(t) for t in timestamps]
        )

# Global singleton
benchmark_service = BenchmarkService()
