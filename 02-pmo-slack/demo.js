'use strict';

const { complete, unitName, acceptedEdit, confirmedChange, confirmedTask, referenceURLs } = window.pmoRules;
const project = 'demo';
const initialMessage = '這張卡已測試完成，可以開始驗收了，謝謝！';
const testRecipient = 'QA（自己）';
const defaultRecipients = {
  '產品企劃': '林晴',
  '營運支援': '莊安',
  '需求驗證': '周月'
};

const initialWbs = [
  { key: 'PMO-10', id: ':parent10', isParent: true, title: '會員推播與偏好設定改版', unit: '產品企劃', status: '進行中', url: 'https://pmo.example.test/projects/demo/tasks/10' },
  { key: 'PMO-42', id: ':demo42', isParent: false, parentKey: 'PMO-10', title: '測試－通知偏好儲存', unit: '（未指定）', status: '測試中', url: 'https://pmo.example.test/projects/demo/tasks/42' },
  { key: 'PMO-20', id: ':parent20', isParent: true, title: 'KOL 結算報表匯出優化', unit: '營運支援', status: '進行中', url: 'https://pmo.example.test/projects/demo/tasks/20' },
  { key: 'PMO-56', id: ':demo56', isParent: false, parentKey: 'PMO-20', title: '測試－報表下載', unit: '營運支援', status: '測試中', url: 'https://pmo.example.test/projects/demo/tasks/56' },
  { key: 'PMO-61', id: ':demo61', isParent: false, parentKey: 'PMO-20', title: '測試－服務條款內容核對', unit: '需求驗證', status: '測試中', url: 'https://pmo.example.test/projects/demo/tasks/61' }
];

const lookup = (id) => document.getElementById(id);
const safe = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const displayMinute = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
});

let state;

function reset() {
  state = {
    enabled: true,
    testMode: false,
    mineOnly: true,
    auditOpen: false,
    recipients: { ...defaultRecipients },
    viewer: defaultRecipients['產品企劃'],
    rows: initialWbs.map((r) => ({ ...r })),
    audit: [],
    handled: new Set(),
    lastEdit: null,
    nextEvent: 1,
    messages: []
  };
  lookup('manual-urls').value = 'https://pmo.example.test/projects/demo/tasks/42';
  lookup('manual-message').value = initialMessage;
  lookup('audit-drawer').hidden = true;
  lookup('btn-audit').setAttribute('aria-expanded', 'false');
  lookup('replay').disabled = true;
  setStatus('task-message', '在上方將任一張「測試－…」子卡改為「測試完成」並儲存，即可觸發自動通知。');
  lookup('check-result').hidden = true;
  lookup('manual-result').hidden = true;
  render();
}

function setStatus(id, text) {
  const el = lookup(id);
  el.textContent = text;
  el.hidden = !text;
}

function parentOf(row) {
  return row.parentKey ? state.rows.find((r) => r.key === row.parentKey) : null;
}

function allRecipientsList() {
  const fromMessages = state.messages.map((m) => m.recipient);
  return [...new Set([...Object.values(state.recipients).filter(Boolean), ...fromMessages, testRecipient])];
}

function renderWbs() {
  const units = ['（未指定）', ...Object.keys(state.recipients)];
  lookup('wbs-body').innerHTML = state.rows.map((row) => {
    if (row.isParent) {
      return `<tr class="wbs-parent">
        <td><span class="wbs-key">${row.key} · 母卡</span>${safe(row.title)}</td>
        <td>${safe(row.unit)}</td>
        <td>${safe(row.status)}</td>
        <td><span class="muted">母卡</span></td>
      </tr>`;
    }
    return `<tr data-wbs-row="${row.key}">
      <td class="wbs-child-title"><span class="wbs-key">${row.key}</span>${safe(row.title)}</td>
      <td><select class="wbs-select" data-unit-select="${row.key}" aria-label="${row.key} 需求單位">${units.map((u) => `<option value="${safe(u)}"${row.unit === u ? ' selected' : ''}>${safe(u)}</option>`).join('')}</select></td>
      <td><select class="wbs-select" data-status-select="${row.key}" aria-label="${row.key} 狀態">
        <option value="測試中"${row.status === '測試中' ? ' selected' : ''}>測試中</option>
        <option value="測試完成"${row.status === '測試完成' ? ' selected' : ''}>測試完成</option>
      </select></td>
      <td><button type="button" class="wbs-save" data-wbs-save="${row.key}">儲存</button></td>
    </tr>`;
  }).join('');

  lookup('audit-list').innerHTML = state.audit.length
    ? state.audit.map((a) => `<li><strong>${safe(a.title)}</strong> · ${safe(a.field)}：${safe(a.before)} → <b>${safe(a.after)}</b><br><span class="muted">異動人：${safe(a.actor)} · ${safe(a.time)}</span></li>`).join('')
    : '<li class="muted">尚無異動紀錄。將任一張測試子卡儲存為「測試完成」後會出現在這裡。</li>';
}

function renderExtension() {
  const badge = lookup('state');
  badge.textContent = state.enabled ? '已啟用' : '已暫停';
  badge.classList.toggle('is-paused', !state.enabled);
  lookup('toggle').textContent = state.enabled ? '暫停自動通知' : '啟用自動通知';
  lookup('replay').disabled = !state.lastEdit;
}

function renderManualSelect() {
  const select = lookup('manual-recipient');
  const prev = select.value;
  const options = Object.entries(state.recipients).map(([unit, person]) =>
    `<option value="${safe(unit)}">${safe(unit)} → ${safe(person || '尚未設定')}</option>`
  ).join('') + `<option value="__self">${safe(testRecipient)}</option>`;
  select.innerHTML = options;
  if (prev && [...select.options].some((o) => o.value === prev)) select.value = prev;
}

function renderInbox() {
  const list = allRecipientsList();
  lookup('sent-count').textContent = state.messages.length + ' 則';
  lookup('conversations').innerHTML = list.map((name) => {
    const selected = name === state.viewer;
    const count = state.messages.filter((m) => m.recipient === name).length;
    return `<button type="button" class="conversation-button" data-viewer="${safe(name)}" aria-pressed="${selected}">
      <span class="conversation-avatar" aria-hidden="true">${safe(name[0])}</span>
      <span>${safe(name)}</span>${count ? `<b>${count}</b>` : ''}
    </button>`;
  }).join('');

  const thread = state.messages.filter((m) => m.recipient === state.viewer);
  lookup('conversation').innerHTML = `<div class="conversation-head"><h3>${safe(state.viewer)}</h3><span>Slack 私訊</span></div>
    ${thread.length ? `<ol class="messages">${thread.map((m) => `<li class="message">
      <div class="message-head"><b>Slack 驗收通知</b><time>${safe(m.time)}</time></div>
      <p class="message-card">${safe(m.cardLabel)}</p>
      <p class="message-body">${safe(m.text)}</p>
      ${m.links.length ? `<ul class="message-links">${m.links.map((l) => `<li>${safe(l)}</li>`).join('')}</ul>` : ''}
      <p class="message-tag">${safe(m.label)}${m.unit ? ' · ' + safe(m.unit) : ''}</p>
    </li>`).join('')}</ol>` : '<p class="conversation-empty">尚未收到訊息。可在左側把任一子卡存為「測試完成」，或從中間桌面 App 手動送出。</p>'}`;
}

function render() {
  renderWbs();
  renderExtension();
  renderManualSelect();
  renderInbox();
}

function deliver(recipient, cardLabel, text, links, label, unit) {
  state.messages.push({
    recipient,
    cardLabel,
    text,
    links,
    label,
    unit,
    time: displayMinute.format(Date.now())
  });
  state.viewer = recipient;
  renderInbox();
}

function processAutoNotify(row, edit) {
  if (!state.enabled) {
    setStatus('task-message', `${row.key} 已儲存，但 Chrome 擴充目前「已暫停」，未自動發送。`);
    return;
  }
  if (!acceptedEdit(edit, edit.at)) {
    setStatus('task-message', `${row.key} 已儲存（${row.status}），未達「測試完成」觸發條件。`);
    return;
  }
  if (state.handled.has(edit.sequence)) {
    setStatus('task-message', `${row.key} 此筆「測試完成」異動已通知過，已自動去重略過。`);
    return;
  }
  if (!confirmedChange(state.audit, edit)) {
    setStatus('task-message', '無法在異動紀錄核對這筆儲存事件。');
    return;
  }
  try {
    confirmedTask({ id: row.id, matches: 1, status: row.status, unit: row.unit }, edit);
  } catch (err) {
    setStatus('task-message', err.message);
    return;
  }

  const directUnit = unitName(row.unit);
  const parent = parentOf(row);
  const effectiveUnit = directUnit || parent?.unit || '';
  const targetName = state.testMode ? testRecipient : (state.recipients[effectiveUnit] || '');
  if (!targetName) {
    setStatus('task-message', `「${effectiveUnit || '未指定'}」尚未設定收件人，請到桌面 App「設定」補齊。`);
    return;
  }

  state.handled.add(edit.sequence);
  const links = referenceURLs([row.url], project);
  deliver(
    targetName,
    `${row.key} · ${row.title}`,
    initialMessage,
    links,
    state.testMode ? '自動通知（測試模式）' : 'Chrome 擴充自動觸發 → 桌面 App 送出',
    effectiveUnit
  );
  setStatus(
    'task-message',
    !directUnit && !state.testMode
      ? `${row.key} 需求單位未填，已自動沿用母卡「${effectiveUnit}」→ 通知 ${targetName}！`
      : `${row.key} 已觸發自動通知 → 送達 ${targetName} 的 Slack 私訊！`
  );
}

lookup('wbs-body').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-wbs-save]');
  if (!btn) return;
  const key = btn.dataset.wbsSave;
  const row = state.rows.find((r) => r.key === key);
  if (!row) return;

  const unitSel = document.querySelector(`[data-unit-select="${key}"]`);
  const statusSel = document.querySelector(`[data-status-select="${key}"]`);
  const before = row.status;
  const nextStatus = statusSel.value;
  row.unit = unitSel.value;
  row.status = nextStatus;

  if (before === nextStatus) {
    setStatus('task-message', `${row.key} 需求單位已更新為「${row.unit}」，狀態未變更。`);
    return;
  }

  const at = Date.now();
  const edit = {
    id: row.id,
    title: row.title,
    url: row.url,
    unit: row.unit,
    actor: 'win',
    before,
    after: nextStatus,
    at,
    sequence: state.nextEvent++
  };
  state.audit.unshift({
    title: row.title,
    field: '狀態',
    before,
    after: nextStatus,
    actor: 'win',
    time: displayMinute.format(at).replace(/-/g, '/')
  });
  if (acceptedEdit(edit, at)) state.lastEdit = edit;
  renderWbs();
  renderExtension();
  processAutoNotify(row, edit);
});

lookup('btn-audit').addEventListener('click', () => {
  state.auditOpen = !state.auditOpen;
  lookup('audit-drawer').hidden = !state.auditOpen;
  lookup('btn-audit').setAttribute('aria-expanded', String(state.auditOpen));
  lookup('btn-audit').classList.toggle('is-active', state.auditOpen);
});

lookup('btn-mine').addEventListener('click', () => {
  state.mineOnly = !state.mineOnly;
  lookup('btn-mine').textContent = state.mineOnly ? '✓ 只看我的' : '只看我的';
  lookup('btn-mine').classList.toggle('is-active', state.mineOnly);
  lookup('btn-mine').setAttribute('aria-pressed', String(state.mineOnly));
});

lookup('toggle').addEventListener('click', () => {
  state.enabled = !state.enabled;
  renderExtension();
});

lookup('check').addEventListener('click', () => {
  setStatus('check-result', `模擬連線正常 · 已偵測 WBS 檢視與 ${Object.keys(state.recipients).length} 個需求單位設定。`);
});

lookup('replay').addEventListener('click', () => {
  if (!state.lastEdit) return;
  const row = state.rows.find((r) => r.id === state.lastEdit.id);
  if (row) processAutoNotify(row, state.lastEdit);
});

lookup('manual-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const unitKey = lookup('manual-recipient').value;
  const recipient = unitKey === '__self' ? testRecipient : (state.recipients[unitKey] || '');
  if (!recipient) {
    setStatus('manual-result', `「${unitKey}」尚未設定收件人，請先到設定補齊。`);
    return;
  }
  const rawUrls = lookup('manual-urls').value.split('\n').map((u) => u.trim()).filter(Boolean);
  const links = referenceURLs(rawUrls, project);
  const text = lookup('manual-message').value.trim() || initialMessage;
  deliver(recipient, `手動通知（${links.length} 筆卡片）`, text, links, '桌面 App 手動送出', unitKey === '__self' ? '' : unitKey);
  setStatus('manual-result', `已送出至 ${recipient}（附 ${links.length} 筆網址）。`);
});

lookup('conversations').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-viewer]');
  if (!btn) return;
  state.viewer = btn.dataset.viewer;
  renderInbox();
});

const dialog = lookup('settings-dialog');
function renderSettingsRecipients() {
  lookup('recipients').innerHTML = Object.entries(state.recipients).map(([unit, name]) =>
    `<label>${safe(unit)}<input type="text" data-unit="${safe(unit)}" maxlength="24" value="${safe(name)}" placeholder="待設定"></label>`
  ).join('');
}

lookup('settings-open').addEventListener('click', () => {
  lookup('settings-form').elements.testMode.checked = state.testMode;
  renderSettingsRecipients();
  dialog.showModal();
});

lookup('add-dept').addEventListener('click', () => {
  const dept = window.prompt('輸入新增需求單位名稱（例如：客服部）：');
  if (!dept || !dept.trim()) return;
  const clean = dept.trim();
  if (!(clean in state.recipients)) state.recipients[clean] = '';
  renderSettingsRecipients();
});

lookup('settings-form').addEventListener('submit', (e) => {
  e.preventDefault();
  state.testMode = lookup('settings-form').elements.testMode.checked;
  for (const input of lookup('settings-form').querySelectorAll('[data-unit]')) {
    state.recipients[input.dataset.unit] = input.value.trim();
  }
  dialog.close();
  render();
});

lookup('test-send').addEventListener('click', () => {
  deliver(testRecipient, '連線測試', '這是一則測試私訊，確認 Slack 連線正常。', [], '設定測試', '');
  dialog.close();
});

dialog.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) dialog.close();
});

lookup('reset').addEventListener('click', reset);
reset();
