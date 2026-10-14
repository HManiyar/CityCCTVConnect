/*
 * CityConnect — vendor discovery, vendor profile and vendor directory
 */
(function () {
  'use strict';
  const CC = window.CC;
  const { html, raw, icon, esc, inr, num, img, vendorLogo, stars, debounce, $, $$, toast, plural, relTime, addDays } = CC.ui;
  const S = CC.store;
  const D = CC.data;
  const C = CC.components;

  const PAGE_SIZE = 6;
  const PRICE_MIN = 1200, PRICE_MAX = 3000;
  const STOPWORDS = new Set(['in', 'at', 'near', 'for', 'the', 'and', 'cctv', 'vendor', 'vendors', 'service', 'services', 'company', 'camera', 'cameras', 'security']);

  const defaults = () => ({ q: '', city: '', services: [], kind: 'all', minRating: 0, maxPrice: PRICE_MAX, availability: 'any', verified: false, emergency: false, sort: 'recommended', page: 1 });
  let F = defaults();
  let lastQuery = null;
  let renderToken = 0;

  /* ---------------- Filtering & sorting ---------------- */

  function haystack(v) {
    return [v.name, v.tagline, v.description, v.cities.map(S.cityName).join(' '), v.services.map((s) => `${S.serviceName(s)} ${S.service(s).short}`).join(' '), v.equipment.join(' '), v.pins.join(' ')].join(' ').toLowerCase();
  }

  function matchesQuery(v, q) {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    if (/^\d{3,6}$/.test(t)) {
      return v.pins.some((p) => p.startsWith(t)) || v.cities.some((c) => S.city(c).pinPrefixes.some((pre) => t.startsWith(pre) || pre.startsWith(t)));
    }
    const hay = haystack(v);
    const tokens = t.split(/[\s,]+/).filter((w) => w && !STOPWORDS.has(w));
    if (!tokens.length) return true;
    return tokens.every((w) => hay.includes(w));
  }

  function filterVendors(f) {
    const kindServices = f.kind === 'installation' ? D.SERVICES.filter((s) => s.kind === 'installation').map((s) => s.id)
      : f.kind === 'maintenance' ? D.SERVICES.filter((s) => s.kind === 'maintenance').map((s) => s.id) : null;
    const avail = { any: Infinity, today: 0, '3': 3, '7': 7 }[f.availability];
    let list = S.vendors().filter((v) =>
      matchesQuery(v, f.q) &&
      (!f.city || v.cities.includes(f.city)) &&
      (!f.services.length || f.services.every((s) => v.services.includes(s))) &&
      (!kindServices || kindServices.some((s) => v.services.includes(s))) &&
      v.rating >= f.minRating &&
      (f.maxPrice >= PRICE_MAX || v.pricing.perCamera <= f.maxPrice) &&
      v.nextAvailableDays <= avail &&
      (!f.verified || v.verified) &&
      (!f.emergency || v.emergency)
    );
    const score = (v) => S.vendorScore(v, f.city, f.services);
    const sorters = {
      recommended: (a, b) => score(b) - score(a),
      rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
      price: (a, b) => a.pricing.perCamera - b.pricing.perCamera,
      experience: (a, b) => b.experience - a.experience,
      availability: (a, b) => a.nextAvailableDays - b.nextAvailableDays || a.responseHours - b.responseHours
    };
    return list.sort(sorters[f.sort] || sorters.recommended);
  }

  function activeChips() {
    const chips = [];
    if (F.q) chips.push({ key: 'q', label: `“${F.q}”` });
    if (F.city) chips.push({ key: 'city', label: S.cityName(F.city) });
    F.services.forEach((s) => chips.push({ key: 'service', value: s, label: S.service(s).short }));
    if (F.kind !== 'all') chips.push({ key: 'kind', label: F.kind === 'installation' ? 'Installation' : 'Maintenance & repair' });
    if (F.minRating) chips.push({ key: 'minRating', label: `${F.minRating}+ rating` });
    if (F.maxPrice < PRICE_MAX) chips.push({ key: 'maxPrice', label: `≤ ${inr(F.maxPrice)}/camera` });
    if (F.availability !== 'any') chips.push({ key: 'availability', label: { today: 'Available today', 3: 'Within 3 days', 7: 'Within 7 days' }[F.availability] });
    if (F.verified) chips.push({ key: 'verified', label: 'Verified only' });
    if (F.emergency) chips.push({ key: 'emergency', label: '24h emergency' });
    return chips;
  }

  /** Nearby cities (by straight-line distance) that do have matching vendors. */
  function nearbyAlternatives() {
    if (!F.city) return [];
    const base = S.city(F.city);
    return D.CITIES.filter((c) => c.id !== F.city)
      .map((c) => ({ c, d: Math.hypot(c.lat - base.lat, c.lng - base.lng), n: filterVendors(Object.assign({}, F, { city: c.id })).length }))
      .filter((x) => x.n > 0).sort((a, b) => a.d - b.d).slice(0, 3);
  }

  /* ---------------- Rendering ---------------- */

  function filtersPanel() {
    const svcIds = D.SERVICES.map((s) => s.id);
    return html`<form class="filters" id="vendor-filters" aria-label="Vendor filters" data-form="noop">
      <div class="filters-head"><h2>Filters</h2>
        <button type="button" class="link-btn" data-action="reset-filters">Reset all</button>
        <button type="button" class="icon-btn filters-close" data-action="close-filters" aria-label="Close filters">${icon('x')}</button>
      </div>
      <div class="filter-group">
        <label class="filter-label" for="f-city">City</label>
        <select id="f-city" class="input" data-change="filter" data-key="city">
          <option value="">All Gujarat cities</option>
          ${D.CITIES.map((c) => html`<option value="${c.id}" ${F.city === c.id ? 'selected' : ''}>${c.name} (${S.vendorsInCity(c.id).length})</option>`)}
        </select>
      </div>
      <fieldset class="filter-group">
        <legend class="filter-label">Service type</legend>
        <div class="segmented" role="radiogroup">
          ${[['all', 'All'], ['installation', 'Installation'], ['maintenance', 'Maintenance']].map(([v, l]) => html`<label class="seg"><input type="radio" name="kind" value="${v}" ${F.kind === v ? 'checked' : ''} data-change="filter" data-key="kind"><span>${l}</span></label>`)}
        </div>
      </fieldset>
      <fieldset class="filter-group">
        <legend class="filter-label">Service category</legend>
        ${svcIds.map((id) => html`<label class="check"><input type="checkbox" value="${id}" ${F.services.includes(id) ? 'checked' : ''} data-change="filter" data-key="services"><span>${S.serviceName(id)}</span></label>`)}
      </fieldset>
      <fieldset class="filter-group">
        <legend class="filter-label">Minimum rating</legend>
        <div class="segmented">
          ${[[0, 'Any'], [4, '4.0+'], [4.3, '4.3+'], [4.5, '4.5+']].map(([v, l]) => html`<label class="seg"><input type="radio" name="minRating" value="${v}" ${F.minRating === v ? 'checked' : ''} data-change="filter" data-key="minRating"><span>${l}</span></label>`)}
        </div>
      </fieldset>
      <div class="filter-group">
        <label class="filter-label" for="f-price">Budget (installed price per camera)</label>
        <input id="f-price" type="range" min="${PRICE_MIN}" max="${PRICE_MAX}" step="100" value="${F.maxPrice}" data-input="filter-price" data-change="filter" data-key="maxPrice" aria-describedby="f-price-out">
        <div class="range-labels"><span>${inr(PRICE_MIN)}</span><output id="f-price-out">${F.maxPrice >= PRICE_MAX ? 'Any budget' : `Up to ${inr(F.maxPrice)}`}</output></div>
      </div>
      <div class="filter-group">
        <label class="filter-label" for="f-avail">Availability</label>
        <select id="f-avail" class="input" data-change="filter" data-key="availability">
          ${[['any', 'Any time'], ['today', 'Available today'], ['3', 'Within 3 days'], ['7', 'Within 7 days']].map(([v, l]) => html`<option value="${v}" ${F.availability === v ? 'selected' : ''}>${l}</option>`)}
        </select>
      </div>
      <div class="filter-group">
        <label class="switch"><input type="checkbox" ${F.verified ? 'checked' : ''} data-change="filter" data-key="verified"><span class="switch-track"></span><span>Verified vendors only</span></label>
        <label class="switch"><input type="checkbox" ${F.emergency ? 'checked' : ''} data-change="filter" data-key="emergency"><span class="switch-track"></span><span>24h emergency service</span></label>
      </div>
      <button type="button" class="btn btn-primary btn-block filters-apply" data-action="close-filters">Show results</button>
    </form>`;
  }

  function resultsHTML() {
    const list = filterVendors(F);
    const shown = list.slice(0, F.page * PAGE_SIZE);
    const chips = activeChips();
    const where = F.city ? ` in ${S.cityName(F.city)}` : '';
    let body;
    if (!list.length) {
      const alts = nearbyAlternatives();
      body = CC.ui.emptyState({
        icon: 'search', title: `No vendors match${where}`,
        text: chips.length ? 'Try removing a filter or widening your search. Sample directory coverage is limited to 12 Gujarat cities.' : 'Try a different city, service or PIN code.',
        actions: html`<button type="button" class="btn btn-secondary" data-action="reset-filters">Clear all filters</button>
          ${alts.map((a) => html`<button type="button" class="btn btn-ghost" data-action="set-city" data-city="${a.c.id}">${icon('mapPin', { size: 14 })} ${a.c.name} (${a.n})</button>`)}
          <a class="btn btn-primary" href="#/requests/new${F.city ? `?city=${F.city}` : ''}">Post an open request</a>`
      });
    } else {
      body = html`<div class="vendor-grid">${shown.map((v) => C.vendorCard(v, { score: F.sort === 'recommended' ? S.vendorScore(v, F.city, F.services) : null, city: F.city, highlightServices: F.services }))}</div>
        <div class="load-more">
          <p class="muted small">Showing ${shown.length} of ${plural(list.length, 'vendor')}</p>
          ${shown.length < list.length ? html`<button type="button" class="btn btn-secondary" data-action="load-more">Load more vendors</button>` : ''}
        </div>`;
    }
    return html`
      <div class="results-head">
        <div><h2 class="results-title" aria-live="polite">${plural(list.length, 'vendor')}${where}</h2>
          <p class="muted small">${F.city ? `${S.vendorsInCity(F.city).length} vendors cover ${S.cityName(F.city)} in the sample directory` : 'Across all Gujarat cities in the sample directory'}</p></div>
        <div class="results-tools">
          <button type="button" class="btn btn-secondary filters-open" data-action="open-filters">${icon('sliders')} Filters${chips.length ? html` <span class="nav-badge">${chips.length}</span>` : ''}</button>
          <label class="sr-only" for="f-sort">Sort by</label>
          <select id="f-sort" class="input" data-change="filter" data-key="sort">
            ${[['recommended', 'Recommended'], ['rating', 'Highest rated'], ['price', 'Lowest estimated price'], ['experience', 'Most experienced'], ['availability', 'Earliest availability']].map(([v, l]) => html`<option value="${v}" ${F.sort === v ? 'selected' : ''}>Sort: ${l}</option>`)}
          </select>
        </div>
      </div>
      ${chips.length ? html`<div class="active-chips">${chips.map((c) => html`<button type="button" class="chip chip-removable" data-action="remove-chip" data-key="${c.key}" data-value="${c.value || ''}" aria-label="Remove filter ${c.label}">${c.label}${icon('x', { size: 12 })}</button>`)}</div>` : ''}
      <div id="results-body">${body}</div>`;
  }

  function updateResults(withSkeleton) {
    const box = $('#results');
    if (!box) return;
    syncUrl();
    const token = ++renderToken;
    if (withSkeleton) {
      const head = resultsHTML();
      box.innerHTML = String(head);
      const body = $('#results-body');
      if (body && filterVendors(F).length) {
        body.innerHTML = String(html`<div class="vendor-grid" aria-busy="true">${CC.ui.skeletonCards(Math.min(PAGE_SIZE, filterVendors(F).length))}</div>`);
        setTimeout(() => { if (token === renderToken && $('#results')) $('#results').innerHTML = String(resultsHTML()); }, 320);
      }
    } else {
      box.innerHTML = String(resultsHTML());
    }
  }

  function syncUrl() {
    const p = new URLSearchParams();
    if (F.city) p.set('city', F.city);
    if (F.q) p.set('q', F.q);
    if (F.services.length === 1) p.set('service', F.services[0]);
    const qs = p.toString();
    lastQuery = qs;
    const target = '#/vendors' + (qs ? '?' + qs : '');
    if (location.hash !== target) history.replaceState(null, '', target);
  }

  function heroSearch() {
    return html`<section class="hero">
      <div class="hero-media">${img(D.IMAGES.cctvWall, '', { w: 1600, fallback: 'cover', eager: true })}</div>
      <div class="hero-content">
        <p class="eyebrow eyebrow-light">${icon('shieldCheck', { size: 14 })} CCTV vendor discovery</p>
        <h1 class="page-title hero-title" tabindex="-1">Find CCTV vendors in any Gujarat city</h1>
        <p class="hero-sub">Compare installation and maintenance partners by services, coverage, ratings, pricing and availability — then request quotations in minutes.</p>
        <form class="hero-search" data-form="hero-search" role="search" autocomplete="off">
          <div class="hero-field ac-wrap">
            ${icon('search')}
            <label for="hero-q" class="sr-only">City, vendor, service or PIN code</label>
            <input id="hero-q" type="text" value="${F.q}" placeholder="City, vendor, service or PIN code (e.g. Rajkot, 360003)"
              role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="hero-ac">
            <ul id="hero-ac" class="suggestions" role="listbox" hidden></ul>
          </div>
          <div class="hero-field hero-city">
            ${icon('mapPin')}
            <label for="hero-city" class="sr-only">City</label>
            <select id="hero-city">${[html`<option value="">All cities</option>`, ...D.CITIES.map((c) => html`<option value="${c.id}" ${F.city === c.id ? 'selected' : ''}>${c.name}</option>`)]}</select>
          </div>
          <button class="btn btn-primary btn-lg" type="submit">Search vendors</button>
        </form>
        <div class="popular"><span>Popular:</span>${['rajkot', 'ahmedabad', 'surat', 'vadodara', 'jamnagar'].map((id) => html`<button type="button" class="pop-chip ${F.city === id ? 'active' : ''}" data-action="set-city" data-city="${id}">${S.cityName(id)}</button>`)}</div>
      </div>
    </section>`;
  }

  CC.views.discover = {
    title: 'Find Vendors',
    render(ctx) {
      const qs = new URLSearchParams(ctx.query).toString();
      if (qs !== lastQuery) {
        F = defaults();
        if (ctx.query.city && S.city(ctx.query.city)) F.city = ctx.query.city;
        if (ctx.query.q) {
          // A query that is exactly a city name becomes a city filter.
          const c = D.CITIES.find((x) => x.name.toLowerCase() === ctx.query.q.trim().toLowerCase());
          if (c) F.city = c.id; else F.q = ctx.query.q;
        }
        if (ctx.query.service && S.service(ctx.query.service)) F.services = [ctx.query.service];
        lastQuery = qs;
      }
      return html`
        ${heroSearch()}
        <p class="demo-note">${icon('info', { size: 14 })} Directory entries are fictional sample businesses. Ratings, reviews and verification badges are illustrative only.</p>
        <div class="discover-layout">
          <aside class="filters-aside" id="filters-aside">${filtersPanel()}</aside>
          <section id="results" class="results" aria-label="Vendor results">${resultsHTML()}</section>
        </div>`;
    },
    mount() {
      attachAutocomplete($('#hero-q'), $('#hero-ac'), heroSuggestions, (it) => {
        if (it.type === 'city') { F.city = it.id; F.q = ''; $('#hero-q').value = ''; $('#hero-city').value = it.id; refreshFilters(); }
        else if (it.type === 'service') { F.services = [it.id]; F.q = ''; $('#hero-q').value = ''; refreshFilters(); }
        else if (it.type === 'vendor') location.hash = `#/vendors/${it.id}`;
      });
    }
  };

  function heroSuggestions(q) {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const out = [];
    D.CITIES.filter((c) => c.name.toLowerCase().startsWith(t) || c.pins.some((p) => p.startsWith(t))).slice(0, 4)
      .forEach((c) => out.push({ type: 'city', id: c.id, icon: 'mapPin', label: c.name, sub: `${S.vendorsInCity(c.id).length} vendors · PIN ${c.pinPrefixes.join('/')}xxx` }));
    D.SERVICES.filter((s) => s.name.toLowerCase().includes(t)).slice(0, 3)
      .forEach((s) => out.push({ type: 'service', id: s.id, icon: s.icon, label: s.name, sub: 'Service category' }));
    S.vendors().filter((v) => v.name.toLowerCase().includes(t)).slice(0, 4)
      .forEach((v) => out.push({ type: 'vendor', id: v.id, icon: 'building', label: v.name, sub: `${S.cityName(v.baseCity)} · ${v.rating.toFixed(1)}★` }));
    return out;
  }

  /** Generic accessible combobox behaviour for a text input + listbox. */
  function attachAutocomplete(input, list, source, onSelect) {
    if (!input || !list) return;
    let items = [], active = -1;
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
    const paint = () => {
      items = source(input.value);
      active = -1;
      if (!items.length) return close();
      list.innerHTML = String(html`${items.map((it, i) => html`<li role="option" id="${list.id}-${i}" class="sugg" data-index="${i}" aria-selected="false"><span class="sugg-icon">${icon(it.icon, { size: 16 })}</span><span><strong>${it.label}</strong><span class="muted small d-block">${it.sub}</span></span></li>`)}`);
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    };
    const setActive = (i) => {
      const opts = $$('.sugg', list);
      opts.forEach((o) => o.setAttribute('aria-selected', 'false'));
      active = i;
      if (opts[i]) { opts[i].setAttribute('aria-selected', 'true'); input.setAttribute('aria-activedescendant', opts[i].id); }
    };
    input.addEventListener('input', debounce(paint, 100));
    input.addEventListener('keydown', (e) => {
      if (list.hidden && e.key !== 'ArrowDown') return;
      if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) paint(); setActive(Math.min(items.length - 1, active + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, active - 1)); }
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); const it = items[active]; close(); onSelect(it); }
      else if (e.key === 'Escape') { e.stopPropagation(); close(); }
    });
    list.addEventListener('mousedown', (e) => {
      const li = e.target.closest('.sugg');
      if (li) { e.preventDefault(); const it = items[+li.dataset.index]; close(); onSelect(it); }
    });
    input.addEventListener('blur', () => setTimeout(close, 120));
  }

  function refreshFilters() {
    F.page = 1;
    const aside = $('#filters-aside');
    if (aside) aside.innerHTML = String(filtersPanel());
    $$('.pop-chip').forEach((b) => b.classList.toggle('active', b.dataset.city === F.city));
    const hc = $('#hero-city'); if (hc) hc.value = F.city;
    updateResults(true);
  }

  /* ---------------- Discovery handlers ---------------- */

  CC.forms.noop = () => {};
  CC.forms['hero-search'] = () => {
    const text = $('#hero-q').value.trim();
    F.city = $('#hero-city').value;
    const c = D.CITIES.find((x) => x.name.toLowerCase() === text.toLowerCase());
    if (c) { F.city = c.id; F.q = ''; $('#hero-q').value = ''; } else F.q = text;
    refreshFilters();
    const r = $('#results'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  CC.changes.filter = (el) => {
    const key = el.dataset.key;
    if (key === 'services') F.services = $$('input[data-key="services"]:checked').map((i) => i.value);
    else if (key === 'verified' || key === 'emergency') F[key] = el.checked;
    else if (key === 'minRating' || key === 'maxPrice') F[key] = +el.value;
    else F[key] = el.value;
    F.page = 1;
    if (key === 'city') { const hc = $('#hero-city'); if (hc) hc.value = F.city; $$('.pop-chip').forEach((b) => b.classList.toggle('active', b.dataset.city === F.city)); }
    updateResults(true);
  };
  CC.inputs['filter-price'] = (el) => {
    const out = $('#f-price-out');
    if (out) out.textContent = +el.value >= PRICE_MAX ? 'Any budget' : `Up to ${inr(+el.value)}`;
  };
  Object.assign(CC.actions, {
    'set-city': (el) => { F.city = el.dataset.city; refreshFilters(); },
    'reset-filters': () => { const sort = F.sort; F = defaults(); F.sort = sort; const q = $('#hero-q'); if (q) q.value = ''; refreshFilters(); },
    'remove-chip': (el) => {
      const k = el.dataset.key;
      if (k === 'service') F.services = F.services.filter((s) => s !== el.dataset.value);
      else if (k === 'q') { F.q = ''; const q = $('#hero-q'); if (q) q.value = ''; }
      else F[k] = defaults()[k];
      refreshFilters();
    },
    'load-more': () => {
      F.page += 1;
      const grid = $('.vendor-grid');
      const before = grid ? grid.children.length : 0;
      updateResults(false);
      const cards = $$('.vendor-grid .vendor-card');
      if (cards[before]) cards[before].querySelector('h3 a').focus();
    },
    'open-filters': () => { document.body.classList.add('filters-open'); const f = $('#f-city'); if (f) f.focus(); },
    'close-filters': () => { document.body.classList.remove('filters-open'); }
  });

  /* ---------------- Vendor profile ---------------- */

  let profileTab = 'overview';
  let profileVendor = null;

  function profileTabs(v) {
    const tabs = [['overview', 'Overview'], ['services', 'Services'], ['portfolio', 'Portfolio'], ['reviews', 'Reviews']];
    return html`<div class="tabs" role="tablist" aria-label="Vendor profile sections">
      ${tabs.map(([id, label]) => html`<button type="button" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${profileTab === id}" tabindex="${profileTab === id ? '0' : '-1'}" class="tab ${profileTab === id ? 'active' : ''}" data-action="profile-tab" data-tab="${id}">${label}${id === 'portfolio' ? html` <span class="tab-count">${v.portfolio.length}</span>` : id === 'reviews' ? html` <span class="tab-count">${v.reviews.length}</span>` : ''}</button>`)}
    </div>`;
  }

  function overviewPanel(v) {
    return html`<div class="profile-cols">
      <div class="stack">
        <section class="card"><h2 class="h3">About ${v.name}</h2><p>${v.description}</p>
          <dl class="facts">
            <div><dt>Experience</dt><dd>${v.experience} years</dd></div>
            <div><dt>Founded</dt><dd>${v.founded}</dd></div>
            <div><dt>Team size</dt><dd>${v.teamSize} people</dd></div>
            <div><dt>Projects</dt><dd>${num(v.projects)}+</dd></div>
          </dl>
        </section>
        <section class="card"><h2 class="h3">Service locations</h2>
          <p class="muted small mb-2">Based in ${S.cityName(v.baseCity)} · coverage radius approx. ${v.radiusKm} km</p>
          <div class="chips">${v.cities.map((c) => html`<a class="chip chip-link ${c === v.baseCity ? 'chip-match' : ''}" href="#/vendors?city=${c}">${icon('mapPin', { size: 12 })} ${S.cityName(c)}${c === v.baseCity ? ' (base)' : ''}</a>`)}</div>
          <p class="muted xsmall mt-2">Serviceable PIN codes include ${v.pins.slice(0, 6).join(', ')}${v.pins.length > 6 ? '…' : ''}</p>
        </section>
        <section class="card"><h2 class="h3">Certifications <span class="badge badge-neutral">Sample data</span></h2>
          <ul class="check-list">${v.certifications.map((c) => html`<li>${icon('award', { size: 16 })}${c}</li>`)}</ul>
          <h3 class="h4 mt-3">Equipment capabilities</h3>
          <div class="chips">${v.equipment.map((e) => html`<span class="chip">${e}</span>`)}</div>
        </section>
      </div>
      <div class="stack">
        <section class="card"><h2 class="h3">Contact information</h2>
          <ul class="contact-list">
            <li>${icon('user', { size: 16 })}<span><strong>${v.contact.person}</strong><span class="muted small d-block">${v.contact.role}</span></span></li>
            <li>${icon('phone', { size: 16 })}<span>${v.contact.phone}</span></li>
            <li>${icon('mail', { size: 16 })}<span class="break">${v.contact.email}</span></li>
            <li>${icon('mapPin', { size: 16 })}<span>${v.contact.address}</span></li>
          </ul>
          <p class="muted xsmall">Sample contact details — not a real business.</p>
          <button type="button" class="btn btn-secondary btn-block mt-2" data-action="contact-vendor" data-id="${v.id}">${icon('message')} Contact vendor</button>
        </section>
        <section class="card"><h2 class="h3">Hours & availability</h2>
          <ul class="contact-list">
            <li>${icon('clock', { size: 16 })}<span>${v.hours}</span></li>
            <li>${icon('zap', { size: 16 })}<span>${v.emergency ? html`<strong class="text-success">Emergency service available</strong>` : html`<span class="muted">No emergency service</span>`}<span class="muted small d-block">${v.emergencyLine}</span></span></li>
            <li>${icon('calendar', { size: 16 })}<span>${C.availabilityPill(v)}<span class="muted small d-block">Typical response within ~${v.responseHours} hours</span></span></li>
          </ul>
        </section>
        <section class="card"><h2 class="h3">Indicative pricing</h2>
          <dl class="price-list">
            <div><dt>Installation (per camera, installed)</dt><dd>${inr(v.pricing.perCamera)}</dd></div>
            <div><dt>Maintenance / troubleshooting visit</dt><dd>${inr(v.pricing.visit)}</dd></div>
            <div><dt>AMC (per camera per year)</dt><dd>${inr(v.pricing.amc)}</dd></div>
          </dl>
          <p class="muted xsmall">Indicative ranges excluding GST. Final pricing comes from a site-specific quotation.</p>
        </section>
      </div>
    </div>`;
  }

  function servicesPanel(v) {
    return html`<section class="card"><h2 class="h3">Available services</h2>
      <ul class="service-list">${D.SERVICES.map((s) => {
        const has = v.services.includes(s.id);
        return html`<li class="${has ? '' : 'unavailable'}">
          <span class="svc-icon">${icon(s.icon)}</span>
          <span><strong>${s.name}</strong><span class="muted small d-block">${s.desc}</span></span>
          ${has ? html`<span class="badge badge-success">${icon('check', { size: 12 })} Offered</span>` : html`<span class="badge badge-neutral">Not offered</span>`}
        </li>`;
      })}</ul></section>
      <h2 class="h3 mt-4 mb-2">Service packages</h2>
      <div class="package-grid">${v.packages.map((p) => html`<article class="card package ${p.featured ? 'featured' : ''}">
        ${p.featured ? html`<span class="badge badge-blue package-flag">Most requested</span>` : ''}
        <h3>${p.name}</h3><p class="muted small">${p.desc}</p>
        <p class="package-price">${inr(p.price)}<span class="muted small"> ${p.unit || 'onwards'}</span></p>
        <ul class="check-list">${p.includes.map((i) => html`<li>${icon('check', { size: 14 })}${i}</li>`)}</ul>
        <a class="btn ${p.featured ? 'btn-primary' : 'btn-secondary'} btn-block" href="#/requests/new?vendor=${v.id}&package=${encodeURIComponent(p.name)}">Request this package</a>
      </article>`)}</div>
      <p class="muted xsmall mt-2">Package prices are indicative sample figures excluding GST.</p>`;
  }

  function portfolioPanel(v) {
    return html`<div class="gallery">${v.portfolio.map((p, i) => html`<figure class="gallery-item">
      <button type="button" class="gallery-btn" data-action="open-gallery" data-id="${v.id}" data-index="${i}" aria-label="Enlarge: ${p.title}">${img(p.img, p.title, { w: 700 })}</button>
      <figcaption>${p.title}<span class="muted xsmall d-block">Representative stock image</span></figcaption>
    </figure>`)}</div>`;
  }

  function reviewsPanel(v) {
    return html`<div class="profile-cols">
      <div class="stack">${v.reviews.map((r) => html`<article class="card review">
        <div class="review-head"><span class="avatar">${CC.ui.initials(r.author)}</span>
          <div><strong>${r.author}</strong><span class="muted small d-block">${r.org}</span></div>
          <span class="review-date muted small">${relTime(addDays(new Date(), -r.daysAgo))}</span></div>
        ${stars(r.rating)}<p class="mt-2">${r.text}</p>
      </article>`)}</div>
      <section class="card rating-summary">
        <p class="big-rating">${v.rating.toFixed(1)}</p>${stars(v.rating, 18)}
        <p class="muted small mt-1">${num(v.reviewCount)} reviews</p>
        <div class="callout callout-muted mt-3">${icon('info', { size: 16 })}<p class="small">Ratings and feedback are fictional sample data generated for this demo and do not describe a real business.</p></div>
      </section>
    </div>`;
  }

  CC.views.profile = {
    title: (ctx) => (S.vendor(ctx.params.id) || { name: 'Vendor' }).name,
    render(ctx) {
      const v = S.vendor(ctx.params.id);
      if (!v) return CC.ui.emptyState({ icon: 'building', title: 'Vendor not found', text: 'This vendor may have been removed from the directory.', actions: html`<a class="btn btn-primary" href="#/vendors">Browse vendors</a>` });
      if (profileVendor !== v.id) { profileTab = 'overview'; profileVendor = v.id; }
      const isSelf = S.getState().settings.role === 'vendor' && S.getState().settings.vendorId === v.id;
      const panels = { overview: overviewPanel, services: servicesPanel, portfolio: portfolioPanel, reviews: reviewsPanel };
      return html`
        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/vendors">Find Vendors</a>${icon('chevronRight', { size: 14 })}<a href="#/vendors?city=${v.baseCity}">${S.cityName(v.baseCity)}</a>${icon('chevronRight', { size: 14 })}<span aria-current="page">${v.name}</span></nav>
        <section class="profile-hero card">
          <div class="profile-cover">${img(v.cover, '', { w: 1600, fallback: 'cover', eager: true })}</div>
          <div class="profile-main">
            ${vendorLogo(v, 84)}
            <div class="profile-id">
              <h1 class="page-title" tabindex="-1">${v.name}</h1>
              <p class="muted">${v.tagline}</p>
              <div class="profile-badges">
                ${C.verifiedBadge(v)}
                <span class="rating-inline">${stars(v.rating)} <strong>${v.rating.toFixed(1)}</strong> <span class="muted">(${num(v.reviewCount)})</span></span>
                ${C.availabilityPill(v)}
                <span class="badge badge-neutral">Sample listing</span>
              </div>
            </div>
            <div class="profile-actions">
              ${isSelf ? html`<span class="badge badge-blue">This is your public profile</span>` : html`
                <button type="button" class="btn btn-secondary" data-action="contact-vendor" data-id="${v.id}">${icon('message')} Contact vendor</button>
                <a class="btn btn-primary" href="#/requests/new?vendor=${v.id}">${icon('fileText')} Request quotation</a>`}
            </div>
          </div>
          <dl class="profile-stats">
            <div><dt>Experience</dt><dd>${v.experience} yrs</dd></div>
            <div><dt>Cities covered</dt><dd>${v.cities.length}</dd></div>
            <div><dt>From</dt><dd>${inr(v.pricing.perCamera)}<span class="muted small">/camera</span></dd></div>
            <div><dt>Response</dt><dd>~${v.responseHours} h</dd></div>
            <div><dt>Emergency</dt><dd>${v.emergency ? '24h' : 'No'}</dd></div>
          </dl>
        </section>
        ${profileTabs(v)}
        ${Object.keys(panels).map((k) => html`<div role="tabpanel" id="panel-${k}" aria-labelledby="tab-${k}" class="tab-panel" ${profileTab === k ? '' : 'hidden'} tabindex="0">${panels[k](v)}</div>`)}`;
    }
  };

  function selectTab(id, focus) {
    profileTab = id;
    $$('.tabs [role="tab"]').forEach((t) => {
      const on = t.dataset.tab === id;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; t.classList.toggle('active', on);
      if (on && focus) t.focus();
    });
    $$('.tab-panel').forEach((p) => { p.hidden = p.id !== `panel-${id}`; });
  }
  CC.actions['profile-tab'] = (el) => selectTab(el.dataset.tab);
  document.addEventListener('keydown', (e) => {
    const tab = e.target.closest && e.target.closest('.tabs [role="tab"]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const tabs = $$('[role="tab"]', tab.parentElement);
    let i = tabs.indexOf(tab);
    i = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : tabs.length - 1;
    e.preventDefault();
    tabs[i].click();
    tabs[i].focus();
  });

  CC.actions['open-gallery'] = (el) => {
    const v = S.vendor(el.dataset.id);
    let i = +el.dataset.index;
    const m = CC.ui.modal({
      title: v.portfolio[i].title, subtitle: `${v.name} · representative stock image`, size: 'lg',
      body: html`<div class="lightbox">${img(v.portfolio[i].img, v.portfolio[i].title, { w: 1400, eager: true })}</div>`,
      footer: html`<button type="button" class="btn btn-ghost" data-lb="-1">${icon('chevronLeft')} Previous</button><span class="muted small" id="lb-count">${i + 1} / ${v.portfolio.length}</span><button type="button" class="btn btn-ghost" data-lb="1">Next ${icon('chevronRight')}</button>`,
      onMount(dlg) {
        dlg.addEventListener('click', (e) => {
          const b = e.target.closest('[data-lb]');
          if (!b) return;
          i = (i + +b.dataset.lb + v.portfolio.length) % v.portfolio.length;
          dlg.querySelector('.lightbox').innerHTML = String(img(v.portfolio[i].img, v.portfolio[i].title, { w: 1400, eager: true }));
          dlg.querySelector('.modal-title').textContent = v.portfolio[i].title;
          dlg.querySelector('#lb-count').textContent = `${i + 1} / ${v.portfolio.length}`;
        });
      }
    });
    return m;
  };

  CC.actions['contact-vendor'] = (el) => {
    const v = S.vendor(el.dataset.id);
    const reqs = S.getState().requests.filter((r) => r.invited.includes(v.id) && r.status !== 'cancelled');
    CC.ui.modal({
      title: `Contact ${v.name}`, subtitle: 'Messages are delivered to the vendor’s demo portal only.',
      body: html`<form id="contact-form" data-form="contact-vendor" data-id="${v.id}" novalidate>
        <div class="contact-card">${vendorLogo(v, 40)}<div><strong>${v.contact.person}</strong><span class="muted small d-block">${v.contact.role} · ${v.contact.phone} · ${v.contact.email}</span></div></div>
        ${reqs.length ? html`<div class="field"><label for="cm-req">Related request (optional)</label><select id="cm-req" name="requestId" class="input"><option value="">General enquiry</option>${reqs.map((r) => html`<option value="${r.id}">${r.id} — ${S.serviceNames(r.services)}, ${S.cityName(r.city)}</option>`)}</select></div>` : ''}
        <div class="field"><label for="cm-text">Message <span class="req">*</span></label>
          <textarea id="cm-text" name="text" rows="4" placeholder="Hi, we are planning CCTV work at our site and would like to discuss…" required></textarea>
          <p class="field-error" hidden></p></div>
        <div class="callout callout-muted">${icon('info', { size: 16 })}<p class="small">Email, SMS and WhatsApp delivery are future capabilities. In this demo the message appears in the vendor’s notification centre.</p></div>
      </form>`,
      footer: html`<button type="button" class="btn btn-ghost" data-modal-close>Cancel</button><button type="submit" form="contact-form" class="btn btn-primary">${icon('send')} Send message</button>`
    });
  };
  CC.forms['contact-vendor'] = (form) => {
    const ta = form.elements.text;
    const text = ta.value.trim();
    const err = form.querySelector('.field-error');
    if (text.length < 10) { err.textContent = 'Please write at least 10 characters.'; err.hidden = false; ta.setAttribute('aria-invalid', 'true'); ta.focus(); return; }
    S.sendMessage(form.dataset.id, text, form.elements.requestId ? form.elements.requestId.value : '');
    form.closest('.modal-backdrop').querySelector('[data-modal-close]').click();
    toast(`Message sent to ${S.vendor(form.dataset.id).name}'s demo portal.`, 'success', { title: 'Message sent' });
  };

  /* ---------------- Vendor directory ---------------- */

  const dir = { q: '', city: '', service: '', sort: 'name' };

  function directoryRows() {
    const t = dir.q.trim().toLowerCase();
    const list = S.vendors().filter((v) =>
      (!t || haystack(v).includes(t)) && (!dir.city || v.cities.includes(dir.city)) && (!dir.service || v.services.includes(dir.service)));
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name), rating: (a, b) => b.rating - a.rating,
      experience: (a, b) => b.experience - a.experience, price: (a, b) => a.pricing.perCamera - b.pricing.perCamera, coverage: (a, b) => b.cities.length - a.cities.length
    };
    return list.sort(sorters[dir.sort]);
  }

  function directoryTable() {
    const rows = directoryRows();
    if (!rows.length) return CC.ui.emptyState({ icon: 'building', title: 'No vendors match these filters', text: 'Adjust the search or filters to see more vendors.', actions: html`<button type="button" class="btn btn-secondary" data-action="dir-reset">Clear filters</button>`, compact: true });
    return html`<div class="table-wrap"><table class="table responsive">
      <thead><tr><th scope="col">Vendor</th><th scope="col">Base city</th><th scope="col">Coverage</th><th scope="col">Services</th><th scope="col">Rating</th><th scope="col">Experience</th><th scope="col">From / camera</th><th scope="col">Availability</th></tr></thead>
      <tbody>${rows.map((v) => html`<tr data-href="#/vendors/${v.id}" tabindex="0" class="row-link">
        <td data-label="Vendor"><span class="vendor-mini">${vendorLogo(v, 30)}<span><a href="#/vendors/${v.id}" class="fw-600">${v.name}</a>${v.verified ? html`<span class="muted xsmall d-block">${icon('shieldCheck', { size: 12 })} Verified (sample)</span>` : ''}</span></span></td>
        <td data-label="Base city">${S.cityName(v.baseCity)}</td>
        <td data-label="Coverage">${v.cities.length} cities</td>
        <td data-label="Services">${v.services.length} of ${D.SERVICES.length}</td>
        <td data-label="Rating"><span class="nowrap">${icon('star', { size: 13, cls: 'star-on' })} ${v.rating.toFixed(1)}</span> <span class="muted small">(${v.reviewCount})</span></td>
        <td data-label="Experience">${v.experience} yrs</td>
        <td data-label="From / camera">${inr(v.pricing.perCamera)}</td>
        <td data-label="Availability">${C.availabilityPill(v)}</td>
      </tr>`)}</tbody></table></div>
      <p class="muted small mt-2">${plural(rows.length, 'vendor')} · all entries are fictional sample data</p>`;
  }

  CC.views.directory = {
    title: 'Vendor Directory',
    render() {
      return html`
        ${C.pageHeader({ title: 'Vendor directory', subtitle: `${S.vendors().length} CCTV service vendors across ${S.stats().citiesCovered} Gujarat cities (sample directory).`,
          actions: html`<button type="button" class="btn btn-secondary" data-action="dir-export">${icon('download')} Export CSV</button><a class="btn btn-primary" href="#/vendors">${icon('search')} Discover vendors</a>` })}
        <section class="card">
          <div class="toolbar">
            <div class="input-icon">${icon('search', { size: 16 })}<label class="sr-only" for="dir-q">Search directory</label><input id="dir-q" class="input" type="search" placeholder="Search name, city, service or PIN" value="${dir.q}" data-input="dir-q"></div>
            <label class="sr-only" for="dir-city">City</label>
            <select id="dir-city" class="input" data-change="dir"><option value="">All cities</option>${D.CITIES.map((c) => html`<option value="${c.id}" ${dir.city === c.id ? 'selected' : ''}>${c.name}</option>`)}</select>
            <label class="sr-only" for="dir-service">Service</label>
            <select id="dir-service" class="input" data-change="dir"><option value="">All services</option>${D.SERVICES.map((s) => html`<option value="${s.id}" ${dir.service === s.id ? 'selected' : ''}>${s.name}</option>`)}</select>
            <label class="sr-only" for="dir-sort">Sort</label>
            <select id="dir-sort" class="input" data-change="dir">${[['name', 'Name A–Z'], ['rating', 'Highest rated'], ['experience', 'Most experienced'], ['price', 'Lowest price'], ['coverage', 'Widest coverage']].map(([v, l]) => html`<option value="${v}" ${dir.sort === v ? 'selected' : ''}>Sort: ${l}</option>`)}</select>
          </div>
          <div id="dir-table">${directoryTable()}</div>
        </section>`;
    }
  };
  const repaintDir = () => { const t = $('#dir-table'); if (t) t.innerHTML = String(directoryTable()); };
  CC.inputs['dir-q'] = debounce((el) => { dir.q = el.value; repaintDir(); }, 150);
  CC.changes.dir = () => { dir.city = $('#dir-city').value; dir.service = $('#dir-service').value; dir.sort = $('#dir-sort').value; repaintDir(); };
  CC.actions['dir-reset'] = () => { Object.assign(dir, { q: '', city: '', service: '' }); CC.app.render({ keepScroll: true }); };
  CC.actions['dir-export'] = () => {
    CC.ui.downloadCSV('cityconnect-vendor-directory.csv', [
      { label: 'Vendor ID', value: (v) => v.id }, { label: 'Vendor (sample)', value: (v) => v.name },
      { label: 'Base city', value: (v) => S.cityName(v.baseCity) }, { label: 'Cities covered', value: (v) => v.cities.map(S.cityName).join('; ') },
      { label: 'Services', value: (v) => v.services.map(S.serviceName).join('; ') }, { label: 'Rating (sample)', value: (v) => v.rating },
      { label: 'Reviews (sample)', value: (v) => v.reviewCount }, { label: 'Experience (years)', value: (v) => v.experience },
      { label: 'Price per camera (INR)', value: (v) => v.pricing.perCamera }, { label: 'Visit charge (INR)', value: (v) => v.pricing.visit },
      { label: 'Emergency service', value: (v) => (v.emergency ? 'Yes' : 'No') }, { label: 'Verified (sample)', value: (v) => (v.verified ? 'Yes' : 'No') }
    ], directoryRows());
  };

  CC.discover = { filterVendors, attachAutocomplete };
})();
