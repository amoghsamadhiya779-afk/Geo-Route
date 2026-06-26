"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  Activity, Sliders, Cloud, Clock, Zap, RefreshCw, Thermometer, Car,
} from "lucide-react";
import { useTrentStore } from "@/store/useTrentStore";
import { CITIES, WEATHER_OPTIONS, Weather, WEATHER_SPEED_FACTOR } from "@/lib/constants";
import { KpiCard } from "@/components/ui/KpiCard";

/*  helpers  */
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const ALGO_COLORS: Record<string, string> = {
  "Hybrid A*": "#ffb829",
  "RRT*": "#00f0ff",
  "Neural Planner": "#8052ff",
};

/*  data generators  */
function genTravelTimeCurve(density: number) {
  return Array.from({ length: 11 }, (_, i) => {
    const d = i * 10;
    const base = 8 + (d / 100) * 42;
    const noise = rand(-2, 2);
    const weatherBias = density > 60 ? rand(2, 6) : 0;
    return { density: `${d}%`, time: +(base + noise + weatherBias).toFixed(1) };
  });
}

function genAlgoPerformance(density: number, weather: Weather) {
  const wf = WEATHER_SPEED_FACTOR[weather];
  const loadFactor = 1 + density / 80;
  return [
    { algo: "Hybrid A*", latency: +(rand(12, 22) * loadFactor / wf).toFixed(1), nodes: Math.round(rand(42000, 78000) * loadFactor) },
    { algo: "RRT*", latency: +(rand(4, 10) * loadFactor / wf).toFixed(1), nodes: Math.round(rand(18000, 35000) * loadFactor) },
    { algo: "Neural Planner", latency: +(rand(2, 6) * loadFactor / wf).toFixed(1), nodes: Math.round(rand(8000, 18000) * loadFactor) },
  ];
}

function genWeatherSpeedCurves() {
  return Array.from({ length: 13 }, (_, i) => {
    const dist = i * 5;
    return {
      distance: `${dist}km`,
      Clear: +(120 - rand(0, 5)).toFixed(0),
      Rain: +(120 * 0.78 - rand(0, 8) - dist * 0.15).toFixed(0),
      Snow: +(120 * 0.55 - rand(0, 10) - dist * 0.2).toFixed(0),
      Fog: +(120 * 0.65 - rand(0, 6) - dist * 0.1).toFixed(0),
    };
  });
}

function genCongestionTimeline(density: number, roadClosures: boolean) {
  return Array.from({ length: 24 }, (_, h) => {
    const rushMorning = Math.exp(-((h - 8) ** 2) / 6) * 80;
    const rushEvening = Math.exp(-((h - 17) ** 2) / 8) * 90;
    const base = 10 + rushMorning + rushEvening;
    const closurePenalty = roadClosures ? rand(5, 15) : 0;
    return {
      hour: `${String(h).padStart(2, "0")}:00`,
      Highway: +clamp(base * (density / 60) + rand(-3, 3) + closurePenalty, 0, 100).toFixed(1),
      Urban: +clamp((base + 12) * (density / 55) + rand(-4, 4) + closurePenalty * 1.3, 0, 100).toFixed(1),
      Residential: +clamp((base * 0.5) * (density / 70) + rand(-2, 2) + closurePenalty * 0.5, 0, 100).toFixed(1),
    };
  });
}

/*  component  */
export default function SimulationPage() {
  const activeCityId = useTrentStore((s) => s.activeCityId);
  const displayCity = activeCityId 
    ? activeCityId.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") 
    : "Manhattan";

  const [mounted, setMounted] = useState(false);

  // simulation controls
  const [density, setDensity] = useState(45);
  const [weather, setWeather] = useState<Weather>("Clear");
  const [roadClosures, setRoadClosures] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(12);
  const [running, setRunning] = useState(false);
  const [simCount, setSimCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // chart data
  const [travelData, setTravelData] = useState(() => genTravelTimeCurve(45));
  const [algoData, setAlgoData] = useState(() => genAlgoPerformance(45, "Clear"));
  const [weatherData, setWeatherData] = useState(genWeatherSpeedCurves);
  const [congestionData, setCongestionData] = useState(() => genCongestionTimeline(45, false));

  // KPI
  const [kpis, setKpis] = useState({ eta: "12.4 min", load: 38, sims: 0, sync: "SYNCED" });

  useEffect(() => { setMounted(true); }, []);

  // Auto-update charts when controls change
  useEffect(() => {
    if (!mounted) return;
    setTravelData(genTravelTimeCurve(density));
    setAlgoData(genAlgoPerformance(density, weather));
    setWeatherData(genWeatherSpeedCurves());
    setCongestionData(genCongestionTimeline(density, roadClosures));
    setKpis((prev) => ({
      ...prev,
      eta: `${(8 + (density / 100) * 42 * (1 / WEATHER_SPEED_FACTOR[weather]) + (roadClosures ? rand(3, 8) : 0)).toFixed(1)} min`,
      load: Math.min(99, Math.round(density * 0.9 + rand(0, 10))),
    }));
  }, [density, weather, roadClosures, mounted]);

  const handleRunSimulation = () => {
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setRunning(false);
      setKpis((k) => ({ ...k, sync: "SYNCED" }));
      return;
    }

    setRunning(true);
    setKpis((k) => ({ ...k, sync: "LIVE" }));

    intervalRef.current = setInterval(() => {
      setSimCount((c) => c + 1);
      // Force random re-render noise while running
      setTravelData(genTravelTimeCurve(density));
      setAlgoData(genAlgoPerformance(density, weather));
      setCongestionData(genCongestionTimeline(density, roadClosures));
    }, 2400);
  };

  // cleanup interval on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  if (!mounted) return null;

  /*  render  */
  return (
    <div className="h-full w-full flex bg-[#000000] overflow-hidden relative">
      {/* dot grid bg */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)", backgroundSize: "32px 32px" }} />

      {/*  LEFT PANEL  */}
      <aside className="w-80 shrink-0 border-r border-border bg-card/50 backdrop-blur-xl p-6 flex flex-col gap-6 z-10 overflow-y-auto">
        <div className="flex items-center gap-2 mb-2">
          <Sliders className="w-5 h-5 text-[#8052ff]" />
          <h2 className="text-lg font-semibold tracking-tight">Simulation Controls</h2>
        </div>

        {/* Traffic Density */}
        <ControlGroup label="Traffic Density" icon={<Car className="w-4 h-4 text-amber-400" />} valueLabel={`${density}%`}>
          <input type="range" min={0} max={100} value={density} onChange={(e) => setDensity(+e.target.value)} className="w-full accent-[#00f0ff] cursor-pointer" />
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1"><span>0%</span><span>50%</span><span>100%</span></div>
        </ControlGroup>

        {/* Weather */}
        <ControlGroup label="Weather Impact" icon={<Cloud className="w-4 h-4 text-sky-400" />} valueLabel={weather}>
          <select value={weather} onChange={(e) => setWeather(e.target.value as Weather)} className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#00f0ff]/60 appearance-none cursor-pointer">
            {WEATHER_OPTIONS.filter((w) => {
              const tropicalCities = ["mumbai", "delhi", "sao-paulo", "singapore", "dubai", "rio"];
              if (w === "Snow" && activeCityId && tropicalCities.includes(activeCityId)) return false;
              return true;
            }).map((w) => (<option key={w} value={w}>{w}</option>))}
          </select>
        </ControlGroup>

        {/* Road Closures */}
        <ControlGroup label="Road Closures" icon={<Activity className="w-4 h-4 text-rose-400" />} valueLabel={roadClosures ? "Active" : "Inactive"}>
          <button onClick={() => setRoadClosures((v) => !v)} className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${roadClosures ? "bg-[#00f0ff]" : "bg-secondary"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${roadClosures ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </ControlGroup>

        {/* Time of Day */}
        <ControlGroup label="Time of Day" icon={<Clock className="w-4 h-4 text-violet-400" />} valueLabel={`${String(timeOfDay).padStart(2, "0")}:00`}>
          <input type="range" min={0} max={24} value={timeOfDay} onChange={(e) => setTimeOfDay(+e.target.value)} className="w-full accent-[#00f0ff] cursor-pointer" />
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1"><span>00:00</span><span>12:00</span><span>24:00</span></div>
        </ControlGroup>

        {/* Digital Twin Sandbox / Disruptions */}
        <div className="pt-4 border-t border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Inject Disruptions</h3>
          <div className="grid grid-cols-2 gap-2">
             <button 
               onClick={() => { setWeather("Rain"); setDensity(85); setRoadClosures(true); }}
               className="text-xs bg-white/5 border border-white/10 hover:border-[#00f0ff] hover:text-[#00f0ff] hover:bg-[#00f0ff]/10 rounded-lg py-2 transition-colors flex flex-col items-center gap-1 active:scale-95"
             >
               <Cloud className="w-4 h-4" /> Hurricane
             </button>
             <button 
               onClick={() => { setDensity(95); setRoadClosures(true); }}
               className="text-xs bg-white/5 border border-white/10 hover:border-[#8052ff] hover:text-[#8052ff] hover:bg-[#8052ff]/10 rounded-lg py-2 transition-colors flex flex-col items-center gap-1 active:scale-95"
             >
               <Activity className="w-4 h-4" /> Port Strike
             </button>
          </div>
        </div>

        <div className="border-t border-border my-1" />

        {/* Run Simulation */}
        <button onClick={handleRunSimulation} className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 ${running ? "bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30" : "bg-[#8052ff]/20 border border-[#8052ff]/40 text-[#00f0ff] hover:bg-[#00f0ff]/30"}`}>
          {running ? <><RefreshCw className="w-4 h-4 animate-spin" /> Stop Simulation</> : <><Zap className="w-4 h-4" /> Run Simulation</>}
        </button>

        {/* status indicator */}
        <div className="mt-auto pt-4 border-t border-border text-xs text-muted-foreground font-mono space-y-2">
          <div className="flex items-center justify-between"><span>Engine</span><span className="text-[#00f0ff]">v4.2.1 Online</span></div>
          <div className="flex items-center justify-between"><span>Twin Sync</span><span className={running ? "text-sky-400 animate-pulse" : "text-[#00f0ff]"}>{kpis.sync}</span></div>
          <div className="flex items-center justify-between"><span>Iterations</span><span>{simCount}</span></div>
        </div>
      </aside>

      {/*  MAIN CONTENT  */}
      <main className="flex-1 overflow-y-auto p-8 z-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
            Simulation Lab
            <span className="text-sm font-mono bg-[#8052ff]/10 text-[#00f0ff] px-3 py-1 rounded-full border border-[#8052ff]/20">
              {displayCity}
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">Digital Twin Environment &mdash; real-time parameter exploration &amp; algorithm benchmarking for {displayCity}</p>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <KpiCard icon={<Clock className="w-4 h-4" />} label="Estimated Travel Time" value={kpis.eta} accent="text-[#00f0ff]" />
          <KpiCard icon={<Thermometer className="w-4 h-4" />} label="Network Load" value={`${kpis.load}%`} accent={kpis.load > 80 ? "text-rose-400" : kpis.load > 55 ? "text-amber-400" : "text-[#00f0ff]"} />
          <KpiCard icon={<Activity className="w-4 h-4" />} label="Active Simulations" value={String(simCount)} accent="text-sky-400" />
          <KpiCard icon={<Zap className="w-4 h-4" />} label="Digital Twin Sync" value={kpis.sync} accent={running ? "text-sky-400 animate-pulse" : "text-[#00f0ff]"} />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/*  Travel Time vs Density  */}
          <ChartCard title="Travel Time vs Traffic Density" subtitle="Minutes by density level" icon={<Car className="w-4 h-4 text-[#8052ff]" />}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={travelData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="density" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} unit=" min" />
                <Tooltip contentStyle={{ background: "#141414", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="time" stroke="#00f0ff" strokeWidth={2} dot={{ r: 3, fill: "#00f0ff" }} activeDot={{ r: 5 }} animationDuration={600} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/*  Algorithm Performance  */}
          <ChartCard title="Algorithm Performance Under Load" subtitle="Latency (ms) — lower is better" icon={<Zap className="w-4 h-4 text-amber-400" />}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={algoData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="algo" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} unit=" ms" />
                <Tooltip contentStyle={{ background: "#141414", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="latency" radius={[4, 4, 0, 0]} animationDuration={600}>
                  {algoData.map((entry) => (
                    <Cell key={entry.algo} fill={ALGO_COLORS[entry.algo] ?? "#00f0ff"} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/*  Weather Impact on Speed  */}
          <ChartCard title="Weather Impact on Speed" subtitle="km/h over distance under each condition" icon={<Cloud className="w-4 h-4 text-sky-400" />}>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={weatherData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="distance" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} unit=" km/h" />
                <Tooltip contentStyle={{ background: "#141414", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Clear" stroke="#00f0ff" fill="#00f0ff" fillOpacity={0.15} strokeWidth={2} animationDuration={600} />
                <Area type="monotone" dataKey="Rain" stroke="#8052ff" fill="#8052ff" fillOpacity={0.1} strokeWidth={2} animationDuration={600} />
                <Area type="monotone" dataKey="Snow" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} animationDuration={600} />
                <Area type="monotone" dataKey="Fog" stroke="#ffb829" fill="#ffb829" fillOpacity={0.1} strokeWidth={2} animationDuration={600} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/*  Congestion Heatmap Timeline  */}
          <ChartCard title="Congestion Heatmap Timeline" subtitle="24-hour congestion % by road type" icon={<Activity className="w-4 h-4 text-rose-400" />}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={congestionData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#888" }} interval={3} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} unit="%" />
                <Tooltip contentStyle={{ background: "#141414", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Highway" stroke="#f43f5e" strokeWidth={2} dot={false} animationDuration={600} />
                <Line type="monotone" dataKey="Urban" stroke="#ffb829" strokeWidth={2} dot={false} animationDuration={600} />
                <Line type="monotone" dataKey="Residential" stroke="#00f0ff" strokeWidth={2} dot={false} animationDuration={600} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </main>
    </div>
  );
}

/*  sub-components  */

function ControlGroup({ label, icon, valueLabel, children }: { label: string; icon: React.ReactNode; valueLabel: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium">{icon}{label}</span>
        <span className="text-xs font-mono text-[#00f0ff] bg-[#8052ff]/10 px-2 py-0.5 rounded">{valueLabel}</span>
      </div>
      {children}
    </div>
  );
}



function ChartCard({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-card/50 backdrop-blur rounded-2xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">{icon}{title}</h3>
      </div>
      <p className="text-[11px] font-mono text-muted-foreground mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

