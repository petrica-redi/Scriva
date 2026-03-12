import { test, expect } from "@playwright/test";

test.describe("Health and public routes", () => {
  test("GET /api/health returns 200 and ok status", async ({ request }) => {
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
    const res = await request.get(`${baseURL}/api/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("status", "ok");
    expect(body).toHaveProperty("db", "ok");
  });

  test("public booking page loads", async ({ page }) => {
    const res = await page.goto("/book");
    expect(res?.status()).toBe(200);
    await expect(page.getByText(/Find your doctor|Book|Appointment/i).first()).toBeVisible({ timeout: 10000 });
  });
});
