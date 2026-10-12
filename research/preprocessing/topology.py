import networkx as nx
from typing import Dict, List, Set, Tuple

def get_topology(system_name: str) -> nx.DiGraph:
    """Returns the directed service dependency call graph for the microservice system."""
    G = nx.DiGraph()
    sys_lower = system_name.lower().replace(" ", "").replace("_", "").replace("-", "")
    
    if "onlineboutique" in sys_lower or "ob" in sys_lower:
        # Online Boutique Call Graph
        edges = [
            ("frontend", "adservice"),
            ("frontend", "cartservice"),
            ("frontend", "checkoutservice"),
            ("frontend", "currencyservice"),
            ("frontend", "productcatalogservice"),
            ("frontend", "recommendationservice"),
            ("frontend", "shippingservice"),
            ("checkoutservice", "cartservice"),
            ("checkoutservice", "currencyservice"),
            ("checkoutservice", "emailservice"),
            ("checkoutservice", "paymentservice"),
            ("checkoutservice", "productcatalogservice"),
            ("checkoutservice", "shippingservice"),
            ("recommendationservice", "productcatalogservice"),
            ("cartservice", "redis"),
        ]
        G.add_edges_from(edges)
        
    elif "sockshop" in sys_lower or "ss" in sys_lower:
        # Sock Shop Call Graph
        edges = [
            ("front-end", "catalogue"),
            ("front-end", "orders"),
            ("front-end", "carts"),
            ("front-end", "user"),
            ("orders", "carts"),
            ("orders", "payment"),
            ("orders", "shipping"),
            ("orders", "user"),
            ("user", "user-db"),
            ("catalogue", "catalogue-db"),
            ("carts", "carts-db"),
            ("orders", "orders-db"),
        ]
        G.add_edges_from(edges)
        
    elif "trainticket" in sys_lower or "tt" in sys_lower:
        # Train Ticket Core Service Dependencies
        edges = [
            ("ts-ui-dashboard", "ts-auth-service"),
            ("ts-ui-dashboard", "ts-order-service"),
            ("ts-ui-dashboard", "ts-route-service"),
            ("ts-ui-dashboard", "ts-travel-service"),
            ("ts-ui-dashboard", "ts-user-service"),
            ("ts-order-service", "ts-station-service"),
            ("ts-order-service", "ts-ticketinfo-service"),
            ("ts-order-service", "ts-security-service"),
            ("ts-travel-service", "ts-seat-service"),
            ("ts-travel-service", "ts-route-service"),
            ("ts-travel-service", "ts-order-service"),
            ("ts-preserve-service", "ts-seat-service"),
            ("ts-preserve-service", "ts-security-service"),
            ("ts-preserve-service", "ts-user-service"),
            ("ts-preserve-service", "ts-ticketinfo-service"),
        ]
        G.add_edges_from(edges)
    
    return G

def parse_service_and_metric(column_name: str) -> Tuple[str, str]:
    """Parses column like 'adservice_cpu' into ('adservice', 'cpu')."""
    if column_name == "time":
        return ("", "")
    parts = column_name.rsplit("_", 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return column_name, "metric"

def get_system_services(metric_columns: List[str]) -> List[str]:
    """Extracts unique service names from metric columns, ignoring noise/external."""
    services = set()
    for col in metric_columns:
        if col == "time":
            continue
        svc, _ = parse_service_and_metric(col)
        if svc and not svc.startswith("PassthroughCluster"):
            services.add(svc)
    return sorted(list(services))
