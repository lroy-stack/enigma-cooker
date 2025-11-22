import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EntityType } from '../types';

// --- The Chef Character ---
export const ChefModel = ({ isFury, isJumping }: { isFury: boolean; isJumping: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const hatRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Running animation
    const time = state.clock.getElapsedTime();
    const speed = isFury ? 20 : 15;
    
    if (leftLegRef.current && rightLegRef.current) {
      if (isJumping) {
         leftLegRef.current.rotation.x = -0.5;
         rightLegRef.current.rotation.x = 0.5;
      } else {
        leftLegRef.current.rotation.x = Math.sin(time * speed) * 0.8;
        rightLegRef.current.rotation.x = Math.sin(time * speed + Math.PI) * 0.8;
      }
    }

    // Bobbing head/hat
    if (hatRef.current) {
        hatRef.current.position.y = 1.6 + Math.abs(Math.sin(time * speed * 2)) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body (Apron) */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.8, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      {/* Apron detail */}
      <mesh position={[0, 0.6, 0.25]} rotation={[0,0,0]}>
         <boxGeometry args={[0.5, 0.6, 0.1]} />
         <meshStandardMaterial color={isFury ? "#ef4444" : "#f97316"} emissive={isFury ? "#ef4444" : "black"} emissiveIntensity={isFury ? 1 : 0} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#fca5a5" /> {/* Skin tone */}
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

// --- Items & Obstacles ---

export const IngredientModel = ({ type }: { type: EntityType }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.position.y = 0.5 + Math.sin(state.clock.getElapsedTime() * 3) * 0.1;
    }
  });

  if (type === EntityType.ITEM_TOMATO) {
    return (
      <mesh ref={meshRef} position={[0,0.5,0]} castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#ef4444" roughness={0.2} />
        <mesh position={[0, 0.28, 0]}>
             <cylinderGeometry args={[0.05, 0, 0.1]} />
             <meshStandardMaterial color="green" />
        </mesh>
      </mesh>
    );
  }
  if (type === EntityType.ITEM_CHEESE) {
    return (
      <mesh ref={meshRef} position={[0,0.5,0]} castShadow rotation={[0.5, 0.5, 0]}>
        <boxGeometry args={[0.4, 0.3, 0.4]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
    );
  }
  if (type === EntityType.ITEM_STEAK) {
     return (
      <mesh ref={meshRef} position={[0,0.5,0]} castShadow rotation={[Math.PI/2, 0, 0]}>
        <boxGeometry args={[0.5, 0.4, 0.1]} />
        <meshStandardMaterial color="#7f1d1d" />
      </mesh>
    );
  }
  return null;
};

export const ObstacleModel = ({ type }: { type: EntityType }) => {
  if (type === EntityType.OBSTACLE_KNIFE) {
    return (
      <group position={[0, 0.8, 0]}>
        <mesh castShadow>
           <boxGeometry args={[0.1, 2.5, 0.8]} />
           <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, -1.2, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.6]} rotation={[Math.PI/2,0,0]} />
            <meshStandardMaterial color="#4b5563" />
        </mesh>
      </group>
    );
  }
  if (type === EntityType.OBSTACLE_POT) {
    return (
       <group position={[0, 0.5, 0]}>
        <mesh castShadow>
           <cylinderGeometry args={[0.6, 0.5, 0.8, 16]} />
           <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.6} />
        </mesh>
         <mesh position={[0, 0.3, 0]}>
           <cylinderGeometry args={[0.5, 0, 0.2, 16]} />
           <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
        </mesh>
      </group>
    );
  }
  return null;
};

export const KitchenFloor = () => {
  // Creates a checkered infinite-looking floor pattern
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -50]} receiveShadow>
      <planeGeometry args={[20, 200]} />
      <meshStandardMaterial color="#fde68a" />
    </mesh>
  );
};
