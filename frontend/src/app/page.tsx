"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ScrollEngine } from "@/components/ui/ScrollEngine";

// Lazy-load Three.js particle field to avoid SSR issues
const ParticleField = dynamic(
  () =>
    import("@/components/ui/ParticleField").then((mod) => ({
      default: mod.ParticleField,
    })),
  { ssr: false }
);

export default function LandingPage() {
  return (
    <main className="relative w-full min-h-screen bg-[#000000] text-white selection:bg-[#8052ff] selection:text-white">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-6">
        <div className="font-sans text-[18px] font-semibold tracking-[0.021em] text-white">
          TRENT
        </div>

        <Link
          href="/command-center"
          className="group flex items-center gap-2 bg-[#8052ff] hover:bg-[#6b3ff5] text-white font-sans text-[12px] font-semibold uppercase tracking-[0.05em] px-4 py-2.5 rounded-[3.6px] transition-colors"
        >
          Access Terminal
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </nav>

      {/* Hero Section — Full viewport */}
      <section className="relative h-screen w-full flex items-center overflow-hidden">
        {/* Particle Field — Earth/Routing constellation */}
        <div className="absolute inset-0 z-0">
          <ParticleField />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-[1200px] mx-auto w-full px-8 md:px-[86px]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[580px]"
          >
            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-[#8052ff] font-sans text-[12px] font-semibold uppercase tracking-[0.05em] mb-6"
            >
              Pathfinding Intelligence Platform
            </motion.p>

            {/* Display Headline — weight 200, etched-in-light */}
            <h1 className="text-[58px] md:text-[78px] font-sans font-extralight leading-[0.9] tracking-[-0.04em] text-white mb-8">
              Route the
              <br />
              unroutable.
            </h1>

            {/* Body */}
            <p className="text-[15px] font-sans font-normal leading-[1.5] tracking-[0.025em] text-[#bdbdbd] mb-10 max-w-[440px]">
              TRENT OS runs A*, Dijkstra, and Contraction Hierarchies on real
              OpenStreetMap graphs across 16 global cities. Predict congestion.
              Simulate disruptions. Ship faster routes.
            </p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <Link
                href="/command-center"
                className="group inline-flex items-center gap-2 bg-[#8052ff] hover:bg-[#6b3ff5] text-white font-sans text-[12px] font-semibold uppercase tracking-[0.05em] px-6 py-3.5 rounded-[3.6px] transition-all"
              >
                Enter Command Center
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="font-mono text-[11px] text-[#9a9a9a] tracking-[0.05em] uppercase">
            Scroll
          </span>
          <div className="w-[1px] h-6 bg-gradient-to-b from-[#9a9a9a] to-transparent" />
        </motion.div>
      </section>

      {/* Scroll-driven Feature Sections */}
      <ScrollEngine />
    </main>
  );
}
