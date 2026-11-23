(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const state = {
    running: true,
    target: 'apex',
    mode: 'hybrid',
    maskPreset: 1,
    feather: 'standard',
    refEnabled: true,
    refLayout: 'cross',
    refTip: 0,
    refStrength: 50,
    centerEnabled: true,
    centerStyle: 'circle',
    cornersEnabled: false,
    camX: 0,
    camY: 0,
    targetCamX: 0,
    targetCamY: 0,
    drive: 0.34,
    confidence: 0.96,
    autoSim: null,
    time: 0,
    hudZones: [
      { id: 'minimap', name: '左上角小地圖 (Minimap)', x: 0.025, y: 0.04, w: 0.16, h: 0.23, enabled: true },
      { id: 'killfeed', name: '右上角擊殺資訊 (Killfeed)', x: 0.74, y: 0.04, w: 0.235, h: 0.15, enabled: true },
      { id: 'hp', name: '左下角血量／護甲條', x: 0.025, y: 0.77, w: 0.24, h: 0.17, enabled: true },
      { id: 'ammo', name: '右下角彈藥與技能欄', x: 0.74, y: 0.77, w: 0.235, h: 0.17, enabled: false }
    ]
  };

  const MASK_PRESETS = {
    1: { name: '低', fixedClear: 0.86, dynClear: 0.86, restClear: 0.96, opacity: 0.55 },
    2: { name: '中', fixedClear: 0.78, dynClear: 0.82, restClear: 0.96, opacity: 0.75 },
    3: { name: '高', fixedClear: 0.68, dynClear: 0.72, restClear: 0.96, opacity: 0.85 }
  };

  const TIP_OPTIONS = {
    cross: ['尖頭 Flag', '圓頭 Dome', '平頭 Box'],
    edge: ['尖頭 Flag', '圓頭 Dome', '平頭 Box'],
    spike: ['尖形 Sharp', '圓形 Round', '漸尖 Taper'],
    none: ['無佈局圖形']
  };

  const canvas = $('#still-preview-canvas');
  const ctx = canvas.getContext('2d');

  function syncTipSelect() {
    const sel = $('#ref-tip');
    const opts = TIP_OPTIONS[state.refLayout] || TIP_OPTIONS.cross;
    const prev = Math.min(state.refTip, opts.length - 1);
    sel.innerHTML = '';
    opts.forEach((label, idx) => {
      const o = document.createElement('option');
      o.value = String(idx);
      o.textContent = label;
      if (idx === prev) o.selected = true;
      sel.appendChild(o);
    });
    sel.disabled = state.refLayout === 'none';
  }

  function syncUI() {
    $$('[data-mask-preset]').forEach((b) => {
      b.classList.toggle('is-active', Number(b.dataset.maskPreset) === state.maskPreset);
    });
    $$('[data-ref-layout]').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.refLayout === state.refLayout);
    });
    $$('[data-ref-strength]').forEach((b) => {
      b.classList.toggle('is-active', Number(b.dataset.refStrength) === state.refStrength);
    });

    const p = MASK_PRESETS[state.maskPreset];
    $('#mask-hint').textContent = state.mode === 'fixed'
      ? `固定舒適：中央透明 ${Math.round(p.fixedClear * 100)}% · 外緣不透明度 ${Math.round(p.opacity * 100)}%`
      : `動態靜止 ${Math.round(p.restClear * 100)}% → 峰值 ${Math.round(p.dynClear * 100)}% · 邊緣不透明度 ${Math.round(p.opacity * 100)}%（保留 ≧65%×65%）`;

    $('#ref-slider').value = String(state.refStrength);
    $('#ref-slider-val').textContent = String(state.refStrength);
    $('#center-style').disabled = !state.centerEnabled;

    const statusEl = $('#engine-status');
    const toggleBtn = $('#toggle-engine-btn');
    if (state.running) {
      const modeName = state.mode === 'fixed' ? '固定舒適' : state.mode === 'visual' ? '畫面偵測 60fps' : '自適應・畫面＋輸入';
      statusEl.textContent = `運行中 · ${modeName}（自擷取排除通過）`;
      statusEl.classList.remove('is-stopped');
      toggleBtn.textContent = '暫停';
    } else {
      statusEl.textContent = '已停止 · 遮罩與定點已安全撤回';
      statusEl.classList.add('is-stopped');
      toggleBtn.textContent = '開始';
    }
  }

  function buildHudZoneToggles() {
    const root = $('#hud-zone-toggles');
    root.innerHTML = '';
    state.hudZones.forEach((zone) => {
      const label = document.createElement('label');
      label.className = 'zone-chip';
      const span = document.createElement('span');
      span.textContent = zone.name;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = zone.enabled;
      cb.addEventListener('change', () => {
        zone.enabled = cb.checked;
      });
      label.append(span, cb);
      root.appendChild(label);
    });
  }

  function updateDiagnosticsText() {
    const p = MASK_PRESETS[state.maskPreset];
    const clearPct = state.mode === 'fixed'
      ? p.fixedClear
      : p.restClear - (p.restClear - p.dynClear) * state.drive;
    $('#diag-log').textContent = [
      `TargetWindow : ${$('#target-select').selectedOptions[0].textContent}`,
      `EngineMode   : ${state.mode} (CaptureExclude=OK, NoHook=OK)`,
      `AnalysisRate : 60.0 fps | Confidence: ${Math.round(state.confidence * 100)}%`,
      `MotionDrive  : ${Math.round(state.drive * 100)}% | ClearRect: ${Math.round(clearPct * 100)}% x ${Math.round(clearPct * 100)}%`,
      `FixedRef     : enabled=${state.refEnabled}, layout=${state.refLayout}, strength=${state.refStrength}`,
      `HUDProtect   : ${state.hudZones.filter((z) => z.enabled).length} / 6 active regions`
    ].join('\n');
  }

  function drawScene3D(w, h) {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.56);
    sky.addColorStop(0, '#101d2c');
    sky.addColorStop(1, '#1d3142');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.56);

    const floor = ctx.createLinearGradient(0, h * 0.54, 0, h);
    floor.addColorStop(0, '#18242e');
    floor.addColorStop(1, '#0b1218');
    ctx.fillStyle = floor;
    ctx.fillRect(0, h * 0.54, w, h * 0.46);

    const vx = w * 0.5 - state.camX * 220;
    const vy = h * 0.52 - state.camY * 120;

    // 3D perspective corridor grid to demonstrate camera motion & optical flow
    ctx.save();
    ctx.strokeStyle = 'rgba(130, 175, 200, 0.25)';
    ctx.lineWidth = 1.2;
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(vx + i * 16, vy);
      ctx.lineTo(w * 0.5 + i * 140, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(vx + i * 16, vy);
      ctx.lineTo(w * 0.5 + i * 140, 0);
      ctx.stroke();
    }

    const pulse = (state.time * 0.7) % 1;
    for (let d = 0; d < 5; d++) {
      const t = ((d + pulse) / 5);
      const scale = Math.pow(t, 1.7);
      const rw = w * (0.08 + scale * 0.92);
      const rh = h * (0.06 + scale * 0.88);
      ctx.strokeStyle = `rgba(166, 232, 203, ${0.08 + scale * 0.2})`;
      ctx.strokeRect(vx - rw / 2, vy - rh / 2, rw, rh);
    }

    // Moving target silhouette in 3D space
    const tx = vx + Math.sin(state.time * 1.4) * 140;
    const ty = vy + 24;
    ctx.fillStyle = 'rgba(226, 109, 122, 0.82)';
    ctx.beginPath();
    ctx.arc(tx, ty - 28, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(tx - 14, ty - 14, 28, 44);
    ctx.restore();

    // Simulated In-Game HUD elements
    ctx.save();
    state.hudZones.forEach((z) => {
      const rx = z.x * w;
      const ry = z.y * h;
      const rw = z.w * w;
      const rh = z.h * h;
      ctx.fillStyle = 'rgba(12, 18, 25, 0.72)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = z.enabled ? 'rgba(166, 232, 203, 0.7)' : 'rgba(164, 180, 190, 0.35)';
      ctx.lineWidth = z.enabled ? 1.8 : 1;
      ctx.strokeRect(rx, ry, rw, rh);

      ctx.fillStyle = z.enabled ? '#a6e8cb' : '#8fa2af';
      ctx.font = '700 12px "Microsoft JhengHei UI", sans-serif';
      const label = z.id === 'minimap' ? 'HUD · 小地圖' : z.id === 'killfeed' ? 'HUD · 戰況欄' : z.id === 'hp' ? 'HP 100 / SHIELD 75' : 'AMMO 28 / 140';
      ctx.fillText(label, rx + 10, ry + 22);
      if (z.enabled) {
        ctx.font = '600 11px ui-monospace, monospace';
        ctx.fillText('PROTECTED ZONE', rx + 10, ry + rh - 10);
      }
    });
    ctx.restore();
  }

  function drawComfortMask(w, h) {
    if (!state.running) return;
    const p = MASK_PRESETS[state.maskPreset];
    const clearRatio = state.mode === 'fixed'
      ? p.fixedClear
      : p.restClear - (p.restClear - p.dynClear) * state.drive;

    const safeRatio = Math.max(0.65, clearRatio);
    const cw = w * safeRatio;
    const ch = h * safeRatio;
    const cx = (w - cw) / 2;
    const cy = (h - ch) / 2;
    const featherMult = state.feather === 'soft' ? 1.35 : state.feather === 'crisp' ? 0.65 : 1;
    const alpha = state.mode === 'fixed'
      ? p.opacity
      : p.opacity * (0.28 + 0.72 * state.drive);

    if (alpha <= 0.02) return;

    ctx.save();
    // Create offscreen mask effect via 4 feathered edge gradients around center clear rectangle
    ctx.fillStyle = `rgba(5, 8, 12, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.rect(cx, cy, cw, ch);
    // Exclude active HUD protect zones from mask occlusion
    state.hudZones.filter((z) => z.enabled).forEach((z) => {
      ctx.rect(z.x * w, z.y * h, z.w * w, z.h * h);
    });
    ctx.fill('evenodd');

    // Subtle mint indicator of inner safe boundary (>= 65%)
    ctx.strokeStyle = `rgba(166, 232, 203, ${(0.18 * featherMult).toFixed(2)})`;
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1;
    ctx.strokeRect(cx, cy, cw, ch);
    ctx.restore();
  }

  function drawFixedReference(w, h) {
    if (!state.running || !state.refEnabled) return;
    const s = state.refStrength / 100;
    const cx = w / 2;
    const cy = h / 2;

    ctx.save();
    ctx.strokeStyle = 'rgba(166, 232, 203, 0.88)';
    ctx.fillStyle = 'rgba(166, 232, 203, 0.88)';
    ctx.lineWidth = 2 + s * 2.5;
    ctx.lineCap = state.refTip === 1 ? 'round' : 'butt';

    if (s > 0 && state.refLayout === 'cross') {
      const outer = (h * 0.42) * (0.35 + s * 0.65);
      const innerGap = Math.max(24, h * (0.14 - s * 0.08));
      const arms = [
        [cx, Math.max(8, cy - outer), cx, cy - innerGap],
        [cx, Math.min(h - 8, cy + outer), cx, cy + innerGap],
        [Math.max(8, cx - outer * 1.4), cy, cx - innerGap * 1.3, cy],
        [Math.min(w - 8, cx + outer * 1.4), cy, cx + innerGap * 1.3, cy]
      ];
      arms.forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });
    } else if (s > 0 && state.refLayout === 'edge') {
      const margin = Math.max(10, (1 - s) * 76 + 10);
      const seg = Math.min(w * 0.42, 48 + s * 390);
      const corners = [
        [margin, margin, 1, 1],
        [w - margin, margin, -1, 1],
        [margin, h - margin, 1, -1],
        [w - margin, h - margin, -1, -1]
      ];
      corners.forEach(([x, y, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(x + dx * seg, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + dy * (seg * 0.58));
        ctx.stroke();
      });
    } else if (s > 0 && state.refLayout === 'spike') {
      const m = 24;
      const len = 36 + s * 110;
      const diags = [
        [m, m, m + len * 1.2, m + len * 0.7],
        [w - m, m, w - m - len * 1.2, m + len * 0.7],
        [m, h - m, m + len * 1.2, h - m - len * 0.7],
        [w - m, h - m, w - m - len * 1.2, h - m - len * 0.7]
      ];
      diags.forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });
    }

    if (state.cornersEnabled) {
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(234, 240, 242, 0.72)';
      const m = 14;
      const L = 24;
      [
        [m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]
      ].forEach(([x, y, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(x + dx * L, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + dy * L);
        ctx.stroke();
      });
      ctx.restore();
    }

    if (state.centerEnabled) {
      ctx.save();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(166, 232, 203, 0.92)';
      if (state.centerStyle === 'circle') {
        ctx.beginPath();
        ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        ctx.stroke();
      } else if (state.centerStyle === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 12);
        ctx.lineTo(cx + 12, cy);
        ctx.lineTo(cx, cy + 12);
        ctx.lineTo(cx - 12, cy);
        ctx.closePath();
        ctx.stroke();
      } else if (state.centerStyle === 'x') {
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - 10); ctx.lineTo(cx - 4, cy - 4);
        ctx.moveTo(cx + 10, cy - 10); ctx.lineTo(cx + 4, cy - 4);
        ctx.moveTo(cx - 10, cy + 10); ctx.lineTo(cx - 4, cy + 4);
        ctx.moveTo(cx + 10, cy + 10); ctx.lineTo(cx + 4, cy + 4);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy - 4);
        ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 12);
        ctx.moveTo(cx - 12, cy); ctx.lineTo(cx - 4, cy);
        ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 12, cy);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  let lastFrame = performance.now();
  function renderLoop(now = performance.now()) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;
    state.time += dt;

    if (state.autoSim === 'turn') {
      state.targetCamX = Math.sin(state.time * 5.2) * 0.52;
      state.targetCamY = Math.cos(state.time * 2.4) * 0.14;
    } else if (state.autoSim === 'strafe') {
      state.targetCamX = Math.sin(state.time * 3.1) * 0.36;
      state.targetCamY = Math.sin(state.time * 4.4) * 0.28;
    }

    const prevX = state.camX;
    const prevY = state.camY;
    state.camX += (state.targetCamX - state.camX) * 0.14;
    state.camY += (state.targetCamY - state.camY) * 0.14;

    const speed = Math.hypot(state.camX - prevX, state.camY - prevY) / dt;
    const targetDrive = state.mode === 'fixed' ? 0 : Math.min(1, speed * 0.62);
    state.drive += (targetDrive - state.drive) * 0.12;
    state.confidence = state.mode === 'fixed' ? 1 : Math.max(0.84, 0.98 - state.drive * 0.08);

    const w = canvas.width;
    const h = canvas.height;
    drawScene3D(w, h);
    drawComfortMask(w, h);
    drawFixedReference(w, h);

    $('#tele-drive').textContent = `Drive：${Math.round(state.drive * 100)}%`;
    $('#tele-conf').textContent = `光流可信度：${Math.round(state.confidence * 100)}%`;
    if ($('#advanced-dialog').open) {
      updateDiagnosticsText();
    }

    requestAnimationFrame(renderLoop);
  }

  canvas.addEventListener('pointermove', (e) => {
    state.autoSim = null;
    const rect = canvas.getBoundingClientRect();
    state.targetCamX = ((e.clientX - rect.left) / rect.width - 0.5) * 0.9;
    state.targetCamY = ((e.clientY - rect.top) / rect.height - 0.5) * 0.6;
  });
  canvas.addEventListener('pointerleave', () => {
    if (!state.autoSim) {
      state.targetCamX = 0;
      state.targetCamY = 0;
    }
  });

  $('#mode-select').addEventListener('change', (e) => {
    state.mode = e.target.value;
    syncUI();
  });
  $('#target-select').addEventListener('change', () => updateDiagnosticsText());

  $$('[data-mask-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.maskPreset = Number(btn.dataset.maskPreset);
      syncUI();
    });
  });

  $('#ref-enabled').addEventListener('change', (e) => {
    state.refEnabled = e.target.checked;
    syncUI();
  });
  $$('[data-ref-layout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.refLayout = btn.dataset.refLayout;
      syncTipSelect();
      syncUI();
    });
  });
  $('#ref-tip').addEventListener('change', (e) => {
    state.refTip = Number(e.target.value);
  });
  $$('[data-ref-strength]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.refStrength = Number(btn.dataset.refStrength);
      syncUI();
    });
  });
  $('#ref-slider').addEventListener('input', (e) => {
    state.refStrength = Number(e.target.value);
    syncUI();
  });
  $('#center-enabled').addEventListener('change', (e) => {
    state.centerEnabled = e.target.checked;
    syncUI();
  });
  $('#center-style').addEventListener('change', (e) => {
    state.centerStyle = e.target.value;
  });
  $('#corners-enabled').addEventListener('change', (e) => {
    state.cornersEnabled = e.target.checked;
  });

  $('#toggle-engine-btn').addEventListener('click', () => {
    state.running = !state.running;
    syncUI();
  });
  $('#stop-engine-btn').addEventListener('click', () => {
    state.running = false;
    state.autoSim = null;
    syncUI();
  });

  $('#sim-turn-btn').addEventListener('click', () => {
    state.running = true;
    state.autoSim = state.autoSim === 'turn' ? null : 'turn';
    syncUI();
  });
  $('#sim-strafe-btn').addEventListener('click', () => {
    state.running = true;
    state.autoSim = state.autoSim === 'strafe' ? null : 'strafe';
    syncUI();
  });
  $('#reset-demo-btn').addEventListener('click', () => {
    Object.assign(state, {
      running: true, mode: 'hybrid', maskPreset: 1, feather: 'standard',
      refEnabled: true, refLayout: 'cross', refTip: 0, refStrength: 50,
      centerEnabled: true, centerStyle: 'circle', cornersEnabled: false,
      autoSim: null, targetCamX: 0, targetCamY: 0
    });
    $('#mode-select').value = 'hybrid';
    $('#ref-enabled').checked = true;
    $('#center-enabled').checked = true;
    $('#center-style').value = 'circle';
    $('#corners-enabled').checked = false;
    syncTipSelect();
    syncUI();
  });

  // Advanced dialog
  const advDialog = $('#advanced-dialog');
  $('#open-advanced-btn').addEventListener('click', () => {
    updateDiagnosticsText();
    advDialog.showModal();
  });
  $('#close-advanced-btn').addEventListener('click', () => advDialog.close());
  $$('[data-dtab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const k = tab.dataset.dtab;
      $$('[data-dtab]').forEach((t) => t.classList.toggle('is-active', t === tab));
      $$('[data-dpanel]').forEach((p) => {
        p.hidden = p.dataset.dpanel !== k;
      });
    });
  });
  $('#feather-select').addEventListener('change', (e) => {
    state.feather = e.target.value;
  });

  syncTipSelect();
  buildHudZoneToggles();
  syncUI();
  requestAnimationFrame(renderLoop);
})();
