#pragma once

#include "georoute/algorithms/dijkstra.h"

namespace georoute {

class BidirectionalAStar {
public:
    static PathResult route(const CSRGraph& graph, uint32_t source, uint32_t target, float weight = 1.0f);
};

} // namespace georoute
