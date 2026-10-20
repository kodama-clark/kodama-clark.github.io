/* My Career V2 - public app code, private GitHub data. No token or job data is embedded. */
(()=>{'use strict';
const REPO='kodama-clark/my-career-ranking';
const API='https://api.github.com/repos/'+REPO+'/contents/jobs.json?ref=main';
const WRITE_API='https://api.github.com/repos/'+REPO+'/contents/jobs.json';
const TOKEN_KEY='mycareer-v2-session-token';
const STARS_KEY='mycareer-v2-stars';
const $=id=>document.getElementById(id);
let token='',jobs=[],loadedAt=null,busy=false,rawData=null,blobSha='',editingId=null,saving=false;
let stars=new Set();
try{const saved=JSON.parse(localStorage.getItem(STARS_KEY)||'[]');if(Array.isArray(saved))stars=new Set(saved.filter(x=>typeof x==='string'));}catch(_){}
function storeStars(){try{localStorage.setItem(STARS_KEY,JSON.stringify([...stars]));}catch(_){}}
function sessionToken(){try{return sessionStorage.getItem(TOKEN_KEY)||'';}catch(_){return '';}}
function saveSession(value){try{if(value)sessionStorage.setItem(TOKEN_KEY,value);else sessionStorage.removeItem(TOKEN_KEY);}catch(_){}}
function message(s){$('authMessage').textContent=s;}
function setBusy(value){busy=value;$('connectBtn').disabled=value;$('refreshBtn').disabled=value;$('connectBtn').firstChild.textContent=value?'読み込み中… ':'非公開求人を読み込む ';}
function localDate(d){return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d);}
function dateFromJob(job){const date=job.updated_at||job.score_date||job.created_at||'';if(typeof date!=='string'||!date)return null;const d=new Date(/^\d{4}-\d{2}-\d{2}$/.test(date)?date+'T00:00:00+09:00':date);return Number.isNaN(d.getTime())?null:d;}
function isRecent(job){const d=dateFromJob(job);if(!d)return false;const now=Date.now(),diff=now-d.getTime();return diff>=-86400000&&diff<7*86400000;}
function sortJobs(arr){return arr.map((x,i)=>({...x,__position:i})).sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)||a.__position-b.__position);}
function cleanJobs(data){if(!data||!Array.isArray(data.jobs))throw Error('jobs.json の形式が違います。');return sortJobs(data.jobs.filter(x=>x&&typeof x.company==='string').map((x,i)=>({...x,id:String(x.id||'job-'+i),score:Number.isFinite(Number(x.score))?Number(x.score):null,company:String(x.company||''),role:String(x.role||''),salary:String(x.salary||''),location:String(x.location||''),listing:String(x.listing||'未確認'),url:String(x.url||'')})));}
async function getPrivateData(secret){
 const res=await fetch(API,{method:'GET',headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+secret},cache:'no-store',credentials:'omit',redirect:'error'});
 if(!res.ok){
  if(res.status===401)throw Error('トークンが無効または期限切れです。再発行してください。');
  if(res.status===403)throw Error('アクセス権限またはAPIの利用制限を確認してください。Contents: Read-onlyが必要です。');
  if(res.status===404)throw Error('リポジトリが見つかりません。my-career-rankingだけを許可したか確認してください。');
  throw Error('GitHubとの通信に失敗しました（'+res.status+'）。');
 }
 const json=await res.json();
 if(typeof json.content!=='string'||json.encoding!=='base64')throw Error('GitHubから求人データを読み取れませんでした。');
 const binary=atob(json.content.replace(/\s/g,'')),buf=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)buf[i]=binary.charCodeAt(i);
 const data=JSON.parse(new TextDecoder('utf-8').decode(buf));
 if(!json.sha)throw Error('GitHubの更新識別子を取得できませんでした。');
 return {data,sha:json.sha,jobs:cleanJobs(data)};
}
async function connect(secret){
 if(busy)return;
 if(!secret||!/^([A-Za-z0-9_\-]+)$/.test(secret)){message('GitHubの読み取り専用トークンを入力してください。');return;}
 setBusy(true);message('');
 try{
  const payload=await getPrivateData(secret);
  token=secret;jobs=payload.jobs;rawData=payload.data;blobSha=payload.sha;loadedAt=new Date();
  if($('rememberSession').checked)saveSession(secret);else saveSession('');
  $('tokenInput').value='';$('authPanel').hidden=true;$('dashboard').hidden=false;
  $('lastLoaded').textContent='🔒 GitHubから取得：'+localDate(loadedAt);
  render();
 }catch(e){message(e&&e.message?e.message:'接続できませんでした。');}
 finally{setBusy(false);}
}
function disconnect(){token='';jobs=[];rawData=null;blobSha='';loadedAt=null;saveSession('');$('dashboard').hidden=true;$('authPanel').hidden=false;$('tokenInput').value='';message('接続を解除しました。');}
function safeUrl(x){if(!x)return null;try{const u=new URL(x);return u.protocol==='https:'?u.href:null;}catch(_){return null;}}
function el(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined&&text!==null)n.textContent=String(text);return n;}
function tag(parent,text,cls=''){parent.appendChild(el('span','tag '+cls,text));}
function addDetail(parent,label,value){if(!value)return;const span=el('span');span.append(el('b',null,label+' '),document.createTextNode(value));parent.appendChild(span);}
function render(){
 $('countAll').textContent=jobs.length+'件';
 $('bestScore').textContent=jobs.length?Math.max(...jobs.map(x=>x.score||0))+'点':'—';
 $('recentCount').textContent=jobs.filter(isRecent).length+'件';
 const view=$('viewFilter').value,min=Number($('minFilter').value),q=$('searchInput').value.trim().toLocaleLowerCase();
 let filtered=(view==='top50'?jobs.slice(0,50):jobs).filter(x=>(x.score||0)>=min);
 if(view==='recent')filtered=filtered.filter(isRecent);
 if(view==='starred')filtered=filtered.filter(x=>stars.has(x.id));
 if(q)filtered=filtered.filter(x=>(x.company+' '+x.role+' '+x.location).toLocaleLowerCase().includes(q));
 $('visibleCount').textContent=filtered.length+'件';
 $('emptyMessage').hidden=filtered.length>0;
 const frag=document.createDocumentFragment();
 for(const x of filtered){
  const actualRank=jobs.findIndex(j=>j.id===x.id)+1;
  const card=el('article','job'+(actualRank<=3?' top':''));
  const head=el('div','job-head');head.appendChild(el('div','rank',actualRank||'—'));
  const title=el('div','job-title');title.appendChild(el('strong',null,x.company));title.appendChild(el('small',null,x.role||'職種未登録'));head.appendChild(title);
  const score=el('div','score');score.textContent=(x.score===null?'—':x.score)+' ';score.appendChild(el('small',null,'/ 100'));head.appendChild(score);card.appendChild(head);
  const tags=el('div','tags');
  if(isRecent(x))tag(tags,'最近の更新','new');
  if(x.origin==='2026-10-20_daily_report')tag(tags,'10/20追加');
  tag(tags,x.listing||'未確認',x.listing==='募集中'?'new':'warn');
  if(Array.isArray(x.possible_duplicate_with)&&x.possible_duplicate_with.length)tag(tags,'重複要照合','warn');
  card.appendChild(tags);
  const detail=el('div','job-detail');addDetail(detail,'年収',x.salary||'未確認');if(x.location)addDetail(detail,'勤務地',x.location);if(x.application_status&&x.application_status!=='未応募')addDetail(detail,'応募',x.application_status);card.appendChild(detail);
  if(x.notes)card.appendChild(el('p','job-notes',String(x.notes).slice(0,160)));
  const actions=el('div','job-actions'),url=safeUrl(x.url);
  if(url){const link=el('a',null,'求人を見る ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';actions.appendChild(link);}
  else actions.appendChild(el('span','no-url','求人リンク未確認'));
  const star=el('button','star'+(stars.has(x.id)?' saved':''),stars.has(x.id)?'★':'☆');
  star.type='button';star.setAttribute('aria-label',stars.has(x.id)?'お気に入りを解除':'お気に入りに追加');star.setAttribute('aria-pressed',stars.has(x.id)?'true':'false');
  star.addEventListener('click',()=>{if(stars.has(x.id))stars.delete(x.id);else stars.add(x.id);storeStars();render();});
  actions.appendChild(star);
  const edit=el('button','edit-job-btn','✎ 編集');edit.type='button';edit.addEventListener('click',()=>openEditor(x));actions.appendChild(edit);
  card.appendChild(actions);frag.appendChild(card);
 }
 $('jobList').replaceChildren(frag);
}

function editValue(id,value){$(id).value=value===null||value===undefined?'':String(value);}
function openEditor(job){
 if(busy||saving)return;
 editingId=job?job.id:null;
 $('editHeading').textContent=job?'求人を編集':'求人を追加';
 editValue('editCompany',job?.company||'');
 editValue('editRole',job?.role||'');
 editValue('editScore',job?.score??'');
 editValue('editListing',job?.listing||'未確認');
 editValue('editApplication',job?.application_status||'未応募');
 editValue('editSalary',job?.salary||'');
 editValue('editLocation',job?.location||'');
 editValue('editUrl',job?.url||'');
 editValue('editNotes',job?.notes||'');
 $('editFeedback').textContent='';
 $('editDialog').showModal();
}
function closeEditor(){if(saving)return;$('editDialog').close();editingId=null;}
function b64Utf8(value){const bytes=new TextEncoder().encode(value);let out='';for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(out);}
function editMessage(value){$('editFeedback').textContent=value;}
async function saveEditor(event){
 event.preventDefault();
 if(saving||busy||!token||!rawData||!blobSha)return;
 const company=$('editCompany').value.trim(),role=$('editRole').value.trim(),scoreRaw=$('editScore').value.trim(),score=Number(scoreRaw);
 const url=$('editUrl').value.trim();
 if(!company){editMessage('会社名を入力してください。');return;}
 if(!scoreRaw||!Number.isInteger(score)||score<0||score>100){editMessage('適合度を0〜100の整数で入力してください。');return;}
 if(url&&!safeUrl(url)){editMessage('求人URLには https:// で始まる安全なURLを入力してください。');return;}
 const original=editingId?rawData.jobs.find(j=>String(j.id)===editingId):null;
 if(editingId&&!original){editMessage('元の求人データが見つかりません。再取得してください。');return;}
 const now=new Date().toISOString();
 const newJob=original?{...original}:{
   id:'manual-'+crypto.randomUUID(),origin:'manual_app',created_at:now,
   verification:'スマホアプリから登録。求人情報・募集状況はユーザーによる入力',possible_duplicate_with:[]
 };
 if(original&&Number(original.score)!==score){
   newJob.score_history=[...(Array.isArray(original.score_history)?original.score_history:[]),{
     old_score:Number(original.score),new_score:score,changed_at:now,reason:'スマホアプリでの手動編集'
   }];
   newJob.score_date=now.slice(0,10);
 }
 if(!original)newJob.score_date=now.slice(0,10);
 Object.assign(newJob,{
   company,role,score,salary:$('editSalary').value.trim(),location:$('editLocation').value.trim(),
   url,listing:$('editListing').value,application_status:$('editApplication').value,
   notes:$('editNotes').value.trim(),updated_at:now
 });
 const copy={...rawData,jobs:original?rawData.jobs.map(j=>String(j.id)===editingId?newJob:j):[...rawData.jobs,newJob]};
 copy.record_count=copy.jobs.length;
 saving=true;$('saveEditBtn').disabled=true;$('cancelEditBtn').disabled=true;$('closeEditBtn').disabled=true;
 editMessage('GitHubの最新データを確認しています…');
 try{
   const fresh=await getPrivateData(token);
   if(fresh.sha!==blobSha)throw Error('別の更新が先に保存されました。編集内容は残しているので、この画面を閉じず、いったん内容を控えてから一覧を再取得してください。');
   editMessage('非公開GitHubに保存しています…');
   const req={
     message:(original?'Update':'Add')+' private job via My Career V2: '+company,
     content:b64Utf8(JSON.stringify(copy,null,2)+'\n'),
     sha:blobSha,branch:'main'
   };
   const resp=await fetch(WRITE_API,{
     method:'PUT',headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,
       'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
     body:JSON.stringify(req),cache:'no-store',credentials:'omit',redirect:'error'
   });
   if(!resp.ok){
     if(resp.status===401)throw Error('トークンが無効か期限切れです。');
     if(resp.status===403)throw Error('保存にはContents: Read and write権限が必要です。my-career-ranking限定の書き込み用トークンで接続してください。');
     if(resp.status===409||resp.status===422)throw Error('GitHub上で競合が起きました。編集内容を控えた後、再取得してやり直してください。');
     throw Error('保存に失敗しました（HTTP '+resp.status+'）。');
   }
   const result=await resp.json();
   rawData=copy;blobSha=result.content?.sha||'';
   jobs=cleanJobs(copy);loadedAt=new Date();
   $('lastLoaded').textContent='🔒 GitHubに保存：'+localDate(loadedAt);
   $('editDialog').close();editingId=null;$('dashFeedback').textContent=company+' の変更を非公開GitHubに保存しました。';
   render();
 }catch(e){editMessage(e?.message||'保存できませんでした。');}
 finally{saving=false;$('saveEditBtn').disabled=false;$('cancelEditBtn').disabled=false;$('closeEditBtn').disabled=false;}
}

$('connectBtn').addEventListener('click',()=>connect($('tokenInput').value.trim()));
$('tokenInput').addEventListener('keydown',e=>{if(e.key==='Enter')connect($('tokenInput').value.trim());});
$('refreshBtn').addEventListener('click',()=>{if(token)connect(token);else disconnect();});
$('disconnectBtn').addEventListener('click',disconnect);
$('addJobBtn').addEventListener('click',()=>openEditor(null));
$('closeEditBtn').addEventListener('click',closeEditor);
$('cancelEditBtn').addEventListener('click',closeEditor);
$('editForm').addEventListener('submit',saveEditor);
$('editDialog').addEventListener('cancel',e=>{if(saving)e.preventDefault();});
for(const id of ['searchInput','viewFilter','minFilter'])$(id).addEventListener(id==='searchInput'?'input':'change',render);
// Refresh on return to the app so new morning GitHub data can appear without manual copy.
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible' && token && !busy && !saving && !$('editDialog').open &&
 loadedAt && Date.now()-loadedAt.getTime()>60000)connect(token);
});
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
const saved=sessionToken();if(saved){$('rememberSession').checked=true;connect(saved);}
})();