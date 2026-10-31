'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const addon=fs.readFileSync('addons/iphone-easy-report.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const htmlPart=fs.readFileSync('app/v1/part-002.txt','utf8');
const begin=htmlPart.indexOf('<script id="bookmark-v1123">');
const end=htmlPart.indexOf('</script>',begin);
const moduleScript=htmlPart.slice(htmlPart.indexOf('\n',begin)+1,end);
function adapter(){const root={};const doc={readyState:'loading',addEventListener(){}};new Function('document','globalThis',addon)(doc,root);return root.RaceLabIphoneReportAdapter;}
const input=['【競輪出走情報 iPhone抽出版】','識別: iphone-easy-20261031-r1','対象: 63｜指定 12R｜読み込み 1/1R',
 '【12R】 防府競輪 レース詳細 | 周防国府杯争奪戦 12R S級初特選 | 2026年10月31日【楽天Kドリームス】',
 '出走人数: 9','参考ライン: 1-4 / 2-8-7 / 3 / 5-6 / 9','ライン確認: 参考情報・正式ラインは要照合',
 ...[['郡司 浩平',116.6,'自力。'],['太田 海也',123.5,'自力。'],['南 修二',114.71,'単騎で。'],['渡部 幸訓',114.42,'郡司君。'],['松本 貴治',118.64,'自力。'],['佐々木 豪',113.91,'松本さん。'],['清水 裕友',116.06,'岡山勢。'],['取鳥 雄吾',113.91,'太田君。'],['山口 拳矢',115.37,'自力。']].map(([name,score,comment],i)=>`${i+1}番 ${name} 得点${score}｜B0 S0 逃0 捲1 差1 マ0｜コメント: ${comment}`)].join('\n');
test('app loader keeps exact original 38-part integrity hash and bundles adapter',()=>{
 assert.match(index,/COUNT=38, PREFIX/);
 assert.match(index,/EXPECTED='95937429ea7fe32251a1264171b252e7c3d9cdd8fe9578ddf01c8ea6b1ef78ca'/);
 assert.match(index,/hash!==EXPECTED/);
 const start=index.indexOf('  const reportAdapter=');
 const stop=index.indexOf(';\n  const bodyEnd=',start);
 assert.ok(start>=0&&stop>start);
 const actual=JSON.parse(index.slice(start+'  const reportAdapter='.length,stop));
 assert.equal(actual,addon);
});
test('easy report is accepted by real RaceBookmark1123.parse, riders preserved, HOLD retained',()=>{
 const wrapper={};new Function('globalThis',moduleScript)(wrapper);
 const converted=adapter().convertReport(input);
 const parsed=wrapper.RaceBookmark1123.parse(converted);
 assert.equal(parsed.races.length,1);
 assert.equal(parsed.races[0].entries.length,9);
 assert.equal(parsed.races[0].entries[0].name,'郡司浩平');
 assert.equal(parsed.races[0].entries[0].observed.score,116.6);
 assert.equal(parsed.races[0].entries[6].comment,'岡山勢。');
 assert.equal(parsed.races[0].bookmarkSafety.hold,true);
 assert.match(parsed.races[0].bookmarkSafety.reasons.join(' / '),/並び予想DOM未確認/);
});
test('wrong format and missing riders never become predicted-ready',()=>{
 assert.equal(adapter().convertReport('JSONではない普通の文章'),null);
 assert.throws(()=>adapter().convertReport(input.replace('識別: iphone-easy-20261031-r1','識別: legacy')));
 assert.throws(()=>adapter().convertReport(input.replace(/\n[3-9]番 .*$/gm,'')),/不足/);
});
