'use strict';
// Offline regression checks for the V11.24 strict comment-only fallback.
// Comment-derived groups remain unconfirmed and must never be promoted to DOM evidence.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const modes=['iphone','pc'];
function helpers(mode){
 const src=fs.readFileSync('bookmarklets/v1124_'+mode+'.js','utf8');
 const l=src.indexOf('const lineGroupCheck='),n=src.indexOf('const normalizeJp=',l);
 const s=src.indexOf('const surnameOf='),e=src.indexOf('const normBet=',s);
 assert.ok(l>=0&&n>l&&s>=0&&e>s,'helper boundaries must be stable');
 const pre='const normalizeJp=s=>String(s||\'\').normalize(\'NFKC\').replace(/[ 　]/g,\'\').trim();';
 const code=pre+src.slice(l,n)+src.slice(s,e)+'return {tryCommentStrictFallback,parseRegionTailStrict};';
 return new Function(code)();
}
const person=(car,pref)=>({car:String(car),name:'架空'+'甲乙丙丁戊己庚辛壬'[Number(car)-1],pref});
for(const mode of modes){
 test(mode+': local track code maps to prefecture, not a venue name',()=>{
  const f=helpers(mode),entries=[person(1,'山口'),person(5,'山口'),person(7,'広島')];
  assert.equal(f.parseRegionTailStrict('地元勢。','63',entries).pref,'山口');
 });
 test(mode+': explicit prefecture followers are recognized',()=>{
  const f=helpers(mode),entries=[person(2,'岡山'),person(8,'岡山'),person(7,'山口')];
  assert.equal(f.parseRegionTailStrict('岡山勢。','63',entries).pref,'岡山');
 });
 test(mode+': defensive 5-1-7 local chain remains reference-only',()=>{
  const f=helpers(mode),entries=[person(1,'山口'),person(5,'山口'),person(7,'広島'),person(2,'福岡'),person(9,'熊本')];
  const comments={1:'架空戊君。',5:'自力。',7:'地元勢。',2:'自力。',9:'架空乙君。'};
  // Name references here intentionally use full matching strings; the line stays unverified.
  const result=f.tryCommentStrictFallback({entries,comments,place:'63'});
  assert.ok(result.ok,JSON.stringify(result));
  assert.ok(result.lineGroups.some(g=>g.join('-')==='5-1-7'),JSON.stringify(result.lineGroups));
  assert.equal(result.lineSource,'commentStrictFallback');
 });
 test(mode+': defensive 2-8-7 prefecture chain remains reference-only',()=>{
  const f=helpers(mode),entries=[person(2,'岡山'),person(8,'岡山'),person(7,'山口'),person(1,'神奈川'),person(4,'福島')];
  const comments={2:'自力。',8:'架空乙君。',7:'岡山勢。',1:'自力。',4:'架空甲君。'};
  const result=f.tryCommentStrictFallback({entries,comments,place:'63'});
  assert.ok(result.ok,JSON.stringify(result));
  assert.ok(result.lineGroups.some(g=>g.join('-')==='2-8-7'),JSON.stringify(result.lineGroups));
  assert.equal(result.lineSource,'commentStrictFallback');
 });
}
