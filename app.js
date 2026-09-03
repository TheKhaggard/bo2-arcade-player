import { AudioEngine } from "./src/audio.js";
import { ArenaGame } from "./src/game.js";
import { InputManager } from "./src/input.js";

const elements = {
  canvas: document.querySelector("#gameCanvas"),
  loadingOverlay: document.querySelector("#loadingOverlay"),
  loadingProgress: document.querySelector("#loadingProgress"),
  titleOverlay: document.querySelector("#titleOverlay"),
  selectOverlay: document.querySelector("#selectOverlay"),
  resultOverlay: document.querySelector("#resultOverlay"),
  selectionEyebrow: document.querySelector("#selectionEyebrow"),
  selectionStatus: document.querySelector("#selectionStatus"),
  fighterCards: [...document.querySelectorAll("[data-character]")],
  modeButtons: [...document.querySelectorAll("[data-mode]")],
  fightButton: document.querySelector("#fightButton"),
  backButton: document.querySelector("#backButton"),
  rematchButton: document.querySelector("#rematchButton"),
  menuButton: document.querySelector("#menuButton"),
  winnerName: document.querySelector("#winnerName"),
  winnerSubtitle: document.querySelector("#winnerSubtitle"),
  soundButton: document.querySelector("#soundButton"),
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

function showOverlay(target) {
  [elements.loadingOverlay, elements.titleOverlay, elements.selectOverlay, elements.resultOverlay]
    .forEach((overlay) => { overlay.hidden = overlay !== target; });
}

function updateRoster() {
  for (const card of elements.fighterCards) {
    const character = card.dataset.character;
    card.classList.toggle("selected-p1", character === selections.playerOne);
    card.classList.toggle("selected-p2", character === selections.playerTwo);
  }

  if (!selections.playerOne) {
    elements.selectionEyebrow.textContent = "OYUNCU 1";
    elements.selectionStatus.textContent = "İlk dövüşçüyü seç";
  } else if (selectedMode === "versus" && !selections.playerTwo) {
    elements.selectionEyebrow.textContent = "OYUNCU 2";
    elements.selectionStatus.textContent = "Rakip dövüşçüyü seç";
  } else if (selectedMode === "solo") {
    elements.selectionEyebrow.textContent = "TEK OYUNCU";
    elements.selectionStatus.textContent = "Rakibin hazır. Arena seni bekliyor.";
  } else {
    elements.selectionEyebrow.textContent = "VERSUS";
    elements.selectionStatus.textContent = "İki savaşçı da hazır.";
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
  if (!selections.playerOne) {
    selections.playerOne = character;
    if (selectedMode === "solo") selections.playerTwo = character === "riven" ? "veyra" : "riven";
  } else if (selectedMode === "versus" && !selections.playerTwo) {
    if (character === selections.playerOne) {
      elements.selectionStatus.textContent = "Bu karşılaşmada diğer dövüşçüyü seç.";
      return;
    }
    selections.playerTwo = character;
  } else {
    selections = {
      playerOne: character,
      playerTwo: selectedMode === "solo" ? (character === "riven" ? "veyra" : "riven") : null,
    };
  }
  updateRoster();
}

function startFight() {
  if (!selections.playerOne || !selections.playerTwo) return;
  showOverlay(null);
  game.startMatch({
    mode: selectedMode,
    playerOne: selections.playerOne,
    playerTwo: selections.playerTwo,
  });
}

function returnToMenu() {
  game.showAttract();
  showOverlay(elements.titleOverlay);
}

const game = new ArenaGame(elements.canvas, input, audio, {
  onMatchEnd: ({ winner, score }) => {
    elements.winnerName.textContent = `${winner.name} WINS`;
    elements.winnerSubtitle.textContent = `${winner.epithet} · ${score}`;
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
elements.fightButton.addEventListener("click", startFight);
elements.backButton.addEventListener("click", returnToMenu);
elements.menuButton.addEventListener("click", returnToMenu);
elements.rematchButton.addEventListener("click", () => {
  void audio.unlock();
  showOverlay(null);
  game.rematch();
});

elements.soundButton.addEventListener("click", () => {
  void audio.unlock();
  const enabled = audio.toggle();
  elements.soundButton.setAttribute("aria-pressed", String(!enabled));
  elements.soundButton.innerHTML = `<i class="red-lamp"></i> SES: ${enabled ? "AÇIK" : "KAPALI"}`;
});

elements.fullscreenButton.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await elements.screen.requestFullscreen();
  } catch {
    elements.fullscreenButton.textContent = "TAM EKRAN DESTEKLENMİYOR";
  }
});

document.addEventListener("fullscreenchange", () => {
  elements.fullscreenButton.innerHTML = `<i class="amber-lamp"></i> ${document.fullscreenElement ? "TAM EKRANDAN ÇIK" : "TAM EKRAN"}`;
});

elements.helpButton.addEventListener("click", () => {
  const expanded = elements.helpButton.getAttribute("aria-expanded") === "true";
  elements.helpButton.setAttribute("aria-expanded", String(!expanded));
  elements.instructionPanel.hidden = expanded;
});

function updatePadStatus() {
  const count = input.connectedPads().length;
  elements.padStatus.innerHTML = `<i></i> ${count ? `${count} OYUN KOLU BAĞLI` : "OYUN KOLU BEKLENİYOR"}`;
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
  elements.loadingOverlay.querySelector("p").textContent = "ARENA YÜKLENEMEDİ";
  elements.loadingOverlay.querySelector("p").title = error.message;
});
