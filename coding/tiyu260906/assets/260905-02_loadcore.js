/* ========================================================================
 * PELoadCore · 运动负荷计算内核（纯函数，UI 与自测共用同一份代码）
 * 依据课标：群体密度≥75% · 个体密度≥50% · 平均心率140~160 · 体能≥10分钟
 * ====================================================================== */
window.PELoadCore = (function () {
  var R = { groupDensity: 75, indivDensity: 50, hrLow: 140, hrHigh: 160, fitnessMin: 10 };
  var INT = {
    rest: { l: '静止/讲解', hr: 88, c: '#4d5a68' },
    low: { l: '低（组织调动、示范观察）', hr: 105, c: '#5d6b7a' },
    mid: { l: '中（技能学练、轮流练习）', hr: 128, c: '#2f7d4f' },
    high: { l: '高（游戏/比赛/体能）', hr: 152, c: '#b5851a' },
    peak: { l: '极高（冲刺、间歇跑）', hr: 172, c: '#a83232' }
  };
  var TYPES = Object.keys(INT);
  // 个体在场练习比：一人做、众人看的项目实际只有少数人在动
  function indivRatio(r) {
    if (r.t === 'rest') return 0;
    if (/轮流|组测试|等待|观摩|排队/.test(r.n)) return 0.35;
    return 0.9;
  }
  function sum(rows, f) { return rows.reduce(function (s, r) { return s + f(r); }, 0); }
  function hrCurve(rows) {
    var out = [], base = 82;
    rows.forEach(function (r) {
      var target = INT[r.t].hr, steps = Math.max(1, Math.round(r.d));
      for (var i = 0; i < steps; i++) {
        base += (target - base) * 0.34 + (i ? Math.sin(i * 1.7) * 1.1 : 0);
        out.push({ hr: Math.round(base), n: r.n, t: r.t, i: i });
      }
    });
    return out;
  }
  function calc(rows) {
    var total = sum(rows, function (r) { return r.d; });
    if (!total) return { total: 0, group: 0, indiv: 0, fit: 0, avg: 0, inZone: 0, hr: [], talk: 0, active: 0 };
    var active = sum(rows, function (r) { return r.a; });
    var group = active / total * 100;
    var indiv = sum(rows, function (r) { return r.a * indivRatio(r); }) / total * 100;
    var fit = sum(rows.filter(function (r) { return /体能/.test(r.n); }), function (r) { return r.d; });

    var talk = sum(rows.filter(function (r) { return r.t === 'rest' || r.t === 'low'; }), function (r) { return r.d; });
    var hr = hrCurve(rows);
    var avg = Math.round(sum(hr, function (p) { return p.hr; }) / hr.length);
    var inZone = hr.filter(function (p) { return p.hr >= R.hrLow && p.hr <= R.hrHigh; }).length / hr.length * 100;
    return { total: total, active: active, group: group, indiv: indiv, fit: fit, avg: avg, inZone: inZone, hr: hr, talk: talk };
  }
  function pass(c) {
    return {
      group: c.group >= R.groupDensity, indiv: c.indiv >= R.indivDensity,
      hr: c.avg >= R.hrLow && c.avg <= R.hrHigh, hrHighOver: c.avg > R.hrHigh, fit: c.fit >= R.fitnessMin
    };
  }

  /* ---------- 自动重排：规则驱动 + 收敛补足，保证四项红线达标 ---------- */
  function fix(rows, targetTotal) {
    targetTotal = targetTotal || 40;
    var r = rows.map(function (x) { return { n: x.n, d: x.d, a: x.a, t: x.t }; });
    // ① 长时段静立讲解 → 拆成微提示 + 四组齐做
    r.forEach(function (x) {
      if (x.t === 'rest' && x.d >= 6) { x.n = '〔改〕' + x.n + ' → 1 分钟微提示 + 四组齐做徒手模仿'; x.d = 4; x.a = 3; x.t = 'mid'; }
      // ② 排队等待型环节 → 压缩到 2 分钟
      else if (x.t === 'rest' && /集合|整队|常规|小结|放松/.test(x.n) && x.d > 2) { x.n = '〔改〕' + x.n + '（压缩，边整队边做队列操练）'; x.d = 2; x.a = 1; x.t = 'low'; }
      // ③ "一人做众人看" → 多站循环，全员同练
      else if (/轮流|组测试|等待|排队|观摩/.test(x.n) && x.a / Math.max(1, x.d) < 0.4) { x.n = '〔改〕多站循环同时练（每人一球/沙包，取消轮候）'; x.a = Math.round(x.d * 0.9); x.t = 'high'; }
    });
    // ④ 缺体能练习 → 插入与主教材结合的整合性体能（补足到课标要求的 10 分钟）
    var need = R.fitnessMin - calc(r).fit;
    if (need > 0) r.splice(r.length - 1, 0, { n: '〔新增〕整合性体能练习：burpee + 仰卧传抛球（结合主教材）', d: need, a: need, t: 'peak' });
    // ⑤ 缺比赛 → 插入常赛环节（学、练、赛一体化）
    if (!/赛|对抗/.test(r.map(function (x) { return x.n; }).join(''))) r.splice(r.length - 1, 0, { n: '〔新增〕"阵地争夺"掷准小组赛（常赛）', d: 7, a: 7, t: 'high' });
    // ⑥ 超时长 → 从最长环节扣减（体能与比赛环节受保护，符合课标"每节课都应有针对性地安排体能练习"）
    var over = calc(r).total - targetTotal;
    while (over > 0) {
      var mx = r.filter(function (x) { return x.d > 2 && !/体能/.test(x.n); }).sort(function (a, b) { return b.d - a.d; })[0] ||
        r.filter(function (x) { return x.d > 2; }).sort(function (a, b) { return b.d - a.d; })[0];
      if (!mx) break; mx.d -= 1; mx.a = Math.min(mx.a, mx.d); over -= 1;
    }

    // ⑦ 收敛补足：密度仍不足 → 把中/高强度环节的等待时间转成同步练习
    var guard = 0;
    while (calc(r).group < R.groupDensity && guard++ < 60) {
      var cand = r.filter(function (x) { return x.t !== 'rest' && x.d - x.a >= 1; }).sort(function (a, b) { return (b.d - b.a) - (a.d - a.a); })[0];
      if (!cand) {
        var s = r.filter(function (x) { return x.t === 'rest' && x.d > 1; }).sort(function (a, b) { return b.d - a.d; })[0];
        if (!s) break; s.d -= 1; s.a = Math.min(s.a, s.d); r.reduce(function (acc, x) { if (x.t !== 'rest' && x.d > x.a) x.a += 1; return 0; }, 0);
        continue;
      }
      cand.a += 1;
      if (/轮流/.test(cand.n) === false && !/循环/.test(cand.n)) cand.n = cand.n.indexOf('〔改〕') === 0 ? cand.n : '〔改〕' + cand.n + '（改为一二组同时练）';
    }
    // ⑧ 收敛补足：平均心率偏低 → 提升部分环节的强度档位
    guard = 0;
    while (calc(r).avg < R.hrLow && guard++ < 40) {
      var up = r.filter(function (x) { return x.t === 'mid'; }).sort(function (a, b) { return b.d - a.d; })[0] ||
        r.filter(function (x) { return x.t === 'low'; }).sort(function (a, b) { return b.d - a.d; })[0];
      if (!up) break;
      up.t = up.t === 'mid' ? 'high' : 'mid';
      up.n = up.n.indexOf('〔改〕') === 0 ? up.n : '〔改〕' + up.n + '（叠加移动与限时，提升强度）';
      if (calc(r).group < R.groupDensity) up.a = Math.min(up.d, up.a + 1);
    }
    // ⑨ 心率过高 → 加回恢复段
    guard = 0;
    while (calc(r).avg > R.hrHigh && guard++ < 20) {
      var dn = r.filter(function (x) { return x.t === 'peak'; })[0] || r.filter(function (x) { return x.t === 'high'; })[0];
      if (!dn) break; dn.t = dn.t === 'peak' ? 'high' : 'mid';
    }
    return r;
  }

  /* ---------- 自动评课文案 ---------- */
  function verdict(c) {
    var iss = [], p = pass(c), loses = c.rows ? null : null;
    iss.push((p.group ? '✓ ' : '✗ ') + '群体运动密度 ' + c.group.toFixed(0) + '%（课标 ≥75%）' + (p.group ? '' : '，缺口 ' + (75 - c.group).toFixed(0) + ' 个百分点'));
    iss.push((p.indiv ? '✓ ' : '✗ ') + '个体运动密度 ' + c.indiv.toFixed(0) + '%（课标 ≥50%）' + (p.indiv ? '' : '，主因是"一人练、众人看"的轮流组织形式'));
    iss.push((p.hr ? '✓ ' : '✗ ') + '平均心率 ' + c.avg + ' 次/分（课标 140～160）' + (p.hr ? '' : (p.hrHighOver ? '，强度过高，需检查间歇与恢复' : '，未达中高运动强度——典型的"不出汗的体育课"')));
    iss.push((p.fit ? '✓ ' : '✗ ') + '体能练习 ' + c.fit + ' 分钟（课标每节课 10 分钟左右）');
    if (c.talk / c.total > 0.35) iss.push('✗ 讲解、示范、队形调动等静立时间合计 ' + c.talk + ' 分钟（占 ' + (c.talk / c.total * 100).toFixed(0) + '%），超过课堂三分之一');
    return iss;
  }
  /* ---------- 三节预设课（示例数据，UI 与自测共用同一份） ---------- */
  var PLAN = {};
  // 一节典型的"不出汗的体育课"
  PLAN.bad = [
    { n: '课堂常规、集合整队、点名宣布内容', d: 4, a: 0, t: 'rest' },
    { n: '慢跑热身 + 静态拉伸', d: 6, a: 4, t: 'low' },
    { n: '教师讲解示范掷实心球动作（全班围看）', d: 9, a: 0, t: 'rest' },
    { n: '分组轮流掷球（8 人 1 球，排队等待）', d: 12, a: 3, t: 'mid' },
    { n: '纠正动作：集中停队再讲、个别示范', d: 6, a: 0, t: 'rest' },
    { n: '放松整队、小结、下课', d: 3, a: 0, t: 'rest' }
  ];
  // 测试课
  PLAN.exam = [
    { n: '集合、讲测试规则与安全要求', d: 6, a: 0, t: 'rest' },
    { n: '准备活动', d: 6, a: 5, t: 'low' },
    { n: '第 1 组轮流测试（其余组观摩等待）', d: 10, a: 2, t: 'mid' },
    { n: '第 2 组轮流测试（其余组观摩等待）', d: 10, a: 2, t: 'mid' },
    { n: '登记录入、补测', d: 6, a: 0, t: 'rest' },
    { n: '小结', d: 2, a: 0, t: 'rest' }
  ];
  // 达标课
  PLAN.good = [
    { n: '情境导入 + 队列操练（"投弹手就位"）', d: 2, a: 1, t: 'low' },
    { n: '动态热身：抛接球游戏 + 关节激活', d: 5, a: 5, t: 'mid' },
    { n: '四组齐做徒手模仿"蹬—弓—挥—拨"', d: 4, a: 4, t: 'mid' },
    { n: '4 站循环学练：过绳/掷远/掷准/互评（全员同练）', d: 9, a: 8, t: 'high' },
    { n: '"阵地争夺"掷准小组赛（常赛）', d: 7, a: 7, t: 'high' },
    { n: '整合性体能练习：burpee + 仰卧传抛球', d: 10, a: 10, t: 'peak' },
    { n: '拉伸放松 + 学生互评 + 小结', d: 3, a: 2, t: 'low' }
  ];
  return { R: R, INT: INT, TYPES: TYPES, PLAN: PLAN, indivRatio: indivRatio, calc: calc, pass: pass, fix: fix, verdict: verdict, hrCurve: hrCurve };

})();
