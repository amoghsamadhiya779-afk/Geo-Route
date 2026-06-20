# Original User Request

## Initial Request — 2026-06-20T17:21:02+05:30

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Build the 6 remaining offline modules for the TRENT OS Geo-Route project: Simulation Lab, Predictive Models, Observability, Knowledge Graph, AI Reasoning, and Engineering. The implementation must strictly adhere to Low-Level Design (LLD), High-Level Design (HLD), and Object-Oriented Programming (OOP) principles, and include the data engineering pipeline required for predictive routing. Integrate Maps and overlay data layers extensively to create a complete geographic experience.

Working directory: `C:\Users\Lenovo\.gemini\antigravity\scratch\Geo-Route`

Integrity mode: benchmark

## Requirements

### R1. Real Predictive ML Pipeline
Build a Python ML model (using `scikit-learn` or similar) trained on simulated historical traffic data. The model must forecast route traversal times based on future timestamps and expose this via the FastAPI backend.

### R2. Advanced UI Modules
Implement the 6 remaining React modules (`/simulation`, `/predictions`, `/observability`, `/knowledge-graph`, `/ai-reasoning`, `/engineering`). Use `reactflow` for the Knowledge Graph and `Recharts` for Observability/Simulation data.

### R3. Architectural Strictness (OOP/LLD)
Strictly follow Object-Oriented Programming (OOP) and Low-Level Design (LLD) in the backend. Keep the C++ mocking logic cleanly separated from the FastAPI layer via interfaces.

### R4. Complete Map Experience
Integrate geographic maps (e.g., Deck.gl or React-Map-GL) into the advanced modules (like Predictions and Simulation Lab) and layer rich data visualizations (heatmaps, scatterplots, paths) on top of the maps to create a complete spatial intelligence experience.

## Acceptance Criteria

### Backend Verification
- [ ] The Python backend exposes an `/api/v1/predict` (or similar) endpoint that successfully returns varying traversal costs when given different future timestamps.
- [ ] A programmatic test script successfully queries the prediction endpoint and validates that the model outputs a valid float/integer response.

### Frontend Verification
- [ ] The `/knowledge-graph` page renders a node/edge diagram using `reactflow` without throwing console errors or crashing the Next.js application.
- [ ] The 6 previously offline pages now contain implemented, styled UI components rather than "Offline" placeholders.
