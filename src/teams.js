// =========================================================
// Play mode — 5 teams, 5 players each (3 on the field: qb, wr, flex; p4 & p5 are full squad in pick screen)
// =========================================================

const PLAY_TEAM_IDS = ["noFlyZone", "pasture", "barnaby", "professorPig", "creekCrew"];

function getTeamSelectPageCount() {
  return PLAY_TEAM_IDS.length;
}

function getTeamIdForTeamSelectPage(pageIndex) {
  const n = getTeamSelectPageCount();
  if (n === 0) {
    return null;
  }
  return PLAY_TEAM_IDS[Math.max(0, Math.min(n - 1, pageIndex | 0))];
}

function getTeamSelectGeometry() {
  const M = 32;
  const PAD = 12;
  const BANNER_H = 200;
  const NAME_H = 26;
  const ROSTER_BLOCK = 90;
  const bigH = PAD + BANNER_H + NAME_H + 4 + ROSTER_BLOCK + PAD;
  const y0 = 64;
  const x0 = M;
  const w0 = canvas.width - 2 * M;
  const yNav = y0 + bigH + 10;
  return { M, PAD, BANNER_H, NAME_H, ROSTER_BLOCK, bigH, y0, x0, w0, yNav };
}

function getTeamSelectPageNavRects() {
  if (getTeamSelectPageCount() <= 1) {
    return null;
  }
  const g = getTeamSelectGeometry();
  const y = g.yNav;
  const cx = canvas.width / 2;
  return {
    prev: { x: cx - 86, y, w: 72, h: 32 },
    next: { x: cx + 14, y, w: 72, h: 32 }
  };
}
const ROSTER_FIELD_KEYS = ["qb", "wr", "flex"];
const ROSTER_ALL_KEYS = ["qb", "wr", "flex", "p4", "p5"];

function getFullTeamRosterTextLine(T) {
  return ROSTER_ALL_KEYS.map((k) => T.roster[k].displayLabel).join(", ");
}

function hexToRgba(hex, alpha) {
  const raw = String(hex || "").replace("#", "");
  if (raw.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getTeamShadowColorForTag(teamTag) {
  const team = teamTag && TEAMS[teamTag];
  if (!team) return "rgba(0,0,0,0.28)";
  if (team.shadowColor) return team.shadowColor;
  return hexToRgba(team.roster.qb.color, 0.42);
}

function getPlayerShadowColor(player) {
  if (player && player.teamShadowColor) return player.teamShadowColor;
  if (player && player.teamTag) return getTeamShadowColorForTag(player.teamTag);
  if (player && player.color) return hexToRgba(player.color, 0.38);
  return "rgba(0,0,0,0.28)";
}

const TEAMS = {
  noFlyZone: {
    id: "noFlyZone",
    name: "No Fly-Zone",
    shadowColor: "rgba(120,113,108,0.45)",
    endZoneColor: "#57534e",
    endZoneFontFamily: "'Oswald', sans-serif",
    bannerSrc: "assets/teams/team-no-fly-zone.png",
    roster: {
      qb: {
        displayLabel: "Nightwing",
        appearanceId: "nightwing",
        color: "#78716c",
        ballAccent: "#fde68a"
      },
      wr: {
        displayLabel: "Pat the Gnat",
        appearanceId: "patTheGnat",
        color: "#a8a29e",
        ballAccent: "#e7e5e4"
      },
      flex: {
        displayLabel: "Joe",
        appearanceId: "joeCrow",
        color: "#171717",
        ballAccent: "#fbbf24"
      },
      p4: { displayLabel: "Buzz", appearanceId: "squadA", color: "#64748b", ballAccent: "#fef08a" },
      p5: { displayLabel: "Nix", appearanceId: "squadB", color: "#0f766e", ballAccent: "#a7f3d0" }
    }
  },
  pasture: {
    id: "pasture",
    name: "The Barn Raiders",
    shadowColor: "rgba(132,204,22,0.42)",
    endZoneColor: "#365314",
    endZoneFontFamily: "'Merriweather', Georgia, serif",
    bannerSrc: "assets/teams/team-barn-raiders.png",
    roster: {
      qb: {
        displayLabel: "Whiskers",
        appearanceId: "whiskersRat",
        color: "#6b7280",
        ballAccent: "#fbcfe8"
      },
      wr: {
        displayLabel: "Wooly",
        appearanceId: "woolySheep",
        color: "#fafaf9",
        ballAccent: "#d6d3d1"
      },
      flex: {
        displayLabel: "Billy",
        appearanceId: "billyGoat",
        color: "#d6c4a8",
        ballAccent: "#fef3c7"
      },
      p4: { displayLabel: "Clove", appearanceId: "squadA", color: "#84cc16", ballAccent: "#f7fee7" },
      p5: { displayLabel: "Bram", appearanceId: "squadB", color: "#3f6212", ballAccent: "#d9f99d" }
    }
  },
  barnaby: {
    id: "barnaby",
    name: "The Haymakers",
    shadowColor: "rgba(59,130,246,0.42)",
    endZoneColor: "#1d4ed8",
    endZoneFontFamily: "'Anton', sans-serif",
    bannerSrc: "assets/teams/team-haymakers.png",
    roster: {
      qb: {
        displayLabel: "Barnaby",
        appearanceId: "player1",
        color: COLORS.donkey,
        ballAccent: "#bfdbfe"
      },
      wr: {
        displayLabel: "Sir Neigh-a-Lot",
        appearanceId: "allyHorse",
        color: COLORS.horse,
        ballAccent: "#fed7aa"
      },
      flex: {
        displayLabel: "Lil' Tunnel Pete",
        appearanceId: "lilTunnelPete",
        color: "#c8a97e",
        ballAccent: "#fef08a"
      },
      p4: { displayLabel: "Duke", appearanceId: "squadA", color: "#4c1d95", ballAccent: "#e9d5ff" },
      p5: { displayLabel: "Dusty", appearanceId: "squadB", color: "#713f12", ballAccent: "#fde68a" }
    }
  },
  professorPig: {
    id: "professorPig",
    name: "The Mudsketeers",
    shadowColor: "rgba(236,72,153,0.42)",
    endZoneColor: "#be185d",
    endZoneFontFamily: "'Bangers', cursive",
    bannerSrc: "assets/teams/team-mudsketeers.png",
    roster: {
      qb: {
        displayLabel: "Professor Pig",
        appearanceId: "player2",
        color: COLORS.pig,
        ballAccent: "#fbcfe8"
      },
      wr: {
        displayLabel: "Deputy Hee-Haw",
        appearanceId: "allyDonkey",
        color: COLORS.sidekickDonkey,
        ballAccent: "#bbf7d0"
      },
      flex: {
        displayLabel: "Big Coop",
        appearanceId: "cluckNorris",
        color: "#ffffff",
        ballAccent: "#fca5a5"
      },
      p4: { displayLabel: "Grit", appearanceId: "squadA", color: "#1e1b4b", ballAccent: "#c4b5fd" },
      p5: { displayLabel: "Slink", appearanceId: "squadB", color: "#0c4a6e", ballAccent: "#bae6fd" }
    }
  },
  creekCrew: {
    id: "creekCrew",
    name: "The Creek Crew",
    shadowColor: "rgba(13,148,136,0.42)",
    endZoneColor: "#0f766e",
    endZoneFontFamily: "'Permanent Marker', cursive",
    bannerSrc: "assets/teams/team-creek-crew.png",
    roster: {
      qb: {
        displayLabel: "Rex",
        appearanceId: "daxBadger",
        color: "#4b5563",
        ballAccent: "#fbbf24"
      },
      wr: {
        displayLabel: "Fuzz",
        appearanceId: "bessCow",
        color: "#e7e5e4",
        ballAccent: "#fecdd3"
      },
      flex: {
        displayLabel: "Vex",
        appearanceId: "tuckDuck",
        color: "#0d9488",
        ballAccent: "#5eead4"
      },
      p4: { displayLabel: "Pip", appearanceId: "squadA", color: "#c026d3", ballAccent: "#f5d0fe" },
      p5: { displayLabel: "Oz", appearanceId: "squadB", color: "#0e7490", ballAccent: "#a5f3fc" }
    }
  }
};

function getTeamSelectLayout() {
  const g = getTeamSelectGeometry();
  return {
    back: { x: 20, y: 14, w: 118, h: 32 },
    start: { x: canvas.width / 2 - 130, y: 458, w: 260, h: 40 },
    bigCard: { x: g.x0, y: g.y0, w: g.w0, h: g.bigH },
    pad: g.PAD,
    bannerH: g.BANNER_H,
    nameStripH: g.NAME_H
  };
}

function getOpponentRevealLayout() {
  const cx = canvas.width / 2;
  return {
    play: { x: cx - 130, y: 392, w: 260, h: 52 },
    changeTeam: { x: cx - 130, y: 454, w: 260, h: 40 },
    back: { x: 24, y: 24, w: 120, h: 36 }
  };
}

function applySkin(entity, skin, teamTag, scoreOwner) {
  if (entity.baseSpeed == null) entity.baseSpeed = entity.speed;
  entity.displayLabel = skin.displayLabel;
  if (skin.legacyLabel) entity.legacyLabel = skin.legacyLabel; else delete entity.legacyLabel;
  entity.appearanceId = skin.appearanceId;
  entity.color = skin.color;
  entity.ballAccent = skin.ballAccent;
  entity.teamOwnerId = scoreOwner;
  entity.teamTag = teamTag;
  entity.teamShadowColor = getTeamShadowColorForTag(teamTag);
  // Tune by roster character: only Joe should be slower.
  entity.speed = skin.displayLabel === "Joe" ? entity.baseSpeed * 0.62 : entity.baseSpeed;
}

/**
 * @param {string} offenseTeamId
 * @param {string} defenseTeamId
 */
function applyPlayModeTeamLayout(offenseTeamId, defenseTeamId) {
  const userId = game.playUserTeamId;
  const O = TEAMS[offenseTeamId].roster;
  const D = TEAMS[defenseTeamId].roster;
  const offOwner = offenseTeamId === userId ? "player1" : "player2";
  const defOwner = defenseTeamId === userId ? "player1" : "player2";
  applySkin(player1, O.qb, offenseTeamId, offOwner);
  applySkin(allyHorse, O.wr, offenseTeamId, offOwner);
  applySkin(lilTunnelPete, O.flex, offenseTeamId, offOwner);
  applySkin(offenseP4, O.p4, offenseTeamId, offOwner);
  applySkin(offenseP5, O.p5, offenseTeamId, offOwner);
  applySkin(player2, D.qb, defenseTeamId, defOwner);
  applySkin(allyDonkey, D.wr, defenseTeamId, defOwner);
  applySkin(cluckNorris, D.flex, defenseTeamId, defOwner);
  applySkin(defenseP4, D.p4, defenseTeamId, defOwner);
  applySkin(defenseP5, D.p5, defenseTeamId, defOwner);
}

function resetPlayModeTeamScores() {
  const o = {};
  for (const id of PLAY_TEAM_IDS) o[id] = 0;
  game.teamScores = o;
}

function pickRandomCpuOpponent(userTeamId) {
  const pool = PLAY_TEAM_IDS.filter((id) => id !== userTeamId);
  return pool[Math.floor(Math.random() * pool.length)];
}

function getLeftEndZoneTeamId() {
  if (player2.teamTag && TEAMS[player2.teamTag]) return player2.teamTag;
  if (game.playUserTeamId && game.playCpuTeamId) return game.playCpuTeamId;
  return "professorPig";
}

function getRightEndZoneTeamId() {
  if (player1.teamTag && TEAMS[player1.teamTag]) return player1.teamTag;
  if (game.playUserTeamId && TEAMS[game.playUserTeamId]) return game.playUserTeamId;
  return "barnaby";
}

function getTeamEndZoneColor(teamId) {
  const team = teamId && TEAMS[teamId];
  if (team && team.endZoneColor) return team.endZoneColor;
  return teamId === "barnaby" ? COLORS.rightEndZone : COLORS.leftEndZone;
}

function getEndZoneLabelFont(teamId, nameLength) {
  const family = (teamId && TEAMS[teamId] && TEAMS[teamId].endZoneFontFamily)
    ? TEAMS[teamId].endZoneFontFamily
    : "Arial, sans-serif";
  const fontPx = nameLength > 20 ? 13 : nameLength > 14 ? 16 : 22;
  return `bold ${fontPx}px ${family}`;
}
