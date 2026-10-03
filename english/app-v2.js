(() => {
  'use strict';
  const M=window.EnglishMigration,W=window.ENGLISH_V2_WEEKS,$=id=>document.getElementById(id),now=()=>new Date().toISOString();
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state;try{state=M.load(localStorage);}catch(error){$('study').textContent=error.message;return;}
  let week=M.firstIncomplete(state),section='A',index=0,active=false,touched=false,ttsNotice='',report=null;
  const session=()=>((state.weeks[String(week)]||={sessions:{}}).sessions[section]||={items:{},completedAt:null});
  const item=()=>session().items[index]||(section==='C'?{spoken:false,helpUsed:false,feeling:null,choice:null}:{choice:null,firstCorrect:null,attempts:[],hintUsed:false,relistenCount:0,resolved:false});
  const cloud=EnglishCloud.create({storage:localStorage,getState:()=>state,onStatus:message=>{$('sync-status').textContent=message;},onChange:()=>{if(!active&&!touched)week=M.firstIncomplete(state);render();}});
  const save=record=>{if(record)session().items[index]=record;state.currentWeek=week;cloud.commit('week:'+week+':'+section,session());};
  function speak(text){
    const synth=window.speechSynthesis;
    if(!synth||!window.SpeechSynthesisUtterance){ttsNotice='이 브라우저는 영어 음성을 지원하지 않아요. 어른과 함께 읽어도 괜찮아요.';return false;}
    const voices=synth.getVoices(),voice=voices.find(v=>/^en[-_]US$/i.test(v.lang))||voices.find(v=>/^en([-_]|$)/i.test(v.lang));
    if(!voice){ttsNotice='영어 음성이 아직 없어요. 기기의 영어 음성을 설치하거나 잠시 뒤 다시 눌러주세요.';return false;}
    const u=new SpeechSynthesisUtterance(text);u.lang=voice.lang;u.voice=voice;u.rate=0.85;
    u.onerror=()=>{ttsNotice='영어 음성을 재생하지 못했어요. 다시 눌러주세요.';$('tts-notice').textContent=ttsNotice;};
    synth.cancel();synth.speak(u);ttsNotice='';return true;
  }
  const expression=(q,s)=>q.text.replace('{choice}',s.choice||'____');
  function changeWeek(w){week=Math.max(1,Math.min(12,Number(w)));section='A';index=0;active=false;touched=true;ttsNotice='';render();}
  function render(){
    const data=W[week],lesson=data[section],r=session();
    $('week-title').textContent='🇺🇸 영어 V2 · '+week+'주차';$('theme').textContent=data.title;$('lesson').textContent=data.lesson+' · 화 읽기 / 목 듣기 / 토 말하기 · 한 번에 10~15분';
    $('weeks').innerHTML='<button class="btn" data-week="'+(week-1)+'" '+(week===1?'disabled':'')+'>‹ 이전</button><label>주차 <select id="week-select">'+Object.entries(W).map(([w,d])=>'<option value="'+w+'" '+(Number(w)===week?'selected':'')+'>'+w+'주차 '+esc(d.title)+(M.complete(state,w)?' ✓':'')+'</option>').join('')+'</select></label><button class="btn" data-week="'+(week+1)+'" '+(week===12?'disabled':'')+'>다음 ›</button>';
    document.querySelectorAll('[data-week]').forEach(b=>b.onclick=()=>changeWeek(b.dataset.week));$('week-select').onchange=e=>changeWeek(e.target.value);
    $('sections').className='tabs';$('sections').innerHTML=['A','B','C'].map(id=>'<button class="tab '+(id===section?'active':'')+'" data-section="'+id+'">'+data[id].icon+' '+id+' '+data[id].title+(state.weeks[String(week)]?.sessions?.[id]?.completedAt?' ✓':'')+'</button>').join('');
    document.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>{section=b.dataset.section;index=0;active=false;touched=true;ttsNotice='';render();});
    const root=$('study');
    if(!active){
      root.innerHTML='<span class="eyebrow">'+lesson.icon+' '+section+' · '+(r.completedAt?'완료':Object.keys(r.items).length?'진행 중':'시작 전')+'</span><h2>'+(r.completedAt?'🎉 '+lesson.title+' 완료!':lesson.title)+'</h2><p class="quiet">한 번에 하나씩 만나봐요. 어느 활동부터 시작해도 괜찮아요.</p>'+(M.complete(state,week)?'<p class="week-complete">🎉 '+week+'주차 완료!</p>'+(week<12?'<button class="btn primary" id="next-week">다음 주차로 가기 →</button>':'<p>영어 탐험을 모두 만나봤어요. 지난 활동도 다시 볼 수 있어요.</p>'):'')+'<button class="btn" id="begin">'+(r.completedAt?'완료 기록 보기':'시작하기')+'</button>';
      $('begin').onclick=()=>{active=true;touched=true;index=0;render();};if($('next-week'))$('next-week').onclick=()=>changeWeek(week+1);
    }else{
      const q=lesson.items[index],s=r.completedAt?r.items[index]||{}:item(),review=!!r.completedAt,choices=q.choices||q.options||[];
      const reveal=review||(section==='B'?(s.attempts||[]).length>0:section==='C'&&q.stage==='solo'?!!s.modelShown:true);
      root.innerHTML='<span class="eyebrow">'+lesson.icon+' '+section+' · '+(index+1)+'/'+lesson.items.length+(review?' · 완료 기록':'')+'</span><h2>'+esc(q.prompt)+'</h2>'+(q.scene?'<p class="scene">'+esc(q.scene)+'</p>':'')+'<div class="english" lang="'+(reveal?'en':'ko')+'">'+(reveal?esc(expression(q,s)):section==='B'?'🔊 듣기를 먼저 눌러보세요':'상황을 보고 혼자 말해봐요. 도움이 필요하면 눌러도 괜찮아요.')+'</div><div class="actions"><button class="btn" data-action="listen" '+(section==='C'&&q.choices&&!s.choice?'disabled':'')+'>🔊 듣기</button>'+(section==='B'?'<button class="btn" data-action="relisten">다시 듣기</button>':'')+'</div><p id="tts-notice" class="quiet" role="status">'+esc(ttsNotice)+'</p>'+(choices.length?'<div class="options">'+choices.map((x,i)=>{const label=Array.isArray(x)?x[0]:x,value=Array.isArray(x)?x[1]:i;return '<button class="option" data-choice="'+esc(value)+'" aria-pressed="'+(String(s.choice)===String(value))+'" '+(review?'disabled':'')+'>'+esc(label)+'</button>';}).join('')+'</div>':'')+'<div class="feedback">'+(s.hintUsed?'🔎 '+esc(q.hint):s.attempts?.length&&!s.resolved?'한 번 더 볼까요?':'모르면 다시 듣고 천천히 해봐요.')+'</div>'+(review?'<p>완료일 '+esc(r.completedAt.slice(0,10))+'</p><button class="btn primary" data-action="review-next">'+(index===lesson.items.length-1?'기록 닫기':'다음 기록 →')+'</button>':'<div class="actions">'+(section==='C'?'<button class="btn" data-action="help">도움 필요</button><button class="btn primary" data-action="spoken" '+(q.choices&&!s.choice?'disabled':'')+'>말해봤어요</button><button class="btn" data-action="skip">이번엔 넘어갈게요</button>':'<button class="btn" data-action="hint" '+(s.attempts?.length?'':'disabled')+'>힌트</button><button class="btn primary" data-action="check" '+(s.choice===null||section==='B'&&!s.listenCount&&!s.relistenCount?'disabled':'')+'>확인</button>')+'</div>'+(section==='C'?'<fieldset class="feelings"><legend>어떤 느낌인가요? (선택)</legend>'+['편했어요','조금 어려웠어요','도움이 필요했어요'].map(f=>'<button class="btn" data-feeling="'+f+'" aria-pressed="'+(s.feeling===f)+'">'+f+'</button>').join('')+'</fieldset>':''));
      document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{if(review)return;s.choice=String(s.choice)===b.dataset.choice?null:b.dataset.choice;save(s);render();});
      document.querySelectorAll('[data-feeling]').forEach(b=>b.onclick=()=>{s.feeling=b.dataset.feeling;save(s);render();});
      document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>act(b.dataset.action,q,s,review));
    }
    renderParent();
  }
  function act(action,q,s,review){
    if(action==='listen'||action==='relisten'){
      if(speak(expression(q,s))&&!review){const count=s.listenCount||(section==='B'?s.relistenCount||0:0);if(section==='B'&&count>0)s.relistenCount=(s.relistenCount||0)+1;s.listenCount=count+1;if(q.stage==='solo'){s.modelShown=true;s.helpUsed=true;}save(s);}render();return;
    }
    if(action==='review-next'){if(index===W[week][section].items.length-1)active=false;else index++;render();return;}
    if(review)return;
    if(action==='hint'){s.hintUsed=true;save(s);render();return;}
    if(action==='help'){s.helpUsed=true;s.modelShown=true;save(s);render();return;}
    if(action==='spoken'||action==='skip'){s.spoken=action==='spoken';s.skipped=action==='skip';s.completedAt=now();next(s);return;}
    if(action==='check'){const correct=String(s.choice)===String(q.answer);if(!s.attempts.length)s.firstCorrect=correct;s.attempts.push({choice:s.choice,correct,at:now()});if(correct){s.resolved=true;next(s);}else{s.choice=null;save(s);render();}}
  }
  function next(record){session().items[index]=record;if(index===W[week][section].items.length-1){session().completedAt=now();active=false;}else index++;save();render();}
  function metrics(w,s){const r=state.weeks[String(w)]?.sessions?.[s]||{},items=Object.values(r.items||{});return {total:W[w][s].items.length,answered:items.filter(i=>i.firstCorrect!==null&&i.firstCorrect!==undefined).length,correct:items.filter(i=>i.firstCorrect===true).length,retries:items.reduce((n,i)=>n+Math.max(0,(i.attempts||[]).length-1),0),hints:items.filter(i=>i.hintUsed).length,relisten:items.reduce((n,i)=>n+(i.relistenCount||0),0),spoken:items.filter(i=>i.spoken).length,help:items.filter(i=>i.helpUsed).length,feelings:items.map(i=>i.feeling).filter(Boolean),completed:r.completedAt};}
  function renderParent(){
    const snapshot=cloud.snapshot();
    let html='<p>'+week+'주차 기록 · 완료한 기록은 읽기 전용으로 보존해요.</p><div class="parent-grid">'+['A','B','C'].map(s=>{const m=metrics(week,s);return '<article><h3>'+s+' '+W[week][s].title+'</h3><p>'+(m.completed?'완료 · '+esc(m.completed.slice(0,10)):'진행 전 / 진행 중')+'</p>'+(s==='C'?'<p>전체 '+m.total+' · 말해본 활동 '+m.spoken+' · 도움 '+m.help+'</p><p>느낌: '+esc(m.feelings.join(', ')||'아직 없음')+'</p>':'<p>전체 '+m.total+' · 첫 선택 정답 '+m.correct+'/'+m.answered+' 응답 · 재시도 '+m.retries+' · 힌트 '+m.hints+(s==='B'?' · 다시 듣기 '+m.relisten:'')+'</p>')+'</article>';}).join('')+'</div>';
    if(week===12)html+='<h3>1주차와 12주차 참고 기록</h3><p class="quiet">문항 구성이 달라 직접적인 점수 비교는 하지 않아요. 활동한 양과 도움 사용을 함께 살펴봐요.</p><div class="table-wrap"><table><tr><th>항목</th><th>1주차</th><th>12주차</th></tr>'+['A','B','C'].map(s=>{const detail=w=>{const m=metrics(w,s);return s==='C'?'말하기 '+m.spoken+'/'+m.total+', 도움 '+m.help:'첫 선택 '+m.correct+'/'+m.answered+', 힌트 '+m.hints+', 다시 듣기 '+m.relisten;};return '<tr><td>'+s+' '+W[week][s].title+'</td><td>'+detail(1)+'</td><td>'+detail(12)+'</td></tr>';}).join('')+'</table></div>';
    html+='<h3>기존 영어 기록 클라우드로 이전</h3><p class="quiet">희윤컴에서 완료 기록을 먼저 이전해주세요. 이 기기의 기존 기록은 자동 업로드하지 않아요. 서로 다른 기록은 충돌 보류합니다.</p><div class="actions"><button class="btn" id="backup">JSON 백업 다운로드</button><button class="btn" id="compare">읽기 전용 비교</button><button class="btn primary" id="migrate" '+(report?'':'disabled')+'>이전하기</button></div><p id="migration-result" role="status">'+(report?'이 기기 세션 '+report.localCount+' · 클라우드 세션 '+report.cloudCount+' · 신규 '+report.entries.filter(e=>e.status==='신규').length+' · 동일 '+report.entries.filter(e=>e.status==='동일').length+' · 충돌 '+report.entries.filter(e=>e.status==='충돌 보류').length:'비교 후 이전할 수 있어요.')+'</p>'+(report?'<ul>'+report.entries.map(e=>'<li>'+esc(e.key)+' · '+esc(e.status)+'</li>').join('')+'</ul>':'')+(Object.entries(snapshot.conflicts).length?'<p>충돌 보류: '+Object.entries(snapshot.conflicts).map(([k,v])=>esc(k+' '+v)).join(' / ')+'</p>':'');
    $('parent').innerHTML=html;
    $('backup').onclick=()=>{const blob=new Blob([JSON.stringify({exportedAt:now(),state,original:localStorage.getItem(M.BACKUP),sync:snapshot},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='heeyoon-english-v2-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    $('compare').onclick=async()=>{try{report=await cloud.compare();renderParent();}catch{$('migration-result').textContent='클라우드 비교 연결을 기다리고 있어요. 이 기기의 기록은 그대로 유지됩니다.';}};
    $('migrate').onclick=async()=>{$('migrate').disabled=true;try{await cloud.migrate();report=await cloud.compare();renderParent();}catch{$('migration-result').textContent='이전하지 못한 기록은 이 기기에 남아 있어요. 연결 후 다시 비교해주세요.';}};
  }
  window.addEventListener('storage',event=>{if(event.key===M.KEY){try{state=M.load(localStorage);render();}catch{}}});
  if(window.speechSynthesis)window.speechSynthesis.addEventListener('voiceschanged',()=>{ttsNotice='';});
  render();EnglishCloud.connect(cloud);
})();
