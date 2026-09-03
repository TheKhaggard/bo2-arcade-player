"use strict";

const EMULATOR_VERSION = "4.2.3";
const EMULATOR_DATA_PATH = `https://cdn.emulatorjs.org/${EMULATOR_VERSION}/data/`;
const MAX_ROM_BYTES = 256 * 1024 * 1024;

const elements = {
  launcher: document.querySelector("#launcher"),
  romInput: document.querySelector("#romInput"),
  dropZone: document.querySelector("#dropZone"),
  romName: document.querySelector("#romName"),
  romMeta: document.querySelector("#romMeta"),
  validationStatus: document.querySelector("#validationStatus"),
  startButton: document.querySelector("#startButton"),
  emulatorScreen: document.querySelector("#emulatorScreen"),
  emulatorHelp: document.querySelector("#emulatorHelp"),
  exitButton: document.querySelector("#exitButton"),
  gamepadStatus: document.querySelector("#gamepadStatus"),
  gamepadDot: document.querySelector("#gamepadDot"),
  padOne: document.querySelector("#padOne"),
  padTwo: document.querySelector("#padTwo"),
};

let selectedRom = null;
let romObjectUrl = null;
let emulatorStarted = false;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function setValidation(message, type = "idle") {
  const text = elements.validationStatus.querySelector("span:last-child");
  text.textContent = message;
  elements.validationStatus.classList.remove("success", "error");
  if (type !== "idle") elements.validationStatus.classList.add(type);
}

function isZipSignature(bytes) {
  if (bytes.length < 4) return false;
  const signature = Array.from(bytes.slice(0, 4)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return signature === "504b0304" || signature === "504b0506" || signature === "504b0708";
}

async function shortFingerprint(file) {
  if (!window.crypto?.subtle) return null;
  const digest = await window.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest).slice(0, 6))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function validateRom(file) {
  if (!(file instanceof File)) throw new Error("Geçerli bir dosya seçilmedi.");
  if (!file.name.toLowerCase().endsWith(".zip")) throw new Error("ROM arşivi ZIP biçiminde olmalıdır.");
  if (file.size === 0) throw new Error("Seçilen arşiv boş.");
  if (file.size > MAX_ROM_BYTES) throw new Error("Arşiv 256 MB sınırını aşıyor.");

  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (!isZipSignature(header)) throw new Error("Dosya geçerli bir ZIP arşivi gibi görünmüyor.");

  return {
    file,
    isExpectedName: /^mk2(?:[a-z0-9_-]*)?\.zip$/i.test(file.name),
    fingerprint: await shortFingerprint(file),
  };
}

async function chooseRom(file) {
  elements.startButton.disabled = true;
  elements.dropZone.classList.remove("valid");
  setValidation("Arşiv cihazında doğrulanıyor…");

  try {
    const result = await validateRom(file);
    selectedRom = result.file;
    elements.romName.textContent = result.file.name;

    const fingerprint = result.fingerprint ? ` · SHA-256 ${result.fingerprint}…` : "";
    elements.romMeta.textContent = `${formatBytes(result.file.size)}${fingerprint}`;
    elements.dropZone.classList.add("valid");
    elements.startButton.disabled = false;

    setValidation(
      result.isExpectedName
        ? "Arşiv hazır · Dosya yalnızca bu cihazda kullanılacak"
        : "Arşiv hazır · Uyum için dosya adının mk2.zip olması önerilir",
      "success",
    );
  } catch (error) {
    selectedRom = null;
    elements.romName.textContent = "mk2.zip dosyasını seç";
    elements.romMeta.textContent = "Buraya sürükleyebilir veya gözatabilirsin";
    setValidation(error instanceof Error ? error.message : "Arşiv okunamadı.", "error");
  }
}

function control(value, value2) {
  return value2 ? { value, value2 } : { value };
}

function playerControls(keys) {
  return {
    0: control(keys.highPunch, "BUTTON_2"),
    1: control(keys.lowPunch, "BUTTON_4"),
    2: control(keys.coin, "SELECT"),
    3: control(keys.start, "START"),
    4: control(keys.up, "DPAD_UP"),
    5: control(keys.down, "DPAD_DOWN"),
    6: control(keys.left, "DPAD_LEFT"),
    7: control(keys.right, "DPAD_RIGHT"),
    8: control(keys.highKick, "BUTTON_1"),
    9: control(keys.block, "BUTTON_3"),
    10: control(keys.lowKick, "LEFT_TOP_SHOULDER"),
    11: control(keys.spare, "RIGHT_TOP_SHOULDER"),
  };
}

function configureEmulator() {
  window.EJS_player = "#game";
  window.EJS_core = "mame2003_plus";
  window.EJS_controlScheme = "mame";
  window.EJS_gameUrl = romObjectUrl;
  window.EJS_pathtodata = EMULATOR_DATA_PATH;
  window.EJS_gameName = "Mortal Kombat II (1993 Arcade)";
  window.EJS_gameID = 199311;
  window.EJS_language = "tr-TR";
  window.EJS_disableAutoLang = true;
  window.EJS_color = "#e33422";
  window.EJS_backgroundColor = "#050403";
  window.EJS_volume = 0.75;
  window.EJS_startOnLoaded = true;
  window.EJS_alignStartButton = "center";
  window.EJS_threads = false;
  window.EJS_askBeforeExit = true;
  window.EJS_defaultControls = {
    0: playerControls({
      highPunch: "f",
      lowPunch: "v",
      block: "g",
      highKick: "h",
      lowKick: "n",
      spare: "t",
      coin: "5",
      start: "1",
      up: "w",
      down: "s",
      left: "a",
      right: "d",
    }),
    1: playerControls({
      highPunch: "j",
      lowPunch: "m",
      block: "k",
      highKick: "l",
      lowKick: ".",
      spare: "p",
      coin: "6",
      start: "2",
      up: "up arrow",
      down: "down arrow",
      left: "left arrow",
      right: "right arrow",
    }),
    2: {},
    3: {},
  };
  window.EJS_ready = () => {
    elements.emulatorHelp.textContent = "Hazır · Kontrolleri alt araç çubuğundan değiştirebilirsin";
  };
  window.EJS_onExit = () => window.location.reload();
}

function showLauncherError(message) {
  elements.emulatorScreen.hidden = true;
  elements.launcher.hidden = false;
  document.body.style.overflow = "";
  elements.startButton.disabled = !selectedRom;
  emulatorStarted = false;
  setValidation(message, "error");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startEmulator() {
  if (!selectedRom || emulatorStarted) return;

  emulatorStarted = true;
  elements.startButton.disabled = true;
  elements.launcher.hidden = true;
  elements.emulatorScreen.hidden = false;
  document.body.style.overflow = "hidden";

  romObjectUrl = URL.createObjectURL(selectedRom);
  configureEmulator();

  const loader = document.createElement("script");
  loader.src = `${EMULATOR_DATA_PATH}loader.js`;
  loader.async = true;
  loader.dataset.emulatorLoader = "true";
  loader.addEventListener("error", () => {
    showLauncherError("Emülatör indirilemedi. İnternet bağlantını kontrol edip tekrar dene.");
  });
  document.body.append(loader);
}

function connectedGamepads() {
  if (!navigator.getGamepads) return [];
  return Array.from(navigator.getGamepads()).filter(Boolean);
}

function updateGamepadStatus() {
  const pads = connectedGamepads();
  const status = elements.gamepadStatus.parentElement;
  status.classList.toggle("active", pads.length > 0);
  elements.gamepadStatus.textContent = pads.length
    ? `${Math.min(pads.length, 2)} oyun kolu bağlı`
    : "Oyun kolu bekleniyor";

  [elements.padOne, elements.padTwo].forEach((slot, index) => {
    const pad = pads[index];
    slot.classList.toggle("connected", Boolean(pad));
    slot.lastChild.textContent = pad
      ? `P${index + 1} — ${pad.id.slice(0, 34)}`
      : `P${index + 1} — Bağlı değil`;
  });
}

elements.romInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) void chooseRom(file);
});

elements.dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    elements.romInput.click();
  }
});

["dragenter", "dragover"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("dragging");
  });
});

elements.dropZone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (file) void chooseRom(file);
});

elements.startButton.addEventListener("click", startEmulator);
elements.exitButton.addEventListener("click", () => window.location.reload());
window.addEventListener("gamepadconnected", updateGamepadStatus);
window.addEventListener("gamepaddisconnected", updateGamepadStatus);
window.addEventListener("beforeunload", () => {
  if (romObjectUrl) URL.revokeObjectURL(romObjectUrl);
});

updateGamepadStatus();
