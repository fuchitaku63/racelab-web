'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('addons/keirin-exact-formation.js','utf8');
const loader=fs.readFileSync('index.html','utf8');
const ctx={document:{readyState:'loading',addEventListener(){},getElementById(){return null;}}};
vm.createContext(ctx);
vm.runInContext(code,ctx);
const {normalizeTicket,distinct,buildExact,expandBlocks,readCards,textFor}=ctx.RaceLabKeirinFormation;
const json=o=>JSON.parse(JSON.stringify(o));
const exact=(tickets)=>{
 const result=buildExact(tickets),real=[...new Set(tickets)].sort();
 assert.deepEqual(json(expandBlocks(result.blocks)),real,'No phantom or missing ticket');
 assert.equal(result.pointCount,real.length);
 return result;
};
test('integrity: loader embed exactly matches UTF-8 original and untouched 38-part SHA',()=>{
 const i=loader.indexOf('const keirinFormationAdapter='),j=loader.indexOf(';\n',i);
 assert.ok(i>0&&j>i);
 assert.equal(JSON.parse(loader.slice(i+'const keirinFormationAdapter='.length,j)),code);
 assert.match(loader,/COUNT=38/);
 assert.match(loader,/EXPECTED='95937429ea7fe32251a1264171b252e7c3d9cdd8fe9578ddf01c8ea6b1ef78ca'/);
 assert.match(loader,/keirinNoLineAdapter.*keirinFormationAdapter/);
});
test('full rectangular set becomes one actual formation, preserving exact 4 points',()=>{
 const got=exact(['1-2-4','1-2-5','1-3-4','1-3-5']);
 assert.equal(got.blocks.length,1);
 assert.deepEqual(json(got.blocks[0]),[['1'],['2','3'],['4','5']]);
});
test('shared second and third places merge first finishers',()=>{
 const got=exact(['1-3-5','2-3-5']);
 assert.equal(got.blocks.length,1);
 assert.deepEqual(json(got.blocks[0]),[['1','2'],['3'],['5']]);
});
test('incomplete cross-product does not create fictitious combinations',()=>{
 const got=exact(['1-2-4','1-2-5','1-3-4']);
 assert.equal(got.pointCount,3);
 assert.ok(!expandBlocks(got.blocks).includes('1-3-5'));
});
test('duplicate across scenarios counts one ticket and never overstates points',()=>{
 const got=exact(['1-2-3','1-2-4','1-2-3','1-2-4','2-1-3']);
 assert.equal(got.pointCount,3);
 const output=textFor('全表示候補',got.tickets,'架空6R');
 assert.match(output,/候補 3点/);
 assert.match(output,/合計 3点/);
 assert.match(output,/1着/);
 assert.match(output,/2着/);
 assert.match(output,/3着/);
 assert.match(output,/レース: 架空6R/);
});
test('bad number, repeated car and malformed ticket are rejected',()=>{
 assert.equal(normalizeTicket('１－２－３'),'1-2-3');
 for(const value of ['1-1-3','0-2-3','10-2-3','1-2','1-2-3-4','1,2,3','1-2-0']){
  assert.equal(normalizeTicket(value),null,value);
  assert.throws(()=>buildExact([value]),/買い目/);
 }
});
test('every generated rectangle enumerates only legal distinct trifecta tickets',()=>{
 const tests=[
  ['1-2-3'],['9-8-7','9-8-6','9-7-6'],
  ['1-2-3','1-2-4','1-3-4','2-1-3','2-1-4','2-3-4'],
  ['1-3-5','2-3-5','1-4-5','2-4-5'],
  ['6-4-7','6-4-2','6-4-1','4-6-1','7-4-1','7-5-2']
 ];
 for(const t of tests)exact(t);
});
test('native and independent result cards both yield strict source tickets',()=>{
 const ticket=t=>({textContent:t});
 const mkCard=(title,first,second=[],holes=[])=>{
  const groups=[first,second,holes].filter(a=>a.length).map(a=>({querySelectorAll:()=>a.map(ticket)}));
  const all=[...first,...second,...holes].map(ticket);
  return{
   querySelector:sel=>sel==='h3'?{textContent:title}:sel==='ol.hl-ticket-list'||sel==='ol'?groups[0]:null,
   querySelectorAll:sel=>sel==='.hl-ticket'?all:sel==='ol.hl-ticket-list'?groups:[]
  };
 };
 const c=[
  mkCard('先行',['1-2-3','1-2-4'],['1-4-3'],['4-2-3']),
  mkCard('捲り',['2-3-4']),
  mkCard('差し',['3-4-2'])
 ];
 const result=readCards({querySelectorAll:sel=>sel==='.hl-scenario'?c:[]});
 assert.equal(result.length,3);
 assert.deepEqual(json(result[0].main),['1-2-3','1-2-4']);
 assert.deepEqual(json(result[0].all),['1-2-3','1-2-4','1-4-3','4-2-3']);
 assert.deepEqual(json(result[0].hole),['4-2-3']);
 assert.equal(readCards({querySelectorAll:()=>c.slice(0,2)}),null,'partial rendering must not expose a stale formation');
});
