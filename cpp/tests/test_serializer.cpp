#include <gtest/gtest.h>
#include "georoute/graph.h"
#include "georoute/serializer.h"
#include <cstdio>

TEST(SerializerTest, SaveAndLoad) {
    georoute::GraphBuilder builder;
    uint32_t n0 = builder.add_node(100, 40.0, -74.0);
    uint32_t n1 = builder.add_node(101, 40.1, -74.1);
    builder.add_edge(n0, n1, 15.5f, 1, false); // bidir
    
    georoute::CSRGraph original = builder.build();
    
    const std::string filename = "test_graph.grp";
    
    // Save
    georoute::Serializer::save_graph(original, filename);
    
    // Load
    georoute::CSRGraph loaded = georoute::Serializer::load_graph(filename);
    
    EXPECT_EQ(original.node_count(), loaded.node_count());
    EXPECT_EQ(original.edge_count(), loaded.edge_count());
    
    EXPECT_EQ(loaded.node_count(), 2);
    EXPECT_EQ(loaded.edge_count(), 2);
    
    EXPECT_FLOAT_EQ(loaded.node(0).lat, 40.0);
    EXPECT_FLOAT_EQ(loaded.node(0).lon, -74.0);
    
    auto [s0, e0] = loaded.edge_range(0);
    EXPECT_EQ(e0 - s0, 1);
    EXPECT_EQ(loaded.target(s0), 1);
    EXPECT_FLOAT_EQ(loaded.weight(s0), 15.5f);
    
    std::remove(filename.c_str());
}
