import type { AnimId } from "./figure/animations.ts";
import type { SideMode } from "./plan.ts";
import { patternForWeek, type Day30, type WeekAB } from "./choice.ts";
import { VERIFIED_VIDEOS as V } from "./videos.ts";

const none: SideMode = { type: "none" };
const both: SideMode = { type: "alternate-reps" };
const rounds: SideMode = { type: "per-round" };

export const LEVEL_LABELS = ["Start here", "Next", "After that"] as const;

export const HIP_NOTE =
  "Right hip: go to a firm pull, not a sharp or pinching pain at the front of the joint. If a position pinches, ease off and shorten the range. Lateral lunges stay shallow. If hip pain lasts or worsens, stop that move and see a physiotherapist or doctor. This is not a treatment plan.";

export const PROGRESS_HINT =
  "Stay on Start here until you finish those reps with more than about 20 seconds to spare and clean form. On a Friday AMRAP, move on when you hit 5 quality rounds with something left. Stop a set if your form goes. Harder work with the 22 lb bell means slower lowers, pauses, denser sets and longer carries.";

export const VEST_HINT =
  "The vest is optional on squats, lunges, step-ups, push-ups and rack carries. Leave it off for get-ups, presses, windmills, overhead carries and bottoms-up holds.";

const RDL_CAUTION = "Flat back. Only as low as the right hip allows. Stay controlled on the right.";
const LUNGE_CAUTION = "Stay shallow, with no pinch at the front of the hip. Skip or shorten these if they pinch. Do not force a cossack.";
const WINDMILL_CAUTION = "Eyes on the bell and the overhead arm locked. Only as low as the right hip allows. If it pinches, do slow halos for that minute.";
const GETUP_CAUTION = "Slow and smooth. Stay controlled, especially on the right.";
const HIGH_PULL_CAUTION = "Hike like a swing and pull to rib height, with the elbow high. This is not a snatch.";
const SNATCH_CAUTION = "Only after a good tutorial and some slow practice.";
const WAITER_CAUTION = "Arm locked straight overhead, vest off. If the shoulder fatigues, switch to a rack carry.";
const STEP_CAUTION = "Use a sturdy step or the bottom stair.";
const BOTTOMS_CAUTION = "Only if the bell stays stable.";

export type Demo30 =
  | { kind: "clip"; animation: AnimId }
  | { kind: "link"; href: string }
  | { kind: "text" };

export type Move30 = {
  name: string;
  reps: string;
  vest: boolean;
  side: SideMode;
  demo: Demo30;
  /** Verified YouTube example, shown even when the in-app clip is playing. */
  example: string | null;
  caution: string | null;
  tutorial: string | null;
  sideLabel: string | null;
  mirror: boolean;
  /** Spoken during this move, when the phase coach is not enough. */
  coach: string | null;
};

export type Part30 = { move: Move30; ms: number };

type Triple<T> = [T, T, T];

export type SessionSlot =
  | { kind: "move"; id: string; label: string; block: "A" | "B"; versions: Triple<Move30> }
  | { kind: "circuit"; id: string; label: string; versions: Triple<Move30[]> }
  | { kind: "parts"; id: string; label: string; versions: Triple<Part30[]> };

export type SessionFormat = "emom" | "steady-amrap" | "emom-amrap";

export type Session30 = {
  week: WeekAB;
  day: Day30;
  weekday: "Monday" | "Wednesday" | "Friday";
  title: string;
  format: SessionFormat;
  wrists: boolean;
  slots: SessionSlot[];
};

type MoveInput = {
  name: string;
  reps: string;
  vest?: boolean;
  side?: SideMode;
  clip?: AnimId;
  link?: string;
  caution?: string;
  tutorial?: string;
  sideLabel?: string;
  mirror?: boolean;
  coach?: string;
};

/** In-app clip id to a verified how-to URL. Never add a URL that is not in VERIFIED_VIDEOS. */
const CLIP_EXAMPLES: Partial<Record<AnimId, string>> = {
  halo: V.halo,
  "bw-squat": V.bwSquat,
  "swing-light": V.swing,
  "swing-two": V.swing,
  "swing-fast": V.swing,
  "swing-one": V.swingOne,
  "goblet-squat": V.goblet,
  "goblet-pause": V.gobletPause,
  "goblet-onehalf": V.gobletOneHalf,
  "reverse-lunge": V.reverseLunge,
  "split-squat": V.splitSquat,
  bulgarian: V.bulgarian,
  "clean-press": V.cleanPress,
  "press-slow": V.cleanPress,
  "bottoms-up": V.bottomsUp,
  "floor-press": V.floorPress,
  "floor-press-slow": V.floorPress,
  row: V.row,
  pushup: V.pushup,
  "pushup-feet": V.pushupFeet,
  "pushup-archer": V.archer,
  "pushup-close": V.pushupClose,
  "pushup-slow": V.pushup,
  "kickstand-rdl": V.kickstand,
  "sl-rdl": V.slRdl,
  "sl-rdl-slow": V.slRdl,
  "step-up": V.stepUp,
  "step-up-slow": V.stepUp,
  "step-up-high": V.stepUp,
  "glute-bridge": V.gluteBridge,
  "sl-bridge": V.slBridge,
  "sl-bridge-bell": V.slBridge,
  "high-pull": V.highPull,
  snatch: V.snatch,
  windmill: V.windmill,
  "windmill-pause": V.windmill,
  "half-getup": V.halfGetup,
  getup: V.getup,
  "getup-pause": V.getup,
  "suitcase-carry": V.suitcase,
  "suitcase-march": V.suitcaseMarch,
  plank: V.plank,
  "rack-carry": V.rack,
  "overhead-carry": V.waiter,
  "clean-squat-press": V.complex,
};

function exampleFor(input: MoveInput): string | null {
  if (input.link) return input.link;
  if (input.tutorial) return input.tutorial;
  if (input.clip && CLIP_EXAMPLES[input.clip]) return CLIP_EXAMPLES[input.clip] ?? null;
  if (/bottoms-up/i.test(input.name)) return V.bottomsUp;
  return null;
}

function move(input: MoveInput): Move30 {
  if (input.clip && input.link) throw new Error(`${input.name} has a clip and a link`);
  const demo: Demo30 = input.clip
    ? { kind: "clip", animation: input.clip }
    : input.link
      ? { kind: "link", href: input.link }
      : { kind: "text" };
  return {
    name: input.name,
    reps: input.reps,
    vest: input.vest ?? false,
    side: input.side ?? none,
    demo,
    example: exampleFor(input),
    caution: input.caution ?? null,
    tutorial: input.tutorial ?? null,
    sideLabel: input.sideLabel ?? null,
    mirror: input.mirror ?? false,
    coach: input.coach ?? null,
  };
}

function rest(reps = "Shake out. Hip stretches are next."): Move30 {
  return move({ name: "Rest", reps });
}

function withMove(base: Move30, patch: Partial<Move30>): Move30 {
  return { ...base, ...patch };
}

function part(item: Move30, seconds: number): Part30 {
  return { move: item, ms: seconds * 1000 };
}

function carry(base: Move30, seconds: number, label: string): Part30[] {
  const restSeconds = 120 - seconds * 2;
  if (restSeconds < 0) throw new Error(`${base.name} is longer than 2 minutes`);
  const right = { ...base, reps: `${label} · right side`, sideLabel: "Right side", mirror: false };
  const left = { ...base, reps: `${label} · left side`, sideLabel: "Left side", mirror: true };
  const parts = [part(right, seconds), part(left, seconds)];
  if (restSeconds > 0) parts.push(part(rest(), restSeconds));
  return parts;
}

const swings: Triple<Move30> = [
  move({ name: "Two-hand swings", reps: "×15. Hard hip snap, bell to chest height.", clip: "swing-two" }),
  move({ name: "One-arm swings", reps: "×10 per arm", clip: "swing-one", side: both }),
  move({ name: "One-arm swings", reps: "×12 per arm", clip: "swing-one", side: both }),
];

const squats: Triple<Move30> = [
  move({
    name: "Goblet squats",
    reps: "×10. If 10 feels easy, pause for 3 seconds at the bottom.",
    clip: "goblet-squat",
    vest: true,
  }),
  move({ name: "Goblet squats", reps: "×10, 3-second pause at the bottom", clip: "goblet-pause", vest: true }),
  move({ name: "Goblet squats", reps: "×6 to 8 of 1½ reps", clip: "goblet-onehalf", vest: true }),
];

const lunges: Triple<Move30> = [
  move({
    name: "Reverse lunges",
    reps: "×8 per leg, holding the bell",
    link: V.reverseLunge,
    vest: true,
    side: both,
  }),
  move({ name: "Goblet split squats", reps: "×6 to 8 per leg", clip: "split-squat", vest: true, side: both }),
  move({
    name: "Bulgarian split squats",
    reps: "×6 per leg, back foot on a step",
    clip: "bulgarian",
    vest: true,
    side: both,
  }),
];

const cleanPress: Triple<Move30> = [
  move({ name: "Clean and press", reps: "×5 per arm", clip: "clean-press", side: both }),
  move({ name: "Clean and press", reps: "×5 per arm, 3-second lower", clip: "press-slow", side: both }),
  move({
    name: "Bottoms-up press",
    reps: "×5 per arm",
    clip: "bottoms-up",
    side: both,
    caution: BOTTOMS_CAUTION,
  }),
];

const floorPress: Triple<Move30> = [
  move({ name: "One-arm floor press", reps: "×8 per arm, 3-second lower", clip: "floor-press-slow", side: both }),
  move({ name: "One-arm floor press", reps: "×10 per arm, still with a slow lower", clip: "floor-press-slow", side: both }),
  move({
    name: "One-arm floor press",
    reps: "×10 per arm, pause on the floor then press, still with a slow lower",
    link: V.floorPress,
    side: both,
  }),
];

const rows: Triple<Move30> = [
  move({ name: "One-arm row", reps: "×10 per arm", clip: "row", side: both }),
  move({ name: "One-arm row", reps: "×12 per arm", clip: "row", side: both }),
  move({ name: "One-arm row", reps: "×12 per arm, 2-second pause at the top", link: V.row, side: both }),
];

const pushups: Triple<Move30> = [
  move({
    name: "Push-ups",
    reps: "×8 to 12, 2-second pause at the bottom. Last reps hard.",
    link: V.pushup,
    vest: true,
  }),
  move({ name: "Feet-elevated push-ups", reps: "×8 to 12, once 12 regular reps are clean", clip: "pushup-feet", vest: true }),
  move({ name: "Archer push-ups", reps: "×4 to 6 per side", clip: "pushup-archer", vest: true, side: both }),
];

const rdls: Triple<Move30> = [
  move({ name: "Kickstand Romanian deadlift", reps: "×8 per leg", clip: "kickstand-rdl", side: both, caution: RDL_CAUTION }),
  move({ name: "Single-leg Romanian deadlift", reps: "×6 per leg", clip: "sl-rdl", side: both, caution: RDL_CAUTION }),
  move({
    name: "Single-leg Romanian deadlift",
    reps: "×6 per leg, 3-second lower",
    clip: "sl-rdl-slow",
    side: both,
    caution: RDL_CAUTION,
  }),
];

const laterals: Triple<Move30> = [
  move({ name: "Lateral lunges", reps: "×6 per leg, shallow", link: V.lateral, vest: true, side: both, caution: LUNGE_CAUTION }),
  move({
    name: "Lateral lunges",
    reps: "×8 per leg, still shallow, 2-second pause at the bottom. Only as deep as the right hip allows.",
    link: V.lateral,
    vest: true,
    side: both,
    caution: LUNGE_CAUTION,
  }),
  move({
    name: "Lateral lunges",
    reps: "×8 per leg, still shallow, 3-second pause at the bottom. Do not go deeper if it pinches. Do not force a cossack.",
    link: V.lateral,
    vest: true,
    side: both,
    caution: LUNGE_CAUTION,
  }),
];

const stepUps: Triple<Move30> = [
  move({ name: "Goblet step-ups", reps: "×6 to 8 per leg", clip: "step-up", vest: true, side: both, caution: STEP_CAUTION }),
  move({
    name: "Goblet step-ups",
    reps: "×6 to 8 per leg, lower for 3 seconds",
    clip: "step-up-slow",
    vest: true,
    side: both,
    caution: STEP_CAUTION,
  }),
  move({
    name: "Goblet step-ups",
    reps: "×6 per leg, on a higher step, lower for 3 seconds",
    clip: "step-up-high",
    vest: true,
    side: both,
    caution: STEP_CAUTION,
  }),
];

const bridges: Triple<Move30> = [
  move({ name: "Glute bridge", reps: "×12, bell on the hips. Squeeze at the top.", clip: "glute-bridge" }),
  move({ name: "Single-leg glute bridge", reps: "×8 per leg", clip: "sl-bridge", side: both }),
  move({ name: "Single-leg glute bridge", reps: "×8 per leg, bell on the hips", clip: "sl-bridge-bell", side: both }),
];

const pulls: Triple<Move30> = [
  move({ name: "One-arm high pull", reps: "×8 per arm, bell to rib height", clip: "high-pull", side: both, caution: HIGH_PULL_CAUTION }),
  move({
    name: "Snatches",
    reps: "×5 per arm",
    clip: "snatch",
    side: both,
    caution: SNATCH_CAUTION,
    tutorial: V.snatch,
  }),
  move({
    name: "Snatches",
    reps: "×8 per arm",
    clip: "snatch",
    side: both,
    caution: SNATCH_CAUTION,
    tutorial: V.snatch,
  }),
];

const closePush: Triple<Move30> = [
  move({ name: "Close-grip push-ups", reps: "×8 to 12", clip: "pushup-close", vest: true }),
  move({ name: "Close-grip push-ups", reps: "×8 to 12, 3-second lower", link: V.pushupClose, vest: true }),
  move({ name: "Archer push-ups", reps: "×4 to 6 per side", clip: "pushup-archer", vest: true, side: both }),
];

const windmills: Triple<Move30> = [
  move({ name: "Windmills", reps: "×4 per side", clip: "windmill", side: both, caution: WINDMILL_CAUTION }),
  move({ name: "Windmills", reps: "×5 per side", clip: "windmill", side: both, caution: WINDMILL_CAUTION }),
  move({
    name: "Windmills",
    reps: "×5 per side, 2-second pause at the bottom, still with no pinch",
    clip: "windmill-pause",
    side: both,
    caution: WINDMILL_CAUTION,
  }),
];

const getups: Triple<Move30> = [
  move({
    name: "Half get-ups",
    reps: "20 per arm. 1-to-5 ladder, then sets of 5 if that still feels good.",
    clip: "half-getup",
    side: both,
    caution: GETUP_CAUTION,
    coach: "Slow and smooth for 10 minutes. Switch sides each rep. 20 per arm is the mark.",
  }),
  move({
    name: "Turkish get-ups",
    reps: "Slow and smooth. Switch sides each rep.",
    clip: "getup",
    side: both,
    caution: GETUP_CAUTION,
    coach: "Full get-ups, slow and smooth, for 10 minutes. Switch sides each rep.",
  }),
  move({
    name: "Turkish get-ups",
    reps: "3-second pause at each stage",
    clip: "getup-pause",
    side: both,
    caution: GETUP_CAUTION,
    coach: "Full get-ups with a pause at each stage. Stay smooth, especially on the right.",
  }),
];

const swingFinish: Triple<Part30[]> = [
  [part(move({ name: "Two-hand swings", reps: "60 seconds. Hard, with clean form.", clip: "swing-fast" }), 60), part(rest(), 60)],
  [part(move({ name: "One-arm swings", reps: "12 per arm", clip: "swing-one", side: both }), 60), part(rest(), 60)],
  [part(move({ name: "One-arm swings", reps: "15 per arm", clip: "swing-one", side: both }), 60), part(rest(), 60)],
];

const suitcaseBase = move({ name: "Suitcase carry", reps: "Per side", clip: "suitcase-carry" });
const marchBase = move({ name: "Suitcase march", reps: "High knees", clip: "suitcase-march", vest: true });
const suitcaseFinish: Triple<Part30[]> = [
  carry(
    { ...suitcaseBase, caution: "40 seconds a side. Last time on the 20-minute plan was 30." },
    40,
    "40 seconds",
  ),
  carry({ ...suitcaseBase, vest: true }, 60, "60 seconds, vest on"),
  carry(marchBase, 60, "High knees, 60 seconds"),
];

const plankBase = move({ name: "Plank", reps: "Hold", clip: "plank" });
const plankFinish: Triple<Part30[]> = [
  [
    part(withMove(plankBase, { reps: "Up to 90 seconds, building from 40. Stop when form goes." }), 90),
    part(rest("Rest out the rest of the 2 minutes."), 30),
  ],
  [part(withMove(plankBase, { reps: "90 seconds, clean form" }), 90), part(rest("Rest out the rest of the 2 minutes."), 30)],
  [
    part(withMove(plankBase, { reps: "90 seconds. Add the vest, or lift one foot.", vest: true }), 90),
    part(rest("Rest out the rest of the 2 minutes."), 30),
  ],
];

const rackBase = move({ name: "Rack carry", reps: "Bell in the rack at the chest", clip: "rack-carry", vest: true });
const overheadBase = move({
  name: "Overhead carry",
  reps: "Arm locked",
  clip: "overhead-carry",
  caution: WAITER_CAUTION,
});
const rackFinish: Triple<Part30[]> = [
  carry(rackBase, 40, "40 seconds, bell in the rack"),
  carry(rackBase, 60, "50 to 60 seconds. Vest on if your form is solid"),
  carry(overheadBase, 60, "50 to 60 seconds, arm locked overhead, vest off"),
];

const waiterBase = move({
  name: "Waiter carry",
  reps: "Arm locked straight overhead, vest off",
  clip: "overhead-carry",
  caution: WAITER_CAUTION,
});
const bottomsCarry = move({
  name: "Bottoms-up hold",
  reps: "Only if the bell stays stable. If it wobbles, go back to the waiter carry. Vest off.",
  caution: BOTTOMS_CAUTION,
});
const waiterFinish: Triple<Part30[]> = [
  carry(waiterBase, 40, "40 seconds, arm locked overhead, vest off"),
  carry(waiterBase, 60, "50 to 60 seconds, arm locked overhead, vest off"),
  carry(bottomsCarry, 60, "50 to 60 seconds, bottoms-up, vest off, only if it stays stable"),
];

const amrapA: Triple<Move30[]> = [
  [
    move({ name: "Clean and press", reps: "×5 per arm", clip: "clean-press", side: both }),
    move({ name: "Goblet squats", reps: "×10", clip: "goblet-squat", vest: true }),
    move({ name: "Push-ups", reps: "×10", clip: "pushup", vest: true }),
    move({ name: "Two-hand swings", reps: "×15", clip: "swing-two" }),
  ],
  [
    move({ name: "Clean and press", reps: "×5 per arm, 3-second lower", clip: "press-slow", side: both }),
    move({ name: "Pause squats", reps: "×8, 3-second pause", clip: "goblet-pause", vest: true }),
    move({ name: "Slow push-ups", reps: "×8, 3-second lower", clip: "pushup-slow", vest: true }),
    move({ name: "One-arm swings", reps: "×10 per arm", clip: "swing-one", side: both }),
  ],
  [
    move({ name: "Clean-squat-press", reps: "×5 per arm", clip: "clean-squat-press", side: both }),
    move({ name: "Feet-elevated push-ups", reps: "×8", clip: "pushup-feet", vest: true }),
    move({ name: "One-arm swings", reps: "×12 per arm", clip: "swing-one", side: both }),
  ],
];

const amrapB: Triple<Move30[]> = [
  [
    move({ name: "Goblet squats", reps: "×10", clip: "goblet-squat", vest: true }),
    move({ name: "Two-hand swings", reps: "×15", clip: "swing-two" }),
    move({ name: "Suitcase carry", reps: "30 seconds. Switch sides each round.", clip: "suitcase-carry", side: rounds }),
  ],
  [
    move({ name: "Pause squats", reps: "×10, 3-second pause", clip: "goblet-pause", vest: true }),
    move({ name: "Two-hand swings", reps: "×15", clip: "swing-two" }),
    move({ name: "Suitcase carry", reps: "40 seconds. Switch sides each round.", clip: "suitcase-carry", side: rounds, vest: true }),
  ],
  [
    move({ name: "Goblet squats", reps: "×6 to 8 of 1½ reps", clip: "goblet-onehalf", vest: true }),
    move({ name: "One-arm swings", reps: "×10 per arm", clip: "swing-one", side: both }),
    move({ name: "Suitcase carry", reps: "50 seconds. Switch sides each round.", clip: "suitcase-carry", side: rounds, vest: true }),
  ],
];

function emom(id: string, label: string, block: "A" | "B", versions: Triple<Move30>): SessionSlot {
  return { kind: "move", id, label, block, versions };
}

function steady(versions: Triple<Move30>): SessionSlot {
  return { kind: "move", id: "blockA", label: "Block A", block: "A", versions };
}

function circuit(versions: Triple<Move30[]>): SessionSlot {
  return { kind: "circuit", id: "amrap", label: "Block B", versions };
}

function finisher(versions: Triple<Part30[]>): SessionSlot {
  return { kind: "parts", id: "finisher", label: "Finisher", versions };
}

export const SESSIONS: Session30[] = [
  {
    week: "A",
    day: 1,
    weekday: "Monday",
    title: "Legs and power",
    format: "emom",
    wrists: false,
    slots: [
      emom("a1", "A1", "A", swings),
      emom("a2", "A2", "A", squats),
      emom("b1", "B1", "B", lunges),
      emom("b2", "B2", "B", cleanPress),
      finisher(swingFinish),
    ],
  },
  {
    week: "A",
    day: 2,
    weekday: "Wednesday",
    title: "Upper push and pull",
    format: "emom",
    wrists: true,
    slots: [
      emom("a1", "A1", "A", floorPress),
      emom("a2", "A2", "A", rows),
      emom("b1", "B1", "B", pushups),
      emom("b2", "B2", "B", rdls),
      finisher(plankFinish),
    ],
  },
  {
    week: "A",
    day: 3,
    weekday: "Friday",
    title: "Get-ups and full body",
    format: "steady-amrap",
    wrists: false,
    slots: [steady(getups), circuit(amrapA), finisher(suitcaseFinish)],
  },
  {
    week: "B",
    day: 1,
    weekday: "Monday",
    title: "Single-leg and hinge",
    format: "emom",
    wrists: false,
    slots: [
      emom("a1", "A1", "A", rdls),
      emom("a2", "A2", "A", laterals),
      emom("b1", "B1", "B", stepUps),
      emom("b2", "B2", "B", bridges),
      finisher(swingFinish),
    ],
  },
  {
    week: "B",
    day: 2,
    weekday: "Wednesday",
    title: "Overhead and grip",
    format: "emom",
    wrists: true,
    slots: [
      emom("a1", "A1", "A", cleanPress),
      emom("a2", "A2", "A", pulls),
      emom("b1", "B1", "B", closePush),
      emom("b2", "B2", "B", windmills),
      finisher(rackFinish),
    ],
  },
  {
    week: "B",
    day: 3,
    weekday: "Friday",
    title: "Full body and carries",
    format: "emom-amrap",
    wrists: false,
    slots: [emom("a1", "A1", "A", rows), emom("a2", "A2", "A", pushups), circuit(amrapB), finisher(waiterFinish)],
  },
];

export function getSession(week: WeekAB, day: number): Session30 {
  const found = SESSIONS.find((session) => session.week === week && session.day === day);
  if (!found) throw new Error(`Unknown 3×30 session ${week}-${day}`);
  return found;
}

/** Programme weeks 1–8: odd weeks are A, even weeks are B. */
export function getProgrammeSession(week: number, day: number): Session30 {
  if (!Number.isInteger(week) || week < 1 || week > 8) throw new Error(`Unknown programme week ${week}`);
  return getSession(patternForWeek(week), day);
}


export function sessionsFor(week: WeekAB): Session30[] {
  return SESSIONS.filter((session) => session.week === week);
}

export function formatNote(session: Session30): string {
  if (session.format === "steady-amrap") {
    return "4 min warm-up, 10 min steady get-ups, 10 min AMRAP, a 2 min finisher, then 4 min of hip stretches.";
  }
  if (session.format === "emom-amrap") {
    return "4 min warm-up, 10 min block A EMOM, 10 min AMRAP, a 2 min finisher, then 4 min of hip stretches.";
  }
  return "4 min warm-up, 10 min block A EMOM, 10 min block B EMOM, a 2 min finisher, then 4 min of hip stretches.";
}

export function amrapCoach(week: WeekAB): string {
  if (week === "A") {
    return "Aim for 4 to 5 quality rounds. You've done 5 rounds in 8 minutes before, without the push-ups. Add one each time you finish.";
  }
  return "Aim for 4 to 5 quality rounds. Squats, swings, then a suitcase carry. Switch suitcase sides each round. Add one each time you finish.";
}

const FLEXOR = "Rear knee down, tall torso, tuck the tailbone gently. Feel it at the front of the rear thigh, not a pinch in the hip.";
const FIGURE4 = "Lie on your back, ankle on the opposite knee, and gently draw that thigh towards you.";
const HOLD = "Only as deep as the right hip allows without a pinch.";

function stretch(name: string, seconds: number, side: "Right side" | "Left side", caution: string, link?: string): Part30 {
  return part(
    move({
      name,
      reps: `${seconds} seconds`,
      caution,
      link,
      sideLabel: side,
      mirror: side === "Left side",
    }),
    seconds,
  );
}

/** Same three stretches after every 3×30 session. Right side first. 45 + 45 + 45 + 45 + 30 + 30 = 240 seconds. */
export function hipStretches(): Part30[] {
  return [
    stretch("Half-kneeling hip flexor stretch", 45, "Right side", FLEXOR),
    stretch("Half-kneeling hip flexor stretch", 45, "Left side", FLEXOR),
    stretch("Figure-4 glute stretch", 45, "Right side", FIGURE4),
    stretch("Figure-4 glute stretch", 45, "Left side", FIGURE4),
    stretch("Shallow lateral-lunge hold", 30, "Right side", HOLD, V.lateral),
    stretch("Shallow lateral-lunge hold", 30, "Left side", HOLD, V.lateral),
  ];
}

export function warmupMoves(wrists: boolean): Move30[] {
  return [
    move({
      name: "Halos",
      reps: wrists ? "Easy pace, plus slow wrist circles" : "Easy pace",
      clip: "halo",
    }),
    move({ name: "Slow squats", reps: "Easy pace", clip: "bw-squat" }),
    move({ name: "Light swings", reps: "Easy pace", clip: "swing-light" }),
    move({
      name: "90/90 hip switches",
      reps: "Gentle. Right side first.",
      caution: "Do not force the right hip. Ease off if the front of the hip pinches.",
    }),
  ];
}

export type ExampleLink = { name: string; href: string };

export type PickerOption = {
  text: string;
  vest: boolean;
  preview: Move30;
  examples: ExampleLink[];
};

function examplesFor(moves: Move30[]): ExampleLink[] {
  const seen = new Set<string>();
  const links: ExampleLink[] = [];
  for (const item of moves) {
    if (!item.example) continue;
    const key = `${item.name}|${item.example}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ name: item.name, href: item.example });
  }
  return links;
}

export function pickerSlots(session: Session30): Array<{ id: string; label: string; options: Triple<PickerOption> }> {
  return session.slots.map((slot) => {
    if (slot.kind === "move") {
      return {
        id: slot.id,
        label: slot.label,
        options: slot.versions.map((version) => ({
          text: `${version.name} ${version.reps}`,
          vest: version.vest,
          preview: version,
          examples: examplesFor([version]),
        })) as Triple<PickerOption>,
      };
    }
    if (slot.kind === "circuit") {
      return {
        id: slot.id,
        label: slot.label,
        options: slot.versions.map((round) => ({
          text: round.map((item) => `${item.name} ${item.reps}`).join(" · "),
          vest: round.some((item) => item.vest),
          preview: round[0],
          examples: examplesFor(round),
        })) as Triple<PickerOption>,
      };
    }
    return {
      id: slot.id,
      label: slot.label,
      options: slot.versions.map((parts) => {
        const work = parts.filter((item) => item.move.name !== "Rest");
        const first = work[0]?.move ?? parts[0].move;
        const same = work.length > 1 && work.every((item) => item.move.name === first.name);
        const text = same
          ? `${first.name} ${first.reps.replace(/ · (right|left) side/i, "")}, both sides`
          : work.map((item) => `${item.move.name} ${item.move.reps}`).join(" · ");
        return {
          text,
          vest: work.some((item) => item.move.vest),
          preview: first,
          examples: examplesFor(work.map((item) => item.move)),
        };
      }) as Triple<PickerOption>,
    };
  });
}

export function movesIn(session: Session30): Move30[] {
  const found: Move30[] = [...warmupMoves(session.wrists), ...hipStretches().map((item) => item.move)];
  for (const slot of session.slots) {
    if (slot.kind === "move") found.push(...slot.versions);
    else if (slot.kind === "circuit") found.push(...slot.versions.flat());
    else found.push(...slot.versions.flat().map((item) => item.move));
  }
  return found;
}

for (const session of SESSIONS) {
  const finisherSlot = session.slots.find((slot) => slot.kind === "parts");
  if (!finisherSlot || finisherSlot.kind !== "parts") throw new Error(`${session.title} is missing a finisher`);
  for (const version of finisherSlot.versions) {
    const total = version.reduce((sum, item) => sum + item.ms, 0);
    if (total !== 120_000) throw new Error(`${session.week} day ${session.day} finisher is ${total}ms`);
  }
}
const hipTotal = hipStretches().reduce((sum, item) => sum + item.ms, 0);
if (hipTotal !== 240_000) throw new Error(`Hip stretches are ${hipTotal}ms`);
