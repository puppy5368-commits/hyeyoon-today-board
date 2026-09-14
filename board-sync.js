/* One family board. Field-level writes; no historical uploads or subject-board access. */
(function (root) {
  'use strict';
  const MAIN = 'heeyoon-today-board:v1', PLANS = 'heeyoon-today-board:daily-plans:v1';
  const PREFIX = 'heeyoon-today-board:sync:v1:';
  const TASKS = ['gumonKorean','gumonHanja','qt','awana','reading','history','english','englishVideo','literacy'];
  const fields = {planTime:'plan_time',startAt:'start_at',doneAt:'done_at',bookType:'book_type',bookTitle:'book_title'};
  const clone = x => JSON.parse(JSON.stringify(x));
  const equal = (a,b) => {
    if(a==null&&b==null)return true;
    if(typeof a==='string'&&typeof b==='string'&&/^\d{4}-\d\d-\d\dT/.test(a)&&/^\d{4}-\d\d-\d\dT/.test(b))return Date.parse(a)===Date.parse(b);
    return JSON.stringify(a) === JSON.stringify(b);
  };
  const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
  function read(storage,key) {
    const raw=storage.getItem(key); if(raw===null)return null;
    const value=JSON.parse(raw), bag=key===MAIN?value?.days:value?.days;
    if(value?.version!==1 || !bag || typeof bag!=='object' || Array.isArray(bag))throw Error('local-invalid');
    if(key===MAIN && (!value.settings || typeof value.settings!=='object'))throw Error('local-invalid');
    return value;
  }
  function rows(key,data) {
    const out={}; if(!data)return out;
    const put=(table,id,pk,values)=>{out[table+'/'+id]={table,pk,values};};
    if(key===MAIN){
      if(own(data.settings,'bookGoal'))put('board_preferences','one',{}, {book_goal:data.settings.bookGoal});
      for(const [id,days] of Object.entries(data.settings.taskDays||{}))if(TASKS.includes(id))put('task_schedules',id,{task_id:id},{days});
      for(const [date,day] of Object.entries(data.days))for(const [id,item] of Object.entries(day.tasks||{})){
        if(!TASKS.includes(id))continue;
        const values={}; for(const [local,remote] of Object.entries(fields))if(own(item,local))values[remote]=item[local];
        if(Object.keys(values).length)put('task_records',date+'/'+id,{record_date:date,task_id:id},values);
      }
    }else{
      for(const [date,p] of Object.entries(data.days))put('daily_plans',date,{plan_date:date},{first_start_time:p.firstStartTime,task_order:p.taskOrder,deadline:p.deadline,source_updated_at:p.updatedAt});
    }
    return out;
  }
  function apply(data,row,patch) {
    if(row.table==='board_preferences'){data.settings.bookGoal=patch.book_goal;return;}
    if(row.table==='task_schedules'){data.settings.taskDays||={};data.settings.taskDays[row.pk.task_id]=clone(patch.days);return;}
    const date=row.pk.record_date||row.pk.plan_date;
    if(row.table==='daily_plans'){
      const p=data.days[date]||={};
      for(const [local,remote] of Object.entries({firstStartTime:'first_start_time',taskOrder:'task_order',deadline:'deadline',updatedAt:'source_updated_at'}))if(own(patch,remote))p[local]=patch[remote];
    }else{
      const day=data.days[date]||={tasks:{}};day.tasks||={};const task=day.tasks[row.pk.task_id]||={};
      for(const [local,remote] of Object.entries(fields))if(own(patch,remote))task[local]=patch[remote];
    }
  }
  function remoteRow(table,r){
    let id,pk,values;
    if(table==='board_preferences'){id='one';pk={};values={book_goal:r.book_goal};}
    if(table==='task_schedules'){id=r.task_id;pk={task_id:r.task_id};values={days:r.days};}
    if(table==='daily_plans'){id=r.plan_date;pk={plan_date:r.plan_date};values={first_start_time:r.first_start_time,task_order:r.task_order,deadline:r.deadline,source_updated_at:r.source_updated_at};}
    if(table==='task_records'){id=r.record_date+'/'+r.task_id;pk={record_date:r.record_date,task_id:r.task_id};values=Object.fromEntries(Object.values(fields).map(k=>[k,r[k]]));}
    return {id:table+'/'+id,table,pk,values,revision:r.revision};
  }
  function create({storage,client,onStatus=()=>{},onChange=()=>{},online=()=>true,uid=()=>crypto.randomUUID()}){
    let user=null, running=false,again=false,failed=false,localProblem=false,lastAt=0;
    const status=(text)=>onStatus(text);
    // Auth identities can change. The queue belongs to the family, even offline.
    const scoped=()=>PREFIX+'family:v1:';
    function json(k,fallback){const raw=storage.getItem(k);return raw===null?fallback:JSON.parse(raw);}
    function operations(){const all=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k.startsWith(scoped()+'op:'))all.push({key:k,...json(k,{})});}return all.sort((a,b)=>a.at-b.at||a.key.localeCompare(b.key));}
    function meta(id){return json(scoped()+'row:'+id,null);}
    function backup(key){const target=PREFIX+'original:'+key;if(storage.getItem(target)===null){const raw=storage.getItem(key);if(raw!==null)storage.setItem(target,raw);}}
    function summary(){
      if(localProblem)return status('⚠️ 추가 저장 공간을 확인해 주세요 · 동기화 일부 대기');
      if(!user)return status('📴 이 기기에 저장됨 · 온라인 연결 대기');
      if(!online())return status('📴 오프라인 · 이 기기에 저장됨');
      if(failed)return status('⚠️ 온라인 저장 실패 · 이 기기에는 저장됨');
      const ops=operations();let conflicts=ops.some(o=>o.conflict);
      for(let i=0;i<storage.length&&!conflicts;i++){const k=storage.key(i);if(k.startsWith(scoped()+'row:'))conflicts=!!json(k,{}).conflict;}
      status(conflicts?'⚠️ 기기 기록과 온라인 기록이 달라요 · 기기 기록 유지':ops.length?'☁️ 저장 대기 중…':'☁️ 동기화됨');
    }
    function commit(key,before,after){
      const oldRows=rows(key,before),newRows=rows(key,after),changes=[];
      const latest=read(storage,key)|| (key===MAIN?{version:1,settings:{taskDays:{}},days:{}}:{version:1,days:{}});
      for(const [id,row] of Object.entries(newRows)){
        const previous=oldRows[id]?.values||{},patch={};
        for(const [f,v] of Object.entries(row.values))if(!equal(v,previous[f]))patch[f]=v;
        if(!Object.keys(patch).length)continue;
        // A saved daily plan is a single intentional edit; required fields accompany a new row.
        if(row.table==='daily_plans')Object.assign(patch,row.values);
        const base=meta(id);
        lastAt=Math.max(Date.now(),lastAt+1,...operations().map(o=>o.at+1));
        changes.push({id,table:row.table,pk:row.pk,patch,before:previous,expected:base?.values||previous,at:lastAt,revision:base?.revision??null});
        apply(latest,row,patch);
      }
      if(!changes.length)return latest;
      backup(key); // First raw snapshot is never overwritten.
      storage.setItem(key,JSON.stringify(latest)); // User's local write always precedes network activity.
      try{for(const op of changes)storage.setItem(scoped()+'op:'+uid(),JSON.stringify(op));}
      catch{localProblem=true;summary();return latest;}
      summary();void sync();return latest;
    }
    function query(row){let q=client.from(row.table).select('*').eq('user_id',user);for(const [k,v] of Object.entries(row.pk))q=q.eq(k,v);return q;}
    async function send(op,who){
      if(op.conflict)return;
      const got=await query(op).maybeSingle();if(got.error)throw got.error;
      if(user!==who)return;
      const current=got.data, values=current?remoteRow(op.table,current).values:{};
      if(current && Object.entries(op.patch).every(([k,v])=>equal(v,values[k]))){storage.removeItem(op.key);return;}
      const conflict=current && Object.keys(op.patch).some(k=>!equal(values[k],op.patch[k])&&!equal(values[k],op.expected[k])&&!equal(values[k],op.before[k]));
      if(conflict || (!current && op.revision!==null)){
        storage.setItem(op.key,JSON.stringify({...op,conflict:true}));return;
      }
      let request;
      if(current){request=client.from(op.table).update({...op.patch,revision:current.revision+1}).eq('user_id',who).eq('revision',current.revision);for(const [k,v] of Object.entries(op.pk))request=request.eq(k,v);}
      else request=client.from(op.table).insert({user_id:who,...op.pk,...op.patch});
      const result=await request.select('*').maybeSingle();if(user!==who)return;
      if(result.error){if(['40001','23505'].includes(result.error.code)){storage.setItem(op.key,JSON.stringify({...op,conflict:true}));return;}throw result.error;}
      if(!result.data){storage.setItem(op.key,JSON.stringify({...op,conflict:true}));return;}
      storage.removeItem(op.key);
      // Do not advance pull baseline here: the user's earlier legacy fields may differ.
    }
    async function pull(who){
      for(const table of ['board_preferences','task_schedules','daily_plans','task_records']){
        let offset=0;
        while(user===who){
          let request=client.from(table).select('*').eq('user_id',who);
          const order=table==='task_records'?['record_date','task_id']:table==='daily_plans'?['plan_date']:table==='task_schedules'?['task_id']:['user_id'];
          for(const col of order)request=request.order(col);
          const result=await request.range(offset,offset+499);if(result.error)throw result.error;if(user!==who)return;
          for(const raw of result.data){
            const row=remoteRow(table,raw),key=table==='daily_plans'?PLANS:MAIN;
            const local=read(storage,key)|| (key===MAIN?{version:1,settings:{taskDays:{}},days:{}}:{version:1,days:{}});
            const current=rows(key,local)[row.id]?.values||{},base=meta(row.id),patch={};let conflict=false;
            const pending=operations().filter(o=>o.id===row.id),protectedFields=new Set(pending.flatMap(o=>Object.keys(o.patch)));
            for(const [f,v] of Object.entries(row.values)){
              if(protectedFields.has(f))continue;
              if(equal(current[f],v))continue;
              if(!own(current,f) || (base && equal(current[f],base.values[f])))patch[f]=v;
              else conflict=true;
            }
            if(Object.keys(patch).length){backup(key);apply(local,row,patch);storage.setItem(key,JSON.stringify(local));}
            storage.setItem(scoped()+'row:'+row.id,JSON.stringify({...row,conflict}));
          }
          if(result.data.length<500)break;offset+=500;
        }
      }
      if(user===who)onChange();
    }
    async function sync(){
      if(!user){summary();return;}
      if(running){again=true;return;}
      if(!online()){summary();return;}
      running=true;failed=false;const who=user;status('☁️ 저장 중…');
      const work=async()=>{for(const op of operations()){if(user!==who)return;await send(op,who);}if(user===who)await pull(who);};
      try{if(root.navigator?.locks)await root.navigator.locks.request(PREFIX+'network:'+who,work);else await work();}
      catch{failed=true;}
      finally{running=false;if(user===who)summary();if(again){again=false;void sync();}}
    }
    function setUser(id){
      if(!id){user=null;summary();return;}
      // id is the DB's canonical family owner, NEVER the anonymous auth.uid().
      const owner=storage.getItem(PREFIX+'owner'),family=storage.getItem(scoped()+'owner');
      if((owner&&owner!==id)||(family&&family!==id))throw Error('different-owner');
      // Copy old sync metadata/queued edits once; keep old keys as a migration archive.
      const migrated=scoped()+'migrated:'+id,oldPrefix=PREFIX+id+':';
      if(storage.getItem(migrated)===null){
        const keys=[];for(let i=0;i<storage.length;i++)keys.push(storage.key(i));
        for(const key of keys){
          if(!key.startsWith(oldPrefix))continue;
          const suffix=key.slice(oldPrefix.length);
          if(!suffix.startsWith('op:')&&!suffix.startsWith('row:'))continue;
          const target=scoped()+suffix;
          if(storage.getItem(target)===null)storage.setItem(target,storage.getItem(key));
        }
        storage.setItem(migrated,'yes');
      }
      const legacyKey=scoped()+'legacy-present';
      if(storage.getItem(legacyKey)===null)storage.setItem(legacyKey,(storage.getItem(MAIN)||storage.getItem(PLANS))?'yes':'no');
      storage.setItem(scoped()+'owner',id);user=id;
    }
    return {commit,sync,setUser,setClient:value=>{client=value;},read:key=>read(storage,key),hasLegacy:()=>storage.getItem(scoped()+'legacy-present')==='yes'};
  }
  root.BoardSync={create,MAIN,PLANS,rows,apply};
  if(typeof module!=='undefined')module.exports=root.BoardSync;
})(typeof window==='undefined'?globalThis:window);
