// Independent daily plans; legacy task records are read only through the adapter.
window.initDailyPlans = function ({key, ids, TASKS, firstStart, refresh}) {
  const STORAGE_KEY = 'heeyoon-today-board:daily-plans:v1';
  const rules = {deadline: '20:00'};
  const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  let draft = null, currentDay = key();
  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {version: 1, days: {}};
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !data.days || typeof data.days !== 'object' || Array.isArray(data.days)) throw Error('Invalid plans');
    return data;
  }
  const orderFor = (order, today) => [...new Set([...(Array.isArray(order) ? order : []).filter(id => today.includes(id)), ...today])];
  const names = order => (Array.isArray(order) ? order : []).filter(id => Object.hasOwn(TASKS,id)).map(id => TASKS[id].name).join(' → ');
  function guidance(plan, date) {
    if (firstStart(date)) return '🌷 첫 미션을 시작했어요. 내 순서대로 하나씩 해봐요.';
    return Date.now() >= new Date(date+'T'+plan.firstStartTime+':00').getTime()
      ? '⏰ 내가 정한 시간이 지났어요. 이제 첫 미션을 시작해볼까요?'
      : plan.firstStartTime+'까지는 자유시간이에요 🧸';
  }
  function timeMessage(time) {
    if (!validTime(time)) return '아직 시작시간을 정하지 않았어요';
    const [hour, minute] = time.split(':');
    return '💗 오늘은 '+(Number(hour)%12||12)+':'+minute+'에 시작하기로 했어요!';
  }
  function render() {
    const box = document.getElementById('dailyPlan'), date = key(), today = ids(new Date());
    if (draft?.date !== date) draft = null;
    if (!today.length) { box.innerHTML = ''; return; }
    let saved;
    try { saved = load().days[date]; }
    catch { box.innerHTML = '<section class="daily-plan">계획 기록을 불러오지 못했어요. 저장 공간을 확인한 뒤 다시 열어주세요.</section>'; return; }
    if (saved && validTime(saved.firstStartTime) && !draft) {
      box.innerHTML = `<section class="daily-plan"><h3>🌷 희윤이의 오늘 계획</h3><p>첫 시작 <b>${saved.firstStartTime}</b> · 마감 <b>${validTime(saved.deadline)?saved.deadline:rules.deadline}</b></p><p class="plan-route"><b>오늘 순서</b><br>${names(orderFor(saved.taskOrder,today))}</p><p class="plan-promise" id="planGuidance"></p><button class="btn" id="editDailyPlan">계획 다시 보기/수정</button></section>`;
      document.getElementById('planGuidance').textContent = guidance(saved,date);
      document.getElementById('editDailyPlan').onclick = () => { draft = {date, firstStartTime:saved.firstStartTime, taskOrder:orderFor(saved.taskOrder,today)}; render(); };
      return;
    }
    draft ||= {date, firstStartTime:'', taskOrder:[...today]};
    draft.taskOrder = orderFor(draft.taskOrder,today);
    box.innerHTML = `<section class="daily-plan"><h3>🏠 희윤아, 다녀왔어?</h3><p>공부하기 전에 오늘 계획부터 세워볼까요?<br>계획을 세우고 나면 편하게 쉬어도 돼요 💗</p><b>⏰ 오늘 첫 공부는 언제 시작할까?</b><div class="plan-times">${['16:00','16:30','17:00'].map(t=>`<button class="choice ${draft.firstStartTime===t?'active':''}" data-first-time="${t}" aria-pressed="${draft.firstStartTime===t}">${t}</button>`).join('')}<button class="btn" id="customPlanTime">직접 정하기</button></div><p class="plan-time-message" id="planTimeMessage" aria-live="polite">${timeMessage(draft.firstStartTime)}</p><label class="plan-custom" id="planCustomField" hidden>시작시간 직접 정하기 <input id="firstPlanTime" aria-label="오늘 첫 공부 시작시간" type="time" step="300" value="${validTime(draft.firstStartTime)?draft.firstStartTime:''}"></label><button class="btn" id="clearPlanTime" ${validTime(draft.firstStartTime)?'':'hidden'}>시간 선택 취소</button><p class="plan-hint">오늘 공부의 첫 시작만 약속해요.</p><b>오늘 하고 싶은 순서</b><ol class="plan-order">${draft.taskOrder.map((id,i)=>`<li><span>${i+1}. ${TASKS[id].icon} ${TASKS[id].name}</span><button class="btn" data-move="${i}" data-direction="-1" aria-label="${TASKS[id].name} 위로" ${i===0?'disabled':''}>↑</button><button class="btn" data-move="${i}" data-direction="1" aria-label="${TASKS[id].name} 아래로" ${i===draft.taskOrder.length-1?'disabled':''}>↓</button></li>`).join('')}</ol><div class="plan-promise plan-deadline">🌙 오늘의 약속<br><b>저녁 8시까지 모두 완료하기</b></div><p id="planError" role="status"></p><button class="btn primary plan-submit" id="saveDailyPlan">💗 오늘 계획 완료! 이제 쉬러 가기</button>${saved?'<button class="btn plan-submit" id="cancelDailyPlan">수정 취소</button>':''}</section>`;
    box.querySelectorAll('[data-first-time]').forEach(b => b.onclick = () => {draft.firstStartTime=draft.firstStartTime===b.dataset.firstTime?'':b.dataset.firstTime;render();});
    document.getElementById('firstPlanTime').oninput = e => {draft.firstStartTime=e.target.value;document.getElementById('clearPlanTime').hidden=!validTime(draft.firstStartTime);document.getElementById('planTimeMessage').textContent=timeMessage(draft.firstStartTime);box.querySelectorAll('[data-first-time]').forEach(b=>{const selected=b.dataset.firstTime===draft.firstStartTime;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});};
    document.getElementById('clearPlanTime').onclick = () => {draft.firstStartTime='';render();document.getElementById('customPlanTime').focus();};
    document.getElementById('customPlanTime').onclick = () => {document.getElementById('planCustomField').hidden=false;const input=document.getElementById('firstPlanTime');input.focus();try {input.showPicker();} catch {}};
    box.querySelectorAll('[data-move]').forEach(b => b.onclick = () => {
      const i=+b.dataset.move, j=i+Number(b.dataset.direction);
      [draft.taskOrder[i],draft.taskOrder[j]]=[draft.taskOrder[j],draft.taskOrder[i]];render();
      box.querySelector(`[data-move="${j}"][data-direction="${b.dataset.direction}"]`)?.focus();
    });
    document.getElementById('cancelDailyPlan')?.addEventListener('click',()=>{draft=null;render();});
    document.getElementById('saveDailyPlan').onclick = () => {
      if(key()!==date){draft=null;refresh();return;}
      if(!validTime(draft.firstStartTime)){document.getElementById('planError').textContent='첫 공부를 시작할 시간을 골라주세요 💗';return;}
      try {
        const data=load();data.days[date]={firstStartTime:draft.firstStartTime, taskOrder:[...draft.taskOrder], deadline:rules.deadline, updatedAt:new Date().toISOString()};
        localStorage.setItem(STORAGE_KEY,JSON.stringify(data));draft=null;render();renderRecords();
      } catch {document.getElementById('planError').textContent='계획을 저장하지 못했어요. 저장 공간을 확인하고 다시 눌러주세요.';}
    };
  }
  function renderRecords() {
    const box=document.getElementById('planRecords');let plans;
    try {plans=load().days;} catch {box.textContent='계획 기록을 불러오지 못했어요.';return;}
    box.innerHTML=Object.keys(plans).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&validTime(plans[d]?.firstStartTime)).sort().reverse().map(date=>{
      const p=plans[date],actual=firstStart(date),delta=actual?Math.round((Date.parse(actual)-new Date(date+'T'+p.firstStartTime+':00').getTime())/60000):null;
      const time=actual?new Date(actual).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false}):'아직 시작 기록 없음';
      return `<details class="plan-record"><summary>${date}</summary>계획한 첫 시작: ${p.firstStartTime}<br>실제 첫 시작: ${time}<br>차이: ${delta===null?'—':(delta>0?'+':'')+delta+'분'}<br>마감: ${validTime(p.deadline)?p.deadline:rules.deadline}<p class="plan-route">계획한 순서<br>${names(p.taskOrder)}</p></details>`;
    }).join('')||'<p>아직 저장한 오늘 계획이 없어요.</p>';
  }
  setInterval(()=>{
    if(key()!==currentDay){currentDay=key();draft=null;refresh();}
    else {const el=document.getElementById('planGuidance');if(el)try{const p=load().days[key()];if(p)el.textContent=guidance(p,key());}catch{}}
  },15000);
  return {render,renderRecords};
};
