"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  MarkerType,
  Node,
  Edge,
  Connection,
  addEdge,
  NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Search,
  Activity,
  Info,
  AlertTriangle,
  GitFork,
  Clock,
  Sliders,
  Settings,
  X,
  Compass,
  Zap,
} from "lucide-react";

// Types
interface IntersectionData {
  label: string;
  type: "hub" | "normal" | "border";
  congestion: number; // 0 to 1
  avgDelayMs: number;
  coordinates: { lat: number; lon: number };
  activeSignals: boolean;
}

interface EdgeData {
  distanceM: number;
  baseSpeedKmh: number;
  currentSpeedKmh: number;
  trafficFactor: number; // 1.0 = free flow, >1.0 = congested
}

// Custom Node Component
const CustomIntersectionNode = ({ data }: { data: IntersectionData }) => {
  const getCongestionColor = (c: number) => {
    if (c < 0.3) return "bg-emerald-500/20 border-emerald-500 text-emerald-400";
    if (c < 0.7) return "bg-amber-500/20 border-amber-500 text-amber-400";
    return "bg-rose-500/20 border-rose-500 text-rose-400";
  };

  const isHub = data.type === "hub";

  return (
    <div
      className={`px-3 py-2 rounded-lg border backdrop-blur-md shadow-lg flex flex-col min-w-[140px] transition-all hover:scale-105 ${getCongestionColor(
        data.congestion
      )} ${isHub ? "border-2 shadow-primary/20 ring-1 ring-primary/30" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono font-bold tracking-wider">
          {data.label}
        </span>
        {isHub && (
          <span className="px-1 py-0.5 rounded text-[8px] font-mono bg-primary/20 text-primary border border-primary/30">
            HUB
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] opacity-80">
        <span>Delay: {data.avgDelayMs}ms</span>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            data.congestion > 0.7
              ? "bg-rose-500 animate-ping"
              : data.congestion > 0.3
              ? "bg-amber-500"
              : "bg-emerald-500"
          }`}
        />
      </div>
    </div>
  );
};

// Initial Mock Data representing downtown routing intersections
const initialNodes: Node[] = [
  {
    id: "N1",
    type: "intersection",
    position: { x: 250, y: 100 },
    data: {
      label: "INT-42 (Broadway & 42nd)",
      type: "hub",
      congestion: 0.85,
      avgDelayMs: 420,
      coordinates: { lat: 40.758, lon: -73.985 },
      activeSignals: true,
    },
  },
  {
    id: "N2",
    type: "intersection",
    position: { x: 100, y: 250 },
    data: {
      label: "INT-17 (7th Ave & 34th)",
      type: "hub",
      congestion: 0.62,
      avgDelayMs: 290,
      coordinates: { lat: 40.750, lon: -73.991 },
      activeSignals: true,
    },
  },
  {
    id: "N3",
    type: "intersection",
    position: { x: 400, y: 220 },
    data: {
      label: "INT-89 (Lexington & 42nd)",
      type: "normal",
      congestion: 0.28,
      avgDelayMs: 95,
      coordinates: { lat: 40.751, lon: -73.972 },
      activeSignals: true,
    },
  },
  {
    id: "N4",
    type: "intersection",
    position: { x: 250, y: 400 },
    data: {
      label: "INT-56 (5th Ave & 23rd)",
      type: "normal",
      congestion: 0.15,
      avgDelayMs: 45,
      coordinates: { lat: 40.741, lon: -73.989 },
      activeSignals: true,
    },
  },
  {
    id: "N5",
    type: "intersection",
    position: { x: 500, y: 400 },
    data: {
      label: "INT-104 (1st Ave & 34th)",
      type: "border",
      congestion: 0.45,
      avgDelayMs: 160,
      coordinates: { lat: 40.744, lon: -73.974 },
      activeSignals: false,
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: "E1-2",
    source: "N1",
    target: "N2",
    label: "980m (1.6x delay)",
    animated: true,
    style: { stroke: "#f43f5e", strokeWidth: 3 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#f43f5e" },
    data: { distanceM: 980, baseSpeedKmh: 45, currentSpeedKmh: 18, trafficFactor: 2.5 },
  },
  {
    id: "E1-3",
    source: "N1",
    target: "N3",
    label: "1,150m (1.1x delay)",
    style: { stroke: "#f59e0b", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
    data: { distanceM: 1150, baseSpeedKmh: 45, currentSpeedKmh: 38, trafficFactor: 1.18 },
  },
  {
    id: "E2-4",
    source: "N2",
    target: "N4",
    label: "1,200m (1.0x delay)",
    style: { stroke: "#10b981", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
    data: { distanceM: 1200, baseSpeedKmh: 50, currentSpeedKmh: 50, trafficFactor: 1.0 },
  },
  {
    id: "E3-4",
    source: "N3",
    target: "N4",
    label: "1,500m (1.0x delay)",
    style: { stroke: "#10b981", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
    data: { distanceM: 1500, baseSpeedKmh: 50, currentSpeedKmh: 48, trafficFactor: 1.04 },
  },
  {
    id: "E3-5",
    source: "N3",
    target: "N5",
    label: "850m (1.3x delay)",
    animated: true,
    style: { stroke: "#f59e0b", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
    data: { distanceM: 850, baseSpeedKmh: 40, currentSpeedKmh: 28, trafficFactor: 1.4 },
  },
  {
    id: "E4-5",
    source: "N4",
    target: "N5",
    label: "1,400m (1.0x delay)",
    style: { stroke: "#10b981", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
    data: { distanceM: 1400, baseSpeedKmh: 50, currentSpeedKmh: 49, trafficFactor: 1.02 },
  },
];

export default function KnowledgeGraphPage() {
  const [mounted, setMounted] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedElement, setSelectedElement] = useState<{
    type: "node" | "edge";
    data: any;
    id: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [congestionFilter, setCongestionFilter] = useState<number>(0.0);

  // Hydration safety mount effect
  useEffect(() => {
    setMounted(true);
  }, []);

  // Register custom nodes
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      intersection: CustomIntersectionNode,
    }),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedElement({
      type: "node",
      id: node.id,
      data: node.data,
    });
  }, []);

  // Edge selection
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedElement({
      type: "edge",
      id: edge.id,
      data: {
        ...edge.data,
        label: edge.label,
        source: edge.source,
        target: edge.target,
      },
    });
  }, []);

  // Canvas click to deselect
  const onPaneClick = useCallback(() => {
    setSelectedElement(null);
  }, []);

  // Filter nodes/edges based on congestion filter & search
  const filteredNodes = useMemo(() => {
    return nodes.map((node) => {
      const matchSearch =
        node.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.data &&
          (node.data as IntersectionData).label
            .toLowerCase()
            .includes(searchQuery.toLowerCase()));

      const passesFilter =
        (node.data as IntersectionData).congestion >= congestionFilter;

      return {
        ...node,
        hidden: !matchSearch || !passesFilter,
      };
    });
  }, [nodes, searchQuery, congestionFilter]);

  // Handle optimization simulation trigger
  const handleOptimizeNode = (nodeId: string) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          const updatedData = {
            ...(n.data as IntersectionData),
            congestion: Math.max(0.1, (n.data as IntersectionData).congestion - 0.3),
            avgDelayMs: Math.max(20, Math.floor((n.data as IntersectionData).avgDelayMs * 0.4)),
          };
          
          // If we currently select this node, update the details panel view too
          setSelectedElement({
            type: "node",
            id: nodeId,
            data: updatedData,
          });

          return { ...n, data: updatedData };
        }
        return n;
      })
    );

    // Speed up connecting edges
    setEdges((eds) =>
      eds.map((e) => {
        if (e.source === nodeId || e.target === nodeId) {
          const updatedEdgeData = {
            ...(e.data as EdgeData),
            trafficFactor: Math.max(1.0, (e.data as EdgeData).trafficFactor - 0.5),
            currentSpeedKmh: Math.min(
              (e.data as EdgeData).baseSpeedKmh,
              Math.floor((e.data as EdgeData).currentSpeedKmh * 1.5)
            ),
          };

          return {
            ...e,
            animated: updatedEdgeData.trafficFactor > 1.2,
            style: {
              ...e.style,
              stroke: updatedEdgeData.trafficFactor > 1.8 ? "#f43f5e" : updatedEdgeData.trafficFactor > 1.2 ? "#f59e0b" : "#10b981",
              strokeWidth: updatedEdgeData.trafficFactor > 1.8 ? 3 : 2,
            },
            data: updatedEdgeData,
            label: `${updatedEdgeData.distanceM}m (${updatedEdgeData.trafficFactor.toFixed(1)}x delay)`,
          };
        }
        return e;
      })
    );
  };

  if (!mounted) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#0a0a0a] text-muted-foreground font-mono text-sm">
        <Zap className="w-5 h-5 animate-pulse mr-2 text-primary" />
        LOADING KNOWLEDGE GRAPH CANVAS...
      </div>
    );
  }

  return (
    <div className="h-full w-full flex bg-[#0a0a0a] relative overflow-hidden text-foreground">
      {/* Left Control / Search Panel */}
      <div className="w-80 border-r border-border bg-card/60 backdrop-blur-xl flex flex-col shrink-0 z-10">
        <div className="p-4 border-b border-border">
          <div className="flex items-center space-x-2 text-emerald-500 mb-2">
            <GitFork className="w-5 h-5" />
            <h1 className="font-bold tracking-tight text-lg">Routing Network</h1>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Graph visualization of active street intersection nodes, speed weights, and telemetry.
          </p>
        </div>

        <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search intersection ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-md pl-9 pr-4 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent text-foreground"
            />
          </div>

          {/* Congestion slider */}
          <div className="space-y-2 border border-border/50 p-3 rounded-lg bg-secondary/20">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-muted-foreground flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" />
                Congestion Floor:
              </span>
              <span className="text-primary font-bold">{(congestionFilter * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.9"
              step="0.1"
              value={congestionFilter}
              onChange={(e) => setCongestionFilter(parseFloat(e.target.value))}
              className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>All Nodes</span>
              <span>High Delay</span>
            </div>
          </div>

          {/* Quick Metrics list */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase font-mono">
              Graph Topology Stats
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="border border-border p-2.5 rounded bg-secondary/10">
                <div className="text-[10px] text-muted-foreground">TOTAL NODES</div>
                <div className="text-lg font-bold text-foreground">{nodes.length}</div>
              </div>
              <div className="border border-border p-2.5 rounded bg-secondary/10">
                <div className="text-[10px] text-muted-foreground">TOTAL EDGES</div>
                <div className="text-lg font-bold text-foreground">{edges.length}</div>
              </div>
              <div className="border border-border p-2.5 rounded bg-secondary/10">
                <div className="text-[10px] text-muted-foreground">CONGESTED NODES</div>
                <div className="text-lg font-bold text-rose-400">
                  {nodes.filter((n) => (n.data as IntersectionData).congestion > 0.6).length}
                </div>
              </div>
              <div className="border border-border p-2.5 rounded bg-secondary/10">
                <div className="text-[10px] text-muted-foreground">AVG NETWORK DELAY</div>
                <div className="text-lg font-bold text-amber-400">202ms</div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-border bg-secondary/10">
          <h4 className="text-[10px] font-semibold text-muted-foreground font-mono uppercase mb-2">
            Congestion Legend
          </h4>
          <div className="flex items-center justify-between text-[10px] font-mono">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500" />
              <span>Low (&lt;30%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500" />
              <span>Med (30%-70%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500" />
              <span>High (&gt;70%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          fitView
          minZoom={0.5}
          maxZoom={2.0}
        >
          <Background color="#333" gap={16} size={1} />
          <Controls className="bg-card text-foreground border border-border" />
          <MiniMap
            nodeStrokeColor={(n) => {
              const nd = n.data as IntersectionData;
              if (nd?.congestion > 0.7) return "#f43f5e";
              if (nd?.congestion > 0.3) return "#f59e0b";
              return "#10b981";
            }}
            nodeColor={(n) => {
              const nd = n.data as IntersectionData;
              if (nd?.congestion > 0.7) return "rgba(244,63,94,0.2)";
              if (nd?.congestion > 0.3) return "rgba(245,158,11,0.2)";
              return "rgba(16,185,129,0.2)";
            }}
            nodeBorderRadius={4}
            maskColor="rgba(0,0,0,0.7)"
            className="bg-card border border-border"
          />

          {/* Top-Right Overlay Info Panel */}
          <Panel position="top-right" className="bg-card/70 border border-border backdrop-blur-md px-3 py-2 rounded shadow-lg text-xs font-mono flex items-center gap-2">
            <Compass className="w-4 h-4 text-primary animate-spin" style={{ animationDuration: "10s" }} />
            <span>REALITY_ENGINE: NETWORK_WEIGHTS</span>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right Detail Drawer */}
      {selectedElement && (
        <div className="w-80 border-l border-border bg-card/70 backdrop-blur-xl flex flex-col shrink-0 z-10 transition-all">
          <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/20">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <span className="font-bold font-mono text-sm tracking-wider uppercase">
                {selectedElement.type === "node" ? "Intersection Detail" : "Segment Detail"}
              </span>
            </div>
            <button
              onClick={() => setSelectedElement(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto font-mono text-xs">
            {selectedElement.type === "node" ? (
              <>
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground">NODE ID</div>
                  <div className="text-sm font-bold text-foreground">{selectedElement.id}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground">LOCATION NAME</div>
                  <div className="text-sm font-medium text-foreground">{selectedElement.data.label}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground">LATITUDE</div>
                    <div className="text-foreground">{selectedElement.data.coordinates.lat}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground">LONGITUDE</div>
                    <div className="text-foreground">{selectedElement.data.coordinates.lon}</div>
                  </div>
                </div>

                <div className="border-t border-border/50 my-2" />

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">NODE TYPE:</span>
                    <span className="font-semibold uppercase text-primary">{selectedElement.data.type}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">CONGESTION FACTOR:</span>
                    <span
                      className={`font-semibold ${
                        selectedElement.data.congestion > 0.7
                          ? "text-rose-400"
                          : selectedElement.data.congestion > 0.3
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {(selectedElement.data.congestion * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">AVERAGE DELAY:</span>
                    <span className="font-semibold text-foreground">{selectedElement.data.avgDelayMs}ms</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">SIGNAL CONTROL:</span>
                    <span
                      className={`font-semibold ${
                        selectedElement.data.activeSignals ? "text-emerald-400" : "text-muted-foreground"
                      }`}
                    >
                      {selectedElement.data.activeSignals ? "INTELLIGENT" : "FIXED"}
                    </span>
                  </div>
                </div>

                <div className="mt-auto pt-6">
                  <button
                    onClick={() => handleOptimizeNode(selectedElement.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs"
                  >
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    Simulate Signal Optimization
                  </button>
                  <p className="text-[9px] text-muted-foreground text-center mt-2">
                    Applies adaptive green-wave signal timing to flush queued vehicles.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground">SEGMENT ID</div>
                  <div className="text-sm font-bold text-foreground">{selectedElement.id}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground">SOURCE</div>
                    <div className="text-foreground">{selectedElement.data.source}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground">TARGET</div>
                    <div className="text-foreground">{selectedElement.data.target}</div>
                  </div>
                </div>

                <div className="border-t border-border/50 my-2" />

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">SEGMENT DISTANCE:</span>
                    <span className="font-semibold text-foreground">{selectedElement.data.distanceM}m</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">SPEED LIMIT:</span>
                    <span className="font-semibold text-foreground">{selectedElement.data.baseSpeedKmh} km/h</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">CURRENT SPEED:</span>
                    <span
                      className={`font-semibold ${
                        selectedElement.data.trafficFactor > 1.8
                          ? "text-rose-400 animate-pulse"
                          : selectedElement.data.trafficFactor > 1.2
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {selectedElement.data.currentSpeedKmh} km/h
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">TRAFFIC DELAY MULTIPLIER:</span>
                    <span
                      className={`font-semibold ${
                        selectedElement.data.trafficFactor > 1.8
                          ? "text-rose-400"
                          : selectedElement.data.trafficFactor > 1.2
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {selectedElement.data.trafficFactor.toFixed(2)}x
                    </span>
                  </div>
                </div>

                <div className="border border-border/50 p-2.5 rounded bg-secondary/10 space-y-1.5 mt-4">
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[10px] font-bold">Edge Telemetry</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {selectedElement.data.trafficFactor > 1.8
                      ? "High traffic congestion detected. Astar weights are penalty-inflated. Routing algorithms will actively divert around this segment."
                      : selectedElement.data.trafficFactor > 1.2
                      ? "Moderate delay. Commuter flow throttling active. Peak-hour overhead applied."
                      : "Optimal free-flow conditions. High-speed routing path."}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
