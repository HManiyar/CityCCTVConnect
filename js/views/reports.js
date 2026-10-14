/*
 * CityConnect — reports & analytics
 * All figures are computed from the store for the selected date range.
 */
(function () {
  'use strict';
  const CC = window.CC;
  const { html, icon, inr, inrShort, num, ymd, addDays, parseYMD, monthLabel, $, toast, plural, fmtDate } = CC.ui;
  const S = CC.store;
  const D = CC.data;
  const C = CC.components;

  const PRESETS = [['30', 'Last 30 days'], ['90', 'Last 90 days'], ['180', 'Last 6 months'], ['365', 'Last 12 months'], ['all', 'All time'], ['custom', 'Custom range']];
  const R = { preset: '180', from: ymd(addDays(new Date(), -180)), to: ymd(new Date()) };

  function range() {
    if (R.preset === 'custom') return { from: parseYMD(R.from), to: addDays(parseYMD(R.to), 1) };
    if (R.preset === 'all') return { from: new Date(2000, 0, 1), to: addDays(new Date(), 1) };
    return { from: addDays(new Date(), -+R.preset), to: addDays(new Date(), 1) };
  }
  const inRange = (iso, r) => { const t = new Date(iso); return t >= r.from && t < r.to; };

  function submittedAt(req) { const h = req.history.find((x) => x.status === 'submitted'); return h ? new Date(h.at) : null; }

  function compute() {
    const r = range();
    const st = S.getState();
    const reqs = st.requests.filter((x) => inRange(x.createdAt, r));
    const quotes = st.quotes.filter((q) => q.status !== 'superseded' && inRange(q.createdAt, r));
    const approved = st.quotes.filter((q) => q.status === 'approved' && q.decidedAt && inRange(q.decidedAt, r) && (S.request(q.requestId) || {}).status !== 'cancelled');

    // Vendor response performance
    const perf = S.vendors().map((v) => {
      const received = st.requests.filter((x) => x.invited.includes(v.id) && x.status !== 'draft' && inRange(x.createdAt, r));
      const hours = [];
      received.forEach((x) => {
        const sAt = submittedAt(x);
        const resp = x.responses[v.id];
        const firstQuote = st.quotes.filter((q) => q.requestId === x.id && q.vendorId === v.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
        const times = [resp && resp.at, firstQuote && firstQuote.createdAt].filter(Boolean).map((t) => new Date(t));
        if (sAt && times.length) hours.push(Math.max(0, (Math.min(...times) - sAt) / 3600000));
      });
      const vq = quotes.filter((q) => q.vendorId === v.id);
      const won = vq.filter((q) => q.status === 'approved').length;
      const decided = vq.filter((q) => ['approved', 'rejected', 'not_selected'].includes(q.status)).length;
      return {
        vendor: v, received: received.length, responded: hours.length, quotes: vq.length,
        avgHours: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : null,
        winRate: decided ? won / decided : null, avgQuote: vq.length ? vq.reduce((a, q) => a + q.total, 0) / vq.length : null
      };
    }).filter((p) => p.received > 0).sort((a, b) => b.received - a.received || (a.avgHours || 999) - (b.avgHours || 999));

    // Monthly expenditure buckets
    const end = new Date();
    const startMonth = new Date(Math.max(r.from.getTime(), new Date(end.getFullYear(), end.getMonth() - 11, 1).getTime()));
    const months = [];
    for (let d = new Date(startMonth.getFullYear(), startMonth.getMonth(), 1); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(d);
    while (months.length < 6) months.unshift(new Date(months[0].getFullYear(), months[0].getMonth() - 1, 1));
    const monthly = months.map((m) => {
      const next = new Date(m.getFullYear(), m.getMonth() + 1, 1);
      const items = st.quotes.filter((q) => q.status === 'approved' && q.decidedAt && new Date(q.decidedAt) >= m && new Date(q.decidedAt) < next && (S.request(q.requestId) || {}).status !== 'cancelled');
      return { label: monthLabel(m), value: items.reduce((a, q) => a + q.total, 0), count: items.length };
    });

    const byCity = D.CITIES.map((c) => ({ c, n: reqs.filter((x) => x.city === c.id && x.status !== 'draft').length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
    const cityQuotes = D.CITIES.map((c) => {
      const qs = quotes.filter((q) => (S.request(q.requestId) || {}).city === c.id);
      return { city: c.name, count: qs.length, avg: qs.length ? qs.reduce((a, q) => a + q.total, 0) / qs.length : 0, min: qs.length ? Math.min(...qs.map((q) => q.total)) : 0, max: qs.length ? Math.max(...qs.map((q) => q.total)) : 0 };
    }).filter((x) => x.count);

    const allHours = perf.filter((p) => p.avgHours != null);
    return {
      reqs, quotes, approved, perf, monthly, byCity, cityQuotes,
      spend: approved.reduce((a, q) => a + q.total, 0),
      avgQuote: quotes.length ? quotes.reduce((a, q) => a + q.total, 0) / quotes.length : 0,
      avgResponse: allHours.length ? allHours.reduce((a, p) => a + p.avgHours * p.responded, 0) / allHours.reduce((a, p) => a + p.responded, 0) : null,
      completed: reqs.filter((x) => x.status === 'completed').length,
      pending: reqs.filter((x) => S.OPEN.includes(x.status) || S.ACTIVE.includes(x.status)).length
    };
  }

  const fmtHours = (h) => (h == null ? '—' : h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} days`);

  CC.views.reports = {
    title: 'Reports & Analytics',
    render() {
      const m = compute();
      const statusItems = ['submitted', 'under_review', 'quotation_received', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled']
        .map((s) => ({ label: S.statusLabel(s), value: m.reqs.filter((x) => x.status === s).length })).filter((x) => x.value);
      const nonDraft = m.reqs.filter((x) => x.status !== 'draft').length;
      return html`
        ${C.pageHeader({ title: 'Reports & analytics', subtitle: 'Service activity, vendor performance and expenditure across cities.',
          actions: html`<button type="button" class="btn btn-secondary" data-action="export-report" data-kind="summary">${icon('download')} Export summary CSV</button>` })}
        <section class="card report-filters">
          <div class="field-inline"><label for="rp-preset">Date range</label>
            <select id="rp-preset" class="input" data-change="report-range">${PRESETS.map(([v, l]) => html`<option value="${v}" ${R.preset === v ? 'selected' : ''}>${l}</option>`)}</select></div>
          ${R.preset === 'custom' ? html`<div class="field-inline"><label for="rp-from">From</label><input id="rp-from" type="date" class="input" value="${R.from}" max="${R.to}" data-change="report-range"></div>
            <div class="field-inline"><label for="rp-to">To</label><input id="rp-to" type="date" class="input" value="${R.to}" min="${R.from}" max="${ymd(new Date())}" data-change="report-range"></div>` : ''}
          <p class="muted small grow text-right">Showing data for <strong>${R.preset === 'custom' ? `${fmtDate(R.from)} – ${fmtDate(R.to)}` : PRESETS.find((p) => p[0] === R.preset)[1].toLowerCase()}</strong> · requests by creation date, spend by approval date</p>
        </section>

        <section class="kpi-grid" aria-label="Report metrics">
          ${C.kpi({ label: 'Requests raised', value: num(nonDraft), hint: `${m.reqs.length - nonDraft} draft(s) excluded`, icon: 'clipboard', tone: 'blue', href: '#/requests' })}
          ${C.kpi({ label: 'Completed jobs', value: num(m.completed), hint: nonDraft ? `${Math.round((m.completed / nonDraft) * 100)}% of requests` : '—', icon: 'award', tone: 'green', href: '#/requests?status=completed' })}
          ${C.kpi({ label: 'Approved spend', value: inrShort(m.spend), hint: `${plural(m.approved.length, 'approved quotation')}`, icon: 'rupee', tone: 'indigo', href: '#/reports' })}
          ${C.kpi({ label: 'Average quotation', value: m.avgQuote ? inrShort(m.avgQuote) : '—', hint: `${plural(m.quotes.length, 'quotation')} received`, icon: 'fileText', tone: 'amber', href: '#/reports' })}
          ${C.kpi({ label: 'Avg vendor response', value: fmtHours(m.avgResponse), hint: 'Submission → first response', icon: 'clock', tone: 'teal', href: '#/reports' })}
          ${C.kpi({ label: 'Pending work', value: num(m.pending), hint: 'Open + active requests', icon: 'activity', tone: 'violet', href: '#/jobs' })}
        </section>

        <div class="grid-2">
          <section class="card"><div class="card-head"><h2>Monthly service expenditure</h2><span class="muted small">Approved quotations, incl. GST</span></div>
            ${m.monthly.some((x) => x.value) ? CC.charts.columns(m.monthly.map((x) => ({ label: x.label, value: x.value, extra: plural(x.count, 'job') })), { label: 'Monthly expenditure', format: (v) => inr(v), axisFormat: (v) => inrShort(v) }) : CC.ui.emptyState({ icon: 'chart', compact: true, title: 'No approved spend in this period' })}
          </section>
          <section class="card"><div class="card-head"><h2>Requests by city</h2><span class="muted small">${nonDraft} requests</span></div>
            ${CC.charts.barsH(m.byCity.map((x) => ({ label: x.c.name, value: x.n, tip: `${x.c.name}: ${x.n} request${x.n === 1 ? '' : 's'}` })), { label: 'Requests by city' })}
          </section>
          <section class="card"><div class="card-head"><h2>Jobs by status</h2></div>
            ${CC.charts.barsH(statusItems, { label: 'Jobs by status' })}
          </section>
          <section class="card"><div class="card-head"><h2>Completed vs pending work</h2></div>
            ${CC.charts.donut([
              { label: 'Completed', value: m.completed, color: 'var(--series-2)' },
              { label: 'In flight (approved → in progress)', value: m.reqs.filter((x) => S.ACTIVE.includes(x.status)).length, color: 'var(--series-3)' },
              { label: 'Awaiting quotation / decision', value: m.reqs.filter((x) => S.OPEN.includes(x.status)).length, color: 'var(--series-1)' },
              { label: 'Cancelled', value: m.reqs.filter((x) => x.status === 'cancelled').length, color: 'var(--series-neutral)' }
            ], { label: 'Completed versus pending work', caption: 'requests' })}
          </section>
        </div>

        <section class="card"><div class="card-head card-head-wrap"><div><h2>Vendor response performance</h2><p class="muted small">Response time is measured from submission to the vendor’s first acceptance or quotation.</p></div>
          <button type="button" class="btn btn-sm btn-secondary" data-action="export-report" data-kind="vendors">${icon('download', { size: 14 })} Export CSV</button></div>
          ${m.perf.length ? html`<div class="table-wrap"><table class="table responsive"><thead><tr><th scope="col">Vendor</th><th scope="col" class="num">Requests received</th><th scope="col" class="num">Quotations</th><th scope="col" class="num">Avg response</th><th scope="col" class="num">Win rate</th><th scope="col" class="num">Avg quotation</th></tr></thead>
            <tbody>${m.perf.map((p) => html`<tr><td data-label="Vendor">${C.vendorMini(p.vendor)}</td><td data-label="Requests received" class="num">${p.received}</td><td data-label="Quotations" class="num">${p.quotes}</td>
              <td data-label="Avg response" class="num">${p.avgHours == null ? html`<span class="muted">No response yet</span>` : html`<span class="resp ${p.avgHours <= 24 ? 'good' : p.avgHours <= 72 ? 'ok' : 'slow'}">${fmtHours(p.avgHours)}</span>`}</td>
              <td data-label="Win rate" class="num">${p.winRate == null ? '—' : `${Math.round(p.winRate * 100)}%`}</td><td data-label="Avg quotation" class="num">${p.avgQuote ? inr(p.avgQuote) : '—'}</td></tr>`)}</tbody></table></div>`
          : CC.ui.emptyState({ icon: 'users', compact: true, title: 'No vendor activity in this period' })}
        </section>

        <section class="card"><div class="card-head card-head-wrap"><div><h2>Average quotation amount by city</h2><p class="muted small">Includes all quotations received in the period.</p></div>
          <button type="button" class="btn btn-sm btn-secondary" data-action="export-report" data-kind="quotes">${icon('download', { size: 14 })} Export CSV</button></div>
          ${m.cityQuotes.length ? html`<div class="table-wrap"><table class="table responsive"><thead><tr><th scope="col">City</th><th scope="col" class="num">Quotations</th><th scope="col" class="num">Average</th><th scope="col" class="num">Lowest</th><th scope="col" class="num">Highest</th></tr></thead>
            <tbody>${m.cityQuotes.map((x) => html`<tr><td data-label="City">${x.city}</td><td data-label="Quotations" class="num">${x.count}</td><td data-label="Average" class="num fw-600">${inr(x.avg)}</td><td data-label="Lowest" class="num">${inr(x.min)}</td><td data-label="Highest" class="num">${inr(x.max)}</td></tr>`)}</tbody></table></div>`
          : CC.ui.emptyState({ icon: 'fileText', compact: true, title: 'No quotations in this period' })}
        </section>`;
    }
  };

  CC.changes['report-range'] = () => {
    const preset = $('#rp-preset').value;
    if (preset === 'custom' && R.preset !== 'custom') { R.from = ymd(addDays(new Date(), -90)); R.to = ymd(new Date()); }
    R.preset = preset;
    if (preset === 'custom' && $('#rp-from')) {
      const f = $('#rp-from').value, t = $('#rp-to').value;
      if (f && t && f > t) { toast('The start date must be before the end date.', 'error', { title: 'Invalid range' }); return; }
      if (f) R.from = f; if (t) R.to = t;
    }
    CC.app.render({ keepScroll: true });
  };

  CC.actions['export-report'] = (el) => {
    const m = compute();
    const tag = R.preset === 'custom' ? `${R.from}_to_${R.to}` : R.preset === 'all' ? 'all-time' : `last-${R.preset}-days`;
    if (el.dataset.kind === 'vendors') {
      CC.ui.downloadCSV(`cityconnect-vendor-performance-${tag}.csv`, [
        { label: 'Vendor (sample)', value: (p) => p.vendor.name }, { label: 'Requests received', value: (p) => p.received },
        { label: 'Quotations', value: (p) => p.quotes }, { label: 'Avg response (hours)', value: (p) => (p.avgHours == null ? '' : p.avgHours.toFixed(1)) },
        { label: 'Win rate (%)', value: (p) => (p.winRate == null ? '' : Math.round(p.winRate * 100)) }, { label: 'Avg quotation (INR)', value: (p) => (p.avgQuote ? Math.round(p.avgQuote) : '') }
      ], m.perf);
    } else if (el.dataset.kind === 'quotes') {
      CC.ui.downloadCSV(`cityconnect-quotations-by-city-${tag}.csv`, [
        { label: 'City', value: (x) => x.city }, { label: 'Quotations', value: (x) => x.count }, { label: 'Average (INR)', value: (x) => Math.round(x.avg) },
        { label: 'Lowest (INR)', value: (x) => x.min }, { label: 'Highest (INR)', value: (x) => x.max }
      ], m.cityQuotes);
    } else {
      const rows = [
        ['Requests raised', m.reqs.filter((x) => x.status !== 'draft').length], ['Completed jobs', m.completed], ['Pending work', m.pending],
        ['Approved spend (INR)', m.spend], ['Average quotation (INR)', Math.round(m.avgQuote)], ['Average vendor response (hours)', m.avgResponse == null ? '' : m.avgResponse.toFixed(1)],
        ...m.byCity.map((x) => [`Requests — ${x.c.name}`, x.n]),
        ...m.monthly.map((x) => [`Spend — ${x.label} (INR)`, x.value])
      ];
      CC.ui.downloadCSV(`cityconnect-summary-${tag}.csv`, [{ label: 'Metric', value: (r) => r[0] }, { label: 'Value', value: (r) => r[1] }], rows);
    }
  };
})();
