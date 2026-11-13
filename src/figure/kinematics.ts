/** Stick-figure kinematics. Poses are authored as hip, torso angle, and targets. */

export const VIEW_W = 300;
export const VIEW_H = 360;
export const GROUND = 328;

export const TORSO_LEN = 78;
export const UPPER_LEN = 46;
export const FORE_LEN = 42;
export const THIGH_LEN = 78;
export const SHIN_LEN = 74;
export const ARM_MAX = UPPER_LEN + FORE_LEN;
export const LEG_MAX = THIGH_LEN + SHIN_LEN;

/** Side view, facing +x. Puts the knee in front of the hip–foot line. */
export const KNEE_FORWARD = -1 as const;
/** Side view. Puts the elbow behind the shoulder for pulls. */
export const ELBOW_BACK = 1 as const;

export type Vec = [number, number];
export type Bend = 1 | -1;

export type BellStyle = "hang" | "rack" | "overhead" | "goblet" | "hips" | "bottoms";

export type BellSpec = {
  anchor: "L" | "R" | "both" | "hip";
  style: BellStyle;
} | null;

export type BoxSpec = { x: number; w: number; h: number } | null;

export type Pose = {
  view: "side" | "front";
  hip: Vec;
  /** Degrees. Side: 0 upright, positive folds toward +x. Front: lateral bend toward +x. */
  torso: number;
  handL: Vec;
  handR: Vec;
  footL: Vec;
  footR: Vec;
  kneeL: Bend;
  kneeR: Bend;
  elbowL: Bend;
  elbowR: Bend;
  bell: BellSpec;
  box: BoxSpec;
};

export type Pt = { x: number; y: number };

export type Layout = {
  view: "side" | "front";
  hip: Pt;
  hipL: Pt;
  hipR: Pt;
  neck: Pt;
  head: Pt;
  shoulderL: Pt;
  shoulderR: Pt;
  elbowL: Pt;
  elbowR: Pt;
  handL: Pt;
  handR: Pt;
  kneeL: Pt;
  kneeR: Pt;
  footL: Pt;
  footR: Pt;
  stretch: number;
  stretchNote: string;
  bell: BellSpec;
  box: BoxSpec;
};

export function stand(over: Partial<Pose> = {}): Pose {
  return {
    view: "side",
    hip: [150, 178],
    torso: 0,
    handL: [142, 176],
    handR: [162, 176],
    footL: [146, GROUND],
    footR: [162, GROUND],
    kneeL: KNEE_FORWARD,
    kneeR: KNEE_FORWARD,
    elbowL: ELBOW_BACK,
    elbowR: ELBOW_BACK,
    bell: null,
    box: null,
    ...over,
  };
}

export function frontStand(over: Partial<Pose> = {}): Pose {
  return stand({
    view: "front",
    hip: [150, 178],
    footL: [128, GROUND],
    footR: [172, GROUND],
    kneeL: 1,
    kneeR: -1,
    elbowL: -1,
    elbowR: 1,
    ...over,
  });
}

export function upVector(torsoDeg: number): Vec {
  const r = (torsoDeg * Math.PI) / 180;
  return [Math.sin(r), -Math.cos(r)];
}

export function add(v: Vec, d: Vec, scale = 1): Vec {
  return [v[0] + d[0] * scale, v[1] + d[1] * scale];
}

export function bodyPoints(hip: Vec, torsoDeg: number, view: "side" | "front") {
  const r = (torsoDeg * Math.PI) / 180;
  const upX = Math.sin(r);
  const upY = -Math.cos(r);
  const neck: Vec = [hip[0] + upX * TORSO_LEN, hip[1] + upY * TORSO_LEN];
  const head: Vec = [neck[0] + upX * 26, neck[1] + upY * 26];
  const px = Math.cos(r);
  const py = Math.sin(r);
  if (view === "front") {
    return {
      neck,
      head,
      shoulderL: [neck[0] - px * 22, neck[1] - py * 22] as Vec,
      shoulderR: [neck[0] + px * 22, neck[1] + py * 22] as Vec,
      hipL: [hip[0] - px * 12, hip[1] - py * 12] as Vec,
      hipR: [hip[0] + px * 12, hip[1] + py * 12] as Vec,
    };
  }
  return {
    neck,
    head,
    shoulderL: [neck[0] - 6, neck[1] - 2] as Vec,
    shoulderR: [neck[0] + 5, neck[1] + 2] as Vec,
    hipL: [hip[0] - 5, hip[1]] as Vec,
    hipR: [hip[0] + 4, hip[1] + 1] as Vec,
  };
}

export function reach(from: Vec, toward: Vec, max: number, min: number): Vec {
  const dx = toward[0] - from[0];
  const dy = toward[1] - from[1];
  const d = Math.hypot(dx, dy);
  if (d < 0.001) return [from[0], from[1] + (max + min) / 2];
  const clamped = Math.min(max - 1.2, Math.max(min + 1.2, d));
  const s = clamped / d;
  return [from[0] + dx * s, from[1] + dy * s];
}

function solve(
  root: Pt,
  target: Pt,
  len1: number,
  len2: number,
  bend: Bend,
): { mid: Pt; end: Pt; stretch: number } {
  let dx = target.x - root.x;
  let dy = target.y - root.y;
  let dist = Math.hypot(dx, dy);
  const max = len1 + len2;
  const min = Math.abs(len1 - len2);
  let stretch = 0;
  if (dist < 1e-4) {
    dx = max;
    dy = 0;
    dist = max;
    stretch = max;
  } else if (dist > max) {
    stretch = dist - max;
    dx *= max / dist;
    dy *= max / dist;
    dist = max;
  } else if (dist < min) {
    stretch = min - dist;
    dx *= min / dist;
    dy *= min / dist;
    dist = min;
  }
  const angle = Math.atan2(dy, dx);
  const cosA = clamp((len1 * len1 + dist * dist - len2 * len2) / (2 * len1 * dist), -1, 1);
  const a = Math.acos(cosA);
  const midAngle = angle + bend * a;
  return {
    mid: { x: root.x + Math.cos(midAngle) * len1, y: root.y + Math.sin(midAngle) * len1 },
    end: { x: root.x + dx, y: root.y + dy },
    stretch,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function asPt(v: Vec): Pt {
  return { x: v[0], y: v[1] };
}

export function layoutFigure(pose: Pose): Layout {
  const body = bodyPoints(pose.hip, pose.torso, pose.view);
  const armL = solve(asPt(body.shoulderL), asPt(pose.handL), UPPER_LEN, FORE_LEN, pose.elbowL);
  const armR = solve(asPt(body.shoulderR), asPt(pose.handR), UPPER_LEN, FORE_LEN, pose.elbowR);
  const legL = solve(asPt(body.hipL), asPt(pose.footL), THIGH_LEN, SHIN_LEN, pose.kneeL);
  const legR = solve(asPt(body.hipR), asPt(pose.footR), THIGH_LEN, SHIN_LEN, pose.kneeR);
  const stretches: Array<[string, number]> = [
    ["armL", armL.stretch],
    ["armR", armR.stretch],
    ["legL", legL.stretch],
    ["legR", legR.stretch],
  ];
  stretches.sort((a, b) => b[1] - a[1]);
  return {
    view: pose.view,
    hip: asPt(pose.hip),
    hipL: asPt(body.hipL),
    hipR: asPt(body.hipR),
    neck: asPt(body.neck),
    head: asPt(body.head),
    shoulderL: asPt(body.shoulderL),
    shoulderR: asPt(body.shoulderR),
    elbowL: armL.mid,
    elbowR: armR.mid,
    handL: armL.end,
    handR: armR.end,
    kneeL: legL.mid,
    kneeR: legR.mid,
    footL: legL.end,
    footR: legR.end,
    stretch: stretches[0][1],
    stretchNote: stretches[0][0],
    bell: pose.bell,
    box: pose.box,
  };
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

function lerpVec(a: Vec, b: Vec, u: number): Vec {
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
}

export function lerpPose(a: Pose, b: Pose, u: number): Pose {
  const smooth = u * u * (3 - 2 * u);
  const takeA = smooth < 0.35;
  return {
    view: takeA ? a.view : b.view,
    hip: lerpVec(a.hip, b.hip, smooth),
    torso: lerp(a.torso, b.torso, smooth),
    handL: lerpVec(a.handL, b.handL, smooth),
    handR: lerpVec(a.handR, b.handR, smooth),
    footL: lerpVec(a.footL, b.footL, smooth),
    footR: lerpVec(a.footR, b.footR, smooth),
    kneeL: takeA ? a.kneeL : b.kneeL,
    kneeR: takeA ? a.kneeR : b.kneeR,
    elbowL: takeA ? a.elbowL : b.elbowL,
    elbowR: takeA ? a.elbowR : b.elbowR,
    bell: takeA ? a.bell : b.bell,
    box: takeA ? a.box : b.box,
  };
}
