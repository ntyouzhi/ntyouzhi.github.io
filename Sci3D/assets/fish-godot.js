/* Godot observation within the existing science classroom. */
(() => {
  const viewer = document.querySelector('.viewer');
  const mount = document.querySelector('#three-mount');
  const panel = document.querySelector('#info-panel');
  const resetButton = document.querySelector('.tool[data-action="reset"]');
  const stage = document.createElement('div');
  stage.className = 'fish-classroom-stage';
  stage.hidden = true;
  stage.setAttribute('aria-label', '鲫鱼莲池观察：主鲫鱼、两条锦鲤、荷花与鱼鳍标注');
  viewer.appendChild(stage);
  const exitFullscreenButton = document.createElement('button');
  exitFullscreenButton.className = 'fish-exit-fullscreen';
  exitFullscreenButton.type = 'button';
  exitFullscreenButton.textContent = '⛶ 退出全屏';
  exitFullscreenButton.addEventListener('click', () => document.exitFullscreen?.());
  viewer.appendChild(exitFullscreenButton);
  let frame, ready = false, selected = false;
  const loading = document.createElement('div');
  loading.className = 'fish-stage-loading';
  loading.innerHTML = '<div class="fish-loading-mark">鱼</div><p>正在下载水下场景</p><div class="fish-loading-track"><i></i></div><small>0%</small>';
  stage.appendChild(loading);
  const controls = document.createElement('div');
  controls.className = 'fish-controls';
  controls.setAttribute('aria-label', '鲫鱼观察控制');
  controls.innerHTML = [['pause','暂停'],['fast','加速'],['slow','慢速'],['labels','结构标注'],['pan','移动'],['reset','复位']].map(([id,label]) => `<button type="button" data-fish="${id}" ${id !== 'reset' ? 'aria-pressed="false"' : ''} disabled>${label}</button>`).join('');
  stage.appendChild(controls);
  let state = {paused:false,speed:1,labels:true,pan:false};
  function syncControls() {
    state = frame?.contentWindow?.fishState?.() || state;
    for (const button of controls.querySelectorAll('button')) {
      const action = button.dataset.fish;
      button.disabled = !ready;
      if (action !== 'reset') button.setAttribute('aria-pressed', String(action === 'pause' ? state.paused : action === 'fast' ? state.speed === 2 : action === 'slow' ? state.speed === .35 : state[action === 'pan' ? 'pan' : 'labels']));
      if (action === 'pause') button.textContent = state.paused ? '继续' : '暂停';
    }
    if (frame) frame.style.cursor = state.pan ? 'grab' : 'default';
    document.querySelector('.is-godot-fish .tip span')?.replaceChildren(document.createTextNode(state.pan ? '拖动平移　滚轮缩放' : '拖动旋转　滚轮缩放'));
  }
  controls.addEventListener('click', event => {
    const action = event.target.closest('[data-fish]')?.dataset.fish;
    if (!action || !ready) return;
    syncControls();
    const command = frame.contentWindow.fishCommand;
    if (action === 'pause') command('pause', !state.paused);
    if (action === 'fast' || action === 'slow') {
      const speed = action === 'fast' ? 2 : .35;
      command('speed', state.speed === speed ? 1 : speed);
    }
    if (action === 'labels' || action === 'pan') command(action, !state[action]);
    if (action === 'reset') command('reset', true);
    syncControls();
  });

  function sendActive() {
    const active = selected && document.body.dataset.domain === 'life' && !document.hidden;
    if (ready) frame.contentWindow?.fishSetActive?.(active);
  }
  function buildPanel() {
    panel.innerHTML = `
      <div class="kicker">生命世界 · 常见生物</div>
      <div class="title-row"><div><h1>鲫鱼</h1><em>Carassius auratus</em></div><div class="stamp"><img src="assets/images/crucian/thumb.webp" alt="鲫鱼"></div></div>
      <p class="description">看身体和尾部怎样摆动，再留意各处鱼鳍与鳃盖的小动作。池中另有两条锦鲤与荷花，可转动视角比较观察。</p>
      <h2>从结构寻找证据</h2>
      <dl class="fish-structure-notes">
        <div><dt>躯干与尾鳍</dt><dd>左右摆动，与水相互作用，推动身体前进。</dd></div>
        <div><dt>胸鳍与腹鳍</dt><dd>配合其他鳍，帮助调整姿态、方向和运动。</dd></div>
        <div><dt>背鳍与臀鳍</dt><dd>帮助保持身体稳定，减少侧翻。</dd></div>
        <div><dt>鳃盖与鳃</dt><dd>外面看到的是鳃盖。水经过里面的鳃时，鱼获得水中的溶解氧。</dd></div>
      </dl>
      <div class="note fish-question"><b>带着问题观察</b><p>鱼尾和胸鳍的摆动一样吗？转动视角后，能找到身体另一侧的胸鳍、腹鳍和鳃盖吗？</p></div>
      <div class="note fish-evidence"><b>看见什么，再解释什么</b><p>鳃盖开合是可以观察到的动作；鳃的气体交换发生在鳃盖里面。</p></div>
      <p class="fish-model-note">运动为观察示意，摆动频率不作为真实鱼类的测量数据。</p>`;
  }
  function activate() {
    if (frame) return;
    if (location.protocol === 'file:') {
      loading.innerHTML = '<p>鱼的运动观察需要通过课堂启动器打开。<br>双击“运行网页版”，再访问 <a href="http://127.0.0.1:8765/?observe=crucian">本地科学 3D 课堂</a>。</p>';
      return;
    }
    frame = document.createElement('iframe');
    frame.title = '鲫鱼与莲池伙伴：运动、外部结构和水生环境观察';
    frame.src = 'assets/godot-fish/index.html?embedded=1';
    frame.allow = 'fullscreen';
    stage.prepend(frame);
  }
  function select(id) {
    selected = id === 'crucian';
    document.body.dataset.observedOrgan = id;
    viewer.classList.toggle('is-godot-fish', selected);
    mount.hidden = selected;
    stage.hidden = !selected;
    if (window.__VISCERA_VIEWER__) window.__VISCERA_VIEWER__.isVisible = !selected;
    resetButton.disabled = selected && !ready;
    if (selected) {
      document.querySelector('#viewer-title').textContent = '鲫鱼 · 莲池观察';
      document.querySelector('.caption > span').textContent = '生命的运动';
      document.querySelector('.tip span').textContent = '拖动改变角度　滚轮放大缩小';
      document.querySelector('#hotspot-callout').hidden = true;
      buildPanel();
      activate();
    } else {
      document.querySelector('.caption > span').textContent = '3D数字标本';
      document.querySelector('.tip span').textContent = '拖动旋转　滚轮缩放　点击彩色圆点查看结构';
    }
    sendActive();
  }
  function reset() { if (ready) { frame.contentWindow?.fishReset?.(); syncControls(); } }
  window.ScienceFishObservation = {select, reset, get ready(){ return ready; }};
  window.addEventListener('message', event => {
    if (event.source !== frame?.contentWindow || event.origin !== location.origin) return;
    if (event.data?.type === 'science-fish-load-progress') {
      const progress = Math.max(0, Math.min(1, Number(event.data.progress) || 0));
      loading.style.setProperty('--fish-load', `${Math.round(progress * 100)}%`);
      loading.querySelector('p').textContent = event.data.label || '正在下载水下场景';
      loading.querySelector('small').textContent = `${Math.round(progress * 100)}%`;
      return;
    }
    if (event.data?.type === 'science-fish-load-stage') {
      const progress = Math.max(0, Math.min(1, Number(event.data.progress) || 0));
      loading.classList.add('is-progressive');
      loading.style.setProperty('--fish-load', `${Math.round(progress * 100)}%`);
      loading.querySelector('p').textContent = event.data.label || '正在布置莲池场景';
      loading.querySelector('small').textContent = `${Math.round(progress * 100)}%`;
      if (event.data.stage === 'complete') setTimeout(() => { loading.hidden = true; }, 240);
      return;
    }
    if (event.data?.type !== 'science-fish-ready') return;
    ready = true;
    syncControls();
    resetButton.disabled = false;
    sendActive();
  });
  document.addEventListener('click', event => {
    if (selected && document.body.dataset.domain === 'life' && event.target.closest('[data-action="fullscreen"]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const change = document.fullscreenElement ? document.exitFullscreen?.() : viewer.requestFullscreen?.();
      change?.catch(error => console.warn('鲫鱼全屏未能打开:', error.name));
      return;
    }
    if (selected && event.target.closest('.tool[data-action="reset"]')) {
      event.stopImmediatePropagation();
      reset();
    }
  }, true);
  document.addEventListener('visibilitychange', sendActive);
  new MutationObserver(sendActive).observe(document.body, {attributes:true,attributeFilter:['data-domain']});
  window.addEventListener('DOMContentLoaded', () => {
    if (new URLSearchParams(location.search).get('observe') === 'crucian') {
      queueMicrotask(() => document.querySelector('[data-organ="crucian"]')?.click());
    }
  });
})();
