#pragma once

#include "georoute/algorithms/routing_algorithm.h"

namespace georoute {

class BidirAStarAlgorithm : public IRoutingAlgorithm {
private:
    float heuristic_weight_;
    
    // Cached backward graph
    std::vector<uint32_t> bwd_offsets_;
    std::vector<uint32_t> bwd_targets_;
    std::vector<float> bwd_weights_;

    void build_backward_graph(const CSRGraph& fwd);

public:
    explicit BidirAStarAlgorithm(const CSRGraph& graph, float heuristic_weight = 1.0f);

    [[nodiscard]] std::string name() const override { return "Bidir A* (w=" + std::to_string(heuristic_weight_) + ")"; }
    [[nodiscard]] PathResult route(const CSRGraph& graph, uint32_t source, uint32_t target) override;
};

} // namespace georoute
