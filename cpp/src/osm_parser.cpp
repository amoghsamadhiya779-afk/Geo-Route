#include "georoute/osm_parser.h"
#include "georoute/haversine.h"
#include "georoute/types.h"

#include <osmium/io/pbf_input.hpp>
#include <osmium/handler.hpp>
#include <osmium/visitor.hpp>
#include <osmium/osm/way.hpp>
#include <osmium/osm/node.hpp>
#include <osmium/index/map/sparse_mem_array.hpp>
#include <osmium/handler/node_locations_for_ways.hpp>

#include <unordered_map>
#include <unordered_set>
#include <iostream>

namespace georoute {

static bool is_routable_highway(const char* hw) {
    if (!hw) return false;
    std::string type(hw);
    return type != "footway" && type != "pedestrian" && type != "path" && type != "steps";
}

// Pass 1: Count how many ways each node belongs to, to identify intersections
class NodeCounterHandler : public osmium::handler::Handler {
private:
    std::unordered_map<osmium::object_id_type, int> node_way_count_;
    std::unordered_set<osmium::object_id_type> intersection_nodes_;

public:
    void way(const osmium::Way& way) {
        if (!way.tags().has_key("highway")) return;
        if (!is_routable_highway(way.tags().get_value_by_key("highway"))) return;

        const auto& nodes = way.nodes();
        if (nodes.size() < 2) return;

        intersection_nodes_.insert(nodes.front().ref());
        intersection_nodes_.insert(nodes.back().ref());

        for (const auto& node_ref : nodes) {
            node_way_count_[node_ref.ref()]++;
            if (node_way_count_[node_ref.ref()] > 1) {
                intersection_nodes_.insert(node_ref.ref());
            }
        }
    }

    const std::unordered_set<osmium::object_id_type>& get_intersections() const {
        return intersection_nodes_;
    }
};

// Pass 2: Extract the graph using the identified intersection nodes
class GraphBuilderHandler : public osmium::handler::Handler {
    GraphBuilder& builder;
    const std::unordered_set<osmium::object_id_type>& intersection_nodes;

public:
    GraphBuilderHandler(GraphBuilder& g, const std::unordered_set<osmium::object_id_type>& intersections)
        : builder(g), intersection_nodes(intersections) {}

    void way(const osmium::Way& way) {
        if (!way.tags().has_key("highway")) return;
        const char* hw = way.tags().get_value_by_key("highway");
        if (!is_routable_highway(hw)) return;

        std::string type(hw);
        bool oneway = false;
        const char* ow = way.tags().get_value_by_key("oneway");
        if (ow) {
            std::string ow_str(ow);
            if (ow_str == "yes" || ow_str == "1" || ow_str == "true") {
                oneway = true;
            }
        }

        uint16_t road_type = 1; // Default
        if (type == "motorway") road_type = 10;
        else if (type == "trunk") road_type = 9;
        else if (type == "primary") road_type = 8;
        else if (type == "secondary") road_type = 7;
        else if (type == "tertiary") road_type = 6;

        const auto& nodes = way.nodes();
        if (nodes.size() < 2) return;

        osmium::object_id_type last_intersection_id = std::numeric_limits<osmium::object_id_type>::max();
        double segment_distance = 0.0;
        osmium::Location last_loc;

        for (const auto& node_ref : nodes) {
            auto id = node_ref.ref();
            auto loc = node_ref.location();

            if (!loc.valid()) continue;

            if (last_intersection_id != std::numeric_limits<osmium::object_id_type>::max()) {
                segment_distance += haversine(last_loc.lat(), last_loc.lon(), loc.lat(), loc.lon());
            }

            if (intersection_nodes.count(id)) {
                uint32_t current_idx = builder.add_node(id, loc.lat(), loc.lon());

                if (last_intersection_id != std::numeric_limits<osmium::object_id_type>::max() && last_intersection_id != id) {
                    uint32_t last_idx = builder.get_node_idx(last_intersection_id);
                    builder.add_edge(last_idx, current_idx, static_cast<float>(segment_distance), road_type, oneway);
                }

                last_intersection_id = id;
                segment_distance = 0.0;
            }
            last_loc = loc;
        }
    }
};

CSRGraph OSMParser::parse(const std::string& pbf_path) {
    try {
        std::cout << "Starting Pass 1 (Identifying Intersections)..." << std::endl;
        osmium::io::Reader reader1{pbf_path, osmium::osm_entity_bits::way};
        NodeCounterHandler counter_handler;
        osmium::apply(reader1, counter_handler);
        reader1.close();

        std::cout << "Found " << counter_handler.get_intersections().size() << " intersections." << std::endl;

        std::cout << "Starting Pass 2 (Building Graph)..." << std::endl;
        using Index = osmium::index::map::SparseMemArray<osmium::unsigned_object_id_type, osmium::Location>;
        using LocationHandler = osmium::handler::NodeLocationsForWays<Index>;

        Index index;
        LocationHandler location_handler{index};
        
        GraphBuilder builder;
        GraphBuilderHandler builder_handler{builder, counter_handler.get_intersections()};

        osmium::io::Reader reader2{pbf_path, osmium::osm_entity_bits::node | osmium::osm_entity_bits::way};
        osmium::apply(reader2, location_handler, builder_handler);
        reader2.close();

        CSRGraph final_graph = builder.build();
        std::cout << "Parsed " << final_graph.node_count() << " nodes." << std::endl;
        return final_graph;
    } catch (const std::exception& e) {
        throw ParseError(std::string("OSM Parsing failed: ") + e.what());
    }
}

} // namespace georoute
