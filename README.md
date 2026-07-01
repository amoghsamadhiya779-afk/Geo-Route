# TRENT OS (Geo-Route)

**A full-stack fleet-routing and geospatial analytics platform** — a simulation-driven
dashboard for logistics and autonomous-vehicle route planning, built with Next.js and FastAPI.

> **Project status:** Portfolio / simulation project. TRENT OS runs on **simulated
> telematics and traffic data** to demonstrate routing algorithms, geospatial rendering,
> and a logistics operations UI. It is not connected to live fleet hardware.

---

## Overview

TRENT OS is a control-tower-style interface for visualizing fleet routing at scale. It
pairs a WebGL-accelerated map with a Python routing backend, and includes a "digital-twin"
sandbox for benchmarking how routing behaves under disruptions (road closures, weather,
traffic density). The goal was to build a realistic logistics UX and implement
motion-constrained path-planning algorithms end to end.

## Key Features

- **Command Center** — a logistics dashboard for monitoring simulated fleet nodes and routes.
- **Digital-Twin Sandbox** — inject disruptions (road closures, weather, traffic density,
  time of day) and observe how route planning adapts in real time.
- **Telematics View** — a UI for streaming simulated vehicle telemetry (GPS, fuel, diagnostics)
  designed around common provider payload shapes (Geotab / Samsara / Motive style).
- **ESG / Carbon View** — visualizes estimated CO₂ savings from route optimization across
  vehicle classes (based on simulated inputs).
- **Explainable Routing (XAI) View** — surfaces *why* the planner selected a given path,
  making the routing logic inspectable.

## Routing Algorithms

TRENT OS implements motion-aware planners rather than plain grid search:

- **Hybrid A\*** — accounts for vehicle kinematic constraints (e.g., turning radius) to
  produce drivable paths, not just shortest grid paths.
- **RRT\*** — sampling-based planning for navigating dynamic / unstructured environments.
- **Model Predictive Control (MPC)** — trajectory micro-adjustments during route execution.

> Traffic-flow prediction and reinforcement-learning planners are on the roadmap (see below);
> the current build focuses on classical + kinodynamic planners over simulated conditions.

## Architecture

**Frontend**
- **Framework:** Next.js (App Router)
- **Spatial rendering:** Deck.gl (WebGL) for high-performance rendering of fleet nodes and routes
- **Charts:** Recharts for telemetry / analytics
- **Styling:** Tailwind CSS
- **Animation:** Framer Motion
- **State:** Zustand

**Backend**
- **Framework:** FastAPI (Uvicorn)
- **Role:** exposes routing endpoints, serves simulated telematics/traffic data, and runs the
  path-planning logic.
