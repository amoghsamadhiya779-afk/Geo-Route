"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface Feature {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  coordinate: string;
  image: string;
}

const features: Feature[] = [
  {
    id: "01",
    eyebrow: "CORE ENGINE",
    title: "Pathfinding\nat scale.",
    description:
      "Run A*, Dijkstra, and Contraction Hierarchies on real OpenStreetMap graphs. Visualize millions of explored nodes in real time across 16 global cities.",
    coordinate: "SYS_PATHFIND // A* · DIJKSTRA · CH",
    image:
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80&w=2000",
  },
  {
    id: "02",
    eyebrow: "SIMULATION LAB",
    title: "Stress-test\nevery route.",
    description:
      "Inject rain, strikes, and rush hour into any city. Compare algorithm performance across 16 global networks in real time.",
    coordinate: "SYS_SIMULATE // WEATHER · DENSITY · ALGO",
    image:
      "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&q=80&w=2000",
  },
  {
    id: "03",
    eyebrow: "PREDICTION ENGINE",
    title: "See traffic\nbefore it happens.",
    description:
      "ML-powered time-series forecasting. Slide through 48 hours of congestion futures with confidence intervals across Random Forest and Neural Net models.",
    coordinate: "SYS_PREDICT // RF · NN · ENSEMBLE",
    image:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000",
  },
];

export function ScrollEngine() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <div ref={containerRef} className="relative w-full h-[300vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#000000]">
        {/* Background Images */}
        {features.map((feature, index) => {
          // Strict 0-to-1 WAAPI-safe arrays
          let bgInput = [0, 1];
          let bgOutput = [1, 1];

          if (index === 0) {
            bgInput = [0, 0.28, 0.33, 1];
            bgOutput = [1, 1, 0, 0];
          } else if (index === 1) {
            bgInput = [0, 0.28, 0.33, 0.61, 0.66, 1];
            bgOutput = [0, 0, 1, 1, 0, 0];
          } else if (index === 2) {
            bgInput = [0, 0.61, 0.66, 1];
            bgOutput = [0, 0, 1, 1];
          }

          const opacity = useTransform(scrollYProgress, bgInput, bgOutput);
          const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

          return (
            <motion.div
              key={`bg-${feature.id}`}
              className="absolute inset-0 w-full h-full"
              style={{ opacity, willChange: "transform, opacity", transform: "translateZ(0)" }}
            >
              <motion.img
                src={feature.image}
                alt={feature.title}
                className="w-full h-full object-cover"
                style={{ scale, willChange: "transform" }}
              />
              {/* Dark overlay — lets text breathe on void */}
              <div className="absolute inset-0 bg-black/70" />
              {/* Violet/Cyan gradient accent from bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#8052ff]/30 via-[#000000]/60 to-[#00f0ff]/10 mix-blend-screen" />
            </motion.div>
          );
        })}

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 pb-24 md:p-[86px] z-20 max-w-[1200px] mx-auto w-full">
          {features.map((feature, index) => {
            let contentInput = [0, 1];
            let contentOp = [1, 1];
            let contentY = [0, 0];

            if (index === 0) {
              contentInput = [0, 0.24, 0.29, 1];
              contentOp = [1, 1, 0, 0];
              contentY = [0, 0, -40, -40];
            } else if (index === 1) {
              contentInput = [0, 0.26, 0.31, 0.57, 0.62, 1];
              contentOp = [0, 0, 1, 1, 0, 0];
              contentY = [40, 40, 0, 0, -40, -40];
            } else if (index === 2) {
              contentInput = [0, 0.59, 0.64, 1];
              contentOp = [0, 0, 1, 1];
              contentY = [40, 40, 0, 0];
            }

            const opacity = useTransform(
              scrollYProgress,
              contentInput,
              contentOp
            );
            const y = useTransform(scrollYProgress, contentInput, contentY);

            return (
              <motion.div
                key={`content-${feature.id}`}
                className="absolute bottom-24 md:bottom-[86px] left-8 md:left-[86px] w-full max-w-3xl"
                style={{ opacity, y, pointerEvents: "none", willChange: "transform, opacity" }}
              >
                {/* Eyebrow */}
                <div className="flex items-center gap-4 mb-4">
                  <span className="font-sans text-[12px] font-bold uppercase tracking-[0.05em] bg-clip-text text-transparent bg-gradient-to-r from-[#8052ff] to-[#00f0ff]">
                    {feature.eyebrow}
                  </span>
                </div>

                {/* Coordinate tag */}
                <div className="mb-6">
                  <span className="font-mono text-[#9a9a9a] text-[12px] tracking-[0.05em]">
                    {feature.coordinate}
                  </span>
                </div>

                {/* Display headline — weight 200, tight tracking */}
                <h2
                  className="text-[48px] md:text-[78px] font-sans font-extralight leading-[0.9] tracking-[-0.04em] text-white mb-6 whitespace-pre-line drop-shadow-[0_0_15px_rgba(128,82,255,0.3)]"
                >
                  {feature.title}
                </h2>

                {/* Body */}
                <p className="text-[15px] font-sans font-normal leading-[1.5] tracking-[0.025em] text-[#bdbdbd] max-w-xl">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Scroll progress indicator */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
          {features.map((feature, index) => {
            let dotInput = [0, 1];
            let dotOp = [0.2, 0.2];

            if (index === 0) {
              dotInput = [0, 0.15, 0.3, 1];
              dotOp = [1, 1, 0.2, 0.2];
            } else if (index === 1) {
              dotInput = [0, 0.28, 0.33, 0.61, 0.66, 1];
              dotOp = [0.2, 0.2, 1, 1, 0.2, 0.2];
            } else if (index === 2) {
              dotInput = [0, 0.61, 0.66, 1];
              dotOp = [0.2, 0.2, 1, 1];
            }

            const dotOpacity = useTransform(
              scrollYProgress,
              dotInput,
              dotOp
            );

            return (
              <motion.div
                key={`dot-${feature.id}`}
                className="w-[6px] h-[6px] rounded-full bg-[#8052ff]"
                style={{ opacity: dotOpacity }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
