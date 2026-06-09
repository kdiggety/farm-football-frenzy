// =========================================================
// Franchise league — 2 conferences, 8 divisions (4 teams each)
// =========================================================

const FRANCHISE_CONFERENCES = {
  barn: { id: "barn", name: "Barnyard Conference", short: "BARN" },
  field: { id: "field", name: "Field Conference", short: "FIELD" }
};

const FRANCHISE_CONFERENCE_IDS = ["barn", "field"];
const FRANCHISE_PLAYOFF_TEAMS_PER_CONF = 8;
const FRANCHISE_DIVISION_PAIRINGS = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];

const FRANCHISE_DIVISIONS = [
  { id: "northHay", name: "North Hay", conference: "barn", teamIds: ["noFlyZone", "ironAcres", "ridgeRams", "hollowHawks"] },
  { id: "eastSilo", name: "East Silo", conference: "barn", teamIds: ["siloStorm", "meadowMarauders", "knollKnights", "cinderCrows"] },
  { id: "southPasture", name: "South Pasture", conference: "barn", teamIds: ["pasture", "wheatWolves", "fenFoxes", "amberAlpacas"] },
  { id: "westCreek", name: "West Creek", conference: "barn", teamIds: ["creekCrew", "bluffBandits", "furrowFalcons", "valeVipers"] },
  { id: "centralBarn", name: "Central Barn", conference: "field", teamIds: ["barnaby", "haywireHc", "pinePlows", "sageStampede"] },
  { id: "metroMud", name: "Metro Mud", conference: "field", teamIds: ["professorPig", "gravelRun", "gullyGrizz", "sootSparrows"] },
  { id: "prairieCorn", name: "Prairie Corn", conference: "field", teamIds: ["cornCobras", "dustDevils", "thistleThunder", "rustRoosters"] },
  { id: "timberCoast", name: "Timber Coast", conference: "field", teamIds: ["timberTrotters", "saltFlatStallions", "briarBison", "loomLightning"] }
];

const FRANCHISE_TEAM_DIVISION = {};
const FRANCHISE_TEAM_CONFERENCE = {};
for (const div of FRANCHISE_DIVISIONS) {
  for (const tid of div.teamIds) {
    FRANCHISE_TEAM_DIVISION[tid] = div.id;
    FRANCHISE_TEAM_CONFERENCE[tid] = div.conference;
  }
}

function getTeamDivision(teamId) {
  const divId = FRANCHISE_TEAM_DIVISION[teamId];
  return FRANCHISE_DIVISIONS.find((d) => d.id === divId) || null;
}

function getTeamConference(teamId) {
  const confId = FRANCHISE_TEAM_CONFERENCE[teamId];
  return confId ? FRANCHISE_CONFERENCES[confId] : null;
}

function getTeamConferenceId(teamId) {
  return FRANCHISE_TEAM_CONFERENCE[teamId] || null;
}

function getConferenceTeamIds(conferenceId) {
  return FRANCHISE_DIVISIONS.filter((d) => d.conference === conferenceId).flatMap((d) => d.teamIds);
}

function getDivisionTeamIds(divisionId) {
  const div = FRANCHISE_DIVISIONS.find((d) => d.id === divisionId);
  return div ? div.teamIds.slice() : [];
}

function franchisePairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function leagueScheduleShuffle(list, week) {
  const out = list.slice();
  let seed = week * 1103515245 + 12345;
  for (let i = out.length - 1; i > 0; i -= 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function buildDivisionSeasonGames() {
  const games = [];
  let week = 1;
  for (let pass = 0; pass < 2; pass += 1) {
    for (let pi = 0; pi < 3; pi += 1) {
      const [aIdx, bIdx] = FRANCHISE_DIVISION_PAIRINGS[pi];
      for (const div of FRANCHISE_DIVISIONS) {
        const ids = div.teamIds;
        const home = pass === 0 ? ids[aIdx] : ids[bIdx];
        const away = pass === 0 ? ids[bIdx] : ids[aIdx];
        games.push({
          week,
          home,
          away,
          played: false,
          homeScore: null,
          awayScore: null,
          playoff: false,
          division: div.id,
          conference: div.conference
        });
      }
      week += 1;
    }
  }
  return { games, nextWeek: week };
}

function teamsSameDivision(teamA, teamB) {
  return FRANCHISE_TEAM_DIVISION[teamA] === FRANCHISE_TEAM_DIVISION[teamB];
}

function getOtherDivisionsInConference(divisionId) {
  const div = FRANCHISE_DIVISIONS.find((d) => d.id === divisionId);
  if (!div) return [];
  return FRANCHISE_DIVISIONS.filter((d) => d.conference === div.conference && d.id !== divisionId);
}

function buildNonDivisionGames(season = 1) {
  const pending = [];
  const rot = (Math.max(1, season | 0) - 1) % 3;

  for (const teamId of PLAY_TEAM_IDS) {
    const div = getTeamDivision(teamId);
    if (!div) continue;
    const sameConfOthers = getOtherDivisionsInConference(div.id);
    const crossConfDivs = FRANCHISE_DIVISIONS.filter((d) => d.conference !== div.conference);
    const teamIdx = PLAY_TEAM_IDS.indexOf(teamId);

    const intraDiv = sameConfOthers[rot % sameConfOthers.length];
    if (intraDiv) {
      for (const opp of intraDiv.teamIds) pending.push([teamId, opp]);
    }

    const crossDiv = crossConfDivs[rot % crossConfDivs.length];
    if (crossDiv) {
      for (const opp of crossDiv.teamIds) pending.push([teamId, opp]);
    }

    const remaining = sameConfOthers.filter((d) => d.id !== (intraDiv && intraDiv.id));
    for (let i = 0; i < remaining.length; i += 1) {
      const remDiv = remaining[i];
      pending.push([teamId, remDiv.teamIds[teamIdx % remDiv.teamIds.length]]);
    }
  }

  const uniqueGames = [];
  const seen = new Set();
  for (const [a, b] of pending) {
    if (teamsSameDivision(a, b)) continue;
    const key = franchisePairKey(a, b);
    if (seen.has(key)) continue;
    seen.add(key);
    const seed = leagueHash(a.charCodeAt(0) + b.charCodeAt(0) + season * 31);
    const home = seed < 0.5 ? a : b;
    const away = home === a ? b : a;
    uniqueGames.push({ home, away });
  }
  return uniqueGames;
}

function assignWeeksToGames(games, startWeek, endWeek) {
  const result = [];
  const teamWeeks = {};
  for (const id of PLAY_TEAM_IDS) teamWeeks[id] = new Set();

  const unassigned = games.slice();
  let week = startWeek;
  let guard = 0;
  while (unassigned.length && week <= endWeek + 4 && guard < 40) {
    const busy = new Set();
    for (let i = unassigned.length - 1; i >= 0; i -= 1) {
      const g = unassigned[i];
      if (busy.has(g.home) || busy.has(g.away)) continue;
      if (teamWeeks[g.home].has(week) || teamWeeks[g.away].has(week)) continue;
      busy.add(g.home);
      busy.add(g.away);
      teamWeeks[g.home].add(week);
      teamWeeks[g.away].add(week);
      result.push({
        week,
        home: g.home,
        away: g.away,
        played: false,
        homeScore: null,
        awayScore: null,
        playoff: false,
        division: null,
        conference: null
      });
      unassigned.splice(i, 1);
    }
    week += 1;
    guard += 1;
  }
  return result;
}

function countTeamScheduleGames(schedule, teamId) {
  return schedule.filter((g) => g.home === teamId || g.away === teamId).length;
}

function buildSeasonSchedule(season = 1) {
  const divBlock = buildDivisionSeasonGames();
  const nonDiv = buildNonDivisionGames(season);
  const cross = assignWeeksToGames(nonDiv, divBlock.nextWeek, 17);
  return divBlock.games.concat(cross);
}

function createPlayoffGame(week, home, away, round, conference, seedHome, seedAway) {
  return {
    week,
    home,
    away,
    played: false,
    homeScore: null,
    awayScore: null,
    playoff: true,
    round,
    conference: conference || null,
    seedHome,
    seedAway
  };
}

function getPlayoffGameWinner(g) {
  if (!g || !g.played) return null;
  return g.homeScore > g.awayScore ? g.home : g.away;
}

function getPlayoffGameWinnerSeed(g) {
  if (!g || !g.played) return null;
  return g.homeScore > g.awayScore ? g.seedHome : g.seedAway;
}

function buildConferenceWildcardGames(week, conferenceId, top8) {
  return [
    createPlayoffGame(week, top8[1].id, top8[6].id, "wildcard", conferenceId, 2, 7),
    createPlayoffGame(week, top8[2].id, top8[5].id, "wildcard", conferenceId, 3, 6),
    createPlayoffGame(week, top8[3].id, top8[4].id, "wildcard", conferenceId, 4, 5)
  ];
}

function buildConferenceDivisionalGames(week, conferenceId, seed1TeamId, wildcardWinners) {
  const winners = wildcardWinners.slice().sort((a, b) => b.seed - a.seed);
  const lowest = winners[0];
  const others = winners.slice(1);
  if (!lowest || others.length < 2) return [];
  return [
    createPlayoffGame(week, seed1TeamId, lowest.teamId, "divisional", conferenceId, 1, lowest.seed),
    createPlayoffGame(week, others[0].teamId, others[1].teamId, "divisional", conferenceId, others[0].seed, others[1].seed)
  ];
}

function getWildcardWinnersForConference(franchise, conferenceId) {
  return franchise.playoffGames
    .filter((g) => g.round === "wildcard" && g.conference === conferenceId && g.played)
    .map((g) => ({ teamId: getPlayoffGameWinner(g), seed: getPlayoffGameWinnerSeed(g) }))
    .filter((w) => w.teamId);
}

function getDivisionalWinnersForConference(franchise, conferenceId) {
  return franchise.playoffGames
    .filter((g) => g.round === "divisional" && g.conference === conferenceId && g.played)
    .map((g) => getPlayoffGameWinner(g))
    .filter(Boolean);
}

function getConferenceChampion(franchise, conferenceId) {
  const g = franchise.playoffGames.find(
    (x) => x.round === "conference" && x.conference === conferenceId && x.played
  );
  return g ? getPlayoffGameWinner(g) : null;
}

function getPlayoffRoundLabel(round, conferenceId) {
  if (round === "wildcard") return "Wild Card";
  if (round === "divisional") return "Divisional";
  if (round === "conference") {
    const conf = FRANCHISE_CONFERENCES[conferenceId];
    return conf ? `${conf.short} Championship` : "Conference Championship";
  }
  if (round === "final") return "Farmbowl";
  return round || "Playoffs";
}
