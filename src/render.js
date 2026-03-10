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
    const x = FIELD.x + (FIELD.width / 10) * i;
    ctx.beginPath();
    ctx.moveTo(x, FIELD.y + 18);
    ctx.lineTo(x, FIELD.y + FIELD.height - 18);
    ctx.stroke();
  }

  // Midfield circle
  ctx.beginPath();
  ctx.arc(FIELD.x + FIELD.width / 2, FIELD.y + FIELD.height / 2, 44, 0, Math.PI * 2);
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
  ctx.fillText("BARNABY DEFENDS", FIELD.x + FIELD.endZoneWidth / 2, FIELD.y + FIELD.height / 2);
  ctx.save();
  ctx.translate(FIELD.x + FIELD.width - FIELD.endZoneWidth / 2, FIELD.y + FIELD.height / 2);
  ctx.rotate(Math.PI);
  ctx.fillText("PIG DEFENDS", 0, 0);
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

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawField();
  drawScoreboard();
  drawPlayer(player1, "Barnaby", "#bfdbfe");
  drawPlayer(player2, "Professor Pig", "#fbcfe8");
  drawBall();

  if (game.state === "scorePause" && game.scoredBy) {
    const scorerName = game.scoredBy === player1 ? "Barnaby scores!" : "Professor Pig scores!";
    drawCenterMessage(scorerName, "Resetting for the next play...");
  } else if (game.state === "gameOver" && game.winner) {
    const winText = game.winner === player1 ? "Barnaby Wins!" : "Professor Pig Wins!";
    drawCenterMessage(winText, "Press R to restart");
  }
}

