import { ANIMATION_IDS } from "./figure/animations.ts";
import { ExerciseVisual } from "./figure/visual.ts";
import { labelForAnimation } from "./plan.ts";

/** Every exercise loop on one page, for checking the figure. */
export function mountGallery(root: HTMLElement): void {
  root.innerHTML = `
    <main class="gallery-page">
      <header class="top">
        <p class="eyebrow"><a href="/">Back to the timer</a></p>
        <h1>Every exercise</h1>
        <p class="gear">Loops that can later be swapped for video clips.</p>
      </header>
      <div class="gallery"></div>
    </main>
  `;
  const grid = root.querySelector(".gallery");
  if (!grid) return;
  for (const id of ANIMATION_IDS) {
    const cell = document.createElement("figure");
    const frame = document.createElement("div");
    frame.className = "figure-frame";
    const caption = document.createElement("figcaption");
    caption.textContent = labelForAnimation(id);
    cell.append(frame, caption);
    grid.append(cell);
    const visual = new ExerciseVisual(frame);
    visual.setClip({
      kind: "animation",
      id,
      vest: false,
      mirror: false,
      alternateReps: false,
      label: labelForAnimation(id),
    });
  }
}
