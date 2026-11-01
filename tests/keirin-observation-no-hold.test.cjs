'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('addons/keirin-observation-no-hold.js','utf8');
const loader=fs.readFileSync('index.html','utf8');
const entries=Array.from({length:9},(_,i)=>({
 number:i+1,name:'架空選手'+(i+1),
 observed:{score:92+i*2.4,nige:i%4,makuri:i%3,sashi:i%5,marking:2,
 b:i+1,s:2,winRate:20,ren3:45}
}));
const race={
 raceNo:6,title:'架空競輪 6R',entries,
 line:'1-5-7 / 2-3 / 4-6 / 8-9',comments:{1:'自力。'},
 bookmarkSafety:{hold:true,reasons:['並び予想DOM未確認'],domConfirmed:false}
};
function api(){
 const doc={readyState:'loading',addEventListener(){}};
 const ctx={document:doc};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return ctx.RaceLabKeirinObservation;
}
test('source and live-loader embed remain byte-for-byte equal',()=>{
 const i=loader.indexOf('const keirinNoLineAdapter='),j=loader.indexOf(';\n',i);
 assert.ok(i>=0&&j>i);
 assert.equal(JSON.parse(loader.slice(i+'const keirinNoLineAdapter='.length,j)),source);
 assert.match(loader,/COUNT=38/);
 assert.match(loader,/EXPECTED='95937429ea7fe32251a1264171b252e7c3d9cdd8fe9578ddf01c8ea6b1ef78ca'/);
 assert.match(loader,/reportAdapter.*keirinNoLineAdapter/);
});
test('unknown lineup is accepted for independent observational computation',()=>{
 const a=api();
 assert.equal(a.eligible(race),true);
 const one=a.simulate(race,'lead',400);
 const two=a.simulate(race,'lead',400);
 assert.deepEqual(JSON.parse(JSON.stringify(one)),JSON.parse(JSON.stringify(two)));
 assert.ok(one.top.length>0);
 assert.equal(one.runs,400);
 assert.ok(one.top.every(p=>/^[1-9]-[1-9]-[1-9]$/.test(p.combination)));
 assert.ok(one.top.every(p=>p.frequency>=0&&p.frequency<=1));
 assert.equal(race.bookmarkSafety.hold,true,'formal safety ledger must remain unchanged');
});
test('line and rider comments are excluded from line-independent computation',()=>{
 const a=api(),s=a.simulate(race,'makuri',500);
 const changed={...race,line:'競り・ジカ',comments:{1:'別ライン'},bookmarkSafety:{hold:true,reasons:['競り・ジカ']}};
 const z=a.simulate(changed,'makuri',500);
 assert.deepEqual(JSON.parse(JSON.stringify(s)),JSON.parse(JSON.stringify(z)));
});
test('verified or invalid input never triggers the reference override',()=>{
 const a=api();
 assert.equal(a.eligible({...race,bookmarkSafety:{hold:false}}),false);
 assert.equal(a.eligible({...race,entries:[]}),false);
 assert.equal(a.eligible({...race,entries:entries.map(e=>({...e,observed:{score:null}}))}),false);
 assert.throws(()=>a.simulate(race,'lead',100001),/試行回数/);
});
test('model uses supplied numeric observations rather than sample assumptions for riders',()=>{
 const a=api();
 const lead=a.participants(race,'lead');
 const makuri=a.participants(race,'makuri');
 const sashi=a.participants(race,'sashi');
 assert.equal(lead.length,9);
 assert.ok(lead.some((e,i)=>e.strength!==makuri[i].strength));
 assert.ok(sashi.some((e,i)=>e.strength!==makuri[i].strength));
 assert.ok(lead.every(e=>Number.isFinite(e.strength)));
});
test('reference lines remain clearly marked unverified and malformed lines are rejected',()=>{
 const a=api();
 assert.equal(a.referenceLine(race).line,'1-5-7 / 2-3 / 4-6 / 8-9');
 assert.equal(a.referenceLine(race).status,'参考ライン・未確認');
 assert.equal(a.referenceLine({...race,line:'',bookmarkSafety:{hold:true}}).status,'未取得');
 assert.equal(a.referenceLine({...race,line:'1-5-7 / 2-3 / 4-6 / 8-8'}).status,'未取得');
 assert.equal(a.referenceLine({...race,line:'特殊ライン（競り・ジカ）'}).status,'編成未確認');
});
test('simple UI re-enables simulation while preserving native formal safety',async()=>{
 const listeners={},controls={};
 class Node{
  constructor(id=''){this.id=id;this.textContent='';this.hidden=false;this.disabled=false;this.children=[];this.className='';this.value='';this.handlers={};this.style={};}
  append(...child){this.children.push(...child);}
  replaceChildren(...child){this.children=[...child];}
  addEventListener(type,fn){this.handlers[type]=fn;}
 }
 const ids=['keirinLab','keirinImport','keirinSelect','keirinSimulate','keirinLoaded','keirinError','keirinStatus','keirinProgress','keirinScenarios','keirinHoleFocus','keirinPaste','keirinRuns','keirinFile','keirinLine'];
 for(const id of ids)controls[id]=new Node(id);
 controls.keirinLine.parentElement={insertAdjacentElement(_position,node){controls[node.id]=node;}};
 controls.keirinSelect.value='0';controls.keirinSimulate.disabled=true;
 controls.keirinSimulate.textContent='展開シミュレーション開始';
 controls.keirinError.textContent='分析HOLD: 並び予想DOM未確認';
 controls.keirinPaste.value='【テスト】';
 controls.keirinRuns.value='40';
 const doc={
  readyState:'complete',
  getElementById(id){return controls[id]||null},
  createElement(tag){const x=new Node();x.tagName=tag;return x;},
  addEventListener(type,fn){listeners[type]=fn;}
 };
 const ctx={document:doc,MutationObserver:class{observe(){}},setTimeout,queueMicrotask};
 vm.createContext(ctx);
 ctx.RaceBookmark1123={parse(){return{races:[race]}}};
 vm.runInContext(source,ctx);
 assert.equal(typeof listeners.click,'function');
 const fakeEvent=id=>({
  target:{closest:()=>controls[id]},
  preventDefault(){this.prevented=true;},
  stopImmediatePropagation(){this.stopped=true;},
  stopPropagation(){}
 });
 listeners.click(fakeEvent('keirinImport'));
 await new Promise(resolve=>setTimeout(resolve,80));
 assert.equal(controls.keirinSimulate.disabled,false);
 assert.equal(controls.keirinError.textContent,'');
 assert.equal(controls.keirinSimulate.textContent,'ラインなし参考試算');
 const event=fakeEvent('keirinSimulate');
 listeners.click(event);
 assert.equal(event.prevented,true);
 assert.equal(event.stopped,true);
 await new Promise(resolve=>setTimeout(resolve,80));
 assert.equal(controls.keirinScenarios.children.length,3);
 assert.ok(controls.keirinScenarios.children.every(c=>c.children.some(n=>n.tagName==='ol')));
 assert.ok(controls.keirinScenarios.children.every(c=>!c.children.some(n=>n.tagName==='table')));
 assert.equal(controls.keirinScenarios.style.gridTemplateColumns,'minmax(0,1fr)');
 assert.match(controls.keirinLinePreview.textContent,/1-5-7/);
 assert.match(controls.keirinLinePreview.textContent,/参考ライン・未確認/);
 assert.match(controls.keirinProgress.textContent,/完了：/);
 assert.equal(race.bookmarkSafety.hold,true);
});
