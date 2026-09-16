import "@testing-library/jest-dom/vitest";
import { config } from "dotenv";

// Tests run against untouchable_test, never the development database. Loaded before any
// module reads process.env.DATABASE_URL.
config({ path: ".env.test", override: true });
