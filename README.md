# GeoRoute — Interactive Geographic Pathfinding Visualizer

GeoRoute is a high-performance, interactive pathfinding visualizer built with C++, Python (FastAPI), and React (MapLibre GL JS).

## Project Structure
- `cpp/`: Core routing algorithms (Dijkstra, A*, Bidirectional A*, ALT, Contraction Hierarchies).
- `backend/`: FastAPI wrapper for C++ routing core using `pybind11`.
- `frontend/`: React app with MapLibre GL JS and deck.gl for interactive rendering.
- `data/`: OSM maps and processed graphs.
- `scripts/`: Data fetching and preprocessing scripts.

## Build Requirements
- CMake 3.14+
- C++17 Compiler
- Python 3.11+
- Node.js & npm

## Build Instructions
```bash
mkdir build
cd build
cmake ..
cmake --build .
```
