<script lang="ts">
  import type {
    UniversaButtonSize,
    UniversaButtonVariant,
  } from "../universa/tokens";

  export let variant: UniversaButtonVariant = "outline";
  export let size: UniversaButtonSize = "sm";
</script>

<button
  data-slot="button"
  data-size={size}
  data-variant={variant}
  {...$$restProps}
>
  <slot />
</button>
