const { chromium } = require('@playwright/test');

(async () => {
  try {
    console.log('Attempting to launch browser with chrome channel...');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    console.log('Success launching chrome!');
    await browser.close();
  } catch (err) {
    console.error('Failed to launch chrome:', err);
  }

  try {
    console.log('Attempting to launch browser with msedge channel...');
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    console.log('Success launching msedge!');
    await browser.close();
  } catch (err) {
    console.error('Failed to launch msedge:', err);
  }
})();
