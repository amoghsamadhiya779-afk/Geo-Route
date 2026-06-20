# GeoRoute: Prediction Integration & Verification Analysis Report

This report details the integration plan and verification strategy for exposing predictive routing in the GeoRoute backend. Specifically, it addresses the implementation of the `POST /api/v1/predict` endpoint, the logic to generate varying traversal costs based on timestamps, and a programmatic verification suite.

---

## 1. Codebase Review & Integration Strategy

### 1.1 Existing Codebase Architecture
1. **`backend/app.py`**:
   - Built on FastAPI. Exposes static routing simulation via `POST /api/v1/simulate/{city_id}`.
   - Snaps route requests using `GraphManager` and calls C++ `compute_route`.
2. **`backend/graph_manager.py`**:
   - Implements a singleton `GraphManager` that lazy-loads city graphs via `georoute_core`.
3. **`backend/georoute_core.py`**:
   - Fallback Python implementation of core types (e.g., `CSRGraph`, `Node`, `PathResult`) when C++ binary is not compiled.
4. **`data/cities.json`**:
   - List of 16 cities with center coordinates and paths to preprocessed `.graph` binary files.

### 1.2 Decooupled Routing & Prediction Integration
To preserve C++ performance while leveraging Python's ML ecosystem (scikit-learn):
1. **Static Routing (C++)**: Find the shortest distance path coordinates and distance in C++ via `georoute_core.compute_route`.
2. **Dynamic Travel Time Estimation (Python)**: Pass the path coordinates, distance, and target timestamp to the Python `PredictionEngine` in `backend/prediction_engine.py` to compute time under traffic conditions.

---

## 2. Integrating the `POST /api/v1/predict` Endpoint

To implement this, we must:
1. Define a `PredictRequest` schema with `city_id`, `start_lat`, `start_lon`, `end_lat`, `end_lon`, `timestamp` (epoch float), and optional `weather`.
2. Expose the `POST /api/v1/predict` endpoint in `backend/app.py`.
3. Initialize the `PredictionEngine` with a fallback mechanism when the trained ML model (`traffic_model.joblib`) is not present.

### 2.1 Proposed Code Additions in `backend/app.py`

Below is the exact integration code for `backend/app.py`:

```python
# Add imports at top of backend/app.py
import os
from pydantic import BaseModel
from prediction_engine import PredictionEngine

# Existing:
# gm = GraphManager()

# Add: Initialize PredictionEngine with path to model and city metadata
MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "models", "traffic_model.joblib"))
prediction_engine = PredictionEngine(model_path=MODEL_PATH, cities_metadata=gm.cities_metadata)

# Add: Pydantic request model
class PredictRequest(BaseModel):
    city_id: str
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    timestamp: float
    weather: str = "clear"

# Add: FastAPI Endpoint
@app.post("/api/v1/predict")
def predict_route(req: PredictRequest):
    try:
        # 1. Compute optimal distance path using C++ backend
        route_result = gm.compute_route(
            city_id=req.city_id,
            start_lat=req.start_lat,
            start_lon=req.start_lon,
            end_lat=req.end_lat,
            end_lon=req.end_lon,
            algorithm="astar"  # Standard high-performance route finding
        )
        
        path_data = route_result.get("path")
        if not path_data:
            raise HTTPException(status_code=400, detail="Could not compute route between the specified coordinates")
            
        coordinates = path_data.get("coordinates")
        distance_m = path_data.get("distance_m")
        
        # 2. Query prediction engine for travel time and confidence
        travel_time_sec, confidence = prediction_engine.predict_route(
            city_id=req.city_id,
            distance_m=distance_m,
            coordinates=coordinates,
            timestamp=req.timestamp,
            weather=req.weather
        )
        
        # 3. Return interface contract response
        return {
            "path": {
                "coordinates": coordinates,
                "distance_m": distance_m
            },
            "travel_time_sec": travel_time_sec,
            "confidence": confidence
        }
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
```

---

## 3. Designing `backend/prediction_engine.py` (Varying Costs)

To satisfy **R3** (OOP Architecture) and return varying traversal costs based on timestamps, `PredictionEngine` implements a dual-mode behavior:
1. **ML Mode (Inference)**: Uses a `RandomForestRegressor` pipeline loaded from `traffic_model.joblib` (predicting the dimensionless congestion multiplier $T_{actual}/T_{base}$).
2. **Analytical Fallback (Mock Mode)**: Uses a deterministic mathematical formula simulating rush hours, weekends, weather, and proximity to city center. This allows immediate testing without requiring prior model training.

### 3.1 Proposed Implementation of `backend/prediction_engine.py`

```python
import os
import joblib
import numpy as np
from datetime import datetime
from typing import Dict, Any, Tuple, List

class PredictionEngine:
    def __init__(self, model_path: str = None, cities_metadata: Dict[str, Any] = None):
        self.cities_metadata = cities_metadata or {}
        self.model = None
        self.model_path = model_path
        
        # Safe loading to support both ML and analytical fallback mode
        if model_path and os.path.exists(model_path):
            try:
                self.model = joblib.load(model_path)
                print(f"PredictionEngine: Loaded ML model from {model_path}")
            except Exception as e:
                print(f"Warning: Failed to load ML model: {e}. Falling back to analytical model.")
        else:
            print("PredictionEngine: ML model not found. Using analytical mock prediction.")

    def calculate_haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Great-circle distance in meters between two lat/lon coordinates."""
        R = 6371000  # Earth's radius in meters
        phi1 = np.radians(lat1)
        phi2 = np.radians(lat2)
        dphi = np.radians(lat2 - lat1)
        dlambda = np.radians(lon2 - lon1)
        a = np.sin(dphi / 2.0)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2.0)**2
        return 2 * R * np.arctan2(np.sqrt(a), np.sqrt(1 - a))

    def _get_analytical_multiplier(self, city_id: str, midpoint_lat: float, midpoint_lon: float, dt: datetime, weather: str = "clear") -> Tuple[float, float]:
        """
        Calculates a deterministic congestion factor and prediction confidence based on:
        - Hour of day (peaks at morning/evening commutes)
        - Day of week (weekdays vs weekends)
        - City baseline load (e.g. Manhattan = 1.8x, Reykjavik = 1.0x)
        - Center proximity (exponential decay from center coords)
        - Weather conditions (rain, snow, fog)
        """
        hour = dt.hour + dt.minute / 60.0
        weekday = dt.weekday()
        is_weekend = weekday >= 5

        # 1. City baseline traffic factor
        city_baselines = {
            "manhattan": 1.8,
            "paris": 1.5,
            "mumbai": 2.2,
            "reykjavik": 1.0,
            "zurich": 1.2,
            "tokyo": 1.6,
            "london": 1.5,
            "singapore": 1.4,
            "dubai": 1.3,
            "sydney": 1.3
        }
        c_base = city_baselines.get(city_id, 1.3)

        # 2. Temporal Factor (rush hours)
        t_factor = 1.0
        if not is_weekend:
            # Weekday peaks: Morning Rush (8:30 AM), Evening Rush (5:30 PM), Mid-day bump
            am_peak = 1.2 * np.exp(-((hour - 8.5) ** 2) / (2 * 1.0 ** 2))
            pm_peak = 1.5 * np.exp(-((hour - 17.5) ** 2) / (2 * 1.2 ** 2))
            midday_peak = 0.3 * np.exp(-((hour - 12.5) ** 2) / (2 * 0.8 ** 2))
            night_dip = -0.15 if (hour < 5 or hour > 23) else 0.0
            t_factor += am_peak + pm_peak + midday_peak + night_dip
        else:
            # Weekend peak: Afternoon leisure traffic (2:00 PM)
            aft_peak = 0.4 * np.exp(-((hour - 14.0) ** 2) / (2 * 2.0 ** 2))
            t_factor += aft_peak

        # 3. Spatial Factor (decay from center)
        s_factor = 1.0
        city_info = self.cities_metadata.get(city_id)
        if city_info and "center" in city_info:
            center = city_info["center"]
            dist_from_center = self.calculate_haversine(midpoint_lat, midpoint_lon, center["lat"], center["lon"])
            # Decay scale = 5km
            s_factor += 0.6 * np.exp(-dist_from_center / 5000.0)

        # 4. Weather Factor
        w_factor = 1.0
        if weather == "rain":
            w_factor = 1.25
        elif weather == "snow":
            w_factor = 1.50
        elif weather == "fog":
            w_factor = 1.30

        congestion_factor = c_base * t_factor * s_factor * w_factor
        
        # Volatility maps to lower confidence during peak rush hours and adverse weather
        volatility = 0.0
        if not is_weekend:
            volatility += 0.1 * np.exp(-((hour - 8.5) ** 2) / (2 * 1.0 ** 2))
            volatility += 0.1 * np.exp(-((hour - 17.5) ** 2) / (2 * 1.2 ** 2))
        if weather != "clear":
            volatility += 0.1
            
        confidence = float(np.clip(0.95 - volatility, 0.5, 0.98))
        return float(congestion_factor), confidence

    def predict_route(self, city_id: str, distance_m: float, coordinates: List[List[float]], timestamp: float, weather: str = "clear") -> Tuple[float, float]:
        """
        Exposes route travel time prediction.
        coordinates: list of [lon, lat] points (GeoJSON format).
        """
        if not coordinates:
            raise ValueError("Coordinates list cannot be empty")

        dt = datetime.fromtimestamp(timestamp)
        lons = [c[0] for c in coordinates]
        lats = [c[1] for c in coordinates]
        midpoint_lat = float(np.mean(lats))
        midpoint_lon = float(np.mean(lons))

        # Establish city-specific free-flow base speed
        dense_cities = {"manhattan", "paris", "london", "tokyo", "mumbai"}
        v_base = 10.0 if city_id in dense_cities else 15.0  # m/s
        t_base = distance_m / v_base

        # ML Model Mode
        if self.model:
            try:
                city_info = self.cities_metadata.get(city_id, {})
                center = city_info.get("center", {"lat": midpoint_lat, "lon": midpoint_lon})
                dist_from_center = self.calculate_haversine(midpoint_lat, midpoint_lon, center["lat"], center["lon"])
                
                hour = dt.hour + dt.minute / 60.0
                day_of_week = dt.weekday()
                month = dt.month
                season = "winter" if month in [12, 1, 2] else "spring" if month in [3, 4, 5] else "summer" if month in [6, 7, 8] else "autumn"

                feature_dict = {
                    "distance_m": distance_m,
                    "dist_from_center_m": dist_from_center,
                    "hour_sin": np.sin(2 * np.pi * hour / 24.0),
                    "hour_cos": np.cos(2 * np.pi * hour / 24.0),
                    "day_sin": np.sin(2 * np.pi * day_of_week / 7.0),
                    "day_cos": np.cos(2 * np.pi * day_of_week / 7.0),
                    "city_id": city_id,
                    "weather": weather,
                    "season": season
                }

                # Evaluate using Pipeline's predict
                if hasattr(self.model, "estimators_"):
                    # Calculate variance for confidence
                    preds = np.array([dt_est.predict([list(feature_dict.values())]) for dt_est in self.model.estimators_])
                    factor_mean = float(np.mean(preds))
                    factor_std = float(np.std(preds))
                    cv = factor_std / max(factor_mean, 0.1)
                    confidence = float(np.clip(1.0 - 2.0 * cv, 0.0, 1.0))
                else:
                    factor_mean = float(self.model.predict([feature_dict])[0])
                    confidence = 0.85

                return t_base * factor_mean, confidence

            except Exception as e:
                print(f"Error during ML inference: {e}. Falling back to analytical model.")

        # Analytical Fallback Mode
        congestion_factor, confidence = self._get_analytical_multiplier(city_id, midpoint_lat, midpoint_lon, dt, weather)
        return t_base * congestion_factor, confidence
```

---

## 4. Verification Strategy & Test Suite

### 4.1 Verification Principles
To ensure correctness, robustness, and performance of the predictive routing system, the verification strategy should:
1. **Validate API Schemas**: Check input fields (type, presence, snapping errors) and output structure against the contract.
2. **Verify Cost Variation**: Query the same route with different timestamps (midnight vs. morning peak vs. evening peak) and assert that traffic multipliers represent rush hours:
   $$T_{\text{evening\_rush\_hour}} > T_{\text{morning\_rush\_hour}} > T_{\text{midnight}}$$
3. **Verify Weather Degradation**: Query with `clear`, `rain`, and `snow` and assert that traversal times increase monotonically with adverse weather.
4. **Assert Safe Fallbacks**: Verify that when the ML model is not present, the analytical model kicks in and responds dynamically (no crashes).

### 4.2 Programmatic Test Script (`backend/tests/test_predictions.py`)

This test script is designed to be co-located with tests and can be executed via `pytest backend/tests/test_predictions.py` or run directly with python. It uses FastAPI's `TestClient` for in-memory integration testing.

```python
import sys
import os
from datetime import datetime
import pytest

# Ensure backend directory is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_predict_endpoint_contract():
    """Verify that the predict endpoint returns the correct JSON structure."""
    payload = {
        "city_id": "manhattan",
        "start_lat": 40.7831,
        "start_lon": -73.9712,
        "end_lat": 40.7850,
        "end_lon": -73.9700,
        "timestamp": 1780000000.0,  # Epoch float
        "weather": "clear"
    }
    
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 200, f"Failed: {response.text}"
    
    data = response.json()
    assert "path" in data
    assert "coordinates" in data["path"]
    assert "distance_m" in data["path"]
    assert "travel_time_sec" in data
    assert "confidence" in data
    
    # Assert correct types
    assert isinstance(data["path"]["coordinates"], list)
    assert len(data["path"]["coordinates"]) > 0
    assert isinstance(data["path"]["distance_m"], (int, float))
    assert isinstance(data["travel_time_sec"], (int, float))
    assert isinstance(data["confidence"], (int, float))
    assert 0.0 <= data["confidence"] <= 1.0

def test_varying_costs_with_timestamp():
    """Verify that different timestamps yield varying travel times representing commutes."""
    # June 22, 2026 is a Monday (weekday)
    dt_midnight = datetime(2026, 6, 22, 2, 0, 0)
    ts_midnight = dt_midnight.timestamp()
    
    dt_am_rush = datetime(2026, 6, 22, 8, 30, 0)
    ts_am_rush = dt_am_rush.timestamp()
    
    dt_pm_rush = datetime(2026, 6, 22, 17, 30, 0)
    ts_pm_rush = dt_pm_rush.timestamp()
    
    payload = {
        "city_id": "manhattan",
        "start_lat": 40.7831,
        "start_lon": -73.9712,
        "end_lat": 40.7850,
        "end_lon": -73.9700,
        "weather": "clear"
    }
    
    # 1. Midnight Query
    payload["timestamp"] = ts_midnight
    res_midnight = client.post("/api/v1/predict", json=payload).json()
    time_midnight = res_midnight["travel_time_sec"]
    
    # 2. Morning Rush Query
    payload["timestamp"] = ts_am_rush
    res_am = client.post("/api/v1/predict", json=payload).json()
    time_am = res_am["travel_time_sec"]
    
    # 3. Evening Rush Query
    payload["timestamp"] = ts_pm_rush
    res_pm = client.post("/api/v1/predict", json=payload).json()
    time_pm = res_pm["travel_time_sec"]
    
    print(f"\n[Test Output] Midnight: {time_midnight:.2f}s | AM Rush: {time_am:.2f}s | PM Rush: {time_pm:.2f}s")
    
    # Assertions: Traffic density peaks correctly during rush hour
    assert time_am > time_midnight, "Morning rush hour should be slower than midnight."
    assert time_pm > time_am, "Evening rush hour (5:30 PM) is historically slower than AM rush hour (8:30 AM)."

def test_weather_impact():
    """Verify that weather affects travel times monotonically."""
    dt = datetime(2026, 6, 22, 10, 0, 0)
    ts = dt.timestamp()
    
    payload = {
        "city_id": "manhattan",
        "start_lat": 40.7831,
        "start_lon": -73.9712,
        "end_lat": 40.7850,
        "end_lon": -73.9700,
        "timestamp": ts,
        "weather": "clear"
    }
    
    time_clear = client.post("/api/v1/predict", json=payload).json()["travel_time_sec"]
    
    payload["weather"] = "rain"
    time_rain = client.post("/api/v1/predict", json=payload).json()["travel_time_sec"]
    
    payload["weather"] = "snow"
    time_snow = client.post("/api/v1/predict", json=payload).json()["travel_time_sec"]
    
    print(f"\n[Test Output] Weather Clear: {time_clear:.2f}s | Rain: {time_rain:.2f}s | Snow: {time_snow:.2f}s")
    
    assert time_rain > time_clear, "Rain should slow down traversal."
    assert time_snow > time_rain, "Snow should slow down traversal more than rain."

def test_invalid_city():
    """Verify that querying a city not in metadata returns 400."""
    payload = {
        "city_id": "unknown_city",
        "start_lat": 40.7831,
        "start_lon": -73.9712,
        "end_lat": 40.7850,
        "end_lon": -73.9700,
        "timestamp": 1780000000.0,
        "weather": "clear"
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 400

if __name__ == "__main__":
    import unittest
    # If run directly as a python script, run pytest programmatically
    sys.exit(pytest.main([__file__, "-v", "-s"]))
```

---

## 5. Key Recommendations & Dependencies

To implement these changes without build or import errors, the team must execute these actions:
1. **Update `backend/requirements.txt`**: Add the core ML and data processing packages:
   ```text
   scikit-learn>=1.3.0
   numpy>=1.24.0
   pandas>=2.0.0
   joblib>=1.3.0
   pytest>=7.4.0
   ```
2. **Co-locate Tests**: Place the test script in `backend/tests/test_predictions.py` as mandated by `PROJECT.md` layout standards.
3. **Pre-load Configuration**: Put model training and simulator script outputs inside a new directory `backend/models/` and configure git to ignore large joblib objects while tracking model metadata.
