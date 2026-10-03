/* Session-level optimistic concurrency. No upsert, deletion, or implicit legacy seed. */
(function(root){
  'use strict';
  const M=root.EnglishMigration||(typeof require==='function'?require('./english-migration.js'):null);
  const PREFIX=M.KEY+':cloud:',equal=(a,b)=>canonical(a)===canonical(b);
  function canonical(x){if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';if(x&&typeof x==='object')return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';return JSON.stringify(x);}
  function create({storage,getState,onChange=()=>{},onStatus=()=>{},online=()=>true}){
    const read=(key,fallback)=>JSON.parse(storage.getItem(PREFIX+key)||JSON.stringify(fallback));
    let queue=read('queue',{}),base=read('base',{}),legacy=read('legacy',null),conflicts=read('conflicts',{}),client=null,owner=null,busy=null;
    if(legacy===null){legacy=Object.keys(M.rows(getState()));storage.setItem(PREFIX+'legacy',JSON.stringify(legacy));}
    const persist=()=>{for(const [k,v]of Object.entries({queue,base,legacy,conflicts}))storage.setItem(PREFIX+k,JSON.stringify(v));};
    const save=()=>storage.setItem(M.KEY,JSON.stringify(getState()));
    function commit(key,value){save();queue[key]={value:M.clone(value),expected:base[key]||null};persist();void sync();}
    async function remote(){if(!client||!owner)throw Error('인증 연결을 기다리고 있어요.');const r=await client.from('english_progress').select('*').eq('user_id',owner);if(r.error)throw r.error;return Object.fromEntries((r.data||[]).filter(r=>/^week:([1-9]|1[0-2]):[ABC]$/.test(r.session_key)).map(r=>[r.session_key,r]));}
    async function compare(){const cloud=await remote(),local=M.rows(getState());return {localCount:Object.keys(local).length,cloudCount:Object.keys(cloud).length,entries:Object.entries(local).map(([key,value])=>({key,status:!cloud[key]?'신규':equal(value,cloud[key].value)?'동일':'충돌 보류'})),cloud};}
    async function migrate(){
      if(busy)await busy;
      busy=(async()=>{const report=await compare();for(const entry of report.entries){const key=entry.key;
        if(entry.status==='충돌 보류'){conflicts[key]='기존 기록 충돌 보류';continue;}
        let row=report.cloud[key];
        if(!row){const value=M.rows(getState())[key];const r=await client.from('english_progress').insert({user_id:owner,session_key:key,value,revision:1}).select();
          if(r.error){conflicts[key]='이전 실패 또는 충돌 보류';continue;}row=r.data?.[0];if(!row)continue;
        }
        base[key]={value:M.clone(row.value),revision:row.revision};legacy=legacy.filter(k=>k!==key);delete conflicts[key];
        if(queue[key]&&equal(queue[key].value,row.value))delete queue[key];
      }persist();onChange();return report;})();
      try{return await busy;}finally{busy=null;void sync();}
    }
    async function run(){
      if(!client||!owner||!online()){onStatus('이 기기에 저장됨 · 연결 대기');return;}
      try{
        let cloud=await remote();
        for(const [key,op]of Object.entries(queue)){
          if(legacy.includes(key)||conflicts[key])continue;
          const row=cloud[key],expected=op.expected;
          if(row&&equal(row.value,op.value)){base[key]={value:M.clone(row.value),revision:row.revision};if(queue[key]===op)delete queue[key];else if(queue[key])queue[key].expected=M.clone(base[key]);persist();continue;}
          if(row&&(!expected||row.revision!==expected.revision||!equal(row.value,expected.value))||!row&&expected){conflicts[key]='다른 기기의 변경과 충돌 보류';persist();continue;}
          let query=client.from('english_progress');
          query=row?query.update({value:op.value,revision:row.revision+1}).eq('user_id',owner).eq('session_key',key).eq('revision',row.revision):query.insert({user_id:owner,session_key:key,value:op.value,revision:1});
          const result=await query.select();if(result.error)throw result.error;
          const saved=result.data?.[0];if(!saved){conflicts[key]='revision 충돌 보류';persist();continue;}
          base[key]={value:M.clone(saved.value),revision:saved.revision};
          if(queue[key]===op)delete queue[key];else if(queue[key])queue[key].expected=M.clone(base[key]);
          persist();
        }
        cloud=await remote();const local=M.rows(getState());
        for(const [key,row]of Object.entries(cloud)){
          if(queue[key]||conflicts[key])continue;
          const value=local[key],previous=base[key];
          if(value&&!equal(value,row.value)&&(!previous||!equal(value,previous.value))){conflicts[key]='기존 기록 충돌 보류';continue;}
          M.put(getState(),key,row.value);base[key]={value:M.clone(row.value),revision:row.revision};
          // Equal/pulled records are safe to update later; never upload a legacy record here.
          legacy=legacy.filter(k=>k!==key);
        }
        save();persist();onStatus(Object.keys(conflicts).length?'충돌 보류 · 부모 기록에서 확인':legacy.length?'기존 기록 이전 대기':Object.keys(queue).length?'이 기기에 저장됨 · 전송 대기':'영어 기록 동기화됨');onChange();
      }catch{persist();onStatus('이 기기에 저장됨 · 연결 후 다시 시도');}
    }
    function sync(){if(busy)return busy;busy=run();return busy.finally(()=>{busy=null;});}
    return {commit,sync,compare,migrate,setConnection(c,id){client=c;owner=id;return sync();},snapshot(){return M.clone({queue,base,legacy,conflicts});}};
  }
  function connect(engine){
    const config=root.HEEYOON_SUPABASE_CONFIG;let client,connecting=null;
    if(!config||!root.supabase)return;
    client=root.supabase.createClient(config.projectUrl,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'heeyoon-today-board:auth:v1'},global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal||AbortSignal.timeout(12000)})}});
    async function reconnect(){if(connecting)return connecting;connecting=(async()=>{try{let {data,error}=await client.auth.getSession();if(error)throw error;if(!data.session){({data,error}=await client.auth.signInAnonymously());if(error)throw error;}const r=await client.rpc('heeyoon_family_owner');if(r.error||! /^[0-9a-f-]{36}$/i.test(r.data||''))throw Error('family');await engine.setConnection(client,r.data);}catch{await engine.setConnection(null,null);}})();try{await connecting;}finally{connecting=null;}}
    client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')void engine.setConnection(null,null);setTimeout(()=>void reconnect(),0);});
    root.addEventListener('online',()=>void reconnect());root.document.addEventListener('visibilitychange',()=>{if(!root.document.hidden)void reconnect();});
    setInterval(()=>{if(!root.document.hidden)void reconnect();},60000);void reconnect();
  }
  const api={create,connect,equal};root.EnglishCloud=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
