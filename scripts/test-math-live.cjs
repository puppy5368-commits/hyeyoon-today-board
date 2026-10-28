// Read-only browser verification against the configured family backend.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  for(const width of [375,1280]){
   const ctx=await browser.newContext({viewport:{width,height:900},timezoneId:'Asia/Seoul'}),page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   // Reading family rows is allowed. Never write study records during live QA.
   await ctx.route('**/rest/v1/**',route=>{const req=route.request();if(req.method()!=='GET'&&!req.url().includes('/rpc/heeyoon_family_owner'))throw Error('Unexpected live write');return route.continue();});
   await page.goto(process.env.BOARD_TEST_URL||'http://127.0.0.1:4174');
   await page.waitForFunction(()=>document.getElementById('syncStatus').textContent.includes('동기화됨'),{},{timeout:45000});
   const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('heeyoon-today-board:v1')));
   const remote=await page.evaluate(async()=>{const r=await window.boardCloud.migrationClient().from('math_assignments').select('assignment_id');if(r.error)throw r.error;return r.data.length;});
   assert.equal(remote,60);
   assert.equal(state.mathAssignments['didimdol-4-2-u1-p6-9'].date,'2026-10-28');
   assert.equal(await page.evaluate(()=>MathSchedule.record(JSON.parse(localStorage.getItem('heeyoon-today-board:v1')),MathSchedule.items.find(x=>x.pages==='114~115')).date),null);
   await page.screenshot({path:require('path').join(require('os').tmpdir(),'math-live-today-'+width+'.png')});
   await page.locator('[data-view=week]').click();await page.locator('#mathSchedule details').first().locator('summary').click();
   assert.equal(await page.locator('[data-schedule-id]').count(),60);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:require('path').join(require('os').tmpdir(),'math-live-schedule-'+width+'.png')});
   assert.deepEqual(errors,[]);await ctx.close();
  }
  console.log('PASS live Supabase: two isolated device sessions read 60 assignments, correct today/undated pages, no study-record writes, mobile/PC.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
