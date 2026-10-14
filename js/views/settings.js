/*
 * CityConnect — settings and notification centre
 */
(function () {
  'use strict';
  const CC = window.CC;
  const { html, icon, relTime, fmtDateTime, $, toast, num, vendorLogo } = CC.ui;
  const S = CC.store;
  const C = CC.components;

  CC.views.settings = {
    title: 'Settings',
    render() {
      const st = S.getState();
      const role = st.settings.role;
      const kb = (S.storageSize() / 1024).toFixed(1);
      return html`
        ${C.pageHeader({ title: 'Settings', subtitle: 'Organization profile, demo role and data management.' })}
        <div class="grid-2-1">
          <div class="stack">
            <section class="card"><div class="card-head"><h2>Organization profile</h2></div>
              <form data-form="org-profile" class="form-grid" novalidate>
                <div class="field span-2"><label for="s-org">Organization name</label><input id="s-org" name="name" class="input" value="${st.org.name}" required></div>
                <div class="field"><label for="s-user">Your name</label><input id="s-user" name="userName" class="input" value="${st.org.user.name}" required></div>
                <div class="field"><label for="s-title">Job title</label><input id="s-title" name="title" class="input" value="${st.org.user.title}"></div>
                <div class="field"><label for="s-email">Work email</label><input id="s-email" name="email" type="email" class="input" value="${st.org.user.email}" required><p class="field-error" hidden></p></div>
                <div class="field"><label for="s-phone">Phone</label><input id="s-phone" name="phone" type="tel" class="input" value="${st.org.user.phone}"></div>
                <div class="field span-2 form-actions"><button type="submit" class="btn btn-primary">${icon('check')} Save profile</button><span class="muted small">Used to pre-fill new service requests.</span></div>
              </form>
            </section>
            <section class="card"><div class="card-head"><h2>Notification channels</h2><span class="badge badge-neutral">Future capability</span></div>
              <p class="muted small mb-3">In this prototype notifications appear only inside CityConnect. External delivery will be available once a backend is connected.</p>
              ${[['In-app notifications', 'Bell icon and notification centre', true, false], ['Email alerts', 'Quotation and status updates by email', false, true], ['SMS alerts', 'Critical job updates by SMS', false, true], ['WhatsApp updates', 'Vendor messages via WhatsApp Business', false, true], ['Browser push', 'Desktop push notifications', false, true]].map(([t, d, on, dis]) => html`
                <div class="setting-row"><div><strong>${t}</strong><span class="muted small d-block">${d}</span></div>
                  <label class="switch" ${dis ? html`data-tip="Coming in the full-stack release"` : ''}><input type="checkbox" ${on ? 'checked' : ''} disabled aria-label="${t}"><span class="switch-track"></span><span class="sr-only">${dis ? 'Not available yet' : 'Always on'}</span></label></div>`)}
            </section>
          </div>
          <div class="stack">
            <section class="card"><div class="card-head"><h2>Demo role</h2></div>
              <p class="small">You are viewing CityConnect as <strong>${role === 'org' ? `Organization — ${st.org.name}` : `Vendor — ${S.vendor(st.settings.vendorId).name}`}</strong>.</p>
              <div class="btn-row mt-3">
                <button type="button" class="btn ${role === 'org' ? 'btn-primary' : 'btn-secondary'}" data-action="set-role" data-role="org">${icon('building')} Organization</button>
                <button type="button" class="btn ${role === 'vendor' ? 'btn-primary' : 'btn-secondary'}" data-action="set-role" data-role="vendor">${icon('hardHat')} Vendor</button>
              </div>
              <p class="muted xsmall mt-2">${icon('info', { size: 12 })} Simulated roles — not authentication or authorization. Choose the acting vendor from the “Demo role” menu in the top bar.</p>
            </section>
            <section class="card"><div class="card-head"><h2>Data & storage</h2></div>
              <dl class="info-grid compact">
                ${C.infoRow('Storage', S.isStorageAvailable() ? `Browser LocalStorage · ${kb} KB used` : 'Unavailable — session only')}
                ${C.infoRow('Service requests', num(st.requests.length))}
                ${C.infoRow('Quotations', num(st.quotes.length))}
                ${C.infoRow('Notifications', num(st.notifications.length))}
                ${C.infoRow('Activity records', num(st.activity.length))}
                ${C.infoRow('Sample data loaded', fmtDateTime(st.seededAt))}
              </dl>
              <div class="btn-row mt-3">
                <button type="button" class="btn btn-secondary" data-action="export-json">${icon('download')} Export data (JSON)</button>
                <button type="button" class="btn btn-danger" data-action="reset-demo">${icon('rotateCcw')} Reset demo data</button>
              </div>
            </section>
            <section class="card"><div class="card-head"><h2>About this demo</h2></div>
              <ul class="check-list small">
                <li>${icon('info', { size: 14 })}All vendor businesses, people, contacts, ratings, reviews, certifications and verification badges are fictional sample data.</li>
                <li>${icon('lock', { size: 14 })}No data is sent to a server; everything is stored in this browser only.</li>
                <li>${icon('paperclip', { size: 14 })}Attachments are previewed locally and never uploaded.</li>
                <li>${icon('swap', { size: 14 })}The role selector simulates organization and vendor users in one browser.</li>
              </ul>
            </section>
          </div>
        </div>`;
    }
  };

  CC.forms['org-profile'] = (form) => {
    const f = form.elements;
    const email = f.email.value.trim();
    const err = form.querySelector('.field-error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.textContent = 'Enter a valid email address.'; err.hidden = false; f.email.setAttribute('aria-invalid', 'true'); f.email.focus(); return; }
    if (f.name.value.trim().length < 2 || f.userName.value.trim().length < 2) { toast('Organization and user name are required.', 'error', { title: 'Missing details' }); return; }
    S.updateOrg({ name: f.name.value.trim(), userName: f.userName.value.trim(), title: f.title.value.trim(), email, phone: f.phone.value.trim() });
    toast('Organization profile saved.', 'success', { title: 'Saved' });
  };
  CC.actions['export-json'] = () => {
    const blob = new Blob([JSON.stringify(S.getState(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'cityconnect-demo-data.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('cityconnect-demo-data.json downloaded.', 'success', { title: 'Export ready' });
  };

  /* ---------------- Notification centre ---------------- */

  let nFilter = 'all';
  CC.views.notifications = {
    title: 'Notifications',
    render() {
      const all = S.notificationsForCurrentRole();
      const list = nFilter === 'unread' ? all.filter((n) => !n.read) : all;
      const role = S.getState().settings.role;
      return html`
        ${C.pageHeader({ title: 'Notifications', subtitle: role === 'org' ? 'Updates on your service requests, quotations and jobs.' : `Updates for ${S.vendor(S.getState().settings.vendorId).name}.`,
          actions: html`<button type="button" class="btn btn-secondary" data-action="mark-all-read" ${all.some((n) => !n.read) ? '' : 'disabled'}>${icon('check')} Mark all as read</button>` })}
        <div class="seg-tabs" role="tablist" aria-label="Notification filter">
          <button type="button" role="tab" aria-selected="${nFilter === 'all'}" class="seg-tab ${nFilter === 'all' ? 'active' : ''}" data-action="notif-filter" data-f="all">All<span class="tab-count">${all.length}</span></button>
          <button type="button" role="tab" aria-selected="${nFilter === 'unread'}" class="seg-tab ${nFilter === 'unread' ? 'active' : ''}" data-action="notif-filter" data-f="unread">Unread<span class="tab-count">${all.filter((n) => !n.read).length}</span></button>
        </div>
        <section class="card">
          ${list.length ? html`<ul class="notif-page">${list.map((n) => html`<li class="${n.read ? '' : 'unread'}">
            <span class="unread-marker" aria-hidden="true"></span>
            <div class="grow"><p><strong>${n.title}</strong></p><p class="small">${n.body}</p><time class="muted xsmall" datetime="${n.at}">${relTime(n.at)} · ${fmtDateTime(n.at)}</time></div>
            <div class="row-actions">
              ${n.link ? html`<button type="button" class="btn btn-sm btn-secondary" data-action="open-notification" data-id="${n.id}">Open</button>` : ''}
              ${n.read ? html`<span class="muted xsmall">Read</span>` : html`<button type="button" class="btn btn-sm btn-ghost" data-action="mark-read" data-id="${n.id}">Mark read</button>`}
            </div></li>`)}</ul>`
          : CC.ui.emptyState({ icon: 'bell', title: nFilter === 'unread' ? 'No unread notifications' : 'No notifications yet', text: 'You’ll see quotation, scheduling and progress updates here.' })}
          <p class="muted xsmall mt-3">${icon('info', { size: 12 })} Email, SMS, WhatsApp and push delivery are future capabilities — not simulated in this demo.</p>
        </section>`;
    }
  };
  CC.actions['notif-filter'] = (el) => { nFilter = el.dataset.f; CC.app.render({ keepScroll: true }); };
})();
