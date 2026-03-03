import {
  type DashboardActionId,
  type DashboardControllerState,
  type DashboardFrameworkId,
  createDashboardController,
} from "demo/dashboard";
import {
  type IconNode,
  Moon,
  Play,
  Plus,
  RotateCcw,
  Square,
  Sun,
  createElement,
} from "lucide";
import { Tabs } from "universa-ui/components";

import {
  DASHBOARD_ACTION_CONTROLS,
  type DashboardRuntimeUiState,
  buildRuntimeUiState,
  createActionStateMap,
  createTabsContentSignature,
  resolveActionLabel,
} from "./dashboard";
import {
  frameworkIconSvg,
  getFrameworkVisual,
  viteBadgeIconSvg,
} from "./frameworks";
import {
  createRuntimeTabItems,
  syncRuntimeTabItems,
} from "./runtime-tab-panels";
import { applyTheme, getInitialTheme, toggleTheme } from "./theme";

const ACTION_ICONS: Record<DashboardActionId, IconNode> = {
  start: Play,
  stop: Square,
  restart: RotateCcw,
};

const THEME_ICONS: Record<"dark" | "light", IconNode> = {
  dark: Sun,
  light: Moon,
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createLucideIcon(
  icon: IconNode,
  size: number,
  className: string,
): SVGElement {
  return createElement(icon, {
    width: size,
    height: size,
    class: className,
    "aria-hidden": "true",
    focusable: "false",
  });
}

function setThemeIcon(button: HTMLElement, theme: "light" | "dark"): void {
  const icon = theme === "dark" ? THEME_ICONS.dark : THEME_ICONS.light;
  button.replaceChildren(createLucideIcon(icon, 20, "demo-theme-icon"));
}

interface ActionButtonRefs {
  button: HTMLButtonElement;
  label: HTMLSpanElement;
}

function createActionButton(input: {
  actionId: DashboardActionId;
  initialLabel: string;
  onClick: (actionId: DashboardActionId) => void;
}): ActionButtonRefs {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("data-slot", "button");
  button.setAttribute("data-size", "sm");
  button.setAttribute("data-variant", "outline");
  button.className = "demo-action-btn";
  button.setAttribute("data-action", input.actionId);
  button.appendChild(
    createLucideIcon(ACTION_ICONS[input.actionId], 14, "demo-action-icon"),
  );

  const label = document.createElement("span");
  label.textContent = input.initialLabel;
  button.appendChild(label);
  button.addEventListener("click", () => {
    input.onClick(input.actionId);
  });

  return { button, label };
}

function applyActionState(
  refs: ActionButtonRefs,
  input: { label: string; disabled: boolean },
): void {
  if (refs.label.textContent !== input.label) {
    refs.label.textContent = input.label;
  }
  if (refs.button.disabled !== input.disabled) {
    refs.button.disabled = input.disabled;
  }
  if (refs.button.hidden) {
    refs.button.hidden = false;
  }
  if (refs.button.getAttribute("aria-label") !== input.label) {
    refs.button.setAttribute("aria-label", input.label);
  }
  if (refs.button.getAttribute("title") !== input.label) {
    refs.button.setAttribute("title", input.label);
  }
}

export function mountVanillaDashboard(options: {
  root: HTMLElement;
  frameworkId: DashboardFrameworkId;
}): () => void {
  const framework = getFrameworkVisual(options.frameworkId);
  const controller = createDashboardController();

  let theme = getInitialTheme();
  let activeSectionId: string | null = null;
  let runtimeSummaryText = "";
  let tabsSignature = "";
  let runtimeTabItems = createRuntimeTabItems([], null);
  const vitePlusIconHtml = createLucideIcon(
    Plus,
    14,
    "demo-vite-tag-plus-icon",
  ).outerHTML;
  const viteTagHtml = framework.usesVite
    ? `<div class="demo-vite-tag" aria-label="Powered by Vite">${vitePlusIconHtml}<span class="demo-vite-tag-icon" aria-hidden="true">${viteBadgeIconSvg()}</span><span>Vite</span></div>`
    : "";

  options.root.className = "demo-page universa-ui-root universa-ui-surface";
  options.root.setAttribute("data-theme", theme);
  options.root.innerHTML = `
    <div class="demo-container">
      <header class="demo-header">
        <div class="demo-header-left">
          <h1 class="demo-title">Demo</h1>
          <div class="demo-pill-row">
            <div class="demo-pill" style="background-color:${framework.pillBg};color:${framework.pillFg};">
              <span class="demo-pill-icon" aria-hidden="true">${frameworkIconSvg(options.frameworkId)}</span>
              <span>${escapeHtml(framework.pillLabel)}</span>
            </div>
            ${viteTagHtml}
          </div>
        </div>
      </header>

      <div class="demo-top-controls" data-runtime-controls="true"></div>

      <div class="demo-dashboard-grid">
        <div class="demo-column">
          <div data-slot="card" class="demo-dashboard-card" style="border-radius:var(--universa-ui-radius-2xl);box-shadow:none;">
            <div data-slot="card-header">
              <div class="demo-card-header-row">
                <p data-slot="card-title">Runtime</p>
              </div>
              <p data-slot="card-description" class="demo-runtime-summary" data-runtime-summary="true"></p>
            </div>
            <div data-slot="card-content"><div data-runtime-tabs-host="true"></div></div>
          </div>
        </div>
      </div>

      <div class="demo-bottom-controls">
        <button data-slot="button" data-size="icon" data-variant="outline" class="demo-theme-toggle" data-toggle-theme="true" aria-label="Toggle theme" title="Toggle theme"></button>
      </div>
    </div>
  `;

  const controlsHost = options.root.querySelector<HTMLElement>(
    "[data-runtime-controls='true']",
  );
  const summaryEl = options.root.querySelector<HTMLElement>(
    "[data-runtime-summary='true']",
  );
  const tabsHost = options.root.querySelector<HTMLElement>(
    "[data-runtime-tabs-host='true']",
  );
  const themeButton = options.root.querySelector<HTMLElement>(
    "[data-toggle-theme='true']",
  );

  if (!controlsHost || !summaryEl || !tabsHost || !themeButton) {
    throw new Error("Failed to initialize dashboard shell");
  }

  const tabs = new Tabs({
    className: "demo-runtime-tabs",
    listClassName: "demo-runtime-tabs-list",
    orientation: "horizontal",
    variant: "default",
    items: [],
    onChange: (value) => {
      activeSectionId = value;
    },
  });
  tabsHost.replaceChildren(tabs.getElement());

  const actionControlMap = new Map<DashboardActionId, ActionButtonRefs>();
  for (const control of DASHBOARD_ACTION_CONTROLS) {
    const refs = createActionButton({
      actionId: control.id,
      initialLabel: control.fallbackLabel,
      onClick: (actionId) => {
        void controller.runAction(actionId);
      },
    });
    actionControlMap.set(control.id, refs);
    controlsHost.appendChild(refs.button);
  }

  const syncControlButtons = (actions: DashboardRuntimeUiState["controls"]) => {
    const actionsById = createActionStateMap(actions);
    for (const control of DASHBOARD_ACTION_CONTROLS) {
      const refs = actionControlMap.get(control.id);
      if (!refs) {
        continue;
      }
      const action = actionsById.get(control.id) ?? null;
      applyActionState(refs, {
        label: resolveActionLabel(action, control.fallbackLabel),
        disabled: action?.disabled ?? true,
      });
    }
  };

  let clockTimer: ReturnType<typeof setInterval> | null = null;

  const syncRuntime = (state: DashboardControllerState, now = Date.now()) => {
    const runtimeState = buildRuntimeUiState(state, activeSectionId, now);
    activeSectionId = runtimeState.activeSectionId;

    if (runtimeSummaryText !== runtimeState.runtimeSummary) {
      runtimeSummaryText = runtimeState.runtimeSummary;
      summaryEl.textContent = runtimeState.runtimeSummary;
    }

    syncControlButtons(runtimeState.controls);

    const nextTabsSignature = createTabsContentSignature(
      runtimeState.runtimeSections,
      runtimeState.runtimeError,
    );
    if (tabsSignature !== nextTabsSignature) {
      tabsSignature = nextTabsSignature;
      runtimeTabItems = createRuntimeTabItems(
        runtimeState.runtimeSections,
        runtimeState.runtimeError,
      );
      tabs.setItems(runtimeTabItems);
    } else {
      syncRuntimeTabItems(
        runtimeTabItems,
        runtimeState.runtimeSections,
        runtimeState.runtimeError,
      );
    }

    if (
      activeSectionId &&
      runtimeState.runtimeSections.some(
        (section) => section.id === activeSectionId,
      ) &&
      tabs.getValue() !== activeSectionId
    ) {
      tabs.setValue(activeSectionId);
    }
    activeSectionId = tabs.getValue();
  };

  setThemeIcon(themeButton, theme);
  themeButton.addEventListener("click", () => {
    theme = toggleTheme(theme);
    applyTheme(theme);
    options.root.setAttribute("data-theme", theme);
    setThemeIcon(themeButton, theme);
  });

  const unsubscribe = controller.subscribe((nextState) => {
    syncRuntime(nextState);
  });

  applyTheme(theme);
  controller.start();
  clockTimer = setInterval(() => {
    syncRuntime(controller.getState());
  }, 1000);

  return () => {
    if (clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
    tabs.destroy();
    unsubscribe();
    controller.stop();
  };
}
