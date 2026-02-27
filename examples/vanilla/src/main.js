import "example-ui/layout.css";
import { mountVanillaDashboard } from "example-ui/vanilla-dashboard";
import "universa-ui/styles.css";

const root = document.getElementById("demo-root");
if (!root) {
  throw new Error("Missing #demo-root");
}

const cleanup = mountVanillaDashboard({
  root,
  frameworkId: "vanilla",
});

window.addEventListener("unload", cleanup);
