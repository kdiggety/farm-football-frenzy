// =========================================================
// Audio — touchdown announcement + animal sounds + menu music + game music
// =========================================================

// ── Menu music ────────────────────────────────────────────
const menuMusic = document.getElementById("menuMusic");
menuMusic.volume = 0.5;

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
gameMusic.volume = 0.45;

let _gameMusicState = null;

function shouldPlayGameMusic() {
  if (typeof game === "undefined") return false;
  if (game.mode !== "game" && game.mode !== "passing" && game.mode !== "play") return false;
  if (game.state === "menu") return false;
  return true;
}

// Replay when the track ends (loop attr would block "ended", so we handle it here)
gameMusic.addEventListener("ended", () => {
  if (_gameMusicState !== "playing" || !shouldPlayGameMusic()) return;
  gameMusic.currentTime = 0;
  gameMusic.play().catch(() => {});
});

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
  gain.connect(audioCtx.destination);

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
    gain.connect(audioCtx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.14);
  });
}

// ── Touchdown voice announcement ──────────────────────────

// Pre-load voices list (browsers load this async)
let _voices = [];
function loadVoices() {
  _voices = speechSynthesis.getVoices();
}
if (window.speechSynthesis) {
  speechSynthesis.addEventListener("voiceschanged", loadVoices);
  loadVoices();
}

function pickBestVoice(voices) {
  // Prefer enhanced / premium / neural voices — they sound far more natural
  return (
    voices.find(v => /en[-_]US/i.test(v.lang) && /enhanced|premium|neural/i.test(v.name)) ||
    voices.find(v => /en[-_]US/i.test(v.lang) && /google/i.test(v.name)) ||
    voices.find(v => /en[-_]US/i.test(v.lang) && /samantha|alex|tom|nicky|monica/i.test(v.name)) ||
    voices.find(v => /en[-_]US/i.test(v.lang)) ||
    voices.find(v => /en/i.test(v.lang))
  );
}

function sayTouchdown() {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();

  // Ellipses and commas create natural breath pauses in most TTS engines
  const phrases = [
    "Well... hot dog. TOUCHDOWN, y'all!",
    "Yeeee-haw! That's a TOUCHDOWN, baby!",
    "Oh my goodness... he's in! TOUCHDOWN!",
    "And... he did it! TOUCHDOWN, partner!",
    "Hoo-wee... that right there... is a TOUCHDOWN!"
  ];
  const text = phrases[Math.floor(Math.random() * phrases.length)];
  const utter = new SpeechSynthesisUtterance(text);

  // Slight random variation each time so it never sounds identical
  utter.rate   = 0.80 + Math.random() * 0.12;
  utter.pitch  = 0.88 + Math.random() * 0.18;
  utter.volume = 1;

  const voices = _voices.length ? _voices : speechSynthesis.getVoices();
  const best = pickBestVoice(voices);
  if (best) utter.voice = best;

  speechSynthesis.speak(utter);
}

// ── Main entry point called on touchdown ─────────────────

function playTouchdownAudio(scorer) {
  resumeAudio();
  sayTouchdown();

  // Small delay so the animal sound comes just after the voice starts
  setTimeout(() => {
    if (scorer === allyHorse) {
      playHorseNeigh();
    } else {
      // Barnaby is a bunny
      playBunnySqueak();
    }
  }, 600);
}
