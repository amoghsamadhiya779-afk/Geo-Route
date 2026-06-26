import React from 'react';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent: string;
}

export function KpiCard({ icon, label, value, accent }: KpiCardProps) {
  return (
    <div className="border border-border bg-card p-4 flex flex-col gap-1 rounded-none shadow-none">
      <div className="flex items-center justify-between text-muted-foreground text-xs uppercase font-mono tracking-widest">
        <span>{label}</span>
        {icon}
      </div>
      <span className={`text-2xl font-bold font-mono ${accent}`}>{value}</span>
    </div>
  );
}
