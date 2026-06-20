"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
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
  Cell,
} from "recharts";
import {
  Brain,
  Cpu,
  GitBranch,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  TrendingUp,
} from "lucide-react";

//  Types 

type Algorithm = "A*" | "Dijkstra" | "Bidirectional A*" | "Contraction Hierarchies";

interface TimelineStep {
  id: number;
  title: string;
  description: string;
  detail: string;
  status: "optimal" | "considered" | "rejected";
}

interface HeuristicNode {
  node: string;
  fn: number;
  gn: number;
  hn: number;
}

interface RacePoint {
  step: number;
  "A*": number;
  Dijkstra: number;
  "Bidirectional A*": number;
  "Contraction Hierarchies": number;
}

interface KPI {
  label: string;
  value: string;
  delta: string;
  icon: React.ElementType;
  color: string;
}

interface DecisionSummary {
  winner: Algorithm;
  reason: string;
  nodesExplored: number;
  timeSaved: string;
  pathCost: number;
}

//  Data generators 

const r = (min: number, max: number, dec = 1) =>
  +(Math.random() * (max - min) + min).toFixed(dec);

function generateTimeline(algo: Algorithm, depth: number): TimelineStep[] {
  const lat1 = r(40.7, 40.8, 4);
  const lon1 = r(-74.02, -73.95, 4);
  const lat2 = r(40.7, 40.8, 4);
  const lon2 = r(-74.02, -73.95, 4);

  const base: TimelineStep[] = [
    {
      id: 1,
      title: "Initial Node Selection",
      description: `Source node (${lat1}, ${lon1}) → Target node (${lat2}, ${lon2})`,
      detail: `Graph loaded with ${(r(12, 48, 0))}K nodes • ${algo} initialized • Open set seeded with source`,
      status: "optimal",
    },
    {
      id: 2,
      title: "Neighbor Evaluation",
      description: `f(n) = g(n) + h(n) = ${r(2, 5)} + ${r(1, 4)} = ${r(4, 9)}`,
      detail: `Evaluated ${r(6, 24, 0)} neighbors • Pruned ${r(2, 8, 0)} dead-ends • Heuristic: Haversine distance`,
      status: "optimal",
    },
    {
      id: 3,
      title: "Path Cost Comparison",
      description: `A* cost: ${r(6, 12)} | Dijkstra cost: ${r(10, 18)}`,
      detail: `A* explored ${r(40, 65, 0)}% fewer nodes • Bidirectional met at midpoint (${r(40.72, 40.78, 4)}, ${r(-74.0, -73.96, 4)})`,
      status: "considered",
    },
    {
      id: 4,
      title: "Optimal Path Selected",
      description: `${algo} converged in ${r(12, 85, 0)}ms with cost ${r(5, 12)}`,
      detail: `Final path: ${r(8, 22, 0)} edges • Total distance: ${r(2.1, 8.4)} km • Confidence: ${r(91, 99)}%`,
      status: "optimal",
    },
    {
      id: 5,
      title: "Post-Optimization Pass",
      description: `Edge relaxation reduced cost by ${r(3, 12, 1)}%`,
      detail: `Smoothing applied over ${r(3, 7, 0)} segments • Turn penalty: ${r(0.1, 0.5)} • Elevation delta: ${r(5, 45, 0)}m`,
      status: "rejected",
    },
  ];

  return base.slice(0, Math.max(depth, 2));
}

function generateHeuristicData(): HeuristicNode[] {
  const labels = ["N₁₇", "N₃₄", "N₅₁", "N₆₈", "N₈₂", "N₉₅", "N₁₁₃", "N₁₂₇"];
  return labels.map((node) => {
    const gn = r(1, 8);
    const hn = r(0.5, 6);
    return { node, gn, hn, fn: +(gn + hn).toFixed(1) };
  });
}

function generateRaceData(): RacePoint[] {
  let a = 0, d = 0, b = 0, c = 0;
  return Array.from({ length: 16 }, (_, i) => {
    a += Math.round(r(20, 90, 0));
    d += Math.round(r(50, 160, 0));
    b += Math.round(r(15, 70, 0));
    c += Math.round(r(5, 40, 0));
    return {
      step: (i + 1) * 5,
      "A*": a,
      Dijkstra: d,
      "Bidirectional A*": b,
      "Contraction Hierarchies": c,
    };
  });
}

function generateKPIs(): KPI[] {
  return [
    {
      label: "Decision Confidence",
      value: `${r(91, 99.5)}%`,
      delta: `+${r(0.5, 3.2)}% vs baseline`,
      icon: Brain,
      color: "text-emerald-400",
    },
    {
      label: "Heuristic Accuracy",
      value: `${r(87, 97)}%`,
      delta: `${r(0.2, 1.8)}% margin`,
      icon: TrendingUp,
      color: "text-sky-400",
    },
    {
      label: "Path Optimality Score",
      value: `${r(0.94, 0.995, 3)}`,
      delta: `Top ${r(1, 5, 0)}% percentile`,
      icon: Zap,
      color: "text-amber-400",
    },
    {
      label: "Computation Savings",
      value: `${r(38, 72, 1)}%`,
      delta: `${r(120, 480, 0)}ms saved`,
      icon: Cpu,
      color: "text-rose-400",
    },
  ];
}

function generateSummary(algo: Algorithm): DecisionSummary {
  const reasons: Record<Algorithm, string> = {
    "A*":
      "A* leveraged admissible Haversine heuristic to prune 62% of the search space while maintaining optimality guarantees.",
    Dijkstra:
      "Dijkstra provided guaranteed shortest path via exhaustive exploration—selected due to negative-weight edges in the subgraph.",
    "Bidirectional A*":
      "Bidirectional search from both endpoints met at a central junction, reducing explored nodes by 58% vs unidirectional A*.",
    "Contraction Hierarchies":
      "CH used precomputed node ordering to skip low-importance junctions, achieving sub-millisecond query time on a 2.4M-node graph.",
  };
  return {
    winner: algo,
    reason: reasons[algo],
    nodesExplored: Math.round(r(800, 14000, 0)),
    timeSaved: `${r(35, 280, 0)}ms`,
    pathCost: r(4.2, 12.8),
  };
}

//  Tooltip components 

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-border rounded-lg px-4 py-3 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-mono">
          {p.dataKey}: {p.value}
        </p>
      ))}
    </div>
  );
}

function CustomLineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-border rounded-lg px-4 py-3 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">Step {label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-mono">
          {p.dataKey}: {p.value} nodes
        </p>
      ))}
    </div>
  );
}

//  Status helpers 

const statusConfig: Record<
  TimelineStep["status"],
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  optimal: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "border-emerald-500/40 bg-emerald-500/5",
    label: "OPTIMAL",
  },
  considered: {
    icon: AlertCircle,
    color: "text-amber-400",
    bg: "border-amber-500/40 bg-amber-500/5",
    label: "CONSIDERED",
  },
  rejected: {
    icon: XCircle,
    color: "text-rose-400",
    bg: "border-rose-500/40 bg-rose-500/5",
    label: "REJECTED",
  },
};

//  Component 

export default function AiReasoningPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedAlgo, setSelectedAlgo] = useState<Algorithm>("A*");
  const [heuristicWeight, setHeuristicWeight] = useState(1.0);
  const [decisionDepth, setDecisionDepth] = useState(4);
  const [analysisKey, setAnalysisKey] = useState(0);

  // Data state
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);
  const [heuristicData, setHeuristicData] = useState<HeuristicNode[]>([]);
  const [raceData, setRaceData] = useState<RacePoint[]>([]);
  const [kpis, setKPIs] = useState<KPI[]>([]);
  const [summary, setSummary] = useState<DecisionSummary | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    setMounted(true);
    // initial data
    setTimeline(generateTimeline("A*", 4));
    setHeuristicData(generateHeuristicData());
    setRaceData(generateRaceData());
    setKPIs(generateKPIs());
    setSummary(generateSummary("A*"));
  }, []);

  // Live micro-update: KPIs shimmer every 5s
  useEffect(() => {
    if (!mounted) return;
    const iv = setInterval(() => {
      setKPIs(generateKPIs());
    }, 5000);
    return () => clearInterval(iv);
  }, [mounted]);

  const handleAnalyze = useCallback(() => {
    setIsAnalyzing(true);
    // short delay to show the spinner
    setTimeout(() => {
      setTimeline(generateTimeline(selectedAlgo, decisionDepth));
      setHeuristicData(generateHeuristicData());
      setRaceData(generateRaceData());
      setKPIs(generateKPIs());
      setSummary(generateSummary(selectedAlgo));
      setAnalysisKey((k) => k + 1);
      setIsAnalyzing(false);
    }, 600);
  }, [selectedAlgo, decisionDepth]);

  if (!mounted) return null;

  const algorithms: Algorithm[] = [
    "A*",
    "Dijkstra",
    "Bidirectional A*",
    "Contraction Hierarchies",
  ];

  return (
    <div className="h-full w-full flex bg-[#0a0a0a] overflow-hidden relative">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      {/*  Left Control Panel  */}
      <aside className="w-80 shrink-0 border-r border-border bg-card/50 backdrop-blur-xl p-6 flex flex-col gap-6 overflow-y-auto z-10">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Brain className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-sm tracking-tight">
              AI Reasoning Studio
            </h2>
            <p className="text-[11px] text-muted-foreground font-mono">
              XAI Decision Inspector
            </p>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Algorithm Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Algorithm
          </label>
          <div className="space-y-1.5">
            {algorithms.map((algo) => (
              <button
                key={algo}
                onClick={() => setSelectedAlgo(algo)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all font-mono ${
                  selectedAlgo === algo
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "text-muted-foreground hover:bg-secondary/50 border border-transparent"
                }`}
              >
                <span className="flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5" />
                  {algo}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Heuristic Weight Slider */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Heuristic Weight (ε)
          </label>
          <div className="space-y-1">
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={heuristicWeight}
              onChange={(e) =>
                setHeuristicWeight(parseFloat(e.target.value))
              }
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>0.5</span>
              <span className="text-emerald-400 font-semibold">
                {heuristicWeight.toFixed(1)}
              </span>
              <span>2.0</span>
            </div>
          </div>
        </div>

        {/* Decision Depth */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Decision Depth
          </label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((d) => (
              <button
                key={d}
                onClick={() => setDecisionDepth(d)}
                className={`flex-1 py-1.5 text-xs font-mono rounded-md transition-all ${
                  decisionDepth === d
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "text-muted-foreground border border-border hover:bg-secondary/50"
                }`}
              >
                L{d}
              </button>
            ))}
          </div>
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isAnalyzing ? (
            <>
              <Cpu className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Analyze Decision
            </>
          )}
        </button>

        <div className="h-px bg-border" />

        {/* Decision Summary */}
        {summary && (
          <motion.div
            key={`summary-${analysisKey}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="border border-emerald-500/20 bg-emerald-500/5 rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Winner: {summary.winner}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {summary.reason}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="text-center p-2 rounded bg-black/30 border border-border/50">
                <p className="text-[10px] text-muted-foreground">Nodes</p>
                <p className="text-sm font-mono text-white">
                  {summary.nodesExplored.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-2 rounded bg-black/30 border border-border/50">
                <p className="text-[10px] text-muted-foreground">Time Saved</p>
                <p className="text-sm font-mono text-white">
                  {summary.timeSaved}
                </p>
              </div>
            </div>
            <div className="text-center p-2 rounded bg-black/30 border border-border/50">
              <p className="text-[10px] text-muted-foreground">Optimal Path Cost</p>
              <p className="text-sm font-mono text-emerald-400">
                {summary.pathCost} km
              </p>
            </div>
          </motion.div>
        )}
      </aside>

      {/*  Main Content Area  */}
      <main className="flex-1 overflow-y-auto p-8 z-10">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <header>
            <h1 className="text-2xl font-bold tracking-tight mb-1">
              Explainable AI — Decision Trace
            </h1>
            <p className="text-sm text-muted-foreground">
              Inspect why the routing engine selected{" "}
              <span className="text-emerald-400 font-mono">{selectedAlgo}</span>{" "}
              with ε={heuristicWeight.toFixed(1)} at depth L{decisionDepth}
            </p>
          </header>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnimatePresence mode="wait">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <motion.div
                    key={kpi.label}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="border border-border bg-card/50 backdrop-blur rounded-lg p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-muted-foreground font-medium">
                        {kpi.label}
                      </span>
                      <Icon className={`w-4 h-4 ${kpi.color} opacity-80`} />
                    </div>
                    <p className="text-2xl font-bold font-mono">{kpi.value}</p>
                    <p className="text-[11px] font-mono text-emerald-500 mt-1">
                      {kpi.delta}
                    </p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Decision Timeline */}
          <motion.div
            key={`timeline-${analysisKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="border border-border bg-card/50 backdrop-blur rounded-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold flex items-center gap-2 text-sm">
                <GitBranch className="w-4 h-4 text-emerald-400" />
                Decision Timeline
              </h2>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                {selectedAlgo} • Depth L{decisionDepth}
              </span>
            </div>
            <div className="relative ml-4">
              {/* Vertical connector line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

              <div className="space-y-1">
                {timeline.map((step, idx) => {
                  const cfg = statusConfig[step.status];
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1, duration: 0.35 }}
                      className={`relative flex gap-4 p-4 rounded-lg border ${cfg.bg} ml-6`}
                    >
                      {/* Timeline dot */}
                      <div className="absolute -left-[33px] top-5">
                        <div
                          className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center bg-[#0a0a0a] ${
                            step.status === "optimal"
                              ? "border-emerald-500"
                              : step.status === "considered"
                              ? "border-amber-500"
                              : "border-rose-500"
                          }`}
                        >
                          <Icon className={`w-3 h-3 ${cfg.color}`} />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">
                            STEP {step.id}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              step.status === "optimal"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : step.status === "considered"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-rose-500/20 text-rose-400"
                            }`}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold mb-1">
                          {step.title}
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                          {step.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1.5 leading-relaxed">
                          {step.detail}
                        </p>
                      </div>

                      {idx < timeline.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-muted-foreground/30 absolute right-4 bottom-3" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Heuristic Comparison Bar Chart */}
            <motion.div
              key={`bar-${analysisKey}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="border border-border bg-card/50 backdrop-blur rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2 text-sm">
                  <Brain className="w-4 h-4 text-sky-400" />
                  Heuristic Comparison
                </h2>
                <span className="text-[10px] font-mono text-muted-foreground">
                  f(n) = g(n) + h(n)
                </span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={heuristicData}
                    margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                    />
                    <XAxis
                      dataKey="node"
                      tick={{ fill: "#888", fontSize: 11, fontFamily: "monospace" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <YAxis
                      tick={{ fill: "#888", fontSize: 11, fontFamily: "monospace" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }}
                    />
                    <Bar
                      dataKey="gn"
                      name="g(n)"
                      fill="#10b981"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="hn"
                      name="h(n)"
                      fill="#38bdf8"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="fn"
                      name="f(n)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                    >
                      {heuristicData.map((entry, index) => {
                        const minFn = Math.min(
                          ...heuristicData.map((d) => d.fn)
                        );
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.fn === minFn ? "#f59e0b" : "#6366f1"}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                 Highlighted bar = lowest f(n) → next expansion target
              </p>
            </motion.div>

            {/* Algorithm Race Line Chart */}
            <motion.div
              key={`line-${analysisKey}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="border border-border bg-card/50 backdrop-blur rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Algorithm Race
                </h2>
                <span className="text-[10px] font-mono text-muted-foreground">
                  NODES EXPLORED vs TIME
                </span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={raceData}
                    margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                    />
                    <XAxis
                      dataKey="step"
                      tick={{ fill: "#888", fontSize: 11, fontFamily: "monospace" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      label={{
                        value: "ms",
                        position: "insideBottomRight",
                        offset: -4,
                        style: { fill: "#666", fontSize: 10, fontFamily: "monospace" },
                      }}
                    />
                    <YAxis
                      tick={{ fill: "#888", fontSize: 11, fontFamily: "monospace" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <Tooltip content={<CustomLineTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="A*"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Dijkstra"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Bidirectional A*"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Contraction Hierarchies"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                Lower curve = faster convergence • CH precomputes shortcuts at
                index time
              </p>
            </motion.div>
          </div>

          {/* Footer micro-detail */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/50 font-mono pt-2 pb-6">
            <span>TRENT OS • AI REASONING ENGINE v3.2.1</span>
            <span>
              SESSION {Math.random().toString(36).slice(2, 10).toUpperCase()} •
              ε={heuristicWeight.toFixed(1)}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
