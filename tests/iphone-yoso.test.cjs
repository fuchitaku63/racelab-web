'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('bookmarklets/v1124_iphone_easy.js','utf8');
function part(a,b){const i=src.indexOf(a),j=src.indexOf(b,i);assert.ok(i>=0&&j>i,a+' section');return src.slice(i,j);}
const code=[
 part('const lineGroupCheck=','const normBet='),
 part('const parseFooterLineCandidate=','const getWrittenLineGroups='),
 part('const verifyYosoLineSection=','const fetchWithTimeout='),
].join('\n')+'return verifyYosoLineSection;';
const clean=x=>String(x??'').normalize('NFKC').replace(/[ \t\r\n]+/g,' ').trim();
const parse=new Function('clean','location',code)(clean,{href:'https://keirin.kdreams.jp/hofu/racedetail/6320261031010009/'});
const person=(car,name,pref)=>({car:String(car),name,pref});
const nine=[
 person(1,'山田 久徳','京都'),person(2,'寺沼 拓摩','東京'),
 person(3,'中川 聖大','福岡'),person(4,'牧 剛央','大分'),
 person(5,'南部 翔大','大阪'),person(6,'坂田 章','高知'),
 person(7,'志村 龍己','山梨'),person(8,'大塚 玲','神奈川'),
 person(9,'川口 公太朗','岐阜')];
const nineComments={1:'南部君。',2:'自力。',3:'自力。',4:'中川君。',5:'自力。',6:'九州勢。',7:'寺沼君。',8:'関東勢。',9:'近畿勢。'};
const twelve=[
 person(1,'郡司 浩平','神奈川'),person(2,'太田 海也','岡山'),
 person(3,'南 修二','大阪'),person(4,'渡部 幸訓','福島'),
 person(5,'松本 貴治','愛媛'),person(6,'佐々木 豪','愛媛'),
 person(7,'清水 裕友','山口'),person(8,'取鳥 雄吾','岡山'),
 person(9,'山口 拳矢','岐阜')];
const twelveComments={1:'自力。',2:'自力。',3:'単騎で。',4:'郡司君。',5:'自力。',6:'松本さん。',7:'岡山勢。',8:'太田君。',9:'自力。'};
const txt9='並び予想\n← 5先行 1追込 9追込 2押え先 7追込 8追込 3押え先 4追込 6追込\nレース評';
const txt12='並び予想\n← 1先行 4追込 2押え先 8追込 7追込 3自在 5まくり 6追込 9まくり\nレース評';
const url=r=>'https://keirin.kdreams.jp/hofu/racedetail/63202610310100'+String(r).padStart(2,'0')+'/?pageType=yoso';
const doc=(race,txt)=>({title:'防府競輪 レース詳細 | 周防国府杯争奪戦 '+race+'R S級一予選 | 2026年10月31日',body:{textContent:txt}});
test('same-origin yoso 9R official role sequence -> three groups',()=>{
 const r=parse(doc(9,txt9),nine,nineComments,url(9),9);
 assert.equal(r.ok,true,JSON.stringify(r.diagnostics));
 assert.equal(r.line,'5-1-9 / 2-7-8 / 3-4-6');
 assert.equal(r.lineSource,'footerLineDOM');
 assert.ok(r.source.includes('yoso'));
});
test('same-origin yoso 12R official role sequence -> includes Okayama tail',()=>{
 const r=parse(doc(12,txt12),twelve,twelveComments,url(12),12);
 assert.equal(r.ok,true,JSON.stringify(r.diagnostics));
 assert.equal(r.line,'1-4 / 2-8-7 / 3 / 5-6 / 9');
});
test('reject missing or duplicate role numbers',()=>{
 for(const changed of [txt12.replace('9まくり','8まくり'),txt12.replace('9まくり','情報なし')])
  assert.equal(parse(doc(12,changed),twelve,twelveComments,url(12),12).ok,false);
});
test('reject different title race, non-yoso URL and untrusted source',()=>{
 assert.equal(parse(doc(11,txt12),twelve,twelveComments,url(12),12).ok,false);
 assert.equal(parse(doc(12,txt12),twelve,twelveComments,url(12).replace('?pageType=yoso',''),12).ok,false);
 assert.equal(parse(doc(12,txt12),twelve,twelveComments,url(12).replace('keirin.kdreams.jp','evil.invalid'),12).ok,false);
});
test('reject contested line and duplicate headings',()=>{
 assert.equal(parse(doc(12,txt12.replace('9まくり','9競り')),twelve,twelveComments,url(12),12).ok,false);
 assert.equal(parse(doc(12,txt12+'並び予想'),twelve,twelveComments,url(12),12).ok,false);
});
test('same-origin fallback is wired only for missing role DOM; safety gate persists',()=>{
 assert.match(src,/if\(!wl\.ok&&entries\.length>=5\)/);
 assert.match(src,/searchParams\.set\('pageType','yoso'\)/);
 assert.match(src,/fetchWithTimeout\(yosoURL\.href\)/);
 assert.match(src,/const domConfirmed=lineSource==='footerLineDOM'&&wl\.originVerified===true;/);
 assert.match(src,/const BUILD_ID='iphone-easy-20261031-r4'/);
});
