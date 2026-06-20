import json
import os
import sys

# Add the build directory to sys.path so we can import the compiled C++ extension
build_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "cpp", "build"))
sys.path.append(build_dir)

try:
    import georoute_core
except ImportError:
    print("Warning: Could not import georoute_core. Ensure it is compiled and in cpp/build/")
    georoute_core = None

class GraphManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GraphManager, cls).__new__(cls)
            cls._instance._init()
        return cls._instance

    def _init(self):
        self.cities_metadata = {}
        self.graphs = {}
        self.load_metadata()

    def load_metadata(self):
        cities_file = os.path.join(os.path.dirname(__file__), "..", "data", "cities.json")
        if os.path.exists(cities_file):
            with open(cities_file, 'r') as f:
                data = json.load(f)
                for city in data.get("cities", []):
                    self.cities_metadata[city["id"]] = city
        else:
            print(f"Warning: {cities_file} not found.")

    def get_all_cities(self):
        return list(self.cities_metadata.values())

    def get_city_info(self, city_id: str):
        return self.cities_metadata.get(city_id)

    def get_graph(self, city_id: str):
        if not georoute_core:
            raise RuntimeError("georoute_core C++ extension is not available.")
            
        if city_id not in self.graphs:
            city_info = self.cities_metadata.get(city_id)
            if not city_info:
                raise ValueError(f"Unknown city: {city_id}")
            
            graph_path = os.path.join(os.path.dirname(__file__), city_info["graph_file"])
            # if not os.path.exists(graph_path):
            #     raise FileNotFoundError(f"Graph file not found: {graph_path}")
            
            print(f"Lazy loading graph for {city_id} from {graph_path}...")
            self.graphs[city_id] = georoute_core.load_graph(graph_path)
            
        return self.graphs[city_id]

    def compute_route(self, city_id: str, start_lat: float, start_lon: float, end_lat: float, end_lon: float, algorithm: str):
        graph = self.get_graph(city_id)
        
        # Snap to nearest node
        source_id = graph.nearest_node(start_lat, start_lon)
        target_id = graph.nearest_node(end_lat, end_lon)
        
        city_info = self.cities_metadata.get(city_id)
        graph_path = os.path.join(os.path.dirname(__file__), city_info["graph_file"])
        
        # Compute route (this calls C++ directly)
        result = georoute_core.compute_route(graph, source_id, target_id, algorithm, graph_path)
        
        # Unpack the C++ PathResult into a Python dictionary
        path_coords = []
        for n_id in result.path.node_ids:
            node = graph.node(n_id)
            path_coords.append([node.lon, node.lat]) # GeoJSON format: [lon, lat]
            
        visited_nodes = []
        for v in result.exploration.visited:
            node = graph.node(v.node_id)
            visited_nodes.append({
                "lon": node.lon,
                "lat": node.lat,
                "order": v.visit_order,
                "cost": v.cost_so_far,
                "is_forward": v.is_forward
            })
            
        return {
            "path": {
                "coordinates": path_coords,
                "distance_m": result.path.total_distance
            },
            "metrics": {
                "execution_time_us": result.metrics.execution_time_us,
                "nodes_explored": result.exploration.nodes_explored
            },
            "exploration": visited_nodes
        }
