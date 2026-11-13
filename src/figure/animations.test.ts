import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ANIMATION_IDS, ANIMATIONS, samplePose, type AnimId } from "./animations.ts";
import { GROUND, VIEW_H, VIEW_W, layoutFigure, type Pose } from "./kinematics.ts";
import { DAYS, WARMUP } from "../plan.ts";

function samples(id: AnimId, count = 24): Pose[] {
  const anim = ANIMATIONS[id];
  return Array.from({ length: count }, (_, index) => samplePose(anim, index / count));
}

function maxOf(id: AnimId, read: (pose: Pose) => number, count = 24): number {
  return Math.max(...samples(id, count).map(read));
}

function minOf(id: AnimId, read: (pose: Pose) => number, count = 24): number {
  return Math.min(...samples(id, count).map(read));
}

describe("animation catalogue", () => {
  it("has a loop for every plan exercise and nothing unused", () => {
    const used = new Set<string>();
    for (const move of WARMUP) used.add(move.animation);
    for (const day of DAYS) {
      for (const slot of day.slots) {
        assert.equal(slot.versions.length, 3);
        for (const version of slot.versions) used.add(version.animation);
      }
    }
    assert.deepEqual([...used].sort(), [...ANIMATION_IDS].sort());
  });

  it("loops cleanly and stays on the skeleton", () => {
    const problems: string[] = [];
    for (const id of ANIMATION_IDS) {
      const anim = ANIMATIONS[id];
      assert.ok(anim.period > 0.6 && anim.period < 12, id);
      assert.equal(anim.frames[0].t, 0, id);
      assert.equal(anim.frames.at(-1)?.t, 1, id);
      for (let i = 1; i < anim.frames.length; i += 1) {
        if (!(anim.frames[i].t > anim.frames[i - 1].t)) problems.push(`${id} time ${anim.frames[i].t}`);
      }
      const start = samplePose(anim, 0);
      const end = samplePose(anim, 0.999);
      const seam = Math.hypot(start.hip[0] - end.hip[0], start.hip[1] - end.hip[1]);
      if (seam > 24) problems.push(`${id} seam ${seam.toFixed(1)}`);
      for (const pose of samples(id, 12)) {
        const layout = layoutFigure(pose);
        if (layout.stretch > 8) problems.push(`${id} ${layout.stretchNote} ${layout.stretch.toFixed(1)}`);
        const points = [layout.head, layout.handL, layout.handR, layout.footL, layout.footR, layout.kneeL, layout.kneeR, layout.hip];
        for (const point of points) {
          if (point.x < -24 || point.x > VIEW_W + 24 || point.y < -16 || point.y > VIEW_H + 8) {
            problems.push(`${id} offscreen ${point.x.toFixed(0)},${point.y.toFixed(0)}`);
          }
        }
        if (layout.kneeL.y > GROUND + 8 || layout.kneeR.y > GROUND + 8) problems.push(`${id} knee through floor`);
        if (layout.handL.y > GROUND + 8 || layout.handR.y > GROUND + 8) problems.push(`${id} hand through floor`);
      }
    }
    assert.deepEqual(problems, [], problems.join("\n"));
  });

  it("reads as the move it is meant to be", () => {
    const torso = (id: AnimId) => maxOf(id, (pose) => pose.torso);
    const handY = (id: AnimId) => samples(id).map((pose) => layoutFigure(pose).handR.y);
    assert.ok(torso("swing-two") > 55);
    assert.ok(torso("swing-two") > torso("swing-light") + 15);
    assert.ok(Math.min(...handY("swing-two")) < Math.max(...handY("swing-two")) - 50);
    assert.ok(maxOf("goblet-squat", (pose) => pose.hip[1]) - samples("goblet-squat")[0].hip[1] > 40);

    const pauseYs = samples("goblet-pause", 40).map((pose) => pose.hip[1]);
    const deep = Math.max(...pauseYs);
    assert.ok(pauseYs.filter((y) => y > deep - 4).length > 8);

    const dips = (id: AnimId) => {
      const ys = samples(id, 48).map((pose) => pose.hip[1]);
      let count = 0;
      for (let i = 1; i < ys.length - 1; i += 1) {
        if (ys[i] >= ys[i - 1] && ys[i] > ys[i + 1] && ys[i] > ys[0] + 25) count += 1;
      }
      return count;
    };
    assert.equal(dips("goblet-squat"), 1);
    assert.ok(dips("goblet-onehalf") >= 2);

    const spread = (id: AnimId) => samples(id).map((pose) => Math.abs(pose.footL[0] - pose.footR[0]));
    assert.ok(Math.max(...spread("reverse-lunge")) > 70);
    assert.ok(Math.min(...spread("reverse-lunge")) < 40);
    assert.ok(Math.min(...spread("split-squat")) > 60);
    const footGap = samples("bulgarian").map((pose) => Math.abs(pose.footL[1] - pose.footR[1]));
    assert.ok(Math.min(...footGap) > 40);

    const lifted = samples("suitcase-carry").flatMap((pose) => [pose.footL[1], pose.footR[1]]);
    assert.ok(Math.min(...lifted) < GROUND - 30);

    assert.ok(Math.min(...samples("floor-press").map((pose) => pose.torso)) < -70);
    assert.ok(Math.max(...handY("floor-press")) - Math.min(...handY("floor-press")) > 40);
    assert.ok(torso("row") > 50);
    assert.ok(Math.max(...handY("row")) - Math.min(...handY("row")) > 25);
    assert.ok(maxOf("pushup", (pose) => pose.hip[1]) - minOf("pushup", (pose) => pose.hip[1]) > 20);
    assert.ok(minOf("plank", (pose) => pose.torso) > 70);

    const lowerFoot = (id: AnimId) => Math.max(...samples(id).map((pose) => Math.max(pose.footL[1], pose.footR[1])));
    assert.ok(lowerFoot("pushup") > lowerFoot("pushup-feet") + 20);

    const support = (id: AnimId) => Math.min(...samples(id).map((pose) => Math.max(pose.footL[1], pose.footR[1])));
    assert.ok(support("step-up-high") < support("step-up") - 20);

    assert.equal(samples("cossack")[0].bell, null);
    assert.ok(samples("cossack-goblet").some((pose) => pose.bell));
    assert.ok(samples("glute-bridge").some((pose) => pose.bell?.anchor === "hip"));
    assert.ok(samples("sl-bridge").every((pose) => pose.bell === null));
    assert.ok(samples("bottoms-up").some((pose) => pose.bell?.style === "bottoms"));

    const halo = samples("halo", 32);
    const xs = halo.map((pose) => pose.handR[0]);
    const ys = halo.map((pose) => pose.handR[1]);
    assert.ok(Math.max(...xs) - Math.min(...xs) > 40);
    assert.ok(Math.max(...ys) - Math.min(...ys) > 40);
    assert.equal(halo[0].view, "front");

    assert.ok(minOf("half-getup", (pose) => pose.torso) < -60);
    assert.ok(maxOf("half-getup", (pose) => pose.torso) < -20);
    assert.ok(maxOf("getup", (pose) => pose.torso) > -15);
    assert.ok(ANIMATIONS["getup-pause"].period > ANIMATIONS.getup.period);

    const highest = (id: AnimId) => Math.min(...handY(id));
    assert.ok(highest("snatch") < highest("high-pull") - 25);

    const bridges = samples("glute-bridge").map(layoutFigure);
    assert.ok(Math.max(...bridges.map((layout) => layout.shoulderR.y - layout.hip.y)) > 30);

    const mills = samples("windmill");
    assert.equal(mills[0].view, "front");
    assert.ok(maxOf("windmill", (pose) => Math.abs(pose.torso)) > 20);
    assert.ok(Math.max(...mills.map((pose) => Math.abs(pose.handL[1] - pose.handR[1]))) > 80);

    assert.ok(minOf("dead-bug", (pose) => pose.torso) < -70);
    assert.ok(ANIMATIONS["swing-fast"].period < ANIMATIONS["swing-two"].period);
    assert.ok(ANIMATIONS["floor-press-slow"].period > ANIMATIONS["floor-press"].period);
    assert.ok(ANIMATIONS["sl-rdl-slow"].period > ANIMATIONS["sl-rdl"].period);
    assert.ok(ANIMATIONS["snatch-fast"].period < ANIMATIONS.snatch.period);
  });
});
