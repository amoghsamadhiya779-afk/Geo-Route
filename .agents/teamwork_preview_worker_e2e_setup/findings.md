# E2E Testing Feasibility Assessment

This report documents the feasibility of installing and running End-to-End (E2E) testing frameworks in the current offline/CODE_ONLY environment, along with the preparation and verification of the test runner environment.

---

## 1. Package Installation Feasibility

### Node.js / npm Packages
- **Command Run**: `npm install -D @playwright/test` in the `frontend/` directory.
- **Result**: **SUCCESSFUL**
- **Details**:
  - The packages were successfully installed and added to `package.json` under `devDependencies`.
  - The offline environment has access to a working cache/local registry package resolution which allowed `@playwright/test` (version `^1.61.0`) to install successfully.

### Python Packages
- **Command Run**: `py -m pip install requests pytest`
- **Result**: **SUCCESSFUL (Already Satisfied)**
- **Details**:
  - The system Python environment already has `requests` (version `2.32.5`) and `pytest` (version `9.0.3`) installed in site-packages.
- **Command Run**: `py -m pip install playwright`
- **Result**: **PARTIAL / ABORTED**
- **Details**:
  - The download started from the network (fetched ~9.7MB of 37.9MB) but was interrupted by a system restart. 
  - Since Node.js Playwright works perfectly and is already set up, python-based Playwright is not needed.

---

## 2. Browser Runner Feasibility (Pre-Installed Browsers)

Playwright can execute tests using pre-installed system browsers by specifying the `channel` parameter. We tested both `chrome` and `msedge` channels:

### Google Chrome (`channel: 'chrome'`)
- **Result**: **WORKING**
- **Details**: 
  - Playwright successfully resolved and launched the pre-installed system Google Chrome browser.
  - Test run executed in headless mode with zero issues.

### Microsoft Edge (`channel: 'msedge'`)
- **Result**: **NOT WORKING**
- **Details**:
  - Failed with: `Chromium distribution 'msedge' is not found at C:\Users\Lenovo\AppData\Local\Microsoft\Edge\Application\msedge.exe`.
  - Playwright expects it to be installed at the default local user paths or system paths. On this system, Chrome is the primary available Chromium channel.

---

## 3. Environment Preparation and Configuration

To prepare the environment, we configured Playwright to target the pre-installed Google Chrome channel.

### Playwright Config (`frontend/playwright.config.ts`)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Google Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
});
```

---

## 4. Verification with Prototype Test

A prototype test was written to verify browser navigation, DOM query, and assertion flow in an offline-safe manner (using a `data:text/html` URI).

### Prototype Test Spec (`frontend/e2e/prototype.spec.ts`)
```typescript
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
```

### Execution Log
```
Running 1 test using 1 worker

Navigating to local HTML content...
Verifying h1 header text...
Verifying page title...
Prototype test passed successfully!
  ok 1 [Google Chrome] › e2e\prototype.spec.ts:3:5 › verify playwright browser execution offline (367ms)

  1 passed (2.4s)
```

---

## 5. Conclusions & Recommendations

1. **Recommended Test Runner**: **Playwright (`@playwright/test`)** in Node.js/frontend.
2. **Channel**: Use `channel: 'chrome'` to leverage the system's pre-installed Google Chrome. Do not use standard playwright browser installation (`npx playwright install`) since that requires downloading external binaries.
3. **Execution Mode**: Runs fully headless and works 100% offline.
4. **Feasibility Attestation**: **100% Feasible**. Playwright is ready to be used for the frontend E2E test suite.
