import {
  type CSSProperties,
  type ReactNode,
  createElement,
  forwardRef,
} from "react";

import {
  CARD_RADIUS_VALUES,
  CARD_SHADOW_VALUES,
  type CardRadius,
  type CardShadow,
  type UniversaBadgeSize,
  type UniversaBadgeVariant,
  type UniversaButtonSize,
  type UniversaButtonVariant,
} from "./universa/tokens";

type BaseProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
};

type ButtonElementProps = BaseProps;
type DivProps = BaseProps;
type SpanProps = BaseProps;
type TableProps = BaseProps;
type TableSectionProps = BaseProps;
type TableRowProps = BaseProps;
type TableCellProps = BaseProps;

function mergeStyles(base: CSSProperties, style?: CSSProperties) {
  return { ...base, ...(style ?? {}) };
}

function render(tag: string, props: BaseProps, slot: string) {
  const { children, ...rest } = props;
  return createElement(
    tag,
    {
      ...rest,
      "data-slot": slot,
    },
    children,
  );
}

export interface CardProps extends DivProps {
  radius?: CardRadius;
  shadow?: CardShadow;
}

export function Card({
  radius = "2xl",
  shadow = "none",
  style,
  children,
  ...props
}: CardProps) {
  const cardStyle = mergeStyles(
    {
      borderRadius: CARD_RADIUS_VALUES[radius],
      boxShadow: CARD_SHADOW_VALUES[shadow],
    },
    style,
  );
  return createElement(
    "div",
    { ...props, "data-slot": "card", style: cardStyle },
    children,
  );
}

export interface CardHeaderProps extends DivProps {
  description?: string;
  descriptionClassName?: string;
  descriptionRef?: unknown;
}

export function CardHeader({
  description,
  descriptionClassName,
  descriptionRef,
  children,
  ...props
}: CardHeaderProps) {
  return createElement("div", { ...props, "data-slot": "card-header" }, [
    children,
    description !== undefined
      ? createElement(
          "p",
          {
            "data-slot": "card-description",
            className: descriptionClassName,
            ref: descriptionRef,
          },
          description,
        )
      : null,
  ]);
}

export function CardTitle(props: SpanProps) {
  return render("p", props, "card-title");
}

export function CardDescription(props: SpanProps) {
  return render("p", props, "card-description");
}

export function CardContent(props: DivProps) {
  return render("div", props, "card-content");
}

export function Frame(props: DivProps) {
  return render("div", props, "frame");
}

export function FrameFooter(props: BaseProps) {
  return render("footer", props, "frame-panel-footer");
}

export function TableContainer(props: DivProps) {
  return render("div", props, "table-container");
}

export function Table(props: TableProps) {
  return render("table", props, "table");
}

export function TableBody(props: TableSectionProps) {
  return render("tbody", props, "table-body");
}

export function TableRow(props: TableRowProps) {
  return render("tr", props, "table-row");
}

export function TableCell(props: TableCellProps) {
  return render("td", props, "table-cell");
}

export function FieldLabel(props: SpanProps) {
  return render("span", props, "field-label");
}

export interface BadgeProps extends SpanProps {
  variant?: UniversaBadgeVariant;
  size?: UniversaBadgeSize;
}

export function Badge({
  variant = "default",
  size = "default",
  children,
  ...props
}: BadgeProps) {
  return createElement(
    "span",
    {
      ...props,
      "data-slot": "badge",
      "data-size": size,
      "data-variant": variant,
    },
    children,
  );
}

export interface ButtonProps extends ButtonElementProps {
  variant?: UniversaButtonVariant;
  size?: UniversaButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "outline", size = "sm", children, ...props }: ButtonProps,
    ref,
  ) {
    return createElement(
      "button",
      {
        ...props,
        ref,
        "data-slot": "button",
        "data-size": size,
        "data-variant": variant,
      },
      children,
    );
  },
);
