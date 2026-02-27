export const CARD_RADIUS_VALUES = {
  none: "0px",
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.25rem",
  full: "9999px",
} as const;

export type CardRadius = keyof typeof CARD_RADIUS_VALUES;

export const CARD_SHADOW_VALUES = {
  none: "none",
  sm: "0 1px 2px rgb(0 0 0 / 0.08)",
  md: "0 4px 10px rgb(0 0 0 / 0.12)",
  lg: "0 12px 24px rgb(0 0 0 / 0.15)",
} as const;

export type CardShadow = keyof typeof CARD_SHADOW_VALUES;

export type UniversaBadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info";

export type UniversaBadgeSize = "sm" | "default" | "lg";

export type UniversaButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";

export type UniversaButtonSize = "sm" | "default" | "lg" | "icon";
