# TRENT OS: Geo-Route Intelligence Platform

TRENT OS (formerly GeoRoute) is an enterprise-grade, high-performance geographic pathfinding and traffic prediction visualizer. It is built using a rigorous Object-Oriented Architecture (OOP) and Low-Level Design (LLD) principles.

## Core Architecture
- **Backend (API Layer)**: Built with FastAPI. Connects to C++ algorithms and exposes machine learning traffic predictions via `/api/v1/predict`.
- **Backend (ML Layer)**: Uses `scikit-learn` to forecast route traversal times based on historical synthetic traffic states across 16 global cities.
- **Frontend (UI Layer)**: Next.js (App Router) with Shadcn UI, Vanilla CSS, and Tailwind.
- **Frontend (Spatial Layer)**: `Deck.gl` handles high-performance rendering of routes, scatterplot exploration nodes, and geospatial overlays. `React Flow` manages the Knowledge Graph nodes, and `Recharts` streams live execution latency.

## Advanced Modules
- **Interactive Route Engine**: Click anywhere on the map to set a Start/End point and dynamically render algorithmic paths (A*, Dijkstra, Bidirectional, ALT, Contraction Hierarchies).
- **Command Center (`CMD+K`)**: Global command palette to instantly fly the map to 16 curated cities (e.g., Manhattan, Tokyo, Mumbai, Delhi, Paris).
- **Simulation Lab (`/simulation`)**: Adjust hyper-parameters like Traffic Density and Weather.
- **Predictive Models (`/predictions`)**: Time-series slider to query future traffic patterns and recalculate optimal routes.
- **Observability (`/observability`)**: Datadog-style charts for C++ latency and node-exploration metrics.
- **Knowledge Graph (`/knowledge-graph`)**: React Flow powered visualization of the raw OSM graph structure.
- **AI Reasoning (`/ai-reasoning`)**: Explainable AI interface demonstrating why heuristics chose specific paths.

## Running Locally

### Option A: Docker Compose (Recommended)
The easiest way to spin up the entire stack (Frontend + Backend + ML Models) is using Docker Compose. The build process will automatically train and serialize the 16 Random Forest models.
```bash
docker-compose up --build
```
Access the OS at `http://localhost:3000`.

### Option B: Manual Setup

**1. Start the FastAPI Backend**
```bash
cd backend
pip install -r requirements.txt
python train_model.py  # Generates the ML models
python -m uvicorn app:app --reload --port 8000
```

**2. Start the Next.js Frontend**
```bash
cd frontend
npm install
npm run dev
```
Access the OS at `http://localhost:3000`.
