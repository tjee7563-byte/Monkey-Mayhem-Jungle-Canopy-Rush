/**
 * Constants & physics parameters for Monke Mayhem
 */

export const PHYSICS = {
  GRAVITY: 960,
  MAX_FALL_SPEED: 700,
  GLIDE_FALL_SPEED: 110,
  GLIDE_HORIZONTAL_SPEED: 320,
  RUN_SPEED: 360,
  RUN_ACCEL: 1800,
  AIR_ACCEL: 900,
  FRICTION: 0.85,
  AIR_FRICTION: 0.96,
  JUMP_FORCE: -560,
  COYOTE_TIME: 0.12,
  JUMP_BUFFER_TIME: 0.14,
  VINE_GRAB_RADIUS: 65,
  VINE_PULL_DAMPING: 0.992,
  VINE_SWING_IMPULSE: 3.2,
  VINE_LAUNCH_BOOST: 1.35,
  MUSHROOM_BOUNCE_VY: -760,
  COCONUT_SPEED: 620,
  COCONUT_LIFETIME: 3.0,
  FEVER_DURATION: 9.0,
  INVULNERABLE_TIME: 1.6,
  HITSTOP_TIME: 0.05,
  WATER_SURFACE_Y: 1100, // Hazard bottom
};

export const LEVELS = [
  {
    id: 1,
    name: "Emerald Canopy",
    subtitle: "Razorback Boars, Poison Spitters, Tree Vipers & Fangor Serpent!",
    length: 6500,
    skyColors: ["#0f281e", "#1b4d3e", "#2e7d32"] as [string, string, string],
    hasRain: false,
    bossAtEnd: true,
  },
  {
    id: 2,
    name: "Temple of the Sun Sun",
    subtitle: "Solar Harpies, Cursed Spearmen, Fire Scarabs & Sol-Titan!",
    length: 7500,
    skyColors: ["#2d1b0c", "#5c3317", "#8c501e"] as [string, string, string],
    hasRain: false,
    bossAtEnd: true,
  },
  {
    id: 3,
    name: "Thunder Peak & Silverback Titan",
    subtitle: "Savage Baboons, Storm Wyverns, Lava Crabs & the Silverback King!",
    length: 8000,
    skyColors: ["#1a102f", "#331f4a", "#542a68"] as [string, string, string],
    hasRain: true,
    bossAtEnd: true,
  },
];
