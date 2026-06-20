import { test, expect } from '@playwright/test';

test('verify playwright browser execution offline', async ({ page }) => {
  console.log('Navigating to local HTML content...');
  await page.goto('data:text/html,<html><head><title>GeoRoute E2E Test</title></head><body><h1>GeoRoute E2E</h1></body></html>');
  
  console.log('Verifying h1 header text...');
  const header = page.locator('h1');
  await expect(header).toHaveText('GeoRoute E2E');
  
  console.log('Verifying page title...');
  await expect(page).toHaveTitle('GeoRoute E2E Test');
  console.log('Prototype test passed successfully!');
});
