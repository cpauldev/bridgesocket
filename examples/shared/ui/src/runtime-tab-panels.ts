import type { DashboardTableRow, DashboardTableSection } from "demo/dashboard";
import {
  type BadgeVariant,
  type TabsItem,
  createBadge,
  createFieldLabel,
  createFrame,
  createFrameFooter,
  createFrameHeader,
  createFrameTitle,
  createTable,
  createTableBody,
  createTableCell,
  createTableRow,
} from "universa-ui/components";

function createTextNode(text: string, className: string): HTMLSpanElement {
  const node = document.createElement("span");
  node.className = className;
  node.textContent = text;
  return node;
}

function resolveBadgeVariant(variant: string): BadgeVariant {
  return (variant === "default" ? "secondary" : variant) as BadgeVariant;
}

function createRow(row: DashboardTableRow): HTMLTableRowElement {
  const tr = createTableRow();

  const labelCell = createTableCell("dp-status-label-cell");
  const label = createFieldLabel(row.label, undefined, "dp-status-label");
  labelCell.appendChild(label);

  const valueCell = createTableCell("dp-status-value-cell");

  if (row.value.kind === "badge") {
    const badge = createBadge({
      text: row.value.text,
      variant: resolveBadgeVariant(row.value.variant),
    });
    valueCell.appendChild(badge);
  } else {
    const className =
      row.value.tone === "code"
        ? "dp-status-code"
        : row.value.tone === "muted"
          ? "dp-status-muted"
          : "dp-status-value";
    valueCell.appendChild(createTextNode(row.value.text, className));
  }

  tr.appendChild(labelCell);
  tr.appendChild(valueCell);
  return tr;
}

function createPanel(
  section: DashboardTableSection,
  runtimeError: string | null,
): HTMLElement {
  const panel = document.createElement("section");
  panel.className = "dp-runtime-section";

  const frame = createFrame({ className: "dp-runtime-frame" });

  const header = createFrameHeader("dp-runtime-frame-header");
  header.appendChild(createFrameTitle(section.title, "dp-runtime-frame-title"));

  const table = createTable("dp-status-table");
  const tbody = createTableBody();
  section.rows.forEach((row) => {
    tbody.appendChild(createRow(row));
  });
  table.appendChild(tbody);

  frame.appendChild(header);
  frame.appendChild(table);

  if (section.id === "runtime" && runtimeError) {
    const footer = createFrameFooter("dp-frame-footer");
    footer.appendChild(createTextNode(runtimeError, "dp-status-muted"));
    frame.appendChild(footer);
  }

  panel.appendChild(frame);
  return panel;
}

export function createRuntimeTabItems(
  sections: DashboardTableSection[],
  runtimeError: string | null,
): TabsItem[] {
  return sections.map((section) => ({
    id: section.id,
    label: section.title,
    panel: createPanel(section, runtimeError),
  }));
}
