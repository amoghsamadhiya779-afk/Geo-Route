#pragma once

#include <vector>
#include <cstdint>
#include <string>
#include <stdexcept>

namespace georoute {

// Custom exception hierarchy
class GeoRouteError : public std::runtime_error {
public:
    explicit GeoRouteError(const std::string& msg) : std::runtime_error(msg) {}
};

class FileError : public GeoRouteError {
public:
    explicit FileError(const std::string& msg) : GeoRouteError("File Error: " + msg) {}
};

class ParseError : public GeoRouteError {
public:
    explicit ParseError(const std::string& msg) : GeoRouteError("Parse Error: " + msg) {}
};

class GraphError : public GeoRouteError {
public:
    explicit GraphError(const std::string& msg) : GeoRouteError("Graph Error: " + msg) {}
};

class AlgorithmError : public GeoRouteError {
public:
    explicit AlgorithmError(const std::string& msg) : GeoRouteError("Algorithm Error: " + msg) {}
};

// Represents a node visited during exploration (useful for animation/visualization)
struct VisitedNode {
    uint32_t node_id;
    uint32_t visit_order;
    float cost_so_far;
    bool is_forward; // True for forward search, false for backward
};

// Represents the final reconstructed path
struct RoutePath {
    std::vector<uint32_t> node_ids;
    float total_distance = -1.0f; // -1.0f indicates no path found
};

// Represents the exploration history
struct ExplorationTrace {
    std::vector<VisitedNode> visited;
    uint32_t nodes_explored = 0;
};

// Represents performance metrics of a query
struct QueryMetrics {
    long long execution_time_us = 0;
};

// Unified result structure
struct PathResult {
    RoutePath path;
    ExplorationTrace exploration;
    QueryMetrics metrics;
};

} // namespace georoute
