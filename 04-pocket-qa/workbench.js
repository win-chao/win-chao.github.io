(function () {
  'use strict';

  const { catalog, createPortal } = window.pocketScenarios;
  const flows = new Map(catalog.map((flow) => [flow.id, flow]));
  const $ = (selector) => document.querySelector(selector);
  const testPage = $('#test-page');
  const portal = createPortal(testPage);
  const dialog = $('#detail-dialog');
  const storageKey = 'pocket-qa-portfolio-history-v1';
  const timestamp = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const clock = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const statusStyle = {
    PASS: ['通過', 'CircleCheck'], FAIL: ['失敗', 'CircleX'], RUNNING: ['執行中', 'Play'],
    PENDING: ['等待中', 'Clock3'], PAUSED: ['已暫停', 'Pause'], STOPPED: ['已停止', 'Square'], NOT_RUN: ['未執行', 'Circle']
  };
  const modeName = { normal: '正常流程', fault: '故障示範' };
  const escapeTable = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => escapeTable[character]);
  const icon = (name) => window.pocketIcons[name] ?? '';
  const seconds = (milliseconds) => (milliseconds / 1000).toFixed(1) + ' 秒';
  const pngPattern = /^data:image\/png;base64,[a-z\d+/=]+$/i;
  const state = {
    view: 'plan', queue: [], lastRun: null, history: loadHistory(), visibleRun: null,
    selected: null, allLogs: false, control: null, nextEntry: 1
  };
  state.queue = catalog.map((flow) => entry(flow.id));

  function loadHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(saved) ? saved.filter((run) => run?.id && run.startedAt && Array.isArray(run.rows) && Array.isArray(run.events)).slice(0, 8) : [];
    } catch {
      return [];
    }
  }

  function saveHistory(run) {
    state.history = [run, ...state.history].slice(0, 8);
    for (let count = state.history.length; count > 0; count--) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state.history.slice(0, count)));
        return true;
      } catch {
        // Large screenshots may exceed a browser's per-origin capacity.
      }
    }
    return false;
  }

  function entry(id, mode) {
    return { seq: state.nextEntry++, flowId: id, mode: mode ?? (flows.get(id).configurable ? 'fault' : 'normal') };
  }

  function statusLabel(code) {
    return (statusStyle[code] ?? statusStyle.NOT_RUN)[0];
  }

  function status(code) {
    const [label, glyph] = statusStyle[code] ?? statusStyle.NOT_RUN;
    const style = statusStyle[code] ? code : 'NOT_RUN';
    return `<span class="status-pill ${style}">${icon(glyph)}${label}</span>`;
  }

  function iconButton(label, glyph, attributes, disabled = false) {
    return `<button type="button" class="icon-button" aria-label="${safe(label)}" title="${safe(label)}" ${attributes}${disabled ? ' disabled' : ''}>${icon(glyph)}</button>`;
  }

  function empty(title, text = '') {
    return `<div class="empty">${icon('ListChecks')}<strong>${title}</strong>${text ? `<p>${text}</p>` : ''}</div>`;
  }

  function notice(text) {
    $('#status-message').textContent = text ? '· ' + text : '';
  }

  function renderCatalog() {
    const query = $('#search').value.trim().toLowerCase();
    const groups = [...new Set(catalog.map((flow) => flow.group))];
    $('#catalog').innerHTML = groups.map((name) => {
      const matching = catalog.filter((flow) => flow.group === name && (flow.label + ' ' + flow.id).toLowerCase().includes(query));
      if (!matching.length) return '';
      return `<section class="catalog-group"><h3>${name}</h3>${matching.map((flow) =>
        `<button type="button" class="catalog-item" data-add="${flow.id}" aria-label="加入 ${flow.label}" ${state.control ? 'disabled' : ''}>
          <span><strong>${flow.label}</strong><small>${flow.id} · ${flow.description}</small></span><span>${icon('CirclePlus')}</span>
        </button>`
      ).join('')}</section>`;
    }).join('') || '<p class="muted">沒有符合的流程。</p>';
  }

  function renderPlan() {
    $('#queue-count').textContent = state.queue.length + ' 項';
    $('#clear-queue').disabled = !state.queue.length;
    $('#queue').innerHTML = state.queue.length ? state.queue.map((item, index) => {
      const flow = flows.get(item.flowId);
      const number = index + 1;
      return `<li class="queue-row" data-entry="${item.seq}"><span class="queue-index">${String(number).padStart(2, '0')}</span>
        <div><strong class="queue-title">${flow.label}</strong><div class="queue-sub"><span>${flow.id} · ${flow.steps.length} 個步驟</span>
          ${flow.configurable ? `<select class="mode-select" data-mode="${item.seq}" aria-label="第 ${number} 項測試情境"><option value="normal" ${item.mode === 'normal' ? 'selected' : ''}>正常流程</option><option value="fault" ${item.mode === 'fault' ? 'selected' : ''}>故障示範</option></select>` : '<span>本機示範</span>'}
        </div></div><div class="actions queue-actions">
          ${iconButton('上移第 ' + number + ' 項', 'ArrowUp', `data-move="-1" data-seq="${item.seq}"`, index === 0)}
          ${iconButton('下移第 ' + number + ' 項', 'ArrowDown', `data-move="1" data-seq="${item.seq}"`, number === state.queue.length)}
          ${iconButton('只跑第 ' + number + ' 項', 'Play', `data-run-one="${item.seq}"`)}
          ${iconButton('移除第 ' + number + ' 項', 'X', `data-remove="${item.seq}"`)}
        </div></li>`;
    }).join('') : `<li>${empty('尚未加入測試流程', '從左側加入測試流程，或使用常用組合。')}</li>`;
  }

  function totals(run) {
    const counts = { PASS: 0, FAIL: 0, NOT_RUN: 0 };
    for (const row of run.rows) {
      if (row.status in counts) counts[row.status]++;
    }
    return counts;
  }

  function renderResults() {
    const run = state.visibleRun;
    const layout = $('#result-layout');
    layout.hidden = !run;
    if (!run) {
      $('#results-summary').innerHTML = `<div class="section-head"><h1 id="results-heading">執行結果</h1></div>${empty('尚無執行結果', '選擇流程並按「開始測試」。')}`;
      return;
    }
    const live = run === state.lastRun && Boolean(state.control);
    const counts = totals(run);
    const resultText = live && state.control.paused ? 'PAUSED' : run.status;
    const selected = run.rows.find((row) => row.index === state.selected) ?? run.rows[0];
    $('#results-summary').innerHTML = `<div class="run-header">
      <div class="section-head"><div class="heading-group"><h1 id="results-heading">執行結果</h1>${status(resultText)}</div>
        <div class="actions">
          ${!live && run.report ? `<button class="button" type="button" data-open-report="${safe(run.id)}">${icon('FileText')}開啟報告</button>` : ''}
          ${!live && counts.FAIL ? `<button class="button" type="button" data-rerun="${safe(run.id)}">${icon('RotateCcw')}失敗重測</button>` : ''}
          ${run !== state.lastRun && state.lastRun ? '<button class="button" type="button" data-current>回到本次執行</button>' : ''}</div></div>
      <div class="run-meta muted"><span>Demo · 本機瀏覽器</span><time datetime="${safe(run.startedAt)}">${safe(timestamp.format(new Date(run.startedAt)))}</time></div>
      <div class="run-counts"><strong class="pass" id="pass-count">${counts.PASS} 通過</strong><strong class="fail" id="fail-count">${counts.FAIL} 失敗</strong><span>${counts.NOT_RUN} 未執行</span><span class="elapsed">${seconds(run.elapsed)}</span></div>
    </div>`;
    $('#result-list').innerHTML = run.rows.map((row) => `<button type="button" class="result-item" data-result="${row.index}" aria-pressed="${row === selected}"><strong>${safe(row.label)}</strong>
      <progress class="${safe(row.status)}" max="${row.total}" value="${row.steps.length}" aria-label="${safe(row.label)}進度"></progress>
      <span class="result-item-meta">${status(row.status)}<span>${seconds(row.elapsed)}</span></span></button>`).join('');
    const entries = state.allLogs ? run.events : run.events.filter((event) => event.index === selected.index);
    const evidenceRows = state.allLogs ? run.rows.filter((row) => row.status === 'FAIL') : selected.status === 'FAIL' ? [selected] : [];
    $('#result-log').innerHTML = `<section class="result-log" aria-label="執行日誌">
      <div class="log-head"><div class="segments" aria-label="紀錄範圍"><button type="button" data-log="one" aria-pressed="${!state.allLogs}">此流程</button><button type="button" data-log="all" aria-pressed="${state.allLogs}">完整紀錄</button></div>
        ${entries.length ? `<button type="button" class="button" data-download-log="${safe(run.id)}">${icon('Download')}下載紀錄</button>` : ''}</div>
      <div class="log-text" tabindex="0">${entries.length ? `<ul>${entries.map((event) =>
        `<li class="${safe(event.level)}"><time>${safe(clock.format(new Date(event.at)))}</time> ${safe(event.step)} ${safe(event.message)}</li>`
      ).join('')}</ul>` : '<p class="muted">等待此流程開始。</p>'}</div>
      ${evidenceRows.length ? `<div class="evidence-list">${evidenceRows.map((row) => `
        <button type="button" class="button" data-open-error="${safe(run.id)}" data-row="${row.index}">${icon('FileText')}錯誤診斷 · ${safe(row.flowId)}</button>
        ${row.evidence && pngPattern.test(row.evidence.png) ? `<button type="button" class="button" data-open-image="${safe(run.id)}" data-row="${row.index}">${icon('Image')}錯誤截圖 · ${safe(row.flowId)}</button>` : row.captureError ? `<span class="muted">${safe(row.captureError)}</span>` : ''}
      `).join('')}</div>` : ''}</section>`;
    if (live) {
      const log = $('.log-text');
      log.scrollTop = log.scrollHeight;
    }
    $('#test-browser').hidden = run !== state.lastRun || !(live || run.keepBrowser);
  }

  function renderHistory() {
    $('#history-count').textContent = state.history.length + ' 筆';
    $('#history-list').innerHTML = state.history.length ? state.history.map((run) => {
      const counts = totals(run);
      return `<div class="history-row">${status(run.status)}<div><strong>${safe(timestamp.format(new Date(run.startedAt)))}</strong><span class="muted">${run.rows.length} 個流程 · ${counts.PASS} 通過 · ${counts.FAIL} 失敗 · ${seconds(run.elapsed)}</span></div>
        <div class="actions"><button type="button" class="button" data-open-run="${safe(run.id)}">開啟紀錄</button>
          ${run.report ? `<button type="button" class="button" data-open-report="${safe(run.id)}">${icon('FileText')}開啟報告</button>` : ''}</div></div>`;
    }).join('') : empty('尚無執行紀錄', '完成一次測試後，可從這裡重開紀錄、報告與截圖。');
  }

  function render() {
    const active = Boolean(state.control);
    $('#start').hidden = active;
    $('#start').disabled = !state.queue.length;
    $('#start-label').textContent = `開始測試（${state.queue.length}）`;
    $('#pause').hidden = !active;
    $('#stop').hidden = !active;
    if (active) $('#pause').innerHTML = state.control.paused ? icon('Play') + '繼續' : icon('Pause') + '暫停';
    $('#with-report').disabled = active;
    $('#keep-browser').disabled = active;
    document.querySelectorAll('[data-view]').forEach((button) => {
      const selected = state.view === button.dataset.view;
      button.disabled = active && !selected;
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    for (const view of ['plan', 'results', 'history']) $('#view-' + view).hidden = state.view !== view;
    renderCatalog();
    if (state.view === 'plan') renderPlan();
    else if (state.view === 'results') renderResults();
    else renderHistory();
  }

  function viewRun(run) {
    state.visibleRun = run;
    state.selected = run?.rows.find((row) => row.status === 'FAIL')?.index ?? run?.rows[0]?.index;
    state.allLogs = false;
    state.view = 'results';
    render();
  }

  function findRun(id) {
    return state.lastRun?.id === id ? state.lastRun : state.history.find((run) => run.id === id);
  }

  function eventAt(run, row, step, message, level) {
    run.events.push({ index: row.index, at: Date.now(), step, message, level });
  }

  function wait(milliseconds, signal) {
    if (signal.aborted) return Promise.reject(signal.reason);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort);
        resolve();
      }, milliseconds);
      function abort() {
        clearTimeout(timer);
        reject(signal.reason);
      }
      signal.addEventListener('abort', abort, { once: true });
    });
  }

  async function nextStep(control, milliseconds) {
    await wait(milliseconds, control.abort.signal);
    while (control.paused) await wait(120, control.abort.signal);
  }

  async function captureFailure(row, step) {
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const bound = testPage.getBoundingClientRect();
      if (!bound.width || !bound.height || !window.html2canvas) throw new Error('測試畫面尚未就緒');
      const canvas = await window.html2canvas(testPage, { scale: 1.5, backgroundColor: '#f5f9f9', logging: false });
      const png = canvas.toDataURL('image/png');
      if (!pngPattern.test(png) || !canvas.width || !canvas.height) throw new Error('未取得有效 PNG');
      row.evidence = { png, width: canvas.width, height: canvas.height, filename: step.id.replace('.', '-') + '-error.png' };
    } catch (error) {
      row.captureError = '擷取失敗畫面時發生錯誤。' + error.message;
    }
  }

  async function runFlow(run, row, control) {
    const flow = flows.get(row.flowId);
    const started = performance.now();
    row.status = 'RUNNING';
    state.selected = row.index;
    portal.reset(row.mode);
    notice('正在執行 ' + row.label);
    renderResults();
    for (let index = 0; index < flow.steps.length; index++) {
      const test = flow.steps[index];
      const id = row.flowId + '.' + String(index + 1).padStart(2, '0');
      await nextStep(control, 120);
      eventAt(run, row, id, '執行 ' + test.action, 'RUNNING');
      renderResults();
      await nextStep(control, 320);
      let outcome;
      try {
        outcome = test.run(testPage);
      } catch (error) {
        outcome = { pass: false, actual: error.message };
      }
      const step = { id, action: test.action, expected: test.expected, actual: outcome.actual, status: outcome.pass ? 'PASS' : 'FAIL' };
      row.steps.push(step);
      row.elapsed = performance.now() - started;
      eventAt(run, row, id, statusLabel(step.status) + ' · ' + step.actual, step.status);
      if (!outcome.pass) {
        row.status = 'FAIL';
        await captureFailure(row, step);
        if (row.evidence) eventAt(run, row, id, '已擷取 ' + row.evidence.filename, 'PENDING');
        else eventAt(run, row, id, row.captureError, 'FAIL');
        break;
      }
      renderResults();
    }
    if (row.status === 'RUNNING') row.status = 'PASS';
    row.elapsed = performance.now() - started;
    renderResults();
  }

  async function startRun(queue) {
    if (state.control || !queue.length) return;
    const control = { abort: new AbortController(), paused: false };
    const run = {
      id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      startedAt: new Date().toISOString(), status: 'RUNNING', elapsed: 0,
      report: $('#with-report').checked, keepBrowser: $('#keep-browser').checked, events: [],
      rows: queue.map((item, index) => {
        const flow = flows.get(item.flowId);
        return { index, flowId: flow.id, label: flow.label, mode: item.mode, total: flow.steps.length, steps: [], elapsed: 0, status: 'PENDING' };
      })
    };
    state.control = control;
    state.lastRun = run;
    viewRun(run);
    const started = performance.now();
    let stopped = false;
    try {
      for (const row of run.rows) {
        await nextStep(control, 130);
        await runFlow(run, row, control);
        run.elapsed = performance.now() - started;
      }
    } catch (error) {
      stopped = control.abort.signal.aborted;
      const row = run.rows.find((item) => item.status === 'RUNNING');
      if (row) {
        row.status = stopped ? 'STOPPED' : 'FAIL';
        eventAt(run, row, row.flowId, stopped ? '執行已停止' : '執行器錯誤 · ' + error.message, row.status);
      }
      if (!stopped) run.problem = error.message;
    }
    if (control.abort.signal.aborted) stopped = true;
    for (const row of run.rows) {
      if (row.status === 'PENDING') row.status = 'NOT_RUN';
    }
    run.elapsed = performance.now() - started;
    run.status = stopped ? 'STOPPED' : run.problem || totals(run).FAIL ? 'FAIL' : 'PASS';
    state.control = null;
    if (dialog.open && dialog.querySelector('[data-stop-now]')) dialog.close();
    const saved = saveHistory(run);
    viewRun(run);
    notice((stopped ? '測試已停止' : '測試已完成') + (saved ? '，可開啟執行紀錄' : '，紀錄保留在此分頁'));
  }

  function showDialog(title, body, footer = '') {
    dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-heading">${safe(title)}</h2>${iconButton('關閉視窗', 'X', 'data-close')}</div>
      <div class="dialog-body">${body}</div>${footer ? `<div class="dialog-foot">${footer}</div>` : ''}`;
    if (!dialog.open) dialog.showModal();
  }

  function evidenceLink(item, name = '下載 PNG 原圖') {
    if (!item || !pngPattern.test(item.png)) return '';
    return `<a class="button" href="${item.png}" download="${safe(item.filename)}">${name}</a>`;
  }

  function stepList(row) {
    return row.steps.length ? `<ol class="report-steps">${row.steps.map((step) => `<li class="${safe(step.status)}">
      <strong>${safe(step.id)} ${safe(step.action)} · ${statusLabel(step.status)}</strong><p>預期結果：${safe(step.expected)}</p><p>實際結果：${safe(step.actual)}</p></li>`).join('')}</ol>`
      : '<p class="muted">此流程沒有已執行步驟。</p>';
  }

  function reportEvidence(item) {
    if (!item || !pngPattern.test(item.png)) return '';
    return `<details class="report-evidence"><summary>檢視錯誤截圖</summary>
      <a href="${item.png}" download="${safe(item.filename)}" aria-label="下載原始錯誤截圖 PNG"><img src="${item.png}" alt="失敗當下的完整示範頁"></a>
    </details>`;
  }

  function reportBody(run) {
    const counts = totals(run);
    return `<div class="report-facts"><span>Demo · 本機測試</span><span>${safe(timestamp.format(new Date(run.startedAt)))}</span><span>${seconds(run.elapsed)}</span></div>
      <p class="report-summary-note"><strong>${statusLabel(run.status)}</strong> · ${counts.PASS} 通過 / ${counts.FAIL} 失敗 / ${counts.NOT_RUN} 未執行</p>
      ${run.rows.map((row) => `<section class="report-section"><h3>${safe(row.flowId)} ${safe(row.label)} · ${statusLabel(row.status)}</h3>
        <p class="muted">${safe(modeName[row.mode] ?? modeName.normal)} · ${seconds(row.elapsed)}</p>${stepList(row)}
        ${reportEvidence(row.evidence)}${row.captureError ? `<p>${safe(row.captureError)}</p>` : ''}
      </section>`).join('')}`;
  }

  function openReport(run) {
    showDialog('HTML 測試報告', reportBody(run),
      `<button type="button" class="button" data-close>關閉</button><button class="button primary" type="button" data-download-report="${safe(run.id)}">${icon('Download')}下載 HTML 報告</button>`);
  }

  function openError(run, row) {
    const failed = row.steps.find((step) => step.status === 'FAIL');
    const body = `<div class="report-facts"><span>${safe(row.flowId)} ${safe(row.label)}</span><span>${safe(modeName[row.mode])}</span></div>
      <h3>${safe(failed?.action ?? '執行器錯誤')}</h3>
      ${failed ? `<p>預期結果：${safe(failed.expected)}</p><p>實際結果：${safe(failed.actual)}</p>` : ''}
      <div class="report-section"><h3>操作時間線</h3>${stepList(row)}</div>`;
    showDialog('錯誤診斷', body, `<button class="button" type="button" data-close>關閉</button>
      ${row.evidence ? `<button class="button primary" type="button" data-open-image="${safe(run.id)}" data-row="${row.index}">${icon('Image')}檢視錯誤截圖</button>` : ''}`);
  }

  function openImage(row) {
    if (!row.evidence || !pngPattern.test(row.evidence.png)) return;
    const item = row.evidence;
    const size = safe(item.width) + ' × ' + safe(item.height);
    showDialog('錯誤截圖', `<div class="report-facts"><span>${safe(item.filename)}</span><span>${size} px</span></div><img src="${item.png}" alt="${safe(row.label)}失敗時的完整示範頁">`,
      `<button class="button" type="button" data-close>關閉</button>${evidenceLink(item)}`);
  }

  function download(body, type, filename) {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function downloadReport(run) {
    const html = `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Pocket QA Desktop 測試報告</title><style>
    body{font:15px/1.6 system-ui,sans-serif;color:#243231;max-width:920px;margin:30px auto;padding:0 16px}h1{font-size:25px}h3{margin:4px 0}.report-section{border-top:1px solid #dce2df;padding:12px 0}.report-facts{display:flex;flex-wrap:wrap;gap:8px 16px}.report-facts,.muted{color:#596661}.report-steps{padding-left:0;list-style:none}.report-steps li{padding:8px 10px;margin:5px 0;border:1px solid #dae3de;border-radius:6px}.report-steps p{margin:3px 0}.FAIL{background:#fff1f1}.button{color:#126751}.report-evidence summary{cursor:pointer}.report-evidence img{display:block;width:100%;height:auto;margin-top:8px}
    </style><h1>Pocket QA Desktop 測試報告</h1>${reportBody(run)}</html>`;
    download(html, 'text/html;charset=utf-8', 'pocket-qa-' + run.id + '.html');
  }

  function downloadLog(run) {
    const events = state.allLogs ? run.events : run.events.filter((event) => event.index === state.selected);
    const text = events.map((event) => timestamp.format(new Date(event.at)) + ' ' + event.step + ' ' + event.message).join('\n');
    download(text, 'text/plain;charset=utf-8', 'pocket-qa-' + run.id + '.txt');
  }

  function moveEntry(sequence, offset) {
    const index = state.queue.findIndex((item) => item.seq === sequence);
    const next = index + offset;
    if (index < 0 || next < 0 || next >= state.queue.length) return;
    [state.queue[index], state.queue[next]] = [state.queue[next], state.queue[index]];
    renderPlan();
  }

  document.querySelectorAll('[data-icon]').forEach((element) => { element.innerHTML = icon(element.dataset.icon); });
  const browserName = /Edg\//.test(navigator.userAgent) ? 'Edge' : /Chrom(?:e|ium)\//.test(navigator.userAgent) ? 'Chrome' : /Firefox\//.test(navigator.userAgent) ? 'Firefox' : /Safari\//.test(navigator.userAgent) ? 'Safari' : '本機瀏覽器';
  $('#browser-name').textContent = browserName;
  $('#catalog-count').textContent = catalog.length + ' 個流程';

  $('#search').addEventListener('input', renderCatalog);
  $('#start').addEventListener('click', () => void startRun(state.queue));
  $('#pause').addEventListener('click', () => {
    if (!state.control) return;
    state.control.paused = !state.control.paused;
    notice(state.control.paused ? '已暫停測試' : '繼續測試');
    render();
  });
  $('#stop').addEventListener('click', () => showDialog('停止目前的測試？', '<p>已完成的結果會保存在執行紀錄。</p>',
    '<button type="button" class="button" data-close>繼續執行</button><button type="button" class="button danger" data-stop-now>停止測試</button>'));
  $('#clear-queue').addEventListener('click', () => {
    state.queue = [];
    notice('已清空執行清單');
    render();
  });
  $('#preset').addEventListener('change', (event) => {
    const preset = event.target.value;
    if (!preset) return;
    state.queue = preset === 'failure' ? [entry('QA-03', 'fault')] : catalog.map((flow) => entry(flow.id, preset === 'healthy' ? 'normal' : undefined));
    event.target.value = '';
    render();
  });

  $('#queue').addEventListener('change', (event) => {
    const item = state.queue.find((candidate) => candidate.seq === Number(event.target.dataset.mode));
    if (item && modeName[event.target.value]) item.mode = event.target.value;
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const data = button.dataset;
    if (data.view && !state.control) {
      state.view = data.view;
      if (state.view === 'results' && !state.visibleRun) viewRun(state.lastRun);
      else render();
    } else if (data.add && !state.control) {
      state.queue.push(entry(data.add));
      state.view = 'plan';
      notice('已加入 ' + flows.get(data.add).label);
      render();
    } else if (data.remove && !state.control) {
      state.queue = state.queue.filter((item) => item.seq !== Number(data.remove));
      render();
    } else if (data.move && !state.control) {
      moveEntry(Number(data.seq), Number(data.move));
    } else if (data.runOne && !state.control) {
      void startRun(state.queue.filter((item) => item.seq === Number(data.runOne)));
    } else if (data.result !== undefined) {
      state.selected = Number(data.result);
      state.allLogs = false;
      renderResults();
    } else if (data.log) {
      state.allLogs = data.log === 'all';
      renderResults();
    } else if (data.openRun && !state.control) {
      viewRun(findRun(data.openRun));
    } else if ('current' in data && !state.control) {
      viewRun(state.lastRun);
    } else if (data.openReport) {
      openReport(findRun(data.openReport));
    } else if (data.openError) {
      const run = findRun(data.openError);
      openError(run, run.rows[Number(data.row)]);
    } else if (data.openImage) {
      openImage(findRun(data.openImage).rows[Number(data.row)]);
    } else if (data.downloadReport) {
      downloadReport(findRun(data.downloadReport));
    } else if (data.downloadLog) {
      downloadLog(findRun(data.downloadLog));
    } else if (data.rerun && !state.control) {
      state.queue = findRun(data.rerun).rows.filter((row) => row.status === 'FAIL').map((row) => entry(row.flowId, row.mode));
      state.view = 'plan';
      notice('已將失敗流程帶回測試安排');
      render();
    } else if ('stopNow' in data) {
      dialog.close();
      state.control?.abort.abort(new DOMException('測試已停止', 'AbortError'));
    } else if ('close' in data) {
      dialog.close();
    }
  });
  render();
})();
