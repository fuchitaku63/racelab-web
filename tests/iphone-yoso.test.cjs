'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('bookmarklets/v1124_iphone_easy.js','utf8');
function part(a,b){const i=src.indexOf(a),j=src.indexOf(b,i);assert.ok(i>=0&&j>i,a+' section');return src.slice(i,j);}
const code=[
 part('const segOf=u=>','const base='),
 part('const lineGroupCheck=','const normalizeJp='),
 part('const parseFooterLineCandidate=','const getWrittenLineGroups='),
 part('const verifyYosoLineSection=','const fetchWithTimeout='),
].join('\n')+'return {verifyYosoLineSection,parsePublishedRoleLine};';
const clean=x=>String(x??'').normalize('NFKC').replace(/[ \t\r\n]+/g,' ').trim();
const functions=new Function('clean','location',code)(clean,{href:'https://keirin.kdreams.jp/hofu/racedetail/6320261031010009/'});
const {verifyYosoLineSection:parse,parsePublishedRoleLine:line}=functions;
const person=(car,name,pref)=>({car:String(car),name,pref});
const entries=Array.from({length:9},(_,i)=>person(i+1,'架空選手'+(i+1),'山口'));
const comments={1:'自力。',2:'自力。',3:'単騎で。',4:'2番車へ。',5:'自力。',6:'5番車へ。',7:'岡山勢へ。',8:'太田君。',9:'自力。'};
const roles={
 r1:'← 1先行 9追込 5追込 8押え先 2追込 6追込 3押え先 7追込 4追込',
 r9:'← 5先行 1追込 9追込 2押え先 7追込 8追込 3押え先 4追込 6追込',
 r12:'← 1先行 4追込 2押え先 8追込 7追込 3自在 5まくり 6追込 9まくり'
};
const url=r=>'https://keirin.kdreams.jp/hofu/racedetail/63202610310100'+String(r).padStart(2,'0')+'/?pageType=yoso';
const doc=(race,body)=>({title:'防府競輪 レース詳細 | 周防国府杯争奪戦 '+race+'R S級初特選 | 2026年10月31日',
 body:{textContent:body,cloneNode(){return this;}}});
const body=roles=>'広告　おすすめ記事\n並び予想\n'+roles+'\nレース評\nここからは参考予想。\n';
test('published role numbers create lines without comment-based grouping',()=>{
 assert.equal(line(roles.r1,entries).map(g=>g.join('-')).join(' / '),'1-9-5 / 8-2-6 / 3-7-4');
 assert.equal(line(roles.r9,entries).map(g=>g.join('-')).join(' / '),'5-1-9 / 2-7-8 / 3-4-6');
 assert.equal(line(roles.r12,entries).map(g=>g.join('-')).join(' / '),'1-4 / 2-8-7 / 3 / 5-6 / 9');
});
test('single yoso role section is approved on same-origin same-race page',()=>{
 for(const [r,v,expected] of [[1,roles.r1,'1-9-5 / 8-2-6 / 3-7-4'],
  [9,roles.r9,'5-1-9 / 2-7-8 / 3-4-6'],[12,roles.r12,'1-4 / 2-8-7 / 3 / 5-6 / 9']]){
  const out=parse(doc(r,body(v)),entries,comments,url(r),r);
  assert.equal(out.ok,true,JSON.stringify(out.diagnostics));
  assert.equal(out.line,expected);
  assert.equal(out.originVerified,true);
  assert.equal(out.lineSource,'footerLineDOM');
 }
});
test('duplicate mobile/desktop headings with identical role groups are accepted',()=>{
 const repeated=body(roles.r12)+'\n'+body(roles.r12);
 const result=parse(doc(12,repeated),entries,comments,url(12),12);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.equal(result.line,'1-4 / 2-8-7 / 3 / 5-6 / 9');
 assert.ok(result.diagnostics.includes('YOSO_HEADING_COUNT=2'));
});
test('unrelated navigation heading does not suppress a full published section',()=>{
 const content='並び予想\n選手紹介はこちら\n'+body(roles.r9);
 const result=parse(doc(9,content),entries,comments,url(9),9);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
});
test('conflicting full role sequences are rejected instead of arbitrarily choosing',()=>{
 const content=body(roles.r12)+body(roles.r9);
 const result=parse(doc(12,content),entries,comments,url(12),12);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.includes('YOSO_LINE_CONFLICT'));
});
test('duplicate, missing or contested roles are not approved',()=>{
 for(const bad of [roles.r12.replace('9まくり','8まくり'),
  roles.r12.replace('9まくり','欠場'),roles.r12.replace('9まくり','9競り')]){
  const result=parse(doc(12,body(bad)),entries,comments,url(12),12);
  assert.equal(result.ok,false,JSON.stringify(result.diagnostics));
 }
});
test('same-origin, page type, race-number and title gates are retained',()=>{
 for(const [d,u,r] of [
  [doc(11,body(roles.r12)),url(12),12],
  [doc(12,body(roles.r12)),url(12).replace('?pageType=yoso',''),12],
  [doc(12,body(roles.r12)),url(12).replace('keirin.kdreams.jp','evil.invalid'),12],
  [doc(12,body(roles.r12)),url(9),12]])assert.equal(parse(d,entries,comments,u,r).ok,false);
});
test('source fetch retries when a text-only lineup left DOM unverified',()=>{
 assert.match(src,/if\(\(!wl\.ok\|\|wl\.lineSource!=='footerLineDOM'\|\|wl\.originVerified!==true\)&&entries\.length>=5\)/);
 assert.match(src,/searchParams\.set\('pageType','yoso'\)/);
 assert.match(src,/fetchWithTimeout\(yosoURL\.href\)/);
 assert.match(src,/const domConfirmed=lineSource==='footerLineDOM'&&wl\.originVerified===true;/);
 assert.match(src,/const BUILD_ID='iphone-easy-20261101-r5'/);
});
