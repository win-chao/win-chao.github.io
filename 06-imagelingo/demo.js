(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const ITEMS = [
    {
      id: 'esim_settings',
      filename: '01_eSIM_行動數據設定.png',
      subtitle: '1350 × 1350 · 雙語 UI 同層級字級校準範例',
      regions: [
        { id: 'r1', checked: false, kind: 'header', x: 138, y: 54, w: 184, h: 32, srcSize: 18, cjkSize: 18, src: 'Settings', tr: { 'zh-TW': '設定', 'ja-JP': '設定', 'es-ES': 'Configuración', 'ko-KR': '설정' } },
        { id: 'r2', checked: true, kind: 'row', x: 56, y: 126, w: 220, h: 28, srcSize: 19, cjkSize: 15, src: 'Cellular Data', tr: { 'zh-TW': '行動數據', 'ja-JP': 'モバイルデータ通信', 'es-ES': 'Datos celulares', 'ko-KR': '셀룰러 데이터' } },
        { id: 'r3', checked: true, kind: 'title', x: 56, y: 176, w: 260, h: 30, srcSize: 21, cjkSize: 16, src: 'Enable Mobile Data', tr: { 'zh-TW': '啟用行動數據', 'ja-JP': 'モバイルデータを有効にする', 'es-ES': 'Activar datos móviles', 'ko-KR': '모바일 데이터 활성화' } },
        { id: 'r4', checked: true, kind: 'row', x: 56, y: 226, w: 256, h: 28, srcSize: 20, cjkSize: 15, src: 'Cellular Data Options', tr: { 'zh-TW': '行動數據選項', 'ja-JP': 'データ通信のオプション', 'es-ES': 'Opciones de datos celulares', 'ko-KR': '셀룰러 데이터 옵션' } },
        { id: 'r5', checked: false, kind: 'badge', x: 344, y: 228, w: 62, h: 24, srcSize: 13, cjkSize: 13, src: '5G Auto', tr: { 'zh-TW': '5G 自動', 'ja-JP': '5G オート', 'es-ES': '5G automático', 'ko-KR': '5G 자동' } },
        { id: 'r6', checked: true, kind: 'row', x: 56, y: 280, w: 210, h: 28, srcSize: 19, cjkSize: 15, src: 'Data Roaming', tr: { 'zh-TW': '數據漫遊', 'ja-JP': 'データローミング', 'es-ES': 'Roaming de datos', 'ko-KR': '데이터 로밍' } },
        { id: 'r7', checked: true, kind: 'caption', x: 56, y: 330, w: 344, h: 48, srcSize: 13, cjkSize: 12, src: 'Turn off Data Roaming to avoid overseas carrier charges.', tr: { 'zh-TW': '關閉數據漫遊可避免產生額外國際漫遊費用。', 'ja-JP': '海外でのローミング料金を防ぐためオフにできます。', 'es-ES': 'Desactiva el roaming para evitar cargos en el extranjero.', 'ko-KR': '해외 로밍 요금을 방지하려면 꺼 두세요.' } },
        { id: 'r8', checked: false, kind: 'row', x: 56, y: 404, w: 184, h: 26, srcSize: 15, cjkSize: 14, src: 'eSIM Profile · TW-01', tr: { 'zh-TW': 'eSIM 描述檔 · TW-01', 'ja-JP': 'eSIM プロファイル · TW-01', 'es-ES': 'Perfil eSIM · TW-01', 'ko-KR': 'eSIM 프로필 · TW-01' } }
      ]
    },
    {
      id: 'roaming_plan',
      filename: '02_跨國漫遊方案說明.png',
      subtitle: '1280 × 1280 · 產品方案卡片與保留專有名詞範例',
      regions: [
        { id: 'p1', checked: true, kind: 'header', x: 64, y: 66, w: 270, h: 32, srcSize: 20, cjkSize: 18, src: 'Global Travel eSIM', tr: { 'zh-TW': '全球旅遊 eSIM 方案', 'ja-JP': 'グローバル旅行 eSIM プラン', 'es-ES': 'Plan eSIM de Viaje Global', 'ko-KR': '글로벌 여행 eSIM 요금제' } },
        { id: 'p2', checked: false, kind: 'badge', x: 340, y: 68, w: 68, h: 26, srcSize: 13, cjkSize: 13, src: '30 Days', tr: { 'zh-TW': '30 天', 'ja-JP': '30 日間', 'es-ES': '30 Días', 'ko-KR': '30일' } },
        { id: 'p3', checked: true, kind: 'row', x: 64, y: 142, w: 264, h: 28, srcSize: 18, cjkSize: 15, src: 'High-Speed 20 GB', tr: { 'zh-TW': '高速上網 20 GB', 'ja-JP': '高速データ 20 GB', 'es-ES': '20 GB Alta Velocidad', 'ko-KR': '고속 데이터 20 GB' } },
        { id: 'p4', checked: true, kind: 'row', x: 64, y: 196, w: 290, h: 28, srcSize: 18, cjkSize: 15, src: 'Instant QR Activation', tr: { 'zh-TW': '掃碼立即啟用', 'ja-JP': 'QRコードで即時開通', 'es-ES': 'Activación QR Instantánea', 'ko-KR': 'QR 스캔 즉시 개통' } },
        { id: 'p5', checked: false, kind: 'caption', x: 64, y: 262, w: 320, h: 42, srcSize: 13, cjkSize: 12, src: 'Carrier APN: internet.travel.example', tr: { 'zh-TW': '電信商 APN：internet.travel.example', 'ja-JP': 'APN：internet.travel.example', 'es-ES': 'APN: internet.travel.example', 'ko-KR': 'APN: internet.travel.example' } }
      ]
    },
    {
      id: 'push_perm',
      filename: '03_App_推播權限設定.png',
      subtitle: '1200 × 1200 · 系統通知開關與導覽保留',
      regions: [
        { id: 'n1', checked: true, kind: 'header', x: 70, y: 74, w: 256, h: 30, srcSize: 20, cjkSize: 17, src: 'Notifications', tr: { 'zh-TW': '通知設定', 'ja-JP': '通知設定', 'es-ES': 'Notificaciones', 'ko-KR': '알림 설정' } },
        { id: 'n2', checked: true, kind: 'row', x: 60, y: 154, w: 248, h: 28, srcSize: 18, cjkSize: 15, src: 'Allow Alerts', tr: { 'zh-TW': '允許即時通知', 'ja-JP': '通知を許可する', 'es-ES': 'Permitir alertas', 'ko-KR': '알림 허용' } },
        { id: 'n3', checked: true, kind: 'row', x: 60, y: 214, w: 256, h: 28, srcSize: 18, cjkSize: 15, src: 'Order Status Updates', tr: { 'zh-TW': '訂單狀態更新', 'ja-JP': '注文状況の通知', 'es-ES': 'Actualizaciones de pedido', 'ko-KR': '주문 상태 업데이트' } },
        { id: 'n4', checked: false, kind: 'caption', x: 60, y: 274, w: 310, h: 38, srcSize: 13, cjkSize: 12, src: 'Account ID: demo.user@example.invalid', tr: { 'zh-TW': '測試帳號：demo.user@example.invalid', 'ja-JP': 'アカウント：demo.user@example.invalid', 'es-ES': 'Cuenta: demo.user@example.invalid', 'ko-KR': '계정: demo.user@example.invalid' } }
      ]
    }
  ];

  const state = {
    currentIdx: 0,
    targetLang: 'zh-TW',
    viewMode: 'compare',
    reviewFirst: true,
    generatedFingerprint: '',
    ocrDone: true
  };

  const canvas = $('#lingo-canvas');
  const ctx = canvas.getContext('2d');

  function getCurrentItem() {
    return ITEMS[state.currentIdx];
  }

  function computeFingerprint(item, lang) {
    return JSON.stringify({
      id: item.id,
      lang,
      regions: item.regions.map((r) => [r.id, r.checked, r.tr[lang] || r.src])
    });
  }

  function isFingerprintValid() {
    return state.generatedFingerprint === computeFingerprint(getCurrentItem(), state.targetLang);
  }

  function syncFingerprintUI() {
    const badge = $('#fp-badge');
    const valid = isFingerprintValid();
    badge.className = `fp-badge ${valid ? 'is-valid' : 'is-stale'}`;
    badge.textContent = valid ? '選框指紋一致 · 可安心匯出' : '選框已變更 · 請重新按「AI 翻譯並重製圖片」';
  }

  function renderQueue() {
    const list = $('#queue-list');
    list.innerHTML = '';
    ITEMS.forEach((item, idx) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `queue-item ${idx === state.currentIdx ? 'is-active' : ''}`;
      const checkedNum = item.regions.filter((r) => r.checked).length;
      const t1 = document.createElement('span');
      t1.textContent = item.filename;
      const t2 = document.createElement('small');
      t2.textContent = `${checkedNum}/${item.regions.length} 區域待譯 · ${item.subtitle.split(' · ')[0]}`;
      btn.append(t1, t2);
      btn.addEventListener('click', () => {
        state.currentIdx = idx;
        state.generatedFingerprint = computeFingerprint(getCurrentItem(), state.targetLang);
        renderAll();
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
    $('#queue-count').textContent = String(ITEMS.length);
  }

  function renderRegionTable() {
    const item = getCurrentItem();
    const tbody = $('#region-tbody');
    tbody.innerHTML = '';
    const lang = state.targetLang;

    item.regions.forEach((reg) => {
      const tr = document.createElement('tr');
      if (!reg.checked) tr.className = 'is-kept';

      const tdCheck = document.createElement('td');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = reg.checked;
      cb.setAttribute('aria-label', `勾選翻譯 ${reg.src}`);
      cb.addEventListener('change', () => {
        reg.checked = cb.checked;
        renderRegionTable();
        renderQueue();
        syncFingerprintUI();
        drawCanvas();
      });
      tdCheck.appendChild(cb);

      const tdSrc = document.createElement('td');
      tdSrc.textContent = reg.src;

      const tdSize = document.createElement('td');
      const tag = document.createElement('span');
      tag.className = 'font-tag';
      tag.textContent = `${reg.srcSize}→${reg.checked ? reg.cjkSize : reg.srcSize}px`;
      tdSize.appendChild(tag);

      const tdTr = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-tr';
      input.value = reg.checked ? (reg.tr[lang] || reg.src) : `（保留原文）${reg.src}`;
      input.disabled = !reg.checked;
      input.addEventListener('input', () => {
        reg.tr[lang] = input.value;
        syncFingerprintUI();
        if (state.viewMode === 'payload') renderPayload();
      });
      tdTr.appendChild(input);

      tr.append(tdCheck, tdSrc, tdSize, tdTr);
      tbody.appendChild(tr);
    });

    $('#checked-count').textContent = String(item.regions.filter((r) => r.checked).length);
    $('#total-count').textContent = String(item.regions.length);
  }

  function drawMockDevice(ox, oy, scale, item, isTranslated) {
    const pw = 430 * scale;
    const ph = 490 * scale;

    ctx.save();
    ctx.translate(ox, oy);

    // Phone UI Card
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(0, 0, pw, ph, 22 * scale);
    ctx.fill();
    ctx.stroke();

    // iOS Status Bar (non-selected protected area)
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.roundRect(0, 0, pw, 42 * scale, [22 * scale, 22 * scale, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.font = `700 ${Math.round(12 * scale)}px ui-monospace, monospace`;
    ctx.fillText('09:41', 22 * scale, 26 * scale);
    ctx.fillText('5G · 94%', (pw - 86 * scale), 26 * scale);

    // Inner row dividers & toggles (protected UI graphics untouched outside OCR boxes)
    const rowsY = [114, 164, 214, 268, 392];
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    rowsY.forEach((ry) => {
      ctx.beginPath();
      ctx.moveTo(28 * scale, ry * scale);
      ctx.lineTo(pw - 28 * scale, ry * scale);
      ctx.stroke();
    });

    // Toggle switches & chevrons (preserved vector graphics)
    [134, 286].forEach((ty, idx) => {
      const tx = pw - 74 * scale;
      ctx.fillStyle = idx === 0 ? '#10b981' : '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(tx, ty * scale, 44 * scale, 24 * scale, 12 * scale);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(tx + (idx === 0 ? 32 : 12) * scale, (ty + 12) * scale, 9.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    });

    // Regions text
    const lang = state.targetLang;
    item.regions.forEach((reg) => {
      const rx = reg.x * scale;
      const ry = reg.y * scale;
      const rw = reg.w * scale;
      const rh = reg.h * scale;

      const showTranslatedText = isTranslated && reg.checked;
      const displayStr = showTranslatedText ? (reg.tr[lang] || reg.src) : reg.src;
      const pxSize = Math.round((showTranslatedText ? reg.cjkSize : reg.srcSize) * scale);

      ctx.save();
      ctx.fillStyle = reg.kind === 'caption' ? '#64748b' : reg.kind === 'badge' ? '#0f766e' : '#0f172a';
      ctx.font = `${reg.kind === 'header' || reg.kind === 'title' ? 700 : 500} ${pxSize}px "Microsoft JhengHei UI", "Segoe UI", sans-serif`;
      const lines = displayStr.length > 26 ? [displayStr.slice(0, 26), displayStr.slice(26)] : [displayStr];
      lines.forEach((line, li) => {
        ctx.fillText(line, rx + 6 * scale, ry + (pxSize + 5 + li * (pxSize + 4)));
      });
      ctx.restore();

      // Bounding box overlay on source preview
      if (!isTranslated) {
        ctx.save();
        ctx.strokeStyle = reg.checked ? '#117c74' : '#94a3b8';
        ctx.lineWidth = reg.checked ? 2 : 1.2;
        if (!reg.checked) ctx.setLineDash([4, 4]);
        ctx.fillStyle = reg.checked ? 'rgba(17, 124, 116, 0.11)' : 'rgba(148, 163, 184, 0.08)';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeRect(rx, ry, rw, rh);

        ctx.fillStyle = reg.checked ? '#117c74' : '#64748b';
        ctx.font = `700 ${Math.round(10 * scale)}px ui-monospace, monospace`;
        ctx.fillText(reg.checked ? '翻譯' : '保留', rx + rw - 24 * scale, ry + 11 * scale);
        ctx.restore();
      }
    });

    ctx.restore();
  }

  let clickableBoxes = [];
  function drawCanvas() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#e7edf5';
    ctx.fillRect(0, 0, w, h);
    clickableBoxes = [];

    const item = getCurrentItem();

    if (state.viewMode === 'compare') {
      const scale = 0.96;
      const sx = 24;
      const rx = 492;
      const oy = 56;

      ctx.fillStyle = '#1b3151';
      ctx.font = '700 14px "Microsoft JhengHei UI", sans-serif';
      ctx.fillText('原圖＋本機 RapidOCR 選框（點擊文字框可切換勾選）', sx, 34);
      ctx.fillStyle = '#117c74';
      ctx.fillText(`AI 整圖重製成品（${$('#target-lang').selectedOptions[0].textContent} · 同層字級已校準）`, rx, 34);

      drawMockDevice(sx, oy, scale, item, false);
      drawMockDevice(rx, oy, scale, item, true);

      item.regions.forEach((reg) => {
        clickableBoxes.push({
          x: sx + reg.x * scale,
          y: oy + reg.y * scale,
          w: reg.w * scale,
          h: reg.h * scale,
          reg
        });
      });
    } else {
      const scale = 1.06;
      const ox = (w - 430 * scale) / 2;
      const oy = 40;
      const isResult = state.viewMode === 'result';
      drawMockDevice(ox, oy, scale, item, isResult);
      if (!isResult) {
        item.regions.forEach((reg) => {
          clickableBoxes.push({
            x: ox + reg.x * scale,
            y: oy + reg.y * scale,
            w: reg.w * scale,
            h: reg.h * scale,
            reg
          });
        });
      }
    }
  }

  function renderPayload() {
    const item = getCurrentItem();
    const lang = state.targetLang;
    const payload = {
      model: 'gemini-3.8-flash-medium',
      effort: 'medium',
      source_image: item.filename,
      target_locale: lang,
      cjk_font_calibration: 'Hx + standard CJK glyph (uniform tier 15px)',
      translate_only: item.regions.filter((r) => r.checked).map((r) => ({
        id: r.id,
        text: r.src,
        target_hint: r.tr[lang] || r.src,
        xywh: [r.x, r.y, r.w, r.h]
      })),
      keep_original: item.regions.filter((r) => !r.checked).map((r) => ({
        id: r.id,
        text: r.src,
        xywh: [r.x, r.y, r.w, r.h]
      })),
      generation_fingerprint: computeFingerprint(item, lang).slice(0, 64) + '…'
    };
    $('#payload-pre').textContent = JSON.stringify(payload, null, 2);
  }

  function renderAll() {
    renderQueue();
    renderRegionTable();
    syncFingerprintUI();
    if (state.viewMode === 'payload') {
      $('#canvas-stage').hidden = true;
      $('#payload-pre').hidden = false;
      renderPayload();
    } else {
      $('#canvas-stage').hidden = false;
      $('#payload-pre').hidden = true;
      drawCanvas();
    }
  }

  canvas.addEventListener('click', (e) => {
    if (!clickableBoxes.length) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const hit = clickableBoxes.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (hit) {
      hit.reg.checked = !hit.reg.checked;
      renderAll();
      $('#status-msg').textContent = `已將「${hit.reg.src}」切換為「${hit.reg.checked ? '翻譯' : '保留原文'}」，請按「AI 翻譯並重製圖片」更新結果。`;
    }
  });

  $$('.vtab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.viewMode = tab.dataset.view;
      $$('.vtab').forEach((t) => t.classList.toggle('is-active', t === tab));
      renderAll();
    });
  });

  $('#target-lang').addEventListener('change', (e) => {
    state.targetLang = e.target.value;
    state.generatedFingerprint = computeFingerprint(getCurrentItem(), state.targetLang);
    renderAll();
    $('#status-msg').textContent = `已切換目標語言為 ${$('#target-lang').selectedOptions[0].textContent}，並套用多語言字級校正。`;
  });

  $('#run-ocr-btn').addEventListener('click', () => {
    $('#status-msg').textContent = `本機 RapidOCR 辨識完成：共偵測 ${getCurrentItem().regions.length} 個文字區域（無雲端成本）。`;
    drawCanvas();
  });

  $('#generate-btn').addEventListener('click', () => {
    const item = getCurrentItem();
    const count = item.regions.filter((r) => r.checked).length;
    if (count === 0) {
      $('#status-msg').textContent = '目前未勾選任何區域（0 選取＝不送出雲端請求），請至少勾選 1 個文字框。';
      return;
    }
    state.generatedFingerprint = computeFingerprint(item, state.targetLang);
    state.viewMode = state.viewMode === 'source' ? 'compare' : state.viewMode;
    $$('.vtab').forEach((t) => t.classList.toggle('is-active', t.dataset.view === state.viewMode));
    renderAll();
    $('#status-msg').textContent = `已完成單次整圖翻譯重製（已處理 ${count} 個勾選框，未選文字與圖示原樣保留）。`;
  });

  $('#export-btn').addEventListener('click', () => {
    if (!isFingerprintValid()) {
      $('#status-msg').textContent = '⚠ 選框或譯文已變更，依 ImageLingo 指紋保護規則禁止匯出舊圖！請先按「AI 翻譯並重製圖片」。';
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ImageLingo_${getCurrentItem().id}_${state.targetLang}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      $('#status-msg').textContent = `已匯出完成圖：ImageLingo_${getCurrentItem().id}_${state.targetLang}.png`;
    });
  });

  $('#select-all-btn').addEventListener('click', () => {
    getCurrentItem().regions.forEach((r) => { r.checked = true; });
    renderAll();
  });
  $('#unselect-all-btn').addEventListener('click', () => {
    getCurrentItem().regions.forEach((r) => { r.checked = false; });
    renderAll();
  });

  const qDialog = $('#quota-dialog');
  $('#quota-btn').addEventListener('click', () => qDialog.showModal());
  $('#close-quota-btn').addEventListener('click', () => qDialog.close());

  state.generatedFingerprint = computeFingerprint(getCurrentItem(), state.targetLang);
  renderAll();
})();
