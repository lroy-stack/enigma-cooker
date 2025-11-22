
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Environment, SpotLight } from '@react-three/drei';
import * as THREE from 'three';
import { GameStatus, Lane, EntityType, GameEntity, GameState, Particle, FURY_DURATION, POWERUP_DURATION, BASE_SPEED, MAX_SPEED, FURY_SPEED_MULTIPLIER, JUMP_FORCE, GRAVITY, TARGET_WORD, Difficulty } from '../types';
import { ChefModel, EntityModel, KitchenSegment, GiantProp, GiantBackgroundProp, InstancedParticles } from './GameModels';
import { soundManager } from '../utils/sound';

interface GameSceneProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  onGameOver: (score: number) => void;
}

const TILE_LENGTH = 100;
const LANE_WIDTH = 2.2;
const COLLISION_THRESHOLD = 0.8;

// Difficulty Settings
const getDifficultySettings = (difficulty: Difficulty, level: number) => {
    let speedMod = 1;
    let spawnDist = 80;
    let density = 0.3;

    switch(difficulty) {
        case Difficulty.EASY:
            speedMod = 0.8 + (level * 0.05);
            spawnDist = 90;
            density = 0.2;
            break;
        case Difficulty.MEDIUM:
            speedMod = 1.0 + (level * 0.1);
            spawnDist = 80;
            density = 0.4;
            break;
        case Difficulty.HARD:
            speedMod = 1.3 + (level * 0.15);
            spawnDist = 70;
            density = 0.6;
            break;
    }
    return { speedMod, spawnDist, density };
};

// Patterns
type Pattern = (z: number, difficulty: Difficulty) => GameEntity[];

const createSingleLinePattern: Pattern = (z) => {
    const lane = [Lane.LEFT, Lane.MIDDLE, Lane.RIGHT][Math.floor(Math.random() * 3)];
    const entities: GameEntity[] = [];
    for (let i = 0; i < 5; i++) {
        entities.push({
            id: Math.random().toString(),
            type: EntityType.ITEM_TOMATO,
            x: lane,
            z: z - (i * 2),
            y: 0.5,
            active: true
        });
    }
    return entities;
};

const createWallPattern: Pattern = (z) => {
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
                y: 0,
                active: true
            });
        } else {
             entities.push({
                id: Math.random().toString(),
                type: EntityType.ITEM_CHEESE,
                x: lane,
                z: z,
                y: 0.5,
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
        y: 0.8,
        active: true
    }];
};

const createFallingKnivesPattern: Pattern = (z) => {
    const entities: GameEntity[] = [];
    [Lane.LEFT, Lane.MIDDLE, Lane.RIGHT].forEach(lane => {
        if (Math.random() > 0.3) {
            entities.push({
                id: Math.random().toString(),
                type: EntityType.OBSTACLE_KNIFE,
                x: lane,
                z: z,
                y: 10, // Start high
                active: true,
                variant: 0,
                state: 1 // Falling state
            });
        }
    });
    return entities;
};

const createFlashingBurnersPattern: Pattern = (z) => {
     const entities: GameEntity[] = [];
     [Lane.LEFT, Lane.MIDDLE, Lane.RIGHT].forEach(lane => {
         entities.push({
             id: Math.random().toString(),
             type: EntityType.OBSTACLE_BURNER,
             x: lane,
             z: z,
             y: 0.1,
             active: true,
             variant: 1, // Flashing variant
             state: Math.random() > 0.5 ? 1 : 0 // Random start state
         });
     });
     return entities;
};

const createHazardsPattern: Pattern = (z) => {
    const lane = [Lane.LEFT, Lane.MIDDLE, Lane.RIGHT][Math.floor(Math.random() * 3)];
    return [{
        id: Math.random().toString(),
        type: EntityType.OBSTACLE_OIL,
        x: lane,
        z: z,
        y: 0.02,
        active: true
    }];
};

// Returns the next needed letter for ENIGMA
const getNextLetter = (collected: string[]) => {
    const target = TARGET_WORD.split('');
    if (collected.length >= target.length) return null;
    return target[collected.length];
};

const GameLogic = ({ gameState, setGameState, onGameOver }: GameSceneProps) => {
  const playerRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const particlesRef = useRef<Particle[]>([]);
  const { size } = useThree();
  
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
    lastSpawnZ: -10,
    score: 0,
    ingredients: [] as EntityType[],
    shakeIntensity: 0,
    slipTimer: 0,
    difficultySettings: getDifficultySettings(gameState.difficulty, gameState.level)
  });

  const [renderEntities, setRenderEntities] = useState<GameEntity[]>([]);
  const [currentTileIndex, setCurrentTileIndex] = useState(0);
  
  // --- PROP PLACEMENT ---
  const sideProps = useMemo(() => {
      const props = [];
      for(let i=0; i<20; i++) {
          const z = -i * 30;
          const isLeft = i % 2 === 0;
          const type = ['toaster', 'flour', 'milk'][Math.floor(Math.random() * 3)];
          // Corrected Scale placement: +/- 8 to be outside lanes but visible
          props.push({ 
              id: i, 
              type, 
              x: isLeft ? -8 : 8, 
              z: z,
              rotation: (Math.random() * 0.5) - 0.2
          });
      }
      return props;
  }, []);

  const distantProps = useMemo(() => {
      const props = [];
      for(let i=0; i<10; i++) {
         const z = -i * 150;
         const isLeft = i % 2 === 0;
         const type = Math.random() > 0.5 ? 'fridge' : 'cabinet';
         props.push({
             id: `bg-${i}`,
             type,
             x: isLeft ? -12 : 12,
             z: z,
             rotation: isLeft ? 0.5 : -0.5
         });
      }
      return props;
  }, []);

  // Sync GameState changes
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
              lastSpawnZ: -10,
              score: 0,
              ingredients: [],
              shakeIntensity: 0,
              slipTimer: 0,
              difficultySettings: getDifficultySettings(gameState.difficulty, 1)
          };
          particlesRef.current = [];
          if (playerRef.current) playerRef.current.position.set(0,0,0);
          setRenderEntities([]);
          setCurrentTileIndex(0);
          soundManager.playAmbient();
      } else {
          stateRef.current.status = gameState.status;
          // Update difficulty settings if level changed
          stateRef.current.difficultySettings = getDifficultySettings(gameState.difficulty, gameState.level);
      }
  }, [gameState.status, gameState.difficulty, gameState.level]);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.status !== GameStatus.PLAYING) return;
      if (stateRef.current.slipTimer > 0) return; // No control while slipping

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
      if (stateRef.current.slipTimer > 0) return;

      const dx = e.changedTouches[0].screenX - touchStartX;
      const dy = e.changedTouches[0].screenY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 40) {
           if (stateRef.current.playerLane === Lane.LEFT) stateRef.current.playerLane = Lane.MIDDLE;
           else if (stateRef.current.playerLane === Lane.MIDDLE) stateRef.current.playerLane = Lane.RIGHT;
        } else if (dx < -40) {
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

  const spawnParticles = (x: number, y: number, z: number, color: string, count: number, isSteam = false) => {
      for(let i=0; i<count; i++) {
          particlesRef.current.push({
              id: Math.random(),
              x, y, z,
              vx: (Math.random() - 0.5) * (isSteam ? 1 : 4),
              vy: (Math.random() * (isSteam ? 2 : 4)) + 2,
              vz: (Math.random() - 0.5) * (isSteam ? 1 : 4),
              life: isSteam ? 2.0 : 1.0,
              color
          });
      }
      if (particlesRef.current.length > 300) {
          particlesRef.current = particlesRef.current.slice(particlesRef.current.length - 300);
      }
  };

  useFrame((state, delta) => {
    if (stateRef.current.status !== GameStatus.PLAYING) return;

    const dt = Math.min(delta, 0.1);
    const s = stateRef.current;
    const time = state.clock.getElapsedTime();

    // 1. Speed Calculation
    let targetSpeed = (BASE_SPEED + (Math.abs(s.playerZ) * 0.005)) * s.difficultySettings.speedMod;
    if (s.furyTimer > 0) targetSpeed *= FURY_SPEED_MULTIPLIER;
    if (s.activePowerup === EntityType.POWERUP_TURBO) targetSpeed *= 1.8;
    targetSpeed = Math.min(targetSpeed, MAX_SPEED * s.difficultySettings.speedMod);
    
    s.speed = THREE.MathUtils.lerp(s.speed, targetSpeed, dt * 2);
    s.playerZ -= s.speed * dt;
    s.score += (s.speed * dt) * 0.5;

    // 2. Floor Logic
    const newTileIndex = Math.floor(s.playerZ / TILE_LENGTH);
    if (newTileIndex !== currentTileIndex) {
        setCurrentTileIndex(newTileIndex);
    }

    // 3. Timers
    if (s.furyTimer > 0) {
        s.furyTimer -= dt;
        if (s.furyTimer <= 0) setGameState(prev => ({ ...prev, furyMode: false }));
    }
    if (s.powerupTimer > 0) {
        s.powerupTimer -= dt;
        if (s.powerupTimer <= 0) {
            s.activePowerup = null;
            setGameState(prev => ({ ...prev, shieldActive: false, magnetActive: false }));
        }
    }
    if (s.slipTimer > 0) {
        s.slipTimer -= dt;
        if (s.slipTimer <= 0) setGameState(prev => ({ ...prev, isSlipping: false }));
        // Spin player while slipping
        if (playerRef.current) playerRef.current.rotation.y += dt * 10;
    } else {
        if (playerRef.current) playerRef.current.rotation.y = 0;
    }

    // 4. Player Movement
    if (playerRef.current) {
      const targetX = s.playerLane * (LANE_WIDTH / 2);
      
      if (s.slipTimer > 0) {
          // Drifting when slipping
          playerRef.current.position.x += Math.sin(time * 10) * dt * 5;
      } else {
          playerRef.current.position.x = THREE.MathUtils.lerp(playerRef.current.position.x, targetX, dt * 12);
      }
      
      const tilt = (playerRef.current.position.x - targetX) * -0.2;
      playerRef.current.rotation.z = THREE.MathUtils.lerp(playerRef.current.rotation.z, tilt, dt * 10);
      playerRef.current.position.z = s.playerZ;
    }

    // 5. Jump Physics
    if (s.isJumping) {
      s.playerY += s.verticalVelocity * dt;
      s.verticalVelocity -= GRAVITY * dt;
      if (s.playerY <= 0) {
        s.playerY = 0;
        s.isJumping = false;
        s.verticalVelocity = 0;
      }
      if (playerRef.current) playerRef.current.position.y = s.playerY;
    }

    // 6. Entity Logic (Movement & Particles)
    s.entities.forEach(e => {
        if (e.active && e.z > s.playerZ - 40 && e.z < s.playerZ + 10) {
            // Moving logic
            if (e.type === EntityType.OBSTACLE_POT && e.initialX !== undefined) {
               // Moving pot logic
            }
            
            // Falling logic
            if (e.state === 1 && e.y > 0) {
                 if (e.z > s.playerZ - 30) { // Start falling when close
                     e.y -= 15 * dt;
                     if (e.y < 0) e.y = 0;
                 }
            }

            // Flashing Logic
            if (e.type === EntityType.OBSTACLE_BURNER && e.variant === 1) {
                // Toggle state every 1.5s based on time
                const cycle = Math.floor(time / 1.5);
                e.state = cycle % 2;
            }

            // Particles
            if ((e.type === EntityType.OBSTACLE_POT || (e.type === EntityType.OBSTACLE_BURNER && e.state === 1)) && Math.random() < 0.1) {
                 spawnParticles(e.x, 1, e.z, "white", 1, true);
            }
        }
    });

    // 7. Particle Physics
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt + (s.speed * dt * 0.1); // Move with world relative speed
        p.vy -= (p.life > 1.5 ? -2 : 5) * dt;
        p.life -= dt * 1.0;
        if (p.life <= 0 || p.y < 0) {
            particlesRef.current.splice(i, 1);
        }
    }

    // 8. Camera
    if (cameraRef.current) {
      const aspect = size.width / size.height;
      const isPortrait = aspect < 1;
      
      s.shakeIntensity = THREE.MathUtils.lerp(s.shakeIntensity, 0, dt * 5);
      const shakeX = (Math.random() - 0.5) * s.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * s.shakeIntensity;

      const baseDist = isPortrait ? 14 : (s.activePowerup === EntityType.POWERUP_TURBO ? 9 : 7);
      const baseHeight = isPortrait ? 6.5 : (3.5 + (s.playerY * 0.3));
      const baseFov = isPortrait ? 80 : 60;
      const fovTarget = s.activePowerup === EntityType.POWERUP_TURBO ? baseFov + 15 : (s.furyTimer > 0 ? baseFov + 10 : baseFov);
      
      cameraRef.current.fov = THREE.MathUtils.lerp(cameraRef.current.fov, fovTarget, dt * 2);
      cameraRef.current.updateProjectionMatrix();

      const targetZ = s.playerZ + baseDist;
      cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, targetZ, dt * 10);
      cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, baseHeight, dt * 5);
      cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, (s.playerLane * 0.5) + shakeX, dt * 3);
      cameraRef.current.lookAt(0 + shakeX, 1 + shakeY, s.playerZ - 10);
    }

    // 9. Spawning System
    if (s.playerZ - s.lastSpawnZ < -s.difficultySettings.spawnDist / 4) { // Spawn frequently in small chunks
      s.lastSpawnZ = s.playerZ;
      const spawnZ = s.playerZ - s.difficultySettings.spawnDist;
      
      const r = Math.random();
      let newEntities: GameEntity[] = [];
      
      const nextLetter = getNextLetter(gameState.collectedLetters);
      
      // Priority: Letter -> Powerup -> Obstacles
      if (nextLetter && r < 0.08) { // 8% chance for letter
          const lane = [Lane.LEFT, Lane.MIDDLE, Lane.RIGHT][Math.floor(Math.random() * 3)];
          newEntities.push({
              id: `letter-${Date.now()}`,
              type: EntityType.ITEM_LETTER,
              letter: nextLetter,
              x: lane,
              z: spawnZ,
              y: 1,
              active: true
          });
      } else if (r < 0.12 && !s.activePowerup) {
          newEntities = createPowerupPattern(spawnZ, gameState.difficulty);
      } else {
          // Choose obstacle pattern
          const patternRoll = Math.random();
          if (patternRoll < 0.2) newEntities = createSingleLinePattern(spawnZ, gameState.difficulty);
          else if (patternRoll < 0.4) newEntities = createWallPattern(spawnZ, gameState.difficulty);
          else if (patternRoll < 0.5 && gameState.difficulty !== Difficulty.EASY) newEntities = createFallingKnivesPattern(spawnZ, gameState.difficulty);
          else if (patternRoll < 0.6 && gameState.difficulty !== Difficulty.EASY) newEntities = createFlashingBurnersPattern(spawnZ, gameState.difficulty);
          else if (patternRoll < 0.7) newEntities = createHazardsPattern(spawnZ, gameState.difficulty);
          else {
             // Random Single Obstacle
             const lane = [Lane.LEFT, Lane.MIDDLE, Lane.RIGHT][Math.floor(Math.random()*3)];
             const type = Math.random() > 0.5 ? EntityType.OBSTACLE_KNIFE : EntityType.OBSTACLE_BURNER;
             newEntities.push({ id: Math.random().toString(), type, x: lane, z: spawnZ, y: 0, active: true });
          }
      }
      
      s.entities.push(...newEntities);
      // Despawn old
      s.entities = s.entities.filter(e => e.z < s.playerZ + 10 && e.active);
      setRenderEntities([...s.entities]);
    }

    // 10. Collision Detection
    let needsUpdate = false;
    s.entities.forEach(entity => {
       if (!entity.active) return;

       // Magnet Logic
       if (s.activePowerup === EntityType.POWERUP_MAGNET && (entity.type.startsWith('ITEM') || entity.type === EntityType.ITEM_LETTER)) {
           const dist = Math.sqrt(Math.pow(entity.x - playerRef.current!.position.x, 2) + Math.pow(entity.z - s.playerZ, 2));
           if (dist < 15) {
               entity.x = THREE.MathUtils.lerp(entity.x, playerRef.current!.position.x, dt * 5);
               entity.z = THREE.MathUtils.lerp(entity.z, s.playerZ, dt * 5);
               needsUpdate = true;
           }
       }

       const dz = Math.abs(entity.z - s.playerZ);
       const dx = Math.abs(entity.x - (playerRef.current?.position.x || 0));
       const dy = Math.abs(entity.y - s.playerY);

       // Collision check
       if (dz < COLLISION_THRESHOLD && dx < 0.7 && dy < 1.0) {
         
         // --- ITEMS ---
         if (entity.type.startsWith('ITEM')) {
            entity.active = false;
            needsUpdate = true;
            
            if (entity.type === EntityType.ITEM_LETTER && entity.letter) {
                 // Collected Letter
                 const newCollected = [...gameState.collectedLetters, entity.letter];
                 soundManager.playLetterCollect();
                 spawnParticles(entity.x, 1, entity.z, "#a855f7", 10);
                 setGameState(prev => ({ ...prev, collectedLetters: newCollected }));

                 if (newCollected.length === TARGET_WORD.length) {
                     // LEVEL UP
                     soundManager.playLevelUp();
                     setGameState(prev => ({ 
                         ...prev, 
                         collectedLetters: [], 
                         level: prev.level + 1,
                         score: prev.score + 1000
                     }));
                 }

            } else {
                // Ingredients
                soundManager.playCollect();
                s.score += 50;
                spawnParticles(entity.x, 0.5, entity.z, "gold", 5);
                
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

         } else if (entity.type.startsWith('POWERUP')) {
             // --- POWERUPS ---
            entity.active = false;
            needsUpdate = true;
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

         } else if (entity.type === EntityType.OBSTACLE_OIL) {
             // --- OIL SPILL ---
             entity.active = false;
             soundManager.playSlip();
             s.slipTimer = 2.0;
             setGameState(prev => ({ ...prev, isSlipping: true }));

         } else if (entity.type === EntityType.DECOR_SPOON) {
             // --- DECOR PHYSICS ---
             entity.active = false;
             soundManager.playClank();
             // Physics impulse effect (fake physics)
             spawnParticles(entity.x, 0.5, entity.z, "gray", 3);
             needsUpdate = true;

         } else {
            // --- OBSTACLES ---
            const isJumpable = entity.type === EntityType.OBSTACLE_POT || entity.type === EntityType.OBSTACLE_BURNER;
            const isHighEnough = s.playerY > 1.2;

            // Special case: Flashing Burner is safe when OFF (state 0)
            if (entity.type === EntityType.OBSTACLE_BURNER && entity.variant === 1 && entity.state === 0) {
                // Safe
            } else if (isJumpable && isHighEnough) {
                // Dodged
            } else {
                // HIT
                if (s.activePowerup === EntityType.POWERUP_SHIELD) {
                    entity.active = false;
                    s.activePowerup = null;
                    s.powerupTimer = 0;
                    s.shakeIntensity = 0.5;
                    spawnParticles(0, 1, s.playerZ + 1, "blue", 10);
                    soundManager.playCrash();
                    setGameState(prev => ({ ...prev, shieldActive: false }));
                    needsUpdate = true;
                } else if (s.furyTimer > 0 || s.activePowerup === EntityType.POWERUP_TURBO) {
                    entity.active = false;
                    s.shakeIntensity = 0.3;
                    soundManager.playCrash();
                    spawnParticles(entity.x, 0.5, entity.z, "gray", 8);
                    needsUpdate = true;
                } else {
                    s.shakeIntensity = 1.0;
                    soundManager.playCrash();
                    s.status = GameStatus.GAME_OVER;
                    setGameState(prev => ({ ...prev, status: GameStatus.GAME_OVER }));
                    onGameOver(Math.floor(s.score));
                }
            }
         }
       }
    });

    if (needsUpdate) {
         setRenderEntities([...s.entities]);
    }
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 4, 8]} fov={60} />
      
      <color attach="background" args={['#fff7ed']} />
      <fog attach="fog" args={['#fff7ed', 20, 80]} />

      <ambientLight intensity={0.8} color="#fff7ed" />
      <directionalLight 
        position={[20, 50, 10]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[1024, 1024]} 
        shadow-bias={-0.0005}
        color="#fff"
      />
      <SpotLight 
         position={[0, 10, stateRef.current.playerZ - 10]}
         angle={0.6}
         penumbra={0.5}
         intensity={1.0}
         color="#fbbf24"
         distance={50}
         target={playerRef.current || undefined}
      />

      <group>
           <KitchenSegment position={[0, 0, (currentTileIndex + 1) * TILE_LENGTH]} />
           <KitchenSegment position={[0, 0, currentTileIndex * TILE_LENGTH]} />
           <KitchenSegment position={[0, 0, (currentTileIndex - 1) * TILE_LENGTH]} />
      </group>

      {sideProps.map(prop => {
          const loopLength = 600;
          const relativeZ = (prop.z - stateRef.current.playerZ) % loopLength;
          const visibleZ = stateRef.current.playerZ + relativeZ;
          if (Math.abs(visibleZ - stateRef.current.playerZ) > 100) return null;

          return (
              <group key={`side-${prop.id}`}>
                  <GiantProp 
                     type={prop.type} 
                     x={prop.x} 
                     z={visibleZ} 
                     rotation={prop.rotation} 
                  />
              </group>
          );
      })}

      {distantProps.map(prop => {
          const loopLength = 1500;
          const relativeZ = (prop.z - stateRef.current.playerZ) % loopLength;
          const visibleZ = stateRef.current.playerZ + relativeZ;
           if (visibleZ > stateRef.current.playerZ + 50 || visibleZ < stateRef.current.playerZ - 300) return null;

          return (
              <group key={`dist-${prop.id}`}>
                  <GiantBackgroundProp 
                     type={prop.type} 
                     x={prop.x} 
                     z={visibleZ} 
                     rotation={prop.rotation} 
                  />
              </group>
          );
      })}

      <group ref={playerRef}>
        <ChefModel 
            isFury={stateRef.current.furyTimer > 0} 
            isJumping={stateRef.current.isJumping}
            shieldActive={stateRef.current.shieldActive}
        />
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
            <circleGeometry args={[0.4, 32]} />
            <meshBasicMaterial color="black" opacity={0.3} transparent />
        </mesh>
      </group>

      {renderEntities.map(entity => (
          entity.active && (
              <group key={entity.id} position={[entity.x, entity.y, entity.z]}>
                  <EntityModel 
                    type={entity.type} 
                    letter={entity.letter}
                    variant={entity.variant}
                    customState={entity.state}
                  />
              </group>
          )
      ))}

      <InstancedParticles particlesRef={particlesRef} />
    </>
  );
};

export default function GameScene(props: GameSceneProps) {
  return (
    <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
      <GameLogic {...props} />
      <Environment preset="city" blur={1} />
    </Canvas>
  );
}
