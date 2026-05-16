import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync, existsSync } from "fs";

// Load server/.env to get the Anthropic key — keeps one source of truth
function loadServerEnv() {
  const envPath = path.resolve(__dirname, "../server/.env");
  if (!existsSync(envPath)) return {};
  const vars = {};
  readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/);
    if (m) vars[m[1]] = m[2].trim();
  });
  return vars;
}

const serverEnv = loadServerEnv();
const ANTHROPIC_KEY = serverEnv.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || "";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    globals: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Backend Express API
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      // Anthropic proxy — injects the API key server-side so the browser never needs it
      "/anthropic": {
        target: "https://api.anthropic.com",
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/anthropic/, ""),
        configure(proxy) {
          proxy.on("proxyReq", (proxyReq) => {
            const key = ANTHROPIC_KEY;
            if (key) {
              proxyReq.setHeader("x-api-key", key);
            }
            proxyReq.setHeader("anthropic-version", "2023-06-01");
            // Remove the dangerous-direct-browser-access header if present
            proxyReq.removeHeader("anthropic-dangerous-direct-browser-access");
          });
        },
      },
    },
  },
});
