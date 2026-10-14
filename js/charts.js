/*
 * CityConnect — lightweight SVG/CSS charts (no dependencies)
 * Every chart exposes a hover/focus tooltip and an accessible label.
 */
(function () {
  'use strict';
  const { html, raw, esc } = window.CC.ui;

  const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)'];

  /** Horizontal bars — magnitude comparison across categories (single hue). */
  function barsH(items, opts = {}) {
    if (!items.length) return html`<p class="muted small">No data for this period.</p>`;
    const max = Math.max(1, ...items.map((i) => i.value));
    return html`<ul class="hbars" aria-label="${opts.label || 'Bar chart'}">
      ${items.map((i) => html`<li class="hbar" tabindex="0" data-chart-tip="${i.tip || `${i.label}: ${i.display || i.value}`}">
        <span class="hbar-label">${i.prefix || ''}${i.label}</span>
        <span class="hbar-track"><span class="hbar-fill" style="width:${raw(((i.value / max) * 100).toFixed(1))}%;${i.color ? raw(`background:${i.color}`) : ''}"></span></span>
        <span class="hbar-value">${i.display != null ? i.display : i.value}</span>
      </li>`)}
    </ul>`;
  }

  /** Vertical columns — change over time (single hue, one axis). */
  function columns(items, opts = {}) {
    const W = 640, H = 240, padL = 56, padR = 12, padT = 16, padB = 34;
    const max = niceMax(Math.max(1, ...items.map((i) => i.value)));
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const slot = innerW / Math.max(1, items.length);
    const bw = Math.min(42, slot * 0.56);
    const fmt = opts.format || ((v) => v);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * t);
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="${esc(opts.label || 'Column chart')}">`;
    ticks.forEach((t) => {
      const y = padT + innerH - (t / max) * innerH;
      svg += `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" class="grid"/>`;
      svg += `<text x="${padL - 8}" y="${y + 4}" class="axis" text-anchor="end">${esc(opts.axisFormat ? opts.axisFormat(t) : fmt(t))}</text>`;
    });
    items.forEach((i, k) => {
      const h = (i.value / max) * innerH;
      const x = padL + k * slot + (slot - bw) / 2;
      const y = padT + innerH - h;
      const r = Math.min(4, h / 2);
      // Rounded top, square baseline
      const path = h > 0
        ? `M${x},${padT + innerH} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${padT + innerH} Z`
        : '';
      svg += `<g class="col" tabindex="0" data-chart-tip="${esc(`${i.label}: ${fmt(i.value)}${i.extra ? ' · ' + i.extra : ''}`)}">`;
      svg += `<rect x="${padL + k * slot}" y="${padT}" width="${slot}" height="${innerH}" class="hit"/>`;
      if (path) svg += `<path d="${path}" class="col-bar"/>`;
      svg += `<text x="${x + bw / 2}" y="${H - 12}" class="axis" text-anchor="middle">${esc(i.label)}</text></g>`;
    });
    svg += `<line x1="${padL}" x2="${W - padR}" y1="${padT + innerH}" y2="${padT + innerH}" class="baseline"/></svg>`;
    return raw(svg);
  }

  function niceMax(v) {
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * p;
  }

  /** Donut — part-to-whole with at most four segments, legend always shown. */
  function donut(segments, opts = {}) {
    const total = segments.reduce((a, s) => a + s.value, 0);
    const size = opts.size || 168, r = size / 2 - 14, c = 2 * Math.PI * r, cx = size / 2;
    let offset = 0;
    let arcs = '';
    segments.forEach((s, k) => {
      if (!s.value) return;
      const len = (s.value / total) * c;
      const gap = segments.filter((x) => x.value).length > 1 ? 2 : 0;
      arcs += `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${s.color || SERIES[k]}" stroke-width="20"
        stroke-dasharray="${Math.max(0, len - gap)} ${c}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cx})"
        class="donut-seg" tabindex="0" data-chart-tip="${esc(`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`)}"/>`;
      offset += len;
    });
    return html`<div class="donut-wrap">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${opts.label || 'Donut chart'}">
        <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" class="donut-track" stroke-width="20"/>
        ${raw(arcs)}
        <text x="50%" y="47%" text-anchor="middle" class="donut-total">${total}</text>
        <text x="50%" y="60%" text-anchor="middle" class="donut-caption">${opts.caption || 'total'}</text>
      </svg>
      <ul class="legend">
        ${segments.map((s, k) => html`<li><span class="swatch" style="background:${raw(s.color || SERIES[k])}"></span><span>${s.label}</span><strong>${s.value}</strong></li>`)}
      </ul>
    </div>`;
  }

  /** Segmented progress bar for status distribution. */
  function stacked(segments, opts = {}) {
    const total = Math.max(1, segments.reduce((a, s) => a + s.value, 0));
    return html`<div class="stacked" role="img" aria-label="${opts.label || 'Distribution'}">
      ${segments.filter((s) => s.value).map((s, k) => html`<span class="stacked-seg" tabindex="0" style="flex:${raw(String(s.value))};background:${raw(s.color || SERIES[k])}" data-chart-tip="${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)"></span>`)}
    </div>`;
  }

  /* Shared tooltip that follows the pointer / focused element. */
  let tip;
  function ensureTip() {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'chart-tooltip';
      tip.setAttribute('role', 'tooltip');
      document.body.appendChild(tip);
    }
    return tip;
  }
  function showTip(target, x, y) {
    const t = ensureTip();
    t.textContent = target.getAttribute('data-chart-tip');
    t.classList.add('show');
    const rect = t.getBoundingClientRect();
    const left = Math.min(window.innerWidth - rect.width - 8, Math.max(8, x - rect.width / 2));
    t.style.left = `${left}px`;
    t.style.top = `${Math.max(8, y - rect.height - 12)}px`;
  }
  function hideTip() { if (tip) tip.classList.remove('show'); }
  document.addEventListener('mousemove', (e) => {
    const t = e.target.closest && e.target.closest('[data-chart-tip]');
    if (t) showTip(t, e.clientX, e.clientY); else hideTip();
  });
  document.addEventListener('focusin', (e) => {
    const t = e.target.closest && e.target.closest('[data-chart-tip]');
    if (t) { const r = t.getBoundingClientRect(); showTip(t, r.left + r.width / 2, r.top); } else hideTip();
  });
  document.addEventListener('scroll', hideTip, true);

  window.CC.charts = { barsH, columns, donut, stacked, SERIES };
})();
