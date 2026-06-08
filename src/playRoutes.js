/** Field route previews shown during pre-play cadence (Ready / Set / Hut). */

const FIELD_ROUTE_COLORS = {
  qb: "#93c5fd",
  horse: "#f97316",
  pete: "#c8a97e",
  p4: "#a78bfa",
  p5: "#86efac",
  read: "rgba(255,255,255,0.55)",
};

function pos(entity) {
  return { x: entity.x, y: entity.y };
}

function polyRoute(from, waypoints, color, opts = {}) {
  return {
    kind: "polyline",
    points: [from, ...waypoints],
    color,
    dashed: opts.dashed || false,
    noArrow: opts.noArrow || false,
  };
}

function isQbDropbackPreviewPlay(playKey) {
  return (
    playKey === "passRight" ||
    playKey === "passLeft" ||
    playKey === "barnPlay" ||
    playKey === "scrambledEggs" ||
    playKey === "cornfieldCross" ||
    playKey === "barnDoorBoot" ||
    playKey === "pigPenScreen"
  );
}

/** Where the QB starts the cadence drop step (shallower than pocket for shotgun). */
function getQbDropbackPreviewStart() {
  const lineX = game.playModeLineX;
  const backPx = Math.abs(player1.x - lineX);
  if (backPx < 4 * YARDS_TO_PIXELS) {
    return { x: player1.x, y: player1.y };
  }
  return {
    x: clampPlayableX(getOffsetX(lineX, -4), player1.radius),
    y: player1.y,
  };
}

function getQbDropbackPreviewEnd(playKey) {
  const lineX = game.playModeLineX;
  if (playKey === "barnDoorBoot") {
    const dir = getOffenseDirection();
    return {
      x: clampPlayableX(lineX - dir * 10 * YARDS_TO_PIXELS, player1.radius),
      y: FIELD.y + FIELD.height / 2,
    };
  }
  if (playKey === "pigPenScreen") {
    const flat = getPigPenScreenRbFlatTarget();
    return { x: flat.x, y: flat.y };
  }
  return {
    x: getPassDropbackTarget(lineX),
    y: player1.y,
  };
}

function getQbDropbackPreviewProgress() {
  const idx = game.prePlayCadenceIndex || 0;
  if (idx <= 0) return 0.38;
  if (idx === 1) return 0.72;
  return 1;
}

function getQbDropbackPreviewRenderPoint(playKey) {
  if (!isQbDropbackPreviewPlay(playKey)) return null;
  const start = getQbDropbackPreviewStart();
  const end = getQbDropbackPreviewEnd(playKey);
  const t = getQbDropbackPreviewProgress();
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}

function getQbDropbackPreviewRoute(playKey) {
  if (!isQbDropbackPreviewPlay(playKey)) return null;
  return polyRoute(
    getQbDropbackPreviewStart(),
    [getQbDropbackPreviewEnd(playKey)],
    FIELD_ROUTE_COLORS.qb
  );
}

function qbPreviewPocketPoint(playKey) {
  if (isQbDropbackPreviewPlay(playKey)) {
    return getQbDropbackPreviewEnd(playKey);
  }
  return pos(player1);
}

function bezierRoute(from, cp, to, color, opts = {}) {
  return { kind: "bezier", from, cp, to, color, dashed: opts.dashed || false, noArrow: opts.noArrow || false };
}

function sampleArc(cx, cy, r, startAngle, endAngle, steps = 10) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = startAngle + (endAngle - startAngle) * t;
    pts.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
  }
  return pts;
}

function getSweepRbArcRoute(isLeft) {
  const dir = getOffenseDirection();
  const r = 10 * YARDS_TO_PIXELS;
  const cx = getOffsetX(game.playModeLineX, -10);
  const cy = game.playModeSweepArcCY ?? FIELD.y + FIELD.height / 2;
  let startAngle;
  let endAngle;
  if (isLeft) {
    startAngle = dir > 0 ? Math.PI : 0;
    endAngle = dir > 0 ? Math.PI + Math.PI / 2 : -Math.PI / 2;
  } else {
    startAngle = dir > 0 ? Math.PI : 0;
    endAngle = Math.PI / 2;
  }
  const arcPts = sampleArc(cx, cy, r, startAngle, endAngle, 12);
  return polyRoute(pos(offenseP4), arcPts.slice(1), FIELD_ROUTE_COLORS.p4);
}

function getTripsPassRoutes(playKey) {
  const lineX = game.playModeLineX;
  const toTop = playKey === "passLeft";
  const stemX = clampPlayableX(getOffsetX(lineX, 9), 18);
  const cornerX = clampPlayableX(getOffsetX(lineX, 22), 10);
  const cornerY = toTop
    ? FIELD.y + allyHorse.radius + 8
    : FIELD.y + FIELD.height - allyHorse.radius - 8;
  const postX = clampPlayableX(getOffsetX(lineX, 34), 10);
  const postY = FIELD.y + FIELD.height * (toTop ? 0.58 : 0.42);
  const slotStemX = clampPlayableX(getOffsetX(lineX, 12), 16);
  const insideStemX = clampPlayableX(getOffsetX(lineX, 12), 16);
  const insideBreakY = FIELD.y + FIELD.height * (toTop ? 0.44 : 0.56);
  const insideEndX = insideStemX + getOffenseDirection() * 8 * YARDS_TO_PIXELS;

  return [
    polyRoute(pos(offenseP5), [qbPreviewPocketPoint(playKey)], FIELD_ROUTE_COLORS.p5),
    polyRoute(
      pos(allyHorse),
      [{ x: stemX, y: allyHorse.y }, { x: cornerX, y: cornerY }, { x: postX, y: postY }],
      FIELD_ROUTE_COLORS.horse
    ),
    polyRoute(pos(lilTunnelPete), [{ x: slotStemX, y: lilTunnelPete.y }], FIELD_ROUTE_COLORS.pete),
    polyRoute(
      pos(offenseP4),
      [{ x: insideStemX, y: offenseP4.y }, { x: insideEndX, y: insideBreakY }],
      FIELD_ROUTE_COLORS.p4
    ),
    polyRoute(qbPreviewPocketPoint(playKey), [{ x: postX, y: postY }], FIELD_ROUTE_COLORS.read, {
      dashed: true,
      noArrow: true,
    }),
  ];
}

function getBarnPlayRoutes() {
  const lineX = game.playModeLineX;
  const horseStemX = clampPlayableX(getOffsetX(lineX, 22), 30);
  const peteStemX = clampPlayableX(getOffsetX(lineX, 12), 50);
  const horseTargetX = clampPlayableX(getOffsetX(lineX, 38), 10);
  const horseTargetY = FIELD.y + FIELD.height * 0.42;
  const peteTargetY = FIELD.y + FIELD.height * 0.28;
  const readX = clampPlayableX(getOffsetX(lineX, 38), 10);

  return [
    polyRoute(
      pos(allyHorse),
      [{ x: horseStemX, y: allyHorse.y }, { x: horseTargetX, y: horseTargetY }],
      FIELD_ROUTE_COLORS.horse
    ),
    polyRoute(
      pos(lilTunnelPete),
      [{ x: peteStemX, y: lilTunnelPete.y }, { x: peteStemX, y: peteTargetY }],
      FIELD_ROUTE_COLORS.pete
    ),
    polyRoute(pos(offenseP4), [
      {
        x: clampPlayableX(getOffsetX(lineX, 16), 20),
        y: FIELD.y + FIELD.height * 0.5,
      },
    ], FIELD_ROUTE_COLORS.p4),
    polyRoute(qbPreviewPocketPoint("barnPlay"), [{ x: readX, y: horseTargetY }], FIELD_ROUTE_COLORS.read, {
      dashed: true,
      noArrow: true,
    }),
  ];
}

function getScrambledEggsRoutes() {
  const lineX = game.playModeLineX;
  const zStemX = clampPlayableX(getOffsetX(lineX, 35), 22);
  const zTargetX = clampPlayableX(getOffsetX(lineX, 47), 8);
  const zTargetY = FIELD.y + FIELD.height - 34;
  const xStemX = clampPlayableX(getOffsetX(lineX, 27), 42);
  const xTargetX = clampPlayableX(getOffsetX(lineX, 25), 24);
  const readX = clampPlayableX(getOffsetX(lineX, 47), 8);

  return [
    polyRoute(
      pos(lilTunnelPete),
      [{ x: zStemX, y: lilTunnelPete.y }, { x: zTargetX, y: zTargetY }],
      FIELD_ROUTE_COLORS.pete
    ),
    polyRoute(
      pos(allyHorse),
      [{ x: xStemX, y: allyHorse.y }, { x: xTargetX, y: allyHorse.y }],
      FIELD_ROUTE_COLORS.horse
    ),
    polyRoute(pos(offenseP4), [
      { x: clampPlayableX(getOffsetX(lineX, 18), 24), y: offenseP4.y },
    ], FIELD_ROUTE_COLORS.p4),
    polyRoute(qbPreviewPocketPoint("scrambledEggs"), [{ x: readX, y: zTargetY }], FIELD_ROUTE_COLORS.read, {
      dashed: true,
      noArrow: true,
    }),
  ];
}

function getCornfieldCrossRoutes() {
  const dir = getOffenseDirection();
  const lineX = game.playModeLineX;
  const topLaneY = FIELD.y + FIELD.height * 0.28;
  const lowLaneY = FIELD.y + FIELD.height * 0.74;
  const crossMidX = clampPlayableX(lineX + dir * 14 * YARDS_TO_PIXELS, 16);
  const exitX = clampPlayableX(lineX + dir * 31 * YARDS_TO_PIXELS, 18);

  return [
    bezierRoute(
      pos(allyHorse),
      { x: crossMidX, y: allyHorse.y + 18 },
      { x: exitX, y: lowLaneY },
      FIELD_ROUTE_COLORS.horse
    ),
    bezierRoute(
      pos(lilTunnelPete),
      { x: crossMidX, y: lilTunnelPete.y - 18 },
      { x: exitX, y: topLaneY },
      FIELD_ROUTE_COLORS.pete
    ),
    polyRoute(pos(offenseP4), [
      {
        x: clampPlayableX(getOffsetX(lineX, 16), 20),
        y: FIELD.y + FIELD.height * 0.5,
      },
    ], FIELD_ROUTE_COLORS.p4),
  ];
}

function getBarnDoorBootRoutes() {
  const dir = getOffenseDirection();
  const lineX = game.playModeLineX;
  const midY = FIELD.y + FIELD.height / 2;
  const {
    arcRadius,
    startAngle,
    endAngle,
    arcCenterX,
    arcCenterY,
    lateralFlip,
  } = getBarnDoorBootArcGeometry();
  const deepX = clampPlayableX(lineX - dir * 10 * YARDS_TO_PIXELS, player1.radius);
  const arcCx = arcCenterX;
  const arcCy = arcCenterY;
  const arcPts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const ang = startAngle + (endAngle - startAngle) * t;
    arcPts.push({
      x: arcCx + Math.cos(ang) * arcRadius * dir,
      y: arcCy + lateralFlip * Math.sin(ang) * arcRadius,
    });
  }
  const fakeRunX = clampPlayableX(lineX - dir * 2.8 * YARDS_TO_PIXELS, allyHorse.radius);
  const fakeRunY = FIELD.y + FIELD.height * 0.68;
  const rbLeakX = clampPlayableX(lineX + dir * 3.5 * YARDS_TO_PIXELS, allyHorse.radius);
  const rbLeakY = FIELD.y + FIELD.height * 0.34;
  const wrStemX = clampPlayableX(lineX + dir * 14 * YARDS_TO_PIXELS, lilTunnelPete.radius);
  const wrBreakX = clampPlayableX(lineX + dir * 24 * YARDS_TO_PIXELS, lilTunnelPete.radius);
  const wrY = FIELD.y + 52;
  const readX = clampPlayableX(lineX + dir * 24 * YARDS_TO_PIXELS, 10);

  return [
    polyRoute(
      getQbDropbackPreviewStart(),
      [{ x: deepX, y: midY }, ...arcPts],
      FIELD_ROUTE_COLORS.qb
    ),
    polyRoute(
      pos(lilTunnelPete),
      [{ x: wrStemX, y: wrY }, { x: wrBreakX, y: wrY }],
      FIELD_ROUTE_COLORS.pete
    ),
    bezierRoute(
      pos(allyHorse),
      { x: (allyHorse.x + fakeRunX) / 2, y: (allyHorse.y + fakeRunY) / 2 },
      { x: rbLeakX, y: rbLeakY },
      FIELD_ROUTE_COLORS.horse
    ),
    polyRoute(qbPreviewPocketPoint("barnDoorBoot"), [{ x: readX, y: wrY }], FIELD_ROUTE_COLORS.read, {
      dashed: true,
      noArrow: true,
    }),
  ];
}

function getPigPenScreenRoutes() {
  const { x: catchX, y: catchY } = getPigPenScreenRbFlatTarget();
  const block = getPigPenScreenBlockTarget();
  const wrY = getPigPenScreenSidelineY(lilTunnelPete);

  return [
    bezierRoute(
      getQbDropbackPreviewStart(),
      { x: (player1.x + catchX) / 2, y: (player1.y + catchY) / 2 },
      { x: catchX, y: catchY },
      FIELD_ROUTE_COLORS.qb
    ),
    polyRoute(pos(lilTunnelPete), [{ x: block.x, y: wrY }], FIELD_ROUTE_COLORS.pete),
    polyRoute(pos(allyHorse), [{ x: catchX, y: catchY }], FIELD_ROUTE_COLORS.horse),
    polyRoute(qbPreviewPocketPoint("pigPenScreen"), [{ x: catchX, y: catchY }], FIELD_ROUTE_COLORS.read, {
      dashed: true,
      noArrow: true,
    }),
  ];
}

function getDiveRightRbRoute() {
  const runLaneY = FIELD.y + FIELD.height * 0.72;
  const motionX = getOffsetX(game.playModeLineX, -8.5);
  return polyRoute(pos(offenseP4), [{ x: motionX, y: runLaneY }], FIELD_ROUTE_COLORS.p4);
}

function getDiveLeftRbRoute() {
  const r = 5 * YARDS_TO_PIXELS;
  const cx = getOffsetX(game.playModeLineX, -5);
  const cy = FIELD.y + FIELD.height / 2;
  const arcPts = sampleArc(cx, cy, r, Math.PI, Math.PI + Math.PI / 2, 10);
  const handoffPt = arcPts[arcPts.length - 1];
  return polyRoute(pos(allyHorse), [handoffPt], FIELD_ROUTE_COLORS.horse);
}

function getPlayFieldRoutePreviews(playKey) {
  if (!playKey || !game.playModeLineX) return [];

  let routes;
  switch (playKey) {
    case "sweepRight":
      routes = [getSweepRbArcRoute(false)];
      break;
    case "sweepLeft":
      routes = [getSweepRbArcRoute(true)];
      break;
    case "passRight":
    case "passLeft":
      routes = getTripsPassRoutes(playKey);
      break;
    case "barnPlay":
      routes = getBarnPlayRoutes();
      break;
    case "scrambledEggs":
      routes = getScrambledEggsRoutes();
      break;
    case "cornfieldCross":
      routes = getCornfieldCrossRoutes();
      break;
    case "barnDoorBoot":
      routes = getBarnDoorBootRoutes();
      break;
    case "pigPenScreen":
      routes = getPigPenScreenRoutes();
      break;
    case "diveRight":
      routes = [getDiveRightRbRoute()];
      break;
    case "diveLeft":
      routes = [getDiveLeftRbRoute()];
      break;
    default:
      routes = [];
  }

  const dropRoute = getQbDropbackPreviewRoute(playKey);
  if (dropRoute && !routes.some((r) => r === dropRoute)) {
    // Boot/screen bake dropback into their QB path — skip duplicate arrow.
    const bootOrScreen = playKey === "barnDoorBoot" || playKey === "pigPenScreen";
    if (!bootOrScreen) {
      routes.unshift(dropRoute);
    }
  }
  return routes;
}

/** End points of key offensive routes — used for defensive man-coverage previews. */
function getOffenseRouteTargets(playKey) {
  const lineX = game.playModeLineX;
  if (!lineX) return {};

  switch (playKey) {
    case "passRight":
    case "passLeft": {
      const toTop = playKey === "passLeft";
      return {
        qb: { x: getPassDropbackTarget(lineX), y: player1.y },
        horse: {
          x: clampPlayableX(getOffsetX(lineX, 34), 10),
          y: FIELD.y + FIELD.height * (toTop ? 0.58 : 0.42),
        },
        pete: {
          x: clampPlayableX(getOffsetX(lineX, 12), 16),
          y: lilTunnelPete.y,
        },
        p4: {
          x: clampPlayableX(getOffsetX(lineX, 12), 16) + getOffenseDirection() * 8 * YARDS_TO_PIXELS,
          y: FIELD.y + FIELD.height * (toTop ? 0.44 : 0.56),
        },
      };
    }
    case "barnPlay":
      return {
        qb: { x: getPassDropbackTarget(lineX), y: player1.y },
        horse: {
          x: clampPlayableX(getOffsetX(lineX, 38), 10),
          y: FIELD.y + FIELD.height * 0.42,
        },
        pete: {
          x: clampPlayableX(getOffsetX(lineX, 12), 50),
          y: FIELD.y + FIELD.height * 0.28,
        },
        p4: {
          x: clampPlayableX(getOffsetX(lineX, 16), 20),
          y: FIELD.y + FIELD.height * 0.5,
        },
      };
    case "scrambledEggs":
      return {
        qb: { x: getPassDropbackTarget(lineX), y: player1.y },
        horse: {
          x: clampPlayableX(getOffsetX(lineX, 25), 24),
          y: allyHorse.y,
        },
        pete: {
          x: clampPlayableX(getOffsetX(lineX, 47), 8),
          y: FIELD.y + FIELD.height - 34,
        },
        p4: {
          x: clampPlayableX(getOffsetX(lineX, 18), 24),
          y: offenseP4.y,
        },
      };
    case "cornfieldCross": {
      const dir = getOffenseDirection();
      return {
        qb: { x: getPassDropbackTarget(lineX), y: player1.y },
        horse: {
          x: clampPlayableX(lineX + dir * 31 * YARDS_TO_PIXELS, 18),
          y: FIELD.y + FIELD.height * 0.74,
        },
        pete: {
          x: clampPlayableX(lineX + dir * 31 * YARDS_TO_PIXELS, 18),
          y: FIELD.y + FIELD.height * 0.28,
        },
        p4: {
          x: clampPlayableX(getOffsetX(lineX, 16), 20),
          y: FIELD.y + FIELD.height * 0.5,
        },
      };
    }
    case "barnDoorBoot": {
      const dir = getOffenseDirection();
      const { arcRadius, startAngle, endAngle, arcCenterX, arcCenterY, lateralFlip } =
        getBarnDoorBootArcGeometry();
      const ang = endAngle;
      return {
        qb: {
          x: arcCenterX + Math.cos(ang) * arcRadius * dir,
          y: arcCenterY + lateralFlip * Math.sin(ang) * arcRadius,
        },
        horse: {
          x: clampPlayableX(lineX + dir * 3.5 * YARDS_TO_PIXELS, allyHorse.radius),
          y: FIELD.y + FIELD.height * 0.34,
        },
        pete: {
          x: clampPlayableX(lineX + dir * 24 * YARDS_TO_PIXELS, lilTunnelPete.radius),
          y: FIELD.y + 52,
        },
      };
    }
    case "pigPenScreen": {
      const flat = getPigPenScreenRbFlatTarget();
      return {
        qb: { x: flat.x, y: flat.y },
        horse: { x: flat.x, y: flat.y },
        pete: { x: lilTunnelPete.x, y: getPigPenScreenSidelineY(lilTunnelPete) },
      };
    }
    default:
      return { qb: pos(player1) };
  }
}

function defCoverageLine(defender, target, role, opts = {}) {
  const route = polyRoute(pos(defender), [target], defender.color || "#ffffff", opts);
  route.role = role;
  return route;
}

function getDeepShellZonePoint(preferBottom) {
  const lineX = game.playModeLineX;
  const deepX = getOffsetX(lineX, DEF_SHELL_DEEP_YARDS);
  const y = preferBottom ? FIELD.y + FIELD.height * 0.82 : FIELD.y + FIELD.height * 0.34;
  return { x: deepX, y };
}

function getDefensePassCoveragePreviews(playKey) {
  const rusher = getSelectedPassRusher();
  const coverHorse = getDefenderById(game.passDefCoverHorseId);
  const coverPete = getDefenderById(game.passDefCoverPeteId);
  const targets = getOffenseRouteTargets(playKey);
  const shellB = game.selectedDefense === "B";
  const routes = [
    defCoverageLine(rusher, targets.qb || pos(player1), "Rush QB"),
  ];

  if (playKey === "pigPenScreen") {
    routes.push(defCoverageLine(coverPete, getScreenWrJamTarget(), "Jam WR"));
    routes.push(defCoverageLine(coverHorse, targets.horse || getPigPenScreenRbFlatTarget(), "Cover RB"));
  } else {
    if (targets.horse) {
      routes.push(defCoverageLine(coverHorse, targets.horse, "Cover WR"));
    }
    if (targets.pete) {
      routes.push(defCoverageLine(coverPete, targets.pete, "Cover WR"));
    }
  }

  if (targets.p4) {
    routes.push(
      defCoverageLine(defenseP4, targets.p4, shellB ? "Deep mid" : "Underneath", { dashed: true })
    );
  } else {
    routes.push(
      defCoverageLine(defenseP4, getDeepShellZonePoint(false), "Deep half", { dashed: true })
    );
  }
  routes.push(defCoverageLine(defenseP5, getDeepShellZonePoint(true), "Deep half", { dashed: true }));

  return routes;
}

function getDefenseSweepCoveragePreviews() {
  const lineX = game.playModeLineX;
  const dir = getOffenseDirection();
  const trailPx = SWEEP_DB_TRAIL_INSIDE_YARDS * YARDS_TO_PIXELS;
  const sweepRight = game.playModeCurrentPlay === "sweepRight";
  const oppositeFlatY = sweepRight ? FIELD.y + FIELD.height * 0.12 : FIELD.y + FIELD.height * 0.88;
  const rushX = getOffsetX(lineX, SWEEP_DEF_SINGLE_RUSHER_DEPTH_YARDS);
  const lbX = getOffsetX(rushX, SWEEP_LB_FROM_RUSHER_YARDS);
  const midY = FIELD.y + FIELD.height * 0.5;

  return [
    defCoverageLine(player2, { x: rushX, y: lilTunnelPete.y }, "Blitz"),
    defCoverageLine(allyDonkey, { x: lbX, y: midY }, "Fill"),
    defCoverageLine(
      defenseP4,
      { x: allyHorse.x - dir * trailPx, y: allyHorse.y },
      "Mirror WR"
    ),
    defCoverageLine(
      cluckNorris,
      { x: offenseP5.x - dir * trailPx, y: offenseP5.y },
      "Mirror WR"
    ),
    defCoverageLine(defenseP5, { x: getOffsetX(lineX, 7), y: oppositeFlatY }, "Flat"),
  ];
}

function getDefenseDiveRightCoveragePreviews() {
  const lineX = game.playModeLineX;
  const rusherX = getOffsetX(lineX, 7);
  const runLaneY = FIELD.y + FIELD.height * 0.72;
  const motionX = getOffsetX(lineX, -8.5);

  return [
    defCoverageLine(player2, { x: rusherX, y: runLaneY }, "Blitz"),
    defCoverageLine(defenseP4, pos(offenseP5), "CB — WR"),
    defCoverageLine(defenseP5, pos(allyHorse), "Fit — FB"),
    defCoverageLine(allyDonkey, { x: motionX, y: runLaneY }, "Fill", { dashed: true }),
    defCoverageLine(cluckNorris, { x: motionX, y: runLaneY }, "Fill", { dashed: true }),
  ];
}

function getDefenseDiveLeftCoveragePreviews() {
  const r = 5 * YARDS_TO_PIXELS;
  const cx = getOffsetX(game.playModeLineX, -5);
  const cy = FIELD.y + FIELD.height / 2;
  const handoffPt = { x: cx, y: cy - r };

  return [
    defCoverageLine(player2, pos(lilTunnelPete), "Engage"),
    defCoverageLine(allyDonkey, handoffPt, "Fill"),
    defCoverageLine(cluckNorris, handoffPt, "Fill"),
    defCoverageLine(defenseP4, handoffPt, "Pursue", { dashed: true }),
    defCoverageLine(defenseP5, handoffPt, "Pursue", { dashed: true }),
  ];
}

function getDefenseFieldCoveragePreviews(playKey) {
  if (!game.cpuOffense || !playKey || !game.playModeLineX) return [];

  if (playKey === "sweepRight" || playKey === "sweepLeft") {
    return getDefenseSweepCoveragePreviews();
  }
  if (playKey === "diveRight") {
    return getDefenseDiveRightCoveragePreviews();
  }
  if (playKey === "diveLeft") {
    return getDefenseDiveLeftCoveragePreviews();
  }
  return getDefensePassCoveragePreviews(playKey);
}
