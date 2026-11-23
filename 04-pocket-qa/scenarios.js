(function () {
  'use strict';

  const exampleEmail = 'demo.qa@example.invalid';
  const noticeTitle = '系統維護公告';
  const submitted = '申請已送出';
  const reference = 'DEMO-001';
  const requiredEmail = '請填寫聯絡信箱';
  const unavailable = '暫時無法完成送出';
  const home = '服務首頁';
  const news = '最新公告';
  const apply = '線上申請';

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

  function enterEmail(root) {
    const field = root.querySelector('[name="contact"]');
    if (!(field instanceof HTMLInputElement) || !field.getClientRects().length) throw new Error('畫面找不到聯絡信箱欄位。');
    field.focus();
    field.value = exampleEmail;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    return { pass: field.value === exampleEmail && field.validity.valid, actual: '欄位值為「' + field.value + '」' };
  }

  const catalog = [
    {
      id: 'QA-01', group: '官網回歸', label: '公告列表與詳情', description: '點選公告並核對標題',
      steps: [
        { action: '開啟首頁', expected: '顯示「服務首頁」', run(root) { click(root, '[data-portal-view="home"]'); return expect(root, '.portal-content h3', home); } },
        { action: '進入最新公告', expected: '顯示「最新公告」', run(root) { click(root, '[data-portal-view="news"]'); return expect(root, '.portal-content h3', news); } },
        { action: '點開系統維護公告', expected: '展開「系統維護公告」詳情', run(root) { click(root, '[data-portal-notice]'); return expect(root, '#notice-title', noticeTitle); } }
      ]
    },
    {
      id: 'QA-02', group: '線上申請', label: '申請表單必填驗證', description: '檢查空白欄位與正確輸入',
      steps: [
        { action: '開啟線上申請', expected: '顯示「線上申請」表單', run(root) { click(root, '[data-portal-view="apply"]'); return expect(root, '.portal-content h3', apply); } },
        { action: '未填聯絡信箱便按送出', expected: '顯示「請填寫聯絡信箱」', run(root) { click(root, '[data-portal-submit]'); return expect(root, '[data-portal-status] strong', requiredEmail); } },
        { action: '輸入範例信箱', expected: '欄位保留 ' + exampleEmail, run: enterEmail },
        { action: '填寫完成後再次送出', expected: '顯示「申請已送出」', run(root) { click(root, '[data-portal-submit]'); return expect(root, '[data-portal-status] strong', submitted); } }
      ]
    },
    {
      id: 'QA-03', group: '線上申請', label: '送出結果與成功提示', description: '可切換故障情境，驗證錯誤蒐證', configurable: true,
      steps: [
        { action: '開啟線上申請', expected: '顯示「線上申請」表單', run(root) { click(root, '[data-portal-view="apply"]'); return expect(root, '.portal-content h3', apply); } },
        { action: '輸入範例信箱', expected: '欄位保留 ' + exampleEmail, run: enterEmail },
        {
          action: '送出申請並確認結果',
          expected: '顯示「申請已送出」及案件編號 ' + reference,
          run(root) {
            click(root, '[data-portal-submit]');
            const result = expect(root, '[data-portal-status] strong', submitted);
            const caseNumber = textOf(root, '[data-portal-reference]');
            return { pass: result.pass && caseNumber === reference, actual: result.actual + (caseNumber ? '，案件編號 ' + caseNumber : '，未顯示案件編號') };
          }
        }
      ]
    }
  ];

  function createPortal(root) {
    const pages = { home, news, apply };
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

    function reset(mode) {
      fault = mode === 'fault';
      root.innerHTML = '<header class="portal-top"><strong>Demo Portal</strong><small>本機示範環境</small></header><nav class="portal-nav" aria-label="示範網站導覽">'
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
        article.hidden = !article.hidden;
        button.setAttribute('aria-expanded', String(!article.hidden));
      }
    });

    root.addEventListener('submit', (event) => {
      event.preventDefault();
      const field = event.target.elements.contact;
      const status = root.querySelector('[data-portal-status]');
      const message = !field.value ? requiredEmail : !field.validity.valid ? '請輸入有效的信箱' : fault ? unavailable : submitted;
      const success = message === submitted;
      status.classList.toggle('error', !success);
      status.innerHTML = '<strong>' + message + '</strong>';
      if (success) status.innerHTML += ' <span data-portal-reference>' + reference + '</span>';
      if (message === unavailable) status.innerHTML += '<p>示範服務回應異常，請稍後再試。</p>';
      status.hidden = false;
    });

    return { reset };
  }

  window.pocketScenarios = { catalog, createPortal };
})();
