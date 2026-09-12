// Real bundled Supabase SDK, isolated browser, simulated auth API only.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {network,session}=require('./test-cloud.cjs');
const BASE=process.env.BOARD_TEST_URL||'http://127.0.0.1:4173';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const ctx=await browser.newContext({viewport:{width:375,height:812}});
  let updates=0,changedPassword='',fail=false;const errors=[],logs=[];
  await ctx.route('**/supabase-config.js',r=>r.fulfill({contentType:'text/javascript',body:"window.HEEYOON_SUPABASE_CONFIG={projectUrl:'https://test-project.supabase.co',publishableKey:'sb_publishable_test_only'};"}));
  await ctx.route('https://test-project.supabase.co/**',async r=>{
   const req=r.request(),url=new URL(req.url());
   if(url.pathname==='/auth/v1/user'&&req.method()==='PUT'){
    updates++;if(fail)return r.fulfill({status:422,contentType:'application/json',body:JSON.stringify({message:'Rejected password'})});
    changedPassword=req.postDataJSON().password;
    return r.fulfill({contentType:'application/json',body:JSON.stringify(session().user)});
   }
   if(url.pathname==='/auth/v1/token'&&changedPassword){
    assert.equal(req.postDataJSON().password,changedPassword);
   }
   return network(r);
  });
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>logs.push(m.text()));
  await page.goto(BASE);await page.locator('#loginButton:enabled').waitFor();
  assert(await page.locator('#loginPanel').isVisible());
  const s=session(),fragment=new URLSearchParams({access_token:s.access_token,refresh_token:s.refresh_token,token_type:'bearer',expires_in:'3600',type:'recovery'});
  await page.goto(BASE+'/?recovery-test=1#'+fragment);
  await page.locator('#recoveryPanel').waitFor({state:'visible'});
  assert(!(await page.locator('#boardApp').isVisible()));assert(!(await page.locator('#loginPanel').isVisible()));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#newPassword').fill('new-test-password-123');await page.locator('#confirmPassword').fill('different-password');await page.locator('#recoverySave').click();
  await page.getByText('두 비밀번호가 달라요. 다시 확인해 주세요.').waitFor();assert.equal(updates,0);
  fail=true;await page.locator('#confirmPassword').fill('new-test-password-123');await page.locator('#recoverySave').click();
  await page.getByText('비밀번호를 변경하지 못했어요.',{exact:false}).waitFor();assert(await page.locator('#recoveryPanel').isVisible());
  fail=false;await page.locator('#newPassword').fill('new-test-password-123');await page.locator('#confirmPassword').fill('new-test-password-123');await page.locator('#recoverySave').click();
  await page.getByText('비밀번호가 변경되었어요',{exact:true}).waitFor();assert.equal(updates,2);
  assert(!(await page.locator('#boardApp').isVisible()),'USER_UPDATED cannot bypass recovery');
  assert.equal(await page.locator('#newPassword').inputValue(),'');
  assert(!(await page.evaluate(()=>JSON.stringify(localStorage))).includes(changedPassword));assert(!logs.some(m=>m.includes(changedPassword)));
  await page.locator('#recoveryContinue').click();await page.locator('#boardApp').waitFor({state:'visible'});
  await page.locator('[data-view="settings"]').click();
  await page.locator('#logoutButton').click();await page.locator('#loginPanel').waitFor({state:'visible'});
  await page.locator('#loginEmail').fill('family@example.invalid');await page.locator('#loginPassword').fill(changedPassword);await page.locator('#loginButton').click();
  await page.locator('#boardApp').waitFor({state:'visible'});await page.reload();await page.locator('#boardApp').waitFor({state:'visible'});
  assert(await page.locator('#recoveryPanel').isHidden());assert.deepEqual(errors,[]);
  console.log('PASS: recovery URL/event, board gate, mismatch no request, API failure retry, updateUser success, USER_UPDATED gate, password cleared/not stored/logged, continue, logout/new-password login, normal session reload, 375px. Simulated auth API; no real account changed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
