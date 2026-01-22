const { test, expect } = require("@playwright/test");

test("basic render test", async ({ page }) => {
  await page.setContent("<html><body><h1>Hello Playwright</h1></body></html>");
  const text = await page.textContent("h1");
  expect(text).toBe("Hello Playwright");
});
