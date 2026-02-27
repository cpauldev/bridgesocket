export type BridgeBadgeVariant = "default" | "success" | "warning" | "error";

export function phaseBadgeVariant(phase: string | null): BridgeBadgeVariant {
  if (phase === "running") return "success";
  if (phase === "error") return "error";
  if (phase === "starting" || phase === "stopping") return "warning";
  return "default";
}

export function transportBadgeVariant(
  state: string | null,
): BridgeBadgeVariant {
  if (state === "connected") return "success";
  if (state === "degraded") return "warning";
  return "default";
}

function badgeClassForVariant(variant: BridgeBadgeVariant): string {
  return `dp-badge dp-badge--${variant}`;
}

export function phaseBadgeClass(phase: string | null): string {
  return badgeClassForVariant(phaseBadgeVariant(phase));
}

export function transportBadgeClass(state: string | null): string {
  return badgeClassForVariant(transportBadgeVariant(state));
}
