#pragma once

#include <vector>
#include <cstdint>
#include <unordered_map>

namespace georoute {

struct Node {
    double lat;
    double lon;
    uint64_t osm_id;
};

struct Edge {
    uint32_t target;
    float weight;
    uint16_t road_type;
    bool oneway;
};

// Forward declaration
struct CSRGraph;

// Mutable adjacency list graph (used for construction)
struct AdjacencyGraph {
    std::vector<Node> nodes;
    std::vector<std::vector<Edge>> adj;
    std::unordered_map<uint64_t, uint32_t> osm_to_idx;

    uint32_t add_node(uint64_t osm_id, double lat, double lon);
    void add_edge(uint32_t source, uint32_t target, float weight, uint16_t road_type, bool oneway);
    
    // Converts to an immutable CSR representation
    CSRGraph to_csr() const;
};

// Immutable Compressed Sparse Row graph (used for routing)
struct CSRGraph {
    std::vector<uint32_t> offsets;
    std::vector<uint32_t> targets;
    std::vector<float> weights;
    std::vector<Node> nodes;

    // Factory method from AdjacencyGraph
    static CSRGraph from_adjacency(const AdjacencyGraph& graph);
};

} // namespace georoute
