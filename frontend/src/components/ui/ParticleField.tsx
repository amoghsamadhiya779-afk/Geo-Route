"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 4500;
const GLOBE_RADIUS = 2.8;

// A very rudimentary 3D pseudo-noise to cluster continents
function isLand(x: number, y: number, z: number) {
  const n = Math.sin(x * 1.2) * Math.cos(y * 1.2) + Math.sin(z * 1.2);
  const n2 = Math.cos(x * 2.5) + Math.sin(z * 2.5);
  return (n + n2 * 0.5) > 0.2;
}

function InstancedParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Compute initial positions, rotations, scales and colors ONCE.
  // This avoids running a JS loop over elements every frame.
  const { colorArray, matrices } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const cArray = new Float32Array(PARTICLE_COUNT * 3);
    const mArray = new Float32Array(PARTICLE_COUNT * 16);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let r, phi, theta;
      
      // 90% particles on the globe surface, 10% ambient drift
      if (i < PARTICLE_COUNT * 0.9) {
        phi = Math.acos(2 * Math.random() - 1);
        theta = Math.random() * Math.PI * 2;
        r = GLOBE_RADIUS;
      } else {
        const spread = 7;
        r = Math.random() * spread;
        phi = Math.acos(2 * Math.random() - 1);
        theta = Math.random() * Math.PI * 2;
      }
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      dummy.position.set(x, y, z);
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      const land = isLand(x, y, z);
      
      // Color logic (Earth-like blues and greens, lowered contrast)
      let color;
      if (i >= PARTICLE_COUNT * 0.9) {
         // Ambient drift - deep violet
         color = new THREE.Color("#4a3194");
      } else if (land) {
         // Land (Green with rare amber for cities)
         color = Math.random() > 0.95 ? new THREE.Color("#ffb829") : (Math.random() > 0.5 ? new THREE.Color("#15846e") : new THREE.Color("#1b6153"));
      } else {
         // Ocean (Deep blue/violet)
         color = Math.random() > 0.5 ? new THREE.Color("#1e1442") : new THREE.Color("#2d205c");
      }

      // Random scale — Land particles slightly larger
      const scale = (i >= PARTICLE_COUNT * 0.9) ? (Math.random() * 0.03 + 0.01) : (land ? (Math.random() * 0.035 + 0.015) : (Math.random() * 0.015 + 0.005));
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      
      dummy.matrix.toArray(mArray, i * 16);

      cArray[i * 3] = color.r;
      cArray[i * 3 + 1] = color.g;
      cArray[i * 3 + 2] = color.b;
    }

    return { colorArray: cArray, matrices: mArray };
  }, []);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.instanceMatrix.array = matrices;
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [matrices]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    
    // Rotate the whole constellation smoothly
    meshRef.current.rotation.y = time * 0.05;
    meshRef.current.rotation.x = Math.sin(time * 0.02) * 0.1;

    // Subtle breathing scale
    const breath = 1 + Math.sin(time * 0.3) * 0.01;
    meshRef.current.scale.setScalar(breath);
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      {/* Using Tetrahedron Geometry to get the triangular/diamond line-drawn shapes from Dala */}
      <tetrahedronGeometry args={[1, 0]} />
      <meshBasicMaterial 
        wireframe 
        transparent 
        opacity={0.35} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
      <instancedBufferAttribute attach="instanceColor" args={[colorArray, 3]} />
    </instancedMesh>
  );
}

export function ParticleField() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 50 }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <InstancedParticles />
      </Canvas>
    </div>
  );
}
