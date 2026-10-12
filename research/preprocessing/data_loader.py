import os
import pandas as pd
import numpy as np
import networkx as nx
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from huggingface_hub import hf_hub_download
from research.preprocessing.topology import get_topology, get_system_services, parse_service_and_metric

@dataclass
class IncidentData:
    case_id: str
    system_name: str
    suite: str
    root_cause_service: str
    fault: str
    inject_time: int
    metrics_df: pd.DataFrame
    services: List[str]
    topology: nx.DiGraph
    pre_window: int = 600   # 10 min before injection
    post_window: int = 600  # 10 min after injection

class RCADataLoader:
    def __init__(self, cache_dir: str = "research/data_cache", manifest_path: str = "research/data_manifests/cases.parquet"):
        self.cache_dir = cache_dir
        self.manifest_path = manifest_path
        os.makedirs(self.cache_dir, exist_ok=True)
        if not os.path.exists(self.manifest_path):
            raise FileNotFoundError(f"Manifest not found: {self.manifest_path}")
        self.manifest_df = pd.read_parquet(self.manifest_path)

    def get_cases(self, suite: Optional[str] = None, system: Optional[str] = None, fault: Optional[str] = None) -> pd.DataFrame:
        """Filters manifest cases by suite, system, and fault."""
        df = self.manifest_df
        if suite:
            df = df[df['suite'].str.upper() == suite.upper()]
        if system:
            df = df[df['system_name'].str.lower() == system.lower()]
        if fault:
            df = df[df['fault'].str.lower() == fault.lower()]
        return df

    def load_incident(self, case_id: str, pre_window: int = 600, post_window: int = 600) -> IncidentData:
        """Loads and window-aligns metrics for a single incident case."""
        case_rows = self.manifest_df[self.manifest_df['case'] == case_id]
        if case_rows.empty:
            raise ValueError(f"Case '{case_id}' not found in manifest.")
        row = case_rows.iloc[0]

        inject_time = int(row['inject_time'])
        root_cause_svc = str(row['root_cause_service'])
        fault = str(row['fault'])
        system_name = str(row['system_name'])
        suite = str(row['suite'])

        # Download/cache metrics parquet
        case_file = f"{case_id}/metrics.parquet"
        local_path = os.path.join(self.cache_dir, case_id, "metrics.parquet")
        if not os.path.exists(local_path):
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            hf_hub_download(
                repo_id="phamquiluan/RCAEval",
                filename=case_file,
                repo_type="dataset",
                local_dir=self.cache_dir
            )

        # Read metrics
        raw_df = pd.read_parquet(local_path)
        if 'time' in raw_df.columns:
            raw_df = raw_df.sort_values('time').reset_index(drop=True)
            t_min = inject_time - pre_window
            t_max = inject_time + post_window
            sliced_df = raw_df[(raw_df['time'] >= t_min) & (raw_df['time'] <= t_max)].copy()
            if sliced_df.empty:
                sliced_df = raw_df.copy()
        else:
            sliced_df = raw_df.copy()

        # Clean NaNs and infinite values
        sliced_df = sliced_df.ffill().bfill().fillna(0.0)

        # Candidate services
        services = get_system_services(sliced_df.columns.tolist())
        topology = get_topology(system_name)

        return IncidentData(
            case_id=case_id,
            system_name=system_name,
            suite=suite,
            root_cause_service=root_cause_svc,
            fault=fault,
            inject_time=inject_time,
            metrics_df=sliced_df,
            services=services,
            topology=topology,
            pre_window=pre_window,
            post_window=post_window
        )
