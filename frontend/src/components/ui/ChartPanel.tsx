import React from 'react';

interface ChartPanelProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

export function ChartPanel({
  title,
  subtitle,
  icon: Icon,
  children,
}: ChartPanelProps) {
  return (
    <div className="border border-border bg-card/50 backdrop-blur rounded-xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-emerald-500" />
          <div>
            <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
            <p className="text-[10px] font-mono text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>
        <span className="text-[9px] font-mono text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded">
          LIVE
        </span>
      </div>
      {children}
    </div>
  );
}
