/* RaceLab: lossless 3連単 formation view.
 * Presentation-only enhancement. Existing prediction scores, formal gates,
 * line evidence, odds and original ticket lists are never changed.
 */
(()=>{'use strict';
const ROOT='keirinScenarios';
const css=[
 'border:1px solid #587c9a','background:#16283b','border-radius:10px',
 'padding:12px','margin:12px 0','max-width:100%','min-width:0',
 'box-sizing:border-box','overflow-wrap:anywhere'
].join(';');
const ticketPattern=/([1-9])\s*[-－―–—→]\s*([1-9])\s*[-－―–—→]\s*([1-9])/;
const carSort=(a,b)=>Number(a)-Number(b);
function parseTicket(text){
 const m=String(text??'').normalize('NFKC').match(ticketPattern);
 if(!m)return null;
 const cars=m.slice(1,4);
 return new Set(cars).size===3?cars.join('-'):null;
}
function toTicketList(items){
 if(!Array.isArray(items))return[];
 return [...new Set(items.map(x=>parseTicket(x)).filter(Boolean))]
  .sort((a,b)=>a.localeCompare(b,'en'));
}
const expandForm=f=>{
 const seen=[];
 for(const a of f[0])for(const b of f[1])for(const c of f[2]){
  if(new Set([a,b,c]).size===3)seen.push(a+'-'+b+'-'+c);
 }
 return [...new Set(seen)].sort();
};
function summarize(tickets){
 const set=toTicketList(tickets),wanted=new Set(set);
 if(set.length===0)return{tickets:[],forms:[],pointCount:0,exact:true};
 // Start with exactly one distinct combination per rectangle. Merge only
 // when the other two coordinates are identical, preserving the exact union.
 let forms=set.map(t=>t.split('-').map(n=>[n]));
 let changed=true;
 while(changed){
  changed=false;
  outer:for(let i=0;i<forms.length;i++)for(let j=i+1;j<forms.length;j++){
   for(let axis=0;axis<3;axis++){
    if([0,1,2].some(k=>k!==axis&&forms[i][k].join(',')!==forms[j][k].join(',')))continue;
    const merged=forms[i].map((v,k)=>k===axis?[...new Set([...v,...forms[j][k]])].sort(carSort):v.slice());
    if(expandForm(merged).some(k=>!wanted.has(k)))continue;
    forms[i]=merged;forms.splice(j,1);changed=true;break outer;
   }
  }
 }
 const reconstructed=new Set(forms.flatMap(expandForm));
 const exact=reconstructed.size===wanted.size&&set.every(t=>reconstructed.has(t));
 if(!exact)forms=set.map(t=>t.split('-').map(n=>[n]));
 forms.sort((a,b)=>a.map(v=>v.join('')).join('|').localeCompare(b.map(v=>v.join('')).join('|'),'en'));
 return{tickets:set,forms,pointCount:set.length,exact};
}
function formatText(summary,heading=''){
 const lines=[heading||'3連単フォーメーション',
  '計'+summary.pointCount+'点（表示中の買い目のみ）'];
 for(const [i,f] of summary.forms.entries()){
  lines.push((summary.forms.length>1?'【'+(i+1)+'組】':'')+
   '1着 '+f[0].join('・')+' / 2着 '+f[1].join('・')+' / 3着 '+f[2].join('・'));
 }
 lines.push('元の買い目：'+summary.tickets.join('、'));
 lines.push('注意：既存の参考試算を整形したもの。確率・回収率の保証ではありません。');
 return lines.join('\n');
}
function extractTickets(card){
 const nodes=Array.from(card.querySelectorAll('.hl-ticket'));
 const list=nodes.length?nodes:Array.from(card.querySelectorAll('li'))
  .filter(n=>/^\s*[1-9]\s*[-－―–—→]\s*[1-9]\s*[-－―–—→]\s*[1-9]/.test(n.textContent));
 return toTicketList(list.map(n=>n.textContent));
}
function element(tag,text,classname){
 const x=document.createElement(tag);
 if(text!==undefined)x.textContent=text;
 if(classname)x.className=classname;
 return x;
}
function addCard(card){
 const tickets=extractTickets(card);
 const prev=card.querySelector(':scope > .rl-exact-formation');
 if(!tickets.length){prev?.remove();return;}
 const signature=tickets.join('|');
 if(prev?.dataset.tickets===signature)return;
 prev?.remove();
 const sum=summarize(tickets);
 if(!sum.exact)throw Error('フォーメーション変換で買い目が一致しません');
 const section=element('section',undefined,'rl-exact-formation');
 section.dataset.tickets=signature;section.style.cssText=css;
 const heading=element('h4','3連単フォーメーション｜'+sum.pointCount+'点');
 heading.style.cssText='margin:0 0 8px;font-size:16px;color:#9ee2bd';
 section.append(heading);
 for(const [i,f] of sum.forms.entries()){
  const block=element('div');block.style.cssText='margin:8px 0;padding:8px;border:1px solid #38516a;border-radius:8px;max-width:100%;box-sizing:border-box';
  if(sum.forms.length>1){
   const label=element('div','組'+(i+1));
   label.style.cssText='font-size:12px;color:#b2c9de';block.append(label);
  }
  for(let k=0;k<3;k++){
   const line=element('div',['1着','2着','3着'][k]+'　'+f[k].join('・'));
   line.style.cssText='font-size:15px;font-weight:650;line-height:1.7;letter-spacing:0.02em';
   block.append(line);
  }
  section.append(block);
 }
 const copy=element('button','📋 フォーメーションをコピー');
 copy.type='button';copy.style.cssText='display:block;width:100%;box-sizing:border-box;border-radius:8px;padding:12px;margin:10px 0;background:#1d4ed8;color:#fff;border:0;font-size:15px;font-weight:650';
 copy.addEventListener('click',async()=>{
  const title=card.querySelector('h3')?.textContent||'3連単参考候補';
  const formatted=formatText(sum,title);
  let success=false;
  try{await navigator.clipboard.writeText(formatted);success=true}catch{}
  if(!success){
   const temp=element('textarea');temp.value=formatted;
   temp.style.cssText='position:fixed;left:-9999px;top:0';
   document.body.append(temp);temp.select();
   try{success=document.execCommand('copy')}catch{}
   temp.remove();
  }
  if(success){copy.textContent='コピーしました ✓';}
  else{
   const manual=element('textarea');manual.value=formatted;manual.readOnly=true;
   manual.style.cssText='display:block;width:100%;min-height:120px';
   section.append(manual);copy.textContent='手動コピー用の文章を表示しました';
  }
 });
 section.append(copy);
 const note=element('p','掲載中の組み合わせだけを集約。買い目は追加しません。参考出現率は的中確率ではありません。');
 note.style.cssText='font-size:12px;line-height:1.6;color:#bdd3e6;margin:8px 0 0';section.append(note);
 const native=card.querySelector('ol,table,ul');
 if(native)native.insertAdjacentElement('beforebegin',section);
 else card.append(section);
}
function setup(){
 const root=document.getElementById(ROOT);
 if(!root)return;
 let inRender=false;
 function update(){
  if(inRender)return;
  inRender=true;
  try{for(const card of root.querySelectorAll('.hl-scenario'))addCard(card);}
  finally{inRender=false;}
 }
 // MutationObserver is triggered by inserting a formation, but the stable
 // signature prevents additional DOM changes and the loop stops naturally.
 const obs=new MutationObserver(()=>update());
 obs.observe(root,{subtree:true,childList:true,characterData:true});
 update();
}
if(document.readyState==='loading')
 document.addEventListener('DOMContentLoaded',setup,{once:true});
else setup();
globalThis.RaceLabKeirinFormation=Object.freeze({
 parseTicket,toTicketList,summarize,expandForm,formatText,extractTickets
});
})();
