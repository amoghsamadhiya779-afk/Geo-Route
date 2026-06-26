"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 12000;

// Colors
const COLOR_PRIMARY = new THREE.Color("#8052ff"); // Plum Voltage
const COLOR_SECONDARY = new THREE.Color("#00f0ff"); // Electric Cyan
const COLOR_TERTIARY = new THREE.Color("#ffb829"); // Amber Spark

function generateMonumentData() {
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const randoms = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    randoms[i] = Math.random();
    let c = COLOR_PRIMARY;
    if (Math.random() > 0.8) c = COLOR_SECONDARY;
    if (Math.random() > 0.97) c = COLOR_TERTIARY;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  // Helper to map precise geometric points to EXACTLY the particle count (with shuffling)
  const generate = (builderFunc: (pts: {x:number, y:number, z:number}[]) => void) => {
    const pts: {x:number, y:number, z:number}[] = [];
    builderFunc(pts);
    
    const out = new Float32Array(PARTICLE_COUNT * 3);
    const indices = Array.from({length: PARTICLE_COUNT}, (_, i) => i);
    // Shuffle indices so morphing looks chaotic and beautiful
    indices.sort(() => Math.random() - 0.5);
    
    for(let i=0; i<PARTICLE_COUNT; i++) {
      // Safely sample points. If we generated too few, loop over them.
      const pt = pts[i % pts.length];
      // Micro-noise to prevent Z-fighting if points overlap
      const noise = 0.005; 
      const idx = indices[i] * 3;
      out[idx] = pt.x + (Math.random()-0.5)*noise;
      out[idx+1] = pt.y + (Math.random()-0.5)*noise;
      out[idx+2] = pt.z + (Math.random()-0.5)*noise;
    }
    return out;
  };

  // ==========================================
  // 0: Eiffel Tower (Structural Wireframe)
  // ==========================================
  const eiffel = generate((pts) => {
    const H = 5.0;
    const baseW = 1.4;
    
    // Leg edges & cross braces
    for (let y = -2.5; y <= 2.5; y += 0.04) {
      const t = (y + 2.5) / H; // 0 to 1
      const w = baseW * Math.pow(1 - t, 1.8) + 0.05; 
      
      // 4 structural corners
      pts.push({x: -w, y, z: -w});
      pts.push({x: w, y, z: -w});
      pts.push({x: w, y, z: w});
      pts.push({x: -w, y, z: w});
      
      // Faces grid (X-bracing illusion by stepping)
      if (Math.random() > 0.3) {
        const lx = (Math.random() - 0.5) * w * 2;
        pts.push({x: lx, y, z: -w});
        pts.push({x: lx, y, z: w});
        pts.push({x: -w, y, z: lx});
        pts.push({x: w, y, z: lx});
      }
    }
    
    // Decks (Observation platforms)
    [-1.0, 0.5, 1.8].forEach(dy => {
      const t = (dy + 2.5) / H;
      const w = baseW * Math.pow(1 - t, 1.8) + 0.15;
      for (let x = -w; x <= w; x += 0.05) {
        pts.push({x, y: dy, z: -w});
        pts.push({x, y: dy, z: w});
        pts.push({x: -w, y: dy, z: x});
        pts.push({x: w, y: dy, z: x});
      }
    });
  });

  // ==========================================
  // 1: Sydney Opera House (Interlocking Shells)
  // ==========================================
  const sydney = generate((pts) => {
    const createShell = (scale: number, offsetX: number, rotY: number) => {
      // Parametric surface for a curved shell
      for (let u = 0; u <= 1; u += 0.02) {
        for (let v = 0; v <= Math.PI; v += 0.04) {
           const taper = Math.pow(1 - u, 1.2); 
           
           let lx = u * scale * 2 - scale; 
           let ly = Math.sin(v) * scale * 1.5 - 1.5;
           let lz = Math.cos(v) * scale * taper;
           
           // Only plot the edges/surface heavily
           if (Math.random() > 0.8 || v < 0.1 || v > Math.PI - 0.1 || u > 0.95) {
             const rx = lx * Math.cos(rotY) - lz * Math.sin(rotY);
             const rz = lx * Math.sin(rotY) + lz * Math.cos(rotY);
             pts.push({x: rx + offsetX, y: ly, z: rz});
           }
        }
      }
    };
    
    // Main shells facing right
    createShell(1.6, -0.6, 0);
    createShell(1.2, 0.4, 0);
    createShell(0.8, 1.2, 0);
    
    // Smaller shells facing left
    createShell(0.8, -1.2, Math.PI);
    createShell(0.6, -0.2, Math.PI);
    
    // Base platform (Tiered steps)
    for (let x = -2.8; x <= 2.2; x += 0.1) {
       for (let z = -1.5; z <= 1.5; z += 0.1) {
          pts.push({x, y: -1.5, z});
          if (x > -2.0 && x < 1.5) pts.push({x, y: -1.4, z: z*0.9});
       }
    }
  });

  // ==========================================
  // 2: Taj Mahal (Dome, Box Base, Minarets)
  // ==========================================
  const taj = generate((pts) => {
    // Main Onion Dome
    for(let phi = 0; phi <= Math.PI/2; phi += 0.04) {
       for(let theta = 0; theta <= Math.PI*2; theta += 0.08) {
          const r = 1.3 * Math.sin(phi) * Math.pow(Math.cos(phi), 0.3) + 0.05; 
          pts.push({
             x: r * Math.cos(theta),
             y: Math.cos(phi)*1.4 + 0.4, 
             z: r * Math.sin(theta)
          });
       }
    }
    
    // Main Building Box (Hollowed archways)
    for(let x=-1.6; x<=1.6; x+=0.06) {
      for(let y=-1.5; y<=0.4; y+=0.06) {
        for(let z=-1.6; z<=1.6; z+=0.06) {
           const isWall = Math.abs(x) > 1.5 || Math.abs(z) > 1.5 || y > 0.3;
           if (!isWall) continue;
           
           // Carve grand archways
           const isArchX = Math.abs(x) < 0.5 && y < -0.1;
           const isArchZ = Math.abs(z) < 0.5 && y < -0.1;
           if ((isArchX && Math.abs(z) > 1.4) || (isArchZ && Math.abs(x) > 1.4)) continue;
           
           pts.push({x, y, z});
        }
      }
    }
    
    // Four Corner Minarets (Pillars)
    const corners = [[-2.4, -2.4], [2.4, -2.4], [2.4, 2.4], [-2.4, 2.4]];
    corners.forEach(([cx, cz]) => {
       for(let y=-1.5; y<=1.6; y+=0.05) {
          for(let a=0; a<=Math.PI*2; a+=0.8) {
             const r = 0.15;
             pts.push({x: cx + Math.cos(a)*r, y, z: cz + Math.sin(a)*r});
          }
       }
       // Minaret crown
       for(let a=0; a<=Math.PI*2; a+=0.4) {
          pts.push({x: cx + Math.cos(a)*0.25, y: 1.7, z: cz + Math.sin(a)*0.25});
          pts.push({x: cx, y: 1.9, z: cz}); // tip
       }
    });
  });

  return { positions: [eiffel, sydney, taj], colors, randoms };
}

function ParticleSystem({ activeIndex }: { activeIndex: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const { positions, colors, randoms } = useMemo(() => generateMonumentData(), []);
  const currentPositions = useMemo(() => new Float32Array(positions[0]), [positions]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    
    const targetPositions = positions[activeIndex];
    let needsUpdate = false;

    // High-performance morphing loop
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const speed = 0.04 + randoms[i] * 0.04; // Smooth, varied easing

      // Lerp X
      const dx = targetPositions[i3] - currentPositions[i3];
      if (Math.abs(dx) > 0.001) { currentPositions[i3] += dx * speed; needsUpdate = true; }
      
      // Lerp Y
      const dy = targetPositions[i3 + 1] - currentPositions[i3 + 1];
      if (Math.abs(dy) > 0.001) { currentPositions[i3 + 1] += dy * speed; needsUpdate = true; }
      
      // Lerp Z
      const dz = targetPositions[i3 + 2] - currentPositions[i3 + 2];
      if (Math.abs(dz) > 0.001) { currentPositions[i3 + 2] += dz * speed; needsUpdate = true; }

      // Shimmer/Hover effects
      const hover = Math.sin(time * 3 + randoms[i] * Math.PI * 2) * 0.015;
      
      dummy.position.set(
        currentPositions[i3], 
        currentPositions[i3 + 1] + hover, 
        currentPositions[i3 + 2]
      );
      
      dummy.rotation.set(time * 0.5 + randoms[i] * 10, time * 0.3 + randoms[i] * 10, 0);
      dummy.scale.setScalar(0.012 + randoms[i] * 0.01);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    if (needsUpdate || true) meshRef.current.instanceMatrix.needsUpdate = true;
    
    // Dynamic Camera and Rotation based on active monument
    const targetCamY = activeIndex === 0 ? 1.5 : (activeIndex === 1 ? -0.5 : 0.5);
    const targetCamZ = activeIndex === 0 ? 9 : 8;
    state.camera.position.y += (targetCamY - state.camera.position.y) * 0.03;
    state.camera.position.z += (targetCamZ - state.camera.position.z) * 0.03;
    
    // Smooth cinematic rotation
    meshRef.current.rotation.y = time * 0.08;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      {/* Sharp wireframe geometry to avoid blobby/play-dough look */}
      <tetrahedronGeometry args={[1, 0]} />
      <meshBasicMaterial 
        wireframe 
        transparent 
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
      <instancedBufferAttribute attach="instanceColor" args={[colors, 3]} />
    </instancedMesh>
  );
}

export function MonumentParticles({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.5} />
        <ParticleSystem activeIndex={activeIndex} />
      </Canvas>
    </div>
  );
}
