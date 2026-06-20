import os
import json
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, r2_score

def train_city_model(city_id: str):
    data_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "data", f"{city_id}_traffic_data.csv"))
    if not os.path.exists(data_path):
        print(f"Skipping {city_id}: Dataset not found at {data_path}")
        return
        
    df = pd.read_csv(data_path)
    
    # Separate features and target
    X = df.drop(columns=["multiplier"])
    y = df["multiplier"]
    
    # Define features (city_id is no longer a feature as models are per-city)
    num_features = [
        "distance_m",
        "dist_from_center_m",
        "hour_sin",
        "hour_cos",
        "day_sin",
        "day_cos"
    ]
    cat_features = [
        "weather",
        "season"
    ]
    
    # Define preprocessor
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), num_features),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_features)
        ]
    )
    
    # Define model/regressor
    regressor = RandomForestRegressor(
        n_estimators=50,
        max_depth=12,
        random_state=42,
        n_jobs=-1
    )
    
    # Create the pipeline
    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", regressor)
        ]
    )
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print(f"Training model for {city_id}...")
    pipeline.fit(X_train, y_train)
    
    # Evaluate
    y_pred = pipeline.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"  [{city_id}] MSE: {mse:.4f} | R2: {r2:.4f}")
    
    # Save the model
    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "models"))
    os.makedirs(models_dir, exist_ok=True)
    
    model_save_path = os.path.join(models_dir, f"{city_id}_model.joblib")
    joblib.dump(pipeline, model_save_path)

if __name__ == "__main__":
    cities_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "cities.json"))
    if not os.path.exists(cities_file):
        raise FileNotFoundError(f"Cities metadata file not found at: {cities_file}")
        
    with open(cities_file, 'r') as f:
        cities_data = json.load(f)
        
    for c in cities_data.get("cities", []):
        train_city_model(c["id"])
    print("All models trained successfully.")
