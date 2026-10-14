# CityConnect — CCTV Vendor Discovery & Service Management Portal

> **Local expertise. Reliable execution. Anywhere.**

CityConnect is a static web app for organizations that coordinate CCTV installation, maintenance and repair work across Gujarat cities. An organization based in Ahmedabad can find vendors in Rajkot, compare them, request quotations, approve one, and track the job to completion. Vendors use the same app, through a demo role, to receive requests, send quotations and update job progress.

It is built with **HTML5, CSS3 and vanilla JavaScript (ES6+)**. There is no framework, no build step and no backend. Data is stored in the browser with **LocalStorage**.

> ⚠️ **Demo disclosure.** Every vendor business, person, phone number, e-mail address, rating, review, certification and "verified" badge is **fictional sample data**. E-mail addresses use the reserved `.example` domain. Nothing is sent to a server, and no real vendor is contacted.

---

## Features

| Area | What you can do |
| --- | --- |
| **Dashboard** | Six KPIs computed from live data, a recent requests table, a status chart, a city coverage map, recent activity, quick actions and recommended vendors for any city and service |
| **Vendor discovery** | Search by city, vendor name, service or PIN code with autocomplete. Filter by city, service category, installation vs. maintenance, rating, budget, availability, verified status and emergency service. Sort five ways. Includes skeleton loading, a "Load more" button and helpful empty states |
| **Vendor profiles** | Cover image, contact details, coverage, pricing, hours, certifications and equipment, plus Overview / Services / Portfolio / Reviews tabs, a gallery lightbox and service packages |
| **Service request wizard** | Five steps (Location → Requirements → Schedule & budget → Contact → Review) with inline validation, PIN-to-city checks, attachment previews in the browser (files are never uploaded), drafts, and a choice between one specific vendor or up to five best-matched vendors |
| **Request management** | Search, filter, sort and export to CSV. Each request has a detail page with a lifecycle stepper and status history. You can edit, cancel (with a reason), invite more vendors, compare quotations, approve or decline them, confirm completion with a rating, or report an issue |
| **Quotation comparison** | Side-by-side table (cards on mobile) that highlights the lowest quote and a recommended quote. The recommendation weighs price, rating, schedule fit, experience, coverage, warranty and speed, and explains why the cheapest quote is not always chosen |
| **Vendor portal** | Demo role switcher, vendor dashboard, incoming requests by stage, accept or decline, quotations with a material/labour/other cost breakdown and GST, revisions, scheduling, starting work, progress updates and marking a job complete |
| **Notifications & activity** | Notification centre with unread counts and mark-as-read for each role, an activity timeline and toast messages. Email, SMS and WhatsApp are shown as *future capabilities* |
| **Reports** | Date-range filter, KPIs, monthly spend, requests by city, jobs by status, completed vs. pending work, vendor response performance and average quote by city, with CSV export |
| **Settings** | Organization profile, demo role, storage statistics, JSON export and **Reset demo data** (with a confirmation step) |

### Status workflow

```
Draft → Submitted → Under Review → Quotation Received → Approved → Scheduled → In Progress → Completed
                                     (cancellable until work starts)                       ↘ Cancelled
```

Transitions are enforced in `js/store.js` (`TRANSITIONS`), so a request can only move to a valid next status.

### End-to-end demo script

1. Go to **Find Vendors**, choose **Rajkot** and open a vendor profile.
2. Click **Request quotation** and complete the five-step form.
3. On the success screen, click **Switch to vendor view**. The request is now in that vendor's portal. Click **Submit quotation**.
4. Switch back to **Organization** in the *Demo role* menu. Open the request, click **Compare quotations**, then **Approve**.
5. Switch to the vendor again. **Confirm schedule**, **Start work**, post a progress update, then **Mark job completed**.
6. Switch back to Organization and click **Confirm completion**. Refresh the page; all data is still there.

`CC-REQ-2044` (Rajkot warehouse) already has three sample quotations, so you can try the comparison view right away.

---

## Project structure

```
index.html              App shell (top bar, sidebar, view container, modal/toast roots)
css/styles.css          Design tokens, components, responsive layouts
js/data.js              Initial demo dataset (cities, services, 14 vendors, 15 requests, quotations)
js/ui.js                Safe HTML templating, icons, formatters, modal/confirm/toast, CSV
js/store.js             Central state, LocalStorage persistence, workflow rules, notifications, metrics
js/charts.js            Lightweight SVG/CSS charts with tooltips
js/components.js        Shared view components (badges, vendor cards, stepper, timeline…)
js/views/*.js           Dashboard, discovery/profile/directory, request wizard, requests/compare/jobs, reports, settings
js/vendor.js            Vendor portal
js/app.js               Hash router, navigation, global search, role switcher, event delegation
assets/img/             Logo, favicon and offline image fallbacks
```

### Implementation notes

- **Safe rendering:** all markup goes through the `html` tagged template in `js/ui.js`, which escapes every interpolated value by default. This prevents HTML injection from anything a user types.
- **No inline handlers:** interactions use event delegation with `data-action`, `data-form`, `data-change` and `data-input` attributes.
- **Single source of truth:** every view reads from `CC.store`. Each mutation saves to LocalStorage and re-renders the app, so the dashboard, lists, vendor views and notifications stay consistent.
- **Images:** photos come from Unsplash. If one fails to load, a local SVG fallback replaces it automatically. Vendor logos are generated monograms.
- **Accessibility:** semantic landmarks, labelled form controls, visible focus rings, a skip link, an ARIA combobox for search, ARIA tabs, focus-trapped modals, keyboard-operable dropdowns and rows, and support for reduced motion.
- **Extending to full-stack:** each `CC.store` mutation (`createRequest`, `submitQuote`, `approveQuote`…) maps directly onto a future REST endpoint.

---

## Run locally

No installation is needed. You can either:

- **Open `index.html` directly** in a modern browser (Chrome, Edge, Firefox or Safari). Everything works from `file://`.
- **Or serve the folder** (recommended, because it matches hosting):

  ```bash
  python3 -m http.server 8000
  # then open http://localhost:8000/
  ```

To start again with fresh sample data, use **Settings → Reset demo data**, or clear the site's storage in the browser.

## Deploy to GitHub Pages

All paths are relative and routing uses the URL hash (`#/vendors`). The app therefore works from a project sub-path such as `https://<username>.github.io/<repository-name>/` without any server configuration.

**Option A: GitHub Actions (included)**

1. Push the repository to GitHub.
2. Go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` publishes the site on every push. You can also run it by hand from the **Actions** tab.

**Option B: Deploy from a branch**

1. Go to **Settings → Pages → Source** and choose **Deploy from a branch**.
2. Select the branch and the `/ (root)` folder, then save.

After a minute or two, the site will be available at `https://<username>.github.io/<repository-name>/`.
