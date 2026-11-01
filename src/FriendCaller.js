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
    askLead: "did you call",
    yesText: "yes, I called!",
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
    askLead: "did you make plans with",
    yesText: "yes, we made plans!",
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
    pending: `${prefix}:pending`,
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
  picked: null,   // who the app picked and is waiting to hear back about
  pickedOn: null, // the date they were picked
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
  // A pick still waiting for an answer survives closing the app, but only
  // for the day it was made (they stay in the pile either way).
  const pending = await StorageAdapter.get(KEYS.pending);
  if (pending && pending.date === today() && state.queue.includes(pending.name)) {
    state.picked = pending.name;
    state.pickedOn = pending.date;
  } else {
    state.picked = null;
    state.pickedOn = null;
  }
}

async function persist() {
  await StorageAdapter.set(KEYS.names,   state.names);
  await StorageAdapter.set(KEYS.queue,   state.queue);
  await StorageAdapter.set(KEYS.history, state.history);
  await StorageAdapter.set(KEYS.dates,   state.dates);
  await StorageAdapter.set(KEYS.pending, state.picked ? { name: state.picked, date: state.pickedOn ?? today() } : null);
}

// ─── Actions ──────────────────────────────────────────────────────────────────
// ─── Backup & restore ────────────────────────────────────────────────────────
// One text blob with both lists, so it can be pasted into Notes and back.
export async function exportBackup() {
  await persist();
  const lists = {};
  for (const id of Object.keys(LISTS)) {
    const k = keysFor(id);
    lists[id] = {
      names:   (await StorageAdapter.get(k.names))   ?? [],
      queue:   (await StorageAdapter.get(k.queue))   ?? [],
      history: (await StorageAdapter.get(k.history)) ?? [],
      dates:   (await StorageAdapter.get(k.dates))   ?? {},
    };
  }
  return JSON.stringify({ app: "friend-caller", v: 1, active: state.list, lists });
}

// Returns true if restored, false if the text isn't a Friend Caller backup.
export async function importBackup(text, onRedraw) {
  let b;
  try { b = JSON.parse(String(text).trim()); } catch { return false; }
  if (!b || b.app !== "friend-caller" || typeof b.lists !== "object") return false;
  if (state.spinning) return false;
  const isList = (x) => Array.isArray(x) && x.every((n) => typeof n === "string");
  for (const id of Object.keys(LISTS)) {
    const l = b.lists[id];
    if (!l) continue;
    if (!isList(l.names)) return false;
    const names = l.names;
    const k = keysFor(id);
    await StorageAdapter.set(k.names,   names);
    await StorageAdapter.set(k.queue,   isList(l.queue)   ? l.queue.filter((n) => names.includes(n))   : [...names]);
    await StorageAdapter.set(k.history, isList(l.history) ? l.history.filter((n) => names.includes(n)) : []);
    await StorageAdapter.set(k.dates,   l.dates && typeof l.dates === "object" ? l.dates : {});
    await StorageAdapter.set(k.pending, null);
  }
  await StorageAdapter.set(ACTIVE_KEY, LISTS[b.active] ? b.active : "far");
  state.picked = null;
  state.displayName = "";
  state.allDone = false;
  await loadState();
  onRedraw?.();
  return true;
}

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
    if (state.picked === name) { state.picked = null; state.pickedOn = null; }
    state.allDone = false;
  } else {
    // Check: count them as done for this round
    state.queue = state.queue.filter((n) => n !== name);
    state.history.push(name);
    state.dates[name] = today();
    if (state.picked === name) { state.picked = null; state.pickedOn = null; }
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
  if (state.picked === name) { state.picked = null; state.pickedOn = null; }
  persist();
  onRedraw?.();
}

// Answer "did you call them today?" with yes: now they're checked off.
export function confirmPicked(onRedraw) {
  const name = state.picked;
  if (!name || state.spinning) return;
  state.queue = state.queue.filter((n) => n !== name);
  if (!state.history.includes(name)) state.history.push(name);
  state.dates[name] = today();
  state.picked = null;
  state.pickedOn = null;
  state.allDone = state.queue.length === 0;
  persist();
  onRedraw?.();
}

// Picking someone does NOT check them off. They stay in this round's pile
// until you confirm you actually reached out (confirmPicked) or tap their tag.
export function pickName(onRedraw) {
  if (state.spinning || state.names.length === 0) return;

  const previous = state.picked; // whoever was still waiting on an answer
  if (state.queue.length === 0) {
    // Round finished: start a fresh one
    state.history = [];
    state.queue = shuffle(state.names);
  }
  // Prefer someone other than the person you were just asked about
  let pool = state.queue.filter((n) => n !== previous);
  if (pool.length === 0) pool = state.queue;

  state.spinning = true;
  state.picked = null;
  state.pickedOn = null;
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
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      state.displayName = chosen;
      state.picked = chosen;
      state.pickedOn = today();
      state.spinning = false;
      persist();
      onRedraw?.();
    }
  }, 80);
}
