"""
georoute_core.py — Python Mock for the C++ Routing Engine

This module provides a pure-Python fallback that mimics the C++ georoute_core
extension. It implements the same interface (load_graph, compute_route) so that
the FastAPI backend works without a compiled C++ build.

Design Principles:
  - Strategy Pattern: Algorithm behavior varies by name string.
  - Single Responsibility: Each class handles one concern (Node, Path, Graph).
  - Open/Closed: New algorithms can be added without modifying compute_route internals.
"""

import math
import random
import time
from typing import List, Tuple


class Node:
    """Represents a geographic node (intersection) in the routing graph."""
    __slots__ = ('node_id', 'lat', 'lon')

    def __init__(self, node_id: int, lat: float, lon: float):
        self.node_id = node_id
        self.lat = lat
        self.lon = lon


class VisitedNode:
    """Records a node visited during algorithm exploration."""
    __slots__ = ('node_id', 'visit_order', 'cost_so_far', 'is_forward')

    def __init__(self, node_id: int, visit_order: int, cost_so_far: float, is_forward: bool):
        self.node_id = node_id
        self.visit_order = visit_order
        self.cost_so_far = cost_so_far
        self.is_forward = is_forward


class ExplorationResult:
    """Encapsulates the search exploration metadata."""
    __slots__ = ('nodes_explored', 'visited')

    def __init__(self, nodes_explored: int, visited: List[VisitedNode]):
        self.nodes_explored = nodes_explored
        self.visited = visited


class Path:
    """Encapsulates the final computed path."""
    __slots__ = ('node_ids', 'total_distance')

    def __init__(self, node_ids: List[int], total_distance: float):
        self.node_ids = node_ids
        self.total_distance = total_distance


class Metrics:
    """Performance metrics for algorithm execution."""
    __slots__ = ('execution_time_us',)

    def __init__(self, execution_time_us: int):
        self.execution_time_us = execution_time_us


class PathResult:
    """Composite result object combining path, exploration, and metrics."""
    __slots__ = ('path', 'exploration', 'metrics')

    def __init__(self, path: Path, exploration: ExplorationResult, metrics: Metrics):
        self.path = path
        self.exploration = exploration
        self.metrics = metrics


from utils.math_utils import calculate_haversine


class CSRGraph:
    """
    Mock CSR (Compressed Sparse Row) Graph.
    
    In production, this would be loaded from a binary .graph file parsed
    by the C++ engine. This mock dynamically generates nodes based on
    the coordinates it receives.
    """

    def __init__(self, filepath: str):
        self.filepath = filepath
        self._mock_nodes = {}

    def nearest_node(self, lat: float, lon: float) -> int:
        """Snap coordinates to the nearest node ID (mock: hash-based)."""
        n_id = int(abs(hash((round(lat, 5), round(lon, 5))))) % 10000000
        self._mock_nodes[n_id] = Node(n_id, lat, lon)
        return n_id

    def node(self, n_id: int) -> Node:
        """Retrieve a node by its ID."""
        if n_id in self._mock_nodes:
            return self._mock_nodes[n_id]
        # Should not happen in normal flow; return a safe default
        return Node(n_id, 0.0, 0.0)


def load_graph(filepath: str) -> CSRGraph:
    """Factory: Load a graph from a file path (mock implementation)."""
    print(f"[GeoRoute Core] Loading graph from {filepath}")
    return CSRGraph(filepath)


# Algorithm speed profiles: maps algorithm name to (speed_factor, exploration_ratio)
# speed_factor: higher = faster convergence (fewer nodes explored)
# exploration_ratio: how wide the search fan is relative to the path
_ALGORITHM_PROFILES = {
    "dijkstra":  {"speed_factor": 1.0,   "exploration_ratio": 1.0,   "label": "Dijkstra (Baseline)"},
    "astar":     {"speed_factor": 2.5,   "exploration_ratio": 0.6,   "label": "A* (Heuristic)"},
    "bidir":     {"speed_factor": 5.0,   "exploration_ratio": 0.4,   "label": "Bidirectional A*"},
    "alt":       {"speed_factor": 6.0,   "exploration_ratio": 0.35,  "label": "ALT (Landmarks)"},
    "ch":        {"speed_factor": 100.0, "exploration_ratio": 0.05,  "label": "Contraction Hierarchies"},
}


def compute_route(
    graph: CSRGraph,
    source_id: int,
    target_id: int,
    algorithm: str,
    graph_path: str
) -> PathResult:
    """
    Simulate route computation using the specified algorithm.
    
    Generates a realistic path between source and target with:
    - Haversine-based distance calculation
    - Algorithm-specific node exploration counts
    - Simulated exploration fan for visualization
    """
    start_time = time.perf_counter()

    start_node = graph.node(source_id)
    end_node = graph.node(target_id)

    profile = _ALGORITHM_PROFILES.get(algorithm, _ALGORITHM_PROFILES["astar"])
    speed_factor = profile["speed_factor"]
    exploration_ratio = profile["exploration_ratio"]

    # --- 1. Generate Path ---
    # Attempt to fetch real road network path from OSRM
    import requests
    path_node_ids = []
    total_distance = 0.0
    
    try:
        url = f"http://router.project-osrm.org/route/v1/driving/{start_node.lon},{start_node.lat};{end_node.lon},{end_node.lat}?overview=full&geometries=geojson"
        resp = requests.get(url, timeout=3)
        data = resp.json()
        if data.get("code") == "Ok" and data["routes"]:
            route = data["routes"][0]
            total_distance = route["distance"]
            coords = route["geometry"]["coordinates"]
            
            for lon, lat in coords:
                n_id = int(abs(hash((round(lat, 6), round(lon, 6))))) % 10000000
                graph._mock_nodes[n_id] = Node(n_id, lat, lon)
                path_node_ids.append(n_id)
        else:
            raise ValueError("OSRM returned no route")
    except Exception as e:
        print(f"[GeoRoute Core] OSRM fetch failed ({e}). Falling back to interpolation.")
        # Fallback to curved interpolation
        num_waypoints = 25
        prev_lat, prev_lon = start_node.lat, start_node.lon

        for i in range(num_waypoints + 1):
            t = i / num_waypoints
            curve_offset_lat = 0.002 * math.sin(t * math.pi) * random.uniform(-1, 1)
            curve_offset_lon = 0.002 * math.sin(t * math.pi) * random.uniform(-1, 1)

            lat = start_node.lat + (end_node.lat - start_node.lat) * t + curve_offset_lat
            lon = start_node.lon + (end_node.lon - start_node.lon) * t + curve_offset_lon

            n_id = int(abs(hash((round(lat, 6), round(lon, 6))))) % 10000000
            graph._mock_nodes[n_id] = Node(n_id, lat, lon)
            path_node_ids.append(n_id)

            if i > 0:
                total_distance += calculate_haversine(prev_lat, prev_lon, lat, lon)
            prev_lat, prev_lon = lat, lon

    # --- 2. Generate Exploration Cloud ---
    # Base exploration count scales with distance (more distance = more nodes)
    base_explore = max(200, int(total_distance / 5.0))
    nodes_explored_count = max(10, int(base_explore / speed_factor))
    
    visited = []
    for i in range(nodes_explored_count):
        t = random.uniform(0, 1)
        # Spread exploration around the path corridor
        spread = 0.015 * exploration_ratio
        lat = start_node.lat + (end_node.lat - start_node.lat) * t + random.gauss(0, spread)
        lon = start_node.lon + (end_node.lon - start_node.lon) * t + random.gauss(0, spread)

        is_fwd = True
        if algorithm == "bidir" and t > 0.5:
            is_fwd = False

        n_id = int(abs(hash((round(lat, 6), round(lon, 6))))) % 10000000
        graph._mock_nodes[n_id] = Node(n_id, lat, lon)
        visited.append(VisitedNode(n_id, i, t * total_distance, is_fwd))

    # --- 3. Calculate Metrics ---
    elapsed_us = int((time.perf_counter() - start_time) * 1_000_000)
    # Simulate realistic execution time based on algorithm speed
    simulated_time_us = max(50, int(15000 / speed_factor) + random.randint(-500, 500))

    path = Path(node_ids=path_node_ids, total_distance=round(total_distance, 2))
    exploration = ExplorationResult(nodes_explored=nodes_explored_count, visited=visited)
    metrics = Metrics(execution_time_us=simulated_time_us)

    return PathResult(path=path, exploration=exploration, metrics=metrics)
