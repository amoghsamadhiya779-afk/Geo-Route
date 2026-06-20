#include <gtest/gtest.h>
#include "georoute/graph.h"
#include "georoute/haversine.h"

using namespace georoute;

TEST(GraphTest, HaversineDistance) {
    // Distance between New York (40.7128, -74.0060) and London (51.5074, -0.1278)
    // is roughly 5570 km.
    double dist = haversine(40.7128, -74.0060, 51.5074, -0.1278);
    EXPECT_NEAR(dist, 5570000, 10000); // within 10 km
}

TEST(GraphTest, BuildAdjacencyGraph) {
    AdjacencyGraph graph;
    
    uint32_t n0 = graph.add_node(100, 1.0, 1.0);
    uint32_t n1 = graph.add_node(101, 2.0, 2.0);
    uint32_t n2 = graph.add_node(102, 3.0, 3.0);
    
    EXPECT_EQ(n0, 0);
    EXPECT_EQ(n1, 1);
    EXPECT_EQ(n2, 2);
    EXPECT_EQ(graph.nodes.size(), 3);
    
    // Test duplicate addition
    uint32_t n0_dup = graph.add_node(100, 1.0, 1.0);
    EXPECT_EQ(n0_dup, 0);
    EXPECT_EQ(graph.nodes.size(), 3);

    // Add edges
    graph.add_edge(n0, n1, 10.5f, 1, false); // bidirectional
    graph.add_edge(n1, n2, 5.0f, 2, true);   // oneway
    
    EXPECT_EQ(graph.adj[n0].size(), 1);
    EXPECT_EQ(graph.adj[n1].size(), 2); // 1 from n0 bidir, 1 to n2
    EXPECT_EQ(graph.adj[n2].size(), 0); // n1->n2 is oneway
    
    // Verify edge n0->n1
    EXPECT_EQ(graph.adj[n0][0].target, n1);
    EXPECT_FLOAT_EQ(graph.adj[n0][0].weight, 10.5f);
}

TEST(GraphTest, CSRConversion) {
    AdjacencyGraph graph;
    uint32_t n0 = graph.add_node(100, 0.0, 0.0);
    uint32_t n1 = graph.add_node(101, 0.0, 1.0);
    uint32_t n2 = graph.add_node(102, 1.0, 0.0);
    
    graph.add_edge(n0, n1, 1.0f, 1, true); // n0 -> n1
    graph.add_edge(n0, n2, 2.0f, 1, true); // n0 -> n2
    graph.add_edge(n1, n2, 3.0f, 1, true); // n1 -> n2
    
    CSRGraph csr = graph.to_csr();
    
    EXPECT_EQ(csr.nodes.size(), 3);
    EXPECT_EQ(csr.offsets.size(), 4); // nodes.size() + 1
    
    EXPECT_EQ(csr.offsets[0], 0);
    EXPECT_EQ(csr.offsets[1], 2); // n0 has 2 outgoing edges
    EXPECT_EQ(csr.offsets[2], 3); // n1 has 1 outgoing edge
    EXPECT_EQ(csr.offsets[3], 3); // n2 has 0 outgoing edges
    
    EXPECT_EQ(csr.targets.size(), 3);
    EXPECT_EQ(csr.targets[0], n1);
    EXPECT_EQ(csr.targets[1], n2);
    EXPECT_EQ(csr.targets[2], n2);
    
    EXPECT_FLOAT_EQ(csr.weights[0], 1.0f);
    EXPECT_FLOAT_EQ(csr.weights[1], 2.0f);
    EXPECT_FLOAT_EQ(csr.weights[2], 3.0f);
}
