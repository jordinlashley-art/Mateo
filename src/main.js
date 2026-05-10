import {
  BASE_SPEED,
  ITEM_DEFS,
  ITEM_SPAWNS,
  SHOP_OBJECTS,
  canMonsterSeePlayer,
  collectNearbyItem,
  distance2d,
  getActiveSpeed,
  isInShopWorld,
  isShopCell,
  isWalkableWorld,
  normalizeAngle,
  useInventoryItem,
  useNearbyShopObject
} from "./gameLogic.mjs";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const healthEl = document.querySelector("#health");
const staminaEl = document.querySelector("#stamina");
const statusEl = document.querySelector("#status");
const inventoryEl = document.querySelector("#inventory");

const keys = new Set();
const messages = [];
const player = { x: 7.2, z: 7.2, angle: Math.PI / 4 };
const monster = { x: -22, z: -18, angle: 0, lastSeenX: player.x, lastSeenZ: player.z };
const state = window.gameState = {
  inventory: [],
  health: 100,
  stamina: 100,
  hidden: false,
  ended: false,
  endingText: "",
  collectedIds: new Set(),
  usedObjects: new Set(),
  effects: {
    flashlightUntil: 0,
    disguiseUntil: 0,
    speedUntil: 0
  }
};

let lastTime = performance.now();
let interactWasDown = false;
let hideWasDown = false;

function pushMessage(text) {
  messages.unshift({ text, until: performance.now() + 4500 });
  messages.splice(4);
  statusEl.textContent = text;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round(rect.width * 9 / 16 * scale);
}

function tryMove(dx, dz) {
  const nextX = player.x + dx;
  const nextZ = player.z + dz;
  if (isWalkableWorld(nextX, player.z)) player.x = nextX;
  if (isWalkableWorld(player.x, nextZ)) player.z = nextZ;
  if (!isInShopWorld(player.x, player.z)) state.hidden = false;
}

function updateInput(dt, now) {
  const turnSpeed = 2.45;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) player.angle -= turnSpeed * dt;
  if (keys.has("KeyD") || keys.has("ArrowRight")) player.angle += turnSpeed * dt;
  player.angle = normalizeAngle(player.angle);

  const moving = keys.has("KeyW") || keys.has("ArrowUp") || keys.has("KeyS") || keys.has("ArrowDown");
  const sprinting = keys.has("ShiftLeft") || keys.has("ShiftRight");
  const canSprint = sprinting && state.stamina > 2;
  const speed = getActiveSpeed(now, canSprint, state);
  const direction = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);

  if (direction !== 0 && !state.hidden) {
    tryMove(Math.cos(player.angle) * direction * speed * dt, Math.sin(player.angle) * direction * speed * dt);
  }

  if (moving && canSprint && !state.hidden) {
    state.stamina = Math.max(0, state.stamina - 24 * dt);
  } else {
    state.stamina = Math.min(100, state.stamina + (state.hidden ? 28 : 11) * dt);
  }

  const interactDown = keys.has("KeyE");
  if (interactDown && !interactWasDown) interact(now);
  interactWasDown = interactDown;

  const hideDown = keys.has("KeyH");
  if (hideDown && !hideWasDown) toggleHide();
  hideWasDown = hideDown;
}

function toggleHide() {
  if (!isInShopWorld(player.x, player.z)) {
    pushMessage("You can hide only inside shops.");
    return;
  }
  state.hidden = !state.hidden;
  pushMessage(state.hidden ? "You crouch behind a shop counter." : "You step back into the glowing aisle.");
}

function interact(now) {
  if (state.ended) return;

  const item = collectNearbyItem(state, player);
  if (item) {
    pushMessage(`Collected ${ITEM_DEFS[item.type].label} in ${item.shop}.`);
    return;
  }

  const objectResult = useNearbyShopObject(state, player, now);
  if (objectResult) {
    pushMessage(objectResult.message);
    return;
  }

  pushMessage(isInShopWorld(player.x, player.z) ? "Search deeper: no usable item here." : "Nothing useful in this aisle.");
}

function updateMonster(dt, now) {
  const visible = canMonsterSeePlayer(state, player, monster, now);
  if (visible) {
    monster.lastSeenX = player.x;
    monster.lastSeenZ = player.z;
  }

  const targetX = visible ? player.x : monster.lastSeenX + Math.sin(now / 1300) * 3.5;
  const targetZ = visible ? player.z : monster.lastSeenZ + Math.cos(now / 1600) * 3.5;
  const dx = targetX - monster.x;
  const dz = targetZ - monster.z;
  const distance = Math.hypot(dx, dz);
  const speed = visible ? 3.15 : 1.55;

  if (distance > 0.25) {
    const nextX = monster.x + (dx / distance) * speed * dt;
    const nextZ = monster.z + (dz / distance) * speed * dt;
    if (isWalkableWorld(nextX, monster.z)) monster.x = nextX;
    if (isWalkableWorld(monster.x, nextZ)) monster.z = nextZ;
    monster.angle = Math.atan2(dz, dx);
  }

  if (!state.ended && distance2d(player, monster) < 1.6 && visible) {
    state.health = Math.max(0, state.health - 42 * dt);
    if (state.health === 0) {
      state.ended = true;
      state.endingText = "The vine monster drags you into the food court dark. The coma nightmare restarts.";
      pushMessage("Nightmare reset: the monster caught you.");
    }
  }
}

function raycast(angle, maxDistance = 42) {
  const step = 0.08;
  for (let dist = 0; dist < maxDistance; dist += step) {
    const x = player.x + Math.cos(angle) * dist;
    const z = player.z + Math.sin(angle) * dist;
    if (!isWalkableWorld(x, z)) {
      const cx = Math.floor(x / 4);
      const cz = Math.floor(z / 4);
      return { dist, shopWall: isShopCell(cx, cz), x, z };
    }
  }
  return { dist: maxDistance, shopWall: false, x: player.x, z: player.z };
}

function drawScene(now) {
  const width = canvas.width;
  const height = canvas.height;
  const fov = now < state.effects.flashlightUntil ? Math.PI / 2.05 : Math.PI / 2.55;

  const ceiling = ctx.createLinearGradient(0, 0, 0, height / 2);
  ceiling.addColorStop(0, "#08070d");
  ceiling.addColorStop(1, "#21121a");
  ctx.fillStyle = ceiling;
  ctx.fillRect(0, 0, width, height / 2);

  const floor = ctx.createLinearGradient(0, height / 2, 0, height);
  floor.addColorStop(0, "#1c1718");
  floor.addColorStop(1, "#050509");
  ctx.fillStyle = floor;
  ctx.fillRect(0, height / 2, width, height / 2);

  const columns = Math.min(width, 720);
  const columnWidth = width / columns;
  for (let col = 0; col < columns; col += 1) {
    const ratio = col / columns;
    const rayAngle = player.angle - fov / 2 + ratio * fov;
    const hit = raycast(rayAngle);
    const corrected = Math.max(0.001, hit.dist * Math.cos(rayAngle - player.angle));
    const wallHeight = Math.min(height * 1.3, (height * 2.15) / corrected);
    const shade = Math.max(0.18, 1 - corrected / 42);
    const pulse = 0.08 * Math.sin(now / 210 + col * 0.06);
    const red = hit.shopWall ? 80 : 120;
    const green = hit.shopWall ? 48 : 32;
    const blue = hit.shopWall ? 62 : 50;
    ctx.fillStyle = `rgb(${Math.round((red + pulse * 255) * shade)}, ${Math.round(green * shade)}, ${Math.round((blue + 20) * shade)})`;
    ctx.fillRect(col * columnWidth, height / 2 - wallHeight / 2, columnWidth + 1, wallHeight);

    if (col % 18 === 0) {
      ctx.fillStyle = `rgba(255, 211, 106, ${shade * 0.35})`;
      ctx.fillRect(col * columnWidth, height / 2 - wallHeight / 2, Math.max(1, columnWidth), wallHeight);
    }
  }

  drawSprites(now, fov);
  drawOverlay(now);
  drawMiniMap();
}

function projectPoint(point, fov) {
  const dx = point.x - player.x;
  const dz = point.z - player.z;
  const dist = Math.hypot(dx, dz);
  const angleTo = normalizeAngle(Math.atan2(dz, dx) - player.angle);
  if (Math.abs(angleTo) > fov / 1.5 || dist < 0.2) return null;
  const visibleDist = raycast(player.angle + angleTo, dist + 0.1).dist;
  if (visibleDist < dist - 0.45) return null;
  return {
    x: canvas.width * (0.5 + angleTo / fov),
    y: canvas.height / 2,
    dist
  };
}

function drawSprites(now, fov) {
  const sprites = [
    ...ITEM_SPAWNS
      .filter((item) => !state.collectedIds.has(item.id))
      .map((item) => ({ ...item, kind: "item" })),
    ...SHOP_OBJECTS
      .filter((object) => !state.usedObjects.has(object.id))
      .map((object) => ({ ...object, kind: "object" })),
    { ...monster, kind: "monster", type: "monster" }
  ].sort((a, b) => distance2d(b, player) - distance2d(a, player));

  for (const sprite of sprites) {
    const projected = projectPoint(sprite, fov);
    if (!projected) continue;
    const size = Math.max(18, Math.min(canvas.height * 0.85, canvas.height / projected.dist * (sprite.kind === "monster" ? 4.8 : 1.35)));
    const x = projected.x;
    const y = projected.y + size * 0.08;

    if (sprite.kind === "monster") {
      drawMonster(x, y, size, now);
    } else if (sprite.kind === "object") {
      drawObject(x, y, size, sprite);
    } else {
      drawItem(x, y, size, sprite);
    }
  }
}

function drawMonster(x, y, size, now) {
  const pulse = Math.sin(now / 120) * 0.07;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(20, 38, 25, 0.98)";
  ctx.strokeStyle = "#782222";
  ctx.lineWidth = Math.max(2, size * 0.035);
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 + now / 700;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * size * 0.08, -size * 0.1);
    ctx.quadraticCurveTo(Math.cos(a) * size * 0.45, Math.sin(a) * size * 0.36, Math.cos(a + pulse) * size * 0.72, Math.sin(a) * size * 0.72);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.28, size * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff2e46";
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.05, size * 0.11 + size * pulse, size * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe6d2";
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * size * 0.055, size * 0.02);
    ctx.lineTo(i * size * 0.055 + size * 0.025, size * 0.16);
    ctx.lineTo(i * size * 0.055 - size * 0.025, size * 0.16);
    ctx.fill();
  }
  ctx.restore();
}

function drawItem(x, y, size, item) {
  const color = {
    flashlight: "#ffe575",
    food: "#8cff9e",
    disguise: "#9fd4ff",
    speed: "#ff9d31",
    c4: "#ff3650"
  }[item.type];

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.48, size * 0.35, size * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(2, size * 0.035);
  ctx.beginPath();
  ctx.roundRect(-size * 0.22, -size * 0.22, size * 0.44, size * 0.44, size * 0.08);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#050509";
  ctx.font = `${Math.max(10, size * 0.16)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(ITEM_DEFS[item.type].label, 0, size * 0.62);
  ctx.restore();
}

function drawObject(x, y, size, object) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = object.ending ? "#d9d9d9" : "#7b6cff";
  ctx.strokeStyle = object.ending ? "#ff3650" : "#ffffff";
  ctx.lineWidth = Math.max(2, size * 0.04);
  ctx.fillRect(-size * 0.18, -size * 0.55, size * 0.36, size);
  ctx.strokeRect(-size * 0.18, -size * 0.55, size * 0.36, size);
  ctx.fillStyle = "#fff4c0";
  ctx.font = `${Math.max(10, size * 0.13)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(object.ending ? "PLANT C-4" : "USE ITEM", 0, size * 0.62);
  ctx.restore();
}

function drawOverlay(now) {
  const active = [];
  if (state.hidden) active.push("HIDDEN");
  if (now < state.effects.flashlightUntil) active.push("FLASHLIGHT");
  if (now < state.effects.disguiseUntil) active.push("DISGUISED");
  if (now < state.effects.speedUntil) active.push("2X SPEED");

  const nearest = nearestTarget();
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(18, 16, canvas.width - 36, 82);
  ctx.fillStyle = "#fff4dc";
  ctx.font = `${Math.max(16, canvas.width * 0.018)}px sans-serif`;
  ctx.fillText("Objective: find C-4, plant it at the cracked service pillar, and wake from the coma nightmare.", 32, 44);
  ctx.fillStyle = "#ffd36a";
  ctx.fillText(`Nearest: ${nearest}`, 32, 73);
  if (active.length) {
    ctx.fillStyle = "#ff3650";
    ctx.fillText(active.join("  |  "), canvas.width - 32 - ctx.measureText(active.join("  |  ")).width, 73);
  }

  const liveMessages = messages.filter((message) => message.until > now);
  ctx.font = `${Math.max(15, canvas.width * 0.016)}px sans-serif`;
  liveMessages.forEach((message, index) => {
    ctx.fillStyle = `rgba(0,0,0,${0.55 - index * 0.08})`;
    ctx.fillRect(24, canvas.height - 116 + index * 28, canvas.width - 48, 24);
    ctx.fillStyle = "#fff";
    ctx.fillText(message.text, 34, canvas.height - 98 + index * 28);
  });

  if (state.ended) {
    ctx.fillStyle = "rgba(5, 5, 9, 0.86)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff3650";
    ctx.font = `800 ${Math.max(34, canvas.width * 0.055)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(state.health === 0 ? "Nightmare Restarted" : "Awake", canvas.width / 2, canvas.height / 2 - 60);
    ctx.fillStyle = "#fff4dc";
    ctx.font = `${Math.max(18, canvas.width * 0.024)}px sans-serif`;
    wrapText(state.endingText, canvas.width / 2, canvas.height / 2, canvas.width * 0.72, 34);
    ctx.textAlign = "start";
  }
}

function drawMiniMap() {
  const size = Math.min(170, canvas.width * 0.18);
  const x0 = canvas.width - size - 22;
  const y0 = canvas.height - size - 22;
  const scale = size / 52;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.52)";
  ctx.fillRect(x0 - 8, y0 - 8, size + 16, size + 16);

  for (let gx = -6; gx <= 6; gx += 1) {
    for (let gz = -6; gz <= 6; gz += 1) {
      const wx = player.x + gx * 4;
      const wz = player.z + gz * 4;
      ctx.fillStyle = isWalkableWorld(wx, wz) ? (isInShopWorld(wx, wz) ? "#503142" : "#34384f") : "#09090d";
      ctx.fillRect(x0 + size / 2 + gx * 4 * scale, y0 + size / 2 + gz * 4 * scale, 4 * scale + 1, 4 * scale + 1);
    }
  }

  drawMapDot(x0, y0, size, scale, monster.x, monster.z, "#ff3650", 5);
  for (const item of ITEM_SPAWNS) {
    if (!state.collectedIds.has(item.id)) drawMapDot(x0, y0, size, scale, item.x, item.z, "#ffd36a", 3);
  }
  for (const object of SHOP_OBJECTS) {
    if (!state.usedObjects.has(object.id)) drawMapDot(x0, y0, size, scale, object.x, object.z, object.ending ? "#ffffff" : "#9fd4ff", 4);
  }
  drawMapDot(x0, y0, size, scale, player.x, player.z, "#8cff9e", 5);
  ctx.restore();
}

function drawMapDot(x0, y0, size, scale, x, z, color, radius) {
  const mapX = x0 + size / 2 + (x - player.x) * scale;
  const mapY = y0 + size / 2 + (z - player.z) * scale;
  if (mapX < x0 || mapX > x0 + size || mapY < y0 || mapY > y0 + size) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(mapX, mapY, radius, 0, Math.PI * 2);
  ctx.fill();
}

function nearestTarget() {
  const candidates = [
    ...ITEM_SPAWNS
      .filter((item) => !state.collectedIds.has(item.id))
      .map((item) => ({ name: `${ITEM_DEFS[item.type].label} in ${item.shop}`, x: item.x, z: item.z })),
    ...SHOP_OBJECTS
      .filter((object) => !state.usedObjects.has(object.id))
      .map((object) => ({ name: object.ending ? "service pillar for C-4" : object.label, x: object.x, z: object.z }))
  ];
  const nearest = candidates.sort((a, b) => distance2d(a, player) - distance2d(b, player))[0];
  if (!nearest) return "the hospital bed";
  const angle = normalizeAngle(Math.atan2(nearest.z - player.z, nearest.x - player.x) - player.angle);
  const direction = Math.abs(angle) < 0.35 ? "ahead" : angle > 0 ? "right" : "left";
  return `${nearest.name} (${Math.round(distance2d(nearest, player))}m, ${direction})`;
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;
  for (const word of words) {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = `${word} `;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, lineY);
}

function updateHud(now) {
  healthEl.textContent = Math.round(state.health);
  staminaEl.textContent = Math.round(state.stamina);
  const inventory = state.inventory.map((type) => ITEM_DEFS[type].label).join(", ");
  inventoryEl.textContent = inventory || "Empty";
  if (!messages.some((message) => message.until > now)) {
    statusEl.textContent = state.ended ? "Nightmare resolved" : nearestTarget();
  }
}

function gameLoop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (!state.ended) {
    updateInput(dt, now);
    updateMonster(dt, now);
  }
  drawScene(now);
  updateHud(now);
  requestAnimationFrame(gameLoop);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  const itemKey = {
    Digit1: "flashlight",
    Digit2: "food",
    Digit3: "disguise",
    Digit4: "speed"
  }[event.code];
  if (itemKey && !state.ended) {
    pushMessage(useInventoryItem(state, itemKey, performance.now()).message);
  }
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
canvas.addEventListener("click", () => canvas.focus());

resizeCanvas();
pushMessage("Run. Hide in shops. Use items. Find C-4.");
requestAnimationFrame(gameLoop);

// A tiny test hook lets automated browser checks verify the live game without changing gameplay.
window.mallNightmare = {
  player,
  monster,
  state,
  interact,
  toggleHide,
  useInventoryItem: (type) => useInventoryItem(state, type, performance.now()),
  get baseSpeed() {
    return BASE_SPEED;
  }
};
