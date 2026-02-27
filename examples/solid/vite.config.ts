import demo from "demo";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [demo.vite(), solid()],
});
