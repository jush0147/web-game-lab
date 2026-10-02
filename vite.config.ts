import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, "index.html"),
        shed: resolve(__dirname, "shed.html"),
        ruleCreature: resolve(__dirname, "rule-creature.html"),
        oneChange: resolve(__dirname, "one-change.html"),
      },
    },
  },
});
