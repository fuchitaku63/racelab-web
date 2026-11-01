'use strict';
/* Integration diagnostic only: never a required/offline test.
 * Checks public Kdreams yoso pages against the exact r5 fallback parser.
 */
const fs=require('node:fs');
const {chromium}=require('playwright');
const src=fs.readFileSync('bookmarklets/v1124_iphone_easy.js','utf8');
const part=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i);if(i<0||j<i)throw Error('Source section missing: '+a);return src.slice(i,j)};
const clean=s=>String(s??'').normalize('NFKC').replace(/\u00a0/g,' ').replace(/[ \t\r\n]+/g,' ').trim();
const fn=new Function('clean','location',[
 part('const segOf=u=>','const base='),
 part('const lineGroupCheck=','const normalizeJp='),
 part('const parsePublishedRoleLine=','const getWrittenLineGroups='),
 part('const verifyYosoLineSection=','const fetchWithTimeout=')
].join('\n')+'return verifyYosoLineSection;')
 (clean,{href:'https://keirin.kdreams.jp/hofu/racedetail/6320261031010009/'});
const entries=Array.from({length:9},(_,i)=>({car:String(i+1),name:'検証車'+(i+1),pref:'山口'}));
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 let success=0,checked=0;
 try{
  for(const race of [9,12]){
   const url='https://keirin.kdreams.jp/hofu/racedetail/63202610310100'+String(race).padStart(2,'0')+'/?pageType=yoso';
   const page=await browser.newPage({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1'});
   try{
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
    await page.waitForTimeout(1200);
    const info=await page.evaluate(()=>({
     title:document.title,
     inner:document.body?.innerText||'',
     raw:document.body?.textContent||'',
     markupCount:document.querySelectorAll('dl.racecard_footer-contents,.racecard_footer-contents,[class*="racecard_footer"]').length,
     footerSections:[...document.querySelectorAll('dl.racecard_footer-contents')].map(e=>({
      heading:e.querySelector('dt')?.textContent||'',
      children:[...(e.querySelector('dd .one_line_info')?.children||[])].map(el=>({className:el.className,textContent:el.textContent}))
     }))
    }));
    const doc={title:info.title,body:{textContent:info.raw},
     querySelectorAll(selector){
      if(selector!=='dl.racecard_footer-contents')return[];
      return info.footerSections.map(section=>({
       querySelector(q){
        if(q==='dt')return{textContent:section.heading};
        if(q==='dd .one_line_info')return{children:section.children.map(el=>({
         textContent:el.textContent,
         classList:{contains:c=>el.className.split(/\s+/).includes(c)}
        }))};
        return null;
       }
      }));
     }
    };
    const result=fn(doc,entries,{},url,race);
    checked++;
    if(result.ok)success++;
    const section=info.inner.match(/並び予想[\s\S]{0,200}/)?.[0]||'NOT_FOUND';
    console.log('LIVE_KDREAMS',JSON.stringify({
     race,http:response?.status(),title:info.title,
     markupCount:info.markupCount,innerLength:info.inner.length,rawLength:info.raw.length,
     example:section.slice(0,230),recognized:result.ok,line:result.line||null,
     diagnostics:result.diagnostics,footerSectionCount:info.footerSections.length,expectedMatches:result.line===({9:'5-1-9 / 2-7-8 / 3-4-6',12:'1-4 / 2-8-7 / 3 / 5-6 / 9'}[race])
    }));
   }catch(e){console.log('LIVE_KDREAMS_UNAVAILABLE',race,String(e).slice(0,250));}
   await page.close();
  }
 }finally{await browser.close();}
 console.log('LIVE_KDREAMS_SUMMARY',{checked,success});
})().catch(e=>{console.error('LIVE_KDREAMS_DIAG_ERROR',String(e));process.exitCode=1;});
