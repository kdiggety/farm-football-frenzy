// =========================================================
// Development traits — tiers + per-player signature abilities
// =========================================================

const DEV_TRAIT_ORDER = ["superstar", "star", "normal", "slow"];

const DEV_TRAIT_DEFS = {
  superstar: {
    id: "superstar",
    label: "Superstar",
    shortLabel: "SS",
    badge: "★",
    color: "#fbbf24",
    blurb: "Elite ceiling — each superstar has their own signature ability."
  },
  star: {
    id: "star",
    label: "Star",
    shortLabel: "Star",
    badge: "✦",
    color: "#a78bfa",
    blurb: "High-impact starters with unique matchup-breaking skills."
  },
  normal: {
    id: "normal",
    label: "Normal",
    shortLabel: "Norm",
    badge: "●",
    color: "#94a3b8",
    blurb: "Reliable role players — steady bonuses tied to their job."
  },
  slow: {
    id: "slow",
    label: "Slow",
    shortLabel: "Slow",
    badge: "▽",
    color: "#78716c",
    blurb: "Late bloomers — abilities that ramp up during the drive."
  }
};

/** Unique signature ability per player — keyed by ability id. */
const DEV_ABILITIES = {
  nightFlight: {
    id: "nightFlight",
    name: "Night Flight",
    offDesc: "Glides after a catch or handoff with a silent speed burst",
    defDesc: "Hawks route breaks — faster recovery in coverage",
    kind: "possessionBurst",
    burstMs: 2200,
    burstSpeed: 1.08,
    coverageMult: 1.1,
    awarenessMult: 1.08
  },
  bugJuiced: {
    id: "bugJuiced",
    name: "Bug Juiced",
    offDesc: "Tiny wiggle — slipperier after the catch in traffic",
    defDesc: "Pestering jam — stronger press at the line",
    kind: "separation",
    eluMult: 1.1,
    catchMult: 1.06,
    pressMult: 1.12
  },
  nevermore: {
    id: "nevermore",
    name: "Nevermore",
    offDesc: "Sticks comeback routes — surer hands on short throws",
    defDesc: "Reads the QB — sharper awareness on passing downs",
    kind: "possessionHands",
    catchMult: 1.1,
    awarenessMult: 1.1,
    coverageMult: 1.06
  },
  swarmHit: {
    id: "swarmHit",
    name: "Swarm Hit",
    offDesc: "Scratch dash — slight speed bump after play 3",
    defDesc: "Gang tackle range — extra reach in pursuit",
    kind: "warmupReach",
    warmSpeed: 1.04,
    coldSpeed: 0.97,
    reachMult: 0.12
  },
  nestBlock: {
    id: "nestBlock",
    name: "Nest Block",
    offDesc: "Anchors the pocket — stronger pass protection",
    defDesc: "Nests on linemen — harder to shed on blocks",
    kind: "wall",
    powerMult: 1.14,
    strengthMult: 1.08,
    defStrengthMult: 1.08
  },
  ratRace: {
    id: "ratRace",
    name: "Rat Race",
    offDesc: "Darts away from pressure — scramble burst when rushed",
    defDesc: "Sniffs out runs — better awareness in the box",
    kind: "scramble",
    burstMs: 1800,
    burstSpeed: 1.06,
    awarenessMult: 1.1
  },
  fleeceShield: {
    id: "fleeceShield",
    name: "Fleece Shield",
    offDesc: "Soft hands — cushions contested catches",
    defDesc: "Wrap tackles — surer strength at the point of contact",
    kind: "possessionHands",
    catchMult: 1.08,
    defStrengthMult: 1.1
  },
  billyRam: {
    id: "billyRam",
    name: "Billy Ram",
    offDesc: "Lowered shoulder — trucks through arm tackles",
    defDesc: "Headbutt hits — longer tackle reach on contact",
    kind: "truck",
    eluMult: 1.12,
    strengthMult: 1.1,
    reachMult: 0.12
  },
  cloverLuck: {
    id: "cloverLuck",
    name: "Clover Luck",
    offDesc: "Cold start — finds lucky holes after play 3",
    defDesc: "Warms into the flow — coverage rises mid-drive",
    kind: "warmupDrive",
    warmMult: 1.09,
    coldMult: 0.95
  },
  brambleRun: {
    id: "brambleRun",
    name: "Bramble Run",
    offDesc: "Grinds through contact on inside runs",
    defDesc: "Thorny run fits — extra strength in the box",
    kind: "steady",
    statMult: 1.07
  },
  goldenHooves: {
    id: "goldenHooves",
    name: "Golden Hooves",
    offDesc: "Legendary burst after a handoff or reception",
    defDesc: "Chases with donkey stamina — coverage and reach",
    kind: "possessionBurst",
    burstMs: 2400,
    burstSpeed: 1.09,
    coverageMult: 1.1,
    awarenessMult: 1.08,
    reachMult: 0.1
  },
  openPasture: {
    id: "openPasture",
    name: "Open Pasture",
    offDesc: "Stretches the field — extra speed on go routes",
    defDesc: "Sideline horse-collar range on pursuit",
    kind: "deepSpeed",
    speedMult: 1.05,
    reachMult: 0.1,
    clutchEluMult: 1.12
  },
  digDog: {
    id: "digDog",
    name: "Dig Dog",
    offDesc: "Tunnel power — wins interior run lanes",
    defDesc: "Plugs the middle — trench strength on run fits",
    kind: "power",
    powerMult: 1.12,
    strengthMult: 1.1,
    defStrengthMult: 1.1
  },
  royalGuard: {
    id: "royalGuard",
    name: "Royal Guard",
    offDesc: "Slow to engage — protects the pocket late in drives",
    defDesc: "Bodyguard mode after play 3 — press and power rise",
    kind: "warmupWall",
    warmMult: 1.1,
    coldMult: 0.94,
    powerMult: 1.08
  },
  dustCloud: {
    id: "dustCloud",
    name: "Dust Cloud",
    offDesc: "Kicks up dirt early — speed improves each play",
    defDesc: "Blindside cloud — awareness spikes after play 3",
    kind: "warmupDrive",
    warmMult: 1.08,
    coldMult: 0.96
  },
  xsAndOs: {
    id: "xsAndOs",
    name: "X's & O's",
    offDesc: "Chalkboard clutch — sharper throws on 3rd & 4th",
    defDesc: "Calls the front — better reads on money downs",
    kind: "clutchPass",
    clutchPassBonus: 0.12,
    clutchCoverageMult: 1.1
  },
  eeHawHit: {
    id: "eeHawHit",
    name: "Ee-Haw Hit",
    offDesc: "Reliable outlet — steady catch radius",
    defDesc: "Deputy press — jams and reroutes at the line",
    kind: "pressJam",
    pressMult: 1.12,
    catchMult: 1.05
  },
  coopCloser: {
    id: "coopCloser",
    name: "Coop Closer",
    offDesc: "Feather cuts — eludes first contact after the catch",
    defDesc: "Locks down routes — elite coverage and hawk reach",
    kind: "coverageHawk",
    eluMult: 1.08,
    coverageMult: 1.14,
    awarenessMult: 1.12,
    reachMult: 0.14
  },
  mudGrit: {
    id: "mudGrit",
    name: "Mud Grit",
    offDesc: "Mudder legs — stronger as the drive gets sloppy",
    defDesc: "Gritty tackles — reach improves after play 3",
    kind: "warmupReach",
    warmSpeed: 1.03,
    coldSpeed: 0.96,
    reachMult: 0.1
  },
  slinkCuts: {
    id: "slinkCuts",
    name: "Slink Cuts",
    offDesc: "Sneaky cuts — harder to bring down on routes",
    defDesc: "Slippery in space — coverage closes faster on breaks",
    kind: "routeCuts",
    eluMult: 1.08,
    coverageMult: 1.06
  },
  riverCharge: {
    id: "riverCharge",
    name: "River Charge",
    offDesc: "Short-yardage bulldozer on 3rd & 4th",
    defDesc: "Digs in on money downs — surer tackles",
    kind: "clutchPower",
    clutchEluMult: 1.14,
    clutchReachMult: 0.12,
    clutchPassBonus: 0.04
  },
  cowbellCurl: {
    id: "cowbellCurl",
    name: "Cowbell Curl",
    offDesc: "Possession curls — reliable hands in traffic",
    defDesc: "Bell-ringer hits — steady wrap-up strength",
    kind: "possessionHands",
    catchMult: 1.09,
    defStrengthMult: 1.06
  },
  paddleBreak: {
    id: "paddleBreak",
    name: "Paddle Break",
    offDesc: "Water cuts on 3rd & 4th — slippery money-down runs",
    defDesc: "Dives under routes — clutch coverage boost",
    kind: "clutchPower",
    clutchEluMult: 1.15,
    clutchCoverageMult: 1.1
  },
  creekCurrent: {
    id: "creekCurrent",
    name: "Creek Current",
    offDesc: "Current builds — faster each snap on offense",
    defDesc: "Ripple reads — awareness warms through the drive",
    kind: "warmupDrive",
    warmMult: 1.1,
    coldMult: 0.95
  },
  deepSnap: {
    id: "deepSnap",
    name: "Deep Snap",
    offDesc: "Slow release — surer hands after play 3",
    defDesc: "Deep safety range — coverage spikes mid-drive",
    kind: "warmupDrive",
    warmMult: 1.08,
    coldMult: 0.94
  }
};

/** Default ability per appearance when roster entry omits `ability`. */
const APPEARANCE_DEFAULT_ABILITY = {
  nightwing: "nightFlight",
  patTheGnat: "bugJuiced",
  joeCrow: "nevermore",
  whiskersRat: "ratRace",
  woolySheep: "fleeceShield",
  billyGoat: "billyRam",
  player1: "goldenHooves",
  allyHorse: "openPasture",
  lilTunnelPete: "digDog",
  player2: "xsAndOs",
  allyDonkey: "eeHawHit",
  cluckNorris: "coopCloser",
  daxBadger: "riverCharge",
  bessCow: "cowbellCurl",
  tuckDuck: "paddleBreak"
};

const ENTITY_ROSTER_SLOT = {
  player1: "qb",
  allyHorse: "wr",
  lilTunnelPete: "flex",
  offenseP4: "p4",
  offenseP5: "p5",
  player2: "qb",
  allyDonkey: "wr",
  cluckNorris: "flex",
  defenseP4: "p4",
  defenseP5: "p5"
};

function getDevTraitDef(traitId) {
  return DEV_TRAIT_DEFS[traitId] || DEV_TRAIT_DEFS.normal;
}

function getDevAbilityDef(abilityId) {
  return abilityId && DEV_ABILITIES[abilityId] ? DEV_ABILITIES[abilityId] : null;
}

function getEntityAbilityDef(entity) {
  return getDevAbilityDef(entity && entity.devAbilityId);
}

function inferDevTraitFromOvr(entry, slotKey) {
  const attrs = getRosterEntryAttributes(entry, slotKey);
  const defAttrs = getRosterEntryDefAttributes(entry, slotKey);
  const peak = Math.max(getPlayerOffOvr(attrs, slotKey), getPlayerDefOvr(defAttrs, slotKey));
  if (peak >= 93) return "superstar";
  if (peak >= 87) return "star";
  if (peak >= 80) return "normal";
  return "slow";
}

function resolveRosterDevTrait(entry, slotKey) {
  if (entry && entry.devTrait && DEV_TRAIT_DEFS[entry.devTrait]) return entry.devTrait;
  return inferDevTraitFromOvr(entry, slotKey);
}

function resolveRosterAbilityId(entry, slotKey) {
  if (entry && entry.ability && DEV_ABILITIES[entry.ability]) return entry.ability;
  if (entry && entry.appearanceId && APPEARANCE_DEFAULT_ABILITY[entry.appearanceId]) {
    return APPEARANCE_DEFAULT_ABILITY[entry.appearanceId];
  }
  const trait = resolveRosterDevTrait(entry, slotKey);
  if (trait === "superstar") return "goldenHooves";
  if (trait === "star") return "paddleBreak";
  if (trait === "slow") return "creekCurrent";
  return "brambleRun";
}

function getRosterDevTraitInfo(entry, slotKey) {
  const traitId = resolveRosterDevTrait(entry, slotKey);
  const trait = getDevTraitDef(traitId);
  const ability = getDevAbilityDef(resolveRosterAbilityId(entry, slotKey));
  return {
    traitId: trait.id,
    label: trait.label,
    shortLabel: trait.shortLabel || trait.label,
    badge: trait.badge,
    color: trait.color,
    abilityId: ability.id,
    abilityName: ability.name,
    abilityOffDesc: ability.offDesc,
    abilityDefDesc: ability.defDesc
  };
}

function getDevTraitInfoFromId(traitId) {
  const trait = getDevTraitDef(traitId);
  return {
    traitId: trait.id,
    label: trait.label,
    shortLabel: trait.shortLabel || trait.label,
    badge: trait.badge,
    color: trait.color,
    abilityName: trait.label,
    abilityOffDesc: trait.blurb,
    abilityDefDesc: "See By team for each player’s unique ability."
  };
}

function getDevTraitTierExamples(traitId) {
  const names = [];
  for (const teamId of PLAY_TEAM_IDS) {
    const team = TEAMS[teamId];
    if (!team || !team.roster) continue;
    for (const slotKey of ROSTER_SLOT_KEYS) {
      const entry = team.roster[slotKey];
      if (resolveRosterDevTrait(entry, slotKey) !== traitId) continue;
      const ability = getDevAbilityDef(resolveRosterAbilityId(entry, slotKey));
      if (ability && !names.includes(ability.name)) names.push(ability.name);
      if (names.length >= 3) return names;
    }
  }
  return names;
}

function getEntityDevTraitInfo(entity) {
  if (!entity || !entity.devTraitId) return null;
  const trait = getDevTraitDef(entity.devTraitId);
  const ability = getEntityAbilityDef(entity);
  if (!ability) return getDevTraitInfoFromId(entity.devTraitId);
  return {
    traitId: trait.id,
    label: trait.label,
    shortLabel: trait.shortLabel || trait.label,
    badge: trait.badge,
    color: trait.color,
    abilityId: ability.id,
    abilityName: ability.name,
    abilityOffDesc: ability.offDesc,
    abilityDefDesc: ability.defDesc
  };
}

function getEntityRosterSlotKey(entity) {
  if (!entity || !entity.id) return null;
  return ENTITY_ROSTER_SLOT[entity.id] || null;
}

function isClutchDown() {
  return (game.playModeDown || 1) >= 3;
}

function getDrivePlayCount() {
  return game.drivePlayCount || 1;
}

function isDriveWarmedUp(threshold = 3) {
  return getDrivePlayCount() >= threshold;
}

function isWarmupAbility(ability) {
  if (!ability) return false;
  return ["warmupDrive", "warmupReach", "warmupWall"].includes(ability.kind);
}

function getWarmupMult(ability) {
  if (!ability) return 1;
  return isDriveWarmedUp() ? (ability.warmMult || ability.warmSpeed || 1.06) : (ability.coldMult || ability.coldSpeed || 0.96);
}

function getDevTraitSpeedMult(entity) {
  if (!entity) return 1;
  const ability = getEntityAbilityDef(entity);
  if (ability && (entity.devTraitBurstMs || 0) > 0 && ability.burstSpeed) {
    return ability.burstSpeed;
  }
  if (ability && ability.kind === "deepSpeed" && ability.speedMult) {
    return ability.speedMult;
  }
  if (ability && ability.kind === "scramble" && (entity.devTraitBurstMs || 0) > 0 && ability.burstSpeed) {
    return ability.burstSpeed;
  }
  if (ability && isWarmupAbility(ability)) {
    return getWarmupMult(ability);
  }
  if (ability && ability.kind === "steady" && ability.statMult) {
    return 1 + (ability.statMult - 1) * 0.35;
  }
  return 1;
}

function recalcEntityMoveSpeed(entity) {
  if (!entity || entity.baseSpeed == null) return;
  const attrMult = entity.attrSpeedMult != null ? entity.attrSpeedMult : 1;
  const traitMult = getDevTraitSpeedMult(entity);
  const diffMult = entity._difficultySpeedMult != null ? entity._difficultySpeedMult : 1;
  entity.speed = entity.baseSpeed * attrMult * diffMult * traitMult;
}

function applyAbilityPassiveStats(entity, ability) {
  if (!entity || !ability) return;
  const clutch = isClutchDown();
  const warmed = isDriveWarmedUp();
  const m = (v, mult) => (v != null ? v : 1) * (mult != null ? mult : 1);

  if (ability.catchMult) entity.catchSkill = m(entity.catchSkill, ability.catchMult);
  if (ability.powerMult) entity.power = m(entity.power, ability.powerMult);
  if (ability.strengthMult) entity.strength = m(entity.strength, ability.strengthMult);
  if (ability.pressMult) entity.press = m(entity.press, ability.pressMult);
  if (ability.eluMult) entity.elusiveness = m(entity.elusiveness, ability.eluMult);
  if (ability.defStrengthMult) entity.defStrength = m(entity.defStrength, ability.defStrengthMult);
  if (ability.coverageMult) entity.coverage = m(entity.coverage, ability.coverageMult);
  if (ability.awarenessMult) entity.awareness = m(entity.awareness, ability.awarenessMult);

  if (ability.kind === "steady" && ability.statMult) {
    const s = ability.statMult;
    entity.strength = m(entity.strength, s);
    entity.elusiveness = m(entity.elusiveness, s);
    entity.catchSkill = m(entity.catchSkill, s);
    entity.defStrength = m(entity.defStrength, s);
    entity.coverage = m(entity.coverage, s);
    entity.awareness = m(entity.awareness, s);
    entity.press = m(entity.press, s);
  }

  if (ability.kind === "warmupDrive" || ability.kind === "warmupWall" || ability.kind === "warmupReach") {
    const wm = warmed ? ability.warmMult : ability.coldMult;
    if (wm) {
      entity.strength = m(entity.strength, wm);
      entity.elusiveness = m(entity.elusiveness, wm);
      entity.coverage = m(entity.coverage, wm);
      entity.awareness = m(entity.awareness, wm);
      entity.catchSkill = m(entity.catchSkill, warmed ? 1.04 : 0.97);
    }
  }

  if (ability.kind === "clutchPower" && clutch) {
    if (ability.clutchEluMult) entity.elusiveness = m(entity.elusiveness, ability.clutchEluMult);
    if (ability.clutchCoverageMult) entity.coverage = m(entity.coverage, ability.clutchCoverageMult);
  }

  if (ability.kind === "deepSpeed" && clutch && ability.clutchEluMult) {
    entity.elusiveness = m(entity.elusiveness, ability.clutchEluMult);
  }

  if (ability.kind === "clutchPass" && clutch && ability.clutchCoverageMult) {
    entity.coverage = m(entity.coverage, ability.clutchCoverageMult);
    entity.awareness = m(entity.awareness, 1.06);
  }
}

function applyDevTraitToEntity(entity, skin, slotKey) {
  if (!entity) return;
  const slot = slotKey || getEntityRosterSlotKey(entity);
  const traitId = resolveRosterDevTrait(skin, slot);
  const abilityId = resolveRosterAbilityId(skin, slot);
  const prevBurst = entity.devTraitBurstMs || 0;
  entity.devTraitId = traitId;
  entity.devAbilityId = abilityId;
  entity.devTraitBurstMs = prevBurst;
  applyAbilityPassiveStats(entity, getDevAbilityDef(abilityId));
  recalcEntityMoveSpeed(entity);
}

function resetDevTraitDriveState() {
  game.drivePlayCount = 0;
  game._lastBallCarrier = null;
}

function beginDevTraitDrivePlay() {
  game.drivePlayCount = (game.drivePlayCount || 0) + 1;
  refreshDevTraitDriveModifiers();
}

function getAllFieldEntities() {
  return [
    player1, allyHorse, lilTunnelPete, offenseP4, offenseP5,
    player2, allyDonkey, cluckNorris, defenseP4, defenseP5
  ];
}

function refreshDevTraitDriveModifiers() {
  for (const entity of getAllFieldEntities()) {
    if (!entity || !entity.devAbilityId) continue;
    const team = entity.teamTag && TEAMS[entity.teamTag];
    const slot = entity.rosterSlotKey || getEntityRosterSlotKey(entity);
    if (team && slot && team.roster[slot]) {
      applyEntityAttributes(entity, team.roster[slot], slot);
    } else {
      applyAbilityPassiveStats(entity, getEntityAbilityDef(entity));
      recalcEntityMoveSpeed(entity);
    }
  }
}

function triggerDevTraitOnPossession(carrier) {
  if (!carrier || !carrier.devAbilityId) return;
  const ability = getEntityAbilityDef(carrier);
  if (!ability) return;
  if (ability.kind === "possessionBurst" || ability.kind === "scramble") {
    carrier.devTraitBurstMs = ability.burstMs || 2000;
    recalcEntityMoveSpeed(carrier);
  }
}

function updateDevTraitBurstTimers(dt) {
  for (const entity of getAllFieldEntities()) {
    if (!entity || !(entity.devTraitBurstMs > 0)) continue;
    entity.devTraitBurstMs = Math.max(0, entity.devTraitBurstMs - dt * 1000);
    if (entity.devTraitBurstMs === 0) recalcEntityMoveSpeed(entity);
  }
}

function trackDevTraitBallCarrierChange() {
  const carrier = ball && ball.carrier;
  if (carrier === game._lastBallCarrier) return;
  game._lastBallCarrier = carrier;
  if (carrier && carrier.devAbilityId) triggerDevTraitOnPossession(carrier);
}

function getDevTraitTackleReachBonus(defender) {
  if (!defender || !defender.devAbilityId) return 0;
  const ability = getEntityAbilityDef(defender);
  if (!ability) return 0;
  const rad = defender.radius != null ? defender.radius : CONFIG.playerRadius;
  let reach = ability.reachMult != null ? rad * ability.reachMult : 0;
  if (ability.kind === "warmupReach" && isDriveWarmedUp()) {
    reach = rad * (ability.reachMult || 0.1);
  } else if (ability.kind === "warmupReach") {
    reach = rad * 0.03;
  }
  if (ability.kind === "clutchPower" && isClutchDown() && ability.clutchReachMult) {
    reach = Math.max(reach, rad * ability.clutchReachMult);
  }
  return reach;
}

function getDevTraitElusivenessMult(carrier) {
  if (!carrier || !carrier.devAbilityId) return 1;
  const ability = getEntityAbilityDef(carrier);
  if (!ability) return 1;
  let mult = 1;
  if (ability.eluMult) mult *= ability.eluMult;
  if (ability.kind === "clutchPower" && isClutchDown() && ability.clutchEluMult) {
    mult *= ability.clutchEluMult;
  }
  if (ability.kind === "deepSpeed" && isClutchDown() && ability.clutchEluMult) {
    mult *= ability.clutchEluMult;
  }
  if (isWarmupAbility(ability) && isDriveWarmedUp()) mult *= 1.05;
  if (ability.kind === "steady" && ability.statMult) mult *= ability.statMult;
  return mult;
}

function getDevTraitPassCompletionBonus(qbEntity) {
  if (!qbEntity || !qbEntity.devAbilityId || !isClutchDown()) return 0;
  const ability = getEntityAbilityDef(qbEntity);
  if (!ability) return 0;
  if (ability.kind === "clutchPass" && ability.clutchPassBonus) return ability.clutchPassBonus;
  if (ability.kind === "clutchPower" && ability.clutchPassBonus) return ability.clutchPassBonus;
  if (ability.kind === "scramble" && isClutchDown()) return 0.05;
  return 0;
}

function drawDevTraitPill(ctx, cx, cy, traitInfo, opts = {}) {
  if (!traitInfo) return;
  const compact = opts.compact === true;
  const w = opts.w != null ? opts.w : compact ? 34 : 52;
  const h = opts.h != null ? opts.h : compact ? 16 : 20;
  const x = cx - w / 2;
  const y = cy - h / 2;
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = traitInfo.color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = "center";
  ctx.fillStyle = traitInfo.color;
  ctx.font = compact ? "bold 8px Arial" : "bold 9px Arial";
  const text = compact
    ? `${traitInfo.badge}${traitInfo.shortLabel}`
    : `${traitInfo.badge} ${traitInfo.shortLabel}`;
  ctx.fillText(text, cx, cy + (compact ? 3 : 4));
  ctx.restore();
}

function drawDevTraitBadge(ctx, x, y, traitInfo, maxW) {
  if (!traitInfo) return;
  ctx.save();
  ctx.font = "bold 9px Arial";
  const text = `${traitInfo.badge} ${traitInfo.label} · ${traitInfo.abilityName}`;
  let label = text;
  while (label.length > 3 && ctx.measureText(label).width > maxW) {
    label = label.slice(0, -1);
  }
  if (label.length < text.length) label += "…";
  ctx.fillStyle = traitInfo.color;
  ctx.textAlign = "left";
  ctx.fillText(label, x, y);
  ctx.restore();
}

function drawDevTraitFieldMarker(ctx, x, y, traitInfo, scale) {
  if (!traitInfo) return;
  const sc = scale != null ? scale : 1;
  const w = 34 * sc;
  const h = 12 * sc;
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.strokeStyle = traitInfo.color;
  ctx.lineWidth = Math.max(1, 1.2 * sc);
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  ctx.textAlign = "center";
  ctx.fillStyle = traitInfo.color;
  ctx.font = `bold ${Math.max(6, Math.round(7 * sc))}px Arial`;
  const tag = traitInfo.abilityName.length > 10
    ? traitInfo.abilityName.split(" ")[0]
    : traitInfo.abilityName;
  ctx.fillText(tag, x, y + 3 * sc);
  ctx.restore();
}

function formatRosterDevTraitLine(team) {
  if (!team || !team.roster) return "";
  return ROSTER_STARTER_KEYS.map((slotKey) => {
    const entry = team.roster[slotKey];
    const info = getRosterDevTraitInfo(entry, slotKey);
    const shortName = entry.displayLabel.split(" ")[0];
    return `${info.badge}${shortName}`;
  }).join(" · ");
}

const DEV_TRAITS_GUIDE_SLOT_LABELS = {
  qb: "QB",
  wr: "WR",
  flex: "FLEX",
  p4: "RB",
  p5: "C",
  b1: "BN",
  b2: "BN",
  b3: "BN",
  b4: "BN",
  b5: "BN",
  b6: "BN"
};

function getDevTraitsGuideLayout() {
  const cx = canvas.width / 2;
  return {
    back: { x: 20, y: 14, w: 118, h: 32 },
    overviewTab: { x: cx - 202, y: 14, w: 196, h: 32 },
    teamsTab: { x: cx + 6, y: 14, w: 196, h: 32 },
    prevTeam: { x: cx - 118, y: 498, w: 88, h: 32 },
    nextTeam: { x: cx + 30, y: 498, w: 88, h: 32 },
    panel: { x: 20, y: 56, w: canvas.width - 40, h: 428 }
  };
}

function openDevTraitsGuide(returnState) {
  game.devTraitsGuideReturnState = returnState || game.state || "menu";
  if (game.devTraitsGuideReturnState === "playTeamSelect" && game.teamSelectPage != null) {
    game.devTraitsGuideTeamPage = game.teamSelectPage;
  }
  game.devTraitsGuideTab = game.devTraitsGuideTab || "overview";
  game.state = "playDevTraitsGuide";
}

function closeDevTraitsGuide() {
  const back = game.devTraitsGuideReturnState || "menu";
  game.state = back;
  if (back === "menu" && typeof startMenuMusic === "function") startMenuMusic();
}
