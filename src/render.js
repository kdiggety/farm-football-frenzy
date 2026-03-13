// =========================================================
// Rendering
// =========================================================
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
  ctx.fillText("BARNABY", 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(FIELD.x + FIELD.width - FIELD.endZoneWidth / 2, FIELD.y + FIELD.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText("PIG", 0, 0);
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

  // Ears / snout details
  if (player.id === "player1") {
    ctx.fillStyle = "#93c5fd";
    ctx.beginPath();
    ctx.ellipse(player.x - 8, player.y - 20, 5, 10, -0.3, 0, Math.PI * 2);
    ctx.ellipse(player.x + 8, player.y - 20, 5, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else {
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
}

function drawCenterMessage(title, subtitle) {
  ctx.fillStyle = "rgba(17, 24, 39, 0.78)";
  ctx.fillRect(180, 190, 600, 150);

  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.strokeRect(180, 190, 600, 150);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 34px Arial";
  ctx.fillText(title, canvas.width / 2, 245);

  ctx.font = "18px Arial";
  ctx.fillText(subtitle, canvas.width / 2, 285);
}

function drawMenu() {
  ctx.fillStyle = "rgba(17, 24, 39, 0.92)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 42px Arial";
  ctx.fillText("Farm Football Frenzy", canvas.width / 2, 160);
  ctx.font = "18px Arial";
  ctx.fillStyle = "#d1d5db";
  ctx.fillText("Choose a mode", canvas.width / 2, 210);

  const g = MENU_BUTTONS.gameMode;
  const pm = MENU_BUTTONS.passingMode;

  ctx.fillStyle = "#374151";
  ctx.fillRect(g.x, g.y, g.w, g.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.strokeRect(g.x, g.y, g.w, g.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 22px Arial";
  ctx.fillText("Game Mode", g.x + g.w / 2, g.y + g.h / 2 + 8);

  ctx.fillStyle = "#374151";
  ctx.fillRect(pm.x, pm.y, pm.w, pm.h);
  ctx.strokeRect(pm.x, pm.y, pm.w, pm.h);
  ctx.fillStyle = COLORS.white;
  ctx.fillText("Passing Mode", pm.x + pm.w / 2, pm.y + pm.h / 2 + 8);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText("Game Mode: Run with the ball. Passing Mode: Click to throw.", canvas.width / 2, 450);
}

function drawPauseMenu() {
  ctx.fillStyle = "rgba(17, 24, 39, 0.75)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(17, 24, 39, 0.92)";
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
  const home = PAUSE_MENU_BUTTONS.home;

  ctx.fillStyle = "#374151";
  ctx.fillRect(res.x, res.y, res.w, res.h);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.strokeRect(res.x, res.y, res.w, res.h);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 22px Arial";
  ctx.fillText("Resume", res.x + res.w / 2, res.y + res.h / 2 + 8);

  ctx.fillStyle = "#374151";
  ctx.fillRect(home.x, home.y, home.w, home.h);
  ctx.strokeRect(home.x, home.y, home.w, home.h);
  ctx.fillStyle = COLORS.white;
  ctx.fillText("Back to Home Menu", home.x + home.w / 2, home.y + home.h / 2 + 8);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (game.state === "menu") {
    drawMenu();
    return;
  }

  drawField();
  drawScoreboard();
  drawPlayer(player1, "Barnaby", "#bfdbfe");
  drawPlayer(player2, "Professor Pig", "#fbcfe8");
  drawPlayer(allyHorse, "Sir Neigh-a-Lot", "#fed7aa");
  drawPlayer(allyDonkey, "Deputy Hee-Haw", "#bbf7d0");
  drawBall();

  if (game.state === "pauseMenu") {
    drawPauseMenu();
    return;
  }

  if (game.mode === "passing" && ball.carrier === player1 && !ball.inFlight) {
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

  if (game.state === "scorePause" && game.scoredBy) {
    const scorerName = game.scoredBy === player1 ? "Barnaby scores!" : "Professor Pig scores!";
    drawCenterMessage(scorerName, "Resetting for the next play...");
  } else if (game.state === "gameOver" && game.winner) {
    const winText = game.winner === player1 ? "Barnaby Wins!" : "Professor Pig Wins!";
    drawCenterMessage(winText, "Press R to restart");
  }
}

