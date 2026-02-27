import {
  type DashboardActionId,
  type DashboardActionState,
  type DashboardControllerState,
  type DashboardFrameworkId,
  type DashboardTableSection,
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

import { isTableSection, resolveRuntimeView } from "./dashboard";
import {
  frameworkIconSvg,
  getFrameworkVisual,
  viteBadgeIconSvg,
} from "./frameworks";
import { createRuntimeTabItems } from "./runtime-tab-panels";
import { applyTheme, getInitialTheme, toggleTheme } from "./theme";

const ACTION_ICONS: Record<"play" | "rotate-ccw" | "square", IconNode> = {
  play: Play,
  "rotate-ccw": RotateCcw,
  square: Square,
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
  button.replaceChildren(createLucideIcon(icon, 20, "dp-theme-icon"));
}

function buildRuntimeUiState(
  state: DashboardControllerState,
  activeSectionId: string | null,
): {
  controls: DashboardActionState[];
  runtimeSummary: string;
  runtimeSections: DashboardTableSection[];
  runtimeError: string | null;
  activeSectionId: string | null;
} {
  const runtimeView = resolveRuntimeView(state);
  const controlsSection = runtimeView.sections.find(
    (section) => section.id === "controls",
  );
  const runtimeSections = runtimeView.sections.filter(isTableSection);
  const resolvedActiveSectionId =
    activeSectionId &&
    runtimeSections.some((section) => section.id === activeSectionId)
      ? activeSectionId
      : (runtimeSections[0]?.id ?? null);

  return {
    controls:
      controlsSection && controlsSection.id === "controls"
        ? controlsSection.actions
        : [],
    runtimeSummary: runtimeView.summary,
    runtimeSections,
    runtimeError: state.live.errorMessage,
    activeSectionId: resolvedActiveSectionId,
  };
}

function createTabsContentSignature(input: {
  runtimeSections: DashboardTableSection[];
  runtimeError: string | null;
}): string {
  const sectionShape = input.runtimeSections.map((section) => ({
    id: section.id,
    title: section.title,
    rows: section.rows,
  }));
  return JSON.stringify({
    sections: sectionShape,
    runtimeError: input.runtimeError ?? null,
  });
}

export function mountVanillaDashboard(options: {
  root: HTMLElement;
  frameworkId: DashboardFrameworkId;
}): () => void {
  const framework = getFrameworkVisual(options.frameworkId);
  const controller = createDashboardController({
    currentFrameworkId: options.frameworkId,
  });

  let theme = getInitialTheme();
  let activeSectionId: string | null = null;
  let runtimeSummaryText = "";
  let tabsSignature = "";
  const vitePlusIconHtml = createLucideIcon(
    Plus,
    14,
    "dp-vite-tag-plus-icon",
  ).outerHTML;
  const viteTagHtml = framework.usesVite
    ? `<div class="dp-vite-tag" aria-label="Powered by Vite">${vitePlusIconHtml}<span class="dp-vite-tag-icon" aria-hidden="true">${viteBadgeIconSvg()}</span><span>Vite</span></div>`
    : "";

  options.root.className = "dp-page universa-ui-root universa-ui-surface";
  options.root.setAttribute("data-theme", theme);
  options.root.innerHTML = `
    <div class="dp-container">
      <header class="dp-header">
        <div class="dp-header-left">
          <h1 class="dp-title">Demo</h1>
          <div class="dp-pill-row">
            <div class="dp-pill" style="background-color:${framework.pillBg};color:${framework.pillFg};">
              <span class="dp-pill-icon" aria-hidden="true">${frameworkIconSvg(options.frameworkId)}</span>
              <span>${escapeHtml(framework.pillLabel)}</span>
            </div>
            ${viteTagHtml}
          </div>
        </div>
      </header>

      <div class="dp-top-controls" data-runtime-controls="true"></div>

      <div class="dp-dashboard-grid">
        <div class="dp-column">
          <div data-slot="card" class="dp-dashboard-card" style="border-radius:var(--universa-ui-radius-2xl);box-shadow:none;">
            <div data-slot="card-header">
              <div class="dp-card-header-row">
                <p data-slot="card-title">Runtime</p>
              </div>
              <p data-slot="card-description" class="dp-runtime-summary" data-runtime-summary="true"></p>
            </div>
            <div data-slot="card-content"><div data-runtime-tabs-host="true"></div></div>
          </div>
        </div>
      </div>

      <div class="dp-bottom-controls">
        <button data-slot="button" data-size="icon" data-variant="outline" class="dp-theme-toggle" data-toggle-theme="true" aria-label="Toggle theme" title="Toggle theme"></button>
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
    className: "dp-runtime-tabs",
    listClassName: "dp-runtime-tabs-list",
    orientation: "horizontal",
    variant: "default",
    items: [],
    onChange: (value) => {
      activeSectionId = value;
    },
  });
  tabsHost.replaceChildren(tabs.getElement());

  const createActionButton = (
    actionId: DashboardActionId,
    icon: "play" | "rotate-ccw" | "square",
    initialLabel: string,
  ): { button: HTMLButtonElement; label: HTMLSpanElement } => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("data-slot", "button");
    button.setAttribute("data-size", "sm");
    button.setAttribute("data-variant", "outline");
    button.className = "dp-action-btn";
    button.setAttribute("data-action", actionId);
    button.appendChild(
      createLucideIcon(ACTION_ICONS[icon], 14, "dp-action-icon"),
    );

    const label = document.createElement("span");
    label.textContent = initialLabel;
    button.appendChild(label);
    button.addEventListener("click", () => {
      void controller.runAction(actionId);
    });

    return { button, label };
  };

  const startControl = createActionButton("start", "play", "Start");
  const stopControl = createActionButton("stop", "square", "Stop");
  const restartControl = createActionButton("restart", "rotate-ccw", "Restart");

  controlsHost.append(
    startControl.button,
    stopControl.button,
    restartControl.button,
  );

  const syncControlButtons = (actions: DashboardActionState[]) => {
    const startAction = actions.find((action) => action.id === "start") ?? null;
    const stopAction = actions.find((action) => action.id === "stop") ?? null;
    const restartAction =
      actions.find((action) => action.id === "restart") ?? null;

    const applyActionState = (
      refs: { button: HTMLButtonElement; label: HTMLSpanElement },
      action: DashboardActionState | null,
      fallbackLabel: string,
    ) => {
      if (!action) {
        refs.label.textContent = fallbackLabel;
        refs.button.disabled = true;
        refs.button.hidden = false;
        refs.button.setAttribute("aria-label", fallbackLabel);
        refs.button.setAttribute("title", fallbackLabel);
        return;
      }

      const actionLabel = action.loading ? action.loadingLabel : action.label;
      refs.label.textContent = actionLabel;
      refs.button.disabled = action.disabled;
      refs.button.hidden = false;
      refs.button.setAttribute("aria-label", actionLabel);
      refs.button.setAttribute("title", actionLabel);
    };

    applyActionState(startControl, startAction, "Start");
    applyActionState(stopControl, stopAction, "Stop");
    applyActionState(restartControl, restartAction, "Restart");
  };

  const syncRuntime = (state: DashboardControllerState) => {
    const runtimeState = buildRuntimeUiState(state, activeSectionId);
    activeSectionId = runtimeState.activeSectionId;

    if (runtimeSummaryText !== runtimeState.runtimeSummary) {
      runtimeSummaryText = runtimeState.runtimeSummary;
      summaryEl.textContent = runtimeState.runtimeSummary;
    }

    syncControlButtons(runtimeState.controls);

    const nextTabsSignature = createTabsContentSignature({
      runtimeSections: runtimeState.runtimeSections,
      runtimeError: runtimeState.runtimeError,
    });
    if (tabsSignature !== nextTabsSignature) {
      tabsSignature = nextTabsSignature;
      tabs.setItems(
        createRuntimeTabItems(
          runtimeState.runtimeSections,
          runtimeState.runtimeError,
        ),
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

  return () => {
    tabs.destroy();
    unsubscribe();
    controller.stop();
  };
}
