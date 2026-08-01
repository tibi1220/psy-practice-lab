import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const basePath = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [react()],
  build: {
    target: "safari16",
  },
  server: {
    host: "0.0.0.0",
    watch: isCodexSeatbeltSandbox
      ? { useFsEvents: false, usePolling: true }
      : undefined,
  },
});
