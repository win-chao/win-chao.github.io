'use strict';

const {
  months,
  demoKols,
  initialRows,
  initialImports,
  initialMetabase,
  reportsFor,
  settlementName,
  effectivePocketAt,
  effectivePaymentAt,
  money
} = window.kolSettlement;
const { filename: sampleFilename, base64: sampleData } = window.kolDemoWorkbook;
const labels = { upload: '上傳月報', kols: 'KOL 維護', overview: 'KOL 總覽', reports: '報表下載', ledger: '畸零數紀錄' };
const $ = (selector, root = document) => root.querySelector(selector);
const main = $('#main');
const modal = $('#modal');
const sourceMonth = months.at(-1);
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const sampleBytes = () => Uint8Array.from(atob(sampleData), (character) => character.charCodeAt(0));
const getKol = (code) => state.kols.find((kol) => kol.code === code);
const activeKols = () => state.kols.filter((kol) => !kol.deleted);
const deletedKols = () => state.kols.filter((kol) => kol.deleted);
const getReports = () => activeKols().map((kol) => reportsFor(kol, state.records, state.overrides).find((report) => report.month === state.month));
const badge = (report) => `<span class="demo-badge ${report.status}">${report.label}</span>`;

let state = defaults();
let toastTimer;
let preview;
let version = 0;

function cloneKol(kol) {
  return {
    ...kol,
    pocketChanges: (kol.pocketChanges || []).map((c) => ({ ...c })),
    paymentChanges: (kol.paymentChanges || []).map((c) => ({ ...c }))
  };
}

function defaults() {
  return {
    view: 'upload',
    month: '2026-05',
    kols: demoKols.map(cloneKol),
    records: { ...initialRows },
    imports: Object.fromEntries(Object.entries(initialImports).map(([k, v]) => [k, { ...v }])),
    overrides: {},
    metabaseSynced: { '2026-04': true, '2026-05': true, '2026-06': false },
    showDeletedKols: false,
    file: null,
    upload: null,
    query: '',
    filter: 'all',
    nextChangeId: 10
  };
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
  return `<div class="page-heading"><div><div class="eyebrow">KOL BONUS WORKSPACE</div><h1>${title}</h1><p class="subtitle">${description}</p></div>${actions || `<div class="month-chip">資料月份 <strong>${state.month}</strong></div>`}</div>`;
}

function statistics() {
  const reports = getReports();
  const entries = [
    ['已建立 KOL', activeKols().length, '人', '每個行銷碼僅保留一筆', '◉'],
    ['可下載報表', reports.filter((row) => row.status === 'ready').length, '份', '依所選月份結算', '↓'],
    ['待季末結算', reports.filter((row) => row.status === 'partial').length, '份', '季末資料匯入後結算', '＋'],
    ['需要確認', reports.filter((row) => row.status === 'error').length, '筆', '來源核對或出帳金額異常', '!']
  ];
  return `<div class="stats">${entries.map(([label, value, unit, detail, icon], index) =>
    `<div class="stat ${index > 1 ? 'warm' : ''}"><span class="stat-label">${label}</span><span class="stat-icon" aria-hidden="true">${icon}</span><div class="stat-value">${value}<small>${unit}</small></div><p class="stat-note">${detail}</p></div>`
  ).join('')}</div>`;
}

function renderImportHistoryCard() {
  const list = Object.values(state.imports).sort((a, b) => b.month.localeCompare(a.month));
  return `<section class="card import-history-card">
    <div class="card-head"><div><h2>匯入紀錄（已匯入月份清單）</h2><p>支援保留原始檔版本、刪除該月來源並連動重算後續結餘。</p></div><span class="small-label">${list.length} 期</span></div>
    ${list.length ? `<div class="table-wrap"><table><thead><tr><th>資料月份</th><th>來源檔案</th><th>KOL 筆數</th><th>上傳時間</th><th>狀態</th><th></th></tr></thead><tbody>
      ${list.map((item) => `<tr>
        <td><strong>${safe(item.month)}</strong></td>
        <td>${safe(item.filename)}</td>
        <td>${item.count} 筆</td>
        <td class="muted">${safe(item.uploadedAt)}</td>
        <td><span class="demo-badge ready">${safe(item.status)}</span></td>
        <td><button type="button" class="btn text danger" data-delete-import="${safe(item.month)}">刪除來源</button></td>
      </tr>`).join('')}
    </tbody></table></div>` : '<div class="empty"><strong>目前沒有已匯入的月報</strong></div>'}
  </section>`;
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
  </div>` + renderImportHistoryCard();
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
  const source = state.showDeletedKols ? deletedKols() : activeKols();
  const rows = source.filter(matchesSearch).map((kol) => {
    const pocketNow = effectivePocketAt(kol, state.month);
    const paymentNow = effectivePaymentAt(kol, state.month);
    const coop = (kol.coopStart || kol.coopEnd) ? `${safe(kol.coopStart || '未填')} ～ ${safe(kol.coopEnd || '未填')}` : '<span class="muted">尚未填寫</span>';
    const actions = state.showDeletedKols
      ? `<button type="button" class="btn" data-restore-kol="${kol.code}">恢復 KOL</button>`
      : `<button type="button" class="btn text" data-edit="${kol.code}">編輯 →</button><button type="button" class="btn text danger" data-delete-kol="${kol.code}">刪除</button>`;
    return `<tr data-code="${kol.code}">
      <td><strong>${kol.code}</strong></td>
      <td>${kol.name ? safe(kol.name) : '<span class="muted">尚未填寫</span>'}</td>
      <td>${coop}</td>
      <td>${settlementName(kol)}</td>
      <td>${paymentNow}</td>
      <td class="number">${paymentNow === 'B' ? '—' : money(pocketNow)}</td>
      <td class="number">${money(kol.opening)}</td>
      <td class="muted">${safe(kol.openingMonth || '2026-04')}</td>
      <td><div class="actions">${actions}</div></td>
    </tr>`;
  });
  return table([
    ['行銷碼'], ['KOL 姓名'], ['合作期間（民國）'], ['結算方式'], ['出帳方式'],
    ['平台出帳（目前）', true], ['期初結餘', true], ['期初適用月份'], ['操作']
  ], rows);
}

function renderKols() {
  const deletedCount = deletedKols().length;
  const actions = `<div class="actions">
    <button type="button" class="btn" id="toggle-deleted-kols">${state.showDeletedKols ? '返回使用中 KOL' : `已刪除 KOL (${deletedCount})`}</button>
    <button type="button" class="btn primary" id="add-kol-btn">＋ 新增 KOL</button>
  </div>`;
  return heading(state.showDeletedKols ? '已刪除 KOL' : 'KOL 維護', state.showDeletedKols ? '原有設定與歷史資料保留。可隨時按「恢復 KOL」。' : '設定每位 KOL 的合作期間（民國）、結算方式、出帳方式及按月生效異動。', actions)
    + controls(false)
    + `<section class="card" id="data-table">${kolsTable()}</section>`;
}

function overviewTable() {
  const synced = Boolean(state.metabaseSynced[state.month]);
  const monthMeta = initialMetabase[state.month] || {};
  const rows = getReports().filter(matchesSearch).map((report) => {
    const mb = synced ? monthMeta[report.code] : null;
    return `<tr data-code="${report.code}">
      <td><strong>${report.code}</strong></td>
      <td>${safe(report.name)}</td>
      <td>${settlementName(report)} · ${report.payment}</td>
      <td class="number">${mb ? money(mb.opened) : '<span class="muted">未同步</span>'}</td>
      <td class="number">${mb ? money(mb.total) : '<span class="muted">未同步</span>'}</td>
      <td class="number">${money(report.sourceTotal)}</td>
      <td class="number">${money(report.pocketPaid)}</td>
      <td class="number">${money(report.otherPaid)}</td>
      <td class="number">${money(report.closing)}</td>
      <td>${badge(report)}</td>
    </tr>`;
  });
  return table([
    ['行銷碼'], ['KOL 姓名'], ['結算與出帳'], ['當月新戶數', true], ['總客戶數', true],
    ['來源獎金', true], ['平台出帳', true], ['合作方出帳', true], ['期末結餘', true], ['狀態']
  ], rows, 'demo-overview');
}

function renderOverview() {
  const synced = Boolean(state.metabaseSynced[state.month]);
  const actions = `<div class="actions">
    <button type="button" class="btn" id="sync-metabase">${synced ? '↻ 重新同步新戶人數（數據後台）' : '↻ 同步新戶人數（數據後台）'}</button>
    <button type="button" class="btn primary" id="export-overview">↓ 匯出總覽 Excel</button>
  </div>`;
  return heading('KOL 總覽', '按月份查看數據後台新戶數、來源獎金、出帳金額及期末結餘。', actions)
    + controls()
    + `<section class="card" id="data-table">${overviewTable()}</section>
       <p class="ledger-note">總客戶數取數據後台同月客戶總數；未同步時顯示未同步，可點右上角「同步新戶人數」取得該月新戶數據。</p>`;
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
  const rows = activeKols().filter(matchesSearch).map((kol) => {
    const periods = reportsFor(kol, state.records, state.overrides);
    return `<tr data-code="${kol.code}"><td><strong>${kol.code}</strong></td><td>${safe(kol.name)}</td><td>${settlementName(kol)}</td><td class="number">${money(kol.opening)}</td>
      ${periods.map((period) => `<td class="number">${money(period.closing)}${period.override ? '<span class="manual-flag">人工調整</span>' : ''}</td>`).join('')}
    </tr>`;
  });
  return table([['行銷碼'], ['KOL 姓名'], ['結算方式'], ['期初結餘', true], ...months.map((month) => [month, true])], rows);
}

function renderLedger() {
  const overridesList = Object.entries(state.overrides);
  const actions = `<div class="actions">
    <button type="button" class="btn" id="adjust-opening-btn">修正首次期初結餘</button>
    <button type="button" class="btn" id="adjust-closing-btn">設定指定月份期末結餘</button>
    <button type="button" class="btn primary" id="export-ledger-btn">↓ 下載結餘 Excel</button>
  </div>`;
  return heading('畸零數紀錄', '同時管理 A 的超額／未發放結餘，以及 B、A+B 的畸零數，支援人工調整與連動重算。', actions)
    + controls(false)
    + `<section class="card" id="data-table">${ledgerTable()}</section>`
    + (overridesList.length ? `<section class="card adjustment-card"><div class="card-head"><h2>期末結餘人工調整</h2><span class="small-label">保留調整紀錄，連動重算</span></div><div class="table-wrap"><table><thead><tr><th>KOL</th><th>期末結餘所屬月份</th><th class="number">調整後金額</th><th>原因</th><th></th></tr></thead><tbody>${overridesList.map(([key, o]) => `<tr><td>${safe(o.code)}</td><td>${safe(o.month)}</td><td class="number">${money(o.amount)}</td><td>${safe(o.note || '人工設定')}</td><td><button type="button" class="btn text danger" data-remove-override="${safe(key)}">還原自動計算</button></td></tr>`).join('')}</tbody></table></div></section>` : '');
}

const routes = { upload: renderUpload, kols: renderKols, overview: renderOverview, reports: renderReports, ledger: renderLedger };

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
  const titleEl = $('#file-title');
  const submitEl = $('#upload-submit');
  const errEl = $('#upload-error');
  if (titleEl) titleEl.textContent = state.file?.name || '拖曳檔案到這裡，或選擇檔案';
  if (submitEl) submitEl.disabled = !state.file;
  if (errEl) errEl.hidden = true;
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
    state.imports[month] = {
      month,
      filename: file.name,
      uploadedAt: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(Date.now()),
      count: rows.length,
      status: replaced ? '已更新' : '已匯入'
    };
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

function pocketHistoryBlock(kol) {
  const changes = kol.pocketChanges || [];
  const items = changes.map((c) => `<li class="pocket-history-item ${c.superseded || c.deleted ? 'superseded' : ''}">
    <div><strong>${safe(c.month)} ${c.deleted ? '異動已刪除' : `起：${money(c.amount)} 元`}</strong>${c.superseded ? ' <span class="muted">（已取代）</span>' : ''}</div>
    <small>${safe(c.actor || '系統')}・${safe(c.createdAt)}${c.note ? '・' + safe(c.note) : ''}</small>
    ${!c.superseded && !c.deleted ? `<button type="button" class="btn text" data-pocket-correct="${safe(kol.code)}" data-change-id="${c.id}">更正</button><button type="button" class="btn text danger" data-pocket-delete="${safe(kol.code)}" data-change-id="${c.id}">刪除異動</button>` : ''}
  </li>`).join('');
  return `<div class="pocket-history-section full">
    <div class="pocket-amount-line">
      <span>目前有效平台出帳（${safe(state.month)}）：<strong>${kol.payment === 'B' ? '—' : money(effectivePocketAt(kol, state.month)) + ' 元'}</strong></span>
      <button type="button" class="btn text" data-pocket-add="${safe(kol.code)}">＋ 新增異動</button>
    </div>
    <details class="pocket-history" open><summary>平台出帳異動紀錄 (${changes.length})</summary>
      <div class="pocket-history-content"><ul>${items}<li class="pocket-history-item"><strong>初始金額：${money(kol.pocket)} 元</strong></li></ul></div>
    </details>
    <div id="pocket-change-panel"></div>
  </div>`;
}

function paymentHistoryBlock(kol) {
  const changes = kol.paymentChanges || [];
  const items = changes.map((c) => `<li class="pocket-history-item ${c.superseded ? 'superseded' : ''}">
    <div><strong>${safe(c.month)} 起：${safe(c.previous)} → ${safe(c.mode)}</strong></div>
    <small>${safe(c.createdAt)} · ${safe(c.actor)}</small>
  </li>`).join('');
  return `<div class="payment-change-section full">
    <div class="pocket-amount-line">
      <span>出帳方式異動（按生效年月分段切換）</span>
      <button type="button" class="btn text" data-payment-add="${safe(kol.code)}">＋ 新增出帳方式異動</button>
    </div>
    <details class="pocket-history" ${changes.length ? 'open' : ''}><summary>出帳方式異動紀錄 (${changes.length})</summary>
      <div class="pocket-history-content"><ul>${items}<li class="pocket-history-item">初始方式：${safe(kol.payment)}</li></ul></div>
    </details>
    <div id="payment-change-panel"></div>
  </div>`;
}

function editKol(code) {
  const kol = getKol(code);
  const paymentOptions = [['A', '固定平台出帳'], ['B', '合作方出帳'], ['A+B', '由兩方出帳']];
  showModal('編輯 KOL', `<form id="kol-form" class="demo-settings" data-code="${code}">
    <p class="modal-intro">${code} · 儲存後重算示範期間的歷史報表。</p>
    <div class="form-grid">
      <label class="field"><span>KOL 姓名</span><input name="name" maxlength="24" value="${safe(kol.name)}"></label>
      <label class="field"><span>結算方式</span><select name="settlement"><option value="monthly" ${kol.settlement === 'monthly' ? 'selected' : ''}>月結</option><option value="quarterly" ${kol.settlement === 'quarterly' ? 'selected' : ''}>季結</option></select></label>
      <label class="field"><span>合作起日（民國）</span><input name="coopStart" placeholder="115/01/01" value="${safe(kol.coopStart || '')}"></label>
      <label class="field"><span>合作迄日（民國）</span><input name="coopEnd" placeholder="115/12/31" value="${safe(kol.coopEnd || '')}"></label>
      <label class="field"><span>初始平台出帳（元）</span><input name="pocket" type="number" required min="0" max="1000000" step="1" value="${kol.pocket}" ${kol.payment === 'B' ? 'disabled' : ''}></label>
      <label class="field"><span>期初結餘（元）</span><input name="opening" type="number" required min="-1000000" max="1000000" step="1" value="${kol.opening}"></label>
    </div>
    <fieldset class="payment-field"><legend>出帳方式</legend><div class="payment-options">${paymentOptions.map(([id, label]) =>
      `<label class="payment-option"><input name="payment" type="radio" value="${id}" ${id === kol.payment ? 'checked' : ''}><span><strong>${id}</strong><small>${label}</small></span></label>`
    ).join('')}</div></fieldset>
    ${pocketHistoryBlock(kol)}
    ${paymentHistoryBlock(kol)}
    </form>`, '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="kol-form">儲存</button>');
}

function openAddKolModal() {
  showModal('新增 KOL', `<form id="add-kol-form" class="demo-settings">
    <div class="form-grid">
      <label class="field"><span>行銷碼 *</span><input name="code" required maxlength="20" placeholder="例如 DEMO-104"></label>
      <label class="field"><span>KOL 姓名</span><input name="name" maxlength="24" placeholder="選填"></label>
      <label class="field"><span>結算方式</span><select name="settlement"><option value="monthly">月結</option><option value="quarterly">季結</option></select></label>
      <label class="field"><span>出帳方式</span><select name="payment"><option value="A">A · 固定平台</option><option value="B">B · 合作方出帳</option><option value="A+B">A+B · 兩方出帳</option></select></label>
      <label class="field"><span>合作起日（民國）</span><input name="coopStart" value="115/01/01"></label>
      <label class="field"><span>合作迄日（民國）</span><input name="coopEnd" value="115/12/31"></label>
      <label class="field"><span>平台出帳（元）</span><input name="pocket" type="number" min="0" value="10000"></label>
      <label class="field"><span>期初結餘（元）</span><input name="opening" type="number" value="0"></label>
    </div>
  </form>`, '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="add-kol-form">建立 KOL</button>');
}

function settlementDetail(report) {
  const summary = [
    ['期初結餘', report.opening], ['來源獎金', report.sourceTotal], ['應發', report.due], ['實際發放', report.paid],
    ['平台出帳', report.pocketPaid], ['合作方出帳', report.otherPaid], ['期末結餘', report.closing]
  ];
  showModal(safe(report.name) + '・結算明細', `<p class="modal-intro">${report.period} · ${report.code} · ${settlementName(report)} · ${report.payment}</p>
    ${badge(report)}<dl class="demo-report-detail">${summary.map(([label, amount]) => `<dt>${label}</dt><dd>${money(amount)}</dd>`).join('')}</dl>`);
}

function statementRows(report) {
  return [
    { type: 'title', cells: ['KOL 薪獎結算表（模擬資料）'] },
    { type: 'meta', cells: [`${report.period} · ${report.code} · ${report.name} · ${settlementName(report)} / ${report.payment}`] },
    { type: 'head', cells: ['資料月份', '方案 A 專案獎金', '方案 B 專案獎金', '來源獎金'] },
    ...report.sources.map(({ month, row }) => ({ cells: [month, row?.tw ?? null, row?.foreign ?? null, row ? row.tw + row.foreign : null] })),
    { type: 'total', cells: ['來源獎金合計', null, null, report.sourceTotal] },
    { cells: ['前期結餘', null, null, report.opening] },
    { cells: ['應發金額', null, null, report.due] },
    { type: 'total', cells: ['實際發放', null, null, report.paid] },
    { cells: ['平台出帳', null, null, report.pocketPaid] },
    { cells: ['合作方出帳', null, null, report.otherPaid] },
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

async function downloadWorkbook(filename, sheetName, headerRow, dataRows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headerRow);
  dataRows.forEach((r) => sheet.addRow(r));
  const buffer = await workbook.xlsx.writeBuffer();
  const objectUrl = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
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
  if (button.dataset.deleteImport) {
    const m = button.dataset.deleteImport;
    delete state.records[m];
    delete state.imports[m];
    if (state.upload?.month === m) state.upload = null;
    render();
    notify(`已刪除 ${m} 來源月報，並重算後續期間結餘。`);
  }
  if (button.id === 'toggle-deleted-kols') {
    state.showDeletedKols = !state.showDeletedKols;
    render();
  }
  if (button.id === 'add-kol-btn') openAddKolModal();
  if (button.dataset.deleteKol) {
    const k = getKol(button.dataset.deleteKol);
    if (k) { k.deleted = true; render(); notify(`已刪除 ${k.code}（可於「已刪除 KOL」隨時恢復）`); }
  }
  if (button.dataset.restoreKol) {
    const k = getKol(button.dataset.restoreKol);
    if (k) { k.deleted = false; state.showDeletedKols = false; render(); notify(`已恢復 ${k.code}`); }
  }
  if (button.id === 'sync-metabase') {
    state.metabaseSynced[state.month] = true;
    render();
    notify(`已完成 ${state.month} 數據後台新戶人數同步（模擬）。`);
  }
  if (button.id === 'export-overview') {
    const synced = Boolean(state.metabaseSynced[state.month]);
    const monthMeta = initialMetabase[state.month] || {};
    const rows = getReports().map((r) => [
      r.code, r.name, `${settlementName(r)}・${r.payment}`,
      synced ? (monthMeta[r.code]?.opened ?? 0) : '未同步',
      synced ? (monthMeta[r.code]?.total ?? 0) : '未同步',
      r.sourceTotal ?? 0, r.pocketPaid ?? 0, r.otherPaid ?? 0, r.closing ?? 0
    ]);
    void downloadWorkbook(`KOL總覽_${state.month}.xlsx`, 'KOL總覽', ['行銷碼', 'KOL 姓名', '結算與出帳', '當月新戶數', '總客戶數', '來源獎金', '平台出帳', '合作方出帳', '期末結餘'], rows);
    notify('已匯出 KOL 總覽 Excel');
  }
  if (button.id === 'export-ledger-btn') {
    const rows = activeKols().map((k) => {
      const periods = reportsFor(k, state.records, state.overrides);
      return [k.code, k.name, settlementName(k), k.opening, ...periods.map((p) => p.closing ?? '')];
    });
    void downloadWorkbook('畸零數結餘總表.xlsx', '畸零數紀錄', ['行銷碼', 'KOL 姓名', '結算方式', '期初結餘', ...months], rows);
    notify('已下載畸零數結餘 Excel');
  }
  if (button.id === 'adjust-opening-btn') {
    showModal('修正首次期初結餘', `<form id="opening-form" class="demo-settings"><div class="form-grid">
      <label class="field"><span>選擇 KOL</span><select name="code">${activeKols().map((k) => `<option value="${k.code}">${k.code} · ${safe(k.name)}</option>`).join('')}</select></label>
      <label class="field"><span>期初結餘（元）</span><input name="opening" type="number" required value="${activeKols()[0]?.opening ?? 0}"></label>
    </div></form>`, '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="opening-form">儲存重算</button>');
  }
  if (button.id === 'adjust-closing-btn') {
    showModal('設定指定月份期末結餘', `<form id="override-form" class="demo-settings"><div class="form-grid">
      <label class="field"><span>選擇 KOL</span><select name="code">${activeKols().map((k) => `<option value="${k.code}">${k.code} · ${safe(k.name)}</option>`).join('')}</select></label>
      <label class="field"><span>所屬月份</span><select name="month">${months.map((m) => `<option value="${m}">${m}</option>`).join('')}</select></label>
      <label class="field"><span>調整後金額（元）</span><input name="amount" type="number" required value="0"></label>
      <label class="field"><span>調整原因</span><input name="note" maxlength="60" placeholder="例如：人工核對折讓"></label>
    </div></form>`, '<button type="button" class="btn" data-close>取消</button><button type="submit" class="btn primary" form="override-form">套用並重算</button>');
  }
  if (button.dataset.removeOverride) {
    delete state.overrides[button.dataset.removeOverride];
    render();
    notify('已還原該筆期末結餘的自動計算');
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
  if (button.dataset.pocketAdd || button.dataset.pocketCorrect) {
    const code = button.dataset.pocketAdd || button.dataset.pocketCorrect;
    const kol = getKol(code);
    const changeId = button.dataset.changeId ? Number(button.dataset.changeId) : null;
    const orig = changeId ? kol.pocketChanges.find((c) => c.id === changeId) : null;
    $('#pocket-change-panel', modal).innerHTML = `<div class="pocket-change-editor">
      <strong>${orig ? '更正平台出帳異動' : '新增平台出帳異動'}</strong>
      <div class="form-grid">
        <label class="field"><span>生效月份</span><input id="pc-month" type="month" value="${orig ? orig.month : state.month}"></label>
        <label class="field"><span>新金額（元）</span><input id="pc-amount" type="number" min="0" value="${orig ? orig.amount : kol.pocket}"></label>
        <label class="field full"><span>備註</span><input id="pc-note" value="${safe(orig?.note || '')}" placeholder="例如：合約調整"></label>
      </div>
      <p class="hint" id="pc-impact"></p>
      <div class="pocket-change-actions"><button type="button" class="btn" id="pc-cancel">取消</button><button type="button" class="btn primary" id="pc-save" data-pc-code="${code}" data-pc-orig="${changeId || ''}">套用異動</button></div>
    </div>`;
    const updateImpact = () => {
      const m = $('#pc-month', modal).value;
      $('#pc-impact', modal).textContent = `${m} 起使用新金額，生效月份之前不變，之後期間與結餘將自動重算。`;
    };
    $('#pc-month', modal).oninput = updateImpact;
    $('#pc-cancel', modal).onclick = () => { $('#pocket-change-panel', modal).innerHTML = ''; };
    updateImpact();
  }
  if (button.id === 'pc-save') {
    const kol = getKol(button.dataset.pcCode);
    const origId = button.dataset.pcOrig ? Number(button.dataset.pcOrig) : null;
    if (origId) {
      const old = kol.pocketChanges.find((c) => c.id === origId);
      if (old) old.superseded = true;
    }
    kol.pocketChanges.unshift({
      id: state.nextChangeId++,
      month: $('#pc-month', modal).value,
      amount: Number($('#pc-amount', modal).value),
      note: $('#pc-note', modal).value.trim(),
      actor: '業務部',
      createdAt: '剛剛',
      superseded: false,
      deleted: false
    });
    editKol(kol.code);
    render();
    notify('已新增平台出帳異動並重算結餘');
  }
  if (button.dataset.pocketDelete) {
    const kol = getKol(button.dataset.pocketDelete);
    const cid = Number(button.dataset.changeId);
    const c = kol.pocketChanges.find((item) => item.id === cid);
    if (c) c.deleted = true;
    editKol(kol.code);
    render();
    notify('已刪除異動並回溯前一筆有效金額重算');
  }
  if (button.dataset.paymentAdd) {
    const code = button.dataset.paymentAdd;
    const kol = getKol(code);
    $('#payment-change-panel', modal).innerHTML = `<div class="pocket-change-editor">
      <strong>新增出帳方式異動</strong>
      <div class="form-grid">
        <label class="field"><span>生效年月</span><input id="pm-month" type="month" value="${state.month}"></label>
        <label class="field"><span>新出帳方式</span><select id="pm-mode"><option value="A">A · 平台方</option><option value="B">B · 合作方</option><option value="A+B">A+B · 平台＋合作方</option></select></label>
      </div>
      <div class="pocket-change-actions"><button type="button" class="btn" id="pm-cancel">取消</button><button type="button" class="btn primary" id="pm-save" data-pm-code="${code}">套用異動</button></div>
    </div>`;
    $('#pm-cancel', modal).onclick = () => { $('#payment-change-panel', modal).innerHTML = ''; };
    $('#pm-save', modal).onclick = () => {
      kol.paymentChanges.unshift({
        id: state.nextChangeId++,
        month: $('#pm-month', modal).value,
        previous: effectivePaymentAt(kol, $('#pm-month', modal).value),
        mode: $('#pm-mode', modal).value,
        actor: '業務部',
        createdAt: '剛剛',
        superseded: false
      });
      editKol(kol.code);
      render();
      notify('已新增出帳方式分段異動');
    };
  }
});

modal.addEventListener('change', (event) => {
  if (event.target.name === 'payment' && $('#kol-form', modal)) {
    $('#kol-form', modal).elements.pocket.disabled = event.target.value === 'B';
  }
});

modal.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  const fields = new FormData(form);
  if (form.id === 'kol-form') {
    const kol = getKol(form.dataset.code);
    Object.assign(kol, {
      name: fields.get('name').trim(),
      settlement: fields.get('settlement'),
      payment: fields.get('payment'),
      coopStart: fields.get('coopStart').trim(),
      coopEnd: fields.get('coopEnd').trim(),
      pocket: fields.get('payment') === 'B' ? 0 : Number(fields.get('pocket')),
      opening: Number(fields.get('opening'))
    });
    modal.close();
    render();
    notify('已更新 KOL 設定與結算結果');
  } else if (form.id === 'add-kol-form') {
    const code = fields.get('code').trim().toUpperCase();
    if (!code || getKol(code)) {
      notify('行銷碼不可空白或與現有重複', true);
      return;
    }
    state.kols.push({
      code,
      name: fields.get('name').trim(),
      settlement: fields.get('settlement'),
      payment: fields.get('payment'),
      pocket: fields.get('payment') === 'B' ? 0 : Number(fields.get('pocket')),
      opening: Number(fields.get('opening')),
      openingMonth: '2026-04',
      coopStart: fields.get('coopStart').trim(),
      coopEnd: fields.get('coopEnd').trim(),
      deleted: false,
      pocketChanges: [],
      paymentChanges: []
    });
    state.showDeletedKols = false;
    modal.close();
    render();
    notify(`已新增 ${code}`);
  } else if (form.id === 'opening-form') {
    const k = getKol(fields.get('code'));
    if (k) k.opening = Number(fields.get('opening'));
    modal.close();
    render();
    notify('已修正首次期初結餘並重算');
  } else if (form.id === 'override-form') {
    const code = fields.get('code');
    const month = fields.get('month');
    state.overrides[`${code}/${month}`] = {
      code,
      month,
      amount: Number(fields.get('amount')),
      note: fields.get('note').trim()
    };
    modal.close();
    render();
    notify(`已設定 ${code} 於 ${month} 的期末結餘人工調整`);
  }
});

modal.addEventListener('close', () => { preview = null; });

const firstView = location.hash.slice(1);
if (labels[firstView]) state.view = firstView;
render();
