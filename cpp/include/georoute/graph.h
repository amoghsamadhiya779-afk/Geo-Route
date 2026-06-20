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

// Immutable Compressed Sparse Row graph (used for routing)
class CSRGraph {
    friend class GraphBuilder;
    friend class Serializer;

private:
    std::vector<uint32_t> offsets_;
    std::vector<uint32_t> targets_;
    std::vector<float> weights_;
    std::vector<Node> nodes_;

public:
    CSRGraph() = default;

    [[nodiscard]] uint32_t node_count() const noexcept { return static_cast<uint32_t>(nodes_.size()); }
    [[nodiscard]] uint32_t edge_count() const noexcept { return static_cast<uint32_t>(targets_.size()); }

    /**
     * @brief Get the start and end indices of edges for a given node.
     * Use targets_[start..end] and weights_[start..end] to access edges.
     */
    [[nodiscard]] std::pair<uint32_t, uint32_t> edge_range(uint32_t node_id) const noexcept {
        return {offsets_[node_id], offsets_[node_id + 1]};
    }

    [[nodiscard]] uint32_t target(uint32_t edge_idx) const noexcept { return targets_[edge_idx]; }
    [[nodiscard]] float weight(uint32_t edge_idx) const noexcept { return weights_[edge_idx]; }
    [[nodiscard]] const Node& node(uint32_t node_id) const noexcept { return nodes_[node_id]; }

    /**
     * @brief Finds the nearest node to a given lat/lon using brute-force scan.
     */
    [[nodiscard]] uint32_t nearest_node(double lat, double lon) const noexcept;

    [[nodiscard]] size_t memory_bytes() const noexcept;
};

struct Edge {
    uint32_t target;
    float weight;
    uint16_t road_type;
    bool oneway;
};

// Builder pattern for creating CSRGraphs
class GraphBuilder {
private:
    std::vector<Node> nodes_;
    std::vector<std::vector<Edge>> adj_;
    std::unordered_map<uint64_t, uint32_t> osm_to_idx_;

public:
    [[nodiscard]] uint32_t add_node(uint64_t osm_id, double lat, double lon);
    void add_edge(uint32_t source, uint32_t target, float weight, uint16_t road_type, bool oneway);
    
    // Looks up internal node index from OSM ID
    [[nodiscard]] uint32_t get_node_idx(uint64_t osm_id) const;

    [[nodiscard]] CSRGraph build() const;
};

} // namespace georoute
