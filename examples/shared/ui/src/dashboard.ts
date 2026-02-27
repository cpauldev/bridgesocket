import {
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

export function resolveRuntimeView(
  state: DashboardControllerState,
): DashboardRuntimeView {
  const runtimeData = buildRuntimeSections({
    live: state.live,
    websocket: state.websocket,
    actionLoading: state.actionLoading,
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
