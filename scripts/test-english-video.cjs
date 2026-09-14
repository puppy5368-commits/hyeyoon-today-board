const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const {network} = require('./test-cloud.cjs');
const MAIN = 'heeyoon-today-board:v1', PLANS = 'heeyoon-today-board:daily-plans:v1';
const BASE = process.env.BOARD_TEST_URL || 'http://127.0.0.1:4173';
const subjects = ['heeyoon-english-board:v1','heeyoon-english-board:v2','heeyoon-literacy-board:v1','heeyoon-literacy-board:v2','heeyoon-history-progress'];
const legacy = {version:1,settings:{bookGoal:2,taskDays:{english:[2,4,6]}},days:{'2025-01-01':{tasks:{reading:{doneAt:'2025-01-01T08:00:00Z',bookTitle:'기존 기록'}}}}};
const wait = async fn => { for(let i=0;i<160;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Timed out'); };
(async()=>{
 const browser = await chromium.launch({headless:true,channel:'msedge'});
 const errors = [], writes = [];
 try {
  async function open(seed=false){
   const context=await browser.newContext({viewport:{width:375,height:812},timezoneId:'Asia/Seoul'});
   await context.route('**/supabase-config.js',r=>r.fulfill({contentType:'text/javascript',body:"window.HEEYOON_SUPABASE_CONFIG={projectUrl:'https://test-project.supabase.co',publishableKey:'sb_publishable_test_only'};"}));
   await context.route('https://test-project.supabase.co/**',r=>{if(['POST','PATCH'].includes(r.request().method()))writes.push({url:r.request().url(),body:r.request().postDataJSON()});return network(r);});
   // Verify popup navigation without loading third-party media or analytics.
   for(const url of ['https://storylineonline.net/','https://www.youtube.com/@EnglishSingsing','https://www.youtube.com/@PeppaPigOfficial'])await context.route(url,r=>r.fulfill({contentType:'text/html',body:'Official destination test'}));
   if(seed)await context.addInitScript(({MAIN,legacy,subjects})=>{if(!sessionStorage.seeded){localStorage.setItem(MAIN,JSON.stringify(legacy));subjects.forEach(k=>localStorage.setItem(k,'preserve'));sessionStorage.seeded='yes';}},{MAIN,legacy,subjects});
   const page=await context.newPage();
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await page.clock.install({time:new Date('2026-09-14T15:00:00+09:00')});
   await page.goto(BASE);await page.locator('.mission').first().waitFor();
   return {page,context};
  }
  const {page}=await open(true);
  const settled=p=>wait(async()=>(await p.locator('#syncStatus').innerText()).includes('동기화됨'));
  await settled(page);
  assert.equal(writes.filter(w=>!w.url.includes('/auth/')&&!w.url.includes('/rpc/')).length,0,'no automatic legacy uploads');
  for(let offset=0;offset<7;offset++){
   await page.clock.setSystemTime(new Date(`2026-09-${14+offset}T15:00:00+09:00`));await page.reload();
   assert.equal(await page.locator('[data-task="englishVideo"]').count(),[0,2,4].includes(offset)?1:0);
   assert.equal(await page.locator('[data-task="english"]').count(),[1,3,5].includes(offset)?1:0);
  }
  await page.clock.setSystemTime(new Date('2026-09-14T15:00:00+09:00'));await page.reload();await settled(page);
  await page.getByRole('button',{name:'영어 영상 10분 위로',exact:true}).click();
  await page.locator('[data-first-time="16:30"]').click();await page.locator('#saveDailyPlan').click();await settled(page);
  const plan=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),PLANS);
  assert.equal(plan.days['2026-09-14'].firstStartTime,'16:30');assert.equal(plan.days['2026-09-14'].taskOrder.at(-2),'englishVideo');
  const mission=page.locator('[data-task="englishVideo"]');
  await mission.locator('[data-start]').click();
  const dialog=page.getByRole('dialog',{name:'🎬 오늘은 뭐 볼까?'});
  assert(await dialog.isVisible());assert.equal(await page.context().pages().length,1);
  const started=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).days['2026-09-14'].tasks.englishVideo.startAt,MAIN);
  for(const url of ['https://storylineonline.net/','https://www.youtube.com/@EnglishSingsing','https://www.youtube.com/@PeppaPigOfficial']){
   const link=dialog.locator(`a[href="${url}"]`);assert.equal(await link.getAttribute('target'),'_blank');
   const popupPromise=page.waitForEvent('popup');await link.click();const popup=await popupPromise;await popup.waitForLoadState();assert.equal(popup.url(),url);await popup.close();
  }
  assert(await dialog.isVisible());
  await page.screenshot({path:path.join(require('node:os').tmpdir(),'english-video-mobile.png')});
  assert(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth));
  await dialog.locator('[data-close]').click();await page.reload();await mission.locator('[data-start]').click();
  assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).days['2026-09-14'].tasks.englishVideo.startAt,MAIN),started,'reopen preserves first start');
  await dialog.getByRole('button',{name:'다른 영어 영상 봤어요',exact:true}).click();
  assert.equal(await dialog.locator('[data-other]').getAttribute('aria-pressed'),'true');
  await dialog.getByRole('button',{name:'🎬 오늘 영어 영상 봤어요!',exact:true}).click();await settled(page);
  assert(await mission.evaluate(e=>e.classList.contains('done')));
  await page.reload();await settled(page);assert(await mission.evaluate(e=>e.classList.contains('done')));
  const state=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),MAIN);
  assert.deepEqual(state.days['2025-01-01'],legacy.days['2025-01-01']);
  const record=state.days['2026-09-14'].tasks.englishVideo;
  assert(record.doneAt);assert.equal(record.startAt,started);
  assert(Object.keys(record).every(k=>['planTime','startAt','doneAt','bookType','bookTitle'].includes(k)),'no video tracking or score fields');
  for(const k of subjects)assert.equal(await page.evaluate(k=>localStorage.getItem(k),k),'preserve');
  await page.locator('[data-view="record"]').click();assert((await page.locator('#recordList').innerText()).includes('영어 영상 10분'));
  await page.locator('[data-view="week"]').click();
  for(let offset=0;offset<7;offset++){
   await page.locator(`[data-date="2026-09-${14+offset}"]`).click();
   const text=await page.locator('#weekDetail').innerText();assert.equal(text.includes('영어 영상 10분'),[0,2,4].includes(offset));
   if(offset===0)assert((await page.locator('#weekDetail li').filter({hasText:'영어 영상 10분'}).innerText()).includes('✓ 완료'));
  }
  await page.locator('.english-board-link a').click();await page.waitForURL('**/english/v2.html');assert(await page.getByText('희윤이의 작은 가게').count());await page.goBack();
  await page.locator('[data-view="settings"]').click();
  await page.locator('[data-id="englishVideo"][data-day="1"]').click();
  await page.locator('[data-id="englishVideo"][data-day="2"]').click();await settled(page);
  assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).settings.taskDays.english,MAIN),[2,4,6]);
  assert(writes.some(w=>w.body.task_id==='englishVideo'&&w.body.start_at));
  assert(writes.some(w=>w.body.done_at));
  const second=await open();await settled(second.page);
  assert.equal(await second.page.locator('[data-task="englishVideo"]').count(),0,'changed schedule synced to second device');
  const secondState=await second.page.evaluate(k=>JSON.parse(localStorage.getItem(k)),MAIN);
  assert.equal(secondState.days['2026-09-14'].tasks.englishVideo.doneAt,record.doneAt);
  assert.deepEqual([...secondState.settings.taskDays.englishVideo].sort(),[2,3,5]);
  assert((await second.page.locator('#dailyPlan').innerText()).includes('16:30'));
  await page.reload();await page.locator('[data-view="settings"]').click();
  assert.equal(await page.locator('[data-id="englishVideo"][data-day="2"]').getAttribute('class'),'day-toggle on');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log('PASS: all 7 weekdays, video selection, three new-tab destinations, self-reported completion, reopen/reload, legacy preservation, plan order/time, week, independent schedules, two-device mock Supabase sync, V2 link, 375px, no console errors.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
