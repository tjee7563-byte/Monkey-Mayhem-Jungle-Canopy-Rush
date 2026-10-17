import { PHYSICS } from './constants';
import { generateLevel, LevelData } from './levelGenerator';
import { GameRenderer } from './renderer';
import { soundEngine } from './audio';
import {
  Collectible,
  Enemy,
  GameState,
  Particle,
  Platform,
  Player,
  PlayerInput,
  Projectile,
  Vine,
} from './types';

export interface GameCallbacks {
  onStateChange: (state: GameState) => void;
  onStatsUpdate: (stats: {
    score: number;
    bananas: number;
    health: number;
    maxHealth: number;
    coconuts: number;
    maxCoconuts: number;
    combo: number;
    feverEnergy: number;
    isFever: boolean;
    levelId: number;
    progress: number;
  }) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: GameRenderer;
  private callbacks: GameCallbacks;

  public state: GameState = 'title';
  public currentLevelId: number = 1;
  public isEndless: boolean = false;

  private player: Player;
  private vines: Vine[] = [];
  private platforms: Platform[] = [];
  private collectibles: Collectible[] = [];
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private levelData!: LevelData;

  private cameraX: number = 0;
  private cameraY: number = 200;
  private targetCameraY: number = 200;

  private shakeIntensity: number = 0;
  private hitstopTimer: number = 0;

  private coyoteTimer: number = 0;
  private jumpBufferTimer: number = 0;

  private input: PlayerInput = {
    left: false,
    right: false,
    up: false,
    down: false,
    jumpHeld: false,
    jumpPressed: false,
    throwPressed: false,
    glideHeld: false,
  };

  private lastTime: number = 0;
  private animFrameId: number | null = null;
  private isDestroyed: boolean = false;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.renderer = new GameRenderer(this.ctx);
    this.callbacks = callbacks;

    this.player = this.createInitialPlayer();
    this.loadLevel(1, false);
    this.setupWindowEvents();
  }

  private createInitialPlayer(): Player {
    return {
      x: 100,
      y: 480,
      vx: 0,
      vy: 0,
      radius: 18,
      facing: 1,
      isGrounded: false,
      isSwinging: false,
      swingVineId: null,
      swingLength: 260,
      swingAngle: 0,
      swingAngularVelocity: 0,
      isGliding: false,
      animTimer: 0,
      squashX: 1,
      squashY: 1,
      invulnerableTimer: 0,
      health: 3,
      maxHealth: 3,
      coconuts: 5,
      maxCoconuts: 10,
      score: 0,
      bananas: 0,
      combo: 1,
      comboTimer: 0,
      feverEnergy: 0,
      isFever: false,
      feverDuration: 0,
      distanceTraveled: 0,
      swingCount: 0,
      rotation: 0,
      rotationalVelocity: 0,
      isFlipping: false,
      flipsInAir: 0,
      accumulatedFlipAngle: 0,
    };
  }

  public loadLevel(levelId: number, isEndless: boolean = false) {
    this.currentLevelId = levelId;
    this.isEndless = isEndless;
    this.levelData = generateLevel(levelId, isEndless);

    this.platforms = [...this.levelData.platforms];
    this.vines = [...this.levelData.vines];
    this.collectibles = [...this.levelData.collectibles];
    this.enemies = [...this.levelData.enemies];
    this.projectiles = [];
    this.particles = [];

    // Reset player position and rotation for new level
    this.player.x = 100;
    this.player.y = 480;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.isSwinging = false;
    this.player.swingVineId = null;
    this.player.isGliding = false;
    this.player.rotation = 0;
    this.player.rotationalVelocity = 0;
    this.player.isFlipping = false;
    this.player.flipsInAir = 0;
    this.player.accumulatedFlipAngle = 0;
    this.cameraX = 0;
    this.cameraY = 150;
  }

  public startPlaying(levelId: number = 1, endless: boolean = false) {
    this.loadLevel(levelId, endless);
    this.player.health = 3;
    this.player.score = 0;
    this.player.bananas = 0;
    this.player.coconuts = 5;
    this.player.combo = 1;
    this.player.feverEnergy = 0;
    this.player.isFever = false;
    this.state = 'playing';
    this.callbacks.onStateChange('playing');
    soundEngine.playMonkeyChirp();
    soundEngine.startMusic();
  }

  public togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.callbacks.onStateChange('paused');
      soundEngine.stopMusic();
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.callbacks.onStateChange('playing');
      soundEngine.startMusic();
    }
  }

  public triggerFlip() {
    if (this.state !== 'playing') return;
    if (!this.player.isSwinging) {
      this.startAcrobaticFlip();
    }
  }

  public startAcrobaticFlip() {
    if (this.player.isSwinging) return;
    // If on ground, perform a jump with the flip
    if (this.player.isGrounded) {
      this.player.vy = PHYSICS.JUMP_FORCE;
      this.player.isGrounded = false;
      this.spawnDust(this.player.x, this.player.y + 16, 6);
    }
    this.player.isFlipping = true;
    this.player.rotationalVelocity = this.player.facing * 14;
    soundEngine.playAcrobaticSpin();
    this.spawnSparkles(this.player.x, this.player.y, 6, '#fbbf24');
  }

  public setInput(newInput: Partial<PlayerInput>) {
    if (newInput.jumpPressed) {
      this.jumpBufferTimer = PHYSICS.JUMP_BUFFER_TIME;
    }
    if (newInput.flipPressed) {
      this.triggerFlip();
    }
    this.input = { ...this.input, ...newInput };
  }

  private setupWindowEvents() {
    window.addEventListener('blur', () => {
      // Clear held keys on blur to prevent sticking keys
      this.input = {
        left: false,
        right: false,
        up: false,
        down: false,
        jumpHeld: false,
        jumpPressed: false,
        throwPressed: false,
        glideHeld: false,
      };
    });
  }

  public startLoop() {
    this.lastTime = performance.now();
    const frame = (time: number) => {
      if (this.isDestroyed) return;

      const rawDt = (time - this.lastTime) / 1000;
      this.lastTime = time;
      // Clamp delta time to avoid physics tunneling
      const dt = Math.min(rawDt, 0.05);

      this.update(dt);
      this.render();

      this.animFrameId = requestAnimationFrame(frame);
    };
    this.animFrameId = requestAnimationFrame(frame);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    soundEngine.stopMusic();
  }

  private update(dt: number) {
    if (this.state === 'paused') return;

    // Hitstop freeze frame
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    // Decay screenshake
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 25);
    }

    // Update timers
    if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;
    if (this.player.invulnerableTimer > 0) this.player.invulnerableTimer -= dt;

    // Combo Timer Decay
    if (this.player.comboTimer > 0) {
      this.player.comboTimer -= dt;
      if (this.player.comboTimer <= 0) {
        this.player.combo = 1;
      }
    }

    // Fever Mode Timer
    if (this.player.isFever) {
      this.player.feverDuration -= dt;
      this.spawnFeverParticles();
      if (this.player.feverDuration <= 0) {
        this.player.isFever = false;
        this.player.feverEnergy = 0;
      }
    }

    // Restore squash and stretch
    this.player.squashX += (1 - this.player.squashX) * 12 * dt;
    this.player.squashY += (1 - this.player.squashY) * 12 * dt;

    // Update vines idle swing
    this.vines.forEach(v => {
      const g = 6.0;
      const restoringAccel = (-g / (v.length / 100)) * Math.sin(v.angle);
      v.angularVelocity += restoringAccel * dt;
      v.angularVelocity *= 0.994; // vine damping
      v.angle += v.angularVelocity * dt;
    });

    // Update moving platforms
    this.platforms.forEach(p => {
      if (p.type === 'moving' && p.vx && p.minX !== undefined && p.maxX !== undefined) {
        p.x += p.vx * dt;
        if (p.x <= p.minX || p.x >= p.maxX) {
          p.vx = -p.vx;
        }
      }
      if (p.type === 'mushroom' && p.mushroomSpring) {
        p.mushroomSpring = Math.max(0, p.mushroomSpring - dt * 4);
      }
    });

    // Throw Coconut Action
    if (this.input.throwPressed) {
      this.input.throwPressed = false;
      this.throwCoconut();
    }

    // Update Player physics based on state
    if (this.player.isSwinging) {
      this.updateSwinging(dt);
    } else {
      this.updateFreePhysics(dt);
    }

    // Update Projectiles
    this.updateProjectiles(dt);

    // Update Enemies
    this.updateEnemies(dt);

    // Update Collectibles & Magnet
    this.updateCollectibles(dt);

    // Update Particles
    this.updateParticles(dt);

    // Update Camera
    this.updateCamera(dt);

    // Check Stage End / Fall in water
    this.checkGameConditions();

    // Broadcast stats to UI
    const progress = Math.min(1, Math.max(0, this.player.x / this.levelData.finishX));
    this.callbacks.onStatsUpdate({
      score: this.player.score,
      bananas: this.player.bananas,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      coconuts: this.player.coconuts,
      maxCoconuts: this.player.maxCoconuts,
      combo: this.player.combo,
      feverEnergy: this.player.feverEnergy,
      isFever: this.player.isFever,
      levelId: this.currentLevelId,
      progress,
    });
  }

  private updateSwinging(dt: number) {
    const vine = this.vines.find(v => v.id === this.player.swingVineId);
    if (!vine) {
      this.player.isSwinging = false;
      return;
    }

    // Input torque: player steering vine swing
    if (this.input.left) {
      this.player.swingAngularVelocity -= PHYSICS.VINE_SWING_IMPULSE * dt;
      this.player.facing = -1;
    }
    if (this.input.right) {
      this.player.swingAngularVelocity += PHYSICS.VINE_SWING_IMPULSE * dt;
      this.player.facing = 1;
    }

    // Pendulum physics: alpha = - (g / L) * sin(theta)
    const g = 980;
    const restoringTorque = -(g / this.player.swingLength) * Math.sin(this.player.swingAngle);
    this.player.swingAngularVelocity += restoringTorque * dt;
    this.player.swingAngularVelocity *= PHYSICS.VINE_PULL_DAMPING;

    this.player.swingAngle += this.player.swingAngularVelocity * dt;
    vine.angle = this.player.swingAngle;

    // Synchronize player position with vine tip
    this.player.x = vine.anchorX + Math.sin(this.player.swingAngle) * this.player.swingLength;
    this.player.y = vine.anchorY + Math.cos(this.player.swingAngle) * this.player.swingLength;

    // Whoosh sound when crossing center at high speed
    if (Math.abs(this.player.swingAngle) < 0.1 && Math.abs(this.player.swingAngularVelocity) > 2.5) {
      soundEngine.playSwingWhoosh();
    }

    // Full 360 Vine Loop Detection
    if (this.player.swingAngle > Math.PI * 1.9 || this.player.swingAngle < -Math.PI * 1.9) {
      if (Math.abs(this.player.swingAngularVelocity) > 2.8) {
        // Wrap angle around 2pi
        this.player.swingAngle = this.player.swingAngle > 0
          ? this.player.swingAngle - Math.PI * 2
          : this.player.swingAngle + Math.PI * 2;
        vine.angle = this.player.swingAngle;

        const loopBonus = 300 * this.player.combo;
        this.player.score += loopBonus;
        this.player.feverEnergy = Math.min(100, this.player.feverEnergy + 18);
        this.player.combo = Math.min(8, this.player.combo + 1);
        this.player.comboTimer = 4.0;

        soundEngine.playAcrobaticSpin();
        this.spawnTextParticle(this.player.x, this.player.y - 30, `+${loopBonus} 🌀 360° VINE LOOP!`, '#38bdf8');
        this.spawnRingParticle(vine.anchorX, vine.anchorY, '#38bdf8');
        this.spawnSparkles(this.player.x, this.player.y, 8, '#38bdf8');
      }
    }

    // RELEASE / JUMP FROM VINE
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer = 0;
      this.player.isSwinging = false;
      this.player.swingVineId = null;

      // Tangent release velocity
      const tangentSpeed = this.player.swingAngularVelocity * this.player.swingLength * PHYSICS.VINE_LAUNCH_BOOST;
      this.player.vx = Math.cos(this.player.swingAngle) * tangentSpeed;
      this.player.vy = -Math.sin(this.player.swingAngle) * tangentSpeed + PHYSICS.JUMP_FORCE * 0.7;

      // Add extra upward boost if releasing on upward arc
      if (this.player.vy > 0 && Math.abs(this.player.swingAngle) > 0.3) {
        this.player.vy = -200;
      }

      // If launched with high momentum, trigger an acrobatic spin flip!
      if (Math.abs(tangentSpeed) > 340) {
        this.startAcrobaticFlip();
      }

      this.player.squashX = 0.7;
      this.player.squashY = 1.4;
      this.player.swingCount++;
      soundEngine.playJump();
      this.spawnDust(this.player.x, this.player.y, 8);
    }
  }

  private updateFreePhysics(dt: number) {
    const p = this.player;

    // Horizontal Movement
    if (this.input.left) {
      p.vx -= (p.isGrounded ? PHYSICS.RUN_ACCEL : PHYSICS.AIR_ACCEL) * dt;
      p.facing = -1;
      p.animTimer += dt;
    } else if (this.input.right) {
      p.vx += (p.isGrounded ? PHYSICS.RUN_ACCEL : PHYSICS.AIR_ACCEL) * dt;
      p.facing = 1;
      p.animTimer += dt;
    } else {
      p.vx *= p.isGrounded ? PHYSICS.FRICTION : PHYSICS.AIR_FRICTION;
    }

    // Clamp horizontal speed
    const maxSpd = p.isFever ? PHYSICS.RUN_SPEED * 1.4 : PHYSICS.RUN_SPEED;
    p.vx = Math.max(-maxSpd, Math.min(maxSpd, p.vx));

    // Gliding Check
    p.isGliding = !p.isGrounded && this.input.jumpHeld && p.vy > 0;

    // Apply Gravity
    if (p.isGliding) {
      p.vy = Math.min(PHYSICS.GLIDE_FALL_SPEED, p.vy + 200 * dt);
      // Spawn gentle breeze particles
      if (Math.random() < 0.25) {
        this.particles.push({
          x: p.x - p.facing * 15,
          y: p.y - 25,
          vx: -p.vx * 0.3,
          vy: 10,
          size: 4,
          color: '#86efac',
          alpha: 0.6,
          life: 0.4,
          maxLife: 0.4,
          shape: 'leaf',
        });
      }
    } else {
      p.vy = Math.min(PHYSICS.MAX_FALL_SPEED, p.vy + PHYSICS.GRAVITY * dt);
    }

    // Jump Execution
    if (this.jumpBufferTimer > 0 && (p.isGrounded || this.coyoteTimer > 0)) {
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      p.vy = PHYSICS.JUMP_FORCE;
      p.isGrounded = false;
      p.squashX = 0.75;
      p.squashY = 1.35;
      soundEngine.playJump();
      this.spawnDust(p.x, p.y + 16, 6);
    }

    // Integrate Position
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Mid-air Acrobatic Rotation & Flip Physics
    if (p.isFlipping) {
      p.rotation += p.rotationalVelocity * dt;
      p.accumulatedFlipAngle += Math.abs(p.rotationalVelocity * dt);

      // Check full 360-degree rotation (2*PI radians)
      if (p.accumulatedFlipAngle >= Math.PI * 2) {
        p.accumulatedFlipAngle -= Math.PI * 2;
        p.flipsInAir++;

        const flipBonus = 150 * p.combo;
        p.score += flipBonus;
        p.feverEnergy = Math.min(100, p.feverEnergy + 12);
        p.combo = Math.min(8, p.combo + 1);
        p.comboTimer = 4.0;

        soundEngine.playAcrobaticSpin();
        this.spawnTextParticle(p.x, p.y - 25, `+${flipBonus} 🔄 360° FLIP!`, '#fde047');
        this.spawnRingParticle(p.x, p.y, '#38bdf8');
        this.spawnSparkles(p.x, p.y, 8, '#f59e0b');
      }
    } else if (!p.isGrounded) {
      // Natural aerodynamic tilt based on falling velocity
      const targetTilt = Math.max(-0.35, Math.min(0.35, (p.vy * 0.0008) * p.facing));
      p.rotation += (targetTilt - p.rotation) * 8 * dt;
    }

    // Check Vine Grab
    if (!p.isSwinging) {
      for (const vine of this.vines) {
        const endX = vine.anchorX + Math.sin(vine.angle) * vine.length;
        const endY = vine.anchorY + Math.cos(vine.angle) * vine.length;
        const dist = Math.hypot(p.x - endX, p.y - endY);

        if (dist < PHYSICS.VINE_GRAB_RADIUS && (this.input.jumpHeld || this.input.up || Math.abs(p.vx) > 80)) {
          // Latch onto vine!
          p.isSwinging = true;
          p.isFlipping = false;
          p.rotation = 0;
          p.swingVineId = vine.id;
          p.swingLength = vine.length;
          p.swingAngle = vine.angle;
          // Transfer momentum to angular velocity
          p.swingAngularVelocity = (p.vx / vine.length) * 0.85;
          p.vy = 0;
          p.vx = 0;
          soundEngine.playVineGrab();
          this.spawnDust(endX, endY, 6, '#86efac');
          break;
        }
      }
    }

    // Platform Collisions
    let groundedThisFrame = false;

    for (const plat of this.platforms) {
      const topY = plat.y;
      const prevY = p.y - p.vy * dt;

      // Check if monkey feet hit the top surface of platform
      if (
        p.x + p.radius > plat.x &&
        p.x - p.radius < plat.x + plat.width &&
        p.y + p.radius >= topY &&
        prevY + p.radius <= topY + 16 &&
        p.vy >= 0
      ) {
        if (plat.type === 'mushroom') {
          // Trampoline bounce!
          p.vy = plat.bounceStrength || PHYSICS.MUSHROOM_BOUNCE_VY;
          plat.mushroomSpring = 1.0;
          p.squashX = 1.4;
          p.squashY = 0.6;
          soundEngine.playMushroomBounce();
          this.triggerCameraShake(4);
          this.spawnDust(p.x, topY, 12, '#f87171');
          // Acrobatic bounce flip!
          this.startAcrobaticFlip();
        } else {
          // Normal Landing
          p.y = topY - p.radius;
          p.vy = 0;
          groundedThisFrame = true;

          // Squash on impact if fast landing
          if (!p.isGrounded) {
            p.squashX = 1.25;
            p.squashY = 0.8;
            this.spawnDust(p.x, topY, 5);

            // Reward landing after acrobatic flips
            if (p.flipsInAir > 0) {
              const stickBonus = 100 * p.flipsInAir;
              p.score += stickBonus;
              this.spawnTextParticle(p.x, topY - 25, `+${stickBonus} 🌟 PERFECT STICK!`, '#4ade80');
              this.spawnSparkles(p.x, topY, 6, '#4ade80');
              p.flipsInAir = 0;
            }
          }
        }
      }
    }

    if (groundedThisFrame) {
      p.isGrounded = true;
      this.coyoteTimer = PHYSICS.COYOTE_TIME;
      p.isFlipping = false;
      p.accumulatedFlipAngle = 0;
      p.rotationalVelocity = 0;
      p.rotation += (0 - p.rotation) * 20 * dt;
    } else {
      p.isGrounded = false;
    }
  }

  private throwCoconut() {
    if (this.player.coconuts <= 0) return;
    this.player.coconuts--;

    const speed = PHYSICS.COCONUT_SPEED * (this.player.facing);
    this.projectiles.push({
      id: `proj-${Date.now()}-${Math.random()}`,
      x: this.player.x + this.player.facing * 18,
      y: this.player.y - 4,
      vx: speed + this.player.vx * 0.4,
      vy: -180,
      radius: 9,
      rotation: 0,
      rotationSpeed: this.player.facing * 14,
      life: PHYSICS.COCONUT_LIFETIME,
    });

    soundEngine.playCoconutThrow();
  }

  private updateProjectiles(dt: number) {
    const p = this.player;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.life -= dt;

      // Projectile trajectory physics by type
      if (proj.type === 'boulder' || proj.type === 'magma_rock') {
        proj.vy += 650 * dt;
      } else if (proj.type === 'spear') {
        proj.vy += 220 * dt;
      } else if (proj.type === 'lightning_orb') {
        proj.vy += Math.sin(proj.life * 14) * 45 * dt;
      } else if (proj.type === 'venom') {
        proj.vy += 450 * dt;
      } else if (proj.type === 'seed') {
        proj.vy += 180 * dt;
      } else if (proj.type === 'fireball') {
        proj.vy += Math.sin(proj.life * 12) * 35 * dt;
      } else {
        // Standard coconut
        proj.vy += 850 * dt;
      }

      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.rotation += proj.rotationSpeed * dt;

      let hit = false;

      if (proj.isHostile) {
        // HOSTILE MONSTER PROJECTILE TARGETING MONKEY
        const distToMonkey = Math.hypot(proj.x - p.x, proj.y - p.y);
        if (distToMonkey < proj.radius + p.radius) {
          hit = true;
          if (p.isFever) {
            // Golden fever deflects & destroys hostile projectile!
            soundEngine.playCoconutHit();
            this.spawnSparkles(proj.x, proj.y, 8, '#fde047');
            this.spawnTextParticle(proj.x, proj.y - 20, '+100 DEFLECT!', '#fde047');
            p.score += 100;
          } else if (p.invulnerableTimer <= 0) {
            this.playerHurt();
            this.spawnDust(proj.x, proj.y, 8, '#ef4444');
          }
        }

        // Monkey's coconuts can shoot down & intercept monster projectiles!
        for (const friendly of this.projectiles) {
          if (!friendly.isHostile && friendly.life > 0) {
            const distBetween = Math.hypot(proj.x - friendly.x, proj.y - friendly.y);
            if (distBetween < proj.radius + friendly.radius) {
              hit = true;
              friendly.life = 0;
              soundEngine.playCoconutHit();
              this.spawnSparkles(proj.x, proj.y, 8, '#38bdf8');
              this.spawnTextParticle(proj.x, proj.y - 20, '+150 INTERCEPT!', '#38bdf8');
              p.score += 150;
              this.triggerHitstop(0.04);
              break;
            }
          }
        }
      } else {
        // FRIENDLY COCONUT PROJECTILE THROWN BY MONKEY
        for (const enemy of this.enemies) {
          const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
          if (dist < proj.radius + enemy.radius) {
            enemy.health--;
            hit = true;
            this.triggerHitstop(PHYSICS.HITSTOP_TIME);
            this.triggerCameraShake(6);
            soundEngine.playCoconutHit();

            // Shatter particles
            this.spawnCoconutShatter(proj.x, proj.y);

            if (enemy.health <= 0) {
              this.defeatEnemy(enemy);
            } else {
              enemy.stateTimer = 0;
              this.spawnSparkles(enemy.x, enemy.y, 6, '#ef4444');
            }
            break;
          }
        }
      }

      // Check collision with platforms (coconuts, boulders, seeds shatter on impact)
      if (!hit) {
        for (const plat of this.platforms) {
          if (
            proj.x > plat.x &&
            proj.x < plat.x + plat.width &&
            proj.y > plat.y &&
            proj.y < plat.y + plat.height
          ) {
            hit = true;
            soundEngine.playCoconutHit();
            this.spawnCoconutShatter(proj.x, proj.y);
            break;
          }
        }
      }

      if (hit || proj.life <= 0 || proj.y > PHYSICS.WATER_SURFACE_Y) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number) {
    const p = this.player;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.stateTimer += dt;
      if (e.attackCooldown !== undefined && e.attackCooldown > 0) {
        e.attackCooldown -= dt;
      }

      const dX = p.x - e.x;
      const dY = p.y - e.y;
      const distToPlayer = Math.hypot(dX, dY);

      if (e.type === 'toucan') {
        // Canopy Aviary Monster: Flies back and forth with wave motion & shoots thorny seeds!
        e.x += e.vx * dt;
        e.y += Math.sin(e.stateTimer * 4) * 1.8;
        if (e.patrolStartX && e.patrolRange) {
          if (e.x > e.patrolStartX + e.patrolRange / 2) {
            e.vx = -Math.abs(e.vx);
            e.facing = -1;
          } else if (e.x < e.patrolStartX - e.patrolRange / 2) {
            e.vx = Math.abs(e.vx);
            e.facing = 1;
          }
        }

        // Hostile Attack: Target monkey when nearby and shoot sharp thorny seeds!
        if (distToPlayer < 480 && Math.abs(dY) < 240) {
          e.facing = dX > 0 ? 1 : -1;
          if (e.attackCooldown === undefined || e.attackCooldown <= 0) {
            e.attackCooldown = 2.2;
            e.isTelegraphing = false;
            this.projectiles.push({
              id: `seed-${Date.now()}-${Math.random()}`,
              x: e.x + e.facing * 20,
              y: e.y,
              vx: e.facing * 340,
              vy: Math.max(-100, Math.min(100, dY * 0.7)),
              radius: 7,
              rotation: 0,
              rotationSpeed: e.facing * 12,
              life: 3.0,
              isHostile: true,
              type: 'seed',
            });
            soundEngine.playMonsterShoot();
            this.spawnSparkles(e.x + e.facing * 20, e.y, 4, '#ea580c');
          } else if (e.attackCooldown < 0.45) {
            e.isTelegraphing = true;
          }
        } else {
          e.isTelegraphing = false;
        }
      } else if (e.type === 'bat') {
        // Shadow Vampire Bat: Relentlessly dive-bombs and chases the monkey
        if (e.state === 'idle' && distToPlayer < 340) {
          e.state = 'swoop';
          soundEngine.playMonsterAlert();
          this.spawnTextParticle(e.x, e.y - 20, '🦇 SCREECH!', '#c084fc');
        }
        if (e.state === 'swoop') {
          const angle = Math.atan2(dY, dX);
          e.vx = Math.cos(angle) * 230;
          e.vy = Math.sin(angle) * 230;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          e.facing = e.vx > 0 ? 1 : -1;
        }
      } else if (e.type === 'python') {
        // Venom Tree Viper: Patrols branch, telegraphs, and lunges forward with biting fangs
        if (e.state === 'lunge') {
          e.x += e.vx * dt;
          if (e.stateTimer > 0.45) {
            e.state = 'patrol';
            e.stateTimer = 0;
            e.vx = e.facing * 70;
            e.isTelegraphing = false;
          }
        } else if (e.state === 'attack') {
          e.isTelegraphing = true;
          if (e.stateTimer > 0.35) {
            e.state = 'lunge';
            e.stateTimer = 0;
            e.vx = e.facing * 400;
            soundEngine.playMonsterRoar();
            this.spawnDust(e.x, e.y, 6, '#16a34a');
          }
        } else {
          e.x += e.vx * dt;
          if (e.patrolStartX && e.patrolRange) {
            if (e.x > e.patrolStartX + e.patrolRange / 2) {
              e.vx = -Math.abs(e.vx);
              e.facing = -1;
            } else if (e.x < e.patrolStartX - e.patrolRange / 2) {
              e.vx = Math.abs(e.vx);
              e.facing = 1;
            }
          }

          if (distToPlayer < 260 && Math.abs(dY) < 70) {
            if (e.attackCooldown === undefined || e.attackCooldown <= 0) {
              e.state = 'attack';
              e.stateTimer = 0;
              e.facing = dX > 0 ? 1 : -1;
              e.attackCooldown = 2.4;
              soundEngine.playMonsterAlert();
            }
          }
        }
      } else if (e.type === 'wild_boar') {
        // Enraged Razorback Jungle Boar: Scrapes hooves, snorts, and charges at top speed!
        if (e.state === 'charge') {
          e.x += e.vx * dt;
          if (Math.random() < 0.4) {
            this.spawnDust(e.x, e.y + 14, 2, '#78350f');
          }
          if (e.stateTimer > 1.2) {
            e.state = 'patrol';
            e.stateTimer = 0;
            e.vx = e.facing * 75;
            e.isTelegraphing = false;
          }
        } else {
          // Patrol
          e.x += e.vx * dt;
          if (e.patrolStartX && e.patrolRange) {
            if (e.x > e.patrolStartX + e.patrolRange / 2) {
              e.vx = -Math.abs(e.vx);
              e.facing = -1;
            } else if (e.x < e.patrolStartX - e.patrolRange / 2) {
              e.vx = Math.abs(e.vx);
              e.facing = 1;
            }
          }

          // Trigger Charge attack when monkey is in view on same platform elevation!
          if (distToPlayer < 400 && Math.abs(dY) < 90) {
            e.facing = dX > 0 ? 1 : -1;
            if (e.attackCooldown === undefined || e.attackCooldown <= 0) {
              e.isTelegraphing = true;
              this.spawnDust(e.x, e.y + 16, 2, '#78350f');
              if (e.stateTimer > 0.4) {
                e.state = 'charge';
                e.stateTimer = 0;
                e.vx = e.facing * (e.maxHealth >= 3 ? 420 : 360);
                e.attackCooldown = 2.6;
                soundEngine.playMonsterCharge();
                this.spawnTextParticle(e.x, e.y - 25, '🐗 CHARGE!', '#ea580c');
              }
            } else if (e.attackCooldown < 0.4) {
              e.isTelegraphing = true;
            }
          } else {
            e.isTelegraphing = false;
          }
        }
      } else if (e.type === 'venom_frog') {
        // Poison Spitter Chameleon / Frog: Inflates throat sac & fires tracking poison spit!
        if (distToPlayer < 500) {
          e.facing = dX > 0 ? 1 : -1;
          if (e.attackCooldown === undefined || e.attackCooldown <= 0) {
            e.attackCooldown = 2.2;
            e.isTelegraphing = false;
            this.projectiles.push({
              id: `frog-venom-${Date.now()}-${Math.random()}`,
              x: e.x + e.facing * 18,
              y: e.y - 6,
              vx: e.facing * 310,
              vy: -110 + Math.max(-100, Math.min(100, dY * 0.6)),
              radius: 9,
              rotation: 0,
              rotationSpeed: e.facing * 8,
              life: 3.2,
              isHostile: true,
              type: 'venom',
            });
            soundEngine.playMonsterShoot();
            this.spawnSparkles(e.x + e.facing * 18, e.y, 6, '#22c55e');
          } else if (e.attackCooldown < 0.5) {
            e.isTelegraphing = true;
          }
        } else {
          e.isTelegraphing = false;
        }
      } else if (e.type === 'temple_golem') {
        // Ancient Sun Golem: Heavy stone footsteps, fires blazing solar fireballs!
        e.x += e.vx * dt;
        if (e.patrolStartX && e.patrolRange) {
          if (e.x > e.patrolStartX + e.patrolRange / 2) {
            e.vx = -Math.abs(e.vx);
            e.facing = -1;
          } else if (e.x < e.patrolStartX - e.patrolRange / 2) {
            e.vx = Math.abs(e.vx);
            e.facing = 1;
          }
        }

        // Boss Stomp for Sol-Titan
        if (e.maxHealth >= 4 && e.stateTimer % 3.8 < dt) {
          this.triggerCameraShake(8);
          soundEngine.playMonsterRoar();
          this.spawnDust(e.x, e.y + 30, 16, '#ca8a04');
        }

        // Solar Fireball Attack
        if (distToPlayer < 520) {
          e.facing = dX > 0 ? 1 : -1;
          if (e.attackCooldown === undefined || e.attackCooldown <= 0) {
            e.attackCooldown = e.maxHealth >= 4 ? 2.0 : 2.5;
            e.isTelegraphing = false;
            this.projectiles.push({
              id: `fireball-${Date.now()}-${Math.random()}`,
              x: e.x + e.facing * 28,
              y: e.y - 12,
              vx: e.facing * 310,
              vy: -110 + Math.max(-100, Math.min(100, dY * 0.5)),
              radius: 12,
              rotation: 0,
              rotationSpeed: e.facing * 8,
              life: 3.5,
              isHostile: true,
              type: 'fireball',
            });
            soundEngine.playMonsterShoot();
            this.spawnSparkles(e.x + e.facing * 28, e.y - 12, 8, '#f59e0b');
          } else if (e.attackCooldown < 0.5) {
            e.isTelegraphing = true;
          }
        } else {
          e.isTelegraphing = false;
        }
      } else if (e.type === 'sun_harpy') {
        // Winged Solar Harpy Demon: Glides smoothly through temple ruins & casts twin solar flares
        e.x += e.vx * dt;
        e.y += Math.sin(e.stateTimer * 3.5) * 1.8;
        if (e.patrolStartX && e.patrolRange) {
          if (e.x > e.patrolStartX + e.patrolRange / 2) {
            e.vx = -Math.abs(e.vx);
            e.facing = -1;
          } else if (e.x < e.patrolStartX - e.patrolRange / 2) {
            e.vx = Math.abs(e.vx);
            e.facing = 1;
          }
        }

        if (distToPlayer < 520) {
          e.facing = dX > 0 ? 1 : -1;
          if (e.attackCooldown === undefined || e.attackCooldown <= 0) {
            e.attackCooldown = 2.3;
            e.isTelegraphing = false;
            // Twin solar ember flares
            for (let s = -1; s <= 1; s += 2) {
              this.projectiles.push({
                id: `harpy-fire-${Date.now()}-${Math.random()}`,
                x: e.x + e.facing * 22,
                y: e.y + s * 8,
                vx: e.facing * (300 + s * 30),
                vy: -80 + s * 45 + dY * 0.4,
                radius: 10,
                rotation: 0,
                rotationSpeed: e.facing * 10,
                life: 3.2,
                isHostile: true,
                type: 'fireball',
              });
            }
            soundEngine.playMonsterShoot();
            this.spawnSparkles(e.x, e.y, 8, '#f59e0b');
          } else if (e.attackCooldown < 0.5) {
            e.isTelegraphing = true;
          }
        } else {
          e.isTelegraphing = false;
        }
      } else if (e.type === 'temple_skeleton') {
        // Cursed Aztec Skeleton Spearman: Aims and hurls sharp obsidian spears at monkey
        e.x += e.vx * dt;
        if (e.patrolStartX && e.patrolRange) {
          if (e.x > e.patrolStartX + e.patrolRange / 2) {
            e.vx = -Math.abs(e.vx);
            e.facing = -1;
          } else if (e.x < e.patrolStartX - e.patrolRange / 2) {
            e.vx = Math.abs(e.vx);
            e.facing = 1;
          }
        }

        if (distToPlayer < 440) {
          e.facing = dX > 0 ? 1 : -1;
          if (e.attackCooldown === undefined || e.attackCooldown <= 0) {
            e.attackCooldown = 2.4;
            e.isTelegraphing = false;
            this.projectiles.push({
              id: `spear-${Date.now()}-${Math.random()}`,
              x: e.x + e.facing * 24,
              y: e.y - 10,
              vx: e.facing * 390,
              vy: -90 + Math.max(-80, Math.min(80, dY * 0.4)),
              radius: 11,
              rotation: e.facing === 1 ? 0 : Math.PI,
              rotationSpeed: 0,
              life: 3.5,
              isHostile: true,
              type: 'spear',
            });
            soundEngine.playMonsterShoot();
            this.spawnDust(e.x, e.y, 5, '#eab308');
          } else if (e.attackCooldown < 0.45) {
            e.isTelegraphing = true;
          }
        } else {
          e.isTelegraphing = false;
        }
      } else if (e.type === 'fire_scarab') {
        // Rapid Scuttling Magma Scarab: Crawls quickly and explodes with fiery sparks
        e.x += e.vx * dt;
        if (Math.random() < 0.25) {
          this.spawnSparkles(e.x, e.y + 4, 1, '#f97316');
        }
        if (e.patrolStartX && e.patrolRange) {
          if (e.x > e.patrolStartX + e.patrolRange / 2) {
            e.vx = -Math.abs(e.vx);
            e.facing = -1;
          } else if (e.x < e.patrolStartX - e.patrolRange / 2) {
            e.vx = Math.abs(e.vx);
            e.facing = 1;
          }
        }
        // Accelerate aggressively if monkey is nearby
        if (distToPlayer < 240) {
          e.vx = e.facing * 180;
        }
      } else if (e.type === 'savage_baboon') {
        // Savage Mountain Ape: Leaping ground slam & magma rock hurling!
        if (e.state === 'leap') {
          e.vy += 850 * dt;
          e.y += e.vy * dt;
          e.x += e.vx * dt;
          if (e.homeY && e.y >= e.homeY) {
            e.y = e.homeY;
            e.vy = 0;
            e.state = 'patrol';
            e.vx = e.facing * 75;
            soundEngine.playMonsterRoar();
            this.triggerCameraShake(7);
            this.spawnDust(e.x, e.y + 20, 14, '#dc2626');
          }
        } else {
          // Patrol
          e.x += e.vx * dt;
          if (e.patrolStartX && e.patrolRange) {
            if (e.x > e.patrolStartX + e.patrolRange / 2) {
              e.vx = -Math.abs(e.vx);
              e.facing = -1;
            } else if (e.x < e.patrolStartX - e.patrolRange / 2) {
              e.vx = Math.abs(e.vx);
              e.facing = 1;
            }
          }

          if (distToPlayer < 460) {
            e.facing = dX > 0 ? 1 : -1;
            if (e.attackCooldown === undefined || e.attackCooldown <= 0) {
              if (distToPlayer < 240 && Math.abs(dY) < 100) {
                // Leaping slam attack!
                e.homeY = e.y;
                e.state = 'leap';
                e.stateTimer = 0;
                e.vy = -480;
                e.vx = e.facing * 220;
                e.attackCooldown = 2.8;
                soundEngine.playMonsterRoar();
                this.spawnTextParticle(e.x, e.y - 25, '💥 SLAM!', '#ef4444');
              } else {
                // Hurls volcanic magma rock!
                e.attackCooldown = 2.2;
                this.projectiles.push({
                  id: `magma-${Date.now()}-${Math.random()}`,
                  x: e.x + e.facing * 26,
                  y: e.y - 16,
                  vx: e.facing * 340,
                  vy: -190,
                  radius: 13,
                  rotation: 0,
                  rotationSpeed: e.facing * 9,
                  life: 3.5,
                  isHostile: true,
                  type: 'magma_rock',
                });
                soundEngine.playMonsterShoot();
                this.spawnSparkles(e.x + e.facing * 26, e.y - 16, 8, '#f97316');
              }
            } else if (e.attackCooldown < 0.5) {
              e.isTelegraphing = true;
            }
          } else {
            e.isTelegraphing = false;
          }
        }
      } else if (e.type === 'storm_hawk') {
        // Electric Thunder Wyvern: Emits sparks & discharges lightning orbs at monkey
        e.x += e.vx * dt;
        e.y += Math.sin(e.stateTimer * 4) * 2.2;
        if (Math.random() < 0.3) {
          this.spawnSparkles(e.x, e.y, 1, '#38bdf8');
        }
        if (e.patrolStartX && e.patrolRange) {
          if (e.x > e.patrolStartX + e.patrolRange / 2) {
            e.vx = -Math.abs(e.vx);
            e.facing = -1;
          } else if (e.x < e.patrolStartX - e.patrolRange / 2) {
            e.vx = Math.abs(e.vx);
            e.facing = 1;
          }
        }

        if (distToPlayer < 500) {
          e.facing = dX > 0 ? 1 : -1;
          if (e.attackCooldown === undefined || e.attackCooldown <= 0) {
            e.attackCooldown = 2.3;
            e.isTelegraphing = false;
            this.projectiles.push({
              id: `lightning-${Date.now()}-${Math.random()}`,
              x: e.x + e.facing * 26,
              y: e.y,
              vx: e.facing * 340,
              vy: Math.max(-100, Math.min(100, dY * 0.7)),
              radius: 12,
              rotation: 0,
              rotationSpeed: e.facing * 12,
              life: 3.4,
              isHostile: true,
              type: 'lightning_orb',
            });
            soundEngine.playZap();
            this.spawnSparkles(e.x + e.facing * 26, e.y, 8, '#38bdf8');
          } else if (e.attackCooldown < 0.45) {
            e.isTelegraphing = true;
          }
        } else {
          e.isTelegraphing = false;
        }
      } else if (e.type === 'lava_crab') {
        // Armored Basalt Molten Crab: Launches volcanic geyser magma rocks!
        e.x += e.vx * dt;
        if (e.patrolStartX && e.patrolRange) {
          if (e.x > e.patrolStartX + e.patrolRange / 2) {
            e.vx = -Math.abs(e.vx);
            e.facing = -1;
          } else if (e.x < e.patrolStartX - e.patrolRange / 2) {
            e.vx = Math.abs(e.vx);
            e.facing = 1;
          }
        }

        if (distToPlayer < 450) {
          e.facing = dX > 0 ? 1 : -1;
          if (e.attackCooldown === undefined || e.attackCooldown <= 0) {
            e.attackCooldown = 2.8;
            e.isTelegraphing = false;
            // Erupt twin volcanic magma rocks
            this.projectiles.push({
              id: `lava-rock-1-${Date.now()}`,
              x: e.x + e.facing * 14,
              y: e.y - 14,
              vx: e.facing * 220,
              vy: -390,
              radius: 12,
              rotation: 0,
              rotationSpeed: e.facing * 7,
              life: 3.2,
              isHostile: true,
              type: 'magma_rock',
            });
            this.projectiles.push({
              id: `lava-rock-2-${Date.now()}`,
              x: e.x - e.facing * 10,
              y: e.y - 14,
              vx: e.facing * 110,
              vy: -440,
              radius: 10,
              rotation: 0,
              rotationSpeed: -e.facing * 8,
              life: 3.2,
              isHostile: true,
              type: 'magma_rock',
            });
            soundEngine.playMonsterShoot();
            this.spawnSparkles(e.x, e.y - 14, 10, '#f97316');
          } else if (e.attackCooldown < 0.5) {
            e.isTelegraphing = true;
          }
        } else {
          e.isTelegraphing = false;
        }
      } else if (e.type === 'python_boss') {
        // FANGOR: Giant Venom Serpent Boss (Chapter 1)
        e.x += e.vx * dt;
        if (e.patrolStartX && e.patrolRange) {
          if (e.x > e.patrolStartX + e.patrolRange / 2) {
            e.vx = -Math.abs(e.vx);
            e.facing = -1;
          } else if (e.x < e.patrolStartX - e.patrolRange / 2) {
            e.vx = Math.abs(e.vx);
            e.facing = 1;
          }
        }

        // Spit Venom Attack
        if (distToPlayer < 550) {
          e.facing = dX > 0 ? 1 : -1;
          if (e.attackCooldown === undefined || e.attackCooldown <= 0) {
            e.attackCooldown = 2.0;
            e.isTelegraphing = false;
            // Spits twin venom orbs
            for (let s = -1; s <= 1; s += 2) {
              this.projectiles.push({
                id: `venom-${Date.now()}-${Math.random()}`,
                x: e.x + e.facing * 36,
                y: e.y - 6,
                vx: e.facing * (300 + s * 40),
                vy: -140 + s * 50,
                radius: 11,
                rotation: 0,
                rotationSpeed: e.facing * 8,
                life: 3.2,
                isHostile: true,
                type: 'venom',
              });
            }
            soundEngine.playMonsterShoot();
            this.spawnSparkles(e.x + e.facing * 36, e.y, 10, '#22c55e');
          } else if (e.attackCooldown < 0.5) {
            e.isTelegraphing = true;
          }
        }
      } else if (e.type === 'durian') {
        // Spiky Durian Fruit Trap: Drops when monkey passes underneath
        if (e.state === 'idle' && Math.abs(dX) < 90 && p.y > e.y) {
          e.state = 'falling';
          e.vy = 40;
          soundEngine.playMonsterShoot();
        }
        if (e.state === 'falling') {
          e.vy += 700 * dt;
          e.y += e.vy * dt;
        }
      } else if (e.type === 'gorilla_boss') {
        // SILVERBACK TITAN (Chapter 3 Boss): Charges, hurls boulders, and stomps seismic tremors!
        e.x += e.vx * dt;
        if (e.patrolStartX && e.patrolRange) {
          if (e.x > e.patrolStartX + e.patrolRange / 2) {
            e.vx = -80;
            e.facing = -1;
          } else if (e.x < e.patrolStartX - e.patrolRange / 2) {
            e.vx = 80;
            e.facing = 1;
          }
        }

        // Seismic Stomp Shockwave
        if (e.stateTimer % 3.6 < dt) {
          this.triggerCameraShake(10);
          soundEngine.playMonsterRoar();
          this.spawnDust(e.x, e.y + 40, 20);
          if (p.isGrounded && Math.abs(dX) < 280 && p.invulnerableTimer <= 0) {
            this.playerHurt();
          }
        }

        // Hurling Boulder Attack
        if (distToPlayer < 560) {
          e.facing = dX > 0 ? 1 : -1;
          if (e.attackCooldown === undefined || e.attackCooldown <= 0) {
            e.attackCooldown = 2.6;
            e.isTelegraphing = false;
            this.projectiles.push({
              id: `boulder-${Date.now()}-${Math.random()}`,
              x: e.x + e.facing * 40,
              y: e.y - 24,
              vx: e.facing * 340,
              vy: -200,
              radius: 18,
              rotation: 0,
              rotationSpeed: e.facing * 7,
              life: 3.5,
              isHostile: true,
              type: 'boulder',
            });
            soundEngine.playMonsterShoot();
            this.spawnSparkles(e.x + e.facing * 40, e.y - 24, 8, '#78350f');
          } else if (e.attackCooldown < 0.6) {
            e.isTelegraphing = true;
          }
        }
      }

      // Check collision with player
      if (distToPlayer < p.radius + e.radius) {
        if (p.isFever) {
          // In fever mode, monkey blasts right through enemies!
          this.defeatEnemy(e);
          soundEngine.playCoconutHit();
          this.triggerCameraShake(6);
        } else if (!e.isArmored && p.vy > 60 && p.y < e.y - e.radius * 0.35) {
          // MONKEY STOMPS ON TOP OF ENEMY FROM ABOVE!
          e.health--;
          p.vy = -560; // Big bounce launch
          soundEngine.playEnemyStomp();
          this.triggerHitstop(0.04);
          this.spawnDust(p.x, p.y + 12, 10, '#ffffff');
          this.spawnSparkles(e.x, e.y, 8, '#fde047');
          this.startAcrobaticFlip();
          this.spawnTextParticle(e.x, e.y - 22, '+250 STOMP!', '#fde047');
          p.combo++;
          p.score += 250 * p.combo;
          p.feverEnergy = Math.min(100, p.feverEnergy + 12);
          if (p.feverEnergy >= 100 && !p.isFever) {
            this.activateFever();
          }
          if (e.health <= 0) {
            this.defeatEnemy(e);
          }
        } else if (p.invulnerableTimer <= 0) {
          this.playerHurt();
        }
      }
    }
  }

  private defeatEnemy(enemy: Enemy) {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
    }

    const isBoss = enemy.type === 'gorilla_boss' || enemy.type === 'python_boss' || (enemy.type === 'temple_golem' && enemy.maxHealth >= 4);
    const scoreVal = isBoss ? 5000 : 300 * this.player.combo;
    this.player.score += scoreVal;
    this.spawnDust(enemy.x, enemy.y, isBoss ? 24 : 14, '#ef4444');

    if (isBoss) {
      soundEngine.playMonsterRoar();
      soundEngine.playGoldenBanana();
      this.triggerCameraShake(16);
      this.spawnTextParticle(enemy.x, enemy.y - 40, '+5000 BOSS SLAIN!', '#facc15');
      this.spawnRingParticle(enemy.x, enemy.y, '#f59e0b');

      // Drop shower of golden bananas & hearts
      for (let i = 0; i < 6; i++) {
        this.collectibles.push({
          id: `boss-drop-${Date.now()}-${i}`,
          x: enemy.x + (i - 2.5) * 35,
          y: enemy.y - 30,
          baseY: enemy.y - 30,
          type: i === 0 ? 'golden_banana' : i === 1 ? 'heart_papaya' : 'banana',
          collected: false,
          floatOffset: i * 0.4,
        });
      }
    } else {
      this.spawnTextParticle(enemy.x, enemy.y - 20, `+${scoreVal}`, '#fde047');
      // Spawn bonus bananas on enemy defeat
      for (let i = 0; i < 3; i++) {
        this.collectibles.push({
          id: `drop-${Date.now()}-${i}`,
          x: enemy.x + (i - 1) * 25,
          y: enemy.y - 10,
          baseY: enemy.y - 10,
          type: 'banana',
          collected: false,
          floatOffset: i * 0.5,
        });
      }
    }
  }

  private playerHurt() {
    this.player.health--;
    this.player.invulnerableTimer = PHYSICS.INVULNERABLE_TIME;
    this.player.combo = 1;
    this.player.comboTimer = 0;
    this.player.vy = -340;
    this.player.vx = -this.player.facing * 260;
    this.triggerCameraShake(9);
    this.triggerHitstop(PHYSICS.HITSTOP_TIME * 1.5);
    soundEngine.playHurt();

    if (this.player.health <= 0) {
      this.gameOver();
    }
  }

  private updateCollectibles(dt: number) {
    const p = this.player;

    for (const item of this.collectibles) {
      if (item.collected) continue;
      item.floatOffset += dt * 3.5;

      // Magnet effect in Fever Mode: draw bananas towards monkey!
      if (p.isFever && (item.type === 'banana' || item.type === 'golden_banana')) {
        const dist = Math.hypot(p.x - item.x, p.y - item.y);
        if (dist < 320) {
          const angle = Math.atan2(p.y - item.y, p.x - item.x);
          item.x += Math.cos(angle) * 450 * dt;
          item.y += Math.sin(angle) * 450 * dt;
          item.baseY = item.y;
        }
      }

      // Collect radius check
      const dist = Math.hypot(p.x - item.x, p.y - item.y);
      if (dist < p.radius + 18) {
        item.collected = true;
        this.collectItem(item);
      }
    }
  }

  private collectItem(item: Collectible) {
    const p = this.player;

    if (item.type === 'banana') {
      p.bananas++;
      p.score += 100 * p.combo;
      p.comboTimer = 3.5;
      p.combo = Math.min(10, p.combo + 1);

      // Charge fever energy
      p.feverEnergy = Math.min(100, p.feverEnergy + 10);
      if (p.feverEnergy >= 100 && !p.isFever) {
        this.activateFever();
      }

      soundEngine.playBanana(p.combo);
      this.spawnSparkles(item.x, item.y, 6, '#facc15');
    } else if (item.type === 'golden_banana') {
      p.bananas += 5;
      p.score += 500 * p.combo;
      p.comboTimer = 5.0;
      p.combo = Math.min(10, p.combo + 2);
      p.feverEnergy = Math.min(100, p.feverEnergy + 35);
      if (p.feverEnergy >= 100 && !p.isFever) {
        this.activateFever();
      }

      soundEngine.playGoldenBanana();
      this.spawnSparkles(item.x, item.y, 14, '#fbbf24');
      this.triggerCameraShake(3);
    } else if (item.type === 'coconut_refill') {
      p.coconuts = Math.min(p.maxCoconuts, p.coconuts + 4);
      p.score += 150;
      soundEngine.playBanana(3);
      this.spawnSparkles(item.x, item.y, 8, '#78350f');
    } else if (item.type === 'heart_papaya') {
      p.health = Math.min(p.maxHealth, p.health + 1);
      p.score += 250;
      soundEngine.playGoldenBanana();
      this.spawnSparkles(item.x, item.y, 10, '#f43f5e');
    }
  }

  private activateFever() {
    this.player.isFever = true;
    this.player.feverDuration = PHYSICS.FEVER_DURATION;
    soundEngine.playFeverStart();
    this.triggerCameraShake(7);
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = p.life / p.maxLife;
      if (p.shape === 'ring') {
        p.size += dt * 65;
      }
      if (p.rotation !== undefined && p.rotSpeed !== undefined) {
        p.rotation += p.rotSpeed * dt;
      }
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public spawnTextParticle(x: number, y: number, text: string, color: string = '#fde047') {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 15,
      vy: -55,
      size: 14,
      color,
      alpha: 1.0,
      life: 0.85,
      maxLife: 0.85,
      shape: 'text',
      text,
    });
  }

  public spawnRingParticle(x: number, y: number, color: string = '#38bdf8') {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size: 14,
      color,
      alpha: 0.9,
      life: 0.45,
      maxLife: 0.45,
      shape: 'ring',
    });
  }

  private updateCamera(dt: number) {
    const vw = this.canvas.width;
    const vh = this.canvas.height;

    // Smooth horizontal follow with lead
    const targetX = this.player.x - vw * 0.35 + (this.player.facing * 50);
    this.cameraX += (targetX - this.cameraX) * 7 * dt;

    // Smooth vertical follow clamped to canopy bounds
    this.targetCameraY = Math.max(0, Math.min(500, this.player.y - vh * 0.5));
    this.cameraY += (this.targetCameraY - this.cameraY) * 5 * dt;
  }

  private checkGameConditions() {
    // Fell into jungle river / abyss
    if (this.player.y > PHYSICS.WATER_SURFACE_Y - 50) {
      this.player.health = 0;
      this.gameOver();
      return;
    }

    // Reached Level Finish Goal!
    if (this.player.x >= this.levelData.finishX - 40 && this.state === 'playing') {
      this.victory();
    }
  }

  private gameOver() {
    this.state = 'gameover';
    this.callbacks.onStateChange('gameover');
    soundEngine.stopMusic();
    soundEngine.playHurt();
  }

  private victory() {
    this.state = 'victory';
    this.callbacks.onStateChange('victory');
    soundEngine.stopMusic();
    soundEngine.playMonkeyChirp();
    soundEngine.playGoldenBanana();
  }

  public triggerCameraShake(intensity: number) {
    this.shakeIntensity = Math.min(18, this.shakeIntensity + intensity);
  }

  public triggerHitstop(duration: number) {
    this.hitstopTimer = duration;
  }

  private spawnDust(x: number, y: number, count: number, color: string = '#d1d5db') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI;
      const speed = 40 + Math.random() * 90;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: -Math.sin(angle) * speed * 0.6,
        size: 3 + Math.random() * 4,
        color,
        alpha: 0.8,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.5,
        shape: 'circle',
      });
    }
  }

  private spawnSparkles(x: number, y: number, count: number, color: string) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 5,
        color,
        alpha: 1.0,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        shape: 'sparkle',
      });
    }
  }

  private spawnCoconutShatter(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 4,
        color: '#78350f',
        alpha: 1.0,
        life: 0.4,
        maxLife: 0.4,
        shape: 'shard',
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 15,
      });
    }
  }

  private spawnFeverParticles() {
    const rainbow = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#a855f7'];
    const col = rainbow[Math.floor(Math.random() * rainbow.length)];
    this.particles.push({
      x: this.player.x + (Math.random() - 0.5) * 30,
      y: this.player.y + (Math.random() - 0.5) * 30,
      vx: -this.player.vx * 0.2 + (Math.random() - 0.5) * 50,
      vy: -50 + (Math.random() - 0.5) * 50,
      size: 4 + Math.random() * 4,
      color: col,
      alpha: 0.8,
      life: 0.3,
      maxLife: 0.3,
      shape: 'sparkle',
    });
  }

  public render() {
    const vw = this.canvas.width;
    const vh = this.canvas.height;

    const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
    const shakeY = (Math.random() - 0.5) * this.shakeIntensity;

    this.renderer.render(
      this.player,
      this.vines,
      this.platforms,
      this.collectibles,
      this.enemies,
      this.projectiles,
      this.particles,
      this.cameraX,
      this.cameraY,
      vw,
      vh,
      this.levelData.config.skyColors,
      this.levelData.config.hasRain,
      shakeX,
      shakeY
    );
  }
}
