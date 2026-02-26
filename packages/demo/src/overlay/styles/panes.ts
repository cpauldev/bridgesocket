export function paneStyles(): string {
  return `
    .overlay-pane {
      display: grid;
      gap: 16px;
      align-content: start;
      min-height: 100%;
      padding: 16px;
    }

    .pane-section {
      display: grid;
      gap: 8px;
      min-width: 0;
    }

    .pane-title {
      margin: 0;
      font-size: 11px;
      line-height: 1.2;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--universa-ui-text-muted);
      font-weight: 600;
    }

    .pane-title-copy {
      margin: 0;
      font-size: 12px;
      line-height: 1.4;
      color: var(--universa-ui-text-muted);
    }

    .pane-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 4px;
      min-height: 0;
    }

    .pane-list-item {
      border: 1px solid var(--universa-ui-border);
      border-radius: 10px;
      padding: 6px 8px;
      display: grid;
      gap: 3px;
      background: color-mix(in srgb, var(--universa-ui-bg) 92%, transparent);
      min-width: 0;
    }

    .list-item-title {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--universa-ui-text);
      line-height: 1.3;
      word-break: break-word;
    }

    .list-item-subtitle {
      margin: 0;
      font-size: 12px;
      color: var(--universa-ui-text-muted);
      line-height: 1.35;
      word-break: break-word;
    }

    .empty-state {
      margin: 0;
      padding: 12px;
      border-radius: 10px;
      border: 1px dashed var(--universa-ui-border);
      font-size: 12px;
      color: var(--universa-ui-text-muted);
    }

    .actions-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .kv-grid {
      display: grid;
      gap: 6px;
    }

    .kv-row {
      display: grid;
      gap: 4px;
      grid-template-columns: minmax(90px, 120px) 1fr;
      font-size: 12px;
      line-height: 1.35;
      align-items: baseline;
      min-width: 0;
    }

    .kv-key {
      color: var(--universa-ui-text-muted);
    }

    .kv-value {
      color: var(--universa-ui-text);
      word-break: break-word;
    }

    /* ── Settings pane ── */

    .settings-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-width: 0;
    }

    .settings-row [data-slot="select-root"],
    .settings-row [data-slot="button"] {
      flex-shrink: 0;
    }

    .settings-row [data-slot="select-root"] {
      display: inline-flex;
      flex: 0 0 auto;
      width: fit-content;
      min-width: 0;
    }

    .settings-row [data-slot="select-trigger"],
    .settings-row .settings-select[data-slot="select-trigger"] {
      width: fit-content;
      max-width: 100%;
    }

    .settings-label {
      font-size: 12px;
      line-height: 1.35;
      color: var(--universa-ui-text);
    }

    /* ── Files pane ── */

    .file-detail-panel {
      display: grid;
      gap: 12px;
      align-content: start;
    }

    .file-detail-name {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--universa-ui-text);
      word-break: break-all;
    }

    /* ── File tree ── */

    .file-tree {
      padding: 2px 0;
    }

    .file-tree-list,
    .file-tree-children {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .file-tree-children {
      padding-inline-start: 8px;
      border-inline-start: 1px solid var(--universa-ui-border);
      margin-inline-start: 9px;
    }

    .file-tree-children[hidden] {
      display: none;
    }

    .file-tree-row {
      display: flex;
      align-items: center;
      gap: 5px;
      width: 100%;
      padding: 3px 6px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 6px;
      font-size: 12px;
      line-height: 1.4;
      color: var(--universa-ui-text);
      text-align: start;
    }

    .file-tree-row:hover {
      background: color-mix(in srgb, var(--universa-ui-secondary) 70%, transparent);
    }

    .file-tree-file.is-selected {
      background: color-mix(in srgb, var(--universa-ui-primary) 10%, var(--universa-ui-bg));
      color: var(--universa-ui-primary);
    }

    .file-tree-chevron {
      flex-shrink: 0;
      color: var(--universa-ui-text-muted);
      transition: transform 150ms ease;
    }

    .file-tree-dir[data-expanded] .file-tree-chevron {
      transform: rotate(90deg);
    }

    .file-tree-folder-icon {
      flex-shrink: 0;
      color: #2563eb;
    }

    :host([data-theme="dark"]) .file-tree-folder-icon {
      color: #60a5fa;
    }

    .file-tree-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-tree-file-icon {
      flex-shrink: 0;
      color: var(--universa-ui-text-muted);
    }

    .ftree-cyan   { color: #0891b2; }
    .ftree-blue   { color: #2563eb; }
    .ftree-yellow { color: #ca8a04; }
    .ftree-green  { color: #16a34a; }
    .ftree-orange { color: #ea580c; }
    .ftree-purple { color: #9333ea; }
    .ftree-gray   { color: #6b7280; }
    .ftree-muted  { color: var(--universa-ui-text-muted); }

    :host([data-theme="dark"]) .ftree-cyan   { color: #22d3ee; }
    :host([data-theme="dark"]) .ftree-blue   { color: #60a5fa; }
    :host([data-theme="dark"]) .ftree-yellow { color: #fbbf24; }
    :host([data-theme="dark"]) .ftree-green  { color: #4ade80; }
    :host([data-theme="dark"]) .ftree-orange { color: #fb923c; }
    :host([data-theme="dark"]) .ftree-purple { color: #c084fc; }
    :host([data-theme="dark"]) .ftree-gray   { color: #9ca3af; }

    .file-tree-dir:not([data-expanded]) .file-tree-folder-open,
    .file-tree-dir[data-expanded] .file-tree-folder-closed {
      display: none;
    }

    /* ── Runtime pane ── */

    .runtime-pane {
      padding: 16px;
    }

    .stat-card {
      border: 1px solid var(--universa-ui-border);
      border-radius: 10px;
      background: color-mix(in srgb, var(--universa-ui-bg) 92%, transparent);
      padding: 8px 10px;
      min-height: 60px;
      min-width: 0;
    }

    .stat-label {
      font-size: 11px;
      line-height: 1.2;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--universa-ui-text-muted);
    }

    .stat-value {
      margin: 0;
      font-size: 16px;
      line-height: 1.2;
      font-weight: 700;
      color: var(--universa-ui-text);
    }
  `;
}
