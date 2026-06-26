"use client";

import { motion } from "framer-motion";
import { Plug, Wifi, Lock, Activity, Server, Key, Plus, Terminal } from "lucide-react";
import { useEffect, useState } from "react";

const INTEGRATIONS = [
  { name: "Geotab GO9", status: "Connected", ping: "12ms", icon: Wifi, type: "Telemetry" },
  { name: "Samsara VG54", status: "Connected", ping: "28ms", icon: Server, type: "Dashcam & GPS" },
  { name: "SAP S/4HANA", status: "Syncing", ping: "--", icon: Activity, type: "ERP" },
];

export default function TelematicsPage() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const vehicles = ["TRK-104", "TRK-219", "VAN-04", "TRK-992"];
      const events = ["GPS_PING", "TEMP_OK", "HARSH_BRAKE", "DOOR_OPEN"];
      const v = vehicles[Math.floor(Math.random() * vehicles.length)];
      const e = events[Math.floor(Math.random() * events.length)];
      const lat = (40.7 + (Math.random() - 0.5) * 0.1).toFixed(4);
      const lon = (-74.0 + (Math.random() - 0.5) * 0.1).toFixed(4);
      
      const log = `[${new Date().toISOString().split('T')[1].slice(0, -1)}] [${v}] ${e} - POS: [${lat}, ${lon}]`;
      
      setLogs(prev => [log, ...prev].slice(0, 15));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full overflow-y-auto p-8 space-y-8 pb-24 bg-[#000000] text-white">
      <header>
        <h1 className="text-3xl font-light tracking-tight flex items-center gap-3">
          <Plug className="w-8 h-8 text-[#00f0ff]" />
          Telematics & IoT Hub
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Manage your fleet hardware integrations, generate API tokens for external ERP syncing, and monitor live telemetry ingestion.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Integrations */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Active Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {INTEGRATIONS.map((integ, i) => (
              <motion.div 
                key={integ.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#8052ff]/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-[#8052ff]/20 rounded-lg">
                    <integ.icon className="w-5 h-5 text-[#00f0ff]" />
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-1 rounded-full ${integ.status === 'Connected' ? 'bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                    {integ.status}
                  </span>
                </div>
                <h3 className="font-medium text-sm">{integ.name}</h3>
                <div className="flex justify-between items-end mt-2 text-xs text-muted-foreground">
                  <span>{integ.type}</span>
                  <span className="font-mono">{integ.ping}</span>
                </div>
              </motion.div>
            ))}
            
            <motion.div 
              className="p-5 rounded-2xl bg-white/[0.01] border border-dashed border-white/10 flex flex-col items-center justify-center text-muted-foreground hover:text-white hover:border-[#00f0ff]/50 transition-colors cursor-pointer min-h-[140px]"
            >
              <Plus className="w-6 h-6 mb-2" />
              <span className="text-xs font-medium">Add Integration</span>
            </motion.div>
          </div>

          <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase pt-6">API & Webhooks</h2>
          <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
             <table className="w-full text-sm">
               <thead>
                 <tr className="border-b border-white/5 bg-white/[0.01] text-muted-foreground text-xs font-medium">
                   <th className="text-left p-4">Name</th>
                   <th className="text-left p-4">Token Preview</th>
                   <th className="text-left p-4">Last Used</th>
                   <th className="text-right p-4">Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {[
                   { name: "Production TMS Sync", token: "sk_live_tr_...9A2f", used: "2 mins ago" },
                   { name: "Warehouse Read-Only", token: "sk_live_ro_...4B1x", used: "14 hours ago" }
                 ].map((key, i) => (
                   <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.01]">
                     <td className="p-4 font-medium flex items-center gap-2">
                       <Key className="w-4 h-4 text-[#8052ff]" />
                       {key.name}
                     </td>
                     <td className="p-4 font-mono text-xs text-muted-foreground">{key.token}</td>
                     <td className="p-4 text-xs text-muted-foreground">{key.used}</td>
                     <td className="p-4 text-right">
                       <button className="text-xs font-medium text-rose-400 hover:text-rose-300">Revoke</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>

        {/* Live Ingestion Feed */}
        <div className="space-y-4 h-full flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Live Stream</h2>
            <div className="flex items-center gap-2 text-xs text-[#00f0ff]">
              <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse"></span>
              Receiving
            </div>
          </div>
          
          <div className="flex-1 min-h-[400px] rounded-2xl bg-[#050505] border border-white/5 p-4 font-mono text-[10px] sm:text-xs overflow-hidden flex flex-col relative">
            <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-[#050505] to-transparent z-10" />
            
            <div className="flex-1 overflow-y-auto space-y-1.5 opacity-80 z-0">
              {logs.length === 0 && (
                <div className="text-muted-foreground animate-pulse">Waiting for telemetry payloads...</div>
              )}
              {logs.map((log, i) => (
                <motion.div 
                  key={log + i} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`${log.includes('HARSH_BRAKE') ? 'text-rose-400' : log.includes('DOOR') ? 'text-yellow-400' : 'text-[#00f0ff]'}`}
                >
                  {log}
                </motion.div>
              ))}
            </div>

            <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#050505] to-transparent z-10 pointer-events-none" />
          </div>
        </div>

      </div>
    </div>
  );
}
