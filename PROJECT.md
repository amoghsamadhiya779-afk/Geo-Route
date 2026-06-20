# Project: GeoRoute

## Architecture
- **Backend**: FastAPI web server, Python ML (scikit-learn) for traffic prediction, pybind11 for core C++ routing algorithms connection.
- **Frontend**: Next.js, Deck.gl for geographical overlays, React Flow for node-edge schemas, Recharts for monitoring charts, Tailwind CSS.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | ML Predictive Backend | Python traffic prediction pipeline, model training script, and `/api/v1/predict` endpoint in FastAPI. OOP architecture design. | None | DONE (a0d30c31-1ac3-4ff9-804b-7fd317d13848) |
| 2 | Simulation Lab UI | `/simulation` page: map overlays (paths, heatmaps), simulation controls, charts. | M1 | IN_PROGRESS (996cce87-9dc0-473c-87e2-324245f5e443) |
| 3 | Predictive Models UI | `/predictions` page: map overlays, future time prediction queries. | M1 | IN_PROGRESS (996cce87-9dc0-473c-87e2-324245f5e443) |
| 4 | Graph & Observability UI | `/knowledge-graph` with reactflow and `/observability` with Recharts. | None | IN_PROGRESS (ae63d5eb-9e25-47f9-9844-e36fda4b7bde) |
| 5 | AI Reasoning & Engineering UI | `/ai-reasoning` (XAI panel) and `/engineering` (C++ cache configs/benchmarks). | M1 | IN_PROGRESS (c436bff4-a978-40e8-909e-cd653ddf3fe2) |

## Interface Contracts
### Backend ↔ Frontend
- `POST /api/v1/predict`
  - Input: `{ city_id: string, start_lat: float, start_lon: float, end_lat: float, end_lon: float, timestamp: float }`
  - Output: `{ path: { coordinates: [[lon, lat]], distance_m: float }, travel_time_sec: float, confidence: float }`
- `GET /api/v1/predict/traffic-density`
  - Input: `{ city_id: string, timestamp: float }`
  - Output: `{ traffic_density: [{ lat: float, lon: float, density: float }] }`
- `GET /api/v1/engineering/stats`
  - Output: `{ cache_hits: int, cache_misses: int, compiled_with: string, cpu_usage_pct: float }`

## Code Layout
- `backend/app.py` - FastAPI main entrypoint.
- `backend/graph_manager.py` - Manages graph objects and interface to C++ and predictors.
- `backend/georoute_core.py` - Python fallback / typing helper for C++ extension.
- `backend/prediction_engine.py` - Predictive ML pipeline (to be created).
- `frontend/src/app/(app)/` - Pages directory for simulation, predictions, etc.
- `frontend/src/components/` - Shared UI elements (map, charts, layouts).
