#pragma once

#include "georoute/graph.h"
#include <string>

namespace georoute {

class OSMParser {
public:
    // Parses an OSM PBF file and returns a CSRGraph
    static CSRGraph parse(const std::string& pbf_path);
};

} // namespace georoute
