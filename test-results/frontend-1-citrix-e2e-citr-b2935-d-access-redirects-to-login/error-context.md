# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend-1\citrix\e2e\citrix-acceptance.spec.js >> CITRIX Phase 5E Acceptance Test Suite >> Scenario 10: Unauthenticated access redirects to /login
- Location: frontend-1\citrix\e2e\citrix-acceptance.spec.js:6:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/admin", waiting until "load"

```

# Test source

```ts
  1   | // e2e/citrix-acceptance.spec.js
  2   | import { test, expect } from '@playwright/test';
  3   | 
  4   | test.describe('CITRIX Phase 5E Acceptance Test Suite', () => {
  5   |   // Scenario 10: Direct URL navigation without session redirects to /login
  6   |   test('Scenario 10: Unauthenticated access redirects to /login', async ({ page }) => {
> 7   |     await page.goto('/admin');
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  8   |     await expect(page).toHaveURL(/\/login/);
  9   | 
  10  |     await page.goto('/student');
  11  |     await expect(page).toHaveURL(/\/login/);
  12  | 
  13  |     await page.goto('/campus');
  14  |     await expect(page).toHaveURL(/\/login/);
  15  |   });
  16  | 
  17  |   // Scenario 1 & 2: Login as each of the 5 roles and verify landing page
  18  |   const roles = [
  19  |     { name: 'Dr. Pramod Mishra', role: 'admin', expectedUrl: '/admin' },
  20  |     { name: 'Dr. Priya Sharma', role: 'coordinator', expectedUrl: '/coordinator' },
  21  |     { name: 'Dr. Rajesh Kumar', role: 'faculty', expectedUrl: '/faculty' },
  22  |     { name: 'Aryan Mehta', role: 'club', expectedUrl: '/club' },
  23  |     { name: 'Rahul Sharma', role: 'student', expectedUrl: '/student' },
  24  |   ];
  25  | 
  26  |   for (const item of roles) {
  27  |     test(`Scenario 1 & 2: Login as ${item.role} lands on ${item.expectedUrl}`, async ({ page }) => {
  28  |       await page.goto('/login');
  29  |       // Click persona card
  30  |       const personaCard = page.locator(`text=${item.name}`).first();
  31  |       await expect(personaCard).toBeVisible();
  32  |       await personaCard.click();
  33  | 
  34  |       // Verify landing page
  35  |       await expect(page).toHaveURL(new RegExp(item.expectedUrl));
  36  |     });
  37  |   }
  38  | 
  39  |   // Scenario 3: Verify role-appropriate navigation items
  40  |   test('Scenario 3: Student sees only student-appropriate navigation', async ({ page }) => {
  41  |     await page.goto('/login');
  42  |     await page.locator('text=Rahul Sharma').first().click();
  43  |     await expect(page).toHaveURL(/\/student/);
  44  | 
  45  |     // Verify student items are present
  46  |     await expect(page.locator('text=My Dashboard').first()).toBeVisible();
  47  |     await expect(page.locator('text=My Timetable').first()).toBeVisible();
  48  |     await expect(page.locator('text=Examinations').first()).toBeVisible();
  49  |     await expect(page.locator('text=3D Campus Map').first()).toBeVisible();
  50  |     await expect(page.locator('text=AI Campus Assistant').first()).toBeVisible();
  51  | 
  52  |     // Verify administrative/club items are NOT present
  53  |     await expect(page.locator('text=Generate Timetable')).not.toBeVisible();
  54  |     await expect(page.locator('text=Approvals Queue')).not.toBeVisible();
  55  |     await expect(page.locator('text=Disruptions & Repair')).not.toBeVisible();
  56  |     await expect(page.locator('text=Smart AI Booking (NL)')).not.toBeVisible();
  57  |   });
  58  | 
  59  |   // Scenario 4: Verify unauthorized page access redirects correctly via RoleGuard
  60  |   test('Scenario 4: Unauthorized route access redirects to role home dashboard', async ({ page }) => {
  61  |     // Login as Student
  62  |     await page.goto('/login');
  63  |     await page.locator('text=Rahul Sharma').first().click();
  64  |     await expect(page).toHaveURL(/\/student/);
  65  | 
  66  |     // Attempt direct navigation to Admin route
  67  |     await page.goto('/admin');
  68  |     await expect(page).toHaveURL(/\/student/);
  69  | 
  70  |     // Attempt direct navigation to Coordinator route
  71  |     await page.goto('/coordinator');
  72  |     await expect(page).toHaveURL(/\/student/);
  73  | 
  74  |     // Attempt direct navigation to Approvals
  75  |     await page.goto('/approvals');
  76  |     await expect(page).toHaveURL(/\/student/);
  77  |   });
  78  | 
  79  |   // Scenario 5: Student dashboard displays real cohort data
  80  |   test('Scenario 5: Student dashboard displays cohort information', async ({ page }) => {
  81  |     await page.goto('/login');
  82  |     await page.locator('text=Rahul Sharma').first().click();
  83  |     await expect(page).toHaveURL(/\/student/);
  84  | 
  85  |     // Verify student header and cohort badge
  86  |     await expect(page.locator('text=Welcome, Rahul Sharma')).toBeVisible();
  87  |     await expect(page.locator('text=STUDENT PORTAL').first()).toBeVisible();
  88  |   });
  89  | 
  90  |   // Scenario 6: Student timetable shows scheduled classes
  91  |   test('Scenario 6: Student timetable view displays timetable navigation', async ({ page }) => {
  92  |     await page.goto('/login');
  93  |     await page.locator('text=Rahul Sharma').first().click();
  94  |     await expect(page).toHaveURL(/\/student/);
  95  | 
  96  |     await page.goto('/timetable/weekly');
  97  |     await expect(page).toHaveURL(/\/timetable\/weekly/);
  98  |   });
  99  | 
  100 |   // Scenario 7: Admin sees administrative controls
  101 |   test('Scenario 7: Admin command center displays master controls', async ({ page }) => {
  102 |     await page.goto('/login');
  103 |     await page.locator('text=Dr. Pramod Mishra').first().click();
  104 |     await expect(page).toHaveURL(/\/admin/);
  105 | 
  106 |     await expect(page.locator('text=Institutional Command Center')).toBeVisible();
  107 |     await expect(page.locator('text=Generate Weekly Timetable').first()).toBeVisible();
```