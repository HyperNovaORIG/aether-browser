import path from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

const projectRoot = path.resolve(__dirname);

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/main",
      lib: { entry: "electron/main.ts", formats: ["es"] },
      rollupOptions: { external: ["electron"] },
    },
    resolve: {
      alias: {
        "@electron": path.resolve(projectRoot, "electron"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      lib: { entry: "electron/preload.ts", formats: ["cjs"] },
      rollupOptions: { external: ["electron"] },
    },
  },
  renderer: {
    root: ".",
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(projectRoot, "src"),
      },
    },
    build: {
      outDir: "out/renderer",
      rollupOptions: {
        input: path.resolve(projectRoot, "index.html"),
      },
    },
    server: { port: 5179 },
  },
});
