# GeoRoute ML Routing Prediction Analysis Report

This report outlines the code review, requirement research, traffic data simulation model, and scikit-learn model training pipeline design for the predictive routing enhancement of the GeoRoute project.

---

## 1. Codebase Review & Connection Points

We reviewed the current backend codebase structure:
1. **`backend/app.py`**:
   - Built on FastAPI. Exposes basic routes: `/api/v1/cities`, `/api/v1/cities/{city_id}`, and `/api/v1/simulate/{city_id}`.
   - The `/api/v1/simulate/{city_id}` endpoint handles route requests (`RouteRequest` containing `start_lat`, `start_lon`, `end_lat`, `end_lon`, `algorithm`) by querying the `GraphManager` singleton instance.
2. **`backend/graph_manager.py`**:
   - Implements a singleton `GraphManager` that loads city metadata from `data/cities.json`.
   - Manages C++ graph objects (`CSRGraph`) via the `georoute_core` library (loaded lazily from `cpp/build/georoute_core` or falling back to a python mock helper).
   - Computes path coordinates and total distance using `georoute_core.compute_route(...)`.
3. **`backend/georoute_core.py`**:
   - Serves as a Python fallback or mock helper when the compiled C++ extension `georoute_core` (pybind11) is unavailable.
   - Mimics the core types: `Node`, `VisitedNode`, `Path`, `Metrics`, `PathResult`, and `CSRGraph`.
4. **`data/cities.json`**:
   - Contains geographical center coordinates (`lat`, `lon`), zoom level, and binary graph paths (`.graph`) for 16 major global cities (e.g., Manhattan, Paris, Tokyo, Reykjavik, Mumbai).

### Key Integration Points
* **Predictive Route Endpoint**: To satisfy requirement **R1**, we must expose a `POST /api/v1/predict` endpoint. This endpoint will receive geographical coordinates and a future timestamp, compute the optimal route using `GraphManager.compute_route`, and then pass the route features (distance, city, time, weather, location) to a new ML prediction engine.
* **Separation of Concerns (R3)**: The prediction engine should be isolated into a new module `backend/prediction_engine.py` using OOP interfaces, ensuring that neither `app.py` nor the C++ routing module are coupled directly to the underlying scikit-learn model.

---

## 2. ML Routing Prediction Requirements (R1, R3)

### R1. Real Predictive ML Pipeline
* **Objective**: Forecast route traversal times based on future timestamps.
* **Input Parameters**:
  - `city_id` (string)
  - `start_lat`, `start_lon`, `end_lat`, `end_lon` (floats)
  - `timestamp` (float representing epoch time)
* **Output Parameters**:
  - `path`: `{ coordinates: [[lon, lat]], distance_m: float }`
  - `travel_time_sec` (float predicted travel time)
  - `confidence` (float between 0.0 and 1.0)
* **Backend Verification**:
  - Expose `/api/v1/predict`. The returned `travel_time_sec` must vary appropriately when querying different future timestamps (e.g., peak rush hour vs. midnight).
  - Programmatic tests must query the endpoint and check that it returns a valid response.

### R3. Architectural Strictness (OOP/LLD)
* **Goal**: Clear separation of interfaces, domain logic, and ML details.
* **Design Strategy**:
  - Define interfaces for the feature extractor, the model wrapper, and the simulation model.
  - Implement a registry pattern or dependency injection to easily swap regression models (e.g., Random Forest, Gradient Boosting) without changing endpoint logic.

---

## 3. Data Simulation Model Design

To train the machine learning pipeline, we must generate a synthetic historical dataset that mimics realistic traffic patterns for different cities. We design a multi-factor congestion simulation model.

### Mathematical Formulation
Let $T_{base}$ be the base travel time under free-flow conditions:
$$T_{base} = \frac{\text{distance\_m}}{V_{base}}$$
where $V_{base}$ is the default speed limit of the city (e.g., $11.1\text{ m/s}$ or $40\text{ km/h}$ for dense urban cities like Manhattan, and $16.6\text{ m/s}$ or $60\text{ km/h}$ for less dense cities).

The simulated travel time $T_{actual}$ is computed as:
$$T_{actual} = T_{base} \times F_{congestion}(t, d, w, p, c) \times \epsilon$$

where:
1. **$F_{congestion}$** is the total congestion factor.
2. **$\epsilon$** is a random noise factor representing unexpected local traffic anomalies, drawn from a log-normal distribution:
   $$\epsilon \sim \text{Lognormal}(\mu=0, \sigma^2=0.02)$$
   This ensures noise is multiplicative and strictly positive.

#### 1. City Base Factor ($C_{base}$)
Each city has a baseline traffic multiplier representing its default road network load:
* Manhattan: $1.8$
* Paris: $1.5$
* Mumbai: $2.2$
* Reykjavik: $1.0$ (virtually free-flow)
* Zurich: $1.2$

#### 2. Temporal Factor ($T_{factor}(t, d)$)
Models hourly and weekly commutes:
* **Weekdays (Monday to Friday, $d \in [0, 4]$)**:
  - Morning rush (07:30 - 09:30): Multiplier increases up to $+120\%$ ($2.2\times$).
  - Evening rush (16:30 - 18:30): Multiplier increases up to $+150\%$ ($2.5\times$).
  - Mid-day peak (12:00 - 13:30): Moderate bump of $+30\%$ ($1.3\times$).
  - Night (23:00 - 05:00): Multiplier drops to $0.85\times$ (faster than standard limits).
* **Weekends (Saturday and Sunday, $d \in [5, 6]$)**:
  - Afternoon leisure peak (12:00 - 16:00): Bump of $+40\%$ ($1.4\times$).
  - No morning or evening commute peaks.

We model this smoothly using Gaussian mixture kernels:
$$T_{factor}(t, \text{weekday}) = 1.0 + A_{am} \cdot e^{-\frac{(t - 8.5)^2}{2\sigma_{am}^2}} + A_{pm} \cdot e^{-\frac{(t - 17.5)^2}{2\sigma_{pm}^2}}$$

#### 3. Weather Factor ($W_{factor}(w, c)$)
Weather conditions reduce speed and increase delays:
* **Clear**: $1.0\times$
* **Rain**: $+25\%$ ($1.25\times$). In high-monsoon cities like Mumbai, this scales to $+60\%$ ($1.6\times$).
* **Snow**: $+60\%$ ($1.6\times$). In snowy regions like Zurich and Reykjavik, it scales to $+80\%$ ($1.8\times$).
* **Fog**: $+35\%$ ($1.35\times$).

#### 4. Spatial Congestion Proximity ($S_{factor}(p, c)$)
Congestion peaks near the city center and decays exponentially as we move outwards:
$$S_{factor}(p, c) = 1.0 + A_c \cdot e^{-\lambda_c \cdot \text{distance\_from\_center}(p)}$$
* $\text{distance\_from\_center}(p)$ is the great-circle distance (using the Haversine formula) from the route's midpoint $p$ to the city center.
* $A_c$ is the city center congestion amplitude (e.g., $0.6$ for Manhattan, $0.1$ for Reykjavik).
* $\lambda_c$ is the spatial decay rate.

---

## 4. Model Training Pipeline Design

Instead of predicting raw `travel_time_sec` (which is highly dependent on route distance and does not generalize), the model will predict the **dimensionless congestion multiplier**:
$$y = \frac{T_{actual}}{T_{base}}$$

Predicting this multiplier allows the model to capture traffic velocity patterns independently of the route's length, making it robust for new or arbitrary coordinates.

### Feature Engineering
For any route request, the raw features extracted from the inputs and graph are:
1. **`distance_m`**: Path distance in meters.
2. **`midpoint_lat`, `midpoint_lon`**: Center coordinates of the route path.
3. **`dist_from_center_m`**: Midpoint distance to the city center coordinates from `cities.json` (via Haversine).
4. **`hour_sin`, `hour_cos`**: Cyclic encoding of time of day:
   $$\text{hour\_sin} = \sin\left(\frac{2\pi \cdot \text{hour}}{24}\right), \quad \text{hour\_cos} = \cos\left(\frac{2\pi \cdot \text{hour}}{24}\right)$$
5. **`day_sin`, `day_cos`**: Cyclic encoding of day of week:
   $$\text{day\_sin} = \sin\left(\frac{2\pi \cdot \text{day}}{7}\right), \quad \text{day\_cos} = \cos\left(\frac{2\pi \cdot \text{day}}{7}\right)$$
6. **`city_id`**: One-hot encoded.
7. **`weather`**: One-hot encoded (clear, rain, snow, fog).
8. **`season`**: One-hot encoded (winter, spring, summer, fall).

### Machine Learning Algorithm
We recommend a **Random Forest Regressor** or **Gradient Boosting Regressor** (`HistGradientBoostingRegressor`) in scikit-learn:
* **Why**: They handle highly non-linear, interactive features (e.g., `city_id` interacting with `weather` or cyclic hours) extremely well out of the box and do not require scaling of coordinates or distances.
* **Confidence Metric Generation**: Random Forests are composed of independent decision trees. By extracting predictions from each individual estimator, we can compute the standard deviation ($\sigma$) of the predictions:
  $$\sigma = \text{std\_dev}\Big([T_1(x), T_2(x), \dots, T_N(x)]\Big)$$
  We then convert this variance to a confidence score:
  $$\text{confidence} = \frac{1.0}{1.0 + k \cdot \frac{\sigma}{\mu}}$$
  where $\mu$ is the mean predicted multiplier and $k$ is a scaling sensitivity factor. Higher variance among trees indicates unseen/noisy conditions, resulting in a lower confidence score.

---

## 5. Low-Level Design (LLD) & OOP Structure

We propose the following object-oriented layout for `backend/prediction_engine.py`. This design isolates model representation and data preprocessing behind abstract interfaces.

```python
import abc
import numpy as np
from typing import Dict, Any, Tuple, List

class ITrafficModel(abc.ABC):
    """Interface for machine learning predictors."""
    @abc.abstractmethod
    def fit(self, X: np.ndarray, y: np.ndarray) -> None:
        pass

    @abc.abstractmethod
    def predict(self, X: np.ndarray) -> np.ndarray:
        pass

    @abc.abstractmethod
    def predict_with_uncertainty(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Returns (predictions, standard_deviations) for confidence calculation."""
        pass


class RandomForestTrafficModel(ITrafficModel):
    """Random Forest implementation supporting ensemble variance estimation."""
    def __init__(self, n_estimators: int = 100, max_depth: int = 15):
        from sklearn.ensemble import RandomForestRegressor
        self.model = RandomForestRegressor(n_estimators=n_estimators, max_depth=max_depth, random_state=42)

    def fit(self, X: np.ndarray, y: np.ndarray) -> None:
        self.model.fit(X, y)

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict(X)

    def predict_with_uncertainty(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        # Gather predictions from all decision trees
        preds = np.array([dt.predict(X) for dt in self.model.estimators_])
        mean_preds = np.mean(preds, axis=0)
        std_preds = np.std(preds, axis=0)
        return mean_preds, std_preds


class FeatureExtractor:
    """Handles parsing timestamps, coordinate snapping, and categorical encoding."""
    def __init__(self, cities_metadata: Dict[str, Any]):
        self.cities_metadata = cities_metadata

    def calculate_haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        # Distance calculation in meters
        R = 6371000  # Earth radius in meters
        phi1 = np.radians(lat1)
        phi2 = np.radians(lat2)
        dphi = np.radians(lat2 - lat1)
        dlambda = np.radians(lon2 - lon1)
        a = np.sin(dphi/2.0)**2 + np.cos(phi1)*np.cos(phi2)*np.sin(dlambda/2.0)**2
        return 2 * R * np.arctan2(np.sqrt(a), np.sqrt(1 - a))

    def extract(self, city_id: str, distance_m: float, coordinates: List[Tuple[float, float]], timestamp: float, weather: str = "clear") -> Dict[str, Any]:
        from datetime import datetime
        dt = datetime.fromtimestamp(timestamp)
        
        # Calculate route midpoint
        lats = [c[1] for c in coordinates]
        lons = [c[0] for c in coordinates]
        midpoint_lat = np.mean(lats)
        midpoint_lon = np.mean(lons)
        
        # Calculate distance to center
        city_info = self.cities_metadata.get(city_id, {})
        center = city_info.get("center", {"lat": midpoint_lat, "lon": midpoint_lon})
        dist_from_center = self.calculate_haversine(midpoint_lat, midpoint_lon, center["lat"], center["lon"])
        
        # Cyclic time features
        hour = dt.hour + dt.minute / 60.0
        day_of_week = dt.weekday()
        
        # Encode seasons
        month = dt.month
        if month in [12, 1, 2]: season = "winter"
        elif month in [3, 4, 5]: season = "spring"
        elif month in [6, 7, 8]: season = "summer"
        else: season = "autumn"

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


class PredictionEngine:
    """Coordinates route layout, feature extraction, and ML predictions."""
    def __init__(self, model_path: str, cities_metadata: Dict[str, Any]):
        import joblib
        self.model: ITrafficModel = joblib.load(model_path)
        self.extractor = FeatureExtractor(cities_metadata)

    def predict_route(self, city_id: str, distance_m: float, coordinates: List[Tuple[float, float]], timestamp: float, weather: str = "clear") -> Tuple[float, float]:
        features_dict = self.extractor.extract(city_id, distance_m, coordinates, timestamp, weather)
        
        # Format features for model input (requires one-hot encoder transformation if saved inside pipeline)
        # We assume the loaded model is a scikit-learn Pipeline with ColumnTransformer + Regressor.
        input_data = [features_dict]
        
        # Predict travel time factor
        factor_mean, factor_std = self.model.predict_with_uncertainty(input_data)
        
        # Calculate times
        v_base = 11.1 if city_id in ["manhattan", "mumbai", "paris"] else 15.0
        t_base = distance_m / v_base
        travel_time_sec = t_base * factor_mean[0]
        
        # Confidence score
        # standard deviation normalized by mean
        cv = factor_std[0] / max(factor_mean[0], 0.1)
        confidence = float(np.clip(1.0 - 2.0 * cv, 0.0, 1.0))
        
        return float(travel_time_sec), confidence
```

---

## 6. Action Plan & Recommendations

1. **Add Dependencies**: Update `backend/requirements.txt` to include scientific dependencies:
   ```text
   scikit-learn>=1.3.0
   numpy>=1.24.0
   pandas>=2.0.0
   joblib>=1.3.0
   ```
2. **Implement Simulator**: Create a script `backend/data_simulator.py` to generate synthetic logs. The simulator should generate 20,000+ random routes (random start/endSnapped nodes) across the different cities and timestamps covering days and seasons.
3. **Train the Model**: Create a training script `backend/train_model.py` that fits a `Pipeline` consisting of a `ColumnTransformer` (scaling/one-hot encoding) and a `RandomForestRegressor`. Save the trained model to `backend/models/traffic_model.joblib`.
4. **Expose Endpoint**: Integrate the `PredictionEngine` with `backend/app.py`:
   - Initialize the `PredictionEngine` inside `app.py` or `graph_manager.py`.
   - Implement `POST /api/v1/predict` and `GET /api/v1/predict/traffic-density`.
5. **Write Backend Verification Tests**: Create a test script `backend/test_predictions.py` that asserts that querying `/api/v1/predict` at different hours returns different traversal durations and a float-value response.
