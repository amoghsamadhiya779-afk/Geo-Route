# Scope: ML Predictive Backend

## Architecture
- **ML Predictive Model**: A Python machine learning model (e.g., scikit-learn Random Forest / Gradient Boosting / Linear Regression) trained on simulated historical traffic data (such as time-of-day, day-of-week, distance).
- **OOP Architecture**: Clean separation of predictive inference, data/model management, and mocking interfaces.
- **FastAPI Endpoints**: Integration with backend web server (`/api/v1/predict` and potentially traffic density query).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Simulated Traffic Data & Model Training | Create training script, generate simulated traffic data (based on hour, weekday, distance), train scikit-learn model, and save model artifact. | None | PLANNED |
| 2 | OOP Interfaces & Separation of Concerns | Define abstractions (`PredictorInterface`, `MLPredictor`, `MockPredictor`, etc.) to cleanly isolate ML forecasting from mock logic. | M1.1 | PLANNED |
| 3 | FastAPI API Integration | Update `backend/app.py` or associated routes to load the model, expose `POST /api/v1/predict` returning varying traversal costs for future timestamps. | M1.2 | PLANNED |
| 4 | Programmatic Test & Verification | Create a programmatic verification script querying the endpoint, and run Reviewer, Challenger, and Auditor verification loops. | M1.3 | PLANNED |

## Interface Contracts
### `POST /api/v1/predict`
- Input:
  ```json
  {
    "city_id": "string",
    "start_lat": 40.7831,
    "start_lon": -73.9712,
    "end_lat": 40.7850,
    "end_lon": -73.9700,
    "timestamp": 1780000000.0
  }
  ```
- Output:
  ```json
  {
    "path": {
      "coordinates": [[-73.9712, 40.7831], [-73.9700, 40.7850]],
      "distance_m": 250.0
    },
    "travel_time_sec": 45.2,
    "confidence": 0.85
  }
  ```
