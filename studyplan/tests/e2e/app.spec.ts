import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import fs from 'node:fs/promises';
const at='2026-11-04T10:30:00Z';
async function list(page:Page,course?:string){if(course)await page.getByRole('combobox',{name:'Courses',exact:true}).selectOption(course);const button=page.getByRole('button',{name:'Slot list',exact:true});if(await button.isVisible())await button.click();}
async function openSelected(page:Page,label:string){await page.getByRole('button',{name:/My plan/}).click();const card=page.locator('.event-card').filter({hasText:label}).first();await page.locator('.event-card').filter({hasText:label}).first().click();}
test.beforeEach(async({page})=>{await page.clock.install({time:new Date(at)});await page.goto('./');});
test('course dropdown, readable compact details, selection and persistence',async({page})=>{
 await expect(page.getByRole('heading',{name:'TUM Computer Science · Semester 3',exact:true})).toBeVisible();
 await list(page,'its');await page.getByRole('button',{name:'Add IT Security · Group 16',exact:true}).click();
 await page.getByRole('button',{name:/My plan/}).click();await expect(page.locator('.event-card').first()).toContainText('10:00–12:00');
 await expect(page.locator('.event-card').first()).toContainText('Andreas Wilhelmer');await expect(page.locator('.event-card').first()).toContainText('01.13.007');
 await page.reload();await expect(page.getByRole('button',{name:/My plan/})).toContainText('1');
 await expect(page.getByRole('combobox',{name:'Courses',exact:true})).toHaveValue('its');await expect(page.getByRole('button',{name:/My plan/})).toHaveAttribute('aria-pressed','true');
 await page.locator('.event-card').first().click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText('Official source');await expect(dialog).toContainText('Andreas Wilhelmer');
 const size=await dialog.boundingBox();expect(size!.width).toBeLessThanOrEqual(430);expect(size!.height).toBeLessThan(450);
 await page.mouse.click(3,3);await expect(dialog).not.toBeVisible();await expect(page.locator('.event-card').first()).toBeFocused();await page.locator('.event-card').first().press('Enter');await expect(dialog).toBeVisible();
 await page.getByRole('button',{name:'Remove from my timetable'}).click();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(page.getByRole('button',{name:/My plan/})).toContainText('0');
});
test('overlap options, search, skipped dates and ICS download contents',async({page})=>{
 await list(page,'its');await page.getByRole('button',{name:'Add IT Security · Group 16',exact:true}).click();await page.getByRole('button',{name:'Add IT Security · Group 17',exact:true}).click();await expect(page.locator('.conflict')).toContainText('dates with overlaps');
 await page.getByRole('textbox',{name:'Search courses, tutors or rooms'}).fill('Wilhelmer');await expect(page.locator('.slot-row')).toHaveCount(2);await page.getByRole('button',{name:'Clear search'}).click();
 await openSelected(page,'Group 16');await page.getByText('Dates & exceptions',{exact:true}).click();await page.getByRole('dialog').getByRole('checkbox').nth(1).uncheck();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Export calendar'}).click();const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download .ics'}).click();const download=await downloaded;const body=await fs.readFile((await download.path())!,'utf8');expect(body).toContain('BEGIN:VCALENDAR');expect(body).toContain('UID:its-17-2026-11-04');expect(body).not.toContain('UID:its-16-2026-11-04');expect(body).not.toContain('DTSTART:20261230');
});
test('shared previews do not replace saved plan or filters until saved',async({page,context})=>{
 await list(page);await page.getByRole('button',{name:'Add GBS · Mi-1400-A',exact:true}).click();await page.getByRole('button',{name:'Share',exact:true}).click();const link=await page.getByRole('textbox',{name:'Schedule link'}).inputValue();
 const second=await context.newPage();await second.goto(link);await expect(second.getByText('Shared preview',{exact:true})).toBeVisible();
 await list(second);await second.getByRole('button',{name:'Add GBS · Mi-1600-A',exact:true}).click();await second.getByRole('combobox',{name:'Courses',exact:true}).selectOption('ana');
 expect(JSON.parse((await second.evaluate(()=>localStorage.getItem('studyplan:v1')))! ).selected).toHaveLength(1);
 expect(JSON.parse((await second.evaluate(()=>localStorage.getItem('studyplan:preferences:v1')))! ).course).toBe('gbs');
 await second.getByRole('button',{name:'Save a copy'}).click();await second.reload();await expect(second.getByRole('button',{name:/My plan/})).toContainText('2');await expect(second).not.toHaveURL(/#plan=/);await expect(second.getByRole('combobox',{name:'Courses',exact:true})).toHaveValue('ana');
});
test('calendar views, live line and no horizontal week scrolling',async({page},info)=>{
 await page.getByRole('button',{name:'Day',exact:true}).click();await expect(page.getByTestId('now-line')).toBeVisible();await page.clock.fastForward(60000);await expect(page.getByTestId('now-line')).toContainText('11:31');
 await page.getByRole('button',{name:'Next period'}).click();await expect(page.getByRole('heading',{name:/Thursday.*5 November/})).toBeVisible();await page.getByRole('button',{name:'Today',exact:true}).click();
 await page.getByRole('button',{name:'Month',exact:true}).click();await expect(page.locator('.month-cell')).toHaveCount(42);await page.locator('.more').first().click();await expect(page.getByRole('button',{name:'Day',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'List',exact:true}).click();await expect(page.locator('.agenda')).toBeVisible();await page.getByRole('button',{name:'Week',exact:true}).click();await page.getByRole('button',{name:'Today',exact:true}).click();
 await page.getByRole('combobox',{name:'Courses',exact:true}).selectOption('all');
 await expect(page.locator('.day-heading')).toHaveCount(5);
 const viewport=page.viewportSize()!;if(viewport.width>900){expect(await page.locator('.time-scroll').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);for(const day of await page.locator('.day-heading').all()){const b=await day.boundingBox();expect(b!.x).toBeGreaterThanOrEqual(0);expect(b!.x+b!.width).toBeLessThanOrEqual(viewport.width);}}else{await expect(page.locator('.week-scroll-hint')).toBeVisible();}
 const calendar=await page.locator('.calendar-panel').boundingBox();if(info.project.name==='chromium'){expect(calendar!.y).toBeLessThan(220);expect(calendar!.height).toBeGreaterThan(viewport.height*.75);}
 await page.screenshot({path:`artifacts/${info.project.name}-week-v2.png`,fullPage:false});
 await page.getByRole('button',{name:'Day',exact:true}).click();const card=page.locator('.overlap-lanes .event-card').first();await card.click();await expect(page.getByRole('dialog')).toContainText('Official source');await expect(page.getByRole('dialog').getByText('Room',{exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await expect(card).toBeFocused();
 await page.screenshot({path:`artifacts/${info.project.name}-day-v2.png`,fullPage:false});
});
test('provisional export, cancelled groups and malformed links',async({page})=>{
 await list(page,'gdb');await page.getByRole('button',{name:'Add GDB · Gruppe 03',exact:true}).click();await page.getByRole('button',{name:'Export calendar'}).click();await expect(page.getByRole('button',{name:'Download .ics'})).toBeDisabled();await page.getByRole('checkbox',{name:/Include.*provisional/}).check();await expect(page.getByRole('button',{name:'Download .ics'})).toBeEnabled();await page.keyboard.press('Escape');
 await list(page,'its');await expect(page.getByRole('button',{name:'Add IT Security · Group 13',exact:true})).toBeDisabled();await page.goto('./#plan=bad');await expect(page.getByRole('status')).toContainText('invalid');
});
test('320px layout, root assets and malformed initial share preserve saved plan',async({page})=>{
 await page.setViewportSize({width:320,height:800});await list(page,'all');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
 await page.getByRole('button',{name:'Add GBS · Mi-1400-A',exact:true}).click();await page.goto('./#plan=invalid');await page.reload();await expect(page.getByRole('status')).toContainText('invalid');await expect(page.getByRole('button',{name:/My plan/})).toContainText('1');await expect(page.getByText('Shared preview',{exact:true})).toHaveCount(0);
 const assets=await page.locator('script[src],link[rel=stylesheet]').evaluateAll(es=>es.map(e=>e.getAttribute('src')||e.getAttribute('href')));expect(assets.length).toBeGreaterThan(0);expect(assets.every(a=>a?.startsWith('/assets/'))).toBe(true);
});
test('range updates calendar and assembly-conflict details remain accessible',async({page})=>{
 await list(page,'its');await page.locator('.slot-summary').filter({hasText:'IT Security · Group 16'}).click();await page.getByText('Dates & exceptions',{exact:true}).click();await expect(page.getByRole('dialog')).toContainText('FVV: teaching is suspended in Garching from 10:00 to 11:30');await expect(page.getByRole('dialog').getByRole('checkbox').first()).toBeDisabled();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Schedule dates & exclusions'}).click();await page.getByLabel('Schedule start').fill('2027-01-11');await page.getByRole('button',{name:'Apply dates'}).click();await page.getByRole('button',{name:'Week',exact:true}).click();await expect(page.getByRole('heading',{name:'11 Jan – 17 Jan 2027',exact:true})).toBeVisible();await expect(page.locator('.event-card,.event-group').first()).toBeVisible();
});
test('course, search and type filters restore on a later visit; reset is guarded',async({page,context})=>{
 await list(page,'ana');await page.getByRole('button',{name:'Add Analysis · Group 11',exact:true}).click();await page.getByRole('textbox',{name:'Search courses, tutors or rooms'}).fill('Matei');await page.getByRole('combobox',{name:'Session type'}).selectOption('Tutorial');
 const later=await context.newPage();await later.goto('./');await expect(later.getByRole('combobox',{name:'Courses',exact:true})).toHaveValue('ana');await expect(later.getByRole('textbox',{name:'Search courses, tutors or rooms'})).toHaveValue('Matei');await expect(later.getByRole('combobox',{name:'Session type'})).toHaveValue('Tutorial');await expect(later.getByRole('button',{name:/My plan/})).toContainText('1');
 await later.getByRole('button',{name:'Schedule dates & exclusions'}).click();await later.getByRole('button',{name:'Reset saved plan',exact:true}).click();await later.getByRole('button',{name:'Keep saved plan'}).click();await later.keyboard.press('Escape');await expect(later.getByRole('button',{name:/My plan/})).toContainText('1');
 await later.getByRole('button',{name:'Schedule dates & exclusions'}).click();await later.getByRole('button',{name:'Reset saved plan',exact:true}).click();await later.getByRole('button',{name:'Reset plan and filters',exact:true}).click();await later.reload();await expect(later.getByRole('combobox',{name:'Courses',exact:true})).toHaveValue('gbs');await expect(later.getByRole('textbox',{name:'Search courses, tutors or rooms'})).toHaveValue('');await expect(later.getByRole('combobox',{name:'Session type'})).toHaveValue('all');await expect(later.getByRole('button',{name:/My plan/})).toContainText('0');
});
test('corrupt storage and unavailable storage leave the planner usable',async({page,context})=>{
 await page.evaluate(()=>{localStorage.setItem('studyplan:v1','bad');localStorage.setItem('studyplan:preferences:v1','{"course":"invalid"}');});await page.reload();await expect(page.getByRole('status')).toContainText('could not be loaded');await expect(page.getByRole('button',{name:/My plan/})).toContainText('0');
 const isolated=await context.browser()!.newContext();await isolated.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Unavailable','SecurityError');}});});const blocked=await isolated.newPage();await blocked.goto(page.url());await list(blocked);await blocked.getByRole('button',{name:'Add GBS · Mi-1400-A',exact:true}).click();await expect(blocked.getByRole('status')).toContainText('storage is unavailable');await expect(blocked.getByRole('button',{name:'Share',exact:true})).toBeEnabled();await isolated.close();
});

test('Week keeps readable columns on 320, 390 and 768px screens and fits desktop',async({page},info)=>{
 await page.getByRole('combobox',{name:'Courses',exact:true}).selectOption('all');await page.getByRole('button',{name:'Week',exact:true}).click();
 for(const width of [320,390,768,1024]){
  await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const scroll=page.locator('.time-scroll');const group=page.locator('.event-group').first();expect((await group.boundingBox())!.width).toBeGreaterThan(170);
  expect(await group.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  if(width<=900){await expect(page.locator('.week-scroll-hint')).toBeVisible();expect(await scroll.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);await scroll.evaluate(e=>e.scrollLeft=e.scrollWidth);const last=await page.locator('.day-heading').last().boundingBox();expect(last!.x+last!.width).toBeLessThanOrEqual(width);await page.locator('.day-heading').last().click();await expect(page.getByRole('button',{name:'Day',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Week',exact:true}).click();}
  else expect(await scroll.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await scroll.evaluate(e=>e.scrollLeft=0);if(width===390)await page.screenshot({path:`artifacts/${info.project.name}-mobile-week-v2.png`});
 }
});

test('Day and Week show the complete time range without vertical scrolling',async({page})=>{
 await page.getByRole('combobox',{name:'Courses',exact:true}).selectOption('all');
 for(const viewport of [{width:1440,height:1000},{width:1024,height:768},{width:390,height:844},{width:320,height:800}]){
  await page.setViewportSize(viewport);
  for(const view of ['Day','Week']){
   await page.getByRole('button',{name:view,exact:true}).click();const grid=page.locator('.time-scroll');
   expect(await grid.evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);
   const bounds=await grid.boundingBox();for(const label of [page.locator('.hours span').first(),page.locator('.hours span').last()]){const box=await label.boundingBox();expect(box!.y).toBeGreaterThanOrEqual(bounds!.y);expect(box!.y+box!.height).toBeLessThanOrEqual(bounds!.y+bounds!.height+1);}
   for(const event of await page.locator('.positioned-event').all()){const box=await event.boundingBox();expect(box!.y).toBeGreaterThanOrEqual(bounds!.y);expect(box!.y+box!.height).toBeLessThanOrEqual(bounds!.y+bounds!.height+1);}
  }
 }
});

test('overlapping sessions have separate clickable lanes inside their time box',async({page})=>{
 await page.getByRole('combobox',{name:'Courses',exact:true}).selectOption('all');await page.getByRole('button',{name:'Week',exact:true}).click();
 for(const group of await page.locator('.overlap-lanes').all()){
  const count=Number((await group.getAttribute('aria-label'))!.split(' ')[0]);await expect(group.locator('.event-card')).toHaveCount(count);
  const bounds=await group.boundingBox();const lanes=await group.locator('.lane-event').all();const boxes=[];
  for(const lane of lanes){const box=(await lane.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(bounds!.x-.1);expect(box.x+box.width).toBeLessThanOrEqual(bounds!.x+bounds!.width+.1);expect(box.y+box.height).toBeLessThanOrEqual(bounds!.y+bounds!.height+.1);boxes.push(box);}
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(a.y<b.y+b.height-.5&&b.y<a.y+a.height-.5)expect(a.x+a.width<=b.x+.5||b.x+b.width<=a.x+.5).toBe(true);}
 }
 const last=page.locator('.overlap-lanes .event-card').last();await last.focus();await last.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(last).toBeFocused();
});

test('NumProg options preserve split groups and selections across courses',async({page},info)=>{
 await list(page,'num');await expect(page.locator('.slot-row')).toHaveCount(18);
 await page.getByRole('button',{name:'Add NumProg · Group 04a · English',exact:true}).click();
 await page.getByRole('button',{name:'Add NumProg · Group 18a · English',exact:true}).click();
 await page.getByRole('combobox',{name:'Courses',exact:true}).selectOption('its');
 await page.getByRole('button',{name:'Add IT Security · Group 16',exact:true}).click();
 await page.reload();await expect(page.getByRole('button',{name:/My plan/})).toContainText('3');
 await page.getByRole('button',{name:'Export calendar'}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download .ics'}).click();const download=await pending;
 const body=await fs.readFile((await download.path())!,'utf8');expect(body).toContain('NUM · Group 04a');expect(body).toContain('LOCATION:Online');expect(body).toContain('UID:its-16-');
 await page.keyboard.press('Escape');await page.getByRole('combobox',{name:'Courses',exact:true}).selectOption('num');await page.getByRole('button',{name:'Week',exact:true}).click();
 await page.screenshot({path:`artifacts/${info.project.name}-numprog.png`});
});

test('selected tutorials stay as translucent context across filters without covering candidates',async({page},info)=>{
 await list(page,'its');await page.getByRole('button',{name:'Add IT Security · Group 16',exact:true}).click();
 await page.getByRole('combobox',{name:'Courses',exact:true}).selectOption('num');
 await page.getByRole('button',{name:'Find tutorials',exact:true}).click();
 await page.getByRole('button',{name:'Day',exact:true}).click();
 const saved=page.locator('.event-card[data-slot-id="its-16"]');
 await expect(saved).toHaveCount(1);await expect(saved).toHaveClass(/selected-context/);
 await expect(saved).toHaveAccessibleName(/Selected in my plan/);await expect(saved).toHaveCSS('opacity','0.5');
 const options=page.locator('.event-card:not(.selected-context)');expect(await options.count()).toBeGreaterThan(0);
 const overlap=page.locator('.event-card.plan-overlap:not(.selected-context)').first();await expect(overlap).toBeVisible();
 const a=(await saved.boundingBox())!,b=(await overlap.boundingBox())!;expect(a.x+a.width<=b.x+.5||b.x+b.width<=a.x+.5).toBe(true);
 await overlap.click();await expect(page.getByRole('dialog')).toContainText('Overlaps your plan: ITS · Group 16');await page.keyboard.press('Escape');
 await page.screenshot({path:`artifacts/${info.project.name}-selected-context.png`});
 await page.getByRole('textbox',{name:'Search courses, tutors or rooms'}).fill('no matching tutor');await expect(saved).toHaveCount(1);await expect(options).toHaveCount(0);
 await page.getByRole('combobox',{name:'Session type'}).selectOption('Lecture');await expect(saved).toHaveCount(1);
 await page.getByRole('button',{name:'Clear search'}).click();await page.getByRole('combobox',{name:'Session type'}).selectOption('all');
 await page.getByRole('combobox',{name:'Courses',exact:true}).selectOption('its');await expect(saved).toHaveCount(1);
 await page.getByRole('button',{name:/My plan/}).click();await expect(saved).not.toHaveClass(/selected-context/);await expect(page.locator('.event-card')).toHaveCount(1);
});
