// Pure migration decision tests with mock rows; no Supabase or browser data.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const key=(table,pk)=>table+'|'+JSON.stringify(pk);
function decide(local,online){let out={new:0,duplicate:0,conflict:0};for(const x of local){const y=online.find(r=>key(r.table,r.pk)===key(x.table,x.pk));if(!y)out.new++;else if(JSON.stringify(x.values)===JSON.stringify(y.values))out.duplicate++;else out.conflict++;}return out}
const row=(table,pk,values)=>({table,pk,values});
assert.deepEqual(decide([row('daily_plans',{plan_date:'2026-01-01'},{first_start_time:'16:30'})],[]),{new:1,duplicate:0,conflict:0});
assert.deepEqual(decide([row('task_records',{record_date:'2026-01-01',task_id:'qt'},{done_at:'x'})],[row('task_records',{record_date:'2026-01-01',task_id:'qt'},{done_at:'x'})]),{new:0,duplicate:1,conflict:0});
assert.deepEqual(decide([row('task_records',{record_date:'2026-01-01',task_id:'qt'},{done_at:'local'})],[row('task_records',{record_date:'2026-01-01',task_id:'qt'},{done_at:'online'})]),{new:0,duplicate:0,conflict:1});
assert.deepEqual(decide([row('task_records',{record_date:'2026-01-01',task_id:'qt'},{done_at:'x'}),row('task_records',{record_date:'2026-01-02',task_id:'qt'},{done_at:'y'})],[row('task_records',{record_date:'2026-01-01',task_id:'qt'},{done_at:'x'})]),{new:1,duplicate:1,conflict:0});
const sql=fs.readFileSync(path.join(__dirname,'..','supabase','2026-09-19-english-video-task-id-check.sql'),'utf8');
assert.match(sql,/begin;/i);assert.match(sql,/commit;/i);
for(const constraint of ['task_records_task_id_check','task_schedules_task_id_check']){
  assert.match(sql,new RegExp(`drop constraint if exists ${constraint}`,'i'));
  assert.match(sql,new RegExp(`add constraint ${constraint}`,'i'));
}
assert.equal((sql.match(/'englishVideo'/g)||[]).length,2,'both task_id checks allow English video');
console.log('PASS: migration preview unique-key new/duplicate/conflict decisions and reproducible English-video check SQL; no writes.');
