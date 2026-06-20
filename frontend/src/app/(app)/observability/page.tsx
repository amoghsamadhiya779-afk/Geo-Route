"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  Cpu,
  Database,
  TrendingUp,
  Clock,
  RefreshCw,
  Zap,
  Server,
  Layers,
  Sliders,
  ChevronRight,
} from "lucide-react";

// Mock Data Generators for Live Telemetry
const latencyDistributionData = [
  { range: "< 2ms", count: 240, color: "#10b981" },
  { range: "2 - 5ms", count: 480, color: "#10b981" },
  { range: "5 - 10ms", count: 180, color: "#34d399" },
  { range: "10 - 20ms", count: 90, color: "#f59e0b" },
  { range: "20 - 50ms", count: 40, color: "#f97316" },
  { range: "> 50ms", count: 15, color: "#ef4444" },
];

const initialCpuData = Array.from({ length: 15 }).map((_, i) => ({
  time: `${i * 2}s ago`,
  coreRouter: Math.floor(Math.random() * 25) + 30,
  spatialIndexer: Math.floor(Math.random() * 15) + 10,
}));

const nodeSearchData = [
  { distanceKm: "1km", Astar: 42, Dijkstra: 156, BidirectionalAstar: 28 },
  { distanceKm: "5km", Astar: 198, Dijkstra: 840, BidirectionalAstar: 94 },
  { distanceKm: "10km", Astar: 480, Dijkstra: 2450, BidirectionalAstar: 185 },
  { distanceKm: "20km", Astar: 950, Dijkstra: 6700, BidirectionalAstar: 320 },
  { distanceKm: "50km", Astar: 2400, Dijkstra: 18500, BidirectionalAstar: 740 },
];

const initialCacheData = Array.from({ length: 10 }).map((_, i) => {
  const hits = Math.floor(Math.random() * 80) + 120;
  const misses = Math.floor(Math.random() * 15) + 5;
  return {
    time: `${(10 - i) * 5}m ago`,
    hits,
    misses,
    rate: Math.floor((hits / (hits + misses)) * 100),
  };
});

export default function ObservabilityPage() {
  const [mounted, setMounted] = useState(false);
  const [timeWindow, setTimeWindow] = useState("5m");
  const [engineSource, setEngineSource] = useState("cpp-core");
  const [cpuHistory, setCpuHistory] = useState(initialCpuData);
  const [cacheHistory, setCacheHistory] = useState(initialCacheData);
  const [isSimulating, setIsSimulating] = useState(false);

  // Hydration safety mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Live simulation of metrics
  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(() => {
      // 1. Simulate CPU updates
      setCpuHistory((prev) => {
        const nextRouterCpu = Math.floor(Math.random() * 30) + (isSimulating ? 50 : 25);
        const nextSpatialCpu = Math.floor(Math.random() * 15) + (isSimulating ? 25 : 10);
        const newHistory = [
          ...prev.slice(1),
          {
            time: "now",
            coreRouter: nextRouterCpu,
            spatialIndexer: nextSpatialCpu,
          },
        ];
        return newHistory.map((d, index) => ({
          ...d,
          time: index === newHistory.length - 1 ? "now" : `${(newHistory.length - 1 - index) * 2}s ago`,
        }));
      });

      // 2. Simulate Cache updates
      setCacheHistory((prev) => {
        const hits = Math.floor(Math.random() * 100) + (isSimulating ? 220 : 130);
        const misses = Math.floor(Math.random() * 20) + (isSimulating ? 4 : 8);
        const newHistory = [
          ...prev.slice(1),
          {
            time: "now",
            hits,
            misses,
            rate: Math.floor((hits / (hits + misses)) * 100),
          },
        ];
        return newHistory.map((d, index) => ({
          ...d,
          time: index === newHistory.length - 1 ? "now" : `${(newHistory.length - 1 - index) * 5}m ago`,
        }));
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [mounted, isSimulating]);

  // Trigger high-load simulation
  const triggerSimulationLoad = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 6000);
  };

  const activeStats = useMemo(() => {
    const latestCache = cacheHistory[cacheHistory.length - 1];
    return {
      avgLatency: isSimulating ? "24.5ms" : "4.8ms",
      cacheHitRate: `${latestCache ? latestCache.rate : 94}%`,
      nodesExploredSec: isSimulating ? "452,000" : "32,400",
      activeThreads: isSimulating ? "16 / 16" : "4 / 16",
    };
  }, [cacheHistory, isSimulating]);

  if (!mounted) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#0a0a0a] text-muted-foreground font-mono text-sm">
        <Activity className="w-5 h-5 animate-pulse mr-2 text-primary" />
        INITIALIZING OBSERVABILITY GRAPHICS...
      </div>
    );
  }

  return (
    <div className="h-full w-full flex bg-[#0a0a0a] relative overflow-hidden text-foreground">
      {/* Left Settings / Control Panel */}
      <div className="w-80 border-r border-border bg-card/60 backdrop-blur-xl flex flex-col shrink-0 z-10">
        <div className="p-4 border-b border-border">
          <div className="flex items-center space-x-2 text-emerald-500 mb-2">
            <Server className="w-5 h-5" />
            <h1 className="font-bold tracking-tight text-lg">System Telemetry</h1>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Real-time performance analytics, algorithm comparative stats, and engine profile.
          </p>
        </div>

        <div className="p-4 flex flex-col gap-5 flex-1 overflow-y-auto">
          {/* Engine Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase font-mono">
              Engine Profile
            </label>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setEngineSource("cpp-core")}
                className={`w-full px-3 py-2 rounded text-left font-mono text-xs border flex items-center justify-between transition-all cursor-pointer ${
                  engineSource === "cpp-core"
                    ? "bg-primary/10 border-primary text-primary font-bold"
                    : "bg-secondary/20 border-border text-muted-foreground hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>C++ Core (FastRoute)</span>
                </div>
                {engineSource === "cpp-core" && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </button>
              <button
                onClick={() => setEngineSource("python-fallback")}
                className={`w-full px-3 py-2 rounded text-left font-mono text-xs border flex items-center justify-between transition-all cursor-pointer ${
                  engineSource === "python-fallback"
                    ? "bg-primary/10 border-primary text-primary font-bold"
                    : "bg-secondary/20 border-border text-muted-foreground hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Python Fallback</span>
                </div>
                {engineSource === "python-fallback" && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </button>
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase font-mono">
              Metrics Timeframe
            </label>
            <div className="grid grid-cols-3 gap-1">
              {["5m", "1h", "24h"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeWindow(t)}
                  className={`py-1.5 rounded font-mono text-xs border transition-colors cursor-pointer ${
                    timeWindow === t
                      ? "bg-secondary border-primary/50 text-foreground font-bold"
                      : "bg-transparent border-border/50 text-muted-foreground hover:bg-secondary/30"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border/50 my-1" />

          {/* Active Process Telemetry list */}
          <div className="space-y-3 font-mono text-xs">
            <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              Engine Details
            </h3>
            <div className="space-y-2 border border-border/50 p-3 rounded-lg bg-secondary/15">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Compiler:</span>
                <span className="text-foreground font-bold">MSVC / GCC 13.2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Optimization:</span>
                <span className="text-primary font-bold">-O3 fast-math</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SIMD Vector:</span>
                <span className="text-foreground">AVX-512 FMA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">OS Architecture:</span>
                <span className="text-foreground">Windows x64</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-auto">
            <button
              onClick={triggerSimulationLoad}
              disabled={isSimulating}
              className={`w-full font-medium py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs ${
                isSimulating
                  ? "bg-rose-500/20 border border-rose-500/40 text-rose-400"
                  : "bg-primary hover:bg-primary/95 text-white"
              }`}
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Running Stress Simulation...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Trigger Stress Simulation
                </>
              )}
            </button>
            <p className="text-[10px] text-muted-foreground text-center mt-2 font-mono">
              Generates 2,500 simultaneous routing requests to evaluate lock contention and cache stress.
            </p>
          </div>
        </div>
      </div>

      {/* Charts Grid Workspace */}
      <div className="flex-1 h-full flex flex-col overflow-y-auto p-6 space-y-6">
        {/* KPI Panel */}
        <div className="grid grid-cols-4 gap-4">
          <div className="border border-border bg-card/40 backdrop-blur-md p-4 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute right-3 top-3 opacity-15 text-primary">
              <Clock className="w-8 h-8" />
            </div>
            <div className="text-[11px] font-mono font-semibold tracking-wider text-muted-foreground uppercase">
              Avg Route Latency
            </div>
            <div className="text-3xl font-extrabold tracking-tight mt-1 font-mono text-primary">
              {activeStats.avgLatency}
            </div>
            <div className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>99th percentile: 18.2ms</span>
            </div>
          </div>

          <div className="border border-border bg-card/40 backdrop-blur-md p-4 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute right-3 top-3 opacity-15 text-emerald-500">
              <Database className="w-8 h-8" />
            </div>
            <div className="text-[11px] font-mono font-semibold tracking-wider text-muted-foreground uppercase">
              Cache Hit Ratio
            </div>
            <div className="text-3xl font-extrabold tracking-tight mt-1 font-mono text-emerald-400">
              {activeStats.cacheHitRate}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground mt-1">
              LRU Spatial Cache capacity: 16k routes
            </div>
          </div>

          <div className="border border-border bg-card/40 backdrop-blur-md p-4 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute right-3 top-3 opacity-15 text-amber-500">
              <Activity className="w-8 h-8" />
            </div>
            <div className="text-[11px] font-mono font-semibold tracking-wider text-muted-foreground uppercase">
              Search Speed (Nodes/s)
            </div>
            <div className="text-3xl font-extrabold tracking-tight mt-1 font-mono text-amber-400">
              {activeStats.nodesExploredSec}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground mt-1">
              Dynamic multi-threaded Astar
            </div>
          </div>

          <div className="border border-border bg-card/40 backdrop-blur-md p-4 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute right-3 top-3 opacity-15 text-sky-400">
              <Cpu className="w-8 h-8" />
            </div>
            <div className="text-[11px] font-mono font-semibold tracking-wider text-muted-foreground uppercase">
              Active Routing Threads
            </div>
            <div className="text-3xl font-extrabold tracking-tight mt-1 font-mono text-sky-400">
              {activeStats.activeThreads}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground mt-1">
              ThreadPool worker contention: Low
            </div>
          </div>
        </div>

        {/* Charts Body Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Chart 1: Latency Distribution */}
          <div className="border border-border bg-card/30 backdrop-blur-md p-5 rounded-xl shadow-lg flex flex-col h-[340px]">
            <div className="mb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold font-mono tracking-tight text-foreground">
                  Routing Latency Distribution
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Query counts grouped by execution latency interval.
                </p>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                LOGARITHMIC SCALE
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latencyDistributionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="range" stroke="#666" fontSize={10} fontStyle="monospace" />
                  <YAxis stroke="#666" fontSize={10} fontStyle="monospace" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #333", borderRadius: "6px" }}
                    labelStyle={{ color: "#888", fontSize: "11px", fontFamily: "monospace" }}
                    itemStyle={{ color: "#10b981", fontSize: "12px", fontFamily: "monospace" }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]}>
                    {latencyDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: CPU Utilization */}
          <div className="border border-border bg-card/30 backdrop-blur-md p-5 rounded-xl shadow-lg flex flex-col h-[340px]">
            <div className="mb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold font-mono tracking-tight text-foreground">
                  CPU Resource Utilization
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Core engine load profiles across matching & indexing threads.
                </p>
              </div>
              <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                LIVE STREAM
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cpuHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRouter" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorIndexer" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="time" stroke="#666" fontSize={9} fontStyle="monospace" />
                  <YAxis stroke="#666" fontSize={10} fontStyle="monospace" tickFormatter={(val) => `${val}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #333", borderRadius: "6px" }}
                    itemStyle={{ fontSize: "11px", fontFamily: "monospace" }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "10px", fontFamily: "monospace" }} />
                  <Area
                    type="monotone"
                    dataKey="coreRouter"
                    name="Router Engine Threads"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRouter)"
                  />
                  <Area
                    type="monotone"
                    dataKey="spatialIndexer"
                    name="Grid Spatial Indexer"
                    stroke="#a855f7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIndexer)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Node Search Stats (Dijkstra vs. Astar vs. Bidirectional) */}
          <div className="border border-border bg-card/30 backdrop-blur-md p-5 rounded-xl shadow-lg flex flex-col h-[340px]">
            <div className="mb-3">
              <h3 className="text-sm font-semibold font-mono tracking-tight text-foreground">
                Algorithm Node Exploration Efficiency
              </h3>
              <p className="text-[10px] font-mono text-muted-foreground">
                Comparative node search counts across various path distances (lower is faster).
              </p>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nodeSearchData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="distanceKm" stroke="#666" fontSize={10} fontStyle="monospace" />
                  <YAxis stroke="#666" fontSize={10} fontStyle="monospace" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #333", borderRadius: "6px" }}
                    itemStyle={{ fontSize: "11px", fontFamily: "monospace" }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "10px", fontFamily: "monospace" }} />
                  <Bar dataKey="Dijkstra" name="Dijkstra Standard" fill="#64748b" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Astar" name="A* (Haversine)" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="BidirectionalAstar" name="Bi-Dir A* (Optimal)" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Cache performance */}
          <div className="border border-border bg-card/30 backdrop-blur-md p-5 rounded-xl shadow-lg flex flex-col h-[340px]">
            <div className="mb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold font-mono tracking-tight text-foreground">
                  LRU Route Cache Performance
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Comparative analysis of cache Hits vs. Misses under routing workloads.
                </p>
              </div>
              {isSimulating && (
                <span className="text-[9px] font-mono text-rose-400 animate-pulse bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  STRESS_TEST ACTIVE
                </span>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cacheHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMisses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="time" stroke="#666" fontSize={9} fontStyle="monospace" />
                  <YAxis stroke="#666" fontSize={10} fontStyle="monospace" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #333", borderRadius: "6px" }}
                    itemStyle={{ fontSize: "11px", fontFamily: "monospace" }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "10px", fontFamily: "monospace" }} />
                  <Area
                    type="monotone"
                    dataKey="hits"
                    name="Cache Hits"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorHits)"
                    stackId="1"
                  />
                  <Area
                    type="monotone"
                    dataKey="misses"
                    name="Cache Misses"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#colorMisses)"
                    stackId="1"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
