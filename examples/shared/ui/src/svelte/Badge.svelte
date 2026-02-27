<script lang="ts">
  import type {
    UniversaBadgeSize,
    UniversaBadgeVariant,
  } from "../universa/tokens";

  export let variant: UniversaBadgeVariant = "default";
  export let size: UniversaBadgeSize = "default";
</script>

<span data-slot="badge" data-size={size} data-variant={variant} {...$$restProps}>
  <slot />
</span>
