# Plan: Milestones 2 & 3 Implementation

## Milestone 2: Simulation Lab UI (/simulation page)
1. **Explore**:
   - Analyze requirements: Playback controls, simulation config panel, Recharts, Deck.gl Map integration.
   - Identify existing code that can be reused (e.g. `TrentMap.tsx`, store, queries).
   - Produce explorer report.
2. **Implement**:
   - Create fully functional `/simulation` page.
   - Implement simulated traffic playback (moving points or path highlights over time indices).
   - Integrate playback controls (play, pause, speed multipliers).
   - Build simulation config panel (sliders/inputs for density, flow rate, speed).
   - Integrate Recharts graphs showing simulated metrics (e.g., Average Speed, Congestion Index, Flow Rate over time).
   - Enhance Map layers (heatmaps/scatterplots/paths overlays).
3. **Review**:
   - Code style, Next.js page compatibility, TypeScript validation, styling/layout checking.
4. **Verify**:
   - Check for console crashes or runtime exceptions.
   - Verify layout and reactivity to user input.
5. **Audit**:
   - Integrity forensics, check for cheats/hacks or hardcoded items.

## Milestone 3: Predictive Models UI (/predictions page)
1. **Explore**:
   - Analyze requirements: `/api/v1/predict` (travel times + route) and `/api/v1/predict/traffic-density` (hotspots).
   - Connect map layers to visualize traffic density (congestion hotspots) and predicted route travel times.
   - Produce explorer report.
2. **Implement**:
   - Create fully functional `/predictions` page.
   - Implement routing query interface (click map to set start/end, select timestamp, select weather).
   - Call `/api/v1/predict` on query submit and display travel time, distance, confidence, and path overlay.
   - Call `/api/v1/predict/traffic-density` based on active city and selected future timestamp to display hotspot heatmap/scatterplots on the map.
   - Display charts and telemetry panels.
3. **Review**:
   - TypeScript checking, styling/layout verification.
4. **Verify**:
   - End-to-end user flows on predictions page.
5. **Audit**:
   - Integrity checks to confirm true connection to backend endpoints rather than mocked offline results.

## Finalization
- Synthesize all subagent results.
- Verify everything works together without crashes or lint errors.
- Write handoff.md and report completion to parent agent.
