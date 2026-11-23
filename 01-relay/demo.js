(function () {
  'use strict';

  const STORAGE_KEY = 'relay-authentic-demo-v1';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const icon = (name) => window.relayIcons[name] ?? '';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const STATUS_COLOR_STYLES = {
    GRAY: 'status-gray', BLUE: 'status-blue', PURPLE: 'status-purple', GREEN: 'status-green',
    YELLOW: 'status-yellow', ORANGE: 'status-orange', RED: 'status-red', PINK: 'status-pink', CYAN: 'status-cyan'
  };

  const TYPE_LABELS = { USERSTORY: 'User Story', TASK: 'Task', ISSUE: 'Issue / Bug', EPIC: 'Epic' };
  const PRIORITY_LABELS = { HIGHEST: 'Highest', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low', LOWEST: 'Lowest' };
  const WORK_ITEM_LABELS = { DEVELOPMENT: '開發', QA: 'QA', OTHER: '其他' };
  const APPEARANCE_PRESETS = [
    { group: '柔和純色', items: [['mist', '霧灰'], ['sky', '晴空藍'], ['mint', '薄荷綠'], ['rose', '玫瑰粉'], ['pearl', '珍珠米'], ['sage', '鼠尾草']] },
    { group: '光感漸層', items: [['lilac', '柔和紫'], ['sand', '暖沙'], ['peach', '蜜桃晨光'], ['glacier', '冰川藍'], ['lavender', '薰衣暮光'], ['meadow', '草地日光']] }
  ];

  const NAV_LINKS = [
    { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { key: 'notifications', label: '通知', icon: 'ClipboardList' },
    { key: 'team', label: '組員總覽', icon: 'LayoutDashboard' },
    { key: 'projects', label: '專案', icon: 'Layers3' },
    { key: 'issues', label: 'Issue', icon: 'ClipboardList' },
    { key: 'epics', label: 'Epic', icon: 'Layers3' },
    { key: 'sprints', label: 'Sprint', icon: 'ClipboardList' },
    { key: 'releases', label: 'Release', icon: 'Tag' },
    { key: 'workload', label: '工作分時', icon: 'Clock3' },
    { key: 'search', label: '搜尋', icon: 'Search' },
    { key: 'admin', label: '管理後台', icon: 'Settings', managerOnly: true },
    { key: 'system-operations', label: '系統操作', icon: 'ClipboardList', managerOnly: true }
  ];

  function createInitialState() {
    const now = Date.now();
    const day = 86400000;
    const iso = (offsetDays) => new Date(now + offsetDays * day).toISOString().slice(0, 10);
    const ts = (offsetHours) => new Date(now + offsetHours * 3600000).toISOString();

    return {
      meId: 'u_qa',
      appearance: 'mist',
      departments: [
        { id: 'd_rd', code: 'RD', name: '研發部' },
        { id: 'd_qa', code: 'QA', name: '品質保證部' },
        { id: 'd_pm', code: 'PM', name: '產品企劃部' }
      ],
      users: [
        { id: 'u_rd1', name: '林晨', email: 'chen.lin@example.test', role: 'MEMBER', departmentId: 'd_rd', jobTitle: 'Frontend RD', isActive: true },
        { id: 'u_rd2', name: '許安', email: 'an.hsu@example.test', role: 'MEMBER', departmentId: 'd_rd', jobTitle: 'Backend RD', isActive: true },
        { id: 'u_qa', name: '陳晴', email: 'ching.chen@example.test', role: 'MEMBER', departmentId: 'd_qa', jobTitle: 'Web QA', isActive: true },
        { id: 'u_pm', name: '周月', email: 'yue.chou@example.test', role: 'MANAGER', departmentId: 'd_pm', jobTitle: 'PM / 管理者', isActive: true }
      ],
      projects: [
        { id: 'p_app', key: 'APP', name: '會員服務平台', description: '會員中心、推播設定與個人化偏好管理' },
        { id: 'p_web', key: 'WEB', name: '官網與申辦系統', description: '形象官網、線上申辦表單與後台審核流程' }
      ],
      statuses: [
        { id: 's_todo', code: 'TODO', name: '待處理', color: 'GRAY', category: 'TODO', ownerRole: 'MAKER', sortOrder: 10 },
        { id: 's_prog', code: 'IN_PROGRESS', name: '進行中', color: 'BLUE', category: 'IN_PROGRESS', ownerRole: 'MAKER', sortOrder: 20 },
        { id: 's_rqa', code: 'READY_FOR_QA', name: '待驗收', color: 'PURPLE', category: 'IN_PROGRESS', ownerRole: 'REVIEWER', sortOrder: 30 },
        { id: 's_test', code: 'TESTING', name: '驗收中', color: 'CYAN', category: 'IN_PROGRESS', ownerRole: 'REVIEWER', sortOrder: 40 },
        { id: 's_fix', code: 'WAITING_RD_FIX', name: '待 RD 修正', color: 'RED', category: 'IN_PROGRESS', ownerRole: 'MAKER', sortOrder: 50 },
        { id: 's_retest', code: 'READY_FOR_RETEST', name: '待複測', color: 'ORANGE', category: 'IN_PROGRESS', ownerRole: 'REVIEWER', sortOrder: 60 },
        { id: 's_done', code: 'DONE', name: '驗收通過', color: 'GREEN', category: 'DONE', ownerRole: 'NONE', sortOrder: 70 }
      ],
      tags: [
        { id: 't_ui', name: 'UI/UX', color: '#6366f1' },
        { id: 't_api', name: 'API 介接', color: '#0ea5e9' },
        { id: 't_p1', name: '優先修正', color: '#e11d48' },
        { id: 't_mobile', name: '行動版', color: '#10b981' }
      ],
      sprints: [
        { id: 'sp_24', name: 'Sprint 24', status: 'ACTIVE', projectId: 'p_app' },
        { id: 'sp_25', name: 'Sprint 25', status: 'PLANNED', projectId: 'p_app' }
      ],
      sprintSections: [
        { id: 'sec_1', sprintId: 'sp_24', name: '第一波上版區塊（推播與通知）', sortOrder: 10, executionStartAt: iso(-3), executionEndAt: iso(4), releasedAt: null },
        { id: 'sec_2', sprintId: 'sp_24', name: '第二波上版區塊（申辦表單優化）', sortOrder: 20, executionStartAt: iso(2), executionEndAt: iso(10), releasedAt: null }
      ],
      releases: [
        { id: 'rel_1', name: 'v2.3.0 例行上版', releasedAt: ts(-120), issueIds: ['i_27'] }
      ],
      issues: [
        {
          id: 'i_ep1', issueKey: 'EPIC-1', type: 'EPIC', workItemType: 'OTHER', projectId: null, parentId: null,
          title: 'Q4 會員體驗與申辦流程改版', descriptionText: '跨專案整合會員推播、深色模式與線上申辦體驗優化。',
          status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: 'u_pm', reviewerId: 'u_qa', reporterId: 'u_pm',
          estimatedHours: 24, plannedStartAt: iso(-5), plannedEndAt: iso(12), sprintId: null, sprintSectionId: null, releaseId: null,
          tagIds: ['t_ui'], watcherIds: ['u_pm', 'u_qa'], boardRank: 1000, createdAt: ts(-200), updatedAt: ts(-5),
          qaCycles: [], comments: [], attachments: []
        },
        {
          id: 'i_24', issueKey: 'APP-24', type: 'USERSTORY', workItemType: 'DEVELOPMENT', projectId: 'p_app', parentId: 'i_ep1',
          title: '加入推播偏好設定', descriptionText: '讓會員能分別開啟或關閉各類推播，並從設定頁確認變更已儲存。關閉活動通知後，重新開啟設定頁仍應顯示關閉。',
          status: 'READY_FOR_QA', priority: 'HIGH', assigneeId: 'u_rd1', reviewerId: 'u_qa', reporterId: 'u_pm',
          estimatedHours: 8, plannedStartAt: iso(-2), plannedEndAt: iso(2), sprintId: 'sp_24', sprintSectionId: 'sec_1', releaseId: null,
          tagIds: ['t_mobile', 't_ui'], watcherIds: ['u_rd1', 'u_qa'], boardRank: 1000, createdAt: ts(-96), updatedAt: ts(-3),
          qaCycles: [{ id: 'c1', round: 1, result: null, endedAt: null, failureReason: null }],
          comments: [{ id: 'cm1', authorId: 'u_rd1', contentText: '已完成推播設定頁與 API 串接，請 QA 協助驗證重整後的狀態保留。', createdAt: ts(-4), deletedAt: null }],
          attachments: [{ id: 'att1', name: '推播偏好設定-規格圖.png', size: '428 KB' }]
        },
        {
          id: 'i_24_t1', issueKey: 'APP-25', type: 'TASK', workItemType: 'DEVELOPMENT', projectId: 'p_app', parentId: 'i_24',
          title: '實作偏好設定儲存 API', descriptionText: 'PATCH /api/v1/notification-preferences 寫入並回傳最新狀態。',
          status: 'DONE', priority: 'MEDIUM', assigneeId: 'u_rd2', reviewerId: 'u_qa', reporterId: 'u_rd1',
          estimatedHours: 4, plannedStartAt: iso(-3), plannedEndAt: iso(-1), sprintId: null, sprintSectionId: null, releaseId: null,
          tagIds: ['t_api'], watcherIds: ['u_rd2'], boardRank: 2000, createdAt: ts(-90), updatedAt: ts(-12),
          qaCycles: [], comments: [], attachments: []
        },
        {
          id: 'i_24_t2', issueKey: 'APP-26', type: 'TASK', workItemType: 'QA', projectId: 'p_app', parentId: 'i_24',
          title: '驗證跨分頁與重新登入狀態同步', descriptionText: '切換開關後重整頁面與重新登入，確認欄位狀態一致。',
          status: 'READY_FOR_QA', priority: 'MEDIUM', assigneeId: 'u_rd1', reviewerId: 'u_qa', reporterId: 'u_qa',
          estimatedHours: 2, plannedStartAt: iso(-1), plannedEndAt: iso(2), sprintId: null, sprintSectionId: null, releaseId: null,
          tagIds: [], watcherIds: ['u_qa'], boardRank: 3000, createdAt: ts(-80), updatedAt: ts(-2),
          qaCycles: [], comments: [], attachments: []
        },
        {
          id: 'i_28', issueKey: 'APP-28', type: 'ISSUE', workItemType: 'QA', projectId: 'p_app', parentId: 'i_ep1',
          title: '修正深色模式表單提示文字對比度不足', descriptionText: '深色模式下錯誤提示文字與背景對比過低，需調整色票以符合可讀性標準。',
          status: 'TESTING', priority: 'HIGH', assigneeId: 'u_rd1', reviewerId: 'u_qa', reporterId: 'u_qa',
          estimatedHours: 3, plannedStartAt: iso(-4), plannedEndAt: iso(-1), sprintId: 'sp_24', sprintSectionId: 'sec_1', releaseId: null,
          tagIds: ['t_ui', 't_p1'], watcherIds: ['u_qa', 'u_rd1'], boardRank: 4000, createdAt: ts(-72), updatedAt: ts(-1),
          qaCycles: [{ id: 'c2', round: 1, result: 'FAILED', endedAt: ts(-24), failureReason: '1. 開啟深色模式\n2. 送出空白信箱\n預期：錯誤文字清楚可讀\n實際：灰字與深底過近難以辨識' }, { id: 'c3', round: 2, result: null, endedAt: null, failureReason: null }],
          comments: [], attachments: []
        },
        {
          id: 'i_27', issueKey: 'APP-27', type: 'USERSTORY', workItemType: 'DEVELOPMENT', projectId: 'p_app', parentId: null,
          title: '會員登入驗證與連續錯誤鎖定提示', descriptionText: '密碼錯誤 5 次後顯示鎖定剩餘時間並提供解鎖入口。',
          status: 'DONE', priority: 'MEDIUM', assigneeId: 'u_rd2', reviewerId: 'u_qa', reporterId: 'u_pm',
          estimatedHours: 6, plannedStartAt: iso(-10), plannedEndAt: iso(-6), sprintId: null, sprintSectionId: null, releaseId: 'rel_1',
          tagIds: ['t_api'], watcherIds: [], boardRank: 5000, createdAt: ts(-240), updatedAt: ts(-120),
          qaCycles: [{ id: 'c4', round: 1, result: 'PASSED', endedAt: ts(-125), failureReason: null }],
          comments: [], attachments: []
        },
        {
          id: 'i_128', issueKey: 'WEB-128', type: 'USERSTORY', workItemType: 'DEVELOPMENT', projectId: 'p_web', parentId: 'i_ep1',
          title: '會員線上申辦流程與條款優化', descriptionText: '整合三頁式線上申辦流程，確保基本資料自動帶入且斷點補件可保留已填欄位。',
          status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: 'u_rd1', reviewerId: 'u_qa', reporterId: 'u_pm',
          estimatedHours: 10, plannedStartAt: iso(0), plannedEndAt: iso(6), sprintId: 'sp_24', sprintSectionId: 'sec_2', releaseId: null,
          tagIds: ['t_ui'], watcherIds: ['u_pm', 'u_qa'], boardRank: 1000, createdAt: ts(-110), updatedAt: ts(-6),
          qaCycles: [], comments: [], attachments: []
        },
        {
          id: 'i_129', issueKey: 'WEB-129', type: 'ISSUE', workItemType: 'DEVELOPMENT', projectId: 'p_web', parentId: null,
          title: '扣款帳戶綁定失敗時未顯示後端錯誤代碼', descriptionText: '送出綁定請求回傳 422 時畫面僅顯示空白，應顯示對應原因與重試引導。',
          status: 'WAITING_RD_FIX', priority: 'HIGHEST', assigneeId: 'u_rd2', reviewerId: 'u_qa', reporterId: 'u_qa',
          estimatedHours: 4, plannedStartAt: iso(-3), plannedEndAt: iso(1), sprintId: 'sp_24', sprintSectionId: 'sec_2', releaseId: null,
          tagIds: ['t_api', 't_p1'], watcherIds: ['u_rd2', 'u_qa'], boardRank: 2000, createdAt: ts(-48), updatedAt: ts(-5),
          qaCycles: [{ id: 'c5', round: 1, result: 'FAILED', endedAt: ts(-5), failureReason: '送出無效帳號後 HTTP 422，但 UI 未渲染 error.message' }],
          comments: [], attachments: []
        },
        {
          id: 'i_130', issueKey: 'WEB-130', type: 'USERSTORY', workItemType: 'DEVELOPMENT', projectId: 'p_web', parentId: null,
          title: '新增公告分類篩選與搜尋高亮', descriptionText: '前台最新公告頁支援分類切換與關鍵字搜尋。',
          status: 'TODO', priority: 'LOW', assigneeId: 'u_rd1', reviewerId: 'u_qa', reporterId: 'u_pm',
          estimatedHours: 5, plannedStartAt: iso(4), plannedEndAt: iso(9), sprintId: 'sp_25', sprintSectionId: null, releaseId: null,
          tagIds: [], watcherIds: [], boardRank: 3000, createdAt: ts(-36), updatedAt: ts(-36),
          qaCycles: [], comments: [], attachments: []
        },
        {
          id: 'i_131', issueKey: 'WEB-131', type: 'ISSUE', workItemType: 'DEVELOPMENT', projectId: 'p_web', parentId: null,
          title: '手機版條款同意按鈕偶發被底部工具列遮擋', descriptionText: 'iOS Safari 100vh 高度計算偏差導致按鈕貼底被遮住。',
          status: 'READY_FOR_RETEST', priority: 'MEDIUM', assigneeId: 'u_rd1', reviewerId: 'u_qa', reporterId: 'u_qa',
          estimatedHours: 2, plannedStartAt: iso(-1), plannedEndAt: iso(3), sprintId: null, sprintSectionId: null, releaseId: null,
          tagIds: ['t_mobile'], watcherIds: ['u_qa'], boardRank: 4000, createdAt: ts(-28), updatedAt: ts(-2),
          qaCycles: [{ id: 'c6', round: 1, result: 'FAILED', endedAt: ts(-18), failureReason: 'iPhone 15 Safari 底部安全區域遮擋按鈕' }, { id: 'c7', round: 2, result: null, endedAt: null, failureReason: null }],
          comments: [], attachments: []
        }
      ],
      blocks: [
        { fromId: 'i_129', toId: 'i_128' }
      ],
      notifications: [
        { id: 'n1', userId: 'u_qa', issueId: 'i_24', type: 'WORK_HANDOFF', message: '林晨 將 APP-24 交接給你驗收（狀態：待驗收）。', createdAt: ts(-3), readAt: null },
        { id: 'n2', userId: 'u_qa', issueId: 'i_131', type: 'WORK_HANDOFF', message: '林晨 已修正 WEB-131，請重新驗收（狀態：待複測）。', createdAt: ts(-2), readAt: null },
        { id: 'n3', userId: 'u_rd2', issueId: 'i_129', type: 'WORK_HANDOFF', message: '陳晴 驗收未通過 WEB-129，退回給你修正。', createdAt: ts(-5), readAt: null }
      ],
      audits: [
        { id: 'a1', source: 'WorkflowService', eventType: 'STATUS_CHANGED', actorId: 'u_rd1', entityType: 'ISSUE', entityId: 'APP-24', createdAt: ts(-3), metadata: { from: 'IN_PROGRESS', to: 'READY_FOR_QA' } },
        { id: 'a2', source: 'WorkflowService', eventType: 'QA_FAILED', actorId: 'u_qa', entityType: 'ISSUE', entityId: 'WEB-129', createdAt: ts(-5), metadata: { round: 1, reason: 'HTTP 422 未顯示錯誤提示' } },
        { id: 'a3', source: 'WorkflowService', eventType: 'STATUS_CHANGED', actorId: 'u_rd1', entityType: 'ISSUE', entityId: 'WEB-131', createdAt: ts(-2), metadata: { from: 'WAITING_RD_FIX', to: 'READY_FOR_RETEST' } }
      ],
      dashboardFilters: {
        work: { allStatuses: true, statusIds: [] },
        todo: { allStatuses: false, statusIds: ['s_todo'] },
        progress: { allStatuses: false, statusIds: ['s_prog', 's_rqa', 's_test', 's_fix', 's_retest'] },
        done: { allStatuses: false, statusIds: ['s_done'] }
      },
      dashboardView: { bucket: 'work', projectId: '', role: 'all', from: '', to: '', includeUnscheduled: true, query: '' },
      teamFollowedIds: ['u_rd1', 'u_rd2', 'u_qa'],
      teamCompletionIds: ['s_done'],
      projectBoards: {},
      nextNum: { APP: 29, WEB: 132, EPIC: 2 },
      nextSeq: 100
    };
  }

  let state = loadState();
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && Array.isArray(saved.issues) && Array.isArray(saved.statuses)) return saved;
    } catch {}
    return createInitialState();
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  // Helpers matching Relay-Git logic
  const me = () => state.users.find((u) => u.id === state.meId) || state.users[0];
  const canManage = () => ['ADMIN', 'MANAGER'].includes(me().role);
  const userById = (id) => state.users.find((u) => u.id === id) || null;
  const projectById = (id) => state.projects.find((p) => p.id === id) || null;
  const statusByCode = (code) => state.statuses.find((s) => s.code === code) || null;
  const issueByKey = (key) => state.issues.find((i) => i.issueKey === key) || null;
  const issueById = (id) => state.issues.find((i) => i.id === id) || null;

  function statusOwnerRole(status) {
    if (!status) return 'MAKER';
    if (status.ownerRole === 'MAKER' || status.ownerRole === 'REVIEWER' || status.ownerRole === 'NONE') return status.ownerRole;
    if (status.category === 'DONE' || ['DONE', 'RELEASED', 'CANCELED'].includes(status.code)) return 'NONE';
    if (['READY_FOR_QA', 'TESTING', 'READY_FOR_RETEST'].includes(status.code)) return 'REVIEWER';
    return 'MAKER';
  }

  function currentOwnerId(issue) {
    const st = statusByCode(issue.status);
    const role = statusOwnerRole(st);
    if (role === 'NONE' || !issue.assigneeId) return null;
    if (role === 'REVIEWER' && issue.reviewerId && issue.reviewerId !== issue.assigneeId) return issue.reviewerId;
    if (role === 'REVIEWER' && st?.ownerRole === 'REVIEWER') return issue.reviewerId || null;
    return issue.assigneeId;
  }

  function currentOwner(issue) {
    const id = currentOwnerId(issue);
    return id ? userById(id) : null;
  }

  function alignedRef(issue) {
    const m = String(issue.issueKey || '').match(/-(\d+)$/);
    return m ? `#${m[1]}` : issue.issueKey;
  }

  function statusBadgeHtml(code) {
    const st = statusByCode(code);
    if (!st) return '<span class="status-badge status-gray">未設定</span>';
    return `<span class="status-badge ${STATUS_COLOR_STYLES[st.color] || 'status-gray'}">${esc(st.name)}</span>`;
  }

  function tagPillsHtml(tagIds = []) {
    if (!tagIds.length) return '';
    return `<span class="card-tag-pills">${tagIds.map((id) => {
      const t = state.tags.find((x) => x.id === id);
      return t ? `<span class="card-tag" style="background:${t.color};color:#fff">${esc(t.name)}</span>` : '';
    }).join('')}</span>`;
  }

  function projectTagHtml(issue) {
    const p = projectById(issue.projectId);
    return `<span class="issue-project-cell">${p ? `<span class="issue-project-tag" title="${esc(p.name)}">${esc(p.name)}</span>` : '<span class="eyebrow">—</span>'}</span>`;
  }

  function assigneePickerHtml(issue, role) {
    const field = role === 'maker' ? 'assigneeId' : 'reviewerId';
    const u = userById(issue[field]);
    const label = role === 'maker' ? '負責人' : '驗收人';
    return `<div class="kanban-assignee ${role === 'reviewer' ? 'kanban-reviewer' : ''}" data-relay-dnd-interactive="true">
      <button type="button" class="kanban-assignee-avatar" data-pick-assignee="${esc(issue.issueKey)}" data-pick-role="${role}" title="${label}：${esc(u ? u.name : '未指派')}" aria-label="修改${label}，目前為${esc(u ? u.name : '未指派')}">
        <span>${esc(u ? u.name.slice(0, 1) : '?')}</span>
      </button>
    </div>`;
  }

  function statusInlineHtml(issue) {
    return `<div class="status-inline-select" data-relay-dnd-interactive="true">
      <button type="button" class="status-trigger" data-pick-status="${esc(issue.issueKey)}" title="點擊切換狀態">
        ${statusBadgeHtml(issue.status)}${icon('ChevronDown')}
      </button>
    </div>`;
  }

  function horizontalHeaderHtml(actionsLabel = '') {
    return `<div class="sprint-issue-row horizontal-issue-row sprint-table-header">
      <span></span><span>編號</span><span>標題</span><span>專案</span><span>類型</span><span>狀態</span>
      <span class="person-column-heading">負責人</span><span class="person-column-heading">驗收人</span><span>${actionsLabel}</span>
    </div>`;
  }

  function horizontalRowHtml(issue, actionsHtml = '') {
    return `<div class="sprint-issue-row horizontal-issue-row" data-issue-row="${esc(issue.issueKey)}">
      <span class="drag-handle">${icon('GripVertical')}</span>
      <a class="issue-key aligned-issue-reference" href="#issue/${esc(issue.issueKey)}">${esc(alignedRef(issue))}</a>
      <a class="issue-title" href="#issue/${esc(issue.issueKey)}"><span class="issue-title-content">${esc(issue.title)}${tagPillsHtml(issue.tagIds)}</span></a>
      ${projectTagHtml(issue)}
      <span>${esc(TYPE_LABELS[issue.type] || issue.type)}</span>
      <span>${statusInlineHtml(issue)}</span>
      ${assigneePickerHtml(issue, 'maker')}
      ${assigneePickerHtml(issue, 'reviewer')}
      <span>${actionsHtml}</span>
    </div>`;
  }

  // Toast
  let toastTimer;
  function showToast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
  }

  // Audit & Notification
  function addAudit(eventType, entityType, entityId, metadata = {}) {
    state.audits.unshift({
      id: 'a_' + (++state.nextSeq),
      source: 'WorkflowService',
      eventType,
      actorId: me().id,
      entityType,
      entityId,
      createdAt: new Date().toISOString(),
      metadata
    });
  }

  function notifyHandoff(issue, prevOwnerId, nextOwnerId, nextCode, reason = '') {
    if (!nextOwnerId || nextOwnerId === prevOwnerId || nextOwnerId === me().id) return;
    const actorName = me().name;
    let msg = `${actorName} 將 ${issue.issueKey} 交接給你處理。`;
    if (nextCode === 'READY_FOR_QA') msg = `${actorName} 將 ${issue.issueKey} 交接給你驗收（狀態：待驗收）。`;
    else if (nextCode === 'READY_FOR_RETEST') msg = `${actorName} 已修正 ${issue.issueKey}，請重新驗收。`;
    else if (nextCode === 'WAITING_RD_FIX') msg = `${actorName} 驗收未通過 ${issue.issueKey}，退回給你修正${reason ? '：' + reason.slice(0, 40) : ''}。`;
    state.notifications.unshift({
      id: 'n_' + (++state.nextSeq),
      userId: nextOwnerId,
      issueId: issue.id,
      type: 'WORK_HANDOFF',
      message: msg,
      createdAt: new Date().toISOString(),
      readAt: null
    });
  }

  function updateIssueField(issue, patch, handoffReason = '') {
    const prevOwner = currentOwnerId(issue);
    const prevStatus = issue.status;
    Object.assign(issue, patch, { updatedAt: new Date().toISOString() });

    if ('status' in patch && patch.status !== prevStatus) {
      addAudit('STATUS_CHANGED', 'ISSUE', issue.issueKey, { from: prevStatus, to: patch.status });
      const prevRole = statusOwnerRole(statusByCode(prevStatus));
      const nextRole = statusOwnerRole(statusByCode(patch.status));
      if (nextRole === 'REVIEWER' && prevRole !== 'REVIEWER') {
        issue.qaCycles.push({ id: 'c_' + (++state.nextSeq), round: issue.qaCycles.length + 1, result: null, endedAt: null, failureReason: null });
      }
      if (prevRole === 'REVIEWER' && nextRole === 'MAKER' && issue.qaCycles.length) {
        const last = issue.qaCycles[issue.qaCycles.length - 1];
        last.result = 'FAILED';
        last.endedAt = new Date().toISOString();
        if (handoffReason) last.failureReason = handoffReason;
      }
      if (patch.status === 'DONE' && issue.qaCycles.length) {
        const last = issue.qaCycles[issue.qaCycles.length - 1];
        last.result = 'PASSED';
        last.endedAt = new Date().toISOString();
      }
      const nextOwner = currentOwnerId(issue);
      notifyHandoff(issue, prevOwner, nextOwner, patch.status, handoffReason);
    }

    if ('assigneeId' in patch) {
      addAudit('ASSIGNEE_CHANGED', 'ISSUE', issue.issueKey, { assigneeId: patch.assigneeId });
    }
    if ('reviewerId' in patch) {
      addAudit('REVIEWER_CHANGED', 'ISSUE', issue.issueKey, { reviewerId: patch.reviewerId });
    }
    persist();
  }

  // Popover Management (StatusInlineSelect, AssigneePicker, AccountMenu)
  const popoverPortal = $('#popover-portal');
  function closePopovers() {
    popoverPortal.innerHTML = '';
    $('#account-trigger')?.setAttribute('aria-expanded', 'false');
  }

  function positionPopover(anchorEl, popEl, alignEnd = false) {
    const rect = anchorEl.getBoundingClientRect();
    const popRect = popEl.getBoundingClientRect();
    let left = alignEnd ? rect.right - popRect.width : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - popRect.width - 8));
    let top = rect.bottom + 6;
    if (top + popRect.height > window.innerHeight - 10) {
      top = Math.max(8, rect.top - popRect.height - 6);
    }
    popEl.style.left = left + 'px';
    popEl.style.top = top + 'px';
  }

  function openStatusPopover(anchorEl, issueKey) {
    const issue = issueByKey(issueKey);
    if (!issue) return;
    closePopovers();
    const pop = document.createElement('div');
    pop.className = 'status-popover';
    pop.style.minWidth = '175px';
    pop.innerHTML = state.statuses.slice().sort((a, b) => a.sortOrder - b.sortOrder).map((st) =>
      `<button type="button" class="status-option ${issue.status === st.code ? 'selected' : ''}" data-set-status="${esc(st.code)}" data-target-issue="${esc(issueKey)}">
        <span class="status-badge ${STATUS_COLOR_STYLES[st.color] || 'status-gray'}">${esc(st.name)}</span>
      </button>`
    ).join('');
    popoverPortal.appendChild(pop);
    positionPopover(anchorEl, pop, true);
  }

  function openAssigneePopover(anchorEl, issueKey, role) {
    const issue = issueByKey(issueKey);
    if (!issue) return;
    closePopovers();
    const field = role === 'maker' ? 'assigneeId' : 'reviewerId';
    const pop = document.createElement('div');
    pop.className = 'assignee-popover';
    pop.style.width = '235px';
    pop.innerHTML = `<label class="assignee-search">${icon('Search')}<input type="text" placeholder="搜尋成員..." autocomplete="off"></label>
      <div class="assignee-options"></div>`;
    popoverPortal.appendChild(pop);

    const input = $('input', pop);
    const list = $('.assignee-options', pop);
    function renderOpts(q = '') {
      const k = q.trim().toLowerCase();
      const users = state.users.filter((u) => u.isActive && u.name.toLowerCase().includes(k));
      list.innerHTML = (!k || role === 'reviewer' ? `<button type="button" class="${!issue[field] ? 'selected' : ''}" data-set-assignee="" data-target-issue="${esc(issueKey)}" data-target-role="${role}">
        <span class="assignee-option-avatar">?</span><span>未指派</span></button>` : '') +
        users.map((u) => `<button type="button" class="${issue[field] === u.id ? 'selected' : ''}" data-set-assignee="${esc(u.id)}" data-target-issue="${esc(issueKey)}" data-target-role="${role}">
          <span class="assignee-option-avatar">${esc(u.name.slice(0, 1))}</span><span>${esc(u.name)}</span></button>`).join('');
    }
    renderOpts();
    positionPopover(anchorEl, pop, false);
    input.addEventListener('input', () => renderOpts(input.value));
    input.focus();
  }

  function openAccountMenu(anchorEl) {
    if ($('.account-menu', popoverPortal)) { closePopovers(); return; }
    closePopovers();
    const user = me();
    const pop = document.createElement('div');
    pop.className = 'account-menu';
    pop.setAttribute('role', 'menu');
    pop.innerHTML = `<div class="account-menu-heading">
        <span class="topbar-avatar">${esc(user.name.slice(0, 1))}</span>
        <div><strong>${esc(user.name)}</strong><span>${esc(user.jobTitle || user.role)}</span></div>
      </div>
      <button type="button" class="account-menu-item" data-account-tab="profile">${icon('UserRound')}個人資料</button>
      <button type="button" class="account-menu-item" data-account-tab="appearance">${icon('Settings')}設定（12 款個人背景）</button>
      <button type="button" class="account-menu-item" data-account-tab="password">${icon('KeyRound')}修改密碼</button>
      <div class="account-role-switch">
        <label>切換體驗帳號（Demo 接球測試）</label>
        <div class="account-role-buttons">
          ${state.users.map((u) => `<button type="button" class="account-role-btn ${u.id === state.meId ? 'active' : ''}" data-switch-user="${esc(u.id)}">${esc(u.name)} · ${u.role === 'MANAGER' ? 'PM' : u.departmentId === 'd_qa' ? 'QA' : 'RD'}</button>`).join('')}
        </div>
      </div>
      <button type="button" class="account-menu-item" id="menu-reset-demo">${icon('LogOut')}重置所有 Demo 資料</button>`;
    popoverPortal.appendChild(pop);
    positionPopover(anchorEl, pop, true);
    anchorEl.setAttribute('aria-expanded', 'true');
  }

  // Modals
  const modalPortal = $('#modal-portal');
  function closeModal() { modalPortal.innerHTML = ''; }
  function showModal(title, bodyHtml, width = 620) {
    modalPortal.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true" data-close-backdrop="1">
      <div class="card modal" style="width:min(${width}px,100%)">
        <div class="toolbar"><h2>${esc(title)}</h2><button type="button" class="btn" data-close-modal="1">關閉</button></div>
        ${bodyHtml}
      </div>
    </div>`;
  }

  function openAccountSettingsModal(tab = 'appearance') {
    const user = me();
    const body = tab === 'appearance'
      ? `<p class="eyebrow">12 款精選背景 · 只套用至目前視窗，即時預覽。</p>
        ${APPEARANCE_PRESETS.map((g) => `<div style="margin-top:12px"><strong>${g.group}</strong>
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:8px">
            ${g.items.map(([id, label]) => `<button type="button" class="btn workspace-background-${id}" style="justify-content:space-between;${state.appearance === id ? 'border-color:var(--accent);box-shadow:0 0 0 2px rgba(91,91,214,.2)' : ''}" data-choose-bg="${id}"><span>${label}</span>${state.appearance === id ? '<b>✓</b>' : ''}</button>`).join('')}
          </div></div>`).join('')}`
      : tab === 'profile'
        ? `<form id="profile-form" class="grid" style="gap:12px">
            <label class="field">顯示名稱<input class="input" name="name" value="${esc(user.name)}" required></label>
            <label class="field">職稱<input class="input" name="jobTitle" value="${esc(user.jobTitle || '')}"></label>
            <label class="field">電子郵件<input class="input" value="${esc(user.email)}" readonly></label>
            <div class="actions" style="justify-content:flex-end"><button type="submit" class="btn btn-primary">儲存個人資料</button></div>
          </form>`
        : `<form id="pw-form" class="grid" style="gap:12px">
            <p class="eyebrow">示範環境不會實際寫入密碼。</p>
            <label class="field">目前密碼<input type="password" class="input" required></label>
            <label class="field">新密碼<input type="password" class="input" minlength="5" required></label>
            <div class="actions" style="justify-content:flex-end"><button type="submit" class="btn btn-primary">更新密碼</button></div>
          </form>`;
    showModal('帳號與偏好設定', body, 580);
  }

  function openCreateIssueModal(defaultProjectId = '') {
    const epics = state.issues.filter((i) => i.type === 'EPIC');
    const stories = state.issues.filter((i) => ['USERSTORY', 'ISSUE'].includes(i.type));
    showModal('建立卡片', `<form id="create-issue-form" class="grid" style="gap:12px">
      <div class="form-grid">
        <label class="field">Project<select class="select" name="projectId" required>
          ${state.projects.map((p) => `<option value="${esc(p.id)}" ${p.id === defaultProjectId ? 'selected' : ''}>${esc(p.key)} · ${esc(p.name)}</option>`).join('')}
        </select></label>
        <label class="field">Type<select class="select" name="type">
          <option value="USERSTORY">User Story</option><option value="ISSUE">Issue / Bug</option><option value="TASK">Task</option><option value="EPIC">Epic（跨專案）</option>
        </select></label>
        <label class="field full">上層卡片（選填，Task 須選所屬 Story / Issue）<select class="select" name="parentId">
          <option value="">無上層</option>
          ${[...epics, ...stories].map((i) => `<option value="${esc(i.id)}">${esc(i.issueKey)} · ${esc(i.title)}</option>`).join('')}
        </select></label>
        <label class="field full">Title *<input class="input" name="title" required placeholder="例如：新增推播偏好確認彈窗"></label>
        <label class="field">Priority<select class="select" name="priority"><option value="HIGH">High</option><option value="MEDIUM" selected>Medium</option><option value="LOW">Low</option></select></label>
        <label class="field">Estimated Hours<input class="input" name="estimatedHours" type="number" step="0.5" min="0" placeholder="4"></label>
        <label class="field">負責人<select class="select" name="assigneeId"><option value="">未指派</option>${state.users.map((u) => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('')}</select></label>
        <label class="field">驗收人<select class="select" name="reviewerId"><option value="">未指派</option>${state.users.map((u) => `<option value="${esc(u.id)}" ${u.departmentId === 'd_qa' ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label>
        <label class="field full">Description<textarea class="textarea" name="descriptionText" rows="3" placeholder="填寫需求說明或驗收條件..."></textarea></label>
      </div>
      <div class="actions" style="justify-content:flex-end;margin-top:8px">
        <button type="button" class="btn" data-close-modal="1">取消</button>
        <button type="submit" class="btn btn-primary">建立卡片</button>
      </div>
    </form>`, 640);
  }

  // Apply background preset
  function applyAppearance() {
    document.body.className = `workspace-page-background workspace-background-${state.appearance}`;
  }

  // Render Chrome (Sidebar + Topbar)
  function renderChrome(route) {
    const user = me();
    const unread = state.notifications.filter((n) => n.userId === user.id && !n.readAt).length;
    const activeSection = route.startsWith('project/') ? 'projects' : route.startsWith('issue/') ? 'issues' : route;

    $('#workspace-nav').innerHTML = NAV_LINKS
      .filter((item) => !item.managerOnly || canManage())
      .map((item) => `<a class="nav-link ${activeSection === item.key ? 'active' : ''}" href="#${item.key}">
        ${icon(item.icon)}<span>${item.label}</span>
        ${item.key === 'notifications' && unread ? `<span class="nav-unread">${unread}</span>` : ''}
      </a>`).join('');

    $('#back-icon').innerHTML = icon('ArrowLeft');
    const bell = $('#bell');
    bell.innerHTML = icon('Bell') + (unread ? `<strong>${unread}</strong>` : '');
    $('#actor-avatar').textContent = user.name.slice(0, 1);
    $('#actor-name').textContent = user.name;
    $('#actor-chevron').innerHTML = icon('ChevronDown');
    applyAppearance();
  }

  // Page 1: Dashboard
  function dashboardFilterPass(issue, filter) {
    if (filter.allStatuses) return true;
    const st = statusByCode(issue.status);
    return st && filter.statusIds.includes(st.id);
  }

  function renderDashboard() {
    const v = state.dashboardView;
    const user = me();
    const q = v.query.trim().toLowerCase();
    const scoped = state.issues.filter((i) => {
      const isMaker = i.assigneeId === user.id;
      const isRev = i.reviewerId === user.id;
      if (v.role === 'maker' && !isMaker) return false;
      if (v.role === 'reviewer' && !isRev) return false;
      if (v.role === 'all' && !isMaker && !isRev) return false;
      if (v.projectId === '__epic__' && i.projectId !== null) return false;
      if (v.projectId && v.projectId !== '__epic__' && i.projectId !== v.projectId) return false;
      if (!v.includeUnscheduled && (!i.plannedStartAt || !i.plannedEndAt)) return false;
      if (v.from && i.plannedEndAt && i.plannedEndAt < v.from) return false;
      if (v.to && i.plannedStartAt && i.plannedStartAt > v.to) return false;
      if (q && !(i.issueKey + ' ' + i.title).toLowerCase().includes(q)) return false;
      return true;
    });

    const buckets = [
      { key: 'work', label: '我的工作' },
      { key: 'todo', label: '待處理' },
      { key: 'progress', label: '進行中' },
      { key: 'done', label: '已完成' }
    ].map((b) => ({ ...b, items: scoped.filter((i) => dashboardFilterPass(i, state.dashboardFilters[b.key])) }));

    const active = buckets.find((b) => b.key === v.bucket) || buckets[0];
    const todayStr = new Date().toISOString().slice(0, 10);
    const soonStr = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const attention = scoped.filter((i) => i.status !== 'DONE' && i.plannedEndAt && i.plannedEndAt <= soonStr);

    const dueLabel = (i) => {
      if (!i.plannedEndAt) return '未排程';
      const diff = Math.round((new Date(i.plannedEndAt) - new Date(todayStr)) / 86400000);
      if (diff < 0) return `逾期 ${-diff} 天`;
      if (diff === 0) return '今天到期';
      return `剩餘 ${diff} 天`;
    };

    const roleTag = (i) => {
      const roles = [];
      if (i.assigneeId === user.id) roles.push('負責人');
      if (i.reviewerId === user.id) roles.push('驗收人');
      return roles.join(' / ');
    };

    return `<div class="eyebrow">Personal overview</div>
      <div class="toolbar"><h1>${esc(user.name)} 的工作總覽</h1><span class="eyebrow">切換右上角帳號可測試不同人的工作總覽</span></div>
      <section class="card dashboard-view-filters" aria-label="工作篩選">
        <div class="actions" style="flex-wrap:wrap">
          <label class="field">搜尋<input class="input" id="dash-q" placeholder="編號或標題" value="${esc(v.query)}"></label>
          <label class="field">專案<select class="select" id="dash-proj"><option value="">全部專案</option>
            ${state.projects.map((p) => `<option value="${esc(p.id)}" ${v.projectId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
            <option value="__epic__" ${v.projectId === '__epic__' ? 'selected' : ''}>跨專案 Epic</option>
          </select></label>
          <label class="field">我的角色<select class="select" id="dash-role">
            <option value="all" ${v.role === 'all' ? 'selected' : ''}>負責或驗收</option>
            <option value="maker" ${v.role === 'maker' ? 'selected' : ''}>我負責</option>
            <option value="reviewer" ${v.role === 'reviewer' ? 'selected' : ''}>我驗收</option>
          </select></label>
          <label class="field">開始日期<input type="date" class="input" id="dash-from" value="${esc(v.from)}"></label>
          <label class="field">結束日期<input type="date" class="input" id="dash-to" value="${esc(v.to)}"></label>
          <button type="button" class="btn" id="dash-clear">清除篩選</button>
        </div>
        <label style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;font-size:13px">
          <input type="checkbox" id="dash-unscheduled" ${v.includeUnscheduled ? 'checked' : ''}> 包含未排程卡片
        </label>
      </section>

      <div class="dashboard-metrics-sticky"><div class="grid grid-4 dashboard-metrics">
        ${buckets.map((b) => `<section class="card dashboard-metric ${b.key === active.key ? 'is-selected' : ''}">
          <button type="button" class="metric-card" data-dash-bucket="${b.key}">
            <div class="metric">${b.items.length}</div>
            <div class="metric-label">${b.label}</div>
            <small>查看下方工作清單</small>
          </button>
          <button type="button" class="dashboard-settings-link" data-dash-custom="${b.key}">自訂 Status</button>
        </section>`).join('')}
      </div></div>

      <section class="card dashboard-attention" style="margin-bottom:16px">
        <h2>需要注意 <span class="badge badge-orange">${attention.length}</span></h2>
        <p class="eyebrow" style="margin-bottom:10px">我的未完成卡片，已逾期或 5 天內到期。</p>
        ${attention.length ? `<div class="horizontal-issue-list">${horizontalHeaderHtml('我的角色／排程')}${attention.map((i) =>
          horizontalRowHtml(i, `<span class="badge badge-orange">${dueLabel(i)}</span>`)).join('')}</div>` : '<p class="empty-state">目前篩選範圍內沒有需注意的卡片。</p>'}
      </section>

      <section class="card dashboard-work-list">
        <div class="toolbar"><h2>${active.label} · ${active.items.length} 張</h2></div>
        ${active.items.length ? `<div class="horizontal-issue-list">${horizontalHeaderHtml('我的角色／排程')}${active.items.map((i) =>
          horizontalRowHtml(i, `<span class="eyebrow">${esc(roleTag(i))}</span>`)).join('')}</div>` : '<p class="empty-state">沒有符合條件的卡片，可調整篩選或上方分類的 Status 設定。</p>'}
      </section>`;
  }

  function openDashboardCustomModal(bucketKey) {
    const labels = { work: '我的工作', todo: '待處理', progress: '進行中', done: '已完成' };
    const f = state.dashboardFilters[bucketKey];
    showModal(`自訂「${labels[bucketKey]}」包含的 Status`, `
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <input type="checkbox" id="dash-all-st" data-bucket="${bucketKey}" ${f.allStatuses ? 'checked' : ''}>
        <strong>全部狀態（包含未來新增的狀態）</strong>
      </label>
      ${f.allStatuses ? '' : `<div class="dashboard-status-chips">
        ${state.statuses.map((st) => {
          const checked = f.statusIds.includes(st.id);
          return `<button type="button" class="btn ${checked ? 'btn-primary' : ''}" data-toggle-dash-st="${esc(st.id)}" data-bucket="${bucketKey}">
            ${esc(st.name)} ${checked ? '✓' : '＋'}
          </button>`;
        }).join('')}
      </div>`}
    `, 520);
  }

  // Page 2: Notifications
  function renderNotifications() {
    const user = me();
    const list = state.notifications.filter((n) => n.userId === user.id);
    return `<div class="toolbar"><div><h1>通知</h1><p class="eyebrow">${esc(user.name)} 的交接與指派通知（共 ${list.length} 筆）</p></div>
      <button type="button" class="btn" id="read-all-notifs">全部標示已讀</button></div>
      ${list.length ? list.map((n) => {
        const issue = issueById(n.issueId);
        return `<article class="card" style="margin-bottom:10px;opacity:${n.readAt ? 0.72 : 1};display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div>
            ${issue ? `<a href="#issue/${esc(issue.issueKey)}" class="issue-key">${esc(issue.issueKey)} · ${esc(issue.title)}</a>` : ''}
            <p style="margin:4px 0 0">${esc(n.message)}</p>
            <span class="eyebrow">${n.createdAt.slice(0, 16).replace('T', ' ')}</span>
          </div>
          ${!n.readAt ? `<button type="button" class="btn" data-read-notif="${esc(n.id)}">標示已讀</button>` : '<span class="badge badge-gray">已讀</span>'}
        </article>`;
      }).join('') : '<div class="card empty-state">目前沒有通知。試著在專案看板把一張卡改為「待驗收」並切換右上角帳號查看！</div>'}`;
  }

  // Page 3: Team Overview
  function renderTeam() {
    const rows = state.users.filter((u) => state.teamFollowedIds.includes(u.id)).map((u) => {
      const cards = state.issues.filter((i) => i.assigneeId === u.id || i.reviewerId === u.id);
      const done = cards.filter((i) => {
        const st = statusByCode(i.status);
        return st && state.teamCompletionIds.includes(st.id);
      }).length;
      const hours = cards.reduce((sum, i) => sum + (Number(i.estimatedHours) || 0), 0);
      return { u, cards, done, hours };
    }).sort((a, b) => a.hours - b.hours);

    return `<div class="toolbar"><div><h1>組員工作總覽</h1><p class="eyebrow">關注成員的製作／驗收卡片 · 依排程工時由少到多排列。綠色代表完成、紅色尚未完成。</p></div></div>
      <section class="card" style="margin-bottom:16px">
        <strong>關注成員</strong>
        <div class="actions" style="margin-top:8px;flex-wrap:wrap">
          ${state.users.map((u) => {
            const on = state.teamFollowedIds.includes(u.id);
            return `<button type="button" class="btn ${on ? 'btn-primary' : ''}" data-toggle-follow="${esc(u.id)}">${esc(u.name)} ${on ? '✓' : '＋'}</button>`;
          }).join('')}
        </div>
      </section>
      ${rows.map(({ u, cards, done, hours }) => {
        const pct = cards.length ? Math.round((done / cards.length) * 100) : 0;
        return `<section class="card" style="margin-bottom:14px">
          <div class="toolbar">
            <div><h2 style="margin:0">${esc(u.name)} <span class="eyebrow">${esc(u.jobTitle)}</span></h2>
              <span class="eyebrow">完成 ${done} / ${cards.length} 張（${pct}%） · 總排程 ${hours}h / 40h</span></div>
            <div style="width:180px;height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden"><div style="width:${pct}%;height:100%;background:var(--green)"></div></div>
          </div>
          <div class="grid" style="gap:6px;margin-top:10px">
            ${cards.map((i) => {
              const st = statusByCode(i.status);
              const isDone = st && state.teamCompletionIds.includes(st.id);
              return `<a href="#issue/${esc(i.issueKey)}" class="card" style="padding:10px 14px;display:flex;justify-content:space-between;align-items:center;border-radius:8px;overflow:hidden;border-left:4px solid ${isDone ? 'var(--green)' : 'var(--red)'}">
                <span><b class="aligned-issue-reference">${esc(i.issueKey)}</b> ${esc(i.title)}</span>
                <span style="display:flex;align-items:center;gap:8px">${statusBadgeHtml(i.status)}<span class="eyebrow">${i.assigneeId === u.id ? '負責人' : ''}${i.reviewerId === u.id ? ' 驗收人' : ''} · ${i.estimatedHours || 0}h</span></span>
              </a>`;
            }).join('') || '<p class="eyebrow">目前沒有指派的卡片。</p>'}
          </div>
        </section>`;
      }).join('')}`;
  }

  // Page 4: Projects & ProjectBoard
  function renderProjectsList() {
    return `<div class="toolbar"><div><div class="eyebrow">Workspace</div><h1>專案</h1></div></div>
      <div class="grid grid-2">
        ${state.projects.map((p) => {
          const count = state.issues.filter((i) => i.projectId === p.id).length;
          return `<a href="#project/${esc(p.key)}" class="card" style="display:block">
            <div style="display:flex;justify-content:space-between"><span class="badge badge-blue">${esc(p.key)}</span><span class="eyebrow">${count} 張卡片</span></div>
            <h2 style="margin-top:14px">${esc(p.name)}</h2>
            <p class="eyebrow">${esc(p.description)}</p>
          </a>`;
        }).join('')}
      </div>`;
  }

  let boardViewState = { view: 'board', sprintId: 'all', q: '', statuses: [], assignees: [], reviewers: [] };

  function renderProjectBoard(projectKey) {
    const project = state.projects.find((p) => p.key === projectKey) || state.projects[0];
    if (!project) return renderProjectsList();
    const projectIssues = state.issues.filter((i) => i.projectId === project.id);
    const filtered = projectIssues.filter((i) => {
      if (boardViewState.view !== 'backlog') {
        if (boardViewState.sprintId === 'backlog' && i.sprintId) return false;
        if (boardViewState.sprintId !== 'all' && boardViewState.sprintId !== 'backlog' && i.sprintId !== boardViewState.sprintId) return false;
      }
      if (boardViewState.q && !(i.issueKey + ' ' + i.title).toLowerCase().includes(boardViewState.q.toLowerCase())) return false;
      if (boardViewState.statuses.length && !boardViewState.statuses.includes(i.status)) return false;
      if (boardViewState.assignees.length && !boardViewState.assignees.includes(i.assigneeId || '__none')) return false;
      if (boardViewState.reviewers.length && !boardViewState.reviewers.includes(i.reviewerId || '__none')) return false;
      return true;
    });

    const cols = state.statuses.slice().sort((a, b) => a.sortOrder - b.sortOrder);

    const filterSidebar = `<aside class="card listing-filters" aria-label="篩選條件">
      <label class="field">搜尋<input class="input" id="board-filter-q" placeholder="編號或標題" value="${esc(boardViewState.q)}"></label>
      <details class="listing-filter-group" open><summary>Status</summary><div class="listing-filter-options">
        ${cols.map((st) => `<label><input type="checkbox" data-bf-status="${esc(st.code)}" ${boardViewState.statuses.includes(st.code) ? 'checked' : ''}>${esc(st.name)}</label>`).join('')}
      </div></details>
      <details class="listing-filter-group" open><summary>負責人</summary><div class="listing-filter-options">
        ${state.users.map((u) => `<label><input type="checkbox" data-bf-assignee="${esc(u.id)}" ${boardViewState.assignees.includes(u.id) ? 'checked' : ''}>${esc(u.name)}</label>`).join('')}
      </div></details>
      <details class="listing-filter-group"><summary>驗收人</summary><div class="listing-filter-options">
        ${state.users.map((u) => `<label><input type="checkbox" data-bf-reviewer="${esc(u.id)}" ${boardViewState.reviewers.includes(u.id) ? 'checked' : ''}>${esc(u.name)}</label>`).join('')}
      </div></details>
      <button type="button" class="btn" id="board-filter-clear">清除篩選</button>
    </aside>`;

    let mainArea = '';
    if (boardViewState.view === 'board') {
      mainArea = `<div class="kanban-viewport"><div class="kanban">
        ${cols.map((st) => {
          const cards = filtered.filter((i) => i.status === st.code).sort((a, b) => (a.boardRank || 0) - (b.boardRank || 0));
          return `<section class="kanban-col" data-kanban-col="${esc(st.code)}">
            <div class="kanban-title">${icon('GripHorizontal')}<span>${esc(st.name)}</span><b>${cards.length}</b></div>
            <div class="kanban-cards">
              ${cards.map((i) => `<article class="issue-card" draggable="true" data-drag-issue="${esc(i.issueKey)}">
                <div class="issue-card-top"><span class="issue-key">${esc(i.issueKey)}</span>${icon('GripVertical')}</div>
                <div class="issue-title"><a href="#issue/${esc(i.issueKey)}">${esc(i.title)}</a>${tagPillsHtml(i.tagIds)}</div>
                <div class="issue-card-sub">${esc(TYPE_LABELS[i.type] || i.type)}${i.estimatedHours ? ` · ${i.estimatedHours}h` : ''}</div>
                <div class="issue-meta">
                  ${statusBadgeHtml(i.status)}
                  <div class="kanban-assign-pair">${assigneePickerHtml(i, 'maker')}${assigneePickerHtml(i, 'reviewer')}</div>
                </div>
              </article>`).join('') || '<p class="eyebrow" style="margin:8px 2px">尚無卡片</p>'}
            </div>
          </section>`;
        }).join('')}
      </div></div>`;
    } else if (boardViewState.view === 'list') {
      mainArea = `<div class="card horizontal-issue-list">${horizontalHeaderHtml()}
        ${filtered.map((i) => horizontalRowHtml(i)).join('') || '<p class="empty-state">沒有符合條件的卡片。</p>'}
      </div>`;
    } else {
      const backlogCards = filtered.filter((i) => !i.sprintId && i.type !== 'TASK');
      const plannedSprints = state.sprints.filter((s) => s.status === 'PLANNED');
      mainArea = `<div class="backlog-view">
        <section class="card" style="margin-bottom:14px">
          <div class="toolbar"><h2>Backlog（尚未排入 Sprint）</h2><span class="eyebrow">${backlogCards.length} 張卡片</span></div>
          <div class="horizontal-issue-list">${horizontalHeaderHtml('排入 Sprint')}
            ${backlogCards.map((i) => horizontalRowHtml(i, `<select class="select compact-select" data-move-sprint="${esc(i.issueKey)}"><option value="">Backlog</option>${state.sprints.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select>`)).join('') || '<p class="empty-state">沒有未排入的卡片。</p>'}
          </div>
        </section>
        ${plannedSprints.map((sp) => {
          const spCards = filtered.filter((i) => i.sprintId === sp.id);
          return `<section class="card">
            <div class="toolbar"><h2>${esc(sp.name)}</h2><span class="eyebrow">未來 Sprint · ${spCards.length} 張</span></div>
            <div class="horizontal-issue-list">${horizontalHeaderHtml('Sprint')}
              ${spCards.map((i) => horizontalRowHtml(i, `<select class="select compact-select" data-move-sprint="${esc(i.issueKey)}"><option value="">移回 Backlog</option>${state.sprints.map((s) => `<option value="${esc(s.id)}" ${i.sprintId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>`)).join('') || '<p class="empty-state">此 Sprint 尚無卡片。</p>'}
            </div>
          </section>`;
        }).join('')}
      </div>`;
    }

    return `<div class="toolbar">
        <div><a href="#projects" class="project-back">← 所有專案</a><h1>${esc(project.key)} · ${esc(project.name)}</h1></div>
        <div class="actions">
          ${state.projects.map((p) => `<a href="#project/${esc(p.key)}" class="btn ${p.key === project.key ? 'btn-primary' : ''}">${esc(p.key)}</a>`).join('')}
        </div>
      </div>
      <div class="toolbar">
        <div class="actions">
          <button type="button" class="btn ${boardViewState.view === 'board' ? 'btn-primary' : ''}" data-board-view="board">看板</button>
          <button type="button" class="btn ${boardViewState.view === 'list' ? 'btn-primary' : ''}" data-board-view="list">List</button>
          <button type="button" class="btn ${boardViewState.view === 'backlog' ? 'btn-primary' : ''}" data-board-view="backlog">Backlog</button>
          <select class="select compact-select" id="board-sprint-select" ${boardViewState.view === 'backlog' ? 'disabled' : ''}>
            <option value="all" ${boardViewState.sprintId === 'all' ? 'selected' : ''}>全部 Sprint</option>
            <option value="backlog" ${boardViewState.sprintId === 'backlog' ? 'selected' : ''}>未排入 Sprint</option>
            ${state.sprints.map((s) => `<option value="${esc(s.id)}" ${boardViewState.sprintId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
          </select>
        </div>
        <button type="button" class="btn btn-primary" data-open-create="${esc(project.id)}">＋ 建立卡片</button>
      </div>
      <div class="listing-filter-layout">${filterSidebar}<div class="listing-filter-results">${mainArea}</div></div>`;
  }

  // Page 5: Issues
  let issueFilterQ = '';
  function renderIssuesPage() {
    const list = state.issues.filter((i) => i.type === 'ISSUE' && (!issueFilterQ || (i.issueKey + ' ' + i.title).toLowerCase().includes(issueFilterQ.toLowerCase())));
    return `<div class="toolbar"><div><h1>Issue</h1><p class="eyebrow">開卡類型為 Issue / Bug 的卡片 · 共 ${list.length} 張</p></div>
      <input class="input" style="max-width:260px" id="issues-q" placeholder="搜尋編號或標題" value="${esc(issueFilterQ)}"></div>
      <div class="card horizontal-issue-list">${horizontalHeaderHtml('優先權')}
        ${list.map((i) => horizontalRowHtml(i, `<span class="eyebrow">${esc(PRIORITY_LABELS[i.priority] || i.priority)}</span>`)).join('') || '<p class="empty-state">沒有符合的 Issue。</p>'}
      </div>`;
  }

  // Page 6: Epics
  let expandedEpics = new Set(['i_ep1']);
  function renderEpics() {
    const epics = state.issues.filter((i) => i.type === 'EPIC');
    return `<h1>Epics</h1><p class="eyebrow" style="margin-bottom:16px">跨專案目標與子卡片總覽。完成度依子卡片「驗收通過」比例計算。</p>
      <div class="card">
        ${epics.map((ep) => {
          const children = state.issues.filter((i) => i.parentId === ep.id);
          const done = children.filter((c) => c.status === 'DONE').length;
          const pct = children.length ? Math.round((done / children.length) * 100) : 0;
          const open = expandedEpics.has(ep.id);
          return `<div style="border-bottom:1px solid var(--line);padding:12px 0">
            <div style="display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap">
              <div style="display:flex;align-items:center;gap:8px">
                <button type="button" class="btn" style="padding:4px 6px" data-toggle-epic="${esc(ep.id)}">
                  <span style="display:inline-flex;transform:${open ? 'rotate(90deg)' : 'none'}">${icon('ChevronRight')}</span>
                </button>
                <a href="#issue/${esc(ep.issueKey)}" class="issue-key">${esc(ep.issueKey)}</a>
                <a href="#issue/${esc(ep.issueKey)}"><strong>${esc(ep.title)}</strong></a>
              </div>
              <div style="display:flex;align-items:center;gap:12px">
                ${statusInlineHtml(ep)}
                <div style="display:flex;align-items:center;gap:6px"><div style="width:90px;height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden"><div style="width:${pct}%;height:100%;background:var(--green)"></div></div><small>${done}/${children.length} · ${pct}%</small></div>
              </div>
            </div>
            ${open ? `<div class="horizontal-issue-list" style="margin-top:10px;padding-left:28px">${horizontalHeaderHtml()}
              ${children.map((c) => horizontalRowHtml(c)).join('') || '<p class="eyebrow" style="padding:8px">尚無子工作項目</p>'}
            </div>` : ''}
          </div>`;
        }).join('')}
      </div>`;
  }

  // Page 7: Sprints
  function renderSprints() {
    const sp = state.sprints.find((s) => s.status === 'ACTIVE') || state.sprints[0];
    const sections = state.sprintSections.filter((sec) => sec.sprintId === sp.id).sort((a, b) => a.sortOrder - b.sortOrder);
    const ungrouped = state.issues.filter((i) => i.sprintId === sp.id && !i.sprintSectionId);

    return `<div class="toolbar"><div><div class="eyebrow">全專案 Sprint</div><h1>${esc(sp.name)}</h1></div><span class="badge badge-green">${esc(sp.status)}</span></div>
      <div class="toolbar"><h2>Sprint 規劃</h2><button type="button" class="btn btn-primary" id="sprint-add-sec">＋ 新增區塊</button></div>
      ${sections.map((sec) => {
        const cards = state.issues.filter((i) => i.sprintSectionId === sec.id);
        return `<section class="card" style="margin-bottom:16px">
          <div class="toolbar">
            <div>
              <strong style="font-size:16px">${esc(sec.name)}</strong>
              <span class="eyebrow" style="margin-left:8px">${cards.length} 張卡</span>
              ${sec.releasedAt ? '<span class="badge badge-green" style="margin-left:8px">已 Release</span>' : ''}
              <div class="eyebrow">執行區間：${esc(sec.executionStartAt || '未設定')} ～ ${esc(sec.executionEndAt || '未設定')}</div>
            </div>
            <div class="actions">
              ${!sec.releasedAt ? `<button type="button" class="btn" data-release-sec="${esc(sec.id)}">Release</button>
                <button type="button" class="btn" data-sec-pick="${esc(sec.id)}">＋ 加入卡片</button>` : ''}
            </div>
          </div>
          <div class="horizontal-issue-list">${horizontalHeaderHtml('排程')}
            ${cards.map((i) => horizontalRowHtml(i, `<span class="eyebrow" style="white-space:nowrap">${esc(i.plannedStartAt ? i.plannedStartAt.slice(5).replace('-', '/') : '—')} ～ ${esc(i.plannedEndAt ? i.plannedEndAt.slice(5).replace('-', '/') : '—')}</span>`)).join('') || '<p class="empty-state">尚未加入卡片，可點右上角「＋ 加入卡片」。</p>'}
          </div>
        </section>`;
      }).join('')}
      <section class="card">
        <div class="toolbar"><h2>未分組卡片</h2><span class="eyebrow">${ungrouped.length} 張卡</span></div>
        <div class="horizontal-issue-list">${horizontalHeaderHtml()}
          ${ungrouped.map((i) => horizontalRowHtml(i)).join('') || '<p class="empty-state">目前沒有未分組卡片。</p>'}
        </div>
      </section>`;
  }

  // Page 8: Releases
  function renderReleases() {
    return `<div class="eyebrow">Delivery</div><h1>Release</h1><p class="eyebrow" style="margin-bottom:16px">從 Sprint 上版的區塊與卡片集中顯示於此。</p>
      ${state.releases.map((rel) => {
        const cards = rel.issueIds.map((id) => issueById(id)).filter(Boolean);
        return `<section class="card" style="margin-bottom:14px">
          <div class="toolbar"><div><h2>${esc(rel.name)}</h2><div class="eyebrow">上線日期：${rel.releasedAt.slice(0, 10)}</div></div></div>
          <div class="horizontal-issue-list">${horizontalHeaderHtml()}
            ${cards.map((i) => horizontalRowHtml(i)).join('')}
          </div>
        </section>`;
      }).join('')}`;
  }

  // Page 9: Workload
  let workloadQuery = '';
  function renderWorkload() {
    const weeks = ['W1 (11/17)', 'W2 (11/24)', 'W3 (12/01)', 'W4 (12/08)'];
    const emps = state.users.filter((u) => !workloadQuery || u.name.toLowerCase().includes(workloadQuery.toLowerCase()));
    const loadClass = (pct) => pct === 0 ? 'status-gray' : pct < 80 ? 'status-green' : pct < 100 ? 'status-orange' : 'status-red';

    return `<h1>工作分時</h1>
      <p class="eyebrow" style="margin-bottom:14px">依工作日每天 8h（週容量 40h）計算排程；負責人、驗收人各計完整工時，同人兼任只計一次。</p>
      <div class="card" style="margin-bottom:14px"><input class="input" style="max-width:260px" id="wl-q" placeholder="搜尋姓名..." value="${esc(workloadQuery)}"></div>
      <div class="card table-scroll"><table class="table">
        <thead><tr><th>人員 / 部門</th>${weeks.map((w) => `<th>${w}</th>`).join('')}<th>總排程</th></tr></thead>
        <tbody>${emps.map((u) => {
          const cards = state.issues.filter((i) => i.assigneeId === u.id || i.reviewerId === u.id);
          const total = cards.reduce((s, i) => s + (Number(i.estimatedHours) || 0), 0);
          const perWeek = Math.round((total / 2) * 10) / 10;
          return `<tr><td><strong>${esc(u.name)}</strong><div class="eyebrow">${esc(u.jobTitle)}</div></td>
            ${weeks.map((_, idx) => {
              const h = idx < 2 ? perWeek : Math.max(0, Math.round((total - perWeek * 2) * 10) / 10);
              const pct = Math.round((h / 40) * 100);
              return `<td><button type="button" class="btn" style="padding:4px 8px" data-wl-detail="${esc(u.id)}"><b>${h}h</b> <span class="status-badge ${loadClass(pct)}">${pct}%</span></button></td>`;
            }).join('')}
            <td><strong>${total}h</strong></td></tr>`;
        }).join('')}</tbody>
      </table></div>`;
  }

  // Page 10: Search
  let globalSearchQ = '';
  function renderSearch() {
    const q = globalSearchQ.trim().toLowerCase();
    const hits = state.issues.filter((i) => !q || (i.issueKey + ' ' + i.title + ' ' + (i.descriptionText || '')).toLowerCase().includes(q));
    return `<h1>搜尋</h1>
      <div class="card" style="margin-bottom:16px"><input class="input" id="global-search" placeholder="輸入卡片編號、標題或描述關鍵字..." value="${esc(globalSearchQ)}"></div>
      <div class="card horizontal-issue-list">${horizontalHeaderHtml()}
        ${hits.map((i) => horizontalRowHtml(i)).join('') || '<p class="empty-state">找不到符合的卡片。</p>'}
      </div>`;
  }

  // Page 11: Admin
  function renderAdmin() {
    if (!canManage()) return '<div class="card empty-state">此頁面僅限管理者或系統管理員檢視（請從右上角切換為「周月 · PM」）。</div>';
    return `<div class="eyebrow">Administration</div><h1>管理後台</h1>
      <div class="grid grid-2" style="margin-bottom:18px">
        <section class="card"><h2>員工</h2>
          <table class="table"><tbody>${state.users.map((u) => `<tr>
            <td><strong>${esc(u.name)}</strong><div class="eyebrow">${esc(u.email)}</div></td>
            <td>${esc(u.jobTitle)}</td>
            <td><span class="badge ${u.role === 'MANAGER' ? 'badge-blue' : 'badge-gray'}">${u.role === 'MANAGER' ? '管理者' : '一般成員'}</span></td>
          </tr>`).join('')}</tbody></table>
        </section>
        <section class="card"><h2>專案</h2>
          ${state.projects.map((p) => `<div class="task-row"><span class="issue-key">${esc(p.key)}</span><span>${esc(p.name)}</span></div>`).join('')}
        </section>
      </div>
      <section class="card"><h2>Status 與接球角色設定</h2><p class="eyebrow" style="margin-bottom:10px">依角色決定卡片進入誰的「我的工作」，不依狀態名稱猜測。</p>
        <table class="table"><thead><tr><th>名稱</th><th>Code</th><th>接球角色</th></tr></thead><tbody>
          ${state.statuses.map((st) => `<tr>
            <td>${statusBadgeHtml(st.code)}</td>
            <td><code>${esc(st.code)}</code></td>
            <td><select class="select compact-select" data-admin-owner-role="${esc(st.id)}">
              <option value="MAKER" ${st.ownerRole === 'MAKER' ? 'selected' : ''}>負責人（RD）接球</option>
              <option value="REVIEWER" ${st.ownerRole === 'REVIEWER' ? 'selected' : ''}>驗收人（QA）接球</option>
              <option value="NONE" ${st.ownerRole === 'NONE' ? 'selected' : ''}>無需接球</option>
            </select></td>
          </tr>`).join('')}
        </tbody></table>
      </section>`;
  }

  // Page 12: System Operations (Audit Trail)
  function renderSystemOps() {
    if (!canManage()) return '<div class="card empty-state">此頁面僅限管理者或系統管理員檢視（請從右上角切換為「周月 · PM」）。</div>';
    return `<div class="eyebrow">Administration · Audit trail</div><h1>系統操作</h1>
      <p class="eyebrow" style="margin-bottom:14px">重大管理操作與指定卡片事件依時間倒序排列；此頁只供查閱。</p>
      <section class="card">
        ${[...state.audits].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map((a) => {
          const actor = userById(a.actorId);
          return `<article style="padding:12px 0;border-bottom:1px solid var(--line)">
            <div class="toolbar"><strong>${esc(a.eventType)} · ${esc(a.entityId)}</strong><span class="eyebrow">${a.createdAt.slice(0, 16).replace('T', ' ')}</span></div>
            <p class="eyebrow">操作者：${esc(actor ? actor.name : '系統')}</p>
            <details><summary style="cursor:pointer;font-size:13px">查看變更內容</summary><pre style="font-size:12px;margin:8px 0 0">${esc(JSON.stringify(a.metadata, null, 2))}</pre></details>
          </article>`;
        }).join('')}
      </section>`;
  }

  // Page 13: Issue Detail
  let issueUi = { editDesc: false, activityTab: 'comments', handoffTarget: '', handoffReason: '' };
  function renderIssueDetail(key) {
    const issue = issueByKey(key);
    if (!issue) return `<div class="card"><p>找不到卡片 ${esc(key)}</p><a class="btn" href="#projects">回專案</a></div>`;
    const project = projectById(issue.projectId);
    const parent = issueById(issue.parentId);
    const tasks = state.issues.filter((i) => i.parentId === issue.id);
    const owner = currentOwner(issue);
    const curRole = statusOwnerRole(statusByCode(issue.status));
    const blocks = state.blocks.filter((b) => b.fromId === issue.id || b.toId === issue.id).map((b) => issueById(b.fromId === issue.id ? b.toId : b.fromId)).filter(Boolean);
    const targetSt = statusByCode(issueUi.handoffTarget);
    const returning = curRole === 'REVIEWER' && targetSt && statusOwnerRole(targetSt) === 'MAKER';
    const isMyTurn = owner && owner.id === me().id;

    return `<div class="demo-detail">
      <div class="toolbar">
        <div class="eyebrow">${project ? `<a href="#project/${esc(project.key)}">${esc(project.name)}</a> / ` : ''}${esc(issue.issueKey)}</div>
        <button type="button" class="btn" onclick="history.back()">← 返回</button>
      </div>
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
        <h1 style="margin:0"><span class="issue-key-fixed">${esc(issue.issueKey)} · </span>
          <button type="button" class="issue-title-editable" id="edit-issue-title">${esc(issue.title)}</button></h1>
        ${tagPillsHtml(issue.tagIds)}
        <button type="button" class="btn" id="add-tag-btn">Add tag +</button>
      </div>
      ${blocks.length ? `<div class="card" style="background:#fff5f5;border-color:#fecaca;margin-bottom:14px"><strong>Blocked · 相依提醒</strong>：${blocks.map((b) => `<a href="#issue/${esc(b.issueKey)}">${esc(b.issueKey)} · ${esc(b.title)}</a>`).join('、')}</div>` : ''}
      <div class="actions" style="margin-bottom:14px">
        <button type="button" class="btn btn-danger" id="btn-add-block">Blocked</button>
        ${issue.type === 'ISSUE' ? '<button type="button" class="btn" id="btn-copy-story">複製為 User Story</button>' : ''}
      </div>

      <div class="issue-layout">
        <div>
          <section class="card" style="margin-bottom:16px">
            <h2>描述</h2>
            ${issueUi.editDesc ? `
              <textarea class="textarea" id="desc-draft" rows="4">${esc(issue.descriptionText || '')}</textarea>
              <div class="actions" style="margin-top:8px"><button type="button" class="btn" id="desc-cancel">取消</button><button type="button" class="btn btn-primary" id="desc-save" data-key="${esc(issue.issueKey)}">儲存</button></div>
            ` : `<div class="description-content" id="desc-open">${esc(issue.descriptionText || '尚無描述，點擊此處新增描述')}</div>`}
          </section>

          ${['USERSTORY', 'ISSUE', 'EPIC'].includes(issue.type) ? `<section class="card tasks-card" style="margin-bottom:16px">
            <div class="toolbar"><h2>${issue.type === 'EPIC' ? '子工作項目' : 'Tasks'} <span class="eyebrow">(${tasks.length})</span></h2>
              <button type="button" class="btn btn-primary" id="btn-quick-task" data-parent="${esc(issue.id)}">＋ 新增 ${issue.type === 'EPIC' ? '子項目' : 'Task'}</button></div>
            ${tasks.length ? `<div class="issue-task-table">
              <div class="issue-task-row issue-task-header" aria-hidden="true"><span>編號</span><span>標題</span><span>專案</span><span>狀態</span><span class="person-column-heading">負責人</span><span class="person-column-heading">驗收人</span></div>
              ${tasks.map((t) => `<div class="issue-task-row">
                <a class="child-key aligned-issue-reference" href="#issue/${esc(t.issueKey)}">${esc(alignedRef(t))}</a>
                <a class="issue-task-title child-title" href="#issue/${esc(t.issueKey)}">${esc(t.title)}</a>
                <span class="child-project">${projectTagHtml(t)}</span>
                <span class="child-status">${statusInlineHtml(t)}</span>
                <span class="child-maker">${assigneePickerHtml(t, 'maker')}</span>
                <span class="child-reviewer">${assigneePickerHtml(t, 'reviewer')}</span>
              </div>`).join('')}
            </div>` : '<p class="eyebrow">尚未建立子工作項目。</p>'}
          </section>` : ''}

          ${issue.type !== 'EPIC' ? `<section class="card" style="margin-bottom:16px" aria-label="同卡交接">
            <h2>同一張卡，RD／QA 接球</h2>
            <p>目前輪到：<b>${esc(owner ? owner.name : curRole === 'NONE' ? '已完成／無需接球' : '未指定')}</b> ${statusBadgeHtml(issue.status)}
              · 負責人：${esc(userById(issue.assigneeId)?.name || '未指派')} · 驗收人：${esc(userById(issue.reviewerId)?.name || '未指派')}</p>
            ${isMyTurn ? `<div class="grid" style="gap:10px;margin-top:12px">
              <label class="field">交接後的狀態<select class="select" id="handoff-target">
                <option value="">選擇交接後的狀態</option>
                ${state.statuses.filter((s) => s.code !== issue.status).map((s) => `<option value="${esc(s.code)}" ${issueUi.handoffTarget === s.code ? 'selected' : ''}>${esc(s.name)} · ${statusOwnerRole(s) === 'REVIEWER' ? '驗收人接球' : statusOwnerRole(s) === 'MAKER' ? '負責人接球' : '無需接球'}</option>`).join('')}
              </select></label>
              ${returning ? `<label class="field">退回原因（重現步驟／預期結果／實際結果）<textarea class="textarea" id="handoff-reason" rows="3" placeholder="填寫退回原因...">${esc(issueUi.handoffReason)}</textarea></label>` : ''}
              <div><button type="button" class="btn btn-primary" id="handoff-submit" data-key="${esc(issue.issueKey)}">${returning ? '確認退回原 RD' : '確認交接'}</button></div>
            </div>` : owner ? `<p class="eyebrow" style="margin-top:8px">目前輪到「${esc(owner.name)}」處理，可從右上角切換體驗帳號來操作交接，或直接於右側 Details 調整狀態。</p>` : ''}
            ${issue.qaCycles.length ? `<details open style="margin-top:14px"><summary style="cursor:pointer;color:var(--accent);font-weight:600">驗收紀錄（${issue.qaCycles.length} 輪）</summary>
              ${issue.qaCycles.map((c) => `<div style="margin-top:8px;padding:8px 10px;background:#f8fafc;border-radius:8px">
                <b>第 ${c.round} 輪 · ${c.result === 'PASSED' ? '通過' : c.result === 'FAILED' ? '失敗' : '等待／進行驗收'}</b>
                ${c.failureReason ? `<p style="white-space:pre-wrap;margin:4px 0 0;font-size:13px">${esc(c.failureReason)}</p>` : ''}
              </div>`).join('')}</details>` : ''}
          </section>` : ''}

          <section class="card">
            <h2>Activity</h2>
            <div class="issue-tabs">
              <button type="button" class="btn ${issueUi.activityTab === 'comments' ? 'active-tab' : ''}" data-act-tab="comments">留言 (${issue.comments.length})</button>
              <button type="button" class="btn ${issueUi.activityTab === 'activity' ? 'active-tab' : ''}" data-act-tab="activity">Activity</button>
            </div>
            ${issueUi.activityTab === 'comments' ? `
              <form id="comment-form" data-key="${esc(issue.issueKey)}" style="margin-bottom:12px">
                <textarea class="textarea" name="comment" rows="2" placeholder="輸入留言..." required></textarea>
                <div class="actions" style="justify-content:flex-end;margin-top:8px"><button type="submit" class="btn btn-primary">送出留言</button></div>
              </form>
              ${issue.comments.map((cm) => `<div class="comment">
                <div class="comment-header"><span class="comment-avatar">${esc(userById(cm.authorId)?.name.slice(0, 1) || '?')}</span><b>${esc(userById(cm.authorId)?.name || '成員')}</b><span class="eyebrow">${cm.createdAt.slice(0, 16).replace('T', ' ')}</span></div>
                <p style="margin:0">${esc(cm.contentText)}</p>
              </div>`).join('')}
            ` : `<div>${state.audits.filter((a) => a.entityId === issue.issueKey).map((a) => `<div class="history-row">
              <span class="comment-avatar">${esc(userById(a.actorId)?.name.slice(0, 1) || 'R')}</span>
              <b>${esc(userById(a.actorId)?.name || 'Relay')}</b>
              <span>${esc(a.eventType)} ${esc(JSON.stringify(a.metadata))}</span>
              <span class="eyebrow">${a.createdAt.slice(0, 16).replace('T', ' ')}</span>
            </div>`).join('') || '<p class="eyebrow">尚無此卡片的活動紀錄。</p>'}</div>`}
          </section>
        </div>

        <aside class="card issue-details">
          <h2 style="font-size:16px;margin:0">Details</h2>
          <div class="detail-property"><span class="eyebrow">Status</span>${statusInlineHtml(issue)}</div>
          <div class="detail-property"><span class="eyebrow">建立者</span><span>${esc(userById(issue.reporterId)?.name || '—')}</span></div>
          <div class="detail-property"><span class="eyebrow">負責人</span><div style="display:flex;align-items:center;gap:8px">${assigneePickerHtml(issue, 'maker')}<span>${esc(userById(issue.assigneeId)?.name || '未指派')}</span></div></div>
          <div class="detail-property"><span class="eyebrow">驗收人</span><div style="display:flex;align-items:center;gap:8px">${assigneePickerHtml(issue, 'reviewer')}<span>${esc(userById(issue.reviewerId)?.name || '未指派')}</span></div></div>
          <div class="detail-property"><span class="eyebrow">Priority</span>
            <select class="select compact-select" data-detail-field="priority" data-key="${esc(issue.issueKey)}">
              ${Object.entries(PRIORITY_LABELS).map(([k, v]) => `<option value="${k}" ${issue.priority === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select></div>
          <div class="detail-property"><span class="eyebrow">Sprint</span>
            <select class="select compact-select" data-detail-field="sprintId" data-key="${esc(issue.issueKey)}">
              <option value="">未加入 Sprint</option>
              ${state.sprints.map((s) => `<option value="${esc(s.id)}" ${issue.sprintId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
            </select></div>
          <div class="detail-property"><span class="eyebrow">Type</span><span>${esc(TYPE_LABELS[issue.type] || issue.type)}</span></div>
          <div class="detail-property"><span class="eyebrow">Parent</span><span>${parent ? `<a href="#issue/${esc(parent.issueKey)}" class="issue-key">${esc(parent.issueKey)}</a>` : '—'}</span></div>
          <div class="detail-property"><span class="eyebrow">Estimate (h)</span>
            <input type="number" class="input" style="width:90px" min="0" step="0.5" value="${issue.estimatedHours ?? ''}" data-detail-field="estimatedHours" data-key="${esc(issue.issueKey)}"></div>
          <div class="detail-property" style="align-items:start"><span class="eyebrow">排程區間</span>
            <div style="display:grid;gap:6px;width:100%">
              <input type="date" class="input" value="${esc(issue.plannedStartAt || '')}" data-detail-field="plannedStartAt" data-key="${esc(issue.issueKey)}">
              <input type="date" class="input" value="${esc(issue.plannedEndAt || '')}" data-detail-field="plannedEndAt" data-key="${esc(issue.issueKey)}">
            </div></div>
        </aside>
      </div>
    </div>`;
  }

  // Router & Render
  function currentRoute() {
    return location.hash.slice(1) || 'dashboard';
  }

  function render() {
    const route = currentRoute();
    closePopovers();
    renderChrome(route);
    const screen = $('#screen');
    if (route === 'dashboard') screen.innerHTML = renderDashboard();
    else if (route === 'notifications') screen.innerHTML = renderNotifications();
    else if (route === 'team') screen.innerHTML = renderTeam();
    else if (route === 'projects') screen.innerHTML = renderProjectsList();
    else if (route.startsWith('project/')) screen.innerHTML = renderProjectBoard(route.slice(8));
    else if (route === 'issues') screen.innerHTML = renderIssuesPage();
    else if (route === 'epics') screen.innerHTML = renderEpics();
    else if (route === 'sprints') screen.innerHTML = renderSprints();
    else if (route === 'releases') screen.innerHTML = renderReleases();
    else if (route === 'workload') screen.innerHTML = renderWorkload();
    else if (route === 'search') screen.innerHTML = renderSearch();
    else if (route === 'admin') screen.innerHTML = renderAdmin();
    else if (route === 'system-operations') screen.innerHTML = renderSystemOps();
    else if (route.startsWith('issue/')) screen.innerHTML = renderIssueDetail(decodeURIComponent(route.slice(6)));
    else screen.innerHTML = renderDashboard();
  }

  // Global Event Delegation
  document.addEventListener('click', (e) => {
    const t = e.target;

    // Popover triggers
    const statusBtn = t.closest('[data-pick-status]');
    if (statusBtn) { e.preventDefault(); e.stopPropagation(); openStatusPopover(statusBtn, statusBtn.dataset.pickStatus); return; }
    const assignBtn = t.closest('[data-pick-assignee]');
    if (assignBtn) { e.preventDefault(); e.stopPropagation(); openAssigneePopover(assignBtn, assignBtn.dataset.pickAssignee, assignBtn.dataset.pickRole); return; }
    if (t.closest('#account-trigger')) { e.stopPropagation(); openAccountMenu($('#account-trigger')); return; }

    // Inside Status Popover
    const setStatus = t.closest('[data-set-status]');
    if (setStatus) {
      const issue = issueByKey(setStatus.dataset.targetIssue);
      if (issue) {
        updateIssueField(issue, { status: setStatus.dataset.setStatus });
        closePopovers();
        render();
        showToast(`${issue.issueKey} 狀態已更新為「${statusByCode(issue.status)?.name}」`);
      }
      return;
    }

    // Inside Assignee Popover
    const setAssign = t.closest('[data-set-assignee]');
    if (setAssign) {
      const issue = issueByKey(setAssign.dataset.targetIssue);
      const role = setAssign.dataset.targetRole;
      const val = setAssign.dataset.setAssignee || null;
      if (issue) {
        updateIssueField(issue, { [role === 'maker' ? 'assigneeId' : 'reviewerId']: val });
        closePopovers();
        render();
        showToast(`${issue.issueKey} ${role === 'maker' ? '負責人' : '驗收人'}已更新為「${val ? userById(val)?.name : '未指派'}」`);
      }
      return;
    }

    // Account Menu items
    const accTab = t.closest('[data-account-tab]');
    if (accTab) { closePopovers(); openAccountSettingsModal(accTab.dataset.accountTab); return; }
    const switchUser = t.closest('[data-switch-user]');
    if (switchUser) {
      state.meId = switchUser.dataset.switchUser;
      persist();
      closePopovers();
      render();
      showToast(`已切換登入視角：${me().name}`);
      return;
    }
    if (t.closest('#menu-reset-demo')) {
      state = createInitialState();
      persist();
      closePopovers();
      location.hash = '#dashboard';
      render();
      showToast('已重置所有 Demo 資料');
      return;
    }

    // Close popovers on outside click
    if (!t.closest('#popover-portal')) closePopovers();

    // Modal close / create
    if (t.closest('[data-close-modal]') || t.dataset?.closeBackdrop) { closeModal(); return; }
    if (t.closest('#topbar-create') || t.closest('[data-open-create]')) {
      openCreateIssueModal(t.closest('[data-open-create]')?.dataset.openCreate || '');
      return;
    }

    // Appearance choice
    const bgBtn = t.closest('[data-choose-bg]');
    if (bgBtn) {
      state.appearance = bgBtn.dataset.chooseBg;
      persist();
      applyAppearance();
      openAccountSettingsModal('appearance');
      return;
    }

    // Dashboard interactions
    const dashBucket = t.closest('[data-dash-bucket]');
    if (dashBucket) { state.dashboardView.bucket = dashBucket.dataset.dashBucket; render(); return; }
    const dashCustom = t.closest('[data-dash-custom]');
    if (dashCustom) { openDashboardCustomModal(dashCustom.dataset.dashCustom); return; }
    const toggleDashSt = t.closest('[data-toggle-dash-st]');
    if (toggleDashSt) {
      const f = state.dashboardFilters[toggleDashSt.dataset.bucket];
      const sid = toggleDashSt.dataset.toggleDashSt;
      f.statusIds = f.statusIds.includes(sid) ? f.statusIds.filter((x) => x !== sid) : [...f.statusIds, sid];
      persist();
      openDashboardCustomModal(toggleDashSt.dataset.bucket);
      render();
      return;
    }
    if (t.closest('#dash-clear')) {
      state.dashboardView = { bucket: state.dashboardView.bucket, projectId: '', role: 'all', from: '', to: '', includeUnscheduled: true, query: '' };
      render();
      return;
    }

    // Notifications
    const readNotif = t.closest('[data-read-notif]');
    if (readNotif) {
      const n = state.notifications.find((x) => x.id === readNotif.dataset.readNotif);
      if (n) n.readAt = new Date().toISOString();
      persist();
      render();
      return;
    }
    if (t.closest('#read-all-notifs')) {
      state.notifications.filter((n) => n.userId === me().id && !n.readAt).forEach((n) => { n.readAt = new Date().toISOString(); });
      persist();
      render();
      return;
    }

    // Team follow toggle
    const followBtn = t.closest('[data-toggle-follow]');
    if (followBtn) {
      const uid = followBtn.dataset.toggleFollow;
      state.teamFollowedIds = state.teamFollowedIds.includes(uid) ? state.teamFollowedIds.filter((x) => x !== uid) : [...state.teamFollowedIds, uid];
      persist();
      render();
      return;
    }

    // Project Board view / clear
    const bv = t.closest('[data-board-view]');
    if (bv) { boardViewState.view = bv.dataset.boardView; render(); return; }
    if (t.closest('#board-filter-clear')) {
      boardViewState = { ...boardViewState, q: '', statuses: [], assignees: [], reviewers: [] };
      render();
      return;
    }

    // Epics toggle
    const epBtn = t.closest('[data-toggle-epic]');
    if (epBtn) {
      const eid = epBtn.dataset.toggleEpic;
      if (expandedEpics.has(eid)) expandedEpics.delete(eid);
      else expandedEpics.add(eid);
      render();
      return;
    }

    // Sprint actions
    if (t.closest('#sprint-add-sec')) {
      const name = window.prompt('輸入新區塊名稱：');
      if (name && name.trim()) {
        state.sprintSections.push({ id: 'sec_' + (++state.nextSeq), sprintId: 'sp_24', name: name.trim(), sortOrder: (state.sprintSections.length + 1) * 10, executionStartAt: '', executionEndAt: '', releasedAt: null });
        persist();
        render();
      }
      return;
    }
    const secPick = t.closest('[data-sec-pick]');
    if (secPick) {
      const secId = secPick.dataset.secPick;
      const candidates = state.issues.filter((i) => i.type !== 'TASK' && i.sprintSectionId !== secId);
      showModal('加入卡片至區塊', `<div class="grid" style="gap:8px">
        ${candidates.map((i) => `<button type="button" class="btn" style="justify-content:flex-start" data-add-to-sec="${esc(secId)}" data-issue-id="${esc(i.id)}"><b>${esc(i.issueKey)}</b> · ${esc(i.title)}</button>`).join('') || '<p>無可加入卡片</p>'}
      </div>`, 520);
      return;
    }
    const addToSec = t.closest('[data-add-to-sec]');
    if (addToSec) {
      const issue = issueById(addToSec.dataset.issueId);
      if (issue) {
        issue.sprintId = 'sp_24';
        issue.sprintSectionId = addToSec.dataset.addToSec;
        persist();
        closeModal();
        render();
        showToast(`已將 ${issue.issueKey} 加入區塊`);
      }
      return;
    }
    const relSec = t.closest('[data-release-sec]');
    if (relSec) {
      const sec = state.sprintSections.find((s) => s.id === relSec.dataset.releaseSec);
      if (sec) {
        sec.releasedAt = new Date().toISOString();
        const cards = state.issues.filter((i) => i.sprintSectionId === sec.id);
        state.releases.unshift({ id: 'rel_' + (++state.nextSeq), name: `${sec.name} Release`, releasedAt: sec.releasedAt, issueIds: cards.map((c) => c.id) });
        persist();
        render();
        showToast(`已將「${sec.name}」發布至 Release`);
      }
      return;
    }

    // Workload detail modal
    const wlBtn = t.closest('[data-wl-detail]');
    if (wlBtn) {
      const u = userById(wlBtn.dataset.wlDetail);
      const cards = state.issues.filter((i) => i.assigneeId === u.id || i.reviewerId === u.id);
      showModal(`${u.name} · 排程明細`, `<div class="grid" style="gap:8px">
        ${cards.map((i) => `<a href="#issue/${esc(i.issueKey)}" class="card" style="padding:10px;display:flex;justify-content:space-between"><span><b>${esc(i.issueKey)}</b> ${esc(i.title)}</span><span>${i.estimatedHours || 0}h</span></a>`).join('') || '<p>無排程卡片</p>'}
      </div>`, 560);
      return;
    }

    // Issue Detail actions
    if (t.closest('#desc-open')) { issueUi.editDesc = true; render(); return; }
    if (t.closest('#desc-cancel')) { issueUi.editDesc = false; render(); return; }
    if (t.closest('#desc-save')) {
      const issue = issueByKey(t.closest('#desc-save').dataset.key);
      if (issue) {
        issue.descriptionText = $('#desc-draft').value;
        addAudit('DESCRIPTION_CHANGED', 'ISSUE', issue.issueKey, {});
        issueUi.editDesc = false;
        persist();
        render();
        showToast('描述已儲存');
      }
      return;
    }
    if (t.closest('#edit-issue-title')) {
      const issue = issueByKey(currentRoute().slice(6));
      const next = issue && window.prompt('編輯卡片標題：', issue.title);
      if (next && next.trim()) {
        issue.title = next.trim();
        addAudit('TITLE_CHANGED', 'ISSUE', issue.issueKey, { title: issue.title });
        persist();
        render();
      }
      return;
    }
    if (t.closest('#add-tag-btn')) {
      const issue = issueByKey(currentRoute().slice(6));
      if (!issue) return;
      showModal('管理卡片標籤', `<div class="actions" style="flex-wrap:wrap">${state.tags.map((tag) => {
        const on = issue.tagIds.includes(tag.id);
        return `<button type="button" class="btn ${on ? 'btn-primary' : ''}" data-toggle-issue-tag="${esc(tag.id)}" data-key="${esc(issue.issueKey)}">${esc(tag.name)} ${on ? '✓' : '＋'}</button>`;
      }).join('')}</div>`, 440);
      return;
    }
    const toggleTag = t.closest('[data-toggle-issue-tag]');
    if (toggleTag) {
      const issue = issueByKey(toggleTag.dataset.key);
      const tid = toggleTag.dataset.toggleIssueTag;
      if (issue) {
        issue.tagIds = issue.tagIds.includes(tid) ? issue.tagIds.filter((x) => x !== tid) : [...issue.tagIds, tid];
        persist();
        closeModal();
        render();
      }
      return;
    }
    const actTab = t.closest('[data-act-tab]');
    if (actTab) { issueUi.activityTab = actTab.dataset.actTab; render(); return; }
    if (t.closest('#handoff-submit')) {
      const issue = issueByKey(t.closest('#handoff-submit').dataset.key);
      const target = issueUi.handoffTarget;
      const reason = ($('#handoff-reason')?.value || '').trim();
      const curRole = statusOwnerRole(statusByCode(issue.status));
      const returning = curRole === 'REVIEWER' && statusOwnerRole(statusByCode(target)) === 'MAKER';
      if (!target) { showToast('請先選擇交接後的狀態'); return; }
      if (returning && !reason) { showToast('退回原 RD 時請填寫退回原因'); return; }
      updateIssueField(issue, { status: target }, reason);
      issueUi.handoffTarget = '';
      issueUi.handoffReason = '';
      render();
      showToast(`${issue.issueKey} 已完成交接`);
      return;
    }
    if (t.closest('#btn-quick-task')) {
      const parentId = t.closest('#btn-quick-task').dataset.parent;
      const parent = issueById(parentId);
      const title = parent && window.prompt('輸入新子任務標題：');
      if (title && title.trim()) {
        const p = projectById(parent.projectId) || state.projects[0];
        const key = `${p.key}-${state.nextNum[p.key]++}`;
        state.issues.push({
          id: 'i_' + (++state.nextSeq), issueKey: key, type: parent.type === 'EPIC' ? 'USERSTORY' : 'TASK',
          workItemType: 'DEVELOPMENT', projectId: p.id, parentId: parent.id, title: title.trim(), descriptionText: '',
          status: 'TODO', priority: 'MEDIUM', assigneeId: parent.assigneeId, reviewerId: parent.reviewerId, reporterId: me().id,
          estimatedHours: 2, plannedStartAt: '', plannedEndAt: '', sprintId: null, sprintSectionId: null, releaseId: null,
          tagIds: [], watcherIds: [], boardRank: 9000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          qaCycles: [], comments: [], attachments: []
        });
        persist();
        render();
        showToast(`已建立 ${key}`);
      }
      return;
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'dash-all-st') {
      state.dashboardFilters[t.dataset.bucket].allStatuses = t.checked;
      persist();
      openDashboardCustomModal(t.dataset.bucket);
      render();
    } else if (t.id === 'dash-proj') { state.dashboardView.projectId = t.value; render(); }
    else if (t.id === 'dash-role') { state.dashboardView.role = t.value; render(); }
    else if (t.id === 'dash-from') { state.dashboardView.from = t.value; render(); }
    else if (t.id === 'dash-to') { state.dashboardView.to = t.value; render(); }
    else if (t.id === 'dash-unscheduled') { state.dashboardView.includeUnscheduled = t.checked; render(); }
    else if (t.id === 'board-sprint-select') { boardViewState.sprintId = t.value; render(); }
    else if (t.dataset.bfStatus) {
      const v = t.dataset.bfStatus;
      boardViewState.statuses = t.checked ? [...boardViewState.statuses, v] : boardViewState.statuses.filter((x) => x !== v);
      render();
    } else if (t.dataset.bfAssignee) {
      const v = t.dataset.bfAssignee;
      boardViewState.assignees = t.checked ? [...boardViewState.assignees, v] : boardViewState.assignees.filter((x) => x !== v);
      render();
    } else if (t.dataset.bfReviewer) {
      const v = t.dataset.bfReviewer;
      boardViewState.reviewers = t.checked ? [...boardViewState.reviewers, v] : boardViewState.reviewers.filter((x) => x !== v);
      render();
    } else if (t.dataset.moveSprint) {
      const issue = issueByKey(t.dataset.moveSprint);
      if (issue) { issue.sprintId = t.value || null; persist(); render(); showToast(`${issue.issueKey} Sprint 已更新`); }
    } else if (t.dataset.adminOwnerRole) {
      const st = state.statuses.find((s) => s.id === t.dataset.adminOwnerRole);
      if (st) { st.ownerRole = t.value; persist(); showToast(`已更新「${st.name}」的接球角色`); }
    } else if (t.id === 'handoff-target') {
      issueUi.handoffTarget = t.value;
      render();
    } else if (t.dataset.detailField) {
      const issue = issueByKey(t.dataset.key);
      if (issue) {
        const f = t.dataset.detailField;
        updateIssueField(issue, { [f]: f === 'estimatedHours' ? (t.value ? Number(t.value) : null) : (t.value || null) });
        render();
        showToast('欄位已更新');
      }
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'dash-q') { state.dashboardView.query = t.value; render(); $('#dash-q')?.focus(); }
    else if (t.id === 'board-filter-q') { boardViewState.q = t.value; render(); $('#board-filter-q')?.focus(); }
    else if (t.id === 'issues-q') { issueFilterQ = t.value; render(); $('#issues-q')?.focus(); }
    else if (t.id === 'wl-q') { workloadQuery = t.value; render(); $('#wl-q')?.focus(); }
    else if (t.id === 'global-search') { globalSearchQ = t.value; render(); $('#global-search')?.focus(); }
  });

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    if (form.id === 'create-issue-form') {
      const type = fd.get('type');
      const pid = type === 'EPIC' ? null : fd.get('projectId');
      const p = projectById(pid);
      const prefix = type === 'EPIC' ? 'EPIC' : (p?.key || 'APP');
      const key = `${prefix}-${state.nextNum[prefix] = (state.nextNum[prefix] || 100) + 1}`;
      state.issues.unshift({
        id: 'i_' + (++state.nextSeq), issueKey: key, type, workItemType: 'DEVELOPMENT',
        projectId: pid, parentId: fd.get('parentId') || null, title: String(fd.get('title')).trim(),
        descriptionText: String(fd.get('descriptionText') || '').trim(), status: 'TODO',
        priority: fd.get('priority'), assigneeId: fd.get('assigneeId') || null, reviewerId: fd.get('reviewerId') || null,
        reporterId: me().id, estimatedHours: fd.get('estimatedHours') ? Number(fd.get('estimatedHours')) : null,
        plannedStartAt: '', plannedEndAt: '', sprintId: null, sprintSectionId: null, releaseId: null,
        tagIds: [], watcherIds: [me().id], boardRank: 500, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        qaCycles: [], comments: [], attachments: []
      });
      addAudit('ISSUE_CREATED', 'ISSUE', key, { title: fd.get('title') });
      persist();
      closeModal();
      location.hash = `#issue/${key}`;
      showToast(`已建立卡片 ${key}`);
    } else if (form.id === 'comment-form') {
      const issue = issueByKey(form.dataset.key);
      const text = String(fd.get('comment') || '').trim();
      if (issue && text) {
        issue.comments.unshift({ id: 'cm_' + (++state.nextSeq), authorId: me().id, contentText: text, createdAt: new Date().toISOString(), deletedAt: null });
        addAudit('COMMENT_CREATED', 'ISSUE', issue.issueKey, { text });
        persist();
        render();
      }
    } else if (form.id === 'profile-form') {
      const u = me();
      u.name = String(fd.get('name')).trim() || u.name;
      u.jobTitle = String(fd.get('jobTitle')).trim();
      persist();
      closeModal();
      render();
      showToast('個人資料已儲存');
    } else if (form.id === 'pw-form') {
      closeModal();
      showToast('密碼已更新（示範模式）');
    }
  });

  // Kanban Drag & Drop
  let draggedKey = null;
  document.addEventListener('dragstart', (e) => {
    const card = e.target.closest('[data-drag-issue]');
    if (!card) return;
    draggedKey = card.dataset.dragIssue;
    card.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  document.addEventListener('dragover', (e) => {
    const col = e.target.closest('[data-kanban-col]');
    if (!col || !draggedKey) return;
    e.preventDefault();
    $$('.kanban-col.is-over').forEach((c) => c.classList.remove('is-over'));
    col.classList.add('is-over');
  });
  document.addEventListener('drop', (e) => {
    const col = e.target.closest('[data-kanban-col]');
    if (!col || !draggedKey) return;
    e.preventDefault();
    const issue = issueByKey(draggedKey);
    const nextCode = col.dataset.kanbanCol;
    draggedKey = null;
    if (issue && issue.status !== nextCode) {
      updateIssueField(issue, { status: nextCode });
      render();
      showToast(`${issue.issueKey} 已移動至「${statusByCode(nextCode)?.name}」`);
    }
  });
  document.addEventListener('dragend', () => {
    draggedKey = null;
    $$('.is-dragging, .is-over').forEach((el) => el.classList.remove('is-dragging', 'is-over'));
  });

  window.addEventListener('hashchange', render);
  render();
})();
