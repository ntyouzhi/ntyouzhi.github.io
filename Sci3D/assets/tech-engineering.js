(() => {
  "use strict";
  const WORKS = [
    {
      title: "自行车结构探索",
      sub: "部件观察 · 系统演示 · 力与运动",
      icon: "车",
      src: "assets/tech/bike.html?embed=1",
      name: "自行车结构探索"
    }
  ];
  const library = document.getElementById("tech-library");
  const groups = document.getElementById("tech-groups");
  const frame = document.getElementById("tech-frame");
  const loading = document.getElementById("tech-panel-loading");
  let current = "";
  let active = false;
  let timer = null;

  function render() {
    if (groups.dataset.ready) return;
    groups.dataset.ready = "1";
    groups.innerHTML = `<section class="geo-group" aria-label="技术工程作品">
      <div class="geo-group-title"><span>技术工程</span><small>互动作品</small></div>
      <div class="geo-group-items">${WORKS.map((work) => `
        <button class="geo-entry" type="button" data-tech-src="${work.src}" data-tech-name="${work.name}">
          <i>${work.icon}</i><span><b>${work.title}</b><small>${work.sub}</small></span><s>›</s>
        </button>`).join("")}</div>
    </section>`;
    groups.addEventListener("click", (event) => {
      const button = event.target.closest(".geo-entry");
      if (button) open(button.dataset.techSrc, button);
    });
    document.getElementById("tech-close-library")?.addEventListener("click", () => library.classList.remove("open"));
  }

  function loadingState(on) {
    loading.classList.toggle("hide", !on);
    clearTimeout(timer);
    if (on) timer = setTimeout(() => loading.classList.add("hide"), 15000);
  }

  function highlight(button) {
    groups.querySelectorAll(".geo-entry").forEach((item) => item.classList.toggle("active", item === button));
  }

  function open(src, button) {
    render();
    if (src === current) {
      highlight(button);
      library.classList.remove("open");
      return;
    }
    current = src;
    loadingState(true);
    frame.onload = () => loadingState(false);
    frame.src = src;
    frame.title = button?.dataset.techName || "技术工程互动作品";
    highlight(button);
    library.classList.remove("open");
  }

  window.TechEngineering = {
    get active() { return active; },
    activate() {
      active = true;
      render();
      if (!frame.getAttribute("src")) {
        const first = groups.querySelector(".geo-entry");
        if (first) open(first.dataset.techSrc, first);
      }
    },
    deactivate() { active = false; },
    openLibrary() { render(); library.classList.add("open"); }
  };
})();
