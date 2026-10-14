/*
 * CityConnect — application shell
 * Hash router, navigation chrome, global search, demo role switcher,
 * notification centre and delegated event handling.
 */
(function () {
  'use strict';
  const CC = window.CC;
  const { html, icon, esc, $, $$, debounce, toast, confirm, relTime, vendorLogo } = CC.ui;
  const S = CC.store;
  const D = CC.data;

  CC.views = CC.views || {};
  CC.actions = CC.actions || {};
  CC.forms = CC.forms || {};
  CC.changes = CC.changes || {};
  CC.inputs = CC.inputs || {};

  /* ---------------- Routing ---------------- */

  // [pattern, view, audience]  audience: org | vendor | any
  const ROUTES = [
    ['/dashboard', 'dashboard', 'org'],
    ['/vendors', 'discover', 'any'],
    ['/vendors/:id', 'profile', 'any'],
    ['/requests', 'requests', 'org'],
    ['/requests/new', 'requestForm', 'org'],
    ['/requests/:id', 'requestDetail', 'org'],
    ['/requests/:id/edit', 'requestForm', 'org'],
    ['/requests/:id/compare', 'compare', 'org'],
    ['/jobs', 'jobs', 'org'],
    ['/directory', 'directory', 'any'],
    ['/reports', 'reports', 'org'],
    ['/settings', 'settings', 'any'],
    ['/notifications', 'notifications', 'any'],
    ['/portal', 'portalDashboard', 'vendor'],
    ['/portal/requests', 'portalRequests', 'vendor'],
    ['/portal/requests/:id', 'portalRequest', 'vendor'],
    ['/portal/jobs', 'portalJobs', 'vendor']
  ].map(([pattern, view, audience]) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    return { pattern, view, audience, re, keys };
  });

  let current = { path: null, view: null, ctx: null };

  function parseHash() {
    const h = location.hash.replace(/^#/, '') || '';
    const qi = h.indexOf('?');
    const path = decodeURIComponent(qi < 0 ? h : h.slice(0, qi));
    const qs = qi < 0 ? '' : h.slice(qi + 1);
    const query = {};
    new URLSearchParams(qs || '').forEach((v, k) => { query[k] = v; });
    return { path: path || '', query };
  }

  function homePath() { return S.getState().settings.role === 'vendor' ? '/portal' : '/dashboard'; }

  function navigate(path) { location.hash = '#' + path; }

  function matchRoute(path) {
    for (const r of ROUTES) {
      const m = path.match(r.re);
      if (m) {
        const params = {};
        r.keys.forEach((k, i) => { params[k] = m[i + 1]; });
        return { route: r, params };
      }
    }
    return null;
  }

  function render(opts = {}) {
    const { path, query } = parseHash();
    if (!path) { history.replaceState(null, '', '#' + homePath()); return render(); }
    const match = matchRoute(path);
    const main = $('#view');
    const role = S.getState().settings.role;
    let viewName = match ? match.route.view : 'notFound';
    if (match && match.route.audience !== 'any' && match.route.audience !== role) viewName = 'roleGate';
    const view = CC.views[viewName];
    const ctx = { params: match ? match.params : {}, query, path, audience: match ? match.route.audience : null };
    const samePage = current.path === path && current.view === viewName;
    const scroll = window.scrollY;

    try {
      main.innerHTML = String(view.render(ctx));
      if (view.mount) view.mount(main, ctx);
    } catch (err) {
      console.error(err);
      main.innerHTML = String(CC.ui.emptyState({ icon: 'alert', title: 'Something went wrong', text: err.message || 'This page could not be displayed.', actions: html`<a class="btn btn-primary" href="#${homePath()}">Go to home</a>` }));
    }
    document.title = `${(view.title && (typeof view.title === 'function' ? view.title(ctx) : view.title)) || 'CityConnect'} · CityConnect`;
    current = { path, view: viewName, ctx };
    renderChrome();
    if (samePage && opts.keepScroll) window.scrollTo(0, scroll);
    else if (!samePage) {
      window.scrollTo(0, 0);
      const h1 = main.querySelector('.page-title');
      if (h1 && !opts.initial) h1.focus({ preventScroll: true });
    }
    if (!samePage) document.body.classList.remove('nav-open', 'filters-open', 'search-open');
  }

  /** Re-render the current view after state changes. */
  function refresh() {
    const view = CC.views[current.view];
    if (view && view.liveRefresh === false) { renderChrome(); return; }
    render({ keepScroll: true });
  }

  /* ---------------- Chrome: nav, sidebar, role, notifications ---------------- */

  function orgNav() {
    const st = S.stats();
    return [
      { href: '#/dashboard', label: 'Overview', top: 'Dashboard', icon: 'dashboard', match: ['/dashboard'] },
      { href: '#/vendors', label: 'Find Vendors', icon: 'search', match: ['/vendors'] },
      { href: '#/requests', label: 'Service Requests', icon: 'clipboard', match: ['/requests'], badge: st.openRequests },
      { href: '#/jobs', label: 'Active Jobs', icon: 'hardHat', match: ['/jobs'], badge: st.activeJobs, side: true },
      { href: '#/directory', label: 'Vendor Directory', icon: 'building', match: ['/directory'], side: true },
      { href: '#/reports', label: 'Reports & Analytics', icon: 'chart', match: ['/reports'], side: true },
      { href: '#/settings', label: 'Settings', icon: 'settings', match: ['/settings'], side: true }
    ];
  }
  function vendorNav() {
    const vid = S.getState().settings.vendorId;
    const incoming = CC.vendorPortal ? CC.vendorPortal.counts(vid) : { newCount: 0, active: 0 };
    return [
      { href: '#/portal', label: 'Vendor Dashboard', top: 'Portal', icon: 'dashboard', match: ['/portal'], exact: true },
      { href: '#/portal/requests', label: 'Incoming Requests', top: 'Requests', icon: 'inbox', match: ['/portal/requests'], badge: incoming.newCount },
      { href: '#/portal/jobs', label: 'My Jobs', top: 'Jobs', icon: 'hardHat', match: ['/portal/jobs'], badge: incoming.active },
      { href: `#/vendors/${vid}`, label: 'Public Profile', icon: 'building', match: [`/vendors/${vid}`], side: true },
      { href: '#/vendors', label: 'Vendor Marketplace', top: 'Marketplace', icon: 'search', match: ['/vendors'], side: true },
      { href: '#/settings', label: 'Settings', icon: 'settings', match: ['/settings'], side: true }
    ];
  }
  function isActive(item, path) {
    return item.match.some((m) => (item.exact ? path === m : path === m || path.startsWith(m + '/')));
  }

  function renderChrome() {
    const st = S.getState();
    const role = st.settings.role;
    const path = current.path || '';
    const nav = role === 'vendor' ? vendorNav() : orgNav();
    const v = S.vendor(st.settings.vendorId);

    // Sidebar
    $('#sidebar-nav').innerHTML = String(html`
      ${role === 'org'
        ? html`<a class="btn btn-primary btn-block sidebar-cta" href="#/requests/new">${icon('plus')} New service request</a>`
        : html`<div class="sidebar-vendor">${vendorLogo(v, 36)}<div><strong>${v.name}</strong><span class="muted small">Vendor portal (demo)</span></div></div>`}
      <p class="nav-heading">${role === 'org' ? 'Workspace' : 'Vendor workspace'}</p>
      <ul class="side-nav">
        ${nav.map((n) => html`<li><a href="${n.href}" class="${isActive(n, path) ? 'active' : ''}" ${isActive(n, path) ? html`aria-current="page"` : ''}>
          ${icon(n.icon)}<span>${n.label}</span>${n.badge ? html`<span class="nav-badge">${n.badge}</span>` : ''}</a></li>`)}
      </ul>
      <p class="nav-heading">Demo</p>
      <ul class="side-nav">
        <li><a href="#/notifications" class="${path === '/notifications' ? 'active' : ''}">${icon('bell')}<span>Notifications</span>${S.unreadCount() ? html`<span class="nav-badge">${S.unreadCount()}</span>` : ''}</a></li>
        <li><button type="button" data-action="switch-role-quick">${icon('swap')}<span>Switch to ${role === 'org' ? 'vendor' : 'organization'} view</span></button></li>
      </ul>`);

    // Top navigation
    const top = role === 'org'
      ? [nav[0], nav[1], nav[2], { href: '#/portal', label: 'Vendors', icon: 'lock', match: ['/portal'], locked: true }]
      : [nav[0], nav[1], nav[2], { href: '#/vendors', label: 'Find Vendors', match: ['/vendors'] }];
    $('#top-nav').innerHTML = String(html`${top.map((n) => html`<a href="${n.href}" class="${isActive(n, path) ? 'active' : ''}" ${n.locked ? html`data-tip="Vendor portal — switch to the vendor demo role"` : ''}>${n.top || n.label}${n.locked ? icon('lock', { size: 13 }) : ''}</a>`)}`);

    // Role switcher
    $('#role-label').textContent = role === 'org' ? 'Organization' : 'Vendor';
    $('#role-panel').innerHTML = String(html`
      <p class="dropdown-title">Demo role</p>
      <p class="muted small mb-2">Simulated roles for demonstration only — this is not authentication.</p>
      <div class="role-options" role="radiogroup" aria-label="Demo role">
        <button type="button" role="radio" aria-checked="${role === 'org'}" class="role-option ${role === 'org' ? 'selected' : ''}" data-action="set-role" data-role="org">
          ${icon('building')}<span><strong>Organization</strong><span class="muted small d-block">${st.org.name}</span></span>
        </button>
        <button type="button" role="radio" aria-checked="${role === 'vendor'}" class="role-option ${role === 'vendor' ? 'selected' : ''}" data-action="set-role" data-role="vendor">
          ${icon('hardHat')}<span><strong>Vendor</strong><span class="muted small d-block">Act as a vendor business</span></span>
        </button>
      </div>
      <label class="small fw-600 mt-3 d-block" for="role-vendor-select">Vendor business</label>
      <select id="role-vendor-select" class="input mt-1" data-change="role-vendor">
        ${S.vendors().map((x) => html`<option value="${x.id}" ${x.id === st.settings.vendorId ? 'selected' : ''}>${x.name} (${S.cityName(x.baseCity)})</option>`)}
      </select>`);

    // Notifications
    const unread = S.unreadCount();
    const badge = $('#notif-count');
    badge.textContent = unread > 9 ? '9+' : String(unread);
    badge.hidden = !unread;
    $('#notif-toggle').setAttribute('aria-label', `Notifications, ${unread} unread`);
    const list = S.notificationsForCurrentRole().slice(0, 6);
    $('#notif-panel').innerHTML = String(html`
      <div class="dropdown-head">
        <p class="dropdown-title">Notifications</p>
        <button type="button" class="link-btn" data-action="mark-all-read" ${unread ? '' : 'disabled'}>Mark all as read</button>
      </div>
      ${list.length ? html`<ul class="notif-list">${list.map(notifItem)}</ul>` : CC.ui.emptyState({ icon: 'bell', title: 'You’re all caught up', text: 'New activity will appear here.', compact: true })}
      <div class="dropdown-foot"><a href="#/notifications">View all notifications</a></div>`);

    // Profile
    const who = role === 'org' ? { name: st.org.user.name, sub: st.org.name } : { name: v.contact.person, sub: v.name };
    $('#profile-initials').textContent = CC.ui.initials(who.name);
    $('#profile-panel').innerHTML = String(html`
      <div class="profile-head">
        <span class="avatar avatar-lg">${CC.ui.initials(who.name)}</span>
        <div><strong>${who.name}</strong><span class="muted small d-block">${who.sub}</span><span class="badge badge-neutral mt-1">${role === 'org' ? 'Organization' : 'Vendor'} · demo</span></div>
      </div>
      <ul class="menu-list">
        <li><a href="#/settings">${icon('settings')} Settings</a></li>
        <li><a href="#/notifications">${icon('bell')} Notifications</a></li>
        <li><button type="button" data-action="switch-role-quick">${icon('swap')} Switch to ${role === 'org' ? 'vendor' : 'organization'} view</button></li>
        <li><button type="button" data-action="reset-demo">${icon('rotateCcw')} Reset demo data</button></li>
        <li><button type="button" disabled aria-disabled="true" data-tip="Sign-in will be available in the full-stack release">${icon('logout')} Sign out <span class="badge badge-neutral">Soon</span></button></li>
      </ul>`);
    document.body.dataset.role = role;
  }

  function notifItem(n) {
    const ICON = { quote: 'fileText', approved: 'checkCircle', rejected: 'xCircle', response: 'message', scheduled: 'calendarCheck', started: 'hardHat', progress: 'activity', completed: 'award', new_request: 'inbox', cancelled: 'xCircle', message: 'message', update: 'edit', issue: 'alert' };
    return html`<li><button type="button" class="notif ${n.read ? '' : 'unread'}" data-action="open-notification" data-id="${n.id}">
      <span class="notif-icon">${icon(ICON[n.type] || 'bell', { size: 16 })}</span>
      <span class="notif-text"><strong>${n.title}</strong><span>${n.body}</span><time class="muted small" datetime="${n.at}">${relTime(n.at)}</time></span>
      ${n.read ? '' : html`<span class="unread-dot" aria-label="Unread"></span>`}
    </button></li>`;
  }

  /* ---------------- Global search ---------------- */

  const search = { items: [], active: -1 };

  function searchIndex(q) {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const role = S.getState().settings.role;
    const res = [];
    D.CITIES.forEach((c) => {
      if (c.name.toLowerCase().includes(t) || c.pins.some((p) => p.startsWith(t)) || c.pinPrefixes.some((p) => t.startsWith(p) && /^\d{3,6}$/.test(t))) {
        res.push({ group: 'Cities', icon: 'mapPin', label: c.name, sub: `${S.vendorsInCity(c.id).length} vendors · ${c.region}`, href: `#/vendors?city=${c.id}` });
      }
    });
    S.vendors().forEach((v) => {
      if (v.name.toLowerCase().includes(t) || v.pins.some((p) => p.startsWith(t))) {
        res.push({ group: 'Vendors', icon: 'building', label: v.name, sub: `${S.cityName(v.baseCity)} · ${v.rating.toFixed(1)}★`, href: `#/vendors/${v.id}` });
      }
    });
    D.SERVICES.forEach((s) => {
      if (s.name.toLowerCase().includes(t) || s.short.toLowerCase().includes(t)) {
        res.push({ group: 'Services', icon: s.icon, label: s.name, sub: `${S.vendors().filter((v) => v.services.includes(s.id)).length} vendors offer this`, href: `#/vendors?service=${s.id}` });
      }
    });
    if (role === 'org') {
      S.getState().requests.forEach((r) => {
        if (r.id.toLowerCase().includes(t) || (r.area + ' ' + S.cityName(r.city)).toLowerCase().includes(t)) {
          res.push({ group: 'Requests', icon: 'clipboard', label: r.id, sub: `${S.serviceNames(r.services)} · ${S.cityName(r.city)} · ${S.statusLabel(r.status)}`, href: `#/requests/${r.id}` });
        }
      });
    }
    const groups = ['Cities', 'Vendors', 'Services', 'Requests'];
    const limited = [];
    groups.forEach((g) => limited.push(...res.filter((r) => r.group === g).slice(0, g === 'Requests' ? 3 : 4)));
    limited.push({ group: 'Search', icon: 'search', label: `Search vendors for “${q.trim()}”`, sub: 'Show all matching vendors', href: `#/vendors?q=${encodeURIComponent(q.trim())}` });
    return limited;
  }

  function renderSuggestions(q) {
    const box = $('#search-suggestions');
    const input = $('#global-search');
    search.items = searchIndex(q);
    search.active = -1;
    if (!search.items.length) { box.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
    let lastGroup = null;
    box.innerHTML = String(html`${search.items.map((it, i) => {
      const head = it.group !== lastGroup && it.group !== 'Search' ? html`<li class="sugg-group" role="presentation">${it.group}</li>` : '';
      lastGroup = it.group;
      return html`${head}<li role="option" id="sugg-${i}" class="sugg ${it.group === 'Search' ? 'sugg-all' : ''}" data-index="${i}" aria-selected="false">
        <span class="sugg-icon">${icon(it.icon, { size: 16 })}</span><span><strong>${highlight(it.label, q)}</strong><span class="muted small d-block">${it.sub}</span></span></li>`;
    })}`);
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }
  function highlight(text, q) {
    const i = text.toLowerCase().indexOf(q.trim().toLowerCase());
    if (i < 0 || !q.trim()) return text;
    return html`${text.slice(0, i)}<mark>${text.slice(i, i + q.trim().length)}</mark>${text.slice(i + q.trim().length)}`;
  }
  function setActive(i) {
    const opts = $$('#search-suggestions .sugg');
    opts.forEach((o) => o.setAttribute('aria-selected', 'false'));
    search.active = i;
    const input = $('#global-search');
    if (i >= 0 && opts[i]) {
      opts[i].setAttribute('aria-selected', 'true');
      opts[i].scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', opts[i].id);
    } else input.removeAttribute('aria-activedescendant');
  }
  function closeSuggestions() {
    $('#search-suggestions').hidden = true;
    $('#global-search').setAttribute('aria-expanded', 'false');
    $('#global-search').removeAttribute('aria-activedescendant');
  }
  function chooseSuggestion(i) {
    const it = search.items[i];
    if (!it) return;
    closeSuggestions();
    $('#global-search').value = '';
    document.body.classList.remove('search-open');
    location.hash = it.href;
  }

  function initSearch() {
    const input = $('#global-search');
    const box = $('#search-suggestions');
    const update = debounce(() => renderSuggestions(input.value), 120);
    input.addEventListener('input', update);
    input.addEventListener('focus', () => { if (input.value.trim()) renderSuggestions(input.value); });
    input.addEventListener('keydown', (e) => {
      const n = search.items.length;
      if (e.key === 'ArrowDown') { e.preventDefault(); if (box.hidden) renderSuggestions(input.value); setActive(Math.min(n - 1, search.active + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(-1, search.active - 1)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (search.active >= 0) chooseSuggestion(search.active);
        else if (input.value.trim()) { const q = input.value.trim(); closeSuggestions(); input.value = ''; document.body.classList.remove('search-open'); location.hash = `#/vendors?q=${encodeURIComponent(q)}`; }
      } else if (e.key === 'Escape') { closeSuggestions(); }
    });
    box.addEventListener('mousedown', (e) => {
      const li = e.target.closest('.sugg');
      if (li) { e.preventDefault(); chooseSuggestion(+li.dataset.index); }
    });
    box.addEventListener('mousemove', (e) => {
      const li = e.target.closest('.sugg');
      if (li && +li.dataset.index !== search.active) setActive(+li.dataset.index);
    });
    input.addEventListener('blur', () => setTimeout(closeSuggestions, 120));
  }

  /* ---------------- Global actions ---------------- */

  Object.assign(CC.actions, {
    'toggle-nav': () => { document.body.classList.toggle('nav-open'); },
    'close-nav': () => { document.body.classList.remove('nav-open'); },
    'toggle-search': () => {
      document.body.classList.toggle('search-open');
      if (document.body.classList.contains('search-open')) $('#global-search').focus();
    },
    'mark-all-read': () => { S.markAllRead(); toast('All notifications marked as read.', 'info'); },
    'open-notification': (el) => {
      const n = S.getState().notifications.find((x) => x.id === el.dataset.id);
      if (!n) return;
      S.markRead(n.id);
      CC.ui.closeAllDropdowns();
      if (n.link) location.hash = n.link;
    },
    'mark-read': (el) => { S.markRead(el.dataset.id); },
    'set-role': (el) => switchRole(el.dataset.role),
    'switch-role-quick': () => {
      CC.ui.closeAllDropdowns();
      const role = S.getState().settings.role === 'org' ? 'vendor' : 'org';
      switchRole(role);
    },
    'switch-to-vendor': (el) => switchRole('vendor', el.dataset.vendor, el.dataset.go),
    'switch-to-org': (el) => switchRole('org', null, el.dataset.go),
    'reset-demo': async () => {
      CC.ui.closeAllDropdowns();
      const ok = await confirm({
        title: 'Reset demo data?', danger: true, confirmText: 'Reset data',
        message: 'This permanently removes every request, quotation, notification and setting you created in this browser and restores the original sample dataset.'
      });
      if (!ok) return;
      S.reset();
      if (CC.views.requestForm && CC.views.requestForm.resetWizard) CC.views.requestForm.resetWizard();
      navigate('/dashboard');
      toast('Demo data has been restored to its original state.', 'success', { title: 'Reset complete' });
    },
    'go-back': () => { history.length > 1 ? history.back() : navigate(homePath()); }
  });
  Object.assign(CC.changes, {
    'role-vendor': (el) => {
      const role = S.getState().settings.role;
      S.setRole(role, el.value);
      if (role === 'vendor') { toast(`Now acting as ${S.vendor(el.value).name}.`, 'info', { title: 'Demo vendor changed' }); navigate('/portal'); }
    }
  });

  function switchRole(role, vendorId, go) {
    CC.ui.closeAllDropdowns();
    const st = S.getState();
    const changed = st.settings.role !== role || (vendorId && vendorId !== st.settings.vendorId);
    S.setRole(role, vendorId);
    if (changed) {
      const label = role === 'org' ? `Organization (${st.org.name})` : `Vendor (${S.vendor(st.settings.vendorId).name})`;
      toast(`You are now viewing the portal as ${label}.`, 'info', { title: 'Demo role switched' });
    }
    if (go) location.hash = go;
    else navigate(role === 'org' ? '/dashboard' : '/portal');
  }

  /* ---------------- Built-in views ---------------- */

  CC.views.notFound = {
    title: 'Page not found',
    render: () => CC.ui.emptyState({ icon: 'search', title: 'Page not found', text: 'The page you’re looking for doesn’t exist or has moved.', actions: html`<a class="btn btn-primary" href="#${homePath()}">Go to home</a>` })
  };

  CC.views.roleGate = {
    title: 'Switch role',
    render(ctx) {
      const st = S.getState();
      const needsVendor = ctx.audience === 'vendor';
      return html`<div class="card gate">
        <span class="gate-icon">${icon(needsVendor ? 'hardHat' : 'building', { size: 28 })}</span>
        <h1 class="page-title" tabindex="-1">${needsVendor ? 'Vendor portal' : 'Organization workspace'}</h1>
        <p class="muted">${needsVendor
          ? 'This area is for vendor users who receive requests, submit quotations and update job progress. In this demo you can preview it by switching roles.'
          : 'This page belongs to the organization workspace. Switch back to the organization role to continue.'}</p>
        ${needsVendor ? html`<div class="field gate-field"><label for="gate-vendor">Act as vendor</label>
          <select id="gate-vendor" class="input">${S.vendors().map((v) => html`<option value="${v.id}" ${v.id === st.settings.vendorId ? 'selected' : ''}>${v.name}</option>`)}</select></div>` : ''}
        <div class="gate-actions">
          <button type="button" class="btn btn-primary" data-action="${needsVendor ? 'gate-vendor' : 'switch-to-org'}" data-go="#${ctx.path}">${icon('swap')} Switch to ${needsVendor ? 'vendor' : 'organization'} view</button>
          <a class="btn btn-ghost" href="#${homePath()}">Back to my workspace</a>
        </div>
        <p class="muted small mt-3">${icon('info', { size: 13 })} Role switching is a demo convenience and is not real authentication or authorization.</p>
      </div>`;
    }
  };
  CC.actions['gate-vendor'] = (el) => {
    const sel = $('#gate-vendor');
    switchRole('vendor', sel ? sel.value : null, el.dataset.go);
  };

  /* ---------------- Delegated events ---------------- */

  function runHandler(map, name, el, e) {
    const fn = map[name];
    if (!fn) { console.warn('No handler for', name); return; }
    try {
      const r = fn(el, e);
      if (r && r.catch) r.catch(showError);
    } catch (err) { showError(err); }
  }
  function showError(err) {
    console.error(err);
    toast(err.message || 'Something went wrong.', 'error', { title: 'Action not completed' });
  }
  CC.app = { navigate, render, refresh, showError, homePath, current: () => current };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (el && !el.disabled) { e.preventDefault(); runHandler(CC.actions, el.dataset.action, el, e); }
  });
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]');
    if (form) { e.preventDefault(); runHandler(CC.forms, form.dataset.form, form, e); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (el) runHandler(CC.changes, el.dataset.change, el, e);
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (el) runHandler(CC.inputs, el.dataset.input, el, e);
  });
  // Keyboard activation for non-button elements with data-action (e.g. table rows).
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-action][role="button"], tr[data-href]')) {
      e.preventDefault();
      e.target.click();
    }
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) document.body.classList.remove('nav-open');
    // "/" focuses global search (unless typing in a field).
    if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]') && !document.querySelector('.modal-backdrop')) {
      e.preventDefault();
      if (window.innerWidth < 768) document.body.classList.add('search-open');
      $('#global-search').focus();
    }
  });
  // Clickable table rows / cards
  document.addEventListener('click', (e) => {
    const row = e.target.closest('[data-href]');
    if (row && !e.target.closest('a, button, input, select, label')) location.hash = row.dataset.href;
  });

  /* ---------------- Boot ---------------- */

  function boot() {
    S.load();
    S.subscribe((change) => { if (!change.silent) refresh(); else renderChrome(); });
    initSearch();
    window.addEventListener('hashchange', () => render());
    // Keep relative-time labels fresh.
    setInterval(() => { if (!document.querySelector('.modal-backdrop')) renderChrome(); }, 60000);
    if (!S.isStorageAvailable()) toast('Browser storage is disabled, so demo changes will not persist after a refresh.', 'warning', { title: 'Storage unavailable', duration: 8000 });
    render({ initial: true });
    document.body.classList.add('ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
