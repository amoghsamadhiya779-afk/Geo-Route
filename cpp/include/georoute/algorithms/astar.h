#pragma once

#include "georoute/algorithms/routing_algorithm.h"

namespace georoute {

class AStarAlgorithm : public IRoutingAlgorithm {
private:
    float heuristic_weight_;

public:
    explicit AStarAlgorithm(float heuristic_weight = 1.0f) : heuristic_weight_(heuristic_weight) {}

    [[nodiscard]] std::string name() const override { return "A* (w=" + std::to_string(heuristic_weight_) + ")"; }
    [[nodiscard]] PathResult route(const CSRGraph& graph, uint32_t source, uint32_t target) override;
};

} // namespace georoute
