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

const FRANCHISE_DIVISION_WEEK_PAIRINGS = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]]
];

function buildDivisionSeasonGames() {
  const games = [];
  let week = 1;
  for (let pass = 0; pass < 2; pass += 1) {
    for (let pi = 0; pi < FRANCHISE_DIVISION_WEEK_PAIRINGS.length; pi += 1) {
      const weekPairings = FRANCHISE_DIVISION_WEEK_PAIRINGS[pi];
      for (const div of FRANCHISE_DIVISIONS) {
        const ids = div.teamIds;
        for (const [aIdx, bIdx] of weekPairings) {
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

function addMutualOpponents(opponents, teamA, teamB) {
  if (teamA === teamB || teamsSameDivision(teamA, teamB)) return;
  opponents[teamA].add(teamB);
  opponents[teamB].add(teamA);
}

function divisionPairKey(divA, divB) {
  return divA < divB ? `${divA}|${divB}` : `${divB}|${divA}`;
}

function addFullDivisionMatchups(opponents, divA, divB) {
  for (const teamA of divA.teamIds) {
    for (const teamB of divB.teamIds) addMutualOpponents(opponents, teamA, teamB);
  }
}

const INTRA_CONFERENCE_PAIRINGS = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]]
];

function getIntraConferencePartnerIdx(divIdx, rot) {
  const pairings = INTRA_CONFERENCE_PAIRINGS[rot % INTRA_CONFERENCE_PAIRINGS.length];
  for (const [a, b] of pairings) {
    if (divIdx === a) return b;
    if (divIdx === b) return a;
  }
  return (divIdx + 1) % 4;
}

function balanceNonDivisionOpponents(opponents, seasonIdx) {
  const TARGET = 11;
  let guard = 0;
  while (guard < 2000) {
    const sizes = PLAY_TEAM_IDS.map((tid) => opponents[tid].size);
    const maxC = Math.max(...sizes);
    const minC = Math.min(...sizes);
    if (maxC === TARGET && minC === TARGET) break;

    if (maxC > TARGET) {
      const heavy = PLAY_TEAM_IDS.find((tid) => opponents[tid].size > TARGET);
      const list = [...opponents[heavy]];
      const opp = list[Math.floor(leagueHash(heavy.charCodeAt(0) + seasonIdx + guard) * list.length)];
      opponents[heavy].delete(opp);
      opponents[opp].delete(heavy);
    } else if (minC < TARGET) {
      const light = PLAY_TEAM_IDS.find((tid) => opponents[tid].size < TARGET);
      const candidates = PLAY_TEAM_IDS.filter(
        (tid) => tid !== light && !teamsSameDivision(light, tid) && !opponents[light].has(tid)
      );
      if (!candidates.length) break;
      const opp = candidates[Math.floor(leagueHash(light.charCodeAt(0) + seasonIdx + guard) * candidates.length)];
      addMutualOpponents(opponents, light, opp);
    } else {
      break;
    }
    guard += 1;
  }
}

function buildNonDivisionGames(season = 1) {
  const seasonIdx = Math.max(1, season | 0);
  const rot = (seasonIdx - 1) % 3;
  const crossRot = (seasonIdx - 1) % 4;
  const extraCrossRot = (seasonIdx - 1 + 1) % 4;
  const opponents = {};
  for (const id of PLAY_TEAM_IDS) opponents[id] = new Set();
  const intraBlocks = new Set();
  const crossBlocks = new Set();

  for (const confId of FRANCHISE_CONFERENCE_IDS) {
    const confDivs = FRANCHISE_DIVISIONS.filter((d) => d.conference === confId);
    const crossConfDivs = FRANCHISE_DIVISIONS.filter((d) => d.conference !== confId);

    for (let divIdx = 0; divIdx < confDivs.length; divIdx += 1) {
      const div = confDivs[divIdx];
      const intraPartnerIdx = getIntraConferencePartnerIdx(divIdx, rot);
      const intraTarget = confDivs[intraPartnerIdx];
      const crossPartnerIdx = confId === "barn"
        ? (divIdx + crossRot) % crossConfDivs.length
        : (divIdx - crossRot + crossConfDivs.length) % crossConfDivs.length;
      const crossTarget = crossConfDivs[crossPartnerIdx];
      const remainingConf = confDivs.filter((_d, idx) => idx !== divIdx && idx !== intraPartnerIdx);
      let extraCrossIdx = confId === "barn"
        ? (divIdx + crossRot + 1 + extraCrossRot) % crossConfDivs.length
        : (divIdx - crossRot - 1 - extraCrossRot + crossConfDivs.length * 2) % crossConfDivs.length;
      if (extraCrossIdx === crossPartnerIdx) {
        extraCrossIdx = (extraCrossIdx + 1) % crossConfDivs.length;
      }
      const extraDiv = crossConfDivs[extraCrossIdx];

      if (intraTarget) {
        const blockKey = divisionPairKey(div.id, intraTarget.id);
        if (!intraBlocks.has(blockKey)) {
          intraBlocks.add(blockKey);
          addFullDivisionMatchups(opponents, div, intraTarget);
        }
      }

      if (crossTarget) {
        const blockKey = divisionPairKey(div.id, crossTarget.id);
        if (!crossBlocks.has(blockKey)) {
          crossBlocks.add(blockKey);
          addFullDivisionMatchups(opponents, div, crossTarget);
        }
      }

      for (let ti = 0; ti < div.teamIds.length; ti += 1) {
        const teamId = div.teamIds[ti];
        for (const remDiv of remainingConf) {
          addMutualOpponents(opponents, teamId, remDiv.teamIds[ti % remDiv.teamIds.length]);
        }
        if (extraDiv) {
          const extraOpp = extraDiv.teamIds[(ti + rot) % extraDiv.teamIds.length];
          if (!opponents[teamId].has(extraOpp)) {
            addMutualOpponents(opponents, teamId, extraOpp);
          }
        }
      }
    }
  }

  balanceNonDivisionOpponents(opponents, seasonIdx);

  const uniqueGames = [];
  const seen = new Set();
  for (const teamId of PLAY_TEAM_IDS) {
    for (const opp of opponents[teamId]) {
      if (teamsSameDivision(teamId, opp)) continue;
      const key = franchisePairKey(teamId, opp);
      if (seen.has(key)) continue;
      seen.add(key);
      const seed = leagueHash(teamId.charCodeAt(0) + opp.charCodeAt(0) + seasonIdx * 31);
      const home = seed < 0.5 ? teamId : opp;
      const away = home === teamId ? opp : teamId;
      uniqueGames.push({ home, away });
    }
  }
  return uniqueGames;
}

function assignWeeksToGames(games, startWeek, endWeek, existingGames = []) {
  const result = [];
  const teamWeeks = {};
  for (const id of PLAY_TEAM_IDS) teamWeeks[id] = new Set();
  for (const g of existingGames) {
    if (!teamWeeks[g.home]) teamWeeks[g.home] = new Set();
    if (!teamWeeks[g.away]) teamWeeks[g.away] = new Set();
    teamWeeks[g.home].add(g.week);
    teamWeeks[g.away].add(g.week);
  }

  const unassigned = games.slice();
  let week = startWeek;
  let guard = 0;
  while (unassigned.length && week <= endWeek && guard < 80) {
    const busy = new Set();
    let placedThisWeek = false;
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
      placedThisWeek = true;
    }
    if (!placedThisWeek) week += 1;
    else if (week < endWeek) week += 1;
    else week += 1;
    guard += 1;
  }

  // Fallback: assign any leftover games to open weeks (weeks 7–22).
  while (unassigned.length && guard < 400) {
    const g = unassigned.pop();
    let placed = false;
    for (let w = startWeek; w <= Math.max(endWeek, 22) && !placed; w += 1) {
      if (teamWeeks[g.home].has(w) || teamWeeks[g.away].has(w)) continue;
      teamWeeks[g.home].add(w);
      teamWeeks[g.away].add(w);
      result.push({
        week: w,
        home: g.home,
        away: g.away,
        played: false,
        homeScore: null,
        awayScore: null,
        playoff: false,
        division: null,
        conference: null
      });
      placed = true;
    }
    if (!placed) {
      const w = Math.max(endWeek, 18) + 1;
      teamWeeks[g.home].add(w);
      teamWeeks[g.away].add(w);
      result.push({
        week: w,
        home: g.home,
        away: g.away,
        played: false,
        homeScore: null,
        awayScore: null,
        playoff: false,
        division: null,
        conference: null
      });
    }
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
  const cross = assignWeeksToGames(nonDiv, divBlock.nextWeek, 17, divBlock.games);
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
