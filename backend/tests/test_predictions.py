import sys
import os
from datetime import datetime
import pytest

# Ensure backend directory is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app import app
from prediction_engine import MockPredictor, PredictorFactory

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
    assert time_pm > time_am, "Evening rush hour (5:30 PM) should be slower than AM rush hour (8:30 AM)."


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
    """Verify that querying a city not in metadata returns 400 for prediction."""
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


def test_traffic_density_endpoint():
    """Verify that the traffic density endpoint returns a grid of densities."""
    response = client.get("/api/v1/predict/traffic-density?city_id=manhattan&timestamp=1780000000.0")
    assert response.status_code == 200
    
    data = response.json()
    assert "traffic_density" in data
    assert isinstance(data["traffic_density"], list)
    assert len(data["traffic_density"]) == 25  # 5x5 grid
    
    for item in data["traffic_density"]:
        assert "lat" in item
        assert "lon" in item
        assert "density" in item
        assert isinstance(item["lat"], float)
        assert isinstance(item["lon"], float)
        assert isinstance(item["density"], float)
        assert 0.0 <= item["density"] <= 100.0


def test_traffic_density_invalid_city():
    """Verify that traffic density for an unknown city returns 404."""
    response = client.get("/api/v1/predict/traffic-density?city_id=unknown_city&timestamp=1780000000.0")
    assert response.status_code == 404


def test_predictor_factory_force_mock():
    """Verify that PredictorFactory can force the MockPredictor strategy."""
    from app import gm
    predictor = PredictorFactory.create_predictor(
        model_path="dummy_path.joblib",
        cities_metadata=gm.cities_metadata,
        force_mock=True
    )
    assert isinstance(predictor, MockPredictor)


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v", "-s"]))
