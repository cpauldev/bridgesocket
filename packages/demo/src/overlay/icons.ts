import {
  type IconNode,
  createElement as createSvgElement,
} from "universa-ui/dom";

import type { OverlaySeverity } from "./types.js";

const ICON_DATA: Record<string, IconNode> = {
  "loader-circle": [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }]],
  check: [["path", { d: "M20 6 9 17l-5-5" }]],
  x: [
    ["path", { d: "M18 6 6 18" }],
    ["path", { d: "m6 6 12 12" }],
  ],
  "circle-alert": [
    ["circle", { cx: "12", cy: "12", r: "10" }],
    ["line", { x1: "12", x2: "12", y1: "8", y2: "12" }],
    ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16" }],
  ],
  "arrow-right": [
    ["path", { d: "M5 12h14" }],
    ["path", { d: "m12 5 7 7-7 7" }],
  ],
  "arrow-left": [
    ["path", { d: "m12 19-7-7 7-7" }],
    ["path", { d: "M19 12H5" }],
  ],
  info: [
    ["circle", { cx: "12", cy: "12", r: "10" }],
    ["path", { d: "M12 16v-4" }],
    ["path", { d: "M12 8h.01" }],
  ],
  search: [
    ["path", { d: "m21 21-4.34-4.34" }],
    ["circle", { cx: "11", cy: "11", r: "8" }],
  ],
  "folder-open": [
    [
      "path",
      {
        d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",
      },
    ],
  ],
  "folder-closed": [
    [
      "path",
      {
        d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
      },
    ],
    ["path", { d: "M2 10h20" }],
  ],
  folder: [
    [
      "path",
      {
        d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
      },
    ],
  ],
  cpu: [
    ["path", { d: "M12 20v2" }],
    ["path", { d: "M12 2v2" }],
    ["path", { d: "M17 20v2" }],
    ["path", { d: "M17 2v2" }],
    ["path", { d: "M2 12h2" }],
    ["path", { d: "M2 17h2" }],
    ["path", { d: "M2 7h2" }],
    ["path", { d: "M20 12h2" }],
    ["path", { d: "M20 17h2" }],
    ["path", { d: "M20 7h2" }],
    ["path", { d: "M7 20v2" }],
    ["path", { d: "M7 2v2" }],
    ["rect", { x: "4", y: "4", width: "16", height: "16", rx: "2" }],
    ["rect", { x: "8", y: "8", width: "8", height: "8", rx: "1" }],
  ],
  play: [
    [
      "path",
      {
        d: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z",
      },
    ],
  ],
  "rotate-ccw": [
    ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }],
    ["path", { d: "M3 3v5h5" }],
  ],
  square: [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }]],
  "chevron-right": [["path", { d: "m9 18 6-6-6-6" }]],
  file: [
    [
      "path",
      { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" },
    ],
    ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ],
  "sliders-horizontal": [
    ["path", { d: "M10 5H3" }],
    ["path", { d: "M12 19H3" }],
    ["path", { d: "M14 3v4" }],
    ["path", { d: "M16 17v4" }],
    ["path", { d: "M21 12h-9" }],
    ["path", { d: "M21 19h-5" }],
    ["path", { d: "M21 5h-7" }],
    ["path", { d: "M8 10v4" }],
    ["path", { d: "M8 12H3" }],
  ],
  wifi: [
    ["path", { d: "M12 20h.01" }],
    ["path", { d: "M2 8.82a15 15 0 0 1 20 0" }],
    ["path", { d: "M5 12.859a10 10 0 0 1 14 0" }],
    ["path", { d: "M8.5 16.429a5 5 0 0 1 7 0" }],
  ],
};

export function createIcon(
  name: string,
  options: { size?: number; className?: string } = {},
): SVGSVGElement {
  const size = options.size ?? 24;
  const iconNode = ICON_DATA[name] ?? ICON_DATA["file"];
  const customAttrs: Record<string, string | number> = {
    width: size,
    height: size,
    "aria-hidden": "true",
  };
  if (options.className) customAttrs["class"] = options.className;
  const svg = createSvgElement(iconNode, customAttrs);
  if (name === "loader-circle") svg.setAttribute("data-ui-icon", "spin");
  return svg;
}

export function createSeverityIcon(severity: OverlaySeverity): SVGSVGElement {
  switch (severity) {
    case "loading":
      return createIcon("loader-circle", { size: 15 });
    case "success":
      return createIcon("check", { size: 15 });
    case "error":
      return createIcon("x", { size: 15 });
    case "warning":
      return createIcon("circle-alert", { size: 15 });
    case "action":
      return createIcon("arrow-right", { size: 15 });
    case "info":
    default:
      return createIcon("info", { size: 15 });
  }
}
