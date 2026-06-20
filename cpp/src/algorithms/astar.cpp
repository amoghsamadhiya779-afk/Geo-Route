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

PathResult AStar::route(const CSRGraph& graph, uint32_t source, uint32_t target, float weight) {
    auto start_time = std::chrono::high_resolution_clock::now();

    PathResult result;
    if (source >= graph.nodes.size() || target >= graph.nodes.size()) {
        return result;
    }

    std::vector<float> g_score(graph.nodes.size(), std::numeric_limits<float>::infinity());
    std::vector<uint32_t> parent(graph.nodes.size(), std::numeric_limits<uint32_t>::max());
    
    std::priority_queue<AStarQueueElement, std::vector<AStarQueueElement>, std::greater<AStarQueueElement>> pq;

    double target_lat = graph.nodes[target].lat;
    double target_lon = graph.nodes[target].lon;

    g_score[source] = 0.0f;
    float h_source = static_cast<float>(haversine(graph.nodes[source].lat, graph.nodes[source].lon, target_lat, target_lon));
    pq.push({source, 0.0f, h_source * weight});

    uint32_t visit_order = 0;

    while (!pq.empty()) {
        auto current = pq.top();
        pq.pop();

        if (current.g_score > g_score[current.node]) continue;

        result.nodes_explored++;
        result.visited.push_back({current.node, visit_order++, current.g_score, true});

        if (current.node == target) {
            result.distance = current.g_score;
            break;
        }

        uint32_t edge_start = graph.offsets[current.node];
        uint32_t edge_end = graph.offsets[current.node + 1];

        for (uint32_t e = edge_start; e < edge_end; ++e) {
            uint32_t next_node = graph.targets[e];
            float tentative_g = current.g_score + graph.weights[e];

            if (tentative_g < g_score[next_node]) {
                parent[next_node] = current.node;
                g_score[next_node] = tentative_g;
                float h = static_cast<float>(haversine(graph.nodes[next_node].lat, graph.nodes[next_node].lon, target_lat, target_lon));
                pq.push({next_node, tentative_g, tentative_g + h * weight});
            }
        }
    }

    if (result.distance >= 0.0f) {
        uint32_t curr = target;
        while (curr != std::numeric_limits<uint32_t>::max()) {
            result.path.push_back(curr);
            curr = parent[curr];
        }
        std::reverse(result.path.begin(), result.path.end());
    }

    auto end_time = std::chrono::high_resolution_clock::now();
    result.execution_time_us = std::chrono::duration_cast<std::chrono::microseconds>(end_time - start_time).count();

    return result;
}

} // namespace georoute
