# Scope: Milestones 2 & 3 - Frontend Map UIs

## Architecture
- **State management**: useTrentStore (Zustand) for active city, current reality, time index, command palette state.
- **Data fetching**: React Query (`@tanstack/react-query`) with `fetch` functions in `lib/api.ts`.
- **Maps**: Deck.gl / react-map-gl overlays reusing/adapting `TrentMap.tsx`. We need heatmaps (`@deck.gl/aggregation-layers` HeatmapLayer or similar), paths (`PathLayer`), scatterplots (`ScatterplotLayer`).
- **Charts**: Recharts for metrics / telemetry.
- **Styles**: Tailwind CSS.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 2 | Simulation Lab UI | `/simulation` page: Deck.gl map showing traffic path/scatterplots/heatmaps playback, playback controls (play, pause, speed), simulation config panel (slider for density, node counts), Recharts graphs for simulation metrics (flow rate, congestion index over time). | None | PLANNED |
| 3 | Predictive Models UI | `/predictions` page: map showing predicted congestion hotspots (HeatmapLayer / ScatterplotLayer) and query path overlays. Connected to `/api/v1/predict` and `/api/v1/predict/traffic-density`. Timestamp picker, search route query inputs, metrics display. | None | PLANNED |

## Interface Contracts
- `POST /api/v1/predict` (route prediction travel times & confidence)
- `GET /api/v1/predict/traffic-density?city_id=X&timestamp=Y` (dynamic traffic hotspots)
- `GET /api/v1/cities` (city center, zoom, bounds)
- `POST /api/v1/simulate/{city_id}` (compute routes for simulation paths)
