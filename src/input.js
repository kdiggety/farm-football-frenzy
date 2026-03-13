// =========================================================
// Input Handling
// =========================================================
function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

window.addEventListener("mousemove", (e) => {
  const p = getCanvasCoords(e);
  game.mouseX = p.x;
  game.mouseY = p.y;
});

window.addEventListener("click", (e) => {
  const p = getCanvasCoords(e);
  if (game.state === "menu") {
    const g = MENU_BUTTONS.gameMode;
    const pm = MENU_BUTTONS.passingMode;
    if (p.x >= g.x && p.x <= g.x + g.w && p.y >= g.y && p.y <= g.y + g.h) {
      game.mode = "game";
      game.state = "playing";
      resetPositions();
      return;
    }
    if (p.x >= pm.x && p.x <= pm.x + pm.w && p.y >= pm.y && p.y <= pm.y + pm.h) {
      game.mode = "passing";
      game.state = "playing";
      resetPositions();
      return;
    }
    return;
  }
  if (game.state === "pauseMenu") {
    const res = PAUSE_MENU_BUTTONS.resume;
    const home = PAUSE_MENU_BUTTONS.home;
    if (p.x >= res.x && p.x <= res.x + res.w && p.y >= res.y && p.y <= res.y + res.h) {
      game.state = game.stateBeforePauseMenu;
      game.stateBeforePauseMenu = null;
      return;
    }
    if (p.x >= home.x && p.x <= home.x + home.w && p.y >= home.y && p.y <= home.y + home.h) {
      game.state = "menu";
      game.stateBeforePauseMenu = null;
      player1.score = 0;
      player2.score = 0;
      game.winner = null;
      game.scorePauseTimer = 0;
      game.scoredBy = null;
      return;
    }
    return;
  }
  if (game.state === "playing" && game.mode === "passing" && ball.carrier === player1 && !ball.inFlight) {
    const tx = clamp(p.x, FIELD.x + ball.radius, FIELD.x + FIELD.width - ball.radius);
    const ty = clamp(p.y, FIELD.y + ball.radius, FIELD.y + FIELD.height - ball.radius);
    ball.targetX = tx;
    ball.targetY = ty;
    ball.inFlight = true;
    ball.carrier = null;
    game.reacquireCooldownP1 = CONFIG.reacquireCooldownMs;
  }
});

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  if (key === "r" && game.state === "gameOver") {
    restartGame();
  } else if (key === "escape") {
    if (game.state === "pauseMenu") {
      game.state = game.stateBeforePauseMenu;
      game.stateBeforePauseMenu = null;
    } else if (["playing", "paused", "gameOver", "scorePause"].includes(game.state)) {
      game.stateBeforePauseMenu = game.state;
      game.state = "pauseMenu";
    }
  }

  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " ", "escape"].includes(key)) {
    e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

function updatePlayerInput(dt) {
  let dx = 0;
  let dy = 0;

  if (keys["w"]) dy -= 1;
  if (keys["s"]) dy += 1;
  if (keys["a"]) dx -= 1;
  if (keys["d"]) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;

    player1.x += dx * player1.speed * dt;
    player1.y += dy * player1.speed * dt;
  }

  clampPlayerToField(player1);
}

