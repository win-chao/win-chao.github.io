'use strict';

const { months, demoKols, initialRows, reportsFor, settlementName, money } = window.kolSettlement;
const { filename: sampleFilename, base64: sampleData } = window.kolDemoWorkbook;
const labels = { upload: '上傳月報', kols: 'KOL 維護', overview: 'KOL 總覽', reports: '報表下載', ledger: '畸零數紀錄' };
const $ = (selector, root = document) => root.querySelector(selector);
const main = $('#main');
const modal = $('#modal');
const sourceMonth = months.at(-1);
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const sampleBytes = () => Uint8Array.from(atob(sampleData), (character) => character.charCodeAt(0));
const getKol = (code) => state.kols.find((kol) => kol.code === code);
const getReports = () => state.kols.map((kol) => reportsFor(kol, state.records).find((report) => report.month === state.month));
const badge = (report) => `<span class="demo-badge ${report.status}">${report.label}</span>`;
const routes = { upload: renderUpload, kols: renderKols, overview: renderOverview, reports: renderReports, ledger: renderLedger };

let state = defaults();
let toastTimer;
let preview;
let version = 0;

function defaults() {
  return { view: 'upload', month: '2026-05', kols: demoKols.map((kol) => ({ ...kol })), records: { ...initialRows }, file: null, upload: null, query: '', filter: 'all' };
}

function notify(message, error = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', error);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

function heading(title, description, actions) {
  return `<div class="page-heading"><div><h1>${title}</h1><p class="subtitle">${description}</p></div>${actions || `<div class="month-chip">資料月份 <strong>${state.month}</strong></div>`}</div>`;
}

function statistics() {
  const reports = getReports();
  const entries = [
    ['已建立 KOL', state.kols.length, '人', '每個行銷碼僅保留一筆', '◉'],
    ['可下載報表', reports.filter((row) => row.status === 'ready').length, '份', '依所選月份結算', '↓'],
    ['待季末結算', reports.filter((row) => row.status === 'partial').length, '份', '季末資料匯入後結算', '＋'],
    ['需要確認', reports.filter((row) => row.status === 'error').length, '筆', '來源核對或出帳金額異常', '!']
  ];
  return `<div class="stats">${entries.map(([label, value, unit, detail, icon], index) =>
    `<div class="stat ${index > 1 ? 'warm' : ''}"><span class="stat-label">${label}</span><span class="stat-icon" aria-hidden="true">${icon}</span><div class="stat-value">${value}<small>${unit}</small></div><p class="stat-note">${detail}</p></div>`
  ).join('')}</div>`;
}

function renderUpload() {
  const feedback = state.upload;
  const result = feedback
    ? `<div class="result-panel"><strong>${feedback.month} ${feedback.replaced ? '已更新' : '匯入完成'}・${feedback.count} 位 KOL</strong><p>已讀取「特殊營獎」並重算出帳及結餘。</p><div class="demo-result-choices"><a class="btn text" href="#reports">前往報表下載</a><a class="btn text" href="#kols">前往 KOL 維護</a></div></div>`
    : '';
  return heading('上傳月報', '上傳當月薪獎表，自動整理 KOL 資料、結算金額與報表。') + statistics() + `
  <div class="upload-grid">
    <section class="card"><div class="card-head"><div><h2>匯入薪獎 Excel</h2><p>載入範例 Excel，查看 2026 年 6 月的特殊營獎與季末結算。</p></div><span class="small-label">.XLSX</span></div>
      <form id="upload-form" class="card-body">
        <label class="dropzone" id="dropzone" for="upload-file"><span class="file-symbol"><span>XLS</span></span><strong id="file-title">${state.file ? safe(state.file.name) : '拖曳檔案到這裡，或 <b>選擇檔案</b>'}</strong><small id="file-desc">使用本頁的 2026 年 6 月範例</small>
          <input class="hidden-input" id="upload-file" type="file" accept=".xlsx" aria-label="選擇薪獎 Excel">
        </label>
        <div class="sample-pick"><button type="button" class="btn" data-sample>載入範例 Excel</button><a href="./assets/${encodeURIComponent(sampleFilename)}" download>下載範例檔</a></div>
        <div class="demo-upload-controls"><button class="btn primary" id="upload-submit" type="submit" ${state.file ? '' : 'disabled'}>匯入並更新報表</button></div>
        <p class="hint">同月重新匯入會取代上次的示範資料，並重新計算結餘。</p>
        <p class="demo-issue" id="upload-error" role="alert" hidden></p>
        <div id="upload-feedback">${result}</div>
      </form>
    </section>
    <aside class="card guide demo-upload-guide"><div class="card-head"><h2>上傳流程</h2></div><div class="steps">
      <div class="step"><div class="step-content"><h3>辨識年月與 KOL</h3><p>由 Excel 讀取資料月份及行銷碼。</p></div></div>
      <div class="step"><div class="step-content"><h3>核對獎金與結餘</h3><p>依月結或季結及 A／B／A+B 結算。</p></div></div>
      <div class="step"><div class="step-content"><h3>查看報表</h3><p>在瀏覽器預覽，並下載該期 Excel。</p></div></div>
    </div></aside>
  </div>`;
}

function controls(hasPeriod = true, types = []) {
  return `<div class="toolbar">
    ${hasPeriod ? `<div class="demo-periods" role="group" aria-label="資料月份">${months.map((month) => `<button class="btn" type="button" data-month="${month}" aria-pressed="${state.month === month}">${month}</button>`).join('')}</div>` : ''}
    <span class="spacer"></span><input class="search" id="search" placeholder="搜尋行銷碼或姓名" aria-label="搜尋行銷碼或姓名" value="${safe(state.query)}">
    ${types.length ? `<select class="filter" id="filter" aria-label="報表篩選"><option value="all">全部報表</option>${types.map(([id, label]) => `<option value="${id}" ${state.filter === id ? 'selected' : ''}>${label}</option>`).join('')}</select>` : ''}
  </div>`;
}

const matchesSearch = (kol) => (kol.code + ' ' + kol.name).toLowerCase().includes(state.query.toLowerCase());
const reportFilter = (report) => matchesSearch(report) && (state.filter === 'all' || report.status === state.filter || report.settlement === state.filter);

function table(headers, rows, className = '') {
  return rows.length ? `<div class="table-wrap demo-table ${className}" tabindex="0"><table><thead><tr>${headers.map((header) =>
    `<th scope="col"${header[1] ? ' class="number"' : ''}>${header[0]}</th>`
  ).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : '<div class="empty"><strong>沒有符合條件的資料</strong></div>';
}

function kolsTable() {
  const rows = state.kols.filter(matchesSearch).map((kol) => `<tr data-code="${kol.code}">
    <td><strong>${kol.code}</strong></td><td>${safe(kol.name)}</td><td>${settlementName(kol)}</td><td>${kol.payment}</td><td class="number">${money(kol.pocket)}</td><td class="number">${money(kol.opening)}</td><td><button type="button" class="btn" data-edit="${kol.code}">編輯</button></td>
  </tr>`);
  return table([['行銷碼'], ['KOL 姓名'], ['結算方式'], ['出帳方式'], ['口袋出帳（目前）', true], ['期初結餘', true], ['操作']], rows);
}

function renderKols() {
  return heading('KOL 維護', '設定每位 KOL 的結算方式、出帳方式及合作金額。') + controls(false) + `<section class="card" id="data-table">${kolsTable()}</section>`;
}

function overviewTable() {
  const rows = getReports().filter(matchesSearch).map((report) => `<tr data-code="${report.code}">
    <td><strong>${report.code}</strong></td><td>${safe(report.name)}</td><td>${settlementName(report)} · ${report.payment}</td><td class="number">${money(report.sourceTotal)}</td><td class="number">${money(report.pocketPaid)}</td><td class="number">${money(report.otherPaid)}</td><td class="number">${money(report.closing)}</td><td>${badge(report)}</td>
  </tr>`);
  return table([['行銷碼'], ['KOL 姓名'], ['結算與出帳'], ['來源獎金', true], ['口袋出帳', true], ['金尉出帳', true], ['期末結餘', true], ['狀態']], rows, 'demo-overview');
}

function renderOverview() {
  return heading('KOL 總覽', '按月份查看來源獎金、出帳金額及期末結餘。') + controls() + `<section class="card" id="data-table">${overviewTable()}</section>`;
}

function reportTable() {
  const rows = getReports().filter(reportFilter).map((report) => `<tr data-code="${report.code}">
    <td><span class="report-name">${safe(report.name)}</span><span class="cell-secondary">${report.code}</span></td>
    <td>${report.period}<span class="cell-secondary">${settlementName(report)}・${report.payment}</span></td>
    <td class="number">${money(report.sourceTotal)}</td><td class="number">${money(report.paid)}</td><td class="number">${money(report.closing)}</td><td>${badge(report)}</td>
    <td><div class="actions"><button class="btn text" type="button" data-detail="${report.code}">明細</button>
      <button class="btn" type="button" data-preview="${report.code}" ${report.status === 'ready' ? '' : 'disabled'}>預覽 Excel</button></div></td>
  </tr>`);
  return table([['KOL'], ['結算期間'], ['已匯入獎金', true], ['實際發放', true], ['本次結餘', true], ['狀態'], ['操作']], rows, 'demo-report');
}

function renderReports() {
  return heading('報表下載', '月結依當月資料計算，季結於季末月份資料匯入後結算。') + controls(true, [['ready', '可下載'], ['monthly', '月結'], ['quarterly', '季結'], ['error', '需要處理']]) + `<section class="card" id="data-table">${reportTable()}</section>`;
}

function ledgerTable() {
  const rows = state.kols.filter(matchesSearch).map((kol) => {
    const periods = reportsFor(kol, state.records);
    return `<tr data-code="${kol.code}"><td><strong>${kol.code}</strong></td><td>${safe(kol.name)}</td><td>${settlementName(kol)}</td><td class="number">${money(kol.opening)}</td>
      ${periods.map((period) => `<td class="number">${money(period.closing)}</td>`).join('')}
    </tr>`;
  });
  return table([['行銷碼'], ['KOL 姓名'], ['結算方式'], ['期初結餘', true], ...months.map((month) => [month, true])], rows);
}

function renderLedger() {
  return heading('畸零數紀錄', '查看 A 的超額或未發放結餘，以及 B、A+B 的畸零數。') + controls(false) + `<section class="card" id="data-table">${ledgerTable()}</section>`;
}

function render() {
  document.querySelectorAll('[data-view]').forEach((button) => {
    const active = button.dataset.view === state.view;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  $('#breadcrumb').textContent = labels[state.view];
  main.innerHTML = routes[state.view]();
}

function updateTable() {
  const views = { kols: kolsTable, overview: overviewTable, reports: reportTable, ledger: ledgerTable };
  const target = $('#data-table');
  if (target && views[state.view]) target.innerHTML = views[state.view]();
}

function navigate(view) {
  if (!labels[view] || view === state.view) return;
  state.view = view;
  state.query = '';
  state.filter = 'all';
  if (modal.open) modal.close();
  render();
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function chooseFile(file) {
  state.file = file ?? null;
  $('#file-title').textContent = state.file?.name || '拖曳檔案到這裡，或選擇檔案';
  $('#upload-submit').disabled = !state.file;
  $('#upload-error').hidden = true;
}

async function readSample(file) {
  if (!file || !/\.xlsx$/i.test(file.name) || file.size > 100000) throw new Error('請選擇這個 Demo 隨附的 .xlsx 範例檔。');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const expected = sampleBytes();
  if (bytes.length !== expected.length || !bytes.every((byte, index) => byte === expected[index])) {
    throw new Error('此展示使用隨附的範例 Excel。請按「載入範例 Excel」。');
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const sheet = workbook.getWorksheet('薪獎表');
  const month = sheet.getCell('B1').value;
  if (month !== sourceMonth || sheet.getCell('A3').value !== '特殊營獎') throw new Error('找不到範例的資料月份或特殊營獎區塊。');
  const rows = [5, 6, 7].map((index) => {
    const [code, twVolume, foreignVolume, twRate, foreignRate, bonus] = sheet.getRow(index).values.slice(1);
    const tw = Math.floor(twVolume / 1000000) * twRate;
    const foreign = Math.floor(foreignVolume / 1000000) * foreignRate;
    return { code, tw, foreign, mismatch: tw + foreign !== bonus };
  });
  return { month, rows };
}

async function importFile(form) {
  const targetVersion = version;
  const submit = $('#upload-submit', form);
  const status = $('#upload-error', form);
  const file = state.file;
  submit.disabled = true;
  status.hidden = true;
  try {
    const { month, rows } = await readSample(file);
    if (version !== targetVersion) return;
    const replaced = Boolean(state.records[month]);
    state.records[month] = rows;
    state.month = month;
    state.upload = { month, count: rows.length, replaced };
    render();
    notify('已匯入範例 Excel，並更新報表');
  } catch (error) {
    if (version !== targetVersion || !form.isConnected) return;
    status.textContent = error.message;
    status.hidden = false;
    submit.disabled = false;
  }
}

function showModal(title, contents, actions = '<button type="button" class="btn" data-close>關閉</button>', className = '') {
  modal.className = className;
  modal.innerHTML = `<div class="modal-head"><h2 id="modal-title">${title}</h2><button type="button" class="close" data-close aria-label="關閉視窗">×</button></div>
    <div class="modal-body">${contents}</div><div class="modal-footer">${actions}</div>`;
  if (!modal.open) modal.showModal();
}

function editKol(code) {
  const kol = getKol(code);
  const paymentOptions = [['A', '固定口袋出帳'], ['B', '金尉出帳'], ['A+B', '由兩方出帳']];
  showModal('編輯 KOL', `<form id="kol-form" class="demo-settings" data-code="${code}">
    <p class="modal-intro">${code} · 儲存後重算示範期間的歷史報表。</p>
    <div class="form-grid">
      <label class="field"><span>KOL 姓名</span><input name="name" required maxlength="24" value="${safe(kol.name)}"></label>
      <label class="field"><span>結算方式</span><select name="settlement"><option value="monthly" ${kol.settlement === 'monthly' ? 'selected' : ''}>月結</option><option value="quarterly" ${kol.settlement === 'quarterly' ? 'selected' : ''}>季結</option></select></label>
      <label class="field"><span>口袋出帳（元）</span><input name="pocket" type="number" required min="0" max="1000000" step="1" value="${kol.pocket}" ${kol.payment === 'B' ? 'disabled' : ''}></label>
      <label class="field"><span>期初結餘（元）</span><input name="opening" type="number" required min="-1000000" max="1000000" step="1" value="${kol.opening}"></label>
    </div>
    <fieldset class="payment-field"><legend>出帳方式</legend><div class="payment-options">${paymentOptions.map(([id, label]) =>
      `<label class="payment-option"><input name="payment" type="radio" value="${id}" ${id === kol.payment ? 'checked' : ''}><span><strong>${id}</strong><small>${label}</small></span></label>`
    ).join('')}</div></fieldset>
    </form>`, '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="kol-form">儲存</button>');
}

function settlementDetail(report) {
  const summary = [
    ['期初結餘', report.opening], ['來源獎金', report.sourceTotal], ['應發', report.due], ['實際發放', report.paid],
    ['口袋出帳', report.pocketPaid], ['金尉出帳', report.otherPaid], ['期末結餘', report.closing]
  ];
  showModal(safe(report.name) + '・結算明細', `<p class="modal-intro">${report.period} · ${report.code} · ${settlementName(report)} · ${report.payment}</p>
    ${badge(report)}<dl class="demo-report-detail">${summary.map(([label, amount]) => `<dt>${label}</dt><dd>${money(amount)}</dd>`).join('')}</dl>`);
}

function statementRows(report) {
  return [
    { type: 'title', cells: ['KOL 薪獎結算表（模擬資料）'] },
    { type: 'meta', cells: [`${report.period} · ${report.code} · ${report.name} · ${settlementName(report)} / ${report.payment}`] },
    { type: 'head', cells: ['資料月份', '台股特殊營獎', '複委託特殊營獎', '來源獎金'] },
    ...report.sources.map(({ month, row }) => ({ cells: [month, row?.tw ?? null, row?.foreign ?? null, row ? row.tw + row.foreign : null] })),
    { type: 'total', cells: ['來源獎金合計', null, null, report.sourceTotal] },
    { cells: ['前期結餘', null, null, report.opening] },
    { cells: ['應發金額', null, null, report.due] },
    { type: 'total', cells: ['實際發放', null, null, report.paid] },
    { cells: ['口袋出帳', null, null, report.pocketPaid] },
    { cells: ['金尉出帳', null, null, report.otherPaid] },
    { type: 'total', cells: ['本期結餘', null, null, report.closing] }
  ];
}

function excelPreview(report) {
  if (report.status !== 'ready') return;
  const rows = statementRows(report);
  preview = { rows, filename: `薪獎_${report.code}_${report.period.replace(' ', '-')}.xlsx`, scale: 1, fullWidth: true };
  const cells = rows.map(({ type, cells }) => `<tr class="report-${type || 'row'}">
    ${type === 'title' || type === 'meta' ? `<td colspan="4">${safe(cells[0])}</td>` : cells.map((value) =>
      `<td${typeof value === 'number' ? ' class="number"' : ''}>${typeof value === 'number' ? money(value) : safe(value)}</td>`
    ).join('')}</tr>`).join('');
  showModal('Excel 預覽', `<div class="excel-preview-toolbar"><div class="preview-file"><span class="mini-file">XLS</span><span>${preview.filename}</span></div>
    <div class="preview-zoom" role="group" aria-label="預覽縮放"><button type="button" class="btn" data-zoom="out" aria-label="縮小預覽">−</button><output id="zoom-level" aria-live="polite"></output>
    <button type="button" class="btn" data-zoom="in" aria-label="放大預覽">＋</button><button type="button" class="btn" data-zoom="fit">符合寬度</button><button type="button" class="btn" data-zoom="actual">100%</button></div></div>
    <div class="excel-preview-viewport" tabindex="0" aria-label="Excel 工作表預覽"><div class="excel-preview-size"><div class="excel-preview-paper demo-preview-paper"><table class="excel-preview-table demo-preview-table" aria-label="薪獎結算表"><tbody>${cells}</tbody></table></div></div></div>
    <div class="excel-preview-bottom"><span class="preview-sheet-tab">薪獎結算表</span><span>模擬資料</span></div>`,
    '<button type="button" class="btn" data-close>關閉</button><button type="button" class="btn primary" data-download>下載 Excel</button>', 'excel-preview-modal');
  resizePreview();
}

function resizePreview() {
  if (!preview || !modal.open) return;
  const viewport = $('.excel-preview-viewport', modal);
  const paper = $('.excel-preview-paper', modal);
  const size = $('.excel-preview-size', modal);
  const paperWidth = paper.offsetWidth;
  if (preview.fullWidth) preview.scale = Math.min(1, Math.max(.4, (viewport.clientWidth - 40) / paperWidth));
  paper.style.transform = `scale(${preview.scale})`;
  size.style.width = paperWidth * preview.scale + 'px';
  size.style.height = paper.offsetHeight * preview.scale + 'px';
  $('#zoom-level', modal).textContent = Math.round(preview.scale * 100) + '%';
}

async function downloadExcel(button) {
  const current = preview;
  if (!current) return;
  button.disabled = true;
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('薪獎結算表');
    [25, 22, 23, 22].forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
    for (const { type, cells } of current.rows) {
      const row = sheet.addRow(cells);
      row.height = type === 'title' ? 31 : 22;
      if (type === 'title' || type === 'meta') sheet.mergeCells(row.number, 1, row.number, 4);
      const fill = { title: 'FFEED7E3', meta: 'FFFFF6FA', head: 'FFFAE9F1', total: 'FFFFF1D2' }[type];
      for (let column = 1; column <= 4; column++) {
        const cell = row.getCell(column);
        cell.font = { name: 'Microsoft JhengHei', size: type === 'title' ? 16 : 11, bold: ['title', 'head', 'total'].includes(type) };
        cell.alignment = { vertical: 'middle', horizontal: ['title', 'meta'].includes(type) ? 'center' : typeof cell.value === 'number' ? 'right' : 'left' };
        if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
        const rule = { style: 'thin', color: { argb: 'FF988B93' } };
        cell.border = { top: rule, left: rule, bottom: rule, right: rule };
        if (typeof cell.value === 'number') cell.numFmt = '#,##0';
      }
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const objectUrl = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = current.filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
    notify('已下載這次預覽的 Excel 報表');
  } catch {
    notify('Excel 報表產生失敗，請重新開啟預覽後再試。', true);
  } finally {
    button.disabled = false;
  }
}

function openAppearance() {
  const themes = [['pink', '柔和粉'], ['lavender', '薰衣草'], ['mint', '薄荷綠'], ['sky', '晴空藍']];
  showModal('外觀設定', `<div class="settings-themes">${themes.map(([id, label]) =>
    `<button type="button" class="btn" data-theme="${id}" aria-pressed="${(document.documentElement.dataset.theme || 'pink') === id}">${label}</button>`
  ).join('')}</div>`);
}

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => { location.hash = button.dataset.view; }));
window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || 'upload'));
window.addEventListener('resize', resizePreview);
$('#appearance-open').addEventListener('click', openAppearance);
$('#reset').addEventListener('click', () => {
  version++;
  if (modal.open) modal.close();
  preview = null;
  state = defaults();
  delete document.documentElement.dataset.theme;
  location.hash = 'upload';
  render();
  window.scrollTo(0, 0);
  notify('已重置所有展示資料');
});

main.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-sample')) chooseFile(new File([sampleBytes()], sampleFilename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  if (button.dataset.month) {
    state.month = button.dataset.month;
    render();
  }
  if (button.dataset.edit) editKol(button.dataset.edit);
  if (button.dataset.detail) settlementDetail(getReports().find((report) => report.code === button.dataset.detail));
  if (button.dataset.preview) excelPreview(getReports().find((report) => report.code === button.dataset.preview));
});

main.addEventListener('change', (event) => {
  if (event.target.id === 'upload-file') chooseFile(event.target.files[0]);
  if (event.target.id === 'filter') {
    state.filter = event.target.value;
    updateTable();
  }
});

main.addEventListener('input', (event) => {
  if (event.target.id !== 'search') return;
  state.query = event.target.value;
  updateTable();
});

main.addEventListener('dragover', (event) => {
  const zone = event.target.closest('#dropzone');
  if (!zone) return;
  event.preventDefault();
  zone.classList.add('dragging');
});
main.addEventListener('dragleave', (event) => event.target.closest('#dropzone')?.classList.remove('dragging'));
main.addEventListener('drop', (event) => {
  const zone = event.target.closest('#dropzone');
  if (!zone) return;
  event.preventDefault();
  zone.classList.remove('dragging');
  chooseFile(event.dataTransfer.files[0]);
});

main.addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.target.id === 'upload-form') void importFile(event.target);
});

modal.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-close')) modal.close();
  if (button.hasAttribute('data-download')) void downloadExcel(button);
  if (button.dataset.zoom && preview) {
    const action = button.dataset.zoom;
    preview.fullWidth = action === 'fit';
    if (action === 'actual') preview.scale = 1;
    if (action === 'in') preview.scale = Math.min(1.5, preview.scale + .1);
    if (action === 'out') preview.scale = Math.max(.4, preview.scale - .1);
    resizePreview();
  }
  if (button.dataset.theme) {
    document.documentElement.dataset.theme = button.dataset.theme;
    modal.querySelectorAll('[data-theme]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  }
});

modal.addEventListener('change', (event) => {
  if (event.target.name === 'payment') $('#kol-form', modal).elements.pocket.disabled = event.target.value === 'B';
});

modal.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  if (form.id !== 'kol-form') return;
  const fields = new FormData(form);
  const name = fields.get('name').trim();
  if (!name) {
    form.elements.name.setCustomValidity('請填寫 KOL 姓名。');
    form.elements.name.reportValidity();
    return;
  }
  Object.assign(getKol(form.dataset.code), {
    name, settlement: fields.get('settlement'), payment: fields.get('payment'),
    pocket: fields.get('payment') === 'B' ? 0 : Number(fields.get('pocket')), opening: Number(fields.get('opening'))
  });
  modal.close();
  render();
  notify('已更新 KOL 設定與結算結果');
});

modal.addEventListener('input', (event) => {
  if (event.target.name === 'name') event.target.setCustomValidity('');
});
modal.addEventListener('close', () => { preview = null; });

const firstView = location.hash.slice(1);
if (labels[firstView]) state.view = firstView;
render();
