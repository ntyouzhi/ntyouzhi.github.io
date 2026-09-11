const $ = id => document.getElementById(id);
const frames = { cutout: $('cutoutFrame'), idphoto: $('idphotoFrame') };
const tabs = [...document.querySelectorAll('.workspace-tab')];
const sendToId = $('sendToId');
const sendToCutout = $('sendToCutout');
let active = 'cutout';
let toastTimer;

function toast(message, error = false) {
  const el = $('toast');
  el.textContent = message;
  el.style.background = error ? '#9f3d35' : '#173d36';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

function setView(view) {
  active = view;
  tabs.forEach(tab => {
    const on = tab.dataset.view === view;
    tab.classList.toggle('active', on);
    tab.setAttribute('aria-selected', String(on));
  });
  Object.entries(frames).forEach(([key, frame]) => frame.classList.toggle('active', key === view));
  frames[view].contentWindow?.postMessage({ type: 'workspace-active', view }, '*');
  sendToId.hidden = view !== 'cutout';
  sendToCutout.hidden = view !== 'idphoto';
  history.replaceState(null, '', `#${view}`);
}

tabs.forEach(tab => tab.addEventListener('click', () => setView(tab.dataset.view)));

function polishFrame(frame, type) {
  try {
    const doc = frame.contentDocument;
    const style = doc.createElement('style');
    style.textContent = type === 'cutout'
      ? `.header,.brand-section{display:none!important}body{padding:8px!important}.container{height:100%!important}.main-grid{border-radius:18px;overflow:hidden}.panel{box-shadow:none!important}`
      : `header,footer{display:none!important}body{background:#f7faf8!important}.container{max-width:none!important;padding:8px!important;height:100vh}.controls{max-height:calc(100vh - 16px)!important}.panel,.tab-body{box-shadow:none!important}`;
    doc.head.appendChild(style);
  } catch (error) { console.warn('子工作台样式载入失败', error); }
}
frames.cutout.addEventListener('load', () => polishFrame(frames.cutout, 'cutout'));
frames.idphoto.addEventListener('load', () => {
  polishFrame(frames.idphoto, 'idphoto');
  if (active === 'idphoto') frames.idphoto.contentWindow?.postMessage({ type: 'workspace-active', view: 'idphoto' }, '*');
});
sendToId.addEventListener('click', async () => {
  try {
    const item = frames.cutout.contentWindow.CUTOUT_DEBUG?.current();
    if (!item?.resultBlob) throw new Error('请先完成一张抠图');
    const bridge = frames.idphoto.contentWindow.IDPHOTO_BRIDGE;
    if (!bridge?.loadFile) throw new Error('证件照工作台尚未就绪');
    const file = new File([item.resultBlob], `${item.name.replace(/\.[^.]+$/, '')}_抠图.png`, { type: 'image/png' });
    const loaded = await bridge.loadFile(file, { asCutout: true });
    if (!loaded) throw new Error('抠图结果载入失败');
    setView('idphoto');
    toast('抠图结果已送入证件照工作台');
  } catch (error) { toast(error.message || '传递失败', true); }
});

sendToCutout.addEventListener('click', async () => {
  try {
    const bridge = frames.idphoto.contentWindow.IDPHOTO_BRIDGE;
    if (!bridge?.exportCurrentFile) throw new Error('证件照工作台尚未就绪');
    const file = await bridge.exportCurrentFile();
    if (!file) throw new Error('请先生成一张证件照');
    const cutout = frames.cutout.contentWindow.CUTOUT_DEBUG;
    if (!cutout?.addFiles) throw new Error('智能抠图工作台尚未就绪');
    await cutout.addFiles([file]);
    setView('cutout');
    toast('证件照成品已送入智能抠图工作台');
  } catch (error) { toast(error.message || '传递失败', true); }
});

setView(location.hash === '#idphoto' ? 'idphoto' : 'cutout');

