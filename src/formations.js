// =========================================================
// Offensive formations (apply at LOS — routes/handoffs stay in game.js)
// =========================================================

const FORMATION_Y_LANES = {
  top: 0.22,
  topSlot: 0.34,
  mid: 0.5,
  botSlot: 0.66,
  bot: 0.78
};

/** Side length (yd) of the trips WR equilateral triangle. */
const TRIPS_TRIANGLE_YARDS = 7;
const DOUBLES_CROSS_WR_BACK_YD = 4;

const OFFENSE_ENTITIES = {
  player1: () => player1,
  lilTunnelPete: () => lilTunnelPete,
  allyHorse: () => allyHorse,
  offenseP4: () => offenseP4,
  offenseP5: () => offenseP5
};

const PLAY_FORMATION_MAP = {
  sweepRight: "sweepWingOneOL",
  sweepLeft: "sweepWingOneOL",
  passRight: "shotgunTrips",
  passLeft: "shotgunTrips",
  diveRight: "iProTwoOLWide",
  diveLeft: "iProTwoOLWide",
  barnPlay: "shotgunDoublesTwoOL",
  scrambledEggs: "shotgunDoublesTwoOL",
  hayBaleHook: "shotgunDoublesTwoOL",
  cornfieldCross: "doublesCrossTwoOL",
  barnDoorBoot: "iProTwoOLWide",
  siloSlant: "shotgunDoublesTwoOL",
  pasturePop: "shotgunDoublesTwoOL",
  fencePost: "shotgunTrips",
  mudHoleDive: "iProTwoOLWide"
};

function resolveFormationY(lane, entity) {
  if (typeof lane === "number") {
    return clamp(
      FIELD.y + FIELD.height * lane,
      FIELD.y + entity.radius,
      FIELD.y + FIELD.height - entity.radius
    );
  }
  const key = lane in FORMATION_Y_LANES ? lane : "mid";
  return clamp(
    FIELD.y + FIELD.height * FORMATION_Y_LANES[key],
    FIELD.y + entity.radius,
    FIELD.y + FIELD.height - entity.radius
  );
}

function formationSidelineY(entity, strength) {
  const pad = 14;
  if (strength === "left") {
    return clamp(
      FIELD.y + entity.radius + pad,
      FIELD.y + entity.radius,
      FIELD.y + FIELD.height - entity.radius
    );
  }
  return clamp(
    FIELD.y + FIELD.height - entity.radius - pad,
    FIELD.y + entity.radius,
    FIELD.y + FIELD.height - entity.radius
  );
}

function placeFormationSpot(lineX, spot) {
  const entity = OFFENSE_ENTITIES[spot.id]();
  if (spot.xYd === 0) {
    snapOffenseToLineOfScrimmage(entity, lineX);
  } else {
    entity.x = getOffsetX(lineX, spot.xYd);
  }
  entity.y = resolveFormationY(spot.yLane, entity);
  clampPlayerToField(entity);
}

function setFormationBallCarrier(snapFromId) {
  if (!snapFromId) return;
  ball.carrier = OFFENSE_ENTITIES[snapFromId]();
  ball.inFlight = false;
  updateBallPosition();
}

const PLAY_SNAP_FROM = {
  sweepRight: "lilTunnelPete",
  sweepLeft: "lilTunnelPete",
  passRight: "offenseP5",
  passLeft: "offenseP5",
  diveRight: "player1",
  diveLeft: "player1",
  barnPlay: "offenseP5",
  scrambledEggs: "offenseP5",
  hayBaleHook: "offenseP5",
  cornfieldCross: "player1",
  barnDoorBoot: "player1",
  siloSlant: "offenseP5",
  pasturePop: "offenseP5",
  fencePost: "offenseP5",
  mudHoleDive: "player1"
};

const FORMATION_DIAGRAM_DOT = {
  player1: { color: "#93c5fd", r: 4 },
  lilTunnelPete: { color: "#c8a97e", r: 3 },
  allyHorse: { color: "#f97316", r: 3 },
  offenseP4: { color: "#a78bfa", r: 3 },
  offenseP5: { color: "#c8a97e", r: 3 }
};

function applyBuiltSpots(spots) {
  spots.forEach((s) => {
    const entity = OFFENSE_ENTITIES[s.id]();
    entity.x = s.x;
    entity.y = s.y;
    clampPlayerToField(entity);
  });
}

/**
 * Trips WR triangle: outside WR on LOS, slot at apex (S/2 back, √3·S/2 inside), back WR on sideline at S back.
 * @returns {Array<{id:string,xYd:number,x:number,y:number,yNorm:number}>}
 */
function buildTripsEquilateralSpots(lineX, strength, fy, fh, toNorm) {
  const S = TRIPS_TRIANGLE_YARDS;
  const midY = fy + fh / 2;
  const outsideY = formationSidelineY(allyHorse, strength);
  const heightPx = ((S * Math.sqrt(3)) / 2) * YARDS_TO_PIXELS;
  const slotY = strength === "left" ? outsideY + heightPx : outsideY - heightPx;
  const clampEntityY = (entity, y) =>
    clamp(y, fy + entity.radius, fy + fh - entity.radius);

  const peteY = clampEntityY(lilTunnelPete, slotY);
  return [
    { id: "offenseP5", xYd: 0, x: lineX, y: midY, yNorm: toNorm(midY) },
    { id: "allyHorse", xYd: 0, x: lineX, y: outsideY, yNorm: toNorm(outsideY) },
    { id: "player1", xYd: -10, x: getOffsetX(lineX, -10), y: midY, yNorm: toNorm(midY) },
    {
      id: "lilTunnelPete",
      xYd: -S / 2,
      x: getOffsetX(lineX, -S / 2),
      y: peteY,
      yNorm: toNorm(peteY),
    },
    {
      id: "offenseP4",
      xYd: -S,
      x: getOffsetX(lineX, -S),
      y: outsideY,
      yNorm: toNorm(outsideY),
    },
  ];
}

/** Canonical spot list for a formation — used by apply + play diagrams. */
function buildFormationSpots(lineX, formationId, options = {}) {
  const strength = options.strength || "right";
  const fy = FIELD.y;
  const fh = FIELD.height;
  const midY = fy + fh / 2;
  const toNorm = (y) => (y - fy) / fh;
  const spots = [];

  function add(id, xYd, y) {
    const x = xYd === 0 ? lineX : getOffsetX(lineX, xYd);
    spots.push({ id, xYd, x, y, yNorm: toNorm(y) });
  }

  switch (formationId) {
    case "genericThreeOL":
      add("lilTunnelPete", 0, resolveFormationY("topSlot", lilTunnelPete));
      add("offenseP5", 0, resolveFormationY("mid", offenseP5));
      add("offenseP4", 0, resolveFormationY("botSlot", offenseP4));
      add("player1", -1.5, resolveFormationY("mid", player1));
      add("allyHorse", 0, resolveFormationY("bot", allyHorse));
      break;

    case "powerThreeOL":
      add("lilTunnelPete", 0, resolveFormationY("topSlot", lilTunnelPete));
      add("offenseP5", 0, resolveFormationY("mid", offenseP5));
      add("offenseP4", 0, resolveFormationY("botSlot", offenseP4));
      add("player1", -1.5, resolveFormationY("mid", player1));
      add("allyHorse", -12, resolveFormationY("mid", allyHorse));
      break;

    case "iProTwoOLWide":
      add("lilTunnelPete", 0, resolveFormationY("mid", lilTunnelPete));
      add("offenseP5", 0, resolveFormationY("bot", offenseP5));
      add("player1", -1.5, resolveFormationY("mid", player1));
      add("allyHorse", -10, resolveFormationY("mid", allyHorse));
      add("offenseP4", -15, resolveFormationY("mid", offenseP4));
      break;

    case "sweepWingTwoOL": {
      const wrY = formationSidelineY(allyHorse, strength);
      add("offenseP5", 0, resolveFormationY(strength === "left" ? "topSlot" : "botSlot", offenseP5));
      add("lilTunnelPete", 0, resolveFormationY(strength === "left" ? "topSlot" : "botSlot", lilTunnelPete));
      add("allyHorse", 0, wrY);
      add("player1", -2, resolveFormationY(strength === "left" ? "topSlot" : "botSlot", player1));
      add("offenseP4", -10, resolveFormationY(strength === "left" ? "top" : "bot", offenseP4));
      break;
    }

    case "sweepWingOneOL": {
      const outerWrY = formationSidelineY(allyHorse, strength);
      const wrGapPx = SWEEP_WR_VERTICAL_GAP_YARDS * YARDS_TO_PIXELS;
      const innerWrY = strength === "left" ? outerWrY + wrGapPx : outerWrY - wrGapPx;
      add("lilTunnelPete", 0, midY);
      add("player1", -2, midY);
      add("allyHorse", 0, outerWrY);
      add("offenseP5", 0, innerWrY);
      const dir = getOffenseDirection();
      const rSweep = 10 * YARDS_TO_PIXELS;
      const cxSweep = getOffsetX(lineX, -10);
      const cySweep = midY + (strength === "left" ? -2 : 2) * YARDS_TO_PIXELS;
      game.playModeSweepArcCY = cySweep;
      const rbAngle0 = dir > 0 ? Math.PI : 0;
      spots.push({
        id: "offenseP4",
        xYd: -10,
        x: cxSweep + rSweep * Math.cos(rbAngle0),
        y: cySweep + rSweep * Math.sin(rbAngle0),
        yNorm: toNorm(cySweep + rSweep * Math.sin(rbAngle0))
      });
      break;
    }

    case "shotgunDoublesTwoOL":
      add("offenseP4", 0, resolveFormationY("topSlot", offenseP4));
      add("offenseP5", 0, resolveFormationY("mid", offenseP5));
      add("allyHorse", 0, formationSidelineY(allyHorse, "left"));
      add("lilTunnelPete", 0, formationSidelineY(lilTunnelPete, "right"));
      add("player1", -10, resolveFormationY("mid", player1));
      break;

    case "doublesCrossTwoOL":
      add("offenseP4", 0, resolveFormationY("topSlot", offenseP4));
      add("offenseP5", 0, resolveFormationY("mid", offenseP5));
      add("player1", 0, resolveFormationY("mid", player1));
      add("allyHorse", 0, formationSidelineY(allyHorse, "left"));
      add("lilTunnelPete", -DOUBLES_CROSS_WR_BACK_YD, formationSidelineY(lilTunnelPete, "right"));
      break;

    case "shotgunTrips":
      return buildTripsEquilateralSpots(lineX, strength, fy, fh, toNorm);

    default:
      return buildFormationSpots(lineX, "genericThreeOL", options);
  }

  return spots;
}

function getFormationDiagramSpots(playKey, losX, dLeft, dTop, diagW, diagH) {
  const formationId = getFormationForPlay(playKey);
  const strength = getTripsStrengthForPlay(playKey);
  const refLineX = FIELD.x + FIELD.endZoneWidth + 50 * YARDS_TO_PIXELS;
  const spots = buildFormationSpots(refLineX, formationId, { strength });
  const dotPad = Math.max(3, Math.min(diagW, diagH) * 0.045);
  const drawW = diagW - dotPad * 2;
  const drawH = diagH - dotPad * 2;
  const xs = spots.map((s) => s.x).concat([refLineX]);
  const ys = spots.map((s) => s.y);
  const margin = 1.5 * YARDS_TO_PIXELS;
  const minX = Math.min(...xs) - margin;
  const maxX = Math.max(...xs) + margin;
  const minY = Math.min(...ys) - margin;
  const maxY = Math.max(...ys) + margin;
  const fieldW = Math.max(maxX - minX, 8 * YARDS_TO_PIXELS);
  const fieldH = Math.max(maxY - minY, 8 * YARDS_TO_PIXELS);
  const scale = Math.min(drawW / fieldW, drawH / fieldH) * 0.9;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const diagCenterX = dLeft + diagW / 2;
  const diagCenterY = dTop + diagH / 2;
  const refSize = Math.min(diagW, diagH);
  const tripsPass = playKey === "passRight" || playKey === "passLeft";
  const wrIds = new Set(["allyHorse", "lilTunnelPete", "offenseP4"]);

  return spots.map((s) => {
    const style = FORMATION_DIAGRAM_DOT[s.id] || { color: "#ffffff", r: 3 };
    const wrDot = tripsPass && wrIds.has(s.id);
    return {
      id: s.id,
      diagX: diagCenterX + (s.x - centerX) * scale,
      diagY: diagCenterY + (s.y - centerY) * scale,
      style: {
        color: style.color,
        r: wrDot ? Math.max(2, refSize * 0.02) : Math.max(style.r, refSize * 0.032),
      },
    };
  });
}

function getSnapFromForPlay(playKey) {
  return PLAY_SNAP_FROM[playKey] || "player1";
}

/** 3 OL + QB + WR on LOS (bottom). */
function applyGenericThreeOL(lineX, options = {}) {
  applyBuiltSpots(buildFormationSpots(lineX, "genericThreeOL", options));
  if (options.snapBall !== false) {
    setFormationBallCarrier(options.snapFrom || "lilTunnelPete");
  }
}

/** 3 OL + QB + single RB. */
function applyPowerThreeOL(lineX, options = {}) {
  applyBuiltSpots(buildFormationSpots(lineX, "powerThreeOL", options));
  if (options.snapBall !== false) {
    setFormationBallCarrier(options.snapFrom || "player1");
  }
}

/** 2 OL + QB + FB + RB (L-shape). */
function applyIProTwoOLWide(lineX, options = {}) {
  applyBuiltSpots(buildFormationSpots(lineX, "iProTwoOLWide", options));
  if (options.snapBall !== false) {
    setFormationBallCarrier(options.snapFrom || "player1");
  }
}

/** 2 OL + 1 WR on LOS + arc RB. */
function applySweepWingTwoOL(lineX, options = {}) {
  applyBuiltSpots(buildFormationSpots(lineX, "sweepWingTwoOL", options));
  if (options.snapBall !== false) {
    setFormationBallCarrier(options.snapFrom || "lilTunnelPete");
  }
}

/** 1 C + 2 WR on LOS + arc RB. */
function applySweepWingOneOL(lineX, options = {}) {
  applyBuiltSpots(buildFormationSpots(lineX, "sweepWingOneOL", options));
  if (options.snapBall !== false) {
    setFormationBallCarrier(options.snapFrom || "lilTunnelPete");
  }
}

/** 2 OL + 2 WR (top/bot) + shotgun QB. */
function applyShotgunDoublesTwoOL(lineX, options = {}) {
  applyBuiltSpots(buildFormationSpots(lineX, "shotgunDoublesTwoOL", options));
  if (options.snapBall !== false) {
    setFormationBallCarrier(options.snapFrom || "offenseP5");
  }
}

/** 2 OL + WR top LOS + WR backfield bottom. */
function applyDoublesCrossTwoOL(lineX, options = {}) {
  applyBuiltSpots(buildFormationSpots(lineX, "doublesCrossTwoOL", options));
  if (options.snapBall !== false) {
    setFormationBallCarrier(options.snapFrom || "player1");
  }
}

/** 1 C + 3 WR equilateral triangle + shotgun QB. */
function applyShotgunTrips(lineX, options = {}) {
  applyBuiltSpots(buildFormationSpots(lineX, "shotgunTrips", options));
  if (options.snapBall !== false) {
    setFormationBallCarrier(options.snapFrom || "offenseP5");
  }
}

const FORMATION_APPLIERS = {
  genericThreeOL: applyGenericThreeOL,
  powerThreeOL: applyPowerThreeOL,
  iProTwoOLWide: applyIProTwoOLWide,
  sweepWingTwoOL: applySweepWingTwoOL,
  sweepWingOneOL: applySweepWingOneOL,
  shotgunDoublesTwoOL: applyShotgunDoublesTwoOL,
  doublesCrossTwoOL: applyDoublesCrossTwoOL,
  shotgunTrips: applyShotgunTrips
};

function getFormationForPlay(playKey) {
  return PLAY_FORMATION_MAP[playKey] || "genericThreeOL";
}

function getTripsStrengthForPlay(playKey) {
  if (playKey === "passLeft" || playKey === "sweepLeft") return "left";
  if (playKey === "passRight" || playKey === "sweepRight" || playKey === "fencePost") return "right";
  return "right";
}

/**
 * @param {string} formationId
 * @param {number} lineX
 * @param {{ strength?: 'left'|'right', snapBall?: boolean, snapFrom?: string }} [options]
 */
function applyOffensiveFormation(formationId, lineX, options = {}) {
  const apply = FORMATION_APPLIERS[formationId];
  if (!apply) {
    console.warn("Unknown formation:", formationId);
    return false;
  }
  apply(lineX, options);
  return true;
}

function applyFormationForPlay(playKey, lineX, options = {}) {
  const formationId = getFormationForPlay(playKey);
  const strength = options.strength || getTripsStrengthForPlay(playKey);
  const snapFrom = options.snapFrom || getSnapFromForPlay(playKey);
  return applyOffensiveFormation(formationId, lineX, { ...options, strength, snapFrom });
}
