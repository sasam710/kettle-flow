import type { Store } from "./progress.ts";

export const CHOICE_KEY = "kettlebell-timer.choice.v1";
export const DONE30_KEY = "kettlebell-timer.plan30.v1";
export const WEEK30_COUNT = 8;
export const SESSION30_COUNT = WEEK30_COUNT * 3;

export type PlanId = "5x20" | "3x30";
export type WeekAB = "A" | "B";
export type Day30 = 1 | 2 | 3;

export type Choice = {
  plan: PlanId;
  week: number;
  day: Day30;
};

export const DEFAULT_CHOICE: Choice = { plan: "5x20", week: 1, day: 1 };

/** Odd programme weeks use the Week A sessions, even weeks use Week B. */
export function patternForWeek(week: number): WeekAB {
  return week % 2 === 1 ? "A" : "B";
}

export function sessionKey30(week: number, day: number): string {
  return `${week}-${day}`;
}

export function parseSessionKey30(id: string): { week: number; day: Day30 } | null {
  const current = /^([1-8])-([123])$/.exec(id);
  if (current) return { week: Number(current[1]), day: Number(current[2]) as Day30 };
  const legacy = /^([AB])-([123])$/.exec(id);
  if (!legacy) return null;
  return { week: legacy[1] === "A" ? 1 : 2, day: Number(legacy[2]) as Day30 };
}

function parseWeek(value: unknown): number {
  if (value === "A") return 1;
  if (value === "B") return 2;
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= WEEK30_COUNT) return value;
  return 1;
}

export function loadChoice(store: Store): Choice {
  const raw = read(store, CHOICE_KEY);
  if (!raw) return { ...DEFAULT_CHOICE };
  try {
    const parsed = JSON.parse(raw) as Partial<Choice> & { week?: unknown };
    return {
      plan: parsed.plan === "3x30" ? "3x30" : "5x20",
      week: parseWeek(parsed.week),
      day: parsed.day === 2 || parsed.day === 3 ? parsed.day : 1,
    };
  } catch {
    return { ...DEFAULT_CHOICE };
  }
}

export function saveChoice(store: Store, choice: Choice): boolean {
  return write(store, CHOICE_KEY, JSON.stringify(choice));
}

export function loadDone30(store: Store): string[] {
  const raw = read(store, DONE30_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { completed?: unknown };
    if (!parsed || !Array.isArray(parsed.completed)) return [];
    const completed: string[] = [];
    for (const id of parsed.completed) {
      if (typeof id !== "string") continue;
      const parsedId = parseSessionKey30(id);
      if (!parsedId) continue;
      const key = sessionKey30(parsedId.week, parsedId.day);
      if (!completed.includes(key)) completed.push(key);
    }
    return completed;
  } catch {
    return [];
  }
}

export function setDone30(store: Store, week: number, day: Day30, done: boolean): { completed: string[]; saved: boolean } {
  const completed = loadDone30(store);
  const id = sessionKey30(week, day);
  const has = completed.includes(id);
  const next = done && !has ? [...completed, id] : !done && has ? completed.filter((entry) => entry !== id) : completed;
  return { completed: next, saved: write(store, DONE30_KEY, JSON.stringify({ completed: next })) };
}

/** First open day in this week, or null if the week is complete. */
export function nextOpenDay(completed: string[], week: number): Day30 | null {
  for (const candidate of [1, 2, 3] as const) {
    if (!completed.includes(sessionKey30(week, candidate))) return candidate;
  }
  return null;
}

/** The next open session after this one. Later days in the same week first, then earlier gaps in the week, then the next week. */
export function nextAfter(completed: string[], week: number, day: Day30 | 0): { week: number; day: Day30 } | null {
  for (const candidate of [1, 2, 3] as const) {
    if (candidate > day && !completed.includes(sessionKey30(week, candidate))) return { week, day: candidate };
  }
  for (const candidate of [1, 2, 3] as const) {
    if (!completed.includes(sessionKey30(week, candidate))) return { week, day: candidate };
  }
  for (let nextWeek = week + 1; nextWeek <= WEEK30_COUNT; nextWeek += 1) {
    const open = nextOpenDay(completed, nextWeek);
    if (open) return { week: nextWeek, day: open };
  }
  return null;
}

function read(store: Store, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function write(store: Store, key: string, value: string): boolean {
  try {
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
