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

const CONFIG = {
  winScore: 5,
  playerRadius: 20,
  ballRadius: 9,
  playerSpeed: 250,
  cpuSpeed: 125, // Slightly slower than player
  possessionPickupLockMs: 220,
  scorePauseMs: 1400
};

const COLORS = {
  skyText: "#f9fafb",
  barn: "#8b5a2b",
  fence: "#d1b892",
  straw: "#facc15",
  donkey: "#2563eb",
  pig: "#ec4899",
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
  state: "playing", // "playing" | "scorePause" | "gameOver"
  winner: null,
  scorePauseTimer: 0,
  scoredBy: null,
  possessionLockTimer: 0,
  lastTime: 0
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
  carrier: null // null | player1 | player2
};

