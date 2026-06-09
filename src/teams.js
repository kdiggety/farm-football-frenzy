// =========================================================
// Play mode — 32 teams, 11-man rosters (5 starters on field + up to 6 bench)
// TEAMS and PLAY_TEAM_IDS are built in leagueTeams.js
// =========================================================

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
  const BANNER_H = 92;
  const NAME_H = 28;
  const ROSTER_ROW_H = 50;
  const ROSTER_BLOCK = ROSTER_ROW_H * 5 + 8;
  const bigH = PAD + BANNER_H + NAME_H + 4 + ROSTER_BLOCK + PAD;
  const y0 = 50;
  const x0 = M;
  const w0 = canvas.width - 2 * M;
  const yNav = y0 + bigH + 8;
  return { M, PAD, BANNER_H, NAME_H, ROSTER_BLOCK, ROSTER_ROW_H, bigH, y0, x0, w0, yNav };
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
const ROSTER_FIELD_KEYS = ROSTER_STARTER_KEYS.slice(0, 3);
const ROSTER_ALL_KEYS = ROSTER_STARTER_KEYS;

function getFullTeamRosterTextLine(T) {
  const starters = ROSTER_STARTER_KEYS.map((k) => T.roster[k].displayLabel).join(", ");
  const benchCount = countRosterPlayers(T.roster) - ROSTER_STARTER_KEYS.length;
  return benchCount > 0 ? `${starters} (+${benchCount} bench)` : starters;
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

function getTeamSelectLayout() {
  const g = getTeamSelectGeometry();
  return {
    back: { x: 20, y: 14, w: 118, h: 32 },
    devGuide: { x: canvas.width / 2 - 92, y: 14, w: 184, h: 32 },
    start: { x: canvas.width / 2 - 130, y: g.yNav + 32, w: 260, h: 40 },
    bigCard: { x: g.x0, y: g.y0, w: g.w0, h: g.bigH },
    pad: g.PAD,
    bannerH: g.BANNER_H,
    nameStripH: g.NAME_H,
    rosterRowH: g.ROSTER_ROW_H
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

function applySkin(entity, skin, teamTag, scoreOwner, slotKey) {
  if (entity.baseSpeed == null) entity.baseSpeed = entity.speed;
  entity.displayLabel = skin.displayLabel;
  if (skin.legacyLabel) entity.legacyLabel = skin.legacyLabel; else delete entity.legacyLabel;
  entity.appearanceId = skin.appearanceId;
  entity.color = skin.color;
  entity.ballAccent = skin.ballAccent;
  entity.teamOwnerId = scoreOwner;
  entity.teamTag = teamTag;
  entity.teamShadowColor = getTeamShadowColorForTag(teamTag);
  entity.rosterSlotKey = slotKey || null;
  applyEntityAttributes(entity, skin, slotKey);
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
  applySkin(player1, O.qb, offenseTeamId, offOwner, "qb");
  applySkin(allyHorse, O.wr, offenseTeamId, offOwner, "wr");
  applySkin(lilTunnelPete, O.flex, offenseTeamId, offOwner, "flex");
  applySkin(offenseP4, O.p4, offenseTeamId, offOwner, "p4");
  applySkin(offenseP5, O.p5, offenseTeamId, offOwner, "p5");
  applySkin(player2, D.qb, defenseTeamId, defOwner, "qb");
  applySkin(allyDonkey, D.wr, defenseTeamId, defOwner, "wr");
  applySkin(cluckNorris, D.flex, defenseTeamId, defOwner, "flex");
  applySkin(defenseP4, D.p4, defenseTeamId, defOwner, "p4");
  applySkin(defenseP5, D.p5, defenseTeamId, defOwner, "p5");
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
