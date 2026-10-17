import { Collectible, Enemy, LevelConfig, Platform, Vine } from './types';
import { LEVELS } from './constants';

export interface LevelData {
  config: LevelConfig;
  platforms: Platform[];
  vines: Vine[];
  collectibles: Collectible[];
  enemies: Enemy[];
  finishX: number;
}

export function generateLevel(levelId: number, isEndless: boolean = false): LevelData {
  const config = LEVELS.find(l => l.id === levelId) || LEVELS[0];
  const platforms: Platform[] = [];
  const vines: Vine[] = [];
  const collectibles: Collectible[] = [];
  const enemies: Enemy[] = [];

  const worldLength = isEndless ? 15000 : config.length;

  // 1. Initial Starting Platform
  platforms.push({
    id: 'start-plat',
    x: -100,
    y: 600,
    width: 600,
    height: 60,
    type: 'branch',
  });

  // Welcome Bananas
  for (let i = 0; i < 5; i++) {
    collectibles.push({
      id: `welcome-banana-${i}`,
      x: 150 + i * 50,
      y: 530,
      baseY: 530,
      type: 'banana',
      collected: false,
      floatOffset: i * 0.4,
    });
  }

  // 2. Procedural / Handcrafted Progression
  let currentX = 500;
  let currentY = 580;
  let sectionIndex = 0;

  let hasSpawnedMidBoss = false;

  while (currentX < worldLength - 900) {
    sectionIndex++;

    // Mid-level Elite Monster Arena (at ~50% of the adventure)
    if (!isEndless && !hasSpawnedMidBoss && currentX > (worldLength * 0.45)) {
      hasSpawnedMidBoss = true;
      const arenaWidth = 560;
      platforms.push({
        id: `midboss-arena-${sectionIndex}`,
        x: currentX,
        y: currentY,
        width: arenaWidth,
        height: 60,
        type: config.id === 2 ? 'stone' : 'branch',
      });

      // Chapter-themed Elite Mini-Boss
      if (config.id === 1) {
        enemies.push({
          id: `elite-boar-${sectionIndex}`,
          x: currentX + 380,
          y: currentY - 30,
          vx: -120,
          vy: 0,
          radius: 34,
          type: 'wild_boar',
          health: 3,
          maxHealth: 3,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + 280,
          patrolRange: 260,
          attackCooldown: 1.2,
          name: 'GORE-FANG: ENRAGED RAZORBACK',
        });
      } else if (config.id === 2) {
        enemies.push({
          id: `elite-harpy-${sectionIndex}`,
          x: currentX + 380,
          y: currentY - 140,
          vx: -140,
          vy: 0,
          radius: 30,
          type: 'sun_harpy',
          health: 3,
          maxHealth: 3,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + 280,
          patrolRange: 280,
          attackCooldown: 1.4,
          name: 'SOL-PYRE: HARPY QUEEN',
        });
      } else {
        enemies.push({
          id: `elite-baboon-${sectionIndex}`,
          x: currentX + 380,
          y: currentY - 35,
          vx: -110,
          vy: 0,
          radius: 36,
          type: 'savage_baboon',
          health: 4,
          maxHealth: 4,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + 280,
          patrolRange: 280,
          attackCooldown: 1.5,
          name: 'KONG-OR: BABOON WARLORD',
        });
      }

      // Arena rewards: Heart papaya + Coconuts
      collectibles.push({
        id: `arena-heal-${sectionIndex}`,
        x: currentX + 100,
        y: currentY - 38,
        baseY: currentY - 38,
        type: 'heart_papaya',
        collected: false,
        floatOffset: 0,
      });
      collectibles.push({
        id: `arena-coconut-${sectionIndex}`,
        x: currentX + 180,
        y: currentY - 38,
        baseY: currentY - 38,
        type: 'coconut_refill',
        collected: false,
        floatOffset: 0.5,
      });

      currentX += arenaWidth + 140;
      continue;
    }

    const pattern = sectionIndex % 4;

    if (pattern === 1) {
      // Pattern 1: Vine Swing Chain across a deep chasm with active aerial monsters!
      const vineCount = 2 + (sectionIndex % 2);
      for (let v = 0; v < vineCount; v++) {
        const vx = currentX + 160 + v * 320;
        const anchorY = 120 + (v % 2) * 50;
        const length = 320 + (v % 3) * 30;

        vines.push({
          id: `vine-${sectionIndex}-${v}`,
          anchorX: vx,
          anchorY,
          length,
          angle: (Math.sin(sectionIndex + v) * 0.4),
          angularVelocity: 0,
          restingAngle: 0,
          segments: [],
        });

        // Arc of bananas along swing
        for (let a = -1; a <= 1; a += 1) {
          collectibles.push({
            id: `arc-banana-${sectionIndex}-${v}-${a}`,
            x: vx + a * 110,
            y: anchorY + length - 30 + Math.abs(a) * 35,
            baseY: anchorY + length - 30 + Math.abs(a) * 35,
            type: a === 0 && (v === vineCount - 1) ? 'golden_banana' : 'banana',
            collected: false,
            floatOffset: Math.random() * Math.PI,
          });
        }
      }

      // Chapter-specific Aerial Hunter mid-swing trying to snipe or dive at monkey:
      if (config.id === 1) {
        // Aviary Toucan spitting thorny seed darts
        enemies.push({
          id: `toucan-${sectionIndex}`,
          x: currentX + vineCount * 300,
          y: 270,
          vx: -110,
          vy: 0,
          radius: 22,
          type: 'toucan',
          health: 1,
          maxHealth: 1,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + vineCount * 300,
          patrolRange: 240,
          attackCooldown: 1.4,
        });
      } else if (config.id === 2) {
        // Winged Sun Harpy gliding over ruins casting solar ember flares
        enemies.push({
          id: `harpy-vine-${sectionIndex}`,
          x: currentX + vineCount * 290,
          y: 260,
          vx: -130,
          vy: 0,
          radius: 24,
          type: 'sun_harpy',
          health: 2,
          maxHealth: 2,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + vineCount * 290,
          patrolRange: 260,
          attackCooldown: 1.8,
        });
      } else {
        // Storm Hawk with crackling lightning orbs
        enemies.push({
          id: `stormhawk-vine-${sectionIndex}`,
          x: currentX + vineCount * 300,
          y: 260,
          vx: -150,
          vy: 0,
          radius: 26,
          type: 'storm_hawk',
          health: 2,
          maxHealth: 2,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + vineCount * 300,
          patrolRange: 280,
          attackCooldown: 1.6,
        });
      }

      currentX += vineCount * 320 + 150;
      currentY = 560;

      // Landing Platform
      platforms.push({
        id: `landing-${sectionIndex}`,
        x: currentX,
        y: currentY,
        width: 340,
        height: 50,
        type: config.id === 2 ? 'stone' : 'branch',
      });

      // Monster Guard on Landing Platform trying to intercept monkey:
      if (config.id === 1) {
        // Razorback Boar or Tree Viper
        if (sectionIndex % 2 === 1) {
          enemies.push({
            id: `boar-landing-${sectionIndex}`,
            x: currentX + 220,
            y: currentY - 24,
            vx: -70,
            vy: 0,
            radius: 26,
            type: 'wild_boar',
            health: 2,
            maxHealth: 2,
            facing: -1,
            state: 'patrol',
            stateTimer: 0,
            patrolStartX: currentX + 180,
            patrolRange: 180,
            attackCooldown: 1.5,
          });
        } else {
          enemies.push({
            id: `python-landing-${sectionIndex}`,
            x: currentX + 230,
            y: currentY - 20,
            vx: -60,
            vy: 0,
            radius: 22,
            type: 'python',
            health: 1,
            maxHealth: 1,
            facing: -1,
            state: 'patrol',
            stateTimer: 0,
            patrolStartX: currentX + 180,
            patrolRange: 160,
            attackCooldown: 1.6,
          });
        }
      } else if (config.id === 2) {
        // Temple Skeleton Spearman with cursed spear
        enemies.push({
          id: `skeleton-landing-${sectionIndex}`,
          x: currentX + 220,
          y: currentY - 26,
          vx: -60,
          vy: 0,
          radius: 24,
          type: 'temple_skeleton',
          health: 2,
          maxHealth: 2,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + 180,
          patrolRange: 160,
          attackCooldown: 1.8,
        });
      } else {
        // Savage Baboon leaping with magma rock
        enemies.push({
          id: `baboon-landing-${sectionIndex}`,
          x: currentX + 220,
          y: currentY - 28,
          vx: -65,
          vy: 0,
          radius: 28,
          type: 'savage_baboon',
          health: 2,
          maxHealth: 2,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + 180,
          patrolRange: 160,
          attackCooldown: 1.8,
        });
      }

      // Coconut supply on landing platform
      collectibles.push({
        id: `coconut-resupply-${sectionIndex}`,
        x: currentX + 70,
        y: currentY - 35,
        baseY: currentY - 35,
        type: 'coconut_refill',
        collected: false,
        floatOffset: 0,
      });

      currentX += 360;
    } else if (pattern === 2) {
      // Pattern 2: Mushroom Bounce Section with Ground & Canopy Ambushers!
      const mushroomX = currentX + 80;
      const mushroomY = currentY + 20;

      platforms.push({
        id: `mushroom-${sectionIndex}`,
        x: mushroomX,
        y: mushroomY,
        width: 110,
        height: 45,
        type: 'mushroom',
        bounceStrength: -780,
        mushroomSpring: 0,
      });

      // Monster roaming near mushroom approach:
      if (config.id === 1) {
        enemies.push({
          id: `boar-mush-${sectionIndex}`,
          x: mushroomX - 60,
          y: mushroomY - 22,
          vx: 80,
          vy: 0,
          radius: 25,
          type: 'wild_boar',
          health: 1,
          maxHealth: 1,
          facing: 1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: mushroomX - 60,
          patrolRange: 120,
          attackCooldown: 1.4,
        });
      } else if (config.id === 2) {
        // Scuttling Fire Scarab
        enemies.push({
          id: `scarab-mush-${sectionIndex}`,
          x: mushroomX - 60,
          y: mushroomY - 16,
          vx: 120,
          vy: 0,
          radius: 18,
          type: 'fire_scarab',
          health: 1,
          maxHealth: 1,
          facing: 1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: mushroomX - 60,
          patrolRange: 140,
        });
      } else {
        // Armored Lava Crab with molten claws
        enemies.push({
          id: `crab-mush-${sectionIndex}`,
          x: mushroomX - 60,
          y: mushroomY - 20,
          vx: 60,
          vy: 0,
          radius: 24,
          type: 'lava_crab',
          health: 2,
          maxHealth: 2,
          facing: 1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: mushroomX - 60,
          patrolRange: 120,
          attackCooldown: 2.0,
          isArmored: true,
        });
      }

      // High canopy branch above the mushroom
      const highBranchX = mushroomX + 240;
      const highBranchY = mushroomY - 320;
      platforms.push({
        id: `high-branch-${sectionIndex}`,
        x: highBranchX,
        y: highBranchY,
        width: 300,
        height: 45,
        type: config.id === 2 ? 'stone' : 'bamboo',
      });

      // Monster waiting on high branch:
      if (config.id === 1) {
        // Poison Spitter Chameleon / Frog perched on branch spitting tracking poison
        enemies.push({
          id: `frog-high-${sectionIndex}`,
          x: highBranchX + 180,
          y: highBranchY - 20,
          vx: 0,
          vy: 0,
          radius: 20,
          type: 'venom_frog',
          health: 1,
          maxHealth: 1,
          facing: -1,
          state: 'idle',
          stateTimer: 0,
          attackCooldown: 1.6,
        });
        // Dangling vampire bat waiting to dive bomb
        enemies.push({
          id: `bat-${sectionIndex}`,
          x: highBranchX + 60,
          y: highBranchY + 70,
          vx: 0,
          vy: 0,
          radius: 20,
          type: 'bat',
          health: 1,
          maxHealth: 1,
          facing: 1,
          state: 'idle',
          stateTimer: 0,
        });
      } else if (config.id === 2) {
        // Sun Harpy perched ready to strike
        enemies.push({
          id: `harpy-high-${sectionIndex}`,
          x: highBranchX + 160,
          y: highBranchY - 60,
          vx: -90,
          vy: 0,
          radius: 24,
          type: 'sun_harpy',
          health: 2,
          maxHealth: 2,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: highBranchX + 160,
          patrolRange: 160,
          attackCooldown: 1.8,
        });
      } else {
        // Savage Baboon ready to leap down
        enemies.push({
          id: `baboon-high-${sectionIndex}`,
          x: highBranchX + 170,
          y: highBranchY - 28,
          vx: -70,
          vy: 0,
          radius: 28,
          type: 'savage_baboon',
          health: 2,
          maxHealth: 2,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: highBranchX + 160,
          patrolRange: 150,
          attackCooldown: 1.6,
        });
      }

      // Golden Banana reward on high branch
      collectibles.push({
        id: `golden-reward-${sectionIndex}`,
        x: highBranchX + 120,
        y: highBranchY - 45,
        baseY: highBranchY - 45,
        type: 'golden_banana',
        collected: false,
        floatOffset: 0,
      });

      // Heart Papaya heal occasionally
      if (sectionIndex % 3 === 0) {
        collectibles.push({
          id: `heart-heal-${sectionIndex}`,
          x: highBranchX + 240,
          y: highBranchY - 40,
          baseY: highBranchY - 40,
          type: 'heart_papaya',
          collected: false,
          floatOffset: 1,
        });
      }

      // Dropping spiky durian near the mushroom apex
      enemies.push({
        id: `durian-apex-${sectionIndex}`,
        x: mushroomX + 120,
        y: mushroomY - 360,
        vx: 0,
        vy: 0,
        radius: 24,
        type: 'durian',
        health: 1,
        maxHealth: 1,
        facing: 1,
        state: 'idle',
        stateTimer: 0,
        isArmored: true,
      });

      currentX = highBranchX + 320;
      currentY = highBranchY + 160;
    } else if (pattern === 3) {
      // Pattern 3: Enemy Combat Arena Branch: Intense Multi-Monster Ambush!
      const branchWidth = 520;
      platforms.push({
        id: `patrol-branch-${sectionIndex}`,
        x: currentX,
        y: currentY,
        width: branchWidth,
        height: 52,
        type: config.id === 2 ? 'stone' : 'branch',
      });

      // Chapter-themed monster army on branch:
      if (config.id === 1) {
        // Razorback Boar that charges furiously
        enemies.push({
          id: `boar-${sectionIndex}`,
          x: currentX + 340,
          y: currentY - 26,
          vx: -80,
          vy: 0,
          radius: 28,
          type: 'wild_boar',
          health: 2,
          maxHealth: 2,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + 260,
          patrolRange: 220,
          attackCooldown: 1.4,
        });
        // Venom Tree Viper lunging with fangs
        enemies.push({
          id: `python-${sectionIndex}`,
          x: currentX + 160,
          y: currentY - 20,
          vx: 70,
          vy: 0,
          radius: 22,
          type: 'python',
          health: 1,
          maxHealth: 1,
          facing: 1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + 160,
          patrolRange: 160,
          attackCooldown: 1.6,
        });
        // Perched Poison Frog spitting darts
        enemies.push({
          id: `frog-${sectionIndex}`,
          x: currentX + 460,
          y: currentY - 22,
          vx: 0,
          vy: 0,
          radius: 20,
          type: 'venom_frog',
          health: 1,
          maxHealth: 1,
          facing: -1,
          state: 'idle',
          stateTimer: 0,
          attackCooldown: 1.8,
        });
      } else if (config.id === 2) {
        // Ancient Temple Golem that casts solar fireballs
        enemies.push({
          id: `golem-${sectionIndex}`,
          x: currentX + 340,
          y: currentY - 28,
          vx: -50,
          vy: 0,
          radius: 28,
          type: 'temple_golem',
          health: 2,
          maxHealth: 2,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + 300,
          patrolRange: 200,
          attackCooldown: 1.8,
        });
        // Temple Skeleton throwing cursed spears
        enemies.push({
          id: `skeleton-${sectionIndex}`,
          x: currentX + 180,
          y: currentY - 26,
          vx: 60,
          vy: 0,
          radius: 24,
          type: 'temple_skeleton',
          health: 2,
          maxHealth: 2,
          facing: 1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + 160,
          patrolRange: 180,
          attackCooldown: 1.7,
        });
        // Fire Scarab crawling fast
        enemies.push({
          id: `scarab-${sectionIndex}`,
          x: currentX + 440,
          y: currentY - 16,
          vx: -130,
          vy: 0,
          radius: 18,
          type: 'fire_scarab',
          health: 1,
          maxHealth: 1,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + 420,
          patrolRange: 140,
        });
      } else {
        // Savage Baboon leaping & hurling magma rocks
        enemies.push({
          id: `baboon-${sectionIndex}`,
          x: currentX + 340,
          y: currentY - 30,
          vx: -70,
          vy: 0,
          radius: 30,
          type: 'savage_baboon',
          health: 2,
          maxHealth: 2,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + 280,
          patrolRange: 220,
          attackCooldown: 1.7,
        });
        // Armored Molten Lava Crab
        enemies.push({
          id: `crab-${sectionIndex}`,
          x: currentX + 180,
          y: currentY - 22,
          vx: 60,
          vy: 0,
          radius: 25,
          type: 'lava_crab',
          health: 2,
          maxHealth: 2,
          facing: 1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + 160,
          patrolRange: 160,
          attackCooldown: 2.1,
          isArmored: true,
        });
      }

      // Bananas and coconut crates along combat branch
      for (let b = 0; b < 4; b++) {
        collectibles.push({
          id: `branch-banana-${sectionIndex}-${b}`,
          x: currentX + 60 + b * 55,
          y: currentY - 35,
          baseY: currentY - 35,
          type: 'banana',
          collected: false,
          floatOffset: b * 0.3,
        });
      }
      collectibles.push({
        id: `branch-coconuts-${sectionIndex}`,
        x: currentX + 270,
        y: currentY - 35,
        baseY: currentY - 35,
        type: 'coconut_refill',
        collected: false,
        floatOffset: 0,
      });

      currentX += branchWidth + 140;
    } else {
      // Pattern 4: Moving Platform across chasm with aerial predator hunting monkey!
      const movingX = currentX + 80;
      const movingY = currentY - 30;

      platforms.push({
        id: `moving-${sectionIndex}`,
        x: movingX,
        y: movingY,
        width: 190,
        height: 42,
        type: 'moving',
        vx: 85,
        minX: movingX - 120,
        maxX: movingX + 170,
      });

      // Saver vine above
      vines.push({
        id: `saver-vine-${sectionIndex}`,
        anchorX: movingX + 160,
        anchorY: 100,
        length: 360,
        angle: 0.2,
        angularVelocity: 0,
        restingAngle: 0,
        segments: [],
      });

      // Aerial Monster patrolling the chasm attempting to knock monkey down:
      if (config.id === 1) {
        enemies.push({
          id: `chasm-toucan-${sectionIndex}`,
          x: movingX + 100,
          y: movingY - 140,
          vx: 80,
          vy: 0,
          radius: 22,
          type: 'toucan',
          health: 1,
          maxHealth: 1,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: movingX + 100,
          patrolRange: 180,
          attackCooldown: 1.8,
        });
      } else if (config.id === 2) {
        enemies.push({
          id: `chasm-harpy-${sectionIndex}`,
          x: movingX + 100,
          y: movingY - 150,
          vx: 90,
          vy: 0,
          radius: 24,
          type: 'sun_harpy',
          health: 2,
          maxHealth: 2,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: movingX + 100,
          patrolRange: 200,
          attackCooldown: 1.8,
        });
      } else {
        enemies.push({
          id: `chasm-hawk-${sectionIndex}`,
          x: movingX + 100,
          y: movingY - 150,
          vx: 100,
          vy: 0,
          radius: 26,
          type: 'storm_hawk',
          health: 2,
          maxHealth: 2,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: movingX + 100,
          patrolRange: 220,
          attackCooldown: 1.6,
        });
      }

      currentX += 430;
      currentY = 560;

      // Landing Platform after moving platform
      platforms.push({
        id: `post-moving-plat-${sectionIndex}`,
        x: currentX,
        y: currentY,
        width: 290,
        height: 50,
        type: config.id === 2 ? 'stone' : 'branch',
      });

      // Guard waiting on landing platform:
      if (config.id === 1) {
        enemies.push({
          id: `post-guard-boar-${sectionIndex}`,
          x: currentX + 190,
          y: currentY - 24,
          vx: -70,
          vy: 0,
          radius: 25,
          type: 'wild_boar',
          health: 1,
          maxHealth: 1,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + 160,
          patrolRange: 150,
          attackCooldown: 1.5,
        });
      } else if (config.id === 2) {
        enemies.push({
          id: `post-guard-skel-${sectionIndex}`,
          x: currentX + 190,
          y: currentY - 26,
          vx: -60,
          vy: 0,
          radius: 24,
          type: 'temple_skeleton',
          health: 2,
          maxHealth: 2,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + 160,
          patrolRange: 150,
          attackCooldown: 1.8,
        });
      } else {
        enemies.push({
          id: `post-guard-baboon-${sectionIndex}`,
          x: currentX + 190,
          y: currentY - 28,
          vx: -65,
          vy: 0,
          radius: 28,
          type: 'savage_baboon',
          health: 2,
          maxHealth: 2,
          facing: -1,
          state: 'patrol',
          stateTimer: 0,
          patrolStartX: currentX + 160,
          patrolRange: 150,
          attackCooldown: 1.8,
        });
      }

      currentX += 310;
    }
  }

  // 3. Final Boss / Victory Goal at the End of Every Chapter!
  const finishPlatformX = worldLength - 700;
  const finishPlatformY = 550;

  platforms.push({
    id: 'finish-platform',
    x: finishPlatformX,
    y: finishPlatformY,
    width: 800,
    height: 70,
    type: config.id === 2 ? 'stone' : 'branch',
  });

  // CHAPTER BOSS MONSTERS (Each chapter has a unique formidable monster trying to kill monkey!)
  if (!isEndless) {
    if (config.id === 1) {
      // Chapter 1 Boss: Fangor the Ancient Venom Serpent
      enemies.push({
        id: 'fangor-boss',
        x: finishPlatformX + 480,
        y: finishPlatformY - 32,
        vx: -60,
        vy: 0,
        radius: 48,
        type: 'python_boss',
        health: 5,
        maxHealth: 5,
        facing: -1,
        state: 'patrol',
        stateTimer: 0,
        patrolStartX: finishPlatformX + 380,
        patrolRange: 260,
        attackCooldown: 1.6,
        name: 'FANGOR: VENOM SERPENT',
      });
    } else if (config.id === 2) {
      // Chapter 2 Boss: Sol-Titan Ancient Sun Golem
      enemies.push({
        id: 'sol-titan-boss',
        x: finishPlatformX + 500,
        y: finishPlatformY - 55,
        vx: -70,
        vy: 0,
        radius: 56,
        type: 'temple_golem',
        health: 6,
        maxHealth: 6,
        facing: -1,
        state: 'patrol',
        stateTimer: 0,
        patrolStartX: finishPlatformX + 360,
        patrolRange: 280,
        attackCooldown: 1.8,
        name: 'SOL-TITAN: ANCIENT SUN GOLEM',
      });
    } else if (config.id === 3) {
      // Chapter 3 Boss: Silverback Titan Boss
      enemies.push({
        id: 'titan-boss',
        x: finishPlatformX + 520,
        y: finishPlatformY - 60,
        vx: -80,
        vy: 0,
        radius: 65,
        type: 'gorilla_boss',
        health: 7,
        maxHealth: 7,
        facing: -1,
        state: 'patrol',
        stateTimer: 0,
        patrolStartX: finishPlatformX + 350,
        patrolRange: 280,
        attackCooldown: 2.0,
        name: 'SILVERBACK TITAN',
      });
    }
  } else {
    // In Endless Mode: Spawn roaming bosses at regular intervals
    enemies.push({
      id: 'endless-titan-boss',
      x: finishPlatformX + 500,
      y: finishPlatformY - 60,
      vx: -80,
      vy: 0,
      radius: 65,
      type: 'gorilla_boss',
      health: 6,
      maxHealth: 6,
      facing: -1,
      state: 'patrol',
      stateTimer: 0,
      patrolStartX: finishPlatformX + 350,
      patrolRange: 280,
      name: 'APEX TITAN',
    });
  }

  // Giant Victory Golden Trophy Banana at the end
  collectibles.push({
    id: 'grand-trophy-banana',
    x: finishPlatformX + 700,
    y: finishPlatformY - 90,
    baseY: finishPlatformY - 90,
    type: 'golden_banana',
    collected: false,
    floatOffset: 0,
  });

  return {
    config,
    platforms,
    vines,
    collectibles,
    enemies,
    finishX: finishPlatformX + 680,
  };
}
