<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

import { mountVanillaDashboard } from "example-ui/vanilla-dashboard";

const root = ref<HTMLElement | null>(null);
let cleanup: (() => void) | null = null;

onMounted(() => {
  if (!root.value) {
    throw new Error("Missing dashboard root");
  }

  cleanup = mountVanillaDashboard({
    root: root.value,
    frameworkId: "nuxt",
  });
});

onUnmounted(() => {
  cleanup?.();
  cleanup = null;
});
</script>

<template>
  <div ref="root" />
</template>
