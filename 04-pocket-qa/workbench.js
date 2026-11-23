(function () {
  'use strict';

  const { catalog, createPortal } = window.pocketScenarios;
  const flows = new Map(catalog.map((flow) => [flow.id, flow]));
  const $ = (selector) => document.querySelector(selector);
  const testPage = $('#test-page');
  const portal = createPortal(testPage);
  const dialog = $('#detail-dialog');
  const storageKey = 'pocket-qa-portfolio-history-v2';

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
    env: 'uat',
    otpMode: 'cms',
    browser: 'chrome',
    view: 'plan',
    queue: [],
    presets: [],
    passwordDefaults: {
      uat: { identity_number: 'A123456789', birthday: '19991111', password: 'demo-password' },
      staging: { identity_number: 'B234567890', birthday: '19980520', password: 'demo-password' }
    },
    lastRun: null,
    history: loadHistory(),
    visibleRun: null,
    selected: null,
    allLogs: false,
    control: null,
    nextEntry: 1
  };

  function defaultParamsFor(flow) {
    const out = {};
    for (const p of flow.params || []) out[p.key] = p.default || '';
    return out;
  }

  function entry(id, mode, params) {
    const flow = flows.get(id);
    return {
      seq: state.nextEntry++,
      flowId: id,
      mode: mode ?? (flow.configurable ? 'fault' : 'normal'),
      params: params ? { ...params } : defaultParamsFor(flow)
    };
  }

  state.queue = [
    entry('public_website', 'normal'),
    entry('etf_ranking', 'normal'),
    entry('online_account_tw', 'fault'),
    entry('backoffice_review', 'normal')
  ];

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
      } catch {}
    }
    return false;
  }

  function statusLabel(code) { return (statusStyle[code] ?? statusStyle.NOT_RUN)[0]; }
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

  function renderTopbar() {
    document.querySelectorAll('[data-env]').forEach((b) => {
      if (b.dataset.env === state.env) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
      b.disabled = Boolean(state.control);
    });
    const otpPicker = $('#otp-picker');
    otpPicker.hidden = state.env !== 'staging';
    document.querySelectorAll('[data-otp]').forEach((b) => {
      if (b.dataset.otp === state.otpMode) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
      b.disabled = Boolean(state.control);
    });
    $('#browser-select').disabled = Boolean(state.control);
    const parallelBox = $('#parallel-flows');
    const supportsParallel = state.env === 'uat' && state.browser === 'chrome';
    if (!supportsParallel) parallelBox.checked = false;
    parallelBox.disabled = !supportsParallel || Boolean(state.control);
    $('#parallel-wrap').title = supportsParallel ? '' : '僅 UAT + Chrome 支援並行執行';
    $('#browser-env-label').textContent = `${state.env.toUpperCase()} · ${state.browser === 'chrome' ? 'Chrome' : 'Safari'}`;
  }

  function renderCatalog() {
    const query = $('#search').value.trim().toLowerCase();
    const groups = [...new Set(catalog.map((flow) => flow.group))];
    $('#catalog').innerHTML = groups.map((name) => {
      const matching = catalog.filter((flow) => flow.group === name && (flow.label + ' ' + flow.id + ' ' + flow.description).toLowerCase().includes(query));
      if (!matching.length) return '';
      return `<section class="catalog-group"><h3>${name}</h3>${matching.map((flow) =>
        `<button type="button" class="catalog-item" data-add="${flow.id}" aria-label="加入 ${flow.label}" ${state.control ? 'disabled' : ''}>
          <span><strong>${flow.label}</strong><small>${flow.id} · ${flow.envs.map((e) => e.toUpperCase()).join('/')}</small></span><span>${icon('CirclePlus')}</span>
        </button>`
      ).join('')}</section>`;
    }).join('') || '<p class="muted">沒有符合的流程。</p>';
  }

  function renderPlan() {
    $('#queue-count').textContent = state.queue.length + ' 項';
    $('#clear-queue').disabled = !state.queue.length;
    $('#save-preset').disabled = !state.queue.length;
    $('#queue').innerHTML = state.queue.length ? state.queue.map((item, index) => {
      const flow = flows.get(item.flowId);
      const number = index + 1;
      const envWarn = !flow.envs.includes(state.env);
      const paramSummary = (flow.params || []).map((p) => `${p.label}：${item.params[p.key] || '預設'}`).join(' · ');
      return `<li class="queue-row" data-entry="${item.seq}"><span class="queue-index">${String(number).padStart(2, '0')}</span>
        <div>
          <strong class="queue-title">${flow.label}</strong>
          <div class="queue-sub">
            <span>${flow.id} · ${flow.steps.length} 步</span>
            ${flow.configurable ? `<select class="mode-select" data-mode="${item.seq}" aria-label="第 ${number} 項測試情境"><option value="normal" ${item.mode === 'normal' ? 'selected' : ''}>正常流程</option><option value="fault" ${item.mode === 'fault' ? 'selected' : ''}>故障示範</option></select>` : ''}
            ${envWarn ? `<span class="env-warn">僅支援 ${flow.envs.map((e) => e.toUpperCase()).join('/')}</span>` : ''}
          </div>
          ${paramSummary ? `<div class="queue-params">${safe(paramSummary)}</div>` : ''}
        </div>
        <div class="actions queue-actions">
          ${iconButton('上移第 ' + number + ' 項', 'ArrowUp', `data-move="-1" data-seq="${item.seq}"`, index === 0)}
          ${iconButton('下移第 ' + number + ' 項', 'ArrowDown', `data-move="1" data-seq="${item.seq}"`, number === state.queue.length)}
          ${iconButton('編輯參數', 'SlidersHorizontal', `data-edit-params="${item.seq}"`, !(flow.params && flow.params.length))}
          ${iconButton('複製此項', 'Copy', `data-duplicate="${item.seq}"`)}
          ${iconButton('只跑第 ' + number + ' 項', 'Play', `data-run-one="${item.seq}"`)}
          ${iconButton('移除第 ' + number + ' 項', 'X', `data-remove="${item.seq}"`)}
        </div></li>`;
    }).join('') : `<li>${empty('尚未加入測試流程', '從左側 26 個流程點選加入，或選擇右上方「常用組合」。')}</li>`;
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
      $('#results-summary').innerHTML = `<div class="section-head"><h1 id="results-heading">執行結果</h1></div>${empty('尚無執行結果', '在「測試安排」選好流程並按右上角「開始測試」。')}`;
      return;
    }
    const live = run === state.lastRun && Boolean(state.control);
    const counts = totals(run);
    const resultText = live && state.control.paused ? 'PAUSED' : run.status;
    const selected = run.rows.find((row) => row.index === state.selected) ?? run.rows[0];
    $('#results-summary').innerHTML = `<div class="run-header">
      <div class="section-head"><div class="heading-group"><h1 id="results-heading">執行結果</h1>${status(resultText)}</div>
        <div class="actions">
          ${!live && run.report ? `<button class="button" type="button" data-open-report="${safe(run.id)}">${icon('FileText')}開啟 HTML 報告</button>` : ''}
          ${!live && counts.FAIL ? `<button class="button" type="button" data-rerun="${safe(run.id)}">${icon('RotateCcw')}失敗重測</button>` : ''}
          ${run !== state.lastRun && state.lastRun ? '<button class="button" type="button" data-current>回到本次執行</button>' : ''}</div></div>
      <div class="run-meta muted"><span>${safe(run.env.toUpperCase())} · ${safe(run.browser)}</span><time datetime="${safe(run.startedAt)}">${safe(timestamp.format(new Date(run.startedAt)))}</time></div>
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
        <button type="button" class="button" data-open-error="${safe(run.id)}" data-row="${row.index}">${icon('FileText')}失敗診斷（時間線 / Network / Console）· ${safe(row.flowId)}</button>
        ${row.evidence && pngPattern.test(row.evidence.png) ? `<button type="button" class="button" data-open-image="${safe(run.id)}" data-row="${row.index}">${icon('Image')}錯誤完整原圖 · ${safe(row.flowId)}</button>` : ''}
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
      return `<div class="history-row">${status(run.status)}<div><strong>${safe(timestamp.format(new Date(run.startedAt)))}</strong><span class="muted">${safe(run.env.toUpperCase())} · ${safe(run.browser)} · ${run.rows.length} 個流程 · ${counts.PASS} 通過 · ${counts.FAIL} 失敗 · ${seconds(run.elapsed)}</span></div>
        <div class="actions"><button type="button" class="button" data-open-run="${safe(run.id)}">開啟紀錄</button>
          ${run.report ? `<button type="button" class="button" data-open-report="${safe(run.id)}">${icon('FileText')}開啟報告</button>` : ''}</div></div>`;
    }).join('') : empty('尚無執行紀錄', '完成一次測試後，可從這裡重開紀錄、報告與截圖。');
  }

  function render() {
    renderTopbar();
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
      const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, milliseconds);
      function abort() { clearTimeout(timer); reject(signal.reason); }
      signal.addEventListener('abort', abort, { once: true });
    });
  }

  async function nextStep(control, milliseconds) {
    await wait(milliseconds, control.abort.signal);
    while (control.paused) await wait(120, control.abort.signal);
  }

  function waitForManualOtp(control) {
    return new Promise((resolve, reject) => {
      $('#otp-banner').hidden = false;
      const abortHandler = () => {
        $('#otp-banner').hidden = true;
        reject(control.abort.signal.reason);
      };
      control.abort.signal.addEventListener('abort', abortHandler, { once: true });
      portal.showOtpPrompt((code) => {
        control.abort.signal.removeEventListener('abort', abortHandler);
        $('#otp-banner').hidden = true;
        resolve(code);
      });
    });
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
    row.network = [];
    row.consoleLogs = [];
    state.selected = row.index;
    portal.reset(row.mode, run.env.toUpperCase());
    notice('正在執行 ' + row.label);
    renderResults();

    if (flow.requiresOtp && run.env === 'staging' && run.otpMode === 'manual') {
      eventAt(run, row, row.flowId, '等待使用者於測試瀏覽器輸入手動 OTP...', 'PENDING');
      renderResults();
      const otpCode = await waitForManualOtp(control);
      eventAt(run, row, row.flowId, `已輸入簡訊驗證碼 (${otpCode})，繼續執行`, 'PASS');
      renderResults();
    }

    for (let index = 0; index < flow.steps.length; index++) {
      const test = flow.steps[index];
      const id = row.flowId + '.' + String(index + 1).padStart(2, '0');
      await nextStep(control, 90);
      eventAt(run, row, id, '執行 ' + test.action, 'RUNNING');
      renderResults();
      await nextStep(control, 220);

      let outcome;
      try {
        outcome = test.run(testPage, row.params);
      } catch (error) {
        outcome = { pass: false, actual: error.message };
      }

      if (outcome.network) row.network.push({ at: clock.format(new Date()), ...outcome.network });
      if (outcome.consoleMsg) row.consoleLogs.push(outcome.consoleMsg);

      const step = { id, action: test.action, expected: test.expected, actual: outcome.actual, status: outcome.pass ? 'PASS' : 'FAIL' };
      row.steps.push(step);
      row.elapsed = performance.now() - started;
      eventAt(run, row, id, statusLabel(step.status) + ' · ' + step.actual, step.status);

      if (!outcome.pass) {
        row.status = 'FAIL';
        await captureFailure(row, step);
        if (row.evidence) eventAt(run, row, id, '已保存完整原圖 ' + row.evidence.filename, 'PENDING');
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
      env: state.env,
      otpMode: state.otpMode,
      browser: state.browser,
      startedAt: new Date().toISOString(),
      status: 'RUNNING',
      elapsed: 0,
      report: $('#with-report').checked,
      keepBrowser: $('#keep-browser').checked,
      events: [],
      rows: queue.map((item, index) => {
        const flow = flows.get(item.flowId);
        return {
          index, flowId: flow.id, label: flow.label, mode: item.mode, params: { ...item.params },
          total: flow.steps.length, steps: [], network: [], consoleLogs: [], elapsed: 0, status: 'PENDING'
        };
      })
    };
    state.control = control;
    state.lastRun = run;
    viewRun(run);
    const started = performance.now();
    let stopped = false;
    try {
      for (const row of run.rows) {
        await nextStep(control, 100);
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
    }
    $('#otp-banner').hidden = true;
    for (const row of run.rows) {
      if (row.status === 'PENDING') row.status = 'NOT_RUN';
    }
    run.elapsed = performance.now() - started;
    run.status = stopped ? 'STOPPED' : totals(run).FAIL ? 'FAIL' : 'PASS';
    state.control = null;
    if (dialog.open && dialog.querySelector('[data-stop-now]')) dialog.close();
    saveHistory(run);
    viewRun(run);
    notice(stopped ? '測試已停止' : '測試已完成，可開啟 HTML 報告或失敗診斷');
  }

  function showDialog(title, body, footer = '') {
    dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-heading">${safe(title)}</h2>${iconButton('關閉視窗', 'X', 'data-close')}</div>
      <div class="dialog-body">${body}</div>${footer ? `<div class="dialog-foot">${footer}</div>` : ''}`;
    if (!dialog.open) dialog.showModal();
  }

  function stepList(row) {
    return row.steps.length ? `<ol class="report-steps">${row.steps.map((step) => `<li class="${safe(step.status)}">
      <strong>${safe(step.id)} ${safe(step.action)} · ${statusLabel(step.status)}</strong><p>預期結果：${safe(step.expected)}</p><p>實際結果：${safe(step.actual)}</p></li>`).join('')}</ol>`
      : '<p class="muted">此流程沒有已執行步驟。</p>';
  }

  function openError(run, row) {
    const failed = row.steps.find((step) => step.status === 'FAIL');
    const netHtml = (row.network || []).length
      ? `<table class="diag-table"><thead><tr><th>時間</th><th>Method</th><th>Endpoint</th><th>Status</th><th>耗時</th></tr></thead><tbody>${row.network.map((n) =>
          `<tr><td>${safe(n.at)}</td><td>${safe(n.method)}</td><td><code>${safe(n.url)}</code></td><td class="${n.status >= 400 ? 'fail' : 'pass'}">${n.status}</td><td>${n.ms} ms</td></tr>`
        ).join('')}</tbody></table>`
      : '<p class="muted">無 Network 錯誤紀錄。</p>';
    const consoleHtml = (row.consoleLogs || []).length
      ? `<pre class="diag-console">${row.consoleLogs.map(safe).join('\n')}</pre>`
      : '<p class="muted">無 Console 紀錄。</p>';

    const body = `<div class="report-facts"><span>${safe(row.flowId)} ${safe(row.label)}</span><span>${safe(run.env.toUpperCase())}</span><span>${safe(modeName[row.mode])}</span></div>
      <h3>${safe(failed?.action ?? '執行器錯誤')}</h3>
      ${failed ? `<p>預期結果：${safe(failed.expected)}</p><p>實際結果：${safe(failed.actual)}</p>` : ''}
      <div class="report-section"><h3>1. 操作時間線（Action Timeline）</h3>${stepList(row)}</div>
      <div class="report-section"><h3>2. Network 請求／回應關聯</h3>${netHtml}</div>
      <div class="report-section"><h3>3. Console 紀錄</h3>${consoleHtml}</div>`;
    showDialog('共用失敗診斷（FAILURE DIAGNOSTICS）', body, `<button class="button" type="button" data-close>關閉</button>
      ${row.evidence ? `<button class="button primary" type="button" data-open-image="${safe(run.id)}" data-row="${row.index}">${icon('Image')}檢視完整原圖</button>` : ''}`);
  }

  function openImage(row) {
    if (!row.evidence || !pngPattern.test(row.evidence.png)) return;
    const item = row.evidence;
    showDialog('完整原圖截圖（無馬賽克）', `<div class="report-facts"><span>${safe(item.filename)}</span><span>${safe(item.width)} × ${safe(item.height)} px</span></div><img src="${item.png}" alt="${safe(row.label)}失敗時的完整示範頁">`,
      `<button class="button" type="button" data-close>關閉</button><a class="button primary" href="${item.png}" download="${safe(item.filename)}">下載 PNG 原圖</a>`);
  }

  function reportBody(run) {
    const counts = totals(run);
    return `<div class="report-facts"><span>${safe(run.env.toUpperCase())} · ${safe(run.browser)}</span><span>${safe(timestamp.format(new Date(run.startedAt)))}</span><span>${seconds(run.elapsed)}</span></div>
      <p class="report-summary-note"><strong>${statusLabel(run.status)}</strong> · ${counts.PASS} 通過 / ${counts.FAIL} 失敗 / ${counts.NOT_RUN} 未執行</p>
      ${run.rows.map((row) => `<section class="report-section"><h3>${safe(row.flowId)} ${safe(row.label)} · ${statusLabel(row.status)}</h3>
        <p class="muted">${safe(modeName[row.mode] ?? modeName.normal)} · ${seconds(row.elapsed)}</p>${stepList(row)}
        ${row.evidence && pngPattern.test(row.evidence.png) ? `<details class="report-evidence" open><summary>錯誤完整原圖</summary><a href="${row.evidence.png}" download="${safe(row.evidence.filename)}"><img src="${row.evidence.png}" alt="失敗畫面"></a></details>` : ''}
      </section>`).join('')}`;
  }

  function openReport(run) {
    showDialog('HTML 測試報告', reportBody(run),
      `<button type="button" class="button" data-close>關閉</button><button class="button primary" type="button" data-download-report="${safe(run.id)}">${icon('Download')}下載 HTML 報告</button>`);
  }

  function download(body, type, filename) {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function openSettingsModal() {
    const uat = state.passwordDefaults.uat;
    const stg = state.passwordDefaults.staging;
    showModalForm('執行設定（測試帳密預設值）', `<form id="settings-form" class="param-form">
      <p class="muted">設定忘記密碼／加開流程使用的預設測試資料（不會存入公開檔案）。</p>
      <div class="settings-block"><strong>UAT 預設測資</strong>
        <label>身分證字號<input name="uat_id" value="${safe(uat.identity_number)}"></label>
        <label>生日<input name="uat_bd" value="${safe(uat.birthday)}"></label>
        <label>密碼<input name="uat_pw" type="password" value="${safe(uat.password)}"></label>
      </div>
      <div class="settings-block"><strong>Staging 預設測資</strong>
        <label>身分證字號<input name="stg_id" value="${safe(stg.identity_number)}"></label>
        <label>生日<input name="stg_bd" value="${safe(stg.birthday)}"></label>
        <label>密碼<input name="stg_pw" type="password" value="${safe(stg.password)}"></label>
      </div>
    </form>`, '<button type="button" class="button" data-close>取消</button><button type="submit" class="button primary" form="settings-form">儲存設定</button>');
  }

  function openParamsModal(seq) {
    const item = state.queue.find((q) => q.seq === seq);
    if (!item) return;
    const flow = flows.get(item.flowId);
    showModalForm(`編輯參數 · ${flow.label}`, `<form id="param-form" class="param-form" data-seq="${seq}">
      ${(flow.params || []).map((p) => `<label>${safe(p.label)}<input name="${safe(p.key)}" value="${safe(item.params[p.key] || '')}" placeholder="留空使用預設"></label>`).join('')}
    </form>`, '<button type="button" class="button" data-close>取消</button><button type="submit" class="button primary" form="param-form">套用參數</button>');
  }

  function showModalForm(title, body, footer) {
    showDialog(title, body, footer);
  }

  function moveEntry(sequence, offset) {
    const index = state.queue.findIndex((item) => item.seq === sequence);
    const next = index + offset;
    if (index < 0 || next < 0 || next >= state.queue.length) return;
    [state.queue[index], state.queue[next]] = [state.queue[next], state.queue[index]];
    renderPlan();
  }

  document.querySelectorAll('[data-icon]').forEach((element) => { element.innerHTML = icon(element.dataset.icon); });
  $('#catalog-count').textContent = catalog.length + ' 個流程';
  $('#search').addEventListener('input', renderCatalog);
  $('#browser-select').addEventListener('change', (e) => { state.browser = e.target.value; render(); });
  $('#open-settings').addEventListener('click', openSettingsModal);
  $('#start').addEventListener('click', () => void startRun(state.queue));
  $('#pause').addEventListener('click', () => {
    if (!state.control) return;
    state.control.paused = !state.control.paused;
    notice(state.control.paused ? '已暫停測試' : '繼續測試');
    render();
  });
  $('#stop').addEventListener('click', () => showDialog('停止目前的測試？', '<p>已完成的結果會保存在執行紀錄。</p>',
    '<button type="button" class="button" data-close>繼續執行</button><button type="button" class="button danger" data-stop-now>停止測試</button>'));
  $('#clear-queue').addEventListener('click', () => { state.queue = []; notice('已清空執行清單'); render(); });
  $('#save-preset').addEventListener('click', () => {
    const name = window.prompt('輸入常用組合名稱（例如：週四例行回歸）：');
    if (!name || !name.trim()) return;
    const presetId = 'custom-' + (state.presets.length + 1);
    state.presets.push({ id: presetId, name: name.trim(), items: state.queue.map((q) => ({ flowId: q.flowId, mode: q.mode, params: { ...q.params } })) });
    const opt = document.createElement('option');
    opt.value = presetId;
    opt.textContent = '★ ' + name.trim();
    $('#preset').appendChild(opt);
    notice('已儲存常用組合「' + name.trim() + '」');
  });

  $('#preset').addEventListener('change', (event) => {
    const val = event.target.value;
    if (!val) return;
    if (val === 'smoke') state.queue = ['public_website', 'smoke', 'dashboard_icons', 'footer_entries', 'etf_ranking', 'etf_tw_search'].map((id) => entry(id, 'normal'));
    else if (val === 'account') state.queue = ['online_account_tw', 'online_account_tw_us_sub_brokerage', 'online_account_add_credit', 'backoffice_review'].map((id) => entry(id, 'normal'));
    else if (val === 'failure') state.queue = [entry('online_account_tw', 'fault')];
    else if (val === 'all') state.queue = catalog.map((f) => entry(f.id, f.configurable ? 'fault' : 'normal'));
    else {
      const custom = state.presets.find((p) => p.id === val);
      if (custom) state.queue = custom.items.map((i) => entry(i.flowId, i.mode, i.params));
    }
    event.target.value = '';
    render();
  });

  $('#queue').addEventListener('change', (event) => {
    const item = state.queue.find((candidate) => candidate.seq === Number(event.target.dataset.mode));
    if (item && modeName[event.target.value]) item.mode = event.target.value;
  });

  dialog.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const fd = new FormData(form);
    if (form.id === 'param-form') {
      const item = state.queue.find((q) => q.seq === Number(form.dataset.seq));
      if (item) {
        for (const [k, v] of fd.entries()) item.params[k] = String(v).trim();
        renderPlan();
        notice('已更新流程參數');
      }
      dialog.close();
    } else if (form.id === 'settings-form') {
      state.passwordDefaults.uat = { identity_number: fd.get('uat_id'), birthday: fd.get('uat_bd'), password: fd.get('uat_pw') };
      state.passwordDefaults.staging = { identity_number: fd.get('stg_id'), birthday: fd.get('stg_bd'), password: fd.get('stg_pw') };
      dialog.close();
      notice('已儲存執行設定');
    }
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const data = button.dataset;
    if (data.env && !state.control) { state.env = data.env; render(); }
    else if (data.otp && !state.control) { state.otpMode = data.otp; render(); }
    else if (data.view && !state.control) {
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
    } else if (data.duplicate && !state.control) {
      const idx = state.queue.findIndex((i) => i.seq === Number(data.duplicate));
      if (idx >= 0) {
        const src = state.queue[idx];
        state.queue.splice(idx + 1, 0, entry(src.flowId, src.mode, src.params));
        render();
      }
    } else if (data.editParams && !state.control) {
      openParamsModal(Number(data.editParams));
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
      const run = findRun(data.downloadReport);
      const html = `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>Pocket QA 測試報告</title><body><h1>Pocket QA Desktop 測試報告</h1>${reportBody(run)}</body></html>`;
      download(html, 'text/html;charset=utf-8', 'pocket-qa-' + run.id + '.html');
    } else if (data.downloadLog) {
      const run = findRun(data.downloadLog);
      const events = state.allLogs ? run.events : run.events.filter((e) => e.index === state.selected);
      download(events.map((e) => timestamp.format(new Date(e.at)) + ' ' + e.step + ' ' + e.message).join('\n'), 'text/plain;charset=utf-8', 'pocket-qa-' + run.id + '.txt');
    } else if (data.rerun && !state.control) {
      state.queue = findRun(data.rerun).rows.filter((row) => row.status === 'FAIL').map((row) => entry(row.flowId, row.mode, row.params));
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
