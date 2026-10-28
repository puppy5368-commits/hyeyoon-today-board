/* Transcribed from the supplied 12-week book schedule. IDs never depend on dates. */
(function(root){
 'use strict';
 const units=['분수의 덧셈과 뺄셈','삼각형','소수의 덧셈과 뺄셈','사각형','꺾은선그래프','다각형'];
 const weeks=[
  ['6~9','10~13','14~17','18~21','22~24'],
  ['25~26','27~28','29~31','32~34','36~39'],
  ['40~43','44~45','46~48','49~51','52~55'],
  ['56~58','59~61','64~67','68~71','72~75'],
  ['76~77','78~79','80~81','82~83','84~85'],
  ['86~88','89~90','91~92','93~95','96~98'],
  ['100~103','104~107','108~111','112~113','114~115'],
  ['116~117','118~119','120~121','122~123','124~125'],
  ['126~128','129~131','134~135','136~137','138~139'],
  ['140~142','143~144','145~147','148~149','150~152'],
  ['153~155','156~158','160~163','164~165','166~168'],
  ['169~171','172~174','175~177','178~180','181~183']
 ];
 const dates={'6~9':'2026-10-28','100~103':'2026-10-19','104~107':'2026-10-21','108~111':'2026-10-23','112~113':'2026-10-26','116~117':'2026-10-30','118~119':'2026-11-02','120~121':'2026-11-04','122~123':'2026-11-06','124~125':'2026-11-09','126~128':'2026-11-11','129~131':'2026-11-13'};
 const items=weeks.flatMap((pages,w)=>pages.map((p,i)=>{
  const start=Number(p.split('~')[0]),unit=start<40?1:start<64?2:start<100?3:start<134?4:start<160?5:6;
  return {id:'didimdol-4-2-u'+unit+'-p'+p.replace('~','-'),unit,title:units[unit-1],week:w+1,slot:i+1,pages:p,date:dates[p]||null};
 }));
 const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='0001-01-01'&&value<='9999-12-31'&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
 function record(state,item){
  const saved=state.mathAssignments?.[item.id]||{};
  // Only the four unambiguous earlier assignments may read their legacy progress.
  // Today's old 114–115 record always remains an independent historical record.
  const legacy=item.date&&item.date<'2026-10-28'?state.days[item.date]?.tasks?.didimdolMath||{}:{};
  return {date:item.date,startAt:legacy.startAt||null,doneAt:legacy.doneAt||null,...saved};
 }
 const assigned=(state,date)=>items.filter(item=>record(state,item).date===date);
 const complete=(state,date)=>{const list=assigned(state,date);return list.length>0&&list.every(item=>{const r=record(state,item);return !!(r.startAt&&r.doneAt);});};
 root.MathSchedule={units,items,record,assigned,complete,validDate};
 if(typeof module!=='undefined')module.exports=root.MathSchedule;
})(typeof window==='undefined'?globalThis:window);
