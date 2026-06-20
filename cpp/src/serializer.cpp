#include "georoute/serializer.h"
#include <fstream>
#include <stdexcept>

namespace georoute {

void Serializer::save_graph(const CSRGraph& graph, const std::string& filepath) {
    std::ofstream out(filepath, std::ios::binary);
    if (!out) {
        throw std::runtime_error("Failed to open file for writing: " + filepath);
    }

    // Write header
    out.write(MAGIC, sizeof(MAGIC));
    out.write(reinterpret_cast<const char*>(&VERSION), sizeof(VERSION));

    // Write sizes
    uint32_t num_nodes = static_cast<uint32_t>(graph.nodes.size());
    uint32_t num_edges = static_cast<uint32_t>(graph.targets.size());
    out.write(reinterpret_cast<const char*>(&num_nodes), sizeof(num_nodes));
    out.write(reinterpret_cast<const char*>(&num_edges), sizeof(num_edges));

    // Write array data
    // offsets size is num_nodes + 1
    out.write(reinterpret_cast<const char*>(graph.offsets.data()), (num_nodes + 1) * sizeof(uint32_t));
    
    if (num_edges > 0) {
        out.write(reinterpret_cast<const char*>(graph.targets.data()), num_edges * sizeof(uint32_t));
        out.write(reinterpret_cast<const char*>(graph.weights.data()), num_edges * sizeof(float));
    }
    
    if (num_nodes > 0) {
        out.write(reinterpret_cast<const char*>(graph.nodes.data()), num_nodes * sizeof(Node));
    }

    if (!out.good()) {
        throw std::runtime_error("Error writing data to file: " + filepath);
    }
}

CSRGraph Serializer::load_graph(const std::string& filepath) {
    std::ifstream in(filepath, std::ios::binary);
    if (!in) {
        throw std::runtime_error("Failed to open file for reading: " + filepath);
    }

    // Verify magic header
    char magic[4];
    in.read(magic, sizeof(magic));
    if (in.gcount() != 4 || magic[0] != MAGIC[0] || magic[1] != MAGIC[1] || 
        magic[2] != MAGIC[2] || magic[3] != MAGIC[3]) {
        throw std::runtime_error("Invalid file format (magic mismatch): " + filepath);
    }

    // Verify version
    uint32_t version;
    in.read(reinterpret_cast<char*>(&version), sizeof(version));
    if (version != VERSION) {
        throw std::runtime_error("Unsupported file version: " + std::to_string(version));
    }

    // Read sizes
    uint32_t num_nodes, num_edges;
    in.read(reinterpret_cast<char*>(&num_nodes), sizeof(num_nodes));
    in.read(reinterpret_cast<char*>(&num_edges), sizeof(num_edges));

    CSRGraph graph;
    graph.offsets.resize(num_nodes + 1);
    graph.targets.resize(num_edges);
    graph.weights.resize(num_edges);
    graph.nodes.resize(num_nodes);

    // Read arrays
    in.read(reinterpret_cast<char*>(graph.offsets.data()), (num_nodes + 1) * sizeof(uint32_t));
    
    if (num_edges > 0) {
        in.read(reinterpret_cast<char*>(graph.targets.data()), num_edges * sizeof(uint32_t));
        in.read(reinterpret_cast<char*>(graph.weights.data()), num_edges * sizeof(float));
    }
    
    if (num_nodes > 0) {
        in.read(reinterpret_cast<char*>(graph.nodes.data()), num_nodes * sizeof(Node));
    }

    if (!in.good()) {
        throw std::runtime_error("Error reading data from file: " + filepath);
    }

    return graph;
}

} // namespace georoute
