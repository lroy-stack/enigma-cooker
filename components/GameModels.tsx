import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EntityType, Particle } from '../types';

// --- Procedural Texture Generation ---
const useProceduralTextures = () => {
    return useMemo(() => {
        const width = 512;
        const height = 512;
        
        // 1. Wood Texture (Butcher Block Floor) - High Contrast
        const canvasWood = document.createElement('canvas');
        canvasWood.width = width;
        canvasWood.height = height;
        const ctxWood = canvasWood.getContext('2d');
        if (ctxWood) {
            // Base dark brown
            ctxWood.fillStyle = '#78350f'; // Amber-900
            ctxWood.fillRect(0, 0, width, height);
            
            // Planks
            const plankWidth = 64;
            for (let i = 0; i < width / plankWidth; i++) {
                // Slight variation per plank
                ctxWood.fillStyle = i % 2 === 0 ? '#92400e' : '#78350f';
                ctxWood.fillRect(i * plankWidth, 0, plankWidth, height);
                
                // Wood grain lines
                ctxWood.strokeStyle = '#451a03'; // Darker
                ctxWood.globalAlpha = 0.2;
                ctxWood.beginPath();
                for(let j=0; j<20; j++) {
                    const x = i * plankWidth + Math.random() * plankWidth;
                    ctxWood.moveTo(x, 0);
                    ctxWood.lineTo(x, height);
                }
                ctxWood.stroke();
                ctxWood.globalAlpha = 1.0;
                
                // Gap
                ctxWood.fillStyle = '#271c19';
                ctxWood.fillRect((i+1)*plankWidth - 2, 0, 2, height);
            }
        }
        const texWood = new THREE.CanvasTexture(canvasWood);
        texWood.wrapS = THREE.RepeatWrapping;
        texWood.wrapT = THREE.RepeatWrapping;
        texWood.repeat.set(5, 10);
        
        // 2. Tile Texture (Walls)
        const canvasTile = document.createElement('canvas');
        canvasTile.width = width;
        canvasTile.height = height;
        const ctxTile = canvasTile.getContext('2d');
        if (ctxTile) {
            ctxTile.fillStyle = '#f8fafc'; // Slate-50
            ctxTile.fillRect(0, 0, width, height);
            
            ctxTile.strokeStyle = '#cbd5e1'; // Grout
            ctxTile.lineWidth = 4;
            const tileSize = 128;
            
            // Subway tile pattern
            for(let y=0; y<height/64; y++) {
                const offset = y % 2 === 0 ? 0 : -64;
                for(let x=0; x<(width/128)+1; x++) {
                    ctxTile.strokeRect(x*128 + offset, y*64, 128, 64);
                }
            }
        }
        const texTile = new THREE.CanvasTexture(canvasTile);
        texTile.wrapS = THREE.RepeatWrapping;
        texTile.wrapT = THREE.RepeatWrapping;
        texTile.repeat.set(2, 5);

        return { floor: texWood, wall: texTile };
    }, []);
};

// --- Materials ---
const materials = {
    metal: new THREE.MeshStandardMaterial({ color: "#94a3b8", metalness: 0.6, roughness: 0.2 }),
    metalDark: new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.5, roughness: 0.5 }),
    // Red Enamel Pot - Very distinct
    potBody: new THREE.MeshStandardMaterial({ color: "#dc2626", metalness: 0.2, roughness: 0.3 }), 
    potInside: new THREE.MeshStandardMaterial({ color: "#1e293b" }),
    // Handle for knife
    woodHandle: new THREE.MeshStandardMaterial({ color: "#451a03", roughness: 0.9 }),
    
    tomato: new THREE.MeshStandardMaterial({ color: "#ef4444", roughness: 0.2, emissive: "#991b1b", emissiveIntensity: 0.2 }),
    cheese: new THREE.MeshStandardMaterial({ color: "#fbbf24", roughness: 0.5 }),
    steak: new THREE.MeshStandardMaterial({ color: "#9f1239", roughness: 0.6 }),
    
    glowBlue: new THREE.MeshStandardMaterial({ color: "#3b82f6", emissive: "#3b82f6", emissiveIntensity: 2, toneMapped: false }),
    glowOrange: new THREE.MeshStandardMaterial({ color: "#f97316", emissive: "#f97316", emissiveIntensity: 2, toneMapped: false }),
    
    ceiling: new THREE.MeshStandardMaterial({ color: "#f1f5f9", roughness: 0.9 }),
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
        {/* Blade */}
        <mesh castShadow position={[0, 0.5, 0]}>
           <boxGeometry args={[0.1, 2.5, 0.8]} />
           <primitive object={materials.metal} />
        </mesh>
        {/* Handle - Dark Wood for Contrast */}
        <mesh position={[0, 1.8, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.8]} rotation={[Math.PI/2,0,0]} />
            <primitive object={materials.woodHandle} />
        </mesh>
        {/* Rivets */}
        <mesh position={[0.1, 1.8, 0.2]}>
            <sphereGeometry args={[0.05]} />
            <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[0.1, 1.8, -0.2]}>
            <sphereGeometry args={[0.05]} />
            <meshStandardMaterial color="#94a3b8" />
        </mesh>
      </group>
    );
  }
  if (type === EntityType.OBSTACLE_POT) {
    return (
       <group ref={meshRef} position={[0, 0.6, 0]}>
        {/* Main Pot - Red Enamel to stand out against wood floor */}
        <mesh castShadow>
           <cylinderGeometry args={[0.7, 0.6, 1.2, 16]} />
           <primitive object={materials.potBody} />
        </mesh>
        {/* Inner */}
        <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.6, 0.5, 0.1, 16]} />
            <primitive object={materials.potInside} />
        </mesh>
        {/* Liquid */}
         <mesh position={[0, 0.5, 0]}>
           <cylinderGeometry args={[0.55, 0, 0.1, 16]} />
           <meshStandardMaterial color="#16a34a" opacity={0.9} transparent />
        </mesh>
        {/* Handles */}
        <mesh position={[0.7, 0.3, 0]} rotation={[0,0,Math.PI/2]}>
            <cylinderGeometry args={[0.1, 0.1, 0.4]} />
            <primitive object={materials.metalDark} />
        </mesh>
        <mesh position={[-0.7, 0.3, 0]} rotation={[0,0,Math.PI/2]}>
            <cylinderGeometry args={[0.1, 0.1, 0.4]} />
            <primitive object={materials.metalDark} />
        </mesh>
      </group>
    );
  }
  if (type === EntityType.OBSTACLE_BURNER) {
      return (
          <group ref={meshRef} position={[0, 0.1, 0]}>
              <mesh receiveShadow>
                  <cylinderGeometry args={[1, 1.1, 0.2, 16]} />
                  <meshStandardMaterial color="#1e293b" />
              </mesh>
              {/* Grate */}
              <mesh position={[0, 0.15, 0]}>
                  <torusGeometry args={[0.8, 0.05, 8, 16]} rotation={[Math.PI/2, 0, 0]} />
                  <meshStandardMaterial color="#0f172a" />
              </mesh>
              <mesh position={[0, 0.3, 0]}>
                   <coneGeometry args={[0.6, 1, 8]} />
                   <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} transparent opacity={0.8} />
              </mesh>
              <pointLight color="#ef4444" intensity={2} distance={4} position={[0, 0.5, 0]} />
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
        {/* Leaves */}
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

// --- Environment ---

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
                <mesh position={[0, 2, 0.51]}>
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
             <meshStandardMaterial color="#f1f5f9" metalness={0.3} roughness={0.2} />
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
            <meshStandardMaterial color="#fcd34d" roughness={0.8} />
         </mesh>
      </group>
    )
  }
  return null;
});

// Replaces KitchenCountertop with a full room segment
export const KitchenSegment = React.memo(({ position }: { position: [number, number, number] }) => {
    const textures = useProceduralTextures();
    
    return (
        <group position={position}>
            {/* Floor - Dark Butcher Block */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.05, 0]}>
                <planeGeometry args={[50, 100]} />
                <meshStandardMaterial 
                    map={textures.floor}
                    roughness={0.8}
                />
            </mesh>
            
            {/* Left Wall - Tiled */}
            <mesh rotation={[0, Math.PI / 2, 0]} position={[-25, 25, 0]}>
                <planeGeometry args={[100, 50]} />
                <meshStandardMaterial map={textures.wall} />
            </mesh>

            {/* Right Wall - Tiled */}
            <mesh rotation={[0, -Math.PI / 2, 0]} position={[25, 25, 0]}>
                <planeGeometry args={[100, 50]} />
                <meshStandardMaterial map={textures.wall} />
            </mesh>

            {/* Ceiling */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 50, 0]}>
                <planeGeometry args={[50, 100]} />
                <primitive object={materials.ceiling} />
            </mesh>
            
            {/* Lights on Ceiling to mimic kitchen strip lights */}
            <mesh position={[0, 49, 0]} rotation={[Math.PI/2, 0, 0]}>
                 <boxGeometry args={[10, 100, 1]} />
                 <meshBasicMaterial color="#fef3c7" />
            </mesh>
        </group>
    );
});

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
            
            // Set color based on particle type/def (simplified here to white/gray/gold)
            // In a full implementation we would use setColorAt, but requires a color buffer.
            // For now, basic particles.
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