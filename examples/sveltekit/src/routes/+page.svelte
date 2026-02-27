<script lang="ts">
  import { onMount } from "svelte";

  import { mountVanillaDashboard } from "example-ui/vanilla-dashboard";

  let root: HTMLDivElement | null = null;

  onMount(() => {
    if (!root) {
      throw new Error("Missing dashboard root");
    }

    const cleanup = mountVanillaDashboard({
      root,
      frameworkId: "sveltekit",
    });

    return () => {
      cleanup();
    };
  });
</script>

<div bind:this={root}></div>
