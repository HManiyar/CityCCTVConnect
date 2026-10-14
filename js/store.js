/*
 * CityConnect — centralised application state
 * ------------------------------------------------------------------
 * Single source of truth persisted to LocalStorage. All mutations go
 * through the functions below so that request status, quotations,
 * notifications, activity history and dashboard metrics stay
 * consistent. Every view reads from here; nothing keeps its own copy.
 *
 * In a future full-stack version these functions map 1:1 onto API
 * endpoints (POST /requests, POST /requests/:id/quotes, ...).
 */
(function () {
  'use strict';

  const D = window.CC.data;
  const U = window.CC.ui;

  /* ---------------- Status model ---------------- */

  const STATUSES = {
    draft: { label: 'Draft', tone: 'neutral' },
    submitted: { label: 'Submitted', tone: 'info' },
    under_review: { label: 'Under Review', tone: 'violet' },
    quotation_received: { label: 'Quotation Received', tone: 'amber' },
    approved: { label: 'Approved', tone: 'teal' },
    scheduled: { label: 'Scheduled', tone: 'blue' },
    in_progress: { label: 'In Progress', tone: 'indigo' },
    completed: { label: 'Completed', tone: 'success' },
    cancelled: { label: 'Cancelled', tone: 'danger' }
  };
  const LIFECYCLE = ['submitted', 'under_review', 'quotation_received', 'approved', 'scheduled', 'in_progress', 'completed'];

  // Allowed status transitions. Anything not listed is rejected.
  const TRANSITIONS = {
    draft: ['submitted', 'cancelled'],
    submitted: ['under_review', 'quotation_received', 'cancelled'],
    under_review: ['quotation_received', 'cancelled'],
    quotation_received: ['approved', 'under_review', 'cancelled'],
    approved: ['scheduled', 'cancelled'],
    scheduled: ['in_progress', 'cancelled'],
    in_progress: ['completed'],
    completed: [],
    cancelled: []
  };
  const OPEN = ['submitted', 'under_review', 'quotation_received'];
  const ACTIVE = ['approved', 'scheduled', 'in_progress'];
  const EDITABLE = ['draft', 'submitted', 'under_review'];
  const CANCELLABLE = ['draft', 'submitted', 'under_review', 'quotation_received', 'approved', 'scheduled'];

  const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

  /* ---------------- State & persistence ---------------- */

  let state = null;
  let storageOk = true;
  const listeners = new Set();

  function emit(change) { listeners.forEach((fn) => { try { fn(change); } catch (e) { console.error(e); } }); }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  function save(change) {
    if (storageOk) {
      try { localStorage.setItem(D.STORAGE_KEY, JSON.stringify(state)); }
      catch (e) {
        storageOk = false;
        U.toast('Browser storage is unavailable or full — changes will last only for this session.', 'warning', { title: 'Storage warning' });
      }
    }
    emit(change || {});
  }

  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(D.STORAGE_KEY) || 'null'); }
    catch (e) { storageOk = false; }
    if (saved && saved.version === 1 && Array.isArray(saved.requests)) {
      state = saved;
    } else {
      state = buildSeed();
      if (storageOk) { try { localStorage.setItem(D.STORAGE_KEY, JSON.stringify(state)); } catch (e) { storageOk = false; } }
    }
    return state;
  }

  function reset() {
    state = buildSeed();
    save({ type: 'reset' });
  }

  /* ---------------- Seed construction ---------------- */

  function buildSeed() {
    const now = Date.now();
    const DAY = 86400000;
    const s = {
      version: 1,
      seededAt: new Date(now).toISOString(),
      org: JSON.parse(JSON.stringify(D.ORGANIZATION)),
      settings: { role: 'org', vendorId: 'v-ssv', recommendCity: 'rajkot', recommendService: 'install' },
      vendors: JSON.parse(JSON.stringify(D.VENDORS)).map(enrichVendor),
      requests: [], quotes: [], notifications: [], activity: [], messages: [],
      counters: { request: D.REQUEST_ID_START }
    };

    D.SAMPLE_REQUESTS.forEach((sr) => {
      const created = now - sr.createdDaysAgo * DAY + 3.5 * 3600000;
      const path = sr.status === 'draft' ? [] : sr.status === 'cancelled' ? ['submitted'] : LIFECYCLE.slice(0, LIFECYCLE.indexOf(sr.status) + 1);
      const span = Math.max(0.2, sr.createdDaysAgo * 0.85);
      const step = Math.min(3, span / Math.max(1, path.length));
      const at = (i) => new Date(Math.min(now - 1800000, created + i * step * DAY + (i ? 2 * 3600000 : 0))).toISOString();

      const req = {
        id: sr.id, createdAt: new Date(created).toISOString(), updatedAt: new Date(created).toISOString(),
        status: sr.status, city: sr.city, area: sr.area, pin: sr.pin, address: sr.address, siteType: sr.siteType,
        services: sr.services.slice(), cameras: sr.cameras, environment: sr.environment, siteSize: sr.siteSize,
        infrastructure: sr.infrastructure, description: sr.description, attachments: [],
        preferredDate: U.ymd(new Date(created + sr.preferredInDays * DAY)), timeSlot: sr.timeSlot, urgency: sr.urgency,
        budget: sr.budget, inspection: sr.inspection,
        contact: { name: s.org.user.name, org: s.org.name, email: s.org.user.email, phone: s.org.user.phone },
        vendorId: sr.vendorId, invited: sr.invited.slice(), responses: {}, approvedQuoteId: null,
        progress: 0, progressUpdates: [], completionPending: false, scheduledDate: null, cancelReason: null,
        rating: null, history: []
      };
      req.history.push({ status: 'draft', at: req.createdAt, by: 'org', actor: s.org.user.name, note: 'Request drafted' });
      path.forEach((st, i) => {
        req.history.push({ status: st, at: at(i), by: st === 'submitted' || st === 'approved' || st === 'completed' ? 'org' : 'vendor', actor: '', note: seedNote(st) });
      });
      if (sr.status === 'cancelled') {
        req.cancelReason = sr.cancelReason;
        req.history.push({ status: 'cancelled', at: at(2), by: 'org', actor: s.org.user.name, note: sr.cancelReason });
      }
      req.updatedAt = req.history[req.history.length - 1].at;

      // Vendor responses: vendors with a quote or a reviewed request have accepted.
      const quotes = D.SAMPLE_QUOTES.filter((q) => q.requestId === sr.id);
      quotes.forEach((q) => { req.responses[q.vendorId] = { status: 'accepted', at: at(1) }; });
      if (sr.status === 'under_review' && sr.vendorId) req.responses[sr.vendorId] = { status: 'accepted', at: at(1) };

      const qStepIdx = path.indexOf('quotation_received');
      quotes.forEach((q, k) => {
        const qAt = new Date(new Date(at(Math.max(qStepIdx, 1))).getTime() - (quotes.length - 1 - k) * 5 * 3600000).toISOString();
        const quote = makeQuote({
          requestId: req.id, vendorId: q.vendorId, labor: q.labor, material: q.material, other: q.other,
          completionDays: q.completionDays, proposedDate: U.ymd(new Date(created + q.proposedInDays * DAY)),
          validUntil: U.ymd(new Date(new Date(qAt).getTime() + 21 * DAY)), warranty: q.warranty, notes: q.notes
        }, qAt);
        quote.status = q.status;
        if (q.status === 'approved') { req.approvedQuoteId = quote.id; quote.decidedAt = at(path.indexOf('approved')); }
        s.quotes.push(quote);
      });

      if (['scheduled', 'in_progress', 'completed'].includes(sr.status)) {
        const aq = s.quotes.find((q) => q.id === req.approvedQuoteId);
        req.scheduledDate = aq ? aq.proposedDate : req.preferredDate;
      }
      if (sr.status === 'completed') req.progress = 100;
      if (sr.status === 'in_progress') {
        req.progress = sr.progress || 30;
        const startAt = new Date(at(path.indexOf('in_progress'))).getTime();
        req.progressUpdates = [
          { at: new Date(startAt).toISOString(), pct: 10, note: 'Team on site. Survey of existing cabling and recorder completed.', by: 'vendor' },
          { at: new Date(Math.min(now - 3600000, startAt + 0.6 * DAY)).toISOString(), pct: req.progress, note: 'Servicing completed for most cameras; replacement units being configured.', by: 'vendor' }
        ];
      }
      if (sr.status === 'completed') req.rating = 5;
      s.requests.push(req);

      // Activity history derived from the seeded lifecycle.
      req.history.forEach((h) => {
        s.activity.push({ id: U.uid('ACT'), at: h.at, requestId: req.id, type: h.status, text: activityText(h.status, req, s) });
      });
    });

    // Activity for seeded quotations (dashboard timeline).
    s.quotes.forEach((q) => {
      const v = s.vendors.find((x) => x.id === q.vendorId);
      s.activity.push({ id: U.uid('ACT'), at: q.createdAt, requestId: q.requestId, type: 'quote', text: `${v.name} submitted a quotation of ${U.inr(q.total)} for ${q.requestId}` });
    });
    s.activity.sort((a, b) => b.at.localeCompare(a.at));

    // Seed notifications (most recent unread, older ones read).
    const n = (audience, vendorId, type, title, body, link, hoursAgo, read) => ({
      id: U.uid('NTF'), audience, vendorId: vendorId || null, type, title, body, link,
      at: new Date(now - hoursAgo * 3600000).toISOString(), read: !!read
    });
    s.notifications = [
      n('org', null, 'quote', 'Quotation received', 'GujSecure Infra Pvt. Ltd. quoted for CC-REQ-2044 (Rajkot warehouse).', '#/requests/CC-REQ-2044/compare', 7),
      n('org', null, 'quote', 'Quotation received', 'Navanagar Security Services quoted for CC-REQ-2046 (Morbi depot).', '#/requests/CC-REQ-2046/compare', 20),
      n('org', null, 'response', 'Vendor accepted request', 'Navanagar Security Services is reviewing CC-REQ-2043 and will share a quotation.', '#/requests/CC-REQ-2043', 30),
      n('org', null, 'progress', 'Work in progress — 60%', 'Shreeji CCTV & Security Solutions updated progress on CC-REQ-2041.', '#/requests/CC-REQ-2041', 40, true),
      n('org', null, 'scheduled', 'Job scheduled', 'Suraksha Integrated Systems scheduled CC-REQ-2040 at Sachin GIDC.', '#/requests/CC-REQ-2040', 120, true),
      n('org', null, 'completed', 'Job completed', 'Diamond City Security Networks completed CC-REQ-2037 (Surat).', '#/requests/CC-REQ-2037', 1700, true),
      n('vendor', 'v-ssv', 'new_request', 'New service request', 'Sapphire Retail & Logistics invited you to quote for CC-REQ-2046 in Morbi.', '#/portal/requests/CC-REQ-2046', 90),
      n('vendor', 'v-ssv', 'new_request', 'New service request', 'CC-REQ-2044: 24-camera warehouse installation in Aji GIDC, Rajkot.', '#/portal/requests/CC-REQ-2044', 118, true),
      n('vendor', 'v-gohilwad', 'new_request', 'New service request', 'CC-REQ-2045: 8-camera retail installation on Waghawadi Road, Bhavnagar.', '#/portal/requests/CC-REQ-2045', 46),
      n('vendor', 'v-barodian', 'approved', 'Quotation approved', 'Your quotation for CC-REQ-2042 (Alkapuri office) was approved. Please schedule the visit.', '#/portal/requests/CC-REQ-2042', 50)
    ];
    return s;
  }

  function seedNote(status) {
    return {
      submitted: 'Request submitted to vendor',
      under_review: 'Vendor accepted and is reviewing requirements',
      quotation_received: 'Quotation received',
      approved: 'Quotation approved',
      scheduled: 'Job scheduled with vendor',
      in_progress: 'Work started on site',
      completed: 'Completion confirmed by organisation'
    }[status] || '';
  }

  function activityText(status, req, s) {
    const st = s || state;
    const v = req.vendorId ? st.vendors.find((x) => x.id === req.vendorId) : null;
    const city = cityName(req.city);
    return {
      draft: `${req.id} drafted for ${city}`,
      submitted: `${req.id} submitted — ${serviceNames(req.services)} in ${city}`,
      under_review: `${v ? v.name : 'Vendor'} accepted ${req.id} for review`,
      quotation_received: `Quotation received for ${req.id}`,
      approved: `Quotation approved for ${req.id}${v ? ` — ${v.name}` : ''}`,
      scheduled: `${req.id} scheduled${v ? ` with ${v.name}` : ''}`,
      in_progress: `Work started on ${req.id} in ${city}`,
      completed: `${req.id} completed in ${city}`,
      cancelled: `${req.id} was cancelled`
    }[status] || `${req.id} updated`;
  }

  /** Adds derived presentation data (images, reviews, packages) to a vendor. */
  function enrichVendor(v, index) {
    const I = D.IMAGES;
    const coverPool = [I.cctvWall, I.officeTower, I.warehouse, I.serverRoom, I.cctvBlack, I.factory, I.security, I.officeInterior];
    const galleryPool = [I.cctvWall, I.warehouse, I.retail, I.officeTower, I.factory, I.serverRoom, I.cctvBlack, I.networkCables, I.warehouseTeam, I.officeInterior, I.residential, I.technician];
    v.sample = true;
    v.cover = coverPool[index % coverPool.length];
    v.portfolio = v.portfolio.map((title, k) => ({ title, img: galleryPool[(index * 3 + k) % galleryPool.length] }));
    v.reviews = [0, 1, 2].map((k) => {
      const r = D.REVIEW_POOL[(index + k * 2) % D.REVIEW_POOL.length];
      return { author: r.author, org: r.org, rating: k === 1 && v.rating < 4.5 ? 4 : r.rating, text: r.text, daysAgo: 12 + index * 3 + k * 37 };
    });
    const pc = v.pricing.perCamera;
    v.packages = [
      { name: 'Starter', desc: '4-camera HD kit for shops & small offices', price: Math.round((pc * 4 + 2500) / 100) * 100, includes: ['4 cameras + 4-channel recorder', '1 TB storage', 'Mobile viewing set-up', '6 months labour warranty'] },
      { name: 'Business', desc: '8-camera IP system for offices & stores', price: Math.round((pc * 8 + 6000) / 100) * 100, includes: ['8 IP cameras + 8/16-channel NVR', '2 TB storage', 'Remote viewing for 3 users', '1 year comprehensive warranty'], featured: true },
      { name: 'Annual care', desc: 'Per-camera AMC with quarterly visits', price: v.pricing.amc, unit: '/ camera / year', includes: ['4 preventive visits', 'Priority breakdown support', 'Health report after each visit', 'Firmware & storage checks'] }
    ];
    return v;
  }

  /* ---------------- Lookups ---------------- */

  const getState = () => state;
  const vendors = () => state.vendors;
  const vendor = (id) => state.vendors.find((v) => v.id === id) || null;
  const request = (id) => state.requests.find((r) => r.id === id) || null;
  const quote = (id) => state.quotes.find((q) => q.id === id) || null;
  const quotesFor = (requestId) => state.quotes.filter((q) => q.requestId === requestId);
  const city = (id) => D.CITIES.find((c) => c.id === id) || null;
  const cityName = (id) => (city(id) || { name: id || '—' }).name;
  const service = (id) => D.SERVICES.find((s) => s.id === id) || null;
  const serviceName = (id) => (service(id) || { name: id }).name;
  const serviceNames = (ids) => (ids || []).map((id) => (service(id) || { short: id }).short).join(', ');
  const siteTypeName = (id) => (D.SITE_TYPES.find((t) => t.id === id) || { name: id || '—' }).name;
  const statusLabel = (st) => (STATUSES[st] || { label: st }).label;
  const vendorsInCity = (cityId) => state.vendors.filter((v) => v.cities.includes(cityId));

  /* ---------------- Recommendation logic ---------------- */

  /**
   * Scores a vendor (0–100) for a city + service need. Balances quality
   * (rating, experience, verification), fit (service match, local base)
   * and responsiveness (availability, response time).
   */
  function vendorScore(v, cityId, serviceIds) {
    const svc = serviceIds && serviceIds.length ? serviceIds : [];
    const match = svc.length ? svc.filter((s) => v.services.includes(s)).length / svc.length : 1;
    let score = 0;
    score += (v.rating / 5) * 34;
    score += (Math.min(v.experience, 18) / 18) * 12;
    score += v.verified ? 8 : 0;
    score += Math.max(0, 10 - v.nextAvailableDays * 1.6);
    score += Math.max(0, 9 - v.responseHours * 1.1);
    score += match * 17;
    if (cityId) score += v.baseCity === cityId ? 10 : v.cities.includes(cityId) ? 4 : -40;
    return Math.round(U.clamp(score, 0, 100));
  }

  function recommendVendors(cityId, serviceIds, limit = 3) {
    return state.vendors
      .filter((v) => !cityId || v.cities.includes(cityId))
      .filter((v) => !serviceIds || !serviceIds.length || serviceIds.some((s) => v.services.includes(s)))
      .map((v) => ({ vendor: v, score: vendorScore(v, cityId, serviceIds) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Quotation recommendation: deliberately NOT simply the cheapest.
   * Weighs price, vendor rating, experience, schedule fit with the
   * preferred date, completion time, warranty and local coverage.
   */
  function rankQuotes(req, quotes) {
    const list = quotes.filter((q) => q.status === 'submitted' || q.status === 'approved');
    if (!list.length) return { ranked: [], lowestId: null, recommendedId: null };
    const minTotal = Math.min(...list.map((q) => q.total));
    const minDays = Math.min(...list.map((q) => q.completionDays));
    const ranked = list.map((q) => {
      const v = vendor(q.vendorId);
      const late = Math.max(0, U.daysBetween(req.preferredDate, q.proposedDate));
      const warrantyIdx = Math.max(0, D.WARRANTY_OPTIONS.indexOf(q.warranty));
      const serviceFit = req.services.filter((s) => v.services.includes(s)).length / Math.max(1, req.services.length);
      const parts = {
        price: (minTotal / q.total) * 32,
        rating: (v.rating / 5) * 20,
        experience: (Math.min(v.experience, 15) / 15) * 10,
        schedule: (1 - Math.min(late, 14) / 14) * 15,
        speed: (minDays / Math.max(1, q.completionDays)) * 5,
        warranty: (warrantyIdx / (D.WARRANTY_OPTIONS.length - 1)) * 8,
        coverage: ((v.baseCity === req.city ? 1 : v.cities.includes(req.city) ? 0.55 : 0) * 0.6 + serviceFit * 0.4) * 10
      };
      const score = Object.values(parts).reduce((a, b) => a + b, 0);
      const reasons = [];
      if (q.total === minTotal) reasons.push('Lowest total price');
      else if (q.total <= minTotal * 1.1) reasons.push('Within 10% of the lowest price');
      if (v.rating >= 4.6) reasons.push(`Strong rating (${v.rating.toFixed(1)}★, sample data)`);
      if (v.experience >= 12) reasons.push(`${v.experience} years of experience`);
      if (late === 0) reasons.push('Meets your preferred date');
      else if (late > 3) reasons.push(`Starts ${late} days after your preferred date`);
      if (v.baseCity === req.city) reasons.push(`Locally based in ${cityName(req.city)}`);
      if (warrantyIdx >= 2) reasons.push('Extended warranty');
      return { quote: q, vendor: v, score: Math.round(score), parts, late, reasons };
    }).sort((a, b) => b.score - a.score);
    return { ranked, lowestId: list.find((q) => q.total === minTotal).id, recommendedId: ranked[0].quote.id };
  }

  /* ---------------- Metrics ---------------- */

  function stats() {
    const r = state.requests;
    const cities = new Set();
    state.vendors.forEach((v) => v.cities.forEach((c) => cities.add(c)));
    return {
      totalVendors: state.vendors.length,
      verifiedVendors: state.vendors.filter((v) => v.verified).length,
      citiesCovered: cities.size,
      openRequests: r.filter((x) => OPEN.includes(x.status)).length,
      activeJobs: r.filter((x) => ACTIVE.includes(x.status)).length,
      completedJobs: r.filter((x) => x.status === 'completed').length,
      pendingQuotes: state.quotes.filter((q) => q.status === 'submitted' && (request(q.requestId) || {}).status !== 'cancelled').length,
      drafts: r.filter((x) => x.status === 'draft').length,
      cancelled: r.filter((x) => x.status === 'cancelled').length,
      total: r.length
    };
  }

  /* ---------------- Notifications & activity ---------------- */

  function notify(n) {
    state.notifications.unshift({
      id: U.uid('NTF'), audience: n.audience, vendorId: n.vendorId || null, type: n.type,
      title: n.title, body: n.body, link: n.link || '', at: new Date().toISOString(), read: false
    });
    if (state.notifications.length > 200) state.notifications.length = 200;
  }
  function logActivity(requestId, type, text) {
    state.activity.unshift({ id: U.uid('ACT'), at: new Date().toISOString(), requestId, type, text });
    if (state.activity.length > 400) state.activity.length = 400;
  }
  function notificationsForCurrentRole() {
    const { role, vendorId } = state.settings;
    return state.notifications.filter((n) => n.audience === role && (role === 'org' || n.vendorId === vendorId));
  }
  function unreadCount() { return notificationsForCurrentRole().filter((n) => !n.read).length; }
  function markRead(id) {
    const n = state.notifications.find((x) => x.id === id);
    if (n && !n.read) { n.read = true; save({ type: 'notification' }); }
  }
  function markAllRead() {
    notificationsForCurrentRole().forEach((n) => { n.read = true; });
    save({ type: 'notification' });
  }

  /* ---------------- Internal helpers ---------------- */

  function setStatus(req, to, by, note) {
    if (!canTransition(req.status, to)) {
      throw new Error(`A request cannot move from “${statusLabel(req.status)}” to “${statusLabel(to)}”.`);
    }
    req.status = to;
    req.updatedAt = new Date().toISOString();
    req.history.push({ status: to, at: req.updatedAt, by, actor: actorName(by), note: note || seedNote(to) });
    logActivity(req.id, to, activityText(to, req));
  }
  function note(req, text, by) {
    req.updatedAt = new Date().toISOString();
    req.history.push({ status: null, at: req.updatedAt, by, actor: actorName(by), note: text });
  }
  function actorName(by) {
    if (by === 'org') return state.org.user.name;
    if (by === 'vendor') return (vendor(state.settings.vendorId) || {}).name || '';
    return 'CityConnect';
  }
  function requireRequest(id) {
    const r = request(id);
    if (!r) throw new Error(`Request ${id} was not found.`);
    return r;
  }
  function makeQuote(q, at) {
    const labor = Math.max(0, Math.round(+q.labor || 0));
    const material = Math.max(0, Math.round(+q.material || 0));
    const other = Math.max(0, Math.round(+q.other || 0));
    const subtotal = labor + material + other;
    const gst = Math.round(subtotal * 0.18);
    return {
      id: U.uid('QT'), requestId: q.requestId, vendorId: q.vendorId, createdAt: at || new Date().toISOString(),
      labor, material, other, subtotal, gst, total: subtotal + gst,
      completionDays: Math.max(1, Math.round(+q.completionDays || 1)), proposedDate: q.proposedDate, validUntil: q.validUntil,
      warranty: q.warranty, notes: q.notes || '', status: 'submitted', revision: 1
    };
  }
  function nextRequestId() {
    const id = `CC-REQ-${state.counters.request}`;
    state.counters.request += 1;
    return id;
  }

  /* ---------------- Organisation actions ---------------- */

  /** Creates a request from wizard data. opts.draft saves without submitting. */
  function createRequest(data, opts = {}) {
    const now = new Date().toISOString();
    const req = Object.assign({
      id: nextRequestId(), createdAt: now, updatedAt: now, status: 'draft', responses: {}, approvedQuoteId: null,
      progress: 0, progressUpdates: [], completionPending: false, scheduledDate: null, cancelReason: null, rating: null, history: []
    }, sanitizeRequestData(data));
    req.history.push({ status: 'draft', at: now, by: 'org', actor: state.org.user.name, note: 'Request drafted' });
    state.requests.unshift(req);
    logActivity(req.id, 'draft', activityText('draft', req));
    if (!opts.draft) submitInternal(req);
    save({ type: 'request', id: req.id });
    return req;
  }

  function sanitizeRequestData(d) {
    return {
      city: d.city, area: String(d.area || '').trim(), pin: String(d.pin || '').trim(), address: String(d.address || '').trim(),
      siteType: d.siteType, services: (d.services || []).slice(), cameras: Math.max(1, parseInt(d.cameras, 10) || 1),
      environment: d.environment, siteSize: d.siteSize, infrastructure: d.infrastructure, description: String(d.description || '').trim(),
      attachments: (d.attachments || []).map((a) => ({ name: a.name, size: a.size, type: a.type })),
      preferredDate: d.preferredDate, timeSlot: d.timeSlot, urgency: d.urgency, budget: Math.max(0, parseInt(d.budget, 10) || 0),
      inspection: !!d.inspection,
      contact: { name: String(d.contactName || '').trim(), org: String(d.contactOrg || '').trim(), email: String(d.contactEmail || '').trim(), phone: String(d.contactPhone || '').trim() },
      vendorId: d.assignMode === 'single' ? d.vendorId : null,
      invited: d.assignMode === 'single' ? [d.vendorId] : (d.invited || []).slice()
    };
  }

  function submitInternal(req) {
    setStatus(req, 'submitted', 'org', req.invited.length ? `Sent to ${req.invited.length === 1 ? vendor(req.invited[0]).name : req.invited.length + ' vendors'}` : 'Submitted');
    req.invited.forEach((vid) => notify({
      audience: 'vendor', vendorId: vid, type: 'new_request', title: 'New service request',
      body: `${req.contact.org || state.org.name} requested ${serviceNames(req.services)} in ${cityName(req.city)} (${req.id}).`,
      link: `#/portal/requests/${req.id}`
    }));
    notify({ audience: 'org', type: 'new_request', title: 'Service request submitted', body: `${req.id} was sent to ${plural(req.invited.length, 'vendor')} in ${cityName(req.city)}.`, link: `#/requests/${req.id}` });
  }
  function plural(n, w) { return `${n} ${n === 1 ? w : w + 's'}`; }

  function submitDraft(id) {
    const req = requireRequest(id);
    if (!req.invited.length) throw new Error('Choose at least one vendor before submitting this draft.');
    submitInternal(req);
    save({ type: 'request', id });
    return req;
  }

  function updateRequest(id, data) {
    const req = requireRequest(id);
    if (!EDITABLE.includes(req.status)) throw new Error(`Requests that are “${statusLabel(req.status)}” can no longer be edited.`);
    const clean = sanitizeRequestData(data);
    // Vendor assignment can only change while still a draft.
    if (req.status !== 'draft') { delete clean.vendorId; delete clean.invited; }
    Object.assign(req, clean);
    note(req, 'Request details updated', 'org');
    logActivity(req.id, 'edit', `${req.id} details were updated`);
    req.invited.forEach((vid) => {
      if (req.status !== 'draft' && (req.responses[vid] || {}).status !== 'declined') {
        notify({ audience: 'vendor', vendorId: vid, type: 'update', title: 'Request updated', body: `${req.id} requirements were updated by the organisation.`, link: `#/portal/requests/${req.id}` });
      }
    });
    save({ type: 'request', id });
    return req;
  }

  function cancelRequest(id, reason) {
    const req = requireRequest(id);
    if (!CANCELLABLE.includes(req.status)) throw new Error('Work has already started — this request can no longer be cancelled.');
    const wasDraft = req.status === 'draft';
    setStatus(req, 'cancelled', 'org', reason || 'Cancelled by organisation');
    req.cancelReason = reason || '';
    quotesFor(id).forEach((q) => { if (q.status === 'submitted') q.status = 'closed'; });
    if (!wasDraft) {
      req.invited.forEach((vid) => notify({ audience: 'vendor', vendorId: vid, type: 'cancelled', title: 'Request cancelled', body: `${req.id} in ${cityName(req.city)} was cancelled by the organisation.`, link: `#/portal/requests/${req.id}` }));
    }
    save({ type: 'request', id });
  }

  function inviteVendors(id, vendorIds) {
    const req = requireRequest(id);
    if (!OPEN.includes(req.status)) throw new Error('Vendors can only be invited while the request is open.');
    const added = vendorIds.filter((v) => !req.invited.includes(v));
    if (!added.length) throw new Error('Select at least one new vendor to invite.');
    req.invited.push(...added);
    note(req, `Invited ${added.map((v) => vendor(v).name).join(', ')}`, 'org');
    added.forEach((vid) => notify({ audience: 'vendor', vendorId: vid, type: 'new_request', title: 'New service request', body: `You were invited to quote for ${req.id} — ${serviceNames(req.services)} in ${cityName(req.city)}.`, link: `#/portal/requests/${req.id}` }));
    logActivity(req.id, 'invite', `${plural(added.length, 'vendor')} invited to ${req.id}`);
    save({ type: 'request', id });
    return added;
  }

  function approveQuote(quoteId) {
    const q = quote(quoteId);
    if (!q || q.status !== 'submitted') throw new Error('This quotation is no longer available for approval.');
    const req = requireRequest(q.requestId);
    if (U.parseYMD(U.ymd(new Date())) > U.parseYMD(q.validUntil)) throw new Error('This quotation has expired. Ask the vendor to revise it.');
    const v = vendor(q.vendorId);
    setStatus(req, 'approved', 'org', `Approved ${v.name} — ${U.inr(q.total)}`);
    q.status = 'approved'; q.decidedAt = req.updatedAt;
    req.approvedQuoteId = q.id;
    req.vendorId = q.vendorId;
    quotesFor(req.id).forEach((o) => {
      if (o.id !== q.id && o.status === 'submitted') {
        o.status = 'not_selected'; o.decidedAt = req.updatedAt;
        notify({ audience: 'vendor', vendorId: o.vendorId, type: 'rejected', title: 'Quotation not selected', body: `Another vendor was selected for ${req.id}. Thank you for quoting.`, link: `#/portal/requests/${req.id}` });
      }
    });
    notify({ audience: 'vendor', vendorId: q.vendorId, type: 'approved', title: 'Quotation approved', body: `Your quotation of ${U.inr(q.total)} for ${req.id} was approved. Please confirm the schedule.`, link: `#/portal/requests/${req.id}` });
    notify({ audience: 'org', type: 'approved', title: 'Quotation approved', body: `${v.name} will be asked to confirm the schedule for ${req.id}.`, link: `#/requests/${req.id}` });
    save({ type: 'quote', id: q.id });
    return req;
  }

  function rejectQuote(quoteId, reason) {
    const q = quote(quoteId);
    if (!q || q.status !== 'submitted') throw new Error('This quotation can no longer be rejected.');
    const req = requireRequest(q.requestId);
    q.status = 'rejected'; q.decidedAt = new Date().toISOString(); q.rejectReason = reason || '';
    const v = vendor(q.vendorId);
    note(req, `Rejected quotation from ${v.name}${reason ? ` — ${reason}` : ''}`, 'org');
    logActivity(req.id, 'quote_rejected', `Quotation from ${v.name} rejected for ${req.id}`);
    notify({ audience: 'vendor', vendorId: q.vendorId, type: 'rejected', title: 'Quotation declined', body: `Your quotation for ${req.id} was declined${reason ? `: “${reason}”` : '.'} You may submit a revised quotation.`, link: `#/portal/requests/${req.id}` });
    if (req.status === 'quotation_received' && !quotesFor(req.id).some((o) => o.status === 'submitted')) {
      setStatus(req, 'under_review', 'system', 'All quotations declined — awaiting revised quotations');
    }
    save({ type: 'quote', id: q.id });
  }

  function confirmCompletion(id, rating, feedback) {
    const req = requireRequest(id);
    if (req.status !== 'in_progress' || !req.completionPending) throw new Error('The vendor has not marked this job as complete yet.');
    req.completionPending = false;
    req.progress = 100;
    req.rating = rating || null;
    setStatus(req, 'completed', 'org', feedback ? `Completion confirmed — “${feedback}”` : 'Completion confirmed by organisation');
    notify({ audience: 'vendor', vendorId: req.vendorId, type: 'completed', title: 'Completion confirmed', body: `${state.org.name} confirmed completion of ${req.id}${rating ? ` and rated the job ${rating}/5` : ''}.`, link: `#/portal/requests/${req.id}` });
    save({ type: 'request', id });
  }

  function reportIssue(id, text) {
    const req = requireRequest(id);
    if (req.status !== 'in_progress' || !req.completionPending) throw new Error('Issues can be reported only while completion is awaiting confirmation.');
    req.completionPending = false;
    req.progress = Math.min(req.progress, 90);
    note(req, `Completion not accepted — ${text}`, 'org');
    logActivity(req.id, 'issue', `Issue reported on ${req.id} before sign-off`);
    notify({ audience: 'vendor', vendorId: req.vendorId, type: 'issue', title: 'Snag reported', body: `${req.id}: ${text}`, link: `#/portal/requests/${req.id}` });
    save({ type: 'request', id });
  }

  function sendMessage(vendorId, text, requestId) {
    const v = vendor(vendorId);
    state.messages.push({ id: U.uid('MSG'), vendorId, requestId: requestId || null, text, at: new Date().toISOString(), from: 'org' });
    notify({ audience: 'vendor', vendorId, type: 'message', title: `Message from ${state.org.name}`, body: text.length > 120 ? text.slice(0, 117) + '…' : text, link: requestId ? `#/portal/requests/${requestId}` : '#/portal' });
    logActivity(requestId || '', 'message', `Message sent to ${v.name}`);
    save({ type: 'message' });
  }

  /* ---------------- Vendor actions ---------------- */

  function vendorRespond(id, vendorId, decision, reason) {
    const req = requireRequest(id);
    if (!req.invited.includes(vendorId)) throw new Error('This request was not sent to your business.');
    if (!OPEN.includes(req.status)) throw new Error('This request is no longer open.');
    const v = vendor(vendorId);
    req.responses[vendorId] = { status: decision, at: new Date().toISOString(), reason: reason || '' };
    if (decision === 'accepted') {
      if (req.status === 'submitted') setStatus(req, 'under_review', 'vendor', `${v.name} accepted the request`);
      else note(req, `${v.name} accepted the request`, 'vendor');
      notify({ audience: 'org', type: 'response', title: 'Vendor accepted request', body: `${v.name} is reviewing ${req.id} and will share a quotation.`, link: `#/requests/${req.id}` });
    } else {
      note(req, `${v.name} declined${reason ? ` — ${reason}` : ''}`, 'vendor');
      logActivity(req.id, 'declined', `${v.name} declined ${req.id}`);
      const remaining = req.invited.filter((x) => (req.responses[x] || {}).status !== 'declined');
      notify({
        audience: 'org', type: 'response', title: 'Vendor declined request',
        body: `${v.name} declined ${req.id}${reason ? `: “${reason}”` : ''}.${remaining.length ? '' : ' No invited vendors remain — invite others to continue.'}`,
        link: `#/requests/${req.id}`
      });
    }
    save({ type: 'request', id });
  }

  function submitQuote(id, vendorId, data) {
    const req = requireRequest(id);
    if (!req.invited.includes(vendorId)) throw new Error('This request was not sent to your business.');
    if (!OPEN.includes(req.status)) throw new Error('Quotations can only be submitted while the request is open.');
    const v = vendor(vendorId);
    const existing = quotesFor(id).find((q) => q.vendorId === vendorId && (q.status === 'submitted' || q.status === 'rejected'));
    const q = makeQuote(Object.assign({}, data, { requestId: id, vendorId }));
    if (existing) {
      q.revision = (existing.revision || 1) + 1;
      existing.status = 'superseded';
    }
    state.quotes.push(q);
    req.responses[vendorId] = { status: 'accepted', at: (req.responses[vendorId] || {}).at || q.createdAt };
    if (req.status === 'submitted' || req.status === 'under_review') {
      setStatus(req, 'quotation_received', 'vendor', `Quotation from ${v.name} — ${U.inr(q.total)}`);
    } else {
      note(req, `${existing ? 'Revised quotation' : 'Quotation'} from ${v.name} — ${U.inr(q.total)}`, 'vendor');
    }
    logActivity(req.id, 'quote', `${v.name} ${existing ? 'revised its quotation to' : 'submitted a quotation of'} ${U.inr(q.total)} for ${req.id}`);
    notify({ audience: 'org', type: 'quote', title: existing ? 'Quotation revised' : 'Quotation received', body: `${v.name} quoted ${U.inr(q.total)} for ${req.id} (${cityName(req.city)}).`, link: `#/requests/${req.id}/compare` });
    save({ type: 'quote', id: q.id });
    return q;
  }

  function assertAssigned(req, vendorId) {
    if (req.vendorId !== vendorId || !req.approvedQuoteId) throw new Error('This job is not assigned to your business.');
  }

  function scheduleJob(id, vendorId, date, slotNote) {
    const req = requireRequest(id);
    assertAssigned(req, vendorId);
    if (!date) throw new Error('Choose a service date.');
    req.scheduledDate = date;
    setStatus(req, 'scheduled', 'vendor', `Scheduled for ${U.fmtDate(date)}${slotNote ? ` — ${slotNote}` : ''}`);
    notify({ audience: 'org', type: 'scheduled', title: 'Job scheduled', body: `${vendor(vendorId).name} scheduled ${req.id} for ${U.fmtDate(date)}.`, link: `#/requests/${req.id}` });
    save({ type: 'request', id });
  }

  function startWork(id, vendorId) {
    const req = requireRequest(id);
    assertAssigned(req, vendorId);
    setStatus(req, 'in_progress', 'vendor', 'Technicians on site — work started');
    req.progress = Math.max(req.progress, 5);
    req.progressUpdates.push({ at: req.updatedAt, pct: req.progress, note: 'Work started on site.', by: 'vendor' });
    notify({ audience: 'org', type: 'started', title: 'Work started', body: `${vendor(vendorId).name} started work on ${req.id} in ${cityName(req.city)}.`, link: `#/requests/${req.id}` });
    save({ type: 'request', id });
  }

  function updateProgress(id, vendorId, pct, text) {
    const req = requireRequest(id);
    assertAssigned(req, vendorId);
    if (req.status !== 'in_progress') throw new Error('Progress can only be updated while work is in progress.');
    if (req.completionPending) throw new Error('Completion is awaiting confirmation from the organisation.');
    pct = U.clamp(Math.round(+pct || 0), 0, 95);
    req.progress = pct;
    req.updatedAt = new Date().toISOString();
    req.progressUpdates.push({ at: req.updatedAt, pct, note: text, by: 'vendor' });
    note(req, `Progress ${pct}% — ${text}`, 'vendor');
    logActivity(req.id, 'progress', `${req.id} progress updated to ${pct}%`);
    notify({ audience: 'org', type: 'progress', title: `Work in progress — ${pct}%`, body: `${vendor(vendorId).name}: ${text}`, link: `#/requests/${req.id}` });
    save({ type: 'request', id });
  }

  function markVendorComplete(id, vendorId, text) {
    const req = requireRequest(id);
    assertAssigned(req, vendorId);
    if (req.status !== 'in_progress') throw new Error('Only jobs in progress can be marked complete.');
    req.completionPending = true;
    req.progress = 100;
    req.updatedAt = new Date().toISOString();
    req.progressUpdates.push({ at: req.updatedAt, pct: 100, note: text || 'Work completed — awaiting sign-off.', by: 'vendor' });
    note(req, `Vendor marked work complete${text ? ` — ${text}` : ''}`, 'vendor');
    logActivity(req.id, 'vendor_complete', `${vendor(vendorId).name} marked ${req.id} as complete`);
    notify({ audience: 'org', type: 'completed', title: 'Job ready for sign-off', body: `${vendor(vendorId).name} marked ${req.id} complete. Please review and confirm completion.`, link: `#/requests/${req.id}` });
    save({ type: 'request', id });
  }

  /* ---------------- Settings ---------------- */

  function setRole(role, vendorId) {
    state.settings.role = role === 'vendor' ? 'vendor' : 'org';
    if (vendorId && vendor(vendorId)) state.settings.vendorId = vendorId;
    save({ type: 'role' });
  }
  function updateOrg(patch) {
    Object.assign(state.org, { name: patch.name || state.org.name });
    Object.assign(state.org.user, {
      name: patch.userName || state.org.user.name, title: patch.title || state.org.user.title,
      email: patch.email || state.org.user.email, phone: patch.phone || state.org.user.phone
    });
    save({ type: 'settings' });
  }
  function setSetting(key, value) { state.settings[key] = value; save({ type: 'settings', silent: true }); }
  function storageSize() {
    try { return (localStorage.getItem(D.STORAGE_KEY) || '').length; } catch (e) { return 0; }
  }

  window.CC.store = {
    STATUSES, LIFECYCLE, TRANSITIONS, OPEN, ACTIVE, EDITABLE, CANCELLABLE, canTransition,
    load, reset, subscribe, getState, vendors, vendor, request, quote, quotesFor, city, cityName, service, serviceName,
    serviceNames, siteTypeName, statusLabel, vendorsInCity, vendorScore, recommendVendors, rankQuotes, stats,
    notificationsForCurrentRole, unreadCount, markRead, markAllRead,
    createRequest, submitDraft, updateRequest, cancelRequest, inviteVendors, approveQuote, rejectQuote,
    confirmCompletion, reportIssue, sendMessage, vendorRespond, submitQuote, scheduleJob, startWork,
    updateProgress, markVendorComplete, setRole, updateOrg, setSetting, storageSize,
    isStorageAvailable: () => storageOk
  };
})();
