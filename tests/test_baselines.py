import pytest
from research.preprocessing.data_loader import RCADataLoader
from research.baselines.baro_adapter import BAROAdapter
from research.baselines.circa_adapter import CIRCAAdapter
from research.baselines.rcd_adapter import RCDAdapter
from research.baselines.microcause_adapter import MicroCauseAdapter
from research.baselines.ediagnosis_adapter import EDiagnosisAdapter
from research.baselines.ms_baro_adapter import MultiSourceBAROAdapter
from research.evaluation.metrics import evaluate_case

@pytest.fixture(scope="module")
def sample_incident():
    loader = RCADataLoader()
    return loader.load_incident("re1ob_adservice_cpu_1", pre_window=300, post_window=300)

@pytest.mark.parametrize("adapter_cls", [
    BAROAdapter,
    CIRCAAdapter,
    RCDAdapter,
    MicroCauseAdapter,
    EDiagnosisAdapter,
    MultiSourceBAROAdapter
])
def test_baseline_execution(sample_incident, adapter_cls):
    adapter = adapter_cls()
    result = adapter.diagnose(sample_incident)
    
    assert result.case_id == sample_incident.case_id
    assert result.algorithm == adapter.name
    assert len(result.ranked_services) > 0
    assert len(result.ranked_services) == len(set(result.ranked_services))
    assert result.runtime_sec > 0.0
    
    metrics = evaluate_case(result.ranked_services, sample_incident.root_cause_service, len(result.ranked_services))
    assert 0.0 <= metrics["hit@1"] <= 1.0
    assert 0.0 <= metrics["mrr"] <= 1.0
