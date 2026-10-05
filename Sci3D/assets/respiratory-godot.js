/* Complete airway observation, integrated with the existing organ library. */
(() => {
  const viewer = document.querySelector('.viewer');
  const mount = document.querySelector('#three-mount');
  const panel = document.querySelector('#info-panel');
  const resetButton = document.querySelector('.tool[data-action="reset"]');
  const stage = document.createElement('div');
  stage.className = 'respiratory-stage';
  stage.hidden = true;
  stage.setAttribute('aria-label', '人的呼吸器官：结构、呼吸运动与空气路径');
  viewer.appendChild(stage);
  const loading = document.createElement('div');
  loading.className = 'respiratory-loading';
  loading.innerHTML = '<span></span><p>正在准备呼吸器官观察…</p>';
  stage.appendChild(loading);
  const controls = document.createElement('div');
  controls.className = 'respiratory-controls';
  controls.setAttribute('aria-label', '呼吸观察工具');
  controls.innerHTML = '<button data-resp="pause" aria-pressed="false" disabled>暂停</button><button data-resp="slow" aria-pressed="false" disabled>慢放</button><button data-resp="airflow" aria-pressed="true" disabled>空气路径</button><button data-resp="labels" aria-pressed="true" disabled>结构标注</button><button data-resp="reveal" aria-pressed="false" disabled>气道透视</button><button data-resp="pan" aria-pressed="false" disabled>移动</button><button data-resp="focus" aria-pressed="false" disabled>近看肺</button><button data-resp="reset" disabled>复位</button>';
  viewer.appendChild(controls);
  const exit = document.createElement('button');
  exit.className = 'respiratory-exit';
  exit.textContent = '⛶ 退出全屏';
  exit.addEventListener('click', () => document.exitFullscreen?.());
  viewer.appendChild(exit);
  let frame, ready = false, selected = false, currentPick = '';
  const descriptions = {
    nose: ['鼻 / 鼻腔', '鼻是空气进出人体的重要通道。鼻腔可以过滤、加温和湿润吸入的空气。'],
    pharynx: ['咽', '位于鼻腔和口腔后方，空气从这里继续经过喉，进入气管。'],
    larynx: ['喉', '位于咽与气管之间，是空气通过的部位，也是发声器官。'],
    trachea: ['气管', '连接喉和支气管。观察一圈圈的软骨，它们帮助气管保持通畅。'],
    bronchi: ['支气管', '气管分成左右两条主支气管，分别进入左右肺，再分成更细的分支。'],
    right_lung: ['右肺', '位于人体右侧，在正面观察时出现在画面的左边。肺是气体交换的场所。'],
    left_lung: ['左肺', '位于人体左侧，在正面观察时出现在画面的右边。左肺略小，为心脏留出空间。'],
    diaphragm: ['膈肌', '位于胸腔下方。吸气时收缩、下降并变平；呼气时放松、回升。它与胸廓的运动一起帮助肺内空气进出。']
  };
  function command(name, value) { if (ready) frame.contentWindow.respiratoryCommand?.(name, value); }
  function sendActive() {
    if (ready) frame.contentWindow.respiratorySetActive?.(selected && document.body.dataset.domain === 'life' && !document.hidden);
  }
  function pick(id) {
    currentPick = id;
    const target = panel.querySelector('.respiratory-detail');
    if (target) {
      const entry = descriptions[id] || ['点击标注，认识器官', '从鼻开始，沿着相连的通道，找到左右肺。也可以拖动模型，看看前后位置。'];
      target.querySelector('b').textContent = entry[0];
      target.querySelector('p').textContent = entry[1];
    }
    panel.querySelectorAll('[data-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pick === id)));
  }
  function buildPanel() {
    panel.innerHTML = `
      <div class="kicker">生命世界 · 人体的奥秘</div>
      <div class="title-row"><div><h1>人的呼吸器官</h1><em>RESPIRATORY SYSTEM</em></div></div>
      <p class="description">跟着空气走一遍，再观察胸廓、肺和膈肌怎样一起运动。</p>
      <div class="respiratory-path"><span>鼻</span><i>→</i><span>咽</span><i>→</i><span>喉</span><i>→</i><span>气管</span><i>→</i><span>支气管</span><i>→</i><span>肺</span></div>
      <div class="respiratory-picks">${Object.entries(descriptions).map(([id, entry]) => `<button data-pick="${id}" aria-pressed="false">${entry[0]}</button>`).join('')}</div>
      <div class="note respiratory-detail" aria-live="polite"><b></b><p></p></div>
      <h2>一呼一吸，发生什么？</h2>
      <dl class="respiratory-notes"><div><dt>吸气</dt><dd>胸廓扩大，膈肌下降，肺随之扩张，空气进入。</dd></div><div><dt>呼气</dt><dd>胸廓回落，膈肌回升，肺回缩，气体沿原路呼出。</dd></div></dl>
      <div class="note respiratory-question"><b>带着问题观察</b><p>暂停在吸气和呼气的不同位置：肺下方的膈肌形状一样吗？空气经过的器官顺序会改变吗？</p></div>
      <p class="respiratory-model-note">沿用原有肺模型的外形与贴图，呼吸为形变示意。打开“气道透视”可观察内部气道示意；空气粒子略向前显示，方便追踪。颜色表示方向，吸入和呼出的都是混合气体。</p>
      <p class="respiratory-model-note">科学参考：<a href="https://www.nhlbi.nih.gov/health/lungs/respiratory-system" target="_blank" rel="noopener">NIH · 呼吸系统</a>、<a href="https://www.nhlbi.nih.gov/health/lungs/breathing-benefits" target="_blank" rel="noopener">呼吸运动</a></p>`;
    pick(currentPick);
  }
  function activate() {
    if (frame) return;
    if (location.protocol === 'file:') {
      loading.innerHTML = '<p>请通过课堂启动器打开动态观察。<br>双击“运行网页版.cmd”，再打开 <a href="http://127.0.0.1:8765/?observe=respiratory">呼吸器官课堂</a>。</p>';
      return;
    }
    frame = document.createElement('iframe');
    frame.title = '人的呼吸器官3D动态观察';
    frame.src = 'assets/godot-respiratory/index.html?embedded=1';
    frame.allow = 'fullscreen';
    stage.prepend(frame);
  }
  function select(id) {
    selected = id === 'lungs';
    viewer.classList.toggle('is-respiratory', selected);
    stage.hidden = !selected;
    controls.hidden = !selected;
    if (selected) {
      mount.hidden = true;
      if (window.__VISCERA_VIEWER__) window.__VISCERA_VIEWER__.isVisible = false;
      document.querySelector('#viewer-title').textContent = '人的呼吸器官 · 动态观察';
      document.querySelector('.caption > span').textContent = '生命的运动';
      document.querySelector('.tip span').textContent = '拖动转动　移动模式可平移　滚轮缩放';
      document.querySelector('#hotspot-callout').hidden = true;
      buildPanel();
      activate();
    }
    sendActive();
  }
  controls.addEventListener('click', event => {
    const button = event.target.closest('[data-resp]');
    if (!button || !ready) return;
    const name = button.dataset.resp;
    if (name === 'reset') {
      command('reset', true);
      stage.classList.remove('pan-active');
      controls.querySelectorAll('[aria-pressed]').forEach(item => item.setAttribute('aria-pressed', String(['airflow', 'labels'].includes(item.dataset.resp))));
      controls.querySelector('[data-resp="pause"]').textContent = '暂停';
      pick('');
    } else {
      const value = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(value));
      if (name === 'pause') button.textContent = value ? '继续' : '暂停';
      if (name === 'pan') stage.classList.toggle('pan-active', value);
      command(name, value);
    }
  });
  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-pick]');
    if (selected && button) { command('pick', button.dataset.pick); pick(button.dataset.pick); }
  });
  window.addEventListener('message', event => {
    if (event.source !== frame?.contentWindow || event.origin !== location.origin) return;
    if (event.data?.type === 'science-respiratory-ready') {
      ready = true;
      loading.hidden = true;
      controls.querySelectorAll('button').forEach(button => button.disabled = false);
      sendActive();
    } else if (event.data?.type === 'science-respiratory-pick' && selected) pick(event.data.id);
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
  window.ScienceRespiratoryObservation = {select, get ready() {return ready;}};
  window.addEventListener('DOMContentLoaded', () => {
    if (['respiratory', 'lungs'].includes(new URLSearchParams(location.search).get('observe'))) {
      queueMicrotask(() => document.querySelector('[data-organ="lungs"]')?.click());
    }
  });
})();
