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

// ─── Lists ────────────────────────────────────────────────────────────────────
// Each list has its own names, queue and history. The "far" list keeps the
// original storage keys so existing names carry over untouched.
export const LISTS = {
  far: {
    id: "far",
    tab: "long distance",
    icon: "☎",
    title: "who to call today",
    verb: "call",
    doneText: "you've called everyone!",
    todayText: "you called",
    countWord: "called",
    placeholder: "add a faraway friend…",
  },
  near: {
    id: "near",
    tab: "local",
    icon: "🎟",
    title: "who to hang out with",
    verb: "make plans with",
    doneText: "you've hung out with everyone!",
    todayText: "you made plans with",
    countWord: "invited",
    placeholder: "add a local friend…",
  },
};

function keysFor(listId) {
  const prefix = listId === "far" ? "fc" : `fc:${listId}`;
  return {
    names: `${prefix}:names`,
    queue: `${prefix}:queue`,
    history: `${prefix}:history`,
    dates: `${prefix}:dates`,
  };
}

const ACTIVE_KEY = "fc:activeList";
let KEYS = keysFor("far");

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Today's date on this phone, e.g. "2026-10-21" (local time, not UTC)
export function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Names checked off today (still counts if a new round started since)
export function doneToday() {
  const t = today();
  return state.names.filter((n) => state.dates[n] === t);
}

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
  list: "far",
  names: [],
  queue: [],
  history: [],
  dates: {},     // name -> date they were last checked off
  picked: null,
  spinning: false,
  displayName: "",
  allDone: false,
};

// ─── Persistence ─────────────────────────────────────────────────────────────
export async function loadState() {
  const saved = await StorageAdapter.get(ACTIVE_KEY);
  state.list = LISTS[saved] ? saved : "far";
  KEYS = keysFor(state.list);
  state.names   = (await StorageAdapter.get(KEYS.names))   ?? [];
  state.queue   = (await StorageAdapter.get(KEYS.queue))   ?? [];
  state.history = (await StorageAdapter.get(KEYS.history)) ?? [];
  state.dates   = (await StorageAdapter.get(KEYS.dates))   ?? {};
}

async function persist() {
  await StorageAdapter.set(KEYS.names,   state.names);
  await StorageAdapter.set(KEYS.queue,   state.queue);
  await StorageAdapter.set(KEYS.history, state.history);
  await StorageAdapter.set(KEYS.dates,   state.dates);
}

// ─── Actions ──────────────────────────────────────────────────────────────────
export async function switchList(listId, onRedraw) {
  if (state.spinning || !LISTS[listId] || listId === state.list) return;
  await persist();
  state.picked = null;
  state.displayName = "";
  state.allDone = false;
  await StorageAdapter.set(ACTIVE_KEY, listId);
  await loadState();
  onRedraw?.();
}

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

// Check or uncheck someone by hand (e.g. the app picked them but you
// haven't called yet, or you reached out without the app picking them).
export function toggleCalled(name, onRedraw) {
  if (state.spinning || !state.names.includes(name)) return;
  if (state.history.includes(name)) {
    // Uncheck: back into this round's pile
    state.history = state.history.filter((n) => n !== name);
    if (state.dates[name] === today()) delete state.dates[name];
    if (!state.queue.includes(name)) state.queue.push(name);
    if (state.picked === name) state.picked = null;
    state.allDone = false;
  } else {
    // Check: count them as done for this round
    state.queue = state.queue.filter((n) => n !== name);
    state.history.push(name);
    state.dates[name] = today();
    state.allDone = state.queue.length === 0;
  }
  persist();
  onRedraw?.();
}

export function removeName(name, onRedraw) {
  state.names   = state.names.filter((n) => n !== name);
  state.queue   = state.queue.filter((n) => n !== name);
  state.history = state.history.filter((n) => n !== name);
  delete state.dates[name];
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
      // Pick at random from whoever's left (the queue is in the order
      // names were added, so taking queue[0] wasn't actually random).
      const idx = Math.floor(Math.random() * activeQueue.length);
      const chosen = activeQueue[idx];
      const newQueue = activeQueue.filter((_, i) => i !== idx);
      const isDone = newQueue.length === 0;

      state.displayName = chosen;
      state.picked = chosen;
      state.spinning = false;
      state.allDone = isDone;
      state.queue = newQueue;
      // Keep the full round in history (even when done) so the count and
      // check marks stay right; the next spin after a finished round clears it.
      state.history = [...state.history, chosen];
      state.dates[chosen] = today();

      persist();
      onRedraw?.();
    }
  }, 80);
}
