'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {payload}=require('./fixtures.cjs');
const txt=fs.readFileSync('app/v1/part-002.txt','utf8'), body=txt.match(/<script id="bookmark-v1123">([\s\S]*?)<\/script>/)[1];
const ctx={TextEncoder,RaceImportCore:{candidateValidate:x=>JSON.parse(JSON.stringify(x))},RaceQualityCore:{sha256:x=>crypto.createHash('sha256').update(x).digest('hex')}};vm.createContext(ctx);vm.runInContext(body,ctx);const api=ctx.RaceBookmark1123;
const encoded=p=>'抽出結果\n'+JSON.stringify(p);
function candidate(p){return api.toCandidates(encoded(p),'TEST_FIXTURE','2026-11-04T00:00:00Z');}
for(const version of ['11.25-master-hold-no-odds','11.25-integrated-no-odds'])test(version+' は出走者を表示し正式化を保留',()=>{const p=payload(version),r=candidate(p).races[0];assert.equal(r.entries.length,7);assert.equal(r.entries[1].comment,'架空選手甲さんへ');assert.equal(r.bookmarkSafety.hold,true);assert.throws(()=>api.assertReady(r),/HOLD/);});
test('V11.25に偽の許可フラグがあっても正式化を許さない',()=>{const p=payload('11.25-integrated-no-odds');p.races[0].lineVerification.externallyVerified=true;p.races[0].validForPrediction=true;const r=candidate(p).races[0];assert.equal(r.bookmarkSafety.hold,true);});
test('V11.25のHOLDを入力内で書き換えても正式化できない',()=>{const r=candidate(payload('11.25-integrated-no-odds')).races[0];r.bookmarkSafety.hold=false;r.bookmarkSafety.reasons=[];r.lines.notation=r.bookmarkSafety.rawLine;assert.throws(()=>api.assertReady(r),/HOLD/);});
const generated=()=>JSON.parse(fs.readFileSync('tests/fixtures/v1125_TEST_FIXTURE.json','utf8'));
test('条件付きフォーメーションを仮分析として保持し正式化しない',()=>{const r=candidate(generated()).races[0];assert.ok(r.bookmarkProvisional.formations.length>0);assert.equal(r.bookmarkProvisional.formations[0].count,5);assert.throws(()=>api.assertReady(r),/HOLD/);});
test('不一致・特殊ラインのフォーメーションは取り込まない',()=>{const p=generated();p.races[0].provisionalAnalysis.formations[0].count=4;assert.equal(candidate(p).races[0].bookmarkProvisional,null);p.races[0].provisionalAnalysis.formations[0].count=5;p.races[0].lineVerification.specialContested=true;assert.equal(candidate(p).races[0].bookmarkProvisional,null);});
test('ラインと仮分析が不整合または仮定ペアが欠落した場合は表示しない',()=>{const p=generated();p.races[0].lineGroups[0].reverse();assert.equal(candidate(p).races[0].bookmarkProvisional,null);const q=generated();q.races[0].provisionalAnalysis.formations.pop();assert.equal(candidate(q).races[0].bookmarkProvisional,null);});
test('複数レースで一部抽出失敗なら正常レースを表示しエラーを記録',()=>{const p=payload('11.25-integrated-no-odds');p.races.push({race:'2',url:'https://example.invalid/2',error:'HTTP 503',entryCount:0});p.raceCount=2;const out=candidate(p);assert.equal(out.races.length,1);assert.equal(out.importErrors.length,1);assert.match(out.importErrors[0].reason,/HTTP 503/);});
test('複数レースで不正な出走者があるレースだけ除外し原因を記録',()=>{const p=payload('11.25-integrated-no-odds'),bad=structuredClone(p.races[0]);bad.race='2';bad.entries[1].car='1';p.races.push(bad);p.raceCount=2;const out=candidate(p);assert.equal(out.races.length,1);assert.equal(out.importErrors[0].raceNo,2);assert.match(out.importErrors[0].reason,/重複/);});
test('未知の11.25やオッズ版を許可しない',()=>{assert.throws(()=>candidate(payload('11.25.1-odds')),/未対応|オッズ/);});
