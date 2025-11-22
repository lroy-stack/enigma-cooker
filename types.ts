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
  OBSTACLE_KNIFE = 'OBSTACLE_KNIFE',
  OBSTACLE_POT = 'OBSTACLE_POT',
  ITEM_TOMATO = 'ITEM_TOMATO',
  ITEM_CHEESE = 'ITEM_CHEESE',
  ITEM_STEAK = 'ITEM_STEAK'
}

export interface GameState {
  status: GameStatus;
  score: number;
  speed: number;
  ingredients: EntityType[];
  furyMode: boolean;
  furyTimer: number;
}

export interface GameEntity {
  id: string;
  type: EntityType;
  x: number;
  z: number;
  active: boolean;
}

export const FURY_DURATION = 10; // seconds
export const BASE_SPEED = 10;
export const FURY_SPEED_MULTIPLIER = 2.0;
export const JUMP_FORCE = 8;
export const GRAVITY = 20;