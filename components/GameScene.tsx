import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Text, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { GameStatus, Lane, EntityType, GameEntity, GameState, FURY_DURATION, BASE_SPEED, FURY_SPEED_MULTIPLIER, JUMP_FORCE, GRAVITY } from '../types';
import { ChefModel, IngredientModel, ObstacleModel } from './GameModels';
import { soundManager } from '../utils/sound';

interface GameSceneProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const SPAWN_DISTANCE = 60;
const DESPAWN_DISTANCE = 10;
const LANE_WIDTH = 2;
const COLLISION_THRESHOLD = 0.8;

const Entity = React.memo(({ entity }: { entity: GameEntity }) => {
  return (
    <group position={[entity.x, 0, entity.z]}>
      {entity.type.startsWith('ITEM') ? (
        <IngredientModel type={entity.type} />
      ) : (
        <ObstacleModel type={entity.type} />
      )}
    </group>
  );
});

const GameLogic = ({ gameState, setGameState }: GameSceneProps) => {
  const playerRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
  // Refs for mutable game state in the loop to avoid re-renders
  const stateRef = useRef({
    status: gameState.status,
    playerLane: Lane.MIDDLE,
    playerZ: 0,
    playerY: 0,
    verticalVelocity: 0,
    isJumping: false,
    speed: BASE_SPEED,
    furyTimer: 0,
    entities: [] as GameEntity[],
    lastSpawnZ: -10,
    score: 0,
    ingredients: [] as EntityType[],
  });

  // Sync React state changes to ref (for restart/UI updates)
  useEffect(() => {
    if (gameState.status === GameStatus.MENU) {
      // Reset
      stateRef.current = {
        ...stateRef.current,
        status: GameStatus.MENU,
        playerZ: 0,
        playerLane: Lane.MIDDLE,
        playerY: 0,
        verticalVelocity: 0,
        isJumping: false,
        speed: BASE_SPEED,
        furyTimer: 0,
        entities: [],
        lastSpawnZ: -10,
        score: 0,
        ingredients: [],
      };
      if (playerRef.current) {
        playerRef.current.position.set(0,0,0);
      }
    } else if (gameState.status === GameStatus.PLAYING) {
      stateRef.current.status = GameStatus.PLAYING;
    }
  }, [gameState.status]);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.status !== GameStatus.PLAYING) return;

      if (e.key === 'ArrowLeft' || e.key === 'a') {
        if (stateRef.current.playerLane === Lane.RIGHT) stateRef.current.playerLane = Lane.MIDDLE;
        else if (stateRef.current.playerLane === Lane.MIDDLE) stateRef.current.playerLane = Lane.LEFT;
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        if (stateRef.current.playerLane === Lane.LEFT) stateRef.current.playerLane = Lane.MIDDLE;
        else if (stateRef.current.playerLane === Lane.MIDDLE) stateRef.current.playerLane = Lane.RIGHT;
      } else if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') && !stateRef.current.isJumping) {
        stateRef.current.verticalVelocity = JUMP_FORCE;
        stateRef.current.isJumping = true;
        soundManager.playJump();
      }
    };

    // Touch controls (basic swipe)
    let touchStartX = 0;
    let touchStartY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      if (stateRef.current.status !== GameStatus.PLAYING) return;
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;

      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (dx > 50) { // Right
           if (stateRef.current.playerLane === Lane.LEFT) stateRef.current.playerLane = Lane.MIDDLE;
           else if (stateRef.current.playerLane === Lane.MIDDLE) stateRef.current.playerLane = Lane.RIGHT;
        } else if (dx < -50) { // Left
           if (stateRef.current.playerLane === Lane.RIGHT) stateRef.current.playerLane = Lane.MIDDLE;
           else if (stateRef.current.playerLane === Lane.MIDDLE) stateRef.current.playerLane = Lane.LEFT;
        }
      } else {
        // Vertical swipe (Up for jump)
        if (dy < -50 && !stateRef.current.isJumping) {
          stateRef.current.verticalVelocity = JUMP_FORCE;
          stateRef.current.isJumping = true;
           soundManager.playJump();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Game Loop
  useFrame((state, delta) => {
    if (stateRef.current.status !== GameStatus.PLAYING) return;

    const currentSpeed = stateRef.current.furyTimer > 0 ? BASE_SPEED * FURY_SPEED_MULTIPLIER : BASE_SPEED + (Math.abs(stateRef.current.playerZ) * 0.005);
    stateRef.current.speed = currentSpeed;

    // Move Player Forward (In -Z direction)
    stateRef.current.playerZ -= currentSpeed * delta;

    // Handle Fury Timer
    if (stateRef.current.furyTimer > 0) {
      stateRef.current.furyTimer -= delta;
    }

    // Physics: Lane Switching (Lerp)
    if (playerRef.current) {
      playerRef.current.position.x = THREE.MathUtils.lerp(playerRef.current.position.x, stateRef.current.playerLane, delta * 10);
      playerRef.current.position.z = stateRef.current.playerZ;
    }

    // Physics: Jump
    if (stateRef.current.isJumping) {
      stateRef.current.playerY += stateRef.current.verticalVelocity * delta;
      stateRef.current.verticalVelocity -= GRAVITY * delta;
      if (stateRef.current.playerY <= 0) {
        stateRef.current.playerY = 0;
        stateRef.current.isJumping = false;
        stateRef.current.verticalVelocity = 0;
      }
      if (playerRef.current) {
        playerRef.current.position.y = stateRef.current.playerY;
      }
    }

    // Camera Follow
    if (cameraRef.current) {
      const camTargetZ = stateRef.current.playerZ + 6; // Behind
      const camTargetY = 3 + (stateRef.current.playerY * 0.5);
      cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, camTargetZ, delta * 5);
      cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, stateRef.current.playerLane * 0.3, delta * 2);
      cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, camTargetY, delta * 5);
      cameraRef.current.lookAt(0, 1, stateRef.current.playerZ - 10);
    }

    // Spawn Entities
    if (stateRef.current.playerZ - stateRef.current.lastSpawnZ < -15) {
      // Spawn a new row every 15 units
      stateRef.current.lastSpawnZ = stateRef.current.playerZ;
      const spawnZ = stateRef.current.playerZ - SPAWN_DISTANCE;
      
      // Simple spawning logic
      const lanes = [Lane.LEFT, Lane.MIDDLE, Lane.RIGHT];
      const laneToSpawn = lanes[Math.floor(Math.random() * lanes.length)];
      
      const isItem = Math.random() > 0.4; // 60% chance item, 40% obstacle
      let type: EntityType;

      if (isItem) {
         const items = [EntityType.ITEM_TOMATO, EntityType.ITEM_CHEESE, EntityType.ITEM_STEAK];
         type = items[Math.floor(Math.random() * items.length)];
      } else {
         type = Math.random() > 0.5 ? EntityType.OBSTACLE_KNIFE : EntityType.OBSTACLE_POT;
      }

      const newEntity: GameEntity = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        x: laneToSpawn,
        z: spawnZ,
        active: true
      };
      
      stateRef.current.entities.push(newEntity);
      
      // Cleanup old entities
      stateRef.current.entities = stateRef.current.entities.filter(e => e.z < stateRef.current.playerZ + DESPAWN_DISTANCE);
    }

    // Collision Detection
    stateRef.current.entities.forEach(entity => {
       if (!entity.active) return;

       // Check distance on Z axis
       const dz = Math.abs(entity.z - stateRef.current.playerZ);
       // Check lane (using X approximately)
       // We assume player is in lane if X is close to lane center
       const dx = Math.abs(entity.x - (playerRef.current?.position.x || 0));

       if (dz < COLLISION_THRESHOLD && dx < 0.5) {
         // Collision candidate
         // Check vertical clearance for jumpable obstacles if we wanted to implement duck/jump specific logic
         // For now, simple collision:
         
         if (entity.type.startsWith('ITEM')) {
            // Collect
            soundManager.playCollect();
            entity.active = false;
            stateRef.current.score += 10;
            
            // Check combo
            const newIngredients = [...stateRef.current.ingredients, entity.type];
            // Keep only last 3
            if (newIngredients.length > 3) newIngredients.shift();
            stateRef.current.ingredients = newIngredients;
            
            // Simple Combo Logic: If we have 3 distinct items? Or just specific ones. 
            // Let's do: Any 3 items collected recently triggers fury if not already active
            if (!stateRef.current.furyTimer && newIngredients.length === 3) {
                const unique = new Set(newIngredients);
                if (unique.size >= 2) { // Diversity bonus -> Fury
                    stateRef.current.furyTimer = FURY_DURATION;
                    stateRef.current.ingredients = [];
                    soundManager.playFuryStart();
                }
            }
            
            // Sync score to React state occasionally (for UI) or every frame?
            // For performance, we update React state only on events, not every frame.
            setGameState(prev => ({
                ...prev, 
                score: stateRef.current.score,
                ingredients: stateRef.current.ingredients,
                furyMode: stateRef.current.furyTimer > 0
            }));

         } else {
            // Obstacle
            // If jumping high enough over POT? Maybe.
            // Let's make KNIFE tall (undodgeable by jump), POT small (jumpable).
            const isJumpable = entity.type === EntityType.OBSTACLE_POT;
            const isHighEnough = stateRef.current.playerY > 1.0;

            if (isJumpable && isHighEnough) {
                // Dodged
            } else {
                // Crash
                if (stateRef.current.furyTimer > 0) {
                     // Invincible in Fury Mode? Or just break obstacle?
                     // Let's make invincible
                     entity.active = false;
                     soundManager.playCrash(); // Different sound maybe
                } else {
                    soundManager.playCrash();
                    stateRef.current.status = GameStatus.GAME_OVER;
                    setGameState(prev => ({ ...prev, status: GameStatus.GAME_OVER }));
                }
            }
         }
       }
    });
  });

  // Update Entities Visuals from ref
  // We need to force re-render of the entities group? 
  // No, `useFrame` handles logic, React renders based on state. 
  // Problem: `stateRef.current.entities` is not a React state, so adding to it won't trigger re-render of <Entity /> list.
  // Solution: Use a separate state for rendering entities, or use instanced mesh, or simple brute force:
  // Since we need high FPS, syncing array to State every frame is bad.
  // Better: The <Entities> component reads from ref or we use a fast state manager. 
  // For this prompt, I will use a `useState` that updates periodically or just strictly when spawning happens?
  // Actually, for a simple game, syncing state on spawn (rare event) is fine.
  
  const [renderEntities, setRenderEntities] = useState<GameEntity[]>([]);
  
  useFrame(() => {
      // Simple dirty check to update render list
      if (stateRef.current.entities.length !== renderEntities.length || 
          stateRef.current.entities.some((e, i) => e.active !== renderEntities[i]?.active)) {
          setRenderEntities([...stateRef.current.entities]);
      }
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 3, 6]} fov={60} />
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize={[1024, 1024]}
      />
      <Environment preset="sunset" />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Moving Floor Effect */}
      <group position={[0, -0.1, stateRef.current.playerZ]}> 
         {/* We parent the floor to the player Z so it looks infinite? 
             Actually no, standard runner: Player moves -Z. Floor is static but huge/tiled.
             We will create tiled floor segments.
         */}
      </group>
      
      {/* Simple infinite floor using grid helper moving with player */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, stateRef.current.playerZ - 20]} receiveShadow>
         <planeGeometry args={[20, 100]} />
         <meshStandardMaterial color="#fef3c7" />
      </mesh>
      
      {/* Decor: Kitchen Tiles */}
      <gridHelper 
        args={[200, 100, 0xd97706, 0xd97706]} 
        position={[0, 0.01, 0]} 
        rotation={[0,0,0]}
      />

      {/* Player */}
      <group ref={playerRef}>
        <ChefModel 
            isFury={stateRef.current.furyTimer > 0} 
            isJumping={stateRef.current.isJumping} 
        />
        {/* Shadow blob */}
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
            <circleGeometry args={[0.4, 32]} />
            <meshBasicMaterial color="black" opacity={0.3} transparent />
        </mesh>
      </group>

      {/* Entities */}
      {renderEntities.map(entity => (
        entity.active && <Entity key={entity.id} entity={entity} />
      ))}

      {/* Kitchen Background Walls (Moving with player to simulate giant room) */}
       <mesh position={[-8, 5, stateRef.current.playerZ - 10]}>
          <boxGeometry args={[1, 10, 50]} />
          <meshStandardMaterial color="#78350f" />
       </mesh>
       <mesh position={[8, 5, stateRef.current.playerZ - 10]}>
          <boxGeometry args={[1, 10, 50]} />
          <meshStandardMaterial color="#78350f" />
       </mesh>

       {/* Giant Spoons/Forks in background */}
       <group position={[12, 0, stateRef.current.playerZ - 30]} rotation={[0, -0.5, 0.2]}>
          <mesh>
            <cylinderGeometry args={[0.5, 0.5, 20]} />
            <meshStandardMaterial color="silver" />
          </mesh>
       </group>
    </>
  );
};

export default function GameScene({ gameState, setGameState }: GameSceneProps) {
  return (
    <Canvas shadows dpr={[1, 2]}>
      <GameLogic gameState={gameState} setGameState={setGameState} />
    </Canvas>
  );
}