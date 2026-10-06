(() => {
 if(new URLSearchParams(location.search).get('local')==='1'){const heartbeat=()=>fetch('/__heartbeat',{cache:'no-store'}).catch(()=>{});heartbeat();setInterval(heartbeat,20000);}
 const life=document.getElementById('life-classroom'),workspace=life.querySelector('.workspace'),organList=document.getElementById('organ-list'),commonList=document.getElementById('common-list');
 const stage=document.createElement('section');stage.className='birds-classroom-stage';stage.hidden=true;stage.setAttribute('aria-label','鸟类观察');workspace.appendChild(stage);
 const loading=document.createElement('div');loading.className='birds-stage-loading';loading.innerHTML='<span></span><b>正在连接鸟类观察…</b><small>首次打开需要读取模型资源，请稍候</small><a href="https://code.ntcyz.cn/youzhi-bird/index.html" target="_blank" rel="noopener">在新窗口打开</a>';
 let selected=false,frame;
 let movingFish=false;
 function arrangeLibrary(){
  if(movingFish)return;
  const fish=organList.querySelector('[data-organ="crucian"]');
  if(fish){movingFish=true;commonList.replaceChildren(fish);setTimeout(()=>movingFish=false,0);}
  else commonList.replaceChildren();
 }
 function sync(){
  const active=selected&&document.body.dataset.domain==='life';
  if(active&&!frame){loading.hidden=false;loading.querySelector('b').textContent='正在连接鸟类观察…';frame=document.createElement('iframe');frame.title='鸟类观察：丹顶鹤、绿头鸭、老鹰';const local=new URLSearchParams(location.search).get('local')==='1';frame.src=local?'bird-observation/?embedded=1&local=1':'https://code.ntcyz.cn/youzhi-bird/index.html?embedded=1';frame.allow='fullscreen';frame.addEventListener('load',()=>{loading.querySelector('b').textContent='鸟类页面已打开，模型资源正在加载…'});stage.replaceChildren(frame,loading);}
  if(!active&&frame){frame.remove();frame=null;}
 }
 function select(value){
  selected=value;document.body.classList.toggle('observing-birds',value);stage.hidden=!value;document.getElementById('birds-entry').classList.toggle('active',value);
  if(value){document.querySelectorAll('[data-organ].active').forEach(item=>item.classList.remove('active'));window.ScienceFishObservation?.select('birds');window.ScienceRespiratoryObservation?.select('birds');window.ScienceDigestiveObservation?.select('birds');if(window.__VISCERA_VIEWER__)window.__VISCERA_VIEWER__.isVisible=false;document.getElementById('loader').hidden=true;document.getElementById('library').classList.remove('open');}
  sync();
 }
 new MutationObserver(arrangeLibrary).observe(organList,{childList:true});arrangeLibrary();
 window.addEventListener('message',event=>{if(event.source===frame?.contentWindow&&event.data?.type==='bird-observation-ready')loading.hidden=true;});
 document.getElementById('birds-entry').addEventListener('click',()=>select(true));
 document.addEventListener('click',event=>{if(selected&&event.target.closest('[data-organ],#brand'))select(false);},true);
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-domain']});
 window.ScienceBirdObservation={select};
 window.addEventListener('DOMContentLoaded',()=>{if(new URLSearchParams(location.search).get('observe')==='birds')queueMicrotask(()=>select(true));});
})();
