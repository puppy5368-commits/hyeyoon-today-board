const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const KEY='heeyoon-english-board:v2';
const preview=process.env.ENGLISH_V2_PREVIEW_DIR||path.join(os.tmpdir(),'heeyoon-english-v2-preview');
fs.mkdirSync(preview,{recursive:true});
const mockSDK=String.raw`
window.__cloudRows={};window.__cloudWrites=[];window.__authCalls=0;
window.supabase={createClient(){return {
 auth:{async getSession(){return {data:{session:null}}},async signInAnonymously(){window.__authCalls++;return {data:{session:{user:{id:'anonymous'}}}}},onAuthStateChange(){}},
 async rpc(name){if(name!=='heeyoon_family_owner')throw Error('unexpected RPC');return {data:'11111111-1111-1111-1111-111111111111'}},
 from(table){if(table!=='english_progress')throw Error('unexpected table');let mode='select',payload,filters={};
 const query={select(){return query},eq(k,v){filters[k]=v;return query},insert(v){mode='insert';payload=structuredClone(v);return query},update(v){mode='update';payload=structuredClone(v);return query},then(resolve,reject){
 let result;if(mode==='select')result={data:Object.values(window.__cloudRows).filter(r=>Object.entries(filters).every(([k,v])=>r[k]===v))};
 else if(mode==='insert'){if(window.__cloudRows[payload.session_key])result={error:{code:'23505'}};else{window.__cloudRows[payload.session_key]=payload;window.__cloudWrites.push(payload);result={data:[payload]}}}
 else {const row=window.__cloudRows[filters.session_key];if(!row||!Object.entries(filters).every(([k,v])=>row[k]===v))result={data:[]};else{Object.assign(row,payload);window.__cloudWrites.push(structuredClone(row));result={data:[row]}}}
 return Promise.resolve(structuredClone(result)).then(resolve,reject);
 }};return query;}
}}};
`;
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  for(const width of [375,1280]){
   const context=await browser.newContext({viewport:{width,height:width===375?812:900}});
   const page=await context.newPage(),errors=[],external=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   await page.route('**/*',route=>{
    const url=route.request().url();
    if(!url.startsWith('http://127.0.0.1:4173/')){external.push(url);return route.abort();}
    if(url.endsWith('/vendor/supabase.js'))return route.fulfill({contentType:'text/javascript',body:mockSDK});
    return route.continue();
   });
   await page.addInitScript(()=>{
    window.__voiceMode='english';window.__spoken=[];
    Object.defineProperty(window,'speechSynthesis',{value:{
     getVoices(){return window.__voiceMode==='english'?[{lang:'ko-KR',name:'Korean'},{lang:'en-GB',name:'English UK'},{lang:'en-US',name:'English US'}]:window.__voiceMode==='british'?[{lang:'en-GB',name:'English UK'}]:[{lang:'ko-KR',name:'Korean'}]},
     speak(u){window.__spoken.push({text:u.text,lang:u.lang,voice:u.voice?.name})},cancel(){},addEventListener(){}
    }});
    window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
   });
   await page.goto('http://127.0.0.1:4173/english/v2.html');
   assert.equal(await page.locator('#week-select option').count(),12);
   await page.waitForFunction(()=>window.__authCalls===1);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('#begin').click();
   const choice=page.locator('[data-choice="0"]');
   await choice.click();assert.equal(await choice.getAttribute('aria-pressed'),'true');
   await choice.click();assert.equal(await choice.getAttribute('aria-pressed'),'false');
   assert(await page.locator('[data-action="check"]').isDisabled());
   await page.locator('[data-choice="1"]').click();await page.locator('[data-action="check"]').click();
   assert(await page.locator('[data-action="hint"]').isEnabled());
   await page.locator('[data-action="hint"]').click();assert((await page.locator('.feedback').textContent()).includes('🔎'));
   await page.locator('[data-choice="0"]').click();await page.locator('[data-action="check"]').click();
   let saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
   assert.equal(saved.weeks[1].sessions.A.items[0].firstCorrect,false);
   assert.equal(saved.weeks[1].sessions.A.items[0].attempts.length,2);
   assert.equal(saved.weeks[1].sessions.A.items[0].hintUsed,true);
   await page.locator('[data-section="B"]').click();await page.locator('#begin').click();
   assert.equal(await page.locator('.english').textContent(),'🔊 듣기를 먼저 눌러보세요');
   await page.locator('[data-action="listen"]').click();
   assert.equal(await page.locator('.english').textContent(),'🔊 듣기를 먼저 눌러보세요');
   await page.locator('[data-action="relisten"]').click();
   saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
   assert.equal(saved.weeks[1].sessions.B.items[0].relistenCount,1);
   assert.deepEqual(await page.evaluate(()=>window.__spoken.map(x=>x.voice)),['English US','English US']);
   await page.evaluate(()=>window.__voiceMode='korean');
   await page.locator('[data-action="listen"]').click();assert((await page.locator('#tts-notice').textContent()).includes('英'.replace('英','영어 음성이')));
   assert.equal(await page.evaluate(()=>window.__spoken.length),2);
   await page.evaluate(()=>{window.__savedUtterance=window.SpeechSynthesisUtterance;window.SpeechSynthesisUtterance=undefined;});
   await page.locator('[data-action="listen"]').click();assert((await page.locator('#tts-notice').textContent()).includes('지원하지'));
   assert.equal(await page.evaluate(()=>window.__spoken.length),2);
   await page.evaluate(()=>{window.SpeechSynthesisUtterance=window.__savedUtterance;window.__voiceMode='british';});
   await page.locator('[data-action="listen"]').click();assert.equal(await page.evaluate(()=>window.__spoken.at(-1).lang),'en-GB');
   await page.evaluate(()=>window.__voiceMode='english');
   await page.locator('#week-select').selectOption('2');
   const pending=await page.evaluate(key=>JSON.parse(localStorage.getItem(key+':cloud:conflicts')||'{}'),KEY);
   assert.deepEqual(pending,{},'Uncontended learning must never report a conflict');
   await page.screenshot({path:path.join(preview,'english-v2-'+width+'.png'),fullPage:true});
   // Complete A/B/C without forcing a starting order. Includes all content/choices.
   for(const s of ['B','C','A']){
    await page.locator('[data-section="'+s+'"]').click();await page.locator('#begin').click();
    const items=await page.evaluate(s=>window.ENGLISH_V2_WEEKS[2][s].items,s);
    for(let i=0;i<items.length;i++){
     if(s==='C'){
      if(items[i].stage==='solo')assert(!(await page.locator('.english').textContent()).includes(items[i].text));
      if(items[i].choices)await page.locator('[data-choice]').first().click();
      if(i===0){await page.locator('[data-action="listen"]').click();await page.locator('[data-action="help"]').click();await page.getByRole('button',{name:'편했어요',exact:true}).click();}
      await page.locator('[data-action="'+(i===1?'skip':'spoken')+'"]').click();
     }else{
      if(s==='B')await page.locator('[data-action="listen"]').click();
      await page.locator('[data-choice="'+items[i].answer+'"]').click();
      await page.locator('[data-action="check"]').click();
     }
    }
    assert((await page.locator('#study h2').textContent()).includes({A:'읽기',B:'듣기',C:'말하기'}[s]+' 완료'));
    if(s!=='A')assert.equal(await page.locator('.week-complete').count(),0);
   }
   assert.equal(await page.locator('.week-complete').textContent(),'🎉 2주차 완료!');
   await page.waitForFunction(()=>['A','B','C'].every(s=>window.__cloudRows['week:2:'+s]?.value.completedAt));
   await page.locator('#next-week').click();assert((await page.locator('#week-title').textContent()).includes('3주차'));
   for(let w=1;w<=12;w++){
    await page.locator('#week-select').selectOption(String(w));
    assert((await page.locator('#week-title').textContent()).includes(w+'주차'));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   }
   await page.locator('summary').click();
   assert(await page.getByText('1주차와 12주차 참고 기록',{exact:true}).count());
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   // Seed an old completed state only in this isolated browser, then verify automatic week 2.
   const old={version:1,week:1,sessions:{A:{items:{0:{firstCorrect:true}},completedAt:'2026-09-01'},B:{items:{0:{relistenCount:2}},completedAt:'2026-09-02'},C:{items:{0:{spoken:true}},completedAt:'2026-09-03'}}};
   await page.evaluate(({key,old})=>{localStorage.clear();localStorage.setItem(key,JSON.stringify(old,null,2));localStorage.setItem('heeyoon-english-board:v1','keep-v1')},{key:KEY,old});
   await page.reload();await page.waitForFunction(()=>window.__authCalls===1);
   assert((await page.locator('#week-title').textContent()).includes('2주차'));
   assert.equal(await page.evaluate(()=>window.__cloudWrites.length),0);
   await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForFunction(()=>window.__authCalls===2);
   await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.waitForFunction(()=>window.__authCalls===3);
   assert.equal(await page.evaluate(()=>window.__cloudWrites.length),0);
   assert.equal(await page.evaluate(key=>localStorage.getItem(key+':pre-weeks-backup'),KEY),JSON.stringify(old,null,2));
   assert.equal(await page.evaluate(()=>localStorage.getItem('heeyoon-english-board:v1')),'keep-v1');
   await page.locator('#week-select').selectOption('1');await page.locator('#begin').click();
   await page.locator('[data-action="listen"]').click();
   assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).weeks[1].sessions,KEY),old.sessions);
   await page.locator('summary').click();await page.locator('#compare').click();
   await page.waitForFunction(()=>document.getElementById('migration-result').textContent.includes('클라우드 세션 0'));
   assert.equal(await page.evaluate(()=>window.__cloudWrites.length),0);
   const download=page.waitForEvent('download');await page.locator('#backup').click();assert((await download).suggestedFilename().includes('backup'));
   await page.locator('#migrate').click();await page.waitForFunction(()=>window.__cloudWrites.length===3);
   assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
   console.log('PASS: '+width+'px, week navigation/completion, choice toggle/retry/hint, B transcript hidden/relisten, English TTS/no Korean fallback, C feeling/help/skip, parent comparison/backup/explicit migration, no live requests or console errors.');
   await context.close();
  }
  console.log('Previews: '+preview);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
