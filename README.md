# TRENT OS: Enterprise Geo-Routing & Fleet Management SaaS

![TRENT OS Logo](https://img.shields.io/badge/TRENT_OS-v4.2.1-8052ff?style=for-the-badge&logo=vercel&logoColor=white)
![React](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

TRENT OS is a cutting-edge Enterprise SaaS Platform designed for massive-scale supply chain logistics, autonomous vehicle (AV) fleet routing, and real-time geospatial analytics. Built with a premium, investor-ready UI ("Dala" aesthetic theme), TRENT OS leverages the same industry-standard autonomous algorithms utilized by leading AV manufacturers like Tesla, Waymo, and BYD.

---

## 🚀 Key Features & Enterprise Modules

TRENT OS isn't just a map—it's a complete operating system for modern logistics networks.

### 1. Supply Chain Control Tower (`/command-center`)
A central command hub for logistics managers. Features a live **Agentic AI Action Stream** that autonomously makes routing decisions (e.g., rerouting around accidents) and generates natural language customer communications to inform stakeholders of ETA changes before they even have to ask.

### 2. Digital Twin Sandbox (`/simulation`)
A high-fidelity simulation environment allowing engineers to benchmark AV routing algorithms against live traffic conditions.
- **Dynamic Controls:** Adjust traffic density, weather conditions, and time of day.
- **Disruption Injection:** Instantly simulate catastrophic events like **Hurricanes**, **Port Strikes**, or **Road Closures** and watch the digital twin algorithms adapt in real-time.
- *Note: Snow conditions are realistically disabled for tropical cities (e.g., Mumbai, Singapore).*

### 3. Telematics & IoT Hub (`/telematics`)
A live ingestion dashboard designed to connect with hardware from Geotab, Samsara, and Motive. Monitors fleet health, engine diagnostics, fuel levels, and real-time GPS payloads across thousands of active nodes.

### 4. ESG & Carbon Analytics (`/esg-analytics`)
Built for enterprise compliance and sustainability goals. 
- Tracks **CO2 Tons Avoided** via optimized routing.
- Generates mock Scope 3 Emissions Compliance Reports.
- Visualizes fuel savings across different vehicle classes (EV vs. Diesel).

### 5. AI Reasoning Studio (`/ai-reasoning`)
An Explainable AI (XAI) interface that demystifies autonomous decision-making. It breaks down exactly *why* the autonomous routing engine selected a specific kinodynamic path over others, ensuring transparency and trust in the AI's operations.

---

## 🧠 Autonomous Routing Algorithms

TRENT OS has moved beyond classical Dijkstra and A* search, implementing the bleeding-edge algorithms required for modern Autonomous Vehicles:

- **Hybrid A*:** Utilized by Tesla FSD, this algorithm accounts for the kinematic constraints of vehicles (e.g., turning radius) rather than just finding the shortest path on a grid.
- **RRT* (Rapidly-exploring Random Tree Star):** An optimal randomized algorithm used for navigating highly dynamic and unpredictable urban environments.
- **Neural Planners:** Deep Reinforcement Learning models that predict traffic flow and optimize routes based on historical congestion data.
- **Model Predictive Control (MPC):** Real-time trajectory optimization for micro-adjustments during the route execution.

---

## 🏗️ System Architecture

- **Frontend (UI Layer):** 
  - Framework: Next.js (App Router)
  - Styling: Tailwind CSS & Vanilla CSS modules
  - Animation: Framer Motion for premium micro-animations
  - State Management: Zustand
- **Frontend (Spatial Layer):** 
  - `Deck.gl` handles high-performance, WebGL-accelerated rendering of global fleet nodes and routes.
  - `Recharts` manages complex telemetry data streams and performance analytics.
- **Backend (API Layer):** 
  - Framework: FastAPI (`uvicorn`) for extreme high throughput.
  - Connects to high-speed routing engines and exposes APIs for real-time fleet telematics and IoT ingestion.

---

## 🛠️ Getting Started & Setup Guide

Follow these steps to get TRENT OS running on your local machine.

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **Git**

### Step 1: Clone the Repository
```bash
git clone https://github.com/amoghsamadhiya779-afk/Geo-Route.git
cd Geo-Route
```

### Step 2: Start the FastAPI Backend
The backend serves the API endpoints, mock data, and handles the AI logic.

```bash
# Navigate to the backend directory
cd backend

# (Optional but recommended) Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Start the uvicorn server
python -m uvicorn app:app --reload --port 8000
```
*The backend API will now be running at `http://localhost:8000`.*

### Step 3: Start the Next.js Frontend
Open a **new terminal window** and navigate to the frontend directory.

```bash
# Navigate to the frontend directory from the project root
cd frontend

# Install Node modules
npm install

# Start the development server
npm run dev
```

### Step 4: Access the Platform
Open your web browser and navigate to:
**`http://localhost:3000`**

You can use the **Command Palette (`CMD+K` or `CTRL+K`)** to instantly fly around the globe to different simulated cities!

---

## 🔮 Future Roadmap

- [ ] **Real-Time Traffic API Integration:** Connect to Google Maps or TomTom APIs for live, real-world congestion data.
- [ ] **Fleet Multi-Tenancy:** Implement NextAuth for actual user login and workspace switching.
- [ ] **C++ Backend Migration:** Offload complex graph traversal to a high-performance C++ backend utilizing WebSockets for millisecond latency.
- [ ] **Mobile App Port:** Wrap the logistics views into a React Native application for drivers.

---

*Designed and engineered for the future of autonomous logistics.*
