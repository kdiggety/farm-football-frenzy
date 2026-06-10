// =========================================================
// Franchise mode UI
// =========================================================

function drawFranchiseMain() {
  drawMenuBackground();
  ctx.fillStyle = "rgba(17, 24, 39, 0.9)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const L = getFranchiseMainLayout();
  const hasSave = !!loadFranchise();

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 36px Arial";
  ctx.fillText("Franchise Mode", canvas.width / 2, 120);
  ctx.font = "15px Arial";
  ctx.fillStyle = "#d1d5db";
  ctx.fillText("17-game season · playoffs · draft · trades · free agency", canvas.width / 2, 152);

  ctx.fillStyle = hasSave ? "#16a34a" : "#4b5563";
  ctx.fillRect(L.continueGame.x, L.continueGame.y, L.continueGame.w, L.continueGame.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;
  ctx.strokeRect(L.continueGame.x, L.continueGame.y, L.continueGame.w, L.continueGame.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 18px Arial";
  ctx.fillText(hasSave ? "Continue Franchise" : "No Save Found", L.continueGame.x + L.continueGame.w / 2, L.continueGame.y + 30);

  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(L.newGame.x, L.newGame.y, L.newGame.w, L.newGame.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;
  ctx.strokeRect(L.newGame.x, L.newGame.y, L.newGame.w, L.newGame.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 16px Arial";
  ctx.fillText("Create New", L.newGame.x + L.newGame.w / 2, L.newGame.y + 30);

  ctx.fillStyle = hasSave ? "#7f1d1d" : "#4b5563";
  ctx.fillRect(L.deleteSave.x, L.deleteSave.y, L.deleteSave.w, L.deleteSave.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;
  ctx.strokeRect(L.deleteSave.x, L.deleteSave.y, L.deleteSave.w, L.deleteSave.h);
  ctx.fillStyle = hasSave ? COLORS.white : "#9ca3af";
  ctx.font = "bold 14px Arial";
  ctx.fillText("Delete Franchise", L.deleteSave.x + L.deleteSave.w / 2, L.deleteSave.y + 30);

  drawFranchiseBackButton(L.back, "Main Menu");
}

function drawFranchiseBackButton(rect, label) {
  ctx.fillStyle = "rgba(55, 65, 81, 0.9)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "center";
  ctx.fillText(label || "Back", rect.x + rect.w / 2, rect.y + rect.h / 2 + 5);
}

function drawFranchiseHubButton(rect, label, active) {
  ctx.fillStyle = active ? "#1d4ed8" : "#374151";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = active ? "#facc15" : "#94a3b8";
  ctx.lineWidth = active ? 2 : 1;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "center";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 4);
}

function drawFranchisePlaySelect() {
  const f = getActiveFranchise();
  const g = f ? getUserGameThisWeek(f) : null;
  drawMenuBackground();
  ctx.fillStyle = "rgba(17, 24, 39, 0.82)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 34px Arial";
  ctx.fillText("How do you want to play?", canvas.width / 2, 58);
  ctx.font = "15px Arial";
  ctx.fillStyle = "#d1d5db";
  if (g && f) {
    const oppId = g.home === f.userTeamId ? g.away : g.home;
    const opp = TEAMS[oppId];
    ctx.fillText(`Week ${g.week} · ${TEAMS[f.userTeamId].name} vs ${opp.name}`, canvas.width / 2, 92);
  } else {
    ctx.fillText("Pick offense, defense, or the full game.", canvas.width / 2, 92);
  }

  const L = getFranchisePlaySelectLayout();
  const mx = game.mouseX;
  const my = game.mouseY;
  const hit = (r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;

  for (const key of PLAY_SESSION_TOP_KEYS) {
    const preset = PLAY_SESSION_TOP[key];
    drawPlaySessionButton(L[key], preset.label, preset.sub, hit(L[key]));
  }

  ctx.fillStyle = "#4b5563";
  ctx.fillRect(L.back.x, L.back.y, L.back.w, L.back.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;
  ctx.strokeRect(L.back.x, L.back.y, L.back.w, L.back.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 14px Arial";
  ctx.fillText("Back to hub", L.back.x + L.back.w / 2, L.back.y + L.back.h / 2 + 5);
}

function drawFranchiseHub() {
  const f = getActiveFranchise();
  if (!f) return;
  drawMenuBackground();
  ctx.fillStyle = "rgba(17, 24, 39, 0.88)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const L = getFranchiseHubLayout();
  const panelId = resolveFranchisePanel(f);
  const user = f.teams[f.userTeamId];
  const userGame = getUserGameThisWeek(f);

  drawFranchiseHubHeader(f, user);

  drawFranchiseHubButton(L.home, "Home", panelId === "home");
  drawFranchiseHubButton(L.roster, "Roster", panelId === "roster");
  drawFranchiseHubButton(L.schedule, "Schedule", panelId === "schedule");
  drawFranchiseHubButton(L.standings, "Standings", panelId === "standings");
  drawFranchiseHubButton(L.stats, "Stats", panelId === "stats");
  drawFranchiseHubButton(L.awards, "Awards", panelId === "awards");
  drawFranchiseHubButton(L.bracket, "Bracket", panelId === "bracket");
  drawFranchiseHubButton(L.trade, "Trades", panelId === "trade");
  if (f.phase === "draft") drawFranchiseHubButton(L.draft, "Draft", panelId === "draft");
  if (f.phase === "freeAgency") drawFranchiseHubButton(L.freeAgency, "Free Agency", panelId === "freeAgency");

  ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
  ctx.fillRect(L.panel.x, L.panel.y, L.panel.w, L.panel.h);
  ctx.strokeStyle = "#475569";
  ctx.strokeRect(L.panel.x, L.panel.y, L.panel.w, L.panel.h);

  if (panelId === "simTo") {
    drawFranchiseSimToPanel(f, L.panel);
  } else if (panelId === "roster") {
    drawFranchiseRosterPanel(f, L.panel);
  } else if (panelId === "standings") {
    drawFranchiseStandingsPanel(f, L.panel);
  } else if (panelId === "stats") {
    drawFranchiseStatsPanel(f, L.panel);
  } else if (panelId === "awards") {
    drawFranchiseAwardsPanel(f, L.panel);
  } else if (panelId === "bracket") {
    drawFranchisePlayoffBracketPanel(f, L.panel);
  } else if (panelId === "schedule") {
    drawFranchiseSchedulePanel(f, L.panel);
  } else if (panelId === "trade") {
    drawFranchiseTradePanel(f, L);
  } else if (panelId === "draft") {
    drawFranchiseDraftPanel(f, L);
  } else if (panelId === "freeAgency") {
    drawFranchiseFreeAgencyPanel(f, L);
  } else {
    drawFranchiseHomePanel(f, L.panel, userGame);
  }

  if (f.hubMessage) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#fde68a";
    ctx.font = "12px Arial";
    ctx.fillText(f.hubMessage, canvas.width / 2, L.panel.y + L.panel.h + 14);
  }

  if (f.phase === "regular" || f.phase === "playoffs") {
    const canPlay = !!userGame;
    ctx.fillStyle = canPlay ? "#16a34a" : "#4b5563";
    ctx.fillRect(L.play.x, L.play.y, L.play.w, L.play.h);
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2;
    ctx.strokeRect(L.play.x, L.play.y, L.play.w, L.play.h);
    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(canPlay ? "Play Game" : "No Game This Week", L.play.x + L.play.w / 2, L.play.y + 29);

    ctx.fillStyle = "#2563eb";
    ctx.fillRect(L.advanceWeek.x, L.advanceWeek.y, L.advanceWeek.w, L.advanceWeek.h);
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2;
    ctx.strokeRect(L.advanceWeek.x, L.advanceWeek.y, L.advanceWeek.w, L.advanceWeek.h);
    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 12px Arial";
    ctx.fillText("Advance Week", L.advanceWeek.x + L.advanceWeek.w / 2, L.advanceWeek.y + 21);
  }

  if (f.phase === "regular" || f.phase === "playoffs" || f.phase === "draft" || f.phase === "freeAgency") {
    ctx.fillStyle = "#374151";
    ctx.fillRect(L.simTo.x, L.simTo.y, L.simTo.w, L.simTo.h);
    ctx.strokeStyle = COLORS.white;
    ctx.strokeRect(L.simTo.x, L.simTo.y, L.simTo.w, L.simTo.h);
    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 11px Arial";
    ctx.fillText("Sim To…", L.simTo.x + L.simTo.w / 2, L.simTo.y + 21);
  }

  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(L.createNew.x, L.createNew.y, L.createNew.w, L.createNew.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 1;
  ctx.strokeRect(L.createNew.x, L.createNew.y, L.createNew.w, L.createNew.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Create New", L.createNew.x + L.createNew.w / 2, L.createNew.y + 21);

  ctx.fillStyle = "#7f1d1d";
  ctx.fillRect(L.deleteFranchise.x, L.deleteFranchise.y, L.deleteFranchise.w, L.deleteFranchise.h);
  ctx.strokeStyle = COLORS.white;
  ctx.strokeRect(L.deleteFranchise.x, L.deleteFranchise.y, L.deleteFranchise.w, L.deleteFranchise.h);
  ctx.fillStyle = COLORS.white;
  ctx.fillText("Delete Franchise", L.deleteFranchise.x + L.deleteFranchise.w / 2, L.deleteFranchise.y + 21);

  drawFranchiseBackButton(L.back, "Exit");
}

function drawFranchiseHubHeader(f, user) {
  const phaseLabel = f.phase === "regular"
    ? `Season ${f.season} · Week ${f.week}/${FRANCHISE_REGULAR_WEEKS}`
    : f.phase === "playoffs"
      ? (f.playoffRound === "final"
        ? `Season ${f.season} · Farmbowl`
        : `Season ${f.season} · Playoffs — ${typeof getPlayoffRoundLabel === "function"
          ? getPlayoffRoundLabel(f.playoffRound)
          : f.playoffRound || "round"}`)
      : f.phase === "draft"
        ? `Offseason · Draft (Season ${f.season})`
        : f.phase === "freeAgency"
          ? `Offseason · Free Agency`
          : `Season ${f.season}`;

  if (typeof drawTeamBannerImage === "function") {
    drawTeamBannerImage(f.userTeamId, 20, 46, 128, 36);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 22px Arial";
  ctx.fillText(TEAMS[f.userTeamId].name, 158, 58);
  ctx.font = "bold 14px Arial";
  ctx.fillStyle = "#fde68a";
  ctx.fillText(`${user.wins}-${user.losses}`, 158, 76);
  const userDiv = typeof getTeamDivision === "function" ? getTeamDivision(f.userTeamId) : null;
  const userConf = typeof getTeamConference === "function" ? getTeamConference(f.userTeamId) : null;
  const divRank = getUserDivisionRank(f);
  const confRank = getUserConferenceRank(f);
  ctx.font = "11px Arial";
  ctx.fillStyle = "#93c5fd";
  let sub = "";
  if (userDiv && divRank) sub += `${divRank}${divRank === 1 ? "st" : divRank === 2 ? "nd" : divRank === 3 ? "rd" : "th"} in ${userDiv.name}`;
  if (userConf && confRank) sub += sub ? ` · ${userConf.short} #${confRank}` : `${userConf.short} #${confRank}`;
  if (sub) ctx.fillText(sub, 158, 92);

  ctx.textAlign = "right";
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "bold 13px Arial";
  ctx.fillText(phaseLabel, canvas.width - 24, 58);
  ctx.font = "11px Arial";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`PF ${user.pointsFor}  PA ${user.pointsAgainst}`, canvas.width - 24, 78);
}

function drawFranchiseHomePanel(f, panel, userGame) {
  const tid = f.userTeamId;
  const user = f.teams[tid];
  const teamOvr = getFranchiseTeamRating(user);
  const midX = panel.x + Math.floor(panel.w / 2);

  ctx.fillStyle = "rgba(30, 41, 59, 0.65)";
  ctx.fillRect(panel.x + 12, panel.y + 12, midX - panel.x - 20, 118);
  ctx.strokeStyle = "#475569";
  ctx.strokeRect(panel.x + 12, panel.y + 12, midX - panel.x - 20, 118);

  ctx.textAlign = "left";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 10px Arial";
  ctx.fillText("THIS WEEK", panel.x + 22, panel.y + 30);
  if (userGame) {
    const opp = userGame.home === tid ? userGame.away : userGame.home;
    const loc = userGame.home === tid ? "HOME" : "AWAY";
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 16px Arial";
    ctx.fillText(`${loc} vs ${TEAMS[opp].name}`, panel.x + 22, panel.y + 54);
    ctx.font = "12px Arial";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(f.phase === "playoffs" ? "Playoff game" : `Week ${f.week}`, panel.x + 22, panel.y + 74);
    if (typeof drawTeamBannerImage === "function") {
      drawTeamBannerImage(opp, panel.x + 22, panel.y + 82, 72, 36);
    }
  } else if (typeof isUserOnPlayoffBye === "function" && isUserOnPlayoffBye(f)) {
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 14px Arial";
    ctx.fillText("#1 Seed — Bye Week", panel.x + 22, panel.y + 54);
    ctx.font = "12px Arial";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText("Wild card round — advance automatically.", panel.x + 22, panel.y + 76);
  } else {
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "14px Arial";
    ctx.fillText("No game scheduled", panel.x + 22, panel.y + 54);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Arial";
    ctx.fillText("Check schedule or sim ahead.", panel.x + 22, panel.y + 76);
  }

  ctx.fillStyle = "rgba(30, 41, 59, 0.65)";
  ctx.fillRect(midX + 4, panel.y + 12, panel.x + panel.w - midX - 16, 118);
  ctx.strokeStyle = "#475569";
  ctx.strokeRect(midX + 4, panel.y + 12, panel.x + panel.w - midX - 16, 118);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 10px Arial";
  ctx.fillText("TEAM SNAPSHOT", midX + 14, panel.y + 30);
  ctx.fillStyle = "#fde68a";
  ctx.font = "bold 28px Arial";
  ctx.fillText(`${user.wins}-${user.losses}`, midX + 14, panel.y + 62);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "12px Arial";
  ctx.fillText(`Points: ${user.pointsFor} for · ${user.pointsAgainst} against`, midX + 14, panel.y + 82);
  ctx.fillStyle = getOvrTierColor(teamOvr);
  ctx.font = "bold 13px Arial";
  ctx.fillText(`Starter OVR ${teamOvr}`, midX + 14, panel.y + 102);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px Arial";
  ctx.fillText(`${countRosterPlayers(user.roster)} / ${ROSTER_MAX_PLAYERS} on roster`, midX + 14, panel.y + 120);

  const starterTop = panel.y + 142;
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 10px Arial";
  ctx.fillText("STARTERS", panel.x + 16, starterTop);
  let y = starterTop + 16;
  for (const slot of ROSTER_STARTER_KEYS) {
    const entry = user.roster[slot];
    if (!entry) continue;
    const attrs = getRosterEntryAttributes(entry, slot);
    const defAttrs = getRosterEntryDefAttributes(entry, slot);
    const offOvr = getPlayerOffOvr(attrs, slot);
    const defOvr = getPlayerDefOvr(defAttrs, slot);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "11px Arial";
    const name = entry.displayLabel.length > 16 ? `${entry.displayLabel.slice(0, 15)}…` : entry.displayLabel;
    ctx.fillText(`${getRosterSlotLabel(slot)}  ${name}`, panel.x + 16, y);
    ctx.textAlign = "right";
    ctx.fillStyle = getOvrTierColor(offOvr);
    ctx.fillText(`OFF ${offOvr}`, panel.x + panel.w - 100, y);
    ctx.fillStyle = getOvrTierColor(defOvr);
    ctx.fillText(`DEF ${defOvr}`, panel.x + panel.w - 24, y);
    ctx.textAlign = "left";
    y += 16;
  }

  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 10px Arial";
  ctx.fillText("RECENT ACTIVITY", midX + 8, starterTop);
  y = starterTop + 16;
  const recent = (f.transactionLog || []).slice(0, 6);
  if (!recent.length) {
    ctx.fillStyle = "#64748b";
    ctx.font = "11px Arial";
    ctx.fillText("No trades, signings, or picks yet.", midX + 8, y);
  } else {
    ctx.font = "11px Arial";
    for (const t of recent) {
      let line = "";
      if (t.type === "trade") line = `Trade: ${t.sent} ↔ ${t.received}`;
      else if (t.type === "draft") line = `Draft: ${t.player}`;
      else if (t.type === "signing") line = `Signed: ${t.player}`;
      else line = JSON.stringify(t);
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(line, midX + 8, y);
      y += 15;
    }
  }
}

function drawFranchiseRosterPanel(f, panel) {
  const roster = f.teams[f.userTeamId].roster;
  const scroll = game.franchiseRosterScroll || 0;
  const rowH = 24;
  const headerY = panel.y + 18;

  ctx.textAlign = "left";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 9px Arial";
  ctx.fillText("SLOT", panel.x + 12, headerY);
  ctx.fillText("PLAYER", panel.x + 52, headerY);
  ctx.textAlign = "center";
  ctx.fillText("OFF", panel.x + 280, headerY);
  ctx.fillText("DEF", panel.x + 330, headerY);
  ctx.fillText("DEV", panel.x + 390, headerY);
  ctx.textAlign = "left";

  const slots = ROSTER_STARTER_KEYS.concat(ROSTER_BENCH_KEYS);
  const visibleRows = Math.floor((panel.h - 44) / rowH);
  const maxScroll = Math.max(0, slots.length - visibleRows);
  game.franchiseRosterScroll = Math.min(scroll, maxScroll);

  let y = headerY + 14;
  for (let i = game.franchiseRosterScroll; i < slots.length; i += 1) {
    if (y > panel.y + panel.h - 12) break;
    const slot = slots[i];
    const entry = roster[slot];
    if (!entry) continue;
    const attrs = getRosterEntryAttributes(entry, slot);
    const defAttrs = getRosterEntryDefAttributes(entry, slot);
    const offOvr = getPlayerOffOvr(attrs, slot);
    const defOvr = getPlayerDefOvr(defAttrs, slot);
    const traitInfo = getRosterDevTraitInfo(entry, slot);

    ctx.fillStyle = isBenchRosterSlot(slot) ? "#94a3b8" : "#fde68a";
    ctx.font = "bold 10px Arial";
    ctx.fillText(getRosterSlotLabel(slot), panel.x + 12, y);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "11px Arial";
    const name = entry.displayLabel.length > 22 ? `${entry.displayLabel.slice(0, 21)}…` : entry.displayLabel;
    ctx.fillText(name, panel.x + 52, y);
    ctx.textAlign = "center";
    ctx.fillStyle = getOvrTierColor(offOvr);
    ctx.font = "bold 10px Arial";
    ctx.fillText(String(offOvr), panel.x + 280, y);
    ctx.fillStyle = getOvrTierColor(defOvr);
    ctx.fillText(String(defOvr), panel.x + 330, y);
    if (typeof drawDevTraitPill === "function") {
      drawDevTraitPill(ctx, panel.x + 390, y - 6, traitInfo, { w: 64, h: 16 });
    } else {
      ctx.fillStyle = traitInfo.color;
      ctx.fillText(traitInfo.shortLabel || traitInfo.label, panel.x + 390, y);
    }
    ctx.textAlign = "left";
    y += rowH;
  }

  if (maxScroll > 0) {
    ctx.fillStyle = "#64748b";
    ctx.font = "10px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`Scroll: ${game.franchiseRosterScroll + 1}-${Math.min(slots.length, game.franchiseRosterScroll + visibleRows)} of ${slots.length}`, panel.x + panel.w - 12, panel.y + panel.h - 8);
    ctx.textAlign = "left";
  }
}

function drawFranchiseStandingsPanel(f, panel) {
  const colW = (panel.w - 24) / 2;
  const rowH = 11;
  const divHeaderH = 14;

  function divisionStandings(division) {
    return division.teamIds
      .map((id) => ({
        id,
        name: TEAMS[id].name,
        ...f.teams[id]
      }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.pointsFor - a.pointsFor;
      });
  }

  function drawConferenceColumn(conferenceId, x0) {
    const conf = FRANCHISE_CONFERENCES[conferenceId];
    const divs = FRANCHISE_DIVISIONS.filter((d) => d.conference === conferenceId);
    let y = panel.y + 16;
    ctx.textAlign = "left";
    ctx.fillStyle = "#fde68a";
    ctx.font = "bold 10px Arial";
    ctx.fillText(conf ? conf.name : conferenceId, x0, y);
    y += divHeaderH;

    for (const div of divs) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 9px Arial";
      ctx.fillText(div.name, x0, y);
      y += 12;
      for (const s of divisionStandings(div)) {
        ctx.fillStyle = s.id === f.userTeamId ? "#fde68a" : "#e2e8f0";
        ctx.font = "9px Arial";
        const name = s.name.length > 14 ? `${s.name.slice(0, 13)}…` : s.name;
        ctx.fillText(name, x0, y);
        ctx.textAlign = "right";
        ctx.fillText(`${s.wins}-${s.losses}`, x0 + colW - 8, y);
        ctx.textAlign = "left";
        y += rowH;
      }
      y += 4;
    }
  }

  drawConferenceColumn("barn", panel.x + 12);
  drawConferenceColumn("field", panel.x + 12 + colW);
}

function drawFranchiseStatsPanel(f, panel) {
  const tid = f.userTeamId;
  if (!f.seasonStats) f.seasonStats = createEmptyFranchiseSeasonStats();
  const st = f.seasonStats[tid] || createEmptyTeamStats();
  const roster = (f.teams[tid] && f.teams[tid].roster) || {};
  const qbName = getFranchiseRosterName(f, tid, "qb");
  const rbName = getFranchiseRosterName(f, tid, "p4");
  ctx.textAlign = "left";
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 14px Arial";
  ctx.fillText(`${TEAMS[tid].name} — Season Stats`, panel.x + 12, panel.y + 26);
  ctx.font = "12px Arial";
  ctx.fillStyle = "#cbd5e1";
  const p = st.passing || {};
  const pct = Math.round(getPassCompPct(st));
  const totalTD = (p.td || 0) + ((st.rushing && st.rushing.td) || 0);
  ctx.fillText(`Touchdowns: ${totalTD} total (${p.td || 0} pass · ${(st.rushing && st.rushing.td) || 0} rush)`, panel.x + 12, panel.y + 48);
  ctx.fillText(`Pass (${qbName}): ${p.comp || 0}/${p.att || 0}  ${pct}%  ${p.yards || 0} yds  ${p.td || 0} TD  ${p.int || 0} INT`, panel.x + 12, panel.y + 68);
  const r = st.rushing || {};
  ctx.fillText(`Rush (${rbName}): ${r.att || 0} att  ${r.yards || 0} yds  ${r.td || 0} TD`, panel.x + 12, panel.y + 88);
  const d = st.defense || {};
  ctx.fillText(`Defense: ${d.tackles || 0} TKL  ${d.sacks || 0} SK  ${d.int || 0} INT  ${d.tfl || 0} TFL`, panel.x + 12, panel.y + 108);
  const recv = st.receiving || {};
  let y = panel.y + 134;
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 11px Arial";
  ctx.fillText("Receiving", panel.x + 12, y);
  y += 16;
  ctx.font = "12px Arial";
  ctx.fillStyle = "#cbd5e1";
  const recvRows = [
    { key: "horse", slot: "wr" },
    { key: "pete", slot: "flex" },
    { key: "p4", slot: "p4" }
  ];
  for (const { key, slot } of recvRows) {
    const row = recv[key];
    if (!row) continue;
    const name = (roster[slot] && roster[slot].displayLabel) || getRosterSlotLabel(slot);
    ctx.fillText(`${name}: ${row.rec || 0} rec  ${row.yards || 0} yds  ${row.td || 0} TD`, panel.x + 20, y);
    y += 16;
  }
  if (!(p.att || r.att || totalTD)) {
    ctx.fillStyle = "#64748b";
    ctx.font = "11px Arial";
    ctx.fillText("Play or advance weeks to accumulate stats.", panel.x + 12, y + 8);
  }
}

function drawFranchiseAwardsPanel(f, panel) {
  const awards = getFranchiseAwards(f);
  ctx.textAlign = "left";
  ctx.fillStyle = "#fde68a";
  ctx.font = "bold 14px Arial";
  ctx.fillText(`Season ${f.season} Awards`, panel.x + 12, panel.y + 26);
  let y = panel.y + 50;
  if (!awards.length) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Arial";
    ctx.fillText("Awards are announced after the regular season.", panel.x + 12, y);
    return;
  }
  for (const a of awards) {
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 12px Arial";
    ctx.fillText(a.title, panel.x + 12, y);
    ctx.fillStyle = "#93c5fd";
    ctx.font = "11px Arial";
    const teamName = TEAMS[a.teamId] ? TEAMS[a.teamId].name : a.teamId;
    const headline = a.playerName ? `${a.playerName} — ${teamName}` : teamName;
    ctx.fillText(`${headline} · ${a.detail}`, panel.x + 20, y + 16);
    y += 34;
  }
}

function drawFranchisePlayoffBracketPanel(f, panel) {
  ctx.textAlign = "left";
  ctx.fillStyle = "#fde68a";
  ctx.font = "bold 14px Arial";
  ctx.fillText("Playoff Bracket", panel.x + 12, panel.y + 24);
  if (f.phase === "regular") {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Arial";
    ctx.fillText("Bracket fills in when the postseason begins.", panel.x + 12, panel.y + 48);
    return;
  }
  const bracket = f.playoffBracket || {};
  let y = panel.y + 44;
  for (const confId of FRANCHISE_CONFERENCE_IDS) {
    const conf = FRANCHISE_CONFERENCES[confId];
    const b = bracket[confId] || {};
    ctx.fillStyle = "#93c5fd";
    ctx.font = "bold 11px Arial";
    ctx.fillText(conf ? conf.name : confId, panel.x + 12, y);
    y += 14;
    if (b.seeds && b.seeds.length) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px Arial";
      ctx.fillText(`Seeds: ${b.seeds.slice(0, 8).map((id, i) => `${i + 1}.${TEAMS[id].shortName || id}`).join("  ")}`, panel.x + 16, y);
      y += 14;
      if (b.bye) {
        ctx.fillText(`Bye: ${TEAMS[b.bye].name}`, panel.x + 16, y);
        y += 14;
      }
    }
    const confGames = (f.playoffGames || []).filter((g) => g.conference === confId);
    for (const g of confGames) {
      const winner = g.played ? TEAMS[g.homeScore > g.awayScore ? g.home : g.away] : null;
      const scoreTxt = g.played
        ? formatGameScoreLine(g.homeScore, g.awayScore, g.homeTDs, g.awayTDs, g.homeFGs, g.awayFGs)
        : "—";
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "10px Arial";
      ctx.fillText(
        `${getPlayoffRoundLabel(g.round, confId)}: ${TEAMS[g.home].shortName} vs ${TEAMS[g.away].shortName}  ${scoreTxt}${winner ? `  → ${winner.shortName}` : ""}`,
        panel.x + 16,
        y
      );
      y += 13;
    }
    y += 6;
  }
  const finalG = (f.playoffGames || []).find((g) => g.round === "final");
  if (finalG) {
    ctx.fillStyle = "#fde68a";
    ctx.font = "bold 11px Arial";
    ctx.fillText("Farmbowl", panel.x + 12, y);
    y += 14;
    const scoreTxt = finalG.played
      ? formatGameScoreLine(finalG.homeScore, finalG.awayScore, finalG.homeTDs, finalG.awayTDs, finalG.homeFGs, finalG.awayFGs)
      : `${TEAMS[finalG.home].name} vs ${TEAMS[finalG.away].name}`;
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "10px Arial";
    ctx.fillText(scoreTxt, panel.x + 16, y);
  }
}

function drawFranchiseSchedulePanel(f, panel) {
  const games = f.schedule.filter((g) => g.home === f.userTeamId || g.away === f.userTeamId);
  const playoffGames = (f.playoffGames || []).filter((g) => g.home === f.userTeamId || g.away === f.userTeamId);
  const allGames = games.concat(playoffGames);
  ctx.textAlign = "left";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 11px Arial";
  ctx.fillText(`${games.length} regular-season games${playoffGames.length ? ` · ${playoffGames.length} playoff` : ""}`, panel.x + 8, panel.y + 14);
  ctx.fillText("WK", panel.x + 8, panel.y + 32);
  ctx.fillText("OPPONENT", panel.x + 40, panel.y + 32);
  ctx.fillText("SCORE", panel.x + 250, panel.y + 32);
  let y = panel.y + 48;
  for (const g of allGames) {
    const opp = g.home === f.userTeamId ? g.away : g.home;
    const loc = g.home === f.userTeamId ? "vs" : "@";
    const divTag = g.division ? "DIV×2" : g.playoff ? "PO" : "1×";
    ctx.fillStyle = g.week === f.week && !g.played ? "#fde68a" : "#e2e8f0";
    ctx.font = "11px Arial";
    ctx.fillText(String(g.week), panel.x + 8, y);
    ctx.fillText(`${loc} ${TEAMS[opp].shortName || TEAMS[opp].name} [${divTag}]`, panel.x + 40, y);
    if (g.played) {
      const us = g.home === f.userTeamId ? g.homeScore : g.awayScore;
      const them = g.home === f.userTeamId ? g.awayScore : g.homeScore;
      const wl = us > them ? "W" : us < them ? "L" : "T";
      const scoreTxt = typeof formatFranchiseScheduleScore === "function"
        ? formatFranchiseScheduleScore(us, them)
        : `${us}-${them}`;
      ctx.font = "bold 14px Arial";
      ctx.fillStyle = wl === "W" ? "#86efac" : wl === "L" ? "#fca5a5" : "#fde68a";
      ctx.fillText(`${scoreTxt} ${wl}`, panel.x + 250, y);
      ctx.font = "11px Arial";
      ctx.fillStyle = g.week === f.week && !g.played ? "#fde68a" : "#e2e8f0";
    } else {
      ctx.fillText("—", panel.x + 250, y);
    }
    y += 16;
  }
}

function drawFranchiseSimToPanel(f, panel) {
  const L = getFranchiseSimToLayout();
  ctx.textAlign = "center";
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 16px Arial";
  ctx.fillText("Sim to milestone", panel.x + panel.w / 2, panel.y + 28);
  ctx.font = "12px Arial";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Fast-forward the season — CPU plays every game along the way.", panel.x + panel.w / 2, panel.y + 48);

  for (const m of FRANCHISE_SIM_MILESTONES) {
    const rect = L.buttons[m.id];
    if (!rect) continue;
    ctx.fillStyle = "#374151";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 13px Arial";
    ctx.fillText(m.label, rect.x + rect.w / 2, rect.y + 18);
    ctx.font = "10px Arial";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(m.sub, rect.x + rect.w / 2, rect.y + 32);
  }

  if (f.phase === "regular" || f.phase === "playoffs") {
    ctx.fillStyle = "#374151";
    ctx.fillRect(L.advanceWeek.x, L.advanceWeek.y, L.advanceWeek.w, L.advanceWeek.h);
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2;
    ctx.strokeRect(L.advanceWeek.x, L.advanceWeek.y, L.advanceWeek.w, L.advanceWeek.h);
    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 12px Arial";
    ctx.fillText("Advance Week", L.advanceWeek.x + L.advanceWeek.w / 2, L.advanceWeek.y + 22);
  }

  ctx.fillStyle = "rgba(55, 65, 81, 0.9)";
  ctx.fillRect(L.cancel.x, L.cancel.y, L.cancel.w, L.cancel.h);
  ctx.strokeStyle = COLORS.white;
  ctx.strokeRect(L.cancel.x, L.cancel.y, L.cancel.w, L.cancel.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 12px Arial";
  ctx.fillText("Cancel", L.cancel.x + L.cancel.w / 2, L.cancel.y + 22);
}

function drawFranchiseTradePanel(f, L) {
  const cpuIds = PLAY_TEAM_IDS.filter((id) => id !== f.userTeamId);
  const cpuId = game.franchiseTradeCpuId || cpuIds[0];
  const TL = getFranchiseTradeLayout();
  const scroll = game.franchiseTradeTeamScroll || 0;
  const rowH = 18;

  ctx.fillStyle = "rgba(15,23,42,0.8)";
  ctx.fillRect(TL.teamList.x, TL.teamList.y, TL.teamList.w, TL.teamList.h);
  ctx.strokeStyle = "#475569";
  ctx.strokeRect(TL.teamList.x, TL.teamList.y, TL.teamList.w, TL.teamList.h);
  ctx.textAlign = "left";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 10px Arial";
  ctx.fillText("TRADE PARTNER", TL.teamList.x + 8, TL.teamList.y + 14);
  let ty = TL.teamList.y + 28;
  for (let i = scroll; i < cpuIds.length; i += 1) {
    if (ty > TL.teamList.y + TL.teamList.h - 6) break;
    const id = cpuIds[i];
    const sel = id === cpuId;
    ctx.fillStyle = sel ? "#1d4ed8" : "transparent";
    ctx.fillRect(TL.teamList.x + 4, ty - 11, TL.teamList.w - 8, 16);
    ctx.fillStyle = sel ? "#fff" : "#e2e8f0";
    ctx.font = "10px Arial";
    ctx.fillText(TEAMS[id].name, TL.teamList.x + 8, ty);
    ty += rowH;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#fde68a";
  ctx.font = "bold 14px Arial";
  ctx.fillText(`Trade with ${TEAMS[cpuId].name}`, canvas.width / 2, 100);
  ctx.textAlign = "left";
  ctx.fillStyle = "#93c5fd";
  ctx.font = "bold 11px Arial";
  ctx.fillText("You give", TL.userCol.x, TL.userCol.y + 4);
  ctx.fillStyle = "#f9a8d4";
  ctx.fillText(`${TEAMS[cpuId].name} gives`, TL.cpuCol.x, TL.cpuCol.y + 4);

  let uy = TL.userCol.y + 18;
  for (const slot of ROSTER_SLOT_KEYS) {
    const ue = f.teams[f.userTeamId].roster[slot];
    if (!ue) continue;
    const sel = game.franchiseTradeOffer && game.franchiseTradeOffer.type === "player" && game.franchiseTradeOffer.slot === slot;
    ctx.fillStyle = sel ? "#1d4ed8" : "#1e293b";
    ctx.fillRect(TL.userCol.x, uy - 11, TL.userCol.w, 16);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "10px Arial";
    ctx.fillText(`${getRosterSlotLabel(slot)} ${ue.displayLabel} (${getTradePlayerValue(ue, slot)})`, TL.userCol.x + 6, uy);
    uy += rowH;
  }
  for (const pick of getTeamOwnedPicks(f, f.userTeamId)) {
    const sel = game.franchiseTradeOffer && game.franchiseTradeOffer.type === "pick" && game.franchiseTradeOffer.pickId === pick.id;
    ctx.fillStyle = sel ? "#1d4ed8" : "#1e293b";
    ctx.fillRect(TL.userCol.x, uy - 11, TL.userCol.w, 16);
    ctx.fillStyle = "#fde68a";
    ctx.fillText(`PICK ${formatTradePickLabel(pick)} (${getTradePickValue(pick)})`, TL.userCol.x + 6, uy);
    uy += rowH;
  }

  let cy = TL.cpuCol.y + 18;
  for (const slot of ROSTER_SLOT_KEYS) {
    const ce = f.teams[cpuId].roster[slot];
    if (!ce) continue;
    const sel = game.franchiseTradeWant && game.franchiseTradeWant.type === "player" && game.franchiseTradeWant.slot === slot;
    ctx.fillStyle = sel ? "#9d174d" : "#1e293b";
    ctx.fillRect(TL.cpuCol.x, cy - 11, TL.cpuCol.w, 16);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(`${getRosterSlotLabel(slot)} ${ce.displayLabel} (${getTradePlayerValue(ce, slot)})`, TL.cpuCol.x + 6, cy);
    cy += rowH;
  }
  for (const pick of getTeamOwnedPicks(f, cpuId)) {
    const sel = game.franchiseTradeWant && game.franchiseTradeWant.type === "pick" && game.franchiseTradeWant.pickId === pick.id;
    ctx.fillStyle = sel ? "#9d174d" : "#1e293b";
    ctx.fillRect(TL.cpuCol.x, cy - 11, TL.cpuCol.w, 16);
    ctx.fillStyle = "#fde68a";
    ctx.fillText(`PICK ${formatTradePickLabel(pick)} (${getTradePickValue(pick)})`, TL.cpuCol.x + 6, cy);
    cy += rowH;
  }

  ctx.fillStyle = "#16a34a";
  ctx.fillRect(TL.propose.x, TL.propose.y, TL.propose.w, TL.propose.h);
  ctx.strokeStyle = COLORS.white;
  ctx.strokeRect(TL.propose.x, TL.propose.y, TL.propose.w, TL.propose.h);
  ctx.fillStyle = COLORS.white;
  ctx.textAlign = "center";
  ctx.font = "bold 13px Arial";
  ctx.fillText("Propose Trade", TL.propose.x + TL.propose.w / 2, TL.propose.y + 23);
}

function drawFranchiseDraftPanel(f, L) {
  const pick = getCurrentDraftPick(f);
  const DL = getFranchiseDraftLayout();
  ctx.textAlign = "center";
  ctx.fillStyle = "#fde68a";
  ctx.font = "bold 15px Arial";
  if (pick) {
    const onClock = pick.teamId === f.userTeamId;
    ctx.fillText(
      onClock ? `Your pick — Round ${pick.round}, #${pick.index + 1}` : `${TEAMS[pick.teamId].name} on the clock…`,
      canvas.width / 2,
      100
    );
  } else {
    ctx.fillText("Draft complete", canvas.width / 2, 100);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 11px Arial";
  ctx.fillText("PROSPECT", DL.list.x + 8, DL.list.y + 16);
  ctx.fillText("OVR", DL.list.x + 220, DL.list.y + 16);
  ctx.fillText("DEV", DL.list.x + 270, DL.list.y + 16);
  let y = DL.list.y + 34;
  const pool = (f.draftPool || []).slice(0, 12);
  for (let i = 0; i < pool.length; i += 1) {
    const p = pool[i];
    const sel = game.franchiseDraftSel === i;
    ctx.fillStyle = sel ? "#1d4ed8" : "transparent";
    ctx.fillRect(DL.list.x, y - 12, DL.list.w, 20);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px Arial";
    ctx.fillText(p.displayLabel, DL.list.x + 8, y);
    ctx.fillText(String(p.projectedOvr), DL.list.x + 220, y);
    const trait = getDevTraitDef(p.devTrait);
    ctx.fillStyle = trait.color;
    ctx.fillText(trait.label, DL.list.x + 270, y);
    y += 22;
  }
  if (pick && pick.teamId === f.userTeamId) {
    const slots = [
      ["QB", DL.slotQb, "qb"],
      ["WR", DL.slotWr, "wr"],
      ["FLEX", DL.slotFlex, "flex"],
      ["RB", DL.slotP4, "p4"],
      ["C", DL.slotP5, "p5"]
    ];
    for (const [lab, r, key] of slots) {
      ctx.fillStyle = "#374151";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = COLORS.white;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = COLORS.white;
      ctx.textAlign = "center";
      ctx.font = "bold 10px Arial";
      ctx.fillText(`Draft ${lab}`, r.x + r.w / 2, r.y + 19);
    }
    ctx.fillStyle = "#374151";
    ctx.fillRect(DL.slotBench.x, DL.slotBench.y, DL.slotBench.w, DL.slotBench.h);
    ctx.strokeStyle = COLORS.white;
    ctx.strokeRect(DL.slotBench.x, DL.slotBench.y, DL.slotBench.w, DL.slotBench.h);
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "center";
    ctx.font = "bold 10px Arial";
    ctx.fillText("Draft to Bench", DL.slotBench.x + DL.slotBench.w / 2, DL.slotBench.y + 19);
  }
}

function drawFranchiseFreeAgencyPanel(f, L) {
  const DL = getFranchiseFreeAgencyLayout();
  ctx.textAlign = "center";
  ctx.fillStyle = "#fde68a";
  ctx.font = "bold 15px Arial";
  ctx.fillText("Sign free agents to your roster", canvas.width / 2, 100);
  const page = f.faPage || 0;
  const pool = f.freeAgents || [];
  const perPage = 10;
  const slice = pool.slice(page * perPage, page * perPage + perPage);
  ctx.textAlign = "left";
  let y = DL.list.y + 20;
  for (let i = 0; i < slice.length; i += 1) {
    const p = slice[i];
    const sel = game.franchiseFaSel === i;
    ctx.fillStyle = sel ? "#1d4ed8" : "transparent";
    ctx.fillRect(DL.list.x, y - 12, DL.list.w, 20);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px Arial";
    ctx.fillText(`${p.displayLabel}  OVR ${p.projectedOvr}  ${getDevTraitDef(p.devTrait).label}`, DL.list.x + 8, y);
    y += 22;
  }
  const slots = [
    ["QB", DL.slotQb, "qb"],
    ["WR", DL.slotWr, "wr"],
    ["FLEX", DL.slotFlex, "flex"],
    ["RB", DL.slotP4, "p4"],
    ["C", DL.slotP5, "p5"]
  ];
  for (const [lab, r] of slots) {
    ctx.fillStyle = "#374151";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = COLORS.white;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "center";
    ctx.font = "bold 10px Arial";
    ctx.fillText(`Sign ${lab}`, r.x + r.w / 2, r.y + 19);
  }
  ctx.fillStyle = "#374151";
  ctx.fillRect(DL.slotBench.x, DL.slotBench.y, DL.slotBench.w, DL.slotBench.h);
  ctx.strokeStyle = COLORS.white;
  ctx.strokeRect(DL.slotBench.x, DL.slotBench.y, DL.slotBench.w, DL.slotBench.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 10px Arial";
  ctx.fillText("Sign to Bench", DL.slotBench.x + DL.slotBench.w / 2, DL.slotBench.y + 19);
  ctx.fillStyle = "#16a34a";
  ctx.fillRect(DL.finish.x, DL.finish.y, DL.finish.w, DL.finish.h);
  ctx.strokeStyle = COLORS.white;
  ctx.strokeRect(DL.finish.x, DL.finish.y, DL.finish.w, DL.finish.h);
  ctx.fillStyle = COLORS.white;
  ctx.fillText("Finish FA → New Season", DL.finish.x + DL.finish.w / 2, DL.finish.y + 23);
}
