/* Literacy V2 family cloud sync. Merges per-question progress and never deletes local records. */
(function(root){
  'use strict';
  const KEY='heeyoon-literacy-board:v2';
  const clone=x=>JSON.parse(JSON.stringify(x));
  const canon=x=>JSON.stringify(sort(x));
  function sort(x){if(Array.isArray(x))return x.map(sort);if(x&&typeof x==='object'){const o={};for(const k of Object.keys(x).sort())o[k]=sort(x[k]);return o;}return x;}
  const same=(a,b)=>canon(a)===canon(b);
  const sessionKey=id=>{const m=/^([1-9]|1[0-2])([AB])$/.exec(id);return m?'week:'+m[1]+':'+m[2]:null;};
  const idFromKey=key=>{const m=/^week:([1-9]|1[0-2]):([AB])$/.exec(key);return m?m[1]+m[2]:null;};
  function qScore(q){
    if(!q)return -1;
    return (q.resolved?1000:0)+(q.revealed?300:0)+((q.attempts||[]).length*100)+(q.hintUsed?40:0)+(q.final!==null&&q.final!==undefined?20:0)+((q.evidence||[]).length*3)+(q.confidence?2:0);
  }
  function mergeQuestion(a,b){
    if(!a)return clone(b); if(!b)return clone(a);
    const sa=qScore(a),sb=qScore(b);
    if(sa!==sb)return clone(sa>sb?a:b);
    const ta=Date.parse(a.completedAt||a.attempts?.at(-1)?.at||0)||0;
    const tb=Date.parse(b.completedAt||b.attempts?.at(-1)?.at||0)||0;
    return clone(tb>ta?b:a);
  }
  function resultOf(questions){
    const vals=Object.values(questions||{});
    if(vals.some(q=>q?.result==='blue'))return 'blue';
    if(vals.some(q=>q?.result==='yellow'))return 'yellow';
    if(vals.some(q=>q?.result==='green'))return 'green';
    return null;
  }
  function mergeSession(a,b){
    if(!a)return clone(b); if(!b)return clone(a);
    const out={...clone(a),...clone(b),questions:{}};
    const keys=new Set([...Object.keys(a.questions||{}),...Object.keys(b.questions||{})]);
    for(const k of keys)out.questions[k]=mergeQuestion(a.questions?.[k],b.questions?.[k]);
    const dates=[a.completedAt,b.completedAt].filter(Boolean).sort();
    out.completedAt=dates.at(-1)||null;
    out.result=out.completedAt?resultOf(out.questions):(b.result||a.result||null);
    out.week=b.week||a.week;out.session=b.session||a.session;
    return out;
  }
  function create({getState,onMerged=()=>{},onStatus=()=>{},online=()=>navigator.onLine}){
    let client=null,owner=null,busy=Promise.resolve();
    const status=t=>onStatus(t);
    async function remoteAll(){
      const r=await client.from('literacy_progress').select('*').eq('user_id',owner);
      if(r.error)throw r.error;
      return Object.fromEntries((r.data||[]).map(row=>[row.session_key,row]));
    }
    async function saveRow(key,value,row){
      if(row&&same(row.value,value))return row;
      let q=client.from('literacy_progress');
      q=row?q.update({value,revision:row.revision+1}).eq('user_id',owner).eq('session_key',key).eq('revision',row.revision)
           :q.insert({user_id:owner,session_key:key,value,revision:1});
      const r=await q.select();
      if(r.error)throw r.error;
      return r.data?.[0]||null;
    }
    async function syncAll(){
      if(!client||!owner||!online()){status('이 기기에 저장됨 · 연결 대기');return;}
      try{
        const cloud=await remoteAll(),local=getState().sessions||{};
        const keys=new Set([...Object.keys(cloud),...Object.keys(local).map(sessionKey).filter(Boolean)]);
        let changed=false;
        for(const key of keys){
          const id=idFromKey(key);if(!id)continue;
          const localValue=local[id]||null,row=cloud[key]||null;
          const merged=mergeSession(localValue,row?.value||null);
          if(!merged)continue;
          if(!same(localValue,merged)){onMerged(id,merged);changed=true;}
          if(!row||!same(row.value,merged)){
            try{await saveRow(key,merged,row);}
            catch(e){
              // Another device may have written between read and update. Re-read and merge once.
              const latest=(await remoteAll())[key];
              const retried=mergeSession(merged,latest?.value||null);
              if(!same(getState().sessions?.[id],retried)){onMerged(id,retried);changed=true;}
              if(!latest||!same(latest.value,retried))await saveRow(key,retried,latest||null);
            }
          }
        }
        status('문해력 기록 동기화됨');
        if(changed)onMerged(null,null,true);
      }catch(e){
        status('이 기기에 저장됨 · 연결 후 다시 동기화');
      }
    }
    function sync(){busy=busy.then(syncAll,syncAll);return busy;}
    function commit(){status('이 기기에 저장됨 · 동기화 중');void sync();}
    function setConnection(c,id){client=c;owner=id;return sync();}
    return {commit,sync,setConnection};
  }
  function connect(engine){
    const cfg=root.HEEYOON_SUPABASE_CONFIG;if(!cfg||!root.supabase)return;
    const client=root.supabase.createClient(cfg.projectUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'heeyoon-today-board:auth:v1'}});
    let connecting=null;
    async function reconnect(){
      if(connecting)return connecting;
      connecting=(async()=>{try{
        let {data,error}=await client.auth.getSession();if(error)throw error;
        if(!data.session){({data,error}=await client.auth.signInAnonymously());if(error)throw error;}
        const r=await client.rpc('heeyoon_family_owner');if(r.error||!r.data)throw r.error||Error('family');
        await engine.setConnection(client,r.data);
      }catch{await engine.setConnection(null,null);}})();
      try{await connecting;}finally{connecting=null;}
    }
    client.auth.onAuthStateChange(()=>setTimeout(()=>void reconnect(),0));
    root.addEventListener('online',()=>void reconnect());
    root.document.addEventListener('visibilitychange',()=>{if(!root.document.hidden)void reconnect();});
    setInterval(()=>{if(!root.document.hidden)void reconnect();},60000);
    void reconnect();
  }
  root.LiteracyCloud={create,connect,mergeSession};
})(window);
