#include "georoute/serializer.h"
#include "georoute/types.h"
#include <fstream>
#include <stdexcept>
#include <cstring>

namespace georoute {

void Serializer::save_graph(const CSRGraph& graph, const std::string& filepath) {
    static_assert(sizeof(Node) == 24, "Node struct has padding; binary serialization is unsafe on this platform.");

    std::ofstream out(filepath, std::ios::binary);
    if (!out) {
        throw FileError("Failed to open file for writing: " + filepath);
    }

    // Write header
    out.write(MAGIC, sizeof(MAGIC));
    out.write(reinterpret_cast<const char*>(&VERSION), sizeof(VERSION));

    // Write sizes
    uint32_t num_nodes = graph.node_count();
    uint32_t num_edges = graph.edge_count();
    out.write(reinterpret_cast<const char*>(&num_nodes), sizeof(num_nodes));
    out.write(reinterpret_cast<const char*>(&num_edges), sizeof(num_edges));

    // Write array data
    out.write(reinterpret_cast<const char*>(graph.offsets_.data()), (num_nodes + 1) * sizeof(uint32_t));
    
    if (num_edges > 0) {
        out.write(reinterpret_cast<const char*>(graph.targets_.data()), num_edges * sizeof(uint32_t));
        out.write(reinterpret_cast<const char*>(graph.weights_.data()), num_edges * sizeof(float));
    }
    
    if (num_nodes > 0) {
        out.write(reinterpret_cast<const char*>(graph.nodes_.data()), num_nodes * sizeof(Node));
    }

    if (!out.good()) {
        throw FileError("Error writing data to file: " + filepath);
    }
}

CSRGraph Serializer::load_graph(const std::string& filepath) {
    static_assert(sizeof(Node) == 24, "Node struct has padding; binary deserialization is unsafe on this platform.");

    std::ifstream in(filepath, std::ios::binary | std::ios::ate);
    if (!in) {
        throw FileError("Failed to open file for reading: " + filepath);
    }

    std::streamsize file_size = in.tellg();
    in.seekg(0, std::ios::beg);

    if (file_size < 12) { // 4(magic) + 4(version) + 4(nodes) + 4(edges) actually 16 bytes minimum
        throw FileError("File is too small to be a valid graph: " + filepath);
    }

    // Verify magic header
    char magic[4];
    in.read(magic, sizeof(magic));
    if (in.gcount() != 4 || std::memcmp(magic, MAGIC, 4) != 0) {
        throw FileError("Invalid file format (magic mismatch): " + filepath);
    }

    // Verify version
    uint32_t version;
    in.read(reinterpret_cast<char*>(&version), sizeof(version));
    if (version != VERSION) {
        throw FileError("Unsupported file version: " + std::to_string(version));
    }

    // Read sizes
    uint32_t num_nodes, num_edges;
    in.read(reinterpret_cast<char*>(&num_nodes), sizeof(num_nodes));
    in.read(reinterpret_cast<char*>(&num_edges), sizeof(num_edges));

    // Calculate expected size to prevent OOM on corrupt files
    size_t expected_size = 16 + (num_nodes + 1) * sizeof(uint32_t) + 
                           num_edges * sizeof(uint32_t) + 
                           num_edges * sizeof(float) + 
                           num_nodes * sizeof(Node);
                           
    if (static_cast<size_t>(file_size) != expected_size) {
        throw FileError("File size mismatch. Expected " + std::to_string(expected_size) + 
                        " bytes but got " + std::to_string(file_size));
    }

    CSRGraph graph;
    graph.offsets_.resize(num_nodes + 1);
    graph.targets_.resize(num_edges);
    graph.weights_.resize(num_edges);
    graph.nodes_.resize(num_nodes);

    // Read arrays
    in.read(reinterpret_cast<char*>(graph.offsets_.data()), (num_nodes + 1) * sizeof(uint32_t));
    
    if (num_edges > 0) {
        in.read(reinterpret_cast<char*>(graph.targets_.data()), num_edges * sizeof(uint32_t));
        in.read(reinterpret_cast<char*>(graph.weights_.data()), num_edges * sizeof(float));
    }
    
    if (num_nodes > 0) {
        in.read(reinterpret_cast<char*>(graph.nodes_.data()), num_nodes * sizeof(Node));
    }

    if (in.fail()) {
        throw FileError("Error reading data from file: " + filepath);
    }

    return graph;
}

} // namespace georoute
