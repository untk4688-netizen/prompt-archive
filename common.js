const ROOT='';
// 빌드 번호: GitHub Actions 빌드가 HTML에 기록. 있으면 분할 데이터·webp 사용, 없으면 works.json·원본 이미지
const BUILD=(document.querySelector('meta[name="build"]')||{}).content||'';
const CAT_EN={'모델링':'Modeling','이미지':'Image','다이어그램':'Diagram','재질':'Material'};
function catLabel(s){s=String(s||'');return CAT_EN[s]?CAT_EN[s]+'.':s;}
async function loadWorks(){const r=await fetch(ROOT+'works.json?t='+Date.now(),{cache:'no-store'});const d=await r.json();return(d&&d.works)||[];}
async function getJSON(u){const r=await fetch(u);if(!r.ok)throw new Error(r.status);return r.json();}
const SAFE_ID=/^[A-Za-z0-9_-]+$/;
// 메인용 요약 목록: data/index.json → 실패하면 works.json에서 같은 모양으로 만든다
async function loadIndex(){if(BUILD){try{const d=await getJSON(ROOT+'data/index.json?v='+BUILD);if(d&&d.works)return d.works;}catch(e){}}
 const ws=await loadWorks();return ws.map((w,i)=>({id:w.id,key:w.id||String(i),title:w.title,category:w.category,date:w.date,steps:(w.steps||[]).length,thumb:thumbOf(w),tw:0,th:0}));}
// 글 하나: data/works/<id>.json → 실패하면 works.json
async function loadWork(id){if(BUILD&&SAFE_ID.test(id||'')){try{const d=await getJSON(ROOT+'data/works/'+id+'.json?v='+BUILD);if(d&&d.work)return{work:d.work,dims:d.dims||{}};}catch(e){}}
 const ws=await loadWorks();return{work:ws.find((x,i)=>(x.id||String(i))===id),dims:{}};}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function isExt(p){return /^(https?:)?\/\//.test(p)||p.startsWith('/');}
function src(p){p=String(p||'');return isExt(p)?p:ROOT+p;}
// 표시용 이미지: 빌드된 사이트면 webp(가로 w), 없거나 실패하면 원본. d=[가로,세로]면 자리 미리 확보
function img(p,w,d){p=String(p||'');const o=src(p),wh=d&&d[0]?' width="'+d[0]+'" height="'+d[1]+'"':'';
 if(!BUILD||isExt(p))return '<img loading="lazy" src="'+esc(o)+'"'+wh+' alt="">';
 return '<img loading="lazy" src="'+esc(ROOT+'_img/'+p+'.w'+w+'.webp')+'" data-o="'+esc(o)+'" onerror="this.onerror=null;this.src=this.dataset.o"'+wh+' alt="">';}
function fname(p){try{return decodeURIComponent(String(p).split('/').pop().split('?')[0])||'image.png';}catch(e){return'image.png';}}
function thumbOf(w){if(w.thumbnail)return w.thumbnail;const f=(w.final&&w.final.result_images||[]).filter(Boolean);if(f.length)return f[0];const s=(w.steps||[]).map(x=>(x&&x.result_images||[]).filter(Boolean)).filter(a=>a.length);return s.length?s[s.length-1][0]:'';}
function splitTitle(t,id){t=String(t||'');const i=t.indexOf(' · ');if(i>-1){const a=t.slice(0,i),b=t.slice(i+3);return[a,b];}return[id||'',t];}
function pad(n){return String(n).padStart(2,'0');}
const ARROW='<svg class="arrow" viewBox="0 0 140 120" fill="none" stroke="currentColor" stroke-width="5"><path d="M0 60H134"/><path d="M78 4C88 34 106 52 134 60C106 68 88 86 78 116"/></svg>';
async function copyText(t,btn){try{await navigator.clipboard.writeText(t);}catch(e){const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}if(btn){const o=btn.textContent;btn.textContent='복사됨';setTimeout(()=>btn.textContent=o,1400);}}
function fdate(d){d=String(d||'');return /^\d{4}-\d{2}-\d{2}T/.test(d)?d.slice(0,10):d;}
// 프롬프트 박스: 위·아래 끝에 닿으면 같은 손가락 움직임이 페이지 스크롤로 이어지도록 (펼친 상태에서는 쓰지 않음)
function chainScroll(el){let y=0;
 el.addEventListener('touchstart',e=>{y=e.touches[0].clientY;},{passive:true});
 el.addEventListener('touchmove',e=>{const ny=e.touches[0].clientY,dy=y-ny;y=ny;if(el.classList.contains('open'))return;
  const atTop=el.scrollTop<=0,atBottom=el.scrollTop+el.clientHeight>=el.scrollHeight-1;
  if((dy<0&&atTop)||(dy>0&&atBottom)||el.scrollHeight<=el.clientHeight){e.preventDefault();window.scrollBy({top:dy,behavior:'instant'});}
 },{passive:false});
 el.addEventListener('wheel',e=>{if(el.classList.contains('open'))return;const atTop=el.scrollTop<=0,atBottom=el.scrollTop+el.clientHeight>=el.scrollHeight-1;
  if((e.deltaY<0&&atTop)||(e.deltaY>0&&atBottom)){e.preventDefault();window.scrollBy({top:e.deltaY,behavior:'instant'});}},{passive:false});}
// 모바일(720px 이하): 프롬프트 박스 접기/펼치기. 내용이 넘칠 때만 버튼을 보인다
const MOBILE=matchMedia('(max-width:720px)');
function promptToggle(pre,btn){
 btn._upd=()=>{if(!pre.classList.contains('open'))btn.hidden=!(MOBILE.matches&&pre.scrollHeight>pre.clientHeight+1);};
 btn.onclick=()=>{const o=pre.classList.toggle('open');btn.textContent=o?'접기':'전체 보기';
  if(!o){const r=pre.getBoundingClientRect();if(r.top<0)window.scrollBy({top:r.top-16,behavior:'instant'});btn._upd();}};
 btn._upd();}
addEventListener('resize',()=>document.querySelectorAll('button.more').forEach(b=>b._upd&&b._upd()));
