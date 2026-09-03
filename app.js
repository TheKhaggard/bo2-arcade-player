import { AudioEngine } from "./src/audio.js";
import { CHARACTERS, STAGES } from "./src/config.js";
import { ArenaGame } from "./src/game.js";
import { InputManager } from "./src/input.js";

const elements = {
  canvas: document.querySelector("#gameCanvas"),
  loadingOverlay: document.querySelector("#loadingOverlay"),
  loadingProgress: document.querySelector("#loadingProgress"),
  titleOverlay: document.querySelector("#titleOverlay"),
  selectOverlay: document.querySelector("#selectOverlay"),
  stageOverlay: document.querySelector("#stageOverlay"),
  resultOverlay: document.querySelector("#resultOverlay"),
  selectionEyebrow: document.querySelector("#selectionEyebrow"),
  selectionStatus: document.querySelector("#selectionStatus"),
  playerOneChoice: document.querySelector("#playerOneChoice"),
  playerTwoChoice: document.querySelector("#playerTwoChoice"),
  playerTwoLabel: document.querySelector("#playerTwoLabel"),
  stagePlayerOne: document.querySelector("#stagePlayerOne"),
  stagePlayerTwo: document.querySelector("#stagePlayerTwo"),
  stageButtons: [...document.querySelectorAll("[data-stage]")],
  fighterCards: [...document.querySelectorAll("[data-character]")],
  modeButtons: [...document.querySelectorAll("[data-mode]")],
  fightButton: document.querySelector("#fightButton"),
  backButton: document.querySelector("#backButton"),
  stageBackButton: document.querySelector("#stageBackButton"),
  rematchButton: document.querySelector("#rematchButton"),
  menuButton: document.querySelector("#menuButton"),
  winnerName: document.querySelector("#winnerName"),
  winnerSubtitle: document.querySelector("#winnerSubtitle"),
  soundButton: document.querySelector("#soundButton"),
  pauseButton: document.querySelector("#pauseButton"),
  matchPauseButton: document.querySelector("#matchPauseButton"),
  fullscreenButton: document.querySelector("#fullscreenButton"),
  helpButton: document.querySelector("#helpButton"),
  instructionPanel: document.querySelector("#instructionPanel"),
  padStatus: document.querySelector("#padStatus"),
  screen: document.querySelector("#screen"),
};

const input = new InputManager();
const audio = new AudioEngine();
let selectedMode = "solo";
let selections = { playerOne: null, playerTwo: null };
const characterIds = Object.keys(CHARACTERS);
const stageIds = Object.keys(STAGES);
let selectedStage = null;

function randomOpponent(excludedCharacter) {
  const candidates = characterIds.filter((character) => character !== excludedCharacter);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function randomStage() {
  return stageIds[Math.floor(Math.random() * stageIds.length)];
}

function showOverlay(target) {
  [elements.loadingOverlay, elements.titleOverlay, elements.selectOverlay, elements.stageOverlay, elements.resultOverlay]
    .forEach((overlay) => { overlay.hidden = overlay !== target; });
}

function updateRoster() {
  for (const card of elements.fighterCards) {
    const character = card.dataset.character;
    card.classList.toggle("selected-p1", character === selections.playerOne);
    card.classList.toggle("selected-p2", character === selections.playerTwo);
  }

  elements.playerOneChoice.textContent = selections.playerOne ? CHARACTERS[selections.playerOne].name : "—";
  elements.playerTwoChoice.textContent = selections.playerTwo ? CHARACTERS[selections.playerTwo].name : (selectedMode === "solo" ? "RANDOM" : "—");
  elements.playerTwoLabel.textContent = "P2";

  if (!selections.playerOne) {
    elements.selectionEyebrow.textContent = "PLAYER ONE";
    elements.selectionStatus.textContent = "Select your warrior";
  } else if (selectedMode === "versus" && !selections.playerTwo) {
    elements.selectionEyebrow.textContent = "PLAYER TWO";
    elements.selectionStatus.textContent = "Choose the opposing warrior";
  } else if (selectedMode === "solo") {
    elements.selectionEyebrow.textContent = "SINGLE PLAYER";
    elements.selectionStatus.textContent = `P2 rival drawn: ${CHARACTERS[selections.playerTwo].name}`;
  } else {
    elements.selectionEyebrow.textContent = "VERSUS";
    elements.selectionStatus.textContent = "Both warriors are ready";
  }
  elements.fightButton.disabled = !(selections.playerOne && selections.playerTwo);
}

function openCharacterSelect(mode) {
  selectedMode = mode;
  selections = { playerOne: null, playerTwo: null };
  updateRoster();
  showOverlay(elements.selectOverlay);
}

function chooseCharacter(character) {
  if (selectedMode === "solo") {
    selections.playerOne = character;
    selections.playerTwo = randomOpponent(character);
  } else if (!selections.playerOne) {
    selections.playerOne = character;
  } else if (!selections.playerTwo) {
    if (character === selections.playerOne) {
      elements.selectionStatus.textContent = "Choose a different warrior for this match";
      return;
    }
    selections.playerTwo = character;
  } else {
    selections = { playerOne: character, playerTwo: null };
  }
  updateRoster();
}

function openStageSelect() {
  if (!selections.playerOne || !selections.playerTwo) return;
  elements.stagePlayerOne.textContent = CHARACTERS[selections.playerOne].name;
  elements.stagePlayerTwo.textContent = CHARACTERS[selections.playerTwo].name;
  showOverlay(elements.stageOverlay);
}

function startFight(stageChoice) {
  if (!selections.playerOne || !selections.playerTwo) return;
  selectedStage = stageChoice === "random" ? randomStage() : stageChoice;
  showOverlay(null);
  void audio.startMusic(selectedStage);
  game.startMatch({
    mode: selectedMode,
    playerOne: selections.playerOne,
    playerTwo: selections.playerTwo,
    stage: selectedStage,
  });
}

function returnToMenu() {
  audio.stopMusic();
  game.showAttract();
  showOverlay(elements.titleOverlay);
}

const game = new ArenaGame(elements.canvas, input, audio, {
  onPauseChange: (paused, available) => {
    audio.setMusicPaused(paused);
    elements.pauseButton.disabled = !available;
    elements.pauseButton.setAttribute("aria-pressed", String(paused));
    elements.pauseButton.innerHTML = `<i class="green-lamp"></i> ${paused ? "RESUME" : "PAUSE"}`;
    elements.matchPauseButton.hidden = !available;
    elements.matchPauseButton.setAttribute("aria-pressed", String(paused));
    elements.matchPauseButton.innerHTML = `<span aria-hidden="true">${paused ? "▶" : "Ⅱ"}</span> ${paused ? "RESUME" : "PAUSE"}`;
  },
  onMatchEnd: ({ winner, score, finisher }) => {
    audio.stopMusic();
    elements.winnerName.textContent = `${winner.name} WINS`;
    elements.winnerSubtitle.textContent = finisher
      ? `${winner.finisher} · OATHBREAKER · ${score}`
      : `${winner.epithet} · ${score}`;
    showOverlay(elements.resultOverlay);
  },
});

elements.modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    void audio.unlock();
    openCharacterSelect(button.dataset.mode);
  });
});
elements.fighterCards.forEach((card) => card.addEventListener("click", () => chooseCharacter(card.dataset.character)));
elements.fightButton.addEventListener("click", openStageSelect);
elements.backButton.addEventListener("click", returnToMenu);
elements.stageBackButton.addEventListener("click", () => showOverlay(elements.selectOverlay));
elements.stageButtons.forEach((button) => button.addEventListener("click", () => startFight(button.dataset.stage)));
elements.menuButton.addEventListener("click", returnToMenu);
elements.rematchButton.addEventListener("click", () => {
  void audio.unlock();
  audio.stopMusic();
  if (selectedMode === "solo") selections.playerTwo = randomOpponent(selections.playerOne);
  openStageSelect();
});

elements.soundButton.addEventListener("click", () => {
  void audio.unlock();
  const enabled = audio.toggle();
  elements.soundButton.setAttribute("aria-pressed", String(!enabled));
  elements.soundButton.innerHTML = `<i class="red-lamp"></i> SOUND: ${enabled ? "ON" : "OFF"}`;
});

elements.pauseButton.addEventListener("click", () => game.togglePause());
elements.matchPauseButton.addEventListener("click", () => game.togglePause());

elements.fullscreenButton.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await elements.screen.requestFullscreen();
  } catch {
    elements.fullscreenButton.textContent = "FULLSCREEN UNAVAILABLE";
  }
});

document.addEventListener("fullscreenchange", () => {
  elements.fullscreenButton.innerHTML = `<i class="amber-lamp"></i> ${document.fullscreenElement ? "EXIT FULLSCREEN" : "FULLSCREEN"}`;
});

elements.helpButton.addEventListener("click", () => {
  const expanded = elements.helpButton.getAttribute("aria-expanded") === "true";
  elements.helpButton.setAttribute("aria-expanded", String(!expanded));
  elements.instructionPanel.hidden = expanded;
});

function updatePadStatus() {
  const count = input.connectedPads().length;
  elements.padStatus.innerHTML = `<i></i> ${count ? `${count} GAMEPAD${count > 1 ? "S" : ""} CONNECTED` : "WAITING FOR GAMEPAD"}`;
  elements.padStatus.classList.toggle("connected", count > 0);
}

window.addEventListener("gamepadconnected", updatePadStatus);
window.addEventListener("gamepaddisconnected", updatePadStatus);
window.setInterval(updatePadStatus, 1200);

game.load((progress) => {
  elements.loadingProgress.style.width = `${Math.round(progress * 100)}%`;
}).then(() => {
  showOverlay(elements.titleOverlay);
  updatePadStatus();
}).catch((error) => {
  elements.loadingOverlay.querySelector("p").textContent = "THE ARENA COULD NOT AWAKEN";
  elements.loadingOverlay.querySelector("p").title = error.message;
});
