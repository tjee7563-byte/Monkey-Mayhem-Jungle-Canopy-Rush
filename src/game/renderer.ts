import { Collectible, Enemy, Particle, Platform, Player, Projectile, Vine } from './types';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public render(
    player: Player,
    vines: Vine[],
    platforms: Platform[],
    collectibles: Collectible[],
    enemies: Enemy[],
    projectiles: Projectile[],
    particles: Particle[],
    cameraX: number,
    cameraY: number,
    viewportWidth: number,
    viewportHeight: number,
    skyColors: [string, string, string],
    hasRain: boolean = false,
    shakeX: number = 0,
    shakeY: number = 0
  ) {
    const ctx = this.ctx;
    ctx.save();

    // 1. Clear & Background Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, viewportHeight);
    skyGrad.addColorStop(0, skyColors[0]);
    skyGrad.addColorStop(0.6, skyColors[1]);
    skyGrad.addColorStop(1, skyColors[2]);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);

    // 2. Parallax Sky & Distant Mountains
    this.drawParallaxBackdrop(cameraX, viewportWidth, viewportHeight);

    // Apply Camera translation + Screenshake
    ctx.translate(-cameraX + shakeX, -cameraY + shakeY);

    // 3. Midground Canopy Trees & Godrays
    this.drawCanopyMidground(cameraX, viewportHeight);

    // 4. Draw Vines
    vines.forEach(vine => this.drawVine(vine));

    // 5. Draw Platforms
    platforms.forEach(platform => this.drawPlatform(platform));

    // 6. Draw Collectibles
    collectibles.forEach(item => {
      if (!item.collected) {
        this.drawCollectible(item);
      }
    });

    // 7. Draw Enemies
    enemies.forEach(enemy => this.drawEnemy(enemy));

    // 8. Draw Projectiles (Coconuts)
    projectiles.forEach(proj => this.drawProjectile(proj));

    // 9. Draw Player (Monkey)
    this.drawPlayer(player);

    // 10. Draw Particles
    particles.forEach(p => this.drawParticle(p));

    // 11. Weather (Rain / Sunrays)
    if (hasRain) {
      this.drawRain(cameraX, cameraY, viewportWidth, viewportHeight);
    }

    // 12. Danger Jungle Floor / River at Bottom
    this.drawJungleFloor(cameraX, viewportWidth);

    ctx.restore();
  }

  private drawParallaxBackdrop(camX: number, vw: number, vh: number) {
    const ctx = this.ctx;

    // Distant mountain layer (0.1x parallax)
    const distOffset = (camX * 0.08) % 600;
    ctx.fillStyle = 'rgba(20, 50, 40, 0.45)';
    ctx.beginPath();
    for (let x = -600; x < vw + 600; x += 300) {
      const peakX = x - distOffset;
      ctx.moveTo(peakX - 180, vh);
      ctx.lineTo(peakX, vh * 0.45);
      ctx.lineTo(peakX + 180, vh);
    }
    ctx.fill();

    // Secondary mid mountain layer (0.2x parallax)
    const midOffset = (camX * 0.18) % 400;
    ctx.fillStyle = 'rgba(15, 65, 45, 0.55)';
    ctx.beginPath();
    for (let x = -400; x < vw + 400; x += 220) {
      const peakX = x - midOffset;
      ctx.moveTo(peakX - 130, vh);
      ctx.lineTo(peakX, vh * 0.58);
      ctx.lineTo(peakX + 130, vh);
    }
    ctx.fill();

    // Subtle sunbeams / god rays
    ctx.save();
    const beamGrad = ctx.createLinearGradient(vw * 0.7, 0, vw * 0.2, vh);
    beamGrad.addColorStop(0, 'rgba(255, 235, 150, 0.14)');
    beamGrad.addColorStop(1, 'rgba(255, 235, 150, 0.0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(vw * 0.5, 0);
    ctx.lineTo(vw * 0.8, 0);
    ctx.lineTo(vw * 0.4, vh);
    ctx.lineTo(vw * 0.1, vh);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawCanopyMidground(camX: number, vh: number) {
    const ctx = this.ctx;
    const offset = Math.floor(camX * 0.35 / 450) * 450;
    ctx.fillStyle = 'rgba(10, 40, 25, 0.65)';

    for (let x = offset - 450; x < offset + 2000; x += 450) {
      // Giant silhouette baobab trunk
      ctx.fillRect(x + 120, 0, 75, vh + 500);

      // Lush foliage puffs
      ctx.beginPath();
      ctx.arc(x + 155, 180, 110, 0, Math.PI * 2);
      ctx.arc(x + 105, 230, 85, 0, Math.PI * 2);
      ctx.arc(x + 210, 220, 90, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawVine(vine: Vine) {
    const ctx = this.ctx;
    const endX = vine.anchorX + Math.sin(vine.angle) * vine.length;
    const endY = vine.anchorY + Math.cos(vine.angle) * vine.length;

    // Control point for a natural sagging rope curve
    const midX = (vine.anchorX + endX) / 2 + Math.sin(vine.angle) * 15;
    const midY = (vine.anchorY + endY) / 2 + 10;

    // Vine rope shadow / thickness
    ctx.beginPath();
    ctx.moveTo(vine.anchorX, vine.anchorY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.strokeStyle = '#2d471e';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Vine rope highlight
    ctx.beginPath();
    ctx.moveTo(vine.anchorX, vine.anchorY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.strokeStyle = '#5c8a2b';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Hanging leaf clusters along vine
    const leafStep = 0.28;
    for (let t = 0.2; t <= 0.85; t += leafStep) {
      const lx = (1 - t) * (1 - t) * vine.anchorX + 2 * (1 - t) * t * midX + t * t * endX;
      const ly = (1 - t) * (1 - t) * vine.anchorY + 2 * (1 - t) * t * midY + t * t * endY;
      const leafAngle = vine.angle + (t > 0.5 ? 0.6 : -0.6);

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(leafAngle);
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Anchor hook / wooden ring
    ctx.fillStyle = '#452b14';
    ctx.beginPath();
    ctx.arc(vine.anchorX, vine.anchorY, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPlatform(p: Platform) {
    const ctx = this.ctx;
    ctx.save();

    if (p.type === 'mushroom') {
      // Bouncy Spring Mushroom
      const spring = p.mushroomSpring || 0;
      const stemH = p.height + 15;
      const stemW = 28;
      const capH = p.height - spring * 10;

      // Stem
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(p.x + (p.width - stemW) / 2, p.y + 12, stemW, stemH);
      // Stem lines
      ctx.fillStyle = '#d1d5db';
      ctx.fillRect(p.x + (p.width - stemW) / 2 + 6, p.y + 12, 4, stemH);

      // Mushroom Bouncy Cap
      const capGrad = ctx.createLinearGradient(p.x, p.y - 15, p.x, p.y + capH);
      capGrad.addColorStop(0, '#f87171');
      capGrad.addColorStop(0.5, '#dc2626');
      capGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = capGrad;

      ctx.beginPath();
      ctx.ellipse(p.x + p.width / 2, p.y + 10, p.width / 2 + spring * 6, capH, 0, Math.PI, 0);
      ctx.fill();

      // White polka dots
      ctx.fillStyle = '#ffffff';
      [-0.25, 0, 0.25].forEach(ratio => {
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2 + ratio * (p.width * 0.7), p.y + 2, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (p.type === 'bamboo') {
      // Jointed Bamboo
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(p.x, p.y, p.width, p.height);

      ctx.fillStyle = '#84cc16';
      ctx.fillRect(p.x, p.y, p.width, 6);

      // Bamboo Segments
      ctx.fillStyle = '#365314';
      for (let bx = p.x + 35; bx < p.x + p.width; bx += 45) {
        ctx.fillRect(bx, p.y - 2, 5, p.height + 4);
      }
    } else if (p.type === 'stone') {
      // Ancient Temple Stone
      ctx.fillStyle = '#57534e';
      ctx.fillRect(p.x, p.y, p.width, p.height);

      // Inscribed border & moss
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 3;
      ctx.strokeRect(p.x + 2, p.y + 2, p.width - 4, p.height - 4);

      ctx.fillStyle = '#22c55e';
      ctx.fillRect(p.x, p.y, p.width, 5); // Moss on top
    } else {
      // Natural Tree Branch
      const branchGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
      branchGrad.addColorStop(0, '#78350f');
      branchGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = branchGrad;

      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.width, p.height, [8, 8, 4, 4]);
      ctx.fill();

      // Lush green moss top
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.width, 6, [6, 6, 0, 0]);
      ctx.fill();

      // Hanging foliage sprig
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(p.x + p.width * 0.3, p.y + p.height + 4, 8, 4, 0.4, 0, Math.PI * 2);
      ctx.ellipse(p.x + p.width * 0.7, p.y + p.height + 6, 10, 5, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawCollectible(item: Collectible) {
    const ctx = this.ctx;
    const y = item.baseY + Math.sin(item.floatOffset) * 6;
    ctx.save();
    ctx.translate(item.x, y);

    if (item.type === 'banana') {
      // Golden Banana
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, 14, -0.6, 2.2);
      ctx.arc(0, -6, 12, 2.0, -0.4, true);
      ctx.closePath();
      ctx.fill();

      // Stem & tip
      ctx.fillStyle = '#713f12';
      ctx.fillRect(-2, -14, 4, 5);
      ctx.fillRect(8, 7, 3, 3);

      // Banana Shine
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, -2, 10, 0.2, 1.8);
      ctx.stroke();
    } else if (item.type === 'golden_banana') {
      // Giant Starfruit / Golden Banana Cluster with Halo
      ctx.save();
      const haloGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 24);
      haloGrad.addColorStop(0, 'rgba(253, 224, 71, 0.85)');
      haloGrad.addColorStop(1, 'rgba(253, 224, 71, 0.0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Triple Banana Bunch
      [-0.4, 0, 0.4].forEach(rot => {
        ctx.save();
        ctx.rotate(rot);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, 15, -0.6, 2.2);
        ctx.arc(0, -6, 13, 2.0, -0.4, true);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
    } else if (item.type === 'coconut_refill') {
      // Coconut Ammo Basket
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();

      // Coconut eyes
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(-4, -3, 2.5, 0, Math.PI * 2);
      ctx.arc(4, -3, 2.5, 0, Math.PI * 2);
      ctx.arc(0, 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === 'heart_papaya') {
      // Heart Papaya Health Pickup
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.bezierCurveTo(-10, -8, -14, -2, 0, -14);
      ctx.bezierCurveTo(14, -2, 10, -8, 0, 5);
      ctx.fill();

      // Green stem
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-2, -17, 4, 5);
    }

    ctx.restore();
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(e.x, e.y);

    if (e.type === 'toucan') {
      // Animated Toucan
      ctx.scale(e.facing, 1);
      const wingFlap = Math.sin(e.stateTimer * 12) * 12;

      // Body (Black)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // White Chest
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(8, 2, 7, 0, Math.PI * 2);
      ctx.fill();

      // Wing
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(-4, -2 + wingFlap * 0.4, 12, 6, wingFlap * 0.05, 0, Math.PI * 2);
      ctx.fill();

      // Giant Rainbow Beak
      const beakGrad = ctx.createLinearGradient(12, 0, 28, 0);
      beakGrad.addColorStop(0, '#f97316');
      beakGrad.addColorStop(0.5, '#eab308');
      beakGrad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = beakGrad;
      ctx.beginPath();
      ctx.moveTo(12, -4);
      ctx.quadraticCurveTo(28, -2, 28, 5);
      ctx.lineTo(12, 5);
      ctx.closePath();
      ctx.fill();

      // Eye
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(9, -2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(9.5, -2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'bat') {
      // Jungle Bat
      const flap = Math.sin(e.stateTimer * 14) * 16;
      ctx.fillStyle = '#3b0764';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();

      // Wings
      ctx.fillStyle = '#581c87';
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.quadraticCurveTo(-26, -15 + flap, -32, flap * 0.5);
      ctx.quadraticCurveTo(-20, 12, -8, 4);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.quadraticCurveTo(26, -15 + flap, 32, flap * 0.5);
      ctx.quadraticCurveTo(20, 12, 8, 4);
      ctx.fill();

      // Glowing Red Eyes
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-3, -2, 2, 0, Math.PI * 2);
      ctx.arc(3, -2, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'python') {
      // Slithering Emerald Python
      const wiggle = Math.sin(e.stateTimer * 10) * 5;
      ctx.scale(e.facing, 1);

      // Snake Coils
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(-14, wiggle, 12, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(0, -wiggle, 12, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(14, wiggle, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(22, 0, 11, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Yellow eye & slit
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(24, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.fillRect(24, -4, 1, 3);

      // Flicking Forked Tongue
      if (Math.sin(e.stateTimer * 12) > 0.3) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(32, 1);
        ctx.lineTo(40, 1);
        ctx.lineTo(43, -2);
        ctx.moveTo(40, 1);
        ctx.lineTo(43, 4);
        ctx.stroke();
      }
    } else if (e.type === 'durian') {
      // Spiky Durian Fruit
      ctx.fillStyle = '#854d0e';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      // Spikes around body
      ctx.fillStyle = '#ca8a04';
      for (let a = 0; a < Math.PI * 2; a += 0.5) {
        const sx = Math.cos(a) * 18;
        const sy = Math.sin(a) * 18;
        const tipX = Math.cos(a) * 26;
        const tipY = Math.sin(a) * 26;
        ctx.beginPath();
        ctx.moveTo(sx - 3, sy);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(sx + 3, sy);
        ctx.fill();
      }
    } else if (e.type === 'temple_golem') {
      // ANCIENT SUN GOLEM / TEMPLE MONSTER
      ctx.scale(e.facing, 1);
      const isBoss = e.maxHealth >= 4;
      const scaleFactor = isBoss ? 1.6 : 1.0;
      ctx.scale(scaleFactor, scaleFactor);

      // Stone Block Body
      ctx.fillStyle = '#57534e';
      ctx.beginPath();
      ctx.roundRect(-22, -26, 44, 48, 8);
      ctx.fill();

      // Ancient Golden Inlay Carvings
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(-16, -20, 32, 36);

      // Blazing Solar Magma Core
      const coreGrad = ctx.createRadialGradient(0, -2, 2, 0, -2, 12);
      coreGrad.addColorStop(0, '#fef08a');
      coreGrad.addColorStop(0.5, '#f97316');
      coreGrad.addColorStop(1, '#dc2626');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, -2, 11, 0, Math.PI * 2);
      ctx.fill();

      // Stone Head & Fierce Slit Eyes
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.roundRect(-16, -42, 32, 20, 4);
      ctx.fill();

      // Glowing fiery eyes
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-10, -34, 6, 4);
      ctx.fillRect(4, -34, 6, 4);

      // Heavy Rock Fists
      const fistSwing = Math.sin(e.stateTimer * 5) * 8;
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.arc(-26, 6 + fistSwing, 10, 0, Math.PI * 2);
      ctx.arc(26, 6 - fistSwing, 10, 0, Math.PI * 2);
      ctx.fill();

      // Boss Health Bar for Sol-Titan
      if (isBoss) {
        ctx.save();
        ctx.scale(e.facing, 1);
        const barW = 110;
        const barH = 10;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(-barW / 2, -65, barW, barH);
        const hpRatio = Math.max(0, e.health / e.maxHealth);
        ctx.fillStyle = hpRatio > 0.4 ? '#f59e0b' : '#ef4444';
        ctx.fillRect(-barW / 2 + 1, -64, (barW - 2) * hpRatio, barH - 2);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(e.name || 'SOL-TITAN: SUN GOLEM', 0, -70);
        ctx.restore();
      }
    } else if (e.type === 'python_boss') {
      // FANGOR: THE ANCIENT VENOM SERPENT (Chapter 1 Boss)
      ctx.scale(e.facing, 1);
      const isBoss = true;
      const s = 1.5;
      ctx.scale(s, s);

      const slither = Math.sin(e.stateTimer * 8) * 8;

      // Heavy Coiled Venom Serpent Body
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.ellipse(-28, slither, 20, 15, 0, 0, Math.PI * 2);
      ctx.ellipse(-10, -slither, 22, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(12, slither * 0.5, 24, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Venom scales pattern
      ctx.fillStyle = '#047857';
      ctx.beginPath();
      ctx.arc(-10, -slither, 10, 0, Math.PI * 2);
      ctx.arc(12, slither * 0.5, 12, 0, Math.PI * 2);
      ctx.fill();

      // Giant Serpent Head
      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      ctx.ellipse(32, -4, 22, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Venom Horned Crest
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.moveTo(20, -18);
      ctx.lineTo(28, -30);
      ctx.lineTo(36, -18);
      ctx.lineTo(44, -30);
      ctx.lineTo(48, -16);
      ctx.closePath();
      ctx.fill();

      // Glowing Toxic Red Eyes
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(36, -8, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(36, -10, 1.5, 5);

      // Open Jaw with Dripping Poison Fangs
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(42, 2);
      ctx.lineTo(45, 12);
      ctx.lineTo(48, 2);
      ctx.fill();

      // Venom Drip
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(45, 14 + (Math.sin(e.stateTimer * 10) * 3), 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Boss Health Bar for Fangor
      ctx.save();
      ctx.scale(e.facing, 1);
      const barW = 110;
      const barH = 10;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(-barW / 2, -55, barW, barH);
      const hpRatio = Math.max(0, e.health / e.maxHealth);
      ctx.fillStyle = hpRatio > 0.4 ? '#22c55e' : '#ef4444';
      ctx.fillRect(-barW / 2 + 1, -54, (barW - 2) * hpRatio, barH - 2);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.name || 'FANGOR: VENOM SERPENT', 0, -60);
      ctx.restore();
    } else if (e.type === 'gorilla_boss') {
      // SILVERBACK TITAN BOSS
      ctx.scale(e.facing, 1);

      // Massive dark muscular body
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.ellipse(0, 0, 48, 42, 0, 0, Math.PI * 2);
      ctx.fill();

      // Silverback fur cape
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.ellipse(-15, -12, 32, 22, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Massive arms
      const armSwing = Math.sin(e.stateTimer * 4) * 12;
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.ellipse(32, 15 + armSwing, 22, 34, 0.4, 0, Math.PI * 2);
      ctx.ellipse(-32, 15 - armSwing, 22, 34, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Head & Jaw
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(15, -30, 24, 0, Math.PI * 2);
      ctx.fill();

      // Fierce face plate
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.roundRect(15, -34, 18, 22, 6);
      ctx.fill();

      // Glowing furious eyes
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(20, -32, 3, 0, Math.PI * 2);
      ctx.arc(28, -32, 3, 0, Math.PI * 2);
      ctx.fill();

      // Golden Crown / Headpiece
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(8, -50);
      ctx.lineTo(15, -60);
      ctx.lineTo(22, -50);
      ctx.lineTo(29, -60);
      ctx.lineTo(36, -50);
      ctx.lineTo(36, -44);
      ctx.lineTo(8, -44);
      ctx.closePath();
      ctx.fill();

      // Boss Health Bar above head
      ctx.save();
      ctx.scale(e.facing, 1); // unflip text & bar
      const barW = 100;
      const barH = 10;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(-barW / 2, -75, barW, barH);
      const hpRatio = Math.max(0, e.health / e.maxHealth);
      ctx.fillStyle = hpRatio > 0.4 ? '#22c55e' : '#ef4444';
      ctx.fillRect(-barW / 2 + 1, -74, (barW - 2) * hpRatio, barH - 2);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.name || 'SILVERBACK TITAN', 0, -80);
      ctx.restore();
    } else if (e.type === 'wild_boar') {
      // RAZORBACK JUNGLE BOAR
      ctx.scale(e.facing, 1);
      const isCharging = e.state === 'charge';
      const gallop = Math.sin(e.stateTimer * (isCharging ? 24 : 12)) * 3;

      // Heavy muscular bristled body
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, gallop, e.radius * 0.95, e.radius * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bristled spine ridge
      ctx.fillStyle = '#271005';
      ctx.beginPath();
      ctx.moveTo(-e.radius * 0.7, -e.radius * 0.5 + gallop);
      ctx.lineTo(e.radius * 0.3, -e.radius * 0.8 + gallop);
      ctx.lineTo(e.radius * 0.6, -e.radius * 0.4 + gallop);
      ctx.lineTo(-e.radius * 0.2, -e.radius * 0.3 + gallop);
      ctx.closePath();
      ctx.fill();

      // Snout & Head
      ctx.fillStyle = '#5c2207';
      ctx.beginPath();
      ctx.ellipse(e.radius * 0.65, -2 + gallop, e.radius * 0.45, e.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Snout plate
      ctx.fillStyle = '#854d0e';
      ctx.beginPath();
      ctx.ellipse(e.radius * 1.0, -1 + gallop, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nostril
      ctx.fillStyle = '#0f0702';
      ctx.beginPath();
      ctx.arc(e.radius * 1.0, -2 + gallop, 2, 0, Math.PI * 2);
      ctx.fill();

      // Sharp Curved Ivory Tusks
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(e.radius * 0.75, 4 + gallop);
      ctx.quadraticCurveTo(e.radius * 1.05, 7 + gallop, e.radius * 1.05, -7 + gallop);
      ctx.lineTo(e.radius * 0.85, 2 + gallop);
      ctx.closePath();
      ctx.fill();

      // Furious Glowing Red Eyes
      ctx.fillStyle = isCharging ? '#ef4444' : '#f97316';
      ctx.beginPath();
      ctx.arc(e.radius * 0.45, -6 + gallop, isCharging ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();

      // Hooves
      ctx.fillStyle = '#1c0a02';
      const legOffset = Math.sin(e.stateTimer * (isCharging ? 24 : 12)) * 6;
      ctx.fillRect(-e.radius * 0.6, e.radius * 0.4 + legOffset, 6, 8);
      ctx.fillRect(e.radius * 0.3, e.radius * 0.4 - legOffset, 6, 8);
    } else if (e.type === 'venom_frog') {
      // POISON DART TREE FROG / CHAMELEON
      ctx.scale(e.facing, 1);
      const throatPuff = e.isTelegraphing ? 8 + Math.sin(e.stateTimer * 16) * 4 : 2;

      // Vivid Turquoise/Cyan Body
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Neon Lime/Yellow Poison Back Pattern
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.ellipse(-3, -3, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Black Poison Dart Spots
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-8, -2, 2.5, 0, Math.PI * 2);
      ctx.arc(-1, -5, 2.5, 0, Math.PI * 2);
      ctx.arc(4, -3, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Bulging Glossy Eye with horizontal slit
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(8, -8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(5, -9, 6, 2);

      // Inflated Glowing Toxic Throat Sac
      const sacGrad = ctx.createRadialGradient(10, 4, 1, 10, 4, 6 + throatPuff);
      sacGrad.addColorStop(0, '#fde047');
      sacGrad.addColorStop(0.6, '#ea580c');
      sacGrad.addColorStop(1, '#dc2626');
      ctx.fillStyle = sacGrad;
      ctx.beginPath();
      ctx.arc(10, 4, 4 + throatPuff, 0, Math.PI * 2);
      ctx.fill();

      // Webbed suction-cup feet
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(-10, 10, 3, 0, Math.PI * 2);
      ctx.arc(10, 10, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'sun_harpy') {
      // WINGED SOLAR HARPY / TEMPLE GARGOYLE
      ctx.scale(e.facing, 1);
      const wingFlap = Math.sin(e.stateTimer * 10) * 16;

      // Fiery Wing Spans
      const wingGrad = ctx.createLinearGradient(-25, -20, 25, 10);
      wingGrad.addColorStop(0, '#f59e0b');
      wingGrad.addColorStop(0.5, '#ea580c');
      wingGrad.addColorStop(1, '#7c2d12');
      ctx.fillStyle = wingGrad;

      // Left Wing
      ctx.beginPath();
      ctx.moveTo(-4, -6);
      ctx.quadraticCurveTo(-22, -26 + wingFlap, -30, -8 + wingFlap * 0.5);
      ctx.quadraticCurveTo(-18, 6, -6, 2);
      ctx.fill();

      // Right Wing
      ctx.beginPath();
      ctx.moveTo(4, -6);
      ctx.quadraticCurveTo(22, -26 + wingFlap, 30, -8 + wingFlap * 0.5);
      ctx.quadraticCurveTo(18, 6, 6, 2);
      ctx.fill();

      // Golden Stone Body
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Solar Crest
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-6, -14);
      ctx.lineTo(0, -24);
      ctx.lineTo(6, -14);
      ctx.closePath();
      ctx.fill();

      // Beak & Head
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(8, -8, 8, 0, Math.PI * 2);
      ctx.fill();

      // Sharp golden beak
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(14, -10);
      ctx.lineTo(24, -6);
      ctx.lineTo(14, -4);
      ctx.closePath();
      ctx.fill();

      // Glowing Amber Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(12, -9, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(13, -9, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'temple_skeleton') {
      // CURSED AZTEC SKELETON SPEARMAN
      ctx.scale(e.facing, 1);
      const stride = Math.sin(e.stateTimer * 8) * 4;

      // Bone Ribcage & Spine
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(0, 12);
      ctx.stroke();

      ctx.lineWidth = 2;
      for (let r = -6; r <= 6; r += 4) {
        ctx.beginPath();
        ctx.moveTo(-7, r);
        ctx.lineTo(7, r);
        ctx.stroke();
      }

      // Skull Head
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, -18, 9, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Crimson Eye Sockets
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(2, -19, 2, 0, Math.PI * 2);
      ctx.arc(6, -19, 2, 0, Math.PI * 2);
      ctx.fill();

      // Ancient Golden Feathered Headdress
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(-10, -24);
      ctx.lineTo(-4, -34);
      ctx.lineTo(0, -25);
      ctx.lineTo(4, -36);
      ctx.lineTo(8, -25);
      ctx.lineTo(12, -32);
      ctx.lineTo(10, -22);
      ctx.closePath();
      ctx.fill();

      // Obsidian Spear held in hand
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-12, 12);
      ctx.lineTo(26, -16 + stride);
      ctx.stroke();

      // Obsidian Spearhead
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(26, -16 + stride);
      ctx.lineTo(34, -22 + stride);
      ctx.lineTo(28, -12 + stride);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'fire_scarab') {
      // SCUTTLING MAGMA SCARAB
      ctx.scale(e.facing, 1);
      const wiggle = Math.sin(e.stateTimer * 20) * 2;

      // Metallic ruby/gold beetle shell
      const scarabGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 14);
      scarabGrad.addColorStop(0, '#fef08a');
      scarabGrad.addColorStop(0.4, '#ea580c');
      scarabGrad.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = scarabGrad;
      ctx.beginPath();
      ctx.ellipse(0, wiggle, 15, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wing casing line
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-12, wiggle);
      ctx.lineTo(10, wiggle);
      ctx.stroke();

      // Head & glowing eyes
      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.arc(12, wiggle, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(13, -2 + wiggle, 1.5, 0, Math.PI * 2);
      ctx.arc(13, 2 + wiggle, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Scuttling multi-legs
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 2;
      const legKick = Math.sin(e.stateTimer * 24) * 4;
      for (let l = -8; l <= 6; l += 7) {
        ctx.beginPath();
        ctx.moveTo(l, -8);
        ctx.lineTo(l - 3, -13 + legKick);
        ctx.moveTo(l, 8);
        ctx.lineTo(l - 3, 13 - legKick);
        ctx.stroke();
      }
    } else if (e.type === 'savage_baboon') {
      // SAVAGE TRIBAL BABOON / MOUNTAIN WARRIOR
      ctx.scale(e.facing, 1);
      const chestBeat = Math.sin(e.stateTimer * 12) * 5;

      // Muscular Slate Fur Body
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tribal White War Paint on chest
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-10, -6);
      ctx.lineTo(0, 2);
      ctx.lineTo(10, -6);
      ctx.moveTo(-8, 4);
      ctx.lineTo(0, 10);
      ctx.lineTo(8, 4);
      ctx.stroke();

      // Muscular Arms
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(-14, 4 + chestBeat, 7, 14, 0.3, 0, Math.PI * 2);
      ctx.ellipse(14, 4 - chestBeat, 7, 14, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Head with grey mane
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(8, -18, 12, 0, Math.PI * 2);
      ctx.fill();

      // Mandrill Bright Red & Cyan Muzzle
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.ellipse(14, -16, 7, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(17, -16, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // White fangs
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(16, -13, 2, 4);
      ctx.fillRect(19, -13, 2, 4);

      // Furious Amber Eyes
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(10, -21, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'storm_hawk') {
      // ELECTRIC THUNDER WYVERN / STORM HAWK
      ctx.scale(e.facing, 1);
      const wingFlap = Math.sin(e.stateTimer * 12) * 16;

      // Crackling Electric Aura
      if (Math.sin(e.stateTimer * 18) > 0.2) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Electric Cyan Feathered Wings
      const hawkWingGrad = ctx.createLinearGradient(-26, -10, 26, 10);
      hawkWingGrad.addColorStop(0, '#0284c7');
      hawkWingGrad.addColorStop(0.6, '#38bdf8');
      hawkWingGrad.addColorStop(1, '#fde047');
      ctx.fillStyle = hawkWingGrad;

      ctx.beginPath();
      ctx.moveTo(-6, -4);
      ctx.quadraticCurveTo(-24, -28 + wingFlap, -32, -6 + wingFlap * 0.5);
      ctx.quadraticCurveTo(-16, 8, -4, 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(6, -4);
      ctx.quadraticCurveTo(24, -28 + wingFlap, 32, -6 + wingFlap * 0.5);
      ctx.quadraticCurveTo(16, 8, 4, 2);
      ctx.fill();

      // Sleek Electric Body
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lightning Bolt Head Crest
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(4, -24);
      ctx.lineTo(8, -14);
      ctx.lineTo(14, -20);
      ctx.lineTo(10, -8);
      ctx.closePath();
      ctx.fill();

      // Sharp raptor beak
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(12, -4);
      ctx.lineTo(22, 0);
      ctx.lineTo(12, 4);
      ctx.closePath();
      ctx.fill();

      // Cyan glowing eye
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(8, -4, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'lava_crab') {
      // ARMORED BASALT MOLTEN CRAB
      ctx.scale(e.facing, 1);
      const clawSnap = Math.sin(e.stateTimer * 12) * 5;

      // Obsidian Basalt Carapace
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Molten Lava Veins on Shell
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.lineTo(-2, 4);
      ctx.lineTo(8, -5);
      ctx.moveTo(-6, 6);
      ctx.lineTo(4, 8);
      ctx.stroke();

      // Spiky Basalt Shell Horns
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.moveTo(-14, -6);
      ctx.lineTo(-20, -12);
      ctx.lineTo(-10, -10);
      ctx.moveTo(14, -6);
      ctx.lineTo(20, -12);
      ctx.lineTo(10, -10);
      ctx.fill();

      // Massive Molten Pincers
      const pincerGrad = ctx.createLinearGradient(12, 0, 26, 0);
      pincerGrad.addColorStop(0, '#ea580c');
      pincerGrad.addColorStop(1, '#facc15');
      ctx.fillStyle = pincerGrad;

      // Upper Claw
      ctx.beginPath();
      ctx.arc(16, -8 - clawSnap, 7, 0, Math.PI * 2);
      ctx.fill();
      // Lower Claw
      ctx.beginPath();
      ctx.arc(16, 6 + clawSnap, 7, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Magma Eye stalks
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(4, -12, 2.5, 0, Math.PI * 2);
      ctx.arc(10, -12, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mini Health Pips / Banner for Tough & Elite Monsters
    const isMainBoss = e.type === 'gorilla_boss' || e.type === 'python_boss' || (e.type === 'temple_golem' && e.maxHealth >= 4);
    if (!isMainBoss && e.maxHealth > 1) {
      ctx.save();
      ctx.scale(e.facing, 1); // Unflip text/bars
      const barW = Math.max(28, e.maxHealth * 12);
      const barH = 5;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(-barW / 2, -e.radius - 14, barW, barH);
      const hpRatio = Math.max(0, e.health / e.maxHealth);
      ctx.fillStyle = hpRatio > 0.4 ? '#22c55e' : '#ef4444';
      ctx.fillRect(-barW / 2 + 1, -e.radius - 13, (barW - 2) * hpRatio, barH - 2);

      if (e.name) {
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(e.name, 0, -e.radius - 18);
      }
      ctx.restore();
    }

    // Armored spike badge warning
    if (e.isArmored) {
      ctx.save();
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🛡️', 0, e.radius + 12);
      ctx.restore();
    }

    // Danger telegraph indicator
    if (e.isTelegraphing) {
      ctx.save();
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️', 0, -e.radius - 12);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawProjectile(proj: Projectile) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(proj.x, proj.y);
    ctx.rotate(proj.rotation);

    if (proj.type === 'seed') {
      // Hostile thorny seed needle shot by Toucan
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(0, 0, proj.radius * 1.5, proj.radius * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.type === 'venom') {
      // Hostile toxic acid glob shot by Fangor
      const acidGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, proj.radius);
      acidGrad.addColorStop(0, '#bef264');
      acidGrad.addColorStop(0.7, '#16a34a');
      acidGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = acidGrad;
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
      ctx.fill();

      // Acid bubble
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-2, -2, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.type === 'fireball') {
      // Hostile spinning solar fireball from Sun Golem
      const fireGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, proj.radius * 1.4);
      fireGrad.addColorStop(0, '#ffffff');
      fireGrad.addColorStop(0.4, '#fde047');
      fireGrad.addColorStop(0.8, '#ea580c');
      fireGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius * 1.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.type === 'boulder') {
      // Heavy stone boulder hurled by Titan
      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-proj.radius * 0.6, 0);
      ctx.lineTo(proj.radius * 0.4, -proj.radius * 0.4);
      ctx.lineTo(proj.radius * 0.2, proj.radius * 0.5);
      ctx.stroke();
    } else if (proj.type === 'spear') {
      // Cursed Aztec Spear
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-proj.radius * 1.6, 0);
      ctx.lineTo(proj.radius * 1.6, 0);
      ctx.stroke();

      // Obsidian Arrowhead
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(proj.radius * 1.6, -4);
      ctx.lineTo(proj.radius * 2.4, 0);
      ctx.lineTo(proj.radius * 1.6, 4);
      ctx.closePath();
      ctx.fill();

      // Feather Fletching
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-proj.radius * 1.6, -4);
      ctx.lineTo(-proj.radius * 2.0, 0);
      ctx.lineTo(-proj.radius * 1.6, 4);
      ctx.closePath();
      ctx.fill();
    } else if (proj.type === 'lightning_orb') {
      // Electric Lightning Orb
      const zapGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, proj.radius * 1.3);
      zapGrad.addColorStop(0, '#ffffff');
      zapGrad.addColorStop(0.4, '#38bdf8');
      zapGrad.addColorStop(0.8, '#0284c7');
      zapGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = zapGrad;
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Spark arcs
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-proj.radius * 0.7, 0);
      ctx.lineTo(0, -proj.radius * 0.7);
      ctx.lineTo(proj.radius * 0.7, 0);
      ctx.lineTo(0, proj.radius * 0.7);
      ctx.closePath();
      ctx.stroke();
    } else if (proj.type === 'magma_rock') {
      // Volcanic Magma Rock
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
      ctx.fill();

      // Molten Cracks
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-proj.radius * 0.7, -proj.radius * 0.3);
      ctx.lineTo(0, proj.radius * 0.4);
      ctx.lineTo(proj.radius * 0.6, -proj.radius * 0.4);
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Player Coconut projectile
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
      ctx.fill();

      // Coconut dimples
      ctx.fillStyle = '#3b1c04';
      ctx.beginPath();
      ctx.arc(-3, -2, 2, 0, Math.PI * 2);
      ctx.arc(3, -2, 2, 0, Math.PI * 2);
      ctx.arc(0, 3, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawPlayer(p: Player) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);

    // Apply squash and stretch
    ctx.scale(p.squashX, p.squashY);

    // If swinging, orient body with the swing angle; else orient with acrobatic rotation
    if (p.isSwinging) {
      ctx.rotate(p.swingAngle * 0.85);
    } else if (p.rotation !== 0) {
      ctx.rotate(p.rotation);
    }

    // Invulnerability flashing
    if (p.invulnerableTimer > 0 && Math.floor(p.invulnerableTimer * 15) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // FEVER MODE AURA
    if (p.isFever) {
      ctx.save();
      const auraGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 38);
      auraGrad.addColorStop(0, 'rgba(250, 204, 21, 0.7)');
      auraGrad.addColorStop(0.6, 'rgba(249, 115, 22, 0.4)');
      auraGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // GLIDER PALM LEAF
    if (p.isGliding) {
      ctx.save();
      ctx.translate(0, -32);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(0, 0, 36, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Leaf ribs
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-36, 0);
      ctx.lineTo(36, 0);
      ctx.stroke();

      // String lines to monkey hands
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-16, 6);
      ctx.lineTo(-8, 22);
      ctx.moveTo(16, 6);
      ctx.lineTo(8, 22);
      ctx.stroke();
      ctx.restore();
    }

    // Direction flip
    ctx.scale(p.facing, 1);

    // PREHENSILE MONKEY TAIL
    ctx.save();
    const tailCurl = Math.sin(p.animTimer * 6) * 15;
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, 6);
    ctx.bezierCurveTo(-24, 8 + tailCurl, -30, -10 + tailCurl * 0.5, -22, -18);
    ctx.stroke();
    ctx.restore();

    // MONKEY BODY (Chubby & Warm Brown)
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(0, 4, 15, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Peach Belly Patch
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.ellipse(3, 6, 8, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // MONKEY HEAD
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.arc(3, -12, 13, 0, Math.PI * 2);
    ctx.fill();

    // Big Floppy Ears
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.arc(-8, -14, 5, 0, Math.PI * 2);
    ctx.arc(14, -14, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(-8, -14, 2.5, 0, Math.PI * 2);
    ctx.arc(14, -14, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Peach Muzzle
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.ellipse(7, -8, 7.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose & Cheerful Smile
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(8, -10, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(7.5, -7, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Expressive Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4, -15, 3.5, 0, Math.PI * 2);
    ctx.arc(10, -15, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(5, -15, 1.8, 0, Math.PI * 2);
    ctx.arc(11, -15, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Eye sparkles
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4.5, -16, 0.8, 0, Math.PI * 2);
    ctx.arc(10.5, -16, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // ARMS & HANDS
    if (p.isSwinging) {
      // Arms reaching up to hold vine
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(-4, -22);
      ctx.moveTo(4, 0);
      ctx.lineTo(4, -22);
      ctx.stroke();

      // Cute hands gripping vine
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(-4, -23, 3, 0, Math.PI * 2);
      ctx.arc(4, -23, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Natural running / jumping arms
      const armSwing = Math.sin(p.animTimer * 10) * 10;
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-2, 2);
      ctx.lineTo(-10 + armSwing, 10 - armSwing * 0.3);
      ctx.stroke();

      // Front arm holding coconut if has ammo
      ctx.beginPath();
      ctx.moveTo(4, 2);
      ctx.lineTo(12 - armSwing, 8 + armSwing * 0.3);
      ctx.stroke();

      if (p.coconuts > 0) {
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(15 - armSwing, 8 + armSwing * 0.3, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawParticle(p: Particle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.rotation) ctx.rotate(p.rotation);
    ctx.globalAlpha = Math.max(0, p.alpha);

    if (p.shape === 'text' && p.text) {
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color || '#facc15';
      ctx.fillText(p.text, 0, 0);
    } else if (p.shape === 'leaf') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 1.6, p.size * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'sparkle') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size * 0.3, -p.size * 0.3);
      ctx.lineTo(p.size, 0);
      ctx.lineTo(p.size * 0.3, p.size * 0.3);
      ctx.lineTo(0, p.size);
      ctx.lineTo(-p.size * 0.3, p.size * 0.3);
      ctx.lineTo(-p.size, 0);
      ctx.lineTo(-p.size * 0.3, -p.size * 0.3);
      ctx.closePath();
      ctx.fill();
    } else if (p.shape === 'shard') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(-p.size, -p.size / 2);
      ctx.lineTo(p.size, 0);
      ctx.lineTo(-p.size / 2, p.size);
      ctx.closePath();
      ctx.fill();
    } else if (p.shape === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawRain(camX: number, camY: number, vw: number, vh: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.35)';
    ctx.lineWidth = 1.4;

    const time = Date.now() * 0.003;
    for (let i = 0; i < 40; i++) {
      const rx = camX + ((i * 47 + time * 600) % vw);
      const ry = camY + ((i * 31 + time * 900) % vh);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 8, ry + 24);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawJungleFloor(camX: number, vw: number) {
    const ctx = this.ctx;
    const waterY = 1050;

    // Murky jungle water / fog abyss
    const floorGrad = ctx.createLinearGradient(0, waterY, 0, waterY + 400);
    floorGrad.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
    floorGrad.addColorStop(1, '#020617');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(camX - 300, waterY, vw + 600, 500);

    // Glowing jungle water waves
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 3;
    const waveTime = Date.now() * 0.003;
    ctx.beginPath();
    for (let x = camX - 100; x < camX + vw + 100; x += 30) {
      const wy = waterY + Math.sin(x * 0.03 + waveTime) * 6;
      if (x === camX - 100) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }
}
