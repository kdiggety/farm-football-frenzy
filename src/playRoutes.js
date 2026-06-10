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
    corner: opts.corner,
  };
}

function isQbDropbackPreviewPlay(playKey) {
  return (
    playKey === "passRight" ||
    playKey === "passLeft" ||
    playKey === "barnPlay" ||
    playKey === "hayBaleHook" ||
    playKey === "scrambledEggs" ||
    playKey === "cornfieldCross" ||
    playKey === "barnDoorBoot" ||
    playKey === "siloSlant" ||
    playKey === "pasturePop" ||
    playKey === "fencePost" ||
    (typeof isEasyPassPlay === "function" && isEasyPassPlay(playKey))
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
  if (typeof isEasyPassPlay === "function" && isEasyPassPlay(playKey)) {
    return {
      x: getEasyPassDropbackTarget(lineX),
      y: player1.y,
    };
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

function buildCurlRoutePreview(from, stemEnd, curlEnd, color, plant = null) {
  const waypoints = plant ? [stemEnd, plant, curlEnd] : [stemEnd, curlEnd];
  return [polyRoute(from, waypoints, color, { corner: 4 })];
}

const SCRAMBLED_EGGS_OUTSIDE_STEM_YD = 18;
const SCRAMBLED_EGGS_OUTSIDE_COMEBACK_YD = 5;
const SCRAMBLED_EGGS_OUTSIDE_SLANT_IN_YD = 2.5;
const SCRAMBLED_EGGS_CORNER_STEM_YD = 14;
const SCRAMBLED_EGGS_CORNER_BREAK_YD = 14;
const SCRAMBLED_EGGS_P4_CORNER_STEM_YD = 12;
const SCRAMBLED_EGGS_P4_CORNER_BREAK_YD = 10;
const SCRAMBLED_EGGS_P4_GO_DEPTH_YD = 40;

/** Horse (top outside WR): stem, slanted comeback — slight inside tilt, not a hard curl. */
function getScrambledEggsHorseComebackGeometry() {
  const lineX = game.playModeLineX;
  const y0 = allyHorse.y;
  const minY = FIELD.y + allyHorse.radius;
  const maxY = FIELD.y + FIELD.height - allyHorse.radius;
  const stemX = clampPlayableX(getOffsetX(lineX, SCRAMBLED_EGGS_OUTSIDE_STEM_YD), 42);
  const comebackX = clampPlayableX(
    getOffsetX(lineX, SCRAMBLED_EGGS_OUTSIDE_STEM_YD - SCRAMBLED_EGGS_OUTSIDE_COMEBACK_YD),
    24
  );
  const comebackY = clamp(
    y0 + SCRAMBLED_EGGS_OUTSIDE_SLANT_IN_YD * YARDS_TO_PIXELS,
    minY,
    maxY
  );
  return {
    start: pos(allyHorse),
    stemEnd: { x: stemX, y: y0 },
    cornerEnd: { x: comebackX, y: comebackY },
  };
}

/** P4 corner-go landmarks — stem, break to outside, then vertical go. */
function getScrambledEggsP4CornerGoTargets(lineX, slotY, outsideY, entityRadius = 24) {
  const minY = FIELD.y + entityRadius;
  const maxY = FIELD.y + FIELD.height - entityRadius;
  const stemX = clampPlayableX(getOffsetX(lineX, SCRAMBLED_EGGS_P4_CORNER_STEM_YD), entityRadius);
  const cornerX = clampPlayableX(
    getOffsetX(lineX, SCRAMBLED_EGGS_P4_CORNER_STEM_YD + SCRAMBLED_EGGS_P4_CORNER_BREAK_YD),
    14
  );
  const goX = clampPlayableX(getOffsetX(lineX, SCRAMBLED_EGGS_P4_GO_DEPTH_YD), 10);
  const sidelineY = clamp(outsideY, minY, maxY);
  return {
    stemEnd: { x: stemX, y: slotY },
    cornerEnd: { x: cornerX, y: sidelineY },
    goEnd: { x: goX, y: sidelineY },
  };
}

/** P4 (top slot): vertical stem, corner to the top sideline, then a straight go. */
function getScrambledEggsP4CornerGoGeometry() {
  const lineX = game.playModeLineX;
  const slotY =
    typeof resolveFormationY === "function"
      ? resolveFormationY("topSlot", offenseP4)
      : offenseP4.y;
  const outsideY =
    typeof formationSidelineY === "function"
      ? formationSidelineY(allyHorse, "left")
      : FIELD.y + FIELD.height * 0.22;
  const { stemEnd, cornerEnd, goEnd } = getScrambledEggsP4CornerGoTargets(
    lineX,
    slotY,
    outsideY,
    offenseP4.radius
  );
  return {
    start: pos(offenseP4),
    stemEnd,
    cornerEnd,
    goEnd,
  };
}

/** @deprecated Use getScrambledEggsP4CornerGoGeometry */
function getScrambledEggsP4SlotFadeGeometry() {
  return getScrambledEggsP4CornerGoGeometry();
}

function buildCornerGoRoutePreview(from, stemEnd, cornerEnd, goEnd, color) {
  return [polyRoute(from, [stemEnd, cornerEnd, goEnd], color, { corner: 4 })];
}

function initCornerGoRouteState(entity, geometry, state) {
  if (state.frozen) return;
  const laneY = entity.y;
  state.frozen = {
    laneY,
    stemEnd: { x: geometry.stemEnd.x, y: laneY },
    cornerEnd: { x: geometry.cornerEnd.x, y: geometry.cornerEnd.y },
    goEnd: { x: geometry.goEnd.x, y: geometry.goEnd.y },
  };
  state.phase = "stem";
}

/** Vertical stem, corner to the sideline, then straight go downfield. */
function moveReceiverCornerGoRoute(entity, geometry, speed, dt, state) {
  if (!state) return;
  initCornerGoRouteState(entity, geometry, state);
  const { stemEnd, cornerEnd, goEnd } = state.frozen;
  const dir = getOffenseDirection();

  if (state.phase === "stem") {
    entity.y = stemEnd.y;
    const nextX = entity.x + dir * speed * dt;
    entity.x = dir > 0 ? Math.min(nextX, stemEnd.x) : Math.max(nextX, stemEnd.x);
    if (hasReachedForwardX(entity.x, stemEnd.x)) {
      entity.x = stemEnd.x;
      state.phase = "corner";
    }
    return;
  }

  if (state.phase === "corner") {
    moveToward(entity, cornerEnd.x, cornerEnd.y, speed, dt);
    if (distance(entity.x, entity.y, cornerEnd.x, cornerEnd.y) < 12) {
      entity.x = cornerEnd.x;
      entity.y = cornerEnd.y;
      state.phase = "go";
    }
    return;
  }

  if (state.phase === "run") {
    entity.y = goEnd.y;
    continueReceiverAfterLandmark(entity, goEnd.x, goEnd.y, speed, dt);
    return;
  }

  entity.y = goEnd.y;
  const nextX = entity.x + dir * speed * dt;
  const reachedGo = !hasNotReachedForwardX(nextX, goEnd.x);
  if (reachedGo) {
    entity.x = goEnd.x;
    state.phase = "run";
    continueReceiverAfterLandmark(entity, goEnd.x, goEnd.y, speed, dt);
    return;
  }
  entity.x = nextX;
}

/** @deprecated Use moveReceiverCornerGoRoute */
function moveReceiverSlotFadeRoute(entity, geometry, speed, dt, state) {
  moveReceiverCornerGoRoute(entity, geometry, speed, dt, state);
}

/** @deprecated Use getScrambledEggsHorseComebackGeometry */
function getScrambledEggsHorseCurlGeometry() {
  return getScrambledEggsHorseComebackGeometry();
}

/** Pete (bottom WR): vertical stem, one 45° break toward the back pylon. */
function getScrambledEggsPeteCornerGeometry() {
  const lineX = game.playModeLineX;
  const y0 = lilTunnelPete.y;
  const stemX = clampPlayableX(getOffsetX(lineX, SCRAMBLED_EGGS_CORNER_STEM_YD), lilTunnelPete.radius);
  const cornerX = clampPlayableX(
    getOffsetX(lineX, SCRAMBLED_EGGS_CORNER_STEM_YD + SCRAMBLED_EGGS_CORNER_BREAK_YD),
    8
  );
  const cornerY = clamp(
    y0 + SCRAMBLED_EGGS_CORNER_BREAK_YD * YARDS_TO_PIXELS,
    FIELD.y + lilTunnelPete.radius,
    FIELD.y + FIELD.height - lilTunnelPete.radius
  );
  return {
    start: pos(lilTunnelPete),
    stemEnd: { x: stemX, y: y0 },
    cornerEnd: { x: cornerX, y: cornerY },
  };
}

/** Stem, optional inside stem, then break to the corner landmark. */
function moveReceiverCornerRoute(entity, geometry, speed, dt, state) {
  if (!state) return;
  if (!state.phase) state.phase = "stem";

  const { stemEnd, plant, cornerEnd } = geometry;

  if (state.phase === "stem") {
    moveToward(entity, stemEnd.x, stemEnd.y, speed, dt);
    if (hasReachedForwardX(entity.x, stemEnd.x)) {
      state.phase = plant ? "plant" : "corner";
    }
    return;
  }

  if (state.phase === "plant" && plant) {
    moveToward(entity, plant.x, plant.y, speed, dt);
    if (distance(entity.x, entity.y, plant.x, plant.y) < 10) {
      state.phase = "corner";
    }
    return;
  }

  runReceiverToLandmarkOrContinue(entity, cornerEnd.x, cornerEnd.y, speed, dt);
}

/** Trips slot (Pete): 12 yd stem, inside hook at depth, 5 yd comeback angled toward the QB. */
function getTripsSlotCurlGeometry(playKey) {
  const lineX = game.playModeLineX;
  const y = lilTunnelPete.y;
  const stemX = clampPlayableX(getOffsetX(lineX, 12), 16);
  const curlX = clampPlayableX(getOffsetX(lineX, 7), 16);
  const midY = FIELD.y + FIELD.height * 0.5;
  const towardPocket = (midY - y) * 0.55;
  const minY = FIELD.y + lilTunnelPete.radius;
  const maxY = FIELD.y + FIELD.height - lilTunnelPete.radius;
  const plantY = clamp(y + towardPocket * 0.35, minY, maxY);
  const curlY = clamp(y + towardPocket, minY, maxY);
  return {
    start: pos(lilTunnelPete),
    stemEnd: { x: stemX, y },
    plant: { x: stemX, y: plantY },
    curlEnd: { x: curlX, y: curlY },
  };
}

/** Trips backside WR (P4): stem then sharp in cut toward the middle at the break depth. */
function getTripsInRouteGeometry(playKey) {
  const lineX = game.playModeLineX;
  const stemX = clampPlayableX(getOffsetX(lineX, 10), 16);
  const breakY = FIELD.y + FIELD.height * 0.5;
  return {
    start: pos(offenseP4),
    stemEnd: { x: stemX, y: offenseP4.y },
    breakEnd: { x: stemX, y: breakY },
  };
}

function getTripsSevenPostGeometry(playKey) {
  const lineX = game.playModeLineX;
  const toTop = playKey === "passLeft";
  const stemX = clampPlayableX(getOffsetX(lineX, 9), 18);
  const cornerX = clampPlayableX(getOffsetX(lineX, 22), 10);
  const cornerY = toTop
    ? FIELD.y + allyHorse.radius + 8
    : FIELD.y + FIELD.height - allyHorse.radius - 8;
  const postX = clampPlayableX(getOffsetX(lineX, 42), 10);
  const postY = FIELD.y + FIELD.height * (toTop ? 0.58 : 0.42);
  return { stemX, cornerX, cornerY, postX, postY, toTop };
}

/** Stem upfield, sharp plant, settle straight back toward the QB. */
function moveReceiverCurlRoute(entity, geometry, speed, dt, state) {
  if (!state) return;
  if (!state.phase) state.phase = "stem";

  const { stemEnd, curlEnd } = geometry;

  if (state.phase === "stem") {
    moveToward(entity, stemEnd.x, stemEnd.y, speed, dt);
    if (hasReachedForwardX(entity.x, stemEnd.x)) {
      state.phase = geometry.plant ? "plant" : "curl";
    }
    return;
  }

  if (state.phase === "plant" && geometry.plant) {
    moveToward(entity, geometry.plant.x, geometry.plant.y, speed, dt);
    if (distance(entity.x, entity.y, geometry.plant.x, geometry.plant.y) < 10) {
      state.phase = "curl";
    }
    return;
  }

  runReceiverToLandmarkOrContinue(entity, curlEnd.x, curlEnd.y, speed, dt);
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
  const { stemX, cornerX, cornerY, postX, postY } = getTripsSevenPostGeometry(playKey);
  const slotCurl = getTripsSlotCurlGeometry(playKey);
  const inRoute = getTripsInRouteGeometry(playKey);

  return [
    polyRoute(pos(offenseP5), [qbPreviewPocketPoint(playKey)], FIELD_ROUTE_COLORS.p5),
    polyRoute(
      pos(allyHorse),
      [{ x: stemX, y: allyHorse.y }, { x: cornerX, y: cornerY }, { x: postX, y: postY }],
      FIELD_ROUTE_COLORS.horse
    ),
    ...buildCurlRoutePreview(
      slotCurl.start,
      slotCurl.stemEnd,
      slotCurl.curlEnd,
      FIELD_ROUTE_COLORS.pete,
      slotCurl.plant
    ),
    polyRoute(
      inRoute.start,
      [inRoute.stemEnd, inRoute.breakEnd],
      FIELD_ROUTE_COLORS.p4,
      { corner: 4 }
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
  const cornerGeo = getScrambledEggsPeteCornerGeometry();
  const comebackGeo = getScrambledEggsHorseComebackGeometry();
  const p4Geo = getScrambledEggsP4CornerGoGeometry();

  return [
    polyRoute(
      cornerGeo.start,
      [cornerGeo.stemEnd, cornerGeo.cornerEnd],
      FIELD_ROUTE_COLORS.pete,
      { corner: 4 }
    ),
    polyRoute(
      comebackGeo.start,
      [comebackGeo.stemEnd, comebackGeo.cornerEnd],
      FIELD_ROUTE_COLORS.horse,
      { corner: 4 }
    ),
    ...buildCornerGoRoutePreview(
      p4Geo.start,
      p4Geo.stemEnd,
      p4Geo.cornerEnd,
      p4Geo.goEnd,
      FIELD_ROUTE_COLORS.p4
    ),
    polyRoute(
      qbPreviewPocketPoint("scrambledEggs"),
      [{ x: cornerGeo.cornerEnd.x, y: cornerGeo.cornerEnd.y }],
      FIELD_ROUTE_COLORS.read,
      { dashed: true, noArrow: true }
    ),
  ];
}

/** Top slot (P4): stem, hook over the middle, comeback toward the QB. */
function getCornfieldCrossSlotCurlGeometry() {
  const lineX = game.playModeLineX;
  const y =
    typeof resolveFormationY === "function"
      ? resolveFormationY("topSlot", offenseP4)
      : offenseP4.y;
  const stemX = clampPlayableX(getOffsetX(lineX, 12), 16);
  const curlX = clampPlayableX(getOffsetX(lineX, 7), 16);
  const midY = FIELD.y + FIELD.height * 0.5;
  const towardMiddle = (midY - y) * 0.55;
  const minY = FIELD.y + offenseP4.radius;
  const maxY = FIELD.y + FIELD.height - offenseP4.radius;
  const plantY = clamp(y + towardMiddle * 0.35, minY, maxY);
  const curlY = clamp(y + towardMiddle, minY, maxY);
  return {
    start: pos(offenseP4),
    stemEnd: { x: stemX, y },
    plant: { x: stemX, y: plantY },
    curlEnd: { x: curlX, y: curlY },
  };
}

function getCornfieldCrossRoutes() {
  const dir = getOffenseDirection();
  const lineX = game.playModeLineX;
  const topLaneY = FIELD.y + FIELD.height * 0.28;
  const lowLaneY = FIELD.y + FIELD.height * 0.74;
  const crossMidX = clampPlayableX(lineX + dir * 14 * YARDS_TO_PIXELS, 16);
  const exitX = clampPlayableX(lineX + dir * 31 * YARDS_TO_PIXELS, 18);
  const slotCurl = getCornfieldCrossSlotCurlGeometry();

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
    ...buildCurlRoutePreview(
      slotCurl.start,
      slotCurl.stemEnd,
      slotCurl.curlEnd,
      FIELD_ROUTE_COLORS.p4,
      slotCurl.plant
    ),
  ];
}

function getBarnDoorBootQbWaypoints(lineX) {
  const dir = getOffenseDirection();
  const midY = FIELD.y + FIELD.height / 2;
  const arcRadius = 10 * YARDS_TO_PIXELS;
  const startAngle = (5 / 12) * (2 * Math.PI);
  const endAngle = (10 / 12) * (2 * Math.PI);
  const lateralFlip = game.barnDoorBootLateralFlip == null ? 1 : game.barnDoorBootLateralFlip;
  const arcCenterX = lineX - Math.cos(startAngle) * arcRadius * dir;
  const arcCenterY = midY - lateralFlip * Math.sin(startAngle) * arcRadius;
  const deepX = lineX - dir * 10 * YARDS_TO_PIXELS;
  const arcPts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const ang = startAngle + (endAngle - startAngle) * t;
    arcPts.push({
      x: arcCenterX + Math.cos(ang) * arcRadius * dir,
      y: arcCenterY + lateralFlip * Math.sin(ang) * arcRadius,
    });
  }
  return [{ x: deepX, y: midY }, ...arcPts];
}

function getBarnDoorBootRoutes() {
  const lineX = game.playModeLineX;
  const dir = getOffenseDirection();
  const fakeRunX = clampPlayableX(lineX - dir * 2.8 * YARDS_TO_PIXELS, 10);
  const fakeRunY = FIELD.y + FIELD.height * 0.68;
  const wrOutsideBreakX = clampPlayableX(lineX + dir * 24 * YARDS_TO_PIXELS, 10);
  const wrOutsideStemX = clampPlayableX(lineX + dir * 14 * YARDS_TO_PIXELS, 10);
  return [
    polyRoute(pos(allyHorse), [{ x: fakeRunX, y: fakeRunY }], FIELD_ROUTE_COLORS.horse),
    polyRoute(
      pos(lilTunnelPete),
      [{ x: wrOutsideStemX, y: FIELD.y + 52 }, { x: wrOutsideBreakX, y: FIELD.y + 52 }],
      FIELD_ROUTE_COLORS.pete
    ),
  ];
}

const HAY_BALE_HOOK_STEM_YD = 10;
const HAY_BALE_HOOK_BREAK_YD = 5;

/** Top WR (Horse): stem, hook back toward the pocket. */
function getHayBaleHookHorseGeometry() {
  const lineX = game.playModeLineX;
  const y = allyHorse.y;
  const stemX = clampPlayableX(getOffsetX(lineX, HAY_BALE_HOOK_STEM_YD), 30);
  const curlX = clampPlayableX(getOffsetX(lineX, HAY_BALE_HOOK_STEM_YD - HAY_BALE_HOOK_BREAK_YD), 16);
  const midY = FIELD.y + FIELD.height * 0.5;
  const towardMiddle = (midY - y) * 0.5;
  const minY = FIELD.y + allyHorse.radius;
  const maxY = FIELD.y + FIELD.height - allyHorse.radius;
  const plantY = clamp(y + towardMiddle * 0.35, minY, maxY);
  const curlY = clamp(y + towardMiddle, minY, maxY);
  return {
    start: pos(allyHorse),
    stemEnd: { x: stemX, y },
    plant: { x: stemX, y: plantY },
    curlEnd: { x: curlX, y: curlY },
  };
}

/** Bottom WR (Pete): stem, hook back toward the pocket. */
function getHayBaleHookPeteGeometry() {
  const lineX = game.playModeLineX;
  const y = lilTunnelPete.y;
  const stemX = clampPlayableX(getOffsetX(lineX, HAY_BALE_HOOK_STEM_YD), 50);
  const curlX = clampPlayableX(getOffsetX(lineX, HAY_BALE_HOOK_STEM_YD - HAY_BALE_HOOK_BREAK_YD), 16);
  const midY = FIELD.y + FIELD.height * 0.5;
  const towardMiddle = (midY - y) * 0.5;
  const minY = FIELD.y + lilTunnelPete.radius;
  const maxY = FIELD.y + FIELD.height - lilTunnelPete.radius;
  const plantY = clamp(y + towardMiddle * 0.35, minY, maxY);
  const curlY = clamp(y + towardMiddle, minY, maxY);
  return {
    start: pos(lilTunnelPete),
    stemEnd: { x: stemX, y },
    plant: { x: stemX, y: plantY },
    curlEnd: { x: curlX, y: curlY },
  };
}

const SILO_SLANT_STEM_YD = 6;
const SILO_SLANT_INSIDE_YD = 4;
const SILO_SLANT_OUT_STEM_YD = 8;

function getSiloSlantHorseGeometry() {
  const lineX = game.playModeLineX;
  const y = allyHorse.y;
  const stemX = clampPlayableX(getOffsetX(lineX, SILO_SLANT_STEM_YD), 24);
  const midY = FIELD.y + FIELD.height * 0.5;
  const slantY = clamp(
    y + (midY - y) * 0.72,
    FIELD.y + allyHorse.radius,
    FIELD.y + FIELD.height - allyHorse.radius
  );
  return {
    start: pos(allyHorse),
    stemEnd: { x: stemX, y },
    cornerEnd: { x: stemX, y: slantY },
  };
}

function getSiloSlantPeteGeometry() {
  const lineX = game.playModeLineX;
  const y = lilTunnelPete.y;
  const stemX = clampPlayableX(getOffsetX(lineX, SILO_SLANT_OUT_STEM_YD), 50);
  const sidelineY = FIELD.y + FIELD.height - lilTunnelPete.radius - 10;
  const outY = clamp(y + (sidelineY - y) * 0.55, y, sidelineY);
  return {
    start: pos(lilTunnelPete),
    stemEnd: { x: stemX, y },
    cornerEnd: { x: stemX, y: outY },
  };
}

function getSiloSlantRoutes() {
  const horse = getSiloSlantHorseGeometry();
  const pete = getSiloSlantPeteGeometry();
  const lineX = game.playModeLineX;
  return [
    polyRoute(horse.start, [horse.stemEnd, horse.cornerEnd], FIELD_ROUTE_COLORS.horse),
    polyRoute(pete.start, [pete.stemEnd, pete.cornerEnd], FIELD_ROUTE_COLORS.pete),
    polyRoute(
      pos(offenseP4),
      [{ x: clampPlayableX(getOffsetX(lineX, 14), 20), y: FIELD.y + FIELD.height * 0.5 }],
      FIELD_ROUTE_COLORS.p4
    ),
    polyRoute(
      qbPreviewPocketPoint("siloSlant"),
      [{ x: horse.cornerEnd.x, y: horse.cornerEnd.y }],
      FIELD_ROUTE_COLORS.read,
      { dashed: true, noArrow: true }
    ),
  ];
}

const PASTURE_POP_HITCH_STEM_YD = 5;
const PASTURE_POP_HITCH_BREAK_YD = 3;
const PASTURE_POP_GO_DEPTH_YD = 24;

function getPasturePopPeteGeometry() {
  const lineX = game.playModeLineX;
  const y = lilTunnelPete.y;
  const stemX = clampPlayableX(getOffsetX(lineX, PASTURE_POP_HITCH_STEM_YD), 50);
  const curlX = clampPlayableX(getOffsetX(lineX, PASTURE_POP_HITCH_STEM_YD - PASTURE_POP_HITCH_BREAK_YD), 16);
  const midY = FIELD.y + FIELD.height * 0.5;
  const curlY = clamp(y + (midY - y) * 0.35, FIELD.y + lilTunnelPete.radius, FIELD.y + FIELD.height - lilTunnelPete.radius);
  return {
    start: pos(lilTunnelPete),
    stemEnd: { x: stemX, y },
    plant: { x: stemX, y: curlY },
    curlEnd: { x: curlX, y: curlY },
  };
}

function getPasturePopRoutes() {
  const hitch = getPasturePopPeteGeometry();
  const lineX = game.playModeLineX;
  const goX = clampPlayableX(getOffsetX(lineX, PASTURE_POP_GO_DEPTH_YD), 10);
  return [
    ...buildCurlRoutePreview(
      hitch.start,
      hitch.stemEnd,
      hitch.curlEnd,
      FIELD_ROUTE_COLORS.pete,
      hitch.plant
    ),
    polyRoute(pos(allyHorse), [{ x: goX, y: allyHorse.y }], FIELD_ROUTE_COLORS.horse),
    polyRoute(
      pos(offenseP4),
      [{ x: clampPlayableX(getOffsetX(lineX, 10), 16), y: FIELD.y + FIELD.height * 0.5 }],
      FIELD_ROUTE_COLORS.p4
    ),
    polyRoute(
      qbPreviewPocketPoint("pasturePop"),
      [{ x: hitch.curlEnd.x, y: hitch.curlEnd.y }],
      FIELD_ROUTE_COLORS.read,
      { dashed: true, noArrow: true }
    ),
  ];
}

function getHayBaleHookRoutes() {
  const horseHook = getHayBaleHookHorseGeometry();
  const peteHook = getHayBaleHookPeteGeometry();
  const lineX = game.playModeLineX;

  return [
    ...buildCurlRoutePreview(
      horseHook.start,
      horseHook.stemEnd,
      horseHook.curlEnd,
      FIELD_ROUTE_COLORS.horse,
      horseHook.plant
    ),
    ...buildCurlRoutePreview(
      peteHook.start,
      peteHook.stemEnd,
      peteHook.curlEnd,
      FIELD_ROUTE_COLORS.pete,
      peteHook.plant
    ),
    polyRoute(
      pos(offenseP4),
      [{ x: clampPlayableX(getOffsetX(lineX, 16), 20), y: FIELD.y + FIELD.height * 0.5 }],
      FIELD_ROUTE_COLORS.p4
    ),
    polyRoute(
      qbPreviewPocketPoint("hayBaleHook"),
      [{ x: horseHook.curlEnd.x, y: horseHook.curlEnd.y }],
      FIELD_ROUTE_COLORS.read,
      { dashed: true, noArrow: true }
    ),
  ];
}

function getDiveRightRbRoute() {
  const runLaneY = FIELD.y + FIELD.height * 0.72;
  const motionX = getOffsetX(game.playModeLineX, -8.5);
  return polyRoute(pos(offenseP4), [{ x: motionX, y: runLaneY }], FIELD_ROUTE_COLORS.p4);
}

function getMudHoleDiveRbRoute() {
  const runLaneY = FIELD.y + FIELD.height * 0.55;
  const motionX = getOffsetX(game.playModeLineX, -8.5);
  return polyRoute(pos(offenseP4), [{ x: motionX, y: runLaneY }], FIELD_ROUTE_COLORS.p4);
}

function getDiveLeftRbRoute() {
  const dir = getOffenseDirection();
  const r = 5 * YARDS_TO_PIXELS;
  const cx = getOffsetX(game.playModeLineX, -5);
  const cy = FIELD.y + FIELD.height / 2;
  const startAngle = dir > 0 ? Math.PI : 0;
  const endAngle = dir > 0 ? Math.PI + Math.PI / 2 : Math.PI / 2;
  const arcPts = sampleArc(cx, cy, r, startAngle, endAngle, 10);
  return polyRoute(pos(lilTunnelPete), arcPts.slice(1), FIELD_ROUTE_COLORS.pete);
}

function getSweepLeadBlockRoutePreviews() {
  const lineX = game.playModeLineX;
  const halfGap = 5 * YARDS_TO_PIXELS;
  const stemX = getOffsetX(lineX, 14);
  const blockX = getOffsetX(lineX, 8);
  const horseY = allyHorse.y;
  const p5Y = offenseP5.y;
  return [
    polyRoute(
      pos(allyHorse),
      [{ x: stemX - halfGap, y: horseY }, { x: blockX - halfGap, y: horseY }],
      FIELD_ROUTE_COLORS.horse
    ),
    polyRoute(
      pos(offenseP5),
      [{ x: stemX + halfGap, y: p5Y }, { x: blockX + halfGap, y: p5Y }],
      FIELD_ROUTE_COLORS.p5
    ),
  ];
}

function getEasyStraightUpRoute() {
  const midY = getEasyStraightUpRunLaneY();
  const handoffX = getOffsetX(game.playModeLineX, -4);
  return polyRoute(pos(offenseP4), [{ x: handoffX, y: midY }], FIELD_ROUTE_COLORS.p4);
}

function getEasyQbKeepRoute() {
  const midY = FIELD.y + FIELD.height / 2;
  return polyRoute(pos(player1), [{ x: getOffsetX(game.playModeLineX, 8), y: midY }], FIELD_ROUTE_COLORS.p4);
}

function getEasyQuickOutRoute() {
  const stemX = getOffsetX(game.playModeLineX, 6);
  const { outX, outY } = getEasyOutBreakPoint(allyHorse, 10);
  return polyRoute(pos(allyHorse), [{ x: stemX, y: allyHorse.y }, { x: outX, y: outY }], FIELD_ROUTE_COLORS.horse);
}

function getEasyFlatPassRoute() {
  return polyRoute(
    pos(lilTunnelPete),
    [{ x: getOffsetX(game.playModeLineX, 5), y: lilTunnelPete.y }],
    FIELD_ROUTE_COLORS.pete
  );
}

function getEasyGoRouteRoute() {
  return polyRoute(
    pos(allyHorse),
    [{ x: getOffsetX(game.playModeLineX, 16), y: allyHorse.y }],
    FIELD_ROUTE_COLORS.horse
  );
}

function getEasyCheckDownRoute() {
  const midY = FIELD.y + FIELD.height / 2;
  return polyRoute(
    pos(offenseP4),
    [{ x: getOffsetX(game.playModeLineX, 4), y: midY + 12 }],
    FIELD_ROUTE_COLORS.p4
  );
}

function getEasyPassFieldRoutePreviews(playKey) {
  const lineX = game.playModeLineX;
  const midY = FIELD.y + FIELD.height / 2;

  if (playKey === "quickOut") {
    const stemX = getOffsetX(lineX, 6);
    const { outX, outY } = getEasyOutBreakPoint(allyHorse, 10);
    return [
      polyRoute(pos(allyHorse), [{ x: stemX, y: allyHorse.y }, { x: outX, y: outY }], FIELD_ROUTE_COLORS.horse),
      polyRoute(pos(lilTunnelPete), [{ x: getOffsetX(lineX, 8), y: lilTunnelPete.y }], FIELD_ROUTE_COLORS.pete),
      polyRoute(pos(offenseP4), [{ x: getOffsetX(lineX, 3), y: midY }], FIELD_ROUTE_COLORS.p4),
    ];
  }
  if (playKey === "flatPass") {
    return [
      polyRoute(pos(lilTunnelPete), [{ x: getOffsetX(lineX, 5), y: lilTunnelPete.y }], FIELD_ROUTE_COLORS.pete),
      polyRoute(pos(allyHorse), [{ x: getOffsetX(lineX, 14), y: allyHorse.y }], FIELD_ROUTE_COLORS.horse),
      polyRoute(pos(offenseP4), [{ x: getOffsetX(lineX, 2), y: midY }], FIELD_ROUTE_COLORS.p4),
    ];
  }
  if (playKey === "goRoute") {
    return [
      polyRoute(pos(allyHorse), [{ x: getOffsetX(lineX, 16), y: allyHorse.y }], FIELD_ROUTE_COLORS.horse),
      polyRoute(pos(lilTunnelPete), [{ x: getOffsetX(lineX, 8), y: lilTunnelPete.y }], FIELD_ROUTE_COLORS.pete),
      polyRoute(pos(offenseP4), [{ x: getOffsetX(lineX, 4), y: midY }], FIELD_ROUTE_COLORS.p4),
    ];
  }
  if (playKey === "checkDown") {
    return [
      polyRoute(pos(offenseP4), [{ x: getOffsetX(lineX, 4), y: midY + 12 }], FIELD_ROUTE_COLORS.p4),
      polyRoute(pos(allyHorse), [{ x: getOffsetX(lineX, 10), y: allyHorse.y }], FIELD_ROUTE_COLORS.horse),
      polyRoute(pos(lilTunnelPete), [{ x: getOffsetX(lineX, 10), y: lilTunnelPete.y }], FIELD_ROUTE_COLORS.pete),
    ];
  }
  return [];
}

function getPlayFieldRoutePreviews(playKey) {
  if (!playKey || !game.playModeLineX) return [];

  let routes;
  switch (playKey) {
    case "sweepRight":
      routes = [getSweepRbArcRoute(false), ...getSweepLeadBlockRoutePreviews()];
      break;
    case "sweepLeft":
      routes = [getSweepRbArcRoute(true), ...getSweepLeadBlockRoutePreviews()];
      break;
    case "passRight":
    case "passLeft":
      routes = [...getTripsFormationTriangleGuide(playKey), ...getTripsPassRoutes(playKey)];
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
    case "hayBaleHook":
      routes = getHayBaleHookRoutes();
      break;
    case "siloSlant":
      routes = getSiloSlantRoutes();
      break;
    case "pasturePop":
      routes = getPasturePopRoutes();
      break;
    case "fencePost": {
      const tripsKey = typeof getTripsPassPlayKey === "function" ? getTripsPassPlayKey("fencePost") : "passRight";
      routes = [...getTripsFormationTriangleGuide(tripsKey), ...getTripsPassRoutes(tripsKey)];
      break;
    }
    case "mudHoleDive":
      routes = [getMudHoleDiveRbRoute()];
      break;
    case "diveRight":
      routes = [getDiveRightRbRoute()];
      break;
    case "diveLeft":
      routes = [getDiveLeftRbRoute()];
      break;
    case "straightUp":
      routes = [getEasyStraightUpRoute()];
      break;
    case "qbKeep":
      routes = [getEasyQbKeepRoute()];
      break;
    case "quickOut":
      routes = getEasyPassFieldRoutePreviews("quickOut");
      break;
    case "flatPass":
      routes = getEasyPassFieldRoutePreviews("flatPass");
      break;
    case "goRoute":
      routes = getEasyPassFieldRoutePreviews("goRoute");
      break;
    case "checkDown":
      routes = getEasyPassFieldRoutePreviews("checkDown");
      break;
    default:
      routes = [];
  }

  return omitQbRoutePreviews(routes);
}

/** QB dropback / read lines clutter skill-player routes during cadence. */
function omitQbRoutePreviews(routes) {
  return routes.filter(
    (r) => r.color !== FIELD_ROUTE_COLORS.qb && r.color !== FIELD_ROUTE_COLORS.read
  );
}

/** End points of key offensive routes — used for defensive man-coverage previews. */
function getOffenseRouteTargets(playKey) {
  const lineX = game.playModeLineX;
  if (!lineX) return {};

  switch (playKey) {
    case "passRight":
    case "passLeft": {
      const post = getTripsSevenPostGeometry(playKey);
      const inRoute = getTripsInRouteGeometry(playKey);
      const curl = getTripsSlotCurlGeometry(playKey);
      return {
        qb: { x: getPassDropbackTarget(lineX), y: player1.y },
        horse: { x: post.postX, y: post.postY },
        pete: { x: curl.curlEnd.x, y: curl.curlEnd.y },
        p4: { x: inRoute.breakEnd.x, y: inRoute.breakEnd.y },
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
    case "scrambledEggs": {
      const corner = getScrambledEggsPeteCornerGeometry();
      const comeback = getScrambledEggsHorseComebackGeometry();
      const p4 = getScrambledEggsP4CornerGoGeometry();
      return {
        qb: { x: getPassDropbackTarget(lineX), y: player1.y },
        horse: { x: comeback.cornerEnd.x, y: comeback.cornerEnd.y },
        pete: { x: corner.cornerEnd.x, y: corner.cornerEnd.y },
        p4: { x: p4.goEnd.x, y: p4.goEnd.y },
      };
    }
    case "cornfieldCross": {
      const dir = getOffenseDirection();
      const slotCurl = getCornfieldCrossSlotCurlGeometry();
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
        p4: { x: slotCurl.curlEnd.x, y: slotCurl.curlEnd.y },
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
    case "hayBaleHook": {
      const horseHook = getHayBaleHookHorseGeometry();
      const peteHook = getHayBaleHookPeteGeometry();
      return {
        qb: { x: getPassDropbackTarget(lineX), y: player1.y },
        horse: { x: horseHook.curlEnd.x, y: horseHook.curlEnd.y },
        pete: { x: peteHook.curlEnd.x, y: peteHook.curlEnd.y },
        p4: {
          x: clampPlayableX(getOffsetX(lineX, 16), 20),
          y: FIELD.y + FIELD.height * 0.5,
        },
      };
    }
    case "siloSlant": {
      const horse = getSiloSlantHorseGeometry();
      const pete = getSiloSlantPeteGeometry();
      return {
        qb: { x: getPassDropbackTarget(lineX), y: player1.y },
        horse: { x: horse.cornerEnd.x, y: horse.cornerEnd.y },
        pete: { x: pete.cornerEnd.x, y: pete.cornerEnd.y },
        p4: {
          x: clampPlayableX(getOffsetX(lineX, 14), 20),
          y: FIELD.y + FIELD.height * 0.5,
        },
      };
    }
    case "pasturePop": {
      const hitch = getPasturePopPeteGeometry();
      const goX = clampPlayableX(getOffsetX(lineX, PASTURE_POP_GO_DEPTH_YD), 10);
      return {
        qb: { x: getPassDropbackTarget(lineX), y: player1.y },
        horse: { x: goX, y: allyHorse.y },
        pete: { x: hitch.curlEnd.x, y: hitch.curlEnd.y },
        p4: {
          x: clampPlayableX(getOffsetX(lineX, 10), 16),
          y: FIELD.y + FIELD.height * 0.5,
        },
      };
    }
    case "fencePost": {
      const tripsKey = typeof getTripsPassPlayKey === "function" ? getTripsPassPlayKey("fencePost") : "passRight";
      const post = getTripsSevenPostGeometry(tripsKey);
      const curl = getTripsSlotCurlGeometry(tripsKey);
      const inRoute = getTripsInRouteGeometry(tripsKey);
      return {
        qb: { x: getPassDropbackTarget(lineX), y: player1.y },
        horse: { x: post.postX, y: post.postY },
        pete: { x: curl.curlEnd.x, y: curl.curlEnd.y },
        p4: { x: inRoute.breakEnd.x, y: inRoute.breakEnd.y },
      };
    }
    case "quickOut":
      return {
        qb: { x: getEasyPassDropbackTarget(lineX), y: player1.y },
        horse: (() => {
          const { outX, outY } = getEasyOutBreakPoint(allyHorse, 10);
          return { x: outX, y: outY };
        })(),
        pete: { x: clampPlayableX(getOffsetX(lineX, 8), 16), y: lilTunnelPete.y },
        p4: { x: clampPlayableX(getOffsetX(lineX, 3), 20), y: FIELD.y + FIELD.height * 0.5 },
      };
    case "flatPass":
      return {
        qb: { x: getEasyPassDropbackTarget(lineX), y: player1.y },
        horse: { x: clampPlayableX(getOffsetX(lineX, 14), 8), y: allyHorse.y },
        pete: { x: clampPlayableX(getOffsetX(lineX, 5), 10), y: lilTunnelPete.y },
        p4: { x: clampPlayableX(getOffsetX(lineX, 2), 20), y: FIELD.y + FIELD.height * 0.5 },
      };
    case "goRoute":
      return {
        qb: { x: getEasyPassDropbackTarget(lineX), y: player1.y },
        horse: { x: clampPlayableX(getOffsetX(lineX, 16), 6), y: allyHorse.y },
        pete: { x: clampPlayableX(getOffsetX(lineX, 8), 14), y: lilTunnelPete.y },
        p4: { x: clampPlayableX(getOffsetX(lineX, 4), 18), y: FIELD.y + FIELD.height * 0.5 },
      };
    case "checkDown":
      return {
        qb: { x: getEasyPassDropbackTarget(lineX), y: player1.y },
        horse: { x: clampPlayableX(getOffsetX(lineX, 10), 10), y: allyHorse.y },
        pete: { x: clampPlayableX(getOffsetX(lineX, 10), 10), y: lilTunnelPete.y },
        p4: {
          x: clampPlayableX(getOffsetX(lineX, 4), 16),
          y: FIELD.y + FIELD.height * 0.5 + 12,
        },
      };
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
  const spy = getPassQbSpy();
  const coverHorse = getDefenderById(game.passDefCoverHorseId);
  const coverPete = getDefenderById(game.passDefCoverPeteId);
  const targets = getOffenseRouteTargets(playKey);
  const zoneCoverage = game.selectedDefense === "B";
  const routes = [
    defCoverageLine(rusher, targets.qb || pos(player1), "Rush QB"),
  ];

  if (spy && spy !== rusher) {
    routes.push(defCoverageLine(spy, targets.qb || pos(player1), "Spy QB", { dashed: true }));
  }

  if (targets.horse) {
    routes.push(defCoverageLine(coverHorse, targets.horse, zoneCoverage ? "Zone — top" : "Man — WR"));
  }
  if (targets.pete) {
    routes.push(defCoverageLine(coverPete, targets.pete, zoneCoverage ? "Zone — flat" : "Man — WR"));
  }

  if (targets.p4) {
    routes.push(
      defCoverageLine(defenseP4, targets.p4, zoneCoverage ? "Zone — mid" : "Man — slot", { dashed: true })
    );
  } else {
    routes.push(
      defCoverageLine(
        defenseP4,
        getDeepShellZonePoint(false),
        zoneCoverage ? "Zone — deep" : "Man — deep",
        { dashed: true }
      )
    );
  }
  routes.push(
    defCoverageLine(
      defenseP5,
      getDeepShellZonePoint(true),
      zoneCoverage ? "Zone — deep" : "Man — deep",
      { dashed: true }
    )
  );

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

function getDefenseEasyRunCoveragePreviews(playKey) {
  const lineX = game.playModeLineX;
  const midY = FIELD.y + FIELD.height / 2;
  const rusherX = getOffsetX(lineX, 7);
  const carrierTarget =
    playKey === "qbKeep"
      ? { x: getOffsetX(lineX, 8), y: midY }
      : { x: getOffsetX(lineX, -4), y: midY };

  return [
    defCoverageLine(player2, { x: rusherX, y: midY }, "Blitz"),
    defCoverageLine(allyDonkey, carrierTarget, "Fill"),
    defCoverageLine(cluckNorris, carrierTarget, "Fill", { dashed: true }),
    defCoverageLine(defenseP4, carrierTarget, "Pursue", { dashed: true }),
    defCoverageLine(defenseP5, carrierTarget, "Pursue", { dashed: true }),
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
  if (playKey === "mudHoleDive") {
    const lineX = game.playModeLineX;
    const rusherX = getOffsetX(lineX, 7);
    const runLaneY = FIELD.y + FIELD.height * 0.55;
    const motionX = getOffsetX(lineX, -8.5);
    return [
      defCoverageLine(player2, { x: rusherX, y: runLaneY }, "Blitz"),
      defCoverageLine(defenseP4, pos(offenseP5), "CB — WR"),
      defCoverageLine(defenseP5, pos(allyHorse), "Fit — FB"),
      defCoverageLine(allyDonkey, { x: motionX, y: runLaneY }, "Fill", { dashed: true }),
      defCoverageLine(cluckNorris, { x: motionX, y: runLaneY }, "Fill", { dashed: true }),
    ];
  }
  if (playKey === "straightUp" || playKey === "qbKeep") {
    return getDefenseEasyRunCoveragePreviews(playKey);
  }
  return getDefensePassCoveragePreviews(playKey);
}

// ── Play-select diagrams (field-yard routes → auto-fit layout) ───────────

const DIAGRAM_ROUTE_COLORS = {
  qb: "#93c5fd",
  horse: "#f97316",
  pete: "#c8a97e",
  p4: "#a78bfa",
  p5: "#86efac",
};

function diagramFieldX(lineX, yards) {
  return lineX + yards * YARDS_TO_PIXELS;
}

function diagramLaneY(frac) {
  return FIELD.y + FIELD.height * frac;
}

function fieldSpotXY(spots, id) {
  const s = spots.find((sp) => sp.id === id);
  return s ? { x: s.x, y: s.y } : { x: 0, y: FIELD.y + FIELD.height / 2 };
}

function fieldPoly(points, color, corner = 8) {
  return { kind: "polyline", points, color, corner };
}

function fieldBlock(start, kick, contact, color) {
  return { kind: "polyline", points: [start, kick, contact], color, corner: 3, block: true };
}

function fieldBezier(from, cp, to, color) {
  return { kind: "bezier", from, cp, to, color };
}

/**
 * Sweep lead blocks: each WR stems straight in their lane, then blocks straight (no cross).
 * Matches stem to 14 yd at split lanes, then hold lane Y on the kick.
 */
function diagramSweepLeadBlocks(lineX, spots) {
  const horseF = fieldSpotXY(spots, "allyHorse");
  const p5F = fieldSpotXY(spots, "offenseP5");
  const halfGap = 5 * YARDS_TO_PIXELS;
  const stemX = diagramFieldX(lineX, 14);
  const blockX = diagramFieldX(lineX, 8);
  const horseStem = { x: stemX - halfGap, y: horseF.y };
  const p5Stem = { x: stemX + halfGap, y: p5F.y };
  return [
    fieldBlock(
      horseF,
      horseStem,
      { x: blockX - halfGap, y: horseF.y },
      DIAGRAM_ROUTE_COLORS.horse
    ),
    fieldBlock(
      p5F,
      p5Stem,
      { x: blockX + halfGap, y: p5F.y },
      DIAGRAM_ROUTE_COLORS.p5
    ),
  ];
}

/** Stretch: WR on CB; FB blocks on same angle as the RB stretch path. */
function diagramStretchBlocks(lineX, spots) {
  const p5F = fieldSpotXY(spots, "offenseP5");
  const fbF = fieldSpotXY(spots, "allyHorse");
  const p4F = fieldSpotXY(spots, "offenseP4");
  const runMotionX = diagramFieldX(lineX, -8.5);
  const runLaneY = diagramLaneY(0.72);
  const runDx = runMotionX - p4F.x;
  const runDy = runLaneY - p4F.y;
  return [
    fieldBlock(
      p5F,
      { x: diagramFieldX(lineX, 5), y: p5F.y },
      { x: diagramFieldX(lineX, 20), y: p5F.y },
      DIAGRAM_ROUTE_COLORS.p5
    ),
    fieldBlock(
      fbF,
      { x: fbF.x + runDx * 0.32, y: fbF.y + runDy * 0.32 },
      { x: fbF.x + runDx * 0.78, y: fbF.y + runDy * 0.78 },
      DIAGRAM_ROUTE_COLORS.horse
    ),
  ];
}

function collectDiagramFieldBounds(spots, fieldRoutes, refLineX) {
  const xs = [refLineX];
  const ys = [];
  for (const s of spots) {
    xs.push(s.x);
    ys.push(s.y);
  }
  for (const r of fieldRoutes) {
    if (r.kind === "polyline") {
      for (const p of r.points) {
        xs.push(p.x);
        ys.push(p.y);
      }
    } else if (r.kind === "bezier") {
      xs.push(r.from.x, r.cp.x, r.to.x);
      ys.push(r.from.y, r.cp.y, r.to.y);
    }
  }
  const margin = 2.5 * YARDS_TO_PIXELS;
  return {
    minX: Math.min(...xs) - margin,
    maxX: Math.max(...xs) + margin,
    minY: Math.min(...ys) - margin,
    maxY: Math.max(...ys) + margin,
  };
}

/** Keep key routes readable on small play buttons — don't zoom out for one deep route. */
function collectDiagramScaleBounds(playKey, spots, fieldRoutes, refLineX) {
  const full = collectDiagramFieldBounds(spots, fieldRoutes, refLineX);

  if (playKey === "scrambledEggs") {
    const wrSpots = spots.filter((s) =>
      s.id === "allyHorse" || s.id === "lilTunnelPete" || s.id === "offenseP4"
    );
    const wrBounds = collectDiagramFieldBounds(wrSpots, [], refLineX);
    const pad = 3 * YARDS_TO_PIXELS;
    return {
      minX: full.minX,
      maxX: full.maxX,
      minY: wrBounds.minY - pad,
      maxY: wrBounds.maxY + pad,
    };
  }

  const isTripsPass = playKey === "passRight" || playKey === "passLeft";
  if (!isTripsPass) return full;

  const wrSpots = spots.filter((s) =>
    s.id === "allyHorse" || s.id === "lilTunnelPete" || s.id === "offenseP4"
  );
  const wrBounds = collectDiagramFieldBounds(wrSpots, [], refLineX);
  const dir = typeof getOffenseDirection === "function" ? getOffenseDirection() : 1;
  const stemPx = 14 * YARDS_TO_PIXELS;
  const backPx = TRIPS_TRIANGLE_YARDS * YARDS_TO_PIXELS;
  const pad = 3 * YARDS_TO_PIXELS;
  const minW = (TRIPS_TRIANGLE_YARDS + 4) * YARDS_TO_PIXELS;
  const minH = ((TRIPS_TRIANGLE_YARDS * Math.sqrt(3)) / 2 + 4) * YARDS_TO_PIXELS;

  let minX = Math.min(wrBounds.minX, full.minX) - pad;
  let maxX = Math.max(wrBounds.maxX, full.maxX) + pad;
  let minY = Math.min(wrBounds.minY, full.minY) - pad;
  let maxY = Math.max(wrBounds.maxY, full.maxY) + pad;

  if (dir > 0) {
    maxX = Math.min(maxX, refLineX + stemPx + pad);
    minX = Math.min(minX, refLineX - backPx - pad);
  } else {
    minX = Math.max(minX, refLineX - stemPx - pad);
    maxX = Math.max(maxX, refLineX + backPx + pad);
  }

  if (maxX - minX < minW) {
    const mid = (minX + maxX) / 2;
    minX = mid - minW / 2;
    maxX = mid + minW / 2;
  }
  if (maxY - minY < minH) {
    const mid = (minY + maxY) / 2;
    minY = mid - minH / 2;
    maxY = mid + minH / 2;
  }

  return { minX, maxX, minY, maxY };
}

function getTripsFormationTriangleGuide(playKey) {
  const lineX = game.playModeLineX;
  if (!lineX || typeof buildFormationSpots !== "function") return [];

  const strength = getTripsStrengthForPlay(playKey);
  const spots = buildFormationSpots(lineX, "shotgunTrips", { strength });
  const horse = spots.find((s) => s.id === "allyHorse");
  const pete = spots.find((s) => s.id === "lilTunnelPete");
  const p4 = spots.find((s) => s.id === "offenseP4");
  if (!horse || !pete || !p4) return [];

  return [
    {
      kind: "polyline",
      points: [
        { x: horse.x, y: horse.y },
        { x: pete.x, y: pete.y },
        { x: p4.x, y: p4.y },
        { x: horse.x, y: horse.y },
      ],
      color: "rgba(255,255,255,0.32)",
      dashed: true,
      noArrow: true,
      corner: 3,
    },
  ];
}

/** Field-space routes — same yard math as live play / cadence previews. */
function buildPlayDiagramFieldRoutes(playKey, lineX, spots) {
  const routes = [];
  const H = DIAGRAM_ROUTE_COLORS.horse;
  const P = DIAGRAM_ROUTE_COLORS.pete;
  const X = DIAGRAM_ROUTE_COLORS.p4;
  const spot = (id) => fieldSpotXY(spots, id);

  if (playKey === "sweepRight" || playKey === "sweepLeft") {
    const isLeft = playKey === "sweepLeft";
    routes.push(...diagramSweepLeadBlocks(lineX, spots));
    const r = 10 * YARDS_TO_PIXELS;
    const cx = diagramFieldX(lineX, -10);
    const cy = FIELD.y + FIELD.height / 2 + (isLeft ? -2 : 2) * YARDS_TO_PIXELS;
    const startAngle = Math.PI;
    const endAngle = isLeft ? Math.PI + Math.PI / 2 : Math.PI / 2;
    const arcPts = sampleArc(cx, cy, r, startAngle, endAngle, 12);
    routes.push(fieldPoly([spot("offenseP4"), ...arcPts.slice(1)], H, 5));
    return routes;
  }

  if (playKey === "passRight" || playKey === "passLeft") {
    const toTop = playKey === "passLeft";
    const horseF = spot("allyHorse");
    const peteF = spot("lilTunnelPete");
    const p4F = spot("offenseP4");
    const cornerY = toTop ? FIELD.y + 22 : FIELD.y + FIELD.height - 22;
    routes.push({
      kind: "polyline",
      points: [horseF, peteF, p4F, horseF],
      color: "rgba(255,255,255,0.28)",
      dashed: true,
      noArrow: true,
      corner: 3,
    });
    routes.push(
      fieldPoly(
        [
          horseF,
          { x: diagramFieldX(lineX, 9), y: horseF.y },
          { x: diagramFieldX(lineX, 22), y: cornerY },
          { x: diagramFieldX(lineX, 42), y: diagramLaneY(toTop ? 0.58 : 0.42) },
        ],
        H
      )
    );
    const slotMidY = diagramLaneY(0.5);
    const slotComeback = (slotMidY - peteF.y) * 0.55;
    routes.push(
      fieldPoly(
        [
          peteF,
          { x: diagramFieldX(lineX, 12), y: peteF.y },
          { x: diagramFieldX(lineX, 12), y: peteF.y + slotComeback * 0.35 },
          { x: diagramFieldX(lineX, 7), y: peteF.y + slotComeback },
        ],
        P,
        4
      )
    );
    routes.push(
      fieldPoly(
        [
          p4F,
          { x: diagramFieldX(lineX, 10), y: p4F.y },
          { x: diagramFieldX(lineX, 10), y: diagramLaneY(0.5) },
        ],
        X,
        4
      )
    );
    return routes;
  }

  if (playKey === "barnPlay") {
    const horseF = spot("allyHorse");
    const peteF = spot("lilTunnelPete");
    routes.push(
      fieldPoly(
        [
          horseF,
          { x: diagramFieldX(lineX, 22), y: horseF.y },
          { x: diagramFieldX(lineX, 38), y: diagramLaneY(0.42) },
        ],
        H
      )
    );
    routes.push(
      fieldPoly(
        [
          peteF,
          { x: diagramFieldX(lineX, 12), y: peteF.y },
          { x: diagramFieldX(lineX, 12), y: diagramLaneY(0.28) },
        ],
        P
      )
    );
    routes.push(
      fieldPoly(
        [spot("offenseP4"), { x: diagramFieldX(lineX, 16), y: diagramLaneY(0.5) }],
        X
      )
    );
    return routes;
  }

  if (playKey === "scrambledEggs") {
    const horseF = spot("allyHorse");
    const peteF = spot("lilTunnelPete");
    const p4F = spot("offenseP4");
    routes.push(
      fieldPoly(
        [
          peteF,
          { x: diagramFieldX(lineX, SCRAMBLED_EGGS_CORNER_STEM_YD), y: peteF.y },
          {
            x: diagramFieldX(
              lineX,
              SCRAMBLED_EGGS_CORNER_STEM_YD + SCRAMBLED_EGGS_CORNER_BREAK_YD
            ),
            y: peteF.y + SCRAMBLED_EGGS_CORNER_BREAK_YD * YARDS_TO_PIXELS,
          },
        ],
        P,
        4
      )
    );
    routes.push(
      fieldPoly(
        [
          horseF,
          { x: diagramFieldX(lineX, SCRAMBLED_EGGS_OUTSIDE_STEM_YD), y: horseF.y },
          {
            x: diagramFieldX(
              lineX,
              SCRAMBLED_EGGS_OUTSIDE_STEM_YD - SCRAMBLED_EGGS_OUTSIDE_COMEBACK_YD
            ),
            y: horseF.y + SCRAMBLED_EGGS_OUTSIDE_SLANT_IN_YD * YARDS_TO_PIXELS,
          },
        ],
        H,
        4
      )
    );
    const { stemEnd, cornerEnd, goEnd } = getScrambledEggsP4CornerGoTargets(
      lineX,
      p4F.y,
      horseF.y,
      24
    );
    routes.push(fieldPoly([p4F, stemEnd, cornerEnd, goEnd], X, 4));
    return routes;
  }

  if (playKey === "barnDoorBoot") {
    const horseF = spot("allyHorse");
    const peteF = spot("lilTunnelPete");
    const qbF = spot("player1");
    routes.push(fieldPoly([horseF, { x: getOffsetX(lineX, -2.8), y: diagramLaneY(0.68) }], H, 4));
    routes.push(
      fieldPoly(
        [peteF, { x: getOffsetX(lineX, 14), y: FIELD.y + 52 }, { x: getOffsetX(lineX, 24), y: FIELD.y + 52 }],
        P,
        4
      )
    );
    const waypoints = getBarnDoorBootQbWaypoints(lineX);
    routes.push(fieldPoly([qbF, ...waypoints], DIAGRAM_ROUTE_COLORS.qb, 4));
    return routes;
  }

  if (playKey === "siloSlant") {
    const horseF = spot("allyHorse");
    const peteF = spot("lilTunnelPete");
    const p4F = spot("offenseP4");
    const horse = getSiloSlantHorseGeometry();
    const pete = getSiloSlantPeteGeometry();
    routes.push(fieldPoly([horseF, horse.stemEnd, horse.cornerEnd], H, 4));
    routes.push(fieldPoly([peteF, pete.stemEnd, pete.cornerEnd], P, 4));
    routes.push(
      fieldPoly(
        [p4F, { x: diagramFieldX(lineX, 14), y: diagramLaneY(0.5) }],
        X
      )
    );
    return routes;
  }

  if (playKey === "pasturePop") {
    const horseF = spot("allyHorse");
    const peteF = spot("lilTunnelPete");
    const p4F = spot("offenseP4");
    const hitch = getPasturePopPeteGeometry();
    routes.push(
      fieldPoly(
        [peteF, hitch.stemEnd, hitch.plant, hitch.curlEnd],
        P,
        4
      )
    );
    routes.push(
      fieldPoly(
        [horseF, { x: diagramFieldX(lineX, PASTURE_POP_GO_DEPTH_YD), y: horseF.y }],
        H,
        4
      )
    );
    routes.push(
      fieldPoly(
        [p4F, { x: diagramFieldX(lineX, 10), y: diagramLaneY(0.5) }],
        X
      )
    );
    return routes;
  }

  if (playKey === "fencePost") {
    const tripsKey = typeof getTripsPassPlayKey === "function" ? getTripsPassPlayKey("fencePost") : "passRight";
    return buildPlayDiagramFieldRoutes(tripsKey, lineX, spots);
  }

  if (playKey === "mudHoleDive") {
    routes.push(...diagramStretchBlocks(lineX, spots));
    routes.push(
      fieldPoly(
        [
          spot("offenseP4"),
          { x: diagramFieldX(lineX, -8.5), y: diagramLaneY(0.55) },
        ],
        X,
        4
      )
    );
    return routes;
  }

  if (playKey === "hayBaleHook") {
    const horseF = spot("allyHorse");
    const peteF = spot("lilTunnelPete");
    const p4F = spot("offenseP4");
    const horseHook = getHayBaleHookHorseGeometry();
    const peteHook = getHayBaleHookPeteGeometry();
    routes.push(
      fieldPoly(
        [horseF, horseHook.stemEnd, horseHook.plant, horseHook.curlEnd],
        H,
        4
      )
    );
    routes.push(
      fieldPoly(
        [peteF, peteHook.stemEnd, peteHook.plant, peteHook.curlEnd],
        P,
        4
      )
    );
    routes.push(
      fieldPoly(
        [p4F, { x: diagramFieldX(lineX, 16), y: diagramLaneY(0.5) }],
        X
      )
    );
    return routes;
  }

  if (playKey === "cornfieldCross") {
    const horseF = spot("allyHorse");
    const peteF = spot("lilTunnelPete");
    const p4F = spot("offenseP4");
    const crossMidX = diagramFieldX(lineX, 14);
    const exitX = diagramFieldX(lineX, 31);
    routes.push(
      fieldBezier(
        horseF,
        { x: crossMidX, y: horseF.y + 18 },
        { x: exitX, y: diagramLaneY(0.74) },
        H
      )
    );
    routes.push(
      fieldBezier(
        peteF,
        { x: crossMidX, y: peteF.y - 18 },
        { x: exitX, y: diagramLaneY(0.28) },
        P
      )
    );
    const slotMidY = diagramLaneY(0.5);
    const slotHook = (slotMidY - p4F.y) * 0.55;
    routes.push(
      fieldPoly(
        [
          p4F,
          { x: diagramFieldX(lineX, 12), y: p4F.y },
          { x: diagramFieldX(lineX, 12), y: p4F.y + slotHook * 0.35 },
          { x: diagramFieldX(lineX, 7), y: p4F.y + slotHook },
        ],
        X,
        4
      )
    );
    return routes;
  }

  if (playKey === "diveRight") {
    routes.push(...diagramStretchBlocks(lineX, spots));
    routes.push(
      fieldPoly(
        [
          spot("offenseP4"),
          { x: diagramFieldX(lineX, -8.5), y: diagramLaneY(0.72) },
        ],
        X,
        4
      )
    );
    return routes;
  }

  if (playKey === "diveLeft") {
    const peteF = spot("lilTunnelPete");
    const r = 5 * YARDS_TO_PIXELS;
    const cx = diagramFieldX(lineX, -5);
    const cy = FIELD.y + FIELD.height / 2;
    const arcPts = sampleArc(cx, cy, r, Math.PI, Math.PI + Math.PI / 2, 10);
    routes.push(
      fieldBlock(
        peteF,
        { x: diagramFieldX(lineX, 5), y: peteF.y },
        { x: diagramFieldX(lineX, 12), y: peteF.y - 12 },
        P
      )
    );
    routes.push(fieldPoly([spot("allyHorse"), ...arcPts.slice(1)], H, 4));
    return routes;
  }

  if (playKey === "straightUp") {
    routes.push(
      fieldPoly(
        [
          spot("offenseP4"),
          { x: diagramFieldX(lineX, -4), y: diagramLaneY(0.5) },
        ],
        X,
        4
      )
    );
    return routes;
  }

  if (playKey === "qbKeep") {
    routes.push(
      fieldPoly(
        [
          spot("player1"),
          { x: diagramFieldX(lineX, 8), y: diagramLaneY(0.5) },
        ],
        DIAGRAM_ROUTE_COLORS.p4,
        4
      )
    );
    return routes;
  }

  if (playKey === "quickOut") {
    const horseF = spot("allyHorse");
    const midY = diagramLaneY(0.5);
    const outY = horseF.y <= midY ? diagramLaneY(0.22) : diagramLaneY(0.78);
    routes.push(
      fieldPoly(
        [
          horseF,
          { x: diagramFieldX(lineX, 6), y: horseF.y },
          { x: diagramFieldX(lineX, 10), y: outY },
        ],
        H,
        4
      )
    );
    routes.push(
      fieldPoly(
        [
          spot("lilTunnelPete"),
          { x: diagramFieldX(lineX, 8), y: spot("lilTunnelPete").y },
        ],
        P
      )
    );
    routes.push(
      fieldPoly(
        [spot("offenseP4"), { x: diagramFieldX(lineX, 3), y: midY }],
        X
      )
    );
    return routes;
  }

  if (playKey === "flatPass") {
    const peteF = spot("lilTunnelPete");
    routes.push(
      fieldPoly(
        [peteF, { x: diagramFieldX(lineX, 5), y: peteF.y }],
        P
      )
    );
    routes.push(
      fieldPoly(
        [spot("allyHorse"), { x: diagramFieldX(lineX, 14), y: spot("allyHorse").y }],
        H
      )
    );
    routes.push(
      fieldPoly(
        [spot("offenseP4"), { x: diagramFieldX(lineX, 2), y: diagramLaneY(0.5) }],
        X
      )
    );
    return routes;
  }

  if (playKey === "goRoute") {
    const horseF = spot("allyHorse");
    routes.push(
      fieldPoly(
        [horseF, { x: diagramFieldX(lineX, 16), y: horseF.y }],
        H
      )
    );
    routes.push(
      fieldPoly(
        [spot("lilTunnelPete"), { x: diagramFieldX(lineX, 8), y: spot("lilTunnelPete").y }],
        P
      )
    );
    routes.push(
      fieldPoly(
        [spot("offenseP4"), { x: diagramFieldX(lineX, 4), y: diagramLaneY(0.5) }],
        X
      )
    );
    return routes;
  }

  if (playKey === "checkDown") {
    const p4F = spot("offenseP4");
    routes.push(
      fieldPoly(
        [
          p4F,
          { x: diagramFieldX(lineX, 4), y: diagramLaneY(0.5) + 12 },
        ],
        X,
        4
      )
    );
    routes.push(
      fieldPoly(
        [spot("allyHorse"), { x: diagramFieldX(lineX, 10), y: spot("allyHorse").y }],
        H
      )
    );
    routes.push(
      fieldPoly(
        [spot("lilTunnelPete"), { x: diagramFieldX(lineX, 10), y: spot("lilTunnelPete").y }],
        P
      )
    );
    return routes;
  }

  return routes;
}

function projectFieldRoutesToDiagram(fieldRoutes, toDiag) {
  return fieldRoutes.map((r) => {
    if (r.kind === "bezier") {
      return {
        kind: "bezier",
        from: toDiag(r.from.x, r.from.y),
        cp: toDiag(r.cp.x, r.cp.y),
        to: toDiag(r.to.x, r.to.y),
        color: r.color,
      };
    }
    return {
      kind: "polyline",
      points: r.points.map((p) => toDiag(p.x, p.y)),
      color: r.color,
      corner: r.corner,
      block: !!r.block,
      dashed: !!r.dashed,
      noArrow: !!r.noArrow,
    };
  });
}

function createPlayDiagramLayout(playKey, dLeft, dTop, diagW, diagH) {
  const pad = Math.max(5, Math.min(diagW, diagH) * 0.08);
  const formationId = getFormationForPlay(playKey);
  const strength = getTripsStrengthForPlay(playKey);
  const refLineX = FIELD.x + FIELD.endZoneWidth + 50 * YARDS_TO_PIXELS;
  const spots = buildFormationSpots(refLineX, formationId, { strength });
  const fieldRoutes = buildPlayDiagramFieldRoutes(playKey, refLineX, spots);
  const bounds = collectDiagramScaleBounds(playKey, spots, fieldRoutes, refLineX);

  const drawW = diagW - pad * 2;
  const drawH = diagH - pad * 2;
  const fieldW = Math.max(bounds.maxX - bounds.minX, 8 * YARDS_TO_PIXELS);
  const fieldH = Math.max(bounds.maxY - bounds.minY, 8 * YARDS_TO_PIXELS);
  const scale = Math.min(drawW / fieldW, drawH / fieldH) * 0.92;

  const losX = dLeft + pad + drawW * 0.34;
  const centerY = dTop + pad + drawH / 2;
  const fieldCenterY = (bounds.minY + bounds.maxY) / 2;

  function toDiag(x, y) {
    return {
      x: losX + (x - refLineX) * scale,
      y: centerY + (y - fieldCenterY) * scale,
    };
  }

  const diagramRoutes = projectFieldRoutesToDiagram(fieldRoutes, toDiag);
  const refSize = Math.min(diagW, diagH);
  const tripsPass = playKey === "passRight" || playKey === "passLeft";
  const wrIds = new Set(["allyHorse", "lilTunnelPete", "offenseP4"]);
  const diagramSpots = spots.map((s) => {
    const d = toDiag(s.x, s.y);
    const style = FORMATION_DIAGRAM_DOT[s.id] || { color: "#ffffff", r: 3 };
    const wrDot = tripsPass && wrIds.has(s.id);
    return {
      id: s.id,
      diagX: d.x,
      diagY: d.y,
      style: {
        color: style.color,
        r: wrDot ? Math.max(2, refSize * 0.02) : Math.max(style.r, refSize * 0.032),
      },
    };
  });

  return { losX, diagramRoutes, diagramSpots };
}

/** @deprecated Use createPlayDiagramLayout */
function createPlayDiagramMapper(playKey, losX, dLeft, dTop, diagW, diagH) {
  return createPlayDiagramLayout(playKey, dLeft, dTop, diagW, diagH);
}

function getPlayDiagramRoutes(playKey, layout) {
  return layout.diagramRoutes || [];
}
