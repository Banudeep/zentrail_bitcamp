import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Set the desired port
  },
  optimizeDeps: {
    include: ["react-leaflet", "leaflet"],
  },
});
