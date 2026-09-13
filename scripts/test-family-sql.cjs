// Run the migration in an ephemeral PostgreSQL (PGlite) database, never Supabase.
const {PGlite}=require('@electric-sql/pglite');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
// Keep the production SQL's one-value placeholder; tests substitute a fixture UID
// instead of embedding any real project's Authentication UID.
const sqlTemplate=fs.readFileSync(path.join(__dirname,'../supabase/anonymous-family.sql'),'utf8');
const OWNER='11111111-1111-4111-8111-111111111111',A='22222222-2222-4222-8222-222222222222',B='33333333-3333-4333-8333-333333333333';
assert(sqlTemplate.includes("selected_owner uuid := '00000000-0000-0000-0000-000000000000'"),'SQL must expose the documented owner placeholder');
const sql=sqlTemplate.replaceAll('00000000-0000-0000-0000-000000000000',OWNER);
const tables=['board_preferences','task_schedules','daily_plans','task_records'];
async function fixture(){
 const db=new PGlite();await db.exec(`
 create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key,is_anonymous boolean);
 insert into auth.users values('${OWNER}',false),('${A}',true),('${B}',true);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
 `);
 for(const t of tables)await db.exec(`
 create table public.${t}(user_id uuid not null references auth.users(id), item text not null, payload text, revision integer default 1, primary key(user_id,item));
 alter table public.${t} enable row level security;
 grant all on public.${t} to anon,authenticated;
 create policy original_owner on public.${t} for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
 insert into public.${t}(user_id,item,payload) values('${OWNER}','original','원본 보존');
 `);return db;
}
async function asUser(db,role,id){await db.exec(`reset role;set role ${role};set request.jwt.claim.sub='${id||''}'`);}
async function denied(db,query,label){await assert.rejects(()=>db.exec(query),/permission denied|row-level security/,label);}
(async()=>{
 const db=await fixture();
 try{
  const before=[];for(const t of tables)before.push((await db.query(`select * from ${t}`)).rows);
  await db.exec(sql);await db.exec(sql); // Reapplying cannot change the selected owner/data.
  for(let i=0;i<tables.length;i++)assert.deepEqual((await db.query(`select * from ${tables[i]}`)).rows,before[i]);
  for(const t of tables)await db.exec(`insert into ${t}(user_id,item,payload) values('${A}','private-other-owner','must remain hidden')`);
  await asUser(db,'authenticated',A);
  assert.equal((await db.query('select public.heeyoon_family_owner() as id')).rows[0].id,OWNER);
  for(const t of tables){
   assert.deepEqual((await db.query(`select item from ${t}`)).rows,[{item:'original'}],'old permissive self policy cannot expose other owner');
   await db.exec(`insert into ${t}(user_id,item,payload) values('${OWNER}','from-A','new shared record')`);
   await denied(db,`insert into ${t}(user_id,item) values('${A}','forged-owner')`,'cannot select arbitrary owner');
   await denied(db,`update ${t} set user_id='${A}' where item='from-A'`,'cannot change owner');
   await denied(db,`delete from ${t}`,'delete forbidden');
   await denied(db,`truncate ${t}`,'truncate forbidden');
  }
  await denied(db,`update heeyoon_private.family_board set owner_id='${A}'`,'mapping is private');
  await asUser(db,'authenticated',B);
  for(const t of tables){
   assert.equal((await db.query(`select payload from ${t} where item='from-A'`)).rows[0].payload,'new shared record');
   await db.exec(`update ${t} set payload='changed by B',revision=2 where item='from-A' and revision=1`);
  }
  await asUser(db,'authenticated',A);
  for(const t of tables)assert.equal((await db.query(`select payload from ${t} where item='from-A'`)).rows[0].payload,'changed by B');
  await asUser(db,'anon',null);
  await denied(db,'select public.heeyoon_family_owner()','no unauthenticated RPC');
  for(const t of tables)await denied(db,`select * from ${t}`,'no unauthenticated record access');
  await db.exec('reset role');
  // A later accidental DELETE grant still cannot bypass the explicit RLS deny.
  await db.exec('grant delete on task_records to authenticated');await asUser(db,'authenticated',A);
  assert.equal((await db.query('delete from task_records returning *')).rows.length,0);
  await db.exec('reset role');
  for(const t of tables)assert.equal((await db.query(`select payload from ${t} where user_id='${OWNER}' and item='original'`)).rows[0].payload,'원본 보존');
 }finally{await db.close();}
 const ambiguous=await fixture();
 try{
  await ambiguous.exec(`insert into task_records(user_id,item) values('${A}','other')`);
  await ambiguous.exec(sql);
  assert.equal((await ambiguous.query('select count(*)::int as n from task_records')).rows[0].n,2);
  assert.equal((await ambiguous.query('select owner_id from heeyoon_private.family_board')).rows[0].owner_id,OWNER);
 }finally{await ambiguous.close();}
 console.log('PASS: PostgreSQL migration preserves all rows; idempotent; distinct auth users read/write one family; forged owner/private mapping/unauthenticated/delete/truncate blocked; old policy OR fenced; ambiguous owner rolls back without data loss. Local DB only.');
})().catch(e=>{console.error(e);process.exitCode=1;});
