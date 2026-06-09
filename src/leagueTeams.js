// =========================================================
// 32-team league — original 5 clubs + 27 generated rosters
// =========================================================

const LEAGUE_TEAM_COUNT = 32;

const LEAGUE_APPEARANCE_POOL = [
  "tuckDuck", "daxBadger", "sidSkunk", "bessCow", "boBoar", "moleMole", "bamBull",
  "buckRam", "gusGopher", "halHog", "jebGoat", "kitCat", "nightwing", "patTheGnat",
  "joeCrow", "whiskersRat", "woolySheep", "billyGoat", "cluckNorris", "lilTunnelPete",
  "daxBadger", "allyHorse", "allyDonkey", "squadA", "squadB"
];

const LEAGUE_ABILITY_POOL = [
  "nightFlight", "bugJuiced", "nevermore", "swarmHit", "nestBlock", "ratRace", "fleeceShield",
  "billyRam", "cloverLuck", "brambleRun", "goldenHooves", "openPasture", "digDog", "royalGuard",
  "dustCloud", "xsAndOs", "eeHawHit", "coopCloser", "mudGrit", "slinkCuts", "riverCharge",
  "cowbellCurl", "paddleBreak", "creekCurrent", "deepSnap"
];

const LEAGUE_FIRST_NAMES = [
  "Rusty", "Clover", "Dusty", "Pepper", "Marble", "Sprocket", "Tater", "Midge", "Rascal",
  "Sprout", "Grit", "Niblet", "Cob", "Pippin", "Stitch", "Barley", "Hank", "Mabel", "Otis",
  "Prue", "Rufus", "Sable", "Tuck", "Vera", "Wade", "Yarrow", "Zed", "Bram", "Chet", "Dell",
  "Finn", "Gus", "Hob", "Ivy", "Jeb", "Kip", "Lem", "Moss", "Nell", "Oren", "Pike", "Quill",
  "Reed", "Slim", "Tad", "Una", "Vance", "Wynn", "Axel", "Bly", "Crisp", "Dune", "Elm", "Fern"
];

const LEAGUE_LAST_NAMES = [
  "McHeehaw", "O'Trotter", "Fieldsworth", "Barnwell", "Haystack", "Mudrick", "Creekmore",
  "Woolsey", "Featherby", "Tractor", "Siloman", "Puddle", "Thornwick", "Silo", "Plowman",
  "Harrow", "Stubble", "Windrow", "Bale", "Grist", "Millet", "Furrow", "Trough", "Shoat",
  "Cloverfield", "Dustbin", "Gravel", "Knoll", "Ridge", "Marsh", "Timber", "Bluff", "Gulch",
  "Briar", "Hollow", "Vale", "Amber", "Rust", "Loom", "Cinder", "Sage", "Pine", "Salt", "Fen"
];

const LEAGUE_TEAM_PALETTES = [
  { color: "#78716c", accent: "#fde68a", endZone: "#57534e", shadow: "rgba(120,113,108,0.45)" },
  { color: "#84cc16", accent: "#f7fee7", endZone: "#365314", shadow: "rgba(132,204,22,0.42)" },
  { color: "#3b82f6", accent: "#bfdbfe", endZone: "#1d4ed8", shadow: "rgba(59,130,246,0.42)" },
  { color: "#ec4899", accent: "#fbcfe8", endZone: "#be185d", shadow: "rgba(236,72,153,0.42)" },
  { color: "#0d9488", accent: "#5eead4", endZone: "#0f766e", shadow: "rgba(13,148,136,0.42)" },
  { color: "#a855f7", accent: "#e9d5ff", endZone: "#6b21a8", shadow: "rgba(168,85,247,0.42)" },
  { color: "#f97316", accent: "#fed7aa", endZone: "#c2410c", shadow: "rgba(249,115,22,0.42)" },
  { color: "#eab308", accent: "#fef08a", endZone: "#a16207", shadow: "rgba(234,179,8,0.42)" },
  { color: "#64748b", accent: "#cbd5e1", endZone: "#334155", shadow: "rgba(100,116,139,0.42)" },
  { color: "#22c55e", accent: "#bbf7d0", endZone: "#15803d", shadow: "rgba(34,197,94,0.42)" },
  { color: "#ef4444", accent: "#fecaca", endZone: "#b91c1c", shadow: "rgba(239,68,68,0.42)" },
  { color: "#06b6d4", accent: "#a5f3fc", endZone: "#0e7490", shadow: "rgba(6,182,212,0.42)" },
  { color: "#8b5cf6", accent: "#ddd6fe", endZone: "#5b21b6", shadow: "rgba(139,92,246,0.42)" },
  { color: "#713f12", accent: "#fde68a", endZone: "#451a03", shadow: "rgba(113,63,18,0.42)" },
  { color: "#1e3a5f", accent: "#93c5fd", endZone: "#172554", shadow: "rgba(30,58,95,0.42)" }
];

const LEAGUE_FONT_POOL = [
  "Arial, sans-serif",
  "'Oswald', sans-serif",
  "'Merriweather', Georgia, serif",
  "'Anton', sans-serif",
  "'Bangers', cursive",
  "'Permanent Marker', cursive"
];

const LEAGUE_GENERATED_META = [
  { id: "ironAcres", name: "Iron Acres Stampede", shortName: "IAS", logoSymbol: "bull", bannerSrc: "assets/teams/team-iron-acres.png" },
  { id: "siloStorm", name: "Silo Storm Surge", shortName: "SSS", logoSymbol: "silo", bannerSrc: "assets/teams/team-silo-storm.png" },
  { id: "haywireHc", name: "Haywire Haymakers", shortName: "HWH", logoSymbol: "haybale", bannerSrc: "assets/teams/team-haywire-hc.png" },
  { id: "gravelRun", name: "Gravel Run Goats", shortName: "GRG", logoSymbol: "goat", bannerSrc: "assets/teams/team-gravel-run.png" },
  { id: "wheatWolves", name: "Wheatfield Wolves", shortName: "WFW", logoSymbol: "wheat", bannerSrc: "assets/teams/team-wheat-wolves.png" },
  { id: "cornCobras", name: "Cornbelt Cobras", shortName: "CCB", logoSymbol: "fork", bannerSrc: "assets/teams/team-corn-cobras.png" },
  { id: "dustDevils", name: "Dust Devil Dukes", shortName: "DDD", logoSymbol: "windmill", bannerSrc: "assets/teams/team-dust-devils.png" },
  { id: "ridgeRams", name: "Ridgecrest Rams", shortName: "RCR", logoSymbol: "ram", bannerSrc: "assets/teams/team-ridge-rams.png" },
  { id: "meadowMarauders", name: "Meadow Marauders", shortName: "MMR", logoSymbol: "horse", bannerSrc: "assets/teams/team-meadow-marauders.png" },
  { id: "pinePlows", name: "Pine Hollow Plows", shortName: "PHP", logoSymbol: "plow", bannerSrc: "assets/teams/team-pine-plows.png" },
  { id: "saltFlatStallions", name: "Salt Flat Stallions", shortName: "SFS", logoSymbol: "donkey", bannerSrc: "assets/teams/team-salt-flat-stallions.png" },
  { id: "timberTrotters", name: "Timberline Trotters", shortName: "TLT", logoSymbol: "boar", bannerSrc: "assets/teams/team-timber-trotters.png" },
  { id: "bluffBandits", name: "Bluff Creek Bandits", shortName: "BCB", logoSymbol: "skunk", bannerSrc: "assets/teams/team-bluff-bandits.png" },
  { id: "fenFoxes", name: "Fen Marsh Foxes", shortName: "FMF", logoSymbol: "cat", bannerSrc: "assets/teams/team-fen-foxes.png" },
  { id: "gullyGrizz", name: "Gully Grizzlies", shortName: "GGR", logoSymbol: "paw", bannerSrc: "assets/teams/team-gully-grizz.png" },
  { id: "knollKnights", name: "Knoll Hill Knights", shortName: "KHK", logoSymbol: "horn", bannerSrc: "assets/teams/team-knoll-knights.png" },
  { id: "sageStampede", name: "Sagebrush Stampede", shortName: "SBS", logoSymbol: "bison", bannerSrc: "assets/teams/team-sage-stampede.png" },
  { id: "thistleThunder", name: "Thistle Thunder", shortName: "TTH", logoSymbol: "bolt", bannerSrc: "assets/teams/team-thistle-thunder.png" },
  { id: "hollowHawks", name: "Hollow Oak Hawks", shortName: "HOH", logoSymbol: "owl", bannerSrc: "assets/teams/team-hollow-hawks.png" },
  { id: "briarBison", name: "Briar Patch Bison", shortName: "BPB", logoSymbol: "bull", bannerSrc: "assets/teams/team-briar-bison.png" },
  { id: "sootSparrows", name: "Soot Hollow Sparrows", shortName: "SHS", logoSymbol: "crow", bannerSrc: "assets/teams/team-soot-sparrows.png" },
  { id: "loomLightning", name: "Loom Valley Lightning", shortName: "LVL", logoSymbol: "bolt", bannerSrc: "assets/teams/team-loom-lightning.png" },
  { id: "cinderCrows", name: "Cinder Field Crows", shortName: "CFC", logoSymbol: "crow", bannerSrc: "assets/teams/team-cinder-crows.png" },
  { id: "furrowFalcons", name: "Furrow Lane Falcons", shortName: "FLF", logoSymbol: "owl", bannerSrc: "assets/teams/team-furrow-falcons.png" },
  { id: "amberAlpacas", name: "Amber Hills Alpacas", shortName: "AHA", logoSymbol: "sheep", bannerSrc: "assets/teams/team-amber-alpacas.png" },
  { id: "rustRoosters", name: "Rust Belt Roosters", shortName: "RBR", logoSymbol: "rooster", bannerSrc: "assets/teams/team-rust-roosters.png" },
  { id: "valeVipers", name: "Vale Creek Vipers", shortName: "VCV", logoSymbol: "gnat", bannerSrc: "assets/teams/team-vale-vipers.png" }
];

const CORE_TEAMS = {
  noFlyZone: {
    id: "noFlyZone",
    name: "No Fly-Zone",
    shortName: "NFZ",
    logoSymbol: "owl",
    shadowColor: "rgba(120,113,108,0.45)",
    endZoneColor: "#57534e",
    endZoneFontFamily: "'Oswald', sans-serif",
    bannerSrc: "assets/teams/team-no-fly-zone.png",
    roster: {
      qb: { displayLabel: "Nightwing", appearanceId: "nightwing", color: "#78716c", ballAccent: "#fde68a", devTrait: "superstar" },
      wr: { displayLabel: "Pat the Gnat", appearanceId: "patTheGnat", color: "#a8a29e", ballAccent: "#e7e5e4", devTrait: "star" },
      flex: { displayLabel: "Joe", appearanceId: "joeCrow", color: "#171717", ballAccent: "#fbbf24", devTrait: "normal" },
      p4: { displayLabel: "Buzz", appearanceId: "squadA", color: "#64748b", ballAccent: "#fef08a", devTrait: "slow", ability: "swarmHit" },
      p5: { displayLabel: "Nix", appearanceId: "squadB", color: "#0f766e", ballAccent: "#a7f3d0", devTrait: "slow", ability: "nestBlock" }
    }
  },
  pasture: {
    id: "pasture",
    name: "The Barn Raiders",
    shortName: "TBR",
    logoSymbol: "sheep",
    shadowColor: "rgba(132,204,22,0.42)",
    endZoneColor: "#365314",
    endZoneFontFamily: "'Merriweather', Georgia, serif",
    bannerSrc: "assets/teams/team-barn-raiders.png",
    roster: {
      qb: { displayLabel: "Whiskers", appearanceId: "whiskersRat", color: "#6b7280", ballAccent: "#fbcfe8", devTrait: "star" },
      wr: { displayLabel: "Wooly", appearanceId: "woolySheep", color: "#fafaf9", ballAccent: "#d6d3d1", devTrait: "normal" },
      flex: { displayLabel: "Billy", appearanceId: "billyGoat", color: "#d6c4a8", ballAccent: "#fef3c7", devTrait: "superstar" },
      p4: { displayLabel: "Clove", appearanceId: "squadA", color: "#84cc16", ballAccent: "#f7fee7", devTrait: "slow", ability: "cloverLuck" },
      p5: { displayLabel: "Bram", appearanceId: "squadB", color: "#3f6212", ballAccent: "#d9f99d", devTrait: "normal", ability: "brambleRun" }
    }
  },
  barnaby: {
    id: "barnaby",
    name: "The Haymakers",
    shortName: "HAY",
    logoSymbol: "donkey",
    shadowColor: "rgba(59,130,246,0.42)",
    endZoneColor: "#1d4ed8",
    endZoneFontFamily: "'Anton', sans-serif",
    bannerSrc: "assets/teams/team-haymakers.png",
    roster: {
      qb: { displayLabel: "Barnaby", appearanceId: "player1", color: COLORS.donkey, ballAccent: "#bfdbfe", devTrait: "superstar" },
      wr: { displayLabel: "Sir Neigh-a-Lot", appearanceId: "allyHorse", color: COLORS.horse, ballAccent: "#fed7aa", devTrait: "star" },
      flex: { displayLabel: "Lil' Tunnel Pete", appearanceId: "lilTunnelPete", color: "#c8a97e", ballAccent: "#fef08a", devTrait: "normal" },
      p4: { displayLabel: "Duke", appearanceId: "squadA", color: "#4c1d95", ballAccent: "#e9d5ff", devTrait: "slow", ability: "royalGuard" },
      p5: { displayLabel: "Dusty", appearanceId: "squadB", color: "#713f12", ballAccent: "#fde68a", devTrait: "slow", ability: "dustCloud" }
    }
  },
  professorPig: {
    id: "professorPig",
    name: "The Mudsketeers",
    shortName: "MUD",
    logoSymbol: "pig",
    shadowColor: "rgba(236,72,153,0.42)",
    endZoneColor: "#be185d",
    endZoneFontFamily: "'Bangers', cursive",
    bannerSrc: "assets/teams/team-mudsketeers.png",
    roster: {
      qb: { displayLabel: "Professor Pig", appearanceId: "player2", color: COLORS.pig, ballAccent: "#fbcfe8", devTrait: "star" },
      wr: { displayLabel: "Deputy Hee-Haw", appearanceId: "allyDonkey", color: COLORS.sidekickDonkey, ballAccent: "#bbf7d0", devTrait: "normal" },
      flex: { displayLabel: "Big Coop", appearanceId: "cluckNorris", color: "#ffffff", ballAccent: "#fca5a5", devTrait: "superstar" },
      p4: { displayLabel: "Grit", appearanceId: "squadA", color: "#1e1b4b", ballAccent: "#c4b5fd", devTrait: "slow", ability: "mudGrit" },
      p5: { displayLabel: "Slink", appearanceId: "squadB", color: "#0c4a6e", ballAccent: "#bae6fd", devTrait: "normal", ability: "slinkCuts" }
    }
  },
  creekCrew: {
    id: "creekCrew",
    name: "The Creek Crew",
    shortName: "CRK",
    logoSymbol: "duck",
    shadowColor: "rgba(13,148,136,0.42)",
    endZoneColor: "#0f766e",
    endZoneFontFamily: "'Permanent Marker', cursive",
    bannerSrc: "assets/teams/team-creek-crew.png",
    roster: {
      qb: { displayLabel: "Rex", appearanceId: "daxBadger", color: "#4b5563", ballAccent: "#fbbf24", devTrait: "star" },
      wr: { displayLabel: "Fuzz", appearanceId: "bessCow", color: "#e7e5e4", ballAccent: "#fecdd3", devTrait: "normal" },
      flex: { displayLabel: "Vex", appearanceId: "tuckDuck", color: "#0d9488", ballAccent: "#5eead4", devTrait: "star" },
      p4: { displayLabel: "Pip", appearanceId: "squadA", color: "#c026d3", ballAccent: "#f5d0fe", devTrait: "slow", ability: "creekCurrent" },
      p5: { displayLabel: "Oz", appearanceId: "squadB", color: "#0e7490", ballAccent: "#a5f3fc", devTrait: "slow", ability: "deepSnap" }
    }
  }
};

const LEAGUE_NICKNAMES = [
  "Ace", "Beans", "Chip", "Dash", "Echo", "Flip", "Goose", "Haze", "Ivy", "Jinx",
  "Kite", "Lark", "Mox", "Nip", "Onyx", "Pike", "Quip", "Rook", "Sly", "Tusk",
  "Umber", "Vex", "Wisp", "Yip", "Zest", "Ash", "Bolt", "Cove", "Dart", "Elm"
];

function leagueHash(seed) {
  let h = (seed | 0) + 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function buildLeagueUniquePlayerNames(count) {
  const names = [];
  const used = new Set();
  let i = 0;
  while (names.length < count && i < 5000) {
    const fi = Math.floor(leagueHash(i * 3) * LEAGUE_FIRST_NAMES.length);
    const li = Math.floor(leagueHash(i * 5 + 7) * LEAGUE_LAST_NAMES.length);
    const ni = Math.floor(leagueHash(i * 11 + 3) * LEAGUE_NICKNAMES.length);
    const style = i % 4;
    let label = "";
    if (style === 0) label = `${LEAGUE_FIRST_NAMES[fi]} "${LEAGUE_NICKNAMES[ni]}" ${LEAGUE_LAST_NAMES[li]}`;
    else if (style === 1) label = `${LEAGUE_FIRST_NAMES[fi]} ${LEAGUE_LAST_NAMES[li]}`;
    else if (style === 2) label = `${LEAGUE_NICKNAMES[ni]} ${LEAGUE_LAST_NAMES[li]}`;
    else label = `${LEAGUE_FIRST_NAMES[fi]} ${LEAGUE_LAST_NAMES[li]}-${LEAGUE_NICKNAMES[ni]}`;
    if (!used.has(label)) {
      used.add(label);
      names.push(label);
    }
    i += 1;
  }
  return names;
}

const LEAGUE_UNIQUE_PLAYER_NAMES = buildLeagueUniquePlayerNames(352);

function pickLeagueTrait(slot, teamIdx, playerIdx) {
  const roll = leagueHash(teamIdx * 97 + playerIdx * 13 + slot.charCodeAt(0));
  if (slot === "qb") {
    if (roll < 0.22) return "superstar";
    if (roll < 0.52) return "star";
    return "normal";
  }
  if (slot === "wr" || slot === "flex") {
    if (roll < 0.12) return "superstar";
    if (roll < 0.38) return "star";
    if (roll < 0.78) return "normal";
    return "slow";
  }
  if (roll < 0.08) return "star";
  if (roll < 0.42) return "normal";
  return "slow";
}

function buildLeaguePlayerAttrs(slot, teamIdx, playerIdx, trait) {
  const baseRoll = leagueHash(teamIdx * 31 + playerIdx * 17);
  const tierBoost = trait === "superstar" ? 0.14 : trait === "star" ? 0.08 : trait === "normal" ? 0.02 : -0.06;
  const base = 0.76 + baseRoll * 0.28 + tierBoost;
  const attrs = {};
  const defAttrs = {};
  for (const k of ATTRIBUTE_KEYS) {
    attrs[k] = base + (leagueHash(teamIdx + playerIdx + k.length) - 0.5) * 0.18;
  }
  for (const k of DEF_ATTRIBUTE_KEYS) {
    defAttrs[k] = base + (leagueHash(teamIdx * 2 + playerIdx + k.length) - 0.5) * 0.18;
  }
  if (slot === "qb") { attrs.speed += 0.04; attrs.catch += 0.03; defAttrs.awareness += 0.05; }
  if (slot === "wr") { attrs.speed += 0.06; attrs.catch += 0.08; defAttrs.coverage += 0.04; }
  if (slot === "flex") { attrs.elusiveness += 0.04; defAttrs.coverage += 0.03; }
  if (slot === "p4") { attrs.speed += 0.05; attrs.elusiveness += 0.03; }
  if (slot === "p5") { attrs.power += 0.08; attrs.strength += 0.06; defAttrs.strength += 0.08; }
  if (isBenchRosterSlot(slot)) { attrs.elusiveness += 0.02; defAttrs.coverage += 0.02; }
  return { attrs, defAttrs };
}

function buildLeagueRosterEntry(teamIdx, globalIdx, slot) {
  const trait = pickLeagueTrait(slot, teamIdx, globalIdx);
  const { attrs, defAttrs } = buildLeaguePlayerAttrs(slot, teamIdx, globalIdx, trait);
  const displayLabel = LEAGUE_UNIQUE_PLAYER_NAMES[globalIdx] || `Player ${globalIdx + 1}`;
  const appearanceId = LEAGUE_APPEARANCE_POOL[(globalIdx * 3 + teamIdx) % LEAGUE_APPEARANCE_POOL.length];
  const ability = LEAGUE_ABILITY_POOL[(globalIdx + teamIdx) % LEAGUE_ABILITY_POOL.length];
  const palette = LEAGUE_TEAM_PALETTES[teamIdx % LEAGUE_TEAM_PALETTES.length];
  const colorRoll = leagueHash(teamIdx * 19 + globalIdx);
  const hue = Math.floor(leagueHash(globalIdx * 13) * 360);
  return {
    displayLabel,
    appearanceId,
    color: colorRoll > 0.4 ? `hsl(${hue}, 48%, ${40 + Math.floor(leagueHash(globalIdx) * 16)}%)` : palette.color,
    ballAccent: palette.accent,
    devTrait: trait,
    ability,
    attrs,
    defAttrs
  };
}

function buildFullTeamRoster(teamIdx) {
  const roster = {};
  for (let si = 0; si < ROSTER_SLOT_KEYS.length; si += 1) {
    const slot = ROSTER_SLOT_KEYS[si];
    const globalIdx = teamIdx * ROSTER_MAX_PLAYERS + si;
    roster[slot] = buildLeagueRosterEntry(teamIdx, globalIdx, slot);
  }
  return roster;
}

function ensureTeamRosterFull(team, teamIdx) {
  if (!team) return;
  if (!team.roster) team.roster = {};
  for (let si = 0; si < ROSTER_SLOT_KEYS.length; si += 1) {
    const slot = ROSTER_SLOT_KEYS[si];
    if (!team.roster[slot]) {
      const globalIdx = teamIdx * ROSTER_MAX_PLAYERS + si;
      team.roster[slot] = buildLeagueRosterEntry(teamIdx, globalIdx, slot);
    }
  }
}

function buildGeneratedRoster(teamIdx) {
  return buildFullTeamRoster(teamIdx);
}

function buildGeneratedTeam(meta, teamIdx) {
  const palette = LEAGUE_TEAM_PALETTES[teamIdx % LEAGUE_TEAM_PALETTES.length];
  return {
    id: meta.id,
    name: meta.name,
    shortName: meta.shortName,
    logoSymbol: meta.logoSymbol,
    shadowColor: palette.shadow,
    endZoneColor: palette.endZone,
    endZoneFontFamily: LEAGUE_FONT_POOL[teamIdx % LEAGUE_FONT_POOL.length],
    bannerSrc: meta.bannerSrc,
    roster: buildGeneratedRoster(teamIdx)
  };
}

function buildLeagueTeams() {
  const teams = { ...CORE_TEAMS };
  for (let i = 0; i < LEAGUE_GENERATED_META.length; i += 1) {
    const meta = LEAGUE_GENERATED_META[i];
    const teamIdx = i + 5;
    teams[meta.id] = buildGeneratedTeam(meta, teamIdx);
  }
  return teams;
}

const TEAMS = buildLeagueTeams();
const PLAY_TEAM_IDS = [
  "noFlyZone", "pasture", "barnaby", "professorPig", "creekCrew",
  ...LEAGUE_GENERATED_META.map((m) => m.id)
];
for (let i = 0; i < PLAY_TEAM_IDS.length; i += 1) {
  ensureTeamRosterFull(TEAMS[PLAY_TEAM_IDS[i]], i);
}
