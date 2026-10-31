/* RaceLab PWA: cache app shell only. No user files or simulation results are cached. */
'use strict';
const CACHE = 'racelab-shell-gitpages-v2-v1124';
const APP_FILES = ["./index.html","./manifest.webmanifest","./icons/icon.svg","./icons/icon-180.png","./app/v1/part-000.txt","./app/v1/part-001.txt","./app/v1/part-002.txt","./app/v1/part-003.txt","./app/v1/part-004.txt","./app/v1/part-005.txt","./app/v1/part-006.txt","./app/v1/part-007.txt","./app/v1/part-008.txt","./app/v1/part-009.txt","./app/v1/part-010.txt","./app/v1/part-011.txt","./app/v1/part-012.txt","./app/v1/part-013.txt","./app/v1/part-014.txt","./app/v1/part-015.txt","./app/v1/part-016.txt","./app/v1/part-017.txt","./app/v1/part-018.txt","./app/v1/part-019.txt","./app/v1/part-020.txt","./app/v1/part-021.txt","./app/v1/part-022.txt","./app/v1/part-023.txt","./app/v1/part-024.txt","./app/v1/part-025.txt","./app/v1/part-026.txt","./app/v1/part-027.txt","./app/v1/part-028.txt","./app/v1/part-029.txt","./app/v1/part-030.txt","./app/v1/part-031.txt","./app/v1/part-032.txt","./app/v1/part-033.txt","./app/v1/part-034.txt","./app/v1/part-035.txt","./app/v1/part-036.txt","./app/v1/part-037.txt"];
const urls=new Set(APP_FILES.map(f=>new URL(f,self.registration.scope).pathname));
urls.add(new URL('./',self.registration.scope).pathname);
self.addEventListener('install',ev=>ev.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',ev=>ev.waitUntil(Promise.all([caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('racelab-shell-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',ev=>{
 const req=ev.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin||!urls.has(new URL(req.url).pathname))return;
 if(req.mode==='navigate'){
  ev.respondWith(fetch(req).then(res=>res.ok?res:(caches.match('./index.html').then(c=>c||res))).catch(()=>caches.match('./index.html')));
 }else ev.respondWith(caches.match(req,{ignoreSearch:true}).then(c=>c||fetch(req)));
});
