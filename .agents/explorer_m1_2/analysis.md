# GeoRoute OOP LLD Architecture Analysis: Prediction vs Mocking Logic Separation

This report proposes a clean, production-grade Low-Level Design (LLD) using Object-Oriented Programming (OOP) patterns to separate the machine learning prediction logic and mock/fallback simulation logic for the GeoRoute predictive routing backend.

---

## 1. Context & Architectural Goals

The GeoRoute project is introducing a predictive routing capability (**Milestone 1**):
1. **`POST /api/v1/predict`**: Computes static routing coordinates via the C++ extension (`georoute_core`) and queries a Python predictor to estimate the travel time (including traffic/congestion) and a prediction confidence score for a future timestamp.
2. **`GET /api/v1/predict/traffic-density`**: Queries traffic congestion density hotspots for a city at a future timestamp.

### Key Architectural Challenges (R3)
* **Separation of Concerns**: Endpoint handlers (`app.py`) and graph loaders (`graph_manager.py`) should not be coupled to the underlying machine learning framework (`scikit-learn`, `pandas`, `joblib`).
* **Environment Independence / Fallback**: A trained ML model (`traffic_model.joblib`) or the scientific library dependencies may not be present in every environment (e.g., frontend developer local environment). The server must boot up and run dynamically using analytical mock equations.
* **Open/Closed Principle**: We must be able to swap out predictors (e.g., Random Forest Regressor, Gradient Boosting, Historical Averages, Deep Learning) without modifying FastAPI endpoint logic or C++ wrappers.

---

## 2. Proposed OOP LLD Architecture

We propose introducing a **Strategy Pattern** paired with a **Simple Factory** to decouple prediction implementation from API endpoints and graph management.

### Class Diagram / Structure

```
                     +---------------------------+
                     |    PredictorInterface     | <-------------------------+
                     +---------------------------+                           |
                     | + predict_route(...)      |                           |
                     | + predict_traffic_density |                           |
                     +---------------------------+                           |
                                   ^                                         |
                                   |                                         |
            +----------------------+----------------------+                  |
            |                                             |                  |
+---------------------------+                 +---------------------------+  |
|       MockPredictor       |                 |        MLPredictor        |  |
+---------------------------+                 +---------------------------+  |
| - cities_metadata         |                 | - model_path              |  |
|                           |                 | - feature_extractor       |  |
| + predict_route(...)      |                 | - model                   |  |
| + predict_traffic_density |                 |                           |  |
+---------------------------+                 | + predict_route(...)      |  |
                                              | + predict_traffic_density |  |
                                              +---------------------------+  |
                                                            |                |
                                                            v                |
                                              +---------------------------+  |
                                              |     FeatureExtractor      |  |
                                              +---------------------------+  |
                                              | + extract(...)            |  |
                                              +---------------------------+  |
                                                                             |
                                                                             |
                     +---------------------------+                           |
                     |     PredictorFactory      |                           |
                     +---------------------------+                           |
                     | + create_predictor(...)   | --------------------------+
                     +---------------------------+
```

---

## 3. Component Details & Code Skeletons

To implement this design, we propose creating `backend/prediction_engine.py` containing the following interfaces, classes, and signatures.

### 3.1. `PredictorInterface` (Abstract Base Class)

```python
import abc
from typing import Dict, Any, Tuple, List

class PredictorInterface(abc.ABC):
    """
    Abstract Base Class defining the contract for all traffic prediction engines.
    This encapsulates travel time forecasting and traffic density querying.
    """
    
    @abc.abstractmethod
    def predict_route(
        self,
        city_id: str,
        distance_m: float,
        coordinates: List[List[float]],
        timestamp: float,
        weather: str = "clear"
    ) -> Tuple[float, float]:
        """
        Predict travel time and confidence for a static route path.
        
        Args:
            city_id: The identifier of the city (e.g., 'manhattan').
            distance_m: The total path distance in meters.
            coordinates: GeoJSON coordinates [[lon, lat], ...] representing the path.
            timestamp: Epoch float representing the target time.
            weather: The weather condition (e.g., 'clear', 'rain', 'snow', 'fog').
            
        Returns:
            Tuple[float, float]: (travel_time_sec, confidence_score)
                                 where confidence_score is between 0.0 and 1.0.
        """
        pass

    @abc.abstractmethod
    def predict_traffic_density(
        self,
        city_id: str,
        timestamp: float
    ) -> List[Dict[str, float]]:
        """
        Predict dynamic traffic density hotspots for visualization.
        
        Args:
            city_id: The identifier of the city.
            timestamp: Epoch float representing the target time.
            
        Returns:
            List[Dict[str, float]]: List of coordinate density mappings:
                                     [{"lat": float, "lon": float, "density": float}]
        """
        pass
```

### 3.2. `MockPredictor` (Analytical Fallback)

The `MockPredictor` implements the interface without importing heavy libraries (`scikit-learn`, `pandas`). It calculates values using mathematical formulas:

```python
import numpy as np
from datetime import datetime

class MockPredictor(PredictorInterface):
    """
    Analytical mock predictor that computes deterministic travel times and
    traffic densities using mathematical traffic models (temporal, spatial, weather).
    Does NOT require a pre-trained model file or scikit-learn.
    """
    
    def __init__(self, cities_metadata: Dict[str, Any]):
        self.cities_metadata = cities_metadata
        # Baseline traffic load mapping per city
        self.city_baselines = {
            "manhattan": 1.8, "paris": 1.5, "mumbai": 2.2,
            "reykjavik": 1.0, "zurich": 1.2, "tokyo": 1.6,
            "london": 1.5, "singapore": 1.4, "dubai": 1.3,
            "sydney": 1.3
        }

    def _calculate_haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Great-circle distance in meters between two lat/lon coordinates."""
        R = 6371000  # Earth's radius in meters
        phi1, phi2 = np.radians(lat1), np.radians(lat2)
        dphi = np.radians(lat2 - lat1)
        dlambda = np.radians(lon2 - lon1)
        a = np.sin(dphi / 2.0)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2.0)**2
        return 2 * R * np.arctan2(np.sqrt(a), np.sqrt(1 - a))

    def _get_analytical_multiplier(
        self, 
        city_id: str, 
        midpoint_lat: float, 
        midpoint_lon: float, 
        dt: datetime, 
        weather: str
    ) -> Tuple[float, float]:
        """Calculates dynamic congestion factor and prediction confidence."""
        hour = dt.hour + dt.minute / 60.0
        weekday = dt.weekday()
        is_weekend = weekday >= 5

        # 1. City baseline traffic factor
        c_base = self.city_baselines.get(city_id, 1.3)

        # 2. Temporal Factor (rush hours vs leisure peaks)
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

        # 3. Spatial Factor (decay outward from center)
        s_factor = 1.0
        city_info = self.cities_metadata.get(city_id)
        if city_info and "center" in city_info:
            center = city_info["center"]
            dist = self._calculate_haversine(midpoint_lat, midpoint_lon, center["lat"], center["lon"])
            s_factor += 0.6 * np.exp(-dist / 5000.0) # Decay scale = 5km

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

    def predict_route(
        self,
        city_id: str,
        distance_m: float,
        coordinates: List[List[float]],
        timestamp: float,
        weather: str = "clear"
    ) -> Tuple[float, float]:
        if not coordinates:
            raise ValueError("Coordinates list cannot be empty")
            
        dt = datetime.fromtimestamp(timestamp)
        lons = [c[0] for c in coordinates]
        lats = [c[1] for c in coordinates]
        midpoint_lat = float(np.mean(lats))
        midpoint_lon = float(np.mean(lons))

        # Free-flow base speed (m/s)
        dense_cities = {"manhattan", "paris", "london", "tokyo", "mumbai"}
        v_base = 10.0 if city_id in dense_cities else 15.0
        t_base = distance_m / v_base

        congestion_factor, confidence = self._get_analytical_multiplier(
            city_id, midpoint_lat, midpoint_lon, dt, weather
        )
        return float(t_base * congestion_factor), confidence

    def predict_traffic_density(
        self,
        city_id: str,
        timestamp: float
    ) -> List[Dict[str, float]]:
        city_info = self.cities_metadata.get(city_id)
        if not city_info or "center" not in city_info:
            return []

        center = city_info["center"]
        dt = datetime.fromtimestamp(timestamp)
        
        # Calculate dynamic peak density multiplier
        hour = dt.hour + dt.minute / 60.0
        weekday = dt.weekday()
        is_weekend = weekday >= 5
        
        density_multiplier = 1.0
        if not is_weekend:
            # Morning/Evening weekday commute peaks
            density_multiplier += 1.5 * np.exp(-((hour - 8.5) ** 2) / (2 * 1.0 ** 2))
            density_multiplier += 1.8 * np.exp(-((hour - 17.5) ** 2) / (2 * 1.2 ** 2))
        else:
            density_multiplier += 0.8 * np.exp(-((hour - 14.0) ** 2) / (2 * 2.0 ** 2))
            
        # Generate grid of points around the city center representing dynamic congestion density
        density_points = []
        grid_size = 5 # 5x5 grid
        lat_step = 0.015
        lon_step = 0.015
        
        for i in range(-grid_size // 2 + 1, grid_size // 2 + 1):
            for j in range(-grid_size // 2 + 1, grid_size // 2 + 1):
                pt_lat = center["lat"] + i * lat_step
                pt_lon = center["lon"] + j * lon_step
                
                # Center point is most dense, decays outwards
                distance = self._calculate_haversine(pt_lat, pt_lon, center["lat"], center["lon"])
                base_density = 80.0 * np.exp(-distance / 3000.0) # Decay over 3km
                
                # Apply dynamic temporal factor + noise
                final_density = np.clip(base_density * density_multiplier + np.random.uniform(-5.0, 5.0), 0.0, 100.0)
                
                density_points.append({
                    "lat": float(pt_lat),
                    "lon": float(pt_lon),
                    "density": float(final_density)
                })
                
        return density_points
```

### 3.3. `MLPredictor` (Real Inference Engine)

The `MLPredictor` encapsulates model files and feature extraction. If the model supports uncertainty (e.g. ensemble regression trees), it calculates the standard deviation across estimators to derive confidence:

```python
import os
from typing import List, Tuple, Dict, Any

class MLPredictor(PredictorInterface):
    """
    Predictor implementation that loads a trained scikit-learn model pipeline
    (e.g., joblib serialization) and runs live inference on feature-engineered routes.
    """
    
    def __init__(self, model_path: str, cities_metadata: Dict[str, Any]):
        self.model_path = model_path
        self.cities_metadata = cities_metadata
        self.extractor = FeatureExtractor(cities_metadata)
        self.model = self._load_model()
        
        # Dense vs non-dense city velocities for base travel time
        self.dense_cities = {"manhattan", "paris", "london", "tokyo", "mumbai"}

    def _load_model(self) -> Any:
        import joblib
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model file not found at {self.model_path}")
        return joblib.load(self.model_path)

    def predict_route(
        self,
        city_id: str,
        distance_m: float,
        coordinates: List[List[float]],
        timestamp: float,
        weather: str = "clear"
    ) -> Tuple[float, float]:
        if not coordinates:
            raise ValueError("Coordinates list cannot be empty")

        # 1. Feature extraction
        features = self.extractor.extract(city_id, distance_m, coordinates, timestamp, weather)
        
        # 2. Base Speed travel time calculation
        v_base = 10.0 if city_id in self.dense_cities else 15.0
        t_base = distance_m / v_base
        
        # 3. Model Inference (predicts dimensionless congestion multiplier)
        # We handle Random Forest Regressor tree uncertainty if available
        # The model is assumed to be a scikit-learn Pipeline containing preprocessing and regressor
        regressor = self.model
        if hasattr(self.model, "named_steps"):
            regressor = self.model.named_steps.get("regressor", self.model)

        if hasattr(regressor, "estimators_"):
            # Execute Pipeline preprocessing step on raw features dictionary
            preprocessor = self.model.named_steps["preprocessor"]
            transformed_x = preprocessor.transform([features])
            
            # Predict across all individual estimator trees
            preds = np.array([dt.predict(transformed_x) for dt in regressor.estimators_])
            factor_mean = float(np.mean(preds))
            factor_std = float(np.std(preds))
            
            # Confidence calculated from Coefficient of Variation (CV)
            cv = factor_std / max(factor_mean, 0.1)
            confidence = float(np.clip(1.0 - 2.0 * cv, 0.0, 1.0))
        else:
            # Fallback for models without ensemble trees
            factor_mean = float(self.model.predict([features])[0])
            confidence = 0.85

        predicted_time_sec = t_base * factor_mean
        return predicted_time_sec, confidence

    def predict_traffic_density(
        self,
        city_id: str,
        timestamp: float
    ) -> List[Dict[str, float]]:
        # For city-wide heatmaps, running individual route coordinates is resource-heavy.
        # Thus, we delegate density grid math to the analytical simulator model.
        analytical = MockPredictor(self.cities_metadata)
        return analytical.predict_traffic_density(city_id, timestamp)
```

### 3.4. `FeatureExtractor`

Helper class to isolate dataset construction logic from the model inference process:

```python
import numpy as np
from datetime import datetime

class FeatureExtractor:
    """
    Handles extracting tabular features from request coordinates, timestamps, 
    and city metadata into the model's expected column schema.
    """
    
    def __init__(self, cities_metadata: Dict[str, Any]):
        self.cities_metadata = cities_metadata

    def _calculate_haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371000
        phi1, phi2 = np.radians(lat1), np.radians(lat2)
        dphi = np.radians(lat2 - lat1)
        dlambda = np.radians(lon2 - lon1)
        a = np.sin(dphi / 2.0)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2.0)**2
        return 2 * R * np.arctan2(np.sqrt(a), np.sqrt(1 - a))

    def extract(
        self, 
        city_id: str, 
        distance_m: float, 
        coordinates: List[List[float]], 
        timestamp: float, 
        weather: str
    ) -> Dict[str, Any]:
        dt = datetime.fromtimestamp(timestamp)
        
        # Midpoint of coordinates
        lons = [c[0] for c in coordinates]
        lats = [c[1] for c in coordinates]
        midpoint_lat = float(np.mean(lats))
        midpoint_lon = float(np.mean(lons))
        
        # Midpoint distance to city center
        city_info = self.cities_metadata.get(city_id, {})
        center = city_info.get("center", {"lat": midpoint_lat, "lon": midpoint_lon})
        dist_from_center = self._calculate_haversine(midpoint_lat, midpoint_lon, center["lat"], center["lon"])
        
        # Time variables
        hour = dt.hour + dt.minute / 60.0
        day_of_week = dt.weekday()
        month = dt.month
        
        # Season categoricals
        if month in [12, 1, 2]: season = "winter"
        elif month in [3, 4, 5]: season = "spring"
        elif month in [6, 7, 8]: season = "summer"
        else: season = "autumn"
        
        # Tabular representation matching training pipeline features
        return {
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
```

### 3.5. `PredictorFactory`

Implements dynamic initialization and fallback handling. It isolates environment configuration:

```python
import os

class PredictorFactory:
    """
    Simple Factory to construct instances of PredictorInterface.
    Performs verification of ML model existence and library imports, falling back
    gracefully to MockPredictor when dependencies are missing.
    """
    
    @staticmethod
    def create_predictor(
        model_path: str,
        cities_metadata: Dict[str, Any],
        force_mock: bool = False
    ) -> PredictorInterface:
        """
        Instantiate the appropriate predictor.
        
        Args:
            model_path: Absolute filesystem path to the serialization joblib file.
            cities_metadata: Dictionary metadata containing city centers.
            force_mock: If True, bypasses ML loading and forces MockPredictor.
            
        Returns:
            PredictorInterface: Polmorphic instance of MLPredictor or MockPredictor.
        """
        if force_mock:
            print("[PredictorFactory] Forcing MockPredictor strategy.")
            return MockPredictor(cities_metadata)

        # Check if serialized model exists
        if os.path.exists(model_path):
            try:
                # Attempt to import dependencies lazily
                import sklearn
                import joblib
                
                predictor = MLPredictor(model_path, cities_metadata)
                print(f"[PredictorFactory] Loaded MLPredictor successfully from: {model_path}")
                return predictor
                
            except ImportError:
                print("[PredictorFactory] scikit-learn/joblib not installed. Falling back to MockPredictor.")
            except Exception as e:
                print(f"[PredictorFactory] Failed to load model file ({e}). Falling back to MockPredictor.")
        else:
            print(f"[PredictorFactory] Model file '{model_path}' not found. Falling back to MockPredictor.")

        return MockPredictor(cities_metadata)
```

---

## 4. Integration with `backend/app.py`

FastAPI consumes `PredictorInterface` using dependency injection. The server doesn't know which class does the prediction:

```python
# Insert at top of backend/app.py
import os
from pydantic import BaseModel
from prediction_engine import PredictorFactory

# Request Schemas
class PredictRequest(BaseModel):
    city_id: str
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    timestamp: float
    weather: str = "clear"

# Initialize Predictor Polymorphically
MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "models", "traffic_model.joblib"))
predictor = PredictorFactory.create_predictor(model_path=MODEL_PATH, cities_metadata=gm.cities_metadata)

@app.post("/api/v1/predict")
def predict_route(req: PredictRequest):
    try:
        # 1. Compute path via static C++ routing core
        route_result = gm.compute_route(
            city_id=req.city_id,
            start_lat=req.start_lat,
            start_lon=req.start_lon,
            end_lat=req.end_lat,
            end_lon=req.end_lon,
            algorithm="astar"
        )
        
        path_data = route_result.get("path")
        if not path_data:
            raise HTTPException(status_code=400, detail="Unable to compute route path coordinates.")
            
        coordinates = path_data.get("coordinates")
        distance_m = path_data.get("distance_m")
        
        # 2. Polymorphic Predictor Query
        travel_time_sec, confidence = predictor.predict_route(
            city_id=req.city_id,
            distance_m=distance_m,
            coordinates=coordinates,
            timestamp=req.timestamp,
            weather=req.weather
        )
        
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
        raise HTTPException(status_code=500, detail=f"Inference/simulation failed: {str(e)}")

@app.get("/api/v1/predict/traffic-density")
def get_traffic_density(city_id: str, timestamp: float):
    try:
        # Validate city_id
        if not gm.get_city_info(city_id):
            raise HTTPException(status_code=404, detail="City not found in metadata.")
            
        # Polymorphic Traffic Density query
        density_data = predictor.predict_traffic_density(city_id=city_id, timestamp=timestamp)
        return {
            "traffic_density": density_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 5. Architectural Evaluation against SOLID Principles

The proposed design adheres strictly to SOLID and Object-Oriented LLD principles:

1. **Single Responsibility Principle (SRP)**:
   * `PredictorInterface` defines the scope of prediction.
   * `MLPredictor` is responsible only for feeding features into the trained machine learning pipeline and analyzing ensemble results.
   * `MockPredictor` is responsible only for evaluating analytical traffic equations.
   * `FeatureExtractor` has the sole responsibility of engineering raw route requests into structured ML inputs.
   * `PredictorFactory` has the sole responsibility of assessing file and module availability and selecting the concrete strategy.
2. **Open/Closed Principle (OCP)**:
   * The API endpoint and routing manager are closed to modification when new predictive strategies (e.g. `DeepLearningPredictor` or `HistoricalAveragePredictor`) are introduced. We simply implement `PredictorInterface` and adjust the `PredictorFactory` instantiation logic.
3. **Liskov Substitution Principle (LSP)**:
   * `MLPredictor` and `MockPredictor` are perfectly substitutable for each other. They share the same interface contract, arguments, and return types, ensuring that the FastAPI application operates identical code paths in both modes.
4. **Interface Segregation Principle (ISP)**:
   * The interface is clean, concise, and focused strictly on prediction capabilities (`predict_route` and `predict_traffic_density`), avoiding pollution from training or database logic.
5. **Dependency Inversion Principle (DIP)**:
   * The web application `app.py` depends on the abstraction (`PredictorInterface`) rather than details (`MLPredictor` or `MockPredictor`).
