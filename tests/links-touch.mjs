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
  const start = await title.boundingBox();
  const origin = await card.boundingBox();
  const grab = { x: start.x + 8 - origin.x, y: start.y + 8 - origin.y };
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start.x + 8, y: start.y + 8 }] });
  for (const fraction of [0.2, 0.6, 1]) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
      x: start.x + 8 + (3 - origin.x) * fraction,
      y: start.y + 8 + (5 - origin.y) * fraction,
    }] });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const after = await card.boundingBox();
  assert.ok(Math.abs(after.x - 3) < 2 && Math.abs(after.y - 5) < 2, 'touch can drop a note in the page margin above the board');
  assert.equal(context.pages().length, 1, 'dragging the title must not activate its link');
  await page.reload();
  const handle = card.locator('button.paper-corner');
  await handle.waitFor();
  const restored = await card.boundingBox();
  assert.ok(Math.abs(restored.x - after.x) < 2 && Math.abs(restored.y - after.y) < 2, 'the page position survives reload');
  assert.ok(await card.evaluate(el => el.contains(document.elementFromPoint(120, 45))), 'the placed note remains grabbable above the nav');

  await page.setViewportSize({ width: 1440, height: 500 });
  await handle.press('Home');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const reset = await card.boundingBox();
  const board = await page.locator('.board-desk').boundingBox();
  assert.ok(reset.x >= board.x && reset.y >= board.y);
  await page.mouse.move(reset.x + grab.x, reset.y + grab.y);
  await page.mouse.down();
  await page.mouse.move(1435, 496, { steps: 12 });
  await page.waitForFunction(() => window.scrollY > 0 && window.innerHeight + window.scrollY >= document.body.offsetHeight - 2);
  await page.mouse.up();
  const dropped = await card.boundingBox();
  assert.ok(dropped.x > board.x + board.width - dropped.width && dropped.y + dropped.height > 490,
    'a note can reach the right page margin and footer on a scrolled page');
  assert.ok(await card.evaluate(el => el.contains(document.elementFromPoint(1430, 485))), 'the note stays interactive outside the board');
} finally {
  await browser.close();
}
