import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
export default defineConfig({
    plugins: [react()],
    // The prior session's node_modules/.vite cache cannot be unlinked in this
    // sandbox; a fresh cache directory lets the dev server and vitest start.
    cacheDir: "node_modules/.vite-tierline",
    // Same-origin proxy for GenLayer IC reads so the browser never talks to the
    // IC RPC cross-origin; wallet writes use the selected EVM provider instead.
    server: {
        proxy: {
            "/genlayer-rpc": {
                target: "https://studio.genlayer.com",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/genlayer-rpc/, "/api"),
            },
        },
    },
    // The dist folder from a prior session cannot be emptied on this machine
    // (sandbox denies deleting files it did not create). Overwrite-in-place
    // keeps builds reproducible; dist/ is gitignored and never published.
    build: {
        emptyOutDir: false,
    },
    test: {
        environment: "jsdom",
        setupFiles: "./src/test/setup.ts",
        css: true,
    },
});
