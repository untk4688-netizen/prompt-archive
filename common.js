const ROOT='';
const CAT_EN={'모델링':'Modeling','이미지':'Image','다이어그램':'Diagram','재질':'Material'};
async function loadWorks(){const r=await fetch(ROOT+'works.json?t='+Date.now(),{cache:'no-store'});const d=await r.json();return(d&&d.works)||[];}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function src(p){p=String(p||'');return /^(https?:)?\/\//.test(p)||p.startsWith('/')?p:ROOT+p;}
function fname(p){try{return decodeURIComponent(String(p).split('/').pop().split('?')[0])||'image.png';}catch(e){return'image.png';}}
function thumbOf(w){if(w.thumbnail)return w.thumbnail;const f=(w.final&&w.final.result_images||[]).filter(Boolean);if(f.length)return f[0];const s=(w.steps||[]).map(x=>(x&&x.result_images||[]).filter(Boolean)).filter(a=>a.length);return s.length?s[s.length-1][0]:'';}
function splitTitle(t,id){t=String(t||'');const i=t.indexOf(' · ');if(i>-1){const a=t.slice(0,i),b=t.slice(i+3);return[a,b];}return[id||'',t];}
function pad(n){return String(n).padStart(2,'0');}
const ARROW='<svg class="arrow" viewBox="0 0 140 120" fill="none" stroke="currentColor" stroke-width="5"><path d="M0 60H134"/><path d="M78 4C88 34 106 52 134 60C106 68 88 86 78 116"/></svg>';
async function copyText(t,btn){try{await navigator.clipboard.writeText(t);}catch(e){const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}if(btn){const o=btn.textContent;btn.textContent='복사됨';setTimeout(()=>btn.textContent=o,1400);}}
function fdate(d){d=String(d||'');return /^\d{4}-\d{2}-\d{2}T/.test(d)?d.slice(0,10):d;}
// 프롬프트 박스: 위·아래 끝에 닿으면 같은 손가락 움직임이 페이지 스크롤로 이어지도록
function chainScroll(el){let y=0;
 el.addEventListener('touchstart',e=>{y=e.touches[0].clientY;},{passive:true});
 el.addEventListener('touchmove',e=>{const ny=e.touches[0].clientY,dy=y-ny;y=ny;
  const atTop=el.scrollTop<=0,atBottom=el.scrollTop+el.clientHeight>=el.scrollHeight-1;
  if((dy<0&&atTop)||(dy>0&&atBottom)||el.scrollHeight<=el.clientHeight){e.preventDefault();window.scrollBy({top:dy,behavior:'instant'});}
 },{passive:false});
 el.addEventListener('wheel',e=>{const atTop=el.scrollTop<=0,atBottom=el.scrollTop+el.clientHeight>=el.scrollHeight-1;
  if((e.deltaY<0&&atTop)||(e.deltaY>0&&atBottom)){e.preventDefault();window.scrollBy({top:e.deltaY,behavior:'instant'});}},{passive:false});}
