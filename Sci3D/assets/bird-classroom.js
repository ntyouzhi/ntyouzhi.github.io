(() => {
 if(new URLSearchParams(location.search).get('local')==='1'){const heartbeat=()=>fetch('/__heartbeat',{cache:'no-store'}).catch(()=>{});heartbeat();setInterval(heartbeat,20000);}
 const life=document.getElementById('life-classroom'),workspace=life.querySelector('.workspace');
 const stage=document.createElement('section');stage.className='birds-classroom-stage';stage.hidden=true;stage.setAttribute('aria-label','鸟类观察');workspace.appendChild(stage);
 let selected=false,frame;
 function sync(){
  const active=selected&&document.body.dataset.domain==='life';
  if(active&&!frame){frame=document.createElement('iframe');frame.title='鸟类观察：丹顶鹤、绿头鸭、老鹰';const local=new URLSearchParams(location.search).get('local')==='1';frame.src=local?'bird-observation/?embedded=1&local=1':'https://ntyouzhi.github.io/youzhi-bird/index.html?embedded=1';frame.allow='fullscreen';stage.replaceChildren(frame);}
  if(!active&&frame){frame.remove();frame=null;}
 }
 function select(value){
  selected=value;document.body.classList.toggle('observing-birds',value);stage.hidden=!value;document.getElementById('birds-entry').classList.toggle('active',value);
  if(value){window.ScienceFishObservation?.select('birds');window.ScienceRespiratoryObservation?.select('birds');window.ScienceDigestiveObservation?.select('birds');if(window.__VISCERA_VIEWER__)window.__VISCERA_VIEWER__.isVisible=false;document.getElementById('loader').hidden=true;document.getElementById('library').classList.remove('open');}
  sync();
 }
 document.getElementById('birds-entry').addEventListener('click',()=>select(true));
 document.addEventListener('click',event=>{if(selected&&event.target.closest('[data-organ],#brand'))select(false);},true);
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-domain']});
 window.ScienceBirdObservation={select};
 window.addEventListener('DOMContentLoaded',()=>{if(new URLSearchParams(location.search).get('observe')==='birds')queueMicrotask(()=>select(true));});
})();
