'use strict';

const { complete, unitName, acceptedEdit, confirmedChange, confirmedTask, referenceURLs } = window.pmoRules;
const project = 'demo';
const initialMessage = '這張卡已測試完成，可以開始驗收了，謝謝！';
const testRecipient = '示範帳號';
const defaultRecipients = { '產品企劃': '林晴', '營運支援': '莊安', '需求驗證': '' };
const initialCards = [
  { key: 'DEMO-42', id: ':demo42', title: '測試－通知偏好儲存', parentUnit: '產品企劃', unit: '（未指定）', url: 'https://taiga.example.test/project/demo/issue/42' },
  { key: 'DEMO-56', id: ':demo56', title: '測試－報表下載', parentUnit: '營運支援', unit: '營運支援', url: 'https://taiga.example.test/project/demo/issue/56' }
];
const lookup = (id) => document.getElementById(id);
const form = lookup('task-form');
const settingsForm = lookup('settings-form');
const dialog = lookup('settings-dialog');
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const displayMinute = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
});
let state;

function setText(id, text = '') {
  const element = lookup(id);
  element.textContent = text;
  element.hidden = !text;
}

function activeCard() {
  return state.cards.find((card) => card.key === form.elements.card.value);
}

function reset() {
  state = {
    enabled: true, testMode: false, recipients: { ...defaultRecipients }, viewer: defaultRecipients['產品企劃'],
    cards: initialCards.map((card) => ({ ...card, status: '測試中', history: [], lastEdit: null })),
    messages: [], handled: new Set(), nextEvent: 1
  };
  form.elements.card.innerHTML = initialCards.map((card) => `<option value="${card.key}">${card.key} · ${safe(card.title)}</option>`).join('');
  form.elements.actor.value = 'win';
  form.elements.recipient.value = 'auto';
  form.elements.message.value = initialMessage;
  if (dialog.open) dialog.close();
  form.querySelector('.automation-panel').open = false;
  selectCard();
  render();
}

function recipients() {
  const unlistedRecipientNames = state.messages.map((message) => message.recipient);
  return [...new Set([...Object.values(state.recipients).filter(Boolean), ...unlistedRecipientNames, testRecipient])];
}

function renderChoices(desiredValue = form.elements.recipient.value) {
  form.elements.recipient.innerHTML = '<option value="auto">依需求單位自動判斷</option>' + recipients().map((person) =>
    `<option value="${safe(person)}">${safe(person)}</option>`
  ).join('');
  form.elements.recipient.value = recipients().includes(desiredValue) ? desiredValue : 'auto';
}

function render() {
  setText('state', state.enabled ? '已啟用' : '已暫停');
  setText('toggle', state.enabled ? '暫停自動通知' : '啟用自動通知');
  setText('sent-count', state.messages.length + ' 則');
  renderChoices();
  renderInbox();
}

function selectCard() {
  const card = activeCard();
  form.elements.title.value = card.title;
  form.elements.url.value = card.url;
  form.elements.status.value = card.status;
  form.elements.unit.value = card.unit;
  lookup('parent-unit').value = card.parentUnit;
  form.elements.title.setCustomValidity('');
  form.elements.url.setCustomValidity('');
  renderChoices();
  lookup('replay').disabled = !card.lastEdit;
  setText('task-message', '目前儲存狀態 · ' + card.status);
  setText('check-result');
}

function renderInbox() {
  lookup('conversations').innerHTML = recipients().map((name) => {
    const selected = name === state.viewer;
    const count = state.messages.filter((message) => message.recipient === name).length;
    return `<button type="button" class="conversation-button" data-viewer="${safe(name)}" aria-pressed="${selected}"><span class="conversation-avatar" aria-hidden="true">${safe(name[0])}</span><span>${safe(name)}</span>${count ? `<b>${count}</b>` : ''}</button>`;
  }).join('');
  const thread = state.messages.filter((message) => message.recipient === state.viewer);
  lookup('conversation').innerHTML = `<div class="conversation-head"><h3>${safe(state.viewer)}</h3><span>私訊</span></div>
    ${thread.length ? `<ol class="messages">${thread.map((message) => `<li class="message">
      <div class="message-head"><b>PMO 驗收通知</b><time>${safe(message.time)}</time></div>
      <p class="message-card">${safe(message.key)} · ${safe(message.title)}</p>
      <p class="message-body">${safe(message.text)}</p>
      ${message.links.length ? `<ul class="message-links">${message.links.map((link) => `<li>${safe(link)}</li>`).join('')}</ul>` : ''}
      <p class="message-tag">${safe(message.label)}${message.unit ? ' · ' + safe(message.unit) : ''}</p>
    </li>`).join('')}</ol>` : '<p class="conversation-empty">還沒有訊息。儲存「測試完成」或按「模擬送出」即可試玩。</p>'}`;
  const messages = lookup('conversation').querySelector('.messages');
  if (messages) messages.scrollTop = messages.scrollHeight;
}

function deliver(recipient, card, edit, label, unit, links = referenceURLs([edit.url], project)) {
  state.messages.push({
    recipient, key: card.key, title: edit.title, text: edit.message || initialMessage, links, label, unit,
    time: displayMinute.format(Date.now())
  });
  state.viewer = recipient;
  render();
  setText('task-message', recipient + ' 已收到模擬私訊。');
}

function destination(card, edit, automated) {
  const directUnit = unitName(edit.unit);
  const unit = directUnit || card.parentUnit;
  const recipient = edit.recipient === 'auto' ? state.recipients[unit] : edit.recipient;
  if (!recipient) {
    setText('task-message', `「${unit}」尚未設定收件人，請選擇一位收件人或在設定中補齊。`);
    return null;
  }
  return { recipient: automated && state.testMode ? testRecipient : recipient, unit, fallback: !directUnit && edit.recipient === 'auto' };
}

function autoNotify(card, edit) {
  if (!state.enabled) {
    setText('task-message', '已儲存。自動通知目前暫停。');
    return;
  }
  if (!acceptedEdit(edit, edit.at)) {
    setText('task-message', '已儲存。這筆異動沒有符合自動通知的觸發條件。');
    return;
  }
  if (state.handled.has(edit.sequence)) {
    setText('task-message', '這筆測試完成異動已處理，已略過重複通知。');
    return;
  }
  if (!confirmedChange(card.history, edit)) {
    setText('task-message', '無法核對這筆狀態異動，請重新儲存。');
    return;
  }
  try {
    confirmedTask({ id: card.id, matches: 1, status: card.status, unit: card.unit }, edit);
  } catch (error) {
    setText('task-message', error.message);
    return;
  }
  const target = destination(card, edit, true);
  if (!target) return;
  state.handled.add(edit.sequence);
  deliver(target.recipient, card, edit, state.testMode ? '測試模式' : '測試完成 · 自動通知', target.unit);
  if (target.fallback) setText('task-message', `沿用母卡需求單位「${target.unit}」，${target.recipient} 已收到模擬私訊。`);
}

function readEdit(card) {
  const inputs = new FormData(form);
  const title = inputs.get('title').trim();
  const url = inputs.get('url').trim();
  if (!title) {
    form.elements.title.setCustomValidity('請填入卡片標題。');
    form.elements.title.reportValidity();
    return null;
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    parsed = null;
  }
  if (!parsed || !['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    form.elements.url.setCustomValidity('請填寫有效的 HTTP 或 HTTPS 卡片網址。');
    form.elements.url.reportValidity();
    return null;
  }
  return {
    id: card.id, title, url: parsed.href, unit: inputs.get('unit'), recipient: inputs.get('recipient'),
    message: inputs.get('message').trim(), actor: inputs.get('actor'), before: card.status,
    after: inputs.get('status'), at: Date.now()
  };
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const card = activeCard();
  const edit = readEdit(card);
  if (!edit) return;
  if (event.submitter?.value === 'send') {
    const target = destination(card, edit, false);
    if (target) deliver(target.recipient, card, edit, '手動模擬送出', target.unit);
    return;
  }
  Object.assign(card, { status: edit.after, unit: edit.unit, title: edit.title, url: edit.url });
  const option = form.elements.card.selectedOptions[0];
  option.textContent = card.key + ' · ' + card.title;
  if (edit.before === edit.after) {
    setText('task-message', '卡片已儲存。狀態未變更。');
    return;
  }
  edit.sequence = state.nextEvent++;
  card.history.unshift({ ...edit, field: '狀態', time: displayMinute.format(edit.at).replace(/-/g, '/') });
  card.lastEdit = acceptedEdit(edit, edit.at) ? edit : null;
  lookup('replay').disabled = !card.lastEdit;
  autoNotify(card, edit);
});

form.addEventListener('input', (event) => {
  if (event.target.name === 'title' || event.target.name === 'url') event.target.setCustomValidity('');
});
form.elements.card.addEventListener('change', selectCard);

lookup('toggle').addEventListener('click', () => {
  state.enabled = !state.enabled;
  render();
});

lookup('check').addEventListener('click', () => {
  const card = activeCard();
  const unit = unitName(form.elements.unit.value) || card.parentUnit;
  const recipient = state.recipients[unit];
  setText('check-result', recipient ? `模擬連線正常 · ${unit} → ${recipient}` : `已讀取卡片，${unit}目前未設定收件人。`);
});

lookup('replay').addEventListener('click', () => {
  const card = activeCard();
  if (card.lastEdit) autoNotify(card, card.lastEdit);
});

lookup('conversations').addEventListener('click', (event) => {
  const viewer = event.target.closest('[data-viewer]');
  if (!viewer) return;
  state.viewer = viewer.dataset.viewer;
  renderInbox();
  [...lookup('conversations').children].find((button) => button.dataset.viewer === state.viewer)?.focus();
});

lookup('settings-open').addEventListener('click', () => {
  settingsForm.elements.testMode.checked = state.testMode;
  lookup('recipients').innerHTML = Object.entries(state.recipients).map(([unit, name]) =>
    `<label>${safe(unit)}<input type="text" data-unit="${safe(unit)}" maxlength="24" autocomplete="off" value="${safe(name)}" placeholder="待設定"></label>`
  ).join('');
  dialog.showModal();
});

settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  state.testMode = settingsForm.elements.testMode.checked;
  for (const input of settingsForm.querySelectorAll('[data-unit]')) state.recipients[input.dataset.unit] = input.value.trim();
  if (!recipients().includes(state.viewer)) state.viewer = recipients()[0];
  dialog.close();
  render();
});

dialog.addEventListener('click', (event) => {
  if (event.target.closest('[data-close]')) dialog.close();
});

lookup('test-send').addEventListener('click', () => {
  deliver(testRecipient, { key: '測試通知' }, { title: '模擬連線測試', message: '模擬連線測試成功。' }, '通知測試', '', []);
  dialog.close();
});

lookup('reset').addEventListener('click', reset);
reset();
