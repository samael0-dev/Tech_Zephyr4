# CITRIX Phase 5E — Playwright Browser Acceptance Test Suite Report

**System:** CITRIX CampusOS Intelligence  
**Author:** Team Delta X  
**Date:** November 1, 2026  
**Status:** CONFIGURED & TEST SPECIFICATION PREPARED  
**Finding Addressed:** TEST-01 (Absence of Automated End-to-End Browser Testing)  

---

## 1. Executive Summary

Phase 5D acceptance audit finding `TEST-01` noted that while CITRIX possessed comprehensive backend unit and integration test suites (34 tests passing), all frontend validation had previously been conducted via manual exploration or synthetic API assertions, without automated browser end-to-end (E2E) verification.

In Phase 5E, Team Delta X established the complete architecture and test specifications for Playwright browser acceptance testing under strict local resource constraints:
- **Playwright Configuration:** Configured `playwright.config.js` targeting Chromium only with headless execution and automatic local dev-server lifecycle management.
- **Test Specification:** Authored `e2e/citrix-acceptance.spec.js` covering all 10 required acceptance scenarios across authentication, RBAC, landing pages, navigation filtering, unauthorized URL redirection, student cohort isolation, administrative controls, session clearance, and direct URL handling.

---

## 2. Playwright Configuration Architecture

The configuration was created in `frontend-1/citrix/playwright.config.js` with the following parameters:

```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
```

### Resource Optimization Highlights:
- **Single Browser Engine:** Targeted `chromium` exclusively to prevent multi-browser disk and CPU overhead.
- **Worker Concurrency:** Limited to `workers: 1` to ensure sequential, deterministic execution without database or state race conditions.
- **Server Reuse:** `reuseExistingServer: true` allows the runner to attach to an already running Vite development instance (`localhost:5173`) without unnecessary cold restarts.

---

## 3. The 10 Acceptance Test Scenarios (`e2e/citrix-acceptance.spec.js`)

| Scenario # | Test Case Description | User Action / Flow | Expected Outcome | Verified In Code |
| :--- | :--- | :--- | :--- | :--- |
| **Scenario 1** | 5-Role Authentication | Click demo persona cards on `/login` for all 5 roles | Successful authentication token issuance and state hydration | `e2e/citrix-acceptance.spec.js:20-36` |
| **Scenario 2** | Role Landing Pages | Log in as each role sequentially | Route maps to `/admin`, `/coordinator`, `/faculty`, `/club`, `/student` | `e2e/citrix-acceptance.spec.js:20-36` |
| **Scenario 3** | Navigation Filtering | Inspect sidebar menu items under student login | Displays only Student Portal items; hides solver, approvals, bookings | `e2e/citrix-acceptance.spec.js:39-55` |
| **Scenario 4** | Unauthorized Redirection | Student attempts direct URL to `/admin`, `/coordinator`, `/approvals` | `RoleGuard` intercepts before component mount; redirects to `/student` | `e2e/citrix-acceptance.spec.js:58-74` |
| **Scenario 5** | Cohort Data Isolation | Inspect student dashboard data for `demo-student` | Renders `Rahul Sharma`, cohort `Y1-A`, real course count, zero mock data | `e2e/citrix-acceptance.spec.js:77-86` |
| **Scenario 6** | Student Timetable Access | Navigate to `/timetable/weekly` from student view | Renders student's weekly schedule without administrative actions | `e2e/citrix-acceptance.spec.js:89-96` |
| **Scenario 7** | Administrative Controls | Login as Admin (`demo-admin`) | Admin Command Center exposes CP-SAT solver, repair, approvals, audit log | `e2e/citrix-acceptance.spec.js:99-106` |
| **Scenario 8** | Session Invalidation | Click "Sign Out" in AppShell header | Clears user and auth token; redirects to `/login`; subsequent `/admin` blocked | `e2e/citrix-acceptance.spec.js:109-122` |
| **Scenario 9** | Direct URL with Session | With active session, navigate directly to `/campus` | Route succeeds; renders 3D Campus Explorer digital twin | `e2e/citrix-acceptance.spec.js:125-133` |
| **Scenario 10** | Direct URL without Session | In unauthenticated state, navigate directly to `/admin`, `/student`, `/campus` | Immediate redirect to `/login` with return location saved | `e2e/citrix-acceptance.spec.js:5-17` |

---

## 4. Proposed Dependency Installation Plan

In accordance with strict project boundaries:
> *"If Playwright is not installed, propose the installation and required configuration before changing dependencies."*

To install and run Playwright in `frontend-1/citrix`:

1. **Install `@playwright/test` dev-dependency:**
   ```powershell
   npm --prefix frontend-1/citrix install -D @playwright/test
   ```
2. **Download Chromium Headless binary:**
   ```powershell
   npx playwright install chromium
   ```
3. **Add Test Script to `frontend-1/citrix/package.json`:**
   ```json
   "scripts": {
     "test:e2e": "playwright test"
   }
   ```
4. **Execution Command:**
   ```powershell
   npm --prefix frontend-1/citrix run test:e2e
   ```

All configuration files (`playwright.config.js`) and test specifications (`e2e/citrix-acceptance.spec.js`) are authored, formatted, and ready for execution upon user confirmation.
