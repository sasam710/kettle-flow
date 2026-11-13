import { DAY_COUNT, WEEK_COUNT } from "./plan.ts";

export const PROGRESS_KEY = "kettlebell-timer.v1";
export const SESSION_COUNT = WEEK_COUNT * DAY_COUNT;

/**
 * Furthest sessions Sam had already logged when the timer was set up.
 * Next session is the one after the furthest of these, which is Week 2 Day 2.
 * Week 1 Days 4 and 5 stay open on purpose.
 */
export const SEED_COMPLETED = ["1-1", "1-2", "1-3", "2-1"];

export type Progress = { completed: string[] };

export type Store = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function sessionKey(week: number, day: number): string {
  return `${week}-${day}`;
}

export function parseSessionKey(id: string): { week: number; day: number } | null {
  const match = /^([1-8])-([1-5])$/.exec(id);
  if (!match) return null;
  return { week: Number(match[1]), day: Number(match[2]) };
}

export function sessionIndex(week: number, day: number): number {
  return (week - 1) * DAY_COUNT + (day - 1);
}

export function sessionFromIndex(index: number): { week: number; day: number } | null {
  if (index < 0 || index >= SESSION_COUNT) return null;
  return { week: Math.floor(index / DAY_COUNT) + 1, day: (index % DAY_COUNT) + 1 };
}

/** The session after the furthest one marked done. Gaps earlier in the plan stay gaps. */
export function nextSession(progress: Progress): { week: number; day: number } | null {
  let max = -1;
  for (const id of progress.completed) {
    const parsed = parseSessionKey(id);
    if (!parsed) continue;
    max = Math.max(max, sessionIndex(parsed.week, parsed.day));
  }
  return sessionFromIndex(max + 1);
}

export function loadProgress(store: Store): Progress {
  let raw: string | null = null;
  try {
    raw = store.getItem(PROGRESS_KEY);
  } catch {
    raw = null;
  }
  if (raw == null) return { completed: [...SEED_COMPLETED] };
  try {
    const parsed = JSON.parse(raw) as { completed?: unknown };
    if (!parsed || !Array.isArray(parsed.completed)) return { completed: [...SEED_COMPLETED] };
    const completed = parsed.completed.filter((id): id is string => typeof id === "string" && parseSessionKey(id) !== null);
    return { completed: [...new Set(completed)] };
  } catch {
    return { completed: [...SEED_COMPLETED] };
  }
}

export function saveProgress(store: Store, progress: Progress): boolean {
  try {
    store.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function markDone(store: Store, week: number, day: number): { progress: Progress; saved: boolean } {
  return setSessionDone(store, week, day, true);
}

/** Saves a done or to-do state. An explicit to-do stays to-do, including the four sessions that start as done. */
export function setSessionDone(store: Store, week: number, day: number, done: boolean): { progress: Progress; saved: boolean } {
  const progress = loadProgress(store);
  const id = sessionKey(week, day);
  const has = progress.completed.includes(id);
  if (done && !has) progress.completed.push(id);
  if (!done && has) progress.completed = progress.completed.filter((entry) => entry !== id);
  return { progress, saved: saveProgress(store, progress) };
}
