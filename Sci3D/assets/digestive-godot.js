/* Complete airway observation, integrated with the existing organ library. */
(() => {
  const viewer = document.querySelector('.viewer');
  const mount = document.querySelector('#three-mount');
  const panel = document.querySelector('#info-panel');
  const resetButton = document.querySelector('.tool[data-action="reset"]');
  const stage = document.createElement('div');
  stage.className = 'digestive-stage';
  stage.hidden = true;
  stage.setAttribute('aria-label', '人的消化器官：结构、食物旅行与营养吸收');
  viewer.appendChild(stage);
  const loading = document.createElement('div');
  loading.className = 'digestive-loading';
  loading.innerHTML = '<span></span><p>正在准备消化器官观察…</p>';
  stage.appendChild(loading);
  const controls = document.createElement('div');
  controls.className = 'digestive-controls';
  controls.setAttribute('aria-label', '消化观察工具');
  controls.innerHTML = '<button data-digest="pause" aria-pressed="false" disabled>暂停</button><button data-digest="slow" aria-pressed="false" disabled>慢放</button><button data-digest="food" aria-pressed="false" disabled>食物旅行</button><button data-digest="labels" aria-pressed="true" disabled>结构标注</button><button data-digest="reveal" aria-pressed="false" disabled>内部透视</button><button data-digest="pan" aria-pressed="false" disabled>移动</button><button data-digest="focus" aria-pressed="false" disabled>近看腹部</button><button data-digest="reset" disabled>复位</button>';
  viewer.appendChild(controls);
  const exit = document.createElement('button');
  exit.className = 'digestive-exit';
  exit.textContent = '⛶ 退出全屏';
  exit.addEventListener('click', () => document.exitFullscreen?.());
  viewer.appendChild(exit);
  let frame, ready = false, selected = false, currentPick = '';
  const descriptions = {
    mouth: ['口腔','食物从这里进入人体。牙齿把食物嚼碎，舌帮助搅拌，食物与唾液混合。'],
    pharynx: ['咽','连接口腔和食管。吞咽时，食物经咽进入食管。'],
    esophagus: ['食管','连接咽和胃，通过管壁的蠕动，将食物推送到胃。'],
    stomach: ['胃','像一个可以伸缩的袋子，位于腹腔上部。暂时储存食物，搅拌食物，并进行初步消化。'],
    small_intestine: ['小肠','细而弯，位于腹腔靠近中心的位置。食物继续消化，营养物质主要在这里被吸收。'],
    large_intestine: ['大肠','较粗，位于腹腔四周，与小肠相连。吸收部分水分，食物残渣逐渐形成粪便。'],
    anus: ['肛门','消化道的出口，将粪便排出体外。'],
    liver: ['肝','分泌胆汁，帮助脂肪的消化。食物不会直接进入肝。'],
    gallbladder: ['胆囊','储存并浓缩肝分泌的胆汁，再将胆汁送入小肠。食物不会进入胆囊。'],
    pancreas: ['胰','分泌胰液，送入小肠，帮助食物消化。食物不会直接进入胰。']
  };
  function command(name, value) { if (ready) frame.contentWindow.digestiveCommand?.(name, value); }
  function sendActive() {
    if (ready) frame.contentWindow.digestiveSetActive?.(selected && document.body.dataset.domain === 'life' && !document.hidden);
  }
  function pick(id) {
    currentPick = id;
    const target = panel.querySelector('.digestive-detail');
    if (target) {
      const entry = descriptions[id] || ['食物到哪里去了？', '先观察器官的形状和位置，再打开“食物旅行”，按顺序追踪食物经过的器官。'];
      target.querySelector('b').textContent = entry[0];
      target.querySelector('p').textContent = entry[1];
    }
    panel.querySelectorAll('[data-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pick === id)));
  }
  function buildPanel() {
    const steps=['mouth','pharynx','esophagus','stomach','small_intestine','large_intestine','anus'];
    panel.innerHTML = `
      <div class="kicker">生命世界 · 人体的奥秘</div>
      <div class="title-row"><div><h1>人的消化器官</h1><em>DIGESTIVE SYSTEM</em></div></div>
      <p class="description">食物在人体内怎样“旅行”？从口腔出发，观察摄取、消化、吸收和排出的过程。</p>
      <h2>食物的旅行路线</h2>
      <div class="digestive-path">${steps.map((id,i)=>`${i?'<i>→</i>':''}<button data-step="${id}">${descriptions[id][0]}</button>`).join('')}</div>
      <p class="digestive-hint">点击路线中的器官，可从这一站开始观察。</p>
      <div class="digestive-picks">${Object.entries(descriptions).map(([id,entry])=>`<button data-pick="${id}" aria-pressed="false">${entry[0]}</button>`).join('')}</div>
      <div class="note digestive-detail" aria-live="polite"><b></b><p></p></div>
      <h2>哪些器官帮助消化？</h2>
      <dl class="digestive-notes"><div><dt>肝 → 胆囊 → 小肠</dt><dd>肝分泌胆汁，胆囊储存并浓缩胆汁。</dd></div><div><dt>胰 → 小肠</dt><dd>胰分泌胰液，帮助食物消化。</dd></div></dl>
      <div class="note digestive-question"><b>带着问题观察</b><p>小肠和大肠的粗细、位置有什么不同？食物会不会经过肝和胰？</p></div>
      <h2>保护消化器官</h2>
      <div class="digestive-habits"><span>早晚刷牙，饭后漱口</span><span>细嚼慢咽</span><span>不暴饮暴食</span><span>吃洁净的食物</span></div>
      <p class="digestive-model-note">沿用原有肠道、肝和胰的模型与贴图，补充口腔、咽、食管、胃、胆囊和肛门。食物路线、青绿色营养粒子为教学示意；肠道中的路线经过简化，演示速度不代表真实消化时间。</p>`;
    pick(currentPick);
  }
  function activate() {
    if (frame) return;
    if (location.protocol === 'file:') {
      loading.innerHTML = '<p>请通过课堂启动器打开动态观察。<br>双击“运行网页版.cmd”，再打开 <a href="http://127.0.0.1:8765/?observe=digestive">消化器官课堂</a>。</p>';
      return;
    }
    frame = document.createElement('iframe');
    frame.title = '人的消化器官3D动态观察';
    frame.src = 'assets/godot-digestive/index.html?embedded=1';
    frame.allow = 'fullscreen';
    stage.prepend(frame);
  }
  function select(id) {
    selected = id === 'intestine';
    viewer.classList.toggle('is-digestive', selected);
    stage.hidden = !selected;
    controls.hidden = !selected;
    if (selected) {
      mount.hidden = true;
      if (window.__VISCERA_VIEWER__) window.__VISCERA_VIEWER__.isVisible = false;
      document.querySelector('#viewer-title').textContent = '人的消化器官 · 动态观察';
      document.querySelector('.caption > span').textContent = '生命的运动';
      document.querySelector('.tip span').textContent = '拖动转动　移动模式可平移　滚轮缩放';
      document.querySelector('#hotspot-callout').hidden = true;
      buildPanel();
      activate();
    }
    sendActive();
  }
  controls.addEventListener('click', event => {
    const button = event.target.closest('[data-digest]');
    if (!button || !ready) return;
    const name = button.dataset.digest;
    if (name === 'reset') {
      command('reset', true);
      stage.classList.remove('pan-active');
      controls.querySelectorAll('[aria-pressed]').forEach(item => item.setAttribute('aria-pressed', String(['labels'].includes(item.dataset.digest))));
      controls.querySelector('[data-digest="pause"]').textContent = '暂停';
      pick('');
    } else {
      const value = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(value));
      if (name === 'pause') button.textContent = value ? '继续' : '暂停';
      if (name === 'pan') stage.classList.toggle('pan-active', value);
      command(name, value);
      if (name === 'food') controls.querySelector('[data-digest="reveal"]').setAttribute('aria-pressed',String(value));
    }
  });
  panel.addEventListener('click', event => {
    const step = event.target.closest('[data-step]');
    if (selected && step) { command('step',step.dataset.step); pick(step.dataset.step); controls.querySelector('[data-digest="food"]').setAttribute('aria-pressed','true'); controls.querySelector('[data-digest="reveal"]').setAttribute('aria-pressed','true'); }
    const button = event.target.closest('[data-pick]');
    if (selected && button) { command('pick', button.dataset.pick); pick(button.dataset.pick); }
  });
  window.addEventListener('message', event => {
    if (event.source !== frame?.contentWindow || event.origin !== location.origin) return;
    if (event.data?.type === 'science-digestive-ready') {
      ready = true;
      loading.hidden = true;
      controls.querySelectorAll('button').forEach(button => button.disabled = false);
      sendActive();
    } else if (event.data?.type === 'science-digestive-pick' && selected) pick(event.data.id);
  });
  document.addEventListener('click', event => {
    if (selected && document.body.dataset.domain === 'life' && event.target.closest('[data-action="fullscreen"]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const change = document.fullscreenElement ? document.exitFullscreen?.() : viewer.requestFullscreen?.();
      change?.catch(error => console.warn('全屏未能打开:', error.name));
    }
  }, true);
  document.addEventListener('visibilitychange', sendActive);
  new MutationObserver(sendActive).observe(document.body, {attributes:true, attributeFilter:['data-domain']});
  window.ScienceDigestiveObservation = {select, get ready() {return ready;}};
  window.addEventListener('DOMContentLoaded', () => {
    if (['digestive', 'intestine'].includes(new URLSearchParams(location.search).get('observe'))) {
      queueMicrotask(() => document.querySelector('[data-organ="intestine"]')?.click());
    }
  });
})();
