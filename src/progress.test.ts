import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PROGRESS_KEY,
  SEED_COMPLETED,
  loadProgress,
  markDone,
  nextSession,
  setSessionDone,
  type Store,
} from "./progress.ts";

function memory(): Store & { raw: string | null } {
  const box = { raw: null as string | null };
  return {
    get raw() {
      return box.raw;
    },
    set raw(value: string | null) {
      box.raw = value;
    },
    getItem() {
      return box.raw;
    },
    setItem(_key: string, value: string) {
      box.raw = value;
    },
  };
}

describe("progress", () => {
  it("starts with Week 2 Day 2 next", () => {
    const store = memory();
    const progress = loadProgress(store);
    assert.deepEqual(progress.completed, SEED_COMPLETED);
    assert.deepEqual(nextSession(progress), { week: 2, day: 2 });
    assert.equal(store.raw, null);
  });

  it("advances from the furthest session, not the first gap", () => {
    const store = memory();
    markDone(store, 2, 2);
    assert.deepEqual(nextSession(loadProgress(store)), { week: 2, day: 3 });
    markDone(store, 1, 4);
    assert.deepEqual(nextSession(loadProgress(store)), { week: 2, day: 3 });
    assert.ok(loadProgress(store).completed.includes("1-1"));
    assert.ok(loadProgress(store).completed.includes("1-4"));
    markDone(store, 2, 5);
    assert.deepEqual(nextSession(loadProgress(store)), { week: 3, day: 1 });
  });

  it("can switch a session back to to-do", () => {
    const store = memory();
    setSessionDone(store, 2, 1, false);
    const progress = loadProgress(store);
    assert.equal(progress.completed.includes("2-1"), false);
    assert.equal(progress.completed.includes("1-3"), true);
    assert.deepEqual(nextSession(progress), { week: 1, day: 4 });
    setSessionDone(store, 2, 1, true);
    assert.deepEqual(nextSession(loadProgress(store)), { week: 2, day: 2 });
  });

  it("finishes the programme on Week 8 Day 5", () => {
    const store = memory();
    markDone(store, 8, 5);
    assert.equal(nextSession(loadProgress(store)), null);
  });

  it("ignores corrupt and unknown entries", () => {
    const store = memory();
    store.setItem(PROGRESS_KEY, "{");
    assert.deepEqual(loadProgress(store).completed, SEED_COMPLETED);
    store.setItem(PROGRESS_KEY, JSON.stringify({ completed: [] }));
    assert.deepEqual(nextSession(loadProgress(store)), { week: 1, day: 1 });
    store.setItem(PROGRESS_KEY, JSON.stringify({ completed: ["2-1", "nope", "9-1"] }));
    assert.deepEqual(nextSession(loadProgress(store)), { week: 2, day: 2 });
  });
});
