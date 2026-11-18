// RaceLab V11.1 — tactics-only reference input; NOT formal R3.
'use strict';
// Only these observed counts influence RaceBankedMonte participants.
// Do not block reference simulations on optional score, B count, or rate fields.
const required=['nige','makuri','sashi','marking'];
function prepare(entries,groups,raceKey){
 if(!Array.isArray(entries)||entries.length<5||entries.length>9)throw Error('5〜9車の選手情報が必要です');
 const cars=new Set(entries.map(e=>Number(e.car)));
 if(cars.size!==entries.length||[...cars].some(c=>!Number.isInteger(c)||c<1||c>9))throw Error('車番の重複・不正');
 if(!Array.isArray(groups)||groups.some(g=>!Array.isArray(g)))throw Error('参考ラインが不正');
 const lines=groups.map(g=>g.map(Number));
 const flat=lines.flat();
 if(flat.length!==entries.length||new Set(flat).size!==entries.length||flat.some(c=>!cars.has(c)))throw Error('参考ラインと車番が不一致');
 const observed=entries.map(e=>{
  const o={car:Number(e.car),name:String(e.name||'')};
  if(!o.name.trim())throw Error(o.car+'番の氏名が欠損');
  for(const k of required){
   if(e[k]===null||e[k]===undefined||String(e[k]).trim()==='')throw Error(o.car+'番の'+k+'が未取得');
   const v=Number(e[k]);
   if(!Number.isInteger(v)||v<0)throw Error(o.car+'番の'+k+'が不正');
   o[k]=v;
  }
  return o;
 });
 if(observed.every(o=>required.every(k=>o[k]===0)))throw Error('全選手の決まり手件数が0');
 const sharedScale=Math.max(1,...observed.map(o=>o.nige+o.makuri+o.sashi+o.marking));
 const participants=observed.map(o=>{
  const group=lines.findIndex(g=>g.includes(o.car));
  if(group<0)throw Error(o.car+'番が参考ラインに存在しません');
  const place=lines[group].indexOf(o.car)+1;
  return {number:o.car,group,place,denominator:null,escape:o.nige/sharedScale,makuri:o.makuri/sharedScale,sashi:o.sashi/sharedScale,mark:o.marking/sharedScale};
 });
 const canonical=JSON.stringify({race:String(raceKey),line:lines,entries:observed,bankMode:'V11.1-TACTICS-ONLY-FIX'});
 let hash=2166136261>>>0;for(let i=0;i<canonical.length;i++)hash=Math.imul(hash^canonical.charCodeAt(i),16777619)>>>0;
 return {participants,sharedScale,fingerprint:(hash>>>0).toString(16).padStart(8,'0'),model:'STRUCTURED_REFERENCE_V11_1'};
}
module.exports={prepare};
