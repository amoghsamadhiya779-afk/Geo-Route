#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <pybind11/functional.h>
#include "georoute/graph.h"
#include "georoute/serializer.h"
#include "georoute/algorithms/dijkstra.h"
#include "georoute/algorithms/astar.h"
#include "georoute/algorithms/bidirectional_astar.h"
#include "georoute/algorithms/alt.h"
#include "georoute/algorithms/contraction_hierarchies.h"

namespace py = pybind11;
using namespace georoute;

// Helper to find the nearest node to a given lat/lon
uint32_t find_nearest_node(const CSRGraph& graph, double lat, double lon) {
    uint32_t nearest = 0;
    double min_dist = std::numeric_limits<double>::infinity();
    for (uint32_t i = 0; i < graph.node_count(); ++i) {
        const auto& n = graph.node(i);
        // Simple euclidean distance proxy for nearest node lookup
        double dlat = n.lat - lat;
        double dlon = n.lon - lon;
        double dist = dlat * dlat + dlon * dlon;
        if (dist < min_dist) {
            min_dist = dist;
            nearest = i;
        }
    }
    return nearest;
}

// Wrapper for routing
PathResult compute_route(const CSRGraph& graph, uint32_t source, uint32_t target, const std::string& algo_name, const std::string& graph_path) {
    auto& registry = AlgorithmRegistry::instance();
    
    // Register basic algos if not already
    if (!registry.get("dijkstra")) registry.register_algo("dijkstra", std::make_unique<DijkstraAlgorithm>());
    if (!registry.get("astar")) registry.register_algo("astar", std::make_unique<AStarAlgorithm>());
    if (!registry.get("bidir")) registry.register_algo("bidir", std::make_unique<BidirAStarAlgorithm>(graph));

    // Lazy load advanced algos if requested
    if (algo_name == "alt" && !registry.get("alt")) {
        auto alt_data = ALTSerializer::load(graph_path + ".alt");
        registry.register_algo("alt", std::make_unique<ALTAlgorithm>(std::move(alt_data)));
    }
    if (algo_name == "ch" && !registry.get("ch")) {
        auto ch_data = CHSerializer::load(graph_path + ".ch");
        registry.register_algo("ch", std::make_unique<CHAlgorithm>(std::move(ch_data)));
    }

    IRoutingAlgorithm* algo = registry.get(algo_name);
    if (!algo) {
        throw std::runtime_error("Unknown algorithm or missing preprocessed data: " + algo_name);
    }

    return algo->route(graph, source, target);
}

PYBIND11_MODULE(georoute_core, m) {
    m.doc() = "Trent (GeoRoute) Core C++ Backend Bindings";

    // Bind Node
    py::class_<Node>(m, "Node")
        .def_readonly("id", &Node::id)
        .def_readonly("lat", &Node::lat)
        .def_readonly("lon", &Node::lon);

    // Bind Graph
    py::class_<CSRGraph>(m, "CSRGraph")
        .def("node_count", &CSRGraph::node_count)
        .def("edge_count", &CSRGraph::edge_count)
        .def("node", &CSRGraph::node)
        .def("nearest_node", &find_nearest_node);

    // Bind Serializer
    m.def("load_graph", &Serializer::load_graph, "Load a graph from binary .grp file");

    // Bind VisitedNode
    py::class_<VisitedNode>(m, "VisitedNode")
        .def_readonly("node_id", &VisitedNode::node_id)
        .def_readonly("visit_order", &VisitedNode::visit_order)
        .def_readonly("cost_so_far", &VisitedNode::cost_so_far)
        .def_readonly("is_forward", &VisitedNode::is_forward);

    // Bind Path metrics
    py::class_<Path>(m, "Path")
        .def_readonly("node_ids", &Path::node_ids)
        .def_readonly("total_distance", &Path::total_distance);

    py::class_<ExplorationMetrics>(m, "ExplorationMetrics")
        .def_readonly("nodes_explored", &ExplorationMetrics::nodes_explored)
        .def_readonly("visited", &ExplorationMetrics::visited);

    py::class_<PerformanceMetrics>(m, "PerformanceMetrics")
        .def_readonly("execution_time_us", &PerformanceMetrics::execution_time_us);

    py::class_<PathResult>(m, "PathResult")
        .def_readonly("path", &PathResult::path)
        .def_readonly("exploration", &PathResult::exploration)
        .def_readonly("metrics", &PathResult::metrics);

    // Bind Compute Route
    m.def("compute_route", &compute_route, "Compute the optimal route");
}
