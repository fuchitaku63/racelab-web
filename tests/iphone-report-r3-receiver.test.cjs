'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const loader=fs.readFileSync('index.html','utf8');
const i=loader.indexOf('const reportAdapter='),j=loader.indexOf(';\n  const bodyEnd=',i);
assert.ok(i>0&&j>i,'versioned loader retains inline compatibility adapter');
const js=JSON.parse(loader.slice(i+'const reportAdapter='.length,j));
const part=fs.readFileSync('app/v1/part-002.txt','utf8');
const bm=part.match(/<script id="bookmark-v1123">([\s\S]*?)<\/script>/);
assert.ok(bm,'existing native V11.24 parser is present');
const handlers={};
const doc={readyState:'loading',addEventListener(type,fn){handlers[type]=fn;}};
const ctx={document:doc,TextEncoder,RaceImportCore:{candidateValidate:x=>x},RaceQualityCore:{sha256:x=>crypto.createHash('sha256').update(x).digest('hex')}};
vm.createContext(ctx);vm.runInContext(js,ctx);vm.runInContext(bm[1],ctx);
const convert=ctx.RaceLabIphoneReportAdapter.convertReport;
function report(rev='r3',n=9){
 const parts=['【競輪出走情報 iPhone抽出版】','識別: iphone-easy-20261031-'+rev,
  '対象: 防府｜指定 9R｜読み込み 1/1R','重要: 出走表とコメントを保持します。','',
  '【9R】 防府競輪 レース詳細 2026年10月31日','出走人数: '+n,
  '参考ライン: 5-1-9 / 2-7-8 / 3-4-6','ライン確認: 参考情報・正式ラインは要照合'];
 for(let k=1;k<=n;k++)parts.push(k+'番 架空選手'+k+' 得点'+(90+k)+'.25｜B'+k+' S0 逃1 捲2 差3 マ0｜コメント: '+(k===2?'架空選手1さんへ':'自力。'));
 return parts.join('\n');
}
test('r1,r2,r3,r4 iPhone short reports are accepted as editable source information',()=>{
 for(const ver of ['r1','r2','r3','r4']){
  const out=JSON.parse(convert(report(ver)));
  assert.equal(out.buildId,'iphone-easy-20261031-'+ver);
  assert.equal(out.version,'11.24-dom-verified-no-odds-strict');
  assert.equal(out.raceCount,1);
  assert.equal(out.races[0].entries.length,9);
  assert.equal(out.races[0].entries[0].score,'91.25');
  assert.equal(out.races[0].entries[0].b,'1');
  assert.equal(out.races[0].comments['2'],'架空選手1さんへ');
  assert.equal(out.races[0].lineVerification.domConfirmed,false);
  assert.equal(out.races[0].validForPrediction,false);
  const parsed=ctx.RaceBookmark1123.parse(convert(report(ver)));
  assert.equal(parsed.races[0].entries.length,9);
  assert.equal(parsed.races[0].bookmarkSafety.hold,true,'unverified line never becomes final prediction');
 }
});
test('invalid build IDs and malformed report must fail safely',()=>{
 assert.throws(()=>convert(report('r99')),/未対応/);
 assert.throws(()=>convert(report('r0')),/未対応/);
 assert.throws(()=>convert('【競輪出走情報 iPhone抽出版】\n識別: iphone-easy-20261031-r3'),/不足/);
});
test('direct V11.24 JSON still reaches original parser without adapter transformation',()=>{
 const {payload}=require('./fixtures.cjs');
 const src=JSON.stringify(payload());
 assert.equal(convert(src),null);
 assert.equal(ctx.RaceBookmark1123.parse(src).races.length,1);
});
test('conversion preserves text while refusing to confirm buyer-relevant line',()=>{
 const raw=report('r3').replace('コメント: 自力。','コメント: <img src=x onerror=window.evil=1>');
 const result=ctx.RaceBookmark1123.parse(convert(raw));
 assert.equal(result.races[0].entries[0].comment,'<img src=x onerror=window.evil=1>');
 assert.equal(result.races[0].bookmarkSafety.hold,true);
});
test('original 38-part SHA guard and script installation are maintained',()=>{
 assert.match(loader,/COUNT=38/);
 assert.match(loader,/EXPECTED='95937429ea7fe32251a1264171b252e7c3d9cdd8fe9578ddf01c8ea6b1ef78ca'/);
 assert.match(loader,/html\.lastIndexOf\('<\/body>'\)/);
 assert.equal(typeof handlers.DOMContentLoaded,'function');
});
