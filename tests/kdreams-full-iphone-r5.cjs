'use strict';
/* Non-blocking public-page integration of the actual r5 Safari bookmarklet.
 * No odds, wagering or user accounts. Public Kdreams race detail only.
 */
const fs=require('node:fs');
const pw=require('playwright');
const BROWSER=process.env.RACELAB_BROWSER==='webkit'?'webkit':'chromium';
const source=fs.readFileSync('bookmarklets/v1124_iphone_easy.js','utf8');
const raceURL='https://keirin.kdreams.jp/hofu/racedetail/6320261031020006/';
const expectedLine='9-3-7 / 2-4 / 1-5-6 / 8';
(async()=>{
 const launch=BROWSER==='webkit'?{headless:true}:{headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']};
 const browser=await pw[BROWSER].launch(launch);
 try{
  const context=await browser.newContext({
   viewport:{width:390,height:844},
   userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1',
   bypassCSP:true,serviceWorkers:'block'
  });
  const page=await context.newPage();
  page.on('pageerror',e=>console.log('KDREAMS_PAGEERROR',String(e).slice(0,450)));
  const res=await page.goto(raceURL,{waitUntil:'domcontentloaded',timeout:30000});
  await page.evaluate(script=>{void (0,eval)(script.slice('javascript:'.length));return true;},source);
  await page.locator('#v1124-race-picker').waitFor({timeout:10000});
  await page.locator('#v1124-race-custom').fill('6');
  await page.locator('#v1124-race-go').click();
  await page.locator('#v1124-output-overlay textarea[aria-label="RaceLab用JSONデータ"]').waitFor({timeout:45000});
  const raw=await page.locator('#v1124-output-overlay textarea[aria-label="RaceLab用JSONデータ"]').inputValue();
  const parsed=JSON.parse(raw);
  const r=parsed.races?.[0];
  const result={browser:BROWSER,http:res?.status(),buildId:parsed.buildId,
   raceCount:parsed.raceCount,race:r?.race,entryCount:r?.entryCount,
   line:r?.line,lineSource:r?.lineSource,
   domConfirmed:r?.lineVerification?.domConfirmed,
   lineGroupsOK:r?.lineGroupCheck?.ok,
   warnings:r?.lineVerification?.issues,
   diagnostics:r?.lineVerification?.diagnostics,
   error:r?.error||null};
  console.log('LIVE_IPHONE_BOOKMARKLET',JSON.stringify(result));
  if(r?.line!==expectedLine||r?.lineVerification?.domConfirmed!==true||r?.entryCount!==9)
   throw Error('Actual bookmarked extraction is incomplete: '+JSON.stringify(result).slice(0,2500));
  console.log('PASS LIVE_IPHONE_BOOKMARKLET_R5 '+BROWSER+' '+r.line);
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error('LIVE_IPHONE_BOOKMARKLET_FAIL '+BROWSER+' '+String(e).slice(0,1400));process.exitCode=1;});
