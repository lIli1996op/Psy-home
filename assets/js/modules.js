// ============================================================
// 各业务模块定义与渲染
//  - 品宣工作（专用：列表/卡片双视图 + 图片文档附件）
//  - 来访辅导（两栏表单 + 大文本框 + 下载导出）
//  - 外出学习记录（主题/地点/时间/照片/介绍 + 下载）
//  - 团员活动记录 / 成员名单（记录型）
//  - 团员转接（仅上传/删除）
//  - 校园心理文件（四分类板块）
// ============================================================

// ---------------- 品宣工作 ----------------
window.Pinxuan = {
  render: function (container) {
    const self = this;
    container.innerHTML =
      '<div class="page-head"><div><h2>品宣工作</h2>' +
      '<p class="page-desc">上传的图片与文档均支持在线预览与下载；必填主题 / 日期 / 简要内容，选填多张图片与多格式文档。</p></div></div>' +
      '<div class="toolbar">' +
      '<button class="btn btn-primary" id="px-add">＋ 新增</button>' +
      '<input class="input" id="px-search" placeholder="按主题搜索…">' +
      '<input class="input" id="px-from" type="date" title="起始日期">' +
      '<span class="muted">至</span>' +
      '<input class="input" id="px-to" type="date" title="结束日期">' +
      '<span class="spacer"></span>' +
      '<div class="seg"><button class="seg-btn active" data-view="list">列表</button>' +
      '<button class="seg-btn" data-view="card">卡片</button></div>' +
      '</div>' +
      '<div id="px-body"></div>';

    this.container = container;
    this.view = 'list';
    container.querySelector('#px-add').addEventListener('click', function () { self.openForm(null); });
    container.querySelector('#px-search').addEventListener('input', function () { self.reload(); });
    container.querySelector('#px-from').addEventListener('change', function () { self.reload(); });
    container.querySelector('#px-to').addEventListener('change', function () { self.reload(); });
    container.querySelectorAll('.seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        container.querySelectorAll('.seg-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        self.view = b.getAttribute('data-view');
        self.reload();
      });
    });
    this.reload();
  },

  load: function () {
    const self = this;
    const kw = (this.container.querySelector('#px-search').value || '').trim().toLowerCase();
    const from = this.container.querySelector('#px-from').value;
    const to = this.container.querySelector('#px-to').value;
    return DB.getItems('pinxuan').then(function (items) {
      items = items || [];
      items.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
      return items.filter(function (it) {
        const d = it.data || {};
        const okKw = !kw || (d.theme || '').toLowerCase().indexOf(kw) > -1;
        const dv = d.date || '';
        const okDate = (!from || dv >= from) && (!to || dv <= to);
        return okKw && okDate;
      });
    });
  },

  reload: function () {
    const self = this;
    const body = this.container.querySelector('#px-body');
    this._revoke();
    this.load().then(function (items) {
      if (self.view === 'list') self.renderList(body, items);
      else self.renderCard(body, items);
    });
  },

  renderList: function (body, items) {
    if (!items.length) { body.innerHTML = '<div class="empty">暂无品宣记录，点击「新增」开始</div>'; return; }
    let html = '<div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>主题</th><th>日期</th><th>简要内容</th><th>图片</th><th>文档</th><th>操作</th></tr></thead><tbody>';
    items.forEach(function (it) {
      const d = it.data || {};
      const imgs = (it.files || []).filter(function (f) { return (f.type || '').indexOf('image/') === 0; }).length;
      const docs = (it.files || []).length - imgs;
      html += '<tr>' +
        '<td>' + UI.esc(d.theme || '') + '</td>' +
        '<td>' + UI.esc(d.date || '') + '</td>' +
        '<td class="cell-long">' + UI.esc((d.content || '').slice(0, 40)) + (d.content && d.content.length > 40 ? '…' : '') + '</td>' +
        '<td>' + (imgs ? imgs + ' 张' : '—') + '</td>' +
        '<td>' + (docs ? docs + ' 个' : '—') + '</td>' +
        '<td class="cell-op"><a class="link" data-act="view" data-id="' + it.id + '">查看</a>' +
        '<a class="link" data-act="edit" data-id="' + it.id + '">编辑</a>' +
        '<a class="link link-danger" data-act="del" data-id="' + it.id + '">删除</a></td></tr>';
    });
    html += '</tbody></table></div>';
    body.innerHTML = html;
    body.querySelectorAll('[data-act]').forEach(function (a) {
      const id = a.getAttribute('data-id');
      const act = a.getAttribute('data-act');
      a.addEventListener('click', function () {
        const item = items.filter(function (x) { return x.id === id; })[0];
        if (act === 'view') window.Pinxuan.openView(item);
        else if (act === 'edit') window.Pinxuan.openForm(item);
        else if (act === 'del') {
          if (confirm('确定删除该品宣记录？')) {
            (item.files || []).forEach(function (f) { DB.deleteFile(f.id); });
            DB.deleteItem(id).then(function () { UI.toast('已删除', 'success'); window.Pinxuan.reload(); });
          }
        }
      });
    });
  },

  renderCard: function (body, items) {
    if (!items.length) { body.innerHTML = '<div class="empty">暂无品宣记录，点击「新增」开始</div>'; return; }
    const grid = document.createElement('div'); grid.className = 'card-grid';
    body.innerHTML = ''; body.appendChild(grid);
    const self = this;
    items.forEach(function (it) {
      const d = it.data || {};
      const imgs = (it.files || []).filter(function (f) { return (f.type || '').indexOf('image/') === 0; });
      const docs = (it.files || []).length - imgs.length;
      const card = document.createElement('div'); card.className = 'px-card';
      card.innerHTML =
        '<div class="px-thumb">' + (imgs.length ? '<img alt="thumb">' : '<div class="px-noimg">📋</div>') + '</div>' +
        '<div class="px-info"><div class="px-title">' + UI.esc(d.theme || '') + '</div>' +
        '<div class="px-date">' + UI.esc(d.date || '') + '</div>' +
        '<div class="px-desc">' + UI.esc((d.content || '').slice(0, 60)) + (d.content && d.content.length > 60 ? '…' : '') + '</div>' +
        '<div class="px-meta">' + (imgs.length ? '🖼️ ' + imgs.length : '') + (docs ? ' 📎 ' + docs : '') + '</div>' +
        '<div class="px-ops"><button class="btn btn-sm" data-act="view">查看</button>' +
        '<button class="btn btn-sm" data-act="edit">编辑</button></div></div>';
      if (imgs.length) {
        DB.getFile(imgs[0].id).then(function (f) {
          if (!f) return;
          const url = URL.createObjectURL(f.blob);
          self._urls.push(url);
          const img = card.querySelector('img'); if (img) img.src = url;
        });
      }
      card.querySelector('[data-act=view]').addEventListener('click', function () { self.openView(it); });
      card.querySelector('[data-act=edit]').addEventListener('click', function () { self.openForm(it); });
      grid.appendChild(card);
    });
  },

  _urls: [],
  _revoke: function () { this._urls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} }); this._urls = []; },

  openForm: function (item) {
    const self = this;
    const isEdit = !!item;
    const data = isEdit ? (item.data || {}) : {};
    let html = '<form class="form" id="px-form">' +
      '<div class="form-row"><label><span class="req">*</span>工作主题</label>' +
      '<input class="input" name="theme" value="' + UI.esc(data.theme || '') + '" placeholder="例如：学雷锋志愿服务宣传"></div>' +
      '<div class="form-row"><label><span class="req">*</span>日期</label>' +
      '<input class="input" type="date" name="date" value="' + UI.esc(data.date || '') + '"></div>' +
      '<div class="form-row full"><label><span class="req">*</span>简要内容</label>' +
      '<textarea class="input" name="content" rows="3" placeholder="工作内容简述">' + UI.esc(data.content || '') + '</textarea></div>' +
      '<div class="form-row full"><label>图片（可多选）</label><input type="file" id="px-img" accept="image/*" multiple>' +
      '<div class="file-list" id="px-imgs"></div></div>' +
      '<div class="form-row full"><label>文档（多格式：pdf/doc/docx/xls/xlsx/ppt/txt…）</label>' +
      '<input type="file" id="px-doc" multiple><div class="file-list" id="px-docs"></div></div>' +
      '</form>';
    const footer = '<button class="btn" id="px-cancel">取消</button><button class="btn btn-primary" id="px-save">保存</button>';
    const modal = UI.openModal({ title: (isEdit ? '编辑' : '新增') + ' · 品宣工作', body: html, footer: footer, wide: true,
      onMount: function (ctx) {
        let imgFiles = [], docFiles = [];
        if (isEdit) {
          (item.files || []).forEach(function (f) {
            if ((f.type || '').indexOf('image/') === 0) imgFiles.push(f); else docFiles.push(f);
          });
        }
        UI.renderFileList(ctx.body.querySelector('#px-imgs'), imgFiles, { allowRemove: true, onChange: function (n) { imgFiles = n; } });
        UI.renderFileList(ctx.body.querySelector('#px-docs'), docFiles, { allowRemove: true, onChange: function (n) { docFiles = n; } });
        ctx.body.querySelector('#px-img').addEventListener('change', async function (e) {
          imgFiles = imgFiles.concat(await UI.uploadFiles(e.target.files)); UI.renderFileList(ctx.body.querySelector('#px-imgs'), imgFiles, { allowRemove: true, onChange: function (n) { imgFiles = n; } }); e.target.value = '';
        });
        ctx.body.querySelector('#px-doc').addEventListener('change', async function (e) {
          docFiles = docFiles.concat(await UI.uploadFiles(e.target.files)); UI.renderFileList(ctx.body.querySelector('#px-docs'), docFiles, { allowRemove: true, onChange: function (n) { docFiles = n; } }); e.target.value = '';
        });
        ctx.foot.querySelector('#px-cancel').addEventListener('click', ctx.close);
        ctx.foot.querySelector('#px-save').addEventListener('click', function () {
          const form = ctx.body.querySelector('#px-form');
          const theme = form.querySelector('[name=theme]').value.trim();
          const date = form.querySelector('[name=date]').value.trim();
          const content = form.querySelector('[name=content]').value.trim();
          if (!theme || !date || !content) { UI.toast('请填写主题、日期、简要内容（均为必填）', 'error'); return; }
          const rec = {
            id: isEdit ? item.id : DB.genId(), store: 'pinxuan',
            data: { theme: theme, date: date, content: content },
            files: imgFiles.concat(docFiles),
            createdAt: isEdit ? item.createdAt : Date.now(), updatedAt: Date.now()
          };
          DB.putItem(rec).then(function () { UI.toast('已保存', 'success'); ctx.close(); self.reload(); });
        });
      }
    });
  },

  openView: function (item) {
    const d = item.data || {};
    const html = '<div class="detail">' +
      '<div class="detail-row"><span class="detail-k">工作主题</span><span class="detail-v">' + UI.esc(d.theme || '') + '</span></div>' +
      '<div class="detail-row"><span class="detail-k">日期</span><span class="detail-v">' + UI.esc(d.date || '') + '</span></div>' +
      '<div class="detail-row"><span class="detail-k">简要内容</span><span class="detail-v">' + UI.esc(d.content || '') + '</span></div>' +
      '<div class="detail-row"><span class="detail-k">附件</span><div class="file-list" id="pxv-files"></div></div></div>';
    UI.openModal({ title: '品宣工作 · 详情', body: html, footer: '<button class="btn btn-primary" id="pxv-ok">关闭</button>', wide: true,
      onMount: function (ctx) {
        UI.renderFileList(ctx.body.querySelector('#pxv-files'), item.files || []);
        ctx.foot.querySelector('#pxv-ok').addEventListener('click', ctx.close);
      }
    });
  }
};

// ---------------- 记录型模块配置 ----------------
window.MODULE_CONFIGS = {
  huodong: {
    store: 'huodong', title: '团员活动记录',
    desc: '团员活动开展情况记录，可附活动图片与文档。',
    attachments: true,
    fields: [
      { key: 'name', label: '活动名称', type: 'text', required: true },
      { key: 'date', label: '日期', type: 'date', required: true },
      { key: 'place', label: '地点', type: 'text' },
      { key: 'count', label: '参与人数', type: 'text' },
      { key: 'content', label: '活动内容', type: 'textarea', required: true }
    ]
  },
  mingdan: {
    store: 'mingdan', title: '成员名单',
    desc: '学生会成员名单记录，可填写主题与内容说明，支持附件上传与预览。',
    attachments: true,
    fields: [
      { key: 'theme', label: '主题', type: 'text', required: true, placeholder: '如：2026 届学生会成员名单' },
      { key: 'content', label: '内容', type: 'textarea', required: true, placeholder: '成员姓名、分工或其他说明…' }
    ]
  },
  waichu: {
    store: 'waichu', title: '外出学习记录',
    desc: '记录外出学习主题、地点、时间与照片，可编辑学习内容介绍，支持照片下载。',
    attachments: true,
    attachLabel: '照片',
    attachAccept: 'image/*',
    downloadable: true,
    fields: [
      { key: 'theme', label: '学习主题', type: 'text', required: true },
      { key: 'place', label: '地点', type: 'text' },
      { key: 'date', label: '时间', type: 'date', required: true },
      { key: 'content', label: '学习内容介绍', type: 'textarea', required: true }
    ]
  },
  zhuanjie: {
    store: 'zhuanjie', title: '团员转接',
    desc: '团员档案转接文件管理，仅支持上传与删除。',
    allowUpload: true, allowDelete: true, showView: false, showDownload: false,
    metaFields: [], showMeta: []
  }
};

// ---------------- 来访辅导 ----------------
window.LaiFang = {
  store: 'laifang',
  problemTypes: ['人际关系', '亲子关系', '学业压力', '焦虑情绪', '抑郁情绪', '生命意义感', '自我认同', '网络依赖', '创伤应激', '适应问题', '其他'],
  render: function (container) {
    const self = this;
    container.innerHTML =
      '<div class="page-head"><div><h2>来访辅导</h2>' +
      '<p class="page-desc">登记学生来访辅导信息，右栏可录入详细辅导记录；支持导出下载。</p></div></div>' +
      '<div class="toolbar"><button class="btn btn-primary" id="lf-add">＋ 新增来访</button>' +
      '<input class="input" id="lf-search" placeholder="搜索姓名 / 班级 / 问题类型…"></div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>姓名</th><th>性别</th><th>年龄</th><th>班级</th><th>来访时间</th><th>问题类型</th><th>来访次数</th><th>操作</th>' +
      '</tr></thead><tbody id="lf-body"></tbody></table></div>';
    container.querySelector('#lf-add').addEventListener('click', function () { self.openForm(container, null); });
    container.querySelector('#lf-search').addEventListener('input', function () { self.reload(container); });
    this.reload(container);
  },

  reload: function (container) {
    const self = this;
    const kw = (container.querySelector('#lf-search').value || '').trim().toLowerCase();
    DB.getItems(this.store).then(function (items) {
      items = items || [];
      items.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
      const body = container.querySelector('#lf-body');
      body.innerHTML = '';
      items.forEach(function (it) {
        const d = it.data || {};
        const hay = (d.name + ' ' + d.className + ' ' + d.problem).toLowerCase();
        if (kw && hay.indexOf(kw) < 0) return;
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + UI.esc(d.name || '') + '</td>' +
          '<td>' + UI.esc(d.gender || '') + '</td>' +
          '<td>' + (d.age != null && d.age !== '' ? d.age : '—') + '</td>' +
          '<td>' + UI.esc(d.className || '') + '</td>' +
          '<td>' + UI.esc(d.visitTime || '') + '</td>' +
          '<td>' + UI.esc(d.problem || '') + '</td>' +
          '<td>' + (d.count != null && d.count !== '' ? d.count : '—') + '</td>';
        const op = document.createElement('td'); op.className = 'cell-op';
        op.innerHTML = '<a class="link" data-act="view">查看</a><a class="link" data-act="edit">编辑</a>' +
          '<a class="link" data-act="dl">下载</a><a class="link link-danger" data-act="del">删除</a>';
        op.querySelector('[data-act=view]').addEventListener('click', function () { self.openView(it); });
        op.querySelector('[data-act=edit]').addEventListener('click', function () { self.openForm(container, it); });
        op.querySelector('[data-act=dl]').addEventListener('click', function () { self.download(it); });
        op.querySelector('[data-act=del]').addEventListener('click', function () {
          if (confirm('确定删除该来访记录？')) { DB.deleteItem(it.id).then(function () { UI.toast('已删除', 'success'); self.reload(container); }); }
        });
        tr.appendChild(op);
        body.appendChild(tr);
      });
      if (!body.children.length) body.innerHTML = '<tr><td colspan="8" class="muted" style="text-align:center;padding:28px">暂无来访记录，点击「新增来访」开始登记</td></tr>';
    });
  },

  openForm: function (container, item) {
    const self = this;
    const isEdit = !!item;
    const d = isEdit ? (item.data || {}) : {};
    const opts = function (sel) {
      return self.problemTypes.map(function (o) { return '<option value="' + UI.esc(o) + '"' + (d.problem === o ? ' selected' : '') + '>' + UI.esc(o) + '</option>'; }).join('');
    };
    const html = '<form class="lf-form" id="lf-form">' +
      '<div class="lf-left">' +
      '<div class="form-row"><label><span class="req">*</span>姓名</label><input class="input" name="name" value="' + UI.esc(d.name || '') + '"></div>' +
      '<div class="form-row"><label>性别</label><select class="input" name="gender"><option value="">未填</option><option' + (d.gender === '男' ? ' selected' : '') + ' value="男">男</option><option' + (d.gender === '女' ? ' selected' : '') + ' value="女">女</option></select></div>' +
      '<div class="form-row"><label>年龄</label><input class="input" name="age" type="number" min="0" value="' + (d.age != null ? d.age : '') + '"></div>' +
      '<div class="form-row"><label>班级</label><input class="input" name="className" value="' + UI.esc(d.className || '') + '"></div>' +
      '<div class="form-row"><label><span class="req">*</span>来访时间</label><input class="input" type="datetime-local" name="visitTime" value="' + UI.esc(d.visitTime || '') + '"></div>' +
      '<div class="form-row"><label><span class="req">*</span>问题类型</label><select class="input" name="problem">' + opts() + '</select></div>' +
      '<div class="form-row"><label>来访次数</label><input class="input" name="count" type="number" min="1" value="' + (d.count != null ? d.count : '') + '"></div>' +
      '</div>' +
      '<div class="lf-right"><label>来访记录（详细辅导内容）</label>' +
      '<textarea class="input lf-text" name="record" placeholder="可在此详细记录辅导过程、观察、建议……">' + UI.esc(d.record || '') + '</textarea></div>' +
      '</form>';
    const footer = '<button class="btn" id="lf-cancel">取消</button><button class="btn btn-primary" id="lf-save">保存</button>';
    UI.openModal({ title: (isEdit ? '编辑' : '新增') + ' · 来访辅导', body: html, footer: footer, wide: true,
      onMount: function (ctx) {
        ctx.foot.querySelector('#lf-cancel').addEventListener('click', ctx.close);
        ctx.foot.querySelector('#lf-save').addEventListener('click', function () {
          const form = ctx.body.querySelector('#lf-form');
          const name = form.querySelector('[name=name]').value.trim();
          const visitTime = form.querySelector('[name=visitTime]').value.trim();
          const problem = form.querySelector('[name=problem]').value.trim();
          if (!name || !visitTime || !problem) { UI.toast('请填写姓名、来访时间、问题类型（必填）', 'error'); return; }
          const data = {
            name: name,
            gender: form.querySelector('[name=gender]').value,
            age: form.querySelector('[name=age]').value,
            className: form.querySelector('[name=className]').value.trim(),
            visitTime: visitTime,
            problem: problem,
            count: form.querySelector('[name=count]').value,
            record: form.querySelector('[name=record]').value
          };
          const rec = { id: isEdit ? item.id : DB.genId(), store: self.store, data: data, files: [], createdAt: isEdit ? item.createdAt : Date.now(), updatedAt: Date.now() };
          DB.putItem(rec).then(function () { UI.toast('已保存', 'success'); ctx.close(); self.reload(container); });
        });
      }
    });
  },

  openView: function (item) {
    const self = this;
    const d = item.data || {};
    function row(k, v) { return '<div class="detail-row"><span class="detail-k">' + UI.esc(k) + '</span><span class="detail-v">' + UI.esc(v == null ? '' : v) + '</span></div>'; }
    const html = '<div class="lf-view">' +
      '<div class="lf-left"><div class="detail">' +
      row('姓名', d.name) + row('性别', d.gender) + row('年龄', d.age) + row('班级', d.className) +
      row('来访时间', d.visitTime) + row('问题类型', d.problem) + row('来访次数', d.count) +
      '</div></div>' +
      '<div class="lf-right"><label class="lf-lab">来访记录</label><div class="lf-record">' + UI.esc(d.record || '（未填写）') + '</div></div>' +
      '</div>';
    UI.openModal({ title: '来访辅导 · 详情', body: html, footer: '<button class="btn" id="lfv-dl">下载</button><button class="btn btn-primary" id="lfv-ok">关闭</button>', wide: true,
      onMount: function (ctx) {
        ctx.foot.querySelector('#lfv-dl').addEventListener('click', function () { self.download(item); });
        ctx.foot.querySelector('#lfv-ok').addEventListener('click', ctx.close);
      }
    });
  },

  download: function (item) {
    const d = item.data || {};
    let t = '来访辅导记录\n================\n';
    t += '姓名：' + (d.name || '') + '\n性别：' + (d.gender || '') + '\n年龄：' + (d.age != null ? d.age : '') + '\n班级：' + (d.className || '') +
      '\n来访时间：' + (d.visitTime || '') + '\n问题类型：' + (d.problem || '') + '\n来访次数：' + (d.count != null ? d.count : '') +
      '\n\n来访记录：\n' + (d.record || '');
    const blob = new Blob([t], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = (d.name || '来访') + '_来访辅导记录.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
  }
};

// ---------------- 校园心理文件（四分类板块） ----------------
window.XinLi = {
  categories: [
    { key: '三特生材料', icon: '🧩', color: 'mint' },
    { key: '咨询室材料', icon: '🛋️', color: 'blue' },
    { key: '危机干预', icon: '🚨', color: 'peach' },
    { key: '其他', icon: '📁', color: 'lav' }
  ],
  render: function (container) {
    const self = this;
    container.innerHTML = '<div class="page-head"><div><h2>校园心理文件</h2>' +
      '<p class="page-desc">按分类管理校园心理健康文件：三特生材料、咨询室材料、危机干预、其他。支持在线预览、下载与删除。</p></div></div>' +
      '<div class="xinli-grid" id="xl-grid"></div>';
    const grid = container.querySelector('#xl-grid');
    this.categories.forEach(function (cat) {
      const block = document.createElement('div');
      block.className = 'xl-block xl-' + cat.color;
      block.innerHTML = '<div class="xl-head"><span class="xl-ico">' + cat.icon + '</span>' +
        '<span class="xl-title">' + UI.esc(cat.key) + '</span><span class="xl-count" data-cat="' + UI.esc(cat.key) + '">0</span>' +
        '<button class="btn btn-sm xl-up" data-cat="' + UI.esc(cat.key) + '">＋ 上传</button></div>' +
        '<div class="xl-list" data-cat="' + UI.esc(cat.key) + '"></div>';
      grid.appendChild(block);
    });
    grid.querySelectorAll('.xl-up').forEach(function (b) {
      b.addEventListener('click', function () { self.openUpload(container, b.getAttribute('data-cat')); });
    });
    this.reload(container);
  },

  reload: function (container) {
    const self = this;
    DB.getItems('xinli').then(function (items) {
      items = items || [];
      const byCat = {};
      self.categories.forEach(function (c) { byCat[c.key] = []; });
      items.forEach(function (it) {
        const cat = (it.data && it.data.category) || '其他';
        if (!byCat[cat]) byCat[cat] = [];
        byCat[cat].push(it);
      });
      self.categories.forEach(function (cat) {
        const list = container.querySelector('.xl-list[data-cat="' + cssEsc(cat.key) + '"]');
        const cnt = container.querySelector('.xl-count[data-cat="' + cssEsc(cat.key) + '"]');
        const arr = byCat[cat.key] || [];
        arr.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        if (cnt) cnt.textContent = arr.length;
        if (!list) return;
        list.innerHTML = '';
        if (!arr.length) { list.innerHTML = '<div class="xl-empty">暂无文件，点击右上角「上传」</div>'; return; }
        arr.forEach(function (it) {
          const f = (it.files && it.files[0]) || {};
          const row = document.createElement('div'); row.className = 'xl-item';
          row.innerHTML = '<span class="fc-icon">' + UI.fileIcon(f.name || '') + '</span>' +
            '<span class="xl-name" title="' + UI.esc(f.name || '') + '">' + UI.esc(f.name || '（无文件名）') + '</span>' +
            '<span class="xl-time">' + UI.fmtDate(it.createdAt) + '</span>' +
            '<span class="xl-ops"><a class="link" data-act="view">查看</a><a class="link" data-act="dl">下载</a><a class="link link-danger" data-act="del">删除</a></span>';
          const fid = f.id;
          row.querySelector('[data-act=view]').addEventListener('click', function () { if (fid) UI.previewFile(fid); });
          row.querySelector('[data-act=dl]').addEventListener('click', function () { if (fid) UI.downloadFile(fid); });
          row.querySelector('[data-act=del]').addEventListener('click', function () {
            if (confirm('确定删除该文件？')) {
              (it.files || []).forEach(function (x) { DB.deleteFile(x.id); });
              DB.deleteItem(it.id).then(function () { UI.toast('已删除', 'success'); self.reload(container); });
            }
          });
          list.appendChild(row);
        });
      });
    });
  },

  openUpload: function (container, cat) {
    const self = this;
    const html = '<div class="upload-box" id="xl-drop">点击选择或拖拽文档到此（支持多格式：pdf / doc / docx / 图片 / xls / ppt / txt 等）</div>' +
      '<input type="file" id="xl-input" multiple style="display:none">' +
      '<div class="file-list" id="xl-sel"></div>' +
      '<div class="form" style="margin-top:12px"><div class="form-row full"><label>说明</label><input class="input" id="xl-remark" placeholder="可选，简要说明"></div></div>';
    const footer = '<button class="btn" id="xl-cancel">取消</button><button class="btn btn-primary" id="xl-save">保存上传</button>';
    UI.openModal({ title: '上传 · ' + cat, body: html, footer: footer, wide: true,
      onMount: function (ctx) {
        let selected = [];
        const drop = ctx.body.querySelector('#xl-drop');
        const input = ctx.body.querySelector('#xl-input');
        const listEl = ctx.body.querySelector('#xl-sel');
        drop.addEventListener('click', function () { input.click(); });
        drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('drag'); });
        drop.addEventListener('dragleave', function () { drop.classList.remove('drag'); });
        drop.addEventListener('drop', async function (e) {
          e.preventDefault(); drop.classList.remove('drag');
          selected = selected.concat(await UI.uploadFiles(e.dataTransfer.files));
          UI.renderFileList(listEl, selected, { allowRemove: true, onChange: function (n) { selected = n; } });
        });
        input.addEventListener('change', async function (e) {
          selected = selected.concat(await UI.uploadFiles(e.target.files));
          UI.renderFileList(listEl, selected, { allowRemove: true, onChange: function (n) { selected = n; } });
          e.target.value = '';
        });
        ctx.foot.querySelector('#xl-cancel').addEventListener('click', ctx.close);
        ctx.foot.querySelector('#xl-save').addEventListener('click', async function () {
          if (!selected.length) { UI.toast('请先选择文档', 'error'); return; }
          const remark = ctx.body.querySelector('#xl-remark').value.trim();
          for (let i = 0; i < selected.length; i++) {
            await DB.putItem({ id: DB.genId(), store: 'xinli', data: { category: cat, remark: remark }, files: [selected[i]], createdAt: Date.now() });
          }
          UI.toast('已上传 ' + selected.length + ' 个文档', 'success');
          ctx.close();
          self.reload(container);
        });
      }
    });
  }
};

function cssEsc(s) { return String(s).replace(/"/g, '\\"'); }
