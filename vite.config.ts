import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    port: 43123,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 43123,
    strictPort: true,
    allowedHosts: true,
  },
});
