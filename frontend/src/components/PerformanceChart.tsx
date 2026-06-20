"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const MAX_DATA_POINTS = 20;

export function PerformanceChart() {
  const [data, setData] = useState<{ time: string; latency: number }[]>([]);

  useEffect(() => {
    // Initialize with dummy data
    const initialData = Array.from({ length: MAX_DATA_POINTS }).map((_, i) => ({
      time: i.toString(),
      latency: Math.floor(Math.random() * 50) + 10,
    }));
    setData(initialData);

    // Simulate incoming data stream
    const interval = setInterval(() => {
      setData((prev) => {
        const newData = [...prev.slice(1), {
          time: Date.now().toString(),
          latency: Math.floor(Math.random() * 50) + 10 + (Math.random() > 0.8 ? 50 : 0) // Occasional spike
        }];
        return newData;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full p-4 relative">
      <div className="absolute top-4 left-4 z-10 flex items-center">
         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
         <span className="text-xs font-mono font-medium text-muted-foreground">LIVE LATENCY (ms)</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 40, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="time" hide />
          <YAxis stroke="#333" fontSize={10} tickFormatter={(val) => `${val}ms`} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '4px' }}
            itemStyle={{ color: '#10b981', fontSize: '12px', fontFamily: 'monospace' }}
            labelStyle={{ display: 'none' }}
          />
          <Area 
            type="monotone" 
            dataKey="latency" 
            stroke="#10b981" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorLatency)" 
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
