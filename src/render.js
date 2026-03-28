// =========================================================
// Rendering
// =========================================================
const barnBgImage = new Image();
barnBgImage.src = "assets/barn_retro.png";

function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawField() {
  drawRect(0, 0, canvas.width, canvas.height, "#7fbf5b");

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

  // Goal posts: crossbar runs along goal line (vertical on canvas), uprights extend into end zone (facing the field)
  const goalPostY = FIELD.y + FIELD.height / 2;
  const crossbarHalfH = 32;
  const crossbarThick = 5;
  const uprightLength = 14;
  const uprightThick = 5;
  const postColor = "#facc15";

  function drawGoalPost(goalLineX, intoEndZoneDir) {
    // Crossbar (vertical on canvas = runs sideline to sideline like a real goal line)
    drawRect(goalLineX - crossbarThick / 2, goalPostY - crossbarHalfH, crossbarThick, crossbarHalfH * 2, postColor);
    // Top upright (extends into end zone)
    drawRect(goalLineX - (intoEndZoneDir > 0 ? 0 : uprightLength), goalPostY - crossbarHalfH - uprightThick, uprightLength, uprightThick, postColor);
    // Bottom upright
    drawRect(goalLineX - (intoEndZoneDir > 0 ? 0 : uprightLength), goalPostY + crossbarHalfH, uprightLength, uprightThick, postColor);
  }

  // Left post: goal line at back of left end zone, uprights extend left (into that end zone), opening faces field (right)
  const leftGoalLineX = FIELD.x + 14;
  // Right post: goal line at back of right end zone, uprights extend right (into that end zone), opening faces field (left)
  const rightGoalLineX = FIELD.x + FIELD.width - 14;
  drawGoalPost(leftGoalLineX, -1);
  drawGoalPost(rightGoalLineX, 1);

  // Midfield barn logo (standard but detailed)
  const midX = FIELD.x + FIELD.width / 2;
  const midY = FIELD.y + FIELD.height / 2;

  // Ground shadow ellipse for logo
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(midX, midY + 30, 70, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Barn body (classic rectangle)
  const barnWidth = 100;
  const barnHeight = 70;
  const barnX = midX - barnWidth / 2;
  const barnY = midY - barnHeight / 2 + 4;
  ctx.fillStyle = COLORS.barn;
  ctx.fillRect(barnX, barnY, barnWidth, barnHeight);

  // Triangular roof
  ctx.beginPath();
  ctx.moveTo(barnX - 6, barnY);
  ctx.lineTo(midX, barnY - 32);
  ctx.lineTo(barnX + barnWidth + 6, barnY);
  ctx.closePath();
  ctx.fillStyle = "#b91c1c";
  ctx.fill();

  // Roof outline
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Barn outline
  ctx.strokeRect(barnX, barnY, barnWidth, barnHeight);

  // Vertical siding planks
  ctx.strokeStyle = "#fca5a5";
  ctx.lineWidth = 1.5;
  for (let sx = barnX + 6; sx < barnX + barnWidth - 6; sx += 8) {
    ctx.beginPath();
    ctx.moveTo(sx, barnY + 4);
    ctx.lineTo(sx, barnY + barnHeight - 4);
    ctx.stroke();
  }

  // Loft window (rounded rectangle)
  const loftW = 26;
  const loftH = 18;
  const loftX = midX - loftW / 2;
  const loftY = barnY + 16;
  ctx.fillStyle = "#fef3c7";
  ctx.fillRect(loftX, loftY, loftW, loftH);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;
  ctx.strokeRect(loftX, loftY, loftW, loftH);

  // Loft window mullions
  ctx.beginPath();
  ctx.moveTo(loftX, loftY + loftH / 2);
  ctx.lineTo(loftX + loftW, loftY + loftH / 2);
  ctx.moveTo(loftX + loftW / 2, loftY);
  ctx.lineTo(loftX + loftW / 2, loftY + loftH);
  ctx.stroke();

  // Main double doors
  const doorWidth = 40;
  const doorHeight = 34;
  const doorX = midX - doorWidth / 2;
  const doorY = barnY + barnHeight - doorHeight - 6;
  ctx.fillStyle = "#111827";
  ctx.fillRect(doorX, doorY, doorWidth, doorHeight);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 2;
  ctx.strokeRect(doorX, doorY, doorWidth, doorHeight);

  // Door center split
  ctx.beginPath();
  ctx.moveTo(midX, doorY);
  ctx.lineTo(midX, doorY + doorHeight);
  ctx.stroke();

  // Classic X-braces on each door
  ctx.beginPath();
  // Left door X
  ctx.moveTo(doorX, doorY);
  ctx.lineTo(midX, doorY + doorHeight);
  ctx.moveTo(midX, doorY);
  ctx.lineTo(doorX, doorY + doorHeight);
  // Right door X
  ctx.moveTo(midX, doorY);
  ctx.lineTo(doorX + doorWidth, doorY + doorHeight);
  ctx.moveTo(doorX + doorWidth, doorY);
  ctx.lineTo(midX, doorY + doorHeight);
  ctx.stroke();

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

  // End zone labels
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";
  ctx.save();
  ctx.translate(FIELD.x + FIELD.endZoneWidth / 2, FIELD.y + FIELD.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("PIG", 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(FIELD.x + FIELD.width - FIELD.endZoneWidth / 2, FIELD.y + FIELD.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText("BARNABY", 0, 0);
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

function drawShadow(x, y, radiusX, radiusY) {
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(player, label, accentText) {
  drawShadow(player.x, player.y + player.radius + 8, player.radius * 0.9, 7);

  // Body
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  // Ears / snout / unique feature details
  if (player.id === "player1") {
    // Barnaby — bunny ears
    ctx.fillStyle = "#93c5fd";
    ctx.beginPath();
    ctx.ellipse(player.x - 8, player.y - 20, 5, 10, -0.3, 0, Math.PI * 2);
    ctx.ellipse(player.x + 8, player.y - 20, 5, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (player.id === "cluckNorris") {
    // Cluck Norris — red comb (3 bumps on top)
    ctx.fillStyle = "#dc2626";
    for (let i = -1; i <= 1; i++) {
      const cx = player.x + i * 10;
      const cy = player.y - player.radius;
      const r  = i === 0 ? 10 : 7;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    }
    // Red beak
    ctx.beginPath();
    ctx.moveTo(player.x - 5, player.y + 2);
    ctx.lineTo(player.x + 5, player.y + 2);
    ctx.lineTo(player.x,     player.y + 10);
    ctx.closePath();
    ctx.fill();
  } else if (player.id === "lilTunnelPete") {
    // Lil' Tunnel Pete — floppy dog ears drooping down the sides
    ctx.fillStyle = "#92400e";
    ctx.beginPath();
    ctx.ellipse(player.x - player.radius + 3, player.y - 7, 5, 10, -0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(player.x + player.radius - 3, player.y - 7, 5, 10, 0.22, 0, Math.PI * 2);
    ctx.fill();
    // Light brown inner circle
    ctx.fillStyle = "#c8935a";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    // Snout
    ctx.fillStyle = "#d97706";
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 6, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Nose
    ctx.fillStyle = "#7c2d12";
    ctx.beginPath();
    ctx.arc(player.x, player.y + 4, 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Default pig snout
    ctx.fillStyle = "#f9a8d4";
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 4, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#7f1d1d";
    ctx.beginPath();
    ctx.arc(player.x - 4, player.y + 4, 1.5, 0, Math.PI * 2);
    ctx.arc(player.x + 4, player.y + 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes
  ctx.fillStyle = COLORS.white;
  ctx.beginPath();
  ctx.arc(player.x - 6, player.y - 5, 4, 0, Math.PI * 2);
  ctx.arc(player.x + 6, player.y - 5, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.black;
  ctx.beginPath();
  ctx.arc(player.x - 6, player.y - 5, 2, 0, Math.PI * 2);
  ctx.arc(player.x + 6, player.y - 5, 2, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(label, player.x, player.y - 30);

  // Ball marker
  if (ball.carrier === player) {
    ctx.fillStyle = accentText;
    ctx.font = "bold 12px Arial";
    ctx.fillText("BALL", player.x, player.y - 44);
  }
}

function drawBall() {
  drawShadow(ball.x, ball.y + 10, 10, 5);

  ctx.fillStyle = COLORS.ball;
  ctx.beginPath();
  ctx.ellipse(ball.x, ball.y, 12, 8, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#5b3718";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Laces
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ball.x - 3, ball.y - 2);
  ctx.lineTo(ball.x + 3, ball.y + 2);
  ctx.moveTo(ball.x - 1, ball.y - 4);
  ctx.lineTo(ball.x + 5, ball.y + 0);
  ctx.moveTo(ball.x - 5, ball.y + 0);
  ctx.lineTo(ball.x + 1, ball.y + 4);
  ctx.stroke();
}

function drawScoreboard() {
  drawRect(0, 0, canvas.width, 58, "#111827");

  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 26px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Farm Football Frenzy", canvas.width / 2, 36);

  ctx.font = "bold 20px Arial";
  ctx.textAlign = "left";
  ctx.fillStyle = "#93c5fd";
  ctx.fillText(`Barnaby: ${player1.score}`, 24, 36);

  ctx.textAlign = "right";
  ctx.fillStyle = "#f9a8d4";
  ctx.fillText(`Professor Pig: ${player2.score}`, canvas.width - 24, 36);

  if (game.mode === "play" || game.mode === "defense") {
    ctx.textAlign = "center";
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "14px Arial";
    const modeLabel = game.mode === "defense" ? "Defense Mode" : "Play Mode";
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
  if (rt === "sack")       return { text: `${label} — Sack, ${yds} yds`, color: "#f87171" };
  if (rt === "gain")       return { text: `${label} — +${yds} yard${yds !== 1 ? "s" : ""}`, color: "#4ade80" };
  if (rt === "loss")       return { text: `${label} — ${yds} yard${yds !== -1 ? "s" : ""}`, color: "#f87171" };
  return { text: `${label} — No gain`, color: "#fbbf24" };
}

function drawCenterMessage(title, subtitle, detail, buttonText = null) {
  const hasDetail = !!detail;
  const hasSubtitle = !!subtitle;
  const hasButton = !!buttonText;
  const boxH = hasDetail
    ? (hasButton ? 220 : 185)
    : (hasButton ? 185 : 150);
  const boxY = Math.round((canvas.height - boxH) / 2) - 10;

  ctx.fillStyle = "rgba(17, 24, 39, 0.88)";
  ctx.fillRect(180, boxY, 600, boxH);

  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.strokeRect(180, boxY, 600, boxH);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 34px Arial";
  ctx.fillText(title, canvas.width / 2, boxY + 52);

  if (hasSubtitle) {
    ctx.font = "18px Arial";
    ctx.fillStyle = COLORS.white;
    ctx.fillText(subtitle, canvas.width / 2, boxY + 90);
  }

  if (hasDetail) {
    ctx.font = "bold 22px Arial";
    ctx.fillStyle = detail.color;
    ctx.fillText(detail.text, canvas.width / 2, boxY + (hasSubtitle ? 138 : 102));
  }

  if (hasButton) {
    const bw = 140;
    const bh = 42;
    const bx = canvas.width / 2 - bw / 2;
    const by = boxY + boxH - 58;
    ctx.fillStyle = "#374151";
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 20px Arial";
    ctx.fillText(buttonText, canvas.width / 2, by + bh / 2 + 7);
  }
}

function drawSafetyPopup() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  ctx.font = "bold 80px Arial";
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 6;
  ctx.strokeText("🙆🏿‍♂️ SAFETY 🙆🏿‍♂️", cx, cy);
  ctx.fillStyle = COLORS.white;
  ctx.fillText("🙆🏿‍♂️ SAFETY 🙆🏿‍♂️", cx, cy);
  ctx.textBaseline = "alphabetic";
}

function drawTouchdownPopup() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.white;
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 6;
  ctx.font = "bold 96px Arial";
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  ctx.strokeText("TOUCHDOWN", cx, cy);
  ctx.fillText("TOUCHDOWN", cx, cy);
  ctx.textBaseline = "alphabetic";
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
  ctx.fillText("Choose offense or defense", canvas.width / 2, 210);

  const pl = MENU_BUTTONS.playMode;
  const def = MENU_BUTTONS.defenseMode;

  ctx.fillStyle = "#374151";
  ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.strokeRect(pl.x, pl.y, pl.w, pl.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 20px Arial";
  ctx.fillText("Play", pl.x + pl.w / 2, pl.y + pl.h / 2 + 7);

  ctx.fillStyle = "#374151";
  ctx.fillRect(def.x, def.y, def.w, def.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.strokeRect(def.x, def.y, def.w, def.h);
  ctx.fillStyle = COLORS.white;
  ctx.fillText("Defense", def.x + def.w / 2, def.y + def.h / 2 + 7);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText("4 downs from the red 20-yard line.", canvas.width / 2, 470);
}

function drawPauseMenu() {
  ctx.fillStyle = "rgba(17, 24, 39, 0.35)";
  ctx.fillRect(200, 180, 560, 240);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.strokeRect(200, 180, 560, 240);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 32px Arial";
  ctx.fillText("Paused", canvas.width / 2, 230);
  ctx.font = "18px Arial";
  ctx.fillStyle = "#d1d5db";
  ctx.fillText("Press ESC again to resume", canvas.width / 2, 265);

  const res = PAUSE_MENU_BUTTONS.resume;
  const modeBtn = PAUSE_MENU_BUTTONS.modeRestart;
  const home = PAUSE_MENU_BUTTONS.home;
  const modeLabel = game.mode === "defense" ? "New Defense Game" : "New Play Game";

  ctx.fillStyle = "rgba(55, 65, 81, 0.45)";
  ctx.fillRect(res.x, res.y, res.w, res.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.strokeRect(res.x, res.y, res.w, res.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 22px Arial";
  ctx.fillText("Resume", res.x + res.w / 2, res.y + res.h / 2 + 8);

  ctx.fillStyle = "rgba(55, 65, 81, 0.45)";
  ctx.fillRect(modeBtn.x, modeBtn.y, modeBtn.w, modeBtn.h);
  ctx.strokeRect(modeBtn.x, modeBtn.y, modeBtn.w, modeBtn.h);
  ctx.fillStyle = COLORS.white;
  ctx.fillText(modeLabel, modeBtn.x + modeBtn.w / 2, modeBtn.y + modeBtn.h / 2 + 8);

  ctx.fillStyle = "rgba(55, 65, 81, 0.45)";
  ctx.fillRect(home.x, home.y, home.w, home.h);
  ctx.strokeRect(home.x, home.y, home.w, home.h);
  ctx.fillStyle = COLORS.white;
  ctx.fillText("Back to Home Menu", home.x + home.w / 2, home.y + home.h / 2 + 8);
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
  const losX = left + Math.round(width * 0.35);

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

  const qbX = left + Math.round(width * 0.2);
  const midY = top + height / 2;
  const closeX = left + Math.round(width * 0.55);
  const deepX = left + Math.round(width * 0.78);
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
  ctx.fillText("Select defense", canvas.width / 2, P.y + 68);
  ctx.font = "14px Arial";
  ctx.fillStyle = "#d1d5db";
  ctx.fillText(`Down ${game.playModeDown} of ${game.playModeMaxDowns}`, canvas.width / 2, P.y + 92);
  ctx.fillText("Choose defense up top and toggle the offense play below.", canvas.width / 2, P.y + 112);

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
  if (game.mode !== "defense" || game.state === "menu" || game.state === "pauseMenu") return;
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

  if (["playing", "paused", "scorePause", "playModeDowned", "playModePlaySelect", "defenseModeSelect", "prePlayCadence"].includes(game.state)) {
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

  if (["playing", "prePlayCadence"].includes(game.state) && game.mode === "defense") {
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

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (game.state === "menu") {
    drawMenu();
    return;
  }

  drawField();

  // Line of scrimmage indicator for play mode
  if ((game.mode === "play" || game.mode === "defense") && game.playModeLineX) {
    ctx.save();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.moveTo(game.playModeLineX, FIELD.y);
    ctx.lineTo(game.playModeLineX, FIELD.y + FIELD.height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawScoreboard();
  drawPlayer(player1,      "Barnaby",         "#bfdbfe");
  drawPlayer(player2,      "Professor Pig",   "#fbcfe8");
  drawPlayer(allyHorse,    "Sir Neigh-a-Lot", "#fed7aa");
  drawPlayer(allyDonkey,   "Deputy Hee-Haw",  "#bbf7d0");
  drawPlayer(cluckNorris,  "Big Coop",        "#fca5a5");
  drawPlayer(lilTunnelPete,"Lil' Tunnel Pete","#fef08a");
  drawControlledDefenderMarker();
  drawBall();

  if (game.state === "pauseMenu") {
    drawPauseMenu();
    drawMobileTouchControls();
    return;
  }

  if (game.state === "playModePlaySelect") {
    drawPlaySelectOverlay();
    drawMobileTouchControls();
    return;
  }

  if (game.state === "defenseModeSelect") {
    drawDefenseSelectOverlay();
    drawMobileTouchControls();
    return;
  }

  if (game.state === "prePlayCadence") {
    drawPrePlayCadenceOverlay();
    drawMobileTouchControls();
    return;
  }

  const showPassAim = (game.mode === "passing" && ball.carrier === player1 && !ball.inFlight) ||
    (game.mode === "play" && (game.playModeCurrentPlay === "passRight" || game.playModeCurrentPlay === "passLeft" || game.playModeCurrentPlay === "barnPlay" || game.playModeCurrentPlay === "scrambledEggs")
      && ball.carrier === player1 && !ball.inFlight
      && game.passPlayDropbackDone && game.passPlayCanThrow);
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

  if (game.state === "safetyPopup") {
    drawSafetyPopup();
  } else if (game.state === "touchdownPopup") {
    drawTouchdownPopup();
  } else if (game.state === "scorePause" && game.scoredBy) {
    if (game.scoredBy === player1) {
      drawTouchdownPopup();
    } else {
      const scorerName = "Professor Pig scores!";
      drawCenterMessage(scorerName, "Resetting for the next play...");
    }
  } else if (game.state === "playModeDowned") {
    const isFourthDown = game.playModeDown >= game.playModeMaxDowns;
    const downedTitle  = game.playModeIncomplete ? "Incomplete!" : "Down!";
    const detail       = (game.mode === "play" || game.mode === "defense") ? buildPlayResultText() : null;
    if (game.touchControlsEnabled) {
      drawCenterMessage(downedTitle, "", detail, "Tap");
    } else {
      const downPrompt = game.mode === "defense"
        ? (isFourthDown ? "Press Enter to finish the drive" : "Press Enter for next defense")
        : (isFourthDown ? "Press Enter to continue" : "Press Enter for next play");
      drawCenterMessage(downedTitle, downPrompt, detail);
    }
  } else if (game.state === "gameOver") {
    if (game.mode === "play" && !game.winner) {
      drawCenterMessage("Game Over", "Press R for new drive");
    } else if (game.winner) {
      const winText = game.winner === player1 ? "Barnaby Wins!" : "Professor Pig Wins!";
      drawCenterMessage(winText, "Press R to restart");
    }
  }

  drawMobileTouchControls();
}

