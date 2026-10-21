/**
 * FriendCallerView - Mithril Component
 *
 * Wires FriendCaller.js core logic into a Mithril view.
 * Import and mount this wherever it fits in your PWA app shell.
 *
 * Usage:
 *   import { FriendCallerView } from "./FriendCallerView.js";
 *   m.mount(document.getElementById("app"), FriendCallerView);
 */

import m from "mithril";
import {
  state,
  loadState,
  addName,
  removeName,
  pickName,
} from "./FriendCaller.js";

const pastelPalette = [
  "#f4a7b9", "#f7c59f", "#fffacd", "#b5ead7", "#c7ceea",
  "#ffdac1", "#e2f0cb", "#b5d5f5", "#f9d5e5", "#d4f1f9",
];

function colorFor(name) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % pastelPalette.length;
  return pastelPalette[hash];
}

export const FriendCallerView = {
  inputVal: "",

  oninit() {
    loadState().then(() => m.redraw());
  },

  view() {
    const s = state;
    const called = s.history.length; // history already includes the current pick
    const remaining = s.queue.length;

    return m(".friend-caller", [

      // Header
      m(".fc-header", [
        m("div", { style: "font-size:2rem" }, "☎"),
        m("h1", "who to call today"),
        m("p.fc-subtitle", "everyone gets a turn before anyone repeats"),
      ]),

      // Spinner circle
      m(".fc-circle", {
        onclick: () => !s.spinning && s.names.length > 0 && pickName(() => m.redraw()),
        style: s.picked
          ? `background:${colorFor(s.picked)};box-shadow:0 8px 32px ${colorFor(s.picked)}88`
          : "",
        class: s.spinning ? "fc-circle--spinning" : "",
      }, s.names.length === 0
        ? m("span.fc-hint", "add some friends below to get started")
        : s.spinning
        ? m("span.fc-spin-name", s.displayName)
        : s.picked
        ? [
            m("span.fc-label", "call"),
            m("span.fc-picked-name", s.picked),
            m("span.fc-label", "tap to pick again"),
          ]
        : [
            m("span", { style: "font-size:1.6rem" }, "✦"),
            m("span.fc-hint", "tap to spin"),
          ]
      ),

      // All done banner
      s.allDone && m(".fc-done-banner",
        "🎉 you've called everyone! the list will reset on the next spin."
      ),

      // Progress
      s.names.length > 0 && m(".fc-progress",
        `${called} called · ${remaining} remaining in this round`
      ),

      // Add name input
      m(".fc-input-row", [
        m("input", {
          value: FriendCallerView.inputVal,
          placeholder: "add a friend's name…",
          oninput: (e) => { FriendCallerView.inputVal = e.target.value; },
          onkeydown: (e) => {
            if (e.key === "Enter") {
              addName(FriendCallerView.inputVal, () => m.redraw());
              FriendCallerView.inputVal = "";
            }
          },
        }),
        m("button", {
          onclick: () => {
            addName(FriendCallerView.inputVal, () => m.redraw());
            FriendCallerView.inputVal = "";
          },
        }, "+"),
      ]),

      // Name tags
      s.names.length > 0 && m(".fc-names", [
        m("p.fc-names-label", "your people"),
        m(".fc-tags",
          s.names.map((name) => {
            const wasCalled = s.history.includes(name) || s.picked === name;
            return m(".fc-tag", {
              key: name,
              style: `background:${colorFor(name)};opacity:${wasCalled ? 0.45 : 1}`,
            }, [
              wasCalled && m("span.fc-check", "✓"),
              name,
              m("span.fc-remove", {
                onclick: (e) => {
                  e.stopPropagation();
                  removeName(name, () => m.redraw());
                },
              }, "✕"),
            ]);
          })
        ),
      ]),
    ]);
  },
};
