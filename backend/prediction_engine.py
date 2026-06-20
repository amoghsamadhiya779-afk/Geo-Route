import os
import abc
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, Any, Tuple, List
from utils.math_utils import calculate_haversine

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
        
        Returns:
            Tuple[float, float]: (travel_time_sec, confidence_score)
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
        
        Returns:
            List[Dict[str, float]]: [{"lat": float, "lon": float, "density": float}]
        """
        pass


class FeatureExtractor:
    """
    Handles extracting tabular features from request coordinates, timestamps, 
    and city metadata into the model's expected column schema.
    """
    
    def __init__(self, cities_metadata: Dict[str, Any]):
        self.cities_metadata = cities_metadata

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
        dist_from_center = calculate_haversine(midpoint_lat, midpoint_lon, center["lat"], center["lon"])
        
        # Time variables
        hour = dt.hour + dt.minute / 60.0
        day_of_week = dt.weekday()
        month = dt.month
        
        # Season categoricals
        if month in [12, 1, 2]: 
            season = "winter"
        elif month in [3, 4, 5]: 
            season = "spring"
        elif month in [6, 7, 8]: 
            season = "summer"
        else: 
            season = "autumn"
        
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
            "sydney": 1.3, "bali": 1.1, "rio": 1.4,
            "cape_town": 1.3, "delhi": 1.8, "hyderabad": 1.5,
            "chennai": 1.6
        }
        self.city_amplitudes = {
            "manhattan": 0.6, "paris": 0.4, "mumbai": 0.7,
            "reykjavik": 0.1, "zurich": 0.3, "tokyo": 0.5,
            "london": 0.4, "singapore": 0.4, "dubai": 0.3,
            "sydney": 0.3, "bali": 0.2, "rio": 0.4,
            "cape_town": 0.3, "delhi": 0.6, "hyderabad": 0.4,
            "chennai": 0.5
        }

    def _get_analytical_multiplier(
        self, 
        city_id: str, 
        midpoint_lat: float, 
        midpoint_lon: float, 
        dt: datetime, 
        weather: str
    ) -> Tuple[float, float]:
        hour = dt.hour + dt.minute / 60.0
        weekday = dt.weekday()
        is_weekend = weekday >= 5

        # 1. City baseline traffic factor
        c_base = self.city_baselines.get(city_id, 1.3)

        # 2. Temporal Factor (rush hours vs leisure peaks)
        t_factor = 1.0
        if not is_weekend:
            am_peak = 1.2 * np.exp(-((hour - 8.5) ** 2) / (2 * 1.0 ** 2))
            pm_peak = 1.5 * np.exp(-((hour - 17.5) ** 2) / (2 * 1.2 ** 2))
            midday_peak = 0.3 * np.exp(-((hour - 12.5) ** 2) / (2 * 0.8 ** 2))
            night_dip = -0.15 if (hour < 5 or hour > 23) else 0.0
            t_factor += am_peak + pm_peak + midday_peak + night_dip
        else:
            aft_peak = 0.4 * np.exp(-((hour - 14.0) ** 2) / (2 * 2.0 ** 2))
            t_factor += aft_peak

        # 3. Spatial Factor (decay outward from center)
        s_factor = 1.0
        city_info = self.cities_metadata.get(city_id)
        if city_info and "center" in city_info:
            center = city_info["center"]
            dist = calculate_haversine(midpoint_lat, midpoint_lon, center["lat"], center["lon"])
            amp = self.city_amplitudes.get(city_id, 0.3)
            s_factor += amp * np.exp(-dist / 5000.0)

        # 4. Weather Factor
        w_factor = 1.0
        if weather == "rain":
            w_factor = 1.6 if city_id == "mumbai" else 1.25
        elif weather == "snow":
            w_factor = 1.8 if city_id in ["zurich", "reykjavik"] else 1.5
        elif weather == "fog":
            w_factor = 1.3

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
        dense_cities = {"manhattan", "paris", "london", "tokyo", "mumbai", "delhi", "chennai", "hyderabad"}
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
            density_multiplier += 1.5 * np.exp(-((hour - 8.5) ** 2) / (2 * 1.0 ** 2))
            density_multiplier += 1.8 * np.exp(-((hour - 17.5) ** 2) / (2 * 1.2 ** 2))
        else:
            density_multiplier += 0.8 * np.exp(-((hour - 14.0) ** 2) / (2 * 2.0 ** 2))
            
        # Generate grid of points around the city center
        density_points = []
        grid_size = 5
        lat_step = 0.015
        lon_step = 0.015
        
        # Use a fixed random seed for deterministic mock visualization density noise
        rng = np.random.default_rng(int(timestamp) % 100000)
        
        for i in range(-grid_size // 2 + 1, grid_size // 2 + 1):
            for j in range(-grid_size // 2 + 1, grid_size // 2 + 1):
                pt_lat = center["lat"] + i * lat_step
                pt_lon = center["lon"] + j * lon_step
                
                distance = calculate_haversine(pt_lat, pt_lon, center["lat"], center["lon"])
                base_density = 80.0 * np.exp(-distance / 3000.0)
                
                noise = rng.uniform(-5.0, 5.0)
                final_density = np.clip(base_density * density_multiplier + noise, 0.0, 100.0)
                
                density_points.append({
                    "lat": float(pt_lat),
                    "lon": float(pt_lon),
                    "density": float(final_density)
                })
                
    def predict_timeseries(
        self,
        city_id: str,
        start_timestamp: float,
        hours: int = 48
    ) -> List[Dict[str, float]]:
        city_info = self.cities_metadata.get(city_id)
        if not city_info or "center" not in city_info:
            return []
            
        center = city_info["center"]
        timeseries = []
        
        for h in range(hours):
            ts = start_timestamp + h * 3600
            dt = datetime.fromtimestamp(ts)
            
            # Predict congestion at city center
            congestion, confidence = self._get_analytical_multiplier(
                city_id, center["lat"], center["lon"], dt, "clear"
            )
            
            # Scale congestion multiplier to a density score 0-100
            predicted = np.clip(congestion * 30.0, 5.0, 100.0)
            conf_spread = (1.0 - confidence) * 100.0
            
            timeseries.append({
                "timestamp": float(ts),
                "predicted": float(predicted),
                "upper": float(min(100.0, predicted + conf_spread)),
                "lower": float(max(0.0, predicted - conf_spread))
            })
            
        return timeseries


class MLPredictor(PredictorInterface):
    """
    Predictor implementation that loads a trained scikit-learn model pipeline
    and runs live inference on feature-engineered routes.
    """
    
    def __init__(self, model_path: str, cities_metadata: Dict[str, Any]):
        self.model_path = model_path
        self.cities_metadata = cities_metadata
        self.extractor = FeatureExtractor(cities_metadata)
        self.model = self._load_model()
        self.dense_cities = {"manhattan", "paris", "london", "tokyo", "mumbai", "delhi", "chennai", "hyderabad"}

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
        features_df = pd.DataFrame([features])
        
        regressor = self.model
        if hasattr(self.model, "named_steps"):
            regressor = self.model.named_steps.get("regressor", self.model)

        if hasattr(regressor, "estimators_"):
            preprocessor = self.model.named_steps["preprocessor"]
            transformed_x = preprocessor.transform(features_df)
            
            # Predict across all individual estimator trees
            preds = np.array([dt.predict(transformed_x) for dt in regressor.estimators_])
            preds_flat = preds.flatten()
            factor_mean = float(np.mean(preds_flat))
            factor_std = float(np.std(preds_flat))
            
            # Confidence calculated from Coefficient of Variation (CV)
            cv = factor_std / max(factor_mean, 0.1)
            confidence = float(np.clip(1.0 - 2.0 * cv, 0.0, 1.0))
        else:
            factor_mean = float(self.model.predict(features_df)[0])
            confidence = 0.85

        predicted_time_sec = t_base * factor_mean
        return predicted_time_sec, confidence

    def predict_traffic_density(
        self,
        city_id: str,
        timestamp: float
    ) -> List[Dict[str, float]]:
        analytical = MockPredictor(self.cities_metadata)
        return analytical.predict_traffic_density(city_id, timestamp)

    def predict_timeseries(
        self,
        city_id: str,
        start_timestamp: float,
        hours: int = 48
    ) -> List[Dict[str, float]]:
        city_info = self.cities_metadata.get(city_id)
        if not city_info or "center" not in city_info:
            return []
            
        center = city_info["center"]
        timeseries = []
        
        # We query the model exactly at the city center for the general trend
        coords = [[center["lon"], center["lat"]]]
        
        for h in range(hours):
            ts = start_timestamp + h * 3600
            dt = datetime.fromtimestamp(ts)
            
            features = self.extractor.extract(city_id, 0.0, coords, ts, "clear")
            features_df = pd.DataFrame([features])
            
            regressor = self.model
            if hasattr(self.model, "named_steps"):
                regressor = self.model.named_steps.get("regressor", self.model)
    
            if hasattr(regressor, "estimators_"):
                preprocessor = self.model.named_steps["preprocessor"]
                transformed_x = preprocessor.transform(features_df)
                
                preds = np.array([dt_tree.predict(transformed_x) for dt_tree in regressor.estimators_]).flatten()
                factor_mean = float(np.mean(preds))
                factor_std = float(np.std(preds))
                
                cv = factor_std / max(factor_mean, 0.1)
                confidence = float(np.clip(1.0 - 2.0 * cv, 0.0, 1.0))
            else:
                factor_mean = float(self.model.predict(features_df)[0])
                confidence = 0.85
                
            predicted = np.clip(factor_mean * 30.0, 5.0, 100.0)
            conf_spread = (1.0 - confidence) * 100.0
            
            timeseries.append({
                "timestamp": float(ts),
                "predicted": float(predicted),
                "upper": float(min(100.0, predicted + conf_spread)),
                "lower": float(max(0.0, predicted - conf_spread))
            })
            
        return timeseries


import functools

class PredictorFactory:
    """
    Factory to construct and cache instances of PredictorInterface per city.
    Uses an LRU Cache to avoid exhausting memory with 16 distinct Random Forest models.
    """
    
    def __init__(self, cities_metadata: Dict[str, Any], force_mock: bool = False):
        self.cities_metadata = cities_metadata
        self.force_mock = force_mock
        self.models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "models"))

    @functools.lru_cache(maxsize=3)
    def get_predictor(self, city_id: str) -> PredictorInterface:
        """
        Dynamically loads and caches the ML model for a specific city.
        Falls back to MockPredictor if missing or if dependencies aren't met.
        """
        if self.force_mock:
            return MockPredictor(self.cities_metadata)

        model_path = os.path.join(self.models_dir, f"{city_id}_model.joblib")
        
        if os.path.exists(model_path):
            try:
                import sklearn
                import joblib
                
                predictor = MLPredictor(model_path, self.cities_metadata)
                print(f"[PredictorFactory] Loaded MLPredictor for {city_id} from cache/disk.")
                return predictor
                
            except ImportError:
                print(f"[PredictorFactory] scikit-learn/joblib not installed. Mocking {city_id}.")
            except Exception as e:
                print(f"[PredictorFactory] Failed to load model for {city_id} ({e}). Mocking.")
        else:
            print(f"[PredictorFactory] Model file '{model_path}' not found. Mocking {city_id}.")

        return MockPredictor(self.cities_metadata)
