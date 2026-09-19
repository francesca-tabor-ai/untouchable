import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    // AppleDouble sidecars macOS writes on exFAT. They match the include glob and fail to
    // parse — see DECISIONS.md PL-17.
    exclude: ["**/node_modules/**", "**/._*"],
    globals: true,
    // One test file at a time.
    //
    // Every database-backed suite calls `resetDatabase`, which is TRUNCATE ... CASCADE over
    // every table. Two files doing that at once in the same database take their table locks
    // in different orders, and Postgres kills one of them with a deadlock. It is not a race
    // in the code under test — it is two test files fighting over one database.
    //
    // Added by the charity wave, which pushed the file count past the point where this
    // became reliable rather than occasional. See DECISIONS.md D-017; a schema per worker is
    // the better answer if the suite ever gets slow enough to need one.
    fileParallelism: false,
  },
});
