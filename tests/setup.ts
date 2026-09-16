import "@testing-library/jest-dom/vitest";
import { config } from "dotenv";

// Tests run against a test database, never the development one.
//
// TEST_ENV lets parallel workstreams each take their own database: without it, two suites
// running at once truncate each other's fixtures and both fail for reasons that have
// nothing to do with the code.
config({ path: process.env.TEST_ENV ?? ".env.test", override: true });
