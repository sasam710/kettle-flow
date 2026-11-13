import type { Day30, WeekAB } from "./choice.ts";
import type { AnimId } from "./figure/animations.ts";
import { amrapCoach, getSession, hipStretches, warmupMoves, type Move30, type Part30 } from "./plan30.ts";
import {
  DAY_COUNT,
  WARMUP,
  WEEK_COUNT,
  defaultVersion,
  getDay,
  type DayFormat,
  type SideMode,
  type Version,
} from "./plan.ts";

export const SESSION_MS = 20 * 60 * 1000;
export const SESSION_30_MS = 30 * 60 * 1000;
const MINUTE = 60_000;
const WARMUP_END = 3 * MINUTE;
const BLOCK_A_END = 11 * MINUTE;
const BLOCK_B_END = 19 * MINUTE;
const WARMUP_30 = 4 * MINUTE;
const BLOCK_A_30 = 14 * MINUTE;
const BLOCK_B_30 = 24 * MINUTE;

export type PhaseId = "warmup" | "blockA" | "blockB" | "finisher" | "hips" | "done";
export type StepMode = "warmup" | "emom" | "steady" | "amrap" | "finisher" | "stretch";
export type SessionFormat = DayFormat | "steady-amrap" | "emom-amrap";
export type Cue = "tick" | "minute" | "block" | "done";

export type ResolvedMove = {
  slotId: string;
  name: string;
  reps: string;
  animation: AnimId | null;
  vest: boolean;
  side: SideMode;
  demo: "clip" | "link" | "text";
  guide: string | null;
  caution: string | null;
  tutorial: string | null;
  sideLabel: string | null;
  mirror: boolean;
  coach: string | null;
};

export type DisplayMove = {
  slotId: string;
  name: string;
  reps: string;
  animation: AnimId | null;
  vest: boolean;
  alternateReps: boolean;
  mirror: boolean;
  sideLabel: string | null;
  demo: "clip" | "link" | "text";
  guide: string | null;
  caution: string | null;
  tutorial: string | null;
};

export type Step = {
  phase: PhaseId;
  mode: StepMode;
  start: number;
  end: number;
  move: ResolvedMove;
  circuit?: ResolvedMove[];
  appearance: number;
  coach?: string;
  modeLabel?: string;
};

export type Timeline = {
  week: number;
  day: number;
  title: string;
  eyebrow: string;
  format: SessionFormat;
  steps: Step[];
  circuit: DisplayMove[];
  sessionMs: number;
  tracksRounds: boolean;
  legacyGuides: boolean;
};

export type Snapshot = {
  elapsedMs: number;
  remainingSessionMs: number;
  stepRemainingMs: number;
  stepDurationMs: number;
  phase: PhaseId;
  phaseLabel: string;
  mode: StepMode | "done";
  modeLabel: string;
  coach: string;
  /** Shown on the last minute of a block, so the change is not a surprise. */
  handover: string | null;
  minuteInPhase: number;
  minutesInPhase: number;
  current: DisplayMove | null;
  next: DisplayMove | null;
  sessionMs: number;
  caption: string;
};

export type TimelineInput = {
  week: number;
  day: number;
  choices: Record<string, number>;
  vestOn: boolean;
};

function clampVersion(value: number | undefined, week: number): 0 | 1 | 2 {
  if (value === 0 || value === 1 || value === 2) return value;
  return defaultVersion(week);
}

function resolve(version: Version, slotId: string, vestOn: boolean): ResolvedMove {
  return {
    slotId,
    name: version.name,
    reps: version.reps,
    animation: version.animation,
    vest: version.vest && vestOn,
    side: version.side,
    demo: "clip",
    guide: null,
    caution: null,
    tutorial: null,
    sideLabel: null,
    mirror: false,
    coach: null,
  };
}

function resolve30(item: Move30, slotId: string, vestOn: boolean): ResolvedMove {
  return {
    slotId,
    name: item.name,
    reps: item.reps,
    animation: item.demo.kind === "clip" ? item.demo.animation : null,
    vest: item.vest && vestOn,
    side: item.side,
    demo: item.demo.kind,
    guide: item.example ?? (item.demo.kind === "link" ? item.demo.href : null),
    caution: item.caution,
    tutorial: item.tutorial,
    sideLabel: item.sideLabel,
    mirror: item.mirror,
    coach: item.coach,
  };
}

function present(move: ResolvedMove, appearance: number, localMs: number): DisplayMove {
  let mirror = move.mirror;
  let sideLabel = move.sideLabel;
  if (!sideLabel) {
    if (move.side.type === "per-round") {
      mirror = appearance % 2 === 1;
      sideLabel = mirror ? "Left side" : "Right side";
    } else if (move.side.type === "after") {
      mirror = localMs >= move.side.ms;
      sideLabel = mirror ? "Left side" : "Right side";
    }
  }
  return {
    slotId: move.slotId,
    name: move.name,
    reps: move.reps,
    animation: move.animation,
    vest: move.vest,
    alternateReps: move.side.type === "alternate-reps",
    mirror,
    sideLabel,
    demo: move.demo,
    guide: move.guide,
    caution: move.caution,
    tutorial: move.tutorial,
  };
}

export function buildTimeline(input: TimelineInput): Timeline {
  if (input.week < 1 || input.week > WEEK_COUNT || input.day < 1 || input.day > DAY_COUNT) {
    throw new Error("Unknown session");
  }
  const day = getDay(input.day);
  const picked = (id: string) => {
    const entry = day.slots.find((slot) => slot.id === id);
    if (!entry) throw new Error(`Missing slot ${id}`);
    const version = entry.versions[clampVersion(input.choices[id], input.week)];
    return resolve(version, entry.id, input.vestOn);
  };

  const steps: Step[] = WARMUP.map((move, index) => ({
    phase: "warmup" as const,
    mode: "warmup" as const,
    start: index * MINUTE,
    end: (index + 1) * MINUTE,
    move: resolve(move, "warmup", false),
    appearance: 0,
  }));

  if (day.format === "getup") {
    const circuit = ["c1", "c2", "c3"].map((id) => picked(id));
    steps.push({
      phase: "blockA",
      mode: "steady",
      start: WARMUP_END,
      end: BLOCK_A_END,
      move: picked("blockA"),
      appearance: 0,
    });
    steps.push({
      phase: "blockB",
      mode: "amrap",
      start: BLOCK_A_END,
      end: BLOCK_B_END,
      move: circuit[0],
      circuit,
      appearance: 0,
    });
  } else {
    const pairs: Array<["blockA" | "blockB", "a1" | "a2" | "b1" | "b2", number]> = [
      ["blockA", "a1", WARMUP_END],
      ["blockB", "b1", BLOCK_A_END],
    ];
    for (const [phase, firstId, start] of pairs) {
      const first = picked(firstId);
      const second = picked(firstId === "a1" ? "a2" : "b2");
      for (let i = 0; i < 8; i += 1) {
        steps.push({
          phase,
          mode: "emom",
          start: start + i * MINUTE,
          end: start + (i + 1) * MINUTE,
          move: i % 2 === 0 ? first : second,
          appearance: Math.floor(i / 2),
        });
      }
    }
  }

  steps.push({
    phase: "finisher",
    mode: "finisher",
    start: BLOCK_B_END,
    end: SESSION_MS,
    move: picked("finisher"),
    appearance: 0,
  });

  const circuit = day.format === "getup" ? ["c1", "c2", "c3"].map((id) => present(picked(id), 0, 0)) : [];

  return {
    week: input.week,
    day: input.day,
    title: day.title,
    eyebrow: `Week ${input.week} · Day ${input.day}`,
    format: day.format,
    steps,
    circuit,
    sessionMs: SESSION_MS,
    tracksRounds: day.format === "getup",
    legacyGuides: true,
  };
}

export type Timeline30Input = {
  week: WeekAB;
  day: number;
  choices: Record<string, number>;
  vestOn: boolean;
};

function level(value: number | undefined): 0 | 1 | 2 {
  if (value === 0 || value === 1 || value === 2) return value;
  return 0;
}

export function buildTimeline30(input: Timeline30Input): Timeline {
  if (input.day !== 1 && input.day !== 2 && input.day !== 3) throw new Error("Unknown session");
  const session = getSession(input.week, input.day as Day30);
  const choice = (id: string) => level(input.choices[id]);
  const moveSlot = (id: string): Move30 => {
    const slot = session.slots.find((entry) => entry.id === id && entry.kind === "move");
    if (!slot || slot.kind !== "move") throw new Error(`Missing move ${id}`);
    return slot.versions[choice(id)];
  };
  const circuitMoves = (): Move30[] => {
    const slot = session.slots.find((entry) => entry.kind === "circuit");
    if (!slot || slot.kind !== "circuit") throw new Error("Missing circuit");
    return slot.versions[choice(slot.id)];
  };
  const finisherParts = (): Part30[] => {
    const slot = session.slots.find((entry) => entry.kind === "parts");
    if (!slot || slot.kind !== "parts") throw new Error("Missing finisher");
    return slot.versions[choice(slot.id)];
  };

  const steps: Step[] = warmupMoves(session.wrists).map((item, index) => ({
    phase: "warmup" as const,
    mode: "warmup" as const,
    start: index * MINUTE,
    end: (index + 1) * MINUTE,
    move: resolve30(item, "warmup", false),
    appearance: 0,
    coach: "Easy pace. Do not force the right hip.",
  }));

  const emom = (phase: "blockA" | "blockB", firstId: string, secondId: string, start: number) => {
    const first = resolve30(moveSlot(firstId), firstId, input.vestOn);
    const second = resolve30(moveSlot(secondId), secondId, input.vestOn);
    for (let i = 0; i < 10; i += 1) {
      steps.push({
        phase,
        mode: "emom",
        start: start + i * MINUTE,
        end: start + (i + 1) * MINUTE,
        move: i % 2 === 0 ? first : second,
        appearance: Math.floor(i / 2),
      });
    }
  };

  if (session.format === "emom") {
    emom("blockA", "a1", "a2", WARMUP_30);
    emom("blockB", "b1", "b2", BLOCK_A_30);
  } else if (session.format === "steady-amrap") {
    const steady = moveSlot("blockA");
    steps.push({
      phase: "blockA",
      mode: "steady",
      start: WARMUP_30,
      end: BLOCK_A_30,
      move: resolve30(steady, "blockA", false),
      appearance: 0,
      coach: steady.coach ?? "Slow and smooth for 10 minutes.",
    });
    const round = circuitMoves().map((item, index) => resolve30(item, `c${index}`, input.vestOn));
    steps.push({
      phase: "blockB",
      mode: "amrap",
      start: BLOCK_A_30,
      end: BLOCK_B_30,
      move: round[0],
      circuit: round,
      appearance: 0,
      coach: amrapCoach(session.week),
    });
  } else {
    emom("blockA", "a1", "a2", WARMUP_30);
    const round = circuitMoves().map((item, index) => resolve30(item, `c${index}`, input.vestOn));
    steps.push({
      phase: "blockB",
      mode: "amrap",
      start: BLOCK_A_30,
      end: BLOCK_B_30,
      move: round[0],
      circuit: round,
      appearance: 0,
      coach: amrapCoach(session.week),
    });
  }

  let cursor = BLOCK_B_30;
  for (const piece of finisherParts()) {
    const end = cursor + piece.ms;
    steps.push({
      phase: "finisher",
      mode: "finisher",
      start: cursor,
      end,
      move: resolve30(piece.move, "finisher", input.vestOn),
      appearance: 0,
      coach: piece.move.name === "Rest" ? "Rest. The hip stretches are next." : "Hard close. Keep the form clean.",
      modeLabel: "Finisher",
    });
    cursor = end;
  }
  for (const piece of hipStretches()) {
    const end = cursor + piece.ms;
    steps.push({
      phase: "hips",
      mode: "stretch",
      start: cursor,
      end,
      move: resolve30(piece.move, "hips", false),
      appearance: 0,
      coach: "Right side first. A firm pull is enough. Ease off if the front of the hip pinches.",
      modeLabel: "Stretches",
    });
    cursor = end;
  }

  const circuit = steps.find((step) => step.mode === "amrap")?.circuit?.map((item) => present(item, 0, 0)) ?? [];
  return {
    week: input.week === "A" ? 1 : 2,
    day: session.day,
    title: session.title,
    eyebrow: `Week ${session.week} · ${session.weekday}`,
    format: session.format,
    steps,
    circuit,
    sessionMs: cursor,
    tracksRounds: circuit.length > 0,
    legacyGuides: false,
  };
}

function phaseMeta(phase: PhaseId, mode: StepMode | "done"): { label: string; modeLabel: string; coach: string; start: number; end: number } {
  if (phase === "warmup") {
    return { label: "Warm-up", modeLabel: "Easy pace", coach: "Halos, squats, then light swings.", start: 0, end: WARMUP_END };
  }
  if (phase === "blockA" && mode === "steady") {
    return { label: "Block A", modeLabel: "Steady", coach: "Keep moving for 8 minutes. Switch sides each rep.", start: WARMUP_END, end: BLOCK_A_END };
  }
  if (phase === "blockA") {
    return { label: "Block A", modeLabel: "EMOM", coach: "Do the reps, then rest out the minute.", start: WARMUP_END, end: BLOCK_A_END };
  }
  if (phase === "blockB" && mode === "amrap") {
    return { label: "Block B", modeLabel: "AMRAP", coach: "As many rounds as you can. Add one each time you finish.", start: BLOCK_A_END, end: BLOCK_B_END };
  }
  if (phase === "blockB") {
    return { label: "Block B", modeLabel: "EMOM", coach: "Do the reps, then rest out the minute.", start: BLOCK_A_END, end: BLOCK_B_END };
  }
  if (phase === "finisher") {
    return { label: "Finisher", modeLabel: "Last minute", coach: "Last minute. Stay with it.", start: BLOCK_B_END, end: SESSION_MS };
  }
  if (phase === "hips") {
    return { label: "Hip stretches", modeLabel: "Stretches", coach: "Right side first. A firm pull is enough.", start: 0, end: 0 };
  }
  return { label: "Done", modeLabel: "Complete", coach: "That's 20 minutes.", start: SESSION_MS, end: SESSION_MS };
}

function captionFor(phase: PhaseId, mode: StepMode | "done", stepMs: number, phaseMs: number): string {
  if (phase === "done") return "Complete";
  if (mode === "emom" || mode === "warmup") return "This minute";
  if (mode === "stretch") return "This side";
  if (mode === "finisher" && stepMs < phaseMs) return "This part";
  return "Block left";
}

export function snapshotAt(timeline: Timeline, elapsedMs: number, circuitIndex = 0, round = 0): Snapshot {
  const sessionMs = timeline.sessionMs;
  const elapsed = Math.max(0, Math.min(sessionMs, elapsedMs));
  if (elapsed >= sessionMs) {
    const meta = phaseMeta("done", "done");
    const coach = sessionMs === SESSION_MS ? "That's 20 minutes." : "That's 30 minutes.";
    return {
      elapsedMs: sessionMs,
      remainingSessionMs: 0,
      stepRemainingMs: 0,
      stepDurationMs: 0,
      phase: "done",
      phaseLabel: meta.label,
      mode: "done",
      modeLabel: meta.modeLabel,
      coach,
      handover: null,
      minuteInPhase: 1,
      minutesInPhase: 1,
      current: null,
      next: null,
      sessionMs,
      caption: "Complete",
    };
  }

  const step = timeline.steps.find((entry) => elapsed >= entry.start && elapsed < entry.end) ?? timeline.steps[timeline.steps.length - 1];
  const local = elapsed - step.start;
  const meta = phaseMeta(step.phase, step.mode);
  const phaseSteps = timeline.steps.filter((entry) => entry.phase === step.phase);
  const phaseStart = phaseSteps[0]?.start ?? step.start;
  const phaseEnd = phaseSteps[phaseSteps.length - 1]?.end ?? step.end;
  const minutes = Math.max(1, Math.round((phaseEnd - phaseStart) / MINUTE));
  const minute = Math.min(minutes, Math.floor((elapsed - phaseStart) / MINUTE) + 1);
  const lastPhase = timeline.steps[timeline.steps.length - 1]?.phase;

  let currentMove = step.move;
  let nextMove: ResolvedMove | null = null;
  const shown = step.mode === "amrap" ? round : step.appearance;
  if (step.mode === "amrap" && step.circuit && step.circuit.length > 0) {
    const count = step.circuit.length;
    const index = ((circuitIndex % count) + count) % count;
    currentMove = step.circuit[index];
    nextMove = step.circuit[(index + 1) % count];
  } else {
    const index = timeline.steps.indexOf(step);
    nextMove = timeline.steps[index + 1]?.move ?? null;
  }

  return {
    elapsedMs: elapsed,
    remainingSessionMs: sessionMs - elapsed,
    stepRemainingMs: step.end - elapsed,
    stepDurationMs: step.end - step.start,
    phase: step.phase,
    phaseLabel: meta.label,
    mode: step.mode,
    modeLabel: step.modeLabel ?? meta.modeLabel,
    coach: step.coach ?? currentMove.coach ?? meta.coach,
    handover: handoverLine(step.phase, minute, minutes, step.phase === lastPhase),
    minuteInPhase: minute,
    minutesInPhase: minutes,
    current: present(currentMove, shown, local),
    next: nextMove ? present(nextMove, step.mode === "amrap" ? round : 0, 0) : null,
    sessionMs,
    caption: captionFor(step.phase, step.mode, step.end - step.start, phaseEnd - phaseStart),
  };
}

function handoverLine(phase: PhaseId, minute: number, minutes: number, lastPhase: boolean): string | null {
  if (minute !== minutes) return null;
  if (phase === "warmup") return "Warm-up is over after this minute.";
  if (phase === "blockA") return "Block A is over after this minute.";
  if (phase === "blockB") return "Block B is over after this minute.";
  if (phase === "finisher" && lastPhase) return "The session is over after this minute.";
  if (phase === "finisher") return "The finisher is over after this minute.";
  if (phase === "hips") return "The session is over after this minute.";
  return null;
}

/**
 * A short tick at 5, 4, 3, 2 and 1 seconds left in every minute.
 * The minute itself beeps at :00. Block changes at 3:00, 11:00 and 19:00 use a double tone instead.
 */
export function sessionDuration(timeline: Timeline): number {
  return timeline.sessionMs;
}

/** Minute ticks, minute beeps, and a block tone wherever the phase changes. Matches eventsBetween on a 20-minute session. */
export function cuesBetween(timeline: Timeline, prev: number, next: number): Cue[] {
  if (next <= prev) return [];
  const sessionMs = timeline.sessionMs;
  const boundaries = new Set<number>();
  for (let i = 0; i < timeline.steps.length - 1; i += 1) {
    if (timeline.steps[i].phase !== timeline.steps[i + 1].phase) boundaries.add(timeline.steps[i].end);
  }
  const timed: Array<{ t: number; cue: Cue }> = [];
  const minutes = Math.round(sessionMs / MINUTE);
  for (let minute = 0; minute < minutes; minute += 1) {
    for (let left = 5; left >= 1; left -= 1) {
      const t = minute * MINUTE + (60 - left) * 1000;
      if (t > prev && t <= next) timed.push({ t, cue: "tick" });
    }
    const end = (minute + 1) * MINUTE;
    if (end > prev && end <= next && end <= sessionMs) {
      if (end === sessionMs) timed.push({ t: end, cue: "done" });
      else if (boundaries.has(end)) timed.push({ t: end, cue: "block" });
      else timed.push({ t: end, cue: "minute" });
    }
  }
  for (const step of timeline.steps) {
    if (step.end > prev && step.end <= next && step.end < sessionMs && step.end % MINUTE !== 0) {
      timed.push({ t: step.end, cue: "minute" });
    }
  }
  timed.sort((a, b) => a.t - b.t);
  return timed.map((item) => item.cue);
}

export function eventsBetween(prev: number, next: number): Cue[] {
  if (next <= prev) return [];
  const cues: Cue[] = [];
  for (let minute = 0; minute < 20; minute += 1) {
    for (let left = 5; left >= 1; left -= 1) {
      const t = minute * MINUTE + (60 - left) * 1000;
      if (t > prev && t <= next) cues.push("tick");
    }
    const end = (minute + 1) * MINUTE;
    if (end > prev && end <= next) {
      if (end === SESSION_MS) cues.push("done");
      else if (end === WARMUP_END || end === BLOCK_A_END || end === BLOCK_B_END) cues.push("block");
      else cues.push("minute");
    }
  }
  return cues;
}

export function formatClock(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSeconds = safe === 0 ? 0 : Math.ceil(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export class SessionRunner {
  private timeline: Timeline;
  private now: () => number;
  private baseElapsed = 0;
  private startedAt: number | null = null;
  private lastElapsed = 0;

  constructor(timeline: Timeline, now: () => number) {
    this.timeline = timeline;
    this.now = now;
  }

  get running(): boolean {
    return this.startedAt !== null;
  }

  elapsed(): number {
    if (this.startedAt === null) return this.baseElapsed;
    return Math.min(this.timeline.sessionMs, this.baseElapsed + (this.now() - this.startedAt));
  }

  start(): void {
    if (this.startedAt !== null || this.elapsed() >= this.timeline.sessionMs) return;
    this.startedAt = this.now();
  }

  pause(): void {
    if (this.startedAt === null) return;
    this.baseElapsed = this.elapsed();
    this.startedAt = null;
  }

  reset(): void {
    this.baseElapsed = 0;
    this.startedAt = null;
    this.lastElapsed = 0;
  }

  snapshot(circuitIndex = 0, round = 0): Snapshot {
    return snapshotAt(this.timeline, this.elapsed(), circuitIndex, round);
  }

  poll(circuitIndex = 0, round = 0): { snapshot: Snapshot; cues: Cue[] } {
    const elapsed = this.elapsed();
    const cues = cuesBetween(this.timeline, this.lastElapsed, elapsed);
    this.lastElapsed = elapsed;
    if (elapsed >= this.timeline.sessionMs && this.startedAt !== null) {
      this.baseElapsed = this.timeline.sessionMs;
      this.startedAt = null;
    }
    return { snapshot: snapshotAt(this.timeline, elapsed, circuitIndex, round), cues };
  }
}
