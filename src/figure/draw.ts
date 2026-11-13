import { GROUND, VIEW_H, VIEW_W, type BellStyle, type Layout, type Pt } from "./kinematics.ts";

function n(value: number): string {
  return value.toFixed(1);
}

function line(cls: string, a: Pt, b: Pt): string {
  return `<line class="${cls}" x1="${n(a.x)}" y1="${n(a.y)}" x2="${n(b.x)}" y2="${n(b.y)}" />`;
}

function dot(cls: string, p: Pt, r = 4.5): string {
  return `<circle class="${cls}" cx="${n(p.x)}" cy="${n(p.y)}" r="${r}" />`;
}

function bellGraphic(x: number, y: number, rotation: number): string {
  return `<g class="bell" transform="translate(${n(x)} ${n(y)}) rotate(${n(rotation)})">
    <path d="M-9 1 C-9 -16 9 -16 9 1" />
    <circle cx="0" cy="16" r="14" />
    <circle class="bell-hi" cx="-4" cy="12" r="4" />
  </g>`;
}

function rotationFor(style: BellStyle, hand: Pt, elbow: Pt): number {
  if (style === "hang" || style === "goblet" || style === "hips") return 0;
  const ang = (Math.atan2(elbow.y - hand.y, elbow.x - hand.x) * 180) / Math.PI - 90;
  return style === "bottoms" ? ang + 180 : ang;
}

function bellAt(layout: Layout): string {
  const bell = layout.bell;
  if (!bell) return "";
  let hand = layout.handR;
  let elbow = layout.elbowR;
  if (bell.anchor === "L") {
    hand = layout.handL;
    elbow = layout.elbowL;
  } else if (bell.anchor === "both") {
    hand = { x: (layout.handL.x + layout.handR.x) / 2, y: (layout.handL.y + layout.handR.y) / 2 };
    elbow = { x: (layout.elbowL.x + layout.elbowR.x) / 2, y: (layout.elbowL.y + layout.elbowR.y) / 2 };
  } else if (bell.anchor === "hip") {
    hand = layout.hip;
    elbow = { x: layout.hip.x, y: layout.hip.y + 40 };
  }
  return bellGraphic(hand.x, hand.y, rotationFor(bell.style, hand, elbow));
}

/** SVG markup for one pose. A video clip can replace the whole figure later. */
export function renderFigure(layout: Layout, vest: boolean): string {
  const side = layout.view === "side";
  const far = side ? "limb far" : "limb";
  const near = "limb";
  const face = side
    ? `<line class="nose" x1="${n(layout.head.x)}" y1="${n(layout.head.y)}" x2="${n(layout.head.x + 14)}" y2="${n(layout.head.y + 2)}" />`
    : `<circle class="eye" cx="${n(layout.head.x - 5)}" cy="${n(layout.head.y - 2)}" r="1.7" />
       <circle class="eye" cx="${n(layout.head.x + 5)}" cy="${n(layout.head.y - 2)}" r="1.7" />`;
  const box = layout.box
    ? `<rect class="box" x="${n(layout.box.x)}" y="${n(GROUND - layout.box.h)}" width="${n(layout.box.w)}" height="${n(layout.box.h)}" rx="4" />`
    : "";
  const shadowX = (layout.footL.x + layout.footR.x) / 2;
  return `
    <rect class="mat" x="24" y="${GROUND - 8}" width="${VIEW_W - 48}" height="16" rx="6" />
    ${box}
    <ellipse class="shadow" cx="${n(shadowX)}" cy="${GROUND}" rx="36" ry="6" />
    ${line(far, layout.hipL, layout.kneeL)}
    ${line(far, layout.kneeL, layout.footL)}
    ${dot("joint far", layout.kneeL)}
    ${line(far, layout.shoulderL, layout.elbowL)}
    ${line(far, layout.elbowL, layout.handL)}
    ${line("torso", layout.hip, layout.neck)}
    ${vest ? line("vest", layout.hip, layout.neck) : ""}
    ${line(near, layout.hipR, layout.kneeR)}
    ${line(near, layout.kneeR, layout.footR)}
    ${dot("joint", layout.kneeR)}
    ${line(near, layout.shoulderR, layout.elbowR)}
    ${line(near, layout.elbowR, layout.handR)}
    ${dot("joint", layout.handL, 3.5)}
    ${dot("joint", layout.handR, 3.5)}
    <circle class="head" cx="${n(layout.head.x)}" cy="${n(layout.head.y)}" r="16" />
    ${face}
    ${bellAt(layout)}
  `;
}

export const FIGURE_VIEWBOX = `0 0 ${VIEW_W} ${VIEW_H}`;
