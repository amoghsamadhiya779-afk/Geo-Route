# E2E Test Cases Design for GeoRoute

We define N = 7 core features:
1. **Simulation Lab** (API & UI for route simulations)
2. **Predictive Models** (API & UI for traffic time predictions)
3. **Observability** (UI metrics charts and dashboard)
4. **Knowledge Graph** (UI network diagrams)
5. **AI Reasoning** (UI explanation panels)
6. **Engineering Hub** (API & UI C++ configurations and performance stats)
7. **Command Center & Cities** (UI landing, maps, search and route selection)

---

## Tier 1 - Feature Coverage (Happy-Path, 35 tests)

### Feature 1: Route Simulation API & UI
- **T1.1.1**: POST `/api/v1/simulate/manhattan` with algorithm A* returns valid coordinates and distance.
- **T1.1.2**: POST `/api/v1/simulate/manhattan` with algorithm Dijkstra returns valid coordinates and distance.
- **T1.1.3**: UI `/simulation` page loads successfully and contains the Map element.
- **T1.1.4**: UI `/simulation` page contains controls for running simulation (start, algorithm selector, city selector).
- **T1.1.5**: UI Select Paris and verify city center updates in map container (mock check).

### Feature 2: Route Predictions API & UI
- **T1.2.1**: POST `/api/v1/predict` returns travel time, distance, coordinates, and confidence.
- **T1.2.2**: POST `/api/v1/predict` with different timestamps returns varying travel times.
- **T1.2.3**: UI `/predictions` page loads successfully and displays the Map.
- **T1.2.4**: UI `/predictions` page contains datetime input and route select widgets.
- **T1.2.5**: UI Predictions form submission displays route prediction results card with travel time.

### Feature 3: Traffic Density API & UI
- **T1.3.1**: GET `/api/v1/predict/traffic-density` with city and timestamp returns array of traffic coordinates.
- **T1.3.2**: GET `/api/v1/predict/traffic-density` values change for peak vs off-peak timestamps.
- **T1.3.3**: GET `/api/v1/predict/traffic-density` defaults to current timestamp if omitted.
- **T1.3.4**: UI Predictions page includes traffic density layer toggle switch.
- **T1.3.5**: UI Predictions map shows traffic overlay visualization elements.

### Feature 4: Engineering Stats API & UI
- **T1.4.1**: GET `/api/v1/engineering/stats` returns compiler info, CPU usage, cache hits, cache misses.
- **T1.4.2**: GET `/api/v1/engineering/stats` CPU usage is within valid bounds (0 to 100).
- **T1.4.3**: UI `/engineering` page loads successfully and displays C++ configurations panel.
- **T1.4.4**: UI `/engineering` page cache statistics panel displays current hits and misses.
- **T1.4.5**: UI `/engineering` page contains triggers to clear cache and start benchmark.

### Feature 5: Knowledge Graph UI
- **T1.5.1**: UI `/knowledge-graph` page loads ReactFlow container successfully.
- **T1.5.2**: UI Knowledge Graph renders at least one vertex node.
- **T1.5.3**: UI Knowledge Graph renders at least one connecting edge.
- **T1.5.4**: UI Clicking a node opens sidebar metadata panel (vertex ID, label).
- **T1.5.5**: UI Node search highlights the matched node in ReactFlow.

### Feature 6: Observability UI
- **T1.6.1**: UI `/observability` page loads dashboard widgets.
- **T1.6.2**: UI Observability dashboard renders Recharts monitoring charts (CPU/memory).
- **T1.6.3**: UI Telemetry panel displays average routing latency metric.
- **T1.6.4**: UI View range filters (1h, 24h, 7d) are visible and clickable.
- **T1.6.5**: UI Observability dashboard displays active node metrics summary.

### Feature 7: Command Center & Cities UI
- **T1.7.1**: UI `/` home landing page redirect or load is successful.
- **T1.7.2**: UI `/command-center` page displays list of cities.
- **T1.7.3**: UI City search filter filters the city list by query string.
- **T1.7.4**: UI Clicking a city card centers the Command Center map.
- **T1.7.5**: UI Route search input and results panel are rendered.

---

## Tier 2 - Boundary & Corner Cases (Robustness, 35 tests)

### Feature 1: Route Simulation API & UI
- **T2.1.1**: POST `/api/v1/simulate/manhattan` with missing body fields returns 422 error.
- **T2.1.2**: POST `/api/v1/simulate/manhattan` with out-of-bounds coordinates handles validation gracefully.
- **T2.1.3**: POST `/api/v1/simulate/invalid_city` returns 404 Not Found.
- **T2.1.4**: POST `/api/v1/simulate/manhattan` with invalid algorithm fallback to default.
- **T2.1.5**: UI `/simulation` page handles routing error notifications when API fails.

### Feature 2: Route Predictions API & UI
- **T2.2.1**: POST `/api/v1/predict` with invalid coordinates values returns validation error.
- **T2.2.2**: POST `/api/v1/predict` with start and end coordinates being identical returns 0 distance and time.
- **T2.2.3**: POST `/api/v1/predict` with invalid JSON body structure returns 422 status.
- **T2.2.4**: POST `/api/v1/predict` with timestamp in the far past handles bounds.
- **T2.2.5**: UI `/predictions` page displays input validation errors for invalid coordinates.

### Feature 3: Traffic Density API & UI
- **T2.3.1**: GET `/api/v1/predict/traffic-density` for non-existent city returns empty array or error.
- **T2.3.2**: GET `/api/v1/predict/traffic-density` with invalid timestamp format returns validation error.
- **T2.3.3**: GET `/api/v1/predict/traffic-density` with timestamp far in the future behaves stably.
- **T2.3.4**: GET `/api/v1/predict/traffic-density` missing city ID parameter returns 422.
- **T2.3.5**: UI Predictions page handles empty traffic density data states gracefully.

### Feature 4: Engineering Stats API & UI
- **T2.4.1**: GET `/api/v1/engineering/stats` handles extreme CPU usage bounds.
- **T2.4.2**: GET `/api/v1/engineering/stats` data schema format is verified against JSON schema.
- **T2.4.3**: UI `/engineering` cache size slider handles boundaries (0MB to 1024MB).
- **T2.4.4**: UI `/engineering` displays connection error message when stats API is offline.
- **T2.4.5**: UI `/engineering` Benchmark trigger throttles double clicks to prevent overload.

### Feature 5: Knowledge Graph UI
- **T2.5.1**: UI `/knowledge-graph` handles loading an empty graph state without crashing.
- **T2.5.2**: UI Knowledge Graph zoom operations are bounded within safe limits.
- **T2.5.3**: UI Knowledge Graph handles node selection when clicking nodes rapidly.
- **T2.5.4**: UI Searching for non-existent node ID displays "No nodes found" message.
- **T2.5.5**: UI ReactFlow canvas resize doesn't overlap sidebar layout details.

### Feature 6: Observability UI
- **T2.6.1**: UI `/observability` handles empty chart data array gracefully (displays empty state chart).
- **T2.6.2**: UI Telemetry metrics displays zero values when no simulations are run.
- **T2.6.3**: UI Observability charts adapt layout to extremely small mobile screen dimensions.
- **T2.6.4**: UI Rapid clicking of time range toggles debounces API requests.
- **T2.6.5**: UI Metric values format correctly (e.g. milliseconds formatted to integer or decimal).

### Feature 7: Command Center & Cities UI
- **T2.7.1**: UI `/command-center` handles search keywords with special regex/script characters safely.
- **T2.7.2**: UI `/command-center` handles back/forward browser navigation while keeping UI state.
- **T2.7.3**: UI City card rendering is responsive on small screen widths.
- **T2.7.4**: UI Clicking on map outside city bounds keeps current selected city.
- **T2.7.5**: UI List of cities displays fallback error card if API fails to load.

---

## Tier 3 - Cross-Feature Combinations (7 tests)

- **T3.1 (Route Simulation & Cache Stats)**: Trigger route simulation POST, verify route details, then fetch `/api/v1/engineering/stats` to verify cache hits/misses counter increments.
- **T3.2 (UI Predictions to Simulation Navigation)**: Fill route prediction on `/predictions` UI, click "Simulate Route" link, verify transition to `/simulation` page with coordinates pre-populated.
- **T3.3 (Knowledge Graph to Observability)**: Click a node in `/knowledge-graph`, click "Monitor Node" button, verify transition to `/observability` with that node's charts active.
- **T3.4 (Engineering Config to Simulation Performance)**: Navigate to `/engineering` page, disable caching (cache size 0MB), run simulation on `/simulation` page, verify `/engineering` stats shows hit rate stays at 0%.
- **T3.5 (API Predict coordinates traffic correlation)**: Query traffic density for city at a time, verify traffic prediction travel times for coordinates in high density zones are higher than low density zones.
- **T3.6 (Peak-hour Prediction to Simulation Time correlation)**: Run prediction for peak-hour in `/predictions` page, verify travel time, then run simulation on `/simulation` for the same coordinates and verify travel times correlate.
- **T3.7 (UI Engineering Cache toggle to direct API values)**: Change compilation optimization options on `/engineering` UI, query `/api/v1/engineering/stats` directly and assert response reflects changes.

---

## Tier 4 - Real-World Application Scenarios (5 tests)

- **T4.1 (Dispatcher Route Audit)**: Simulates dispatcher workflow. Search Manhattan -> open simulation lab -> select A* -> click Simulate -> compare with Dijkstra simulation -> select faster route -> view metrics charts.
- **T4.2 (Traffic Peak Planning)**: Simulates route planning workflow. Query peak traffic predictions at 5:00 PM -> inspect density map overlay -> query off-peak predictions at 3:00 AM -> verify lower travel time -> confirm correlation of overlays.
- **T4.3 (Site Cache Optimization Workflow)**: Telemetry check -> notice high routing latency in observability -> navigate to engineering configuration -> expand cache limit -> run multiple simulations to fill cache -> verify latency in observability graph drops.
- **T4.4 (Graph Topology Auditing)**: Open Knowledge Graph -> click critical bridge node -> inspect details -> click to simulate route passing through bridge -> verify coordinates match in simulation panel.
- **T4.5 (Developer Cache Benchmark Workflow)**: Run Cache Benchmark on engineering UI -> watch Recharts benchmark latency graphs -> configure custom cache size -> verify success toast -> verify stats direct query payload.
