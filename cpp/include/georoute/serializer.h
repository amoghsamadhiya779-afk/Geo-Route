#pragma once

#include "georoute/graph.h"
#include <string>

namespace georoute {

class Serializer {
public:
    // Magic header to verify file format: "GRTE"
    static constexpr char MAGIC[4] = {'G', 'R', 'T', 'E'};
    static constexpr uint32_t VERSION = 1;

    // Writes a CSRGraph to a binary file
    static void save_graph(const CSRGraph& graph, const std::string& filepath);

    // Reads a CSRGraph from a binary file
    static CSRGraph load_graph(const std::string& filepath);
};

} // namespace georoute
