import {
  type DashboardActionId,
  type DashboardActionState,
  type DashboardControllerState,
  type DashboardRuntimeSection,
  type DashboardTableSection,
  buildRuntimeSections,
  resolveDashboardStatusBadge,
} from "demo/dashboard";

export interface DashboardRuntimeView {
  summary: string;
  sections: DashboardRuntimeSection[];
  status: ReturnType<typeof resolveDashboardStatusBadge>;
}

export interface DashboardRuntimeUiState {
  controls: DashboardActionState[];
  runtimeSummary: string;
  runtimeSections: DashboardTableSection[];
  runtimeError: string | null;
  activeSectionId: string | null;
}

export const DASHBOARD_ACTION_CONTROLS = [
  { id: "start", fallbackLabel: "Start" },
  { id: "stop", fallbackLabel: "Stop" },
  { id: "restart", fallbackLabel: "Restart" },
] as const satisfies ReadonlyArray<{
  id: DashboardActionId;
  fallbackLabel: string;
}>;

export function resolveRuntimeView(
  state: DashboardControllerState,
  now = Date.now(),
): DashboardRuntimeView {
  const runtimeData = buildRuntimeSections({
    live: state.live,
    websocket: state.websocket,
    actionLoading: state.actionLoading,
    now,
  });

  return {
    summary: runtimeData.summary,
    sections: runtimeData.sections,
    status: resolveDashboardStatusBadge(state.live),
  };
}

export function isTableSection(
  section: DashboardRuntimeSection,
): section is DashboardTableSection {
  return section.id !== "controls";
}

export function buildRuntimeUiState(
  state: DashboardControllerState,
  activeSectionId: string | null,
  now = Date.now(),
): DashboardRuntimeUiState {
  const runtimeView = resolveRuntimeView(state, now);
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

export function createTabsContentSignature(
  runtimeSections: DashboardTableSection[],
  _runtimeError: string | null,
): string {
  const sectionShape = runtimeSections.map((section) => ({
    id: section.id,
    title: section.title,
  }));
  return JSON.stringify(sectionShape);
}

export function createActionStateMap(
  actions: DashboardActionState[],
): ReadonlyMap<DashboardActionId, DashboardActionState> {
  return new Map(actions.map((action) => [action.id, action] as const));
}

export function resolveActionLabel(
  action: DashboardActionState | null,
  fallbackLabel: string,
): string {
  if (!action) {
    return fallbackLabel;
  }
  return action.loading ? action.loadingLabel : action.label;
}
