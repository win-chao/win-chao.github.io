'use strict';

const people = {
  rd: { name: '林晨', role: 'RD' },
  rd2: { name: '許安', role: 'RD' },
  qa: { name: '陳晴', role: 'QA' },
  qa2: { name: '周月', role: 'QA' }
};

const statuses = {
  TODO: { label: '待處理', color: 'gray', owner: 'maker' },
  IN_PROGRESS: { label: '進行中', color: 'blue', owner: 'maker' },
  READY_FOR_QA: { label: '待驗收', color: 'purple', owner: 'reviewer' },
  TESTING: { label: '驗收中', color: 'cyan', owner: 'reviewer' },
  WAITING_RD_FIX: { label: '待 RD 修正', color: 'red', owner: 'maker' },
  READY_FOR_RETEST: { label: '待複測', color: 'orange', owner: 'reviewer' },
  QA_PASSED: { label: '驗收通過', color: 'green', owner: null }
};

const nextActions = {
  TODO: [{ to: 'IN_PROGRESS', label: '開始實作' }],
  IN_PROGRESS: [{ to: 'READY_FOR_QA', label: '提交 QA 驗收' }],
  READY_FOR_QA: [{ to: 'TESTING', label: '開始驗收' }],
  TESTING: [
    { to: 'QA_PASSED', label: '驗收通過' },
    { to: 'WAITING_RD_FIX', label: '驗收失敗，退回原 RD' }
  ],
  WAITING_RD_FIX: [{ to: 'READY_FOR_RETEST', label: '修正完成，送回原 QA' }],
  READY_FOR_RETEST: [{ to: 'TESTING', label: '開始複測' }],
  QA_PASSED: []
};

const sampleCards = [
  { key: 'APP-24', title: '加入推播偏好設定', type: 'Story', status: 'IN_PROGRESS', maker: 'rd', reviewer: 'qa', sprint: 'sprint', hours: 4, tag: '行動版', description: '讓會員能分別開啟或關閉各類推播，並從設定頁確認變更已儲存。', criteria: '關閉活動通知後，重新開啟設定頁，活動通知仍應顯示關閉。' },
  { key: 'APP-25', title: '空清單顯示引導文字', type: 'Task', status: 'TODO', maker: 'rd', reviewer: 'qa2', sprint: 'sprint', hours: 2, description: '首訪使用者可透過空白清單的引導建立第一筆項目。', criteria: '無資料時顯示可點擊的建立入口。' },
  { key: 'APP-26', title: '修正深色模式的提示文字', type: 'Bug', status: 'READY_FOR_QA', maker: 'rd2', reviewer: 'qa', sprint: 'sprint', hours: 3, description: '調整深色模式的提示文字顏色，確保內容清楚可讀。', criteria: '所有表單提示在深色背景皆清楚可讀。' },
  { key: 'APP-27', title: '會員登入驗證', type: 'Task', status: 'QA_PASSED', maker: 'rd2', reviewer: 'qa2', sprint: 'sprint', hours: 5, description: '完成會員登入與錯誤提示。', criteria: '錯誤密碼須顯示提示，正確密碼可登入。' },
  { key: 'APP-28', title: '新增通知分類篩選', type: 'Story', status: 'TODO', maker: 'rd2', reviewer: 'qa2', sprint: 'backlog', hours: 6, description: '按通知分類查找過往通知。', criteria: '選擇分類後，清單只顯示所選類型。' },
  { key: 'APP-29', title: '更新帳戶頁的地址欄位', type: 'Task', status: 'IN_PROGRESS', maker: 'rd2', reviewer: 'qa2', sprint: 'sprint', hours: 2, description: '將地址拆分成郵遞區號、縣市與詳細地址。', criteria: '儲存後可完整顯示地址。' }
];

const navigation = [
  { key: 'relay4', label: '四格角色接力', icon: 'Layers3' },
  { key: 'workspaces', label: '雙角色工作台', icon: 'Layers3' },
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { key: 'notifications', label: '通知', icon: 'ClipboardList' },
  { key: 'board', label: '專案', icon: 'Layers3' },
  { key: 'issues', label: 'Issue', icon: 'ClipboardList' }
];

const screen = document.getElementById('screen');
const actorSelect = document.getElementById('actor');
const createDialog = document.getElementById('create-dialog');
const createForm = document.getElementById('create-form');
const toast = document.getElementById('toast');
const escapeTable = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => escapeTable[character]);
const icon = (name) => window.relayIcons[name] ?? '';
const findCard = (key) => state.cards.find((card) => card.key === key);
const personName = (id) => people[id]?.name ?? '未指派';
const ownerOf = (card) => card[statuses[card.status].owner];
const issueHref = (key) => '#issue/' + key;

let state = freshState();
let toastTimer;
let draggedCard;
let pointerCard;
let draggedPane;
let createContext;
let previousRoute;
let kanbanPosition = 0;

function freshState() {
  return {
    actor: 'rd', cards: sampleCards.map((card) => ({ ...card, rounds: [], history: [] })),
    notices: [], nextKey: 30, mode: 'board', sprint: 'all', query: '',
    panes: { left: { actor: 'rd', key: 'APP-24', note: '', arrival: null }, right: { actor: 'qa', key: null, note: '', arrival: null } },
    filtersOpen: false, statusFilter: 'all', makerFilter: 'all', dashboardFilter: 'current'
  };
}

actorSelect.innerHTML = Object.entries(people).map(([id, person]) => `<option value="${id}">${person.name} · ${person.role}</option>`).join('');
document.getElementById('back-icon').innerHTML = icon('ArrowLeft');

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3300);
}

function statusBadge(code) {
  const status = statuses[code];
  return `<span class="status-badge status-${status.color}">${status.label}</span>`;
}

function personOptions(role, selected) {
  return Object.entries(people)
    .filter(([, person]) => person.role === role)
    .map(([id, person]) => `<option value="${id}"${selected === id ? ' selected' : ''}>${person.name}</option>`)
    .join('');
}

function renderNavigation(route) {
  const unread = state.notices.filter((notice) => notice.to === state.actor && !notice.read).length;
  const selected = route.startsWith('issue/') ? 'issues' : route;
  document.getElementById('workspace-nav').innerHTML = navigation.map(({ key, label, icon: name }) =>
    `<a href="#${key}" class="nav-link${selected === key ? ' active' : ''}" aria-label="${label}" title="${label}"${selected === key ? ' aria-current="page"' : ''}>${icon(name)}<span>${label}</span>${key === 'notifications' && unread ? `<span class="nav-unread">${unread}</span>` : ''}</a>`
  ).join('');
  const bell = document.getElementById('bell');
  bell.innerHTML = icon('Bell') + (unread ? `<strong>${unread}</strong>` : '');
  bell.setAttribute('aria-label', unread ? `通知，${unread} 則未讀` : '通知');
  actorSelect.closest('.topbar-user').hidden = route === 'workspaces' || route === 'relay4';
  bell.hidden = route === 'workspaces' || route === 'relay4';
  actorSelect.value = state.actor;
  document.getElementById('actor-avatar').textContent = personName(state.actor)[0];
}

function cardMarkup(card) {
  return `<article class="issue-card${card.key === 'APP-24' ? ' demo-featured' : ''}" draggable="true" data-card="${card.key}">
    <div class="issue-card-top"><span class="issue-key">${card.key}</span>${icon('GripVertical')}</div>
    <div class="issue-title"><a class="card-title-button" href="${issueHref(card.key)}">${escapeHtml(card.title)}</a>${card.tag ? ` <span class="issue-project-tag">${card.tag}</span>` : ''}</div>
    <div class="issue-card-sub">${card.type}${card.hours ? ' · ' + card.hours + 'h' : ''}</div>
    <div class="issue-meta">${statusBadge(card.status)}<span class="kanban-assign-pair">
      <span class="kanban-assignee" title="負責人 · ${personName(card.maker)}"><span class="kanban-assignee-avatar">${personName(card.maker)[0]}</span></span>
      <span class="kanban-assignee kanban-reviewer" title="驗收人 · ${personName(card.reviewer)}"><span class="kanban-assignee-avatar">${personName(card.reviewer)[0]}</span></span>
    </span></div>
  </article>`;
}

function issueTable(cards) {
  if (!cards.length) return '<div class="card empty-state">沒有符合條件的卡片</div>';
  return `<div class="card table-scroll"><table class="table issue-list-table"><thead><tr>
    <th scope="col">編號</th><th scope="col">標題</th><th scope="col">狀態</th><th scope="col">負責人</th><th scope="col">驗收人</th>
    </tr></thead><tbody>${cards.map((card) => `<tr>
      <td><a class="issue-key" href="${issueHref(card.key)}">${card.key}</a></td>
      <td><a class="issue-title-link" href="${issueHref(card.key)}">${escapeHtml(card.title)}</a></td>
      <td>${statusBadge(card.status)}</td><td>${personName(card.maker)}</td><td>${personName(card.reviewer)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

function searchForm() {
  return `<form class="listing-filter-form" id="search-form">
    <div class="listing-search-bar"><button class="btn" type="button" data-toggle-filters aria-expanded="${state.filtersOpen}">${state.filtersOpen ? '收合篩選' : '篩選'}</button>
    <input class="input" name="query" aria-label="搜尋編號或標題" placeholder="搜尋編號或標題" value="${escapeHtml(state.query)}">
    <button class="btn" type="submit">搜尋</button>${state.query || state.statusFilter !== 'all' || state.makerFilter !== 'all' ? '<button class="btn" type="button" data-clear-filters>清除</button>' : ''}</div>
    ${state.filtersOpen ? `<div class="card demo-filters">
      <label class="field">Status<select class="select" name="status"><option value="all">全部</option>${Object.entries(statuses).map(([code, status]) => `<option value="${code}"${state.statusFilter === code ? ' selected' : ''}>${status.label}</option>`).join('')}</select></label>
      <label class="field">負責人<select class="select" name="maker"><option value="all">全部</option>${personOptions('RD', state.makerFilter)}</select></label>
      <button class="btn btn-primary" type="submit">套用篩選</button></div>` : ''}
  </form>`;
}

function filteredCards(mode) {
  const query = state.query.toLowerCase();
  return state.cards.filter((card) => {
    if (query && !(card.key + ' ' + card.title).toLowerCase().includes(query)) return false;
    if (state.statusFilter !== 'all' && card.status !== state.statusFilter) return false;
    if (state.makerFilter !== 'all' && card.maker !== state.makerFilter) return false;
    if (mode === 'issues') return true;
    if (mode === 'backlog') return card.sprint === 'backlog';
    return state.sprint === 'all' || card.sprint === state.sprint;
  });
}

function renderBoard() {
  const cards = filteredCards(state.mode);
  const labels = { board: '看板', list: 'List', backlog: 'Backlog' };
  const layout = state.mode === 'board'
    ? `<div class="kanban-viewport" aria-label="專案看板" tabindex="0"><div class="kanban">${Object.entries(statuses).map(([code, status]) => {
        const group = cards.filter((card) => card.status === code);
        return `<section class="kanban-col" data-status="${code}" aria-label="${status.label}">
          <div class="kanban-title">${icon('GripHorizontal')}<span>${status.label}</span><b>${group.length}</b></div>
          <div class="kanban-cards">${group.length ? group.map(cardMarkup).join('') : '<p class="kanban-empty">尚無卡片</p>'}</div>
        </section>`;
      }).join('')}</div></div>`
    : issueTable(cards);

  return `<div class="eyebrow">Project / APP</div>
    <div class="toolbar"><div><h1>會員服務 App</h1><div class="eyebrow">開發、驗收與版本交付</div></div><span class="badge badge-blue">APP</span></div>
    <p class="demo-help"><b>Demo · 模擬資料</b>從 <a class="demo-link" href="#issue/APP-24">APP-24</a> 提交 QA 驗收，再切換右上角的展示角色接球。</p>
    <div class="toolbar"><div class="actions">
      ${Object.entries(labels).map(([mode, label]) => `<button class="btn${state.mode === mode ? ' btn-primary' : ''}" type="button" data-mode="${mode}" aria-pressed="${state.mode === mode}">${label}</button>`).join('')}
      <select class="select compact-select" aria-label="依 Sprint 篩選" id="sprint" ${state.mode === 'backlog' ? 'disabled' : ''}>
        <option value="all" ${state.sprint === 'all' ? 'selected' : ''}>全部 Sprint</option><option value="backlog" ${state.sprint === 'backlog' ? 'selected' : ''}>未排入 Sprint</option><option value="sprint" ${state.sprint === 'sprint' ? 'selected' : ''}>Sprint 24</option>
      </select>
    </div><button type="button" class="btn btn-primary" data-create>＋ 建立卡片</button></div>
    <div class="listing-filter-layout project-board-filter-layout">${searchForm()}<div class="listing-filter-results">${layout}</div></div>`;
}

function renderHandoff(card) {
  const owner = ownerOf(card);
  const actions = nextActions[card.status];
  const watching = owner && owner !== state.actor;
  const shortcut = watching ? `<button type="button" class="btn" data-actor="${owner}">切換到 ${personName(owner)}</button>` : '';
  const form = !watching && actions.length ? `<form id="accept-form" data-key="${card.key}">
    ${card.status === 'TESTING' ? '<label class="field">退回原因（重現步驟／預期結果／實際結果）<textarea class="input" name="reason" rows="3" maxlength="500" placeholder="如果驗收失敗，填寫具體原因"></textarea></label>' : ''}
    <div class="actions">${actions.map((action) => `<button type="submit" name="to" value="${action.to}" class="btn ${action.to === 'WAITING_RD_FIX' ? 'btn-danger' : 'btn-primary'}">${action.label}</button>`).join('')}</div>
    <p class="form-error" role="alert" id="workflow-error" hidden></p>
  </form>` : '';

  return `<section class="card demo-handoff" aria-label="同卡交接">
    <h2>同一張卡，RD／QA 接球</h2>
    <p>目前輪到 <b>${owner ? personName(owner) : '已完成驗收'}</b> ${statusBadge(card.status)}</p>
    <p class="eyebrow">負責人 · ${personName(card.maker)}　驗收人 · ${personName(card.reviewer)}</p>
    ${shortcut}${form}
    ${card.rounds.length ? `<details class="demo-rounds" open><summary>驗收紀錄（${card.rounds.length} 輪）</summary>${
      card.rounds.map((round, index) => `<div class="history-row"><b>第 ${index + 1} 輪 · ${round.result}</b>${round.reason ? `<p class="history-change demo-updated">${escapeHtml(round.reason)}</p>` : ''}</div>`).join('')
    }</details>` : ''}
  </section>`;
}

function renderIssue(card) {
  if (!card) return '<div class="card"><p>找不到這張展示卡片。</p><a class="btn" href="#board">回專案看板</a></div>';
  return `<div class="demo-detail">
    <div class="issue-breadcrumb"><a class="project-back" href="#board">← 專案看板</a><span class="eyebrow">APP / ${card.key}</span></div>
    <h1>${escapeHtml(card.title)}</h1>
    <div class="issue-layout"><div>
      <section class="card demo-description"><h2>描述</h2><p>${escapeHtml(card.description)}</p><h2>驗收條件</h2><p>${escapeHtml(card.criteria)}</p></section>
      ${renderHandoff(card)}
      <section class="card"><h2>歷史紀錄</h2>${card.history.length ? card.history.map((entry) => `<div class="history-row"><b>${personName(entry.actor)}</b><span>${escapeHtml(entry.message)}</span></div>`).join('') : '<p class="eyebrow">操作後會顯示狀態與指派異動</p>'}</section>
    </div><aside class="card issue-details"><h2>詳細資訊</h2>
      <div class="detail-property"><span>狀態</span>${statusBadge(card.status)}</div>
      <div class="detail-property"><span>類型</span><b>${card.type}</b></div>
      <div class="detail-property"><span>Sprint</span><b>${card.sprint === 'sprint' ? 'Sprint 24' : '未排入 Sprint'}</b></div>
      <label class="field">負責人<select class="select" data-assignment="maker" data-key="${card.key}">${personOptions('RD', card.maker)}</select></label>
      <label class="field">驗收人<select class="select" data-assignment="reviewer" data-key="${card.key}">${personOptions('QA', card.reviewer)}</select></label>
    </aside></div>
  </div>`;
}

function renderDashboard() {
  const related = state.cards.filter((card) => [card.maker, card.reviewer].includes(state.actor));
  const groups = [
    { id: 'current', label: '目前輪到我', cards: related.filter((card) => ownerOf(card) === state.actor) },
    { id: 'maker', label: '我負責的', cards: related.filter((card) => card.maker === state.actor) },
    { id: 'reviewer', label: '我驗收的', cards: related.filter((card) => card.reviewer === state.actor) },
    { id: 'done', label: '已完成', cards: related.filter((card) => card.status === 'QA_PASSED') }
  ];
  const current = groups.find((group) => group.id === state.dashboardFilter);
  return `<div class="eyebrow">Workspace</div><h1>Dashboard</h1>
    <div class="grid grid-4 dashboard-metrics demo-metrics">${groups.map((group) => `<section class="card dashboard-metric${group.id === current.id ? ' is-selected' : ''}"><button class="metric-card" type="button" data-dashboard="${group.id}" aria-pressed="${group.id === current.id}"><div class="metric">${group.cards.length}</div><div class="metric-label">${group.label}</div></button></section>`).join('')}</div>
    <div class="toolbar"><h2>我的工作 · ${current.label}</h2><a class="btn" href="#board">開啟專案</a></div>${issueTable(current.cards)}`;
}

function renderNotices() {
  const notices = state.notices.filter((notice) => notice.to === state.actor);
  return `<div class="eyebrow">Workspace</div><h1>通知</h1>
    ${notices.length ? notices.map((notice) => `<button type="button" class="card demo-notice${notice.read ? ' demo-notice-read' : ''}" data-notice="${notice.id}">
      <b>${notice.key}</b> · ${escapeHtml(notice.title)}<p class="eyebrow">${escapeHtml(notice.message)}</p>
    </button>`).join('') : '<div class="card empty-state">交接後，接球人可在這裡查看通知</div>'}`;
}

function render() {
  const route = location.hash.slice(1) || 'relay4';
  if (previousRoute === 'board') {
    const viewport = screen.querySelector('.kanban-viewport');
    if (viewport) kanbanPosition = viewport.scrollLeft;
  }
  renderNavigation(route);
  if (route.startsWith('issue/')) screen.innerHTML = renderIssue(findCard(route.slice(6)));
  else if (route === 'relay4') screen.innerHTML = window.renderRelay4();
  else if (route === 'workspaces') screen.innerHTML = renderWorkspaces();
  else if (route === 'dashboard') screen.innerHTML = renderDashboard();
  else if (route === 'notifications') screen.innerHTML = renderNotices();
  else if (route === 'issues') screen.innerHTML = `<div class="eyebrow">Workspace</div><h1>Issue</h1>${searchForm()}${issueTable(filteredCards('issues'))}`;
  else screen.innerHTML = renderBoard();
  const viewport = screen.querySelector('.kanban-viewport');
  if (viewport) viewport.scrollLeft = kanbanPosition;
  if (route !== previousRoute) window.scrollTo(0, 0);
  previousRoute = route;
}
window.relayShowToast = showToast;

function switchActor(actor) {
  if (!people[actor]) return;
  state.actor = actor;
  render();
  showToast(`已切換至 ${personName(actor)} · ${people[actor].role}`);
}

function writeNotice(to, card, message) {
  state.notices.unshift({ id: state.notices.length + 1, to, key: card.key, title: card.title, read: false, message });
}

function transition(card, destination, reason = '', actor = state.actor) {
  const action = nextActions[card.status].find((option) => option.to === destination);
  if (!action) return '請依卡片目前狀態選擇下一個步驟。';
  if (ownerOf(card) !== actor) return `請切換到 ${personName(ownerOf(card))} 執行交接。`;
  if (destination === 'WAITING_RD_FIX' && !reason.trim()) return '請填寫退回原因，方便負責人依步驟重現。';

  const from = statuses[card.status].label;
  const previousOwner = ownerOf(card);
  card.status = destination;
  if (destination === 'READY_FOR_QA' || destination === 'READY_FOR_RETEST') {
    card.rounds.push({ result: '等待驗收', reason: '' });
  }
  if (destination === 'TESTING') {
    if (!card.rounds.length) card.rounds.push({ result: '進行驗收', reason: '' });
    card.rounds.at(-1).result = '進行驗收';
  }
  if (destination === 'WAITING_RD_FIX' || destination === 'QA_PASSED') {
    Object.assign(card.rounds.at(-1), { result: destination === 'QA_PASSED' ? '通過' : '失敗', reason: reason.trim() });
  }

  card.history.unshift({ actor, message: `${from} → ${statuses[destination].label}` });
  const recipient = ownerOf(card) ?? card.maker;
  if (recipient !== previousOwner) {
    writeNotice(recipient, card, `${personName(actor)} · ${action.label}`);
  }
  updateRolePanes(card, previousOwner, actor, action.label);
  render();
  showToast(`${card.key} · ${action.label}`);
  return '';
}

document.getElementById('reset').addEventListener('click', () => {
  state = freshState();
  window.resetRelay4?.();
  kanbanPosition = 0;
  previousRoute = undefined;
  if (createDialog.open) createDialog.close();
  if (location.hash !== '#relay4') location.hash = '#relay4';
  render();
  showToast('已重置所有展示資料');
});

actorSelect.addEventListener('change', () => switchActor(actorSelect.value));
window.addEventListener('hashchange', render);

function openCreateDialog(parent, side) {
  createContext = parent ? { parent, side } : null;
  createForm.reset();
  createForm.elements.maker.innerHTML = personOptions('RD', parent?.maker ?? 'rd');
  createForm.elements.reviewer.innerHTML = personOptions('QA', parent?.reviewer ?? 'qa');
  if (parent) createForm.elements.sprint.value = parent.sprint;
  const title = parent ? '建立子卡' : '建立卡片';
  document.getElementById('create-title').textContent = title;
  const relation = document.getElementById('create-parent');
  relation.hidden = !parent;
  relation.textContent = parent ? '母卡 · ' + parent.key : '';
  createForm.querySelector('[type="submit"]').textContent = title;
  createDialog.showModal();
  createForm.elements.title.focus();
}

screen.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  const side = event.target.closest('[data-role-pane]')?.dataset.rolePane;
  if (side && workspaceClick(button, side)) return;
  if (button?.hasAttribute('data-create')) {
    openCreateDialog();
  } else if (button?.dataset.mode) {
    state.mode = button.dataset.mode;
    render();
  } else if (button?.dataset.actor) {
    switchActor(button.dataset.actor);
  } else if (button?.dataset.dashboard) {
    state.dashboardFilter = button.dataset.dashboard;
    render();
  } else if (button?.dataset.notice) {
    const notice = state.notices.find((item) => item.id === Number(button.dataset.notice));
    notice.read = true;
    location.hash = issueHref(notice.key);
  } else if (button?.hasAttribute('data-toggle-filters')) {
    state.filtersOpen = !state.filtersOpen;
    render();
  } else if (button?.hasAttribute('data-clear-filters')) {
    Object.assign(state, { query: '', statusFilter: 'all', makerFilter: 'all' });
    render();
  } else if (!event.target.closest('a, button') && event.target.closest('[data-card]')) {
    location.hash = issueHref(event.target.closest('[data-card]').dataset.card);
  }
});

screen.addEventListener('change', (event) => {
  const element = event.target;
  const side = element.closest('[data-role-pane]')?.dataset.rolePane;
  if (side) workspaceChange(element, side);
  else if (element.id === 'sprint') {
    state.sprint = element.value;
    render();
  } else if (element.dataset.assignment) {
    const card = findCard(element.dataset.key);
    const role = element.dataset.assignment;
    card[role] = element.value;
    const description = role === 'maker' ? '負責人' : '驗收人';
    card.history.unshift({ actor: state.actor, message: `${description}改為 ${personName(element.value)}` });
    render();
    showToast(`已更新 ${description}`);
  }
});

screen.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  const fields = new FormData(form);
  if (form.id === 'search-form') {
    state.query = fields.get('query').trim();
    state.statusFilter = fields.get('status') ?? state.statusFilter;
    state.makerFilter = fields.get('maker') ?? state.makerFilter;
    render();
  } else if (form.dataset.workForm) {
    const side = form.closest('[data-role-pane]').dataset.rolePane;
    const error = transition(findCard(form.dataset.workForm), event.submitter?.value, fields.get('reason') ?? '', state.panes[side].actor);
    if (error) {
      const message = form.querySelector('[data-work-error]');
      message.textContent = error;
      message.hidden = false;
      form.elements.reason?.focus();
    }
  } else if (form.id === 'accept-form') {
    const error = transition(findCard(form.dataset.key), event.submitter?.value, fields.get('reason') ?? '');
    if (error) {
      const message = document.getElementById('workflow-error');
      message.textContent = error;
      message.hidden = false;
      form.elements.reason?.focus();
    }
  }
});

createDialog.addEventListener('click', (event) => {
  if (event.target.closest('[data-close]')) createDialog.close();
});

createForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = new FormData(createForm);
  const title = fields.get('title').trim();
  if (!title) {
    createForm.elements.title.focus();
    return;
  }
  const key = 'APP-' + state.nextKey++;
  const parent = createContext?.parent;
  const card = { key, title, type: fields.get('type'), status: 'TODO', sprint: fields.get('sprint'), maker: fields.get('maker'), reviewer: fields.get('reviewer'), parentKey: parent?.key, description: '展示中建立的卡片。', criteria: '完成後可由指定驗收人確認結果。', rounds: [], history: [] };
  state.cards.push(card);
  createDialog.close();
  if (parent) {
    const { side } = createContext;
    const to = activePaneIndex(card.maker);
    state.panes[side].note = '已將 ' + parent.key + ' 拆出子卡 ' + key + ' · 負責人 ' + personName(card.maker);
    parent.history.unshift({ actor: state.panes[side].actor, message: '已建立子卡 ' + key });
    if (to) {
      state.panes[to].key = key;
      state.panes[to].arrival = key;
    }
    if (card.maker !== state.panes[side].actor) writeNotice(card.maker, card, '已指派你為新子卡負責人');
    render();
  } else {
    location.hash = issueHref(key);
  }
  createContext = null;
  showToast(`已建立 ${key}`);
});

screen.addEventListener('pointerdown', (event) => {
  pointerCard = event.target.closest('[data-card], [data-work-card][draggable="true"]');
});

screen.addEventListener('dragstart', (event) => {
  const element = pointerCard ?? event.target.closest('[data-card], [data-work-card][draggable="true"]');
  if (!element) return;
  const card = findCard(element.dataset.card ?? element.dataset.workCard);
  draggedCard = card.key;
  draggedPane = element.closest('[data-role-pane]')?.dataset.rolePane;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', card.key);
  element.classList.add('is-dragging');
});

screen.addEventListener('dragover', (event) => {
  const pane = event.target.closest('[data-role-pane]');
  if (pane && draggedPane && pane.dataset.rolePane !== draggedPane) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    pane.classList.add('is-drop-target');
    return;
  }
  screen.querySelector('.is-drop-target')?.classList.remove('is-drop-target');
  const column = event.target.closest('[data-status]');
  if (!column || !draggedCard) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  screen.querySelector('.kanban-col.is-over')?.classList.remove('is-over');
  column.classList.add('is-over');
});

screen.addEventListener('drop', (event) => {
  const pane = event.target.closest('[data-role-pane]');
  if (pane && draggedPane) {
    event.preventDefault();
    const card = findCard(draggedCard);
    const from = draggedPane;
    const to = pane.dataset.rolePane;
    clearDrag();
    workspaceDrop(card, from, to);
    return;
  }
  const column = event.target.closest('[data-status]');
  if (!column || !draggedCard) return;
  event.preventDefault();
  const card = findCard(draggedCard);
  const target = column.dataset.status;
  draggedCard = undefined;
  if (target === 'WAITING_RD_FIX' && card.status === 'TESTING' && ownerOf(card) === state.actor) {
    location.hash = issueHref(card.key);
    showToast('在卡片中填寫退回原因並確認');
  } else if (target !== card.status) {
    const error = transition(card, target);
    if (error) showToast(error);
  }
  clearDrag();
});

function clearDrag() {
  draggedCard = undefined;
  pointerCard = undefined;
  draggedPane = undefined;
  screen.querySelector('.is-drop-target')?.classList.remove('is-drop-target');
  screen.querySelector('.is-dragging')?.classList.remove('is-dragging');
  screen.querySelector('.is-over')?.classList.remove('is-over');
}

screen.addEventListener('dragend', clearDrag);
render();
