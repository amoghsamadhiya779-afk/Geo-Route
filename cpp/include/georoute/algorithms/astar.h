#pragma once

#include "georoute/algorithms/dijkstra.h"

namespace georoute {

class AStar {
public:
    // weight > 1.0 makes it a greedy search (faster, but potentially suboptimal)
    static PathResult route(const CSRGraph& graph, uint32_t source, uint32_t target, float weight = 1.0f);
};

} // namespace georoute
