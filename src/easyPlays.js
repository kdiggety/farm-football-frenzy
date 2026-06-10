// =========================================================
// Easy plays — short routes / straight runs for every playbook
// (EASY_PLAYBOOK_KEYS + appendEasyPlaysToPlaybook live in config.js)
// =========================================================

function isEasyPassPlay(playKey) {
  return playKey === "quickOut" || playKey === "flatPass" || playKey === "goRoute" || playKey === "checkDown";
}

function isEasyRunPlay(playKey) {
  return playKey === "straightUp" || playKey === "qbKeep";
}

function getEasyPassDropbackTarget(lineX) {
  const rawTarget = lineX - getOffenseDirection() * 5 * YARDS_TO_PIXELS;
  return clampPlayableX(rawTarget, player1.radius + 4);
}

function getEasyStraightUpRunLaneY() {
  return FIELD.y + FIELD.height / 2;
}

/** Out route break — toward the nearest sideline, not fixed to one side of the field. */
function getEasyOutBreakPoint(entity, depthYards) {
  const lineX = game.playModeLineX;
  const outX = clampPlayableX(getOffsetX(lineX, depthYards), 8);
  const midY = FIELD.y + FIELD.height / 2;
  const outY =
    entity.y <= midY
      ? formationSidelineY(entity, "left")
      : formationSidelineY(entity, "right");
  return { outX, outY };
}

function resetEasyPassPlayState() {
  game.passPlayDropbackDone = false;
  game.passPlayCanThrow = true;
  game.passPlayTargetReceiver = null;
  game.passPlayRouteMs = 0;
}

function resetEasyRunBlockState() {
  game.easyRunCenterBlockMs = 0;
  game.easyRunCenterBlockTargetId = null;
  game.easyRunLeadBlockMs = 0;
  game.easyRunLeadBlockTargetId = null;
}

function positionForEasyPassPlay(playKey) {
  const lineX = game.playModeLineX;
  applyFormationForPlay(playKey, lineX);
  positionDefenseForPlay(FIELD.y + FIELD.height / 2);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  resetEasyPassPlayState();
  game.passPlayDropbackTarget = getEasyPassDropbackTarget(lineX);
  game.playModePassSnapMs = 180;
  game.rushReactionTimer = 0;
  game.passJamWindowMs = game.cpuOffense && game.defensePressJam ? 950 : 0;
  setMobileAimForwardFromQB();
}

function startEasyPassPlay(playKey) {
  game.playModeCurrentPlay = playKey;
  game.playModePhase = null;
  game.state = "playing";
  positionForEasyPassPlay(playKey);
  prepareDefenseModeCpuPass(playKey);
}

function positionForStraightUp() {
  const lineX = game.playModeLineX;
  applyFormationForPlay("straightUp", lineX);
  positionDefenseForPlay();
  defenseP4.y = offenseP5.y;
  defenseP4.x = getOffsetX(offenseP5.x, 20);
  clampPlayerToField(defenseP4);
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.playModePhase = "handoff";
  resetEasyRunBlockState();
}

function startStraightUpPlay() {
  game.playModeCurrentPlay = "straightUp";
  game.state = "playing";
  positionForStraightUp();
}

function positionForQbKeep() {
  const lineX = game.playModeLineX;
  applyFormationForPlay("qbKeep", lineX);
  positionDefenseForPlay();
  game.possessionLockTimer = 0;
  game.reacquireCooldownP1 = 0;
  game.reacquireCooldownP2 = 0;
  game.playModePhase = "run";
  resetEasyRunBlockState();
  ball.carrier = player1;
  ball.inFlight = false;
  updateBallPosition();
}

function startQbKeepPlay() {
  game.playModeCurrentPlay = "qbKeep";
  game.state = "playing";
  positionForQbKeep();
  markRunAttemptStarted();
}

function moveEasyRunDefenders(dt, carrier) {
  const cx = carrier ? carrier.x : ball.x;
  const cy = carrier ? carrier.y : ball.y;
  const lineX = game.playModeLineX;
  const runLaneY = carrier ? carrier.y : getEasyStraightUpRunLaneY();
  const rusherX = getOffsetX(lineX, 7);

  if (game.defenseReactionTimer > 0) {
    game.defenseReactionTimer = Math.max(0, game.defenseReactionTimer - dt * 1000);
  } else {
    moveDefensePlayer(player2, rusherX, runLaneY, player2.speed, dt);
  }

  if (game.cluckNorrisTimer > 0) {
    game.cluckNorrisTimer = Math.max(0, game.cluckNorrisTimer - dt * 1000);
  } else {
    moveDefensePlayer(allyDonkey, cx, cy, allyDonkey.speed, dt);
    moveDefensePlayer(cluckNorris, cx, cy, cluckNorris.speed, dt);
  }
  moveDefensePlayer(defenseP4, cx, cy, defenseP4.speed * 0.92, dt);
  moveDefensePlayer(defenseP5, cx, cy, defenseP5.speed * 0.9, dt);
}

function moveEasyStraightUpCenterBlock(dt) {
  const dir = getOffenseDirection();
  const blockTarget = player2;
  if (blockTarget.id !== game.easyRunCenterBlockTargetId) {
    game.easyRunCenterBlockTargetId = blockTarget.id;
  }
  const engageDist = lilTunnelPete.radius + blockTarget.radius + 12;
  const closeEnough =
    distance(lilTunnelPete.x, lilTunnelPete.y, blockTarget.x, blockTarget.y) <= engageDist;
  if (closeEnough && game.easyRunCenterBlockMs <= 0) {
    game.easyRunCenterBlockMs = getBlockHoldMsForLineman(lilTunnelPete);
  }
  if (game.easyRunCenterBlockMs > 0) {
    game.easyRunCenterBlockMs -= dt * 1000;
  }
  const blockActive = game.easyRunCenterBlockMs > 0;
  if (!blockActive) {
    moveToward(lilTunnelPete, blockTarget.x - dir * 8, blockTarget.y, lilTunnelPete.speed * 1.08, dt);
  } else {
    moveToward(lilTunnelPete, blockTarget.x - dir * 4, blockTarget.y, lilTunnelPete.speed * 0.92, dt);
  }
  clampPlayerToField(lilTunnelPete);
}

function moveEasyStraightUpLeadBlock(dt) {
  const dir = getOffenseDirection();
  const blockTarget = defenseP5;
  if (blockTarget.id !== game.easyRunLeadBlockTargetId) {
    game.easyRunLeadBlockTargetId = blockTarget.id;
  }
  const engageDist = allyHorse.radius + blockTarget.radius + 24;
  const closeEnough =
    distance(allyHorse.x, allyHorse.y, blockTarget.x, blockTarget.y) <= engageDist;
  if (closeEnough && game.easyRunLeadBlockMs <= 0) {
    game.easyRunLeadBlockMs = getBlockHoldMsForLineman(allyHorse);
  }
  if (game.easyRunLeadBlockMs > 0) {
    game.easyRunLeadBlockMs -= dt * 1000;
  }
  const blockActive = game.easyRunLeadBlockMs > 0;
  if (!blockActive) {
    moveToward(allyHorse, blockTarget.x - dir * 6, blockTarget.y, allyHorse.speed * 1.05, dt);
  } else {
    moveToward(allyHorse, blockTarget.x - dir * 4, blockTarget.y, allyHorse.speed * 0.95, dt);
  }
  clampPlayerToField(allyHorse);
}

function moveEasyQbKeepLeadBlock(dt) {
  const dir = getOffenseDirection();
  let blockTarget = player2;
  let bestDist = distance(player1.x, player1.y, player2.x, player2.y);
  for (const d of [allyDonkey, cluckNorris, defenseP4, defenseP5]) {
    const ahead = dir * (d.x - player1.x);
    if (ahead < -8) continue;
    const dist = distance(player1.x, player1.y, d.x, d.y);
    if (dist < bestDist) {
      bestDist = dist;
      blockTarget = d;
    }
  }
  moveToward(allyHorse, blockTarget.x - dir * 5, blockTarget.y, allyHorse.speed * 1.08, dt);
  clampPlayerToField(allyHorse);
}

function isEasyRunTackle(carrier) {
  return (
    circleTackle(carrier, player2) ||
    circleTackle(carrier, allyDonkey) ||
    circleTackle(carrier, cluckNorris) ||
    circleTackle(carrier, defenseP4) ||
    circleTackle(carrier, defenseP5)
  );
}

function moveEasyPassReceivers(dt, adjustTarget = null) {
  const lineX = game.playModeLineX;
  const midY = FIELD.y + FIELD.height / 2;
  const play = game.playModeCurrentPlay;

  const runRoute = (entity, tx, ty, adjustKey) => {
    if (adjustTarget === adjustKey) {
      moveToward(entity, ball.targetX, ball.targetY, entity.speed, dt);
      return;
    }
    runReceiverToLandmarkOrContinue(entity, tx, ty, getScriptedPassRouteSpeed(entity), dt);
  };

  if (play === "quickOut") {
    const stemX = clampPlayableX(getOffsetX(lineX, 6), 12);
    const { outX, outY } = getEasyOutBreakPoint(allyHorse, 10);
    if (adjustTarget === "horse") {
      moveToward(allyHorse, ball.targetX, ball.targetY, allyHorse.speed, dt);
    } else if (hasNotReachedForwardX(allyHorse.x, stemX)) {
      moveToward(allyHorse, stemX, allyHorse.y, getScriptedPassRouteSpeed(allyHorse), dt);
    } else {
      runReceiverToLandmarkOrContinue(allyHorse, outX, outY, getScriptedPassRouteSpeed(allyHorse), dt);
    }
    runRoute(lilTunnelPete, clampPlayableX(getOffsetX(lineX, 8), 16), lilTunnelPete.y, null);
    runRoute(offenseP4, clampPlayableX(getOffsetX(lineX, 3), 20), midY, null);
  } else if (play === "flatPass") {
    const flatX = clampPlayableX(getOffsetX(lineX, 5), 10);
    runRoute(lilTunnelPete, flatX, lilTunnelPete.y, "pete");
    runRoute(allyHorse, clampPlayableX(getOffsetX(lineX, 14), 8), allyHorse.y, null);
    runRoute(offenseP4, clampPlayableX(getOffsetX(lineX, 2), 20), midY, null);
  } else if (play === "goRoute") {
    const deepX = clampPlayableX(getOffsetX(lineX, 16), 6);
    runRoute(allyHorse, deepX, allyHorse.y, "horse");
    runRoute(lilTunnelPete, clampPlayableX(getOffsetX(lineX, 8), 14), lilTunnelPete.y, null);
    runRoute(offenseP4, clampPlayableX(getOffsetX(lineX, 4), 18), midY, null);
  } else if (play === "checkDown") {
    const checkX = clampPlayableX(getOffsetX(lineX, 4), 16);
    const checkY = midY + 12;
    runRoute(offenseP4, checkX, checkY, "p4");
    runRoute(allyHorse, clampPlayableX(getOffsetX(lineX, 10), 10), allyHorse.y, null);
    runRoute(lilTunnelPete, clampPlayableX(getOffsetX(lineX, 10), 10), lilTunnelPete.y, null);
  }

  clampPlayerToField(allyHorse);
  clampPlayerToField(lilTunnelPete);
  clampPlayerToField(offenseP4);
}

function handleEasyPassCarrierAfterCatch(dt, carrier, rushing) {
  updatePlayerInput(dt);
  if (game.cpuOffense) {
    moveCpuOffenseCarrier(carrier, dt, carrier.y);
  }
  movePassRightCenterBlock(rushing, dt);
  moveDefenseTeamToward(carrier.x, carrier.y, dt);
  updateBallPosition();
  if (hasOffenseScored(carrier)) {
    finishDriveTouchdown(carrier);
    return true;
  }
  if (isEasyRunTackle(carrier)) {
    resolvePlayModeTackle(carrier, carrier.x);
    return true;
  }
  return false;
}

function updateEasyPassPlay(dt) {
  const { rushing } = getPassDefenders();

  if (updateShotgunCenterSnapPhase(dt, moveEasyPassReceivers)) {
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
      if (!game.cpuOffense) clampPlayerToField(player1);
      if (hasCrossedLineOfScrimmage(player1.x)) {
        markQbScramblePastLine();
      }
    }

    if (resolvePassPlayQbTackle(rushing)) {
      resolvePlayModeTackle(player1, player1.x, { sack: isPassPlayQbSack(rushing) });
      updateBallPosition();
      return;
    }
    if (resolveQbCarrierTouchdownIfNeeded()) return;

    moveEasyPassReceivers(dt);
    movePassRightCenterBlock(rushing, dt);
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

  if (ball.carrier === allyHorse && handleEasyPassCarrierAfterCatch(dt, allyHorse, rushing)) return;
  if (ball.carrier === lilTunnelPete && handleEasyPassCarrierAfterCatch(dt, lilTunnelPete, rushing)) return;
  if (ball.carrier === offenseP4 && handleEasyPassCarrierAfterCatch(dt, offenseP4, rushing)) return;

  if (!ball.carrier && !ball.inFlight) {
    movePassDefenders(dt, ball);
    updateBallPosition();
  }
}

function updateEasyStraightUp(dt) {
  const runLaneY = getEasyStraightUpRunLaneY();

  if (!ball.carrier && !ball.inFlight) {
    moveEasyRunDefenders(dt, null);
    updateBallPosition();
    return;
  }

  if (game.playModePhase === "handoff") {
    const motionX = clampPlayableX(getOffsetX(game.playModeLineX, -4), offenseP4.radius + 4);
    moveToward(offenseP4, motionX, runLaneY, offenseP4.speed * 0.95, dt);
    clampPlayerToField(offenseP4);
    moveEasyStraightUpCenterBlock(dt);
    moveEasyStraightUpLeadBlock(dt);

    if (game.cpuOffense) {
      moveToward(player1, offenseP4.x, offenseP4.y, player1.speed, dt);
      clampPlayerToField(player1);
    } else {
      moveToward(player1, offenseP4.x, offenseP4.y, player1.speed * 0.9, dt);
      clampPlayerToField(player1);
    }

    moveEasyRunDefenders(dt, offenseP4);
    updateBallPosition();

    if (isEasyRunTackle(player1)) {
      resolvePlayModeTackle(player1, player1.x);
      return;
    }
    const meshPad = player1.radius + offenseP4.radius + 18;
    if (
      ball.carrier === player1 &&
      (circleTouch(player1, offenseP4) || distance(player1.x, player1.y, offenseP4.x, offenseP4.y) <= meshPad)
    ) {
      ball.carrier = offenseP4;
      game.playModePhase = "run";
      markRunAttemptStarted();
      offenseP4.x += getOffenseDirection() * offenseP4.speed * dt * 0.35;
      updateBallPosition();
    }
    return;
  }

  if (game.playModePhase === "run" && ball.carrier === offenseP4) {
    updatePlayerInput(dt);
    if (game.cpuOffense) {
      moveCpuOffenseCarrier(offenseP4, dt, runLaneY);
    } else {
      clampPlayerToField(offenseP4);
    }
    moveEasyStraightUpCenterBlock(dt);
    moveEasyStraightUpLeadBlock(dt);
    moveQuarterbackRunBlock(offenseP4, dt);
    moveEasyRunDefenders(dt, offenseP4);
    updateBallPosition();
    if (hasOffenseScored(offenseP4)) {
      finishDriveTouchdown(offenseP4);
      return;
    }
    if (isEasyRunTackle(offenseP4)) {
      resolvePlayModeTackle(offenseP4, offenseP4.x);
    }
  }
}

function updateEasyQbKeep(dt) {
  if (!ball.carrier && !ball.inFlight) {
    moveEasyRunDefenders(dt, null);
    updateBallPosition();
    return;
  }

  updatePlayerInput(dt);
  if (game.cpuOffense) {
    moveCpuOffenseCarrier(player1, dt, player1.y);
  } else {
    clampPlayerToField(player1);
  }
  moveEasyQbKeepLeadBlock(dt);
  moveEasyStraightUpCenterBlock(dt);
  moveEasyRunDefenders(dt, player1);
  updateBallPosition();

  if (hasOffenseScored(player1)) {
    finishDriveTouchdown(player1);
    return;
  }
  if (isEasyRunTackle(player1)) {
    resolvePlayModeTackle(player1, player1.x);
  }
}

function updateEasyPlayMode(dt) {
  if (game.playModeCurrentPlay === "straightUp") {
    updateEasyStraightUp(dt);
    return;
  }
  if (game.playModeCurrentPlay === "qbKeep") {
    updateEasyQbKeep(dt);
    return;
  }
  updateEasyPassPlay(dt);
}
