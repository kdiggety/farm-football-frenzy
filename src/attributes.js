// =========================================================
// Player attributes — animal-themed stats (multipliers ~1.0 = average)
// =========================================================
// speed       — movement
// strength    — tackling, holding the ball (fumble resistance), contact fights
// power       — blocking & pass protection (linemen staying on blocks)
// elusiveness — harder to bring down as the ball carrier
// catch       — hands (reserved for future pass tuning; shown in UI)

const ATTRIBUTE_KEYS = ["speed", "strength", "power", "elusiveness", "catch"];

/** Defensive attributes — separate from offense (multipliers ~1.0 = average). */
const DEF_ATTRIBUTE_KEYS = ["strength", "press", "coverage", "speed", "awareness"];

const ATTRIBUTE_SHORT_LABELS = {
  speed: "S",
  strength: "STR",
  power: "PWR",
  elusiveness: "E",
  catch: "C"
};

const DEF_ATTRIBUTE_SHORT_LABELS = {
  strength: "STR",
  press: "PRS",
  coverage: "COV",
  speed: "SPD",
  awareness: "AWR"
};

const ATTRIBUTE_TOOLTIPS = {
  speed: "Speed — how fast they move",
  strength: "Strength — tackling & holding the ball",
  power: "Power — blocking & pass protection",
  elusiveness: "Elusiveness — hard to bring down",
  catch: "Catch — receiving hands"
};

const DEF_ATTRIBUTE_TOOLTIPS = {
  strength: "Strength — tackling & run fits",
  press: "Press — jamming receivers at the line",
  coverage: "Coverage — staying with routes",
  speed: "Speed — closing ground on defense",
  awareness: "Awareness — reads & positioning"
};

const ROSTER_STARTER_KEYS = ["qb", "wr", "flex", "p4", "p5"];
const ROSTER_BENCH_KEYS = ["b1", "b2", "b3", "b4", "b5", "b6"];
const ROSTER_MAX_STARTERS = 5;
const ROSTER_MAX_BENCH = 6;
const ROSTER_MAX_PLAYERS = 11;
const ROSTER_SLOT_KEYS = ROSTER_STARTER_KEYS.concat(ROSTER_BENCH_KEYS);

const ROSTER_SLOT_ENTITY_ID = {
  qb: "player1",
  wr: "allyHorse",
  flex: "lilTunnelPete",
  p4: "offenseP4",
  p5: "offenseP5"
};

const ROSTER_SLOT_LABELS = {
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

function isBenchRosterSlot(slotKey) {
  return ROSTER_BENCH_KEYS.indexOf(slotKey) >= 0;
}

function countRosterPlayers(roster) {
  if (!roster) return 0;
  let n = 0;
  for (const slot of ROSTER_SLOT_KEYS) {
    if (roster[slot]) n += 1;
  }
  return n;
}

function findFirstEmptyRosterSlot(roster) {
  for (const slot of ROSTER_SLOT_KEYS) {
    if (!roster[slot]) return slot;
  }
  return null;
}

function findFirstEmptyBenchSlot(roster) {
  for (const slot of ROSTER_BENCH_KEYS) {
    if (!roster[slot]) return slot;
  }
  return null;
}

function getRosterSlotLabel(slotKey) {
  return ROSTER_SLOT_LABELS[slotKey] || String(slotKey || "").toUpperCase();
}

function pickCpuRosterSlot(roster, slotHint) {
  const empty = findFirstEmptyRosterSlot(roster);
  if (empty) return empty;
  if (slotHint && roster[slotHint]) return slotHint;
  const emptyBench = findFirstEmptyBenchSlot(roster);
  if (emptyBench) return emptyBench;
  return ROSTER_BENCH_KEYS[Math.floor(Math.random() * ROSTER_BENCH_KEYS.length)];
}

/** Offensive overall weights by roster slot. */
const OFF_OVR_WEIGHTS_BY_SLOT = {
  qb: { speed: 1.25, strength: 0.65, power: 0.55, elusiveness: 1.15, catch: 0.95 },
  wr: { speed: 1.3, strength: 0.75, power: 0.65, elusiveness: 1.1, catch: 1.35 },
  flex: { speed: 1.05, strength: 1, power: 0.95, elusiveness: 1.05, catch: 1.05 },
  p4: { speed: 1.2, strength: 1.05, power: 0.85, elusiveness: 1.15, catch: 0.85 },
  p5: { speed: 0.65, strength: 1.2, power: 1.35, elusiveness: 0.65, catch: 0.6 }
};
for (const benchSlot of ROSTER_BENCH_KEYS) {
  OFF_OVR_WEIGHTS_BY_SLOT[benchSlot] = { ...OFF_OVR_WEIGHTS_BY_SLOT.flex };
}

/** Defensive overall weights by roster slot (uses DEF_ATTRIBUTE_KEYS). */
const DEF_OVR_WEIGHTS_BY_SLOT = {
  qb: { strength: 1.25, press: 0.85, coverage: 0.95, speed: 1.05, awareness: 1.3 },
  wr: { strength: 0.85, press: 1.2, coverage: 1.35, speed: 1.15, awareness: 1.05 },
  flex: { strength: 1, press: 0.95, coverage: 1.2, speed: 1.1, awareness: 1.25 },
  p4: { strength: 1.05, press: 0.9, coverage: 1.05, speed: 1.25, awareness: 1.1 },
  p5: { strength: 1.35, press: 1.2, coverage: 0.75, speed: 0.95, awareness: 1.05 }
};
for (const benchSlot of ROSTER_BENCH_KEYS) {
  DEF_OVR_WEIGHTS_BY_SLOT[benchSlot] = { ...DEF_OVR_WEIGHTS_BY_SLOT.flex };
}

/** @deprecated use OFF_OVR_WEIGHTS_BY_SLOT */
const OVR_WEIGHTS_BY_SLOT = OFF_OVR_WEIGHTS_BY_SLOT;

const DEFAULT_ATTRIBUTES = {
  speed: 1,
  strength: 1,
  power: 1,
  elusiveness: 1,
  catch: 1
};

/** Bench / depth-chart defaults when a slot uses squadA / squadB art. */
const ROLE_ATTRIBUTE_DEFAULTS = {
  offenseP4: { speed: 0.88, strength: 0.86, power: 0.84, elusiveness: 0.86, catch: 0.84 },
  offenseP5: { speed: 0.72, strength: 0.94, power: 0.96, elusiveness: 0.72, catch: 0.7 },
  defenseP4: { speed: 0.9, strength: 0.88, power: 0.86, elusiveness: 0.9, catch: 0.86 },
  defenseP5: { speed: 0.74, strength: 0.96, power: 0.98, elusiveness: 0.74, catch: 0.72 }
};

const DEFAULT_DEF_ATTRIBUTES = {
  strength: 1,
  press: 1,
  coverage: 1,
  speed: 1,
  awareness: 1
};

/** Bench / depth-chart defensive defaults (squadA / squadB slots). */
const ROLE_DEF_ATTRIBUTE_DEFAULTS = {
  offenseP4: { strength: 0.88, press: 0.86, coverage: 0.88, speed: 0.9, awareness: 0.86 },
  offenseP5: { strength: 0.96, press: 0.94, coverage: 0.8, speed: 0.76, awareness: 0.84 },
  defenseP4: { strength: 0.9, press: 0.88, coverage: 0.9, speed: 0.92, awareness: 0.88 },
  defenseP5: { strength: 0.98, press: 0.96, coverage: 0.82, speed: 0.78, awareness: 0.86 }
};

/** Per-animal defensive identity — wide spread to match offensive stars & role players. */
const ANIMAL_DEF_ATTRIBUTES = {
  player1: { strength: 1.08, press: 0.92, coverage: 0.98, speed: 1.2, awareness: 1.06 },
  player2: { strength: 1.42, press: 1.32, coverage: 0.72, speed: 0.72, awareness: 0.95 },
  allyHorse: { strength: 1.12, press: 1.08, coverage: 0.94, speed: 1.08, awareness: 0.98 },
  lilTunnelPete: { strength: 1.14, press: 1.05, coverage: 1.02, speed: 0.78, awareness: 1.12 },
  allyDonkey: { strength: 1.26, press: 1.22, coverage: 0.86, speed: 0.82, awareness: 0.9 },
  cluckNorris: { strength: 0.92, press: 1.18, coverage: 0.9, speed: 1.06, awareness: 1.04 },
  nightwing: { strength: 0.88, press: 0.82, coverage: 1.22, speed: 1.18, awareness: 1.28 },
  patTheGnat: { strength: 0.62, press: 0.58, coverage: 1.08, speed: 1.32, awareness: 1.1 },
  joeCrow: { strength: 0.88, press: 0.84, coverage: 1.12, speed: 0.62, awareness: 1.24 },
  whiskersRat: { strength: 0.72, press: 0.68, coverage: 1.06, speed: 1.28, awareness: 1.08 },
  woolySheep: { strength: 1.08, press: 1.02, coverage: 0.88, speed: 0.82, awareness: 0.92 },
  billyGoat: { strength: 1.22, press: 1.2, coverage: 0.86, speed: 0.88, awareness: 0.94 },
  daxBadger: { strength: 1.28, press: 1.26, coverage: 0.96, speed: 0.86, awareness: 1.08 },
  bessCow: { strength: 1.38, press: 1.34, coverage: 0.68, speed: 0.66, awareness: 0.88 },
  tuckDuck: { strength: 0.84, press: 0.8, coverage: 1.14, speed: 1.1, awareness: 1.06 }
};

function mergeDefAttributes(...layers) {
  const out = { ...DEFAULT_DEF_ATTRIBUTES };
  for (const layer of layers) {
    if (!layer) continue;
    for (const key of DEF_ATTRIBUTE_KEYS) {
      if (layer[key] != null) out[key] = layer[key];
    }
  }
  return out;
}

function resolveDefAttributes(skin, entityOrSlotKey) {
  const entity =
    entityOrSlotKey && typeof entityOrSlotKey === "object"
      ? entityOrSlotKey
      : entityOrSlotKey && ROSTER_SLOT_ENTITY_ID[entityOrSlotKey]
        ? { id: ROSTER_SLOT_ENTITY_ID[entityOrSlotKey] }
        : null;
  const roleDefaults =
    entity && entity.id && ROLE_DEF_ATTRIBUTE_DEFAULTS[entity.id]
      ? ROLE_DEF_ATTRIBUTE_DEFAULTS[entity.id]
      : null;
  const animal =
    skin && skin.appearanceId && ANIMAL_DEF_ATTRIBUTES[skin.appearanceId]
      ? ANIMAL_DEF_ATTRIBUTES[skin.appearanceId]
      : null;
  return mergeDefAttributes(roleDefaults, animal, skin && skin.defAttrs);
}

function getRosterEntryDefAttributes(entry, slotKey) {
  return resolveDefAttributes(entry, slotKey);
}

/** Per-animal offensive identity — wide spread (some 99s, some ~70s). Gameplay uses raw multipliers. */
const ANIMAL_ATTRIBUTES = {
  player1: { speed: 1.24, strength: 0.86, power: 0.84, elusiveness: 1.24, catch: 0.94 },
  player2: { speed: 0.76, strength: 1.42, power: 1.4, elusiveness: 0.8, catch: 0.88 },
  allyHorse: { speed: 1.14, strength: 1.08, power: 1.06, elusiveness: 0.98, catch: 0.96 },
  lilTunnelPete: { speed: 0.74, strength: 1.18, power: 1.12, elusiveness: 1.14, catch: 0.9 },
  allyDonkey: { speed: 0.84, strength: 1.28, power: 1.26, elusiveness: 0.88, catch: 0.88 },
  cluckNorris: { speed: 1.1, strength: 0.9, power: 0.88, elusiveness: 1.12, catch: 0.98 },
  nightwing: { speed: 1.22, strength: 0.9, power: 0.88, elusiveness: 1.22, catch: 1 },
  patTheGnat: { speed: 1.32, strength: 0.64, power: 0.62, elusiveness: 1.3, catch: 0.86 },
  joeCrow: { speed: 0.6, strength: 0.9, power: 0.86, elusiveness: 1.06, catch: 1.06 },
  whiskersRat: { speed: 1.28, strength: 0.76, power: 0.74, elusiveness: 1.2, catch: 0.92 },
  woolySheep: { speed: 0.86, strength: 1.1, power: 1.08, elusiveness: 0.92, catch: 0.9 },
  billyGoat: { speed: 0.92, strength: 1.24, power: 1.28, elusiveness: 0.96, catch: 0.86 },
  daxBadger: { speed: 0.9, strength: 1.26, power: 1.24, elusiveness: 1.1, catch: 0.88 },
  bessCow: { speed: 0.68, strength: 1.4, power: 1.38, elusiveness: 0.72, catch: 0.82 },
  tuckDuck: { speed: 1.12, strength: 0.88, power: 0.86, elusiveness: 1.16, catch: 1.02 }
};

function mergeAttributes(...layers) {
  const out = { ...DEFAULT_ATTRIBUTES };
  for (const layer of layers) {
    if (!layer) continue;
    for (const key of ATTRIBUTE_KEYS) {
      if (layer[key] != null) out[key] = layer[key];
    }
  }
  return out;
}

function resolvePlayerAttributes(skin, entityOrSlotKey) {
  const entity =
    entityOrSlotKey && typeof entityOrSlotKey === "object"
      ? entityOrSlotKey
      : entityOrSlotKey && ROSTER_SLOT_ENTITY_ID[entityOrSlotKey]
        ? { id: ROSTER_SLOT_ENTITY_ID[entityOrSlotKey] }
        : null;
  const roleDefaults =
    entity && entity.id && ROLE_ATTRIBUTE_DEFAULTS[entity.id]
      ? ROLE_ATTRIBUTE_DEFAULTS[entity.id]
      : null;
  const animal =
    skin && skin.appearanceId && ANIMAL_ATTRIBUTES[skin.appearanceId]
      ? ANIMAL_ATTRIBUTES[skin.appearanceId]
      : null;
  return mergeAttributes(roleDefaults, animal, skin && skin.attrs);
}

function getRosterEntryAttributes(entry, slotKey) {
  return resolvePlayerAttributes(entry, slotKey);
}

function computeWeightedOvr(ratings, weightsBySlot, slotKey, attributeKeys) {
  const keys = attributeKeys || ATTRIBUTE_KEYS;
  const weights = weightsBySlot[slotKey] || {};
  const ranked = keys.map((key) => ({
    rating: ratings[key] != null ? ratings[key] : attributeToRating(1),
    weight: weights[key] != null ? weights[key] : 1
  })).sort((a, b) => b.weight - a.weight);
  const top = ranked.slice(0, 3);
  let sum = 0;
  let weightSum = 0;
  for (const { rating, weight } of top) {
    sum += rating * weight;
    weightSum += weight;
  }
  const topThreeAvg = sum / Math.max(1, weightSum);
  const peak = Math.max(...top.map(({ rating }) => rating));
  return Math.round(clamp(topThreeAvg * 0.52 + peak * 0.48, 62, 99));
}

function getAttributeKeysForSide(slotKey, side) {
  if (side === "def") {
    const weights = DEF_OVR_WEIGHTS_BY_SLOT[slotKey];
    return DEF_ATTRIBUTE_KEYS.slice().sort(
      (a, b) => (weights[b] != null ? weights[b] : 1) - (weights[a] != null ? weights[a] : 1)
    );
  }
  const weights = OFF_OVR_WEIGHTS_BY_SLOT[slotKey];
  return ATTRIBUTE_KEYS.slice().sort(
    (a, b) => (weights[b] != null ? weights[b] : 1) - (weights[a] != null ? weights[a] : 1)
  );
}

function getPlayerOffOvr(attrs, slotKey) {
  return computeWeightedOvr(getAttributeRatings(attrs), OFF_OVR_WEIGHTS_BY_SLOT, slotKey, ATTRIBUTE_KEYS);
}

function getPlayerDefOvr(defAttrs, slotKey) {
  return computeWeightedOvr(
    getDefAttributeRatings(defAttrs),
    DEF_OVR_WEIGHTS_BY_SLOT,
    slotKey,
    DEF_ATTRIBUTE_KEYS
  );
}

function getPlayerOvr(attrs, slotKey) {
  return getPlayerOffOvr(attrs, slotKey);
}

function formatAttributeRatingsLine(ratings) {
  return ATTRIBUTE_KEYS.map((key) => `${ATTRIBUTE_SHORT_LABELS[key]}${ratings[key]}`).join(" ");
}

function getOvrTierColor(ovr) {
  if (ovr >= 92) return "#fbbf24";
  if (ovr >= 86) return "#86efac";
  if (ovr >= 80) return "#e5e7eb";
  return "#94a3b8";
}

function getStatBarColor(rating) {
  if (rating >= 92) return "#fbbf24";
  if (rating >= 86) return "#4ade80";
  if (rating >= 80) return "#93c5fd";
  return "#94a3b8";
}

function getTeamRosterProfiles(team, slotKeys) {
  if (!team || !team.roster) return [];
  const keys = slotKeys || ROSTER_STARTER_KEYS;
  return keys.map((slotKey) => {
    const entry = team.roster[slotKey];
    const attrs = getRosterEntryAttributes(entry, slotKey);
    const defAttrs = getRosterEntryDefAttributes(entry, slotKey);
    const ratings = getAttributeRatings(attrs);
    const defRatings = getDefAttributeRatings(defAttrs);
    const offOvr = getPlayerOffOvr(attrs, slotKey);
    const defOvr = getPlayerDefOvr(defAttrs, slotKey);
    return {
      slotKey,
      name: entry.displayLabel,
      attrs,
      defAttrs,
      ratings,
      defRatings,
      ovr: offOvr,
      offOvr,
      defOvr
    };
  });
}

function getTeamAverageOffOvr(team) {
  const profiles = getTeamRosterProfiles(team);
  if (!profiles.length) return 82;
  const sum = profiles.reduce((acc, p) => acc + p.offOvr, 0);
  return Math.round(sum / profiles.length);
}

function getTeamAverageDefOvr(team) {
  const profiles = getTeamRosterProfiles(team);
  if (!profiles.length) return 82;
  const sum = profiles.reduce((acc, p) => acc + p.defOvr, 0);
  return Math.round(sum / profiles.length);
}

function getTeamAverageOvr(team) {
  return getTeamAverageOffOvr(team);
}

/** Narrow speed spread on the field — roster still shows full ratings. */
function compressSpeedMultiplier(mult) {
  const m = mult != null ? mult : 1;
  return clamp(1 + (m - 1) * 0.18, 0.92, 1.08);
}

function applyEntityAttributes(entity, skin, slotKey) {
  if (entity.baseSpeed == null) entity.baseSpeed = entity.speed;
  const attrs = resolvePlayerAttributes(skin, entity);
  const defAttrs = resolveDefAttributes(skin, entity);
  const offSpeed = compressSpeedMultiplier(attrs.speed);
  const defSpeed = compressSpeedMultiplier(defAttrs.speed);
  entity.attrSpeedMult = offSpeed;
  entity.strength = attrs.strength;
  entity.power = attrs.power;
  entity.elusiveness = attrs.elusiveness;
  entity.catchSkill = attrs.catch;
  entity.defStrength = defAttrs.strength;
  entity.press = defAttrs.press;
  entity.coverage = defAttrs.coverage;
  entity.defSpeedMult = defSpeed;
  entity.awareness = defAttrs.awareness;
  entity.speed = entity.baseSpeed * offSpeed;
  if (typeof applyDevTraitToEntity === "function") {
    applyDevTraitToEntity(entity, skin, slotKey || entity.rosterSlotKey);
  }
  return attrs;
}

/** Display rating 62–99. Gameplay still uses raw multipliers above. */
function attributeToRating(mult) {
  const raw = clamp(mult, 0.55, 1.45) * 48 + 36;
  return Math.round(clamp(raw, 62, 99));
}

function getAttributeRatings(attrs) {
  const src = attrs || DEFAULT_ATTRIBUTES;
  const out = {};
  for (const key of ATTRIBUTE_KEYS) {
    out[key] = attributeToRating(src[key] != null ? src[key] : 1);
  }
  return out;
}

function getDefAttributeRatings(defAttrs) {
  const src = defAttrs || DEFAULT_DEF_ATTRIBUTES;
  const out = {};
  for (const key of DEF_ATTRIBUTE_KEYS) {
    out[key] = attributeToRating(src[key] != null ? src[key] : 1);
  }
  return out;
}

function formatAttributeCompact(attrs) {
  const r = getAttributeRatings(attrs);
  return `SPD ${r.speed}  STR ${r.strength}  PWR ${r.power}`;
}

function getCarrierTackleRadius(carrier) {
  if (!carrier) return CONFIG.playerRadius;
  const traitMult =
    typeof getDevTraitElusivenessMult === "function" ? getDevTraitElusivenessMult(carrier) : 1;
  const elu = (carrier.elusiveness != null ? carrier.elusiveness : 1) * traitMult;
  return carrier.radius / Math.max(0.62, elu);
}

function getDefenderTackleReachBonus(defender) {
  if (!defender) return 0;
  const str =
    defender.defStrength != null
      ? defender.defStrength
      : defender.strength != null
        ? defender.strength
        : 1;
  const rad = defender.radius != null ? defender.radius : CONFIG.playerRadius;
  const traitBonus =
    typeof getDevTraitTackleReachBonus === "function" ? getDevTraitTackleReachBonus(defender) : 0;
  return Math.max(0, str - 1) * rad * 0.28 + traitBonus;
}

function getCarrierFumbleResistance(carrier) {
  if (!carrier) return 1;
  return Math.max(0.65, carrier.strength != null ? carrier.strength : 1);
}

function getBlockHoldMsForLineman(lineman) {
  const power = lineman && lineman.power != null ? lineman.power : 1;
  return PLAY_BLOCK_HOLD_MS * Math.max(0.72, power);
}
