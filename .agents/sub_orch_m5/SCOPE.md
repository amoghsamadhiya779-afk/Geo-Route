# Scope: AI Reasoning & Engineering UI (Milestone 5)

## Architecture
- **Backend**: FastAPI server (`backend/app.py`) for API endpoints.
- **Frontend**: Next.js App Router (`frontend/src/app/(app)`) with Tailwind CSS, Lucide Icons, and Framer Motion.
- **Routing Engine**: C++ code under `cpp/` with `georoute_core` bindings or fallback Python mock (`backend/georoute_core.py`).

## Milestones/Tasks
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Investigate Codebase | Review existing mock data, models, and pages to map components. | None | DONE |
| 2 | Backend Engineering Stats API | Implement `/api/v1/engineering/stats` and cache control endpoints in `backend/app.py`. | None | PLANNED |
| 3 | AI Reasoning UI | Implement `/ai-reasoning` with route strategy comparisons and heuristic sliders. | None | PLANNED |
| 4 | Engineering Controls UI | Implement `/engineering` page showing cache stats, memory profile, and compile controls. | Task 2 | PLANNED |
| 5 | Verification & Audit | Validate page rendering, stats fetching, control actions, and compliance checks. | Task 3, 4 | PLANNED |

## Interface Contracts
### GET `/api/v1/engineering/stats`
Returns live (mocked/simulated) stats from the C++ routing cache and compilation context.
Response:
```json
{
  "cache_hits": 1024,
  "cache_misses": 89,
  "compiled_with": "-O3 -march=native -std=c++20 -pthread",
  "cpu_usage_pct": 12.4,
  "memory_usage_mb": 245.8,
  "latency_ms": 0.72,
  "cache_size_mb": 256,
  "cache_policy": "LRU",
  "compile_status": "OPTIMIZED"
}
```

### POST `/api/v1/engineering/config`
Updates cache size, cache policy, and compile level in the backend.
Request:
```json
{
  "cache_size_mb": 128,
  "cache_policy": "FIFO",
  "compile_status": "DEBUG"
}
```
Response:
```json
{
  "status": "success",
  "config": {
    "cache_size_mb": 128,
    "cache_policy": "FIFO",
    "compile_status": "DEBUG"
  }
}
```
