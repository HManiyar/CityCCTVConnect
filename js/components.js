/*
 * CityConnect — reusable view components
 */
(function () {
  'use strict';
  const { html, icon, img, vendorLogo, stars, inr, num, fmtDate, relTime, plural } = window.CC.ui;
  const S = window.CC.store;

  function statusBadge(status, opts = {}) {
    const st = S.STATUSES[status] || { label: status, tone: 'neutral' };
    return html`<span class="badge badge-${st.tone} ${opts.lg ? 'badge-lg' : ''}"><span class="dot"></span>${st.label}</span>`;
  }

  /** Request status with the "awaiting sign-off" sub-state. */
  function requestStatus(req, opts) {
    if (req.status === 'in_progress' && req.completionPending) {
      return html`<span class="badge badge-amber ${opts && opts.lg ? 'badge-lg' : ''}"><span class="dot"></span>Awaiting sign-off</span>`;
    }
    return statusBadge(req.status, opts);
  }

  const QUOTE_STATUS = {
    submitted: ['Awaiting decision', 'amber'], approved: ['Approved', 'success'], rejected: ['Declined', 'danger'],
    not_selected: ['Not selected', 'neutral'], superseded: ['Revised', 'neutral'], closed: ['Closed', 'neutral']
  };
  function quoteBadge(status) {
    const [label, tone] = QUOTE_STATUS[status] || [status, 'neutral'];
    return html`<span class="badge badge-${tone}"><span class="dot"></span>${label}</span>`;
  }

  function pageHeader(o) {
    return html`<header class="page-header">
      <div class="page-header-text">
        ${o.breadcrumb ? html`<nav class="breadcrumb" aria-label="Breadcrumb">${o.breadcrumb.map((b, i) => html`${i ? html`<span aria-hidden="true">${icon('chevronRight', { size: 14 })}</span>` : ''}${b.href ? html`<a href="${b.href}">${b.label}</a>` : html`<span aria-current="page">${b.label}</span>`}`)}</nav>` : ''}
        <h1 class="page-title" tabindex="-1">${o.title}</h1>
        ${o.subtitle ? html`<p class="page-subtitle">${o.subtitle}</p>` : ''}
      </div>
      ${o.actions ? html`<div class="page-actions">${o.actions}</div>` : ''}
    </header>`;
  }

  function availability(v) {
    const d = v.nextAvailableDays;
    if (d === 0) return { text: 'Available today', tone: 'success' };
    if (d === 1) return { text: 'Available tomorrow', tone: 'success' };
    if (d <= 3) return { text: `Next slot in ${d} days`, tone: 'amber' };
    return { text: `Limited · next slot in ${d} days`, tone: 'neutral' };
  }
  function availabilityPill(v) {
    const a = availability(v);
    return html`<span class="avail avail-${a.tone}"><span class="dot"></span>${a.text}</span>`;
  }

  function verifiedBadge(v, small) {
    if (!v.verified) return '';
    return html`<span class="verified ${small ? 'sm' : ''}" data-tip="Verification status is sample data for this demo">${icon('shieldCheck', { size: small ? 14 : 16 })}<span>Verified</span></span>`;
  }

  function serviceChips(ids, max = 3, highlight = []) {
    const shown = ids.slice(0, max);
    return html`<div class="chips">${shown.map((id) => html`<span class="chip ${highlight.includes(id) ? 'chip-match' : ''}">${(S.service(id) || {}).short || id}</span>`)}${ids.length > max ? html`<span class="chip chip-more" data-tip="${ids.slice(max).map((i) => S.serviceName(i)).join(', ')}">+${ids.length - max}</span>` : ''}</div>`;
  }

  function vendorCard(v, opts = {}) {
    const coverage = v.cities.map(S.cityName);
    return html`<article class="card vendor-card">
      <a class="vc-cover" href="#/vendors/${v.id}" tabindex="-1" aria-hidden="true">
        ${img(v.cover, '', { w: 640, fallback: 'cover' })}
        <span class="vc-cover-badges">
          ${v.emergency ? html`<span class="pill-dark">${icon('zap', { size: 13 })} 24h emergency</span>` : ''}
        </span>
        ${opts.score != null ? html`<span class="match-score" data-tip="Match score based on rating, experience, service fit, location and availability">${opts.score}% match</span>` : ''}
      </a>
      <div class="vc-body">
        <div class="vc-head">
          ${vendorLogo(v, 44)}
          <div class="vc-title">
            <h3><a href="#/vendors/${v.id}">${v.name}</a></h3>
            <p class="muted small">${icon('mapPin', { size: 13 })} ${S.cityName(v.baseCity)} · ${v.experience} yrs experience</p>
          </div>
        </div>
        <div class="vc-rating">
          ${stars(v.rating)} <strong>${v.rating.toFixed(1)}</strong> <span class="muted">(${num(v.reviewCount)} reviews)</span>
          ${verifiedBadge(v, true)}
        </div>
        <p class="vc-desc">${v.description}</p>
        ${serviceChips(v.services, 3, opts.highlightServices || [])}
        <dl class="vc-meta">
          <div><dt>${icon('globe', { size: 14 })} Covers</dt><dd title="${coverage.join(', ')}">${coverage.slice(0, 3).join(', ')}${coverage.length > 3 ? ` +${coverage.length - 3}` : ''}</dd></div>
          <div><dt>${icon('rupee', { size: 14 })} Indicative</dt><dd>${inr(v.pricing.perCamera)}<span class="muted"> / camera</span></dd></div>
          <div><dt>${icon('calendar', { size: 14 })} Availability</dt><dd>${availabilityPill(v)}</dd></div>
          <div><dt>${icon('clock', { size: 14 })} Response</dt><dd>~${v.responseHours} h</dd></div>
        </dl>
        <div class="vc-actions">
          <a class="btn btn-secondary" href="#/vendors/${v.id}">View Profile</a>
          <a class="btn btn-primary" href="#/requests/new?vendor=${v.id}${opts.city ? `&city=${opts.city}` : ''}">Request Quote</a>
        </div>
        <p class="sample-tag">${icon('info', { size: 12 })} Sample listing</p>
      </div>
    </article>`;
  }

  function kpi(o) {
    return html`<a class="card kpi" href="${o.href || '#/dashboard'}">
      <span class="kpi-icon tone-${o.tone || 'blue'}">${icon(o.icon, { size: 20 })}</span>
      <span class="kpi-text">
        <span class="kpi-label">${o.label}</span>
        <span class="kpi-value">${o.value}</span>
        ${o.hint ? html`<span class="kpi-hint">${o.hint}</span>` : ''}
      </span>
    </a>`;
  }

  /** Lifecycle stepper for a request. */
  function lifecycleStepper(req) {
    const steps = S.LIFECYCLE;
    const cancelled = req.status === 'cancelled';
    const reached = new Set(req.history.map((h) => h.status).filter(Boolean));
    const currentIdx = cancelled ? -1 : steps.indexOf(req.status);
    return html`<ol class="stepper" aria-label="Request lifecycle">
      ${steps.map((s, i) => {
        const done = cancelled ? reached.has(s) : i < currentIdx || (i === currentIdx && s === 'completed');
        const cur = !cancelled && i === currentIdx && s !== 'completed';
        return html`<li class="step ${done ? 'done' : ''} ${cur ? 'current' : ''}" ${cur ? html`aria-current="step"` : ''}>
          <span class="step-dot">${done ? icon('check', { size: 12, stroke: 3 }) : ''}</span>
          <span class="step-label">${S.statusLabel(s)}</span>
        </li>`;
      })}
      ${cancelled ? html`<li class="step cancelled current"><span class="step-dot">${icon('x', { size: 12, stroke: 3 })}</span><span class="step-label">Cancelled</span></li>` : ''}
    </ol>`;
  }

  function historyTimeline(req) {
    const items = req.history.slice().reverse();
    return html`<ol class="timeline">
      ${items.map((h) => html`<li class="tl-item">
        <span class="tl-dot ${h.status ? 'tone-' + (S.STATUSES[h.status] || {}).tone : 'tone-neutral'}"></span>
        <div class="tl-content">
          <div class="tl-head">${h.status ? statusBadge(h.status) : html`<strong class="small">Update</strong>`}<time datetime="${h.at}" class="muted small" title="${fmtDate(h.at)}">${relTime(h.at)}</time></div>
          ${h.note ? html`<p>${h.note}</p>` : ''}
          <p class="muted small">${h.by === 'org' ? 'Organisation' : h.by === 'vendor' ? 'Vendor' : 'System'}${h.actor ? ` · ${h.actor}` : ''}</p>
        </div>
      </li>`)}
    </ol>`;
  }

  function activityList(items, opts = {}) {
    if (!items.length) return html`<p class="muted small">No activity yet.</p>`;
    const ICON = { quote: 'fileText', approved: 'checkCircle', completed: 'award', in_progress: 'hardHat', scheduled: 'calendarCheck', submitted: 'send', cancelled: 'xCircle', under_review: 'eye', progress: 'activity', message: 'message', draft: 'edit', invite: 'users', declined: 'xCircle', quotation_received: 'fileText', vendor_complete: 'flag', issue: 'alert', edit: 'edit', quote_rejected: 'xCircle' };
    return html`<ol class="activity">
      ${items.map((a) => html`<li>
        <span class="activity-icon">${icon(ICON[a.type] || 'activity', { size: 15 })}</span>
        <div>
          <p>${a.requestId && !opts.noLink ? html`<a href="#/requests/${a.requestId}">${a.text}</a>` : a.text}</p>
          <time class="muted small" datetime="${a.at}">${relTime(a.at)}</time>
        </div>
      </li>`)}
    </ol>`;
  }

  function progressBar(pct, opts = {}) {
    return html`<div class="progress ${opts.sm ? 'sm' : ''}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${opts.label || 'Progress'}"><span style="width:${pct}%"></span></div>`;
  }

  function infoRow(label, value) {
    return html`<div class="info-row"><dt>${label}</dt><dd>${value == null || value === '' ? '—' : value}</dd></div>`;
  }

  function vendorMini(v, sub) {
    if (!v) return html`<span class="muted">Not assigned</span>`;
    return html`<span class="vendor-mini">${vendorLogo(v, 28)}<span><a href="#/vendors/${v.id}">${v.name}</a>${sub ? html`<span class="muted small d-block">${sub}</span>` : ''}</span></span>`;
  }

  function requestVendorLabel(req) {
    if (req.vendorId) return S.vendor(req.vendorId).name;
    if (req.invited.length) return `${plural(req.invited.length, 'vendor')} invited`;
    return 'Not selected';
  }

  window.CC.components = {
    statusBadge, requestStatus, quoteBadge, pageHeader, availability, availabilityPill, verifiedBadge, serviceChips,
    vendorCard, kpi, lifecycleStepper, historyTimeline, activityList, progressBar, infoRow, vendorMini, requestVendorLabel
  };
})();
