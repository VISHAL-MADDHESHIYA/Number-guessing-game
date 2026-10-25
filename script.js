(() => {
  "use strict";

  const DIFFICULTIES = {
    easy:   { min: 1, max: 100, attempts: 8, label: "Easy" },
    medium: { min: 1, max: 250, attempts: 7, label: "Medium" },
    hard:   { min: 1, max: 500, attempts: 6, label: "Hard" }
  };
  const STORAGE_KEY = "numberLabPro.v1";
  const $ = (selector) => document.querySelector(selector);

  const ui = {
    form: $("#guess-form"), input: $("#guess-input"), submit: $("#guess-button"),
    inputHelp: $("#input-help"), rangeMin: $("#range-min"), rangeMax: $("#range-max"),
    inputRange: $(".input-range"), attemptsLeft: $("#attempts-left"),
    hintBox: $("#hint-box"), hintIcon: $("#hint-icon"), hintTitle: $("#hint-title"),
    hintMessage: $("#hint-message"), recent: $("#recent-guesses"),
    progressBar: $("#progress-bar"), progressText: $("#progress-text"),
    difficultyNote: $("#difficulty-note"), bestScore: $("#best-score"),
    bestScoreNote: $("#best-score-note"), winRate: $("#win-rate"),
    winRateNote: $("#win-rate-note"), gamesPlayed: $("#games-played"),
    gamesNote: $("#games-note"), currentStreak: $("#current-streak"),
    streakCount: $("#streak-count"), achievementList: $("#achievement-list"),
    resetStats: $("#reset-stats"), soundToggle: $("#sound-toggle"),
    dialog: $("#result-dialog"), dialogClose: $("#dialog-close"),
    playAgain: $("#play-again"), toastRegion: $("#toast-region")
  };

  const freshStats = () => ({
    games: 0, wins: 0, losses: 0, bestScore: null, currentStreak: 0,
    bestStreak: 0, achievements: [], history: []
  });

  let stats = loadStats();
  let game = {};
  let soundEnabled = false;
  let audioContext = null;
  startGame("easy", false);
  renderStats();
  renderAchievements();

  function loadStats() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== "object") return freshStats();
      const base = freshStats();
      return {
        ...base, ...saved,
        games: nonNegativeInt(saved.games), wins: nonNegativeInt(saved.wins),
        losses: nonNegativeInt(saved.losses), currentStreak: nonNegativeInt(saved.currentStreak),
        bestStreak: nonNegativeInt(saved.bestStreak),
        bestScore: Number.isInteger(saved.bestScore) && saved.bestScore > 0 ? saved.bestScore : null,
        achievements: Array.isArray(saved.achievements) ? saved.achievements.filter(x => typeof x === "string") : [],
        history: Array.isArray(saved.history) ? saved.history.slice(0, 20) : []
      };
    } catch { return freshStats(); }
  }
  function nonNegativeInt(value) { return Number.isInteger(value) && value >= 0 ? value : 0; }
  function saveStats() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); }
    catch { showToast("Stats couldn't be saved in this browser session.", "error"); }
  }
  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function startGame(difficulty = game.difficulty || "easy", announce = true) {
    const config = DIFFICULTIES[difficulty] || DIFFICULTIES.easy;
    game = {
      difficulty, min: config.min, max: config.max, target: randomInt(config.min, config.max),
      maxAttempts: config.attempts, attempts: 0, guesses: [], status: "playing",
      lowerBound: config.min, upperBound: config.max
    };
    ui.rangeMin.textContent = game.min;
    ui.rangeMax.textContent = game.max;
    ui.input.min = game.min;
    ui.input.max = game.max;
    ui.input.value = "";
    ui.input.disabled = false;
    ui.submit.disabled = false;
    ui.inputRange.textContent = `${game.min}—${game.max}`;
    ui.attemptsLeft.textContent = game.maxAttempts;
    ui.difficultyNote.textContent = `${game.min}–${game.max} · ${game.maxAttempts} attempts`;
    ui.inputHelp.textContent = "Enter a whole number within the range.";
    ui.inputHelp.classList.remove("error");
    setHint("✧", "Your first clue is waiting…", `The number is between ${game.min} and ${game.max}. Ready when you are!`, "");
    renderRecent();
    renderProgress();
    document.querySelectorAll(".difficulty").forEach(button => {
      const active = button.dataset.difficulty === difficulty;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (announce) { closeDialog(); showToast(`${config.label} mode ready. Good luck!`); }
  }
  function setHint(icon, title, message, tone = "") {
    ui.hintIcon.textContent = icon;
    ui.hintTitle.textContent = title;
    ui.hintMessage.textContent = message;
    ui.hintBox.className = `hint-box${tone ? ` ${tone}` : ""}`;
  }
  function validateGuess(raw) {
    if (raw.trim() === "") return "Enter a number to make your guess.";
    const value = Number(raw);
    if (!Number.isFinite(value) || !Number.isInteger(value)) return "Please enter a whole number.";
    if (value < game.min || value > game.max) return `Your guess must be between ${game.min} and ${game.max}.`;
    if (game.guesses.some(item => item.value === value)) return "You've already tried that number. Pick a different one.";
    return "";
  }
  function submitGuess(event) {
    event?.preventDefault();
    if (game.status !== "playing") return;
    const raw = ui.input.value;
    const error = validateGuess(raw);
    if (error) {
      ui.inputHelp.textContent = error;
      ui.inputHelp.classList.add("error");
      ui.input.setAttribute("aria-invalid", "true");
      playTone("error");
      ui.input.focus();
      return;
    }
    ui.inputHelp.textContent = "Good guess — here's your clue.";
    ui.inputHelp.classList.remove("error");
    ui.input.removeAttribute("aria-invalid");
    const value = Number(raw);
    const record = { value, result: value === game.target ? "correct" : value < game.target ? "higher" : "lower" };
    game.guesses.unshift(record);
    game.attempts += 1;
    if (value === game.target) {
      game.status = "won";
      setHint("✦", "Code cracked! Excellent work.", `You found ${game.target} in ${game.attempts} ${game.attempts === 1 ? "guess" : "guesses"}.`, "success");
      finishGame(true);
    } else if (game.attempts >= game.maxAttempts) {
      game.status = "lost";
      setHint("⌁", "Out of attempts — mission over.", `The secret number was ${game.target}. Take what you learned into the next round.`, "danger");
      finishGame(false);
    } else {
      const distance = Math.abs(game.target - value);
      const direction = value < game.target ? "higher" : "lower";
      const isClose = distance <= Math.max(3, Math.floor((game.max - game.min) * 0.05));
      if (direction === "higher") game.lowerBound = Math.max(game.lowerBound, value + 1);
      else game.upperBound = Math.min(game.upperBound, value - 1);
      const warmth = isClose ? "You're getting very close!" : `The number is between ${game.lowerBound} and ${game.upperBound}.`;
      setHint(direction === "higher" ? "↑" : "↓", direction === "higher" ? "Think higher." : "Think lower.", `${warmth} ${game.maxAttempts - game.attempts} ${game.maxAttempts - game.attempts === 1 ? "attempt" : "attempts"} remaining.`, isClose ? "warning" : "");
      playTone(direction === "higher" ? "higher" : "lower");
    }
    ui.attemptsLeft.textContent = Math.max(0, game.maxAttempts - game.attempts);
    ui.input.value = "";
    renderRecent();
    renderProgress();
    renderStats();
    ui.input.focus();
  }
  function finishGame(won) {
    stats.games += 1;
    if (won) {
      stats.wins += 1;
      stats.currentStreak += 1;
      stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
      if (stats.bestScore === null || game.attempts < stats.bestScore) stats.bestScore = game.attempts;
      unlock("first-win");
      if (game.attempts <= 3) unlock("sharp-shooter");
      setHint("✦", "Code cracked! Excellent work.", `You found ${game.target} in ${game.attempts} ${game.attempts === 1 ? "guess" : "guesses"}.`, "success");
      playTone("win");
    } else {
      stats.losses += 1;
      stats.currentStreak = 0;
      playTone("loss");
    }
    if (stats.games >= 10) unlock("veteran");
    stats.history.unshift({ won, guesses: game.attempts, difficulty: game.difficulty, date: new Date().toISOString() });
    stats.history = stats.history.slice(0, 20);
    saveStats();
    renderStats();
    renderAchievements();
    ui.input.disabled = true;
    ui.submit.disabled = true;
    window.setTimeout(() => showResult(won), 350);
  }
  function renderRecent() {
    if (!game.guesses.length) {
      ui.recent.innerHTML = '<p class="empty-recent">Your guesses will appear here</p>';
      return;
    }
    ui.recent.replaceChildren();
    game.guesses.slice(0, 3).forEach(item => {
      const chip = document.createElement("div");
      chip.className = `recent-chip ${item.result}`;
      const number = document.createElement("strong");
      number.textContent = item.value;
      const detail = document.createElement("small");
      detail.textContent = item.result === "correct" ? "Correct ✓" : item.result === "higher" ? "↑ Higher" : "↓ Lower";
      chip.append(number, detail);
      ui.recent.append(chip);
    });
  }
  function renderProgress() {
    const used = game.attempts;
    ui.progressBar.style.width = `${Math.min(100, used / game.maxAttempts * 100)}%`;
    ui.progressText.textContent = `${used} / ${game.maxAttempts}`;
  }
  function renderStats() {
    ui.bestScore.textContent = stats.bestScore === null ? "—" : `${stats.bestScore} ${stats.bestScore === 1 ? "guess" : "guesses"}`;
    ui.bestScoreNote.textContent = stats.bestScore === null ? "Win in fewer guesses" : "Your personal best";
    const rate = stats.games ? Math.round(stats.wins / stats.games * 100) : 0;
    ui.winRate.textContent = `${rate}%`;
    ui.winRateNote.textContent = stats.games ? `${stats.wins} wins · ${stats.losses} losses` : "Keep playing to improve";
    ui.gamesPlayed.textContent = stats.games;
    ui.gamesNote.textContent = stats.games === 1 ? "Your journey has started" : "Every guess makes you sharper";
    ui.currentStreak.textContent = `${stats.currentStreak} win ${stats.currentStreak === 1 ? "streak" : "streak"}`;
    ui.streakCount.textContent = stats.currentStreak;
  }
  function unlock(id) {
    if (!stats.achievements.includes(id)) {
      stats.achievements.push(id);
      const names = { "first-win": "First breakthrough", "sharp-shooter": "Sharp shooter", veteran: "Lab veteran" };
      showToast(`Achievement unlocked: ${names[id]}!`, "success");
    }
  }
  function renderAchievements() {
    document.querySelectorAll("[data-achievement]").forEach(card => {
      const unlocked = stats.achievements.includes(card.dataset.achievement);
      card.classList.toggle("unlocked", unlocked);
      const state = card.querySelector(".achievement-state");
      state.textContent = unlocked ? "UNLOCKED ✓" : "LOCKED";
    });
  }
  function showResult(won) {
    $("#result-symbol").textContent = won ? "✦" : "↻";
    $("#result-eyebrow").textContent = won ? "MISSION COMPLETE" : "MISSION FAILED";
    $("#result-title").textContent = won ? "Code cracked!" : "Not this time.";
    $("#result-copy").textContent = won
      ? `Brilliant deduction. You beat ${game.difficulty} mode and found the secret number.`
      : `The secret number was ${game.target}. Reset and put your logic to work again.`;
    $("#result-number").textContent = game.target;
    $("#result-guesses").textContent = game.attempts;
    if (typeof ui.dialog.showModal === "function") ui.dialog.showModal();
  }
  function closeDialog() { if (ui.dialog.open) ui.dialog.close(); }
  function showToast(message, type = "") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    ui.toastRegion.append(toast);
    window.setTimeout(() => toast.remove(), 3200);
  }
  function playTone(kind) {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const tones = { higher: 380, lower: 270, win: 660, loss: 170, error: 130 };
      oscillator.frequency.value = tones[kind] || 330;
      oscillator.type = kind === "win" ? "sine" : "triangle";
      gain.gain.setValueAtTime(0.06, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + (kind === "win" ? .35 : .14));
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + (kind === "win" ? .36 : .15));
      if (kind === "win") window.setTimeout(() => playSingleWinNote(), 100);
    } catch { /* Audio may be unavailable; game remains fully playable. */ }
  }
  function playSingleWinNote() {
    if (!soundEnabled || !audioContext) return;
    try {
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.frequency.value = 880; oscillator.type = "sine";
      gain.gain.setValueAtTime(.04, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .22);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + .23);
    } catch { /* no-op */ }
  }

  ui.form.addEventListener("submit", submitGuess);
  document.querySelectorAll(".difficulty").forEach(button => {
    button.addEventListener("click", () => startGame(button.dataset.difficulty));
  });
  ui.playAgain.addEventListener("click", () => startGame(game.difficulty));
  ui.dialogClose.addEventListener("click", closeDialog);
  ui.dialog.addEventListener("click", event => {
    if (event.target === ui.dialog) closeDialog();
  });
  ui.soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    ui.soundToggle.setAttribute("aria-pressed", String(soundEnabled));
    ui.soundToggle.style.color = soundEnabled ? "var(--cyan)" : "";
    ui.soundToggle.title = soundEnabled ? "Sound on" : "Sound off";
    showToast(soundEnabled ? "Sound effects enabled." : "Sound effects muted.");
    if (soundEnabled) playTone("higher");
  });
  ui.resetStats.addEventListener("click", () => {
    const confirmed = window.confirm("Reset all saved statistics and achievements? This cannot be undone.");
    if (!confirmed) return;
    stats = freshStats();
    saveStats();
    renderStats();
    renderAchievements();
    showToast("Statistics and achievements reset.");
  });
  document.addEventListener("keydown", event => {
    const tag = document.activeElement?.tagName;
    const typing = tag === "INPUT" || tag === "TEXTAREA";
    if (!typing && event.key.toLowerCase() === "r" && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      startGame(game.difficulty);
    }
    if (event.key === "Escape") closeDialog();
  });
})();