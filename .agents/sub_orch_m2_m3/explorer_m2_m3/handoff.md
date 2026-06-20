# Handoff Report - explorer_m2_m3

This handoff report summarizes the read-only investigation for implementing Milestone 2 (Simulation Lab UI) and Milestone 3 (Predictive Models UI) in the Geo-Route project.

## 1. Observation
* **Current UI state**: `frontend/src/app/(app)/simulation/page.tsx` and `frontend/src/app/(app)/predictions/page.tsx` are simple 15-line placeholder components showing offline messages (e.g. line 10 in both files: "Module Offline...").
* **Map capabilities**: `frontend/src/components/map/TrentMap.tsx` utilizes Deck.gl's `PathLayer` and `ScatterplotLayer` (imported on lines 4-5) over a canvas fallback grid (line 126). It does not currently contain code for heatmaps or custom simulation overlays.
* **Backend API Contract**: `backend/app.py` exposes:
  - `POST /api/v1/predict` taking `PredictRequest` body and returning `{ path: { coordinates, distance_m }, travel_time_sec, confidence }` (lines 72-118).
  - `GET /api/v1/predict/traffic-density` taking `city_id` and `timestamp` query params and returning `{"traffic_density": [{"lat": float, "lon": float, "density": float}]}` (lines 119-130).
* **Charts pattern**: `frontend/src/app/(app)/observability/page.tsx` provides a clear template for integrating Recharts Area, Bar, and Line charts (lines 4-20) running off stateful intervals.

## 2. Logic Chain
* **Reusability of Map**: Since `TrentMap.tsx` is self-contained and already maps cities, the most maintainable strategy is extending the component with conditional layers (`mode`, `simulationVehicles`, and `trafficDensityData`) rather than rewriting duplicate map components.
* **Heatmap Support**: Since `deck.gl` package includes `@deck.gl/aggregation-layers` transitively, we can safely import `HeatmapLayer` to render the traffic density predictions on the map canvas.
* **Client-side Animation**: Polling the backend for real-time vehicle simulation would create network congestion and lag. Therefore, doing client-side interpolation of vehicle positions along route coordinate coordinates using standard React hooks (`setInterval` / `requestAnimationFrame`) is optimal.
* **Comparative Analytics**: To show model sensitivity in the predictions sidebar, firing multiple parallel predictions (e.g., for different weather conditions) or generating the delta client-side allows us to draw comprehensive comparison charts using Recharts.

## 3. Caveats
* The investigation is read-only; no code was added to the active code paths.
* Assumes the backend is compiled with C++ bindings and the ML model pipeline `traffic_model.joblib` exists (or mock fallback is active).

## 4. Conclusion
We have generated a thorough implementation strategy covering Deck.gl extensions, API consumption wrappers, state logic, and Recharts integration. The full specifications are documented in:
`C:\Users\Lenovo\.gemini\antigravity\scratch\Geo-Route\.agents\sub_orch_m2_m3\explorer_m2_m3\analysis.md`

## 5. Verification Method
Verify that the `analysis.md` file contains complete Next.js page drafts, state hooks, and API client modifications, and can be easily picked up by the implementer. After implementing, verification can be run via:
```bash
cd C:\Users\Lenovo\.gemini\antigravity\scratch\Geo-Route\frontend
npm run build
```
This will verify there are no TypeScript compiler errors or Turbopack syntax issues.
