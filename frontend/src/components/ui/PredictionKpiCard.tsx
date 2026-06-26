import React from 'react';

interface PredictionKpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  color: "emerald" | "sky" | "amber" | "violet";
}

export function PredictionKpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: PredictionKpiCardProps) {
  const colorMap = {
    emerald: {
      bg: "bg-[#8052ff]/10",
      border: "border-[#8052ff]/30",
      text: "text-white",
      icon: "text-[#8052ff]",
    },
    sky: {
      bg: "bg-[#00f0ff]/10",
      border: "border-[#00f0ff]/30",
      text: "text-white",
      icon: "text-[#00f0ff]",
    },
    amber: {
      bg: "bg-[#ffb829]/10",
      border: "border-[#ffb829]/30",
      text: "text-white",
      icon: "text-[#ffb829]",
    },
    violet: {
      bg: "bg-[#8052ff]/10",
      border: "border-[#8052ff]/30",
      text: "text-white",
      icon: "text-[#8052ff]",
    },
  };
  const c = colorMap[color];

  return (
    <div className="border border-border/50 bg-transparent hover:bg-white/[0.02] transition-colors p-5 flex flex-col gap-3 rounded-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#8052ff]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-widest text-[#9a9a9a] font-sans">
          {label}
        </span>
        <div
          className={`w-8 h-8 rounded-full ${c.bg} ${c.border} border flex items-center justify-center`}
        >
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
      </div>
      <span className={`text-3xl font-extralight font-sans ${c.text}`}>
        {value}
      </span>
      <span className="text-[11px] font-mono text-[#9a9a9a] flex items-center gap-1">{sub}</span>
    </div>
  );
}
