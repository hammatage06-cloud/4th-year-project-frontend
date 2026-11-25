import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev server forwards /api to the Express backend (Part 8.1), which also avoids CORS.
// Change the target if your backend runs on another port (see PORT in backend/.env).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:4000" } },
});
