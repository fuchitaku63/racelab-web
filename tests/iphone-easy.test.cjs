'use strict';
// iPhone extraction-first tool: offline tests of source, compressed bookmarklet and installer.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('bookmarklets/v1124_iphone_easy.js','utf8');
const packed=fs.readFileSync('bookmarklets/generated/v1124_iphone_easy_compact.txt','utf8').trimEnd();
const html=fs.readFileSync('bookmarklets/install-v1124-iphone-easy.html','utf8');
const build='iphone-easy-20261101-r5';
function unpack(s){
 const m=s.match(/atob\('([^']+)'\)/);assert.ok(m,'must contain packed source');
 const bytes=Buffer.from(m[1],'base64'),out=[];
 for(let i=0;i<bytes.length;){const h=bytes[i++];if(h<128){for(let j=0;j<=h;j++)out.push(bytes[i++]);}else{const n=(h&127)+4,d=(bytes[i++]<<8)|bytes[i++];assert.ok(d>0&&d<=out.length,'valid backref');for(let j=0;j<n;j++)out.push(out[out.length-d]);}}
 return Buffer.from(out).toString('utf8');
}
test('source syntax and stable wire format',()=>{
 assert.doesNotThrow(()=>new Function(src.slice('javascript:'.length)));
 assert.match(src,/const VERSION='11\.24-dom-verified-no-odds-strict'/);
 assert.ok(src.includes('const BUILD_ID=\''+build+'\''));
 assert.ok(src.includes("const domConfirmed=lineSource==='footerLineDOM'&&wl.originVerified===true;"));
 assert.ok(src.includes("'📋 RaceLab用データをコピー'"));
 assert.ok(src.includes("area.value=payload;area.readOnly=true"));
 assert.ok(src.includes("btn.addEventListener('click',()=>copyTo(payload,btn))"));
});
test('compressed bookmarklet recovers source byte-for-byte',()=>{assert.equal(unpack(packed),src.slice(11));});
test('copy installer embeds the exact bookmarklet',()=>{
 const m=html.match(/<textarea[^>]*id="bookmarklet-source"[^>]*>([\s\S]*?)<\/textarea>/);assert.ok(m);
 const unescape=x=>x.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
 assert.equal(unescape(m[1]),packed);
 assert.match(html,/<meta charset="utf-8">/);
 assert.match(html,/clipboard\.writeText\(source\.value\)/);
 assert.match(html,/iphone-easy-20261101-r5/);
});
test('one-tap report contains riders and comments without fabricating line confirmation',()=>{
 const a=src.indexOf('const shortReport=(()=>{'),b=src.indexOf('const exportPanel=()=>{',a);
 assert.ok(a>0&&b>a);
 const make=new Function('races','base','spec','BUILD_ID',src.slice(a,b)+';return shortReport;');
 const races=[{race:'7',title:'架空7R',line:'5-1-7',lineVerification:{domConfirmed:false,issues:[]},entries:[{car:'1',name:'架空選手',score:104.5,b:'2',s:'1',nige:'0',makuri:'3',sashi:'1',marking:'0'}],comments:{1:'先行基本に。'}}];
 const report=make(races,{place:'63'},'7','iphone-easy-20261101-r5');
 assert.match(report,/架空選手/);assert.match(report,/先行基本に。/);
 assert.match(report,/5-1-7/);assert.match(report,/参考情報・正式ラインは要照合/);
 assert.match(report,/iphone-easy-20261101-r5/);
});
