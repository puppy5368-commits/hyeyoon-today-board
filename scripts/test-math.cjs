// Playwright regression: Didimdol math is a two-stage task, not one-click completion.
// Run after "node scripts/serve.cjs"; uses the isolated Supabase mock (not production).
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {network,session}=require('./test-cloud.cjs');

const MAIN='heeyoon-today-board:v1';
const BASE=process.env.BOARD_TEST_URL||'http://127.0.0.1:4173';

(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const ctx=await browser.newContext({viewport:{width:375,height:812},timezoneId:'Asia/Seoul'});
 const errors=[];
 try{
  await ctx.route('https://test-project.supabase.co/**',network);
  await ctx.route('**/supabase-config.js',r=>r.fulfill({
   contentType:'text/javascript',
   body:"window.HEEYOON_SUPABASE_CONFIG={projectUrl:'https://test-project.supabase.co',publishableKey:'sb_publishable_test_only'};"
  }));
  await ctx.addInitScript(s=>localStorage.setItem('heeyoon-today-board:auth:v1',JSON.stringify(s)),{
   ...session(),expires_at:Math.floor(Date.now()/1000)+3600
  });
  // Seed only this isolated browser context; render alone does not persist defaults.
  // Keep the fixture on reload so the persistence assertions exercise saved changes.
  await ctx.addInitScript(key=>{
   if(localStorage.getItem(key)===null)localStorage.setItem(key,JSON.stringify({
    version:1,settings:{bookGoal:2,taskDays:{didimdolMath:[1,3,5]}},
    days:{'2026-10-18':{tasks:{reading:{doneAt:'2026-10-18T09:00:00.000Z',bookTitle:'fixture'}}}}
   }));
  },MAIN);
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-19T16:00:00+09:00')});
  await page.goto(BASE);
  await page.locator('#boardApp').waitFor({state:'visible'});
  const math=page.locator('[data-task="didimdolMath"]');
  assert.equal(await math.count(),1,'math is scheduled on Monday');
  assert((await math.innerText()).includes('4단원 사각형 · 100~103쪽'));
  assert.equal(await math.locator('[data-math-step]').count(),2);
  assert.equal(await math.locator('[data-math-step="review"]').isDisabled(),true);
  let state=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),MAIN);
  assert.deepEqual(state.settings.taskDays.didimdolMath,[1,3,5]);
  assert.equal(state.days['2026-10-18'].tasks.reading.bookTitle,'fixture');
  const countBefore=await page.locator('#progressText').innerText();

  await math.locator('[data-math-step="solve"]').click();
  state=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),MAIN);
  assert(state.days['2026-10-19'].tasks.didimdolMath.startAt,'solved flag persists in startAt');
  assert.equal(state.days['2026-10-19'].tasks.didimdolMath.doneAt,undefined,'solve alone is not done');
  assert.equal(await page.locator('#progressText').innerText(),countBefore);
  assert.equal(await math.locator('[data-math-step="review"]').isEnabled(),true);

  await math.locator('[data-math-step="review"]').click();
  state=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),MAIN);
  assert(state.days['2026-10-19'].tasks.didimdolMath.doneAt,'review completion persists');
  assert((await math.getAttribute('class')).includes('done'));
  assert.equal(await page.locator('#progressText').innerText(),
   countBefore.replace(/^(\d+)/,v=>String(Number(v)+1)));
  await page.locator('[data-view="record"]').click();
  assert((await page.locator('#recordList').innerText()).includes('디딤돌 초등수학'));
  await page.locator('[data-view="today"]').click();

  await math.locator('[data-math-step="review"]').click();
  state=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),MAIN);
  assert.equal(state.days['2026-10-19'].tasks.didimdolMath.doneAt,null,'review can be undone');
  await math.locator('[data-math-step="review"]').click();
  await math.locator('[data-math-step="solve"]').click();
  state=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),MAIN);
  assert.equal(state.days['2026-10-19'].tasks.didimdolMath.startAt,null);
  assert.equal(state.days['2026-10-19'].tasks.didimdolMath.doneAt,null,'undo solving also resets review');

  await math.locator('[data-math-step="solve"]').click();
  await page.reload();
  await page.locator('[data-task="didimdolMath"] [data-math-step="solve"]').waitFor();
  assert.equal(await page.locator('[data-task="didimdolMath"] [data-math-step="solve"]').getAttribute('aria-pressed'),'true',
   'unfinished first step survives reload');
  await page.clock.setFixedTime(new Date('2026-10-21T16:00:00+09:00'));
  await page.reload();
  const wed=page.locator('[data-task="didimdolMath"]');
  assert((await wed.innerText()).includes('104~107쪽'),'Wednesday uses next pages');
  await page.locator('[data-view="week"]').click();
  assert.equal(await page.locator('.tab').allTextContents().then(x=>x.join(' / ')),'오늘 / 이번 주 / 기록 / 부모설정');
  assert.equal(await page.locator('#weekGrid [data-date]').count(),7);
  await page.locator('[data-date="2026-10-19"]').click();
  assert((await page.locator('#weekDetail').innerText()).includes('디딤돌 초등수학'));
  assert.equal(await page.locator('[class*="calendar"]').count(),0);
  state=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),MAIN);
  assert(state.days['2026-10-19'].tasks.didimdolMath.startAt,'weekly view preserves unfinished math records');
  assert.equal(state.days['2026-10-18'].tasks.reading.bookTitle,'fixture','existing dated records survive saves and reloads');
  await page.setViewportSize({width:1280,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.setViewportSize({width:375,height:812});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: Didimdol schedule, two-stage check, rollback, persistence, weekly view and record preservation and responsive layout.');
 }finally{await ctx.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
