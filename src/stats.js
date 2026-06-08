// =========================================================
// Whole-game stats tracking
// =========================================================

function createEmptyReceiverStats() {
  return {
    horse: { label: "WR", rec: 0, yards: 0, td: 0 },
    pete: { label: "WR", rec: 0, yards: 0, td: 0 },
    p4: { label: "RB", rec: 0, yards: 0, td: 0 }
  };
}

function createEmptyTeamStats() {
  return {
    passing: { att: 0, comp: 0, yards: 0, td: 0, int: 0, sacks: 0 },
    receiving: createEmptyReceiverStats(),
    rushing: { att: 0, yards: 0, td: 0 },
    defense: { tackles: 0, sacks: 0, int: 0, tfl: 0 }
  };
}

function shouldTrackGameStats() {
  return typeof playSessionUsesGameClock === "function" && playSessionUsesGameClock();
}

function resetGameStats() {
  game.teamStats = {
    user: createEmptyTeamStats(),
    cpu: createEmptyTeamStats()
  };
  game.passAttemptPending = false;
  game.runAttemptPending = false;
  game.pendingPassTarget = null;
}

function getStatsSideKeyForTeamId(teamId) {
  if (!teamId || !game.playUserTeamId) return null;
  return teamId === game.playUserTeamId ? "user" : "cpu";
}

function getOffenseStatsSideKey() {
  const teamId = game.cpuOffense ? game.playCpuTeamId : game.playUserTeamId;
  return getStatsSideKeyForTeamId(teamId);
}

function getDefenseStatsSideKey() {
  const teamId = game.cpuOffense ? game.playUserTeamId : game.playCpuTeamId;
  return getStatsSideKeyForTeamId(teamId);
}

function isPassPlayKey(playKey) {
  return !!playKey && PASS_PLAY_KEYS.has(playKey);
}

function isRunPlayKey(playKey) {
  return !!playKey && RUN_PLAY_KEYS.has(playKey);
}

function getPassCompletionTargetKey() {
  if (game.pendingPassTarget) return game.pendingPassTarget;
  if (game.passPlayTargetReceiver === "horse") return "horse";
  if (game.passPlayTargetReceiver === "pete") return "pete";
  if (game.passPlayTargetReceiver === "p4") return "p4";
  return "horse";
}

function markPassAttemptStarted(targetKey) {
  if (!shouldTrackGameStats()) return;
  game.passAttemptPending = true;
  game.runAttemptPending = false;
  game.pendingPassTarget = targetKey || getPassCompletionTargetKey();
}

function markRunAttemptStarted() {
  if (!shouldTrackGameStats()) return;
  game.runAttemptPending = true;
  game.passAttemptPending = false;
  game.pendingPassTarget = null;
}

function getPassCompPct(stats) {
  if (!stats || !stats.passing.att) return 0;
  return (stats.passing.comp / stats.passing.att) * 100;
}

function recordTouchdownStats(scorer, playKey) {
  if (!shouldTrackGameStats() || !game.teamStats) return;
  const offKey = getOffenseStatsSideKey();
  if (!offKey) return;
  const off = game.teamStats[offKey];
  const yards = Math.max(0, getPlayModeYardsGained(scorer.x));

  if (isPassPlayKey(playKey)) {
    if (game.passAttemptPending) {
      off.passing.att += 1;
      off.passing.comp += 1;
      off.passing.yards += yards;
      const target = getPassCompletionTargetKey();
      if (off.receiving[target]) {
        off.receiving[target].rec += 1;
        off.receiving[target].yards += yards;
      }
      game.passAttemptPending = false;
      game.pendingPassTarget = null;
    }
    off.passing.td += 1;
    const target = getPassCompletionTargetKey();
    if (off.receiving[target]) off.receiving[target].td += 1;
    return;
  }

  if (isRunPlayKey(playKey)) {
    if (game.runAttemptPending || !game.passAttemptPending) {
      off.rushing.att += 1;
      off.rushing.yards += yards;
      game.runAttemptPending = false;
    }
    off.rushing.td += 1;
  }
}

function recordPlayDownStats(resultType, yards, playKey) {
  if (!shouldTrackGameStats() || !game.teamStats || !playKey || playKey === "punt") return;

  const offKey = getOffenseStatsSideKey();
  const defKey = getDefenseStatsSideKey();
  if (!offKey || !defKey) return;

  const off = game.teamStats[offKey];
  const def = game.teamStats[defKey];
  const passPlay = isPassPlayKey(playKey);
  const runPlay = isRunPlayKey(playKey);

  if (passPlay || game.passAttemptPending) {
    off.passing.att += 1;
    if (resultType === "incomplete") {
      // attempt only
    } else if (resultType === "interception") {
      off.passing.int += 1;
      def.defense.int += 1;
      def.defense.tackles += 1;
    } else if (resultType === "sack") {
      off.passing.sacks += 1;
      def.defense.sacks += 1;
      def.defense.tackles += 1;
      if (yards < 0) def.defense.tfl += 1;
    } else {
      off.passing.comp += 1;
      off.passing.yards += Math.max(0, yards);
      const target = getPassCompletionTargetKey();
      if (off.receiving[target]) {
        off.receiving[target].rec += 1;
        off.receiving[target].yards += Math.max(0, yards);
      }
      def.defense.tackles += 1;
      if (yards <= 0) def.defense.tfl += 1;
    }
    game.passAttemptPending = false;
    game.pendingPassTarget = null;
    return;
  }

  if (runPlay || game.runAttemptPending || (!passPlay && resultType !== "interception")) {
    off.rushing.att += 1;
    off.rushing.yards += yards;
    def.defense.tackles += 1;
    if (yards < 0) def.defense.tfl += 1;
    game.runAttemptPending = false;
  }
}

function getTeamDisplayNameForStats(sideKey) {
  if (sideKey === "user") {
    return game.playUserTeamId && TEAMS[game.playUserTeamId]
      ? TEAMS[game.playUserTeamId].name
      : "You";
  }
  return game.playCpuTeamId && TEAMS[game.playCpuTeamId]
    ? TEAMS[game.playCpuTeamId].name
    : "CPU";
}

function getReceiverDisplayName(sideKey, targetKey) {
  const stats = game.teamStats && game.teamStats[sideKey];
  const slot = stats && stats.receiving[targetKey];
  if (!slot) return targetKey;
  if (sideKey === "user" && game.playUserTeamId && TEAMS[game.playUserTeamId]) {
    const roster = TEAMS[game.playUserTeamId].roster;
    if (targetKey === "horse" && roster.wr) return roster.wr.displayLabel;
    if (targetKey === "pete" && roster.flex) return roster.flex.displayLabel;
    if (targetKey === "p4" && roster.p4) return roster.p4.displayLabel;
  }
  if (sideKey === "cpu" && game.playCpuTeamId && TEAMS[game.playCpuTeamId]) {
    const roster = TEAMS[game.playCpuTeamId].roster;
    if (targetKey === "horse" && roster.wr) return roster.wr.displayLabel;
    if (targetKey === "pete" && roster.flex) return roster.flex.displayLabel;
    if (targetKey === "p4" && roster.p4) return roster.p4.displayLabel;
  }
  return slot.label;
}
