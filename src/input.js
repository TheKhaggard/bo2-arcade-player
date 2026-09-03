import { ACTIONS, KEYBOARD_MAP } from "./config.js";

const GAMEPAD_BUTTONS = Object.freeze({
  highPunch: 2,
  lowPunch: 0,
  block: 4,
  highKick: 3,
  lowKick: 1,
});

function blankState() {
  return Object.fromEntries(ACTIONS.map((action) => [action, false]));
}

export class InputManager {
  constructor() {
    this.keys = new Set();
    this.current = [blankState(), blankState()];
    this.previous = [blankState(), blankState()];
    this.pauseCurrent = false;
    this.pausePrevious = false;

    window.addEventListener("keydown", (event) => this.onKey(event, true), { passive: false });
    window.addEventListener("keyup", (event) => this.onKey(event, false), { passive: false });
    window.addEventListener("blur", () => this.keys.clear());
  }

  onKey(event, isDown) {
    const controlled = KEYBOARD_MAP.some((mapping) => Object.values(mapping).includes(event.code));
    if (controlled || event.code === "Escape" || event.code === "KeyP") event.preventDefault();
    if (isDown) this.keys.add(event.code);
    else this.keys.delete(event.code);
  }

  update() {
    this.previous = this.current.map((state) => ({ ...state }));
    this.pausePrevious = this.pauseCurrent;
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    this.current = [0, 1].map((player) => this.readPlayer(player, pads[player]));
    this.pauseCurrent = this.keys.has("Escape") || this.keys.has("KeyP") || Boolean(pads[0]?.buttons?.[9]?.pressed);
  }

  readPlayer(player, pad) {
    const state = blankState();
    const keys = KEYBOARD_MAP[player];
    for (const action of ACTIONS) state[action] = this.keys.has(keys[action]);
    if (!pad) return state;

    const axisX = pad.axes?.[0] ?? 0;
    const axisY = pad.axes?.[1] ?? 0;
    state.left ||= axisX < -0.35 || Boolean(pad.buttons?.[14]?.pressed);
    state.right ||= axisX > 0.35 || Boolean(pad.buttons?.[15]?.pressed);
    state.up ||= axisY < -0.45 || Boolean(pad.buttons?.[12]?.pressed);
    state.down ||= axisY > 0.45 || Boolean(pad.buttons?.[13]?.pressed);

    for (const [action, button] of Object.entries(GAMEPAD_BUTTONS)) {
      state[action] ||= Boolean(pad.buttons?.[button]?.pressed);
    }
    return state;
  }

  held(player, action) {
    return Boolean(this.current[player]?.[action]);
  }

  pressed(player, action) {
    return Boolean(this.current[player]?.[action] && !this.previous[player]?.[action]);
  }

  pausePressed() {
    return this.pauseCurrent && !this.pausePrevious;
  }

  connectedPads() {
    if (!navigator.getGamepads) return [];
    return Array.from(navigator.getGamepads()).filter(Boolean);
  }
}
