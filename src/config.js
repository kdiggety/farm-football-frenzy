// =========================================================
// Constants / Config
// =========================================================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const FIELD = {
  x: 0,
  y: 80,
  width: 1500,
  height: 400,
  endZoneWidth: 75
};

/**
 * Top-down goal posts in `drawField` sit on the goal line at this inset from each field edge (px).
 * The midpoint between the two posts is the midfield / 50 line — same X the play camera uses for the LOS.
 */
const FIELD_GOAL_POST_INSET_PX = 14;

function getFieldGoalPostsMidlineX() {
  const leftGoalLineX = FIELD.x + FIELD_GOAL_POST_INSET_PX;
  const rightGoalLineX = FIELD.x + FIELD.width - FIELD_GOAL_POST_INSET_PX;
  return (leftGoalLineX + rightGoalLineX) / 2;
}

// Menu button layout (canvas coordinates) for hit testing
const MENU_BUTTONS = {
  playMode: { x: 360, y: 238, w: 240, h: 48 },
  franchise: { x: 360, y: 296, w: 240, h: 48 },
  devTraits: { x: 360, y: 354, w: 240, h: 48 },
  settings: { x: 360, y: 412, w: 240, h: 48 }
};

const GAME_SETTINGS_STORAGE_KEY = "fff_game_settings_v3";
const OVERTIME_MODE_ORDER = ["off", "full", "suddenDeath"];
const MOBILE_PASS_AIM_ORDER = ["tap", "hold"];
const DEFAULT_GAME_SETTINGS = {
  quarterLengthMin: 4,
  difficulty: "normal",
  musicVolume: 100,
  sfxVolume: 100,
  overtimeMode: "full",
  mobilePassAim: "tap",
  showDriveSummary: true
};
const PASS_PLAY_KEYS = new Set([
  "passRight",
  "passLeft",
  "barnPlay",
  "scrambledEggs",
  "barnDoorBoot",
  "hayBaleHook",
  "cornfieldCross",
  "siloSlant",
  "pasturePop",
  "fencePost"
]);
const RUN_PLAY_KEYS = new Set(["sweepRight", "sweepLeft", "diveRight", "diveLeft", "mudHoleDive"]);
const STATS_CATEGORIES = ["passing", "receiving", "rushing", "defense"];

function loadGameSettings() {
  try {
    const raw =
      localStorage.getItem(GAME_SETTINGS_STORAGE_KEY) ||
      localStorage.getItem("fff_game_settings_v2") ||
      localStorage.getItem("fff_game_settings_v1");
    if (!raw) return { ...DEFAULT_GAME_SETTINGS };
    const parsed = JSON.parse(raw);
    const q = Number(parsed.quarterLengthMin);
    const musicVolume = Number(parsed.musicVolume);
    const sfxVolume = Number(parsed.sfxVolume);
    return {
      quarterLengthMin: Number.isFinite(q) ? clamp(Math.round(q), 1, 12) : DEFAULT_GAME_SETTINGS.quarterLengthMin,
      difficulty: DIFFICULTY_ORDER.includes(parsed.difficulty) ? parsed.difficulty : DEFAULT_GAME_SETTINGS.difficulty,
      musicVolume: Number.isFinite(musicVolume) ? clamp(Math.round(musicVolume), 0, 100) : DEFAULT_GAME_SETTINGS.musicVolume,
      sfxVolume: Number.isFinite(sfxVolume) ? clamp(Math.round(sfxVolume), 0, 100) : DEFAULT_GAME_SETTINGS.sfxVolume,
      overtimeMode: OVERTIME_MODE_ORDER.includes(parsed.overtimeMode) ? parsed.overtimeMode : DEFAULT_GAME_SETTINGS.overtimeMode,
      mobilePassAim: MOBILE_PASS_AIM_ORDER.includes(parsed.mobilePassAim) ? parsed.mobilePassAim : DEFAULT_GAME_SETTINGS.mobilePassAim,
      showDriveSummary: parsed.showDriveSummary !== false
    };
  } catch (_e) {
    return { ...DEFAULT_GAME_SETTINGS };
  }
}

function saveGameSettings(settings) {
  const next = {
    quarterLengthMin: clamp(Math.round(settings.quarterLengthMin || DEFAULT_GAME_SETTINGS.quarterLengthMin), 1, 12),
    difficulty: DIFFICULTY_ORDER.includes(settings.difficulty) ? settings.difficulty : DEFAULT_GAME_SETTINGS.difficulty,
    musicVolume: clamp(Math.round(settings.musicVolume ?? DEFAULT_GAME_SETTINGS.musicVolume), 0, 100),
    sfxVolume: clamp(Math.round(settings.sfxVolume ?? DEFAULT_GAME_SETTINGS.sfxVolume), 0, 100),
    overtimeMode: OVERTIME_MODE_ORDER.includes(settings.overtimeMode) ? settings.overtimeMode : DEFAULT_GAME_SETTINGS.overtimeMode,
    mobilePassAim: MOBILE_PASS_AIM_ORDER.includes(settings.mobilePassAim) ? settings.mobilePassAim : DEFAULT_GAME_SETTINGS.mobilePassAim,
    showDriveSummary: settings.showDriveSummary !== false
  };
  localStorage.setItem(GAME_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  if (typeof applyGameSettingsAudio === "function") {
    applyGameSettingsAudio(next);
  }
  return next;
}

function getOvertimeModeLabel(mode) {
  if (mode === "off") return "Off (ties allowed)";
  if (mode === "suddenDeath") return "Sudden death";
  return "Full OT quarter";
}

function getMobilePassAimLabel(mode) {
  return mode === "hold" ? "Hold to aim" : "Tap to throw";
}

function getMobilePassAimMode() {
  const mode = game.gameSettings && game.gameSettings.mobilePassAim;
  return MOBILE_PASS_AIM_ORDER.includes(mode) ? mode : DEFAULT_GAME_SETTINGS.mobilePassAim;
}

function getQuarterLengthMs() {
  return loadGameSettings().quarterLengthMin * 60 * 1000;
}

function formatGameClockMs(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

function getSettingsMenuLayout() {
  const panel = { x: 108, y: 36, w: 744, h: 468 };
  const cx = panel.x + panel.w / 2;
  const ctrlY = (y) => y;
  const stepMinus = (y) => ({ x: cx - 72, y: ctrlY(y), w: 34, h: 30 });
  const stepPlus = (y) => ({ x: cx + 38, y: ctrlY(y), w: 34, h: 30 });
  const seg3 = (y) => {
    const w = 128;
    const gap = 8;
    const x0 = panel.x + panel.w - 28 - (w * 3 + gap * 2);
    return {
      a: { x: x0, y: ctrlY(y), w, h: 30 },
      b: { x: x0 + w + gap, y: ctrlY(y), w, h: 30 },
      c: { x: x0 + (w + gap) * 2, y: ctrlY(y), w, h: 30 }
    };
  };
  const seg2 = (y) => {
    const w = 198;
    const gap = 10;
    const x0 = panel.x + panel.w - 28 - (w * 2 + gap);
    return {
      a: { x: x0, y: ctrlY(y), w, h: 30 },
      b: { x: x0 + w + gap, y: ctrlY(y), w, h: 30 }
    };
  };

  return {
    panel,
    done: { x: cx - 92, y: panel.y + panel.h - 52, w: 184, h: 40 },
    back: { x: panel.x + 20, y: panel.y + panel.h - 48, w: 108, h: 34 },
    minusQ: stepMinus(118),
    plusQ: stepPlus(118),
    minusMusic: stepMinus(312),
    plusMusic: stepPlus(312),
    minusSfx: stepMinus(352),
    plusSfx: stepPlus(352),
    diffEasy: seg3(162).a,
    diffNormal: seg3(162).b,
    diffHard: seg3(162).c,
    otOff: seg3(206).a,
    otFull: seg3(206).b,
    otSudden: seg3(206).c,
    passTap: seg2(416).a,
    passHold: seg2(416).b,
    summaryOn: seg2(250).a,
    summaryOff: seg2(250).b,
    labels: {
      quarterY: 112,
      diffY: 156,
      otY: 200,
      summaryY: 244,
      musicY: 306,
      sfxY: 346,
      passY: 410,
      sectionGameY: 88,
      sectionAudioY: 280,
      sectionMobileY: 384
    },
    values: {
      quarter: { x: cx, y: 136 },
      music: { x: cx, y: 330 },
      sfx: { x: cx, y: 370 }
    }
  };
}

function getStatsMenuLayout() {
  const cx = canvas.width / 2;
  const tabW = 108;
  const gap = 8;
  const total = tabW * 4 + gap * 3;
  const x0 = cx - total / 2;
  const y = 168;
  return {
    back: { x: 330, y: 430, w: 300, h: 48 },
    tabs: STATS_CATEGORIES.reduce((acc, key, i) => {
      acc[key] = { x: x0 + i * (tabW + gap), y, w: tabW, h: 34 };
      return acc;
    }, {})
  };
}

/** Top-level play modes (after main-menu Play). */
const PLAY_SESSION_TOP = {
  offense: {
    label: "Play Offense",
    sub: "Timed session — your drives until the clock runs out"
  },
  defense: {
    label: "Play Defense",
    sub: "Timed session — stop the CPU until the clock runs out"
  },
  wholeGame: {
    label: "Play Whole Game",
    sub: "Coin toss, kickoffs, quarters, full game clock"
  },
  franchise: {
    label: "Franchise Mode",
    sub: "17-game season · draft · trades · free agency · playoffs"
  }
};

const PLAY_SESSION_TOP_KEYS = ["offense", "defense", "wholeGame"];

const PLAY_SESSION_KINDS = PLAY_SESSION_TOP;

function isRunnablePlaySessionKind(kind) {
  return !!kind && !!PLAY_SESSION_KINDS[kind];
}

function getPlaySessionSelectLayout() {
  const cx = canvas.width / 2;
  const w = 300;
  const h = 52;
  const gap = 14;
  const x = cx - w / 2;
  const y0 = 130;
  return {
    back: { x: 36, y: 488, w: 120, h: 36 },
    devTraits: { x: canvas.width - 196, y: 488, w: 160, h: 36 },
    offense: { x, y: y0, w, h },
    defense: { x, y: y0 + (h + gap), w, h },
    wholeGame: { x, y: y0 + (h + gap) * 2, w, h }
  };
}

function getPlaySessionLabel(kind) {
  return (PLAY_SESSION_KINDS[kind] && PLAY_SESSION_KINDS[kind].label) || "Play";
}

/** 4th down: Punt vs Field Goal vs Go for it (canvas coords). */
function getFourthDownChoiceRects() {
  const w = 258;
  const h = 72;
  const gap = 16;
  const total = w * 3 + gap * 2;
  const x0 = (canvas.width - total) / 2;
  const y = 360;
  return {
    punt: { x: x0, y, w, h },
    fieldGoal: { x: x0 + w + gap, y, w, h },
    goForIt: { x: x0 + (w + gap) * 2, y, w, h }
  };
}

/** After TD: choose extra point vs two-point conversion (canvas coords). */
function getPostTouchdownChoiceRects() {
  const w = 280;
  const h = 64;
  const gap = 28;
  const total = w * 2 + gap;
  const x0 = (canvas.width - total) / 2;
  const y = 418;
  return {
    kick: { x: x0, y, w, h },
    twoPoint: { x: x0 + w + gap, y, w, h }
  };
}

// Pause overlay menu (shown when Escape is pressed during a game)
const PAUSE_MENU_BUTTONS = {
  resume: { x: 330, y: 168, w: 300, h: 44 },
  stats: { x: 330, y: 220, w: 300, h: 44 },
  instantReplay: { x: 330, y: 272, w: 300, h: 44 },
  modeRestart: { x: 330, y: 328, w: 300, h: 48 },
  home: { x: 330, y: 386, w: 300, h: 48 }
};

// Play Mode — 4 plays per page; optional filter (all / run / pass) on the play sheet
const PLAY_SELECT_PLAYS_PER_PAGE = 4;
const PLAY_DEFINITIONS = {
  sweepRight: { category: "run", directional: true, cpuEligible: true },
  diveRight: { category: "run", directional: true, cpuEligible: true },
  mudHoleDive: { category: "run", directional: false, cpuEligible: true },
  passRight: { category: "pass", directional: true, cpuEligible: true },
  barnPlay: { category: "pass", directional: false, cpuEligible: true },
  scrambledEggs: { category: "pass", directional: false, cpuEligible: true },
  siloSlant: { category: "pass", directional: false, cpuEligible: true },
  pasturePop: { category: "pass", directional: false, cpuEligible: true },
  fencePost: { category: "pass", directional: false, cpuEligible: true },
  barnDoorBoot: { category: "pass", directional: false, cpuEligible: false },
  hayBaleHook: { category: "pass", directional: false, cpuEligible: false },
  cornfieldCross: { category: "pass", directional: false, cpuEligible: false }
};
const PLAY_CATEGORY_RUN = Object.keys(PLAY_DEFINITIONS).filter((k) => PLAY_DEFINITIONS[k].category === "run");
const PLAY_CATEGORY_PASS = Object.keys(PLAY_DEFINITIONS).filter((k) => PLAY_DEFINITIONS[k].category === "pass");
const PLAY_ORDER_ALL = PLAY_CATEGORY_RUN.concat(PLAY_CATEGORY_PASS);
const PLAY_DIRECTIONAL_BASE_KEYS = new Set(["sweepRight", "passRight", "diveRight"]);

const PLAY_SELECT_LABELS = {
  sweepRight: "Sweep",
  passRight: "Pass",
  barnPlay: "Barn Play",
  scrambledEggs: "Scrambled Eggs",
  barnDoorBoot: "Barn Door Boot",
  hayBaleHook: "Hay Bale Hook",
  cornfieldCross: "Cornfield Cross",
  siloSlant: "Silo Slant",
  pasturePop: "Pasture Pop",
  fencePost: "Fence Post",
  mudHoleDive: "Mud Hole Dive",
  diveRight: "Stretch"
};

const PLAY_SELECT_PANEL = { x: 40, y: 88, w: 880, h: 398 };
const DEFENSE_SELECT_PANEL = { x: 80, y: 88, w: 800, h: 398 };

/** Vertical layout inside play panel (filter row → hints → plays). */
const PLAY_SELECT_FILTER_Y = 12;
const PLAY_SELECT_FILTER_H = 36;
const PLAY_SELECT_TITLE_Y = 72;
const PLAY_SELECT_DOWN_Y = 94;
const PLAY_SELECT_ROW_Y = 122;
const PLAY_SELECT_BTN_H = 118;

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

function getDefenseSelectRusherToggleRect() {
  const P = DEFENSE_SELECT_PANEL;
  return {
    x: P.x + 188,
    y: P.y + 364,
    w: 272,
    h: 34
  };
}

function getDefenseSelectJamToggleRect() {
  const P = DEFENSE_SELECT_PANEL;
  return {
    x: P.x + P.w - 188 - 172,
    y: P.y + 364,
    w: 172,
    h: 34
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

function getDefenseCoverageTitle(defenseKey) {
  return defenseKey === "B" ? "Zone" : "Man";
}

function getDefenseCoverageSubtitle(defenseKey) {
  if (defenseKey === "B") {
    return "Zone drops — 2 rush, 3 deep";
  }
  return "Man coverage — mirror receivers";
}

function getFilteredDefenseOptionOrder() {
  const man = ["A"];
  const zone = ["B"];
  const all = ["A", "B"];
  if (game.defenseModeDefenseFilter === "run") return man;
  if (game.defenseModeDefenseFilter === "pass") return zone;
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
  const btnH = PLAY_SELECT_BTN_H;
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
  return PLAY_SELECT_PANEL.y + PLAY_SELECT_ROW_Y + PLAY_SELECT_BTN_H;
}

function getPlaySelectDividerY() {
  const bottom = getPlaySelectPlayRowBottom();
  return bottom + (getPlaySelectPageCount() > 1 ? 78 : 38);
}

function getPlaySelectDefenseToggleRect() {
  return {
    x: 490,
    y: getPlaySelectDividerY() + 22,
    w: 220,
    h: 36
  };
}

function getPlaySelectSideSwitchRect() {
  return {
    x: 250,
    y: getPlaySelectDividerY() + 22,
    w: 220,
    h: 36
  };
}

function resolvePlayKeyForSelectedSide(playKey) {
  if (!PLAY_DIRECTIONAL_BASE_KEYS.has(playKey)) return playKey;
  return game.playModeFlipPlaySide ? playKey.replace("Right", "Left") : playKey;
}

function getPlaySelectLabel(playKey) {
  const base = PLAY_SELECT_LABELS[playKey] || playKey;
  if (!PLAY_DIRECTIONAL_BASE_KEYS.has(playKey)) return base;
  return `${base} ${game.playModeFlipPlaySide ? "Left" : "Right"}`;
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

function getMobileJukeButtonRect() {
  return {
    x: canvas.width - 132,
    y: canvas.height - 88,
    w: 104,
    h: 42
  };
}

const CONFIG = {
  winScore: 21,
  playerRadius: 20,
  ballRadius: 9,
  playerSpeed: 98,
  cpuSpeed: 98,
  possessionPickupLockMs: 220,
  scorePauseMs: 1400,
  stealDistanceMultiplier: 0.8,
  reacquireCooldownMs: 1500,
  passSpeed: 480,
  /** Play mode: probability [0–1] that a tackle on the ball carrier causes a fumble (loose ball). Set to 0 for no fumbles. */
  fumbleChanceOnTackle: 0.05,
  /** How long the on-field “FUMBLE” banner stays visible (ms). */
  fumbleBannerDurationMs: 4000,
  /** Punt aim: hold past this (ms) → overcooked (red) short kick. */
  puntOvercookAfterMs: 1350,
  /** Punt charge max hold before auto-overcook (ms). */
  puntMaxHoldMs: 2200
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

/** Extra point timing meter: 0 = left, 1 = right. Green = automatic make; yellow = 50%; red = miss. */
const PAT_METER = {
  redLeft: 0.15,
  yellowLeft: 0.35,
  yellowRight: 0.65,
  redRight: 0.85
};

function getPatMeterForDistanceYards(distanceYards) {
  const raw = distanceYards || 20;
  const y = Math.max(20, Math.min(70, raw));
  const isFieldGoal = typeof game !== "undefined" && game.patKickPointValue === 3;
  const effectiveYards = Math.max(20, Math.min(70, y + (isFieldGoal ? 8 : 0)));
  const t = (effectiveYards - 20) / 50;
  const greenHalf = 0.14 - t * 0.11;   // 20 yds: wide green, 70 yds: very tight green
  const yellowHalf = greenHalf + (0.07 - t * 0.035);
  const redHalf = yellowHalf + (0.11 - t * 0.02);
  return {
    redLeft: Math.max(0, 0.5 - redHalf),
    yellowLeft: Math.max(0, 0.5 - yellowHalf),
    yellowRight: Math.min(1, 0.5 + yellowHalf),
    redRight: Math.min(1, 0.5 + redHalf)
  };
}

function getPatMeterForCurrentKick() {
  if (typeof game === "undefined") return PAT_METER;
  return getPatMeterForDistanceYards(game.patKickDistanceYards || 20);
}

function getPatKickZone(t) {
  const M = getPatMeterForCurrentKick();
  if (t < M.redLeft || t > M.redRight) return "red";
  if (t < M.yellowLeft || t > M.yellowRight) return "yellow";
  return "green";
}

// =========================================================
// Game State
// =========================================================
const game = {
  state: "menu", // ... | "puntAim" | "kickoffAim" | "kickoffPlay" | "touchdownPopup" | "postTouchdownChoice" | "patKick" | ...
  coinTossPhase: null, // null | "pickCall" | "flipping" | "result" | "userChooseSide" | "userChooseDirection" | "cpuChose"
  coinTossCall: null, // null | "heads" | "tails" — player's call before the flip
  coinTossResult: null, // null | "heads" | "tails"
  coinTossWon: null, // null | boolean — call matched flip
  coinTossCpuChoice: null, // null | "offense" | "defense" — what CPU picks if player lost toss
  coinTossCpuDirection: null, // null | "left" | "right" — which way CPU chooses to attack
  coinTossUserChoiceSide: null, // null | "offense" | "defense" — cached before direction pick
  coinTossFlipTimer: 0,
  teamSelectUser: null,   // noFlyZone | pasture | barnaby | professorPig | creekCrew | null
  teamSelectPage: 0,      // index 0..PLAY_TEAM_IDS.length-1
  devTraitsGuideTab: "overview", // "overview" | "teams"
  devTraitsGuideTeamPage: 0,
  devTraitsGuideReturnState: "menu",
  franchiseActive: false,
  franchiseGameId: null,
  franchiseData: null,
  franchisePanel: null,
  franchisePickTeam: false,
  franchiseTradeCpuIdx: 0,
  franchiseTradeOfferSlot: null,
  franchiseTradeWantSlot: null,
  franchiseDraftSel: 0,
  franchiseFaSel: 0,
  playUserTeamId: null,
  playCpuTeamId: null,
  /** wholeGame | offense | defense — see PLAY_SESSION_KINDS */
  playSessionKind: null,
  /** Offense/defense-only: simulated other-side drive shown between interactive series. */
  sessionRecapPlays: null,
  sessionRecapDriveResult: null,
  sessionRecapTeamLabel: null,
  sessionRecapNextCpuOffense: false,
  /** Whole game: brief box score between possessions. */
  driveSummaryResume: null,
  gameSettings: loadGameSettings(),
  /** Whole-game quarter clock (Q1–Q4, optional OT). */
  clockQuarter: 1,
  clockMsRemaining: 0,
  clockInitialized: false,
  clockExpiredPending: false,
  halftimeShown: false,
  halftimePopupTimer: 0,
  /** Per-team box score for whole game. */
  teamStats: null,
  statsCategory: "passing",
  passAttemptPending: false,
  runAttemptPending: false,
  pendingPassTarget: null,
  teamScores: null,       // per-team points (6 TD, +1 PAT, +2 two-point)
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
  playModeYardsToGo: 30,
  playModeFirstDownLineX: null,
  playModeLineX: 0,
  playModePhase: null,   // null | "snap" | "handoff" | "toss" | "sweep"
  playModeSweepSnapMs: 0,
  playModePassSnapMs: 0,
  playModeCurrentPlay: null,
  playModeSweepHandoffT: 0,
  touchdownPopupTimer: 0,
  lastTouchdownTeamName: "",
  fieldCelebrationTimer: 0,
  fieldCelebrationType: null,
  fieldCelebrationX: 0,
  winPopupTimer: 0,
  safetyPopupTimer: 0,
  safetyAgainstCpuOffense: false,
  afterTouchdownAction: null,
  patKickCursor: 0,
  patKickDirection: 1,
  patKickSpeed: 0.95,
  patKickResultPhase: null,
  patKickResultTimer: 0,
  patKickPointValue: 1,
  patKickDistanceYards: 20,
  patKickCpuAuto: false,
  patKickCpuTarget: 0.5,
  patKickCpuAimDelayMs: 0,
  patKickFromFourthDown: false,
  patKickFourthDownSpotX: 0,
  patKickScorerTeamTag: null,
  patKickScorerIsPlayer1: true,
  /** PAT: "aim" (timing meter) → "snap" → "flight" → "result" */
  patKickSubPhase: "aim",
  patKickPhaseTimer: 0,
  patKickFlightT: 0,
  patKickPendingMade: false,
  /** 0–1: where ball crosses the goal plane (0.5 = center, good) */
  patKickBallEndN: 0.5,
  /** X where the last TD was scored (for 2-pt line: 2 yards back toward midfield). */
  lastTouchdownSpotX: null,
  /** True during the one-play two-point attempt. */
  twoPointAttemptActive: false,
  /** User chose "Go for it" on 4th — show normal plays; on failure, turnover at spot. */
  fourthDownGoForIt: false,
  /** On 4th down offense: false until user picks Punt vs Go for it (then true if Go for it). */
  fourthDownPickedGoForIt: false,
  /** Punt aim: 0–1 power while holding Space / pointer. */
  puntAimCharge: 0,
  puntAimHoldMs: 0,
  puntAimOvercooked: false,
  puntAimCharging: false,
  kickoffActive: false,
  kickoffReceivingCpuOffense: false,
  kickoffSequencePhase: null,
  kickoffSequenceTimer: 0,
  kickoffSequenceFlightT: 0,
  kickoffSequenceKickFromX: 0,
  kickoffSequenceKickDir: 1,
  kickoffSequenceBlockerWallX: 0,
  kickoffSequenceMinimumLineX: 0,
  kickoffSequenceBallX: 0,
  kickoffSequenceBallY: 0,
  kickoffFlagPopupTimer: 0,
  kickoffFlagMessage: "",
  kickoffSequenceReceivingSpot: 0,
  kickoffSequenceLandingY: 0,
  kickoffPrimaryReturnerId: "cluckNorris",
  kickoffSequenceReturnTargetX: 0,
  kickoffSequenceNextCpuOffense: false,
  puntDistanceYards: 38,
  puntPhase: null,
  puntPhaseTimer: 0,
  puntLandingX: 0,
  puntFlightT: 0,
  puntBlocked: false,
  puntKickReleased: false,
  puntReturnMs: 0,
  puntReturnStartX: 0,
  puntPunterAssist: false,
  playModeDefense: null,       // "A" | "B" (man | zone)
  defenseReactionTimer: 0,     // ms remaining before man-coverage Hee Haw reacts to the WR
  passDefCovering: null,       // which defender covers WR in zone shell
  passDefRushing: null,        // which defender rushes QB
  passDefCoverHorseId: "allyDonkey",
  passDefCoverPeteId: "cluckNorris",
  passDefSpyId: null,
  qbPocketY: null,
  playModeIncomplete: false,   // true when last play ended as an incomplete pass
  playModeLastYards: 0,        // yards gained/lost on the last play
  playModeLastPlayType: null,  // "sweepRight" | "sweepLeft" | "passRight" | "passLeft" | "barnPlay" | "scrambledEggs" | null
  playModeLastResultType: "noGain", // "gain" | "loss" | "noGain" | "incomplete" | "sack" | "interception"
  interceptionPopupTimer: 0,
  /** Live play: brief “FUMBLE” overlay after a fumble (game stays playing). */
  fumblePopupTimer: 0,
  /** True while the ball is loose from a fumble (next touch resolves the play). */
  playModeBallLooseFromFumble: false,
  /** Downed overlay: show "Tackled!" after someone recovers a loose fumble (they're down at the spot). */
  playModeFumbleRecoveryTackled: false,
  /** After defensive fumble recovery: Enter runs turnover drive instead of next down. */
  playModePendingFumbleTurnover: false,
  /** Where to send possession when playModePendingFumbleTurnover clears (CPU offense next vs user). */
  playModeFumbleTurnoverNextCpuOffense: false,
  turnoverSeriesActive: false,
  /** Direction the user's team attacks when on offense (1 = right, -1 = left). */
  userOffenseDirection: 1,
  passPlayDropbackDone: false,   // true once QB has finished auto-dropping back
  passPlayCanThrow: true,        // false once QB has crossed the line of scrimmage
  passPlayTargetReceiver: null,  // "horse" | "pete" — intended receiver on the current throw
  passPlayDropbackTarget: 0,     // x coordinate of the 10-yard dropback spot
  rushReactionTimer: 0,          // ms remaining before the rushing defender starts rushing
  cluckNorrisTimer: 0,           // ms remaining before Cluck Norris starts pursuing
  peteBlockTimer: 0,             // ms remaining on Pete's current block (max 500)
  peteBlockTargetId: null,       // id of the defender Pete is currently blocking
  playModeSweepWrBlockMs: 0,     // guaranteed WR lead-block window after sweep pitch catch
  sweepWrEngageP4Ms: 0,          // remaining lock time when defenseP4 is engaged by a WR block
  sweepWrEngageCluckMs: 0,       // remaining lock time when Cluck is engaged by a WR block
  stretchCenterBlockMs: 0,       // remaining lock time for center's stretch block
  stretchCenterBlockTargetId: null,
  passCenterBlockMs: 0,          // remaining lock time for pass-protecting center (P5)
  passCenterBlockTargetId: null,
  passGuardBlockMs: 0,           // remaining lock time for pass-protecting guard (P4)
  passGuardBlockTargetId: null,
  stretchFbBlockMs: 0,           // remaining lock time for fullback's stretch block
  stretchFbBlockTargetId: null,
  stretchFbBlockArmed: false,    // FB is ready to start a full hold on first engagement
  selectedDefense: "A",     // "A" | "B" — man / zone
  passDefDeepTarget: null,       // "horse" | "pete" — zone shell deep assignment
  playModePlaySelectPage: 0,     // horizontal play picker page index
  playModePlayFilter: null,     // null = all plays | "run" | "pass"
  playModeFlipPlaySide: false,
  prePlayCadenceIndex: 0,
  prePlayCadenceTimer: 0,
  defenseModeDefenseFilter: null, // null = all | "run" = man | "pass" = zone (CPU defense picker)
  cpuOffense: false, // true = you defend, CPU runs offense (same flow as former "Defense mode")
  defenseModeControlledPlayerId: "player2",
  defenseUserRusherId: "player2",
  defensePressJam: false,
  passJamWindowMs: 0,
  defenseModeCpuPlay: null,
  defenseModeSelectedOffensePlay: "random",
  touchControlsEnabled: false,
  jukeLateralSign: 1,
  touchMoveX: 0,
  touchMoveY: 0,
  touchStickActive: false,
  touchStickKnobX: 0,
  touchStickKnobY: 0,
  lastPlayReplayFrames: null,
  replayFrames: null,
  replayTimeMs: 0,
  replayPaused: false,
  replayZoom: 1,
  replaySpeed: 1,
  instantReplayKind: null,
  instantReplayOnComplete: null
};

const keys = {};

const player1 = {
  id: "player1",
  name: "Barnaby",
  displayLabel: "Barnaby",
  appearanceId: "player1",
  teamOwnerId: "player1",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.playerSpeed,
  color: COLORS.donkey,
  ballAccent: "#bfdbfe",
  score: 0
};

const player2 = {
  id: "player2",
  name: "Professor Pig",
  displayLabel: "Professor Pig",
  appearanceId: "player2",
  teamOwnerId: "player2",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.cpuSpeed,
  color: COLORS.pig,
  ballAccent: "#fbcfe8",
  score: 0
};

const ball = {
  x: 0,
  y: 0,
  radius: CONFIG.ballRadius,
  carrier: null, // null | player1 | player2
  inFlight: false,
  startX: 0,
  startY: 0,
  targetX: 0,
  targetY: 0,
  flightElapsedMs: 0,
  flightDurationMs: 0,
  flightArcPeak: 0,
  arcHeight: 0,
  failedInterceptorIds: [],
  settleTimer: 0
};

function getBallVisualState(ballRef = ball) {
  const height = ballRef.arcHeight || 0;
  return {
    x: ballRef.x,
    y: ballRef.y - height * 0.34,
    height,
    shadowY: ballRef.y + 10
  };
}

const allyHorse = {
  id: "allyHorse",
  name: "Sir Neigh-a-Lot",
  displayLabel: "Sir Neigh-a-Lot",
  appearanceId: "allyHorse",
  teamOwnerId: "player1",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.cpuSpeed,
  color: COLORS.horse,
  ballAccent: "#fed7aa"
};

const allyDonkey = {
  id: "allyDonkey",
  name: "Deputy Hee-Haw",
  displayLabel: "Deputy Hee-Haw",
  appearanceId: "allyDonkey",
  teamOwnerId: "player2",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.cpuSpeed,
  color: COLORS.sidekickDonkey,
  ballAccent: "#bbf7d0"
};

const cluckNorris = {
  id: "cluckNorris",
  name: "Big Coop",
  displayLabel: "Big Coop",
  appearanceId: "cluckNorris",
  teamOwnerId: "player2",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.cpuSpeed,
  color: "#ffffff",
  ballAccent: "#fca5a5"
};

const lilTunnelPete = {
  id: "lilTunnelPete",
  name: "Lil' Tunnel Pete",
  displayLabel: "Lil' Tunnel Pete",
  appearanceId: "lilTunnelPete",
  teamOwnerId: "player1",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.playerSpeed,
  color: "#c8a97e",
  ballAccent: "#fef08a"
};

/** Play mode — extra offense (p4 = sweep RB, p5 = wing) and defense (p4/p5). */
const offenseP4 = {
  id: "offenseP4",
  name: "RB",
  displayLabel: "RB",
  appearanceId: "squadA",
  teamOwnerId: "player1",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.playerSpeed,
  color: "#64748b",
  ballAccent: "#fef08a"
};

const offenseP5 = {
  id: "offenseP5",
  name: "Wing",
  displayLabel: "Wing",
  appearanceId: "squadB",
  teamOwnerId: "player1",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.playerSpeed,
  color: "#0f766e",
  ballAccent: "#a7f3d0"
};

const defenseP4 = {
  id: "defenseP4",
  name: "DB4",
  displayLabel: "DB4",
  appearanceId: "squadA",
  teamOwnerId: "player2",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.cpuSpeed,
  color: "#64748b",
  ballAccent: "#fef08a"
};

const defenseP5 = {
  id: "defenseP5",
  name: "DB5",
  displayLabel: "DB5",
  appearanceId: "squadB",
  teamOwnerId: "player2",
  x: 0,
  y: 0,
  radius: CONFIG.playerRadius,
  speed: CONFIG.cpuSpeed,
  color: "#0f766e",
  ballAccent: "#a7f3d0"
};
