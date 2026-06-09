// =========================================================
// Franchise free agency
// =========================================================

function generateFreeAgentPool(franchise) {
  const pool = [];
  for (let i = 0; i < 14; i += 1) {
    pool.push(generateDraftProspect(1000 + i));
  }
  return pool;
}

function signFreeAgent(franchise, prospectId, slotKey, teamId) {
  const tid = teamId || franchise.userTeamId;
  const team = franchise.teams[tid];
  if (!team) return false;
  const idx = franchise.freeAgents.findIndex((p) => p.prospectId === prospectId);
  if (idx < 0) return false;
  const prospect = franchise.freeAgents.splice(idx, 1)[0];
  assignProspectToTeam(franchise, tid, prospect, slotKey);
  franchise.transactionLog.unshift({
    type: "signing",
    season: franchise.season,
    teamId: tid,
    player: prospect.displayLabel,
    slot: slotKey
  });
  saveFranchise(franchise);
  syncFranchiseRostersToTeams(franchise);
  return true;
}

function autoCpuFreeAgencySigns(franchise) {
  for (const id of PLAY_TEAM_IDS) {
    if (id === franchise.userTeamId) continue;
    if (Math.random() > 0.55) continue;
    if (!franchise.freeAgents.length) break;
    const prospect = franchise.freeAgents.shift();
    const slot = pickCpuRosterSlot(franchise.teams[id].roster, prospect.slotHint);
    assignProspectToTeam(franchise, id, prospect, slot);
  }
  saveFranchise(franchise);
}

function finishFreeAgency(franchise) {
  autoCpuFreeAgencySigns(franchise);
  startNewFranchiseSeason(franchise);
  saveFranchise(franchise);
  franchise.hubMessage = `Season ${franchise.season} begins!`;
}

function getFranchiseFreeAgencyLayout() {
  const cx = canvas.width / 2;
  return {
    back: { x: 20, y: 14, w: 100, h: 30 },
    finish: { x: cx - 90, y: 470, w: 180, h: 36 },
    prev: { x: 40, y: 470, w: 72, h: 30 },
    next: { x: 120, y: 470, w: 72, h: 30 },
    slotQb: { x: cx - 220, y: 420, w: 72, h: 30 },
    slotWr: { x: cx - 140, y: 420, w: 72, h: 30 },
    slotFlex: { x: cx - 60, y: 420, w: 72, h: 30 },
    slotP4: { x: cx + 20, y: 420, w: 72, h: 30 },
    slotP5: { x: cx + 100, y: 420, w: 72, h: 30 },
    slotBench: { x: cx - 60, y: 460, w: 120, h: 30 },
    list: { x: 24, y: 100, w: canvas.width - 48, h: 300 }
  };
}
