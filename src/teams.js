// =========================================================
// Play mode teams — four playable sides; CPU is random among the rest
// =========================================================

const PLAY_TEAM_IDS = ["noFlyZone", "pasture", "barnaby", "professorPig"];

const TEAMS = {
  noFlyZone: {
    id: "noFlyZone",
    name: "No Fly-Zone",
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
      }
    }
  },
  pasture: {
    id: "pasture",
    name: "The Barn Raiders",
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
      }
    }
  },
  barnaby: {
    id: "barnaby",
    name: "The Haymakers",
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
      }
    }
  },
  professorPig: {
    id: "professorPig",
    name: "The Mudsketeers",
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
      }
    }
  }
};

/** Hit targets for team selection screen (canvas coords). Four cards in a 2×2 grid. */
function getTeamSelectLayout() {
  const cardW = 280;
  const cardH = 158;
  const gap = 22;
  const pairW = cardW * 2 + gap;
  const leftX = (canvas.width - pairW) / 2;
  const y1 = 128;
  const y2 = y1 + cardH + 20;
  return {
    noFlyZone: { x: leftX, y: y1, w: cardW, h: cardH },
    pasture: { x: leftX + cardW + gap, y: y1, w: cardW, h: cardH },
    barnaby: { x: leftX, y: y2, w: cardW, h: cardH },
    professorPig: { x: leftX + cardW + gap, y: y2, w: cardW, h: cardH },
    start: { x: canvas.width / 2 - 130, y: 476, w: 260, h: 50 },
    back: { x: 24, y: 24, w: 100, h: 36 }
  };
}

/** Matchup confirmation — Play vs Change team. */
function getOpponentRevealLayout() {
  const cx = canvas.width / 2;
  return {
    play: { x: cx - 130, y: 392, w: 260, h: 52 },
    changeTeam: { x: cx - 130, y: 454, w: 260, h: 40 },
    back: { x: 24, y: 24, w: 120, h: 36 }
  };
}

function applySkin(entity, skin, teamTag, scoreOwner) {
  entity.displayLabel = skin.displayLabel;
  entity.appearanceId = skin.appearanceId;
  entity.color = skin.color;
  entity.ballAccent = skin.ballAccent;
  entity.teamOwnerId = scoreOwner;
  entity.teamTag = teamTag;
}

/**
 * @param {string} offenseTeamId - TEAMS key on offense (player1, horse, pete)
 * @param {string} defenseTeamId - TEAMS key on defense (player2, donkey, cluck)
 */
function applyPlayModeTeamLayout(offenseTeamId, defenseTeamId) {
  const userId = game.playUserTeamId;
  const cpuId = game.playCpuTeamId;
  const O = TEAMS[offenseTeamId].roster;
  const D = TEAMS[defenseTeamId].roster;

  const offOwner = offenseTeamId === userId ? "player1" : "player2";
  const defOwner = defenseTeamId === userId ? "player1" : "player2";

  applySkin(player1, O.qb, offenseTeamId, offOwner);
  applySkin(allyHorse, O.wr, offenseTeamId, offOwner);
  applySkin(lilTunnelPete, O.flex, offenseTeamId, offOwner);

  applySkin(player2, D.qb, defenseTeamId, defOwner);
  applySkin(allyDonkey, D.wr, defenseTeamId, defOwner);
  applySkin(cluckNorris, D.flex, defenseTeamId, defOwner);
}

function resetPlayModeTeamScores() {
  game.teamScores = {
    noFlyZone: 0,
    pasture: 0,
    barnaby: 0,
    professorPig: 0
  };
}

/** CPU opponent: uniform random among the three teams you did not pick. */
function pickRandomCpuOpponent(userTeamId) {
  const pool = PLAY_TEAM_IDS.filter((id) => id !== userTeamId);
  return pool[Math.floor(Math.random() * pool.length)];
}
