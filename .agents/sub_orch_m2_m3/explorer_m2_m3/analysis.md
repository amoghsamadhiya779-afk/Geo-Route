# Geo-Route: Milestones 2 & 3 Technical Analysis and Strategy

This document provides a detailed implementation plan and code specifications for Milestone 2 (Simulation Lab UI) and Milestone 3 (Predictive Models UI). It outlines how to extend the existing map capabilities, consume backend ML and traffic density APIs, manage UI/simulation state, integrate charts, and ensure a robust TypeScript implementation that avoids crashes.

---

## 1. Codebase Examination and Current State

### 1.1. Simulation Page (`frontend/src/app/(app)/simulation/page.tsx`)
- **Current State**: A placeholder that displays an "offline" message. It does not contain state, maps, or interactive components.
- **Requirements**: Needs to render a 3-panel layout:
  - **Left Panel (Configuration & Playback)**: Controls for running simulations (vehicle count, congestion multiplier, weather), play/pause buttons, speed multipliers (1x, 2x, 5x, 10x), and a time progress slider.
  - **Center Canvas**: An instance of `TrentMap` configured for simulation mode.
  - **Right Panel (Metrics)**: Real-time charts showing vehicle flow rate, average speed, and segment congestion.

### 1.2. Predictions Page (`frontend/src/app/(app)/predictions/page.tsx`)
- **Current State**: A placeholder displaying a "Historical Traffic Ingestion" required message.
- **Requirements**: Needs to render a 3-panel layout:
  - **Left Panel (ML Parameters)**: Weather condition selector, time-of-day slider, and a time-lapse play button.
  - **Center Canvas**: `TrentMap` displaying predicted traffic density heatmaps and predicted route paths.
  - **Right Panel (ML Analytics)**: Travel time statistics, model confidence meters, and charts comparing weather impacts or 24-hour profiles.

---

## 2. Deck.gl Map Extension Strategy (`TrentMap.tsx`)

### 2.1. Current Map Mechanism
The `TrentMap.tsx` component renders Deck.gl layers over a fallback grid background (used for Turbopack compatibility). It receives coordinates from parent clicks, shows the start and end nodes using `ScatterplotLayer`, and shows the optimal route using `PathLayer`.

### 2.2. Extending `TrentMapProps`
To avoid code duplication and support both Simulation Lab and Predictive Models, we will extend `TrentMap.tsx` by adding optional props and a `mode` parameter.

```typescript
export interface SimulationVehicle {
  id: string;
  lon: number;
  lat: number;
  speed: number;
}

export interface TrafficDensityPoint {
  lat: number;
  lon: number;
  density: number;
}

export interface TrentMapProps {
  routeData?: RouteResponse;
  startCoord?: { lat: number; lon: number } | null;
  endCoord?: { lat: number; lon: number } | null;
  onMapClick?: (lat: number, lon: number) => void;
  
  // New props for Milestones 2 & 3
  mode?: "routing" | "simulation" | "prediction";
  simulationVehicles?: SimulationVehicle[];
  trafficDensityData?: TrafficDensityPoint[];
}
```

### 2.3. Supporting Custom Layers

#### A. Scatterplot Layer (Vehicles)
Used in **Simulation Lab** to render individual moving vehicles.
```typescript
import { ScatterplotLayer } from "@deck.gl/layers";

// Inside useMemo() layers block:
if (mode === "simulation" && simulationVehicles) {
  arr.push(
    new ScatterplotLayer({
      id: "simulation-vehicles",
      data: simulationVehicles,
      getPosition: (d: SimulationVehicle) => [d.lon, d.lat],
      getFillColor: (d: SimulationVehicle) => {
        // Dynamic speed color mapping: slow is red, medium is orange, fast is green
        if (d.speed < 5) return [239, 68, 68, 220];      // Red
        if (d.speed < 12) return [245, 158, 11, 220];    // Orange
        return [16, 185, 129, 220];                      // Green
      },
      getRadius: 10,
      radiusMinPixels: 3,
      radiusMaxPixels: 12,
      updateTriggers: {
        getPosition: [simulationVehicles],
        getFillColor: [simulationVehicles],
      },
    })
  );
}
```

#### B. Path Layer (Route Path Segment Coloring)
Used to render routes. We can color segments based on speed multiplier to visualize bottlenecks.
```typescript
import { PathLayer } from "@deck.gl/layers";

if (routeData?.path) {
  arr.push(
    new PathLayer({
      id: "simulation-route",
      data: [{ path: routeData.path.coordinates }],
      getPath: (d: { path: [number, number][] }) => d.path,
      getColor: mode === "prediction" ? [59, 130, 246] : [16, 185, 129], // Blue for ML route, Green for routing
      getWidth: 8,
      widthMinPixels: 4,
    })
  );
}
```

#### C. Heatmap Layer (Congestion & Density)
Used in both pages to display regional density hotspots. Because `@deck.gl/aggregation-layers` is packaged within `deck.gl`, we can import `HeatmapLayer` safely:
```typescript
import { HeatmapLayer } from "@deck.gl/aggregation-layers";

// Inside useMemo() layers block:
if ((mode === "simulation" || mode === "prediction") && trafficDensityData) {
  arr.push(
    new HeatmapLayer({
      id: "traffic-density-heatmap",
      data: trafficDensityData,
      getPosition: (d: TrafficDensityPoint) => [d.lon, d.lat],
      getWeight: (d: TrafficDensityPoint) => d.density,
      radiusPixels: 45,
      intensity: 1.5,
      threshold: 0.05,
      colorRange: [
        [255, 255, 178, 25],
        [254, 204, 92, 80],
        [253, 141, 60, 150],
        [240, 59, 32, 200],
        [189, 0, 38, 255]
      ]
    })
  );
}
```

---

## 3. API Endpoints Integration (`frontend/src/lib/api.ts`)

We will add the following interfaces and fetch functions to support predictions.

### 3.1. API Type Specifications
```typescript
export interface PredictRequest {
  city_id: string;
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  timestamp: number; // Unix Epoch timestamp in seconds
  weather?: "clear" | "rain" | "snow" | "fog";
}

export interface PredictResponse {
  path: {
    coordinates: [number, number][];
    distance_m: number;
  };
  travel_time_sec: number;
  confidence: number;
}

export interface TrafficDensityPoint {
  lat: number;
  lon: number;
  density: number;
}

export interface TrafficDensityResponse {
  traffic_density: TrafficDensityPoint[];
}
```

### 3.2. Fetch Functions
```typescript
export const predictRoute = async (req: PredictRequest): Promise<PredictResponse> => {
  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to fetch ML route prediction");
  }
  return res.json();
};

export const fetchTrafficDensity = async (cityId: string, timestamp: number): Promise<TrafficDensityResponse> => {
  const res = await fetch(`${API_BASE}/predict/traffic-density?city_id=${cityId}&timestamp=${timestamp}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to fetch traffic density");
  }
  return res.json();
};
```

---

## 4. State Variables and Logic

### 4.1. Simulation Lab Page (`simulation/page.tsx`)
This page handles live vehicle movements. To implement a fluid animation client-side:

#### A. State variables:
- `isPlaying` (boolean): Controls simulation interval.
- `speedMultiplier` (number): Adjusts step frequency (1x, 2x, 5x, 10x).
- `currentTimeStep` (number): Track simulator frame index (e.g., 0 to 100).
- `vehicleCount` (number): Number of vehicles generated (default: 100).
- `weather` (string): Selected weather affecting speed (e.g. "clear").
- `congestionLevel` (number): Multiplier scaling down speed (1.0 to 3.0).
- `vehicles` (SimulationVehicle[]): Updated dynamically in an animation loop.

#### B. Dynamic Simulation Loop logic:
Whenever a simulation route is active, we mock vehicles along the path coordinates. We generate a set of vehicles at random path offsets. During each tick, we advance their path completion percentage.
```typescript
// Client-side vehicle coordinate interpolation
const interpolatePosition = (coords: [number, number][], progress: number): [number, number] => {
  const index = Math.floor((coords.length - 1) * progress);
  const nextIndex = Math.min(index + 1, coords.length - 1);
  if (index === nextIndex) return coords[index];
  
  const segmentProgress = ((coords.length - 1) * progress) - index;
  const lon = coords[index][0] + (coords[nextIndex][0] - coords[index][0]) * segmentProgress;
  const lat = coords[index][1] + (coords[nextIndex][1] - coords[index][1]) * segmentProgress;
  return [lon, lat];
};
```
Every tick (e.g., every 100ms when playing), we update the vehicles:
```typescript
setVehicles((prev) => 
  prev.map((v) => {
    let nextProgress = v.progress + (v.baseSpeed * speedMultiplier * (0.01 / congestionLevel));
    if (nextProgress >= 1.0) nextProgress = 0.0; // Loop vehicles back to start
    
    const [lon, lat] = interpolatePosition(routeCoordinates, nextProgress);
    return { ...v, lon, lat, progress: nextProgress, speed: v.baseSpeed / congestionLevel };
  })
);
```

---

### 4.2. Predictive Models Page (`predictions/page.tsx`)
This page displays static predictions and animates traffic density time-lapses.

#### A. State variables:
- `hourOfDay` (number: 0 - 23): Time slice mapped to the slider.
- `selectedWeather` ("clear" | "rain" | "snow" | "fog"): Forecast weather condition.
- `isTimelapsePlaying` (boolean): Controls auto-playing hours.
- `timelapseSpeed` (number): Delay between hour increments.

#### B. Time-Lapse loop:
When `isTimelapsePlaying` is active, a `useEffect` interval increments `hourOfDay` by 1 every 800ms (wrapping back to 0 at 24). This automatically triggers React Query to fetch the traffic density map overlay for that specific time, showing density fluctuations during morning and evening rush hours.

---

## 5. Recharts Metrics Panels

We will create charts that dynamically show either the active simulation telemetry or the scenarios calculated.

### 5.1. Simulation Lab Charts (Live Series)
- **Flow Throughput (AreaChart)**: Display a rolling count of active vehicles and cumulative completions.
- **Average Traffic Speed (LineChart)**: Tracks mean speed of all active vehicles. Under "Rain" or higher "Congestion Level", the speed line will drop dynamically.
- **Segment Congestion (BarChart)**: Divides the route into 5 segments and graphs their density levels.

*Data Injection*:
```typescript
const chartData = useMemo(() => {
  return vehicles.reduce((acc, curr) => {
    // Generate live average speed aggregates
    ...
  }, []);
}, [vehicles]);
```

### 5.2. Predictive Models Charts (Scenario Comparison)
- **24-Hour Congestion Profile (LineChart)**: Plots travel time (Y-axis) vs. time of day (X-axis) for the current route.
- **Weather Sensitivity Analysis (BarChart)**: Compares the predicted travel time for the selected path across "Clear", "Rain", "Snow", and "Fog".
  *Implementation detail*: When start/end coordinates are set, we issue 4 parallel queries or calculate mock differentials based on the ML factor metadata.
- **Model Confidence Horizon (LineChart)**: Shows confidence score over time (e.g. 1h out, 6h out, 12h out, 24h out).

---

## 6. Complete, Step-by-Step Implementation Strategy

Follow these sequential steps to implement the UI without TypeScript compiler errors or Next.js crashes.

### Step 1: Update API Client
Modify `frontend/src/lib/api.ts` to add the interfaces and fetch functions detailed in Section 3. Ensure all types are exported.

### Step 2: Extend Map Overlay
Extend `frontend/src/components/map/TrentMap.tsx`:
1. Update `TrentMapProps` interface.
2. Import `HeatmapLayer` from `@deck.gl/aggregation-layers`.
3. Add the conditional `ScatterplotLayer` for simulation vehicles.
4. Add the conditional `HeatmapLayer` for traffic density.
5. Set `updateTriggers` on the vehicle `ScatterplotLayer` to ensure React state updates render smoothly.

### Step 3: Implement Simulation Lab Page
Create `frontend/src/app/(app)/simulation/page.tsx`:
1. Use client-side routing and mark page with `"use client"`.
2. Dynamically import `TrentMap` with `{ ssr: false }`.
3. Set up the three-panel layout (`flex h-full w-full overflow-hidden`).
4. Implement the simulation loop with `useEffect` or `useInterval`. Initialize mock vehicle speeds based on city configuration.
5. Add UI controls (Play/Pause, Speed selectors, vehicle count slider).
6. Build Recharts panels in the right sidebar (`AreaChart` for throughput, `LineChart` for average speed).

### Step 4: Implement Predictive Models Page
Create `frontend/src/app/(app)/predictions/page.tsx`:
1. Mark page with `"use client"`.
2. Dynamically import `TrentMap` with `{ ssr: false }`.
3. Add a slider for `hourOfDay` mapping to Unix epoch timestamps.
4. Bind queries to `/api/v1/predict/traffic-density?city_id={id}&timestamp={ts}` using React Query.
5. Bind route prediction mutation to `/api/v1/predict`.
6. Add the time-lapse player that auto-increments the slider index.
7. Build Recharts panels comparing weather scenarios and 24h profiles.

### Step 5: Verify Build and Compilation
Run the local next compiler to make sure all types align and Turbopack compiles successfully:
```bash
npm run build
```
This ensures zero TypeScript compiler or static build crashes.
