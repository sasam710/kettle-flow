import type { AnimId } from "./figure/animations.ts";

/** Weeks 1–3 use the plan's Weeks 1–2 column, 4–5 use Weeks 3–4, 6–8 use Weeks 5–6. */
export const WEEK_COUNT = 8;
export const DAY_COUNT = 5;

export type SideMode =
  | { type: "none" }
  | { type: "alternate-reps" }
  | { type: "per-round" }
  | { type: "after"; ms: number };

export type Version = {
  name: string;
  reps: string;
  animation: AnimId;
  vest: boolean;
  side: SideMode;
};

export type SlotRole = "a1" | "a2" | "b1" | "b2" | "finisher" | "blockA" | "circuit";

export type Slot = {
  id: string;
  label: string;
  role: SlotRole;
  versions: [Version, Version, Version];
};

export type DayFormat = "emom" | "getup";

export type DayDef = {
  day: 1 | 2 | 3 | 4 | 5;
  title: string;
  format: DayFormat;
  slots: Slot[];
};

const both: SideMode = { type: "alternate-reps" };
const rounds: SideMode = { type: "per-round" };
const side25: SideMode = { type: "after", ms: 25_000 };
const side30: SideMode = { type: "after", ms: 30_000 };

function v(name: string, reps: string, animation: AnimId, vest = false, side: SideMode = { type: "none" }): Version {
  return { name, reps, animation, vest, side };
}

function slot(id: string, label: string, role: SlotRole, versions: [Version, Version, Version]): Slot {
  return { id, label, role, versions };
}

export const WARMUP: Version[] = [
  v("Halos", "Easy pace", "halo"),
  v("Bodyweight squats", "Easy pace", "bw-squat"),
  v("Light swings", "Easy pace", "swing-light"),
];

const swingsFinisher = slot("finisher", "Finisher", "finisher", [
  v("Max swings", "1 min", "swing-fast"),
  v("Max swings", "1 min", "swing-fast"),
  v("Max swings", "1 min", "swing-fast"),
]);

export const DAYS: DayDef[] = [
  {
    day: 1,
    title: "Legs and power",
    format: "emom",
    slots: [
      slot("a1", "A1", "a1", [
        v("Two-hand swings", "×15", "swing-two"),
        v("One-arm swings", "×10, switch arms each round", "swing-one", false, rounds),
        v("One-arm swings", "×12, switch arms each round", "swing-one", false, rounds),
      ]),
      slot("a2", "A2", "a2", [
        v("Goblet squats", "×8", "goblet-squat", true),
        v("Goblet squats", "×6, 3-second pause at the bottom", "goblet-pause", true),
        v("Goblet squats", "×6, 1½ reps", "goblet-onehalf", true),
      ]),
      slot("b1", "B1", "b1", [
        v("Reverse lunges", "×6 per leg", "reverse-lunge", true, both),
        v("Goblet split squats", "×6 per leg", "split-squat", true, both),
        v("Bulgarian split squats", "×6 per leg, back foot on a step", "bulgarian", true, both),
      ]),
      slot("b2", "B2", "b2", [
        v("Suitcase carry", "25 s per side", "suitcase-carry", false, side25),
        v("Suitcase carry", "25 s per side", "suitcase-carry", true, side25),
        v("Suitcase march", "25 s per side, high knees", "suitcase-march", true, side25),
      ]),
      swingsFinisher,
    ],
  },
  {
    day: 2,
    title: "Upper push and pull",
    format: "emom",
    slots: [
      slot("a1", "A1", "a1", [
        v("One-arm floor press", "×8 per arm", "floor-press", false, both),
        v("Floor press", "×6 per arm, lower for 3 s", "floor-press-slow", false, both),
        v("Floor press", "×6 per arm, 1½ reps", "floor-press-onehalf", false, both),
      ]),
      slot("a2", "A2", "a2", [
        v("One-arm row", "×8 per arm", "row", false, both),
        v("Row", "×8 per arm, lower for 3 s", "row-slow", false, both),
        v("Plank row", "×6 per arm", "plank-row", true, both),
      ]),
      slot("b1", "B1", "b1", [
        v("Push-ups", "×6–10", "pushup", true),
        v("Feet-raised push-ups", "×6–10", "pushup-feet", true),
        v("Archer push-ups", "×4–6 per side", "pushup-archer", false, both),
      ]),
      slot("b2", "B2", "b2", [
        v("Kettlebell dead bug", "×8 per side", "dead-bug", false, both),
        v("Halos", "×6 each direction", "halo"),
        v("Hollow hold", "30 s", "hollow"),
      ]),
      slot("finisher", "Finisher", "finisher", [
        v("Plank", "1 min", "plank", true),
        v("Plank", "1 min", "plank", true),
        v("Plank", "1 min", "plank", true),
      ]),
    ],
  },
  {
    day: 3,
    title: "Get-ups and full body",
    format: "getup",
    slots: [
      slot("blockA", "Block A", "blockA", [
        v("Half get-ups", "Lying to sitting tall", "half-getup", false, both),
        v("Turkish get-ups", "Switch sides each rep", "getup", false, both),
        v("Paused Turkish get-ups", "3 s pause at each stage", "getup-pause", false, both),
      ]),
      slot("c1", "Block B · 1", "circuit", [
        v("Clean and press", "×5 per arm", "clean-press", false, both),
        v("Clean and press", "×5 per arm", "clean-press", false, both),
        v("Clean-squat-press", "×5 per arm", "clean-squat-press", true, both),
      ]),
      slot("c2", "Block B · 2", "circuit", [
        v("Goblet squats", "×10", "goblet-squat", true),
        v("Pause squats", "×8", "goblet-pause", true),
        v("Squat", "Included in the clean-squat-press", "clean-squat-press", false),
      ]),
      slot("c3", "Block B · 3", "circuit", [
        v("Two-hand swings", "×15", "swing-two"),
        v("One-arm swings", "×10 per arm", "swing-one", false, both),
        v("One-arm swings", "×10 per arm", "swing-one", false, both),
      ]),
      slot("finisher", "Finisher", "finisher", [
        v("Suitcase carry", "30 s per side", "suitcase-carry", false, side30),
        v("Suitcase carry", "30 s per side", "suitcase-carry", false, side30),
        v("Suitcase carry", "30 s per side", "suitcase-carry", false, side30),
      ]),
    ],
  },
  {
    day: 4,
    title: "Single-leg and hinge",
    format: "emom",
    slots: [
      slot("a1", "A1", "a1", [
        v("Kickstand Romanian deadlift", "×8 per leg", "kickstand-rdl", false, both),
        v("Single-leg Romanian deadlift", "×6 per leg", "sl-rdl", false, both),
        v("Single-leg Romanian deadlift", "×6 per leg, lower for 3 s", "sl-rdl-slow", false, both),
      ]),
      slot("a2", "A2", "a2", [
        v("Lateral lunges", "×6 per leg", "lateral-lunge", true, both),
        v("Cossack squats", "×5 per leg", "cossack", true, both),
        v("Goblet Cossack squats", "×5 per leg", "cossack-goblet", true, both),
      ]),
      slot("b1", "B1", "b1", [
        v("Goblet step-ups", "×6 per leg", "step-up", true, both),
        v("Step-ups", "×6 per leg, lower for 3 s", "step-up-slow", true, both),
        v("Step-ups", "×6 per leg, higher step", "step-up-high", true, both),
      ]),
      slot("b2", "B2", "b2", [
        v("Glute bridge", "×12, bell on hips", "glute-bridge"),
        v("Single-leg glute bridge", "×8 per leg", "sl-bridge", false, both),
        v("Single-leg glute bridge", "×8 per leg, bell on hips", "sl-bridge-bell", false, both),
      ]),
      swingsFinisher,
    ],
  },
  {
    day: 5,
    title: "Overhead and grip",
    format: "emom",
    slots: [
      slot("a1", "A1", "a1", [
        v("Clean and press", "×5 per arm", "clean-press", false, both),
        v("Press", "×5 per arm, lower for 3 s", "press-slow", false, both),
        v("Bottoms-up press", "×5 per arm", "bottoms-up", false, both),
      ]),
      slot("a2", "A2", "a2", [
        v("One-arm high pull", "×8 per arm", "high-pull", false, both),
        v("Snatches", "×5 per arm", "snatch", false, both),
        v("Snatches", "×8 per arm", "snatch-fast", false, both),
      ]),
      slot("b1", "B1", "b1", [
        v("Close-grip push-ups", "×6–10", "pushup-close", true),
        v("Push-ups", "×6–8, lower for 3 s", "pushup-slow", true),
        v("Archer push-ups", "×4–6 per side", "pushup-archer", true, both),
      ]),
      slot("b2", "B2", "b2", [
        v("Windmills", "×4 per side", "windmill", false, both),
        v("Windmills", "×5 per side", "windmill", false, both),
        v("Windmills", "×5 per side, 2 s pause at the bottom", "windmill-pause", false, both),
      ]),
      slot("finisher", "Finisher", "finisher", [
        v("Rack carry", "Switch hands at 30 s", "rack-carry", true, side30),
        v("Rack carry", "Switch hands at 30 s", "rack-carry", true, side30),
        v("Overhead carry", "Switch hands at 30 s", "overhead-carry", false, side30),
      ]),
    ],
  },
];

export function defaultVersion(week: number): 0 | 1 | 2 {
  if (week <= 3) return 0;
  if (week <= 5) return 1;
  return 2;
}

export function phaseName(week: number): string {
  return ["Weeks 1–2", "Weeks 3–4", "Weeks 5–6"][defaultVersion(week)];
}

export function getDay(day: number): DayDef {
  const found = DAYS.find((entry) => entry.day === day);
  if (!found) throw new Error(`Unknown day ${day}`);
  return found;
}

export function labelForAnimation(id: AnimId): string {
  for (const move of WARMUP) if (move.animation === id) return move.name;
  for (const day of DAYS) {
    for (const entry of day.slots) {
      for (const version of entry.versions) {
        if (version.animation === id) return version.name;
      }
    }
  }
  return id;
}

export const COLUMN_LABELS = ["Weeks 1–2", "Weeks 3–4", "Weeks 5–6"] as const;
