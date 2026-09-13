/* The board is immediately usable. Auth only enables shared sync. */
(() => {
  'use strict';
  let engine,adapter,client,auth,sessionId=null,connecting=null,authenticating=null,epoch=0;
  const $=id=>document.getElementById(id);
  function offline(){sessionId=null;engine.setUser(null);}
  async function attach(session){
    if(!session)return;
    if(sessionId===session.user.id)return engine.sync();
    if(connecting)return connecting;
    const current=epoch;
    connecting=(async()=>{
      try{
        // Server-owned singleton: the browser cannot choose another family's owner.
        const {data:owner,error}=await client.rpc('heeyoon_family_owner');
        if(current!==epoch)return;
        if(error||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner||''))throw Error('family-unavailable');
        engine.setUser(owner);sessionId=session.user.id;
        $('legacyNotice').textContent=engine.hasLegacy()?'이 기기의 기존 기록을 유지합니다. 과거 기록은 자동으로 온라인에 옮기지 않아요.':'';
        await engine.sync();
      }catch{if(current===epoch)offline();}
    })();
    try{await connecting;}finally{connecting=null;}
  }
  async function reconnect(){
    if(!auth||!navigator.onLine){if(!auth)offline();else void engine.sync();return;}
    if(authenticating)return authenticating;
    authenticating=(async()=>{
      try{
        let {data,error}=await auth.getSession();if(error)throw error;
        if(!data.session){({data,error}=await auth.signInAnonymously());if(error)throw error;}
        await attach(data.session);
      }catch{offline();}
    })();
    try{await authenticating;}finally{authenticating=null;}
  }
  function start(){
    const config=window.HEEYOON_SUPABASE_CONFIG||{};
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.projectUrl||'')||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey||''))return offline();
    try{
      client=window.supabase.createClient(config.projectUrl,config.publishableKey,{
        auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'heeyoon-today-board:auth:v1'},
        global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal||AbortSignal.timeout(12000)})}
      });
      auth=client.auth;engine.setClient(client);
      // Auth callbacks hold the SDK lock: defer all SDK calls.
      auth.onAuthStateChange((event,session)=>{
        if(event==='SIGNED_OUT'){epoch++;offline();}
        setTimeout(()=>{if(session)void attach(session);else if(event==='SIGNED_OUT')void reconnect();},0);
      });
      void reconnect();
    }catch{offline();}
  }
  window.boardCloud={
    saveMain(before,after){return engine.commit(BoardSync.MAIN,before,after);},
    savePlan(before,after){return engine.commit(BoardSync.PLANS,before,after);},
    migrationClient(){return client;},
    init(value){
      adapter=value;
      engine=window.BoardSync.create({storage:localStorage,client:null,online:()=>navigator.onLine,
        onStatus:message=>$('syncStatus').textContent=message,onChange:()=>adapter.refresh()});
      adapter.refresh(); // Render before waiting for auth or the network.
      $('syncButton').onclick=()=>void reconnect();
      window.addEventListener('online',()=>void reconnect());
      window.addEventListener('offline',()=>void engine.sync());
      document.addEventListener('visibilitychange',()=>{if(!document.hidden)void reconnect();});
      window.addEventListener('storage',event=>{if([BoardSync.MAIN,BoardSync.PLANS].includes(event.key))adapter.refresh();});
      setInterval(()=>{if(!document.hidden)void reconnect();},60000);
      start();
    }
  };
})();
