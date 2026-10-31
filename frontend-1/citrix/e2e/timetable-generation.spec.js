// frontend-1/citrix/e2e/timetable-generation.spec.js
import { test, expect } from '@playwright/test';

test.describe('CITRIX Weekly Timetable Generation E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Admin via Persona Card
    await page.goto('/login');
    const adminCard = page.locator('text=Dr. Pramod Mishra').first();
    await expect(adminCard).toBeVisible();
    await adminCard.click();
    await expect(page).toHaveURL(/\/admin/);
  });

  test('Workspace renders authentic metrics, grid, validator and export controls', async ({ page }) => {
    test.setTimeout(60000);

    // Navigate to Timetable Generation Workspace
    await page.goto('/admin/timetable/generate');
    await expect(page).toHaveURL(/\/admin\/timetable\/generate/);

    // Verify Title & Header
    await expect(page.locator('h1')).toContainText('Weekly Timetable Generation & CP-SAT Solver');

    // Verify Overview Statistics using exact text matchers
    const totalSessions = page.getByText('Total Sessions', { exact: true }).locator('..');
    await expect(totalSessions).toContainText('189');

    const scheduledSessions = page.getByText('Scheduled', { exact: true }).locator('..');
    await expect(scheduledSessions).toContainText('189');

    const unscheduledSessions = page.getByText('Unscheduled', { exact: true }).locator('..');
    await expect(unscheduledSessions).toContainText('0');

    const hardViolations = page.getByText('Hard Violations', { exact: true }).locator('..');
    await expect(hardViolations).toContainText('0');

    // Verify Official Validator Modal Trigger
    const validateBtn = page.getByRole('button', { name: /Run Official Validator/i });
    await expect(validateBtn).toBeVisible();
    await validateBtn.click();

    // Check Validator Modal
    const modalHeading = page.locator('text=Official Schedule Validator Report');
    await expect(modalHeading).toBeVisible();
    await expect(page.locator('text=Hard Constraints Checklist')).toBeVisible();
    await expect(page.locator('text=PASSED • 0 HARD VIOLATIONS')).toBeVisible();

    // Close Validator Modal via Done button
    const closeBtn = page.getByRole('button', { name: /Done/i });
    await closeBtn.click();
    await expect(modalHeading).not.toBeVisible();

    // Verify Timetable Grid renders table headers and periods
    await expect(page.locator('text=Period / Slot')).toBeVisible();
    await expect(page.locator('text=08:30 - 09:30').first()).toBeVisible();
    await expect(page.locator('text=12:30 - 13:30').first()).toBeVisible();
    await expect(page.locator('text=16:30 - 17:30').first()).toBeVisible();

    // Filter by Cohort: Select Y1-A by value
    const cohortFilter = page.locator('select').first();
    await cohortFilter.selectOption('Y1-A');
    
    // Grid now shows sessions for Y1-A
    const y1Session = page.locator('table .cursor-pointer').first();
    await expect(y1Session).toBeVisible();

    // Reset Cohort Filter to All
    await cohortFilter.selectOption('All');

    // Click on a Session Card in the table to view Mathematical Decision Explanation
    const firstSessionCard = page.locator('table .cursor-pointer').first();
    await expect(firstSessionCard).toBeVisible();
    await firstSessionCard.click();

    // Verify Decision Modal
    const decisionModal = page.locator('text=Mathematical Constraint Proof');
    await expect(decisionModal).toBeVisible();
    await expect(page.locator('text=Hard Constraint H2/H3 (Zero Overlap)')).toBeVisible();
    await expect(page.locator('text=Hard Constraint H6/H7/H8 (Room Suitability)')).toBeVisible();

    // Close Decision Modal
    const closeDecisionBtn = page.getByRole('button', { name: /Close Explanation/i });
    await closeDecisionBtn.click();
    await expect(decisionModal).not.toBeVisible();

    // Verify Export schedule.json button exists
    const exportBtn = page.getByRole('button', { name: /Export schedule\.json/i });
    await expect(exportBtn).toBeVisible();

    // Verify Page Refresh Persistence
    await page.reload();
    await expect(page.locator('h1')).toContainText('Weekly Timetable Generation & CP-SAT Solver');
    await expect(totalSessions).toContainText('189');
    await expect(scheduledSessions).toContainText('189');
  });

  test('Trigger Generate Weekly Timetable executes solver stages and updates schedule', async ({ page }) => {
    test.setTimeout(60000);

    // Navigate to Timetable Generation Workspace
    await page.goto('/admin/timetable/generate');

    // Click Generate Timetable
    const generateBtn = page.getByRole('button', { name: /Generate Weekly Timetable/i });
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // Verify progress / solver status appears
    await expect(page.locator('text=SOLVER RUNNING...')).toBeVisible({ timeout: 5000 });

    // Wait for the solver pipeline to finish (button returns to ready state)
    await expect(page.getByRole('button', { name: /Generate Weekly Timetable/i })).toBeVisible({ timeout: 50000 });

    // After completion, verify 189 scheduled sessions and 0 hard violations
    const scheduled = page.getByText('Scheduled', { exact: true }).locator('..');
    await expect(scheduled).toContainText('189');

    const hardViolations = page.getByText('Hard Violations', { exact: true }).locator('..');
    await expect(hardViolations).toContainText('0');
  });
});
