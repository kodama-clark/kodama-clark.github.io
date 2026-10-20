const CACHE_NAME='hex-island-v814-20261020';
const FILES=['./','./index.html','./manifest.webmanifest','./favicon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys()){if(k.startsWith('hex-island-')&&k!==CACHE_NAME)await caches.delete(k)} await self.clients.claim()})())});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return; if(r.mode==='navigate'){e.respondWith(fetch(r).then(async res=>{if(res.ok)(await caches.open(CACHE_NAME)).put('./index.html',res.clone());return res}).catch(()=>caches.match('./index.html')))}else{e.respondWith(caches.match(r).then(x=>x||fetch(r)))}});
