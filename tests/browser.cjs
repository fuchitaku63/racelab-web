'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{execFileSync}=require('node:child_process');
const BROWSER=process.env.RACELAB_BROWSER==='webkit'?'webkit':'chromium';
let pw;for(const n of ['playwright','/opt/codex/runtimes/cua/lib/node_modules/playwright'])try{pw=require(n);break;}catch{}if(!pw)throw Error('Playwright が必要です');
const {payload,V23}=require('./fixtures.cjs');const baseline=process.env.RACELAB_BASE_REF||'e74309ecfa73bc598f09b23bac6756abf8303781';const root=process.cwd(),oldPaths=['index.html','sw.js','app/v1/part-000.txt','app/v1/part-002.txt','app/v1/part-037.txt'];const old=new Map(oldPaths.map(p=>[p,execFileSync('git',['show',baseline+':'+p],{maxBuffer:8*1024*1024})]));let oldMode=false;
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),p=decodeURIComponent(u.pathname).replace(/^\/+/,''),name=p||'index.html';if(name.includes('..')){res.writeHead(400).end();return;}try{const body=oldMode&&old.has(name)?old.get(name):fs.readFileSync(path.join(root,name));res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'application/javascript':name.endsWith('.txt')?'text/plain; charset=utf-8':'application/octet-stream');res.end(body);}catch{res.writeHead(404).end();}});
function casePayload(edit){const p=payload();edit?.(p.races[0]);return p;}
async function main(){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/`;let b;
try{b=await (BROWSER==='webkit'?pw.webkit:pw.chromium).launch(BROWSER==='webkit'?{headless:true}:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const context=await b.newContext({viewport:{width:390,height:844},...(BROWSER==='webkit'?{}:{permissions:['clipboard-read','clipboard-write']}),serviceWorkers:'block'});const page=await context.newPage(),errors=[],ext=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base))ext.push(r.url());});await page.goto(base);await page.waitForSelector('#horseToKeirin',{timeout:30000});await page.click('#horseToKeirin');
async function paste(p){const txt='【独自架空 TEST_FIXTURE】\n'+JSON.stringify(p);if(BROWSER==='webkit')await page.fill('#keirinPaste',txt);else{await page.evaluate(value=>navigator.clipboard.writeText(value),txt);await page.locator('#keirinPaste').click();await page.keyboard.press('Control+A');await page.keyboard.press('Control+V');}await page.click('#keirinImport');}
await paste(payload(V23));assert.equal(await page.locator('#keirinRankRows tr').count(),7);assert.equal(await page.locator('#keirinError').innerText(),'');await page.selectOption('#keirinRuns','10000');await page.click('#keirinSimulate');await page.waitForFunction(()=>document.querySelector('#keirinProgress').textContent.startsWith('完了：'),null,{timeout:30000});assert.equal(await page.locator('#keirinScenarios .hl-scenario').count(),3);console.log('PASS 実ブラウザ・V11.23クリップボード貼付と試算');
await paste(payload());assert.equal(await page.locator('#keirinRankRows tr').count(),7);assert.match(await page.locator('#keirinRankRows').innerText(),/架空選手甲さんへ/);assert.equal(await page.inputValue('#keirinLine'),'1-2-3 / 4-5 / 6-7');assert.equal(await page.locator('#keirinSimulate').isEnabled(),true);await page.selectOption('#keirinRuns','10000');await page.click('#keirinSimulate');await page.waitForFunction(()=>document.querySelector('#keirinProgress').textContent.startsWith('完了：'),null,{timeout:30000});assert.equal(await page.locator('#keirinScenarios .hl-scenario').count(),3);console.log('PASS V11.24貼付・コメント・ライン・試算');

await page.locator('#keirinFormation').waitFor({timeout:10000});
const nativeFormation=await page.evaluate(()=>{
 const source=[...document.querySelectorAll('#keirinScenarios .hl-ticket')].map(el=>el.textContent.trim());
 const actual=RaceLabKeirinFormation.buildExact(source);
 const first=[...document.querySelectorAll('#keirinScenarios .hl-scenario')]
  .flatMap(card=>[...card.querySelector('ol.hl-ticket-list').querySelectorAll('.hl-ticket')].map(n=>n.textContent.trim()));
 const main=RaceLabKeirinFormation.buildExact(first);
 const summaries=[...document.querySelectorAll('#keirinFormation summary')].map(x=>x.textContent.trim());
 const panel=document.getElementById('keirinFormation'),rect=panel.getBoundingClientRect();
 return{total:actual.pointCount,main:main.pointCount,
  lines:RaceLabKeirinFormation.expandBlocks(actual.blocks),
  source:[...new Set(source)].sort(),
  summaries,right:rect.right,viewport:innerWidth};
});
assert.deepEqual(nativeFormation.lines,nativeFormation.source,'no added trifecta combination');
assert.ok(nativeFormation.total>=nativeFormation.main);
assert.ok(nativeFormation.main>0);
assert.ok(nativeFormation.summaries.some(x=>x.includes('本線候補まとめ')));
assert.ok(nativeFormation.summaries.some(x=>x.includes('対抗・穴を含む全表示候補')));
assert.ok(nativeFormation.summaries.some(x=>x.includes('穴候補のみ')));
assert.ok(nativeFormation.right<=nativeFormation.viewport+2,'formation panel fits iPhone viewport');
await page.evaluate(()=>{
 window.__formationCopied='';
 Object.defineProperty(navigator,'clipboard',{configurable:true,
  value:{writeText:txt=>{window.__formationCopied=txt;return Promise.resolve();}}});
});
await page.locator('#keirinFormation details').first().locator('button').click();
await page.waitForFunction(()=>window.__formationCopied.includes('3連単フォーメーション'),null,{timeout:5000});
assert.match(await page.evaluate(()=>window.__formationCopied),/合計 \d+点/);
console.log('PASS 通常ライン確定試算から本線/対抗/穴の厳密フォーメーションとコピー');

await page.fill('#keirinLine','1-3-2 / 4-5 / 6-7');await page.click('#keirinSimulate');assert.match(await page.locator('#keirinError').innerText(),/HOLD.*不一致/);assert.equal(await page.locator('#keirinScenarios').innerText(),'');assert.equal(await page.locator('#keirinHoleFocus').isHidden(),true);await page.waitForFunction(()=>!document.getElementById('keirinFormation'));
console.log('PASS 入力ライン変更時の不一致HOLD・旧結果消去');
for(const [name,change] of [['DOM未確認',r=>{r.lineVerification.domConfirmed=false}],['ジカ',r=>{r.comments['2']='ジカで競る'}],['番手競り',r=>{r.comments['2']='番手競り'}],['ライン不一致',r=>{r.line='1-3-2 / 4-5 / 6-7'}],['コメントと別ライン',r=>{r.comments['2']='4番車へ'}]]){
 await paste(casePayload(change));
 await page.waitForFunction(()=>!document.getElementById('keirinSimulate').disabled,{timeout:10000});
 assert.equal(await page.locator('#keirinError').innerText(),'',name);
 assert.equal(await page.locator('#keirinSimulate').isEnabled(),true,name);
 assert.equal(await page.locator('#keirinRankRows tr').count(),7,name);
 assert.match(await page.locator('#keirinRankRows').innerText(),/コメント/,name);
 assert.equal(await page.locator('#keirinScenarios').innerText(),'',name);
 assert.equal(await page.locator('#keirinFormation').count(),0,'previous formation must clear on next import');
 await page.selectOption('#keirinRuns','10000');
 await page.click('#keirinSimulate');
 await page.waitForFunction(()=>document.querySelector('#keirinProgress').textContent.startsWith('完了：'),null,{timeout:30000});
 assert.equal(await page.locator('#keirinScenarios .hl-scenario').count(),3,name);
 assert.equal(await page.locator('#keirinScenarios .hl-scenario table').count(),0,'no wide 670px table in mobile results');
 assert.equal(await page.locator('#keirinScenarios .hl-scenario ol').count(),3,'six combos should be stacked');
 const bounds=await page.locator('#keirinScenarios .hl-scenario').evaluateAll(cards=>cards.map(el=>({
   left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,
   width:el.getBoundingClientRect().width,
   viewport:window.innerWidth,
   hasReference:el.textContent.includes('参考出現率')
 })));
 for(const b of bounds){assert.ok(b.right<=b.viewport+2&&b.left>=-2,'mobile result card must fit in viewport: '+JSON.stringify(b));assert.ok(b.hasReference);}
 assert.match(await page.locator('#keirinLinePreview').innerText(),/参考ライン・未確認/);
 assert.match(await page.locator('#keirinProgress').innerText(),/ライン補正なし/);
 
 await page.locator('#keirinFormation').waitFor({timeout:10000});
 const candidateCheck=await page.evaluate(()=>{
  const all=[...document.querySelectorAll('#keirinScenarios .hl-ticket')].map(n=>n.textContent.trim());
  const original=[...new Set(all)].sort();
  const model=RaceLabKeirinFormation.buildExact(all);
  const reconstituted=RaceLabKeirinFormation.expandBlocks(model.blocks);
  const box=document.getElementById('keirinFormation').getBoundingClientRect();
  return{expected:original,actual:reconstituted,count:model.pointCount,
   labels:[...document.querySelectorAll('#keirinFormation summary')].map(n=>n.textContent),
   within:box.right<=innerWidth+2};
 });
 assert.deepEqual(candidateCheck.actual,candidateCheck.expected,name);
 assert.equal(candidateCheck.count,candidateCheck.expected.length,name);
 assert.ok(candidateCheck.within,'reference formation fits mobile viewport');
 assert.ok(candidateCheck.labels.some(s=>s.includes('本線候補まとめ')));
 assert.ok(candidateCheck.labels.some(s=>s.includes('展開別')));

}console.log('PASS DOM未確認・競りでもライン補正なし参考試算。元情報を維持');
const mult=payload();const second=casePayload(r=>{r.lineVerification.domConfirmed=false}).races[0];second.race='2';mult.races.push(second);mult.raceCount=2;
await paste(mult);
assert.equal(await page.locator('#keirinSelect option').count(),2);
assert.equal(await page.locator('#keirinSimulate').isEnabled(),true);
await page.selectOption('#keirinSelect','1');
assert.equal(await page.locator('#keirinFormation').count(),0,'formation clears on race switch');
await page.waitForFunction(()=>!document.getElementById('keirinSimulate').disabled);
assert.equal(await page.locator('#keirinSimulate').isEnabled(),true);
await page.selectOption('#keirinSelect','0');
assert.equal(await page.locator('#keirinSimulate').isEnabled(),true);
console.log('PASS レース選択ごとに通常モデルとラインなし参考モデルを切替');
await page.selectOption('#keirinRuns','100000');
await page.click('#keirinSimulate');
await page.selectOption('#keirinSelect','1');
await page.waitForTimeout(1000);
assert.equal(await page.locator('#keirinSimulate').isEnabled(),true);
assert.equal(await page.locator('#keirinScenarios').innerText(),'');
assert.equal(await page.locator('#keirinError').innerText(),'');
console.log('PASS 試算中のレース切替で古い結果を消去し次のレースを操作可能');
const injected=payload();injected.races[0].comments['1']='<img src=x onerror=window.__bad=1>';await paste(injected);assert.equal(await page.locator('#keirinRankRows img').count(),0);assert.equal(await page.evaluate(()=>window.__bad),undefined);assert.match(await page.locator('#keirinRankRows').innerText(),/<img/);console.log('PASS コメントはHTMLとして実行されない');
const bad=payload('11.24.1-odds');await paste(bad);assert.match(await page.locator('#keirinError').innerText(),/未対応|オッズ/);assert.equal(await page.locator('#keirinSelect option').count(),1);console.log('PASS オッズ版拒否・既存候補維持');
await page.setInputFiles('#keirinFile','tests/fixtures/keirinjp_9_12_TEST_FIXTURE.pdf');await page.waitForFunction(()=>document.querySelector('#keirinStatus').textContent.includes('4レース'),null,{timeout:30000});assert.equal(await page.locator('#keirinSelect option').count(),4);assert.equal(await page.locator('#keirinRankRows tr').count(),7);console.log('PASS 架空PDF4レースの既存取込');
await page.click('#keirinAdvanced');await page.fill('#quickPaste',JSON.stringify(casePayload(r=>{r.lineVerification.domConfirmed=false})));await page.click('#quickImport');assert.match(await page.locator('#quickDataState').innerText(),/分析HOLD/);await page.click('#quickAnalyze');assert.match(await page.locator('#quickError').innerText(),/分析HOLD/);await page.locator('#quickFormalStage').evaluate(x=>x.closest('details').open=true);await page.click('#quickFormalStage');assert.match(await page.locator('#quickError').innerText(),/分析HOLD/);const gate=await page.evaluate(v=>{const a=RaceBookmark1123.toCandidates(JSON.stringify(v),'TEST_FIXTURE',new Date().toISOString().replace(/\.\d{3}Z$/,'Z'));try{RaceImportCore.candidateMerge(a,0,a,0);return 'BAD';}catch(e){return e.message;}},casePayload(r=>{r.lineVerification.domConfirmed=false}));assert.match(gate,/分析HOLD/);console.log('PASS 詳細画面・正式化・結合でもHOLD');assert.deepEqual(errors,[]);assert.deepEqual(ext,[]);await context.close();
const badContext=await b.newContext({serviceWorkers:'block'});const broken=await badContext.newPage();await broken.route('**/part-002.txt*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text())+' '});});await broken.goto(base);await broken.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('整合性検査に失敗'),null,{timeout:30000});console.log('PASS 38分割の破損をSHA-256検査で拒否');await badContext.close();
// WebKit runner verifies rendering/input/simulation; cached SW upgrade is Chromium-only in Playwright.
if(BROWSER!=='webkit'){
// Verify an upgrade from the unmodified published service worker and cached v1 shell.
oldMode=true;const swContext=await b.newContext();const swPage=await swContext.newPage();await swPage.goto(base);await swPage.waitForSelector('#horseToKeirin',{timeout:30000});await swPage.evaluate(()=>navigator.serviceWorker.ready);await swPage.reload();await swPage.waitForSelector('#horseToKeirin',{timeout:30000});oldMode=false;await swPage.reload();await swPage.waitForSelector('#horseToKeirin',{timeout:30000});for(let i=0;i<100;i++){const keys=await swPage.evaluate(()=>caches.keys());if(keys.includes('racelab-shell-gitpages-v2-v1124')&&!keys.includes('racelab-shell-gitpages-v1'))break;if(i===99)throw Error('新版Service Workerの有効化に失敗: '+keys.join(','));await swPage.waitForTimeout(100);}await swPage.waitForTimeout(1000);await swContext.setOffline(true);await swPage.reload();await swPage.waitForSelector('#horseToKeirin',{timeout:30000});await swPage.click('#horseToKeirin');await swPage.fill('#keirinPaste',JSON.stringify(payload()));await swPage.click('#keirinImport');assert.equal(await swPage.locator('#keirinRankRows tr').count(),7,await swPage.locator('#keirinError').innerText());console.log('PASS 旧キャッシュからの更新・オフライン再起動');await swContext.close();
}
}finally{if(b)await b.close();await new Promise(r=>server.close(r));}}
main().catch(e=>{console.error(e);process.exitCode=1});
