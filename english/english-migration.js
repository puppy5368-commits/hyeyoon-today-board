/* V2 only. Keep the original serialized state before moving any records. */
(function(root){
  'use strict';
  const KEY='heeyoon-english-board:v2',BACKUP=KEY+':pre-weeks-backup';
  const CURRICULUM_VERSIONS={4:2,5:2};
  const clone=value=>JSON.parse(JSON.stringify(value));
  const contentVersion=week=>CURRICULUM_VERSIONS[Number(week)]||1;
  const sessionKeyParts=key=>{const m=/^week:([1-9]|1[0-2]):([ABC])$/.exec(key);return m?{week:Number(m[1]),section:m[2]}:null;};
  const isStale=(key,value)=>{const p=sessionKeyParts(key);return !!p&&contentVersion(p.week)>1&&Number(value?.contentVersion||1)<contentVersion(p.week);};
  function resetStaleCurriculum(state){
    for(const w of Object.keys(CURRICULUM_VERSIONS)){
      const sessions=state.weeks?.[w]?.sessions;
      if(!sessions)continue;
      for(const s of ['A','B','C']){
        const value=sessions[s];
        if(value&&Number(value.contentVersion||1)<contentVersion(w))delete sessions[s];
      }
    }
    return state;
  }
  function load(storage){
    const raw=storage.getItem(KEY);
    if(raw===null)return {version:2,currentWeek:1,weeks:{}};
    const old=JSON.parse(raw);
    if(old.version===2&&old.weeks&&typeof old.weeks==='object'){
      const next=resetStaleCurriculum(old);
      storage.setItem(KEY,JSON.stringify(next));
      return next;
    }
    if(old.version!==1||!old.sessions||typeof old.sessions!=='object')throw Error('영어 기록 형식을 확인해주세요. 원본은 그대로 보존되어 있어요.');
    if(storage.getItem(BACKUP)===null)storage.setItem(BACKUP,raw);
    const next={...old,version:2,currentWeek:1,weeks:{'1':{sessions:clone(old.sessions)}}};
    delete next.sessions;delete next.week;
    resetStaleCurriculum(next);storage.setItem(KEY,JSON.stringify(next));return next;
  }
  function complete(state,week){return ['A','B','C'].every(s=>!!state.weeks[String(week)]?.sessions?.[s]?.completedAt);}
  function firstIncomplete(state){for(let w=1;w<=12;w++)if(!complete(state,w))return w;return 12;}
  function rows(state){const out={};for(let w=1;w<=12;w++)for(const s of ['A','B','C']){
    const value=state.weeks[String(w)]?.sessions?.[s];
    if(value&&(value.completedAt||Object.keys(value.items||{}).length))out[`week:${w}:${s}`]=clone(value);
  }return out;}
  function put(state,key,value){if(!/^week:([1-9]|1[0-2]):[ABC]$/.test(key))throw Error('Invalid session key');const [,w,s]=key.split(':');(state.weeks[w]||={sessions:{}}).sessions[s]=clone(value);}
  const api={KEY,BACKUP,load,complete,firstIncomplete,rows,put,clone,contentVersion,isStale};root.EnglishMigration=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
