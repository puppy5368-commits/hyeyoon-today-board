// Isolated browser contexts + simulated Supabase. Never accesses a real account.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
const BASE=process.env.BOARD_TEST_URL||'http://127.0.0.1:4173';
const MAIN='heeyoon-today-board:v1',PLANS='heeyoon-today-board:daily-plans:v1';
const USER='11111111-1111-4111-8111-111111111111';
let anonymousSequence=0;
const SUBJECTS=['heeyoon-literacy-board:v1','heeyoon-literacy-board:v2','heeyoon-english-board:v1','heeyoon-history-progress'];
const stamp=()=>new Date().toISOString();
const jwt=(id=USER)=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test-signature'].join('.');
const user={id:USER,aud:'authenticated',role:'authenticated',email:'family@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:stamp()};
const session=(id=USER)=>({access_token:jwt(id),refresh_token:'test-only-refresh',token_type:'bearer',expires_in:3600,user:{...user,id,is_anonymous:id!==USER}});
const tables={board_preferences:[],task_schedules:[],daily_plans:[],task_records:[]};
const writes=[];let failWrites=false,failReads=false,conflictNext=false;
const rejectedTaskIds=new Set();
const pk={board_preferences:['user_id'],task_schedules:['user_id','task_id'],daily_plans:['user_id','plan_date'],task_records:['user_id','record_date','task_id']};
async function network(route){
 const request=route.request(),url=new URL(request.url()),method=request.method();
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS','Content-Type':'application/json'};
 const respond=(status,body)=>route.fulfill({status,headers,body:JSON.stringify(body)});
 if(method==='OPTIONS')return respond(200,{});
 if(url.pathname==='/auth/v1/signup'){
  const value=session('22222222-2222-4222-8222-'+String(++anonymousSequence).padStart(12,'0'));
  return respond(200,value);
 }
 if(url.pathname==='/rest/v1/rpc/heeyoon_family_owner')return respond(200,USER);
 if(url.pathname==='/auth/v1/token'){
  const body=request.postDataJSON();if(body.password==='incorrect')return respond(400,{code:'invalid_credentials',msg:'Invalid login credentials'});
  return respond(200,session());
 }
 if(url.pathname==='/auth/v1/user')return respond(200,user);
 if(url.pathname==='/auth/v1/logout')return respond(200,{});
 const table=url.pathname.split('/').pop();assert(tables[table],`Unexpected table ${table}`);
 const matches=row=>[...url.searchParams].every(([key,value])=>!value.startsWith('eq.')||String(row[key])===value.slice(3));
 if(method==='GET'){
  if(failReads)return respond(503,{message:'test offline'});
  return respond(200,tables[table].filter(matches));
 }
 writes.push({table,method,body:request.postDataJSON()});
 if(rejectedTaskIds.has(request.postDataJSON().task_id))return respond(422,{code:'23514',message:'mock task_id check failure'});
 if(failWrites)return respond(503,{message:'test write failure'});
 const body=request.postDataJSON();
 if(method==='POST'){
  if(tables[table].some(row=>pk[table].every(k=>row[k]===body[k])))return respond(409,{code:'23505',message:'duplicate'});
  const defaults=table==='task_records'?{plan_time:null,start_at:null,done_at:null,book_type:null,book_title:null}:{};
  const row={...defaults,...body,revision:1,created_at:stamp(),updated_at:stamp()};tables[table].push(row);return respond(201,[row]);
 }
 if(method==='PATCH'){
  if(conflictNext){conflictNext=false;const target=tables[table].find(matches);if(target){target.revision++;target.first_start_time='19:00';}return respond(200,[]);}
  const row=tables[table].find(matches);if(!row)return respond(200,[]);
  if(body.revision!==row.revision+1)return respond(400,{code:'40001',message:'revision conflict'});
  Object.assign(row,body,{updated_at:stamp()});return respond(200,[row]);
 }
 throw Error('DELETE is not allowed');
}
async function waitFor(fn,label){for(let n=0;n<100;n++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Timeout: '+label);}
if(require.main===module)(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});const errors=[];
 async function open(seed={},configured=true){
  const ctx=await browser.newContext({viewport:{width:375,height:812},timezoneId:'Asia/Seoul'});
  await ctx.route('https://test-project.supabase.co/**',network);
  if(configured)await ctx.route('**/supabase-config.js',r=>r.fulfill({contentType:'text/javascript',body:"window.HEEYOON_SUPABASE_CONFIG={projectUrl:'https://test-project.supabase.co',publishableKey:'sb_publishable_test_only'};"}));
  else await ctx.route('**/supabase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.HEEYOON_SUPABASE_CONFIG={};'}));
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE);await page.evaluate(seed=>{for(const [k,v] of Object.entries(seed))localStorage.setItem(k,v);},seed);await page.reload();
  return {ctx,page};
 }
 async function login(page){await page.locator('#boardApp').waitFor({state:'visible'});await waitFor(async()=>(await page.locator('#syncStatus').innerText()).includes('동기화됨')||(await page.locator('#syncStatus').innerText()).includes('달라요')||(await page.locator('#syncStatus').innerText()).includes('실패'),'initial sync');}
 const legacy={version:1,settings:{bookGoal:2,taskDays:{qt:[0,1,2,3,4,5,6],reading:[0,1,2,3,4,5,6]}},days:{'2026-08-01':{tasks:{reading:{bookTitle:'그램 원본',startAt:'2026-08-01T07:00:00Z',doneAt:'2026-08-01T07:20:00Z',bookType:'text'}}}}};
 const planLegacy={version:1,days:{'2026-08-01':{firstStartTime:'16:30',taskOrder:['reading'],deadline:'20:00',updatedAt:'2026-08-01T06:00:00Z'}}};
 const seed={[MAIN]:JSON.stringify(legacy),[PLANS]:JSON.stringify(planLegacy),...Object.fromEntries(SUBJECTS.map(k=>[k,'untouched-sentinel']))};
 try{
  const {page:a}=await open(seed);
  assert(await a.locator('#boardApp').isVisible());assert.equal(await a.locator('input[type=password],#loginPanel,#recoveryPanel').count(),0);
  await login(a);assert.equal(writes.length,0,'no automatic imports');
  assert.equal(await a.evaluate(k=>localStorage.getItem(k),MAIN),seed[MAIN]);assert.equal(await a.evaluate(k=>localStorage.getItem(k),PLANS),seed[PLANS]);
  await a.locator('[data-first-time="16:30"]').click();await a.locator('#saveDailyPlan').click();await waitFor(()=>tables.daily_plans.length===1,'plan insert');
  assert.equal(tables.daily_plans[0].first_start_time,'16:30');assert.equal(tables.daily_plans[0].revision,1);
  assert.equal(tables.task_records.length,0,'historical tasks not uploaded');assert.equal(tables.board_preferences.length,0,'defaults not uploaded');assert.equal(tables.task_schedules.length,0);
  assert.deepEqual(JSON.parse(await a.evaluate(k=>localStorage.getItem(k),MAIN)),legacy);
  const {ctx:contextB,page:b}=await open();await login(b);assert(await b.getByText('첫 시작',{exact:false}).count());assert((await b.locator('#dailyPlan').innerText()).includes('16:30'));
  const mission=a.locator('.mission').filter({has:a.getByRole('heading',{name:'큐티',exact:true})});await mission.locator('[data-done]').click();
  await waitFor(()=>tables.task_records.some(r=>r.task_id==='qt'&&r.done_at),'task complete');
  await b.locator('#syncButton').click();await waitFor(async()=>await b.locator('.mission.done').filter({has:b.getByRole('heading',{name:'큐티',exact:true})}).count()===1,'cross-device completion');
  await a.locator('[data-view="settings"]').click();await a.locator('#bookGoal').selectOption('3');await waitFor(()=>tables.board_preferences[0]?.book_goal===3,'preferences');
  await a.locator('.day-toggle[data-id="qt"][data-day="1"]').click();await waitFor(()=>tables.task_schedules[0]?.task_id==='qt','schedule');
  failWrites=true;await a.locator('#bookGoal').selectOption('1');await waitFor(async()=>(await a.locator('#syncStatus').innerText()).includes('실패'),'write failure status');
  assert.equal(JSON.parse(await a.evaluate(k=>localStorage.getItem(k),MAIN)).settings.bookGoal,1);assert.equal(tables.board_preferences[0].book_goal,3);
  await a.reload();await a.locator('#boardApp').waitFor({state:'visible'});assert.equal(JSON.parse(await a.evaluate(k=>localStorage.getItem(k),MAIN)).settings.bookGoal,1,'pending retained across reload');
  failWrites=false;await a.locator('#syncButton').click();await waitFor(()=>tables.board_preferences[0].book_goal===1,'persistent outbox retry');
  await b.locator('#syncButton').click();await waitFor(async()=>JSON.parse(await b.evaluate(k=>localStorage.getItem(k),MAIN)).settings.bookGoal===1,'new preference on device B');
  await contextB.setOffline(true);await b.locator('[data-view="settings"]').click();await b.locator('#bookGoal').selectOption('2');
  assert.equal(JSON.parse(await b.evaluate(k=>localStorage.getItem(k),MAIN)).settings.bookGoal,2);assert.equal(tables.board_preferences[0].book_goal,1);
  assert((await b.locator('#syncStatus').innerText()).includes('오프라인'));
  await contextB.setOffline(false);await waitFor(()=>tables.board_preferences[0].book_goal===2,'reconnection sends local edit');
  await contextB.setOffline(true);
  for(const goal of ['3','1','3'])await b.locator('#bookGoal').selectOption(goal);
  await contextB.setOffline(false);await waitFor(()=>tables.board_preferences[0].book_goal===3,'ordered offline changes');
  await waitFor(async()=>!(await b.evaluate(()=>Object.keys(localStorage).some(k=>k.includes(':family:v1:op:')))),'all offline changes acknowledged');
  await a.locator('[data-view="today"]').click();await a.locator('#editDailyPlan').click();await a.locator('[data-first-time="17:00"]').click();conflictNext=true;await a.locator('#saveDailyPlan').click();
  await waitFor(async()=>(await a.locator('#syncStatus').innerText()).includes('달라요'),'revision conflict');assert.equal(tables.daily_plans[0].first_start_time,'19:00');
  assert(Object.values(JSON.parse(await a.evaluate(k=>localStorage.getItem(k),PLANS)).days).some(p=>p.firstStartTime==='17:00'),'conflicting local plan kept');
  // A rejected English row must remain recoverable without stopping the next row.
  rejectedTaskIds.add('english');
  await a.locator('[data-view="today"]').click();
  const englishMission=a.locator('[data-task="english"]');
  await englishMission.locator('[data-done]').click();
  await waitFor(async()=>(await a.locator('#syncStatus').innerText()).includes('실패'),'isolated task rejection');
  const readingMission=a.locator('[data-task="reading"]');
  await readingMission.locator('[data-done]').click();
  await waitFor(()=>tables.task_records.some(r=>r.task_id==='reading'&&r.done_at),'later task after rejected row');
  assert(await a.evaluate(()=>Object.keys(localStorage).some(k=>k.includes(':family:v1:op:')&&JSON.parse(localStorage.getItem(k)).pk.task_id==='english')),'rejected row remains queued');
  rejectedTaskIds.delete('english');
  await a.locator('#syncButton').click();
  await waitFor(()=>tables.task_records.some(r=>r.task_id==='english'&&r.done_at),'recovered rejected English row');
  for(const view of ['today','week','record','settings']){await a.locator(`[data-view="${view}"]`).click();assert(await a.locator('#view-'+view).isVisible());}
  assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'375px main layout');
  for(const k of SUBJECTS)assert.equal(await a.evaluate(k=>localStorage.getItem(k),k),'untouched-sentinel');
  assert.equal(await a.evaluate(k=>localStorage.getItem('heeyoon-today-board:sync:v1:original:'+k),MAIN),seed[MAIN],'immutable original backup');
  await a.screenshot({path:path.join(os.tmpdir(),'heeyoon-cloud-main.png'),fullPage:true});
  const {page:c}=await open({...seed,[MAIN]:JSON.stringify({...legacy,settings:{...legacy.settings,bookGoal:2}})});await login(c);assert.equal(JSON.parse(await c.evaluate(k=>localStorage.getItem(k),MAIN)).settings.bookGoal,2,'legacy conflict is not overwritten');
  assert.equal(JSON.parse(await c.evaluate(k=>localStorage.getItem(k),MAIN)).days['2026-08-01'].tasks.reading.bookTitle,'그램 원본');
  const {page:broken}=await open({[MAIN]:'not-json'});const writeCount=writes.length;await login(broken);await broken.locator('[data-view="settings"]').click();await broken.locator('#bookGoal').selectOption('1');
  assert.equal(await broken.evaluate(k=>localStorage.getItem(k),MAIN),'not-json','invalid local source preserved');assert.equal(writes.length,writeCount);
  const {page:unconfigured}=await open({},false);assert(await unconfigured.locator('#boardApp').isVisible());assert.equal(await unconfigured.locator('#loginPanel').count(),0);
  assert.deepEqual(errors,[],'no uncaught page errors, even with invalid local data');
  console.log('PASS: isolated Supabase simulation A-J, rejected English row isolation/retry, 375px, exact PK/revision writes, no legacy uploads, local failure/reload retry, conflict protection, anonymous shared family, original backup, subject keys unchanged.');
  console.log('Screenshot: '+path.join(os.tmpdir(),'heeyoon-cloud-main.png'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={network,session};
