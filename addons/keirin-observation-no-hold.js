/* RaceLab Keirin: observational, line-independent reference simulation.
 * This UX adapter leaves all formal RaceBookmark1123, RaceImportCore and
 * quality/identity checks untouched. It handles ONLY the simple keirinLab.
 * Unconfirmed lineup, comments, and odds never enter the computation.
 */
(()=>{'use strict';
const ROOT='keirinLab';
const SCENARIOS=[
 {key:'lead',title:'先行主導（ライン補正なし）'},
 {key:'makuri',title:'捲り展開（ライン補正なし）'},
 {key:'sashi',title:'差し追込（ライン補正なし）'}
];
const $=id=>document.getElementById(id);
const text=x=>String(x??'');
const finite=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
const value=(e,k)=>finite(e?.observed?.[k])??0;
const eligible=r=>!!r&&r.bookmarkSafety?.hold===true&&Array.isArray(r.entries)
 &&r.entries.length>=3&&r.entries.length<=9
 &&r.entries.some(e=>finite(e.observed?.score)!==null);
let races=null,revision=0,working=false,buttonLabel='';
function current(){
 if(!races)return null;
 const index=Number($('keirinSelect')?.value);
 return Number.isInteger(index)&&index>=0&&index<races.length?races[index]:null;
}
function needed(r){return eligible(r);}
function seedFor(r,key){
 let h=2166136261>>>0;
 const label=(r.raceNo||'')+'|'+(r.title||'')+'|'+key+'|'+r.entries.map(e=>e.number+':'+e.observed?.score).join(',');
 for(let i=0;i<label.length;i++){h^=label.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
 return h||1;
}
function rng(seed){
 let x=seed>>>0||1;
 return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
}
function participants(r,scenario){
 const validScores=r.entries.map(e=>finite(e.observed?.score)).filter(x=>x!==null);
 const average=validScores.reduce((a,b)=>a+b,0)/validScores.length;
 return r.entries.map(e=>{
  const o=e.observed||{},score=finite(o.score);
  const lead=1.8*Math.log1p(value(e,'nige'))+0.15*value(e,'b');
  const makuri=2*Math.log1p(value(e,'makuri'));
  const sashi=2*Math.log1p(value(e,'sashi'))+0.7*Math.log1p(value(e,'marking'));
  const booster=scenario==='lead'?lead:scenario==='makuri'?makuri:sashi;
  return {number:e.number,name:e.name,
   strength:(score===null?0:(score-average)*0.65)+booster};
 });
}
function simulate(r,scenario,runs){
 if(!needed(r))throw Error('比較できる競走得点がありません');
 if(!Number.isInteger(runs)||runs<1||runs>100000)throw Error('試行回数が不正です');
 const runners=participants(r,scenario),random=rng(seedFor(r,scenario));
 const counts=new Map();
 const marks=new Array(runners.length);
 for(let t=0;t<runs;t++){
  for(let i=0;i<runners.length;i++){
   const noise=12*(random()+random()+random()-1.5);
   marks[i]=[runners[i].number,runners[i].strength+noise];
  }
  marks.sort((a,b)=>b[1]-a[1]||a[0]-b[0]);
  const combination=marks[0][0]+'-'+marks[1][0]+'-'+marks[2][0];
  counts.set(combination,(counts.get(combination)||0)+1);
 }
 return {scenario,runs,
  top:[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,6)
  .map(([combination,count])=>({combination,count,frequency:count/runs})),
  total:counts.size};
}
const el=(tag,label,cls)=>{const n=document.createElement(tag);
 if(label!==undefined)n.textContent=text(label);
 if(cls)n.className=cls;return n;};
function showScenario(box,part){
 const info=SCENARIOS.find(s=>s.key===part.scenario);
 const card=el('article',undefined,'hl-scenario');
 card.append(el('h3',info.title));
 const tbl=el('table',undefined,'hl-table'),thead=el('thead'),tr=el('tr');
 tr.append(el('th','3連単の組合せ'),el('th','モデル内出現頻度'));
 thead.append(tr);tbl.append(thead);
 const tbody=el('tbody');
 for(const item of part.top){
  const row=el('tr');row.append(el('td',item.combination),
   el('td',(item.frequency*100).toFixed(2)+'%'));tbody.append(row);
 }
 tbl.append(tbody);card.append(tbl);
 card.append(el('p','モデル内での参考頻度。的中確率・投資推奨ではありません。','hl-footnote'));
 box.append(card);
}
function clearOld(){
 const box=$('keirinScenarios');if(box)box.replaceChildren();
 const focus=$('keirinHoleFocus');if(focus){focus.hidden=true;focus.replaceChildren();}
}
function sync(){
 const r=current(),button=$('keirinSimulate'),loaded=$('keirinLoaded');
 if(!r||!button||loaded?.hidden)return;
 if(!needed(r)){
  if(buttonLabel&&button.textContent==='ラインなし参考試算')button.textContent=buttonLabel;
  return;
 }
 if(!buttonLabel)buttonLabel=button.textContent;
 if(button.disabled)button.disabled=false;
 if(button.textContent!=='ラインなし参考試算')button.textContent='ラインなし参考試算';
 const error=$('keirinError');
 if(error&&/^分析HOLD/.test(error.textContent.trim()))error.textContent='';
 const status=$('keirinStatus');
 const note=races.length+'レースを読み込みました。正式ラインなしで選手数値の参考試算ができます。';
 if(status&&status.textContent!==note)status.textContent=note;
}
async function run(){
 const r=current();if(!needed(r)||working)return;
 const runs=Number($('keirinRuns')?.value)||10000;
 const token=++revision,progress=$('keirinProgress'),box=$('keirinScenarios');
 if(!box)return;
 working=true;clearOld();
 if(progress)progress.textContent='ライン補正なしで参考試算中…';
 try{
  const output=[];
  for(const spec of SCENARIOS){
   // Give Safari an opportunity to paint and accept a race change.
   await new Promise(resolve=>setTimeout(resolve,0));
   if(token!==revision) return;
   const result=simulate(r,spec.key,runs);
   if(token!==revision) return;
   output.push(result);
  }
  if(token!==revision)return;
  output.forEach(x=>showScenario(box,x));
  if(progress)progress.textContent='完了：'+runs.toLocaleString('ja-JP')+
   '回×3展開の未校正モデル試行。ライン補正なし・オッズなし。';
 }catch(e){
  if(progress)progress.textContent='参考試算を実行できません：'+String(e.message||e);
 }finally{working=false;}
}
function acceptText(raw){
 let source=raw;
 if(source.trimStart().startsWith('【競輪出走情報 iPhone抽出版】')){
  const transform=globalThis.RaceLabIphoneReportAdapter?.convertReport;
  if(typeof transform!=='function')return null;
  source=transform(source);
 }
 if(!source)return null;
 return globalThis.RaceBookmark1123?.parse(source)?.races||null;
}
function setup(){
 const lab=$(ROOT),importBtn=$('keirinImport'),select=$('keirinSelect'),
 simulateBtn=$('keirinSimulate'),error=$('keirinError'),loaded=$('keirinLoaded');
 if(!lab||!importBtn||!select||!simulateBtn)return;
 const observer=new MutationObserver(()=>sync());
 if(error)observer.observe(error,{childList:true,characterData:true,subtree:true});
 if(loaded)observer.observe(loaded,{attributes:true,attributeFilter:['hidden']});
 observer.observe(simulateBtn,{attributes:true,attributeFilter:['disabled']});
 document.addEventListener('click',e=>{
  const button=e.target?.closest?.('button');if(!button)return;
  if(button.id==='keirinImport'){
   let next=null;
   try{next=acceptText($('keirinPaste')?.value||'');}catch{}
   if(next){races=next;revision++;clearOld();
    queueMicrotask(sync);setTimeout(sync,50);}
   return;
  }
  if(button.id==='keirinSimulate'&&needed(current())){
   e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();
   run();
  }
 },true);
 select.addEventListener('change',()=>{
  revision++;clearOld();working=false;
  queueMicrotask(sync);setTimeout(sync,0);
 });
 $('keirinFile')?.addEventListener('change',()=>{races=null;revision++;working=false;});
}
if(document.readyState==='loading')
 document.addEventListener('DOMContentLoaded',setup,{once:true});
else setup();
globalThis.RaceLabKeirinObservation=Object.freeze({eligible,participants,simulate,acceptText});
})();
