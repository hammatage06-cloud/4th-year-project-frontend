// Demo mode swaps the real /api backend for the in-browser mock in src/mock.js.
// It is on only when VITE_DEMO_MODE=true (npm run demo reads .env.demo).
export const DEMO = import.meta.env.VITE_DEMO_MODE === "true";
