// =========================================================
// Utility
// =========================================================
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.hypot(dx, dy);
}

function circleTouch(a, b) {
  return distance(a.x, a.y, b.x, b.y) <= a.radius + b.radius;
}

function circleTouchVisibleBall(entity, ballRef, extraRadius = 0) {
  const visualBall = getBallVisualState(ballRef);
  return distance(entity.x, entity.y, visualBall.x, visualBall.y) <= entity.radius + ballRef.radius + extraRadius;
}

// Tackle requires the defender to overlap at least half the carrier's body
// (defender center must be within one carrier-radius of the carrier's center)
function circleTackle(carrier, defender) {
  if (carrier && carrier.jukeIFrameMs > 0) return false;
  const reach =
    getCarrierTackleRadius(carrier) + getDefenderTackleReachBonus(defender);
  return distance(carrier.x, carrier.y, defender.x, defender.y) <= reach;
}

const JUKE_DURATION_MS = 220;
const JUKE_IFRAME_MS = 200;
const JUKE_COOLDOWN_MS = 850;

function resetCarrierJukeState(entity) {
  if (!entity) return;
  entity.jukeActiveMs = 0;
  entity.jukeCooldownMs = 0;
  entity.jukeIFrameMs = 0;
  entity.jukeDirX = 0;
  entity.jukeDirY = 0;
  entity.jukeRemainingDist = 0;
}

function resetAllCarrierJukeState() {
  resetCarrierJukeState(player1);
  resetCarrierJukeState(allyHorse);
  resetCarrierJukeState(lilTunnelPete);
  resetCarrierJukeState(offenseP4);
  resetCarrierJukeState(offenseP5);
}

function getUserOffenseBallCarrier() {
  if (game.cpuOffense || game.state !== "playing") return null;
  const carrier = ball.carrier;
  if (!carrier || ball.inFlight) return null;
  if (game.mode === "passing") {
    return carrier === player1 ? player1 : null;
  }
  if (game.mode !== "play") return null;
  if (
    game.playModePhase === "snap" &&
    (game.playModeCurrentPlay === "sweepRight" || game.playModeCurrentPlay === "sweepLeft")
  ) {
    return null;
  }
  const offenseEntities = [player1, allyHorse, lilTunnelPete, offenseP4, offenseP5];
  return offenseEntities.includes(carrier) ? carrier : null;
}

function canShowJukeButton() {
  return game.touchControlsEnabled && game.state === "playing" && !!getUserOffenseBallCarrier();
}

function getJukeMoveInput() {
  let mx = 0;
  let my = 0;
  if (keys["w"]) my -= 1;
  if (keys["s"]) my += 1;
  if (keys["a"]) mx -= 1;
  if (keys["d"]) mx += 1;
  mx += game.touchMoveX;
  my += game.touchMoveY;
  return { mx, my };
}

function tryStartCarrierJuke(carrier) {
  if (!carrier || (carrier.jukeCooldownMs || 0) > 0 || (carrier.jukeActiveMs || 0) > 0) {
    return false;
  }
  if (getUserOffenseBallCarrier() !== carrier) return false;

  const { mx, my } = getJukeMoveInput();
  let jx;
  let jy;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    game.jukeLateralSign = -(game.jukeLateralSign || 1);
    jx = (-my / len) * game.jukeLateralSign;
    jy = (mx / len) * game.jukeLateralSign;
  } else {
    game.jukeLateralSign = -(game.jukeLateralSign || 1);
    jx = 0;
    jy = game.jukeLateralSign;
  }

  const elu = carrier.elusiveness != null ? carrier.elusiveness : 1;
  const dist = carrier.radius * (1.85 + Math.max(0, elu - 1) * 0.75);

  carrier.jukeDirX = jx;
  carrier.jukeDirY = jy;
  carrier.jukeRemainingDist = dist;
  carrier.jukeActiveMs = JUKE_DURATION_MS;
  carrier.jukeIFrameMs = JUKE_IFRAME_MS;
  carrier.jukeCooldownMs = JUKE_COOLDOWN_MS;
  return true;
}

function updateCarrierJuke(carrier, dt) {
  if (!carrier) return;
  if (carrier.jukeCooldownMs > 0) {
    carrier.jukeCooldownMs = Math.max(0, carrier.jukeCooldownMs - dt * 1000);
  }
  if (carrier.jukeIFrameMs > 0) {
    carrier.jukeIFrameMs = Math.max(0, carrier.jukeIFrameMs - dt * 1000);
  }
  if ((carrier.jukeActiveMs || 0) <= 0) return;

  carrier.jukeActiveMs = Math.max(0, carrier.jukeActiveMs - dt * 1000);
  const step = carrier.speed * 2.1 * dt;
  const move = Math.min(step, carrier.jukeRemainingDist || 0);
  carrier.x += carrier.jukeDirX * move;
  carrier.y += carrier.jukeDirY * move;
  carrier.jukeRemainingDist = Math.max(0, (carrier.jukeRemainingDist || 0) - move);
  clampPlayerToField(carrier);
  updateBallPosition();
}

function circleTouchSteal(a, b) {
  const maxDistance = (a.radius + b.radius) * CONFIG.stealDistanceMultiplier;
  return distance(a.x, a.y, b.x, b.y) <= maxDistance;
}

function moveToward(entity, targetX, targetY, speed, dt) {
  const dx = targetX - entity.x;
  const dy = targetY - entity.y;
  const len = Math.hypot(dx, dy);

  if (len === 0) return;

  const nx = dx / len;
  const ny = dy / len;

  entity.x += nx * speed * dt;
  entity.y += ny * speed * dt;
}

function clampPlayerToField(player) {
  player.x = clamp(player.x, FIELD.x + player.radius, FIELD.x + FIELD.width - player.radius);
  player.y = clamp(player.y, FIELD.y + player.radius, FIELD.y + FIELD.height - player.radius);
}

function setBallFreeAtMidfield() {
  ball.carrier = null;
  ball.inFlight = false;
  ball.arcHeight = 0;
  ball.x = getFieldGoalPostsMidlineX();
  ball.y = FIELD.y + FIELD.height / 2;
}

function getFieldMidY() {
  return FIELD.y + FIELD.height / 2;
}

function updateBallPosition() {
  if (ball.inFlight) return;
  ball.arcHeight = 0;
  if (ball.carrier) {
    ball.x = ball.carrier.x;
    ball.y = ball.carrier.y - ball.carrier.radius - 8;
  }
}

// =========================================================
// Reset / Restart Logic
// =========================================================
function setMobileAimForwardFromQB() {
  if (!game.touchControlsEnabled) return;
  game.mouseX = clamp(player1.x + 140, FIELD.x + ball.radius, FIELD.x + FIELD.width - ball.radius);
  game.mouseY = clamp(player1.y, FIELD.y + ball.radius, FIELD.y + FIELD.height - ball.radius);
}

function resetPositions() {
  player1.x = FIELD.x + 170;
  player1.y = FIELD.y + FIELD.height / 2;

  player2.x = FIELD.x + FIELD.width - 170;
  player2.y = FIELD.y + FIELD.height / 2;

  allyHorse.x = player1.x - 60;
  allyHorse.y = player1.y - 40;

  allyDonkey.x = player2.x + 60;
  allyDonkey.y = player2.y + 40;

  cluckNorris.x = player2.x + 40;
  cluckNorris.y = player2.y - 40;

  lilTunnelPete.x = player1.x - 40;
  lilTunnelPete.y = player1.y + 40;

  offenseP4.x = player1.x - 80;
  offenseP4.y = player1.y + 24;
  offenseP5.x = player1.x - 80;
  offenseP5.y = player1.y - 24;

  defenseP4.x = player2.x + 70;
  defenseP4.y = player2.y - 30;
  defenseP5.x = player2.x + 70;
  defenseP5.y = player2.y + 30;

  setBallFreeAtMidfield();
  ball.inFlight = false;
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  setMobileAimForwardFromQB();
}

function restartGame() {
  applyDefaultFieldRoles();
  stopGameMusic();
  startGameMusic();
  player1.score = 0;
  player2.score = 0;
  game.state = "playing";
  game.winner = null;
  game.scorePauseTimer = 0;
  game.scoredBy = null;
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  ball.inFlight = false;
  resetPositions();
}

// =========================================================
// Play Mode Helpers
// =========================================================
// 1 yard = 1/100 of playable field (~13.5 px/yard — wider field with sideline camera in play)
const YARDS_TO_PIXELS = (FIELD.width - FIELD.endZoneWidth * 2) / 100;

function fieldExceedsViewport() {
  return FIELD.x + FIELD.width > canvas.width;
}

function isFieldCameraFollowState(state) {
  return [
    "playing",
    "prePlayCadence",
    "playModeDowned",
    "playModePlaySelect",
    "puntAim",
    "kickoffAim",
    "kickoffPlay",
    "kickoffFlagPopup",
    "postTouchdownChoice",
    "patKick",
    "touchdownPopup",
    "safetyPopup",
    "interceptionPopup",
    "driveSummary",
    "sessionPossessionRecap",
    "instantReplay",
    "halftimePopup"
  ].includes(state);
}

function shouldUseFieldCameraFollow() {
  return game.mode === "play" && isFieldCameraFollowState(game.state);
}

function getFieldCameraScrollX() {
  if (!fieldExceedsViewport()) return 0;
  const maxScroll = Math.max(0, FIELD.x + FIELD.width - canvas.width);
  if (!shouldUseFieldCameraFollow()) {
    return clamp((FIELD.x + FIELD.width - canvas.width) / 2, 0, maxScroll);
  }
  let focus = player1.x;
  if (game.playModeLineX != null) focus = game.playModeLineX;
  else if (ball.inFlight || ball.carrier) focus = ball.x;
  return clamp(focus - canvas.width * 0.42, 0, maxScroll);
}

function screenXToFieldX(screenX) {
  return screenX + getFieldCameraScrollX();
}

function pointerToFieldCoords(p) {
  if (!fieldExceedsViewport() || !shouldUseFieldCameraFollow()) return p;
  return { x: screenXToFieldX(p.x), y: p.y };
}
const FIRST_DOWN_YARDS = 30;

/** Sweep: both WRs on the bottom sideline, split vertically while on the LOS. */
const SWEEP_WR_PAIR_GAP_YARDS = 10;
/** Sweep: WR vertical split on the same LOS depth (yards). */
const SWEEP_WR_VERTICAL_GAP_YARDS = 4;
/** Extra CB / safety trail cushion inside the WR (yards). */
const SWEEP_DB_TRAIL_INSIDE_YARDS = 4.8;
/** Only player2 rushes; shallow align (yards). */
const SWEEP_DEF_SINGLE_RUSHER_DEPTH_YARDS = 5;
/** Donkey LB sits this many yards behind the sweep rusher. */
const SWEEP_LB_FROM_RUSHER_YARDS = 10;
/** Pig rusher holds before closing (ms); all sweep shells use this. */
const SWEEP_RUSHER_REACTION_MS = 1000;
/** WRs hold lead blocks for this long after the sweep catch (ms). */
const SWEEP_WR_BLOCK_HOLD_MS = 1300;
/** Base blocker hold time used across run plays (ms). */
const PLAY_BLOCK_HOLD_MS = 1300;
/** Pitch travels slower than a normal pass so the arc reads as a toss. */
const SWEEP_TOSS_SPEED_MULT = 0.58;

function getSweepPitchTarget(fromX, fromY, rb, qbDir, isRightSweep) {
  const tossCatchY = rb.y - rb.radius - 8;
  if (isRightSweep) {
    let timeOfFlight = Math.hypot(rb.x - fromX, tossCatchY - fromY) / CONFIG.passSpeed;
    let leadX = qbDir * rb.speed * timeOfFlight;
    let tx = rb.x + leadX;
    let leadDist = Math.hypot(tx - fromX, tossCatchY - fromY);
    timeOfFlight = leadDist / CONFIG.passSpeed;
    leadX = qbDir * rb.speed * timeOfFlight;
    tx = rb.x + leadX;
    return { tx, ty: tossCatchY };
  }
  const tx = rb.x;
  let timeOfFlight = Math.hypot(tx - fromX, tossCatchY - fromY) / CONFIG.passSpeed;
  let leadY = -rb.speed * timeOfFlight;
  let ty = tossCatchY + leadY;
  let leadDist = Math.hypot(tx - fromX, ty - fromY);
  timeOfFlight = leadDist / CONFIG.passSpeed;
  leadY = -rb.speed * timeOfFlight;
  ty = tossCatchY + leadY;
  return { tx, ty };
}

function beginPlayModeSweepToss(fromX, fromY, targetX, targetY) {
  game.playModePhase = "toss";
  ball.carrier = null;
  ball.inFlight = true;
  ball.x = fromX;
  ball.y = fromY;
  ball.targetX = targetX;
  ball.targetY = targetY;
  ball.arcHeight = 0;
  game.sweepTossTravelDist = Math.max(Math.hypot(targetX - fromX, targetY - fromY), 22);
  const lateral = Math.abs(targetX - fromX) + Math.abs(targetY - fromY) * 0.5;
  game.sweepTossArcPeak = clamp(50 + lateral * 0.28, 58, 128);
}

/** @returns {boolean} true when the RB has secured the pitch. */
function advancePlayModeSweepToss(dt) {
  const dx = ball.targetX - ball.x;
  const dy = ball.targetY - ball.y;
  const dist = Math.hypot(dx, dy);
  const move = CONFIG.passSpeed * SWEEP_TOSS_SPEED_MULT * dt;
  if (dist <= move || dist < 8) {
    ball.x = ball.targetX;
    ball.y = ball.targetY;
    ball.inFlight = false;
    ball.arcHeight = 0;
    ball.carrier = offenseP4;
    game.playModePhase = "sweep";
    game.playModeSweepWrBlockMs = SWEEP_WR_BLOCK_HOLD_MS;
    markRunAttemptStarted();
    updateBallPosition();
    return true;
  }
  ball.x += (dx / dist) * move;
  ball.y += (dy / dist) * move;
  const rem = Math.hypot(ball.targetX - ball.x, ball.targetY - ball.y);
  const t = game.sweepTossTravelDist > 1 ? clamp(1 - rem / game.sweepTossTravelDist, 0, 1) : 1;
  ball.arcHeight = 4 * game.sweepTossArcPeak * t * (1 - t);
  return false;
}

function getDefenseTeamMembers() {
  return [player2, allyDonkey, cluckNorris, defenseP4, defenseP5];
}

function allFieldPlayers() {
  return [player1, player2, allyHorse, allyDonkey, cluckNorris, lilTunnelPete, offenseP4, offenseP5, defenseP4, defenseP5];
}

function circleTackleByAnyDefender(carrier) {
  for (const d of getDefenseTeamMembers()) {
    if (circleTackle(carrier, d)) return true;
  }
  return false;
}

function anyDefenderWithinYardsOfEntity(entity, yards) {
  const lim = yards * YARDS_TO_PIXELS;
  return getDefenseTeamMembers().some((d) => Math.hypot(d.x - entity.x, d.y - entity.y) <= lim);
}

/** Depths for man (A) and zone (B) shells: shallow vs deep rows. */
const DEF_SHELL_SHALLOW_YARDS = 7;
const DEF_SHELL_DEEP_YARDS = 20;
const DEF_SHELL_PASS_SHALLOW_YARDS = 5;
const DEF_SHELL_PASS_DEEP_YARDS = 12;
const DEF_SHELL_MIN_ROW_SEP_YARDS = 8;
const PASS_PLAYS_THIRD_RECEIVER = new Set([
  "passRight",
  "passLeft",
  "barnPlay",
  "hayBaleHook",
  "cornfieldCross",
  "scrambledEggs",
  "siloSlant",
  "pasturePop",
  "fencePost"
]);
const PASS_COVER_CUSHION_YARDS = 2.2;
const PASS_COVER_DELAY_TRAIL_SPEED = 0.78;
const PASS_COVER_ROUTE_MATCH = 0.96;
const PASS_COVER_BREAK_ANGLE_RAD = 0.4;
const PASS_COVER_BREAK_MIN_SPEED = 26;
const PASS_COVER_CATCHUP_SEP_YARDS = 4.5;
const PASS_COVER_MAX_CATCHUP_MULT = 1.06;
const PASS_COVER_REACT_STEM_MULT = 0.78;
const PASS_COVER_BREAK_LAG_BLEND = 0.55;
const QB_SPY_CUSHION_YARDS = 3;
const QB_SPY_SCRAMBLE_SPEED_MULT = 1.06;
const QB_SCRAMBLE_TOWARD_LOS_YARDS = 2;
const QB_SCRAMBLE_NEAR_LOS_YARDS = 3.5;
const QB_SCRAMBLE_LATERAL_YARDS = 4.5;

function passPlayHasThirdReceiver(playKey) {
  return PASS_PLAYS_THIRD_RECEIVER.has(playKey ?? game.playModeCurrentPlay);
}

function getDefenseShellDepths(playKey) {
  const key = playKey ?? game.playModeCurrentPlay;
  if (PASS_PLAY_KEYS.has(key)) {
    return { shallow: DEF_SHELL_PASS_SHALLOW_YARDS, deep: DEF_SHELL_PASS_DEEP_YARDS };
  }
  return { shallow: DEF_SHELL_SHALLOW_YARDS, deep: DEF_SHELL_DEEP_YARDS };
}

function getPassCoverageSpeed(defender, receiver) {
  const cov = defender.coverage ?? 75;
  const spd = defender.speed ?? CONFIG.playerSpeed;
  const statBoost = spd * (0.94 + (cov - 70) / 260);
  const routeSpd = receiver ? getScriptedPassRouteSpeed(receiver) : statBoost;
  const diffMult = typeof getDifficultyPreset === "function" ? getDifficultyPreset().cpuDefenseSpeed : 1;
  return Math.max(statBoost, routeSpd * PASS_COVER_ROUTE_MATCH) * diffMult;
}

function resetPassCoverTrack(entity) {
  if (!entity) return;
  delete entity._coverLastX;
  delete entity._coverLastY;
  delete entity._coverLastDx;
  delete entity._coverLastDy;
  delete entity._coverBreakAtRouteMs;
  delete entity._coverBreakLagX;
  delete entity._coverBreakLagY;
}

function resetAllPassCoverTracks() {
  resetPassCoverTrack(allyHorse);
  resetPassCoverTrack(lilTunnelPete);
  resetPassCoverTrack(offenseP4);
}

function getCoverageSeparationYards(defender, receiver) {
  return distance(defender.x, defender.y, receiver.x, receiver.y) / YARDS_TO_PIXELS;
}

function getDefenderBreakReactMs(defender) {
  const awr = defender.awareness ?? 75;
  const spd = defender.speed ?? CONFIG.playerSpeed;
  const base = 300 - (awr - 70) * 2.4 - (spd / Math.max(1, CONFIG.playerSpeed) - 1) * 45;
  return scaleCpuDefenseReactionMs(clamp(base, 160, 320));
}

function isDefenderInBreakReact(defender, receiver) {
  if (receiver._coverBreakAtRouteMs == null || receiver._coverBreakAtRouteMs < 0) return false;
  const breakAge = (game.passPlayRouteMs || 0) - receiver._coverBreakAtRouteMs;
  return breakAge >= 0 && breakAge < getDefenderBreakReactMs(defender);
}

function tickReceiverRouteBreakState(receiver, dt) {
  if (!receiver) return;
  const dtSafe = Math.max(dt, 0.001);
  if (receiver._coverLastX == null) {
    receiver._coverLastX = receiver.x;
    receiver._coverLastY = receiver.y;
    return;
  }

  const dx = receiver.x - receiver._coverLastX;
  const dy = receiver.y - receiver._coverLastY;
  const moveSpeed = Math.hypot(dx, dy) / dtSafe;
  const routeMs = game.passPlayRouteMs || 0;
  const onCooldown =
    receiver._coverBreakAtRouteMs >= 0 &&
    routeMs - receiver._coverBreakAtRouteMs < 520;

  if (
    receiver._coverLastDx != null &&
    moveSpeed >= PASS_COVER_BREAK_MIN_SPEED &&
    !onCooldown
  ) {
    const lastAng = Math.atan2(receiver._coverLastDy, receiver._coverLastDx);
    const newAng = Math.atan2(dy, dx);
    let delta = Math.abs(newAng - lastAng);
    if (delta > Math.PI) delta = 2 * Math.PI - delta;
    if (delta >= PASS_COVER_BREAK_ANGLE_RAD) {
      receiver._coverBreakAtRouteMs = routeMs;
      receiver._coverBreakLagX = receiver._coverLastX;
      receiver._coverBreakLagY = receiver._coverLastY;
    }
  }

  receiver._coverLastDx = dx;
  receiver._coverLastDy = dy;
  receiver._coverLastX = receiver.x;
  receiver._coverLastY = receiver.y;
}

function getManCoverageTarget(receiver, cushionYards = PASS_COVER_CUSHION_YARDS, defender = null) {
  const dir = -getOffenseDirection();
  let anchorX = receiver.x;
  let anchorY = receiver.y;
  let cushion = cushionYards;

  if (defender && isDefenderInBreakReact(defender, receiver) && receiver._coverBreakLagX != null) {
    const blend = PASS_COVER_BREAK_LAG_BLEND;
    anchorX = receiver._coverBreakLagX + (receiver.x - receiver._coverBreakLagX) * blend;
    anchorY = receiver._coverBreakLagY + (receiver.y - receiver._coverBreakLagY) * blend;
    cushion = Math.min(cushion, 2.4);
  } else if (defender) {
    const sepYards = getCoverageSeparationYards(defender, receiver);
    if (sepYards > PASS_COVER_CATCHUP_SEP_YARDS) {
      cushion = clamp(cushion * 0.72, 1.35, cushion);
    } else {
      const yardsPastLos =
        game.playModeLineX != null
          ? Math.abs(receiver.x - game.playModeLineX) / YARDS_TO_PIXELS
          : 0;
      cushion = clamp(cushion - yardsPastLos * 0.12, 1.1, cushion);
    }
  } else {
    const yardsPastLos =
      game.playModeLineX != null
        ? Math.abs(receiver.x - game.playModeLineX) / YARDS_TO_PIXELS
        : 0;
    cushion = clamp(cushion - yardsPastLos * 0.12, 1.1, cushion);
  }

  const cushionPx = cushion * YARDS_TO_PIXELS;
  const insideBias = 0.25 * YARDS_TO_PIXELS;
  const midY = FIELD.y + FIELD.height * 0.5;
  const insideY = anchorY <= midY ? anchorY + insideBias : anchorY - insideBias;
  return {
    x: clamp(
      anchorX + dir * cushionPx,
      FIELD.x + receiver.radius,
      FIELD.x + FIELD.width - receiver.radius
    ),
    y: clamp(
      insideY,
      FIELD.y + receiver.radius,
      FIELD.y + FIELD.height - receiver.radius
    )
  };
}

function getManCoveragePursuitMult(defender, receiver, opts = {}) {
  const baseMult = opts.speedMult ?? 1;
  if (isDefenderInBreakReact(defender, receiver)) {
    return baseMult * PASS_COVER_REACT_STEM_MULT;
  }
  const sepYards = getCoverageSeparationYards(defender, receiver);
  if (sepYards > PASS_COVER_CATCHUP_SEP_YARDS) {
    const burst = Math.min(
      PASS_COVER_MAX_CATCHUP_MULT,
      1 + (sepYards - PASS_COVER_CATCHUP_SEP_YARDS) * 0.02
    );
    return baseMult * burst;
  }
  return baseMult * 0.98;
}

function moveManCoverageDefender(defender, receiver, dt, opts = {}) {
  if (!defender || !receiver) return;
  const cushionYards = opts.cushionYards ?? PASS_COVER_CUSHION_YARDS;
  const tgt = getManCoverageTarget(receiver, cushionYards, defender);
  const pursuitMult = getManCoveragePursuitMult(defender, receiver, opts);
  moveDefensePlayer(
    defender,
    tgt.x,
    tgt.y,
    getPassCoverageSpeed(defender, receiver) * pursuitMult,
    dt
  );
}

function getPassCoverageReceivers() {
  const receivers = [allyHorse, lilTunnelPete];
  if (passPlayHasThirdReceiver()) receivers.push(offenseP4);
  return receivers;
}

function getAllPassDefenders() {
  return [player2, allyDonkey, cluckNorris, defenseP4, defenseP5];
}

function receiverToCoverKey(receiver) {
  if (receiver === allyHorse) return "horse";
  if (receiver === lilTunnelPete) return "pete";
  if (receiver === offenseP4) return "p4";
  return null;
}

function* combinationsOfSize(items, size) {
  if (size <= 0) {
    yield [];
    return;
  }
  if (items.length < size) return;
  for (let i = 0; i <= items.length - size; i += 1) {
    for (const rest of combinationsOfSize(items.slice(i + 1), size - 1)) {
      yield [items[i], ...rest];
    }
  }
}

function* permutationsOf(items) {
  if (items.length <= 1) {
    yield items.slice();
    return;
  }
  for (let i = 0; i < items.length; i += 1) {
    const head = items[i];
    const tail = items.slice(0, i).concat(items.slice(i + 1));
    for (const perm of permutationsOf(tail)) {
      yield [head, ...perm];
    }
  }
}

function optimalManAssign(defenders, receivers) {
  const k = receivers.length;
  if (!k || !defenders.length) return {};
  let bestCost = Infinity;
  let bestMap = {};
  for (const combo of combinationsOfSize(defenders, Math.min(k, defenders.length))) {
    for (const perm of permutationsOf(combo)) {
      let cost = 0;
      const map = {};
      for (let i = 0; i < receivers.length; i += 1) {
        const receiver = receivers[i];
        const defender = perm[i % perm.length];
        const key = receiverToCoverKey(receiver);
        if (!key) continue;
        cost += distance(defender.x, defender.y, receiver.x, receiver.y);
        map[key] = defender;
      }
      if (cost < bestCost) {
        bestCost = cost;
        bestMap = map;
      }
    }
  }
  return bestMap;
}

function pickCpuPassRusher(defenders) {
  let rusher = player2;
  let bestScore = Infinity;
  for (const defender of defenders) {
    const toQb = distance(defender.x, defender.y, player1.x, player1.y);
    const bonus = defender === player2 ? -1.8 * YARDS_TO_PIXELS : 0;
    const score = toQb + bonus;
    if (score < bestScore) {
      bestScore = score;
      rusher = defender;
    }
  }
  return rusher;
}

function pickPassQbSpy(defenders, rusher, coverMap = {}) {
  const covered = new Set(Object.values(coverMap).filter(Boolean));
  const priority = [allyDonkey, defenseP5, defenseP4, cluckNorris, player2];
  for (const defender of priority) {
    if (!defender || defender === rusher || !defenders.includes(defender)) continue;
    if (!covered.has(defender)) return defender;
  }
  if (allyDonkey && allyDonkey !== rusher) return allyDonkey;
  if (defenseP5 && defenseP5 !== rusher) return defenseP5;
  return defenders.find((d) => d !== rusher) || allyDonkey;
}

function getPassQbSpy() {
  return game.passDefSpyId ? getDefenderById(game.passDefSpyId) : null;
}

function getQbYardsToLineOfScrimmage() {
  const lineX = game.playModeLineX;
  const dir = getOffenseDirection();
  return dir > 0
    ? (lineX - player1.x) / YARDS_TO_PIXELS
    : (player1.x - lineX) / YARDS_TO_PIXELS;
}

function getQbYardsTowardLosFromDropback() {
  const dropbackX = game.passPlayDropbackTarget;
  const dir = getOffenseDirection();
  return dir > 0
    ? (player1.x - dropbackX) / YARDS_TO_PIXELS
    : (dropbackX - player1.x) / YARDS_TO_PIXELS;
}

function isQbScrambling() {
  if (!ball.carrier || ball.carrier !== player1 || ball.inFlight) return false;
  if (!game.passPlayDropbackDone) return false;
  if (!game.passPlayCanThrow) return true;
  if (getQbYardsToLineOfScrimmage() <= QB_SCRAMBLE_NEAR_LOS_YARDS) return true;
  if (getQbYardsTowardLosFromDropback() >= QB_SCRAMBLE_TOWARD_LOS_YARDS) return true;
  const pocketY = game.qbPocketY != null ? game.qbPocketY : offenseP5.y;
  const lateralYards = Math.abs(player1.y - pocketY) / YARDS_TO_PIXELS;
  return lateralYards >= QB_SCRAMBLE_LATERAL_YARDS && getQbYardsTowardLosFromDropback() >= 1;
}

function noteQbPocketAnchor() {
  if (game.qbPocketY == null) {
    game.qbPocketY = player1.y;
  }
}

function finishPassPlayDropback() {
  game.passPlayDropbackDone = true;
  noteQbPocketAnchor();
}

function getQbSpyShadowTarget(qb, cushionYards = QB_SPY_CUSHION_YARDS) {
  const dir = getOffenseDirection();
  return {
    x: clamp(
      qb.x - dir * cushionYards * YARDS_TO_PIXELS,
      FIELD.x + qb.radius,
      FIELD.x + FIELD.width - qb.radius
    ),
    y: qb.y
  };
}

function moveQbSpyDefender(spy, qb, dt, pursuing = false) {
  if (!spy || !qb || isDefenseControlledPlayer(spy)) return;
  if (pursuing) {
    moveDefensePlayer(spy, qb.x, qb.y, spy.speed * QB_SPY_SCRAMBLE_SPEED_MULT, dt);
    return;
  }
  const shadow = getQbSpyShadowTarget(qb);
  moveDefensePlayer(spy, shadow.x, shadow.y, spy.speed * 0.9, dt);
}

function applyPassCoverageAssignments(map) {
  game.passDefCoverHorseId = map.horse ? getFullDefenderId(map.horse) : null;
  game.passDefCoverPeteId = map.pete ? getFullDefenderId(map.pete) : null;
  game.passDefCoverP4Id = map.p4 ? getFullDefenderId(map.p4) : null;
}

function assignCpuPassCoverageRoles() {
  const defenders = getAllPassDefenders();
  const receivers = getPassCoverageReceivers();
  const rusher = pickCpuPassRusher(defenders);
  game.passDefRushing = getFullDefenderId(rusher);
  const coverPool = defenders.filter((d) => d !== rusher);
  const coverMap = optimalManAssign(coverPool, receivers);
  const spy = pickPassQbSpy(defenders, rusher, coverMap);
  game.passDefSpyId = getFullDefenderId(spy);
  const manPool = coverPool.filter((d) => d !== spy);
  applyPassCoverageAssignments(optimalManAssign(manPool, receivers));
}

function assignUserPassCoverageRoles() {
  const defenders = getAllPassDefenders();
  const receivers = getPassCoverageReceivers();
  const rusher = getSelectedPassRusher();
  game.passDefRushing = getFullDefenderId(rusher);
  const coverPool = defenders.filter((d) => d !== rusher);
  const coverMap = optimalManAssign(coverPool, receivers);
  const spy = pickPassQbSpy(defenders, rusher, coverMap);
  game.passDefSpyId = getFullDefenderId(spy);
  const manPool = coverPool.filter((d) => d !== spy);
  applyPassCoverageAssignments(optimalManAssign(manPool, receivers));
}

function getAssignedPassCoveragePairs() {
  const pairs = [];
  if (game.passDefCoverHorseId) {
    pairs.push({ id: game.passDefCoverHorseId, receiver: allyHorse, cushionYards: 2.2 });
  }
  if (game.passDefCoverPeteId) {
    pairs.push({ id: game.passDefCoverPeteId, receiver: lilTunnelPete, cushionYards: 2.2 });
  }
  if (passPlayHasThirdReceiver() && game.passDefCoverP4Id) {
    pairs.push({ id: game.passDefCoverP4Id, receiver: offenseP4, cushionYards: 2.6 });
  }
  return pairs;
}

function moveAssignedPassCoverage(dt, speedMult = 1) {
  for (const { id, receiver, cushionYards } of getAssignedPassCoveragePairs()) {
    const defender = getDefenderById(id);
    if (!defender || isDefenseControlledPlayer(defender)) continue;
    moveManCoverageDefender(defender, receiver, dt, { cushionYards, speedMult });
  }
}

function moveUnassignedPassHelp(dt) {
  const assignedIds = new Set(
    [
      game.passDefRushing,
      game.passDefSpyId,
      game.passDefCoverHorseId,
      game.passDefCoverPeteId,
      game.passDefCoverP4Id
    ].filter(Boolean)
  );
  const receivers = getPassCoverageReceivers();
  for (const defender of getAllPassDefenders()) {
    const id = getFullDefenderId(defender);
    if (assignedIds.has(id) || isDefenseControlledPlayer(defender)) continue;
    let nearest = receivers[0];
    let bestDist = Infinity;
    for (const receiver of receivers) {
      const dist = distance(defender.x, defender.y, receiver.x, receiver.y);
      if (dist < bestDist) {
        bestDist = dist;
        nearest = receiver;
      }
    }
    moveManCoverageDefender(defender, nearest, dt, { cushionYards: 3.2, speedMult: 0.88 });
  }
}

function hasExplicitPassCoverageAssignments() {
  return !!(game.passDefCoverHorseId || game.passDefCoverPeteId);
}

function resolveDefenseShellChoice(_playKey) {
  return game.selectedDefense === "B" ? "B" : "A";
}

function clampDefenseShellRowXs(lineX, shallowX, deepX) {
  const dir = getOffenseDirection();
  const pad = player2.radius;
  const playMin = FIELD.x + FIELD.endZoneWidth + pad;
  const playMax = FIELD.x + FIELD.width - FIELD.endZoneWidth - pad;
  const minSep = DEF_SHELL_MIN_ROW_SEP_YARDS * YARDS_TO_PIXELS;
  let shallow = clamp(shallowX, playMin, playMax);
  let deep = clamp(deepX, playMin, playMax);
  if (Math.abs(deep - shallow) >= minSep) {
    return { shallowX: shallow, deepX: deep };
  }
  if (dir > 0) {
    deep = Math.min(playMax, shallow + minSep);
    shallow = Math.max(playMin, deep - minSep);
  } else {
    deep = Math.max(playMin, shallow - minSep);
    shallow = Math.min(playMax, deep + minSep);
  }
  return { shallowX: shallow, deepX: deep };
}

function configureDefenseShellMeta(shellKey, wrY) {
  game.passDefCovering = null;
  game.passDefRushing = null;
  game.passDefDeepTarget = null;
  game.passDefCoverHorseId = null;
  game.passDefCoverPeteId = null;
  game.passDefCoverP4Id = null;
  game.passDefSpyId = null;
  game.qbPocketY = null;
  game.defenseReactionTimer = 0;
  game.playModeDefense = shellKey;

  const onPassPlay = PASS_PLAY_KEYS.has(game.playModeCurrentPlay);
  if (onPassPlay) {
    game.defenseReactionTimer = 0;
    game.cluckNorrisTimer = scaleCpuCluckDelayMs(60);
  } else if (shellKey === "A") {
    game.defenseReactionTimer = scaleCpuDefenseReactionMs(wrY !== undefined ? 420 : 380);
    game.cluckNorrisTimer = scaleCpuCluckDelayMs(wrY !== undefined ? 360 : 260);
    return;
  } else {
    game.cluckNorrisTimer = scaleCpuCluckDelayMs(wrY !== undefined ? 360 : 260);
  }

  if (shellKey === "A") {
    return;
  }
  if (wrY !== undefined) {
    game.passDefDeepTarget = Math.random() < 0.5 ? "horse" : "pete";
    if (Math.random() < 0.5) {
      game.passDefCovering = "pig";
      game.passDefRushing = "donkey";
    } else {
      game.passDefCovering = "donkey";
      game.passDefRushing = "pig";
    }
  } else if (!game.passDefRushing) {
    game.passDefCovering = "donkey";
    game.passDefRushing = "pig";
  }
}

/** Man shell (A): three shallow, two deep — defenders mirror receivers. */
function positionDefenseRun32(qbX, qbY, playKey) {
  const lineX = game.playModeLineX;
  const fy = FIELD.y;
  const h = FIELD.height;
  const depths = getDefenseShellDepths(playKey);
  const { shallowX, deepX } = clampDefenseShellRowXs(
    lineX,
    getOffsetX(lineX, depths.shallow),
    getOffsetX(lineX, depths.deep)
  );
  player2.x = shallowX;
  player2.y = fy + h * 0.18;
  allyDonkey.x = shallowX;
  allyDonkey.y = fy + h * 0.5;
  defenseP4.x = shallowX;
  defenseP4.y = fy + h * 0.82;
  cluckNorris.x = deepX;
  cluckNorris.y = fy + h * 0.34;
  defenseP5.x = deepX;
  defenseP5.y = fy + h * 0.66;
}

/** Zone shell (B): two shallow rush lanes, three deep zone drops. */
function positionDefensePass23(qbX, qbY, _wrY, playKey) {
  const lineX = game.playModeLineX;
  const fy = FIELD.y;
  const h = FIELD.height;
  const depths = getDefenseShellDepths(playKey);
  const { shallowX, deepX } = clampDefenseShellRowXs(
    lineX,
    getOffsetX(lineX, depths.shallow),
    getOffsetX(lineX, depths.deep)
  );
  player2.x = shallowX;
  player2.y = fy + h * 0.22;
  allyDonkey.x = shallowX;
  allyDonkey.y = fy + h * 0.78;
  cluckNorris.x = deepX;
  cluckNorris.y = fy + h * 0.18;
  defenseP4.x = deepX;
  defenseP4.y = fy + h * 0.5;
  defenseP5.x = deepX;
  defenseP5.y = fy + h * 0.82;
}

function applyDefenseShellForUserOffense(wrY, playKey) {
  const shellKey = resolveDefenseShellChoice(playKey);
  configureDefenseShellMeta(shellKey, wrY);
  if (shellKey === "A") {
    positionDefenseRun32(player1.x, player1.y, playKey);
  } else {
    positionDefensePass23(player1.x, player1.y, wrY !== undefined ? wrY : player1.y, playKey);
  }
  if (PASS_PLAY_KEYS.has(playKey)) {
    if (game.cpuOffense) {
      assignUserPassCoverageRoles();
    } else {
      assignCpuPassCoverageRoles();
    }
  }
  clampDefendersPastLineOfScrimmage();
}

/** Sweep-only: one rusher (pig); CB + safety mirror WRs; donkey deep; CB2 opposite flat. */
function positionDefenseForSweepPlay() {
  const lineX = game.playModeLineX;
  const fy = FIELD.y;
  const h = FIELD.height;
  const midY = fy + h * 0.5;
  const dir = getOffenseDirection();
  const rushX = getOffsetX(lineX, SWEEP_DEF_SINGLE_RUSHER_DEPTH_YARDS);
  const lbX = getOffsetX(rushX, SWEEP_LB_FROM_RUSHER_YARDS);
  const trailPx = SWEEP_DB_TRAIL_INSIDE_YARDS * YARDS_TO_PIXELS;
  const sweepRight = game.playModeCurrentPlay === "sweepRight";
  const oppositeFlatY = sweepRight ? fy + h * 0.12 : fy + h * 0.88;

  player2.x = rushX;
  player2.y = clamp(lilTunnelPete.y, fy + 28, fy + h - 28);

  allyDonkey.x = lbX;
  allyDonkey.y = clamp(midY, fy + 28, fy + h - 28);

  defenseP4.x = clamp(allyHorse.x - dir * trailPx, FIELD.x + defenseP4.radius, FIELD.x + FIELD.width - defenseP4.radius);
  defenseP4.y = clamp(allyHorse.y, fy + 28, fy + h - 28);

  cluckNorris.x = clamp(offenseP5.x - dir * trailPx, FIELD.x + cluckNorris.radius, FIELD.x + FIELD.width - cluckNorris.radius);
  cluckNorris.y = clamp(offenseP5.y, fy + 28, fy + h - 28);

  defenseP5.x = getOffsetX(lineX, 7);
  defenseP5.y = clamp(oppositeFlatY, fy + 28, fy + h - 28);

  game.passDefCovering = null;
  game.passDefRushing = null;
  game.passDefDeepTarget = null;
  const defenseChoice = game.selectedDefense === "B" ? "B" : "A";
  if (defenseChoice === "A") {
    game.playModeDefense = "A";
    game.defenseReactionTimer = scaleCpuDefenseReactionMs(SWEEP_RUSHER_REACTION_MS);
    game.cluckNorrisTimer = scaleCpuCluckDelayMs(750);
  } else {
    game.playModeDefense = "B";
    game.defenseReactionTimer = scaleCpuDefenseReactionMs(SWEEP_RUSHER_REACTION_MS);
    game.cluckNorrisTimer = scaleCpuCluckDelayMs(750);
  }

  clampDefendersPastLineOfScrimmage();
}

function positionDefenseForPlay(wrY) {
  applyDefenseShellForUserOffense(wrY, game.playModeCurrentPlay);
}

/** Keep defenders clearly on their side of the LOS (not in the neutral zone / offsides). */
function clampDefendersPastLineOfScrimmage() {
  if (game.mode !== "play" || game.playModeLineX == null) return;
  const lineX = game.playModeLineX;
  const dir = getOffenseDirection();
  const margin = 0.65 * YARDS_TO_PIXELS;
  for (const d of getDefenseTeamMembers()) {
    if (dir > 0) {
      const minX = lineX + margin;
      if (d.x < minX) d.x = minX;
    } else {
      const maxX = lineX - margin;
      if (d.x > maxX) d.x = maxX;
    }
    d.x = clampPlayableX(d.x, d.radius);
  }
}

// Returns {covering, rushing} defender references for pass plays
function getPassDefenders() {
  const rushing = game.passDefRushing
    ? getDefenderById(game.passDefRushing)
    : game.cpuOffense
      ? getSelectedPassRusher()
      : player2;
  const covering = game.passDefCoverHorseId
    ? getDefenderById(game.passDefCoverHorseId)
    : allyDonkey;
    return { covering, rushing };
  }

function isPocketPassRusherTackle(rushingDefender) {
  if (circleTackle(player1, rushingDefender)) return true;
  if (!game.cpuOffense && circleTackle(player1, cluckNorris)) return true;
  return false;
}

function resolvePassPlayQbTackle(rushingDefender) {
  if (!game.passPlayCanThrow) {
    return circleTackleByAnyDefender(player1);
  }
  if (isQbScrambling()) {
    return circleTackleByAnyDefender(player1);
  }
  return isPocketPassRusherTackle(rushingDefender);
}

function isPassPlayQbSack(rushingDefender) {
  return game.passPlayCanThrow && !isQbScrambling() && isPocketPassRusherTackle(rushingDefender);
}

function getLeftTenYardLineX() {
  return FIELD.x + FIELD.endZoneWidth + 10 * YARDS_TO_PIXELS;
}

function getLeftTwentyYardLineX() {
  return FIELD.x + FIELD.endZoneWidth + 20 * YARDS_TO_PIXELS;
}

function playSessionUsesCoinToss() {
  return game.playSessionKind === "wholeGame";
}

function playSessionUsesKickoffs() {
  return game.playSessionKind === "wholeGame";
}

function playSessionTracksFullGameScore() {
  return game.playSessionKind === "wholeGame";
}

/** Offense / defense / whole game — real points (6 TD, 3 FG, 1 PAT, 2 safety/2pt). */
function shouldTrackTeamPointScore() {
  return (
    !!game.playUserTeamId &&
    !!game.teamScores &&
    (game.playSessionKind === "offense" ||
      game.playSessionKind === "defense" ||
      game.playSessionKind === "wholeGame")
  );
}

function addTeamScorePoints(teamTag, points) {
  if (!teamTag || !points || !shouldTrackTeamPointScore()) return;
  if (!game.teamScores) resetPlayModeTeamScores();
  if (game.teamScores[teamTag] === undefined) return;
  game.teamScores[teamTag] += points;
}

function applySessionSimDrivePoints(driveResult, scoringCpuOffense) {
  if (!shouldTrackTeamPointScore()) return;
  const teamId = scoringCpuOffense ? game.playCpuTeamId : game.playUserTeamId;
  if (driveResult === "touchdown") addTeamScorePoints(teamId, 6);
  else if (driveResult === "fieldGoal") addTeamScorePoints(teamId, 3);
}

function playSessionUsesGameClock() {
  return (
    game.playSessionKind === "offense" ||
    game.playSessionKind === "defense" ||
    game.playSessionKind === "wholeGame"
  );
}

function playSessionUsesHalftime() {
  return game.playSessionKind === "wholeGame";
}

function isGameClockRunningState(state) {
  return ["playing", "prePlayCadence", "kickoffPlay"].includes(state);
}

function initGameClock() {
  game.clockQuarter = 1;
  game.clockMsRemaining = getQuarterLengthMs();
  game.clockInitialized = true;
  game.clockExpiredPending = false;
  game.halftimeShown = false;
  game.halftimePopupTimer = 0;
  resetGameStats();
}

function resetGameClock() {
  game.clockQuarter = 1;
  game.clockMsRemaining = 0;
  game.clockInitialized = false;
  game.clockExpiredPending = false;
  game.halftimeShown = false;
  game.halftimePopupTimer = 0;
  game.teamStats = null;
}

function flipFieldSidesForHalftime() {
  const mid = getFiftyYardLineX();
  game.userOffenseDirection = game.userOffenseDirection > 0 ? -1 : 1;
  if (game.playModeLineX != null) {
    game.playModeLineX = clampPlayableX(mid + (mid - game.playModeLineX), player1.radius);
    positionForPlayModeAt(game.playModeLineX);
  }
}

function endGameByFinalClock() {
  if (!game.teamScores) return;
  const userPts = game.teamScores[game.playUserTeamId] || 0;
  const cpuPts = game.teamScores[game.playCpuTeamId] || 0;
  if (userPts > cpuPts) {
    game.state = "winPopup";
    game.winPopupTimer = 3500;
    game.winner = player1;
    return;
  }
  if (cpuPts > userPts) {
    game.state = "gameOver";
    game.winner = player2;
    return;
  }
  const otMode = game.gameSettings.overtimeMode || "full";
  if (otMode === "off" || game.clockQuarter >= 5) {
    game.state = "gameOver";
    game.winner = null;
    return;
  }
  game.clockQuarter = 5;
  game.clockMsRemaining =
    otMode === "suddenDeath"
      ? getQuarterLengthMs()
      : Math.round(getQuarterLengthMs() * 0.5);
  game.clockExpiredPending = false;
  game.state = "playModePlaySelect";
}

function isSuddenDeathOvertimeActive() {
  return (
    playSessionUsesGameClock() &&
    game.clockQuarter >= 5 &&
    game.gameSettings.overtimeMode === "suddenDeath"
  );
}

function maybeFinishSuddenDeathOvertime() {
  if (!isSuddenDeathOvertimeActive() || !game.teamScores) return false;
  const userPts = game.teamScores[game.playUserTeamId] || 0;
  const cpuPts = game.teamScores[game.playCpuTeamId] || 0;
  if (userPts === cpuPts) return false;
  game.afterTouchdownAction = null;
  if (userPts > cpuPts) {
    game.state = "winPopup";
    game.winPopupTimer = 3500;
    game.winner = player1;
  } else {
    game.state = "gameOver";
    game.winner = player2;
  }
  return true;
}

function shouldOfferDriveSummaryForReason(reason) {
  if (!shouldShowDriveSummaryOverlay()) return false;
  return [
    "puntResult",
    "turnoverOnDowns",
    "fieldGoalResult",
    "fumbleTurnover",
    "turnover",
    "interceptionReturnStop"
  ].includes(reason);
}

function queueDriveSummary(nextFn) {
  if (!shouldShowDriveSummaryOverlay()) {
    nextFn();
    return;
  }
  game.driveSummaryResume = nextFn;
  game.state = "driveSummary";
}

function completeDriveSummary() {
  const next = game.driveSummaryResume;
  game.driveSummaryResume = null;
  if (typeof next === "function") next();
}

function beginHalftimeBreak() {
  game.state = "halftimePopup";
  game.halftimePopupTimer = 4500;
}

function completeHalftimeBreak() {
  flipFieldSidesForHalftime();
  game.clockQuarter = 3;
  game.clockMsRemaining = getQuarterLengthMs();
  game.clockExpiredPending = false;
  game.halftimePopupTimer = 0;
  game.state = "playModePlaySelect";
}

function advanceQuarterAfterStoppage() {
  if (!game.clockExpiredPending || !playSessionUsesGameClock()) return;
  game.clockExpiredPending = false;

  if (game.clockQuarter === 2 && !game.halftimeShown) {
    game.halftimeShown = true;
    if (playSessionUsesHalftime()) {
      beginHalftimeBreak();
      return;
    }
    game.clockQuarter = 3;
    game.clockMsRemaining = getQuarterLengthMs();
    return;
  }
  if (game.clockQuarter >= 4) {
    endGameByFinalClock();
    return;
  }
  game.clockQuarter += 1;
  game.clockMsRemaining = getQuarterLengthMs();
}

function updateGameClock(dt) {
  if (!playSessionUsesGameClock() || !game.clockInitialized) return;
  if (!isGameClockRunningState(game.state)) return;
  if (game.clockExpiredPending) return;

  game.clockMsRemaining -= dt * 1000;
  if (game.clockMsRemaining > 0) return;

  game.clockMsRemaining = 0;
  game.clockExpiredPending = true;
}

function maybeCheckClockAfterStoppage() {
  if (!game.clockExpiredPending) return;
  if (game.state === "playModePlaySelect" || game.state === "playModeDowned") {
    advanceQuarterAfterStoppage();
  }
}

function updateHalftimePopup(dt) {
  game.halftimePopupTimer -= dt * 1000;
  if (game.halftimePopupTimer <= 0) {
    completeHalftimeBreak();
  }
}

function getPlayOffenseDirection(cpuOffense) {
  const userDir = game.userOffenseDirection === -1 ? -1 : 1;
  return cpuOffense ? -userDir : userDir;
}

function getPlayModeYardLineFromOffenseOwnGoal(yardsFromOwnGoal, cpuOffense) {
  const dir = getPlayOffenseDirection(!!cpuOffense);
  return dir > 0
    ? FIELD.x + FIELD.endZoneWidth + yardsFromOwnGoal * YARDS_TO_PIXELS
    : FIELD.x + FIELD.width - FIELD.endZoneWidth - yardsFromOwnGoal * YARDS_TO_PIXELS;
}

function getPlayModeYardLineFromOpponentGoal(yardsFromOpponentGoal, cpuOffense) {
  const dir = getPlayOffenseDirection(!!cpuOffense);
  const goalX = dir > 0
    ? FIELD.x + FIELD.width - FIELD.endZoneWidth
    : FIELD.x + FIELD.endZoneWidth;
  return goalX - dir * yardsFromOpponentGoal * YARDS_TO_PIXELS;
}

function getPlayModeYardLineFromDefendingGoal(yardsFromDefendingGoal) {
  const userDir = game.userOffenseDirection > 0 ? 1 : -1;
  const defendingGoalX = userDir > 0
    ? FIELD.x + FIELD.endZoneWidth
    : FIELD.x + FIELD.width - FIELD.endZoneWidth;
  return defendingGoalX + userDir * yardsFromDefendingGoal * YARDS_TO_PIXELS;
}

function startSessionDriveAtRedTwenty(cpuOffense) {
  const lineX = getPlayModeYardLineFromOffenseOwnGoal(20, cpuOffense);
  initDriveState(lineX, cpuOffense, "session");
  game.playModeDown = 1;
  game.playModeMaxDowns = 4;
}

function shouldUseSessionPossessionRecap() {
  return game.playSessionKind === "offense" || game.playSessionKind === "defense";
}

const SESSION_SIM_RUN_PLAYS = ["sweepRight", "diveRight", "mudHoleDive"];
const SESSION_SIM_PASS_PLAYS = ["passRight", "barnPlay", "scrambledEggs", "siloSlant", "pasturePop", "fencePost"];

function pickSessionSimPlayKey(isPass) {
  const pool = isPass ? SESSION_SIM_PASS_PLAYS : SESSION_SIM_RUN_PLAYS;
  const base = pool[Math.floor(Math.random() * pool.length)];
  if (!PLAY_DIRECTIONAL_BASE_KEYS.has(base)) return base;
  return Math.random() < 0.5 ? base : base.replace("Right", "Left");
}

function getSessionSimPlayDisplayName(playKey) {
  if (playKey === "punt") return "Punt";
  if (playKey === "fieldGoal") return "Field Goal";
  const staticLabels = {
    sweepRight: "Sweep Right",
    sweepLeft: "Sweep Left",
    passRight: "Pass Right",
    passLeft: "Pass Left",
    diveRight: "Stretch Right",
    diveLeft: "Stretch Left",
    barnPlay: "Barn Play",
    scrambledEggs: "Scrambled Eggs",
    barnDoorBoot: "Barn Door Boot",
    hayBaleHook: "Hay Bale Hook",
    cornfieldCross: "Cornfield Cross",
    siloSlant: "Silo Slant",
    pasturePop: "Pasture Pop",
    fencePost: "Fence Post",
    mudHoleDive: "Mud Hole Dive"
  };
  return staticLabels[playKey] || PLAY_SELECT_LABELS[playKey] || playKey;
}

function formatSessionSimDownLine(down, yardsToGo, yardLine) {
  const ordinals = ["", "1st", "2nd", "3rd", "4th"];
  const ord = ordinals[down] || `${down}th`;
  const side = yardLine <= 50 ? "OWN" : "OPP";
  const line = yardLine <= 50 ? yardLine : 100 - yardLine;
  return `${ord} & ${yardsToGo} at ${side} ${line}`;
}

function formatSessionSimPlayResult(play) {
  const kind = play.isPass ? "PASS" : "RUN";
  const name = getSessionSimPlayDisplayName(play.playKey);
  if (play.resultType === "touchdown") return `${kind} — ${name} · TOUCHDOWN`;
  if (play.resultType === "incomplete") return `${kind} — ${name} · Incomplete`;
  if (play.resultType === "interception") return `${kind} — ${name} · INTERCEPTION`;
  if (play.resultType === "sack") return `${kind} — ${name} · Sack (${play.yards} yds)`;
  if (play.resultType === "punt") return "PUNT";
  if (play.resultType === "fieldGoal") return play.made ? "FIELD GOAL · Good (+3)" : "FIELD GOAL · No good";
  if (play.resultType === "gain") return `${kind} — ${name} · +${play.yards} yd${play.yards === 1 ? "" : "s"}`;
  if (play.resultType === "loss") return `${kind} — ${name} · ${play.yards} yd${play.yards === -1 ? "" : "s"}`;
  return `${kind} — ${name} · No gain`;
}

function getSessionSimDriveResultLabel(result) {
  switch (result) {
    case "touchdown": return "Drive result: Touchdown (+6)";
    case "fieldGoal": return "Drive result: Field goal (+3)";
    case "missedFg": return "Drive result: Missed field goal — turnover";
    case "punt": return "Drive result: Punt";
    case "turnoverOnDowns": return "Drive result: Turnover on downs";
    case "interception": return "Drive result: Interception";
    case "fumble": return "Drive result: Fumble — turnover";
    default: return "Drive result: End of possession";
  }
}

function rollSessionSimPassYards(offMult) {
  const r = Math.random();
  if (r < 0.014 / offMult) return { yards: 0, resultType: "interception" };
  if (r < 0.07) return { yards: -Math.floor(2 + Math.random() * 5), resultType: "sack" };
  if (r < 0.07 + 0.14 / offMult) return { yards: 0, resultType: "incomplete" };
  if (Math.random() < 0.1 * offMult) {
    const yards = Math.round(16 + Math.random() * 26 * offMult);
    return { yards, resultType: "gain" };
  }
  const yards = Math.max(0, Math.round((5 + Math.random() * 19) * offMult));
  return { yards, resultType: yards > 0 ? "gain" : "noGain" };
}

function rollSessionSimRunYards(offMult) {
  if (Math.random() < 0.016) return { yards: 0, resultType: "fumble" };
  if (Math.random() < 0.07 * offMult) {
    return { yards: Math.round(10 + Math.random() * 14 * offMult), resultType: "gain" };
  }
  const yards = Math.round(-1 + Math.random() * 10 * offMult);
  if (yards > 0) return { yards, resultType: "gain" };
  if (yards < 0) return { yards, resultType: "loss" };
  return { yards: 0, resultType: "noGain" };
}

function resolveSessionSimFourthDown(yardLine, yardsToGo, d) {
  const distToGoal = 100 - yardLine;

  if (distToGoal <= 8 || yardsToGo <= 2) return null;
  if (distToGoal <= 20 && yardsToGo <= 5 && Math.random() < 0.72) return null;
  if (yardsToGo <= 4 && distToGoal <= 38 && Math.random() < 0.58) return null;

  const fgBoost = distToGoal <= 30 ? 0.24 : distToGoal <= 42 ? 0.14 : 0.06;
  const fgChance = Math.min(0.9, d.cpuFourthDownFg + fgBoost);
  if (distToGoal >= 15 && distToGoal <= 58 && Math.random() < fgChance) {
    const madeChance = distToGoal <= 30 ? 0.86 : distToGoal <= 42 ? 0.82 : 0.76;
    return { type: "fieldGoal", made: Math.random() < madeChance };
  }

  if (yardsToGo <= 6 && distToGoal <= 48 && Math.random() < 0.42) return null;

  if (distToGoal > 14 || yardsToGo > 3) return { type: "punt" };
  return null;
}

/** Simulates one off-screen possession for offense-only / defense-only session modes. */
function simulateSessionPossessionDrive(simulatingCpuOffense) {
  const d = getDifficultyPreset();
  const offMult = simulatingCpuOffense
    ? d.passCompletionMult * 1.34
    : Math.min(1.12, d.passCompletionMult * 1.06);
  let yardLine = 20;
  let down = 1;
  let yardsToGo = FIRST_DOWN_YARDS;
  const plays = [];
  let driveResult = "punt";

  for (let snap = 0; snap < 14; snap += 1) {
    if (down === 4) {
      const fourthDown = resolveSessionSimFourthDown(yardLine, yardsToGo, d);
      if (fourthDown?.type === "fieldGoal") {
        plays.push({
          down: 4,
          yardsToGo,
          yardLine,
          playKey: "fieldGoal",
          isPass: false,
          yards: 0,
          resultType: "fieldGoal",
          made: fourthDown.made
        });
        driveResult = fourthDown.made ? "fieldGoal" : "missedFg";
        break;
      }
      if (fourthDown?.type === "punt") {
        plays.push({
          down: 4,
          yardsToGo,
          yardLine,
          playKey: "punt",
          isPass: false,
          yards: 0,
          resultType: "punt"
        });
        driveResult = "punt";
        break;
      }
    }

    const isPass = Math.random() < 0.44;
    const playKey = pickSessionSimPlayKey(isPass);
    const outcome = isPass ? rollSessionSimPassYards(offMult) : rollSessionSimRunYards(offMult);
    const play = {
      down,
      yardsToGo,
      yardLine,
      playKey,
      isPass,
      yards: outcome.yards,
      resultType: outcome.resultType
    };

    if (outcome.resultType === "interception") {
      plays.push(play);
      driveResult = "interception";
      break;
    }
    if (outcome.resultType === "fumble") {
      plays.push(play);
      driveResult = "fumble";
      break;
    }

    yardLine += outcome.yards;
    if (yardLine >= 100) {
      play.resultType = "touchdown";
      play.yards = Math.max(outcome.yards, 100 - (yardLine - outcome.yards));
      plays.push(play);
      driveResult = "touchdown";
      break;
    }

    yardsToGo -= outcome.yards;
    if (yardsToGo <= 0) {
      down = 1;
      yardsToGo = Math.min(FIRST_DOWN_YARDS, Math.max(1, 100 - yardLine));
  } else {
      down += 1;
      if (down > 4) {
        plays.push(play);
        driveResult = "turnoverOnDowns";
        break;
      }
    }

    plays.push(play);
  }

  return { plays, driveResult };
}

function estimateDriveElapsedClockMs(plays) {
  if (!plays || !plays.length) return 12000;
  let ms = 6000;
  for (const play of plays) {
    if (play.resultType === "incomplete") ms += 16000;
    else if (play.isPass) ms += 28000;
    else ms += 22000;
  }
  return Math.min(ms, 140000);
}

function applySimulatedPossessionClock(plays) {
  if (!playSessionUsesGameClock() || !game.clockInitialized) return;
  const elapsed = estimateDriveElapsedClockMs(plays);
  game.sessionRecapClockElapsedMs = elapsed;
  game.clockMsRemaining = Math.max(0, game.clockMsRemaining - elapsed);
  if (game.clockMsRemaining <= 0) {
    game.clockMsRemaining = 0;
    game.clockExpiredPending = true;
  }
}

function beginSessionPossessionRecap() {
  const simulatingCpuOffense = game.playSessionKind === "offense";
  const recap = simulateSessionPossessionDrive(simulatingCpuOffense);
  applySessionSimDrivePoints(recap.driveResult, simulatingCpuOffense);
  applySimulatedPossessionClock(recap.plays);
  game.sessionRecapPlays = recap.plays;
  game.sessionRecapDriveResult = recap.driveResult;
  game.sessionRecapTeamLabel = simulatingCpuOffense
    ? (TEAMS[game.playCpuTeamId]?.name || "Opponent")
    : (TEAMS[game.playUserTeamId]?.name || "Your team");
  game.sessionRecapNextCpuOffense = game.playSessionKind === "defense";
  game.state = "sessionPossessionRecap";
}

function completeSessionPossessionRecap() {
  const nextCpuOffense = game.sessionRecapNextCpuOffense;
  game.sessionRecapPlays = null;
  game.sessionRecapDriveResult = null;
  game.sessionRecapTeamLabel = null;
  game.sessionRecapClockElapsedMs = null;

  if (game.clockExpiredPending) {
    advanceQuarterAfterStoppage();
    if (game.state === "winPopup" || game.state === "gameOver" || game.state === "halftimePopup") {
      return;
    }
    if (game.clockExpiredPending) {
      endGameByFinalClock();
      return;
    }
  }

  startSessionDriveAtRedTwenty(nextCpuOffense);
}

function applyPlaySessionStart() {
  if (!game.playUserTeamId || !game.playCpuTeamId || !game.playSessionKind) return;
  game.userOffenseDirection = 1;
  game.turnoverSeriesActive = false;
  game.twoPointAttemptActive = false;
  game.fourthDownGoForIt = false;
  game.fourthDownPickedGoForIt = false;

  switch (game.playSessionKind) {
    case "offense":
      startSessionDriveAtRedTwenty(false);
      break;
    case "defense":
      startSessionDriveAtRedTwenty(true);
      break;
    default:
      break;
  }
}

function beginNextPlaySessionSeries(nextCpuOffense) {
  const proceed = () => {
    if (playSessionUsesKickoffs()) {
      beginKickoffAim(!!nextCpuOffense);
      return;
    }
    if (game.playSessionKind === "offense" || game.playSessionKind === "defense") {
      beginSessionPossessionRecap();
      return;
    }
    beginKickoffAim(!!nextCpuOffense);
  };
  if (playSessionUsesKickoffs() && shouldShowDriveSummaryOverlay()) {
    queueDriveSummary(proceed);
    return;
  }
  proceed();
}

function handlePlaySessionSeriesEnd() {
  if (game.playSessionKind === "offense" || game.playSessionKind === "defense") {
    beginSessionPossessionRecap();
    return true;
  }
  return false;
}

function restartPlaySession() {
  if (!game.playSessionKind || !game.playUserTeamId || !game.playCpuTeamId) {
    startPlayMode();
    return;
  }
  resetCoinTossState();
  resetPlayModeTeamScores();
  player1.score = 0;
  player2.score = 0;
  game.winner = null;
  if (playSessionUsesGameClock()) {
    initGameClock();
  }
  if (playSessionUsesCoinToss()) {
    game.state = "playCoinToss";
    game.coinTossPhase = "pickCall";
    game.coinTossCall = null;
    game.coinTossResult = null;
    game.coinTossWon = null;
    game.coinTossCpuChoice = null;
    game.coinTossCpuDirection = null;
    game.coinTossUserChoiceSide = null;
    game.coinTossFlipTimer = 0;
    return;
  }
  applyPlaySessionStart();
}

function getLeftFortyYardLineX() {
  return FIELD.x + FIELD.endZoneWidth + 40 * YARDS_TO_PIXELS;
}

function getFiftyYardLineX() {
  return FIELD.x + FIELD.endZoneWidth + 50 * YARDS_TO_PIXELS;
}

function getKickoffKickTravelDir(receivingCpuOffense) {
  return -getKickoffOffenseDirection(receivingCpuOffense);
}

const KICKOFF_KICKER_BACK_YARDS = 15;
const KICKOFF_BLOCKER_DISTANCE_YARDS = 10;
const KICKOFF_RESTRAINING_YARDS_FROM_RETURNER = 30;
const KICKOFF_RETURNER_OWN_YARD_LINE = 5;
const KICKOFF_TOUCHBACK_START_YARDS = 35;
/** Minimum legal landing — returner own 5 + 30 yd restraining line. */
const KICKOFF_LEGAL_MIN_YARDS_FROM_OWN =
  KICKOFF_RETURNER_OWN_YARD_LINE + KICKOFF_RESTRAINING_YARDS_FROM_RETURNER;
const KICKOFF_RETURN_POSSESSION_MS = 2800;
const KICKOFF_BALL_PICKUP_SLACK_PX = 10;
const KICKOFF_COVERAGE_SPEED_MULT = 0.88;

function getKickoffKickerX(receivingCpuOffense) {
  const kickTravelDir = getKickoffKickTravelDir(receivingCpuOffense);
  return getFiftyYardLineX() - kickTravelDir * KICKOFF_KICKER_BACK_YARDS * YARDS_TO_PIXELS;
}

function getKickoffBlockerLineX(kickFromX, kickTravelDir) {
  return kickFromX + kickTravelDir * KICKOFF_BLOCKER_DISTANCE_YARDS * YARDS_TO_PIXELS;
}

function getKickoffMinimumLineX(returnerLineX, kickTravelDir) {
  return returnerLineX - kickTravelDir * KICKOFF_RESTRAINING_YARDS_FROM_RETURNER * YARDS_TO_PIXELS;
}

function getKickoffReturnerLineX(receivingCpuOffense) {
  return getYardLineFromOffenseOwnGoal(KICKOFF_RETURNER_OWN_YARD_LINE, receivingCpuOffense);
}

function getKickoffTouchbackSpotX(receivingCpuOffense) {
  return getYardLineFromOffenseOwnGoal(KICKOFF_TOUCHBACK_START_YARDS, receivingCpuOffense);
}

function getKickoffBlockerYs() {
  const pad = player2.radius + 4;
  const top = FIELD.y + pad;
  const bottom = FIELD.y + FIELD.height - pad;
  const thirdH = (bottom - top) / 3;
  return [
    top + thirdH * 0.5,
    top + thirdH * 1.5,
    top + thirdH * 2.5
  ];
}

function getKickoffReturnerYs() {
  const pad = player2.radius + 4;
  const top = FIELD.y + pad;
  const bottom = FIELD.y + FIELD.height - pad;
  const thirdH = (bottom - top) / 3;
  return [top + thirdH * 0.5, top + thirdH * 2.5];
}

function isKickoffBallInReceivingEndZone(ballX, receivingCpuOffense) {
  const dir = getKickoffOffenseDirection(receivingCpuOffense);
  return dir > 0
    ? ballX <= FIELD.x + FIELD.endZoneWidth
    : ballX >= FIELD.x + FIELD.width - FIELD.endZoneWidth;
}

function kickoffBallCrossedMinimumLine(ballX, minLineX, kickTravelDir) {
  return kickTravelDir > 0 ? ballX >= minLineX : ballX <= minLineX;
}

function clampKickoffLandingPastRestrainingLine(landingX, minLineX, kickTravelDir) {
  if (kickoffBallCrossedMinimumLine(landingX, minLineX, kickTravelDir)) {
    return landingX;
  }
  const buffer = 1.5 * YARDS_TO_PIXELS;
  return kickTravelDir > 0 ? minLineX + buffer : minLineX - buffer;
}

function getKickoffReturners() {
  return [cluckNorris, defenseP4];
}

function getClosestKickoffReturnerToBall() {
  const bx = game.kickoffSequenceBallX;
  const by = game.kickoffSequenceBallY;
  let closest = cluckNorris;
  let bestDist = distance(cluckNorris.x, cluckNorris.y, bx, by);
  for (const r of getKickoffReturners()) {
    const d = distance(r.x, r.y, bx, by);
    if (d < bestDist) {
      bestDist = d;
      closest = r;
    }
  }
  return closest;
}

function tryAssignKickoffBallCarrier() {
  const bx = game.kickoffSequenceBallX;
  const by = game.kickoffSequenceBallY;
  for (const r of getKickoffReturners()) {
    if (distance(r.x, r.y, bx, by) <= r.radius + ball.radius + KICKOFF_BALL_PICKUP_SLACK_PX) {
      ball.carrier = r;
      ball.x = r.x;
      ball.y = r.y;
      ball.inFlight = false;
      ball.arcHeight = 0;
      updateBallPosition();
      game.kickoffSequencePhase = "return";
      game.kickoffSequenceTimer = KICKOFF_RETURN_POSSESSION_MS;
      return true;
    }
  }
  return false;
}

function triggerKickoffShortKickPenalty() {
  game.state = "kickoffFlagPopup";
  game.kickoffFlagPopupTimer = 2800;
  game.kickoffFlagMessage = "Flag — kick short of the restraining line";
}

function finishKickoffTouchback() {
  const spot = clampPlayableX(
    getKickoffTouchbackSpotX(game.kickoffSequenceNextCpuOffense),
    player1.radius
  );
  finishKickoffPlaySequence(spot);
}

function getKickoffOffenseDirection(receivingCpuOffense) {
  const userDir = game.userOffenseDirection === -1 ? -1 : 1;
  return receivingCpuOffense ? -userDir : userDir;
}

function getYardLineFromOffenseOwnGoal(yards, receivingCpuOffense) {
  const dir = getKickoffOffenseDirection(receivingCpuOffense);
  // Own goal is the end zone this team defends — opposite the direction they attack.
  return dir > 0
    ? FIELD.x + FIELD.endZoneWidth + yards * YARDS_TO_PIXELS
    : FIELD.x + FIELD.width - FIELD.endZoneWidth - yards * YARDS_TO_PIXELS;
}

function getKickoffReturnDirectionForCarrier(_returner) {
  return getKickoffOffenseDirection(!!game.kickoffSequenceNextCpuOffense);
}

function hasKickoffReturnScoredByCarrier(returner) {
  const dir = getKickoffReturnDirectionForCarrier(returner);
  const goalX = dir > 0
    ? FIELD.x + FIELD.width - FIELD.endZoneWidth
    : FIELD.x + FIELD.endZoneWidth;
  return dir > 0 ? returner.x >= goalX : returner.x <= goalX;
}

function previewDefensePositions() {
  applyDefenseShellForUserOffense(allyHorse.y, null);
}

function getDefenseControlledPlayer() {
  if (game.defenseModeControlledPlayerId === "donkey") return allyDonkey;
  if (game.defenseModeControlledPlayerId === "cluck") return cluckNorris;
  return player2;
}

function getFullDefenderId(entity) {
  if (entity === allyDonkey) return "allyDonkey";
  if (entity === cluckNorris) return "cluckNorris";
  if (entity === defenseP4) return "defenseP4";
  if (entity === defenseP5) return "defenseP5";
  return "player2";
}

function getDefenderById(id) {
  if (id === "allyDonkey" || id === "donkey") return allyDonkey;
  if (id === "cluckNorris" || id === "cluck") return cluckNorris;
  if (id === "defenseP4") return defenseP4;
  if (id === "defenseP5") return defenseP5;
  return player2;
}

function getDefenderId(entity) {
  return getFullDefenderId(entity);
}

function getSelectedPassRusher() {
  return getDefenderById(game.defenseUserRusherId);
}

function isDefenseControlledPlayer(player) {
  return game.cpuOffense && getDefenseControlledPlayer() === player;
}

function cycleDefenseControlledPlayer() {
  const order = ["player2", "donkey", "cluck"];
  const idx = order.indexOf(game.defenseModeControlledPlayerId);
  game.defenseModeControlledPlayerId = order[(idx + 1 + order.length) % order.length];
}

function cycleDefensePassRusher() {
  const order = ["player2", "allyDonkey", "cluckNorris"];
  const idx = order.indexOf(game.defenseUserRusherId);
  game.defenseUserRusherId = order[(idx + 1 + order.length) % order.length];
}

function toggleDefensePressJam() {
  game.defensePressJam = !game.defensePressJam;
}

function getJamDefenderForReceiver(receiver) {
  if (!game.cpuOffense) return null;
  if (receiver === allyHorse) return getDefenderById(game.passDefCoverHorseId);
  if (receiver === lilTunnelPete) return getDefenderById(game.passDefCoverPeteId);
  if (receiver === offenseP4) return getDefenderById(game.passDefCoverP4Id);
  return null;
}

function moveDefensePlayer(entity, tx, ty, speed, dt) {
  if (isDefenseControlledPlayer(entity) && game.state === "playing") {
    return;
  }
  moveToward(entity, tx, ty, speed, dt);
  clampPlayerToField(entity);
}

function moveDefenseTeamToward(tx, ty, dt) {
  moveDefensePlayer(player2, tx, ty, player2.speed, dt);
  moveDefensePlayer(allyDonkey, tx, ty, allyDonkey.speed, dt);
  moveDefensePlayer(cluckNorris, tx, ty, cluckNorris.speed, dt);
  moveDefensePlayer(defenseP4, tx, ty, defenseP4.speed, dt);
  moveDefensePlayer(defenseP5, tx, ty, defenseP5.speed, dt);
}

function moveCpuOffenseCarrier(carrier, dt, laneY = carrier.y) {
  const targetY = clamp(laneY, FIELD.y + carrier.radius, FIELD.y + FIELD.height - carrier.radius);
  const targetX = getOffenseDirection() > 0 ? FIELD.x + FIELD.width - FIELD.endZoneWidth + 18 : FIELD.x + 20;
  const runMult = game.cpuOffense ? 1.12 : 1;
  moveToward(carrier, targetX, targetY, carrier.speed * runMult, dt);
  clampPlayerToField(carrier);
}

function moveQuarterbackRunBlock(carrier, dt) {
  if (!carrier) return;

  const defenders = getDefenseTeamMembers();
  let blockTarget = defenders[0];
  let bestDist = distance(carrier.x, carrier.y, blockTarget.x, blockTarget.y);
  for (let i = 1; i < defenders.length; i++) {
    const cand = defenders[i];
    const candDist = distance(carrier.x, carrier.y, cand.x, cand.y);
    if (candDist < bestDist) {
      bestDist = candDist;
      blockTarget = cand;
    }
  }

  const dx = blockTarget.x - carrier.x;
  const dy = blockTarget.y - carrier.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const targetX = carrier.x + (dx / len) * Math.max(20, len * 0.58);
  const targetY = carrier.y + (dy / len) * Math.max(20, len * 0.58);
  moveToward(player1, targetX, targetY, player1.speed, dt);
  clampPlayerToField(player1);
}

function getOffenseDirection() {
  const userDir = game.userOffenseDirection === -1 ? -1 : 1;
  const cpuHasBall = !!game.cpuOffense || !!game.turnoverSeriesActive;
  return cpuHasBall ? -userDir : userDir;
}

/** Signed yards gained toward the offense's end zone (positive = forward). */
function getPlayModeYardsGained(spotX, lineX = game.playModeLineX) {
  return Math.round((spotX - lineX) / YARDS_TO_PIXELS * getOffenseDirection());
}

function getYardsToGoalFromLine(lineX) {
  if (lineX == null) return 50;
  return Math.abs(getOffenseTouchdownEdgeX() - lineX) / YARDS_TO_PIXELS;
}

function computeChainYardsToGo(lineX) {
  const toGoal = Math.round(getYardsToGoalFromLine(lineX));
  return Math.min(FIRST_DOWN_YARDS, Math.max(1, toGoal));
}

function updateFirstDownLineX() {
  if (game.playModeLineX == null || game.playModeYardsToGo == null) {
    game.playModeFirstDownLineX = null;
    return;
  }
  game.playModeFirstDownLineX = getOffsetX(game.playModeLineX, game.playModeYardsToGo);
}

function resetPlayModeChain(lineX, down = 1) {
  game.playModeLineX = lineX;
  game.playModeDown = down;
  game.playModeYardsToGo = computeChainYardsToGo(lineX);
  updateFirstDownLineX();
}

function formatPlayModeDownDistance() {
  const ord = ["", "1st", "2nd", "3rd", "4th"][game.playModeDown] || `${game.playModeDown}th`;
  const ytg = Math.max(1, Math.round(game.playModeYardsToGo ?? FIRST_DOWN_YARDS));
  const goalYards = Math.round(getYardsToGoalFromLine(game.playModeLineX));
  if (ytg >= goalYards && goalYards <= FIRST_DOWN_YARDS) {
    return `${ord} & Goal`;
  }
  return `${ord} & ${ytg}`;
}

function resolveDownAndDistanceAfterPlay(newLineX) {
  const incomplete = game.playModeIncomplete;
  const isTurnoverPlay = game.playModeLastResultType === "interception";
  const yards = incomplete || isTurnoverPlay ? 0 : getPlayModeYardsGained(newLineX);
  const nextSpot = incomplete || isTurnoverPlay ? game.playModeLineX : newLineX;

  if (yards >= game.playModeYardsToGo) {
    game.playModeLineX = nextSpot;
    resetPlayModeChain(nextSpot, 1);
    return "firstDown";
  }

  game.playModeYardsToGo = Math.max(1, game.playModeYardsToGo - yards);
  updateFirstDownLineX();

  if (game.playModeDown >= game.playModeMaxDowns) {
    return "turnover";
  }

  game.playModeDown += 1;
  game.playModeLineX = nextSpot;
  return "nextDown";
}

/** Play diagrams use right = toward the end zone; mirror when offense drives left. */
function shouldMirrorPlayDiagram() {
  return getOffenseDirection() < 0;
}

function getOffsetX(baseX, yards) {
  return baseX + getOffenseDirection() * yards * YARDS_TO_PIXELS;
}

function getOffsetXPx(baseX, pixels) {
  return baseX + getOffenseDirection() * pixels;
}

/** Pin an offensive player exactly on the line of scrimmage (X). */
function snapOffenseToLineOfScrimmage(entity, lineX) {
  if (lineX == null || !entity) return;
  entity.x = lineX;
}

function clampPlayableX(x, padding = 0) {
  return clamp(x, FIELD.x + FIELD.endZoneWidth + padding, FIELD.x + FIELD.width - FIELD.endZoneWidth - padding);
}

function getOffenseTouchdownEdgeX() {
  return getOffenseDirection() > 0
    ? FIELD.x + FIELD.width - FIELD.endZoneWidth
    : FIELD.x + FIELD.endZoneWidth;
}

function hasOffenseScored(entity) {
  return getOffenseDirection() > 0
    ? entity.x >= getOffenseTouchdownEdgeX()
    : entity.x <= getOffenseTouchdownEdgeX();
}

function hasCrossedLineOfScrimmage(x) {
  return getOffenseDirection() > 0 ? x >= game.playModeLineX : x <= game.playModeLineX;
}

/** QB crossed the line — drop pass pro so defenders and linemen stop locking up at the LOS. */
function markQbScramblePastLine() {
  if (game.passPlayCanThrow) {
    game.passPlayCanThrow = false;
    game.passCenterBlockMs = 0;
  }
}

function isOffenseInOwnEndZone(x) {
  return getOffenseDirection() > 0
    ? x <= FIELD.x + FIELD.endZoneWidth
    : x >= FIELD.x + FIELD.width - FIELD.endZoneWidth;
}

function moveOffenseX(entity, dt, speedMultiplier = 1) {
  let mult = speedMultiplier;
  const isPassPlay = PASS_PLAY_KEYS.has(game.playModeCurrentPlay);
  if (
    isPassPlay &&
    ball.carrier === player1 &&
    !ball.inFlight &&
    (entity === allyHorse || entity === lilTunnelPete || entity === offenseP4)
  ) {
    mult *= getPassRouteSpeedRamp();
  }
  if (
    game.cpuOffense &&
    game.defensePressJam &&
    game.passJamWindowMs > 0 &&
    isPassPlay &&
    (entity === allyHorse || entity === lilTunnelPete)
  ) {
    const jamDef = getJamDefenderForReceiver(entity);
    const nearLine = Math.abs(entity.x - game.playModeLineX) <= 7 * YARDS_TO_PIXELS;
    if (jamDef && nearLine && distance(entity.x, entity.y, jamDef.x, jamDef.y) <= entity.radius * 2.35) {
      entity.y += (jamDef.y > entity.y ? -1 : 1) * 26 * dt;
    }
  }
  entity.x += getOffenseDirection() * entity.speed * dt * mult;
}

function getPassRouteSpeedMult(entity, speed) {
  const base = entity && entity.speed != null ? entity.speed : CONFIG.playerSpeed;
  return speed / Math.max(base, 0.01);
}

function isComebackLandmarkX(landmarkX) {
  if (landmarkX == null || game.playModeLineX == null) return false;
  const dir = getOffenseDirection();
  return dir > 0
    ? landmarkX < game.playModeLineX - 10 * YARDS_TO_PIXELS
    : landmarkX > game.playModeLineX + 10 * YARDS_TO_PIXELS;
}

/** Keep moving after the scripted landmark so receivers do not freeze in place. */
function continueReceiverAfterLandmark(entity, landmarkX, landmarkY, speed, dt) {
  if (!entity) return;
  const routeSpeedMult = getPassRouteSpeedMult(entity, speed);
  if (isComebackLandmarkX(landmarkX) && ball.carrier === player1 && !ball.inFlight) {
    moveToward(entity, player1.x, player1.y, speed * 0.66, dt);
  } else {
    moveOffenseX(entity, dt, routeSpeedMult);
  }
  clampPlayerToField(entity);
}

function runReceiverToLandmarkOrContinue(entity, tx, ty, speed, dt, arrivePad = 14) {
  if (!entity) return;
  if (distance(entity.x, entity.y, tx, ty) <= arrivePad) {
    continueReceiverAfterLandmark(entity, tx, ty, speed, dt);
    return;
  }
  moveToward(entity, tx, ty, speed, dt);
}

const PASS_PLAY_TUNING = {
  passRight: {
    primaryRead: "horse",
    primaryWeight: 0.66,
    throwMinMs: 420,
    throwJitterMs: 240,
    completionChance: 0.74,
    targetOffset: { horse: { x: 42, y: 0 }, pete: { x: 24, y: 0 }, p4: { x: 18, y: -14 } }
  },
  passLeft: {
    primaryRead: "horse",
    primaryWeight: 0.62,
    throwMinMs: 420,
    throwJitterMs: 250,
    completionChance: 0.72,
    targetOffset: { horse: { x: 42, y: 0 }, pete: { x: 20, y: 0 }, p4: { x: 18, y: 14 } }
  },
  barnPlay: {
    primaryRead: "horse",
    primaryWeight: 0.58,
    throwMinMs: 460,
    throwJitterMs: 260,
    completionChance: 0.71,
    targetOffset: { horse: { x: 44, y: -24 }, pete: { x: 14, y: -36 }, p4: { x: 24, y: 16 } }
  },
  scrambledEggs: {
    primaryRead: "pete",
    primaryWeight: 0.57,
    throwMinMs: 440,
    throwJitterMs: 250,
    completionChance: 0.7,
    targetOffset: { horse: { x: -14, y: 0 }, pete: { x: 28, y: 16 }, p4: { x: 20, y: -18 } }
  },
  hayBaleHook: {
    primaryRead: "horse",
    primaryWeight: 0.62,
    throwMinMs: 440,
    throwJitterMs: 250,
    completionChance: 0.71,
    targetOffset: { horse: { x: -14, y: 0 }, pete: { x: 28, y: 16 }, p4: { x: 20, y: -18 } }
  },
  siloSlant: {
    primaryRead: "horse",
    primaryWeight: 0.64,
    throwMinMs: 400,
    throwJitterMs: 220,
    completionChance: 0.73,
    targetOffset: { horse: { x: 18, y: 8 }, pete: { x: 12, y: -22 }, p4: { x: 16, y: 0 } }
  },
  pasturePop: {
    primaryRead: "pete",
    primaryWeight: 0.68,
    throwMinMs: 360,
    throwJitterMs: 200,
    completionChance: 0.76,
    targetOffset: { horse: { x: 36, y: 0 }, pete: { x: -10, y: 0 }, p4: { x: 14, y: -12 } }
  },
  fencePost: {
    primaryRead: "horse",
    primaryWeight: 0.6,
    throwMinMs: 460,
    throwJitterMs: 260,
    completionChance: 0.68,
    targetOffset: { horse: { x: 40, y: 0 }, pete: { x: 20, y: 0 }, p4: { x: 16, y: 14 } }
  }
};

function canThrowOnCurrentPassPlay() {
  if (!game.passPlayCanThrow || ball.carrier !== player1 || ball.inFlight) return false;
  return !!game.passPlayDropbackDone;
}

function getPassPlayTuning(playKey) {
  if (typeof getAdjustedPassPlayTuning === "function") {
    return getAdjustedPassPlayTuning(playKey);
  }
  return PASS_PLAY_TUNING[playKey] || PASS_PLAY_TUNING.passRight;
}

function tickPassRouteProgress(dt) {
  game.passPlayRouteMs = (game.passPlayRouteMs || 0) + dt * 1000;
}

function getPassRouteSpeedRamp() {
  if (ball.carrier === player1 && !ball.inFlight) {
    const releaseT = clamp((game.passPlayRouteMs || 0) / 220, 0, 1);
    return 0.78 + 0.22 * releaseT;
  }
  return 1;
}

/** Scripted pass route speed for one receiver — respects entity.speed and release ramp. */
function getScriptedPassRouteSpeed(entity) {
  const baseSpeed = entity && entity.speed != null ? entity.speed : CONFIG.playerSpeed;
  return baseSpeed * getPassRouteSpeedRamp();
}

function getPassDropbackTarget(lineX) {
  const rawTarget = lineX - getOffenseDirection() * 10 * YARDS_TO_PIXELS;
  return clampPlayableX(rawTarget, player1.radius + 4);
}

function hasReachedForwardX(currentX, targetX) {
  return getOffenseDirection() > 0 ? currentX >= targetX : currentX <= targetX;
}

function hasNotReachedForwardX(currentX, targetX) {
  return !hasReachedForwardX(currentX, targetX);
}

function hasReachedDropbackTarget(currentX, targetX) {
  return getOffenseDirection() > 0 ? currentX <= targetX : currentX >= targetX;
}

function isShotgunCenterSnapPlay() {
  return game.playModeCurrentPlay === "barnPlay" ||
    game.playModeCurrentPlay === "hayBaleHook" ||
    game.playModeCurrentPlay === "scrambledEggs" ||
    game.playModeCurrentPlay === "cornfieldCross" ||
    game.playModeCurrentPlay === "siloSlant" ||
    game.playModeCurrentPlay === "pasturePop";
}

function getStretchPlayRunLaneY() {
  if (game.playModeCurrentPlay === "mudHoleDive") {
    return FIELD.y + FIELD.height * 0.55;
  }
  return FIELD.y + FIELD.height * 0.72;
}

/** Shotgun doubles: center holds the ball briefly, then snaps to the QB. Returns true while snap is in progress. */
function updateShotgunCenterSnapPhase(dt, duringSnapCallback) {
  if (!isShotgunCenterSnapPlay() || ball.carrier !== offenseP5 || ball.inFlight) {
    return false;
  }
  game.playModePassSnapMs -= dt * 1000;
  snapOffenseToLineOfScrimmage(offenseP5, game.playModeLineX);
  if (duringSnapCallback) {
    duringSnapCallback(dt);
  }
  const { rushing } = getPassDefenders();
  movePassSupportRoles(game.playModeCurrentPlay, rushing, dt);
  movePassDefenders(dt, ball);
  updateBallPosition();
  if (game.playModePassSnapMs <= 0) {
    ball.carrier = player1;
    if (game.playModeCurrentPlay === "scrambledEggs") {
      game.scrambledEggsP4FadeState = null;
    }
    updateBallPosition();
  }
  return true;
}

function applyDefaultFieldRoles() {
  game.turnoverSeriesActive = false;

  [player1, player2, allyHorse, allyDonkey, cluckNorris, lilTunnelPete, offenseP4, offenseP5, defenseP4, defenseP5].forEach((e) => {
    delete e.teamTag;
    delete e.legacyLabel;
  });

  applySkin(player1, TEAMS.barnaby.roster.qb, "barnaby", "player1");
  applySkin(allyHorse, TEAMS.barnaby.roster.wr, "barnaby", "player1");
  applySkin(lilTunnelPete, TEAMS.barnaby.roster.flex, "barnaby", "player1");
  applySkin(offenseP4, TEAMS.barnaby.roster.p4, "barnaby", "player1");
  applySkin(offenseP5, TEAMS.barnaby.roster.p5, "barnaby", "player1");
  applySkin(player2, TEAMS.professorPig.roster.qb, "professorPig", "player2");
  applySkin(allyDonkey, TEAMS.professorPig.roster.wr, "professorPig", "player2");
  applySkin(cluckNorris, TEAMS.professorPig.roster.flex, "professorPig", "player2");
  applySkin(defenseP4, TEAMS.professorPig.roster.p4, "professorPig", "player2");
  applySkin(defenseP5, TEAMS.professorPig.roster.p5, "professorPig", "player2");

  [player1, player2, allyHorse, allyDonkey, cluckNorris, lilTunnelPete, offenseP4, offenseP5, defenseP4, defenseP5].forEach((e) => {
    delete e.teamTag;
  });
}

function applyTurnoverFieldRoles() {
  game.turnoverSeriesActive = true;

  if (game.playUserTeamId && game.playCpuTeamId) {
    applyPlayModeTeamLayout(game.playCpuTeamId, game.playUserTeamId);
    applyDifficultyTeamSpeeds(true);
    return;
  }

  applySkin(player1, TEAMS.professorPig.roster.qb, "professorPig", "player2");
  applySkin(allyHorse, TEAMS.professorPig.roster.wr, "professorPig", "player2");
  applySkin(lilTunnelPete, TEAMS.professorPig.roster.flex, "professorPig", "player2");
  applySkin(offenseP4, TEAMS.professorPig.roster.p4, "professorPig", "player2");
  applySkin(offenseP5, TEAMS.professorPig.roster.p5, "professorPig", "player2");
  applySkin(player2, TEAMS.barnaby.roster.qb, "barnaby", "player1");
  applySkin(allyDonkey, TEAMS.barnaby.roster.wr, "barnaby", "player1");
  applySkin(cluckNorris, TEAMS.barnaby.roster.flex, "barnaby", "player1");
  applySkin(defenseP4, TEAMS.barnaby.roster.p4, "barnaby", "player1");
  applySkin(defenseP5, TEAMS.barnaby.roster.p5, "barnaby", "player1");

  [player1, player2, allyHorse, allyDonkey, cluckNorris, lilTunnelPete, offenseP4, offenseP5, defenseP4, defenseP5].forEach((e) => {
    delete e.teamTag;
  });
}

function getScoringTeamForPlayer(player) {
  return player.teamOwnerId === "player2" ? player2 : player1;
}

function startTurnoverDefenseSeries(fromX) {
  startDriveAtSpot(fromX, true, "turnover");
}

function isDefenderEntity(entity) {
  return entity === player2 || entity === allyDonkey || entity === cluckNorris ||
    entity === defenseP4 || entity === defenseP5;
}

function getDefenseControlIdForEntity(entity) {
  if (entity === allyDonkey) return "donkey";
  if (entity === cluckNorris) return "cluck";
  return "player2";
}

function startArcingPassFlight(tx, ty) {
  const startX = ball.x;
  const startY = ball.y;
  const dist = distance(startX, startY, tx, ty);
  ball.startX = startX;
  ball.startY = startY;
  ball.targetX = tx;
  ball.targetY = ty;
  ball.flightElapsedMs = 0;
  ball.flightDurationMs = Math.max(280, (dist / CONFIG.passSpeed) * 1000);
  ball.flightArcPeak = clamp(dist * 0.22, 26, 90);
  ball.arcHeight = 0;
  ball.failedInterceptorIds = [];
  ball.inFlight = true;
  ball.carrier = null;
}

function advanceArcingPassFlight(dt) {
  ball.flightElapsedMs = Math.min(ball.flightDurationMs, ball.flightElapsedMs + dt * 1000);
  const t = ball.flightDurationMs > 0 ? ball.flightElapsedMs / ball.flightDurationMs : 1;
  ball.x = ball.startX + (ball.targetX - ball.startX) * t;
  ball.y = ball.startY + (ball.targetY - ball.startY) * t;
  ball.arcHeight = Math.sin(Math.PI * t) * ball.flightArcPeak;
  return t;
}

function getPassCatchCandidates() {
  return [
    { entity: allyHorse, team: "offense" },
    { entity: lilTunnelPete, team: "offense" },
    { entity: offenseP4, team: "offense" },
    { entity: player2, team: "defense" },
    { entity: allyDonkey, team: "defense" },
    { entity: cluckNorris, team: "defense" }
  ];
}

function handlePassInterception(entity) {
  ball.inFlight = false;
  ball.arcHeight = 0;
  ball.carrier = entity;
  game.passPlayTargetReceiver = null;
  replayFinalizePlayBuffer();
  game.interceptionPopupTimer = 2000;
  if (game.cpuOffense) {
    game.defenseModeControlledPlayerId = getDefenseControlIdForEntity(entity);
  }
  game.state = "interceptionPopup";
  updateBallPosition();
  playInterceptionAlertAudio();
}

function resolveArcingPassFlight(dt, moveReceivers) {
  moveReceivers(dt);
  const t = advanceArcingPassFlight(dt);
  const visualBall = getBallVisualState(ball);
  const canCatch = t >= 0.18 && ball.arcHeight <= Math.max(44, ball.flightArcPeak * 0.72);
  if (canCatch) {
    const interceptionLandingRadius = 5 * YARDS_TO_PIXELS;
    const touching = getPassCatchCandidates()
      .filter(({ entity, team }) => circleTouchVisibleBall(entity, ball, team === "defense" ? 5 : 2))
      .sort((a, b) => distance(a.entity.x, a.entity.y, visualBall.x, visualBall.y) - distance(b.entity.x, b.entity.y, visualBall.x, visualBall.y));

    for (const winner of touching) {
      if (winner.team === "defense") {
        const canInterceptAtLandingSpot =
          distance(winner.entity.x, winner.entity.y, ball.targetX, ball.targetY) <= interceptionLandingRadius;
        if (!canInterceptAtLandingSpot) {
          continue;
        }
        if (ball.failedInterceptorIds.includes(winner.entity.id)) {
          continue;
        }
        if (Math.random() < 0.75) {
          ball.inFlight = false;
          ball.arcHeight = 0;
          ball.carrier = winner.entity;
          handlePassInterception(winner.entity);
          return "interception";
        }
        ball.failedInterceptorIds.push(winner.entity.id);
        continue;
      }

      ball.inFlight = false;
      ball.arcHeight = 0;
      ball.carrier = winner.entity;
      game.scrambledEggsP4FadeState = null;
      updateBallPosition();
      if (winner.entity === allyHorse) return "horse";
      if (winner.entity === lilTunnelPete) return "pete";
      return "p4";
    }
  }

  if (t >= 1) {
    ball.x = ball.targetX;
    ball.y = ball.targetY;
    ball.arcHeight = 0;
    ball.inFlight = false;
    ball.carrier = null;
    return "incomplete";
  }

  return null;
}

function moveOffensePursuitToCarrier(carrier, dt, includeQuarterback = true) {
  if (includeQuarterback) {
    moveToward(player1, carrier.x, carrier.y, player1.speed, dt);
    clampPlayerToField(player1);
  }
  moveToward(allyHorse, carrier.x, carrier.y, allyHorse.speed, dt);
  moveToward(lilTunnelPete, carrier.x, carrier.y, lilTunnelPete.speed, dt);
  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
}

function updateInterceptionReturn(dt) {
  const carrier = ball.carrier;
  if (!isDefenderEntity(carrier)) return false;

  const leftEndZoneRight = FIELD.x + FIELD.endZoneWidth;
  updatePlayerInput(dt);

  const controlledCarrier = game.cpuOffense && isDefenseControlledPlayer(carrier);
  if (!controlledCarrier) {
    moveToward(carrier, FIELD.x + 20, FIELD.y + FIELD.height / 2, carrier.speed, dt);
    clampPlayerToField(carrier);
  } else {
    clampPlayerToField(carrier);
  }

  if (carrier !== player2) {
    moveDefensePlayer(player2, carrier.x + 24, carrier.y, player2.speed, dt);
  }
  if (carrier !== allyDonkey) {
    moveDefensePlayer(allyDonkey, carrier.x + 24, carrier.y + 28, allyDonkey.speed, dt);
  }
  if (carrier !== cluckNorris) {
    moveDefensePlayer(cluckNorris, carrier.x + 24, carrier.y - 28, cluckNorris.speed, dt);
  }
  if (carrier !== defenseP4) {
    moveDefensePlayer(defenseP4, carrier.x + 20, carrier.y + 18, defenseP4.speed, dt);
  }
  if (carrier !== defenseP5) {
    moveDefensePlayer(defenseP5, carrier.x + 20, carrier.y - 18, defenseP5.speed, dt);
  }

  moveOffensePursuitToCarrier(carrier, dt, game.cpuOffense);
  updateBallPosition();

  if (carrier.x <= leftEndZoneRight) {
    finishDriveTouchdown(carrier);
    return true;
  }

  if (circleTackle(carrier, player1) || circleTackle(carrier, allyHorse) || circleTackle(carrier, lilTunnelPete)) {
    if (shouldFumbleOnTackle(carrier)) {
      looseBallFromFumble(carrier);
      return true;
    }
    const deadBallX = carrier.x;
    startDriveAtSpot(deadBallX, !game.turnoverSeriesActive, "interceptionReturnStop");
    return true;
  }

  return true;
}

function returnToHomeMenu() {
  if (game.franchiseActive && typeof completeFranchisePlayedGame === "function") {
    completeFranchisePlayedGame(getActiveFranchise());
    return;
  }
  applyDefaultFieldRoles();
  game.playUserTeamId = null;
  game.playCpuTeamId = null;
  game.playSessionKind = null;
  game.sessionRecapPlays = null;
  game.sessionRecapDriveResult = null;
  game.sessionRecapTeamLabel = null;
  game.driveSummaryResume = null;
  resetGameClock();
  game.teamScores = null;
  game.teamSelectUser = null;
  game.teamSelectPage = 0;
  game.state = "menu";
  game.stateBeforePauseMenu = null;
  game.mode = null;
  game.cpuOffense = false;
  game.winner = null;
  game.scorePauseTimer = 0;
  game.touchdownPopupTimer = 0;
  game.lastTouchdownTeamName = "";
  game.fieldCelebrationTimer = 0;
  game.fieldCelebrationType = null;
  game.winPopupTimer = 0;
  game.safetyPopupTimer = 0;
  game.safetyAgainstCpuOffense = false;
  game.interceptionPopupTimer = 0;
  game.fumblePopupTimer = 0;
  game.playModeBallLooseFromFumble = false;
  game.playModeFumbleRecoveryTackled = false;
  game.playModePendingFumbleTurnover = false;
  game.afterTouchdownAction = null;
  game.lastTouchdownSpotX = null;
  game.twoPointAttemptActive = false;
  game.fourthDownGoForIt = false;
  game.fourthDownPickedGoForIt = false;
  game.kickoffActive = false;
  game.kickoffReceivingCpuOffense = false;
  game.kickoffSequencePhase = null;
  game.kickoffSequenceTimer = 0;
  game.kickoffSequenceFlightT = 0;
  game.puntAimCharging = false;
  game.scoredBy = null;
  player1.score = 0;
  player2.score = 0;
  game.touchMoveX = 0;
  game.touchMoveY = 0;
  game.touchStickActive = false;
  game.lastPlayReplayFrames = null;
  game.replayFrames = null;
  startMenuMusic();
}

function registerPatKickScorer(scorer) {
  if (scorer.teamTag && TEAMS[scorer.teamTag]) {
    game.patKickScorerTeamTag = scorer.teamTag;
  } else {
    game.patKickScorerTeamTag = null;
  }
  game.patKickScorerIsPlayer1 = getScoringTeamForPlayer(scorer) === player1;
  game.lastTouchdownSpotX = scorer.x;
}

/** Line of scrimmage: two yards back from TD spot toward midfield (clamped to the field). */
function getTwoPointConversionLineX() {
  const leftGoalX = FIELD.x + FIELD.endZoneWidth;
  const rightGoalX = FIELD.x + FIELD.width - FIELD.endZoneWidth;
  const spot = game.lastTouchdownSpotX != null ? game.lastTouchdownSpotX : getOffenseTouchdownEdgeX();
  const scoredIntoRight = Math.abs(spot - rightGoalX) <= Math.abs(spot - leftGoalX);
  const dir = scoredIntoRight ? 1 : -1;
  return clampPlayableX((scoredIntoRight ? rightGoalX : leftGoalX) - dir * 2 * YARDS_TO_PIXELS, player1.radius);
}

function resumeAfterPostTouchdownScore() {
  if (game.afterTouchdownAction !== "startPlayModeDrive") {
    return;
  }
  game.afterTouchdownAction = null;
  beginNextPlaySessionSeries(!game.cpuOffense);
}

function beginTwoPointConversionAttempt() {
  game.twoPointAttemptActive = true;
  resetPlayModeChain(getTwoPointConversionLineX(), 1);
  game.playModePhase = null;
  game.playModeCurrentPlay = null;
  game.playModeTackle = false;
  game.playModePendingFumbleTurnover = false;
  game.state = "playModePlaySelect";
  game.playModePlaySelectPage = 0;
  positionForPlayModeAt(game.playModeLineX);
}

function finishTwoPointConversionGood(scorer) {
  game.twoPointAttemptActive = false;
  playTouchdownAudio(scorer);

  if (game.playUserTeamId && scorer.teamTag) {
    addTeamScorePoints(scorer.teamTag, 2);
    if (maybeFinishSuddenDeathOvertime()) return;
  } else {
    getScoringTeamForPlayer(scorer).score += 2;
  }

  resumeAfterPostTouchdownScore();
}

function completeTwoPointConversionFailed() {
  game.twoPointAttemptActive = false;
  game.playModePendingFumbleTurnover = false;
  game.playModeTackle = false;
  resumeAfterPostTouchdownScore();
}

// =========================================================
// Punt (4th down — full field, hold-to-aim power arrow)
// =========================================================

function computePuntDistanceYards(charge01, overcooked) {
  if (overcooked) {
    return 20;
  }
  const min = 30;
  const max = 50;
  return min + charge01 * (max - min);
}

function beginPuntAim() {
  game.state = "puntAim";
  game.puntAimCharge = 0;
  game.puntAimHoldMs = 0;
  game.puntAimOvercooked = false;
  game.puntAimCharging = false;
  positionPuntPlay();
}

function resolveKickoffLandingYardsFromOwnGoal(charge, overcooked) {
  if (overcooked) return 40;
  const desired = 30 + Math.round(charge * 16);
  return Math.max(KICKOFF_LEGAL_MIN_YARDS_FROM_OWN, desired);
}

function resolveKickoffResult(charge, overcooked) {
  const yardsFromOwnGoal = resolveKickoffLandingYardsFromOwnGoal(charge, overcooked);
  const receivingSpot = overcooked
    ? getYardLineFromOffenseOwnGoal(yardsFromOwnGoal, game.kickoffReceivingCpuOffense)
    : clampPlayableX(getYardLineFromOffenseOwnGoal(yardsFromOwnGoal, game.kickoffReceivingCpuOffense), player1.radius);
  return { receivingSpot, nextCpuOffense: !!game.kickoffReceivingCpuOffense, overcooked, charge };
}

function computeCpuKickoffCharge() {
  if (typeof computeDifficultyCpuKickoffCharge === "function") {
    return computeDifficultyCpuKickoffCharge();
  }
  return 0.62 + Math.random() * 0.38;
}

function resolveCpuKickoffResult() {
  const charge = computeCpuKickoffCharge();
  const overcooked = Math.random() < 0.06;
  return resolveKickoffResult(charge, overcooked);
}

function beginKickoffAim(nextCpuOffense) {
  game.kickoffReceivingCpuOffense = !!nextCpuOffense;
  game.puntAimCharge = 0;
  game.puntAimHoldMs = 0;
  game.puntAimOvercooked = false;
  game.puntAimCharging = false;

  // Receiving team never aims the kick — CPU kicks when you are receiving.
  if (!nextCpuOffense) {
    beginKickoffPlaySequence(resolveCpuKickoffResult());
    return;
  }

  game.state = "kickoffAim";
}

function beginKickoffPlaySequence(kickoff) {
  const midY = FIELD.y + FIELD.height / 2;
  const dir = getKickoffOffenseDirection(kickoff.nextCpuOffense);
  const kickTravelDir = getKickoffKickTravelDir(kickoff.nextCpuOffense);
  const kickFromX = getKickoffKickerX(kickoff.nextCpuOffense);
  const blockerLineX = clampPlayableX(getKickoffBlockerLineX(kickFromX, kickTravelDir), player1.radius);
  const returnerLineX = clampPlayableX(getKickoffReturnerLineX(kickoff.nextCpuOffense), player1.radius);
  const blockerYs = getKickoffBlockerYs();
  const returnerYs = getKickoffReturnerYs();
  const landingY = Math.random() < 0.5 ? returnerYs[0] : returnerYs[1];
  game.kickoffActive = false;
  game.kickoffSequencePhase = "approach";
  game.kickoffSequenceTimer = 0;
  game.kickoffSequenceFlightT = 0;
  game.kickoffSequenceKickFromX = kickFromX;
  game.kickoffSequenceKickDir = kickTravelDir;
  game.kickoffSequenceBlockerWallX = blockerLineX;
  game.kickoffSequenceMinimumLineX = getKickoffMinimumLineX(returnerLineX, kickTravelDir);
  game.kickoffSequenceReceivingSpot = clampKickoffLandingPastRestrainingLine(
    kickoff.receivingSpot,
    game.kickoffSequenceMinimumLineX,
    kickTravelDir
  );
  game.kickoffSequenceBallX = game.kickoffSequenceReceivingSpot;
  game.kickoffSequenceBallY = landingY;
  game.kickoffSequenceNextCpuOffense = kickoff.nextCpuOffense;
  game.kickoffSequenceLandingY = landingY;
  game.kickoffSequenceReturnTargetX = dir > 0
    ? FIELD.x + FIELD.width - FIELD.endZoneWidth + 24
    : FIELD.x + FIELD.endZoneWidth - 24;

  // Kicking team — kicker 15 yds back from the 50, coverage on the kicking side.
  const kickTeamSide = -kickTravelDir;
  player1.x = kickFromX;
  player1.y = midY;
  allyHorse.x = kickFromX + kickTeamSide * 14;
  allyHorse.y = blockerYs[0];
  lilTunnelPete.x = kickFromX + kickTeamSide * 18;
  lilTunnelPete.y = blockerYs[1];
  offenseP4.x = kickFromX + kickTeamSide * 22;
  offenseP4.y = blockerYs[2];
  offenseP5.x = kickFromX + kickTeamSide * 10;
  offenseP5.y = midY;

  // Receiving team 3-2: blockers 10 yds from kicker split in thirds; returners on own 5.
  player2.x = blockerLineX;
  player2.y = blockerYs[0];
  allyDonkey.x = blockerLineX;
  allyDonkey.y = blockerYs[1];
  defenseP5.x = blockerLineX;
  defenseP5.y = blockerYs[2];
  cluckNorris.x = returnerLineX;
  cluckNorris.y = returnerYs[1];
  defenseP4.x = returnerLineX;
  defenseP4.y = returnerYs[0];

  ball.carrier = null;
  ball.inFlight = false;
  ball.arcHeight = 0;
  ball.x = kickFromX;
  ball.y = midY;

  game.state = "kickoffPlay";
}

function moveKickoffReturnBlockers(returner, dt) {
  const blockers = [player2, allyDonkey, defenseP5];
  const coverage = [player1, allyHorse, lilTunnelPete, offenseP4, offenseP5];
  const assigned = new Set();

  for (const blocker of blockers) {
    let bestTarget = null;
    let bestScore = Infinity;
    for (const defender of coverage) {
      if (assigned.has(defender)) continue;
      const score = distance(defender.x, defender.y, returner.x, returner.y) +
        distance(defender.x, defender.y, blocker.x, blocker.y) * 0.35;
      if (score < bestScore) {
        bestScore = score;
        bestTarget = defender;
      }
    }
    if (bestTarget) {
      assigned.add(bestTarget);
      moveToward(blocker, bestTarget.x, bestTarget.y, blocker.speed, dt);
    } else {
      moveToward(blocker, returner.x, returner.y, blocker.speed * 0.65, dt);
    }
    clampPlayerToField(blocker);
  }
}

function getKickoffCpuReturnLaneY(returner) {
  const laneYs = [
    FIELD.y + FIELD.height * 0.24,
    FIELD.y + FIELD.height * 0.5,
    FIELD.y + FIELD.height * 0.76
  ];
  const coverage = [player1, allyHorse, lilTunnelPete, offenseP4, offenseP5];
  let bestY = laneYs[1];
  let bestScore = -Infinity;
  for (const laneY of laneYs) {
    let laneScore = 0;
    for (const d of coverage) {
      // Prefer lanes with fewer close coverage defenders.
      laneScore -= Math.abs(d.y - laneY);
      if (Math.abs(d.x - returner.x) <= 14 * YARDS_TO_PIXELS) {
        laneScore -= Math.max(0, 180 - Math.abs(d.y - laneY) * 2.2);
      }
    }
    if (laneScore > bestScore) {
      bestScore = laneScore;
      bestY = laneY;
    }
  }
  return clamp(bestY, FIELD.y + returner.radius, FIELD.y + FIELD.height - returner.radius);
}

function controlKickoffUserReturner(returner, dt) {
  let dx = 0;
  let dy = 0;
  if (keys["w"]) dy -= 1;
  if (keys["s"]) dy += 1;
  if (keys["a"]) dx -= 1;
  if (keys["d"]) dx += 1;
  dx += game.touchMoveX || 0;
  dy += game.touchMoveY || 0;
  const len = Math.hypot(dx, dy);
  if (len > 0) {
    dx /= len;
    dy /= len;
    returner.x += dx * returner.speed * dt;
    returner.y += dy * returner.speed * dt;
    clampPlayerToField(returner);
    return;
  }
  // No user input: keep momentum forward so returns don't freeze.
  moveToward(returner, game.kickoffSequenceReturnTargetX, returner.y, returner.speed, dt);
  clampPlayerToField(returner);
}

function finishKickoffPlaySequence(finalSpotX) {
  const spot = clampPlayableX(finalSpotX, player1.radius);
  startDriveAtSpot(spot, game.kickoffSequenceNextCpuOffense, "kickoffReturn");
}

function updateKickoffPlaySequence(dt) {
  if (game.kickoffSequencePhase === "approach") {
    const tx = game.kickoffSequenceKickFromX;
    const ty = FIELD.y + FIELD.height / 2;
    moveToward(player1, tx, ty, player1.speed, dt);
    clampPlayerToField(player1);
    game.kickoffSequenceTimer += dt * 1000;
    if (distance(player1.x, player1.y, tx, ty) <= 5 || game.kickoffSequenceTimer >= 900) {
      game.kickoffSequencePhase = "flight";
      game.kickoffSequenceFlightT = 0;
      ball.inFlight = true;
      ball.carrier = null;
    }
    return;
  }

  if (game.kickoffSequencePhase === "flight") {
    const startX = game.kickoffSequenceKickFromX;
    const endX = game.kickoffSequenceReceivingSpot;
    const landingY = game.kickoffSequenceLandingY || FIELD.y + FIELD.height / 2;
    const kickTravelDir = game.kickoffSequenceKickDir;
    const minLineX = game.kickoffSequenceMinimumLineX;
    const receiveCpu = game.kickoffSequenceNextCpuOffense;
    const blockX = game.kickoffSequenceBlockerWallX;
    const flightSeconds = 1.15;
    game.kickoffSequenceFlightT = Math.min(1, game.kickoffSequenceFlightT + dt / flightSeconds);
    const t = game.kickoffSequenceFlightT;
    ball.x = startX + (endX - startX) * t;
    ball.y = landingY;
    ball.arcHeight = Math.sin(Math.PI * t) * 95;
    game.kickoffSequenceBallX = ball.x;
    game.kickoffSequenceBallY = ball.y;

    if (isKickoffBallInReceivingEndZone(ball.x, receiveCpu)) {
      finishKickoffTouchback();
      return;
    }

    // Returners run to the live ball — no snapping the catch to them.
    moveToward(cluckNorris, ball.x, ball.y, cluckNorris.speed, dt);
    moveToward(defenseP4, ball.x, ball.y, defenseP4.speed, dt);
    clampPlayerToField(cluckNorris);
    clampPlayerToField(defenseP4);
    moveToward(player2, blockX, player2.y, player2.speed, dt);
    moveToward(allyDonkey, blockX, allyDonkey.y, allyDonkey.speed, dt);
    moveToward(defenseP5, blockX, defenseP5.y, defenseP5.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    clampPlayerToField(defenseP5);

    if (t >= 1) {
      ball.inFlight = false;
      ball.arcHeight = 0;
      ball.x = endX;
      ball.y = landingY;
      game.kickoffSequenceBallX = endX;
      game.kickoffSequenceBallY = landingY;

      if (isKickoffBallInReceivingEndZone(endX, receiveCpu)) {
        finishKickoffTouchback();
        return;
      }
      if (!kickoffBallCrossedMinimumLine(endX, minLineX, kickTravelDir)) {
        triggerKickoffShortKickPenalty();
        return;
      }
      if (tryAssignKickoffBallCarrier()) {
        return;
      }
      game.kickoffSequencePhase = "field";
      game.kickoffSequenceTimer = 6000;
    }
    return;
  }

  if (game.kickoffSequencePhase === "field") {
    const bx = game.kickoffSequenceBallX;
    const by = game.kickoffSequenceBallY;
    const blockX = game.kickoffSequenceBlockerWallX;
    game.kickoffSequenceTimer -= dt * 1000;

    moveToward(cluckNorris, bx, by, cluckNorris.speed, dt);
    moveToward(defenseP4, bx, by, defenseP4.speed, dt);
    clampPlayerToField(cluckNorris);
    clampPlayerToField(defenseP4);
    moveToward(player2, blockX, player2.y, player2.speed, dt);
    moveToward(allyDonkey, blockX, allyDonkey.y, allyDonkey.speed, dt);
    moveToward(defenseP5, blockX, defenseP5.y, defenseP5.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    clampPlayerToField(defenseP5);

    ball.x = bx;
    ball.y = by;
    ball.carrier = null;
    ball.inFlight = false;
    ball.arcHeight = 0;

    if (tryAssignKickoffBallCarrier()) {
      return;
    }
    if (game.kickoffSequenceTimer <= 0) {
      const fallback = getClosestKickoffReturnerToBall();
      ball.carrier = fallback;
      game.kickoffSequencePhase = "return";
      game.kickoffSequenceTimer = KICKOFF_RETURN_POSSESSION_MS;
      updateBallPosition();
    }
    return;
  }

  if (game.kickoffSequencePhase === "return") {
    const returner = ball.carrier || cluckNorris;
    const returnDir = getKickoffReturnDirectionForCarrier(returner);
    const returnTargetX = returnDir > 0
      ? FIELD.x + FIELD.width - FIELD.endZoneWidth + 24
      : FIELD.x + FIELD.endZoneWidth - 24;
    const otherReturner = returner === cluckNorris ? defenseP4 : cluckNorris;
    game.kickoffSequenceTimer -= dt * 1000;
    if (game.kickoffSequenceNextCpuOffense) {
      const laneY = getKickoffCpuReturnLaneY(returner);
      moveToward(returner, returnTargetX, laneY, returner.speed, dt);
      clampPlayerToField(returner);
      moveToward(otherReturner, returnTargetX, otherReturner.y, otherReturner.speed, dt);
      clampPlayerToField(otherReturner);
    } else {
      game.kickoffSequenceReturnTargetX = returnTargetX;
      controlKickoffUserReturner(returner, dt);
      moveToward(otherReturner, returnTargetX, otherReturner.y, otherReturner.speed, dt);
      clampPlayerToField(otherReturner);
    }
    moveKickoffReturnBlockers(returner, dt);
    // Kicking-team coverage — slightly slower so returns can develop.
    const covSpd = KICKOFF_COVERAGE_SPEED_MULT;
    moveDefensePlayer(player1, returner.x, returner.y, player1.speed * covSpd, dt);
    moveDefensePlayer(allyHorse, returner.x, returner.y - 16, allyHorse.speed * covSpd, dt);
    moveDefensePlayer(lilTunnelPete, returner.x, returner.y + 16, lilTunnelPete.speed * covSpd, dt);
    moveDefensePlayer(offenseP4, returner.x - 6, returner.y - 28, offenseP4.speed * covSpd, dt);
    moveDefensePlayer(offenseP5, returner.x - 6, returner.y + 28, offenseP5.speed * covSpd, dt);
    updateBallPosition();
    if (hasKickoffReturnScoredByCarrier(returner)) {
      finishDriveTouchdown(returner);
      return;
    }
    if (
      game.kickoffSequenceTimer <= 0 ||
      circleTackle(returner, player1) ||
      circleTackle(returner, allyHorse) ||
      circleTackle(returner, lilTunnelPete) ||
      circleTackle(returner, offenseP4) ||
      circleTackle(returner, offenseP5)
    ) {
      const ownDir = getKickoffReturnDirectionForCarrier(returner);
      const ownGoalLineX = ownDir > 0
        ? FIELD.x + FIELD.endZoneWidth
        : FIELD.x + FIELD.width - FIELD.endZoneWidth;
      const inOwnEndZone = ownDir > 0 ? returner.x <= ownGoalLineX : returner.x >= ownGoalLineX;
      if (inOwnEndZone) {
        finishKickoffTouchback();
      } else {
        finishKickoffPlaySequence(returner.x);
      }
    }
  }
}

function updatePuntAim(dt) {
  const holding = keys[" "] || game.puntAimCharging;
  if (holding) {
    game.puntAimHoldMs += dt * 1000;
    game.puntAimCharge = Math.min(1, game.puntAimCharge + dt * 0.48);
    if (game.puntAimHoldMs >= CONFIG.puntOvercookAfterMs) {
      game.puntAimOvercooked = true;
    }
    if (game.puntAimHoldMs >= CONFIG.puntMaxHoldMs) {
      game.puntAimOvercooked = true;
      game.puntAimCharge = Math.min(1, game.puntAimCharge);
    }
  }
}

function finalizePuntAimKick() {
  if (game.state !== "puntAim") return;
  const charge = game.puntAimCharge;
  const oc = game.puntAimOvercooked;
  game.puntDistanceYards = computePuntDistanceYards(charge, oc);
  game.puntBlocked = false;
  game.puntAimCharging = false;
  startPuntPlayAfterSetup();
}

function finalizeKickoffAimKick() {
  if (game.state !== "kickoffAim") return;
  const charge = game.puntAimCharge;
  const oc = game.puntAimOvercooked;
  const kickoff = resolveKickoffResult(charge, oc);
  beginKickoffPlaySequence(kickoff);
}

function positionPuntPlay() {
  const lineX = game.playModeLineX;
  const dir = getOffenseDirection();
  const midY = FIELD.y + FIELD.height / 2;
  player1.x = lineX - dir * 20 * YARDS_TO_PIXELS;
  player1.y = midY;
  lilTunnelPete.x = lineX;
  lilTunnelPete.y = midY;
  allyHorse.x = lineX - dir * 9 * YARDS_TO_PIXELS;
  allyHorse.y = midY - 28;
  const rushX = lineX + dir * 72;
  player2.x = rushX;
  player2.y = midY;
  const retX = lineX + dir * 50 * YARDS_TO_PIXELS;
  cluckNorris.x = clampPlayableX(retX, cluckNorris.radius);
  cluckNorris.y = midY;
  allyDonkey.x = allyHorse.x + dir * 1.5 * YARDS_TO_PIXELS;
  allyDonkey.y = midY + 28;
  ball.carrier = lilTunnelPete;
  ball.inFlight = false;
  updateBallPosition();
}

function startPuntPlayAfterSetup() {
  game.playModeCurrentPlay = "punt";
  game.puntPhase = "snapKick";
  game.puntPhaseTimer = 720;
  game.puntKickReleased = false;
  game.puntFlightT = 0;
  game.puntReturnMs = 0;
  game.puntReturnStartX = 0;
  game.puntPunterAssist = false;
  positionPuntPlay();
  game.state = "playing";
  replayStartRecording();
}

function finishPuntPlay(spotX) {
  replayFinalizePlayBuffer();
  game.playModeCurrentPlay = null;
  game.playModePhase = null;
  game.puntPhase = null;
  game.puntPhaseTimer = 0;
  ball.carrier = null;
  ball.inFlight = false;
  ball.arcHeight = 0;
  game.fourthDownGoForIt = false;
  game.fourthDownPickedGoForIt = false;
  const x = clampPlayableX(spotX, player1.radius);
  startDriveAtSpot(x, !game.cpuOffense, "puntResult");
}

function updatePlayModePunt(dt) {
  const dir = getOffenseDirection();
  const lineX = game.playModeLineX;
  const midY = FIELD.y + FIELD.height / 2;

  if (game.puntPhase === "snapKick") {
    game.puntPhaseTimer -= dt * 1000;
    moveToward(player2, player1.x, player1.y, player2.speed, dt);
    moveToward(allyHorse, lineX + dir * 24 * YARDS_TO_PIXELS, midY, allyHorse.speed, dt);
    const rusherGap = distance(player1.x, player1.y, player2.x, player2.y);
    if (rusherGap < 8 * YARDS_TO_PIXELS) {
      const evadeY = clamp(
        player1.y + (player2.y > player1.y ? -44 : 44),
        FIELD.y + player1.radius,
        FIELD.y + FIELD.height - player1.radius
      );
      moveToward(player1, player1.x - dir * 3.2 * YARDS_TO_PIXELS, evadeY, player1.speed, dt);
    } else {
      moveToward(player1, lineX - dir * 20 * YARDS_TO_PIXELS, midY, player1.speed, dt);
    }
    if (ball.carrier === lilTunnelPete && game.puntPhaseTimer <= 470) {
      ball.carrier = player1;
    }
    if (ball.carrier === lilTunnelPete) {
      moveToward(
        lilTunnelPete,
        player1.x - dir * 2,
        player1.y,
        lilTunnelPete.speed, dt
      );
    } else {
      moveToward(
        lilTunnelPete,
        (player1.x + player2.x) * 0.5 - dir * 8,
        (player1.y + player2.y) * 0.5,
        lilTunnelPete.speed, dt
      );
    }
    moveToward(
      allyDonkey,
      allyHorse.x - dir * 10,
      allyHorse.y + 8,
      allyDonkey.speed, dt
    );
    clampPlayerToField(player2);
    clampPlayerToField(player1);
    clampPlayerToField(allyHorse);
    clampPlayerToField(lilTunnelPete);
    clampPlayerToField(allyDonkey);
    if (!game.puntKickReleased && game.puntPhaseTimer <= 220 && rusherGap <= player1.radius * 1.5) {
      game.puntPhaseTimer = 0;
    }

    if (!game.puntKickReleased && game.puntPhaseTimer <= 0) {
      game.puntKickReleased = true;
      if (distance(player1.x, player1.y, player2.x, player2.y) <= player1.radius * 1.5) {
        game.puntBlocked = true;
        game.puntDistanceYards = 20;
      }
      const yds = game.puntDistanceYards;
      game.puntLandingX = clampPlayableX(lineX + dir * yds * YARDS_TO_PIXELS, ball.radius);
      game.puntPhase = "flight";
      game.puntFlightT = 0;
      ball.carrier = null;
      ball.inFlight = true;
      ball.x = player1.x;
      ball.y = player1.y - 28;
    }
    updateBallPosition();
    return;
  }

  if (game.puntPhase === "flight") {
    game.puntFlightT += dt * 1.05;
    const t = Math.min(1, game.puntFlightT);
    const sx = player1.x;
    const ex = game.puntLandingX;
    ball.x = sx + (ex - sx) * t;
    ball.y = player1.y - 22 - Math.sin(t * Math.PI) * 95;
    moveToward(allyHorse, game.puntLandingX, midY, allyHorse.speed, dt);
    moveToward(allyDonkey, allyHorse.x - dir * 10, allyHorse.y + 8, allyDonkey.speed, dt);
    clampPlayerToField(allyHorse);
    clampPlayerToField(allyDonkey);
    if (t >= 1) {
      ball.inFlight = false;
      ball.carrier = null;
      ball.x = game.puntLandingX;
      ball.y = midY - cluckNorris.radius - 8;
      game.puntPhase = "fielding";
    }
    return;
  }

  if (game.puntPhase === "fielding") {
    moveToward(cluckNorris, ball.x, ball.y + cluckNorris.radius + 8, cluckNorris.speed, dt);
    moveToward(allyHorse, cluckNorris.x, cluckNorris.y, allyHorse.speed, dt);
    moveToward(lilTunnelPete, cluckNorris.x, cluckNorris.y, lilTunnelPete.speed, dt);
    moveToward(player1, allyHorse.x - dir * 30, allyHorse.y + 10, player1.speed, dt);
    moveToward(allyDonkey, allyHorse.x - dir * 9, allyHorse.y + 8, allyDonkey.speed, dt);
    clampPlayerToField(cluckNorris);
    clampPlayerToField(allyHorse);
    clampPlayerToField(lilTunnelPete);
    clampPlayerToField(player1);
    clampPlayerToField(allyDonkey);
    if (distance(cluckNorris.x, cluckNorris.y, ball.x, ball.y + cluckNorris.radius + 8) <= cluckNorris.radius * 0.92) {
      ball.carrier = cluckNorris;
      game.puntPhase = "return";
      game.puntReturnMs = 0;
      game.puntReturnStartX = cluckNorris.x;
      game.puntPunterAssist = false;
      updateBallPosition();
    }
    return;
  }

  if (game.puntPhase === "return") {
    game.puntReturnMs += dt * 1000;
    const goalX = dir > 0 ? FIELD.x + FIELD.endZoneWidth + 18 : FIELD.x + FIELD.width - FIELD.endZoneWidth - 18;
    moveToward(cluckNorris, goalX, midY, cluckNorris.speed, dt);
    moveToward(allyHorse, cluckNorris.x, cluckNorris.y, allyHorse.speed, dt);
    moveToward(lilTunnelPete, cluckNorris.x, cluckNorris.y, lilTunnelPete.speed, dt);
    const returnGainPx = Math.abs(cluckNorris.x - game.puntReturnStartX);
    if (!game.puntPunterAssist && (game.puntReturnMs >= 1700 || returnGainPx >= 7 * YARDS_TO_PIXELS)) {
      game.puntPunterAssist = true;
    }
    if (game.puntPunterAssist) {
      moveToward(player1, cluckNorris.x, cluckNorris.y, player1.speed, dt);
    } else {
      moveToward(player1, allyHorse.x - dir * 28, allyHorse.y + 8, player1.speed, dt);
    }
    moveToward(allyDonkey, allyHorse.x - dir * 9, allyHorse.y + 8, allyDonkey.speed, dt);
    clampPlayerToField(cluckNorris);
    clampPlayerToField(allyHorse);
    clampPlayerToField(lilTunnelPete);
    clampPlayerToField(player1);
    clampPlayerToField(allyDonkey);
    updateBallPosition();

    if (circleTackle(cluckNorris, lilTunnelPete) || circleTackle(cluckNorris, allyHorse) || circleTackle(cluckNorris, player1)) {
      finishPuntPlay(cluckNorris.x);
      return;
    }
    if (dir > 0 && cluckNorris.x <= FIELD.x + FIELD.endZoneWidth) {
      finishPuntPlay(FIELD.x + FIELD.endZoneWidth + 12);
      return;
    }
    if (dir < 0 && cluckNorris.x >= FIELD.x + FIELD.width - FIELD.endZoneWidth) {
      finishPuntPlay(FIELD.x + FIELD.width - FIELD.endZoneWidth - 12);
      return;
    }
    return;
  }
}

function beginFourthDownPunt() {
  game.fourthDownPickedGoForIt = true;
  beginPuntAim();
}

function beginFourthDownGoForIt() {
  game.fourthDownPickedGoForIt = true;
  game.fourthDownGoForIt = true;
}

function beginPatKick() {
  game.state = "patKick";
  game.patKickPointValue = 1;
  game.patKickDistanceYards = 20;
  game.patKickCpuAuto = false;
  game.patKickCpuTarget = 0.5;
  game.patKickCpuAimDelayMs = 0;
  game.patKickFromFourthDown = false;
  game.patKickFourthDownSpotX = 0;
  game.patKickSubPhase = "aim";
  game.patKickCursor = 0;
  game.patKickDirection = 1;
  game.patKickSpeed = 0.95;
  game.patKickResultPhase = null;
  game.patKickResultTimer = 0;
  game.patKickPhaseTimer = 0;
  game.patKickFlightT = 0;
  game.patKickPendingMade = false;
  game.patKickBallEndN = 0.5;
}

function beginTwoPointFieldGoal() {
  beginPatKick();
  game.patKickPointValue = 2;
  game.patKickDistanceYards = 20;
}

function beginCpuPostTouchdownKickAttempt() {
  const goForTwoKick = Math.random() < 0.35;
  if (goForTwoKick) beginTwoPointFieldGoal();
  else beginPatKick();
  game.patKickCpuAuto = true;
  if (goForTwoKick) {
    game.patKickCpuTarget = randomCpuPatKickTarget();
  } else {
    game.patKickCpuTarget = randomCpuPatKickTarget();
  }
  game.patKickCpuAimDelayMs = 320 + Math.random() * 480;
}

const MAX_FIELD_GOAL_YARDS = 70;

function getFourthDownFieldGoalDistanceYards(lineX = game.playModeLineX) {
  const goalX = getOffenseTouchdownEdgeX();
  const toGoal = Math.max(1, Math.abs(goalX - lineX) / YARDS_TO_PIXELS);
  return Math.round(toGoal + 17);
}

function beginFourthDownFieldGoal(cpuAuto = false) {
  if (getFourthDownFieldGoalDistanceYards() > MAX_FIELD_GOAL_YARDS) return;
  beginPatKick();
  game.patKickPointValue = 3;
  game.patKickDistanceYards = getFourthDownFieldGoalDistanceYards();
  game.patKickFromFourthDown = true;
  game.patKickFourthDownSpotX = game.playModeLineX;
  game.fourthDownPickedGoForIt = true;
  registerPatKickScorer(game.cpuOffense ? player2 : player1);
  if (!cpuAuto) return;
  game.patKickCpuAuto = true;
  const dist01 = Math.max(0, Math.min(1, (game.patKickDistanceYards - 20) / 35));
  game.patKickCpuTarget = randomCpuPatKickTarget();
  game.patKickCpuAimDelayMs = 260 + Math.random() * 420;
}

function updatePatKick(dt) {
  if (game.patKickSubPhase === "result") {
    game.patKickResultTimer -= dt * 1000;
    if (game.patKickResultTimer <= 0) {
      completePatKickAndResume();
    }
    return;
  }
  if (game.patKickSubPhase === "snap") {
    game.patKickPhaseTimer -= dt * 1000;
    if (game.patKickPhaseTimer <= 0) {
      game.patKickSubPhase = "flight";
      game.patKickFlightT = 0;
    }
    return;
  }
  if (game.patKickSubPhase === "flight") {
    game.patKickFlightT += dt * 1.28;
    if (game.patKickFlightT >= 1) {
      game.patKickFlightT = 1;
      game.patKickSubPhase = "result";
      game.patKickResultPhase = game.patKickPendingMade ? "good" : "miss";
      game.patKickResultTimer = 2000;
    }
    return;
  }
  // aim
  game.patKickCursor += game.patKickDirection * game.patKickSpeed * dt;
  if (game.patKickCursor >= 1) {
    game.patKickCursor = 1;
    game.patKickDirection = -1;
  } else if (game.patKickCursor <= 0) {
    game.patKickCursor = 0;
    game.patKickDirection = 1;
  }
  if (!game.patKickCpuAuto) return;
  if (game.patKickCpuAimDelayMs > 0) {
    game.patKickCpuAimDelayMs -= dt * 1000;
    return;
  }
  const snapWindow = Math.max(0.012, game.patKickSpeed * dt * 1.3);
  if (Math.abs(game.patKickCursor - game.patKickCpuTarget) <= snapWindow) {
    commitPatKick();
  }
}

function commitPatKick() {
  if (game.state !== "patKick" || game.patKickSubPhase !== "aim") return;
  const zone = getPatKickZone(game.patKickCursor);
  let made = false;
  if (zone === "green") made = true;
  else if (zone === "yellow") made = Math.random() < 0.5;
  else made = false;

  if (made) {
    const kickPoints = game.patKickPointValue || 1;
    if (game.patKickScorerTeamTag && shouldTrackTeamPointScore()) {
      addTeamScorePoints(game.patKickScorerTeamTag, kickPoints);
      maybeFinishSuddenDeathOvertime();
    } else if (game.patKickScorerIsPlayer1) {
      player1.score += kickPoints;
    } else {
      player2.score += kickPoints;
    }
  }

  game.patKickPendingMade = made;
  if (made) {
    game.patKickBallEndN = 0.5 + (Math.random() - 0.5) * 0.07;
  } else {
    const dir = Math.random() < 0.5 ? -1 : 1;
    game.patKickBallEndN = 0.5 + dir * (0.2 + Math.random() * 0.32);
  }

  game.patKickSubPhase = "snap";
  game.patKickPhaseTimer = 520;
  game.patKickResultPhase = null;
}

function completePatKickAndResume() {
  game.patKickResultPhase = null;
  game.patKickResultTimer = 0;
  game.patKickSubPhase = "aim";
  if (game.patKickFromFourthDown) {
    const spot = clampPlayableX(game.patKickFourthDownSpotX || game.playModeLineX, player1.radius);
    game.patKickFromFourthDown = false;
    game.patKickFourthDownSpotX = 0;
    game.fourthDownGoForIt = false;
    game.fourthDownPickedGoForIt = false;
    startDriveAtSpot(spot, !game.cpuOffense, "fieldGoalResult");
    return;
  }
  if (game.afterTouchdownAction === "startPlayModeDrive") {
    resumeAfterPostTouchdownScore();
  }
}

function finishDriveTouchdownCommit(scorer) {
  if (game.twoPointAttemptActive) {
    finishTwoPointConversionGood(scorer);
    return;
  }

  if (game.playUserTeamId && scorer.teamTag && TEAMS[scorer.teamTag]) {
    game.lastTouchdownTeamName = TEAMS[scorer.teamTag].name;
  } else {
    game.lastTouchdownTeamName = getScoringTeamForPlayer(scorer) === player1 ? "Barnaby" : "Professor Pig";
  }

  recordTouchdownStats(scorer, game.playModeCurrentPlay);

  if (game.playSessionKind === "defense" && game.cpuOffense) {
    playTouchdownAudio(scorer);
    game.state = "touchdownPopup";
    game.touchdownPopupTimer = 2200;
    game.afterTouchdownAction = "restartDefense";
      return;
    }

  if (game.playUserTeamId && scorer.teamTag) {
    addTeamScorePoints(scorer.teamTag, 6);
    if (maybeFinishSuddenDeathOvertime()) return;
    playTouchdownAudio(scorer);
    registerPatKickScorer(scorer);
    game.state = "touchdownPopup";
    game.touchdownPopupTimer = 4000;
    game.afterTouchdownAction = "startPlayModeDrive";
    return;
  }

  const scoringTeam = getScoringTeamForPlayer(scorer);
  scoringTeam.score += 6;
    playTouchdownAudio(scorer);
  registerPatKickScorer(scorer);
  game.state = "touchdownPopup";
  game.touchdownPopupTimer = 4000;
  game.afterTouchdownAction = "startPlayModeDrive";
}

function finishDriveTouchdown(scorer) {
  replayFinalizePlayBuffer();
  finishDriveTouchdownCommit(scorer);
}

function getCpuYardsToGoal() {
  if (game.playModeLineX == null) return 50;
  return Math.abs(getOffenseTouchdownEdgeX() - game.playModeLineX) / YARDS_TO_PIXELS;
}

function chooseCpuFourthDownAction() {
  const fgYards = getFourthDownFieldGoalDistanceYards();
  const yardsToGo = game.playModeYardsToGo ?? FIRST_DOWN_YARDS;
  const distToGoal = getCpuYardsToGoal();

  if (distToGoal <= 6 || yardsToGo <= 2) return "goForIt";
  if (distToGoal <= 18 && yardsToGo <= 4) {
    return Math.random() < 0.74 ? "goForIt" : "fieldGoal";
  }

  if (fgYards <= MAX_FIELD_GOAL_YARDS) {
    const fgBoost = distToGoal <= 32 ? 0.24 : distToGoal <= 42 ? 0.14 : 0.06;
    const fgChance = Math.min(0.92, getCpuFourthDownFieldGoalChance() + fgBoost);
    if (Math.random() < fgChance) return "fieldGoal";
    if (yardsToGo <= 5 && distToGoal <= 42 && Math.random() < 0.58) return "goForIt";
  }

  if (distToGoal >= 62) return "punt";
  if (yardsToGo <= 3 && distToGoal <= 32) return "goForIt";
  if (yardsToGo <= 7 && distToGoal <= 50 && Math.random() < 0.38) return "goForIt";
  return "punt";
}

function chooseDefenseModeCpuPlay() {
  if (game.defenseModeSelectedOffensePlay && game.defenseModeSelectedOffensePlay !== "random") {
    return resolvePlayKeyForSelectedSide(game.defenseModeSelectedOffensePlay);
  }
  const cpuEligiblePlays = PLAY_ORDER_ALL.filter((k) => PLAY_DEFINITIONS[k] && PLAY_DEFINITIONS[k].cpuEligible);
  const runPlays = cpuEligiblePlays.filter((k) => PLAY_DEFINITIONS[k].category === "run")
    .map((k) => resolvePlayKeyForSelectedSide(k));
  const passPlays = cpuEligiblePlays.filter((k) => PLAY_DEFINITIONS[k].category === "pass")
    .map((k) => resolvePlayKeyForSelectedSide(k));
  const yardsToGoal = getCpuYardsToGoal();
  let passWeight = 0.54;
  if (yardsToGoal <= 18) passWeight = 0.36;
  else if (yardsToGoal >= 42) passWeight = 0.66;
  if (game.playModeDown >= 3) passWeight = Math.min(0.74, passWeight + 0.14);
  const playPool = Math.random() < passWeight ? passPlays : runPlays;
  return playPool[Math.floor(Math.random() * playPool.length)];
}

function getCpuPassReceiverByKey(key) {
  if (key === "horse") return allyHorse;
  if (key === "pete") return lilTunnelPete;
  if (key === "p4") return offenseP4;
  return allyHorse;
}

function getCpuReceiverSeparationYards(receiver) {
  let best = Infinity;
  for (const defender of getDefenseTeamMembers()) {
    const dist = distance(defender.x, defender.y, receiver.x, receiver.y);
    if (dist < best) best = dist;
  }
  return best / YARDS_TO_PIXELS;
}

function pickCpuPassTargetReceiver(playKey) {
  const tune = getPassPlayTuning(playKey);
  const candidates = ["horse", "pete"];
  if (passPlayHasThirdReceiver(playKey)) candidates.push("p4");
  let bestKey = tune.primaryRead || "horse";
  let bestScore = -Infinity;
  for (const key of candidates) {
    const receiver = getCpuPassReceiverByKey(key);
    const sepYards = getCpuReceiverSeparationYards(receiver);
    const schemeWeight = key === tune.primaryRead ? 1.2 : key === "p4" ? 1.05 : 1;
    const downfield =
      getOffenseDirection() * (receiver.x - game.playModeLineX) / YARDS_TO_PIXELS;
    const score = sepYards * schemeWeight + downfield * 0.06;
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  return bestKey;
}

function getCpuPassCompletionChance(playKey, targetKey) {
  const tune = getPassPlayTuning(playKey);
  const receiver = getCpuPassReceiverByKey(targetKey);
  const sepBonus = clamp((getCpuReceiverSeparationYards(receiver) - 1.5) * 0.05, 0, 0.24);
  const rusher = getDefenderById(game.passDefRushing) || player2;
  const pressureYards = distance(player1.x, player1.y, rusher.x, rusher.y) / YARDS_TO_PIXELS;
  const pressurePenalty = pressureYards < 4.5 ? (4.5 - pressureYards) * 0.05 : 0;
  const clutchBonus =
    typeof getDevTraitPassCompletionBonus === "function"
      ? getDevTraitPassCompletionBonus(player1)
      : 0;
  return clamp(tune.completionChance + sepBonus - pressurePenalty + clutchBonus, 0.38, 0.94);
}

function cycleDefenseModeOffensePlay() {
  const order = ["random"].concat(PLAY_ORDER_ALL.filter((k) => PLAY_DEFINITIONS[k] && PLAY_DEFINITIONS[k].cpuEligible));
  const idx = order.indexOf(game.defenseModeSelectedOffensePlay);
  game.defenseModeSelectedOffensePlay = order[(idx + 1 + order.length) % order.length];
}

function prepareDefenseModeCpuPass(playKey) {
  if (!game.cpuOffense) return;
  const tune = getPassPlayTuning(playKey);
  game.defenseModeCpuPlay = playKey;
  game.defenseModeCpuThrowTimer = tune.throwMinMs + Math.random() * tune.throwJitterMs;
  game.passPlayTargetReceiver = pickCpuPassTargetReceiver(playKey);
}

function maybeRunDefenseModeCpuPass(playKey, dt) {
  if (!game.cpuOffense || !canThrowOnCurrentPassPlay()) {
    return false;
  }

  const targetKey = game.passPlayTargetReceiver || pickCpuPassTargetReceiver(playKey);
  const receiver = getCpuPassReceiverByKey(targetKey);
  const sepYards = getCpuReceiverSeparationYards(receiver);
  if (sepYards >= 5 && game.defenseModeCpuThrowTimer > 200) {
    game.defenseModeCpuThrowTimer = 200;
  } else if (sepYards >= 3.5 && game.defenseModeCpuThrowTimer > 320) {
    game.defenseModeCpuThrowTimer = 320;
  }

  game.defenseModeCpuThrowTimer -= dt * 1000;
  if (game.defenseModeCpuThrowTimer > 0) {
    return false;
  }

  const tune = getPassPlayTuning(playKey);
  const shouldComplete = Math.random() < getCpuPassCompletionChance(playKey, targetKey);
  const dir = getOffenseDirection();
  let tx = receiver.x;
  let ty = receiver.y;

  const targetOffset = tune.targetOffset[targetKey] || { x: 24, y: 0 };
  tx += dir * targetOffset.x;
  ty += targetOffset.y;

  if (shouldComplete) {
    const leadYards = 2.8 + (receiver.speed / Math.max(1, CONFIG.playerSpeed)) * 1.8;
    tx += dir * leadYards * YARDS_TO_PIXELS;
  } else {
    const missY = receiver.y < FIELD.y + FIELD.height / 2 ? -1 : 1;
    tx += dir * 11 * YARDS_TO_PIXELS;
    ty += missY * 11 * YARDS_TO_PIXELS;
  }

  tx = clamp(tx, FIELD.x + ball.radius, FIELD.x + FIELD.width - ball.radius);
  ty = clamp(ty, FIELD.y + ball.radius, FIELD.y + FIELD.height - ball.radius);
  startPlayModePassThrow(tx, ty, targetKey);
  return true;
}

function positionForPlayModeAt(x) {
  applyOffensiveFormation("genericThreeOL", x, { snapFrom: "lilTunnelPete" });
  previewDefensePositions();
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
}

function initDriveState(startX, cpuOffense, reason = "regular") {
  game.twoPointAttemptActive = false;
  game.fourthDownGoForIt = false;
  game.fourthDownPickedGoForIt = false;
  game.kickoffActive = false;
  game.kickoffReceivingCpuOffense = false;
  game.turnoverSeriesActive = reason === "turnover";
  game.cpuOffense = !!cpuOffense;
  if (playSessionUsesGameClock() && !game.clockInitialized) {
    initGameClock();
  }
  if (game.playUserTeamId && game.playCpuTeamId) {
    applyPlayModeTeamLayout(cpuOffense ? game.playCpuTeamId : game.playUserTeamId, cpuOffense ? game.playUserTeamId : game.playCpuTeamId);
    applyDifficultyTeamSpeeds(cpuOffense);
  } else if (reason === "turnover") {
    applyTurnoverFieldRoles();
  } else {
    applyDefaultFieldRoles();
  }
  game.mode = "play";
  game.state = "playModePlaySelect";
  game.interceptionPopupTimer = 0;
  game.fumblePopupTimer = 0;
  game.playModeBallLooseFromFumble = false;
  game.playModeFumbleRecoveryTackled = false;
  game.playModePendingFumbleTurnover = false;
  resetPlayModeChain(startX, 1);
  if (typeof resetDevTraitDriveState === "function") resetDevTraitDriveState();
  game.playModePhase = null;
  game.playModeCurrentPlay = null;
  game.passJamWindowMs = 0;
  game.playModeTackle = false;
  game.playModeIncomplete = false;
  game.passPlayTargetReceiver = null;
  game.defenseModeCpuPlay = null;
  game.playModePlayFilter = null;
  game.playModePlaySelectPage = 0;
  if (cpuOffense) {
    game.defenseModeControlledPlayerId = "player2";
    game.defenseModeSelectedOffensePlay = "random";
    game.defenseModeDefenseFilter = null;
  }
  positionForPlayModeAt(startX);
  maybeCheckClockAfterStoppage();
}

function startDriveAtSpot(spotX, nextCpuOffense, reason = "regular") {
  if (reason !== "kickoffReturn" && handlePlaySessionSeriesEnd()) {
    return;
  }
  const run = () => {
  const startX = spotX !== undefined ? clampPlayableX(spotX, player1.radius) : getLeftTwentyYardLineX();
  initDriveState(startX, !!nextCpuOffense, reason);
  };
  if (shouldOfferDriveSummaryForReason(reason)) {
    queueDriveSummary(run);
    return;
  }
  run();
}

function startPlayModeDrive(fromX) {
  startDriveAtSpot(fromX, false, "regular");
}

/** CPU offense / player defense — former standalone "Defense mode", now under Play. */
function startPlayModeDriveCpuOffense(fromX) {
  startDriveAtSpot(fromX, true, "regular");
}

function setPlayModePlayFilter(filter) {
  game.playModePlayFilter = filter;
  game.playModePlaySelectPage = 0;
  if (game.state === "playModePlaySelect" && !game.cpuOffense) {
    previewDefensePositions();
  }
}

function advancePlayModeDown(newLineX) {
  if (game.twoPointAttemptActive) {
    game.twoPointAttemptActive = false;
    game.playModePendingFumbleTurnover = false;
    game.playModeTackle = false;
    completeTwoPointConversionFailed();
    return;
  }

  if (game.playModePendingFumbleTurnover) {
    game.playModePendingFumbleTurnover = false;
    game.playModeFumbleRecoveryTackled = false;
    const nextCpuOff = game.playModeFumbleTurnoverNextCpuOffense;
    game.playModeTackle = false;
    startDriveAtSpot(newLineX, nextCpuOff, "fumbleTurnover");
    return;
  }

  game.playModeFumbleRecoveryTackled = false;

  if (game.cpuOffense) {
    if (game.playModeTackle && isOffenseInOwnEndZone(newLineX)) {
      game.safetyAgainstCpuOffense = true;
      game.state = "safetyPopup";
      game.safetyPopupTimer = 3500;
      game.playModeTackle = false;
      return;
    }
    game.playModeTackle = false;
    const chainResult = resolveDownAndDistanceAfterPlay(newLineX);
    if (chainResult === "turnover") {
      if (handlePlaySessionSeriesEnd()) return;
      startDriveAtSpot(game.playModeLineX, false, "turnoverOnDowns");
      return;
    }
    game.playModePhase = null;
    game.playModeCurrentPlay = null;
    game.passPlayTargetReceiver = null;
    game.defenseModeCpuPlay = null;
    positionForPlayModeAt(game.playModeLineX);
    game.state = "playModePlaySelect";
    maybeCheckClockAfterStoppage();
    return;
  }

  // Tackled by the CPU inside the pig's end zone = Safety
  if (game.playModeTackle && isOffenseInOwnEndZone(newLineX)) {
    game.safetyAgainstCpuOffense = false;
    game.state = "safetyPopup";
    game.safetyPopupTimer = 3500;
    game.playModeTackle = false;
    return;
  }
  game.playModeTackle = false;
  const chainResult = resolveDownAndDistanceAfterPlay(newLineX);
  if (chainResult === "turnover") {
    game.fourthDownGoForIt = false;
    game.fourthDownPickedGoForIt = false;
    if (handlePlaySessionSeriesEnd()) return;
    startDriveAtSpot(game.playModeLineX, true, "turnoverOnDowns");
    return;
  }
  game.playModePhase = null;
  game.playModeCurrentPlay = null;
  positionForPlayModeAt(game.playModeLineX);
  game.playModePlaySelectPage = 0;
  game.state = "playModePlaySelect";
  maybeCheckClockAfterStoppage();
}

function positionForSweepRight() {
  const lineX = game.playModeLineX;
  applyFormationForPlay("sweepRight", lineX);
  game.playModePhase = "snap";
  game.playModeSweepSnapMs = 0;
  if (game.cpuOffense) {
  positionDefenseForSweepPlay();
  } else {
    positionDefenseForPlay(allyHorse.y);
  }
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
}

function startSweepRightPlay() {
  game.playModeCurrentPlay = "sweepRight";
  game.playModeSweepHandoffT = 0;
  game.playModeSweepArcCY = FIELD.y + FIELD.height / 2;
  game.playModeSweepWrBlockMs = 0;
  game.sweepWrEngageP4Ms = 0;
  game.sweepWrEngageCluckMs = 0;
  game.peteBlockTimer = 0;
  game.peteBlockTargetId = null;
  game.state = "playing";
  positionForSweepRight();
}

function positionForSweepLeft() {
  const lineX = game.playModeLineX;
  applyFormationForPlay("sweepLeft", lineX);
  game.playModePhase = "snap";
  game.playModeSweepSnapMs = 0;
  if (game.cpuOffense) {
  positionDefenseForSweepPlay();
  } else {
    positionDefenseForPlay(allyHorse.y);
  }
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
}

function startSweepLeftPlay() {
  game.playModeCurrentPlay = "sweepLeft";
  game.playModeSweepHandoffT = 0;
  game.playModeSweepArcCY = FIELD.y + FIELD.height / 2;
  game.playModeSweepWrBlockMs = 0;
  game.sweepWrEngageP4Ms = 0;
  game.sweepWrEngageCluckMs = 0;
  game.peteBlockTimer = 0;
  game.peteBlockTargetId = null;
  game.state = "playing";
  positionForSweepLeft();
}

function positionForPassRight() {
  const lineX = game.playModeLineX;
  const qbX = getOffsetX(lineX, -10);
  applyFormationForPlay("passRight", lineX);
  game.playModePassSnapMs = 220;
  positionDefenseForPlay(allyHorse.y);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.passPlayDropbackDone   = true;
  game.passPlayCanThrow       = true;
  game.passPlayTargetReceiver = null;
  game.passPlayDropbackTarget = qbX;
  game.qbPocketY              = player1.y;
  game.rushReactionTimer      = 0;
  game.passJamWindowMs        = game.cpuOffense && game.defensePressJam ? 950 : 0;
  game.tripsSlotCurlState     = null;
  setMobileAimForwardFromQB();
}

function moveTripsOutsideSevenPost(dt, adjustTarget = null, toTop = false) {
  const playKey = toTop ? "passLeft" : "passRight";
  const geo =
    typeof getTripsSevenPostGeometry === "function"
      ? getTripsSevenPostGeometry(playKey)
      : null;
  const stemX = geo?.stemX ?? clampPlayableX(getOffsetX(game.playModeLineX, 9), 18);
  const cornerX = geo?.cornerX ?? clampPlayableX(getOffsetX(game.playModeLineX, 22), 10);
  const cornerY =
    geo?.cornerY ??
    (toTop ? FIELD.y + allyHorse.radius + 8 : FIELD.y + FIELD.height - allyHorse.radius - 8);
  const postX = geo?.postX ?? clampPlayableX(getOffsetX(game.playModeLineX, 42), 10);
  const postY = geo?.postY ?? FIELD.y + FIELD.height * (toTop ? 0.58 : 0.42);

  if (adjustTarget === "horse") {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
  } else if (hasNotReachedForwardX(allyHorse.x, stemX)) {
    moveToward(allyHorse, stemX, allyHorse.y, allyHorse.speed, dt);
  } else if (hasNotReachedForwardX(allyHorse.x, cornerX)) {
    moveToward(allyHorse, cornerX, cornerY, allyHorse.speed, dt);
  } else {
    runReceiverToLandmarkOrContinue(allyHorse, postX, postY, allyHorse.speed, dt);
  }
  clampPlayerToField(allyHorse);
}

function startPassRightPlay() {
  game.playModeCurrentPlay = "passRight";
  game.playModePhase = "snap";
  game.state = "playing";
  positionForPassRight();
  prepareDefenseModeCpuPass("passRight");
}

function positionForPassLeft() {
  const lineX = game.playModeLineX;
  const qbX = getOffsetX(lineX, -10);
  applyFormationForPlay("passLeft", lineX);
  game.playModePassSnapMs = 220;
  positionDefenseForPlay(allyHorse.y);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.passPlayDropbackDone   = true;
  game.passPlayCanThrow       = true;
  game.passPlayTargetReceiver = null;
  game.passPlayDropbackTarget = qbX;
  game.qbPocketY              = player1.y;
  game.rushReactionTimer      = 0;
  game.passJamWindowMs        = game.cpuOffense && game.defensePressJam ? 950 : 0;
  game.tripsSlotCurlState     = null;
  setMobileAimForwardFromQB();
}

function moveTripsSlotCurlRoute(dt, adjustTarget = null) {
  if (adjustTarget === "pete") {
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
    clampPlayerToField(lilTunnelPete);
    return;
  }
  if (typeof getTripsSlotCurlGeometry !== "function" || typeof moveReceiverCurlRoute !== "function") {
    moveOffenseX(lilTunnelPete, dt);
    clampPlayerToField(lilTunnelPete);
    return;
  }
  if (!game.tripsSlotCurlState) {
    game.tripsSlotCurlState = { phase: "stem" };
  }
  const tripsRouteKey =
    game.playModeCurrentPlay === "fencePost" ? "passRight" : game.playModeCurrentPlay;
  moveReceiverCurlRoute(
    lilTunnelPete,
    getTripsSlotCurlGeometry(tripsRouteKey),
    lilTunnelPete.speed,
    dt,
    game.tripsSlotCurlState
  );
  clampPlayerToField(lilTunnelPete);
}

function startPassLeftPlay() {
  game.playModeCurrentPlay = "passLeft";
  game.playModePhase = "snap";
  game.state = "playing";
  positionForPassLeft();
  prepareDefenseModeCpuPass("passLeft");
}

function positionForBarnPlay() {
  const lineX = game.playModeLineX;
  applyFormationForPlay("barnPlay", lineX);
  positionDefenseForPlay(lilTunnelPete.y);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.passPlayDropbackDone   = false;
  game.passPlayCanThrow       = true;
  game.passPlayTargetReceiver = null;
  game.passPlayDropbackTarget = getPassDropbackTarget(lineX);
  game.playModePassSnapMs     = 220;
  game.rushReactionTimer      = 0;
  game.passJamWindowMs        = game.cpuOffense && game.defensePressJam ? 950 : 0;
  setMobileAimForwardFromQB();
}

function startBarnPlay() {
  game.playModeCurrentPlay = "barnPlay";
  game.playModePhase = null;
  game.state = "playing";
  positionForBarnPlay();
  prepareDefenseModeCpuPass("barnPlay");
}

function positionForScrambledEggs() {
  const lineX = game.playModeLineX;
  applyFormationForPlay("scrambledEggs", lineX);
  positionDefenseForPlay(lilTunnelPete.y);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.passPlayDropbackDone   = false;
  game.passPlayCanThrow       = true;
  game.passPlayTargetReceiver = null;
  game.passPlayDropbackTarget = getPassDropbackTarget(lineX);
  game.playModePassSnapMs     = 220;
  game.rushReactionTimer      = 0;
  game.passJamWindowMs        = game.cpuOffense && game.defensePressJam ? 950 : 0;
  game.scrambledEggsHorseComebackState = null;
  game.scrambledEggsPeteCornerState = null;
  game.scrambledEggsP4FadeState = null;
  setMobileAimForwardFromQB();
}

function startScrambledEggsPlay() {
  game.playModeCurrentPlay = "scrambledEggs";
  game.playModePhase = null;
  game.state = "playing";
  positionForScrambledEggs();
  prepareDefenseModeCpuPass("scrambledEggs");
}

function startBarnDoorBootPlay() {
  game.playModeCurrentPlay = "barnDoorBoot";
  game.playModePhase = null;
  game.state = "playing";
  game.barnDoorBootStage = 0;
  game.barnDoorBootArcT = 0;
  game.barnDoorBootLateralFlip = 1;
  positionForBarnDoorBoot();
  prepareDefenseModeCpuPass("passLeft");
}

function positionForHayBaleHook() {
  const lineX = game.playModeLineX;
  applyFormationForPlay("hayBaleHook", lineX);
  positionDefenseForPlay(lilTunnelPete.y);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.passPlayDropbackDone   = false;
  game.passPlayCanThrow       = true;
  game.passPlayTargetReceiver = null;
  game.passPlayDropbackTarget = getPassDropbackTarget(lineX);
  game.playModePassSnapMs     = 220;
  game.rushReactionTimer      = 0;
  game.passJamWindowMs        = game.cpuOffense && game.defensePressJam ? 950 : 0;
  game.hayBaleHookHorseState  = null;
  game.hayBaleHookPeteState   = null;
  setMobileAimForwardFromQB();
}

function startHayBaleHookPlay() {
  game.playModeCurrentPlay = "hayBaleHook";
  game.playModePhase = null;
  game.state = "playing";
  positionForHayBaleHook();
  prepareDefenseModeCpuPass("hayBaleHook");
}

function startCornfieldCrossPlay() {
  game.playModeCurrentPlay = "cornfieldCross";
  game.playModePhase = null;
  game.state = "playing";
  positionForCornfieldCross();
  prepareDefenseModeCpuPass("barnPlay");
}

function positionForSiloSlant() {
  const lineX = game.playModeLineX;
  applyFormationForPlay("siloSlant", lineX);
  positionDefenseForPlay(lilTunnelPete.y);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.passPlayDropbackDone = false;
  game.passPlayCanThrow = true;
  game.passPlayTargetReceiver = null;
  game.passPlayDropbackTarget = getPassDropbackTarget(lineX);
  game.playModePassSnapMs = 220;
  game.rushReactionTimer = 0;
  game.passJamWindowMs = game.cpuOffense && game.defensePressJam ? 950 : 0;
  game.siloSlantHorseState = null;
  game.siloSlantPeteState = null;
  setMobileAimForwardFromQB();
}

function startSiloSlantPlay() {
  game.playModeCurrentPlay = "siloSlant";
  game.playModePhase = null;
  game.state = "playing";
  positionForSiloSlant();
  prepareDefenseModeCpuPass("siloSlant");
}

function positionForPasturePop() {
  const lineX = game.playModeLineX;
  applyFormationForPlay("pasturePop", lineX);
  positionDefenseForPlay(lilTunnelPete.y);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.passPlayDropbackDone = false;
  game.passPlayCanThrow = true;
  game.passPlayTargetReceiver = null;
  game.passPlayDropbackTarget = getPassDropbackTarget(lineX);
  game.playModePassSnapMs = 220;
  game.rushReactionTimer = 0;
  game.passJamWindowMs = game.cpuOffense && game.defensePressJam ? 950 : 0;
  game.pasturePopPeteState = null;
  setMobileAimForwardFromQB();
}

function startPasturePopPlay() {
  game.playModeCurrentPlay = "pasturePop";
  game.playModePhase = null;
  game.state = "playing";
  positionForPasturePop();
  prepareDefenseModeCpuPass("pasturePop");
}

function positionForFencePost() {
  const lineX = game.playModeLineX;
  const qbX = getOffsetX(lineX, -10);
  applyFormationForPlay("fencePost", lineX);
  game.playModePassSnapMs = 220;
  positionDefenseForPlay(allyHorse.y);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.passPlayDropbackDone = true;
  game.passPlayCanThrow = true;
  game.passPlayTargetReceiver = null;
  game.passPlayDropbackTarget = qbX;
  game.qbPocketY = player1.y;
  game.rushReactionTimer = 0;
  game.passJamWindowMs = game.cpuOffense && game.defensePressJam ? 950 : 0;
  game.tripsSlotCurlState = null;
  setMobileAimForwardFromQB();
}

function startFencePostPlay() {
  game.playModeCurrentPlay = "fencePost";
  game.playModePhase = "snap";
  game.state = "playing";
  positionForFencePost();
  prepareDefenseModeCpuPass("fencePost");
}

function positionForMudHoleDive() {
  const lineX = game.playModeLineX;
  applyFormationForPlay("mudHoleDive", lineX);
  positionDefenseForPlay();
  defenseP4.y = offenseP5.y;
  defenseP4.x = getOffsetX(offenseP5.x, 20);
  clampPlayerToField(defenseP4);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.peteBlockTimer = 0;
  game.peteBlockTargetId = null;
  game.playModeSweepHandoffT = 0;
  game.stretchCenterBlockMs = 0;
  game.stretchCenterBlockTargetId = null;
  game.stretchFbBlockMs = 0;
  game.stretchFbBlockTargetId = null;
  game.stretchFbBlockArmed = false;
}

function startMudHoleDivePlay() {
  game.playModeCurrentPlay = "mudHoleDive";
  game.playModePhase = "handoff";
  game.state = "playing";
  positionForMudHoleDive();
}

function positionForDiveRight() {
  const lineX = game.playModeLineX;
  applyFormationForPlay("diveRight", lineX);
  positionDefenseForPlay();
  // Stretch: primary CB mirrors the bottom WR; keep the rest of the shell intact.
  defenseP4.y = offenseP5.y;
  defenseP4.x = getOffsetX(offenseP5.x, 20);
  clampPlayerToField(defenseP4);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.peteBlockTimer = 0;
  game.peteBlockTargetId = null;
  game.playModeSweepHandoffT = 0;
  game.stretchCenterBlockMs = 0;
  game.stretchCenterBlockTargetId = null;
  game.stretchFbBlockMs = 0;
  game.stretchFbBlockTargetId = null;
  game.stretchFbBlockArmed = false;
}

function startDiveRightPlay() {
  game.playModeCurrentPlay = "diveRight";
  game.playModePhase = "handoff";
  game.state = "playing";
  positionForDiveRight();
}

// Pete's blocker logic for Dive Right: target the outside defender
// (highest Y = furthest toward the sideline the play runs toward).
function moveDiveRightDefenders(dt) {
  const tx = ball.carrier ? ball.carrier.x : ball.x;
  const ty = ball.carrier ? ball.carrier.y : ball.y;

  // Bottom WR blocks the CB in stretch.
  const blockTarget = defenseP4;

  if (blockTarget.id !== game.peteBlockTargetId) {
    game.peteBlockTargetId = blockTarget.id;
    game.peteBlockTimer = getBlockHoldMsForLineman(offenseP5);
  }
  const wrInContact = circleTouch(offenseP5, blockTarget);
  if (wrInContact && game.peteBlockTimer > 0) {
    game.peteBlockTimer -= dt * 1000;
  }
  const blockActive = wrInContact && game.peteBlockTimer > 0;

  // WR drives to the CB and holds during contact window.
  if (!blockActive) {
    moveToward(offenseP5, defenseP4.x, defenseP4.y, offenseP5.speed, dt);
  }
  clampPlayerToField(offenseP5);

  const pigSpd = player2.speed;
  const hawSpd = allyDonkey.speed;
  const coopSpd = cluckNorris.speed;

  const rusherX = getOffsetX(game.playModeLineX, 7);
  const rusherY = clamp(ty, FIELD.y + player2.radius, FIELD.y + FIELD.height - player2.radius);

  const centerNearDonkey =
    distance(lilTunnelPete.x, lilTunnelPete.y, allyDonkey.x, allyDonkey.y) <=
    lilTunnelPete.radius + allyDonkey.radius + 12;
  const centerHoldingDonkey = game.stretchCenterBlockMs > 0 || centerNearDonkey;
  const fbNearCb =
    distance(allyHorse.x, allyHorse.y, defenseP5.x, defenseP5.y) <=
    allyHorse.radius + defenseP5.radius + 30;
  const fbHoldingCb = game.stretchFbBlockMs > 0 || fbNearCb;

  if (game.playModeDefense === "A" && game.defenseReactionTimer > 0) {
    game.defenseReactionTimer -= dt * 1000;
  } else {
    moveDefensePlayer(player2, rusherX, rusherY, pigSpd, dt);
    if (!centerHoldingDonkey) {
      moveDefensePlayer(allyDonkey, tx, ty, hawSpd, dt);
    }
  }

  if (game.cluckNorrisTimer > 0) {
    game.cluckNorrisTimer -= dt * 1000;
  } else {
    moveDefensePlayer(cluckNorris, tx, ty, coopSpd, dt);
  }
  if (!blockActive) {
    moveDefensePlayer(defenseP4, tx, ty, defenseP4.speed * 0.92, dt);
  }
  if (!fbHoldingCb) {
    moveDefensePlayer(defenseP5, tx, ty, defenseP5.speed * 0.9, dt);
  }
}

function moveDiveRightCenterBlock(dt) {
  const dir = getOffenseDirection();
  const blockTarget = allyDonkey;
  if (blockTarget.id !== game.stretchCenterBlockTargetId) {
    game.stretchCenterBlockTargetId = blockTarget.id;
  }
  const engageDist = lilTunnelPete.radius + blockTarget.radius + 12;
  const closeEnough =
    distance(lilTunnelPete.x, lilTunnelPete.y, blockTarget.x, blockTarget.y) <= engageDist;
  if (closeEnough && game.stretchCenterBlockMs <= 0) {
    game.stretchCenterBlockMs = getBlockHoldMsForLineman(lilTunnelPete);
  }
  if (game.stretchCenterBlockMs > 0) {
    game.stretchCenterBlockMs -= dt * 1000;
  }
  const blockActive = game.stretchCenterBlockMs > 0;
  if (!blockActive) {
    moveToward(lilTunnelPete, blockTarget.x - dir * 8, blockTarget.y, lilTunnelPete.speed * 1.08, dt);
  } else {
    // Stay engaged on the target during the hold window.
    moveToward(lilTunnelPete, blockTarget.x - dir * 4, blockTarget.y, lilTunnelPete.speed * 0.92, dt);
  }
  clampPlayerToField(lilTunnelPete);
}

function moveDiveRightFullbackBlock(dt) {
  const dir = getOffenseDirection();
  const blockTarget = defenseP5;
  if (blockTarget.id !== game.stretchFbBlockTargetId) {
    game.stretchFbBlockTargetId = blockTarget.id;
  }
  const engageDist = allyHorse.radius + blockTarget.radius + 28;
  const closeEnough =
    distance(allyHorse.x, allyHorse.y, blockTarget.x, blockTarget.y) <= engageDist;
  if (game.stretchFbBlockArmed && closeEnough && game.stretchFbBlockMs <= 0) {
    game.stretchFbBlockMs = getBlockHoldMsForLineman(allyHorse);
    game.stretchFbBlockArmed = false;
  }
  if (game.stretchFbBlockMs > 0) {
    game.stretchFbBlockMs -= dt * 1000;
    if (game.stretchFbBlockMs < 0) {
      game.stretchFbBlockMs = 0;
    }
  }
  const blockActive = game.stretchFbBlockMs > 0;
  if (!blockActive) {
    moveToward(allyHorse, blockTarget.x - dir * 6, blockTarget.y, allyHorse.speed * 1.2, dt);
  } else {
    moveToward(allyHorse, blockTarget.x - dir * 4, blockTarget.y, allyHorse.speed * 0.95, dt);
  }
  clampPlayerToField(allyHorse);
}

function updatePlayModeDiveRight(dt) {
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;

  if (!ball.carrier && !ball.inFlight) {
    updatePlayerInput(dt);
    updateCPU(dt);
    updateAllies(dt);
    moveDiveRightDefenders(dt);
    updateBallPosition();
    return;
  }

  if (game.playModePhase === "handoff") {
    const runLaneY = getStretchPlayRunLaneY();
    const dir = getOffenseDirection();
    // Fullback blocks during the exchange.
    moveDiveRightFullbackBlock(dt);
    // Deep back starts motion before the handoff so the user doesn't need
    // to input anything until they actually receive the ball.
    const motionX = getOffsetX(game.playModeLineX, -8.5);
    moveToward(offenseP4, motionX, runLaneY, offenseP4.speed * 0.92, dt);
    clampPlayerToField(offenseP4);

    const centerToQb = ball.carrier === lilTunnelPete;
    if (centerToQb) {
      // Snap: center steps to QB and transfers possession.
      moveToward(lilTunnelPete, player1.x, player1.y, lilTunnelPete.speed, dt);
      clampPlayerToField(lilTunnelPete);
      if (circleTouch(lilTunnelPete, player1)) {
        ball.carrier = player1;
        game.stretchCenterBlockMs = getBlockHoldMsForLineman(lilTunnelPete);
        game.stretchCenterBlockTargetId = allyDonkey.id;
        game.stretchFbBlockMs = 0;
        game.stretchFbBlockTargetId = defenseP5.id;
        game.stretchFbBlockArmed = true;
      }
    } else {
      // Handoff: QB takes snap then walks to deep back (15 yards).
      moveToward(player1, offenseP4.x, offenseP4.y, player1.speed, dt);
      clampPlayerToField(player1);
      // Center blocks after the snap.
      moveDiveRightCenterBlock(dt);
    }

    // Defenders react via stretch defender logic (respects center/fb blocks).
    moveDiveRightDefenders(dt);

    updateBallPosition();

    // Sack before the final handoff to the deep back.
    if (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris)) {
      resolvePlayModeTackle(player1, player1.x, { sack: true });
      return;
    }

    // Handoff to the 15-yard back.
    if (ball.carrier === player1 && circleTouch(player1, offenseP4)) {
      ball.carrier = offenseP4;
      game.playModePhase = "run";
      markRunAttemptStarted();
      // Preserve momentum from pre-handoff motion.
      offenseP4.x += dir * offenseP4.speed * dt * 0.35;
      updateBallPosition();
    }
    return;
  }

  if (game.playModePhase === "run") {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(offenseP4, dt, getStretchPlayRunLaneY());
    } else {
      clampPlayerToField(offenseP4);
    }
    moveDiveRightFullbackBlock(dt);
    moveDiveRightCenterBlock(dt);
    moveQuarterbackRunBlock(offenseP4, dt);
    moveDiveRightDefenders(dt);
    updateBallPosition();

    if (hasOffenseScored(offenseP4)) {
      finishDriveTouchdown(offenseP4);
      return;
    }
    if (
      circleTackle(offenseP4, player2) ||
      circleTackle(offenseP4, allyDonkey) ||
      circleTackle(offenseP4, cluckNorris) ||
      circleTackle(offenseP4, defenseP4) ||
      circleTackle(offenseP4, defenseP5)
    ) {
      resolvePlayModeTackle(offenseP4, offenseP4.x);
      return;
    }
  }
}

// ── Dive Left (mirror of Dive Right — arc curves upward toward top sideline) ──

function moveDiveLeftDefenders(dt) {
  const tx = ball.carrier ? ball.carrier.x : ball.x;
  const ty = ball.carrier ? ball.carrier.y : ball.y;

  // Pete always blocks Professor Pig on Dive Left (the outside defender toward the top)
  const blockTarget = player2;

  if (blockTarget.id !== game.peteBlockTargetId) {
    game.peteBlockTargetId = blockTarget.id;
    game.peteBlockTimer = getBlockHoldMsForLineman(offenseP5);
  }
  const peteInContact = circleTouch(lilTunnelPete, blockTarget);
  if (peteInContact && game.peteBlockTimer > 0) {
    game.peteBlockTimer -= dt * 1000;
  }
  const blockActive = peteInContact && game.peteBlockTimer > 0;

  if (!blockActive) {
    moveToward(lilTunnelPete, player2.x, player2.y, lilTunnelPete.speed, dt);
  }
  clampPlayerToField(lilTunnelPete);

  const pigSpd = player2.speed;
  const hawSpd = allyDonkey.speed;
  const coopSpd = cluckNorris.speed;

  if (game.playModeDefense === "A" && game.defenseReactionTimer > 0) {
    game.defenseReactionTimer -= dt * 1000;
  } else {
    moveDefensePlayer(player2, tx, ty, pigSpd, dt);
    moveDefensePlayer(allyDonkey, tx, ty, hawSpd, dt);
  }

  if (game.cluckNorrisTimer > 0) {
    game.cluckNorrisTimer -= dt * 1000;
  } else {
    moveDefensePlayer(cluckNorris, tx, ty, coopSpd, dt);
  }
}

function positionForDiveLeft() {
  const lineX = game.playModeLineX;
  applyFormationForPlay("diveLeft", lineX);
  positionDefenseForPlay();
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.peteBlockTimer = 0;
  game.peteBlockTargetId = null;
  game.playModeSweepHandoffT = 0;
}

function startDiveLeftPlay() {
  game.playModeCurrentPlay = "diveLeft";
  game.playModePhase = "handoff";
  game.state = "playing";
  positionForDiveLeft();
}

function resetOffensePlayTransientState() {
  // Prevent previous-play carryover from leaking into the next offensive call.
  resetAllCarrierJukeState();
  game.playModePhase = null;
  game.passPlayTargetReceiver = null;
  game.passPlayDropbackDone = false;
  game.passPlayCanThrow = true;
  game.passPlayDropbackTarget = getPassDropbackTarget(game.playModeLineX);
  game.playModePassSnapMs = 0;
  game.playModeSweepSnapMs = 0;
  game.playModeSweepHandoffT = 0;
  game.playModeSweepArcCY = FIELD.y + FIELD.height / 2;
  game.playModeSweepWrBlockMs = 0;
  game.sweepWrEngageP4Ms = 0;
  game.sweepWrEngageCluckMs = 0;
  game.peteBlockTimer = 0;
  game.peteBlockTargetId = null;
  game.stretchCenterBlockMs = 0;
  game.stretchCenterBlockTargetId = null;
  game.passCenterBlockMs = 0;
  game.passCenterBlockTargetId = null;
  game.passGuardBlockMs = 0;
  game.passGuardBlockTargetId = null;
  game.stretchFbBlockMs = 0;
  game.stretchFbBlockTargetId = null;
  game.stretchFbBlockArmed = false;
  game.playModeTackle = false;
  game.playModeIncomplete = false;
  game.passJamWindowMs = 0;
  game.passPlayRouteMs = 0;
  resetAllPassCoverTracks();
}

/** Dispatch from horizontal play-select UI (filtered run/pass list, 4 per page). */
function startPlayFromSelect(playKey) {
  resetOffensePlayTransientState();
  switch (playKey) {
    case "sweepRight":
      startSweepRightPlay();
      break;
    case "sweepLeft":
      startSweepLeftPlay();
      break;
    case "passRight":
      startPassRightPlay();
      break;
    case "passLeft":
      startPassLeftPlay();
      break;
    case "barnPlay":
      startBarnPlay();
      break;
    case "scrambledEggs":
      startScrambledEggsPlay();
      break;
    case "diveRight":
      startDiveRightPlay();
      break;
    case "diveLeft":
      startDiveLeftPlay();
      break;
    case "barnDoorBoot":
      startBarnDoorBootPlay();
      break;
    case "hayBaleHook":
      startHayBaleHookPlay();
      break;
    case "cornfieldCross":
      startCornfieldCrossPlay();
      break;
    case "siloSlant":
      startSiloSlantPlay();
      break;
    case "pasturePop":
      startPasturePopPlay();
      break;
    case "fencePost":
      startFencePostPlay();
      break;
    case "mudHoleDive":
      startMudHoleDivePlay();
      break;
    default:
      // Safe fallback if an unknown play key slips through.
      startSweepRightPlay();
      break;
  }
}

function startDefensePlayFromSelect(defenseKey) {
  game.selectedDefense = defenseKey;
  const playKey = chooseDefenseModeCpuPlay();
  game.defenseModeCpuPlay = playKey;
  startPlayFromSelect(playKey);
}

function startPrePlayCadence() {
  game.state = "prePlayCadence";
  game.prePlayCadenceIndex = 0;
  game.prePlayCadenceTimer = 1000;
}

function beginSelectedPlay(playKey) {
  startPlayFromSelect(resolvePlayKeyForSelectedSide(playKey));
  startPrePlayCadence();
}

function beginSelectedDefense(defenseKey) {
  game.selectedDefense = defenseKey;
  if (game.cpuOffense && game.playModeDown >= game.playModeMaxDowns) {
    const action = chooseCpuFourthDownAction();
    if (action === "fieldGoal") {
      game.defenseModeCpuPlay = "fieldGoal";
      beginFourthDownFieldGoal(true);
    } else if (action === "punt") {
      game.defenseModeCpuPlay = "punt";
      game.puntDistanceYards = computePuntDistanceYards(0.55 + Math.random() * 0.1, false);
      game.puntBlocked = false;
      startPuntPlayAfterSetup();
    } else {
      beginFourthDownGoForIt();
      const playKey = chooseDefenseModeCpuPlay();
      game.defenseModeCpuPlay = playKey;
      startPlayFromSelect(playKey);
      startPrePlayCadence();
    }
    return;
  }
  const playKey = chooseDefenseModeCpuPlay();
  game.defenseModeCpuPlay = playKey;
  startPlayFromSelect(playKey);
  startPrePlayCadence();
}

function updatePrePlayCadence(dt) {
  game.prePlayCadenceTimer -= dt * 1000;
  if (game.prePlayCadenceTimer > 0) return;

  if (game.prePlayCadenceIndex < 2) {
    game.prePlayCadenceIndex += 1;
    game.prePlayCadenceTimer = 1000;
    return;
  }

  game.prePlayCadenceTimer = 0;
  game.state = "playing";
  if (typeof beginDevTraitDrivePlay === "function") beginDevTraitDrivePlay();
  replayStartRecording();
}

function updatePlayModeDiveLeft(dt) {
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;

  if (!ball.carrier && !ball.inFlight) {
    updatePlayerInput(dt);
    updateCPU(dt);
    updateAllies(dt);
    moveDiveLeftDefenders(dt);
    updateBallPosition();
    return;
  }

  if (game.playModePhase === "handoff") {
    // Pete runs the mirror arc — curving upward toward the top sideline
    const r = 5 * YARDS_TO_PIXELS;
    const cx = getOffsetX(game.playModeLineX, -5);
    const cy = FIELD.y + FIELD.height / 2;
    const arcLength = (Math.PI / 2) * r;
    game.playModeSweepHandoffT = Math.min(1, game.playModeSweepHandoffT + (lilTunnelPete.speed * dt) / arcLength);
    const angle = Math.PI + game.playModeSweepHandoffT * (Math.PI / 2);
    lilTunnelPete.x = cx + r * Math.cos(angle);
    lilTunnelPete.y = cy + r * Math.sin(angle);

    // Horse trails Pete through the arc
    moveToward(allyHorse, lilTunnelPete.x, lilTunnelPete.y, allyHorse.speed, dt);
    clampPlayerToField(allyHorse);

    // QB walks toward the RB to hand off
    moveToward(player1, allyHorse.x, allyHorse.y, player1.speed, dt);
    clampPlayerToField(player1);

    // Defenders react to QB
    if (game.playModeDefense === "A" && game.defenseReactionTimer > 0) {
      game.defenseReactionTimer -= dt * 1000;
    } else {
      moveDefensePlayer(player2, player1.x, player1.y, player2.speed, dt);
      moveDefensePlayer(allyDonkey, player1.x, player1.y, allyDonkey.speed, dt);
    }
    if (game.cluckNorrisTimer > 0) {
      game.cluckNorrisTimer -= dt * 1000;
    } else {
      moveDefensePlayer(cluckNorris, player1.x, player1.y, cluckNorris.speed, dt);
    }

    updateBallPosition();

    if (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris)) {
      resolvePlayModeTackle(player1, player1.x, { sack: true });
      return;
    }

    if (circleTouch(player1, allyHorse) || game.playModeSweepHandoffT >= 1) {
      ball.carrier = allyHorse;
      game.playModePhase = "run";
      markRunAttemptStarted();
      updateBallPosition();
    }
    return;
  }

  if (game.playModePhase === "run") {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(allyHorse, dt, FIELD.y + FIELD.height * 0.3);
    } else {
      clampPlayerToField(allyHorse);
    }
    moveQuarterbackRunBlock(allyHorse, dt);
    moveDiveLeftDefenders(dt);
    updateBallPosition();

    if (hasOffenseScored(allyHorse)) {
      finishDriveTouchdown(allyHorse);
      return;
    }
    if (circleTackle(allyHorse, player2) || circleTackle(allyHorse, allyDonkey) || circleTackle(allyHorse, cluckNorris)) {
      resolvePlayModeTackle(allyHorse, allyHorse.x);
      return;
    }
  }
}

function startPlayMode() {
  applyDefaultFieldRoles();
  player1.score = 0;
  player2.score = 0;
  game.winner = null;
  game.scorePauseTimer = 0;
  game.scoredBy = null;
  game.teamSelectUser = null;
  game.teamSelectPage = 0;
  game.playUserTeamId = null;
  game.playCpuTeamId = null;
  game.teamScores = null;
  game.playSessionKind = null;
  game.cpuOffense = false;
  startGameMusic();
  game.state = "playSessionSelect";
}

function beginPlaySession(kind) {
  if (!isRunnablePlaySessionKind(kind)) return;
  if (kind === "franchise") {
    game.playSessionKind = "franchise";
    game.franchisePickTeam = false;
    game.state = "franchiseMain";
    startMenuMusic();
    return;
  }
  game.playSessionKind = kind;
  game.teamSelectUser = null;
  game.teamSelectPage = 0;
  game.playUserTeamId = null;
  game.playCpuTeamId = null;
  game.teamScores = null;
  game.cpuOffense = false;
  game.franchisePickTeam = false;
  game.state = "playTeamSelect";
}

/** After picking your team — show matchup screen (CPU drawn from the other three teams). */
function advanceToOpponentReveal() {
  if (!game.teamSelectUser) {
    return;
  }
  game.playUserTeamId = game.teamSelectUser;
  game.playCpuTeamId = pickRandomCpuOpponent(game.teamSelectUser);
  game.state = "playOpponentReveal";
}

/** From matchup screen — coin toss or jump straight into the chosen session. */
function startPlayAfterOpponentReveal() {
  if (!game.playUserTeamId || !game.playCpuTeamId) {
    return;
  }
  resetPlayModeTeamScores();
  player1.score = 0;
  player2.score = 0;
  game.winner = null;

  if (playSessionUsesGameClock()) {
    initGameClock();
  }

  if (playSessionUsesCoinToss()) {
  game.state = "playCoinToss";
  game.coinTossPhase = "pickCall";
  game.coinTossCall = null;
  game.coinTossResult = null;
  game.coinTossWon = null;
  game.coinTossCpuChoice = null;
  game.coinTossCpuDirection = null;
  game.coinTossUserChoiceSide = null;
  game.coinTossFlipTimer = 0;
    return;
  }

  applyPlaySessionStart();
}

function beginCoinTossFlip(call) {
  if (game.state !== "playCoinToss" || game.coinTossPhase !== "pickCall") return;
  if (call !== "heads" && call !== "tails") return;
  game.coinTossCall = call;
  game.coinTossPhase = "flipping";
  game.coinTossFlipTimer = 1500;
  // 50/50 heads vs tails
  game.coinTossResult = Math.floor(Math.random() * 2) === 0 ? "heads" : "tails";
}

function updateCoinToss(dt) {
  if (game.coinTossPhase !== "flipping") return;
  game.coinTossFlipTimer -= dt * 1000;
  if (game.coinTossFlipTimer <= 0) {
    game.coinTossPhase = "result";
    game.coinTossFlipTimer = 0;
    game.coinTossWon = game.coinTossCall === game.coinTossResult;
  }
}

/** After seeing flip result — branch to user pick or CPU pick. */
function continueFromCoinTossResult() {
  if (game.state !== "playCoinToss" || game.coinTossPhase !== "result") return;
  if (game.coinTossWon) {
    game.coinTossPhase = "userChooseSide";
    return;
  }
  game.coinTossCpuChoice = Math.floor(Math.random() * 2) === 0 ? "offense" : "defense";
  game.coinTossCpuDirection = Math.floor(Math.random() * 2) === 0 ? "right" : "left";
  game.coinTossPhase = "cpuChose";
}

function resetCoinTossState() {
  game.coinTossPhase = null;
  game.coinTossCall = null;
  game.coinTossResult = null;
  game.coinTossWon = null;
  game.coinTossCpuChoice = null;
  game.coinTossCpuDirection = null;
  game.coinTossUserChoiceSide = null;
  game.coinTossFlipTimer = 0;
}

/** Player won toss — start on offense or defense. */
function startPlayFromUserCoinChoice(side) {
  if (!game.playUserTeamId || !game.playCpuTeamId) return;
  if (side !== "offense" && side !== "defense") return;
  game.coinTossUserChoiceSide = side;
  game.coinTossPhase = "userChooseDirection";
}

function applyCoinTossDirectionForUser(direction) {
  if (direction === "right") game.userOffenseDirection = 1;
  else if (direction === "left") game.userOffenseDirection = -1;
}

function applyCoinTossDirectionForCpu(direction) {
  if (direction === "right") game.userOffenseDirection = -1;
  else if (direction === "left") game.userOffenseDirection = 1;
}

function startPlayFromUserCoinDirection(direction) {
  if (!game.playUserTeamId || !game.playCpuTeamId) return;
  if (game.coinTossPhase !== "userChooseDirection") return;
  if (direction !== "left" && direction !== "right") return;
  const side = game.coinTossUserChoiceSide;
  if (side !== "offense" && side !== "defense") return;
  applyCoinTossDirectionForUser(direction);
  // First possession must begin with a kickoff.
  beginKickoffAim(side === "defense");
  resetCoinTossState();
}

/** Player lost toss — CPU already chose offense or defense; begin play. */
function startPlayAfterCpuCoinChoice() {
  if (!game.playUserTeamId || !game.playCpuTeamId || !game.coinTossCpuChoice || !game.coinTossCpuDirection) return;
  applyCoinTossDirectionForCpu(game.coinTossCpuDirection);
  // First possession must begin with a kickoff.
  beginKickoffAim(game.coinTossCpuChoice === "offense");
  resetCoinTossState();
}

function backFromCoinTossToOpponentReveal() {
  game.state = "playOpponentReveal";
  resetCoinTossState();
}

/** Back from matchup to team picker (same teams can be re-rolled on Continue). */
function backFromOpponentRevealToTeamSelect() {
  game.state = "playTeamSelect";
  game.playUserTeamId = null;
  game.playCpuTeamId = null;
  if (game.teamSelectUser) {
    const i = PLAY_TEAM_IDS.indexOf(game.teamSelectUser);
    if (i >= 0) {
      game.teamSelectPage = i;
    }
  }
}

// =========================================================
// CPU Logic
// =========================================================
function updateCPU(dt) {
  if (game.mode === "play" && game.state === "playing") {
    return;
  }

  let targetX = player2.x;
  let targetY = player2.y;

  if (ball.carrier === player2) {
    // Pig has the ball — run toward the end zone
    targetX = FIELD.x + 20;
    targetY = FIELD.y + FIELD.height / 2;
  } else {
    // Pursue the ball (loose, with player1, with ally, or in flight)
    targetX = ball.x;
    targetY = ball.y;
  }

  moveToward(player2, targetX, targetY, player2.speed, dt);
  clampPlayerToField(player2);
}

function updateAllies(dt) {
  if (
    game.mode === "play" &&
    (game.playModeCurrentPlay === "sweepRight" || game.playModeCurrentPlay === "sweepLeft")
  ) {
    return;
  }

  // Horse helps Barnaby's team
  let horseTargetX = player1.x;
  let horseTargetY = player1.y;

  if (ball.carrier === player1) {
    horseTargetX = player1.x;
    horseTargetY = player1.y;
  } else if (ball.carrier === player2) {
    horseTargetX = ball.x;
    horseTargetY = ball.y;
  } else if (ball.carrier === null) {
    horseTargetX = ball.x;
    horseTargetY = ball.y;
  }

  moveToward(allyHorse, horseTargetX, horseTargetY, allyHorse.speed, dt);
  clampPlayerToField(allyHorse);

  if (game.mode === "play" && game.state === "playing") {
    return;
  }

  // Donkey helps Professor Pig's team
  let donkeyTargetX = player2.x;
  let donkeyTargetY = player2.y;

  if (ball.carrier === player2) {
    donkeyTargetX = player2.x;
    donkeyTargetY = player2.y;
  } else if (ball.carrier === player1) {
    donkeyTargetX = ball.x;
    donkeyTargetY = ball.y;
  } else if (ball.carrier === null) {
    donkeyTargetX = ball.x;
    donkeyTargetY = ball.y;
  }

  moveToward(allyDonkey, donkeyTargetX, donkeyTargetY, allyDonkey.speed, dt);
  clampPlayerToField(allyDonkey);
}

// =========================================================
// Game Logic
// =========================================================
function tryPickupBall() {
  if (ball.inFlight || game.possessionLockTimer > 0 || ball.carrier !== null) {
    return;
  }

  if (circleTouch(player1, ball)) {
    if (game.reacquireCooldownP1 > 0) {
      return;
    }
    ball.carrier = player1;
    game.possessionLockTimer = CONFIG.possessionPickupLockMs;
    updateBallPosition();
    return;
  }

  if (circleTouch(player2, ball)) {
    if (game.reacquireCooldownP2 > 0) {
      return;
    }
    ball.carrier = player2;
    game.possessionLockTimer = CONFIG.possessionPickupLockMs;
    updateBallPosition();
  }
}

function handleCarrierCollisionSteal() {
  if (ball.inFlight || game.possessionLockTimer > 0) {
    return;
  }

  // Player 2 trying to steal from Player 1
  if (ball.carrier === player1 && circleTouchSteal(player1, player2)) {
    // If Player 2 recently lost the ball, they can't immediately take it back
    if (game.reacquireCooldownP2 > 0) {
      return;
    }
    // Player1 loses the ball, apply cooldown before they can take it back
    game.reacquireCooldownP1 = CONFIG.reacquireCooldownMs;
    ball.carrier = player2;
    game.possessionLockTimer = CONFIG.possessionPickupLockMs;
    updateBallPosition();
  }
  // Player 1 trying to steal from Player 2
  else if (ball.carrier === player2 && circleTouchSteal(player1, player2)) {
    // If Player 1 recently lost the ball, they can't immediately take it back
    if (game.reacquireCooldownP1 > 0) {
      return;
    }
    // Player2 loses the ball, apply cooldown before they can take it back
    game.reacquireCooldownP2 = CONFIG.reacquireCooldownMs;
    ball.carrier = player1;
    game.possessionLockTimer = CONFIG.possessionPickupLockMs;
    updateBallPosition();
  }
}

function checkTouchdown() {
  if (game.state !== "playing" || ball.inFlight || !ball.carrier) return;
  if (game.mode === "play") return;

  const leftEndZoneRight = FIELD.x + FIELD.endZoneWidth;
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;

  // Player 1 scores in the right end zone
  if (ball.carrier === player1 && hasOffenseScored(player1)) {
    scorePoint(player1);
    return;
  }

  // CPU scores in the left end zone
  if (ball.carrier === player2 && (getOffenseDirection() > 0 ? player2.x <= leftEndZoneRight : player2.x >= rightEndZoneLeft)) {
    scorePoint(player2);
  }
}

function scorePoint(scorer) {
  if (game.state !== "playing") return;
  if (game.mode === "play") return;

  const points = 6;
  if (scorer.teamTag && shouldTrackTeamPointScore()) {
    addTeamScorePoints(scorer.teamTag, points);
  } else {
    scorer.score += points;
  }
  game.scoredBy = scorer;
  game.state = "scorePause";
  game.scorePauseTimer = scorer === player1 ? 4000 : CONFIG.scorePauseMs;
  ball.carrier = null;

  const total =
    scorer.teamTag && shouldTrackTeamPointScore() && game.teamScores
      ? game.teamScores[scorer.teamTag] || 0
      : scorer.score;
  if (total >= CONFIG.winScore) {
    game.state = "gameOver";
    game.winner = scorer;
  }
}

// Prevent any two characters from overlapping more than half their body (radius).
// Minimum allowed center-to-center distance = playerRadius (one radius = 50% overlap threshold).
function resolveCharacterCollisions(options = {}) {
  const skipDefenseVsDefense = options.skipDefenseVsDefense === true;
  const skipDefenseVsCarrier = options.skipDefenseVsCarrier === true;
  const pushBlend =
    typeof options.pushBlend === "number" ? clamp(options.pushBlend, 0, 1) : 1;
  const needsDefenseSet = skipDefenseVsDefense || skipDefenseVsCarrier;
  const defenseSet = needsDefenseSet ? new Set(getDefenseTeamMembers()) : null;
  const carrier = skipDefenseVsCarrier ? ball.carrier : null;
  const chars = allFieldPlayers();
  const minDist = CONFIG.playerRadius;
  for (let i = 0; i < chars.length; i++) {
    for (let j = i + 1; j < chars.length; j++) {
      const a = chars[i];
      const b = chars[j];
      if (
        carrier &&
        ((a === carrier && defenseSet && defenseSet.has(b)) ||
         (b === carrier && defenseSet && defenseSet.has(a)))
      ) {
        continue;
      }
      if (defenseSet && defenseSet.has(a) && defenseSet.has(b)) {
        continue;
      }
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < minDist) {
        const push = ((minDist - dist) / 2) * pushBlend;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        clampPlayerToField(a);
        clampPlayerToField(b);
      }
    }
  }
}

function updatePlaying(dt) {
  if (game.fumblePopupTimer > 0) {
    game.fumblePopupTimer -= dt * 1000;
    if (game.fumblePopupTimer < 0) {
      game.fumblePopupTimer = 0;
    }
  }
  // Must run in Play mode too (early return below) — otherwise possessionLockTimer never decays
  // and loose-ball pickup after a fumble never becomes allowed.
  if (game.possessionLockTimer > 0) {
    game.possessionLockTimer -= dt * 1000;
    if (game.possessionLockTimer < 0) {
      game.possessionLockTimer = 0;
    }
  }
  if (game.reacquireCooldownP1 > 0) {
    game.reacquireCooldownP1 -= dt * 1000;
    if (game.reacquireCooldownP1 < 0) {
      game.reacquireCooldownP1 = 0;
    }
  }
  if (game.reacquireCooldownP2 > 0) {
    game.reacquireCooldownP2 -= dt * 1000;
    if (game.reacquireCooldownP2 < 0) {
      game.reacquireCooldownP2 = 0;
    }
  }

  if (typeof updateDevTraitBurstTimers === "function") updateDevTraitBurstTimers(dt);
  if (typeof trackDevTraitBallCarrierChange === "function") trackDevTraitBallCarrierChange();

  const jukeCarrier = getUserOffenseBallCarrier();
  if (jukeCarrier) {
    updateCarrierJuke(jukeCarrier, dt);
  }

  if (game.mode === "play") {
    updatePlayMode(dt);
    if (game.state === "playing") {
      replayPushSnapshot();
    }
    return;
  }
  if (game.mode === "passing" && ball.inFlight) {
    const dx = ball.targetX - ball.x;
    const dy = ball.targetY - ball.y;
    const dist = Math.hypot(dx, dy);
    const move = CONFIG.passSpeed * dt;
    if (dist <= move || dist < 8) {
      ball.x = ball.targetX;
      ball.y = ball.targetY;
      ball.inFlight = false;
    } else {
      ball.x += (dx / dist) * move;
      ball.y += (dy / dist) * move;
    }
  } else {
    updatePlayerInput(dt);
    updateCPU(dt);
    updateAllies(dt);
  }

  if (!ball.inFlight) {
    tryPickupBall();
    handleCarrierCollisionSteal();
  }
  resolveCharacterCollisions();
  updateBallPosition();
  checkTouchdown();
}

// ── Play result helper ────────────────────────────────────
// Call this instead of manually setting game.state = "playModeDowned".
// Captures yards / play type before they are cleared.

function shouldFumbleOnTackle(carrier) {
  const p = CONFIG.fumbleChanceOnTackle;
  if (p <= 0) return false;
  const mult = typeof getDifficultyFumbleMultForCarrier === "function"
    ? getDifficultyFumbleMultForCarrier(carrier)
    : 1;
  return Math.random() < (p * mult) / getCarrierFumbleResistance(carrier);
}

function looseBallFromFumble(carrier) {
  ball.carrier = null;
  ball.inFlight = false;
  ball.arcHeight = 0;
  ball.x = carrier.x;
  ball.y = carrier.y - carrier.radius - 8;
  game.possessionLockTimer = Math.max(game.possessionLockTimer, 200);
  if (carrier === player1) game.reacquireCooldownP1 = 450;
  else if (carrier === player2) game.reacquireCooldownP2 = 450;
  game.fumblePopupTimer = CONFIG.fumbleBannerDurationMs;
  game.playModeBallLooseFromFumble = true;
}

function isOffensiveFieldEntity(e) {
  return e === player1 || e === allyHorse || e === lilTunnelPete;
}

/**
 * Fumble recovery: play ends at the spot. Offense keeps ball → next down. Defense recovers → turnover,
 * other team starts at that spot on offense (user on defense or CPU on defense accordingly).
 */
function finalizeFumbleRecovery(entity) {
  game.playModeBallLooseFromFumble = false;
  game.fumblePopupTimer = 0;
  const spotX = clampPlayableX(entity.x, entity.radius);
  const playType = game.playModeCurrentPlay;

  replayFinalizePlayBuffer();

  const yards = getPlayModeYardsGained(spotX);

  ball.carrier = null;
  ball.inFlight = false;
  ball.arcHeight = 0;
  ball.x = spotX;
  ball.y = entity.y - entity.radius - 8;

  game.playModeLastPlayType = playType;
  game.playModeLastYards = yards;
  game.playModePhase = null;
  game.playModeCurrentPlay = null;
  game.passPlayTargetReceiver = null;

  const offenseRecovered = isOffensiveFieldEntity(entity);

  if (offenseRecovered) {
    let resultType;
    if (yards > 0) resultType = "gain";
    else if (yards < 0) resultType = "loss";
    else resultType = "noGain";
    game.playModeLastResultType = resultType;
    game.state = "playModeDowned";
    game.playModeDownedSpot = spotX;
    game.playModeTackle = true;
    game.playModeIncomplete = false;
    game.playModeFumbleRecoveryTackled = true;
    game.playModePendingFumbleTurnover = false;
    game.fieldCelebrationTimer = 0;
    game.fieldCelebrationType = null;
    updateBallPosition();
    return;
  }

  // Defense recovers — turnover after "Tackled!" confirm; possession flips at the spot.
  game.playModeLastResultType = "fumbleTurnover";
  game.playModeTackle = true;
  game.playModeIncomplete = false;
  game.playModeFumbleRecoveryTackled = true;
  game.playModePendingFumbleTurnover = true;
  game.playModeFumbleTurnoverNextCpuOffense = !game.cpuOffense;
  game.state = "playModeDowned";
  game.playModeDownedSpot = spotX;
  updateBallPosition();
}

/** Loose-ball pickup for Play mode (all six field players). */
function tryPlayModeLooseBallPickup() {
  if (game.playModeCurrentPlay === "punt") return;
  if (ball.inFlight || ball.carrier !== null) return;
  if (game.possessionLockTimer > 0) return;
  const chars = [player1, player2, allyHorse, allyDonkey, cluckNorris, lilTunnelPete];
  for (let i = 0; i < chars.length; i++) {
    const e = chars[i];
    if (circleTouch(e, ball)) {
      if (game.playModeBallLooseFromFumble) {
        finalizeFumbleRecovery(e);
        return;
      }
      ball.carrier = e;
      game.possessionLockTimer = CONFIG.possessionPickupLockMs;
      updateBallPosition();
      return;
    }
  }
}

/**
 * Play mode tackle: either fumble (ball loose, play continues) or whistle dead.
 * @returns {boolean} true if fumbled
 */
function resolvePlayModeTackle(carrier, downedX, extra = {}) {
  if (shouldFumbleOnTackle(carrier)) {
    looseBallFromFumble(carrier);
    return true;
  }
  setPlayDowned(downedX, { tackle: true, ...extra });
  return false;
}

function setPlayDowned(downedX, { tackle = false, incomplete = false, sack = false, interception = false } = {}) {
  replayFinalizePlayBuffer();
  game.playModeFumbleRecoveryTackled = false;
  game.playModePendingFumbleTurnover = false;
  const playType = game.playModeCurrentPlay;
  const yards = (incomplete || interception) ? 0 : getPlayModeYardsGained(downedX);

  let resultType;
  if      (interception) resultType = "interception";
  else if (incomplete)   resultType = "incomplete";
  else if (sack)         resultType = "sack";
  else if (yards > 0)    resultType = "gain";
  else if (yards < 0)    resultType = "loss";
  else                   resultType = "noGain";

  recordPlayDownStats(resultType, yards, playType);

  game.playModeLastPlayType   = playType;
  game.playModeLastYards      = yards;
  game.playModeLastResultType = resultType;

  game.state              = "playModeDowned";
  game.playModeDownedSpot = (incomplete || interception) ? game.playModeLineX : downedX;
  game.playModeTackle     = tackle;
  game.playModeIncomplete = incomplete;
  game.playModePhase      = null;
  game.playModeCurrentPlay = null;
  game.passPlayTargetReceiver = null;

  if (resultType === "loss") {
    game.fieldCelebrationTimer = 2800;
    game.fieldCelebrationType = "mud";
    game.fieldCelebrationX = game.playModeDownedSpot;
    playMudThudAudio();
  } else if (resultType === "sack") {
    game.fieldCelebrationTimer = 2800;
    game.fieldCelebrationType = "sack";
    game.fieldCelebrationX = downedX;
    playSackBuzzAudio();
  } else {
    game.fieldCelebrationTimer = 0;
    game.fieldCelebrationType = null;
  }
}

function updatePlayMode(dt) {
  if (game.state === "playing") {
    tryPlayModeLooseBallPickup();
  }
  if (game.playModeCurrentPlay === "punt") {
    updatePlayModePunt(dt);
    return;
  }
  if (game.playModeCurrentPlay === "sweepRight") {
    updatePlayModeSweepRight(dt);
    return;
  }
  if (game.playModeCurrentPlay === "sweepLeft") {
    updatePlayModeSweepLeft(dt);
    return;
  }
  if (game.playModeCurrentPlay === "passRight") {
    updatePlayModePassRightPlay(dt);
    return;
  }
  if (game.playModeCurrentPlay === "hayBaleHook") {
    updatePlayModeHayBaleHookPlay(dt);
    return;
  }
  if (game.playModeCurrentPlay === "siloSlant") {
    updatePlayModeSiloSlantPlay(dt);
    return;
  }
  if (game.playModeCurrentPlay === "pasturePop") {
    updatePlayModePasturePopPlay(dt);
    return;
  }
  if (game.playModeCurrentPlay === "fencePost") {
    updatePlayModeFencePostPlay(dt);
    return;
  }
  if (game.playModeCurrentPlay === "mudHoleDive") {
    updatePlayModeDiveRight(dt);
    return;
  }
  if (game.playModeCurrentPlay === "passLeft") {
    updatePlayModePassLeftPlay(dt);
    return;
  }
  if (game.playModeCurrentPlay === "barnDoorBoot") {
    updatePlayModeBarnDoorBootPlay(dt);
    return;
  }
  if (game.playModeCurrentPlay === "barnPlay") {
    updatePlayModeBarnPlayPlay(dt);
    return;
  }
  if (game.playModeCurrentPlay === "cornfieldCross") {
    updatePlayModeCornfieldCrossPlay(dt);
    return;
  }
  if (game.playModeCurrentPlay === "scrambledEggs") {
    updatePlayModeScrambledEggs(dt);
    return;
  }
  if (game.playModeCurrentPlay === "diveRight") {
    updatePlayModeDiveRight(dt);
    return;
  }
  if (game.playModeCurrentPlay === "diveLeft") {
    updatePlayModeDiveLeft(dt);
    return;
  }
  updatePlayerInput(dt);
  updateCPU(dt);
  updateAllies(dt);
  updateBallPosition();
  if (ball.carrier === player1 && hasOffenseScored(player1)) {
    finishDriveTouchdown(player1);
    return;
  }
  if (ball.carrier === player1 && (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris))) {
    resolvePlayModeTackle(player1, player1.x);
    return;
  }
}

function updatePlayModePassRightPlay(dt) {
  updatePlayModePassRight(dt);
}

function updatePlayModeHayBaleHookPlay(dt) {
  updatePlayModeBarnPlay(dt);
}

function updatePlayModeSiloSlantPlay(dt) {
  updatePlayModeBarnPlay(dt);
}

function updatePlayModePasturePopPlay(dt) {
  updatePlayModeBarnPlay(dt);
}

function updatePlayModeFencePostPlay(dt) {
  updatePlayModePassRight(dt);
}

function updatePlayModePassLeftPlay(dt) {
  updatePlayModePassLeft(dt);
}

function updatePlayModeBarnDoorBootPlay(dt) {
  updatePlayModePassLeft(dt);
}

function updatePlayModeBarnPlayPlay(dt) {
  updatePlayModeBarnPlay(dt);
}

function updatePlayModeCornfieldCrossPlay(dt) {
  updatePlayModeBarnPlay(dt);
}

// Sweep: pig rusher pauses for defenseReactionTimer (see SWEEP_RUSHER_REACTION_MS).

function focalEntityForSweepBlocks() {
  if (game.playModePhase === "snap") {
    return player1;
  }
  return ball.carrier || player1;
}

function moveSweepDefenders(dt) {
  const focal = focalEntityForSweepBlocks();
  const lineX = game.playModeLineX;
  const dir = getOffenseDirection();
  const sweepRusher = player2;
  const fy = FIELD.y;
  const fh = FIELD.height;
  const midY = fy + fh * 0.5;
  const sweepRight = game.playModeCurrentPlay === "sweepRight";
  const trailPx = SWEEP_DB_TRAIL_INSIDE_YARDS * YARDS_TO_PIXELS;
  const stemDepthX = getOffsetX(lineX, 14);
  const stemHalfGap = (SWEEP_WR_PAIR_GAP_YARDS * YARDS_TO_PIXELS) * 0.5;
  const bottomStemY = fy + fh - allyHorse.radius - 14;

  if (sweepRusher.id !== game.peteBlockTargetId) {
    game.peteBlockTargetId = sweepRusher.id;
    game.peteBlockTimer = getBlockHoldMsForLineman(offenseP5);
  }
  const peteInContact = circleTouch(lilTunnelPete, sweepRusher);
  if (peteInContact && game.peteBlockTimer > 0) {
    game.peteBlockTimer -= dt * 1000;
  }
  const blockActive = peteInContact && game.peteBlockTimer > 0;
  const snapPhase = game.playModePhase === "snap";

  if (!snapPhase) {
    if (!blockActive) {
      const mx = (focal.x + sweepRusher.x) * 0.5;
      const my = (focal.y + sweepRusher.y) * 0.5;
      moveToward(lilTunnelPete, mx, my, lilTunnelPete.speed, dt);
    }
    clampPlayerToField(lilTunnelPete);
  }

  const liveCarrier = ball.carrier && !ball.inFlight ? ball.carrier : null;
  const collapseToCarrier =
    !!liveCarrier &&
    (game.playModePhase === "handoff" || game.playModePhase === "toss" || game.playModePhase === "sweep");
  if (game.playModeSweepWrBlockMs > 0) {
    game.playModeSweepWrBlockMs = Math.max(0, game.playModeSweepWrBlockMs - dt * 1000);
  }
  if (game.sweepWrEngageP4Ms > 0) {
    game.sweepWrEngageP4Ms = Math.max(0, game.sweepWrEngageP4Ms - dt * 1000);
  }
  if (game.sweepWrEngageCluckMs > 0) {
    game.sweepWrEngageCluckMs = Math.max(0, game.sweepWrEngageCluckMs - dt * 1000);
  }
  const wrLeadBlocking = collapseToCarrier && game.playModeSweepWrBlockMs > 0;

  if (wrLeadBlocking) {
    const moveWrBlocker = (wr, target, yBias) => {
      if (!target) return;
      const tx = target.x - dir * 10;
      const ty = target.y + yBias;
      moveToward(wr, tx, ty, wr.speed * 1.04, dt);
      clampPlayerToField(wr);
    };
    moveWrBlocker(allyHorse, defenseP4, -8);
    moveWrBlocker(offenseP5, cluckNorris, 8);
  } else {
    const wrStemSp = allyHorse.speed * 0.72;
    moveToward(allyHorse, stemDepthX - stemHalfGap, bottomStemY, wrStemSp, dt);
    clampPlayerToField(allyHorse);
    moveToward(offenseP5, stemDepthX + stemHalfGap, bottomStemY, offenseP5.speed * 0.72, dt);
    clampPlayerToField(offenseP5);
  }

  if (collapseToCarrier) {
    const wrEngage = wrLeadBlocking;
    if (wrEngage && circleTouch(defenseP4, allyHorse)) {
      game.sweepWrEngageP4Ms = Math.max(game.sweepWrEngageP4Ms, game.playModeSweepWrBlockMs);
    }
    if (wrEngage && circleTouch(cluckNorris, offenseP5)) {
      game.sweepWrEngageCluckMs = Math.max(game.sweepWrEngageCluckMs, game.playModeSweepWrBlockMs);
    }
    if (game.sweepWrEngageP4Ms <= 0) {
      moveDefensePlayer(
        defenseP4,
        wrEngage ? allyHorse.x : liveCarrier.x,
        wrEngage ? allyHorse.y : liveCarrier.y - 14,
        defenseP4.speed * 1.02,
        dt
      );
    }
    if (game.sweepWrEngageCluckMs <= 0) {
      moveDefensePlayer(
        cluckNorris,
        wrEngage ? offenseP5.x : liveCarrier.x,
        wrEngage ? offenseP5.y : liveCarrier.y + 14,
        cluckNorris.speed * 1.02,
        dt
      );
    }
    moveDefensePlayer(defenseP5, liveCarrier.x - dir * 8, liveCarrier.y, defenseP5.speed * 0.95, dt);
  } else {
    moveDefensePlayer(defenseP4, allyHorse.x - dir * trailPx, allyHorse.y, defenseP4.speed * 0.98, dt);
    moveDefensePlayer(
      cluckNorris,
      offenseP5.x - dir * trailPx,
      offenseP5.y,
      cluckNorris.speed * 0.98,
      dt
    );

    const oppY = sweepRight ? fy + fh * 0.11 : fy + fh * 0.89;
    moveDefensePlayer(defenseP5, getOffsetX(lineX, 8), oppY, defenseP5.speed * 0.85, dt);
  }

  if (game.defenseReactionTimer > 0) {
    game.defenseReactionTimer -= dt * 1000;
  }
  if (game.defenseReactionTimer <= 0) {
    const pigTarget = liveCarrier || player1;
    moveDefensePlayer(player2, pigTarget.x, pigTarget.y, player2.speed * 1.02, dt);
  }
  if (collapseToCarrier) {
    moveDefensePlayer(allyDonkey, liveCarrier.x - dir * 10, liveCarrier.y, allyDonkey.speed * 0.92, dt);
  } else {
    moveDefensePlayer(
      allyDonkey,
      getOffsetX(player2.x, SWEEP_LB_FROM_RUSHER_YARDS),
      midY,
      allyDonkey.speed * 0.85,
      dt
    );
  }

  if (game.cluckNorrisTimer > 0) {
    game.cluckNorrisTimer -= dt * 1000;
  }
}

/** RB quarter-circle path; shared by snap + handoff (QB stays at snap spot). */
function advanceSweepRbArcRight(dt) {
  const dir = getOffenseDirection();
  const r = 10 * YARDS_TO_PIXELS;
  const cx = getOffsetX(game.playModeLineX, -10);
  const cy = game.playModeSweepArcCY;
  const arcLength = (Math.PI / 2) * r;
  game.playModeSweepHandoffT = Math.min(1, game.playModeSweepHandoffT + (offenseP4.speed * dt) / arcLength);
  const angle = dir > 0
    ? Math.PI - game.playModeSweepHandoffT * (Math.PI / 2)
    : game.playModeSweepHandoffT * (Math.PI / 2);
  offenseP4.x = cx + r * Math.cos(angle);
  offenseP4.y = cy + r * Math.sin(angle);
}

function advanceSweepRbArcLeft(dt) {
  const dir = getOffenseDirection();
  const r = 10 * YARDS_TO_PIXELS;
  const cx = getOffsetX(game.playModeLineX, -10);
  const cy = game.playModeSweepArcCY;
  const arcLength = (Math.PI / 2) * r;
  game.playModeSweepHandoffT = Math.min(1, game.playModeSweepHandoffT + (offenseP4.speed * dt) / arcLength);
  const angle = dir > 0
    ? Math.PI + game.playModeSweepHandoffT * (Math.PI / 2)
    : -game.playModeSweepHandoffT * (Math.PI / 2);
  offenseP4.x = cx + r * Math.cos(angle);
  offenseP4.y = cy + r * Math.sin(angle);
}

function updatePlayModeSweepRight(dt) {
  if (game.playModePhase === "snap") {
    updateCPU(dt);
    updateAllies(dt);
    moveSweepDefenders(dt);
    advanceSweepRbArcRight(dt);
    game.playModeSweepSnapMs -= dt * 1000;
    updateBallPosition();
    if (game.playModeSweepSnapMs <= 0) {
      ball.carrier = player1;
      game.playModePhase = "handoff";
      game.playModeSweepWrBlockMs = SWEEP_WR_BLOCK_HOLD_MS;
      updateBallPosition();
    }
    return;
  }
  if (!ball.carrier && !ball.inFlight) {
    updatePlayerInput(dt);
    updateCPU(dt);
    updateAllies(dt);
    moveSweepDefenders(dt);
    updateBallPosition();
    return;
  }
  if (game.playModePhase === "handoff") {
    const dir = getOffenseDirection();
    advanceSweepRbArcRight(dt);
    updateBallPosition();
    if (circleTackleByAnyDefender(player1)) {
      resolvePlayModeTackle(player1, player1.x, { sack: true });
      return;
    }
    if (game.playModeDefense === "A") {
      if (anyDefenderWithinYardsOfEntity(player1, 5)) {
        game.playModeSweepHandoffT = 1;
      }
    }
    if (game.playModeSweepHandoffT >= 0.4) {
      const tossFromX = player1.x + dir * 16;
      const tossFromY = player1.y - player1.radius + 10;
      const { tx, ty } = getSweepPitchTarget(tossFromX, tossFromY, offenseP4, dir, true);
      beginPlayModeSweepToss(tossFromX, tossFromY, tx, ty);
    }
    moveSweepDefenders(dt);
    return;
  }
  if (game.playModePhase === "toss") {
    moveOffenseX(offenseP4, dt);
    clampPlayerToField(offenseP4);
    advancePlayModeSweepToss(dt);
    moveSweepDefenders(dt);
    return;
  }
  if (game.playModePhase === "sweep") {
    updatePlayerInput(dt);
    if (game.cpuOffense && ball.carrier === offenseP4) {
      moveCpuOffenseCarrier(offenseP4, dt, lilTunnelPete.y);
    }
    moveSweepDefenders(dt);
    updateBallPosition();
    const carrier = ball.carrier;
    if (carrier === offenseP4 && hasOffenseScored(offenseP4)) {
      finishDriveTouchdown(offenseP4);
      return;
    }
    if (carrier && circleTackleByAnyDefender(carrier)) {
      resolvePlayModeTackle(carrier, carrier.x);
      return;
    }
    return;
  }
}

function updatePlayModeSweepLeft(dt) {
  if (game.playModePhase === "snap") {
    updateCPU(dt);
    updateAllies(dt);
    moveSweepDefenders(dt);
    advanceSweepRbArcLeft(dt);
    game.playModeSweepSnapMs -= dt * 1000;
    updateBallPosition();
    if (game.playModeSweepSnapMs <= 0) {
      ball.carrier = player1;
      game.playModePhase = "handoff";
      game.playModeSweepWrBlockMs = SWEEP_WR_BLOCK_HOLD_MS;
      updateBallPosition();
    }
    return;
  }
  if (!ball.carrier && !ball.inFlight) {
    updatePlayerInput(dt);
    updateCPU(dt);
    updateAllies(dt);
    moveSweepDefenders(dt);
    updateBallPosition();
    return;
  }
  if (game.playModePhase === "handoff") {
    const dir = getOffenseDirection();
    advanceSweepRbArcLeft(dt);
    updateBallPosition();
    if (circleTackleByAnyDefender(player1)) {
      resolvePlayModeTackle(player1, player1.x, { sack: true });
      return;
    }
    if (game.playModeDefense === "A") {
      if (anyDefenderWithinYardsOfEntity(player1, 5)) {
        game.playModeSweepHandoffT = 1;
      }
    }
    if (game.playModeSweepHandoffT >= 0.4) {
      const tossFromX = player1.x + dir * 16;
      const tossFromY = player1.y - player1.radius - 10;
      const { tx, ty } = getSweepPitchTarget(tossFromX, tossFromY, offenseP4, dir, false);
      beginPlayModeSweepToss(tossFromX, tossFromY, tx, ty);
    }
    moveSweepDefenders(dt);
    return;
  }
  if (game.playModePhase === "toss") {
    offenseP4.y -= offenseP4.speed * dt;
    clampPlayerToField(offenseP4);
    advancePlayModeSweepToss(dt);
    moveSweepDefenders(dt);
    return;
  }
  if (game.playModePhase === "sweep") {
    updatePlayerInput(dt);
    if (game.cpuOffense && ball.carrier === offenseP4) {
      moveCpuOffenseCarrier(offenseP4, dt, lilTunnelPete.y);
    }
    moveSweepDefenders(dt);
    updateBallPosition();
    const carrier = ball.carrier;
    if (carrier === offenseP4 && hasOffenseScored(offenseP4)) {
      finishDriveTouchdown(offenseP4);
      return;
    }
    if (carrier && circleTackleByAnyDefender(carrier)) {
      resolvePlayModeTackle(carrier, carrier.x);
      return;
    }
    return;
  }
}

function movePassDefendersOnQbScramble(dt, qb, rushing) {
  const spy = getPassQbSpy();
  movePassRusherDefender(rushing, qb.x, qb.y, rushing.speed * 1.08, dt);
  if (spy && spy !== rushing) {
    moveQbSpyDefender(spy, qb, dt, true);
  }

  for (const { id, receiver, cushionYards } of getAssignedPassCoveragePairs()) {
    const defender = getDefenderById(id);
    if (!defender || defender === rushing || defender === spy || isDefenseControlledPlayer(defender)) {
      continue;
    }
    const sepYards = getCoverageSeparationYards(defender, receiver);
    if (sepYards >= 7.5) {
      moveDefensePlayer(defender, qb.x, qb.y, defender.speed * 0.98, dt);
    } else {
      moveManCoverageDefender(defender, receiver, dt, { cushionYards, speedMult: 0.84 });
    }
  }
  moveUnassignedPassHelp(dt);
}

function movePassDefenders(dt, ballRef) {
  if (game.passJamWindowMs > 0) {
    game.passJamWindowMs = Math.max(0, game.passJamWindowMs - dt * 1000);
  }
  for (const receiver of getPassCoverageReceivers()) {
    tickReceiverRouteBreakState(receiver, dt);
  }
  const { covering, rushing } = getPassDefenders();

  // Target the carrier's center when there is one; otherwise track ball in flight
  const tx = ballRef.carrier ? ballRef.carrier.x : ballRef.x;
  const ty = ballRef.carrier ? ballRef.carrier.y : ballRef.y;
  const qb = ballRef.carrier === player1 ? player1 : null;

  // QB has scrambled past the line — all defenders converge on the ball carrier
  if (!game.passPlayCanThrow && qb) {
    moveDefenseTeamToward(tx, ty, dt);
    return;
  }

  // QB is rolling out / scrambling before the line — spy and help peel to the QB
  if (qb && isQbScrambling()) {
    movePassDefendersOnQbScramble(dt, qb, rushing);
    return;
  }

  let coverSpeedMult = 1;
  if (game.defenseReactionTimer > 0) {
    game.defenseReactionTimer = Math.max(0, game.defenseReactionTimer - dt * 1000);
    coverSpeedMult = PASS_COVER_DELAY_TRAIL_SPEED;
  }
  if (game.cluckNorrisTimer > 0) {
    game.cluckNorrisTimer = Math.max(0, game.cluckNorrisTimer - dt * 1000);
    coverSpeedMult = Math.min(coverSpeedMult, PASS_COVER_DELAY_TRAIL_SPEED);
  }

  movePassRusherDefender(rushing, tx, ty, rushing.speed, dt);

  const spy = getPassQbSpy();
  if (spy && spy !== rushing && qb) {
    moveQbSpyDefender(spy, qb, dt, false);
  }

  if (hasExplicitPassCoverageAssignments()) {
    moveAssignedPassCoverage(dt, 1);
    moveUnassignedPassHelp(dt);
    return;
  }

  if (game.playModeDefense === "B") {
    const deepTarget = game.passDefDeepTarget === "horse" ? allyHorse : lilTunnelPete;
    const shallowTarget = game.passDefDeepTarget === "horse" ? lilTunnelPete : allyHorse;
    moveManCoverageDefender(cluckNorris, deepTarget, dt, { speedMult: coverSpeedMult });
    moveManCoverageDefender(covering, shallowTarget, dt, { speedMult: coverSpeedMult });
    } else {
    moveManCoverageDefender(covering, allyHorse, dt, { speedMult: coverSpeedMult });
    moveManCoverageDefender(cluckNorris, lilTunnelPete, dt, { speedMult: coverSpeedMult });
  }
  moveUnassignedPassHelp(dt);

  // Receiver routes run in each play's update loop (and during snap below), not here.
}

function moveBarnPlayReceivers(dt, adjustTarget = null) {
  const horseStemX = clampPlayableX(getOffsetX(game.playModeLineX, 22), 30);
  const peteStemX = clampPlayableX(getOffsetX(game.playModeLineX, 12), 50);
  const horseTargetX = clampPlayableX(getOffsetX(game.playModeLineX, 38), 10);
  const peteTargetX = peteStemX;
  const horseTargetY = FIELD.y + FIELD.height * 0.42;
  const peteTargetY = FIELD.y + FIELD.height * 0.28;
  const horseRouteSpeed = getScriptedPassRouteSpeed(allyHorse);
  const peteRouteSpeed = getScriptedPassRouteSpeed(lilTunnelPete);

  if (adjustTarget === "horse") {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
  } else if (hasNotReachedForwardX(allyHorse.x, horseStemX)) {
    moveToward(allyHorse, horseStemX, allyHorse.y, horseRouteSpeed, dt);
  } else {
    runReceiverToLandmarkOrContinue(allyHorse, horseTargetX, horseTargetY, horseRouteSpeed, dt);
  }

  if (adjustTarget === "pete") {
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  } else if (hasNotReachedForwardX(lilTunnelPete.x, peteStemX)) {
    moveToward(lilTunnelPete, peteStemX, lilTunnelPete.y, peteRouteSpeed, dt);
  } else {
    runReceiverToLandmarkOrContinue(lilTunnelPete, peteTargetX, peteTargetY, peteRouteSpeed, dt);
  }

  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
}

function moveScrambledEggsReceivers(dt, adjustTarget = null) {
  if (adjustTarget === "horse") {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
  } else if (
    typeof getScrambledEggsHorseComebackGeometry === "function" &&
    typeof moveReceiverCornerRoute === "function"
  ) {
    if (!game.scrambledEggsHorseComebackState) {
      game.scrambledEggsHorseComebackState = { phase: "stem" };
    }
    moveReceiverCornerRoute(
      allyHorse,
      getScrambledEggsHorseComebackGeometry(),
      allyHorse.speed,
      dt,
      game.scrambledEggsHorseComebackState
    );
  }

  if (adjustTarget === "pete") {
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  } else if (
    typeof getScrambledEggsPeteCornerGeometry === "function" &&
    typeof moveReceiverCornerRoute === "function"
  ) {
    if (!game.scrambledEggsPeteCornerState) {
      game.scrambledEggsPeteCornerState = { phase: "stem" };
    }
    moveReceiverCornerRoute(
      lilTunnelPete,
      getScrambledEggsPeteCornerGeometry(),
      lilTunnelPete.speed,
      dt,
      game.scrambledEggsPeteCornerState
    );
  }

  const p4RouteActive =
    adjustTarget === "p4" || ball.carrier === player1 || ball.inFlight;
  if (
    p4RouteActive &&
    typeof getScrambledEggsP4CornerGoGeometry === "function" &&
    typeof moveReceiverCornerGoRoute === "function"
  ) {
    if (adjustTarget === "p4") {
      moveToward(offenseP4, ball.targetX, ball.targetY, offenseP4.speed, dt);
  } else {
      if (!game.scrambledEggsP4FadeState) {
        game.scrambledEggsP4FadeState = {};
      }
      moveReceiverCornerGoRoute(
        offenseP4,
        getScrambledEggsP4CornerGoGeometry(),
        offenseP4.speed,
        dt,
        game.scrambledEggsP4FadeState
      );
    }
  }

  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
  clampPlayerToField(offenseP4);
}

/** Defenders roughly between the WR and the QB (boot stalk / kick-out block). */
function getDefenderInFrontOfBarnBootWr() {
  const wr = lilTunnelPete;
  const dir = getOffenseDirection();
  const defenders = [player2, allyDonkey, cluckNorris];
  const minTowardQbPx = 0.35 * YARDS_TO_PIXELS;
  const maxLat = 5 * YARDS_TO_PIXELS;
  let best = null;
  let bestD = Infinity;
  for (const d of defenders) {
    const towardQb = -dir * (d.x - wr.x);
    if (towardQb < minTowardQbPx) continue;
    if (Math.abs(d.y - wr.y) > maxLat) continue;
    const dist = distance(wr.x, wr.y, d.x, d.y);
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best;
}

function getClosestDefenderToEntityWithin(entity, maxDist) {
  const defenders = [player2, allyDonkey, cluckNorris];
  let best = null;
  let bestD = maxDist;
  for (const d of defenders) {
    const dist = distance(entity.x, entity.y, d.x, d.y);
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best;
}

function moveBarnDoorBootReceivers(dt) {
  // Boot concept: RB sells backfield action while WR stays outside and works upfield.
  const dir = getOffenseDirection();
  const fakeRunX = clampPlayableX(game.playModeLineX - dir * 2.8 * YARDS_TO_PIXELS, allyHorse.radius);
  const fakeRunY = FIELD.y + FIELD.height * 0.68;
  const rbLeakX = clampPlayableX(game.playModeLineX + dir * 3.5 * YARDS_TO_PIXELS, allyHorse.radius);
  const rbLeakY = FIELD.y + FIELD.height * 0.34;
  const wrOutsideStemX = clampPlayableX(game.playModeLineX + dir * 14 * YARDS_TO_PIXELS, lilTunnelPete.radius);
  const wrOutsideY = FIELD.y + 52;
  const wrOutsideBreakX = clampPlayableX(game.playModeLineX + dir * 24 * YARDS_TO_PIXELS, lilTunnelPete.radius);

  if (game.barnDoorBootStage <= 2) {
    moveToward(allyHorse, fakeRunX, fakeRunY, allyHorse.speed, dt);
  } else {
    moveToward(allyHorse, rbLeakX, rbLeakY, allyHorse.speed, dt);
  }

  const inlineBlock = getDefenderInFrontOfBarnBootWr();
  const nearBlock = getClosestDefenderToEntityWithin(lilTunnelPete, 2.85 * YARDS_TO_PIXELS);
  let peteTx;
  let peteTy;
  let peteSpd;
  if (inlineBlock) {
    peteTx = inlineBlock.x;
    peteTy = inlineBlock.y;
    peteSpd = lilTunnelPete.speed;
  } else if (nearBlock) {
    peteTx = nearBlock.x;
    peteTy = nearBlock.y;
    peteSpd = lilTunnelPete.speed;
  } else if (game.barnDoorBootStage <= 2) {
    peteTx = wrOutsideStemX;
    peteTy = wrOutsideY;
    peteSpd = lilTunnelPete.speed;
  } else {
    peteTx = wrOutsideBreakX;
    peteTy = wrOutsideY;
    peteSpd = lilTunnelPete.speed;
  }
  moveToward(lilTunnelPete, peteTx, peteTy, peteSpd, dt);

  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
}

// 12 = upfield (+x); 5 → 10 clockwise from LOS. lateralFlip ±1 mirrors roll across midfield.
function getBarnDoorBootArcGeometry() {
  const dir = getOffenseDirection();
  const lineX = game.playModeLineX;
  const midY = FIELD.y + FIELD.height / 2;
  const arcRadius = 10 * YARDS_TO_PIXELS;
  const startAngle = (5 / 12) * (2 * Math.PI);
  const endAngle = (10 / 12) * (2 * Math.PI);
  const lateralFlip = game.barnDoorBootLateralFlip == null ? 1 : game.barnDoorBootLateralFlip;
  const arcCenterX = clampPlayableX(
    lineX - Math.cos(startAngle) * arcRadius * dir,
    player1.radius
  );
  const arcCenterY = midY - lateralFlip * Math.sin(startAngle) * arcRadius;
  return {
    dir,
    midY,
    arcRadius,
    startAngle,
    endAngle,
    arcCenterX,
    arcCenterY,
    lateralFlip,
  };
}

function toggleBarnDoorBootLateralFlip() {
  if (game.mode !== "play" || game.playModeCurrentPlay !== "barnDoorBoot" || game.passPlayDropbackDone) {
    return false;
  }
  const canFlip = game.state === "prePlayCadence" || (game.state === "playing" && game.barnDoorBootStage < 2);
  if (!canFlip) return false;
  const cur = game.barnDoorBootLateralFlip == null ? 1 : game.barnDoorBootLateralFlip;
  game.barnDoorBootLateralFlip = cur === 1 ? -1 : 1;
  if (game.barnDoorBootStage === 1 && game.barnDoorBootDynCx != null) {
    const { arcRadius, startAngle, endAngle, arcCenterX } = getBarnDoorBootArcGeometry();
    const arcCx = game.barnDoorBootDynCx != null ? game.barnDoorBootDynCx : arcCenterX;
    const t = game.barnDoorBootArcT || 0;
    const ang = startAngle + (endAngle - startAngle) * t;
    const lf = game.barnDoorBootLateralFlip;
    game.barnDoorBootDynCy = clamp(
      player1.y - lf * Math.sin(ang) * arcRadius,
      FIELD.y + player1.radius,
      FIELD.y + FIELD.height - player1.radius
    );
  }
  return true;
}

function updateBarnDoorBootQbMotion(dt) {
  const {
    arcRadius,
    startAngle,
    endAngle,
    arcCenterX,
    arcCenterY,
    lateralFlip,
  } = getBarnDoorBootArcGeometry();
  const dir = getOffenseDirection();
  const lineX = game.playModeLineX;
  const midY = FIELD.y + FIELD.height / 2;
  const settleX = clampPlayableX(lineX + dir * 9 * YARDS_TO_PIXELS, player1.radius);
  const settleY = FIELD.y + FIELD.height * 0.22;
  const autoCrossLosX = clampPlayableX(lineX + dir * YARDS_TO_PIXELS, player1.radius);

  // 0: straight dropback; 1: boot arc; 2: auto ~1 yd past LOS; 3: player / CPU settle
  if (game.barnDoorBootStage === 0) {
    const preBackYards = 10;
    const deepX = clampPlayableX(lineX - dir * preBackYards * YARDS_TO_PIXELS, player1.radius);
    if (distance(player1.x, player1.y, deepX, midY) > 10) {
      moveToward(player1, deepX, midY, player1.speed, dt);
    } else {
      game.barnDoorBootDynCx = clampPlayableX(
        player1.x - Math.cos(startAngle) * arcRadius * dir,
        player1.radius
      );
      game.barnDoorBootDynCy = clamp(
        player1.y - lateralFlip * Math.sin(startAngle) * arcRadius,
        FIELD.y + player1.radius,
        FIELD.y + FIELD.height - player1.radius
      );
      game.barnDoorBootStage = 1;
      game.barnDoorBootArcT = 0;
    }
    clampPlayerToField(player1);
    return;
  }

  if (game.barnDoorBootStage === 1) {
    const arcCx = game.barnDoorBootDynCx != null ? game.barnDoorBootDynCx : arcCenterX;
    const arcCy = game.barnDoorBootDynCy != null ? game.barnDoorBootDynCy : arcCenterY;
    const arcLength = Math.abs(endAngle - startAngle) * arcRadius;
    const arcDuration = Math.max(0.2, arcLength / Math.max(1, player1.speed));
    const los = lineX;
    const tPrev = game.barnDoorBootArcT || 0;
    const tNext = Math.min(1, tPrev + dt / arcDuration);

    const sampleBootArc = (tx) => {
      const ang = startAngle + (endAngle - startAngle) * tx;
      const x = arcCx + Math.cos(ang) * arcRadius * dir;
      const y = arcCy + lateralFlip * Math.sin(ang) * arcRadius;
      return { x, y };
    };
    const reachedLos = (tx) => {
      const { x } = sampleBootArc(tx);
      return dir > 0 ? x >= los - 0.5 : x <= los + 0.5;
    };

    let useT = tNext;
    let snapLos = false;
    if (reachedLos(tNext) && !reachedLos(tPrev)) {
      let lo = tPrev;
      let hi = tNext;
      for (let i = 0; i < 16; i++) {
        const mid = (lo + hi) * 0.5;
        if (reachedLos(mid)) hi = mid;
        else lo = mid;
      }
      useT = hi;
      snapLos = true;
    } else if (reachedLos(tPrev)) {
      useT = tPrev;
      snapLos = true;
    } else if (tNext >= 1 - 1e-6) {
      useT = 1;
    } else {
      useT = tNext;
    }

    game.barnDoorBootArcT = useT;
    const { x: rawX, y: rawY } = sampleBootArc(useT);
    player1.x = clampPlayableX(snapLos ? los : rawX, player1.radius);
    player1.y = clamp(
      rawY,
      FIELD.y + player1.radius,
      FIELD.y + FIELD.height - player1.radius
    );

    if (snapLos || useT >= 1 - 1e-6) {
      game.barnDoorBootStage = 2;
    }
    return;
  }

  if (game.barnDoorBootStage === 2) {
    const margin = 8;
    const reachedOneYdPast =
      dir > 0 ? player1.x >= autoCrossLosX - margin : player1.x <= autoCrossLosX + margin;
    if (!reachedOneYdPast) {
      moveToward(player1, autoCrossLosX, player1.y, player1.speed, dt);
    } else {
      game.barnDoorBootStage = 3;
    }
    return;
  }

  if (!game.cpuOffense) {
    updatePlayerInput(dt);
  } else {
    moveToward(player1, settleX, settleY, player1.speed, dt);
  }
}

function moveHayBaleHookReceivers(dt, adjustTarget = null) {
  if (adjustTarget === "horse") {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
  } else if (
    typeof getHayBaleHookHorseGeometry === "function" &&
    typeof moveReceiverCurlRoute === "function"
  ) {
    if (!game.hayBaleHookHorseState) {
      game.hayBaleHookHorseState = { phase: "stem" };
    }
    moveReceiverCurlRoute(
      allyHorse,
      getHayBaleHookHorseGeometry(),
      getScriptedPassRouteSpeed(allyHorse),
      dt,
      game.hayBaleHookHorseState
    );
  }

  if (adjustTarget === "pete") {
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  } else if (
    typeof getHayBaleHookPeteGeometry === "function" &&
    typeof moveReceiverCurlRoute === "function"
  ) {
    if (!game.hayBaleHookPeteState) {
      game.hayBaleHookPeteState = { phase: "stem" };
    }
    moveReceiverCurlRoute(
      lilTunnelPete,
      getHayBaleHookPeteGeometry(),
      getScriptedPassRouteSpeed(lilTunnelPete),
      dt,
      game.hayBaleHookPeteState
    );
  }

  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
}

function moveSiloSlantReceivers(dt, adjustTarget = null) {
  if (adjustTarget === "horse") {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
  } else if (
    typeof getSiloSlantHorseGeometry === "function" &&
    typeof moveReceiverCornerRoute === "function"
  ) {
    if (!game.siloSlantHorseState) {
      game.siloSlantHorseState = { phase: "stem" };
    }
    moveReceiverCornerRoute(
      allyHorse,
      getSiloSlantHorseGeometry(),
      getScriptedPassRouteSpeed(allyHorse),
      dt,
      game.siloSlantHorseState
    );
  }

  if (adjustTarget === "pete") {
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  } else if (
    typeof getSiloSlantPeteGeometry === "function" &&
    typeof moveReceiverCornerRoute === "function"
  ) {
    if (!game.siloSlantPeteState) {
      game.siloSlantPeteState = { phase: "stem" };
    }
    moveReceiverCornerRoute(
      lilTunnelPete,
      getSiloSlantPeteGeometry(),
      getScriptedPassRouteSpeed(lilTunnelPete),
      dt,
      game.siloSlantPeteState
    );
  }

  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
}

function movePasturePopReceivers(dt, adjustTarget = null) {
  const lineX = game.playModeLineX;
  const goX = clampPlayableX(getOffsetX(lineX, 24), 10);

  if (adjustTarget === "horse") {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
  } else {
    const horseSpeed = getScriptedPassRouteSpeed(allyHorse);
    runReceiverToLandmarkOrContinue(allyHorse, goX, allyHorse.y, horseSpeed, dt);
  }

  if (adjustTarget === "pete") {
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  } else if (
    typeof getPasturePopPeteGeometry === "function" &&
    typeof moveReceiverCurlRoute === "function"
  ) {
    if (!game.pasturePopPeteState) {
      game.pasturePopPeteState = { phase: "stem" };
    }
    moveReceiverCurlRoute(
      lilTunnelPete,
      getPasturePopPeteGeometry(),
      getScriptedPassRouteSpeed(lilTunnelPete),
      dt,
      game.pasturePopPeteState
    );
  }

  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
}

function movePassPlayReceivers(dt, adjustTarget = null) {
  const play = game.playModeCurrentPlay;
  if (play === "cornfieldCross") {
    moveCornfieldCrossReceivers(dt, adjustTarget);
    return;
  }
  if (play === "hayBaleHook") {
    moveHayBaleHookReceivers(dt, adjustTarget);
    return;
  }
  if (play === "siloSlant") {
    moveSiloSlantReceivers(dt, adjustTarget);
    return;
  }
  if (play === "pasturePop") {
    movePasturePopReceivers(dt, adjustTarget);
    return;
  }
  moveBarnPlayReceivers(dt, adjustTarget);
}

function moveCornfieldCrossReceivers(dt, adjustTarget = null) {
  const dir = getOffenseDirection();
  const topLaneY = FIELD.y + FIELD.height * 0.28;
  const lowLaneY = FIELD.y + FIELD.height * 0.74;
  const crossMidX = clampPlayableX(game.playModeLineX + dir * 14 * YARDS_TO_PIXELS, 16);
  const horseExitX = clampPlayableX(game.playModeLineX + dir * 31 * YARDS_TO_PIXELS, 18);
  const peteExitX = clampPlayableX(game.playModeLineX + dir * 31 * YARDS_TO_PIXELS, 18);
  const horseTargetY = lowLaneY;
  const peteTargetY = topLaneY;
  if (adjustTarget === "horse") {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
  } else if (hasNotReachedForwardX(allyHorse.x, crossMidX)) {
      moveToward(allyHorse, crossMidX, allyHorse.y, allyHorse.speed, dt);
    } else {
    runReceiverToLandmarkOrContinue(allyHorse, horseExitX, horseTargetY, allyHorse.speed, dt);
  }
  if (adjustTarget === "pete") {
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  } else if (hasNotReachedForwardX(lilTunnelPete.x, crossMidX)) {
      moveToward(lilTunnelPete, crossMidX, lilTunnelPete.y, lilTunnelPete.speed, dt);
    } else {
    runReceiverToLandmarkOrContinue(lilTunnelPete, peteExitX, peteTargetY, lilTunnelPete.speed, dt);
  }
  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
}

function startPlayModePassThrow(tx, ty, preferredTarget = null) {
  startArcingPassFlight(tx, ty);
  game.reacquireCooldownP1 = CONFIG.reacquireCooldownMs;

  if (preferredTarget) {
    game.passPlayTargetReceiver = preferredTarget;
  } else {
    const horseDist = distance(tx, ty, allyHorse.x, allyHorse.y);
    const peteDist = distance(tx, ty, lilTunnelPete.x, lilTunnelPete.y);
    const p4Dist = distance(tx, ty, offenseP4.x, offenseP4.y);
    if (horseDist <= peteDist && horseDist <= p4Dist) {
      game.passPlayTargetReceiver = "horse";
    } else if (peteDist <= p4Dist) {
      game.passPlayTargetReceiver = "pete";
    } else {
      game.passPlayTargetReceiver = "p4";
    }
  }
  markPassAttemptStarted(game.passPlayTargetReceiver);
}

function moveStandardPassReceiversInFlight(dt) {
  const target = game.passPlayTargetReceiver;
  const tripsSevenPost = game.playModeCurrentPlay === "passRight" || game.playModeCurrentPlay === "passLeft";
  const topTrips = game.playModeCurrentPlay === "passLeft";
  const playKey = game.playModeCurrentPlay;

  if (target === "horse") {
    if (tripsSevenPost) {
      moveTripsOutsideSevenPost(dt, "horse", topTrips);
      moveTripsSlotCurlRoute(dt);
    } else {
      moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
    moveOffenseX(lilTunnelPete, dt);
    }
  } else if (target === "pete") {
    if (tripsSevenPost) {
      moveTripsOutsideSevenPost(dt, null, topTrips);
      moveTripsSlotCurlRoute(dt, "pete");
    } else {
      moveOffenseX(allyHorse, dt);
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
    }
  } else if (target === "p4") {
    if (tripsSevenPost) {
      moveTripsOutsideSevenPost(dt);
      moveTripsSlotCurlRoute(dt);
    } else {
      moveOffenseX(allyHorse, dt);
      moveOffenseX(lilTunnelPete, dt);
    }
    movePassP4Route(playKey, dt, "p4");
  } else {
    if (tripsSevenPost) {
      moveTripsOutsideSevenPost(dt, "horse", topTrips);
    } else {
      moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
    }
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  }

  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
  if (tripsSevenPost) {
    movePassP4Route(playKey, dt, target === "p4" ? "p4" : null);
  }
}

function isLinemanNearRusher(lineman, rusher, extraPad = 22) {
  if (!lineman || !rusher) return false;
  return (
    circleTouch(lineman, rusher) ||
    distance(lineman.x, lineman.y, rusher.x, rusher.y) <=
      lineman.radius + rusher.radius + extraPad
  );
}

function isLinemanBlockingRusher(lineman, rusher, blockMs) {
  return blockMs > 0 && isLinemanNearRusher(lineman, rusher, 26);
}

function isPassOlBlockingRusher(rusher) {
  return isLinemanBlockingRusher(offenseP5, rusher, game.passCenterBlockMs);
}

function movePassRusherDefender(rushing, tx, ty, speed, dt) {
  if (isPassOlBlockingRusher(rushing)) return;
  moveDefensePlayer(rushing, tx, ty, speed, dt);
}

function movePassLinemanBlock(lineman, msKey, targetIdKey, rushing, dt, opts = {}) {
  const { screenPlay = false, laneOffsetY = 0, laneOffsetX = 0 } = opts;
  const dir = getOffenseDirection();
  const lineX = game.playModeLineX;

  if (rushing.id !== game[targetIdKey]) {
    game[targetIdKey] = rushing.id;
  }

  const inContact = isLinemanNearRusher(lineman, rushing, 28);
  if (inContact && game[msKey] <= 0) {
    game[msKey] = getBlockHoldMsForLineman(lineman) * (game.cpuOffense ? 1.4 : 1);
  }
  if (game[msKey] > 0) {
    game[msKey] -= dt * 1000;
  }
  const blockActive = game[msKey] > 0;

  let setX;
  let setY;
  if (screenPlay) {
    setX = rushing.x - dir * (2.5 + laneOffsetX) * YARDS_TO_PIXELS;
    setY = rushing.y + laneOffsetY;
  } else {
    setX = rushing.x - dir * (4 + laneOffsetX) * YARDS_TO_PIXELS;
    setY = rushing.y + laneOffsetY;
  }

  const chaseSpeed = screenPlay ? 1.15 : 1.02;
  moveToward(
    lineman,
    setX,
    setY,
    lineman.speed * (blockActive && inContact ? 0.78 : chaseSpeed),
    dt
  );

  const backX = clampPlayableX(
    getOffsetX(lineX, screenPlay ? -4 : -2.5),
    lineman.radius
  );
  const maxFwd = lineX + 2;
  if (dir > 0) {
    lineman.x = clamp(lineman.x, backX, maxFwd);
  } else {
    lineman.x = clamp(lineman.x, lineX - 2, backX);
  }
  clampPlayerToField(lineman);
}

function movePassRightCenterBlock(rushing, dt) {
  const passPlay = PASS_PLAY_KEYS.has(game.playModeCurrentPlay);
  if (!rushing || !passPlay || game.playModePhase === "snap") return;

  if (!game.passPlayCanThrow && ball.carrier === player1 && !ball.inFlight) {
    moveToward(
      offenseP5,
      player1.x - getOffenseDirection() * 2.5 * YARDS_TO_PIXELS,
      player1.y,
      offenseP5.speed * 0.9,
      dt
    );
  clampPlayerToField(offenseP5);
    return;
  }

  movePassLinemanBlock(
    offenseP5,
    "passCenterBlockMs",
    "passCenterBlockTargetId",
    rushing,
    dt,
    { screenPlay: false, laneOffsetY: 0 }
  );
}

function movePassP4Route(playKey, dt, adjustTarget = null) {
  if (adjustTarget === "p4") {
    moveToward(offenseP4, ball.targetX, ball.targetY, offenseP4.speed, dt);
    clampPlayerToField(offenseP4);
    return;
  }
  if (playKey === "passRight" || playKey === "passLeft" || playKey === "fencePost") {
    const tripsKey = playKey === "fencePost" ? "passRight" : playKey;
    const inRoute =
      typeof getTripsInRouteGeometry === "function"
        ? getTripsInRouteGeometry(tripsKey)
        : null;
    const stemEnd = inRoute?.stemEnd ?? {
      x: clampPlayableX(getOffsetX(game.playModeLineX, 10), 16),
      y: offenseP4.y,
    };
    const breakEnd = inRoute?.breakEnd ?? {
      x: stemEnd.x,
      y: FIELD.y + FIELD.height * 0.5,
    };
    if (hasNotReachedForwardX(offenseP4.x, stemEnd.x)) {
      moveToward(offenseP4, stemEnd.x, stemEnd.y, offenseP4.speed, dt);
    } else {
      runReceiverToLandmarkOrContinue(offenseP4, breakEnd.x, breakEnd.y, offenseP4.speed, dt);
    }
  } else if (
    playKey === "hayBaleHook" ||
    playKey === "barnPlay" ||
    playKey === "siloSlant" ||
    playKey === "pasturePop"
  ) {
    const crossDepth = playKey === "pasturePop" ? 10 : playKey === "siloSlant" ? 14 : 16;
    const crossX = clampPlayableX(getOffsetX(game.playModeLineX, crossDepth), 20);
    const laneY = FIELD.y + FIELD.height * 0.5;
    runReceiverToLandmarkOrContinue(offenseP4, crossX, laneY, offenseP4.speed, dt);
  } else if (playKey === "cornfieldCross") {
    if (
      typeof getCornfieldCrossSlotCurlGeometry === "function" &&
      typeof moveReceiverCurlRoute === "function"
    ) {
      if (!game.cornfieldCrossSlotCurlState) {
        game.cornfieldCrossSlotCurlState = { phase: "stem" };
      }
      moveReceiverCurlRoute(
        offenseP4,
        getCornfieldCrossSlotCurlGeometry(),
        offenseP4.speed,
        dt,
        game.cornfieldCrossSlotCurlState
      );
    }
  } else {
    moveOffenseX(offenseP4, dt, 0.88);
  }
  clampPlayerToField(offenseP4);
}

function movePassSupportRoles(playKey, rushing, dt, p4AdjustTarget = null) {
  if (
    playKey === "barnPlay" ||
    playKey === "barnDoorBoot" ||
    playKey === "cornfieldCross" ||
    playKey === "hayBaleHook" ||
    playKey === "siloSlant" ||
    playKey === "pasturePop" ||
    playKey === "fencePost"
  ) {
    movePassP4Route(playKey, dt, p4AdjustTarget);
  }
  movePassRightCenterBlock(rushing, dt);
}

function resolveCurrentPlayPassFlight(dt) {
  const playKey = game.playModeCurrentPlay;
  if (playKey === "barnPlay") {
    return resolveArcingPassFlight(dt, (stepDt) => moveBarnPlayReceivers(stepDt, game.passPlayTargetReceiver));
  }
  if (playKey === "scrambledEggs") {
    return resolveArcingPassFlight(dt, (stepDt) => moveScrambledEggsReceivers(stepDt, game.passPlayTargetReceiver));
  }
  if (playKey === "cornfieldCross") {
    return resolveArcingPassFlight(dt, (stepDt) => moveCornfieldCrossReceivers(stepDt, game.passPlayTargetReceiver));
  }
  if (playKey === "hayBaleHook") {
    return resolveArcingPassFlight(dt, (stepDt) =>
      moveHayBaleHookReceivers(stepDt, game.passPlayTargetReceiver)
    );
  }
  if (playKey === "siloSlant" || playKey === "pasturePop") {
    return resolveArcingPassFlight(dt, (stepDt) =>
      movePassPlayReceivers(stepDt, game.passPlayTargetReceiver)
    );
  }
  return resolveArcingPassFlight(dt, moveStandardPassReceiversInFlight);
}

function updatePlayModePassRight(dt) {
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;
  const tripsPass =
    game.playModeCurrentPlay === "passRight" ||
    game.playModeCurrentPlay === "passLeft" ||
    game.playModeCurrentPlay === "fencePost";
  const { rushing } = getPassDefenders();

  if (tripsPass && game.playModePhase === "snap") {
    game.playModePassSnapMs -= dt * 1000;
    // Keep center on LOS during shotgun snap; transfer ball on timer.
    offenseP5.x = game.playModeLineX;
    offenseP5.y = FIELD.y + FIELD.height / 2;
    if (game.playModePassSnapMs <= 0) {
      ball.carrier = player1;
      game.playModePhase = null;
      updateBallPosition();
    } else {
      updateBallPosition();
      moveTripsOutsideSevenPost(dt, null, game.playModeCurrentPlay === "passLeft");
      moveTripsSlotCurlRoute(dt);
      movePassP4Route(game.playModeCurrentPlay, dt);
      movePassDefenders(dt, ball);
      return;
    }
  }

  if (ball.carrier === player1 && !ball.inFlight) {
    tickPassRouteProgress(dt);
    // ── Phase 1: drop the QB back before he can throw ──
    if (!game.passPlayDropbackDone) {
      if (game.playModeCurrentPlay === "barnDoorBoot") {
        const bootX = clampPlayableX(game.playModeLineX - getOffenseDirection() * 7.5 * YARDS_TO_PIXELS, player1.radius);
        const bootY = FIELD.y + FIELD.height * 0.3;
        if (distance(player1.x, player1.y, bootX, bootY) > 6) {
          moveToward(player1, bootX, bootY, player1.speed, dt);
        } else {
          finishPassPlayDropback();
        }
      } else if (!hasReachedDropbackTarget(player1.x, game.passPlayDropbackTarget)) {
        moveToward(player1, game.passPlayDropbackTarget, player1.y, player1.speed, dt);
      } else {
        finishPassPlayDropback();
      }
      clampPlayerToField(player1);
    } else {
      // ── Phase 2: Player has full control ──
      updatePlayerInput(dt);
      if (!game.cpuOffense) {
        clampPlayerToField(player1);
      }
      if (hasCrossedLineOfScrimmage(player1.x)) {
        markQbScramblePastLine();
      }
    }

    if (resolvePassPlayQbTackle(rushing)) {
      resolvePlayModeTackle(player1, player1.x, { sack: isPassPlayQbSack(rushing) });
        updateBallPosition();
        return;
      }
    if (!game.passPlayCanThrow && hasOffenseScored(player1)) {
        finishDriveTouchdown(player1);
        return;
    }

    if (tripsPass) {
      moveTripsOutsideSevenPost(dt, null, game.playModeCurrentPlay === "passLeft");
      moveTripsSlotCurlRoute(dt);
      movePassP4Route(game.playModeCurrentPlay, dt);
      clampPlayerToField(offenseP4);
      clampPlayerToField(lilTunnelPete);
      movePassRightCenterBlock(rushing, dt);
    } else {
      moveOffenseX(allyHorse, dt);
      clampPlayerToField(allyHorse);
    }
    if (maybeRunDefenseModeCpuPass(game.playModeCurrentPlay, dt)) {
      movePassDefenders(dt, ball);
      updateBallPosition();
      return;
    }
    movePassDefenders(dt, ball);
    updateBallPosition();
    return;
  }

  if (ball.inFlight) {
    const flightResult = resolveCurrentPlayPassFlight(dt);
    if (flightResult === "incomplete") {
      setPlayDowned(game.playModeLineX, { incomplete: true });
    }
    movePassRightCenterBlock(rushing, dt);
    movePassDefenders(dt, ball);
    return;
  }

  if (ball.carrier === allyHorse) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(allyHorse, dt, allyHorse.y);
    }
    movePassRightCenterBlock(rushing, dt);
    moveDefenseTeamToward(allyHorse.x, allyHorse.y, dt);
    updateBallPosition();
    if (hasOffenseScored(allyHorse)) {
      finishDriveTouchdown(allyHorse);
      return;
    }
    if (circleTackle(allyHorse, player2) || circleTackle(allyHorse, allyDonkey) || circleTackle(allyHorse, cluckNorris)) {
      resolvePlayModeTackle(allyHorse, allyHorse.x);
      return;
    }
    return;
  }

  if (ball.carrier === lilTunnelPete) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(lilTunnelPete, dt, lilTunnelPete.y);
    }
    movePassRightCenterBlock(rushing, dt);
    moveDefenseTeamToward(lilTunnelPete.x, lilTunnelPete.y, dt);
    updateBallPosition();
    if (hasOffenseScored(lilTunnelPete)) {
      finishDriveTouchdown(lilTunnelPete);
      return;
    }
    if (circleTackle(lilTunnelPete, player2) || circleTackle(lilTunnelPete, allyDonkey) || circleTackle(lilTunnelPete, cluckNorris)) {
      resolvePlayModeTackle(lilTunnelPete, lilTunnelPete.x);
      return;
    }
    return;
  }

  if (ball.carrier === offenseP4) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(offenseP4, dt, offenseP4.y);
    }
    movePassRightCenterBlock(rushing, dt);
    moveDefenseTeamToward(offenseP4.x, offenseP4.y, dt);
    updateBallPosition();
    if (hasOffenseScored(offenseP4)) {
      finishDriveTouchdown(offenseP4);
      return;
    }
    if (circleTackle(offenseP4, player2) || circleTackle(offenseP4, allyDonkey) || circleTackle(offenseP4, cluckNorris)) {
      resolvePlayModeTackle(offenseP4, offenseP4.x);
      return;
    }
    return;
  }

  if (!ball.carrier && !ball.inFlight) {
    updatePlayerInput(dt);
    updateCPU(dt);
    updateAllies(dt);
    movePassDefenders(dt, ball);
    updateBallPosition();
    return;
  }

  if (updateInterceptionReturn(dt)) {
    return;
  }

  updateBallPosition();
}

function updatePlayModePassLeft(dt) {
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;
  const { rushing } = getPassDefenders();

  if (game.playModeCurrentPlay === "passLeft" && game.playModePhase === "snap") {
    game.playModePassSnapMs -= dt * 1000;
    offenseP5.x = game.playModeLineX;
    offenseP5.y = FIELD.y + FIELD.height / 2;
    if (game.playModePassSnapMs <= 0) {
      ball.carrier = player1;
      game.playModePhase = null;
      updateBallPosition();
    } else {
      updateBallPosition();
      moveTripsOutsideSevenPost(dt, null, true);
      moveTripsSlotCurlRoute(dt);
      movePassP4Route("passLeft", dt);
      movePassDefenders(dt, ball);
      return;
    }
  }

  if (ball.carrier === player1 && !ball.inFlight) {
    tickPassRouteProgress(dt);
    // ── Phase 1: CPU drops QB back 10 yards ──
    if (!game.passPlayDropbackDone) {
      if (game.playModeCurrentPlay === "barnDoorBoot") {
        updateBarnDoorBootQbMotion(dt);
        if (game.barnDoorBootStage >= 3) {
          finishPassPlayDropback();
        }
      } else if (!hasReachedDropbackTarget(player1.x, game.passPlayDropbackTarget)) {
        moveToward(player1, game.passPlayDropbackTarget, player1.y, player1.speed, dt);
      } else {
        finishPassPlayDropback();
      }
      clampPlayerToField(player1);
    } else {
      // ── Phase 2: Player has full control ──
      updatePlayerInput(dt);
      if (!game.cpuOffense) {
        clampPlayerToField(player1);
      }
      if (hasCrossedLineOfScrimmage(player1.x)) {
        markQbScramblePastLine();
      }
    }

    if (resolvePassPlayQbTackle(rushing)) {
      resolvePlayModeTackle(player1, player1.x, { sack: isPassPlayQbSack(rushing) });
        updateBallPosition();
        return;
      }
    if (!game.passPlayCanThrow && hasOffenseScored(player1)) {
        finishDriveTouchdown(player1);
        return;
    }

    if (game.playModeCurrentPlay === "barnDoorBoot") {
      moveBarnDoorBootReceivers(dt);
    } else {
      moveTripsOutsideSevenPost(dt, null, true);
      moveTripsSlotCurlRoute(dt);
      movePassP4Route(game.playModeCurrentPlay, dt);
      clampPlayerToField(allyHorse);
      clampPlayerToField(lilTunnelPete);
      clampPlayerToField(offenseP4);
      movePassRightCenterBlock(rushing, dt);
    }
    if (maybeRunDefenseModeCpuPass(game.playModeCurrentPlay, dt)) {
      movePassDefenders(dt, ball);
      updateBallPosition();
      return;
    }
    movePassDefenders(dt, ball);
    updateBallPosition();
    return;
  }

  if (ball.inFlight) {
    const flightResult = resolveCurrentPlayPassFlight(dt);
    if (flightResult === "incomplete") {
      setPlayDowned(game.playModeLineX, { incomplete: true });
    }
    movePassRightCenterBlock(rushing, dt);
    movePassDefenders(dt, ball);
    return;
  }

  if (ball.carrier === allyHorse) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(allyHorse, dt, allyHorse.y);
    }
    movePassRightCenterBlock(rushing, dt);
    moveDefenseTeamToward(allyHorse.x, allyHorse.y, dt);
    updateBallPosition();
    if (hasOffenseScored(allyHorse)) {
      finishDriveTouchdown(allyHorse);
      return;
    }
    if (circleTackle(allyHorse, player2) || circleTackle(allyHorse, allyDonkey) || circleTackle(allyHorse, cluckNorris)) {
      resolvePlayModeTackle(allyHorse, allyHorse.x);
      return;
    }
    return;
  }

  if (ball.carrier === lilTunnelPete) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(lilTunnelPete, dt, lilTunnelPete.y);
    }
    movePassRightCenterBlock(rushing, dt);
    moveDefenseTeamToward(lilTunnelPete.x, lilTunnelPete.y, dt);
    updateBallPosition();
    if (hasOffenseScored(lilTunnelPete)) {
      finishDriveTouchdown(lilTunnelPete);
      return;
    }
    if (circleTackle(lilTunnelPete, player2) || circleTackle(lilTunnelPete, allyDonkey) || circleTackle(lilTunnelPete, cluckNorris)) {
      resolvePlayModeTackle(lilTunnelPete, lilTunnelPete.x);
      return;
    }
    return;
  }

  if (ball.carrier === offenseP4) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(offenseP4, dt, offenseP4.y);
    }
    movePassRightCenterBlock(rushing, dt);
    moveDefenseTeamToward(offenseP4.x, offenseP4.y, dt);
    updateBallPosition();
    if (hasOffenseScored(offenseP4)) {
      finishDriveTouchdown(offenseP4);
      return;
    }
    if (circleTackle(offenseP4, player2) || circleTackle(offenseP4, allyDonkey) || circleTackle(offenseP4, cluckNorris)) {
      resolvePlayModeTackle(offenseP4, offenseP4.x);
      return;
    }
    return;
  }

  if (!ball.carrier && !ball.inFlight) {
    updatePlayerInput(dt);
    updateCPU(dt);
    updateAllies(dt);
    movePassDefenders(dt, ball);
    updateBallPosition();
    return;
  }

  if (updateInterceptionReturn(dt)) {
    return;
  }

  updateBallPosition();
}

function positionForCornfieldCross() {
  const lineX = game.playModeLineX;
  applyFormationForPlay("cornfieldCross", lineX);
  positionDefenseForPlay(allyHorse.y);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.passPlayDropbackDone = false;
  game.passPlayCanThrow = true;
  game.passPlayTargetReceiver = null;
  game.passPlayDropbackTarget = getPassDropbackTarget(lineX);
  game.playModePassSnapMs = 220;
  game.cornfieldCrossSlotCurlState = null;
  game.rushReactionTimer = 0;
  game.passJamWindowMs = game.cpuOffense && game.defensePressJam ? 950 : 0;
  setMobileAimForwardFromQB();
}

function positionForBarnDoorBoot() {
  const lineX = game.playModeLineX;
  applyFormationForPlay("barnDoorBoot", lineX);
  positionDefenseForPlay(allyHorse.y);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.passPlayDropbackDone = false;
  game.passPlayCanThrow = true;
  game.passPlayTargetReceiver = null;
  game.passPlayDropbackTarget = getPassDropbackTarget(lineX);
  game.rushReactionTimer = 0;
  game.passJamWindowMs = game.cpuOffense && game.defensePressJam ? 950 : 0;
  setMobileAimForwardFromQB();
}

function updatePlayModeBarnPlay(dt) {
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;
  const { rushing } = getPassDefenders();

  if (updateShotgunCenterSnapPhase(dt, (stepDt) => {
    movePassPlayReceivers(stepDt);
  })) {
    return;
  }

  if (ball.carrier === player1 && !ball.inFlight) {
    tickPassRouteProgress(dt);
    if (!game.passPlayDropbackDone) {
      if (!hasReachedDropbackTarget(player1.x, game.passPlayDropbackTarget)) {
        moveToward(player1, game.passPlayDropbackTarget, player1.y, player1.speed, dt);
      } else {
        finishPassPlayDropback();
      }
      clampPlayerToField(player1);
    } else {
      updatePlayerInput(dt);
      if (!game.cpuOffense) {
        clampPlayerToField(player1);
      }
      if (hasCrossedLineOfScrimmage(player1.x)) {
        markQbScramblePastLine();
      }
    }

    if (resolvePassPlayQbTackle(rushing)) {
      resolvePlayModeTackle(player1, player1.x, { sack: isPassPlayQbSack(rushing) });
        updateBallPosition();
        return;
      }
    if (!game.passPlayCanThrow && hasOffenseScored(player1)) {
        finishDriveTouchdown(player1);
        return;
    }

    movePassPlayReceivers(dt);
    movePassSupportRoles(
      game.playModeCurrentPlay,
      rushing,
      dt,
      game.passPlayTargetReceiver === "p4" ? "p4" : null
    );
    if (maybeRunDefenseModeCpuPass(game.playModeCurrentPlay, dt)) {
      movePassDefenders(dt, ball);
      updateBallPosition();
      return;
    }
    movePassDefenders(dt, ball);
    updateBallPosition();
    return;
  }

  if (ball.inFlight) {
    const flightResult = resolveCurrentPlayPassFlight(dt);
    if (flightResult === "incomplete") {
      setPlayDowned(game.playModeLineX, { incomplete: true });
    }
    movePassSupportRoles(game.playModeCurrentPlay, rushing, dt);
    movePassDefenders(dt, ball);
    return;
  }

  if (ball.carrier === allyHorse) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(allyHorse, dt, allyHorse.y);
    }
    movePassSupportRoles(game.playModeCurrentPlay, rushing, dt);
    moveDefenseTeamToward(allyHorse.x, allyHorse.y, dt);
    updateBallPosition();
    if (hasOffenseScored(allyHorse)) {
      finishDriveTouchdown(allyHorse);
      return;
    }
    if (circleTackle(allyHorse, player2) || circleTackle(allyHorse, allyDonkey) || circleTackle(allyHorse, cluckNorris)) {
      resolvePlayModeTackle(allyHorse, allyHorse.x);
      return;
    }
    return;
  }

  if (ball.carrier === lilTunnelPete) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(lilTunnelPete, dt, lilTunnelPete.y);
    }
    movePassSupportRoles(game.playModeCurrentPlay, rushing, dt);
    moveDefenseTeamToward(lilTunnelPete.x, lilTunnelPete.y, dt);
    updateBallPosition();
    if (hasOffenseScored(lilTunnelPete)) {
      finishDriveTouchdown(lilTunnelPete);
      return;
    }
    if (circleTackle(lilTunnelPete, player2) || circleTackle(lilTunnelPete, allyDonkey) || circleTackle(lilTunnelPete, cluckNorris)) {
      resolvePlayModeTackle(lilTunnelPete, lilTunnelPete.x);
      return;
    }
    return;
  }

  if (ball.carrier === offenseP4) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(offenseP4, dt, offenseP4.y);
    }
    movePassSupportRoles(game.playModeCurrentPlay, rushing, dt);
    moveDefenseTeamToward(offenseP4.x, offenseP4.y, dt);
    updateBallPosition();
    if (hasOffenseScored(offenseP4)) {
      finishDriveTouchdown(offenseP4);
      return;
    }
    if (circleTackle(offenseP4, player2) || circleTackle(offenseP4, allyDonkey) || circleTackle(offenseP4, cluckNorris)) {
      resolvePlayModeTackle(offenseP4, offenseP4.x);
      return;
    }
    return;
  }

  if (!ball.carrier && !ball.inFlight) {
    updatePlayerInput(dt);
    updateCPU(dt);
    updateAllies(dt);
    movePassDefenders(dt, ball);
    updateBallPosition();
    return;
  }

  if (updateInterceptionReturn(dt)) {
    return;
  }

  updateBallPosition();
}

function updatePlayModeScrambledEggs(dt) {
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;
  const { rushing } = getPassDefenders();

  if (updateShotgunCenterSnapPhase(dt, moveScrambledEggsReceivers)) {
    return;
  }

  if (ball.carrier === player1 && !ball.inFlight) {
    tickPassRouteProgress(dt);
    if (!game.passPlayDropbackDone) {
      if (!hasReachedDropbackTarget(player1.x, game.passPlayDropbackTarget)) {
        moveToward(player1, game.passPlayDropbackTarget, player1.y, player1.speed, dt);
      } else {
        finishPassPlayDropback();
      }
      clampPlayerToField(player1);
    } else {
      updatePlayerInput(dt);
      if (!game.cpuOffense) {
        clampPlayerToField(player1);
      }
      if (hasCrossedLineOfScrimmage(player1.x)) {
        markQbScramblePastLine();
      }
    }

    if (resolvePassPlayQbTackle(rushing)) {
      resolvePlayModeTackle(player1, player1.x, { sack: isPassPlayQbSack(rushing) });
        updateBallPosition();
        return;
      }
    if (!game.passPlayCanThrow && hasOffenseScored(player1)) {
        finishDriveTouchdown(player1);
        return;
    }

    moveScrambledEggsReceivers(dt);
    movePassSupportRoles(
      game.playModeCurrentPlay,
      rushing,
      dt,
      game.passPlayTargetReceiver === "p4" ? "p4" : null
    );
    if (maybeRunDefenseModeCpuPass("scrambledEggs", dt)) {
      movePassDefenders(dt, ball);
      updateBallPosition();
      return;
    }
    movePassDefenders(dt, ball);
    updateBallPosition();
    return;
  }

  if (ball.inFlight) {
    const flightResult = resolveCurrentPlayPassFlight(dt);
    if (flightResult === "incomplete") {
      setPlayDowned(game.playModeLineX, { incomplete: true });
    }
    movePassSupportRoles(game.playModeCurrentPlay, rushing, dt);
    movePassDefenders(dt, ball);
    return;
  }

  if (ball.carrier === allyHorse) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(allyHorse, dt, allyHorse.y);
    }
    movePassSupportRoles(game.playModeCurrentPlay, rushing, dt);
    moveDefenseTeamToward(allyHorse.x, allyHorse.y, dt);
    updateBallPosition();
    if (hasOffenseScored(allyHorse)) {
      finishDriveTouchdown(allyHorse);
      return;
    }
    if (circleTackle(allyHorse, player2) || circleTackle(allyHorse, allyDonkey) || circleTackle(allyHorse, cluckNorris)) {
      resolvePlayModeTackle(allyHorse, allyHorse.x);
      return;
    }
    return;
  }

  if (ball.carrier === lilTunnelPete) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(lilTunnelPete, dt, lilTunnelPete.y);
    }
    movePassSupportRoles(game.playModeCurrentPlay, rushing, dt);
    moveDefenseTeamToward(lilTunnelPete.x, lilTunnelPete.y, dt);
    updateBallPosition();
    if (hasOffenseScored(lilTunnelPete)) {
      finishDriveTouchdown(lilTunnelPete);
      return;
    }
    if (circleTackle(lilTunnelPete, player2) || circleTackle(lilTunnelPete, allyDonkey) || circleTackle(lilTunnelPete, cluckNorris)) {
      resolvePlayModeTackle(lilTunnelPete, lilTunnelPete.x);
      return;
    }
    return;
  }

  if (ball.carrier === offenseP4) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(offenseP4, dt, offenseP4.y);
    }
    movePassSupportRoles(game.playModeCurrentPlay, rushing, dt);
    moveDefenseTeamToward(offenseP4.x, offenseP4.y, dt);
    updateBallPosition();
    if (hasOffenseScored(offenseP4)) {
      finishDriveTouchdown(offenseP4);
      return;
    }
    if (circleTackle(offenseP4, player2) || circleTackle(offenseP4, allyDonkey) || circleTackle(offenseP4, cluckNorris)) {
      resolvePlayModeTackle(offenseP4, offenseP4.x);
      return;
    }
    return;
  }

  if (!ball.carrier && !ball.inFlight) {
    updatePlayerInput(dt);
    updateCPU(dt);
    updateAllies(dt);
    movePassDefenders(dt, ball);
    updateBallPosition();
    return;
  }

  if (updateInterceptionReturn(dt)) {
    return;
  }

  updateBallPosition();
}

function updateScorePause(dt) {
  game.scorePauseTimer -= dt * 1000;
  if (game.scorePauseTimer <= 0) {
    game.scorePauseTimer = 0;
    game.scoredBy = null;
    resetPositions();
    game.state = "playing";
  }
}

function updateTouchdownPopup(dt) {
  game.touchdownPopupTimer -= dt * 1000;
  if (game.touchdownPopupTimer <= 0) {
    game.touchdownPopupTimer = 0;
    if (game.afterTouchdownAction === "restartDefense") {
      game.afterTouchdownAction = null;
      if (shouldUseSessionPossessionRecap()) {
        beginSessionPossessionRecap();
      } else {
        startSessionDriveAtRedTwenty(true);
      }
      return;
    }
    if (game.afterTouchdownAction === "startPlayModeDrive") {
      if (game.patKickScorerIsPlayer1) {
        game.state = "postTouchdownChoice";
      } else {
        beginCpuPostTouchdownKickAttempt();
      }
    }
  }
}

function updateKickoffFlagPopup(dt) {
  game.kickoffFlagPopupTimer -= dt * 1000;
  if (game.kickoffFlagPopupTimer <= 0) {
    game.kickoffFlagPopupTimer = 0;
    finishKickoffTouchback();
  }
}

function updateSafetyPopup(dt) {
  game.safetyPopupTimer -= dt * 1000;
  if (game.safetyPopupTimer <= 0) {
    game.safetyPopupTimer = 0;
    const scoringCpu = !game.safetyAgainstCpuOffense;
    if (game.playUserTeamId && game.teamScores) {
      const scoringTeamId = scoringCpu ? game.playCpuTeamId : game.playUserTeamId;
      addTeamScorePoints(scoringTeamId, 2);
    } else if (scoringCpu) {
      player2.score += 2;
    } else {
      player1.score += 2;
    }
    game.safetyAgainstCpuOffense = false;
    if (playSessionTracksFullGameScore()) {
      beginNextPlaySessionSeries(scoringCpu);
    } else {
      handlePlaySessionSeriesEnd();
    }
  }
}

function updateWinPopup(dt) {
  game.winPopupTimer -= dt * 1000;
  if (game.winPopupTimer <= 0) {
    returnToHomeMenu();
  }
}

function updateInterceptionPopup(dt) {
  game.interceptionPopupTimer -= dt * 1000;
  if (game.interceptionPopupTimer <= 0) {
    game.interceptionPopupTimer = 0;
    game.state = "playing";
  }
}

function update(dt) {
  if (game.state === "playCoinToss") {
    updateCoinToss(dt);
    return;
  }
  if (game.state === "playModeDowned") {
    if (game.fieldCelebrationTimer > 0) {
      game.fieldCelebrationTimer -= dt * 1000;
      if (game.fieldCelebrationTimer <= 0) {
        game.fieldCelebrationTimer = 0;
        game.fieldCelebrationType = null;
      }
    }
    return;
  }
  if (game.state === "puntAim") {
    updatePuntAim(dt);
    return;
  }
  if (game.state === "kickoffAim") {
    updatePuntAim(dt);
    return;
  }
  if (game.state === "kickoffPlay") {
    updateKickoffPlaySequence(dt);
    updateGameClock(dt);
    return;
  }
  if (game.state === "kickoffFlagPopup") {
    updateKickoffFlagPopup(dt);
    return;
  }
  if (game.state === "halftimePopup") {
    updateHalftimePopup(dt);
    return;
  }
  if (game.state === "menu" || game.state === "playSessionSelect" || game.state === "playDevTraitsGuide" || game.state === "franchiseMain" || game.state === "franchiseHub" || game.state === "franchisePlaySelect" || game.state === "playTeamSelect" || game.state === "playOpponentReveal" || game.state === "pauseMenu" || game.state === "statsMenu" || game.state === "settingsMenu" || game.state === "playModePlaySelect") {
    maybeCheckClockAfterStoppage();
    return;
  }
  if (game.state === "prePlayCadence") {
    updatePrePlayCadence(dt);
    updateGameClock(dt);
    return;
  }
  if (game.state === "instantReplay") {
    updateInstantReplay(dt);
    return;
  }
  if (game.state === "safetyPopup") {
    updateSafetyPopup(dt);
    return;
  }
  if (game.state === "postTouchdownChoice") {
    return;
  }
  if (game.state === "touchdownPopup") {
    updateTouchdownPopup(dt);
    return;
  }
  if (game.state === "patKick") {
    updatePatKick(dt);
    return;
  }
  if (game.state === "winPopup") {
    updateWinPopup(dt);
    return;
  }
  if (game.state === "interceptionPopup") {
    updateInterceptionPopup(dt);
    return;
  }
  if (game.state === "playing") {
    updatePlaying(dt);
    updateGameClock(dt);
  } else if (game.state === "scorePause") {
    updateScorePause(dt);
  } else if (game.state === "paused") {
    // Do nothing while paused; keep scene rendered as-is
  } else if (game.state === "gameOver") {
    updateBallPosition();
  }
}

// =========================================================
// Main Game Loop
// =========================================================
function gameLoop(timestamp) {
  if (!game.lastTime) game.lastTime = timestamp;
  const dt = Math.min((timestamp - game.lastTime) / 1000, 0.033);
  game.lastTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

// =========================================================
// Start (menu first; game starts when mode is chosen)
// =========================================================
requestAnimationFrame(gameLoop);

