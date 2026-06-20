# Handoff Report - Milestone 5 Backend Engineering APIs

## 1. Observation
- **File Paths and Lines Investigated**:
  - `backend/app.py` (lines 1 to 135) - Contains the FastAPI routes. Specifically, lines 75-77 and 119-130 handle input validation.
  - `backend/tests/test_predictions.py` (lines 118-131, 153-158) - Validates predictions and traffic density handling.
  - `sub_orch_m5/SCOPE.md` - Outlines the interface contracts for `/api/v1/engineering/stats` and `/api/v1/engineering/config`.
- **Existing Test Execution Output**:
  Running `py -m pytest backend/tests/` yields 2 failures:
  ```
  FAILED backend/tests/test_predictions.py::test_invalid_city - assert 500 == 400
  FAILED backend/tests/test_predictions.py::test_traffic_density_invalid_city - assert 500 == 404
  ```
  This is caused by error intercepting in `backend/app.py`:
  - Line 75-77:
    ```python
    if not gm.get_city_info(req.city_id):
        raise HTTPException(status_code=400, detail=f"Unknown city_id: {req.city_id}")
    ```
    caught by lines 116-117:
    ```python
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
    ```
  - Line 122-123:
    ```python
    if not gm.get_city_info(city_id):
        raise HTTPException(status_code=404, detail="City not found in metadata.")
    ```
    caught by lines 129-130:
    ```python
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    ```

## 2. Logic Chain
- **Integration Points**:
  - To support the engineering API controls, `/api/v1/engineering/stats` (GET) and `/api/v1/engineering/config` (GET and POST) need to be registered in `backend/app.py`.
  - The cleanest integration point is right before `if __name__ == "__main__":` in `backend/app.py` (around line 131).
- **Mock State Encapsulation**:
  - Rather than bloating `backend/app.py`, a dedicated state helper `EngineeringManager` (`backend/engineering_manager.py`) should be created.
  - An in-memory singleton pattern allows easy coordination between request processing routes (where we track cache hit/miss behavior and sleep for simulated latency) and stats reporting endpoints.
- **Latency and Cache Simulation**:
  - Latency overhead should sleep (using `time.sleep`) during queries to allow the client frontend to measure real HTTP response latency and be added to the returned execution metrics.
  - The cache hit rate should dynamically scale based on configured parameters (`cache_size_mb` and `cache_policy`). 
  - To simulate recompilation dynamically without background threads, a time-based self-resolving mechanism can check the elapsed time since compilation started. During this period, stats calls report `COMPILING` status and elevated CPU usage (85-95%).
- **Exception Interception Fix**:
  - Adding `except HTTPException: raise` blocks before generic `except Exception` blocks in `app.py` routes prevents `500` masking, allowing validation errors to correctly propagate back as `400` or `404` and passing the existing tests.

## 3. Caveats
- **Multi-Process/Reload Sync**: The proposed design uses an in-memory singleton for simplicity. If FastAPI runs with multiple worker processes (e.g. `gunicorn -w 4`), the state will not be synchronized across processes. For a dev prototype, this is completely fine. If required in the future, a file-backed JSON store could persist and synchronize state.

## 4. Conclusion
Integrating the engineering dashboard APIs requires:
1. Creating `backend/engineering_manager.py` implementing the `EngineeringManager` state tracker.
2. Integrating the endpoints in `backend/app.py` and capturing query execution via `eng_manager.record_query()` and `time.sleep()`.
3. Fixing the generic `except Exception` blocks in `app.py` to prevent masking `HTTPException`.

Complete proposed implementations are generated as:
- Helper: `C:\Users\Lenovo\.gemini\antigravity\scratch\Geo-Route\.agents\explorer_m5_2\proposed_engineering_manager.py`
- Main API: `C:\Users\Lenovo\.gemini\antigravity\scratch\Geo-Route\.agents\explorer_m5_2\proposed_app.py`

## 5. Verification Method
1. **Copy proposed changes**:
   - Save `proposed_engineering_manager.py` as `backend/engineering_manager.py`.
   - Save `proposed_app.py` as `backend/app.py`.
2. **Execute tests**:
   - Run `py -m pytest backend/tests/` to verify that all 7 tests now pass successfully (resolving the validation 500 errors).
3. **Verify engineering endpoints**:
   - Start the server using `py backend/app.py` (or `uvicorn app:app --host 0.0.0.0 --port 8000 --reload`).
   - Query `GET http://localhost:8000/api/v1/engineering/stats` to verify default metrics structure.
   - Send `POST http://localhost:8000/api/v1/engineering/config` with payload `{"cache_size_mb": 128, "compile_status": "DEBUG"}`.
   - Instantly fetch stats again to verify state updates to `COMPILING` and high CPU, then poll after 3 seconds to verify status transitions to `DEBUG`.
