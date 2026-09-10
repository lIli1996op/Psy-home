// ============================================================
// 记录型列表组件（三会一课 / 团员活动记录 / 学生会会议 / 成员名单）
// 文件库组件（学生会检查用表 / 校园心理文件）
// ============================================================

// ---------------- 记录型列表 ----------------
window.RecordList = {
  render: function (container, config) {
    const self = this;
    container.innerHTML =
      '<div class="page-head"><div><h2>' + UI.esc(config.title) + '</h2>' +
      (config.desc ? '<p class="page-desc">' + UI.esc(config.desc) + '</p>' : '') + '</div></div>' +
      '<div class="toolbar">' +
      '<button class="btn btn-primary" id="rl-add">＋ 新增</button>' +
      '<input class="input" id="rl-search" placeholder="搜索关键字…">' +
      (hasDateField(config) ? '<input class="input" id="rl-from" type="date" title="起始日期">' +
        '<span class="muted">至</span><input class="input" id="rl-to" type="date" title="结束日期">' : '') +
      '</div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr id="rl-th"></tr></thead>' +
      '<tbody id="rl-body"></tbody></table></div>';

    const th = container.querySelector('#rl-th');
    config.fields.forEach(function (f) {
      const td = document.createElement('th'); td.textContent = f.label; th.appendChild(td);
    });
    if (config.attachments) { const td = document.createElement('th'); td.textContent = '附件'; th.appendChild(td); }
    th.appendChild(document.createElement('th')).textContent = '操作';

    container.querySelector('#rl-add').addEventListener('click', function () {
      self.openForm(container, config, null);
    });
    const reload = function () { self.reload(container, config); };
    container.querySelector('#rl-search').addEventListener('input', reload);
    if (hasDateField(config)) {
      container.querySelector('#rl-from').addEventListener('change', reload);
      container.querySelector('#rl-to').addEventListener('change', reload);
    }
    this.reload(container, config);
  },

  reload: function (container, config) {
    const self = this;
    const kw = (container.querySelector('#rl-search').value || '').trim().toLowerCase();
    const from = container.querySelector('#rl-from') ? container.querySelector('#rl-from').value : '';
    const to = container.querySelector('#rl-to') ? container.querySelector('#rl-to').value : '';
    DB.getItems(config.store).then(function (items) {
      items = items || [];
      items.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
      const body = container.querySelector('#rl-body');
      body.innerHTML = '';
      const dateKey = (config.fields.filter(function (f) { return f.type === 'date'; })[0] || {}).key;
      items.forEach(function (it) {
        const data = it.data || {};
        const matchKw = !kw || config.fields.some(function (f) {
          return String(data[f.key] || '').toLowerCase().indexOf(kw) > -1;
        });
        const dv = dateKey ? (data[dateKey] || '') : '';
        const matchDate = (!from || dv >= from) && (!to || dv <= to);
        if (!matchKw || !matchDate) return;
        const tr = document.createElement('tr');
        config.fields.forEach(function (f) {
          const td = document.createElement('td');
          let v = data[f.key];
          if (f.type === 'date') v = v ? UI.fmtDay(new Date(v).getTime()) : '';
          td.textContent = v == null ? '' : String(v);
          if (f.type === 'textarea') td.classList.add('cell-long');
          tr.appendChild(td);
        });
        if (config.attachments) {
          const td = document.createElement('td');
          td.textContent = (it.files && it.files.length) ? it.files.length + ' 个' : '—';
          tr.appendChild(td);
        }
        const op = document.createElement('td');
        op.className = 'cell-op';
        op.innerHTML = '<a class="link" data-act="view">查看</a><a class="link" data-act="edit">编辑</a>' +
          (config.downloadable ? '<a class="link" data-act="dl">下载</a>' : '') +
          '<a class="link link-danger" data-act="del">删除</a>';
        op.querySelector('[data-act=view]').addEventListener('click', function () { self.openView(container, config, it); });
        op.querySelector('[data-act=edit]').addEventListener('click', function () { self.openForm(container, config, it); });
        if (config.downloadable) {
          op.querySelector('[data-act=dl]').addEventListener('click', function () {
            const files = it.files || [];
            if (!files.length) { UI.toast('该记录没有可下载的附件', 'error'); return; }
            files.forEach(function (f) { UI.downloadFile(f.id); });
          });
        }
        op.querySelector('[data-act=del]').addEventListener('click', function () {
          if (confirm('确定删除该记录？')) {
            (it.files || []).forEach(function (f) { DB.deleteFile(f.id); });
            DB.deleteItem(it.id).then(function () { UI.toast('已删除', 'success'); self.reload(container, config); });
          }
        });
        tr.appendChild(op);
        body.appendChild(tr);
      });
      if (!body.children.length) {
        body.innerHTML = '<tr><td colspan="' + (config.fields.length + (config.attachments ? 2 : 1)) +
          '" class="muted" style="text-align:center;padding:28px">暂无数据，点击「新增」开始录入</td></tr>';
      }
    });
  },

  openForm: function (container, config, item) {
    const self = this;
    const isEdit = !!item;
    const data = isEdit ? (item.data || {}) : {};
    let html = '<form class="form" id="rl-form">';
    config.fields.forEach(function (f) {
      html += '<div class="form-row' + (f.full ? ' full' : '') + '"><label>' +
        (f.required ? '<span class="req">*</span>' : '') + UI.esc(f.label) + '</label>';
      if (f.type === 'textarea') {
        html += '<textarea class="input" name="' + f.key + '" rows="3" placeholder="' +
          UI.esc(f.placeholder || '') + '">' + UI.esc(data[f.key] || '') + '</textarea>';
      } else if (f.type === 'select') {
        html += '<select class="input" name="' + f.key + '">';
        (f.options || []).forEach(function (o) {
          html += '<option value="' + UI.esc(o) + '"' + (data[f.key] === o ? ' selected' : '') + '>' + UI.esc(o) + '</option>';
        });
        html += '</select>';
      } else if (f.type === 'date') {
        html += '<input class="input" type="date" name="' + f.key + '" value="' + UI.esc(data[f.key] || '') + '">';
      } else {
        html += '<input class="input" type="text" name="' + f.key + '" value="' + UI.esc(data[f.key] || '') +
          '" placeholder="' + UI.esc(f.placeholder || '') + '">';
      }
      html += '</div>';
    });
    if (config.attachments) {
      html += '<div class="form-row full"><label>' + (config.attachLabel || '附件') + '（' + (config.attachAccept && config.attachAccept.indexOf('image') > -1 ? '图片' : '图片 / 文档') + '，可多选）</label>' +
        '<input type="file" id="rl-file" multiple' + (config.attachAccept ? ' accept="' + UI.esc(config.attachAccept) + '"' : '') + '>' +
        '<div class="file-list" id="rl-files"></div></div>';
    }
    html += '</form>';
    const footer = '<button class="btn" id="rl-cancel">取消</button><button class="btn btn-primary" id="rl-save">保存</button>';
    const m = UI.openModal({ title: (isEdit ? '编辑' : '新增') + ' · ' + config.title, body: html, footer: footer, wide: true,
      onMount: function (ctx) {
        let files = isEdit ? (item.files || []).slice() : [];
        if (config.attachments) {
          UI.renderFileList(ctx.body.querySelector('#rl-files'), files, { allowRemove: true, onChange: function (nf) { files = nf; } });
          ctx.body.querySelector('#rl-file').addEventListener('change', async function (e) {
            const added = await UI.uploadFiles(e.target.files);
            files = files.concat(added);
            UI.renderFileList(ctx.body.querySelector('#rl-files'), files, { allowRemove: true, onChange: function (nf) { files = nf; } });
            e.target.value = '';
          });
        }
        ctx.foot.querySelector('#rl-cancel').addEventListener('click', ctx.close);
        ctx.foot.querySelector('#rl-save').addEventListener('click', function () {
          const form = ctx.body.querySelector('#rl-form');
          const vals = {};
          let ok = true;
          config.fields.forEach(function (f) {
            const v = form.querySelector('[name=' + f.key + ']').value.trim();
            if (f.required && !v) {
              UI.toast('请填写必填项：' + f.label, 'error'); ok = false;
            }
            vals[f.key] = v;
          });
          if (!ok) return;
          const rec = {
            id: isEdit ? item.id : DB.genId(),
            store: config.store,
            data: vals,
            files: files,
            createdAt: isEdit ? item.createdAt : Date.now(),
            updatedAt: Date.now()
          };
          DB.putItem(rec).then(function () {
            UI.toast('已保存', 'success'); ctx.close();
            self.reload(container, config);
          });
        });
      }
    });
  },

  openView: function (container, config, item) {
    const data = item.data || {};
    let html = '<div class="detail">';
    config.fields.forEach(function (f) {
      let v = data[f.key];
      if (f.type === 'date') v = v ? UI.fmtDay(new Date(v).getTime()) : '—';
      html += '<div class="detail-row"><span class="detail-k">' + UI.esc(f.label) + '</span>' +
        '<span class="detail-v">' + UI.esc(v || '—') + '</span></div>';
    });
    html += '<div class="detail-row"><span class="detail-k">附件</span><div class="file-list" id="dv-files"></div></div>';
    html += '</div>';
    const m = UI.openModal({ title: config.title + ' · 详情', body: html, footer: '<button class="btn btn-primary" id="dv-ok">关闭</button>',
      wide: true, onMount: function (ctx) {
        UI.renderFileList(ctx.body.querySelector('#dv-files'), item.files || []);
        ctx.foot.querySelector('#dv-ok').addEventListener('click', ctx.close);
      }
    });
  }
};

function hasDateField(config) {
  return config.fields.some(function (f) { return f.type === 'date'; });
}

// ---------------- 文件库（检查用表 / 心理文件） ----------------
window.FileLibrary = {
  render: function (container, config) {
    const self = this;
    container.innerHTML =
      '<div class="page-head"><div><h2>' + UI.esc(config.title) + '</h2>' +
      (config.desc ? '<p class="page-desc">' + UI.esc(config.desc) + '</p>' : '') + '</div></div>' +
      '<div class="toolbar">' +
      (config.allowUpload !== false ? '<button class="btn btn-primary" id="fl-up">⬆ 上传文档</button>' : '') +
      (config.filters && config.filters.length ? '<span id="fl-filters"></span>' : '') +
      '</div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr id="fl-th"></tr></thead>' +
      '<tbody id="fl-body"></tbody></table></div>';

    const th = container.querySelector('#fl-th');
    th.appendChild(document.createElement('th')).textContent = '文档';
    if (config.showMeta) config.showMeta.forEach(function (mf) {
      th.appendChild(document.createElement('th')).textContent = mf.label;
    });
    if (config.showCreated !== false) th.appendChild(document.createElement('th')).textContent = '上传时间';
    th.appendChild(document.createElement('th')).textContent = '操作';

    if (config.allowUpload !== false) {
      container.querySelector('#fl-up').addEventListener('click', function () { self.openUpload(container, config); });
    }
    if (config.filters && config.filters.length) {
      let fh = '';
      config.filters.forEach(function (fl) {
        fh += '<select class="input" data-filter="' + fl.key + '"><option value="">全部' + fl.label + '</option>';
        fl.options.forEach(function (o) { fh += '<option value="' + UI.esc(o) + '">' + UI.esc(o) + '</option>'; });
        fh += '</select>';
      });
      const fc = container.querySelector('#fl-filters');
      fc.innerHTML = fh;
      fc.querySelectorAll('[data-filter]').forEach(function (sel) {
        sel.addEventListener('change', function () { self.reload(container, config); });
      });
    }
    this.reload(container, config);
  },

  reload: function (container, config) {
    const self = this;
    const filters = {};
    if (config.filters) {
      container.querySelectorAll('[data-filter]').forEach(function (sel) {
        if (sel.value) filters[sel.getAttribute('data-filter')] = sel.value;
      });
    }
    DB.getItems(config.store).then(function (items) {
      items = items || [];
      items.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      const body = container.querySelector('#fl-body');
      body.innerHTML = '';
      items.forEach(function (it) {
        const meta = it.data || {};
        let pass = true;
        Object.keys(filters).forEach(function (k) { if (meta[k] !== filters[k]) pass = false; });
        if (!pass) return;
        const f = (it.files && it.files[0]) || {};
        const tr = document.createElement('tr');
        const tdName = document.createElement('td');
        tdName.innerHTML = '<span class="fc-icon">' + UI.fileIcon(f.name || '') + '</span> ' + UI.esc(f.name || '（无文件名）');
        tr.appendChild(tdName);
        if (config.showMeta) config.showMeta.forEach(function (mf) {
          const td = document.createElement('td'); td.textContent = meta[mf.key] || '—'; tr.appendChild(td);
        });
        if (config.showCreated !== false) {
          const td = document.createElement('td'); td.textContent = UI.fmtDate(it.createdAt); tr.appendChild(td);
        }
        const op = document.createElement('td'); op.className = 'cell-op';
        const showView = config.showView !== false;
        const showDl = config.showDownload !== false;
        let opHtml = '';
        if (showView) opHtml += '<a class="link" data-act="view">查看</a>';
        if (showDl) opHtml += '<a class="link" data-act="dl">下载</a>';
        if (config.allowDelete) opHtml += '<a class="link link-danger" data-act="del">删除</a>';
        op.innerHTML = opHtml;
        const fid = f.id;
        if (showView) op.querySelector('[data-act=view]').addEventListener('click', function () { if (fid) UI.previewFile(fid); });
        if (showDl) op.querySelector('[data-act=dl]').addEventListener('click', function () { if (fid) UI.downloadFile(fid); });
        if (config.allowDelete) {
          op.querySelector('[data-act=del]').addEventListener('click', function () {
            if (confirm('确定删除该文档？')) {
              (it.files || []).forEach(function (x) { DB.deleteFile(x.id); });
              DB.deleteItem(it.id).then(function () { UI.toast('已删除', 'success'); self.reload(container, config); });
            }
          });
        }
        tr.appendChild(op);
        body.appendChild(tr);
      });
      if (!body.children.length) {
        body.innerHTML = '<tr><td colspan="' + (1 + (config.showMeta ? config.showMeta.length : 0) +
          (config.showCreated !== false ? 1 : 0) + 1) + '" class="muted" style="text-align:center;padding:28px">暂无文档</td></tr>';
      }
    });
  },

  openUpload: function (container, config) {
    const self = this;
    let html = '<div class="upload-box" id="fl-drop">点击选择或拖拽文档到此（支持多格式：pdf / doc / docx / xls / xlsx / ppt / 图片 / txt 等）</div>' +
      '<input type="file" id="fl-input" multiple style="display:none">' +
      '<div class="file-list" id="fl-sel"></div>';
    if (config.metaFields && config.metaFields.length) {
      html += '<div class="form" style="margin-top:12px">';
      config.metaFields.forEach(function (mf) {
        html += '<div class="form-row' + (mf.full ? ' full' : '') + '"><label>' +
          (mf.required ? '<span class="req">*</span>' : '') + UI.esc(mf.label) + '</label>';
        if (mf.type === 'select') {
          html += '<select class="input" id="mf-' + mf.key + '">';
          (mf.options || []).forEach(function (o) { html += '<option value="' + UI.esc(o) + '">' + UI.esc(o) + '</option>'; });
          html += '</select>';
        } else {
          html += '<input class="input" id="mf-' + mf.key + '" type="text" placeholder="' + UI.esc(mf.placeholder || '') + '">';
        }
        html += '</div>';
      });
      html += '</div>';
    }
    const footer = '<button class="btn" id="fl-cancel">取消</button><button class="btn btn-primary" id="fl-save">保存上传</button>';
    const m = UI.openModal({ title: '上传 · ' + config.title, body: html, footer: footer, wide: true,
      onMount: function (ctx) {
        let selected = [];
        const drop = ctx.body.querySelector('#fl-drop');
        const input = ctx.body.querySelector('#fl-input');
        const listEl = ctx.body.querySelector('#fl-sel');
        drop.addEventListener('click', function () { input.click(); });
        drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('drag'); });
        drop.addEventListener('dragleave', function () { drop.classList.remove('drag'); });
        drop.addEventListener('drop', async function (e) {
          e.preventDefault(); drop.classList.remove('drag');
          selected = selected.concat(await UI.uploadFiles(e.dataTransfer.files));
          UI.renderFileList(listEl, selected, { allowRemove: true, onChange: function (nf) { selected = nf; } });
        });
        input.addEventListener('change', async function (e) {
          selected = selected.concat(await UI.uploadFiles(e.target.files));
          UI.renderFileList(listEl, selected, { allowRemove: true, onChange: function (nf) { selected = nf; } });
          e.target.value = '';
        });
        ctx.foot.querySelector('#fl-cancel').addEventListener('click', ctx.close);
        ctx.foot.querySelector('#fl-save').addEventListener('click', async function () {
          if (!selected.length) { UI.toast('请先选择文档', 'error'); return; }
          const meta = {};
          if (config.metaFields) {
            for (let i = 0; i < config.metaFields.length; i++) {
              const mf = config.metaFields[i];
              const v = ctx.body.querySelector('#mf-' + mf.key).value.trim();
              if (mf.required && !v) { UI.toast('请填写：' + mf.label, 'error'); return; }
              meta[mf.key] = v;
            }
          }
          for (let i = 0; i < selected.length; i++) {
            await DB.putItem({ id: DB.genId(), store: config.store, data: meta, files: [selected[i]], createdAt: Date.now() });
          }
          UI.toast('已上传 ' + selected.length + ' 个文档', 'success');
          ctx.close();
          self.reload(container, config);
        });
      }
    });
  }
};
