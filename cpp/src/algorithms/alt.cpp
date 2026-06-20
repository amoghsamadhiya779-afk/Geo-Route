#include "georoute/algorithms/alt.h"
#include "georoute/types.h"
#include <fstream>
#include <queue>
#include <limits>
#include <algorithm>
#include <iostream>
#include <chrono>

namespace georoute {

// ---------------------------------------------------------
// ALT Serializer
// ---------------------------------------------------------
const char ALT_MAGIC[4] = {'A', 'L', 'T', '1'};

void ALTSerializer::save(const ALTData& data, const std::string& filepath) {
    std::ofstream out(filepath, std::ios::binary);
    if (!out) {
        throw FileError("Failed to open file for writing: " + filepath);
    }

    out.write(ALT_MAGIC, sizeof(ALT_MAGIC));
    out.write(reinterpret_cast<const char*>(&data.num_nodes), sizeof(data.num_nodes));
    out.write(reinterpret_cast<const char*>(&data.num_landmarks), sizeof(data.num_landmarks));

    if (data.num_landmarks > 0) {
        out.write(reinterpret_cast<const char*>(data.landmarks.data()), data.num_landmarks * sizeof(uint32_t));
        
        size_t array_size = static_cast<size_t>(data.num_landmarks) * data.num_nodes;
        out.write(reinterpret_cast<const char*>(data.dist_to.data()), array_size * sizeof(float));
        out.write(reinterpret_cast<const char*>(data.dist_from.data()), array_size * sizeof(float));
    }

    if (!out.good()) {
        throw FileError("Error writing ALT data to file: " + filepath);
    }
}

ALTData ALTSerializer::load(const std::string& filepath) {
    std::ifstream in(filepath, std::ios::binary | std::ios::ate);
    if (!in) {
        throw FileError("Failed to open ALT file for reading: " + filepath);
    }

    std::streamsize file_size = in.tellg();
    in.seekg(0, std::ios::beg);

    if (file_size < 12) {
        throw FileError("File is too small to be a valid ALT data file: " + filepath);
    }

    char magic[4];
    in.read(magic, sizeof(magic));
    if (in.gcount() != 4 || std::memcmp(magic, ALT_MAGIC, 4) != 0) {
        throw FileError("Invalid file format (magic mismatch for ALT): " + filepath);
    }

    ALTData data;
    in.read(reinterpret_cast<char*>(&data.num_nodes), sizeof(data.num_nodes));
    in.read(reinterpret_cast<char*>(&data.num_landmarks), sizeof(data.num_landmarks));

    size_t expected_size = 12 + data.num_landmarks * sizeof(uint32_t) + 
                           2 * static_cast<size_t>(data.num_landmarks) * data.num_nodes * sizeof(float);

    if (static_cast<size_t>(file_size) != expected_size) {
        throw FileError("ALT file size mismatch. Expected " + std::to_string(expected_size) + 
                        " bytes but got " + std::to_string(file_size));
    }

    data.landmarks.resize(data.num_landmarks);
    size_t array_size = static_cast<size_t>(data.num_landmarks) * data.num_nodes;
    data.dist_to.resize(array_size);
    data.dist_from.resize(array_size);

    if (data.num_landmarks > 0) {
        in.read(reinterpret_cast<char*>(data.landmarks.data()), data.num_landmarks * sizeof(uint32_t));
        in.read(reinterpret_cast<char*>(data.dist_to.data()), array_size * sizeof(float));
        in.read(reinterpret_cast<char*>(data.dist_from.data()), array_size * sizeof(float));
    }

    if (in.fail()) {
        throw FileError("Error reading ALT data from file: " + filepath);
    }

    return data;
}

// ---------------------------------------------------------
// ALT Preprocessor
// ---------------------------------------------------------

struct PQueueElement {
    uint32_t node;
    float dist;
    bool operator>(const PQueueElement& other) const { return dist > other.dist; }
};

static void build_backward_graph(const CSRGraph& fwd, 
                                 std::vector<uint32_t>& bwd_offsets,
                                 std::vector<uint32_t>& bwd_targets,
                                 std::vector<float>& bwd_weights) {
    uint32_t num_nodes = fwd.node_count();
    std::vector<uint32_t> in_degrees(num_nodes, 0);

    for (uint32_t i = 0; i < num_nodes; ++i) {
        auto [start, end] = fwd.edge_range(i);
        for (uint32_t e = start; e < end; ++e) {
            uint32_t target = fwd.target(e);
            if (target < num_nodes) in_degrees[target]++;
        }
    }

    bwd_offsets.resize(num_nodes + 1, 0);
    for (uint32_t i = 0; i < num_nodes; ++i) {
        bwd_offsets[i + 1] = bwd_offsets[i] + in_degrees[i];
    }

    bwd_targets.resize(fwd.edge_count());
    bwd_weights.resize(fwd.edge_count());
    std::vector<uint32_t> current_offsets = bwd_offsets;

    for (uint32_t u = 0; u < num_nodes; ++u) {
        auto [start, end] = fwd.edge_range(u);
        for (uint32_t e = start; e < end; ++e) {
            uint32_t v = fwd.target(e);
            if (v < num_nodes) {
                float w = fwd.weight(e);
                uint32_t pos = current_offsets[v]++;
                bwd_targets[pos] = u;
                bwd_weights[pos] = w;
            }
        }
    }
}

static void run_dijkstra_fwd(const CSRGraph& graph, uint32_t source, float* dist_array) {
    uint32_t n = graph.node_count();
    std::fill(dist_array, dist_array + n, std::numeric_limits<float>::infinity());
    
    std::priority_queue<PQueueElement, std::vector<PQueueElement>, std::greater<PQueueElement>> pq;
    dist_array[source] = 0.0f;
    pq.push({source, 0.0f});

    while (!pq.empty()) {
        auto curr = pq.top(); pq.pop();
        if (curr.dist > dist_array[curr.node]) continue;

        auto [start, end] = graph.edge_range(curr.node);
        for (uint32_t e = start; e < end; ++e) {
            uint32_t next = graph.target(e);
            float next_dist = curr.dist + graph.weight(e);
            if (next_dist < dist_array[next]) {
                dist_array[next] = next_dist;
                pq.push({next, next_dist});
            }
        }
    }
}

static void run_dijkstra_bwd(const std::vector<uint32_t>& offsets,
                             const std::vector<uint32_t>& targets,
                             const std::vector<float>& weights,
                             uint32_t num_nodes, uint32_t source, float* dist_array) {
    std::fill(dist_array, dist_array + num_nodes, std::numeric_limits<float>::infinity());
    
    std::priority_queue<PQueueElement, std::vector<PQueueElement>, std::greater<PQueueElement>> pq;
    dist_array[source] = 0.0f;
    pq.push({source, 0.0f});

    while (!pq.empty()) {
        auto curr = pq.top(); pq.pop();
        if (curr.dist > dist_array[curr.node]) continue;

        uint32_t start = offsets[curr.node];
        uint32_t end = offsets[curr.node + 1];
        for (uint32_t e = start; e < end; ++e) {
            uint32_t next = targets[e];
            float next_dist = curr.dist + weights[e];
            if (next_dist < dist_array[next]) {
                dist_array[next] = next_dist;
                pq.push({next, next_dist});
            }
        }
    }
}

ALTData ALTPreprocessor::preprocess(const CSRGraph& graph, uint32_t num_landmarks) {
    ALTData data;
    data.num_nodes = graph.node_count();
    data.num_landmarks = num_landmarks;
    
    if (data.num_nodes == 0 || num_landmarks == 0) return data;

    size_t array_size = static_cast<size_t>(num_landmarks) * data.num_nodes;
    data.dist_to.resize(array_size);
    data.dist_from.resize(array_size);
    
    // Build backward graph once
    std::vector<uint32_t> bwd_offsets, bwd_targets;
    std::vector<float> bwd_weights;
    build_backward_graph(graph, bwd_offsets, bwd_targets, bwd_weights);

    std::cout << "Selecting " << num_landmarks << " landmarks using farthest-first..." << std::endl;
    
    std::vector<float> min_dist_to_landmark(data.num_nodes, std::numeric_limits<float>::infinity());
    
    // Pick first landmark arbitrarily (node 0) or farthest from random
    uint32_t current_landmark = 0; 
    
    for (uint32_t i = 0; i < num_landmarks; ++i) {
        data.landmarks.push_back(current_landmark);
        std::cout << "Landmark " << i+1 << "/" << num_landmarks << ": Node " << current_landmark << std::endl;

        // Run fwd dijkstra to fill dist_from[i * num_nodes ...]
        float* d_from = data.dist_from.data() + (i * data.num_nodes);
        run_dijkstra_fwd(graph, current_landmark, d_from);

        // Run bwd dijkstra to fill dist_to[i * num_nodes ...]
        float* d_to = data.dist_to.data() + (i * data.num_nodes);
        run_dijkstra_bwd(bwd_offsets, bwd_targets, bwd_weights, data.num_nodes, current_landmark, d_to);

        // Update min_dist array to find the next farthest landmark
        // We use the sum or max of fwd/bwd distances to approximate distance to the set
        float max_dist = -1.0f;
        uint32_t next_landmark = 0;

        for (uint32_t v = 0; v < data.num_nodes; ++v) {
            float d = std::min(d_from[v], d_to[v]);
            if (d < min_dist_to_landmark[v]) {
                min_dist_to_landmark[v] = d;
            }
            // Find farthest node that is reachable
            if (min_dist_to_landmark[v] != std::numeric_limits<float>::infinity() && min_dist_to_landmark[v] > max_dist) {
                max_dist = min_dist_to_landmark[v];
                next_landmark = v;
            }
        }
        
        current_landmark = next_landmark;
    }
    
    return data;
}

// ---------------------------------------------------------
// ALT Algorithm (Query)
// ---------------------------------------------------------

ALTAlgorithm::ALTAlgorithm(ALTData data, float heuristic_weight)
    : alt_data_(std::move(data)), heuristic_weight_(heuristic_weight) {}

PathResult ALTAlgorithm::route(const CSRGraph& graph, uint32_t source, uint32_t target) {
    validate_query(graph, source, target);

    auto start_time = std::chrono::high_resolution_clock::now();
    PathResult result;

    if (source == target) {
        result.path.total_distance = 0.0f;
        result.path.node_ids.push_back(source);
        return result;
    }

    if (alt_data_.num_nodes != graph.node_count()) {
        throw AlgorithmError("ALT data does not match the loaded graph!");
    }

    // Active landmark selection: pick the best 4 landmarks for this query
    std::vector<uint32_t> active_landmarks;
    if (alt_data_.num_landmarks <= 4) {
        for (uint32_t i=0; i<alt_data_.num_landmarks; ++i) active_landmarks.push_back(i);
    } else {
        std::vector<std::pair<float, uint32_t>> heuristic_scores;
        for (uint32_t i = 0; i < alt_data_.num_landmarks; ++i) {
            size_t base = i * alt_data_.num_nodes;
            float dt_s = alt_data_.dist_to[base + source];
            float dt_t = alt_data_.dist_to[base + target];
            float df_s = alt_data_.dist_from[base + source];
            float df_t = alt_data_.dist_from[base + target];
            
            float h1 = (dt_s != std::numeric_limits<float>::infinity() && dt_t != std::numeric_limits<float>::infinity()) ? (dt_s - dt_t) : 0.0f;
            float h2 = (df_t != std::numeric_limits<float>::infinity() && df_s != std::numeric_limits<float>::infinity()) ? (df_t - df_s) : 0.0f;
            
            heuristic_scores.push_back({std::max(h1, h2), i});
        }
        std::sort(heuristic_scores.rbegin(), heuristic_scores.rend()); // descending
        for (int i = 0; i < 4; ++i) active_landmarks.push_back(heuristic_scores[i].second);
    }

    // A* search
    std::vector<float> g_score(graph.node_count(), std::numeric_limits<float>::infinity());
    std::vector<uint32_t> parent(graph.node_count(), static_cast<uint32_t>(-1));
    
    struct AStarQueueElement {
        uint32_t node;
        float g_score;
        float f_score;
        bool operator>(const AStarQueueElement& other) const { return f_score > other.f_score; }
    };
    
    std::priority_queue<AStarQueueElement, std::vector<AStarQueueElement>, std::greater<AStarQueueElement>> pq;

    g_score[source] = 0.0f;
    pq.push({source, 0.0f, 0.0f});

    uint32_t visit_order = 0;
    float final_distance = -1.0f;

    auto compute_h = [&](uint32_t u) -> float {
        float max_h = 0.0f;
        for (uint32_t l_idx : active_landmarks) {
            size_t base = l_idx * alt_data_.num_nodes;
            
            // Triangle inequality 1: d(u, L) - d(t, L) <= d(u, t)
            float dt_u = alt_data_.dist_to[base + u];
            float dt_t = alt_data_.dist_to[base + target];
            if (dt_u != std::numeric_limits<float>::infinity() && dt_t != std::numeric_limits<float>::infinity()) {
                float h1 = dt_u - dt_t;
                if (h1 > max_h) max_h = h1;
            }
            
            // Triangle inequality 2: d(L, t) - d(L, u) <= d(u, t)
            float df_u = alt_data_.dist_from[base + u];
            float df_t = alt_data_.dist_from[base + target];
            if (df_u != std::numeric_limits<float>::infinity() && df_t != std::numeric_limits<float>::infinity()) {
                float h2 = df_t - df_u;
                if (h2 > max_h) max_h = h2;
            }
        }
        return std::max(0.0f, max_h) * heuristic_weight_;
    };

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
                float h = compute_h(next_node);
                pq.push({next_node, tentative_g, tentative_g + h});
            }
        }
    }

    result.path = reconstruct_path(parent, target, final_distance);

    auto end_time = std::chrono::high_resolution_clock::now();
    result.metrics.execution_time_us = std::chrono::duration_cast<std::chrono::microseconds>(end_time - start_time).count();

    return result;
}

} // namespace georoute
