const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const data=fs.readFileSync('english/data.js','utf8'),app=fs.readFileSync('english/app.js','utf8');
const KEY='heeyoon-english-board:v1';
const storage=new Map([['heeyoon-today-board:v1','main sentinel'],['heeyoon-literacy-board:v1','v1 sentinel'],['heeyoon-literacy-board:v2','v2 sentinel']]);
function boot(mode='working'){
 const nodes=new Map(),timers=[];const get=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',innerHTML:'',focus(){}});return nodes.get(id);};
 const window={addEventListener(){}};
 if(mode!=='unsupported'){window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};window.speechSynthesis={cancel(){},getVoices(){return[{lang:'en-US'}]},speak(u){if(mode==='throws')throw Error();if(mode==='silent')return;if(mode==='error'){u.onerror({error:'voice-unavailable'});return;}u.onstart();u.onend();}};}
 const context={window,document:{getElementById:get,querySelectorAll(){return[]}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{assert.equal(k,KEY);storage.set(k,v);}},setTimeout:fn=>(timers.push(fn),timers.length),clearTimeout(){},Date};vm.createContext(context);vm.runInContext(data,context);vm.runInContext(app.replace('  render();\n})();','  globalThis.test={act,item,record,render,chooseSession(id){stopAudio();current=id;active=false;render();},state};render();\n})();'),context);return{test:context.test,get,timers,lessons:window.ENGLISH_WEEK};
}
let h=boot();assert(!storage.has(KEY),'landing should not save');assert.deepEqual(h.lessons.map(l=>l.items.length).join(','),'8,7,6');
for(const id of ['A','B','C']){
 h.test.chooseSession(id);h.test.act('begin');const l=h.lessons.find(l=>l.id===id);
 for(let i=0;i<l.items.length;i++){
  const s=h.test.item(),q=l.items[i];
  if(id==='B'){assert(!h.get('study').innerHTML.includes(q.text),'no listening transcript');h.test.act('listen');assert.equal(s.completedPlays,1);if(i===0){h.test.act('listen');assert.equal(s.playCount,2);}}
  if(id==='C'){if(q.choices)s.expressionChoice=q.choices[0][1];if(i===0)h.test.act('help');s.comfort='shy';h.test.act('spoken');assert(s.spoken);assert(s.spokenText);}
  else if(i===0){s.choice=(q.answer+1)%3;h.test.act('check');assert(!s.resolved);h.test.act('next');assert.equal(h.test.item(),s);assert(h.get('study').innerHTML.includes('다시 생각해볼까요'));h.test.act('hint');assert(s.hintUsed);h.test.act('explain');assert(!s.resolved);h.test.act('understood');assert.equal(s.result,'helped');}
  else {s.choice=q.answer;h.test.act('check');assert.equal(s.result,'independent');}
  h.test.act('next');
 }
 assert(h.test.record(id).completedAt);assert(h.get('study').innerHTML.includes('영어 탐험 완료!'));
}
h=boot();for(const id of ['A','B','C'])assert(h.test.record(id).completedAt,'completed record restored');assert.equal(h.test.record('B').items[0].playCount,2);
const completed=storage.get(KEY);storage.delete(KEY);
h=boot();h.test.act('begin');h.test.item().choice=1;h.test.act('check');h.test.act('next');h=boot();h.test.act('begin');assert(h.get('study').innerHTML.includes('book'),'resume first unresolved');storage.delete(KEY);
for(const mode of ['unsupported','throws','error','silent']){h=boot(mode);h.test.chooseSession('B');h.test.act('begin');h.test.act('listen');if(mode==='silent')h.timers.at(-1)();assert(h.test.item().audioUnavailable);assert.equal(h.test.item().playCount,0);h.test.act('skipAudio');assert(h.test.item().skipped);assert.equal(h.test.item().firstCorrect,null);assert(!h.get('study').innerHTML.includes('Apple.'));storage.delete(KEY);}
h=boot();h.test.chooseSession('C');h.test.act('begin');h.test.act('skipSpeaking');assert(!h.test.item().spoken);assert(h.test.item().skipped);storage.delete(KEY);
storage.set(KEY,completed);for(const [key,value] of [['heeyoon-today-board:v1','main sentinel'],['heeyoon-literacy-board:v1','v1 sentinel'],['heeyoon-literacy-board:v2','v2 sentinel']])assert.equal(storage.get(key),value);
console.log('PASS: 8 reading / 7 listening / 6 speaking, full completion, retry/help, resume, play/replay counts, unsupported/throw/error/timeout fallbacks, speaking self-report, original storage keys untouched.');
