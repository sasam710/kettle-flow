import { frameAt, type AnimId } from "./animations.ts";
import { FIGURE_VIEWBOX, renderFigure } from "./draw.ts";
import { layoutFigure } from "./kinematics.ts";

export type VisualClip =
  | {
      kind: "animation";
      id: AnimId;
      vest: boolean;
      mirror: boolean;
      alternateReps: boolean;
      label: string;
    }
  | {
      kind: "video";
      src: string;
      label: string;
    };

/**
 * The on-screen exercise. Today it draws the stick figure.
 * Pass a video clip and the same mount shows a looping muted video instead.
 */
export class ExerciseVisual {
  private host: HTMLElement;
  private svg: SVGSVGElement;
  private group: SVGGElement;
  private video: HTMLVideoElement;
  private raf = 0;
  private acc = 0;
  private last: number | null = null;
  private playing = true;
  private reduced: boolean;
  private clip: VisualClip | null = null;
  private animId: AnimId | null = null;
  private alternate = false;

  constructor(host: HTMLElement) {
    this.host = host;
    this.host.replaceChildren();
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("viewBox", FIGURE_VIEWBOX);
    this.svg.setAttribute("role", "img");
    this.svg.classList.add("figure-svg");
    this.group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.svg.append(this.group);
    this.video = document.createElement("video");
    this.video.className = "figure-video";
    this.video.loop = true;
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.setAttribute("playsinline", "");
    this.video.hidden = true;
    this.host.append(this.svg, this.video);
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.raf = requestAnimationFrame(this.frame);
  }

  setClip(clip: VisualClip): void {
    this.clip = clip;
    if (clip.kind === "video") {
      this.svg.style.display = "none";
      this.video.hidden = false;
      if (this.video.getAttribute("src") !== clip.src) {
        this.video.src = clip.src;
      }
      this.video.setAttribute("aria-label", clip.label);
      if (this.playing) void this.video.play().catch(() => undefined);
      else this.video.pause();
      return;
    }
    this.video.pause();
    this.video.hidden = true;
    this.svg.style.display = "";
    const same = this.animId === clip.id && this.alternate === clip.alternateReps;
    this.animId = clip.id;
    this.alternate = clip.alternateReps;
    this.svg.setAttribute("aria-label", clip.label);
    if (!same) {
      this.acc = 0;
      this.last = null;
    }
    this.draw(this.acc);
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    if (this.clip?.kind === "video") {
      if (playing) void this.video.play().catch(() => undefined);
      else this.video.pause();
    }
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.video.pause();
    this.host.replaceChildren();
  }

  private frame = (now: number) => {
    if (this.last == null) this.last = now;
    if (this.playing && !this.reduced && this.clip?.kind !== "video") this.acc += now - this.last;
    this.last = now;
    if (this.clip?.kind === "animation") this.draw(this.acc);
    this.raf = requestAnimationFrame(this.frame);
  };

  private draw(ms: number): void {
    if (this.clip?.kind !== "animation") return;
    const sampled = frameAt(this.clip.id, ms / 1000, this.clip.alternateReps);
    const mirror = sampled.mirror !== this.clip.mirror;
    const time = this.reduced ? 0.35 : ms / 1000;
    const pose = this.reduced ? frameAt(this.clip.id, time, false).pose : sampled.pose;
    this.group.setAttribute("transform", mirror ? `translate(${FIGURE_VIEWBOX.split(" ")[2]} 0) scale(-1 1)` : "");
    this.group.innerHTML = renderFigure(layoutFigure(pose), this.clip.vest);
  }
}
