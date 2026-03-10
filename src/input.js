// =========================================================
// Input Handling
// =========================================================
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  if (key === "r" && game.state === "gameOver") {
    restartGame();
  }

  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
    e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

function updatePlayerInput(dt) {
  let dx = 0;
  let dy = 0;

  if (keys["w"]) dy -= 1;
  if (keys["s"]) dy += 1;
  if (keys["a"]) dx -= 1;
  if (keys["d"]) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;

    player1.x += dx * player1.speed * dt;
    player1.y += dy * player1.speed * dt;
  }

  clampPlayerToField(player1);
}

