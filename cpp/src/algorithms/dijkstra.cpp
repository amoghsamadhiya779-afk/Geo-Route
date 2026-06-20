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

PathResult Dijkstra::route(const CSRGraph& graph, uint32_t source, uint32_t target) {
    auto start_time = std::chrono::high_resolution_clock::now();

    PathResult result;
    if (source >= graph.nodes.size() || target >= graph.nodes.size()) {
        return result;
    }

    std::vector<float> dist(graph.nodes.size(), std::numeric_limits<float>::infinity());
    std::vector<uint32_t> parent(graph.nodes.size(), std::numeric_limits<uint32_t>::max());
    
    std::priority_queue<QueueElement, std::vector<QueueElement>, std::greater<QueueElement>> pq;

    dist[source] = 0.0f;
    pq.push({source, 0.0f});

    uint32_t visit_order = 0;

    while (!pq.empty()) {
        auto current = pq.top();
        pq.pop();

        if (current.dist > dist[current.node]) continue;

        result.nodes_explored++;
        result.visited.push_back({current.node, visit_order++, current.dist, true});

        if (current.node == target) {
            result.distance = current.dist;
            break;
        }

        uint32_t edge_start = graph.offsets[current.node];
        uint32_t edge_end = graph.offsets[current.node + 1];

        for (uint32_t e = edge_start; e < edge_end; ++e) {
            uint32_t next_node = graph.targets[e];
            float next_dist = current.dist + graph.weights[e];

            if (next_dist < dist[next_node]) {
                dist[next_node] = next_dist;
                parent[next_node] = current.node;
                pq.push({next_node, next_dist});
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
