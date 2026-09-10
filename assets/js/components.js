// ============================================================
// 通用 UI 组件：Modal / Toast / 文件上传·预览·下载 / 记录列表 / 文件库
// ============================================================
window.UI = (function () {
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }
  function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function fmtDay(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  // ---------- Modal ----------
  let modalRoot = null;
  function ensureRoot() {
    if (!modalRoot) modalRoot = document.getElementById('modal-root');
    return modalRoot;
  }
  function openModal(opts) {
    const root = ensureRoot();
    root.innerHTML = '';
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box' + (opts.wide ? ' modal-wide' : '');
    box.innerHTML =
      '<div class="modal-head"><span class="modal-title">' + esc(opts.title || '') + '</span>' +
      '<button class="modal-close" title="关闭">×</button></div>' +
      '<div class="modal-body"></div>' +
      '<div class="modal-foot"></div>';
    overlay.appendChild(box);
    root.appendChild(overlay);
    overlay.classList.add('show');
    const body = box.querySelector('.modal-body');
    const foot = box.querySelector('.modal-foot');
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);
    if (opts.footer) foot.innerHTML = opts.footer;
    const close = function () { overlay.remove(); };
    box.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    // 绑定按钮回调
    if (opts.onMount) opts.onMount({ body: body, foot: foot, close: close, box: box });
    return { close: close, body: body, foot: foot, box: box };
  }

  // ---------- Toast ----------
  function toast(msg, type) {
    let host = document.getElementById('toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toast-host';
      document.body.appendChild(host);
    }
    const t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'info');
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 300);
    }, 2400);
  }

  // ---------- 文件：上传 / 预览 / 下载 ----------
  async function uploadFiles(fileList) {
    const arr = Array.prototype.slice.call(fileList);
    const metas = [];
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      const id = DB.genId();
      await DB.putFile({ id: id, name: f.name, type: f.type, size: f.size, blob: f, createdAt: Date.now() });
      metas.push({ id: id, name: f.name, type: f.type, size: f.size });
    }
    return metas;
  }

  function fileIcon(name) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    const map = { png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', webp: '🖼️', bmp: '🖼️',
      pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗', ppt: '📙', pptx: '📙',
      txt: '📄', csv: '📊', zip: '🗜️', rar: '🗜️', mp4: '🎬', mp3: '🎵' };
    return map[ext] || '📎';
  }

  async function downloadFile(fileId) {
    const f = await DB.getFile(fileId);
    if (!f) { toast('文件不存在', 'error'); return; }
    const url = URL.createObjectURL(f.blob);
    const a = document.createElement('a');
    a.href = url; a.download = f.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  async function previewFile(fileId) {
    const f = await DB.getFile(fileId);
    if (!f) { toast('文件不存在', 'error'); return; }
    const url = URL.createObjectURL(f.blob);
    const type = (f.type || '').toLowerCase();
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    let content = '';
    const footer = '<button class="btn btn-primary" id="pv-dl">下载</button>';

    if (type.indexOf('image/') === 0) {
      content = '<div class="prev-img"><img src="' + url + '" alt="' + esc(f.name) + '"></div>';
    } else if (type === 'application/pdf' || ext === 'pdf') {
      content = '<iframe class="prev-frame" src="' + url + '"></iframe>';
    } else if (ext === 'txt' || ext === 'csv' || ext === 'md' || type.indexOf('text/') === 0) {
      try {
        const text = await f.blob.text();
        content = '<pre class="prev-text">' + esc(text) + '</pre>';
      } catch (e) { content = '<div class="prev-tip">该文件暂不支持在线预览，请下载查看。</div>'; }
    } else if (ext === 'docx' && window.mammoth) {
      try {
        const arr = await f.blob.arrayBuffer();
        const result = await window.mammoth.convertToHtml({ arrayBuffer: arr });
        content = '<div class="prev-doc">' + result.value + '</div>';
      } catch (e) { content = '<div class="prev-tip">文档解析失败，请下载查看。</div>'; }
    } else if ((ext === 'xlsx' || ext === 'xls') && window.XLSX) {
      try {
        const arr = await f.blob.arrayBuffer();
        const wb = window.XLSX.read(arr, { type: 'array' });
        let html = '';
        wb.SheetNames.forEach(function (sn) {
          html += '<h4>' + esc(sn) + '</h4>' + window.XLSX.utils.sheet_to_html(wb.Sheets[sn]);
        });
        content = '<div class="prev-doc">' + html + '</div>';
      } catch (e) { content = '<div class="prev-tip">表格解析失败，请下载查看。</div>'; }
    } else {
      content = '<div class="prev-tip">该格式（' + esc(ext || type || '未知') + '）暂不支持在线预览，请点击下方按钮下载查看。</div>';
    }

    const m = openModal({
      title: '预览：' + f.name, body: content, footer: footer, wide: true,
      onMount: function (ctx) {
        ctx.box.querySelector('#pv-dl').addEventListener('click', function () { downloadFile(fileId); });
        // 关闭时释放 URL
        const obs = new MutationObserver(function () { if (!ctx.box.isConnected) { URL.revokeObjectURL(url); obs.disconnect(); } });
        obs.observe(document.getElementById('modal-root'), { childList: true });
      }
    });
  }

  // 渲染附件列表（可点击预览/下载，可选删除）
  function renderFileList(container, files, opts) {
    opts = opts || {};
    container.innerHTML = '';
    if (!files || !files.length) {
      container.innerHTML = '<span class="muted">暂无附件</span>';
      return;
    }
    files.forEach(function (f) {
      const chip = document.createElement('div');
      chip.className = 'file-chip';
      chip.innerHTML =
        '<span class="fc-icon">' + fileIcon(f.name) + '</span>' +
        '<span class="fc-name" title="' + esc(f.name) + '">' + esc(f.name) + '</span>' +
        '<span class="fc-size">' + fmtSize(f.size) + '</span>' +
        (opts.allowRemove ? '<button class="fc-del" title="移除">×</button>' : '');
      chip.querySelector('.fc-name').addEventListener('click', function () { previewFile(f.id); });
      chip.querySelector('.fc-icon').addEventListener('click', function () { previewFile(f.id); });
      if (opts.allowRemove) {
        chip.querySelector('.fc-del').addEventListener('click', function () {
          const idx = files.indexOf(f);
          if (idx > -1) files.splice(idx, 1);
          renderFileList(container, files, opts);
          if (opts.onChange) opts.onChange(files);
        });
      }
      container.appendChild(chip);
    });
  }

  return {
    esc: esc, fmtSize: fmtSize, fmtDate: fmtDate, fmtDay: fmtDay,
    openModal: openModal, toast: toast, uploadFiles: uploadFiles,
    downloadFile: downloadFile, previewFile: previewFile,
    renderFileList: renderFileList, fileIcon: fileIcon
  };
})();
