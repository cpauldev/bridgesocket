import { type JSX, splitProps } from "solid-js";

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

type BaseProps<T extends HTMLElement = HTMLElement> = JSX.HTMLAttributes<T> & {
  children?: JSX.Element;
};

type DivProps = BaseProps<HTMLDivElement>;
type SpanProps = BaseProps<HTMLSpanElement>;
type TableProps = BaseProps<HTMLTableElement>;
type TableSectionProps = BaseProps<HTMLTableSectionElement>;
type TableRowProps = BaseProps<HTMLTableRowElement>;
type TableCellProps = BaseProps<HTMLTableCellElement>;
type ButtonElementProps = BaseProps<HTMLButtonElement>;
type FooterProps = BaseProps<HTMLElement>;

function mergeStyle(
  base: JSX.CSSProperties,
  style?: JSX.CSSProperties,
): JSX.CSSProperties {
  return { ...base, ...(style ?? {}) };
}

function withSlot<T extends object>(
  props: T,
  slot: string,
): T & { "data-slot": string } {
  return {
    ...props,
    "data-slot": slot,
  };
}

function renderTag<T extends HTMLElement>(
  tag: keyof JSX.IntrinsicElements,
  slot: string,
  props: BaseProps<T>,
): JSX.Element {
  const [local, rest] = splitProps(props, ["children"]);
  const Tag = tag as keyof JSX.IntrinsicElements;
  return (
    <Tag {...(withSlot(rest, slot) as JSX.HTMLAttributes<T>)}>
      {local.children}
    </Tag>
  );
}

export interface CardProps extends DivProps {
  radius?: CardRadius;
  shadow?: CardShadow;
}

export function Card(props: CardProps): JSX.Element {
  const merged: CardProps = {
    radius: "2xl",
    shadow: "none",
    ...props,
  };
  const [local, rest] = splitProps(merged, [
    "radius",
    "shadow",
    "style",
    "children",
  ]);

  const style = mergeStyle(
    {
      "border-radius": CARD_RADIUS_VALUES[local.radius ?? "2xl"],
      "box-shadow": CARD_SHADOW_VALUES[local.shadow ?? "none"],
    },
    local.style as JSX.CSSProperties | undefined,
  );

  return (
    <div {...withSlot(rest, "card")} style={style}>
      {local.children}
    </div>
  );
}

export interface CardHeaderProps extends DivProps {
  description?: string;
  descriptionClassName?: string;
}

export function CardHeader(props: CardHeaderProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    "children",
    "description",
    "descriptionClassName",
  ]);

  return (
    <div {...withSlot(rest, "card-header")}>
      {local.children}
      {local.description !== undefined ? (
        <p data-slot="card-description" class={local.descriptionClassName}>
          {local.description}
        </p>
      ) : null}
    </div>
  );
}

export function CardTitle(props: SpanProps): JSX.Element {
  return renderTag("p", "card-title", props);
}

export function CardDescription(props: SpanProps): JSX.Element {
  return renderTag("p", "card-description", props);
}

export function CardContent(props: DivProps): JSX.Element {
  return renderTag("div", "card-content", props);
}

export function Frame(props: DivProps): JSX.Element {
  return renderTag("div", "frame", props);
}

export function FrameFooter(props: FooterProps): JSX.Element {
  return renderTag("footer", "frame-panel-footer", props);
}

export function TableContainer(props: DivProps): JSX.Element {
  return renderTag("div", "table-container", props);
}

export function Table(props: TableProps): JSX.Element {
  return renderTag("table", "table", props);
}

export function TableBody(props: TableSectionProps): JSX.Element {
  return renderTag("tbody", "table-body", props);
}

export function TableRow(props: TableRowProps): JSX.Element {
  return renderTag("tr", "table-row", props);
}

export function TableCell(props: TableCellProps): JSX.Element {
  return renderTag("td", "table-cell", props);
}

export function FieldLabel(props: SpanProps): JSX.Element {
  return renderTag("span", "field-label", props);
}

export interface BadgeProps extends SpanProps {
  variant?: UniversaBadgeVariant;
  size?: UniversaBadgeSize;
}

export function Badge(props: BadgeProps): JSX.Element {
  const merged: BadgeProps = {
    variant: "default",
    size: "default",
    ...props,
  };
  const [local, rest] = splitProps(merged, ["children", "variant", "size"]);
  return (
    <span
      {...withSlot(rest, "badge")}
      data-size={local.size}
      data-variant={local.variant}
    >
      {local.children}
    </span>
  );
}

export interface ButtonProps extends ButtonElementProps {
  variant?: UniversaButtonVariant;
  size?: UniversaButtonSize;
}

export function Button(props: ButtonProps): JSX.Element {
  const merged: ButtonProps = {
    variant: "outline",
    size: "sm",
    ...props,
  };
  const [local, rest] = splitProps(merged, ["children", "variant", "size"]);
  return (
    <button
      {...withSlot(rest, "button")}
      data-size={local.size}
      data-variant={local.variant}
    >
      {local.children}
    </button>
  );
}
