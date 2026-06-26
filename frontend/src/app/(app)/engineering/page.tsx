"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Code2,
  Server,
  Database,
  Cpu,
  GitBranch,
  Activity,
  CheckCircle,
  Layers,
  Box,
  ArrowRight,
} from "lucide-react";

//  Mock Data 
const COMPONENTS = [
  { id: "cpp", label: "C++ Core", icon: Cpu, desc: "Dijkstra / A* / CH engine" },
  { id: "fastapi", label: "Python FastAPI", icon: Server, desc: "REST + WebSocket gateway" },
  { id: "nextjs", label: "Next.js Frontend", icon: Layers, desc: "React 19 + Deck.gl renderer" },
  { id: "ml", label: "ML Pipeline", icon: GitBranch, desc: "scikit-learn ETA models" },
] as const;

const BUILD_STATUSES = [
  { label: "C++ Core", status: "Compiled", ok: true },
  { label: "FastAPI", status: "Running", ok: true },
  { label: "Frontend", status: "Hot-Reload", ok: true },
  { label: "ML Pipeline", status: "Trained", ok: true },
];

const API_ENDPOINTS = [
  { method: "POST", path: "/api/v1/route", status: "ok" },
  { method: "POST", path: "/api/v1/predict", status: "ok" },
  { method: "GET", path: "/api/v1/cities", status: "ok" },
  { method: "GET", path: "/api/v1/engineering/stats", status: "warn" },
];

const COMPILE_DATA = [
  { module: "graph_core", time: 4.2 },
  { module: "dijkstra", time: 2.8 },
  { module: "astar", time: 3.1 },
  { module: "ch_build", time: 8.7 },
  { module: "osm_parse", time: 5.4 },
  { module: "csr_store", time: 1.9 },
];

function generateLatencyData() {
  const points = [];
  for (let i = 0; i < 20; i++) {
    points.push({
      ts: `T-${20 - i}`,
      route: +(8 + Math.random() * 6).toFixed(1),
      predict: +(12 + Math.random() * 8).toFixed(1),
      cities: +(2 + Math.random() * 3).toFixed(1),
      stats: +(4 + Math.random() * 4).toFixed(1),
    });
  }
  return points;
}

//  Main Page 
export default function EngineeringPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState("cpp");
  const [latencyData, setLatencyData] = useState(generateLatencyData);
  const [uptime, setUptime] = useState(99.97);
  const [graphNodes, setGraphNodes] = useState(2_847_312);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Live-update latency data
  useEffect(() => {
    if (!mounted) return;
    const iv = setInterval(() => {
      setLatencyData((prev) => {
        const next = [...prev.slice(1)];
        const last = prev[prev.length - 1];
        const idx = parseInt(last.ts.replace("T-", ""), 10);
        next.push({
          ts: `T-${idx > 1 ? idx - 1 : 0}`,
          route: +(8 + Math.random() * 6).toFixed(1),
          predict: +(12 + Math.random() * 8).toFixed(1),
          cities: +(2 + Math.random() * 3).toFixed(1),
          stats: +(4 + Math.random() * 4).toFixed(1),
        });
        return next;
      });
      setUptime((u) => +(u + (Math.random() * 0.002 - 0.001)).toFixed(4));
      setGraphNodes((n) => n + Math.floor(Math.random() * 50));
    }, 3000);
    return () => clearInterval(iv);
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="h-full w-full flex bg-[#000000] overflow-hidden">
      {/*  Left Control Panel  */}
      <aside className="w-80 shrink-0 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#8052ff]" />
            Engineering Console
          </h2>
        </div>

        {/* Component Selector */}
        <div className="p-4 border-b border-border space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            System Components
          </span>
          <div className="mt-2 space-y-1">
            {COMPONENTS.map((c) => {
              const Icon = c.icon;
              const active = selectedComponent === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedComponent(c.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-2xl flex items-center gap-3 transition-all text-sm ${
                    active
                      ? "bg-[#8052ff]/10 border border-[#00f0ff]/30 text-[#00f0ff]"
                      : "hover:bg-white/5 border border-transparent text-muted-foreground"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-[#8052ff]" : "text-muted-foreground"}`} />
                  <div className="flex flex-col">
                    <span className="font-medium text-xs">{c.label}</span>
                    <span className="text-[10px] text-muted-foreground">{c.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Build Status */}
        <div className="p-4 border-b border-border space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            Build Status
          </span>
          <div className="mt-2 space-y-2">
            {BUILD_STATUSES.map((b) => (
              <div key={b.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${b.ok ? "bg-[#00f0ff] shadow-[0_0_6px_rgba(16,185,129,.6)]" : "bg-rose-500"}`} />
                  <span className="text-muted-foreground">{b.label}</span>
                </div>
                <span className="font-mono text-[#00f0ff] text-[10px]">{b.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API Endpoints */}
        <div className="p-4 space-y-1 flex-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            API Endpoints
          </span>
          <div className="mt-2 space-y-2">
            {API_ENDPOINTS.map((ep) => (
              <div key={ep.path} className="flex items-start gap-2 text-xs group">
                <span
                  className={`mt-1.5 w-2 h-2 shrink-0 rounded-full ${
                    ep.status === "ok"
                      ? "bg-[#00f0ff] shadow-[0_0_6px_rgba(16,185,129,.5)]"
                      : "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,.5)]"
                  }`}
                />
                <div className="flex flex-col">
                  <span
                    className={`font-mono font-semibold text-[10px] ${
                      ep.method === "POST" ? "text-sky-400" : "text-amber-400"
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-muted-foreground text-[11px] group-hover:text-foreground transition-colors">
                    {ep.path}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="text-[10px] font-mono text-muted-foreground text-center">
            TRENT OS v3.2.1 — build 20260620
          </div>
        </div>
      </aside>

      {/*  Main Content  */}
      <main className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Page Header */}
        <header>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Engineering &amp; Schema</h1>
          <p className="text-sm text-muted-foreground font-mono">
            System architecture, build metrics, and internal API diagnostics
          </p>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Build Time"
            value="26.1s"
            sub="C++ full recompile"
            icon={Box}
            color="text-sky-400"
          />
          <KpiCard
            label="Test Coverage"
            value="94.2%"
            sub="+1.3% this sprint"
            icon={CheckCircle}
            color="text-[#00f0ff]"
          />
          <KpiCard
            label="API Uptime"
            value={`${uptime.toFixed(2)}%`}
            sub="Last 30 days"
            icon={Activity}
            color="text-amber-400"
          />
          <KpiCard
            label="Graph Nodes Loaded"
            value={graphNodes.toLocaleString()}
            sub="CSR adjacency store"
            icon={Database}
            color="text-violet-400"
          />
        </div>

        {/* System Architecture Diagram */}
        <section className="border border-border bg-card/50 backdrop-blur rounded-xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#8052ff]" />
            System Architecture
          </h2>

          <div className="flex flex-col items-center gap-2">
            {/* Main Pipeline Row */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <ArchBox
                icon={Layers}
                title="Frontend"
                tech="Next.js + Deck.gl"
                desc="Interactive map UI and route visualisation"
                accent="border-sky-500/40 bg-sky-500/5"
                iconColor="text-sky-400"
              />
              <ArrowConnector />
              <ArchBox
                icon={Server}
                title="API Gateway"
                tech="Python FastAPI"
                desc="REST endpoints, validation, auth middleware"
                accent="border-[#8052ff]/40 bg-[#00f0ff]/5"
                iconColor="text-[#00f0ff]"
              />
              <ArrowConnector />
              <ArchBox
                icon={Cpu}
                title="Algorithm Engine"
                tech="C++ Core (pybind11)"
                desc="Dijkstra, A*, Contraction Hierarchies"
                accent="border-amber-500/40 bg-amber-500/5"
                iconColor="text-amber-400"
              />
              <ArrowConnector />
              <ArchBox
                icon={Database}
                title="Graph Store"
                tech="CSR / OSM"
                desc="Compressed sparse row adjacency, OSM extracts"
                accent="border-violet-500/40 bg-violet-500/5"
                iconColor="text-violet-400"
              />
            </div>

            {/* Vertical connector from API Gateway down to ML */}
            <div className="flex items-center gap-3 mt-1">
              <div className="w-[172px]" /> {/* spacer for Frontend box + arrow */}
              <div className="flex flex-col items-center">
                <div className="w-px h-6 bg-gradient-to-b from-[#00f0ff]/60 to-rose-500/60" />
                <div className="w-2 h-2 rounded-full bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,.5)]" />
              </div>
            </div>

            {/* ML Side Branch */}
            <div className="flex items-center gap-3">
              <ArchBox
                icon={GitBranch}
                title="ML Pipeline"
                tech="scikit-learn"
                desc="ETA prediction, demand forecasting models"
                accent="border-rose-500/40 bg-rose-500/5"
                iconColor="text-rose-400"
              />
              <ArrowConnector />
              <ArchBox
                icon={Database}
                title="Prediction Cache"
                tech="Redis / In-Memory"
                desc="Sub-ms cached model inference results"
                accent="border-orange-500/40 bg-orange-500/5"
                iconColor="text-orange-400"
              />
            </div>
          </div>
        </section>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Build Metrics – BarChart */}
          <section className="border border-border bg-card/50 backdrop-blur rounded-xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <Box className="w-4 h-4 text-sky-400" />
              C++ Build Metrics
            </h2>
            <p className="text-xs text-muted-foreground mb-4 font-mono">
              Compile time per module (seconds)
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={COMPILE_DATA} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="module"
                    tick={{ fill: "#888", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <YAxis
                    tick={{ fill: "#888", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    unit="s"
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111",
                      border: "1px solid rgba(255,255,255,.1)",
                      borderRadius: 8,
                      fontSize: 11,
                      fontFamily: "monospace",
                    }}
                  />
                  <Bar dataKey="time" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Compile Time" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* API Response Times – LineChart */}
          <section className="border border-border bg-card/50 backdrop-blur rounded-xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00f0ff]" />
              API Response Latency
            </h2>
            <p className="text-xs text-muted-foreground mb-4 font-mono">
              Endpoint P95 latency (ms) — live
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="ts"
                    tick={{ fill: "#888", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <YAxis
                    tick={{ fill: "#888", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    unit="ms"
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111",
                      border: "1px solid rgba(255,255,255,.1)",
                      borderRadius: 8,
                      fontSize: 11,
                      fontFamily: "monospace",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
                  />
                  <Line type="monotone" dataKey="route" stroke="#00f0ff" strokeWidth={2} dot={false} name="/route" />
                  <Line type="monotone" dataKey="predict" stroke="#ffb829" strokeWidth={2} dot={false} name="/predict" />
                  <Line type="monotone" dataKey="cities" stroke="#38bdf8" strokeWidth={2} dot={false} name="/cities" />
                  <Line type="monotone" dataKey="stats" stroke="#a78bfa" strokeWidth={2} dot={false} name="/stats" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Code Statistics Panel */}
        <section className="border border-border bg-card/50 backdrop-blur rounded-xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#8052ff]" />
            Codebase Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatBlock label="Total Lines of Code" value="48,217" sub="C++ / Python / TypeScript" />
            <StatBlock label="Test Coverage" value="94.2%" sub="1,847 test cases" />
            <StatBlock label="Algorithms" value="5" sub="Hybrid A*, RRT*, Neural Planner, MPC, D* Lite" />
            <StatBlock label="Cities Supported" value="12" sub="NYC, Paris, Tokyo, London, Berlin, Mumbai…" />
          </div>
        </section>
      </main>
    </div>
  );
}

//  Sub-components 

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="border border-border bg-card/50 backdrop-blur rounded-xl p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          {label}
        </span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <span className="text-2xl font-bold font-mono tracking-tight">{value}</span>
      <span className="text-[11px] text-muted-foreground font-mono">{sub}</span>
    </div>
  );
}

function ArchBox({
  icon: Icon,
  title,
  tech,
  desc,
  accent,
  iconColor,
}: {
  icon: React.ElementType;
  title: string;
  tech: string;
  desc: string;
  accent: string;
  iconColor: string;
}) {
  return (
    <div
      className={`border rounded-xl p-4 w-40 flex flex-col items-center text-center gap-1 backdrop-blur ${accent}`}
    >
      <Icon className={`w-6 h-6 mb-1 ${iconColor}`} />
      <span className="text-xs font-semibold">{title}</span>
      <span className="text-[10px] font-mono text-muted-foreground">{tech}</span>
      <span className="text-[9px] text-muted-foreground leading-tight mt-1">{desc}</span>
    </div>
  );
}

function ArrowConnector() {
  return (
    <div className="flex items-center gap-0.5 text-[#8052ff]/60">
      <div className="w-6 h-px bg-[#00f0ff]/40" />
      <ArrowRight className="w-3 h-3" />
    </div>
  );
}

function StatBlock({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
        {label}
      </span>
      <span className="text-2xl font-bold font-mono text-[#00f0ff]">{value}</span>
      <span className="text-[10px] text-muted-foreground">{sub}</span>
    </div>
  );
}


