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
  playMode: { x: 360, y: 300, w: 240, h: 46 },
  defenseMode: { x: 360, y: 366, w: 240, h: 46 }
};

// Pause overlay menu (shown when Escape is pressed during a game)
const PAUSE_MENU_BUTTONS = {
  resume:   { x: 330, y: 240, w: 300, h: 56 },
  modeRestart: { x: 330, y: 320, w: 300, h: 56 },
  home:     { x: 330, y: 400, w: 300, h: 56 }
};

// Play Mode — 4 plays per page; optional filter (all / run / pass) on the play sheet
const PLAY_SELECT_PLAYS_PER_PAGE = 4;
const PLAY_CATEGORY_RUN = ["sweepLeft", "sweepRight", "diveRight", "diveLeft"];
const PLAY_CATEGORY_PASS = ["passLeft", "passRight", "barnPlay", "scrambledEggs"];
const PLAY_ORDER_ALL = PLAY_CATEGORY_RUN.concat(PLAY_CATEGORY_PASS);

const PLAY_SELECT_LABELS = {
  sweepLeft: "Sweep Left",
  sweepRight: "Sweep Right",
  passLeft: "Pass Left",
  passRight: "Pass Right",
  barnPlay: "Barn Play",
  scrambledEggs: "Scrambled Eggs",
  diveRight: "Stretch Right",
  diveLeft: "Stretch Left"
};

const PLAY_SELECT_PANEL = { x: 40, y: 88, w: 880, h: 398 };
const DEFENSE_SELECT_PANEL = { x: 80, y: 88, w: 800, h: 398 };

/** Vertical layout inside play panel (filter row → hints → plays). */
const PLAY_SELECT_FILTER_Y = 12;
const PLAY_SELECT_FILTER_H = 36;
const PLAY_SELECT_TITLE_Y = 72;
const PLAY_SELECT_DOWN_Y = 94;
const PLAY_SELECT_ROW_Y = 122;

function getFilteredPlayOrder() {
  if (game.playModePlayFilter === "run") return PLAY_CATEGORY_RUN.slice();
  if (game.playModePlayFilter === "pass") return PLAY_CATEGORY_PASS.slice();
  return PLAY_ORDER_ALL.slice();
}

/** All · Run only · Pass only — top of play select panel. */
function getPlaySelectFilterBarRects() {
  const P = PLAY_SELECT_PANEL;
  const gap = 10;
  const y = P.y + PLAY_SELECT_FILTER_Y;
  const h = PLAY_SELECT_FILTER_H;
  const x0 = P.x + 24;
  const inner = P.w - 48;
  const bw = (inner - gap * 2) / 3;
  return {
    all: { x: x0, y, w: bw, h },
    run: { x: x0 + bw + gap, y, w: bw, h },
    pass: { x: x0 + (bw + gap) * 2, y, w: bw, h }
  };
}

function getDefenseSelectOptionRects() {
  const P = DEFENSE_SELECT_PANEL;
  const order = getFilteredDefenseOptionOrder();
  const gap = 18;
  const pad = 24;
  const bw = (P.w - pad * 2 - gap * Math.max(0, order.length - 1)) / Math.max(1, order.length);
  const by = P.y + 126;
  const totalW = order.length * bw + Math.max(0, order.length - 1) * gap;
  const startX = P.x + Math.round((P.w - totalW) / 2);
  const rects = {};
  for (let i = 0; i < order.length; i++) {
    rects[order[i]] = {
      x: startX + i * (bw + gap),
      y: by,
      w: bw,
      h: 160
    };
  }
  return rects;
}

function getDefenseSelectOffenseToggleRect() {
  const P = DEFENSE_SELECT_PANEL;
  return {
    x: P.x + 170,
    y: P.y + 306,
    w: P.w - 340,
    h: 52
  };
}

function getDefenseSelectFilterBarRects() {
  const P = DEFENSE_SELECT_PANEL;
  const gap = 10;
  const y = P.y + 14;
  const h = 34;
  const x0 = P.x + 24;
  const inner = P.w - 48;
  const bw = (inner - gap * 2) / 3;
  return {
    all: { x: x0, y, w: bw, h },
    run: { x: x0 + bw + gap, y, w: bw, h },
    pass: { x: x0 + (bw + gap) * 2, y, w: bw, h }
  };
}

function getFilteredDefenseOptionOrder() {
  const run = ["A", "C"];
  const pass = ["B", "D"];
  const all = ["A", "B", "C", "D", "random"];
  if (game.defenseModeDefenseFilter === "run") return run;
  if (game.defenseModeDefenseFilter === "pass") return pass;
  return all;
}

function getPlayCategory(playKey) {
  return PLAY_CATEGORY_PASS.includes(playKey) ? "pass" : "run";
}

function getPlaySelectPageCount() {
  return Math.max(1, Math.ceil(getFilteredPlayOrder().length / PLAY_SELECT_PLAYS_PER_PAGE));
}

/** Slot geometry for one page of plays (horizontal row). */
function getPlaySelectSlots(pageIndex) {
  const order = getFilteredPlayOrder();
  const per = PLAY_SELECT_PLAYS_PER_PAGE;
  const start = pageIndex * per;
  const slice = order.slice(start, start + per);
  const P = PLAY_SELECT_PANEL;
  const sidePad = 12;
  const gap = 6;
  const n = slice.length;
  if (n === 0) return [];
  const innerW = P.w - 2 * sidePad;
  const btnW = (innerW - (n - 1) * gap) / n;
  const btnH = 84;
  const rowY = P.y + PLAY_SELECT_ROW_Y;
  return slice.map((key, i) => ({
    key,
    x: P.x + sidePad + i * (btnW + gap),
    y: rowY,
    w: btnW,
    h: btnH
  }));
}

function getPlaySelectPlayRowBottom() {
  return PLAY_SELECT_PANEL.y + PLAY_SELECT_ROW_Y + 84;
}

function getPlaySelectDividerY() {
  const bottom = getPlaySelectPlayRowBottom();
  return bottom + (getPlaySelectPageCount() > 1 ? 78 : 38);
}

function getPlaySelectDefenseToggleRect() {
  return {
    x: 370,
    y: getPlaySelectDividerY() + 22,
    w: 220,
    h: 36
  };
}

function getPlaySelectPageNavRects() {
  if (getPlaySelectPageCount() <= 1) return null;
  const y = getPlaySelectPlayRowBottom() + 8;
  const cx = canvas.width / 2;
  return {
    prev: { x: cx - 86, y, w: 72, h: 32 },
    next: { x: cx + 14, y, w: 72, h: 32 }
  };
}

function getMobileJoystickRect() {
  return {
    cx: 104,
    cy: canvas.height - 92,
    outerR: 54,
    innerR: 24,
    hitR: 88
  };
}

function getMobilePauseButtonRect() {
  return {
    x: canvas.width - 84,
    y: 66,
    w: 56,
    h: 34
  };
}

function getMobileRestartButtonRect() {
  return {
    x: canvas.width / 2 - 110,
    y: canvas.height / 2 + 58,
    w: 220,
    h: 44
  };
}

function getMobileSwitchButtonRect() {
  return {
    x: canvas.width - 132,
    y: canvas.height - 88,
    w: 104,
    h: 42
  };
}

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
  state: "menu", // "menu" | "playing" | ... | "playModePlaySelect" | "defenseModeSelect" | "prePlayCadence" | "touchdownPopup"
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
  safetyPopupTimer: 0,
  afterTouchdownAction: null,
  playModeDefense: null,       // "A" | "B"
  defenseReactionTimer: 0,     // ms remaining before Defense A's Hee Haw reacts to the WR
  passDefCovering: null,       // which defender covers WR on Defense B
  passDefRushing: null,        // which defender rushes QB on Defense B
  playModeIncomplete: false,   // true when last play ended as an incomplete pass
  playModeLastYards: 0,        // yards gained/lost on the last play
  playModeLastPlayType: null,  // "sweepRight" | "sweepLeft" | "passRight" | "passLeft" | "barnPlay" | "scrambledEggs" | null
  playModeLastResultType: "noGain", // "gain" | "loss" | "noGain" | "incomplete" | "sack"
  passPlayDropbackDone: false,   // true once QB has finished auto-dropping back
  passPlayCanThrow: true,        // false once QB has crossed the line of scrimmage
  passPlayTargetReceiver: null,  // "horse" | "pete" — intended receiver on the current throw
  passPlayDropbackTarget: 0,     // x coordinate of the 10-yard dropback spot
  rushReactionTimer: 0,          // ms remaining before the rushing defender starts rushing
  cluckNorrisTimer: 0,           // ms remaining before Cluck Norris starts pursuing
  peteBlockTimer: 0,             // ms remaining on Pete's current block (max 500)
  peteBlockTargetId: null,       // id of the defender Pete is currently blocking
  selectedDefense: "random",     // "A" | "B" | "C" | "D" | "random" — player's chosen defensive scheme
  passDefDeepTarget: null,       // "horse" | "pete" — which receiver Cluck Norris is assigned (Defense B)
  playModePlaySelectPage: 0,     // horizontal play picker page index
  playModePlayFilter: null,     // null = all plays | "run" | "pass"
  prePlayCadenceIndex: 0,
  prePlayCadenceTimer: 0,
  defenseModeDefenseFilter: null, // null = all | "run" | "pass"
  defenseModeControlledPlayerId: "player2",
  defenseModeCpuPlay: null,
  defenseModeSelectedOffensePlay: "random",
  touchControlsEnabled: false,
  touchMoveX: 0,
  touchMoveY: 0,
  touchStickActive: false,
  touchStickKnobX: 0,
  touchStickKnobY: 0
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

