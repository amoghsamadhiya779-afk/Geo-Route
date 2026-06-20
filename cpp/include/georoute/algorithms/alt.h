#pragma once

#include "georoute/algorithms/routing_algorithm.h"
#include <vector>
#include <string>

namespace georoute {

// Flat data structure for ALT auxiliary data to ensure perfect cache locality
struct ALTData {
    uint32_t num_nodes = 0;
    uint32_t num_landmarks = 0;
    std::vector<uint32_t> landmarks;
    
    // Flat arrays of size (num_landmarks * num_nodes)
    // Access using: index = l * num_nodes + v
    std::vector<float> dist_to;   // dist from v to L
    std::vector<float> dist_from; // dist from L to v
};

class ALTSerializer {
public:
    static void save(const ALTData& data, const std::string& filepath);
    static ALTData load(const std::string& filepath);
};

class ALTPreprocessor {
public:
    // Selects K landmarks using greedy farthest-first traversal and precomputes distances
    static ALTData preprocess(const CSRGraph& graph, uint32_t num_landmarks);
};

class ALTAlgorithm : public IRoutingAlgorithm {
private:
    ALTData alt_data_;
    float heuristic_weight_;

public:
    explicit ALTAlgorithm(ALTData data, float heuristic_weight = 1.0f);

    [[nodiscard]] std::string name() const override { return "ALT (A* Landmarks)"; }
    [[nodiscard]] PathResult route(const CSRGraph& graph, uint32_t source, uint32_t target) override;
};

} // namespace georoute
