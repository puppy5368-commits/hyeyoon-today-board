const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const M=require('../english/english-migration.js');
const Cloud=require('../english/english-cloud.js');
const clone=M.clone;
class Storage {
  constructor(values={}){this.values={...values};this.touched=[];}
  getItem(k){this.touched.push(k);return this.values[k]??null;}
  setItem(k,v){this.touched.push(k);this.values[k]=String(v);}
}
function mock(){
  const db={rows:{},writes:[],fail:false,race:false,reads:0};
  db.client={from(table){assert.equal(table,'english_progress');let mode='select',payload,filters={};
    const query={select(){return query;},eq(k,v){filters[k]=v;return query;},insert(v){mode='insert';payload=clone(v);return query;},update(v){mode='update';payload=clone(v);return query;},then(resolve,reject){
      let result;
      if(db.fail)result={error:{message:'offline'}};
      else if(mode==='select'){db.reads++;result={data:Object.values(db.rows).filter(r=>Object.entries(filters).every(([k,v])=>r[k]===v)).map(clone)};}
      else if(mode==='insert'){
        const key=payload.session_key;if(db.rows[key])result={error:{code:'23505'}};else{db.rows[key]=payload;db.writes.push(clone(payload));result={data:[clone(payload)]};}
      }else{
        const row=db.rows[filters.session_key];if(db.race){row.revision++;db.race=false;}
        if(!row||!Object.entries(filters).every(([k,v])=>row[k]===v))result={data:[]};
        else{Object.assign(row,payload);db.writes.push(clone(row));result={data:[clone(row)]};}
      }
      return Promise.resolve(result).then(resolve,reject);
    }};return query;}};return db;
}
function device(initial){const storage=new Storage(initial?{[M.KEY]:JSON.stringify(initial)}:{}),state=M.load(storage);const engine=Cloud.create({storage,getState:()=>state});return {storage,state,engine};}
const session=(extra={})=>({items:{0:{choice:'0',firstCorrect:true,attempts:[{choice:'0',correct:true,at:'2026-10-03T00:00:00.000Z'}],hintUsed:false,relistenCount:0,resolved:true}},completedAt:null,...extra});
(async()=>{
  const old={version:1,week:1,sessions:{A:session({completedAt:'2026-09-01'}),B:session({completedAt:'2026-09-02'}),C:{items:{0:{spoken:true,helpUsed:false,feeling:'편했어요'}},completedAt:'2026-09-03'}}};
  const raw=JSON.stringify(old,null,2),storage=new Storage({[M.KEY]:raw,'heeyoon-english-board:v1':'V1 untouched'}),state=M.load(storage);
  assert.equal(state.version,2);assert.deepEqual(state.weeks['1'].sessions,old.sessions);assert.equal(storage.getItem(M.BACKUP),raw);assert.equal(M.firstIncomplete(state),2);
  M.load(storage);assert.equal(storage.getItem(M.BACKUP),raw);assert(!storage.touched.includes('heeyoon-english-board:v1'));assert.equal(storage.values['heeyoon-english-board:v1'],'V1 untouched');
  const existing=new Storage({[M.KEY]:raw,[M.BACKUP]:'earlier backup'});M.load(existing);assert.equal(existing.getItem(M.BACKUP),'earlier backup');
  const broken=new Storage({[M.KEY]:'{bad json'});assert.throws(()=>M.load(broken));assert.equal(broken.getItem(M.KEY),'{bad json');
  for(let w=2;w<=12;w++)state.weeks[w]={sessions:clone(old.sessions)};assert.equal(M.firstIncomplete(state),12);assert(M.complete(state,12));state.weeks[5].sessions.C.completedAt=null;assert.equal(M.firstIncomplete(state),5);
  const context={window:{}};vm.runInNewContext(fs.readFileSync('english/data-v2.js','utf8'),context);
  const weeks=context.window.ENGLISH_V2_WEEKS;assert.equal(Object.keys(weeks).length,12);
  const original={window:{}};vm.runInNewContext(execFileSync('git',['show','HEAD:english/data-v2.js'],{encoding:'utf8'}),original);
  assert.equal(JSON.stringify(weeks[1].A),JSON.stringify(original.window.ENGLISH_V2_WEEK1.A));assert.equal(JSON.stringify(weeks[1].B),JSON.stringify(original.window.ENGLISH_V2_WEEK1.B));assert.equal(JSON.stringify(weeks[1].C),JSON.stringify(original.window.ENGLISH_V2_WEEK1.C));
  for(const [w,data]of Object.entries(weeks))for(const s of ['A','B','C']){assert(data[s].items.length>=5);for(const q of data[s].items){assert(q.text&&q.prompt);if(s!=='C'){assert(q.options.length>1);assert(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length);assert(q.options.every(Boolean));}}}
  assert(weeks[3].B.items.some(q=>q.text.includes('on the chair')));
  const db=mock(),d=device();M.put(d.state,'week:2:A',session());d.engine.commit('week:2:A',M.rows(d.state)['week:2:A']);await d.engine.sync();assert(d.engine.snapshot().queue['week:2:A']);assert(JSON.parse(d.storage.getItem(M.KEY)).weeks['2']);assert.equal(db.writes.length,0);
  await d.engine.setConnection(db.client,'family');assert.equal(db.writes.length,1);assert.deepEqual(d.engine.snapshot().queue,{});
  db.fail=true;d.state.weeks[2].sessions.A.items[0].hintUsed=true;d.engine.commit('week:2:A',d.state.weeks[2].sessions.A);await d.engine.sync();assert(d.engine.snapshot().queue['week:2:A']);assert.equal(db.rows['week:2:A'].revision,1);
  db.fail=false;await d.engine.sync();assert.equal(db.rows['week:2:A'].revision,2);assert.deepEqual(d.engine.snapshot().queue,{});
  const other=device();await other.engine.setConnection(db.client,'family');assert.deepEqual(other.state.weeks[2].sessions.A,db.rows['week:2:A'].value);
  db.rows['week:2:A'].revision++;db.rows['week:2:A'].value.items[0].choice='remote';d.state.weeks[2].sessions.A.items[0].choice='local';d.engine.commit('week:2:A',d.state.weeks[2].sessions.A);await d.engine.sync();assert(d.engine.snapshot().conflicts['week:2:A']);assert.equal(db.rows['week:2:A'].value.items[0].choice,'remote');assert.equal(d.state.weeks[2].sessions.A.items[0].choice,'local');
  const raceDb=mock(),race=device();await race.engine.setConnection(raceDb.client,'family');M.put(race.state,'week:3:A',session());race.engine.commit('week:3:A',race.state.weeks[3].sessions.A);await race.engine.sync();raceDb.race=true;race.state.weeks[3].sessions.A.items[0].hintUsed=true;race.engine.commit('week:3:A',race.state.weeks[3].sessions.A);await race.engine.sync();assert(race.engine.snapshot().conflicts['week:3:A']);assert.equal(raceDb.rows['week:3:A'].value.items[0].hintUsed,false);
  const legacyDb=mock(),legacy=device(old);await legacy.engine.setConnection(legacyDb.client,'family');assert.equal(legacyDb.writes.length,0);assert.deepEqual(legacy.state.weeks['1'].sessions,old.sessions);
  const report=await legacy.engine.compare();assert.equal(report.localCount,3);assert.equal(report.cloudCount,0);assert(report.entries.every(e=>e.status==='신규'));assert.equal(legacyDb.writes.length,0);
  legacy.engine.commit('week:1:A',legacy.state.weeks[1].sessions.A);await legacy.engine.sync();assert.equal(legacyDb.writes.length,0);
  await legacy.engine.migrate();await legacy.engine.sync();assert.equal(legacyDb.writes.length,3);assert.deepEqual(legacy.engine.snapshot().legacy,[]);assert.deepEqual(legacy.engine.snapshot().queue,{});
  const gram=device({version:1,week:1,sessions:{A:session({completedAt:null})}});await gram.engine.setConnection(legacyDb.client,'family');assert(gram.engine.snapshot().conflicts['week:1:A']);assert.equal(gram.state.weeks[1].sessions.A.completedAt,null);assert.equal(gram.state.weeks[1].sessions.B.completedAt,old.sessions.B.completedAt);
  const count=legacyDb.writes.length;const comparison=await gram.engine.compare();assert(comparison.entries.some(e=>e.status==='충돌 보류'));await gram.engine.migrate();await gram.engine.sync();assert.equal(legacyDb.writes.length,count);assert.equal(legacyDb.rows['week:1:A'].value.completedAt,old.sessions.A.completedAt);
  const sql=fs.readFileSync('supabase/english-progress.sql','utf8');assert(sql.includes('heeyoon_family_owner()'));assert(sql.includes('primary key (user_id, session_key)'));assert(sql.includes('grant select, insert, update'));assert(!/grant[^;]*delete/i.test(sql));assert(sql.includes('NEW.revision <> OLD.revision + 1'));
  console.log('PASS: original Week 1, 12-week content, V2 migration/backup/V1 protection, local-first queue, auth/retry/pull, legacy opt-in, identical/new/conflict comparison, revision CAS race, family SQL static checks.');
})().catch(e=>{console.error(e);process.exitCode=1;});
