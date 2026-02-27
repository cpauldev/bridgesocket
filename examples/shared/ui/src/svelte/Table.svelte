<script lang="ts">
  export let containerClass = "";
  export let containerStyle = "";
</script>

<div
  data-slot="table-container"
  class={containerClass}
  style={containerStyle || undefined}
>
  <table data-slot="table" {...$$restProps}>
    <slot />
  </table>
</div>
