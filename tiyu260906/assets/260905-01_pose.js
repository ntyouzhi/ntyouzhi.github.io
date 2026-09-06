/* ========================================================================
 * PEPose · 掷实心球运动学引擎（纯本地确定性计算，零网络请求）
 * 骨骼正运动学(FK) → 关节角度 / 发力时序 / 出手参数 → 规则诊断
 * 摄像头(MediaPipe)与离线示例共用同一套指标与诊断，保证结论一致
 * 换项目时只需替换 FRAMES 角度数据与 diagnose() 阈值
 * ====================================================================== */
window.PEPose = (function () {
  var U = window.PEUtil;
  var VB = { w: 460, h: 320, ground: 290 };
  var L = { shank: 60, thigh: 58, trunk: 62, neck: 22, upper: 40, fore: 38, ballR: 15 };

  // 角度约定：与"竖直向上"的夹角，正值 = 向投掷方向（右）倾斜
  function dir(a) { var r = a * Math.PI / 180; return { x: Math.sin(r), y: -Math.cos(r) }; }
  function add(p, v, k) { return { x: p.x + v.x * k, y: p.y + v.y * k }; }

  /* ---------- 正运动学 ---------- */
  function fk(q) {
    var ankle = { x: 230, y: VB.ground };
    var knee = add(ankle, dir(q.shank), L.shank);
    var hip = add(knee, dir(q.thigh), L.thigh);
    var shoulder = add(hip, dir(q.trunk), L.trunk);
    var head = add(shoulder, dir(q.trunk), L.neck + 8);
    var elbow = add(shoulder, dir(q.arm), L.upper);
    var wDir = q.arm + (180 - q.elbow);
    var wrist = add(elbow, dir(wDir), L.fore);
    var p = { ankle: ankle, knee: knee, hip: hip, shoulder: shoulder, head: head, elbow: elbow, wrist: wrist, wDir: wDir };
    p.ball = (q.hold === false) ? null : add(wrist, dir(wDir), L.ballR);
    return p;
  }

  /* ---------- 几何指标（全部由骨架算出，不写死数值） ---------- */
  function metrics(p) {
    var knee = U.angle(p.hip, p.knee, p.ankle);
    var hip = U.angle(p.knee, p.hip, p.shoulder);
    var elbow = U.angle(p.shoulder, p.elbow, p.wrist);
    var tk = U.tiltFromVertical(p.hip, p.shoulder, 1);
    return {
      knee: knee, hip: hip, elbow: elbow,
      trunk: tk ? tk.signed : null,          // + 前屈 / - 后仰
      legDrive: U.angle(p.shoulder, p.hip, p.knee),
      armElev: (p.wDir == null) ? null : 90 - p.wDir,
      sep: (p.hip && p.shoulder) ? (p.hip.x - p.shoulder.x) : 0   // 髋超越肩（"超越器械"）
    };
  }
  function releaseInfo(p) {
    var el = p.elbow, wr = p.wrist;
    var dx = wr.x - el.x, dy = wr.y - el.y;
    return { angle: U.deg(Math.atan2(-dy, dx)), elbowExt: U.angle(p.shoulder, p.elbow, p.wrist), heightPx: VB.ground - wr.y };
  }

  /* ---------- 关键帧角参数（t: 0→1，出手约在 t=0.72） ---------- */
  // 三条独立时间线：下肢(.46 峰值) → 躯干(.53) → 上肢(.58)，体现"自下而上"的发力顺序
  var TM = { low: [0, .20, .40, .52, .78], mid: [0, .26, .44, .60, .84], high: [0, .30, .50, .66, .90] };
  var BASE = {
    shank: [4, 14, 34, -8, 16], thigh: [-3, -8, -22, 10, 14],
    trunk: [3, -12, -30, 16, 34], arm: [22, -118, -132, 40, 96], elbow: [128, 166, 172, 168, 168]
  };
  function baseFrames() {
    return { shank: BASE.shank.slice(), thigh: BASE.thigh.slice(), trunk: BASE.trunk.slice(),
      arm: BASE.arm.slice(), elbow: BASE.elbow.slice(), times: { shank: TM.low, thigh: TM.low, trunk: TM.mid, arm: TM.high, elbow: TM.high } };
  }
  function variantFrames(name) {
    var f = baseFrames(); f.rel = 0.72;
    if (name === 'arm') {            // 只挥臂不蹬地：下肢几乎不动，上肢提前挥完并提前出手
      f.shank = [2, 3, 5, 2, 8]; f.thigh = [-1, -2, -3, 2, 6]; f.trunk = [3, 1, -4, 18, 34];
      f.times.arm = [0, .16, .28, .40, .52]; f.times.elbow = [0, .16, .28, .40, .52];
      f.arm = [22, -118, -132, 52, 62]; f.rel = 0.40;
    }
    if (name === 'flat') {           // 出手太平：上臂过早前摆，出手瞬间前臂接近水平
      f.arm = [22, -100, -110, 56, 90]; f.trunk = [3, -8, -22, 22, 38];
    }
    if (name === 'sit') {            // 后坐屈髋·无满弓：重心留在后面、髋角过度折叠、躯干不前倾
      f.trunk = [3, 6, 9, 16, 26]; f.thigh = [-3, -16, -34, -12, -2]; f.shank = [4, 16, 38, 20, 26];
    }
    if (name === 'late') {           // 出手过晚：手臂摆过顶点才放球，方向朝前下
      f.arm = [22, -118, -132, 98, 126]; f.trunk = [3, -10, -26, 26, 40]; f.rel = 0.80;
    }
    return f;
  }

  function smooth(x) { x = U.clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function sample(keys, times, t) {
    if (t <= times[0]) return keys[0];
    var n = times.length - 1;
    if (t >= times[n]) return keys[n];
    for (var i = 0; i < n; i++) {
      if (t >= times[i] && t <= times[i + 1])
        return U.lerp(keys[i], keys[i + 1], smooth((t - times[i]) / (times[i + 1] - times[i])));
    }
    return keys[n];
  }
  function poseAt(name, t) {
    var f = variantFrames(name), tm = f.times;
    return fk({ shank: sample(f.shank, tm.shank, t), thigh: sample(f.thigh, tm.thigh, t),
      trunk: sample(f.trunk, tm.trunk, t), arm: sample(f.arm, tm.arm, t),
      elbow: sample(f.elbow, tm.elbow, t), hold: t < f.rel });
  }
  function series(name, n) {
    n = n || 61; var out = [];
    for (var i = 0; i < n; i++) out.push(poseAt(name, i / (n - 1)));
    return out;
  }
  function peakOf(keys, times) {
    var best = -1, bt = times[0];
    for (var i = 0; i < keys.length - 1; i++) {
      var v = Math.abs(keys[i + 1] - keys[i]) / Math.max(1e-6, times[i + 1] - times[i]);
      if (v > best) { best = v; bt = (times[i] + times[i + 1]) / 2; }
    }
    return bt;
  }

  /* ---------- 诊断规则（阈值 = 课标动作要领 + 投掷项目经验区间） ---------- */
  function diagnose(name) {
    var s = series(name, 61), rel = s[0], relI = 0;
    for (var i = 0; i < s.length; i++) { if (!s[i].ball) { relI = i; break; } rel = s[i]; relI = i; }
    var m = metrics(rel), ri = releaseInfo(rel);
    var f = variantFrames(name), tm = f.times;
    var tLeg = peakOf(f.shank, tm.shank), tTrunk = peakOf(f.trunk, tm.trunk), tArm = peakOf(f.arm, tm.arm);
    var seqOK = (tLeg < tArm) && (tTrunk < tArm);
    var kneeFlex = Math.min.apply(null, s.map(function (p) { return metrics(p).knee; }));
    var layback = Math.max.apply(null, s.map(function (p) { return -metrics(p).trunk; }));
    var extMax = Math.max.apply(null, s.map(function (p) { return metrics(p).elbow; }));
    // 重心前移：出手瞬间髋应在膝之前（后坐者髋落在膝后）
    var hipLead = rel.hip.x - rel.knee.x;
    var issues = [];
    if (ri.angle < 5) issues.push({ lv: 'bad', t: '出手方向已向下（' + U.fmt(ri.angle, 0) + '°）＝出手过晚', d: '手臂摆过顶点才放球，球砸向前下方，成绩与安全性同时变差。', fix: '口令"数到 3 就放"；或身前 1.5 米挂 2.2 米高横绳，要求球从绳上方过去。' });
    else if (ri.angle < 26) issues.push({ lv: 'bad', t: '出手角度 ' + U.fmt(ri.angle, 0) + '°，明显偏平', d: '球走"低平线"，看着用力实则落地早。课标的探究问题正是"怎样获得最适宜的出手角度"。', fix: '"打高不打造远"——朝前上方 30°～42° 把球掷向 3 米高的横绳上沿。' });
    else if (ri.angle > 47) issues.push({ lv: 'warn', t: '出手角度 ' + U.fmt(ri.angle, 0) + '°，过于陡峭', d: '抛得高但水平分速不足，成绩同样受限。', fix: '语言提示"球往远处走，不是往天上飞"，地面标距离线引导。' });
    if (kneeFlex > 165) issues.push({ lv: 'bad', t: '全程膝角最小仅 ' + U.fmt(kneeFlex, 0) + '°，几乎没有屈膝蹬地', d: '下肢未参与发力，变成纯"手臂掷"，违反"蹬地—满弓—挥臂—拨指"的发力链。', fix: '加做"深蹲跳接掷""坐凳起立—立即掷"，重建"腿先发力"的动作感觉。' });
    else if (kneeFlex > 150) issues.push({ lv: 'warn', t: '屈膝蹬地不充分（最小膝角 ' + U.fmt(kneeFlex, 0) + '°）', d: '下肢做功距离短，力量起点偏低。', fix: '引球时提示"膝往前顶一点"，侧方贴 20° 斜线作视觉参照。' });
    if (layback < 8) issues.push({ lv: 'bad', t: '躯干最大后仰仅 ' + U.fmt(layback, 0) + '°，没有形成"满弓"', d: '缺少工作距离就没有做功空间，力量集中在肩部，容易劳损。', fix: '"挺胸看天"语言提示；背后置一低障碍，要求引球时越过它。' });
    else if (layback < 18) issues.push({ lv: 'warn', t: '满弓幅度偏小（最大后仰 ' + U.fmt(layback, 0) + '°）', d: '腹背肌群牵拉不足，弹性势能利用不够。', fix: '先做无球"身体向后倒—收腹拉回"体验，再持球。' });
    if (!seqOK) issues.push({ lv: 'bad', t: '发力时序倒置：上肢峰值 ' + tArm.toFixed(2) + ' 早于下肢 ' + tLeg.toFixed(2), d: '能量无法自下而上传递（鞭打效应失效），是成绩停滞与肩肘损伤的共同诱因。', fix: '口令改"下—中—上"三拍，节拍器 4/4 拍第 4 拍出球；先徒手蹬转再持球。' });
    if (extMax < 150) issues.push({ lv: 'warn', t: '肘角最大 ' + U.fmt(extMax, 0) + '°，挥臂未充分伸展', d: '力量在末端流失，"拨指"环节缺失。', fix: '缩小引球幅度先体会鞭打，再做对墙快速甩臂。' });
    if (hipLead < 0) issues.push({ lv: 'bad', t: '出手瞬间髋仍在膝后方 ' + U.fmt(-hipLead, 0) + ' px＝"坐着掷"', d: '重心留在后面，蹬地的力传不到前面，只能靠腰臂硬抡——掷不远，还伤腰。', fix: '练"上步—髋顶过膝"再掷；地面贴脚印标，要求出手时髋移到膝投影之前。' });

    if (!issues.length) issues.push({ lv: 'ok', t: '发力链完整、出手参数在合理区间', d: '课标要求的"蹬地—满弓—挥臂—拨指"完整动作技术已建立。', fix: '进入挑战：提高出手速度（快速助步掷），或在疲劳状态下保持动作稳定（对应课标"适应运动密度与强度的变化"）。' });
    var score = 100;
    score -= Math.min(28, Math.abs(ri.angle - 36) * 1.3);
    score -= kneeFlex > 165 ? 25 : Math.max(0, (kneeFlex - 150) * 0.6);
    score -= layback < 8 ? 22 : Math.max(0, (18 - layback) * 1.2);
    score -= seqOK ? 0 : 20;
    score -= extMax < 150 ? (150 - extMax) * 0.5 : 0;
    score -= hipLead < 0 ? Math.min(18, -hipLead * 0.8) : 0;
    score = Math.max(25, Math.min(100, Math.round(score)));
    return {
      name: name, score: score, release: ri, m: m, kneeFlex: kneeFlex, layback: layback, extMax: extMax, hipLead: hipLead,
      seq: [{ k: '蹬地（下肢）', t: tLeg, c: '#3fb950' }, { k: '收腹（躯干）', t: tTrunk, c: '#e3a008' }, { k: '挥臂（上肢）', t: tArm, c: '#f85149' }],
      seqOK: seqOK, gaps: { legTrunk: (tTrunk - tLeg).toFixed(2), trunkArm: (tArm - tTrunk).toFixed(2) },
      issues: issues, relT: relI / 60
    };
  }
  // 摄像头模式：一个动作周期的累积统计 → 同一套规则
  function diagnoseWindow(a) {
    var avg = a.n ? a.ang / a.n : null, issues = [], score = 100;
    if (avg != null && avg < 5) { issues.push({ lv: 'bad', t: '出手方向向下（约 ' + avg.toFixed(0) + '°）＝出手过晚', d: '手臂摆过顶点才放球。', fix: '"数到 3 就放"口令 + 身前挂 2.2 米高横绳。' }); score -= 28; }
    else if (avg != null && avg < 26) { issues.push({ lv: 'bad', t: '出手角度偏平（约 ' + avg.toFixed(0) + '°）', d: '球走低平线，落地早。', fix: '"打高不打造远"，掷向 3 米高的横绳上沿。' }); score -= 24; }
    else if (avg != null && avg > 47) { issues.push({ lv: 'warn', t: '出手角度偏陡（约 ' + avg.toFixed(0) + '°）', d: '水平分速不足。', fix: '提示"往远处走不是往天上飞"。' }); score -= 12; }
    if (a.minKnee > 165) { issues.push({ lv: 'bad', t: '膝角最小 ' + a.minKnee.toFixed(0) + '°，几乎未屈膝蹬地', d: '下肢没参与，成了"手臂掷"。', fix: '深蹲跳接掷 / 坐凳起立—立即掷。' }); score -= 25; }
    if (a.maxLay < 8) { issues.push({ lv: 'bad', t: '躯干后仰仅 ' + a.maxLay.toFixed(0) + '°，未形成满弓', d: '缺少工作距离，肩部负荷集中。', fix: '"挺胸看天" + 背后低障碍引球。' }); score -= 20; }
    if (a.extMax < 150) { issues.push({ lv: 'warn', t: '肘角最大 ' + a.extMax.toFixed(0) + '°，挥臂未充分伸展', d: '末端力量流失。', fix: '缩小引球幅度先体会鞭打。' }); score -= 10; }
    if (a.hipLead != null && a.hipLead < 0) { issues.push({ lv: 'bad', t: '出手瞬间髋仍在膝后（' + a.hipLead.toFixed(0) + ' px）＝坐着掷', d: '重心留在后面，蹬地力量传不到前面。', fix: '"上步—髋顶过膝"再掷，地面贴脚印标。' }); score -= 16; }
    if (!issues.length) issues.push({ lv: 'ok', t: '本次动作的出手参数与发力链在合理区间', d: '可进入游戏与比赛环节巩固。', fix: '提高挑战：疲劳下保持动作稳定，或增加出手速度。' });
    return { name: 'live', score: Math.max(30, Math.round(score)), release: { angle: avg, elbowExt: a.extMax },
      m: { elbow: a.extMax }, kneeFlex: a.minKnee, layback: a.maxLay, extMax: a.extMax, hipLead: a.hipLead,
      seq: [], seqOK: true, gaps: null, issues: issues };
  }


  /* ---------- 渲染 ---------- */
  function el(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function txt(x, y, str, fill, size, mono) {
    var t = el('text', { x: x, y: y, fill: fill || '#8b949e', 'font-size': size || 11 });
    if (mono) t.setAttribute('font-family', 'ui-monospace,Consolas,monospace');
    t.textContent = str; return t;
  }
  function render(svg, pose, opt) {
    if (!svg) return;
    opt = opt || {};
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = VB.w, H = VB.h, G = VB.ground;
    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#0d1219', rx: 9 }));
    for (var i = 1; i <= 6; i++) {
      var x = 260 + i * 30; if (x > W - 8) continue;
      svg.appendChild(el('line', { x1: x, y1: G, x2: x, y2: G - 5, stroke: '#2b3542', 'stroke-width': 1 }));
      svg.appendChild(txt(x - 8, G + 15, (i * 2) + 'm', '#3d4a58', 9, true));
    }
    svg.appendChild(el('line', { x1: 14, y1: G, x2: W - 8, y2: G, stroke: '#3a4a5c', 'stroke-width': 2 }));
    for (var gx = 18; gx < W - 10; gx += 24) svg.appendChild(el('line', { x1: gx, y1: G + 1, x2: gx - 8, y2: G + 9, stroke: '#222c37', 'stroke-width': 1.3 }));
    if (opt.refAngle != null && opt.refAngle > -60 && pose && pose.ball) {
      var o = pose.ball, a0 = opt.refAngle * Math.PI / 180;
      svg.appendChild(el('line', { x1: o.x, y1: o.y, x2: o.x + Math.cos(a0) * 160, y2: o.y - Math.sin(a0) * 160, stroke: '#bc8cff', 'stroke-width': 1.4, 'stroke-dasharray': '5 4', opacity: .8 }));
      svg.appendChild(txt(o.x + 92, o.y - Math.sin(a0) * 92 - 7, opt.refAngle.toFixed(0) + '°', '#d7aaff', 11.5, true));
    }
    svg.appendChild(el('path', { d: 'M' + (W - 118) + ' 24 H ' + (W - 44) + ' M' + (W - 54) + ' 17 L' + (W - 42) + ' 24 L' + (W - 54) + ' 31', stroke: '#3fb950', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }));
    svg.appendChild(txt(W - 142, 28, '投掷方向', '#3fb950', 11));
    if (opt.trail && opt.trail.length > 1) {
      var dd = 'M' + opt.trail[0].x + ' ' + opt.trail[0].y;
      for (var k = 1; k < opt.trail.length; k++) dd += ' L' + opt.trail[k].x + ' ' + opt.trail[k].y;
      svg.appendChild(el('path', { d: dd, stroke: '#bc8cff', 'stroke-width': 1.6, 'stroke-dasharray': '4 4', fill: 'none', opacity: .8 }));
    }
    if (!pose || !pose.hip) { svg.appendChild(txt(20, 40, '未检测到完整姿态 —— 请侧身站立、全身入镜', '#6b7a8c', 12.5)); return; }
    var legC = opt.hl === 'leg' ? '#3fb950' : '#9fb3c8';
    var armC = opt.hl === 'arm' ? '#f85149' : '#9fb3c8';
    var trC = opt.hl === 'trunk' ? '#e3a008' : '#c6d5e4';
    function seg(a, b, w, c) { if (!a || !b) return; svg.appendChild(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: c, 'stroke-width': w, 'stroke-linecap': 'round' })); }
    seg(pose.ankle, pose.knee, 9, legC); seg(pose.knee, pose.hip, 9, legC);
    seg(pose.hip, pose.shoulder, 11, trC); seg(pose.shoulder, pose.head, 6, trC);
    if (pose.head) svg.appendChild(el('circle', { cx: pose.head.x, cy: pose.head.y, r: 15, fill: '#0d1219', stroke: '#dbe6f0', 'stroke-width': 3.4 }));
    seg(pose.shoulder, pose.elbow, 8, armC); seg(pose.elbow, pose.wrist, 8, armC);
    ['ankle', 'knee', 'hip', 'shoulder', 'elbow', 'wrist'].forEach(function (j) {
      var p = pose[j]; if (!p) return;
      svg.appendChild(el('circle', { cx: p.x, cy: p.y, r: 3.2, fill: '#0e1117', stroke: '#e6edf3', 'stroke-width': 1.5 }));
    });
    arc(pose.ankle, pose.knee, pose.hip, '#3fb950', '膝', 20);
    arc(pose.knee, pose.hip, pose.shoulder, '#e3a008', '髋', 20);
    arc(pose.shoulder, pose.elbow, pose.wrist, '#f85149', '肘', 17);
    function arc(a, b, c, color, label, r) {
      var v = U.angle(a, b, c); if (v == null) return;
      svg.appendChild(el('circle', { cx: b.x, cy: b.y, r: r, fill: 'none', stroke: color, 'stroke-width': 1.3, 'stroke-dasharray': '3 3', opacity: .8 }));
      svg.appendChild(txt(b.x + r + 3, b.y + 4, label + v.toFixed(0) + '°', color, 10.5, true));
    }
    if (pose.ball) {
      svg.appendChild(el('circle', { cx: pose.ball.x, cy: pose.ball.y, r: 13, fill: '#e3a008', stroke: '#7a5a06', 'stroke-width': 2 }));
      svg.appendChild(el('line', { x1: pose.ball.x - 12, y1: pose.ball.y, x2: pose.ball.x + 12, y2: pose.ball.y, stroke: '#7a5a06', 'stroke-width': 1.1 }));
    }
    if (opt.label) svg.appendChild(txt(18, H - 14, opt.label, '#8b949e', 12));
    if (opt.sub) svg.appendChild(txt(18, H - 32, opt.sub, '#5f6d7c', 11));
  }

  return { fk: fk, metrics: metrics, releaseInfo: releaseInfo, poseAt: poseAt, series: series,
    variantFrames: variantFrames, relTime: function (n) { return variantFrames(n).rel; },
    diagnose: diagnose, diagnoseWindow: diagnoseWindow,
    render: render, el: el, txt: txt, VB: VB, L: L };
})();

/* MediaPipe Pose 33 关键点 → 本引擎的 5 个角参数（浏览器端本地推理，画面不上传）
   ⚠ 两个必须处理的坐标系细节：
   1) MediaPipe 的 x 按宽归一、y 按高归一，直接算角度会被画面长宽比扭曲 → 先还原成像素坐标
   2) 前置摄像头是镜像画面 → 调用方先翻转 x；投掷方向由用户指定（dirX），不做臆测
   opts: { w, h, dirX: 1| -1, prev }  */
window.PEFromLandmarks = function (landmarks, opts) {
  var U = window.PEUtil;
  if (!landmarks || landmarks.length < 29) return null;
  opts = opts || {};
  var w = opts.w || 640, h = opts.h || 480, dirX = opts.dirX === -1 ? -1 : 1, prev = opts.prev || null;
  function mid(a, b) {
    return { x: ((landmarks[a].x + landmarks[b].x) / 2) * w, y: ((landmarks[a].y + landmarks[b].y) / 2) * h };
  }
  var hip = mid(23, 24), sh = mid(11, 12), knee = mid(25, 26), ank = mid(27, 28), elb = mid(13, 14), wr = mid(15, 16);
  if (Math.hypot(sh.x - hip.x, sh.y - hip.y) < h * 0.03) return null;   // 躯干过短＝识别不可靠
  function vec(a, b) { return { x: (b.x - a.x) * dirX, y: a.y - b.y }; }   // 转数学坐标（y 向上）并按投掷方向取号
  function angFromUp(v) { var m = Math.hypot(v.x, v.y); if (m < 1e-6) return null; return U.deg(Math.atan2(v.x, v.y)); }
  var aTrunk = angFromUp(vec(hip, sh)), aThigh = angFromUp(vec(knee, hip)), aShank = angFromUp(vec(ank, knee));
  var aArm = angFromUp(vec(sh, elb)), aFore = angFromUp(vec(elb, wr));
  if (aTrunk == null || aThigh == null || aShank == null || aArm == null || aFore == null) return null;
  var elbow = U.clamp(180 - U.norm(aFore - aArm), 40, 180);
  // 出手判定：手腕明显低于肘且在前下方 → 球已离手
  var released = (wr.y * 1) > (elb.y + h * 0.02) && (wr.x - elb.x) * dirX > 0;
  var q = { shank: U.norm(aShank), thigh: U.norm(aThigh), trunk: U.norm(aTrunk), arm: U.norm(aArm), elbow: elbow, hold: !released };
  if (prev) {
    var k = 0.4;   // 时序平滑，抑制关键点抖动
    ['shank', 'thigh', 'trunk', 'arm', 'elbow'].forEach(function (n) { q[n] = q[n] * (1 - k) + prev[n] * k; });
  }
  return q;
};
