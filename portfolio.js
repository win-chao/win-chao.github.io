(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------------------------------------------------------
  // 1. Tech Particle & Radar Mesh Canvas
  // ---------------------------------------------------------
  const canvas = $('#tech-canvas');
  const ctx = canvas?.getContext('2d');
  const pointer = { x: -9999, y: -9999, active: false };
  let nodes = [];

  function initCanvas() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(68, Math.max(26, Math.floor((w * h) / 24000)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.42,
      vy: (Math.random() - 0.5) * 0.42,
      r: 1.3 + Math.random() * 1.4
    }));
  }

  function drawCanvas() {
    if (!canvas || !ctx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isLight = document.documentElement.dataset.theme === 'light';
    const nodeColor = isLight ? 'rgba(2, 132, 199, 0.45)' : 'rgba(34, 211, 238, 0.55)';
    const lineRgb = isLight ? '2, 132, 199' : '56, 189, 248';

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (!reducedMotion) {
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
      }

      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 135) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${lineRgb}, ${(1 - dist / 135) * 0.16})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      if (pointer.active) {
        const pdx = a.x - pointer.x;
        const pdy = a.y - pointer.y;
        const pdist = Math.hypot(pdx, pdy);
        if (pdist < 175) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.strokeStyle = `rgba(${lineRgb}, ${(1 - pdist / 175) * 0.36})`;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      }
    }

    if (!reducedMotion) requestAnimationFrame(drawCanvas);
  }

  window.addEventListener('resize', () => {
    initCanvas();
    if (reducedMotion) drawCanvas();
  });
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  }, { passive: true });
  window.addEventListener('pointerleave', () => { pointer.active = false; });

  initCanvas();
  drawCanvas();

  // ---------------------------------------------------------
  // 2. Glass Card Micro-Wave Flip + Cursor Ripple Engine
  // ---------------------------------------------------------
  const cards = $$('.project-card');

  function spawnRipple(card, x, y) {
    if (reducedMotion) return;
    const layer = $('.glass-ripple-layer', card);
    if (!layer) return;
    const ring = document.createElement('span');
    ring.className = 'wave-ring';
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    layer.appendChild(ring);
    ring.addEventListener('animationend', () => ring.remove(), { once: true });
    if (layer.children.length > 5) layer.firstElementChild?.remove();
  }

  cards.forEach((card) => {
    let lastRippleAt = 0;

    card.addEventListener('pointerenter', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);

      if (!reducedMotion) {
        card.classList.remove('is-waving');
        void card.offsetWidth;
        card.classList.add('is-waving');
        spawnRipple(card, x, y);
        lastRippleAt = performance.now();
      }
    });

    card.addEventListener('pointermove', (e) => {
      if (reducedMotion || window.innerWidth <= 960) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const px = (x / rect.width) - 0.5;
      const py = (y / rect.height) - 0.5;

      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);
      card.style.setProperty('--rx', `${(-py * 9).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${(px * 11).toFixed(2)}deg`);

      const now = performance.now();
      if (now - lastRippleAt > 420) {
        spawnRipple(card, x, y);
        lastRippleAt = now;
      }
    });

    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-waving');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });

  // ---------------------------------------------------------
  // 3. Interactive Telemetry Console (Live Rule & QA Simulator)
  // ---------------------------------------------------------
  const TELEMETRY = {
    '01': {
      href: './04-pocket-qa/index.html',
      metric: 'EVIDENCE: FULL_PNG + TIMELINE + NET/CONSOLE · 0.31s',
      logs: [
        ['info', '[SYS-01]', 'Init AutoQA Desktop · Env=UAT · Browser=Chrome'],
        ['ok', '[PASS]', 'public_website.01 :: Header/公告/Footer 節點檢查通過 (96ms)'],
        ['ok', '[PASS]', 'online_account_tw.02 :: 聯絡信箱必填與格式驗證通過'],
        ['fail', '[FAIL]', 'online_account_tw.03 :: HTTP 503 Upstream Timeout (318ms)'],
        ['warn', '[CAPTURE]', '已保存無馬賽克完整原圖 QA-03-03-error.png + HTML 報告']
      ]
    },
    '02': {
      href: './01-relay/index.html',
      metric: 'HANDOFF: MAKER(RD) ↔ REVIEWER(QA) · 0.14s',
      logs: [
        ['info', '[SYS-02]', 'WorkflowService :: 雙指派接球引擎就緒'],
        ['ok', '[ASSIGN]', 'APP-24 製作人=林晨(RD) · 驗收人=陳晴(QA)'],
        ['ok', '[HANDOFF]', '狀態切換「待驗收」→ CurrentOwner 自動轉交 陳晴'],
        ['warn', '[REJECT]', '若驗收失敗退回原 RD，強制記錄重現步驟與第 N 輪驗收'],
        ['ok', '[AUDIT]', '已寫入 WORK_HANDOFF 通知與系統稽核軌跡']
      ]
    },
    '03': {
      href: './02-pmo-slack/index.html',
      metric: 'DEDUP_GUARD: ACTIVE · SLACK_DM_READY',
      logs: [
        ['info', '[SYS-03]', 'PMO Extension :: 偵測到甘特圖「測試完成」儲存事件'],
        ['ok', '[VERIFY]', '異動紀錄核對 actor=QA 與卡片 ID 唯一性通過'],
        ['warn', '[FALLBACK]', '子卡 PMO-42 未指定需求單位 → 自動沿用母卡「產品企劃」'],
        ['ok', '[DEDUP]', 'sequence #1 尚未通知，通過防重複檢查'],
        ['ok', '[SLACK]', '已透過 macOS 原生 App 送達收件人「林晴」私訊']
      ]
    },
    '04': {
      href: './03-excel-payroll/index.html',
      metric: 'SETTLEMENT: A / B / A+B + CARRYOVER · 0.19s',
      logs: [
        ['info', '[SYS-04]', 'ExcelJS :: 解析 2026-06 來源獎金表（3 位 KOL）'],
        ['ok', '[RULE]', '套用「滿千發放」與「A+B 兩方出帳」分段邏輯'],
        ['warn', '[CARRY]', 'DEMO-101 期初/本期畸零數自動結轉下一期間'],
        ['ok', '[CHECK]', '驗證平台出帳金額 <= 實發金額（無超額異常）'],
        ['ok', '[EXPORT]', '已產生沿用原業務版型之 Excel 結算報表']
      ]
    }
  };

  let currentSys = '01';
  let streamTimers = [];

  function runTelemetry(sysId) {
    currentSys = sysId;
    const spec = TELEMETRY[sysId];
    const out = $('#console-output');
    if (!spec || !out) return;

    streamTimers.forEach(clearTimeout);
    streamTimers = [];
    out.innerHTML = '';

    $$('.console-tab').forEach((tab) => {
      const active = tab.dataset.sysTab === sysId;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });

    $('#console-metric').textContent = spec.metric;
    $('#console-launch').href = spec.href;

    spec.logs.forEach(([level, tag, text], idx) => {
      const append = () => {
        const line = document.createElement('div');
        line.className = 'log-line';
        line.innerHTML = `<span class="log-tag ${level}">${tag}</span><span>${text}</span>`;
        out.appendChild(line);
      };
      if (reducedMotion) append();
      else streamTimers.push(setTimeout(append, idx * 110));
    });
  }

  $$('.console-tab').forEach((tab) => {
    tab.addEventListener('click', () => runTelemetry(tab.dataset.sysTab));
  });
  $('#console-replay')?.addEventListener('click', () => runTelemetry(currentSys));

  // Trait cards highlight matching project & run telemetry
  $$('.trait').forEach((trait) => {
    trait.addEventListener('click', () => {
      const sys = trait.dataset.traitSys;
      $$('.trait').forEach((t) => t.classList.toggle('is-highlighted', t === trait));
      runTelemetry(sys);
      cards.forEach((c) => {
        c.classList.toggle('is-dimmed', c.dataset.sys !== sys);
      });
      setTimeout(() => {
        cards.forEach((c) => c.classList.remove('is-dimmed'));
        trait.classList.remove('is-highlighted');
      }, 2200);
    });
  });

  // ---------------------------------------------------------
  // 4. Category Filter Pills & Theme Toggle
  // ---------------------------------------------------------
  $$('.pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      $$('.pill-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
      cards.forEach((card) => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('is-hidden', !show);
      });
    });
  });

  const themeBtn = $('#theme-toggle');
  const themeLabel = $('#theme-label');
  themeBtn?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    themeLabel.textContent = next === 'light' ? 'Frost Glass' : 'Dark Glass';
    if (reducedMotion) drawCanvas();
  });

  runTelemetry('01');
})();
