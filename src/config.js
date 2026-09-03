export const VIEWPORT = Object.freeze({ width: 960, height: 540, floorY: 451 });

export const ROUND = Object.freeze({
  seconds: 60,
  winsRequired: 2,
  introSeconds: 2.35,
  outroSeconds: 2.6,
});

export const CHARACTERS = Object.freeze({
  riven: Object.freeze({
    id: "riven",
    name: "RIVEN",
    epithet: "THE EXILED GUARDIAN",
    sprite: "assets/riven-sprites.png",
    speed: 238,
    jump: 610,
    power: 1.08,
    scale: 1,
    accent: "#d4371f",
  }),
  veyra: Object.freeze({
    id: "veyra",
    name: "VEYRA",
    epithet: "THE STORM CHAMPION",
    sprite: "assets/veyra-sprites.png",
    speed: 265,
    jump: 655,
    power: 0.96,
    scale: 0.98,
    accent: "#43a5a5",
  }),
});

export const ATTACKS = Object.freeze({
  highPunch: Object.freeze({
    frame: 3,
    damage: 8,
    reach: 111,
    windup: 0.07,
    active: 0.11,
    duration: 0.32,
    hitstun: 0.2,
    knockback: 22,
    height: "high",
    sound: "punch",
  }),
  lowPunch: Object.freeze({
    frame: 3,
    damage: 6,
    reach: 93,
    windup: 0.045,
    active: 0.1,
    duration: 0.25,
    hitstun: 0.15,
    knockback: 13,
    height: "mid",
    sound: "punch",
  }),
  highKick: Object.freeze({
    frame: 4,
    damage: 13,
    reach: 145,
    windup: 0.15,
    active: 0.13,
    duration: 0.51,
    hitstun: 0.31,
    knockback: 39,
    height: "high",
    sound: "kick",
  }),
  lowKick: Object.freeze({
    frame: 4,
    damage: 10,
    reach: 122,
    windup: 0.1,
    active: 0.14,
    duration: 0.42,
    hitstun: 0.25,
    knockback: 31,
    height: "low",
    sound: "kick",
  }),
});

export const KEYBOARD_MAP = Object.freeze([
  Object.freeze({
    left: "KeyA",
    right: "KeyD",
    up: "KeyW",
    down: "KeyS",
    highPunch: "KeyF",
    lowPunch: "KeyV",
    block: "KeyG",
    highKick: "KeyH",
    lowKick: "KeyN",
  }),
  Object.freeze({
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    highPunch: "KeyJ",
    lowPunch: "KeyM",
    block: "KeyK",
    highKick: "KeyL",
    lowKick: "Period",
  }),
]);

export const ACTIONS = Object.freeze([
  "left",
  "right",
  "up",
  "down",
  "highPunch",
  "lowPunch",
  "block",
  "highKick",
  "lowKick",
]);
