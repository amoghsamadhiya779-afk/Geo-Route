#pragma once

#include <cmath>

namespace georoute {

// Earth radius in meters
constexpr double EARTH_RADIUS = 6371000.0;
constexpr double PI = 3.14159265358979323846;

[[nodiscard]] inline double to_radians(double degrees) noexcept {
    return degrees * PI / 180.0;
}

/**
 * @brief Calculates the Haversine distance between two coordinates
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @return Distance in meters
 */
[[nodiscard]] inline double haversine(double lat1, double lon1, double lat2, double lon2) noexcept {
    double lat1_rad = to_radians(lat1);
    double lat2_rad = to_radians(lat2);
    double dLat = to_radians(lat2 - lat1);
    double dLon = to_radians(lon2 - lon1);

    double sin_lat = std::sin(dLat / 2);
    double sin_lon = std::sin(dLon / 2);

    double a = sin_lat * sin_lat +
               sin_lon * sin_lon * std::cos(lat1_rad) * std::cos(lat2_rad);
    
    a = std::min(1.0, std::max(0.0, a));
    double c = 2 * std::asin(std::sqrt(a));
    
    return EARTH_RADIUS * c;
}

} // namespace georoute
