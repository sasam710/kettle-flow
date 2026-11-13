import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDay } from "./plan.ts";
import {
  SESSION_MS,
  SessionRunner,
  buildTimeline,
  eventsBetween,
  formatClock,
  snapshotAt,
} from "./timer.ts";

const day1 = () => buildTimeline({ week: 1, day: 1, choices: {}, vestOn: true });

describe("formatClock", () => {
  it("counts down in whole seconds", () => {
    assert.equal(formatClock(60_000), "1:00");
    assert.equal(formatClock(59_000), "0:59");
    assert.equal(formatClock(59_001), "1:00");
    assert.equal(formatClock(8_000), "0:08");
    assert.equal(formatClock(1_000), "0:01");
    assert.equal(formatClock(1), "0:01");
    assert.equal(formatClock(0), "0:00");
    assert.equal(formatClock(480_000), "8:00");
  });
});

describe("timeline", () => {
  it("covers exactly 20 minutes for every session", () => {
    for (let week = 1; week <= 8; week += 1) {
      for (let day = 1; day <= 5; day += 1) {
        const timeline = buildTimeline({ week, day, choices: {}, vestOn: true });
        assert.equal(timeline.steps[0].start, 0);
        assert.equal(timeline.steps.at(-1)?.end, SESSION_MS);
        for (let i = 0; i < timeline.steps.length - 1; i += 1) {
          assert.equal(timeline.steps[i].end, timeline.steps[i + 1].start);
        }
        const phases = ["warmup", "blockA", "blockB", "finisher"] as const;
        for (const phase of phases) {
          const steps = timeline.steps.filter((step) => step.phase === phase);
          const span = steps.reduce((sum, step) => sum + (step.end - step.start), 0);
          const expected = phase === "warmup" || phase === "finisher" ? (phase === "warmup" ? 180_000 : 60_000) : 480_000;
          assert.equal(span, expected, `week ${week} day ${day} ${phase}`);
        }
        if (day === 3) {
          assert.equal(timeline.steps.filter((step) => step.mode === "steady").length, 1);
          assert.equal(timeline.steps.filter((step) => step.mode === "amrap").length, 1);
          assert.equal(timeline.circuit.length, 3);
        } else {
          const blockA = timeline.steps.filter((step) => step.phase === "blockA");
          assert.equal(blockA.length, 8);
          assert.equal(blockA.filter((_, index) => index % 2 === 0).every((step) => step.move.name === blockA[0].move.name), true);
          assert.notEqual(blockA[1].move.name, blockA[0].move.name);
        }
      }
    }
  });

  it("defaults each week to the plan column", () => {
    const names = [1, 2, 3, 4, 5, 6, 7, 8].map((week) => {
      const timeline = buildTimeline({ week, day: 1, choices: {}, vestOn: true });
      return snapshotAt(timeline, 180_000).current?.reps;
    });
    assert.equal(names[0], getDay(1).slots[0].versions[0].reps);
    assert.equal(names[2], names[0]);
    assert.equal(names[3], getDay(1).slots[0].versions[1].reps);
    assert.equal(names[4], names[3]);
    assert.equal(names[5], getDay(1).slots[0].versions[2].reps);
    assert.equal(names[7], names[5]);
  });

  it("lets a single exercise use a different version", () => {
    const timeline = buildTimeline({ week: 1, day: 1, choices: { a1: 2 }, vestOn: true });
    assert.equal(snapshotAt(timeline, 180_000).current?.reps, "×12, switch arms each round");
    assert.equal(snapshotAt(timeline, 240_000).current?.name, "Goblet squats");
  });

  it("runs the standard EMOM order", () => {
    const timeline = day1();
    assert.equal(snapshotAt(timeline, 0).current?.name, "Halos");
    assert.equal(snapshotAt(timeline, 60_000).current?.name, "Bodyweight squats");
    assert.equal(snapshotAt(timeline, 120_000).current?.name, "Light swings");
    assert.equal(snapshotAt(timeline, 120_000).next?.name, "Two-hand swings");
    assert.equal(snapshotAt(timeline, 180_000).current?.name, "Two-hand swings");
    assert.equal(snapshotAt(timeline, 180_000).stepRemainingMs, 60_000);
    assert.equal(snapshotAt(timeline, 240_000).current?.name, "Goblet squats");
    assert.equal(snapshotAt(timeline, 240_000).current?.vest, true);
    assert.equal(snapshotAt(timeline, 11 * 60_000).phase, "blockB");
    assert.equal(snapshotAt(timeline, 19 * 60_000).phase, "finisher");
    assert.equal(snapshotAt(timeline, 19 * 60_000).next, null);
    assert.equal(snapshotAt(timeline, SESSION_MS).phase, "done");
    assert.equal(snapshotAt(timeline, SESSION_MS).remainingSessionMs, 0);
  });

  it("turns the vest off without changing the move", () => {
    const on = snapshotAt(day1(), 240_000);
    const off = snapshotAt(buildTimeline({ week: 1, day: 1, choices: {}, vestOn: false }), 240_000);
    assert.equal(on.current?.vest, true);
    assert.equal(off.current?.vest, false);
    assert.equal(off.current?.name, on.current?.name);
    assert.equal(snapshotAt(day1(), 180_000).current?.vest, false);
  });

  it("switches suitcase and one-arm sides on schedule", () => {
    const swings = buildTimeline({ week: 4, day: 1, choices: {}, vestOn: true });
    assert.equal(snapshotAt(swings, 180_000).current?.sideLabel, "Right side");
    assert.equal(snapshotAt(swings, 300_000).current?.mirror, true);
    assert.equal(snapshotAt(swings, 300_000).current?.sideLabel, "Left side");
    const carry = day1();
    assert.equal(snapshotAt(carry, 720_000).current?.name, "Suitcase carry");
    assert.equal(snapshotAt(carry, 720_000).current?.mirror, false);
    assert.equal(snapshotAt(carry, 745_000).current?.mirror, true);
  });

  it("keeps day 3 steady, then an AMRAP circuit", () => {
    const timeline = buildTimeline({ week: 1, day: 3, choices: {}, vestOn: true });
    const blockA = snapshotAt(timeline, 180_000);
    assert.equal(blockA.mode, "steady");
    assert.equal(blockA.current?.name, "Half get-ups");
    assert.equal(blockA.stepRemainingMs, 8 * 60_000);
    assert.equal(snapshotAt(timeline, 180_000 + 7 * 60_000).phase, "blockA");
    const blockB = snapshotAt(timeline, 11 * 60_000, 1);
    assert.equal(blockB.mode, "amrap");
    assert.equal(blockB.current?.name, "Goblet squats");
    assert.equal(blockB.next?.name, "Two-hand swings");
    assert.equal(snapshotAt(timeline, 11 * 60_000, 2).next?.name, "Clean and press");
    const hard = buildTimeline({ week: 8, day: 3, choices: {}, vestOn: true });
    assert.equal(snapshotAt(hard, 180_000).current?.name, "Paused Turkish get-ups");
    assert.equal(snapshotAt(hard, 11 * 60_000).current?.name, "Clean-squat-press");
  });

  it("walks the whole 20 minutes without skipping or sticking", () => {
    for (const day of [1, 3]) {
      const timeline = buildTimeline({ week: 2, day, choices: {}, vestOn: true });
      let phaseIndex = 0;
      const order = ["warmup", "blockA", "blockB", "finisher"];
      for (let ms = 0; ms < SESSION_MS; ms += 1000) {
        const snap = snapshotAt(timeline, ms);
        const index = order.indexOf(snap.phase);
        assert.ok(index >= phaseIndex);
        phaseIndex = index;
        assert.ok(snap.stepRemainingMs > 0);
        assert.ok(snap.stepRemainingMs <= snap.stepDurationMs);
        assert.equal(snap.remainingSessionMs, SESSION_MS - ms);
        assert.ok(snap.current);
      }
      assert.equal(snapshotAt(timeline, SESSION_MS).phase, "done");
    }
  });

  it("rejects a day that is not in the plan", () => {
    assert.throws(() => buildTimeline({ week: 1, day: 6, choices: {}, vestOn: true }));
  });
});

describe("cues and the runner", () => {
  it("beeps every minute, with a block tone at 3, 11 and 19", () => {
    assert.deepEqual(eventsBetween(0, 0), []);
    assert.deepEqual(eventsBetween(54_000, 55_000), ["tick"]);
    assert.deepEqual(eventsBetween(50_000, 54_000), []);
    assert.deepEqual(eventsBetween(58_000, 60_000), ["tick", "minute"]);
    assert.deepEqual(eventsBetween(174_000, 180_000), ["tick", "tick", "tick", "tick", "tick", "block"]);
    assert.deepEqual(eventsBetween(SESSION_MS - 1, SESSION_MS), ["done"]);
  });

  it("warns on the last minute of each block", () => {
    const timeline = day1();
    assert.equal(snapshotAt(timeline, 0).handover, null);
    assert.equal(snapshotAt(timeline, 120_000).handover, "Warm-up is over after this minute.");
    assert.equal(snapshotAt(timeline, 180_000).handover, null);
    assert.equal(snapshotAt(timeline, 600_000).handover, "Block A is over after this minute.");
    assert.equal(snapshotAt(timeline, 1_080_000).handover, "Block B is over after this minute.");
    assert.equal(snapshotAt(timeline, 1_140_000).handover, "The session is over after this minute.");
  });

  it("plays each cue once across a full 20 minutes", () => {
    const timeline = day1();
    let now = 0;
    const runner = new SessionRunner(timeline, () => now);
    runner.start();
    const cues: string[] = [];
    for (let ms = 0; ms <= SESSION_MS; ms += 100) {
      now = ms;
      cues.push(...runner.poll().cues);
    }
    assert.equal(cues.filter((cue) => cue === "tick").length, 100);
    assert.equal(cues.filter((cue) => cue === "minute").length, 16);
    assert.equal(cues.filter((cue) => cue === "block").length, 3);
    assert.equal(cues.filter((cue) => cue === "done").length, 1);
    assert.equal(runner.elapsed(), SESSION_MS);
    assert.equal(runner.running, false);
    assert.equal(runner.poll().cues.length, 0);
  });

  it("pauses, resumes and resets", () => {
    let now = 0;
    const runner = new SessionRunner(day1(), () => now);
    runner.start();
    now = 10_000;
    assert.equal(runner.poll().snapshot.elapsedMs, 10_000);
    runner.pause();
    now = 25_000;
    assert.equal(runner.elapsed(), 10_000);
    runner.start();
    now = 28_000;
    assert.equal(runner.elapsed(), 13_000);
    runner.reset();
    assert.equal(runner.elapsed(), 0);
    assert.equal(runner.running, false);
    assert.equal(runner.snapshot().current?.name, "Halos");
  });
});
