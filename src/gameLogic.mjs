export const TILE_SIZE = 4;
export const BASE_SPEED = 4;
export const SPRINT_SPEED = 6.4;
export const SPEED_POWERUP_MULTIPLIER = 2;
export const SPEED_POWERUP_DURATION_MS = 10_000;

export const ITEM_DEFS = {
  flashlight: {
    label: "Flashlight",
    description: "Widens vision and reveals vine trails for 18 seconds."
  },
  food: {
    label: "Food",
    description: "Restores health and stamina."
  },
  disguise: {
    label: "Disguise",
    description: "Makes the monster ignore you for 14 seconds."
  },
  speed: {
    label: "Speed",
    description: "Doubles your movement speed for 10 seconds."
  },
  c4: {
    label: "C-4",
    description: "Plant it at the service pillar to blow open the nightmare."
  }
};

export const ITEM_SPAWNS = [
  { id: "flashlight-1", type: "flashlight", x: 10.5, z: 10.5, shop: "Lumen Lens" },
  { id: "food-1", type: "food", x: -13.5, z: 10.5, shop: "Food Court Echo" },
  { id: "disguise-1", type: "disguise", x: 10.5, z: 18.5, shop: "Forever Masks" },
  { id: "speed-1", type: "speed", x: 18.5, z: -9.5, shop: "Velocity Kicks" },
  { id: "food-2", type: "food", x: -13.5, z: -13.5, shop: "Dream Diner" },
  { id: "speed-2", type: "speed", x: -9.5, z: 18.5, shop: "Arcade Boost" },
  { id: "c4-1", type: "c4", x: 18.5, z: 18.5, shop: "Maintenance Closet" }
];

export const SHOP_OBJECTS = [
  {
    id: "service-pillar",
    label: "cracked service pillar",
    x: 2,
    z: 34,
    requires: "c4",
    success: "You plant the C-4. The mall folds inward, the blast becomes a hospital monitor, and you wake from the coma nightmare.",
    ending: true
  },
  {
    id: "locked-pharmacy",
    label: "locked pharmacy cabinet",
    x: -13.5,
    z: -13.5,
    requires: "flashlight",
    grants: "food",
    success: "The flashlight catches a key under the counter. You open the cabinet and grab emergency food."
  },
  {
    id: "mannequin-display",
    label: "mannequin display",
    x: 18.5,
    z: 10.5,
    requires: "disguise",
    grants: "speed",
    success: "You swap the disguise onto a mannequin and find a hidden speed shot."
  }
];

export function createGameState() {
  return {
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
}

export function distance2d(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function normalizeAngle(angle) {
  let normalized = angle % (Math.PI * 2);
  if (normalized < -Math.PI) normalized += Math.PI * 2;
  if (normalized > Math.PI) normalized -= Math.PI * 2;
  return normalized;
}

export function cellFromWorld(value) {
  return Math.floor(value / TILE_SIZE);
}

export function positiveMod(value, modulo) {
  return ((value % modulo) + modulo) % modulo;
}

export function isHallCell(cx, cz) {
  return positiveMod(cx, 8) <= 1 || positiveMod(cz, 8) <= 1;
}

export function isShopCell(cx, cz) {
  const mx = positiveMod(cx, 8);
  const mz = positiveMod(cz, 8);
  return !isHallCell(cx, cz) && ((mx >= 2 && mx <= 4 && mz <= 5) || (mz >= 2 && mz <= 4 && mx <= 5));
}

export function isWalkableWorld(x, z) {
  const cx = cellFromWorld(x);
  const cz = cellFromWorld(z);
  return isHallCell(cx, cz) || isShopCell(cx, cz);
}

export function isInShopWorld(x, z) {
  return isShopCell(cellFromWorld(x), cellFromWorld(z));
}

export function collectNearbyItem(state, player, maxDistance = 3.2) {
  const item = ITEM_SPAWNS.find((spawn) => !state.collectedIds.has(spawn.id) && distance2d(spawn, player) <= maxDistance);
  if (!item) return null;

  state.collectedIds.add(item.id);
  state.inventory.push(item.type);
  return item;
}

export function getActiveSpeed(now, sprinting, state) {
  const base = sprinting ? SPRINT_SPEED : BASE_SPEED;
  return now < state.effects.speedUntil ? base * SPEED_POWERUP_MULTIPLIER : base;
}

export function useInventoryItem(state, type, now) {
  const index = state.inventory.indexOf(type);
  if (index === -1) return { ok: false, message: `No ${ITEM_DEFS[type]?.label ?? type} in inventory.` };
  state.inventory.splice(index, 1);

  if (type === "food") {
    state.health = Math.min(100, state.health + 35);
    state.stamina = Math.min(100, state.stamina + 45);
    return { ok: true, message: "You eat quickly and steady your breathing." };
  }

  if (type === "flashlight") {
    state.effects.flashlightUntil = now + 18_000;
    return { ok: true, message: "The flashlight carves bright tunnels through the dark." };
  }

  if (type === "disguise") {
    state.effects.disguiseUntil = now + 14_000;
    return { ok: true, message: "The monster sees only another mall mannequin." };
  }

  if (type === "speed") {
    state.effects.speedUntil = now + SPEED_POWERUP_DURATION_MS;
    return { ok: true, message: "Your legs surge with impossible speed." };
  }

  if (type === "c4") {
    return { ok: false, message: "C-4 must be planted at the cracked service pillar." };
  }

  return { ok: false, message: "That item cannot be used here." };
}

export function useNearbyShopObject(state, player, now, maxDistance = 2.8) {
  const object = SHOP_OBJECTS.find((candidate) => !state.usedObjects.has(candidate.id) && distance2d(candidate, player) <= maxDistance);
  if (!object) return null;

  const requiredIndex = state.inventory.indexOf(object.requires);
  if (requiredIndex === -1) {
    return {
      ok: false,
      object,
      message: `The ${object.label} needs ${ITEM_DEFS[object.requires].label}.`
    };
  }

  state.inventory.splice(requiredIndex, 1);
  state.usedObjects.add(object.id);

  if (object.grants) {
    state.inventory.push(object.grants);
  }

  if (object.ending) {
    state.ended = true;
    state.endingText = object.success;
  }

  return {
    ok: true,
    object,
    message: object.success,
    now
  };
}

export function canMonsterSeePlayer(state, player, monster, now) {
  if (state.hidden && isInShopWorld(player.x, player.z)) return false;
  if (now < state.effects.disguiseUntil) return false;
  return distance2d(player, monster) < 26;
}
