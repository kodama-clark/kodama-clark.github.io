/* App shell only. Never cache private GitHub API data. */
const CACHE='mycareer-shell-v4';
const SHELL=['./','./index.html','./app.css','./app.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('mycareer-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);
 if(event.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith('/my-career/'))return;
 event.respondWith(fetch(event.request).then(resp=>{
  if(resp.ok&&SHELL.some(s=>new URL(s,self.registration.scope).pathname===u.pathname)){
   const copy=resp.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));
  }
  return resp;
 }).catch(()=>caches.match(event.request)));
});