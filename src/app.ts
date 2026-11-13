import { CuePlayer } from "./audio.ts";
import {
  SESSION30_COUNT,
  WEEK30_COUNT,
  loadChoice,
  loadDone30,
  nextAfter,
  patternForWeek,
  saveChoice,
  sessionKey30,
  setDone30,
  type Choice,
  type Day30,
  type PlanId,
} from "./choice.ts";
import type { AnimId } from "./figure/animations.ts";
import { ExerciseVisual, type VisualClip } from "./figure/visual.ts";
import {
  HIP_NOTE,
  LEVEL_LABELS,
  VEST_HINT,
  formatNote,
  getProgrammeSession,
  pickerSlots,
  sessionsFor,
  type Move30,
  type PickerOption,
} from "./plan30.ts";
import {
  COLUMN_LABELS,
  DAY_COUNT,
  DAYS,
  WEEK_COUNT,
  defaultVersion,
  getDay,
  phaseName,
  type Version,
} from "./plan.ts";
import {
  SESSION_COUNT,
  loadProgress,
  markDone,
  setSessionDone,
  nextSession,
  sessionKey,
  type Progress,
  type Store,
} from "./progress.ts";
import {
  SessionRunner,
  buildTimeline,
  buildTimeline30,
  formatClock,
  type Cue,
  type DisplayMove,
  type Timeline,
} from "./timer.ts";
import { HOW_TO } from "./tutorials.ts";
import { ScreenAwake } from "./wake.ts";

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[char] ?? char;
  });
}

function moveLine(move: DisplayMove | null): string {
  if (!move) return "Mark the session when you finish";
  const vest = move.vest ? " · with vest" : "";
  const side = move.sideLabel ? ` · ${move.sideLabel}` : "";
  return `${move.name} · ${move.reps}${vest}${side}`;
}

export class App {
  private root: HTMLElement;
  private store: Store;
  private progress: Progress;
  private week: number;
  private day: number;
  private choices: Record<string, 0 | 1 | 2> = {};
  private vestOn = true;
  private previewSlot = "a1";
  private notice = "";
  private screen: "setup" | "session" = "setup";
  private runner: SessionRunner | null = null;
  private timeline: Timeline | null = null;
  private visual: ExerciseVisual | null = null;
  private audio = new CuePlayer();
  private wake = new ScreenAwake();
  private raf = 0;
  private rounds = 0;
  private circuitIndex = 0;
  private wakeNote = false;
  private liveSecond = -1;
  private plan: PlanId;
  private week30: number;
  private day30: Day30;
  private done30: string[];

  constructor(root: HTMLElement, store: Store) {
    this.root = root;
    this.store = store;
    this.progress = loadProgress(store);
    const choice = loadChoice(store);
    this.plan = choice.plan;
    this.week30 = choice.week;
    this.day30 = choice.day;
    this.done30 = loadDone30(store);
    const next = nextSession(this.progress);
    this.week = next?.week ?? WEEK_COUNT;
    this.day = next?.day ?? DAY_COUNT;
    if (this.plan === "3x30") this.applyDefaults30();
    else this.applyDefaults();
    this.root.addEventListener("click", this.onClick);
    this.renderSetup();
  }

  private onClick = (event: Event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-action]");
    if (!target) return;
    const action = target.dataset.action ?? "";
    if (action === "plan") this.setPlan(target.dataset.plan === "3x30" ? "3x30" : "5x20");
    else if (action === "week") this.setWeek(Number(target.dataset.week));
    else if (action === "day") this.setDay(Number(target.dataset.day));
    else if (action === "status") this.toggleStatus(Number(target.dataset.day));
    else if (action === "version") this.setVersion(target.dataset.slot ?? "", Number(target.dataset.index));
    else if (action === "vest") this.toggleVest();
    else if (action === "start") this.onStart();
    else if (action === "pause") this.onPause();
    else if (action === "reset") this.onReset();
    else if (action === "back") this.onBack();
    else if (action === "mark") this.onMark();
    else if (action === "round-add") this.changeRounds(1);
    else if (action === "round-sub") this.changeRounds(-1);
    else if (action === "circuit") {
      this.circuitIndex = Number(target.dataset.index) || 0;
      this.paint();
    }
  };

  private applyDefaults(): void {
    const day = getDay(this.day);
    const version = defaultVersion(this.week);
    this.choices = {};
    for (const slot of day.slots) this.choices[slot.id] = version;
    this.previewSlot = day.slots[0]?.id ?? "a1";
  }

  private applyDefaults30(): void {
    const session = getProgrammeSession(this.week30, this.day30);
    this.choices = {};
    for (const slot of session.slots) this.choices[slot.id] = 0;
    this.previewSlot = session.slots[0]?.id ?? "a1";
  }

  private persistChoice(): void {
    const choice: Choice = { plan: this.plan, week: this.week30, day: this.day30 };
    if (!saveChoice(this.store, choice) && this.plan === "3x30") {
      this.notice = "Couldn't save on this browser. The plan choice will last until you close the tab.";
    }
  }

  private setPlan(plan: PlanId): void {
    if (this.screen !== "setup" || plan === this.plan) return;
    this.plan = plan;
    this.notice = "";
    if (plan === "3x30") this.applyDefaults30();
    else this.applyDefaults();
    this.persistChoice();
    this.renderSetup();
  }

  private setWeek(week: number): void {
    if (this.screen !== "setup") return;
    if (this.plan === "3x30") {
      if (week < 1 || week > WEEK30_COUNT) return;
      this.week30 = week;
      this.notice = "";
      this.applyDefaults30();
      this.persistChoice();
      this.renderSetup();
      return;
    }
    if (week < 1 || week > WEEK_COUNT) return;
    this.week = week;
    this.notice = "";
    this.applyDefaults();
    this.renderSetup();
  }

  private setDay(day: number): void {
    if (this.screen !== "setup") return;
    if (this.plan === "3x30") {
      if (day !== 1 && day !== 2 && day !== 3) return;
      this.day30 = day;
      this.notice = "";
      this.applyDefaults30();
      this.persistChoice();
      this.renderSetup();
      return;
    }
    if (day < 1 || day > DAY_COUNT) return;
    this.day = day;
    this.notice = "";
    this.applyDefaults();
    this.renderSetup();
  }

  private setVersion(slotId: string, index: number): void {
    if (this.screen !== "setup" || (index !== 0 && index !== 1 && index !== 2)) return;
    const known =
      this.plan === "3x30"
        ? getProgrammeSession(this.week30, this.day30).slots.some((slot) => slot.id === slotId)
        : getDay(this.day).slots.some((slot) => slot.id === slotId);
    if (!known) return;
    this.choices[slotId] = index;
    this.previewSlot = slotId;
    this.renderSetup();
  }

  private toggleStatus(day: number): void {
    if (this.screen !== "setup") return;
    if (this.plan === "3x30") {
      if (day !== 1 && day !== 2 && day !== 3) return;
      const id = sessionKey30(this.week30, day);
      const saved = setDone30(this.store, this.week30, day, !this.done30.includes(id));
      this.done30 = saved.completed;
      this.notice = saved.saved ? "" : "Couldn't save on this browser. Progress will last until you close the tab.";
      this.renderSetup();
      return;
    }
    if (day < 1 || day > DAY_COUNT) return;
    const done = this.progress.completed.includes(sessionKey(this.week, day));
    const saved = setSessionDone(this.store, this.week, day, !done);
    this.progress = saved.progress;
    this.notice = saved.saved ? "" : "Couldn't save on this browser. Progress will last until you close the tab.";
    this.renderSetup();
  }

  private toggleVest(): void {
    if (this.screen !== "setup") return;
    this.vestOn = !this.vestOn;
    this.renderSetup();
  }

  private onStart(): void {
    this.audio.unlock();
    void this.wake.acquire().then((ok) => {
      this.wakeNote = !ok;
      if (this.screen === "session") this.paint();
    });
    if (!this.runner || this.screen === "setup") {
      this.timeline =
        this.plan === "3x30"
          ? buildTimeline30({
              week: patternForWeek(this.week30),
              day: this.day30,
              choices: this.choices,
              vestOn: this.vestOn,
            })
          : buildTimeline({
              week: this.week,
              day: this.day,
              choices: this.choices,
              vestOn: this.vestOn,
            });
      this.runner = new SessionRunner(this.timeline, () => performance.now());
      this.rounds = 0;
      this.circuitIndex = 0;
      this.screen = "session";
      this.renderSession();
    }
    this.runner.start();
    this.visual?.setPlaying(true);
    cancelAnimationFrame(this.raf);
    this.tick();
  }

  private onPause(): void {
    this.runner?.pause();
    this.visual?.setPlaying(false);
    cancelAnimationFrame(this.raf);
    this.paint();
  }

  private onReset(): void {
    this.runner?.reset();
    this.rounds = 0;
    this.circuitIndex = 0;
    this.visual?.setPlaying(false);
    cancelAnimationFrame(this.raf);
    this.paint();
  }

  private onBack(): void {
    this.leaveSession();
    this.renderSetup();
  }

  private onMark(): void {
    const finished = this.screen === "session" && this.runner?.snapshot(this.circuitIndex, this.rounds).phase === "done";
    if (this.plan === "3x30") {
      this.mark30(finished);
      return;
    }
    if (!finished && !window.confirm(`Mark Week ${this.week} Day ${this.day} done?`)) return;
    const saved = markDone(this.store, this.week, this.day);
    this.progress = saved.progress;
    const next = nextSession(this.progress);
    if (!saved.saved) this.notice = "Couldn't save on this browser. Progress will last until you close the tab.";
    else if (next) this.notice = `Saved. Next session: Week ${next.week} Day ${next.day}.`;
    else this.notice = "Saved. Programme complete.";
    if (next) {
      this.week = next.week;
      this.day = next.day;
    }
    this.applyDefaults();
    this.leaveSession();
    this.renderSetup();
  }

  private mark30(finished: boolean): void {
    const session = getProgrammeSession(this.week30, this.day30);
    const fromWeek = this.week30;
    if (!finished && !window.confirm(`Mark Week ${fromWeek} ${session.weekday} done?`)) return;
    const saved = setDone30(this.store, fromWeek, this.day30, true);
    this.done30 = saved.completed;
    const next = nextAfter(saved.completed, fromWeek, this.day30);
    if (!saved.saved) this.notice = "Couldn't save on this browser. Progress will last until you close the tab.";
    else if (next) {
      this.week30 = next.week;
      this.day30 = next.day;
      const following = getProgrammeSession(next.week, next.day);
      this.notice =
        next.week === fromWeek
          ? `Saved. Next in Week ${next.week}: ${following.weekday}.`
          : `Saved. Week ${fromWeek} is logged. Next is Week ${next.week} ${following.weekday}.`;
    } else this.notice = "Saved. That's the 8-week plan done.";
    this.persistChoice();
    this.applyDefaults30();
    this.leaveSession();
    this.renderSetup();
  }

  private changeRounds(delta: number): void {
    this.rounds = Math.max(0, this.rounds + delta);
    if (delta > 0) this.circuitIndex = 0;
    this.paint();
  }

  private leaveSession(): void {
    cancelAnimationFrame(this.raf);
    this.runner?.pause();
    this.runner = null;
    this.timeline = null;
    this.screen = "setup";
    this.rounds = 0;
    this.circuitIndex = 0;
    void this.wake.release();
    this.destroyVisual();
  }

  private tick = (): void => {
    if (!this.runner) return;
    const polled = this.runner.poll(this.circuitIndex, this.rounds);
    this.playCues(polled.cues);
    this.paint(polled.snapshot);
    if (this.runner.running) this.raf = requestAnimationFrame(this.tick);
  };

  private playCues(cues: Cue[]): void {
    if (cues.length === 0) return;
    if (cues.length > 2) {
      this.audio.play(cues.includes("done") ? "done" : cues[cues.length - 1]);
      return;
    }
    for (const cue of cues) this.audio.play(cue);
  }

  private renderSetup(): void {
    if (this.plan === "3x30") {
      this.renderSetup30();
      return;
    }
    const y = window.scrollY;
    this.destroyVisual();
    const day = getDay(this.day);
    const next = nextSession(this.progress);
    const doneCount = this.progress.completed.length;
    const nextText = next ? `Next session: Week ${next.week} Day ${next.day}` : "Programme complete";
    const planNote = `This week defaults to the ${phaseName(this.week)} moves.`;
    const formatNote =
      day.format === "getup"
        ? "3 min warm-up, 8 min steady get-ups, 8 min AMRAP, then a 1 min finisher."
        : "3 min warm-up, 8 min block A EMOM, 8 min block B EMOM, then a 1 min finisher.";
    const preview = this.previewVersion();
    this.root.innerHTML = `
      <main class="setup">
        <header class="top">
          <p class="eyebrow">Sam · 20 minutes</p>
          <h1>Kettlebell</h1>
          <p class="gear">22 lb kettlebell · 10 lb vest</p>
          <p class="next">${esc(nextText)}</p>
          <p class="count">${doneCount} of ${SESSION_COUNT} done</p>
          ${this.notice ? `<p class="notice" role="status">${esc(this.notice)}</p>` : ""}
        </header>
        ${this.planSwitcher()}
        <section>
          <h2>Week</h2>
          <p class="hint">${esc(planNote)}</p>
          <div class="weeks" role="group" aria-label="Week">
            ${Array.from({ length: WEEK_COUNT }, (_, index) => {
              const week = index + 1;
              const pressed = week === this.week ? "true" : "false";
              return `<button type="button" class="chip week${week === this.week ? " is-on" : ""}" data-action="week" data-week="${week}" aria-pressed="${pressed}">${week}</button>`;
            }).join("")}
          </div>
        </section>
        <section>
          <h2>Day</h2>
          <div class="days" role="group" aria-label="Day">
            ${DAYS.map((entry) => {
              const on = entry.day === this.day;
              const logged = this.progress.completed.includes(sessionKey(this.week, entry.day));
              return `<div class="day-row">
                <button type="button" class="day${on ? " is-on" : ""}" data-action="day" data-day="${entry.day}" aria-pressed="${on}">
                  <span class="day-no">Day ${entry.day}</span>
                  <span class="day-name">${esc(entry.title)}</span>
                </button>
                <button type="button" class="status${logged ? " is-done" : " is-todo"}" data-action="status" data-day="${entry.day}" aria-pressed="${logged}">${logged ? "Done" : "To-do"}</button>
              </div>`;
            }).join("")}
          </div>
        </section>
        <button type="button" class="switch${this.vestOn ? " is-on" : ""}" data-action="vest" role="switch" aria-checked="${this.vestOn}">
          <span><strong>Vest</strong><small>${this.vestOn ? "On for marked moves" : "Off for the whole session"}</small></span>
          <span class="knob" aria-hidden="true"></span>
        </button>
        <section class="preview">
          <div class="figure-frame" data-field="preview"><div data-field="visual"></div></div>
          <p class="preview-name">${esc(preview.name)}</p>
          <p class="preview-reps">${esc(this.versionText(preview))}</p>
          <a class="howto" href="${esc(HOW_TO[preview.animation])}" target="_blank" rel="noopener noreferrer">How to do this</a>
        </section>
        <section class="slots">
          ${day.slots.map((slot) => this.slotCard(slot.id, slot.label, slot.versions)).join("")}
        </section>
        <p class="hint format-note">${esc(formatNote)}</p>
        <button type="button" class="btn btn-ghost mark-quiet" data-action="mark">Mark this session done</button>
        <div class="spacer"></div>
        <div class="start-bar">
          <button type="button" class="btn btn-primary" data-action="start">
            <span>Start</span>
            <small>Week ${this.week} · Day ${this.day}</small>
          </button>
        </div>
      </main>
    `;
    this.mountPreview();
    window.scrollTo(0, y);
  }

  private renderSetup30(): void {
    const y = window.scrollY;
    this.destroyVisual();
    const session = getProgrammeSession(this.week30, this.day30);
    const pattern = patternForWeek(this.week30);
    const days = sessionsFor(pattern);
    const logged = days.filter((entry) => this.done30.includes(sessionKey30(this.week30, entry.day))).length;
    const open = days.filter((entry) => !this.done30.includes(sessionKey30(this.week30, entry.day)));
    const total = this.done30.length;
    const nextText = open.length
      ? `Still to do in Week ${this.week30}: ${open.map((entry) => entry.weekday).join(", ")}`
      : this.week30 < WEEK30_COUNT
        ? `Week ${this.week30} is logged. Week ${this.week30 + 1} is ready when you are.`
        : total >= SESSION30_COUNT
          ? "That's the 8-week plan done."
          : `Week ${this.week30} is logged.`;
    const preview = this.preview30();
    const previewGuide = preview.example;
    const hipBody = HIP_NOTE.replace(/^Right hip:\s*/i, "");
    const weekHint =
      pattern === "A"
        ? `Week ${this.week30} of 8 uses the Week A sessions: legs and power, upper push and pull, and get-ups. Odd weeks are A, even weeks are B.`
        : `Week ${this.week30} of 8 uses the Week B sessions: single-leg and hinge, overhead and grip, and full body and carries. Odd weeks are A, even weeks are B.`;
    this.root.innerHTML = `
      <main class="setup">
        <header class="top">
          <p class="eyebrow">Sam · 30 minutes</p>
          <h1>Kettlebell</h1>
          <p class="gear">22 lb kettlebell · 10 lb vest optional</p>
          <p class="next">${esc(nextText)}</p>
          <p class="count">${logged} of 3 logged in Week ${this.week30} · ${total} of ${SESSION30_COUNT} on the plan</p>
          ${this.notice ? `<p class="notice" role="status">${esc(this.notice)}</p>` : ""}
        </header>
        ${this.planSwitcher()}
        <section>
          <h2>Week</h2>
          <p class="hint">${esc(weekHint)}</p>
          <div class="weeks" role="group" aria-label="Week">
            ${Array.from({ length: WEEK30_COUNT }, (_, index) => {
              const week = index + 1;
              const on = week === this.week30;
              const letter = patternForWeek(week);
              return `<button type="button" class="chip week${on ? " is-on" : ""}" data-action="week" data-week="${week}" aria-pressed="${on}">
                ${week}<small>${letter}</small>
              </button>`;
            }).join("")}
          </div>
        </section>
        <section>
          <h2>Day</h2>
          <div class="days" role="group" aria-label="Day">
            ${days.map((entry) => {
              const on = entry.day === this.day30;
              const done = this.done30.includes(sessionKey30(this.week30, entry.day));
              return `<div class="day-row">
                <button type="button" class="day${on ? " is-on" : ""}" data-action="day" data-day="${entry.day}" aria-pressed="${on}">
                  <span class="day-no">${entry.weekday}</span>
                  <span class="day-name">${esc(entry.title)}</span>
                </button>
                <button type="button" class="status${done ? " is-done" : " is-todo"}" data-action="status" data-day="${entry.day}" aria-pressed="${done}">${done ? "Done" : "To-do"}</button>
              </div>`;
            }).join("")}
          </div>
        </section>
        <div class="note"><strong>Right hip</strong><p>${esc(hipBody)}</p></div>
        <button type="button" class="switch${this.vestOn ? " is-on" : ""}" data-action="vest" role="switch" aria-checked="${this.vestOn}">
          <span><strong>Vest</strong><small>${this.vestOn ? "On where a move allows it" : "Off for the whole session"}</small></span>
          <span class="knob" aria-hidden="true"></span>
        </button>
        <div class="note"><strong>Vest</strong><p>${esc(VEST_HINT)}</p></div>
        <section class="preview">
          <div class="figure-frame" data-field="preview">
            <div data-field="visual"></div>
            <div class="demo-card" data-field="demo-card" hidden><p data-field="demo-copy"></p></div>
          </div>
          <p class="preview-name">${esc(preview.name)}</p>
          <p class="preview-reps">${esc(this.moveText(preview))}</p>
          ${preview.caution ? `<p class="caution">${esc(preview.caution)}</p>` : ""}
          ${previewGuide ? `<a class="howto" href="${esc(previewGuide)}" target="_blank" rel="noopener noreferrer">How to do this</a>` : ""}
        </section>
        <section class="slots">
          ${pickerSlots(session).map((slot) => this.slotCard30(slot.id, slot.label, slot.options)).join("")}
        </section>
        <div class="note">
          <strong>When to move on</strong>
          <p>Stay on Start here until you finish those reps with more than about 20 seconds to spare and clean form.</p>
          <p>On a Friday AMRAP, move on when you hit 5 quality rounds with something left. Stop a set if your form goes.</p>
          <p>Harder work with the 22 lb bell means slower lowers, pauses, denser sets and longer carries.</p>
        </div>
        <div class="note format-note">
          <strong>This session</strong>
          <p>${esc(formatNote(session))}</p>
          <p>Hip stretches are the same every time: half-kneeling hip flexor, figure-4, then a shallow lateral-lunge hold. Right side first.</p>
        </div>
        <button type="button" class="btn btn-ghost mark-quiet" data-action="mark">Mark this session done</button>
        <div class="spacer"></div>
        <div class="start-bar">
          <button type="button" class="btn btn-primary" data-action="start">
            <span>Start</span>
            <small>Week ${this.week30} · ${session.weekday}</small>
          </button>
        </div>
      </main>
    `;
    this.mountPreview30();
    window.scrollTo(0, y);
  }

  private planSwitcher(): string {
    const five = this.plan === "5x20";
    return `<section>
      <h2>Plan</h2>
      <div class="plans" role="group" aria-label="Plan">
        <button type="button" class="day${five ? " is-on" : ""}" data-action="plan" data-plan="5x20" aria-pressed="${five}">
          <span class="day-no">5 × 20</span>
          <span class="day-name">Five 20-minute sessions</span>
        </button>
        <button type="button" class="day${five ? "" : " is-on"}" data-action="plan" data-plan="3x30" aria-pressed="${!five}">
          <span class="day-no">3 × 30</span>
          <span class="day-name">Three 30-minute sessions</span>
        </button>
      </div>
    </section>`;
  }

  private slotCard(id: string, label: string, versions: [Version, Version, Version]): string {
    const selected = this.choices[id] ?? defaultVersion(this.week);
    const plan = defaultVersion(this.week);
    const options = versions
      .map((version, index) => {
        const on = index === selected;
        const badge = index === plan ? `<span class="badge">Plan</span>` : "";
        return `<div class="choice">
          <button type="button" class="option${on ? " is-on" : ""}" role="radio" aria-checked="${on}" data-action="version" data-slot="${id}" data-index="${index}">
            <span class="col">${COLUMN_LABELS[index]}</span>
            <span class="txt">${esc(version.name)} ${esc(version.reps)}${version.vest ? " · vest" : ""}</span>
            ${badge}
          </button>
          <a class="howto" href="${esc(HOW_TO[version.animation])}" target="_blank" rel="noopener noreferrer">How to do this</a>
        </div>`;
      })
      .join("");
    return `<fieldset class="slot"><legend>${esc(label)}</legend><div class="options" role="radiogroup" aria-label="${esc(label)}">${options}</div></fieldset>`;
  }

  private slotCard30(id: string, label: string, options: [PickerOption, PickerOption, PickerOption]): string {
    const selected = this.choices[id] ?? 0;
    const choices = options
      .map((option, index) => {
        const on = index === selected;
        const badge = index === 0 ? `<span class="badge">Plan</span>` : "";
        const links = option.examples
          .map((example) => {
            const labelText = option.examples.length > 1 ? `How to do ${example.name}` : "How to do this";
            return `<a class="howto" href="${esc(example.href)}" target="_blank" rel="noopener noreferrer">${esc(labelText)}</a>`;
          })
          .join("");
        return `<div class="choice">
          <button type="button" class="option${on ? " is-on" : ""}" role="radio" aria-checked="${on}" data-action="version" data-slot="${id}" data-index="${index}">
            <span class="col">${LEVEL_LABELS[index]}</span>
            <span class="txt">${esc(option.text)}${option.vest ? " · vest" : ""}</span>
            ${badge}
          </button>
          ${links}
        </div>`;
      })
      .join("");
    return `<fieldset class="slot"><legend>${esc(label)}</legend><div class="options" role="radiogroup" aria-label="${esc(label)}">${choices}</div></fieldset>`;
  }

  private versionText(version: Version): string {
    const vest = version.vest ? (this.vestOn ? " · with the 10 lb vest" : " · vest off") : "";
    return `${version.reps}${vest}`;
  }

  private preview30(): Move30 {
    const session = getProgrammeSession(this.week30, this.day30);
    const slots = pickerSlots(session);
    const slot = slots.find((entry) => entry.id === this.previewSlot) ?? slots[0];
    if (!slot) throw new Error("Missing exercise");
    return slot.options[this.choices[slot.id] ?? 0].preview;
  }

  private moveText(item: Move30): string {
    const vest = item.vest ? (this.vestOn ? " · with the 10 lb vest" : " · vest off") : "";
    return `${item.reps}${vest}`;
  }

  private previewVersion(): Version {
    const day = getDay(this.day);
    const slot = day.slots.find((entry) => entry.id === this.previewSlot) ?? day.slots[0];
    return slot.versions[this.choices[slot.id] ?? defaultVersion(this.week)];
  }

  private mountPreview(): void {
    const host = this.root.querySelector<HTMLElement>("[data-field=visual]");
    const version = this.previewVersion();
    if (!host) return;
    this.visual = new ExerciseVisual(host);
    this.visual.setClip(this.clipFor(version, false, version.name));
    this.visual.setPlaying(true);
  }

  private mountPreview30(): void {
    const item = this.preview30();
    const host = this.root.querySelector<HTMLElement>("[data-field=visual]");
    const card = this.root.querySelector<HTMLElement>("[data-field=demo-card]");
    const copy = this.root.querySelector<HTMLElement>("[data-field=demo-copy]");
    if (!host || !card) return;
    this.visual = new ExerciseVisual(host);
    if (item.demo.kind === "clip") {
      card.hidden = true;
      host.hidden = false;
      this.visual.setClip({
        kind: "animation",
        id: item.demo.animation,
        vest: item.vest && this.vestOn,
        mirror: item.mirror,
        alternateReps: item.side.type === "alternate-reps",
        label: item.name,
      });
      this.visual.setPlaying(true);
      return;
    }
    host.hidden = true;
    this.visual.setPlaying(false);
    card.hidden = false;
    if (copy) copy.textContent = item.caution ?? item.reps;
  }

  private clipFor(version: Version, mirror: boolean, label: string): VisualClip {
    return {
      kind: "animation",
      id: version.animation,
      vest: version.vest && this.vestOn,
      mirror,
      alternateReps: version.side.type === "alternate-reps",
      label,
    };
  }

  private renderSession(): void {
    this.destroyVisual();
    const timeline = this.timeline;
    if (!timeline) return;
    const circuit = timeline.circuit
      .map(
        (move, index) =>
          `<button type="button" class="chip circuit" data-action="circuit" data-index="${index}"><strong>${esc(move.name)}</strong><small>${esc(move.reps)}</small></button>`,
      )
      .join("");
    this.root.innerHTML = `
      <div class="bar" aria-hidden="true"><div data-field="bar"></div></div>
      <section class="session">
        <header class="sess-head">
          <button type="button" class="text-btn" data-action="back">Back</button>
          <div>
            <p class="eyebrow">${esc(timeline.eyebrow)}</p>
            <h1>${esc(timeline.title)}</h1>
          </div>
          <p class="remain" data-field="remain"></p>
        </header>
        <div class="clock-block">
          <p class="phase" data-field="phase" hidden></p>
          <p class="mins" data-field="mins"></p>
          <div class="dots" data-field="dots"></div>
          <p class="caption" data-field="caption"></p>
          <p class="clock" data-field="clock">${formatClock(timeline.sessionMs)}</p>
          <p class="handover" data-field="handover" hidden></p>
          <p class="coach" data-field="coach"></p>
        </div>
        <div class="move-block">
          <h2 data-field="move"></h2>
          <p class="reps" data-field="reps"></p>
          <p class="badges" data-field="badges"></p>
          <p class="caution" data-field="caution" hidden></p>
          <a class="howto" data-field="howto" href="#" target="_blank" rel="noopener noreferrer" hidden>How to do this</a>
          <a class="howto" data-field="tutorial" href="#" target="_blank" rel="noopener noreferrer" hidden>Snatch tutorial</a>
        </div>
        <div class="figure-frame" data-field="figure">
          <div data-field="visual"></div>
          <div class="demo-card" data-field="demo-card" hidden><p data-field="demo-copy"></p></div>
        </div>
        <p class="next-line"><span>Next</span> <strong data-field="next"></strong></p>
        <section data-field="amrap" hidden>
          <div class="rounds">
            <button type="button" class="btn btn-ghost" data-action="round-sub">Undo</button>
            <p data-field="rounds">0 rounds</p>
            <button type="button" class="btn btn-round" data-action="round-add">Add round</button>
          </div>
          <div class="circuit" data-field="circuit">${circuit}</div>
        </section>
        <div class="controls">
          <button type="button" class="btn btn-primary" data-field="toggle" data-action="pause">Pause</button>
          <button type="button" class="btn btn-ghost" data-action="reset">Reset</button>
        </div>
        <button type="button" class="btn btn-mark" data-field="mark" data-action="mark">Mark done</button>
        <p class="hint" data-field="wake" hidden>This browser didn't keep the screen awake. Turn off auto-lock if it dims.</p>
        <p class="live" data-field="live" aria-live="polite"></p>
      </section>
    `;
    const frame = this.root.querySelector<HTMLElement>("[data-field=visual]");
    if (frame) this.visual = new ExerciseVisual(frame);
    this.paint();
  }

  private paint(snapshot = this.runner?.snapshot(this.circuitIndex, this.rounds)): void {
    if (!snapshot || this.screen !== "session") return;
    const set = (field: string, text: string) => {
      const node = this.root.querySelector(`[data-field="${field}"]`);
      if (node) node.textContent = text;
    };
    set("remain", `${formatClock(snapshot.remainingSessionMs)} left`);
    set("mins", snapshot.phase === "done" ? "Minute 20 of 20" : `Minute ${snapshot.minuteInPhase} of ${snapshot.minutesInPhase}`);
    set("caption", snapshot.caption);
    const phase = this.root.querySelector<HTMLElement>("[data-field=phase]");
    if (phase) {
      phase.hidden = Boolean(this.timeline?.legacyGuides) || snapshot.phase === "done";
      phase.textContent = `${snapshot.phaseLabel} · ${snapshot.modeLabel}`;
    }
    set("clock", snapshot.phase === "done" ? "0:00" : formatClock(snapshot.stepRemainingMs));
    set("coach", snapshot.coach);
    const handover = this.root.querySelector<HTMLElement>("[data-field=handover]");
    if (handover) {
      handover.hidden = !snapshot.handover;
      handover.textContent = snapshot.handover ?? "";
    }
    const howto = this.root.querySelector<HTMLAnchorElement>("[data-field=howto]");
    const legacy = this.timeline?.legacyGuides && snapshot.current?.animation ? HOW_TO[snapshot.current.animation] : "";
    const guide = snapshot.current?.guide || legacy;
    if (howto) {
      howto.hidden = !guide;
      if (guide) howto.href = guide;
      howto.textContent = "How to do this";
    }
    const tutorial = this.root.querySelector<HTMLAnchorElement>("[data-field=tutorial]");
    const tutorialHref = snapshot.current?.tutorial ?? "";
    if (tutorial) {
      tutorial.hidden = !tutorialHref;
      if (tutorialHref) tutorial.href = tutorialHref;
    }
    const caution = this.root.querySelector<HTMLElement>("[data-field=caution]");
    if (caution) {
      caution.hidden = !snapshot.current?.caution;
      caution.textContent = snapshot.current?.caution ?? "";
    }
    set("move", snapshot.current?.name ?? "Session complete");
    set("reps", snapshot.current ? snapshot.current.reps : snapshot.coach);
    set("next", snapshot.next ? moveLine(snapshot.next) : "Mark the session when you finish");
    set("rounds", `${this.rounds} ${this.rounds === 1 ? "round" : "rounds"}`);

    const badges = this.root.querySelector("[data-field=badges]");
    if (badges) {
      const parts: string[] = [];
      if (snapshot.current?.vest) parts.push(`<span class="badge vest">10 lb vest</span>`);
      if (snapshot.current?.sideLabel) parts.push(`<span class="badge">${esc(snapshot.current.sideLabel)}</span>`);
      badges.innerHTML = parts.join("");
    }

    const dots = this.root.querySelector("[data-field=dots]");
    if (dots) {
      dots.innerHTML = Array.from({ length: snapshot.minutesInPhase }, (_, index) => {
        const state = index + 1 < snapshot.minuteInPhase ? "is-done" : index + 1 === snapshot.minuteInPhase ? "is-now" : "";
        return `<span class="dot ${state}"></span>`;
      }).join("");
    }

    const bar = this.root.querySelector<HTMLElement>("[data-field=bar]");
    if (bar) bar.style.width = `${(snapshot.elapsedMs / snapshot.sessionMs) * 100}%`;

    const amrap = this.root.querySelector<HTMLElement>("[data-field=amrap]");
    const showAmrap =
      !!this.timeline?.tracksRounds &&
      (snapshot.phase === "blockB" || snapshot.phase === "finisher" || snapshot.phase === "hips" || snapshot.phase === "done");
    if (amrap) amrap.hidden = !showAmrap;
    const circuit = this.root.querySelector<HTMLElement>("[data-field=circuit]");
    if (circuit) circuit.hidden = snapshot.phase !== "blockB";
    this.root.querySelectorAll<HTMLElement>("[data-action=circuit]").forEach((button) => {
      button.classList.toggle("is-on", Number(button.dataset.index) === this.circuitIndex);
    });
    const undo = this.root.querySelector<HTMLButtonElement>("[data-action=round-sub]");
    if (undo) undo.disabled = this.rounds === 0;

    const toggle = this.root.querySelector<HTMLButtonElement>("[data-field=toggle]");
    const running = this.runner?.running ?? false;
    const done = snapshot.phase === "done";
    if (toggle) {
      toggle.hidden = done;
      toggle.dataset.action = running ? "pause" : "start";
      toggle.textContent = running ? "Pause" : snapshot.elapsedMs > 0 ? "Resume" : "Start";
    }
    const mark = this.root.querySelector<HTMLButtonElement>("[data-field=mark]");
    if (mark) mark.classList.toggle("is-ready", done);

    const wake = this.root.querySelector<HTMLElement>("[data-field=wake]");
    if (wake) wake.hidden = !this.wakeNote;

    const second = Math.floor(snapshot.elapsedMs / 1000);
    if (second !== this.liveSecond) {
      this.liveSecond = second;
      const live = this.root.querySelector("[data-field=live]");
      if (live) {
        live.textContent = `${snapshot.phaseLabel}. ${formatClock(snapshot.stepRemainingMs)} left. ${snapshot.current?.name ?? "Session complete"}.`;
      }
    }

    this.showDemo(snapshot.current);
  }

  private showDemo(move: DisplayMove | null): void {
    const host = this.root.querySelector<HTMLElement>("[data-field=visual]");
    const card = this.root.querySelector<HTMLElement>("[data-field=demo-card]");
    const copy = this.root.querySelector<HTMLElement>("[data-field=demo-copy]");
    if (!move) {
      this.visual?.setPlaying(false);
      return;
    }
    if (move.demo === "clip" && move.animation && host) {
      if (card) card.hidden = true;
      host.hidden = false;
      this.visual?.setClip(this.clipFromMove(move));
      return;
    }
    if (host) host.hidden = true;
    this.visual?.setPlaying(false);
    if (card) card.hidden = false;
    if (copy) copy.textContent = move.caution ?? move.reps;
  }

  private clipFromMove(move: DisplayMove): VisualClip {
    return {
      kind: "animation",
      id: move.animation as AnimId,
      vest: move.vest,
      mirror: move.mirror,
      alternateReps: move.alternateReps,
      label: move.name,
    };
  }

  private destroyVisual(): void {
    this.visual?.destroy();
    this.visual = null;
  }
}
