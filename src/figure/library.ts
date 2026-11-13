import {
  ARM_MAX,
  GROUND,
  add,
  bodyPoints,
  frontStand,
  reach,
  stand,
  upVector,
  type BellStyle,
  type Pose,
  type Vec,
} from "./kinematics.ts";

export type Grip = "two" | "right";
export type Where =
  | "hang"
  | "chest"
  | "overhead"
  | "low-back"
  | "float"
  | "rack"
  | "forward"
  | "floor";

function aimOf(p: Pose, where: Where): Vec {
  const b = bodyPoints(p.hip, p.torso, p.view);
  const up = upVector(p.torso);
  const rad = (p.torso * Math.PI) / 180;
  const fwd: Vec = [Math.cos(rad), Math.sin(rad)];
  if (where === "hang") return add(b.neck, up, -120);
  if (where === "chest") return add(add(b.neck, fwd, 34), up, -18);
  if (where === "overhead") return add(add(b.neck, up, 130), fwd, 16);
  if (where === "low-back") return [p.hip[0] - 96, p.hip[1] + 46];
  if (where === "float") return add(b.neck, fwd, 140);
  if (where === "rack") return add(add(b.neck, fwd, 28), up, -8);
  if (where === "forward") return add(add(b.neck, fwd, 64), up, -8);
  return [b.neck[0], GROUND];
}

export function armsAt(p: Pose, aimL: Vec, aimR: Vec, style: BellStyle | null, grip: Grip): Pose {
  const b = bodyPoints(p.hip, p.torso, p.view);
  const handR = reach(b.shoulderR, aimR, ARM_MAX, 12);
  const handL =
    grip === "right"
      ? reach(b.shoulderL, add(b.shoulderL, upVector(p.torso), -110), ARM_MAX, 12)
      : reach(b.shoulderL, aimL, ARM_MAX, 12);
  const bell =
    style === null
      ? null
      : grip === "right"
        ? { anchor: "R" as const, style }
        : { anchor: "both" as const, style };
  return { ...p, handL, handR, bell };
}

export function arms(p: Pose, where: Where, grip: Grip, style: BellStyle | null): Pose {
  if (where === "floor") {
    const b = bodyPoints(p.hip, p.torso, p.view);
    return armsAt(
      p,
      [b.shoulderL[0], GROUND],
      [b.shoulderR[0], GROUND],
      null,
      "two",
    );
  }
  const aim = aimOf(p, where);
  return armsAt(p, aim, aim, style, grip);
}

function swingBody(depth: "stand" | "hinge" | "float", size: "full" | "light"): Pose {
  if (depth === "stand") return stand();
  if (depth === "hinge") {
    return stand({
      hip: [118, size === "light" ? 196 : 208],
      torso: size === "light" ? 40 : 74,
      footL: [146, GROUND],
      footR: [170, GROUND],
    });
  }
  return stand({
    hip: [156, size === "light" ? 180 : 174],
    torso: size === "light" ? 4 : -8,
    footL: [146, GROUND],
    footR: [168, GROUND],
  });
}

export function swingPose(depth: "stand" | "hinge" | "float", oneArm: boolean, size: "full" | "light" = "full"): Pose {
  const where = depth === "hinge" ? "low-back" : depth === "float" ? (size === "light" ? "forward" : "float") : "hang";
  return arms(swingBody(depth, size), where, oneArm ? "right" : "two", "hang");
}

export function squatPose(depth: "stand" | "half" | "bottom", bell: boolean): Pose {
  const hipY = depth === "stand" ? 182 : depth === "half" ? 216 : 252;
  const p = stand({
    hip: [depth === "stand" ? 150 : 158, hipY],
    torso: depth === "stand" ? 6 : depth === "half" ? 14 : 24,
  });
  return arms(p, bell ? "chest" : "forward", "two", bell ? "goblet" : null);
}

export function lungePose(kind: "together" | "step" | "low" | "split-high" | "split-low"): Pose {
  if (kind === "together") return arms(stand({ torso: 4 }), "hang", "two", null);
  if (kind === "step" || kind === "low") {
    const p = stand({
      hip: [128, kind === "low" ? 246 : 214],
      torso: 10,
      footL: [72, GROUND],
      footR: [176, GROUND],
    });
    return arms(p, "hang", "two", null);
  }
  const p = stand({
    hip: [136, kind === "split-low" ? 248 : 204],
    torso: 8,
    footL: [78, GROUND],
    footR: [188, GROUND],
  });
  return arms(p, "chest", "two", "goblet");
}

const REAR_BOX = { x: 28, w: 78, h: 54 };

export function bulgarianPose(low: boolean): Pose {
  const p = stand({
    hip: [158, low ? 252 : 196],
    torso: low ? 16 : 8,
    footL: [62, GROUND - REAR_BOX.h],
    footR: [196, GROUND],
    box: REAR_BOX,
  });
  return arms(p, "chest", "two", "goblet");
}

export function marchPose(style: "suitcase" | "high" | "rack" | "overhead", phase: "L" | "R" | "stand"): Pose {
  const lift = style === "high" ? 118 : 52;
  const footL: Vec = [140, phase === "L" ? GROUND - lift : GROUND];
  const footR: Vec = [172, phase === "R" ? GROUND - lift : GROUND];
  if (phase === "L") footL[0] = 156;
  if (phase === "R") footR[0] = 186;
  const p = stand({
    hip: [154, 188],
    torso: phase === "L" ? -5 : phase === "R" ? 5 : 0,
    footL,
    footR,
  });
  if (style === "rack") return arms(p, "rack", "right", "rack");
  if (style === "overhead") return arms(p, "overhead", "right", "overhead");
  return arms(p, "hang", "right", "hang");
}

export function plankPose(drop: number): Pose {
  const y = 236 + drop;
  const p = stand({
    hip: [146, y],
    torso: 88,
    footL: [36, GROUND],
    footR: [54, GROUND],
    kneeL: 1,
    kneeR: 1,
  });
  return arms(p, "floor", "two", null);
}

const FEET_BOX = { x: 20, w: 84, h: 48 };

export function feetUpPose(drop: number): Pose {
  const p = stand({
    hip: [154, 208 + drop],
    torso: 108,
    footL: [46, GROUND - FEET_BOX.h],
    footR: [64, GROUND - FEET_BOX.h],
    box: FEET_BOX,
    kneeL: 1,
    kneeR: 1,
  });
  return arms(p, "floor", "two", null);
}

export function archerPose(down: boolean): Pose {
  const base = plankPose(down ? 16 : 0);
  const b = bodyPoints(base.hip, base.torso, "side");
  const straight = reach(b.shoulderR, [b.neck[0] + 78, b.neck[1] + 8], ARM_MAX, 12);
  const bent = reach(b.shoulderL, [b.neck[0] - 8, GROUND - (down ? 4 : 62)], ARM_MAX, 12);
  return { ...base, handL: bent, handR: straight, bell: null };
}

export function closePushPose(down: boolean): Pose {
  const base = plankPose(down ? 28 : 0);
  const b = bodyPoints(base.hip, base.torso, "side");
  const aim: Vec = [b.neck[0] - 20, GROUND - (down ? 2 : 58)];
  return armsAt(base, aim, [aim[0] + 8, aim[1]], null, "two");
}

export function floorPressPose(level: number): Pose {
  const p = stand({
    hip: [176, 310],
    torso: -90,
    footL: [240, GROUND],
    footR: [258, GROUND],
  });
  const b = bodyPoints(p.hip, p.torso, "side");
  const low: Vec = [b.neck[0] + 26, b.neck[1] - 28];
  const high: Vec = [b.neck[0] + 4, b.neck[1] - 130];
  const aim: Vec = [low[0] + (high[0] - low[0]) * level, low[1] + (high[1] - low[1]) * level];
  const brace: Vec = [b.neck[0] + 36, GROUND - 6];
  return { ...armsAt(p, brace, aim, "overhead", "right"), bell: { anchor: "R", style: level > 0.55 ? "overhead" : "rack" } };
}

export function rowPose(pulled: boolean): Pose {
  const p = stand({
    hip: [128, 204],
    torso: 70,
    footL: [150, GROUND],
    footR: [174, GROUND],
  });
  const b = bodyPoints(p.hip, p.torso, "side");
  const brace = reach(b.shoulderL, [b.neck[0] + 8, GROUND - 36], ARM_MAX, 12);
  const long = reach(b.shoulderR, [p.hip[0] - 30, p.hip[1] + 64], ARM_MAX, 12);
  const short = reach(b.shoulderR, [p.hip[0] + 4, p.hip[1] - 8], ARM_MAX, 12);
  return { ...p, handL: brace, handR: pulled ? short : long, bell: { anchor: "R", style: "hang" } };
}

export function plankRowPose(pulled: boolean): Pose {
  const base = plankPose(pulled ? 8 : 0);
  const b = bodyPoints(base.hip, base.torso, "side");
  const support = reach(b.shoulderL, [b.shoulderL[0], GROUND], ARM_MAX, 12);
  const hand = reach(b.shoulderR, pulled ? [base.hip[0] + 10, base.hip[1] - 6] : [b.shoulderR[0] + 8, GROUND - 8], ARM_MAX, 12);
  return { ...base, handL: support, handR: hand, bell: { anchor: "R", style: "hang" } };
}

export function deadBugPose(extended: boolean): Pose {
  const p = stand({
    hip: [168, 312],
    torso: -90,
    footL: extended ? [214, 196] : [210, 270],
    footR: [248, GROUND],
    elbowL: -1,
  });
  const b = bodyPoints(p.hip, p.torso, "side");
  const up = reach(b.shoulderR, extended ? [b.neck[0] - 10, b.neck[1] - 130] : [b.neck[0] + 20, b.neck[1] - 36], ARM_MAX, 12);
  const down = reach(b.shoulderL, [b.neck[0] + 30, GROUND - 4], ARM_MAX, 12);
  return { ...p, handL: down, handR: up, bell: { anchor: "R", style: "overhead" } };
}

export function hollowPose(open: boolean): Pose {
  const p = stand({
    hip: [178, open ? 304 : 296],
    torso: open ? -78 : -64,
    footL: [248, open ? 300 : 276],
    footR: [268, open ? 292 : 268],
  });
  return arms(p, "overhead", "two", null);
}

export function haloPose(turns: number): Pose {
  const p = frontStand();
  const theta = turns * Math.PI * 2 - Math.PI / 2;
  const aim: Vec = [150 + Math.cos(theta) * 46, 66 + Math.sin(theta) * 46];
  return armsAt(p, aim, aim, "hang", "two");
}

export function getupPose(stage: "lie" | "elbow" | "sit" | "kneel" | "stand"): Pose {
  if (stage === "lie") {
    const p = stand({
      hip: [168, 312],
      torso: -90,
      footL: [236, GROUND],
      footR: [258, GROUND],
      elbowL: -1,
    });
    const b = bodyPoints(p.hip, p.torso, "side");
    const up = reach(b.shoulderR, [b.neck[0], b.neck[1] - 140], ARM_MAX, 12);
    const floor = reach(b.shoulderL, [b.neck[0] + 46, GROUND - 2], ARM_MAX, 12);
    return { ...p, handL: floor, handR: up, bell: { anchor: "R", style: "overhead" } };
  }
  if (stage === "elbow") {
    const p = stand({
      hip: [164, 308],
      torso: -68,
      footL: [230, GROUND],
      footR: [252, GROUND],
    });
    const b = bodyPoints(p.hip, p.torso, "side");
    const up = reach(b.shoulderR, [b.shoulderR[0] + 6, b.shoulderR[1] - 140], ARM_MAX, 12);
    const prop = reach(b.shoulderL, [b.neck[0] - 10, GROUND - 2], ARM_MAX, 12);
    return { ...p, handL: prop, handR: up, bell: { anchor: "R", style: "overhead" } };
  }
  if (stage === "sit") {
    const p = stand({
      hip: [160, 304],
      torso: -40,
      footL: [228, GROUND],
      footR: [250, GROUND],
    });
    const b = bodyPoints(p.hip, p.torso, "side");
    const up = reach(b.shoulderR, [b.shoulderR[0] + 4, b.shoulderR[1] - 150], ARM_MAX, 12);
    const prop = reach(b.shoulderL, [b.neck[0] - 36, GROUND], ARM_MAX, 12);
    return { ...p, handL: prop, handR: up, bell: { anchor: "R", style: "overhead" } };
  }
  if (stage === "kneel") {
    const p = stand({
      hip: [156, 228],
      torso: -6,
      footL: [118, GROUND],
      footR: [214, GROUND],
    });
    return arms(p, "overhead", "right", "overhead");
  }
  return arms(stand({ torso: -2 }), "overhead", "right", "overhead");
}

export function cleanPose(
  stage: "hinge" | "rack" | "squat" | "overhead",
  bottoms = false,
): Pose {
  const style = bottoms ? "bottoms" : stage === "hinge" ? "hang" : stage === "overhead" ? "overhead" : "rack";
  if (stage === "hinge") {
    const p = stand({
      hip: [122, 206],
      torso: 70,
      footL: [148, GROUND],
      footR: [172, GROUND],
    });
    return arms(p, "low-back", "right", "hang");
  }
  if (stage === "squat") {
    const p = stand({ hip: [156, 248], torso: 20 });
    return arms(p, "rack", "right", bottoms ? "bottoms" : "rack");
  }
  if (stage === "overhead") return arms(stand({ torso: -3 }), "overhead", "right", bottoms ? "bottoms" : "overhead");
  return arms(stand({ torso: 2 }), "rack", "right", style);
}

export function hingePose(style: "kick" | "single", deep: boolean): Pose {
  if (style === "kick") {
    const p = stand({
      hip: [140, deep ? 204 : 188],
      torso: deep ? 58 : 32,
      footL: [108, GROUND],
      footR: [170, GROUND],
    });
    return arms(p, deep ? "low-back" : "hang", "right", "hang");
  }
  const p = stand({
    hip: [150, deep ? 196 : 184],
    torso: deep ? 72 : 26,
    footL: deep ? [42, 208] : [116, 246],
    footR: [170, GROUND],
  });
  return arms(p, deep ? "low-back" : "hang", "right", "hang");
}

export function lateralPose(out: boolean): Pose {
  if (!out) return arms(frontStand(), "forward", "two", null);
  const p = frontStand({
    hip: [198, 256],
    torso: 12,
    footL: [84, GROUND],
    footR: [248, GROUND],
  });
  return arms(p, "forward", "two", null);
}

export function cossackPose(down: boolean, goblet: boolean): Pose {
  const p = down
    ? frontStand({
        hip: [214, 284],
        torso: 4,
        footL: [82, GROUND],
        footR: [254, GROUND],
      })
    : frontStand();
  if (goblet) return arms(p, "chest", "two", "goblet");
  return arms(p, down ? "forward" : "hang", "two", null);
}

export function stepPose(high: boolean, up: boolean, goblet: boolean): Pose {
  const boxH = high ? 86 : 50;
  const top = GROUND - boxH;
  const footR: Vec = [210, top];
  const footL: Vec = up ? [176, top - (high ? 8 : 34)] : [116, GROUND];
  const hipY = up ? (high ? 158 : 152) : high ? 198 : 208;
  const p = stand({
    hip: [up ? 200 : 166, hipY],
    torso: 6,
    footL,
    footR,
    box: { x: 166, w: 86, h: boxH },
  });
  return arms(p, goblet ? "chest" : "hang", "two", goblet ? "goblet" : null);
}

export function bridgePose(up: boolean, single: boolean, bell: boolean): Pose {
  if (!up) {
    const p = stand({
      hip: [176, 312],
      torso: -88,
      footL: [230, GROUND],
      footR: [252, GROUND],
    });
    const flat = arms(p, "hang", "two", null);
    return bell ? { ...flat, bell: { anchor: "hip", style: "hips" } } : flat;
  }
  const p = stand({
    hip: [182, 246],
    torso: -132,
    footL: single ? [206, 188] : [224, GROUND],
    footR: [248, GROUND],
  });
  const b = bodyPoints(p.hip, p.torso, "side");
  const handL = reach(b.shoulderL, [b.neck[0] - 20, GROUND - 2], ARM_MAX, 12);
  const handR = reach(b.shoulderR, [b.neck[0] + 16, GROUND - 2], ARM_MAX, 12);
  return {
    ...p,
    handL,
    handR,
    bell: bell ? { anchor: "hip", style: "hips" } : null,
  };
}

export function windmillPose(down: boolean): Pose {
  const p = frontStand({
    hip: down ? [164, 252] : [150, 192],
    torso: down ? -38 : -4,
    footL: [74, GROUND],
    footR: [230, GROUND],
  });
  const b = bodyPoints(p.hip, p.torso, "front");
  const handR = reach(b.shoulderR, [b.shoulderR[0] + 8, b.shoulderR[1] - 140], ARM_MAX, 12);
  const handL = reach(b.shoulderL, down ? [70, 314] : [96, 220], ARM_MAX, 12);
  return { ...p, handL, handR, bell: { anchor: "R", style: "overhead" } };
}

export function pullPose(up: boolean): Pose {
  if (!up) return cleanPose("hinge");
  const p = stand({ hip: [150, 176], torso: -6 });
  return arms(p, "rack", "right", "hang");
}

export function snatchPose(phase: "hinge" | "high" | "lock"): Pose {
  if (phase === "hinge") return cleanPose("hinge");
  if (phase === "high") return pullPose(true);
  return cleanPose("overhead");
}
