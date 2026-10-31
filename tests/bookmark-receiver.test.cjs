'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {V23,V24,payload}=require('./fixtures.cjs');
const js=fs.readFileSync('app/v1/part-002.txt','utf8');const body=js.match(/<script id="bookmark-v1123">([\s\S]*?)<\/script>/)[1];
const ctx={TextEncoder,RaceImportCore:{candidateValidate:x=>JSON.parse(JSON.stringify(x))},RaceQualityCore:{sha256:x=>crypto.createHash('sha256').update(x).digest('hex')}};vm.createContext(ctx);vm.runInContext(body,ctx);const api=ctx.RaceBookmark1123;
const candidate=p=>api.toCandidates('資料ヘッダー\n'+JSON.stringify(p),'TEST_FIXTURE','2026-10-31T01:00:00Z').races[0];
test('V11.23 exact version remains accepted',()=>assert.equal(candidate(payload(V23)).entries.length,7));
test('V11.24 iPhone schema preserves participants, comments and line',()=>{const r=candidate(payload());assert.equal(r.entries[1].name,'架空選手乙');assert.equal(r.entries[1].comment,'架空選手甲さんへ');assert.equal(r.lines.notation,'1-2-3 / 4-5 / 6-7');assert.equal(r.bookmarkSafety.hold,false);});
for(const [name,change] of [
 ['DOM未確認',r=>{r.lineVerification.domConfirmed=false;}],
 ['ジカ',r=>{r.comments['2']='ジカで競る';}],
 ['番手競り',r=>{r.comments['2']='番手競り';}],
 ['ライン不一致',r=>{r.line='1-3-2 / 4-5 / 6-7';}],
 ['参照先が別ライン',r=>{r.comments['2']='4番車へ';}],
 ['競りフラグ',r=>{r.lineVerification.specialContested=true;}],
 ['欠員',r=>{r.lineGroups=[['1','2'],['4','5'],['6','7']];}],
 ['確認メタ欠落',r=>{delete r.lineVerification;}],
 ['source disagreement',r=>{r.lineSource='commentStrictFallback';}],
 ['安全判定NG',r=>{r.validForPrediction=false;}],
])test(name+'は表示保持・分析HOLD',()=>{const p=payload();change(p.races[0]);const r=candidate(p);assert.equal(r.entries.length,7);assert.equal(r.bookmarkSafety.hold,true);assert.throws(()=>api.assertReady(r),/HOLD/);});
test('odds bookmarklet or unknown version is rejected',()=>{const p=payload('11.24.1-odds');assert.throws(()=>candidate(p),/未対応|オッズ/);});
test('format errors reject without guessing',()=>{const p=payload();p.races[0].entries[1].car='1';assert.throws(()=>candidate(p),/重複/);});
test('manual line edit does not clear safety checks',()=>{const r=candidate(payload());r.lines.notation='1-3-2 / 4-5 / 6-7';assert.throws(()=>api.assertReady(r),/不一致/);});
test('odds-ready metadata is not accepted as no-odds analysis',()=>{const p=payload();p.races[0].systemReadiness.oddsReady=true;const r=candidate(p);assert.equal(r.bookmarkSafety.hold,true);assert.throws(()=>api.assertReady(r),/オッズ/);});
test('HTML-looking comments are retained as text',()=>{const p=payload();p.races[0].comments['1']='<img src=x onerror=alert(1)>';assert.equal(candidate(p).entries[0].comment,'<img src=x onerror=alert(1)>');});
test('別ラインへの選手名参照はHOLD',()=>{const p=payload();p.races[0].comments['2']='架空選手丁さんへ';assert.equal(candidate(p).bookmarkSafety.hold,true);});
test('曖昧な名前参照はHOLD',()=>{const p=payload();p.races[0].comments['2']='架空選手さんへ';assert.equal(candidate(p).bookmarkSafety.hold,true);});
test('安全なDOM診断を保持し、予期しない文字列は表示情報から除外',()=>{const p=payload();p.races[0].lineVerification.domConfirmed=false;p.races[0].lineVerification.diagnostics=['HEADING_COUNT=1','CANDIDATE=footerLineText;ROLE_SEQUENCE=1:先行;MISSING=2;DUPLICATE=;CLASSIFICATION=ROLE_SEQUENCE','CLASSIFICATION=HEADING_NOT_FOUND','氏名を含む未対応文字列'];const r=candidate(p);assert.equal(r.bookmarkSafety.hold,true);assert.equal(r.bookmarkSafety.diagnostics.length,3);assert.equal(r.bookmarkSafety.diagnostics[0],'HEADING_COUNT=1');});
