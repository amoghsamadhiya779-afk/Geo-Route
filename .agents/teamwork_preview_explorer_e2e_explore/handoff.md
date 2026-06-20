# Phase 1: Exploration Handoff Report — E2E Testing Track

## Executive Summary
This report summarizes the findings of the Phase 1 Exploration for the E2E Testing Track of the Geo-Route project. The backend (FastAPI) and frontend (Next.js) are built using standard web stacks and can be run concurrently. Currently, only C++ unit tests exist (via GoogleTest). No E2E or unit testing framework is currently configured for Python or JavaScript/TypeScript. We recommend setting up **Playwright (Node.js/TypeScript)** in the frontend directory for E2E testing.

---

## Detailed Findings

### 1. Codebase Structure & Key Files
- **Backend (FastAPI)**:
  - `backend/app.py` — FastAPI application entry point, setting up CORS, and exposing route endpoints.
  - `backend/graph_manager.py` — Coordinates lazy-loading of routing graphs and routing computations. It attempts to load `georoute_core` (compiled C++ bindings) and falls back to a Python mock.
  - `backend/georoute_core.py` — Python fallback implementation providing mock data for routing computations.
  - `backend/requirements.txt` — Defines backend dependencies (`fastapi==0.103.1`, `uvicorn==0.23.2`, `pydantic==2.3.0`).
- **Frontend (Next.js)**:
  - `frontend/package.json` — Defines scripts (`dev`, `build`, `start`, `lint`) and dependencies (e.g. Next.js 16.2.9, React 19.2.4, Deck.gl, Tailwind CSS).
  - `frontend/src/app/` — Contains application pages including the Landing Page (`app/page.tsx`), CommandCenter (`app/(app)/command-center/page.tsx`), and Routes/Simulations (`app/(app)/routes/page.tsx` & `app/(app)/simulation/page.tsx`).
  - `frontend/src/lib/api.ts` — Exposes functions `fetchCities` and `computeRoute` pointing to the backend API base url `http://localhost:8000/api/v1`.
- **Core C++**:
  - `cpp/tests/` — Directory containing GTest unit tests for C++ graph logic, serializers, and routing algorithms.

### 2. Available APIs
- `GET /` — Root health check. Returns `{"status": "Trent API is running"}`.
- `GET /api/v1/cities` — Lists all available cities loaded from `data/cities.json`.
- `GET /api/v1/cities/{city_id}` — Returns metadata for a specific city.
- `POST /api/v1/simulate/{city_id}` — Computes pathfinding route for a city.
  - **Body**: `{ "start_lat": float, "start_lon": float, "end_lat": float, "end_lon": float, "algorithm": string }`
  - **Returns**: JSON object containing calculated path coordinates, distance metrics, execution metrics, and explored nodes list.

### 3. Server Startup & Shutdown Procedures
- **Backend (FastAPI)**:
  - **Start**: Run `py backend/app.py` from the project root, or `py -m uvicorn app:app --port 8000` from the `backend/` directory.
  - **Stop**: Send Ctrl+C / SIGINT to the process, or kill the process running on port 8000 using PowerShell (`Stop-Process -Id <PID>`) or command prompt (`taskkill /F /PID <PID>`).
- **Frontend (Next.js)**:
  - **Start**: Run `npm run dev` or `npx next dev` from the `frontend/` directory (defaults to port 3000).
  - **Stop**: Send Ctrl+C / SIGINT to the process, or kill the process running on port 3000.
  - *Note*: A Next.js dev server is already running on port 3000 under PID 25708 in the current environment.

### 4. Existing Test Suites
- **C++**: GTest unit tests in `cpp/tests/` (compiled via CMake targets).
- **Backend/Python**: No existing unit or E2E tests are present.
- **Frontend/Node**: No JS/TS unit, integration, or E2E tests are present in `frontend/src` or configuration files.

### 5. Testing Environments & Tools
- **Python**: Version `3.12.0` (invoked via Python Launcher `py`). `pip 26.0.1` is available.
- **Node/Npm**: Node.js `v20.12.2` and Npm `10.9.0` are available.
- **Testing Packages**:
  - `pytest 9.0.3` is installed globally.
  - No playwright, selenium, or cypress packages are installed in the python environment or node environment.

### 6. Recommended E2E Test Framework
We recommend **Playwright (Node.js/TypeScript)** run from the `frontend/` directory.
- **Why**: Co-locating tests with the Next.js TypeScript frontend makes writing and maintaining tests native and straightforward. Playwright offers superior support for modern SPA features, canvas/WebGL rendering (essential for Deck.gl/MapLibre maps used in Geo-Route), and is easily integrated with CI/CD pipelines.

---

## 5-Component Handoff Report

### 1. Observation
- File structures checked via `list_dir` on `backend/` and `frontend/`.
- Dependency files inspected:
  - `backend/requirements.txt`:
    ```
    1: fastapi==0.103.1
    2: uvicorn==0.23.2
    3: pydantic==2.3.0
    ```
  - `frontend/package.json` contains dependencies like React 19, Next.js 16, and zero test packages under devDependencies.
- Executed `py --version`, `py -m pip --version`, `node --version`, and `npm --version` in terminal:
  - Python launcher found `Python 3.12.0` and `pip 26.0.1`.
  - Node.js version `v20.12.2` and npm version `10.9.0`.
- Verified that global `pytest` is installed (version `9.0.3`), but `playwright` is not installed on Python or npm.
- Observed that a frontend server is already running on port 3000 (PID 25708).
- Started backend server using `py backend/app.py` in the background and verified root endpoint responds with `{"status": "Trent API is running"}`.
- Simulated route post requests raised `FileNotFoundError: Graph file not found: .../data/graphs/manhattan.graph` since `data/graphs/` was missing.
- Created directory `data/graphs/` and dummy file `manhattan.graph`. A subsequent POST request to `/api/v1/simulate/manhattan` successfully returned mock routing JSON data.

### 2. Logic Chain
- Since the backend's `/api/v1/simulate/{city_id}` endpoint performs a file existence check `os.path.exists(graph_path)` before utilizing the mock Python fallback (in `backend/graph_manager.py:55`), dummy `.graph` files must be present under `data/graphs/` for the simulated route functionality to work without errors.
- Since `pytest 9.0.3` is globally installed but no other testing packages (playwright, cypress) are installed locally, the project is a clean slate regarding E2E testing setup.
- Since the frontend relies on Next.js, Deck.gl, and MapLibre GL for canvas-based geographic rendering, and the codebase uses TypeScript, the Playwright (Node.js) framework is the best choice because it natively supports Canvas testing, shadow DOM selectors, auto-waiting, and is co-located with frontend code.

### 3. Caveats
- The core C++ compilation was not attempted since ZLIB and Osmium libraries are system dependencies and network calls are restricted in our CODE_ONLY mode. However, the Python fallback (`georoute_core.py`) serves as a complete substitute for API testing.
- We assume that the existing dev server on port 3000 should remain running or can be restarted. For automated E2E tests, starting/stopping the servers in a clean environment should be scripted (e.g. using `start-server-and-test` package).

### 4. Conclusion
- The backend API runs successfully via Python 3.12 and uvicorn on port 8000, falling back to mock routing data if a dummy `.graph` file is placed in `data/graphs/`.
- The frontend Next.js dev server runs on port 3000.
- E2E testing should be implemented using **Playwright (TypeScript)** in the `frontend/` workspace directory.

### 5. Verification Method
- **Backend check**: Run `py backend/app.py` and execute `Invoke-RestMethod -Uri "http://localhost:8000/"` inside PowerShell to receive the health check response.
- **Frontend check**: View the running site at `http://localhost:3000`.
- **E2E verification**: In a future step, run `npm install -D @playwright/test` and `npx playwright test` to run test suites.
