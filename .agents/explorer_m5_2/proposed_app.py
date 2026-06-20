from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import os
import time

from graph_manager import GraphManager
from prediction_engine import PredictorFactory
from engineering_manager import EngineeringManager

app = FastAPI(title="Trent Geo-Route API")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

gm = GraphManager()
eng_manager = EngineeringManager()

# Initialize Predictor polymorphically
MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "models", "traffic_model.joblib"))
predictor = PredictorFactory.create_predictor(model_path=MODEL_PATH, cities_metadata=gm.cities_metadata)

class RouteRequest(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    algorithm: str = "astar"

class PredictRequest(BaseModel):
    city_id: str
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    timestamp: float
    weather: str = "clear"

class EngineeringConfigPayload(BaseModel):
    cache_size_mb: Optional[int] = None
    cache_policy: Optional[str] = None
    compile_status: Optional[str] = None

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
        raise HTTPException(status_code=404, detail="City not found")
    return info

@app.post("/api/v1/simulate/{city_id}")
def simulate_route(city_id: str, req: RouteRequest):
    try:
        # Record query in engineering manager (updates cache metrics & compile status checks)
        eng_manager.record_query()

        # Apply simulated latency overhead if active
        if eng_manager.latency_ms > 0:
            time.sleep(eng_manager.latency_ms / 1000.0)

        result = gm.compute_route(
            city_id=city_id,
            start_lat=req.start_lat,
            start_lon=req.start_lon,
            end_lat=req.end_lat,
            end_lon=req.end_lon,
            algorithm=req.algorithm
        )

        # Inject simulated latency overhead into the result metrics (microsecond conversion)
        if "metrics" in result:
            result["metrics"]["execution_time_us"] += int(eng_manager.latency_ms * 1000)

        return result
    except HTTPException:
        # Prevent generic Exception handler from wrapping HTTPExceptions
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/predict")
def predict_route(req: PredictRequest):
    try:
        # Validate city_id
        if not gm.get_city_info(req.city_id):
            raise HTTPException(status_code=400, detail=f"Unknown city_id: {req.city_id}")

        # Record query in engineering manager (updates cache metrics & compile status checks)
        eng_manager.record_query()

        # Apply simulated latency overhead if active
        if eng_manager.latency_ms > 0:
            time.sleep(eng_manager.latency_ms / 1000.0)

        # 1. Compute route using routing core
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
        
        # 2. Query predictor for traversal time and confidence
        travel_time_sec, confidence = predictor.predict_route(
            city_id=req.city_id,
            distance_m=distance_m,
            coordinates=coordinates,
            timestamp=req.timestamp,
            weather=req.weather
        )
        
        # 3. Return response adhering to interface contract
        return {
            "path": {
                "coordinates": coordinates,
                "distance_m": distance_m
            },
            "travel_time_sec": travel_time_sec,
            "confidence": confidence
        }
    except HTTPException:
        # Prevent generic Exception handler from wrapping HTTPExceptions
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/api/v1/predict/traffic-density")
def get_traffic_density(city_id: str, timestamp: float):
    try:
        if not gm.get_city_info(city_id):
            raise HTTPException(status_code=404, detail="City not found in metadata.")
            
        density_data = predictor.predict_traffic_density(city_id=city_id, timestamp=timestamp)
        return {
            "traffic_density": density_data
        }
    except HTTPException:
        # Prevent generic Exception handler from wrapping HTTPExceptions
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Engineering Controls & Stats APIs ---

@app.get("/api/v1/engineering/stats")
def get_engineering_stats():
    return eng_manager.get_stats()

@app.get("/api/v1/engineering/config")
def get_engineering_config():
    return {
        "cache_size_mb": eng_manager.cache_size_mb,
        "cache_policy": eng_manager.cache_policy,
        "compile_status": eng_manager.compile_status
    }

@app.post("/api/v1/engineering/config")
def update_engineering_config(payload: EngineeringConfigPayload):
    # Validate compile_status
    if payload.compile_status and payload.compile_status not in ["DEBUG", "OPTIMIZED"]:
        raise HTTPException(status_code=400, detail="Invalid compile_status. Must be 'DEBUG' or 'OPTIMIZED'")
    
    # Validate cache_policy
    if payload.cache_policy and payload.cache_policy not in ["LRU", "FIFO", "LFU"]:
        raise HTTPException(status_code=400, detail="Invalid cache_policy. Must be 'LRU', 'FIFO', or 'LFU'")

    # Validate cache_size_mb
    if payload.cache_size_mb is not None and payload.cache_size_mb <= 0:
        raise HTTPException(status_code=400, detail="cache_size_mb must be positive")
        
    # Apply changes
    eng_manager.update_config(
        cache_size_mb=payload.cache_size_mb,
        cache_policy=payload.cache_policy,
        compile_status=payload.compile_status
    )
    
    return {
        "status": "success",
        "config": {
            "cache_size_mb": eng_manager.cache_size_mb,
            "cache_policy": eng_manager.cache_policy,
            "compile_status": eng_manager.compile_status
        }
    }

@app.post("/api/v1/engineering/cache/clear")
def clear_engineering_cache():
    eng_manager.clear_cache()
    return {"status": "success", "message": "Cache cleared successfully"}

@app.post("/api/v1/engineering/recompile")
def trigger_engineering_recompile():
    eng_manager.trigger_recompile(target_status=eng_manager.compile_status)
    return {"status": "success", "message": "Compilation initiated"}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
