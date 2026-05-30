# friend-caller

A small PWA app that picks a random friend to call each day — deck-style, so everyone gets a turn before anyone repeats.

Built by Anna via Claude, deployed and maintained in this repo.

---

## What it does

- Maintains a list of names (friends/family to stay in touch with)
- On each spin, picks a random name from the remaining unpicked pool
- Once everyone has been picked, the deck resets automatically
- Picked names are shown faded with a ✓ so you can see who's left

---

## File structure

```
src/
  FriendCaller.js       # Core logic — framework agnostic, all state & actions here
  FriendCallerView.js   # Mithril component — wires core logic into a view
  FriendCaller.css      # Styles — scoped under .friend-caller
```

---

## Stack

- **Frontend:** Mithril / RxJS / m-dot-nav
- **Backend:** Micronaut / Postgres
- **Deployed:** Azure VM, PWA platform

---

## TODO: swap storage adapter

Currently `FriendCaller.js` uses `localStorage` as a placeholder. When ready, replace the `StorageAdapter` in that file with API calls to the Micronaut backend so state persists per-user in Postgres.

The adapter interface is simple — just `get(key)` and `set(key, value)` — so the swap is isolated to one place.

```js
// src/FriendCaller.js — StorageAdapter section
const StorageAdapter = {
  async get(key) {
    // TODO: GET /api/friend-caller/state?key={key}
  },
  async set(key, value) {
    // TODO: POST /api/friend-caller/state { key, value }
  },
};
```

---

## How Anna makes changes

Anna uses Claude Code to make changes to this repo conversationally. When working in a Claude Code session, point it at this README for context on the architecture and Anna's role.

Changes Anna might commonly want:
- Adding/changing visual styling (colors, fonts, layout)
- Tweaking the spin animation
- Adding a "notes" field per person (e.g. last called date)
- Adjusting the all-done reset behavior

---

## Mounting the component

```js
import { FriendCallerView } from "./src/FriendCallerView.js";
import "./src/FriendCaller.css";

m.mount(document.getElementById("friend-caller-root"), FriendCallerView);
```
