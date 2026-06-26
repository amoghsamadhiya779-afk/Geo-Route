"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Compass,
  TrendingUp,
  Brain,
  Clock,
  Target,
  BarChart3,
  Database,
  Zap,
  ChevronDown,
  Play,
  RefreshCw,
} from "lucide-react";
import { useTrentStore } from "@/store/useTrentStore";
import { CITIES } from "@/lib/constants";
import { ChartPanel } from "@/components/ui/ChartPanel";
import { PredictionKpiCard as KpiCard } from "@/components/ui/PredictionKpiCard";
import { API_BASE } from "@/lib/api";

//  Constants 

const MODELS = ["Linear Regression", "Random Forest", "Neural Network"];

const HOURS_LABELS = Array.from({ length: 48 }, (_, i) => {
  const h = i % 24;
  const suffix = i < 24 ? "Today" : "Tomorrow";
  return `${String(h).padStart(2, "0")}:00`;
});

//  Data Generators 

function generateTrafficDensity(seed: number) {
  return Array.from({ length: 48 }, (_, i) => {
    const base =
      40 +
      30 * Math.sin((i / 48) * Math.PI * 2 - Math.PI / 2) +
      15 * Math.sin((i / 12) * Math.PI);
    const noise = (Math.sin(seed * 100 + i * 7.3) * 0.5 + 0.5) * 12 - 6;
    const predicted = Math.max(5, Math.min(100, base + noise));
    const confidence = 4 + (i / 48) * 14;
    return {
      hour: HOURS_LABELS[i],
      idx: i,
      predicted: +predicted.toFixed(1),
      upper: +(predicted + confidence).toFixed(1),
      lower: +Math.max(0, predicted - confidence).toFixed(1),
    };
  });
}

function generateRouteCost(seed: number) {
  return Array.from({ length: 48 }, (_, i) => {
    const base = 12 + 8 * Math.sin((i / 48) * Math.PI * 2 - Math.PI / 3);
    const secondary = 4 * Math.cos((i / 24) * Math.PI * 2);
    const noise = (Math.sin(seed * 77 + i * 3.7) * 0.5 + 0.5) * 5 - 2.5;
    return {
      hour: HOURS_LABELS[i],
      idx: i,
      travelTime: +Math.max(4, base + secondary + noise).toFixed(1),
      fuelCost: +(2.4 + 1.8 * Math.sin((i / 48) * Math.PI * 2) + noise * 0.3).toFixed(2),
    };
  });
}

function generateModelAccuracy(seed: number) {
  const base = [
    { model: "Linear Reg.", rmse: 6.2, mae: 4.8, r2: 87.3 },
    { model: "Random Forest", rmse: 4.1, mae: 3.2, r2: 93.1 },
    { model: "Neural Net", rmse: 3.4, mae: 2.6, r2: 95.7 },
    { model: "Ensemble", rmse: 3.1, mae: 2.3, r2: 96.4 },
  ];
  return base.map((m) => ({
    ...m,
    rmse: +(m.rmse + (Math.sin(seed * 13 + m.rmse) * 0.3)).toFixed(2),
    mae: +(m.mae + (Math.sin(seed * 17 + m.mae) * 0.2)).toFixed(2),
    r2: +(m.r2 + (Math.sin(seed * 23 + m.r2) * 0.4)).toFixed(1),
  }));
}

function generateHistoricalVsPredicted(seed: number) {
  return Array.from({ length: 48 }, (_, i) => {
    const actual =
      55 +
      25 * Math.sin((i / 48) * Math.PI * 2 - Math.PI / 2) +
      10 * Math.cos((i / 16) * Math.PI * 2);
    const noise = Math.sin(seed * 41 + i * 2.9) * 6;
    const predNoise = Math.sin(seed * 59 + i * 4.1) * 3;
    return {
      hour: HOURS_LABELS[i],
      idx: i,
      actual: +Math.max(10, actual + noise).toFixed(1),
      predicted: +Math.max(10, actual + predNoise).toFixed(1),
    };
  });
}

//  Custom Tooltip 

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs font-mono text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs font-mono" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

//  Component 

export default function PredictionsPage() {
  const activeCityId = useTrentStore((s) => s.activeCityId);
  const setActiveCity = useTrentStore((s) => s.setActiveCity);
  const displayCity = CITIES.find(c => c.toLowerCase().replace(" ", "-") === activeCityId) || "Manhattan";

  const [mounted, setMounted] = useState(false);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [futureHours, setFutureHours] = useState(24);
  const [model, setModel] = useState("Neural Network");
  const [confidence, setConfidence] = useState(90);
  const [tick, setTick] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dataPoints, setDataPoints] = useState(1_847_293);
  const tickRef = useRef(0);

  // Hydration guard
  useEffect(() => {
    setMounted(true);
  }, []);

  // Live update interval
  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      tickRef.current += 1;
      setTick(tickRef.current);
      setDataPoints((prev) => prev + Math.floor(Math.random() * 120 + 30));
    }, 3000);
    return () => clearInterval(interval);
  }, [mounted]);

  // Generate forecast simulation
  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      tickRef.current += 1;
      setTick(tickRef.current);
      setIsGenerating(false);
    }, 1200);
  }, []);

  const seed = tick * 0.1 + CITIES.indexOf(displayCity) * 3.7;
  
  const { data: timeseriesData, isLoading, error } = useQuery({
    queryKey: ['timeseries', activeCityId, futureHours],
    queryFn: async () => {
      const cityId = activeCityId || "manhattan";
      const res = await fetch(`${API_BASE}/predict/timeseries?city_id=${cityId}&hours=${futureHours}`);
      if (!res.ok) throw new Error("Failed to fetch predictions");
      const json = await res.json();
      return json.timeseries || [];
    },
    refetchInterval: 3000,
  });

  const trafficData = useMemo(() => {
    if (timeseriesData && timeseriesData.length > 0) {
      return timeseriesData.map((pt: any, i: number) => {
        const dt = new Date(pt.timestamp * 1000);
        return {
          time: `${dt.getHours().toString().padStart(2, "0")}:00`,
          predicted: pt.predicted,
          upper: pt.upper,
          lower: pt.lower,
          actual: i < 12 ? pt.predicted + (Math.random() * 6 - 3) : null
        };
      });
    }
    return generateTrafficDensity(seed);
  }, [timeseriesData, seed]);

  const routeData = useMemo(() => generateRouteCost(seed), [seed]);
  const accuracyData = useMemo(() => generateModelAccuracy(seed), [seed]);
  const histData = useMemo(() => generateHistoricalVsPredicted(seed), [seed]);

  // Slice based on future hours
  const slicedTraffic = trafficData.slice(0, futureHours);
  const slicedRoute = routeData.slice(0, futureHours);
  const slicedHist = histData.slice(0, futureHours);

  // KPIs
  const modelIdx = MODELS.indexOf(model);
  const predictionAccuracy = (91.2 + modelIdx * 2.1 + Math.sin(seed) * 0.8).toFixed(1);
  const activeModels = 3 + Math.floor(Math.sin(seed * 1.3) * 0.5 + 0.5);

  if (!mounted) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#000000]">
        <Compass className="w-8 h-8 text-[#00f0ff] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex bg-[#000000] relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      {/*  Left Control Panel  */}
      <aside className="w-80 shrink-0 border-r border-border bg-card/50 backdrop-blur-xl z-10 flex flex-col overflow-y-auto">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[#8052ff]/10 border border-[#8052ff]/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#8052ff]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Prediction Engine
              </h2>
              <p className="text-[10px] font-mono text-[#00f0ff]">
                TRENT-ML v4.2 ONLINE
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-6 flex-1">
          {/* City Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Target City
            </label>
            <div className="relative">
              <button
                onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-secondary/40 hover:bg-secondary/60 text-sm font-mono transition-colors"
              >
                <span>{displayCity}</span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${cityDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {cityDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-border rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto">
                  {CITIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setActiveCity(c.toLowerCase().replace(" ", "-"));
                        setCityDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm font-mono hover:bg-white/[0.02] transition-colors ${
                        c === displayCity
                          ? "text-[#00f0ff] bg-[#8052ff]/10"
                          : "text-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Future Time Slider */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Forecast Horizon
            </label>
            <input
              type="range"
              min={1}
              max={48}
              value={futureHours}
              onChange={(e) => setFutureHours(+e.target.value)}
              className="w-full accent-[#00f0ff] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>1h</span>
              <span className="text-[#00f0ff] text-xs font-semibold">
                {futureHours}h
              </span>
              <span>48h</span>
            </div>
          </div>

          {/* Prediction Model Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Prediction Model
            </label>
            <div className="space-y-1.5">
              {MODELS.map((m) => (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className={`w-full text-left px-3 py-2 rounded-xl border text-xs font-mono transition-all ${
                    m === model
                      ? "border-[#8052ff]/50 bg-[#8052ff]/10 text-[#00f0ff]"
                      : "border-border bg-secondary/20 text-muted-foreground hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        m === model ? "bg-[#00f0ff]" : "bg-muted-foreground/30"
                      }`}
                    />
                    {m}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Confidence Threshold */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Confidence Threshold
            </label>
            <input
              type="range"
              min={50}
              max={99}
              value={confidence}
              onChange={(e) => setConfidence(+e.target.value)}
              className="w-full accent-[#00f0ff] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>50%</span>
              <span className="text-[#00f0ff] text-xs font-semibold">
                {confidence}%
              </span>
              <span>99%</span>
            </div>
          </div>

          {/* Generate Forecast */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#8052ff] to-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.2)] hover:opacity-90 disabled:opacity-60 text-white text-sm font-semibold transition-all"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isGenerating ? "Computing…" : "Generate Forecast"}
          </button>

          {/* Status Footer */}
          <div className="mt-auto pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-muted-foreground">Engine Status</span>
              <span className="text-[#00f0ff] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
                ACTIVE
              </span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-muted-foreground">GPU Cluster</span>
              <span className="text-[#8052ff]">4× A100 80GB</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-muted-foreground">Last Trained</span>
              <span className="text-muted-foreground">2 min ago</span>
            </div>
          </div>
        </div>
      </aside>

      {/*  Main Content  */}
      <main className="flex-1 overflow-y-auto z-10">
        <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                <Compass className="w-6 h-6 text-[#8052ff]" />
                Predictive Models
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Time-series traffic prediction for{" "}
                <span className="text-[#00f0ff] font-mono">{displayCity}</span> •{" "}
                <span className="font-mono">{model}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
              LIVE FEED
            </div>
          </header>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={Target}
              label="Prediction Accuracy"
              value={`${predictionAccuracy}%`}
              sub="vs 91.8% baseline"
              color="emerald"
            />
            <KpiCard
              icon={Clock}
              label="Forecast Horizon"
              value={`${futureHours}h`}
              sub="configurable range"
              color="sky"
            />
            <KpiCard
              icon={Brain}
              label="Active Models"
              value={String(activeModels)}
              sub="ensemble pipeline"
              color="amber"
            />
            <KpiCard
              icon={Database}
              label="Data Points"
              value={dataPoints.toLocaleString()}
              sub="processed this session"
              color="violet"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/*  Traffic Density Prediction  */}
            <ChartPanel
              title="Traffic Density Prediction"
              subtitle={`${futureHours}h forecast • ${confidence}% CI`}
              icon={TrendingUp}
            >
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={slicedTraffic} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8052ff" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gradBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "#666", fontSize: 10 }}
                    interval={Math.max(1, Math.floor(futureHours / 8) - 1)}
                  />
                  <YAxis
                    tick={{ fill: "#666", fontSize: 10 }}
                    domain={[0, 120]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="transparent"
                    fill="url(#gradBand)"
                    name="Upper Bound"
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="transparent"
                    fill="transparent"
                    name="Lower Bound"
                  />
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    stroke="#00f0ff"
                    strokeWidth={2}
                    fill="url(#gradPredicted)"
                    name="Predicted Density"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>

            {/*  Route Cost Forecast  */}
            <ChartPanel
              title="Route Cost Forecast"
              subtitle="Travel time & fuel cost projections"
              icon={Zap}
            >
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={slicedRoute} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "#666", fontSize: 10 }}
                    interval={Math.max(1, Math.floor(futureHours / 8) - 1)}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: "#666", fontSize: 10 }}
                    label={{
                      value: "min",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: "#555", fontSize: 10 },
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#666", fontSize: 10 }}
                    label={{
                      value: "USD",
                      angle: 90,
                      position: "insideRight",
                      style: { fill: "#555", fontSize: 10 },
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="travelTime"
                    stroke="#8052ff"
                    strokeWidth={2}
                    dot={false}
                    name="Travel Time (min)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="fuelCost"
                    stroke="#00f0ff"
                    strokeWidth={2}
                    dot={false}
                    name="Fuel Cost (USD)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>

            {/*  Model Accuracy Comparison  */}
            <ChartPanel
              title="Model Accuracy Comparison"
              subtitle="RMSE / MAE by prediction model"
              icon={BarChart3}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={accuracyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis
                    dataKey="model"
                    tick={{ fill: "#666", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "#666", fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
                  />
                  <Bar
                    dataKey="rmse"
                    fill="#8052ff"
                    radius={[4, 4, 0, 0]}
                    name="RMSE"
                  />
                  <Bar
                    dataKey="mae"
                    fill="#00f0ff"
                    radius={[4, 4, 0, 0]}
                    name="MAE"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            {/*  Historical vs Predicted  */}
            <ChartPanel
              title="Historical vs Predicted"
              subtitle="Actual traffic overlay with model output"
              icon={Compass}
            >
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={slicedHist} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "#666", fontSize: 10 }}
                    interval={Math.max(1, Math.floor(futureHours / 8) - 1)}
                  />
                  <YAxis tick={{ fill: "#666", fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#64748b"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                    name="Actual (Historical)"
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#00f0ff"
                    strokeWidth={2}
                    dot={false}
                    name="Predicted (Model)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        </div>
      </main>
    </div>
  );
}

//  Sub-components 




