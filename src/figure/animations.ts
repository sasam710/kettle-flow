import { lerpPose, type Pose } from "./kinematics.ts";
import {
  archerPose,
  bridgePose,
  bulgarianPose,
  cleanPose,
  closePushPose,
  cossackPose,
  deadBugPose,
  feetUpPose,
  floorPressPose,
  getupPose,
  haloPose,
  hingePose,
  hollowPose,
  lateralPose,
  lungePose,
  marchPose,
  plankPose,
  plankRowPose,
  pullPose,
  rowPose,
  snatchPose,
  squatPose,
  stepPose,
  swingPose,
  windmillPose,
} from "./library.ts";

export type Animation = {
  /** Loop length in seconds. */
  period: number;
  frames: Array<{ t: number; pose: Pose }>;
};

function cycle(period: number, keys: Array<[number, Pose]>): Animation {
  const frames = keys.map(([t, pose]) => ({ t, pose }));
  const last = frames[frames.length - 1];
  if (!last || frames[0].t !== 0) throw new Error("Animation keys must start at 0");
  // Keep the last authored pose, then close the loop on the start pose.
  if (last.t >= 0.999) last.t = 0.98;
  frames.push({ t: 1, pose: frames[0].pose });
  return { period, frames };
}

function seq(period: number, poses: Pose[], times?: number[]): Animation {
  const keys = poses.map((pose, i) => {
    const t = times ? times[i] : i / poses.length;
    return [t, pose] as [number, Pose];
  });
  if (keys[keys.length - 1][0] >= 0.999) keys[keys.length - 1][0] = 0.98;
  return cycle(period, keys);
}

function haloAnim(): Animation {
  const keys: Array<[number, Pose]> = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) keys.push([i / (steps * 2), haloPose(i / steps)]);
  for (let i = 1; i <= steps; i++) keys.push([0.5 + i / (steps * 2), haloPose(1 - i / steps)]);
  return cycle(4.4, keys);
}

function getupAnim(style: "half" | "full" | "pause"): Animation {
  if (style === "half") {
    return seq(4.2, [getupPose("lie"), getupPose("elbow"), getupPose("sit"), getupPose("elbow")], [0, 0.28, 0.58, 0.86]);
  }
  const stages = [getupPose("lie"), getupPose("elbow"), getupPose("sit"), getupPose("kneel"), getupPose("stand")];
  if (style === "full") return seq(6.2, [...stages, getupPose("kneel"), getupPose("sit"), getupPose("lie")], [0, 0.12, 0.24, 0.38, 0.52, 0.66, 0.78, 0.9]);
  const held: Pose[] = [];
  const times: number[] = [];
  const order = [...stages, getupPose("kneel"), getupPose("sit"), getupPose("lie")];
  order.forEach((pose, i) => {
    const start = i / order.length;
    held.push(pose, pose);
    times.push(start, start + 0.7 / order.length);
  });
  return seq(9.5, held, times);
}

export const ANIMATIONS = {
  halo: haloAnim(),
  "bw-squat": seq(2.2, [squatPose("stand", false), squatPose("bottom", false)]),
  "swing-light": seq(2.15, [swingPose("stand", false, "light"), swingPose("hinge", false, "light"), swingPose("float", false, "light"), swingPose("stand", false, "light")], [0, 0.28, 0.52, 0.82]),
  "swing-two": seq(1.5, [swingPose("stand", false), swingPose("hinge", false), swingPose("float", false), swingPose("stand", false)], [0, 0.26, 0.48, 0.78]),
  "swing-one": seq(1.55, [swingPose("stand", true), swingPose("hinge", true), swingPose("float", true), swingPose("stand", true)], [0, 0.26, 0.48, 0.78]),
  "swing-fast": seq(0.82, [swingPose("stand", false), swingPose("hinge", false), swingPose("float", false), swingPose("stand", false)], [0, 0.24, 0.46, 0.76]),
  "goblet-squat": seq(2.2, [squatPose("stand", true), squatPose("bottom", true)]),
  "goblet-pause": seq(3.5, [squatPose("stand", true), squatPose("bottom", true), squatPose("bottom", true), squatPose("stand", true)], [0, 0.2, 0.72, 1]),
  "goblet-onehalf": seq(2.8, [squatPose("stand", true), squatPose("bottom", true), squatPose("half", true), squatPose("bottom", true), squatPose("stand", true)], [0, 0.2, 0.34, 0.5, 1]),
  "reverse-lunge": seq(2.3, [lungePose("together"), lungePose("step"), lungePose("low"), lungePose("together")], [0, 0.3, 0.5, 0.86]),
  "split-squat": seq(2.2, [lungePose("split-high"), lungePose("split-low")]),
  bulgarian: seq(2.3, [bulgarianPose(false), bulgarianPose(true)]),
  "suitcase-carry": seq(1.3, [marchPose("suitcase", "stand"), marchPose("suitcase", "L"), marchPose("suitcase", "stand"), marchPose("suitcase", "R")]),
  "suitcase-march": seq(1.15, [marchPose("high", "stand"), marchPose("high", "L"), marchPose("high", "stand"), marchPose("high", "R")]),
  "floor-press": seq(2, [floorPressPose(0), floorPressPose(1)]),
  "floor-press-slow": seq(3.3, [floorPressPose(0), floorPressPose(1), floorPressPose(0)], [0, 0.26, 1]),
  "floor-press-onehalf": seq(2.8, [floorPressPose(0), floorPressPose(1), floorPressPose(0.45), floorPressPose(1), floorPressPose(0)], [0, 0.22, 0.36, 0.52, 1]),
  row: seq(2, [rowPose(false), rowPose(true)]),
  "row-slow": seq(3.2, [rowPose(true), rowPose(false), rowPose(true)], [0, 0.72, 1]),
  "plank-row": seq(2.1, [plankRowPose(false), plankRowPose(true)]),
  pushup: seq(1.9, [plankPose(0), plankPose(34)]),
  "pushup-feet": seq(2, [feetUpPose(0), feetUpPose(28)]),
  "pushup-archer": seq(2.2, [archerPose(false), archerPose(true)]),
  "pushup-close": seq(2, [closePushPose(false), closePushPose(true)]),
  "pushup-slow": seq(3.2, [plankPose(32), plankPose(0), plankPose(0)], [0, 0.24, 1]),
  "dead-bug": seq(2.3, [deadBugPose(false), deadBugPose(true)]),
  hollow: seq(2.6, [hollowPose(true), hollowPose(false), hollowPose(true)]),
  plank: seq(2.4, [plankPose(0), plankPose(7), plankPose(0)]),
  "half-getup": getupAnim("half"),
  getup: getupAnim("full"),
  "getup-pause": getupAnim("pause"),
  "clean-press": seq(2.5, [cleanPose("hinge"), cleanPose("rack"), cleanPose("overhead"), cleanPose("rack")], [0, 0.28, 0.5, 0.74]),
  "press-slow": seq(3.4, [cleanPose("rack"), cleanPose("overhead"), cleanPose("rack")], [0, 0.26, 1]),
  "bottoms-up": seq(2.8, [cleanPose("rack", true), cleanPose("overhead", true)]),
  "clean-squat-press": seq(3.2, [cleanPose("hinge"), cleanPose("rack"), cleanPose("squat"), cleanPose("overhead"), cleanPose("rack")], [0, 0.18, 0.38, 0.58, 0.78]),
  "kickstand-rdl": seq(2.3, [hingePose("kick", false), hingePose("kick", true)]),
  "sl-rdl": seq(2.3, [hingePose("single", false), hingePose("single", true)]),
  "sl-rdl-slow": seq(3.5, [hingePose("single", false), hingePose("single", true), hingePose("single", false)], [0, 0.62, 1]),
  "lateral-lunge": seq(2.2, [lateralPose(false), lateralPose(true)]),
  cossack: seq(2.4, [cossackPose(false, false), cossackPose(true, false)]),
  "cossack-goblet": seq(2.4, [cossackPose(false, true), cossackPose(true, true)]),
  "step-up": seq(2.2, [stepPose(false, false, true), stepPose(false, true, true)]),
  "step-up-slow": seq(3.3, [stepPose(false, true, false), stepPose(false, false, false), stepPose(false, true, false)], [0, 0.7, 1]),
  "step-up-high": seq(2.3, [stepPose(true, false, false), stepPose(true, true, false)]),
  "glute-bridge": seq(2.2, [bridgePose(false, false, true), bridgePose(true, false, true)]),
  "sl-bridge": seq(2.3, [bridgePose(false, true, false), bridgePose(true, true, false)]),
  "sl-bridge-bell": seq(2.3, [bridgePose(false, true, true), bridgePose(true, true, true)]),
  "high-pull": seq(1.7, [pullPose(false), pullPose(true)]),
  snatch: seq(1.85, [snatchPose("hinge"), snatchPose("high"), snatchPose("lock"), snatchPose("hinge")], [0, 0.28, 0.48, 0.78]),
  "snatch-fast": seq(1.2, [snatchPose("hinge"), snatchPose("high"), snatchPose("lock"), snatchPose("hinge")], [0, 0.26, 0.46, 0.76]),
  windmill: seq(2.6, [windmillPose(false), windmillPose(true)]),
  "windmill-pause": seq(3.6, [windmillPose(false), windmillPose(true), windmillPose(true), windmillPose(false)], [0, 0.28, 0.7, 1]),
  "rack-carry": seq(1.3, [marchPose("rack", "stand"), marchPose("rack", "L"), marchPose("rack", "stand"), marchPose("rack", "R")]),
  "overhead-carry": seq(1.35, [marchPose("overhead", "stand"), marchPose("overhead", "L"), marchPose("overhead", "stand"), marchPose("overhead", "R")]),
} as const;

export type AnimId = keyof typeof ANIMATIONS;
export const ANIMATION_IDS = Object.keys(ANIMATIONS) as AnimId[];

export function samplePose(anim: Animation, u: number): Pose {
  const frames = anim.frames;
  const clamped = Math.min(0.9999, Math.max(0, u));
  let i = 0;
  while (i < frames.length - 2 && clamped > frames[i + 1].t) i += 1;
  const a = frames[i];
  const b = frames[i + 1];
  const span = b.t - a.t || 1;
  return lerpPose(a.pose, b.pose, (clamped - a.t) / span);
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Pose for a looping clip. `mirror` flips for the second rep when alternating sides. */
export function frameAt(id: AnimId, timeSec: number, alternateReps: boolean): { pose: Pose; mirror: boolean } {
  const anim = ANIMATIONS[id];
  let mirror = false;
  let t = timeSec;
  if (alternateReps) {
    const local = mod(timeSec, anim.period * 2);
    mirror = local >= anim.period;
    t = local % anim.period;
  }
  return { pose: samplePose(anim, mod(t, anim.period) / anim.period), mirror };
}
