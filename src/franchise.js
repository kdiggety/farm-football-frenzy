// =========================================================
// Franchise mode — season, schedule, hub, sim, playoffs
// =========================================================

const FRANCHISE_STORAGE_KEY = "fff_franchise_save_v3";
const FRANCHISE_REGULAR_WEEKS = 17;
const FRANCHISE_MIDSEASON_WEEK = 9;
const FRANCHISE_DRAFT_ROUNDS = 3;

const FRANCHISE_SIM_MILESTONES = [
  { id: "midseason", label: "Midseason", sub: "Week 9" },
  { id: "playoffs", label: "Playoffs", sub: "Conference wild card" },
  { id: "farmbowl", label: "Farmbowl", sub: "Championship" },
  { id: "offseason", label: "Offseason", sub: "After title game" },
  { id: "draft", label: "Draft", sub: "Your pick ready" }
];

function cloneRosterEntry(entry) {
  return entry ? { ...entry } : null;
}

function cloneTeamRoster(teamId) {
  const src = TEAMS[teamId] && TEAMS[teamId].roster;
  if (!src) return {};
  const out = {};
  for (const slot of ROSTER_SLOT_KEYS) {
    out[slot] = cloneRosterEntry(src[slot]);
  }
  return out;
}

function createTeamDraftPicks(teamId, season) {
  return [1, 2, 3].map((round) => ({
    id: `s${season}r${round}-${teamId}`,
    season,
    round,
    ownerId: teamId,
    originalTeamId: teamId
  }));
}

function ensureTeamDraftPicks(teamState, teamId, season) {
  if (!teamState.draftPicks || !teamState.draftPicks.length) {
    teamState.draftPicks = createTeamDraftPicks(teamId, season);
  }
}

function createFranchiseTeamState(teamId, season = 1) {
  return {
    id: teamId,
    roster: cloneTeamRoster(teamId),
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    draftPicks: createTeamDraftPicks(teamId, season)
  };
}

function createEmptyFranchiseSeasonStats() {
  const out = {};
  for (const id of PLAY_TEAM_IDS) {
    out[id] = createEmptyTeamStats();
  }
  return out;
}

function ensureFranchiseRostersComplete(franchise) {
  if (!franchise || !franchise.teams) return;
  for (let i = 0; i < PLAY_TEAM_IDS.length; i += 1) {
    const id = PLAY_TEAM_IDS[i];
    const teamState = franchise.teams[id];
    if (!teamState) continue;
    if (!teamState.roster) teamState.roster = {};
    for (const slot of ROSTER_SLOT_KEYS) {
      if (!teamState.roster[slot] && TEAMS[id] && TEAMS[id].roster[slot]) {
        teamState.roster[slot] = { ...TEAMS[id].roster[slot] };
      }
    }
    if (typeof ensureTeamRosterFull === "function") {
      ensureTeamRosterFull({ roster: teamState.roster }, i);
    }
    ensureTeamDraftPicks(teamState, id, franchise.season || 1);
  }
}

function createNewFranchise(userTeamId) {
  const teams = {};
  for (const id of PLAY_TEAM_IDS) {
    teams[id] = createFranchiseTeamState(id);
  }
  const franchise = {
    version: 3,
    userTeamId,
    season: 1,
    phase: "regular",
    week: 1,
    playoffRound: null,
    playoffBracket: null,
    teams,
    schedule: buildSeasonSchedule(1),
    playoffGames: [],
    freeAgents: [],
    draftPool: [],
    seasonStats: createEmptyFranchiseSeasonStats(),
    transactionLog: [],
    draftHistory: [],
    tradeOffers: [],
    seasonAwards: {},
    hubMessage: null
  };
  ensureFranchiseRostersComplete(franchise);
  return franchise;
}

function saveFranchise(franchise) {
  if (!franchise) return;
  try {
    localStorage.setItem(FRANCHISE_STORAGE_KEY, JSON.stringify(franchise));
  } catch (_e) { /* ignore */ }
}

function loadFranchise() {
  try {
    const raw = localStorage.getItem(FRANCHISE_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.userTeamId || !data.teams) return null;
    if (Object.keys(data.teams).length !== PLAY_TEAM_IDS.length) return null;
    if (!data.version || data.version < 3) return null;
    ensureFranchiseRostersComplete(data);
    if (data.phase === "regular" && typeof countTeamScheduleGames === "function") {
      const userGames = countTeamScheduleGames(data.schedule || [], data.userTeamId);
      if (userGames !== 17) {
        data.schedule = buildSeasonSchedule(data.season || 1);
        data.hubMessage = "Schedule updated to 17 games (division rivals ×2).";
      }
    }
    return data;
  } catch (_e) {
    return null;
  }
}

function deleteFranchiseSave() {
  localStorage.removeItem(FRANCHISE_STORAGE_KEY);
  franchise = null;
  game.franchiseData = null;
  game.franchiseActive = false;
}

function beginFranchiseCreateNew() {
  game.franchisePickTeam = true;
  game.teamSelectUser = null;
  game.teamSelectPage = 0;
  game.state = "playTeamSelect";
}

function beginFranchiseDeleteSave() {
  deleteFranchiseSave();
  game.franchisePanel = "home";
  game.state = "franchiseMain";
}

function syncFranchiseRostersToTeams(franchise) {
  if (!franchise || !franchise.teams) return;
  for (const id of PLAY_TEAM_IDS) {
    const saved = franchise.teams[id];
    if (!saved || !saved.roster || !TEAMS[id]) continue;
    for (const slot of ROSTER_SLOT_KEYS) {
      if (saved.roster[slot]) TEAMS[id].roster[slot] = { ...saved.roster[slot] };
    }
  }
}

function getFranchiseRosterName(franchise, teamId, slotKey) {
  const entry = franchise && franchise.teams[teamId] && franchise.teams[teamId].roster
    ? franchise.teams[teamId].roster[slotKey]
    : null;
  if (entry && entry.displayLabel) return entry.displayLabel;
  return getRosterSlotLabel(slotKey);
}

function formatFranchiseScheduleScore(us, them) {
  return `${us}-${them}`;
}

function getFranchiseTeamRating(teamState) {
  if (!teamState || !teamState.roster) return 82;
  let sum = 0;
  let n = 0;
  for (const slot of ROSTER_STARTER_KEYS) {
    const entry = teamState.roster[slot];
    if (!entry) continue;
    const attrs = getRosterEntryAttributes(entry, slot);
    const defAttrs = getRosterEntryDefAttributes(entry, slot);
    sum += getPlayerOffOvr(attrs, slot) + getPlayerDefOvr(defAttrs, slot);
    n += 2;
  }
  return n ? Math.round(sum / n) : 82;
}

function decomposeScoreToTouchdownsAndFieldGoals(points) {
  let remaining = Math.max(0, points | 0);
  let tds = 0;
  let fgs = 0;
  while (remaining >= 7) {
    tds += 1;
    remaining -= 7;
  }
  while (remaining >= 3) {
    fgs += 1;
    remaining -= 3;
  }
  if (remaining === 1 || remaining === 2) {
    if (fgs > 0) { fgs -= 1; tds += 1; }
    else tds += 1;
  }
  return { tds, fgs, points: tds * 7 + fgs * 3 };
}

function formatGameScoreLine(homeScore, awayScore, homeTDs, awayTDs, homeFGs, awayFGs) {
  const htd = homeTDs != null ? homeTDs : decomposeScoreToTouchdownsAndFieldGoals(homeScore).tds;
  const atd = awayTDs != null ? awayTDs : decomposeScoreToTouchdownsAndFieldGoals(awayScore).tds;
  const hfg = homeFGs != null ? homeFGs : decomposeScoreToTouchdownsAndFieldGoals(homeScore).fgs;
  const afg = awayFGs != null ? awayFGs : decomposeScoreToTouchdownsAndFieldGoals(awayScore).fgs;
  return `${homeScore}-${awayScore} (${htd}-${atd} TD, ${hfg}-${afg} FG)`;
}

function synthStatRand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function synthStatClamp(value, min, max) {
  return Math.max(min, Math.min(max, value | 0));
}

function distributeSynthReceivingStats(stats, passTDs) {
  const passYards = stats.passing.yards;
  if (passYards <= 0 && passTDs <= 0) return;

  const horseShare = 0.38 + Math.random() * 0.12;
  const peteShare = 0.24 + Math.random() * 0.1;
  let p4Share = 0.14 + Math.random() * 0.08;
  let used = horseShare + peteShare + p4Share;
  if (used > 0.92) {
    p4Share *= 0.85 / used;
  }

  stats.receiving.horse.yards = Math.round(passYards * horseShare);
  stats.receiving.pete.yards = Math.round(passYards * peteShare);
  stats.receiving.p4.yards = Math.max(0, passYards - stats.receiving.horse.yards - stats.receiving.pete.yards);

  const completions = stats.passing.comp;
  stats.receiving.horse.rec = synthStatClamp(
    Math.round(completions * (0.32 + Math.random() * 0.1)) + (passTDs > 0 ? 1 : 0),
    passTDs > 0 ? 2 : 0,
    completions
  );
  const peteRecCap = Math.max(0, completions - stats.receiving.horse.rec);
  stats.receiving.pete.rec = synthStatClamp(
    Math.round(completions * (0.22 + Math.random() * 0.08)),
    passTDs > 0 ? 1 : 0,
    peteRecCap
  );
  stats.receiving.p4.rec = Math.max(0, completions - stats.receiving.horse.rec - stats.receiving.pete.rec);

  let tdLeft = passTDs;
  if (tdLeft > 0) {
    stats.receiving.horse.td = synthStatClamp(
      Math.min(tdLeft, 1 + (Math.random() < 0.55 ? 1 : 0)),
      0,
      tdLeft
    );
    tdLeft -= stats.receiving.horse.td;
  }
  if (tdLeft > 0) {
    stats.receiving.pete.td = synthStatClamp(
      Math.min(tdLeft, Math.random() < 0.65 ? 1 : 0),
      0,
      tdLeft
    );
    tdLeft -= stats.receiving.pete.td;
  }
  stats.receiving.p4.td = tdLeft;
}

function synthesizeTeamStatsFromScore(points, breakdown, opponentPoints) {
  const decomposed = decomposeScoreToTouchdownsAndFieldGoals(points);
  const tds = breakdown && breakdown.tds != null ? breakdown.tds : decomposed.tds;
  const fgs = breakdown && breakdown.fgs != null ? breakdown.fgs : decomposed.fgs;
  const stats = createEmptyTeamStats();

  let passTDs = breakdown && breakdown.passTDs != null ? breakdown.passTDs : null;
  let rushTDs = breakdown && breakdown.rushTDs != null ? breakdown.rushTDs : null;
  if (passTDs == null || rushTDs == null) {
    if (tds === 0) {
      passTDs = 0;
      rushTDs = 0;
    } else if (tds === 1) {
      passTDs = Math.random() < 0.62 ? 1 : 0;
      rushTDs = 1 - passTDs;
    } else {
      passTDs = synthStatClamp(Math.round(tds * (0.58 + (Math.random() - 0.5) * 0.18)), 0, tds);
      rushTDs = tds - passTDs;
    }
  }

  const scoringPace = tds + fgs * 0.45;
  const offenseFactor = synthStatClamp(0.86 + points / 42, 0.86, 1.1);
  stats.passing.att = synthStatClamp(Math.round((30 + scoringPace * 1.8 + synthStatRand(-3, 5)) * offenseFactor), 22, 46);
  const compPct = 0.6 + Math.random() * 0.1;
  stats.passing.comp = synthStatClamp(
    Math.round(stats.passing.att * compPct) + synthStatRand(-1, 2),
    0,
    stats.passing.att
  );
  const yardsPerComp = 9.4 + Math.random() * 2.0;
  stats.passing.yards = synthStatClamp(
    Math.round((stats.passing.comp * yardsPerComp + passTDs * synthStatRand(4, 14) + fgs * synthStatRand(2, 7)) * offenseFactor),
    Math.max(85, stats.passing.comp * 5),
    395
  );
  stats.passing.td = passTDs;
  stats.passing.int = Math.random() < 0.28 + passTDs * 0.04 ? 1 : (Math.random() < 0.04 ? 2 : 0);
  stats.passing.sacks = synthStatRand(1, 4);

  stats.rushing.att = synthStatClamp(Math.round((26 + rushTDs * 1.2 + synthStatRand(-4, 4)) * offenseFactor), 16, 36);
  const yardsPerRush = 3.9 + Math.random() * 1.6;
  stats.rushing.yards = synthStatClamp(
    Math.round((stats.rushing.att * yardsPerRush + rushTDs * synthStatRand(4, 12)) * offenseFactor),
    Math.max(35, stats.rushing.att * 2),
    195
  );
  stats.rushing.td = rushTDs;

  distributeSynthReceivingStats(stats, passTDs);

  const oppPts = opponentPoints != null ? opponentPoints : 21;
  stats.defense.tackles = synthStatClamp(54 + Math.round((22 - oppPts) * 0.7) + synthStatRand(-5, 6), 42, 74);
  stats.defense.sacks = synthStatClamp(Math.round((22 - oppPts) / 6 + Math.random() * 2.2), 0, 6);
  stats.defense.int = Math.random() < 0.1 + Math.max(0, 24 - oppPts) * 0.012 ? 1 : 0;
  stats.defense.tfl = synthStatClamp(5 + synthStatRand(0, 4) + Math.round((22 - oppPts) * 0.08), 2, 11);

  return stats;
}

function mergeSynthStatsIntoSeason(franchise, homeTeamId, awayTeamId, homeScore, awayScore, scoreMeta) {
  if (!franchise.seasonStats) franchise.seasonStats = createEmptyFranchiseSeasonStats();
  const meta = scoreMeta || {};
  const homeStats = synthesizeTeamStatsFromScore(homeScore, {
    tds: meta.homeTDs,
    fgs: meta.homeFGs
  }, awayScore);
  const awayStats = synthesizeTeamStatsFromScore(awayScore, {
    tds: meta.awayTDs,
    fgs: meta.awayFGs
  }, homeScore);
  const wrap = { user: homeStats, cpu: awayStats };
  mergeGameStatsIntoSeason(franchise, wrap, homeTeamId, awayTeamId, true);
}

function simulateFranchiseGameScore(homeState, awayState, homeFieldBonus = 3) {
  const homeR = getFranchiseTeamRating(homeState) + homeFieldBonus;
  const awayR = getFranchiseTeamRating(awayState);
  const edge = (homeR - awayR) / 18;

  let homeTDs = Math.max(0, Math.round(2.0 + edge * 0.75 + (Math.random() - 0.35) * 2.4));
  let awayTDs = Math.max(0, Math.round(2.0 - edge * 0.75 + (Math.random() - 0.35) * 2.4));
  let homeFGs = Math.floor(Math.random() * 3) + (Math.random() < 0.35 ? 1 : 0);
  let awayFGs = Math.floor(Math.random() * 3) + (Math.random() < 0.35 ? 1 : 0);

  let homeScore = homeTDs * 7 + homeFGs * 3;
  let awayScore = awayTDs * 7 + awayFGs * 3;

  if (homeScore === awayScore) {
    if (Math.random() < 0.52 + edge * 0.08) {
      homeScore += Math.random() < 0.65 ? 3 : 7;
      if (Math.random() < 0.65) homeFGs += 1;
      else homeTDs += 1;
    } else {
      awayScore += Math.random() < 0.65 ? 3 : 7;
      if (Math.random() < 0.65) awayFGs += 1;
      else awayTDs += 1;
    }
  }

  return { homeScore, awayScore, homeTDs, awayTDs, homeFGs, awayFGs };
}

function recordFranchiseGameResult(franchise, game, homeScore, awayScore, opts) {
  const options = opts || {};
  game.played = true;
  game.homeScore = homeScore;
  game.awayScore = awayScore;
  if (options.homeTDs != null) game.homeTDs = options.homeTDs;
  if (options.awayTDs != null) game.awayTDs = options.awayTDs;
  if (options.homeFGs != null) game.homeFGs = options.homeFGs;
  if (options.awayFGs != null) game.awayFGs = options.awayFGs;
  if (game.homeTDs == null) game.homeTDs = decomposeScoreToTouchdownsAndFieldGoals(homeScore).tds;
  if (game.awayTDs == null) game.awayTDs = decomposeScoreToTouchdownsAndFieldGoals(awayScore).tds;
  if (game.homeFGs == null) game.homeFGs = decomposeScoreToTouchdownsAndFieldGoals(homeScore).fgs;
  if (game.awayFGs == null) game.awayFGs = decomposeScoreToTouchdownsAndFieldGoals(awayScore).fgs;

  const home = franchise.teams[game.home];
  const away = franchise.teams[game.away];
  if (home) {
    home.pointsFor += homeScore;
    home.pointsAgainst += awayScore;
    if (homeScore > awayScore) home.wins += 1;
    else home.losses += 1;
  }
  if (away) {
    away.pointsFor += awayScore;
    away.pointsAgainst += homeScore;
    if (awayScore > homeScore) away.wins += 1;
    else away.losses += 1;
  }

  if (options.liveStats) {
    mergeGameStatsIntoSeason(franchise, options.liveStats, options.userTeamId, options.cpuTeamId, options.userWasHome);
  } else if (!options.skipStats) {
    mergeSynthStatsIntoSeason(franchise, game.home, game.away, homeScore, awayScore, {
      homeTDs: game.homeTDs,
      homeFGs: game.homeFGs,
      awayTDs: game.awayTDs,
      awayFGs: game.awayFGs
    });
  }
}

function applySimulatedGameResult(franchise, game, scores) {
  recordFranchiseGameResult(franchise, game, scores.homeScore, scores.awayScore, {
    homeTDs: scores.homeTDs,
    awayTDs: scores.awayTDs,
    homeFGs: scores.homeFGs,
    awayFGs: scores.awayFGs
  });
}

function mergeGameStatsIntoSeason(franchise, gameStats, userTeamId, cpuTeamId, userWasHome) {
  if (!franchise || !gameStats) return;
  if (!franchise.seasonStats) franchise.seasonStats = createEmptyFranchiseSeasonStats();
  const mapSide = (sideKey) => {
    if (sideKey === "user") return userTeamId;
    return cpuTeamId;
  };
  for (const sideKey of ["user", "cpu"]) {
    const teamId = mapSide(sideKey);
    const src = gameStats[sideKey];
    if (!src) continue;
    if (!franchise.seasonStats[teamId]) {
      franchise.seasonStats[teamId] = createEmptyTeamStats();
    }
    const dest = franchise.seasonStats[teamId];
    dest.passing.att += src.passing.att;
    dest.passing.comp += src.passing.comp;
    dest.passing.yards += src.passing.yards;
    dest.passing.td += src.passing.td;
    dest.passing.int += src.passing.int;
    dest.passing.sacks += src.passing.sacks;
    dest.rushing.att += src.rushing.att;
    dest.rushing.yards += src.rushing.yards;
    dest.rushing.td += src.rushing.td;
    dest.defense.tackles += src.defense.tackles;
    dest.defense.sacks += src.defense.sacks;
    dest.defense.int += src.defense.int;
    dest.defense.tfl += src.defense.tfl;
    for (const k of ["horse", "pete", "p4"]) {
      if (src.receiving[k] && dest.receiving[k]) {
        dest.receiving[k].rec += src.receiving[k].rec;
        dest.receiving[k].yards += src.receiving[k].yards;
        dest.receiving[k].td += src.receiving[k].td;
      }
    }
  }
}

function getConferenceStandings(franchise, conferenceId) {
  const ids = new Set(getConferenceTeamIds(conferenceId));
  return getStandings(franchise).filter((s) => ids.has(s.id));
}

function getCurrentWeekGames(franchise) {
  if (!franchise) return [];
  if (franchise.phase === "playoffs") {
    return franchise.playoffGames.filter((g) => g.week === franchise.week && !g.played);
  }
  return franchise.schedule.filter((g) => g.week === franchise.week && !g.played);
}

function getUserGameThisWeek(franchise) {
  const games = getCurrentWeekGames(franchise);
  return games.find(
    (g) => g.home === franchise.userTeamId || g.away === franchise.userTeamId
  ) || null;
}

function isUserOnPlayoffBye(franchise) {
  if (!franchise || franchise.phase !== "playoffs" || franchise.playoffRound !== "wildcard") {
    return false;
  }
  const confId = getTeamConferenceId(franchise.userTeamId);
  const bracket = franchise.playoffBracket && franchise.playoffBracket[confId];
  return !!(bracket && bracket.bye === franchise.userTeamId);
}

function getStandings(franchise) {
  return PLAY_TEAM_IDS.map((id) => ({
    id,
    name: TEAMS[id].name,
    ...franchise.teams[id],
    winPct: franchise.teams[id].wins / Math.max(1, franchise.teams[id].wins + franchise.teams[id].losses)
  })).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.pointsFor - a.pointsFor;
  });
}

function simUnplayedWeekGames(franchise, week, skipUserGame = false) {
  const games = franchise.phase === "playoffs"
    ? franchise.playoffGames.filter((g) => g.week === franchise.week && !g.played)
    : franchise.schedule.filter((g) => g.week === week && !g.played);
  for (const g of games) {
    if (skipUserGame && (g.home === franchise.userTeamId || g.away === franchise.userTeamId)) {
      continue;
    }
    const scores = simulateFranchiseGameScore(franchise.teams[g.home], franchise.teams[g.away]);
    applySimulatedGameResult(franchise, g, scores);
    if (typeof runCpuFranchiseTrade === "function") runCpuFranchiseTrade(franchise);
  }
}

function advanceFranchiseWeek(franchise) {
  if (franchise.phase === "regular") {
    const unplayed = franchise.schedule.filter((g) => g.week === franchise.week && !g.played);
    if (unplayed.length > 0) return false;
    if (franchise.week >= FRANCHISE_REGULAR_WEEKS) {
      beginFranchisePlayoffs(franchise);
      return true;
    }
    franchise.week += 1;
    franchise.hubMessage = `Week ${franchise.week} is ready.`;
    return true;
  }
  if (franchise.phase === "playoffs") {
    const unplayed = franchise.playoffGames.filter((g) => g.week === franchise.week && !g.played);
    if (unplayed.length > 0) return false;
    if (franchise.playoffRound === "wildcard") {
      beginFranchiseDivisional(franchise);
      return true;
    }
    if (franchise.playoffRound === "divisional") {
      beginFranchiseConferenceFinals(franchise);
      return true;
    }
    if (franchise.playoffRound === "conference") {
      beginFranchiseFinal(franchise);
      return true;
    }
    if (franchise.playoffRound === "final") {
      beginFranchiseOffseason(franchise);
      return true;
    }
  }
  return false;
}

function beginFranchisePlayoffs(franchise) {
  computeSeasonAwards(franchise);
  franchise.phase = "playoffs";
  franchise.playoffRound = "wildcard";
  franchise.week = FRANCHISE_REGULAR_WEEKS + 1;
  franchise.playoffGames = [];
  franchise.playoffBracket = { barn: { seeds: [] }, field: { seeds: [] } };

  for (const confId of FRANCHISE_CONFERENCE_IDS) {
    const top8 = getConferenceStandings(franchise, confId).slice(0, FRANCHISE_PLAYOFF_TEAMS_PER_CONF);
    franchise.playoffBracket[confId].seeds = top8.map((t) => t.id);
    franchise.playoffBracket[confId].bye = top8[0] ? top8[0].id : null;
    franchise.playoffGames.push(...buildConferenceWildcardGames(franchise.week, confId, top8));
  }
  franchise.hubMessage = "Playoffs! Top 8 per conference — #1 seeds earn a bye.";
}

function beginFranchiseDivisional(franchise) {
  franchise.playoffRound = "divisional";
  franchise.week += 1;
  for (const confId of FRANCHISE_CONFERENCE_IDS) {
    const bracket = franchise.playoffBracket[confId];
    const seed1 = bracket && bracket.seeds[0];
    const wcWinners = getWildcardWinnersForConference(franchise, confId);
    if (!seed1 || wcWinners.length < 3) continue;
    franchise.playoffGames.push(...buildConferenceDivisionalGames(franchise.week, confId, seed1, wcWinners));
  }
  franchise.hubMessage = "Divisional round — conference #1 seeds return.";
}

function beginFranchiseConferenceFinals(franchise) {
  franchise.playoffRound = "conference";
  franchise.week += 1;
  for (const confId of FRANCHISE_CONFERENCE_IDS) {
    const winners = getDivisionalWinnersForConference(franchise, confId);
    if (winners.length < 2) continue;
    franchise.playoffGames.push(
      createPlayoffGame(franchise.week, winners[0], winners[1], "conference", confId, null, null)
    );
  }
  franchise.hubMessage = "Conference championships!";
}

function beginFranchiseFinal(franchise) {
  const barnChamp = getConferenceChampion(franchise, "barn");
  const fieldChamp = getConferenceChampion(franchise, "field");
  if (!barnChamp || !fieldChamp) return;
  franchise.playoffRound = "final";
  franchise.week += 1;
  franchise.playoffGames.push(
    createPlayoffGame(franchise.week, barnChamp, fieldChamp, "final", null, null, null)
  );
  franchise.hubMessage = "Farmbowl — Barnyard vs Field Conference!";
}

function beginFranchiseOffseason(franchise) {
  franchise.phase = "draft";
  franchise.week = 0;
  franchise.playoffRound = null;
  franchise.playoffBracket = null;
  franchise.hubMessage = "Offseason — draft incoming.";
  if (typeof generateDraftPool === "function") {
    franchise.draftPool = generateDraftPool(franchise);
  }
  franchise.draftPickIndex = 0;
  franchise.draftOrder = getStandings(franchise).map((s) => s.id).reverse();
  if (typeof autoCpuDraftPick === "function") autoCpuDraftPick(franchise);
}

function beginFranchiseFreeAgency(franchise) {
  franchise.phase = "freeAgency";
  franchise.hubMessage = "Free agency — sign free agents.";
  if (typeof generateFreeAgentPool === "function") {
    franchise.freeAgents = generateFreeAgentPool(franchise);
  }
  franchise.faPage = 0;
}

function startNewFranchiseSeason(franchise) {
  franchise.season += 1;
  franchise.phase = "regular";
  franchise.week = 1;
  franchise.playoffGames = [];
  franchise.playoffRound = null;
  franchise.playoffBracket = null;
  franchise.schedule = buildSeasonSchedule(franchise.season);
  franchise.seasonStats = createEmptyFranchiseSeasonStats();
  franchise.freeAgents = [];
  franchise.draftPool = [];
  franchise.hubMessage = `Season ${franchise.season} — Week 1.`;
  for (const id of PLAY_TEAM_IDS) {
    franchise.teams[id].wins = 0;
    franchise.teams[id].losses = 0;
    franchise.teams[id].pointsFor = 0;
    franchise.teams[id].pointsAgainst = 0;
    franchise.teams[id].draftPicks = createTeamDraftPicks(id, franchise.season);
  }
}

function forceCompleteCurrentFranchiseWeek(franchise) {
  if (!franchise) return;
  if (franchise.phase === "regular") {
    simUnplayedWeekGames(franchise, franchise.week, false);
    const remaining = franchise.schedule.filter((g) => g.week === franchise.week && !g.played);
    for (const g of remaining) {
      const scores = simulateFranchiseGameScore(franchise.teams[g.home], franchise.teams[g.away]);
      applySimulatedGameResult(franchise, g, scores);
      if (typeof runCpuFranchiseTrade === "function") runCpuFranchiseTrade(franchise);
    }
    return;
  }
  if (franchise.phase === "playoffs") {
    const remaining = franchise.playoffGames.filter((g) => g.week === franchise.week && !g.played);
    for (const g of remaining) {
      const scores = simulateFranchiseGameScore(franchise.teams[g.home], franchise.teams[g.away]);
      applySimulatedGameResult(franchise, g, scores);
    }
  }
}

function simFranchiseToWeek(franchise, targetWeek) {
  if (!franchise || franchise.phase !== "regular") return;
  const target = Math.min(Math.max(1, targetWeek | 0), FRANCHISE_REGULAR_WEEKS);
  let guard = 0;
  while (franchise.week < target && guard < 40) {
    forceCompleteCurrentFranchiseWeek(franchise);
    if (!advanceFranchiseWeek(franchise)) {
      const unplayed = franchise.schedule.filter((g) => g.week === franchise.week && !g.played);
      if (unplayed.length > 0) {
        for (const g of unplayed) {
          const scores = simulateFranchiseGameScore(franchise.teams[g.home], franchise.teams[g.away]);
          applySimulatedGameResult(franchise, g, scores);
        }
        advanceFranchiseWeek(franchise);
      } else if (franchise.week < FRANCHISE_REGULAR_WEEKS) {
        franchise.week += 1;
      } else {
        break;
      }
    }
    guard += 1;
  }
  if (franchise.week === target) {
    forceCompleteCurrentFranchiseWeek(franchise);
  }
  saveFranchise(franchise);
  syncFranchiseRostersToTeams(franchise);
}

function simFranchiseCompleteRegularSeason(franchise) {
  if (!franchise || franchise.phase !== "regular") return;
  for (const g of franchise.schedule) {
    if (g.played) continue;
    const scores = simulateFranchiseGameScore(franchise.teams[g.home], franchise.teams[g.away]);
    applySimulatedGameResult(franchise, g, scores);
    if (typeof runCpuFranchiseTrade === "function") runCpuFranchiseTrade(franchise);
  }
  if (franchise.phase === "regular") {
    franchise.week = FRANCHISE_REGULAR_WEEKS;
    beginFranchisePlayoffs(franchise);
  }
  saveFranchise(franchise);
  syncFranchiseRostersToTeams(franchise);
}

function simFranchiseCompletePlayoffRound(franchise, round) {
  if (!franchise || franchise.phase !== "playoffs" || franchise.playoffRound !== round) return;
  forceCompleteCurrentFranchiseWeek(franchise);
  if (!franchise.playoffGames.some((g) => g.week === franchise.week && !g.played)) {
    advanceFranchiseWeek(franchise);
  }
  saveFranchise(franchise);
  syncFranchiseRostersToTeams(franchise);
}

function simFranchiseCompleteFarmbowl(franchise) {
  simFranchiseCompletePlayoffRound(franchise, "final");
}

function simFranchiseAdvancePlayoffsToFinal(franchise) {
  if (franchise.phase === "regular") simFranchiseCompleteRegularSeason(franchise);
  if (franchise.phase === "playoffs" && franchise.playoffRound === "wildcard") {
    simFranchiseCompletePlayoffRound(franchise, "wildcard");
  }
  if (franchise.phase === "playoffs" && franchise.playoffRound === "divisional") {
    simFranchiseCompletePlayoffRound(franchise, "divisional");
  }
  if (franchise.phase === "playoffs" && franchise.playoffRound === "conference") {
    simFranchiseCompletePlayoffRound(franchise, "conference");
  }
}

function simFranchiseToMilestone(franchise, milestoneId) {
  if (!franchise) return;
  switch (milestoneId) {
    case "midseason":
      if (franchise.phase !== "regular") {
        franchise.hubMessage = "Already past midseason.";
        break;
      }
      if (franchise.week >= FRANCHISE_MIDSEASON_WEEK) {
        franchise.hubMessage = `Already at week ${franchise.week}.`;
        break;
      }
      simFranchiseToWeek(franchise, FRANCHISE_MIDSEASON_WEEK);
      franchise.hubMessage = `Midseason — Week ${FRANCHISE_MIDSEASON_WEEK}.`;
      break;
    case "playoffs":
      if (franchise.phase === "regular") simFranchiseCompleteRegularSeason(franchise);
      franchise.hubMessage = franchise.phase === "playoffs"
        ? "Playoffs — wild card round (top 8 per conference, #1 on bye)."
        : "Playoffs reached.";
      break;
    case "farmbowl":
      simFranchiseAdvancePlayoffsToFinal(franchise);
      franchise.hubMessage = franchise.playoffRound === "final"
        ? "Farmbowl — championship game!"
        : "Farmbowl is next after the conference finals.";
      break;
    case "offseason":
      simFranchiseAdvancePlayoffsToFinal(franchise);
      if (franchise.phase === "playoffs" && franchise.playoffRound === "final") {
        simFranchiseCompleteFarmbowl(franchise);
      }
      franchise.hubMessage = franchise.phase === "draft"
        ? "Offseason — draft is open."
        : "Offseason.";
      break;
    case "draft":
      if (franchise.phase === "regular" || franchise.phase === "playoffs") {
        simFranchiseAdvancePlayoffsToFinal(franchise);
        if (franchise.phase === "playoffs" && franchise.playoffRound === "final") {
          simFranchiseCompleteFarmbowl(franchise);
        }
      }
      if (franchise.phase === "draft" && typeof autoCpuDraftPick === "function") {
        autoCpuDraftPick(franchise);
        const pick = getCurrentDraftPick(franchise);
        if (!pick) franchise.hubMessage = "Draft complete — free agency is next.";
        else if (pick.teamId === franchise.userTeamId) franchise.hubMessage = "Draft — you're on the clock!";
        else franchise.hubMessage = "Draft — CPU picks made.";
      } else {
        franchise.hubMessage = "Draft is not open yet.";
      }
      break;
    default:
      break;
  }
  saveFranchise(franchise);
  syncFranchiseRostersToTeams(franchise);
}

function simRestOfFranchiseRegularSeason(franchise) {
  simFranchiseCompleteRegularSeason(franchise);
  saveFranchise(franchise);
}

function getFranchisePlaySelectLayout() {
  const L = getPlaySessionSelectLayout();
  return {
    offense: L.offense,
    defense: L.defense,
    wholeGame: L.wholeGame,
    back: { x: 36, y: 488, w: 140, h: 36 }
  };
}

function openFranchisePlaySelect() {
  const g = getUserGameThisWeek(getActiveFranchise());
  if (!g) return false;
  game.state = "franchisePlaySelect";
  return true;
}

function beginFranchiseGamePlay(franchise, sessionKind = "wholeGame") {
  const g = getUserGameThisWeek(franchise);
  if (!g || !isRunnablePlaySessionKind(sessionKind) || sessionKind === "franchise") return false;
  syncFranchiseRostersToTeams(franchise);
  game.franchiseActive = true;
  game.franchiseGameId = `${g.week}-${g.home}-${g.away}`;
  game.playSessionKind = sessionKind;
  game.playUserTeamId = franchise.userTeamId;
  game.playCpuTeamId = g.home === franchise.userTeamId ? g.away : g.home;
  game.teamSelectUser = franchise.userTeamId;
  game.cpuOffense = false;
  resetPlayModeTeamScores();
  player1.score = 0;
  player2.score = 0;
  game.winner = null;
  resetCoinTossState();
  if (playSessionUsesGameClock()) {
    initGameClock();
  } else {
    resetGameClock();
  }
  resetGameStats();
  startGameMusic();
  if (playSessionUsesCoinToss()) {
    game.state = "playCoinToss";
    game.coinTossPhase = "pickCall";
    return true;
  }
  applyPlaySessionStart();
  return true;
}

function handleFranchisePlaySelectClick(p) {
  const L = getFranchisePlaySelectLayout();
  const hit = (r) => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  if (hit(L.back)) {
    game.state = "franchiseHub";
    return;
  }
  for (const key of PLAY_SESSION_TOP_KEYS) {
    if (hit(L[key])) {
      beginFranchiseGamePlay(getActiveFranchise(), key);
      return;
    }
  }
}

function findFranchiseGame(franchise, gameId) {
  const all = franchise.schedule.concat(franchise.playoffGames || []);
  return all.find((g) => `${g.week}-${g.home}-${g.away}` === gameId);
}

function completeFranchisePlayedGame(franchise) {
  if (!franchise || !game.teamScores) return;
  const g = findFranchiseGame(franchise, game.franchiseGameId);
  if (!g) return;
  const userId = franchise.userTeamId;
  const cpuId = g.home === userId ? g.away : g.home;
  const userScore = game.teamScores[userId] || 0;
  const cpuScore = game.teamScores[cpuId] || 0;
  const homeScore = g.home === userId ? userScore : cpuScore;
  const awayScore = g.away === userId ? userScore : cpuScore;
  const homeBreak = decomposeScoreToTouchdownsAndFieldGoals(homeScore);
  const awayBreak = decomposeScoreToTouchdownsAndFieldGoals(awayScore);
  recordFranchiseGameResult(franchise, g, homeScore, awayScore, {
    liveStats: game.teamStats,
    userTeamId: userId,
    cpuTeamId: cpuId,
    userWasHome: g.home === userId,
    homeTDs: homeBreak.tds,
    awayTDs: awayBreak.tds,
    homeFGs: homeBreak.fgs,
    awayFGs: awayBreak.fgs
  });
  simUnplayedWeekGames(franchise, g.week, true);
  advanceFranchiseWeek(franchise);
  saveFranchise(franchise);
  game.franchiseActive = false;
  game.franchiseGameId = null;
  game.playSessionKind = null;
  game.state = "franchiseHub";
  game.franchisePanel = "home";
  startMenuMusic();
}

function returnToFranchiseHub() {
  const f = getActiveFranchise();
  game.franchiseActive = false;
  game.franchiseGameId = null;
  game.playSessionKind = null;
  game.playUserTeamId = f ? f.userTeamId : null;
  game.state = "franchiseHub";
  game.mode = null;
  game.winner = null;
  game.winPopupTimer = 0;
  game.teamScores = null;
  startMenuMusic();
}

function computeSeasonAwards(franchise) {
  const season = franchise.season;
  const awards = [];
  const standings = getStandings(franchise);
  if (standings[0]) {
    awards.push({
      id: "bestRecord",
      title: "Best Record",
      teamId: standings[0].id,
      detail: `${standings[0].wins}-${standings[0].losses}`
    });
  }
  let passLeader = null;
  let rushLeader = null;
  let recvLeader = null;
  let tdLeader = null;
  for (const id of PLAY_TEAM_IDS) {
    const st = franchise.seasonStats && franchise.seasonStats[id];
    if (!st) continue;
    const passTDs = st.passing.td || 0;
    const rushTDs = st.rushing.td || 0;
    const totalTD = passTDs + rushTDs;
    if (!passLeader || st.passing.yards > passLeader.yards) {
      passLeader = { teamId: id, yards: st.passing.yards, td: passTDs };
    }
    if (!rushLeader || st.rushing.yards > rushLeader.yards) {
      rushLeader = { teamId: id, yards: st.rushing.yards, td: rushTDs };
    }
    if (!tdLeader || totalTD > tdLeader.td) {
      tdLeader = { teamId: id, td: totalTD, passTD: passTDs, rushTD: rushTDs };
    }
    const recvSlots = [
      { slot: "wr", key: "horse" },
      { slot: "flex", key: "pete" },
      { slot: "p4", key: "p4" }
    ];
    for (const { slot, key } of recvSlots) {
      const row = st.receiving && st.receiving[key];
      if (!row) continue;
      const yards = row.yards || 0;
      if (!recvLeader || yards > recvLeader.yards) {
        recvLeader = { teamId: id, slot, yards, td: row.td || 0, rec: row.rec || 0 };
      }
    }
  }
  if (passLeader) {
    awards.push({
      id: "passLeader",
      title: "Passing Leader",
      teamId: passLeader.teamId,
      playerName: getFranchiseRosterName(franchise, passLeader.teamId, "qb"),
      detail: `${passLeader.yards} yds · ${passLeader.td} TD`
    });
  }
  if (rushLeader) {
    awards.push({
      id: "rushLeader",
      title: "Rushing Leader",
      teamId: rushLeader.teamId,
      playerName: getFranchiseRosterName(franchise, rushLeader.teamId, "p4"),
      detail: `${rushLeader.yards} yds · ${rushLeader.td} TD`
    });
  }
  if (recvLeader) {
    awards.push({
      id: "recvLeader",
      title: "Receiving Leader",
      teamId: recvLeader.teamId,
      playerName: getFranchiseRosterName(franchise, recvLeader.teamId, recvLeader.slot),
      detail: `${recvLeader.rec} rec · ${recvLeader.yards} yds · ${recvLeader.td} TD`
    });
  }
  if (tdLeader) {
    const qbName = getFranchiseRosterName(franchise, tdLeader.teamId, "qb");
    const rbName = getFranchiseRosterName(franchise, tdLeader.teamId, "p4");
    awards.push({
      id: "tdLeader",
      title: "Most Touchdowns (Team)",
      teamId: tdLeader.teamId,
      playerName: `${qbName} / ${rbName}`,
      detail: `${tdLeader.td} total (${tdLeader.passTD} pass · ${tdLeader.rushTD} rush)`
    });
  }
  const userSt = franchise.seasonStats && franchise.seasonStats[franchise.userTeamId];
  if (userSt) {
    const qbName = getFranchiseRosterName(franchise, franchise.userTeamId, "qb");
    const rbName = getFranchiseRosterName(franchise, franchise.userTeamId, "p4");
    awards.push({
      id: "userTeam",
      title: "Your Offense",
      teamId: franchise.userTeamId,
      playerName: `${qbName} · ${rbName}`,
      detail: `${userSt.passing.td + userSt.rushing.td} TD · ${userSt.passing.yards + userSt.rushing.yards} yds`
    });
  }
  if (!franchise.seasonAwards) franchise.seasonAwards = {};
  franchise.seasonAwards[season] = awards;
  return awards;
}

function getFranchiseAwards(franchise) {
  if (!franchise) return [];
  if (!franchise.seasonAwards) franchise.seasonAwards = {};
  if (!franchise.seasonAwards[franchise.season]) computeSeasonAwards(franchise);
  return franchise.seasonAwards[franchise.season] || [];
}

function getUserDivisionRank(franchise) {
  const div = typeof getTeamDivision === "function" ? getTeamDivision(franchise.userTeamId) : null;
  if (!div) return null;
  const sorted = div.teamIds
    .map((id) => ({ id, ...franchise.teams[id] }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.pointsFor - a.pointsFor;
    });
  const idx = sorted.findIndex((t) => t.id === franchise.userTeamId);
  return idx >= 0 ? idx + 1 : null;
}

function getUserConferenceRank(franchise) {
  const confId = typeof getTeamConferenceId === "function" ? getTeamConferenceId(franchise.userTeamId) : null;
  if (!confId) return null;
  const standings = getConferenceStandings(franchise, confId);
  const idx = standings.findIndex((t) => t.id === franchise.userTeamId);
  return idx >= 0 ? idx + 1 : null;
}

function resolveFranchisePanel(franchise) {
  const p = game.franchisePanel;
  if (p === "standings" || p === "stats" || p === "schedule" || p === "roster" || p === "simTo" || p === "awards" || p === "bracket") {
    return p;
  }
  if (p === "trade" && franchise.phase !== "draft" && franchise.phase !== "freeAgency") {
    return "trade";
  }
  if (franchise.phase === "draft") return "draft";
  if (franchise.phase === "freeAgency") return "freeAgency";
  return "home";
}

function getFranchiseHubLayout() {
  const cx = canvas.width / 2;
  const tabY = 86;
  const tabH = 28;
  return {
    back: { x: 20, y: 14, w: 100, h: 30 },
    play: { x: cx - 140, y: 418, w: 280, h: 46 },
    advanceWeek: { x: 24, y: 474, w: 140, h: 32 },
    simTo: { x: 180, y: 474, w: 100, h: 32 },
    createNew: { x: canvas.width - 332, y: 474, w: 148, h: 32 },
    deleteFranchise: { x: canvas.width - 176, y: 474, w: 156, h: 32 },
    home: { x: 24, y: tabY, w: 64, h: tabH },
    roster: { x: 94, y: tabY, w: 64, h: tabH },
    schedule: { x: 164, y: tabY, w: 72, h: tabH },
    standings: { x: 242, y: tabY, w: 80, h: tabH },
    stats: { x: 328, y: tabY, w: 56, h: tabH },
    awards: { x: 390, y: tabY, w: 64, h: tabH },
    bracket: { x: 460, y: tabY, w: 68, h: tabH },
    trade: { x: 534, y: tabY, w: 64, h: tabH },
    draft: { x: 510, y: tabY, w: 72, h: tabH },
    freeAgency: { x: 590, y: tabY, w: 100, h: tabH },
    panel: { x: 20, y: 122, w: canvas.width - 40, h: 284 }
  };
}

function getFranchiseMainLayout() {
  const cx = canvas.width / 2;
  const btnW = 200;
  const gap = 16;
  return {
    back: { x: 20, y: 14, w: 100, h: 30 },
    continueGame: { x: cx - 150, y: 196, w: 300, h: 48 },
    newGame: { x: cx - btnW - gap / 2, y: 268, w: btnW, h: 48 },
    deleteSave: { x: cx + gap / 2, y: 268, w: btnW, h: 48 }
  };
}

function getFranchiseSimToLayout() {
  const panel = getFranchiseHubLayout().panel;
  const cx = panel.x + panel.w / 2;
  const bw = 168;
  const bh = 40;
  const gapX = 12;
  const gapY = 10;
  const buttons = {};
  FRANCHISE_SIM_MILESTONES.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    buttons[m.id] = {
      x: cx - bw - gapX / 2 + col * (bw + gapX),
      y: panel.y + 64 + row * (bh + gapY),
      w: bw,
      h: bh
    };
  });
  return {
    cancel: { x: cx - 60, y: panel.y + panel.h - 44, w: 120, h: 34 },
    advanceWeek: { x: panel.x + 16, y: panel.y + panel.h - 44, w: 140, h: 34 },
    buttons
  };
}

let franchise = null;

function initFranchiseState(data) {
  franchise = data;
  game.franchiseData = franchise;
  syncFranchiseRostersToTeams(franchise);
  saveFranchise(franchise);
}

function getActiveFranchise() {
  return franchise || game.franchiseData || loadFranchise();
}

function handleFranchiseAdvanceWeek(f) {
  if (!f || (f.phase !== "regular" && f.phase !== "playoffs")) return;
  forceCompleteCurrentFranchiseWeek(f);
  const advanced = advanceFranchiseWeek(f);
  saveFranchise(f);
  if (advanced) {
    if (f.phase === "playoffs") {
      f.hubMessage = typeof getPlayoffRoundLabel === "function"
        ? `Playoffs — ${getPlayoffRoundLabel(f.playoffRound, null)}`
        : "Playoff round advanced.";
    } else {
      f.hubMessage = `Week ${f.week} is ready.`;
    }
  } else {
    f.hubMessage = "Simmed this week's CPU games. Play your game or advance again.";
  }
}

function handleFranchiseHubClick(p) {
  const f = getActiveFranchise();
  if (!f) return;
  const L = getFranchiseHubLayout();
  const hit = (r) => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  if (hit(L.back)) {
    game.state = "franchiseMain";
    return;
  }
  if (hit(L.createNew)) {
    beginFranchiseCreateNew();
    return;
  }
  if (hit(L.deleteFranchise)) {
    beginFranchiseDeleteSave();
    return;
  }
  if (hit(L.home)) { game.franchisePanel = "home"; return; }
  if (hit(L.roster)) { game.franchisePanel = "roster"; return; }
  if (hit(L.standings)) { game.franchisePanel = "standings"; return; }
  if (hit(L.stats)) { game.franchisePanel = "stats"; return; }
  if (hit(L.awards)) { game.franchisePanel = "awards"; return; }
  if (hit(L.bracket)) { game.franchisePanel = "bracket"; return; }
  if (hit(L.schedule)) { game.franchisePanel = "schedule"; return; }
  if (hit(L.trade) && f.phase !== "draft" && f.phase !== "freeAgency") {
    game.franchisePanel = "trade";
    game.franchiseTradeOffer = null;
    game.franchiseTradeWant = null;
    return;
  }
  if (hit(L.simTo)) {
    game.franchisePanel = "simTo";
    return;
  }
  if ((f.phase === "regular" || f.phase === "playoffs") && hit(L.advanceWeek)) {
    handleFranchiseAdvanceWeek(f);
    return;
  }
  if ((f.phase === "regular" || f.phase === "playoffs") && hit(L.play) && getUserGameThisWeek(f)) {
    openFranchisePlaySelect();
    return;
  }
  const panel = resolveFranchisePanel(f);
  if (panel === "simTo") {
    handleFranchiseSimToClick(p, f);
    return;
  }
  if (panel === "trade") {
    handleFranchiseTradeClick(p, f);
    return;
  }
  if (panel === "draft") {
    handleFranchiseDraftClick(p, f);
    return;
  }
  if (panel === "freeAgency") {
    handleFranchiseFreeAgencyClick(p, f);
    return;
  }
}

function handleFranchiseSimToClick(p, f) {
  const L = getFranchiseSimToLayout();
  const hit = (r) => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  if (hit(L.cancel)) {
    game.franchisePanel = "home";
    return;
  }
  if ((f.phase === "regular" || f.phase === "playoffs") && hit(L.advanceWeek)) {
    handleFranchiseAdvanceWeek(f);
    return;
  }
  for (const m of FRANCHISE_SIM_MILESTONES) {
    const rect = L.buttons[m.id];
    if (hit(rect)) {
      simFranchiseToMilestone(f, m.id);
      game.franchisePanel = "home";
      return;
    }
  }
}

function handleFranchiseTradeClick(p, f) {
  const TL = getFranchiseTradeLayout();
  const hit = (r) => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const cpuIds = PLAY_TEAM_IDS.filter((id) => id !== f.userTeamId);
  const scroll = game.franchiseTradeTeamScroll || 0;
  const rowH = 18;
  let ty = TL.teamList.y + 24;
  for (let i = scroll; i < cpuIds.length; i += 1) {
    if (ty > TL.teamList.y + TL.teamList.h - 8) break;
    if (p.x >= TL.teamList.x && p.x <= TL.teamList.x + TL.teamList.w && p.y >= ty - 12 && p.y <= ty + 4) {
      game.franchiseTradeCpuId = cpuIds[i];
      game.franchiseTradeWant = null;
      return;
    }
    ty += rowH;
  }
  const cpuId = game.franchiseTradeCpuId || cpuIds[0];
  let uy = TL.userCol.y + 18;
  for (const slot of ROSTER_SLOT_KEYS) {
    const ue = f.teams[f.userTeamId].roster[slot];
    if (!ue) continue;
    if (p.x >= TL.userCol.x && p.x <= TL.userCol.x + TL.userCol.w && p.y >= uy - 10 && p.y <= uy + 6) {
      game.franchiseTradeOffer = { type: "player", slot };
      return;
    }
    uy += rowH;
  }
  const userPicks = getTeamOwnedPicks(f, f.userTeamId);
  for (const pick of userPicks) {
    if (p.x >= TL.userCol.x && p.x <= TL.userCol.x + TL.userCol.w && p.y >= uy - 10 && p.y <= uy + 6) {
      game.franchiseTradeOffer = { type: "pick", pickId: pick.id };
      return;
    }
    uy += rowH;
  }
  let cy = TL.cpuCol.y + 18;
  for (const slot of ROSTER_SLOT_KEYS) {
    const ce = f.teams[cpuId].roster[slot];
    if (!ce) continue;
    if (p.x >= TL.cpuCol.x && p.x <= TL.cpuCol.x + TL.cpuCol.w && p.y >= cy - 10 && p.y <= cy + 6) {
      game.franchiseTradeWant = { type: "player", slot };
      return;
    }
    cy += rowH;
  }
  const cpuPicks = getTeamOwnedPicks(f, cpuId);
  for (const pick of cpuPicks) {
    if (p.x >= TL.cpuCol.x && p.x <= TL.cpuCol.x + TL.cpuCol.w && p.y >= cy - 10 && p.y <= cy + 6) {
      game.franchiseTradeWant = { type: "pick", pickId: pick.id };
      return;
    }
    cy += rowH;
  }
  if (hit(TL.propose) && game.franchiseTradeOffer && game.franchiseTradeWant) {
    proposeFranchiseTrade(f, cpuId, game.franchiseTradeOffer, game.franchiseTradeWant);
    saveFranchise(f);
  }
}

function handleFranchiseDraftClick(p, f) {
  const DL = getFranchiseDraftLayout();
  const hit = (r) => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const pick = getCurrentDraftPick(f);
  let y = DL.list.y + 34;
  const pool = (f.draftPool || []).slice(0, 12);
  for (let i = 0; i < pool.length; i += 1) {
    if (p.x >= DL.list.x && p.x <= DL.list.x + DL.list.w && p.y >= y - 12 && p.y <= y + 8) {
      game.franchiseDraftSel = i;
      return;
    }
    y += 22;
  }
  const prospect = pool[game.franchiseDraftSel || 0];
  if (!prospect || !pick || pick.teamId !== f.userTeamId) {
    if (hit(DL.simCpu)) autoCpuDraftPick(f);
    return;
  }
  const slotMap = [
    [DL.slotQb, "qb"],
    [DL.slotWr, "wr"],
    [DL.slotFlex, "flex"],
    [DL.slotP4, "p4"],
    [DL.slotP5, "p5"],
    [DL.slotBench, "__bench__"]
  ];
  for (const [rect, slot] of slotMap) {
    if (!hit(rect)) continue;
    const targetSlot = slot === "__bench__"
      ? (findFirstEmptyBenchSlot(f.teams[f.userTeamId].roster) || ROSTER_BENCH_KEYS[0])
      : slot;
    executeDraftPick(f, prospect.prospectId, targetSlot);
  }
}

function handleFranchiseFreeAgencyClick(p, f) {
  const DL = getFranchiseFreeAgencyLayout();
  const hit = (r) => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const page = f.faPage || 0;
  const perPage = 10;
  const slice = (f.freeAgents || []).slice(page * perPage, page * perPage + perPage);
  let y = DL.list.y + 20;
  for (let i = 0; i < slice.length; i += 1) {
    if (p.x >= DL.list.x && p.x <= DL.list.x + DL.list.w && p.y >= y - 12 && p.y <= y + 8) {
      game.franchiseFaSel = i;
      return;
    }
    y += 22;
  }
  const prospect = slice[game.franchiseFaSel || 0];
  const slotMap = [
    [DL.slotQb, "qb"],
    [DL.slotWr, "wr"],
    [DL.slotFlex, "flex"],
    [DL.slotP4, "p4"],
    [DL.slotP5, "p5"],
    [DL.slotBench, "__bench__"]
  ];
  for (const [rect, slot] of slotMap) {
    if (!hit(rect) || !prospect) continue;
    const targetSlot = slot === "__bench__"
      ? (findFirstEmptyBenchSlot(f.teams[f.userTeamId].roster) || ROSTER_BENCH_KEYS[0])
      : slot;
    signFreeAgent(f, prospect.prospectId, targetSlot);
  }
  if (hit(DL.prev)) f.faPage = Math.max(0, (f.faPage || 0) - 1);
  if (hit(DL.next)) f.faPage = (f.faPage || 0) + 1;
  if (hit(DL.finish)) {
    finishFreeAgency(f);
    game.franchisePanel = "home";
    f.hubMessage = `Season ${f.season} — Week 1.`;
  }
}
