#include "georoute/graph.h"
#include "georoute/types.h"
#include "georoute/haversine.h"
#include <stdexcept>
#include <limits>

namespace georoute {

uint32_t GraphBuilder::add_node(uint64_t osm_id, double lat, double lon) {
    auto it = osm_to_idx_.find(osm_id);
    if (it != osm_to_idx_.end()) {
        return it->second;
    }
    
    uint32_t idx = static_cast<uint32_t>(nodes_.size());
    nodes_.push_back({lat, lon, osm_id});
    adj_.emplace_back();
    osm_to_idx_[osm_id] = idx;
    
    return idx;
}

void GraphBuilder::add_edge(uint32_t source, uint32_t target, float weight, uint16_t road_type, bool oneway) {
    if (source >= nodes_.size() || target >= nodes_.size()) {
        throw GraphError("Node index out of bounds");
    }
    
    adj_[source].push_back({target, weight, road_type, oneway});
    
    if (!oneway) {
        adj_[target].push_back({source, weight, road_type, oneway});
    }
}

uint32_t GraphBuilder::get_node_idx(uint64_t osm_id) const {
    auto it = osm_to_idx_.find(osm_id);
    if (it == osm_to_idx_.end()) {
        throw GraphError("OSM node ID not found in builder");
    }
    return it->second;
}

CSRGraph GraphBuilder::build() const {
    CSRGraph csr;
    csr.nodes_ = nodes_;
    
    csr.offsets_.reserve(nodes_.size() + 1);
    size_t total_edges = 0;
    for (const auto& edges : adj_) {
        total_edges += edges.size();
    }
    
    csr.targets_.reserve(total_edges);
    csr.weights_.reserve(total_edges);
    
    uint32_t current_offset = 0;
    for (const auto& edges : adj_) {
        csr.offsets_.push_back(current_offset);
        for (const auto& edge : edges) {
            csr.targets_.push_back(edge.target);
            csr.weights_.push_back(edge.weight);
            // Note: road_type and oneway are intentionally dropped in CSRGraph to save memory.
            // If they are needed for routing later, they should be added to CSRGraph arrays.
        }
        current_offset += static_cast<uint32_t>(edges.size());
    }
    csr.offsets_.push_back(current_offset); // Final offset
    
    return csr;
}

uint32_t CSRGraph::nearest_node(double lat, double lon) const noexcept {
    if (nodes_.empty()) return std::numeric_limits<uint32_t>::max();

    uint32_t best_node = 0;
    double best_dist = std::numeric_limits<double>::max();

    for (uint32_t i = 0; i < node_count(); ++i) {
        double dist = haversine(lat, lon, nodes_[i].lat, nodes_[i].lon);
        if (dist < best_dist) {
            best_dist = dist;
            best_node = i;
        }
    }
    return best_node;
}

size_t CSRGraph::memory_bytes() const noexcept {
    size_t mem = 0;
    mem += offsets_.capacity() * sizeof(uint32_t);
    mem += targets_.capacity() * sizeof(uint32_t);
    mem += weights_.capacity() * sizeof(float);
    mem += nodes_.capacity() * sizeof(Node);
    return mem;
}

} // namespace georoute
