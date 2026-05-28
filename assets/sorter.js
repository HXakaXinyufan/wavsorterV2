import TripleSBiasSorter from "./sorter-class.js";
import { memberData } from "./member-data.js";

const html = (strings, ...values) =>
  strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");

let sorter;
let historyStack = []; // Added history stack
const FLIP_TRANSITION_MS = 200;

const SUN_SVG = '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
const MOON_SVG = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';

function setThemeIcon(isDarkMode) {
  document.querySelector(".theme-toggle-icon svg").innerHTML = isDarkMode ? SUN_SVG : MOON_SVG;
}

function toggleDarkMode() {
  const isDarkMode = document.body.classList.toggle("dark-mode");
  const dmText = document.getElementById("dark-mode-text");
  if (dmText) dmText.textContent = isDarkMode ? "Light Mode" : "#DarkMode";
  setThemeIcon(isDarkMode);
  localStorage.setItem("darkMode", isDarkMode);
  if (sorter && !sorter.isComplete()) showFinal({ skipIncrement: true });
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
  els.undoBtn = document.getElementById("undo-btn");
  els.bgMusic = document.getElementById("bg-music");
  els.darkModeBtn = document.getElementById("dark-mode-btn");
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
  const memberNames = Object.keys(memberData);
  els.checkboxContainer.innerHTML = "";
  memberNames.forEach(name => {
    const label = document.createElement("label");
    label.className = "checkbox-item";
    label.innerHTML = `<input type="checkbox" class="member-checkbox" value="${name}" checked> <span>${name}</span>`;
    els.checkboxContainer.appendChild(label);
  });

  els.btnSelectAll.addEventListener("click", () => document.querySelectorAll(".member-checkbox").forEach(cb => cb.checked = true));
  els.btnClearAll.addEventListener("click", () => document.querySelectorAll(".member-checkbox").forEach(cb => cb.checked = false));

  els.btnStartSort.addEventListener("click", () => {
    const selectedMembers = Array.from(document.querySelectorAll('.member-checkbox')).filter(cb => cb.checked).map(cb => cb.value);
    if (selectedMembers.length < 2) { alert("Please select at least 2 WAVs!"); return; }
    if (!hasMusicStarted && els.bgMusic) { hasMusicStarted = true; els.bgMusic.play().catch(e => console.warn(e)); }
    sorter = new TripleSBiasSorter(selectedMembers, memberData);
    sorter.reset();
    historyStack = []; // Reset history on start
    els.selectionScreen.style.display = "none";
    els.pageSorter.style.display = "block";
    showFinal();
  });

  els.optionA.addEventListener("click", () => handleSort("A"));
  els.optionB.addEventListener("click", () => handleSort("B"));
  els.undoBtn.addEventListener("click", () => {
    if (historyStack.length > 0) {
      const previousState = historyStack.pop();
      Object.assign(sorter, previousState);
      showFinal({ skipIncrement: true });
    }
  });

  if (els.darkModeBtn) els.darkModeBtn.addEventListener("click", toggleDarkMode);
  if (els.showMore) els.showMore.addEventListener("click", toggleResult);
});

let isAnimating = false;
async function handleSort(preference) {
  if (sorter.isComplete() || isAnimating) return;
  
  // Save state before changing
  historyStack.push(JSON.parse(JSON.stringify(sorter)));

  isAnimating = true;
  document.body.classList.add("is-animating");

  if (preference === "A") sorter.preferMemberA();
  else if (preference === "B") sorter.preferMemberB();
  else sorter.declareTie();

  if (sorter.isComplete()) {
    updateProgressDisplay(sorter.getProgress());
    showResult();
  } else {
    await showFinal({ selectedFlag: preference });
  }
  isAnimating = false;
  document.body.classList.remove("is-animating");
}

let showingExpandedResults = false;
function toggleResult() {
  showingExpandedResults = !showingExpandedResults;
  showResult({ expand: showingExpandedResults });
}

function showResult({ expand = false } = {}) {
  const sortedMembers = sorter.getSortedMembers();
  const limit = expand ? 50 : 30;
  const iterCount = Math.min(limit, sortedMembers.length);
  const items = [];
  let ranking = 1;
  let sameRank = 1;

  for (let i = 0; i < iterCount; i++) {
    items.push(html`<li><span class="number">${ranking}</span> ${sortedMembers[i]}</li>`);
    if (i < iterCount - 1) {
      if (sorter.equal[i] == i + 1) sameRank++;
      else { ranking += sameRank; sameRank = 1; }
    }
  }

  els.battleResult.innerHTML = html`<div class="results-list"><h2>Bias Ranking Result (Top ${iterCount})</h2><ul>${items.join("")}</ul></div>`;
  els.pageSorter.style.display = "none";
  if (els.showMore) {
    if (sortedMembers.length > 30) {
      els.showMore.style.display = "inline-block";
      els.showMore.innerText = expand ? "Show Top 30" : `Show Top ${Math.min(50, sortedMembers.length)}`;
    } else {
      els.showMore.style.display = "none";
    }
  }
}

function updateProgressDisplay(progress) {
  const heartCount = 5;
  const filledHearts = Math.floor((progress.progressPercent / 100) * heartCount);
  els.battleNumber.innerHTML = html`<strong>Battle #${progress.currentQuestion}</strong><br />${"\u2665".repeat(filledHearts)}${"\u2661".repeat(heartCount - filledHearts)} ${progress.progressPercent}% sorted`;
}

function updateOptionContent(optionElement, memberName, memberIndex) {
  optionElement.innerHTML = toNameFace(memberName);
  optionElement.style.setProperty("--member-color", "#f87fff"); 
  optionElement.dataset.memberIndex = memberIndex;
}

async function animateElement(element, ...animationClasses) {
  return new Promise((resolve) => {
    const onAnimationEnd = (e) => { if (e.target === element) { element.removeEventListener("transitionend", onAnimationEnd); resolve(); } };
    element.addEventListener("transitionend", onAnimationEnd);
    element.classList.add(...animationClasses);
    setTimeout(resolve, FLIP_TRANSITION_MS + 50);
  });
}

async function animateCardUpdate(card, nextMemberName, nextMemberIndex, isSelected, forceUpdate = false) {
  const currentMemberIndex = card.dataset.memberIndex != null ? parseInt(card.dataset.memberIndex, 10) : -1;
  const contentChanged = forceUpdate || currentMemberIndex !== nextMemberIndex;
  card.classList.remove("fade-out", "fade-in", "flip-out", "flip-in", "flip-ready", "selected-glow");
  if (isSelected) card.classList.add("selected-glow");
  if (contentChanged && currentMemberIndex !== -1) {
    await animateElement(card, "flip-out");
    card.classList.remove("selected-glow");
    updateOptionContent(card, nextMemberName, nextMemberIndex);
    card.classList.add("flip-ready");
    card.getBoundingClientRect();
    card.classList.remove("flip-ready");
    await animateElement(card, "flip-in");
  } else {
    updateOptionContent(card, nextMemberName, nextMemberIndex);
    card.style.visibility = "visible";
    card.style.opacity = 1;
  }
  card.classList.remove("selected-glow", "flip-out", "flip-in", "flip-ready");
}

async function showFinal({ skipIncrement = false, selectedFlag = "" } = {}) {
  if (!skipIncrement) updateProgressDisplay(sorter.getProgress());
  const comparison = sorter.getCurrentComparison();
  await Promise.all([
    animateCardUpdate(els.optionA, comparison.memberAName, comparison.memberA, selectedFlag === "A", skipIncrement),
    animateCardUpdate(els.optionB, comparison.memberBName, comparison.memberB, selectedFlag === "B", skipIncrement),
  ]);
}
