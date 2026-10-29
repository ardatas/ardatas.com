import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import fs from 'node:fs/promises';
const at='2026-11-04T10:30:00Z';
async function controls(page:Page, action:()=>Promise<unknown>){
 const toggle=page.getByRole('button',{name:'Open planner controls'});
 if(await toggle.isVisible()&&!await page.locator('.sidebar-drawer').isVisible())await toggle.click();
 await action();
 if(await page.locator('.sidebar-drawer').isVisible())await page.locator('.sidebar-drawer').getByRole('button',{name:'Close',exact:true}).click();
}
async function list(page:Page,course?:string){await controls(page,async()=>{if(course)await page.getByRole('combobox',{name:'Courses',exact:true}).selectOption(course);const button=page.getByRole('button',{name:'Slot list',exact:true});if(await button.isVisible())await button.click();});}
async function openSelected(page:Page,label:string){await controls(page,()=>page.getByRole('button',{name:/^My plan/}).click());const card=page.locator('.event-card').filter({hasText:label}).first();if(!(await card.isVisible()))await page.locator('.mobile-overlap:visible').first().click();await card.click();}
test.beforeEach(async({page})=>{await page.clock.install({time:new Date(at)});await page.goto('./');});
test('course dropdown, readable compact details, selection and persistence',async({page})=>{
 await expect(page.getByRole('heading',{name:'TUM Computer Science · Semester 3',exact:true})).toBeVisible();
 await list(page,'its');await page.getByRole('button',{name:'Add IT Security · Group 16',exact:true}).click();
 await controls(page,()=>page.getByRole('button',{name:/^My plan/}).click());await expect(page.locator('.event-card').first()).toContainText('10:00–12:00');
 await expect(page.locator('.event-card').first()).toContainText('Andreas Wilhelmer');await expect(page.locator('.event-card').first()).toContainText('01.13.007');
 await page.reload();await controls(page,()=>expect(page.getByRole('button',{name:/^My plan/})).toContainText('1'));
 await controls(page,()=>expect(page.getByRole('combobox',{name:'Courses',exact:true})).toHaveValue('its'));await controls(page,()=>expect(page.getByRole('button',{name:/^My plan/})).toHaveAttribute('aria-pressed','true'));
 await page.locator('.event-card').first().click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText('Official source');await expect(dialog).toContainText('Andreas Wilhelmer');
 const size=await dialog.boundingBox();expect(size!.width).toBeLessThanOrEqual(430);expect(size!.height).toBeLessThan(450);
 await page.mouse.click(3,3);await expect(dialog).not.toBeVisible();await expect(page.locator('.event-card').first()).toBeFocused();await page.locator('.event-card').first().press('Enter');await expect(dialog).toBeVisible();
 await page.getByRole('button',{name:'Remove from my timetable'}).click();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await controls(page,()=>expect(page.getByRole('button',{name:/^My plan/})).toContainText('0'));
});
test('overlap options, search, skipped dates and ICS download contents',async({page})=>{
 await list(page,'its');await page.getByRole('button',{name:'Add IT Security · Group 16',exact:true}).click();await page.getByRole('button',{name:'Add IT Security · Group 17',exact:true}).click();await expect(page.locator('.conflict')).toContainText('dates with overlaps');
 await controls(page,()=>page.getByRole('textbox',{name:'Search courses, tutors or rooms'}).fill('Wilhelmer'));await expect(page.locator('.slot-row')).toHaveCount(2);await controls(page,()=>page.getByRole('button',{name:'Clear search'}).click());
 await openSelected(page,'Group 16');await page.getByText('Dates & exceptions',{exact:true}).click();await page.getByRole('dialog').getByRole('checkbox').nth(1).uncheck();await page.keyboard.press('Escape');
 await controls(page,()=>page.getByRole('button',{name:'Export calendar'}).click());const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download .ics'}).click();const download=await downloaded;const body=await fs.readFile((await download.path())!,'utf8');expect(body).toContain('BEGIN:VCALENDAR');expect(body).toContain('UID:its-17-2026-11-04');expect(body).not.toContain('UID:its-16-2026-11-04');expect(body).not.toContain('DTSTART:20261230');
});
test('shared previews do not replace saved plan or filters until saved',async({page,context})=>{
 await list(page);await page.getByRole('button',{name:'Add GBS · Mi-1400-A',exact:true}).click();await controls(page,()=>page.getByRole('button',{name:'Share',exact:true}).click());const link=await page.getByRole('textbox',{name:'Schedule link'}).inputValue();
 const second=await context.newPage();await second.goto(link);await expect(second.getByText('Shared preview',{exact:true})).toBeVisible();
 await list(second);await second.getByRole('button',{name:'Add GBS · Mi-1600-A',exact:true}).click();await controls(second,()=>second.getByRole('combobox',{name:'Courses',exact:true}).selectOption('ana'));
 expect(JSON.parse((await second.evaluate(()=>localStorage.getItem('studyplan:v1')))! ).selected).toHaveLength(1);
 expect(JSON.parse((await second.evaluate(()=>localStorage.getItem('studyplan:preferences:v1')))! ).course).toBe('gbs');
 await controls(second,()=>second.getByRole('button',{name:'Save a copy'}).click());await second.reload();await controls(second,()=>expect(second.getByRole('button',{name:/^My plan/})).toContainText('2'));await expect(second).not.toHaveURL(/#plan=/);await controls(second,()=>expect(second.getByRole('combobox',{name:'Courses',exact:true})).toHaveValue('ana'));
});
test('calendar views, live line and no horizontal week scrolling',async({page},info)=>{
 await page.getByRole('button',{name:'Day',exact:true}).click();await expect(page.getByTestId('now-line')).toBeVisible();await page.clock.fastForward(60000);await expect(page.getByTestId('now-line')).toContainText('11:31');
 await page.getByRole('button',{name:'Next period'}).click();await expect(page.getByRole('heading',{name:/Thursday.*5 November/})).toBeVisible();await page.getByRole('button',{name:'Today',exact:true}).click();
 await page.getByRole('button',{name:'Month',exact:true}).click();await expect(page.locator('.month-cell')).toHaveCount(42);await page.locator('.more').first().click();await expect(page.getByRole('button',{name:'Day',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'List',exact:true}).click();await expect(page.locator('.agenda')).toBeVisible();await page.getByRole('button',{name:'Week',exact:true}).click();await page.getByRole('button',{name:'Today',exact:true}).click();
 await controls(page,()=>page.getByRole('combobox',{name:'Courses',exact:true}).selectOption('all'));
 await expect(page.locator('.day-heading')).toHaveCount(5);
 const viewport=page.viewportSize()!;expect(await page.locator('.time-scroll').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);for(const day of await page.locator('.day-heading').all()){const b=await day.boundingBox();expect(b!.x).toBeGreaterThanOrEqual(0);expect(b!.x+b!.width).toBeLessThanOrEqual(viewport.width);}
 const calendar=await page.locator('.calendar-panel').boundingBox();if(info.project.name==='chromium'){expect(calendar!.y).toBeLessThan(220);expect(calendar!.height).toBeGreaterThan(viewport.height*.75);}
 await page.screenshot({path:`artifacts/${info.project.name}-week-v2.png`,fullPage:false});
 await page.getByRole('button',{name:'Day',exact:true}).click();const card=page.locator('.overlap-lanes .event-card').first();await card.click();await expect(page.getByRole('dialog')).toContainText('Official source');await expect(page.getByRole('dialog').getByText('Room',{exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await expect(card).toBeFocused();
 await page.screenshot({path:`artifacts/${info.project.name}-day-v2.png`,fullPage:false});
});
test('GDB exports by default without holidays; cancelled groups and malformed links',async({page})=>{
 await list(page,'gdb');await page.getByRole('button',{name:'Add GDB · Gruppe 03',exact:true}).click();await controls(page,()=>page.getByRole('button',{name:'Export calendar'}).click());await expect(page.getByRole('checkbox',{name:/Include.*provisional/})).toHaveCount(0);await expect(page.getByRole('button',{name:'Download .ics'})).toBeEnabled();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download .ics'}).click();const download=await pending;const body=await fs.readFile((await download.path())!,'utf8');expect(body).toContain('UID:gdb-03-');expect(body).toContain('STATUS:CONFIRMED');expect(body).not.toContain('TENTATIVE');expect(body).not.toMatch(/DTSTART:202612(?:2[4-9]|3[01])|DTSTART:2027010[1-6]/);await page.keyboard.press('Escape');
 await list(page,'its');await expect(page.getByRole('button',{name:'Add IT Security · Group 13',exact:true})).toBeDisabled();await page.goto('./#plan=bad');await expect(page.locator('.notice[role=status]')).toContainText('invalid');
});
test('320px layout, root assets and malformed initial share preserve saved plan',async({page})=>{
 await page.setViewportSize({width:320,height:800});await list(page,'all');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
 await page.getByRole('button',{name:'Add GBS · Mi-1400-A',exact:true}).click();await page.goto('./#plan=invalid');await page.reload();await expect(page.locator('.notice[role=status]')).toContainText('invalid');await controls(page,()=>expect(page.getByRole('button',{name:/^My plan/})).toContainText('1'));await expect(page.getByText('Shared preview',{exact:true})).toHaveCount(0);
 const assets=await page.locator('script[src],link[rel=stylesheet]').evaluateAll(es=>es.map(e=>e.getAttribute('src')||e.getAttribute('href')));expect(assets.length).toBeGreaterThan(0);expect(assets.every(a=>a?.startsWith('/assets/'))).toBe(true);
});
test('range updates calendar and assembly-conflict details remain accessible',async({page})=>{
 await list(page,'its');await page.locator('.slot-summary').filter({hasText:'IT Security · Group 16'}).click();await page.getByText('Dates & exceptions',{exact:true}).click();await expect(page.getByRole('dialog')).toContainText('FVV: teaching is suspended in Garching from 10:00 to 11:30');await expect(page.getByRole('dialog').getByRole('checkbox').first()).toBeDisabled();await page.keyboard.press('Escape');
 await controls(page,()=>page.getByRole('button',{name:'Schedule dates & exclusions'}).click());await page.getByLabel('Schedule start').fill('2027-01-11');await page.getByRole('button',{name:'Apply dates'}).click();await page.getByRole('button',{name:'Week',exact:true}).click();await expect(page.getByRole('heading',{name:'11 Jan – 17 Jan 2027',exact:true})).toBeVisible();await expect(page.locator('.event-card:visible,.event-group:visible,.mobile-overlap:visible').first()).toBeVisible();
});
test('course, search and type filters restore on a later visit; reset is guarded',async({page,context})=>{
 await list(page,'ana');await page.getByRole('button',{name:'Add Analysis · Group 11',exact:true}).click();await controls(page,()=>page.getByRole('textbox',{name:'Search courses, tutors or rooms'}).fill('Matei'));await controls(page,()=>page.getByRole('combobox',{name:'Session type'}).selectOption('Tutorial'));
 const later=await context.newPage();await later.goto('./');await controls(later,()=>expect(later.getByRole('combobox',{name:'Courses',exact:true})).toHaveValue('ana'));await controls(later,()=>expect(later.getByRole('textbox',{name:'Search courses, tutors or rooms'})).toHaveValue('Matei'));await controls(later,()=>expect(later.getByRole('combobox',{name:'Session type'})).toHaveValue('Tutorial'));await controls(later,()=>expect(later.getByRole('button',{name:/^My plan/})).toContainText('1'));
 await controls(later,()=>later.getByRole('button',{name:'Schedule dates & exclusions'}).click());await later.getByRole('button',{name:'Reset saved plan',exact:true}).click();await later.getByRole('button',{name:'Keep saved plan'}).click();await later.keyboard.press('Escape');await controls(later,()=>expect(later.getByRole('button',{name:/^My plan/})).toContainText('1'));
 await controls(later,()=>later.getByRole('button',{name:'Schedule dates & exclusions'}).click());await later.getByRole('button',{name:'Reset saved plan',exact:true}).click();await later.getByRole('button',{name:'Reset plan and filters',exact:true}).click();await later.reload();await controls(later,()=>expect(later.getByRole('combobox',{name:'Courses',exact:true})).toHaveValue('gbs'));await controls(later,()=>expect(later.getByRole('textbox',{name:'Search courses, tutors or rooms'})).toHaveValue(''));await controls(later,()=>expect(later.getByRole('combobox',{name:'Session type'})).toHaveValue('all'));await controls(later,()=>expect(later.getByRole('button',{name:/^My plan/})).toContainText('0'));
});
test('corrupt storage and unavailable storage leave the planner usable',async({page,context})=>{
 await page.evaluate(()=>{localStorage.setItem('studyplan:v1','bad');localStorage.setItem('studyplan:preferences:v1','{"course":"invalid"}');});await page.reload();await expect(page.locator('.notice[role=status]')).toContainText('could not be loaded');await controls(page,()=>expect(page.getByRole('button',{name:/^My plan/})).toContainText('0'));
 const isolated=await context.browser()!.newContext();await isolated.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Unavailable','SecurityError');}});});const blocked=await isolated.newPage();await blocked.goto(page.url());await list(blocked);await blocked.getByRole('button',{name:'Add GBS · Mi-1400-A',exact:true}).click();await expect(blocked.locator('.notice[role=status]')).toContainText('storage is unavailable');await controls(blocked,()=>expect(blocked.getByRole('button',{name:'Share',exact:true})).toBeEnabled());await isolated.close();
});

test('portrait week fits five aligned weekdays and scrolls vertically with sticky dates',async({page},info)=>{
 await expect(page.getByRole('button',{name:'Week',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:`artifacts/${info.project.name}-default-week.png`});
 await controls(page,()=>page.getByRole('combobox',{name:'Courses',exact:true}).selectOption('all'));
 for(const width of [320,390,768,1024]){
  await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const scroll=page.locator('.time-scroll');expect(await scroll.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  const headings=await page.locator('.day-heading').all();const columns=await page.locator('.day-column').all();
  for(let i=0;i<5;i++){const h=(await headings[i].boundingBox())!,c=(await columns[i].boundingBox())!;expect(h.x).toBeCloseTo(c.x,0);expect(h.width).toBeCloseTo(c.width,0);expect(h.x+h.width).toBeLessThanOrEqual(width);}
  if(width<=900){
   expect(await scroll.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);
   const before=(await headings[0].boundingBox())!;await scroll.evaluate(e=>e.scrollTop=e.scrollHeight);
   expect((await headings[0].boundingBox())!.y).toBeCloseTo(before.y,0);
   const lastHour=(await page.locator('.hours span').last().boundingBox())!,bounds=(await scroll.boundingBox())!;expect(lastHour.y+lastHour.height).toBeLessThanOrEqual(bounds.y+bounds.height+1);
   await scroll.evaluate(e=>e.scrollTop=0);
   const crowded=page.locator('.mobile-overlap:visible').first();expect((await crowded.boundingBox())!.width).toBeGreaterThan(44);
   await crowded.click();await expect(page.getByRole('button',{name:'Day',exact:true})).toHaveAttribute('aria-pressed','true');
   const option=page.locator('.overlap-lanes .event-card:visible').first();await option.click();await expect(page.getByRole('dialog')).toContainText('Official source');await page.keyboard.press('Escape');await expect(option).toBeFocused();
   await page.getByRole('button',{name:'Week',exact:true}).click();
  }else expect(await scroll.evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);
  if(width===390){await scroll.evaluate(e=>e.scrollTop=160);await page.screenshot({path:`artifacts/${info.project.name}-mobile-week.png`});}
 }
});

test('desktop keeps the full day fitted; mobile Day has readable vertical spacing',async({page})=>{
 for(const viewport of [{width:1440,height:1000},{width:1024,height:768},{width:390,height:844},{width:320,height:800}]){
  await page.setViewportSize(viewport);
  for(const view of ['Day','Week']){
   await page.getByRole('button',{name:view,exact:true}).click();const grid=page.locator('.time-scroll');
   expect(await grid.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
   expect(await grid.evaluate(e=>e.scrollHeight>e.clientHeight+1)).toBe(viewport.width<=900);
  }
 }
});

test('mobile month fits the screen and opens a day',async({page})=>{
 await page.setViewportSize({width:320,height:800});await page.getByRole('button',{name:'Month',exact:true}).click();
 expect(await page.locator('.month-scroll').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
 await page.locator('.month-date').nth(10).click();await expect(page.getByRole('button',{name:'Day',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('overlapping sessions have separate clickable lanes inside their time box',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 await controls(page,()=>page.getByRole('combobox',{name:'Courses',exact:true}).selectOption('all'));await page.getByRole('button',{name:'Week',exact:true}).click();
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
 await controls(page,()=>page.getByRole('combobox',{name:'Courses',exact:true}).selectOption('its'));
 await page.getByRole('button',{name:'Add IT Security · Group 16',exact:true}).click();
 await page.reload();await controls(page,()=>expect(page.getByRole('button',{name:/^My plan/})).toContainText('3'));
 await controls(page,()=>page.getByRole('button',{name:'Export calendar'}).click());const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download .ics'}).click();const download=await pending;
 const body=await fs.readFile((await download.path())!,'utf8');expect(body).toContain('NUM · Group 04a');expect(body).toContain('LOCATION:Online');expect(body).toContain('UID:its-16-');
 await page.keyboard.press('Escape');await controls(page,()=>page.getByRole('combobox',{name:'Courses',exact:true}).selectOption('num'));await page.getByRole('button',{name:'Week',exact:true}).click();
 await page.screenshot({path:`artifacts/${info.project.name}-numprog.png`});
});

test('selected tutorials stay as translucent context across filters without covering candidates',async({page},info)=>{
 await list(page,'its');await page.getByRole('button',{name:'Add IT Security · Group 16',exact:true}).click();
 await controls(page,()=>page.getByRole('combobox',{name:'Courses',exact:true}).selectOption('num'));
 await controls(page,()=>page.getByRole('button',{name:'Find tutorials',exact:true}).click());
 await page.getByRole('button',{name:'Day',exact:true}).click();
 const saved=page.locator('.event-card[data-slot-id="its-16"]');
 await expect(saved).toHaveCount(1);await expect(saved).toHaveClass(/selected-context/);
 await expect(saved).toHaveAccessibleName(/Selected in my plan/);await expect(saved).toHaveCSS('opacity','0.5');
 const options=page.locator('.event-card:not(.selected-context)');expect(await options.count()).toBeGreaterThan(0);
 const overlap=page.locator('.event-card.plan-overlap:not(.selected-context)').first();await expect(overlap).toBeVisible();
 const a=(await saved.boundingBox())!,b=(await overlap.boundingBox())!;expect(a.x+a.width<=b.x+.5||b.x+b.width<=a.x+.5).toBe(true);
 await overlap.click();await expect(page.getByRole('dialog')).toContainText('Overlaps your plan: ITS · Group 16');await page.keyboard.press('Escape');
 await page.screenshot({path:`artifacts/${info.project.name}-selected-context.png`});
 await controls(page,()=>page.getByRole('textbox',{name:'Search courses, tutors or rooms'}).fill('no matching tutor'));await expect(saved).toHaveCount(1);await expect(options).toHaveCount(0);
 await controls(page,()=>page.getByRole('combobox',{name:'Session type'}).selectOption('Lecture'));await expect(saved).toHaveCount(1);
 await controls(page,()=>page.getByRole('button',{name:'Clear search'}).click());await controls(page,()=>page.getByRole('combobox',{name:'Session type'}).selectOption('all'));
 await controls(page,()=>page.getByRole('combobox',{name:'Courses',exact:true}).selectOption('its'));await expect(saved).toHaveCount(1);
 await controls(page,()=>page.getByRole('button',{name:/^My plan/}).click());await expect(saved).not.toHaveClass(/selected-context/);await expect(page.locator('.event-card')).toHaveCount(1);
});

test('mobile controls keep Today beside the views and provide full touch targets',async({page},info)=>{
 for(const width of [320,390,430,768]){
  await page.setViewportSize({width,height:844});
  const today=page.getByRole('button',{name:'Today',exact:true});
  const month=page.getByRole('button',{name:'Month',exact:true});
  const a=(await today.boundingBox())!,b=(await month.boundingBox())!;
  expect(a.x+a.width).toBeLessThanOrEqual(b.x);
  expect(Math.abs(a.y+a.height/2-b.y-b.height/2)).toBeLessThan(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  if(width<=700){
   await controls(page,async()=>{
   for(const button of await page.locator('.main-actions button,.sidebar-nav-link,.sidebar-grip,.course-legend button,.range-button').all()){
    const box=(await button.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);expect(box.x+box.width).toBeLessThanOrEqual(width);
    expect(await button.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
   }
   const select=page.getByRole('combobox',{name:'Session type'});await select.selectOption('Help session');
   expect(await select.evaluate(e=>{const el=e as HTMLSelectElement,s=getComputedStyle(el),ctx=document.createElement('canvas').getContext('2d')!;ctx.font=`${s.fontSize} ${s.fontFamily}`;return ctx.measureText(el.selectedOptions[0].text).width+parseFloat(s.paddingLeft)+parseFloat(s.paddingRight)<=el.clientWidth;})).toBe(true);
   await select.selectOption('all');
   });
  }
  await page.getByRole('button',{name:'Next period'}).click();await today.click();
  await expect(page.getByRole('heading',{name:'2 Nov – 8 Nov 2026',exact:true})).toBeVisible();
  if(width===320||width===390)await page.screenshot({path:`artifacts/${info.project.name}-controls-${width}.png`});
 }
});


test('sidebar keeps controls on the left, supports keyboard sorting and restores drawer focus',async({page},info)=>{
 await page.setViewportSize({width:1440,height:1000});
 const sidebar=page.getByRole('complementary',{name:'Planner controls'});
 await expect(sidebar).toBeVisible();
 const a=(await sidebar.boundingBox())!,b=(await page.locator('.calendar-panel').boundingBox())!;
 expect(a.x).toBe(0);expect(a.x+a.width).toBeLessThanOrEqual(b.x);
 await expect(sidebar.getByRole('button',{name:'Share',exact:true})).toBeInViewport();
 await expect(sidebar.getByRole('button',{name:'Export calendar',exact:true})).toBeInViewport();
 const handle=page.getByRole('button',{name:'Reorder Find tutorials',exact:true});
 await handle.focus();await page.keyboard.press('Space');
 await expect(handle).toHaveAttribute('aria-pressed','true');
 // KeyboardSensor attaches its key listener on the next timer tick.
 await page.clock.runFor(32);await page.keyboard.press('ArrowDown');await page.clock.runFor(32);
 await expect(page.locator('[id^=DndLiveRegion]')).toContainText('over droppable area mine');
 await page.keyboard.press('Space');
 await expect(page.locator('.sidebar-nav-link').first()).toContainText('My plan');
 await page.getByRole('button',{name:'Find tutorials',exact:true}).click();
 await expect(page.getByRole('button',{name:'Find tutorials',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:`artifacts/${info.project.name}-sidebar-desktop.png`});
 await page.setViewportSize({width:390,height:844});
 const toggle=page.getByRole('button',{name:'Open planner controls'});
 await toggle.click();await expect(page.getByRole('dialog',{name:'Planner controls'})).toBeVisible();
 expect((await page.locator('.sidebar-drawer').boundingBox())!.x).toBe(0);
 await page.screenshot({path:`artifacts/${info.project.name}-sidebar-drawer.png`});
 await page.keyboard.press('Escape');await expect(toggle).toBeFocused();
 await toggle.click();await page.getByRole('button',{name:'Slot list',exact:true}).click();
 await expect(page.locator('.catalogue')).toBeVisible();await expect(page.locator('.sidebar-drawer')).toHaveCount(0);
 await expect(toggle).toBeFocused();
 await toggle.click();await page.getByRole('button',{name:'Share',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Share your schedule'})).toBeVisible();
 await page.keyboard.press('Escape');await expect(toggle).toBeFocused();
});
