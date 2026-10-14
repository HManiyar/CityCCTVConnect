/*
 * CityConnect — multi-step service request workflow (create & edit)
 * Steps: Location → Requirements → Schedule & budget → Contact → Review
 */
(function () {
  'use strict';
  const CC = window.CC;
  const { html, raw, icon, inr, fmtDate, ymd, addDays, vendorLogo, stars, fileSize, toast, $, $$, plural } = CC.ui;
  const S = CC.store;
  const D = CC.data;
  const C = CC.components;

  const STEPS = [
    { id: 1, label: 'Location', icon: 'mapPin' },
    { id: 2, label: 'Requirements', icon: 'cctv' },
    { id: 3, label: 'Schedule & budget', icon: 'calendar' },
    { id: 4, label: 'Contact', icon: 'user' },
    { id: 5, label: 'Review & submit', icon: 'checkCircle' }
  ];
  const MAX_FILES = 5, MAX_FILE_BYTES = 5 * 1024 * 1024, MAX_INVITES = 5;

  let W = null; // wizard state

  function blankData(query) {
    const st = S.getState();
    const v = query.vendor ? S.vendor(query.vendor) : null;
    const city = (query.city && S.city(query.city)) ? query.city : v ? v.baseCity : '';
    const services = query.service && S.service(query.service) ? [query.service] : query.package ? (query.package === 'Annual care' ? ['amc'] : ['install']) : [];
    return {
      city, area: '', pin: '', address: '', siteType: '',
      services, cameras: query.package === 'Starter' ? 4 : query.package === 'Business' ? 8 : '', environment: 'both', siteSize: '', infrastructure: '',
      description: query.package ? `We are interested in the “${query.package}” package. ` : '',
      preferredDate: ymd(addDays(new Date(), 7)), timeSlot: 'morning', urgency: 'standard', budget: '', inspection: 'no',
      contactName: st.org.user.name, contactOrg: st.org.name, contactEmail: st.org.user.email, contactPhone: st.org.user.phone,
      assignMode: v ? 'single' : 'multi', vendorId: v ? v.id : '', invited: [], invitedTouched: false, agree: false
    };
  }

  function dataFromRequest(r) {
    return {
      city: r.city, area: r.area, pin: r.pin, address: r.address, siteType: r.siteType, services: r.services.slice(),
      cameras: r.cameras, environment: r.environment, siteSize: r.siteSize, infrastructure: r.infrastructure, description: r.description,
      preferredDate: r.preferredDate, timeSlot: r.timeSlot, urgency: r.urgency, budget: r.budget, inspection: r.inspection ? 'yes' : 'no',
      contactName: r.contact.name, contactOrg: r.contact.org, contactEmail: r.contact.email, contactPhone: r.contact.phone,
      assignMode: r.vendorId || r.invited.length === 1 ? 'single' : 'multi', vendorId: r.vendorId || r.invited[0] || '',
      invited: r.invited.slice(), invitedTouched: true, agree: true
    };
  }

  function init(ctx, key) {
    const editId = ctx.params.id || null;
    const req = editId ? S.request(editId) : null;
    W = {
      key, mode: editId ? 'edit' : 'new', editId, step: 1, errors: {}, submitted: null, successShown: false,
      data: req ? dataFromRequest(req) : blankData(ctx.query),
      attachments: req ? req.attachments.map((a) => Object.assign({ id: CC.ui.uid('F') }, a)) : [],
      preselected: ctx.query.vendor || null, maxStep: req ? 5 : 1
    };
  }

  /* ---------------- Validation ---------------- */

  function phoneDigits(p) {
    let d = String(p || '').replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
    if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    return d;
  }

  function validate(step) {
    const d = W.data, e = {};
    if (step === 1) {
      if (!d.city) e.city = 'Select the city where work is required.';
      if (d.area.trim().length < 2) e.area = 'Enter the area or locality.';
      if (!/^[1-9]\d{5}$/.test(d.pin.trim())) e.pin = 'Enter a valid 6-digit PIN code.';
      else if (d.city && !S.city(d.city).pinPrefixes.some((p) => d.pin.startsWith(p))) e.pin = `This PIN doesn’t look like ${S.cityName(d.city)} (expected ${S.city(d.city).pinPrefixes.join(' / ')}xxx).`;
      if (d.address.trim().length < 8) e.address = 'Enter the full site address (at least 8 characters).';
      if (!d.siteType) e.siteType = 'Select the type of site.';
    }
    if (step === 2) {
      if (!d.services.length) e.services = 'Select at least one service.';
      const n = parseInt(d.cameras, 10);
      if (!n || n < 1 || n > 500 || String(n) !== String(d.cameras).trim()) e.cameras = 'Enter the number of cameras (1–500).';
      if (!d.environment) e.environment = 'Choose indoor / outdoor requirements.';
      if (!d.siteSize) e.siteSize = 'Select the approximate site size.';
      if (!d.infrastructure) e.infrastructure = 'Select the existing infrastructure.';
      if (d.description.trim().length < 20) e.description = 'Describe the requirement in at least 20 characters.';
      else if (d.description.length > 1500) e.description = 'Keep the description under 1,500 characters.';
    }
    if (step === 3) {
      if (!d.preferredDate) e.preferredDate = 'Choose a preferred service date.';
      else if (d.preferredDate < ymd(new Date())) e.preferredDate = 'The preferred date cannot be in the past.';
      if (!d.timeSlot) e.timeSlot = 'Choose a time slot.';
      if (!d.urgency) e.urgency = 'Choose the urgency.';
      const b = parseInt(String(d.budget).replace(/[,\s₹]/g, ''), 10);
      if (!b || b < 1000) e.budget = 'Enter an estimated budget of at least ₹1,000.';
      else if (b > 100000000) e.budget = 'Budget looks too large — please check the amount.';
      if (!['yes', 'no'].includes(d.inspection)) e.inspection = 'Tell us whether a site inspection is required.';
    }
    if (step === 4) {
      if (d.contactName.trim().length < 2) e.contactName = 'Enter the requester’s name.';
      if (d.contactOrg.trim().length < 2) e.contactOrg = 'Enter the organisation name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.contactEmail.trim())) e.contactEmail = 'Enter a valid work email address.';
      const p = phoneDigits(d.contactPhone);
      if (!/^[6-9]\d{9}$/.test(p)) e.contactPhone = 'Enter a valid 10-digit Indian mobile number (e.g. +91 98250 12345).';
    }
    if (step === 5 && canChangeAssignment()) {
      if (d.assignMode === 'single') {
        const v = S.vendor(d.vendorId);
        if (!v) e.vendorId = 'Select a vendor to receive this request.';
        else if (!v.cities.includes(d.city)) e.vendorId = `${v.name} does not cover ${S.cityName(d.city)}. Choose another vendor or invite multiple vendors.`;
      } else if (!d.invited.length) e.invited = 'Select at least one vendor to invite.';
      if (!d.agree && W.mode === 'new') e.agree = 'Please confirm you understand this is a demo.';
    }
    return e;
  }

  function canChangeAssignment() {
    if (W.mode === 'new') return true;
    const r = S.request(W.editId);
    return r && r.status === 'draft';
  }

  /* ---------------- Field helpers ---------------- */

  function fieldAttrs(name) {
    const err = W.errors[name];
    return raw(`name="${name}" id="f-${name}" ${err ? `aria-invalid="true" aria-describedby="err-${name}"` : ''}`);
  }
  function errorFor(name) {
    const err = W.errors[name];
    return err ? html`<p class="field-error" id="err-${name}">${icon('alert', { size: 13 })} ${err}</p>` : '';
  }
  function label(name, text, req = true, hint) {
    return html`<label for="f-${name}">${text}${req ? html` <span class="req" aria-hidden="true">*</span>` : html` <span class="muted small">(optional)</span>`}</label>${hint ? html`<p class="hint">${hint}</p>` : ''}`;
  }
  function options(list, selected, placeholder) {
    return html`${placeholder ? html`<option value="">${placeholder}</option>` : ''}${list.map((o) => {
      const value = typeof o === 'string' ? o : o.id;
      const text = typeof o === 'string' ? o : o.name;
      return html`<option value="${value}" ${String(selected) === String(value) ? 'selected' : ''}>${text}</option>`;
    })}`;
  }

  /* ---------------- Steps ---------------- */

  function step1() {
    const d = W.data;
    const c = d.city ? S.city(d.city) : null;
    return html`<div class="form-grid">
      <div class="field">${label('city', 'City')}<select class="input" ${fieldAttrs('city')} data-change="wz-city">${options(D.CITIES, d.city, 'Select a city')}</select>${errorFor('city')}</div>
      <div class="field">${label('area', 'Area or locality')}<input class="input" type="text" ${fieldAttrs('area')} value="${d.area}" list="locality-list" placeholder="${c ? `e.g. ${c.localities[0]}` : 'e.g. Aji GIDC'}" data-input="wz" autocomplete="off">
        <datalist id="locality-list">${(c ? c.localities : []).map((l) => html`<option value="${l}"></option>`)}</datalist>${errorFor('area')}</div>
      <div class="field">${label('pin', 'PIN code', true, c ? `${c.name} PIN codes start with ${c.pinPrefixes.join(' or ')}` : '')}<input class="input" type="text" inputmode="numeric" maxlength="6" ${fieldAttrs('pin')} value="${d.pin}" placeholder="${c ? c.pins[0] : '360003'}" data-input="wz">${errorFor('pin')}</div>
      <div class="field">${label('siteType', 'Site type')}<select class="input" ${fieldAttrs('siteType')} data-change="wz">${options(D.SITE_TYPES, d.siteType, 'Select site type')}</select>${errorFor('siteType')}</div>
      <div class="field span-2">${label('address', 'Site address')}<textarea class="input" rows="2" ${fieldAttrs('address')} placeholder="Building / plot number, street, landmark" data-input="wz">${d.address}</textarea>${errorFor('address')}</div>
    </div>
    ${c ? html`<div class="callout callout-info mt-3">${icon('info', { size: 16 })}<p class="small"><strong>${S.vendorsInCity(c.id).length} vendors</strong> in the sample directory cover ${c.name}. <a href="#/vendors?city=${c.id}">Browse them</a> — your answers here are kept.</p></div>` : ''}`;
  }

  function step2() {
    const d = W.data;
    return html`<fieldset class="field">
        <legend>Services required <span class="req" aria-hidden="true">*</span></legend>
        <div class="service-picker ${W.errors.services ? 'invalid' : ''}" ${W.errors.services ? raw('aria-describedby="err-services"') : ''}>
          ${D.SERVICES.map((s) => html`<label class="service-option">
            <input type="checkbox" name="services" value="${s.id}" ${d.services.includes(s.id) ? 'checked' : ''} data-change="wz-services" ${s.id === D.SERVICES[0].id ? raw('id="f-services"') : ''}>
            <span class="so-box">${icon(s.icon)}<span><strong>${s.name}</strong><span class="muted xsmall d-block">${s.desc}</span></span><span class="so-check">${icon('check', { size: 14, stroke: 3 })}</span></span>
          </label>`)}
        </div>${errorFor('services')}
      </fieldset>
      <div class="form-grid">
        <div class="field">${label('cameras', 'Number of cameras')}<input class="input" type="number" min="1" max="500" inputmode="numeric" ${fieldAttrs('cameras')} value="${d.cameras}" placeholder="e.g. 16" data-input="wz">${errorFor('cameras')}</div>
        <fieldset class="field"><legend>Indoor / outdoor <span class="req" aria-hidden="true">*</span></legend>
          <div class="segmented">${[['indoor', 'Indoor'], ['outdoor', 'Outdoor'], ['both', 'Both']].map(([v, l]) => html`<label class="seg"><input type="radio" name="environment" value="${v}" ${d.environment === v ? 'checked' : ''} data-change="wz"><span>${l}</span></label>`)}</div>${errorFor('environment')}</fieldset>
        <div class="field">${label('siteSize', 'Approximate site size')}<select class="input" ${fieldAttrs('siteSize')} data-change="wz">${options(D.SITE_SIZES, d.siteSize, 'Select size')}</select>${errorFor('siteSize')}</div>
        <div class="field">${label('infrastructure', 'Existing infrastructure')}<select class="input" ${fieldAttrs('infrastructure')} data-change="wz">${options(D.INFRASTRUCTURE, d.infrastructure, 'Select current set-up')}</select>${errorFor('infrastructure')}</div>
        <div class="field span-2">${label('description', 'Detailed description')}<textarea class="input" rows="4" maxlength="1500" ${fieldAttrs('description')} placeholder="Areas to cover, camera preferences, storage/retention needs, access constraints…" data-input="wz">${d.description}</textarea>
          <p class="hint text-right"><span id="desc-count">${d.description.length}</span> / 1,500</p>${errorFor('description')}</div>
      </div>
      <div class="field">
        <span class="label-like">Photos or documents <span class="muted small">(optional)</span></span>
        <label class="dropzone" for="f-files">
          ${icon('upload', { size: 22 })}
          <span><strong>Click to add files</strong> or drag them here<span class="muted xsmall d-block">Images or PDF · up to ${MAX_FILES} files · 5 MB each</span></span>
          <input id="f-files" type="file" multiple accept="image/*,.pdf" class="sr-only" data-change="wz-files">
        </label>
        <p class="hint">${icon('lock', { size: 12 })} Files are previewed in your browser only and are <strong>not uploaded</strong> to any server. Only file names are saved with the demo request.</p>
        ${attachmentsList(true)}
      </div>`;
  }

  function attachmentsList(removable) {
    if (!W.attachments.length) return '';
    return html`<ul class="attachments">${W.attachments.map((a) => html`<li class="attachment">
      ${a.preview ? html`<img src="${a.preview}" alt="Preview of ${a.name}">` : html`<span class="att-icon">${icon(a.type && a.type.startsWith('image/') ? 'image' : 'fileText')}</span>`}
      <span class="att-meta"><strong class="truncate">${a.name}</strong><span class="muted xsmall">${fileSize(a.size || 0)}${a.preview ? '' : ' · preview unavailable'}</span></span>
      ${removable ? html`<button type="button" class="icon-btn" data-action="wz-remove-file" data-id="${a.id}" aria-label="Remove ${a.name}">${icon('x', { size: 16 })}</button>` : ''}
    </li>`)}</ul>`;
  }

  function step3() {
    const d = W.data;
    return html`<div class="form-grid">
      <div class="field">${label('preferredDate', 'Preferred service date')}<input class="input" type="date" min="${ymd(new Date())}" ${fieldAttrs('preferredDate')} value="${d.preferredDate}" data-change="wz">${errorFor('preferredDate')}</div>
      <div class="field">${label('timeSlot', 'Preferred time slot')}<select class="input" ${fieldAttrs('timeSlot')} data-change="wz">${options(D.TIME_SLOTS, d.timeSlot)}</select>${errorFor('timeSlot')}</div>
      <fieldset class="field span-2"><legend>Urgency <span class="req" aria-hidden="true">*</span></legend>
        <div class="choice-cards">${D.URGENCY.map((u) => html`<label class="choice-card"><input type="radio" name="urgency" value="${u.id}" ${d.urgency === u.id ? 'checked' : ''} data-change="wz"><span><strong>${u.name}</strong><span class="muted small d-block">${u.hint}</span></span></label>`)}</div>${errorFor('urgency')}</fieldset>
      <div class="field">${label('budget', 'Estimated budget (₹)', true, 'Include equipment and labour. Vendors see this as a guide.')}
        <div class="input-prefix"><span>₹</span><input class="input" type="text" inputmode="numeric" ${fieldAttrs('budget')} value="${d.budget}" placeholder="e.g. 150000" data-input="wz"></div>
        <div class="quick-chips">${[25000, 75000, 150000, 300000].map((b) => html`<button type="button" class="chip chip-btn" data-action="wz-budget" data-value="${b}">${CC.ui.inrShort(b)}</button>`)}</div>
        ${errorFor('budget')}</div>
      <fieldset class="field"><legend>Site inspection required? <span class="req" aria-hidden="true">*</span></legend>
        <div class="segmented">${[['yes', 'Yes, inspect first'], ['no', 'Not required']].map(([v, l]) => html`<label class="seg"><input type="radio" name="inspection" value="${v}" ${d.inspection === v ? 'checked' : ''} data-change="wz"><span>${l}</span></label>`)}</div>
        <p class="hint">Recommended for new installations or sites larger than 10,000 sq ft.</p>${errorFor('inspection')}</fieldset>
    </div>`;
  }

  function step4() {
    const d = W.data;
    return html`<div class="form-grid">
      <div class="field">${label('contactName', 'Requester name')}<input class="input" type="text" autocomplete="name" ${fieldAttrs('contactName')} value="${d.contactName}" data-input="wz">${errorFor('contactName')}</div>
      <div class="field">${label('contactOrg', 'Organization name')}<input class="input" type="text" autocomplete="organization" ${fieldAttrs('contactOrg')} value="${d.contactOrg}" data-input="wz">${errorFor('contactOrg')}</div>
      <div class="field">${label('contactEmail', 'Work email')}<input class="input" type="email" autocomplete="email" ${fieldAttrs('contactEmail')} value="${d.contactEmail}" placeholder="name@company.com" data-input="wz">${errorFor('contactEmail')}</div>
      <div class="field">${label('contactPhone', 'Phone number')}<input class="input" type="tel" autocomplete="tel" ${fieldAttrs('contactPhone')} value="${d.contactPhone}" placeholder="+91 98250 12345" data-input="wz">${errorFor('contactPhone')}</div>
    </div>
    <div class="callout callout-muted mt-3">${icon('lock', { size: 16 })}<p class="small">Contact details are shared with the selected vendor only after you approve a quotation. Nothing leaves this browser in the demo.</p></div>`;
  }

  function candidateVendors() {
    const d = W.data;
    return S.recommendVendors(d.city, d.services, 20);
  }

  function assignmentSection() {
    const d = W.data;
    if (!canChangeAssignment()) {
      const r = S.request(W.editId);
      return html`<section class="review-block"><div class="review-head"><h3>Vendors</h3></div>
        <ul class="plain-list">${r.invited.map((id) => html`<li>${C.vendorMini(S.vendor(id), S.cityName(S.vendor(id).baseCity))}</li>`)}</ul>
        <p class="muted small mt-2">Vendor assignment can’t be changed after submission. Use “Invite vendors” on the request page to add more.</p></section>`;
    }
    const cands = candidateVendors();
    if (!d.invitedTouched && !d.invited.length) d.invited = cands.slice(0, 3).map((c) => c.vendor.id);
    const pre = d.vendorId ? S.vendor(d.vendorId) : null;
    return html`<section class="review-block">
      <div class="review-head"><h3>Who should receive this request?</h3></div>
      <div class="choice-cards">
        <label class="choice-card"><input type="radio" name="assignMode" value="single" ${d.assignMode === 'single' ? 'checked' : ''} data-change="wz-assign"><span><strong>A specific vendor</strong><span class="muted small d-block">Send directly to one vendor you’ve chosen</span></span></label>
        <label class="choice-card"><input type="radio" name="assignMode" value="multi" ${d.assignMode === 'multi' ? 'checked' : ''} data-change="wz-assign"><span><strong>Invite best-matched vendors</strong><span class="muted small d-block">Collect and compare up to ${MAX_INVITES} quotations</span></span></label>
      </div>
      ${d.assignMode === 'single' ? html`<div class="field mt-3">
          <label for="f-vendorId">Vendor <span class="req" aria-hidden="true">*</span></label>
          <select class="input" ${fieldAttrs('vendorId')} data-change="wz">
            <option value="">Select a vendor in ${S.cityName(d.city)}</option>
            ${cands.map(({ vendor: v, score }) => html`<option value="${v.id}" ${d.vendorId === v.id ? 'selected' : ''}>${v.name} — ${v.rating.toFixed(1)}★ · ${score}% match</option>`)}
            ${pre && !pre.cities.includes(d.city) ? html`<option value="${pre.id}" selected>${pre.name} (does not cover ${S.cityName(d.city)})</option>` : ''}
          </select>${errorFor('vendorId')}
          ${pre && pre.cities.includes(d.city) ? html`<div class="selected-vendor mt-2">${vendorLogo(pre, 36)}<div><strong>${pre.name}</strong><span class="muted small d-block">${stars(pre.rating, 12)} ${pre.rating.toFixed(1)} · ${C.availability(pre).text} · ~${pre.responseHours} h response</span></div></div>` : ''}
        </div>`
      : html`<fieldset class="field mt-3"><legend>Vendors to invite (${d.invited.length}/${MAX_INVITES})</legend>
          ${cands.length ? html`<ul class="invite-list ${W.errors.invited ? 'invalid' : ''}">${cands.map(({ vendor: v, score }) => html`<li><label class="invite-option">
            <input type="checkbox" name="invited" value="${v.id}" ${d.invited.includes(v.id) ? 'checked' : ''} ${!d.invited.includes(v.id) && d.invited.length >= MAX_INVITES ? 'disabled' : ''} data-change="wz-invite">
            ${vendorLogo(v, 32)}<span class="grow"><strong>${v.name}</strong><span class="muted xsmall d-block">${v.rating.toFixed(1)}★ · ${v.experience} yrs · ${C.availability(v).text}${v.verified ? ' · Verified (sample)' : ''}</span></span>
            <span class="match-pill">${score}%</span></label></li>`)}</ul>`
          : html`<p class="field-error">${icon('alert', { size: 13 })} No sample vendors cover ${S.cityName(d.city)} for these services. You can save this request as a draft.</p>`}
          ${errorFor('invited')}
        </fieldset>`}
    </section>`;
  }

  function reviewBlock(step, title, rows) {
    return html`<section class="review-block">
      <div class="review-head"><h3>${title}</h3><button type="button" class="link-btn" data-action="wz-goto" data-step="${step}">${icon('edit', { size: 14 })} Edit</button></div>
      <dl class="info-grid">${rows.map(([k, v]) => C.infoRow(k, v))}</dl>
    </section>`;
  }

  function step5() {
    const d = W.data;
    const slot = (D.TIME_SLOTS.find((t) => t.id === d.timeSlot) || {}).name;
    const urg = (D.URGENCY.find((u) => u.id === d.urgency) || {}).name;
    return html`
      ${reviewBlock(1, 'Location', [['City', S.cityName(d.city)], ['Area', d.area], ['PIN code', d.pin], ['Site type', S.siteTypeName(d.siteType)], ['Address', d.address]])}
      ${reviewBlock(2, 'Service requirements', [['Services', d.services.map(S.serviceName).join(', ')], ['Cameras', d.cameras], ['Indoor / outdoor', { indoor: 'Indoor', outdoor: 'Outdoor', both: 'Indoor & outdoor' }[d.environment]], ['Site size', d.siteSize], ['Existing infrastructure', d.infrastructure], ['Description', d.description], ['Attachments', W.attachments.length ? W.attachments.map((a) => a.name).join(', ') : 'None']])}
      ${reviewBlock(3, 'Schedule & budget', [['Preferred date', fmtDate(d.preferredDate)], ['Time slot', slot], ['Urgency', urg], ['Estimated budget', inr(parseInt(String(d.budget).replace(/[,\s₹]/g, ''), 10))], ['Site inspection', d.inspection === 'yes' ? 'Required' : 'Not required']])}
      ${reviewBlock(4, 'Contact details', [['Requester', d.contactName], ['Organization', d.contactOrg], ['Work email', d.contactEmail], ['Phone', d.contactPhone]])}
      ${assignmentSection()}
      ${W.mode === 'new' ? html`<label class="check mt-3 ${W.errors.agree ? 'invalid' : ''}"><input type="checkbox" id="f-agree" name="agree" ${d.agree ? 'checked' : ''} data-change="wz"><span>I understand this is a demonstration — no real vendor will be contacted and no data leaves this browser.</span></label>${errorFor('agree')}` : ''}`;
  }

  /* ---------------- Main render ---------------- */

  function wizardHTML() {
    const steps = [null, step1, step2, step3, step4, step5];
    const errCount = Object.keys(W.errors).length;
    const isEdit = W.mode === 'edit';
    const req = isEdit ? S.request(W.editId) : null;
    const pre = W.data.assignMode === 'single' && W.data.vendorId ? S.vendor(W.data.vendorId) : null;
    const lastStep = W.step === 5;
    const isDraftish = !isEdit || (req && req.status === 'draft');
    return html`
      ${C.pageHeader({
        breadcrumb: [{ label: 'Service Requests', href: '#/requests' }, isEdit ? { label: W.editId, href: `#/requests/${W.editId}` } : null, { label: isEdit ? 'Edit' : 'New request' }].filter(Boolean),
        title: isEdit ? `Edit ${W.editId}` : 'New service request',
        subtitle: isEdit ? 'Update the request details. Invited vendors are notified of changes.' : 'Describe your CCTV requirement and we’ll route it to the right vendors.'
      })}
      <div class="wizard">
        <ol class="wizard-steps" aria-label="Form progress">
          ${STEPS.map((s) => {
            const state = s.id < W.step ? 'done' : s.id === W.step ? 'current' : '';
            const reachable = s.id <= W.maxStep;
            return html`<li class="ws ${state}">
              <button type="button" ${reachable ? '' : 'disabled'} data-action="wz-goto" data-step="${s.id}" ${s.id === W.step ? raw('aria-current="step"') : ''}>
                <span class="ws-dot">${state === 'done' ? icon('check', { size: 14, stroke: 3 }) : s.id}</span>
                <span class="ws-label"><span class="ws-kicker">Step ${s.id}</span>${s.label}</span>
              </button></li>`;
          })}
        </ol>
        <div class="wizard-grid">
          <form class="card wizard-card" data-form="wz-next" novalidate>
            <h2 class="h3 wizard-title">${icon(STEPS[W.step - 1].icon)} ${STEPS[W.step - 1].label}</h2>
            ${errCount ? html`<div class="callout callout-danger" role="alert">${icon('alert', { size: 16 })}<p class="small">Please fix ${plural(errCount, 'highlighted field')} to continue.</p></div>` : ''}
            <div id="wizard-body">${steps[W.step]()}</div>
            <div class="wizard-actions">
              ${W.step > 1 ? html`<button type="button" class="btn btn-ghost" data-action="wz-back">${icon('arrowLeft')} Back</button>` : html`<a class="btn btn-ghost" href="${isEdit ? `#/requests/${W.editId}` : '#/requests'}">Cancel</a>`}
              <span class="grow"></span>
              ${isDraftish ? html`<button type="button" class="btn btn-secondary" data-action="wz-draft">${icon('fileText')} Save as draft</button>` : ''}
              ${lastStep
                ? html`<button type="submit" class="btn btn-primary">${icon(isEdit && !isDraftish ? 'check' : 'send')} ${isEdit && !isDraftish ? 'Save changes' : 'Submit request'}</button>`
                : html`<button type="submit" class="btn btn-primary">Continue ${icon('arrowRight')}</button>`}
            </div>
          </form>
          <aside class="wizard-side">
            ${pre ? html`<section class="card"><p class="eyebrow">Selected vendor</p><div class="selected-vendor">${vendorLogo(pre, 40)}<div><a href="#/vendors/${pre.id}" class="fw-600">${pre.name}</a><span class="muted small d-block">${stars(pre.rating, 12)} ${pre.rating.toFixed(1)} · ${S.cityName(pre.baseCity)}</span></div></div></section>`
              : html`<section class="card"><p class="eyebrow">No vendor selected yet?</p><p class="small">No problem — on the last step you can invite up to ${MAX_INVITES} best-matched vendors in your city and compare their quotations side by side.</p></section>`}
            <section class="card"><p class="eyebrow">How it works</p>
              <ol class="how-list">
                <li><strong>Submit</strong><span>Vendors receive your request in their portal.</span></li>
                <li><strong>Compare</strong><span>Review quotations by price, schedule and warranty.</span></li>
                <li><strong>Track</strong><span>Approve, schedule and follow progress to completion.</span></li>
              </ol></section>
          </aside>
        </div>
      </div>`;
  }

  function successHTML() {
    const r = S.request(W.submitted);
    if (!r) return '';
    const vendors = r.invited.map(S.vendor);
    const isDraft = r.status === 'draft';
    return html`<section class="card success-card">
      <span class="success-icon">${icon(isDraft ? 'fileText' : 'checkCircle', { size: 34 })}</span>
      <h1 class="page-title" tabindex="-1">${isDraft ? 'Draft saved' : W.mode === 'edit' ? 'Request updated' : 'Service request submitted'}</h1>
      <p class="muted">Request ID <strong class="mono">${r.id}</strong> · ${isDraft ? 'You can finish and submit it any time.' : `Sent to ${plural(vendors.length, 'vendor')} in ${S.cityName(r.city)}.`}</p>
      <dl class="info-grid success-grid">
        ${C.infoRow('Status', C.requestStatus(r))}
        ${C.infoRow('Services', S.serviceNames(r.services))}
        ${C.infoRow('Site', `${r.area}, ${S.cityName(r.city)} ${r.pin}`)}
        ${C.infoRow('Cameras', r.cameras)}
        ${C.infoRow('Preferred date', fmtDate(r.preferredDate))}
        ${C.infoRow('Budget', inr(r.budget))}
      </dl>
      ${vendors.length ? html`<div class="success-vendors"><p class="eyebrow">${r.vendorId ? 'Selected vendor' : 'Invited vendors'}</p>${vendors.map((v) => html`<div class="selected-vendor">${vendorLogo(v, 36)}<div><strong>${v.name}</strong><span class="muted small d-block">${C.availability(v).text} · typically responds in ~${v.responseHours} h</span></div></div>`)}</div>` : ''}
      <div class="success-actions">
        <a class="btn btn-primary" href="#/requests/${r.id}">View request</a>
        <a class="btn btn-secondary" href="#/requests">All service requests</a>
        <button type="button" class="btn btn-ghost" data-action="wz-new">${icon('plus')} Create another</button>
      </div>
      ${!isDraft && vendors.length ? html`<div class="callout callout-info demo-tip">${icon('sparkles', { size: 16 })}<div><p class="small"><strong>Demo tip:</strong> switch to the vendor role to see this request arrive in ${vendors[0].name}’s portal and submit a quotation.</p>
        <button type="button" class="btn btn-sm btn-secondary mt-2" data-action="switch-to-vendor" data-vendor="${vendors[0].id}" data-go="#/portal/requests/${r.id}">${icon('swap', { size: 14 })} Switch to vendor view</button></div></div>` : ''}
    </section>`;
  }

  CC.views.requestForm = {
    title: (ctx) => (ctx.params.id ? `Edit ${ctx.params.id}` : 'New service request'),
    liveRefresh: false,
    render(ctx) {
      const key = ctx.path + '?' + new URLSearchParams(ctx.query).toString();
      if (ctx.params.id) {
        const r = S.request(ctx.params.id);
        if (!r) return CC.ui.emptyState({ icon: 'clipboard', title: 'Request not found', actions: html`<a class="btn btn-primary" href="#/requests">Back to requests</a>` });
        if (!S.EDITABLE.includes(r.status) && !(W && W.key === key && W.submitted)) {
          return CC.ui.emptyState({ icon: 'lock', title: 'This request can no longer be edited', text: `Requests that are “${S.statusLabel(r.status)}” are locked to protect quotations already submitted.`, actions: html`<a class="btn btn-primary" href="#/requests/${r.id}">View request</a>` });
        }
      }
      if (!W || W.key !== key || W.successShown) init(ctx, key);
      if (W.submitted) { W.successShown = true; return successHTML(); }
      return wizardHTML();
    },
    resetWizard() { W = null; }
  };

  function rerender(focusFirstError) {
    CC.app.render({ keepScroll: true });
    if (focusFirstError) {
      const first = $('[aria-invalid="true"], .invalid input');
      if (first) first.focus();
    }
  }

  function readField(el) {
    const name = el.name;
    if (!name || !W) return;
    if (el.type === 'checkbox' && name === 'agree') W.data.agree = el.checked;
    else if (el.type === 'radio') { if (el.checked) W.data[name] = el.value; }
    else W.data[name] = el.value;
    if (W.errors[name]) {
      // Clear the error inline as soon as the user fixes it.
      const tmp = validate(W.step);
      if (!tmp[name]) {
        delete W.errors[name];
        el.removeAttribute('aria-invalid');
        const err = $(`#err-${name}`); if (err) err.remove();
      }
    }
    if (name === 'description') { const c = $('#desc-count'); if (c) c.textContent = el.value.length; }
  }

  Object.assign(CC.inputs, { wz: readField });
  Object.assign(CC.changes, {
    wz: readField,
    'wz-city': (el) => { readField(el); W.data.invitedTouched = false; W.data.invited = []; rerender(); const f = $('#f-city'); if (f) f.focus(); },
    'wz-services': () => {
      W.data.services = $$('input[name="services"]:checked').map((i) => i.value);
      W.data.invitedTouched = false; W.data.invited = [];
      if (W.errors.services && W.data.services.length) { delete W.errors.services; }
    },
    'wz-assign': (el) => { W.data.assignMode = el.value; delete W.errors.vendorId; delete W.errors.invited; rerender(); },
    'wz-invite': () => {
      W.data.invited = $$('input[name="invited"]:checked').map((i) => i.value);
      W.data.invitedTouched = true;
      delete W.errors.invited;
      const full = W.data.invited.length >= MAX_INVITES;
      $$('input[name="invited"]').forEach((i) => { i.disabled = full && !i.checked; });
      const legend = $('.invite-list') && $('.invite-list').closest('fieldset').querySelector('legend');
      if (legend) legend.textContent = `Vendors to invite (${W.data.invited.length}/${MAX_INVITES})`;
    },
    'wz-files': (el) => {
      const files = Array.from(el.files || []);
      el.value = '';
      addFiles(files);
    }
  });

  function addFiles(files) {
    const rejected = [];
    files.forEach((f) => {
      if (W.attachments.length >= MAX_FILES) { rejected.push(`${f.name} (limit of ${MAX_FILES} files)`); return; }
      if (f.size > MAX_FILE_BYTES) { rejected.push(`${f.name} (over 5 MB)`); return; }
      if (!(f.type.startsWith('image/') || f.type === 'application/pdf')) { rejected.push(`${f.name} (unsupported type)`); return; }
      const a = { id: CC.ui.uid('F'), name: f.name, size: f.size, type: f.type, preview: null };
      W.attachments.push(a);
      if (f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => { a.preview = reader.result; if (W.step === 2) rerender(); };
        reader.readAsDataURL(f);
      }
    });
    if (rejected.length) toast(`Not added: ${rejected.join(', ')}`, 'warning', { title: 'Some files were skipped' });
    rerender();
  }

  // Drag & drop onto the dropzone.
  document.addEventListener('dragover', (e) => { const z = e.target.closest && e.target.closest('.dropzone'); if (z) { e.preventDefault(); z.classList.add('drag'); } });
  document.addEventListener('dragleave', (e) => { const z = e.target.closest && e.target.closest('.dropzone'); if (z) z.classList.remove('drag'); });
  document.addEventListener('drop', (e) => {
    const z = e.target.closest && e.target.closest('.dropzone');
    if (!z) return;
    e.preventDefault();
    z.classList.remove('drag');
    addFiles(Array.from(e.dataTransfer.files || []));
  });

  function goTo(step) {
    W.step = step;
    W.errors = {};
    rerender();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const t = $('.wizard-title'); if (t) { t.tabIndex = -1; t.focus({ preventScroll: true }); }
  }

  Object.assign(CC.actions, {
    'wz-back': () => goTo(Math.max(1, W.step - 1)),
    'wz-goto': (el) => {
      const target = +el.dataset.step;
      if (target > W.step) {
        // Moving forward through the stepper still requires valid steps.
        for (let s = W.step; s < target; s++) {
          const e = validate(s);
          if (Object.keys(e).length) { W.step = s; W.errors = e; rerender(true); return; }
        }
      }
      goTo(target);
    },
    'wz-remove-file': (el) => { W.attachments = W.attachments.filter((a) => a.id !== el.dataset.id); rerender(); },
    'wz-budget': (el) => { W.data.budget = el.dataset.value; delete W.errors.budget; rerender(); },
    'wz-new': () => { W = null; CC.app.navigate('/requests/new'); CC.app.render(); },
    'wz-draft': () => {
      const d = W.data;
      if (!d.city) { W.step = 1; W.errors = { city: 'Select a city before saving a draft.' }; rerender(true); return; }
      const payload = Object.assign({}, d, { attachments: W.attachments });
      if (W.mode === 'edit') {
        S.updateRequest(W.editId, payload);
        W.submitted = W.editId;
      } else {
        const r = S.createRequest(payload, { draft: true });
        W.submitted = r.id;
      }
      toast(`Draft ${W.submitted} saved.`, 'success', { title: 'Draft saved' });
      rerender();
    }
  });

  CC.forms['wz-next'] = () => {
    const e = validate(W.step);
    W.errors = e;
    if (Object.keys(e).length) { rerender(true); return; }
    if (W.step < 5) { W.maxStep = Math.max(W.maxStep, W.step + 1); goTo(W.step + 1); return; }
    // Final submission — validate all steps once more.
    for (let s = 1; s <= 5; s++) {
      const errs = validate(s);
      if (Object.keys(errs).length) { W.step = s; W.errors = errs; rerender(true); return; }
    }
    const payload = Object.assign({}, W.data, { attachments: W.attachments });
    if (W.mode === 'edit') {
      const wasDraft = S.request(W.editId).status === 'draft';
      S.updateRequest(W.editId, payload);
      if (wasDraft) S.submitDraft(W.editId);
      W.submitted = W.editId;
      toast(`${W.editId} ${wasDraft ? 'submitted' : 'updated'} successfully.`, 'success', { title: 'Request saved' });
    } else {
      const r = S.createRequest(payload);
      W.submitted = r.id;
      toast(`${r.id} sent to ${plural(r.invited.length, 'vendor')}.`, 'success', { title: 'Request submitted' });
    }
    rerender();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
})();
