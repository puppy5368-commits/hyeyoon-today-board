/* Auth gate and the existing board's local-first storage adapter. */
(() => {
  'use strict';
  let engine,adapter,sessionUser=null,auth,authEpoch=0,logoutPending=false;
  let recoverySession=null,recoverySaving=false,recoveryComplete=false;
  const $=id=>document.getElementById(id);
  function lock(message='가족 계정으로 로그인해 주세요.'){
    recoverySession=null;recoveryComplete=false;$('recoveryPanel').hidden=true;$('recoveryForm').reset();
    sessionUser=null;engine?.setUser(null);document.body.classList.remove('board-unlocked');
    $('loginPanel').hidden=false;$('boardApp').hidden=true;$('loginMessage').textContent=message;
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    $('toast').classList.remove('show');
  }
  function showSession(session){
    if(logoutPending)return;
    if(!session){lock();return;}
    if(recoverySession){recoverySession=session;return;}
    if(sessionUser===session.user.id)return;
    try{
      engine.setUser(session.user.id);sessionUser=session.user.id;
      adapter.refresh();$('retryLogout').hidden=true;$('loginPanel').hidden=true;$('boardApp').hidden=false;document.body.classList.add('board-unlocked');
      $('legacyNotice').textContent=engine.hasLegacy()?'이 기기의 기존 기록을 유지합니다. 과거 기록의 온라인 이전은 아직 실행하지 않았어요.':'';
      void engine.sync();
    }catch{lock('이 기기의 기록을 보호하기 위해 열지 못했어요. 기존 가족 계정과 브라우저 저장 공간을 확인해 주세요.');}
  }
  async function start(){
    const config=window.HEEYOON_SUPABASE_CONFIG||{};
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.projectUrl||'')||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey||'')){
      lock('아직 온라인 연결을 준비 중이에요. supabase-config.js의 Project URL과 publishable key를 입력해 주세요.');
      $('loginButton').disabled=true;return;
    }
    try{
      if(!window.supabase)throw Error('sdk');
      const client=window.supabase.createClient(config.projectUrl,config.publishableKey,{
        auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'heeyoon-today-board:auth:v1'},
        global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal||AbortSignal.timeout(12000)})}
      });
      auth=client.auth;
      engine=window.BoardSync.create({storage:localStorage,client,online:()=>navigator.onLine,
        onStatus:message=>$('syncStatus').textContent=message,
        onChange:()=>{if(sessionUser)adapter.refresh();}});
      // Do not await SDK calls inside its auth callback (avoids auth lock deadlocks).
      auth.onAuthStateChange((event,session)=>{
        if(event==='PASSWORD_RECOVERY'&&session){
          authEpoch++;lock();logoutPending=false;recoverySession=session;
          $('loginPanel').hidden=true;$('recoveryPanel').hidden=false;
          $('recoveryForm').hidden=false;$('recoveryContinue').hidden=true;
          $('recoveryMessage').textContent='새 비밀번호를 입력해 주세요.';
          $('newPassword').focus();
        }else if(event==='SIGNED_OUT'){authEpoch++;lock();}
        else{const epoch=authEpoch;setTimeout(()=>{if(epoch===authEpoch)showSession(session);},0);}
      });
      const epoch=authEpoch,{data,error}=await auth.getSession();if(error)throw error;if(epoch===authEpoch)showSession(data.session);
      $('loginButton').disabled=false;
    }catch{lock('로그인 연결을 준비하지 못했어요. 인터넷 연결을 확인한 뒤 새로고침해 주세요.');$('loginButton').disabled=true;}
  }
  window.boardCloud={
    saveMain(before,after){if(!engine||!sessionUser)throw Error('login-required');return engine.commit(BoardSync.MAIN,before,after);},
    savePlan(before,after){if(!engine||!sessionUser)throw Error('login-required');return engine.commit(BoardSync.PLANS,before,after);},
    init(value){adapter=value;
      $('recoveryForm').addEventListener('submit',async e=>{
        e.preventDefault();if(!auth||!recoverySession||recoverySaving||recoveryComplete)return;
        if($('newPassword').value!==$('confirmPassword').value){
          $('recoveryMessage').textContent='두 비밀번호가 달라요. 다시 확인해 주세요.';$('confirmPassword').focus();return;
        }
        recoverySaving=true;$('recoverySave').disabled=true;$('recoveryMessage').textContent='비밀번호를 변경하고 있어요…';
        const epoch=authEpoch;
        try{
          const {error}=await auth.updateUser({password:$('newPassword').value});
          if(epoch!==authEpoch)return;
          if(error){$('recoveryMessage').textContent='비밀번호를 변경하지 못했어요. 비밀번호 조건과 인터넷 연결을 확인하고 다시 시도해 주세요.';return;}
          recoveryComplete=true;$('recoveryForm').hidden=true;$('recoveryContinue').hidden=false;
          $('recoveryMessage').textContent='비밀번호가 변경되었어요';$('recoveryContinue').focus();
        }catch{if(epoch===authEpoch)$('recoveryMessage').textContent='인터넷 연결을 확인한 뒤 다시 시도해 주세요.';}
        finally{$('recoveryForm').reset();recoverySaving=false;$('recoverySave').disabled=false;}
      });
      $('recoveryContinue').onclick=()=>{
        if(!recoveryComplete||!recoverySession)return;
        const session=recoverySession;recoverySession=null;recoveryComplete=false;
        $('recoveryPanel').hidden=true;showSession(session);
      };
      $('loginForm').addEventListener('submit',async e=>{
        e.preventDefault();if(!auth)return;logoutPending=false;$('loginButton').disabled=true;$('loginMessage').textContent='로그인 중이에요…';
        try{const {data,error}=await auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});
          $('loginPassword').value='';
          if(error){$('loginMessage').textContent=error.status===400?'이메일과 비밀번호를 다시 확인해 주세요.':'로그인하지 못했어요. 인터넷 연결을 확인하고 잠시 후 다시 시도해 주세요.';}
          else showSession(data.session);
        }catch{$('loginPassword').value='';$('loginMessage').textContent='인터넷 연결을 확인한 뒤 다시 로그인해 주세요.';}
        finally{$('loginButton').disabled=false;}
      });
      $('logoutButton').onclick=async()=>{if(!auth)return;logoutPending=true;authEpoch++;lock('로그아웃 중이에요…');try{const {error}=await auth.signOut({scope:'local'});if(error){lock('로그아웃을 완료하지 못했어요. 인터넷 연결 후 다시 눌러 주세요.');$('retryLogout').hidden=false;}else lock();}catch{lock('로그아웃을 완료하지 못했어요. 인터넷 연결 후 다시 눌러 주세요.');$('retryLogout').hidden=false;}};
      $('retryLogout').onclick=()=>$('logoutButton').click();
      $('syncButton').onclick=()=>engine?.sync();
      window.addEventListener('online',()=>engine?.sync());
      window.addEventListener('offline',()=>engine?.sync());
      document.addEventListener('visibilitychange',()=>{if(!document.hidden&&sessionUser)void engine.sync();});
      window.addEventListener('storage',event=>{if(!sessionUser)return;if([BoardSync.MAIN,BoardSync.PLANS].includes(event.key))adapter.refresh();});
      setInterval(()=>{if(sessionUser&&!document.hidden)void engine.sync();},60000);
      void start();
    }
  };
})();
