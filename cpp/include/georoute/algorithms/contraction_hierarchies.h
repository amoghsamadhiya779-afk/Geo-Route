#pragma once

#include "georoute/algorithms/routing_algorithm.h"
#include <vector>
#include <string>

namespace georoute {

// Upward graph data structure containing only edges that go from lower to higher ranked nodes
struct CHData {
    uint32_t num_nodes = 0;
    std::vector<uint32_t> ranks;

    // Upward Forward Graph
    std::vector<uint32_t> up_fwd_offsets;
    std::vector<uint32_t> up_fwd_targets;
    std::vector<float> up_fwd_weights;
    std::vector<uint32_t> up_fwd_middle; // middle_node for shortcut unpacking, max_uint32 if original edge

    // Upward Backward Graph
    std::vector<uint32_t> up_bwd_offsets;
    std::vector<uint32_t> up_bwd_targets;
    std::vector<float> up_bwd_weights;
    std::vector<uint32_t> up_bwd_middle;
};

class CHSerializer {
public:
    static void save(const CHData& data, const std::string& filepath);
    static CHData load(const std::string& filepath);
};

class CHPreprocessor {
public:
    static CHData preprocess(const CSRGraph& graph);
};

class CHAlgorithm : public IRoutingAlgorithm {
private:
    CHData ch_data_;

    // Recursive path unpacking
    void unpack_path(uint32_t u, uint32_t v, const std::vector<uint32_t>& offsets, 
                     const std::vector<uint32_t>& targets, const std::vector<uint32_t>& middles, 
                     std::vector<uint32_t>& out_path) const;

public:
    explicit CHAlgorithm(CHData data);

    [[nodiscard]] std::string name() const override { return "Contraction Hierarchies"; }
    [[nodiscard]] PathResult route(const CSRGraph& graph, uint32_t source, uint32_t target) override;
};

} // namespace georoute
