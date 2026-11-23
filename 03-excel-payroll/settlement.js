(function () {
  'use strict';

  const months = ['2026-04', '2026-05', '2026-06'];
  const demoKols = [
    {
      code: 'DEMO-101', name: '林晴', settlement: 'monthly', payment: 'A+B', pocket: 20000, opening: 0,
      openingMonth: '2026-04', coopStart: '115/01/01', coopEnd: '115/12/31', deleted: false,
      pocketChanges: [
        { id: 1, month: '2026-05', amount: 22000, note: '合約調整', actor: '業務部', createdAt: '2026-05-02 10:15', superseded: false, deleted: false }
      ],
      paymentChanges: []
    },
    {
      code: 'DEMO-102', name: '莊安', settlement: 'quarterly', payment: 'B', pocket: 0, opening: 0,
      openingMonth: '2026-04', coopStart: '115/01/01', coopEnd: '115/12/31', deleted: false,
      pocketChanges: [],
      paymentChanges: []
    },
    {
      code: 'DEMO-103', name: '周月', settlement: 'monthly', payment: 'A', pocket: 16000, opening: 0,
      openingMonth: '2026-04', coopStart: '115/03/01', coopEnd: '115/12/31', deleted: false,
      pocketChanges: [],
      paymentChanges: []
    }
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

  const initialImports = {
    '2026-04': { month: '2026-04', filename: '薪獎來源_2026-04.xlsx', uploadedAt: '2026-05-05 09:30', count: 3, status: '已匯入' },
    '2026-05': { month: '2026-05', filename: '薪獎來源_2026-05.xlsx', uploadedAt: '2026-06-05 10:12', count: 3, status: '已匯入' }
  };

  const initialMetabase = {
    '2026-04': { 'DEMO-101': { opened: 18, total: 142 }, 'DEMO-102': { opened: 9, total: 64 }, 'DEMO-103': { opened: 11, total: 88 } },
    '2026-05': { 'DEMO-101': { opened: 24, total: 166 }, 'DEMO-102': { opened: 12, total: 76 }, 'DEMO-103': { opened: 15, total: 103 } },
    '2026-06': { 'DEMO-101': { opened: 31, total: 197 }, 'DEMO-102': { opened: 14, total: 90 }, 'DEMO-103': { opened: 13, total: 116 } }
  };

  const numberFormatter = new Intl.NumberFormat('zh-TW');
  const money = (value) => (value == null ? '—' : numberFormatter.format(value));
  const periodName = (kol, month) => (kol.settlement === 'quarterly' ? '2026 Q2' : month);
  const settlementName = (kol) => (kol.settlement === 'quarterly' ? '季結' : '月結');

  function effectivePocketAt(kol, month) {
    const active = (kol.pocketChanges || []).filter((c) => !c.superseded && !c.deleted && c.month <= month);
    active.sort((a, b) => b.month.localeCompare(a.month));
    return active[0]?.amount ?? kol.pocket;
  }

  function effectivePaymentAt(kol, month) {
    const active = (kol.paymentChanges || []).filter((c) => !c.superseded && !c.deleted && c.month <= month);
    active.sort((a, b) => b.month.localeCompare(a.month));
    return active[0]?.mode ?? kol.payment;
  }

  function buildReport(kol, records, month, period, carry, earlierError, overrides = {}) {
    const activePayment = effectivePaymentAt(kol, month);
    const activePocket = effectivePocketAt(kol, month);
    const sources = period.map((sourceMonth) => ({
      month: sourceMonth,
      row: records[sourceMonth]?.find((row) => row.code === kol.code) ?? null
    }));
    const included = sources.filter(({ row }) => row !== null);
    const sourceTotal = included.reduce((total, { row }) => total + row.tw + row.foreign, 0);
    const report = {
      ...kol,
      payment: activePayment,
      pocketEffective: activePocket,
      month,
      period: periodName(kol, month),
      sources,
      opening: carry,
      sourceTotal: included.length ? sourceTotal : null,
      due: null,
      paid: null,
      pocketPaid: null,
      otherPaid: null,
      closing: null,
      status: 'missing',
      label: '待匯入',
      override: null
    };

    if (!included.length) return report;
    if (earlierError) return { ...report, status: 'error', label: '前期結算待確認' };

    const currentSource = sources.find((entry) => entry.month === month)?.row;
    if (kol.settlement === 'quarterly' && (month !== months.at(-1) || !currentSource)) {
      return { ...report, status: 'partial', label: '於季末結算' };
    }
    if (!currentSource) return report;
    if (included.some(({ row }) => row.mismatch)) {
      return { ...report, status: 'error', label: '來源獎金待核對' };
    }
    if (sourceTotal === 0) {
      const override = overrides[`${kol.code}/${month}`] ?? null;
      return { ...report, status: 'zero', label: '來源獎金為 0', closing: override ? override.amount : carry, override };
    }

    const due = sourceTotal + carry;
    const pocketPaid = activePayment === 'B' || (activePayment === 'A+B' && carry < 0 && due <= 0) ? 0 : activePocket;
    const paid = activePayment === 'A' ? pocketPaid : Math.floor(Math.max(0, due) / 1000) * 1000;
    if (activePayment === 'A+B' && pocketPaid > paid) {
      return { ...report, due, status: 'error', label: '口袋出帳高於實發' };
    }
    const override = overrides[`${kol.code}/${month}`] ?? null;
    const closing = override ? override.amount : due - paid;
    return { ...report, due, paid, pocketPaid, otherPaid: paid - pocketPaid, closing, status: 'ready', label: '可下載', override };
  }

  function reportsFor(kol, records, overrides = {}) {
    let carry = kol.opening;
    let earlierError = false;
    return months.map((month, index) => {
      const period = kol.settlement === 'quarterly' ? months.slice(0, index + 1) : [month];
      const report = buildReport(kol, records, month, period, carry, earlierError, overrides);
      if (report.status === 'error') earlierError = true;
      if (report.closing !== null) carry = report.closing;
      return report;
    });
  }

  window.kolSettlement = {
    months,
    demoKols,
    initialRows,
    initialImports,
    initialMetabase,
    money,
    settlementName,
    effectivePocketAt,
    effectivePaymentAt,
    reportsFor
  };
})();
