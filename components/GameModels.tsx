import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EntityType, Particle } from '../types';

// --- Procedural Texture Generation (Realistic Floor) ---
const useProceduralTextures = () => {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
            // Marble/Tile base
            ctx.fillStyle = '#eef2ff'; 
            ctx.fillRect(0, 0, 1024, 1024);
            
            // Checker pattern
            ctx.fillStyle = '#cbd5e1'; // Slate-200
            const tileSize = 256;
            for(let y=0; y<4; y++) {
                for(let x=0; x<4; x++) {
                    if ((x+y)%2 === 1) {
                        ctx.fillRect(x*tileSize, y*tileSize, tileSize, tileSize);
                    }
                }
            }
            
            // Grout lines
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 4;
            ctx.beginPath();
            for(let i=0; i<=4; i++) {
                ctx.moveTo(i*tileSize, 0);
                ctx.lineTo(i*tileSize, 1024);
                ctx.moveTo(0, i*tileSize);
                ctx.lineTo(1024, i*tileSize);
            }
            ctx.stroke();
        }
        
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(5, 10); // Repeat across the countertop strip
        tex.anisotropy = 16;
        return { floor: tex };
    }, []);
};

// --- Materials (PBR for realism) ---
const materials = {
    metal: new THREE.MeshStandardMaterial({ color: "#94a3b8", metalness: 0.9, roughness: 0.1 }),
    metalDark: new THREE.MeshStandardMaterial({ color: "#475569", metalness: 0.8, roughness: 0.4 }),
    tomato: new THREE.MeshStandardMaterial({ color: "#ef4444", roughness: 0.1, metalness: 0.1, emissive: "#7f1d1d", emissiveIntensity: 0.1 }),
    cheese: new THREE.MeshStandardMaterial({ color: "#fbbf24", roughness: 0.4 }),
    steak: new THREE.MeshStandardMaterial({ color: "#7f1d1d", roughness: 0.6 }),
    glowBlue: new THREE.MeshStandardMaterial({ color: "#3b82f6", emissive: "#3b82f6", emissiveIntensity: 2, toneMapped: false }),
    glowOrange: new THREE.MeshStandardMaterial({ color: "#f97316", emissive: "#f97316", emissiveIntensity: 2, toneMapped: false }),
    fridge: new THREE.MeshStandardMaterial({ color: "#f1f5f9", metalness: 0.3, roughness: 0.1 }),
    cabinet: new THREE.MeshStandardMaterial({ color: "#fef3c7", roughness: 0.8 }),
};

// --- The Chef Character ---
export const ChefModel = ({ isFury, isJumping, shieldActive }: { isFury: boolean; isJumping: boolean, shieldActive: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const hatRef = useRef<THREE.Group>(null);
  const shieldRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();
    const speed = isFury ? 25 : 18;
    
    // Running Animation
    if (leftLegRef.current && rightLegRef.current) {
      if (isJumping) {
         leftLegRef.current.rotation.x = -0.8;
         rightLegRef.current.rotation.x = 0.5;
      } else {
        leftLegRef.current.rotation.x = Math.sin(time * speed) * 0.8;
        rightLegRef.current.rotation.x = Math.sin(time * speed + Math.PI) * 0.8;
      }
    }

    // Hat wobble
    if (hatRef.current) {
        hatRef.current.rotation.z = Math.sin(time * 10) * 0.05;
        hatRef.current.position.y = 1.6 + Math.abs(Math.sin(time * speed * 2)) * 0.05;
    }

    // Shield Animation
    if (shieldRef.current) {
        shieldRef.current.rotation.y += 0.05;
        shieldRef.current.rotation.z = Math.sin(time * 2) * 0.2;
        const scale = 1 + Math.sin(time * 5) * 0.05;
        shieldRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Shield Visual */}
      {shieldActive && (
        <mesh ref={shieldRef} position={[0, 1, 0]}>
            <sphereGeometry args={[1.2, 32, 32]} />
            <meshBasicMaterial color="#60a5fa" transparent opacity={0.3} wireframe />
        </mesh>
      )}

      {/* Body */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.8, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      {/* Apron */}
      <mesh position={[0, 0.6, 0.25]}>
         <boxGeometry args={[0.5, 0.6, 0.1]} />
         <meshStandardMaterial color={isFury ? "#ef4444" : "#f97316"} emissive={isFury ? "#ef4444" : "black"} emissiveIntensity={isFury ? 0.5 : 0} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#fca5a5" />
      </mesh>
      {/* Mustache */}
      <mesh position={[0, 1.25, 0.22]} rotation={[0,0,Math.PI/2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial color="#4b5563" /> 
      </mesh>

      {/* Hat */}
      <group ref={hatRef}>
        <mesh position={[0, 0, 0]}>
           <cylinderGeometry args={[0.25, 0.2, 0.5, 16]} />
           <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
           <sphereGeometry args={[0.26, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
           <meshStandardMaterial color="white" />
        </mesh>
      </group>

      {/* Legs */}
      <mesh ref={leftLegRef} position={[-0.2, 0.4, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 8]} />
        <meshStandardMaterial color="#1f2937" />
        <mesh position={[0, -0.25, 0.1]}>
            <boxGeometry args={[0.12, 0.1, 0.2]} />
            <meshStandardMaterial color="black" />
        </mesh>
      </mesh>
      <mesh ref={rightLegRef} position={[0.2, 0.4, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 8]} />
        <meshStandardMaterial color="#1f2937" />
         <mesh position={[0, -0.25, 0.1]}>
            <boxGeometry args={[0.12, 0.1, 0.2]} />
            <meshStandardMaterial color="black" />
        </mesh>
      </mesh>
    </group>
  );
};

// --- Props & Obstacles ---

export const EntityModel = React.memo(({ type }: { type: EntityType }) => {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    if (type === EntityType.OBSTACLE_KNIFE) {
       meshRef.current.rotation.z = Math.sin(state.clock.getElapsedTime() * 5) * 0.1;
    } else if (type === EntityType.OBSTACLE_BURNER) {
       // Static
    } else {
       meshRef.current.rotation.y += 0.03;
       meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 3) * 0.1;
    }
  });

  // --- OBSTACLES ---
  if (type === EntityType.OBSTACLE_KNIFE) {
    return (
      <group ref={meshRef} position={[0, 1.5, 0]}>
        <mesh castShadow position={[0, 0.5, 0]}>
           <boxGeometry args={[0.1, 2.5, 0.8]} />
           <primitive object={materials.metal} />
        </mesh>
        <mesh position={[0, 1.8, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.8]} rotation={[Math.PI/2,0,0]} />
            <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Reflection Glint hint */}
        <mesh position={[0.06, 1, 0]}>
            <planeGeometry args={[0.01, 2]} />
            <meshBasicMaterial color="white" transparent opacity={0.4} />
        </mesh>
      </group>
    );
  }
  if (type === EntityType.OBSTACLE_POT) {
    return (
       <group ref={meshRef} position={[0, 0.6, 0]}>
        <mesh castShadow>
           <cylinderGeometry args={[0.7, 0.6, 1.2, 16]} />
           <primitive object={materials.metalDark} />
        </mesh>
        {/* Liquid */}
         <mesh position={[0, 0.5, 0]}>
           <cylinderGeometry args={[0.6, 0, 0.1, 16]} />
           <meshStandardMaterial color="#22c55e" />
        </mesh>
        {/* Handles */}
        <mesh position={[0.7, 0.3, 0]} rotation={[0,0,Math.PI/2]}>
            <cylinderGeometry args={[0.1, 0.1, 0.4]} />
            <primitive object={materials.metal} />
        </mesh>
        <mesh position={[-0.7, 0.3, 0]} rotation={[0,0,Math.PI/2]}>
            <cylinderGeometry args={[0.1, 0.1, 0.4]} />
            <primitive object={materials.metal} />
        </mesh>
      </group>
    );
  }
  if (type === EntityType.OBSTACLE_BURNER) {
      return (
          <group ref={meshRef} position={[0, 0.1, 0]}>
              <mesh receiveShadow>
                  <cylinderGeometry args={[1, 1.1, 0.2, 16]} />
                  <meshStandardMaterial color="#0f172a" />
              </mesh>
              <mesh position={[0, 0.3, 0]}>
                   <coneGeometry args={[0.8, 1, 8]} />
                   <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} transparent opacity={0.8} />
              </mesh>
              <pointLight color="#ef4444" intensity={3} distance={4} position={[0, 1, 0]} />
          </group>
      )
  }

  // --- ITEMS ---
  if (type === EntityType.ITEM_TOMATO) {
    return (
      <group ref={meshRef} position={[0,0.5,0]}>
        <mesh castShadow>
            <sphereGeometry args={[0.35, 16, 16]} />
            <primitive object={materials.tomato} />
        </mesh>
        {/* Leaves (Standard Geometry) */}
        <group position={[0, 0.32, 0]}>
             <mesh>
                 <cylinderGeometry args={[0.01, 0.05, 0.1, 5]} />
                 <meshStandardMaterial color="#15803d" />
             </mesh>
             <mesh position={[0, 0, 0]}>
                 <cylinderGeometry args={[0.15, 0.01, 0.02, 5]} />
                 <meshStandardMaterial color="#15803d" />
             </mesh>
        </group>
      </group>
    );
  }
  if (type === EntityType.ITEM_CHEESE) {
    return (
      <mesh ref={meshRef} position={[0,0.5,0]} castShadow rotation={[0.5, 0.5, 0]}>
        <boxGeometry args={[0.5, 0.4, 0.5]} />
        <primitive object={materials.cheese} />
        <mesh position={[0.1, 0.1, 0.26]}>
             <sphereGeometry args={[0.08]} />
             <meshStandardMaterial color="#d97706" />
        </mesh>
      </mesh>
    );
  }
  if (type === EntityType.ITEM_STEAK) {
     return (
      <mesh ref={meshRef} position={[0,0.5,0]} castShadow rotation={[Math.PI/2, 0, 0]}>
        <boxGeometry args={[0.6, 0.5, 0.15]} />
        <primitive object={materials.steak} />
        <mesh position={[0,0,0.08]} rotation={[0,0,0.5]}>
             <boxGeometry args={[0.6, 0.05, 0.01]} />
             <meshBasicMaterial color="#111" opacity={0.3} transparent />
        </mesh>
      </mesh>
    );
  }

  // --- POWERUPS ---
  if (type === EntityType.POWERUP_MAGNET) {
      return (
        <group ref={meshRef} position={[0, 0.8, 0]}>
            <mesh castShadow>
                <torusGeometry args={[0.4, 0.1, 8, 16, Math.PI]} />
                <primitive object={materials.metal} />
            </mesh>
            <mesh position={[-0.4, -0.2, 0]}>
                <boxGeometry args={[0.2, 0.4, 0.2]} />
                <meshStandardMaterial color="#ef4444" />
            </mesh>
            <mesh position={[0.4, -0.2, 0]}>
                <boxGeometry args={[0.2, 0.4, 0.2]} />
                <meshStandardMaterial color="#ef4444" />
            </mesh>
            <pointLight color="white" intensity={1} distance={3} />
        </group>
      );
  }
  if (type === EntityType.POWERUP_SHIELD) {
      return (
          <group ref={meshRef} position={[0, 0.8, 0]}>
              <mesh>
                  <sphereGeometry args={[0.4, 16, 16]} />
                  <primitive object={materials.glowBlue} />
              </mesh>
              <mesh scale={[1.2,1.2,1.2]}>
                  <sphereGeometry args={[0.4, 8, 8]} />
                  <meshBasicMaterial color="white" wireframe transparent opacity={0.5} />
              </mesh>
          </group>
      )
  }
  if (type === EntityType.POWERUP_TURBO) {
      return (
          <group ref={meshRef} position={[0, 0.8, 0]}>
             <mesh rotation={[0,0,Math.PI/2]}>
                 <coneGeometry args={[0.3, 0.8, 8]} />
                 <primitive object={materials.glowOrange} />
             </mesh>
             <mesh position={[0, -0.4, 0]} rotation={[Math.PI/2, 0, 0]}>
                 <ringGeometry args={[0.2, 0.5, 8]} />
                 <meshBasicMaterial color="orange" side={THREE.DoubleSide} />
             </mesh>
          </group>
      )
  }

  return null;
});

// --- Background Environment ---

export const GiantProp = React.memo(({ type, x, z, rotation }: { type: string, x: number, z: number, rotation: number }) => {
    if (type === 'toaster') {
        return (
            <group position={[x, 0, z]} rotation={[0, rotation, 0]} scale={[5, 5, 5]}>
                <mesh castShadow receiveShadow position={[0, 1, 0]}>
                    <boxGeometry args={[2, 1.5, 1]} />
                    <primitive object={materials.metal} />
                </mesh>
                <mesh position={[0, 1.8, 0]}>
                    <boxGeometry args={[1.5, 0.1, 0.2]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
                {/* Glow */}
                <pointLight position={[0, 1.5, 0.6]} color="orange" intensity={0.5} distance={5} />
            </group>
        );
    }
    if (type === 'flour') {
        return (
             <group position={[x, 0, z]} rotation={[0, rotation, 0]} scale={[4, 4, 4]}>
                <mesh castShadow position={[0, 1.5, 0]}>
                    <boxGeometry args={[1.5, 3, 1]} />
                    <meshStandardMaterial color="#fef3c7" roughness={1} />
                </mesh>
                <mesh position={[0, 2, 1.01]}>
                    <planeGeometry args={[1, 1]} />
                    <meshBasicMaterial color="#d97706" />
                </mesh>
             </group>
        )
    }
    if (type === 'milk') {
        return (
            <group position={[x, 0, z]} rotation={[0, rotation, 0]} scale={[4, 4, 4]}>
                 <mesh castShadow position={[0, 2, 0]}>
                    <boxGeometry args={[1.5, 4, 1.5]} />
                    <meshStandardMaterial color="#3b82f6" roughness={0.8} />
                 </mesh>
                 <mesh position={[0, 4.2, 0]} rotation={[0,0,Math.PI/4]}>
                     <boxGeometry args={[1, 0.5, 1.5]} />
                     <meshStandardMaterial color="#3b82f6" />
                 </mesh>
            </group>
        )
    }
    return null;
});

export const GiantBackgroundProp = React.memo(({ type, x, z, rotation }: { type: string, x: number, z: number, rotation: number }) => {
  if (type === 'fridge') {
     return (
       <group position={[x, 0, z]} rotation={[0, rotation, 0]} scale={[15, 15, 15]}>
          <mesh castShadow receiveShadow position={[0, 2.5, 0]}>
             <boxGeometry args={[2, 5, 2]} />
             <primitive object={materials.fridge} />
          </mesh>
          <mesh position={[0.1, 3, 1.01]}>
             <boxGeometry args={[0.1, 1, 0.05]} />
             <meshStandardMaterial color="#94a3b8" />
          </mesh>
       </group>
     )
  }
  if (type === 'cabinet') {
    return (
      <group position={[x, 0, z]} rotation={[0, rotation, 0]} scale={[15, 15, 15]}>
         <mesh castShadow receiveShadow position={[0, 2, 0]}>
            <boxGeometry args={[4, 4, 2]} />
            <primitive object={materials.cabinet} />
         </mesh>
         <mesh position={[0, 2, 1.01]}>
            <boxGeometry args={[0.1, 4, 0.02]} />
            <meshStandardMaterial color="#d97706" />
         </mesh>
         <mesh position={[-1, 2, 1.02]}>
            <sphereGeometry args={[0.1]} />
            <primitive object={materials.metal} />
         </mesh>
         <mesh position={[1, 2, 1.02]}>
            <sphereGeometry args={[0.1]} />
            <primitive object={materials.metal} />
         </mesh>
      </group>
    )
  }
  return null;
});

// Fixed size to prevent Z-fighting when tiling
export const KitchenCountertop = React.memo(({ position }: { position: [number, number, number] }) => {
    const textures = useProceduralTextures();
    
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow frustumCulled={false}>
            <planeGeometry args={[50, 100]} />
            <meshStandardMaterial 
                map={textures.floor}
                roughness={0.1}
                metalness={0.1}
            />
        </mesh>
    );
});

// --- Visual Effects (Optimized) ---

export const InstancedParticles = ({ particlesRef }: { particlesRef: React.MutableRefObject<Particle[]> }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useRef(new THREE.Object3D());

    useFrame(() => {
        if (!meshRef.current || !particlesRef.current) return;
        
        const particles = particlesRef.current;
        const count = particles.length;
        meshRef.current.count = count;
        
        for (let i = 0; i < count; i++) {
            const p = particles[i];
            dummy.current.position.set(p.x, p.y, p.z);
            dummy.current.scale.setScalar(Math.max(0, p.life));
            dummy.current.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.current.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, 300]}>
            <boxGeometry args={[0.15, 0.15, 0.15]} />
            <meshBasicMaterial color="white" transparent opacity={0.6} />
        </instancedMesh>
    );
};