'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {prepare}=require('../src/structured-reference.cjs');
const make=(n=6)=>Array.from({length:n},(_,i)=>({car:String(i+1),name:'選手'+(i+1),score:95+i,b:i,nige:i,makuri:2,sashi:1,marking:0,winRate:10,ren2:20,ren3:30,raw:'旧抽出器の形式差'}));
for(const n of [5,6,7,8,9])test(n+'車：rawの有無が計算入力に影響しない',()=>{
 const entries=make(n),groups=[[1,2],...Array.from({length:n-2},(_,i)=>[i+3])];
 assert.deepEqual(prepare(entries,groups,'race-6'),prepare(entries.map(({raw,...rest})=>rest),groups,'race-6'));
});
test('決まり手統計が未取得なら停止',()=>{
 const entries=make();delete entries[0].makuri;
 assert.throws(()=>prepare(entries,[[1,2],[3],[4],[5],[6]],'race-6'),/未取得/);
});
test('ライン車番の欠落・重複は停止',()=>{
 assert.throws(()=>prepare(make(),[[1,2],[3],[4],[5],[5]],'race-6'),/ライン/);
});
test('選手車番の重複は停止',()=>{
 const entries=make();entries[2].car='1';
 assert.throws(()=>prepare(entries,[[1,2],[3],[4],[5],[6]],'race-6'),/車番/);
});
