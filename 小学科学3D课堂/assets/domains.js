(() => {
  const domains = {
    life: {
      label: "生命世界",
      icon: "♧",
      eyebrow: "LIFE SCIENCE · 生命科学",
      title: "生命世界的3D观察正在持续生长",
      intro: "当前已开放人体器官3D观察，并将在同一课堂框架中继续加入常见生物和细胞世界。",
      color: "#4d8c6b",
      topics: [
        ["人体的奥秘", "已开放", "9个器官模型与35个结构热点", "open"],
        ["常见生物", "已开放", "鲫鱼3D结构与水中生活", "open"],
        ["细胞世界", "待添加", "从细胞膜到细胞器的微观观察", "future"]
      ]
    },
    earth: {
      label: "地球宇宙",
      icon: "◎",
      eyebrow: "EARTH & SPACE · 地球与宇宙科学",
      title: "从脚下的大地，望向浩瀚宇宙",
      intro: "当前已开放地形地貌3D观察，并将在同一课堂框架中继续加入地球系统和天体运动。",
      color: "#4677a9",
      topics: [
        ["地形地貌", "已开放", "五种基本地形＋综合等高线地貌3D辨识", "open"],
        ["地球系统", "待添加", "地球内部结构、水循环与板块运动", "future"],
        ["天体运动", "待添加", "地月运动、太阳系与昼夜四季", "future"]
      ]
    },
    matter: {
      label: "物质世界",
      icon: "⌬",
      eyebrow: "MATTER & ENERGY · 物质与能量",
      title: "把看不见的微观世界变得可观察",
      intro: "领域框架已经搭好。后续可加入粒子模型和过程动画，让学生在三维空间中理解物质结构、运动和变化。",
      color: "#8a62a7",
      topics: [
        ["物质结构", "待添加", "常见材料与内部结构", "future"],
        ["分子运动", "待添加", "扩散、热运动与状态变化", "future"],
        ["力与运动", "待添加", "运动、力、简单机械与能量", "future"]
      ]
    }
  };

  const lifeClassroom = document.querySelector("#life-classroom");
  const earthClassroom = document.querySelector("#earth-classroom");
  const placeholder = document.querySelector("#domain-placeholder");
  const search = document.querySelector(".topbar .search");
  const scienceMap = { hidden: true };
  let currentDomain = "life";

  function renderPlaceholder(domain) {
    placeholder.style.setProperty("--domain", domain.color);
    placeholder.innerHTML = `
      <div class="placeholder-visual" aria-hidden="true">
        <span class="orbit orbit-one"></span><span class="orbit orbit-two"></span>
        <i>${domain.icon}</i>
      </div>
      <div class="placeholder-copy">
        <em>${domain.eyebrow}</em><h1>${domain.title}</h1><p>${domain.intro}</p>
        <div class="topic-grid">${domain.topics.map((topic, index) => `
          <article class="topic-card ${topic[3]}"><span>0${index + 1}</span><div><small>${topic[1]}</small><h2>${topic[0]}</h2><p>${topic[2]}</p></div></article>`).join("")}
        </div>
        <div class="framework-note"><b>统一的观察方式</b><span>选择模型</span><i>→</i><span>自由观察</span><i>→</i><span>结构标注</span><i>→</i><span>比较解释</span><i>→</i><span>探究测验</span></div>
      </div>`;
  }

  function selectDomain(id, options = {}) {
    const domain = domains[id] || domains.life;
    const isLife = id === "life", isEarth = id === "earth";
    currentDomain = id;
    document.body.dataset.domain = id;
    document.querySelectorAll("[data-domain]").forEach((button) => button.classList.toggle("active", button.dataset.domain === id));
    document.querySelectorAll(".compare-panel").forEach((panel) => panel.hidden = true);
    document.querySelector("#quiz-panel")?.setAttribute("hidden", "");
    document.querySelector("#library")?.classList.remove("open");
    document.querySelector("#earth-library")?.classList.remove("open");
    scienceMap.hidden = true;
    lifeClassroom.hidden = !isLife;
    earthClassroom.hidden = !isEarth;
    placeholder.hidden = isLife || isEarth;
    search.hidden = !isLife;
    if (isEarth) window.EarthUniverse?.activate(); else window.EarthUniverse?.deactivate();
    if (!isLife && !isEarth) renderPlaceholder(domain);
    const destination = isLife ? lifeClassroom : isEarth ? earthClassroom : placeholder;
    if (options.scroll !== false) destination.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-domain]");
    if (target) selectDomain(target.dataset.domain, { scroll: false });
  });
  document.querySelector("#brand")?.addEventListener("click", (event) => {
    event.stopImmediatePropagation();
    selectDomain("life", { scroll: false });
  }, true);
  document.querySelector("#mobile-library")?.addEventListener("click", () => {
    if (currentDomain === "earth") window.EarthUniverse?.openLibrary();
    else if (currentDomain === "life") document.querySelector("#library")?.classList.add("open");
  });
  selectDomain("life", { scroll: false });
})();
