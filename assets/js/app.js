// ============================================================
// 应用外壳：侧边导航 + 路由
// ============================================================
(function () {
  const NAV = [
    { key: 'home', label: '首页', icon: '🏠', hint: '日历仪表盘' },
    { key: 'laifang', label: '来访辅导', icon: '💬' },
    { key: 'waichu', label: '外出学习记录', icon: '🚀' },
    { key: 'pinxuan', label: '品宣工作', icon: '📣' },
    {
      label: '团员工作', icon: '🧑‍🤝‍🧑', children: [
        { key: 'tuanyuan-zhuanjie', label: '团员转接' },
        { key: 'tuanyuan-huodong', label: '团员活动记录' }
      ]
    },
    {
      label: '学生会', icon: '🎓', children: [
        { key: 'xsh-mingdan', label: '成员名单' }
      ]
    },
    { key: 'xinli', label: '校园心理文件', icon: '💗' }
  ];

  const ROUTES = {
    'home': function (c) { window.Calendar.render(c); },
    'laifang': function (c) { window.LaiFang.render(c); },
    'waichu': function (c) { window.RecordList.render(c, window.MODULE_CONFIGS.waichu); },
    'pinxuan': function (c) { window.Pinxuan.render(c); },
    'tuanyuan-zhuanjie': function (c) { window.FileLibrary.render(c, window.MODULE_CONFIGS.zhuanjie); },
    'tuanyuan-huodong': function (c) { window.RecordList.render(c, window.MODULE_CONFIGS.huodong); },
    'xsh-mingdan': function (c) { window.RecordList.render(c, window.MODULE_CONFIGS.mingdan); },
    'xinli': function (c) { window.XinLi.render(c); }
  };

  const TITLES = {
    'home': '日历仪表盘', 'laifang': '来访辅导', 'waichu': '外出学习记录', 'pinxuan': '品宣工作',
    'tuanyuan-zhuanjie': '团员工作 · 团员转接', 'tuanyuan-huodong': '团员工作 · 团员活动记录',
    'xsh-mingdan': '学生会 · 成员名单', 'xinli': '校园心理文件'
  };

  let current = 'home';

  function renderNav() {
    const nav = document.getElementById('nav');
    nav.innerHTML = '';
    NAV.forEach(function (item) { nav.appendChild(buildNode(item, 0)); });
  }

  function buildNode(item, depth) {
    if (item.children) {
      const wrap = document.createElement('div');
      wrap.className = 'nav-group';
      const header = document.createElement('div');
      header.className = 'nav-group-head';
      header.innerHTML = '<span class="nav-ico">' + (item.icon || '📂') + '</span>' +
        '<span class="nav-label">' + item.label + '</span><span class="nav-caret">▾</span>';
      const bodyWrap = document.createElement('div');
      bodyWrap.className = 'nav-group-body';
      item.children.forEach(function (child) { bodyWrap.appendChild(buildNode(child, depth + 1)); });
      header.addEventListener('click', function () {
        wrap.classList.toggle('collapsed');
      });
      wrap.appendChild(header);
      wrap.appendChild(bodyWrap);
      return wrap;
    }
    const a = document.createElement('a');
    a.className = 'nav-item depth-' + depth + (item.key === current ? ' active' : '');
    a.href = 'javascript:void(0)';
    a.setAttribute('data-key', item.key);
    a.innerHTML = '<span class="nav-ico">' + (item.icon || '•') + '</span>' +
      '<span class="nav-label">' + item.label + '</span>';
    a.addEventListener('click', function (e) {
      e.preventDefault();
      go(item.key);
    });
    return a;
  }

  function setActive(key) {
    document.querySelectorAll('.nav-item').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-key') === key);
    });
  }

  function go(key) {
    if (!ROUTES[key]) return;
    current = key;
    setActive(key);
    const content = document.getElementById('content');
    content.scrollTop = 0;
    content.innerHTML = '<div class="loading">加载中…</div>';
    // 给一帧渲染避免卡顿
    requestAnimationFrame(function () {
      content.innerHTML = '';
      ROUTES[key](content);
      document.getElementById('page-title').textContent = TITLES[key] || '';
    });
  }

  window.APP = { go: go, renderNav: renderNav };

  document.addEventListener('DOMContentLoaded', function () {
    DB.open().then(function () {
      renderNav();
      go('home');
      // 尝试在线刷新当年节假日数据（失败则用内置库）
      window.refreshHolidayFromAPI(new Date().getFullYear());
    });
  });
})();
