import TripleSBiasSorter from "./sorter-class.js";
import { memberData } from "./member-data.js";

const html = (strings, ...values) =>
  strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");

let sorter; // We will initialize this AFTER they click start

const FLIP_TRANSITION_MS = 200;

const SUN_SVG =
  '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
const MOON_SVG =
  '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';

function setThemeIcon(isDarkMode) {
  document.querySelector(".theme-toggle-icon svg").innerHTML = isDarkMode
    ? SUN_SVG
    : MOON_SVG;
}

function toggleDarkMode() {
  const isDarkMode = document.body.classList.toggle("dark-mode");
  const dmText = document.getElementById("dark-mode-text");
  if (dmText) {
    dmText.textContent = isDarkMode ? "Light Mode" : "#DarkMode";
  }
  setThemeIcon(isDarkMode);
  localStorage.setItem("darkMode", isDarkMode);
  
  if (sorter && !sorter.isComplete()) {
      showFinal({ skipIncrement: true });
  }
}

function toNameFace(mem) {
  return html`
    <div class="photocard-info no-image">
      <div class="member-name">${mem}</div>
    </div>`;
}

let els = {};
let hasMusicStarted = false;

function cacheElements() {
  els.optionA = document.getElementById("optionA");
  els.optionB = document.getElementById("optionB");
  els.battleNumber = document.getElementById("battleNumber");
  els.battleResult = document.getElementById("battleResult");
  els.pageSorter = document.getElementById("page-sorter");
  els.selectionScreen = document.getElementById("selection-screen");
  els.checkboxContainer = document.getElementById("checkbox-container");
  els.btnSelectAll = document.getElementById("btn-select-all");
  els.btnClearAll = document.getElementById("btn-clear-all");
  els.btnStartSort = document.getElementById("btn-start-sort");
  els.showMore = document.getElementById("showMore");
  els.tweetButton = document.getElementById("tweet-button");
  els.bgMusic = document.getElementById("bg-music");
  els.darkModeBtn = document.getElementById("dark-mode-btn");
}

function populateCheckboxes() {
  const memberNames = Object.keys(memberData);
  els.checkboxContainer.innerHTML = "";
  
  memberNames.forEach(name => {
    const label = document.createElement("label");
    label.className = "checkbox-item";
    label.innerHTML = `
      <input type="checkbox" class="member-checkbox" value="${name}" checked>
      <span>${name}</span>
    `;
    els.checkboxContainer.appendChild(label);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  cacheElements();

  const savedDarkMode = localStorage.getItem("darkMode");
  if (savedDarkMode === "true") {
    document.body.classList.add("dark-mode");
    const dmText = document.getElementById("dark-mode-text");
    if (dmText) dmText.textContent = "Light Mode";
    setThemeIcon(true);
  }

  // Generate the Selection Grid
  populateCheckboxes();

  // Selection Controls
  els.btnSelectAll.addEventListener("click", () => {
    document.querySelectorAll(".member-checkbox").forEach(cb => cb.checked = true);
  });
  
  els.btnClearAll.addEventListener("click", () => {
    document.querySelectorAll(".member-checkbox").forEach(cb => cb.checked = false);
  });

  // START SORTING BUTTON
  els.btnStartSort.addEventListener("click", () => {
    const checkboxes = document.querySelectorAll('.member-checkbox');
    const selectedMembers = [];
    checkboxes.forEach(cb => {
      if (cb.checked) selectedMembers.push(cb.value);
    });

    if (selectedMembers.length < 2) {
      alert("Please select at least 2 WAVs to start a battle!");
      return;
    }

    // Trigger Music
    if (!hasMusicStarted && els.bgMusic) {
      hasMusicStarted = true;
      els.bgMusic.play().catch(e => console.warn("Audio blocked:", e));
    }

    // Initialize Algorithm with Custom Selection
    sorter = new TripleSBiasSorter(selectedMembers, memberData);
    sorter.reset();

    // Swap UI Screens
    els.selectionScreen.style.display = "none";
    els.pageSorter.style.display = "block";
    
    showFinal();
  });

  // Battle Listeners
  els.optionA.addEventListener("click", () => handleSort("A"));
  els.optionB.addEventListener("click", () => handleSort("B"));
  
  if (els.darkModeBtn) {
    els.darkModeBtn.addEventListener("click", toggleDarkMode);
  }

  // --- Music Playlist Logic ---
  const playlist = [
    "Beam.mp3", "Chiyu.mp3", "Deju-Vu.mp3", "Firework Diary.mp3",
    "Friend Zone.mp3", "Generation.mp3", "Inner Dance.mp3", "Love Child.mp3",
    "Moto Princess.mp3", "Persona.mp3", "Seoul Sonyo Sound.mp3",
    "Speed Love.mp3", "Touch.mp3", "Vision.mp3", "White Soul Sneakers.mp3"
  ];

  for (let i = playlist.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
  }

  let currentSongIndex = 0;
  if (els.bgMusic) {
    els.bgMusic.volume = 0.05; 
    els.bgMusic.src = playlist[currentSongIndex]; 
  }

  if (els.bgMusic) {
    els.bgMusic.addEventListener("ended", () => {
      currentSongIndex++;
      if (currentSongIndex >= playlist.length) {
        currentSongIndex = 0;
        for (let i = playlist.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
        }
      }
      els.bgMusic.src = playlist[currentSongIndex];
      els.bgMusic.play().catch(e => console.warn("Next track prevented:", e));
    });
  }
});

let isAnimating = false;

async function handleSort(preference) {
  if (sorter.isComplete() || isAnimating) return;
  
  isAnimating = true;
  document.body.classList.add("is-animating");

  if (preference === "A") {
    sorter.preferMemberA();
  } else if (preference === "B") {
    sorter.preferMemberB();
  } else {
    sorter.declareTie();
  }

  if (sorter.isComplete()) {
    updateProgressDisplay(sorter.getProgress());
    showResult();
  } else {
    await showFinal({ selectedFlag: preference });
  }

  isAnimating = false;
  document.body.classList.remove("is-animating");
}

function showResult() {
  let ranking = 1;
  let sameRank = 1;
  const listResult = [];
  const sortedMembers = sorter.getSortedMembers();

  // Strictly enforce a maximum of 24 results
  const iterCount = Math.min(24, sortedMembers.length);
  const items = [];

  for (let i = 0; i < iterCount; i++) {
    const mem = sortedMembers[i];
    const disp = mem;
    listResult.push(disp);

    items.push(html`<li><span class="number">${ranking}</span> ${disp}</li>`);

    if (i < iterCount - 1) {
      if (sorter.equal[i] == i + 1) {
        sameRank++;
      } else {
        ranking += sameRank;
        sameRank = 1;
      }
    }
  }

  els.battleResult.innerHTML = html`<div class="results-list">
    <h2>Bias Ranking Result (Top ${iterCount})</h2>
    <ul>
      ${items.join("")}
    </ul>
  </div>`;
  
  els.pageSorter.style.display = "none";
  
  // Hide the Show More button permanently
  if (els.showMore) {
    els.showMore.style.display = "none";
  }

  const shareText = `My Top ${iterCount} WAVs Bias Ranking:%0A${listResult.join("%0A")}`;
  els.tweetButton.style.display = "inline-block";
  els.tweetButton.href = `https://twitter.com/intent/tweet?text=${shareText}`;
}

function updateProgressDisplay(progress) {
  const heartCount = 5;
  const filledHearts = Math.floor((progress.progressPercent / 100) * heartCount);
  const solidHeart = "\u2665";
  const emptyHeart = "\u2661";
  const heartDisplay = solidHeart.repeat(filledHearts) + emptyHeart.repeat(heartCount - filledHearts);

  els.battleNumber.innerHTML = html`<strong>Battle #${progress.currentQuestion}</strong><br />${heartDisplay} ${progress.progressPercent}% sorted`;
}

function updateOptionContent(optionElement, memberName, memberIndex) {
  optionElement.innerHTML = toNameFace(memberName);
  optionElement.style.setProperty("--member-color", "#f87fff"); 
  optionElement.dataset.memberIndex = memberIndex;
}

function animateElement(element, ...animationClasses) {
  return new Promise((resolve) => {
    let resolved = false;
    const doResolve = () => {
      if (resolved) return;
      resolved = true;
      element.removeEventListener("transitionend", onAnimationEnd);
      resolve();
    };
    const onAnimationEnd = (e) => {
      if (e.target !== element) return;
      doResolve();
    };
    element.addEventListener("transitionend", onAnimationEnd);
    element.classList.add(...animationClasses);
    setTimeout(doResolve, FLIP_TRANSITION_MS + 50);
  });
}

async function animateCardUpdate(card, nextMemberName, nextMemberIndex, isSelected, forceUpdate = false) {
  const currentMemberIndex = card.dataset.memberIndex != null ? parseInt(card.dataset.memberIndex, 10) : -1;
  const contentChanged = forceUpdate || currentMemberIndex !== nextMemberIndex;

  card.classList.remove("fade-out", "fade-in", "flip-out", "flip-in", "flip-ready", "selected-glow");
  card.style.opacity = "";
  card.style.transform = "";

  if (isSelected) card.classList.add("selected-glow");

  if (contentChanged && currentMemberIndex !== -1) {
    await animateElement(card, "flip-out");
    card.classList.remove("selected-glow");
    updateOptionContent(card, nextMemberName, nextMemberIndex);
    card.classList.remove("flip-out");
    card.classList.add("flip-ready");
    card.getBoundingClientRect();
    card.classList.remove("flip-ready");
    await animateElement(card, "flip-in");
  } else {
    if (currentMemberIndex === -1) {
      updateOptionContent(card, nextMemberName, nextMemberIndex);
      card.style.visibility = "visible";
      card.style.opacity = 1;
    } else {
      await new Promise((resolve) => setTimeout(resolve, FLIP_TRANSITION_MS * 2));
    }
  }

  card.classList.remove("selected-glow", "flip-out", "flip-in", "flip-ready");
  card.style.opacity = "";
  card.style.transform = "";
}

async function showFinal({ skipIncrement = false, selectedFlag = "" } = {}) {
  if (!skipIncrement) updateProgressDisplay(sorter.getProgress());

  const comparison = sorter.getCurrentComparison();
  const forceUpdate = skipIncrement;

  await Promise.all([
    animateCardUpdate(els.optionA, comparison.memberAName, comparison.memberA, selectedFlag === "A", forceUpdate),
    animateCardUpdate(els.optionB, comparison.memberBName, comparison.memberB, selectedFlag === "B", forceUpdate),
  ]);
}
