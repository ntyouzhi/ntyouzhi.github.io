/* Tab③：AI 动作诊断（摄像头实时 / 离线示例双输入 → 共用同一确定性诊断引擎） */
window.PEDiag = (function () {
  var P = null, U = null;
  function deps() { P = window.PEPose; U = window.PEUtil; return P && U; }
  var svg, video, tl, stream = null, landmarker = null, raf = null, prevQ = null;
  var mode = 'demo', demoName = 'arm', frames = null;
  var lastTs = 0, fpsCnt = 0, fpsT = 0;
  var acc = { n: 0, ang: 0, minKnee: 999, maxLay: -999, extMax: 0, swing: 0, hipLead: null };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  };
  var NAMES = { good: '标准示范', arm: '只挥臂不蹬地', flat: '出手太平', sit: '后坐屈髋·无满弓', late: '出手过晚' };

  function init() {
    if (!deps()) return;
    svg = document.getElementById('dg-svg'); if (!svg) return;

    video = document.getElementById('dg-video'); tl = document.getElementById('dg-tl');
    document.getElementById('dg-cam').addEventListener('click', startCam);
    document.getElementById('dg-stop').addEventListener('click', function () { stopAll(); loadDemo(demoName); });
    document.querySelectorAll('[data-demo]').forEach(function (b) {
      b.addEventListener('click', function () { loadDemo(b.dataset.demo); });
    });
    tl.addEventListener('input', scrub);
    document.getElementById('dg-ask').addEventListener('click', ask);
    document.getElementById('dg-cfg').addEventListener('click', function () {
      var box = document.getElementById('cfgbox');
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('dg-save').addEventListener('click', function () {
      store.set('pe_ds_key', document.getElementById('dg-key').value.trim());
      store.set('pe_ds_model', document.getElementById('dg-model').value.trim() || 'deepseek-chat');
      state(store.get('pe_ds_key') ? 'DeepSeek 已就绪' : '本地模板');
      document.getElementById('cfgbox').style.display = 'none';
    });
    var k = store.get('pe_ds_key');
    if (k) { document.getElementById('dg-key').value = k; state('DeepSeek 已就绪'); }
    document.getElementById('dg-model').value = store.get('pe_ds_model') || 'deepseek-chat';
    renderPrompt(); renderKB(); loadDemo('arm');
  }
  function state(s) { document.getElementById('dg-askstate').textContent = s; }

  /* ---------- 离线示例 ---------- */
  function loadDemo(name) {
    stopCam(); mode = 'demo'; demoName = name;
    frames = P.series(name, 61);
    document.getElementById('dg-state').textContent = '姿态源：离线示例 · ' + NAMES[name];
    document.getElementById('dg-badge').textContent = '示例姿态 · ' + NAMES[name];
    document.getElementById('dg-fps').textContent = '本机计算 · 无网络请求';
    video.style.display = 'none'; svg.style.display = 'block';
    tl.value = Math.round(P.relTime(name) * 1000); scrub();
    report(P.diagnose(name));
  }
  function scrub() {
    if (mode !== 'demo' || !frames) return;
    var i = Math.round(tl.value / 1000 * (frames.length - 1));
    var pose = frames[i], m = P.metrics(pose), ri = P.releaseInfo(pose);
    P.render(svg, pose, { hl: m.sep > 8 ? 'trunk' : null, refAngle: ri.angle,
      label: NAMES[demoName] + ' · 进度 ' + (i / 60 * 100).toFixed(0) + '%',
      sub: 't = ' + (i / 60).toFixed(2) + ' s（该动作出手在 t ≈ ' + P.relTime(demoName).toFixed(2) + '）' });
    document.getElementById('dg-ts').textContent = (i / 60).toFixed(2) + ' s';
    fillMetrics(m, ri);
  }
  function fillMetrics(m, ri) {
    document.querySelector('#dg-metrics tbody').innerHTML =
      row('膝关节角（当前帧）', m.knee, '屈—伸幅度＝蹬地发力空间') +
      row('髋关节角', m.hip, '是否形成"满弓"') +
      row('肘关节角', m.elbow, '末端是否充分伸展') +
      row('躯干后仰（正）／前倾（负）', m.trunk == null ? null : -m.trunk, '满弓帧应为正值') +
      rowPx('髋领先肩', m.sep, '＞8px 即"超越器械"') +
      row('出手仰角（当前帧）', ri.angle, '理想 30°～42°');
  }
  function row(label, v, hint) {
    return '<tr><td>' + label + '</td><td style="font-family:var(--mono);color:#fff;font-size:14px">' + U.fmt(v, 0) + '°</td><td class="dim" style="font-size:11.5px">' + hint + '</td></tr>';
  }
  function rowPx(label, v, hint) {
    return '<tr><td>' + label + '</td><td style="font-family:var(--mono);color:#fff;font-size:14px">' + U.fmt(v, 0) + ' px</td><td class="dim" style="font-size:11.5px">' + hint + '</td></tr>';
  }
  // 实时模式下画面里没有人时必须清空指标，否则老师会误读成"当前学生的数据"
  var MLBL = [['膝关节角（当前帧）', '屈—伸幅度＝蹬地发力空间'], ['髋关节角', '是否形成"满弓"'],
    ['肘关节角', '末端是否充分伸展'], ['躯干后仰（正）／前倾（负）', '满弓帧应为正值'],
    ['髋领先肩', '＞8px 即"超越器械"'], ['出手仰角（当前帧）', '理想 30°～42°']];
  function clearMetrics(reason) {
    var b = document.querySelector('#dg-metrics tbody'); if (!b) return;
    b.innerHTML = MLBL.map(function (l, i) {
      return '<tr><td>' + l[0] + '</td><td style="font-family:var(--mono);color:#6b7a8c;font-size:13px">' +
        (i ? '—' : (reason || '—')) + '</td><td class="dim" style="font-size:11.5px">' + l[1] + '</td></tr>';
    }).join('');
  }


  /* ---------- 摄像头 ---------- */
  function startCam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      failCam('当前环境不允许访问摄像头（浏览器在 file:// 或非 https 下会拦截）。'); return;
    }
    state('加载姿态模型…'); setFps('正在从 CDN 下载 MediaPipe 姿态模型（约 9 MB，需联网）…');
    loadMP().then(function (LM) {
      landmarker = LM;
      return navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 960 }, facingMode: 'user' }, audio: false });
    }).then(function (s) {
      stream = s; video.srcObject = s;
      video.style.display = 'block'; svg.style.display = 'block';
      return video.play();
    }).then(function () {
      mode = 'cam'; resetAcc(); prevQ = null;
      warn('');
      document.getElementById('dg-state').textContent = '姿态源：摄像头 · 本机推理';
      document.getElementById('dg-badge').textContent = '实时识别 · 画面不出本机';
      state('摄像头已开启'); loop();
    }).catch(function (e) {
      failCam('摄像头或模型未能启动：' + (e && e.message ? e.message : e) + '。');
    });
  }
  function warn(msg) {
    var w = document.getElementById('dg-warn'); if (!w) return;
    if (!msg) { w.style.display = 'none'; w.innerHTML = ''; return; }
    w.style.display = 'block'; w.innerHTML = msg;
  }
  function failCam(msg) {
    setFps('已回退示例'); mode = 'demo';
    document.getElementById('dg-state').textContent = '姿态源：离线示例（摄像头未启用）';
    document.getElementById('dg-badge').textContent = '示例姿态 · ' + NAMES[demoName];
    // 失败原因写在专用告警位，不会被后续 report() 覆盖，用户能看到到底卡在哪一步
    warn('<b>⚠ 摄像头实时识别未能启动：</b>' + msg +
      '<br>已自动回到离线示例，<b>演示可照常继续</b>（诊断逻辑与实时模式是同一套引擎）。' +
      '<br><span class="dim">现场排查顺序：① 页面地址必须是 http:// 或 https://（双击 file:// 打开时浏览器会禁止摄像头）；' +
      '② 用 Chrome / Edge，并在地址栏右侧把"摄像头"设为允许；' +
      '③ 首次需联网下载约 9 MB 姿态模型，校园网受限时请提前在有网环境打开过一次，或直接用离线示例。</span>');
    if (video) video.style.display = 'none';
    if (svg) svg.style.display = 'block';
    state('本地模板'); scrub();
  }
  function setFps(s) { document.getElementById('dg-fps').textContent = s; }
  function resetAcc() { acc = { n: 0, ang: 0, minKnee: 999, maxLay: -999, extMax: 0, swing: 0, hipLead: null }; }

  var mpPromise = null;
  var MP_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  var MP_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
  // MediaPipe 的 wasm loader 是 UMD 脚本（无 ESM 导出），若由库内部用 import() 加载，
  // 拿不到 default 也不会挂到全局 → 报 "ModuleFactory not set."。
  // 解决办法：先用 classic <script> 把它注入全局，再把显式路径交给 PoseLandmarker。
  function injectScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('无法加载 ' + src.split('/').pop())); };
      document.head.appendChild(s);
    });
  }
  function loadMP() {
    if (mpPromise) return mpPromise;
    mpPromise = new Promise(function (resolve, reject) {
      var to = setTimeout(function () { reject(new Error('模型加载超时（30 秒），请检查网络后重试')); }, 30000);
      var done = function (fn) { clearTimeout(to); fn(); };
      Promise.all([import(MP_CDN + '/vision_bundle.mjs'),
      injectScript(MP_CDN + '/wasm/vision_wasm_internal.js')])
        .then(function (res) {
          var m = res[0];
          var files = { wasmLoaderPath: MP_CDN + '/wasm/vision_wasm_internal.js', wasmBinaryPath: MP_CDN + '/wasm/vision_wasm_internal.wasm' };
          var opt = function (delegate) {
            return { baseOptions: { modelAssetPath: MP_MODEL, delegate: delegate }, runningMode: 'VIDEO', numPoses: 1 };
          };
          // GPU 优先，失败自动退回 CPU（部分机房核显/远程桌面不支持 WebGL 计算）
          return m.PoseLandmarker.createFromOptions(files, opt('GPU'))
            .catch(function () { return m.PoseLandmarker.createFromOptions(files, opt('CPU')); });
        })
        .then(function (lm) { done(function () { resolve(lm); }); })
        .catch(function (e) { done(function () { mpPromise = null; reject(e); }); });
    });
    return mpPromise;
  }
  function loop() {
    if (mode !== 'cam') return;
    raf = requestAnimationFrame(loop);
    if (!landmarker || video.readyState < 2) return;
    var now = performance.now();
    if (now === lastTs) return;
    var res;
    try { res = landmarker.detectForVideo(video, now); } catch (e) { return; }
    lastTs = now; fpsCnt++;
    if (now - fpsT > 900) { setFps('实时 ' + (fpsCnt * 1000 / (now - fpsT)).toFixed(0) + ' FPS · 本机 GPU/CPU 推理'); fpsCnt = 0; fpsT = now; }
    var lms = res && res.landmarks && res.landmarks[0];
    if (!lms) { P.render(svg, null, {}); clearMetrics('未检测到人'); return; }
    var dirX = (document.getElementById('dg-dir') || {}).value === '-1' ? -1 : 1;
    var q = window.PEFromLandmarks(flip(lms), { w: video.videoWidth || 640, h: video.videoHeight || 480, dirX: dirX, prev: prevQ });
    if (!q) { clearMetrics('姿态不完整（请退后一点，让全身入镜）'); return; }
    prevQ = q;
    var pose = P.fk(q), m = P.metrics(pose), ri = P.releaseInfo(pose);
    P.render(svg, align(pose), { hl: 'arm', refAngle: ri.angle,
      label: '摄像头实时 · MediaPipe Pose 33 关键点 → 本机几何计算（画面不上传）',
      sub: '要点：侧身 45°～90°、全身入镜、光线均匀、离镜头 2～3 米；若人体朝向与设定相反请切换"投掷方向"' });
    fillMetrics(m, ri);
    accumulate(q, m, ri, pose);
  }
  function flip(lms) { return lms.map(function (p) { return { x: 1 - p.x, y: p.y, z: p.z, visibility: p.visibility }; }); }
  function align(pose) {
    if (pose.ankle) {
      var dy = P.VB.ground - pose.ankle.y;
      ['ankle', 'knee', 'hip', 'shoulder', 'head', 'elbow', 'wrist', 'ball'].forEach(function (k) { if (pose[k]) pose[k].y += dy; });
    }
    return pose;
  }
  // 一次动作周期采集：跟踪"引球 → 挥臂出手"，采满即出诊断
  function accumulate(q, m, ri, pose) {
    if (-m.trunk > 6) acc.swing = 1;                 // 已进入引球/后仰阶段
    if (acc.swing && q.arm > 20) {                   // 上臂摆到前上方＝出手阶段
      acc.n++; acc.ang += ri.angle;
      acc.minKnee = Math.min(acc.minKnee, m.knee);
      acc.maxLay = Math.max(acc.maxLay, -m.trunk);
      acc.extMax = Math.max(acc.extMax, m.elbow);
      acc.hipLead = pose.hip && pose.knee ? Math.min(acc.hipLead == null ? 999 : acc.hipLead, pose.hip.x - pose.knee.x) : acc.hipLead;
      if (acc.n > 20) {
        report(P.diagnoseWindow(acc));
        document.getElementById('dg-badge').textContent = '已完成一次动作识别 · 结论见右侧';
        resetAcc();
      }
    }
  }


  /* ---------- 报告 ---------- */
  function report(d) {
    var sc = document.getElementById('dg-score');
    sc.textContent = d.score + ' 分';
    sc.className = 'pill ' + (d.score >= 85 ? 'ok' : d.score >= 65 ? 'warn' : 'bad');
    document.getElementById('dg-verdict').innerHTML = d.issues.map(function (i) {
      var c = i.lv === 'ok' ? '#7ee2a1' : i.lv === 'warn' ? '#f0c674' : '#ff9a92';
      return '<div style="border-left:3px solid ' + c + ';padding:6px 10px;margin:8px 0;background:#0f151c;border-radius:0 8px 8px 0">' +
        '<b style="color:' + c + '">' + (i.lv === 'ok' ? '✓ ' : i.lv === 'warn' ? '! ' : '✗ ') + i.t + '</b>' +
        '<div class="dim" style="font-size:12.5px">' + i.d + '</div>' +
        '<div style="font-size:12.5px;margin-top:4px">▶ 改进：' + i.fix + '</div></div>';
    }).join('');
    var g = document.getElementById('dg-seq');
    while (g.firstChild) g.removeChild(g.firstChild);
    g.appendChild(P.el('rect', { x: 0, y: 0, width: 440, height: 104, fill: '#0d1219', rx: 8 }));
    if (d.seq && d.seq.length) {
      g.appendChild(P.txt(10, 15, '各关节峰值角速度时刻（0 → 出手）', '#6b7a8c', 10));
      d.seq.forEach(function (s, i) {
        var y = 36 + i * 24;
        g.appendChild(P.el('line', { x1: 104, y1: y - 4, x2: 430, y2: y - 4, stroke: '#222c37', 'stroke-width': 1 }));
        g.appendChild(P.txt(10, y, s.k, s.c, 10.5));
        var x = 104 + U.clamp(s.t, 0, 1) * 320;
        g.appendChild(P.el('circle', { cx: x, cy: y - 4, r: 5.5, fill: s.c }));
        g.appendChild(P.txt(x + 8, y, s.t.toFixed(2), s.c, 10, true));
      });
      document.getElementById('dg-seqtxt').innerHTML = '<span style="color:' + (d.seqOK ? '#7ee2a1' : '#ff9a92') + '">' +
        (d.seqOK ? '✓ 顺序正确：下肢 → 躯干 → 上肢，鞭打传递成立' : '✗ 顺序异常：上肢先于下肢达到峰值，能量传递被切断') + '</span>' +
        (d.gaps ? ' · 蹬地→收腹间隔 ' + d.gaps.legTrunk + '，收腹→挥臂间隔 ' + d.gaps.trunkArm : '');
    } else {
      g.appendChild(P.txt(12, 56, '摄像头模式：发力顺序需完整一周期动作后给出（当前为出手参数诊断）', '#6b7a8c', 11));
      document.getElementById('dg-seqtxt').innerHTML = '实时模式仅采集出手参数；若要分析时序，请放慢动作或改用录像回放。';
    }
    window.__lastDiag = d;
    document.getElementById('dg-reply').innerHTML = '<span class="dim">已生成结构化诊断（' + d.issues.length + ' 条结论，全部来自本地几何计算）。点"让 AI 生成指导语"，看它如何把角度变成学生听得懂的一句话。</span>';
  }

  /* ---------- AI 语言层 ---------- */
  var SYS = '你是中小学体育教师的助手。下面是一次"掷实心球"动作的姿态计算结果，数值由本地几何算法得出，真实可靠。\n\n' +
    '【硬性约束】\n' +
    '1. 不得新增、修改或推测任何角度数值；只能引用我给出的指标与结论。\n' +
    '2. 不得自行判断"安全/可以上强度"等涉及人身安全的结论——这类判断只属于教师。\n' +
    '3. 先肯定做对的部分，再指出最优先的 1 个改进点（最多 2 个），并给 1 个可立即执行的练习方法。\n' +
    '4. 用第二人称，不超过 90 字，口语化；禁用"您表现优异"式空话与"综上所述"等书面套语。\n' +
    '5. 结尾一句引用我给定的课标依据原文，不得改写其含义。\n' +
    '【输出】一段可直接念给学生听的指导语，不要输出标题或多余解释。';
  function renderPrompt() {
    document.getElementById('dg-prompt').value = SYS + '\n\n【输入数据字段】\nscore 综合评分 / release_angle 出手仰角 / knee_min 全程最小膝角 / layback_max 最大躯干后仰 / elbow_max 最大肘角 / seq_ok 发力顺序是否正确 / issues 算法结论列表 / kb 课标依据原文\n';
  }
  function ask() {
    var d = window.__lastDiag; if (!d) return;
    var payload = JSON.stringify({
      score: d.score, release_angle: +(d.release.angle || 0).toFixed(1),
      knee_min: +(d.kneeFlex || 0).toFixed(0), layback_max: +(d.layback || 0).toFixed(0),
      elbow_max: +(d.extMax || d.release.elbowExt || 0).toFixed(0), seq_ok: !!d.seqOK,
      issues: d.issues.map(function (i) { return i.lv + ' | ' + i.t + ' | 建议：' + i.fix; }),
      kb: '课标依据：投掷需掌握"蹬地—满弓—挥臂—拨指"的完整动作技术，表现出全身协调用力的运动能力。'
    });
    var key = store.get('pe_ds_key');
    if (!key) { localReply(d); state('本地模板'); return; }
    state('请求中…');
    document.getElementById('dg-reply').innerHTML = '<span class="dim">正在调用 DeepSeek…</span>';
    fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({ model: store.get('pe_ds_model') || 'deepseek-chat', temperature: 0.7, max_tokens: 300,
        messages: [{ role: 'system', content: SYS }, { role: 'user', content: payload }] })
    }).then(function (r) { return r.json(); }).then(function (j) {
      var txt = j && j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : null;
      if (!txt) throw new Error((j && j.error && j.error.message) || '返回为空');
      state('DeepSeek 返回');
      document.getElementById('dg-reply').innerHTML =
        '<div style="background:#0f151c;border:1px solid #2a5734;border-radius:9px;padding:12px">' +
        '<div style="color:#7ee2a1;font-size:12px;margin-bottom:6px">🤖 AI 给学生的话（语言模型生成）</div>' + txt.replace(/\n/g, '<br>') + '</div>' +
        '<div class="dim" style="font-size:11.5px;margin-top:8px">送给模型的只有算法算出的数字与结论 —— 它无从编造技术判断，只负责"怎么说"。</div>';
    }).catch(function (e) {
      state('调用失败 · 已兜底');
      document.getElementById('dg-reply').innerHTML = '<span style="color:#f85149">接口调用失败：' + e.message + '</span><br><span class="dim">已用本地模板兜底：</span>';
      localReply(d, true);
    });
  }
  function localReply(d, append) {
    var first = d.issues[0], good = [];
    if ((d.kneeFlex || 999) <= 160) good.push('屈膝蹬地');
    if ((d.layback || 0) >= 8) good.push('引球成满弓');
    var ra = d.release.angle;
    if (ra != null && ra >= 26 && ra <= 47) good.push('出手角度');
    if (d.seqOK) good.push('发力顺序');
    var open = good.length ? '做得好的是' + good.join('、') + '。' : '这个动作整体还比较生疏，';
    var tip = first.lv === 'ok' ? '现在可以带着这个感觉去比赛，比谁掷得又远又稳。' : '先只改这一件事：' + first.fix;
    var html = '<div style="background:#0f151c;border:1px solid #2f4c3a;border-radius:9px;padding:12px;margin-top:' + (append ? '8px' : '0') + '">' +
      '<div style="color:#7ee2a1;font-size:12px;margin-bottom:6px">🤖 指导语（本地模板生成 · 离线可用）</div>' + open + tip +
      '<div class="dim" style="margin-top:6px;font-size:12px">课标依据：投掷需掌握"蹬地—满弓—挥臂—拨指"的完整动作技术，表现出全身协调用力的运动能力。</div></div>';
    if (append) document.getElementById('dg-reply').innerHTML += html; else document.getElementById('dg-reply').innerHTML = html;
  }

  function renderKB() {
    var box = document.getElementById('dg-kb'); if (!box || !window.PEKB) return;
    box.innerHTML = '<span class="tag">本页课标依据</span>' +
      PEKB.motion.map(function (k) { return '<b>' + k.title + '：</b>"' + k.text + '"'; }).join('<br>') +
      '<br><b>' + PEKB.load[2].title + '：</b>"' + PEKB.load[2].text + '"（' + PEKB.load[2].from + '）';
  }
  function stopCam() {
    if (raf) cancelAnimationFrame(raf); raf = null;
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    mode = 'demo';
    if (video) { video.pause(); video.style.display = 'none'; }
    if (svg) svg.style.display = 'block';
  }
  return { init: init };
})();
