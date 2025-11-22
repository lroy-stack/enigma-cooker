
export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
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
  OBSTACLE_BURNER = 'OBSTACLE_BURNER',
  OBSTACLE_OIL = 'OBSTACLE_OIL',
  
  // Decor / Physics
  DECOR_SPOON = 'DECOR_SPOON',
  
  // Items
  ITEM_TOMATO = 'ITEM_TOMATO',
  ITEM_CHEESE = 'ITEM_CHEESE',
  ITEM_STEAK = 'ITEM_STEAK',
  ITEM_LETTER = 'ITEM_LETTER',
  
  // Powerups
  POWERUP_MAGNET = 'POWERUP_MAGNET',
  POWERUP_SHIELD = 'POWERUP_SHIELD',
  POWERUP_TURBO = 'POWERUP_TURBO'
}

export interface GameState {
  status: GameStatus;
  difficulty: Difficulty;
  level: number;
  score: number;
  speed: number;
  ingredients: EntityType[];
  collectedLetters: string[]; // Tracks ['E', 'N', ...]
  furyMode: boolean;
  furyTimer: number;
  shieldActive: boolean;
  magnetActive: boolean;
  isSlipping: boolean;
}

export interface GameEntity {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  z: number;
  active: boolean;
  // Dynamic properties
  variant?: number;
  state?: number; // 0: idle, 1: active/danger
  speed?: number;
  initialX?: number;
  letter?: string; // For ITEM_LETTER
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

export interface ScoreRecord {
  date: number;
  score: number;
}

export interface UserSession {
  username: string;
  email?: string;
  highScore: number;
  history: ScoreRecord[];
}

export const TARGET_WORD = "ENIGMA";
export const FURY_DURATION = 10; 
export const POWERUP_DURATION = 8; 
export const JUMP_FORCE = 10;
export const GRAVITY = 25;
export const BASE_SPEED = 15;
export const MAX_SPEED = 40;
export const FURY_SPEED_MULTIPLIER = 1.5;