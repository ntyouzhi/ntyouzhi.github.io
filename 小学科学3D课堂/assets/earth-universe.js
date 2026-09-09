(() => {
  "use strict";
  /* 地球宇宙 · 统一iframe观察库
     左侧主题分组列表常驻，右侧iframe加载独立3D网页(核心代码原样运行)，头部三领域导航永远呈现。 */
  const GROUPS = [
    {
      name: "地形地貌",
      items: [
        { src: "assets/geo/china-terrain.html", icon: "山", title: "中国地形", sub: "三级阶梯 · 立体地貌", name: "中国地形 · 立体地貌" },
        { src: "assets/geo/contour-lines.html", icon: "线", title: "等高线3D", sub: "山体形态判读", name: "等高线3D交互课件" }
      ]
    },
    {
      name: "四季的变化",
      items: [
        { src: "assets/geo/24-solar-terms.html", icon: "节", title: "24节气", sub: "公转位置与物候", name: "24节气 · 地球公转" },
        { src: "assets/geo/sun-declination.html", icon: "射", title: "直射点·晨昏线", sub: "四季与昼夜成因", name: "太阳直射点与晨昏线" }
      ]
    },
    {
      name: "天体运动",
      items: [
        { src: "assets/geo/solar-system.html", icon: "系", title: "太阳系", sub: "行星公转与轨道", name: "太阳系 · 行星轨道" },
        { src: "assets/geo/moon-phases.html", icon: "月", title: "月相", sub: "盈亏变化与成因", name: "月相可视化" }
      ]
    }
  ];

  const library = document.getElementById("earth-library");
  const groupsEl = document.getElementById("geo-groups");
  const frame = document.getElementById("geo-frame");
  const loading = document.getElementById("geo-panel-loading");
  let current = null;      // 当前课件 src，切走再回不重载
  let loadTimer = null;

  function render() {
    if (groupsEl.dataset.ready) return;
    groupsEl.dataset.ready = "1";
    groupsEl.innerHTML = GROUPS.map((group, gi) => `
      <section class="geo-group" data-group="${gi}">
        <div class="geo-group-title"><span>${group.name}</span><small>互动课件</small></div>
        <div class="geo-group-items">
          ${group.items.map((it, ii) => `
          <button class="geo-entry" type="button" data-group="${gi}" data-geo-src="${it.src}" data-geo-name="${it.name}">
            <i>${it.icon}</i><span><b>${it.title}</b><small>${it.sub}</small></span><s>›</s>
          </button>`).join("")}
        </div>
      </section>`).join("");
    groupsEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".geo-entry");
      if (btn) open(btn.dataset.geoSrc, btn);
    });
    document.getElementById("earth-close-library").addEventListener("click", () => library.classList.remove("open"));
  }

  function setLoading(on) {
    loading.classList.toggle("hide", !on);
    clearTimeout(loadTimer);
    if (on) loadTimer = setTimeout(() => loading.classList.add("hide"), 15000); // 兜底：本地文件加载超时不再转圈
  }

  function highlight(btn) {
    groupsEl.querySelectorAll(".geo-entry").forEach((b) => b.classList.toggle("active", b === btn));
  }

  function open(src, btn) {
    render();
    if (src === current) {           // 同一课件：只收起移动端抽屉，不重载
      highlight(btn);
      library.classList.remove("open");
      return;
    }
    current = src;
    setLoading(true);
    frame.onload = () => setLoading(false);
    frame.src = src;
    highlight(btn);
    library.classList.remove("open");
  }

  let active = false;      // 当前是否处于地球宇宙领域

  // 全屏课堂：地球宇宙内全屏显示独立课件(仅iframe全屏)；其余领域仍走app.js的页面全屏
  function toggleFullscreen() {
    if (document.fullscreenElement) { document.exitFullscreen?.().catch(() => {}); return; }
    const requestPageFullscreen = () => {
      document.documentElement.requestFullscreen?.().catch((err) => {
        console.warn("全屏被拒绝:", err && err.name);
      });
    };
    if (active && frame.getAttribute("src") && frame.requestFullscreen) {
      frame.requestFullscreen().then(
        () => {},
        requestPageFullscreen
      );
    } else {
      requestPageFullscreen();
    }
  }
  const fsBtn = document.querySelector(".topbar .classroom");
  if (fsBtn) fsBtn.addEventListener("click", (e) => {
    e.stopPropagation();   // 阻止app.js的页面级全屏委托，改由本模块接管
    toggleFullscreen();
  });

  window.EarthUniverse = {
    get active() { return active; },
    activate() {           // 切到地球宇宙：首次渲染并默认载入第一项
      active = true;
      render();
      if (!frame.getAttribute("src")) {
        const first = groupsEl.querySelector(".geo-entry");
        if (first) open(first.dataset.geoSrc, first);
      }
    },
    deactivate() { active = false; },   // 保留iframe内容，切回时不重载
    openLibrary() { render(); library.classList.add("open"); }
  };
})();