import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [remix(), tsconfigPaths()],
  // Use a specific base path to exclude dev assets from access logs.
  base: process.env.NODE_ENV === 'development' ? '/vite-assets/' : undefined,
});
