// =========================================================
// Input Handling
// =========================================================
game.touchControlsEnabled = ("ontouchstart" in window) || window.matchMedia("(pointer: coarse)").matches;

let joystickTouchId = null;
let passAimTouchId = null;
let suppressClickUntil = 0;
const PLAY_MODE_PASS_KEYS = new Set([
  "passRight",
  "passLeft",
  "barnPlay",
  "scrambledEggs",
  "barnDoorBoot",
  "hayBaleHook",
  "cornfieldCross",
  "siloSlant",
  "pasturePop",
  "fencePost",
  "quickOut",
  "flatPass",
  "goRoute",
  "checkDown"
]);

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
  return ["playing", "paused", "scorePause", "playModeDowned", "playModePlaySelect", "prePlayCadence", "interceptionPopup", "puntAim", "kickoffAim"].includes(state);
}

function togglePauseMenu() {
  if (game.state === "statsMenu") {
    game.state = "pauseMenu";
    return;
  }
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
      && PLAY_MODE_PASS_KEYS.has(game.playModeCurrentPlay)
      && ball.carrier === player1 && !ball.inFlight
      && typeof canThrowOnCurrentPassPlay === "function"
      && canThrowOnCurrentPassPlay())
  );
}

function shouldStartPassAimTouch(p) {
  if (!game.touchControlsEnabled || getMobilePassAimMode() !== "hold") return false;
  if (!isThrowReady()) return false;
  return p.x >= canvas.width * 0.48 && p.y >= canvas.height * 0.32;
}

function releasePassAimThrow() {
  if (!isThrowReady()) return;
  const tx = clamp(game.mouseX, FIELD.x + ball.radius, FIELD.x + FIELD.width - ball.radius);
  const ty = clamp(game.mouseY, FIELD.y + ball.radius, FIELD.y + FIELD.height - ball.radius);
  if (game.mode === "passing") {
    ball.targetX = tx;
    ball.targetY = ty;
    ball.inFlight = true;
    ball.carrier = null;
    game.reacquireCooldownP1 = CONFIG.reacquireCooldownMs;
    return;
  }
  const preferred =
    typeof getPreferredPassTargetForPlay === "function"
      ? getPreferredPassTargetForPlay(game.playModeCurrentPlay)
      : null;
  startPlayModePassThrow(tx, ty, preferred);
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
  const fp = typeof pointerToFieldCoords === "function" ? pointerToFieldCoords(p) : p;
  game.mouseX = fp.x;
  game.mouseY = fp.y;

  if (game.state === "patKick" && game.patKickSubPhase === "aim") {
    commitPatKick();
    return;
  }

  if (game.state === "postTouchdownChoice") {
    const R = getPostTouchdownChoiceRects();
    const hit = (r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    if (hit(R.kick)) {
      beginPatKick();
      return;
    }
    if (hit(R.twoPoint)) {
      beginTwoPointFieldGoal();
      return;
    }
    return;
  }

  if (game.state === "instantReplay") {
    const L = getInstantReplayLayout();
    const hit = (r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    if (hit(L.skip) || hit(L.done)) {
      skipInstantReplay();
      return;
    }
    if (hit(L.pause)) {
      game.replayPaused = !game.replayPaused;
      return;
    }
    if (hit(L.zoomOut)) {
      replayAdjustZoom(-0.18);
      return;
    }
    if (hit(L.zoomIn)) {
      replayAdjustZoom(0.18);
      return;
    }
    if (hit(L.rewind)) {
      rewindInstantReplay();
      return;
    }
    return;
  }

  if (game.interceptionPopupTimer > 0) return;

  if (game.state === "playCoinToss") {
    const L = getCoinTossLayout();
    const hit = (r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    if (hit(L.back)) {
      resetCoinTossState();
      returnToHomeMenu();
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
    if (game.coinTossPhase === "userChooseDirection") {
      if (hit(L.toRight)) startPlayFromUserCoinDirection("right");
      else if (hit(L.toLeft)) startPlayFromUserCoinDirection("left");
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

  if (game.state === "franchiseMain") {
    const L = getFranchiseMainLayout();
    const hit = (r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    if (hit(L.back)) {
      game.state = "menu";
      startMenuMusic();
      return;
    }
    if (hit(L.newGame)) {
      beginFranchiseCreateNew();
      return;
    }
    if (hit(L.continueGame) && loadFranchise()) {
      initFranchiseState(loadFranchise());
      game.state = "franchiseHub";
      game.franchisePanel = "home";
      return;
    }
    if (hit(L.deleteSave) && loadFranchise()) {
      beginFranchiseDeleteSave();
      return;
    }
    return;
  }

  if (game.state === "franchiseHub") {
    handleFranchiseHubClick(p);
    return;
  }

  if (game.state === "franchisePlaySelect") {
    handleFranchisePlaySelectClick(p);
    return;
  }

  if (game.state === "playDevTraitsGuide") {
    const L = getDevTraitsGuideLayout();
    const hit = (r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    if (hit(L.back)) {
      closeDevTraitsGuide();
      return;
    }
    if (hit(L.overviewTab)) {
      game.devTraitsGuideTab = "overview";
      return;
    }
    if (hit(L.teamsTab)) {
      game.devTraitsGuideTab = "teams";
      return;
    }
    if (game.devTraitsGuideTab === "teams") {
      const maxP = getTeamSelectPageCount() - 1;
      if (hit(L.prevTeam)) {
        game.devTraitsGuideTeamPage = Math.max(0, (game.devTraitsGuideTeamPage || 0) - 1);
        return;
      }
      if (hit(L.nextTeam)) {
        game.devTraitsGuideTeamPage = Math.min(maxP, (game.devTraitsGuideTeamPage || 0) + 1);
        return;
      }
    }
    return;
  }

  if (game.state === "playTeamSelect") {
    const L = getTeamSelectLayout();
    const hit = (r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    if (hit(L.devGuide)) {
      openDevTraitsGuide("playTeamSelect");
      game.devTraitsGuideTab = "teams";
      return;
    }
    if (hit(L.back)) {
      game.teamSelectUser = null;
      if (game.franchisePickTeam) {
        game.franchisePickTeam = false;
        game.state = "franchiseMain";
        return;
      }
      game.playSessionKind = null;
      game.state = "playSessionSelect";
      return;
    }
    const tnav = getTeamSelectPageNavRects();
    if (tnav) {
      const maxP = getTeamSelectPageCount() - 1;
      if (hit(tnav.prev)) {
        game.teamSelectPage = Math.max(0, game.teamSelectPage - 1);
        return;
      }
      if (hit(tnav.next)) {
        game.teamSelectPage = Math.min(maxP, game.teamSelectPage + 1);
        return;
      }
    }
    if (hit(L.bigCard)) {
      game.teamSelectUser = getTeamIdForTeamSelectPage(game.teamSelectPage);
      return;
    }
    if (hit(L.start)) {
      if (!game.teamSelectUser) {
        game.teamSelectUser = getTeamIdForTeamSelectPage(game.teamSelectPage);
      }
      if (game.franchisePickTeam) {
        initFranchiseState(createNewFranchise(game.teamSelectUser));
        game.franchisePickTeam = false;
        game.state = "franchiseHub";
        game.franchisePanel = "home";
        return;
      }
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
    const fr = MENU_BUTTONS.franchise;
    const st = MENU_BUTTONS.settings;
    if (p.x >= pl.x && p.x <= pl.x + pl.w && p.y >= pl.y && p.y <= pl.y + pl.h) {
      startPlayMode();
      return;
    }
    if (p.x >= fr.x && p.x <= fr.x + fr.w && p.y >= fr.y && p.y <= fr.y + fr.h) {
      beginPlaySession("franchise");
      return;
    }
    if (p.x >= st.x && p.x <= st.x + st.w && p.y >= st.y && p.y <= st.y + st.h) {
      game.gameSettings = loadGameSettings();
      if (typeof applyGameSettingsAudio === "function") applyGameSettingsAudio(game.gameSettings);
      game.state = "settingsMenu";
      return;
    }
    const dt = MENU_BUTTONS.devTraits;
    if (p.x >= dt.x && p.x <= dt.x + dt.w && p.y >= dt.y && p.y <= dt.y + dt.h) {
      openDevTraitsGuide("menu");
      game.devTraitsGuideTab = "overview";
      return;
    }
    return;
  }

  if (game.state === "playSessionSelect") {
    const L = getPlaySessionSelectLayout();
    const hit = (r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    if (hit(L.back)) {
      game.playSessionKind = null;
      game.state = "menu";
      startMenuMusic();
      return;
    }
    if (hit(L.devTraits)) {
      openDevTraitsGuide("playSessionSelect");
      game.devTraitsGuideTab = "overview";
      return;
    }
    for (const key of PLAY_SESSION_TOP_KEYS) {
      if (hit(L[key])) {
        beginPlaySession(key);
        return;
      }
    }
    return;
  }

  if (game.state === "settingsMenu") {
    const L = getSettingsMenuLayout();
    const hit = (r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    if (hit(L.back)) {
      game.gameSettings = loadGameSettings();
      if (typeof applyGameSettingsAudio === "function") applyGameSettingsAudio(game.gameSettings);
      game.state = "menu";
      startMenuMusic();
      return;
    }
    if (hit(L.minusQ)) {
      game.gameSettings.quarterLengthMin = clamp(game.gameSettings.quarterLengthMin - 1, 1, 12);
      return;
    }
    if (hit(L.plusQ)) {
      game.gameSettings.quarterLengthMin = clamp(game.gameSettings.quarterLengthMin + 1, 1, 12);
      return;
    }
    if (hit(L.minusMusic)) {
      game.gameSettings.musicVolume = clamp(game.gameSettings.musicVolume - 5, 0, 100);
      if (typeof applyGameSettingsAudio === "function") applyGameSettingsAudio(game.gameSettings);
      return;
    }
    if (hit(L.plusMusic)) {
      game.gameSettings.musicVolume = clamp(game.gameSettings.musicVolume + 5, 0, 100);
      if (typeof applyGameSettingsAudio === "function") applyGameSettingsAudio(game.gameSettings);
      return;
    }
    if (hit(L.minusSfx)) {
      game.gameSettings.sfxVolume = clamp(game.gameSettings.sfxVolume - 5, 0, 100);
      if (typeof applyGameSettingsAudio === "function") applyGameSettingsAudio(game.gameSettings);
      return;
    }
    if (hit(L.plusSfx)) {
      game.gameSettings.sfxVolume = clamp(game.gameSettings.sfxVolume + 5, 0, 100);
      if (typeof applyGameSettingsAudio === "function") applyGameSettingsAudio(game.gameSettings);
      return;
    }
    if (hit(L.diffEasy)) {
      game.gameSettings.difficulty = "easy";
      return;
    }
    if (hit(L.diffNormal)) {
      game.gameSettings.difficulty = "normal";
      return;
    }
    if (hit(L.diffHard)) {
      game.gameSettings.difficulty = "hard";
      return;
    }
    if (hit(L.otOff)) {
      game.gameSettings.overtimeMode = "off";
      return;
    }
    if (hit(L.otFull)) {
      game.gameSettings.overtimeMode = "full";
      return;
    }
    if (hit(L.otSudden)) {
      game.gameSettings.overtimeMode = "suddenDeath";
      return;
    }
    if (hit(L.passTap)) {
      game.gameSettings.mobilePassAim = "tap";
      return;
    }
    if (hit(L.passHold)) {
      game.gameSettings.mobilePassAim = "hold";
      return;
    }
    if (hit(L.summaryOn)) {
      game.gameSettings.showDriveSummary = true;
      return;
    }
    if (hit(L.summaryOff)) {
      game.gameSettings.showDriveSummary = false;
      return;
    }
    if (hit(L.done)) {
      game.gameSettings = saveGameSettings(game.gameSettings);
      game.state = "menu";
      return;
    }
    return;
  }

  if (game.state === "statsMenu") {
    const L = getStatsMenuLayout();
    const hit = (r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    if (hit(L.back)) {
      game.state = "pauseMenu";
      return;
    }
    for (const key of STATS_CATEGORIES) {
      if (hit(L.tabs[key])) {
        game.statsCategory = key;
        return;
      }
    }
    return;
  }

  if (game.state === "pauseMenu") {
    const res = PAUSE_MENU_BUTTONS.resume;
    const statsBtn = PAUSE_MENU_BUTTONS.stats;
    const rep = PAUSE_MENU_BUTTONS.instantReplay;
    const modeBtn = PAUSE_MENU_BUTTONS.modeRestart;
    const home = PAUSE_MENU_BUTTONS.home;
    if (p.x >= res.x && p.x <= res.x + res.w && p.y >= res.y && p.y <= res.y + res.h) {
      game.state = game.stateBeforePauseMenu;
      game.stateBeforePauseMenu = null;
      return;
    }
    if (
      typeof shouldTrackGameStats === "function" &&
      shouldTrackGameStats() &&
      p.x >= statsBtn.x &&
      p.x <= statsBtn.x + statsBtn.w &&
      p.y >= statsBtn.y &&
      p.y <= statsBtn.y + statsBtn.h
    ) {
      game.statsCategory = "passing";
      game.state = "statsMenu";
      return;
    }
    if (
      p.x >= rep.x &&
      p.x <= rep.x + rep.w &&
      p.y >= rep.y &&
      p.y <= rep.y + rep.h &&
      typeof replayHasLastPlay === "function" &&
      replayHasLastPlay()
    ) {
      openReplayFromPauseMenu();
      return;
    }
    if (p.x >= modeBtn.x && p.x <= modeBtn.x + modeBtn.w && p.y >= modeBtn.y && p.y <= modeBtn.y + modeBtn.h) {
      restartPlaySession();
      game.stateBeforePauseMenu = null;
      return;
    }
    if (p.x >= home.x && p.x <= home.x + home.w && p.y >= home.y && p.y <= home.y + home.h) {
      if (game.franchiseActive && typeof returnToFranchiseHub === "function") {
        returnToFranchiseHub();
        game.stateBeforePauseMenu = null;
        return;
      }
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
  if (game.state === "sessionPossessionRecap") {
    completeSessionPossessionRecap();
    return;
  }
  if (game.state === "driveSummary") {
    completeDriveSummary();
    return;
  }
  if (game.state === "playModeDowned") {
    if (game.playModeLastResultType === "interception") {
      if (game.twoPointAttemptActive) {
        completeTwoPointConversionFailed();
        return;
      }
      if (game.playSessionKind === "offense") {
        handlePlaySessionSeriesEnd();
        return;
      }
      game.state = "gameOver";
      game.winner = player2;
      return;
    }
    if (game.mode === "play") {
      advancePlayModeDown(game.playModeDownedSpot);
    }
    return;
  }
  if (game.state === "touchdownPopup" || game.state === "safetyPopup" || game.state === "kickoffFlagPopup" || game.state === "patKick") {
    return;
  }
  if (game.state === "halftimePopup") {
    completeHalftimeBreak();
    return;
  }
  if (game.state === "gameOver") {
    if (game.touchControlsEnabled) {
      const restart = getMobileRestartButtonRect();
      if (p.x >= restart.x && p.x <= restart.x + restart.w && p.y >= restart.y && p.y <= restart.y + restart.h) {
        if (game.mode === "play") {
          if (game.cpuOffense) {
            beginKickoffAim(true);
          } else {
            beginKickoffAim(false);
          }
        } else {
          restartGame();
        }
        return;
      }
    }
    return;
  }
  if (game.state === "playModePlaySelect") {
    if (!game.cpuOffense && game.mode === "play" && game.playModeDown === game.playModeMaxDowns && !game.fourthDownPickedGoForIt) {
      const R = getFourthDownChoiceRects();
      const fgYards = Math.round(getFourthDownFieldGoalDistanceYards());
      const hit = (r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
      if (hit(R.punt)) {
        beginFourthDownPunt();
        return;
      }
      if (hit(R.fieldGoal) && fgYards <= MAX_FIELD_GOAL_YARDS) {
        beginFourthDownFieldGoal();
        return;
      }
      if (hit(R.goForIt)) {
        beginFourthDownGoForIt();
        return;
      }
      return;
    }
    if (game.cpuOffense) {
      const filt = getDefenseSelectFilterBarRects();
      const options = getDefenseSelectOptionRects();
      const offenseToggle = getDefenseSelectOffenseToggleRect();
      const rusherToggle = getDefenseSelectRusherToggleRect();
      const jamToggle = getDefenseSelectJamToggleRect();
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
      if (p.x >= rusherToggle.x && p.x <= rusherToggle.x + rusherToggle.w && p.y >= rusherToggle.y && p.y <= rusherToggle.y + rusherToggle.h) {
        cycleDefensePassRusher();
        return;
      }
      if (p.x >= jamToggle.x && p.x <= jamToggle.x + jamToggle.w && p.y >= jamToggle.y && p.y <= jamToggle.y + jamToggle.h) {
        toggleDefensePressJam();
        return;
      }
      return;
    }
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
    const swSide = getPlaySelectSideSwitchRect();
    if (p.x >= swSide.x && p.x <= swSide.x + swSide.w && p.y >= swSide.y && p.y <= swSide.y + swSide.h) {
      game.playModeFlipPlaySide = !game.playModeFlipPlaySide;
      return;
    }
    if (p.x >= dt.x && p.x <= dt.x + dt.w && p.y >= dt.y && p.y <= dt.y + dt.h) {
      game.selectedDefense = game.selectedDefense === "A" ? "B" : "A";
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
  if (game.touchControlsEnabled && ["playing", "prePlayCadence"].includes(game.state)) {
    const sw = getMobileSwitchButtonRect();
    if (p.x >= sw.x && p.x <= sw.x + sw.w && p.y >= sw.y && p.y <= sw.y + sw.h) {
      if (toggleBarnDoorBootLateralFlip()) {
        return;
      }
      if (game.cpuOffense) {
        cycleDefenseControlledPlayer();
        return;
      }
    }
  }
  if (canShowJukeButton()) {
    const juke = getMobileJukeButtonRect();
    if (p.x >= juke.x && p.x <= juke.x + juke.w && p.y >= juke.y && p.y <= juke.y + juke.h) {
      const carrier = getUserOffenseBallCarrier();
      if (carrier) tryStartCarrierJuke(carrier);
      return;
    }
  }
  if (game.state === "playing" && game.mode === "passing" && ball.carrier === player1 && !ball.inFlight) {
    if (!(game.touchControlsEnabled && getMobilePassAimMode() === "hold")) {
      const tx = clamp(p.x, FIELD.x + ball.radius, FIELD.x + FIELD.width - ball.radius);
      const ty = clamp(p.y, FIELD.y + ball.radius, FIELD.y + FIELD.height - ball.radius);
      ball.targetX = tx;
      ball.targetY = ty;
      ball.inFlight = true;
      ball.carrier = null;
      game.reacquireCooldownP1 = CONFIG.reacquireCooldownMs;
    }
  }
  if (game.state === "playing" && game.mode === "play"
      && PLAY_MODE_PASS_KEYS.has(game.playModeCurrentPlay)
      && ball.carrier === player1 && !ball.inFlight
      && typeof canThrowOnCurrentPassPlay === "function"
      && canThrowOnCurrentPassPlay()
      && !(game.touchControlsEnabled && getMobilePassAimMode() === "hold")) {
    const tx = clamp(p.x, FIELD.x + ball.radius, FIELD.x + FIELD.width - ball.radius);
    const ty = clamp(p.y, FIELD.y + ball.radius, FIELD.y + FIELD.height - ball.radius);
    const preferred =
      typeof getPreferredPassTargetForPlay === "function"
        ? getPreferredPassTargetForPlay(game.playModeCurrentPlay)
        : null;
    startPlayModePassThrow(tx, ty, preferred);
  }
}

window.addEventListener("mousemove", (e) => {
  const p = getCanvasCoords(e);
  const fp = typeof pointerToFieldCoords === "function" ? pointerToFieldCoords(p) : p;
  game.mouseX = fp.x;
  game.mouseY = fp.y;
});

canvas.addEventListener("wheel", (e) => {
  if (game.state !== "franchiseHub") return;
  const f = typeof getActiveFranchise === "function" ? getActiveFranchise() : null;
  if (!f) return;
  const panelId = typeof resolveFranchisePanel === "function" ? resolveFranchisePanel(f) : null;
  const delta = e.deltaY > 0 ? 1 : -1;
  if (panelId === "roster") {
    e.preventDefault();
    game.franchiseRosterScroll = Math.max(0, (game.franchiseRosterScroll || 0) + delta);
    return;
  }
  if (panelId === "trade") {
    e.preventDefault();
    const max = PLAY_TEAM_IDS.length - 2;
    game.franchiseTradeTeamScroll = Math.max(0, Math.min(max, (game.franchiseTradeTeamScroll || 0) + delta));
  }
}, { passive: false });

window.addEventListener("click", (e) => {
  if (Date.now() < suppressClickUntil) return;
  handleCanvasTap(getCanvasCoords(e));
});

window.addEventListener("mousedown", (e) => {
  if (game.state !== "puntAim" && game.state !== "kickoffAim") return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
    game.puntAimCharging = true;
  }
});

window.addEventListener("mouseup", () => {
  if ((game.state === "puntAim" || game.state === "kickoffAim") && game.puntAimCharging) {
    game.puntAimCharging = false;
    if (game.state === "kickoffAim") finalizeKickoffAimKick();
    else finalizePuntAimKick();
  }
});

canvas.addEventListener("touchstart", (e) => {
  game.touchControlsEnabled = true;
  suppressClickUntil = Date.now() + 800;
  if (game.state === "puntAim" || game.state === "kickoffAim") {
    game.puntAimCharging = true;
    if (e.cancelable) e.preventDefault();
    return;
  }
  for (const t of e.changedTouches) {
    const p = getCanvasCoords(t);
    if (joystickTouchId === null && shouldStartTouchStick(p)) {
      joystickTouchId = t.identifier;
      updateTouchStickFromPoint(p);
    } else if (passAimTouchId === null && shouldStartPassAimTouch(p)) {
      passAimTouchId = t.identifier;
      const fp = typeof pointerToFieldCoords === "function" ? pointerToFieldCoords(p) : p;
      game.mouseX = fp.x;
      game.mouseY = fp.y;
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
    } else if (t.identifier === passAimTouchId) {
      const p = getCanvasCoords(t);
      const fp = typeof pointerToFieldCoords === "function" ? pointerToFieldCoords(p) : p;
      game.mouseX = fp.x;
      game.mouseY = fp.y;
    }
  }
  if (e.cancelable) e.preventDefault();
}, { passive: false });

function handleTouchEnd(e) {
  if ((game.state === "puntAim" || game.state === "kickoffAim") && game.puntAimCharging) {
    game.puntAimCharging = false;
    if (game.state === "kickoffAim") finalizeKickoffAimKick();
    else finalizePuntAimKick();
    if (e.cancelable) e.preventDefault();
    return;
  }
  for (const t of e.changedTouches) {
    if (t.identifier === passAimTouchId) {
      passAimTouchId = null;
      releasePassAimThrow();
      continue;
    }
    if (t.identifier === joystickTouchId) {
      joystickTouchId = null;
      resetTouchStick();
    }
  }
  if (e.cancelable) e.preventDefault();
}

canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  if (game.state === "instantReplay") {
    if (key === "escape" || key === "enter") {
      e.preventDefault();
      skipInstantReplay();
      return;
    }
    if (key === " ") {
      e.preventDefault();
      skipInstantReplay();
      return;
    }
    if (key === "p") {
      e.preventDefault();
      game.replayPaused = !game.replayPaused;
      return;
    }
    if (key === "+" || key === "=") {
      e.preventDefault();
      replayAdjustZoom(0.18);
      return;
    }
    if (key === "-" || key === "_") {
      e.preventDefault();
      replayAdjustZoom(-0.18);
      return;
    }
    if (key === "r") {
      e.preventDefault();
      rewindInstantReplay();
      return;
    }
    if (key === "arrowleft") {
      e.preventDefault();
      rewindInstantReplay();
      return;
    }
    return;
  }

  if (game.state === "patKick" && game.patKickSubPhase === "aim" && (key === " " || key === "enter")) {
    e.preventDefault();
    commitPatKick();
    return;
  }

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
    if (game.coinTossPhase === "userChooseDirection" && (key === "r" || key === "1")) {
      e.preventDefault();
      startPlayFromUserCoinDirection("right");
      return;
    }
    if (game.coinTossPhase === "userChooseDirection" && (key === "l" || key === "2")) {
      e.preventDefault();
      startPlayFromUserCoinDirection("left");
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
    if (!game.teamSelectUser) {
      game.teamSelectUser = getTeamIdForTeamSelectPage(game.teamSelectPage);
    }
    advanceToOpponentReveal();
    return;
  }

  if ((key === "enter" || key === " ") && game.state === "playOpponentReveal") {
    e.preventDefault();
    startPlayAfterOpponentReveal();
    return;
  }

  if (game.state === "postTouchdownChoice") {
    if (key === "1") {
      e.preventDefault();
      beginPatKick();
      return;
    }
    if (key === "2") {
      e.preventDefault();
      beginTwoPointFieldGoal();
      return;
    }
  }

  if (
    game.state === "playModePlaySelect" &&
    !game.cpuOffense &&
    game.mode === "play" &&
    game.playModeDown === game.playModeMaxDowns &&
    !game.fourthDownPickedGoForIt
  ) {
    const fgYards = Math.round(getFourthDownFieldGoalDistanceYards());
    if (key === "1" || key === "p") {
      e.preventDefault();
      beginFourthDownPunt();
      return;
    }
    if ((key === "2" || key === "f") && fgYards <= MAX_FIELD_GOAL_YARDS) {
      e.preventDefault();
      beginFourthDownFieldGoal();
      return;
    }
    if (key === "3" || key === "g") {
      e.preventDefault();
      beginFourthDownGoForIt();
      return;
    }
  }

  if ((key === "enter" || key === " ") && game.state === "halftimePopup") {
    completeHalftimeBreak();
    return;
  }

  if ((key === "enter" || key === " ") && game.state === "sessionPossessionRecap") {
    completeSessionPossessionRecap();
    return;
  }

  if ((key === "enter" || key === " ") && game.state === "driveSummary") {
    completeDriveSummary();
    return;
  }

  if (key === "r" && game.state === "gameOver" && game.franchiseActive) {
    e.preventDefault();
    completeFranchisePlayedGame(getActiveFranchise());
    return;
  }
  if (key === "r" && game.state === "gameOver") {
    if (game.mode === "play") {
      if (game.playUserTeamId) resetPlayModeTeamScores();
      if (game.cpuOffense) {
        beginKickoffAim(true);
      } else {
        beginKickoffAim(false);
      }
    } else {
      restartGame();
    }
  } else if ((key === "enter" || key === " ") && game.state === "playModeDowned") {
    if (game.playModeLastResultType === "interception") {
      if (game.twoPointAttemptActive) {
        completeTwoPointConversionFailed();
        return;
      }
      if (game.playSessionKind === "offense") {
        handlePlaySessionSeriesEnd();
        return;
      }
      game.state = "gameOver";
      game.winner = player2;
      return;
    }
    if (game.mode === "play") {
      advancePlayModeDown(game.playModeDownedSpot);
    }
  } else if (key === " " && ["playing", "prePlayCadence"].includes(game.state)) {
    if (toggleBarnDoorBootLateralFlip()) {
      // Barn Door Boot: flip roll side (mobile uses same Switch control).
    } else if (game.cpuOffense) {
      cycleDefenseControlledPlayer();
    }
  } else if (key === "e" && game.state === "playing" && !game.cpuOffense) {
    e.preventDefault();
    const carrier = getUserOffenseBallCarrier();
    if (carrier) tryStartCarrierJuke(carrier);
  } else if (key === "a" && game.state === "playModePlaySelect" && !game.cpuOffense) {
    setPlayModePlayFilter(null);
  } else if (key === "r" && game.state === "playModePlaySelect" && !game.cpuOffense) {
    setPlayModePlayFilter("run");
  } else if (key === "p" && game.state === "playModePlaySelect" && !game.cpuOffense) {
    setPlayModePlayFilter("pass");
  } else if (key === "d" && game.state === "playModePlaySelect" && !game.cpuOffense) {
    game.selectedDefense = game.selectedDefense === "A" ? "B" : "A";
    previewDefensePositions();
    e.preventDefault();
  } else if ((key === "enter" || key === " ") && game.state === "playModePlaySelect" && !game.cpuOffense) {
    const slots = getPlaySelectSlots(game.playModePlaySelectPage);
    if (slots[0]) beginSelectedPlay(slots[0].key);
  } else if (["1", "2", "3", "4"].includes(key) && game.state === "playModePlaySelect" && !game.cpuOffense) {
    const slots = getPlaySelectSlots(game.playModePlaySelectPage);
    const idx = parseInt(key, 10) - 1;
    if (slots[idx]) beginSelectedPlay(slots[idx].key);
  } else if (["1", "2", "3", "4"].includes(key) && game.state === "playModePlaySelect" && game.cpuOffense) {
    const order = getFilteredDefenseOptionOrder();
    const idx = parseInt(key, 10) - 1;
    const defKey = order[idx];
    if (defKey) beginSelectedDefense(defKey);
  } else if (key === "q" && game.state === "playModePlaySelect" && game.cpuOffense) {
    cycleDefensePassRusher();
    e.preventDefault();
  } else if (key === "j" && game.state === "playModePlaySelect" && game.cpuOffense) {
    toggleDefensePressJam();
    e.preventDefault();
  } else if ((key === "arrowleft" || key === "arrowright") && game.state === "playModePlaySelect" && !game.cpuOffense) {
    const pages = getPlaySelectPageCount();
    if (pages > 1) {
      if (key === "arrowleft") {
        game.playModePlaySelectPage = Math.max(0, game.playModePlaySelectPage - 1);
      } else {
        game.playModePlaySelectPage = Math.min(pages - 1, game.playModePlaySelectPage + 1);
      }
      e.preventDefault();
    }
  } else if ((key === "arrowleft" || key === "arrowright") && game.state === "playTeamSelect") {
    const pages = getTeamSelectPageCount();
    if (pages > 1) {
      if (key === "arrowleft") {
        game.teamSelectPage = Math.max(0, game.teamSelectPage - 1);
      } else {
        game.teamSelectPage = Math.min(pages - 1, game.teamSelectPage + 1);
      }
      e.preventDefault();
    }
  } else if (game.state === "playDevTraitsGuide") {
    if (key === "1" || key === "o") {
      game.devTraitsGuideTab = "overview";
      e.preventDefault();
    } else if (key === "2" || key === "t") {
      game.devTraitsGuideTab = "teams";
      e.preventDefault();
    } else if (game.devTraitsGuideTab === "teams" && (key === "arrowleft" || key === "arrowright")) {
      const pages = getTeamSelectPageCount();
      if (pages > 1) {
        if (key === "arrowleft") {
          game.devTraitsGuideTeamPage = Math.max(0, (game.devTraitsGuideTeamPage || 0) - 1);
        } else {
          game.devTraitsGuideTeamPage = Math.min(pages - 1, (game.devTraitsGuideTeamPage || 0) + 1);
        }
        e.preventDefault();
      }
    }
  }
  if (["1", "2", "3", "4"].includes(key) && game.state === "playModePlaySelect") {
    e.preventDefault();
  }
  if ((key === "a" || key === "r" || key === "p") && game.state === "playModePlaySelect" && !game.cpuOffense) {
    e.preventDefault();
  }
  if (key === "escape") {
    if (game.state === "playCoinToss") {
      backFromCoinTossToOpponentReveal();
    } else if (game.state === "playOpponentReveal") {
      backFromOpponentRevealToTeamSelect();
    } else if (game.state === "playSessionSelect") {
      game.playSessionKind = null;
      game.state = "menu";
      startMenuMusic();
    } else if (game.state === "playDevTraitsGuide") {
      closeDevTraitsGuide();
    } else if (game.state === "franchisePlaySelect") {
      game.state = "franchiseHub";
    } else if (game.state === "franchiseHub" || game.state === "franchiseMain") {
      if (game.state === "franchiseHub") game.state = "franchiseMain";
      else {
        game.state = "menu";
        startMenuMusic();
      }
    } else if (game.state === "playTeamSelect") {
      returnToHomeMenu();
    } else if (game.state === "pauseMenu") {
      game.state = game.stateBeforePauseMenu;
      game.stateBeforePauseMenu = null;
    } else if (game.state === "statsMenu") {
      game.state = "pauseMenu";
    } else if (game.state === "settingsMenu") {
      game.gameSettings = loadGameSettings();
      if (typeof applyGameSettingsAudio === "function") applyGameSettingsAudio(game.gameSettings);
      game.state = "menu";
      startMenuMusic();
    } else if (game.state === "halftimePopup") {
      completeHalftimeBreak();
    } else if (["playing", "paused", "gameOver", "scorePause", "playModeDowned", "playModePlaySelect", "prePlayCadence", "interceptionPopup", "puntAim", "kickoffAim"].includes(game.state)) {
      game.stateBeforePauseMenu = game.state;
      game.state = "pauseMenu";
    }
  }

  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " ", "escape", "enter"].includes(key)) {
    e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  const key = e.key.toLowerCase();
  keys[key] = false;
  if ((game.state === "puntAim" || game.state === "kickoffAim") && key === " ") {
    game.puntAimCharging = false;
    if (game.state === "kickoffAim") finalizeKickoffAimKick();
    else finalizePuntAimKick();
  }
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

  if (game.cpuOffense) {
    const defender = getDefenseControlledPlayer();
    defender.x += dx * defender.speed * dt;
    defender.y += dy * defender.speed * dt;
    clampPlayerToField(defender);
    return;
  }

  if (
    game.mode === "play" &&
    game.playModePhase === "snap" &&
    (game.playModeCurrentPlay === "sweepRight" || game.playModeCurrentPlay === "sweepLeft")
  ) {
    return;
  }

  const isPlayMode = game.mode === "play" && (
    game.playModePhase === "sweep" ||
    PLAY_MODE_PASS_KEYS.has(game.playModeCurrentPlay) ||
    (game.playModeCurrentPlay === "diveRight" && game.playModePhase === "run") ||
    (game.playModeCurrentPlay === "diveLeft" && game.playModePhase === "run") ||
    (game.playModeCurrentPlay === "mudHoleDive" && game.playModePhase === "run") ||
    (game.playModeCurrentPlay === "straightUp" && game.playModePhase === "run") ||
    game.playModeCurrentPlay === "qbKeep"
  );
  const offenseP4CarrierControlled =
    isPlayMode &&
    ball.carrier === offenseP4 &&
    (
      game.playModeCurrentPlay === "sweepRight" ||
      game.playModeCurrentPlay === "sweepLeft" ||
      (game.playModeCurrentPlay === "diveRight" && game.playModePhase === "run") ||
      (game.playModeCurrentPlay === "mudHoleDive" && game.playModePhase === "run") ||
      (game.playModeCurrentPlay === "straightUp" && game.playModePhase === "run") ||
      PLAY_MODE_PASS_KEYS.has(game.playModeCurrentPlay)
    );
  if (isPlayMode && ball.carrier === allyHorse) {
    const rbSpeedMult = 1.0;
    allyHorse.x += dx * allyHorse.speed * rbSpeedMult * dt;
    allyHorse.y += dy * allyHorse.speed * rbSpeedMult * dt;
    clampPlayerToField(allyHorse);
  } else if (offenseP4CarrierControlled) {
    const rbSpeedMult = 1.0;
    offenseP4.x += dx * offenseP4.speed * rbSpeedMult * dt;
    offenseP4.y += dy * offenseP4.speed * rbSpeedMult * dt;
    clampPlayerToField(offenseP4);
  } else if (
    isPlayMode &&
    ball.carrier === lilTunnelPete &&
    game.playModePhase !== "snap"
  ) {
    const rbSpeedMult = 1.0;
    lilTunnelPete.x += dx * lilTunnelPete.speed * rbSpeedMult * dt;
    lilTunnelPete.y += dy * lilTunnelPete.speed * rbSpeedMult * dt;
    clampPlayerToField(lilTunnelPete);
  } else {
    player1.x += dx * player1.speed * dt;
    player1.y += dy * player1.speed * dt;
    clampPlayerToField(player1);
  }
}

