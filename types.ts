export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export enum Lane {
  LEFT = -2,
  MIDDLE = 0,
  RIGHT = 2
}

export enum EntityType {
  // Obstacles
  OBSTACLE_KNIFE = 'OBSTACLE_KNIFE',
  OBSTACLE_POT = 'OBSTACLE_POT',
  OBSTACLE_BURNER = 'OBSTACLE_BURNER', // New dynamic obstacle
  
  // Items
  ITEM_TOMATO = 'ITEM_TOMATO',
  ITEM_CHEESE = 'ITEM_CHEESE',
  ITEM_STEAK = 'ITEM_STEAK',
  
  // Powerups
  POWERUP_MAGNET = 'POWERUP_MAGNET',
  POWERUP_SHIELD = 'POWERUP_SHIELD',
  POWERUP_TURBO = 'POWERUP_TURBO'
}

export interface GameState {
  status: GameStatus;
  score: number;
  speed: number;
  ingredients: EntityType[];
  furyMode: boolean;
  furyTimer: number;
  // New visual states
  shieldActive: boolean;
  magnetActive: boolean;
}

export interface GameEntity {
  id: string;
  type: EntityType;
  x: number;
  z: number;
  active: boolean;
  rotationSpeed?: number; // For dynamic obstacles
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  color: string;
}

export const FURY_DURATION = 10; // seconds
export const POWERUP_DURATION = 8; // seconds
export const BASE_SPEED = 12; // Slightly faster base
export const MAX_SPEED = 30;
export const FURY_SPEED_MULTIPLIER = 1.5;
export const JUMP_FORCE = 10;
export const GRAVITY = 25;
