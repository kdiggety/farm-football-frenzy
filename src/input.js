// =========================================================
// Input Handling
// =========================================================
game.touchControlsEnabled = ("ontouchstart" in window) || window.matchMedia("(pointer: coarse)").matches;

let joystickTouchId = null;
let suppressClickUntil = 0;

function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function isPauseableState(state) {
  return ["playing", "paused", "scorePause", "playModeDowned", "playModePlaySelect", "defenseModeSelect", "prePlayCadence", "interceptionPopup"].includes(state);
}

function togglePauseMenu() {
  if (game.state === "pauseMenu") {
    game.state = game.stateBeforePauseMenu;
    game.stateBeforePauseMenu = null;
  } else if (isPauseableState(game.state)) {
    game.stateBeforePauseMenu = game.state;
    game.state = "pauseMenu";
  }
}

function resetTouchStick() {
  const stick = getMobileJoystickRect();
  game.touchMoveX = 0;
  game.touchMoveY = 0;
  game.touchStickActive = false;
  game.touchStickKnobX = stick.cx;
  game.touchStickKnobY = stick.cy;
}

function updateTouchStickFromPoint(p) {
  const stick = getMobileJoystickRect();
  const dx = p.x - stick.cx;
  const dy = p.y - stick.cy;
  const len = Math.hypot(dx, dy);
  const max = stick.outerR;
  const scale = len > max ? max / len : 1;
  const knobX = stick.cx + dx * scale;
  const knobY = stick.cy + dy * scale;
  game.touchStickActive = true;
  game.touchStickKnobX = knobX;
  game.touchStickKnobY = knobY;
  game.touchMoveX = (knobX - stick.cx) / max;
  game.touchMoveY = (knobY - stick.cy) / max;
}

function isThrowReady() {
  return game.state === "playing" && (
    (game.mode === "passing" && ball.carrier === player1 && !ball.inFlight) ||
    (game.mode === "play"
      && (game.playModeCurrentPlay === "passRight" || game.playModeCurrentPlay === "passLeft" || game.playModeCurrentPlay === "barnPlay" || game.playModeCurrentPlay === "scrambledEggs")
      && ball.carrier === player1 && !ball.inFlight
      && game.passPlayDropbackDone && game.passPlayCanThrow)
  );
}

function shouldStartTouchStick(p) {
  if (!game.touchControlsEnabled || game.state !== "playing") return false;
  const stick = getMobileJoystickRect();
  const inStickZone = Math.hypot(p.x - stick.cx, p.y - stick.cy) <= stick.hitR;
  const inLeftLowerHalf = p.x <= canvas.width * 0.45 && p.y >= canvas.height * 0.45;
  if (!isThrowReady()) return inStickZone || inLeftLowerHalf;
  return inStickZone || (inLeftLowerHalf && p.x < canvas.width * 0.5);
}

function handleCanvasTap(p) {
  game.mouseX = p.x;
  game.mouseY = p.y;

  if (game.interceptionPopupTimer > 0) return;

  if (game.state === "playCoinToss") {
    const L = getCoinTossLayout();
    const hit = (r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    if (hit(L.back)) {
      backFromCoinTossToOpponentReveal();
      return;
    }
    if (game.coinTossPhase === "pickCall") {
      if (hit(L.heads)) beginCoinTossFlip("heads");
      else if (hit(L.tails)) beginCoinTossFlip("tails");
      return;
    }
    if (game.coinTossPhase === "result" && hit(L.resultContinue)) {
      continueFromCoinTossResult();
      return;
    }
    if (game.coinTossPhase === "userChooseSide") {
      if (hit(L.offense)) startPlayFromUserCoinChoice("offense");
      else if (hit(L.defense)) startPlayFromUserCoinChoice("defense");
      return;
    }
    if (game.coinTossPhase === "cpuChose" && hit(L.cpuContinue)) {
      startPlayAfterCpuCoinChoice();
      return;
    }
    return;
  }

  if (game.state === "playOpponentReveal") {
    const L = getOpponentRevealLayout();
    const hit = (r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    if (hit(L.back)) {
      returnToHomeMenu();
      return;
    }
    if (hit(L.changeTeam)) {
      backFromOpponentRevealToTeamSelect();
      return;
    }
    if (hit(L.play)) {
      startPlayAfterOpponentReveal();
      return;
    }
    return;
  }

  if (game.state === "playTeamSelect") {
    const L = getTeamSelectLayout();
    const hit = (r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    if (hit(L.back)) {
      returnToHomeMenu();
      return;
    }
    for (const id of PLAY_TEAM_IDS) {
      if (hit(L[id])) {
        game.teamSelectUser = id;
        return;
      }
    }
    if (hit(L.start)) {
      advanceToOpponentReveal();
      return;
    }
    return;
  }

  // Pause hot-corner must run AFTER play/defense select handling would — otherwise taps on the
  // right side of the play-select panel overlap the pause rect and never reach play buttons.
  if (
    game.touchControlsEnabled &&
    game.state !== "pauseMenu" &&
    isPauseableState(game.state) &&
    game.state !== "playModePlaySelect" &&
    game.state !== "defenseModeSelect" &&
    game.state !== "playOpponentReveal" &&
    game.state !== "playCoinToss"
  ) {
    const pause = getMobilePauseButtonRect();
    if (p.x >= pause.x && p.x <= pause.x + pause.w && p.y >= pause.y && p.y <= pause.y + pause.h) {
      togglePauseMenu();
      return;
    }
  }

  if (game.state === "menu") {
    const pl = MENU_BUTTONS.playMode;
    const def = MENU_BUTTONS.defenseMode;
    if (p.x >= pl.x && p.x <= pl.x + pl.w && p.y >= pl.y && p.y <= pl.y + pl.h) {
      startPlayMode();
      return;
    }
    if (p.x >= def.x && p.x <= def.x + def.w && p.y >= def.y && p.y <= def.y + def.h) {
      startDefenseMode();
      return;
    }
    return;
  }
  if (game.state === "pauseMenu") {
    const res = PAUSE_MENU_BUTTONS.resume;
    const modeBtn = PAUSE_MENU_BUTTONS.modeRestart;
    const home = PAUSE_MENU_BUTTONS.home;
    if (p.x >= res.x && p.x <= res.x + res.w && p.y >= res.y && p.y <= res.y + res.h) {
      game.state = game.stateBeforePauseMenu;
      game.stateBeforePauseMenu = null;
      return;
    }
    if (p.x >= modeBtn.x && p.x <= modeBtn.x + modeBtn.w && p.y >= modeBtn.y && p.y <= modeBtn.y + modeBtn.h) {
      if (game.mode === "defense") {
        startDefenseMode();
      } else {
        startPlayMode();
      }
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
  if (game.state === "interceptionPopup") {
    return;
  }
  if (game.state === "playModeDowned") {
    if (game.playModeLastResultType === "interception") {
      game.state = "gameOver";
      game.winner = player2;
      return;
    }
    if (game.mode === "defense") {
      advanceDefenseModeDown(game.playModeDownedSpot);
    } else {
      if (game.playModeDown >= game.playModeMaxDowns) {
        game.state = "gameOver";
        game.winner = null;
      } else {
        advancePlayModeDown(game.playModeDownedSpot);
      }
    }
    return;
  }
  if (game.state === "touchdownPopup" || game.state === "safetyPopup") {
    return;
  }
  if (game.state === "gameOver") {
    if (game.touchControlsEnabled) {
      const restart = getMobileRestartButtonRect();
      if (p.x >= restart.x && p.x <= restart.x + restart.w && p.y >= restart.y && p.y <= restart.y + restart.h) {
        if (game.mode === "play") {
          startPlayModeDrive();
        } else if (game.mode === "defense") {
          startDefenseMode();
        } else {
          restartGame();
        }
        return;
      }
    }
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
        : game.selectedDefense === "B" ? "C"
        : game.selectedDefense === "C" ? "D"
        : "random";
      previewDefensePositions();
      return;
    }
    const slots = getPlaySelectSlots(game.playModePlaySelectPage);
    for (const s of slots) {
      if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) {
        beginSelectedPlay(s.key);
        return;
      }
    }
    return;
  }
  if (game.state === "defenseModeSelect") {
    const filt = getDefenseSelectFilterBarRects();
    const options = getDefenseSelectOptionRects();
    const offenseToggle = getDefenseSelectOffenseToggleRect();
    if (p.x >= filt.all.x && p.x <= filt.all.x + filt.all.w && p.y >= filt.all.y && p.y <= filt.all.y + filt.all.h) {
      game.defenseModeDefenseFilter = null;
      return;
    }
    if (p.x >= filt.run.x && p.x <= filt.run.x + filt.run.w && p.y >= filt.run.y && p.y <= filt.run.y + filt.run.h) {
      game.defenseModeDefenseFilter = "run";
      return;
    }
    if (p.x >= filt.pass.x && p.x <= filt.pass.x + filt.pass.w && p.y >= filt.pass.y && p.y <= filt.pass.y + filt.pass.h) {
      game.defenseModeDefenseFilter = "pass";
      return;
    }
    for (const key of Object.keys(options)) {
      const rect = options[key];
      if (p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h) {
        beginSelectedDefense(key);
        return;
      }
    }
    if (p.x >= offenseToggle.x && p.x <= offenseToggle.x + offenseToggle.w && p.y >= offenseToggle.y && p.y <= offenseToggle.y + offenseToggle.h) {
      cycleDefenseModeOffensePlay();
      return;
    }
  }
  if (game.touchControlsEnabled && ["playing", "prePlayCadence"].includes(game.state) && game.mode === "defense") {
    const sw = getMobileSwitchButtonRect();
    if (p.x >= sw.x && p.x <= sw.x + sw.w && p.y >= sw.y && p.y <= sw.y + sw.h) {
      cycleDefenseControlledPlayer();
      return;
    }
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
}

window.addEventListener("mousemove", (e) => {
  const p = getCanvasCoords(e);
  game.mouseX = p.x;
  game.mouseY = p.y;
});

window.addEventListener("click", (e) => {
  if (Date.now() < suppressClickUntil) return;
  handleCanvasTap(getCanvasCoords(e));
});

canvas.addEventListener("touchstart", (e) => {
  game.touchControlsEnabled = true;
  suppressClickUntil = Date.now() + 800;
  for (const t of e.changedTouches) {
    const p = getCanvasCoords(t);
    if (joystickTouchId === null && shouldStartTouchStick(p)) {
      joystickTouchId = t.identifier;
      updateTouchStickFromPoint(p);
    } else {
      handleCanvasTap(p);
    }
  }
  if (e.cancelable) e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  game.touchControlsEnabled = true;
  suppressClickUntil = Date.now() + 800;
  for (const t of e.changedTouches) {
    if (t.identifier === joystickTouchId) {
      const p = getCanvasCoords(t);
      game.mouseX = p.x;
      game.mouseY = p.y;
      updateTouchStickFromPoint(p);
    }
  }
  if (e.cancelable) e.preventDefault();
}, { passive: false });

function handleTouchEnd(e) {
  for (const t of e.changedTouches) {
    if (t.identifier === joystickTouchId) {
      joystickTouchId = null;
      resetTouchStick();
      break;
    }
  }
  if (e.cancelable) e.preventDefault();
}

canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  if (game.interceptionPopupTimer > 0) return;

  if (game.state === "playCoinToss") {
    if (game.coinTossPhase === "pickCall" && (key === "h" || key === "1")) {
      e.preventDefault();
      beginCoinTossFlip("heads");
      return;
    }
    if (game.coinTossPhase === "pickCall" && (key === "t" || key === "2")) {
      e.preventDefault();
      beginCoinTossFlip("tails");
      return;
    }
    if ((key === "enter" || key === " ") && game.coinTossPhase === "result") {
      e.preventDefault();
      continueFromCoinTossResult();
      return;
    }
    if (game.coinTossPhase === "userChooseSide" && (key === "o" || key === "1")) {
      e.preventDefault();
      startPlayFromUserCoinChoice("offense");
      return;
    }
    if (game.coinTossPhase === "userChooseSide" && (key === "d" || key === "2")) {
      e.preventDefault();
      startPlayFromUserCoinChoice("defense");
      return;
    }
    if ((key === "enter" || key === " ") && game.coinTossPhase === "cpuChose") {
      e.preventDefault();
      startPlayAfterCpuCoinChoice();
      return;
    }
  }

  if ((key === "enter" || key === " ") && game.state === "playTeamSelect") {
    e.preventDefault();
    advanceToOpponentReveal();
    return;
  }

  if ((key === "enter" || key === " ") && game.state === "playOpponentReveal") {
    e.preventDefault();
    startPlayAfterOpponentReveal();
    return;
  }

  if (key === "r" && game.state === "gameOver") {
    if (game.mode === "play") {
      if (game.playUserTeamId) resetPlayModeTeamScores();
      startPlayModeDrive();
    } else if (game.mode === "defense") {
      startDefenseMode();
    } else {
      restartGame();
    }
  } else if ((key === "enter" || key === " ") && game.state === "playModeDowned") {
    if (game.playModeLastResultType === "interception") {
      game.state = "gameOver";
      game.winner = player2;
      return;
    }
    if (game.mode === "defense") {
      advanceDefenseModeDown(game.playModeDownedSpot);
    } else {
      if (game.playModeDown >= game.playModeMaxDowns) {
        game.state = "gameOver";
        game.winner = null;
      } else {
        advancePlayModeDown(game.playModeDownedSpot);
      }
    }
  } else if (key === " " && game.mode === "defense" && ["playing", "prePlayCadence"].includes(game.state)) {
    cycleDefenseControlledPlayer();
  } else if (key === "a" && game.state === "playModePlaySelect") {
    setPlayModePlayFilter(null);
  } else if (key === "r" && game.state === "playModePlaySelect") {
    setPlayModePlayFilter("run");
  } else if (key === "p" && game.state === "playModePlaySelect") {
    setPlayModePlayFilter("pass");
  } else if ((key === "enter" || key === " ") && game.state === "playModePlaySelect") {
    const slots = getPlaySelectSlots(game.playModePlaySelectPage);
    if (slots[0]) beginSelectedPlay(slots[0].key);
  } else if (["1", "2", "3", "4"].includes(key) && game.state === "playModePlaySelect") {
    const slots = getPlaySelectSlots(game.playModePlaySelectPage);
    const idx = parseInt(key, 10) - 1;
    if (slots[idx]) beginSelectedPlay(slots[idx].key);
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
    if (game.state === "playCoinToss") {
      backFromCoinTossToOpponentReveal();
    } else if (game.state === "playOpponentReveal") {
      backFromOpponentRevealToTeamSelect();
    } else if (game.state === "playTeamSelect") {
      returnToHomeMenu();
    } else if (game.state === "pauseMenu") {
      game.state = game.stateBeforePauseMenu;
      game.stateBeforePauseMenu = null;
    } else if (["playing", "paused", "gameOver", "scorePause", "playModeDowned", "playModePlaySelect", "defenseModeSelect", "prePlayCadence"].includes(game.state)) {
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
  dx += game.touchMoveX;
  dy += game.touchMoveY;

  if (dx === 0 && dy === 0) return;

  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;

  if (game.mode === "defense") {
    const defender = getDefenseControlledPlayer();
    defender.x += dx * defender.speed * dt;
    defender.y += dy * defender.speed * dt;
    clampPlayerToField(defender);
    return;
  }

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

