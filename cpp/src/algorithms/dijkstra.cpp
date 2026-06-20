#include "georoute/algorithms/dijkstra.h"
#include <queue>
#include <limits>
#include <chrono>
#include <algorithm>

namespace georoute {

struct QueueElement {
    uint32_t node;
    float dist;

    bool operator>(const QueueElement& other) const {
        return dist > other.dist;
    }
};

PathResult DijkstraAlgorithm::route(const CSRGraph& graph, uint32_t source, uint32_t target) {
    validate_query(graph, source, target);

    auto start_time = std::chrono::high_resolution_clock::now();
    PathResult result;

    if (source == target) {
        result.path.total_distance = 0.0f;
        result.path.node_ids.push_back(source);
        return result;
    }

    std::vector<float> dist(graph.node_count(), std::numeric_limits<float>::infinity());
    std::vector<uint32_t> parent(graph.node_count(), static_cast<uint32_t>(-1));
    
    std::priority_queue<QueueElement, std::vector<QueueElement>, std::greater<QueueElement>> pq;

    dist[source] = 0.0f;
    pq.push({source, 0.0f});

    uint32_t visit_order = 0;
    float final_distance = -1.0f;

    while (!pq.empty()) {
        auto current = pq.top();
        pq.pop();

        if (current.dist > dist[current.node]) continue;

        result.exploration.nodes_explored++;
        result.exploration.visited.push_back({current.node, visit_order++, current.dist, true});

        if (current.node == target) {
            final_distance = current.dist;
            break;
        }

        auto [edge_start, edge_end] = graph.edge_range(current.node);

        for (uint32_t e = edge_start; e < edge_end; ++e) {
            uint32_t next_node = graph.target(e);
            float next_dist = current.dist + graph.weight(e);

            if (next_dist < dist[next_node]) {
                dist[next_node] = next_dist;
                parent[next_node] = current.node;
                pq.push({next_node, next_dist});
            }
        }
    }

    result.path = reconstruct_path(parent, target, final_distance);

    auto end_time = std::chrono::high_resolution_clock::now();
    result.metrics.execution_time_us = std::chrono::duration_cast<std::chrono::microseconds>(end_time - start_time).count();

    return result;
}

} // namespace georoute
