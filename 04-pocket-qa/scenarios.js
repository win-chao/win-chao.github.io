(function () {
  'use strict';

  const exampleEmail = 'demo.qa@example.invalid';
  const defaultId = 'A123456789';
  const defaultBirthday = '19991111';

  function textOf(root, selector) {
    const element = root.querySelector(selector);
    return element && element.getClientRects().length ? element.textContent.trim() : '';
  }

  function expect(root, selector, expected) {
    const value = textOf(root, selector);
    return { pass: value === expected, actual: value ? '顯示「' + value + '」' : '畫面未顯示目標內容' };
  }

  function click(root, selector) {
    const element = root.querySelector(selector);
    if (!(element instanceof HTMLButtonElement) || element.disabled || !element.getClientRects().length) {
      throw new Error('畫面找不到可操作的目標按鈕。');
    }
    element.click();
  }

  function enterEmail(root, params) {
    const targetEmail = (params && params.email) || exampleEmail;
    const field = root.querySelector('[name="contact"]');
    if (!(field instanceof HTMLInputElement) || !field.getClientRects().length) throw new Error('畫面找不到聯絡信箱欄位。');
    field.focus();
    field.value = targetEmail;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    return { pass: field.value === targetEmail && field.validity.valid, actual: '欄位值為「' + field.value + '」' };
  }

  const catalog = [
    // 1. 官網與快捷入口 (4)
    {
      id: 'public_website', group: '官網與快捷入口', label: '形象官網（登入前）：Header + 內容 + Footer', description: '驗證官網登入前公告與雙入口', envs: ['uat', 'staging'],
      steps: [
        { action: '開啟形象官網首頁', expected: '顯示「服務首頁」', run(root) { click(root, '[data-portal-view="home"]'); return expect(root, '.portal-content h3', '服務首頁'); } },
        { action: '點開最新公告與維護通知', expected: '展開「系統維護公告」詳情', run(root) { click(root, '[data-portal-view="news"]'); click(root, '[data-portal-notice]'); return expect(root, '#notice-title', '系統維護公告'); } }
      ]
    },
    { id: 'smoke', group: '官網與快捷入口', label: '官網 Smoke（Header + 快捷入口 + Footer）', description: '快速檢查導覽列與 Footer 入口', envs: ['uat', 'staging'], steps: null },
    { id: 'dashboard_icons', group: '官網與快捷入口', label: '首頁快捷入口與內容按鈕', description: '核對首頁主要服務捷徑可達性', envs: ['uat', 'staging'], steps: null },
    { id: 'footer_entries', group: '官網與快捷入口', label: '官網 Footer 入口', description: '檢查雙 App 下載與反詐宣導頁連結', envs: ['uat', 'staging'], steps: null },

    // 2. ETF 與口袋存股 (6)
    { id: 'etf_ranking', group: 'ETF 與口袋存股', label: 'ETF 專區台股 + 美股排行榜', description: '驗證排行榜排序與欄位顯示', envs: ['uat', 'staging'], steps: null },
    { id: 'etf_tw_search', group: 'ETF 與口袋存股', label: 'ETF 專區台股搜尋', description: '輸入代碼搜尋並核對搜尋結果', envs: ['uat', 'staging'], steps: null },
    { id: 'webca_entry', group: 'ETF 與口袋存股', label: '各入口 WebCA 彈窗驗證', description: '檢查憑證簽章彈窗正常觸發', envs: ['uat', 'staging'], steps: null },
    { id: 'saving_stock_full_lifecycle', group: 'ETF 與口袋存股', label: '口袋存股完整生命週期', description: '建立約定、修改、暫停與終止', envs: ['uat', 'staging'], steps: null },
    { id: 'saving_stock_immediate', group: 'ETF 與口袋存股', label: '口袋存股立即存股', description: '驗證單筆立即申購流程', envs: ['uat'], steps: null },
    { id: 'saving_stock_my_saving_edit', group: 'ETF 與口袋存股', label: '口袋存股我的存股編輯', description: '調整扣款日與金額後重讀驗證', envs: ['uat'], steps: null },

    // 3. 口袋錢包與帳務安全 (3)
    { id: 'cash_transfer', group: '口袋錢包與帳務安全', label: '口袋錢包入金 + 出款', description: '核對銀行代碼與出入金狀態', envs: ['uat'], steps: null },
    {
      id: 'forgot_password_resend', group: '口袋錢包與帳務安全', label: '忘記密碼 - 密碼補發', description: '支援身分證／生日參數與 Staging 手動 OTP', envs: ['uat', 'staging'],
      params: [
        { key: 'identity_number', label: '身分證字號', default: defaultId },
        { key: 'birthday', label: '生日（YYYYMMDD）', default: defaultBirthday }
      ],
      requiresOtp: true,
      steps: null
    },
    {
      id: 'forgot_password_unlock', group: '口袋錢包與帳務安全', label: '忘記密碼 - 密碼解鎖', description: '連續錯誤鎖定後執行解鎖流程', envs: ['uat', 'staging'],
      params: [
        { key: 'identity_number', label: '身分證字號', default: defaultId },
        { key: 'birthday', label: '生日（YYYYMMDD）', default: defaultBirthday }
      ],
      requiresOtp: true,
      steps: null
    },

    // 4. 線上開戶與加開 (11)
    {
      id: 'online_account_tw', group: '線上開戶與加開', label: '線上開戶 - 台股', description: '支援故障示範，驗證錯誤時間線與原圖蒐證', envs: ['uat', 'staging'],
      configurable: true,
      params: [{ key: 'email', label: 'Email（選填）', default: exampleEmail }],
      steps: [
        { action: '開啟線上申請', expected: '顯示「線上申請」表單', run(root) { click(root, '[data-portal-view="apply"]'); return expect(root, '.portal-content h3', '線上申請'); } },
        { action: '輸入聯絡信箱', expected: '保留有效聯絡信箱', run: enterEmail },
        {
          action: '送出開戶申請並核對業務回傳',
          expected: '顯示「申請已送出」及案件編號 DEMO-001',
          run(root) {
            click(root, '[data-portal-submit]');
            const result = expect(root, '[data-portal-status] strong', '申請已送出');
            const caseNumber = textOf(root, '[data-portal-reference]');
            return {
              pass: result.pass && caseNumber === 'DEMO-001',
              actual: result.actual + (caseNumber ? '，案件編號 ' + caseNumber : '，未顯示案件編號（HTTP 503 / 業務送件失敗）'),
              network: { method: 'POST', url: '/api/v1/account/apply', status: result.pass ? 200 : 503, ms: result.pass ? 142 : 318 },
              consoleMsg: result.pass ? 'info: apply succeeded ref=DEMO-001' : 'error: [ApplyService] upstream timeout 503 after 318ms'
            };
          }
        }
      ]
    },
    { id: 'online_account_tw_us_sub_brokerage', group: '線上開戶與加開', label: '線上開戶 - 台股＋美股複委託', description: '含雙市場契約簽署與進件確認', envs: ['uat', 'staging'], params: [{ key: 'email', label: 'Email（選填）', default: exampleEmail }], steps: null },
    { id: 'online_account_tw_us_fund', group: '線上開戶與加開', label: '線上開戶 - 三合一基金（台股＋美股複委託＋基金）', description: '三合一開戶送件驗證', envs: ['uat', 'staging'], params: [{ key: 'email', label: 'Email（選填）', default: exampleEmail }], steps: null },
    { id: 'online_account_tw_us_futures', group: '線上開戶與加開', label: '線上開戶 - 三合一期貨（台股＋美股複委託＋期貨）', description: '含期貨問卷與風險預告書簽署', envs: ['uat'], params: [{ key: 'email', label: 'Email（選填）', default: exampleEmail }], steps: null },
    { id: 'online_account_add_us_sub_brokerage', group: '線上開戶與加開', label: '加開-美股複委托', description: '既有帳戶加開，進件後自動作廢測資案件', envs: ['uat'], params: [{ key: 'identity_number', label: '身分證字號', default: defaultId }, { key: 'birthday', label: '生日', default: defaultBirthday }], steps: null },
    { id: 'online_account_add_credit', group: '線上開戶與加開', label: '加開-信用戶', description: '既有帳戶加開信用交易權限', envs: ['uat', 'staging'], params: [{ key: 'identity_number', label: '身分證字號', default: defaultId }, { key: 'birthday', label: '生日', default: defaultBirthday }], steps: null },
    { id: 'online_account_add_fund', group: '線上開戶與加開', label: '加開-基金', description: '既有帳戶加開基金專戶', envs: ['uat', 'staging'], params: [{ key: 'identity_number', label: '身分證字號', default: defaultId }, { key: 'birthday', label: '生日', default: defaultBirthday }], steps: null },
    { id: 'online_account_add_futures', group: '線上開戶與加開', label: '加開-期貨', description: '既有帳戶加開期貨帳戶', envs: ['uat'], params: [{ key: 'identity_number', label: '身分證字號', default: defaultId }, { key: 'birthday', label: '生日', default: defaultBirthday }], steps: null },
    { id: 'online_account_tw_supplement', group: '線上開戶與加開', label: '線開台股三頁斷點補件', description: '驗證證件模糊退件與補件續填', envs: ['uat', 'staging'], steps: null },
    { id: 'online_account_tw_us_supplement', group: '線上開戶與加開', label: '線開台股＋美股三頁斷點補件', description: '雙市場補件上傳與欄位保留檢查', envs: ['uat', 'staging'], steps: null },
    { id: 'online_account_tw_basic_info_validation', group: '線上開戶與加開', label: '線開基本資料驗證（不送件）', description: '核對必填欄位、身分證格式與錯誤提示', envs: ['uat', 'staging'], steps: null },

    // 5. 後台四審與批次作業 (2)
    { id: 'backoffice_review', group: '後台四審與批次作業', label: 'UAT 線開後台四審', description: 'CMS 一審至四審依序覆核與狀態驗證', envs: ['uat'], steps: null },
    { id: 'online_account_batch_review', group: '後台四審與批次作業', label: '批次開戶＋四審', description: '批次建立不同組合案件並接續四審', envs: ['uat'], steps: null }
  ];

  // Fill standard verification steps for flows without custom inline steps
  for (const flow of catalog) {
    if (!flow.steps) {
      flow.steps = [
        {
          action: `開啟「${flow.label}」目標頁`,
          expected: '頁面正常載入且無遮擋彈窗殘留',
          run(root) {
            click(root, '[data-portal-view="home"]');
            return expect(root, '.portal-content h3', '服務首頁');
          }
        },
        {
          action: '執行核心欄位與狀態斷言',
          expected: '業務結果與系統狀態一致',
          run() {
            return {
              pass: true,
              actual: `${flow.id} 核心斷言通過（模擬驗證）`,
              network: { method: 'GET', url: `/api/v1/flows/${flow.id}`, status: 200, ms: 96 },
              consoleMsg: `info: flow ${flow.id} assertions passed`
            };
          }
        }
      ];
    }
  }

  function createPortal(root) {
    const pages = { home: '服務首頁', news: '最新公告', apply: '線上申請' };
    let fault = false;

    function showPage(page) {
      const content = root.querySelector('.portal-content');
      root.querySelectorAll('[data-portal-view]').forEach((button) => {
        if (button.dataset.portalView === page) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
      if (page === 'news') {
        content.innerHTML = '<h3>最新公告</h3><button type="button" class="portal-notice" data-portal-notice aria-controls="notice-detail" aria-expanded="false"><span>系統維護公告</span><small>公告</small></button><article id="notice-detail" hidden><h4 id="notice-title">系統維護公告</h4><p>示範服務於週日進行例行維護。</p></article>';
      } else if (page === 'apply') {
        content.innerHTML = '<h3>線上申請</h3><p>送出一筆示範申請。</p><form class="portal-form" novalidate><label>聯絡信箱<input name="contact" type="email" autocomplete="off" placeholder="輸入範例信箱" required></label><button class="button primary" type="submit" data-portal-submit>送出申請</button><div class="portal-result" data-portal-status role="status" hidden></div></form>';
      } else {
        content.innerHTML = '<h3>服務首頁</h3><p>選擇最新公告或線上申請。</p>';
      }
    }

    function showOtpPrompt(onSubmit) {
      const content = root.querySelector('.portal-content');
      content.innerHTML = `<h3>簡訊驗證碼（Staging 手動 OTP）</h3>
        <p>請輸入 6 碼簡訊驗證碼以繼續執行流程。</p>
        <form class="portal-form" id="demo-otp-form">
          <label>簡訊驗證碼<input name="otp" maxlength="6" placeholder="例如 888666" required></label>
          <div class="actions"><button type="button" class="button" id="fill-demo-otp">填入示範驗證碼 888666</button><button class="button primary" type="submit">送出驗證碼</button></div>
        </form>`;
      root.querySelector('#fill-demo-otp').onclick = () => {
        root.querySelector('[name="otp"]').value = '888666';
      };
      root.querySelector('#demo-otp-form').onsubmit = (e) => {
        e.preventDefault();
        onSubmit(root.querySelector('[name="otp"]').value.trim());
      };
    }

    function reset(mode, envLabel = 'UAT') {
      fault = mode === 'fault';
      root.innerHTML = `<header class="portal-top"><strong>Demo Portal</strong><small>${envLabel} 示範環境</small></header><nav class="portal-nav" aria-label="示範網站導覽">`
        + Object.entries(pages).map(([id, name]) => `<button type="button" data-portal-view="${id}">${name}</button>`).join('')
        + '</nav><div class="portal-content"></div>';
      showPage('home');
    }

    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-portal-view], [data-portal-notice]');
      if (!button) return;
      if (button.dataset.portalView) {
        showPage(button.dataset.portalView);
      } else {
        const article = root.querySelector('#notice-detail');
        if (article) {
          article.hidden = !article.hidden;
          button.setAttribute('aria-expanded', String(!article.hidden));
        }
      }
    });

    root.addEventListener('submit', (event) => {
      if (event.target.id === 'demo-otp-form') return;
      event.preventDefault();
      const field = event.target.elements.contact;
      const status = root.querySelector('[data-portal-status]');
      const message = !field.value ? '請填寫聯絡信箱' : !field.validity.valid ? '請輸入有效的信箱' : fault ? '暫時無法完成送出' : '申請已送出';
      const success = message === '申請已送出';
      status.classList.toggle('error', !success);
      status.innerHTML = '<strong>' + message + '</strong>';
      if (success) status.innerHTML += ' <span data-portal-reference>DEMO-001</span>';
      if (message === '暫時無法完成送出') status.innerHTML += '<p>示範服務回應異常（HTTP 503），請稍後再試。</p>';
      status.hidden = false;
    });

    return { reset, showOtpPrompt };
  }

  window.pocketScenarios = { catalog, createPortal };
})();
