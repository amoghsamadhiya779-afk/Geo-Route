#pragma once

#include "georoute/graph.h"
#include <vector>

namespace georoute {

struct VisitedNode {
    uint32_t node_id;
    uint32_t visit_order;
    float cost_so_far;
    bool is_forward; // True for forward search, false for backward
};

struct PathResult {
    std::vector<uint32_t> path;
    std::vector<VisitedNode> visited;
    float distance = -1.0f; // -1 if no path found
    uint32_t nodes_explored = 0;
    long long execution_time_us = 0;
};

class Dijkstra {
public:
    static PathResult route(const CSRGraph& graph, uint32_t source, uint32_t target);
};

} // namespace georoute
