import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHOICE_KEY,
  DEFAULT_CHOICE,
  DONE30_KEY,
  SESSION30_COUNT,
  loadChoice,
  loadDone30,
  nextAfter,
  patternForWeek,
  saveChoice,
  sessionKey30,
  setDone30,
} from "./choice.ts";
import { loadProgress, markDone, type Store } from "./progress.ts";

function memory(): Store & { raw: Record<string, string> } {
  const raw: Record<string, string> = {};
  return {
    raw,
    getItem(key) {
      return raw[key] ?? null;
    },
    setItem(key, value) {
      raw[key] = value;
    },
  };
}

describe("plan choice", () => {
  it("starts on the 5×20 plan and remembers a switch to week 4", () => {
    const store = memory();
    assert.deepEqual(loadChoice(store), DEFAULT_CHOICE);
    assert.equal(saveChoice(store, { plan: "3x30", week: 4, day: 3 }), true);
    assert.deepEqual(loadChoice(store), { plan: "3x30", week: 4, day: 3 });
    store.setItem(CHOICE_KEY, "{");
    assert.deepEqual(loadChoice(store), DEFAULT_CHOICE);
  });

  it("reads a saved Week B choice as programme week 2", () => {
    const store = memory();
    store.setItem(CHOICE_KEY, JSON.stringify({ plan: "3x30", week: "B", day: 3 }));
    assert.deepEqual(loadChoice(store), { plan: "3x30", week: 2, day: 3 });
  });

  it("logs a 3×30 day on the 8-week plan without moving the 5×20 progress", () => {
    const store = memory();
    markDone(store, 2, 2);
    const saved = setDone30(store, 3, 1, true);
    assert.deepEqual(saved.completed, ["3-1"]);
    assert.deepEqual(nextAfter(saved.completed, 3, 1), { week: 3, day: 2 });
    assert.deepEqual(nextAfter(["1-1", "1-2", "1-3"], 1, 3), { week: 2, day: 1 });
    assert.deepEqual(nextAfter(["1-1"], 1, 1), { week: 1, day: 2 });
    assert.deepEqual(nextAfter(["8-1", "8-2", "8-3"], 8, 3), null);
    assert.deepEqual(loadDone30(store), ["3-1"]);
    const five = loadProgress(store);
    assert.ok(five.completed.includes("2-2"));
    assert.equal(five.completed.includes("3-1"), false);
    assert.ok(store.raw[DONE30_KEY]?.includes("3-1"));
    setDone30(store, 3, 1, false);
    assert.deepEqual(loadDone30(store), []);
  });

  it("migrates legacy A and B logs onto weeks 1 and 2", () => {
    const store = memory();
    store.setItem(DONE30_KEY, JSON.stringify({ completed: ["A-1", "B-2", "A-1"] }));
    assert.deepEqual(loadDone30(store), ["1-1", "2-2"]);
  });

  it("alternates A and B across eight weeks, 24 sessions in all", () => {
    assert.equal(SESSION30_COUNT, 24);
    assert.equal(patternForWeek(1), "A");
    assert.equal(patternForWeek(2), "B");
    assert.equal(patternForWeek(7), "A");
    assert.equal(patternForWeek(8), "B");
    assert.equal(sessionKey30(8, 3), "8-3");
  });
});
