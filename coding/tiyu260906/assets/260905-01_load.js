/* Tab④：运动负荷自检器 UI（计算全部委托给 PELoadCore，与自测共用同一内核） */
window.PELoad = (function () {
  var P = null, U = null, C = null, R = null, PLAN = null, cur = null;
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function deps() {
    P = window.PEPose; U = window.PEUtil; C = window.PELoadCore;
    if (!P || !U || !C) return false;
    R = C.R; PLAN = C.PLAN; if (!cur) cur = clone(PLAN.bad);
    return true;
  }

  function init() {
    if (!deps() || !document.getElementById('ld-table')) return;
    document.querySelectorAll('[data-lp]').forEach(function (b) {
      b.addEventListener('click', function () { cur = clone(PLAN[b.dataset.lp]); render(); });
    });
    document.getElementById('ld-fix').addEventListener('click', function () { cur = C.fix(cur); render(); afterFix(); });
    document.getElementById('ld-copy').addEventListener('click', copy);
    document.getElementById('ld-add').addEventListener('click', function () { cur.push({ n: '新环节', d: 3, a: 2, t: 'mid' }); render(); });
    renderKB(); render();
  }
  function onShow() { if (document.getElementById('ld-hr')) render(); }

  function render() {
    var c = C.calc(cur); c.rows = cur;
    document.getElementById('ld-total').textContent = '合计 ' + c.total + ' 分钟 · 有效练习 ' + c.active + ' 分钟';
    var tb = document.querySelector('#ld-table tbody');
    tb.innerHTML = cur.map(function (r, i) {
      return '<tr><td><input class="ce" data-i="' + i + '" data-k="n" value="' + String(r.n).replace(/"/g, '&quot;') + '"></td>' +
        '<td><input class="ce num" type="number" min="0" max="40" data-i="' + i + '" data-k="d" value="' + r.d + '"></td>' +
        '<td><input class="ce num" type="number" min="0" max="40" data-i="' + i + '" data-k="a" value="' + r.a + '"></td>' +
        '<td><select class="ce" data-i="' + i + '" data-k="t">' + C.TYPES.map(function (t) { return '<option value="' + t + '"' + (r.t === t ? ' selected' : '') + '>' + C.INT[t].l + '</option>'; }).join('') + '</select></td>' +
        '<td style="font-family:var(--mono);font-size:12px;text-align:center">' + C.INT[r.t].hr + '</td>' +
        '<td><button class="btn del" data-i="' + i + '" style="padding:3px 8px">✕</button></td></tr>';
    }).join('');
    tb.querySelectorAll('.ce').forEach(function (el) {
      el.addEventListener('change', function () {
        var i = +el.dataset.i, k = el.dataset.k;
        cur[i][k] = (k === 'd' || k === 'a') ? (+el.value || 0) : el.value;
        if (cur[i].a > cur[i].d) cur[i].a = cur[i].d;
        render();
      });
      el.addEventListener('input', function () { if (el.dataset.k === 'n') { cur[+el.dataset.i].n = el.value; } });
    });
    tb.querySelectorAll('.del').forEach(function (b) { b.addEventListener('click', function () { cur.splice(+b.dataset.i, 1); render(); }); });
    gauges(c); drawHR(c); verdict(c);
  }

  function gauges(c) {
    var p = C.pass(c);
    var items = [
      { l: '群体运动密度', v: c.group, ok: p.group, req: '≥' + R.groupDensity, min: R.groupDensity, unit: '%', d: '全班总体运动时间÷课总时间' },
      { l: '个体运动密度', v: c.indiv, ok: p.indiv, req: '≥' + R.indivDensity, min: R.indivDensity, unit: '%', d: '单个学生运动时间÷课总时间' },
      { l: '平均心率', v: c.avg, ok: p.hr, req: R.hrLow + '～' + R.hrHigh, min: R.hrLow, max: R.hrHigh, unit: '次/分', d: '课标：中高运动强度' },
      { l: '体能练习时长', v: c.fit, ok: p.fit, req: '≥' + R.fitnessMin, min: R.fitnessMin, unit: '分钟', d: '课标：每节课 10 分钟左右' }
    ];
    document.getElementById('ld-gauges').innerHTML = items.map(function (g) {
      var pct = Math.min(100, g.v / (g.max ? g.max : g.min * 1.4) * 100);
      return '<div style="background:#0f151c;border:1px solid ' + (g.ok ? '#2a5734' : '#5c2823') + ';border-radius:9px;padding:9px 11px">' +
        '<div style="font-size:12px;color:var(--dim)">' + g.l + '</div>' +
        '<div style="font-family:var(--mono);font-size:22px;color:' + (g.ok ? '#7ee2a1' : '#ff9a92') + '">' + U.fmt(g.v, 0) +
        '<span style="font-size:12px">' + g.unit + '</span> ' + (g.ok ? '✓' : '✗') + '</div>' +
        '<div style="height:5px;background:#1b232c;border-radius:3px;margin:5px 0"><div style="height:5px;width:' + pct + '%;background:' + (g.ok ? '#3fb950' : '#f85149') + ';border-radius:3px"></div></div>' +
        '<div class="dim" style="font-size:11px">要求 ' + g.req + ' · ' + g.d + '</div></div>';
    }).join('');
  }
  function drawHR(c) {
    var s = document.getElementById('ld-hr'); if (!s) return;
    var W = 520, H = 240, pad = { l: 40, r: 12, t: 14, b: 30 }, hr = c.hr;
    function X(i) { return pad.l + i / Math.max(1, hr.length - 1) * (W - pad.l - pad.r); }
    function Y(v) { return H - pad.b - (v - 70) / 120 * (H - pad.t - pad.b); }
    while (s.firstChild) s.removeChild(s.firstChild);
    s.appendChild(P.el('rect', { x: 0, y: 0, width: W, height: H, fill: '#0d1219', rx: 8 }));
    s.appendChild(P.el('rect', { x: pad.l, y: Y(R.hrHigh), width: W - pad.l - pad.r, height: Y(R.hrLow) - Y(R.hrHigh), fill: '#12331d', opacity: .85 }));
    s.appendChild(P.txt(pad.l + 6, Y(R.hrHigh) - 4, '课标区间 140～160', '#7ee2a1', 10));
    [80, 100, 120, 140, 160, 180].forEach(function (v) {
      s.appendChild(P.el('line', { x1: pad.l, y1: Y(v), x2: W - pad.r, y2: Y(v), stroke: '#1e2831', 'stroke-width': 1 }));
      s.appendChild(P.txt(6, Y(v) + 3.5, v, '#4d5a68', 9.5, true));
    });
    var d = ''; hr.forEach(function (p, i) { d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.hr).toFixed(1) + ' '; });
    s.appendChild(P.el('path', { d: d, stroke: '#58a6ff', 'stroke-width': 2.2, fill: 'none' }));
    var cum = 0;
    cur.forEach(function (r) {
      cum += (+r.d || 0); var i = cum - 1;
      if (i >= 0 && i < hr.length) s.appendChild(P.el('line', { x1: X(i), y1: pad.t, x2: X(i), y2: H - pad.b, stroke: '#2b3542', 'stroke-width': 1, 'stroke-dasharray': '2 3' }));
    });
    var mx = Math.max.apply(null, hr.map(function (p) { return p.hr; }));
    s.appendChild(P.txt(W - 208, pad.t + 11, '平均 ' + c.avg + ' · 峰值 ' + mx + ' · 区间内 ' + U.fmt(c.inZone, 0) + '% 时间', '#8b949e', 10.5, true));
    [0, 10, 20, 30, 40].forEach(function (m) { if (m < hr.length) s.appendChild(P.txt(X(m) - 7, H - pad.b + 16, m + "'", '#6b7a8c', 10, true)); });
    s.appendChild(P.txt(W - 48, H - pad.b + 16, '分钟', '#6b7a8c', 10));
  }
  function verdict(c) {
    var iss = C.verdict(c);
    var loses = cur.filter(function (r) { return r.d - r.a >= 3; }).sort(function (a, b) { return (b.d - b.a) - (a.d - a.a); });
    loses.slice(0, 3).forEach(function (r) {
      iss.push('✗ 时间流失点在「' + r.n + '」：' + r.d + ' 分钟里学生只动了 ' + r.a + ' 分钟，净损耗 ' + (r.d - r.a) + ' 分钟');
    });
    var adv = [];
    if (c.talk / c.total > 0.3) adv.push('<b>压缩讲解示范</b>：改为"小组长带做 + 教师巡回点拨"，集中讲解拆成 1 分钟内的微提示，一次只讲 1 个要点（课标：尽量减少教师讲解、示范、队形调动时间）。');
    if (c.indiv < R.indivDensity) adv.push('<b>消灭排队等待</b>：' + (loses[0] ? '把「' + loses[0].n + '」' : '把轮流练习') + '改为多人同练——4～6 站循环、每人一球（沙包、排球可替代），参与人数翻倍。');
    if (c.avg < R.hrLow) adv.push('<b>提升强度</b>：技能环节叠加移动（掷前助步、掷后折返捡球），静止掷准改限时计数赛；心率曲线上半段应呈爬坡而非平线。');
    if (c.avg > R.hrHigh) adv.push('<b>降低强度</b>：两个高峰之间插入 1～2 分钟恢复与讲解，避免全课长时间超过 160 次/分。');
    if (c.fit < R.fitnessMin) adv.push('<b>补上体能</b>：固定安排 10 分钟整合性体能（与所学项目结合，如仰卧传抛球 + 立卧撑），体现多样性、补偿性、趣味性、整合性。');
    if (!adv.length) adv.push('结构已达标。可再加"常赛"比重：把最后一个练习环节升级为小组对抗赛，落实"学、练、赛"一体化。');
    adv.push('留 1 分钟做学生互评（清单式评价表），对应课标"评价主体多元"，也为下一课提供调整依据。');
    document.getElementById('ld-issue').innerHTML = iss.map(function (t) {
      var col = t.charAt(0) === '✓' ? '#7ee2a1' : t.charAt(0) === '✗' ? '#ff9a92' : '#93a1b1';
      return '<div style="padding:5px 0;border-bottom:1px dashed #222c37;color:' + col + '">' + t + '</div>';
    }).join('');
    document.getElementById('ld-advice').innerHTML = adv.map(function (t) { return '<div style="padding:5px 0;border-bottom:1px dashed #222c37">' + t + '</div>'; }).join('');
    window.__lv = { iss: iss, adv: adv.map(function (t) { return t.replace(/<\/?b>/g, ''); }), c: c };
  }
  function afterFix() {
    var c = window.__lv.c, p = C.pass(c);
    var all = p.group && p.indiv && p.hr && p.fit;
    document.getElementById('ld-issue').innerHTML =
      '<div style="padding:5px 0;color:' + (all ? '#7ee2a1' : '#f0c674') + '"><b>' + (all ? '✓ 已按课标四项红线自动重排，全部达标' : '! 已重排，尚有指标未达标，请手工微调') + '</b></div>' +
      '<div style="padding:5px 0">群体密度 ' + c.group.toFixed(0) + '% ｜ 个体密度 ' + c.indiv.toFixed(0) + '% ｜ 平均心率 ' + c.avg + ' 次/分 ｜ 体能 ' + c.fit + ' 分钟 ｜ 合计 ' + c.total + ' 分钟</div>' +
      '<div class="dim" style="padding:5px 0;font-size:12.5px">重排用的是<b>规则</b>不是玄学：① 静立≥6 分钟的讲解→拆成 1 分钟微提示＋四组齐做；② 排队等待型环节→压缩；③"一人做众人看"→多站循环全员同练；④ 缺体能→插入整合性体能；⑤ 缺比赛→插入小组赛；⑥ 超时长→压缩最长环节；⑦ 密度仍不足→把等待时间转成同步练习；⑧ 心率偏低→上调强度档位。老师要判断的是：<b>这么改，我校场地、器材和班额允不允许。</b></div>';
  }
  function copy() {
    var v = window.__lv; if (!v) return; var c = v.c;
    var txt = '【体育课运动负荷诊断】\n' +
      '群体运动密度 ' + c.group.toFixed(0) + '%（课标≥75%）｜个体运动密度 ' + c.indiv.toFixed(0) + '%（≥50%）｜平均心率 ' + c.avg + ' 次/分（140～160）｜体能练习 ' + c.fit + ' 分钟（≥10）｜合计 ' + c.total + ' 分钟\n\n' +
      '一、红线判定与问题\n' + v.iss.map(function (t, i) { return (i + 1) + '. ' + t; }).join('\n') +
      '\n\n二、改进建议\n' + v.adv.map(function (t, i) { return (i + 1) + '. ' + t; }).join('\n') +
      '\n\n课堂环节\n' + cur.map(function (r) { return '· ' + r.n + '：' + r.d + '′（学生实际练习 ' + r.a + '′，强度：' + C.INT[r.t].l + '）'; }).join('\n') +
      '\n\n依据：《义务教育体育与健康课程标准（2022年版）》六、课程实施（一）教学建议 3.(4)';
    var done = function () { var b = document.getElementById('ld-copy'); b.textContent = '✓ 已复制，可直接粘贴'; setTimeout(function () { b.textContent = '复制诊断结论'; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { fb(txt, done); });
    else fb(txt, done);
  }
  function fb(txt, done) {
    var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { } document.body.removeChild(ta); done();
  }
  function renderKB() {
    var box = document.getElementById('ld-kb'); if (!box || !window.PEKB) return;
    box.innerHTML = '<span class="tag">本页课标依据</span>' + [0, 1, 2, 4].map(function (i) {
      var k = PEKB.load[i]; return '<b>' + k.title + '：</b>"' + k.text + '"（' + k.from + '）';
    }).join('<br>');
  }
  return { init: init, onShow: onShow };
})();
