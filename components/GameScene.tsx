import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Stars, SpotLight } from '@react-three/drei';
import * as THREE from 'three';
import { GameStatus, Lane, EntityType, GameEntity, GameState, Particle, FURY_DURATION, POWERUP_DURATION, BASE_SPEED, MAX_SPEED, FURY_SPEED_MULTIPLIER, JUMP_FORCE, GRAVITY } from '../types';
import { ChefModel, EntityModel, KitchenCountertop, GiantProp, ParticleSystem } from './GameModels';
import { soundManager } from '../utils/sound';

interface GameSceneProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const SPAWN_DISTANCE = 80;
const DESPAWN_DISTANCE = 10;
const COLLISION_THRESHOLD = 0.8;
const LANE_WIDTH = 2.2; // Slightly wider for giant feel

// Spawning Patterns
type Pattern = (z: number) => GameEntity[];

const createSingleLinePattern: Pattern = (z) => {
    const lane = [Lane.LEFT, Lane.MIDDLE, Lane.RIGHT][Math.floor(Math.random() * 3)];
    const entities: GameEntity[] = [];
    for (let i = 0; i < 5; i++) {
        entities.push({
            id: Math.random().toString(),
            type: EntityType.ITEM_TOMATO,
            x: lane,
            z: z - (i * 2),
            active: true
        });
    }
    return entities;
};

const createWallPattern: Pattern = (z) => {
    // Two obstacles, one free lane
    const lanes = [Lane.LEFT, Lane.MIDDLE, Lane.RIGHT];
    const freeLaneIndex = Math.floor(Math.random() * 3);
    const entities: GameEntity[] = [];
    
    lanes.forEach((lane, idx) => {
        if (idx !== freeLaneIndex) {
            entities.push({
                id: Math.random().toString(),
                type: Math.random() > 0.5 ? EntityType.OBSTACLE_POT : EntityType.OBSTACLE_KNIFE,
                x: lane,
                z: z,
                active: true
            });
        } else {
            // Reward in the gap
             entities.push({
                id: Math.random().toString(),
                type: EntityType.ITEM_CHEESE,
                x: lane,
                z: z,
                active: true
            });
        }
    });
    return entities;
};

const createPowerupPattern: Pattern = (z) => {
    const lane = [Lane.LEFT, Lane.MIDDLE, Lane.RIGHT][Math.floor(Math.random() * 3)];
    const powerups = [EntityType.POWERUP_MAGNET, EntityType.POWERUP_SHIELD, EntityType.POWERUP_TURBO];
    return [{
        id: Math.random().toString(),
        type: powerups[Math.floor(Math.random() * powerups.length)],
        x: lane,
        z: z,
        active: true
    }];
};

const GameLogic = ({ gameState, setGameState }: GameSceneProps) => {
  const playerRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
  const stateRef = useRef({
    status: gameState.status,
    playerLane: Lane.MIDDLE,
    playerZ: 0,
    playerY: 0,
    verticalVelocity: 0,
    isJumping: false,
    speed: BASE_SPEED,
    furyTimer: 0,
    powerupTimer: 0,
    activePowerup: null as EntityType | null,
    entities: [] as GameEntity[],
    particles: [] as Particle[],
    lastSpawnZ: -10,
    score: 0,
    ingredients: [] as EntityType[],
    shakeIntensity: 0,
  });

  const [renderEntities, setRenderEntities] = useState<GameEntity[]>([]);
  const [renderParticles, setRenderParticles] = useState<Particle[]>([]);
  
  // Environment Props (Static list for now, could be dynamic)
  const sideProps = useMemo(() => {
      const props = [];
      for(let i=0; i<20; i++) {
          const z = -i * 30;
          const isLeft = i % 2 === 0;
          const type = ['toaster', 'flour', 'milk'][Math.floor(Math.random() * 3)];
          props.push({ 
              id: i, 
              type, 
              x: isLeft ? -15 : 15, 
              z: z,
              rotation: (Math.random() * 0.5) - 0.2
          });
      }
      return props;
  }, []);

  // Refs sync
  useEffect(() => {
    if (gameState.status === GameStatus.MENU) {
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
        powerupTimer: 0,
        activePowerup: null,
        entities: [],
        particles: [],
        lastSpawnZ: -10,
        score: 0,
        ingredients: [],
        shakeIntensity: 0,
      };
      if (playerRef.current) playerRef.current.position.set(0,0,0);
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

    let touchStartX = 0;
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (stateRef.current.status !== GameStatus.PLAYING) return;
      const dx = e.changedTouches[0].screenX - touchStartX;
      const dy = e.changedTouches[0].screenY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 40) { // Right
           if (stateRef.current.playerLane === Lane.LEFT) stateRef.current.playerLane = Lane.MIDDLE;
           else if (stateRef.current.playerLane === Lane.MIDDLE) stateRef.current.playerLane = Lane.RIGHT;
        } else if (dx < -40) { // Left
           if (stateRef.current.playerLane === Lane.RIGHT) stateRef.current.playerLane = Lane.MIDDLE;
           else if (stateRef.current.playerLane === Lane.MIDDLE) stateRef.current.playerLane = Lane.LEFT;
        }
      } else if (dy < -40 && !stateRef.current.isJumping) {
          stateRef.current.verticalVelocity = JUMP_FORCE;
          stateRef.current.isJumping = true;
          soundManager.playJump();
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

  // Spawn Particle
  const spawnParticles = (x: number, y: number, z: number, color: string, count: number) => {
      for(let i=0; i<count; i++) {
          stateRef.current.particles.push({
              id: Math.random(),
              x, y, z,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() * 4) + 2,
              vz: (Math.random() - 0.5) * 4,
              life: 1.0,
              color
          });
      }
  };

  // Game Loop
  useFrame((state, delta) => {
    if (stateRef.current.status !== GameStatus.PLAYING) return;

    const dt = Math.min(delta, 0.1); // Cap delta for lag spikes
    const s = stateRef.current;

    // --- SPEED & SCORE ---
    // Base speed increases with distance
    let targetSpeed = BASE_SPEED + (Math.abs(s.playerZ) * 0.01);
    if (s.furyTimer > 0) targetSpeed *= FURY_SPEED_MULTIPLIER;
    if (s.activePowerup === EntityType.POWERUP_TURBO) targetSpeed *= 1.8;
    
    targetSpeed = Math.min(targetSpeed, MAX_SPEED); // Cap absolute max
    
    // Smooth speed transition
    s.speed = THREE.MathUtils.lerp(s.speed, targetSpeed, dt * 2);

    s.playerZ -= s.speed * dt;
    s.score += (s.speed * dt) * 0.5; // Score based on distance

    // --- TIMERS ---
    if (s.furyTimer > 0) {
        s.furyTimer -= dt;
        if (s.furyTimer <= 0) {
             setGameState(prev => ({ ...prev, furyMode: false }));
        }
    }
    if (s.powerupTimer > 0) {
        s.powerupTimer -= dt;
        if (s.powerupTimer <= 0) {
            s.activePowerup = null;
            setGameState(prev => ({ ...prev, shieldActive: false, magnetActive: false }));
        }
    }

    // --- PHYSICS: PLAYER ---
    if (playerRef.current) {
      // X movement with "tilt"
      playerRef.current.position.x = THREE.MathUtils.lerp(playerRef.current.position.x, s.playerLane * (LANE_WIDTH/2), dt * 12);
      const tilt = (playerRef.current.position.x - (s.playerLane * (LANE_WIDTH/2))) * -0.2;
      playerRef.current.rotation.z = THREE.MathUtils.lerp(playerRef.current.rotation.z, tilt, dt * 10);
      
      playerRef.current.position.z = s.playerZ;
    }

    // Y Movement (Jump)
    if (s.isJumping) {
      s.playerY += s.verticalVelocity * dt;
      s.verticalVelocity -= GRAVITY * dt;
      if (s.playerY <= 0) {
        s.playerY = 0;
        s.isJumping = false;
        s.verticalVelocity = 0;
        // Land dust?
      }
      if (playerRef.current) {
          playerRef.current.position.y = s.playerY;
      }
    }

    // --- PARTICLES ---
    for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt + (s.speed * dt * 0.5); // Wind effect
        p.vy -= 15 * dt; // Gravity
        p.life -= dt * 1.5;
        if (p.life <= 0 || p.y < 0) {
            s.particles.splice(i, 1);
        }
    }

    // --- CAMERA ---
    if (cameraRef.current) {
      // Shake decay
      s.shakeIntensity = THREE.MathUtils.lerp(s.shakeIntensity, 0, dt * 5);
      const shakeX = (Math.random() - 0.5) * s.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * s.shakeIntensity;

      const camDist = s.activePowerup === EntityType.POWERUP_TURBO ? 9 : 7;
      const camHeight = 3.5 + (s.playerY * 0.3);
      const fovBase = 60;
      const fovTarget = s.activePowerup === EntityType.POWERUP_TURBO ? 85 : (s.furyTimer > 0 ? 75 : 60);
      
      cameraRef.current.fov = THREE.MathUtils.lerp(cameraRef.current.fov, fovTarget, dt * 2);
      cameraRef.current.updateProjectionMatrix();

      const targetZ = s.playerZ + camDist;
      cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, targetZ, dt * 10);
      cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, camHeight, dt * 5);
      cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, (s.playerLane * 0.5) + shakeX, dt * 3);
      cameraRef.current.lookAt(0 + shakeX, 1 + shakeY, s.playerZ - 10);
    }

    // --- SPAWNING ---
    if (s.playerZ - s.lastSpawnZ < -20) {
      s.lastSpawnZ = s.playerZ;
      const spawnZ = s.playerZ - SPAWN_DISTANCE;
      
      // Choose Pattern
      const r = Math.random();
      let newEntities: GameEntity[] = [];
      
      if (r < 0.1 && !s.activePowerup) {
          newEntities = createPowerupPattern(spawnZ);
      } else if (r < 0.4) {
          newEntities = createSingleLinePattern(spawnZ);
      } else if (r < 0.7) {
          newEntities = createWallPattern(spawnZ);
      } else {
          // Random simple row
          const lane = [Lane.LEFT, Lane.MIDDLE, Lane.RIGHT][Math.floor(Math.random()*3)];
          const type = Math.random() > 0.5 ? EntityType.OBSTACLE_KNIFE : EntityType.OBSTACLE_BURNER;
          newEntities.push({ id: Math.random().toString(), type, x: lane, z: spawnZ, active: true });
      }
      
      s.entities.push(...newEntities);
      // Cleanup
      s.entities = s.entities.filter(e => e.z < s.playerZ + DESPAWN_DISTANCE && e.active);
    }

    // --- ENTITY LOGIC & COLLISION ---
    s.entities.forEach(entity => {
       if (!entity.active) return;

       // MAGNET EFFECT
       if (s.activePowerup === EntityType.POWERUP_MAGNET && entity.type.startsWith('ITEM')) {
           const dist = Math.sqrt(Math.pow(entity.x - playerRef.current!.position.x, 2) + Math.pow(entity.z - s.playerZ, 2));
           if (dist < 10) {
               entity.x = THREE.MathUtils.lerp(entity.x, playerRef.current!.position.x, dt * 5);
               entity.z = THREE.MathUtils.lerp(entity.z, s.playerZ, dt * 5);
           }
       }

       const dz = Math.abs(entity.z - s.playerZ);
       const dx = Math.abs(entity.x - (playerRef.current?.position.x || 0));

       if (dz < COLLISION_THRESHOLD && dx < 0.7) {
         if (entity.type.startsWith('ITEM') || entity.type.startsWith('POWERUP')) {
            // COLLECT
            soundManager.playCollect();
            entity.active = false;
            
            if (entity.type.startsWith('POWERUP')) {
                soundManager.playPowerup(
                    entity.type === EntityType.POWERUP_SHIELD ? 'shield' : 
                    entity.type === EntityType.POWERUP_MAGNET ? 'magnet' : 'turbo'
                );
                s.activePowerup = entity.type;
                s.powerupTimer = POWERUP_DURATION;
                setGameState(prev => ({ 
                    ...prev, 
                    shieldActive: entity.type === EntityType.POWERUP_SHIELD,
                    magnetActive: entity.type === EntityType.POWERUP_MAGNET
                }));
            } else {
                // Item
                s.score += 50;
                spawnParticles(entity.x, 0.5, entity.z, "gold", 5);
                
                // Combo logic
                const newIngredients = [...s.ingredients, entity.type];
                if (newIngredients.length > 3) newIngredients.shift();
                s.ingredients = newIngredients;
                
                if (!s.furyTimer && newIngredients.length === 3) {
                    const unique = new Set(newIngredients);
                    if (unique.size >= 2) { 
                        s.furyTimer = FURY_DURATION;
                        s.ingredients = [];
                        soundManager.playFuryStart();
                        setGameState(prev => ({ ...prev, furyMode: true }));
                    }
                }
                setGameState(prev => ({ ...prev, score: s.score, ingredients: s.ingredients }));
            }
         } else {
            // OBSTACLE
            const isJumpable = entity.type === EntityType.OBSTACLE_POT || entity.type === EntityType.OBSTACLE_BURNER;
            const isHighEnough = s.playerY > 1.2;

            if (isJumpable && isHighEnough) {
                // Dodged by jump
            } else {
                // HIT
                if (s.activePowerup === EntityType.POWERUP_SHIELD) {
                    // Shield Break
                    entity.active = false;
                    s.activePowerup = null;
                    s.powerupTimer = 0;
                    s.shakeIntensity = 0.5;
                    spawnParticles(0, 1, s.playerZ + 1, "blue", 10);
                    soundManager.playCrash(); // Soft crash
                    setGameState(prev => ({ ...prev, shieldActive: false }));
                } else if (s.furyTimer > 0 || s.activePowerup === EntityType.POWERUP_TURBO) {
                    // Smash through
                    entity.active = false;
                    s.shakeIntensity = 0.3;
                    soundManager.playCrash();
                    spawnParticles(entity.x, 0.5, entity.z, "gray", 8);
                } else {
                    // Game Over
                    s.shakeIntensity = 1.0;
                    soundManager.playCrash();
                    s.status = GameStatus.GAME_OVER;
                    setGameState(prev => ({ ...prev, status: GameStatus.GAME_OVER }));
                }
            }
         }
       }
    });

    // Sync render state occasionally for perf
    if (state.clock.elapsedTime % 0.05 < 0.02) {
         setRenderEntities([...s.entities]);
         setRenderParticles([...s.particles]);
    }
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 4, 8]} fov={60} />
      
      {/* Lighting: Giant Kitchen Ambience */}
      <ambientLight intensity={0.7} color="#fff7ed" /> {/* Warm ambient */}
      <directionalLight 
        position={[20, 50, 10]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[1024, 1024]}
        color="#fff"
      />
      <SpotLight 
         position={[0, 10, stateRef.current.playerZ - 10]}
         angle={0.5}
         penumbra={1}
         intensity={2}
         color="#fbbf24"
         distance={40}
         target={playerRef.current || undefined}
      />

      <Stars radius={200} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />

      {/* Environment Props Scaling with player position to fake infinity */}
      <group position={[0, 0, Math.floor(stateRef.current.playerZ / 100) * 100]}>
           <KitchenCountertop />
           {/* Next chunk */}
           <group position={[0, 0, -100]}><KitchenCountertop /></group>
      </group>

      {/* Giant Side Props (Looping) */}
      {sideProps.map(prop => {
          // Calculate relative Z to loop them around the player
          const loopLength = 600;
          const relativeZ = (prop.z - stateRef.current.playerZ) % loopLength;
          const visibleZ = stateRef.current.playerZ + relativeZ;
          
          // Only render if within view distance
          if (Math.abs(visibleZ - stateRef.current.playerZ) > 100) return null;

          return (
              <group key={prop.id}>
                  <GiantProp 
                     type={prop.type} 
                     x={prop.x} 
                     z={visibleZ} 
                     rotation={prop.rotation} 
                  />
              </group>
          );
      })}

      {/* Player */}
      <group ref={playerRef}>
        <ChefModel 
            isFury={stateRef.current.furyTimer > 0} 
            isJumping={stateRef.current.isJumping}
            shieldActive={stateRef.current.shieldActive}
        />
        {/* Shadow blob */}
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
            <circleGeometry args={[0.4, 32]} />
            <meshBasicMaterial color="black" opacity={0.3} transparent />
        </mesh>
      </group>

      {/* Entities */}
      {renderEntities.map(entity => (
          entity.active && (
              <group key={entity.id} position={[entity.x, 0, entity.z]}>
                  <EntityModel type={entity.type} />
              </group>
          )
      ))}

      {/* Particles */}
      <ParticleSystem particles={renderParticles} />
    </>
  );
};

export default function GameScene({ gameState, setGameState }: GameSceneProps) {
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
      <GameLogic gameState={gameState} setGameState={setGameState} />
      <Environment preset="sunset" blur={0.6} />
    </Canvas>
  );
}