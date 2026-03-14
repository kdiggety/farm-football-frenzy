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
  ball.x = FIELD.x + FIELD.width / 2;
  ball.y = FIELD.y + FIELD.height / 2;
}

function updateBallPosition() {
  if (ball.inFlight) return;
  if (ball.carrier) {
    ball.x = ball.carrier.x;
    ball.y = ball.carrier.y - ball.carrier.radius - 8;
  }
}

// =========================================================
// Reset / Restart Logic
// =========================================================
function resetPositions() {
  player1.x = FIELD.x + 170;
  player1.y = FIELD.y + FIELD.height / 2;

  player2.x = FIELD.x + FIELD.width - 170;
  player2.y = FIELD.y + FIELD.height / 2;

  allyHorse.x = player1.x - 60;
  allyHorse.y = player1.y - 40;

  allyDonkey.x = player2.x + 60;
  allyDonkey.y = player2.y + 40;

  setBallFreeAtMidfield();
  ball.inFlight = false;
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
}

function restartGame() {
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
  // Pig: 10 yards to the right of QB; Donkey: 20 yards to the right of QB (same horizontal line)
  player2.x = qbX + 10 * YARDS_TO_PIXELS;
  player2.y = qbY;
  allyDonkey.x = qbX + 20 * YARDS_TO_PIXELS;
  allyDonkey.y = qbY;
}

function positionDefenseB(ballX, ballY) {
  // Both defenders 20 yards to the right of the ball, same x; split evenly top and bottom
  const defX = ballX + 20 * YARDS_TO_PIXELS;
  player2.x = defX;
  player2.y = FIELD.y + FIELD.height * 0.25;
  allyDonkey.x = defX;
  allyDonkey.y = FIELD.y + FIELD.height * 0.75;
}

function positionDefenseForPlay() {
  if (Math.random() < 0.5) {
    positionDefenseA(player1.x, player1.y);
  } else {
    positionDefenseB(ball.x, ball.y);
  }
}

function getLeftTenYardLineX() {
  return FIELD.x + FIELD.endZoneWidth + 10 * YARDS_TO_PIXELS;
}

function getLeftTwentyYardLineX() {
  return FIELD.x + FIELD.endZoneWidth + 20 * YARDS_TO_PIXELS;
}

function positionForPlayModeAt(x) {
  const midY = FIELD.y + FIELD.height / 2;
  player1.x = x - 40;
  player1.y = midY;
  allyHorse.x = player1.x - 60;
  allyHorse.y = player1.y - 40;
  ball.carrier = player1;
  ball.inFlight = false;
  updateBallPosition();
  positionDefenseForPlay();
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
}

function startPlayModeDrive(fromX) {
  const startX = fromX !== undefined ? fromX : getLeftTwentyYardLineX();
  game.mode = "play";
  game.state = "playModePlaySelect";
  game.playModeDown = 1;
  game.playModeLineX = startX;
  game.playModePhase = null;
  game.playModeCurrentPlay = null;
  positionForPlayModeAt(startX);
}

function advancePlayModeDown(newLineX) {
  if (game.playModeDown >= game.playModeMaxDowns) {
    game.state = "gameOver";
    game.winner = null;
    return;
  }
  game.playModeDown += 1;
  game.playModeLineX = newLineX;
  game.playModePhase = null;
  game.playModeCurrentPlay = null;
  positionForPlayModeAt(newLineX);
  game.state = "playModePlaySelect";
}

function positionForSweepRight() {
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  player1.x = lineX - 40;
  player1.y = midY;
  allyHorse.x = player1.x - 10 * YARDS_TO_PIXELS;
  allyHorse.y = midY;
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
  game.state = "playing";
  positionForSweepRight();
}

function positionForSweepLeft() {
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  player1.x = lineX - 40;
  player1.y = midY;
  allyHorse.x = player1.x - 10 * YARDS_TO_PIXELS;
  allyHorse.y = midY;
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
  game.state = "playing";
  positionForSweepLeft();
}

function positionForPassRight() {
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  player1.x = lineX - 40;
  player1.y = midY;
  allyHorse.x = lineX + 20;
  allyHorse.y = FIELD.y + FIELD.height - 50;
  ball.carrier = player1;
  ball.inFlight = false;
  updateBallPosition();
  positionDefenseForPlay();
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
}

function startPassRightPlay() {
  game.playModeCurrentPlay = "passRight";
  game.playModePhase = null;
  game.state = "playing";
  positionForPassRight();
}

function positionForPassLeft() {
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  player1.x = lineX - 40;
  player1.y = midY;
  allyHorse.x = lineX + 20;
  allyHorse.y = FIELD.y + 50;
  ball.carrier = player1;
  ball.inFlight = false;
  updateBallPosition();
  positionDefenseForPlay();
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
}

function startPassLeftPlay() {
  game.playModeCurrentPlay = "passLeft";
  game.playModePhase = null;
  game.state = "playing";
  positionForPassLeft();
}

function startPlayMode() {
  player1.score = 0;
  player2.score = 0;
  game.winner = null;
  game.scorePauseTimer = 0;
  game.scoredBy = null;
  startPlayModeDrive();
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
  if (ball.carrier === player1 && player1.x >= rightEndZoneLeft) {
    scorePoint(player1);
    return;
  }

  // CPU scores in the left end zone
  if (ball.carrier === player2 && player2.x <= leftEndZoneRight) {
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

function updatePlaying(dt) {
  if (game.mode === "play") {
    updatePlayMode(dt);
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

  if (!ball.inFlight) {
    tryPickupBall();
    handleCarrierCollisionSteal();
  }
  updateBallPosition();
  checkTouchdown();
}

function updatePlayMode(dt) {
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
  if (game.playModeCurrentPlay === "passLeft") {
    updatePlayModePassLeft(dt);
    return;
  }
  updatePlayerInput(dt);
  updateCPU(dt);
  updateAllies(dt);
  updateBallPosition();
  if (ball.carrier === player1 && circleTouch(player1, player2)) {
    game.state = "playModeDowned";
    game.playModeDownedSpot = player1.x;
    return;
  }
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;
  if (ball.carrier === player1 && player1.x >= rightEndZoneLeft) {
    player1.score += 1;
    game.state = "touchdownPopup";
    game.touchdownPopupTimer = 4000;
    game.afterTouchdownAction = "startPlayModeDrive";
  }
}

function updatePlayModeSweepRight(dt) {
  if (game.playModePhase === "handoff") {
    const r = 10 * YARDS_TO_PIXELS;  // sweep arc radius = 10 yards
    const cx = player1.x - r;
    const cy = player1.y;
    const arcLength = (Math.PI / 2) * r;
    game.playModeSweepHandoffT = Math.min(1, game.playModeSweepHandoffT + (allyHorse.speed * dt) / arcLength);
    // Quarter circle from PI (left) to PI/2 (down) — flipped so RB sweeps down instead of up
    const angle = Math.PI - game.playModeSweepHandoffT * (Math.PI / 2);
    allyHorse.x = cx + r * Math.cos(angle);
    allyHorse.y = cy + r * Math.sin(angle);
    updateBallPosition();
    if (game.playModeSweepHandoffT >= 1) {
      game.playModePhase = "toss";
      ball.carrier = null;
      ball.inFlight = true;
      ball.x = player1.x;
      ball.y = player1.y - player1.radius - 8;
      const tossToY = allyHorse.y - allyHorse.radius - 8;
      const baseDist = Math.hypot(allyHorse.x - ball.x, tossToY - ball.y);
      let timeOfFlight = baseDist / CONFIG.passSpeed;
      let leadX = allyHorse.speed * timeOfFlight;
      const leadDist = Math.hypot((allyHorse.x + leadX) - ball.x, tossToY - ball.y);
      timeOfFlight = leadDist / CONFIG.passSpeed;
      leadX = allyHorse.speed * timeOfFlight;
      ball.targetX = allyHorse.x + leadX;
      ball.targetY = tossToY;
    }
    // Defenders key the football
    moveToward(player2, ball.x, ball.y, player2.speed, dt);
    moveToward(allyDonkey, ball.x, ball.y, allyDonkey.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    return;
  }
  if (game.playModePhase === "toss") {
    // RB runs toward the lead point so he meets the ball
    allyHorse.x += allyHorse.speed * dt;
    clampPlayerToField(allyHorse);
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
    // Defenders key the football
    moveToward(player2, ball.x, ball.y, player2.speed, dt);
    moveToward(allyDonkey, ball.x, ball.y, allyDonkey.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    return;
  }
  if (game.playModePhase === "sweep") {
    updatePlayerInput(dt);
    // Defenders key the football
    moveToward(player2, ball.x, ball.y, player2.speed, dt);
    moveToward(allyDonkey, ball.x, ball.y, allyDonkey.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    updateBallPosition();
    const carrier = ball.carrier;
    if (carrier && (circleTouch(carrier, player2) || circleTouch(carrier, allyDonkey))) {
      game.state = "playModeDowned";
      game.playModeDownedSpot = carrier.x;
      game.playModePhase = null;
      game.playModeCurrentPlay = null;
      return;
    }
    const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;
    if (carrier === allyHorse && allyHorse.x >= rightEndZoneLeft) {
      player1.score += 1;
      game.state = "touchdownPopup";
      game.touchdownPopupTimer = 4000;
      game.afterTouchdownAction = "startPlayModeDrive";
    }
    return;
  }
}

function updatePlayModeSweepLeft(dt) {
  if (game.playModePhase === "handoff") {
    const r = 10 * YARDS_TO_PIXELS;
    const cx = player1.x - r;
    const cy = player1.y;
    const arcLength = (Math.PI / 2) * r;
    game.playModeSweepHandoffT = Math.min(1, game.playModeSweepHandoffT + (allyHorse.speed * dt) / arcLength);
    const angle = Math.PI + game.playModeSweepHandoffT * (Math.PI / 2);
    allyHorse.x = cx + r * Math.cos(angle);
    allyHorse.y = cy + r * Math.sin(angle);
    updateBallPosition();
    if (game.playModeSweepHandoffT >= 1) {
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
    moveToward(player2, ball.x, ball.y, player2.speed, dt);
    moveToward(allyDonkey, ball.x, ball.y, allyDonkey.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    return;
  }
  if (game.playModePhase === "toss") {
    allyHorse.y -= allyHorse.speed * dt;
    clampPlayerToField(allyHorse);
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
    moveToward(player2, ball.x, ball.y, player2.speed, dt);
    moveToward(allyDonkey, ball.x, ball.y, allyDonkey.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    return;
  }
  if (game.playModePhase === "sweep") {
    updatePlayerInput(dt);
    moveToward(player2, ball.x, ball.y, player2.speed, dt);
    moveToward(allyDonkey, ball.x, ball.y, allyDonkey.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    updateBallPosition();
    const carrier = ball.carrier;
    if (carrier && (circleTouch(carrier, player2) || circleTouch(carrier, allyDonkey))) {
      game.state = "playModeDowned";
      game.playModeDownedSpot = carrier.x;
      game.playModePhase = null;
      game.playModeCurrentPlay = null;
      return;
    }
    const topBoundary = FIELD.y + 40;
    if (carrier === allyHorse && allyHorse.y <= topBoundary) {
      player1.score += 1;
      game.state = "touchdownPopup";
      game.touchdownPopupTimer = 4000;
      game.afterTouchdownAction = "startPlayModeDrive";
    }
    return;
  }
}

function updatePlayModePassRight(dt) {
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;

  if (ball.carrier === player1 && !ball.inFlight) {
    player1.x -= player1.speed * dt;
    clampPlayerToField(player1);
    if (circleTouch(player1, player2) || circleTouch(player1, allyDonkey)) {
      game.state = "playModeDowned";
      game.playModeDownedSpot = player1.x;
      game.playModeCurrentPlay = null;
      updateBallPosition();
      return;
    }
    allyHorse.x += allyHorse.speed * dt;
    clampPlayerToField(allyHorse);
    moveToward(player2, ball.x, ball.y, player2.speed, dt);
    moveToward(allyDonkey, ball.x, ball.y, allyDonkey.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    updateBallPosition();
    return;
  }

  if (ball.inFlight) {
    allyHorse.x += allyHorse.speed * dt;
    clampPlayerToField(allyHorse);
    const dx = ball.targetX - ball.x;
    const dy = ball.targetY - ball.y;
    const dist = Math.hypot(dx, dy);
    const move = CONFIG.passSpeed * dt;
    if (dist <= move || dist < 8) {
      ball.x = ball.targetX;
      ball.y = ball.targetY;
      ball.inFlight = false;
      if (circleTouch(allyHorse, ball)) {
        ball.carrier = allyHorse;
        updateBallPosition();
      } else {
        ball.x = player1.x;
        ball.y = player1.y - player1.radius - 8;
        ball.carrier = null;
        game.state = "playModeDowned";
        game.playModeDownedSpot = player1.x;
        game.playModeCurrentPlay = null;
      }
    } else {
      ball.x += (dx / dist) * move;
      ball.y += (dy / dist) * move;
    }
    moveToward(player2, ball.x, ball.y, player2.speed, dt);
    moveToward(allyDonkey, ball.x, ball.y, allyDonkey.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    return;
  }

  if (ball.carrier === allyHorse) {
    updatePlayerInput(dt);
    moveToward(player2, ball.x, ball.y, player2.speed, dt);
    moveToward(allyDonkey, ball.x, ball.y, allyDonkey.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    updateBallPosition();
    if (circleTouch(allyHorse, player2) || circleTouch(allyHorse, allyDonkey)) {
      game.state = "playModeDowned";
      game.playModeDownedSpot = allyHorse.x;
      game.playModeCurrentPlay = null;
      return;
    }
    if (allyHorse.x >= rightEndZoneLeft) {
      player1.score += 1;
      game.state = "touchdownPopup";
      game.touchdownPopupTimer = 4000;
      game.afterTouchdownAction = "startPlayModeDrive";
    }
    return;
  }

  updateBallPosition();
}

function updatePlayModePassLeft(dt) {
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;

  if (ball.carrier === player1 && !ball.inFlight) {
    player1.x -= player1.speed * dt;
    clampPlayerToField(player1);
    if (circleTouch(player1, player2) || circleTouch(player1, allyDonkey)) {
      game.state = "playModeDowned";
      game.playModeDownedSpot = player1.x;
      game.playModeCurrentPlay = null;
      updateBallPosition();
      return;
    }
    allyHorse.x += allyHorse.speed * dt;
    clampPlayerToField(allyHorse);
    moveToward(player2, ball.x, ball.y, player2.speed, dt);
    moveToward(allyDonkey, ball.x, ball.y, allyDonkey.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    updateBallPosition();
    return;
  }

  if (ball.inFlight) {
    allyHorse.x += allyHorse.speed * dt;
    clampPlayerToField(allyHorse);
    const dx = ball.targetX - ball.x;
    const dy = ball.targetY - ball.y;
    const dist = Math.hypot(dx, dy);
    const move = CONFIG.passSpeed * dt;
    if (dist <= move || dist < 8) {
      ball.x = ball.targetX;
      ball.y = ball.targetY;
      ball.inFlight = false;
      if (circleTouch(allyHorse, ball)) {
        ball.carrier = allyHorse;
        updateBallPosition();
      } else {
        ball.x = player1.x;
        ball.y = player1.y - player1.radius - 8;
        ball.carrier = null;
        game.state = "playModeDowned";
        game.playModeDownedSpot = player1.x;
        game.playModeCurrentPlay = null;
      }
    } else {
      ball.x += (dx / dist) * move;
      ball.y += (dy / dist) * move;
    }
    moveToward(player2, ball.x, ball.y, player2.speed, dt);
    moveToward(allyDonkey, ball.x, ball.y, allyDonkey.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    return;
  }

  if (ball.carrier === allyHorse) {
    updatePlayerInput(dt);
    moveToward(player2, ball.x, ball.y, player2.speed, dt);
    moveToward(allyDonkey, ball.x, ball.y, allyDonkey.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    updateBallPosition();
    if (circleTouch(allyHorse, player2) || circleTouch(allyHorse, allyDonkey)) {
      game.state = "playModeDowned";
      game.playModeDownedSpot = allyHorse.x;
      game.playModeCurrentPlay = null;
      return;
    }
    if (allyHorse.x >= rightEndZoneLeft) {
      player1.score += 1;
      game.state = "touchdownPopup";
      game.touchdownPopupTimer = 4000;
      game.afterTouchdownAction = "startPlayModeDrive";
    }
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
      game.afterTouchdownAction = null;
      startPlayModeDrive();
    }
  }
}

function update(dt) {
  if (game.state === "menu" || game.state === "pauseMenu" || game.state === "playModeDowned" || game.state === "playModePlaySelect") {
    return;
  }
  if (game.state === "touchdownPopup") {
    updateTouchdownPopup(dt);
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

