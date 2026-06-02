import { defineConfig } from "vite";

// Vite is introduced here as a development/build wrapper around the existing
// Phaser 2.3 codebase. The runtime JavaScript files are still loaded as classic
// browser scripts from public/js, so this step does not convert the game to ES
// modules yet.
export default defineConfig({
    // A relative base keeps the generated dist/ folder usable when deployed from
    // the GitHub Pages project URL as well as when previewed locally.
    base: "./",
    publicDir: "public"
});
