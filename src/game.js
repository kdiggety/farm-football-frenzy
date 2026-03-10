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

  setBallFreeAtMidfield();
  game.possessionLockTimer = 0;
}

function restartGame() {
  player1.score = 0;
  player2.score = 0;
  game.state = "playing";
  game.winner = null;
  game.scorePauseTimer = 0;
  game.scoredBy = null;
  game.possessionLockTimer = 0;
  resetPositions();
}

// =========================================================
// CPU Logic
// =========================================================
function updateCPU(dt) {
  let targetX = player2.x;
  let targetY = player2.y;

  if (ball.carrier === null) {
    // Move toward the loose ball
    targetX = ball.x;
    targetY = ball.y;
  } else if (ball.carrier === player1) {
    // Move toward the human player
    targetX = player1.x;
    targetY = player1.y;
  } else if (ball.carrier === player2) {
    // Run toward the player's end zone (left side)
    targetX = FIELD.x + 20;
    targetY = FIELD.y + FIELD.height / 2;
  }

  moveToward(player2, targetX, targetY, player2.speed, dt);
  clampPlayerToField(player2);
}

// =========================================================
// Game Logic
// =========================================================
function tryPickupBall() {
  if (game.possessionLockTimer > 0 || ball.carrier !== null) {
    return;
  }

  if (circleTouch(player1, ball)) {
    ball.carrier = player1;
    game.possessionLockTimer = CONFIG.possessionPickupLockMs;
    updateBallPosition();
    return;
  }

  if (circleTouch(player2, ball)) {
    ball.carrier = player2;
    game.possessionLockTimer = CONFIG.possessionPickupLockMs;
    updateBallPosition();
  }
}

function handleCarrierCollisionSteal() {
  if (game.possessionLockTimer > 0) {
    return;
  }

  if (ball.carrier === player1 && circleTouch(player1, player2)) {
    ball.carrier = player2;
    game.possessionLockTimer = CONFIG.possessionPickupLockMs;
    updateBallPosition();
  } else if (ball.carrier === player2 && circleTouch(player1, player2)) {
    ball.carrier = player1;
    game.possessionLockTimer = CONFIG.possessionPickupLockMs;
    updateBallPosition();
  }
}

function checkTouchdown() {
  if (game.state !== "playing" || !ball.carrier) return;

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

  scorer.score += 1;
  game.scoredBy = scorer;
  game.state = "scorePause";
  game.scorePauseTimer = CONFIG.scorePauseMs;
  ball.carrier = null;

  if (scorer.score >= CONFIG.winScore) {
    game.state = "gameOver";
    game.winner = scorer;
  }
}

function updatePlaying(dt) {
  updatePlayerInput(dt);
  updateCPU(dt);

  if (game.possessionLockTimer > 0) {
    game.possessionLockTimer -= dt * 1000;
    if (game.possessionLockTimer < 0) {
      game.possessionLockTimer = 0;
    }
  }

  tryPickupBall();
  handleCarrierCollisionSteal();
  updateBallPosition();
  checkTouchdown();
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

function update(dt) {
  if (game.state === "playing") {
    updatePlaying(dt);
  } else if (game.state === "scorePause") {
    updateScorePause(dt);
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
// Start Game
// =========================================================
restartGame();
requestAnimationFrame(gameLoop);

