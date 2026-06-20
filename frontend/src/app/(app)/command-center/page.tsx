"use client";

import { motion } from "framer-motion";
import { Activity, ArrowUpRight, Cpu, Layers, Network, Zap, Globe as GlobeIcon } from "lucide-react";
import { PerformanceChart } from "@/components/PerformanceChart";

export default function CommandCenterPage() {
  return (
    <div className="h-full w-full p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Command Center</h1>
          <p className="text-muted-foreground">Global Geo-Route Intelligence Overview</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="Active Digital Twins" value="12" change="+2 this week" icon={GlobeIcon} />
          <MetricCard title="System Latency (P99)" value="0.8ms" change="-12% vs last 24h" icon={Zap} />
          <MetricCard title="Nodes Explored Today" value="14.2M" change="+4.1M vs last 24h" icon={Network} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="border border-border bg-card rounded-lg p-6 flex flex-col h-96">
             <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center"><Activity className="w-4 h-4 mr-2 text-primary" /> Core Engine Performance</h2>
                <span className="text-xs font-mono text-muted-foreground">LAST 1HR</span>
             </div>
             <div className="flex-1 flex items-center justify-center border border-border bg-card/50 rounded-lg overflow-hidden relative">
            <PerformanceChart />
          </div>
          </div>
          
          <div className="border border-border bg-card rounded-lg p-6 flex flex-col h-96">
             <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center"><Layers className="w-4 h-4 mr-2 text-primary" /> Active Simulations</h2>
                <button className="text-xs flex items-center text-primary hover:underline">View All <ArrowUpRight className="w-3 h-3 ml-1"/></button>
             </div>
             <div className="space-y-4">
                <SimulationRow title="Manhattan Heavy Rain Mod" status="COMPUTING" algo="A*" />
                <SimulationRow title="Paris Strike Traffic Block" status="IDLE" algo="Contraction Hierarchies" />
                <SimulationRow title="Tokyo Rush Hour Prediction" status="READY" algo="ALT" />
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: React.ElementType;
}

function MetricCard({ title, value, change, icon: Icon }: MetricCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border bg-card rounded-lg p-6 flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Icon className="w-4 h-4 text-primary opacity-80" />
      </div>
      <div className="text-3xl font-bold mb-2">{value}</div>
      <div className="text-xs font-mono text-emerald-500">{change}</div>
    </motion.div>
  );
}

interface SimulationRowProps {
  title: string;
  status: 'COMPUTING' | 'IDLE' | 'READY';
  algo: string;
}

function SimulationRow({ title, status, algo }: SimulationRowProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded bg-secondary/30 border border-border/50">
       <div className="flex flex-col">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground flex items-center mt-1"><Cpu className="w-3 h-3 mr-1"/> {algo}</span>
       </div>
       <div className={`text-xs font-mono px-2 py-1 rounded ${status === 'COMPUTING' ? 'bg-primary/20 text-primary animate-pulse' : 'bg-secondary text-muted-foreground'}`}>
         {status}
       </div>
    </div>
  );
}


