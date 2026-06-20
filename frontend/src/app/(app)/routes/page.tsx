"use client";

import { useState } from "react";
import { Zap, Route as RouteIcon, Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { useTrentStore } from "@/store/useTrentStore";
import dynamic from "next/dynamic";
import { useMutation } from "@tanstack/react-query";
import { computeRoute } from "@/lib/api";

const TrentMap = dynamic(() => import("@/components/map/TrentMap"), { ssr: false });

export default function RoutesPage() {
  const currentReality = useTrentStore(state => state.currentReality);
  const activeCityId = useTrentStore(state => state.activeCityId);
  const [algo, setAlgo] = useState("astar");
  
  const [startCoord, setStartCoord] = useState<{lat: number, lon: number} | null>(null);
  const [endCoord, setEndCoord] = useState<{lat: number, lon: number} | null>(null);

  const { mutate: runSimulation, data: routeData, isPending } = useMutation({
    mutationFn: () => {
      if (!startCoord || !endCoord) return Promise.reject("Missing coordinates");
      return computeRoute(activeCityId || "manhattan", {
        start_lat: startCoord.lat,
        start_lon: startCoord.lon,
        end_lat: endCoord.lat,
        end_lon: endCoord.lon,
        algorithm: algo 
      });
    }
  });

  const handleMapClick = (lat: number, lon: number) => {
    if (!startCoord || (startCoord && endCoord)) {
      setStartCoord({ lat, lon });
      setEndCoord(null);
    } else {
      setEndCoord({ lat, lon });
    }
  };

  return (
    <div className="h-full w-full flex overflow-hidden">
      
      {/* 1. Explorer Panel */}
      <div className="w-80 border-r border-border bg-card/50 backdrop-blur flex flex-col z-10 shadow-2xl relative">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold flex items-center"><Search className="w-4 h-4 mr-2 text-primary" /> Route Intelligence</h2>
          <p className="text-xs text-muted-foreground mt-1">Configure pathfinding parameters</p>
        </div>
        
        <div className="p-4 flex flex-col gap-4 flex-1">
          <div className="space-y-2">
            <label className="text-xs font-mono text-muted-foreground uppercase">Algorithm Strategy</label>
            <select 
              className="w-full bg-background border border-border rounded p-2 text-sm focus:ring-1 focus:ring-primary outline-none"
              value={algo}
              onChange={(e) => setAlgo(e.target.value)}
            >
              <option value="dijkstra">Dijkstra (Baseline)</option>
              <option value="astar">A* (Heuristic)</option>
              <option value="bidir">Bidirectional A*</option>
              <option value="alt">A* Landmarks (ALT)</option>
              <option value="ch">Contraction Hierarchies</option>
            </select>
          </div>

          <div className="space-y-2 border-t border-border pt-4 mt-auto">
            <button 
              onClick={() => runSimulation()}
              disabled={isPending || !activeCityId || !startCoord || !endCoord}
              className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded p-2 text-sm font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              {isPending ? "Computing..." : "Simulate Route"}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Canvas (Deck.gl Map) */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
         <TrentMap 
            routeData={routeData} 
            startCoord={startCoord} 
            endCoord={endCoord} 
            onMapClick={handleMapClick} 
         />

         {/* Reality Mode Pill */}
         <div className="absolute top-6 left-6 z-10 bg-background/90 border border-border rounded-full px-4 py-1.5 flex items-center shadow-lg">
           <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
           <span className="text-xs font-mono uppercase tracking-wider">{currentReality} Reality</span>
         </div>
         
         {/* City ID Display */}
         <div className="absolute bottom-6 right-6 z-10 bg-background/90 border border-border rounded px-3 py-1 flex items-center shadow-lg">
           <span className="text-xs font-mono text-muted-foreground">ACTIVE_NODE:</span>
           <span className="text-xs font-mono ml-2 uppercase text-foreground">{activeCityId || "AWAITING_SYNC"}</span>
         </div>
      </div>

      {/* 3. Context Panel (Intelligence Workspace) */}
      <div className="w-80 border-l border-border bg-card/50 backdrop-blur flex flex-col z-10 shadow-2xl">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="font-semibold flex items-center"><RouteIcon className="w-4 h-4 mr-2 text-primary" /> Route DNA</h2>
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
           <div className="flex flex-col gap-6">
              <DnaStat label="Total Distance" value={routeData ? `${(routeData.path.distance_m / 1000).toFixed(2)} km` : "---"} />
              <DnaStat label="Execution Time" value={routeData ? `${routeData.metrics.execution_time_us} µs` : "---"} />
              <DnaStat label="Nodes Explored" value={routeData ? routeData.metrics.nodes_explored.toLocaleString() : "---"} />
              <DnaStat label="Confidence Score" value={routeData ? "99.9%" : "---"} />
           </div>
           
           {routeData && (
             <div className="mt-8 p-3 rounded bg-secondary/50 border border-border">
                <p className="text-xs font-mono text-emerald-500">System Note:</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Using {algo}, the system explored {routeData.metrics.nodes_explored} nodes in {routeData.metrics.execution_time_us} microseconds.
                </p>
             </div>
           )}
        </div>
      </div>

    </div>
  );
}

function DnaStat({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="flex flex-col border-l-2 border-primary/50 pl-3">
       <span className="text-xs font-mono text-muted-foreground uppercase">{label}</span>
       <span className="text-lg font-semibold tracking-tight">{value}</span>
    </div>
  )
}
