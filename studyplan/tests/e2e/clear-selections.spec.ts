import {test,expect,type Page} from '@playwright/test';
async function openClear(page:Page){
 const toggle=page.getByRole('button',{name:'Open planner controls'});
 if(await toggle.isVisible())await toggle.click();
 await page.getByRole('button',{name:'Clear selections',exact:true}).click();
}
test.beforeEach(async({page})=>{
 await page.clock.install({time:new Date('2026-11-04T10:30:00Z')});
 await page.addInitScript(()=>{
  if(!localStorage.getItem('qa:seeded')){
   localStorage.setItem('studyplan:v1',JSON.stringify({version:1,selected:['its-16','its-17'],excluded:[],from:'2026-10-28',to:'2027-02-05'}));
   localStorage.setItem('studyplan:tutor-week:v1',JSON.stringify({week:'2026-11-02',visited:['its-16-2026-11-04'],hidden:['num'],restored:[]}));
   localStorage.setItem('qa:seeded','yes');
  }
 });
 await page.goto('./');
});
test('daily and weekly deletion require confirmation and persist without removing future weeks',async({page},info)=>{
 const before=await page.evaluate(()=>localStorage.getItem('studyplan:v1'));
 await openClear(page);
 await expect(page.getByLabel('Clear scope')).toHaveValue('daily');
 expect((await page.getByLabel('Clear scope').boundingBox())!.height).toBeGreaterThanOrEqual(44);
 await expect(page.getByLabel('Clear date')).toHaveValue('2026-11-04');
 await page.getByRole('button',{name:'Review deletion'}).click();
 await expect(page.getByRole('button',{name:'Keep selections'})).toBeFocused();
 await page.getByRole('button',{name:'Keep selections'}).click();
 expect(await page.evaluate(()=>localStorage.getItem('studyplan:v1'))).toBe(before);
 await openClear(page);
 await page.getByRole('button',{name:'Review deletion'}).click();
 await page.screenshot({path:`artifacts/${info.project.name}-clear-confirm.png`,scale:'css'});
 await page.getByRole('button',{name:'Confirm deletion'}).click();
 await page.reload();
 const daily=await page.evaluate(()=>JSON.parse(localStorage.getItem('studyplan:v1')!));
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('studyplan:tutor-week:v1')!).visited)).toEqual([]);
 expect(daily.selected).toEqual(['its-16','its-17']);
 expect(daily.excluded).toEqual(['its-16-2026-11-04','its-17-2026-11-04']);
 await openClear(page);
 await expect(page.getByRole('button',{name:'Review deletion'})).toBeDisabled();
 await page.getByLabel('Clear scope').selectOption('weekly');
 await page.getByLabel('Clear date').fill('2026-11-11');
 await page.screenshot({path:`artifacts/${info.project.name}-clear-options.png`,scale:'css'});
 await page.getByRole('button',{name:'Review deletion'}).click();
 await expect(page.getByRole('dialog')).toContainText('9 Nov – 15 Nov 2026');
 await page.getByRole('button',{name:'Confirm deletion'}).click();
 const weekly=await page.evaluate(()=>JSON.parse(localStorage.getItem('studyplan:v1')!));
 expect(weekly.excluded).toContain('its-16-2026-11-11');
 expect(weekly.excluded).not.toContain('its-16-2026-11-18');
});
test('all selections clear only after confirmation, leaving filters and date range',async({page})=>{
 await openClear(page);
 await page.getByLabel('Clear scope').selectOption('all');
 await page.getByRole('button',{name:'Review deletion'}).click();
 await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('studyplan:v1')!).selected.length)).toBe(2);
 await openClear(page);
 await page.getByLabel('Clear scope').selectOption('all');
 const prefs=await page.evaluate(()=>localStorage.getItem('studyplan:preferences:v1'));
 await page.getByRole('button',{name:'Review deletion'}).click();
 await page.getByRole('button',{name:'Confirm deletion'}).click();
 await page.reload();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('studyplan:v1')!))).toEqual({version:1,selected:[],excluded:[],from:'2026-10-28',to:'2027-02-05'});
 expect(await page.evaluate(()=>localStorage.getItem('studyplan:preferences:v1'))).toBe(prefs);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('studyplan:tutor-week:v1')!))).toEqual({week:'2026-11-02',visited:[],hidden:['num'],restored:[]});
});
test('clearing a shared preview leaves the device plan and private visits intact',async({page})=>{
 const before=await page.evaluate(()=>[localStorage.getItem('studyplan:v1'),localStorage.getItem('studyplan:tutor-week:v1')]);
 await page.goto('./#plan='+encodeURIComponent(JSON.stringify({version:1,selected:['its-17'],excluded:[],from:'2026-10-28',to:'2027-02-05'})));
 await openClear(page);
 await page.getByLabel('Clear scope').selectOption('all');
 await page.getByRole('button',{name:'Review deletion'}).click();
 await page.getByRole('button',{name:'Confirm deletion'}).click();
 expect(await page.evaluate(()=>[localStorage.getItem('studyplan:v1'),localStorage.getItem('studyplan:tutor-week:v1')])).toEqual(before);
 await openClear(page);
 await page.getByLabel('Clear scope').selectOption('all');
 await expect(page.getByRole('button',{name:'Review deletion'})).toBeDisabled();
});
