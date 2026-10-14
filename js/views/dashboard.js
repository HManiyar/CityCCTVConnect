/*
 * CityConnect — organisation dashboard (overview)
 * Every number here is derived from the store.
 */
(function () {
  'use strict';
  const CC = window.CC;
  const { html, raw, icon, esc, num, fmtDate, vendorLogo, stars, inr, $ } = CC.ui;
  const S = CC.store;
  const D = CC.data;
  const C = CC.components;

  const STATUS_COLORS = {
    draft: 'var(--st-neutral)', submitted: 'var(--st-info)', under_review: 'var(--st-violet)', quotation_received: 'var(--st-amber)',
    approved: 'var(--st-teal)', scheduled: 'var(--st-blue)', in_progress: 'var(--st-indigo)', completed: 'var(--st-success)', cancelled: 'var(--st-danger)'
  };

  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  function recentTable(requests) {
    if (!requests.length) return CC.ui.emptyState({ icon: 'clipboard', title: 'No service requests yet', text: 'Create your first request to start receiving quotations.', actions: html`<a class="btn btn-primary" href="#/requests/new">Create request</a>`, compact: true });
    return html`<div class="table-wrap"><table class="table responsive">
      <thead><tr><th scope="col">Request ID</th><th scope="col">City</th><th scope="col">Vendor</th><th scope="col">Service type</th><th scope="col">Submitted</th><th scope="col">Status</th></tr></thead>
      <tbody>
        ${requests.map((r) => html`<tr data-href="#/requests/${r.id}" tabindex="0" class="row-link">
          <td data-label="Request ID"><a href="#/requests/${r.id}" class="mono fw-600">${r.id}</a></td>
          <td data-label="City">${S.cityName(r.city)}</td>
          <td data-label="Vendor" class="truncate-cell">${C.requestVendorLabel(r)}</td>
          <td data-label="Service type">${S.serviceNames(r.services)}</td>
          <td data-label="Submitted" class="nowrap-cell">${fmtDate(r.createdAt)}</td>
          <td data-label="Status">${C.requestStatus(r)}</td>
        </tr>`)}
      </tbody></table></div>`;
  }

  function statusChart(requests) {
    const order = ['draft', 'submitted', 'under_review', 'quotation_received', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled'];
    const items = order.map((st) => ({ st, label: S.statusLabel(st), value: requests.filter((r) => r.status === st).length }))
      .filter((i) => i.value);
    const groups = [
      { label: 'Open', value: requests.filter((r) => S.OPEN.includes(r.status)).length, color: 'var(--series-1)' },
      { label: 'Active', value: requests.filter((r) => S.ACTIVE.includes(r.status)).length, color: 'var(--series-3)' },
      { label: 'Completed', value: requests.filter((r) => r.status === 'completed').length, color: 'var(--series-2)' },
      { label: 'Draft / cancelled', value: requests.filter((r) => ['draft', 'cancelled'].includes(r.status)).length, color: 'var(--series-neutral)' }
    ];
    return html`
      ${CC.charts.stacked(groups, { label: 'Requests by stage' })}
      <ul class="legend legend-inline">${groups.map((g) => html`<li><span class="swatch" style="background:${raw(g.color)}"></span>${g.label} <strong>${g.value}</strong></li>`)}</ul>
      ${CC.charts.barsH(items.map((i) => ({ label: i.label, value: i.value, prefix: html`<span class="dot-status" style="background:${raw(STATUS_COLORS[i.st])}"></span>`, tip: `${i.label}: ${i.value} request${i.value === 1 ? '' : 's'}` })), { label: 'Requests by status' })}`;
  }

  /** Projected bubble map of Gujarat cities sized by vendor coverage. */
  function coverageMap() {
    const W = 560, H = 380;
    const minLng = 69.3, maxLng = 73.7, minLat = 20.9, maxLat = 23.9;
    // Hand-placed labels where neighbouring cities are close together.
    const LABEL = { gandhinagar: [14, -6, 'start'], ahmedabad: [-14, 10, 'end'], anand: [-12, 16, 'end'], vadodara: [14, 6, 'start'], mehsana: [12, -10, 'start'] };
    const px = (lng) => 30 + ((lng - minLng) / (maxLng - minLng)) * (W - 60);
    const py = (lat) => 24 + ((maxLat - lat) / (maxLat - minLat)) * (H - 48);
    const reqs = S.getState().requests;
    const hq = S.city(S.getState().org.hqCity) || S.city('ahmedabad');
    const data = D.CITIES.map((c) => ({ c, vendors: S.vendorsInCity(c.id).length, requests: reqs.filter((r) => r.city === c.id && r.status !== 'draft').length }));
    const maxV = Math.max(...data.map((d) => d.vendors));
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="map-svg" role="img" aria-label="Map of vendor coverage across Gujarat cities">`;
    svg += '<defs><pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" class="map-dot"/></pattern></defs>';
    svg += `<rect width="${W}" height="${H}" fill="url(#dots)" rx="12"/>`;
    data.forEach((d) => {
      if (d.c.id !== hq.id && d.requests) {
        svg += `<path d="M${px(hq.lng)},${py(hq.lat)} Q${(px(hq.lng) + px(d.c.lng)) / 2},${Math.min(py(hq.lat), py(d.c.lat)) - 40} ${px(d.c.lng)},${py(d.c.lat)}" class="map-link"/>`;
      }
    });
    data.forEach((d) => {
      const r = 7 + (d.vendors / maxV) * 15;
      const x = px(d.c.lng), y = py(d.c.lat);
      const tip = `${d.c.name}: ${d.vendors} vendor${d.vendors === 1 ? '' : 's'} · ${d.requests} request${d.requests === 1 ? '' : 's'}`;
      svg += `<a href="#/vendors?city=${d.c.id}" class="map-city" data-chart-tip="${esc(tip)}" aria-label="${esc(tip)}">`;
      svg += `<circle cx="${x}" cy="${y}" r="${r + 6}" class="map-halo"/><circle cx="${x}" cy="${y}" r="${r}" class="map-bubble ${d.c.id === hq.id ? 'hq' : ''}"/>`;
      svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" class="map-count">${d.vendors}</text>`;
      const lp = LABEL[d.c.id];
      const lx = lp ? x + Math.sign(lp[0]) * (r + Math.abs(lp[0]) - 8) : x;
      const ly = lp ? y + lp[1] : y + r + 15;
      svg += `<text x="${lx}" y="${ly}" text-anchor="${lp ? lp[2] : 'middle'}" class="map-label">${esc(d.c.name)}${d.c.id === hq.id ? ' (HQ)' : ''}</text></a>`;
    });
    svg += '</svg>';
    const top = data.slice().sort((a, b) => b.vendors - a.vendors).slice(0, 6);
    return html`<div class="map-grid">
      <div class="map-box">${raw(svg)}<p class="muted xsmall map-note">Positions are approximate. Bubble size = vendors covering the city; lines link HQ to cities with requests.</p></div>
      <div>
        <p class="eyebrow mb-2">Top coverage</p>
        ${CC.charts.barsH(top.map((d) => ({ label: d.c.name, value: d.vendors, display: `${d.vendors}`, tip: `${d.c.name}: ${d.vendors} vendors` })), { label: 'Vendors per city' })}
        <a class="btn btn-ghost btn-sm mt-2" href="#/directory">View vendor directory ${icon('arrowRight', { size: 14 })}</a>
      </div>
    </div>`;
  }

  function recommended(cityId, serviceId) {
    const recs = S.recommendVendors(cityId, serviceId ? [serviceId] : [], 3);
    if (!recs.length) {
      return CC.ui.emptyState({ icon: 'search', compact: true, title: `No vendors offer this service in ${S.cityName(cityId)}`, text: 'Try a different service or a nearby city.', actions: html`<a class="btn btn-secondary btn-sm" href="#/vendors?city=${cityId}">See all vendors in ${S.cityName(cityId)}</a>` });
    }
    return html`<div class="rec-grid">${recs.map(({ vendor: v, score }) => html`<article class="rec-card">
      <div class="rec-head">${vendorLogo(v, 40)}<div><h3><a href="#/vendors/${v.id}">${v.name}</a></h3>
        <p class="muted small">${stars(v.rating, 12)} ${v.rating.toFixed(1)} · ${v.experience} yrs · ${S.cityName(v.baseCity)}</p></div>
        <span class="match-pill" data-tip="Match score (rating, experience, service fit, location, availability)">${score}%</span></div>
      <div class="rec-meta">${C.availabilityPill(v)}<span class="muted small">${inr(v.pricing.perCamera)}/camera · ~${v.responseHours} h response</span></div>
      <div class="rec-actions"><a class="btn btn-secondary btn-sm" href="#/vendors/${v.id}">Profile</a><a class="btn btn-primary btn-sm" href="#/requests/new?vendor=${v.id}&city=${cityId}${serviceId ? `&service=${serviceId}` : ''}">Request quote</a></div>
    </article>`)}</div>`;
  }

  CC.views.dashboard = {
    title: 'Dashboard',
    render() {
      const st = S.getState();
      const s = S.stats();
      const reqs = st.requests.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const recent = reqs.filter((r) => r.status !== 'draft').slice(0, 6);
      const recCity = st.settings.recommendCity || 'rajkot';
      const recService = st.settings.recommendService || '';
      const awaiting = st.requests.filter((r) => r.status === 'quotation_received');
      const signoff = st.requests.filter((r) => r.completionPending);

      return html`
        ${C.pageHeader({
          title: `${greeting()}, ${st.org.user.name.split(' ')[0]}`,
          subtitle: `CCTV service coordination for ${st.org.name} across ${s.citiesCovered} Gujarat cities.`,
          actions: html`<a class="btn btn-secondary" href="#/vendors">${icon('search')} Find a vendor</a><a class="btn btn-primary" href="#/requests/new">${icon('plus')} New request</a>`
        })}

        ${awaiting.length || signoff.length ? html`<div class="callout callout-info mb-4">
          ${icon('sparkles')}
          <div>
            ${awaiting.length ? html`<p><strong>${awaiting.length} request${awaiting.length > 1 ? 's have' : ' has'} quotations to review:</strong> ${awaiting.map((r, i) => html`${i ? ', ' : ''}<a href="#/requests/${r.id}/compare">${r.id} (${S.cityName(r.city)})</a>`)}</p>` : ''}
            ${signoff.length ? html`<p><strong>Ready for sign-off:</strong> ${signoff.map((r, i) => html`${i ? ', ' : ''}<a href="#/requests/${r.id}">${r.id}</a>`)}</p>` : ''}
          </div>
        </div>` : ''}

        <section class="kpi-grid" aria-label="Key metrics">
          ${C.kpi({ label: 'Total Vendors', value: num(s.totalVendors), hint: `${s.verifiedVendors} verified (sample)`, icon: 'building', tone: 'blue', href: '#/directory' })}
          ${C.kpi({ label: 'Cities Covered', value: num(s.citiesCovered), hint: 'Across Gujarat', icon: 'mapPin', tone: 'teal', href: '#/vendors' })}
          ${C.kpi({ label: 'Open Service Requests', value: num(s.openRequests), hint: `${s.drafts} draft${s.drafts === 1 ? '' : 's'}`, icon: 'clipboard', tone: 'violet', href: '#/requests?status=open' })}
          ${C.kpi({ label: 'Active Jobs', value: num(s.activeJobs), hint: 'Approved → in progress', icon: 'hardHat', tone: 'indigo', href: '#/jobs' })}
          ${C.kpi({ label: 'Completed Jobs', value: num(s.completedJobs), hint: 'All time', icon: 'award', tone: 'green', href: '#/requests?status=completed' })}
          ${C.kpi({ label: 'Pending Quotations', value: num(s.pendingQuotes), hint: 'Awaiting your decision', icon: 'fileText', tone: 'amber', href: '#/requests?status=quotation_received' })}
        </section>

        <section class="card mb-4">
          <div class="card-head"><h2>Recent service requests</h2><a class="link" href="#/requests">View all ${icon('arrowRight', { size: 14 })}</a></div>
          ${recentTable(recent)}
        </section>

        <div class="grid-2-1">
          <section class="card">
            <div class="card-head"><h2>City coverage</h2><span class="muted small">Vendor presence by city</span></div>
            ${coverageMap()}
          </section>
          <section class="card">
            <div class="card-head"><h2>Request status</h2><span class="muted small">${s.total} total</span></div>
            ${statusChart(st.requests)}
          </section>
        </div>

        <div class="grid-2">
            <section class="card">
              <div class="card-head"><h2>Quick actions</h2></div>
              <div class="quick-actions">
                <a href="#/vendors" class="qa">${icon('search')}<span><strong>Find a Vendor</strong><span class="muted small">Search by city, service or PIN</span></span>${icon('chevronRight', { size: 16 })}</a>
                <a href="#/requests/new" class="qa">${icon('plus')}<span><strong>Create Request</strong><span class="muted small">5-step guided request</span></span>${icon('chevronRight', { size: 16 })}</a>
                <a href="#/jobs" class="qa">${icon('hardHat')}<span><strong>View Active Jobs</strong><span class="muted small">${s.activeJobs} job${s.activeJobs === 1 ? '' : 's'} in flight</span></span>${icon('chevronRight', { size: 16 })}</a>
              </div>
            </section>
            <section class="card">
              <div class="card-head"><h2>Recent activity</h2></div>
              ${C.activityList(st.activity.slice(0, 5))}
            </section>
        </div>

        <section class="card">
          <div class="card-head card-head-wrap">
            <div><h2>Recommended vendors</h2><p class="muted small">Ranked by rating, experience, service fit, local presence and availability.</p></div>
            <div class="inline-filters">
              <label class="sr-only" for="rec-city">City</label>
              <select id="rec-city" class="input input-sm" data-change="rec-filter">${D.CITIES.map((c) => html`<option value="${c.id}" ${c.id === recCity ? 'selected' : ''}>${c.name}</option>`)}</select>
              <label class="sr-only" for="rec-service">Service</label>
              <select id="rec-service" class="input input-sm" data-change="rec-filter"><option value="">Any service</option>${D.SERVICES.map((sv) => html`<option value="${sv.id}" ${sv.id === recService ? 'selected' : ''}>${sv.name}</option>`)}</select>
            </div>
          </div>
          <div id="rec-vendors">${recommended(recCity, recService)}</div>
        </section>`;
    }
  };

  CC.changes['rec-filter'] = () => {
    const city = $('#rec-city').value, service = $('#rec-service').value;
    S.setSetting('recommendCity', city);
    S.setSetting('recommendService', service);
    $('#rec-vendors').innerHTML = String(recommended(city, service));
  };
})();
