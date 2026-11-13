import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ANIMATIONS } from "./figure/animations.ts";
import { getDay } from "./plan.ts";
import { SESSIONS, getProgrammeSession, getSession, hipStretches, movesIn } from "./plan30.ts";
import { VERIFIED_URLS, VERIFIED_VIDEOS } from "./videos.ts";
import {
  SESSION_30_MS,
  SESSION_MS,
  buildTimeline,
  buildTimeline30,
  cuesBetween,
  eventsBetween,
  snapshotAt,
} from "./timer.ts";

const MINUTE = 60_000;
    const blocked: readonly string[] = [VERIFIED_VIDEOS.cossack, VERIFIED_VIDEOS.gobletCossack];

function urls(value: string | null | undefined): string[] {
  return value ? [value] : [];
}

describe("3×30 plan", () => {
  it("has six sessions and leaves the 5×20 cossack progression alone", () => {
    assert.equal(SESSIONS.length, 6);
    assert.equal(getDay(4).slots[1]?.versions[1].name, "Cossack squats");
    assert.equal(buildTimeline({ week: 1, day: 1, choices: {}, vestOn: true }).sessionMs, SESSION_MS);
  });

  it("uses only verified links, and never a cossack", () => {
    for (const session of SESSIONS) {
      for (const item of movesIn(session)) {
        assert.equal(/cossack/i.test(item.name), false, item.name);
        const hrefs = [
          ...urls(item.demo.kind === "link" ? item.demo.href : null),
          ...urls(item.tutorial),
          ...urls(item.example),
        ];
        for (const href of hrefs) {
          assert.ok(VERIFIED_URLS.includes(href), href);
          assert.equal(blocked.includes(href), false);
        }
        if (item.demo.kind === "clip") {
          assert.ok(item.demo.animation in ANIMATIONS);
          assert.equal(item.tutorial === null || item.name === "Snatches", true);
          assert.ok(item.example, `${item.name} is missing an example link`);
        }
        const noExample = /^(Rest|90\/90 hip switches|Half-kneeling hip flexor stretch|Figure-4 glute stretch)$/;
        if (!noExample.test(item.name)) {
          assert.ok(item.example, `${item.name} is missing an example link`);
        }
      }
    }
  });

  it("keeps the vest off presses, get-ups, windmills, overhead carries and bottoms-up work", () => {
    const forbidden = /press|get-up|windmill|waiter|overhead|bottoms-up/i;
    for (const session of SESSIONS) {
      for (const item of movesIn(session)) {
        if (forbidden.test(item.name)) assert.equal(item.vest, false, item.name);
      }
    }
    const monday = getSession("A", 1);
    const squat = monday.slots.find((slot) => slot.id === "a2");
    const rack = getSession("B", 2).slots.find((slot) => slot.id === "finisher");
    assert.equal(squat?.kind === "move" && squat.versions[0].vest, true);
    assert.equal(rack?.kind === "parts" && rack.versions[0][0]?.move.vest, true);
  });

  it("stretches the right hip first for four minutes", () => {
    const hips = hipStretches();
    assert.deepEqual(
      hips.map((item) => [item.move.name, item.move.sideLabel, item.ms]),
      [
        ["Half-kneeling hip flexor stretch", "Right side", 45_000],
        ["Half-kneeling hip flexor stretch", "Left side", 45_000],
        ["Figure-4 glute stretch", "Right side", 45_000],
        ["Figure-4 glute stretch", "Left side", 45_000],
        ["Shallow lateral-lunge hold", "Right side", 30_000],
        ["Shallow lateral-lunge hold", "Left side", 30_000],
      ],
    );
    assert.equal(hips[4]?.move.demo.kind, "link");
    assert.equal(hips[0]?.move.demo.kind, "text");
  });

  it("maps programme weeks 1 to 8 onto Week A and Week B", () => {
    assert.equal(getProgrammeSession(1, 1).title, getSession("A", 1).title);
    assert.equal(getProgrammeSession(2, 3).title, getSession("B", 3).title);
    assert.equal(getProgrammeSession(7, 2).week, "A");
    assert.equal(getProgrammeSession(8, 1).week, "B");
    assert.equal(getProgrammeSession(5, 3).weekday, "Friday");
  });
});

describe("30-minute clock", () => {
  const at = (week: "A" | "B", day: number, choices: Record<string, number> = {}) =>
    buildTimeline30({ week, day, choices, vestOn: true });

  it("runs five segments that add up to 30 minutes", () => {
    for (const week of ["A", "B"] as const) {
      for (const day of [1, 2, 3]) {
        for (const level of [0, 1, 2]) {
          const session = getSession(week, day);
          const choices = Object.fromEntries(session.slots.map((slot) => [slot.id, level]));
          const timeline = buildTimeline30({ week, day, choices, vestOn: true });
          assert.equal(timeline.steps[0]?.start, 0);
          assert.equal(timeline.steps.at(-1)?.end, SESSION_30_MS);
          assert.equal(timeline.legacyGuides, false);
          for (let i = 0; i < timeline.steps.length - 1; i += 1) {
            assert.equal(timeline.steps[i]?.end, timeline.steps[i + 1]?.start);
          }
          const span = (phase: string) =>
            timeline.steps.filter((step) => step.phase === phase).reduce((sum, step) => sum + (step.end - step.start), 0);
          assert.equal(span("warmup"), 4 * MINUTE);
          assert.equal(span("blockA"), 10 * MINUTE);
          assert.equal(span("blockB"), 10 * MINUTE);
          assert.equal(span("finisher"), 2 * MINUTE);
          assert.equal(span("hips"), 4 * MINUTE);
        }
      }
    }
  });

  it("alternates Week A Monday and keeps Friday's two AMRAPs different", () => {
    const monday = at("A", 1);
    assert.equal(snapshotAt(monday, 0).current?.name, "Halos");
    assert.equal(snapshotAt(monday, MINUTE).current?.name, "Slow squats");
    assert.equal(snapshotAt(monday, 2 * MINUTE).current?.name, "Light swings");
    assert.equal(snapshotAt(monday, 3 * MINUTE).current?.name, "90/90 hip switches");
    assert.equal(snapshotAt(monday, 4 * MINUTE).current?.name, "Two-hand swings");
    assert.equal(snapshotAt(monday, 5 * MINUTE).current?.name, "Goblet squats");
    assert.equal(snapshotAt(monday, 5 * MINUTE).current?.vest, true);
    assert.equal(snapshotAt(monday, 13 * MINUTE).current?.name, "Goblet squats");
    assert.equal(snapshotAt(monday, 14 * MINUTE).phase, "blockB");
    assert.equal(snapshotAt(monday, 14 * MINUTE).current?.name, "Reverse lunges");
    assert.equal(snapshotAt(monday, 15 * MINUTE).current?.name, "Clean and press");
    assert.equal(snapshotAt(monday, 15 * MINUTE).current?.vest, false);
    assert.equal(snapshotAt(monday, 24 * MINUTE).phase, "finisher");
    assert.equal(snapshotAt(monday, 26 * MINUTE).phase, "hips");
    assert.equal(snapshotAt(monday, 26 * MINUTE).current?.sideLabel, "Right side");
    assert.equal(snapshotAt(monday, 26 * MINUTE + 45_000).current?.sideLabel, "Left side");
    assert.equal(snapshotAt(monday, SESSION_30_MS).phase, "done");
    assert.equal(snapshotAt(monday, SESSION_30_MS).coach, "That's 30 minutes.");
    assert.match(snapshotAt(at("A", 2), 0).current?.reps ?? "", /wrist circles/);
    assert.doesNotMatch(snapshotAt(monday, 0).current?.reps ?? "", /wrist/);

    const bare = snapshotAt(buildTimeline30({ week: "A", day: 1, choices: {}, vestOn: false }), 5 * MINUTE);
    assert.equal(bare.current?.vest, false);
    assert.equal(bare.current?.name, "Goblet squats");
  });

  it("uses steady get-ups on Week A Friday and a different AMRAP on Week B Friday", () => {
    const fridayA = at("A", 3);
    assert.equal(snapshotAt(fridayA, 4 * MINUTE).mode, "steady");
    assert.equal(snapshotAt(fridayA, 4 * MINUTE).current?.name, "Half get-ups");
    assert.equal(snapshotAt(fridayA, 4 * MINUTE).stepRemainingMs, 10 * MINUTE);
    const roundA = snapshotAt(fridayA, 14 * MINUTE, 0);
    assert.equal(roundA.mode, "amrap");
    assert.equal(fridayA.circuit.map((move) => move.name).join(", "), "Clean and press, Goblet squats, Push-ups, Two-hand swings");
    assert.equal(snapshotAt(fridayA, 14 * MINUTE, 2).current?.name, "Push-ups");

    const fridayB = at("B", 3);
    assert.equal(snapshotAt(fridayB, 4 * MINUTE).mode, "emom");
    assert.equal(snapshotAt(fridayB, 4 * MINUTE).current?.name, "One-arm row");
    assert.equal(snapshotAt(fridayB, 5 * MINUTE).current?.name, "Push-ups");
    assert.equal(fridayB.circuit.map((move) => move.name).join(", "), "Goblet squats, Two-hand swings, Suitcase carry");
    assert.notEqual(fridayA.circuit.map((move) => move.name).join(), fridayB.circuit.map((move) => move.name).join());
    assert.equal(snapshotAt(fridayB, 14 * MINUTE, 2, 0).current?.sideLabel, "Right side");
    assert.equal(snapshotAt(fridayB, 14 * MINUTE, 2, 1).current?.sideLabel, "Left side");
    assert.match(snapshotAt(fridayB, 24 * MINUTE).current?.name ?? "", /Waiter carry/);
    assert.equal(snapshotAt(fridayB, 24 * MINUTE).current?.vest, false);
  });

  it("moves up a level without turning lateral lunges into cossacks", () => {
    const harder = at("A", 1, { a1: 1, b2: 2 });
    assert.equal(snapshotAt(harder, 4 * MINUTE).current?.name, "One-arm swings");
    assert.equal(snapshotAt(harder, 15 * MINUTE).current?.name, "Bottoms-up press");
    const laterals = at("B", 1, { a2: 2 });
    assert.equal(snapshotAt(laterals, 5 * MINUTE).current?.name, "Lateral lunges");
    assert.match(snapshotAt(laterals, 5 * MINUTE).current?.reps ?? "", /3-second pause/);
    const snatch = at("B", 2, { a2: 1 });
    assert.equal(snapshotAt(snatch, 5 * MINUTE).current?.name, "Snatches");
    assert.ok(snapshotAt(snatch, 5 * MINUTE).current?.tutorial);
    const getups = at("A", 3, { blockA: 2 });
    assert.equal(snapshotAt(getups, 4 * MINUTE).current?.name, "Turkish get-ups");
    assert.match(snapshotAt(getups, 4 * MINUTE).current?.reps ?? "", /3-second pause/);
  });

  it("beeps the minutes and the block changes, including the hip-stretch turns", () => {
    const timeline = at("A", 1);
    assert.deepEqual(cuesBetween(timeline, 4 * MINUTE - 1, 4 * MINUTE), ["block"]);
    assert.deepEqual(cuesBetween(timeline, 14 * MINUTE - 1, 14 * MINUTE), ["block"]);
    assert.deepEqual(cuesBetween(timeline, 24 * MINUTE - 1, 24 * MINUTE), ["block"]);
    assert.deepEqual(cuesBetween(timeline, 26 * MINUTE - 1, 26 * MINUTE), ["block"]);
    assert.deepEqual(cuesBetween(timeline, SESSION_30_MS - 1, SESSION_30_MS), ["done"]);
    assert.deepEqual(cuesBetween(timeline, 5 * MINUTE - 1, 5 * MINUTE), ["minute"]);
    assert.deepEqual(cuesBetween(timeline, 26 * MINUTE + 45_000 - 1, 26 * MINUTE + 45_000), ["minute"]);
    const twenty = buildTimeline({ week: 1, day: 1, choices: {}, vestOn: true });
    assert.deepEqual(cuesBetween(twenty, 0, SESSION_MS), eventsBetween(0, SESSION_MS));
    assert.deepEqual(cuesBetween(twenty, 174_000, 180_000), eventsBetween(174_000, 180_000));
  });

  it("warns before the hip stretches, not at the end of the finisher as if the session were over", () => {
    const timeline = at("A", 1);
    assert.equal(snapshotAt(timeline, 3 * MINUTE).handover, "Warm-up is over after this minute.");
    assert.equal(snapshotAt(timeline, 13 * MINUTE).handover, "Block A is over after this minute.");
    assert.equal(snapshotAt(timeline, 23 * MINUTE).handover, "Block B is over after this minute.");
    assert.equal(snapshotAt(timeline, 25 * MINUTE).handover, "The finisher is over after this minute.");
    assert.equal(snapshotAt(timeline, 29 * MINUTE).handover, "The session is over after this minute.");
    const twenty = buildTimeline({ week: 1, day: 1, choices: {}, vestOn: true });
    assert.equal(snapshotAt(twenty, 19 * MINUTE).handover, "The session is over after this minute.");
  });
});
