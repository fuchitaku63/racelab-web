// RaceLab V11.1 — reference input canonicalization; NOT formal R3.
'use strict';
const keys=['score','b','nige','makuri','sashi','marking','winRate','ren2','ren3'];
function prepare(entries,groups,raceKey){
 if(!Array.isArray(entries)||entries.length<5||entries.length>9)throw Error('5〜9車の選手情報が必要です');
 const cars=new Set(entries.map(e=>Number(e.car)));
 if(cars.size!==entries.length||[...cars].some(c=>!Number.isInteger(c)||c<1||c>9))throw Error('車番の重複・不正');
 const flat=groups.flat().map(Number);
 if(flat.length!==entries.length||new Set(flat).size!==entries.length||flat.some(c=>!cars.has(c)))throw Error('参考ラインと車番が不一致');
 const observed=entries.map(e=>{
  const o={car:Number(e.car),name:String(e.name||'').normalize('NFKC').replace(/\s+/g,'')};
  if(!o.name)throw Error(o.car+'番の氏名が欠損');
  for(const k of keys){
   if(e[k]===null||e[k]===undefined||String(e[k]).trim()==='')throw Error(o.car+'番の'+k+'が未取得');
   const v=Number(e[k]);
   if(!Number.isFinite(v)||v<0||(k==='score'&&v===0)||(['winRate','ren2','ren3'].includes(k)&&v>100)||(['b','nige','makuri','sashi','marking'].includes(k)&&!Number.isInteger(v)))throw Error(o.car+'番の'+k+'が不正');
   o[k]=v;
  }
  if(o.ren2<o.winRate||o.ren3<o.ren2)throw Error(o.car+'番の率が矛盾');
  return o;
 });
 const sharedScale=Math.max(1,...observed.map(o=>o.nige+o.makuri+o.sashi+o.marking));
 const participants=observed.map(o=>{
  const group=groups.findIndex(g=>g.map(Number).includes(o.car));
  const place=groups[group].map(Number).indexOf(o.car)+1;
  return {number:o.car,group,place,denominator:null,escape:o.nige/sharedScale,makuri:o.makuri/sharedScale,sashi:o.sashi/sharedScale,mark:o.marking/sharedScale};
 });
 const canonical=JSON.stringify({race:String(raceKey),line:groups.map(g=>g.map(Number)),entries:observed,bankMode:'V11.1'});
 let hash=2166136261>>>0;for(let i=0;i<canonical.length;i++)hash=Math.imul(hash^canonical.charCodeAt(i),16777619)>>>0;
 return {participants,sharedScale,fingerprint:(hash>>>0).toString(16).padStart(8,'0'),model:'STRUCTURED_REFERENCE_V11_1'};
}
module.exports={prepare};
