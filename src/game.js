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
  return distance(carrier.x, carrier.y, defender.x, defender.y) <= carrier.radius;
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
  ball.x = FIELD.x + FIELD.width / 2;
  ball.y = FIELD.y + FIELD.height / 2;
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
// 1 yard = 1/100 of playable field; 10 yards = 1/10 of field
const YARDS_TO_PIXELS = (FIELD.width - FIELD.endZoneWidth * 2) / 100;

function positionDefenseA(qbX, qbY) {
  // Pig & Hee Haw: 5 yds right, split top/bottom; Big Coop: 20 yds right, middle
  const closeX = getOffsetX(qbX, 5);
  const deepX  = getOffsetX(qbX, 20);
  player2.x    = closeX;
  player2.y    = FIELD.y + FIELD.height * 0.2;
  allyDonkey.x = closeX;
  allyDonkey.y = FIELD.y + FIELD.height * 0.8;
  cluckNorris.x = deepX;
  cluckNorris.y = FIELD.y + FIELD.height * 0.5;
}

function positionDefenseB(qbX, qbY) {
  // Pig & Hee Haw: 20 yds right, split top/bottom; Big Coop: 5 yds right, middle
  const closeX = getOffsetX(qbX, 5);
  const deepX  = getOffsetX(qbX, 20);
  player2.x    = deepX;
  player2.y    = FIELD.y + FIELD.height * 0.2;
  allyDonkey.x = deepX;
  allyDonkey.y = FIELD.y + FIELD.height * 0.8;
  cluckNorris.x = closeX;
  cluckNorris.y = FIELD.y + FIELD.height * 0.5;
}

function positionDefenseC(qbX, qbY) {
  // De-fence: same front as Run Defense, but Big Coop walks up to the line too
  const closeX = getOffsetX(qbX, 5);
  player2.x = closeX;
  player2.y = FIELD.y + FIELD.height * 0.2;
  allyDonkey.x = closeX;
  allyDonkey.y = FIELD.y + FIELD.height * 0.8;
  cluckNorris.x = closeX;
  cluckNorris.y = FIELD.y + FIELD.height * 0.5;
}

function positionDefenseD(qbX, qbY) {
  // Prevent: same shell as De-fence, but everyone starts 15 yards deeper
  const deepX = getOffsetX(qbX, 20);
  player2.x = deepX;
  player2.y = FIELD.y + FIELD.height * 0.2;
  allyDonkey.x = deepX;
  allyDonkey.y = FIELD.y + FIELD.height * 0.8;
  cluckNorris.x = deepX;
  cluckNorris.y = FIELD.y + FIELD.height * 0.5;
}

// Returns {covering, rushing} defender references for pass plays
function getPassDefenders() {
  if (game.cpuOffense) {
    const rushing = getSelectedPassRusher();
    const covering = getDefenderById(game.passDefCoverHorseId);
    return { covering, rushing };
  }
  if (game.playModeDefense === "B" || game.playModeDefense === "D") {
    const covering = game.passDefCovering === "pig" ? player2 : allyDonkey;
    const rushing  = game.passDefRushing  === "pig" ? player2 : allyDonkey;
    return { covering, rushing };
  }
  // Defenses A/C: Pig rushes, Hee Haw covers (with reaction delay handled at call site)
  return { covering: allyDonkey, rushing: player2 };
}

function isPocketPassRusherTackle(rushingDefender) {
  if (circleTackle(player1, rushingDefender)) return true;
  if (!game.cpuOffense && circleTackle(player1, cluckNorris)) return true;
  return false;
}

function positionDefenseForPlay(wrY) {
  game.passDefCovering = null;
  game.passDefRushing = null;
  game.passDefDeepTarget = null;
  game.defenseReactionTimer = 0;
  let defenseChoice = game.selectedDefense;
  if (defenseChoice === "random") {
    const choices = ["A", "B", "C", "D"];
    defenseChoice = choices[Math.floor(Math.random() * choices.length)];
  }

  if (defenseChoice === "A") {
    game.playModeDefense = "A";
    positionDefenseA(player1.x, player1.y);
    // Pass play: 550ms coverage delay for Hee Haw; run play: 500ms delay for both defenders
    game.defenseReactionTimer = (wrY !== undefined) ? 550 : 500;
    game.cluckNorrisTimer = (wrY !== undefined) ? 1000 : 750;
  } else if (defenseChoice === "B" || defenseChoice === "D") {
    game.playModeDefense = defenseChoice;
    if (defenseChoice === "B") {
      positionDefenseB(player1.x, player1.y);
    } else {
      positionDefenseD(player1.x, player1.y);
    }
    game.cluckNorrisTimer = (wrY !== undefined) ? 1000 : 750;
    // Pass-focused defenses B/D: randomly assign all three defenders
    if (wrY !== undefined) {
      // Cluck Norris randomly picks one receiver to shadow
      game.passDefDeepTarget = Math.random() < 0.5 ? "horse" : "pete";
      // Upfront pair: one rushes, one covers the other receiver
      if (Math.random() < 0.5) {
        game.passDefCovering = "pig";
        game.passDefRushing  = "donkey";
      } else {
        game.passDefCovering = "donkey";
        game.passDefRushing  = "pig";
      }
    }
  } else {
    game.playModeDefense = "C";
    positionDefenseC(player1.x, player1.y);
    game.defenseReactionTimer = (wrY !== undefined) ? 550 : 500;
    game.cluckNorrisTimer = (wrY !== undefined) ? 650 : 400;
  }

  if (game.cpuOffense && wrY !== undefined) {
    assignUserPassCoverageRoles();
  }
}

function getLeftTenYardLineX() {
  return FIELD.x + FIELD.endZoneWidth + 10 * YARDS_TO_PIXELS;
}

function getLeftTwentyYardLineX() {
  return FIELD.x + FIELD.endZoneWidth + 20 * YARDS_TO_PIXELS;
}

function getLeftFortyYardLineX() {
  return FIELD.x + FIELD.endZoneWidth + 40 * YARDS_TO_PIXELS;
}

function previewDefensePositions() {
  if (game.selectedDefense === "A") {
    positionDefenseA(player1.x, player1.y);
  } else if (game.selectedDefense === "B") {
    positionDefenseB(player1.x, player1.y);
  } else if (game.selectedDefense === "C") {
    positionDefenseC(player1.x, player1.y);
  } else if (game.selectedDefense === "D") {
    positionDefenseD(player1.x, player1.y);
  } else {
    const choices = [positionDefenseA, positionDefenseB, positionDefenseC, positionDefenseD];
    choices[Math.floor(Math.random() * choices.length)](player1.x, player1.y);
  }
}

function getDefenseControlledPlayer() {
  if (game.defenseModeControlledPlayerId === "donkey") return allyDonkey;
  if (game.defenseModeControlledPlayerId === "cluck") return cluckNorris;
  return player2;
}

function getDefenderById(id) {
  if (id === "allyDonkey" || id === "donkey") return allyDonkey;
  if (id === "cluckNorris" || id === "cluck") return cluckNorris;
  return player2;
}

function getDefenderId(entity) {
  if (entity === allyDonkey) return "allyDonkey";
  if (entity === cluckNorris) return "cluckNorris";
  return "player2";
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

function assignUserPassCoverageRoles() {
  const rusher = getSelectedPassRusher();
  game.passDefRushing = getDefenderId(rusher);
  const defenders = [player2, allyDonkey, cluckNorris].filter((d) => d !== rusher);
  const [a, b] = defenders;
  const costA = distance(a.x, a.y, allyHorse.x, allyHorse.y) + distance(b.x, b.y, lilTunnelPete.x, lilTunnelPete.y);
  const costB = distance(b.x, b.y, allyHorse.x, allyHorse.y) + distance(a.x, a.y, lilTunnelPete.x, lilTunnelPete.y);
  if (costA <= costB) {
    game.passDefCoverHorseId = getDefenderId(a);
    game.passDefCoverPeteId = getDefenderId(b);
  } else {
    game.passDefCoverHorseId = getDefenderId(b);
    game.passDefCoverPeteId = getDefenderId(a);
  }
}

function getJamDefenderForReceiver(receiver) {
  if (!game.cpuOffense) return null;
  if (receiver === allyHorse) return getDefenderById(game.passDefCoverHorseId);
  if (receiver === lilTunnelPete) return getDefenderById(game.passDefCoverPeteId);
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
}

function moveCpuOffenseCarrier(carrier, dt, laneY = carrier.y) {
  const targetY = clamp(laneY, FIELD.y + carrier.radius, FIELD.y + FIELD.height - carrier.radius);
  const targetX = getOffenseDirection() > 0 ? FIELD.x + FIELD.width - FIELD.endZoneWidth + 18 : FIELD.x + 20;
  moveToward(carrier, targetX, targetY, carrier.speed * 0.84, dt);
  clampPlayerToField(carrier);
}

function moveQuarterbackRunBlock(carrier, dt) {
  if (!carrier) return;

  const defenders = [player2, allyDonkey, cluckNorris];
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

function getOffsetX(baseX, yards) {
  return baseX + getOffenseDirection() * yards * YARDS_TO_PIXELS;
}

function getOffsetXPx(baseX, pixels) {
  return baseX + getOffenseDirection() * pixels;
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

function moveOffenseX(entity, dt, speedMultiplier = 1) {
  let mult = speedMultiplier;
  const isPassPlay = game.playModeCurrentPlay === "passRight" ||
    game.playModeCurrentPlay === "passLeft" ||
    game.playModeCurrentPlay === "barnPlay" ||
    game.playModeCurrentPlay === "scrambledEggs";
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
      mult *= 0.34;
      entity.y += (jamDef.y > entity.y ? -1 : 1) * 26 * dt;
    }
  }
  entity.x += getOffenseDirection() * entity.speed * dt * mult;
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

function applyDefaultFieldRoles() {
  game.turnoverSeriesActive = false;

  [player1, player2, allyHorse, allyDonkey, cluckNorris, lilTunnelPete].forEach((e) => {
    delete e.teamTag;
  });

  player1.displayLabel = "Barnaby";
  player1.appearanceId = "player1";
  player1.color = COLORS.donkey;
  player1.ballAccent = "#bfdbfe";
  player1.teamOwnerId = "player1";

  allyHorse.displayLabel = "Sir Neigh-a-Lot";
  allyHorse.appearanceId = "allyHorse";
  allyHorse.color = COLORS.horse;
  allyHorse.ballAccent = "#fed7aa";
  allyHorse.teamOwnerId = "player1";

  lilTunnelPete.displayLabel = "Lil' Tunnel Pete";
  lilTunnelPete.appearanceId = "lilTunnelPete";
  lilTunnelPete.color = "#c8a97e";
  lilTunnelPete.ballAccent = "#fef08a";
  lilTunnelPete.teamOwnerId = "player1";

  player2.displayLabel = "Professor Pig";
  player2.appearanceId = "player2";
  player2.color = COLORS.pig;
  player2.ballAccent = "#fbcfe8";
  player2.teamOwnerId = "player2";

  allyDonkey.displayLabel = "Deputy Hee-Haw";
  allyDonkey.appearanceId = "allyDonkey";
  allyDonkey.color = COLORS.sidekickDonkey;
  allyDonkey.ballAccent = "#bbf7d0";
  allyDonkey.teamOwnerId = "player2";

  cluckNorris.displayLabel = "Big Coop";
  cluckNorris.appearanceId = "cluckNorris";
  cluckNorris.color = "#ffffff";
  cluckNorris.ballAccent = "#fca5a5";
  cluckNorris.teamOwnerId = "player2";
}

function applyTurnoverFieldRoles() {
  game.turnoverSeriesActive = true;

  if (game.playUserTeamId && game.playCpuTeamId) {
    applyPlayModeTeamLayout(game.playCpuTeamId, game.playUserTeamId);
    return;
  }

  player1.displayLabel = "Professor Pig";
  player1.appearanceId = "player2";
  player1.color = COLORS.pig;
  player1.ballAccent = "#fbcfe8";
  player1.teamOwnerId = "player2";

  allyHorse.displayLabel = "Deputy Hee-Haw";
  allyHorse.appearanceId = "allyDonkey";
  allyHorse.color = COLORS.sidekickDonkey;
  allyHorse.ballAccent = "#bbf7d0";
  allyHorse.teamOwnerId = "player2";

  lilTunnelPete.displayLabel = "Big Coop";
  lilTunnelPete.appearanceId = "cluckNorris";
  lilTunnelPete.color = "#ffffff";
  lilTunnelPete.ballAccent = "#fca5a5";
  lilTunnelPete.teamOwnerId = "player2";

  player2.displayLabel = "Barnaby";
  player2.appearanceId = "player1";
  player2.color = COLORS.donkey;
  player2.ballAccent = "#bfdbfe";
  player2.teamOwnerId = "player1";

  allyDonkey.displayLabel = "Sir Neigh-a-Lot";
  allyDonkey.appearanceId = "allyHorse";
  allyDonkey.color = COLORS.horse;
  allyDonkey.ballAccent = "#fed7aa";
  allyDonkey.teamOwnerId = "player1";

  cluckNorris.displayLabel = "Lil' Tunnel Pete";
  cluckNorris.appearanceId = "lilTunnelPete";
  cluckNorris.color = "#c8a97e";
  cluckNorris.ballAccent = "#fef08a";
  cluckNorris.teamOwnerId = "player1";
}

function getScoringTeamForPlayer(player) {
  return player.teamOwnerId === "player2" ? player2 : player1;
}

function startTurnoverDefenseSeries(fromX) {
  applyTurnoverFieldRoles();
  startPlayModeDriveCpuOffense(fromX);
}

function isDefenderEntity(entity) {
  return entity === player2 || entity === allyDonkey || entity === cluckNorris;
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
      updateBallPosition();
      return winner.entity === allyHorse ? "horse" : "pete";
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
    moveDefensePlayer(player2, carrier.x + 24, carrier.y, player2.speed * 0.92, dt);
  }
  if (carrier !== allyDonkey) {
    moveDefensePlayer(allyDonkey, carrier.x + 24, carrier.y + 28, allyDonkey.speed * 0.92, dt);
  }
  if (carrier !== cluckNorris) {
    moveDefensePlayer(cluckNorris, carrier.x + 24, carrier.y - 28, cluckNorris.speed * 0.92, dt);
  }

  moveOffensePursuitToCarrier(carrier, dt, game.cpuOffense);
  updateBallPosition();

  if (carrier.x <= leftEndZoneRight) {
    finishDriveTouchdown(carrier);
    return true;
  }

  if (circleTackle(carrier, player1) || circleTackle(carrier, allyHorse) || circleTackle(carrier, lilTunnelPete)) {
    if (shouldFumbleOnTackle()) {
      looseBallFromFumble(carrier);
      return true;
    }
    const deadBallX = carrier.x;
    if (game.turnoverSeriesActive) {
      startPlayModeDrive(deadBallX);
    } else {
      startTurnoverDefenseSeries(deadBallX);
    }
    return true;
  }

  return true;
}

function returnToHomeMenu() {
  applyDefaultFieldRoles();
  game.playUserTeamId = null;
  game.playCpuTeamId = null;
  game.teamScores = null;
  game.teamSelectUser = null;
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
  const dir = getOffenseDirection();
  const spot = game.lastTouchdownSpotX != null ? game.lastTouchdownSpotX : getOffenseTouchdownEdgeX();
  return clampPlayableX(spot - dir * 2 * YARDS_TO_PIXELS, player1.radius);
}

function resumeAfterPostTouchdownScore() {
  if (game.afterTouchdownAction !== "startPlayModeDrive") {
    return;
  }
  game.afterTouchdownAction = null;
  if (tryPlayModePointsWinFromCurrentScore()) {
    return;
  }
  const nextCpuOffense = !game.cpuOffense;
  beginKickoffAim(nextCpuOffense);
}

function beginTwoPointConversionAttempt() {
  game.twoPointAttemptActive = true;
  game.playModeDown = 1;
  game.playModeLineX = getTwoPointConversionLineX();
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
    if (!game.teamScores) resetPlayModeTeamScores();
    game.teamScores[scorer.teamTag] += 2;
    if (game.teamScores[game.playCpuTeamId] >= CONFIG.playModePointsToWin) {
      game.state = "gameOver";
      game.winner = player2;
      return;
    }
    if (game.teamScores[game.playUserTeamId] >= CONFIG.playModePointsToWin) {
      game.state = "winPopup";
      game.winPopupTimer = 3000;
      game.afterTouchdownAction = null;
      return;
    }
  } else {
    const scoringTeam = getScoringTeamForPlayer(scorer);
    scoringTeam.score += 2;
    if (game.cpuOffense && scoringTeam.score >= CONFIG.playModePointsToWin) {
      game.state = "gameOver";
      game.winner = scoringTeam;
      return;
    }
    if (game.mode === "play" && scoringTeam === player2 && player2.score >= CONFIG.playModePointsToWin) {
      game.state = "gameOver";
      game.winner = player2;
      return;
    }
    if (game.mode === "play" && scoringTeam === player1 && player1.score >= CONFIG.playModePointsToWin) {
      game.state = "winPopup";
      game.winPopupTimer = 3000;
      game.afterTouchdownAction = null;
      return;
    }
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

function beginKickoffAim(nextCpuOffense) {
  game.state = "puntAim";
  game.puntAimCharge = 0;
  game.puntAimHoldMs = 0;
  game.puntAimOvercooked = false;
  game.puntAimCharging = false;
  game.kickoffActive = true;
  game.kickoffReceivingCpuOffense = !!nextCpuOffense;
}

function resolveKickoffResult(charge, overcooked) {
  const receivingSpot = overcooked
    ? getLeftFortyYardLineX()
    : clampPlayableX(
        FIELD.x + FIELD.endZoneWidth + (22 + Math.round(charge * 16)) * YARDS_TO_PIXELS,
        player1.radius
      );
  game.kickoffActive = false;
  if (game.kickoffReceivingCpuOffense) {
    startPlayModeDriveCpuOffense(receivingSpot);
  } else {
    startPlayModeDrive(receivingSpot);
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
  if (game.kickoffActive) {
    resolveKickoffResult(charge, oc);
    return;
  }
  game.puntDistanceYards = computePuntDistanceYards(charge, oc);
  game.puntBlocked = false;
  game.puntAimCharging = false;
  startPuntPlayAfterSetup();
}

function positionPuntPlay() {
  const lineX = game.playModeLineX;
  const dir = getOffenseDirection();
  const midY = FIELD.y + FIELD.height / 2;
  const rocketLaneY = FIELD.y + 36;
  player1.x = lineX - dir * 20 * YARDS_TO_PIXELS;
  player1.y = midY;
  lilTunnelPete.x = lineX;
  lilTunnelPete.y = midY;
  allyHorse.x = lineX - dir * 9 * YARDS_TO_PIXELS;
  allyHorse.y = rocketLaneY;
  const rushX = lineX + dir * 72;
  player2.x = rushX;
  player2.y = midY;
  const retX = lineX + dir * 50 * YARDS_TO_PIXELS;
  cluckNorris.x = clampPlayableX(retX, cluckNorris.radius);
  cluckNorris.y = midY;
  allyDonkey.x = allyHorse.x + dir * 1.5 * YARDS_TO_PIXELS;
  allyDonkey.y = rocketLaneY + 10;
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
  if (game.cpuOffense) {
    startPlayModeDrive(x);
  } else {
    startPlayModeDriveCpuOffense(x);
  }
}

function updatePlayModePunt(dt) {
  const dir = getOffenseDirection();
  const lineX = game.playModeLineX;
  const midY = FIELD.y + FIELD.height / 2;

  if (game.puntPhase === "snapKick") {
    game.puntPhaseTimer -= dt * 1000;
    moveToward(player2, player1.x, player1.y, player2.speed * 1.12, dt);
    moveToward(allyHorse, lineX + dir * 24 * YARDS_TO_PIXELS, FIELD.y + 34, allyHorse.speed * 1.06, dt);
    const rusherGap = distance(player1.x, player1.y, player2.x, player2.y);
    if (rusherGap < 8 * YARDS_TO_PIXELS) {
      const evadeY = clamp(
        player1.y + (player2.y > player1.y ? -44 : 44),
        FIELD.y + player1.radius,
        FIELD.y + FIELD.height - player1.radius
      );
      moveToward(player1, player1.x - dir * 3.2 * YARDS_TO_PIXELS, evadeY, player1.speed * 1.02, dt);
    } else {
      moveToward(player1, lineX - dir * 20 * YARDS_TO_PIXELS, midY, player1.speed * 0.72, dt);
    }
    if (ball.carrier === lilTunnelPete && game.puntPhaseTimer <= 470) {
      ball.carrier = player1;
    }
    if (ball.carrier === lilTunnelPete) {
      moveToward(
        lilTunnelPete,
        player1.x - dir * 2,
        player1.y,
        lilTunnelPete.speed * 1.35,
        dt
      );
    } else {
      moveToward(
        lilTunnelPete,
        (player1.x + player2.x) * 0.5 - dir * 8,
        (player1.y + player2.y) * 0.5,
        lilTunnelPete.speed * 1.28,
        dt
      );
    }
    moveToward(
      allyDonkey,
      allyHorse.x - dir * 10,
      allyHorse.y + 8,
      allyDonkey.speed * 1.04,
      dt
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
    moveToward(allyHorse, game.puntLandingX, FIELD.y + 34, allyHorse.speed * 1.04, dt);
    moveToward(allyDonkey, allyHorse.x - dir * 10, allyHorse.y + 8, allyDonkey.speed * 1.06, dt);
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
    moveToward(cluckNorris, ball.x, ball.y + cluckNorris.radius + 8, cluckNorris.speed * 0.9, dt);
    moveToward(allyHorse, cluckNorris.x, cluckNorris.y, allyHorse.speed * 0.96, dt);
    moveToward(lilTunnelPete, cluckNorris.x, cluckNorris.y, lilTunnelPete.speed * 0.94, dt);
    moveToward(player1, allyHorse.x - dir * 30, allyHorse.y + 10, player1.speed * 0.9, dt);
    moveToward(allyDonkey, allyHorse.x - dir * 9, allyHorse.y + 8, allyDonkey.speed * 1.02, dt);
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
    moveToward(cluckNorris, goalX, midY, cluckNorris.speed * 0.88, dt);
    moveToward(allyHorse, cluckNorris.x, cluckNorris.y, allyHorse.speed * 1.12, dt);
    moveToward(lilTunnelPete, cluckNorris.x, cluckNorris.y, lilTunnelPete.speed * 1.08, dt);
    const returnGainPx = Math.abs(cluckNorris.x - game.puntReturnStartX);
    if (!game.puntPunterAssist && (game.puntReturnMs >= 1700 || returnGainPx >= 7 * YARDS_TO_PIXELS)) {
      game.puntPunterAssist = true;
    }
    if (game.puntPunterAssist) {
      moveToward(player1, cluckNorris.x, cluckNorris.y, player1.speed * 1.06, dt);
    } else {
      moveToward(player1, allyHorse.x - dir * 28, allyHorse.y + 8, player1.speed * 0.95, dt);
    }
    moveToward(allyDonkey, allyHorse.x - dir * 9, allyHorse.y + 8, allyDonkey.speed * 1.04, dt);
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
    game.patKickCpuTarget = 0.36 + Math.random() * 0.28;
  } else {
    game.patKickCpuTarget = 0.42 + Math.random() * 0.16;
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
  game.patKickCpuTarget = 0.5 + (Math.random() - 0.5) * (0.06 + dist01 * 0.08);
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
    if (game.patKickScorerTeamTag && game.teamScores && game.teamScores[game.patKickScorerTeamTag] !== undefined) {
      game.teamScores[game.patKickScorerTeamTag] += kickPoints;
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

function tryPlayModePointsWinFromCurrentScore() {
  if (game.playUserTeamId && game.teamScores && game.teamScores[game.playUserTeamId] >= CONFIG.playModePointsToWin) {
    game.state = "winPopup";
    game.winPopupTimer = 3000;
    return true;
  }
  if (game.mode === "play" && !game.playUserTeamId && player1.score >= CONFIG.playModePointsToWin) {
    game.state = "winPopup";
    game.winPopupTimer = 3000;
    return true;
  }
  return false;
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
    if (game.playUserTeamId && game.teamScores) {
      if (game.teamScores[game.playUserTeamId] >= CONFIG.playModePointsToWin) {
        game.state = "winPopup";
        game.winPopupTimer = 3000;
        return;
      }
      if (game.teamScores[game.playCpuTeamId] >= CONFIG.playModePointsToWin) {
        game.state = "gameOver";
        game.winner = player2;
        return;
      }
    } else {
      if (player1.score >= CONFIG.playModePointsToWin) {
        game.state = "winPopup";
        game.winPopupTimer = 3000;
        return;
      }
      if (player2.score >= CONFIG.playModePointsToWin) {
        game.state = "gameOver";
        game.winner = player2;
        return;
      }
    }
    if (game.cpuOffense) {
      startPlayModeDrive(spot);
    } else {
      startPlayModeDriveCpuOffense(spot);
    }
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
  if (game.playUserTeamId && scorer.teamTag) {
    if (!game.teamScores) resetPlayModeTeamScores();
    game.teamScores[scorer.teamTag] += 6;
    playTouchdownAudio(scorer);
    if (game.teamScores[game.playCpuTeamId] >= CONFIG.playModePointsToWin) {
      game.state = "gameOver";
      game.winner = player2;
      return;
    }
    if (game.teamScores[game.playUserTeamId] >= CONFIG.playModePointsToWin) {
      game.state = "winPopup";
      game.winPopupTimer = 3000;
      game.afterTouchdownAction = null;
      return;
    }
    registerPatKickScorer(scorer);
    game.state = "touchdownPopup";
    game.touchdownPopupTimer = 4000;
    game.afterTouchdownAction = "startPlayModeDrive";
    return;
  }

  const scoringTeam = getScoringTeamForPlayer(scorer);
  scoringTeam.score += 6;
  if (game.cpuOffense && scoringTeam.score >= CONFIG.playModePointsToWin) {
    game.state = "gameOver";
    game.winner = scoringTeam;
    playTouchdownAudio(scorer);
    return;
  }
  if (game.mode === "play" && scoringTeam === player2 && player2.score >= CONFIG.playModePointsToWin) {
    game.state = "gameOver";
    game.winner = player2;
    playTouchdownAudio(scorer);
    return;
  }
  if (game.mode === "play" && scoringTeam === player1 && player1.score >= CONFIG.playModePointsToWin) {
    game.state = "winPopup";
    game.winPopupTimer = 3000;
    game.afterTouchdownAction = null;
    playTouchdownAudio(scorer);
    return;
  }
  registerPatKickScorer(scorer);
  game.state = "touchdownPopup";
  game.touchdownPopupTimer = 4000;
  game.afterTouchdownAction = "startPlayModeDrive";
  playTouchdownAudio(scorer);
}

function finishDriveTouchdown(scorer) {
  replayFinalizePlayBuffer();
  finishDriveTouchdownCommit(scorer);
}

function chooseDefenseModeCpuPlay() {
  if (game.defenseModeSelectedOffensePlay && game.defenseModeSelectedOffensePlay !== "random") {
    return game.defenseModeSelectedOffensePlay;
  }
  const runPlays = ["sweepRight", "sweepLeft", "diveRight", "diveLeft"];
  const passPlays = ["passRight", "passLeft", "barnPlay", "scrambledEggs"];
  const playPool = Math.random() < 0.52 ? runPlays : passPlays;
  return playPool[Math.floor(Math.random() * playPool.length)];
}

function cycleDefenseModeOffensePlay() {
  const order = ["random"].concat(PLAY_ORDER_ALL);
  const idx = order.indexOf(game.defenseModeSelectedOffensePlay);
  game.defenseModeSelectedOffensePlay = order[(idx + 1 + order.length) % order.length];
}

function prepareDefenseModeCpuPass(playKey) {
  if (!game.cpuOffense) return;
  game.defenseModeCpuPlay = playKey;
  game.defenseModeCpuThrowTimer = 520 + Math.random() * 420;
  game.passPlayTargetReceiver = Math.random() < 0.5 ? "horse" : "pete";
}

function maybeRunDefenseModeCpuPass(playKey, dt) {
  if (!game.cpuOffense || !game.passPlayDropbackDone || !game.passPlayCanThrow) {
    return false;
  }

  game.defenseModeCpuThrowTimer -= dt * 1000;
  if (game.defenseModeCpuThrowTimer > 0) {
    return false;
  }

  const targetKey = game.passPlayTargetReceiver || "horse";
  const receiver = targetKey === "horse" ? allyHorse : lilTunnelPete;
  const shouldComplete = Math.random() < 0.65;
  const dir = getOffenseDirection();
  let tx = receiver.x;
  let ty = receiver.y;

  if (playKey === "passRight") {
    tx += dir * (targetKey === "horse" ? 42 : 24);
  } else if (playKey === "passLeft") {
    tx += dir * (targetKey === "horse" ? 42 : 20);
  } else if (playKey === "barnPlay") {
    tx += dir * (targetKey === "horse" ? 44 : 14);
    ty += targetKey === "horse" ? -24 : -36;
  } else if (playKey === "scrambledEggs") {
    tx += dir * (targetKey === "horse" ? -14 : 28);
    ty += targetKey === "horse" ? 0 : 16;
  }

  if (!shouldComplete) {
    const missY = receiver.y < FIELD.y + FIELD.height / 2 ? -1 : 1;
    tx += dir * 16 * YARDS_TO_PIXELS;
    ty += missY * 16 * YARDS_TO_PIXELS;
  }

  tx = clamp(tx, FIELD.x + ball.radius, FIELD.x + FIELD.width - ball.radius);
  ty = clamp(ty, FIELD.y + ball.radius, FIELD.y + FIELD.height - ball.radius);
  startPlayModePassThrow(tx, ty, targetKey);
  return true;
}

function positionForPlayModeAt(x) {
  const midY = FIELD.y + FIELD.height / 2;
  player1.x = x - getOffenseDirection() * 40;
  player1.y = midY;
  allyHorse.x = player1.x - getOffenseDirection() * 60;
  allyHorse.y = player1.y - 40;
  lilTunnelPete.x = player1.x - getOffenseDirection() * 40;
  lilTunnelPete.y = player1.y + 40;
  ball.carrier = player1;
  ball.inFlight = false;
  updateBallPosition();
  previewDefensePositions();
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
}

function startPlayModeDrive(fromX) {
  const startX = fromX !== undefined ? fromX : getLeftTwentyYardLineX();
  game.twoPointAttemptActive = false;
  game.fourthDownGoForIt = false;
  game.fourthDownPickedGoForIt = false;
  game.kickoffActive = false;
  game.kickoffReceivingCpuOffense = false;
  game.turnoverSeriesActive = false;
  game.cpuOffense = false;
  if (game.playUserTeamId && game.playCpuTeamId) {
    applyPlayModeTeamLayout(game.playUserTeamId, game.playCpuTeamId);
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
  game.playModePlayFilter = null;
  game.playModePlaySelectPage = 0;
  game.playModeDown = 1;
  game.playModeLineX = startX;
  game.playModePhase = null;
  game.playModeCurrentPlay = null;
  game.passJamWindowMs = 0;
  positionForPlayModeAt(startX);
}

/** CPU offense / player defense — former standalone "Defense mode", now under Play. */
function startPlayModeDriveCpuOffense(fromX) {
  const startX = fromX !== undefined ? fromX : getLeftTwentyYardLineX();
  game.twoPointAttemptActive = false;
  game.fourthDownGoForIt = false;
  game.fourthDownPickedGoForIt = false;
  game.kickoffActive = false;
  game.kickoffReceivingCpuOffense = false;
  game.turnoverSeriesActive = false;
  game.cpuOffense = true;
  if (game.playUserTeamId && game.playCpuTeamId) {
    applyPlayModeTeamLayout(game.playCpuTeamId, game.playUserTeamId);
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
  game.playModeDown = 1;
  game.playModeLineX = startX;
  game.playModePhase = null;
  game.playModeCurrentPlay = null;
  game.passJamWindowMs = 0;
  game.playModeTackle = false;
  game.playModeIncomplete = false;
  game.passPlayTargetReceiver = null;
  game.defenseModeControlledPlayerId = "player2";
  game.defenseModeCpuPlay = null;
  game.defenseModeSelectedOffensePlay = "random";
  game.defenseModeDefenseFilter = null;
  positionForPlayModeAt(startX);
}

function setPlayModePlayFilter(filter) {
  game.playModePlayFilter = filter;
  game.playModePlaySelectPage = 0;
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
    if (nextCpuOff) {
      startPlayModeDriveCpuOffense(newLineX);
    } else {
      startPlayModeDrive(newLineX);
    }
    return;
  }

  game.playModeFumbleRecoveryTackled = false;

  if (game.cpuOffense) {
    if (game.playModeTackle && newLineX <= FIELD.x + FIELD.endZoneWidth) {
      game.state = "gameOver";
      game.winner = player2;
      game.playModeTackle = false;
      return;
    }
    game.playModeTackle = false;
    if (game.playModeDown >= game.playModeMaxDowns) {
      if (game.turnoverSeriesActive) {
        startPlayModeDrive(newLineX);
      } else {
        game.state = "gameOver";
        game.winner = player2;
      }
      return;
    }
    game.playModeDown += 1;
    game.playModeLineX = newLineX;
    game.playModePhase = null;
    game.playModeCurrentPlay = null;
    game.passPlayTargetReceiver = null;
    game.defenseModeCpuPlay = null;
    positionForPlayModeAt(newLineX);
    game.state = "playModePlaySelect";
    return;
  }

  // Tackled by the CPU inside the pig's end zone = Safety
  if (game.playModeTackle && newLineX <= FIELD.x + FIELD.endZoneWidth) {
    game.state = "safetyPopup";
    game.safetyPopupTimer = 3500;
    game.playModeTackle = false;
    return;
  }
  game.playModeTackle = false;
  if (game.playModeDown >= game.playModeMaxDowns) {
    if (game.fourthDownGoForIt) {
      game.fourthDownGoForIt = false;
      game.fourthDownPickedGoForIt = false;
      if (game.cpuOffense) {
        startPlayModeDrive(newLineX);
      } else {
        startPlayModeDriveCpuOffense(newLineX);
      }
      return;
    }
    game.state = "gameOver";
    game.winner = null;
    return;
  }
  game.playModeDown += 1;
  game.playModeLineX = newLineX;
  game.playModePhase = null;
  game.playModeCurrentPlay = null;
  positionForPlayModeAt(newLineX);
  game.playModePlaySelectPage = 0;
  game.state = "playModePlaySelect";
}

function positionForSweepRight() {
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  player1.x = lineX;
  player1.y = midY;
  allyHorse.x = getOffsetX(player1.x, -10);
  allyHorse.y = midY;
  lilTunnelPete.x = lineX;
  lilTunnelPete.y = FIELD.y + FIELD.height - 50;
  ball.carrier = player1;
  ball.inFlight = false;
  updateBallPosition();
  positionDefenseForPlay();
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
}

function startSweepRightPlay() {
  game.playModeCurrentPlay = "sweepRight";
  game.playModePhase = "handoff";
  game.playModeSweepHandoffT = 0;
  game.playModeSweepArcCY = FIELD.y + FIELD.height / 2;
  game.peteBlockTimer = 0;
  game.peteBlockTargetId = null;
  game.state = "playing";
  positionForSweepRight();
}

function positionForSweepLeft() {
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  player1.x = lineX;
  player1.y = midY;
  allyHorse.x = getOffsetX(player1.x, -10);
  allyHorse.y = midY;
  lilTunnelPete.x = lineX;
  lilTunnelPete.y = FIELD.y + 50;
  ball.carrier = player1;
  ball.inFlight = false;
  updateBallPosition();
  positionDefenseForPlay();
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
}

function startSweepLeftPlay() {
  game.playModeCurrentPlay = "sweepLeft";
  game.playModePhase = "handoff";
  game.playModeSweepHandoffT = 0;
  game.playModeSweepArcCY = FIELD.y + FIELD.height / 2;
  game.peteBlockTimer = 0;
  game.peteBlockTargetId = null;
  game.state = "playing";
  positionForSweepLeft();
}

function positionForPassRight() {
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  player1.x = lineX;
  player1.y = midY;
  allyHorse.x = getOffsetXPx(lineX, 20);
  allyHorse.y = FIELD.y + FIELD.height - 50;
  lilTunnelPete.x = getOffsetXPx(lineX, -80);
  lilTunnelPete.y = midY - 40;
  ball.carrier = player1;
  ball.inFlight = false;
  updateBallPosition();
  positionDefenseForPlay(allyHorse.y);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.passPlayDropbackDone   = false;
  game.passPlayCanThrow       = true;
  game.passPlayTargetReceiver = null;
  game.passPlayDropbackTarget = getPassDropbackTarget(lineX);
  game.rushReactionTimer      = 0;
  game.passJamWindowMs        = game.cpuOffense && game.defensePressJam ? 950 : 0;
  setMobileAimForwardFromQB();
}

function startPassRightPlay() {
  game.playModeCurrentPlay = "passRight";
  game.playModePhase = null;
  game.state = "playing";
  positionForPassRight();
  prepareDefenseModeCpuPass("passRight");
}

function positionForPassLeft() {
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  player1.x = lineX;
  player1.y = midY;
  allyHorse.x = getOffsetXPx(lineX, 20);
  allyHorse.y = FIELD.y + 50;
  lilTunnelPete.x = getOffsetXPx(lineX, -80);
  lilTunnelPete.y = midY + 40;
  ball.carrier = player1;
  ball.inFlight = false;
  updateBallPosition();
  positionDefenseForPlay(allyHorse.y);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.passPlayDropbackDone   = false;
  game.passPlayCanThrow       = true;
  game.passPlayTargetReceiver = null;
  game.passPlayDropbackTarget = getPassDropbackTarget(lineX);
  game.rushReactionTimer      = 0;
  game.passJamWindowMs        = game.cpuOffense && game.defensePressJam ? 950 : 0;
  setMobileAimForwardFromQB();
}

function startPassLeftPlay() {
  game.playModeCurrentPlay = "passLeft";
  game.playModePhase = null;
  game.state = "playing";
  positionForPassLeft();
  prepareDefenseModeCpuPass("passLeft");
}

function positionForBarnPlay() {
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  const spacingY = 10 * YARDS_TO_PIXELS;
  const bottomY = FIELD.y + FIELD.height - 55;
  player1.x = lineX;
  player1.y = midY;
  allyHorse.x = getOffsetXPx(lineX, 20);
  allyHorse.y = bottomY;
  lilTunnelPete.x = getOffsetXPx(lineX, 20);
  lilTunnelPete.y = bottomY - spacingY;
  ball.carrier = player1;
  ball.inFlight = false;
  updateBallPosition();
  positionDefenseForPlay(lilTunnelPete.y);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.passPlayDropbackDone   = false;
  game.passPlayCanThrow       = true;
  game.passPlayTargetReceiver = null;
  game.passPlayDropbackTarget = getPassDropbackTarget(lineX);
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
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  const spacingY = 10 * YARDS_TO_PIXELS;
  const bottomY = FIELD.y + FIELD.height - 55;
  player1.x = lineX;
  player1.y = midY;
  allyHorse.x = getOffsetXPx(lineX, 20);
  allyHorse.y = bottomY;
  lilTunnelPete.x = getOffsetXPx(lineX, 20);
  lilTunnelPete.y = bottomY - spacingY;
  ball.carrier = player1;
  ball.inFlight = false;
  updateBallPosition();
  positionDefenseForPlay(lilTunnelPete.y);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.passPlayDropbackDone   = false;
  game.passPlayCanThrow       = true;
  game.passPlayTargetReceiver = null;
  game.passPlayDropbackTarget = getPassDropbackTarget(lineX);
  game.rushReactionTimer      = 0;
  game.passJamWindowMs        = game.cpuOffense && game.defensePressJam ? 950 : 0;
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
  positionForPassLeft();
  prepareDefenseModeCpuPass("passLeft");
}

function startPigPenScreenPlay() {
  game.playModeCurrentPlay = "pigPenScreen";
  game.playModePhase = null;
  game.state = "playing";
  positionForPassRight();
  prepareDefenseModeCpuPass("passRight");
}

function startCornfieldCrossPlay() {
  game.playModeCurrentPlay = "cornfieldCross";
  game.playModePhase = null;
  game.state = "playing";
  positionForBarnPlay();
  prepareDefenseModeCpuPass("barnPlay");
}

function startRoosterRolloutPlay() {
  game.playModeCurrentPlay = "roosterRollout";
  game.playModePhase = null;
  game.state = "playing";
  positionForScrambledEggs();
  prepareDefenseModeCpuPass("scrambledEggs");
}

function positionForDiveRight() {
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  const r = 5 * YARDS_TO_PIXELS;
  // QB at the line of scrimmage
  player1.x = lineX;
  player1.y = midY;
  // Pete starts at the arc's t=0 position (2r behind QB, same Y)
  lilTunnelPete.x = lineX - getOffenseDirection() * 2 * r;
  lilTunnelPete.y = midY;
  // Horse starts just behind Pete, ready to trail him through the arc
  allyHorse.x = lineX - getOffenseDirection() * (2 * r + 3 * YARDS_TO_PIXELS);
  allyHorse.y = midY;
  ball.carrier = player1;
  ball.inFlight = false;
  updateBallPosition();
  positionDefenseForPlay();
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.peteBlockTimer = 0;
  game.peteBlockTargetId = null;
  game.playModeSweepHandoffT = 0;
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

  // Pete always blocks Deputy Hee-Haw on Dive Right
  const blockTarget = allyDonkey;

  if (blockTarget.id !== game.peteBlockTargetId) {
    game.peteBlockTargetId = blockTarget.id;
    game.peteBlockTimer = 1300;
  }
  const peteInContact = circleTouch(lilTunnelPete, blockTarget);
  if (peteInContact && game.peteBlockTimer > 0) {
    game.peteBlockTimer -= dt * 1000;
  }
  const blockActive = peteInContact && game.peteBlockTimer > 0;

  // Chase Hee-Haw to make contact; once blocking, plant feet so he can escape
  if (!blockActive) {
    moveToward(lilTunnelPete, allyDonkey.x, allyDonkey.y, lilTunnelPete.speed, dt);
  }
  clampPlayerToField(lilTunnelPete);

  const pigSpd  = (blockActive && blockTarget === player2)    ? player2.speed    * 0.45 : player2.speed;
  const hawSpd  = (blockActive && blockTarget === allyDonkey) ? allyDonkey.speed * 0.45 : allyDonkey.speed;
  const coopSpd = (blockActive && blockTarget === cluckNorris)? cluckNorris.speed* 0.45 : cluckNorris.speed;

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
    // Pete runs the same quarter-circle arc the RB uses on Sweep Right.
    // Arc center is pinned to the original line of scrimmage so it stays
    // stable while the QB moves.
    const r = 5 * YARDS_TO_PIXELS;
    const cx = getOffsetX(game.playModeLineX, -5);
    const cy = FIELD.y + FIELD.height / 2;
    const arcLength = (Math.PI / 2) * r;
    game.playModeSweepHandoffT = Math.min(1, game.playModeSweepHandoffT + (lilTunnelPete.speed * dt) / arcLength);
    const angle = Math.PI - game.playModeSweepHandoffT * (Math.PI / 2);
    lilTunnelPete.x = cx + r * Math.cos(angle);
    lilTunnelPete.y = cy + r * Math.sin(angle);

    // Horse trails Pete through the arc
    moveToward(allyHorse, lilTunnelPete.x, lilTunnelPete.y, allyHorse.speed, dt);
    clampPlayerToField(allyHorse);

    // QB walks toward the RB so the handoff looks physical
    moveToward(player1, allyHorse.x, allyHorse.y, player1.speed, dt);
    clampPlayerToField(player1);

    // Defenders react to QB (who holds the ball)
    if (game.playModeDefense === "A" && game.defenseReactionTimer > 0) {
      game.defenseReactionTimer -= dt * 1000;
    } else {
      moveToward(player2,    player1.x, player1.y, player2.speed,    dt); clampPlayerToField(player2);
      moveToward(allyDonkey, player1.x, player1.y, allyDonkey.speed, dt); clampPlayerToField(allyDonkey);
    }
    if (game.cluckNorrisTimer > 0) {
      game.cluckNorrisTimer -= dt * 1000;
    } else {
      moveToward(cluckNorris, player1.x, player1.y, cluckNorris.speed, dt);
      clampPlayerToField(cluckNorris);
    }

    updateBallPosition();

    // Sack before the handoff
    if (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris)) {
      resolvePlayModeTackle(player1, player1.x, { sack: true });
      return;
    }

    // Handoff when QB physically reaches the RB (or arc fully completes as fallback)
    if (circleTouch(player1, allyHorse) || game.playModeSweepHandoffT >= 1) {
      ball.carrier = allyHorse;
      game.playModePhase = "run";
      updateBallPosition();
    }
    return;
  }

  if (game.playModePhase === "run") {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(allyHorse, dt, FIELD.y + FIELD.height * 0.7);
    } else {
      clampPlayerToField(allyHorse);
    }
    moveQuarterbackRunBlock(allyHorse, dt);
    moveDiveRightDefenders(dt);
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

// ── Dive Left (mirror of Dive Right — arc curves upward toward top sideline) ──

function moveDiveLeftDefenders(dt) {
  const tx = ball.carrier ? ball.carrier.x : ball.x;
  const ty = ball.carrier ? ball.carrier.y : ball.y;

  // Pete always blocks Professor Pig on Dive Left (the outside defender toward the top)
  const blockTarget = player2;

  if (blockTarget.id !== game.peteBlockTargetId) {
    game.peteBlockTargetId = blockTarget.id;
    game.peteBlockTimer = 1300;
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

  const pigSpd  = (blockActive && blockTarget === player2)    ? player2.speed    * 0.45 : player2.speed;
  const hawSpd  = (blockActive && blockTarget === allyDonkey) ? allyDonkey.speed * 0.45 : allyDonkey.speed;
  const coopSpd = (blockActive && blockTarget === cluckNorris)? cluckNorris.speed* 0.45 : cluckNorris.speed;

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
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  const r = 5 * YARDS_TO_PIXELS;
  player1.x = lineX;
  player1.y = midY;
  lilTunnelPete.x = lineX - getOffenseDirection() * 2 * r;
  lilTunnelPete.y = midY;
  allyHorse.x = lineX - getOffenseDirection() * (2 * r + 3 * YARDS_TO_PIXELS);
  allyHorse.y = midY;
  ball.carrier = player1;
  ball.inFlight = false;
  updateBallPosition();
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

/** Dispatch from horizontal play-select UI (filtered run/pass list, 4 per page). */
function startPlayFromSelect(playKey) {
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
    case "pigPenScreen":
      startPigPenScreenPlay();
      break;
    case "cornfieldCross":
      startCornfieldCrossPlay();
      break;
    case "roosterRollout":
      startRoosterRolloutPlay();
      break;
    default:
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
  startPlayFromSelect(playKey);
  startPrePlayCadence();
}

function beginSelectedDefense(defenseKey) {
  game.selectedDefense = defenseKey;
  if (game.cpuOffense && game.playModeDown >= game.playModeMaxDowns) {
    const fgYards = getFourthDownFieldGoalDistanceYards();
    if (fgYards <= MAX_FIELD_GOAL_YARDS && Math.random() < 0.58) {
      game.defenseModeCpuPlay = "fieldGoal";
      beginFourthDownFieldGoal(true);
    } else {
      game.defenseModeCpuPlay = "punt";
      game.puntDistanceYards = computePuntDistanceYards(0.55 + Math.random() * 0.1, false);
      game.puntBlocked = false;
      startPuntPlayAfterSetup();
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
  game.playUserTeamId = null;
  game.playCpuTeamId = null;
  game.teamScores = null;
  game.cpuOffense = false;
  startGameMusic();
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

/** From matchup screen — coin toss, then begin the drive. */
function startPlayAfterOpponentReveal() {
  if (!game.playUserTeamId || !game.playCpuTeamId) {
    return;
  }
  resetPlayModeTeamScores();
  player1.score = 0;
  player2.score = 0;
  game.winner = null;
  game.state = "playCoinToss";
  game.coinTossPhase = "pickCall";
  game.coinTossCall = null;
  game.coinTossResult = null;
  game.coinTossWon = null;
  game.coinTossCpuChoice = null;
  game.coinTossCpuDirection = null;
  game.coinTossUserChoiceSide = null;
  game.coinTossFlipTimer = 0;
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
  if (side === "offense") startPlayModeDrive();
  else startPlayModeDriveCpuOffense();
  resetCoinTossState();
}

/** Player lost toss — CPU already chose offense or defense; begin play. */
function startPlayAfterCpuCoinChoice() {
  if (!game.playUserTeamId || !game.playCpuTeamId || !game.coinTossCpuChoice || !game.coinTossCpuDirection) return;
  applyCoinTossDirectionForCpu(game.coinTossCpuDirection);
  if (game.coinTossCpuChoice === "offense") startPlayModeDriveCpuOffense();
  else startPlayModeDrive();
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
}

// =========================================================
// CPU Logic
// =========================================================
function updateCPU(dt) {
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

  scorer.score += 1;
  game.scoredBy = scorer;
  game.state = "scorePause";
  game.scorePauseTimer = scorer === player1 ? 4000 : CONFIG.scorePauseMs;
  ball.carrier = null;

  if (scorer.score >= CONFIG.winScore) {
    game.state = "gameOver";
    game.winner = scorer;
  }
}

// Prevent any two characters from overlapping more than half their body (radius).
// Minimum allowed center-to-center distance = playerRadius (one radius = 50% overlap threshold).
function resolveCharacterCollisions() {
  const chars = [player1, player2, allyHorse, allyDonkey, cluckNorris, lilTunnelPete];
  const minDist = CONFIG.playerRadius;
  for (let i = 0; i < chars.length; i++) {
    for (let j = i + 1; j < chars.length; j++) {
      const a = chars[i];
      const b = chars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < minDist) {
        const push = (minDist - dist) / 2;
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

function shouldFumbleOnTackle() {
  const p = CONFIG.fumbleChanceOnTackle;
  return p > 0 && Math.random() < p;
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

  const rawYards = (spotX - game.playModeLineX) / YARDS_TO_PIXELS;
  const yards = Math.round(rawYards);

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
  if (shouldFumbleOnTackle()) {
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
  const rawYards = (downedX - game.playModeLineX) / YARDS_TO_PIXELS;
  const yards    = (incomplete || interception) ? 0 : Math.round(rawYards);

  let resultType;
  if      (interception) resultType = "interception";
  else if (incomplete)   resultType = "incomplete";
  else if (sack)         resultType = "sack";
  else if (yards > 0)    resultType = "gain";
  else if (yards < 0)    resultType = "loss";
  else                   resultType = "noGain";

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
    updatePlayModePassRight(dt);
    return;
  }
  if (game.playModeCurrentPlay === "pigPenScreen") {
    updatePlayModePassRight(dt);
    return;
  }
  if (game.playModeCurrentPlay === "passLeft") {
    updatePlayModePassLeft(dt);
    return;
  }
  if (game.playModeCurrentPlay === "barnDoorBoot") {
    updatePlayModePassLeft(dt);
    return;
  }
  if (game.playModeCurrentPlay === "barnPlay") {
    updatePlayModeBarnPlay(dt);
    return;
  }
  if (game.playModeCurrentPlay === "cornfieldCross") {
    updatePlayModeBarnPlay(dt);
    return;
  }
  if (game.playModeCurrentPlay === "scrambledEggs") {
    updatePlayModeScrambledEggs(dt);
    return;
  }
  if (game.playModeCurrentPlay === "roosterRollout") {
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

// Defense A on run plays: both defenders pause for defenseReactionTimer ms

function moveSweepDefenders(dt) {
  const tx = ball.carrier ? ball.carrier.x : ball.x;
  const ty = ball.carrier ? ball.carrier.y : ball.y;

  // Pete finds his nearest defender and moves to the midpoint between that
  // defender and the ball carrier — getting his body in the passing lane.
  // resolveCharacterCollisions then naturally pushes the defender sideways.
  const dPig  = distance(lilTunnelPete.x, lilTunnelPete.y, player2.x,    player2.y);
  const dHaw  = distance(lilTunnelPete.x, lilTunnelPete.y, allyDonkey.x, allyDonkey.y);
  const dCoop = distance(lilTunnelPete.x, lilTunnelPete.y, cluckNorris.x, cluckNorris.y);
  let blockTarget = player2;
  if (dHaw  < dPig  && dHaw  <= dCoop) blockTarget = allyDonkey;
  if (dCoop < dPig  && dCoop < dHaw)   blockTarget = cluckNorris;

  // Pete can only block one defender at a time for up to 1.7 seconds
  if (blockTarget.id !== game.peteBlockTargetId) {
    game.peteBlockTargetId = blockTarget.id;
    game.peteBlockTimer = 1300;
  }
  const peteInContact = circleTouch(lilTunnelPete, blockTarget);
  if (peteInContact && game.peteBlockTimer > 0) {
    game.peteBlockTimer -= dt * 1000;
  }
  const blockActive = peteInContact && game.peteBlockTimer > 0;

  // Chase the target to make contact; once blocking, plant feet so defender can escape
  if (!blockActive) {
    moveToward(lilTunnelPete, blockTarget.x, blockTarget.y, lilTunnelPete.speed, dt);
  }
  clampPlayerToField(lilTunnelPete);

  // Only the designated block target is slowed, and only while the block is active
  const pigSpd  = (blockActive && blockTarget === player2)    ? player2.speed    * 0.45 : player2.speed;
  const hawSpd  = (blockActive && blockTarget === allyDonkey) ? allyDonkey.speed * 0.45 : allyDonkey.speed;
  const coopSpd = (blockActive && blockTarget === cluckNorris)? cluckNorris.speed* 0.45 : cluckNorris.speed;

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

function updatePlayModeSweepRight(dt) {
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
    const r = 10 * YARDS_TO_PIXELS;  // sweep arc radius = 10 yards
    // Arc center is pinned to initial LOS so it stays stable as QB rolls out
    const cx = getOffsetX(game.playModeLineX, -10);
    const cy = game.playModeSweepArcCY;
    const arcLength = (Math.PI / 2) * r;
    game.playModeSweepHandoffT = Math.min(1, game.playModeSweepHandoffT + (allyHorse.speed * dt) / arcLength);
    // Quarter circle from PI (left) to PI/2 (down) — flipped so RB sweeps down instead of up
    const angle = dir > 0
      ? Math.PI - game.playModeSweepHandoffT * (Math.PI / 2)
      : game.playModeSweepHandoffT * (Math.PI / 2);
    allyHorse.x = cx + r * Math.cos(angle);
    allyHorse.y = cy + r * Math.sin(angle);
    // QB rolls out — backward away from LOS and toward the sweep side
    player1.x -= dir * player1.speed * 0.6 * dt;
    player1.y += player1.speed * 0.7 * dt;
    clampPlayerToField(player1);
    updateBallPosition();
    // QB still has the ball — if a defender reaches him before the toss, it's a sack
    if (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris)) {
      resolvePlayModeTackle(player1, player1.x, { sack: true });
      return;
    }
    // Defense A: if any defender closes to within 5 yards, QB releases the ball early
    if (game.playModeDefense === "A") {
      const fiveYards = 5 * YARDS_TO_PIXELS;
      if (Math.hypot(player2.x - player1.x, player2.y - player1.y) <= fiveYards ||
          Math.hypot(allyDonkey.x - player1.x, allyDonkey.y - player1.y) <= fiveYards ||
          Math.hypot(cluckNorris.x - player1.x, cluckNorris.y - player1.y) <= fiveYards) {
        game.playModeSweepHandoffT = 1;
      }
    }
    if (game.playModeSweepHandoffT >= 0.4) {
      game.playModePhase = "toss";
      ball.carrier = null;
      ball.inFlight = true;
      ball.x = player1.x;
      ball.y = player1.y - player1.radius - 8;
      const tossToY = allyHorse.y - allyHorse.radius - 8;
      const baseDist = Math.hypot(allyHorse.x - ball.x, tossToY - ball.y);
      let timeOfFlight = baseDist / CONFIG.passSpeed;
      let leadX = dir * allyHorse.speed * timeOfFlight;
      const leadDist = Math.hypot((allyHorse.x + leadX) - ball.x, tossToY - ball.y);
      timeOfFlight = leadDist / CONFIG.passSpeed;
      leadX = dir * allyHorse.speed * timeOfFlight;
      ball.targetX = allyHorse.x + leadX;
      ball.targetY = tossToY;
    }
    moveSweepDefenders(dt);
    return;
  }
  if (game.playModePhase === "toss") {
    // RB runs toward the lead point so he meets the ball
    moveOffenseX(allyHorse, dt);
    clampPlayerToField(allyHorse);
    // QB continues rolling out — backward and toward the sweep side
    player1.x -= getOffenseDirection() * player1.speed * 0.6 * dt;
    player1.y += player1.speed * 0.7 * dt;
    clampPlayerToField(player1);
    const dx = ball.targetX - ball.x;
    const dy = ball.targetY - ball.y;
    const dist = Math.hypot(dx, dy);
    const move = CONFIG.passSpeed * dt;
    if (dist <= move || dist < 6) {
      ball.x = ball.targetX;
      ball.y = ball.targetY;
      ball.inFlight = false;
      ball.carrier = allyHorse;
      game.playModePhase = "sweep";
      updateBallPosition();
    } else {
      ball.x += (dx / dist) * move;
      ball.y += (dy / dist) * move;
    }
    moveSweepDefenders(dt);
    return;
  }
  if (game.playModePhase === "sweep") {
    updatePlayerInput(dt);
    if (game.cpuOffense && ball.carrier === allyHorse) {
      moveCpuOffenseCarrier(allyHorse, dt, FIELD.y + FIELD.height * 0.82);
    }
    moveQuarterbackRunBlock(allyHorse, dt);
    moveSweepDefenders(dt);
    updateBallPosition();
    const carrier = ball.carrier;
    const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;
    if (carrier === allyHorse && hasOffenseScored(allyHorse)) {
      finishDriveTouchdown(allyHorse);
      return;
    }
    if (carrier && (circleTackle(carrier, player2) || circleTackle(carrier, allyDonkey) || circleTackle(carrier, cluckNorris))) {
      resolvePlayModeTackle(carrier, carrier.x);
      return;
    }
    return;
  }
}

function updatePlayModeSweepLeft(dt) {
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
    const r = 10 * YARDS_TO_PIXELS;
    // Arc center is pinned to initial LOS so it stays stable as QB rolls out
    const cx = getOffsetX(game.playModeLineX, -10);
    const cy = game.playModeSweepArcCY;
    const arcLength = (Math.PI / 2) * r;
    game.playModeSweepHandoffT = Math.min(1, game.playModeSweepHandoffT + (allyHorse.speed * dt) / arcLength);
    const angle = dir > 0
      ? Math.PI + game.playModeSweepHandoffT * (Math.PI / 2)
      : -game.playModeSweepHandoffT * (Math.PI / 2);
    allyHorse.x = cx + r * Math.cos(angle);
    allyHorse.y = cy + r * Math.sin(angle);
    // QB rolls out — backward away from LOS and toward the sweep side
    player1.x -= dir * player1.speed * 0.6 * dt;
    player1.y -= player1.speed * 0.7 * dt;
    clampPlayerToField(player1);
    updateBallPosition();
    // QB still has the ball — if a defender reaches him before the toss, it's a sack
    if (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris)) {
      resolvePlayModeTackle(player1, player1.x, { sack: true });
      return;
    }
    // Defense A: if any defender closes to within 5 yards, QB releases the ball early
    if (game.playModeDefense === "A") {
      const fiveYards = 5 * YARDS_TO_PIXELS;
      if (Math.hypot(player2.x - player1.x, player2.y - player1.y) <= fiveYards ||
          Math.hypot(allyDonkey.x - player1.x, allyDonkey.y - player1.y) <= fiveYards ||
          Math.hypot(cluckNorris.x - player1.x, cluckNorris.y - player1.y) <= fiveYards) {
        game.playModeSweepHandoffT = 1;
      }
    }
    if (game.playModeSweepHandoffT >= 0.4) {
      game.playModePhase = "toss";
      ball.carrier = null;
      ball.inFlight = true;
      ball.x = player1.x;
      ball.y = player1.y - player1.radius - 8;
      const tossToY = allyHorse.y - allyHorse.radius - 8;
      const baseDist = Math.hypot(allyHorse.x - ball.x, tossToY - ball.y);
      let timeOfFlight = baseDist / CONFIG.passSpeed;
      let leadY = -allyHorse.speed * timeOfFlight;
      const leadDist = Math.hypot(allyHorse.x - ball.x, (tossToY + leadY) - ball.y);
      timeOfFlight = leadDist / CONFIG.passSpeed;
      leadY = -allyHorse.speed * timeOfFlight;
      ball.targetX = allyHorse.x;
      ball.targetY = tossToY + leadY;
    }
    moveSweepDefenders(dt);
    return;
  }
  if (game.playModePhase === "toss") {
    allyHorse.y -= allyHorse.speed * dt;
    clampPlayerToField(allyHorse);
    // QB continues rolling out — backward and toward the sweep side
    player1.x -= getOffenseDirection() * player1.speed * 0.6 * dt;
    player1.y -= player1.speed * 0.7 * dt;
    clampPlayerToField(player1);
    const dx = ball.targetX - ball.x;
    const dy = ball.targetY - ball.y;
    const dist = Math.hypot(dx, dy);
    const move = CONFIG.passSpeed * dt;
    if (dist <= move || dist < 6) {
      ball.x = ball.targetX;
      ball.y = ball.targetY;
      ball.inFlight = false;
      ball.carrier = allyHorse;
      game.playModePhase = "sweep";
      updateBallPosition();
    } else {
      ball.x += (dx / dist) * move;
      ball.y += (dy / dist) * move;
    }
    moveSweepDefenders(dt);
    return;
  }
  if (game.playModePhase === "sweep") {
    updatePlayerInput(dt);
    if (game.cpuOffense && ball.carrier === allyHorse) {
      moveCpuOffenseCarrier(allyHorse, dt, FIELD.y + FIELD.height * 0.18);
    }
    moveQuarterbackRunBlock(allyHorse, dt);
    moveSweepDefenders(dt);
    updateBallPosition();
    const carrier = ball.carrier;
    const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;
    if (carrier === allyHorse && hasOffenseScored(allyHorse)) {
      finishDriveTouchdown(allyHorse);
      return;
    }
    if (carrier && (circleTackle(carrier, player2) || circleTackle(carrier, allyDonkey) || circleTackle(carrier, cluckNorris))) {
      resolvePlayModeTackle(carrier, carrier.x);
      return;
    }
    return;
  }
}

function movePassDefenders(dt, ballRef) {
  if (game.passJamWindowMs > 0) {
    game.passJamWindowMs = Math.max(0, game.passJamWindowMs - dt * 1000);
  }
  const { covering, rushing } = getPassDefenders();

  // Target the carrier's center when there is one; otherwise track ball in flight
  const tx = ballRef.carrier ? ballRef.carrier.x : ballRef.x;
  const ty = ballRef.carrier ? ballRef.carrier.y : ballRef.y;

  // QB has scrambled past the line — all defenders converge on the ball carrier
  if (!game.passPlayCanThrow) {
    moveDefensePlayer(covering, tx, ty, covering.speed, dt);
    moveDefensePlayer(rushing, tx, ty, rushing.speed, dt);
    moveDefensePlayer(cluckNorris, tx, ty, cluckNorris.speed, dt);
    if (game.playModeCurrentPlay !== "barnPlay" && game.playModeCurrentPlay !== "scrambledEggs") {
      moveOffenseX(lilTunnelPete, dt);
      clampPlayerToField(lilTunnelPete);
    }
    return;
  }

  if (game.cpuOffense) {
    const coverHorse = getDefenderById(game.passDefCoverHorseId);
    const coverPete = getDefenderById(game.passDefCoverPeteId);
    moveDefensePlayer(rushing, tx, ty, rushing.speed, dt);
    moveDefensePlayer(coverHorse, allyHorse.x, allyHorse.y, coverHorse.speed, dt);
    moveDefensePlayer(coverPete, lilTunnelPete.x, lilTunnelPete.y, coverPete.speed, dt);
    if (!ballRef.inFlight && game.playModeCurrentPlay !== "barnPlay" && game.playModeCurrentPlay !== "scrambledEggs") {
      moveOffenseX(lilTunnelPete, dt);
      clampPlayerToField(lilTunnelPete);
    }
    return;
  }

  if (game.playModeDefense === "B") {
    // Cluck Norris shadows his assigned deep receiver
    const deepTarget    = game.passDefDeepTarget === "horse" ? allyHorse : lilTunnelPete;
    // Upfront covering defender shadows the other receiver
    const shallowTarget = game.passDefDeepTarget === "horse" ? lilTunnelPete : allyHorse;

    // Cluck Norris waits briefly before committing to his man
    if (game.cluckNorrisTimer > 0) {
      game.cluckNorrisTimer -= dt * 1000;
    } else {
      moveDefensePlayer(cluckNorris, deepTarget.x, deepTarget.y, cluckNorris.speed, dt);
    }

    // Upfront covering defender tracks the shallow receiver
    moveDefensePlayer(covering, shallowTarget.x, shallowTarget.y, covering.speed, dt);

    // Upfront rusher charges the QB immediately
    moveDefensePlayer(rushing, tx, ty, rushing.speed, dt);
  } else {
    // Defense A: Pig rushes; Hee Haw and Cluck each stay matched to a receiver
    if (game.defenseReactionTimer > 0) {
      game.defenseReactionTimer -= dt * 1000;
      moveDefensePlayer(covering, allyHorse.x, allyHorse.y, covering.speed * 0.15, dt);
    } else {
      moveDefensePlayer(covering, allyHorse.x, allyHorse.y, covering.speed, dt);
    }

    moveDefensePlayer(rushing, tx, ty, rushing.speed, dt);

    // Cluck Norris carries the other receiver so both pass targets stay covered
    if (game.cluckNorrisTimer > 0) {
      game.cluckNorrisTimer -= dt * 1000;
      moveDefensePlayer(cluckNorris, lilTunnelPete.x, lilTunnelPete.y, cluckNorris.speed * 0.2, dt);
    } else {
      moveDefensePlayer(cluckNorris, lilTunnelPete.x, lilTunnelPete.y, cluckNorris.speed, dt);
    }
  }

  // Pete runs his flat route only while QB still has the ball;
  // when the ball is in flight the caller moves him toward the target instead
  if (!ballRef.inFlight && game.playModeCurrentPlay !== "barnPlay" && game.playModeCurrentPlay !== "scrambledEggs") {
    moveOffenseX(lilTunnelPete, dt);
    clampPlayerToField(lilTunnelPete);
  }
}

function moveBarnPlayReceivers(dt, adjustTarget = null) {
  const horseStemX = clampPlayableX(getOffsetX(game.playModeLineX, 22), 30);
  const peteStemX = clampPlayableX(getOffsetX(game.playModeLineX, 12), 50);
  const horseTargetX = clampPlayableX(getOffsetX(game.playModeLineX, 38), 10);
  const peteTargetX = peteStemX;
  const horseTargetY = FIELD.y + FIELD.height * 0.42;
  const peteTargetY = FIELD.y + FIELD.height * 0.28;

  if (adjustTarget === "horse") {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
  } else if (hasNotReachedForwardX(allyHorse.x, horseStemX)) {
    moveToward(allyHorse, horseStemX, allyHorse.y, allyHorse.speed, dt);
  } else {
    moveToward(allyHorse, horseTargetX, horseTargetY, allyHorse.speed, dt);
  }

  if (adjustTarget === "pete") {
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  } else if (hasNotReachedForwardX(lilTunnelPete.x, peteStemX)) {
    moveToward(lilTunnelPete, peteStemX, lilTunnelPete.y, lilTunnelPete.speed, dt);
  } else {
    moveToward(lilTunnelPete, peteTargetX, peteTargetY, lilTunnelPete.speed, dt);
  }

  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
}

function moveScrambledEggsReceivers(dt, adjustTarget = null) {
  const zStemX = clampPlayableX(getOffsetX(game.playModeLineX, 35), 22);
  const zTargetX = clampPlayableX(getOffsetX(game.playModeLineX, 47), 8);
  const zTargetY = FIELD.y + FIELD.height - 34;
  const xStemX = clampPlayableX(getOffsetX(game.playModeLineX, 27), 42);
  const xTargetX = clampPlayableX(getOffsetX(game.playModeLineX, 25), 24);

  if (adjustTarget === "horse") {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
  } else if (hasNotReachedForwardX(allyHorse.x, xStemX)) {
    moveToward(allyHorse, xStemX, allyHorse.y, allyHorse.speed, dt);
  } else {
    moveToward(allyHorse, xTargetX, allyHorse.y, allyHorse.speed, dt);
  }

  if (adjustTarget === "pete") {
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  } else if (hasNotReachedForwardX(lilTunnelPete.x, zStemX)) {
    moveToward(lilTunnelPete, zStemX, lilTunnelPete.y, lilTunnelPete.speed, dt);
  } else {
    moveToward(lilTunnelPete, zTargetX, zTargetY, lilTunnelPete.speed, dt);
  }

  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
}

function moveBarnDoorBootReceivers(dt) {
  // Boot action: Pete sweeps opposite the QB boot; Horse acts as lead blocker.
  const dir = getOffenseDirection();
  const sweepY = FIELD.y + FIELD.height * 0.8;
  const sweepX = clampPlayableX(game.playModeLineX + dir * 8 * YARDS_TO_PIXELS, lilTunnelPete.radius);
  moveToward(lilTunnelPete, sweepX, sweepY, lilTunnelPete.speed * 0.96, dt);
  const defenders = [player2, allyDonkey, cluckNorris];
  let nearest = defenders[0];
  let nearestD = distance(lilTunnelPete.x, lilTunnelPete.y, nearest.x, nearest.y);
  for (let i = 1; i < defenders.length; i++) {
    const d = distance(lilTunnelPete.x, lilTunnelPete.y, defenders[i].x, defenders[i].y);
    if (d < nearestD) {
      nearestD = d;
      nearest = defenders[i];
    }
  }
  const blockX = (lilTunnelPete.x + nearest.x) * 0.5 - dir * 4;
  const blockY = (lilTunnelPete.y + nearest.y) * 0.5;
  moveToward(allyHorse, blockX, blockY, allyHorse.speed * 0.86, dt);
  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
}

function movePigPenScreenReceivers(dt) {
  const screenY = FIELD.y + FIELD.height * 0.82;
  const screenCatchX = clampPlayableX(game.playModeLineX - getOffenseDirection() * 2 * YARDS_TO_PIXELS, allyHorse.radius);
  // Target receiver settles near LOS for quick screen catch.
  moveToward(allyHorse, screenCatchX, screenY, allyHorse.speed * 0.78, dt);
  // Pete and horse lane create the convoy path.
  moveToward(
    lilTunnelPete,
    clampPlayableX(allyHorse.x + getOffenseDirection() * 5 * YARDS_TO_PIXELS, lilTunnelPete.radius),
    screenY - 16,
    lilTunnelPete.speed * 0.82,
    dt
  );
  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
}

function moveCornfieldCrossReceivers(dt, adjustTarget = null) {
  const topLaneY = FIELD.y + FIELD.height * 0.34;
  const lowLaneY = FIELD.y + FIELD.height * 0.68;
  if (adjustTarget === "horse") {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
  } else {
    moveOffenseX(allyHorse, dt, 0.88);
    moveToward(allyHorse, allyHorse.x, topLaneY, allyHorse.speed * 0.66, dt);
  }
  if (adjustTarget === "pete") {
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  } else {
    moveOffenseX(lilTunnelPete, dt, 0.88);
    moveToward(lilTunnelPete, lilTunnelPete.x, lowLaneY, lilTunnelPete.speed * 0.66, dt);
  }
  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
}

function moveRoosterRolloutReceivers(dt, adjustTarget = null) {
  const dir = getOffenseDirection();
  const deepX = clampPlayableX(game.playModeLineX + dir * 28 * YARDS_TO_PIXELS, allyHorse.radius);
  const midX = clampPlayableX(game.playModeLineX + dir * 16 * YARDS_TO_PIXELS, lilTunnelPete.radius);
  if (adjustTarget === "horse") {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
  } else {
    moveToward(allyHorse, deepX, FIELD.y + 60, allyHorse.speed * 0.84, dt);
  }
  if (adjustTarget === "pete") {
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  } else {
    moveToward(lilTunnelPete, midX, FIELD.y + FIELD.height * 0.52, lilTunnelPete.speed * 0.8, dt);
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
    game.passPlayTargetReceiver = horseDist <= peteDist ? "horse" : "pete";
  }
}

function moveStandardPassReceiversInFlight(dt) {
  const target = game.passPlayTargetReceiver;

  if (target === "horse") {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
    moveOffenseX(lilTunnelPete, dt);
  } else if (target === "pete") {
    moveOffenseX(allyHorse, dt);
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  } else {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  }

  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
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
  if (playKey === "roosterRollout") {
    return resolveArcingPassFlight(dt, (stepDt) => moveRoosterRolloutReceivers(stepDt, game.passPlayTargetReceiver));
  }
  return resolveArcingPassFlight(dt, moveStandardPassReceiversInFlight);
}

function updatePlayModePassRight(dt) {
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;
  const { rushing } = getPassDefenders();

  if (ball.carrier === player1 && !ball.inFlight) {
    // ── Phase 1: CPU drops QB back 10 yards ──
    if (!game.passPlayDropbackDone) {
      if (game.playModeCurrentPlay === "barnDoorBoot") {
        const bootX = clampPlayableX(game.playModeLineX - getOffenseDirection() * 7.5 * YARDS_TO_PIXELS, player1.radius);
        const bootY = FIELD.y + FIELD.height * 0.3;
        if (distance(player1.x, player1.y, bootX, bootY) > 6) {
          moveToward(player1, bootX, bootY, player1.speed * 0.96, dt);
        } else {
          game.passPlayDropbackDone = true;
        }
      } else if (!hasReachedDropbackTarget(player1.x, game.passPlayDropbackTarget)) {
        moveToward(player1, game.passPlayDropbackTarget, player1.y, player1.speed, dt);
      } else {
        game.passPlayDropbackDone = true;
      }
      clampPlayerToField(player1);
    } else {
      // ── Phase 2: Player has full control ──
      updatePlayerInput(dt);
      if (!game.cpuOffense) {
        clampPlayerToField(player1);
      }
      if (hasCrossedLineOfScrimmage(player1.x)) {
        game.passPlayCanThrow = false;
      }
    }

    if (game.passPlayCanThrow) {
      // In pocket — only the rushing defender can sack
      if (isPocketPassRusherTackle(rushing)) {
        resolvePlayModeTackle(player1, player1.x, { sack: true });
        updateBallPosition();
        return;
      }
    } else {
      // QB scrambling past line — both defenders can tackle
      if (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris)) {
        resolvePlayModeTackle(player1, player1.x);
        updateBallPosition();
        return;
      }
      if (hasOffenseScored(player1)) {
        finishDriveTouchdown(player1);
        return;
      }
    }

    if (game.playModeCurrentPlay === "pigPenScreen") {
      movePigPenScreenReceivers(dt);
    } else {
      moveOffenseX(allyHorse, dt);
      clampPlayerToField(allyHorse);
    }
    if (maybeRunDefenseModeCpuPass("passRight", dt)) {
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
    movePassDefenders(dt, ball);
    return;
  }

  if (ball.carrier === allyHorse) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(allyHorse, dt, allyHorse.y);
    }
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

  if (ball.carrier === player1 && !ball.inFlight) {
    // ── Phase 1: CPU drops QB back 10 yards ──
    if (!game.passPlayDropbackDone) {
      if (!hasReachedDropbackTarget(player1.x, game.passPlayDropbackTarget)) {
        moveToward(player1, game.passPlayDropbackTarget, player1.y, player1.speed, dt);
      } else {
        game.passPlayDropbackDone = true;
      }
      clampPlayerToField(player1);
    } else {
      // ── Phase 2: Player has full control ──
      updatePlayerInput(dt);
      if (!game.cpuOffense) {
        clampPlayerToField(player1);
      }
      if (hasCrossedLineOfScrimmage(player1.x)) {
        game.passPlayCanThrow = false;
      }
    }

    if (game.passPlayCanThrow) {
      // In pocket — only the rushing defender can sack
      if (isPocketPassRusherTackle(rushing)) {
        resolvePlayModeTackle(player1, player1.x, { sack: true });
        updateBallPosition();
        return;
      }
    } else {
      // QB scrambling past line — both defenders can tackle
      if (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris)) {
        resolvePlayModeTackle(player1, player1.x);
        updateBallPosition();
        return;
      }
      if (hasOffenseScored(player1)) {
        finishDriveTouchdown(player1);
        return;
      }
    }

    if (game.playModeCurrentPlay === "barnDoorBoot") {
      moveBarnDoorBootReceivers(dt);
    } else {
      moveOffenseX(allyHorse, dt);
      clampPlayerToField(allyHorse);
    }
    if (maybeRunDefenseModeCpuPass("passLeft", dt)) {
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
    movePassDefenders(dt, ball);
    return;
  }

  if (ball.carrier === allyHorse) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(allyHorse, dt, allyHorse.y);
    }
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

function updatePlayModeBarnPlay(dt) {
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;
  const { rushing } = getPassDefenders();

  if (ball.carrier === player1 && !ball.inFlight) {
    if (!game.passPlayDropbackDone) {
      if (!hasReachedDropbackTarget(player1.x, game.passPlayDropbackTarget)) {
        moveToward(player1, game.passPlayDropbackTarget, player1.y, player1.speed, dt);
      } else {
        game.passPlayDropbackDone = true;
      }
      clampPlayerToField(player1);
    } else {
      updatePlayerInput(dt);
      if (!game.cpuOffense) {
        clampPlayerToField(player1);
      }
      if (hasCrossedLineOfScrimmage(player1.x)) {
        game.passPlayCanThrow = false;
      }
    }

    if (game.passPlayCanThrow) {
      if (isPocketPassRusherTackle(rushing)) {
        resolvePlayModeTackle(player1, player1.x, { sack: true });
        updateBallPosition();
        return;
      }
    } else {
      if (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris)) {
        resolvePlayModeTackle(player1, player1.x);
        updateBallPosition();
        return;
      }
      if (hasOffenseScored(player1)) {
        finishDriveTouchdown(player1);
        return;
      }
    }

    if (game.playModeCurrentPlay === "cornfieldCross") {
      moveCornfieldCrossReceivers(dt);
    } else {
      moveBarnPlayReceivers(dt);
    }
    if (maybeRunDefenseModeCpuPass("barnPlay", dt)) {
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
    movePassDefenders(dt, ball);
    return;
  }

  if (ball.carrier === allyHorse) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(allyHorse, dt, allyHorse.y);
    }
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

  if (ball.carrier === player1 && !ball.inFlight) {
    if (!game.passPlayDropbackDone) {
      if (!hasReachedDropbackTarget(player1.x, game.passPlayDropbackTarget)) {
        moveToward(player1, game.passPlayDropbackTarget, player1.y, player1.speed, dt);
      } else {
        game.passPlayDropbackDone = true;
      }
      clampPlayerToField(player1);
    } else {
      updatePlayerInput(dt);
      if (!game.cpuOffense) {
        clampPlayerToField(player1);
      }
      if (hasCrossedLineOfScrimmage(player1.x)) {
        game.passPlayCanThrow = false;
      }
    }

    if (game.passPlayCanThrow) {
      if (isPocketPassRusherTackle(rushing)) {
        resolvePlayModeTackle(player1, player1.x, { sack: true });
        updateBallPosition();
        return;
      }
    } else {
      if (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris)) {
        resolvePlayModeTackle(player1, player1.x);
        updateBallPosition();
        return;
      }
      if (hasOffenseScored(player1)) {
        finishDriveTouchdown(player1);
        return;
      }
    }

    if (game.playModeCurrentPlay === "roosterRollout") {
      moveRoosterRolloutReceivers(dt);
    } else {
      moveScrambledEggsReceivers(dt);
    }
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
    movePassDefenders(dt, ball);
    return;
  }

  if (ball.carrier === allyHorse) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(allyHorse, dt, allyHorse.y);
    }
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
    if (game.afterTouchdownAction === "startPlayModeDrive") {
      if (game.patKickScorerIsPlayer1) {
        game.state = "postTouchdownChoice";
      } else {
        beginCpuPostTouchdownKickAttempt();
      }
    }
  }
}

function updateSafetyPopup(dt) {
  game.safetyPopupTimer -= dt * 1000;
  if (game.safetyPopupTimer <= 0) {
    game.safetyPopupTimer = 0;
    game.state = "gameOver";
    game.winner = null;
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
  if (game.state === "menu" || game.state === "playTeamSelect" || game.state === "playOpponentReveal" || game.state === "pauseMenu" || game.state === "playModePlaySelect") {
    return;
  }
  if (game.state === "prePlayCadence") {
    updatePrePlayCadence(dt);
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

