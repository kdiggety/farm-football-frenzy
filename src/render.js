// =========================================================
// Rendering
// =========================================================
const barnBgImage = new Image();
barnBgImage.src = "assets/barn_retro.png";

const teamBannerImages = {};
for (const id of PLAY_TEAM_IDS) {
  const im = new Image();
  im.src = TEAMS[id].bannerSrc;
  teamBannerImages[id] = im;
}

const coinHorseHeadImage = new Image();
coinHorseHeadImage.src = "assets/coin-horse-head.png";
const coinHorseTailImage = new Image();
coinHorseTailImage.src = "assets/coin-horse-tail.png";

const announcerFarmerImage = new Image();
announcerFarmerImage.src = "assets/announcer-commentator-box.png";

/** Translucent plate behind the announcer art so the field/game shows through slightly. */
function drawAnnouncerTranslucentBackdrop(bx, by, bw, bh, cornerR = 14) {
  ctx.save();
  ctx.fillStyle = "rgba(17, 24, 39, 0.42)";
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(bx, by, bw, bh, cornerR);
  } else {
    const r = Math.min(cornerR, bw / 2, bh / 2);
    ctx.moveTo(bx + r, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
    ctx.arcTo(bx + bw, by + bh, bx, by + bh, r);
    ctx.arcTo(bx, by + bh, bx, by, r);
    ctx.arcTo(bx, by, bx + bw, by, r);
    ctx.closePath();
  }
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawAnnouncerPortrait(x, y, height) {
  const img = announcerFarmerImage;
  if (!img.complete || !img.naturalWidth) return;
  const h = height;
  const w = (img.naturalWidth / img.naturalHeight) * h;
  const pad = 10;
  drawAnnouncerTranslucentBackdrop(x - pad, y - pad, w + pad * 2, h + pad * 2, 14);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

/** Draw team banner with cover fit inside rect (clipped). */
function drawTeamBannerImage(teamId, x, y, w, h) {
  const img = teamBannerImages[teamId];
  if (!img || !img.complete || !img.naturalWidth) return;
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
}

/** Team that begins on offense (player1's squad); used for midfield logo. */
function getMidfieldOffenseTeamId() {
  if (player1.teamTag && TEAMS[player1.teamTag]) return player1.teamTag;
  if (game.playUserTeamId && TEAMS[game.playUserTeamId]) return game.playUserTeamId;
  return "barnaby";
}

/** Circular midfield logo — offense team's banner (Haymakers in classic mode). */
function drawMidfieldOffenseLogo() {
  const teamId = getMidfieldOffenseTeamId();
  const img = teamBannerImages[teamId];
  const midX = FIELD.x + FIELD.width / 2;
  const midY = FIELD.y + FIELD.height / 2;
  const logoR = 58;

  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(midX, midY + 30, 72, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!img || !img.complete || !img.naturalWidth) return;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
  ctx.beginPath();
  ctx.arc(midX, midY, logoR, 0, Math.PI * 2);
  ctx.clip();
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max((logoR * 2) / iw, (logoR * 2) / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, midX - dw / 2, midY - dh / 2, dw, dh);
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(midX, midY, logoR, 0, Math.PI * 2);
  ctx.stroke();
}

function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Tiny front-facing farm animal spectator (stadium crowd). kind 0–11 = different species. */
function drawFarmSpectator(cx, cy, kind, scale) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  const k = ((kind % 12) + 12) % 12;
  if (k === 0) {
    // pig
    ctx.fillStyle = "#fbcfe8";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.ellipse(3, 1, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (k === 1) {
    // cow
    ctx.fillStyle = "#fafaf9";
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#171717";
    ctx.beginPath();
    ctx.arc(-2, -1, 1.2, 0, Math.PI * 2);
    ctx.arc(3, 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#78716c";
    ctx.fillRect(-1, -7, 2, 3);
    ctx.fillRect(2, -6, 2, 3);
  } else if (k === 2) {
    // chicken
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.arc(0, 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(-2, -4);
    ctx.lineTo(2, -4);
    ctx.lineTo(0, -7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(4, 2);
    ctx.lineTo(7, 2);
    ctx.lineTo(5, 3);
    ctx.closePath();
    ctx.fill();
  } else if (k === 3) {
    // sheep
    ctx.fillStyle = "#fafaf9";
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * 2.5, Math.sin(ang) * 2.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(0, 1, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (k === 4) {
    // duck
    ctx.fillStyle = "#fcd34d";
    ctx.beginPath();
    ctx.ellipse(0, 1, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(5, 2);
    ctx.quadraticCurveTo(10, 2, 8, 4);
    ctx.lineTo(5, 3);
    ctx.closePath();
    ctx.fill();
  } else if (k === 5) {
    // horse
    ctx.fillStyle = "#ea580c";
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#431407";
    ctx.beginPath();
    ctx.moveTo(-3, -4);
    ctx.lineTo(-2, -9);
    ctx.lineTo(0, -5);
    ctx.moveTo(2, -4);
    ctx.lineTo(3, -9);
    ctx.lineTo(4, -4);
    ctx.fill();
  } else if (k === 6) {
    // goat
    ctx.fillStyle = "#d6c4a8";
    ctx.beginPath();
    ctx.arc(0, 1, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#78716c";
    ctx.beginPath();
    ctx.moveTo(-4, -3);
    ctx.lineTo(-6, -9);
    ctx.lineTo(-2, -4);
    ctx.moveTo(3, -3);
    ctx.lineTo(5, -9);
    ctx.lineTo(4, -4);
    ctx.fill();
  } else if (k === 7) {
    // donkey
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.ellipse(-4, -6, 2, 5, 0.3, 0, Math.PI * 2);
    ctx.ellipse(4, -6, 2, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (k === 8) {
    // barn cat
    ctx.fillStyle = "#fdba74";
    ctx.beginPath();
    ctx.arc(0, 1, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-1, -3);
    ctx.moveTo(4, -2);
    ctx.lineTo(6, -7);
    ctx.lineTo(1, -3);
    ctx.fill();
  } else if (k === 9) {
    // dog
    ctx.fillStyle = "#a16207";
    ctx.beginPath();
    ctx.arc(0, 1, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.ellipse(4, 3, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (k === 10) {
    // bunny
    ctx.fillStyle = "#e7e5e4";
    ctx.beginPath();
    ctx.arc(0, 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-3, -4, 1.5, 5, -0.2, 0, Math.PI * 2);
    ctx.ellipse(3, -4, 1.5, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // goose / duck fan
    ctx.fillStyle = "#f1f5f9";
    ctx.beginPath();
    ctx.ellipse(0, 1, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(4, 2);
    ctx.lineTo(9, 3);
    ctx.lineTo(4, 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Deterministic “random” 0–1 from integers (stable crowd each frame). */
function crowdHash(a, b) {
  const s = Math.sin(a * 12.9898 + b * 78.233 + a * b * 0.001) * 43758.5453;
  return s - Math.floor(s);
}

function drawStadiumCrowd() {
  const fieldL = FIELD.x;
  const fieldR = FIELD.x + FIELD.width;
  const fieldT = FIELD.y;
  const fieldB = FIELD.y + FIELD.height;

  const standBack = "#1c1410";
  const standMid = "#2d2118";
  const standFront = "#3d2e22";

  function fillStandGradient(x, y, w, h, vertical) {
    const g = vertical
      ? ctx.createLinearGradient(x, y, x + w, y)
      : ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, standBack);
    g.addColorStop(0.45, standMid);
    g.addColorStop(1, standFront);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }

  // --- Bottom grandstand (largest) ---
  const botY = fieldB + 4;
  const botH = Math.max(0, canvas.height - botY - 2);
  if (botH > 12) {
    fillStandGradient(0, botY, canvas.width, botH, false);
    for (let t = 1; t <= 3; t++) {
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, botY + (t * botH) / 4);
      ctx.lineTo(canvas.width, botY + (t * botH) / 4);
      ctx.stroke();
    }
    const cols = Math.floor(canvas.width / 13);
    const rows = Math.min(5, Math.floor(botH / 14));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const h1 = crowdHash(c, r + 200);
        const h2 = crowdHash(r, c + 400);
        const kind = Math.floor(h1 * 12);
        const x = 8 + c * 13 + h2 * 4;
        const y = botY + 8 + r * 13 + h1 * 3;
        const sc = 0.75 + h2 * 0.35;
        drawFarmSpectator(x, y, kind, sc);
      }
    }
    // rail
    ctx.fillStyle = "#5c4033";
    ctx.fillRect(0, botY, canvas.width, 3);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.strokeRect(0, botY, canvas.width, botH);
  }

  // --- Left & right stands (flush with dirt border at FIELD.x ± 18) ---
  const dirtLeft = FIELD.x - 18;
  const dirtRight = FIELD.x + FIELD.width + 18;
  const leftStandW = Math.max(0, dirtLeft);
  const rightStandX = dirtRight;
  const rightStandW = Math.max(0, canvas.width - dirtRight);

  function drawSideStand(x0, w) {
    if (w < 8) return;
    fillStandGradient(x0, fieldT, w, fieldB - fieldT, true);
    for (let t = 1; t <= 2; t++) {
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.moveTo(x0 + (t * w) / 3, fieldT);
      ctx.lineTo(x0 + (t * w) / 3, fieldB);
      ctx.stroke();
    }
    const cols = Math.max(1, Math.floor(w / 12));
    const rows = Math.floor((fieldB - fieldT) / 14);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const h1 = crowdHash(c + 50, r + 900);
        const h2 = crowdHash(r, c + 700);
        const kind = Math.floor(h1 * 12);
        const x = x0 + 5 + c * 12 + h2 * 2;
        const y = fieldT + 10 + r * 13 + h1 * 2;
        drawFarmSpectator(x, y, kind, 0.65 + h2 * 0.25);
      }
    }
    ctx.fillStyle = "#5c4033";
    ctx.fillRect(x0 + w - 2, fieldT, 2, fieldB - fieldT);
  }

  drawSideStand(0, leftStandW);
  drawSideStand(rightStandX, rightStandW);

  // --- Thin row under scoreboard gap (top) ---
  const topRowY = 62;
  const topRowH = Math.max(0, fieldT - topRowY - 4);
  if (topRowH > 10) {
    ctx.fillStyle = standMid;
    ctx.fillRect(0, topRowY, canvas.width, topRowH);
    const tc = Math.floor(canvas.width / 16);
    for (let c = 0; c < tc; c++) {
      const h = crowdHash(c, 33);
      drawFarmSpectator(12 + c * 16 + h * 3, topRowY + topRowH / 2 + 2, Math.floor(h * 12), 0.55 + h * 0.15);
    }
  }

  // Pennants strung along front of bottom grandstand
  if (botH > 12) {
    const pennantTop = botY + 2;
    ctx.save();
    for (let p = 0; p < 28; p++) {
      const px = 20 + p * 34 + (crowdHash(p, 1) * 8 - 4);
      const hue = [220, 35, 142, 48, 280][p % 5];
      ctx.fillStyle = `hsl(${hue}, 70%, ${48 + (p % 3) * 8}%)`;
      ctx.beginPath();
      ctx.moveTo(px, pennantTop);
      ctx.lineTo(px + 8, pennantTop);
      ctx.lineTo(px + 4, pennantTop + 9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawField() {
  drawRect(0, 0, canvas.width, canvas.height, "#7fbf5b");

  drawStadiumCrowd();

  // Dirt border around field
  drawRect(FIELD.x - 18, FIELD.y - 18, FIELD.width + 36, FIELD.height + 36, "#7c4a1d");

  // Main field
  drawRect(FIELD.x, FIELD.y, FIELD.width, FIELD.height, COLORS.field);

  // Grass stripes
  const stripeCount = 8;
  const stripeH = FIELD.height / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    if (i % 2 === 0) {
      drawRect(FIELD.x, FIELD.y + i * stripeH, FIELD.width, stripeH, COLORS.fieldStripe);
    }
  }

  // End zones
  drawRect(FIELD.x, FIELD.y, FIELD.endZoneWidth, FIELD.height, COLORS.leftEndZone);
  drawRect(FIELD.x + FIELD.width - FIELD.endZoneWidth, FIELD.y, FIELD.endZoneWidth, FIELD.height, COLORS.rightEndZone);

  // Boundary lines
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 4;
  ctx.strokeRect(FIELD.x, FIELD.y, FIELD.width, FIELD.height);

  // Midfield
  ctx.beginPath();
  ctx.moveTo(FIELD.x + FIELD.width / 2, FIELD.y);
  ctx.lineTo(FIELD.x + FIELD.width / 2, FIELD.y + FIELD.height);
  ctx.stroke();

  // Yard lines
  ctx.lineWidth = 2;
  for (let i = 1; i < 10; i++) {
    const playableWidth = FIELD.width - FIELD.endZoneWidth * 2;
    const segment = playableWidth / 10;
    const x = FIELD.x + FIELD.endZoneWidth + segment * i;
    ctx.beginPath();
    ctx.moveTo(x, FIELD.y + 18);
    ctx.lineTo(x, FIELD.y + FIELD.height - 18);
    ctx.stroke();

    // Yard numbers (10 to 50 from each end zone toward midfield)
    const yardsFromLeft = (i * 10);
    const yardNumber = yardsFromLeft <= 50 ? yardsFromLeft : 100 - yardsFromLeft;
    if (yardNumber > 0 && yardNumber <= 50) {
      ctx.fillStyle = COLORS.line;
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      // Top numbers
      ctx.fillText(String(yardNumber), x, FIELD.y + 40);
      // Bottom numbers
      ctx.fillText(String(yardNumber), x, FIELD.y + FIELD.height - 22);
    }
  }

  // Goal posts — compact top-down “H” (crossbar is a short span at midfield, not full sideline height)
  const crossbarSpan = 96;
  const crossbarThick = 4;
  const uprightLen = 14;
  const uprightThick = 4;
  const poleLen = 9;
  const poleThick = 3;
  const postFill = "#facc15";
  const postHighlight = "#fef9c3";
  const postShadow = "#b45309";

  function drawGoalPost(goalLineX, intoEndZoneDir) {
    const midY = FIELD.y + FIELD.height / 2;
    const yTop = midY - crossbarSpan / 2;
    const yBot = midY + crossbarSpan / 2;
    const inward = intoEndZoneDir;
    // Upright stems extend toward the field (not into the end zone)
    const ux = inward > 0 ? goalLineX - uprightLen : goalLineX;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 1;

    // Crossbar (spans full width between sidelines — vertical segment in screen space)
    const cx = goalLineX - crossbarThick / 2;
    const grd = ctx.createLinearGradient(cx, yTop, cx + crossbarThick, yTop);
    grd.addColorStop(0, postShadow);
    grd.addColorStop(0.35, postFill);
    grd.addColorStop(0.65, postHighlight);
    grd.addColorStop(1, postShadow);
    ctx.fillStyle = grd;
    ctx.fillRect(cx, yTop, crossbarThick, yBot - yTop);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(120,53,15,0.9)";
    ctx.strokeRect(cx, yTop, crossbarThick, yBot - yTop);

    // Upright caps at top & bottom (stems point toward midfield)
    function drawUprightCap(y) {
      const uy = y - uprightThick / 2;
      const ugrd = ctx.createLinearGradient(ux, uy, ux + uprightLen, uy);
      ugrd.addColorStop(0, postShadow);
      ugrd.addColorStop(0.4, postFill);
      ugrd.addColorStop(1, postHighlight);
      ctx.fillStyle = ugrd;
      ctx.fillRect(ux, uy, uprightLen, uprightThick);
      ctx.strokeStyle = "rgba(120,53,15,0.9)";
      ctx.strokeRect(ux, uy, uprightLen, uprightThick);
    }
    drawUprightCap(yTop);
    drawUprightCap(yBot);

    // Center stanchion — opposite side from the two outside upright caps (Y-fork / slingshot look)
    const poleX = inward > 0 ? goalLineX : goalLineX - poleLen;
    const poleGrd = ctx.createLinearGradient(poleX, midY, poleX + poleLen, midY);
    poleGrd.addColorStop(0, postShadow);
    poleGrd.addColorStop(0.5, postFill);
    poleGrd.addColorStop(1, postHighlight);
    ctx.fillStyle = poleGrd;
    ctx.fillRect(poleX, midY - poleThick / 2, poleLen, poleThick);
    ctx.strokeStyle = "rgba(120,53,15,0.85)";
    ctx.strokeRect(poleX, midY - poleThick / 2, poleLen, poleThick);

    ctx.restore();
  }

  const leftGoalLineX = FIELD.x + 14;
  const rightGoalLineX = FIELD.x + FIELD.width - 14;
  drawGoalPost(leftGoalLineX, 1);
  drawGoalPost(rightGoalLineX, -1);

  // Midfield: offense team's banner (who starts / started on offense first)
  drawMidfieldOffenseLogo();

  // Fence posts
  for (let x = FIELD.x - 10; x <= FIELD.x + FIELD.width + 10; x += 32) {
    drawRect(x, FIELD.y - 30, 8, 22, COLORS.fence);
    drawRect(x, FIELD.y + FIELD.height + 8, 8, 22, COLORS.fence);
  }

  // Fence rails
  drawRect(FIELD.x - 10, FIELD.y - 20, FIELD.width + 20, 5, "#caa472");
  drawRect(FIELD.x - 10, FIELD.y - 10, FIELD.width + 20, 5, "#caa472");
  drawRect(FIELD.x - 10, FIELD.y + FIELD.height + 15, FIELD.width + 20, 5, "#caa472");
  drawRect(FIELD.x - 10, FIELD.y + FIELD.height + 25, FIELD.width + 20, 5, "#caa472");

  // Hay bales
  drawHayBale(FIELD.x + 18, FIELD.y - 60);
  drawHayBale(FIELD.x + FIELD.width - 64, FIELD.y - 60);
  drawHayBale(FIELD.x + 18, FIELD.y + FIELD.height + 36);
  drawHayBale(FIELD.x + FIELD.width - 64, FIELD.y + FIELD.height + 36);

  // End zone labels: defense left, offense right (player1 squad = offense, player2 = defense)
  let leftEndZoneName = "Professor Pig";
  let rightEndZoneName = "Barnaby";
  if (game.playUserTeamId && game.playCpuTeamId) {
    if (player1.teamTag && player2.teamTag) {
      leftEndZoneName = TEAMS[player2.teamTag].name;
      rightEndZoneName = TEAMS[player1.teamTag].name;
    } else {
      leftEndZoneName = TEAMS[game.playCpuTeamId].name;
      rightEndZoneName = TEAMS[game.playUserTeamId].name;
    }
  }
  const longest = Math.max(leftEndZoneName.length, rightEndZoneName.length);
  const fontPx = longest > 20 ? 13 : longest > 14 ? 16 : 22;
  ctx.fillStyle = COLORS.white;
  ctx.font = `bold ${fontPx}px Arial`;
  ctx.textAlign = "center";
  ctx.save();
  ctx.translate(FIELD.x + FIELD.endZoneWidth / 2, FIELD.y + FIELD.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(leftEndZoneName, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(FIELD.x + FIELD.width - FIELD.endZoneWidth / 2, FIELD.y + FIELD.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(rightEndZoneName, 0, 0);
  ctx.restore();
}

function drawHayBale(x, y) {
  drawRect(x, y, 46, 26, COLORS.straw);
  ctx.strokeStyle = "#a16207";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, 46, 26);
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 5);
  ctx.lineTo(x + 8, y + 21);
  ctx.moveTo(x + 23, y + 5);
  ctx.lineTo(x + 23, y + 21);
  ctx.moveTo(x + 38, y + 5);
  ctx.lineTo(x + 38, y + 21);
  ctx.stroke();
}

function drawShadow(x, y, radiusX, radiusY, c = ctx) {
  c.fillStyle = COLORS.shadow;
  c.beginPath();
  c.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  c.fill();
}

/** Roster previews: 1:1 game-sized draw, then scaled with drawImage (matches field pixels). */
const TEAM_SELECT_PLAYER_BUFFER = document.createElement("canvas");
TEAM_SELECT_PLAYER_BUFFER.width = 100;
TEAM_SELECT_PLAYER_BUFFER.height = 100;
const TEAM_SELECT_PLAYER_CTX = TEAM_SELECT_PLAYER_BUFFER.getContext("2d");
const TEAM_SELECT_PREVIEW_CX = 50;
const TEAM_SELECT_PREVIEW_CY = 54;

function drawPlayer(player, renderCtx) {
  const c = renderCtx ?? ctx;
  const label = player.displayLabel || player.name;
  const accentText = player.ballAccent || COLORS.white;
  const appearanceId = player.appearanceId || player.id;
  const R = player.radius;
  const sc = R / 20;
  drawShadow(player.x, player.y + R + 8 * sc, R * 0.9, 7 * sc, c);

  // Body
  c.fillStyle = player.color;
  c.beginPath();
  c.arc(player.x, player.y, R, 0, Math.PI * 2);
  c.fill();

  // Ears / snout / unique feature details (matches in-game colors)
  if (appearanceId === "player1") {
    c.fillStyle = "#93c5fd";
    c.beginPath();
    c.ellipse(player.x - 8 * sc, player.y - 20 * sc, 5 * sc, 10 * sc, -0.3, 0, Math.PI * 2);
    c.ellipse(player.x + 8 * sc, player.y - 20 * sc, 5 * sc, 10 * sc, 0.3, 0, Math.PI * 2);
    c.fill();
  } else if (appearanceId === "cluckNorris") {
    c.fillStyle = "#dc2626";
    for (let i = -1; i <= 1; i++) {
      const cx = player.x + i * 10 * sc;
      const cy = player.y - R;
      const r  = (i === 0 ? 10 : 7) * sc;
      c.beginPath();
      c.arc(cx, cy, r, Math.PI, 0);
      c.closePath();
      c.fill();
    }
    c.beginPath();
    c.moveTo(player.x - 5 * sc, player.y + 2 * sc);
    c.lineTo(player.x + 5 * sc, player.y + 2 * sc);
    c.lineTo(player.x, player.y + 10 * sc);
    c.closePath();
    c.fill();
  } else if (appearanceId === "nightwing") {
    c.fillStyle = "#57534e";
    c.beginPath();
    c.ellipse(player.x - 10 * sc, player.y - R - 2 * sc, 6 * sc, 12 * sc, -0.25, 0, Math.PI * 2);
    c.ellipse(player.x + 10 * sc, player.y - R - 2 * sc, 6 * sc, 12 * sc, 0.25, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#fbbf24";
    c.beginPath();
    c.moveTo(player.x - 4 * sc, player.y + 6 * sc);
    c.lineTo(player.x + 4 * sc, player.y + 6 * sc);
    c.lineTo(player.x, player.y + 12 * sc);
    c.closePath();
    c.fill();
  } else if (appearanceId === "patTheGnat") {
    function patLeftWingPath() {
      c.moveTo(player.x - 16 * sc, player.y - 2 * sc);
      c.lineTo(player.x - 44 * sc, player.y - 26 * sc);
      c.quadraticCurveTo(
        player.x - 40 * sc,
        player.y - 14 * sc,
        player.x - 18 * sc,
        player.y + 4 * sc
      );
      c.closePath();
    }
    function patRightWingPath() {
      c.moveTo(player.x + 16 * sc, player.y - 2 * sc);
      c.lineTo(player.x + 44 * sc, player.y - 26 * sc);
      c.quadraticCurveTo(
        player.x + 40 * sc,
        player.y - 14 * sc,
        player.x + 18 * sc,
        player.y + 4 * sc
      );
      c.closePath();
    }
    c.fillStyle = "rgba(255,255,255,0.45)";
    c.beginPath();
    patLeftWingPath();
    c.fill();
    c.beginPath();
    patRightWingPath();
    c.fill();
    c.strokeStyle = "rgba(255,255,255,0.6)";
    c.lineWidth = 1.2 * sc;
    c.beginPath();
    patLeftWingPath();
    c.stroke();
    c.beginPath();
    patRightWingPath();
    c.stroke();
  } else if (appearanceId === "joeCrow") {
    c.fillStyle = "#0a0a0a";
    c.beginPath();
    c.moveTo(player.x + R - 2 * sc, player.y + 2 * sc);
    c.lineTo(player.x + R + 14 * sc, player.y + 4 * sc);
    c.lineTo(player.x + R - 2 * sc, player.y + 8 * sc);
    c.closePath();
    c.fill();
    c.strokeStyle = "#fbbf24";
    c.lineWidth = 3 * sc;
    c.beginPath();
    c.arc(player.x, player.y + 10 * sc, R * 0.72, 0.2, Math.PI - 0.2);
    c.stroke();
  } else if (appearanceId === "whiskersRat") {
    c.fillStyle = "#9ca3af";
    c.beginPath();
    c.ellipse(player.x - R + 2 * sc, player.y - 10 * sc, 7 * sc, 9 * sc, -0.3, 0, Math.PI * 2);
    c.ellipse(player.x + R - 2 * sc, player.y - 10 * sc, 7 * sc, 9 * sc, 0.3, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#d1d5db";
    c.lineWidth = 1 * sc;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo(player.x + i * 5 * sc - 10 * sc, player.y + 2 * sc);
      c.lineTo(player.x + i * 5 * sc - 18 * sc, player.y + 4 * sc);
      c.stroke();
    }
    c.fillStyle = "#fda4af";
    c.beginPath();
    c.arc(player.x, player.y + 4 * sc, 3 * sc, 0, Math.PI * 2);
    c.fill();
  } else if (appearanceId === "woolySheep") {
    c.strokeStyle = "#e7e5e4";
    c.lineWidth = 3 * sc;
    for (let a = 0; a < Math.PI * 2; a += 0.45) {
      const rx = Math.cos(a) * R;
      const ry = Math.sin(a) * R;
      c.beginPath();
      c.arc(player.x + rx * 0.92, player.y + ry * 0.92, 5 * sc, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = "#44403c";
    c.beginPath();
    c.ellipse(player.x, player.y + 2 * sc, 10 * sc, 8 * sc, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#fafaf9";
    c.beginPath();
    c.arc(player.x - R * 0.75, player.y - 4 * sc, 5 * sc, 0, Math.PI * 2);
    c.arc(player.x + R * 0.75, player.y - 4 * sc, 5 * sc, 0, Math.PI * 2);
    c.fill();
  } else if (appearanceId === "billyGoat") {
    c.fillStyle = "#fafaf9";
    c.beginPath();
    c.moveTo(player.x - 5 * sc, player.y - R + 2 * sc);
    c.quadraticCurveTo(
      player.x - 22 * sc,
      player.y - R - 8 * sc,
      player.x - 16 * sc,
      player.y - R - 22 * sc
    );
    c.lineTo(player.x - 10 * sc, player.y - R - 20 * sc);
    c.quadraticCurveTo(
      player.x - 14 * sc,
      player.y - R - 10 * sc,
      player.x - 3 * sc,
      player.y - R
    );
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(player.x + 5 * sc, player.y - R + 2 * sc);
    c.quadraticCurveTo(
      player.x + 22 * sc,
      player.y - R - 8 * sc,
      player.x + 16 * sc,
      player.y - R - 22 * sc
    );
    c.lineTo(player.x + 10 * sc, player.y - R - 20 * sc);
    c.quadraticCurveTo(
      player.x + 14 * sc,
      player.y - R - 10 * sc,
      player.x + 3 * sc,
      player.y - R
    );
    c.closePath();
    c.fill();
    c.fillStyle = "#a8a29e";
    c.beginPath();
    c.ellipse(player.x, player.y + 8 * sc, 6 * sc, 5 * sc, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#fefce8";
    c.beginPath();
    c.moveTo(player.x - 6 * sc, player.y + 5 * sc);
    c.lineTo(player.x - 2 * sc, player.y + 5 * sc);
    c.lineTo(player.x - 2 * sc, player.y + 11 * sc);
    c.lineTo(player.x - 6 * sc, player.y + 11 * sc);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(player.x + 2 * sc, player.y + 5 * sc);
    c.lineTo(player.x + 6 * sc, player.y + 5 * sc);
    c.lineTo(player.x + 6 * sc, player.y + 11 * sc);
    c.lineTo(player.x + 2 * sc, player.y + 11 * sc);
    c.closePath();
    c.fill();
    c.strokeStyle = "#d6d3d1";
    c.lineWidth = 0.8 * sc;
    c.strokeRect(player.x - 6 * sc, player.y + 5 * sc, 4 * sc, 6 * sc);
    c.strokeRect(player.x + 2 * sc, player.y + 5 * sc, 4 * sc, 6 * sc);
  } else if (appearanceId === "lilTunnelPete") {
    c.fillStyle = "#92400e";
    c.beginPath();
    c.ellipse(player.x - R + 3 * sc, player.y - 7 * sc, 5 * sc, 10 * sc, -0.22, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(player.x + R - 3 * sc, player.y - 7 * sc, 5 * sc, 10 * sc, 0.22, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#c8935a";
    c.beginPath();
    c.arc(player.x, player.y, R * 0.55, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#d97706";
    c.beginPath();
    c.ellipse(player.x, player.y + 6 * sc, 8 * sc, 5 * sc, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#7c2d12";
    c.beginPath();
    c.arc(player.x, player.y + 4 * sc, 2 * sc, 0, Math.PI * 2);
    c.fill();
  } else if (appearanceId === "player2") {
    c.fillStyle = "#fbcfe8";
    c.beginPath();
    c.ellipse(player.x, player.y + 5 * sc, 13 * sc, 9 * sc, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#be185d";
    c.beginPath();
    c.arc(player.x - 4 * sc, player.y + 5 * sc, 2 * sc, 0, Math.PI * 2);
    c.arc(player.x + 4 * sc, player.y + 5 * sc, 2 * sc, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#ec4899";
    c.lineWidth = 2 * sc;
    c.beginPath();
    c.arc(player.x + R + 4 * sc, player.y + 2 * sc, 4 * sc, -0.3, Math.PI * 0.8);
    c.stroke();
  } else if (appearanceId === "allyHorse") {
    c.fillStyle = "#3f2e1f";
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.arc(player.x + i * 6 * sc, player.y - R * 0.82, 7 * sc, Math.PI, 0);
      c.fill();
    }
    c.fillStyle = "#f4f4f5";
    c.beginPath();
    c.moveTo(player.x - 2 * sc, player.y - 8 * sc);
    c.lineTo(player.x, player.y + R * 0.35);
    c.lineTo(player.x + 2 * sc, player.y - 8 * sc);
    c.closePath();
    c.fill();
    c.fillStyle = player.color;
    c.beginPath();
    c.ellipse(player.x - 9 * sc, player.y - R - 3 * sc, 4 * sc, 9 * sc, -0.25, 0, Math.PI * 2);
    c.ellipse(player.x + 9 * sc, player.y - R - 3 * sc, 4 * sc, 9 * sc, 0.25, 0, Math.PI * 2);
    c.fill();
  } else if (appearanceId === "allyDonkey") {
    c.fillStyle = player.color;
    c.beginPath();
    c.ellipse(player.x - R * 0.35, player.y - R * 0.15, 6 * sc, 16 * sc, -0.32, 0, Math.PI * 2);
    c.ellipse(player.x + R * 0.35, player.y - R * 0.15, 6 * sc, 16 * sc, 0.32, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(player.x, player.y + 5 * sc, 10 * sc, 7 * sc, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#15803d";
    c.beginPath();
    c.arc(player.x - 3 * sc, player.y + 5 * sc, 1.6 * sc, 0, Math.PI * 2);
    c.arc(player.x + 3 * sc, player.y + 5 * sc, 1.6 * sc, 0, Math.PI * 2);
    c.fill();
  } else {
    c.fillStyle = "#f9a8d4";
    c.beginPath();
    c.ellipse(player.x, player.y + 4 * sc, 12 * sc, 8 * sc, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#7f1d1d";
    c.beginPath();
    c.arc(player.x - 4 * sc, player.y + 4 * sc, 1.5 * sc, 0, Math.PI * 2);
    c.arc(player.x + 4 * sc, player.y + 4 * sc, 1.5 * sc, 0, Math.PI * 2);
    c.fill();
  }

  // Eyes (scale with body so small previews stay proportional)
  const eyeX = 6 * sc;
  const eyeY = 5 * sc;
  const eyeW = 4 * sc;
  const pupilR = 2 * sc;
  c.fillStyle = COLORS.white;
  c.beginPath();
  c.arc(player.x - eyeX, player.y - eyeY, eyeW, 0, Math.PI * 2);
  c.arc(player.x + eyeX, player.y - eyeY, eyeW, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = COLORS.black;
  c.beginPath();
  c.arc(player.x - eyeX, player.y - eyeY, pupilR, 0, Math.PI * 2);
  c.arc(player.x + eyeX, player.y - eyeY, pupilR, 0, Math.PI * 2);
  c.fill();

  // Label
  if (!player.suppressNameTag) {
    c.fillStyle = COLORS.white;
    c.font = "bold 14px Arial";
    c.textAlign = "center";
    c.fillText(label, player.x, player.y - 30 * sc);
  }

  // Ball marker
  if (!player.suppressNameTag && ball.carrier === player) {
    c.fillStyle = accentText;
    c.font = "bold 12px Arial";
    c.fillText("BALL", player.x, player.y - 44 * sc);
  }
}

function drawBall() {
  const visualBall = getBallVisualState(ball);
  const height = visualBall.height;
  const visualY = visualBall.y;
  const shadowW = 10 + height * 0.06;
  const shadowH = 5 + height * 0.025;
  const ballW = Math.max(8.5, 12 - height * 0.025);
  const ballH = Math.max(5.5, 8 - height * 0.018);

  drawShadow(ball.x, visualBall.shadowY, shadowW, shadowH);

  ctx.fillStyle = COLORS.ball;
  ctx.beginPath();
  ctx.ellipse(ball.x, visualY, ballW, ballH, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#5b3718";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Laces
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ball.x - 3, visualY - 2);
  ctx.lineTo(ball.x + 3, visualY + 2);
  ctx.moveTo(ball.x - 1, visualY - 4);
  ctx.lineTo(ball.x + 5, visualY + 0);
  ctx.moveTo(ball.x - 5, visualY + 0);
  ctx.lineTo(ball.x + 1, visualY + 4);
  ctx.stroke();
}

function drawScoreboard() {
  drawRect(0, 0, canvas.width, 58, "#111827");

  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 26px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Farm Football Frenzy", canvas.width / 2, 36);

  ctx.font = "bold 20px Arial";
  const teamMode = game.playUserTeamId && game.teamScores;
  let leftText;
  let rightText;
  if (teamMode) {
    const offId = player1.teamTag;
    const defId = player2.teamTag;
    if (offId && defId && game.teamScores[offId] !== undefined && game.teamScores[defId] !== undefined) {
      leftText = `${TEAMS[defId].name}: ${game.teamScores[defId]}`;
      rightText = `${TEAMS[offId].name}: ${game.teamScores[offId]}`;
    } else {
      const u = game.playUserTeamId;
      const c = game.playCpuTeamId;
      leftText = `${TEAMS[c].name}: ${game.teamScores[c]}`;
      rightText = `${TEAMS[u].name}: ${game.teamScores[u]}`;
    }
  } else {
    leftText = `Professor Pig: ${player2.score}`;
    rightText = `Barnaby: ${player1.score}`;
  }
  const leftColor = "#93c5fd";
  const rightColor = "#f9a8d4";
  ctx.textAlign = "left";
  ctx.fillStyle = leftColor;
  ctx.fillText(leftText, 24, 36);

  ctx.textAlign = "right";
  ctx.fillStyle = rightColor;
  ctx.fillText(rightText, canvas.width - 24, 36);

  if (game.mode === "play") {
    ctx.textAlign = "center";
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "14px Arial";
    const modeLabel = game.cpuOffense
      ? (game.turnoverSeriesActive ? "Turnover — you're on D" : "CPU offense — you're on D")
      : "Play Mode";
    ctx.fillText(`${modeLabel}: Down ${game.playModeDown} of ${game.playModeMaxDowns}`, canvas.width / 2, 54);
  }
}

function buildPlayResultText() {
  const labels = {
    sweepRight: "Sweep Right",
    sweepLeft:  "Sweep Left",
    passRight:  "Pass Right",
    passLeft:   "Pass Left",
    barnPlay:   "Barn Play",
    scrambledEggs: "Scrambled Eggs",
    diveRight:  "Stretch Right",
    diveLeft:   "Stretch Left"
  };
  const label = labels[game.playModeLastPlayType] || "Run";
  const rt    = game.playModeLastResultType;
  const yds   = game.playModeLastYards;

  if (rt === "incomplete") return { text: `${label} — Incomplete Pass`, color: "#94a3b8" };
  if (rt === "interception") return { text: `${label} — Interception!`, color: "#f97316" };
  if (rt === "sack")       return { text: `${label} — Sack, ${yds} yds`, color: "#f87171" };
  if (rt === "gain")       return { text: `${label} — +${yds} yard${yds !== 1 ? "s" : ""}`, color: "#4ade80" };
  if (rt === "loss")       return { text: `${label} — ${yds} yard${yds !== -1 ? "s" : ""}`, color: "#f87171" };
  return { text: `${label} — No gain`, color: "#fbbf24" };
}

function shouldShowFarmerAnnouncerForPlayResult() {
  const rt = game.playModeLastResultType;
  return rt === "interception" || rt === "gain" || rt === "loss" || rt === "sack";
}

function drawCenterMessage(title, subtitle, detail, buttonText = null, titleStyle = null, showAnnouncer = false) {
  const hasDetail = !!detail;
  const hasSubtitle = !!subtitle;
  const hasButton = !!buttonText;
  const flashTitle = !!titleStyle?.flash;
  const flashOn = !flashTitle || Math.floor(Date.now() / 220) % 2 === 0;
  const titleColor = titleStyle?.color || COLORS.white;
  const titleDimColor = titleStyle?.dimColor || "#fdba74";
  const boxH = hasDetail
    ? (hasButton ? 220 : 185)
    : (hasButton ? 185 : 150);
  const boxY = Math.round((canvas.height - boxH) / 2) - 10;
  const textCx = showAnnouncer ? 545 : canvas.width / 2;

  ctx.fillStyle = showAnnouncer ? "rgba(17, 24, 39, 0.72)" : "rgba(17, 24, 39, 0.88)";
  ctx.fillRect(180, boxY, 600, boxH);

  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.strokeRect(180, boxY, 600, boxH);

  if (showAnnouncer) {
    const ah = Math.min(128, boxH - 36);
    drawAnnouncerPortrait(196, boxY + (boxH - ah) / 2, ah);
  }

  ctx.textAlign = "center";
  ctx.font = "bold 34px Arial";
  ctx.lineWidth = flashTitle ? 5 : 3;
  ctx.strokeStyle = flashTitle ? (flashOn ? "#fff7ed" : "#7c2d12") : "#111827";
  ctx.fillStyle = flashTitle ? (flashOn ? titleColor : titleDimColor) : titleColor;
  ctx.strokeText(title, textCx, boxY + 52);
  ctx.fillText(title, textCx, boxY + 52);

  if (hasSubtitle) {
    ctx.font = "18px Arial";
    ctx.fillStyle = COLORS.white;
    ctx.fillText(subtitle, textCx, boxY + 90);
  }

  if (hasDetail) {
    ctx.font = "bold 22px Arial";
    ctx.fillStyle = detail.color;
    ctx.fillText(detail.text, textCx, boxY + (hasSubtitle ? 138 : 102));
  }

  if (hasButton) {
    const bw = 140;
    const bh = 42;
    const bx = textCx - bw / 2;
    const by = boxY + boxH - 58;
    ctx.fillStyle = "#374151";
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 20px Arial";
    ctx.fillText(buttonText, textCx, by + bh / 2 + 7);
  }
}

function drawSafetyPopup() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const img = announcerFarmerImage;
  let textY = cy;
  if (img.complete && img.naturalWidth) {
    const ah = 200;
    const aw = (img.naturalWidth / img.naturalHeight) * ah;
    const ay = cy - ah / 2 - 75;
    const ax = cx - aw / 2;
    const pad = 10;
    drawAnnouncerTranslucentBackdrop(ax - pad, ay - pad, aw + pad * 2, ah + pad * 2, 16);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, ax, ay, aw, ah);
    ctx.restore();
    textY = ay + ah + 60;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 80px Arial";
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 6;
  ctx.strokeText("SAFETY", cx, textY);
  ctx.fillStyle = COLORS.white;
  ctx.fillText("SAFETY", cx, textY);
  ctx.textBaseline = "alphabetic";
}

function drawBigPopupBanner(text, withAnnouncer = false) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  let textY = cy;
  if (withAnnouncer) {
    const img = announcerFarmerImage;
    if (img.complete && img.naturalWidth) {
      const ah = 210;
      const aw = (img.naturalWidth / img.naturalHeight) * ah;
      const ay = cy - ah / 2 - 55;
      const ax = cx - aw / 2;
      const pad = 10;
      drawAnnouncerTranslucentBackdrop(ax - pad, ay - pad, aw + pad * 2, ah + pad * 2, 16);
      ctx.imageSmoothingEnabled = true;
      if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, ax, ay, aw, ah);
      textY = ay + ah + 65;
    }
  }
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 6;
  ctx.font = "bold 96px Arial";
  ctx.fillStyle = COLORS.white;
  ctx.strokeText(text, cx, textY);
  ctx.fillText(text, cx, textY);
  ctx.restore();
}

function drawInterceptionHoldOverlay() {
  const total = 2000;
  const t = 1 - game.interceptionPopupTimer / total;
  const cx = canvas.width / 2;
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const henX = 80 + t * (cx - 140);
  const henY = canvas.height * 0.38;
  ctx.fillStyle = "#fef08a";
  ctx.beginPath();
  ctx.arc(henX, henY, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#854d0e";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.moveTo(henX + 18, henY - 8);
  ctx.lineTo(henX + 32, henY - 14);
  ctx.lineTo(henX + 20, henY + 4);
  ctx.closePath();
  ctx.fill();
  const ballT = Math.min(1, t * 1.4);
  const bx = 320 + ballT * 220;
  const by = henY + 10;
  const r = Math.round(147 + (249 - 147) * ballT);
  const g = Math.round(197 + (168 - 197) * ballT);
  const b = Math.round(253 + (232 - 253) * ballT);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.beginPath();
  ctx.arc(bx, by, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5b3718";
  ctx.lineWidth = 2;
  ctx.stroke();

  const barY = canvas.height - 78;
  ctx.fillStyle = "#b91c1c";
  ctx.fillRect(0, barY, canvas.width, 56);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, barY, canvas.width, 4);
  ctx.textAlign = "left";
  ctx.font = "bold 22px Arial";
  ctx.fillStyle = "#fef2f2";
  ctx.fillText("BREAKING:", 24, barY + 36);
  ctx.font = "bold 26px Arial";
  ctx.fillStyle = COLORS.white;
  ctx.fillText("TURNOVER", 160, barY + 38);
  const img = announcerFarmerImage;
  if (img.complete && img.naturalWidth) {
    const ih = 52;
    const iw = (img.naturalWidth / img.naturalHeight) * ih;
    ctx.drawImage(img, canvas.width - iw - 20, barY + 2, iw, ih);
  }
  ctx.textAlign = "center";
  ctx.font = "bold 72px Arial";
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 5;
  ctx.fillStyle = COLORS.white;
  ctx.strokeText("INTERCEPTION", cx, canvas.height * 0.52);
  ctx.fillText("INTERCEPTION", cx, canvas.height * 0.52);
}

function drawTouchdownTractorBanner() {
  const elapsed = 4000 - game.touchdownPopupTimer;
  const progress = Math.min(1, elapsed / 3200);
  const x = -90 + progress * (canvas.width + 200);
  const y = canvas.height - 62;
  ctx.fillStyle = "#15803d";
  ctx.fillRect(x, y, 100, 36);
  ctx.fillStyle = "#166534";
  ctx.beginPath();
  ctx.arc(x + 22, y + 36, 14, 0, Math.PI * 2);
  ctx.arc(x + 78, y + 36, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(x + 22, y + 36, 7, 0, Math.PI * 2);
  ctx.arc(x + 78, y + 36, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#facc15";
  ctx.strokeStyle = "#a16207";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 102, y + 4, 72, 28);
  ctx.fillRect(x + 102, y + 4, 72, 28);
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "#78350f";
  ctx.fillText("TD!", x + 138, y + 24);
}

function drawTouchdownScorebug() {
  const name = game.lastTouchdownTeamName || "Touchdown";
  const pulse = 0.55 + Math.sin(Date.now() / 200) * 0.2;
  const bw = 420;
  const bx = (canvas.width - bw) / 2;
  const by = 62;
  const bh = 86;
  ctx.save();
  ctx.strokeStyle = `rgba(234, 179, 8, ${pulse})`;
  ctx.lineWidth = 5;
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 12);
  } else {
    ctx.beginPath();
    ctx.rect(bx, by, bw, bh);
  }
  ctx.stroke();
  const g = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
  g.addColorStop(0, "rgba(254, 243, 199, 0.35)");
  g.addColorStop(1, "rgba(202, 138, 4, 0.25)");
  ctx.fillStyle = g;
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(bx + 3, by + 3, bw - 6, bh - 6, 9);
  } else {
    ctx.fillRect(bx + 3, by + 3, bw - 6, bh - 6);
  }
  ctx.fill();
  ctx.textAlign = "center";
  ctx.font = "bold 22px Arial";
  ctx.fillStyle = "#fefce8";
  ctx.fillText(name.toUpperCase(), canvas.width / 2, by + 38);
  ctx.font = "bold 32px Arial";
  ctx.fillStyle = "#facc15";
  ctx.fillText("TOUCHDOWN", canvas.width / 2, by + 72);
  ctx.restore();
}

function drawTouchdownPopup() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawTouchdownScorebug();
  drawTouchdownTractorBanner();
  ctx.textAlign = "center";
  ctx.font = "bold 56px Arial";
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 4;
  ctx.fillStyle = COLORS.white;
  const midY = canvas.height * 0.42;
  ctx.strokeText("SCORE!", canvas.width / 2, midY);
  ctx.fillText("SCORE!", canvas.width / 2, midY);
}

function drawFieldCelebrationFx() {
  if (game.fieldCelebrationTimer <= 0 || !game.fieldCelebrationType) return;
  const fx = game.fieldCelebrationX;
  const fy = FIELD.y + FIELD.height * 0.55;
  const str = game.fieldCelebrationTimer / 2800;
  if (game.fieldCelebrationType === "mud") {
    for (let i = 0; i < 8; i++) {
      const mx = fx + Math.sin(i * 1.7 + Date.now() / 200) * (24 + i * 5);
      const my = fy + Math.cos(i * 2.1) * 16;
      ctx.fillStyle = `rgba(120, 53, 15, ${0.35 + str * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(mx, my, 12 + i * 2, 8 + (i % 3), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (game.fieldCelebrationType === "sack") {
    const qbx = fx;
    const qby = fy - 20;
    for (let b = 0; b < 5; b++) {
      const ang = (Date.now() / 180 + b * 1.2) % (Math.PI * 2);
      const bx = qbx + Math.cos(ang) * 36;
      const by = qby + Math.sin(ang) * 22;
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.ellipse(bx, by, 6, 4, ang, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#713f12";
      ctx.stroke();
    }
    for (let s = 0; s < 6; s++) {
      const rot = Date.now() / 300 + s;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(qbx + Math.cos(rot) * 18, qby + Math.sin(rot) * 18);
      ctx.lineTo(qbx + Math.cos(rot + 0.5) * 28, qby + Math.sin(rot + 0.5) * 28);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(120, 53, 15, 0.85)";
    ctx.fillRect(canvas.width - 118, 68, 44, 36);
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width - 118, 68, 44, 36);
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.arc(canvas.width - 96, 88, 5, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const h = 4 + (i % 3) * 6;
      ctx.fillStyle = i % 2 === 0 ? "#22c55e" : "#ef4444";
      ctx.fillRect(canvas.width - 112 + i * 8, 92 - h, 5, h);
    }
  }
}

function drawMenuBackground() {
  const w = canvas.width;
  const h = canvas.height;

  if (barnBgImage.complete && barnBgImage.naturalWidth > 0) {
    ctx.drawImage(barnBgImage, 0, 0, w, h);
    return;
  }

  // Layout anchors (fallback if image not loaded)
  const peakX  = w / 2;
  const peakY  = 22;
  const breakLX = 148, breakRX = w - 148;
  const breakY  = 178;
  const eaveY   = 298;

  // ── SKY ──────────────────────────────────────────────────────────
  ctx.fillStyle = "#5BB8FF";
  ctx.fillRect(0, 0, w, eaveY);

  // Cartoon sun with rays
  const sunX = w - 82, sunY = 64;
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 7;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(sunX + Math.cos(a) * 46, sunY + Math.sin(a) * 46);
    ctx.lineTo(sunX + Math.cos(a) * 68, sunY + Math.sin(a) * 68);
    ctx.stroke();
  }
  ctx.fillStyle = "#FFE033";
  ctx.beginPath(); ctx.arc(sunX, sunY, 40, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.arc(sunX - 12, sunY - 9, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sunX + 12, sunY - 9, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sunX, sunY + 6, 14, 0, Math.PI);
  ctx.strokeStyle = "#000"; ctx.lineWidth = 3; ctx.stroke();

  // Fluffy cartoon clouds
  function drawCloud(cx, cy, s) {
    const puffs = [{x:0,y:0,r:24},{x:-22,y:8,r:18},{x:22,y:8,r:18},{x:-10,y:-9,r:19},{x:10,y:-9,r:19}];
    ctx.fillStyle = "#FFF";
    puffs.forEach(p => { ctx.beginPath(); ctx.arc(cx+p.x*s, cy+p.y*s, p.r*s, 0, Math.PI*2); ctx.fill(); });
    ctx.strokeStyle = "#000"; ctx.lineWidth = 2.5;
    puffs.forEach(p => { ctx.beginPath(); ctx.arc(cx+p.x*s, cy+p.y*s, p.r*s, 0, Math.PI*2); ctx.stroke(); });
  }
  drawCloud(185, 84, 1.0);
  drawCloud(588, 56, 0.78);

  // ── BACKGROUND ROLLING HILLS ─────────────────────────────────────
  ctx.fillStyle = "#55A855";
  ctx.beginPath();
  ctx.moveTo(0, eaveY + 35);
  ctx.bezierCurveTo(140, eaveY - 75, 340, eaveY + 15, 510, eaveY - 60);
  ctx.bezierCurveTo(680, eaveY - 125, 870, eaveY - 10, w, eaveY + 28);
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2E7D32"; ctx.lineWidth = 3; ctx.stroke();

  // ── SILO (left side, behind barn) ────────────────────────────────
  const slX = 22, slW = 88, slTop = breakY + 18;
  const slGrad = ctx.createLinearGradient(slX, 0, slX + slW, 0);
  slGrad.addColorStop(0, "#9E9E9E");
  slGrad.addColorStop(0.42, "#E0E0E0");
  slGrad.addColorStop(1, "#757575");
  ctx.fillStyle = slGrad;
  ctx.fillRect(slX, slTop, slW, h - slTop);
  ctx.strokeStyle = "#000"; ctx.lineWidth = 3;
  for (let ry = slTop + 28; ry < h; ry += 26) {
    ctx.beginPath(); ctx.moveTo(slX, ry); ctx.lineTo(slX + slW, ry); ctx.stroke();
  }
  ctx.fillStyle = "#BDBDBD";
  ctx.beginPath(); ctx.ellipse(slX + slW/2, slTop, slW/2 + 5, 22, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 4; ctx.stroke();
  ctx.strokeRect(slX, slTop, slW, h - slTop);

  // ── BARN GABLE FACE (red triangle) ───────────────────────────────
  ctx.fillStyle = "#CC2200";
  ctx.beginPath();
  ctx.moveTo(breakLX, breakY);
  ctx.lineTo(peakX, peakY);
  ctx.lineTo(breakRX, breakY);
  ctx.closePath();
  ctx.fill();
  // Vertical plank lines in gable (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(breakLX, breakY); ctx.lineTo(peakX, peakY); ctx.lineTo(breakRX, breakY);
  ctx.closePath(); ctx.clip();
  ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 2;
  for (let px = 0; px < w; px += 36) {
    ctx.beginPath(); ctx.moveTo(px, peakY - 5); ctx.lineTo(px, breakY + 5); ctx.stroke();
  }
  ctx.restore();

  // ── BARN MAIN WALLS ───────────────────────────────────────────────
  ctx.fillStyle = "#CC2200";
  ctx.fillRect(0, eaveY, w, h - eaveY);
  ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 2;
  for (let px = 36; px < w; px += 36) {
    ctx.beginPath(); ctx.moveTo(px, eaveY); ctx.lineTo(px, h); ctx.stroke();
  }

  // ── GAMBREL ROOF (dark charcoal, scalloped shingles) ─────────────
  ctx.fillStyle = "#2A2A2A";
  ctx.beginPath();
  ctx.moveTo(peakX, peakY);
  ctx.lineTo(breakRX, breakY);
  ctx.lineTo(w + 5, eaveY);
  ctx.lineTo(-5, eaveY);
  ctx.lineTo(breakLX, breakY);
  ctx.closePath();
  ctx.fill();

  // Scalloped shingles clipped to roof shape
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(peakX, peakY);
  ctx.lineTo(breakRX, breakY);
  ctx.lineTo(w + 5, eaveY);
  ctx.lineTo(-5, eaveY);
  ctx.lineTo(breakLX, breakY);
  ctx.closePath();
  ctx.clip();
  const shW = 32, shH = 20;
  ctx.fillStyle = "#3A3A3A";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.5;
  for (let row = 0; (eaveY - row * shH) > peakY - shH; row++) {
    const y = eaveY - row * shH;
    const offset = row % 2 === 0 ? 0 : shW / 2;
    for (let xi = -shW + offset; xi < w + shW; xi += shW) {
      ctx.beginPath();
      ctx.arc(xi + shW / 2, y, shW / 2, Math.PI, 0);
      ctx.lineTo(xi + shW, y); ctx.lineTo(xi, y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();

  // Roof outline
  ctx.strokeStyle = "#000"; ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(peakX, peakY);
  ctx.lineTo(breakLX, breakY); ctx.lineTo(-5, eaveY);
  ctx.moveTo(peakX, peakY);
  ctx.lineTo(breakRX, breakY); ctx.lineTo(w + 5, eaveY);
  ctx.stroke();

  // Eave trim board (cream)
  ctx.fillStyle = "#F5F5DC";
  ctx.fillRect(-5, eaveY - 10, w + 10, 18);
  ctx.strokeStyle = "#000"; ctx.lineWidth = 3;
  ctx.strokeRect(-5, eaveY - 10, w + 10, 18);

  // ── WHITE CORNER BOARDS ───────────────────────────────────────────
  ctx.fillStyle = "#F5F5DC";
  ctx.fillRect(0, eaveY + 8, 32, h - eaveY - 8);
  ctx.fillRect(w - 32, eaveY + 8, 32, h - eaveY - 8);
  ctx.strokeStyle = "#000"; ctx.lineWidth = 4;
  ctx.strokeRect(0, eaveY + 8, 32, h - eaveY - 8);
  ctx.strokeRect(w - 32, eaveY + 8, 32, h - eaveY - 8);

  // ── YELLOW BARN STAR (gable) ──────────────────────────────────────
  const starX = w / 2, starY = breakY - 52;
  ctx.fillStyle = "#FFE033"; ctx.strokeStyle = "#CC8800"; ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const r = i % 2 === 0 ? 38 : 20;
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const sx = starX + r * Math.cos(a), sy = starY + r * Math.sin(a);
    i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // ── HAY LOFT WINDOW + PULLEY ──────────────────────────────────────
  const loftW = 110, loftH = 62;
  const loftX = (w - loftW) / 2, loftY = eaveY + 22;
  ctx.fillStyle = "#1C1410"; ctx.fillRect(loftX, loftY, loftW, loftH);
  ctx.strokeStyle = "#F5F5DC"; ctx.lineWidth = 7; ctx.strokeRect(loftX, loftY, loftW, loftH);
  ctx.fillStyle = "#1A1208"; ctx.fillRect(loftX + 5, loftY + 5, loftW - 10, loftH - 10);
  // Pulley
  ctx.strokeStyle = "#888"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(loftX + loftW/2, loftY - 20); ctx.lineTo(loftX + loftW/2, loftY); ctx.stroke();
  ctx.fillStyle = "#777";
  ctx.beginPath(); ctx.arc(loftX + loftW/2, loftY - 22, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke();

  // ── SIDE WINDOWS ─────────────────────────────────────────────────
  function drawWindow(wx, wy, ww, wh) {
    ctx.fillStyle = "#A8D8EA"; ctx.fillRect(wx, wy, ww, wh);
    ctx.strokeStyle = "#F5F5DC"; ctx.lineWidth = 5; ctx.strokeRect(wx, wy, ww, wh);
    ctx.strokeStyle = "#F5F5DC"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(wx + ww/2, wy); ctx.lineTo(wx + ww/2, wy + wh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx, wy + wh/2); ctx.lineTo(wx + ww, wy + wh/2); ctx.stroke();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.strokeRect(wx, wy, ww, wh);
  }
  drawWindow(200, eaveY + 28, 85, 60);
  drawWindow(w - 285, eaveY + 28, 85, 60);

  // ── BIG X-BRACE DOUBLE DOORS ──────────────────────────────────────
  const doorW = 216, doorH = 205;
  const doorX = (w - doorW) / 2, doorY = h - doorH - 8;
  const midD = doorX + doorW / 2;
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(doorX + 7, doorY + 7, doorW, doorH);
  // Left panel
  ctx.fillStyle = "#5D4037"; ctx.fillRect(doorX, doorY, doorW/2 - 2, doorH);
  // Right panel
  ctx.fillStyle = "#6D4C41"; ctx.fillRect(midD + 2, doorY, doorW/2 - 2, doorH);
  // X braces (white, bold)
  ctx.strokeStyle = "#F5F5DC"; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(doorX + 8, doorY + 8); ctx.lineTo(midD - 6, doorY + doorH - 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(midD - 6, doorY + 8); ctx.lineTo(doorX + 8, doorY + doorH - 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(midD + 6, doorY + 8); ctx.lineTo(doorX + doorW - 8, doorY + doorH - 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(doorX + doorW - 8, doorY + 8); ctx.lineTo(midD + 6, doorY + doorH - 8); ctx.stroke();
  // Door frames
  ctx.strokeStyle = "#F5F5DC"; ctx.lineWidth = 8;
  ctx.strokeRect(doorX, doorY, doorW/2 - 2, doorH);
  ctx.strokeRect(midD + 2, doorY, doorW/2 - 2, doorH);
  ctx.strokeStyle = "#000"; ctx.lineWidth = 4;
  ctx.strokeRect(doorX, doorY, doorW, doorH);
  // Center seam
  ctx.strokeStyle = "#000"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(midD, doorY); ctx.lineTo(midD, doorY + doorH); ctx.stroke();
  // Gold handles
  ctx.fillStyle = "#FFD700";
  ctx.beginPath(); ctx.arc(midD - 22, doorY + doorH * 0.52, 7, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(midD + 22, doorY + doorH * 0.52, 7, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(midD - 22, doorY + doorH * 0.52, 7, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(midD + 22, doorY + doorH * 0.52, 7, 0, Math.PI*2); ctx.stroke();

  // ── GROUND STRIP ─────────────────────────────────────────────────
  ctx.fillStyle = "#4CAF50"; ctx.fillRect(0, h - 16, w, 16);
  ctx.fillStyle = "#388E3C"; ctx.fillRect(0, h - 16, w, 7);
  ctx.strokeStyle = "#000"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, h - 16); ctx.lineTo(w, h - 16); ctx.stroke();
}

function drawMenu() {
  drawMenuBackground();

  // Semi-transparent overlay so menu text and buttons stand out
  ctx.fillStyle = "rgba(17, 24, 39, 0.72)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 42px Arial";
  ctx.fillText("Farm Football Frenzy", canvas.width / 2, 160);
  ctx.font = "18px Arial";
  ctx.fillStyle = "#d1d5db";
  ctx.fillText("Pick a team, then play offense or defense after the coin toss.", canvas.width / 2, 210);

  const pl = MENU_BUTTONS.playMode;

  ctx.fillStyle = "#374151";
  ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.strokeRect(pl.x, pl.y, pl.w, pl.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 22px Arial";
  ctx.fillText("Play", pl.x + pl.w / 2, pl.y + pl.h / 2 + 8);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText("4 downs from the red 20-yard line.", canvas.width / 2, 470);
}

function drawTeamSelectOverlay() {
  ctx.fillStyle = "rgba(17, 24, 39, 0.82)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const L = getTeamSelectLayout();
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 32px Arial";
  ctx.fillText("Pick your team", canvas.width / 2, 58);

  function drawCard(rect, teamId, selected) {
    const pad = 10;
    const bannerH = 68;
    const nameStripH = 22;
    const PR = CONFIG.playerRadius;
    ctx.fillStyle = "#374151";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    drawTeamBannerImage(teamId, rect.x + pad, rect.y + pad, rect.w - pad * 2, bannerH);
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(rect.x + pad, rect.y + pad + bannerH, rect.w - pad * 2, nameStripH);
    ctx.strokeStyle = selected ? "#fbbf24" : COLORS.white;
    ctx.lineWidth = selected ? 4 : 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 16px Arial";
    ctx.fillText(TEAMS[teamId].name, rect.x + rect.w / 2, rect.y + pad + bannerH + 17);
    const r = TEAMS[teamId].roster;
    const slots = ["qb", "wr", "flex"];
    const innerW = rect.w - pad * 2;
    const gutter = 6;
    const colW = (innerW - gutter * 2) / 3;
    const rosterTop = rect.y + pad + bannerH + nameStripH + 4;
    const rosterBot = rect.y + rect.h - pad;
    const labelBaseline = rosterTop + 11;
    const maxLabelW = colW - 4;
    const bw = TEAM_SELECT_PLAYER_BUFFER.width;
    const bh = TEAM_SELECT_PLAYER_BUFFER.height;
    let previewScale = Math.min((colW - 2) / bw, (rosterBot - labelBaseline - 6) / bh, 1.08);
    previewScale = Math.max(0.42, previewScale);
    let destY = rosterBot - bh * previewScale - 2;
    const minDestY = labelBaseline + 8;
    if (destY < minDestY) {
      destY = minDestY;
      previewScale = Math.max(0.28, (rosterBot - destY - 2) / bh);
    }
    const pctx = TEAM_SELECT_PLAYER_CTX;
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in pctx) pctx.imageSmoothingQuality = "high";
    function fitRosterName(text) {
      ctx.font = "bold 9px Arial";
      if (ctx.measureText(text).width <= maxLabelW) return text;
      let s = text;
      while (s.length > 1 && ctx.measureText(`${s}…`).width > maxLabelW) s = s.slice(0, -1);
      return `${s}…`;
    }
    ctx.fillStyle = "#e5e7eb";
    for (let i = 0; i < 3; i++) {
      const cx = rect.x + pad + gutter + colW * (i + 0.5);
      const entry = r[slots[i]];
      ctx.fillText(fitRosterName(entry.displayLabel), cx, labelBaseline);
      pctx.clearRect(0, 0, bw, bh);
      drawPlayer(
        {
          x: TEAM_SELECT_PREVIEW_CX,
          y: TEAM_SELECT_PREVIEW_CY,
          radius: PR,
          displayLabel: entry.displayLabel,
          color: entry.color,
          ballAccent: entry.ballAccent,
          appearanceId: entry.appearanceId,
          suppressNameTag: true
        },
        pctx
      );
      const destW = bw * previewScale;
      const destH = bh * previewScale;
      const destX = cx - TEAM_SELECT_PREVIEW_CX * previewScale;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
      ctx.drawImage(TEAM_SELECT_PLAYER_BUFFER, 0, 0, bw, bh, destX, destY, destW, destH);
      ctx.restore();
    }
  }

  const yUser = game.teamSelectUser;
  for (const id of PLAY_TEAM_IDS) {
    drawCard(L[id], id, yUser === id);
  }

  const canStart = !!yUser;
  ctx.fillStyle = canStart ? "#16a34a" : "#4b5563";
  ctx.fillRect(L.start.x, L.start.y, L.start.w, L.start.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;
  ctx.strokeRect(L.start.x, L.start.y, L.start.w, L.start.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Continue", L.start.x + L.start.w / 2, L.start.y + L.start.h / 2 + 7);

  ctx.fillStyle = "rgba(55, 65, 81, 0.9)";
  ctx.fillRect(L.back.x, L.back.y, L.back.w, L.back.h);
  ctx.strokeStyle = COLORS.white;
  ctx.strokeRect(L.back.x, L.back.y, L.back.w, L.back.h);
  ctx.font = "bold 14px Arial";
  ctx.fillStyle = COLORS.white;
  ctx.textAlign = "center";
  ctx.fillText("Main menu", L.back.x + L.back.w / 2, L.back.y + L.back.h / 2 + 5);

  if (!canStart) {
    ctx.fillStyle = "#9ca3af";
    ctx.font = "14px Arial";
    ctx.fillText("Select a team to continue", canvas.width / 2, L.start.y - 18);
  }
}

function drawOpponentRevealOverlay() {
  ctx.fillStyle = "rgba(17, 24, 39, 0.88)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const u = game.playUserTeamId;
  const c = game.playCpuTeamId;
  if (!u || !c) return;

  const Tu = TEAMS[u];
  const Tc = TEAMS[c];
  const L = getOpponentRevealLayout();
  const rosterLines = (T) =>
    `${T.roster.qb.displayLabel}, ${T.roster.wr.displayLabel}, ${T.roster.flex.displayLabel}`;

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 34px Arial";
  ctx.fillText("Your opponent", canvas.width / 2, 100);
  ctx.font = "16px Arial";
  ctx.fillStyle = "#d1d5db";
  ctx.fillText("Next: coin toss (heads / tails). Good luck!", canvas.width / 2, 132);

  const boxW = 400;
  const boxLeft = (canvas.width - boxW) / 2;
  const yYou = 168;
  const yCpu = 288;

  ctx.fillStyle = "rgba(55, 65, 81, 0.95)";
  ctx.fillRect(boxLeft, yYou, boxW, 96);
  ctx.strokeStyle = "#93c5fd";
  ctx.lineWidth = 3;
  ctx.strokeRect(boxLeft, yYou, boxW, 96);
  drawTeamBannerImage(u, boxLeft + boxW - 100, yYou + 8, 88, 88);
  ctx.textAlign = "left";
  ctx.fillStyle = "#93c5fd";
  ctx.font = "bold 14px Arial";
  ctx.fillText("YOU", boxLeft + 16, yYou + 22);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 22px Arial";
  ctx.fillText(Tu.name, boxLeft + 16, yYou + 50);
  ctx.font = "13px Arial";
  ctx.fillStyle = "#d1d5db";
  ctx.fillText(rosterLines(Tu), boxLeft + 16, yYou + 76);

  ctx.fillStyle = "rgba(55, 65, 81, 0.95)";
  ctx.fillRect(boxLeft, yCpu, boxW, 96);
  ctx.strokeStyle = "#f9a8d4";
  ctx.lineWidth = 3;
  ctx.strokeRect(boxLeft, yCpu, boxW, 96);
  drawTeamBannerImage(c, boxLeft + boxW - 100, yCpu + 8, 88, 88);
  ctx.fillStyle = "#f9a8d4";
  ctx.font = "bold 14px Arial";
  ctx.fillText("CPU", boxLeft + 16, yCpu + 22);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 22px Arial";
  ctx.fillText(Tc.name, boxLeft + 16, yCpu + 50);
  ctx.font = "13px Arial";
  ctx.fillStyle = "#d1d5db";
  ctx.fillText(rosterLines(Tc), boxLeft + 16, yCpu + 76);

  ctx.textAlign = "center";
  ctx.fillStyle = "#16a34a";
  ctx.fillRect(L.play.x, L.play.y, L.play.w, L.play.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;
  ctx.strokeRect(L.play.x, L.play.y, L.play.w, L.play.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 22px Arial";
  ctx.fillText("Play", L.play.x + L.play.w / 2, L.play.y + L.play.h / 2 + 8);

  ctx.fillStyle = "rgba(55, 65, 81, 0.92)";
  ctx.fillRect(L.changeTeam.x, L.changeTeam.y, L.changeTeam.w, L.changeTeam.h);
  ctx.strokeStyle = COLORS.white;
  ctx.strokeRect(L.changeTeam.x, L.changeTeam.y, L.changeTeam.w, L.changeTeam.h);
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "bold 15px Arial";
  ctx.fillText("Change my team", L.changeTeam.x + L.changeTeam.w / 2, L.changeTeam.y + L.changeTeam.h / 2 + 5);

  ctx.fillStyle = "rgba(55, 65, 81, 0.9)";
  ctx.fillRect(L.back.x, L.back.y, L.back.w, L.back.h);
  ctx.strokeStyle = COLORS.white;
  ctx.strokeRect(L.back.x, L.back.y, L.back.w, L.back.h);
  ctx.font = "bold 14px Arial";
  ctx.fillStyle = COLORS.white;
  ctx.textAlign = "center";
  ctx.fillText("Main menu", L.back.x + L.back.w / 2, L.back.y + L.back.h / 2 + 5);
}

function getCoinTossLayout() {
  const cx = canvas.width / 2;
  return {
    heads: { x: cx - 200, y: 278, w: 180, h: 48 },
    tails: { x: cx + 20, y: 278, w: 180, h: 48 },
    resultContinue: { x: cx - 120, y: 412, w: 240, h: 48 },
    offense: { x: cx - 200, y: 330, w: 180, h: 48 },
    defense: { x: cx + 20, y: 330, w: 180, h: 48 },
    cpuContinue: { x: cx - 120, y: 412, w: 240, h: 48 },
    back: { x: 24, y: 24, w: 120, h: 36 }
  };
}

/** Same gold radial as the coin face (origin at coin center); r is inner face radius. */
function fillCoinFaceGradient(ctx, r) {
  const gx = (-12 / 58) * r;
  const gy = (-12 / 58) * r;
  const r0 = (4 / 58) * r;
  const grd = ctx.createRadialGradient(gx, gy, r0, 0, 0, r);
  grd.addColorStop(0, "#fde047");
  grd.addColorStop(0.5, "#eab308");
  grd.addColorStop(1, "#a16207");
  ctx.fillStyle = grd;
  ctx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
}

/**
 * Scaled coin face image at origin; caller may clip.
 * White/light backgrounds blend to the coin gradient via multiply. Larger scale = bigger art.
 */
function drawCoinHorseFaceImageRaw(ctx, img, r) {
  if (!img || !img.complete || !img.naturalWidth) return false;
  const size = r * 2.42;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const scale = size / Math.max(w, h);
  const dw = w * scale;
  const dh = h * scale;
  ctx.save();
  fillCoinFaceGradient(ctx, r);
  ctx.globalCompositeOperation = "multiply";
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  return true;
}

/** Full circular face — clip to circle r then draw image (or return false). */
function drawCoinHorseFaceImageInCircle(ctx, img, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  const ok = drawCoinHorseFaceImageRaw(ctx, img, r);
  ctx.restore();
  return ok;
}

function drawCoinHorseFace(ctx, r, side) {
  const img = side === "head" ? coinHorseHeadImage : coinHorseTailImage;
  if (drawCoinHorseFaceImageInCircle(ctx, img, r)) return;
  if (side === "head") drawCoinHorseHead(ctx, r);
  else drawCoinHorseTail(ctx, r);
}

/** Horse head profile on the “heads” side; origin at coin center, r ≈ coin radius. */
function drawCoinHorseHead(ctx, r) {
  const rx = (v) => v * r;
  const ry = (v) => v * r;
  ctx.save();
  ctx.fillStyle = "#4a3728";
  ctx.strokeStyle = "#2d2118";
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.beginPath();
  ctx.moveTo(rx(-0.38), ry(0.18));
  ctx.quadraticCurveTo(rx(-0.48), ry(-0.05), rx(-0.28), ry(-0.44));
  ctx.quadraticCurveTo(rx(-0.08), ry(-0.58), rx(0.22), ry(-0.5));
  ctx.quadraticCurveTo(rx(0.52), ry(-0.38), rx(0.62), ry(-0.06));
  ctx.quadraticCurveTo(rx(0.66), ry(0.14), rx(0.48), ry(0.3));
  ctx.quadraticCurveTo(rx(0.12), ry(0.34), rx(-0.38), ry(0.18));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1a1510";
  ctx.beginPath();
  ctx.arc(rx(0.14), ry(-0.14), r * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2d2118";
  ctx.beginPath();
  ctx.ellipse(rx(0.5), ry(0.1), r * 0.045, r * 0.028, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Horse tail on the “tails” side; origin at coin center, r ≈ coin radius. */
function drawCoinHorseTail(ctx, r) {
  const rx = (v) => v * r;
  const ry = (v) => v * r;
  ctx.save();
  ctx.fillStyle = "#3d2f24";
  ctx.strokeStyle = "#2a1f18";
  ctx.lineWidth = Math.max(1.5, r * 0.055);
  ctx.beginPath();
  ctx.moveTo(rx(0.12), ry(-0.38));
  ctx.bezierCurveTo(rx(0.52), ry(-0.22), rx(0.48), ry(0.38), rx(-0.18), ry(0.48));
  ctx.bezierCurveTo(rx(-0.48), ry(0.52), rx(-0.58), ry(0.22), rx(-0.38), ry(-0.12));
  ctx.bezierCurveTo(rx(-0.28), ry(-0.38), rx(-0.02), ry(-0.42), rx(0.12), ry(-0.38));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#2a1f18";
  ctx.lineWidth = Math.max(1, r * 0.034);
  ctx.beginPath();
  ctx.moveTo(rx(0.08), ry(-0.22));
  ctx.quadraticCurveTo(rx(-0.22), ry(0.08), rx(-0.42), ry(0.36));
  ctx.moveTo(rx(0.24), ry(0.02));
  ctx.quadraticCurveTo(rx(-0.12), ry(0.28), rx(-0.38), ry(0.44));
  ctx.moveTo(rx(0.32), ry(0.18));
  ctx.quadraticCurveTo(rx(0.05), ry(0.35), rx(-0.28), ry(0.48));
  ctx.stroke();
  ctx.restore();
}

function drawCoinTossButton(rect, label, sub) {
  ctx.fillStyle = "#374151";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + (sub ? -2 : 6));
  if (sub) {
    ctx.font = "11px Arial";
    ctx.fillStyle = "#d1d5db";
    ctx.fillText(sub, rect.x + rect.w / 2, rect.y + rect.h / 2 + 14);
  }
}

function drawCoinTossOverlay() {
  ctx.fillStyle = "rgba(17, 24, 39, 0.92)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const u = game.playUserTeamId;
  const c = game.playCpuTeamId;
  if (!u || !c) return;

  const Tu = TEAMS[u];
  const Tc = TEAMS[c];
  const L = getCoinTossLayout();
  const coinCx = canvas.width / 2;
  const coinCy = 200;
  const coinR = 58;
  const phase = game.coinTossPhase;
  const cap = (s) => (s === "heads" ? "Heads" : "Tails");

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 34px Arial";
  ctx.fillText("Coin toss", canvas.width / 2, 82);
  ctx.font = "14px Arial";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText(`${Tu.name} vs ${Tc.name}`, canvas.width / 2, 108);

  if (phase === "pickCall" || phase === "flipping") {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#d1d5db";
    ctx.fillText("Call it — Horse head or tail, then the coin flips.", canvas.width / 2, 136);
    ctx.font = "12px Arial";
    ctx.fillStyle = "#6b7280";
    ctx.fillText("Keys: 1 / H = Head · 2 / T = Tail", canvas.width / 2, 158);
  }

  let flipSpin = 0;
  if (phase === "flipping") {
    const t = 1 - game.coinTossFlipTimer / 1500;
    flipSpin = t * Math.PI * 10;
  }

  ctx.save();
  ctx.translate(coinCx, coinCy);
  if (phase === "flipping") {
    ctx.scale(Math.abs(Math.cos(flipSpin)), 1);
  }
  const grd = ctx.createRadialGradient(-12, -12, 4, 0, 0, coinR);
  grd.addColorStop(0, "#fde047");
  grd.addColorStop(0.5, "#eab308");
  grd.addColorStop(1, "#a16207");
  ctx.beginPath();
  ctx.arc(0, 0, coinR, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.strokeStyle = "#713f12";
  ctx.lineWidth = 4;
  ctx.stroke();

  const innerR = coinR - 6;
  if (phase === "pickCall") {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, innerR, Math.PI / 2, (Math.PI * 3) / 2, false);
    ctx.closePath();
    ctx.clip();
    ctx.translate(-innerR * 0.14, 0);
    if (!drawCoinHorseFaceImageRaw(ctx, coinHorseHeadImage, innerR)) {
      drawCoinHorseHead(ctx, innerR);
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, innerR, (Math.PI * 3) / 2, Math.PI / 2, false);
    ctx.closePath();
    ctx.clip();
    ctx.translate(innerR * 0.12, 0);
    if (!drawCoinHorseFaceImageRaw(ctx, coinHorseTailImage, innerR)) {
      drawCoinHorseTail(ctx, innerR);
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(65, 48, 30, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -innerR + 2);
    ctx.lineTo(0, innerR - 2);
    ctx.stroke();
  } else if (phase === "flipping") {
    drawCoinHorseFace(ctx, innerR, Math.cos(flipSpin) >= 0 ? "head" : "tail");
  } else if (phase === "result" || phase === "userChooseSide" || phase === "cpuChose") {
    drawCoinHorseFace(ctx, innerR, game.coinTossResult === "heads" ? "head" : "tail");
  }
  ctx.restore();

  if (phase === "pickCall") {
    drawCoinTossButton(L.heads, "Head");
    drawCoinTossButton(L.tails, "Tail");
  } else if (phase === "flipping") {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`You called ${cap(game.coinTossCall)} — flipping…`, canvas.width / 2, 268);
  } else if (phase === "result" && game.coinTossResult && game.coinTossCall) {
    const heads = game.coinTossResult === "heads";
    ctx.fillStyle = heads ? "#93c5fd" : "#f9a8d4";
    ctx.font = "bold 40px Arial";
    ctx.fillText(heads ? "HEADS" : "TAILS", canvas.width / 2, 312);
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "17px Arial";
    ctx.fillText(`You called ${cap(game.coinTossCall)} · The coin is ${cap(game.coinTossResult)}.`, canvas.width / 2, 348);
    ctx.font = "bold 20px Arial";
    ctx.fillStyle = game.coinTossWon ? "#86efac" : "#fca5a5";
    ctx.fillText(game.coinTossWon ? "You won the toss!" : "You lost the toss.", canvas.width / 2, 378);
    ctx.fillStyle = "#16a34a";
    ctx.fillRect(L.resultContinue.x, L.resultContinue.y, L.resultContinue.w, L.resultContinue.h);
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2;
    ctx.strokeRect(L.resultContinue.x, L.resultContinue.y, L.resultContinue.w, L.resultContinue.h);
    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 20px Arial";
    ctx.fillText("Continue", L.resultContinue.x + L.resultContinue.w / 2, L.resultContinue.y + L.resultContinue.h / 2 + 7);
    ctx.font = "12px Arial";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText("Space / Enter", L.resultContinue.x + L.resultContinue.w / 2, L.resultContinue.y + L.resultContinue.h + 20);
  } else if (phase === "userChooseSide") {
    ctx.font = "18px Arial";
    ctx.fillStyle = "#e5e7eb";
    ctx.fillText("You won the toss. Choose how to start:", canvas.width / 2, 268);
    drawCoinTossButton(L.offense, "Offense", "You get the ball first");
    drawCoinTossButton(L.defense, "Defense", "CPU gets the ball first");
    ctx.font = "12px Arial";
    ctx.fillStyle = "#6b7280";
    ctx.fillText("Keys: O / 1 = Offense · D / 2 = Defense", canvas.width / 2, 392);
  } else if (phase === "cpuChose" && game.coinTossCpuChoice) {
    ctx.font = "18px Arial";
    ctx.fillStyle = "#e5e7eb";
    const cpuOff = game.coinTossCpuChoice === "offense";
    ctx.fillText(`${Tc.name} won the toss and chose to start on ${cpuOff ? "offense" : "defense"}.`, canvas.width / 2, 268);
    ctx.font = "17px Arial";
    ctx.fillStyle = "#d1d5db";
    if (cpuOff) {
      ctx.fillText("You will play defense first.", canvas.width / 2, 300);
    } else {
      ctx.fillText("You will play offense first.", canvas.width / 2, 300);
    }
    ctx.fillStyle = "#16a34a";
    ctx.fillRect(L.cpuContinue.x, L.cpuContinue.y, L.cpuContinue.w, L.cpuContinue.h);
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2;
    ctx.strokeRect(L.cpuContinue.x, L.cpuContinue.y, L.cpuContinue.w, L.cpuContinue.h);
    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 20px Arial";
    ctx.fillText("Continue", L.cpuContinue.x + L.cpuContinue.w / 2, L.cpuContinue.y + L.cpuContinue.h / 2 + 7);
  }

  ctx.fillStyle = "rgba(55, 65, 81, 0.9)";
  ctx.fillRect(L.back.x, L.back.y, L.back.w, L.back.h);
  ctx.strokeStyle = COLORS.white;
  ctx.strokeRect(L.back.x, L.back.y, L.back.w, L.back.h);
  ctx.font = "bold 14px Arial";
  ctx.fillStyle = COLORS.white;
  ctx.textAlign = "center";
  ctx.fillText("Main menu", L.back.x + L.back.w / 2, L.back.y + L.back.h / 2 + 5);
}

function drawPauseMenu() {
  ctx.fillStyle = "rgba(17, 24, 39, 0.35)";
  ctx.fillRect(200, 150, 560, 300);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.strokeRect(200, 150, 560, 300);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 32px Arial";
  ctx.fillText("Paused", canvas.width / 2, 198);
  ctx.font = "18px Arial";
  ctx.fillStyle = "#d1d5db";
  ctx.fillText("Press ESC again to resume", canvas.width / 2, 228);

  const res = PAUSE_MENU_BUTTONS.resume;
  const rep = PAUSE_MENU_BUTTONS.instantReplay;
  const modeBtn = PAUSE_MENU_BUTTONS.modeRestart;
  const home = PAUSE_MENU_BUTTONS.home;
  const modeLabel = "New Play Game";
  const hasReplay = typeof replayHasLastPlay === "function" && replayHasLastPlay();

  ctx.fillStyle = "rgba(55, 65, 81, 0.45)";
  ctx.fillRect(res.x, res.y, res.w, res.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.strokeRect(res.x, res.y, res.w, res.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 22px Arial";
  ctx.fillText("Resume", res.x + res.w / 2, res.y + res.h / 2 + 8);

  ctx.fillStyle = hasReplay ? "rgba(55, 65, 81, 0.45)" : "rgba(55, 65, 81, 0.25)";
  ctx.fillRect(rep.x, rep.y, rep.w, rep.h);
  ctx.strokeStyle = hasReplay ? COLORS.white : "#6b7280";
  ctx.strokeRect(rep.x, rep.y, rep.w, rep.h);
  ctx.fillStyle = hasReplay ? COLORS.white : "#9ca3af";
  ctx.font = "bold 20px Arial";
  ctx.fillText("Instant replay", rep.x + rep.w / 2, rep.y + rep.h / 2 + 4);
  ctx.font = "12px Arial";
  ctx.fillStyle = hasReplay ? "#d1d5db" : "#6b7280";
  ctx.fillText(hasReplay ? "Last play" : "No play saved yet", rep.x + rep.w / 2, rep.y + rep.h / 2 + 20);

  ctx.fillStyle = "rgba(55, 65, 81, 0.45)";
  ctx.fillRect(modeBtn.x, modeBtn.y, modeBtn.w, modeBtn.h);
  ctx.strokeStyle = COLORS.white;
  ctx.strokeRect(modeBtn.x, modeBtn.y, modeBtn.w, modeBtn.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 22px Arial";
  ctx.fillText(modeLabel, modeBtn.x + modeBtn.w / 2, modeBtn.y + modeBtn.h / 2 + 8);

  ctx.fillStyle = "rgba(55, 65, 81, 0.45)";
  ctx.fillRect(home.x, home.y, home.w, home.h);
  ctx.strokeRect(home.x, home.y, home.w, home.h);
  ctx.fillStyle = COLORS.white;
  ctx.fillText("Main menu", home.x + home.w / 2, home.y + home.h / 2 + 8);
}

// Draws a square play diagram inside a button.
// Coordinate space: left = backfield, right = end zone direction.
// Top/bottom = field sidelines. Matches the game's top-down view.
function drawPlayDiagram(play, bx, by, bw, bh) {
  // Square diagram centred horizontally inside the button
  const sq    = bh - 22;                         // diagram is as tall as remaining button space
  const dLeft  = bx + Math.round((bw - sq) / 2); // centred horizontally
  const dRight = dLeft + sq;
  const dTop   = by + 20;
  const dBot   = dTop + sq;
  const midY   = (dTop + dBot) / 2;

  // LOS splits the square ~45% from the left
  const losX   = dLeft + Math.round(sq * 0.42);

  ctx.save();

  // Faint field background so the square reads as its own space
  ctx.fillStyle = "rgba(47,125,50,0.35)";
  ctx.fillRect(dLeft, dTop, sq, sq);

  // LOS
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(losX, dTop);
  ctx.lineTo(losX, dBot);
  ctx.stroke();
  ctx.setLineDash([]);

  const QB    = "#93c5fd";
  const HORSE = "#f97316";
  const PETE  = "#c8a97e";

  // Reference points used as pass-route destinations
  const d1X  = losX + Math.round(sq * 0.20);
  const pigY = dTop  + Math.round(sq * 0.18);
  const hawY = dBot  - Math.round(sq * 0.18);

  function dot(x, y, color, r = 3) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function arrow(sx, sy, ex, ey, color) {
    const ang = Math.atan2(ey - sy, ex - sx);
    const hl  = 5;
    ctx.strokeStyle = color;
    ctx.fillStyle   = color;
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - hl * Math.cos(ang - 0.45), ey - hl * Math.sin(ang - 0.45));
    ctx.lineTo(ex - hl * Math.cos(ang + 0.45), ey - hl * Math.sin(ang + 0.45));
    ctx.closePath(); ctx.fill();
  }

  function curve(sx, sy, cpx, cpy, ex, ey, color) {
    const ang = Math.atan2(ey - cpy, ex - cpx);
    const hl  = 5;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cpx, cpy, ex, ey); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - hl * Math.cos(ang - 0.45), ey - hl * Math.sin(ang - 0.45));
    ctx.lineTo(ex - hl * Math.cos(ang + 0.45), ey - hl * Math.sin(ang + 0.45));
    ctx.closePath(); ctx.fill();
  }

  if (play === "sweepRight") {
    // Sweep to the BOTTOM edge — Pete leads, horse arcs outward to the edge
    dot(losX - 3, midY,  QB,   4);
    dot(losX - 3, dBot - 2, PETE, 3);
    // Horse starts deep left (middle), sweeps outward toward the bottom edge
    dot(dLeft + 2, midY, HORSE, 3);
    curve(dLeft + 2, midY, dLeft + Math.round(sq*0.42), dBot - 2, losX - 3, dBot - 2, HORSE);

  } else if (play === "sweepLeft") {
    // Sweep to the TOP edge — Pete leads, horse arcs outward to the edge
    dot(losX - 3, midY, QB, 4);
    dot(losX - 3, dTop + 2, PETE, 3);
    // Horse starts deep left (middle), sweeps outward toward the top edge
    dot(dLeft + 2, midY, HORSE, 3);
    curve(dLeft + 2, midY, dLeft + Math.round(sq*0.42), dTop + 2, losX - 3, dTop + 2, HORSE);

  } else if (play === "passRight") {
    // QB drops back; receiver runs deep right-bottom
    dot(losX - 8, midY, QB, 4);
    arrow(losX - 8, midY, dLeft + 2, midY, QB);
    dot(losX + 2, hawY, HORSE, 3);
    arrow(losX + 2, hawY, dRight, dBot - 2, HORSE);
    dot(losX - 4, pigY, PETE, 3);
    arrow(losX - 4, pigY, d1X, pigY, PETE);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(losX - 8, midY); ctx.lineTo(dRight, dBot - 2); ctx.stroke();
    ctx.setLineDash([]);

  } else if (play === "passLeft") {
    // QB drops back; receiver runs deep right-top
    dot(losX - 8, midY, QB, 4);
    arrow(losX - 8, midY, dLeft + 2, midY, QB);
    dot(losX + 2, pigY, HORSE, 3);
    arrow(losX + 2, pigY, dRight, dTop + 2, HORSE);
    dot(losX - 4, hawY, PETE, 3);
    arrow(losX - 4, hawY, d1X, hawY, PETE);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(losX - 8, midY); ctx.lineTo(dRight, dTop + 2); ctx.stroke();
    ctx.setLineDash([]);

  } else if (play === "barnPlay") {
    // Matches the approved Barn Play image: X on a deeper post, Z breaking upfield
    const lowY = dBot - 6;
    const highY = lowY - Math.round(sq * 0.26);
    const horseStemX = dLeft + Math.round(sq * 0.72);
    const peteStemX = dLeft + Math.round(sq * 0.52);
    dot(losX - 8, midY, QB, 4);
    arrow(losX - 8, midY, dLeft + 2, midY, QB);
    dot(losX + 2, lowY, HORSE, 3);
    arrow(losX + 2, lowY, horseStemX, lowY, HORSE);
    arrow(horseStemX, lowY, dRight - 8, midY + Math.round(sq * 0.03), HORSE);
    dot(losX + 2, highY, PETE, 3);
    arrow(losX + 2, highY, peteStemX, highY, PETE);
    arrow(peteStemX, highY, peteStemX, dTop + Math.round(sq * 0.18), PETE);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(losX - 8, midY); ctx.lineTo(dRight - 12, midY); ctx.stroke();
    ctx.setLineDash([]);

  } else if (play === "scrambledEggs") {
    // Match the live route: Z corners down-right, X curls straight back
    const lowY = dBot - 6;
    const highY = lowY - Math.round(sq * 0.26);
    const zStemX = dLeft + Math.round(sq * 0.92);
    const xStemX = dLeft + Math.round(sq * 0.67);
    dot(losX - 8, midY, QB, 4);
    arrow(losX - 8, midY, dLeft + 2, midY, QB);
    dot(losX + 2, highY, PETE, 3);
    arrow(losX + 2, highY, zStemX, highY, PETE);
    arrow(zStemX, highY, dRight - 10, dBot - 16, PETE);
    dot(losX + 2, lowY, HORSE, 3);
    arrow(losX + 2, lowY, xStemX, lowY, HORSE);
    arrow(xStemX, lowY, dLeft + Math.round(sq * 0.60), lowY, HORSE);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(losX - 8, midY); ctx.lineTo(dRight - 12, midY); ctx.stroke();
    ctx.setLineDash([]);

  } else if (play === "diveRight") {
    // Pete arcs down; horse follows for handoff — all pre-snap motion behind LOS
    dot(losX - 3, midY, QB, 4);
    arrow(losX - 3, midY, losX - 10, midY + Math.round(sq*0.18), QB);
    dot(losX - Math.round(sq*0.32), midY, PETE, 3);
    curve(losX - Math.round(sq*0.32), midY, losX - Math.round(sq*0.14), dBot - 2, losX - 3, midY + Math.round(sq*0.2), PETE);
    dot(dLeft + 2, midY, HORSE, 3);
    curve(dLeft + 2, midY, losX - Math.round(sq*0.26), midY + Math.round(sq*0.15), losX - 10, midY + Math.round(sq*0.18), HORSE);

  } else if (play === "diveLeft") {
    // Mirror — Pete arcs up; horse follows for handoff — all pre-snap motion behind LOS
    dot(losX - 3, midY, QB, 4);
    arrow(losX - 3, midY, losX - 10, midY - Math.round(sq*0.18), QB);
    dot(losX - Math.round(sq*0.32), midY, PETE, 3);
    curve(losX - Math.round(sq*0.32), midY, losX - Math.round(sq*0.14), dTop + 2, losX - 3, midY - Math.round(sq*0.2), PETE);
    dot(dLeft + 2, midY, HORSE, 3);
    curve(dLeft + 2, midY, losX - Math.round(sq*0.26), midY - Math.round(sq*0.15), losX - 10, midY - Math.round(sq*0.18), HORSE);
  }

  ctx.restore();
}

function drawDefensePreviewDiagram(defenseKey, bx, by, bw, bh) {
  const pad = 18;
  const left = bx + pad;
  const top = by + 40;
  const width = bw - pad * 2;
  const height = bh - 64;
  const mirrorForTurnover = game.turnoverSeriesActive;
  const losX = left + Math.round(width * (mirrorForTurnover ? 0.65 : 0.35));

  ctx.save();
  ctx.fillStyle = "rgba(47,125,50,0.32)";
  ctx.fillRect(left, top, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, width, height);
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(losX, top);
  ctx.lineTo(losX, top + height);
  ctx.stroke();
  ctx.setLineDash([]);

  const qbX = left + Math.round(width * (mirrorForTurnover ? 0.8 : 0.2));
  const midY = top + height / 2;
  const closeX = left + Math.round(width * (mirrorForTurnover ? 0.45 : 0.55));
  const deepX = left + Math.round(width * (mirrorForTurnover ? 0.22 : 0.78));
  const topY = top + Math.round(height * 0.22);
  const botY = top + Math.round(height * 0.78);
  const midDefY = top + Math.round(height * 0.5);

  function dot(x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  dot(qbX, midY, 5, "#60a5fa");

  if (defenseKey === "A") {
    dot(closeX, topY, 6, "#f472b6");
    dot(closeX, botY, 6, "#86efac");
    dot(deepX, midDefY, 6, "#fca5a5");
  } else if (defenseKey === "B") {
    dot(deepX, topY, 6, "#f472b6");
    dot(deepX, botY, 6, "#86efac");
    dot(closeX, midDefY, 6, "#fca5a5");
  } else if (defenseKey === "C") {
    dot(closeX, topY, 6, "#f472b6");
    dot(closeX, botY, 6, "#86efac");
    dot(closeX, midDefY, 6, "#fca5a5");
  } else if (defenseKey === "D") {
    dot(deepX, topY, 6, "#f472b6");
    dot(deepX, botY, 6, "#86efac");
    dot(deepX, midDefY, 6, "#fca5a5");
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 76px Arial";
    ctx.textAlign = "center";
    ctx.fillText("?", left + width / 2, top + height / 2 + 24);
  }

  ctx.restore();
}

function drawDefenseSelectOverlay() {
  ctx.fillStyle = "rgba(17, 24, 39, 0.75)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const P = DEFENSE_SELECT_PANEL;
  const filt = getDefenseSelectFilterBarRects();
  const options = getDefenseSelectOptionRects();
  ctx.fillStyle = "rgba(17, 24, 39, 0.86)";
  ctx.fillRect(P.x, P.y, P.w, P.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.strokeRect(P.x, P.y, P.w, P.h);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 24px Arial";
  const cur = game.defenseModeDefenseFilter;
  ctx.font = "bold 12px Arial";
  const filterLabels = { all: "All", run: "Run only", pass: "Pass only" };
  for (const key of ["all", "run", "pass"]) {
    const rect = filt[key];
    const active =
      (key === "all" && cur === null) ||
      (key === "run" && cur === "run") ||
      (key === "pass" && cur === "pass");
    ctx.fillStyle = active ? "#1d4ed8" : "#374151";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = active ? "#facc15" : COLORS.white;
    ctx.lineWidth = active ? 3 : 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = COLORS.white;
    ctx.fillText(filterLabels[key], rect.x + rect.w / 2, rect.y + rect.h / 2 + 4);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 24px Arial";
  ctx.fillText(game.turnoverSeriesActive ? "Turnover! Select defense" : "Select defense", canvas.width / 2, P.y + 68);
  ctx.font = "14px Arial";
  ctx.fillStyle = "#d1d5db";
  ctx.fillText(`Down ${game.playModeDown} of ${game.playModeMaxDowns}`, canvas.width / 2, P.y + 92);
  ctx.fillText(
    game.turnoverSeriesActive
      ? "Pig's offense takes over here. Choose a defense and offense look below."
      : "Choose defense up top and toggle the offense play below.",
    canvas.width / 2,
    P.y + 112
  );

  const labels = {
    A: { title: "Run Defense", sub: "Two defenders up front" },
    B: { title: "Pass Defense", sub: "Two defenders deeper" },
    C: { title: "De-fence", sub: "Big Coop walks up too" },
    D: { title: "Prevent", sub: "De-fence, 15 yards deeper" },
    random: { title: "Random", sub: "" }
  };

  for (const key of getFilteredDefenseOptionOrder()) {
    const rect = options[key];
    const active = game.selectedDefense === key;
    ctx.fillStyle = active ? "rgba(29, 78, 216, 0.55)" : "rgba(55, 65, 81, 0.9)";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = active ? "#facc15" : COLORS.white;
    ctx.lineWidth = active ? 3 : 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 18px Arial";
    ctx.fillText(labels[key].title, rect.x + rect.w / 2, rect.y + 26);
    ctx.font = "12px Arial";
    ctx.fillStyle = "#d1d5db";
    ctx.fillText(labels[key].sub, rect.x + rect.w / 2, rect.y + rect.h - 16);
    drawDefensePreviewDiagram(key, rect.x, rect.y, rect.w, rect.h);
  }

  const offenseRect = getDefenseSelectOffenseToggleRect();
  const offenseLabel = game.defenseModeSelectedOffensePlay === "random"
    ? "Random"
    : (PLAY_SELECT_LABELS[game.defenseModeSelectedOffensePlay] || "Random");
  ctx.fillStyle = "#9ca3af";
  ctx.font = "13px Arial";
  ctx.fillText("Offense play", canvas.width / 2, offenseRect.y - 12);
  ctx.fillStyle = "rgba(55, 65, 81, 0.92)";
  ctx.fillRect(offenseRect.x, offenseRect.y, offenseRect.w, offenseRect.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;
  ctx.strokeRect(offenseRect.x, offenseRect.y, offenseRect.w, offenseRect.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 18px Arial";
  ctx.fillText(offenseLabel, offenseRect.x + offenseRect.w / 2, offenseRect.y + offenseRect.h / 2 + 6);
}

function drawControlledDefenderMarker() {
  if (!game.cpuOffense || game.state === "menu" || game.state === "pauseMenu") return;
  const defender = getDefenseControlledPlayer();
  ctx.save();
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 4;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.arc(defender.x, defender.y, defender.radius + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawPrePlayCadenceOverlay() {
  const words = ["Ready", "Set", "Hut"];
  const word = words[game.prePlayCadenceIndex] || "Ready";

  ctx.save();
  ctx.fillStyle = "rgba(17, 24, 39, 0.24)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fef3c7";
  ctx.font = "bold 68px Arial";
  ctx.fillText(word, canvas.width / 2, canvas.height / 2 + 22);
  ctx.strokeStyle = "rgba(17, 24, 39, 0.72)";
  ctx.lineWidth = 5;
  ctx.strokeText(word, canvas.width / 2, canvas.height / 2 + 22);
  ctx.restore();
}

function drawWinPopup() {
  const flashOn = Math.floor(game.winPopupTimer / 250) % 2 === 0;
  ctx.save();
  ctx.fillStyle = "rgba(17, 24, 39, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (flashOn) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#fef3c7";
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 6;
    ctx.font = "bold 88px Arial";
    ctx.strokeText("You win", canvas.width / 2, canvas.height / 2 + 22);
    ctx.fillText("You win", canvas.width / 2, canvas.height / 2 + 22);
  }
  ctx.restore();
}

function drawPlaySelectOverlay() {
  ctx.fillStyle = "rgba(17, 24, 39, 0.75)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const P = PLAY_SELECT_PANEL;
  ctx.fillStyle = "rgba(17, 24, 39, 0.84)";
  ctx.fillRect(P.x, P.y, P.w, P.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.strokeRect(P.x, P.y, P.w, P.h);

  const filt = getPlaySelectFilterBarRects();
  const cur = game.playModePlayFilter;
  const divY = getPlaySelectDividerY();
  const offenseTop = P.y + PLAY_SELECT_TITLE_Y - 18;
  const offenseBottom = divY - 12;
  const defenseTop = divY + 10;
  const defenseBottom = P.y + P.h - 12;

  ctx.fillStyle = "rgba(55, 65, 81, 0.32)";
  ctx.fillRect(P.x + 12, offenseTop, P.w - 24, offenseBottom - offenseTop);
  ctx.fillStyle = "rgba(30, 41, 59, 0.42)";
  ctx.fillRect(P.x + 12, defenseTop, P.w - 24, defenseBottom - defenseTop);

  ctx.textAlign = "center";
  ctx.font = "bold 12px Arial";
  const filterLabels = { all: "All", run: "Run only", pass: "Pass only" };
  for (const key of ["all", "run", "pass"]) {
    const rect = filt[key];
    const active =
      (key === "all" && cur === null) ||
      (key === "run" && cur === "run") ||
      (key === "pass" && cur === "pass");
    ctx.fillStyle = active ? "#1d4ed8" : "#374151";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = active ? "#facc15" : COLORS.white;
    ctx.lineWidth = active ? 3 : 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = COLORS.white;
    ctx.fillText(filterLabels[key], rect.x + rect.w / 2, rect.y + rect.h / 2 + 4);
  }

  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 22px Arial";
  ctx.fillText("Select play", canvas.width / 2, P.y + PLAY_SELECT_TITLE_Y);
  ctx.font = "14px Arial";
  ctx.fillStyle = "#d1d5db";
  ctx.fillText(
    "Down " + game.playModeDown + " of " + game.playModeMaxDowns,
    canvas.width / 2,
    P.y + PLAY_SELECT_DOWN_Y
  );

  const page = game.playModePlaySelectPage;
  const slots = getPlaySelectSlots(page);
  const pages = getPlaySelectPageCount();

  ctx.fillStyle = "#374151";
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.font = "bold 14px Arial";
  for (const s of slots) {
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = COLORS.white;
    ctx.fillText(PLAY_SELECT_LABELS[s.key] || s.key, s.x + s.w / 2, s.y + 15);
    ctx.fillStyle = "#374151";
  }

  for (const s of slots) {
    drawPlayDiagram(s.key, s.x, s.y, s.w, s.h);
    if (cur === null) {
      const category = getPlayCategory(s.key);
      const badgeW = 46;
      const badgeH = 16;
      const bx = s.x + s.w - badgeW - 8;
      const by = s.y + 8;
      ctx.fillStyle = category === "run" ? "#065f46" : "#1d4ed8";
      ctx.fillRect(bx, by, badgeW, badgeH);
      ctx.strokeStyle = COLORS.white;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, badgeW, badgeH);
      ctx.fillStyle = COLORS.white;
      ctx.font = "bold 10px Arial";
      ctx.fillText(category === "run" ? "RUN" : "PASS", bx + badgeW / 2, by + 11);
      ctx.fillStyle = "#374151";
      ctx.strokeStyle = COLORS.white;
      ctx.lineWidth = 3;
      ctx.font = "bold 14px Arial";
    }
  }

  const mx = game.mouseX;
  const my = game.mouseY;
  for (const key of ["all", "run", "pass"]) {
    const r = filt[key];
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
      ctx.save();
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 3;
      ctx.strokeRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
      ctx.restore();
      break;
    }
  }
  for (const s of slots) {
    if (mx >= s.x && mx <= s.x + s.w && my >= s.y && my <= s.y + s.h) {
      ctx.save();
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 4;
      ctx.setLineDash([]);
      const pad = 3;
      ctx.strokeRect(s.x - pad, s.y - pad, s.w + pad * 2, s.h + pad * 2);
      ctx.restore();
      break;
    }
  }

  // Page navigation (up to 4 plays per page)
  const nav = getPlaySelectPageNavRects();
  ctx.textAlign = "center";
  ctx.font = "13px Arial";
  ctx.fillStyle = "#9ca3af";
  if (pages > 1 && nav) {
    ctx.fillStyle = "#374151";
    ctx.fillRect(nav.prev.x, nav.prev.y, nav.prev.w, nav.prev.h);
    ctx.fillRect(nav.next.x, nav.next.y, nav.next.w, nav.next.h);
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2;
    ctx.strokeRect(nav.prev.x, nav.prev.y, nav.prev.w, nav.prev.h);
    ctx.strokeRect(nav.next.x, nav.next.y, nav.next.w, nav.next.h);
    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 14px Arial";
    ctx.fillText("◀", nav.prev.x + nav.prev.w / 2, nav.prev.y + nav.prev.h / 2 + 5);
    ctx.fillText("▶", nav.next.x + nav.next.w / 2, nav.next.y + nav.next.h / 2 + 5);
    ctx.font = "12px Arial";
    ctx.fillStyle = "#d1d5db";
    if (pages === 2) {
      ctx.fillText(page === 0 ? "●  ○" : "○  ●", canvas.width / 2, nav.prev.y + nav.prev.h + 16);
    } else {
      ctx.fillText(
        "Page " + (page + 1) + " / " + pages,
        canvas.width / 2,
        nav.prev.y + nav.prev.h + 16
      );
    }
  }

  ctx.strokeStyle = "#4b5563";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(P.x + 24, divY);
  ctx.lineTo(P.x + P.w - 24, divY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = "13px Arial";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText("Defense", canvas.width / 2, divY + 18);

  const dt = getPlaySelectDefenseToggleRect();
  const defColor = game.selectedDefense === "A"
    ? "#dc2626"
    : game.selectedDefense === "B"
    ? "#1d4ed8"
    : game.selectedDefense === "C"
    ? "#7c3aed"
    : game.selectedDefense === "D"
    ? "#0f766e"
    : "#374151";
  ctx.fillStyle = defColor;
  ctx.fillRect(dt.x, dt.y, dt.w, dt.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;
  ctx.strokeRect(dt.x, dt.y, dt.w, dt.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 15px Arial";
  const defLabel = game.selectedDefense === "A"
    ? "Run Defense"
    : game.selectedDefense === "B"
    ? "Pass Defense"
    : game.selectedDefense === "C"
    ? "De-fence"
    : game.selectedDefense === "D"
    ? "Prevent"
    : "?";
  ctx.fillText(defLabel, dt.x + dt.w / 2, dt.y + dt.h / 2 + 5);

}

function drawMobileTouchControls() {
  if (!game.touchControlsEnabled || game.state === "menu" || game.state === "pauseMenu") return;

  if (game.state === "playing" || game.state === "prePlayCadence") {
    const stick = getMobileJoystickRect();
    const knobX = game.touchStickActive ? game.touchStickKnobX : stick.cx;
    const knobY = game.touchStickActive ? game.touchStickKnobY : stick.cy;

    ctx.save();
    ctx.fillStyle = "rgba(17, 24, 39, 0.42)";
    ctx.beginPath();
    ctx.arc(stick.cx, stick.cy, stick.outerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "rgba(147, 197, 253, 0.82)";
    ctx.beginPath();
    ctx.arc(knobX, knobY, stick.innerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  if (["playing", "paused", "scorePause", "playModeDowned", "playModePlaySelect", "prePlayCadence"].includes(game.state)) {
    const pause = getMobilePauseButtonRect();
    ctx.save();
    ctx.fillStyle = "rgba(17, 24, 39, 0.72)";
    ctx.fillRect(pause.x, pause.y, pause.w, pause.h);
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2;
    ctx.strokeRect(pause.x, pause.y, pause.w, pause.h);
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(pause.x + 17, pause.y + 8, 7, pause.h - 16);
    ctx.fillRect(pause.x + pause.w - 24, pause.y + 8, 7, pause.h - 16);
    ctx.restore();
  }

  if (["playing", "prePlayCadence"].includes(game.state) && game.cpuOffense) {
    const sw = getMobileSwitchButtonRect();
    ctx.save();
    ctx.fillStyle = "rgba(17, 24, 39, 0.82)";
    ctx.fillRect(sw.x, sw.y, sw.w, sw.h);
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2;
    ctx.strokeRect(sw.x, sw.y, sw.w, sw.h);
    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Switch", sw.x + sw.w / 2, sw.y + sw.h / 2 + 6);
    ctx.restore();
  }

  if (game.state === "gameOver") {
    const restart = getMobileRestartButtonRect();
    ctx.save();
    ctx.fillStyle = "rgba(17, 24, 39, 0.82)";
    ctx.fillRect(restart.x, restart.y, restart.w, restart.h);
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2;
    ctx.strokeRect(restart.x, restart.y, restart.w, restart.h);
    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Restart", restart.x + restart.w / 2, restart.y + restart.h / 2 + 6);
    ctx.restore();
  }
}

/** Field + players + ball (+ pass-aim) for live play or instant replay. */
function drawPlayfieldActionLayer(options = {}) {
  const asReplay = options.replay === true;
  if (game.mode === "play" && game.playModeLineX) {
    let lineX = game.playModeLineX;
    if (!asReplay && game.state === "playModeDowned" && game.fieldCelebrationType === "mud" && game.fieldCelebrationTimer > 0) {
      lineX += Math.sin(Date.now() / 38) * (12 * game.fieldCelebrationTimer) / 2800;
    }
    ctx.save();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.moveTo(lineX, FIELD.y);
    ctx.lineTo(lineX, FIELD.y + FIELD.height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawScoreboard();
  drawPlayer(player1);
  drawPlayer(player2);
  drawPlayer(allyHorse);
  drawPlayer(allyDonkey);
  drawPlayer(cluckNorris);
  drawPlayer(lilTunnelPete);
  drawControlledDefenderMarker();
  drawBall();
  if (!asReplay && game.state === "playModeDowned" && game.fieldCelebrationTimer > 0) {
    drawFieldCelebrationFx();
  }

  const showPassAim =
    (game.mode === "passing" && ball.carrier === player1 && !ball.inFlight) ||
    (game.mode === "play" &&
      (game.playModeCurrentPlay === "passRight" ||
        game.playModeCurrentPlay === "passLeft" ||
        game.playModeCurrentPlay === "barnPlay" ||
        game.playModeCurrentPlay === "scrambledEggs") &&
      ball.carrier === player1 &&
      !ball.inFlight &&
      game.passPlayDropbackDone &&
      game.passPlayCanThrow);
  if (showPassAim && !game.touchControlsEnabled) {
    ctx.strokeStyle = "rgba(251, 191, 36, 0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(player1.x, player1.y);
    ctx.lineTo(game.mouseX, game.mouseY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(game.mouseX, game.mouseY, 8, 0, Math.PI * 2);
    ctx.strokeStyle = "#fbbf24";
    ctx.stroke();
  }
}

function getInstantReplayLayout() {
  const w = 100;
  const h = 42;
  const gap = 8;
  const y = canvas.height - 54;
  const total = w * 6 + gap * 5;
  let x = (canvas.width - total) / 2;
  const next = () => {
    const r = { x, y, w, h };
    x += w + gap;
    return r;
  };
  return {
    skip: next(),
    rewind: next(),
    pause: next(),
    zoomOut: next(),
    zoomIn: next(),
    done: next()
  };
}

function drawInstantReplayScene() {
  const frames = game.replayFrames;
  if (!frames || frames.length === 0) return;
  const backup = backupFieldStateForReplay();
  const idx = getReplayFrameIndex();
  applyReplaySnapshot(frames[idx]);

  ctx.save();
  const cx = canvas.width * 0.5;
  const cy = FIELD.y + FIELD.height * 0.48;
  const z = game.replayZoom || 1;
  ctx.translate(cx, cy);
  ctx.scale(z, z);
  ctx.translate(-cx, -cy);

  drawField();
  drawPlayfieldActionLayer({ replay: true });

  ctx.restore();
  applyReplaySnapshot(backup);
}

function drawInstantReplayHud() {
  const L = getInstantReplayLayout();
  const kind = game.instantReplayKind;
  const title =
    kind === "touchdown" ? "TOUCHDOWN — Instant replay" : kind === "interception" ? "INTERCEPTION — Instant replay" : "Instant replay";

  ctx.fillStyle = "rgba(17, 24, 39, 0.55)";
  ctx.fillRect(0, 0, canvas.width, 52);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText(title, canvas.width / 2, 33);

  const dur = Math.max(1, (game.replayFrames && game.replayFrames.length) || 1) * (1000 / 60);
  const t = Math.min(1, game.replayTimeMs / dur);
  ctx.fillStyle = "rgba(55, 65, 81, 0.9)";
  ctx.fillRect(120, 44, canvas.width - 240, 6);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(120, 44, (canvas.width - 240) * t, 6);

  function drawBtn(rect, label, sub, dim) {
    ctx.fillStyle = dim ? "rgba(55, 65, 81, 0.55)" : "rgba(55, 65, 81, 0.92)";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = dim ? "#6b7280" : COLORS.white;
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = dim ? "#9ca3af" : COLORS.white;
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + (sub ? -3 : 5));
    if (sub) {
      ctx.font = "10px Arial";
      ctx.fillStyle = "#d1d5db";
      ctx.fillText(sub, rect.x + rect.w / 2, rect.y + rect.h / 2 + 11);
    }
  }

  drawBtn(L.skip, "Skip", "Space");
  drawBtn(L.rewind, "Rewind", "R");
  drawBtn(L.pause, game.replayPaused ? "Play" : "Pause", "P");
  drawBtn(L.zoomOut, "Zoom −", "−");
  drawBtn(L.zoomIn, "Zoom +", "+");
  drawBtn(L.done, "Done", "Esc");
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (game.state === "instantReplay") {
    drawInstantReplayScene();
    drawInstantReplayHud();
    return;
  }

  if (game.state === "menu") {
    drawMenu();
    return;
  }

  if (game.state === "playTeamSelect") {
    drawField();
    drawTeamSelectOverlay();
    return;
  }

  if (game.state === "playOpponentReveal") {
    drawField();
    drawOpponentRevealOverlay();
    return;
  }

  if (game.state === "playCoinToss") {
    drawField();
    drawCoinTossOverlay();
    return;
  }

  drawField();

  drawPlayfieldActionLayer({ replay: false });

  if (game.state === "pauseMenu") {
    drawPauseMenu();
    drawMobileTouchControls();
    return;
  }

  if (game.state === "playModePlaySelect") {
    if (game.cpuOffense) {
      drawDefenseSelectOverlay();
    } else {
      drawPlaySelectOverlay();
    }
    drawMobileTouchControls();
    return;
  }

  if (game.state === "prePlayCadence") {
    drawPrePlayCadenceOverlay();
    drawMobileTouchControls();
    return;
  }

  if (game.state === "safetyPopup") {
    drawSafetyPopup();
  } else if (game.state === "touchdownPopup") {
    drawTouchdownPopup();
  } else if (game.state === "winPopup") {
    drawWinPopup();
  } else if (game.state === "scorePause" && game.scoredBy) {
    if (game.scoredBy === player1) {
      drawTouchdownPopup();
    } else {
      const scorerName = "Professor Pig scores!";
      drawCenterMessage(scorerName, "Resetting for the next play...");
    }
  } else if (game.state === "playModeDowned") {
    const isFourthDown = game.playModeDown >= game.playModeMaxDowns;
    const isInterception = game.playModeLastResultType === "interception";
    const downedTitle  = isInterception
      ? "INTERCEPTION"
      : (game.playModeIncomplete ? "Incomplete!" : "Down!");
    const detail       = game.mode === "play" ? buildPlayResultText() : null;
    const titleStyle = isInterception ? { color: "#f97316", dimColor: "#f97316" } : null;
    const showFarmer   = game.mode === "play" && shouldShowFarmerAnnouncerForPlayResult();
    if (game.touchControlsEnabled) {
      drawCenterMessage(downedTitle, "", detail, "Tap", titleStyle, showFarmer);
    } else {
      const downPrompt = isInterception
        ? "Press Enter to finish the drive"
        : game.cpuOffense
        ? (isFourthDown ? "Press Enter to finish the drive" : "Press Enter for next play")
        : (isFourthDown ? "Press Enter to continue" : "Press Enter for next play");
      drawCenterMessage(downedTitle, downPrompt, detail, null, titleStyle, showFarmer);
    }
  } else if (game.state === "gameOver") {
    if (game.mode === "play" && !game.winner) {
      const detail = game.playUserTeamId
        ? { text: `${TEAMS[game.playCpuTeamId].name} scored!`, color: "#fca5a5" }
        : null;
      drawCenterMessage("Game Over", "Press R for new drive", detail);
    } else if (game.winner) {
      let winText;
      if (game.playUserTeamId && game.teamScores) {
        winText = `${TEAMS[game.playUserTeamId].name} wins!`;
      } else {
        winText = game.winner === player1 ? "Barnaby Wins!" : "Professor Pig Wins!";
      }
      drawCenterMessage(winText, "Press R to restart");
    }
  }

  if (game.interceptionPopupTimer > 0) {
    drawInterceptionHoldOverlay();
  }

  drawMobileTouchControls();
}

