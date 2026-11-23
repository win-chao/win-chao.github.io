'use strict';

const paneLabels = { left: '左側', right: '右側' };
const paneKeys = Object.keys(paneLabels);

function activePaneIndex(actor) {
  return paneKeys.find((side) => state.panes[side].actor === actor);
}

function belongsInPane(card, actor) {
  return card.maker === actor || card.reviewer === actor;
}

function workspaceCard(card, side, active) {
  const selected = state.panes[side].key === card.key;
  return `<article class="issue-card role-card${selected ? ' is-selected' : ''}${state.panes[side].arrival === card.key ? ' is-arrival' : ''}" data-work-card="${card.key}" draggable="${active}">
    <button type="button" class="role-card-link" data-work-open="${card.key}" aria-expanded="${selected}">
      <span class="role-card-main"><span class="issue-key">${card.key}</span><strong>${escapeHtml(card.title)}</strong>
        <span class="role-card-meta">${card.parentKey ? '子卡 · ' + card.parentKey : card.type} · 負責 ${personName(card.maker)} · 驗收 ${personName(card.reviewer)}</span>
      </span><span class="role-card-status">${statusBadge(card.status)}${active ? icon('GripVertical') : ''}</span>
    </button>
  </article>`;
}

function workspaceDetail(card, side) {
  const pane = state.panes[side];
  const actor = pane.actor;
  const owner = ownerOf(card);
  const canAssign = Boolean(owner) && (actor === owner || actor === card.maker);
  const actions = actor === owner ? nextActions[card.status] : [];
  const children = state.cards.filter((item) => item.parentKey === card.key);
  return `<section class="role-detail" aria-label="${card.key} 卡片詳情">
    <div class="role-detail-head"><div><span class="issue-key">${card.key}</span><h3>${escapeHtml(card.title)}</h3></div>${statusBadge(card.status)}</div>
    <p>${escapeHtml(card.criteria)}</p>
    ${canAssign ? `<div class="role-assignment">
      <label class="field">負責人<select class="select" data-work-assign="maker" data-key="${card.key}">${personOptions('RD', card.maker)}</select></label>
      <label class="field">驗收人<select class="select" data-work-assign="reviewer" data-key="${card.key}">${personOptions('QA', card.reviewer)}</select></label></div>`
      : `<p class="eyebrow">${owner ? '目前輪到 ' + personName(owner) : '此卡片已完成驗收'}</p>`}
    ${children.length ? `<p class="eyebrow">子卡 ${children.map((child) => `<a href="${issueHref(child.key)}" class="demo-link">${child.key}</a>`).join('、')}</p>` : ''}
    ${actions.length || (canAssign && actor === card.maker) ? `<form data-work-form="${card.key}">
      ${card.status === 'TESTING' && actor === owner ? '<label class="field">退回原因<textarea name="reason" class="input" rows="2" maxlength="500" placeholder="重現步驟／預期結果／實際結果"></textarea></label>' : ''}
      <div class="actions">
        ${actions.map((action) => `<button type="submit" name="to" value="${action.to}" class="btn ${action.to === 'WAITING_RD_FIX' ? 'btn-danger' : 'btn-primary'}">${action.label}</button>`).join('')}
        ${canAssign && actor === card.maker ? `<button class="btn" type="button" data-split-child="${card.key}">拆子卡</button>` : ''}
      </div><p class="form-error" data-work-error role="alert" hidden></p>
    </form>` : ''}
    ${card.rounds.length ? `<details class="demo-rounds"><summary>驗收紀錄（${card.rounds.length} 輪）</summary>${card.rounds.map((round, index) =>
      `<p><b>第 ${index + 1} 輪 · ${round.result}</b>${round.reason ? ' · ' + escapeHtml(round.reason) : ''}</p>`).join('')}</details>` : ''}
  </section>`;
}

function workspacePane(side) {
  const { actor, key, note } = state.panes[side];
  const person = people[actor];
  const other = state.panes[side === 'left' ? 'right' : 'left'].actor;
  const cards = state.cards.filter((card) => belongsInPane(card, actor));
  const active = cards.filter((card) => ownerOf(card) === actor);
  const waiting = cards.filter((card) => ownerOf(card) && ownerOf(card) !== actor);
  const done = cards.filter((card) => !ownerOf(card));
  const selected = cards.find((card) => card.key === key);
  const unread = state.notices.filter((notice) => notice.to === actor && !notice.read).length;
  const actorOptions = Object.entries(people).map(([id, member]) =>
    `<option value="${id}" ${id === actor ? 'selected' : ''} ${id === other ? 'disabled' : ''}>${member.name} · ${member.role}</option>`).join('');

  return `<section class="card role-workspace role-${person.role.toLowerCase()}" data-role-pane="${side}" aria-label="${paneLabels[side]}${person.role} 工作台">
    <header class="role-head">
      <div class="role-identity"><span class="role-avatar" aria-hidden="true">${person.name[0]}</span><div><h2>${person.role} 工作台</h2><p>目前輪到我 · ${active.length} 張</p></div></div>
      <div class="role-head-actions"><label class="role-select-label"><select class="select" data-work-actor="${side}" aria-label="${paneLabels[side]}角色">${actorOptions}</select></label>
      ${unread ? `<button type="button" class="btn role-notifications" data-work-notices="${side}">${icon('Bell')} ${unread} 則通知</button>` : ''}</div>
    </header>
    ${note ? `<p class="role-note" role="status">${escapeHtml(note)}</p>` : ''}
    <div class="role-body">
      <div class="role-current">
        <h3>我的工作</h3>
        ${active.length ? active.map((card) => workspaceCard(card, side, true)).join('') : '<p class="role-empty">目前沒有輪到我的卡片。</p>'}
      </div>
      ${selected ? workspaceDetail(selected, side) : ''}
      ${waiting.length ? `<details class="role-queue" ${waiting.some((item) => item.key === key) ? 'open' : ''}><summary>等待交接 <span>${waiting.length}</span></summary>${waiting.map((card) => workspaceCard(card, side, false)).join('')}</details>` : ''}
      ${done.length ? `<details class="role-queue" ${done.some((item) => item.key === key) ? 'open' : ''}><summary>已完成 <span>${done.length}</span></summary>${done.map((card) => workspaceCard(card, side, false)).join('')}</details>` : ''}
    </div>
  </section>`;
}

function renderWorkspaces() {
  return `<div class="toolbar workspaces-title"><div><h1>雙角色工作台</h1><div class="eyebrow">會員服務 App · Sprint 24</div></div><a class="btn" href="#board">專案看板</a></div>
    <p class="demo-help"><b>Demo · 模擬資料</b>試著在左側操作 APP-24 的指派、拆子卡或提交 QA 驗收。也可以把卡片拖到另一側交接。</p>
    <div class="role-grid">${paneKeys.map(workspacePane).join('')}</div>`;
}

function updateRolePanes(card, previousOwner, actor, actionLabel) {
  const nextOwner = ownerOf(card);
  const from = activePaneIndex(previousOwner);
  const to = activePaneIndex(nextOwner);
  if (nextOwner === previousOwner || !previousOwner) return;
  if (from && nextOwner) {
    state.panes[from].key = null;
    state.panes[from].arrival = null;
    state.panes[from].note = `${card.key} 已交給${personName(nextOwner)} · ${statuses[card.status].label}`;
  }
  if (to) {
    state.panes[to].key = card.key;
    state.panes[to].arrival = card.key;
    state.panes[to].note = `收到 ${card.key} · ${actionLabel}`;
  }
  if (!nextOwner && from) {
    state.panes[from].key = card.key;
    state.panes[from].arrival = null;
    state.panes[from].note = `${card.key} 已完成驗收`;
    const maker = activePaneIndex(card.maker);
    if (maker && maker !== from) state.panes[maker].note = `${card.key} · ${personName(actor)}已確認驗收通過`;
  }
}

function assignCard(card, role, assignee, actor) {
  if (card[role] === assignee) return;
  const oldOwner = ownerOf(card);
  const description = role === 'maker' ? '負責人' : '驗收人';
  card[role] = assignee;
  writeNotice(assignee, card, `${personName(actor)} · 已指派你為${description}`);
  card.history.unshift({ actor, message: `${description}改為 ${personName(assignee)}` });
  updateRolePanes(card, oldOwner, actor, '更新' + description);
  render();
  showToast(`${card.key} · ${description}改為 ${personName(assignee)}`);
}

function workspaceDrop(card, fromSide, toSide) {
  if (fromSide === toSide) return;
  const from = state.panes[fromSide].actor;
  const to = state.panes[toSide].actor;
  if (ownerOf(card) !== from) return;
  const nextAction = nextActions[card.status].find((entry) => card[statuses[entry.to].owner] === to);
  if (nextAction?.to === 'WAITING_RD_FIX') {
    state.panes[fromSide].key = card.key;
    render();
    screen.querySelector(`[data-role-pane="${fromSide}"] textarea[name="reason"]`)?.focus();
    showToast('填寫退回原因後，即可交還 RD');
  } else if (nextAction) {
    const error = transition(card, nextAction.to, '', from);
    if (error) showToast(error);
  } else if (people[from].role === people[to].role) {
    assignCard(card, people[to].role === 'RD' ? 'maker' : 'reviewer', to, from);
  } else {
    showToast(`${card.key} 目前無法交接給${personName(to)}。請核對指派與卡片狀態。`);
  }
}

function workspaceClick(button, side) {
  if (button?.dataset.workOpen) {
    const pane = state.panes[side];
    pane.key = pane.key === button.dataset.workOpen ? null : button.dataset.workOpen;
    render();
    return true;
  }
  if (button?.dataset.splitChild) {
    openCreateDialog(findCard(button.dataset.splitChild), side);
    return true;
  }
  if (button?.dataset.workNotices) {
    state.actor = state.panes[side].actor;
    location.hash = 'notifications';
    return true;
  }
  return false;
}

function workspaceChange(element, side) {
  const pane = state.panes[side];
  if (element.hasAttribute('data-work-actor')) {
    state.panes[side] = { actor: element.value, key: null, note: '', arrival: null };
    render();
    screen.querySelector(`[data-work-actor="${side}"]`)?.focus();
  } else if (element.dataset.workAssign) {
    assignCard(findCard(element.dataset.key), element.dataset.workAssign, element.value, pane.actor);
  }
}
