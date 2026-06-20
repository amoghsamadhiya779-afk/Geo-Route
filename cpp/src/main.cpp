#include "georoute/osm_parser.h"
#include "georoute/serializer.h"
#include "georoute/algorithms/dijkstra.h"
#include "georoute/algorithms/astar.h"
#include "georoute/algorithms/bidirectional_astar.h"
#include "georoute/algorithms/alt.h"
#include "georoute/algorithms/contraction_hierarchies.h"
#include "georoute/types.h"

#include <iostream>
#include <string>
#include <iomanip>
#include <random>

using namespace georoute;

void print_help() {
    std::cout << "GeoRoute CLI\n";
    std::cout << "Usage:\n";
    std::cout << "  georoute_cli --parse <input.osm.pbf> --output <output.grp>\n";
    std::cout << "  georoute_cli --preprocess-alt <graph.grp> --landmarks <K> --output <output.alt>\n";
    std::cout << "  georoute_cli --preprocess-ch <graph.grp> --output <output.ch>\n";
    std::cout << "  georoute_cli --route <graph.grp> --source <id> --target <id> --algo <dijkstra|astar|bidir|alt|ch>\n";
    std::cout << "  georoute_cli --benchmark <graph.grp> --queries <N>\n";
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        print_help();
        return 1;
    }

    std::string cmd = argv[1];

    if (cmd == "--version") {
        std::cout << "GeoRoute v0.3" << std::endl;
        return 0;
    }

    try {
        if (cmd == "--parse") {
            if (argc < 5 || std::string(argv[3]) != "--output") { print_help(); return 1; }
            auto graph = OSMParser::parse(argv[2]);
            Serializer::save_graph(graph, argv[4]);
            std::cout << "Successfully saved to " << argv[4] << std::endl;
            return 0;
        }

        if (cmd == "--preprocess-alt") {
            if (argc < 7 || std::string(argv[5]) != "--output") { print_help(); return 1; }
            auto graph = Serializer::load_graph(argv[2]);
            uint32_t k = std::stoul(argv[4]);
            auto alt_data = ALTPreprocessor::preprocess(graph, k);
            ALTSerializer::save(alt_data, argv[6]);
            std::cout << "Successfully saved ALT data to " << argv[6] << std::endl;
            return 0;
        }

        if (cmd == "--preprocess-ch") {
            if (argc < 5 || std::string(argv[3]) != "--output") { print_help(); return 1; }
            auto graph = Serializer::load_graph(argv[2]);
            auto ch_data = CHPreprocessor::preprocess(graph);
            CHSerializer::save(ch_data, argv[4]);
            std::cout << "Successfully saved CH data to " << argv[4] << std::endl;
            return 0;
        }

        if (cmd == "--route") {
            if (argc < 9) { print_help(); return 1; }
            std::string graph_path = argv[2];
            uint32_t source = std::stoul(argv[4]);
            uint32_t target = std::stoul(argv[6]);
            std::string algo_name = argv[8];

            auto graph = Serializer::load_graph(graph_path);

            auto& registry = AlgorithmRegistry::instance();
            registry.register_algo("dijkstra", std::make_unique<DijkstraAlgorithm>());
            registry.register_algo("astar", std::make_unique<AStarAlgorithm>());
            registry.register_algo("bidir", std::make_unique<BidirAStarAlgorithm>(graph));

            if (algo_name == "alt") {
                try {
                    auto alt_data = ALTSerializer::load(graph_path + ".alt");
                    registry.register_algo("alt", std::make_unique<ALTAlgorithm>(std::move(alt_data)));
                } catch (const std::exception& e) {
                    std::cerr << "Could not load .alt file. Run --preprocess-alt first! " << e.what() << std::endl;
                    return 1;
                }
            }
            if (algo_name == "ch") {
                try {
                    auto ch_data = CHSerializer::load(graph_path + ".ch");
                    registry.register_algo("ch", std::make_unique<CHAlgorithm>(std::move(ch_data)));
                } catch (const std::exception& e) {
                    std::cerr << "Could not load .ch file. Run --preprocess-ch first! " << e.what() << std::endl;
                    return 1;
                }
            }

            IRoutingAlgorithm* algo = registry.get(algo_name);
            if (!algo) {
                std::cerr << "Unknown algo or missing preprocessed data: " << algo_name << std::endl;
                return 1;
            }

            PathResult res = algo->route(graph, source, target);

            std::cout << "Algorithm: " << algo->name() << "\n";
            std::cout << "Distance: " << res.path.total_distance << " m\n";
            std::cout << "Nodes Explored: " << res.exploration.nodes_explored << "\n";
            std::cout << "Time: " << res.metrics.execution_time_us << " us\n";
            return 0;
        }

        if (cmd == "--benchmark") {
            if (argc < 5) { print_help(); return 1; }
            std::string graph_path = argv[2];
            uint32_t queries = std::stoul(argv[4]);
            if (queries == 0) queries = 1;

            auto graph = Serializer::load_graph(graph_path);
            if (graph.node_count() == 0) return 1;
            
            std::mt19937 rng(42);
            std::uniform_int_distribution<uint32_t> dist(0, graph.node_count() - 1);

            auto& registry = AlgorithmRegistry::instance();
            registry.register_algo("dijkstra", std::make_unique<DijkstraAlgorithm>());
            registry.register_algo("astar", std::make_unique<AStarAlgorithm>());
            registry.register_algo("bidir", std::make_unique<BidirAStarAlgorithm>(graph));

            try {
                auto alt_data = ALTSerializer::load(graph_path + ".alt");
                registry.register_algo("alt", std::make_unique<ALTAlgorithm>(std::move(alt_data)));
            } catch (...) { std::cerr << "Warning: Skipping ALT (no .alt file found)\n"; }
            
            try {
                auto ch_data = CHSerializer::load(graph_path + ".ch");
                registry.register_algo("ch", std::make_unique<CHAlgorithm>(std::move(ch_data)));
            } catch (...) { std::cerr << "Warning: Skipping CH (no .ch file found)\n"; }

            auto algo_names = registry.list();
            std::unordered_map<std::string, long long> total_time_us;
            std::unordered_map<std::string, long long> total_explored;

            std::cout << "Running " << queries << " queries...\n";

            for (uint32_t i = 0; i < queries; ++i) {
                uint32_t s = dist(rng);
                uint32_t t = dist(rng);

                for (const auto& name : algo_names) {
                    auto res = registry.get(name)->route(graph, s, t);
                    total_time_us[name] += res.metrics.execution_time_us;
                    total_explored[name] += res.exploration.nodes_explored;
                }
            }

            std::cout << "--------------------------------------------------------\n";
            std::cout << std::left << std::setw(25) << "Algorithm" 
                      << std::setw(15) << "Avg Time (us)" 
                      << std::setw(15) << "Avg Explored" << "\n";
            std::cout << "--------------------------------------------------------\n";
            for (const auto& name : algo_names) {
                std::string full_name = registry.get(name)->name();
                std::cout << std::left << std::setw(25) << full_name
                          << std::setw(15) << (total_time_us[name] / queries)
                          << std::setw(15) << (total_explored[name] / queries) << "\n";
            }
            std::cout << "--------------------------------------------------------\n";
            return 0;
        }

        print_help();
        return 1;

    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
}
