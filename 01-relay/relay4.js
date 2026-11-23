(function () {
  'use strict';

  const STORAGE = 'relay-four-boards-demo-v1';
  const PEOPLE = {
    alex: { name: 'Alex', initial: 'A', role: 'rd' },
    daniel: { name: 'Daniel', initial: 'D', role: 'rd' },
    win: { name: 'Win', initial: 'W', role: 'qa' }
  };
  const BOARDS = {
    rd1: { role: 'rd', person: 'alex', label: 'RD1' },
    rd2: { role: 'rd', person: 'daniel', roleLabel: 'RD2', label: 'RD2' },
    qa: { role: 'qa', person: 'win', label: 'QA1' }
  };
  const STATUSES = ['new', 'ready'];
  const chevron = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const personName = (id) => PEOPLE[id]?.name || '未指派';
  const roleName = (role) => (role === 'rd' ? '製作人 RD' : '驗收人 QA');

  function freshData() {
    return {
      schema: 4,
      managerExpanded: { alex: true, daniel: false },
      expanded: {},
      cards: [
        { id: 'WEB-128', parent: null, title: '開戶流程優化與契約修正', rd: 'alex', qa: null, status: 'new', version: '' },
        { id: 'WEB-129', parent: 'WEB-128', title: '開戶同意書排版修正', rd: 'alex', qa: 'win', status: 'new', version: '' },
        { id: 'WEB-130', parent: 'WEB-128', title: '契約帶入客戶姓名與身分證字號', rd: 'alex', qa: 'win', status: 'new', version: 'v1.0.0' },
        { id: 'WEB-131', parent: 'WEB-128', title: '交易認知契約內容調整', rd: 'alex', qa: 'win', status: 'new', version: 'v1.0.0' },
        { id: 'WEB-132', parent: 'WEB-128', title: '入金銀行錯誤提示', rd: 'alex', qa: 'win', status: 'ready', version: 'v1.0.0' },
        { id: 'WEB-133', parent: 'WEB-128', title: '手機版同意按鈕調整', rd: 'daniel', qa: 'win', status: 'new', version: '' },
        { id: 'WEB-134', parent: 'WEB-128', title: '信箱驗證與案件建立', rd: 'daniel', qa: 'win', status: 'ready', version: 'v1.0.0' }
      ]
    };
  }

  let data;
  let arrival = null;
  let pickerInfo = null;
  let initialized = false;

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null');
    data = saved?.schema === 4 && Array.isArray(saved.cards) && saved.cards.length
      && saved.cards.every((c) => typeof c.id === 'string' && typeof c.title === 'string' && PEOPLE[c.rd]?.role === 'rd' && (!c.qa || PEOPLE[c.qa]?.role === 'qa') && STATUSES.includes(c.status))
      ? saved : freshData();
    data.expanded ||= {};
    data.managerExpanded ||= { alex: true, daniel: false };
  } catch {
    data = freshData();
  }

  function persist() {
    try { localStorage.setItem(STORAGE, JSON.stringify(data)); } catch {}
  }

  function findCard(id) {
    return data.cards.find((c) => c.id === id);
  }

  function matches(c, board) {
    const { role, person } = BOARDS[board];
    return c[role] === person && c.status === (role === 'rd' ? 'new' : 'ready');
  }

  function groupKey(board, id) {
    return board + ':' + id;
  }

  function isExpanded(role, id) {
    return data.expanded[groupKey(role, id)] !== false;
  }

  function visibleGroups(board) {
    const visible = data.cards.filter((c) => matches(c, board));
    const ids = new Set(visible.map((c) => c.id));
    return visible.filter((c) => !c.parent || !ids.has(c.parent)).map((root) => ({
      root,
      children: root.parent ? [] : visible.filter((c) => c.parent === root.id)
    }));
  }

  function avatarMarkup(c, role) {
    const id = c[role];
    const label = roleName(role) + '：' + personName(id);
    return `<div class="r4-avatar-wrap"><button type="button" class="r4-avatar ${role === 'qa' ? 'qa' : ''}" data-r4-assign="${role}" data-r4-card="${c.id}" aria-label="${c.id} ${label}" aria-haspopup="dialog" title="${label}">${PEOPLE[id]?.initial || '?'}</button><span class="r4-tooltip">${label}</span></div>`;
  }

  function rowMarkup(c, board, nested = false, childCount = 0) {
    const { role } = BOARDS[board];
    const parent = findCard(c.parent);
    const isMother = !c.parent;
    return `<article class="r4-card-row ${isMother ? 'parent' : ''} ${arrival === c.id ? 'arrived' : ''}" data-r4-card-id="${c.id}" aria-label="${c.id} ${isMother ? '母卡' : '子卡'} ${esc(c.title)}">
      <div class="r4-card-title">
        <div class="r4-topline"><span class="r4-key">${c.id}</span><span class="r4-type ${isMother ? '' : 'task'}">${isMother ? '母卡 · User Story' : 'Task'}</span></div>
        <h3>${esc(c.title)}</h3>
        ${parent && !nested ? `<div class="r4-parent-ref">↳ 母卡 ${parent.id} · ${esc(parent.title)}</div>` : ''}
      </div>
      ${role === 'rd'
        ? `<input class="r4-version-input" type="text" data-r4-version="${c.id}" aria-label="${c.id} 上版版本" value="${esc(c.version)}" placeholder="輸入版號" maxlength="80" autocomplete="off" spellcheck="false">`
        : `<span class="r4-version-value ${c.version ? '' : 'unset'}">${esc(c.version || '未填版本')}</span>`}
      <select class="r4-select r4-status ${c.status === 'ready' ? 'ready' : ''}" data-r4-status="${c.id}" aria-label="${c.id} 狀態">
        <option value="new" ${c.status === 'new' ? 'selected' : ''}>New</option>
        <option value="ready" ${c.status === 'ready' ? 'selected' : ''}>Ready for test</option>
      </select>
      ${avatarMarkup(c, 'rd')}${avatarMarkup(c, 'qa')}
      ${isMother ? `<button type="button" class="r4-expand" data-r4-expand="${c.id}" data-r4-role="${board}" aria-label="${isExpanded(board, c.id) ? '收合' : '展開'} ${c.id} 的子卡（${childCount} 張）" aria-expanded="${isExpanded(board, c.id)}">${chevron}</button>` : '<span aria-hidden="true"></span>'}
    </article>`;
  }

  function boardMarkup(board) {
    const { role, person: who, label } = BOARDS[board];
    const groups = visibleGroups(board);
    const count = data.cards.filter((c) => matches(c, board)).length;
    return `<section class="r4-workspace" id="r4-${board}-board" aria-label="${label} 工作台">
      <div class="r4-ws-header">
        <div class="r4-ws-heading">
          <span class="r4-avatar big ${role === 'qa' ? 'qa' : ''}" aria-hidden="true">${PEOPLE[who].initial}</span>
          <div><h2>${label} 工作台 <span class="r4-count">${count}</span></h2><p>${role === 'qa' ? 'Ready for test · 等我驗收' : 'New · 等我製作／修正'}</p></div>
        </div>
        <span class="r4-board-person">${personName(who)}</span>
      </div>
      <div class="r4-list-scroll"><div class="r4-list-inner">
        <div class="r4-columns" aria-hidden="true"><span>卡片</span><span>上版版本</span><span>狀態</span><span class="center">製作</span><span class="center">驗收</span><span></span></div>
        ${groups.length ? groups.map(({ root, children }) => `<div class="r4-card-group" data-r4-group="${root.id}">
          ${rowMarkup(root, board, false, children.length)}
          ${!root.parent ? `<div class="r4-children" ${isExpanded(board, root.id) ? '' : 'hidden'}>
            ${children.length ? children.map((c) => rowMarkup(c, board, true)).join('') : `<div class="r4-empty-children">目前沒有指派給 ${personName(who)} 且${role === 'qa' ? '待驗收' : '待製作'}的子卡</div>`}
          </div>` : ''}
        </div>`).join('') : `<div class="r4-empty">目前沒有${role === 'qa' ? '待驗收' : '待製作／修正'}的卡片<small>${role === 'qa' ? 'RD 將卡片改為 Ready for test 後，會出現在這裡。' : 'QA 將卡片改回 New 後，會回到這裡。'}</small></div>`}
      </div></div>
    </section>`;
  }

  function managerAvatar(c, role) {
    const id = c[role];
    const label = roleName(role) + '：' + personName(id);
    return `<div class="r4-avatar-wrap"><span class="r4-avatar ${role === 'qa' ? 'qa' : ''}" role="img" aria-label="${label}" title="${label}">${PEOPLE[id]?.initial || '?'}</span><span class="r4-tooltip">${label}</span></div>`;
  }

  function managerRow(c, nested = false) {
    const parent = findCard(c.parent);
    return `<article class="r4-manager-card ${c.parent ? '' : 'parent'}" data-r4-manager-card="${c.id}">
      <div class="r4-card-title">
        <div class="r4-topline"><span class="r4-key">${c.id}</span><span class="r4-type ${c.parent ? 'task' : ''}">${c.parent ? 'Task' : '母卡'}</span></div>
        <h3><button type="button" class="r4-manager-link" data-r4-locate="${c.id}" aria-label="在工作台查看 ${c.id}">${esc(c.title)}</button></h3>
        ${parent && !nested ? `<div class="r4-parent-ref">↳ 母卡 ${parent.id}</div>` : ''}
      </div>
      <span class="r4-version-value ${c.version ? '' : 'unset'}">${esc(c.version || '未填版本')}</span>
      <span class="r4-manager-state ${c.status === 'ready' ? 'ready' : ''}">${c.status === 'ready' ? 'Ready for test' : 'New'}</span>
      ${managerAvatar(c, 'rd')}${managerAvatar(c, 'qa')}
    </article>`;
  }

  function managerMarkup() {
    return `<section class="r4-workspace r4-manager" id="r4-manager-board" aria-label="RD 主管組員工作總覽">
      <div class="r4-ws-header">
        <div class="r4-ws-heading">
          <span class="r4-avatar big" aria-hidden="true">R</span>
          <div><h2>組員工作總覽</h2><p>依製作人查看全部卡片，交測後仍可追蹤</p></div>
        </div>
        <span class="r4-manager-label">RD 主管</span>
      </div>
      <div class="r4-manager-content">
        ${['alex', 'daniel'].map((id) => {
          const cards = data.cards.filter((c) => c.rd === id);
          const ready = cards.filter((c) => c.status === 'ready').length;
          const ids = new Set(cards.map((c) => c.id));
          const roots = cards.filter((c) => !c.parent || !ids.has(c.parent));
          const open = data.managerExpanded[id] !== false;
          const pct = cards.length ? Math.round((ready / cards.length) * 100) : 0;
          return `<section class="r4-member-block">
            <button type="button" class="r4-member-summary" data-r4-member-toggle="${id}" aria-expanded="${open}">
              <span class="r4-member-person"><span class="r4-avatar" aria-hidden="true">${PEOPLE[id].initial}</span>${personName(id)}</span>
              <span class="r4-member-numbers">待製作／修正 ${cards.length - ready} · <b>已交測 ${ready} / ${cards.length}</b></span>
              ${chevron}
            </button>
            <div class="r4-member-track" role="progressbar" aria-label="${personName(id)} 交測比例" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
            <div class="r4-member-items" ${open ? '' : 'hidden'}>
              ${cards.length ? `<div class="r4-member-items-inner">
                <div class="r4-manager-columns" aria-hidden="true"><span>卡片</span><span>上版版本</span><span>狀態</span><span class="center">製作</span><span class="center">驗收</span></div>
                ${roots.map((c) => {
                  const children = cards.filter((x) => x.parent === c.id);
                  return managerRow(c) + (children.length ? `<div class="r4-manager-children">${children.map((child) => managerRow(child, true)).join('')}</div>` : '');
                }).join('')}
              </div>` : '<div class="r4-manager-empty">目前沒有指派的卡片。</div>'}
            </div>
          </section>`;
        }).join('')}
      </div>
    </section>`;
  }

  function ensurePicker() {
    let picker = document.getElementById('r4-picker');
    if (!picker) {
      picker = document.createElement('div');
      picker.id = 'r4-picker';
      picker.className = 'r4-picker';
      picker.hidden = true;
      document.body.appendChild(picker);
    }
    return picker;
  }

  function closePicker(focus = false) {
    const picker = document.getElementById('r4-picker');
    const previous = pickerInfo;
    pickerInfo = null;
    if (picker) {
      picker.hidden = true;
      picker.innerHTML = '';
    }
    if (focus && previous) {
      document.querySelector(`[data-r4-card-id="${previous.card}"] [data-r4-assign="${previous.role}"]`)?.focus();
    }
  }

  function openPicker(button) {
    const id = button.dataset.r4Card;
    const role = button.dataset.r4Assign;
    const c = findCard(id);
    if (pickerInfo?.card === id && pickerInfo.role === role) {
      closePicker();
      return;
    }
    closePicker();
    pickerInfo = { card: id, role };
    const box = button.getBoundingClientRect();
    const picker = ensurePicker();
    picker.innerHTML = `<div class="r4-picker-title">${roleName(role)} · ${id}</div>${Object.entries(PEOPLE)
      .filter(([, p]) => p.role === role)
      .map(([pid, p]) => `<button type="button" class="r4-person-option ${c[role] === pid ? 'selected' : ''}" data-r4-person="${pid}" aria-label="指派給 ${p.name}">
        <span class="r4-avatar ${role === 'qa' ? 'qa' : ''}" aria-hidden="true">${p.initial}</span><span>${p.name}</span>${c[role] === pid ? '<span class="r4-check">✓</span>' : ''}
      </button>`).join('')}`;
    picker.setAttribute('role', 'dialog');
    picker.setAttribute('aria-label', '選擇' + roleName(role));
    picker.hidden = false;
    const height = picker.getBoundingClientRect().height;
    picker.style.left = Math.max(10, Math.min(box.right - 200, window.innerWidth - 210)) + 'px';
    picker.style.top = (box.bottom + height + 10 < window.innerHeight ? box.bottom + 7 : Math.max(10, box.top - height - 7)) + 'px';
    picker.querySelector('.r4-person-option.selected, .r4-person-option')?.focus();
  }

  function destination(c) {
    return c.status === 'ready' ? 'qa' : c.rd === 'alex' ? 'rd1' : 'rd2';
  }

  function revealInDestination(c) {
    const board = destination(c);
    if (matches(c, board) && c.parent) {
      data.expanded[groupKey(board, c.parent)] = true;
    }
    arrival = c.id;
  }

  function rerenderInPlace() {
    const host = document.getElementById('screen');
    if (!host || !host.querySelector('.r4-workspaces')) return;
    const scrolls = {};
    ['rd1', 'rd2', 'qa'].forEach((b) => {
      const s = host.querySelector(`#r4-${b}-board .r4-list-scroll`);
      if (s) scrolls[b] = { left: s.scrollLeft, top: s.scrollTop };
    });
    const mScroll = host.querySelector('.r4-manager-content')?.scrollTop || 0;
    host.innerHTML = renderRelay4();
    ['rd1', 'rd2', 'qa'].forEach((b) => {
      const s = host.querySelector(`#r4-${b}-board .r4-list-scroll`);
      if (s && scrolls[b]) { s.scrollLeft = scrolls[b].left; s.scrollTop = scrolls[b].top; }
    });
    const m = host.querySelector('.r4-manager-content');
    if (m) m.scrollTop = mScroll;
    arrival = null;
  }

  function bindGlobalListeners() {
    if (initialized) return;
    initialized = true;

    document.addEventListener('input', (e) => {
      if (e.target.matches('input[data-r4-version]')) {
        const c = findCard(e.target.dataset.r4Version);
        if (!c) return;
        c.version = e.target.value;
        persist();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('input[data-r4-version]')) {
        e.preventDefault();
        e.target.blur();
      } else if (e.key === 'Escape' && pickerInfo) {
        e.preventDefault();
        closePicker(true);
      }
    });

    document.addEventListener('change', (e) => {
      const el = e.target;
      if (el.dataset.r4Version) {
        const c = findCard(el.dataset.r4Version);
        if (!c) return;
        c.version = el.value.trim();
        el.value = c.version;
        persist();
        rerenderInPlace();
        window.relayShowToast?.(c.id + ' · ' + (c.version ? '上版版本 ' + c.version : '已清除上版版本'));
      } else if (el.dataset.r4Status) {
        const c = findCard(el.dataset.r4Status);
        const next = el.value;
        if (!c || !STATUSES.includes(next) || next === c.status) return;
        if (next === 'ready' && !c.qa) {
          el.value = c.status;
          window.relayShowToast?.('請先點金色頭像，指定這張卡的驗收人');
          return;
        }
        closePicker();
        c.status = next;
        revealInDestination(c);
        persist();
        rerenderInPlace();
        window.relayShowToast?.(c.id + (next === 'ready' ? ' 已交給 QA ' + personName(c.qa) : ' 已回到 RD ' + personName(c.rd)));
      }
    });

    document.addEventListener('click', (e) => {
      const member = e.target.closest('[data-r4-member-toggle]');
      if (member) {
        const id = member.dataset.r4MemberToggle;
        data.managerExpanded[id] = data.managerExpanded[id] === false;
        persist();
        rerenderInPlace();
        document.querySelector(`[data-r4-member-toggle="${id}"]`)?.focus();
        return;
      }
      const locate = e.target.closest('[data-r4-locate]');
      if (locate) {
        const c = findCard(locate.dataset.r4Locate);
        if (!c) return;
        revealInDestination(c);
        persist();
        rerenderInPlace();
        const board = destination(c);
        const target = document.querySelector(`#r4-${board}-board [data-r4-card-id="${c.id}"]`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        target?.querySelector('[data-r4-status]')?.focus({ preventScroll: true });
        return;
      }
      const assign = e.target.closest('[data-r4-assign]');
      if (assign) {
        openPicker(assign);
        return;
      }
      const person = e.target.closest('[data-r4-person]');
      if (person && pickerInfo) {
        const info = pickerInfo;
        const c = findCard(info.card);
        if (c) {
          c[info.role] = person.dataset.r4Person;
          closePicker();
          revealInDestination(c);
          persist();
          rerenderInPlace();
          window.relayShowToast?.('指派成功 · ' + roleName(info.role) + ' ' + personName(c[info.role]));
        }
        return;
      }
      const toggle = e.target.closest('[data-r4-expand]');
      if (toggle) {
        const role = toggle.dataset.r4Role;
        const id = toggle.dataset.r4Expand;
        data.expanded[groupKey(role, id)] = !isExpanded(role, id);
        persist();
        rerenderInPlace();
        document.querySelector(`#r4-${role}-board [data-r4-expand="${id}"]`)?.focus();
        return;
      }
      const picker = document.getElementById('r4-picker');
      if (picker && !picker.contains(e.target)) {
        closePicker();
      }
    });

    window.addEventListener('resize', () => closePicker());
  }

  function renderRelay4() {
    bindGlobalListeners();
    return `<div class="toolbar workspaces-title">
      <div><h1>四格角色接力 · 同一張卡 RD / QA 交接</h1><div class="eyebrow">主管溝通互動原型 · RD1 / RD2 / QA1 / RD 主管總覽</div></div>
      <a class="btn" href="#workspaces">切換雙角色詳情</a>
    </div>
    <p class="demo-help"><b>Demo · 模擬資料</b>點卡片右側頭像可重新指派製作／驗收人，改狀態為 <code>Ready for test</code> 即自動交給 QA1；主管總覽可點標題定位卡片。</p>
    <div class="r4-workspaces">
      ${boardMarkup('rd1')}${boardMarkup('rd2')}${boardMarkup('qa')}${managerMarkup()}
    </div>`;
  }

  function resetRelay4() {
    closePicker();
    data = freshData();
    arrival = null;
    persist();
  }

  window.renderRelay4 = renderRelay4;
  window.resetRelay4 = resetRelay4;
})();
