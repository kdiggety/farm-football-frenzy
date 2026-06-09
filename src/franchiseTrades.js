// =========================================================
// Franchise trades — players & draft picks
// =========================================================

function getTradePlayerValue(entry, slotKey) {
  if (!entry) return 70;
  const attrs = getRosterEntryAttributes(entry, slotKey);
  const defAttrs = getRosterEntryDefAttributes(entry, slotKey);
  return Math.round((getPlayerOffOvr(attrs, slotKey) + getPlayerDefOvr(defAttrs, slotKey)) / 2);
}

function getTradePickValue(pick) {
  if (!pick) return 50;
  const roundBoost = pick.round === 1 ? 28 : pick.round === 2 ? 14 : 6;
  return 58 + roundBoost;
}

function getTeamOwnedPicks(franchise, teamId) {
  const team = franchise.teams[teamId];
  if (!team || !team.draftPicks) return [];
  return team.draftPicks.filter((p) => p.ownerId === teamId);
}

function swapFranchisePlayers(franchise, teamA, slotA, teamB, slotB) {
  const a = franchise.teams[teamA];
  const b = franchise.teams[teamB];
  if (!a || !b || !a.roster[slotA] || !b.roster[slotB]) return false;
  const tmp = { ...a.roster[slotA] };
  const receivedName = b.roster[slotB].displayLabel;
  a.roster[slotA] = { ...b.roster[slotB] };
  b.roster[slotB] = tmp;
  franchise.transactionLog.unshift({
    type: "trade",
    season: franchise.season,
    week: franchise.week,
    from: teamA,
    to: teamB,
    sent: tmp.displayLabel,
    received: receivedName
  });
  saveFranchise(franchise);
  syncFranchiseRostersToTeams(franchise);
  return true;
}

function swapFranchiseDraftPicks(franchise, teamA, pickIdA, teamB, pickIdB) {
  const picksA = getTeamOwnedPicks(franchise, teamA);
  const picksB = getTeamOwnedPicks(franchise, teamB);
  const pickA = picksA.find((p) => p.id === pickIdA);
  const pickB = picksB.find((p) => p.id === pickIdB);
  if (!pickA || !pickB) return false;
  pickA.ownerId = teamB;
  pickB.ownerId = teamA;
  franchise.transactionLog.unshift({
    type: "trade",
    season: franchise.season,
    week: franchise.week,
    from: teamA,
    to: teamB,
    sent: `Round ${pickA.round} pick`,
    received: `Round ${pickB.round} pick`
  });
  saveFranchise(franchise);
  return true;
}

function getTradeAssetValue(franchise, teamId, asset) {
  if (!asset) return 0;
  if (asset.type === "pick") {
    const pick = getTeamOwnedPicks(franchise, teamId).find((p) => p.id === asset.pickId);
    return getTradePickValue(pick);
  }
  const team = franchise.teams[teamId];
  if (!team || !asset.slot) return 0;
  return getTradePlayerValue(team.roster[asset.slot], asset.slot);
}

function evaluateTradeForCpu(cpuTeamId, userGives, userGets, franchise) {
  const giveVal = getTradeAssetValue(franchise, franchise.userTeamId, userGives);
  const getVal = getTradeAssetValue(franchise, cpuTeamId, userGets);
  return giveVal - getVal;
}

function executeFranchiseTrade(franchise, cpuTeamId, userGives, userGets) {
  if (userGives.type === "pick" && userGets.type === "pick") {
    return swapFranchiseDraftPicks(
      franchise,
      franchise.userTeamId,
      userGives.pickId,
      cpuTeamId,
      userGets.pickId
    );
  }
  if (userGives.type === "player" && userGets.type === "player") {
    return swapFranchisePlayers(
      franchise,
      franchise.userTeamId,
      userGives.slot,
      cpuTeamId,
      userGets.slot
    );
  }
  return false;
}

function proposeFranchiseTrade(franchise, cpuTeamId, userGives, userGets) {
  if (!userGives || !userGets) return false;
  const delta = evaluateTradeForCpu(cpuTeamId, userGives, userGets, franchise);
  const accept = delta >= -4 && Math.random() < 0.32 + Math.min(0.48, delta / 18);
  if (!accept) {
    franchise.hubMessage = `${TEAMS[cpuTeamId].name} declined the trade.`;
    return false;
  }
  const ok = executeFranchiseTrade(franchise, cpuTeamId, userGives, userGets);
  if (ok) franchise.hubMessage = "Trade completed!";
  return ok;
}

function runCpuFranchiseTrade(franchise) {
  if (Math.random() > 0.12) return;
  const ids = PLAY_TEAM_IDS.filter((id) => id !== franchise.userTeamId);
  const a = ids[Math.floor(Math.random() * ids.length)];
  let b = ids[Math.floor(Math.random() * ids.length)];
  if (a === b) b = ids[(ids.indexOf(a) + 1) % ids.length];
  if (Math.random() < 0.25) {
    const picksA = getTeamOwnedPicks(franchise, a);
    const picksB = getTeamOwnedPicks(franchise, b);
    if (picksA.length && picksB.length) {
      swapFranchiseDraftPicks(franchise, a, picksA[0].id, b, picksB[0].id);
      return;
    }
  }
  const slots = ROSTER_SLOT_KEYS;
  const slotA = slots[Math.floor(Math.random() * slots.length)];
  const slotB = slots[Math.floor(Math.random() * slots.length)];
  if (franchise.teams[a].roster[slotA] && franchise.teams[b].roster[slotB]) {
    swapFranchisePlayers(franchise, a, slotA, b, slotB);
  }
}

function getFranchiseTradeLayout() {
  const cx = canvas.width / 2;
  return {
    back: { x: 20, y: 14, w: 100, h: 30 },
    propose: { x: cx - 80, y: 470, w: 160, h: 36 },
    teamList: { x: 20, y: 108, w: 180, h: 300 },
    userCol: { x: 220, y: 200, w: 340, h: 250 },
    cpuCol: { x: 580, y: 200, w: 340, h: 250 }
  };
}

function formatTradePickLabel(pick) {
  return `R${pick.round} (${TEAMS[pick.originalTeamId].shortName || pick.originalTeamId})`;
}
