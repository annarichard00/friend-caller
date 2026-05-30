/**
 * FriendCaller - Core Logic
 *
 * Framework-agnostic module. All state and logic lives here.
 * Plug into Mithril (or any other frontend) by wiring up the
 * public methods and subscribing to state changes.
 *
 * STORAGE: Currently uses localStorage as a placeholder.
 * TODO: swap StorageAdapter to POST/GET against your Micronaut API
 * so state persists per-user in Postgres.
 */

// ─── Storage Adapter ─────────────────────────────────────────────────────────
// Replace these with API calls to your Micronaut backend when ready.

const StorageAdapter = {
  async get(key) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};

// ─── Keys ─────────────────────────────────────────────────────────────────────
const KEYS = {
  names: "fc:names",
  queue: "fc:queue",
  history: "fc:history",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── State ────────────────────────────────────────────────────────────────────
export const state = {
  names: [],
  queue: [],
  history: [],
  picked: null,
  spinning: false,
  displayName: "",
  allDone: false,
};

// ─── Persistence ─────────────────────────────────────────────────────────────
export async function loadState() {
  state.names   = (await StorageAdapter.get(KEYS.names))   ?? [];
  state.queue   = (await StorageAdapter.get(KEYS.queue))   ?? [];
  state.history = (await StorageAdapter.get(KEYS.history)) ?? [];
}

async function persist() {
  await StorageAdapter.set(KEYS.names,   state.names);
  await StorageAdapter.set(KEYS.queue,   state.queue);
  await StorageAdapter.set(KEYS.history, state.history);
}

// ─── Actions ──────────────────────────────────────────────────────────────────
export function addName(name, onRedraw) {
  const trimmed = name.trim();
  if (!trimmed || state.names.includes(trimmed)) return false;
  state.names.push(trimmed);
  state.queue.push(trimmed);
  state.allDone = false;
  persist();
  onRedraw?.();
  return true;
}

export function removeName(name, onRedraw) {
  state.names   = state.names.filter((n) => n !== name);
  state.queue   = state.queue.filter((n) => n !== name);
  state.history = state.history.filter((n) => n !== name);
  if (state.picked === name) state.picked = null;
  persist();
  onRedraw?.();
}

export function pickName(onRedraw) {
  if (state.spinning || state.names.length === 0) return;

  let activeQueue = state.queue.length > 0 ? state.queue : shuffle(state.names);
  if (state.queue.length === 0) state.history = [];

  state.spinning = true;
  state.picked = null;
  state.allDone = false;
  onRedraw?.();

  let ticks = 0;
  const totalTicks = 18 + Math.floor(Math.random() * 10);

  const interval = setInterval(() => {
    state.displayName = state.names[Math.floor(Math.random() * state.names.length)];
    ticks++;
    onRedraw?.();

    if (ticks >= totalTicks) {
      clearInterval(interval);
      const chosen = activeQueue[0];
      const newQueue = activeQueue.slice(1);
      const newHistory = [...state.history, chosen];
      const isDone = newQueue.length === 0;

      state.displayName = chosen;
      state.picked = chosen;
      state.spinning = false;
      state.allDone = isDone;
      state.queue = isDone ? [] : newQueue;
      state.history = isDone ? [] : newHistory;

      persist();
      onRedraw?.();
    }
  }, 80);
}
