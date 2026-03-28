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
      startGameMusic();
      game.mode = "game";
      game.state = "playing";
      resetPositions();
      return;
    }
    if (p.x >= pm.x && p.x <= pm.x + pm.w && p.y >= pm.y && p.y <= pm.y + pm.h) {
      startGameMusic();
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
      startMenuMusic();
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
    const filt = getPlaySelectFilterBarRects();
    if (p.x >= filt.all.x && p.x <= filt.all.x + filt.all.w && p.y >= filt.all.y && p.y <= filt.all.y + filt.all.h) {
      setPlayModePlayFilter(null);
      return;
    }
    if (p.x >= filt.run.x && p.x <= filt.run.x + filt.run.w && p.y >= filt.run.y && p.y <= filt.run.y + filt.run.h) {
      setPlayModePlayFilter("run");
      return;
    }
    if (p.x >= filt.pass.x && p.x <= filt.pass.x + filt.pass.w && p.y >= filt.pass.y && p.y <= filt.pass.y + filt.pass.h) {
      setPlayModePlayFilter("pass");
      return;
    }
    const nav = getPlaySelectPageNavRects();
    if (nav) {
      if (p.x >= nav.prev.x && p.x <= nav.prev.x + nav.prev.w && p.y >= nav.prev.y && p.y <= nav.prev.y + nav.prev.h) {
        game.playModePlaySelectPage = Math.max(0, game.playModePlaySelectPage - 1);
        return;
      }
      if (p.x >= nav.next.x && p.x <= nav.next.x + nav.next.w && p.y >= nav.next.y && p.y <= nav.next.y + nav.next.h) {
        const maxP = getPlaySelectPageCount() - 1;
        game.playModePlaySelectPage = Math.min(maxP, game.playModePlaySelectPage + 1);
        return;
      }
    }
    const dt = getPlaySelectDefenseToggleRect();
    if (p.x >= dt.x && p.x <= dt.x + dt.w && p.y >= dt.y && p.y <= dt.y + dt.h) {
      game.selectedDefense = game.selectedDefense === "random" ? "A"
        : game.selectedDefense === "A" ? "B"
        : "random";
      previewDefensePositions();
      return;
    }
    const slots = getPlaySelectSlots(game.playModePlaySelectPage);
    for (const s of slots) {
      if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) {
        startPlayFromSelect(s.key);
        return;
      }
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
      && (game.playModeCurrentPlay === "passRight" || game.playModeCurrentPlay === "passLeft" || game.playModeCurrentPlay === "barnPlay" || game.playModeCurrentPlay === "scrambledEggs")
      && ball.carrier === player1 && !ball.inFlight
      && game.passPlayDropbackDone && game.passPlayCanThrow) {
    const tx = clamp(p.x, FIELD.x + ball.radius, FIELD.x + FIELD.width - ball.radius);
    const ty = clamp(p.y, FIELD.y + ball.radius, FIELD.y + FIELD.height - ball.radius);
    startPlayModePassThrow(tx, ty);
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
  } else if (key === "a" && game.state === "playModePlaySelect") {
    setPlayModePlayFilter(null);
  } else if (key === "r" && game.state === "playModePlaySelect") {
    setPlayModePlayFilter("run");
  } else if (key === "p" && game.state === "playModePlaySelect") {
    setPlayModePlayFilter("pass");
  } else if (key === "enter" && game.state === "playModePlaySelect") {
    const slots = getPlaySelectSlots(game.playModePlaySelectPage);
    if (slots[0]) startPlayFromSelect(slots[0].key);
  } else if (["1", "2", "3", "4"].includes(key) && game.state === "playModePlaySelect") {
    const slots = getPlaySelectSlots(game.playModePlaySelectPage);
    const idx = parseInt(key, 10) - 1;
    if (slots[idx]) startPlayFromSelect(slots[idx].key);
  } else if ((key === "arrowleft" || key === "arrowright") && game.state === "playModePlaySelect") {
    const pages = getPlaySelectPageCount();
    if (pages > 1) {
      if (key === "arrowleft") {
        game.playModePlaySelectPage = Math.max(0, game.playModePlaySelectPage - 1);
      } else {
        game.playModePlaySelectPage = Math.min(pages - 1, game.playModePlaySelectPage + 1);
      }
      e.preventDefault();
    }
  }
  if (["1", "2", "3", "4"].includes(key) && game.state === "playModePlaySelect") {
    e.preventDefault();
  }
  if ((key === "a" || key === "r" || key === "p") && game.state === "playModePlaySelect") {
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

  const isPlayMode = game.mode === "play" && (
    game.playModePhase === "sweep" ||
    game.playModeCurrentPlay === "passRight" ||
    game.playModeCurrentPlay === "passLeft" ||
    game.playModeCurrentPlay === "scrambledEggs" ||
    game.playModeCurrentPlay === "barnPlay" ||
    (game.playModeCurrentPlay === "diveRight" && game.playModePhase === "run") ||
    (game.playModeCurrentPlay === "diveLeft"  && game.playModePhase === "run")
  );
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

