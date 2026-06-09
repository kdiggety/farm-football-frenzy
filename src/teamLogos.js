// =========================================================
// Procedural team logos — unique emblem per club
// =========================================================

const TEAM_LOGO_SYMBOLS = [
  "owl", "gnat", "crow", "rat", "sheep", "goat", "donkey", "horse", "mole", "pig",
  "rooster", "duck", "badger", "cow", "skunk", "boar", "bull", "ram", "gopher", "hog",
  "cat", "silo", "wheat", "bolt", "paw", "horn", "plow", "barn", "fork", "sickle",
  "windmill", "haybale"
];

function drawLogoSymbol(ctx, symbol, cx, cy, r) {
  const s = r * 0.72;
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (symbol === "owl" || symbol === "crow" || symbol === "rooster" || symbol === "duck") {
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.08, s * 0.55, s * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.15);
    ctx.lineTo(cx - s * 0.18, cy - s * 0.55);
    ctx.lineTo(cx + s * 0.18, cy - s * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.arc(cx - s * 0.18, cy, s * 0.12, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.18, cy, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (symbol === "gnat" || symbol === "gopher" || symbol === "mole") {
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 0.45, s * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.1, cy - s * 0.35);
    ctx.quadraticCurveTo(cx, cy - s * 0.75, cx + s * 0.1, cy - s * 0.35);
    ctx.stroke();
    return;
  }

  if (symbol === "rat" || symbol === "cat" || symbol === "skunk") {
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.05, s * 0.5, s * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.42, cy - s * 0.05);
    ctx.lineTo(cx - s * 0.55, cy - s * 0.45);
    ctx.lineTo(cx - s * 0.2, cy - s * 0.2);
    ctx.moveTo(cx + s * 0.42, cy - s * 0.05);
    ctx.lineTo(cx + s * 0.55, cy - s * 0.45);
    ctx.lineTo(cx + s * 0.2, cy - s * 0.2);
    ctx.fill();
    return;
  }

  if (symbol === "sheep" || symbol === "cow" || symbol === "boar" || symbol === "bull" || symbol === "bison" || symbol === "hog") {
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.48, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * s * 0.38, cy + Math.sin(a) * s * 0.38, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (symbol === "goat" || symbol === "ram" || symbol === "bull" || symbol === "horn") {
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.1, s * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.35, cy - s * 0.1);
    ctx.quadraticCurveTo(cx - s * 0.7, cy - s * 0.75, cx - s * 0.15, cy - s * 0.35);
    ctx.quadraticCurveTo(cx - s * 0.05, cy - s * 0.55, cx - s * 0.35, cy - s * 0.1);
    ctx.moveTo(cx + s * 0.35, cy - s * 0.1);
    ctx.quadraticCurveTo(cx + s * 0.7, cy - s * 0.75, cx + s * 0.15, cy - s * 0.35);
    ctx.quadraticCurveTo(cx + s * 0.05, cy - s * 0.55, cx + s * 0.35, cy - s * 0.1);
    ctx.fill();
    return;
  }

  if (symbol === "donkey" || symbol === "horse") {
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.12, s * 0.42, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.08, cy - s * 0.35);
    ctx.lineTo(cx - s * 0.2, cy - s * 0.85);
    ctx.lineTo(cx + s * 0.05, cy - s * 0.35);
    ctx.fill();
    return;
  }

  if (symbol === "pig") {
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 0.5, s * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.12, s * 0.22, s * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(cx - s * 0.18, cy - s * 0.08, s * 0.06, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.18, cy - s * 0.08, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (symbol === "badger" || symbol === "paw") {
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.1, s * 0.42, s * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const ox of [-0.22, 0, 0.22]) {
      ctx.beginPath();
      ctx.ellipse(cx + s * ox, cy - s * 0.28, s * 0.1, s * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (symbol === "paw") {
      for (const ox of [-0.18, -0.06, 0.06, 0.18]) {
        ctx.beginPath();
        ctx.arc(cx + s * ox, cy + s * 0.22, s * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }

  if (symbol === "silo") {
    ctx.fillRect(cx - s * 0.22, cy - s * 0.45, s * 0.44, s * 0.9);
    ctx.beginPath();
    ctx.ellipse(cx, cy - s * 0.45, s * 0.22, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(cx - s * 0.08, cy - s * 0.2, s * 0.16, s * 0.35);
    return;
  }

  if (symbol === "wheat" || symbol === "sickle" || symbol === "fork") {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.45);
    ctx.lineTo(cx, cy - s * 0.45);
    ctx.stroke();
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.ellipse(cx + i * s * 0.12, cy - s * 0.2 + Math.abs(i) * s * 0.08, s * 0.08, s * 0.18, i * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (symbol === "bolt" || symbol === "windmill") {
    if (symbol === "bolt") {
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.05, cy - s * 0.5);
      ctx.lineTo(cx - s * 0.2, cy + s * 0.05);
      ctx.lineTo(cx + s * 0.02, cy + s * 0.05);
      ctx.lineTo(cx - s * 0.05, cy + s * 0.5);
      ctx.lineTo(cx + s * 0.2, cy - s * 0.05);
      ctx.lineTo(cx - s * 0.02, cy - s * 0.05);
      ctx.closePath();
      ctx.fill();
      return;
    }
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * s * 0.5, cy + Math.sin(a) * s * 0.5);
      ctx.lineTo(cx + Math.cos(a + 0.35) * s * 0.22, cy + Math.sin(a + 0.35) * s * 0.22);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (symbol === "plow" || symbol === "barn" || symbol === "haybale") {
    if (symbol === "barn") {
      ctx.fillRect(cx - s * 0.42, cy - s * 0.05, s * 0.84, s * 0.5);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.48, cy - s * 0.05);
      ctx.lineTo(cx, cy - s * 0.55);
      ctx.lineTo(cx + s * 0.48, cy - s * 0.05);
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (symbol === "haybale") {
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * 0.55, s * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.5, cy + i * s * 0.1);
        ctx.lineTo(cx + s * 0.5, cy + i * s * 0.1);
        ctx.stroke();
      }
      return;
    }
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.45, cy + s * 0.35);
    ctx.lineTo(cx + s * 0.45, cy + s * 0.35);
    ctx.lineTo(cx + s * 0.15, cy - s * 0.35);
    ctx.lineTo(cx - s * 0.15, cy - s * 0.35);
    ctx.closePath();
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
  ctx.fill();
}

function getTeamLogoSpec(teamId) {
  const team = teamId && TEAMS[teamId];
  if (!team) return null;
  const idx = Math.max(0, PLAY_TEAM_IDS.indexOf(teamId));
  return {
    symbol: team.logoSymbol || TEAM_LOGO_SYMBOLS[idx % TEAM_LOGO_SYMBOLS.length],
    shortName: team.shortName || String(team.name || teamId).slice(0, 3).toUpperCase(),
    primary: team.endZoneColor || "#374151",
    accent: (team.roster && team.roster.qb && team.roster.qb.ballAccent) || "#fde68a",
    emblem: (team.roster && team.roster.qb && team.roster.qb.color) || "#94a3b8"
  };
}

function drawTeamLogoBadge(ctx, teamId, x, y, w, h, opts = {}) {
  const spec = getTeamLogoSpec(teamId);
  if (!spec) return;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) * 0.42;
  const round = opts.round !== false;

  ctx.save();
  if (round) {
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(w, h) / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
  }

  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, spec.primary);
  grad.addColorStop(1, spec.emblem);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = Math.max(2, h * 0.04);
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x, y + h * (0.25 + i * 0.22));
    ctx.lineTo(x + w, y + h * (0.15 + i * 0.22));
    ctx.stroke();
  }

  ctx.fillStyle = spec.accent;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  drawLogoSymbol(ctx, spec.symbol, cx, cy - h * 0.04, r);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x, y + h - h * 0.22, w, h * 0.22);
  ctx.fillStyle = COLORS.white;
  ctx.font = `bold ${Math.max(10, Math.floor(h * 0.14))}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText(spec.shortName, cx, y + h - h * 0.07);

  ctx.restore();

  if (round) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = Math.max(2, h * 0.035);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(w, h) / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function teamHasBannerArt(teamId) {
  const team = teamId && TEAMS[teamId];
  return !!(team && team.bannerSrc);
}

function drawTeamLogoOrBanner(ctx, teamId, x, y, w, h, opts = {}) {
  const img = teamBannerImages && teamBannerImages[teamId];
  if (teamHasBannerArt(teamId) && img && img.complete && img.naturalWidth) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
    return;
  }
  drawTeamLogoBadge(ctx, teamId, x, y, w, h, opts);
}
