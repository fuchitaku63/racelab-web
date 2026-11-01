'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('bookmarklets/v1124_iphone_easy.js','utf8');
const i=src.indexOf('const getComments='),j=src.indexOf('const getLineSeq=',i);
assert.ok(i>0&&j>i,'strict comments parser retained');
const clean=s=>String(s??'').normalize('NFKC').replace(/\u00a0/g,' ').replace(/[ \t\r\n]+/g,' ').trim();
const parse=new Function('clean',src.slice(i,j)+'return getComments;')(clean);
const entries=Array.from({length:9},(_,i)=>({car:String(i+1)}));
const outcome={no:1,rows:[
 ['予想','着順','車番','選手名','勝敗因'],
 ['','落','2','一戸 康宏','鐘前で転倒'],
 ['','8','1','角 宗哉','突張り先行'],
 ['','5','8','熊崎 麻人','逃争叩けず']
]};
const order=['1','2','3','4','5','6','7','8','9'];
const comments=['自力。','熊崎君。','自力。','九州３番手。','中四国３番手。','埼玉勢。','東矢君。','自力。','角君。'];
const pre={no:2,rows:[
 ['予想・周回・戦法','◎','▲','注'],
 ['1','9','5','8','2','6','3','7','4'],
 ['車 番 ・ 選 手 名',...order],
 ['選手名','角 宗哉','一戸 康宏','東矢 圭吾','佐々木 翔一','山中 貴雄','佐藤 真一','松尾 透','熊崎 麻人','小倉 竜二'],
 ['選 手 コ メ ン ト',...comments]
]};
test('real-page-shaped comments table is preferred even when result rows come first',()=>{
 const c=parse([outcome,pre],entries);
 assert.equal(c['2'],'熊崎君。');
 assert.equal(c['8'],'自力。');
 assert.equal(c['9'],'角君。');
 assert.deepEqual(Object.keys(c).sort(),order.slice().sort());
});
test('result rows may never overwrite confirmed pre-race comments',()=>{
 const c=parse([pre,outcome],entries);
 assert.equal(c['2'],'熊崎君。');
 assert.equal(c['1'],'自力。');
});
test('result-only pages yield no invented rider comments',()=>{
 const c=parse([outcome],entries);
 assert.equal(Object.keys(c).length,0);
});
test('malformed or mismatched car header yields no comments',()=>{
 const bad={...pre,rows:pre.rows.map((r,i)=>i===2?['車番・選手名','1','2','3','4','5','6','7','8','8']:r)};
 assert.equal(Object.keys(parse([outcome,bad],entries)).length,0);
});
test('short or shifted comment cells are rejected rather than misassigned',()=>{
 const bad={...pre,rows:pre.rows.map((r,i)=>i===4?r.slice(0,-1):r)};
 assert.equal(Object.keys(parse([bad],entries)).length,0);
});
test('line checks and source verification remain unchanged',()=>{
 assert.match(src,/const domConfirmed=lineSource==='footerLineDOM'&&wl\.originVerified===true;/);
 assert.match(src,/const comments=getComments\(tables,entries\)/);
 assert.match(src,/getWrittenLineGroups\(yosoDoc,tablesOf\(yosoDoc\),entries,comments/);
 assert.match(src,/const BUILD_ID='iphone-easy-20261101-r5'/);
});
