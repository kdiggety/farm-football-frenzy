// =========================================================
// Constants / Config
// =========================================================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const FIELD = {
  x: 50,
  y: 80,
  width: 860,
  height: 400,
  endZoneWidth: 110
};

// Menu button layout (canvas coordinates) for hit testing
const MENU_BUTTONS = {
  gameMode:    { x: 330, y: 260, w: 300, h: 56 },
  passingMode: { x: 330, y: 340, w: 300, h: 56 }
};

// Pause overlay menu (shown when Escape is pressed during a game)
const PAUSE_MENU_BUTTONS = {
  resume:  { x: 330, y: 260, w: 300, h: 56 },
  home:    { x: 330, y: 340, w: 300, h: 56 }
};

const CONFIG = {
  winScore: 5,
  playerRadius: 20,
  ballRadius: 9,
  playerSpeed: 185.1609375,
  cpuSpeed: 112.5, // Slightly slower than player
  possessionPickupLockMs: 220,
  scorePauseMs: 1400,
  stealDistanceMultiplier: 0.8,
  reacquireCooldownMs: 1500,
  passSpeed: 480
};

const COLORS = {
  skyText: "#f9fafb",
  barn: "#8b5a2b",
  fence: "#d1b892",
  straw: "#facc15",
  donkey: "#2563eb",
  pig: "#ec4899",
  horse: "#f97316",
  sidekickDonkey: "#22c55e",
  ball: "#8b4513",
  white: "#f9fafb",
  black: "#111827",
  shadow: "rgba(0,0,0,0.25)",
  leftEndZone: "#c2410c",
  rightEndZone: "#1d4ed8",
  field: "#2f7d32",
  fieldStripe: "#3d9140",
  line: "#eef2ff"
};

// =========================================================
// Game State
// =========================================================
const game = {
  state: "menu", // "menu" | "playing" | "scorePause" | "gameOver" | "paused" | "pauseMenu"
  stateBeforePauseMenu: null, // "playing" | "paused" | "gameOver" | "scorePause" when state === "pauseMenu"
  mode: null,   // "game" | "passing" (set when leaving menu)
  winner: null,
  scorePauseTimer: 0,
  scoredBy: null,
  possessionLockTimer: 0,
  lastTime: 0,
  reacquireCooldownP1: 0,
  reacquireCooldownP2: 0,
  mouseX: 0,
  mouseY: 0
};

const keys = {};

const player1 = {
  id: "player1",
  name: "Barnaby the Donkey",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.playerSpeed,
  color: COLORS.donkey,
  score: 0
};

const player2 = {
  id: "player2",
  name: "Professor Pig",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.cpuSpeed,
  color: COLORS.pig,
  score: 0
};

const ball = {
  x: 0,
  y: 0,
  radius: CONFIG.ballRadius,
  carrier: null, // null | player1 | player2
  inFlight: false,
  targetX: 0,
  targetY: 0
};

const allyHorse = {
  id: "allyHorse",
  name: "Sir Neigh-a-Lot",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.playerSpeed - 25,
  color: COLORS.horse
};

const allyDonkey = {
  id: "allyDonkey",
  name: "Deputy Hee-Haw",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.cpuSpeed,
  color: COLORS.sidekickDonkey
};

