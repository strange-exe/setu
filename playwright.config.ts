import { defineConfig } from "@playwright/test";

// The suite runs against the PRODUCTION build, not the artifact source, because the source has
// no <head> and no charset — dist/ is what a user or a host actually serves.
// Playwright owns the server so it is torn down with the run and never leaks a stray process.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5177",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "python -m http.server 5177 --bind 127.0.0.1 --directory dist",
    url: "http://127.0.0.1:5177/index.html",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
