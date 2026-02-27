<script lang="ts">
  import {
    CARD_RADIUS_VALUES,
    CARD_SHADOW_VALUES,
    type CardRadius,
    type CardShadow,
  } from "../universa/tokens";

  export let radius: CardRadius = "2xl";
  export let shadow: CardShadow = "none";
</script>

<div
  data-slot="card"
  style={`border-radius:${CARD_RADIUS_VALUES[radius]};box-shadow:${CARD_SHADOW_VALUES[shadow]};`}
  {...$$restProps}
>
  <slot />
</div>
