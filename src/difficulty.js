// =========================================================
// Difficulty presets — CPU offense / defense tuning
// =========================================================

const DIFFICULTY_ORDER = ["easy", "normal", "hard"];

const DIFFICULTY_PRESETS = {
  easy: {
    label: "Easy",
    sub: "Slower CPU · softer coverage · fewer fumbles",
    cpuOffenseSpeed: 0.86,
    cpuDefenseSpeed: 0.84,
    passCompletionMult: 0.78,
    defenseReactionMult: 1.4,
    cluckDelayMult: 1.45,
    patTargetHalfWidth: 0.16,
    cpuFourthDownFg: 0.4,
    kickoffChargeMin: 0.48,
    kickoffChargeRange: 0.28,
    userFumbleMult: 0.55,
    cpuFumbleMult: 1.45
  },
  normal: {
    label: "Normal",
    sub: "Balanced challenge",
    cpuOffenseSpeed: 1,
    cpuDefenseSpeed: 1,
    passCompletionMult: 1,
    defenseReactionMult: 1,
    cluckDelayMult: 1,
    patTargetHalfWidth: 0.09,
    cpuFourthDownFg: 0.58,
    kickoffChargeMin: 0.62,
    kickoffChargeRange: 0.38,
    userFumbleMult: 1,
    cpuFumbleMult: 1
  },
  hard: {
    label: "Hard",
    sub: "Fast CPU · sharper passes · quicker rush",
    cpuOffenseSpeed: 1.14,
    cpuDefenseSpeed: 1.16,
    passCompletionMult: 1.2,
    defenseReactionMult: 0.68,
    cluckDelayMult: 0.62,
    patTargetHalfWidth: 0.045,
    cpuFourthDownFg: 0.74,
    kickoffChargeMin: 0.7,
    kickoffChargeRange: 0.28,
    userFumbleMult: 1.4,
    cpuFumbleMult: 0.75
  }
};

function normalizeDifficulty(value) {
  return DIFFICULTY_ORDER.includes(value) ? value : "normal";
}

function getDifficultyPreset() {
  const key = normalizeDifficulty(
    (typeof game !== "undefined" && game.gameSettings && game.gameSettings.difficulty) || "normal"
  );
  return DIFFICULTY_PRESETS[key];
}

function getDifficultyLabel(key) {
  const k = normalizeDifficulty(key);
  return DIFFICULTY_PRESETS[k].label;
}

function scaleCpuDefenseReactionMs(ms) {
  return Math.round(ms * getDifficultyPreset().defenseReactionMult);
}

function scaleCpuCluckDelayMs(ms) {
  return Math.round(ms * getDifficultyPreset().cluckDelayMult);
}

function applyDifficultyTeamSpeeds(cpuOffense) {
  const d = getDifficultyPreset();
  const offenseEntities = [player1, allyHorse, lilTunnelPete, offenseP4, offenseP5];
  const defenseEntities = [player2, allyDonkey, cluckNorris, defenseP4, defenseP5];
  const all = offenseEntities.concat(defenseEntities);

  all.forEach((entity) => {
    if (entity.baseSpeed == null) entity.baseSpeed = entity.speed;
    entity.speed = entity.baseSpeed;
  });

  const scaleList = (list, mult) => {
    list.forEach((entity) => {
      entity.speed = entity.baseSpeed * mult;
    });
  };

  if (cpuOffense) scaleList(offenseEntities, d.cpuOffenseSpeed);
  else scaleList(defenseEntities, d.cpuDefenseSpeed);
}

function getAdjustedPassPlayTuning(playKey) {
  const base = PASS_PLAY_TUNING[playKey] || PASS_PLAY_TUNING.passRight;
  const d = getDifficultyPreset();
  return {
    ...base,
    completionChance: clamp(base.completionChance * d.passCompletionMult, 0.12, 0.92),
    throwMinMs: Math.max(280, Math.round(base.throwMinMs / Math.max(0.75, d.cpuOffenseSpeed)))
  };
}

function randomCpuPatKickTarget() {
  const d = getDifficultyPreset();
  const w = d.patTargetHalfWidth;
  return clamp(0.5 + (Math.random() - 0.5) * w * 2, 0.08, 0.92);
}

function getCpuFourthDownFieldGoalChance() {
  return getDifficultyPreset().cpuFourthDownFg;
}

function computeDifficultyCpuKickoffCharge() {
  const d = getDifficultyPreset();
  return d.kickoffChargeMin + Math.random() * d.kickoffChargeRange;
}

function getDifficultyFumbleMultForCarrier(carrier) {
  const d = getDifficultyPreset();
  if (!carrier) return 1;
  if (!game.cpuOffense) {
    if (carrier === player1 || carrier === allyHorse || carrier === lilTunnelPete ||
        carrier === offenseP4 || carrier === offenseP5) {
      return d.userFumbleMult;
    }
    return 1;
  }
  if (carrier === player1 || carrier === allyHorse || carrier === lilTunnelPete ||
      carrier === offenseP4 || carrier === offenseP5) {
    return d.cpuFumbleMult;
  }
  return 1;
}
