import { ATTACKS, CHARACTERS, ROUND, STAGES, VIEWPORT } from "./config.js";

const GRAVITY = 1480;
const ARENA_LEFT = 82;
const ARENA_RIGHT = VIEWPORT.width - 82;
const MIN_DISTANCE = 86;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function smoothstep(value) {
  const bounded = clamp(value, 0, 1);
  return bounded * bounded * (3 - 2 * bounded);
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error(`Unable to load image: ${source}`)), { once: true });
    image.src = source;
  });
}

function isolateSpriteAtlas(image) {
  const columns = 4;
  const rows = 2;
  const frameWidth = Math.floor(image.width / columns);
  const frameHeight = Math.floor(image.height / rows);
  const frames = [];
  let removedFragments = 0;

  for (let frame = 0; frame < columns * rows; frame += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(
      image,
      (frame % columns) * frameWidth,
      Math.floor(frame / columns) * frameHeight,
      frameWidth,
      frameHeight,
      0,
      0,
      frameWidth,
      frameHeight,
    );

    const pixels = context.getImageData(0, 0, frameWidth, frameHeight);
    const labels = new Int32Array(frameWidth * frameHeight);
    const queue = new Int32Array(frameWidth * frameHeight);
    const components = [];
    let nextLabel = 0;

    for (let start = 0; start < labels.length; start += 1) {
      if (labels[start] || pixels.data[start * 4 + 3] < 6) continue;
      nextLabel += 1;
      let head = 0;
      let tail = 1;
      let count = 0;
      queue[0] = start;
      labels[start] = nextLabel;

      while (head < tail) {
        const current = queue[head];
        head += 1;
        count += 1;
        const x = current % frameWidth;
        const y = Math.floor(current / frameWidth);
        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          const neighborY = y + offsetY;
          if (neighborY < 0 || neighborY >= frameHeight) continue;
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            if (offsetX === 0 && offsetY === 0) continue;
            const neighborX = x + offsetX;
            if (neighborX < 0 || neighborX >= frameWidth) continue;
            const neighbor = neighborY * frameWidth + neighborX;
            if (labels[neighbor] || pixels.data[neighbor * 4 + 3] < 6) continue;
            labels[neighbor] = nextLabel;
            queue[tail] = neighbor;
            tail += 1;
          }
        }
      }
      components.push({ label: nextLabel, count });
    }

    if (components.length > 1) {
      const main = components.reduce((largest, component) => (
        component.count > largest.count ? component : largest
      ));
      removedFragments += components.length - 1;
      for (let pixel = 0; pixel < labels.length; pixel += 1) {
        if (labels[pixel] === main.label) continue;
        const channel = pixel * 4;
        pixels.data[channel] = 0;
        pixels.data[channel + 1] = 0;
        pixels.data[channel + 2] = 0;
        pixels.data[channel + 3] = 0;
      }
      context.clearRect(0, 0, frameWidth, frameHeight);
      context.putImageData(pixels, 0, 0);
    }
    frames.push(canvas);
  }

  return { frames, width: frameWidth, height: frameHeight, removedFragments };
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
    this.attackCooldown = 0.55 + Math.random() * 0.25;
    this.retreatTimer = 0;
    this.move = 0;
    this.wasAttacking = false;
  }

  command(dt, self, opponent, roundNumber = 1) {
    this.decisionTimer -= dt;
    this.guardTimer = Math.max(0, this.guardTimer - dt);
    this.reactionTimer = Math.max(0, this.reactionTimer - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.retreatTimer = Math.max(0, this.retreatTimer - dt);
    const distance = Math.abs(opponent.x - self.x);
    const towardOpponent = Math.sign(opponent.x - self.x);
    const difficulty = clamp(0.48 + roundNumber * 0.07, 0.55, 0.72);

    if (this.wasAttacking && !self.attack) {
      this.attackCooldown = Math.max(this.attackCooldown, 0.52 + Math.random() * 0.42);
      this.retreatTimer = 0.16 + Math.random() * 0.28;
      this.move = -towardOpponent;
    }
    this.wasAttacking = Boolean(self.attack);

    if (self.locked) return emptyCommand();

    const incomingAttack = opponent.attack
      && opponent.attack.elapsed < opponent.attack.data.windup + opponent.attack.data.active
      && distance < opponent.attack.data.reach + 48;
    if (incomingAttack && this.reactionTimer <= 0 && Math.random() < difficulty) {
      this.guardTimer = 0.2 + Math.random() * 0.24;
      this.reactionTimer = 0.11 + Math.random() * 0.08;
      this.move = 0;
    }

    if (this.guardTimer > 0) {
      return { ...emptyCommand(), block: true };
    }

    if (this.retreatTimer > 0) {
      return {
        ...emptyCommand(),
        left: towardOpponent > 0,
        right: towardOpponent < 0,
      };
    }

    let attack = null;
    let jump = false;
    if (this.decisionTimer <= 0) {
      this.decisionTimer = Math.max(0.18, 0.28 - roundNumber * 0.015) + Math.random() * 0.16;
      const lowHealth = self.health < 28;
      const hasHealthLead = self.health > opponent.health + 24;
      const canAttack = this.attackCooldown <= 0;
      const roll = Math.random();

      if (opponent.airborne && distance < 145 && canAttack && roll < 0.42) {
        this.move = 0;
        attack = Math.random() < 0.62 ? "highPunch" : "highKick";
      } else if (distance > 230) {
        if (roll < 0.7) {
          this.move = towardOpponent;
          jump = Math.random() < 0.08;
        } else {
          this.move = 0;
          this.guardTimer = 0.18 + Math.random() * 0.24;
        }
      } else if (distance > 150) {
        if (roll < 0.45) this.move = towardOpponent;
        else if (roll < 0.65) {
          this.move = 0;
          this.guardTimer = 0.2 + Math.random() * 0.26;
        } else if (roll < 0.78 && canAttack) {
          this.move = 0;
          attack = "highKick";
        } else {
          this.move = -towardOpponent;
          this.retreatTimer = 0.14 + Math.random() * 0.2;
        }
      } else if (distance > 95) {
        if (roll < 0.28 || ((lowHealth || hasHealthLead) && roll < 0.42)) {
          this.move = -towardOpponent;
          this.retreatTimer = 0.2 + Math.random() * 0.28;
        } else if (roll < 0.5) {
          this.move = 0;
          this.guardTimer = 0.24 + Math.random() * 0.3;
        } else if (roll < 0.72 && canAttack) {
          this.move = 0;
          attack = opponent.blocking ? "lowKick" : (Math.random() < 0.5 ? "highPunch" : "highKick");
        } else {
          this.move = Math.random() < 0.5 ? 0 : towardOpponent;
        }
      } else {
        if (roll < 0.35 || ((lowHealth || hasHealthLead) && roll < 0.5)) {
          this.move = -towardOpponent;
          this.retreatTimer = 0.22 + Math.random() * 0.34;
        } else if (roll < 0.6) {
          this.move = 0;
          this.guardTimer = 0.25 + Math.random() * 0.34;
        } else if (roll < 0.83 && canAttack) {
          this.move = 0;
          attack = opponent.blocking ? "lowKick" : (Math.random() < 0.54 ? "lowPunch" : "lowKick");
        } else {
          this.move = 0;
        }
      }

      if (attack) {
        this.attackCooldown = Math.max(0.48, 0.78 - roundNumber * 0.035) + Math.random() * 0.34;
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
  constructor(canvas, input, audio, { onMatchEnd, onPauseChange } = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.input = input;
    this.audio = audio;
    this.onMatchEnd = onMatchEnd ?? (() => {});
    this.onPauseChange = onPauseChange ?? (() => {});
    this.images = {};
    this.cleanedFragments = 0;
    this.stage = STAGES.moonTemple;
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
    this.finisherDuration = 3.8;
    this.finisherElapsed = 0;
    this.finisherImpactTriggered = false;
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
      ...Object.values(STAGES).map((stage) => [stage.id, stage.image]),
      ...Object.values(CHARACTERS).map((character) => [character.id, character.sprite]),
    ];
    let loaded = 0;
    await Promise.all(sources.map(async ([key, source]) => {
      const image = await loadImage(source);
      if (CHARACTERS[key]) {
        const atlas = isolateSpriteAtlas(image);
        this.images[key] = atlas;
        this.cleanedFragments += atlas.removedFragments;
      } else {
        this.images[key] = image;
      }
      loaded += 1;
      onProgress(loaded / sources.length);
    }));
    this.showAttract();
  }

  showAttract() {
    this.state = "attract";
    this.phase = "idle";
    this.paused = false;
    this.onPauseChange(false, false);
    const stageRoster = Object.values(STAGES);
    this.stage = stageRoster[Math.floor(Math.random() * stageRoster.length)];
    const attractRoster = Object.keys(CHARACTERS).sort(() => Math.random() - 0.5).slice(0, 2);
    this.fighters = [
      new Fighter(CHARACTERS[attractRoster[0]], 0, this.images[attractRoster[0]], 285),
      new Fighter(CHARACTERS[attractRoster[1]], 1, this.images[attractRoster[1]], 675),
    ];
  }

  startMatch({ mode, playerOne, playerTwo, stage }) {
    this.mode = mode;
    this.state = "fight";
    this.paused = false;
    this.onPauseChange(false, true);
    this.roundNumber = 1;
    this.finisherUsed = false;
    const stageRoster = Object.values(STAGES);
    this.stage = STAGES[stage] ?? stageRoster[Math.floor(Math.random() * stageRoster.length)];
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
    this.finisherElapsed = 0;
    this.finisherImpactTriggered = false;
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
      stage: Object.keys(STAGES)[Math.floor(Math.random() * Object.keys(STAGES).length)],
    });
  }

  togglePause() {
    if (this.state !== "fight") return false;
    this.paused = !this.paused;
    this.onPauseChange(this.paused, true);
    return this.paused;
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

    if (this.state === "fight" && this.input.pausePressed()) this.togglePause();

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
      this.finisherElapsed += dt;
      if (!this.finisherImpactTriggered && this.finisherElapsed >= 0.68) {
        this.finisherImpactTriggered = true;
        this.shake = 18;
        const loser = this.roundWinner === this.fighters[0] ? this.fighters[1] : this.fighters[0];
        this.spawnFinisherBurst(loser, this.roundWinner.character.accent);
      }
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
    this.phaseTimer = this.finisherDuration;
    this.finisherElapsed = 0;
    this.finisherImpactTriggered = false;
    this.roundWinner.victory = true;
    loser.ko = true;
    loser.health = 0;
    loser.flashTimer = 0.35;
    this.shake = 5;
    this.hitStop = 0.12;
    this.audio.play("finisher");
  }

  completeMatch(finisher) {
    this.phase = "complete";
    this.state = "complete";
    this.paused = false;
    this.onPauseChange(false, false);
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

  spawnFinisherBurst(fighter, accent) {
    const colors = [accent, "#fff0b5", "#ffffff", "#251024"];
    for (let index = 0; index < 58; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 95 + Math.random() * 390;
      this.particles.push({
        x: fighter.x + (Math.random() - 0.5) * 44,
        y: fighter.y - 132 + (Math.random() - 0.5) * 78,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 0.5 + Math.random() * 0.65,
        maxLife: 1.15,
        size: 2 + Math.random() * 7,
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
    this.canvas.dataset.roundTime = this.roundTimer.toFixed(2);
    this.canvas.dataset.round = String(this.roundNumber);
    this.canvas.dataset.stage = this.stage?.id ?? "moonTemple";
    this.canvas.dataset.stageName = this.stage?.name ?? STAGES.moonTemple.name;
    this.canvas.dataset.cleanedFragments = String(this.cleanedFragments);
    this.canvas.dataset.finisherStyle = this.roundWinner?.character.finisherStyle ?? "none";
    this.canvas.dataset.finisherElapsed = this.finisherElapsed.toFixed(2);
    this.canvas.dataset.p1Health = this.fighters[0]?.health.toFixed(1) ?? "0";
    this.canvas.dataset.p2Health = this.fighters[1]?.health.toFixed(1) ?? "0";
    this.canvas.dataset.p1Wins = String(this.fighters[0]?.wins ?? 0);
    this.canvas.dataset.p2Wins = String(this.fighters[1]?.wins ?? 0);
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
    const arena = this.images[this.stage?.id ?? "moonTemple"];
    if (arena) context.drawImage(arena, 0, 0, arena.width, arena.height - 8, 0, 0, VIEWPORT.width, VIEWPORT.height);
    else {
      context.fillStyle = "#080504";
      context.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    }

    const fog = context.createLinearGradient(0, 310, 0, VIEWPORT.height);
    fog.addColorStop(0, "rgba(125, 141, 147, 0)");
    fog.addColorStop(0.7, `rgba(${this.stage?.fog ?? "91, 98, 100"}, ${0.055 + Math.sin(time * 0.6) * 0.015})`);
    fog.addColorStop(1, "rgba(0, 0, 0, 0.18)");
    context.fillStyle = fog;
    context.fillRect(0, 290, VIEWPORT.width, 250);

    for (const mote of this.ash) {
      context.globalAlpha = 0.18 + (mote.size / 3) * 0.18;
      context.fillStyle = mote.size > 2 ? this.stage?.moteBright ?? "#f69b3a" : this.stage?.moteDim ?? "#b5a78e";
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
    const presentation = this.finisherPresentation(fighter);
    const frame = presentation.frame ?? fighter.spriteFrame();
    const frameImage = fighter.image.frames[frame] ?? fighter.image.frames[0];
    const width = 230 * fighter.character.scale;
    const height = 307 * fighter.character.scale;

    context.save();
    context.globalAlpha = 0.38 * presentation.alpha;
    context.fillStyle = "#000";
    context.beginPath();
    context.ellipse(
      fighter.x + presentation.x,
      VIEWPORT.floorY + 2,
      58 * presentation.scaleX,
      13 * presentation.scaleY,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();

    context.save();
    context.globalAlpha = presentation.alpha;
    context.translate(Math.round(fighter.x + presentation.x), Math.round(fighter.y + presentation.y));
    context.rotate(presentation.rotation);
    context.scale(fighter.facing * presentation.scaleX, presentation.scaleY);
    context.imageSmoothingEnabled = false;
    if (fighter.flashTimer > 0) context.filter = "brightness(1.8) saturate(0.4)";
    context.drawImage(
      frameImage,
      -width / 2,
      -height,
      width,
      height,
    );
    context.restore();
  }

  finisherPresentation(fighter) {
    const presentation = {
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      frame: null,
    };
    if (this.phase !== "finisher" || !this.roundWinner) return presentation;

    const elapsed = this.finisherElapsed;
    const winner = this.roundWinner;
    const loser = winner === this.fighters[0] ? this.fighters[1] : this.fighters[0];
    const direction = Math.sign(loser.x - winner.x) || winner.facing;
    const impactTime = 0.68;

    if (fighter === winner) {
      const closingDistance = Math.max(0, Math.min(210, Math.abs(loser.x - winner.x) - 104));
      const approach = smoothstep(elapsed / 0.52);
      const recoil = smoothstep((elapsed - 0.95) / 0.65);
      presentation.x = direction * closingDistance * (approach - recoil * 0.28);
      presentation.y = elapsed < impactTime ? -Math.sin(approach * Math.PI) * 18 : 0;
      presentation.scaleX = 1 + (elapsed < impactTime ? Math.sin(approach * Math.PI) * 0.08 : 0);
      presentation.rotation = direction * (elapsed < impactTime ? -0.055 * approach : 0.025 * (1 - recoil));
      presentation.frame = elapsed < 0.9 ? 3 : (elapsed < 1.65 ? 4 : 7);
      return presentation;
    }

    if (fighter === loser && elapsed >= impactTime) {
      const reaction = smoothstep((elapsed - impactTime) / 0.48);
      const settle = smoothstep((elapsed - 1.7) / 1.1);
      const style = winner.character.finisherStyle;
      presentation.frame = 6;
      presentation.x = direction * (34 * reaction - 12 * settle);
      presentation.rotation = direction * 0.14 * reaction * (1 - settle * 0.45);

      if (["tempest", "thunder", "sky"].includes(style)) {
        presentation.y = -58 * Math.sin(Math.min(1, (elapsed - impactTime) / 1.25) * Math.PI);
        presentation.rotation += Math.sin(elapsed * 24) * 0.035;
      } else if (style === "frost") {
        presentation.scaleX = 1 - reaction * 0.08;
        presentation.scaleY = 1 + reaction * 0.06;
      } else if (style === "quake") {
        presentation.y = -24 * Math.abs(Math.sin((elapsed - impactTime) * 11)) * (1 - settle);
        presentation.rotation += Math.sin(elapsed * 18) * 0.045;
      } else if (["flash", "barrage"].includes(style)) {
        presentation.x += Math.sin(elapsed * 31) * 11 * (1 - settle);
      } else if (["fang", "spurs"].includes(style)) {
        presentation.rotation += direction * 0.13 * Math.sin((elapsed - impactTime) * 8) * (1 - settle);
      } else {
        presentation.y = -12 * Math.sin((elapsed - impactTime) * 8) * (1 - settle);
        presentation.alpha = 1 - Math.max(0, settle - 0.7) * 0.5;
      }
    }
    return presentation;
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
    const winner = this.roundWinner;
    if (!winner) return;
    const loser = this.roundWinner === this.fighters[0] ? this.fighters[1] : this.fighters[0];
    const elapsed = this.finisherElapsed;
    const impact = clamp((elapsed - 0.55) / 0.4, 0, 1);
    if (impact <= 0) return;
    const decay = 1 - smoothstep((elapsed - 2.75) / 0.9);
    const intensity = impact * decay;
    const pulse = 0.5 + Math.sin(time * 18) * 0.5;
    const accent = winner.character.accent;
    const style = winner.character.finisherStyle;
    const centerX = loser.x;
    const centerY = loser.y - 140;
    const aura = context.createRadialGradient(centerX, centerY, 20, centerX, centerY, 260);
    aura.addColorStop(0, `${accent}88`);
    aura.addColorStop(0.42, `${accent}22`);
    aura.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.save();
    context.globalCompositeOperation = "screen";
    context.globalAlpha = intensity * (0.42 + pulse * 0.2);
    context.fillStyle = aura;
    context.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    context.strokeStyle = accent;
    context.fillStyle = accent;
    context.lineCap = "square";
    context.lineJoin = "miter";

    if (["tempest", "thunder", "sky"].includes(style)) {
      const boltCount = style === "thunder" ? 5 : (style === "sky" ? 3 : 4);
      for (let bolt = 0; bolt < boltCount; bolt += 1) {
        const topX = centerX + (bolt - (boltCount - 1) / 2) * 52;
        this.drawLightning(topX, 20, centerX + (bolt % 2 ? 28 : -28), centerY + 96, time * 17 + bolt, accent, intensity);
      }
      if (style === "tempest") this.drawWindSpiral(centerX, centerY, time, accent, intensity);
      if (style === "sky") this.drawStarfall(centerX, centerY, time, accent, intensity);
    } else if (style === "ember") {
      for (let flame = 0; flame < 9; flame += 1) {
        const rise = (elapsed * 155 + flame * 43) % 260;
        const x = centerX + Math.sin(time * 5 + flame) * (30 + flame * 5);
        context.globalAlpha = intensity * (0.35 + (flame % 3) * 0.18);
        context.fillRect(Math.round(x), Math.round(loser.y - 22 - rise), 7 + (flame % 2) * 4, 18 + (flame % 3) * 8);
      }
    } else if (style === "frost") {
      context.globalAlpha = intensity * 0.82;
      context.lineWidth = 4;
      for (let shard = 0; shard < 8; shard += 1) {
        const angle = (Math.PI * 2 * shard) / 8 + time * 0.22;
        const inner = 38;
        const outer = 105 + (shard % 3) * 25;
        context.beginPath();
        context.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
        context.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
        context.stroke();
      }
      context.strokeRect(centerX - 57, centerY - 112, 114, 230);
    } else if (["flash", "barrage"].includes(style)) {
      const lines = style === "barrage" ? 14 : 9;
      context.lineWidth = style === "barrage" ? 4 : 7;
      for (let line = 0; line < lines; line += 1) {
        const y = centerY - 120 + ((line * 31 + elapsed * 260) % 250);
        const fromLeft = line % 2 === 0;
        context.globalAlpha = intensity * (0.28 + (line % 4) * 0.12);
        context.beginPath();
        context.moveTo(centerX + (fromLeft ? -210 : 210), y);
        context.lineTo(centerX + (fromLeft ? -48 : 48), y + (line % 3 - 1) * 18);
        context.stroke();
      }
    } else if (["fang", "spurs"].includes(style)) {
      const slashCount = style === "spurs" ? 6 : 4;
      context.lineWidth = style === "spurs" ? 8 : 5;
      for (let slash = 0; slash < slashCount; slash += 1) {
        const offset = (slash - (slashCount - 1) / 2) * 34;
        context.globalAlpha = intensity * (0.38 + (slash % 2) * 0.34);
        context.beginPath();
        context.moveTo(centerX - 120, centerY - 112 + offset);
        context.quadraticCurveTo(centerX, centerY - offset * 0.35, centerX + 120, centerY + 106 + offset);
        context.stroke();
      }
      if (style === "fang") {
        context.globalAlpha = intensity * 0.7;
        context.beginPath();
        context.moveTo(centerX - 70, centerY - 14);
        context.lineTo(centerX - 18, centerY - 70);
        context.lineTo(centerX, centerY - 18);
        context.lineTo(centerX + 18, centerY - 70);
        context.lineTo(centerX + 70, centerY - 14);
        context.lineTo(centerX + 18, centerY + 42);
        context.lineTo(centerX, centerY - 4);
        context.lineTo(centerX - 18, centerY + 42);
        context.closePath();
        context.stroke();
      }
    } else if (style === "quake") {
      context.lineWidth = 5;
      for (let ring = 0; ring < 5; ring += 1) {
        context.globalAlpha = intensity * (0.58 - ring * 0.075);
        context.beginPath();
        context.ellipse(centerX, VIEWPORT.floorY + 2, 55 + ring * 48 + pulse * 8, 10 + ring * 9, 0, 0, Math.PI * 2);
        context.stroke();
      }
    } else {
      this.drawWindSpiral(centerX, centerY, time, accent, intensity);
      for (let ring = 0; ring < (style === "venom" ? 5 : 3); ring += 1) {
        context.globalAlpha = intensity * (0.18 + pulse * 0.16);
        context.beginPath();
        context.arc(centerX, centerY, 55 + ring * 35 + pulse * 9, 0, Math.PI * 2);
        context.stroke();
      }
    }
    context.restore();
  }

  drawLightning(startX, startY, endX, endY, seed, color, alpha) {
    const context = this.context;
    const segments = 9;
    context.save();
    context.strokeStyle = color;
    context.lineWidth = 4;
    context.globalAlpha = alpha * 0.82;
    context.beginPath();
    context.moveTo(startX, startY);
    for (let index = 1; index < segments; index += 1) {
      const progress = index / segments;
      const jitter = Math.sin(seed * 3.17 + index * 8.41) * 24;
      context.lineTo(startX + (endX - startX) * progress + jitter, startY + (endY - startY) * progress);
    }
    context.lineTo(endX, endY);
    context.stroke();
    context.globalAlpha = alpha * 0.36;
    context.lineWidth = 11;
    context.stroke();
    context.restore();
  }

  drawWindSpiral(centerX, centerY, time, color, alpha) {
    const context = this.context;
    context.save();
    context.strokeStyle = color;
    context.lineWidth = 4;
    for (let spiral = 0; spiral < 3; spiral += 1) {
      context.globalAlpha = alpha * (0.27 + spiral * 0.13);
      context.beginPath();
      for (let point = 0; point <= 34; point += 1) {
        const radius = 12 + point * 4.4;
        const angle = point * 0.38 + time * (1.8 + spiral * 0.25) + spiral * 2.1;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius * 0.56;
        if (point === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
    context.restore();
  }

  drawStarfall(centerX, centerY, time, color, alpha) {
    const context = this.context;
    context.save();
    context.strokeStyle = color;
    context.lineWidth = 3;
    for (let star = 0; star < 8; star += 1) {
      const x = centerX - 170 + ((star * 67 + time * 90) % 340);
      const y = centerY - 230 + ((star * 53 + time * 130) % 300);
      context.globalAlpha = alpha * (0.32 + (star % 3) * 0.18);
      context.beginPath();
      context.moveTo(x - 18, y - 28);
      context.lineTo(x + 6, y + 8);
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
      this.drawCenterText(label, this.phaseTimer > 0.92 ? this.stage.name : "", this.phaseTimer > 0.92 ? "#e0bd74" : "#e23b22");
    } else if (this.phase === "outro") {
      const loser = this.roundWinner === this.fighters[0] ? this.fighters[1] : this.fighters[0];
      const message = loser?.ko ? "KNOCK OUT" : `${this.roundWinner?.character.name} WINS`;
      this.drawCenterText(message, `ROUND ${this.roundNumber}`, "#df351f");
    } else if (this.phase === "finishPrompt") {
      this.drawCenterText("FINISH THEM!", "PRESS ANY ATTACK · OATHBREAKER READY", "#f0c33b");
    } else if (this.phase === "finisher") {
      if (this.finisherElapsed > 2.35) {
        this.drawCenterText(this.roundWinner.character.finisher, "OATHBREAKER", this.roundWinner.character.accent);
      }
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
