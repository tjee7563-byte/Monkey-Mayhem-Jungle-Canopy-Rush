/**
 * Types and interfaces for Monke Mayhem: Jungle Canopy Rush.
 */

export type GameState = 'title' | 'playing' | 'paused' | 'gameover' | 'victory';

export type GameMode = 'adventure' | 'endless';

export interface PlayerInput {
  left: boolean;
  right: boolean;
  up: boolean; // Climb up or swing boost
  down: boolean; // Slide or fast fall
  jumpHeld: boolean;
  jumpPressed: boolean;
  throwPressed: boolean;
  glideHeld: boolean;
  flipPressed?: boolean; // Acrobatic flip / rotation in air
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  facing: 1 | -1;
  isGrounded: boolean;
  isSwinging: boolean;
  swingVineId: string | null;
  swingLength: number;
  swingAngle: number;
  swingAngularVelocity: number;
  isGliding: boolean;
  animTimer: number;
  squashX: number;
  squashY: number;
  invulnerableTimer: number;
  health: number;
  maxHealth: number;
  coconuts: number;
  maxCoconuts: number;
  score: number;
  bananas: number;
  combo: number;
  comboTimer: number;
  feverEnergy: number; // 0 to 100
  isFever: boolean;
  feverDuration: number;
  distanceTraveled: number;
  swingCount: number;
  rotation: number; // In-game body rotation in radians
  rotationalVelocity: number; // Angular speed in air
  isFlipping: boolean; // Currently executing acrobatic 360 flip
  flipsInAir: number; // Number of full 360 spins in this jump
  accumulatedFlipAngle: number; // Tracking progress towards 360 deg
}

export interface Vine {
  id: string;
  anchorX: number;
  anchorY: number;
  length: number;
  angle: number;
  angularVelocity: number;
  restingAngle: number;
  segments: { x: number; y: number }[];
}

export interface Platform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'branch' | 'mushroom' | 'bamboo' | 'stone' | 'moving';
  bounceStrength?: number;
  vx?: number;
  minX?: number;
  maxX?: number;
  surfaceAngle?: number;
  mushroomSpring?: number; // visual bounce deform
}

export interface Collectible {
  id: string;
  x: number;
  y: number;
  baseY: number;
  type: 'banana' | 'golden_banana' | 'coconut_refill' | 'heart_papaya';
  collected: boolean;
  floatOffset: number;
}

export type EnemyType = 
  | 'toucan' 
  | 'bat' 
  | 'python' 
  | 'durian' 
  | 'wild_boar'
  | 'venom_frog'
  | 'temple_golem' 
  | 'sun_harpy'
  | 'temple_skeleton'
  | 'fire_scarab'
  | 'savage_baboon'
  | 'storm_hawk'
  | 'lava_crab'
  | 'python_boss' 
  | 'gorilla_boss';

export interface Enemy {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: EnemyType;
  health: number;
  maxHealth: number;
  facing: 1 | -1;
  state: 'idle' | 'patrol' | 'swoop' | 'attack' | 'lunge' | 'charge' | 'leap' | 'hurt' | 'falling';
  stateTimer: number;
  patrolStartX?: number;
  patrolRange?: number;
  isTelegraphing?: boolean;
  attackCooldown?: number;
  name?: string;
  aggroTarget?: boolean;
  homeY?: number;
  isArmored?: boolean; // Cannot be stomped from above (e.g., durian, lava crab)
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  isHostile?: boolean;
  type?: 'coconut' | 'seed' | 'venom' | 'fireball' | 'boulder' | 'spear' | 'lightning_orb' | 'magma_rock';
  color?: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: 'circle' | 'leaf' | 'sparkle' | 'shard' | 'ring' | 'text';
  rotation?: number;
  rotSpeed?: number;
  text?: string;
}

export interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  length: number; // total world width in pixels
  skyColors: [string, string, string];
  hasRain?: boolean;
  bossAtEnd?: boolean;
}
