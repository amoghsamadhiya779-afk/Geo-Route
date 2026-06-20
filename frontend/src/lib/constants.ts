export const CITIES = [
  "Manhattan", "Paris", "Tokyo", "London", "Mumbai",
  "Delhi", "Singapore", "Dubai", "São Paulo", "Berlin",
];

export const WEATHER_OPTIONS = ["Clear", "Rain", "Snow", "Fog"] as const;
export type Weather = typeof WEATHER_OPTIONS[number];

export const WEATHER_SPEED_FACTOR: Record<Weather, number> = {
  Clear: 1.0,
  Rain: 0.75,
  Snow: 0.5,
  Fog: 0.85,
};
