/* RaceLab iPhone text-report compatibility adapter.
 * A short user-readable V11.24 report is converted into a deliberately
 * UNCONFIRMED structured import. Never synthesize URL/line verification.
 */
(()=>{'use strict';
const HEADER='【競輪出走情報 iPhone抽出版】';
const VERSION='11.24-dom-verified-no-odds-strict';
function convertReport(input){
 if(typeof input!=='string'||!input.trim().startsWith(HEADER))return null;
 if(input.length>150000)throw Error('簡易レポートが長すぎます');
 const lines=input.replace(/\r\n?/g,'\n').split('\n').map(s=>s.trim());
 const m=lines.find(s=>s.startsWith('識別: '));
 const buildId=m?m.slice('識別: '.length).trim():'';
 if(!/^iphone-easy-20261031-r[123]$/.test(buildId))throw Error('未対応のiPhone簡易レポートです');
 const current=[];let race=null,ref='iPhone簡易レポート貼付（元ページURLは未記録）';
 for(const line of lines){
  const h=line.match(/^【([1-9]|1[0-2])R】\s*(.+)$/);
  if(h){race={race:h[1],title:h[2],url:ref,entries:[],comments:{},line:'',lineGroups:[]};current.push(race);continue;}
  if(!race)continue;
  if(line.startsWith('参考ライン: ')){race.line=line.slice(7).trim();continue;}
  const mm=line.match(/^([1-9])番\s+(.+?)\s*｜\s*(B[^｜]*)\s*｜\s*コメント:\s*(.*)$/);
  if(!mm)continue;
  let nameScore=mm[2],score='';
  const sm=nameScore.match(/\s+得点(\d+(?:\.\d+)?)$/);
  if(sm){score=sm[1];nameScore=nameScore.slice(0,sm.index).trim();}
  const num=mm[1],name=nameScore.trim(),stats=mm[3];
  if(!name||race.entries.some(e=>e.car===num))throw Error(race.race+'Rの車番・氏名が重複しています');
  const find=(label)=>{const m=stats.match(new RegExp('(?:^|\\s)'+label+'(\\d+)'));return m?m[1]:'';};
  const entry={car:num,name,score,b:find('B'),s:find('S'),nige:find('逃'),makuri:find('捲'),sashi:find('差'),marking:find('マ'),winRate:'',ren2:'',ren3:'',grade:'',leg:'',pref:''};
  race.entries.push(entry);
  if(mm[4]&&mm[4]!=='未取得')race.comments[num]=mm[4];
 }
 if(!current.length||current.some(r=>r.entries.length<3))throw Error('レースまたは出走選手が不足しています');
 const selected=new Set();for(const r of current){
  if(selected.has(r.race))throw Error('同じレースが重複しています');selected.add(r.race);
  const g=r.line.split('/').map(s=>s.trim()).filter(Boolean).map(s=>s.split('-').filter(Boolean));
  r.lineGroups=g;r.lineSeq=g.flat().join('-');
  r.entryCount=r.entries.length;r.carCount=r.entries.length;r.expectedCarCount=r.entries.length;
  r.manualLineRequired=true;r.validForPrediction=false;r.lineSource='commentStrictFallback';
  r.lineVerification={domConfirmed:false,source:null,rawFooter:'',specialContested:/競り|ジカ/.test(Object.values(r.comments).join(' ')),issues:['文章レポート由来：公式DOMと元ページURLを確認していません'],diagnostics:['EASY_REPORT_ADAPTER=1']};
  r.lineGroupCheck={ok:false,reasons:['文章レポートからの参考ライン'],flatCount:g.flat().length};
  r.systemReadiness={lineReady:false,lineGroupOK:false,oddsReady:false,coreCandidateReady:false};
 }
 return JSON.stringify({version:VERSION,extractorRevision:'iphone-easy-report-adapter-2',mode:'iphone',buildId,createdAt:new Date().toISOString(),raceCount:current.length,races:current});
}
function init(){
 document.addEventListener('click',e=>{
  const button=e.target.closest?.('#keirinImport');if(!button)return;
  const field=document.getElementById('keirinPaste');if(!field||!field.value.trim().startsWith(HEADER))return;
  try{const json=convertReport(field.value);if(!json)return;field.value=json;
   const s=document.getElementById('keirinStatus');if(s)s.textContent='iPhone簡易レポートを出走表データに変換しました。参考ラインは未確認です。';
  }catch(err){e.preventDefault();e.stopImmediatePropagation();
   const p=document.getElementById('keirinError');if(p)p.textContent='簡易レポートの読込エラー：'+String(err.message||err);
  }
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
globalThis.RaceLabIphoneReportAdapter=Object.freeze({convertReport});
})();
