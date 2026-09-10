// ============================================================
// 首页 · 日历仪表盘
//  - 自动识别全年法定放假（红色+休）与周末调休补班（红色+班）
//  - 节假日首日显示名称，其余仅红字+休；普通工作日无标记
//  - 个人工作事项可叠加标记，互不冲突
// ============================================================
window.Calendar = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(), // 0-11
  dayMap: {},

  render: function (container) {
    const self = this;
    container.innerHTML =
      '<div class="home-wrap">' +
      '  <div class="home-card">' +
      '    <div class="cal-head">' +
      '      <button class="cal-nav" id="cal-prev">‹</button>' +
      '      <div class="cal-title" id="cal-title"></div>' +
      '      <button class="cal-nav" id="cal-next">›</button>' +
      '      <button class="btn btn-ghost" id="cal-today">今天</button>' +
      '    </div>' +
      '    <div class="cal-legend">' +
      '      <span class="lg lg-holiday"><i class="dot"></i>法定放假（休）</span>' +
      '      <span class="lg lg-makeup"><i class="dot"></i>调休补班（班）</span>' +
      '      <span class="lg"><i class="dot dot-per"></i>个人工作事项</span>' +
      '    </div>' +
      '    <div class="cal-week">' +
      '      <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>' +
      '    </div>' +
      '    <div class="cal-grid" id="cal-grid"></div>' +
      '  </div>' +
      '  <div class="home-side" id="home-side"></div>' +
      '</div>';

    container.querySelector('#cal-prev').addEventListener('click', function () { self.shift(-1); });
    container.querySelector('#cal-next').addEventListener('click', function () { self.shift(1); });
    container.querySelector('#cal-today').addEventListener('click', function () {
      const n = new Date();
      self.year = n.getFullYear(); self.month = n.getMonth(); self.renderMonth();
    });

    DB.getAllDays().then(function (days) {
      self.dayMap = {};
      (days || []).forEach(function (d) { self.dayMap[d.date] = d.items || []; });
      self.renderMonth();
    });
  },

  shift: function (delta) {
    this.month += delta;
    if (this.month < 0) { this.month = 11; this.year--; }
    if (this.month > 11) { this.month = 0; this.year++; }
    this.renderMonth();
  },

  keyOf: function (y, m, d) { return y + '-' + (m + 1) + '-' + d; },

  renderMonth: function () {
    const self = this;
    const y = this.year, m = this.month;
    const title = document.getElementById('cal-title');
    if (title) title.textContent = y + ' 年 ' + (m + 1) + ' 月';
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';

    const first = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    const isThisMonth = (today.getFullYear() === y && today.getMonth() === m);

    // 前置空格
    for (let i = 0; i < first; i++) {
      const blank = document.createElement('div');
      blank.className = 'cal-cell blank';
      grid.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      const mark = window.getDayMark(date);
      const key = self.keyOf(y, m, d);
      const items = self.dayMap[key] || [];
      const isToday = isThisMonth && today.getDate() === d;

      const cell = document.createElement('div');
      cell.className = 'cal-cell' + (mark.type === 'holiday' ? ' holiday' : '') +
        (mark.type === 'makeup' ? ' makeup' : '') + (isToday ? ' today' : '');
      cell.innerHTML =
        '<div class="cal-top">' +
        '  <span class="cal-num">' + d + '</span>' +
        (mark.type !== 'normal' ? '<span class="cal-badge">' + (mark.type === 'holiday' ? '休' : '班') + '</span>' : '') +
        '</div>' +
        (mark.name ? '<div class="cal-name">' + UI.esc(mark.name) + '</div>' : '') +
        '<div class="cal-items"></div>';

      const itemsBox = cell.querySelector('.cal-items');
      items.forEach(function (it) {
        const tag = document.createElement('div');
        tag.className = 'cal-pitem';
        tag.textContent = it.title;
        tag.title = it.note || it.title;
        itemsBox.appendChild(tag);
      });

      cell.addEventListener('click', function () { self.openDay(key, y, m, d); });
      grid.appendChild(cell);
    }
    this.renderSide();
  },

  renderSide: function () {
    const side = document.getElementById('home-side');
    if (!side) return;
    const self = this;
    // 统计本月个人事项
    let count = 0;
    Object.keys(this.dayMap).forEach(function (k) {
      if (k.indexOf(self.year + '-' + (self.month + 1) + '-') === 0) count += (self.dayMap[k] || []).length;
    });
    const y = this.year, m = this.month;
    const data = window.getHolidayYear(y);
    let holCount = 0;
    Object.keys(data.holidays || {}).forEach(function (k) {
      const parts = k.split('-');
      if (parseInt(parts[0], 10) === (m + 1)) holCount++;
    });
    side.innerHTML =
      '<div class="side-card">' +
      '  <h3>本月概览</h3>' +
      '  <div class="side-stat"><span class="ss-num">' + holCount + '</span><span class="ss-lab">法定假日天数</span></div>' +
      '  <div class="side-stat"><span class="ss-num">' + count + '</span><span class="ss-lab">个人工作事项</span></div>' +
      '  <p class="muted side-tip">点击任意日期可新增 / 查看个人工作事项，与节假日、调休标记叠加显示。</p>' +
      '</div>';
  },

  openDay: function (key, y, m, d) {
    const self = this;
    const mark = window.getDayMark(new Date(y, m, d));
    const markText = mark.type === 'holiday' ? ('法定放假' + (mark.name ? '（' + mark.name + '）' : '')) :
      mark.type === 'makeup' ? '调休补班' : '正常工作日';
    const items = this.dayMap[key] || [];

    const html =
      '<div class="day-head"><strong>' + y + '年' + (m + 1) + '月' + d + '日</strong>' +
      '<span class="day-mark ' + mark.type + '">' + UI.esc(markText) + '</span></div>' +
      '<div id="day-list" class="day-list"></div>' +
      '<div class="form" style="margin-top:10px">' +
      '  <div class="form-row full"><label>工作事项标题 <span class="req">*</span></label>' +
      '    <input class="input" id="di-title" type="text" placeholder="例如：提交团员档案审核"></div>' +
      '  <div class="form-row full"><label>备注（选填）</label>' +
      '    <input class="input" id="di-note" type="text" placeholder="补充说明"></div>' +
      '</div>';
    const footer = '<button class="btn" id="di-close">关闭</button><button class="btn btn-primary" id="di-add">添加事项</button>';

    const modal = UI.openModal({ title: '个人工作事项', body: html, footer: footer, onMount: function (ctx) {
      function drawList() {
        const box = ctx.body.querySelector('#day-list');
        box.innerHTML = '';
        if (!items.length) { box.innerHTML = '<p class="muted">当日暂无个人工作事项</p>'; return; }
        items.forEach(function (it, idx) {
          const row = document.createElement('div');
          row.className = 'day-item';
          row.innerHTML = '<span class="di-dot"></span><div class="di-body"><div class="di-t">' +
            UI.esc(it.title) + '</div>' + (it.note ? '<div class="di-n">' + UI.esc(it.note) + '</div>' : '') + '</div>' +
            '<button class="di-del" title="删除">×</button>';
          row.querySelector('.di-del').addEventListener('click', function () {
            items.splice(idx, 1); self.dayMap[key] = items.slice();
            DB.putDay({ date: key, items: items }).then(drawList);
            self.renderMonth();
          });
          box.appendChild(row);
        });
      }
      drawList();
      ctx.foot.querySelector('#di-close').addEventListener('click', ctx.close);
      ctx.foot.querySelector('#di-add').addEventListener('click', function () {
        const title = ctx.body.querySelector('#di-title').value.trim();
        if (!title) { UI.toast('请填写事项标题', 'error'); return; }
        const note = ctx.body.querySelector('#di-note').value.trim();
        items.push({ id: DB.genId(), title: title, note: note });
        self.dayMap[key] = items.slice();
        DB.putDay({ date: key, items: items }).then(function () {
          ctx.body.querySelector('#di-title').value = '';
          ctx.body.querySelector('#di-note').value = '';
          drawList(); self.renderMonth(); UI.toast('已添加', 'success');
        });
      });
    }});
  }
};
