#include <gtest/gtest.h>
#include "georoute/graph.h"
#include "georoute/serializer.h"
#include <cstdio>

using namespace georoute;

TEST(SerializerTest, RoundTrip) {
    AdjacencyGraph graph;
    uint32_t n0 = graph.add_node(100, 40.7128, -74.0060);
    uint32_t n1 = graph.add_node(101, 40.7129, -74.0061);
    uint32_t n2 = graph.add_node(102, 40.7130, -74.0062);
    
    graph.add_edge(n0, n1, 10.5f, 1, false);
    graph.add_edge(n1, n2, 20.0f, 2, true);
    
    CSRGraph original = graph.to_csr();
    
    std::string test_file = "test_graph.grp";
    
    // Save
    EXPECT_NO_THROW(Serializer::save_graph(original, test_file));
    
    // Load
    CSRGraph loaded;
    EXPECT_NO_THROW(loaded = Serializer::load_graph(test_file));
    
    // Compare
    EXPECT_EQ(original.nodes.size(), loaded.nodes.size());
    for (size_t i = 0; i < original.nodes.size(); ++i) {
        EXPECT_DOUBLE_EQ(original.nodes[i].lat, loaded.nodes[i].lat);
        EXPECT_DOUBLE_EQ(original.nodes[i].lon, loaded.nodes[i].lon);
        EXPECT_EQ(original.nodes[i].osm_id, loaded.nodes[i].osm_id);
    }
    
    EXPECT_EQ(original.offsets.size(), loaded.offsets.size());
    for (size_t i = 0; i < original.offsets.size(); ++i) {
        EXPECT_EQ(original.offsets[i], loaded.offsets[i]);
    }
    
    EXPECT_EQ(original.targets.size(), loaded.targets.size());
    for (size_t i = 0; i < original.targets.size(); ++i) {
        EXPECT_EQ(original.targets[i], loaded.targets[i]);
    }
    
    EXPECT_EQ(original.weights.size(), loaded.weights.size());
    for (size_t i = 0; i < original.weights.size(); ++i) {
        EXPECT_FLOAT_EQ(original.weights[i], loaded.weights[i]);
    }
    
    // Cleanup
    std::remove(test_file.c_str());
}
