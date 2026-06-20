export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface CityInfo {
  id: string;
  name: string;
  country: string;
  center: { lat: number; lon: number };
  zoom: number;
}

export interface RouteRequest {
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  algorithm: string;
}

export interface RouteResponse {
  path: {
    coordinates: [number, number][];
    distance_m: number;
  };
  metrics: {
    execution_time_us: number;
    nodes_explored: number;
  };
  exploration: Array<{
    lon: number;
    lat: number;
    order: number;
    cost: number;
    is_forward: boolean;
  }>;
}

export const fetchCities = async (): Promise<CityInfo[]> => {
  const res = await fetch(`${API_BASE}/cities`);
  if (!res.ok) throw new Error("Failed to fetch cities");
  return res.json();
};

export const computeRoute = async (cityId: string, req: RouteRequest): Promise<RouteResponse> => {
  const res = await fetch(`${API_BASE}/simulate/${cityId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error("Failed to compute route");
  return res.json();
};
