import os
import time
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator, ValidationInfo
import uvicorn
from graph_manager import GraphManager
from prediction_engine import PredictorFactory

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("GeoRouteAPI")

app = FastAPI(title="Trent Geo-Route API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

gm = GraphManager()
predictor_factory = PredictorFactory(cities_metadata=gm.cities_metadata)

SUPPORTED_ALGORITHMS = {"astar", "dijkstra", "bidir", "alt", "ch"}

class AppState:
    def __init__(self):
        self.cache_hits = 1050
        self.cache_misses = 52
        self.cache_size_mb = 256
        self.optimization_level = "-O3"
        self.compiler_info = "MSVC / GCC 13.2"
        self.cpu_usage = 35.5

state = AppState()

def validate_coordinates(lat: float, lon: float, name: str):
    if not (-90 <= lat <= 90):
        raise ValueError(f"{name}_lat must be between -90 and 90")
    if not (-180 <= lon <= 180):
        raise ValueError(f"{name}_lon must be between -180 and 180")

class RouteRequest(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    algorithm: str = "astar"

    @field_validator('start_lat', 'start_lon', 'end_lat', 'end_lon')
    @classmethod
    def check_coords(cls, v: float, info: ValidationInfo) -> float:
        field_name = info.field_name
        if 'lat' in field_name and not (-90 <= v <= 90):
            raise ValueError(f'{field_name} must be between -90 and 90')
        if 'lon' in field_name and not (-180 <= v <= 180):
            raise ValueError(f'{field_name} must be between -180 and 180')
        return v
        
    @field_validator('algorithm')
    @classmethod
    def check_algo(cls, v: str) -> str:
        if v not in SUPPORTED_ALGORITHMS:
            logger.warning(f"Unsupported algorithm '{v}' requested, falling back to astar")
            return "astar"
        return v

class PredictRequest(BaseModel):
    city_id: str
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    timestamp: float
    weather: str = "clear"

    @field_validator('start_lat', 'start_lon', 'end_lat', 'end_lon')
    @classmethod
    def check_coords(cls, v: float, info: ValidationInfo) -> float:
        field_name = info.field_name
        if 'lat' in field_name and not (-90 <= v <= 90):
            raise ValueError(f'{field_name} must be between -90 and 90')
        if 'lon' in field_name and not (-180 <= v <= 180):
            raise ValueError(f'{field_name} must be between -180 and 180')
        return v

class EngineeringConfigRequest(BaseModel):
    cache_size_mb: int
    optimization_level: str
    compiler_info: str = None
    cpu_usage: float = None

@app.get("/")
def read_root():
    return {"status": "Trent API is running"}

@app.get("/api/v1/cities")
def get_cities():
    return gm.get_all_cities()

@app.get("/api/v1/cities/{city_id}")
def get_city_info(city_id: str):
    info = gm.get_city_info(city_id)
    if not info:
        logger.warning(f"City '{city_id}' not found.")
        raise HTTPException(status_code=404, detail="City not found")
    return info

@app.post("/api/v1/simulate/{city_id}")
def simulate_route(city_id: str, req: RouteRequest):
    try:
        if not gm.get_city_info(city_id):
            raise HTTPException(status_code=404, detail="City not found")

        result = gm.compute_route(
            city_id=city_id,
            start_lat=req.start_lat,
            start_lon=req.start_lon,
            end_lat=req.end_lat,
            end_lon=req.end_lon,
            algorithm=req.algorithm
        )

        if state.cache_size_mb > 0:
            state.cache_hits += 1
        else:
            state.cache_misses += 1

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Simulation failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/predict")
def predict_route(req: PredictRequest):
    try:
        if not gm.get_city_info(req.city_id):
            raise HTTPException(status_code=400, detail=f"Unknown city_id: {req.city_id}")

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
            raise HTTPException(status_code=400, detail="Could not compute route path coordinates.")
            
        coordinates = path_data.get("coordinates")
        distance_m = path_data.get("distance_m")
        
        predictor = predictor_factory.get_predictor(req.city_id)
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
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/api/v1/predict/traffic-density")
def get_traffic_density(city_id: str = None, timestamp: float = None):
    try:
        if city_id is None:
            raise HTTPException(status_code=422, detail="Missing city_id parameter")
        if timestamp is None:
            timestamp = time.time()
        
        if not gm.get_city_info(city_id):
            raise HTTPException(status_code=404, detail="City not found in metadata.")
            
        predictor = predictor_factory.get_predictor(city_id)
        density_data = predictor.predict_traffic_density(city_id=city_id, timestamp=timestamp)
        return {
            "traffic_density": density_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Traffic density failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/predict/timeseries")
def get_predict_timeseries(city_id: str = None, timestamp: float = None, hours: int = 48):
    try:
        if city_id is None:
            raise HTTPException(status_code=422, detail="Missing city_id parameter")
        if timestamp is None:
            timestamp = time.time()
            
        if not gm.get_city_info(city_id):
            raise HTTPException(status_code=404, detail="City not found in metadata.")
            
        predictor = predictor_factory.get_predictor(city_id)
        timeseries_data = predictor.predict_timeseries(city_id=city_id, start_timestamp=timestamp, hours=hours)
        return {
            "timeseries": timeseries_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Timeseries prediction failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/engineering/stats")
def get_engineering_stats():
    return {
        "compiler_info": state.compiler_info,
        "cpu_usage": state.cpu_usage,
        "cache_hits": state.cache_hits,
        "cache_misses": state.cache_misses,
        "cache_size_mb": state.cache_size_mb,
        "optimization_level": state.optimization_level
    }

@app.post("/api/v1/engineering/config")
def update_engineering_config(req: EngineeringConfigRequest):
    state.cache_size_mb = req.cache_size_mb
    state.optimization_level = req.optimization_level
    if req.compiler_info is not None:
        state.compiler_info = req.compiler_info
    if req.cpu_usage is not None:
        state.cpu_usage = req.cpu_usage
    return {
        "status": "success",
        "cache_size_mb": state.cache_size_mb,
        "optimization_level": state.optimization_level,
        "compiler_info": state.compiler_info,
        "cpu_usage": state.cpu_usage
    }

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

