// =========================================================
// Audio — touchdown stinger (animal sounds) + menu music + game music
// =========================================================

// ── Menu music ────────────────────────────────────────────
const menuMusic = document.getElementById("menuMusic");
const MENU_MUSIC_BASE = 0.5;

let _menuMusicState = null; // "playing" | "stopped"

function startMenuMusic() {
  stopGameMusic();
  if (_menuMusicState === "playing") return;
  _menuMusicState = "playing";
  menuMusic.currentTime = 0;
  menuMusic.play().catch(() => {});
}

function stopMenuMusic() {
  if (_menuMusicState === "stopped") return;
  _menuMusicState = "stopped";
  menuMusic.pause();
  menuMusic.currentTime = 0;
}

// ── Game / Passing / Play mode music ──────────────────────
const gameMusic = document.getElementById("gameMusic");
const GAME_MUSIC_BASE = 0.45;

let _gameMusicState = null;

// Looping uses the element's `loop` attribute (see index.html) so the decoder can
// restart without the gap that a manual `ended` → currentTime=0 → play() causes.

function startGameMusic() {
  stopMenuMusic();
  if (_gameMusicState === "playing") return;
  _gameMusicState = "playing";
  gameMusic.currentTime = 0;
  gameMusic.play().catch(() => {});
}

function stopGameMusic() {
  if (_gameMusicState === "stopped") return;
  _gameMusicState = "stopped";
  gameMusic.pause();
  gameMusic.currentTime = 0;
}

// Start music on first user interaction (browser autoplay policy)
window.addEventListener("click",    () => { if (typeof game !== "undefined" && game.state === "menu") startMenuMusic(); }, { once: false });
window.addEventListener("keydown",  () => { if (typeof game !== "undefined" && game.state === "menu") startMenuMusic(); }, { once: false });
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const sfxGain = audioCtx.createGain();
sfxGain.connect(audioCtx.destination);

function applyGameSettingsAudio(settings) {
  const src = settings || (typeof loadGameSettings === "function" ? loadGameSettings() : null);
  const musicMult = clamp((src && src.musicVolume != null ? src.musicVolume : 100), 0, 100) / 100;
  const sfxMult = clamp((src && src.sfxVolume != null ? src.sfxVolume : 100), 0, 100) / 100;
  menuMusic.volume = MENU_MUSIC_BASE * musicMult;
  gameMusic.volume = GAME_MUSIC_BASE * musicMult;
  sfxGain.gain.value = sfxMult;
}

applyGameSettingsAudio(typeof loadGameSettings === "function" ? loadGameSettings() : { musicVolume: 100, sfxVolume: 100 });

function resumeAudio() {
  if (audioCtx.state === "suspended") audioCtx.resume();
}

// ── Animal sounds via Web Audio ───────────────────────────

function playHorseNeigh() {
  resumeAudio();
  const now = audioCtx.currentTime;
  const duration = 0.9;

  // Vibrato LFO
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.value = 7;
  lfoGain.gain.value = 60;
  lfo.connect(lfoGain);

  // Main oscillator — sawtooth, sweeping down like a neigh
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(900, now);
  osc.frequency.exponentialRampToValueAtTime(280, now + duration * 0.6);
  osc.frequency.exponentialRampToValueAtTime(420, now + duration * 0.75);
  osc.frequency.exponentialRampToValueAtTime(200, now + duration);
  lfoGain.connect(osc.frequency);

  // Bandpass filter to make it less harsh
  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 600;
  filter.Q.value = 1.5;

  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);

  lfo.start(now);
  osc.start(now);
  osc.stop(now + duration);
  lfo.stop(now + duration);
}

function playBunnySqueak() {
  resumeAudio();
  const now = audioCtx.currentTime;

  // Two short squeaks
  [0, 0.18].forEach(offset => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1600, now + offset);
    osc.frequency.exponentialRampToValueAtTime(900, now + offset + 0.13);

    gain.gain.setValueAtTime(0.3, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.13);

    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now + offset);
    osc.stop(now + offset + 0.14);
  });
}

// ── Touchdown stinger (animal only; no voice) ─────────────

function playTouchdownAudio(scorer) {
  resumeAudio();
  if (scorer === allyHorse) {
    playHorseNeigh();
  } else {
    // Barnaby is a bunny
    playBunnySqueak();
  }
}

/** Urgent "breaking news" style tones when the pass is picked. */
function playInterceptionAlertAudio() {
  resumeAudio();
  const now = audioCtx.currentTime;
  [0, 0.12, 0.24].forEach((t, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(i % 2 === 0 ? 880 : 660, now + t);
    gain.gain.setValueAtTime(0.2, now + t);
    gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.1);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(now + t);
    osc.stop(now + t + 0.11);
  });
}

function playMudThudAudio() {
  resumeAudio();
  const now = audioCtx.currentTime;
  const bufferSize = audioCtx.sampleRate * 0.15;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
  }
  const src = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  filter.type = "lowpass";
  filter.frequency.value = 280;
  gain.gain.setValueAtTime(0.45, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  src.buffer = buffer;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  src.start(now);
}

/** Bee buzz + mic squeal for sack celebration. */
function playSackBuzzAudio() {
  resumeAudio();
  const now = audioCtx.currentTime;
  const buzz = audioCtx.createOscillator();
  const bg = audioCtx.createGain();
  buzz.type = "sawtooth";
  buzz.frequency.setValueAtTime(110, now);
  buzz.frequency.linearRampToValueAtTime(95, now + 0.35);
  bg.gain.setValueAtTime(0.12, now);
  bg.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  buzz.connect(bg);
  bg.connect(sfxGain);
  buzz.start(now);
  buzz.stop(now + 0.42);

  const squeal = audioCtx.createOscillator();
  const sg = audioCtx.createGain();
  squeal.type = "sine";
  squeal.frequency.setValueAtTime(2400, now + 0.05);
  squeal.frequency.exponentialRampToValueAtTime(400, now + 0.2);
  sg.gain.setValueAtTime(0, now + 0.05);
  sg.gain.linearRampToValueAtTime(0.18, now + 0.08);
  sg.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  squeal.connect(sg);
  sg.connect(sfxGain);
  squeal.start(now + 0.05);
  squeal.stop(now + 0.25);
}
