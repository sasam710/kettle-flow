import type { Cue } from "./timer.ts";

export class CuePlayer {
  private ctx: AudioContext | null = null;

  /** Call from the Start tap so the browser allows sound. */
  unlock(): void {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!this.ctx) this.ctx = new Ctx();
    void this.ctx.resume();
    this.tone(440, this.ctx.currentTime, 0.02, 0.0001, "sine");
  }

  play(kind: Cue): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (kind === "tick") this.tone(1320, t, 0.06, 0.05, "square");
    if (kind === "minute") this.tone(880, t, 0.12, 0.07, "square");
    if (kind === "block") {
      this.tone(660, t, 0.1, 0.08, "square");
      this.tone(990, t + 0.14, 0.16, 0.08, "square");
    }
    if (kind === "done") {
      this.tone(523, t, 0.14, 0.1, "sine");
      this.tone(659, t + 0.16, 0.14, 0.1, "sine");
      this.tone(784, t + 0.32, 0.22, 0.12, "sine");
    }
  }

  private tone(freq: number, when: number, dur: number, gain: number, type: OscillatorType): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), when + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(amp);
    amp.connect(this.ctx.destination);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }
}
