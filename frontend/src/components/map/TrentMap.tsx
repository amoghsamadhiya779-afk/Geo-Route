"use client";

import { useEffect, useState, useMemo } from "react";
import Map from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import { MapViewState } from "@deck.gl/core";
import { useTrentStore } from "@/store/useTrentStore";
import { useQuery } from "@tanstack/react-query";
import { fetchCities, RouteResponse } from "@/lib/api";
import "maplibre-gl/dist/maplibre-gl.css";

interface TrentMapProps {
  routeData?: RouteResponse;
  startCoord?: {lat: number, lon: number} | null;
  endCoord?: {lat: number, lon: number} | null;
  onMapClick?: (lat: number, lon: number) => void;
}

const DARK_MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export default function TrentMap({ routeData, startCoord, endCoord, onMapClick }: TrentMapProps) {
  const activeCityId = useTrentStore(state => state.activeCityId);
  const setActiveCity = useTrentStore(state => state.setActiveCity);
  
  const { data: cities } = useQuery({
    queryKey: ['cities'],
    queryFn: fetchCities,
  });

  const [viewState, setViewState] = useState<MapViewState>({
    longitude: -73.985,
    latitude: 40.758,
    zoom: 13,
    pitch: 45,
    bearing: 0
  });

  useEffect(() => {
    if (cities && cities.length > 0) {
      if (!activeCityId) {
        setTimeout(() => setActiveCity(cities[0].id), 0);
      } else {
        const city = cities.find(c => c.id === activeCityId);
        if (city) {
          setTimeout(() => {
            setViewState({
              longitude: city.center.lon,
              latitude: city.center.lat,
              zoom: city.zoom,
              pitch: 45,
              bearing: 0,
              transitionDuration: 1000,
            } as MapViewState);
          }, 0);
        }
      }
    }
  }, [cities, activeCityId, setActiveCity]);

  const layers = useMemo(() => {
    const arr = [];
    if (routeData?.path) {
      arr.push(
        new PathLayer({
          id: "optimal-route",
          data: [{ path: routeData.path.coordinates }],
          getPath: (d: { path: [number, number][] }) => d.path,
          getColor: [16, 185, 129],
          getWidth: 8,
          widthMinPixels: 4,
          capRounded: true,
          jointRounded: true,
        })
      );
    }

    if (routeData?.exploration) {
      arr.push(
        new ScatterplotLayer({
          id: "exploration-nodes",
          data: routeData.exploration,
          getPosition: (d: { lon: number; lat: number }) => [d.lon, d.lat],
          getFillColor: (d: { is_forward: boolean }) => d.is_forward ? [59, 130, 246, 150] : [239, 68, 68, 150],
          getRadius: 15,
          radiusMinPixels: 2,
          radiusMaxPixels: 10,
        })
      );
    }

    if (startCoord) {
      arr.push(
        new ScatterplotLayer({
          id: "start-node",
          data: [startCoord],
          getPosition: d => [d.lon, d.lat],
          getFillColor: [16, 185, 129, 255],
          getLineColor: [255, 255, 255],
          lineWidthMinPixels: 2,
          getRadius: 100,
          radiusMinPixels: 8,
          radiusMaxPixels: 20,
          stroked: true,
        })
      );
    }
    
    if (endCoord) {
      arr.push(
        new ScatterplotLayer({
          id: "end-node",
          data: [endCoord],
          getPosition: d => [d.lon, d.lat],
          getFillColor: [239, 68, 68, 255],
          getLineColor: [255, 255, 255],
          lineWidthMinPixels: 2,
          getRadius: 100,
          radiusMinPixels: 8,
          radiusMaxPixels: 20,
          stroked: true,
        })
      );
    }

    return arr;
  }, [routeData, startCoord, endCoord]);

  return (
    <div className="absolute inset-0 w-full h-full bg-[#0a0a0a]">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: newViewState }) => setViewState(newViewState as MapViewState)}
        controller={true}
        layers={layers}
        onClick={(info) => {
          if (info.coordinate && onMapClick) {
            onMapClick(info.coordinate[1], info.coordinate[0]);
          }
        }}
        getCursor={() => 'crosshair'}
      >
        <Map
          mapStyle={DARK_MAP_STYLE}
          attributionControl={false}
        />
      </DeckGL>
    </div>
  );
}
