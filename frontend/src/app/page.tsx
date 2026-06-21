"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Globe2 } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-background text-foreground flex items-center justify-center">
      
      {/* Background Globe Placeholder (Future React Three Fiber layer) */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-30">
         <div className="w-[800px] h-[800px] border border-primary/20 rounded-full animate-[spin_60s_linear_infinite]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-4xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="flex items-center space-x-2 mb-6 justify-center text-primary">
            <Globe2 className="w-8 h-8" />
            <span className="tracking-[0.2em] font-mono text-sm font-semibold uppercase">Geo-Route Intelligence OS</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8">
            TRENT
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Transform routes, networks, mobility signals, and geospatial intelligence into actionable decisions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/command-center">
              <button className="group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-md bg-primary px-8 font-medium text-primary-foreground transition-all duration-300 hover:bg-primary/90 hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background">
                <span className="mr-2">Explore Platform</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-8 left-8 text-xs font-mono text-muted-foreground">SYS_LATENCY: 12ms</div>
      <div className="absolute bottom-8 right-8 text-xs font-mono text-muted-foreground">NODE: PRIMARY_ALPHA</div>
    </main>
  );
}
