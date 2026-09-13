// Actual browser SDK + isolated mock API. Never reads a personal browser profile.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {network,session}=require('./test-cloud.cjs');
const MAIN='heeyoon-today-board:v1',PLANS='heeyoon-today-board:daily-plans:v1';
const PREFIX='heeyoon-today-board:sync:v1:',AUTH='heeyoon-today-board:auth:v1';
const OWNER='11111111-1111-4111-8111-111111111111';
const SUBJECTS=['heeyoon-literacy-board:v1','heeyoon-literacy-board:v2','heeyoon-english-board:v1','heeyoon-history-progress'];
const BASE=process.env.BOARD_TEST_URL||'http://127.0.0.1:4173';
const legacy={version:1,settings:{bookGoal:2,taskDays:{}},days:{'2025-01-01':{tasks:{reading:{bookTitle:'보존할 원본',doneAt:'2025-01-01T07:00:00Z'}}}}};
const wait=async(fn,label)=>{for(let n=0;n<160;n++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error(label);};
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const errors=[];let sequence=0;
 try{
  async function open({failAuth=false,holdAuth=false,configured=true,failRpc=false,seed={}}={}){
   const ctx=await browser.newContext({viewport:{width:375,height:812},timezoneId:'Asia/Seoul'});
   const control={failAuth,failRpc,signups:0,writes:[],release:null};
   const held=holdAuth?new Promise(resolve=>control.release=resolve):Promise.resolve();
   const id='22222222-2222-4222-8222-'+String(++sequence).padStart(12,'0');
   await ctx.route('**/supabase-config.js',r=>r.fulfill({contentType:'text/javascript',body:configured?"window.HEEYOON_SUPABASE_CONFIG={projectUrl:'https://test-project.supabase.co',publishableKey:'sb_publishable_test_only'};":"window.HEEYOON_SUPABASE_CONFIG={};"}));
   await ctx.route('https://test-project.supabase.co/**',async r=>{
    const req=r.request(),u=new URL(req.url());
    const reply=(status,value)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
    if(u.pathname==='/auth/v1/signup'){
     control.signups++;await held;
     return control.failAuth?reply(422,{msg:'Anonymous sign-ins disabled'}):reply(200,session(id));
    }
    if(u.pathname==='/rest/v1/rpc/heeyoon_family_owner'&&control.failRpc)return reply(403,{message:'not configured'});
    if(u.pathname.startsWith('/rest/v1/')&&!u.pathname.includes('/rpc/')){
     if(req.method()==='POST'){assert.equal(req.postDataJSON().user_id,OWNER);}
     else assert.equal(u.searchParams.get('user_id'),'eq.'+OWNER,'all reads/updates target canonical family');
     if(['POST','PATCH'].includes(req.method()))control.writes.push(req.postDataJSON());
    }
    return network(r);
   });
   await ctx.addInitScript(seed=>{if(!sessionStorage.getItem('test-seeded')){for(const [k,v]of Object.entries(seed))localStorage.setItem(k,v);sessionStorage.setItem('test-seeded','yes');}},seed);
   const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(BASE);await page.locator('.mission').first().waitFor();
   assert(await page.locator('#boardApp').isVisible());
   assert.equal(await page.locator('input[type=email],input[type=password],#loginPanel,#recoveryPanel,#logoutButton').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   return {ctx,page,control,id};
  }
  const settled=page=>wait(async()=>(await page.locator('#syncStatus').innerText()).includes('동기화됨'),'sync settled');
  const a=await open({holdAuth:true});
  await a.page.locator('[data-first-time="16:30"]').click();await a.page.locator('#saveDailyPlan').click();
  assert(await a.page.evaluate(k=>localStorage.getItem(k),PLANS),'save before authentication');
  assert.equal(a.control.writes.length,0);a.control.release();await settled(a.page);
  const b=await open();await settled(b.page);
  assert.notEqual(a.id,b.id);assert.notEqual(a.id,OWNER);
  assert((await b.page.locator('#dailyPlan').innerText()).includes('16:30'));
  const record=a.page.locator('.mission').filter({has:a.page.getByRole('heading',{name:'큐티',exact:true})});
  await record.locator('[data-done]').click();await settled(a.page);await b.page.locator('#syncButton').click();
  await wait(async()=>await b.page.locator('.mission.done').filter({has:b.page.getByRole('heading',{name:'큐티',exact:true})}).count()===1,'device B sees device A record');
  await a.page.reload();await settled(a.page);assert.equal(a.control.signups,1,'reuse anonymous session');
  // Authentication failure still allows settings, plans, and task records to persist.
  const seed={[MAIN]:JSON.stringify(legacy),...Object.fromEntries(SUBJECTS.map(k=>[k,'untouched']))};
  const c=await open({failAuth:true,seed});await c.page.locator('[data-view="settings"]').click();await c.page.locator('#bookGoal').selectOption('3');
  assert.equal(JSON.parse(await c.page.evaluate(k=>localStorage.getItem(k),MAIN)).settings.bookGoal,3);
  await c.page.reload();assert(await c.page.locator('#boardApp').isVisible());
  assert.deepEqual(JSON.parse(await c.page.evaluate(k=>localStorage.getItem(k),MAIN)).days,legacy.days);
  c.control.failAuth=false;await c.page.locator('#syncButton').click();
  await wait(()=>c.control.writes.some(w=>w.book_goal===3),'queued failed-auth edit uploaded');
  for(const k of SUBJECTS)assert.equal(await c.page.evaluate(k=>localStorage.getItem(k),k),'untouched');
  assert.equal(await c.page.evaluate(k=>localStorage.getItem(k),PREFIX+'original:'+MAIN),seed[MAIN]);
  // Missing DB migration and missing configuration both fall back without erasing data.
  for(const options of [{failRpc:true},{configured:false}]){
   const d=await open({...options,seed});await d.page.locator('[data-view="settings"]').click();await d.page.locator('#bookGoal').selectOption('1');
   assert.equal(JSON.parse(await d.page.evaluate(k=>localStorage.getItem(k),MAIN)).settings.bookGoal,1);
   assert.deepEqual(JSON.parse(await d.page.evaluate(k=>localStorage.getItem(k),MAIN)).days,legacy.days);
  }
  // Old account queue and baselines are copied, not lost; retry sends the pending edit.
  const oldKey=PREFIX+OWNER+':op:old-pending';
  const op={id:'task_records/2025-02-02/reading',table:'task_records',pk:{record_date:'2025-02-02',task_id:'reading'},patch:{book_title:'이전 대기 기록'},before:{},expected:{},at:1,revision:null};
  const e=await open({seed:{...seed,[PREFIX+'owner']:OWNER,[oldKey]:JSON.stringify(op)}});
  await wait(()=>e.control.writes.some(w=>w.book_title==='이전 대기 기록'),'old queue imported');
  assert.equal(await e.page.evaluate(k=>localStorage.getItem(k),oldKey),JSON.stringify(op),'old queue archived');
  await wait(async()=>!(await e.page.evaluate(k=>localStorage.getItem(k),PREFIX+'family:v1:op:old-pending')),'new queue acknowledged');
  await e.page.reload();await new Promise(r=>setTimeout(r,200));
  assert.equal(await e.page.evaluate(k=>localStorage.getItem(k),PREFIX+'family:v1:op:old-pending'),null,'no reimport after reload');
  // Invalid local JSON must never be overwritten, even though the board opens.
  const f=await open({configured:false,seed:{[MAIN]:'invalid-original'}});
  await f.page.locator('[data-view="settings"]').click();await f.page.locator('#bookGoal').selectOption('3');
  assert.equal(await f.page.evaluate(k=>localStorage.getItem(k),MAIN),'invalid-original');
  assert.equal(await a.page.evaluate(k=>JSON.parse(localStorage.getItem(k)).user.is_anonymous,AUTH),true);
  assert.deepEqual(errors,[]);
  await a.page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'heeyoon-anonymous-mobile.png'),fullPage:true});
  console.log('PASS: no auth UI; immediate board/375px; distinct anonymous identities share family; delayed/failed auth local saves; session reuse; local queue retry; missing config/RPC fallback; immutable backups/history/subject keys; old queue migration; invalid JSON protection. Mock API only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
