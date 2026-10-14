/*
 * CityConnect — service request management (organisation side):
 * request list, request detail, quotation comparison and active jobs.
 */
(function () {
  'use strict';
  const CC = window.CC;
  const { html, raw, icon, inr, fmtDate, fmtDateTime, relTime, vendorLogo, stars, $, $$, toast, confirm, plural, debounce, daysBetween, fileSize, ymd } = CC.ui;
  const S = CC.store;
  const D = CC.data;
  const C = CC.components;

  /* ======================= Request list ======================= */

  const GROUPS = {
    all: { label: 'All', test: () => true },
    open: { label: 'Open', test: (r) => S.OPEN.includes(r.status) },
    active: { label: 'Active', test: (r) => S.ACTIVE.includes(r.status) },
    completed: { label: 'Completed', test: (r) => r.status === 'completed' },
    draft: { label: 'Drafts', test: (r) => r.status === 'draft' },
    cancelled: { label: 'Cancelled', test: (r) => r.status === 'cancelled' }
  };
  const L = { group: 'all', status: '', q: '', city: '', sort: 'newest' };
  let lastListQuery = null;

  function listRows() {
    const t = L.q.trim().toLowerCase();
    const rows = S.getState().requests.filter((r) => {
      if (!GROUPS[L.group].test(r)) return false;
      if (L.status && r.status !== L.status) return false;
      if (L.city && r.city !== L.city) return false;
      if (t) {
        const v = r.vendorId ? S.vendor(r.vendorId).name : r.invited.map((id) => S.vendor(id).name).join(' ');
        const hay = `${r.id} ${S.cityName(r.city)} ${r.area} ${r.address} ${S.serviceNames(r.services)} ${v} ${S.statusLabel(r.status)}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    });
    const sorters = {
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt), oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
      updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt), date: (a, b) => a.preferredDate.localeCompare(b.preferredDate),
      budget: (a, b) => b.budget - a.budget
    };
    return rows.sort(sorters[L.sort]);
  }

  function rowActions(r) {
    const quotes = S.quotesFor(r.id).filter((q) => q.status === 'submitted');
    const acts = [html`<a class="btn btn-sm btn-ghost" href="#/requests/${r.id}">View</a>`];
    if (r.status === 'quotation_received' && quotes.length) acts.push(html`<a class="btn btn-sm btn-primary" href="#/requests/${r.id}/compare">Compare (${quotes.length})</a>`);
    else if (r.completionPending) acts.push(html`<button type="button" class="btn btn-sm btn-primary" data-action="confirm-completion" data-id="${r.id}">Confirm</button>`);
    else if (r.status === 'draft') acts.push(html`<a class="btn btn-sm btn-secondary" href="#/requests/${r.id}/edit">Continue</a>`);
    else if (S.EDITABLE.includes(r.status)) acts.push(html`<a class="btn btn-sm btn-secondary" href="#/requests/${r.id}/edit">Edit</a>`);
    return html`<div class="row-actions">${acts}</div>`;
  }

  function listTable() {
    const rows = listRows();
    if (!rows.length) {
      const any = S.getState().requests.length;
      return CC.ui.emptyState({
        icon: 'clipboard', title: any ? 'No requests match your filters' : 'No service requests yet',
        text: any ? 'Try a different search term or status.' : 'Create a request to start receiving vendor quotations.',
        actions: any ? html`<button type="button" class="btn btn-secondary" data-action="list-reset">Clear filters</button>` : html`<a class="btn btn-primary" href="#/requests/new">Create request</a>`
      });
    }
    return html`<div class="table-wrap"><table class="table responsive">
      <thead><tr><th scope="col">Request ID</th><th scope="col">Service type</th><th scope="col">City</th><th scope="col">Site location</th><th scope="col">Selected vendor</th><th scope="col">Created</th><th scope="col">Preferred date</th><th scope="col" class="num">Budget</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${rows.map((r) => html`<tr>
        <td data-label="Request ID"><a class="mono fw-600" href="#/requests/${r.id}">${r.id}</a></td>
        <td data-label="Service type">${S.serviceNames(r.services)}</td>
        <td data-label="City">${S.cityName(r.city)}</td>
        <td data-label="Site location" class="truncate-cell">${r.area}<span class="muted xsmall d-block">${S.siteTypeName(r.siteType)}</span></td>
        <td data-label="Selected vendor" class="truncate-cell">${C.requestVendorLabel(r)}</td>
        <td data-label="Created">${fmtDate(r.createdAt)}</td>
        <td data-label="Preferred date">${fmtDate(r.preferredDate)}</td>
        <td data-label="Budget" class="num">${inr(r.budget)}</td>
        <td data-label="Status">${C.requestStatus(r)}</td>
        <td data-label="Actions">${rowActions(r)}</td>
      </tr>`)}</tbody></table></div>
      <p class="muted small mt-2">${plural(rows.length, 'request')}</p>`;
  }

  CC.views.requests = {
    title: 'Service Requests',
    render(ctx) {
      const qs = new URLSearchParams(ctx.query).toString();
      if (qs !== lastListQuery) {
        lastListQuery = qs;
        const st = ctx.query.status;
        if (st && GROUPS[st]) { L.group = st; L.status = ''; }
        else if (st && S.STATUSES[st]) { L.group = 'all'; L.status = st; }
      }
      const reqs = S.getState().requests;
      return html`
        ${C.pageHeader({ title: 'Service requests', subtitle: 'Track every CCTV request from submission to completion.',
          actions: html`<button type="button" class="btn btn-secondary" data-action="list-export">${icon('download')} Export CSV</button><a class="btn btn-primary" href="#/requests/new">${icon('plus')} New request</a>` })}
        <div class="seg-tabs" role="tablist" aria-label="Request groups">
          ${Object.entries(GROUPS).map(([k, g]) => html`<button type="button" role="tab" aria-selected="${L.group === k}" class="seg-tab ${L.group === k ? 'active' : ''}" data-action="list-group" data-group="${k}">${g.label}<span class="tab-count">${reqs.filter(g.test).length}</span></button>`)}
        </div>
        <section class="card">
          <div class="toolbar">
            <div class="input-icon">${icon('search', { size: 16 })}<label class="sr-only" for="rq-q">Search requests</label><input id="rq-q" class="input" type="search" value="${L.q}" placeholder="Search ID, city, site, vendor…" data-input="list-q"></div>
            <label class="sr-only" for="rq-status">Status</label>
            <select id="rq-status" class="input" data-change="list"><option value="">All statuses</option>${Object.keys(S.STATUSES).map((s) => html`<option value="${s}" ${L.status === s ? 'selected' : ''}>${S.statusLabel(s)}</option>`)}</select>
            <label class="sr-only" for="rq-city">City</label>
            <select id="rq-city" class="input" data-change="list"><option value="">All cities</option>${D.CITIES.map((c) => html`<option value="${c.id}" ${L.city === c.id ? 'selected' : ''}>${c.name}</option>`)}</select>
            <label class="sr-only" for="rq-sort">Sort</label>
            <select id="rq-sort" class="input" data-change="list">${[['newest', 'Newest first'], ['oldest', 'Oldest first'], ['updated', 'Recently updated'], ['date', 'Preferred date'], ['budget', 'Highest budget']].map(([v, l]) => html`<option value="${v}" ${L.sort === v ? 'selected' : ''}>Sort: ${l}</option>`)}</select>
          </div>
          <div id="rq-table">${listTable()}</div>
        </section>`;
    }
  };
  const repaintList = () => { const t = $('#rq-table'); if (t) t.innerHTML = String(listTable()); };
  CC.inputs['list-q'] = debounce((el) => { L.q = el.value; repaintList(); }, 150);
  CC.changes.list = () => { L.status = $('#rq-status').value; L.city = $('#rq-city').value; L.sort = $('#rq-sort').value; repaintList(); };
  Object.assign(CC.actions, {
    'list-group': (el) => { L.group = el.dataset.group; L.status = ''; CC.app.render({ keepScroll: true }); },
    'list-reset': () => { Object.assign(L, { group: 'all', status: '', q: '', city: '' }); CC.app.render({ keepScroll: true }); },
    'list-export': () => CC.ui.downloadCSV('cityconnect-service-requests.csv', [
      { label: 'Request ID', value: (r) => r.id }, { label: 'Status', value: (r) => S.statusLabel(r.status) },
      { label: 'Services', value: (r) => r.services.map(S.serviceName).join('; ') }, { label: 'City', value: (r) => S.cityName(r.city) },
      { label: 'Area', value: (r) => r.area }, { label: 'PIN', value: (r) => r.pin }, { label: 'Site type', value: (r) => S.siteTypeName(r.siteType) },
      { label: 'Cameras', value: (r) => r.cameras }, { label: 'Vendor', value: (r) => C.requestVendorLabel(r) },
      { label: 'Created', value: (r) => ymd(r.createdAt) }, { label: 'Preferred date', value: (r) => r.preferredDate },
      { label: 'Budget (INR)', value: (r) => r.budget }, { label: 'Approved amount (INR)', value: (r) => (r.approvedQuoteId ? S.quote(r.approvedQuoteId).total : '') }
    ], listRows())
  });

  /* ======================= Request detail ======================= */

  function detailActions(r) {
    const a = [];
    const pendingQuotes = S.quotesFor(r.id).filter((q) => q.status === 'submitted').length;
    if (r.status === 'draft') a.push(html`<a class="btn btn-primary" href="#/requests/${r.id}/edit">${icon('edit')} Continue & submit</a>`);
    if (r.status === 'quotation_received' && pendingQuotes) a.push(html`<a class="btn btn-primary" href="#/requests/${r.id}/compare">${icon('scale')} Compare quotations (${pendingQuotes})</a>`);
    if (r.completionPending) {
      a.push(html`<button type="button" class="btn btn-primary" data-action="confirm-completion" data-id="${r.id}">${icon('checkCircle')} Confirm completion</button>`);
      a.push(html`<button type="button" class="btn btn-secondary" data-action="report-issue" data-id="${r.id}">${icon('alert')} Report an issue</button>`);
    }
    if (S.EDITABLE.includes(r.status) && r.status !== 'draft') a.push(html`<a class="btn btn-secondary" href="#/requests/${r.id}/edit">${icon('edit')} Edit</a>`);
    if (S.OPEN.includes(r.status)) a.push(html`<button type="button" class="btn btn-secondary" data-action="invite-vendors" data-id="${r.id}">${icon('users')} Invite vendors</button>`);
    if (r.vendorId && S.ACTIVE.includes(r.status)) a.push(html`<button type="button" class="btn btn-secondary" data-action="contact-vendor" data-id="${r.vendorId}">${icon('message')} Message vendor</button>`);
    if (S.CANCELLABLE.includes(r.status)) a.push(html`<button type="button" class="btn btn-ghost btn-danger-text" data-action="cancel-request" data-id="${r.id}">${icon('xCircle')} ${r.status === 'draft' ? 'Discard draft' : 'Cancel request'}</button>`);
    if (r.status === 'in_progress' && !r.completionPending) a.push(html`<span class="muted small" data-tip="Requests can’t be cancelled once work has started">${icon('lock', { size: 13 })} Cancellation locked</span>`);
    if (r.status === 'completed' || r.status === 'cancelled') a.push(html`<a class="btn btn-secondary" href="#/requests/new?city=${r.city}&service=${r.services[0]}">${icon('plus')} Create similar request</a>`);
    return a;
  }

  function quotesSummary(r) {
    const quotes = S.quotesFor(r.id).filter((q) => q.status !== 'superseded');
    if (!quotes.length) {
      if (r.status === 'draft' || r.status === 'cancelled') return '';
      return html`<section class="card"><div class="card-head"><h2>Quotations</h2></div>
        ${CC.ui.emptyState({ icon: 'fileText', compact: true, title: 'No quotations yet', text: r.invited.length ? `Waiting for ${plural(r.invited.length, 'invited vendor')} to respond. Vendors typically quote within 1–3 days.` : 'Invite vendors to start receiving quotations.' })}</section>`;
    }
    return html`<section class="card"><div class="card-head"><h2>Quotations</h2>${quotes.length > 0 ? html`<a class="link" href="#/requests/${r.id}/compare">${icon('scale', { size: 14 })} ${quotes.some((q) => q.status === 'submitted') ? 'Compare & decide' : 'View comparison'}</a>` : ''}</div>
      <ul class="quote-list">${quotes.map((q) => {
        const v = S.vendor(q.vendorId);
        return html`<li>${vendorLogo(v, 32)}<div class="grow"><strong>${v.name}</strong><span class="muted xsmall d-block">Submitted ${relTime(q.createdAt)}${q.revision > 1 ? ` · revision ${q.revision}` : ''} · start ${fmtDate(q.proposedDate)} · ${q.completionDays} day${q.completionDays === 1 ? '' : 's'}</span></div>
          <div class="text-right"><strong>${inr(q.total)}</strong><span class="d-block">${C.quoteBadge(q.status)}</span></div></li>`;
      })}</ul></section>`;
  }

  function vendorsPanel(r) {
    if (r.vendorId) {
      const v = S.vendor(r.vendorId);
      const q = r.approvedQuoteId ? S.quote(r.approvedQuoteId) : null;
      return html`<section class="card"><div class="card-head"><h2>${q ? 'Assigned vendor' : 'Selected vendor'}</h2></div>
        <div class="selected-vendor">${vendorLogo(v, 44)}<div><a class="fw-600" href="#/vendors/${v.id}">${v.name}</a><span class="muted small d-block">${stars(v.rating, 12)} ${v.rating.toFixed(1)} · ${S.cityName(v.baseCity)}</span></div></div>
        ${q ? html`<dl class="info-grid mt-3">${C.infoRow('Approved amount', html`<strong>${inr(q.total)}</strong>`)}${C.infoRow('Warranty', q.warranty)}${C.infoRow('Completion time', plural(q.completionDays, 'day'))}</dl>` : ''}
        ${!q ? responseLine(r, v.id) : ''}
        <ul class="contact-list mt-3"><li>${icon('user', { size: 15 })}<span>${v.contact.person} · ${v.contact.role}</span></li><li>${icon('phone', { size: 15 })}<span>${v.contact.phone}</span></li></ul>
        <p class="muted xsmall">Sample contact details.</p>
      </section>`;
    }
    if (!r.invited.length) {
      return html`<section class="card"><div class="card-head"><h2>Vendors</h2></div>${CC.ui.emptyState({ icon: 'users', compact: true, title: 'No vendors selected', text: r.status === 'draft' ? 'Choose vendors when you submit this draft.' : 'Invite vendors to receive quotations.', actions: r.status === 'draft' ? html`<a class="btn btn-sm btn-primary" href="#/requests/${r.id}/edit">Continue draft</a>` : '' })}</section>`;
    }
    return html`<section class="card"><div class="card-head"><h2>Invited vendors</h2><span class="muted small">${r.invited.length}</span></div>
      <ul class="plain-list vendor-responses">${r.invited.map((id) => html`<li>${C.vendorMini(S.vendor(id))}${responseLine(r, id)}</li>`)}</ul></section>`;
  }

  function responseLine(r, vid) {
    const resp = r.responses[vid];
    const quoted = S.quotesFor(r.id).some((q) => q.vendorId === vid && q.status !== 'superseded');
    if (quoted) return html`<span class="badge badge-amber">Quoted</span>`;
    if (!resp) return html`<span class="badge badge-neutral">Awaiting response</span>`;
    if (resp.status === 'declined') return html`<span class="badge badge-danger" ${resp.reason ? raw(`data-tip="${CC.ui.esc(resp.reason)}"`) : ''}>Declined</span>`;
    return html`<span class="badge badge-violet">Reviewing</span>`;
  }

  function progressPanel(r) {
    if (!['scheduled', 'in_progress', 'completed', 'approved'].includes(r.status)) return '';
    const updates = r.progressUpdates.slice().reverse();
    const next = { approved: 'Waiting for the vendor to confirm a service date.', scheduled: `Work is scheduled for ${fmtDate(r.scheduledDate)}.`, in_progress: r.completionPending ? 'The vendor has marked the job complete — please review and confirm.' : 'Technicians are working on site.', completed: 'Job completed and signed off.' }[r.status];
    return html`<section class="card"><div class="card-head"><h2>Job progress</h2><strong>${r.progress}%</strong></div>
      ${C.progressBar(r.progress, { label: 'Job progress' })}
      <p class="muted small mt-2">${next}</p>
      ${updates.length ? html`<ol class="updates">${updates.map((u) => html`<li><span class="upd-pct">${u.pct}%</span><div><p>${u.note}</p><time class="muted xsmall" datetime="${u.at}">${fmtDateTime(u.at)}</time></div></li>`)}</ol>` : ''}
      ${r.rating ? html`<p class="mt-3 small">Your rating: ${stars(r.rating, 14)}</p>` : ''}
    </section>`;
  }

  CC.views.requestDetail = {
    title: (ctx) => ctx.params.id,
    render(ctx) {
      const r = S.request(ctx.params.id);
      if (!r) return CC.ui.emptyState({ icon: 'clipboard', title: 'Request not found', text: 'It may have been removed when demo data was reset.', actions: html`<a class="btn btn-primary" href="#/requests">Back to requests</a>` });
      const slot = (D.TIME_SLOTS.find((t) => t.id === r.timeSlot) || {}).name;
      const urg = D.URGENCY.find((u) => u.id === r.urgency) || {};
      return html`
        ${C.pageHeader({
          breadcrumb: [{ label: 'Service Requests', href: '#/requests' }, { label: r.id }],
          title: html`<span class="mono">${r.id}</span> ${C.requestStatus(r, { lg: true })}`,
          subtitle: `${S.serviceNames(r.services)} · ${r.cameras} cameras · ${r.area}, ${S.cityName(r.city)}`,
          actions: html`${detailActions(r)}`
        })}
        ${r.completionPending ? html`<div class="callout callout-amber mb-4">${icon('flag')}<p><strong>${S.vendor(r.vendorId).name} has marked this job complete.</strong> Review the work and confirm completion, or report an issue for the vendor to fix.</p></div>` : ''}
        ${r.status === 'cancelled' ? html`<div class="callout callout-danger mb-4">${icon('xCircle')}<p><strong>This request was cancelled.</strong> ${r.cancelReason || ''}</p></div>` : ''}
        ${r.status === 'draft' ? html`<div class="callout callout-muted mb-4">${icon('fileText')}<p>This request is a draft and hasn’t been sent to any vendor yet.</p></div>` : ''}
        <section class="card stepper-card">${C.lifecycleStepper(r)}</section>
        <div class="grid-2-1">
          <div class="stack">
            ${progressPanel(r)}
            ${quotesSummary(r)}
            <section class="card"><div class="card-head"><h2>Site & location</h2></div>
              <dl class="info-grid">${C.infoRow('City', S.cityName(r.city))}${C.infoRow('Area / locality', r.area)}${C.infoRow('PIN code', r.pin)}${C.infoRow('Site type', S.siteTypeName(r.siteType))}${C.infoRow('Address', r.address)}</dl></section>
            <section class="card"><div class="card-head"><h2>Requirements</h2></div>
              <div class="chips mb-3">${r.services.map((s) => html`<span class="chip chip-match">${S.serviceName(s)}</span>`)}</div>
              <dl class="info-grid">${C.infoRow('Cameras', r.cameras)}${C.infoRow('Indoor / outdoor', { indoor: 'Indoor', outdoor: 'Outdoor', both: 'Indoor & outdoor' }[r.environment])}${C.infoRow('Site size', r.siteSize)}${C.infoRow('Existing infrastructure', r.infrastructure)}</dl>
              <h3 class="h4 mt-3">Description</h3><p class="pre-line">${r.description}</p>
              ${r.attachments.length ? html`<h3 class="h4 mt-3">Attachments</h3><ul class="attachments">${r.attachments.map((a) => html`<li class="attachment"><span class="att-icon">${icon(a.type && a.type.startsWith('image/') ? 'image' : 'fileText')}</span><span class="att-meta"><strong class="truncate">${a.name}</strong><span class="muted xsmall">${fileSize(a.size || 0)} · stored locally (file name only)</span></span></li>`)}</ul>` : ''}
            </section>
            <section class="card"><div class="card-head"><h2>Schedule & budget</h2></div>
              <dl class="info-grid">${C.infoRow('Preferred date', fmtDate(r.preferredDate))}${C.infoRow('Time slot', slot)}${C.infoRow('Urgency', html`${urg.name} <span class="muted small">(${urg.hint})</span>`)}${C.infoRow('Estimated budget', inr(r.budget))}${C.infoRow('Site inspection', r.inspection ? 'Required' : 'Not required')}${r.scheduledDate ? C.infoRow('Confirmed service date', html`<strong>${fmtDate(r.scheduledDate)}</strong>`) : ''}</dl></section>
          </div>
          <div class="stack">
            ${vendorsPanel(r)}
            <section class="card"><div class="card-head"><h2>Requester</h2></div>
              <ul class="contact-list"><li>${icon('user', { size: 15 })}<span>${r.contact.name}<span class="muted small d-block">${r.contact.org}</span></span></li><li>${icon('mail', { size: 15 })}<span class="break">${r.contact.email}</span></li><li>${icon('phone', { size: 15 })}<span>${r.contact.phone}</span></li></ul></section>
            <section class="card"><div class="card-head"><h2>Status history</h2></div>${C.historyTimeline(r)}</section>
          </div>
        </div>`;
    }
  };

  /* ---------- Shared organisation actions ---------- */

  Object.assign(CC.actions, {
    'cancel-request': async (el) => {
      const r = S.request(el.dataset.id);
      const draft = r.status === 'draft';
      const reason = await confirm({
        title: draft ? 'Discard this draft?' : `Cancel ${r.id}?`, danger: true, confirmText: draft ? 'Discard draft' : 'Cancel request', cancelText: 'Keep request',
        message: draft ? 'The draft will be marked as cancelled and can no longer be submitted.' : `All invited vendors will be notified${['approved', 'scheduled'].includes(r.status) ? ' and the approved vendor will release the scheduled slot' : ''}. This cannot be undone.`,
        input: { label: 'Reason for cancellation', placeholder: 'e.g. Budget not approved this quarter', required: !draft }
      });
      if (reason === false) return;
      S.cancelRequest(r.id, typeof reason === 'string' && reason ? reason : (draft ? 'Draft discarded' : ''));
      toast(`${r.id} has been ${draft ? 'discarded' : 'cancelled'}.`, 'info', { title: draft ? 'Draft discarded' : 'Request cancelled' });
    },
    'invite-vendors': (el) => {
      const r = S.request(el.dataset.id);
      const cands = S.recommendVendors(r.city, r.services, 20).filter((c) => !r.invited.includes(c.vendor.id));
      CC.ui.modal({
        title: 'Invite more vendors', subtitle: `${S.serviceNames(r.services)} in ${S.cityName(r.city)} · ${r.id}`,
        body: cands.length ? html`<form id="invite-form" data-form="invite-vendors" data-id="${r.id}"><ul class="invite-list">${cands.map(({ vendor: v, score }) => html`<li><label class="invite-option"><input type="checkbox" name="v" value="${v.id}">${vendorLogo(v, 32)}<span class="grow"><strong>${v.name}</strong><span class="muted xsmall d-block">${v.rating.toFixed(1)}★ · ${C.availability(v).text}</span></span><span class="match-pill">${score}%</span></label></li>`)}</ul><p class="field-error" hidden></p></form>`
          : CC.ui.emptyState({ icon: 'users', compact: true, title: 'Everyone has been invited', text: `All sample vendors covering ${S.cityName(r.city)} for these services already have this request.` }),
        footer: cands.length ? html`<button type="button" class="btn btn-ghost" data-modal-close>Cancel</button><button type="submit" form="invite-form" class="btn btn-primary">${icon('send')} Send invitations</button>` : html`<button type="button" class="btn btn-primary" data-modal-close>Close</button>`
      });
    },
    'confirm-completion': (el) => {
      const r = S.request(el.dataset.id);
      const v = S.vendor(r.vendorId);
      CC.ui.modal({
        title: 'Confirm job completion', subtitle: `${r.id} · ${v.name}`,
        body: html`<form id="complete-form" data-form="confirm-completion" data-id="${r.id}">
          <p>Confirm that the work at <strong>${r.area}, ${S.cityName(r.city)}</strong> has been completed to your satisfaction. The request will be closed.</p>
          <fieldset class="field mt-3"><legend>Rate this job (optional)</legend>
            <div class="rating-input">${[5, 4, 3, 2, 1].map((n) => html`<input type="radio" name="rating" id="rate-${n}" value="${n}"><label for="rate-${n}" aria-label="${n} star${n > 1 ? 's' : ''}">${icon('star', { size: 26 })}</label>`)}</div></fieldset>
          <div class="field"><label for="complete-note">Feedback (optional)</label><textarea id="complete-note" name="note" rows="3" placeholder="e.g. Clean installation, all cameras verified on the NVR."></textarea></div>
        </form>`,
        footer: html`<button type="button" class="btn btn-ghost" data-modal-close>Not yet</button><button type="submit" form="complete-form" class="btn btn-primary">${icon('checkCircle')} Confirm completion</button>`
      });
    },
    'report-issue': async (el) => {
      const r = S.request(el.dataset.id);
      const text = await confirm({ title: 'Report an issue', confirmText: 'Send to vendor', icon: 'alert', message: `The job will return to “In Progress” and ${S.vendor(r.vendorId).name} will be asked to resolve the issue.`, input: { label: 'What needs attention?', placeholder: 'e.g. Camera 7 at the loading dock has no night vision', required: true } });
      if (!text) return;
      S.reportIssue(r.id, text);
      toast('The vendor has been notified about the issue.', 'info', { title: 'Issue reported' });
    }
  });
  Object.assign(CC.forms, {
    'invite-vendors': (form) => {
      const ids = $$('input[name="v"]:checked', form).map((i) => i.value);
      if (!ids.length) { const e = form.querySelector('.field-error'); e.textContent = 'Select at least one vendor.'; e.hidden = false; return; }
      const added = S.inviteVendors(form.dataset.id, ids);
      form.closest('.modal-backdrop').querySelector('[data-modal-close]').click();
      toast(`${plural(added.length, 'vendor')} invited to quote.`, 'success', { title: 'Invitations sent' });
    },
    'confirm-completion': (form) => {
      const rating = +((form.querySelector('input[name="rating"]:checked') || {}).value || 0);
      S.confirmCompletion(form.dataset.id, rating, form.elements.note.value.trim());
      form.closest('.modal-backdrop').querySelector('[data-modal-close]').click();
      toast(`${form.dataset.id} is complete. Thank you for confirming!`, 'success', { title: 'Job completed' });
    }
  });

  /* ======================= Quotation comparison ======================= */

  function compareRows(req, ranked, lowestId, recommendedId) {
    const cell = (fn) => ranked.map((x) => html`<td class="${x.quote.id === recommendedId ? 'col-rec' : ''}">${fn(x)}</td>`);
    const rows = [
      ['Total quotation', (x) => html`<strong class="big-num">${inr(x.quote.total)}</strong><span class="muted xsmall d-block">incl. 18% GST · ${x.quote.total <= req.budget ? html`<span class="text-success">within budget</span>` : html`<span class="text-danger">${inr(x.quote.total - req.budget)} over budget</span>`}</span>`],
      ['Labour cost', (x) => inr(x.quote.labor)],
      ['Equipment / material', (x) => inr(x.quote.material)],
      ['Other (travel, misc.)', (x) => inr(x.quote.other)],
      ['GST (18%)', (x) => inr(x.quote.gst)],
      ['Estimated completion', (x) => plural(x.quote.completionDays, 'day')],
      ['Proposed schedule', (x) => html`${fmtDate(x.quote.proposedDate)}<span class="muted xsmall d-block">${x.late === 0 ? 'Meets preferred date' : `${x.late} day${x.late === 1 ? '' : 's'} after preferred date`}</span>`],
      ['Warranty', (x) => x.quote.warranty],
      ['Service coverage', (x) => html`${x.vendor.baseCity === req.city ? `Based in ${S.cityName(req.city)}` : `Covers ${S.cityName(req.city)} from ${S.cityName(x.vendor.baseCity)}`}<span class="muted xsmall d-block">${req.services.filter((s) => x.vendor.services.includes(s)).length}/${req.services.length} requested services offered</span>`],
      ['Vendor rating (sample)', (x) => html`${stars(x.vendor.rating, 12)} ${x.vendor.rating.toFixed(1)} <span class="muted xsmall">(${x.vendor.reviewCount})</span>`],
      ['Experience', (x) => `${x.vendor.experience} years`],
      ['Quote valid until', (x) => fmtDate(x.quote.validUntil)],
      ['Vendor notes', (x) => html`<span class="small">${x.quote.notes || '—'}</span>`],
      ['Overall score', (x) => html`<span class="score-bar"><span style="width:${x.score}%"></span></span><strong>${x.score}</strong><span class="muted xsmall">/100</span>`]
    ];
    return rows.map(([label, fn]) => html`<tr><th scope="row">${label}</th>${cell(fn)}</tr>`);
  }

  function decisionButtons(req, q) {
    if (q.status === 'submitted' && req.status === 'quotation_received') {
      return html`<button type="button" class="btn btn-primary btn-block" data-action="approve-quote" data-id="${q.id}">${icon('check')} Approve</button>
        <button type="button" class="btn btn-ghost btn-block btn-danger-text" data-action="reject-quote" data-id="${q.id}">Decline</button>`;
    }
    return C.quoteBadge(q.status);
  }

  CC.views.compare = {
    title: (ctx) => `Compare quotations · ${ctx.params.id}`,
    render(ctx) {
      const req = S.request(ctx.params.id);
      if (!req) return CC.ui.emptyState({ icon: 'clipboard', title: 'Request not found', actions: html`<a class="btn btn-primary" href="#/requests">Back to requests</a>` });
      const all = S.quotesFor(req.id);
      const { ranked, lowestId, recommendedId } = S.rankQuotes(req, all);
      const others = all.filter((q) => !ranked.some((x) => x.quote.id === q.id) && q.status !== 'superseded');
      const rec = ranked.find((x) => x.quote.id === recommendedId);
      const header = C.pageHeader({
        breadcrumb: [{ label: 'Service Requests', href: '#/requests' }, { label: req.id, href: `#/requests/${req.id}` }, { label: 'Compare quotations' }],
        title: 'Compare quotations',
        subtitle: `${req.id} · ${S.serviceNames(req.services)} · ${req.cameras} cameras · ${req.area}, ${S.cityName(req.city)}`,
        actions: html`<a class="btn btn-secondary" href="#/requests/${req.id}">${icon('arrowLeft')} Back to request</a>${S.OPEN.includes(req.status) ? html`<button type="button" class="btn btn-secondary" data-action="invite-vendors" data-id="${req.id}">${icon('users')} Invite vendors</button>` : ''}`
      });
      const summary = html`<section class="card compare-summary">
        <dl class="summary-stats">
          <div><dt>Your budget</dt><dd>${inr(req.budget)}</dd></div>
          <div><dt>Preferred date</dt><dd>${fmtDate(req.preferredDate)}</dd></div>
          <div><dt>Quotations</dt><dd>${ranked.length}</dd></div>
          <div><dt>Price range</dt><dd>${ranked.length ? `${CC.ui.inrShort(Math.min(...ranked.map((x) => x.quote.total)))} – ${CC.ui.inrShort(Math.max(...ranked.map((x) => x.quote.total)))}` : '—'}</dd></div>
        </dl>
        ${C.requestStatus(req)}
      </section>`;
      if (!ranked.length) {
        return html`${header}${summary}${CC.ui.emptyState({ icon: 'fileText', title: 'No quotations to compare yet', text: req.invited.length ? 'Invited vendors haven’t submitted quotations yet. You’ll be notified as soon as they do.' : 'Invite vendors to start receiving quotations.', actions: S.OPEN.includes(req.status) ? html`<button type="button" class="btn btn-primary" data-action="invite-vendors" data-id="${req.id}">Invite vendors</button>` : '' })}`;
      }
      const decided = req.approvedQuoteId;
      return html`${header}${summary}
        ${decided ? html`<div class="callout callout-success mb-4">${icon('checkCircle')}<p><strong>You approved ${S.vendor(S.quote(decided).vendorId).name}’s quotation of ${inr(S.quote(decided).total)}.</strong> <a href="#/requests/${req.id}">Track the job</a></p></div>`
          : html`<div class="callout callout-info mb-4 rec-callout">${icon('sparkles')}<div>
            <p><strong>Recommended: ${rec.vendor.name}</strong> — overall score ${rec.score}/100${recommendedId === lowestId ? ', and also the lowest quotation' : ''}.</p>
            <ul class="reason-list">${rec.reasons.slice(0, 4).map((r) => html`<li>${icon('check', { size: 13 })}${r}</li>`)}</ul>
            <details class="mt-2"><summary class="small">How is this calculated?</summary><p class="small muted mt-1">The score balances price (32%), vendor rating (20%), schedule fit with your preferred date (15%), experience (10%), local coverage & service fit (10%), warranty (8%) and completion time (5%). The cheapest quotation is not automatically recommended. Ratings are sample data.</p></details>
          </div></div>`}
        <div class="compare-table-wrap">
          <table class="compare-table">
            <thead><tr><th scope="col"><span class="sr-only">Criteria</span></th>
              ${ranked.map((x) => html`<th scope="col" class="${x.quote.id === recommendedId ? 'col-rec' : ''}">
                <div class="cmp-flags">${x.quote.id === recommendedId ? html`<span class="badge badge-blue">${icon('sparkles', { size: 12 })} Recommended</span>` : ''}${x.quote.id === lowestId ? html`<span class="badge badge-success">${icon('rupee', { size: 12 })} Lowest quote</span>` : ''}</div>
                <div class="cmp-vendor">${vendorLogo(x.vendor, 40)}<div><a href="#/vendors/${x.vendor.id}">${x.vendor.name}</a><span class="muted xsmall d-block">${x.vendor.verified ? 'Verified (sample)' : 'Unverified'} · ${S.cityName(x.vendor.baseCity)}</span></div></div>
              </th>`)}</tr></thead>
            <tbody>${compareRows(req, ranked, lowestId, recommendedId)}
              <tr class="cmp-actions"><th scope="row">Decision</th>${ranked.map((x) => html`<td class="${x.quote.id === recommendedId ? 'col-rec' : ''}">${decisionButtons(req, x.quote)}</td>`)}</tr>
            </tbody>
          </table>
        </div>
        <div class="compare-cards">${ranked.map((x) => html`<article class="card cmp-card ${x.quote.id === recommendedId ? 'recommended' : ''}">
          <div class="cmp-flags">${x.quote.id === recommendedId ? html`<span class="badge badge-blue">${icon('sparkles', { size: 12 })} Recommended</span>` : ''}${x.quote.id === lowestId ? html`<span class="badge badge-success">Lowest quote</span>` : ''}</div>
          <div class="cmp-vendor">${vendorLogo(x.vendor, 40)}<div><a href="#/vendors/${x.vendor.id}" class="fw-600">${x.vendor.name}</a><span class="muted xsmall d-block">${stars(x.vendor.rating, 11)} ${x.vendor.rating.toFixed(1)} · ${x.vendor.experience} yrs</span></div></div>
          <p class="big-num mt-2">${inr(x.quote.total)}</p>
          <dl class="info-grid compact">${C.infoRow('Labour', inr(x.quote.labor))}${C.infoRow('Equipment', inr(x.quote.material))}${C.infoRow('Other + GST', inr(x.quote.other + x.quote.gst))}${C.infoRow('Completion', plural(x.quote.completionDays, 'day'))}${C.infoRow('Start date', fmtDate(x.quote.proposedDate))}${C.infoRow('Warranty', x.quote.warranty)}${C.infoRow('Coverage', x.vendor.baseCity === req.city ? 'Local' : `From ${S.cityName(x.vendor.baseCity)}`)}${C.infoRow('Score', `${x.score}/100`)}</dl>
          ${x.quote.notes ? html`<p class="small muted mt-2">${x.quote.notes}</p>` : ''}
          <div class="cmp-card-actions">${decisionButtons(req, x.quote)}</div>
        </article>`)}</div>
        ${others.length ? html`<section class="card mt-4"><div class="card-head"><h2>Other quotations</h2></div><ul class="quote-list">${others.map((q) => { const v = S.vendor(q.vendorId); return html`<li>${vendorLogo(v, 28)}<div class="grow"><strong>${v.name}</strong>${q.rejectReason ? html`<span class="muted xsmall d-block">“${q.rejectReason}”</span>` : ''}</div><div class="text-right"><strong>${inr(q.total)}</strong><span class="d-block">${C.quoteBadge(q.status)}</span></div></li>`; })}</ul></section>` : ''}`;
    }
  };

  Object.assign(CC.actions, {
    'approve-quote': async (el) => {
      const q = S.quote(el.dataset.id);
      const v = S.vendor(q.vendorId);
      const others = S.quotesFor(q.requestId).filter((o) => o.id !== q.id && o.status === 'submitted').length;
      const ok = await confirm({
        title: 'Approve this quotation?', confirmText: `Approve ${CC.ui.inrShort(q.total)}`, icon: 'checkCircle',
        message: html`You are approving <strong>${v.name}</strong> for <strong>${inr(q.total)}</strong> (incl. GST). ${others ? `The other ${plural(others, 'quotation')} will be marked as not selected and those vendors notified.` : ''} The vendor will be asked to confirm the schedule.`
      });
      if (!ok) return;
      S.approveQuote(q.id);
      toast(`${v.name} has been notified to schedule the job.`, 'success', { title: 'Quotation approved' });
      CC.app.navigate(`/requests/${q.requestId}`);
    },
    'reject-quote': async (el) => {
      const q = S.quote(el.dataset.id);
      const v = S.vendor(q.vendorId);
      const reason = await confirm({ title: `Decline ${v.name}’s quotation?`, danger: true, confirmText: 'Decline quotation', message: 'The vendor will be notified and may submit a revised quotation.', input: { label: 'Reason (shared with the vendor)', placeholder: 'e.g. Price is above our approved budget', required: false } });
      if (reason === false) return;
      S.rejectQuote(q.id, typeof reason === 'string' ? reason : '');
      toast(`Quotation from ${v.name} declined.`, 'info', { title: 'Quotation declined' });
    }
  });

  /* ======================= Active jobs ======================= */

  let jobFilter = 'all';
  const JOB_FILTERS = {
    all: ['All active', (r) => S.ACTIVE.includes(r.status)],
    approved: ['Awaiting schedule', (r) => r.status === 'approved'],
    scheduled: ['Scheduled', (r) => r.status === 'scheduled'],
    in_progress: ['In progress', (r) => r.status === 'in_progress' && !r.completionPending],
    signoff: ['Awaiting sign-off', (r) => r.completionPending]
  };

  function jobCard(r) {
    const v = S.vendor(r.vendorId);
    const q = r.approvedQuoteId ? S.quote(r.approvedQuoteId) : null;
    const last = r.progressUpdates[r.progressUpdates.length - 1];
    const next = { approved: 'Vendor to confirm service date', scheduled: `Starts ${fmtDate(r.scheduledDate)}`, in_progress: r.completionPending ? 'Awaiting your sign-off' : 'Work in progress' }[r.status];
    return html`<article class="card job-card" data-href="#/requests/${r.id}">
      <div class="job-head"><a class="mono fw-600" href="#/requests/${r.id}">${r.id}</a>${C.requestStatus(r)}</div>
      <h3 class="job-title">${S.serviceNames(r.services)} · ${r.cameras} cameras</h3>
      <p class="muted small">${icon('mapPin', { size: 13 })} ${r.area}, ${S.cityName(r.city)}</p>
      <div class="mt-3">${C.vendorMini(v, q ? `${inr(q.total)} approved` : '')}</div>
      <div class="job-progress">${C.progressBar(r.progress, { label: `${r.id} progress` })}<span class="small fw-600">${r.progress}%</span></div>
      <p class="small"><strong>Next:</strong> ${next}</p>
      ${last ? html`<p class="muted xsmall mt-1">Latest update ${relTime(last.at)}: ${last.note}</p>` : ''}
      <div class="job-actions">
        <a class="btn btn-sm btn-secondary" href="#/requests/${r.id}">View details</a>
        ${r.completionPending ? html`<button type="button" class="btn btn-sm btn-primary" data-action="confirm-completion" data-id="${r.id}">Confirm completion</button>` : ''}
      </div>
    </article>`;
  }

  CC.views.jobs = {
    title: 'Active Jobs',
    render() {
      const all = S.getState().requests;
      const list = all.filter(JOB_FILTERS[jobFilter][1]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const done = all.filter((r) => r.status === 'completed').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
      return html`
        ${C.pageHeader({ title: 'Active jobs', subtitle: 'Approved work across cities — from scheduling to sign-off.', actions: html`<a class="btn btn-primary" href="#/requests/new">${icon('plus')} New request</a>` })}
        <div class="seg-tabs" role="tablist" aria-label="Job filters">${Object.entries(JOB_FILTERS).map(([k, [label, fn]]) => html`<button type="button" role="tab" aria-selected="${jobFilter === k}" class="seg-tab ${jobFilter === k ? 'active' : ''}" data-action="job-filter" data-filter="${k}">${label}<span class="tab-count">${all.filter(fn).length}</span></button>`)}</div>
        ${list.length ? html`<div class="job-grid">${list.map(jobCard)}</div>` : CC.ui.emptyState({ icon: 'hardHat', title: 'No jobs in this stage', text: 'Approve a quotation to turn a request into an active job.', actions: html`<a class="btn btn-secondary" href="#/requests?status=quotation_received">Review quotations</a>` })}
        <section class="card mt-4"><div class="card-head"><h2>Recently completed</h2><a class="link" href="#/requests?status=completed">View all ${icon('arrowRight', { size: 14 })}</a></div>
          ${done.length ? html`<ul class="quote-list">${done.map((r) => { const v = S.vendor(r.vendorId); const q = S.quote(r.approvedQuoteId); return html`<li>${vendorLogo(v, 28)}<div class="grow"><a class="fw-600" href="#/requests/${r.id}">${r.id}</a> <span class="muted small">· ${S.serviceNames(r.services)} · ${S.cityName(r.city)}</span><span class="muted xsmall d-block">${v.name} · completed ${relTime(r.updatedAt)}</span></div><div class="text-right"><strong>${q ? inr(q.total) : '—'}</strong>${r.rating ? html`<span class="d-block">${stars(r.rating, 11)}</span>` : ''}</div></li>`; })}</ul>` : html`<p class="muted small">No completed jobs yet.</p>`}
        </section>`;
    }
  };
  CC.actions['job-filter'] = (el) => { jobFilter = el.dataset.filter; CC.app.render({ keepScroll: true }); };
})();
