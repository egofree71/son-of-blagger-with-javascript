import { defineConfig } from "vite";

// Vite copies public/ unchanged so the Phaser scenes can load assets from /assets.
export default defineConfig({
    // A relative base keeps the generated dist/ folder usable when deployed from
    // the GitHub Pages project URL as well as when previewed locally.
    base: "./",
    publicDir: "public"
});
