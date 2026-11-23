(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------------------------------------------------------
  // 1. Matrix 3-Plane Depth-of-Field Digital Rain & Code Engine
  // ---------------------------------------------------------
  const canvas = $('#tech-canvas');
  const ctx = canvas?.getContext('2d');
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, nx: 0, ny: 0, active: false };
  const smoothParallax = { x: 0, y: 0 };

  const MATRIX_GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF<>+*:=';
  const CODE_SNIPPETS = [
    'WAKE_UP :: QA_WIN',
    'await expect(page).toPass()',
    'MATRIX.ASSERT(HTTP === 200)',
    'HANDOFF :: RD -> QA [READY]',
    'CAPTURE :: FULL_PNG (RAW)',
    'XLSX.recalc(carryover)',
    'DEDUP_GUARD :: seq #104',
    '0x00FF41 :: CONSTRUCT_LIVE'
  ];

  let farStreams = [];
  let midStreams = [];
  let nearStreams = [];
  let floatingSnippets = [];

  function makeStream(colIdx, totalCols, w, h, layer) {
    const xBase = (colIdx + 0.25 + Math.random() * 0.5) * (w / totalCols);
    if (layer === 'far') {
      const len = 8 + Math.floor(Math.random() * 10);
      return {
        x: xBase,
        y: Math.random() * h,
        speed: 0.45 + Math.random() * 0.55,
        depth: 0.22 + Math.random() * 0.2,
        fontSize: 10,
        alpha: 0.22,
        chars: Array.from({ length: len }, () => MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)])
      };
    }
    if (layer === 'mid') {
      const len = 10 + Math.floor(Math.random() * 12);
      return {
        x: xBase,
        y: Math.random() * h,
        speed: 1.25 + Math.random() * 1.65,
        depth: 0.6 + Math.random() * 0.35,
        fontSize: 14,
        alpha: 0.52,
        chars: Array.from({ length: len }, () => MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)])
      };
    }
    // near bokeh layer
    const len = 5 + Math.floor(Math.random() * 5);
    return {
      x: xBase,
      y: Math.random() * h,
      speed: 2.1 + Math.random() * 1.9,
      depth: 1.35 + Math.random() * 0.5,
      fontSize: 24,
      alpha: 0.2,
      chars: Array.from({ length: len }, () => MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)])
    };
  }

  function initCanvas() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const farCount = Math.min(40, Math.max(18, Math.floor(w / 36)));
    const midCount = Math.min(32, Math.max(14, Math.floor(w / 46)));
    const nearCount = Math.min(10, Math.max(5, Math.floor(w / 150)));

    farStreams = Array.from({ length: farCount }, (_, i) => makeStream(i, farCount, w, h, 'far'));
    midStreams = Array.from({ length: midCount }, (_, i) => makeStream(i, midCount, w, h, 'mid'));
    nearStreams = Array.from({ length: nearCount }, (_, i) => makeStream(i, nearCount, w, h, 'near'));

    const snippetCount = Math.min(14, Math.max(7, Math.floor(w / 110)));
    floatingSnippets = Array.from({ length: snippetCount }, (_, idx) => {
      const isNear = idx % 3 === 0;
      return {
        x: Math.random() * w,
        y: 70 + Math.random() * (h - 140),
        vx: (isNear ? 0.55 : 0.28) + Math.random() * 0.3,
        depth: isNear ? 1.45 : 0.75,
        isNear,
        fontSize: isNear ? 16 : 11.5,
        text: CODE_SNIPPETS[idx % CODE_SNIPPETS.length]
      };
    });
  }

  function drawStreamGroup(group, w, h, overdrive, isNear = false) {
    const boost = overdrive ? 1.3 : 1;
    for (const s of group) {
      const px = s.x + smoothParallax.x * 36 * s.depth;
      const pyBase = s.y + smoothParallax.y * 24 * s.depth;

      ctx.save();
      ctx.font = `700 ${s.fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      if (isNear) {
        ctx.shadowColor = 'rgba(34, 211, 238, 0.78)';
        ctx.shadowBlur = 20;
      }

      for (let i = 0; i < s.chars.length; i++) {
        const cy = pyBase - i * (s.fontSize + 4);
        if (cy < -30 || cy > h + 30) continue;
        const fade = (1 - i / s.chars.length) * s.alpha * boost;
        if (i === 0) {
          ctx.fillStyle = isNear
            ? `rgba(224, 247, 255, ${Math.min(0.42, s.alpha * 1.9 * boost)})`
            : `rgba(235, 250, 255, ${Math.min(0.95, s.alpha * 2.1 * boost)})`;
        } else {
          ctx.fillStyle = `rgba(34, 211, 238, ${Math.min(0.85, fade).toFixed(3)})`;
        }
        ctx.fillText(s.chars[i], px, cy);
      }
      ctx.restore();

      if (!reducedMotion) {
        s.y += s.speed;
        if (Math.random() < 0.08) {
          const idx = Math.floor(Math.random() * s.chars.length);
          s.chars[idx] = MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)];
        }
        if (s.y - s.chars.length * (s.fontSize + 4) > h + 30) {
          s.y = -12;
        }
      }
    }
  }

  function drawCanvas() {
    if (!canvas || !ctx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const overdrive = document.documentElement.dataset.theme === 'overdrive';

    smoothParallax.x += (pointer.nx - smoothParallax.x) * 0.06;
    smoothParallax.y += (pointer.ny - smoothParallax.y) * 0.06;

    ctx.clearRect(0, 0, w, h);

    // 1) 遠景層（失焦細字慢速代碼雨）
    drawStreamGroup(farStreams, w, h, overdrive, false);

    // 2) 中景層（清晰發光經典 Matrix 代碼雨 + 漂浮系統指令）
    drawStreamGroup(midStreams, w, h, overdrive, false);

    for (const f of floatingSnippets) {
      const px = f.x + smoothParallax.x * 46 * f.depth;
      const py = f.y + smoothParallax.y * 30 * f.depth;
      ctx.save();
      ctx.font = `${f.isNear ? 700 : 500} ${f.fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      if (f.isNear) {
        ctx.shadowColor = 'rgba(56, 189, 248, 0.75)';
        ctx.shadowBlur = 14;
        ctx.fillStyle = `rgba(165, 243, 252, ${overdrive ? 0.38 : 0.28})`;
      } else {
        ctx.fillStyle = `rgba(56, 189, 248, ${overdrive ? 0.32 : 0.22})`;
      }
      ctx.fillText(f.text, px, py);
      ctx.restore();

      if (!reducedMotion) {
        f.x += f.vx;
        if (f.x > w + 40) {
          f.x = -260;
          f.y = 70 + Math.random() * (h - 140);
        }
      }
    }

    // 3) 近景散景層（巨型近距離失焦字元，大幅度視差）
    drawStreamGroup(nearStreams, w, h, overdrive, true);

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
  // 2. Glass Card Micro-Wave Flip + Ripple + Matrix Decrypt
  // ---------------------------------------------------------
  const cards = $$('.project-card');

  function scrambleText(el, finalStr) {
    if (!el || reducedMotion) return;
    let frame = 0;
    const total = 10;
    clearInterval(el._decryptTimer);
    el._decryptTimer = setInterval(() => {
      frame++;
      const progress = frame / total;
      const revealed = Math.floor(progress * finalStr.length);
      let out = '';
      for (let i = 0; i < finalStr.length; i++) {
        if (i < revealed || finalStr[i] === ' ') out += finalStr[i];
        else out += MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)];
      }
      el.textContent = out;
      if (frame >= total) {
        clearInterval(el._decryptTimer);
        el.textContent = finalStr;
      }
    }, 32);
  }

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

      const sysEl = $('[data-decrypt-text]', card);
      if (sysEl) scrambleText(sysEl, sysEl.dataset.decryptText);

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
  // 3. Matrix Telemetry Console (Live Rule & QA Simulator)
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
  // 4. Category Filter Pills & Matrix Overdrive Toggle
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
    const next = document.documentElement.dataset.theme === 'overdrive' ? 'cyber' : 'overdrive';
    document.documentElement.dataset.theme = next;
    themeLabel.textContent = next === 'overdrive' ? 'OVERDRIVE' : 'CYBER_CORE';
    if (reducedMotion) drawCanvas();
  });

  // ---------------------------------------------------------
  // 5. 聯絡Win iPhone 16 Pro 彈窗設定與互動
  // ---------------------------------------------------------
  // TODO: 若要替換成您的真實聯絡資料與大頭貼，直接修改下方物件即可
  const WIN_CONTACT_PROFILE = {
    name: '曹家贏 (Win)',
    role: 'Web QA 工程師 · 流程設計 × AI 協作',
    phone: '0936-936-939',
    email: 'st25580209@gmail.com',
    resumeUrl: 'https://pda.104.com.tw/profile/share/ia4BlMtDcQbjzSte0yujfkwPynpxI8xT',
    resumeLabel: '開啟 Win 的 104 履歷 ↗',
    avatarUrl: './avatar.png'
  };

  const contactModal = $('#iphone-contact-modal');
  const contactDevice = $('#iphone-device');
  const openPhoneBtn = $('#open-contact-phone');
  const closePhoneBtn = $('#close-contact-phone');
  const islandEl = $('#iphone-island');
  const islandText = $('#iphone-island-text');
  let islandTimer = null;

  function applyContactProfile() {
    const nameEl = $('#iphone-contact-name');
    const roleEl = $('#iphone-contact-role');
    const phoneLink = $('#iphone-phone-link');
    const callAction = $('#iphone-call-action');
    const emailLink = $('#iphone-email-link');
    const mailAction = $('#iphone-mail-action');
    const resumeLink = $('#iphone-resume-link');
    const resumeLabel = $('#iphone-resume-label');
    const avatarImg = $('#iphone-avatar-img');
    const avatarFallback = $('#iphone-avatar-fallback');

    if (nameEl) nameEl.textContent = WIN_CONTACT_PROFILE.name;
    if (roleEl) roleEl.textContent = WIN_CONTACT_PROFILE.role;
    const rawTel = WIN_CONTACT_PROFILE.phone.replace(/[^\d+]/g, '');
    if (phoneLink) {
      phoneLink.textContent = WIN_CONTACT_PROFILE.phone;
      phoneLink.href = `tel:${rawTel}`;
    }
    if (callAction) callAction.href = `tel:${rawTel}`;
    if (emailLink) {
      emailLink.textContent = WIN_CONTACT_PROFILE.email;
      emailLink.href = `mailto:${WIN_CONTACT_PROFILE.email}`;
    }
    if (mailAction) mailAction.href = `mailto:${WIN_CONTACT_PROFILE.email}`;
    if (resumeLink) resumeLink.href = WIN_CONTACT_PROFILE.resumeUrl;
    if (resumeLabel) resumeLabel.textContent = WIN_CONTACT_PROFILE.resumeLabel;

    if (WIN_CONTACT_PROFILE.avatarUrl && avatarImg && avatarFallback) {
      avatarImg.src = WIN_CONTACT_PROFILE.avatarUrl;
      avatarImg.hidden = false;
      avatarFallback.style.display = 'none';
    }
  }

  function updateIphoneClock() {
    const clockEl = $('#iphone-clock');
    if (!clockEl) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${hh}:${mm}`;
  }

  function showIslandFeedback(msg) {
    if (!islandEl || !islandText) return;
    clearTimeout(islandTimer);
    islandEl.classList.add('is-feedback');
    islandText.textContent = msg;
    islandTimer = setTimeout(() => {
      islandEl.classList.remove('is-feedback');
      islandText.textContent = `CONNECTING · ${WIN_CONTACT_PROFILE.name.toUpperCase()}`;
    }, 1800);
  }

  function openContactModal() {
    if (!contactModal) return;
    updateIphoneClock();
    contactModal.hidden = false;
    requestAnimationFrame(() => {
      contactModal.classList.add('is-open');
    });
    document.body.style.overflow = 'hidden';
  }

  function closeContactModal() {
    if (!contactModal) return;
    contactModal.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!contactModal.classList.contains('is-open')) {
        contactModal.hidden = true;
      }
    }, 260);
  }

  applyContactProfile();
  $$('[data-open-contact-phone]').forEach((btn) => {
    btn.addEventListener('click', openContactModal);
  });
  closePhoneBtn?.addEventListener('click', closeContactModal);

  // 點擊手機以外的反灰背景即可關閉
  contactModal?.addEventListener('click', (e) => {
    if (contactDevice && !contactDevice.contains(e.target)) {
      closeContactModal();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && contactModal && !contactModal.hidden) {
      closeContactModal();
    }
  });

  // 複製電話 / Email 並於動態島顯示回饋
  $$('[data-copy-target]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const target = btn.dataset.copyTarget;
      const value = target === 'phone' ? WIN_CONTACT_PROFILE.phone : WIN_CONTACT_PROFILE.email;
      try {
        await navigator.clipboard.writeText(value);
        showIslandFeedback(target === 'phone' ? '✓ 已複製電話號碼' : '✓ 已複製 Email');
      } catch {
        showIslandFeedback(`✓ ${value}`);
      }
    });
  });

  runTelemetry('01');
})();
