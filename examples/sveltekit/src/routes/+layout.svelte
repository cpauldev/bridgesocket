<script lang="ts">
  import { onMount } from "svelte";
  import { applyTheme, getInitialTheme } from "example-ui/theme";
  import "example-ui/layout.css";
  import "universa-ui/styles.css";

  onMount(() => {
    applyTheme(getInitialTheme());
  });
</script>

<slot />
