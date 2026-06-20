#pragma once

#include "georoute/graph.h"
#include "georoute/types.h"
#include <string>
#include <memory>
#include <vector>
#include <unordered_map>

namespace georoute {

// Common interface for all routing algorithms
class IRoutingAlgorithm {
public:
    virtual ~IRoutingAlgorithm() = default;

    // Returns the human-readable name of the algorithm
    [[nodiscard]] virtual std::string name() const = 0;

    // Executes the routing algorithm
    [[nodiscard]] virtual PathResult route(const CSRGraph& graph, uint32_t source, uint32_t target) = 0;
};

// Singleton registry for algorithms
class AlgorithmRegistry {
private:
    std::unordered_map<std::string, std::unique_ptr<IRoutingAlgorithm>> algos_;

    AlgorithmRegistry() = default;

public:
    static AlgorithmRegistry& instance() {
        static AlgorithmRegistry inst;
        return inst;
    }

    void register_algo(const std::string& key, std::unique_ptr<IRoutingAlgorithm> algo) {
        algos_[key] = std::move(algo);
    }

    [[nodiscard]] IRoutingAlgorithm* get(const std::string& key) const {
        auto it = algos_.find(key);
        if (it != algos_.end()) {
            return it->second.get();
        }
        return nullptr;
    }

    [[nodiscard]] std::vector<std::string> list() const {
        std::vector<std::string> keys;
        for (const auto& pair : algos_) {
            keys.push_back(pair.first);
        }
        return keys;
    }
};

// Helper: Reconstructs path from a parent array
[[nodiscard]] inline RoutePath reconstruct_path(const std::vector<uint32_t>& parent, uint32_t target, float distance) {
    RoutePath path;
    path.total_distance = distance;
    
    if (distance >= 0.0f) {
        uint32_t curr = target;
        while (curr != static_cast<uint32_t>(-1)) {
            path.node_ids.push_back(curr);
            curr = parent[curr];
        }
        std::reverse(path.node_ids.begin(), path.node_ids.end());
    }
    return path;
}

// Helper: Validates inputs
inline void validate_query(const CSRGraph& graph, uint32_t source, uint32_t target) {
    if (source >= graph.node_count() || target >= graph.node_count()) {
        throw AlgorithmError("Source or target node index is out of bounds");
    }
}

} // namespace georoute
