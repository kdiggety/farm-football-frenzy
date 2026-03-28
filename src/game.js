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

  cluckNorris.x = player2.x + 40;
  cluckNorris.y = player2.y - 40;

  lilTunnelPete.x = player1.x - 40;
  lilTunnelPete.y = player1.y + 40;

  setBallFreeAtMidfield();
  ball.inFlight = false;
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
}

function restartGame() {
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
  const closeX = qbX + 5  * YARDS_TO_PIXELS;
  const deepX  = qbX + 20 * YARDS_TO_PIXELS;
  player2.x    = closeX;
  player2.y    = FIELD.y + FIELD.height * 0.2;
  allyDonkey.x = closeX;
  allyDonkey.y = FIELD.y + FIELD.height * 0.8;
  cluckNorris.x = deepX;
  cluckNorris.y = FIELD.y + FIELD.height * 0.5;
}

function positionDefenseB(qbX, qbY) {
  // Pig & Hee Haw: 20 yds right, split top/bottom; Big Coop: 5 yds right, middle
  const closeX = qbX + 5  * YARDS_TO_PIXELS;
  const deepX  = qbX + 20 * YARDS_TO_PIXELS;
  player2.x    = deepX;
  player2.y    = FIELD.y + FIELD.height * 0.2;
  allyDonkey.x = deepX;
  allyDonkey.y = FIELD.y + FIELD.height * 0.8;
  cluckNorris.x = closeX;
  cluckNorris.y = FIELD.y + FIELD.height * 0.5;
}

// Returns {covering, rushing} defender references for pass plays
function getPassDefenders() {
  if (game.playModeDefense === "B") {
    const covering = game.passDefCovering === "pig" ? player2 : allyDonkey;
    const rushing  = game.passDefRushing  === "pig" ? player2 : allyDonkey;
    return { covering, rushing };
  }
  // Defense A: Pig rushes, Hee Haw covers (with reaction delay handled at call site)
  return { covering: allyDonkey, rushing: player2 };
}

function positionDefenseForPlay(wrY) {
  game.passDefCovering = null;
  game.passDefRushing = null;
  game.passDefDeepTarget = null;
  game.defenseReactionTimer = 0;
  const useDefenseA = game.selectedDefense === "A"
    ? true
    : game.selectedDefense === "B"
    ? false
    : Math.random() < 0.5;
  if (useDefenseA) {
    game.playModeDefense = "A";
    positionDefenseA(player1.x, player1.y);
    // Pass play: 550ms coverage delay for Hee Haw; run play: 500ms delay for both defenders
    game.defenseReactionTimer = (wrY !== undefined) ? 550 : 500;
    game.cluckNorrisTimer = (wrY !== undefined) ? 1000 : 750;
  } else {
    game.playModeDefense = "B";
    positionDefenseB(player1.x, player1.y);
    game.cluckNorrisTimer = (wrY !== undefined) ? 1000 : 750;
    // Defense B on pass plays: randomly assign all three defenders
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
  }
}

function getLeftTenYardLineX() {
  return FIELD.x + FIELD.endZoneWidth + 10 * YARDS_TO_PIXELS;
}

function getLeftTwentyYardLineX() {
  return FIELD.x + FIELD.endZoneWidth + 20 * YARDS_TO_PIXELS;
}

function previewDefensePositions() {
  if (game.selectedDefense === "A") {
    positionDefenseA(player1.x, player1.y);
  } else   if (game.selectedDefense === "B") {
    positionDefenseB(player1.x, player1.y);
  } else {
    // Random — flip a coin for the preview
    if (Math.random() < 0.5) positionDefenseA(player1.x, player1.y);
    else positionDefenseB(player1.x, player1.y);
  }
}

function positionForPlayModeAt(x) {
  const midY = FIELD.y + FIELD.height / 2;
  player1.x = x - 40;
  player1.y = midY;
  allyHorse.x = player1.x - 60;
  allyHorse.y = player1.y - 40;
  lilTunnelPete.x = player1.x - 40;
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
  game.mode = "play";
  game.state = "playModePlaySelect";
  game.playModePlayFilter = null;
  game.playModePlaySelectPage = 0;
  game.playModeDown = 1;
  game.playModeLineX = startX;
  game.playModePhase = null;
  game.playModeCurrentPlay = null;
  positionForPlayModeAt(startX);
}

function setPlayModePlayFilter(filter) {
  game.playModePlayFilter = filter;
  game.playModePlaySelectPage = 0;
}

function advancePlayModeDown(newLineX) {
  // Tackled by the CPU inside the pig's end zone = Safety
  if (game.playModeTackle && newLineX <= FIELD.x + FIELD.endZoneWidth) {
    game.state = "safetyPopup";
    game.safetyPopupTimer = 3500;
    game.playModeTackle = false;
    return;
  }
  game.playModeTackle = false;
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
  game.playModePlaySelectPage = 0;
  game.state = "playModePlaySelect";
}

function positionForSweepRight() {
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  player1.x = lineX;
  player1.y = midY;
  allyHorse.x = player1.x - 10 * YARDS_TO_PIXELS;
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
  allyHorse.x = player1.x - 10 * YARDS_TO_PIXELS;
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
  allyHorse.x = lineX + 20;
  allyHorse.y = FIELD.y + FIELD.height - 50;
  lilTunnelPete.x = lineX - 80;
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
  game.passPlayDropbackTarget = Math.max(lineX - 10 * YARDS_TO_PIXELS, FIELD.x + FIELD.endZoneWidth + player1.radius + 4);
  game.rushReactionTimer      = 500;
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
  player1.x = lineX;
  player1.y = midY;
  allyHorse.x = lineX + 20;
  allyHorse.y = FIELD.y + 50;
  lilTunnelPete.x = lineX - 80;
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
  game.passPlayDropbackTarget = Math.max(lineX - 10 * YARDS_TO_PIXELS, FIELD.x + FIELD.endZoneWidth + player1.radius + 4);
  game.rushReactionTimer      = 500;
}

function startPassLeftPlay() {
  game.playModeCurrentPlay = "passLeft";
  game.playModePhase = null;
  game.state = "playing";
  positionForPassLeft();
}

function positionForBarnPlay() {
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  const spacingY = 10 * YARDS_TO_PIXELS;
  const bottomY = FIELD.y + FIELD.height - 55;
  player1.x = lineX;
  player1.y = midY;
  allyHorse.x = lineX + 20;
  allyHorse.y = bottomY;
  lilTunnelPete.x = lineX + 20;
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
  game.passPlayDropbackTarget = Math.max(lineX - 10 * YARDS_TO_PIXELS, FIELD.x + FIELD.endZoneWidth + player1.radius + 4);
  game.rushReactionTimer      = 500;
}

function startBarnPlay() {
  game.playModeCurrentPlay = "barnPlay";
  game.playModePhase = null;
  game.state = "playing";
  positionForBarnPlay();
}

function positionForScrambledEggs() {
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  const spacingY = 10 * YARDS_TO_PIXELS;
  const bottomY = FIELD.y + FIELD.height - 55;
  player1.x = lineX;
  player1.y = midY;
  allyHorse.x = lineX + 20;
  allyHorse.y = bottomY;
  lilTunnelPete.x = lineX + 20;
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
  game.passPlayDropbackTarget = Math.max(lineX - 10 * YARDS_TO_PIXELS, FIELD.x + FIELD.endZoneWidth + player1.radius + 4);
  game.rushReactionTimer      = 500;
}

function startScrambledEggsPlay() {
  game.playModeCurrentPlay = "scrambledEggs";
  game.playModePhase = null;
  game.state = "playing";
  positionForScrambledEggs();
}

function positionForDiveRight() {
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  const r = 5 * YARDS_TO_PIXELS;
  // QB at the line of scrimmage
  player1.x = lineX;
  player1.y = midY;
  // Pete starts at the arc's t=0 position (2r behind QB, same Y)
  lilTunnelPete.x = lineX - 2 * r;
  lilTunnelPete.y = midY;
  // Horse starts just behind Pete, ready to trail him through the arc
  allyHorse.x = lineX - 2 * r - 3 * YARDS_TO_PIXELS;
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
    moveToward(player2,    tx, ty, pigSpd, dt); clampPlayerToField(player2);
    moveToward(allyDonkey, tx, ty, hawSpd, dt); clampPlayerToField(allyDonkey);
  }

  if (game.cluckNorrisTimer > 0) {
    game.cluckNorrisTimer -= dt * 1000;
  } else {
    moveToward(cluckNorris, tx, ty, coopSpd, dt);
    clampPlayerToField(cluckNorris);
  }
}

function updatePlayModeDiveRight(dt) {
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;

  if (game.playModePhase === "handoff") {
    // Pete runs the same quarter-circle arc the RB uses on Sweep Right.
    // Arc center is pinned to the original line of scrimmage so it stays
    // stable while the QB moves.
    const r = 5 * YARDS_TO_PIXELS;
    const cx = game.playModeLineX - r;
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
      setPlayDowned(player1.x, { tackle: true, sack: true });
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
    clampPlayerToField(allyHorse);
    moveDiveRightDefenders(dt);
    updateBallPosition();

    if (allyHorse.x >= rightEndZoneLeft) {
      player1.score += 1;
      game.state = "touchdownPopup";
      game.touchdownPopupTimer = 4000;
      game.afterTouchdownAction = "startPlayModeDrive";
      playTouchdownAudio(allyHorse);
      return;
    }
    if (circleTackle(allyHorse, player2) || circleTackle(allyHorse, allyDonkey) || circleTackle(allyHorse, cluckNorris)) {
      setPlayDowned(allyHorse.x, { tackle: true });
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
    moveToward(player2,    tx, ty, pigSpd, dt); clampPlayerToField(player2);
    moveToward(allyDonkey, tx, ty, hawSpd, dt); clampPlayerToField(allyDonkey);
  }

  if (game.cluckNorrisTimer > 0) {
    game.cluckNorrisTimer -= dt * 1000;
  } else {
    moveToward(cluckNorris, tx, ty, coopSpd, dt);
    clampPlayerToField(cluckNorris);
  }
}

function positionForDiveLeft() {
  const midY = FIELD.y + FIELD.height / 2;
  const lineX = game.playModeLineX;
  const r = 5 * YARDS_TO_PIXELS;
  player1.x = lineX;
  player1.y = midY;
  lilTunnelPete.x = lineX - 2 * r;
  lilTunnelPete.y = midY;
  allyHorse.x = lineX - 2 * r - 3 * YARDS_TO_PIXELS;
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
    default:
      break;
  }
}

function updatePlayModeDiveLeft(dt) {
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;

  if (game.playModePhase === "handoff") {
    // Pete runs the mirror arc — curving upward toward the top sideline
    const r = 5 * YARDS_TO_PIXELS;
    const cx = game.playModeLineX - r;
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

    if (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris)) {
      setPlayDowned(player1.x, { tackle: true, sack: true });
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
    clampPlayerToField(allyHorse);
    moveDiveLeftDefenders(dt);
    updateBallPosition();

    if (allyHorse.x >= rightEndZoneLeft) {
      player1.score += 1;
      game.state = "touchdownPopup";
      game.touchdownPopupTimer = 4000;
      game.afterTouchdownAction = "startPlayModeDrive";
      playTouchdownAudio(allyHorse);
      return;
    }
    if (circleTackle(allyHorse, player2) || circleTackle(allyHorse, allyDonkey) || circleTackle(allyHorse, cluckNorris)) {
      setPlayDowned(allyHorse.x, { tackle: true });
      return;
    }
  }
}

function startPlayMode() {
  player1.score = 0;
  player2.score = 0;
  game.winner = null;
  game.scorePauseTimer = 0;
  game.scoredBy = null;
  startGameMusic();
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
  resolveCharacterCollisions();
  updateBallPosition();
  checkTouchdown();
}

// ── Play result helper ────────────────────────────────────
// Call this instead of manually setting game.state = "playModeDowned".
// Captures yards / play type before they are cleared.
function setPlayDowned(downedX, { tackle = false, incomplete = false, sack = false } = {}) {
  const playType = game.playModeCurrentPlay;
  const rawYards = (downedX - game.playModeLineX) / YARDS_TO_PIXELS;
  const yards    = incomplete ? 0 : Math.round(rawYards);

  let resultType;
  if      (incomplete)  resultType = "incomplete";
  else if (sack)        resultType = "sack";
  else if (yards > 0)   resultType = "gain";
  else if (yards < 0)   resultType = "loss";
  else                  resultType = "noGain";

  game.playModeLastPlayType   = playType;
  game.playModeLastYards      = yards;
  game.playModeLastResultType = resultType;

  game.state              = "playModeDowned";
  game.playModeDownedSpot = incomplete ? game.playModeLineX : downedX;
  game.playModeTackle     = tackle;
  game.playModeIncomplete = incomplete;
  game.playModePhase      = null;
  game.playModeCurrentPlay = null;
  game.passPlayTargetReceiver = null;
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
  if (game.playModeCurrentPlay === "barnPlay") {
    updatePlayModeBarnPlay(dt);
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
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;
  if (ball.carrier === player1 && player1.x >= rightEndZoneLeft) {
    player1.score += 1;
    game.state = "touchdownPopup";
    game.touchdownPopupTimer = 4000;
    game.afterTouchdownAction = "startPlayModeDrive";
    playTouchdownAudio(player1);
    return;
  }
  if (ball.carrier === player1 && (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris))) {
    setPlayDowned(player1.x, { tackle: true });
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
    moveToward(player2,    tx, ty, pigSpd, dt); clampPlayerToField(player2);
    moveToward(allyDonkey, tx, ty, hawSpd, dt); clampPlayerToField(allyDonkey);
  }

  if (game.cluckNorrisTimer > 0) {
    game.cluckNorrisTimer -= dt * 1000;
  } else {
    moveToward(cluckNorris, tx, ty, coopSpd, dt);
    clampPlayerToField(cluckNorris);
  }
}

function updatePlayModeSweepRight(dt) {
  if (game.playModePhase === "handoff") {
    const r = 10 * YARDS_TO_PIXELS;  // sweep arc radius = 10 yards
    // Arc center is pinned to initial LOS so it stays stable as QB rolls out
    const cx = game.playModeLineX - r;
    const cy = game.playModeSweepArcCY;
    const arcLength = (Math.PI / 2) * r;
    game.playModeSweepHandoffT = Math.min(1, game.playModeSweepHandoffT + (allyHorse.speed * dt) / arcLength);
    // Quarter circle from PI (left) to PI/2 (down) — flipped so RB sweeps down instead of up
    const angle = Math.PI - game.playModeSweepHandoffT * (Math.PI / 2);
    allyHorse.x = cx + r * Math.cos(angle);
    allyHorse.y = cy + r * Math.sin(angle);
    // QB rolls out — backward away from LOS and toward the sweep side
    player1.x -= player1.speed * 0.6 * dt;
    player1.y += player1.speed * 0.7 * dt;
    clampPlayerToField(player1);
    updateBallPosition();
    // QB still has the ball — if a defender reaches him before the toss, it's a sack
    if (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris)) {
      setPlayDowned(player1.x, { tackle: true, sack: true });
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
      let leadX = allyHorse.speed * timeOfFlight;
      const leadDist = Math.hypot((allyHorse.x + leadX) - ball.x, tossToY - ball.y);
      timeOfFlight = leadDist / CONFIG.passSpeed;
      leadX = allyHorse.speed * timeOfFlight;
      ball.targetX = allyHorse.x + leadX;
      ball.targetY = tossToY;
    }
    moveSweepDefenders(dt);
    return;
  }
  if (game.playModePhase === "toss") {
    // RB runs toward the lead point so he meets the ball
    allyHorse.x += allyHorse.speed * dt;
    clampPlayerToField(allyHorse);
    // QB continues rolling out — backward and toward the sweep side
    player1.x -= player1.speed * 0.6 * dt;
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
    moveSweepDefenders(dt);
    updateBallPosition();
    const carrier = ball.carrier;
    const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;
    if (carrier === allyHorse && allyHorse.x >= rightEndZoneLeft) {
      player1.score += 1;
      game.state = "touchdownPopup";
      game.touchdownPopupTimer = 4000;
      game.afterTouchdownAction = "startPlayModeDrive";
      playTouchdownAudio(allyHorse);
      return;
    }
    if (carrier && (circleTackle(carrier, player2) || circleTackle(carrier, allyDonkey) || circleTackle(carrier, cluckNorris))) {
      setPlayDowned(carrier.x, { tackle: true });
      return;
    }
    return;
  }
}

function updatePlayModeSweepLeft(dt) {
  if (game.playModePhase === "handoff") {
    const r = 10 * YARDS_TO_PIXELS;
    // Arc center is pinned to initial LOS so it stays stable as QB rolls out
    const cx = game.playModeLineX - r;
    const cy = game.playModeSweepArcCY;
    const arcLength = (Math.PI / 2) * r;
    game.playModeSweepHandoffT = Math.min(1, game.playModeSweepHandoffT + (allyHorse.speed * dt) / arcLength);
    const angle = Math.PI + game.playModeSweepHandoffT * (Math.PI / 2);
    allyHorse.x = cx + r * Math.cos(angle);
    allyHorse.y = cy + r * Math.sin(angle);
    // QB rolls out — backward away from LOS and toward the sweep side
    player1.x -= player1.speed * 0.6 * dt;
    player1.y -= player1.speed * 0.7 * dt;
    clampPlayerToField(player1);
    updateBallPosition();
    // QB still has the ball — if a defender reaches him before the toss, it's a sack
    if (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris)) {
      setPlayDowned(player1.x, { tackle: true, sack: true });
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
    player1.x -= player1.speed * 0.6 * dt;
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
    moveSweepDefenders(dt);
    updateBallPosition();
    const carrier = ball.carrier;
    const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;
    if (carrier === allyHorse && allyHorse.x >= rightEndZoneLeft) {
      player1.score += 1;
      game.state = "touchdownPopup";
      game.touchdownPopupTimer = 4000;
      game.afterTouchdownAction = "startPlayModeDrive";
      playTouchdownAudio(allyHorse);
      return;
    }
    if (carrier && (circleTackle(carrier, player2) || circleTackle(carrier, allyDonkey) || circleTackle(carrier, cluckNorris))) {
      setPlayDowned(carrier.x, { tackle: true });
      return;
    }
    return;
  }
}

function movePassDefenders(dt, ballRef) {
  const { covering, rushing } = getPassDefenders();

  // Target the carrier's center when there is one; otherwise track ball in flight
  const tx = ballRef.carrier ? ballRef.carrier.x : ballRef.x;
  const ty = ballRef.carrier ? ballRef.carrier.y : ballRef.y;

  // QB has scrambled past the line — all defenders converge on the ball carrier
  if (!game.passPlayCanThrow) {
    moveToward(covering,    tx, ty, covering.speed,    dt);
    moveToward(rushing,     tx, ty, rushing.speed,     dt);
    moveToward(cluckNorris, tx, ty, cluckNorris.speed, dt);
    clampPlayerToField(covering);
    clampPlayerToField(rushing);
    clampPlayerToField(cluckNorris);
    if (game.playModeCurrentPlay !== "barnPlay" && game.playModeCurrentPlay !== "scrambledEggs") {
      lilTunnelPete.x += lilTunnelPete.speed * dt;
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
      moveToward(cluckNorris, deepTarget.x, deepTarget.y, cluckNorris.speed, dt);
      clampPlayerToField(cluckNorris);
    }

    // Upfront covering defender tracks the shallow receiver
    moveToward(covering, shallowTarget.x, shallowTarget.y, covering.speed, dt);
    clampPlayerToField(covering);

    // Upfront rusher charges the QB after reaction delay
    if (game.rushReactionTimer > 0) {
      game.rushReactionTimer -= dt * 1000;
    } else {
      moveToward(rushing, tx, ty, rushing.speed, dt);
      clampPlayerToField(rushing);
    }
  } else {
    // Defense A: Hee Haw covers the horse (WR), Pig rushes QB
    if (game.defenseReactionTimer > 0) {
      game.defenseReactionTimer -= dt * 1000;
      moveToward(covering, allyHorse.x, allyHorse.y, covering.speed * 0.15, dt);
    } else {
      moveToward(covering, allyHorse.x, allyHorse.y, covering.speed, dt);
    }
    clampPlayerToField(covering);

    if (game.rushReactionTimer > 0) {
      game.rushReactionTimer -= dt * 1000;
    } else {
      moveToward(rushing, tx, ty, rushing.speed, dt);
    }
    clampPlayerToField(rushing);

    // Cluck Norris charges in late as a third rusher
    if (game.cluckNorrisTimer > 0) {
      game.cluckNorrisTimer -= dt * 1000;
    } else {
      moveToward(cluckNorris, tx, ty, cluckNorris.speed, dt);
      clampPlayerToField(cluckNorris);
    }
  }

  // Pete runs his flat route only while QB still has the ball;
  // when the ball is in flight the caller moves him toward the target instead
  if (!ballRef.inFlight && game.playModeCurrentPlay !== "barnPlay" && game.playModeCurrentPlay !== "scrambledEggs") {
    lilTunnelPete.x += lilTunnelPete.speed * dt;
    clampPlayerToField(lilTunnelPete);
  }
}

function moveBarnPlayReceivers(dt, adjustTarget = null) {
  const horseStemX = Math.min(game.playModeLineX + 22 * YARDS_TO_PIXELS, FIELD.x + FIELD.width - FIELD.endZoneWidth - 30);
  const peteStemX = Math.min(game.playModeLineX + 12 * YARDS_TO_PIXELS, FIELD.x + FIELD.width - FIELD.endZoneWidth - 50);
  const horseTargetX = Math.min(game.playModeLineX + 38 * YARDS_TO_PIXELS, FIELD.x + FIELD.width - FIELD.endZoneWidth - 10);
  const peteTargetX = peteStemX;
  const horseTargetY = FIELD.y + FIELD.height * 0.42;
  const peteTargetY = FIELD.y + FIELD.height * 0.28;

  if (adjustTarget === "horse") {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
  } else if (allyHorse.x < horseStemX) {
    moveToward(allyHorse, horseStemX, allyHorse.y, allyHorse.speed, dt);
  } else {
    moveToward(allyHorse, horseTargetX, horseTargetY, allyHorse.speed, dt);
  }

  if (adjustTarget === "pete") {
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  } else if (lilTunnelPete.x < peteStemX) {
    moveToward(lilTunnelPete, peteStemX, lilTunnelPete.y, lilTunnelPete.speed, dt);
  } else {
    moveToward(lilTunnelPete, peteTargetX, peteTargetY, lilTunnelPete.speed, dt);
  }

  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
}

function moveScrambledEggsReceivers(dt, adjustTarget = null) {
  const zStemX = Math.min(game.playModeLineX + 35 * YARDS_TO_PIXELS, FIELD.x + FIELD.width - FIELD.endZoneWidth - 22);
  const zTargetX = Math.min(game.playModeLineX + 47 * YARDS_TO_PIXELS, FIELD.x + FIELD.width - FIELD.endZoneWidth - 8);
  const zTargetY = FIELD.y + FIELD.height - 34;
  const xStemX = Math.min(game.playModeLineX + 27 * YARDS_TO_PIXELS, FIELD.x + FIELD.width - FIELD.endZoneWidth - 42);
  const xTargetX = Math.max(game.playModeLineX + 25 * YARDS_TO_PIXELS, FIELD.x + FIELD.endZoneWidth + 24);

  if (adjustTarget === "horse") {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
  } else if (allyHorse.x < xStemX) {
    moveToward(allyHorse, xStemX, allyHorse.y, allyHorse.speed, dt);
  } else {
    moveToward(allyHorse, xTargetX, allyHorse.y, allyHorse.speed, dt);
  }

  if (adjustTarget === "pete") {
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  } else if (lilTunnelPete.x < zStemX) {
    moveToward(lilTunnelPete, zStemX, lilTunnelPete.y, lilTunnelPete.speed, dt);
  } else {
    moveToward(lilTunnelPete, zTargetX, zTargetY, lilTunnelPete.speed, dt);
  }

  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
}

function startPlayModePassThrow(tx, ty) {
  ball.targetX = tx;
  ball.targetY = ty;
  ball.inFlight = true;
  ball.carrier = null;
  game.reacquireCooldownP1 = CONFIG.reacquireCooldownMs;

  const horseDist = distance(tx, ty, allyHorse.x, allyHorse.y);
  const peteDist = distance(tx, ty, lilTunnelPete.x, lilTunnelPete.y);
  game.passPlayTargetReceiver = horseDist <= peteDist ? "horse" : "pete";
}

function moveStandardPassReceiversInFlight(dt) {
  const target = game.passPlayTargetReceiver;

  if (target === "horse") {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
    lilTunnelPete.x += lilTunnelPete.speed * dt;
  } else if (target === "pete") {
    allyHorse.x += allyHorse.speed * dt;
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  } else {
    moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
    moveToward(lilTunnelPete, ball.targetX, ball.targetY, lilTunnelPete.speed, dt);
  }

  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
}

function updatePlayModePassRight(dt) {
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;
  const { rushing } = getPassDefenders();

  if (ball.carrier === player1 && !ball.inFlight) {
    // ── Phase 1: CPU drops QB back 10 yards ──
    if (!game.passPlayDropbackDone) {
      if (player1.x > game.passPlayDropbackTarget) {
        player1.x = Math.max(player1.x - player1.speed * dt, game.passPlayDropbackTarget);
      } else {
        game.passPlayDropbackDone = true;
      }
      clampPlayerToField(player1);
    } else {
      // ── Phase 2: Player has full control ──
      updatePlayerInput(dt);
      clampPlayerToField(player1);
      if (player1.x >= game.playModeLineX) {
        game.passPlayCanThrow = false;
      }
    }

    if (game.passPlayCanThrow) {
      // In pocket — only the rushing defender can sack
      if (circleTackle(player1, rushing) || circleTackle(player1, cluckNorris)) {
        setPlayDowned(player1.x, { tackle: true, sack: true });
        updateBallPosition();
        return;
      }
    } else {
      // QB scrambling past line — both defenders can tackle
      if (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris)) {
        setPlayDowned(player1.x, { tackle: true });
        updateBallPosition();
        return;
      }
      if (player1.x >= rightEndZoneLeft) {
        player1.score += 1;
        game.state = "touchdownPopup";
        game.touchdownPopupTimer = 4000;
        game.afterTouchdownAction = "startPlayModeDrive";
        playTouchdownAudio(player1);
        return;
      }
    }

    allyHorse.x += allyHorse.speed * dt;
    clampPlayerToField(allyHorse);
    movePassDefenders(dt, ball);
    updateBallPosition();
    return;
  }

  if (ball.inFlight) {
    moveStandardPassReceiversInFlight(dt);
    const dx = ball.targetX - ball.x;
    const dy = ball.targetY - ball.y;
    const dist = Math.hypot(dx, dy);
    const move = CONFIG.passSpeed * dt;
    if (circleTouch(allyHorse, ball)) {
      ball.inFlight = false;
      ball.carrier = allyHorse;
      updateBallPosition();
    } else if (circleTouch(lilTunnelPete, ball)) {
      ball.inFlight = false;
      ball.carrier = lilTunnelPete;
      updateBallPosition();
    } else if (dist <= move || dist < 8) {
      ball.x = ball.targetX;
      ball.y = ball.targetY;
      ball.inFlight = false;
      ball.carrier = null;
      setPlayDowned(game.playModeLineX, { incomplete: true });
    } else {
      ball.x += (dx / dist) * move;
      ball.y += (dy / dist) * move;
    }
    movePassDefenders(dt, ball);
    return;
  }

  if (ball.carrier === allyHorse) {
    updatePlayerInput(dt);
    moveToward(player2,     allyHorse.x, allyHorse.y, player2.speed,     dt);
    moveToward(allyDonkey,  allyHorse.x, allyHorse.y, allyDonkey.speed,  dt);
    moveToward(cluckNorris, allyHorse.x, allyHorse.y, cluckNorris.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    clampPlayerToField(cluckNorris);
    updateBallPosition();
    if (allyHorse.x >= rightEndZoneLeft) {
      player1.score += 1;
      game.state = "touchdownPopup";
      game.touchdownPopupTimer = 4000;
      game.afterTouchdownAction = "startPlayModeDrive";
      playTouchdownAudio(allyHorse);
      return;
    }
    if (circleTackle(allyHorse, player2) || circleTackle(allyHorse, allyDonkey) || circleTackle(allyHorse, cluckNorris)) {
      setPlayDowned(allyHorse.x, { tackle: true });
      return;
    }
    return;
  }

  if (ball.carrier === lilTunnelPete) {
    updatePlayerInput(dt);
    moveToward(player2,     lilTunnelPete.x, lilTunnelPete.y, player2.speed,     dt);
    moveToward(allyDonkey,  lilTunnelPete.x, lilTunnelPete.y, allyDonkey.speed,  dt);
    moveToward(cluckNorris, lilTunnelPete.x, lilTunnelPete.y, cluckNorris.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    clampPlayerToField(cluckNorris);
    updateBallPosition();
    if (lilTunnelPete.x >= rightEndZoneLeft) {
      player1.score += 1;
      game.state = "touchdownPopup";
      game.touchdownPopupTimer = 4000;
      game.afterTouchdownAction = "startPlayModeDrive";
      playTouchdownAudio(lilTunnelPete);
      return;
    }
    if (circleTackle(lilTunnelPete, player2) || circleTackle(lilTunnelPete, allyDonkey) || circleTackle(lilTunnelPete, cluckNorris)) {
      setPlayDowned(lilTunnelPete.x, { tackle: true });
      return;
    }
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
      if (player1.x > game.passPlayDropbackTarget) {
        player1.x = Math.max(player1.x - player1.speed * dt, game.passPlayDropbackTarget);
      } else {
        game.passPlayDropbackDone = true;
      }
      clampPlayerToField(player1);
    } else {
      // ── Phase 2: Player has full control ──
      updatePlayerInput(dt);
      clampPlayerToField(player1);
      if (player1.x >= game.playModeLineX) {
        game.passPlayCanThrow = false;
      }
    }

    if (game.passPlayCanThrow) {
      // In pocket — only the rushing defender can sack
      if (circleTackle(player1, rushing) || circleTackle(player1, cluckNorris)) {
        setPlayDowned(player1.x, { tackle: true, sack: true });
        updateBallPosition();
        return;
      }
    } else {
      // QB scrambling past line — both defenders can tackle
      if (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris)) {
        setPlayDowned(player1.x, { tackle: true });
        updateBallPosition();
        return;
      }
      if (player1.x >= rightEndZoneLeft) {
        player1.score += 1;
        game.state = "touchdownPopup";
        game.touchdownPopupTimer = 4000;
        game.afterTouchdownAction = "startPlayModeDrive";
        playTouchdownAudio(player1);
        return;
      }
    }

    allyHorse.x += allyHorse.speed * dt;
    clampPlayerToField(allyHorse);
    movePassDefenders(dt, ball);
    updateBallPosition();
    return;
  }

  if (ball.inFlight) {
    moveStandardPassReceiversInFlight(dt);
    const dx = ball.targetX - ball.x;
    const dy = ball.targetY - ball.y;
    const dist = Math.hypot(dx, dy);
    const move = CONFIG.passSpeed * dt;
    if (circleTouch(allyHorse, ball)) {
      ball.inFlight = false;
      ball.carrier = allyHorse;
      updateBallPosition();
    } else if (circleTouch(lilTunnelPete, ball)) {
      ball.inFlight = false;
      ball.carrier = lilTunnelPete;
      updateBallPosition();
    } else if (dist <= move || dist < 8) {
      ball.x = ball.targetX;
      ball.y = ball.targetY;
      ball.inFlight = false;
      ball.carrier = null;
      setPlayDowned(game.playModeLineX, { incomplete: true });
    } else {
      ball.x += (dx / dist) * move;
      ball.y += (dy / dist) * move;
    }
    movePassDefenders(dt, ball);
    return;
  }

  if (ball.carrier === allyHorse) {
    updatePlayerInput(dt);
    moveToward(player2,     allyHorse.x, allyHorse.y, player2.speed,     dt);
    moveToward(allyDonkey,  allyHorse.x, allyHorse.y, allyDonkey.speed,  dt);
    moveToward(cluckNorris, allyHorse.x, allyHorse.y, cluckNorris.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    clampPlayerToField(cluckNorris);
    updateBallPosition();
    if (allyHorse.x >= rightEndZoneLeft) {
      player1.score += 1;
      game.state = "touchdownPopup";
      game.touchdownPopupTimer = 4000;
      game.afterTouchdownAction = "startPlayModeDrive";
      playTouchdownAudio(allyHorse);
      return;
    }
    if (circleTackle(allyHorse, player2) || circleTackle(allyHorse, allyDonkey) || circleTackle(allyHorse, cluckNorris)) {
      setPlayDowned(allyHorse.x, { tackle: true });
      return;
    }
    return;
  }

  if (ball.carrier === lilTunnelPete) {
    updatePlayerInput(dt);
    moveToward(player2,     lilTunnelPete.x, lilTunnelPete.y, player2.speed,     dt);
    moveToward(allyDonkey,  lilTunnelPete.x, lilTunnelPete.y, allyDonkey.speed,  dt);
    moveToward(cluckNorris, lilTunnelPete.x, lilTunnelPete.y, cluckNorris.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    clampPlayerToField(cluckNorris);
    updateBallPosition();
    if (lilTunnelPete.x >= rightEndZoneLeft) {
      player1.score += 1;
      game.state = "touchdownPopup";
      game.touchdownPopupTimer = 4000;
      game.afterTouchdownAction = "startPlayModeDrive";
      playTouchdownAudio(lilTunnelPete);
      return;
    }
    if (circleTackle(lilTunnelPete, player2) || circleTackle(lilTunnelPete, allyDonkey) || circleTackle(lilTunnelPete, cluckNorris)) {
      setPlayDowned(lilTunnelPete.x, { tackle: true });
      return;
    }
    return;
  }

  updateBallPosition();
}

function updatePlayModeBarnPlay(dt) {
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;
  const { rushing } = getPassDefenders();

  if (ball.carrier === player1 && !ball.inFlight) {
    if (!game.passPlayDropbackDone) {
      if (player1.x > game.passPlayDropbackTarget) {
        player1.x = Math.max(player1.x - player1.speed * dt, game.passPlayDropbackTarget);
      } else {
        game.passPlayDropbackDone = true;
      }
      clampPlayerToField(player1);
    } else {
      updatePlayerInput(dt);
      clampPlayerToField(player1);
      if (player1.x >= game.playModeLineX) {
        game.passPlayCanThrow = false;
      }
    }

    if (game.passPlayCanThrow) {
      if (circleTackle(player1, rushing) || circleTackle(player1, cluckNorris)) {
        setPlayDowned(player1.x, { tackle: true, sack: true });
        updateBallPosition();
        return;
      }
    } else {
      if (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris)) {
        setPlayDowned(player1.x, { tackle: true });
        updateBallPosition();
        return;
      }
      if (player1.x >= rightEndZoneLeft) {
        player1.score += 1;
        game.state = "touchdownPopup";
        game.touchdownPopupTimer = 4000;
        game.afterTouchdownAction = "startPlayModeDrive";
        playTouchdownAudio(player1);
        return;
      }
    }

    moveBarnPlayReceivers(dt);
    movePassDefenders(dt, ball);
    updateBallPosition();
    return;
  }

  if (ball.inFlight) {
    moveBarnPlayReceivers(dt, game.passPlayTargetReceiver);
    const dx = ball.targetX - ball.x;
    const dy = ball.targetY - ball.y;
    const dist = Math.hypot(dx, dy);
    const move = CONFIG.passSpeed * dt;
    if (circleTouch(allyHorse, ball)) {
      ball.inFlight = false;
      ball.carrier = allyHorse;
      updateBallPosition();
    } else if (circleTouch(lilTunnelPete, ball)) {
      ball.inFlight = false;
      ball.carrier = lilTunnelPete;
      updateBallPosition();
    } else if (dist <= move || dist < 8) {
      ball.x = ball.targetX;
      ball.y = ball.targetY;
      ball.inFlight = false;
      ball.carrier = null;
      setPlayDowned(game.playModeLineX, { incomplete: true });
    } else {
      ball.x += (dx / dist) * move;
      ball.y += (dy / dist) * move;
    }
    movePassDefenders(dt, ball);
    return;
  }

  if (ball.carrier === allyHorse) {
    updatePlayerInput(dt);
    moveToward(player2, allyHorse.x, allyHorse.y, player2.speed, dt);
    moveToward(allyDonkey, allyHorse.x, allyHorse.y, allyDonkey.speed, dt);
    moveToward(cluckNorris, allyHorse.x, allyHorse.y, cluckNorris.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    clampPlayerToField(cluckNorris);
    updateBallPosition();
    if (allyHorse.x >= rightEndZoneLeft) {
      player1.score += 1;
      game.state = "touchdownPopup";
      game.touchdownPopupTimer = 4000;
      game.afterTouchdownAction = "startPlayModeDrive";
      playTouchdownAudio(allyHorse);
      return;
    }
    if (circleTackle(allyHorse, player2) || circleTackle(allyHorse, allyDonkey) || circleTackle(allyHorse, cluckNorris)) {
      setPlayDowned(allyHorse.x, { tackle: true });
      return;
    }
    return;
  }

  if (ball.carrier === lilTunnelPete) {
    updatePlayerInput(dt);
    moveToward(player2, lilTunnelPete.x, lilTunnelPete.y, player2.speed, dt);
    moveToward(allyDonkey, lilTunnelPete.x, lilTunnelPete.y, allyDonkey.speed, dt);
    moveToward(cluckNorris, lilTunnelPete.x, lilTunnelPete.y, cluckNorris.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    clampPlayerToField(cluckNorris);
    updateBallPosition();
    if (lilTunnelPete.x >= rightEndZoneLeft) {
      player1.score += 1;
      game.state = "touchdownPopup";
      game.touchdownPopupTimer = 4000;
      game.afterTouchdownAction = "startPlayModeDrive";
      playTouchdownAudio(lilTunnelPete);
      return;
    }
    if (circleTackle(lilTunnelPete, player2) || circleTackle(lilTunnelPete, allyDonkey) || circleTackle(lilTunnelPete, cluckNorris)) {
      setPlayDowned(lilTunnelPete.x, { tackle: true });
      return;
    }
    return;
  }

  updateBallPosition();
}

function updatePlayModeScrambledEggs(dt) {
  const rightEndZoneLeft = FIELD.x + FIELD.width - FIELD.endZoneWidth;
  const { rushing } = getPassDefenders();

  if (ball.carrier === player1 && !ball.inFlight) {
    if (!game.passPlayDropbackDone) {
      if (player1.x > game.passPlayDropbackTarget) {
        player1.x = Math.max(player1.x - player1.speed * dt, game.passPlayDropbackTarget);
      } else {
        game.passPlayDropbackDone = true;
      }
      clampPlayerToField(player1);
    } else {
      updatePlayerInput(dt);
      clampPlayerToField(player1);
      if (player1.x >= game.playModeLineX) {
        game.passPlayCanThrow = false;
      }
    }

    if (game.passPlayCanThrow) {
      if (circleTackle(player1, rushing) || circleTackle(player1, cluckNorris)) {
        setPlayDowned(player1.x, { tackle: true, sack: true });
        updateBallPosition();
        return;
      }
    } else {
      if (circleTackle(player1, player2) || circleTackle(player1, allyDonkey) || circleTackle(player1, cluckNorris)) {
        setPlayDowned(player1.x, { tackle: true });
        updateBallPosition();
        return;
      }
      if (player1.x >= rightEndZoneLeft) {
        player1.score += 1;
        game.state = "touchdownPopup";
        game.touchdownPopupTimer = 4000;
        game.afterTouchdownAction = "startPlayModeDrive";
        playTouchdownAudio(player1);
        return;
      }
    }

    moveScrambledEggsReceivers(dt);
    movePassDefenders(dt, ball);
    updateBallPosition();
    return;
  }

  if (ball.inFlight) {
    moveScrambledEggsReceivers(dt, game.passPlayTargetReceiver);
    const dx = ball.targetX - ball.x;
    const dy = ball.targetY - ball.y;
    const dist = Math.hypot(dx, dy);
    const move = CONFIG.passSpeed * dt;
    if (circleTouch(allyHorse, ball)) {
      ball.inFlight = false;
      ball.carrier = allyHorse;
      updateBallPosition();
    } else if (circleTouch(lilTunnelPete, ball)) {
      ball.inFlight = false;
      ball.carrier = lilTunnelPete;
      updateBallPosition();
    } else if (dist <= move || dist < 8) {
      ball.x = ball.targetX;
      ball.y = ball.targetY;
      ball.inFlight = false;
      ball.carrier = null;
      setPlayDowned(game.playModeLineX, { incomplete: true });
    } else {
      ball.x += (dx / dist) * move;
      ball.y += (dy / dist) * move;
    }
    movePassDefenders(dt, ball);
    return;
  }

  if (ball.carrier === allyHorse) {
    updatePlayerInput(dt);
    moveToward(player2, allyHorse.x, allyHorse.y, player2.speed, dt);
    moveToward(allyDonkey, allyHorse.x, allyHorse.y, allyDonkey.speed, dt);
    moveToward(cluckNorris, allyHorse.x, allyHorse.y, cluckNorris.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    clampPlayerToField(cluckNorris);
    updateBallPosition();
    if (allyHorse.x >= rightEndZoneLeft) {
      player1.score += 1;
      game.state = "touchdownPopup";
      game.touchdownPopupTimer = 4000;
      game.afterTouchdownAction = "startPlayModeDrive";
      playTouchdownAudio(allyHorse);
      return;
    }
    if (circleTackle(allyHorse, player2) || circleTackle(allyHorse, allyDonkey) || circleTackle(allyHorse, cluckNorris)) {
      setPlayDowned(allyHorse.x, { tackle: true });
      return;
    }
    return;
  }

  if (ball.carrier === lilTunnelPete) {
    updatePlayerInput(dt);
    moveToward(player2, lilTunnelPete.x, lilTunnelPete.y, player2.speed, dt);
    moveToward(allyDonkey, lilTunnelPete.x, lilTunnelPete.y, allyDonkey.speed, dt);
    moveToward(cluckNorris, lilTunnelPete.x, lilTunnelPete.y, cluckNorris.speed, dt);
    clampPlayerToField(player2);
    clampPlayerToField(allyDonkey);
    clampPlayerToField(cluckNorris);
    updateBallPosition();
    if (lilTunnelPete.x >= rightEndZoneLeft) {
      player1.score += 1;
      game.state = "touchdownPopup";
      game.touchdownPopupTimer = 4000;
      game.afterTouchdownAction = "startPlayModeDrive";
      playTouchdownAudio(lilTunnelPete);
      return;
    }
    if (circleTackle(lilTunnelPete, player2) || circleTackle(lilTunnelPete, allyDonkey) || circleTackle(lilTunnelPete, cluckNorris)) {
      setPlayDowned(lilTunnelPete.x, { tackle: true });
      return;
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

function updateSafetyPopup(dt) {
  game.safetyPopupTimer -= dt * 1000;
  if (game.safetyPopupTimer <= 0) {
    game.safetyPopupTimer = 0;
    game.state = "gameOver";
    game.winner = null;
  }
}

function update(dt) {
  if (game.state === "menu" || game.state === "pauseMenu" || game.state === "playModeDowned" || game.state === "playModePlaySelect") {
    return;
  }
  if (game.state === "safetyPopup") {
    updateSafetyPopup(dt);
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

