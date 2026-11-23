(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const CATEGORIES = ['生活', '工作', '旅行', '想吃', '靈感', '重要'];
  const PALETTES = [
    { id: 'green', name: '薄荷綠' },
    { id: 'pink', name: '櫻花粉' },
    { id: 'blue', name: '海洋藍' },
    { id: 'orange', name: '暖陽橙' }
  ];

  const ALBUMS = [
    { title: '秋季京都行程紀錄', count: 18, date: '2026-10', svg: '<svg viewBox="0 0 240 120" width="210" height="105"><rect width="240" height="120" rx="12" fill="#fce8df"/><circle cx="185" cy="34" r="18" fill="#f59e0b" opacity="0.65"/><path d="M0 95 Q60 65 120 88 T240 82 L240 120 L0 120 Z" fill="#c2410c" opacity="0.72"/><rect x="86" y="46" width="8" height="44" fill="#991b1b"/><rect x="146" y="46" width="8" height="44" fill="#991b1b"/><rect x="70" y="38" width="100" height="10" rx="4" fill="#b91c1c"/></svg>' },
    { title: '團隊午茶與手沖咖啡地圖', count: 12, date: '2026-11', svg: '<svg viewBox="0 0 240 120" width="210" height="105"><rect width="240" height="120" rx="12" fill="#e6f4ec"/><rect x="82" y="48" width="76" height="42" rx="12" fill="#1d754b"/><path d="M158 58 Q176 58 176 70 Q176 82 158 82" stroke="#1d754b" stroke-width="6" fill="none"/><path d="M104 38 Q108 26 102 18 M124 38 Q128 24 122 16" stroke="#86efac" stroke-width="3.5" stroke-linecap="round" fill="none"/></svg>' },
    { title: '淡水河岸單車路線紀錄', count: 9, date: '2026-09', svg: '<svg viewBox="0 0 240 120" width="210" height="105"><rect width="240" height="120" rx="12" fill="#e0eefc"/><circle cx="120" cy="64" r="24" fill="#fb7185"/><path d="M0 78 Q60 70 120 78 T240 78 L240 120 L0 120 Z" fill="#2563eb" opacity="0.6"/></svg>' }
  ];

  const state = {
    persona: '宇',
    view: 'all',
    category: '全部',
    query: '',
    palette: 'green',
    mode: 'light',
    notes: [
      {
        id: 'n1', pinned: true, deleted: false, author: '宇', category: '旅行', kind: 'checklist',
        title: '宜蘭兩天一夜出發前檢查表', revision: 4, liked: true, likeCount: 2,
        body: '禮拜六早上八點出發，預備品清單如下：',
        items: [
          { id: 'c1', label: '確認民宿入住密碼與停車位', completed: false },
          { id: 'c2', label: '攜帶輕便雨衣與行動電源', completed: false },
          { id: 'c3', label: '訂好海邊咖啡廳下午茶座位', completed: true },
          { id: 'c4', label: '列印高鐵來回取票序號', completed: true }
        ],
        comments: [
          { author: '晴', text: '咖啡廳已經訂好靠窗兩點半的位置囉！' }
        ],
        history: ['第 4 版 (小宇)：新增民宿停車位確認', '第 3 版 (小晴)：勾選完成咖啡廳訂位']
      },
      {
        id: 'n2', pinned: false, deleted: false, author: '晴', category: '想吃', kind: 'checklist',
        title: '本月巷弄美食踩點口袋名單', revision: 2, liked: false, likeCount: 1,
        body: '下班後不用排隊超過半小時的話都可以去吃：',
        items: [
          { id: 'f1', label: '中山站手工焦糖布丁專賣', completed: false },
          { id: 'f2', label: '南京復興泰式打拋與奶茶', completed: false },
          { id: 'f3', label: '雙連站晚上限量鴨肉飯', completed: true }
        ],
        comments: [],
        history: ['第 2 版 (小晴)：補上中山站布丁店家']
      },
      {
        id: 'n3', pinned: false, deleted: false, author: '宇', category: '生活', kind: 'note',
        title: '辦公室茶水間補貨備忘（週末採買）', revision: 3, liked: true, likeCount: 1,
        body: '1. 濾掛咖啡剩 4 包，要補深焙款\n2. 洗碗精與擦手紙快見底\n3. 氣泡水箱裝記得補兩箱',
        items: [],
        comments: [
          { author: '安', text: '我順便把無糖綠茶也補進採購單囉！' }
        ],
        history: ['第 3 版 (小宇)：加註深焙濾掛偏好']
      },
      {
        id: 'n4', pinned: false, deleted: false, author: '安', category: '工作', kind: 'note',
        title: '部門季末聚餐備案餐廳', revision: 1, liked: false, likeCount: 2,
        body: 'A 方案：信義區義式小餐館（可預約 8 人包廂）\nB 方案：市政府附近鐵板燒（需提前一週訂位）',
        items: [],
        comments: [],
        history: ['第 1 版 (小安)：建立初次筆記']
      },
      {
        id: 'n5', pinned: false, deleted: true, author: '宇', category: '生活', kind: 'note',
        title: '舊的週會採買草稿（已移至垃圾桶）', revision: 1, liked: false, likeCount: 0,
        body: '這篇可以點擊「復原記事」找回。',
        items: [],
        comments: [],
        history: ['第 1 版 (小宇)：移到垃圾桶']
      }
    ]
  };

  let toastTimer = null;
  function notify(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  function sortPyramidChecklist(items) {
    const todo = items.filter((i) => !i.completed);
    const done = items.filter((i) => i.completed);
    return [...todo, ...done];
  }

  function renderCategories() {
    const side = $('#cat-sidebar');
    const tabs = $('#cat-tabs');
    side.innerHTML = '';
    tabs.innerHTML = '';

    ['全部', ...CATEGORIES].forEach((c) => {
      const btnTab = document.createElement('button');
      btnTab.type = 'button';
      btnTab.className = `cat-tab ${state.category === c ? 'is-active' : ''}`;
      btnTab.textContent = c;
      btnTab.addEventListener('click', () => {
        state.category = c;
        if (state.view === 'albums') state.view = 'all';
        renderAll();
      });
      tabs.appendChild(btnTab);

      if (c !== '全部') {
        const count = state.notes.filter((n) => !n.deleted && n.category === c).length;
        const btnSide = document.createElement('button');
        btnSide.type = 'button';
        btnSide.className = `cat-side-btn ${state.category === c ? 'is-active' : ''}`;
        btnSide.innerHTML = `<span>${c}</span><small>${count}</small>`;
        btnSide.addEventListener('click', () => {
          state.category = c;
          state.view = 'all';
          renderAll();
        });
        side.appendChild(btnSide);
      }
    });
  }

  function renderCounts() {
    $('#cnt-all').textContent = String(state.notes.filter((n) => !n.deleted).length);
    $('#cnt-lists').textContent = String(state.notes.filter((n) => !n.deleted && n.kind === 'checklist').length);
    $('#cnt-albums').textContent = String(ALBUMS.length);
    $('#cnt-trash').textContent = String(state.notes.filter((n) => n.deleted).length);
  }

  function renderNotes() {
    const feed = $('#note-feed');
    feed.innerHTML = '';
    const q = state.query.trim().toLowerCase();

    let rows = state.notes.filter((n) => (state.view === 'trash' ? n.deleted : !n.deleted));
    if (state.view === 'lists') rows = rows.filter((n) => n.kind === 'checklist');
    if (state.category !== '全部' && state.view !== 'trash') rows = rows.filter((n) => n.category === state.category);
    if (q) {
      rows = rows.filter((n) =>
        `${n.title} ${n.body} ${n.items.map((i) => i.label).join(' ')}`.toLowerCase().includes(q)
      );
    }

    rows.sort((a, b) => Number(b.pinned) - Number(a.pinned));

    rows.forEach((n) => {
      const card = document.createElement('article');
      card.className = `note-card ${n.pinned && !n.deleted ? 'is-pinned' : ''}`;

      const pinLine = n.pinned && !n.deleted ? `<div class="pin-tag">📌 置頂記事</div>` : '';
      const authorMap = { '宇': ['小宇', 'a'], '晴': ['小晴', 'b'], '安': ['小安', 'c'] };
      const [authorName, avatarCls] = authorMap[n.author] || [`小${n.author}`, 'a'];

      card.innerHTML = `
        ${pinLine}
        <div class="card-top">
          <div class="author-row">
            <span class="avatar-dot ${avatarCls}">${n.author}</span>
            <div><strong>${authorName}</strong><small>第 ${n.revision} 版 · ${n.category}</small></div>
          </div>
          <div class="card-tools">
            ${n.deleted
              ? `<button type="button" class="icon-mini" data-act="restore">復原</button>`
              : `<button type="button" class="icon-mini" data-act="pin">${n.pinned ? '取消置頂' : '置頂'}</button>
                 <button type="button" class="icon-mini" data-act="hist">紀錄</button>
                 <button type="button" class="icon-mini" data-act="del">刪除</button>`
            }
          </div>
        </div>
        <h3 class="note-title">${n.title}</h3>
        <p class="note-body">${n.body}</p>
      `;

      if (n.kind === 'checklist' && n.items.length) {
        const chkWrap = document.createElement('div');
        chkWrap.className = 'checklist-wrap';
        const sortedItems = sortPyramidChecklist(n.items);
        sortedItems.forEach((it) => {
          const row = document.createElement('label');
          row.className = `chk-item ${it.completed ? 'is-done' : ''}`;
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = it.completed;
          cb.disabled = n.deleted;
          cb.addEventListener('change', () => {
            // Pyramid stack rule: newly checked items jump to the very top of completed items
            it.completed = cb.checked;
            const undone = n.items.filter((x) => !x.completed && x.id !== it.id);
            const done = n.items.filter((x) => x.completed && x.id !== it.id);
            n.items = it.completed ? [...undone, it, ...done] : [...undone, it, ...done];
            n.revision++;
            n.history.unshift(`第 ${n.revision} 版 (小${state.persona})：${it.completed ? '完成' : '取消完成'}「${it.label}」`);
            renderNotes();
            notify(it.completed ? '已完成並置頂至完成區最上方 (金字塔堆疊)' : '已移回待完成區');
          });
          const sp = document.createElement('span');
          sp.textContent = it.label;
          row.append(cb, sp);
          chkWrap.appendChild(row);
        });

        const doneCount = n.items.filter((x) => x.completed).length;
        const pct = Math.round((doneCount / n.items.length) * 100);
        const prog = document.createElement('div');
        prog.className = 'chk-progress';
        prog.innerHTML = `<span>${doneCount} / ${n.items.length} 已完成</span><div class="progress-track"><i style="width:${pct}%"></i></div>`;
        chkWrap.appendChild(prog);
        card.appendChild(chkWrap);
      }

      if (!n.deleted) {
        const cBox = document.createElement('div');
        cBox.className = 'comments-box';
        n.comments.forEach((cm) => {
          const p = document.createElement('div');
          p.innerHTML = `<strong>小${cm.author}：</strong>${cm.text}`;
          cBox.appendChild(p);
        });
        const form = document.createElement('form');
        form.className = 'comment-input-row';
        form.innerHTML = `<input placeholder="新增協作留言…" required maxlength="100"><button type="submit" class="icon-mini">送出</button>`;
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const inp = $('input', form);
          if (!inp.value.trim()) return;
          n.comments.push({ author: state.persona, text: inp.value.trim() });
          n.revision++;
          renderNotes();
          notify(`已以「小${state.persona}」身分送出留言`);
        });
        cBox.appendChild(form);
        card.appendChild(cBox);
      }

      const foot = document.createElement('div');
      foot.className = 'card-foot';
      if (!n.deleted) {
        const likeBtn = document.createElement('button');
        likeBtn.type = 'button';
        likeBtn.className = `react-btn ${n.liked ? 'is-liked' : ''}`;
        likeBtn.textContent = `👍 ${n.likeCount || '讚'}`;
        likeBtn.addEventListener('click', () => {
          n.liked = !n.liked;
          n.likeCount += n.liked ? 1 : -1;
          renderNotes();
        });
        foot.appendChild(likeBtn);
      }
      const revSpan = document.createElement('span');
      revSpan.style.color = 'var(--muted)';
      revSpan.textContent = `Revision #${n.revision}`;
      foot.appendChild(revSpan);
      card.appendChild(foot);

      card.addEventListener('click', (e) => {
        const act = e.target.dataset?.act;
        if (!act) return;
        if (act === 'pin') {
          n.pinned = !n.pinned;
          n.revision++;
          renderNotes();
        } else if (act === 'del') {
          n.deleted = true;
          renderAll();
          notify('已移至垃圾桶，可隨時復原');
        } else if (act === 'restore') {
          n.deleted = false;
          renderAll();
          notify('記事已復原');
        } else if (act === 'hist') {
          $('#history-body').innerHTML = n.history.map((h) => `<p style="margin:6px 0;">• ${h}</p>`).join('');
          $('#history-dialog').showModal();
        }
      });

      feed.appendChild(card);
    });
  }

  function renderAlbums() {
    const grid = $('#albums-grid');
    grid.innerHTML = '';
    ALBUMS.forEach((a) => {
      const el = document.createElement('article');
      el.className = 'album-card';
      el.innerHTML = `
        <div class="album-art">${a.svg}</div>
        <div class="album-info">
          <h3>${a.title}</h3>
          <p>${a.date} · ${a.count} 張精選記憶（去識別化向量示意）</p>
        </div>
      `;
      grid.appendChild(el);
    });
  }

  function renderPalettes() {
    const row = $('#palette-row');
    row.innerHTML = '';
    PALETTES.forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `pal-btn ${state.palette === p.id ? 'is-active' : ''}`;
      b.textContent = p.name;
      b.addEventListener('click', () => {
        state.palette = p.id;
        document.documentElement.dataset.palette = p.id;
        renderPalettes();
      });
      row.appendChild(b);
    });
  }

  function renderAll() {
    const isAlbums = state.view === 'albums';
    $('#notes-section').hidden = isAlbums;
    $('#albums-section').hidden = !isAlbums;
    const titles = { all: '所有記事', lists: '共同清單', albums: '共同相簿', trash: '垃圾桶' };
    $('#view-title').textContent = state.category !== '全部' && !isAlbums ? state.category : (titles[state.view] || '所有記事');

    $$('.nav-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.view === state.view));
    renderCategories();
    renderCounts();
    if (isAlbums) renderAlbums();
    else renderNotes();
  }

  $$('.nav-btn').forEach((b) => {
    b.addEventListener('click', () => {
      state.view = b.dataset.view;
      state.category = '全部';
      renderAll();
    });
  });

  $('#persona-select').addEventListener('change', (e) => {
    state.persona = e.target.value;
    notify(`目前切換為「小${state.persona}」身分`);
  });
  $('#note-search').addEventListener('input', (e) => {
    state.query = e.target.value;
    renderNotes();
  });

  // Modals
  $('#new-note-btn').addEventListener('click', () => $('#composer-dialog').showModal());
  $('#close-comp-btn').addEventListener('click', () => $('#composer-dialog').close());
  $('#composer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const kind = String(fd.get('kind'));
    const bodyRaw = String(fd.get('body')).trim();
    const items = kind === 'checklist'
      ? bodyRaw.split('\n').map((s, idx) => ({ id: `new_${Date.now()}_${idx}`, label: s.trim(), completed: false })).filter((x) => x.label)
      : [];
    state.notes.unshift({
      id: `n_${Date.now()}`,
      pinned: Boolean(fd.get('pinned')),
      deleted: false,
      author: state.persona,
      category: String(fd.get('category')),
      kind,
      title: String(fd.get('title')).trim(),
      revision: 1,
      liked: false,
      likeCount: 0,
      body: kind === 'checklist' ? '共同清單項目：' : bodyRaw,
      items,
      comments: [],
      history: [`第 1 版 (小${state.persona})：新增記事`]
    });
    state.view = 'all';
    state.category = '全部';
    $('#composer-dialog').close();
    e.currentTarget.reset();
    renderAll();
    notify('新記事已發布到共同空間');
  });

  $('#open-theme-btn').addEventListener('click', () => {
    renderPalettes();
    $('#theme-dialog').showModal();
  });
  $('#close-theme-btn').addEventListener('click', () => $('#theme-dialog').close());
  $$('.mode-btn').forEach((b) => {
    b.addEventListener('click', () => {
      state.mode = b.dataset.mode;
      document.documentElement.dataset.mode = state.mode;
      $$('.mode-btn').forEach((x) => x.classList.toggle('is-active', x === b));
    });
  });

  $('#close-hist-btn').addEventListener('click', () => $('#history-dialog').close());

  renderAll();
})();
