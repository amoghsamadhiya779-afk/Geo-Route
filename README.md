# TRENT OS: Enterprise Geo-Routing & Fleet Management SaaS

TRENT OS is a cutting-edge Enterprise SaaS Platform designed for supply chain logistics, autonomous vehicle (AV) fleet routing, and real-time geospatial analytics. It features a modern, investor-ready UI ("Dala" theme) and leverages industry-standard autonomous algorithms used by Tesla, Waymo, and BYD.

## Core Architecture
- **Frontend (UI Layer)**: Next.js (App Router), Tailwind CSS, Framer Motion for micro-animations, and Zustand for state management.
- **Frontend (Spatial Layer)**: `Deck.gl` handles high-performance rendering of global fleet nodes, and `Recharts` manages complex telemetry data streams.
- **Backend (API Layer)**: Built with FastAPI (`uvicorn`). Connects to high-speed routing engines and exposes APIs for real-time fleet telematics and IoT ingestion.

## Enterprise SaaS Modules
- **Supply Chain Control Tower (`/command-center`)**: An Agentic AI Action Stream simulating autonomous routing decisions and LLM-generated customer delay communications.
- **Digital Twin Sandbox (`/simulation`)**: Inject disruptions like **Hurricanes** or **Port Strikes** in real-time. Benchmark modern AV algorithms (`Hybrid A*`, `RRT*`, `Neural Planner`, `MPC`, `D* Lite`) against traffic load.
- **Telematics & IoT Hub (`/telematics`)**: Live GPS ingestion feed supporting API integrations with Geotab, Samsara, and Motive hardware.
- **ESG & Carbon Analytics (`/esg-analytics`)**: Enterprise sustainability dashboards tracking CO2 tons avoided and fuel saved, complete with regulatory compliance reports.
- **AI Reasoning Studio (`/ai-reasoning`)**: Explainable AI interface demonstrating exactly *why* the autonomous routing engine selected a specific kinodynamic path over others.

## Running Locally

**1. Start the FastAPI Backend**
```bash
cd backend
py -m pip install -r requirements.txt
py -m uvicorn app:app --reload --port 8000
```

**2. Start the Next.js Frontend**
```bash
cd frontend
npm install
npm run dev
```
Access the Enterprise platform at `http://localhost:3000`.
