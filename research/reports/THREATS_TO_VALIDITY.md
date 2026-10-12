# Threats to Validity and Scientific Limitations

## 1. Construct Validity
*   **Metric Operationalization:** We evaluate root cause localization using standard ranking metrics: Hit@1, Hit@3, Hit@5, and Mean Reciprocal Rank (MRR). A potential threat is that top-ranked services may not account for cases where multiple components fail simultaneously. However, in RCAEval, each benchmark case possesses a single designated primary root-cause injection, making Hit@1 and MRR construct-valid measures of diagnostic precision.
*   **Chance Baseline:** We explicitly compute the theoretical uniform random chance baseline ($1/N_{candidates}$, approximately 0.053) to ensure complex algorithms are held to a rigorous standard.

## 2. Internal Validity
*   **Train/Test & Incident Leakage:** Preprocessing and baseline parameter estimation are fitted strictly on pre-incident reference windows ($t < t_{inject}$), eliminating temporal lookahead bias. Incident identities are never split across windows.
*   **Implementation Fidelity:** All baseline adapters adhere strictly to their respective peer-reviewed publications and public benchmark definitions. No baseline was artificially degraded or modified to inflate the relative performance of our proposed method.
*   **Stochastic Stability:** Experiments employ fixed deterministic seeds (`seed=42`) and 1,000 paired bootstrap iterations to quantify statistical variability.

## 3. External Validity
*   **Generalizability Across Architectures:** The evaluation spans three microservice systems with vastly different scale and architecture:
    - *Online Boutique:* 11 services, polyglot microservices (Go, Python, Java, C#, Node.js).
    - *Sock Shop:* 8 services, e-commerce workflow with separate DB per service.
    - *Train Ticket:* 40+ services, complex multi-tier transportation booking system.
*   **Benchmark vs. In-the-Wild Incidents:** RCAEval failure cases were produced via controlled Chaos engineering injection in Kubernetes testbeds rather than naturally occurring production outages. While controlled injection guarantees ground-truth certitude, production incidents may involve unobserved human intervention, hardware flaps, and cascading multi-region failures.

## 4. Scientific Limitations
*   **Topology Completeness:** Methods utilizing the service graph assume call dependencies can be derived from static descriptors or distributed tracing spans. In the presence of completely unobserved external dependencies (e.g., third-party SaaS APIs), causal propagation degrades.
*   **Sampling Frequency:** Telemetry sampled at intervals coarser than 30 seconds may miss sub-second temporal onset ordering, reducing the marginal benefit of the temporal change-point filter.
