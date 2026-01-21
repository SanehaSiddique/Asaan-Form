import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"], // converted from .ts to .js
    include: ["src/**/*.{test,spec}.{js,jsx}"], // changed extensions
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
