"use client";

import { motion } from "framer-motion";
import { Activity, ArrowUpRight, Cpu, Globe2, Layers, MapPin, Network, Sparkles, Zap, MessageSquare, ShieldAlert } from "lucide-react";
import { PerformanceChart } from "@/components/PerformanceChart";
import { useEffect, useState } from "react";

export default function CommandCenterPage() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const [actions, setActions] = useState([
    { id: 1, time: "Just now", msg: "Agent autonomously rerouted 14 vehicles around Manhattan flood zone. Saved: 42 hours", type: "success" },
    { id: 2, time: "2m ago", msg: "Hybrid A* recalculated Tokyo sector 4 delivery sequence.", type: "info" },
    { id: 3, time: "5m ago", msg: "Detected port strike in London. Initiating Contingency Alpha.", type: "alert" }
  ]);

  const [comms, setComms] = useState([
    { id: 1, to: "+1 (555) 0192", msg: "TRENT Alert: Your delivery is delayed by 15m due to severe weather. New ETA: 4:30 PM", status: "SENT" },
    { id: 2, to: "logistics@acmecorp.com", msg: "Daily Digest: 98.4% On-Time Delivery across North America fleet.", status: "DRAFTING" }
  ]);

  useEffect(() => {
    // Mock incoming actions
    const interval = setInterval(() => {
      const newActions = [
        { msg: "RRT* dynamic path adjusted for Fleet 9 to avoid accident on I-95.", type: "info" },
        { msg: "Neural Planner optimized yard dock scheduling at Depot 4.", type: "success" },
        { msg: "Battery SoC low on EV-402. Inserted charging waypoint via Model Predictive Control.", type: "alert" }
      ];
      const randomAction = newActions[Math.floor(Math.random() * newActions.length)];
      setActions(prev => [{ id: Date.now(), time: "Just now", ...randomAction }, ...prev].slice(0, 5));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full relative overflow-y-auto overflow-x-hidden bg-[#000000]">
      {/* Ambient background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#8052ff] rounded-full blur-[150px] opacity-[0.15] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#00f0ff] rounded-full blur-[150px] opacity-[0.1] pointer-events-none" />

      <div className="max-w-7xl mx-auto p-8 md:p-12 space-y-10 relative z-10 text-white">
        
        {/* Welcoming Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#00f0ff]" />
              <span className="text-xs font-semibold uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-[#8052ff] to-[#00f0ff]">
                SUPPLY CHAIN CONTROL TOWER
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extralight tracking-tight mb-2 text-white">
              {greeting}, <span className="font-medium bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60">Commander.</span>
            </h1>
            <p className="text-[#9a9a9a] max-w-xl text-sm leading-relaxed">
              Agentic oversight is active. TRENT is autonomously managing multi-tier visibility, rerouting exceptions via Neural Planning, and communicating with customers.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-4 bg-[#8052ff]/10 border border-[#8052ff]/30 px-5 py-3 rounded-full backdrop-blur-md"
          >
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f0ff] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00f0ff]"></span>
            </div>
            <span className="text-sm font-medium text-white">Agentic AI Active</span>
          </motion.div>
        </header>

        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard 
            title="Autonomous Resolutions" 
            value="142" 
            change="+18 this shift" 
            icon={Globe2} 
            delay={0.2}
          />
          <MetricCard 
            title="System Latency (P99)" 
            value="1.2ms" 
            change="-12% vs last 24h" 
            icon={Zap} 
            delay={0.3}
          />
          <MetricCard 
            title="Nodes Explored (Hybrid A*)" 
            value="34.2M" 
            change="+4.1M vs last 24h" 
            icon={Network} 
            delay={0.4}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Agentic AI Action Stream */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="lg:col-span-2 border border-white/5 bg-white/[0.02] rounded-2xl p-6 flex flex-col h-[400px] relative overflow-hidden group"
          >
             <div className="flex items-center justify-between mb-6 relative z-10">
                <h2 className="font-medium text-lg flex items-center">
                  <Activity className="w-5 h-5 mr-3 text-[#00f0ff]" /> 
                  Agentic AI Action Stream
                </h2>
                <span className="text-xs font-mono text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/10">LIVE FEED</span>
             </div>
             <div className="flex-1 w-full relative z-10 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                {actions.map((act) => (
                  <motion.div layout key={act.id} className="p-4 rounded-xl bg-[#050505] border border-white/5 flex gap-4 items-start">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${act.type === 'alert' ? 'bg-rose-500' : act.type === 'success' ? 'bg-[#00f0ff]' : 'bg-[#8052ff]'}`} />
                    <div>
                      <div className="text-xs font-mono text-muted-foreground mb-1">{act.time}</div>
                      <div className="text-sm text-white/90 leading-relaxed">{act.msg}</div>
                    </div>
                  </motion.div>
                ))}
             </div>
          </motion.div>
          
          {/* LLM Customer Comms Log */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="border border-white/5 bg-white/[0.02] rounded-2xl p-6 flex flex-col h-[400px]"
          >
             <div className="flex items-center justify-between mb-6">
                <h2 className="font-medium text-lg flex items-center">
                  <MessageSquare className="w-5 h-5 mr-3 text-[#8052ff]" /> 
                  LLM Communications
                </h2>
             </div>
             <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                {comms.map((comm) => (
                  <div key={comm.id} className="p-4 rounded-xl bg-[#050505] border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-mono text-[#00f0ff]">{comm.to}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${comm.status === 'SENT' ? 'bg-[#00f0ff]/10 text-[#00f0ff] border-[#00f0ff]/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
                        {comm.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">"{comm.msg}"</p>
                  </div>
                ))}
             </div>
             
             <button className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors border border-white/10">
               View All Outbound
             </button>
          </motion.div>

        </div>

      </div>
    </div>
  );
}

function MetricCard({ title, value, change, icon: Icon, delay }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors rounded-2xl p-6 flex flex-col relative overflow-hidden group"
    >
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#8052ff]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
          <Icon className="w-4 h-4 text-[#8052ff]" />
        </div>
      </div>
      <div className="text-3xl font-extralight mb-2 text-white">{value}</div>
      <div className="text-xs font-mono text-[#00f0ff] flex items-center gap-1">
        <ArrowUpRight className="w-3 h-3" /> {change}
      </div>
    </motion.div>
  );
}
