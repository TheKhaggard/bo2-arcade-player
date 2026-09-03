import { ATTACKS, CHARACTERS, ROUND, VIEWPORT } from "./config.js";

const GRAVITY = 1480;
const ARENA_LEFT = 82;
const ARENA_RIGHT = VIEWPORT.width - 82;
const MIN_DISTANCE = 86;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error(`Unable to load image: ${source}`)), { once: true });
    image.src = source;
  });
}

function emptyCommand() {
  return { left: false, right: false, down: false, upPressed: false, block: false, attack: null };
}

class Fighter {
  constructor(character, player, image, x) {
    this.character = character;
    this.player = player;
    this.image = image;
    this.wins = 0;
    this.reset(x);
  }

  reset(x) {
    this.x = x;
    this.y = VIEWPORT.floorY;
    this.vx = 0;
    this.vy = 0;
    this.facing = this.player === 0 ? 1 : -1;
    this.health = 100;
    this.attack = null;
    this.hurtTimer = 0;
    this.blocking = false;
    this.crouching = false;
    this.ko = false;
    this.victory = false;
    this.walkTime = 0;
    this.flashTimer = 0;
  }

  get airborne() {
    return this.y < VIEWPORT.floorY - 0.5;
  }

  get locked() {
    return this.ko || this.victory || this.hurtTimer > 0 || Boolean(this.attack);
  }

  startAttack(type) {
    if (this.locked || this.airborne || this.blocking) return false;
    this.attack = { type, data: ATTACKS[type], elapsed: 0, hit: false };
    this.vx = 0;
    return true;
  }

  takeHit(attack, blocked, direction) {
    const damage = attack.damage;
    const appliedDamage = blocked ? Math.max(1, damage * 0.14) : damage;
    this.health = clamp(this.health - appliedDamage, 0, 100);
    this.attack = null;
    this.blocking = blocked;
    this.hurtTimer = blocked ? 0.1 : attack.hitstun;
    this.flashTimer = blocked ? 0.04 : 0.09;
    this.vx = direction * attack.knockback * (blocked ? 0.35 : 1);
    if (this.health <= 0) {
      this.ko = true;
      this.blocking = false;
      this.hurtTimer = 99;
      this.vx = direction * 70;
    }
    return appliedDamage;
  }

  update(dt, command, canFight) {
    this.walkTime += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (!this.ko) this.hurtTimer = Math.max(0, this.hurtTimer - dt);

    if (this.attack) {
      this.attack.elapsed += dt;
      if (this.attack.elapsed >= this.attack.data.duration) this.attack = null;
    }

    if (this.ko) {
      this.vx *= Math.pow(0.002, dt);
    } else if (canFight && !this.locked) {
      this.blocking = command.block && !this.airborne;
      this.crouching = command.down && !this.airborne;

      if (!this.blocking && !this.crouching) {
        const direction = Number(command.right) - Number(command.left);
        this.vx = direction * this.character.speed;
        if (direction === 0) this.vx *= Math.pow(0.0001, dt);
        if (command.upPressed && !this.airborne) {
          this.vy = -this.character.jump;
          this.vx = direction * this.character.speed * 0.72;
        }
        if (command.attack) this.startAttack(command.attack);
      } else {
        this.vx = 0;
      }
    } else if (!this.airborne && !this.attack && this.hurtTimer <= 0) {
      this.vx *= Math.pow(0.001, dt);
      this.blocking = false;
      this.crouching = false;
    }

    this.x += this.vx * dt;
    if (this.airborne || this.vy < 0) {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y >= VIEWPORT.floorY) {
        this.y = VIEWPORT.floorY;
        this.vy = 0;
      }
    }
    this.x = clamp(this.x, ARENA_LEFT, ARENA_RIGHT);
  }

  spriteFrame() {
    if (this.victory) return 7;
    if (this.ko || this.hurtTimer > 0) return 6;
    if (this.attack) return this.attack.data.frame;
    if (this.blocking || this.crouching) return 5;
    if (Math.abs(this.vx) > 12) return 2;
    return Math.floor(this.walkTime * 2.4) % 2;
  }
}

class AIController {
  constructor() {
    this.reset();
  }

  reset() {
    this.decisionTimer = 0;
    this.guardTimer = 0;
    this.reactionTimer = 0;
    this.move = 0;
    this.comboQueue = [];
  }

  command(dt, self, opponent, roundNumber = 1) {
    this.decisionTimer -= dt;
    this.guardTimer = Math.max(0, this.guardTimer - dt);
    this.reactionTimer = Math.max(0, this.reactionTimer - dt);
    const distance = Math.abs(opponent.x - self.x);
    const towardOpponent = Math.sign(opponent.x - self.x);
    const difficulty = clamp(0.68 + roundNumber * 0.07, 0.72, 0.91);

    if (self.locked) return emptyCommand();

    const incomingAttack = opponent.attack
      && opponent.attack.elapsed < opponent.attack.data.windup + opponent.attack.data.active
      && distance < opponent.attack.data.reach + 48;
    if (incomingAttack && this.reactionTimer <= 0 && Math.random() < difficulty) {
      this.guardTimer = 0.2 + Math.random() * 0.24;
      this.reactionTimer = 0.11 + Math.random() * 0.08;
      this.move = 0;
      this.comboQueue.length = 0;
    }

    let attack = null;
    let jump = false;
    if (this.decisionTimer <= 0) {
      this.decisionTimer = Math.max(0.065, 0.16 - roundNumber * 0.012) + Math.random() * 0.1;
      const lowHealth = self.health < 28;
      const hasHealthLead = self.health > opponent.health + 24;

      if (this.comboQueue.length && distance < 150 && !opponent.ko) {
        attack = this.comboQueue.shift();
        this.move = 0;
      } else if (opponent.airborne && distance < 145) {
        this.move = 0;
        attack = Math.random() < 0.62 ? "highPunch" : "highKick";
      } else if (distance > 205) {
        this.move = towardOpponent;
        jump = Math.random() < 0.12 + roundNumber * 0.015;
      } else if (distance > 122) {
        this.move = towardOpponent;
        if (Math.random() < 0.22 + roundNumber * 0.025) attack = "highKick";
      } else if (distance < 66) {
        if ((lowHealth || hasHealthLead) && Math.random() < 0.52) {
          this.move = -towardOpponent;
          this.guardTimer = 0.12 + Math.random() * 0.2;
        } else {
          this.move = 0;
          attack = Math.random() < 0.58 ? "lowPunch" : "lowKick";
          if (Math.random() < 0.34 + roundNumber * 0.03) this.comboQueue.push("highPunch", "highKick");
        }
      } else {
        this.move = 0;
        const roll = Math.random();
        if (opponent.blocking && roll < 0.46) attack = "lowKick";
        else if (opponent.crouching && roll < 0.64) attack = "highKick";
        else if (roll < 0.25) attack = "lowPunch";
        else if (roll < 0.48) attack = "highPunch";
        else if (roll < 0.7) attack = "lowKick";
        else if (roll < 0.9) attack = "highKick";
        else this.guardTimer = 0.25 + Math.random() * 0.2;
      }
    }

    return {
      left: this.move < 0,
      right: this.move > 0,
      down: false,
      upPressed: jump,
      block: this.guardTimer > 0,
      attack,
    };
  }
}

export class ArenaGame {
  constructor(canvas, input, audio, { onMatchEnd } = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.input = input;
    this.audio = audio;
    this.onMatchEnd = onMatchEnd ?? (() => {});
    this.images = {};
    this.fighters = [];
    this.ai = new AIController();
    this.state = "loading";
    this.phase = "idle";
    this.paused = false;
    this.roundNumber = 1;
    this.roundTimer = ROUND.seconds;
    this.phaseTimer = 0;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.hitStop = 0;
    this.shake = 0;
    this.finisherUsed = false;
    this.autoFinishTimer = 0;
    this.particles = [];
    this.ash = Array.from({ length: 46 }, (_, index) => ({
      x: (index * 137.5) % VIEWPORT.width,
      y: (index * 83.3) % VIEWPORT.height,
      speed: 8 + (index % 9) * 2.1,
      drift: ((index % 5) - 2) * 2.2,
      size: 1 + (index % 3),
    }));
    requestAnimationFrame((time) => this.frame(time));
  }

  async load(onProgress = () => {}) {
    const sources = [
      ["arena", "assets/arena-moon-temple.png"],
      ...Object.values(CHARACTERS).map((character) => [character.id, character.sprite]),
    ];
    let loaded = 0;
    await Promise.all(sources.map(async ([key, source]) => {
      this.images[key] = await loadImage(source);
      loaded += 1;
      onProgress(loaded / sources.length);
    }));
    this.showAttract();
  }

  showAttract() {
    this.state = "attract";
    this.phase = "idle";
    this.paused = false;
    const attractRoster = Object.keys(CHARACTERS).sort(() => Math.random() - 0.5).slice(0, 2);
    this.fighters = [
      new Fighter(CHARACTERS[attractRoster[0]], 0, this.images[attractRoster[0]], 285),
      new Fighter(CHARACTERS[attractRoster[1]], 1, this.images[attractRoster[1]], 675),
    ];
  }

  startMatch({ mode, playerOne, playerTwo }) {
    this.mode = mode;
    this.state = "fight";
    this.paused = false;
    this.roundNumber = 1;
    this.finisherUsed = false;
    this.fighters = [
      new Fighter(CHARACTERS[playerOne], 0, this.images[playerOne], 280),
      new Fighter(CHARACTERS[playerTwo], 1, this.images[playerTwo], 680),
    ];
    this.fighters[0].wins = 0;
    this.fighters[1].wins = 0;
    this.ai.reset();
    this.resetRound();
  }

  resetRound() {
    this.fighters[0].reset(280);
    this.fighters[1].reset(680);
    this.fighters[0].facing = 1;
    this.fighters[1].facing = -1;
    this.roundTimer = ROUND.seconds;
    this.phase = "intro";
    this.phaseTimer = ROUND.introSeconds;
    this.particles.length = 0;
    this.ai.reset();
    this.audio.play("round");
  }

  rematch() {
    if (!this.fighters.length) return;
    this.startMatch({
      mode: this.mode,
      playerOne: this.fighters[0].character.id,
      playerTwo: this.fighters[1].character.id,
    });
  }

  commandFor(player, dt) {
    if (player === 1 && this.mode === "solo") {
      return this.ai.command(dt, this.fighters[1], this.fighters[0], this.roundNumber);
    }
    const attackOrder = ["highPunch", "lowPunch", "highKick", "lowKick"];
    return {
      left: this.input.held(player, "left"),
      right: this.input.held(player, "right"),
      down: this.input.held(player, "down"),
      upPressed: this.input.pressed(player, "up"),
      block: this.input.held(player, "block"),
      attack: attackOrder.find((action) => this.input.pressed(player, action)) ?? null,
    };
  }

  frame(time) {
    const elapsed = Math.min(0.05, Math.max(0, (time - this.lastTime) / 1000));
    this.lastTime = time;
    this.accumulator += elapsed;
    this.input.update();

    if (this.state === "fight" && this.input.pausePressed()) this.paused = !this.paused;

    while (this.accumulator >= 1 / 60) {
      this.update(1 / 60);
      this.accumulator -= 1 / 60;
    }
    this.draw(time / 1000);
    requestAnimationFrame((nextTime) => this.frame(nextTime));
  }

  update(dt) {
    this.updateAsh(dt);
    this.updateParticles(dt);
    this.shake = Math.max(0, this.shake - dt * 25);
    if (this.state !== "fight" || this.paused) return;

    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }

    if (this.phase === "intro") {
      this.phaseTimer -= dt;
      this.fighters.forEach((fighter) => fighter.update(dt, emptyCommand(), false));
      if (this.phaseTimer <= 0) {
        this.phase = "active";
        this.audio.play("fight");
      }
      return;
    }

    if (this.phase === "outro") {
      this.phaseTimer -= dt;
      this.fighters.forEach((fighter) => fighter.update(dt, emptyCommand(), false));
      if (this.phaseTimer <= 0) this.advanceAfterRound();
      return;
    }

    if (this.phase === "finishPrompt") {
      this.updateFinishPrompt(dt);
      return;
    }

    if (this.phase === "finisher") {
      this.phaseTimer -= dt;
      this.fighters.forEach((fighter) => fighter.update(dt, emptyCommand(), false));
      if (this.phaseTimer <= 0) this.completeMatch(true);
      return;
    }

    if (this.phase !== "active") return;
    this.roundTimer = Math.max(0, this.roundTimer - dt);
    this.fighters[0].update(dt, this.commandFor(0, dt), true);
    this.fighters[1].update(dt, this.commandFor(1, dt), true);
    this.resolveFacingAndSpacing();
    this.resolveAttacks();

    if (this.fighters.some((fighter) => fighter.ko) || this.roundTimer <= 0) this.finishRound();
  }

  resolveFacingAndSpacing() {
    const [leftFighter, rightFighter] = this.fighters[0].x <= this.fighters[1].x
      ? this.fighters
      : [this.fighters[1], this.fighters[0]];
    leftFighter.facing = 1;
    rightFighter.facing = -1;
    const gap = rightFighter.x - leftFighter.x;
    if (gap < MIN_DISTANCE && !leftFighter.airborne && !rightFighter.airborne) {
      const correction = (MIN_DISTANCE - gap) / 2;
      leftFighter.x = clamp(leftFighter.x - correction, ARENA_LEFT, ARENA_RIGHT);
      rightFighter.x = clamp(rightFighter.x + correction, ARENA_LEFT, ARENA_RIGHT);
    }
  }

  resolveAttacks() {
    for (let attackerIndex = 0; attackerIndex < 2; attackerIndex += 1) {
      const attacker = this.fighters[attackerIndex];
      const defender = this.fighters[1 - attackerIndex];
      const attack = attacker.attack;
      if (!attack || attack.hit || defender.ko) continue;
      const activeStart = attack.data.windup;
      const activeEnd = activeStart + attack.data.active;
      if (attack.elapsed < activeStart || attack.elapsed > activeEnd) continue;

      const distance = Math.abs(defender.x - attacker.x);
      const defenderDuckedUnder = defender.crouching && attack.data.height === "high" && attack.type === "highPunch";
      const verticalDistance = Math.abs(defender.y - attacker.y);
      if (distance > attack.data.reach || verticalDistance > 145 || defenderDuckedUnder) continue;

      attack.hit = true;
      const blocked = defender.blocking && defender.facing === -attacker.facing;
      defender.takeHit({ ...attack.data, damage: attack.data.damage * attacker.character.power }, blocked, attacker.facing);
      this.audio.play(blocked ? "block" : attack.data.sound);
      this.spawnHit(defender.x - attacker.facing * 28, defender.y - (attack.data.height === "low" ? 55 : 142), blocked);
      this.hitStop = blocked ? 0.035 : 0.065;
      this.shake = blocked ? 3 : 8;
    }
  }

  finishRound() {
    if (this.phase !== "active") return;
    const [p1, p2] = this.fighters;
    let winner = null;
    if (p1.health > p2.health) winner = p1;
    else if (p2.health > p1.health) winner = p2;
    else winner = Math.random() < 0.5 ? p1 : p2;

    winner.wins += 1;
    const loser = winner === p1 ? p2 : p1;
    if (!loser.ko) loser.hurtTimer = 99;
    this.roundWinner = winner;

    if (winner.wins >= ROUND.winsRequired) {
      winner.victory = false;
      this.phase = "finishPrompt";
      this.phaseTimer = 4.8;
      this.autoFinishTimer = 1.35;
      this.audio.play("finish");
      return;
    }

    winner.victory = true;
    this.phase = "outro";
    this.phaseTimer = ROUND.outroSeconds;
    this.audio.play("win");
  }

  updateFinishPrompt(dt) {
    this.phaseTimer -= dt;
    const winnerIndex = this.roundWinner === this.fighters[0] ? 0 : 1;
    const loserIndex = 1 - winnerIndex;
    const aiWinner = this.mode === "solo" && winnerIndex === 1;
    let attemptFinisher = false;

    if (aiWinner) {
      this.autoFinishTimer -= dt;
      attemptFinisher = this.autoFinishTimer <= 0;
      this.roundWinner.update(dt, emptyCommand(), false);
    } else {
      const command = this.commandFor(winnerIndex, dt);
      attemptFinisher = Boolean(command.attack);
      this.roundWinner.update(dt, { ...command, attack: null }, true);
    }
    this.fighters[loserIndex].update(dt, emptyCommand(), false);
    this.resolveFacingAndSpacing();

    if (attemptFinisher) this.performFinisher();
    else if (this.phaseTimer <= 0) this.completeMatch(false);
  }

  performFinisher() {
    if (this.phase !== "finishPrompt") return;
    const loser = this.roundWinner === this.fighters[0] ? this.fighters[1] : this.fighters[0];
    this.finisherUsed = true;
    this.phase = "finisher";
    this.phaseTimer = 3.25;
    this.roundWinner.victory = true;
    loser.ko = true;
    loser.health = 0;
    loser.flashTimer = 0.35;
    this.shake = 18;
    this.hitStop = 0.12;
    for (let burst = 0; burst < 4; burst += 1) {
      this.spawnHit(loser.x + (Math.random() - 0.5) * 80, loser.y - 60 - Math.random() * 170, false);
    }
    this.audio.play("finisher");
  }

  completeMatch(finisher) {
    this.phase = "complete";
    this.state = "complete";
    this.onMatchEnd({
      winner: this.roundWinner.character,
      score: `${this.fighters[0].wins}—${this.fighters[1].wins}`,
      finisher,
    });
  }

  advanceAfterRound() {
    if (this.roundWinner.wins >= ROUND.winsRequired) {
      this.completeMatch(this.finisherUsed);
      return;
    }
    this.roundNumber += 1;
    this.resetRound();
  }

  spawnHit(x, y, blocked) {
    const colors = blocked ? ["#fff2bd", "#efab3d", "#ffffff"] : ["#e23722", "#a70d0b", "#ffb342"];
    for (let index = 0; index < (blocked ? 11 : 18); index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 260;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 0.28 + Math.random() * 0.35,
        maxLife: 0.63,
        size: 2 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.vy += 430 * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  updateAsh(dt) {
    for (const mote of this.ash) {
      mote.y -= mote.speed * dt;
      mote.x += mote.drift * dt;
      if (mote.y < -5) {
        mote.y = VIEWPORT.height + 5;
        mote.x = Math.random() * VIEWPORT.width;
      }
    }
  }

  draw(time) {
    const context = this.context;
    this.canvas.dataset.gameState = this.state;
    this.canvas.dataset.gamePhase = this.phase;
    context.save();
    if (this.shake > 0) context.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    this.drawArena(time);
    if (this.fighters.length) {
      this.drawFighter(this.fighters[0]);
      this.drawFighter(this.fighters[1]);
    }
    this.drawParticles();
    if (this.phase === "finisher") this.drawFinisherEffect(time);
    if (this.state === "fight" || this.state === "complete") this.drawHud();
    if (this.state === "fight") this.drawFightMessages();
    context.restore();
  }

  drawArena(time) {
    const context = this.context;
    const arena = this.images.arena;
    if (arena) context.drawImage(arena, 0, 0, arena.width, arena.height - 8, 0, 0, VIEWPORT.width, VIEWPORT.height);
    else {
      context.fillStyle = "#080504";
      context.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    }

    const fog = context.createLinearGradient(0, 310, 0, VIEWPORT.height);
    fog.addColorStop(0, "rgba(125, 141, 147, 0)");
    fog.addColorStop(0.7, `rgba(91, 98, 100, ${0.055 + Math.sin(time * 0.6) * 0.015})`);
    fog.addColorStop(1, "rgba(0, 0, 0, 0.18)");
    context.fillStyle = fog;
    context.fillRect(0, 290, VIEWPORT.width, 250);

    for (const mote of this.ash) {
      context.globalAlpha = 0.18 + (mote.size / 3) * 0.18;
      context.fillStyle = mote.size > 2 ? "#f69b3a" : "#b5a78e";
      context.fillRect(mote.x, mote.y, mote.size, mote.size);
    }
    context.globalAlpha = 1;

    if (this.state === "attract" || this.state === "loading") {
      context.fillStyle = "rgba(0, 0, 0, 0.3)";
      context.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    }
  }

  drawFighter(fighter) {
    const context = this.context;
    const frame = fighter.spriteFrame();
    const sourceWidth = fighter.image.width / 4;
    const sourceHeight = fighter.image.height / 2;
    const sourceX = (frame % 4) * sourceWidth;
    const sourceY = Math.floor(frame / 4) * sourceHeight;
    const width = 230 * fighter.character.scale;
    const height = 307 * fighter.character.scale;

    context.save();
    context.globalAlpha = 0.38;
    context.fillStyle = "#000";
    context.beginPath();
    context.ellipse(fighter.x, VIEWPORT.floorY + 2, 58, 13, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();

    context.save();
    context.translate(Math.round(fighter.x), Math.round(fighter.y));
    context.scale(fighter.facing, 1);
    context.imageSmoothingEnabled = true;
    if (fighter.flashTimer > 0) context.filter = "brightness(1.8) saturate(0.4)";
    context.drawImage(
      fighter.image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      -width / 2,
      -height,
      width,
      height,
    );
    context.restore();
  }

  drawParticles() {
    const context = this.context;
    for (const particle of this.particles) {
      context.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      context.fillStyle = particle.color;
      context.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    context.globalAlpha = 1;
  }

  drawFinisherEffect(time) {
    const context = this.context;
    const loser = this.roundWinner === this.fighters[0] ? this.fighters[1] : this.fighters[0];
    const pulse = 0.5 + Math.sin(time * 18) * 0.5;
    const aura = context.createRadialGradient(loser.x, loser.y - 140, 20, loser.x, loser.y - 140, 260);
    aura.addColorStop(0, `${this.roundWinner.character.accent}88`);
    aura.addColorStop(0.42, `${this.roundWinner.character.accent}22`);
    aura.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.save();
    context.globalCompositeOperation = "screen";
    context.globalAlpha = 0.42 + pulse * 0.2;
    context.fillStyle = aura;
    context.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    context.strokeStyle = this.roundWinner.character.accent;
    context.lineWidth = 3;
    for (let ring = 0; ring < 3; ring += 1) {
      context.globalAlpha = 0.18 + pulse * 0.16;
      context.beginPath();
      context.arc(loser.x, loser.y - 140, 55 + ring * 42 + pulse * 9, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  drawHud() {
    const context = this.context;
    const [p1, p2] = this.fighters;
    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.72)";
    context.fillRect(38, 24, 350, 34);
    context.fillRect(VIEWPORT.width - 388, 24, 350, 34);
    context.strokeStyle = "#bb8e43";
    context.lineWidth = 3;
    context.strokeRect(38, 24, 350, 34);
    context.strokeRect(VIEWPORT.width - 388, 24, 350, 34);

    this.drawHealthBar(43, 29, 340, 24, p1.health, false);
    this.drawHealthBar(VIEWPORT.width - 383, 29, 340, 24, p2.health, true);
    context.font = "bold 20px Georgia";
    context.fillStyle = "#f3d89f";
    context.textAlign = "left";
    context.fillText(p1.character.name, 42, 81);
    context.textAlign = "right";
    context.fillText(p2.character.name, VIEWPORT.width - 42, 81);

    context.fillStyle = "rgba(0, 0, 0, 0.78)";
    context.fillRect(425, 18, 110, 67);
    context.strokeStyle = "#8c642f";
    context.strokeRect(425, 18, 110, 67);
    context.textAlign = "center";
    context.font = "bold 45px Impact";
    context.fillStyle = this.roundTimer <= 10 ? "#e34225" : "#e4c275";
    context.fillText(String(Math.ceil(this.roundTimer)).padStart(2, "0"), 480, 69);

    this.drawWinMarks(44, 94, p1.wins, false);
    this.drawWinMarks(VIEWPORT.width - 44, 94, p2.wins, true);
    context.restore();
  }

  drawHealthBar(x, y, width, height, health, reverse) {
    const context = this.context;
    const fillWidth = (width - 6) * (health / 100);
    const gradient = context.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, health < 25 ? "#ff4a2c" : "#f3c84a");
    gradient.addColorStop(1, health < 25 ? "#8f0c08" : "#9f5e17");
    context.fillStyle = "#2b0907";
    context.fillRect(x + 3, y + 3, width - 6, height - 6);
    context.fillStyle = gradient;
    context.fillRect(reverse ? x + width - 3 - fillWidth : x + 3, y + 3, fillWidth, height - 6);
  }

  drawWinMarks(x, y, wins, reverse) {
    const context = this.context;
    for (let index = 0; index < ROUND.winsRequired; index += 1) {
      const positionX = x + (reverse ? -index * 17 : index * 17);
      context.beginPath();
      context.arc(positionX, y, 5, 0, Math.PI * 2);
      context.fillStyle = index < wins ? "#d5331c" : "rgba(0, 0, 0, 0.65)";
      context.fill();
      context.strokeStyle = "#a0783d";
      context.stroke();
    }
  }

  drawFightMessages() {
    if (this.paused) {
      this.drawCenterText("PAUSED", "PRESS P OR ESC TO CONTINUE", "#d9b566");
      return;
    }
    if (this.phase === "intro") {
      const label = this.phaseTimer > 0.92 ? `ROUND ${this.roundNumber}` : "FIGHT!";
      this.drawCenterText(label, this.phaseTimer > 0.92 ? "THE OATH CONTINUES" : "", this.phaseTimer > 0.92 ? "#e0bd74" : "#e23b22");
    } else if (this.phase === "outro") {
      const loser = this.roundWinner === this.fighters[0] ? this.fighters[1] : this.fighters[0];
      const message = loser?.ko ? "KNOCK OUT" : `${this.roundWinner?.character.name} WINS`;
      this.drawCenterText(message, `ROUND ${this.roundNumber}`, "#df351f");
    } else if (this.phase === "finishPrompt") {
      this.drawCenterText("FINISH THEM!", "PRESS ANY ATTACK · OATHBREAKER READY", "#f0c33b");
    } else if (this.phase === "finisher") {
      this.drawCenterText(this.roundWinner.character.finisher, "OATHBREAKER", this.roundWinner.character.accent);
    }
  }

  drawCenterText(title, subtitle, color) {
    const context = this.context;
    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.58)";
    context.fillRect(0, 205, VIEWPORT.width, 130);
    context.textAlign = "center";
    context.font = "bold 72px Georgia";
    context.fillStyle = "#240300";
    context.fillText(title, 484, 294);
    context.fillStyle = color;
    context.fillText(title, 480, 288);
    if (subtitle) {
      context.font = "bold 14px Courier New";
      context.fillStyle = "#c9ad78";
      context.fillText(subtitle, 480, 316);
    }
    context.restore();
  }
}
