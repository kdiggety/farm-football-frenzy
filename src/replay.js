// =========================================================
// Instant replay — record play mode frames, playback with zoom / pause
// =========================================================
const REPLAY_FRAME_MS = 1000 / 60;
const REPLAY_MAX_FRAMES = 2800;
const REPLAY_ZOOM_MIN = 0.65;
const REPLAY_ZOOM_MAX = 2.25;
const REPLAY_ZOOM_STEP = 0.18;

const ENTITY_BY_ID = {
  player1,
  player2,
  allyHorse,
  allyDonkey,
  cluckNorris,
  lilTunnelPete
};

let replayBuffer = [];
let replayRecordingActive = false;

/** Start recording when the ball is snapped (after cadence). */
function replayStartRecording() {
  if (game.mode !== "play") return;
  replayBuffer = [];
  replayRecordingActive = true;
}

function captureReplaySnapshot() {
  const carrier = ball.carrier;
  const carrierId = carrier && carrier.id ? carrier.id : null;
  return {
    player1: { x: player1.x, y: player1.y },
    player2: { x: player2.x, y: player2.y },
    allyHorse: { x: allyHorse.x, y: allyHorse.y },
    allyDonkey: { x: allyDonkey.x, y: allyDonkey.y },
    cluckNorris: { x: cluckNorris.x, y: cluckNorris.y },
    lilTunnelPete: { x: lilTunnelPete.x, y: lilTunnelPete.y },
    ball: {
      x: ball.x,
      y: ball.y,
      inFlight: ball.inFlight,
      arcHeight: ball.arcHeight,
      startX: ball.startX,
      startY: ball.startY,
      targetX: ball.targetX,
      targetY: ball.targetY,
      flightElapsedMs: ball.flightElapsedMs,
      flightDurationMs: ball.flightDurationMs,
      flightArcPeak: ball.flightArcPeak,
      carrierId,
      failedInterceptorIds: ball.failedInterceptorIds ? ball.failedInterceptorIds.slice() : []
    },
    playModeLineX: game.playModeLineX,
    playModePhase: game.playModePhase,
    playModeCurrentPlay: game.playModeCurrentPlay,
    playModeSweepHandoffT: game.playModeSweepHandoffT,
    passPlayTargetReceiver: game.passPlayTargetReceiver,
    passPlayDropbackDone: game.passPlayDropbackDone,
    passPlayCanThrow: game.passPlayCanThrow,
    mouseX: game.mouseX,
    mouseY: game.mouseY,
    defenseModeControlledPlayerId: game.defenseModeControlledPlayerId
  };
}

let replayStateBackup = null;

function backupFieldStateForReplay() {
  return captureReplaySnapshot();
}

function applyReplaySnapshot(snap) {
  if (!snap) return;
  player1.x = snap.player1.x;
  player1.y = snap.player1.y;
  player2.x = snap.player2.x;
  player2.y = snap.player2.y;
  allyHorse.x = snap.allyHorse.x;
  allyHorse.y = snap.allyHorse.y;
  allyDonkey.x = snap.allyDonkey.x;
  allyDonkey.y = snap.allyDonkey.y;
  cluckNorris.x = snap.cluckNorris.x;
  cluckNorris.y = snap.cluckNorris.y;
  lilTunnelPete.x = snap.lilTunnelPete.x;
  lilTunnelPete.y = snap.lilTunnelPete.y;

  const b = snap.ball;
  ball.x = b.x;
  ball.y = b.y;
  ball.inFlight = b.inFlight;
  ball.arcHeight = b.arcHeight;
  ball.startX = b.startX;
  ball.startY = b.startY;
  ball.targetX = b.targetX;
  ball.targetY = b.targetY;
  ball.flightElapsedMs = b.flightElapsedMs;
  ball.flightDurationMs = b.flightDurationMs;
  ball.flightArcPeak = b.flightArcPeak;
  ball.carrier = b.carrierId ? ENTITY_BY_ID[b.carrierId] : null;
  ball.failedInterceptorIds = b.failedInterceptorIds ? b.failedInterceptorIds.slice() : [];

  game.playModeLineX = snap.playModeLineX;
  game.playModePhase = snap.playModePhase;
  game.playModeCurrentPlay = snap.playModeCurrentPlay;
  game.playModeSweepHandoffT = snap.playModeSweepHandoffT;
  game.passPlayTargetReceiver = snap.passPlayTargetReceiver;
  game.passPlayDropbackDone = snap.passPlayDropbackDone;
  game.passPlayCanThrow = snap.passPlayCanThrow;
  game.mouseX = snap.mouseX;
  game.mouseY = snap.mouseY;
  if (snap.defenseModeControlledPlayerId !== undefined) {
    game.defenseModeControlledPlayerId = snap.defenseModeControlledPlayerId;
  }
}

function replayPushSnapshot() {
  if (!replayRecordingActive) return;
  if (game.state !== "playing") return;
  replayBuffer.push(captureReplaySnapshot());
  if (replayBuffer.length > REPLAY_MAX_FRAMES) {
    replayBuffer.shift();
  }
}

/** Call when a play ends: push final frame and save to lastPlay for pause-menu replay. */
function replayFinalizePlayBuffer() {
  if (!replayRecordingActive && replayBuffer.length === 0) return;
  if (replayRecordingActive) {
    replayBuffer.push(captureReplaySnapshot());
  }
  if (replayBuffer.length > 0) {
    game.lastPlayReplayFrames = replayBuffer.slice();
  }
  replayBuffer = [];
  replayRecordingActive = false;
}

function replayHasLastPlay() {
  return game.lastPlayReplayFrames && game.lastPlayReplayFrames.length > 0;
}

function getReplayDurationMs() {
  const n = game.replayFrames ? game.replayFrames.length : 0;
  return n * REPLAY_FRAME_MS;
}

function beginInstantReplay(options) {
  const { kind, onComplete } = options;
  if (!replayHasLastPlay()) {
    if (typeof onComplete === "function") onComplete();
    return;
  }
  game.replayFrames = game.lastPlayReplayFrames;
  game.replayTimeMs = 0;
  game.replayPaused = false;
  game.replayZoom = 1;
  game.replaySpeed = 1;
  game.instantReplayKind = kind;
  game.instantReplayOnComplete = onComplete;
  game.state = "instantReplay";
}

function finishInstantReplay() {
  const cb = game.instantReplayOnComplete;
  game.replayFrames = null;
  game.replayTimeMs = 0;
  game.instantReplayOnComplete = null;
  game.instantReplayKind = null;
  if (typeof cb === "function") cb();
}

function openReplayFromPauseMenu() {
  if (!replayHasLastPlay()) return;
  beginInstantReplay({
    kind: "manual",
    onComplete: () => {
      game.state = "pauseMenu";
    }
  });
}

function skipInstantReplay() {
  finishInstantReplay();
}

function updateInstantReplay(dt) {
  if (game.state !== "instantReplay" || !game.replayFrames || game.replayFrames.length === 0) {
    return;
  }
  if (game.replayPaused) return;
  game.replayTimeMs += dt * 1000 * (game.replaySpeed || 1);
  const dur = getReplayDurationMs();
  if (game.replayTimeMs >= dur) {
    game.replayTimeMs = dur;
    finishInstantReplay();
  }
}

function getReplayFrameIndex() {
  if (!game.replayFrames || game.replayFrames.length === 0) return 0;
  let idx = Math.floor(game.replayTimeMs / REPLAY_FRAME_MS);
  if (idx >= game.replayFrames.length) idx = game.replayFrames.length - 1;
  if (idx < 0) idx = 0;
  return idx;
}

function replayAdjustZoom(delta) {
  const z = game.replayZoom + delta;
  game.replayZoom = Math.max(REPLAY_ZOOM_MIN, Math.min(REPLAY_ZOOM_MAX, z));
}

const REPLAY_REWIND_MS = 2500;

/** Jump back in the replay timeline (clamped to start). */
function rewindInstantReplay() {
  if (game.state !== "instantReplay" || !game.replayFrames || game.replayFrames.length === 0) {
    return;
  }
  game.replayTimeMs = Math.max(0, game.replayTimeMs - REPLAY_REWIND_MS);
}
