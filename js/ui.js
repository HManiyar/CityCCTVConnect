/*
 * CityConnect — UI utilities
 * Safe HTML templating, icons, formatting, toasts, modals, dropdowns,
 * CSV export and other helpers shared by every view.
 */
(function () {
  'use strict';

  /* ---------------- Safe HTML templating ---------------- */

  // Wrapper marking a string as already-safe HTML.
  class SafeHTML {
    constructor(str) { this.str = str; }
    toString() { return this.str; }
  }

  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"'`]/g, (c) => ESC_MAP[c]);
  }

  function toHTML(value) {
    if (value == null || value === false) return '';
    if (value instanceof SafeHTML) return value.str;
    if (Array.isArray(value)) return value.map(toHTML).join('');
    return esc(value);
  }

  /**
   * Tagged template that escapes every interpolated value unless it is
   * SafeHTML (e.g. the result of another html`` call or raw()).
   */
  function html(strings, ...values) {
    let out = '';
    strings.forEach((s, i) => {
      out += s;
      if (i < values.length) out += toHTML(values[i]);
    });
    return new SafeHTML(out);
  }

  const raw = (str) => new SafeHTML(String(str));

  /* ---------------- Icons (Lucide-style, MIT) ---------------- */

  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    mapPin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    shieldCheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
    calendarCheck: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    xCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    cctv: '<path d="M16.75 12h3.632a1 1 0 0 1 .894 1.447l-2.034 4.069a1 1 0 0 1-1.708.134l-2.124-2.97"/><path d="M17.106 9.053a1 1 0 0 1 .447 1.341l-3.106 6.211a1 1 0 0 1-1.342.447L3.61 12.3a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3z"/><path d="M2 19h3.76a2 2 0 0 0 1.8-1.1L9 15"/><path d="M2 21v-4"/><path d="M7 9h.01"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    server: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>',
    move: '<polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/>',
    siren: '<path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1z"/><path d="M21 12h1"/><path d="M18.5 4.5 18 5"/><path d="M2 12h1"/><path d="M12 2v1"/><path d="m4.93 4.93.71.71"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    paperclip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    fileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    swap: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    trendingUp: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    rupee: '<path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    sparkles: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.13a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.13 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0z"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    hardHat: '<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/>',
    rotateCcw: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    moreH: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>'
  };

  function icon(name, opts = {}) {
    const size = opts.size || 18;
    const cls = opts.cls ? ` ${opts.cls}` : '';
    const body = ICONS[name] || ICONS.info;
    return raw(`<svg class="icon${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${opts.stroke || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`);
  }

  /* ---------------- Formatting ---------------- */

  const inrFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const numFmt = new Intl.NumberFormat('en-IN');
  const inr = (n) => inrFmt.format(Math.round(Number(n) || 0));
  const num = (n) => numFmt.format(Number(n) || 0);
  function inrShort(n) {
    n = Number(n) || 0;
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, '')} Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, '')} L`;
    if (n >= 1e3) return `₹${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
    return inr(n);
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function toDate(d) { return d instanceof Date ? d : new Date(d); }
  function fmtDate(d) {
    if (!d) return '—';
    const dt = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? parseYMD(d) : toDate(d);
    if (isNaN(dt)) return '—';
    return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
  }
  function fmtTime(d) {
    const dt = toDate(d);
    let h = dt.getHours(); const m = String(dt.getMinutes()).padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return `${h}:${m} ${ap}`;
  }
  const fmtDateTime = (d) => `${fmtDate(d)}, ${fmtTime(d)}`;
  function relTime(d) {
    const diff = (Date.now() - toDate(d).getTime()) / 1000;
    if (diff < 45) return 'just now';
    if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
    if (diff < 86400 * 7) { const days = Math.round(diff / 86400); return days === 1 ? 'yesterday' : `${days} days ago`; }
    return fmtDate(d);
  }
  function ymd(d) {
    const dt = toDate(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }
  function parseYMD(s) {
    const [y, m, d] = String(s).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }
  function addDays(d, n) { const dt = new Date(toDate(d)); dt.setDate(dt.getDate() + n); return dt; }
  function daysBetween(a, b) { return Math.round((parseYMD(ymd(b)) - parseYMD(ymd(a))) / 86400000); }
  const monthLabel = (d) => `${MONTHS[toDate(d).getMonth()]} ${String(toDate(d).getFullYear()).slice(2)}`;
  const plural = (n, word, pluralWord) => `${num(n)} ${n === 1 ? word : (pluralWord || word + 's')}`;
  function fileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
  function initials(name) {
    return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  }

  /* ---------------- Misc helpers ---------------- */

  function uid(prefix) {
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-5)}${rand}`;
  }
  function debounce(fn, wait = 200) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------------- Images ---------------- */

  const FALLBACKS = {
    cover: 'assets/img/fallback-cover.svg',
    photo: 'assets/img/fallback-photo.svg'
  };
  function imgUrl(base, w = 800) {
    if (!base) return FALLBACKS.photo;
    if (!/^https?:/.test(base)) return base;
    return `${base}?auto=format&fit=crop&w=${w}&q=70`;
  }
  /** <img> with lazy loading and an automatic local fallback on error. */
  function img(src, alt, opts = {}) {
    const fb = FALLBACKS[opts.fallback || 'photo'];
    return html`<img src="${imgUrl(src, opts.w || 800)}" alt="${alt || ''}" loading="${opts.eager ? 'eager' : 'lazy'}" decoding="async" data-fallback="${fb}" class="${opts.cls || ''}">`;
  }
  // Global capture-phase listener swaps broken images for local fallbacks.
  document.addEventListener('error', (e) => {
    const el = e.target;
    if (el && el.tagName === 'IMG' && el.dataset.fallback && !el.dataset.failed) {
      el.dataset.failed = '1';
      el.src = el.dataset.fallback;
      el.classList.add('img-fallback');
    }
  }, true);

  /** Generated monogram logo for a vendor (no external dependency). */
  function vendorLogo(vendor, size = 48) {
    const color = /^#[0-9a-f]{6}$/i.test(vendor.color) ? vendor.color : '#1d4ed8';
    return html`<span class="vendor-logo" style="--logo:${raw(color)};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px" aria-hidden="true">${vendor.initials || initials(vendor.name)}</span>`;
  }

  function stars(rating, size = 14) {
    const full = Math.round(rating * 2) / 2;
    let out = '';
    for (let i = 1; i <= 5; i++) {
      const cls = full >= i ? 'on' : full >= i - 0.5 ? 'half' : 'off';
      out += `<span class="star ${cls}">${icon('star', { size }).str}</span>`;
    }
    return raw(`<span class="stars" aria-label="${esc(rating.toFixed(1))} out of 5 stars">${out}</span>`);
  }

  /* ---------------- Toasts ---------------- */

  function toast(message, type = 'success', opts = {}) {
    const root = $('#toast-root');
    if (!root) return;
    const ic = { success: 'checkCircle', error: 'xCircle', info: 'info', warning: 'alert' }[type] || 'info';
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = html`${icon(ic, { size: 18 })}<div class="toast-body"><strong>${opts.title || ''}</strong><span>${message}</span></div><button class="toast-close" type="button" aria-label="Dismiss notification">${icon('x', { size: 16 })}</button>`.str;
    root.appendChild(el);
    const remove = () => { el.classList.add('leaving'); setTimeout(() => el.remove(), 250); };
    el.querySelector('.toast-close').addEventListener('click', remove);
    setTimeout(remove, opts.duration || 4200);
  }

  /* ---------------- Modals ---------------- */

  const modalStack = [];
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /**
   * Opens a modal dialog.
   * @param {object} o  { title, body (SafeHTML|string), footer, size, onMount(el, close), onClose }
   * @returns {{el: HTMLElement, close: Function}}
   */
  function modal(o) {
    const root = $('#modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    const titleId = uid('mt');
    wrap.innerHTML = html`
      <div class="modal modal-${o.size || 'md'}" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <header class="modal-header">
          <div>
            <h2 id="${titleId}" class="modal-title">${o.title || ''}</h2>
            ${o.subtitle ? html`<p class="modal-subtitle">${o.subtitle}</p>` : ''}
          </div>
          <button type="button" class="icon-btn" data-modal-close aria-label="Close dialog">${icon('x')}</button>
        </header>
        <div class="modal-body">${o.body || ''}</div>
        ${o.footer ? html`<footer class="modal-footer">${o.footer}</footer>` : ''}
      </div>`.str;
    root.appendChild(wrap);
    document.body.classList.add('modal-open');
    const prevFocus = document.activeElement;
    const dialog = wrap.querySelector('.modal');
    let closed = false;

    function close(result) {
      if (closed) return;
      closed = true;
      wrap.classList.add('leaving');
      setTimeout(() => wrap.remove(), 180);
      modalStack.splice(modalStack.indexOf(api), 1);
      if (!modalStack.length) document.body.classList.remove('modal-open');
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      if (o.onClose) o.onClose(result);
    }
    const api = { el: dialog, close };
    modalStack.push(api);

    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
    wrap.addEventListener('click', (e) => { if (e.target.closest('[data-modal-close]')) close(); });
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Tab') {
        const f = $$(FOCUSABLE, dialog).filter((n) => n.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    if (o.onMount) o.onMount(dialog, close);
    requestAnimationFrame(() => {
      const target = dialog.querySelector('[autofocus]') || dialog.querySelector('.modal-body ' + FOCUSABLE) || dialog.querySelector(FOCUSABLE);
      if (target) target.focus();
    });
    return api;
  }

  /**
   * Confirmation dialog returning a Promise.
   * Resolves to false when cancelled, true (or the textarea value when
   * `input` is requested) when confirmed.
   */
  function confirm(o) {
    return new Promise((resolve) => {
      let resolved = false;
      const inputId = uid('ci');
      const body = html`
        <div class="confirm-body">
          <span class="confirm-icon ${o.danger ? 'danger' : ''}">${icon(o.icon || (o.danger ? 'alert' : 'info'), { size: 22 })}</span>
          <div>
            <p>${o.message || ''}</p>
            ${o.input ? html`
              <div class="field mt-3">
                <label for="${inputId}">${o.input.label}${o.input.required ? html` <span class="req">*</span>` : ''}</label>
                <textarea id="${inputId}" rows="3" placeholder="${o.input.placeholder || ''}"></textarea>
                <p class="field-error" hidden></p>
              </div>` : ''}
          </div>
        </div>`;
      const m = modal({
        title: o.title || 'Are you sure?',
        size: 'sm',
        body,
        footer: html`<button type="button" class="btn btn-ghost" data-modal-close>${o.cancelText || 'Cancel'}</button>
          <button type="button" class="btn ${o.danger ? 'btn-danger' : 'btn-primary'}" data-confirm-ok>${o.confirmText || 'Confirm'}</button>`,
        onMount(el, close) {
          el.querySelector('[data-confirm-ok]').addEventListener('click', () => {
            let value = true;
            if (o.input) {
              const ta = el.querySelector('textarea');
              value = ta.value.trim();
              if (o.input.required && value.length < 3) {
                const err = el.querySelector('.field-error');
                err.textContent = 'Please provide a short reason.';
                err.hidden = false;
                ta.setAttribute('aria-invalid', 'true');
                ta.focus();
                return;
              }
            }
            resolved = true;
            resolve(value);
            close();
          });
        },
        onClose() { if (!resolved) resolve(false); }
      });
      return m;
    });
  }

  /* ---------------- Dropdowns ---------------- */

  function closeAllDropdowns(except) {
    $$('[data-dropdown].open').forEach((dd) => {
      if (dd === except) return;
      dd.classList.remove('open');
      const t = dd.querySelector('[data-dropdown-toggle]');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-dropdown-toggle]');
    if (toggle) {
      const dd = toggle.closest('[data-dropdown]');
      const open = !dd.classList.contains('open');
      closeAllDropdowns(dd);
      dd.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (open) {
        const first = dd.querySelector('.dropdown-panel ' + FOCUSABLE);
        if (first && e.detail === 0) first.focus(); // keyboard activation
      }
      return;
    }
    if (!e.target.closest('[data-dropdown]')) closeAllDropdowns();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const open = $('[data-dropdown].open');
      if (open) {
        closeAllDropdowns();
        const t = open.querySelector('[data-dropdown-toggle]');
        if (t) t.focus();
      }
    }
  });

  /* ---------------- CSV ---------------- */

  function csvCell(v) {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  /** columns: [{label, value: row => any}] */
  function downloadCSV(filename, columns, rows) {
    const lines = [columns.map((c) => csvCell(c.label)).join(',')];
    rows.forEach((r) => lines.push(columns.map((c) => csvCell(c.value(r))).join(',')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`${filename} downloaded (${plural(rows.length, 'row')}).`, 'success', { title: 'Export ready' });
  }

  /* ---------------- Shared fragments ---------------- */

  function emptyState(o) {
    return html`<div class="empty-state ${o.compact ? 'compact' : ''}">
      <span class="empty-icon">${icon(o.icon || 'inbox', { size: 26 })}</span>
      <h3>${o.title}</h3>
      ${o.text ? html`<p>${o.text}</p>` : ''}
      ${o.actions ? html`<div class="empty-actions">${o.actions}</div>` : ''}
    </div>`;
  }

  function skeletonCards(n = 6) {
    return raw(Array.from({ length: n }, () => `
      <div class="card vendor-card skeleton-card" aria-hidden="true">
        <div class="sk sk-img"></div>
        <div class="p-4">
          <div class="sk sk-line w-60"></div><div class="sk sk-line w-40"></div>
          <div class="sk sk-line"></div><div class="sk sk-line w-80"></div>
          <div class="sk sk-btns"></div>
        </div>
      </div>`).join(''));
  }

  window.CC = window.CC || {};
  // Handler registries filled by view modules; wired up by app.js.
  ['views', 'actions', 'forms', 'changes', 'inputs'].forEach((k) => { window.CC[k] = window.CC[k] || {}; });
  window.CC.ui = {
    SafeHTML, html, raw, esc, icon, inr, inrShort, num, fmtDate, fmtTime, fmtDateTime, relTime, ymd, parseYMD,
    addDays, daysBetween, monthLabel, plural, fileSize, initials, uid, debounce, clamp, $, $$, imgUrl, img,
    vendorLogo, stars, toast, modal, confirm, closeAllDropdowns, downloadCSV, emptyState, skeletonCards, MONTHS
  };
})();
