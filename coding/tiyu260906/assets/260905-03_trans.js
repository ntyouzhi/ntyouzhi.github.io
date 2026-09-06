/* Tab⑤：提示词弹药库（把课标自带数值的条文做成可一键复制的提示词片段） */
window.PETrans = (function () {
  function init() {
    var tb = document.querySelector('#ammo tbody'); if (!tb || !window.PEKB) return;
    tb.innerHTML = PEKB.ammo.map(function (a, i) {
      return '<tr><td class="dim" style="font-size:12px">' + a.at + '</td>' +
        '<td style="color:#cfe3ff">“' + a.quote + '”</td>' +
        '<td><div style="font-size:12.5px">' + a.ask + '</div>' +
        '<button class="btn sm" data-copy="' + i + '" style="margin-top:6px">复制这条提示词</button></td></tr>';
    }).join('');
    tb.querySelectorAll('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = PEKB.ammo[+b.dataset.copy];
        var txt = '【课标依据·' + a.at + '】\n“' + a.quote + '”\n\n【任务】\n' + a.ask.replace(/^配"(.*?)"用：/, '请完成' + a.at + '对应的' + '$1：') + '\n';
        put(txt, b);
      });
    });
  }
  function put(txt, btn) {
    var done = function () {
      var old = btn.textContent; btn.textContent = '✓ 已复制，去粘给 AI';
      setTimeout(function () { btn.textContent = old; }, 1800);
    };
    var fb = function () {
      var ta = document.createElement('textarea'); ta.value = txt;
      ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { btn.textContent = '请手动选中复制'; }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fb); else fb();
  }
  return { init: init };
})();
