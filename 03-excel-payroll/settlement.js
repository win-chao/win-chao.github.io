(function () {
  'use strict';

  const months = ['2026-04', '2026-05', '2026-06'];
  const demoKols = [
    { code: 'DEMO-101', name: '林晴', settlement: 'monthly', payment: 'A+B', pocket: 20000, opening: 0 },
    { code: 'DEMO-102', name: '莊安', settlement: 'quarterly', payment: 'B', pocket: 0, opening: 0 },
    { code: 'DEMO-103', name: '周月', settlement: 'monthly', payment: 'A', pocket: 16000, opening: 0 }
  ];
  const initialRows = {
    '2026-04': [
      { code: 'DEMO-101', tw: 17000, foreign: 8900 },
      { code: 'DEMO-102', tw: 10000, foreign: 2150 },
      { code: 'DEMO-103', tw: 12000, foreign: 2000 }
    ],
    '2026-05': [
      { code: 'DEMO-101', tw: 14700, foreign: 8000 },
      { code: 'DEMO-102', tw: 14000, foreign: 2620 },
      { code: 'DEMO-103', tw: 13000, foreign: 3500 }
    ]
  };
  const numberFormatter = new Intl.NumberFormat('zh-TW');
  const money = (value) => value == null ? '—' : numberFormatter.format(value);
  const periodName = (kol, month) => kol.settlement === 'quarterly' ? '2026 Q2' : month;
  const settlementName = (kol) => kol.settlement === 'quarterly' ? '季結' : '月結';

  function buildReport(kol, records, month, period, carry, earlierError) {
    const sources = period.map((sourceMonth) => ({ month: sourceMonth, row: records[sourceMonth]?.find((row) => row.code === kol.code) ?? null }));
    const included = sources.filter(({ row }) => row !== null);
    const sourceTotal = included.reduce((total, { row }) => total + row.tw + row.foreign, 0);
    const report = {
      ...kol, month, period: periodName(kol, month), sources,
      opening: carry, sourceTotal: included.length ? sourceTotal : null, due: null,
      paid: null, pocketPaid: null, otherPaid: null, closing: null, status: 'missing', label: '待匯入'
    };

    if (!included.length) return report;
    if (earlierError) {
      return { ...report, status: 'error', label: '前期結算待確認' };
    }
    const currentSource = sources.find((entry) => entry.month === month)?.row;
    if (kol.settlement === 'quarterly' && (month !== months.at(-1) || !currentSource)) {
      return { ...report, status: 'partial', label: '於季末結算' };
    }
    if (!currentSource) return report;
    if (included.some(({ row }) => row.mismatch)) {
      return { ...report, status: 'error', label: '來源獎金待核對' };
    }
    if (sourceTotal === 0) return { ...report, status: 'zero', label: '來源獎金為 0', closing: carry };
    const due = sourceTotal + carry;
    const pocketPaid = kol.payment === 'B' || (kol.payment === 'A+B' && carry < 0 && due <= 0) ? 0 : kol.pocket;
    const paid = kol.payment === 'A' ? pocketPaid : Math.floor(Math.max(0, due) / 1000) * 1000;
    if (kol.payment === 'A+B' && pocketPaid > paid) {
      return { ...report, due, status: 'error', label: '口袋出帳高於實發' };
    }
    return { ...report, due, paid, pocketPaid, otherPaid: paid - pocketPaid, closing: due - paid, status: 'ready', label: '可下載' };
  }

  function reportsFor(kol, records) {
    let carry = kol.opening;
    let earlierError = false;
    return months.map((month, index) => {
      const period = kol.settlement === 'quarterly' ? months.slice(0, index + 1) : [month];
      const report = buildReport(kol, records, month, period, carry, earlierError);
      if (report.status === 'error') earlierError = true;
      if (report.closing !== null) carry = report.closing;
      return report;
    });
  }

  window.kolSettlement = { months, demoKols, initialRows, money, settlementName, reportsFor };
})();
