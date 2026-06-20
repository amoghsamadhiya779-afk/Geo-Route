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

BidirAStarAlgorithm::BidirAStarAlgorithm(const CSRGraph& graph, float heuristic_weight) 
    : heuristic_weight_(heuristic_weight) {
    build_backward_graph(graph);
}

void BidirAStarAlgorithm::build_backward_graph(const CSRGraph& fwd) {
    uint32_t num_nodes = fwd.node_count();
    std::vector<uint32_t> in_degrees(num_nodes, 0);

    for (uint32_t i = 0; i < num_nodes; ++i) {
        auto [start, end] = fwd.edge_range(i);
        for (uint32_t e = start; e < end; ++e) {
            uint32_t target = fwd.target(e);
            if (target < num_nodes) {
                in_degrees[target]++;
            }
        }
    }

    bwd_offsets_.resize(num_nodes + 1, 0);
    for (uint32_t i = 0; i < num_nodes; ++i) {
        bwd_offsets_[i + 1] = bwd_offsets_[i] + in_degrees[i];
    }

    bwd_targets_.resize(fwd.edge_count());
    bwd_weights_.resize(fwd.edge_count());
    
    std::vector<uint32_t> current_offsets = bwd_offsets_;

    for (uint32_t u = 0; u < num_nodes; ++u) {
        auto [start, end] = fwd.edge_range(u);
        for (uint32_t e = start; e < end; ++e) {
            uint32_t v = fwd.target(e);
            if (v < num_nodes) {
                float w = fwd.weight(e);
                uint32_t pos = current_offsets[v]++;
                bwd_targets_[pos] = u;
                bwd_weights_[pos] = w;
            }
        }
    }
}

PathResult BidirAStarAlgorithm::route(const CSRGraph& graph, uint32_t source, uint32_t target) {
    validate_query(graph, source, target);

    auto start_time = std::chrono::high_resolution_clock::now();
    PathResult result;

    if (source == target) {
        result.path.total_distance = 0.0f;
        result.path.node_ids.push_back(source);
        return result;
    }

    std::vector<float> g_fwd(graph.node_count(), std::numeric_limits<float>::infinity());
    std::vector<float> g_bwd(graph.node_count(), std::numeric_limits<float>::infinity());
    std::vector<uint32_t> parent_fwd(graph.node_count(), static_cast<uint32_t>(-1));
    std::vector<uint32_t> parent_bwd(graph.node_count(), static_cast<uint32_t>(-1));

    std::priority_queue<BidirQueueElement, std::vector<BidirQueueElement>, std::greater<BidirQueueElement>> pq_fwd;
    std::priority_queue<BidirQueueElement, std::vector<BidirQueueElement>, std::greater<BidirQueueElement>> pq_bwd;

    const Node& source_node = graph.node(source);
    const Node& target_node = graph.node(target);
    double s_lat = source_node.lat;
    double s_lon = source_node.lon;
    double t_lat = target_node.lat;
    double t_lon = target_node.lon;

    g_fwd[source] = 0.0f;
    g_bwd[target] = 0.0f;

    pq_fwd.push({source, 0.0f, 0.0f});
    pq_bwd.push({target, 0.0f, 0.0f});

    float best_path_cost = std::numeric_limits<float>::infinity();
    uint32_t meeting_node = static_cast<uint32_t>(-1);
    uint32_t visit_order = 0;

    auto h_fwd = [&](uint32_t u) -> float {
        const Node& u_node = graph.node(u);
        float h_to_t = static_cast<float>(haversine(u_node.lat, u_node.lon, t_lat, t_lon));
        float h_from_s = static_cast<float>(haversine(s_lat, s_lon, u_node.lat, u_node.lon));
        return std::max(0.0f, (h_to_t - h_from_s) / 2.0f);
    };

    auto h_bwd = [&](uint32_t u) -> float {
        const Node& u_node = graph.node(u);
        float h_from_s = static_cast<float>(haversine(s_lat, s_lon, u_node.lat, u_node.lon));
        float h_to_t = static_cast<float>(haversine(u_node.lat, u_node.lon, t_lat, t_lon));
        return std::max(0.0f, (h_from_s - h_to_t) / 2.0f);
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

            result.exploration.nodes_explored++;
            result.exploration.visited.push_back({current.node, visit_order++, current.g_score, true});

            auto [edge_start, edge_end] = graph.edge_range(current.node);

            for (uint32_t e = edge_start; e < edge_end; ++e) {
                uint32_t next_node = graph.target(e);
                float tentative_g = current.g_score + graph.weight(e);

                if (tentative_g < g_fwd[next_node]) {
                    g_fwd[next_node] = tentative_g;
                    parent_fwd[next_node] = current.node;
                    pq_fwd.push({next_node, tentative_g, tentative_g + h_fwd(next_node) * heuristic_weight_});

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

            result.exploration.nodes_explored++;
            result.exploration.visited.push_back({current.node, visit_order++, current.g_score, false});

            uint32_t edge_start = bwd_offsets_[current.node];
            uint32_t edge_end = bwd_offsets_[current.node + 1];

            for (uint32_t e = edge_start; e < edge_end; ++e) {
                uint32_t next_node = bwd_targets_[e];
                float tentative_g = current.g_score + bwd_weights_[e];

                if (tentative_g < g_bwd[next_node]) {
                    g_bwd[next_node] = tentative_g;
                    parent_bwd[next_node] = current.node;
                    pq_bwd.push({next_node, tentative_g, tentative_g + h_bwd(next_node) * heuristic_weight_});

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
        result.path.total_distance = best_path_cost;
        std::vector<uint32_t> path_fwd;
        uint32_t curr = meeting_node;
        while (curr != static_cast<uint32_t>(-1)) {
            path_fwd.push_back(curr);
            curr = parent_fwd[curr];
        }
        std::reverse(path_fwd.begin(), path_fwd.end());

        curr = parent_bwd[meeting_node];
        while (curr != static_cast<uint32_t>(-1)) {
            path_fwd.push_back(curr);
            curr = parent_bwd[curr];
        }
        result.path.node_ids = path_fwd;
    }

    auto end_time = std::chrono::high_resolution_clock::now();
    result.metrics.execution_time_us = std::chrono::duration_cast<std::chrono::microseconds>(end_time - start_time).count();

    return result;
}

} // namespace georoute
