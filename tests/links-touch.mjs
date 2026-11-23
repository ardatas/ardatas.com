// Run against the built static preview with the Playwright module used by julia-browser.mjs.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const tags = [{ id: 'a', name: 'Art', colour: '#f9d8c7', icon: '🎨' }];
  const notes = ['First', 'Second', 'Third'].map((title, i) => ({
    id: title, title, seq: 3 - i, revision: 1, tagId: i < 2 ? 'a' : null,
    url: 'https://example.org/', description: i === 1 ? 'Long description. '.repeat(10) : '',
  }));
  await page.route('**/links/api.php', route => route.fulfill({ json: { tags, notes, canWrite: false } }));
  await page.addInitScript(() => localStorage.setItem('links-position:First', '{"space":"page","x":1,"y":1}'));
  await page.goto(new URL('/links/', process.env.LINKS_TEST_URL || 'http://127.0.0.1:4188').href);
  const cards = page.locator('.note-slot');
  await cards.first().waitFor();
  assert.deepEqual(await page.locator('.note-group-title').allTextContents(), ['🎨 Art', 'Untagged']);
  const handle = page.locator('[data-note-id="First"] .paper-corner');
  await handle.scrollIntoViewIfNeeded();
  const origin = await handle.boundingBox();
  const other = await cards.nth(1).boundingBox();
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: origin.x + 8, y: origin.y + 8 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: other.x + 14, y: other.y + 14 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => document.querySelector('.note-slot').dataset.noteId === 'Second');
  assert.equal(context.pages().length, 1);
  await page.reload();
  await handle.waitFor();
  assert.deepEqual(await cards.locator('.note-link span:first-child').allTextContents(), ['First', 'Second', 'Third']);
  await handle.press('ArrowRight');
  assert.equal(await cards.first().getAttribute('data-note-id'), 'Second');
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const boxes = await cards.evaluateAll(els => els.map(el => el.getBoundingClientRect().toJSON()));
    boxes.forEach((a, i) => {
      assert.ok(a.left >= 0 && a.right <= width);
      for (const b of boxes.slice(i + 1)) {
        assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
      }
    });
  }
} finally {
  await browser.close();
}
