(() => {
'use strict';
const KEY='heeyoon-literacy-board:v2', lessons=window.LITERACY_V2;
const fresh=()=>({version:2,sessions:{}});
let warning='', state=load(), current=next().id, active=false, question=0;
const labels={green:'🟢 혼자 해결했어요',yellow:'🟡 다시 읽고 해결했어요',blue:'🔵 도움을 받고 이해했어요'};
function load(){try{const raw=localStorage.getItem(KEY);if(!raw)return fresh();const s=JSON.parse(raw);if(s.version!==2||!s.sessions||typeof s.sessions!=='object'||Array.isArray(s.sessions))throw Error();return s;}catch{warning='저장된 V2 기록을 읽지 못했어요. 기존 기록 보호를 위해 이번 화면의 저장을 중단했어요. 브라우저 저장 설정을 확인해 주세요.';return fresh();}}
function save(){if(warning)return;try{localStorage.setItem(KEY,JSON.stringify(state));}catch{warning='기록을 저장하지 못했어요. 저장 공간 또는 브라우저 설정을 확인해 주세요. 현재 화면을 닫으면 새 기록이 사라질 수 있어요.';document.getElementById('storageNotice').textContent=warning;}}
function record(l){return state.sessions[l.id]||{week:l.week,session:l.session,questions:{}};}
function ensure(l){return state.sessions[l.id]||=record(l);}
function next(){return lessons.find(l=>!record(l).completedAt)||lessons[23];}
function qs(l,i){return ensure(l).questions[i]||={week:l.week,session:l.session,first:null,final:null,confidence:null,firstConfidence:null,attempts:[],evidence:[],firstEvidence:null,retried:false,hintUsed:false,helpUsed:false,revealed:false,resolved:false,result:null,completedAt:null};}
function render(){
 const l=lessons.find(x=>x.id===current), n=next(), done=lessons.filter(x=>record(x).completedAt).length;
 document.getElementById('storageNotice').textContent=warning;
 document.getElementById('bar').style.width=`${done/24*100}%`;
 document.getElementById('progressText').textContent=`${done} / 24회 · ${Math.floor(done/24*100)}%`;
 const weeksDone=Array.from({length:12},(_,i)=>lessons.filter(x=>x.week===i+1).every(x=>record(x).completedAt)).filter(Boolean).length;
 document.getElementById('currentLabel').textContent=`12주 중 ${weeksDone}주 완료 · ${done===24?'전체 완료':`이번 학습 ${n.week}주 ${n.session}`} · 지금 보는 내용 ${l.week}주 ${l.session}`;
 document.getElementById('weeks').innerHTML=Array.from({length:12},(_,i)=>{const pair=lessons.slice(i*2,i*2+2);return `<section class="week ${l.week===i+1?'active':''}"><span class="num">${i+1}주 · ${i<4?'기본기':i<8?'적용':i<11?'실전':'재진단'}</span><h3>${pair[0].icon} ${pair[0].theme}</h3>${pair.map(x=>`<button class="btn" data-session="${x.id}" ${x.id===current?'aria-current="true"':''}>${x.session} · ${x.session==='A'?'기술 배우기':'실전 적용'}<small>${record(x).completedAt?'✓ 완료':x.id===n.id?'▶ 이번 학습':'👀 미리보기'}</small></button>`).join('')}</section>`;}).join('');
 document.querySelectorAll('[data-session]').forEach(b=>b.onclick=()=>{current=b.dataset.session;active=false;question=0;render();document.getElementById('study').scrollIntoView({block:'start'});});
 renderParent();renderStudy(l);
}
function media(l,s){return `<div class="passage">${l.passage.map((p,i)=>s?`<button class="evidence" data-ref="${i+1}" aria-pressed="${s.evidence.includes(i+1)}" ${s.resolved||s.revealed||s.final===null||!s.confidence?'disabled':''}><span>${i+1}문단 · 근거로 선택</span>${p}</button>`:`<p><strong>${i+1}문단</strong> ${p}</p>`).join('')}</div>${l.table?`<div class="table-wrap"><table class="data-table"><caption>자료 · 근거 ${l.passage.length+1}</caption><thead><tr>${l.table.headers.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${l.table.rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${s?`<button class="evidence" data-ref="${l.passage.length+1}" aria-pressed="${s.evidence.includes(l.passage.length+1)}" ${s.resolved||s.revealed||s.final===null||!s.confidence?'disabled':''}>📊 표를 근거로 선택</button>`:''}`:''}`;}
function renderStudy(l){
 const root=document.getElementById('study');root.classList.add('show');
 const r=record(l), s=active?qs(l,question):null, q=l.questions[question];
 root.innerHTML=`<section class="card"><div class="head"><div><div class="qnum">${l.week}주 ${l.session} · ${l.session==='A'?'기술 배우기':'실전 적용'} · 10~15분</div><h2>${l.title}</h2></div><span class="skill">${l.skill}</span></div>${!active?`<p class="intro">지문을 천천히 읽어보세요. 준비되면 한 문제씩 풀어볼 거예요.</p><p class="intro"><strong>이 회차에서 연습할 읽기 기술 · ${l.skill}</strong><br>${l.tip}</p>${media(l,null)}<button class="btn primary" id="begin">${r.completedAt?'완료한 풀이 돌아보기':Object.keys(r.questions).length?'이어서 학습하기':'학습 시작하기'}</button>`:`${l.session==='A'?`<p class="intro">🔎 읽기 도구: ${l.tip}</p>`:''}<div class="qcard"><div class="qnum">${question+1} / ${l.questions.length} 문제</div><h3 id="questionTitle" tabindex="-1">${q.q}</h3><p class="intro" id="stepStatus" role="status">${stepText(s)}</p><p class="qnum">① 문제를 읽고 ${s.attempts.length?'답을 다시':'첫 답을'} 선택해요</p><div class="options">${q.options.map((o,j)=>`<button class="option ${s.final===j?'selected':''}" data-answer="${j}" aria-pressed="${s.final===j}" ${s.resolved||s.revealed?'disabled':''}>${j+1}. ${o}</button>`).join('')}</div><p class="qnum">② 처음 답의 확신 정도${s.attempts.length?' · 처음 기록을 유지해요':'를 선택해요'}</p><div class="actions" aria-label="확신 정도">${['sure','unsure'].map((v,i)=>`<button class="btn" data-confidence="${v}" aria-pressed="${s.confidence===v}" ${s.final===null||s.resolved||s.revealed||s.attempts.length?'disabled':''}>${i?'🤔 조금 헷갈려요':'🙂 확실해요'}</button>`).join('')}</div><p class="intro">③ 답을 뒷받침하는 문단 또는 표를 눌러요. 여러 곳을 선택해도 좋아요. 선택 표시도 함께 돌아봐요.</p>${media(l,s)}<div id="answerFeedback" tabindex="-1" class="feedback show ${s.resolved?'ok':s.attempts.length?'retry':''}" role="status">${feedback(q,s,l)}</div><div class="actions">${!s.resolved&&!s.revealed?`<button class="btn primary" id="check" ${s.final===null||!s.confidence||!s.evidence.length?'disabled':''}>답 확인</button>${s.attempts.length>=2?`<button class="btn pink" id="hint">${s.hintUsed?'힌트 다시 보기':'🔎 힌트 열기'}</button>${s.hintUsed?'<button class="btn" id="reveal">해설 함께 읽기</button>':''}`:''}`:''}${s.revealed&&!s.resolved?'<button class="btn primary" id="understood">근거를 읽고 이해했어요</button>':''}</div><div class="actions"><button class="btn" id="prev" ${question===0?'disabled':''}>← 이전 문제</button><button class="btn" id="next" ${!s.resolved||question===l.questions.length-1?'disabled':''}>다음 문제 →</button></div></div><div class="finish"><button class="btn primary" id="finish" ${r.completedAt||!l.questions.every((_,i)=>r.questions[i]?.resolved)?'disabled':''}>${r.completedAt?'✓ 회차 완료':'이번 회차 학습 완료 ✓'}</button></div>${r.completedAt?`<p>${labels[r.result]} · ${new Date(r.completedAt).toLocaleDateString('ko-KR')}</p><button class="btn" id="continue">다음 학습 살펴보기 →</button>`:''}`}</section>`;
 if(!active){document.getElementById('begin').onclick=()=>{active=true;question=Math.max(0,l.questions.findIndex((_,i)=>!r.questions[i]?.resolved));render();document.getElementById('questionTitle').focus();};return;}
 root.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{s.final=+b.dataset.answer;save();renderStudy(l);});
 root.querySelectorAll('[data-confidence]').forEach(b=>b.onclick=()=>{s.confidence=b.dataset.confidence;save();renderStudy(l);});
 root.querySelectorAll('[data-ref]').forEach(b=>b.onclick=()=>{const v=+b.dataset.ref;s.evidence=s.evidence.includes(v)?s.evidence.filter(x=>x!==v):[...s.evidence,v];save();renderStudy(l);});
 const on=(id,fn)=>{const e=document.getElementById(id);if(e)e.onclick=fn;};
 on('check',()=>{if(s.resolved||s.revealed||s.final===null||!s.confidence||!s.evidence.length)return;
  const correct=s.final===q.answer;
  if(!s.attempts.length){s.first=s.final;s.firstConfidence=s.confidence;s.firstEvidence=[...s.evidence];}
  s.attempts.push({choice:s.final,evidence:[...s.evidence],correct,at:new Date().toISOString()});
  s.evidenceCorrect=q.refs.every(v=>s.evidence.includes(v));
  if(correct){finishQuestion(s,s.hintUsed?'blue':s.attempts.length===1?'green':'yellow');}
  else{s.retried=true;s.final=null;s.evidence=[];}
  save();render();document.getElementById('answerFeedback').focus();
 });
 on('hint',()=>{s.hintUsed=true;s.helpUsed=true;save();render();});
 on('reveal',()=>{s.revealed=true;s.helpUsed=true;save();render();});
 on('understood',()=>{s.final=q.answer;s.evidenceCorrect=q.refs.every(v=>s.evidence.includes(v));finishQuestion(s,'blue');save();render();});
 on('prev',()=>{if(question<=0)return;question--;renderStudy(l);document.getElementById('questionTitle').focus();});
 on('next',()=>{if(!s.resolved||question>=l.questions.length-1)return;question++;renderStudy(l);document.getElementById('questionTitle').focus();});
 on('finish',()=>{if(!l.questions.every((_,i)=>r.questions[i]?.resolved))return;r.completedAt=new Date().toISOString();const vals=Object.values(r.questions);r.result=vals.some(x=>x.result==='blue')?'blue':vals.some(x=>x.result==='yellow')?'yellow':'green';save();render();});
 on('continue',()=>{current=next().id;active=false;question=0;render();});
}
function stepText(s){
 if(s.resolved)return '해설 · 정답과 근거를 살펴봤다면 다음 문제로 넘어가요.';
 if(s.revealed)return '해설 · 근거를 읽은 뒤 이해했는지 확인해요.';
 if(s.hintUsed)return '도움 단계 · 아래 힌트를 읽고 다시 풀거나 해설을 함께 읽어요.';
 if(s.attempts.length>=2)return '두 번째 시도 후 · 아래에서 힌트를 열어볼 수 있어요.';
 if(s.attempts.length)return s.final===null?'다시 읽기 → 두 번째 시도 · 글을 다시 읽고 답과 근거를 새로 골라요.':s.evidence.length?'두 번째 시도 · 아래 답 확인을 눌러요.':'두 번째 시도 · 답을 뒷받침하는 근거를 다시 골라요.';
 if(s.final===null)return '첫 시도 · 문제를 읽고 답을 하나 골라요.';
 if(!s.confidence)return '확신도 선택 · 내 답이 얼마나 확실한가요?';
 if(!s.evidence.length)return '근거 선택 · 아래 글에서 답을 뒷받침하는 문단이나 표를 눌러요.';
 return '답 확인 · 선택한 근거를 살핀 뒤 아래 답 확인을 눌러요.';
}
function finishQuestion(s,result){s.resolved=true;s.result=result;s.completedAt=new Date().toISOString();}
function feedback(q,s,l){
 if(s.resolved||s.revealed)return `${s.resolved?labels[s.result]:'정답과 근거를 함께 읽어요.'}<br><strong>정답: ${q.answer+1}. ${q.options[q.answer]}</strong><br>${q.evidence}<br>살펴볼 근거: ${q.refs.map(v=>v>l.passage.length?'표':v+'문단').join(', ')}${s.resolved?`<br>${s.evidenceCorrect?'선택한 근거에 핵심 단서가 들어 있어요.':'내가 표시한 곳과 위의 핵심 근거를 비교해 보세요.'}`:''}`;
 if(s.hintUsed)return `🔎 힌트: ${q.hint}<br>다시 선택해 보거나 해설을 함께 읽을 수 있어요.`;
 if(s.attempts.length>=2)return '한 번 더 생각했어요. 이제 힌트를 열어 도움을 받을 수 있어요.';
 if(s.attempts.length)return '한 번 더 읽어볼까요? 아직 정답은 보여 주지 않을게요. 답과 근거를 다시 골라 보세요.';
 return '서두르지 않아도 괜찮아요. 답을 고른 이유를 글에서 찾아요.';
}
function renderParent(){
 const all=lessons.flatMap(l=>Object.values(record(l).questions).filter(s=>s.attempts?.length)), resolved=all.filter(s=>s.resolved),correct=all.filter(s=>s.attempts[0].correct),over=all.filter(s=>s.firstConfidence==='sure'&&!s.attempts[0].correct),n=next();
 const stats=(list)=>{const c=list.filter(s=>s.attempts?.length);return c.length?`${c.filter(s=>s.attempts[0].correct).length}/${c.length} (${Math.round(c.filter(s=>s.attempts[0].correct).length/c.length*100)}%)`:'아직 기록 없음';};
 document.getElementById('parentStats').innerHTML=`<div class="parent-grid"><p>이번 학습 주차: ${n.week}주 (달력 주차가 아닌 학습 순서 기준)<br>${lessons.filter(l=>l.week===n.week).map(l=>`${l.session}: ${record(l).completedAt?'완료':'미완료'} · ${l.title}`).join('<br>')}</p><p>${Object.entries(labels).map(([k,v])=>`${v}: ${resolved.filter(s=>s.result===k).length}문제`).join('<br>')}</p><p>첫 제출 정답률: ${all.length?`${correct.length}/${all.length} (${Math.round(correct.length/all.length*100)}%)`:'아직 기록 없음'}<br>다시 읽고 맞힌 문제: ${resolved.filter(s=>s.result==='yellow').length}<br>힌트 사용 문제: ${all.filter(s=>s.hintUsed).length}<br>“확실해요”라고 했지만 첫 제출이 틀린 문제: ${over.length}<br>해결했지만 핵심 근거 일부를 표시하지 않은 문제: ${resolved.filter(s=>!s.evidenceCorrect).length}</p><p>재진단 참고 · 첫 제출 기준<br>1주: ${stats(lessons.filter(l=>l.week===1).flatMap(l=>Object.values(record(l).questions)))}<br>12주: ${stats(lessons.filter(l=>l.week===12).flatMap(l=>Object.values(record(l).questions)))}<br><small>서로 다른 글과 난도이므로 표준화된 능력 점수나 직접적인 성장률은 아닙니다.</small></p><details><summary>회차별 상세 기록</summary>${lessons.map(l=>`<p><b>${l.week}주 ${l.session} · ${l.title}</b> · ${record(l).completedAt?new Date(record(l).completedAt).toLocaleDateString('ko-KR'):'미완료'}<br>${Object.entries(record(l).questions).filter(([,s])=>s.attempts.length).map(([i,s])=>`${+i+1}번: 첫 선택 ${s.first+1} → 최종 ${s.final===null?'생각 중':s.final+1} · ${s.firstConfidence==='sure'?'확실':'헷갈림'} · ${s.result?labels[s.result]:'진행 중'} · 근거 ${s.evidence.join(', ')||'다시 선택 중'} · 시도 ${s.attempts.length}회 · 힌트 ${s.hintUsed?'사용':'없음'}`).join('<br>')}</p>`).join('')}</details></div>`;
}
document.getElementById('reset').onclick=()=>{if(warning)return;if(confirm('V2 학습 기록만 초기화할까요? 기존 V1 및 오늘 할 일 기록은 유지됩니다.')){state=fresh();current=lessons[0].id;active=false;question=0;save();render();}};
render();
})();
