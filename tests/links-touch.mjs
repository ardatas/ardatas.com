// Run against a built portfolio with the same Playwright module as julia-browser.mjs.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const note = { id: 'touch-fixture', seq: 1, revision: 1, title: 'Touch fixture', url: 'https://example.org/', description: '' };
  await page.route('**/links/api.php', route => route.fulfill({ json: { notes: [note], canWrite: false } }));
  await page.goto(new URL('/links/', process.env.LINKS_TEST_URL || 'http://127.0.0.1:4188').href);
  const card = page.locator('.note-slot').first();
  const title = card.getByRole('link');
  await title.waitFor();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  const { x, y } = await title.boundingBox();
  const position = () => card.evaluate(el => el.getBoundingClientRect().top - el.parentElement.getBoundingClientRect().top);
  const before = await position();
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x + 8, y: y + 8 }] });
  for (const dy of [15, 40, 60]) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 8, y: y + 8 + dy }] });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const after = await position();
  assert.ok(after > before + 40, 'the note follows a touch drag that starts on its title');
  assert.equal(context.pages().length, 1, 'dragging the title must not activate its link');
  await page.reload();
  await card.locator('button.paper-corner').waitFor();
  assert.ok(Math.abs(await position() - after) < 2, 'the dropped position survives reload');
} finally {
  await browser.close();
}
