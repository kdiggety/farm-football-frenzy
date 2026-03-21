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
  gameMode:    { x: 390, y: 279, w: 180, h: 34 },
  passingMode: { x: 390, y: 331, w: 180, h: 34 },
  playMode:    { x: 390, y: 383, w: 180, h: 34 }
};

// Pause overlay menu (shown when Escape is pressed during a game)
const PAUSE_MENU_BUTTONS = {
  resume:   { x: 330, y: 240, w: 300, h: 56 },
  playMode: { x: 330, y: 320, w: 300, h: 56 },
  home:     { x: 330, y: 400, w: 300, h: 56 }
};

// Play Mode — play selection (2x2 grid: top-left Sweep Left, top-right Sweep Right, bottom-left Pass Left, bottom-right Pass Right)
const PLAY_SELECT_BUTTONS = {
  sweepLeft:  { x: 260, y: 285, w: 210, h: 39 },
  sweepRight: { x: 490, y: 285, w: 210, h: 39 },
  passLeft:   { x: 260, y: 340, w: 210, h: 39 },
  passRight:  { x: 490, y: 340, w: 210, h: 39 }
};

// Defense toggle button (below the 2x2 play grid)
const DEFENSE_TOGGLE_BUTTON = { x: 370, y: 403, w: 220, h: 36 };

const CONFIG = {
  winScore: 5,
  playerRadius: 20,
  ballRadius: 9,
  playerSpeed: 112.5,
  cpuSpeed: 112.5,
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
  state: "menu", // "menu" | "playing" | "scorePause" | "gameOver" | "paused" | "pauseMenu" | "playModeDowned" | "playModePlaySelect" | "touchdownPopup"
  stateBeforePauseMenu: null,
  mode: null,   // "game" | "passing" | "play"
  winner: null,
  scorePauseTimer: 0,
  scoredBy: null,
  possessionLockTimer: 0,
  lastTime: 0,
  reacquireCooldownP1: 0,
  reacquireCooldownP2: 0,
  mouseX: 0,
  mouseY: 0,
  playModeDown: 1,
  playModeMaxDowns: 4,
  playModeLineX: 0,
  playModePhase: null,   // null | "handoff" | "toss" | "sweep"
  playModeCurrentPlay: null,
  playModeSweepHandoffT: 0,
  touchdownPopupTimer: 0,
  afterTouchdownAction: null,
  playModeDefense: null,       // "A" | "B"
  defenseReactionTimer: 0,     // ms remaining before Defense A's Hee Haw reacts to the WR
  passDefCovering: null,       // which defender covers WR on Defense B
  passDefRushing: null,        // which defender rushes QB on Defense B
  playModeIncomplete: false,   // true when last play ended as an incomplete pass
  playModeLastYards: 0,        // yards gained/lost on the last play
  playModeLastPlayType: null,  // "sweepRight" | "sweepLeft" | "passRight" | "passLeft" | null
  playModeLastResultType: "noGain", // "gain" | "loss" | "noGain" | "incomplete" | "sack"
  passPlayDropbackDone: false,   // true once QB has finished auto-dropping back
  passPlayCanThrow: true,        // false once QB has crossed the line of scrimmage
  passPlayDropbackTarget: 0,     // x coordinate of the 10-yard dropback spot
  rushReactionTimer: 0,          // ms remaining before the rushing defender starts rushing
  cluckNorrisTimer: 0,           // ms remaining before Cluck Norris starts pursuing
  selectedDefense: "random",     // "A" | "B" | "random" — player's chosen defensive scheme
  passDefDeepTarget: null        // "horse" | "pete" — which receiver Cluck Norris is assigned (Defense B)
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
  targetY: 0,
  settleTimer: 0
};

const allyHorse = {
  id: "allyHorse",
  name: "Sir Neigh-a-Lot",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.cpuSpeed,
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

// Professor Pig's team — new defender
const cluckNorris = {
  id: "cluckNorris",
  name: "Big Coop",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.cpuSpeed,
  color: "#ffffff"  // white feathers
};

// Barnaby's team — new blocker/receiver
const lilTunnelPete = {
  id: "lilTunnelPete",
  name: "Lil' Tunnel Pete",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.playerSpeed,
  color: "#c8a97e"  // tan
};

