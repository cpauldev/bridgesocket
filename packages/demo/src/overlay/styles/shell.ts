export function shellStyles(): string {
  return `
    .demo-overlay {
      --dp-fill: var(--universa-ui-bg);
      --dp-shadow: var(--universa-ui-shadow-xl);
      --dp-text: var(--universa-ui-text);
      --dp-border: var(--universa-ui-border);
      --dp-panel: var(--universa-ui-bg);
      color-scheme: light;
    }

    .demo-overlay[data-theme="dark"] {
      color-scheme: dark;
    }

    [data-shell-description] {
      min-height: 600px;
    }

    .dp-overlay {
      height: calc(var(--_h, var(--shell-height)) - var(--shell-height));
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      width: 100%;
      overflow: hidden;
    }

    .dp-overlay__topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 14px 10px;
      border-bottom: 1px solid var(--universa-ui-border);
    }

    .dp-overlay__topbar-title {
      min-width: 0;
      display: grid;
      gap: 4px;
    }

    .dp-overlay__layout {
      display: grid;
      grid-template-columns: 180px minmax(0, 1fr);
      min-height: 0;
      height: 100%;
    }

    .dp-overlay__sidebar {
      border-right: 1px solid var(--universa-ui-border);
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .dp-overlay__sidebar--workspace {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
    }

    .dp-overlay__sidebar-scroll {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .dp-overlay__tabs {
      display: grid;
      gap: 4px;
      padding: 8px;
    }

    .dp-overlay__tabs--workspace {
      padding: 8px 8px 4px;
    }

    .workspace-nav-controls {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 6px;
      align-items: center;
    }

    .workspace-context-btn {
      justify-content: flex-start;
      cursor: default;
    }

    .workspace-context-btn:disabled {
      opacity: 1;
      pointer-events: none;
    }

    .workspace-sidebar-controls {
      margin-top: 4px;
    }

    .workspace-sidebar-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 0 8px 8px;
      min-height: 0;
    }

    .tab-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      text-align: left;
      gap: 0.375rem;
      padding: calc(0.25rem - 1px) calc(0.625rem - 1px);
      min-height: 1.75rem;
      border: 1px solid transparent;
      border-radius: 0.5rem;
      background: transparent;
      color: var(--universa-ui-text-muted);
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 400;
      line-height: 1.25rem;
      white-space: nowrap;
      cursor: pointer;
      outline: none;
      min-width: 0;
    }

    .tab-btn:hover {
      background: var(--universa-ui-secondary);
    }

    .tab-btn:focus-visible {
      box-shadow:
        0 0 0 1px var(--universa-ui-bg),
        0 0 0 3px var(--universa-ui-ring);
    }

    .tab-btn[data-active="true"] {
      background: var(--universa-ui-accent);
      color: var(--universa-ui-text);
      font-weight: 500;
    }

    .tab-btn svg {
      flex-shrink: 0;
    }

    .tab-label {
      color: inherit;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dp-overlay__toolbar {
      display: none;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      gap: 2px;
      padding: 4px 8px;
      border-bottom: 1px solid var(--universa-ui-border);
      overflow-x: auto;
      scrollbar-width: none;
    }

    .dp-overlay__toolbar::-webkit-scrollbar {
      display: none;
    }

    .dp-overlay__toolbar .tab-btn {
      flex: 0 0 auto;
      width: 2rem;
      height: 2rem;
      min-width: 0;
      padding: 0;
      justify-content: center;
    }

    .dp-overlay__main {
      min-height: 0;
      overflow: hidden;
    }

    .dp-overlay__body {
      min-height: 0;
    }

    @media (max-width: 639px) {
      .dp-overlay {
        grid-template-rows: auto auto minmax(0, 1fr);
      }

      .dp-overlay__toolbar {
        display: flex;
      }

      .dp-overlay__layout {
        grid-template-columns: minmax(0, 1fr);
      }

      .dp-overlay__sidebar {
        display: none;
      }

      .dp-overlay[data-workspace-sidebar="true"] .dp-overlay__layout {
        grid-template-columns: minmax(150px, 0.8fr) minmax(0, 1.2fr);
      }

      .dp-overlay[data-workspace-sidebar="true"] .dp-overlay__sidebar {
        display: grid;
      }

      .workspace-back-btn {
        display: none !important;
      }
    }
  `;
}
