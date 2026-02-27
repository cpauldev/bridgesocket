import {
  type HTMLAttributes,
  type PropType,
  type StyleValue,
  defineComponent,
  h,
} from "vue";

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

type SlotRenderer = () => ReturnType<typeof h>[] | undefined;

function renderTag(
  tag: string,
  slot: string,
  attrs: HTMLAttributes,
  renderSlot: SlotRenderer,
) {
  return h(
    tag,
    {
      ...attrs,
      "data-slot": slot,
    },
    renderSlot(),
  );
}

function withMergedStyle(base: StyleValue, style: StyleValue | undefined) {
  return style ? [base, style] : [base];
}

export const Card = defineComponent({
  name: "UniversaCard",
  inheritAttrs: false,
  props: {
    radius: {
      type: String as PropType<CardRadius>,
      default: "2xl",
    },
    shadow: {
      type: String as PropType<CardShadow>,
      default: "none",
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        "div",
        {
          ...attrs,
          "data-slot": "card",
          style: withMergedStyle(
            {
              borderRadius: CARD_RADIUS_VALUES[props.radius],
              boxShadow: CARD_SHADOW_VALUES[props.shadow],
            },
            attrs.style as StyleValue | undefined,
          ),
        },
        slots.default?.(),
      );
  },
});

export const CardHeader = defineComponent({
  name: "UniversaCardHeader",
  inheritAttrs: false,
  props: {
    description: {
      type: String,
      default: "",
    },
    descriptionClassName: {
      type: String,
      default: "",
    },
  },
  setup(props, { attrs, slots }) {
    return () => {
      const children = slots.default?.() ?? [];
      if (props.description) {
        children.push(
          h(
            "p",
            {
              "data-slot": "card-description",
              class: props.descriptionClassName || undefined,
            },
            props.description,
          ),
        );
      }

      return h(
        "div",
        {
          ...attrs,
          "data-slot": "card-header",
        },
        children,
      );
    };
  },
});

export const CardTitle = defineComponent({
  name: "UniversaCardTitle",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => renderTag("p", "card-title", attrs, () => slots.default?.());
  },
});

export const CardDescription = defineComponent({
  name: "UniversaCardDescription",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () =>
      renderTag("p", "card-description", attrs, () => slots.default?.());
  },
});

export const CardContent = defineComponent({
  name: "UniversaCardContent",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () =>
      renderTag("div", "card-content", attrs, () => slots.default?.());
  },
});

export const Frame = defineComponent({
  name: "UniversaFrame",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => renderTag("div", "frame", attrs, () => slots.default?.());
  },
});

export const FrameFooter = defineComponent({
  name: "UniversaFrameFooter",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () =>
      renderTag("footer", "frame-panel-footer", attrs, () => slots.default?.());
  },
});

export const TableContainer = defineComponent({
  name: "UniversaTableContainer",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () =>
      renderTag("div", "table-container", attrs, () => slots.default?.());
  },
});

export const Table = defineComponent({
  name: "UniversaTable",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () =>
      h(
        "table",
        {
          ...attrs,
          "data-slot": "table",
        },
        slots.default?.(),
      );
  },
});

export const TableBody = defineComponent({
  name: "UniversaTableBody",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () =>
      renderTag("tbody", "table-body", attrs, () => slots.default?.());
  },
});

export const TableRow = defineComponent({
  name: "UniversaTableRow",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => renderTag("tr", "table-row", attrs, () => slots.default?.());
  },
});

export const TableCell = defineComponent({
  name: "UniversaTableCell",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => renderTag("td", "table-cell", attrs, () => slots.default?.());
  },
});

export const FieldLabel = defineComponent({
  name: "UniversaFieldLabel",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () =>
      renderTag("span", "field-label", attrs, () => slots.default?.());
  },
});

export const Badge = defineComponent({
  name: "UniversaBadge",
  inheritAttrs: false,
  props: {
    variant: {
      type: String as PropType<UniversaBadgeVariant>,
      default: "default",
    },
    size: {
      type: String as PropType<UniversaBadgeSize>,
      default: "default",
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        "span",
        {
          ...attrs,
          "data-slot": "badge",
          "data-size": props.size,
          "data-variant": props.variant,
        },
        slots.default?.(),
      );
  },
});

export const Button = defineComponent({
  name: "UniversaButton",
  inheritAttrs: false,
  props: {
    variant: {
      type: String as PropType<UniversaButtonVariant>,
      default: "outline",
    },
    size: {
      type: String as PropType<UniversaButtonSize>,
      default: "sm",
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        "button",
        {
          ...attrs,
          "data-slot": "button",
          "data-size": props.size,
          "data-variant": props.variant,
        },
        slots.default?.(),
      );
  },
});
