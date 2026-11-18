'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {prepare}=require('../src/structured-reference.cjs');
const make=(n=6)=>Array.from({length:n},(_,i)=>({car:String(i+1),name:'選手'+(i+1),score:95+i,b:i,nige:i,makuri:2,sashi:1,marking:0,winRate:10,ren2:20,ren3:30,raw:'旧抽出器の形式差'}));
const groups=(n)=>[[1,2],...Array.from({length:n-2},(_,i)=>[i+3])];
for(const n of [5,6,7,8,9])test(n+'車：rawと未使用統計の有無が計算入力に影響しない',()=>{
 const entries=make(n),line=groups(n);
 const all=prepare(entries,line,'race-6');
 const compact=entries.map(({score,b,winRate,ren2,ren3,raw,...rest})=>rest);
 assert.deepEqual(all,prepare(compact,line,'race-6'));
 assert.equal(all.participants.length,n);
});
test('1番のwinRate未取得だけでは試算を止めない',()=>{
 const entries=make();delete entries[0].winRate;
 assert.deepEqual(prepare(entries,groups(6),'race-6').participants,prepare(make(),groups(6),'race-6').participants);
});
test('決まり手統計が未取得なら停止',()=>{
 const entries=make();delete entries[0].makuri;
 assert.throws(()=>prepare(entries,groups(6),'race-6'),/1番のmakuriが未取得/);
});
test('決まり手統計の不正値は停止',()=>{
 const entries=make();entries[0].nige=-1;
 assert.throws(()=>prepare(entries,groups(6),'race-6'),/不正/);
});
test('全員の決まり手統計が0なら停止',()=>{
 const entries=make().map(e=>({...e,nige:0,makuri:0,sashi:0,marking:0}));
 assert.throws(()=>prepare(entries,groups(6),'race-6'),/全選手/);
});
test('ライン車番の欠落・重複は停止',()=>{
 assert.throws(()=>prepare(make(),[[1,2],[3],[4],[5],[5]],'race-6'),/ライン/);
});
test('選手車番の重複は停止',()=>{
 const entries=make();entries[2].car='1';
 assert.throws(()=>prepare(entries,groups(6),'race-6'),/車番/);
});
