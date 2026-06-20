#include "georoute/osm_parser.h"
#include "georoute/serializer.h"
#include "georoute/algorithms/dijkstra.h"
#include "georoute/algorithms/astar.h"
#include "georoute/algorithms/bidirectional_astar.h"

#include <iostream>
#include <string>
#include <iomanip>
#include <random>

using namespace georoute;

void print_help() {
    std::cout << "GeoRoute CLI\n";
    std::cout << "Usage:\n";
    std::cout << "  georoute_cli --parse <input.osm.pbf> --output <output.grp>\n";
    std::cout << "  georoute_cli --route <graph.grp> --source <id> --target <id> --algo <dijkstra|astar|bidir>\n";
    std::cout << "  georoute_cli --benchmark <graph.grp> --queries <N>\n";
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        print_help();
        return 1;
    }

    std::string cmd = argv[1];

    if (cmd == "--version") {
        std::cout << "GeoRoute v0.1" << std::endl;
        return 0;
    }

    if (cmd == "--parse" && argc >= 5) {
        std::string input = argv[2];
        std::string output_flag = argv[3];
        std::string output = argv[4];

        if (output_flag != "--output") {
            print_help();
            return 1;
        }

        auto graph = OSMParser::parse(input);
        Serializer::save_graph(graph, output);
        std::cout << "Successfully saved to " << output << std::endl;
        return 0;
    }

    if (cmd == "--route" && argc >= 8) {
        std::string graph_path = argv[2];
        uint32_t source = std::stoi(argv[4]);
        uint32_t target = std::stoi(argv[6]);
        std::string algo = argv[8];

        auto graph = Serializer::load_graph(graph_path);
        PathResult res;

        if (algo == "dijkstra") {
            res = Dijkstra::route(graph, source, target);
        } else if (algo == "astar") {
            res = AStar::route(graph, source, target);
        } else if (algo == "bidir") {
            res = BidirectionalAStar::route(graph, source, target);
        } else {
            std::cout << "Unknown algo: " << algo << std::endl;
            return 1;
        }

        std::cout << "Distance: " << res.distance << " m\n";
        std::cout << "Nodes Explored: " << res.nodes_explored << "\n";
        std::cout << "Time: " << res.execution_time_us << " us\n";
        return 0;
    }

    if (cmd == "--benchmark" && argc >= 4) {
        std::string graph_path = argv[2];
        int queries = std::stoi(argv[4]); // assuming `--queries N`

        auto graph = Serializer::load_graph(graph_path);
        
        std::mt19937 rng(42);
        std::uniform_int_distribution<uint32_t> dist(0, graph.nodes.size() - 1);

        long long total_dij_us = 0, total_ast_us = 0, total_bid_us = 0;
        long long total_dij_exp = 0, total_ast_exp = 0, total_bid_exp = 0;

        std::cout << "Running " << queries << " benchmark queries...\n";

        for (int i = 0; i < queries; ++i) {
            uint32_t s = dist(rng);
            uint32_t t = dist(rng);

            auto res_dij = Dijkstra::route(graph, s, t);
            auto res_ast = AStar::route(graph, s, t);
            auto res_bid = BidirectionalAStar::route(graph, s, t);

            total_dij_us += res_dij.execution_time_us;
            total_ast_us += res_ast.execution_time_us;
            total_bid_us += res_bid.execution_time_us;

            total_dij_exp += res_dij.nodes_explored;
            total_ast_exp += res_ast.nodes_explored;
            total_bid_exp += res_bid.nodes_explored;
        }

        std::cout << "--------------------------------------------------------\n";
        std::cout << std::left << std::setw(18) << "Algorithm" 
                  << std::setw(15) << "Avg Time (us)" 
                  << std::setw(15) << "Avg Explored" << "\n";
        std::cout << "--------------------------------------------------------\n";
        std::cout << std::left << std::setw(18) << "Dijkstra" 
                  << std::setw(15) << (total_dij_us / queries)
                  << std::setw(15) << (total_dij_exp / queries) << "\n";
        std::cout << std::left << std::setw(18) << "A*" 
                  << std::setw(15) << (total_ast_us / queries)
                  << std::setw(15) << (total_ast_exp / queries) << "\n";
        std::cout << std::left << std::setw(18) << "Bidirectional A*" 
                  << std::setw(15) << (total_bid_us / queries)
                  << std::setw(15) << (total_bid_exp / queries) << "\n";
        std::cout << "--------------------------------------------------------\n";

        return 0;
    }

    print_help();
    return 1;
}
