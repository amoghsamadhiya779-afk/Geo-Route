"use client";

import { motion } from "framer-motion";
import { Leaf, Droplets, BatteryCharging, TrendingDown, FileText, Download, ShieldCheck } from "lucide-react";

const KPI_CARDS = [
  { title: "CO2 Emissions Avoided", value: "1,240", unit: "Tons", icon: Leaf, color: "text-[#00f0ff]", trend: "-14.2% YoY" },
  { title: "Fuel Consumption Saved", value: "48,500", unit: "Gallons", icon: Droplets, color: "text-[#8052ff]", trend: "-8.5% YoY" },
  { title: "EV Fleet Utilization", value: "64", unit: "%", icon: BatteryCharging, color: "text-emerald-400", trend: "+22% YoY" },
];

export default function ESGAnalyticsPage() {
  return (
    <div className="h-full overflow-y-auto p-8 space-y-8 pb-24 bg-[#000000] text-white">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light tracking-tight flex items-center gap-3">
            <Leaf className="w-8 h-8 text-[#00f0ff]" />
            ESG & Carbon Analytics
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Track Scope 1 and Scope 3 emissions reductions achieved through TRENT's AI routing optimizations. Download compliance reports for stakeholders.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-[#8052ff]/10 text-[#8052ff] border border-[#8052ff]/30 px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4" />
          ISO 14001 COMPLIANT
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {KPI_CARDS.map((kpi, i) => (
          <motion.div 
            key={kpi.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden"
          >
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20 bg-current ${kpi.color}`} />
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-2 bg-white/5 rounded-lg">
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                <TrendingDown className="w-3 h-3" />
                {kpi.trend}
              </span>
            </div>
            
            <div className="relative z-10">
              <div className="text-4xl font-light tracking-tight mb-1">
                {kpi.value} <span className="text-lg text-muted-foreground">{kpi.unit}</span>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">{kpi.title}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Placeholder Chart */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Emission Reduction Trajectory</h2>
          <div className="h-[300px] rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center relative overflow-hidden">
             {/* Mock Chart Grid */}
             <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
             
             {/* Mock SVGs to look like a chart */}
             <svg className="w-full h-full absolute inset-0 preserve-3d" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cyan-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,300 L0,200 C100,200 200,100 400,150 C600,200 700,50 1000,80 L1000,300 Z" fill="url(#cyan-grad)" />
                <path d="M0,200 C100,200 200,100 400,150 C600,200 700,50 1000,80" fill="none" stroke="#00f0ff" strokeWidth="2" strokeDasharray="4 4" />
                <path d="M0,250 C150,230 250,280 450,210 C650,140 750,190 1000,120" fill="none" stroke="#8052ff" strokeWidth="3" />
             </svg>

             <div className="absolute top-4 right-4 flex items-center gap-4 text-xs font-mono">
               <div className="flex items-center gap-2 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-[#8052ff]"></span> Optimized (TRENT)</div>
               <div className="flex items-center gap-2 text-muted-foreground"><span className="w-2 h-2 rounded-full border border-[#00f0ff]"></span> Unoptimized (Legacy)</div>
             </div>
          </div>
        </div>

        {/* Compliance Reports */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Compliance Reports</h2>
          <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden flex flex-col h-[300px]">
            <div className="p-4 bg-white/[0.01] border-b border-white/5 text-xs text-muted-foreground">
              Auto-generated for regional regulators
            </div>
            <div className="flex-1 overflow-y-auto">
              {[
                { name: "Q3 2026 Fleet Emissions (EPA)", size: "2.4 MB" },
                { name: "EU CSRD Directive Summary", size: "1.1 MB" },
                { name: "California CARB Transport Log", size: "3.8 MB" },
                { name: "Q2 2026 Fleet Emissions (EPA)", size: "2.3 MB" },
              ].map((report, i) => (
                <div key={i} className="p-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] flex justify-between items-center group cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-[#8052ff]" />
                    <div>
                      <div className="text-sm font-medium group-hover:text-[#00f0ff] transition-colors">{report.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{report.size} • PDF</div>
                    </div>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#00f0ff]/20 hover:text-[#00f0ff]">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
