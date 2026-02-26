import { getUiStyles } from "universa-ui/styles";

import { paneStyles } from "./panes.js";
import { shellStyles } from "./shell.js";

export function getOverlayStyles(): string {
  return `
    ${getUiStyles({ includeShell: true, mode: "persistent" })}
    ${shellStyles()}
    ${paneStyles()}
  `;
}
