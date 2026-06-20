#include "georoute/graph.h"
#include <stdexcept>

namespace georoute {

uint32_t AdjacencyGraph::add_node(uint64_t osm_id, double lat, double lon) {
    if (osm_to_idx.find(osm_id) != osm_to_idx.end()) {
        return osm_to_idx[osm_id];
    }
    
    uint32_t idx = static_cast<uint32_t>(nodes.size());
    nodes.push_back({lat, lon, osm_id});
    adj.push_back(std::vector<Edge>());
    osm_to_idx[osm_id] = idx;
    
    return idx;
}

void AdjacencyGraph::add_edge(uint32_t source, uint32_t target, float weight, uint16_t road_type, bool oneway) {
    if (source >= nodes.size() || target >= nodes.size()) {
        throw std::out_of_range("Node index out of bounds");
    }
    
    adj[source].push_back({target, weight, road_type, oneway});
    
    if (!oneway) {
        adj[target].push_back({source, weight, road_type, oneway});
    }
}

CSRGraph AdjacencyGraph::to_csr() const {
    return CSRGraph::from_adjacency(*this);
}

CSRGraph CSRGraph::from_adjacency(const AdjacencyGraph& graph) {
    CSRGraph csr;
    csr.nodes = graph.nodes;
    
    csr.offsets.reserve(graph.nodes.size() + 1);
    size_t total_edges = 0;
    for (const auto& edges : graph.adj) {
        total_edges += edges.size();
    }
    
    csr.targets.reserve(total_edges);
    csr.weights.reserve(total_edges);
    
    uint32_t current_offset = 0;
    for (const auto& edges : graph.adj) {
        csr.offsets.push_back(current_offset);
        for (const auto& edge : edges) {
            csr.targets.push_back(edge.target);
            csr.weights.push_back(edge.weight);
        }
        current_offset += static_cast<uint32_t>(edges.size());
    }
    csr.offsets.push_back(current_offset); // Final offset
    
    return csr;
}

} // namespace georoute
