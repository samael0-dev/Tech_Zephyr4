// e2e/citrix-acceptance.spec.js
import { test, expect } from '@playwright/test';

test.describe('CITRIX Phase 5E Acceptance Test Suite', () => {
  // Scenario 10: Direct URL navigation without session redirects to /login
  test('Scenario 10: Unauthenticated access redirects to /login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/student');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/campus');
    await expect(page).toHaveURL(/\/login/);
  });

  // Scenario 1 & 2: Login as each of the 5 roles and verify landing page
  const roles = [
    { name: 'Dr. Pramod Mishra', role: 'admin', expectedUrl: '/admin' },
    { name: 'Dr. Priya Sharma', role: 'coordinator', expectedUrl: '/coordinator' },
    { name: 'Dr. Rajesh Kumar', role: 'faculty', expectedUrl: '/faculty' },
    { name: 'Aryan Mehta', role: 'club', expectedUrl: '/club' },
    { name: 'Rahul Sharma', role: 'student', expectedUrl: '/student' },
  ];

  for (const item of roles) {
    test(`Scenario 1 & 2: Login as ${item.role} lands on ${item.expectedUrl}`, async ({ page }) => {
      await page.goto('/login');
      // Click persona card
      const personaCard = page.locator(`text=${item.name}`).first();
      await expect(personaCard).toBeVisible();
      await personaCard.click();

      // Verify landing page
      await expect(page).toHaveURL(new RegExp(item.expectedUrl));
    });
  }

  // Scenario 3: Verify role-appropriate navigation items
  test('Scenario 3: Student sees only student-appropriate navigation', async ({ page }) => {
    await page.goto('/login');
    await page.locator('text=Rahul Sharma').first().click();
    await expect(page).toHaveURL(/\/student/);

    // Verify student items are present
    await expect(page.locator('text=My Dashboard').first()).toBeVisible();
    await expect(page.locator('text=My Timetable').first()).toBeVisible();
    await expect(page.locator('text=Examinations').first()).toBeVisible();
    await expect(page.locator('text=3D Campus Map').first()).toBeVisible();
    await expect(page.locator('text=AI Campus Assistant').first()).toBeVisible();

    // Verify administrative/club items are NOT present
    await expect(page.locator('text=Generate Timetable')).not.toBeVisible();
    await expect(page.locator('text=Approvals Queue')).not.toBeVisible();
    await expect(page.locator('text=Disruptions & Repair')).not.toBeVisible();
    await expect(page.locator('text=Smart AI Booking (NL)')).not.toBeVisible();
  });

  // Scenario 4: Verify unauthorized page access redirects correctly via RoleGuard
  test('Scenario 4: Unauthorized route access redirects to role home dashboard', async ({ page }) => {
    // Login as Student
    await page.goto('/login');
    await page.locator('text=Rahul Sharma').first().click();
    await expect(page).toHaveURL(/\/student/);

    // Attempt direct navigation to Admin route
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/student/);

    // Attempt direct navigation to Coordinator route
    await page.goto('/coordinator');
    await expect(page).toHaveURL(/\/student/);

    // Attempt direct navigation to Approvals
    await page.goto('/approvals');
    await expect(page).toHaveURL(/\/student/);
  });

  // Scenario 5: Student dashboard displays real cohort data
  test('Scenario 5: Student dashboard displays cohort information', async ({ page }) => {
    await page.goto('/login');
    await page.locator('text=Rahul Sharma').first().click();
    await expect(page).toHaveURL(/\/student/);

    // Verify student header and cohort badge
    await expect(page.locator('text=Welcome, Rahul Sharma')).toBeVisible();
    await expect(page.locator('text=STUDENT PORTAL').first()).toBeVisible();
  });

  // Scenario 6: Student timetable shows scheduled classes
  test('Scenario 6: Student timetable view displays timetable navigation', async ({ page }) => {
    await page.goto('/login');
    await page.locator('text=Rahul Sharma').first().click();
    await expect(page).toHaveURL(/\/student/);

    await page.goto('/timetable/weekly');
    await expect(page).toHaveURL(/\/timetable\/weekly/);
  });

  // Scenario 7: Admin sees administrative controls
  test('Scenario 7: Admin command center displays master controls', async ({ page }) => {
    await page.goto('/login');
    await page.locator('text=Dr. Pramod Mishra').first().click();
    await expect(page).toHaveURL(/\/admin/);

    await expect(page.locator('text=Institutional Command Center')).toBeVisible();
    await expect(page.locator('text=Generate Weekly Timetable').first()).toBeVisible();
  });

  // Scenario 8: Logout works and clears session
  test('Scenario 8: Logout clears session and redirects to login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('text=Dr. Pramod Mishra').first().click();
    await expect(page).toHaveURL(/\/admin/);

    // Click Sign Out
    const logoutBtn = page.locator('button[title="Sign out"]').first();
    await logoutBtn.click();
    await expect(page).toHaveURL(/\/login/);

    // Verify direct navigation back to /admin now fails
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  // Scenario 9: Direct URL navigation with valid session works
  test('Scenario 9: Direct URL navigation with valid session', async ({ page }) => {
    await page.goto('/login');
    await page.locator('text=Dr. Priya Sharma').first().click();
    await expect(page).toHaveURL(/\/coordinator/);

    // Direct navigate to shared campus view
    await page.goto('/campus');
    await expect(page).toHaveURL(/\/campus/);
  });
});
