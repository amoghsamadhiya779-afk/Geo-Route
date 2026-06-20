import { API_BASE, RouteResponse, RouteRequest } from "../frontend/src/lib/api";

// ----------------------------------------------------
// 1. AI Reasoning & Explainability (XAI) Interfaces
// ----------------------------------------------------

export interface PredictExplainRequest {
  city_id: string;
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  timestamp: number;
  weather: string;
}

export interface FeatureContributions {
  base_distance: number;
  center_proximity: number;
  hour_of_day: number;
  day_of_week: number;
  weather_condition: number;
  seasonal_effect: number;
}

export interface XaiData {
  base_travel_time_sec: number;
  congestion_multiplier: number;
  feature_contributions: FeatureContributions;
  tree_predictions: number[];
}

export interface PredictExplainResponse {
  path: {
    coordinates: [number, number][];
    distance_m: number;
  };
  travel_time_sec: number;
  confidence: number;
  xai: XaiData;
}

// ----------------------------------------------------
// 2. Engineering Dashboard & Benchmarking Interfaces
// ----------------------------------------------------

export interface EngineeringStatsResponse {
  compiled_with: string;
  optimization_flags: string;
  simd_support: string;
  active_graphs_loaded: string[];
  total_graph_memory_bytes: number;
  cache_hits: number;
  cache_misses: number;
  cache_hit_rate: number;
  cpu_usage_pct: number;
}

export interface BenchmarkResult {
  algorithm: string;
  avg_time_us: number;
  avg_explored: number;
  speedup: number;
}

export interface BenchmarkResponse {
  city_id: string;
  queries_run: number;
  benchmarks: BenchmarkResult[];
}

export interface PreprocessRequest {
  city_id: string;
  algorithm: "alt" | "ch";
  landmark_count?: number;
}

export interface PreprocessResponse {
  status: string;
  city_id: string;
  algorithm: "alt" | "ch";
  elapsed_sec: number;
  message: string;
}

// ----------------------------------------------------
// 3. Proposed API Client Functions
// ----------------------------------------------------

/**
 * Predict travel time with XAI explanation details.
 */
export const predictRouteExplain = async (req: PredictExplainRequest): Promise<PredictExplainResponse> => {
  const res = await fetch(`${API_BASE}/predict/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error("Failed to fetch explainable route prediction");
  return res.json();
};

/**
 * Fetch C++ Routing Engine cache stats and telemetry.
 */
export const fetchEngineeringStats = async (): Promise<EngineeringStatsResponse> => {
  const res = await fetch(`${API_BASE}/engineering/stats`);
  if (!res.ok) throw new Error("Failed to fetch engineering stats");
  return res.json();
};

/**
 * Run standard random routing queries to benchmark algorithms in C++.
 */
export const runEngineeringBenchmark = async (cityId: string, numQueries: number): Promise<BenchmarkResponse> => {
  const res = await fetch(`${API_BASE}/engineering/benchmark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city_id: cityId, num_queries: numQueries }),
  });
  if (!res.ok) throw new Error("Failed to run engineering benchmarks");
  return res.json();
};

/**
 * Trigger C++ pre-processing (ALT landmark selection or CH contraction hierarchy)
 */
export const runPreprocessing = async (req: PreprocessRequest): Promise<PreprocessResponse> => {
  const res = await fetch(`${API_BASE}/engineering/preprocess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error("Failed to run preprocessing");
  return res.json();
};
