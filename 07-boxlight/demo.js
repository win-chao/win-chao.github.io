(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const STOCKS = [
    {
      market: 'TW', symbol: '2330', name: '台積電', sector: '半導體晶圓代工',
      price: 1035, pct: 1.47, floor: 990, ceiling: 1065,
      stage: 'bottom_confirmed', stageLabel: '箱底止穩已確認',
      action: '近三日測試箱底（+4.5%）後連兩日收在箱底上且今紅 K 守穩',
      prob20d: '54.2%', sampleCount: 184, revYoY: '+34.8%', revAccel: '+6.2 個百分點（正成長加速）',
      fir: { total: 78.4, price: 14.5, rev: 22.0, eps: 21.4, quality: 20.5, note: '近四季營收與毛利率同步改善' },
      series: [1018, 1025, 1042, 1058, 1062, 1050, 1032, 1015, 998, 994, 1005, 1018, 1024, 1035]
    },
    {
      market: 'TW', symbol: '2454', name: '聯發科', sector: 'IC 設計',
      price: 1285, pct: -0.77, floor: 1245, ceiling: 1360,
      stage: 'bottom', stageLabel: '等箱底止穩',
      action: '價格位於箱內下緣（距箱底 3.2%），等待連兩日收盤確認守穩',
      prob20d: '48.9%', sampleCount: 132, revYoY: '+19.4%', revAccel: '+2.4 個百分點（正成長加速）',
      fir: { total: 71.2, price: 16.8, rev: 17.5, eps: 18.9, quality: 18.0, note: '歷史低位名次 P=32%，營益率溫和回升' },
      series: [1345, 1355, 1330, 1310, 1295, 1278, 1260, 1252, 1265, 1275, 1292, 1288, 1295, 1285]
    },
    {
      market: 'TW', symbol: '2317', name: '鴻海', sector: 'AI 伺服器組裝',
      price: 214.5, pct: 2.14, floor: 192.0, ceiling: 212.5,
      stage: 'breakout_confirmed', stageLabel: '箱頂站穩已確認',
      action: '連續兩日收盤站上箱頂 212.5 元且盤中未跌回箱內',
      prob20d: '51.8%', sampleCount: 165, revYoY: '+25.1%', revAccel: '+8.9 個百分點（正成長加速）',
      fir: { total: 74.0, price: 11.2, rev: 23.0, eps: 20.8, quality: 19.0, note: '月營收連續三次改善，EPS 品質一致' },
      series: [195, 198, 203, 209, 206, 201, 204, 208, 211, 210, 213, 213.5, 210, 214.5]
    },
    {
      market: 'TW', symbol: '3037', name: '欣興', sector: 'ABF 載板',
      price: 156.5, pct: 0.97, floor: 148.0, ceiling: 174.0,
      stage: 'bottom_confirmed', stageLabel: '箱底止穩已確認',
      action: '252 日處於歷史相對低位（P=21%），月營收由負轉正加速中',
      prob20d: '46.5%', sampleCount: 94, revYoY: '+11.6%', revAccel: '+16.4 個百分點（由負轉正）',
      fir: { total: 84.6, price: 21.8, rev: 22.5, eps: 21.0, quality: 19.3, note: 'FIR 雷達重點觀察：由負轉正＋低基期' },
      series: [172, 168, 162, 158, 152, 149, 150, 153, 151, 149, 152, 154, 155, 156.5]
    },
    {
      market: 'US', symbol: 'NVDA', name: 'NVIDIA', sector: 'AI GPU / Data Center',
      price: 141.2, pct: 1.88, floor: 132.0, ceiling: 144.5,
      stage: 'breakout', stageLabel: '等箱頂站穩',
      action: '收盤接近箱頂 144.5（126 日參考），須連兩日收高確認突破',
      prob20d: '55.4%', sampleCount: 210, revYoY: '+94.0%', revAccel: '+4.1 個百分點',
      fir: { total: 76.5, price: 12.0, rev: 24.5, eps: 22.0, quality: 18.0, note: '42/126 日美股同型態分層參考（樣本充足）' },
      series: [134, 136, 139, 143, 140, 135, 133, 136, 138, 137, 139, 140, 138.6, 141.2]
    },
    {
      market: 'US', symbol: 'AMD', name: 'AMD', sector: 'Semiconductors',
      price: 138.4, pct: -1.14, floor: 135.0, ceiling: 156.0,
      stage: 'bottom', stageLabel: '等箱底止穩',
      action: '貼近 40 日箱底 135.0（+2.5%），等待止穩紅 K 確認',
      prob20d: '47.2%', sampleCount: 168, revYoY: '+17.6%', revAccel: '+7.2 個百分點（虧損收斂後轉正）',
      fir: { total: 79.1, price: 19.4, rev: 20.1, eps: 21.6, quality: 18.0, note: '本業毛利率改善，但須防大盤波動回測箱底' },
      series: [154, 151, 147, 144, 141, 138, 136, 139, 142, 140, 137, 139, 140, 138.4]
    }
  ];

  const HOLDINGS = [
    { symbol: '2330', name: '台積電', cost: 982.0, stop: 960.0, current: 1035.0, note: '箱底止穩確認進場，守 960 元不動', floor: 990 },
    { symbol: '3037', name: '欣興', cost: 164.0, stop: 158.0, current: 156.5, note: '原定防守價 158 元（已跌破）', floor: 148 }
  ];

  const CALENDAR_EVENTS = [
    { date: '2026-12-10', title: '台股 11 月營收全數截止公告', horizon: '近期參考 (16 天內)', sample: '68 筆可比月度樣本', dist: '上漲 51% · 下跌 34% · 持平 15%', confidence: '中' },
    { date: '2026-12-18', title: 'FOMC 利率決議會議', horizon: '近期參考 (24 天內)', sample: '38 筆歷史 FOMC 樣本', dist: '金融股 5 日上漲 45% · 下跌 32% · 持平 23%', confidence: '低（波動放大）' },
    { date: '2027-01-16', title: '晶圓代工權值法說會（遠期）', horizon: '遠期歷史參考 (超過 60 天界線)', sample: '84 筆未分組跨季事件', dist: '歷史 5 日分布僅供背景參考，不使用近期均線分組背書', confidence: '低（遠期參考）' }
  ];

  const state = {
    section: 'today',
    market: 'TW',
    stage: 'all',
    query: '',
    offsetBump: 0
  };

  function buildChartSVG(stock) {
    const prices = stock.series.map((v) => +(v + state.offsetBump).toFixed(2));
    const minP = Math.min(stock.floor, ...prices) * 0.985;
    const maxP = Math.max(stock.ceiling, ...prices) * 1.015;
    const w = 360;
    const h = 100;
    const toY = (val) => h - ((val - minP) / Math.max(1e-6, maxP - minP)) * (h - 16) - 8;

    const topY = toY(stock.ceiling).toFixed(1);
    const botY = toY(stock.floor).toFixed(1);
    const pts = prices.map((p, idx) => `${((idx / (prices.length - 1)) * (w - 20) + 10).toFixed(1)},${toY(p).toFixed(1)}`).join(' ');

    return `
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="${stock.name} 40日箱型走勢圖">
        <rect x="10" y="${topY}" width="${w - 20}" height="${Math.max(4, botY - topY)}" fill="#e1f0e9" rx="3"/>
        <line x1="10" y1="${topY}" x2="${w - 10}" y2="${topY}" stroke="#146c60" stroke-dasharray="4 3" stroke-width="1.2"/>
        <line x1="10" y1="${botY}" x2="${w - 10}" y2="${botY}" stroke="#875615" stroke-dasharray="4 3" stroke-width="1.2"/>
        <polyline fill="none" stroke="#1c302f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/>
      </svg>
    `;
  }

  function renderToday() {
    const root = $('#stock-cards');
    const q = state.query.trim().toLowerCase();
    const list = STOCKS.filter((s) =>
      s.market === state.market &&
      (state.stage === 'all' || s.stage === state.stage) &&
      (!q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    );

    root.innerHTML = '';
    list.forEach((s) => {
      const card = document.createElement('article');
      card.className = 'stock-card';
      const curPrice = +(s.price + state.offsetBump).toFixed(2);
      const isConfirmed = s.stage.endsWith('confirmed');
      card.innerHTML = `
        <div class="card-head">
          <div>
            <div class="stock-name">
              <strong>${s.symbol} ${s.name}</strong>
              <span class="badge ${isConfirmed ? '' : 'wait'}">${s.stageLabel}</span>
            </div>
            <div class="stock-meta">${s.sector} · 20 日參考機率 ${s.prob20d}（樣本 ${s.sampleCount} 筆）</div>
          </div>
          <div>
            <div class="price">${curPrice}</div>
            <div class="change ${s.pct >= 0 ? 'up' : 'down'}">${s.pct >= 0 ? '+' : ''}${s.pct.toFixed(2)}%</div>
          </div>
        </div>
        <div class="action-strip ${isConfirmed ? '' : 'warn'}">${s.action}</div>
        <div class="levels">
          <div class="level"><span>箱底支撐</span><strong>${s.floor}</strong></div>
          <div class="level"><span>最新收盤</span><strong>${curPrice}</strong></div>
          <div class="level"><span>箱頂壓力</span><strong>${s.ceiling}</strong></div>
        </div>
        <div class="card-chart">${buildChartSVG(s)}</div>
        <div class="card-foot">
          <span>營收 YoY ${s.revYoY} · FIR ${s.fir.total}</span>
          <button type="button" class="detail-btn" data-symbol="${s.symbol}">查看個股研究 →</button>
        </div>
      `;
      root.appendChild(card);
    });

    $$('.detail-btn', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = STOCKS.find((x) => x.symbol === btn.dataset.symbol);
        if (!s) return;
        $('#sd-title').textContent = `${s.symbol} ${s.name} · 箱型與轉折研究（示範基準）`;
        $('#sd-body').innerHTML = `
          <p><strong>階段判斷：</strong>${s.stageLabel}（${s.action}）</p>
          <p><strong>近 6 個月營收加速度：</strong>${s.revAccel}，最新單月 YoY ${s.revYoY}</p>
          <p><strong>歷史 20 日方向分布：</strong>${s.prob20d}（抽出可比歷史 ${s.sampleCount} 筆 · 非買進保證）</p>
          <p><strong>轉折雷達 FIR (${s.fir.total})：</strong>價格 ${s.fir.price}/25 · 營收 ${s.fir.rev}/25 · EPS ${s.fir.eps}/25 · 品質 ${s.fir.quality}/25</p>
          <p style="color:#536764;font-size:12.5px;">備註：${s.fir.note}</p>
        `;
        $('#stock-dialog').showModal();
      });
    });
  }

  function renderFIR() {
    const root = $('#fir-list');
    root.innerHTML = '';
    const sorted = [...STOCKS].sort((a, b) => b.fir.total - a.fir.total);
    sorted.forEach((s) => {
      const el = document.createElement('article');
      el.className = 'fir-card';
      el.innerHTML = `
        <div class="fir-head">
          <div><strong>${s.symbol} ${s.name}</strong><div class="muted">${s.sector} · ${s.stageLabel}</div></div>
          <div class="fir-score">${s.fir.total} <small style="font-size:12px;color:#536764;">/ 100</small></div>
        </div>
        <div class="score-bars">
          <div class="score-cell"><span>價格低位</span><strong>${s.fir.price}</strong></div>
          <div class="score-cell"><span>營收加速</span><strong>${s.fir.rev}</strong></div>
          <div class="score-cell"><span>EPS 改善</span><strong>${s.fir.eps}</strong></div>
          <div class="score-cell"><span>本業品質</span><strong>${s.fir.quality}</strong></div>
        </div>
        <div style="font-size:12.5px;color:#24754e;">${s.fir.note}</div>
      `;
      root.appendChild(el);
    });
  }

  function renderHoldings() {
    const root = $('#holdings-grid');
    root.innerHTML = '';
    HOLDINGS.forEach((h) => {
      const breachedStop = h.current <= h.stop;
      const diffPct = (((h.current - h.cost) / h.cost) * 100).toFixed(2);
      const card = document.createElement('article');
      card.className = 'hold-card';
      card.innerHTML = `
        <div class="fir-head">
          <div><strong>${h.symbol} ${h.name}</strong><div class="muted">${h.note}</div></div>
          <span class="alert-pill ${breachedStop ? 'danger' : 'ok'}">
            ${breachedStop ? '危險：已跌破原定防守價（優先於新分析）' : '續抱：守穩原定防守價之上'}
          </span>
        </div>
        <div class="levels" style="padding:10px 0 0;">
          <div class="level"><span>平均成本</span><strong>${h.cost}</strong></div>
          <div class="level"><span>原定防守價</span><strong style="color:${breachedStop ? '#bd4155' : '#146c60'}">${h.stop}</strong></div>
          <div class="level"><span>現價 (${Number(diffPct) >= 0 ? '+' : ''}${diffPct}%)</span><strong>${h.current}</strong></div>
        </div>
      `;
      root.appendChild(card);
    });
  }

  function renderCalendar() {
    const root = $('#calendar-grid');
    root.innerHTML = '';
    CALENDAR_EVENTS.forEach((ev) => {
      const card = document.createElement('article');
      card.className = 'cal-card';
      card.innerHTML = `
        <div class="fir-head">
          <strong>${ev.title}</strong>
          <span class="alert-pill ${ev.horizon.includes('遠期') ? 'warn' : 'ok'}">${ev.date}</span>
        </div>
        <div style="font-size:12.5px;color:#536764;margin-bottom:6px;">${ev.horizon} · 樣本：${ev.sample} · 信心：${ev.confidence}</div>
        <div style="font-size:13px;font-weight:600;">${ev.dist}</div>
      `;
      root.appendChild(card);
    });
  }

  function switchSection(sec) {
    state.section = sec;
    $$('.nav-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.section === sec));
    ['today', 'fir', 'personal', 'calendar', 'validation'].forEach((k) => {
      $(`#sec-${k}`).hidden = k !== sec;
    });
    const titles = {
      today: '箱型完整清單',
      fir: '轉折雷達 FIR（基本面 × 低位階）',
      personal: '我的庫存 / 收藏（示範帳本）',
      calendar: '股市日曆參考',
      validation: '策略前瞻驗證'
    };
    $('#page-title').textContent = titles[sec] || '箱型完整清單';
  }

  $$('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });
  $$('.seg-m').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.market = btn.dataset.market;
      $$('.seg-m').forEach((b) => b.classList.toggle('is-active', b === btn));
      state.stage = 'all';
      $$('.flt-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.stage === 'all'));
      renderToday();
    });
  });
  $$('.flt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.stage = btn.dataset.stage;
      $$('.flt-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
      renderToday();
    });
  });
  $('#stock-search').addEventListener('input', (e) => {
    state.query = e.target.value;
    renderToday();
  });
  $('#refresh-sim-btn').addEventListener('click', () => {
    state.offsetBump = state.offsetBump === 0 ? 3.5 : 0;
    renderToday();
  });

  $('#close-sd-btn').addEventListener('click', () => $('#stock-dialog').close());
  $('#open-holding-btn').addEventListener('click', () => $('#holding-dialog').showModal());
  $('#close-hd-btn').addEventListener('click', () => $('#holding-dialog').close());
  $('#holding-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const cost = Number(fd.get('cost'));
    HOLDINGS.unshift({
      symbol: String(fd.get('symbol')).trim(),
      name: String(fd.get('name')).trim(),
      cost,
      stop: Number(fd.get('stop')),
      current: +(cost * 1.018).toFixed(2),
      note: String(fd.get('note')).trim() || '模擬持股',
      floor: Number(fd.get('stop'))
    });
    renderHoldings();
    $('#holding-dialog').close();
  });

  renderToday();
  renderFIR();
  renderHoldings();
  renderCalendar();
})();
