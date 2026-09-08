(() => {
  'use strict';
  const KEY = 'heeyoon-english-board:v1';
  const lessons = window.ENGLISH_WEEK;
  const fresh = () => ({version:1,sessions:{}});
  const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let storageWarning='',state=load(),current=lessons.find(l=>!state.sessions[l.id]?.completedAt)?.id||'A',active=false,index=0;
  let audio={token:0,busy:false,message:'',failed:false},timer;
  function load() {
    try {
      const raw=localStorage.getItem(KEY);if(!raw)return fresh();
      const s=JSON.parse(raw);
      if(s?.version!==1||!s.sessions||Array.isArray(s.sessions))throw Error();
      for(const r of Object.values(s.sessions)) {
        if(!r||!r.items||Array.isArray(r.items))throw Error();
        for(const q of Object.values(r.items))if(!q||!Array.isArray(q.attempts)||!Array.isArray(q.audioErrors))throw Error();
      }
      return s;
    } catch {storageWarning='영어 기록을 읽지 못했어요. 기존 기록을 보호하기 위해 저장을 멈췄어요. 브라우저 저장 설정을 확인해 주세요.';return fresh();}
  }
  function save(){if(storageWarning)return;try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageWarning='영어 기록을 저장하지 못했어요. 이 화면을 닫기 전에 브라우저 저장 공간을 확인해 주세요.';}document.getElementById('storageNotice').textContent=storageWarning;}
  function record(id=current){return state.sessions[id]||{week:1,session:id,items:{},completedAt:null};}
  function item(){const r=state.sessions[current]||=record();return r.items[index]||={choice:null,firstChoice:null,firstCorrect:null,attempts:[],hintUsed:false,explanationUsed:false,resolved:false,result:null,completedAt:null,playCount:0,completedPlays:0,firstPlayedAt:null,audioErrors:[],audioUnavailable:false,skipped:false,spoken:false,comfort:null,expressionChoice:null,spokenText:null,helpUsed:false,listeningEligible:null};}
  const lesson=()=>lessons.find(l=>l.id===current);
  const now=()=>new Date().toISOString();
  function stopAudio(){audio.token++;clearTimeout(timer);if('speechSynthesis' in window){try{window.speechSynthesis.cancel();}catch{}}audio={token:audio.token,busy:false,message:'',failed:false};}
  function spokenText(q,s){return q.text.replace('{choice}',s.expressionChoice||'…');}
  function focusQuestion(){document.getElementById('activityTitle')?.focus();}
  function render(){
    document.getElementById('storageNotice').textContent=storageWarning;
    document.getElementById('stamps').innerHTML=lessons.map(l=>`<span class="stamp" aria-label="${l.id} ${record(l.id).completedAt?'완료':'미완료'}">${record(l.id).completedAt?'✓':l.id}</span>`).join('');
    document.getElementById('sessions').innerHTML=lessons.map(l=>`<button class="session" data-session="${l.id}" aria-pressed="${l.id===current}"><span class="icon">${l.icon}</span><strong>1주 ${l.id} · ${l.name.slice(0,3)}</strong><small>${record(l.id).completedAt?'✓ 탐험 완료':Object.values(record(l.id).items).some(s=>s.attempts.length||s.spoken||s.playCount||s.skipped)?'이어서 탐험':'시작 전'}</small></button>`).join('');
    document.querySelectorAll('[data-session]').forEach(b=>b.onclick=()=>{stopAudio();current=b.dataset.session;active=false;index=0;render();});
    renderStudy();renderParent();
  }
  function renderStudy(){
    const l=lesson(),root=document.getElementById('study'),r=record();
    if(!active){root.innerHTML=`<span class="eyebrow">WEEK 01 / ${l.id}</span><h2>${l.icon} ${l.name}</h2><p>${l.intro}</p><p class="quiet">약 10~15분 · 한 번에 한 활동씩<br>모르면 다시 생각하거나 도움을 받아도 좋아요.</p><button class="btn primary" data-action="begin">${r.completedAt?'탐험 완료 화면 보기':Object.keys(r.items).length?'이어서 탐험하기':'탐험 시작하기'}</button>`;return;}
    if(r.completedAt){root.innerHTML=`<div class="celebrate"><div class="big">🎉</div><h2 id="activityTitle" tabindex="-1">영어 탐험 완료!</h2><p>오늘도 영어랑<br>조금 더 친해졌어요.</p><strong lang="en">⭐ Great job!</strong><p class="quiet">1주 ${current} · ${l.name}${Object.values(r.items).some(s=>s.skipped)?'<br>남겨 둔 활동은 부모님과 함께 살펴봐요.':''}</p><button class="btn" data-action="home">다른 탐험 살펴보기</button></div>`;return;}
    const q=l.items[index],s=item(),speaking=current==='C',canAnswer=current!=='B'||s.completedPlays>0;
    root.innerHTML=`<span class="eyebrow">${l.icon} ${l.name} · ${index+1} / ${l.items.length} ${speaking?'활동':'문제'}</span><h2 id="activityTitle" tabindex="-1">${escape(q.prompt)}</h2>
      ${current==='A'?`<div class="english" lang="en">${escape(q.text)}</div>`:''}
      ${speaking?`<p class="quiet">듣기 → 내 목소리로 말하기 → 말해봤어요!<br>작게 말해도 괜찮아요. 오늘은 듣기만 해도 좋아요.</p>${q.choices?`<div class="options">${q.choices.map(([label,value])=>`<button class="option" data-expression="${value}" aria-pressed="${s.expressionChoice===value}" ${s.resolved?'disabled':''}>${label}</button>`).join('')}</div>`:''}<div class="english" lang="en">${escape(spokenText(q,s))}</div>`:''}
      ${current!=='A'?`<button class="listen" data-action="listen" ${audio.busy||(speaking&&q.choices&&!s.expressionChoice)||s.resolved?'disabled':''}>${audio.busy?'🔊 재생 중…':s.playCount?'🔊 다시 듣기':'🔊 듣기'}</button><p class="audio-status" role="status">${escape(audio.message||'버튼을 누르면 영어 음성이 나와요.')}</p>${!s.resolved?'<button class="btn" data-action="audioTrouble">소리가 안 들려요</button>':''}${audio.failed||s.audioUnavailable?`<p class="quiet">이 기기에서 음성을 듣기 어려워요. 소리 설정을 확인하고 다시 시도해 주세요.${current==='B'?' 지금은 원문을 보지 않고 이 활동을 남겨둘 수 있어요.':' 문장을 보고 말하거나 오늘은 듣기만 선택할 수 있어요.'}</p>${current==='B'&&!s.resolved?'<button class="btn" data-action="skipAudio">이번 듣기는 나중에 할게요</button>':''}`:''}`:''}
      ${!speaking?`<div class="options">${q.options.map((o,i)=>`<button class="option" data-choice="${i}" aria-pressed="${s.choice===i}" ${s.resolved||s.explanationUsed||!canAnswer||audio.busy?'disabled':''}>${escape(o)}</button>`).join('')}</div>${!canAnswer&&!s.resolved?'<p class="quiet">먼저 듣기를 끝까지 듣고 골라봐요.</p>':''}`:''}
      <div class="feedback" id="feedback" role="status" tabindex="-1">${feedback(q,s)}</div>
      ${speaking?`<fieldset class="comfort"><legend>말하기는 어땠나요? <span class="quiet">(선택)</span></legend><div class="actions">${[['easy','😊 편했어요'],['shy','🙂 조금 쑥스러워요'],['hard','🤝 도움이 필요해요']].map(([v,label])=>`<button class="option" data-comfort="${v}" aria-pressed="${s.comfort===v}">${label}</button>`).join('')}</div></fieldset>`:''}
      <div class="actions">${!s.resolved?(speaking?`<button class="btn" data-action="help">🤝 말하기 도움</button><button class="btn primary" data-action="spoken" ${q.choices&&!s.expressionChoice?'disabled':''}>😊 말해봤어요!</button><button class="btn" data-action="skipSpeaking">오늘은 듣기만 할게요</button>`:s.explanationUsed?'<button class="btn primary" data-action="understood">이제 이해했어요</button>':`<button class="btn primary" data-action="check" ${s.choice===null||!canAnswer||audio.busy?'disabled':''}>답 확인</button>${s.attempts.length?'<button class="btn" data-action="hint">🔎 힌트 보기</button>':''}${s.hintUsed?'<button class="btn" data-action="explain">함께 이해하기</button>':''}`):`<button class="btn primary" data-action="next">${index===l.items.length-1?'이번 탐험 마치기':'다음 활동 →'}</button>`}</div>`;
  }
  function feedback(q,s){
    if(s.skipped)return current==='B'?'이 듣기는 남겨두었어요. 다른 활동도 만나봐요.':'오늘은 듣기만 골랐어요. 내 속도로 해도 괜찮아요.';
    if(current==='C')return s.spoken?'내 목소리로 표현해봤어요! 다음 탐험도 함께해요.':s.helpUsed?escape(q.help):'';
    if(s.resolved||s.explanationUsed)return `${s.resolved?'잘 살펴봤어요!':'함께 뜻을 살펴봐요.'}${current==='B'?`<div lang="en">${escape(q.text)}</div>`:''}<p>${escape(q.explanation)}</p><strong>${escape(q.options[q.answer])}</strong>`;
    if(s.hintUsed)return `🔎 ${escape(q.hint)}<br>다시 골라보거나 함께 이해하기를 눌러요.`;
    if(s.attempts.length)return '다시 생각해볼까요? 한 번 더 살펴보고 골라요. 필요하면 힌트를 열어도 괜찮아요.';
    return '';
  }
  function resolve(s,result){s.resolved=true;s.result=result;s.completedAt=now();}
  function act(action){
    if(action==='begin'){active=true;index=Math.max(0,lesson().items.findIndex((_,i)=>!record().items[i]?.resolved));render();focusQuestion();return;}
    if(action==='home'){stopAudio();active=false;render();return;}
    if(!active||record().completedAt)return;
    const q=lesson().items[index],s=item();
    if(action==='listen'){play(q,s);return;}
    if(action==='audioTrouble'){stopAudio();s.audioUnavailable=true;audio.failed=true;audio.message='소리 설정이나 다른 브라우저를 확인해 주세요.';save();render();return;}
    if(action==='next'){if(!s.resolved)return;stopAudio();if(index===lesson().items.length-1){if(!lesson().items.every((_,i)=>record().items[i]?.resolved))return;record().completedAt=now();save();}else index++;render();focusQuestion();return;}
    if(s.resolved)return;
    if(action==='check'){
      if(s.choice===null||s.explanationUsed||audio.busy||(current==='B'&&!s.completedPlays))return;
      const correct=s.choice===q.answer;
      if(!s.attempts.length){s.firstChoice=s.choice;s.firstCorrect=correct;s.listeningEligible=current==='B'?s.completedPlays>0:null;}
      s.attempts.push({choice:s.choice,correct,at:now()});
      if(correct)resolve(s,s.hintUsed?'helped':s.attempts.length===1?'independent':'retry');else s.choice=null;
    }
    if(action==='hint'&&s.attempts.length)s.hintUsed=true;
    if(action==='explain'&&s.hintUsed)s.explanationUsed=true;
    if(action==='understood'&&s.explanationUsed){s.choice=q.answer;resolve(s,'helped');}
    if(action==='help'&&current==='C')s.helpUsed=true;
    if(action==='spoken'&&current==='C'){if(q.choices&&!s.expressionChoice)return;stopAudio();s.spoken=true;s.spokenText=spokenText(q,s);resolve(s,'spoken');}
    if(action==='skipSpeaking'&&current==='C'){stopAudio();s.skipped=true;resolve(s,'listenedOnly');}
    if(action==='skipAudio'&&current==='B'&&(audio.failed||s.audioUnavailable)){stopAudio();s.skipped=true;resolve(s,'audioUnavailable');}
    save();render();document.getElementById('feedback')?.focus();
  }
  document.getElementById('study').onclick=e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.action){act(b.dataset.action);return;}
    const s=item();
    if(b.dataset.choice!==undefined&&!s.resolved){s.choice=+b.dataset.choice;save();renderStudy();}
    if(b.dataset.expression&&!s.resolved){stopAudio();s.expressionChoice=b.dataset.expression;save();renderStudy();}
    if(b.dataset.comfort){s.comfort=b.dataset.comfort;save();render();}
  };
  // B 듣기와 C 따라 말하기가 같은 선택·로딩 경로를 사용합니다.
  function selectEnglishVoice(voices){
    const english=voices.filter(v=>/^en(?:[-_]|$)/i.test(v.lang));
    const score=v=>(/^en[-_]US$/i.test(v.lang)?100:0)+(/natural|neural|premium|enhanced|online/i.test(v.name)?20:0)+(/Google/i.test(v.name)?10:0)+(v.default?1:0);
    return english.sort((a,b)=>score(b)-score(a))[0]||null;
  }
  function withEnglishVoice(callback){
    const synth=window.speechSynthesis;
    const choose=()=>selectEnglishVoice(synth.getVoices());
    const ready=choose();if(ready){callback(ready);return;}
    // OS/browser voices can arrive after the first getVoices call.
    let finished=false,voiceTimer;
    const finish=voice=>{if(finished)return;finished=true;clearTimeout(voiceTimer);synth.removeEventListener?.('voiceschanged',changed);callback(voice);};
    const changed=()=>{const voice=choose();if(voice)finish(voice);};
    synth.addEventListener?.('voiceschanged',changed);
    voiceTimer=setTimeout(()=>finish(choose()),1800);
    changed();
  }
  function play(q,s){
    if(audio.busy||s.resolved)return;
    stopAudio();const token=audio.token;let settled=false;
    const fail=reason=>{if(token!==audio.token||settled)return;settled=true;clearTimeout(timer);audio.busy=false;audio.failed=true;audio.message=reason==='english-voice-unavailable'?'이 브라우저에 영어 음성이 없어요. 영어 음성이 지원되는 브라우저나 기기에서 다시 열어주세요.':'음성을 재생하지 못했어요. 다시 시도하거나 이 활동을 남겨둘 수 있어요.';s.audioUnavailable=true;s.audioErrors.push({reason,at:now()});save();render();};
    if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){fail('unsupported');return;}
    try {
      audio.busy=true;audio.message='영어 음성을 확인하고 있어요.';renderStudy();
      withEnglishVoice(voice=>{
      if(token!==audio.token)return;
      if(!voice){fail('english-voice-unavailable');return;}
      try {
      const utterance=new window.SpeechSynthesisUtterance(current==='C'?spokenText(q,s):q.text);
      utterance.lang='en-US';utterance.rate=1;utterance.pitch=1;
      utterance.voice=voice;
      audio.busy=true;audio.message='음성을 준비하고 있어요.';renderStudy();
      let started=false;
      utterance.onstart=()=>{if(token!==audio.token)return;started=true;clearTimeout(timer);s.playCount++;s.firstPlayedAt||=now();audio.message='🔊 '+voice.name+' · '+voice.lang+' · 속도 1.0';save();renderStudy();timer=setTimeout(()=>{fail('end-timeout');stopSpeech();},45000);};
      utterance.onend=()=>{if(token!==audio.token||settled)return;settled=true;clearTimeout(timer);audio.busy=false;audio.failed=false;if(started){s.completedPlays++;s.audioUnavailable=false;}audio.message=started?'재생을 마쳤어요. 한 번 더 들어도 좋아요.':'음성을 듣지 못했다면 소리가 안 들려요를 눌러주세요.';save();render();};
      utterance.onerror=e=>fail(e.error||'playback-error');
      timer=setTimeout(()=>{fail('start-timeout');stopSpeech();},8000);
      window.speechSynthesis.speak(utterance);
      }catch{fail('exception');}
      });
    }catch{fail('exception');}
  }
  function stopSpeech(){try{window.speechSynthesis?.cancel();}catch{}}
  window.addEventListener('pagehide',stopAudio);
  function renderParent(){
    document.getElementById('parentStats').innerHTML=lessons.map(l=>{
      const r=record(l.id),values=Object.values(r.items),answered=values.filter(s=>s.attempts.length),resolved=values.filter(s=>s.resolved);
      return `<article><h3>1주 ${l.id} · ${l.name}</h3><div>전체 ${l.id==='C'?'말하기 활동':'문제'}: ${l.items.length} · ${r.completedAt?'✓ 완료':'미완료'}</div>${l.id==='C'?`<div>말해봤어요: ${values.filter(s=>s.spoken).length} · 듣기만 선택: ${values.filter(s=>s.skipped).length}<br>도움 사용: ${values.filter(s=>s.helpUsed).length}활동<br>말하기 느낌: 편했어요 ${values.filter(s=>s.comfort==='easy').length} / 쑥스러워요 ${values.filter(s=>s.comfort==='shy').length} / 도움 필요 ${values.filter(s=>s.comfort==='hard').length}</div>`:`<div>첫 선택 정답: ${answered.filter(s=>s.firstCorrect).length} / 응답 ${answered.length}<br>다시 ${l.id==='A'?'읽고':'듣고'} 해결(힌트 없이): ${resolved.filter(s=>s.result==='retry').length}<br>힌트 사용: ${values.filter(s=>s.hintUsed).length} · 해설 도움: ${values.filter(s=>s.explanationUsed).length}${l.id==='B'?`<br>음성 첫 재생 문제: ${values.filter(s=>s.playCount).length} · 다시 듣기: ${values.reduce((n,s)=>n+Math.max(0,s.playCount-1),0)}회<br>음성 미실시로 남겨둠: ${values.filter(s=>s.skipped).length} · 재생 오류: ${values.reduce((n,s)=>n+s.audioErrors.length,0)}회`:''}</div>`}<details><summary>활동별 관찰 기록</summary><ul>${l.items.map((q,i)=>{const s=r.items[i];return `<li>${i+1}. ${q.skill}: ${!s?'시작 전':l.id==='C'?`${s.spoken?'말해봄':s.skipped?'듣기만':'진행 중'} · 도움 ${s.helpUsed?'사용':'없음'}`:`${s.skipped?'미실시':s.firstCorrect===null?'아직 응답 없음':s.firstCorrect?'첫 선택 정답':'첫 선택 후 재고려'} · 시도 ${s.attempts.length} · 힌트 ${s.hintUsed?'사용':'없음'}${l.id==='B'?` · 재생 시작 ${s.playCount} / 끝까지 재생 ${s.completedPlays}`:''}`}</li>`;}).join('')}</ul></details></article>`;
    }).join('')+'<p class="quiet">말하기는 아이의 자기보고이며 실제 발음이나 녹음을 분석하지 않습니다. 음성 미실시는 듣기 정답률에 포함하지 않습니다. 첫 선택은 처음 답 확인을 누른 답이며, 다시 듣기는 재생 시작 이벤트 기준입니다.</p>';
  }
  render();
})();
