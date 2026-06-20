#include <gtest/gtest.h>
#include "georoute/graph.h"
#include "georoute/algorithms/routing_algorithm.h"
#include "georoute/algorithms/dijkstra.h"
#include "georoute/algorithms/astar.h"
#include "georoute/algorithms/bidirectional_astar.h"

using namespace georoute;

class AlgorithmTest : public ::testing::Test {
protected:
    CSRGraph graph_;

    void SetUp() override {
        GraphBuilder builder;
        // Simple linear graph: 0 -10-> 1 -20-> 2 -30-> 3
        builder.add_node(0, 0.0, 0.0);
        builder.add_node(1, 0.0, 1.0);
        builder.add_node(2, 0.0, 2.0);
        builder.add_node(3, 0.0, 3.0);
        
        builder.add_edge(0, 1, 10.0f, 1, true);
        builder.add_edge(1, 2, 20.0f, 1, true);
        builder.add_edge(2, 3, 30.0f, 1, true);
        
        // Detour: 0 -15-> 2 (shorter than 0->1->2 which is 30)
        builder.add_edge(0, 2, 15.0f, 1, true);
        
        graph_ = builder.build();
    }
};

TEST_F(AlgorithmTest, DijkstraFindsShortestPath) {
    DijkstraAlgorithm dijkstra;
    PathResult res = dijkstra.route(graph_, 0, 3);
    
    EXPECT_FLOAT_EQ(res.path.total_distance, 45.0f); // 0->2(15) + 2->3(30)
    ASSERT_EQ(res.path.node_ids.size(), 3);
    EXPECT_EQ(res.path.node_ids[0], 0);
    EXPECT_EQ(res.path.node_ids[1], 2);
    EXPECT_EQ(res.path.node_ids[2], 3);
}

TEST_F(AlgorithmTest, AStarFindsShortestPath) {
    AStarAlgorithm astar;
    PathResult res = astar.route(graph_, 0, 3);
    
    EXPECT_FLOAT_EQ(res.path.total_distance, 45.0f);
    ASSERT_EQ(res.path.node_ids.size(), 3);
    EXPECT_EQ(res.path.node_ids[0], 0);
    EXPECT_EQ(res.path.node_ids[1], 2);
    EXPECT_EQ(res.path.node_ids[2], 3);
}

TEST_F(AlgorithmTest, BidirAStarFindsShortestPath) {
    BidirAStarAlgorithm bidir(graph_);
    PathResult res = bidir.route(graph_, 0, 3);
    
    EXPECT_FLOAT_EQ(res.path.total_distance, 45.0f);
    ASSERT_EQ(res.path.node_ids.size(), 3);
    EXPECT_EQ(res.path.node_ids[0], 0);
    EXPECT_EQ(res.path.node_ids[1], 2);
    EXPECT_EQ(res.path.node_ids[2], 3);
}

TEST_F(AlgorithmTest, SourceEqualsTarget) {
    DijkstraAlgorithm dijkstra;
    PathResult res = dijkstra.route(graph_, 1, 1);
    
    EXPECT_FLOAT_EQ(res.path.total_distance, 0.0f);
    ASSERT_EQ(res.path.node_ids.size(), 1);
    EXPECT_EQ(res.path.node_ids[0], 1);
}

TEST_F(AlgorithmTest, InvalidNodes) {
    DijkstraAlgorithm dijkstra;
    EXPECT_THROW(dijkstra.route(graph_, 0, 999), AlgorithmError);
    EXPECT_THROW(dijkstra.route(graph_, 999, 0), AlgorithmError);
}
