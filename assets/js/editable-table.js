// ============================================================
// 在线可编辑表格（团员工作 · 档案转出 / 档案接收）
//  - 上传本地表格文件（CSV / XLSX）自动填充
//  - 平台内自由编辑单元格（增删行列）
//  - 保存（本地持久化）、导出 CSV / XLSX
// ============================================================
window.EditableTable = {
  render: function (container, config) {
    const self = this;
    container.innerHTML =
      '<div class="page-head"><div><h2>' + UI.esc(config.title) + '</h2>' +
      '<p class="page-desc">在线可编辑表格：可上传本地表格文件，在平台内自由编辑单元格，支持保存与导出。</p></div></div>' +
      '<div class="toolbar">' +
      '<button class="btn" id="et-addrow">＋ 新增行</button>' +
      '<button class="btn" id="et-addcol">＋ 新增列</button>' +
      '<button class="btn" id="et-delrows">删除选中行</button>' +
      '<button class="btn" id="et-upload">⬆ 上传本地表格</button>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-primary" id="et-save">保存</button>' +
      '<button class="btn" id="et-csv">导出 CSV</button>' +
      '<button class="btn" id="et-xlsx">导出 XLSX</button>' +
      '</div>' +
      '<div class="table-wrap"><table class="etbl" id="etbl"></table></div>' +
      '<input type="file" id="et-file" accept=".csv,.xls,.xlsx" style="display:none">';

    this.grid = { headers: [], rows: [] };
    this.container = container;
    this.config = config;

    DB.getItems(config.store).then(function (items) {
      const found = (items || []).filter(function (i) { return i.id === config.store; })[0];
      if (found && found.data) {
        self.grid = found.data;
      } else {
        // 默认空表（含示例表头，便于直接录入）
        self.grid = { headers: ['序号', '姓名', '班级', '转接类型', '办理状态', '备注'], rows: [] };
      }
      self.draw();
    });

    container.querySelector('#et-addrow').addEventListener('click', function () { self.addRow(); });
    container.querySelector('#et-addcol').addEventListener('click', function () { self.addCol(); });
    container.querySelector('#et-delrows').addEventListener('click', function () { self.delRows(); });
    container.querySelector('#et-save').addEventListener('click', function () { self.save(); });
    container.querySelector('#et-csv').addEventListener('click', function () { self.exportCSV(); });
    container.querySelector('#et-xlsx').addEventListener('click', function () { self.exportXLSX(); });
    container.querySelector('#et-upload').addEventListener('click', function () { container.querySelector('#et-file').click(); });
    container.querySelector('#et-file').addEventListener('change', function (e) {
      self.importFile(e.target.files[0]); e.target.value = '';
    });
  },

  draw: function () {
    const self = this;
    const tbl = this.container.querySelector('#etbl');
    const g = this.grid;
    tbl.innerHTML = '';
    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    hr.innerHTML = '<th class="et-idx">#</th>';
    g.headers.forEach(function (h, i) {
      const th = document.createElement('th');
      th.innerHTML = '<div class="et-hcell" contenteditable="true">' + UI.esc(h) + '</div>' +
        '<button class="et-delcol" title="删除该列">×</button>';
      th.querySelector('.et-hcell').addEventListener('input', function (e) { g.headers[i] = e.target.textContent; });
      th.querySelector('.et-delcol').addEventListener('click', function () { self.delCol(i); });
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    tbl.appendChild(thead);

    const tbody = document.createElement('tbody');
    g.rows.forEach(function (row, r) {
      const tr = document.createElement('tr');
      const idxTd = document.createElement('td');
      idxTd.className = 'et-idx';
      idxTd.innerHTML = '<input type="checkbox" class="row-sel">' + (r + 1);
      tr.appendChild(idxTd);
      for (let c = 0; c < g.headers.length; c++) {
        const td = document.createElement('td');
        td.contentEditable = 'true';
        td.textContent = row[c] != null ? row[c] : '';
        td.addEventListener('input', function (e) { row[c] = e.target.textContent; });
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    if (!g.rows.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td class="et-idx"></td><td colspan="' + g.headers.length +
        '" class="muted" style="text-align:center;padding:24px">暂无数据，点击「上传本地表格」或「新增行」开始录入</td>';
      tbody.appendChild(tr);
    }
  },

  addRow: function () {
    const empties = this.grid.headers.map(function () { return ''; });
    this.grid.rows.push(empties);
    this.draw();
  },
  addCol: function () {
    this.grid.headers.push('新列');
    this.grid.rows.forEach(function (row) { row.push(''); });
    this.draw();
  },
  delRows: function () {
    const tbl = this.container.querySelector('#etbl');
    const checks = tbl.querySelectorAll('.row-sel');
    const toDel = [];
    checks.forEach(function (c, i) { if (c.checked) toDel.push(i); });
    if (!toDel.length) { UI.toast('请先勾选要删除的行', 'error'); return; }
    toDel.sort(function (a, b) { return b - a; }).forEach(function (i) { this.grid.rows.splice(i, 1); }, this);
    this.draw();
  },
  delCol: function (i) {
    this.grid.headers.splice(i, 1);
    this.grid.rows.forEach(function (row) { row.splice(i, 1); });
    this.draw();
  },

  save: function () {
    const rec = { id: this.config.store, store: this.config.store, data: this.grid, updatedAt: Date.now() };
    DB.putItem(rec).then(function () { UI.toast('已保存表格', 'success'); });
  },

  importFile: function (file) {
    const self = this;
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'csv') {
      file.text().then(function (text) { self.grid = parseCSV(text); self.draw(); UI.toast('已载入 CSV', 'success'); });
    } else if ((ext === 'xlsx' || ext === 'xls') && window.XLSX) {
      file.arrayBuffer().then(function (buf) {
        const wb = window.XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const aoa = window.XLSX.utils.sheet_to_json(ws, { header: 1 });
        self.grid = aoaToGrid(aoa);
        self.draw(); UI.toast('已载入 XLSX', 'success');
      });
    } else if ((ext === 'xlsx' || ext === 'xls')) {
      UI.toast('需联网加载表格解析组件，请改用 CSV 或刷新页面后重试', 'error');
    } else {
      UI.toast('不支持的文件格式', 'error');
    }
  },

  exportCSV: function () {
    const g = this.grid;
    const lines = [g.headers.map(csvCell)];
    g.rows.forEach(function (row) { lines.push(row.map(csvCell)); });
    const csv = '﻿' + lines.map(function (l) { return l.join(','); }).join('\r\n');
    downloadText(csv, (this.config.exportName || this.config.title) + '.csv', 'text/csv');
    UI.toast('已导出 CSV', 'success');
  },

  exportXLSX: function () {
    const g = this.grid;
    if (!window.XLSX) { this.exportCSV(); UI.toast('未加载 XLSX 组件，已导出 CSV 格式', 'info'); return; }
    const aoa = [g.headers].concat(g.rows);
    const ws = window.XLSX.utils.aoa_to_sheet(aoa);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    window.XLSX.writeFile(wb, (this.config.exportName || this.config.title) + '.xlsx');
    UI.toast('已导出 XLSX', 'success');
  }
};

// ---------- CSV / 表格工具 ----------
function csvCell(v) {
  v = v == null ? '' : String(v);
  if (/[",\r\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', i = 0, inQ = false;
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  while (i < text.length) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQ = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  // 去除完全空白的尾行
  while (rows.length && rows[rows.length - 1].every(function (c) { return (c || '').trim() === ''; })) rows.pop();
  if (!rows.length) return { headers: ['列1'], rows: [] };
  const headers = rows.shift();
  const rrows = rows.map(function (r) {
    const arr = [];
    for (let c = 0; c < headers.length; c++) arr.push(r[c] || '');
    return arr;
  });
  return { headers: headers, rows: rrows };
}
function aoaToGrid(aoa) {
  if (!aoa || !aoa.length) return { headers: ['列1'], rows: [] };
  const headers = aoa[0].map(function (h) { return h == null ? '' : String(h); });
  const rows = aoa.slice(1).map(function (r) {
    const arr = [];
    for (let c = 0; c < headers.length; c++) arr.push(r[c] == null ? '' : String(r[c]));
    return arr;
  });
  return { headers: headers, rows: rows };
}
function downloadText(text, filename, mime) {
  const blob = new Blob([text], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
}
