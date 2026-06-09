// =========================================================
// Franchise draft — prospects & snake draft
// =========================================================

const DRAFT_FIRST_NAMES = [
  "Rusty", "Clover", "Dusty", "Pepper", "Marble", "Sprocket", "Tater", "Midge",
  "Rascal", "Sprout", "Grit", "Niblet", "Cob", "Pippin", "Stitch", "Barley"
];

const DRAFT_LAST_NAMES = [
  "McHeehaw", "O'Trotter", "Fieldsworth", "Barnwell", "Haystack", "Mudrick",
  "Creekmore", "Woolsey", "Featherby", "Tractor", "Siloman", "Puddle"
];

const DRAFT_APPEARANCES = ["squadA", "squadB"];

function randomDraftName() {
  const f = DRAFT_FIRST_NAMES[Math.floor(Math.random() * DRAFT_FIRST_NAMES.length)];
  const l = DRAFT_LAST_NAMES[Math.floor(Math.random() * DRAFT_LAST_NAMES.length)];
  return `${f} ${l}`;
}

function randomDraftColor() {
  const hues = ["#64748b", "#84cc16", "#4c1d95", "#0f766e", "#c026d3", "#713f12", "#1e1b4b"];
  return hues[Math.floor(Math.random() * hues.length)];
}

function generateDraftProspect(seed) {
  const slotPool = ROSTER_STARTER_KEYS.concat(ROSTER_BENCH_KEYS);
  const slot = slotPool[Math.floor(Math.random() * slotPool.length)];
  const attrs = {};
  const base = 0.72 + Math.random() * 0.52;
  for (const k of ATTRIBUTE_KEYS) attrs[k] = base + (Math.random() - 0.5) * 0.22;
  const defAttrs = {};
  for (const k of DEF_ATTRIBUTE_KEYS) defAttrs[k] = base + (Math.random() - 0.5) * 0.22;
  const entry = {
    prospectId: `p-${seed}-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    displayLabel: randomDraftName(),
    appearanceId: DRAFT_APPEARANCES[Math.floor(Math.random() * DRAFT_APPEARANCES.length)],
    color: randomDraftColor(),
    ballAccent: "#fde68a",
    attrs,
    defAttrs,
    slotHint: slot
  };
  const offOvr = getPlayerOffOvr(attrs, slot);
  const defOvr = getPlayerDefOvr(defAttrs, slot);
  entry.projectedOvr = Math.round((offOvr + defOvr) / 2);
  entry.devTrait = offOvr >= 93 ? "superstar" : offOvr >= 87 ? "star" : offOvr >= 80 ? "normal" : "slow";
  if (Math.random() < 0.08) entry.devTrait = "superstar";
  return entry;
}

function generateDraftPool(franchise) {
  const pool = [];
  const count = PLAY_TEAM_IDS.length * FRANCHISE_DRAFT_ROUNDS + 4;
  for (let i = 0; i < count; i += 1) {
    pool.push(generateDraftProspect(i));
  }
  return pool.sort((a, b) => b.projectedOvr - a.projectedOvr);
}

function getSnakeDraftTeamForPick(franchise, pickIndex) {
  const order = franchise.draftOrder || PLAY_TEAM_IDS;
  const round = Math.floor(pickIndex / order.length);
  const pos = pickIndex % order.length;
  if (round % 2 === 0) return order[pos];
  return order[order.length - 1 - pos];
}

function getCurrentDraftPick(franchise) {
  if (!franchise || franchise.phase !== "draft") return null;
  const order = franchise.draftOrder || [];
  const total = order.length * FRANCHISE_DRAFT_ROUNDS;
  const idx = franchise.draftPickIndex || 0;
  if (idx >= total) return null;
  return {
    index: idx,
    teamId: getSnakeDraftTeamForPick(franchise, idx),
    round: Math.floor(idx / order.length) + 1
  };
}

function assignProspectToTeam(franchise, teamId, prospect, slotKey) {
  const team = franchise.teams[teamId];
  if (!team || !prospect) return false;
  const slot = slotKey || pickCpuRosterSlot(team.roster, prospect.slotHint);
  if (!slot) return false;
  const entry = {
    displayLabel: prospect.displayLabel,
    appearanceId: prospect.appearanceId,
    color: prospect.color,
    ballAccent: prospect.ballAccent,
    devTrait: prospect.devTrait,
    attrs: { ...prospect.attrs },
    defAttrs: { ...prospect.defAttrs }
  };
  if (typeof resolveRosterAbilityId === "function") {
    entry.ability = resolveRosterAbilityId(entry, slot);
  }
  team.roster[slot] = entry;
  franchise.transactionLog.unshift({
    type: "draft",
    season: franchise.season,
    teamId,
    player: prospect.displayLabel,
    slot,
    ovr: prospect.projectedOvr
  });
  return true;
}

function executeDraftPick(franchise, prospectId, slotKey) {
  const pick = getCurrentDraftPick(franchise);
  if (!pick) return false;
  const idx = franchise.draftPool.findIndex((p) => p.prospectId === prospectId);
  if (idx < 0) return false;
  const prospect = franchise.draftPool.splice(idx, 1)[0];
  assignProspectToTeam(franchise, pick.teamId, prospect, slotKey);
  franchise.draftHistory.push({
    pick: pick.index + 1,
    teamId: pick.teamId,
    player: prospect.displayLabel,
    ovr: prospect.projectedOvr,
    slot: slotKey || prospect.slotHint
  });
  franchise.draftPickIndex = (franchise.draftPickIndex || 0) + 1;
  const order = franchise.draftOrder || [];
  if (franchise.draftPickIndex >= order.length * FRANCHISE_DRAFT_ROUNDS) {
    beginFranchiseFreeAgency(franchise);
  } else if (pick.teamId !== franchise.userTeamId) {
    autoCpuDraftPick(franchise);
  }
  saveFranchise(franchise);
  syncFranchiseRostersToTeams(franchise);
  return true;
}

function autoCpuDraftPick(franchise) {
  let guard = 0;
  while (guard < 40) {
    const pick = getCurrentDraftPick(franchise);
    if (!pick || pick.teamId === franchise.userTeamId) break;
    const prospect = franchise.draftPool[0];
    if (!prospect) break;
    assignProspectToTeam(franchise, pick.teamId, prospect, pickCpuRosterSlot(franchise.teams[pick.teamId].roster, prospect.slotHint));
    franchise.draftHistory.push({
      pick: pick.index + 1,
      teamId: pick.teamId,
      player: prospect.displayLabel,
      ovr: prospect.projectedOvr,
      slot: prospect.slotHint
    });
    franchise.draftPool.shift();
    franchise.draftPickIndex = (franchise.draftPickIndex || 0) + 1;
    const order = franchise.draftOrder || [];
    if (franchise.draftPickIndex >= order.length * FRANCHISE_DRAFT_ROUNDS) {
      beginFranchiseFreeAgency(franchise);
      break;
    }
    guard += 1;
  }
  saveFranchise(franchise);
}

function getFranchiseDraftLayout() {
  const cx = canvas.width / 2;
  return {
    back: { x: 20, y: 14, w: 100, h: 30 },
    slotQb: { x: cx - 220, y: 460, w: 72, h: 30 },
    slotWr: { x: cx - 140, y: 460, w: 72, h: 30 },
    slotFlex: { x: cx - 60, y: 460, w: 72, h: 30 },
    slotP4: { x: cx + 20, y: 460, w: 72, h: 30 },
    slotP5: { x: cx + 100, y: 460, w: 72, h: 30 },
    slotBench: { x: cx - 60, y: 500, w: 120, h: 30 },
    simCpu: { x: cx + 200, y: 460, w: 120, h: 30 },
    list: { x: 24, y: 120, w: canvas.width - 48, h: 320 }
  };
}
