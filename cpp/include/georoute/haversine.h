#pragma once

#include <cmath>

namespace georoute {

// Earth radius in meters
constexpr double EARTH_RADIUS = 6371000.0;

inline double to_radians(double degrees) {
    return degrees * M_PI / 180.0;
}

// Haversine distance in meters between two lat/lon points
inline double haversine(double lat1, double lon1, double lat2, double lon2) {
    double dLat = to_radians(lat2 - lat1);
    double dLon = to_radians(lon2 - lon1);

    lat1 = to_radians(lat1);
    lat2 = to_radians(lat2);

    double a = std::pow(std::sin(dLat / 2), 2) +
               std::pow(std::sin(dLon / 2), 2) * std::cos(lat1) * std::cos(lat2);
    double c = 2 * std::asin(std::sqrt(a));
    
    return EARTH_RADIUS * c;
}

} // namespace georoute
