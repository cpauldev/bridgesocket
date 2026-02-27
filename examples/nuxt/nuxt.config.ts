import demo from "demo";

export default defineNuxtConfig({
  ssr: false,
  modules: ["nuxt-lucide-icons", demo.nuxt()],
  css: ["example-ui/layout.css", "universa-ui/styles.css"],
  transpilePackages: ["example-ui", "universa-ui"],
  compatibilityDate: "2024-04-03",
  app: {
    head: {
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    },
  },
});
