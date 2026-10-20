/* My Career V2 - public app code, private GitHub data. No token or job data is embedded. */
(()=>{'use strict';
const REPO='kodama-clark/my-career-ranking';
const API='https://api.github.com/repos/'+REPO+'/contents/jobs.json?ref=main';
const TOKEN_KEY='mycareer-v2-session-token';
const STARS_KEY='mycareer-v2-stars';
const $=id=>document.getElementById(id);
let token='',jobs=[],loadedAt=null,busy=false;
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
 const res=await fetch(API,{method:'GET',headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+secret,'X-GitHub-Api-Version':'2022-11-28'},cache:'no-store',credentials:'omit',redirect:'error'});
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
 return cleanJobs(JSON.parse(new TextDecoder('utf-8').decode(buf)));
}
async function connect(secret){
 if(busy)return;
 if(!secret||!/^([A-Za-z0-9_\-]+)$/.test(secret)){message('GitHubの読み取り専用トークンを入力してください。');return;}
 setBusy(true);message('');
 try{
  const list=await getPrivateData(secret);
  token=secret;jobs=list;loadedAt=new Date();
  if($('rememberSession').checked)saveSession(secret);else saveSession('');
  $('tokenInput').value='';$('authPanel').hidden=true;$('dashboard').hidden=false;
  $('lastLoaded').textContent='🔒 GitHubから取得：'+localDate(loadedAt);
  render();
 }catch(e){message(e&&e.message?e.message:'接続できませんでした。');}
 finally{setBusy(false);}
}
function disconnect(){token='';jobs=[];loadedAt=null;saveSession('');$('dashboard').hidden=true;$('authPanel').hidden=false;$('tokenInput').value='';message('接続を解除しました。');}
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
  const rank=jobs.indexOf(x);
  // Rendered filters use copied records; match by stable id instead of object identity.
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
  const detail=el('div','job-detail');addDetail(detail,'年収',x.salary||'未確認');if(x.location)addDetail(detail,'勤務地',x.location);card.appendChild(detail);
  const actions=el('div','job-actions'),url=safeUrl(x.url);
  if(url){const link=el('a',null,'求人を見る ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';actions.appendChild(link);}
  else actions.appendChild(el('span','no-url','求人リンク未確認'));
  const star=el('button','star'+(stars.has(x.id)?' saved':''),stars.has(x.id)?'★':'☆');
  star.type='button';star.setAttribute('aria-label',stars.has(x.id)?'お気に入りを解除':'お気に入りに追加');star.setAttribute('aria-pressed',stars.has(x.id)?'true':'false');
  star.addEventListener('click',()=>{if(stars.has(x.id))stars.delete(x.id);else stars.add(x.id);storeStars();render();});
  actions.appendChild(star);card.appendChild(actions);frag.appendChild(card);
 }
 $('jobList').replaceChildren(frag);
}
$('connectBtn').addEventListener('click',()=>connect($('tokenInput').value.trim()));
$('tokenInput').addEventListener('keydown',e=>{if(e.key==='Enter')connect($('tokenInput').value.trim());});
$('refreshBtn').addEventListener('click',()=>{if(token)connect(token);else disconnect();});
$('disconnectBtn').addEventListener('click',disconnect);
for(const id of ['searchInput','viewFilter','minFilter'])$(id).addEventListener(id==='searchInput'?'input':'change',render);
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
const saved=sessionToken();if(saved){$('rememberSession').checked=true;connect(saved);}
})();