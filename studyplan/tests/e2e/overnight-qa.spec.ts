import {test, expect, type Page} from '@playwright/test';

async function controls(page: Page, action: () => Promise<unknown>) {
 const toggle = page.getByRole('button', {name: 'Open planner controls'});
 if (await toggle.isVisible() && !await page.locator('.sidebar-drawer').isVisible()) await toggle.click();
 await action();
 if (await page.locator('.sidebar-drawer').isVisible()) await page.locator('.sidebar-drawer').getByRole('button', {name: 'Close', exact: true}).click();
}
async function catalogue(page: Page) {
 await controls(page, async () => {
  await page.getByRole('combobox', {name: 'Courses', exact: true}).selectOption('its');
  await page.getByRole('button', {name: 'Slot list', exact: true}).click();
 });
}
test.beforeEach(async ({page}) => {
 await page.clock.install({time: new Date('2026-11-04T10:30:00Z')});
 await page.goto('./');
});

test('removing the last selected event restores focus to a visible control', async ({page}, info) => {
 await catalogue(page);
 await page.getByRole('button', {name: 'Add IT Security · Group 16', exact: true}).click();
 await controls(page, () => page.getByRole('button', {name: /^My plan/}).click());
 await page.getByRole('button', {name: 'List', exact: true}).click();
 await page.locator('.event-card').first().click();
 await page.getByRole('button', {name: 'Remove from my timetable'}).click();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.locator(':focus')).not.toHaveJSProperty('tagName', 'BODY');
 await expect(page.locator(':focus')).toBeVisible();
 await page.screenshot({path: `artifacts/overnight-qa/${info.project.name}-empty-plan-focus.png`});
});

test('storage failure notice can be dismissed and returns after another failed save', async ({page}, info) => {
 await page.addInitScript(() => {Object.defineProperty(window, 'localStorage', {get() {throw new DOMException('Unavailable', 'SecurityError');}});});
 await page.reload();
 await expect(page.locator('.notice')).toContainText('storage is unavailable');
 await page.getByRole('button', {name: 'Dismiss notice'}).click();
 await expect(page.locator('.notice')).toHaveCount(0);
 await catalogue(page);
 await page.getByRole('button', {name: 'Add IT Security · Group 16', exact: true}).click();
 await expect(page.locator('.notice')).toContainText('storage is unavailable');
 await page.screenshot({path: `artifacts/overnight-qa/${info.project.name}-storage-warning.png`});
});

test('edits in a second tab do not erase slots saved in the first', async ({page, context}) => {
 await catalogue(page);
 const second = await context.newPage();
 await second.clock.install({time: new Date('2026-11-04T10:30:00Z')});
 await second.goto('./');
 await catalogue(second);
 await page.getByRole('button', {name: 'Add IT Security · Group 16', exact: true}).click();
 await second.getByRole('button', {name: 'Add IT Security · Group 17', exact: true}).click();
 await page.reload();
 expect(await page.evaluate(() => JSON.parse(localStorage.getItem('studyplan:v1')!).selected)).toEqual(['its-16','its-17']);
 await second.close();
});

test('the last catalogue action is not covered by the floating tutor wheel', async ({page}, info) => {
 await catalogue(page);
 const last = page.locator('.add-slot:not(:disabled)').last();
 await last.scrollIntoViewIfNeeded();
 await page.screenshot({path: `artifacts/overnight-qa/${info.project.name}-last-slot.png`});
 await last.click({timeout: 3000});
 await expect(last).toHaveClass(/is-added/);
});

test('live saved-plan updates leave a shared preview unchanged until Save a copy', async ({page, context}) => {
 await catalogue(page);
 const preview = await context.newPage();
 await preview.clock.install({time: new Date('2026-11-04T10:30:00Z')});
 const plan = {version: 1, selected: ['its-17'], excluded: [], from: '2026-10-28', to: '2027-02-05'};
 await preview.goto('./#plan=' + encodeURIComponent(JSON.stringify(plan)));
 await catalogue(preview);
 await page.getByRole('button', {name: 'Add IT Security · Group 16', exact: true}).click();
 await expect(preview.getByRole('button', {name: 'Add IT Security · Group 16', exact: true})).toBeVisible();
 await expect(preview.getByRole('button', {name: 'Remove IT Security · Group 17', exact: true})).toBeVisible();
 await expect(preview.getByText('Shared preview', {exact: true})).toBeVisible();
 await controls(preview, () => preview.getByRole('button', {name: 'Save a copy'}).click());
 await expect(page.getByRole('button', {name: 'Remove IT Security · Group 17', exact: true})).toBeVisible();
 await expect(page.getByRole('button', {name: 'Add IT Security · Group 16', exact: true})).toBeVisible();
 await controls(page, () => page.getByRole('button', {name: 'Schedule dates & exclusions'}).click());
 await page.getByRole('button', {name: 'Reset saved plan', exact: true}).click();
 await page.getByRole('button', {name: 'Reset plan and filters', exact: true}).click();
 await expect(preview.getByRole('button', {name: 'Add IT Security · Group 17', exact: true})).toBeVisible();
 await preview.close();
});

test('current-date layout supports portrait, landscape, tablet and desktop views', async ({page}, info) => {
 const errors: string[] = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.clock.setSystemTime(new Date('2026-11-17T10:30:00Z'));
 await page.clock.runFor(1000);
 await page.getByRole('button', {name: 'Today', exact: true}).click();
 await controls(page, () => page.getByRole('combobox', {name: 'Courses', exact: true}).selectOption('all'));
 for (const viewport of [{width: 320, height: 568}, {width: 390, height: 844}, {width: 844, height: 390}, {width: 768, height: 1024}, {width: 1024, height: 768}, {width: 1440, height: 900}]) {
  await page.setViewportSize(viewport);
  for (const view of ['Month', 'Week', 'Day', 'List']) {
   await page.getByRole('button', {name: view, exact: true}).click();
   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
   await expect(page.getByRole('button', {name: 'Today', exact: true})).toBeInViewport();
   if (view === 'Week' && [390, 844, 1440].includes(viewport.width)) {
    await page.locator('.time-scroll').evaluate(e => {e.scrollTop = 340;});
    await page.screenshot({path: `artifacts/overnight-qa/${info.project.name}-current-week-${viewport.width}.png`, scale: 'css'});
   }
  }
  await page.getByRole('button', {name: 'Open tutor spin wheel'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
  await page.keyboard.press('Escape');
 }
 expect(errors).toEqual([]);
});
