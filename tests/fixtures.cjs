'use strict';
// Entirely invented examples based on the V11.24 iPhone output schema.
const V23='11.23-core-auto-only-master-pattern-no-odds-line-reference-footer-boundary-fix';
const V24='11.24-dom-verified-no-odds-strict';
function race(){const entries=Array.from({length:7},(_,i)=>({car:String(i+1),name:'架空選手'+['甲','乙','丙','丁','戊','己','庚'][i],pref:'架空県',grade:'A1',leg:'両',score:90+i,nige:'1',makuri:'2',sashi:'1',marking:'0',s:'0',b:'1',winRate:'10',ren2:'20',ren3:'30'}));return {race:'1',title:'架空競輪 レース詳細 2026年10月31日 TEST_FIXTURE',url:'https://example.invalid/test-fixture',line:'1-2-3 / 4-5 / 6-7',lineGroups:[['1','2','3'],['4','5'],['6','7']],lineSeq:'1-2-3-4-5-6-7',lineSource:'footerLineDOM',lineVerification:{domConfirmed:true,source:'footerLineDOM:test',rawFooter:'1-2-3 / 4-5 / 6-7',specialContested:false,provisionalLineGroups:[],issues:[],diagnostics:[]},manualLineRequired:false,lineGroupCheck:{ok:true,reasons:[]},entryCount:7,carCount:7,expectedCarCount:7,validForPrediction:true,systemReadiness:{lineReady:true,oddsReady:false,lineGroupOK:true},entries,comments:{'1':'自力','2':'架空選手甲さんへ','3':'1番車の3番手','4':'自力','5':'4番車へ','6':'自力','7':'6番車へ'}};}
function payload(version=V24){return {version,mode:'iphone',linePolicy:'参考',createdAt:'2026/10/31 10:00:00',raceCount:1,races:[race()]};}
module.exports={V23,V24,race,payload};
