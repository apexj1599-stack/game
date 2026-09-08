import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Relative asset URLs let the game work on GitHub Pages (/game/)
  // as well as on a normal root deployment.
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
