"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe2, Map, Activity, BarChart2, Compass, Layers, Cpu, Code2, TerminalSquare, Leaf, Plug, ChevronDown, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { CommandPalette } from "@/components/CommandPalette";

const SIDEBAR_NAV = [
  { name: "Control Tower", href: "/command-center", icon: TerminalSquare },
  { name: "Fleet Dispatch (VRP)", href: "/routes", icon: Map },
  { name: "Digital Twin Sandbox", href: "/simulation", icon: Activity },
  { name: "ESG & Analytics", href: "/esg-analytics", icon: Leaf },
  { name: "Telematics API", href: "/telematics", icon: Plug },
  { name: "Predictions", href: "/predictions", icon: Compass },
  { name: "Observability", href: "/observability", icon: BarChart2 },
  { name: "Knowledge Graph", href: "/knowledge-graph", icon: Layers },
  { name: "AI Reasoning", href: "/ai-reasoning", icon: Cpu },
  { name: "Engineering", href: "/engineering", icon: Code2 },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden text-foreground">
      <CommandPalette />
      {/* Left Sidebar */}
      <nav className="w-64 border-r border-border bg-card flex flex-col z-20">
        <div className="p-6 flex items-center space-x-3 mb-4">
          <Globe2 className="w-6 h-6 text-primary" />
          <span className="font-bold tracking-widest text-lg bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#00f0ff]">TRENT</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-1 px-3">
          {SIDEBAR_NAV.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div className={`relative flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>
                  {isActive && (
                    <motion.div 
                      layoutId="active-sidebar-nav" 
                      className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-md" 
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className="w-4 h-4 z-10" />
                  <span className="font-medium text-sm z-10">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-border">
          <div className="text-xs font-mono text-muted-foreground flex justify-between">
            <span>STATUS</span>
            <span className="text-[#8052ff]">ONLINE</span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10">
        {/* Top Navbar / Utility Bar */}
        <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-6 justify-between shrink-0">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Globe2 className="w-5 h-5 text-primary" />
              <span className="font-bold tracking-widest text-lg bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#00f0ff]">TRENT</span>
            </div>
            <div className="h-4 w-px bg-border hidden sm:block"></div>
            <div className="hidden sm:flex items-center text-sm font-mono text-muted-foreground">
              <span className="opacity-50">Press</span>
              <kbd className="mx-2 px-2 py-0.5 bg-secondary rounded border border-border text-foreground">⌘ K</kbd>
              <span className="opacity-50">to open command palette</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-xs font-mono">
             <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>WS_CONNECTED</span>
             </div>
          </div>
        </header>

        {/* Page Canvas */}
        <div className="flex-1 relative overflow-hidden">
          {children}
        </div>
      </main>

    </div>
  );
}
