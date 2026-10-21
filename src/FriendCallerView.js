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
  toggleCalled,
  pickName,
  switchList,
  LISTS,
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
  confirmRemove: null,

  oninit() {
    loadState().then(() => m.redraw());
  },

  view() {
    const s = state;
    const called = s.history.length; // history already includes the current pick
    const remaining = s.queue.length;
    const L = LISTS[s.list];

    return m(".friend-caller", [

      // List toggle
      m(".fc-tabs", { role: "tablist" },
        Object.values(LISTS).map((list) =>
          m("button.fc-tab", {
            role: "tab",
            "aria-selected": String(list.id === s.list),
            class: list.id === s.list ? "fc-tab--active" : "",
            disabled: s.spinning,
            onclick: () => {
              FriendCallerView.inputVal = "";
              switchList(list.id, () => m.redraw());
            },
          }, list.tab)
        )
      ),

      // Header
      m(".fc-header", [
        m("div", { style: "font-size:2rem" }, L.icon),
        m("h1", L.title),
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
            m("span.fc-label", L.verb),
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
        `🎉 ${L.doneText} the list will reset on the next spin.`
      ),

      // Progress
      s.names.length > 0 && m(".fc-progress",
        `${called} ${L.countWord} · ${remaining} remaining in this round`
      ),

      // Add name input
      m(".fc-input-row", [
        m("input", {
          value: FriendCallerView.inputVal,
          placeholder: L.placeholder,
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
            const wasCalled = s.history.includes(name);
            const confirming = FriendCallerView.confirmRemove === name;
            return m(".fc-tag", {
              key: name,
              role: "button",
              tabindex: 0,
              "aria-pressed": String(wasCalled),
              title: wasCalled ? "tap to uncheck" : "tap to check off",
              style: `background:${colorFor(name)};opacity:${wasCalled && !confirming ? 0.45 : 1}`,
              onclick: () => {
                FriendCallerView.confirmRemove = null;
                toggleCalled(name, () => m.redraw());
              },
              onkeydown: (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCalled(name, () => m.redraw());
                }
              },
            }, [
              wasCalled && m("span.fc-check", "✓"),
              name,
              confirming
                ? m("span.fc-remove.fc-remove--confirm", {
                    onclick: (e) => {
                      e.stopPropagation();
                      FriendCallerView.confirmRemove = null;
                      removeName(name, () => m.redraw());
                    },
                  }, "remove?")
                : m("span.fc-remove", {
                    "aria-label": `remove ${name}`,
                    onclick: (e) => {
                      e.stopPropagation();
                      FriendCallerView.confirmRemove = name;
                    },
                  }, "✕"),
            ]);
          })
        ),
        m("p.fc-tags-hint", "tap a name to check or uncheck it"),
      ]),
    ]);
  },
};
