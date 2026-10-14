/*
 * CityConnect — vendor portal (demo role)
 * Incoming requests, quotation submission, scheduling and job progress.
 * Everything a vendor does here is reflected in the organisation views
 * through the shared store.
 */
(function () {
  'use strict';
  const CC = window.CC;
  const { html, raw, icon, inr, inrShort, num, fmtDate, fmtDateTime, relTime, ymd, addDays, vendorLogo, stars, $, $$, toast, confirm, plural, fileSize, clamp } = CC.ui;
  const S = CC.store;
  const D = CC.data;
  const C = CC.components;

  const me = () => S.vendor(S.getState().settings.vendorId);

  /* ---------------- Vendor-side request stage ---------------- */

  function latestQuote(req, vid) {
    return S.quotesFor(req.id).filter((q) => q.vendorId === vid && q.status !== 'superseded').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
  }

  /** Returns { key, label, tone } describing the request from this vendor's perspective. */
  function stage(req, vid) {
    const resp = req.responses[vid];
    const q = latestQuote(req, vid);
    if (req.vendorId === vid && req.approvedQuoteId) {
      if (req.status === 'cancelled') return { key: 'closed', label: 'Cancelled by client', tone: 'danger' };
      return { key: 'won', label: req.completionPending ? 'Awaiting sign-off' : S.statusLabel(req.status), tone: req.completionPending ? 'amber' : S.STATUSES[req.status].tone };
    }
    if (req.status === 'cancelled') return { key: 'closed', label: 'Cancelled by client', tone: 'danger' };
    if (resp && resp.status === 'declined') return { key: 'closed', label: 'Declined by you', tone: 'neutral' };
    if (q && (q.status === 'not_selected' || q.status === 'closed')) return { key: 'closed', label: 'Not selected', tone: 'neutral' };
    if (q && q.status === 'submitted') return { key: 'quoted', label: 'Quotation sent', tone: 'amber' };
    if (q && q.status === 'rejected') return { key: 'accepted', label: 'Quote declined — revise', tone: 'danger' };
    if (!S.OPEN.includes(req.status)) return { key: 'closed', label: 'Awarded to another vendor', tone: 'neutral' };
    if (resp && resp.status === 'accepted') return { key: 'accepted', label: 'Preparing quotation', tone: 'violet' };
    return { key: 'new', label: 'New request', tone: 'info' };
  }
  const stageBadge = (s) => html`<span class="badge badge-${s.tone}"><span class="dot"></span>${s.label}</span>`;

  function myRequests(vid) {
    return S.getState().requests.filter((r) => r.status !== 'draft' && r.invited.includes(vid))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  function counts(vid) {
    const list = myRequests(vid);
    return {
      newCount: list.filter((r) => stage(r, vid).key === 'new').length,
      quoted: list.filter((r) => stage(r, vid).key === 'quoted').length,
      accepted: list.filter((r) => stage(r, vid).key === 'accepted').length,
      active: list.filter((r) => r.vendorId === vid && S.ACTIVE.includes(r.status)).length,
      completed: list.filter((r) => r.vendorId === vid && r.status === 'completed').length
    };
  }

  function nextActionText(req, vid) {
    const s = stage(req, vid).key;
    if (s === 'new') return 'Accept or decline';
    if (s === 'accepted') return 'Submit quotation';
    if (s === 'quoted') return 'Waiting for client decision';
    if (s === 'won') {
      if (req.status === 'approved') return 'Confirm service date';
      if (req.status === 'scheduled') return `Start work on ${fmtDate(req.scheduledDate)}`;
      if (req.status === 'in_progress') return req.completionPending ? 'Awaiting client sign-off' : 'Update progress';
      if (req.status === 'completed') return 'Completed';
    }
    return '—';
  }

  /* ---------------- Dashboard ---------------- */

  CC.views.portalDashboard = {
    title: 'Vendor Dashboard',
    render() {
      const v = me();
      const c = counts(v.id);
      const list = myRequests(v.id);
      const quotes = S.getState().quotes.filter((q) => q.vendorId === v.id && q.status !== 'superseded');
      const decided = quotes.filter((q) => ['approved', 'rejected', 'not_selected'].includes(q.status));
      const won = quotes.filter((q) => q.status === 'approved');
      const pipeline = quotes.filter((q) => q.status === 'submitted').reduce((a, q) => a + q.total, 0);
      const fresh = list.filter((r) => ['new', 'accepted'].includes(stage(r, v.id).key)).slice(0, 5);
      const jobs = list.filter((r) => r.vendorId === v.id && S.ACTIVE.includes(r.status));
      const notes = S.notificationsForCurrentRole().slice(0, 5);
      return html`
        ${C.pageHeader({ title: `Welcome, ${v.contact.person.split(' ')[0]}`, subtitle: `${v.name} · vendor portal`,
          actions: html`<a class="btn btn-secondary" href="#/vendors/${v.id}">${icon('building')} Public profile</a><a class="btn btn-primary" href="#/portal/requests">${icon('inbox')} Incoming requests</a>` })}
        <div class="callout callout-muted mb-4">${icon('info')}<p class="small">You are using the <strong>vendor demo role</strong> as ${v.name} (fictional). Quotations and job updates you make here appear instantly in the organization’s views.</p></div>
        <section class="kpi-grid" aria-label="Vendor metrics">
          ${C.kpi({ label: 'New requests', value: num(c.newCount), hint: `${c.accepted} being quoted`, icon: 'inbox', tone: 'blue', href: '#/portal/requests' })}
          ${C.kpi({ label: 'Quotes awaiting decision', value: num(c.quoted), hint: pipeline ? `${inrShort(pipeline)} in pipeline` : 'No open quotes', icon: 'fileText', tone: 'amber', href: '#/portal/requests?tab=quoted' })}
          ${C.kpi({ label: 'Active jobs', value: num(c.active), hint: 'Approved → in progress', icon: 'hardHat', tone: 'indigo', href: '#/portal/jobs' })}
          ${C.kpi({ label: 'Completed jobs', value: num(c.completed), hint: 'Via CityConnect', icon: 'award', tone: 'green', href: '#/portal/jobs?tab=completed' })}
          ${C.kpi({ label: 'Win rate', value: decided.length ? `${Math.round((won.length / decided.length) * 100)}%` : '—', hint: `${won.length} of ${decided.length} decided quotes`, icon: 'trendingUp', tone: 'teal', href: '#/portal/requests?tab=won' })}
          ${C.kpi({ label: 'Profile rating', value: `${v.rating.toFixed(1)}★`, hint: `${num(v.reviewCount)} sample reviews`, icon: 'star', tone: 'violet', href: `#/vendors/${v.id}` })}
        </section>
        <div class="grid-2">
          <section class="card"><div class="card-head"><h2>Requests needing action</h2><a class="link" href="#/portal/requests">View all ${icon('arrowRight', { size: 14 })}</a></div>
            ${fresh.length ? html`<ul class="req-list">${fresh.map((r) => html`<li data-href="#/portal/requests/${r.id}" tabindex="0">
              <div class="grow"><p><a class="mono fw-600" href="#/portal/requests/${r.id}">${r.id}</a> ${stageBadge(stage(r, v.id))}</p>
                <p class="small">${S.serviceNames(r.services)} · ${r.cameras} cameras</p>
                <p class="muted xsmall">${icon('mapPin', { size: 12 })} ${r.area}, ${S.cityName(r.city)} · preferred ${fmtDate(r.preferredDate)} · budget ${inr(r.budget)}</p></div>
              <a class="btn btn-sm btn-primary" href="#/portal/requests/${r.id}">${stage(r, v.id).key === 'new' ? 'Review' : 'Quote'}</a></li>`)}</ul>`
              : CC.ui.emptyState({ icon: 'inbox', compact: true, title: 'You’re all caught up', text: 'New service requests from organizations will appear here.' })}
          </section>
          <section class="card"><div class="card-head"><h2>Active jobs</h2><a class="link" href="#/portal/jobs">View all ${icon('arrowRight', { size: 14 })}</a></div>
            ${jobs.length ? html`<ul class="req-list">${jobs.map((r) => html`<li data-href="#/portal/requests/${r.id}" tabindex="0">
              <div class="grow"><p><a class="mono fw-600" href="#/portal/requests/${r.id}">${r.id}</a> ${stageBadge(stage(r, v.id))}</p>
                <p class="small">${r.area}, ${S.cityName(r.city)}</p>
                <div class="job-progress">${C.progressBar(r.progress, { sm: true })}<span class="xsmall fw-600">${r.progress}%</span></div>
                <p class="muted xsmall">Next: ${nextActionText(r, v.id)}</p></div></li>`)}</ul>`
              : CC.ui.emptyState({ icon: 'hardHat', compact: true, title: 'No active jobs', text: 'Approved quotations become jobs here.' })}
          </section>
        </div>
        <section class="card"><div class="card-head"><h2>Latest notifications</h2><a class="link" href="#/notifications">View all ${icon('arrowRight', { size: 14 })}</a></div>
          ${notes.length ? html`<ul class="notif-list flat">${notes.map((n) => html`<li><button type="button" class="notif ${n.read ? '' : 'unread'}" data-action="open-notification" data-id="${n.id}"><span class="notif-icon">${icon('bell', { size: 15 })}</span><span class="notif-text"><strong>${n.title}</strong><span>${n.body}</span><time class="muted small">${relTime(n.at)}</time></span></button></li>`)}</ul>` : html`<p class="muted small">No notifications yet.</p>`}
        </section>`;
    }
  };

  /* ---------------- Incoming requests ---------------- */

  const TABS = [['new', 'New'], ['accepted', 'Quoting'], ['quoted', 'Quoted'], ['won', 'Won'], ['closed', 'Closed'], ['all', 'All']];
  let tab = 'new';
  let lastTabQuery = null;

  CC.views.portalRequests = {
    title: 'Incoming Requests',
    render(ctx) {
      if (ctx.query.tab !== lastTabQuery) { lastTabQuery = ctx.query.tab; if (ctx.query.tab && TABS.some((t) => t[0] === ctx.query.tab)) tab = ctx.query.tab; }
      const v = me();
      const all = myRequests(v.id);
      const list = all.filter((r) => tab === 'all' || stage(r, v.id).key === tab);
      return html`
        ${C.pageHeader({ title: 'Incoming service requests', subtitle: `Requests sent to ${v.name} by organizations.` })}
        <div class="seg-tabs" role="tablist" aria-label="Request stages">${TABS.map(([k, l]) => html`<button type="button" role="tab" aria-selected="${tab === k}" class="seg-tab ${tab === k ? 'active' : ''}" data-action="portal-tab" data-tab="${k}">${l}<span class="tab-count">${k === 'all' ? all.length : all.filter((r) => stage(r, v.id).key === k).length}</span></button>`)}</div>
        <section class="card">
          ${list.length ? html`<div class="table-wrap"><table class="table responsive">
            <thead><tr><th scope="col">Request</th><th scope="col">Services</th><th scope="col">Location</th><th scope="col" class="num">Cameras</th><th scope="col" class="num">Client budget</th><th scope="col">Preferred date</th><th scope="col">Stage</th><th scope="col">Next step</th></tr></thead>
            <tbody>${list.map((r) => html`<tr data-href="#/portal/requests/${r.id}" tabindex="0" class="row-link">
              <td data-label="Request"><a class="mono fw-600" href="#/portal/requests/${r.id}">${r.id}</a><span class="muted xsmall d-block">received ${relTime((r.history.find((h) => h.status === 'submitted') || r).at || r.createdAt)}</span></td>
              <td data-label="Services">${S.serviceNames(r.services)}</td>
              <td data-label="Location">${r.area}, ${S.cityName(r.city)}</td>
              <td data-label="Cameras" class="num">${r.cameras}</td>
              <td data-label="Client budget" class="num">${inr(r.budget)}</td>
              <td data-label="Preferred date">${fmtDate(r.preferredDate)}</td>
              <td data-label="Stage">${stageBadge(stage(r, v.id))}</td>
              <td data-label="Next step" class="small">${nextActionText(r, v.id)}</td>
            </tr>`)}</tbody></table></div>`
          : CC.ui.emptyState({ icon: 'inbox', title: tab === 'new' ? 'No new requests' : 'Nothing here yet', text: tab === 'new' ? 'When an organization sends you a request it appears here. Try creating one from the organization role.' : 'Requests move here as you respond to them.', actions: html`<button type="button" class="btn btn-secondary" data-action="portal-tab" data-tab="all">Show all requests</button>` })}
        </section>`;
    }
  };
  CC.actions['portal-tab'] = (el) => { tab = el.dataset.tab; CC.app.render({ keepScroll: true }); };

  /* ---------------- Request detail (vendor) ---------------- */

  function actionPanel(r, v) {
    const s = stage(r, v.id);
    const q = latestQuote(r, v.id);
    const today = ymd(new Date());
    if (s.key === 'new') {
      return html`<section class="card action-card"><h2 class="h3">Respond to this request</h2>
        <p class="small muted">The client typically expects a response within 24 hours. Accepting lets them know you’re preparing a quotation.</p>
        <div class="btn-col mt-3">
          <button type="button" class="btn btn-primary btn-block" data-action="v-accept" data-id="${r.id}">${icon('check')} Accept & prepare quote</button>
          <button type="button" class="btn btn-secondary btn-block" data-action="v-quote" data-id="${r.id}">${icon('fileText')} Submit quotation now</button>
          <button type="button" class="btn btn-ghost btn-block btn-danger-text" data-action="v-decline" data-id="${r.id}">${icon('xCircle')} Decline request</button>
        </div></section>`;
    }
    if (s.key === 'accepted') {
      return html`<section class="card action-card"><h2 class="h3">${q && q.status === 'rejected' ? 'Your quotation was declined' : 'Prepare your quotation'}</h2>
        ${q && q.status === 'rejected' ? html`<p class="small">${q.rejectReason ? html`Client feedback: “${q.rejectReason}”. ` : ''}You can submit a revised quotation while the request is open.</p>` : html`<p class="small muted">Include a clear material and labour breakdown, a proposed date and warranty terms.</p>`}
        <div class="btn-col mt-3">
          <button type="button" class="btn btn-primary btn-block" data-action="v-quote" data-id="${r.id}">${icon('fileText')} ${q ? 'Submit revised quotation' : 'Submit quotation'}</button>
          <button type="button" class="btn btn-ghost btn-block btn-danger-text" data-action="v-decline" data-id="${r.id}">${icon('xCircle')} Decline request</button>
        </div></section>`;
    }
    if (s.key === 'quoted') {
      return html`<section class="card action-card"><h2 class="h3">Quotation submitted</h2>
        <p class="small">Sent ${relTime(q.createdAt)} · valid until ${fmtDate(q.validUntil)}. The client will compare it with other quotations.</p>
        <p class="big-num mt-2">${inr(q.total)}</p>
        <button type="button" class="btn btn-secondary btn-block mt-3" data-action="v-quote" data-id="${r.id}">${icon('edit')} Revise quotation</button></section>`;
    }
    if (s.key === 'won') {
      const aq = S.quote(r.approvedQuoteId);
      if (r.status === 'approved') {
        return html`<section class="card action-card highlight"><h2 class="h3">${icon('checkCircle')} Quotation approved</h2>
          <p class="small">Confirm the service date so the client can plan site access.</p>
          <form data-form="v-schedule" data-id="${r.id}" class="mt-3" novalidate>
            <div class="field"><label for="v-date">Service date <span class="req">*</span></label><input id="v-date" name="date" type="date" class="input" min="${today}" value="${aq.proposedDate >= today ? aq.proposedDate : today}" required><p class="field-error" hidden></p></div>
            <div class="field"><label for="v-slot">Arrival window / note</label><input id="v-slot" name="note" class="input" placeholder="e.g. Team of 3 arriving 9:30 AM"></div>
            <button type="submit" class="btn btn-primary btn-block">${icon('calendarCheck')} Confirm schedule</button>
          </form></section>`;
      }
      if (r.status === 'scheduled') {
        return html`<section class="card action-card"><h2 class="h3">Job scheduled</h2>
          <p class="small">Service date: <strong>${fmtDate(r.scheduledDate)}</strong></p>
          <button type="button" class="btn btn-primary btn-block mt-3" data-action="v-start" data-id="${r.id}">${icon('play')} Start work</button>
          <p class="muted xsmall mt-2">Starting work notifies the client and locks cancellation.</p></section>`;
      }
      if (r.status === 'in_progress' && !r.completionPending) {
        return html`<section class="card action-card"><h2 class="h3">Update work progress</h2>
          <form data-form="v-progress" data-id="${r.id}" novalidate>
            <div class="field"><label for="v-pct">Progress: <output id="v-pct-out">${clamp(r.progress + 20, 5, 95)}%</output></label>
              <input id="v-pct" name="pct" type="range" min="5" max="95" step="5" value="${clamp(r.progress + 20, 5, 95)}" data-input="v-pct"></div>
            <div class="field"><label for="v-note">Update note <span class="req">*</span></label><textarea id="v-note" name="note" rows="3" class="input" placeholder="e.g. Cabling complete for the warehouse floor; cameras 1–12 mounted."></textarea><p class="field-error" hidden></p></div>
            <button type="submit" class="btn btn-secondary btn-block">${icon('activity')} Post update</button>
          </form>
          <hr class="divider">
          <button type="button" class="btn btn-primary btn-block" data-action="v-complete" data-id="${r.id}">${icon('flag')} Mark job completed</button>
        </section>`;
      }
      if (r.completionPending) return html`<section class="card action-card"><h2 class="h3">Awaiting client sign-off</h2><p class="small">You marked this job complete. ${S.getState().org.name} will review and confirm completion.</p></section>`;
      if (r.status === 'completed') return html`<section class="card action-card highlight"><h2 class="h3">${icon('award')} Job completed</h2><p class="small">Completion confirmed by the client${r.rating ? html` · rated ${stars(r.rating, 12)}` : ''}.</p></section>`;
    }
    return html`<section class="card action-card"><h2 class="h3">${s.label}</h2><p class="small muted">${{
      'Cancelled by client': `The client cancelled this request${r.cancelReason ? `: “${r.cancelReason}”` : '.'}`,
      'Declined by you': `You declined this request${(r.responses[v.id] || {}).reason ? `: “${r.responses[v.id].reason}”` : '.'}`,
      'Not selected': 'The client selected another vendor for this job. Thank you for quoting.',
      'Awarded to another vendor': 'This request has been awarded to another vendor.'
    }[s.label] || 'No further action needed.'}</p></section>`;
  }

  function quoteCard(q) {
    if (!q) return '';
    return html`<section class="card"><div class="card-head"><h2>Your quotation${q.revision > 1 ? ` (revision ${q.revision})` : ''}</h2>${C.quoteBadge(q.status)}</div>
      <dl class="price-list">
        <div><dt>Equipment / material</dt><dd>${inr(q.material)}</dd></div>
        <div><dt>Labour</dt><dd>${inr(q.labor)}</dd></div>
        <div><dt>Other (travel, misc.)</dt><dd>${inr(q.other)}</dd></div>
        <div><dt>Subtotal</dt><dd>${inr(q.subtotal)}</dd></div>
        <div><dt>GST (18%)</dt><dd>${inr(q.gst)}</dd></div>
        <div class="total"><dt>Total</dt><dd>${inr(q.total)}</dd></div>
      </dl>
      <dl class="info-grid compact mt-3">${C.infoRow('Proposed date', fmtDate(q.proposedDate))}${C.infoRow('Completion time', plural(q.completionDays, 'day'))}${C.infoRow('Valid until', fmtDate(q.validUntil))}${C.infoRow('Warranty', q.warranty)}${C.infoRow('Notes', q.notes)}</dl>
    </section>`;
  }

  CC.views.portalRequest = {
    title: (ctx) => ctx.params.id,
    render(ctx) {
      const v = me();
      const r = S.request(ctx.params.id);
      if (!r || !r.invited.includes(v.id) || r.status === 'draft') {
        return CC.ui.emptyState({ icon: 'lock', title: 'Request not available', text: r ? `This request was not sent to ${v.name}. Switch the demo vendor from the “Demo role” menu if needed.` : 'This request could not be found.', actions: html`<a class="btn btn-primary" href="#/portal/requests">Back to incoming requests</a>` });
      }
      const s = stage(r, v.id);
      const won = s.key === 'won';
      const slot = (D.TIME_SLOTS.find((t) => t.id === r.timeSlot) || {}).name;
      const urg = D.URGENCY.find((u) => u.id === r.urgency) || {};
      const q = latestQuote(r, v.id);
      return html`
        ${C.pageHeader({ breadcrumb: [{ label: 'Incoming requests', href: '#/portal/requests' }, { label: r.id }],
          title: html`<span class="mono">${r.id}</span> ${stageBadge(s)}`,
          subtitle: `${r.contact.org} · ${S.serviceNames(r.services)} · ${r.area}, ${S.cityName(r.city)}` })}
        ${won ? html`<section class="card stepper-card">${C.lifecycleStepper(r)}</section>` : ''}
        <div class="grid-2-1">
          <div class="stack">
            ${won && ['in_progress', 'completed'].includes(r.status) ? html`<section class="card"><div class="card-head"><h2>Progress</h2><strong>${r.progress}%</strong></div>${C.progressBar(r.progress)}
              <ol class="updates">${r.progressUpdates.slice().reverse().map((u) => html`<li><span class="upd-pct">${u.pct}%</span><div><p>${u.note}</p><time class="muted xsmall">${fmtDateTime(u.at)}</time></div></li>`)}</ol></section>` : ''}
            <section class="card"><div class="card-head"><h2>Requirements</h2></div>
              <div class="chips mb-3">${r.services.map((x) => html`<span class="chip ${v.services.includes(x) ? 'chip-match' : ''}" ${v.services.includes(x) ? '' : html`data-tip="Not in your listed services"`}>${S.serviceName(x)}</span>`)}</div>
              <dl class="info-grid">${C.infoRow('Cameras', r.cameras)}${C.infoRow('Indoor / outdoor', { indoor: 'Indoor', outdoor: 'Outdoor', both: 'Indoor & outdoor' }[r.environment])}${C.infoRow('Site type', S.siteTypeName(r.siteType))}${C.infoRow('Site size', r.siteSize)}${C.infoRow('Existing infrastructure', r.infrastructure)}</dl>
              <h3 class="h4 mt-3">Description</h3><p class="pre-line">${r.description}</p>
              ${r.attachments.length ? html`<h3 class="h4 mt-3">Attachments</h3><ul class="attachments">${r.attachments.map((a) => html`<li class="attachment"><span class="att-icon">${icon('paperclip')}</span><span class="att-meta"><strong class="truncate">${a.name}</strong><span class="muted xsmall">${fileSize(a.size || 0)} · file not transferred in demo</span></span></li>`)}</ul>` : ''}
            </section>
            <section class="card"><div class="card-head"><h2>Schedule & budget</h2></div>
              <dl class="info-grid">${C.infoRow('Preferred date', fmtDate(r.preferredDate))}${C.infoRow('Time slot', slot)}${C.infoRow('Urgency', `${urg.name} (${urg.hint})`)}${C.infoRow('Client budget', inr(r.budget))}${C.infoRow('Site inspection', r.inspection ? 'Required before quoting' : 'Not required')}${r.scheduledDate ? C.infoRow('Confirmed date', fmtDate(r.scheduledDate)) : ''}</dl></section>
            ${quoteCard(q)}
          </div>
          <div class="stack">
            ${actionPanel(r, v)}
            <section class="card"><div class="card-head"><h2>Site & client</h2></div>
              <ul class="contact-list">
                <li>${icon('building', { size: 15 })}<span>${r.contact.org}</span></li>
                <li>${icon('mapPin', { size: 15 })}<span>${won ? html`${r.address}, ${r.area}, ${S.cityName(r.city)} ${r.pin}` : html`${r.area}, ${S.cityName(r.city)} ${r.pin}<span class="muted xsmall d-block">Full address shared after approval</span>`}</span></li>
                <li>${icon('user', { size: 15 })}<span>${won ? html`${r.contact.name}<span class="muted xsmall d-block">${r.contact.phone} · ${r.contact.email}</span>` : html`<span class="muted">Contact details shared after approval</span>`}</span></li>
              </ul></section>
            <section class="card"><div class="card-head"><h2>History</h2></div>${C.historyTimeline(r)}</section>
          </div>
        </div>`;
    }
  };

  /* ---------------- Quotation form ---------------- */

  function quoteTotals(form) {
    const n = (name) => Math.max(0, Math.round(+form.elements[name].value || 0));
    const sub = n('material') + n('labor') + n('other');
    const gst = Math.round(sub * 0.18);
    return { sub, gst, total: sub + gst };
  }

  function openQuoteForm(r) {
    const v = me();
    const prev = latestQuote(r, v.id);
    const today = new Date();
    const est = r.cameras * v.pricing.perCamera;
    const d = prev || { material: Math.round(est * 0.72 / 100) * 100, labor: Math.round(est * 0.28 / 100) * 100, other: 0, proposedDate: r.preferredDate >= ymd(today) ? r.preferredDate : ymd(addDays(today, 2)), completionDays: Math.max(1, Math.ceil(r.cameras / 8)), validUntil: ymd(addDays(today, 15)), warranty: D.WARRANTY_OPTIONS[1], notes: '' };
    CC.ui.modal({
      title: prev ? 'Revise quotation' : 'Submit quotation', subtitle: `${r.id} · ${S.serviceNames(r.services)} · ${r.cameras} cameras · client budget ${inr(r.budget)}`, size: 'lg',
      body: html`<form id="quote-form" data-form="v-quote" data-id="${r.id}" novalidate>
        <p class="eyebrow">Cost breakdown (excluding GST)</p>
        <div class="form-grid three">
          <div class="field"><label for="q-material">Equipment / material (₹) <span class="req">*</span></label><input id="q-material" name="material" type="number" min="0" step="100" class="input" value="${d.material}" data-input="q-total"><p class="field-error" hidden></p></div>
          <div class="field"><label for="q-labor">Labour (₹) <span class="req">*</span></label><input id="q-labor" name="labor" type="number" min="0" step="100" class="input" value="${d.labor}" data-input="q-total"><p class="field-error" hidden></p></div>
          <div class="field"><label for="q-other">Other — travel, misc. (₹)</label><input id="q-other" name="other" type="number" min="0" step="100" class="input" value="${d.other}" data-input="q-total"><p class="field-error" hidden></p></div>
        </div>
        <div class="quote-total" aria-live="polite"><span>Subtotal <strong id="qt-sub">—</strong></span><span>GST 18% <strong id="qt-gst">—</strong></span><span class="qt-grand">Total <strong id="qt-total">—</strong></span></div>
        <p class="hint" id="qt-budget"></p>
        <p class="eyebrow mt-3">Schedule & terms</p>
        <div class="form-grid">
          <div class="field"><label for="q-date">Proposed service date <span class="req">*</span></label><input id="q-date" name="proposedDate" type="date" min="${ymd(today)}" class="input" value="${d.proposedDate}"><p class="hint">Client preferred: ${fmtDate(r.preferredDate)}</p><p class="field-error" hidden></p></div>
          <div class="field"><label for="q-days">Estimated completion time (days) <span class="req">*</span></label><input id="q-days" name="completionDays" type="number" min="1" max="365" class="input" value="${d.completionDays}"><p class="field-error" hidden></p></div>
          <div class="field"><label for="q-valid">Quotation valid until <span class="req">*</span></label><input id="q-valid" name="validUntil" type="date" min="${ymd(addDays(today, 1))}" max="${ymd(addDays(today, 90))}" class="input" value="${d.validUntil >= ymd(addDays(today, 1)) ? d.validUntil : ymd(addDays(today, 15))}"><p class="field-error" hidden></p></div>
          <div class="field"><label for="q-warranty">Warranty terms <span class="req">*</span></label><select id="q-warranty" name="warranty" class="input">${D.WARRANTY_OPTIONS.map((w) => html`<option ${w === d.warranty ? 'selected' : ''}>${w}</option>`)}</select></div>
          <div class="field span-2"><label for="q-notes">Notes for the client</label><textarea id="q-notes" name="notes" rows="3" maxlength="1000" class="input" placeholder="Camera models, storage, scope assumptions, exclusions…">${d.notes}</textarea></div>
        </div>
      </form>`,
      footer: html`<button type="button" class="btn btn-ghost" data-modal-close>Cancel</button><button type="submit" form="quote-form" class="btn btn-primary">${icon('send')} ${prev ? 'Send revised quotation' : 'Send quotation'}</button>`,
      onMount(dlg) { updateTotals(dlg.querySelector('form'), r); }
    });
  }

  function updateTotals(form, r) {
    const t = quoteTotals(form);
    form.querySelector('#qt-sub').textContent = inr(t.sub);
    form.querySelector('#qt-gst').textContent = inr(t.gst);
    form.querySelector('#qt-total').textContent = inr(t.total);
    const b = form.querySelector('#qt-budget');
    const req = r || S.request(form.dataset.id);
    b.textContent = t.total ? (t.total <= req.budget ? `Within the client’s budget of ${inr(req.budget)}.` : `${inr(t.total - req.budget)} above the client’s budget of ${inr(req.budget)}.`) : '';
    b.className = 'hint ' + (t.total > req.budget ? 'text-danger' : 'text-success');
  }
  CC.inputs['q-total'] = (el) => updateTotals(el.form);
  CC.inputs['v-pct'] = (el) => { const o = $('#v-pct-out'); if (o) o.textContent = `${el.value}%`; };

  function setErr(form, name, msg) {
    const input = form.elements[name];
    const p = input.closest('.field').querySelector('.field-error');
    p.textContent = msg; p.hidden = false;
    input.setAttribute('aria-invalid', 'true');
  }
  function clearErrs(form) {
    $$('.field-error', form).forEach((p) => { p.hidden = true; });
    $$('[aria-invalid]', form).forEach((i) => i.removeAttribute('aria-invalid'));
  }
  const closeModalOf = (form) => { const b = form.closest('.modal-backdrop'); if (b) b.querySelector('[data-modal-close]').click(); };

  CC.forms['v-quote'] = (form) => {
    clearErrs(form);
    const f = form.elements;
    const today = ymd(new Date());
    let bad = false;
    ['material', 'labor', 'other'].forEach((k) => { const v = f[k].value; if (v !== '' && (+v < 0 || !Number.isFinite(+v))) { setErr(form, k, 'Enter a positive amount.'); bad = true; } });
    if ((+f.material.value || 0) + (+f.labor.value || 0) <= 0) { setErr(form, 'material', 'Enter material and/or labour costs.'); bad = true; }
    if (!f.proposedDate.value || f.proposedDate.value < today) { setErr(form, 'proposedDate', 'Choose today or a future date.'); bad = true; }
    const days = +f.completionDays.value;
    if (!Number.isInteger(days) || days < 1 || days > 365) { setErr(form, 'completionDays', 'Enter 1–365 days.'); bad = true; }
    if (!f.validUntil.value || f.validUntil.value <= today || f.validUntil.value > ymd(addDays(new Date(), 90))) { setErr(form, 'validUntil', 'Validity must be between tomorrow and 90 days from today.'); bad = true; }
    if (bad) { const first = form.querySelector('[aria-invalid="true"]'); if (first) first.focus(); return; }
    const q = S.submitQuote(form.dataset.id, me().id, {
      material: f.material.value, labor: f.labor.value, other: f.other.value, proposedDate: f.proposedDate.value,
      completionDays: days, validUntil: f.validUntil.value, warranty: f.warranty.value, notes: f.notes.value.trim()
    });
    closeModalOf(form);
    toast(`Quotation of ${inr(q.total)} sent to ${S.request(form.dataset.id).contact.org}.`, 'success', { title: q.revision > 1 ? 'Revised quotation sent' : 'Quotation submitted' });
  };

  CC.forms['v-schedule'] = (form) => {
    const date = form.elements.date.value;
    clearErrs(form);
    if (!date || date < ymd(new Date())) { setErr(form, 'date', 'Choose today or a future date.'); form.elements.date.focus(); return; }
    S.scheduleJob(form.dataset.id, me().id, date, form.elements.note.value.trim());
    toast(`Job scheduled for ${fmtDate(date)}. The client has been notified.`, 'success', { title: 'Schedule confirmed' });
  };

  CC.forms['v-progress'] = (form) => {
    clearErrs(form);
    const note = form.elements.note.value.trim();
    if (note.length < 5) { setErr(form, 'note', 'Describe the progress in a few words.'); form.elements.note.focus(); return; }
    S.updateProgress(form.dataset.id, me().id, form.elements.pct.value, note);
    toast(`Progress updated to ${form.elements.pct.value}%.`, 'success', { title: 'Update posted' });
  };

  Object.assign(CC.actions, {
    'v-accept': (el) => {
      S.vendorRespond(el.dataset.id, me().id, 'accepted');
      toast('The client has been told you are preparing a quotation.', 'success', { title: 'Request accepted' });
    },
    'v-decline': async (el) => {
      const reason = await confirm({ title: 'Decline this request?', danger: true, confirmText: 'Decline request', message: 'The client will be notified so they can invite another vendor.', input: { label: 'Reason (shared with the client)', placeholder: 'e.g. Fully booked until next month', required: true } });
      if (!reason) return;
      S.vendorRespond(el.dataset.id, me().id, 'declined', reason);
      toast('Request declined. The client has been notified.', 'info', { title: 'Declined' });
    },
    'v-quote': (el) => openQuoteForm(S.request(el.dataset.id)),
    'v-start': async (el) => {
      const ok = await confirm({ title: 'Start work now?', confirmText: 'Start work', icon: 'play', message: 'The client will be notified that technicians are on site. The request can no longer be cancelled after this.' });
      if (!ok) return;
      S.startWork(el.dataset.id, me().id);
      toast('Work started — keep the client updated with progress notes.', 'success', { title: 'Job in progress' });
    },
    'v-complete': async (el) => {
      const note = await confirm({ title: 'Mark job as completed?', confirmText: 'Mark completed', icon: 'flag', message: 'The client will be asked to verify the work and confirm completion.', input: { label: 'Completion summary', placeholder: 'e.g. All 24 cameras live on NVR; handover document shared with site supervisor.', required: true } });
      if (!note) return;
      S.markVendorComplete(el.dataset.id, me().id, note);
      toast('The client has been asked to confirm completion.', 'success', { title: 'Marked complete' });
    }
  });

  /* ---------------- Jobs ---------------- */

  let jobsTab = 'active';
  let lastJobsQuery = null;
  CC.views.portalJobs = {
    title: 'My Jobs',
    render(ctx) {
      if (ctx.query.tab !== lastJobsQuery) { lastJobsQuery = ctx.query.tab; if (['active', 'completed'].includes(ctx.query.tab)) jobsTab = ctx.query.tab; }
      const v = me();
      const mine = S.getState().requests.filter((r) => r.vendorId === v.id && r.approvedQuoteId);
      const list = mine.filter((r) => (jobsTab === 'active' ? S.ACTIVE.includes(r.status) : r.status === 'completed')).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return html`
        ${C.pageHeader({ title: 'My jobs', subtitle: 'Approved work — schedule, update progress and close out jobs.' })}
        <div class="seg-tabs" role="tablist" aria-label="Job filter">
          <button type="button" role="tab" aria-selected="${jobsTab === 'active'}" class="seg-tab ${jobsTab === 'active' ? 'active' : ''}" data-action="pjobs-tab" data-tab="active">Active<span class="tab-count">${mine.filter((r) => S.ACTIVE.includes(r.status)).length}</span></button>
          <button type="button" role="tab" aria-selected="${jobsTab === 'completed'}" class="seg-tab ${jobsTab === 'completed' ? 'active' : ''}" data-action="pjobs-tab" data-tab="completed">Completed<span class="tab-count">${mine.filter((r) => r.status === 'completed').length}</span></button>
        </div>
        ${list.length ? html`<div class="job-grid">${list.map((r) => {
          const q = S.quote(r.approvedQuoteId);
          return html`<article class="card job-card" data-href="#/portal/requests/${r.id}">
            <div class="job-head"><a class="mono fw-600" href="#/portal/requests/${r.id}">${r.id}</a>${stageBadge(stage(r, v.id))}</div>
            <h3 class="job-title">${S.serviceNames(r.services)} · ${r.cameras} cameras</h3>
            <p class="muted small">${icon('building', { size: 13 })} ${r.contact.org}</p>
            <p class="muted small">${icon('mapPin', { size: 13 })} ${r.area}, ${S.cityName(r.city)}</p>
            <div class="job-progress">${C.progressBar(r.progress)}<span class="small fw-600">${r.progress}%</span></div>
            <dl class="info-grid compact">${C.infoRow('Contract value', inr(q.total))}${C.infoRow(r.scheduledDate ? 'Service date' : 'Proposed date', fmtDate(r.scheduledDate || q.proposedDate))}</dl>
            <p class="small mt-2"><strong>Next:</strong> ${nextActionText(r, v.id)}</p>
            <div class="job-actions"><a class="btn btn-sm btn-primary" href="#/portal/requests/${r.id}">Open job</a></div>
          </article>`;
        })}</div>` : CC.ui.emptyState({ icon: 'hardHat', title: jobsTab === 'active' ? 'No active jobs' : 'No completed jobs yet', text: 'When a client approves your quotation, the job appears here.', actions: html`<a class="btn btn-secondary" href="#/portal/requests">View incoming requests</a>` })}`;
    }
  };
  CC.actions['pjobs-tab'] = (el) => { jobsTab = el.dataset.tab; CC.app.render({ keepScroll: true }); };

  CC.vendorPortal = { counts, stage };
})();
