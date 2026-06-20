#include <gtest/gtest.h>
#include "georoute/graph.h"
#include "georoute/haversine.h"

TEST(GraphTest, HaversineDistance) {
    // Distance between New York (40.7128, -74.0060) and London (51.5074, -0.1278)
    // is roughly 5570 km.
    double dist = georoute::haversine(40.7128, -74.0060, 51.5074, -0.1278);
    EXPECT_NEAR(dist, 5570000, 10000); // within 10 km
}

TEST(GraphTest, BuildGraphWithBuilder) {
    georoute::GraphBuilder builder;
    
    uint32_t n0 = builder.add_node(100, 1.0, 1.0);
    uint32_t n1 = builder.add_node(101, 2.0, 2.0);
    uint32_t n2 = builder.add_node(102, 3.0, 3.0);
    
    EXPECT_EQ(n0, 0);
    EXPECT_EQ(n1, 1);
    EXPECT_EQ(n2, 2);
    
    // Test duplicate addition
    uint32_t n0_dup = builder.add_node(100, 1.0, 1.0);
    EXPECT_EQ(n0_dup, 0);

    // Add edges
    builder.add_edge(n0, n1, 10.5f, 1, false); // bidirectional
    builder.add_edge(n1, n2, 5.0f, 2, true);   // oneway
    
    georoute::CSRGraph csr = builder.build();
    
    EXPECT_EQ(csr.node_count(), 3);
    EXPECT_EQ(csr.edge_count(), 3); // n0->n1, n1->n0, n1->n2
    
    auto [start0, end0] = csr.edge_range(n0);
    EXPECT_EQ(end0 - start0, 1);
    EXPECT_EQ(csr.target(start0), n1);
    EXPECT_FLOAT_EQ(csr.weight(start0), 10.5f);
}

TEST(GraphTest, CSRConversion) {
    georoute::GraphBuilder builder;
    uint32_t n0 = builder.add_node(100, 0.0, 0.0);
    uint32_t n1 = builder.add_node(101, 0.0, 1.0);
    uint32_t n2 = builder.add_node(102, 1.0, 0.0);
    
    builder.add_edge(n0, n1, 1.0f, 1, true); // n0 -> n1
    builder.add_edge(n0, n2, 2.0f, 1, true); // n0 -> n2
    builder.add_edge(n1, n2, 3.0f, 1, true); // n1 -> n2
    
    georoute::CSRGraph csr = builder.build();
    
    EXPECT_EQ(csr.node_count(), 3);
    
    auto [start0, end0] = csr.edge_range(0);
    EXPECT_EQ(end0 - start0, 2); // n0 has 2 outgoing edges
    
    auto [start1, end1] = csr.edge_range(1);
    EXPECT_EQ(end1 - start1, 1); // n1 has 1 outgoing edge
    
    auto [start2, end2] = csr.edge_range(2);
    EXPECT_EQ(end2 - start2, 0); // n2 has 0 outgoing edges
}

TEST(GraphTest, NearestNode) {
    georoute::GraphBuilder builder;
    builder.add_node(100, 0.0, 0.0);
    builder.add_node(101, 10.0, 10.0);
    
    georoute::CSRGraph csr = builder.build();
    
    EXPECT_EQ(csr.nearest_node(0.1, 0.1), 0);
    EXPECT_EQ(csr.nearest_node(9.9, 9.9), 1);
}
