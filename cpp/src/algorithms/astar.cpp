#include "georoute/algorithms/astar.h"
#include "georoute/haversine.h"
#include <queue>
#include <limits>
#include <chrono>
#include <algorithm>

namespace georoute {

struct AStarQueueElement {
    uint32_t node;
    float g_score;
    float f_score;

    bool operator>(const AStarQueueElement& other) const {
        return f_score > other.f_score;
    }
};

PathResult AStarAlgorithm::route(const CSRGraph& graph, uint32_t source, uint32_t target) {
    validate_query(graph, source, target);

    auto start_time = std::chrono::high_resolution_clock::now();
    PathResult result;

    if (source == target) {
        result.path.total_distance = 0.0f;
        result.path.node_ids.push_back(source);
        return result;
    }

    std::vector<float> g_score(graph.node_count(), std::numeric_limits<float>::infinity());
    std::vector<uint32_t> parent(graph.node_count(), static_cast<uint32_t>(-1));
    
    std::priority_queue<AStarQueueElement, std::vector<AStarQueueElement>, std::greater<AStarQueueElement>> pq;

    const Node& target_node = graph.node(target);
    double target_lat = target_node.lat;
    double target_lon = target_node.lon;

    g_score[source] = 0.0f;
    const Node& source_node = graph.node(source);
    float h_source = static_cast<float>(haversine(source_node.lat, source_node.lon, target_lat, target_lon));
    pq.push({source, 0.0f, h_source * heuristic_weight_});

    uint32_t visit_order = 0;
    float final_distance = -1.0f;

    while (!pq.empty()) {
        auto current = pq.top();
        pq.pop();

        if (current.g_score > g_score[current.node]) continue;

        result.exploration.nodes_explored++;
        result.exploration.visited.push_back({current.node, visit_order++, current.g_score, true});

        if (current.node == target) {
            final_distance = current.g_score;
            break;
        }

        auto [edge_start, edge_end] = graph.edge_range(current.node);

        for (uint32_t e = edge_start; e < edge_end; ++e) {
            uint32_t next_node = graph.target(e);
            float tentative_g = current.g_score + graph.weight(e);

            if (tentative_g < g_score[next_node]) {
                parent[next_node] = current.node;
                g_score[next_node] = tentative_g;
                const Node& next_node_data = graph.node(next_node);
                float h = static_cast<float>(haversine(next_node_data.lat, next_node_data.lon, target_lat, target_lon));
                pq.push({next_node, tentative_g, tentative_g + h * heuristic_weight_});
            }
        }
    }

    result.path = reconstruct_path(parent, target, final_distance);

    auto end_time = std::chrono::high_resolution_clock::now();
    result.metrics.execution_time_us = std::chrono::duration_cast<std::chrono::microseconds>(end_time - start_time).count();

    return result;
}

} // namespace georoute
