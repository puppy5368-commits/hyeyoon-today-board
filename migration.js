/* Explicit, one-time local-to-family migration. Never runs automatically. */
(() => {
  'use strict';
  const tables=['board_preferences','task_schedules','daily_plans','task_records'];
  const labels={board_preferences:'부모설정',task_schedules:'미션 요일설정',daily_plans:'날짜별 계획',task_records:'미션 기록'};
  let plan=null;
  const $=id=>document.getElementById(id), clone=x=>JSON.parse(JSON.stringify(x));
  const localRows=()=>{const out=[];for(const [key,data] of [[BoardSync.MAIN,read(BoardSync.MAIN)],[BoardSync.PLANS,read(BoardSync.PLANS)]])for(const [id,row] of Object.entries(BoardSync.rows(key,data)||{}))out.push({...row,id,key});return out;};
  function read(key){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null}catch{return null}}
  function backup(){const payload={createdAt:new Date().toISOString(),keys:{}};for(const key of [BoardSync.MAIN,BoardSync.PLANS])payload.keys[key]=localStorage.getItem(key);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.download='heeyoon-board-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  async function inspect(){const rows=localRows();const result={rows,online:[],new:0,duplicate:0,conflict:0,blocked:0};const client=window.boardCloud.migrationClient?.();
    if(!client){result.blocked=rows.length;return result;}
    try{const {data:owner,error}=await client.rpc('heeyoon_family_owner');if(error)throw error;for(const table of tables){const {data,error:e}=await client.from(table).select('*').eq('user_id',owner);if(e)throw e;result.online.push(...data.map(x=>({table,raw:x})));}}
    catch{result.blocked=rows.length;return result;}
    for(const row of rows){const hit=result.online.find(x=>x.table===row.table&&Object.entries(row.pk).every(([k,v])=>String(x.raw[k])===String(v)));if(!hit)result.new++;else if(JSON.stringify(row.values)===JSON.stringify(Object.fromEntries(Object.keys(row.values).map(k=>[k,hit.raw[k]]))))result.duplicate++;else result.conflict++;}return result;
  }
  function render(r){plan=r;$('migrationSummary').hidden=false;$('migrationActions').hidden=false;$('migrationSummary').innerHTML=`<p>${labels.board_preferences} ${r.rows.filter(x=>x.table==='board_preferences').length}건 · ${labels.task_schedules} ${r.rows.filter(x=>x.table==='task_schedules').length}건 · ${labels.daily_plans} ${r.rows.filter(x=>x.table==='daily_plans').length}일 · ${labels.task_records} ${r.rows.filter(x=>x.table==='task_records').length}건</p><p>신규 업로드 ${r.new}건 · 중복 유지 ${r.duplicate}건 · 충돌 보류 ${r.conflict}건${r.blocked?' · 온라인 확인 실패':''}</p>`;}
  async function run(){if(!plan||plan.blocked||!plan.rows.length){$('migrationResult').textContent='온라인 연결 후 기존 기록을 확인해 주세요.';return}const client=window.boardCloud.migrationClient();let uploaded=0,held=plan.conflict;for(const row of plan.rows){const hit=plan.online.find(x=>x.table===row.table&&Object.entries(row.pk).every(([k,v])=>String(x.raw[k])===String(v)));if(hit)continue;const {data:owner}=await client.rpc('heeyoon_family_owner');const {error}=await client.from(row.table).insert({user_id:owner,...row.pk,...row.values});if(error){$('migrationResult').textContent='이전 중단: 저장된 localStorage는 그대로 유지됩니다.';return}uploaded++} $('migrationResult').textContent=`이전 완료 · 신규 업로드 ${uploaded}건 · 중복 유지 ${plan.duplicate}건 · 충돌 보류 ${held}건`;$('migrationRun').disabled=true;}
  window.addEventListener('DOMContentLoaded',()=>{$('migrationInspect')?.addEventListener('click',async()=>{ $('migrationResult').textContent='확인 중…';render(await inspect())});$('migrationBackup')?.addEventListener('click',backup);$('migrationRun')?.addEventListener('click',run);});
})();
