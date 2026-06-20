import json
import os
import numpy as np
import pandas as pd

def generate_city_dataset(city_id: str, num_samples: int = 5000, random_seed: int = 42) -> pd.DataFrame:
    np.random.seed(random_seed)
    
    # Baseline traffic factors per city
    city_baselines = {
        "manhattan": 1.8, "paris": 1.5, "mumbai": 2.2,
        "reykjavik": 1.0, "zurich": 1.2, "tokyo": 1.6,
        "london": 1.5, "singapore": 1.4, "dubai": 1.3,
        "sydney": 1.3, "bali": 1.1, "rio": 1.4,
        "cape_town": 1.3, "delhi": 1.8, "hyderabad": 1.5,
        "chennai": 1.6
    }
    
    # City center amplitudes
    city_amplitudes = {
        "manhattan": 0.6, "paris": 0.4, "mumbai": 0.7,
        "reykjavik": 0.1, "zurich": 0.3, "tokyo": 0.5,
        "london": 0.4, "singapore": 0.4, "dubai": 0.3,
        "sydney": 0.3, "bali": 0.2, "rio": 0.4,
        "cape_town": 0.3, "delhi": 0.6, "hyderabad": 0.4,
        "chennai": 0.5
    }

    # Generate random features
    distances = np.random.uniform(500, 15000, size=num_samples)
    dist_from_centers = np.random.uniform(0, 12000, size=num_samples)
    
    # Time variables
    hours = np.random.uniform(0, 24, size=num_samples)
    weekdays = np.random.randint(0, 7, size=num_samples)
    months = np.random.randint(1, 13, size=num_samples)
    
    # Weather probabilities
    weather_options = ["clear", "rain", "snow", "fog"]
    weather_probs = [0.6, 0.2, 0.1, 0.1]
    chosen_weather = np.random.choice(weather_options, size=num_samples, p=weather_probs)
    
    # Pre-allocate array for target multipliers
    multipliers = np.zeros(num_samples)
    seasons = []
    
    for i in range(num_samples):
        hour = hours[i]
        weekday = weekdays[i]
        month = months[i]
        weather = chosen_weather[i]
        dist_center = dist_from_centers[i]
        
        # 1. City baseline traffic factor
        c_base = city_baselines.get(city_id, 1.3)
        
        # 2. Temporal Factor (rush hours)
        is_weekend = weekday >= 5
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
            
        # 3. Spatial Factor (decay from center)
        amp_center = city_amplitudes.get(city_id, 0.3)
        s_factor = 1.0 + amp_center * np.exp(-dist_center / 5000.0)
        
        # 4. Weather Factor
        w_factor = 1.0
        if weather == "rain":
            w_factor = 1.6 if city_id == "mumbai" else 1.25
        elif weather == "snow":
            w_factor = 1.8 if city_id in ["zurich", "reykjavik"] else 1.5
        elif weather == "fog":
            w_factor = 1.3
            
        # Season categoricals
        if month in [12, 1, 2]:
            season = "winter"
        elif month in [3, 4, 5]:
            season = "spring"
        elif month in [6, 7, 8]:
            season = "summer"
        else:
            season = "autumn"
        seasons.append(season)
        
        # Noise factor
        epsilon = np.random.lognormal(0, 0.05)
        
        # Target Multiplier
        multipliers[i] = np.clip(c_base * t_factor * s_factor * w_factor * epsilon, 0.7, 10.0)

    # Cyclic time calculations
    hour_sin = np.sin(2 * np.pi * hours / 24.0)
    hour_cos = np.cos(2 * np.pi * hours / 24.0)
    day_sin = np.sin(2 * np.pi * weekdays / 7.0)
    day_cos = np.cos(2 * np.pi * weekdays / 7.0)

    df = pd.DataFrame({
        "distance_m": distances,
        "dist_from_center_m": dist_from_centers,
        "hour_sin": hour_sin,
        "hour_cos": hour_cos,
        "day_sin": day_sin,
        "day_cos": day_cos,
        "weather": chosen_weather,
        "season": seasons,
        "multiplier": multipliers
    })
    
    return df

if __name__ == "__main__":
    cities_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "cities.json"))
    if not os.path.exists(cities_file):
        raise FileNotFoundError(f"Cities metadata file not found at: {cities_file}")
        
    with open(cities_file, 'r') as f:
        cities_data = json.load(f)
        
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "data"))
    os.makedirs(data_dir, exist_ok=True)
        
    for c in cities_data.get("cities", []):
        c_id = c["id"]
        print(f"Generating data for {c_id}...")
        # Distinct random seed per city
        seed = 42 + sum(ord(char) for char in c_id)
        df = generate_city_dataset(city_id=c_id, num_samples=10000, random_seed=seed)
        
        csv_path = os.path.join(data_dir, f"{c_id}_traffic_data.csv")
        df.to_csv(csv_path, index=False)
        print(f"Saved {c_id} dataset to {csv_path}")
