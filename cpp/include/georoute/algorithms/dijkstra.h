#pragma once

#include "georoute/algorithms/routing_algorithm.h"

namespace georoute {

class DijkstraAlgorithm : public IRoutingAlgorithm {
public:
    [[nodiscard]] std::string name() const override { return "Dijkstra"; }
    [[nodiscard]] PathResult route(const CSRGraph& graph, uint32_t source, uint32_t target) override;
};

} // namespace georoute
