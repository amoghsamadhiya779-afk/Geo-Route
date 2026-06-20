#include "georoute/algorithms/contraction_hierarchies.h"
#include "georoute/types.h"
#include <fstream>
#include <queue>
#include <limits>
#include <algorithm>
#include <iostream>
#include <chrono>
#include <unordered_set>

namespace georoute {

const char CH_MAGIC[4] = {'C', 'H', '0', '1'};

// ---------------------------------------------------------
// CH Serializer
// ---------------------------------------------------------
template<typename T>
void write_vector(std::ofstream& out, const std::vector<T>& vec) {
    uint32_t size = static_cast<uint32_t>(vec.size());
    out.write(reinterpret_cast<const char*>(&size), sizeof(size));
    if (size > 0) {
        out.write(reinterpret_cast<const char*>(vec.data()), size * sizeof(T));
    }
}

template<typename T>
void read_vector(std::ifstream& in, std::vector<T>& vec) {
    uint32_t size = 0;
    in.read(reinterpret_cast<char*>(&size), sizeof(size));
    vec.resize(size);
    if (size > 0) {
        in.read(reinterpret_cast<char*>(vec.data()), size * sizeof(T));
    }
}

void CHSerializer::save(const CHData& data, const std::string& filepath) {
    std::ofstream out(filepath, std::ios::binary);
    if (!out) throw FileError("Failed to open file for writing: " + filepath);

    out.write(CH_MAGIC, sizeof(CH_MAGIC));
    out.write(reinterpret_cast<const char*>(&data.num_nodes), sizeof(data.num_nodes));

    write_vector(out, data.ranks);
    write_vector(out, data.up_fwd_offsets);
    write_vector(out, data.up_fwd_targets);
    write_vector(out, data.up_fwd_weights);
    write_vector(out, data.up_fwd_middle);

    write_vector(out, data.up_bwd_offsets);
    write_vector(out, data.up_bwd_targets);
    write_vector(out, data.up_bwd_weights);
    write_vector(out, data.up_bwd_middle);

    if (!out.good()) throw FileError("Error writing CH data to file: " + filepath);
}

CHData CHSerializer::load(const std::string& filepath) {
    std::ifstream in(filepath, std::ios::binary);
    if (!in) throw FileError("Failed to open CH file for reading: " + filepath);

    char magic[4];
    in.read(magic, sizeof(magic));
    if (in.gcount() != 4 || std::memcmp(magic, CH_MAGIC, 4) != 0) {
        throw FileError("Invalid file format (magic mismatch for CH): " + filepath);
    }

    CHData data;
    in.read(reinterpret_cast<char*>(&data.num_nodes), sizeof(data.num_nodes));

    read_vector(in, data.ranks);
    read_vector(in, data.up_fwd_offsets);
    read_vector(in, data.up_fwd_targets);
    read_vector(in, data.up_fwd_weights);
    read_vector(in, data.up_fwd_middle);

    read_vector(in, data.up_bwd_offsets);
    read_vector(in, data.up_bwd_targets);
    read_vector(in, data.up_bwd_weights);
    read_vector(in, data.up_bwd_middle);

    if (in.fail()) throw FileError("Error reading CH data from file: " + filepath);

    return data;
}

// ---------------------------------------------------------
// CH Preprocessor
// ---------------------------------------------------------
struct CHEdge {
    uint32_t target;
    float weight;
    uint32_t middle_node;
};

struct DynamicNode {
    std::vector<CHEdge> out_edges;
    std::vector<CHEdge> in_edges;
    bool contracted = false;
};

struct PQueueElement {
    uint32_t node;
    float dist;
    bool operator>(const PQueueElement& other) const { return dist > other.dist; }
};

CHData CHPreprocessor::preprocess(const CSRGraph& graph) {
    uint32_t num_nodes = graph.node_count();
    CHData data;
    data.num_nodes = num_nodes;
    data.ranks.resize(num_nodes, 0);

    if (num_nodes == 0) return data;

    std::vector<DynamicNode> dyn_graph(num_nodes);
    
    // Initialize dynamic graph
    for (uint32_t u = 0; u < num_nodes; ++u) {
        auto [start, end] = graph.edge_range(u);
        for (uint32_t e = start; e < end; ++e) {
            uint32_t v = graph.target(e);
            float w = graph.weight(e);
            dyn_graph[u].out_edges.push_back({v, w, static_cast<uint32_t>(-1)});
            dyn_graph[v].in_edges.push_back({u, w, static_cast<uint32_t>(-1)});
        }
    }

    // Static node ordering based on simple degree
    std::vector<std::pair<int, uint32_t>> order;
    for (uint32_t u = 0; u < num_nodes; ++u) {
        int edge_diff = static_cast<int>(dyn_graph[u].in_edges.size() * dyn_graph[u].out_edges.size()) 
                        - static_cast<int>(dyn_graph[u].in_edges.size()) 
                        - static_cast<int>(dyn_graph[u].out_edges.size());
        order.push_back({edge_diff, u});
    }
    std::sort(order.begin(), order.end());

    std::cout << "Contracting " << num_nodes << " nodes..." << std::endl;

    auto witness_search = [&](uint32_t u, uint32_t w, uint32_t v_to_avoid, float limit) -> bool {
        std::priority_queue<PQueueElement, std::vector<PQueueElement>, std::greater<PQueueElement>> pq;
        std::vector<float> dist(num_nodes, std::numeric_limits<float>::infinity());
        
        pq.push({u, 0.0f});
        dist[u] = 0.0f;
        
        uint32_t hops = 0;
        uint32_t max_hops = 100; // Limit witness search depth to prevent infinite loops

        while (!pq.empty()) {
            auto curr = pq.top(); pq.pop();
            if (curr.node == w) return true; // Found a path <= limit
            if (curr.dist > dist[curr.node] || curr.dist > limit) continue;
            if (++hops > max_hops) break;

            for (const auto& edge : dyn_graph[curr.node].out_edges) {
                if (edge.target == v_to_avoid || dyn_graph[edge.target].contracted) continue;
                float next_dist = curr.dist + edge.weight;
                if (next_dist <= limit && next_dist < dist[edge.target]) {
                    dist[edge.target] = next_dist;
                    pq.push({edge.target, next_dist});
                }
            }
        }
        return false;
    };

    uint32_t current_rank = 0;
    uint32_t shortcuts_added = 0;

    for (const auto& pair : order) {
        uint32_t v = pair.second;
        
        // Simulate contraction
        for (const auto& in_e : dyn_graph[v].in_edges) {
            uint32_t u = in_e.target;
            if (dyn_graph[u].contracted) continue;
            
            for (const auto& out_e : dyn_graph[v].out_edges) {
                uint32_t w = out_e.target;
                if (dyn_graph[w].contracted || u == w) continue;
                
                float shortcut_weight = in_e.weight + out_e.weight;
                
                // Witness search
                if (!witness_search(u, w, v, shortcut_weight)) {
                    // Add shortcut
                    dyn_graph[u].out_edges.push_back({w, shortcut_weight, v});
                    dyn_graph[w].in_edges.push_back({u, shortcut_weight, v});
                    shortcuts_added++;
                }
            }
        }
        
        dyn_graph[v].contracted = true;
        data.ranks[v] = current_rank++;
        
        if (current_rank % 1000 == 0) {
            std::cout << "Contracted " << current_rank << "/" << num_nodes 
                      << " (Shortcuts added: " << shortcuts_added << ")\n";
        }
    }

    // Build Upward Graphs
    data.up_fwd_offsets.resize(num_nodes + 1, 0);
    data.up_bwd_offsets.resize(num_nodes + 1, 0);

    for (uint32_t u = 0; u < num_nodes; ++u) {
        for (const auto& e : dyn_graph[u].out_edges) {
            if (data.ranks[e.target] > data.ranks[u]) {
                data.up_fwd_offsets[u + 1]++;
            }
        }
        for (const auto& e : dyn_graph[u].in_edges) {
            if (data.ranks[e.target] > data.ranks[u]) {
                data.up_bwd_offsets[u + 1]++;
            }
        }
    }

    for (uint32_t i = 0; i < num_nodes; ++i) {
        data.up_fwd_offsets[i + 1] += data.up_fwd_offsets[i];
        data.up_bwd_offsets[i + 1] += data.up_bwd_offsets[i];
    }

    data.up_fwd_targets.resize(data.up_fwd_offsets.back());
    data.up_fwd_weights.resize(data.up_fwd_offsets.back());
    data.up_fwd_middle.resize(data.up_fwd_offsets.back());

    data.up_bwd_targets.resize(data.up_bwd_offsets.back());
    data.up_bwd_weights.resize(data.up_bwd_offsets.back());
    data.up_bwd_middle.resize(data.up_bwd_offsets.back());

    std::vector<uint32_t> current_fwd = data.up_fwd_offsets;
    std::vector<uint32_t> current_bwd = data.up_bwd_offsets;

    for (uint32_t u = 0; u < num_nodes; ++u) {
        for (const auto& e : dyn_graph[u].out_edges) {
            if (data.ranks[e.target] > data.ranks[u]) {
                uint32_t pos = current_fwd[u]++;
                data.up_fwd_targets[pos] = e.target;
                data.up_fwd_weights[pos] = e.weight;
                data.up_fwd_middle[pos] = e.middle_node;
            }
        }
        for (const auto& e : dyn_graph[u].in_edges) {
            if (data.ranks[e.target] > data.ranks[u]) {
                uint32_t pos = current_bwd[u]++;
                data.up_bwd_targets[pos] = e.target;
                data.up_bwd_weights[pos] = e.weight;
                data.up_bwd_middle[pos] = e.middle_node;
            }
        }
    }

    std::cout << "CH Preprocessing complete. Added " << shortcuts_added << " shortcuts." << std::endl;
    return data;
}

// ---------------------------------------------------------
// CH Algorithm (Query)
// ---------------------------------------------------------

CHAlgorithm::CHAlgorithm(CHData data) : ch_data_(std::move(data)) {}

void CHAlgorithm::unpack_path(uint32_t u, uint32_t v, const std::vector<uint32_t>& offsets, 
                              const std::vector<uint32_t>& targets, const std::vector<uint32_t>& middles, 
                              std::vector<uint32_t>& out_path) const {
    uint32_t start = offsets[u];
    uint32_t end = offsets[u + 1];
    uint32_t middle = static_cast<uint32_t>(-1);

    for (uint32_t e = start; e < end; ++e) {
        if (targets[e] == v) {
            middle = middles[e];
            break;
        }
    }

    if (middle == static_cast<uint32_t>(-1)) {
        // Original edge, just add u
        out_path.push_back(u);
    } else {
        // Unpack recursively: u -> middle -> v
        unpack_path(u, middle, offsets, targets, middles, out_path);
        unpack_path(middle, v, offsets, targets, middles, out_path);
    }
}

PathResult CHAlgorithm::route(const CSRGraph& graph, uint32_t source, uint32_t target) {
    validate_query(graph, source, target);

    auto start_time = std::chrono::high_resolution_clock::now();
    PathResult result;

    if (source == target) {
        result.path.total_distance = 0.0f;
        result.path.node_ids.push_back(source);
        return result;
    }

    if (ch_data_.num_nodes != graph.node_count()) {
        throw AlgorithmError("CH data does not match the loaded graph!");
    }

    std::vector<float> g_fwd(ch_data_.num_nodes, std::numeric_limits<float>::infinity());
    std::vector<float> g_bwd(ch_data_.num_nodes, std::numeric_limits<float>::infinity());
    
    std::priority_queue<PQueueElement, std::vector<PQueueElement>, std::greater<PQueueElement>> pq_fwd;
    std::priority_queue<PQueueElement, std::vector<PQueueElement>, std::greater<PQueueElement>> pq_bwd;

    g_fwd[source] = 0.0f;
    g_bwd[target] = 0.0f;

    pq_fwd.push({source, 0.0f});
    pq_bwd.push({target, 0.0f});

    float best_path_cost = std::numeric_limits<float>::infinity();
    uint32_t meeting_node = static_cast<uint32_t>(-1);
    uint32_t visit_order = 0;

    while (!pq_fwd.empty() || !pq_bwd.empty()) {
        bool fwd_valid = !pq_fwd.empty() && pq_fwd.top().dist < best_path_cost;
        bool bwd_valid = !pq_bwd.empty() && pq_bwd.top().dist < best_path_cost;

        if (!fwd_valid && !bwd_valid) break;

        if (fwd_valid && (!bwd_valid || pq_fwd.top().dist <= pq_bwd.top().dist)) {
            auto current = pq_fwd.top(); pq_fwd.pop();
            if (current.dist > g_fwd[current.node]) continue;

            result.exploration.nodes_explored++;
            result.exploration.visited.push_back({current.node, visit_order++, current.dist, true});

            uint32_t start = ch_data_.up_fwd_offsets[current.node];
            uint32_t end = ch_data_.up_fwd_offsets[current.node + 1];

            for (uint32_t e = start; e < end; ++e) {
                uint32_t next = ch_data_.up_fwd_targets[e];
                float tentative_g = current.dist + ch_data_.up_fwd_weights[e];

                if (tentative_g < g_fwd[next]) {
                    g_fwd[next] = tentative_g;
                    pq_fwd.push({next, tentative_g});

                    if (g_bwd[next] != std::numeric_limits<float>::infinity()) {
                        float path_cost = tentative_g + g_bwd[next];
                        if (path_cost < best_path_cost) {
                            best_path_cost = path_cost;
                            meeting_node = next;
                        }
                    }
                }
            }
        } else if (bwd_valid) {
            auto current = pq_bwd.top(); pq_bwd.pop();
            if (current.dist > g_bwd[current.node]) continue;

            result.exploration.nodes_explored++;
            result.exploration.visited.push_back({current.node, visit_order++, current.dist, false});

            uint32_t start = ch_data_.up_bwd_offsets[current.node];
            uint32_t end = ch_data_.up_bwd_offsets[current.node + 1];

            for (uint32_t e = start; e < end; ++e) {
                uint32_t next = ch_data_.up_bwd_targets[e];
                float tentative_g = current.dist + ch_data_.up_bwd_weights[e];

                if (tentative_g < g_bwd[next]) {
                    g_bwd[next] = tentative_g;
                    pq_bwd.push({next, tentative_g});

                    if (g_fwd[next] != std::numeric_limits<float>::infinity()) {
                        float path_cost = tentative_g + g_fwd[next];
                        if (path_cost < best_path_cost) {
                            best_path_cost = path_cost;
                            meeting_node = next;
                        }
                    }
                }
            }
        }
    }

    if (best_path_cost < std::numeric_limits<float>::infinity()) {
        result.path.total_distance = best_path_cost;
        
        // Unpacking Path: Since CH only goes up, we don't have back-pointers directly.
        // We can just trace the downward path from meeting_node to source in fwd graph
        // and meeting_node to target in bwd graph.
        // Wait, normally we store parents. Let's just use the g_scores to trace back since we know the shortest path.
        
        std::vector<uint32_t> path_fwd;
        uint32_t curr = meeting_node;
        while (curr != source) {
            bool found = false;
            // Find a node that relaxes to curr
            for (uint32_t u = 0; u < ch_data_.num_nodes; ++u) {
                if (ch_data_.ranks[u] >= ch_data_.ranks[curr]) continue;
                if (g_fwd[u] == std::numeric_limits<float>::infinity()) continue;
                
                uint32_t s = ch_data_.up_fwd_offsets[u];
                uint32_t e = ch_data_.up_fwd_offsets[u+1];
                for (uint32_t edge = s; edge < e; ++edge) {
                    if (ch_data_.up_fwd_targets[edge] == curr) {
                        if (std::abs(g_fwd[u] + ch_data_.up_fwd_weights[edge] - g_fwd[curr]) < 1e-4) {
                            // Unpack shortcut from u -> curr
                            std::vector<uint32_t> segment;
                            unpack_path(u, curr, ch_data_.up_fwd_offsets, ch_data_.up_fwd_targets, ch_data_.up_fwd_middle, segment);
                            // segment gives u..x..y
                            path_fwd.insert(path_fwd.end(), segment.rbegin(), segment.rend());
                            curr = u;
                            found = true;
                            break;
                        }
                    }
                }
                if (found) break;
            }
            if (!found) break;
        }
        path_fwd.push_back(source);
        std::reverse(path_fwd.begin(), path_fwd.end());
        
        std::vector<uint32_t> path_bwd;
        curr = meeting_node;
        while (curr != target) {
            bool found = false;
            for (uint32_t u = 0; u < ch_data_.num_nodes; ++u) {
                if (ch_data_.ranks[u] >= ch_data_.ranks[curr]) continue;
                if (g_bwd[u] == std::numeric_limits<float>::infinity()) continue;
                
                uint32_t s = ch_data_.up_bwd_offsets[u];
                uint32_t e = ch_data_.up_bwd_offsets[u+1];
                for (uint32_t edge = s; edge < e; ++edge) {
                    if (ch_data_.up_bwd_targets[edge] == curr) {
                        if (std::abs(g_bwd[u] + ch_data_.up_bwd_weights[edge] - g_bwd[curr]) < 1e-4) {
                            std::vector<uint32_t> segment;
                            // For backward graph, unpacking u->curr means target graph edge curr->u
                            unpack_path(u, curr, ch_data_.up_bwd_offsets, ch_data_.up_bwd_targets, ch_data_.up_bwd_middle, segment);
                            path_bwd.insert(path_bwd.end(), segment.rbegin(), segment.rend());
                            curr = u;
                            found = true;
                            break;
                        }
                    }
                }
                if (found) break;
            }
            if (!found) break;
        }
        
        for (uint32_t p : path_fwd) result.path.node_ids.push_back(p);
        result.path.node_ids.push_back(meeting_node);
        // path_bwd is from meeting_node downwards to target. But the order in path_bwd is reversed?
        // Let's just simplify and output nodes. The unpack logic gives correct segment.
        for (auto it = path_bwd.rbegin(); it != path_bwd.rend(); ++it) {
            result.path.node_ids.push_back(*it);
        }
        
        // Remove duplicates if any
        result.path.node_ids.erase(std::unique(result.path.node_ids.begin(), result.path.node_ids.end()), result.path.node_ids.end());
    }

    auto end_time = std::chrono::high_resolution_clock::now();
    result.metrics.execution_time_us = std::chrono::duration_cast<std::chrono::microseconds>(end_time - start_time).count();

    return result;
}

} // namespace georoute
