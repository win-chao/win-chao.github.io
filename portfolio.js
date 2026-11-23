(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------------------------------------------------------
  // 1. 3-Plane Depth-of-Field Digital World Code Stream Canvas
  // ---------------------------------------------------------
  const canvas = $('#tech-canvas');
  const ctx = canvas?.getContext('2d');
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, nx: 0, ny: 0, active: false };
  const smoothParallax = { x: 0, y: 0 };

  const CODE_SNIPPETS = [
    'await expect(page).toPass()',
    'assert(http === 200 && biz.ok)',
    'HANDOFF :: RD -> QA [READY]',
    'CAPTURE :: FULL_PNG (NO_BLUR)',
    'XLSX.recalc(carryover, month)',
    'DEDUP_GUARD :: seq #104 OK',
    '0x7F9A :: TRACE_TIMELINE',
    'workflow.verifyBoundary()',
    'statusOwner = REVIEWER',
    'NET_LOG :: 200 OK (96ms)'
  ];
  const MATRIX_CHARS = '01ABCDEF0123456789<>{}[]=+-/*;:';

  let streams = [];
  let floatingSnippets = [];
  let nodes = [];

  function initCanvas() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 垂直數位代碼雨（遠景 + 中景）
    const colCount = Math.min(44, Math.max(18, Math.floor(w / 34)));
    streams = Array.from({ length: colCount }, (_, idx) => {
      const isMid = idx % 3 !== 0;
      const depth = isMid ? (0.58 + Math.random() * 0.32) : (0.25 + Math.random() * 0.2);
      const len = isMid ? (7 + Math.floor(Math.random() * 8)) : (5 + Math.floor(Math.random() * 6));
      return {
        x: (idx + 0.3 + Math.random() * 0.4) * (w / colCount),
        y: Math.random() * h,
        speed: isMid ? (1.1 + Math.random() * 1.4) : (0.4 + Math.random() * 0.45),
        depth,
        fontSize: isMid ? 12 : 10,
        alpha: isMid ? 0.32 : 0.14,
        palette: idx % 4 === 0 ? 'violet' : idx % 3 === 0 ? 'emerald' : 'cyan',
        chars: Array.from({ length: len }, () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)])
      };
    });

    // 橫向流動的 QA / 系統程式碼片段（中景 + 近景散景景深）
    const snippetCount = Math.min(20, Math.max(10, Math.floor(w / 85)));
    floatingSnippets = Array.from({ length: snippetCount }, (_, idx) => {
      const isNear = idx % 3 === 0;
      const depth = isNear ? (1.25 + Math.random() * 0.45) : (0.65 + Math.random() * 0.25);
      return {
        x: Math.random() * w,
        y: 60 + Math.random() * (h - 120),
        vx: (isNear ? 0.55 : 0.28) + Math.random() * 0.35,
        depth,
        isNear,
        fontSize: isNear ? (15 + Math.random() * 4) : 11.5,
        text: CODE_SNIPPETS[idx % CODE_SNIPPETS.length],
        color: idx % 3 === 0 ? 'cyan' : idx % 2 === 0 ? 'violet' : 'emerald'
      };
    });

    // 科技節點
    const nodeCount = Math.min(42, Math.max(18, Math.floor((w * h) / 36000)));
    nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.32,
      vy: (Math.random() - 0.5) * 0.32,
      depth: 0.4 + Math.random() * 0.9,
      r: 1.2 + Math.random() * 1.4
    }));
  }

  function colorRgb(name, isLight) {
    if (isLight) {
      if (name === 'violet') return '109, 40, 217';
      if (name === 'emerald') return '5, 150, 105';
      return '2, 132, 199';
    }
    if (name === 'violet') return '167, 139, 250';
    if (name === 'emerald') return '52, 211, 153';
    return '34, 211, 238';
  }

  function drawCanvas() {
    if (!canvas || !ctx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isLight = document.documentElement.dataset.theme === 'light';

    smoothParallax.x += (pointer.nx - smoothParallax.x) * 0.06;
    smoothParallax.y += (pointer.ny - smoothParallax.y) * 0.06;

    ctx.clearRect(0, 0, w, h);

    // 1) 遠景 & 中景：垂直數位代碼雨
    for (const s of streams) {
      const px = s.x + smoothParallax.x * 26 * s.depth;
      const pyBase = s.y + smoothParallax.y * 18 * s.depth;
      const rgb = colorRgb(s.palette, isLight);
      ctx.font = `600 ${s.fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;

      for (let i = 0; i < s.chars.length; i++) {
        const cy = pyBase - i * (s.fontSize + 4);
        if (cy < -20 || cy > h + 20) continue;
        const fade = (1 - i / s.chars.length) * s.alpha;
        if (i === 0) {
          ctx.fillStyle = isLight ? `rgba(${rgb}, ${Math.min(0.85, s.alpha * 2.2)})` : `rgba(224, 247, 255, ${Math.min(0.9, s.alpha * 2.4)})`;
        } else {
          ctx.fillStyle = `rgba(${rgb}, ${fade.toFixed(3)})`;
        }
        ctx.fillText(s.chars[i], px, cy);
      }

      if (!reducedMotion) {
        s.y += s.speed;
        if (Math.random() < 0.04) {
          const idx = Math.floor(Math.random() * s.chars.length);
          s.chars[idx] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        }
        if (s.y - s.chars.length * (s.fontSize + 4) > h + 20) {
          s.y = -10;
        }
      }
    }

    // 2) 中景 & 近景散景：橫向漂浮程式碼片段（深淺景深）
    for (const f of floatingSnippets) {
      const px = f.x + smoothParallax.x * 48 * f.depth;
      const py = f.y + smoothParallax.y * 32 * f.depth;
      const rgb = colorRgb(f.color, isLight);

      ctx.save();
      ctx.font = `${f.isNear ? 700 : 500} ${f.fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      if (f.isNear) {
        ctx.shadowColor = `rgba(${rgb}, 0.55)`;
        ctx.shadowBlur = 14;
        ctx.fillStyle = `rgba(${rgb}, ${isLight ? 0.36 : 0.42})`;
      } else {
        ctx.fillStyle = `rgba(${rgb}, ${isLight ? 0.24 : 0.26})`;
      }
      ctx.fillText(f.text, px, py);
      ctx.restore();

      if (!reducedMotion) {
        f.x += f.vx;
        if (f.x > w + 40) {
          f.x = -260;
          f.y = 60 + Math.random() * (h - 120);
        }
      }
    }

    // 3) 節點與游標雷達引力連線
    const lineRgb = isLight ? '2, 132, 199' : '56, 189, 248';
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (!reducedMotion) {
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
      }
      const ax = a.x + smoothParallax.x * 30 * a.depth;
      const ay = a.y + smoothParallax.y * 22 * a.depth;

      ctx.beginPath();
      ctx.arc(ax, ay, a.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${lineRgb}, ${(0.25 + a.depth * 0.3).toFixed(2)})`;
      ctx.fill();

      if (pointer.active) {
        const pdist = Math.hypot(ax - pointer.x, ay - pointer.y);
        if (pdist < 185) {
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.strokeStyle = `rgba(${lineRgb}, ${(1 - pdist / 185) * 0.38})`;
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
    pointer.nx = (e.clientX / window.innerWidth) - 0.5;
    pointer.ny = (e.clientY / window.innerHeight) - 0.5;
    pointer.active = true;
  }, { passive: true });
  window.addEventListener('pointerleave', () => {
    pointer.active = false;
    pointer.nx = 0;
    pointer.ny = 0;
  });

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
