'use strict';
// Synthetic bookmarklet output only; no network access beyond this local server.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const pw=require('/opt/codex/runtimes/cua/lib/node_modules/playwright');
const engine=process.env.RACELAB_BROWSER==='webkit'?'webkit':'chromium',root=process.cwd();
const data=JSON.parse(fs.readFileSync(process.env.KEIRIN_V1125_FIXTURE||'tests/fixtures/v1125_TEST_FIXTURE.json','utf8'));
const server=http.createServer((req,res)=>{const n=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\/+/, '')||'index.html';if(n.includes('..'))return res.writeHead(400).end();try{const b=fs.readFileSync(path.join(root,n));res.setHeader('Content-Type',n.endsWith('.html')?'text/html; charset=utf-8':n.endsWith('.js')?'application/javascript':'text/plain; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(b);}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 const cfg=engine==='webkit'?{headless:true,executablePath:process.env.RACELAB_WEBKIT}:{headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']};
 browser=await pw[engine].launch(cfg);const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await ctx.newPage(),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:'))external.push(r.url());});page.setDefaultTimeout(15000);
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:20000});await page.waitForSelector('#horseToKeirin');await page.click('#horseToKeirin');
 async function paste(p){await page.fill('#keirinPaste',JSON.stringify(p));await page.click('#keirinImport');}
 await paste(data);assert.equal(await page.locator('#keirinSelect option').count(),2);assert.equal(await page.locator('#keirinRankRows tr').count(),7);assert.match(await page.locator('#keirinError').innerText(),/HOLD/);assert.equal(await page.locator('#keirinSimulate').isDisabled(),true);await page.locator('#keirinBookmarkProvisional summary').click();assert.match(await page.locator('#keirinBookmarkProvisional').innerText(),/仮分析.*未認証/s);assert.match(await page.locator('#keirinBookmarkProvisional pre').innerText(),/1着.*2着.*3着/);
 if(process.env.RACELAB_SCREENSHOT)await page.screenshot({path:process.env.RACELAB_SCREENSHOT,fullPage:true});
 const mixed=structuredClone(data);mixed.races[1]={race:'2',error:'HTTP 503',entryCount:0};await paste(mixed);assert.equal(await page.locator('#keirinSelect option').count(),1);assert.match(await page.locator('#keirinStatus').innerText(),/2R HTTP 503/);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS',engine,'V11.25架空ブックマークレット出力の受信、出走表示、HOLD、個別エラー隔離');await ctx.close();
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1});
