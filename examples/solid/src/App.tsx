import { mountVanillaDashboard } from "example-ui/vanilla-dashboard";
import { onCleanup, onMount } from "solid-js";

export default function App() {
  let root: HTMLDivElement | undefined;

  onMount(() => {
    if (!root) return;
    const cleanup = mountVanillaDashboard({
      root,
      frameworkId: "solid",
    });

    onCleanup(() => {
      cleanup();
    });
  });

  return (
    <div
      ref={(el) => {
        root = el;
      }}
    />
  );
}
