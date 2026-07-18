import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname),

      "@/lib/uibakery": path.resolve(
        __dirname,
        "lib/uibakery/index.ts"
      ),
    },
  },

  optimizeDeps: {
    exclude: ["@/lib/uibakery"],
  },
});
