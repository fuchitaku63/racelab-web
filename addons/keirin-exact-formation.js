/* RaceLab Keirin: exact-cover trifecta formation display.
 * Converts ONLY already-displayed model candidate tickets. It never adds
 * cartesian-product tickets that the model did not emit, never uses odds,
 * and does not change the simulation, line verification or purchase gates.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const normalizeTicket=input=>{
 const s=String(input??'').normalize('NFKC').trim().replace(/[－ー―–−]/g,'-').replace(/\s+/g,'');
 if(!/^[1-9]-[1-9]-[1-9]$/.test(s))return null;
 const c=s.split('-');return new Set(c).size===3?s:null;
};
const distinct=input=>{
 if(!Array.isArray(input)||input.length>500)throw Error('候補点数が不正です');
 const out=[],seen=new Set();
 for(const raw of input){
  const t=normalizeTicket(raw);
  if(!t)throw Error('買い目の形式を認識できません');
  if(!seen.has(t)){out.push(t);seen.add(t);}
 }
 return out;
};
const sortCars=arr=>[...new Set(arr)].sort((a,b)=>Number(a)-Number(b));
const matchAxes=(a,b,except)=>[0,1,2].every(i=>i===except||a[i].join('')===b[i].join(''));
const expandBlocks=blocks=>{
 const out=new Set();
 for(const b of blocks)for(const a of b[0])for(const c of b[1])for(const d of b[2]){
  if(new Set([a,c,d]).size!==3)throw Error('同じ車番が複数着に含まれています');
  out.add(a+'-'+c+'-'+d);
 }
 return [...out].sort();
};
function buildExact(input){
 const tickets=distinct(input);
 if(!tickets.length)return{tickets:[],blocks:[],pointCount:0};
 const blocks=tickets.map(t=>t.split('-').map(x=>[x]));
 // Each merge is a union of two previously verified rectangles differing
 // along precisely one axis; therefore it cannot create a new ticket.
 let changed=true;
 while(changed){
  changed=false;
  outer:for(const axis of [2,1,0]){
   for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){
    if(!matchAxes(blocks[i],blocks[j],axis))continue;
    blocks[i][axis]=sortCars([...blocks[i][axis],...blocks[j][axis]]);
    blocks.splice(j,1);changed=true;break outer;
   }
  }
 }
 const reconstructed=expandBlocks(blocks),original=[...tickets].sort();
 if(reconstructed.length!==original.length||reconstructed.some((v,i)=>v!==original[i]))
  throw Error('フォーメーションの点数・組合せが一致しません');
 return{tickets,blocks,pointCount:tickets.length};
}
function readCards(root){
 if(!root)return null;
 const cards=[...root.querySelectorAll('.hl-scenario')];
 if(cards.length!==3)return null;
 const sections=[];
 for(const [i,card] of cards.entries()){
  const nodes=[...card.querySelectorAll('.hl-ticket')];
  if(!nodes.length)return null;
  const all=nodes.map(n=>normalizeTicket(n.textContent));
  if(all.some(x=>!x))return null;
  const mainList=card.querySelector('ol.hl-ticket-list')||card.querySelector('ol');
  const mainNodes=mainList?[...mainList.querySelectorAll('.hl-ticket')]:[];
  const main=mainNodes.map(n=>normalizeTicket(n.textContent));
  if(!main.length||main.some(x=>!x))return null;
  const lists=[...card.querySelectorAll('ol.hl-ticket-list')];
  const hole=lists.length>=3?[...lists[2].querySelectorAll('.hl-ticket')].map(n=>normalizeTicket(n.textContent)):[];
  if(hole.some(x=>!x))return null;
  sections.push({title:(card.querySelector('h3')?.textContent||'展開'+(i+1)).trim(),
   all:distinct(all),main:distinct(main),hole:distinct(hole)});
 }
 return sections;
}
function describeBlock(block){
 const count=block[0].length*block[1].length*block[2].length;
 return{first:block[0].join('・'),second:block[1].join('・'),third:block[2].join('・'),points:count};
}
function textFor(label,results,race){
 const model=buildExact(results);
 const lines=['【3連単フォーメーション｜'+label+'】'];
 if(race)lines.push('レース: '+race);
 lines.push('候補 '+model.pointCount+'点（表示済み買い目から過不足なく変換）');
 for(const [i,block] of model.blocks.entries()){
  const x=describeBlock(block);
  lines.push('〈'+(i+1)+'〉 1着 '+x.first+' ／ 2着 '+x.second+' ／ 3着 '+x.third+'（'+x.points+'点）');
 }
 lines.push('合計 '+model.pointCount+'点','※未校正モデルの候補整理。的中確率・購入推奨ではありません。');
 return lines.join('\n');
}
const el=(tag,content,cls)=>{
 const n=document.createElement(tag);
 if(content!==undefined)n.textContent=String(content);
 if(cls)n.className=cls;return n;
};
function copyNow(value,button){
 const mark=ok=>{button.textContent=ok?'コピーしました ✓':'コピー失敗・長押しで選択';};
 const fallback=()=>{
  const area=el('textarea');area.value=value;area.readOnly=true;
  area.style.cssText='position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:.01';
  document.body.appendChild(area);area.focus();area.select();
  let ok=false;try{ok=!!document.execCommand('copy');}catch{}
  area.remove();mark(ok);return ok;
 };
 try{
  if(navigator.clipboard?.writeText){
   navigator.clipboard.writeText(value).then(()=>mark(true),()=>fallback());
   return;
  }
 }catch{}
 fallback();
}
function formationGroup(label,tickets,race,open){
 const model=buildExact(tickets);
 const details=el('details');
 details.open=!!open;
 details.style.cssText='border:1px solid #50617a;border-radius:9px;margin:10px 0;background:#101a2c;padding:12px;min-width:0;max-width:100%;box-sizing:border-box';
 const summary=el('summary',label+'｜'+model.pointCount+'点');
 summary.style.cssText='cursor:pointer;font-weight:700;line-height:1.6;color:#e9f1ff';
 details.append(summary);
 const group=el('div');
 group.style.cssText='padding-top:10px;min-width:0';
 for(const [i,block] of model.blocks.entries()){
  const x=describeBlock(block),card=el('div');
  card.style.cssText='padding:10px 0;border-top:1px solid #34445b;font-size:14px;line-height:1.8;overflow-wrap:anywhere';
  const head=el('strong','〈'+(i+1)+'〉　'+x.points+'点');
  head.style.cssText='display:block;color:#f5bd63';
  card.append(head,
   el('div','1着　'+x.first),
   el('div','2着　'+x.second),
   el('div','3着　'+x.third));
  group.append(card);
 }
 const button=el('button','📋 このフォーメーションをコピー');
 button.type='button';button.style.cssText='width:100%;min-height:44px;margin-top:10px;padding:11px;border-radius:8px;border:1px solid #82c9d9;background:#204057;color:#f0ffff;font-size:14px;font-weight:700';
 button.addEventListener('click',()=>copyNow(textFor(label,tickets,race),button));
 group.append(button);details.append(group);
 return details;
}
function panelFor(sections,race){
 const all=distinct(sections.flatMap(s=>s.all));
 const main=distinct(sections.flatMap(s=>s.main));
 const hole=distinct(sections.flatMap(s=>s.hole));
 if(!all.length||!main.length)return null;
 const panel=el('section',undefined,'keirin-formation-panel');
 panel.id='keirinFormation';panel.style.cssText='display:block;min-width:0;max-width:100%;width:100%;box-sizing:border-box;overflow-wrap:anywhere;border:1px solid #425a73;border-radius:12px;padding:14px;margin:16px 0;background:#17253a;color:#e8f0fc';
 panel.append(el('h3','🎯 3連単フォーメーション'));
 const note=el('p','試算画面に表示された組み合わせだけを整理。新たな買い目は加えません。','hl-footnote');
 note.style.cssText='font-size:13px;line-height:1.6;margin:8px 0';
 panel.append(note);
 panel.append(formationGroup('本線候補まとめ',main,race,true));
 if(all.length!==main.length)panel.append(formationGroup('対抗・穴を含む全表示候補',all,race,false));
 if(hole.length)panel.append(formationGroup('穴候補のみ',hole,race,false));
 if(sections.length===3){
  const each=el('details');each.style.cssText='padding-top:8px';
  each.append(el('summary','展開別のフォーメーションを見る'));
  for(const section of sections)each.append(formationGroup(section.title,section.all,race,false));
  panel.append(each);
 }
 const caveat=el('p','※各候補の発生頻度は実際の的中確率ではありません。','hl-footnote');
 caveat.style.cssText='font-size:12px;color:#bdc9db;margin:10px 0 0';
 panel.append(caveat);
 return panel;
}
function setup(){
 const root=$('keirinScenarios'),progress=$('keirinProgress'),select=$('keirinSelect');
 if(!root||!progress||!select)return;
 let last='',panel=null;
 const hide=()=>{last='';panel?.remove();panel=null;};
 const render=()=>{
  if(!/^完了：/.test(progress.textContent||'')){hide();return;}
  const sections=readCards(root);
  if(!sections){hide();return;}
  const race=select.options?.[select.selectedIndex]?.textContent?.trim()||'';
  const key=JSON.stringify({race,sections});
  if(key===last&&panel?.isConnected)return;
  hide();
  try{
   panel=panelFor(sections,race);
   if(panel){root.insertAdjacentElement('beforebegin',panel);last=key;}
  }catch(err){hide();}
 };
 const observer=new MutationObserver(render);
 observer.observe(root,{childList:true,subtree:true,characterData:true});
 observer.observe(progress,{childList:true,subtree:true,characterData:true});
 select.addEventListener('change',hide);
 $('keirinImport')?.addEventListener('click',hide);
 $('keirinFile')?.addEventListener('change',hide);
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
else setup();
globalThis.RaceLabKeirinFormation=Object.freeze({
 normalizeTicket,distinct,buildExact,expandBlocks,readCards,panelFor,textFor
});
})();