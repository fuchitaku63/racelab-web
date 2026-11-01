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
 card.style.cssText='width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin-bottom:14px;overflow:hidden';
 card.append(el('h3',info.title));
 const description=el('p','上位6組（モデル内の仮定計算）','hl-footnote');
 card.append(description);
 // No hl-table here: the shared table CSS has min-width:670px and creates
 // a second screen-width column in iPhone Safari, separating % from results.
 const list=el('ol');
 list.style.cssText='list-style:none;margin:0;padding:0;width:100%;min-width:0';
 for(const item of part.top){
  const li=el('li');
  li.style.cssText='display:block;width:100%;box-sizing:border-box;padding:10px 2px;border-bottom:1px solid #34445b;overflow-wrap:anywhere';
  const combination=el('div',item.combination,'hl-ticket');
  combination.style.cssText='display:block;font-size:19px;font-weight:750';
  const frequency=el('div','参考出現率 '+(item.frequency*100).toFixed(2)+'%（的中確率ではありません）','hl-footnote');
  frequency.style.cssText='display:block;margin:3px 0 0;font-size:12px;line-height:1.6';
  li.append(combination,frequency);list.append(li);
 }
 card.append(list);
 box.append(card);
}
function referenceLine(r){
 if(!r)return{line:'',status:'未取得'};
 const value=text(r.line||'').trim(),cars=new Set(r.entries.map(e=>String(e.number)));
 const chunks=value.split('/').map(x=>x.trim()).filter(Boolean);
 const groups=chunks.map(x=>x.split('-').map(y=>y.trim()).filter(Boolean));
 const all=groups.flat();
 const valid=all.length===cars.size&&new Set(all).size===cars.size&&
  all.every(car=>cars.has(car)&&/^[1-9]$/.test(car));
 if(valid)return{line:groups.map(g=>g.join('-')).join(' / '),
  status:r.bookmarkSafety?.hold===true?'参考ライン・未確認':'Kドリームス掲載ライン（出所確認済み）'};
 if(/競り|ジカ/.test(value))return{line:'競り・ジカ等の可能性あり',status:'編成未確認'};
 return{line:'自動取得できませんでした',status:'未取得'};
}
function updateLinePreview(r){
 const preview=$('keirinLinePreview');
 if(!preview)return;
 const info=referenceLine(r);
 preview.textContent='読み込みライン：'+info.line+'　｜　'+info.status;
 preview.style.cssText='display:block;max-width:100%;overflow-wrap:anywhere;margin:8px 0 12px;color:#9ee2bd;font-size:13px;line-height:1.6';
}
function clearOld(){
 const box=$('keirinScenarios');if(box){box.replaceChildren();box.style.gridTemplateColumns='';}
 const focus=$('keirinHoleFocus');if(focus){focus.hidden=true;focus.replaceChildren();}
}
function sync(){
 const r=current(),button=$('keirinSimulate'),loaded=$('keirinLoaded');
 if(!r||!button||loaded?.hidden)return;
 updateLinePreview(r);
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
  box.style.gridTemplateColumns='minmax(0,1fr)';
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
 // Always show what was read, even when formal lineup verification is absent.
 const input=$('keirinLine');
 if(input?.parentElement?.insertAdjacentElement&&!$('keirinLinePreview')){
  const preview=el('p',undefined,'hl-footnote');preview.id='keirinLinePreview';
  input.parentElement.insertAdjacentElement('afterend',preview);
 }
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
globalThis.RaceLabKeirinObservation=Object.freeze({eligible,participants,simulate,acceptText,referenceLine});
})();
