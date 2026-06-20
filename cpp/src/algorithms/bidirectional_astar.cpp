#include "georoute/algorithms/bidirectional_astar.h"
#include "georoute/haversine.h"
#include <queue>
#include <limits>
#include <chrono>
#include <algorithm>

namespace georoute {

struct BidirQueueElement {
    uint32_t node;
    float g_score;
    float f_score;

    bool operator>(const BidirQueueElement& other) const {
        return f_score > other.f_score;
    }
};

// Helper to build backward graph
static void build_backward_graph(const CSRGraph& fwd, 
                                 std::vector<uint32_t>& bwd_offsets,
                                 std::vector<uint32_t>& bwd_targets,
                                 std::vector<float>& bwd_weights) {
    uint32_t num_nodes = static_cast<uint32_t>(fwd.nodes.size());
    std::vector<uint32_t> in_degrees(num_nodes, 0);

    for (uint32_t t : fwd.targets) {
        in_degrees[t]++;
    }

    bwd_offsets.resize(num_nodes + 1, 0);
    for (uint32_t i = 0; i < num_nodes; ++i) {
        bwd_offsets[i + 1] = bwd_offsets[i] + in_degrees[i];
    }

    bwd_targets.resize(fwd.targets.size());
    bwd_weights.resize(fwd.weights.size());
    
    std::vector<uint32_t> current_offsets = bwd_offsets;

    for (uint32_t u = 0; u < num_nodes; ++u) {
        uint32_t start = fwd.offsets[u];
        uint32_t end = fwd.offsets[u + 1];
        for (uint32_t e = start; e < end; ++e) {
            uint32_t v = fwd.targets[e];
            float w = fwd.weights[e];

            uint32_t pos = current_offsets[v]++;
            bwd_targets[pos] = u;
            bwd_weights[pos] = w;
        }
    }
}

PathResult BidirectionalAStar::route(const CSRGraph& graph, uint32_t source, uint32_t target, float weight) {
    auto start_time = std::chrono::high_resolution_clock::now();
    PathResult result;
    if (source >= graph.nodes.size() || target >= graph.nodes.size()) return result;

    if (source == target) {
        result.path.push_back(source);
        result.distance = 0.0f;
        return result;
    }

    std::vector<uint32_t> bwd_offsets, bwd_targets;
    std::vector<float> bwd_weights;
    build_backward_graph(graph, bwd_offsets, bwd_targets, bwd_weights);

    std::vector<float> g_fwd(graph.nodes.size(), std::numeric_limits<float>::infinity());
    std::vector<float> g_bwd(graph.nodes.size(), std::numeric_limits<float>::infinity());
    std::vector<uint32_t> parent_fwd(graph.nodes.size(), std::numeric_limits<uint32_t>::max());
    std::vector<uint32_t> parent_bwd(graph.nodes.size(), std::numeric_limits<uint32_t>::max());

    std::priority_queue<BidirQueueElement, std::vector<BidirQueueElement>, std::greater<BidirQueueElement>> pq_fwd;
    std::priority_queue<BidirQueueElement, std::vector<BidirQueueElement>, std::greater<BidirQueueElement>> pq_bwd;

    double s_lat = graph.nodes[source].lat;
    double s_lon = graph.nodes[source].lon;
    double t_lat = graph.nodes[target].lat;
    double t_lon = graph.nodes[target].lon;

    g_fwd[source] = 0.0f;
    g_bwd[target] = 0.0f;

    pq_fwd.push({source, 0.0f, 0.0f});
    pq_bwd.push({target, 0.0f, 0.0f});

    float best_path_cost = std::numeric_limits<float>::infinity();
    uint32_t meeting_node = std::numeric_limits<uint32_t>::max();
    uint32_t visit_order = 0;

    auto h_fwd = [&](uint32_t u) -> float {
        float h_to_t = static_cast<float>(haversine(graph.nodes[u].lat, graph.nodes[u].lon, t_lat, t_lon));
        float h_from_s = static_cast<float>(haversine(s_lat, s_lon, graph.nodes[u].lat, graph.nodes[u].lon));
        return (h_to_t - h_from_s) / 2.0f;
    };

    auto h_bwd = [&](uint32_t u) -> float {
        float h_from_s = static_cast<float>(haversine(s_lat, s_lon, graph.nodes[u].lat, graph.nodes[u].lon));
        float h_to_t = static_cast<float>(haversine(graph.nodes[u].lat, graph.nodes[u].lon, t_lat, t_lon));
        return (h_from_s - h_to_t) / 2.0f;
    };

    while (!pq_fwd.empty() && !pq_bwd.empty()) {
        float min_f_fwd = pq_fwd.top().f_score;
        float min_f_bwd = pq_bwd.top().f_score;

        if (min_f_fwd + min_f_bwd >= best_path_cost) {
            break;
        }

        if (min_f_fwd <= min_f_bwd) {
            auto current = pq_fwd.top();
            pq_fwd.pop();

            if (current.g_score > g_fwd[current.node]) continue;

            result.nodes_explored++;
            result.visited.push_back({current.node, visit_order++, current.g_score, true});

            uint32_t edge_start = graph.offsets[current.node];
            uint32_t edge_end = graph.offsets[current.node + 1];

            for (uint32_t e = edge_start; e < edge_end; ++e) {
                uint32_t next_node = graph.targets[e];
                float tentative_g = current.g_score + graph.weights[e];

                if (tentative_g < g_fwd[next_node]) {
                    g_fwd[next_node] = tentative_g;
                    parent_fwd[next_node] = current.node;
                    pq_fwd.push({next_node, tentative_g, tentative_g + h_fwd(next_node) * weight});

                    if (g_bwd[next_node] != std::numeric_limits<float>::infinity()) {
                        float path_cost = tentative_g + g_bwd[next_node];
                        if (path_cost < best_path_cost) {
                            best_path_cost = path_cost;
                            meeting_node = next_node;
                        }
                    }
                }
            }
        } else {
            auto current = pq_bwd.top();
            pq_bwd.pop();

            if (current.g_score > g_bwd[current.node]) continue;

            result.nodes_explored++;
            result.visited.push_back({current.node, visit_order++, current.g_score, false});

            uint32_t edge_start = bwd_offsets[current.node];
            uint32_t edge_end = bwd_offsets[current.node + 1];

            for (uint32_t e = edge_start; e < edge_end; ++e) {
                uint32_t next_node = bwd_targets[e];
                float tentative_g = current.g_score + bwd_weights[e];

                if (tentative_g < g_bwd[next_node]) {
                    g_bwd[next_node] = tentative_g;
                    parent_bwd[next_node] = current.node;
                    pq_bwd.push({next_node, tentative_g, tentative_g + h_bwd(next_node) * weight});

                    if (g_fwd[next_node] != std::numeric_limits<float>::infinity()) {
                        float path_cost = tentative_g + g_fwd[next_node];
                        if (path_cost < best_path_cost) {
                            best_path_cost = path_cost;
                            meeting_node = next_node;
                        }
                    }
                }
            }
        }
    }

    if (best_path_cost < std::numeric_limits<float>::infinity()) {
        result.distance = best_path_cost;
        std::vector<uint32_t> path_fwd;
        uint32_t curr = meeting_node;
        while (curr != std::numeric_limits<uint32_t>::max()) {
            path_fwd.push_back(curr);
            curr = parent_fwd[curr];
        }
        std::reverse(path_fwd.begin(), path_fwd.end());

        curr = parent_bwd[meeting_node];
        while (curr != std::numeric_limits<uint32_t>::max()) {
            path_fwd.push_back(curr);
            curr = parent_bwd[curr];
        }
        result.path = path_fwd;
    }

    auto end_time = std::chrono::high_resolution_clock::now();
    result.execution_time_us = std::chrono::duration_cast<std::chrono::microseconds>(end_time - start_time).count();

    return result;
}

} // namespace georoute
