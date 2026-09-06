/* Tab②：掷实心球动作分解（分帧动画 + 实时关节角 + 出手角抛体探究） */
window.PEMotion = (function () {
  var P = null, U = null;
  function deps() { P = window.PEPose; U = window.PEUtil; return P && U; }
  var svg, timer = null, t = 0, playing = false, speed = 1;
  var CUR = 'good', REL = 0.72;
  var PH = [
    { t: 0.00, name: '① 站位持球', desc: '两脚前后（或左右）开立，双手持球于头后上方，目视前方。先建立"已就绪"的动作表象。', focus: '重心落在两脚之间，肩与髋放松', hl: null },
    { t: 0.30, name: '② 引球成满弓', desc: '球向后下方引，膝角适度增大，髋前送、肩轴后旋——躯干后仰形成"满弓"，拉长腹背肌群蓄弹性势能。', focus: '躯干后仰 15°～30°，肘角接近 180°', hl: 'trunk' },
    { t: 0.58, name: '③ 蹬地转体', desc: '后脚蹬地，力量经伸膝→伸髋→收腹向上传递。蹬地先于挥臂，这就是课标"蹬地—满弓—挥臂—拨指"里那个先后顺序。', focus: '膝角由约 110° 快速展开；髋领先肩（超越器械）', hl: 'leg' },
    { t: 0.72, name: '④ 挥臂拨指出手', desc: '躯干前屈到位后上臂加速前摆，肘关节充分伸展，球离手瞬间手腕手指快速拨球——出手仰角约 30°～42°。', focus: '出手仰角 30°～42°，肘角 150° 以上', hl: 'arm' },
    { t: 0.92, name: '⑤ 随挥缓冲', desc: '球出手后身体顺势前摆、降低重心缓冲，防止重心冲出投掷区（课标安全要求：统一口令投掷与取回器材）。', focus: '保持平衡，不越线', hl: null }
  ];

  function init() {
    if (!deps()) return;
    svg = document.getElementById('mt-svg'); if (!svg) return;
    bind(); renderKB(); setT(PH[0].t); buildCurve();
  }
  function onShow() { if (deps() && svg && !playing) { setT(PH[0].t); buildCurve(); } }

  function setT(v) {
    t = U.clamp(v, 0, 1);
    var pose = P.poseAt(CUR, t), ph = phase(), m = P.metrics(pose);
    var opt = { hl: ph.hl, label: '水平三～水平四 · 掷实心球 · 发力链分帧（依据课标"蹬地—满弓—挥臂—拨指"）' };
    if (t >= REL - 0.02) {
      var rp = P.poseAt(CUR, REL), ri = P.releaseInfo(rp);
      opt.refAngle = ri.angle; opt.trail = flight(rp);
    }
    P.render(svg, pose, opt);
    document.getElementById('mt-phase').textContent = '阶段：' + ph.name;
    document.getElementById('mt-link').textContent = '髋领先肩 ' + U.fmt(m.sep, 0) + ' px（>8 即"超越器械"）';
    renderInfo(ph); renderAngles(m, t >= REL ? P.releaseInfo(P.poseAt(CUR, REL)) : null);
  }
  function phase() { var b = PH[0]; for (var i = 0; i < PH.length; i++) if (t >= PH[i].t - 0.002) b = PH[i]; return b; }
  function flight(rp) {
    var ri = P.releaseInfo(rp), b = rp.ball; if (!b) return null;
    var v = 2.35, g = 0.012, a = ri.angle * Math.PI / 180, pts = [];
    for (var i = 0; i < 46; i++) {
      var x = b.x + v * Math.cos(a) * i, y = b.y - (v * Math.sin(a) * i - 0.5 * g * i * i);
      if (y > P.VB.ground - 2 || x > P.VB.w - 6) break;
      pts.push({ x: x, y: y });
    }
    return pts;
  }
  function renderInfo(ph) {
    document.getElementById('mt-info').innerHTML = '<b>' + ph.name + '</b>' +
      '<span style="display:block;color:var(--dim);font-size:13px;margin:6px 0">' + ph.desc + '</span>' +
      '<span class="pill ok">本帧要点：' + ph.focus + '</span>';
  }
  function renderAngles(m, ri) {
    var rows = [['膝关节角', m.knee, '引球 ~110° → 出手 ~175°', '下肢蹬伸幅度'],
      ['髋关节角', m.hip, '满弓帧最小，反映屈髋深度', '髋部发力参与'],
      ['肘关节角', m.elbow, '出手瞬间 ≥ 150°（接近充分伸直）', '挥臂末端速度'],
      ['躯干相对竖直', m.trunk, '负＝后仰（满弓），正＝前屈（鞭打完成）', '核心发力状态'],
      ['出手仰角', ri ? ri.angle : null, '合理区间 30°～42°', '决定"掷得远"的关键']];
    document.querySelector('#mt-angles tbody').innerHTML = rows.map(function (r) {
      var ok = r[1] != null && ((r[0] === '出手仰角' && r[1] >= 30 && r[1] <= 42) || (r[0] !== '出手仰角'));
      return '<tr><td>' + r[0] + '</td><td style="font-family:var(--mono);color:' + (ok ? '#fff' : '#ff9a92') + '">' + U.fmt(r[1], 0) + '°</td><td class="dim" style="font-size:11.5px">' + r[2] + '</td></tr>';
    }).join('');
  }
  function bind() {
    document.getElementById('mt-play').addEventListener('click', function () {
      playing = !playing; this.textContent = playing ? '❙❙ 暂停' : '▶ 播放动作链';
      if (playing) tick(); else stop();
    });
    document.getElementById('mt-prev').addEventListener('click', function () { step(-1); });
    document.getElementById('mt-next').addEventListener('click', function () { step(1); });
    document.getElementById('mt-speed').addEventListener('change', function () { speed = parseFloat(this.value); });
    document.getElementById('mt-v').addEventListener('input', buildCurve);
    document.getElementById('mt-h').addEventListener('input', buildCurve);
  }
  function step(dir) {
    var i = PH.indexOf(phase());
    t = dir > 0 ? Math.min(1, (PH[i + 1] ? PH[i + 1].t : 1) + 0.002) : Math.max(0, PH[Math.max(0, i - 1)].t - 0.002);
    playing = false; document.getElementById('mt-play').textContent = '▶ 播放动作链'; setT(t);
  }
  function tick() {
    if (!playing) return;
    t += 0.0045 / speed; if (t > 1.25) t = 0;
    setT(Math.min(t, 1)); timer = requestAnimationFrame(tick);
  }
  function stop() { if (timer) cancelAnimationFrame(timer); timer = null; }

  /* ---------- 抛体射程曲线（"怎样获得最适宜的出手角度"） ---------- */
  function range(v, th, hh) {
    var g = 9.8, r = th * Math.PI / 180;
    return v * Math.cos(r) * (v * Math.sin(r) + Math.sqrt(v * v * Math.sin(r) * Math.sin(r) + 2 * g * hh)) / g;
  }
  function bestAngle(v, hh) {
    var b = 0, bb = 0;
    for (var a = 1; a <= 70; a += 0.5) { var r = range(v, a, hh); if (r > bb) { bb = r; b = a; } }
    return { a: b, r: bb };
  }
  function buildCurve() {
    var s = document.getElementById('mt-curve'); if (!s) return;
    var v = parseFloat(document.getElementById('mt-v').value), h = parseFloat(document.getElementById('mt-h').value);
    document.getElementById('mt-vv').textContent = v.toFixed(1);
    document.getElementById('mt-hv').textContent = h.toFixed(2);
    var b = bestAngle(v, h);
    document.getElementById('mt-best').innerHTML = '当前参数下最优出手角 <b>' + b.a.toFixed(1) + '°</b>，对应射程 <b>' + b.r.toFixed(2) + ' m</b>。<span class="dim">出手点越高、速度越快，最优角越靠近 40°～42°——课标那个"最适宜角度"的答案形状就是这样被算出来的。</span>';
    var W = 560, H = 300, pad = { l: 46, r: 16, t: 16, b: 34 };
    var maxR = range(v, b.a, h) * 1.12;
    function X(a) { return pad.l + (a / 70) * (W - pad.l - pad.r); }
    function Y(r) { return H - pad.b - (r / maxR) * (H - pad.t - pad.b); }
    while (s.firstChild) s.removeChild(s.firstChild);
    s.appendChild(P.el('rect', { x: 0, y: 0, width: W, height: H, fill: '#0d1219', rx: 9 }));
    s.appendChild(P.el('rect', { x: X(30), y: pad.t, width: X(42) - X(30), height: H - pad.t - pad.b, fill: '#12331d', opacity: .75 }));
    s.appendChild(P.txt(X(31), pad.t + 14, '课堂常用合理区间 30°~42°', '#7ee2a1', 10.5));
    for (var gy = 0; gy <= 4; gy++) {
      var rv = maxR * gy / 4;
      s.appendChild(P.el('line', { x1: pad.l, y1: Y(rv), x2: W - pad.r, y2: Y(rv), stroke: '#222c37', 'stroke-width': 1 }));
      s.appendChild(P.txt(8, Y(rv) + 3.5, rv.toFixed(0) + 'm', '#4d5a68', 9.5, true));
    }
    var pts = '';
    for (var a = 5; a <= 65; a += 1) pts += (a === 5 ? 'M' : 'L') + X(a).toFixed(1) + ' ' + Y(range(v, a, h)).toFixed(1) + ' ';
    s.appendChild(P.el('path', { d: pts, stroke: '#58a6ff', 'stroke-width': 2.4, fill: 'none' }));
    s.appendChild(P.el('line', { x1: X(b.a), y1: Y(range(v, b.a, h)), x2: X(b.a), y2: H - pad.b, stroke: '#e3a008', 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }));
    s.appendChild(P.el('circle', { cx: X(b.a), cy: Y(range(v, b.a, h)), r: 5, fill: '#e3a008' }));
    s.appendChild(P.txt(X(b.a) + 7, Y(range(v, b.a, h)) - 7, b.a.toFixed(1) + '° / ' + range(v, b.a, h).toFixed(1) + 'm', '#f0c674', 11, true));
    [10, 20, 30, 40, 50, 60].forEach(function (a) { s.appendChild(P.txt(X(a) - 8, H - pad.b + 16, a + '°', '#6b7a8c', 10, true)); });
    s.appendChild(P.txt(W - 66, H - pad.b + 22, '出手角 θ', '#6b7a8c', 10.5));
  }
  function renderKB() {
    var box = document.getElementById('mt-kb'); if (!box || !window.PEKB) return;
    box.innerHTML = '<span class="tag">本页课标依据</span>' + PEKB.motion.map(function (k) {
      return '<b>' + k.title + '：</b>"' + k.text + '"（' + k.from + '）';
    }).join('<br>');
  }
  return { init: init, onShow: onShow };
})();
