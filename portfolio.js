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
  // 3. 作品分類篩選 (全部系統 / 測試自動化 / 專案管理系統 / Excel 智能彙整系統)
  // ---------------------------------------------------------
  const hobbyDividerEl = $('#hobby-section-label');
  $$('#portfolio-filter-pills .pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      $$('#portfolio-filter-pills .pill-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
      cards.forEach((card) => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('is-hidden', !show);
      });
      if (hobbyDividerEl) {
        hobbyDividerEl.hidden = !(filter === 'all' || filter === 'hobby');
      }
    });
  });

  // ---------------------------------------------------------
  // 4. 聯絡Win iPhone 16 Pro 彈窗設定與互動
  // ---------------------------------------------------------
  const WIN_CONTACT_PROFILE = {
    name: '曹家贏 (Win)',
    islandIdleText: 'CONNECTING · WIN',
    role: '軟體 QA 工程師',
    phone: '0936-936-939',
    email: 'st25580209@gmail.com',
    lineId: 'st84923',
    lineUrl: 'https://line.me/ti/p/~st84923',
    resumeUrl: '#resume',
    resumeLabel: '檢視 Win 的履歷表 →',
    avatarUrl: './avatar.png?v=cyber15'
  };

  const contactModal = $('#iphone-contact-modal');
  const contactDevice = $('#iphone-device');
  const closePhoneBtn = $('#close-contact-phone');
  const lineQrModal = $('#line-qr-modal');
  const lineQrDialog = $('#line-qr-dialog');
  const closeLineQrBtn = $('#close-line-qr');
  const copyLineQrBtn = $('#copy-line-qr-id');
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
    const lineIdEl = $('#iphone-line-id');
    const lineQrIdEl = $('#line-qr-id-text');
    const lineQrDirectLink = $('#line-qr-direct-link');
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
    if (lineIdEl) lineIdEl.textContent = WIN_CONTACT_PROFILE.lineId;
    if (lineQrIdEl) lineQrIdEl.textContent = WIN_CONTACT_PROFILE.lineId;
    if (lineQrDirectLink) lineQrDirectLink.href = WIN_CONTACT_PROFILE.lineUrl;
    $$('[data-line-action]').forEach((el) => {
      if (el.tagName === 'A') el.href = WIN_CONTACT_PROFILE.lineUrl;
    });
    if (resumeLink) {
      resumeLink.href = WIN_CONTACT_PROFILE.resumeUrl;
      resumeLink.removeAttribute('target');
      resumeLink.removeAttribute('rel');
    }
    if (resumeLabel) resumeLabel.textContent = WIN_CONTACT_PROFILE.resumeLabel;

    if (WIN_CONTACT_PROFILE.avatarUrl && avatarImg && avatarFallback) {
      avatarImg.src = WIN_CONTACT_PROFILE.avatarUrl;
      avatarImg.hidden = false;
      avatarFallback.style.display = 'none';
    }
    if (islandText) islandText.textContent = WIN_CONTACT_PROFILE.islandIdleText;
  }

  function isMobileLineDevice() {
    const ua = navigator.userAgent || '';
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      return true;
    }
    return navigator.maxTouchPoints > 1 && window.innerWidth <= 1024;
  }

  function openLineQrModal() {
    if (!lineQrModal) return;
    document.body.classList.add('modal-open');
    lineQrModal.hidden = false;
    requestAnimationFrame(() => {
      lineQrModal.classList.add('is-open');
    });
    document.body.style.overflow = 'hidden';
  }

  function closeLineQrModal() {
    if (!lineQrModal) return;
    lineQrModal.classList.remove('is-open');
    const keepPhoneModalOpen = contactModal && !contactModal.hidden;
    if (!keepPhoneModalOpen) {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    }
    setTimeout(() => {
      if (!lineQrModal.classList.contains('is-open')) {
        lineQrModal.hidden = true;
      }
    }, 240);
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
      islandText.textContent = WIN_CONTACT_PROFILE.islandIdleText;
    }, 1800);
  }

  function openContactModal() {
    if (!contactModal) return;
    updateIphoneClock();
    document.body.classList.add('modal-open');
    contactModal.hidden = false;
    requestAnimationFrame(() => {
      contactModal.classList.add('is-open');
    });
    document.body.style.overflow = 'hidden';
  }

  function closeContactModal() {
    if (!contactModal) return;
    contactModal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
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

  $('#iphone-resume-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeContactModal();
    switchMainView('resume', 'resume');
  });

  // 點擊手機以外的反灰背景即可關閉
  contactModal?.addEventListener('click', (e) => {
    if (contactDevice && !contactDevice.contains(e.target)) {
      closeContactModal();
    }
  });
  closeLineQrBtn?.addEventListener('click', closeLineQrModal);
  lineQrModal?.addEventListener('click', (e) => {
    if (lineQrDialog && !lineQrDialog.contains(e.target)) {
      closeLineQrModal();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (lineQrModal && !lineQrModal.hidden) {
      closeLineQrModal();
    } else if (contactModal && !contactModal.hidden) {
      closeContactModal();
    }
  });

  // LINE 聯絡行為：手機直接開啟 LINE 加好友連結，電腦開啟 QR Code 彈窗
  $$('[data-line-action]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (isMobileLineDevice()) return;
      e.preventDefault();
      openLineQrModal();
    });
  });

  // 複製電話 / Email / LINE ID 並於動態島或按鈕顯示回饋
  $$('[data-copy-target]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const target = btn.dataset.copyTarget;
      const value = target === 'phone'
        ? WIN_CONTACT_PROFILE.phone
        : target === 'line'
          ? WIN_CONTACT_PROFILE.lineId
          : WIN_CONTACT_PROFILE.email;
      const msg = target === 'phone'
        ? '✓ 已複製電話號碼'
        : target === 'line'
          ? '✓ 已複製 LINE ID'
          : '✓ 已複製 Email';
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        // Fallback: still show user feedback
      }
      showIslandFeedback(msg);
      if (btn === copyLineQrBtn) {
        const orig = btn.textContent;
        btn.textContent = '已複製 ✓';
        setTimeout(() => { btn.textContent = orig; }, 1600);
      }
    });
  });

  // ---------------------------------------------------------
  // 6. 雙 TAB 主視圖切換 (作品集 / 履歷表) + 方案 A 開場進化秀
  // ---------------------------------------------------------
  const portfolioView = $('#view-portfolio');
  const resumeView = $('#view-resume');
  const filterPillsEl = $('#portfolio-filter-pills');
  const resumeHudActions = $('#resume-hud-actions');
  let activeMainView = 'portfolio';
  let hasPlayedOpeningShowcase = false;
  let isEvolutionShowcasePlaying = false;
  let evolutionShowcaseTimers = [];

  const RESUME_HASH_IDS = new Set([
    'resume',
    'resume-overview',
    'stage-01-miracle',
    'stage-02-mobifone',
    'stage-03-chanel',
    'stage-04-crystal',
    'stage-05-pocket',
    'resume-education'
  ]);

  function stopEvolutionShowcase(syncScroll = true) {
    evolutionShowcaseTimers.forEach((id) => clearTimeout(id));
    evolutionShowcaseTimers = [];
    isEvolutionShowcasePlaying = false;
    if (syncScroll && activeMainView === 'resume') {
      updateResumeScrollSpy();
    }
  }

  function playEvolutionShowcase() {
    if (activeMainView !== 'resume') return;
    stopEvolutionShowcase(false);
    isEvolutionShowcasePlaying = true;
    hasPlayedOpeningShowcase = true;

    const stages = [1, 2, 3, 4, 5];
    stages.forEach((stageNum, idx) => {
      const timerId = setTimeout(() => {
        if (!isEvolutionShowcasePlaying || activeMainView !== 'resume') return;
        applyGrowthStageUI(stageNum, '', 'showcase');
      }, idx * 1150);
      evolutionShowcaseTimers.push(timerId);
    });

    const endTimerId = setTimeout(() => {
      if (!isEvolutionShowcasePlaying) return;
      stopEvolutionShowcase(true);
    }, 5750);
    evolutionShowcaseTimers.push(endTimerId);
  }

  function switchMainView(viewName, hashId = '', updateHistory = true) {
    const isResume = viewName === 'resume';
    activeMainView = isResume ? 'resume' : 'portfolio';
    document.body.dataset.activeView = activeMainView;

    if (portfolioView) {
      portfolioView.hidden = isResume;
      portfolioView.classList.toggle('is-active', !isResume);
    }
    if (resumeView) {
      resumeView.hidden = !isResume;
      resumeView.classList.toggle('is-active', isResume);
    }
    if (filterPillsEl) filterPillsEl.hidden = isResume;
    if (resumeHudActions) resumeHudActions.hidden = !isResume;

    $$('.main-tab-btn').forEach((btn) => {
      const active = btn.dataset.mainTab === activeMainView;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    if (updateHistory) {
      const nextHash = hashId ? `#${hashId}` : (isResume ? '#resume' : '#portfolio');
      if (window.location.hash !== nextHash) {
        history.replaceState(null, '', nextHash);
      }
    }

    if (isResume) {
      initGrowthCanvas();
      requestAnimationFrame(() => {
        if (hashId && hashId !== 'resume') {
          stopEvolutionShowcase(false);
          scrollToResumeAnchor(hashId, false);
        } else {
          window.scrollTo({ top: 0, behavior: 'auto' });
          updateResumeScrollSpy();
          if (!hasPlayedOpeningShowcase && !reducedMotion) {
            setTimeout(() => {
              if (activeMainView === 'resume' && window.scrollY <= 18) {
                playEvolutionShowcase();
              }
            }, 120);
          }
        }
      });
    } else {
      stopEvolutionShowcase(false);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }

  $$('.main-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchMainView(btn.dataset.mainTab);
    });
  });

  // 列印 / 另存 A4 PDF 履歷
  function triggerResumePrint() {
    if (activeMainView !== 'resume') {
      switchMainView('resume', 'resume');
      setTimeout(() => window.print(), 180);
    } else {
      window.print();
    }
  }
  $('#print-resume-btn')?.addEventListener('click', triggerResumePrint);
  $$('[data-trigger-print]').forEach((btn) => {
    btn.addEventListener('click', triggerResumePrint);
  });

  // Stage 05 工具跳轉回 作品集 並高亮對應卡片
  $$('[data-jump-portfolio]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sysId = btn.dataset.jumpPortfolio;
      switchMainView('portfolio', 'portfolio');
      setTimeout(() => {
        $$('#portfolio-filter-pills .pill-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.filter === 'all'));
        cards.forEach((c) => {
          c.classList.remove('is-hidden');
          c.classList.toggle('is-dimmed', c.dataset.sys !== sysId);
        });
        if (hobbyDividerEl) hobbyDividerEl.hidden = false;
        const targetCard = cards.find((c) => c.dataset.sys === sysId);
        targetCard?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
        setTimeout(() => {
          cards.forEach((c) => c.classList.remove('is-dimmed'));
        }, 2400);
      }, 60);
    });
  });

  // ---------------------------------------------------------
  // 7. 履歷錨點導覽與 Scroll-Spy 成長階段追蹤
  // ---------------------------------------------------------
  const GROWTH_STAGE_META = {
    1: {
      railTitle: '奇蹟行動科技',
      color: '#fbbf24',
      glow: 'rgba(251, 191, 36, 0.55)',
      fps: 5.2,
      groundSpeed: 20,
      tags: ['Trello / Excel']
    },
    2: {
      railTitle: '移動資通',
      color: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.55)',
      fps: 6.8,
      groundSpeed: 34,
      tags: ['Kiwi TCMS']
    },
    3: {
      railTitle: '派駐 Chanel',
      color: '#818cf8',
      glow: 'rgba(129, 140, 248, 0.58)',
      fps: 9.0,
      groundSpeed: 56,
      tags: ['SFMC × LINE']
    },
    4: {
      railTitle: '怡誠水晶',
      color: '#34d399',
      glow: 'rgba(52, 211, 153, 0.55)',
      fps: 11.8,
      groundSpeed: 92,
      tags: ['數位轉型 SOP']
    },
    5: {
      railTitle: '口袋證券',
      color: '#22d3ee',
      glow: 'rgba(34, 211, 238, 0.65)',
      fps: 7.4,
      groundSpeed: 42,
      tags: ['AI × QA 工具']
    }
  };

  let activeGrowthStage = 5;
  let targetScrollProgress = 0.08;
  let currentScrollProgress = 0.08;
  let spriteFrameCursor = 0;
  let groundScrollPx = 0;
  let lastGrowthTimestamp = 0;

  function applyGrowthStageUI(stageNum, sectionId = '', mode = '') {
    const s = Math.min(5, Math.max(1, Number(stageNum) || 5));
    const resolvedMode = mode || 'track';
    if (s !== activeGrowthStage) {
      spriteFrameCursor = 0;
    }
    activeGrowthStage = s;
    const meta = GROWTH_STAGE_META[s];

    const bgStageEl = $('#growth-bg-stage');
    const anchorStageCard = $('#growth-stage-theater');
    if (bgStageEl) bgStageEl.dataset.activeStage = String(s);
    if (anchorStageCard) anchorStageCard.dataset.stage = String(s);

    const railCode = $('#rail-stage-code');
    const railTitle = $('#rail-stage-title');
    const progressFill = $('#growth-progress-fill');

    if (railCode) railCode.textContent = `階段 0${s} / 05`;
    if (railTitle) railTitle.textContent = meta.railTitle;
    if (progressFill) progressFill.style.width = `${s * 20}%`;

    if (resolvedMode !== 'showcase') {
      $$('.anchor-link').forEach((link) => {
        const target = link.dataset.anchorTarget;
        const matches = sectionId ? target === sectionId : Number(link.dataset.stage) === s;
        link.classList.toggle('is-active', matches);
      });

      $$('.timeline-stage-card').forEach((card) => {
        card.classList.toggle('is-in-view', Number(card.dataset.growthStage) === s);
      });
    }

    if (reducedMotion && activeMainView === 'resume') {
      drawGrowthBackground();
    }
  }

  function scrollToResumeAnchor(targetId, updateHash = true) {
    if (isEvolutionShowcasePlaying) {
      stopEvolutionShowcase(false);
    }
    const el = document.getElementById(targetId);
    if (!el) return;
    if (updateHash) {
      history.replaceState(null, '', `#${targetId}`);
    }
    el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    const stageAttr = el.dataset.growthStage;
    if (stageAttr) {
      applyGrowthStageUI(Number(stageAttr), targetId);
    }
  }

  $$('[data-anchor-target]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.dataset.anchorTarget;
      if (activeMainView !== 'resume') {
        switchMainView('resume', targetId);
      } else {
        scrollToResumeAnchor(targetId, true);
      }
    });
  });

  function updateResumeScrollSpy() {
    if (activeMainView !== 'resume' || isEvolutionShowcasePlaying) return;
    const sections = $$('[data-growth-stage]', resumeView);
    if (!sections.length) return;

    const pivotY = window.innerWidth <= 960
      ? Math.max(240, window.innerHeight * 0.42)
      : window.innerHeight * 0.36;
    let chosen = sections[0];
    let bestDist = Infinity;

    for (const sec of sections) {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= pivotY && rect.bottom >= pivotY * 0.5) {
        chosen = sec;
        bestDist = 0;
        break;
      }
      const dist = Math.abs(rect.top - pivotY);
      if (dist < bestDist) {
        bestDist = dist;
        chosen = sec;
      }
    }

    const docMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    targetScrollProgress = Math.min(1, Math.max(0, window.scrollY / docMax));

    const stageNum = Number(chosen.dataset.growthStage || 5);
    applyGrowthStageUI(stageNum, chosen.id);
  }

  window.addEventListener('scroll', () => {
    if (activeMainView !== 'resume') return;
    if (isEvolutionShowcasePlaying && window.scrollY > 18) {
      stopEvolutionShowcase(false);
    }
    updateResumeScrollSpy();
  }, { passive: true });

  // ---------------------------------------------------------
  // 8. 獨立無遮擋成長進化動畫舞台 (Stage 1 慢爬 → Stage 4 奔跑 → Stage 5 領航)
  //    + ChatGPT 8 格（4 欄 × 2 列）序列圖無縫播放引擎（真實時間基準，不隨螢幕更新率暴衝）
  // ---------------------------------------------------------
  const GROWTH_STAGE_ASSETS = {
    1: { src: './assets/growth/stage-01-baby.png?v=cyber16', cols: 4, rows: 2, frames: 8 },
    2: { src: './assets/growth/stage-02-teen.png?v=cyber14', cols: 4, rows: 2, frames: 8 },
    3: { src: './assets/growth/stage-03-youth.png?v=cyber14', cols: 4, rows: 2, frames: 8 },
    4: { src: './assets/growth/stage-04-builder.png?v=cyber16', cols: 4, rows: 2, frames: 8 },
    5: { src: './assets/growth/stage-05-master.png?v=cyber14', cols: 4, rows: 2, frames: 8 }
  };

  const loadedGrowthSprites = {};
  Object.entries(GROWTH_STAGE_ASSETS).forEach(([stageKey, cfg]) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        loadedGrowthSprites[stageKey] = {
          img,
          cols: cfg.cols || 4,
          rows: cfg.rows || 2,
          frames: cfg.frames || 8
        };
        if (reducedMotion && activeMainView === 'resume') {
          drawGrowthBackground();
        }
      }
    };
    img.onerror = () => {
      // 尚未放入外部序列圖時，自動使用內建全息走動角色動畫
    };
    img.src = cfg.src;
  });

  const growthCanvas = $('#growth-walker-canvas');
  const gCtx = growthCanvas?.getContext('2d');
  let theaterW = 0;
  let theaterH = 0;
  let walkPhase = 0;

  function initGrowthCanvas() {
    if (!growthCanvas || !gCtx) return;
    const w = growthCanvas.clientWidth || 0;
    const h = growthCanvas.clientHeight || 0;
    if (w <= 0 || h <= 0) return;
    theaterW = w;
    theaterH = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    growthCanvas.width = w * dpr;
    growthCanvas.height = h * dpr;
    gCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawLimb(ctx2d, x1, y1, x2, y2, width, color) {
    ctx2d.beginPath();
    ctx2d.moveTo(x1, y1);
    ctx2d.lineTo(x2, y2);
    ctx2d.lineWidth = width;
    ctx2d.lineCap = 'round';
    ctx2d.strokeStyle = color;
    ctx2d.stroke();
  }

  function drawCrawlingBaby(ctx2d, cx, groundY, phase, color, scaleFactor = 1) {
    const s = 0.95 * scaleFactor;
    const bob = Math.sin(phase * 2) * 3 * s;
    const hipX = cx - 22 * s;
    const hipY = groundY - 24 * s + bob;
    const shoulderX = cx + 16 * s;
    const shoulderY = groundY - 27 * s - bob * 0.7;

    // 軀幹（爬行俯身）
    drawLimb(ctx2d, hipX, hipY, shoulderX, shoulderY, 14 * s, color);

    // 嬰兒頭部（較圓潤比例 + 發光護目點）
    const headX = shoulderX + 15 * s;
    const headY = shoulderY - 12 * s;
    ctx2d.beginPath();
    ctx2d.arc(headX, headY, 15 * s, 0, Math.PI * 2);
    ctx2d.fillStyle = color;
    ctx2d.fill();

    ctx2d.fillStyle = '#040814';
    ctx2d.beginPath();
    ctx2d.arc(headX + 7 * s, headY - 2 * s, 2.8 * s, 0, Math.PI * 2);
    ctx2d.fill();

    // 雙手與雙膝交替爬行循環
    for (let side = 0; side < 2; side++) {
      const p = phase + side * Math.PI;
      const alpha = side === 0 ? 1 : 0.48;
      ctx2d.save();
      ctx2d.globalAlpha *= alpha;

      // 前手爬行
      const handX = shoulderX + (10 + Math.sin(p) * 14) * s;
      const handY = groundY - Math.max(0, -Math.cos(p)) * 9 * s;
      const elbowX = (shoulderX + handX) * 0.5 - 3 * s;
      const elbowY = (shoulderY + handY) * 0.5 + 2.5 * s;
      drawLimb(ctx2d, shoulderX, shoulderY, elbowX, elbowY, 6 * s, color);
      drawLimb(ctx2d, elbowX, elbowY, handX, handY, 5.2 * s, color);

      // 後腳跪爬
      const kneeX = hipX - (4 + Math.sin(p) * 12) * s;
      const kneeY = groundY - Math.max(0, Math.cos(p)) * 7 * s;
      const footX = kneeX - 12 * s;
      const footY = groundY - 1.5 * s;
      drawLimb(ctx2d, hipX, hipY, kneeX, kneeY, 7 * s, color);
      drawLimb(ctx2d, kneeX, kneeY, footX, footY, 5.2 * s, color);
      ctx2d.restore();
    }
  }

  function drawWalkingCharacter(ctx2d, cx, groundY, phase, stage, color, scaleFactor = 1) {
    const configs = {
      2: { scale: 0.62, strideAmp: 0.56, lean: 0.08, bobAmp: 3.5, hasScarf: false, hasCape: false, hasCrown: false },
      3: { scale: 0.72, strideAmp: 0.68, lean: 0.11, bobAmp: 4.5, hasScarf: true, hasCape: false, hasCrown: false },
      4: { scale: 0.80, strideAmp: 0.88, lean: 0.2, bobAmp: 6, hasScarf: true, hasCape: false, hasCrown: false },
      5: { scale: 0.88, strideAmp: 0.64, lean: 0.05, bobAmp: 3.5, hasScarf: false, hasCape: true, hasCrown: true }
    };
    const cfg = configs[stage] || configs[5];
    const s = cfg.scale * scaleFactor;
    const bounce = Math.abs(Math.sin(phase)) * cfg.bobAmp * s;

    const legLen = 56 * s;
    const torsoLen = 46 * s;
    const armLen = 44 * s;

    const hipX = cx;
    const hipY = groundY - legLen + bounce * 0.35;
    const shoulderX = hipX + Math.sin(cfg.lean) * torsoLen;
    const shoulderY = hipY - Math.cos(cfg.lean) * torsoLen;
    const headX = shoulderX + Math.sin(cfg.lean) * 15 * s;
    const headY = shoulderY - 19 * s;

    // 成熟領航期全息長大衣 / 青年飄逸數據圍巾
    if (cfg.hasCape) {
      ctx2d.save();
      ctx2d.globalAlpha *= 0.38;
      ctx2d.beginPath();
      ctx2d.moveTo(shoulderX - 6 * s, shoulderY + 4 * s);
      const wave = Math.sin(phase * 1.3) * 11 * s;
      ctx2d.quadraticCurveTo(hipX - 38 * s, hipY + 9 * s, hipX - 52 * s + wave, groundY - 16 * s);
      ctx2d.lineTo(hipX - 9 * s, hipY + 11 * s);
      ctx2d.closePath();
      ctx2d.fillStyle = color;
      ctx2d.fill();
      ctx2d.restore();
    }
    if (cfg.hasScarf) {
      ctx2d.save();
      ctx2d.globalAlpha *= 0.7;
      const tailX = shoulderX - 34 * s;
      const tailY = shoulderY + 6 * s + Math.sin(phase * 1.7) * 8 * s;
      drawLimb(ctx2d, shoulderX, shoulderY, tailX, tailY, 6.5 * s, color);
      ctx2d.restore();
    }

    // 遠側手腳
    drawSideLimbs(ctx2d, hipX, hipY, shoulderX, shoulderY, legLen, armLen, phase + Math.PI, cfg.strideAmp, s, color, 0.42);

    // 軀幹
    drawLimb(ctx2d, hipX, hipY, shoulderX, shoulderY, 14 * s, color);

    // 頭部與全息護目鏡
    ctx2d.beginPath();
    ctx2d.arc(headX, headY, 14 * s, 0, Math.PI * 2);
    ctx2d.fillStyle = color;
    ctx2d.fill();

    ctx2d.fillStyle = '#040814';
    ctx2d.fillRect(headX + 2 * s, headY - 4 * s, 11.5 * s, 4.8 * s);
    ctx2d.fillStyle = '#ecfeff';
    ctx2d.fillRect(headX + 5 * s, headY - 3 * s, 7.5 * s, 2.4 * s);

    if (cfg.hasCrown) {
      ctx2d.save();
      ctx2d.strokeStyle = '#fde68a';
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      ctx2d.ellipse(headX, headY - 20 * s, 13 * s, 3.8 * s, -0.08, 0, Math.PI * 2);
      ctx2d.stroke();
      ctx2d.restore();
    }

    // 近側手腳
    drawSideLimbs(ctx2d, hipX, hipY, shoulderX, shoulderY, legLen, armLen, phase, cfg.strideAmp, s, color, 1);

    // Stage 5 四大核心系統環繞節點
    if (stage === 5) {
      const orbitT = phase * 0.35;
      for (let i = 0; i < 4; i++) {
        const ang = orbitT + (i * Math.PI) / 2;
        const ox = cx + Math.cos(ang) * 64 * scaleFactor;
        const oy = (shoulderY + hipY) * 0.5 + Math.sin(ang) * 20 * scaleFactor;
        ctx2d.save();
        ctx2d.fillStyle = '#a5f3fc';
        ctx2d.strokeStyle = color;
        ctx2d.lineWidth = 1.5;
        ctx2d.beginPath();
        ctx2d.arc(ox, oy, 4.2 * scaleFactor, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.stroke();
        ctx2d.restore();
      }
    }
  }

  function drawSideLimbs(ctx2d, hipX, hipY, shoulderX, shoulderY, legLen, armLen, p, amp, s, color, alphaMult) {
    ctx2d.save();
    ctx2d.globalAlpha *= alphaMult;

    const thighAngle = Math.sin(p) * amp;
    const kneeBend = Math.max(0, -Math.cos(p)) * 0.72 + 0.14;
    const kneeX = hipX + Math.sin(thighAngle) * (legLen * 0.52);
    const kneeY = hipY + Math.cos(thighAngle) * (legLen * 0.52);
    const shinAngle = thighAngle - kneeBend;
    const footX = kneeX + Math.sin(shinAngle) * (legLen * 0.5);
    const footY = kneeY + Math.cos(shinAngle) * (legLen * 0.5);

    drawLimb(ctx2d, hipX, hipY, kneeX, kneeY, 9 * s, color);
    drawLimb(ctx2d, kneeX, kneeY, footX, footY, 7 * s, color);

    const upperArmAngle = -Math.sin(p) * (amp * 0.78);
    const elbowBend = Math.max(0.25, Math.cos(p) * 0.5 + 0.45);
    const elbowX = shoulderX + Math.sin(upperArmAngle) * (armLen * 0.5);
    const elbowY = shoulderY + Math.cos(upperArmAngle) * (armLen * 0.5);
    const forearmAngle = upperArmAngle + elbowBend;
    const handX = elbowX + Math.sin(forearmAngle) * (armLen * 0.48);
    const handY = elbowY + Math.cos(forearmAngle) * (armLen * 0.48);

    drawLimb(ctx2d, shoulderX, shoulderY, elbowX, elbowY, 7 * s, color);
    drawLimb(ctx2d, elbowX, elbowY, handX, handY, 5.5 * s, color);

    ctx2d.restore();
  }

  function drawGrowthBackground(timestamp = performance.now()) {
    const dt = lastGrowthTimestamp > 0
      ? Math.min(0.05, Math.max(0, (timestamp - lastGrowthTimestamp) / 1000))
      : 1 / 60;
    lastGrowthTimestamp = timestamp;

    if (activeMainView === 'resume' && growthCanvas && gCtx) {
      const cw = growthCanvas.clientWidth || 0;
      const ch = growthCanvas.clientHeight || 0;
      if (cw > 0 && ch > 0 && (cw !== theaterW || ch !== theaterH)) {
        initGrowthCanvas();
      }
      const w = theaterW;
      const h = theaterH;

      if (w > 0 && h > 0) {
        const meta = GROWTH_STAGE_META[activeGrowthStage] || GROWTH_STAGE_META[5];
        const theaterScale = Math.min(1, Math.max(0.62, h / 190));

        currentScrollProgress += (targetScrollProgress - currentScrollProgress) * 0.1;
        if (!reducedMotion) {
          const stageFps = meta.fps || 7.4;
          const groundSpeed = meta.groundSpeed || 42;
          spriteFrameCursor = (spriteFrameCursor + dt * stageFps) % 8;
          groundScrollPx = (groundScrollPx + dt * groundSpeed) % 26;
          walkPhase += dt * (stageFps * 0.45);
        }

        gCtx.clearRect(0, 0, w, h);

        const groundY = Math.round(h - 26);
        const charX = Math.round(w * 0.5);

        // 1. 舞台專屬微光背景
        const aura = gCtx.createRadialGradient(charX, groundY - 46 * theaterScale, 12, charX, groundY - 46 * theaterScale, Math.max(120, w * 0.52));
        aura.addColorStop(0, meta.glow);
        aura.addColorStop(0.55, 'rgba(14, 165, 233, 0.14)');
        aura.addColorStop(1, 'rgba(3, 8, 20, 0)');
        gCtx.fillStyle = aura;
        gCtx.fillRect(0, 0, w, h);

        // 2. 動態向前推進地面線（依各階段步態配速，不隨頁面捲動暴衝）
        gCtx.save();
        gCtx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        gCtx.lineWidth = 1.5;
        gCtx.beginPath();
        gCtx.moveTo(14, groundY);
        gCtx.lineTo(w - 14, groundY);
        gCtx.stroke();

        const stepSpacing = 26;
        const offset = groundScrollPx % stepSpacing;
        gCtx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        gCtx.lineWidth = 1;
        for (let gx = 14 - offset; gx <= w - 14; gx += stepSpacing) {
          if (gx < 14) continue;
          gCtx.beginPath();
          gCtx.moveTo(gx, groundY);
          gCtx.lineTo(gx - 10, groundY + 11);
          gCtx.stroke();
        }
        gCtx.restore();

        // 3. 角色本體：使用 ChatGPT 8 格（4 欄 × 2 列）序列圖；尚未載入則使用內建全息角色
        const spriteAsset = loadedGrowthSprites[String(activeGrowthStage)];
        gCtx.save();

        if (spriteAsset && spriteAsset.img.complete && spriteAsset.img.naturalWidth > 0) {
          gCtx.shadowBlur = 0;
          const cols = spriteAsset.cols || 4;
          const rows = spriteAsset.rows || 2;
          const frames = spriteAsset.frames || (cols * rows);
          const frameIdx = Math.floor(spriteFrameCursor) % frames;
          const col = frameIdx % cols;
          const row = Math.floor(frameIdx / cols);
          const fw = spriteAsset.img.naturalWidth / cols;
          const fh = spriteAsset.img.naturalHeight / rows;
          const targetH = Math.round(groundY - 12);
          const targetW = (fw / fh) * targetH;
          gCtx.drawImage(
            spriteAsset.img,
            col * fw, row * fh, fw, fh,
            charX - targetW / 2, groundY - targetH + 1, targetW, targetH
          );
        } else {
          gCtx.shadowColor = meta.color;
          gCtx.shadowBlur = 16;
          if (activeGrowthStage === 1) {
            drawCrawlingBaby(gCtx, charX, groundY, walkPhase, meta.color, theaterScale);
          } else {
            drawWalkingCharacter(gCtx, charX, groundY, walkPhase, activeGrowthStage, meta.color, theaterScale);
          }
        }
        gCtx.restore();

        // 4. 腳底全息光影 & 底部 5 階段里程碑進度軌
        gCtx.save();
        gCtx.fillStyle = meta.glow;
        gCtx.beginPath();
        gCtx.ellipse(charX, groundY + 2, 28 * theaterScale, 4.5 * theaterScale, 0, 0, Math.PI * 2);
        gCtx.fill();

        const trackLeft = 24;
        const trackRight = w - 24;
        const trackY = h - 11;
        const progressX = trackLeft + (trackRight - trackLeft) * ((activeGrowthStage - 1) / 4);

        gCtx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
        gCtx.lineWidth = 2;
        gCtx.beginPath();
        gCtx.moveTo(trackLeft, trackY);
        gCtx.lineTo(trackRight, trackY);
        gCtx.stroke();

        gCtx.strokeStyle = meta.color;
        gCtx.lineWidth = 2.5;
        gCtx.beginPath();
        gCtx.moveTo(trackLeft, trackY);
        gCtx.lineTo(progressX, trackY);
        gCtx.stroke();

        for (let i = 1; i <= 5; i++) {
          const bx = trackLeft + ((trackRight - trackLeft) * (i - 1)) / 4;
          const passed = i <= activeGrowthStage;
          gCtx.beginPath();
          gCtx.arc(bx, trackY, i === activeGrowthStage ? 5 : 3.2, 0, Math.PI * 2);
          gCtx.fillStyle = passed ? meta.color : 'rgba(148, 163, 184, 0.35)';
          gCtx.fill();
        }

        gCtx.restore();
      }
    }

    if (!reducedMotion) {
      requestAnimationFrame(drawGrowthBackground);
    }
  }

  window.addEventListener('resize', () => {
    if (activeMainView === 'resume') {
      initGrowthCanvas();
      if (reducedMotion) drawGrowthBackground();
    }
  });

  // 依據網址 Hash 初始化頁面視圖
  function syncFromLocationHash() {
    const rawHash = window.location.hash.replace(/^#/, '');
    if (RESUME_HASH_IDS.has(rawHash)) {
      switchMainView('resume', rawHash, false);
    } else {
      switchMainView('portfolio', '', false);
    }
  }

  initGrowthCanvas();
  syncFromLocationHash();
  drawGrowthBackground();
  window.addEventListener('hashchange', syncFromLocationHash);
})();

