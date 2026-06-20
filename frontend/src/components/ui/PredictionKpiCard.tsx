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
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      text: "text-emerald-400",
      icon: "text-emerald-500",
    },
    sky: {
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
      text: "text-sky-400",
      icon: "text-sky-500",
    },
    amber: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      text: "text-amber-400",
      icon: "text-amber-500",
    },
    violet: {
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
      text: "text-violet-400",
      icon: "text-violet-500",
    },
  };
  const c = colorMap[color];

  return (
    <div className="border border-border bg-card/50 backdrop-blur rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div
          className={`w-7 h-7 rounded-md ${c.bg} ${c.border} border flex items-center justify-center`}
        >
          <Icon className={`w-3.5 h-3.5 ${c.icon}`} />
        </div>
      </div>
      <span className={`text-2xl font-bold font-mono ${c.text}`}>
        {value}
      </span>
      <span className="text-[10px] font-mono text-muted-foreground">{sub}</span>
    </div>
  );
}
