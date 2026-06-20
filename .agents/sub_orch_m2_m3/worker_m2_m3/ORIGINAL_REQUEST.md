## 2026-06-20T23:56:18Z
You are a worker agent. Your task is to implement the front-end features for Milestone 2 (Simulation Lab UI) and Milestone 3 (Predictive Models UI) in the Geo-Route project.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please follow these exact implementation steps:
1. Update `frontend/src/lib/api.ts`:
   - Add interfaces for `PredictRequest`, `PredictResponse`, `TrafficDensityPoint`, and `TrafficDensityResponse`.
   - Export fetch functions: `predictRoute(req: PredictRequest): Promise<PredictResponse>` calling `POST /api/v1/predict` and `fetchTrafficDensity(cityId: string, timestamp: number): Promise<TrafficDensityResponse>` calling `GET /api/v1/predict/traffic-density`.

2. Update `frontend/src/components/map/TrentMap.tsx`:
   - Extend `TrentMapProps` to include `mode?: "routing" | "simulation" | "prediction"`, `simulationVehicles?: SimulationVehicle[]`, and `trafficDensityData?: TrafficDensityPoint[]`.
   - Add a `ScatterplotLayer` for simulation vehicles if `mode === "simulation"`. Color the vehicles dynamically based on their speed (e.g., green for fast, orange for medium, red for slow). Set `updateTriggers` properly so updates render dynamically.
   - Add a `HeatmapLayer` (imported from `@deck.gl/aggregation-layers`) for traffic density hotspots if `mode === "simulation"` or `mode === "prediction"`, using `trafficDensityData` for position and density weights.

3. Implement `frontend/src/app/(app)/simulation/page.tsx`:
   - Create a styled, fully functional Simulation Lab UI page with a 3-panel layout:
     - Left Panel: Controls for play/pause, speed multipliers (1x, 2x, 5x, 10x), vehicle count slider, congestion index multiplier slider, weather select dropdown, and a "Simulate Route" button (which computes route via `computeRoute` and initiates the traffic simulation).
     - Center Panel: Interactive `TrentMap` in simulation mode. Users can select start/end points on the map by clicking to run simulation routes.
     - Right Panel: Recharts charts showing real-time metrics generated during playback (e.g. Flow throughput, average vehicle speed, segment congestion).
   - Implement client-side animation logic that generates vehicles and runs them along the computed route coordinates (interpolating coordinates between points) when playback is active.

4. Implement `frontend/src/app/(app)/predictions/page.tsx`:
   - Create a styled, fully functional Predictive Models UI page with a 3-panel layout:
     - Left Panel: Weather selector (clear, rain, snow, fog), Hour of Day slider (0-23), Play/Pause Timelapse toggle (which auto-increments the hour slider to animate traffic density changes over the course of the day), and Route Prediction query trigger.
     - Center Panel: Interactive `TrentMap` in prediction mode showing predicted traffic density hotspots query results from `/api/v1/predict/traffic-density` based on the selected hour, as well as the predicted path route query results from `/api/v1/predict`.
     - Right Panel: Analytical panels showing Travel Time, Distance, and Model Confidence. Include comparison charts using Recharts:
       - 24-Hour travel time profile for the active route query.
       - Weather impact comparison chart comparing travel times across all weather conditions.
       - Model confidence chart.

5. Verify:
   - Make sure all files are properly typed in TypeScript.
   - Build the frontend by running `npm run build` inside `C:\Users\Lenovo\.gemini\antigravity\scratch\Geo-Route\frontend` to ensure compilation passes without errors.

Write a summary of your changes and test results in `C:\Users\Lenovo\.gemini\antigravity\scratch\Geo-Route\.agents\sub_orch_m2_m3\worker_m2_m3\handoff.md`. Send a message back when completed.
