const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {network,session}=require('./test-cloud.cjs');

const MAIN='heeyoon-today-board:v1';
const BASE=process.env.BOARD_TEST_URL||'http://127.0.0.1:4173';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const context=await browser.newContext({viewport:{width:375,height:812},timezoneId:'Asia/Seoul'});
 const errors=[];
 try{
  await context.route('https://test-project.supabase.co/**',network);
  await context.route('**/supabase-config.js',route=>route.fulfill({contentType:'text/javascript',body:"window.HEEYOON_SUPABASE_CONFIG={projectUrl:'https://test-project.supabase.co',publishableKey:'sb_publishable_test_only'};"}));
  await context.addInitScript(value=>localStorage.setItem('heeyoon-today-board:auth:v1',JSON.stringify(value)),{...session(),expires_at:Math.floor(Date.now()/1000)+3600});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.clock.install({time:new Date('2026-10-01T15:00:00+09:00')});
  await page.goto(BASE);await page.locator('#boardApp').waitFor({state:'visible'});
  assert.equal(await page.locator('[data-view="week"]').count(),0);
  assert.equal(await page.locator('[data-view="calendar"]').innerText(),'달력');
  await page.locator('[data-view="calendar"]').click();
  assert.equal(await page.locator('#calendarTitle').innerText(),'2026년 10월');
  assert.equal(await page.locator('.calendar-day').count(),42);
  const todayCell=page.locator('[data-calendar-date="2026-10-01"]');
  assert((await todayCell.getAttribute('class')).includes('today'));
  assert((await todayCell.getAttribute('class')).includes('selected'));
  assert((await todayCell.innerText()).includes('완료 0/7'));
  assert.equal(await todayCell.locator('.calendar-mission').count(),5,'desktop and mobile share the same scheduled missions');
  assert((await todayCell.innerText()).includes('+4개'),'mobile limits the cell preview to three short mission bars');
  assert((await page.locator('#calendarDetail').innerText()).includes('10월 1일 목요일'));
  assert((await page.locator('.calendar-detail-summary').innerText()).startsWith('오늘 할 일 '),'today uses the today-specific detail summary');

  await page.locator('[data-calendar-toggle="gumonKorean"]').click();
  let state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),MAIN);
  assert(state.days['2026-10-01'].tasks.gumonKorean.doneAt,'calendar completion stores the existing doneAt field');
  assert((await todayCell.innerText()).includes('완료 1/7'));
  await page.locator('[data-view="record"]').click();
  assert((await page.locator('#recordList').innerText()).includes('구몬 국어'));
  await page.locator('[data-view="calendar"]').click();await page.locator('[data-calendar-toggle="gumonKorean"]').click();
  state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),MAIN);
  assert.equal(state.days['2026-10-01'].tasks.gumonKorean.doneAt,null,'same calendar checklist item cancels completion');

  await page.locator('[data-view="today"]').click();await page.locator('[data-task="gumonHanja"] [data-done]').click();
  await page.locator('[data-view="calendar"]').click();
  assert((await todayCell.innerText()).includes('완료 1/7'),'today completion appears in the calendar immediately');
  assert.equal(await page.locator('[data-calendar-toggle="gumonHanja"]').getAttribute('aria-pressed'),'true');

  await page.locator('[data-calendar-date="2026-09-30"]').click();
  assert((await page.locator('.calendar-detail-summary').innerText()).startsWith('할 일 '),'past dates omit the today-specific wording');
  await page.locator('[data-calendar-toggle="gumonKorean"]').click();
  state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),MAIN);
  assert(state.days['2026-09-30'].tasks.gumonKorean.doneAt,'past-day checklist can be completed');

  await page.locator('[data-calendar-date="2026-10-02"]').click();
  assert((await page.locator('.calendar-detail-summary').innerText()).startsWith('예정된 할 일 '),'future dates use the planned-task wording');
  assert((await page.locator('#calendarDetail').innerText()).includes('아직 예정된 날이에요'));
  assert.equal(await page.locator('[data-calendar-toggle]').first().isEnabled(),false,'future-day checklist is disabled');

  assert(!(await page.locator('#calendarDetail').innerText()).includes('문해력'),'Friday does not show literacy before its parent setting includes Friday');
  await page.locator('[data-view="settings"]').click();await page.locator('[data-id="literacy"][data-day="5"]').click();
  await page.locator('[data-view="calendar"]').click();await page.locator('[data-calendar-date="2026-10-02"]').click();
  assert((await page.locator('#calendarDetail').innerText()).includes('문해력'),'calendar reads the current parent taskDays setting for literacy');
  await page.locator('[data-view="settings"]').click();await page.locator('[data-id="literacy"][data-day="5"]').click();

  await page.locator('[data-view="settings"]').click();await page.locator('[data-id="english"][data-day="4"]').click();
  await page.locator('[data-view="calendar"]').click();await page.locator('[data-calendar-date="2026-10-01"]').click();
  assert(!(await page.locator('#calendarDetail').innerText()).includes('🇺🇸 영어'),'schedule edits immediately change planned calendar missions');
  await page.locator('[data-view="settings"]').click();await page.locator('[data-id="english"][data-day="4"]').click();
  await page.locator('[data-view="calendar"]').click();await page.locator('[data-calendar-date="2026-10-01"]').click();
  assert.equal(await page.locator('.calendar-board-link[href="./english/v2.html"]').count(),1);
  assert.equal(await page.locator('.calendar-board-link[href="./literacy/"]').count(),1);
  await page.locator('[data-calendar-date="2026-10-02"]').click();
  assert.equal(await page.locator('.calendar-board-link[href="https://heeyoon-history.vercel.app/"]').count(),1);

  await page.locator('#calendarNext').click({timeout:3000});assert.equal(await page.locator('#calendarTitle').innerText({timeout:3000}),'2026년 11월');
  assert.equal(await page.locator('.calendar-day').count(),42);
  assert((await page.locator('[data-calendar-date="2026-12-01"]').getAttribute('class',{timeout:3000})).includes('outside'),'month boundary dates are subdued');
  await page.locator('#calendarPrevious').click({timeout:3000});assert.equal(await page.locator('#calendarTitle').innerText({timeout:3000}),'2026년 10월');
  await page.locator('#calendarPrevious').click({timeout:3000});assert.equal(await page.locator('#calendarTitle').innerText({timeout:3000}),'2026년 9월');
  await page.locator('#calendarToday').click({timeout:3000});assert.equal(await page.locator('#calendarTitle').innerText({timeout:3000}),'2026년 10월');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'375px has no horizontal overflow');
  await page.setViewportSize({width:1280,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'desktop has no horizontal overflow');
  assert((await todayCell.innerText()).includes('구몬 국어'),'desktop shows the fuller mission labels');
  assert.deepEqual(errors,[]);
  console.log('PASS: monthly calendar navigation, boundaries, today/past/future checklist rules, today/record linkage, schedule updates, board links, 375px/1280px, and no console errors.');
 }finally{await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
