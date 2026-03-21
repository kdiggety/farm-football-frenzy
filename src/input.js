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
    const pl = MENU_BUTTONS.playMode;
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
    if (p.x >= pl.x && p.x <= pl.x + pl.w && p.y >= pl.y && p.y <= pl.y + pl.h) {
      startPlayMode();
      return;
    }
    return;
  }
  if (game.state === "pauseMenu") {
    const res = PAUSE_MENU_BUTTONS.resume;
    const playBtn = PAUSE_MENU_BUTTONS.playMode;
    const home = PAUSE_MENU_BUTTONS.home;
    if (p.x >= res.x && p.x <= res.x + res.w && p.y >= res.y && p.y <= res.y + res.h) {
      game.state = game.stateBeforePauseMenu;
      game.stateBeforePauseMenu = null;
      return;
    }
    if (p.x >= playBtn.x && p.x <= playBtn.x + playBtn.w && p.y >= playBtn.y && p.y <= playBtn.y + playBtn.h) {
      startPlayMode();
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
  if (game.state === "playModeDowned") {
    if (game.playModeDown >= game.playModeMaxDowns) {
      game.state = "gameOver";
      game.winner = null;
    } else {
      advancePlayModeDown(game.playModeDownedSpot);
    }
    return;
  }
  if (game.state === "touchdownPopup" || game.state === "safetyPopup") {
    return;
  }
  if (game.state === "playModePlaySelect") {
    const sr = PLAY_SELECT_BUTTONS.sweepRight;
    const sl = PLAY_SELECT_BUTTONS.sweepLeft;
    const pr = PLAY_SELECT_BUTTONS.passRight;
    const pl = PLAY_SELECT_BUTTONS.passLeft;
    const dt = DEFENSE_TOGGLE_BUTTON;
    if (p.x >= dt.x && p.x <= dt.x + dt.w && p.y >= dt.y && p.y <= dt.y + dt.h) {
      game.selectedDefense = game.selectedDefense === "random" ? "A"
        : game.selectedDefense === "A" ? "B"
        : "random";
      previewDefensePositions();
    } else if (p.x >= sr.x && p.x <= sr.x + sr.w && p.y >= sr.y && p.y <= sr.y + sr.h) {
      startSweepRightPlay();
    } else if (p.x >= sl.x && p.x <= sl.x + sl.w && p.y >= sl.y && p.y <= sl.y + sl.h) {
      startSweepLeftPlay();
    } else if (p.x >= pr.x && p.x <= pr.x + pr.w && p.y >= pr.y && p.y <= pr.y + pr.h) {
      startPassRightPlay();
    } else if (p.x >= pl.x && p.x <= pl.x + pl.w && p.y >= pl.y && p.y <= pl.y + pl.h) {
      startPassLeftPlay();
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
  if (game.state === "playing" && game.mode === "play"
      && (game.playModeCurrentPlay === "passRight" || game.playModeCurrentPlay === "passLeft")
      && ball.carrier === player1 && !ball.inFlight
      && game.passPlayDropbackDone && game.passPlayCanThrow) {
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
    if (game.mode === "play") {
      startPlayModeDrive();
    } else {
      restartGame();
    }
  } else if ((key === "enter" || key === " ") && game.state === "playModeDowned") {
    if (game.playModeDown >= game.playModeMaxDowns) {
      game.state = "gameOver";
      game.winner = null;
    } else {
      advancePlayModeDown(game.playModeDownedSpot);
    }
  } else if ((key === "enter" || key === "1") && game.state === "playModePlaySelect") {
    startSweepRightPlay();
  } else if (key === "2" && game.state === "playModePlaySelect") {
    startSweepLeftPlay();
  } else if (key === "3" && game.state === "playModePlaySelect") {
    startPassRightPlay();
  } else if (key === "4" && game.state === "playModePlaySelect") {
    startPassLeftPlay();
  }
  if ((key === "1" || key === "2" || key === "3" || key === "4") && game.state === "playModePlaySelect") {
    e.preventDefault();
  }
  if (key === "escape") {
    if (game.state === "pauseMenu") {
      game.state = game.stateBeforePauseMenu;
      game.stateBeforePauseMenu = null;
    } else if (["playing", "paused", "gameOver", "scorePause", "playModeDowned", "playModePlaySelect"].includes(game.state)) {
      game.stateBeforePauseMenu = game.state;
      game.state = "pauseMenu";
    }
  }

  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " ", "escape", "enter"].includes(key)) {
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

  if (dx === 0 && dy === 0) return;

  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;

  const isPlayMode = game.mode === "play" && (game.playModePhase === "sweep" || game.playModeCurrentPlay === "passRight" || game.playModeCurrentPlay === "passLeft");
  if (isPlayMode && ball.carrier === allyHorse) {
    allyHorse.x += dx * allyHorse.speed * dt;
    allyHorse.y += dy * allyHorse.speed * dt;
    clampPlayerToField(allyHorse);
  } else if (isPlayMode && ball.carrier === lilTunnelPete) {
    lilTunnelPete.x += dx * lilTunnelPete.speed * dt;
    lilTunnelPete.y += dy * lilTunnelPete.speed * dt;
    clampPlayerToField(lilTunnelPete);
  } else {
    player1.x += dx * player1.speed * dt;
    player1.y += dy * player1.speed * dt;
    clampPlayerToField(player1);
  }
}

