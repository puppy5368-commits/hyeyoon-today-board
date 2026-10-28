const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {network,session}=require('./test-cloud.cjs');
const catalog=require('../math-schedule.js');
const MAIN='heeyoon-today-board:v1',BASE=process.env.BOARD_TEST_URL||'http://127.0.0.1:4173';
const first=catalog.items[0].id,second=catalog.items[1].id,old=catalog.items.find(x=>x.pages==='114~115').id;
const seed={version:1,settings:{bookGoal:2,taskDays:{didimdolMath:[1,3,5]}},days:{
 '2026-10-26':{tasks:{didimdolMath:{startAt:'2026-10-26T06:00:00Z',doneAt:'2026-10-26T06:20:00Z'},english:{doneAt:'2026-10-26T06:30:00Z'}}},
 '2026-10-28':{tasks:{didimdolMath:{startAt:'2026-10-28T06:00:00Z',doneAt:'2026-10-28T06:20:00Z'}}}
}};
(async()=>{
 assert.equal(catalog.items.length,60);assert.equal(new Set(catalog.items.map(x=>x.id)).size,60);
 assert.deepEqual(catalog.items.filter(x=>x.week===9).map(x=>x.unit),[4,4,5,5,5]);
 assert.deepEqual(catalog.items.filter(x=>x.week===11).map(x=>x.unit),[5,5,6,6,6]);
 assert(!catalog.validDate('2026-02-30'));assert(!catalog.validDate('26-10-28'));assert(catalog.validDate('2028-02-29'));
 const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];
 async function open(width,initial){
  const ctx=await browser.newContext({viewport:{width,height:900},timezoneId:'Asia/Seoul'});
  await ctx.route('https://test-project.supabase.co/**',network);
  await ctx.route('**/supabase-config.js',r=>r.fulfill({contentType:'text/javascript',body:"window.HEEYOON_SUPABASE_CONFIG={projectUrl:'https://test-project.supabase.co',publishableKey:'sb_publishable_test_only'};"}));
  await ctx.addInitScript(({s,initial,MAIN})=>{if(!localStorage.getItem('heeyoon-today-board:auth:v1'))localStorage.setItem('heeyoon-today-board:auth:v1',JSON.stringify(s));if(initial&&!localStorage.getItem(MAIN))localStorage.setItem(MAIN,JSON.stringify(initial));},{s:{...session(),expires_at:Math.floor(Date.now()/1000)+3600},initial,MAIN});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-28T20:00:00+09:00')});await page.goto(BASE);await page.locator('#boardApp').waitFor();return {ctx,page};
 }
 const waitSync=page=>page.waitForFunction(()=>document.getElementById('syncStatus').textContent.includes('동기화됨'));
 const state=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),MAIN);
 const schedule=async(page,id)=>{await page.locator('[data-view=week]').click();const row=page.locator('[data-schedule-id="'+id+'"]');await row.evaluate(e=>e.closest('details').open=true);return row;};
 const today=page=>page.locator('[data-task=didimdolMath]');
 try{
  const {ctx,page:a}=await open(375,seed);await waitSync(a);
  assert.equal(await today(a).locator('[data-assignment]').count(),1);assert((await today(a).innerText()).includes('6~9쪽'));
  assert.equal(await today(a).locator('[data-math-step=solve]').getAttribute('aria-pressed'),'false','old today completion is not inherited');
  assert.equal(catalog.record(await state(a),catalog.items.find(x=>x.id===old)).date,null);
  const r=await schedule(a,second);await r.locator('input').fill('2026-10-28');await r.locator('input').dispatchEvent('change');await waitSync(a);
  await a.locator('[data-view=today]').click();assert.equal(await today(a).locator('[data-assignment]').count(),2);
  const part=id=>today(a).locator('[data-assignment="'+id+'"]');
  await part(first).locator('[data-math-step=solve]').click();await part(first).locator('[data-math-step=review]').click();await waitSync(a);
  assert(!(await today(a).getAttribute('class')).includes('done'),'one of two does not complete mission');
  await part(second).locator('[data-math-step=solve]').click();await part(second).locator('[data-math-step=review]').click();await waitSync(a);
  assert((await today(a).getAttribute('class')).includes('done'));
  const before=await state(a);assert.deepEqual(before.days,seed.days,'legacy and other tasks byte-equivalent');
  const {page:b}=await open(1280);await waitSync(b);assert.equal(await today(b).locator('[data-math-step][aria-pressed=true]').count(),4,'second device pulls all progress');
  let row=await schedule(a,first);await row.locator('input').fill('2027-01-02');await row.locator('input').dispatchEvent('change');await waitSync(a);
  let moved=await state(a);assert.equal(moved.mathAssignments[first].date,'2027-01-02');assert.equal(moved.mathAssignments[second].date,'2026-10-28');assert.equal(moved.mathAssignments[first].doneAt,before.mathAssignments[first].doneAt);
  await b.locator('#syncButton').click();await b.waitForFunction(({MAIN,first})=>JSON.parse(localStorage.getItem(MAIN)).mathAssignments[first].date==='2027-01-02',{MAIN,first});
  row=await schedule(a,first);await row.locator('[data-clear]').click();await waitSync(a);assert.equal((await state(a)).mathAssignments[first].date,null);assert.equal((await state(a)).mathAssignments[first].doneAt,before.mathAssignments[first].doneAt);
  await a.reload();await waitSync(a);row=await schedule(a,first);assert((await row.innerText()).includes('날짜 미정'));
  const {page:c}=await open(375);await waitSync(c);assert.equal((await state(c)).mathAssignments[first].date,null,'fresh device respects cleared initial date');
  await ctx.setOffline(true);row=await schedule(a,second);await row.locator('input').fill('2026-10-29');await row.locator('input').dispatchEvent('change');assert.equal((await state(a)).mathAssignments[second].date,'2026-10-29');
  await ctx.setOffline(false);await a.locator('#syncButton').click();await waitSync(a);await b.locator('#syncButton').click();await b.waitForFunction(({MAIN,second})=>JSON.parse(localStorage.getItem(MAIN)).mathAssignments[second].date==='2026-10-29',{MAIN,second});
  for(const page of [a,b]){await page.locator('[data-view=week]').click();await page.locator('#mathSchedule details').evaluateAll(es=>es.forEach(e=>e.open=true));assert.equal(await page.locator('[data-schedule-id]').count(),60);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await a.screenshot({path:require('path').join(require('os').tmpdir(),'math-v2-mobile.png'),fullPage:true});await b.screenshot({path:require('path').join(require('os').tmpdir(),'math-v2-desktop.png'),fullPage:true});
  assert.deepEqual((await state(a)).days,seed.days);assert.deepEqual(errors,[]);
  console.log('PASS math V2: 60 assignments, mixed weeks, exact years, independent dates, two-step multiple tasks, legacy preservation, reload, offline recovery, two-device sync, 375/1280px.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
