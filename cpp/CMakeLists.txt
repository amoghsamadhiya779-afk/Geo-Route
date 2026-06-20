# cpp/CMakeLists.txt

include_directories(include)

find_package(osmium REQUIRED COMPONENTS pbf)
find_package(ZLIB REQUIRED)

# Core Library
add_library(georoute_core STATIC 
    src/graph.cpp
    src/serializer.cpp
    src/osm_parser.cpp
    src/algorithms/dijkstra.cpp
    src/algorithms/astar.cpp
    src/algorithms/bidirectional_astar.cpp
)
target_include_directories(georoute_core PUBLIC ${OSMIUM_INCLUDE_DIRS})
target_link_libraries(georoute_core PUBLIC ${OSMIUM_LIBRARIES} ZLIB::ZLIB)


# CLI Executable
add_executable(georoute_cli src/main.cpp)
target_link_libraries(georoute_cli georoute_core)

# GoogleTest Integration
include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/03597a01ee50ed33e9dfd640b249b4be3799d395.zip
)
# For Windows: Prevent overriding the parent project's compiler/linker settings
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

enable_testing()

add_executable(georoute_tests 
    tests/main_test.cpp 
    tests/test_graph.cpp
    tests/test_serializer.cpp
)
target_link_libraries(georoute_tests gtest_main georoute_core)

include(GoogleTest)
gtest_discover_tests(georoute_tests)


