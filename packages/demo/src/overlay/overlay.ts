import {
  Button,
  Checkbox,
  FileTree,
  Input,
  InputGroup,
  ScrollArea,
  Select,
  Sileo,
  Tooltip,
  applySileoLayout,
  computeSileoLayout,
  createBadge,
  createInputGroupAddon,
  createSileoShape,
  filterFileTree,
  resolveSileoExpandEdge,
} from "universa-ui/components";
import { Portal, createDomElement as createElement } from "universa-ui/dom";

import {
  type DemoApi,
  type WebSocketBinding,
  createDemoApi,
  createWebSocketBinding,
  getDevServerBaseUrlCandidates,
  resolveDevServerBaseUrl,
} from "./api.js";
import {
  OVERLAY_HOST_ID,
  OVERLAY_POSITIONS,
  STATE_POLL_INTERVAL_MS,
  TABS,
  WS_RECONNECT_DELAY_MS,
} from "./constants.js";
import { createFileTypeIcon } from "./file-types.js";
import { createIcon, createSeverityIcon } from "./icons.js";
import {
  createInitialOverlayState,
  loadOverlaySettings,
  overlayReducer,
  persistOverlaySettings,
} from "./state.js";
import { resolveOverlaySeverity, resolveStatusCopy } from "./status.js";
import { getOverlayStyles } from "./styles/index.js";
import {
  resolveBridgeTransportState,
  resolveFailureTransportState,
  shouldRetainConnectedStateOnFailure,
} from "./transport.js";
import type {
  FileMetadata,
  OverlayAction,
  OverlayMountOptions,
  OverlaySettings,
  OverlaySeverity,
  OverlayState,
  OverlayTab,
  OverlayTheme,
  TabDefinition,
} from "./types.js";

interface OverlayWindowConfig {
  __DEMO_OVERLAY_STYLE_NONCE__?: string;
  __NUXT__?: unknown;
}

interface SileoHeaderView {
  key: string;
  title: string;
  state: OverlaySeverity;
}

const SILEO_HEADER_HEIGHT = 40;
const SILEO_HEADER_EXIT_MS = 150;
const SILEO_HEADER_SUCCESS_DECAY_MS = 4000;

function createKeyValueRow(key: string, value: string): HTMLElement {
  const row = createElement("div", { className: "kv-row" });
  row.appendChild(
    createElement("span", { className: "kv-key", textContent: key }),
  );
  row.appendChild(
    createElement("span", {
      className: "kv-value",
      textContent: value || "n/a",
    }),
  );
  return row;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString();
}

function formatUptime(startedAt: number): string {
  const s = Math.floor((Date.now() - startedAt) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatTransportState(state: string): string {
  return state.replace(/_/g, " ");
}

function formatOverlayPositionLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function severityToBadgeVariant(
  severity: OverlaySeverity,
): "error" | "warning" | "success" | "info" | "secondary" {
  switch (severity) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "success":
      return "success";
    case "info":
      return "info";
    default:
      return "secondary";
  }
}

function normalizeTheme(theme: OverlayTheme): "light" | "dark" {
  if (theme === "light" || theme === "dark") return theme;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "dark";
}

function normalizeNonce(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveStyleNonce(explicitNonce?: string): string | undefined {
  const provided = normalizeNonce(explicitNonce);
  if (provided) return provided;
  if (typeof window === "undefined") return undefined;

  const configWindow = window as Window & OverlayWindowConfig;
  const fromGlobal = normalizeNonce(configWindow.__DEMO_OVERLAY_STYLE_NONCE__);
  if (fromGlobal) return fromGlobal;

  const fromMeta = normalizeNonce(
    document
      .querySelector('meta[name="csp-nonce"], meta[property="csp-nonce"]')
      ?.getAttribute("content"),
  );
  if (fromMeta) return fromMeta;

  return normalizeNonce(
    document.querySelector("script[nonce]")?.getAttribute("nonce"),
  );
}

function isPointerInsideOverlay(
  host: HTMLElement | null,
  shadowRoot: ShadowRoot | null,
  event: MouseEvent,
): boolean {
  if (!host || !shadowRoot) return false;
  const path = event.composedPath();
  return path.includes(host) || path.includes(shadowRoot);
}

export class DemoOverlay {
  #api: DemoApi;
  #baseUrl: string;
  #baseUrlCandidates: string[] = [];
  #baseUrlCandidateIndex = 0;
  #host: HTMLElement | null = null;
  #hostObserver: MutationObserver | null = null;
  #shadowRoot: ShadowRoot | null = null;
  #mounted = false;
  #state: OverlayState;
  #wsBinding: WebSocketBinding | null = null;
  #wsConnectionVersion = 0;
  #wsConsecutiveFailures = 0;
  #wsConnected = false;
  #wsFallbackMode = false;
  #wsOpenedAt: number | null = null;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  #statePollTimer: ReturnType<typeof setInterval> | null = null;
  #allowWebSocket = true;
  #portal: Portal | null = null;
  #forceMount = false;
  #styleNonce?: string;
  #sileoReady = false;
  #sileo: Sileo | null = null;
  #fileTree: FileTree | null = null;
  #sidebarScrollArea: ScrollArea | null = null;
  #sidebarFilterInput: Input | null = null;
  #bodyScrollArea: ScrollArea | null = null;
  #outsideClickCleanup: (() => void) | null = null;
  #inputs: Input[] = [];
  #scrollAreas: ScrollArea[] = [];
  #selects: Select[] = [];
  #checkboxes: Checkbox[] = [];
  #tooltips: Tooltip[] = [];
  #headerLayer: { current: SileoHeaderView; prev: SileoHeaderView | null } = {
    current: { key: "info|Demo", title: "Demo", state: "info" },
    prev: null,
  };
  #headerExitTimer: ReturnType<typeof setTimeout> | null = null;
  #headerSuccessDecayTimer: ReturnType<typeof setTimeout> | null = null;
  #headerSuccessSince: number | null = null;
  #renderScheduled = false;
  #bodyUpdateScheduled = false;
  #runtimeRefreshFailures = 0;

  constructor(options: OverlayMountOptions = {}) {
    const settings = loadOverlaySettings();
    this.#state = createInitialOverlayState(settings);
    this.#baseUrlCandidates = getDevServerBaseUrlCandidates(options.baseUrl);
    this.#baseUrl =
      this.#baseUrlCandidates[0] || resolveDevServerBaseUrl(options.baseUrl);
    this.#api = createDemoApi(this.#baseUrl);
    this.#forceMount = Boolean(options.force);
    this.#styleNonce = resolveStyleNonce(options.styleNonce);
    this.#allowWebSocket =
      typeof window === "undefined"
        ? true
        : !(window as Window & OverlayWindowConfig).__NUXT__;

    if (this.#forceMount && !settings.enabled) {
      this.applySettings({ ...settings, enabled: true });
    }
  }

  mount(): void {
    if (this.#mounted) return;
    if (!this.#state.settings.enabled && !this.#forceMount) return;

    document
      .querySelectorAll<HTMLElement>(`#${OVERLAY_HOST_ID}`)
      .forEach((node) => node.remove());

    this.#host = createElement("div", {
      attributes: { id: OVERLAY_HOST_ID },
    });
    this.#shadowRoot = this.#host.attachShadow({ mode: "open" });
    this.#portal = new Portal(this.#shadowRoot);
    document.body.appendChild(this.#host);
    this.startHostObserver();

    this.#sileoReady = false;
    this.#mounted = true;
    this.dispatch({ type: "setLoadingAction", loadingAction: "Connecting" });

    requestAnimationFrame(() => {
      if (!this.#mounted) return;
      this.#sileoReady = true;
      this.render();
    });

    void this.bootstrap();
  }

  destroy(): void {
    this.clearReconnectTimer();
    this.clearHeaderExitTimer();
    this.clearHeaderSuccessDecayTimer();
    this.#outsideClickCleanup?.();
    this.#outsideClickCleanup = null;
    this.#sileo?.destroy();
    this.#sileo = null;
    this.#fileTree?.destroy();
    this.#fileTree = null;
    this.#sidebarScrollArea?.destroy();
    this.#sidebarScrollArea = null;
    this.#sidebarFilterInput?.destroy();
    this.#sidebarFilterInput = null;
    this.#bodyScrollArea?.destroy();
    this.#bodyScrollArea = null;
    this.stopStatePolling();
    this.closeWebSocket();
    this.stopHostObserver();
    this.disposeTransientComponents();

    if (this.#host) {
      this.#host.remove();
      this.#host = null;
    }

    this.#portal?.destroy();
    this.#portal = null;
    this.#shadowRoot = null;
    this.#mounted = false;
    this.#sileoReady = false;
  }

  private async bootstrap(): Promise<void> {
    await this.refreshState({ detectBridge: true });
    if (this.#allowWebSocket) {
      this.connectWebSocket();
    } else {
      this.#wsConnected = false;
      this.#wsFallbackMode = true;
    }
    this.startStatePolling();
    this.dispatch({ type: "bootstrapComplete" });
    if (this.#state.activeTab === "files") {
      void this.ensureFileTreeLoaded();
    }
  }

  private dispatch(action: OverlayAction): void {
    const prevState = this.#state;
    this.#state = overlayReducer(this.#state, action);

    if (action.type === "setSettings") {
      persistOverlaySettings(action.settings);
    }

    if (this.#mounted) {
      this.applyUpdate(action, prevState);
    }
  }

  private applySettings(settings: OverlaySettings): void {
    this.dispatch({ type: "setSettings", settings });
  }

  private applyUpdate(action: OverlayAction, prevState: OverlayState): void {
    switch (action.type) {
      case "setExpanded":
        this.#sileo?.setExpanded(this.#state.expanded);
        break;
      case "setTab": {
        // Only full-render when switching between the workspace sidebar (files)
        // and the normal sidebar — that's the only case where the shell structure
        // actually changes. All other tab switches just swap the body pane.
        const prevWorkspace = prevState.activeTab === "files";
        const nextWorkspace = this.#state.activeTab === "files";
        if (prevWorkspace !== nextWorkspace) {
          this.scheduleRender();
        } else {
          this.applyTabState();
        }
        break;
      }
      case "setSettings": {
        const shellChanged =
          action.settings.theme !== prevState.settings.theme ||
          action.settings.position !== prevState.settings.position;
        if (shellChanged) {
          this.scheduleRender();
        } else {
          const autoExpandChanged =
            action.settings.autoExpand !== prevState.settings.autoExpand;
          if (autoExpandChanged) {
            const root =
              this.#shadowRoot?.querySelector<HTMLElement>(".demo-overlay");
            if (root)
              root.dataset.autoExpand = action.settings.autoExpand
                ? "true"
                : "false";
          }
          this.applyBodyState();
        }
        break;
      }
      case "setBridgeState":
      case "setTransportState":
        this.scheduleBodyUpdate();
        break;
      case "setFileTree":
      case "setTreeLoading":
        // Sidebar structure may change (loading placeholder ↔ tree)
        if (this.#state.activeTab === "files") {
          this.scheduleRender();
        } else {
          this.scheduleBodyUpdate();
        }
        break;
      case "setFileFilter":
      case "setSelectedFilePath":
      case "setFileMetadata":
      case "setFileMetadataLoading":
        this.scheduleBodyUpdate();
        break;
      case "setConnected":
      case "setError":
      case "markSuccess":
      case "setLoadingAction":
      case "bootstrapComplete":
        this.applyTopbarState();
        this.scheduleBodyUpdate();
        break;
      default:
        this.scheduleRender();
    }
  }

  private scheduleRender(): void {
    if (this.#renderScheduled) return;
    this.#renderScheduled = true;
    queueMicrotask(() => {
      this.#renderScheduled = false;
      if (this.#mounted) this.render();
    });
  }

  private scheduleBodyUpdate(): void {
    if (this.#bodyUpdateScheduled || this.#renderScheduled) return;
    this.#bodyUpdateScheduled = true;
    queueMicrotask(() => {
      this.#bodyUpdateScheduled = false;
      if (this.#mounted && !this.#renderScheduled) this.applyBodyState();
    });
  }

  private applyBodyState(): void {
    if (!this.#shadowRoot) return;
    const viewport = this.#bodyScrollArea?.getViewport() ?? null;
    if (!viewport) {
      this.render();
      return;
    }

    Select.closeAll();
    this.disposeTransientComponents();
    viewport.textContent = "";
    viewport.scrollTop = 0;
    viewport.appendChild(this.renderPaneByTab(this.#state.activeTab));

    // Update sidebar file tree in-place (filter input stays in DOM)
    if (
      this.#state.activeTab === "files" &&
      this.#fileTree &&
      this.#state.fileTree.length > 0
    ) {
      const q = this.#state.fileFilter.trim();
      if (q) {
        const { nodes, forceExpand } = filterFileTree(
          this.#state.fileTree as Parameters<typeof filterFileTree>[0],
          q,
        );
        this.#fileTree.render(
          nodes,
          this.#state.selectedFilePath ?? null,
          forceExpand,
        );
      } else {
        this.#fileTree.render(
          this.#state.fileTree as Parameters<typeof filterFileTree>[0],
          this.#state.selectedFilePath ?? null,
        );
      }
    }
  }

  private applyTopbarState(): void {
    if (!this.#shadowRoot) return;
    const severity = resolveOverlaySeverity(this.#state);
    const headerSeverity = this.resolveHeaderSeverity(severity);
    const statusCopy = resolveStatusCopy(this.#state);
    const overlayTitle = "Demo";

    this.syncHeaderLayer(overlayTitle, headerSeverity);

    const root = this.#shadowRoot.querySelector<HTMLElement>(".demo-overlay");
    if (root) root.dataset.severity = severity;

    const toast =
      this.#shadowRoot.querySelector<HTMLElement>("[data-shell-toast]");
    if (toast) {
      toast.dataset.state = severity;
      toast.setAttribute(
        "aria-label",
        `Demo overlay. ${statusCopy.title}. ${statusCopy.detail}`,
      );
    }

    const toggleHeader = this.#shadowRoot.querySelector<HTMLElement>(
      "[data-shell-header]",
    );
    if (toggleHeader) {
      toggleHeader.setAttribute(
        "aria-label",
        `Toggle Demo overlay. ${statusCopy.title}. ${statusCopy.detail}`,
      );
    }

    const oldTopbarBadge = this.#shadowRoot.querySelector<HTMLElement>(
      "[data-topbar-badge]",
    );
    if (oldTopbarBadge) {
      const newBadge = createBadge({
        text: statusCopy.title,
        variant: severityToBadgeVariant(severity),
      });
      newBadge.setAttribute("role", "status");
      newBadge.setAttribute("aria-live", "polite");
      newBadge.setAttribute("data-topbar-badge", "");
      newBadge.prepend(createSeverityIcon(severity));
      oldTopbarBadge.replaceWith(newBadge);
    }
  }

  private applyTabState(): void {
    if (!this.#shadowRoot) return;
    const shadowRoot = this.#shadowRoot;
    TABS.forEach((tab) => {
      const isActive = this.#state.activeTab === tab.id;
      const btn = shadowRoot.getElementById(
        this.getTabId(tab.id),
      ) as HTMLButtonElement | null;
      if (!btn) return;
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.setAttribute("data-active", isActive ? "true" : "false");
      btn.tabIndex = isActive ? 0 : -1;
    });
    this.applyBodyState();
  }

  private setExpanded(expanded: boolean): void {
    if (!this.#state.settings.enabled) return;
    if (expanded === this.#state.expanded) return;
    this.dispatch({ type: "setExpanded", expanded });
    if (expanded) {
      setTimeout(() => {
        if (!this.#state.expanded) return;
        const handler = (e: MouseEvent) => {
          if (isPointerInsideOverlay(this.#host, this.#shadowRoot, e)) return;
          this.setExpanded(false);
        };
        document.addEventListener("click", handler);
        this.#outsideClickCleanup = () =>
          document.removeEventListener("click", handler);
      }, 0);
    } else {
      this.#outsideClickCleanup?.();
      this.#outsideClickCleanup = null;
    }
  }

  private getTabId(tab: OverlayTab): string {
    return `demo-overlay-tab-${tab}`;
  }

  private shouldUseWorkspaceSidebar(): boolean {
    return this.#state.activeTab === "files";
  }

  private selectTab(tab: OverlayTab, focus = false): void {
    this.dispatch({ type: "setTab", tab });
    if (tab === "files") {
      void this.ensureFileTreeLoaded();
    }
    if (focus) {
      requestAnimationFrame(() => {
        const tabEl = this.#shadowRoot?.getElementById(
          this.getTabId(tab),
        ) as HTMLButtonElement | null;
        tabEl?.focus();
      });
    }
  }

  private disposeTransientComponents(): void {
    this.#inputs.forEach((c) => c.destroy());
    this.#inputs = [];
    this.#scrollAreas.forEach((c) => c.destroy());
    this.#scrollAreas = [];
    this.#selects.forEach((c) => c.destroy());
    this.#selects = [];
    this.#checkboxes.forEach((c) => c.destroy());
    this.#checkboxes = [];
    this.#tooltips.forEach((c) => c.destroy());
    this.#tooltips = [];
  }

  // ── Sidebar & Toolbar ──────────────────────────────────────────────────────

  #createNavTabButton(
    tab: TabDefinition,
    mode: "sidebar" | "toolbar",
    isActive: boolean,
    activePanelId: string,
  ): HTMLButtonElement {
    const buttonId =
      mode === "sidebar"
        ? this.getTabId(tab.id)
        : `${this.getTabId(tab.id)}-toolbar`;
    const btn = createElement("button", {
      className: "tab-btn",
      attributes: {
        id: buttonId,
        type: "button",
        role: "tab",
        "aria-selected": isActive ? "true" : "false",
        "aria-controls": activePanelId,
        tabindex: isActive ? "0" : "-1",
        "data-active": isActive ? "true" : "false",
        ...(mode === "toolbar" ? { "aria-label": tab.label } : {}),
      },
    }) as HTMLButtonElement;
    btn.appendChild(createIcon(tab.icon, { size: 16 }));
    if (mode === "sidebar") {
      btn.appendChild(
        createElement("span", {
          className: "tab-label",
          textContent: tab.label,
        }),
      );
    }
    return btn;
  }

  #addNavKeyboard(
    btn: HTMLButtonElement,
    tab: TabDefinition,
    allTabs: TabDefinition[],
    orientation: "vertical" | "horizontal",
  ): void {
    btn.addEventListener("keydown", (event) => {
      const idx = allTabs.findIndex((t) => t.id === tab.id);
      if (idx === -1) return;
      const move = (next: number) => {
        const normalized = (next + allTabs.length) % allTabs.length;
        this.selectTab(allTabs[normalized].id as OverlayTab, true);
      };
      const fwd = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
      const bwd = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
      if (event.key === fwd) {
        event.preventDefault();
        move(idx + 1);
      } else if (event.key === bwd) {
        event.preventDefault();
        move(idx - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        move(0);
      } else if (event.key === "End") {
        event.preventDefault();
        move(allTabs.length - 1);
      }
    });
  }

  #buildSidebarNav(activePanelId: string): HTMLElement {
    const sidebar = createElement("aside", {
      className: "dp-overlay__sidebar",
    });
    const nav = createElement("nav", {
      className: "dp-overlay__tabs",
      attributes: {
        "aria-label": "Demo overlay tabs",
        role: "tablist",
        "aria-orientation": "vertical",
      },
    });

    TABS.forEach((tab) => {
      const isActive = this.#state.activeTab === tab.id;
      const btn = this.#createNavTabButton(
        tab,
        "sidebar",
        isActive,
        activePanelId,
      );
      btn.addEventListener("click", () => this.selectTab(tab.id as OverlayTab));
      this.#addNavKeyboard(btn, tab, TABS, "vertical");
      nav.appendChild(btn);
    });

    const scrollArea = new ScrollArea({
      className: "dp-overlay__sidebar-scroll",
      scrollbarAlwaysVisible: true,
      fill: true,
    });
    scrollArea.appendChild(nav);
    sidebar.appendChild(scrollArea.getElement());
    this.#sidebarScrollArea = scrollArea;

    return sidebar;
  }

  #buildWorkspaceSidebar(activePanelId: string): HTMLElement {
    const sidebar = createElement("aside", {
      className: "dp-overlay__sidebar dp-overlay__sidebar--workspace",
    });
    const nav = createElement("nav", {
      className: "dp-overlay__tabs dp-overlay__tabs--workspace",
      attributes: {
        "aria-label": "Demo overlay files navigation",
        role: "tablist",
        "aria-orientation": "vertical",
      },
    });

    const navControls = createElement("div", {
      className: "workspace-nav-controls",
    });

    // Back button → runtime tab
    const backBtn = new Button({
      variant: "outline",
      size: "icon-sm",
      className: "workspace-back-btn",
      ariaLabel: "Back to Runtime",
      onClick: () => this.selectTab("runtime", true),
    }).getElement();
    backBtn.setAttribute("role", "tab");
    backBtn.setAttribute("aria-selected", "false");
    backBtn.setAttribute("aria-controls", activePanelId);
    backBtn.tabIndex = 0;
    backBtn.prepend(createIcon("arrow-left", { size: 16 }));
    if (this.#portal) {
      this.#tooltips.push(
        new Tooltip(backBtn, {
          content: "Back",
          side: "right",
          portal: this.#portal,
        }),
      );
    }
    navControls.appendChild(backBtn);

    // Context label (disabled tab-like button)
    const contextBtn = createElement("button", {
      className: "tab-btn workspace-context-btn",
      attributes: {
        type: "button",
        disabled: "",
        "aria-disabled": "true",
        tabindex: "-1",
        "data-active": "true",
      },
    }) as HTMLButtonElement;
    contextBtn.appendChild(createIcon("folder-open", { size: 16 }));
    contextBtn.appendChild(
      createElement("span", { className: "tab-label", textContent: "Files" }),
    );
    navControls.appendChild(contextBtn);
    nav.appendChild(navControls);

    // Filter search input
    const searchControls = createElement("div", {
      className: "workspace-sidebar-controls",
    });
    const filterGroup = new InputGroup({ className: "search-input" });
    const filterAddon = createInputGroupAddon({ align: "inline-start" });
    filterAddon.appendChild(createIcon("search", { size: 14 }));
    filterGroup.append(filterAddon);
    this.#sidebarFilterInput = new Input({
      type: "search",
      value: this.#state.fileFilter,
      placeholder: "Search files",
      ariaLabel: "Search files",
      className: "search-input-native",
      onInput: (value) =>
        this.dispatch({ type: "setFileFilter", fileFilter: value }),
    });
    filterGroup.append(this.#sidebarFilterInput.getElement());
    searchControls.appendChild(filterGroup.getElement());
    nav.appendChild(searchControls);
    sidebar.appendChild(nav);

    // Scroll area with file tree
    const scrollArea = new ScrollArea({
      className: "dp-overlay__sidebar-scroll",
      scrollbarAlwaysVisible: true,
      fill: true,
    });
    const contentWrap = createElement("div", {
      className: "workspace-sidebar-content",
    });

    if (this.#state.treeLoading && this.#state.fileTree.length === 0) {
      contentWrap.appendChild(
        createElement("p", {
          className: "empty-state",
          textContent: "Loading…",
        }),
      );
    } else if (this.#state.fileTree.length === 0) {
      contentWrap.appendChild(
        createElement("p", {
          className: "empty-state",
          textContent: "No files found.",
        }),
      );
    } else {
      if (!this.#fileTree) {
        this.#fileTree = new FileTree({
          onFileClick: (path) => {
            this.dispatch({ type: "setSelectedFilePath", path });
            void this.loadFileMetadata(path);
          },
          fileIconRenderer: (node) =>
            createFileTypeIcon(node.path, { size: 14 }),
        });
      }
      const q = this.#state.fileFilter.trim();
      if (q) {
        const { nodes, forceExpand } = filterFileTree(
          this.#state.fileTree as Parameters<typeof filterFileTree>[0],
          q,
        );
        this.#fileTree.render(
          nodes,
          this.#state.selectedFilePath ?? null,
          forceExpand,
        );
      } else {
        this.#fileTree.render(
          this.#state.fileTree as Parameters<typeof filterFileTree>[0],
          this.#state.selectedFilePath ?? null,
        );
      }
      contentWrap.appendChild(this.#fileTree.getElement());
    }

    scrollArea.appendChild(contentWrap);
    this.#sidebarScrollArea = scrollArea;
    sidebar.appendChild(scrollArea.getElement());

    return sidebar;
  }

  #buildToolbar(activePanelId: string): HTMLElement {
    const toolbar = createElement("div", {
      className: "dp-overlay__toolbar",
      attributes: {
        role: "tablist",
        "aria-label": "Demo overlay tabs",
        "aria-orientation": "horizontal",
      },
    });

    TABS.forEach((tab) => {
      const isActive = this.#state.activeTab === tab.id;
      const btn = this.#createNavTabButton(
        tab,
        "toolbar",
        isActive,
        activePanelId,
      );
      btn.addEventListener("click", () => this.selectTab(tab.id as OverlayTab));
      this.#addNavKeyboard(btn, tab, TABS, "horizontal");
      toolbar.appendChild(btn);
    });

    return toolbar;
  }

  // ── Pane renderers ─────────────────────────────────────────────────────────

  private renderPaneByTab(tab: OverlayTab): HTMLElement {
    switch (tab) {
      case "runtime":
        return this.renderRuntimePane();
      case "files":
        return this.renderFilesPane();
      case "settings":
        return this.renderSettingsPane();
      default:
        return this.renderRuntimePane();
    }
  }

  private renderSettingsPane(): HTMLElement {
    const pane = createElement("section", { className: "overlay-pane" });
    const settings = this.#state.settings;

    // Behavior
    const behaviorSection = createElement("section", {
      className: "pane-section",
    });
    behaviorSection.appendChild(
      createElement("h4", { className: "pane-title", textContent: "Behavior" }),
    );

    const autoExpandRow = createElement("div", { className: "settings-row" });
    autoExpandRow.appendChild(
      createElement("label", {
        className: "settings-label",
        textContent: "Expand on hover / focus",
      }),
    );
    const autoExpandCheckbox = new Checkbox({
      className: "settings-checkbox",
      checked: settings.autoExpand,
      onChange: (checked) => {
        this.applySettings({ ...settings, autoExpand: checked });
      },
      ariaLabel: "Expand on hover / focus",
    });
    this.#checkboxes.push(autoExpandCheckbox);
    autoExpandRow.appendChild(autoExpandCheckbox.getElement());
    behaviorSection.appendChild(autoExpandRow);
    pane.appendChild(behaviorSection);

    // Appearance
    const appearanceSection = createElement("section", {
      className: "pane-section",
    });
    appearanceSection.appendChild(
      createElement("h4", {
        className: "pane-title",
        textContent: "Appearance",
      }),
    );

    const themeRow = createElement("div", { className: "settings-row" });
    themeRow.appendChild(
      createElement("label", {
        className: "settings-label",
        textContent: "Theme",
      }),
    );
    if (this.#portal) {
      const themeSelect = new Select({
        className: "settings-select",
        options: ["system", "light", "dark"],
        value: settings.theme,
        onChange: (value) => {
          this.applySettings({ ...settings, theme: value as OverlayTheme });
        },
        portal: this.#portal,
        alignItemWithTrigger: false,
        labelFormatter: (value) => value[0].toUpperCase() + value.slice(1),
      });
      this.#selects.push(themeSelect);
      themeRow.appendChild(themeSelect.getElement());
    }
    appearanceSection.appendChild(themeRow);

    const positionRow = createElement("div", { className: "settings-row" });
    positionRow.appendChild(
      createElement("label", {
        className: "settings-label",
        textContent: "Position",
      }),
    );
    if (this.#portal) {
      const positionSelect = new Select({
        className: "settings-select",
        options: OVERLAY_POSITIONS,
        value: settings.position,
        onChange: (value) => {
          this.applySettings({
            ...settings,
            position: value as OverlaySettings["position"],
          });
        },
        portal: this.#portal,
        alignItemWithTrigger: false,
        labelFormatter: formatOverlayPositionLabel,
      });
      this.#selects.push(positionSelect);
      positionRow.appendChild(positionSelect.getElement());
    }
    appearanceSection.appendChild(positionRow);
    pane.appendChild(appearanceSection);

    return pane;
  }

  private renderFilesPane(): HTMLElement {
    const pane = createElement("section", { className: "overlay-pane" });

    if (this.#state.selectedFilePath && this.#state.fileMetadata) {
      pane.appendChild(this.renderFileMetadata(this.#state.fileMetadata));
    } else if (
      this.#state.selectedFilePath &&
      this.#state.fileMetadataLoading
    ) {
      pane.appendChild(
        createElement("p", {
          className: "empty-state",
          textContent: "Loading…",
        }),
      );
    } else {
      pane.appendChild(
        createElement("p", {
          className: "empty-state",
          textContent: "Select a file to view details.",
        }),
      );
    }

    return pane;
  }

  private renderFileMetadata(meta: FileMetadata): HTMLElement {
    const panel = createElement("div", { className: "file-detail-panel" });

    const nameEl = createElement("p", { className: "file-detail-name" });
    nameEl.appendChild(createFileTypeIcon(meta.path, { size: 14 }));
    nameEl.appendChild(document.createTextNode(meta.name));
    panel.appendChild(nameEl);

    const openBtn = new Button({
      variant: "outline",
      size: "sm",
      text: "Open in editor",
      onClick: () => {
        window.open(`vscode://file/${meta.absolutePath}`, "_self");
      },
    }).getElement();
    openBtn.prepend(createIcon("external-link", { size: 14 }));
    openBtn.style.justifySelf = "start";
    panel.appendChild(openBtn);

    const section = createElement("div", { className: "pane-section" });
    section.appendChild(
      createElement("h4", { className: "pane-title", textContent: "Metadata" }),
    );

    const grid = createElement("div", { className: "kv-grid" });
    grid.appendChild(createKeyValueRow("Name", meta.name));
    grid.appendChild(createKeyValueRow("Path", meta.path));
    if (meta.absolutePath) {
      grid.appendChild(createKeyValueRow("Full path", meta.absolutePath));
    }
    grid.appendChild(
      createKeyValueRow(
        "Type",
        meta.isDirectory ? "Directory" : meta.extension || "File",
      ),
    );
    grid.appendChild(createKeyValueRow("Size", formatBytes(meta.size)));
    if (meta.lines !== undefined) {
      grid.appendChild(createKeyValueRow("Lines", meta.lines.toLocaleString()));
    }
    grid.appendChild(createKeyValueRow("Modified", formatDate(meta.modified)));
    grid.appendChild(createKeyValueRow("Created", formatDate(meta.created)));
    section.appendChild(grid);
    panel.appendChild(section);

    return panel;
  }

  private renderRuntimePane(): HTMLElement {
    const pane = createElement("div", {
      className: "runtime-pane overlay-pane",
    });
    const bridgeState = this.#state.bridgeState;
    const runtime = bridgeState?.runtime;
    const capabilities = bridgeState?.capabilities;
    const phase = runtime?.phase ?? "stopped";
    const severity = resolveOverlaySeverity(this.#state);

    // ── Controls section ──
    const controlsSection = createElement("div", { className: "pane-section" });
    controlsSection.appendChild(
      createElement("h4", { className: "pane-title", textContent: "Controls" }),
    );

    const isTransitioning =
      phase === "starting" ||
      phase === "stopping" ||
      Boolean(this.#state.loadingAction);
    const isRunning = phase === "running";
    const hasControl = capabilities?.hasRuntimeControl ?? false;
    const startLabel =
      this.#state.loadingAction === "Starting" ? "Starting..." : "Start";
    const stopLabel =
      this.#state.loadingAction === "Stopping" ? "Stopping..." : "Stop";
    const restartLabel =
      this.#state.loadingAction === "Restarting" ? "Restarting..." : "Restart";

    const actionsGrid = createElement("div", { className: "actions-grid" });

    const startBtn = new Button({
      variant: "outline",
      size: "sm",
      text: startLabel,
      className: "action-btn",
      disabled: !hasControl || isRunning || isTransitioning,
      onClick: () => void this.handleStart(),
    }).getElement();
    startBtn.prepend(createIcon("play", { size: 14 }));

    const restartBtn = new Button({
      variant: "outline",
      size: "sm",
      text: restartLabel,
      className: "action-btn",
      disabled: !hasControl || !isRunning || isTransitioning,
      onClick: () => void this.handleRestart(),
    }).getElement();
    restartBtn.prepend(createIcon("rotate-ccw", { size: 14 }));

    const stopBtn = new Button({
      variant: "outline",
      size: "sm",
      text: stopLabel,
      className: "action-btn",
      disabled: !hasControl || !isRunning || isTransitioning,
      onClick: () => void this.handleStop(),
    }).getElement();
    stopBtn.prepend(createIcon("square", { size: 14 }));

    actionsGrid.appendChild(startBtn);
    actionsGrid.appendChild(stopBtn);
    actionsGrid.appendChild(restartBtn);

    controlsSection.appendChild(actionsGrid);

    if (this.#state.errorMessage) {
      controlsSection.appendChild(
        createElement("p", {
          className: "pane-title-copy",
          textContent: this.#state.errorMessage,
        }),
      );
    }

    pane.appendChild(controlsSection);

    // ── Bridge section ──
    const bridgeSection = createElement("div", { className: "pane-section" });
    bridgeSection.appendChild(
      createElement("h4", { className: "pane-title", textContent: "Bridge" }),
    );
    const bridgeGrid = createElement("div", { className: "kv-grid" });
    bridgeGrid.appendChild(
      createKeyValueRow(
        "Transport",
        formatTransportState(this.#state.transportState),
      ),
    );
    bridgeGrid.appendChild(
      createKeyValueRow("Connected", this.#state.connected ? "Yes" : "No"),
    );
    if (bridgeState?.protocolVersion) {
      bridgeGrid.appendChild(
        createKeyValueRow("Protocol", `v${bridgeState.protocolVersion}`),
      );
    }
    if (bridgeState?.capabilities?.supportedProtocolVersions?.length) {
      bridgeGrid.appendChild(
        createKeyValueRow(
          "Supported",
          bridgeState.capabilities.supportedProtocolVersions
            .map((v) => `v${v}`)
            .join(", "),
        ),
      );
    }
    if (this.#state.lastSuccessAt) {
      bridgeGrid.appendChild(
        createKeyValueRow(
          "Last contact",
          formatDate(this.#state.lastSuccessAt),
        ),
      );
    }
    if (bridgeState?.error) {
      bridgeGrid.appendChild(createKeyValueRow("Error", bridgeState.error));
    }
    bridgeSection.appendChild(bridgeGrid);
    pane.appendChild(bridgeSection);

    // ── WebSocket connection section ──
    const wsSection = createElement("div", { className: "pane-section" });
    wsSection.appendChild(
      createElement("h4", {
        className: "pane-title",
        textContent: "WebSocket",
      }),
    );
    const wsGrid = createElement("div", { className: "kv-grid" });
    wsGrid.appendChild(
      createKeyValueRow("Status", this.#wsConnected ? "Open" : "Closed"),
    );
    if (this.#wsOpenedAt) {
      wsGrid.appendChild(
        createKeyValueRow("Opened", formatDate(this.#wsOpenedAt)),
      );
    }
    wsGrid.appendChild(
      createKeyValueRow(
        "Mode",
        this.#wsFallbackMode ? "Polling fallback" : "WebSocket",
      ),
    );
    if (this.#wsConsecutiveFailures > 0) {
      wsGrid.appendChild(
        createKeyValueRow("Failures", String(this.#wsConsecutiveFailures)),
      );
    }
    wsSection.appendChild(wsGrid);
    pane.appendChild(wsSection);

    // ── Runtime process section ──
    const runtimeSection = createElement("div", { className: "pane-section" });
    runtimeSection.appendChild(
      createElement("h4", { className: "pane-title", textContent: "Runtime" }),
    );
    const phaseBadge = createBadge({
      text: resolveStatusCopy(this.#state).title,
      variant: severityToBadgeVariant(severity),
    });
    phaseBadge.prepend(createSeverityIcon(severity));
    phaseBadge.style.justifySelf = "start";
    runtimeSection.appendChild(phaseBadge);

    const runtimeGrid = createElement("div", { className: "kv-grid" });
    runtimeGrid.appendChild(createKeyValueRow("Phase", phase));
    if (runtime?.pid) {
      runtimeGrid.appendChild(createKeyValueRow("PID", String(runtime.pid)));
    }
    if (runtime?.url) {
      runtimeGrid.appendChild(createKeyValueRow("URL", runtime.url));
    }
    if (runtime?.startedAt) {
      runtimeGrid.appendChild(
        createKeyValueRow("Started", formatDate(runtime.startedAt)),
      );
      runtimeGrid.appendChild(
        createKeyValueRow("Uptime", formatUptime(runtime.startedAt)),
      );
    }
    if (runtime?.lastError) {
      runtimeGrid.appendChild(
        createKeyValueRow("Last error", runtime.lastError),
      );
    }
    runtimeSection.appendChild(runtimeGrid);
    pane.appendChild(runtimeSection);

    // ── Capabilities section ──
    if (capabilities) {
      const capsSection = createElement("div", { className: "pane-section" });
      capsSection.appendChild(
        createElement("h4", {
          className: "pane-title",
          textContent: "Capabilities",
        }),
      );
      const capsGrid = createElement("div", { className: "kv-grid" });
      capsGrid.appendChild(
        createKeyValueRow("Command host", capabilities.commandHost),
      );
      capsGrid.appendChild(
        createKeyValueRow("WS subprotocol", capabilities.wsSubprotocol),
      );
      capsGrid.appendChild(
        createKeyValueRow(
          "Runtime control",
          capabilities.hasRuntimeControl ? "Yes" : "No",
        ),
      );
      capsGrid.appendChild(
        createKeyValueRow(
          "Actions",
          [
            capabilities.canStartRuntime ? "start" : null,
            capabilities.canRestartRuntime ? "restart" : null,
            capabilities.canStopRuntime ? "stop" : null,
          ]
            .filter(Boolean)
            .join(", ") || "none",
        ),
      );
      if (capabilities.fallbackCommand) {
        capsGrid.appendChild(
          createKeyValueRow("Fallback cmd", capabilities.fallbackCommand),
        );
      }
      capsSection.appendChild(capsGrid);
      pane.appendChild(capsSection);
    }

    return pane;
  }

  // ── Runtime actions ────────────────────────────────────────────────────────

  private async handleStart(): Promise<void> {
    this.dispatch({ type: "setLoadingAction", loadingAction: "Starting" });
    try {
      await this.#api.startRuntime();
      this.dispatch({ type: "markSuccess" });
      await this.refreshState({});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Start failed";
      this.dispatch({ type: "setError", errorMessage: message });
    }
  }

  private async handleRestart(): Promise<void> {
    this.dispatch({ type: "setLoadingAction", loadingAction: "Restarting" });
    try {
      await this.#api.restartRuntime();
      this.dispatch({ type: "markSuccess" });
      await this.refreshState({});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Restart failed";
      this.dispatch({ type: "setError", errorMessage: message });
    }
  }

  private async handleStop(): Promise<void> {
    this.dispatch({ type: "setLoadingAction", loadingAction: "Stopping" });
    try {
      await this.#api.stopRuntime();
      this.dispatch({ type: "markSuccess" });
      await this.refreshState({});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stop failed";
      this.dispatch({ type: "setError", errorMessage: message });
    }
  }

  // ── File tree ──────────────────────────────────────────────────────────────

  private async ensureFileTreeLoaded(): Promise<void> {
    if (this.#state.fileTree.length > 0) return;
    this.dispatch({ type: "setTreeLoading", treeLoading: true });
    try {
      const tree = await this.#api.getFileTree();
      this.dispatch({
        type: "setFileTree",
        fileTree: tree,
        treeLoading: false,
      });
    } catch {
      this.dispatch({ type: "setTreeLoading", treeLoading: false });
    }
  }

  private async loadFileMetadata(path: string): Promise<void> {
    this.dispatch({ type: "setFileMetadataLoading", loading: true });
    try {
      const meta = await this.#api.getFileMetadata(path);
      if (this.#state.selectedFilePath === path) {
        this.dispatch({
          type: "setFileMetadata",
          metadata: meta,
          loading: false,
        });
      }
    } catch {
      this.dispatch({
        type: "setFileMetadata",
        metadata: null,
        loading: false,
      });
    }
  }

  // ── State refresh ──────────────────────────────────────────────────────────

  private async refreshState(_options: {
    detectBridge?: boolean;
  }): Promise<void> {
    try {
      const bridgeState = await this.runWithBaseUrlFallback(
        () => this.#api.getBridgeState(),
        true,
      );

      const nextTransport = resolveBridgeTransportState(
        this.#state.transportState,
        bridgeState,
      );

      this.dispatch({ type: "setBridgeState", bridgeState });
      this.dispatch({
        type: "setTransportState",
        transportState: nextTransport,
      });
      this.dispatch({ type: "markSuccess" });

      const nextConnected = nextTransport === "connected";
      if (this.#state.connected !== nextConnected) {
        this.dispatch({ type: "setConnected", connected: nextConnected });
      }
      if (this.#state.loadingAction === "Connecting") {
        this.dispatch({ type: "setLoadingAction", loadingAction: null });
      }
      this.#runtimeRefreshFailures = 0;
    } catch {
      this.#runtimeRefreshFailures += 1;
      const nextTransport = resolveFailureTransportState(
        this.#state.transportState,
        this.#runtimeRefreshFailures,
      );
      const retainConnected = shouldRetainConnectedStateOnFailure(
        this.#state.connected,
        this.#runtimeRefreshFailures,
      );
      this.dispatch({
        type: "setTransportState",
        transportState: nextTransport,
      });
      if (!retainConnected && this.#state.connected) {
        this.dispatch({ type: "setConnected", connected: false });
      }
    }
  }

  // ── WebSocket ──────────────────────────────────────────────────────────────

  private connectWebSocket(): void {
    if (!this.#allowWebSocket) return;
    const connectionVersion = ++this.#wsConnectionVersion;
    this.#wsBinding?.close();
    this.#wsBinding = null;
    this.clearReconnectTimer();

    try {
      this.#wsBinding = createWebSocketBinding(this.#baseUrl, {
        onOpen: () => {
          if (connectionVersion !== this.#wsConnectionVersion) return;
          this.#wsConsecutiveFailures = 0;
          this.#wsConnected = true;
          this.#wsFallbackMode = false;
          this.#wsOpenedAt = Date.now();
          this.scheduleBodyUpdate();
        },
        onClose: () => {
          if (connectionVersion !== this.#wsConnectionVersion) return;
          this.#wsConnected = false;
          this.#wsConsecutiveFailures += 1;
          this.#wsFallbackMode = true;
          this.scheduleBodyUpdate();
          this.scheduleReconnect();
        },
        onError: () => {
          if (connectionVersion !== this.#wsConnectionVersion) return;
          this.#wsConnected = false;
          this.#wsFallbackMode = true;
          this.scheduleBodyUpdate();
          this.scheduleReconnect();
        },
        onMessage: (message) => {
          if (connectionVersion !== this.#wsConnectionVersion) return;
          const msg = message as { type?: string; data?: unknown };
          if (
            msg.type === "update" ||
            msg.type === "init" ||
            msg.type === "runtime-status" ||
            msg.type === "runtime-error"
          ) {
            void this.refreshState({});
          }
        },
      });
    } catch {
      this.scheduleReconnect();
    }
  }

  private closeWebSocket(): void {
    this.#wsConnectionVersion += 1;
    this.#wsBinding?.close();
    this.#wsBinding = null;
    this.#wsConnected = false;
    this.#wsFallbackMode = true;
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      if (this.#mounted) this.connectWebSocket();
    }, WS_RECONNECT_DELAY_MS);
  }

  private clearReconnectTimer(): void {
    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
  }

  // ── State polling ──────────────────────────────────────────────────────────

  private startStatePolling(): void {
    this.stopStatePolling();
    this.#statePollTimer = setInterval(() => {
      void this.refreshState({});
    }, STATE_POLL_INTERVAL_MS);
  }

  private stopStatePolling(): void {
    if (this.#statePollTimer) {
      clearInterval(this.#statePollTimer);
      this.#statePollTimer = null;
    }
  }

  // ── Header layer ───────────────────────────────────────────────────────────

  private createHeaderInner(
    view: SileoHeaderView,
    layer: "current" | "prev",
    exiting = false,
  ): HTMLElement {
    const inner = createElement("div", {
      attributes: {
        "data-shell-header-inner": "",
        "data-layer": layer,
        ...(exiting ? { "data-exiting": "true" } : {}),
      },
    });
    const badge = createElement("div", {
      attributes: {
        "data-shell-badge": "",
        "data-state": view.state,
      },
    });
    badge.appendChild(createSeverityIcon(view.state));
    inner.appendChild(badge);
    inner.appendChild(
      createElement("span", {
        attributes: {
          "data-shell-title": "",
          "data-state": view.state,
        },
        textContent: view.title,
      }),
    );
    return inner;
  }

  private morphHeaderLayerDom(nextView: SileoHeaderView): boolean {
    const stack = this.#shadowRoot?.querySelector<HTMLElement>(
      "[data-shell-header-stack]",
    );
    if (!stack) return false;

    stack
      .querySelectorAll<HTMLElement>(
        "[data-shell-header-inner][data-layer='prev']",
      )
      .forEach((node) => node.remove());

    const currentInner = stack.querySelector<HTMLElement>(
      "[data-shell-header-inner][data-layer='current']",
    );
    if (currentInner) {
      currentInner.dataset.layer = "prev";
      currentInner.dataset.exiting = "true";
    }

    stack.appendChild(this.createHeaderInner(nextView, "current"));
    return true;
  }

  private removePrevHeaderLayerDom(): void {
    this.#shadowRoot
      ?.querySelectorAll<HTMLElement>(
        "[data-shell-header-inner][data-layer='prev']",
      )
      .forEach((node) => node.remove());
  }

  private syncHeaderLayer(
    title: string,
    state: OverlaySeverity,
    options: { hydrateOnly?: boolean } = {},
  ): void {
    const key = `${state}|${title}`;
    const current = this.#headerLayer.current;
    if (current.key === key) return;

    const nextView: SileoHeaderView = { key, title, state };
    this.#headerLayer = { prev: current, current: nextView };

    if (!options.hydrateOnly) {
      const morphed = this.morphHeaderLayerDom(nextView);
      if (!morphed && this.#mounted) this.scheduleRender();
    }

    this.clearHeaderExitTimer();
    this.#headerExitTimer = setTimeout(() => {
      this.#headerExitTimer = null;
      if (!this.#headerLayer.prev) return;
      this.#headerLayer = { ...this.#headerLayer, prev: null };
      this.removePrevHeaderLayerDom();
    }, SILEO_HEADER_EXIT_MS);
  }

  private clearHeaderExitTimer(): void {
    if (this.#headerExitTimer) {
      clearTimeout(this.#headerExitTimer);
      this.#headerExitTimer = null;
    }
  }

  private resolveHeaderSeverity(severity: OverlaySeverity): OverlaySeverity {
    if (severity !== "success") {
      this.#headerSuccessSince = null;
      this.clearHeaderSuccessDecayTimer();
      return severity;
    }

    const now = Date.now();
    if (this.#headerSuccessSince === null) {
      this.#headerSuccessSince = now;
    }

    const elapsed = now - this.#headerSuccessSince;
    if (elapsed >= SILEO_HEADER_SUCCESS_DECAY_MS) {
      this.clearHeaderSuccessDecayTimer();
      return "info";
    }

    this.scheduleHeaderSuccessDecay(SILEO_HEADER_SUCCESS_DECAY_MS - elapsed);
    return "success";
  }

  private scheduleHeaderSuccessDecay(remainingMs: number): void {
    if (this.#headerSuccessDecayTimer) return;
    this.#headerSuccessDecayTimer = setTimeout(
      () => {
        this.#headerSuccessDecayTimer = null;
        if (!this.#mounted) return;
        this.applyTopbarState();
      },
      Math.max(1, remainingMs),
    );
  }

  private clearHeaderSuccessDecayTimer(): void {
    if (this.#headerSuccessDecayTimer) {
      clearTimeout(this.#headerSuccessDecayTimer);
      this.#headerSuccessDecayTimer = null;
    }
  }

  // ── Host observer (HMR cleanup) ────────────────────────────────────────────

  private startHostObserver(): void {
    if (!this.#host) return;
    this.stopHostObserver();
    this.#hostObserver = new MutationObserver(() => {
      if (this.#host && !document.body.contains(this.#host)) {
        this.destroy();
      }
    });
    this.#hostObserver.observe(document.body, {
      childList: true,
      subtree: false,
    });
  }

  private stopHostObserver(): void {
    if (this.#hostObserver) {
      this.#hostObserver.disconnect();
      this.#hostObserver = null;
    }
  }

  // ── Base URL fallback ──────────────────────────────────────────────────────

  private setActiveBaseUrl(baseUrl: string): void {
    if (this.#baseUrl === baseUrl) return;
    this.#baseUrl = baseUrl;
    this.#api = createDemoApi(this.#baseUrl);
  }

  private rotateBaseUrlCandidate(): void {
    if (this.#baseUrlCandidates.length < 2) return;
    this.#baseUrlCandidateIndex =
      (this.#baseUrlCandidateIndex + 1) % this.#baseUrlCandidates.length;
    this.setActiveBaseUrl(this.#baseUrlCandidates[this.#baseUrlCandidateIndex]);
  }

  private async runWithBaseUrlFallback<T>(
    task: () => Promise<T>,
    rotateBeforeRetry: boolean,
  ): Promise<T> {
    const totalCandidates = this.#baseUrlCandidates.length;
    if (totalCandidates <= 1) return task();

    try {
      return await task();
    } catch (firstErr) {
      for (let i = 1; i < totalCandidates; i += 1) {
        if (rotateBeforeRetry) this.rotateBaseUrlCandidate();
        try {
          return await task();
        } catch {
          // try next candidate
        }
      }
      throw firstErr;
    }
  }

  // ── Main render ────────────────────────────────────────────────────────────

  private render(): void {
    if (!this.#shadowRoot || !this.#sileoReady) return;

    const severity = resolveOverlaySeverity(this.#state);
    const headerSeverity = this.resolveHeaderSeverity(severity);
    const statusCopy = resolveStatusCopy(this.#state);
    const theme = normalizeTheme(this.#state.settings.theme);
    const position = this.#state.settings.position;
    const overlayTitle = "Demo";

    this.#sileo?.destroy();
    this.#sileo = null;
    this.#sidebarScrollArea?.destroy();
    this.#sidebarScrollArea = null;
    this.#sidebarFilterInput?.destroy();
    this.#sidebarFilterInput = null;
    this.#bodyScrollArea?.destroy();
    this.#bodyScrollArea = null;
    this.disposeTransientComponents();

    this.#shadowRoot.textContent = "";
    this.#portal = new Portal(this.#shadowRoot);
    this.#portal.updateTheme(theme);

    const styleEl = createElement("style");
    styleEl.textContent = getOverlayStyles();
    if (this.#styleNonce) styleEl.setAttribute("nonce", this.#styleNonce);
    this.#shadowRoot.appendChild(styleEl);

    this.syncHeaderLayer(overlayTitle, headerSeverity, { hydrateOnly: true });

    const layout = computeSileoLayout({
      mode: "persistent",
      position,
      expanded: this.#state.expanded,
      title: overlayTitle,
      contentHeight: 0,
    });
    const { open } = layout;
    const edge = resolveSileoExpandEdge(position);

    // Root section
    const root = createElement("section", {
      className: "universa-ui-root universa-ui-surface demo-overlay",
      attributes: {
        "data-theme": theme,
        "data-severity": severity,
        "data-expanded": this.#state.expanded ? "true" : "false",
        "data-auto-expand": this.#state.settings.autoExpand ? "true" : "false",
      },
    });

    // Viewport
    const viewport = createElement("section", {
      attributes: {
        "data-shell-viewport": "",
        "data-position": position,
        "aria-live": "polite",
      },
    });

    // Toast pill element
    const toast = createElement("div", {
      attributes: {
        "data-shell-toast": "",
        "data-ready": this.#sileoReady ? "true" : "false",
        "data-state": severity,
        role: "region",
        "aria-label": `Demo overlay. ${statusCopy.title}. ${statusCopy.detail}`,
      },
    });
    applySileoLayout(toast, layout, { headerHeight: SILEO_HEADER_HEIGHT });

    toast.addEventListener("pointerleave", (event) => {
      if (!this.#state.settings.autoExpand) return;
      if (event.pointerType === "touch") return;
      const nextTarget = event.relatedTarget as Node | null;
      if (nextTarget && this.#shadowRoot?.contains(nextTarget)) return;
      this.setExpanded(false);
    });

    toast.addEventListener("click", (event) => {
      event.stopPropagation();
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-overlay-toggle="true"]')) {
        this.setExpanded(!this.#state.expanded);
      }
    });

    // Sileo SVG shape
    toast.appendChild(
      createSileoShape(layout, {
        headerHeight: SILEO_HEADER_HEIGHT,
        fill: "var(--dp-fill)",
        filterId: "sileo-gooey-demo",
        svgTitle: "Demo Overlay",
      }),
    );

    // Header (the visible pill label)
    const header = createElement("div", {
      attributes: {
        "data-shell-header": "",
        "data-overlay-toggle": "true",
        "data-edge": edge,
        tabindex: "0",
        role: "button",
        "aria-expanded": open ? "true" : "false",
        "aria-label": `Toggle Demo overlay. ${statusCopy.title}. ${statusCopy.detail}`,
      },
    });
    header.addEventListener("pointerenter", (event) => {
      if (!this.#state.settings.autoExpand) return;
      if (event.pointerType === "touch") return;
      this.setExpanded(true);
    });
    header.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.setExpanded(!this.#state.expanded);
      }
    });

    const headerStack = createElement("div", {
      attributes: { "data-shell-header-stack": "" },
    });
    headerStack.appendChild(
      this.createHeaderInner(this.#headerLayer.current, "current"),
    );

    if (this.#headerLayer.prev) {
      headerStack.appendChild(
        this.createHeaderInner(this.#headerLayer.prev, "prev", true),
      );
    }

    header.appendChild(headerStack);
    toast.appendChild(header);

    // Panel (expanded content area)
    const activePanelId = "demo-overlay-panel";
    const useWorkspaceSidebar = this.shouldUseWorkspaceSidebar();
    const panel = createElement("div", {
      className: "dp-overlay",
      attributes: {
        "data-role": "overlay-shell",
        ...(useWorkspaceSidebar ? { "data-workspace-sidebar": "true" } : {}),
      },
    });

    // Topbar
    const topbar = createElement("div", { className: "dp-overlay__topbar" });
    const topbarTitle = createElement("div", {
      className: "dp-overlay__topbar-title",
    });
    topbarTitle.appendChild(
      createElement("span", {
        attributes: { style: "font-size:13px;font-weight:600;" },
        textContent: overlayTitle,
      }),
    );
    topbar.appendChild(topbarTitle);
    const topbarBadge = createBadge({
      text: statusCopy.title,
      variant: severityToBadgeVariant(severity),
    });
    topbarBadge.setAttribute("data-topbar-badge", "");
    topbarBadge.setAttribute("role", "status");
    topbarBadge.setAttribute("aria-live", "polite");
    topbarBadge.prepend(createSeverityIcon(severity));
    topbar.appendChild(topbarBadge);
    panel.appendChild(topbar);

    // Mobile toolbar
    panel.appendChild(this.#buildToolbar(activePanelId));

    // Layout: sidebar + main
    const layoutEl = createElement("div", {
      className: "dp-overlay__layout",
      attributes: { "data-role": "overlay-layout" },
    });
    layoutEl.appendChild(
      useWorkspaceSidebar
        ? this.#buildWorkspaceSidebar(activePanelId)
        : this.#buildSidebarNav(activePanelId),
    );

    const main = createElement("section", {
      className: "dp-overlay__main",
      attributes: { "data-role": "overlay-main" },
    });
    this.#bodyScrollArea = new ScrollArea({
      fill: true,
      className: "dp-overlay__body",
      scrollbarAlwaysVisible: true,
    });
    const bodyRoot = this.#bodyScrollArea.getElement();
    bodyRoot.setAttribute("id", activePanelId);
    bodyRoot.setAttribute("role", "tabpanel");
    this.#bodyScrollArea.appendChild(
      this.renderPaneByTab(this.#state.activeTab),
    );
    main.appendChild(bodyRoot);
    layoutEl.appendChild(main);
    panel.appendChild(layoutEl);

    // Content wrapper (toggled by Sileo)
    const content = createElement("div", {
      attributes: {
        "data-shell-content": "",
        "data-edge": edge,
        "data-visible": open ? "true" : "false",
      },
    });
    const description = createElement("div", {
      attributes: { "data-shell-description": "" },
    });
    description.appendChild(panel);
    content.appendChild(description);
    toast.appendChild(content);

    // Assemble DOM
    viewport.appendChild(toast);
    root.appendChild(viewport);
    this.#shadowRoot.appendChild(root);

    // Initialize Sileo
    this.#sileo = new Sileo(toast, {
      mode: "persistent",
      position,
      title: overlayTitle,
    });
    this.#sileo.observeContent(description);
    this.#sileo.setExpanded(this.#state.expanded);
  }
}
