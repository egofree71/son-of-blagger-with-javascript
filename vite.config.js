import { defineConfig } from "vite";

// Vite now owns the game module entry point through src/main.js.
// Phaser 2.3 itself remains a classic browser script in public/js because the
// current runtime still depends on the global Phaser object.
export default defineConfig({
    // A relative base keeps the generated dist/ folder usable when deployed from
    // the GitHub Pages project URL as well as when previewed locally.
    base: "./",
    publicDir: "public"
});
