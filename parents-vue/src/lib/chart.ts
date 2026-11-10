// 移植自原始单文件项目 index.html 第 2625-2822 行的 `var CH = (function () { ... })();`，逐行忠实转换，输出 SVG 与原版逐字节一致。
export const C = { s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a', base: '#a3a29b', grid: '#ecebe6', axis: '#cfcec7', ink: '#171717', muted: '#8b8a85', crit: '#d03b3b', surface: '#ffffff' };
export const SEQ = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf'];

function r1(v: number) { return Math.round(v * 10) / 10; }
function attr(s: any) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function estW(t: any, fs: number) { let w = 0; t = String(t); for (let i = 0; i < t.length; i++) w += t.charCodeAt(i) > 255 ? fs : fs * 0.58; return w; }
export function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * p;
}
function colTop(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return '';
  r = Math.min(r, h, w / 2);
  return 'M' + r1(x) + ' ' + r1(y + h) + 'V' + r1(y + r) + 'Q' + r1(x) + ' ' + r1(y) + ' ' + r1(x + r) + ' ' + r1(y) + 'H' + r1(x + w - r) + 'Q' + r1(x + w) + ' ' + r1(y) + ' ' + r1(x + w) + ' ' + r1(y + r) + 'V' + r1(y + h) + 'Z';
}

/* 柱状图：data [{label, value, tip}]；opts {h, max, fmt, ref, refLabel, color} */
export function bars(data: any[], W: number, opts?: any): string {
  opts = opts || {};
  const H = opts.h || 240, ml = 40, mr = 12, mt = 18, mb = 30;
  const iw = W - ml - mr, ih = H - mt - mb;
  const max = opts.max || niceMax(Math.max(...data.map(function (d: any) { return d.value || 0; })) || 1);
  const fmt = opts.fmt || function (v: number) { return String(Math.round(v)); };
  let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img">';
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = max * i / ticks, y = mt + ih - ih * i / ticks;
    s += '<line class="' + (i === 0 ? 'base' : 'grid') + '" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + r1(y) + '" y2="' + r1(y) + '"/>';
    s += '<text class="ax" x="' + (ml - 8) + '" y="' + r1(y + 3.5) + '" text-anchor="end">' + fmt(v) + '</text>';
  }
  const band = iw / data.length, bw = Math.min(24, band * 0.5);
  data.forEach(function (d: any, k: number) {
    const cx = ml + band * k + band / 2, h = ih * Math.min(1, (d.value || 0) / max), y = mt + ih - h;
    s += '<rect x="' + r1(cx - band / 2) + '" y="' + mt + '" width="' + r1(band) + '" height="' + ih + '" fill="transparent" data-tip="' + attr(d.tip || (d.label + '：' + fmt(d.value))) + '"/>';
    s += '<path d="' + colTop(cx - bw / 2, y, bw, h, 4) + '" fill="' + (d.color || opts.color || C.s1) + '" pointer-events="none"/>';
    if (opts.valueLabels !== false) s += '<text class="lab" x="' + r1(cx) + '" y="' + r1(y - 6) + '" text-anchor="middle" pointer-events="none">' + fmt(d.value) + '</text>';
    s += '<text class="ax-cn" x="' + r1(cx) + '" y="' + (H - 9) + '" text-anchor="middle">' + attr(d.label) + '</text>';
  });
  if (opts.ref !== undefined) {
    const ry = mt + ih - ih * opts.ref / max;
    s += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + r1(ry) + '" y2="' + r1(ry) + '" stroke="' + C.crit + '" stroke-width="1" opacity=".7" pointer-events="none"/>';
    s += '<text class="ax-cn" x="' + (ml - 8) + '" y="' + r1(ry + 4) + '" text-anchor="end" style="fill:' + C.crit + ';font-size:10.5px">' + attr(opts.refLabel || '') + '</text>';
  }
  return s + '</svg>';
}

/* 折线图：series [{name, color, values:[v|null], width}], labels [...] */
export function lines(series: any[], labels: any[], W: number, opts?: any): string {
  opts = opts || {};
  const H = opts.h || 240, ml = opts.ml || 40, mr = opts.mr || 18, mt = opts.mt || 16, mb = opts.mb || 30;
  const iw = W - ml - mr, ih = H - mt - mb;
  const all: number[] = []; series.forEach(function (se: any) { se.values.forEach(function (v: any) { if (v !== null && v !== undefined) all.push(v); }); });
  let lo = opts.min !== undefined ? opts.min : Math.min(...all), hi = opts.max !== undefined ? opts.max : Math.max(...all);
  if (!all.length) { lo = 0; hi = 1; }
  if (hi === lo) { hi = lo + 1; }
  const fmt = opts.fmt || function (v: number) { return String(Math.round(v)); };
  const n = labels.length;
  function X(i: number) { return n === 1 ? ml + iw / 2 : ml + iw * i / (n - 1); }
  function Y(v: number) { return mt + ih - ih * (v - lo) / (hi - lo); }
  let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img">';
  const ticks = opts.ticks || 4;
  if (!opts.noAxis) {
    for (let i = 0; i <= ticks; i++) {
      const v = lo + (hi - lo) * i / ticks, y = Y(v);
      s += '<line class="' + (i === 0 ? 'base' : 'grid') + '" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + r1(y) + '" y2="' + r1(y) + '"/>';
      s += '<text class="ax" x="' + (ml - 8) + '" y="' + r1(y + 3.5) + '" text-anchor="end">' + fmt(v) + '</text>';
    }
    labels.forEach(function (lb: any, k: number) {
      const tw = estW(lb, 11.5), x = Math.max(tw / 2 + 2, Math.min(W - tw / 2 - 2, X(k)));
      s += '<text class="ax-cn" x="' + r1(x) + '" y="' + (H - 9) + '" text-anchor="middle">' + attr(lb) + '</text>';
    });
  }
  series.forEach(function (se: any, si: number) {
    let d = '', pen = false;
    se.values.forEach(function (v: any, k: number) {
      if (v === null || v === undefined) { pen = false; return; }
      d += (pen ? 'L' : 'M') + r1(X(k)) + ' ' + r1(Y(v)); pen = true;
    });
    if (se.area) {
      const pts: number[][] = []; se.values.forEach(function (v: any, k: number) { if (v !== null && v !== undefined) pts.push([X(k), Y(v)]); });
      if (pts.length > 1) s += '<path d="M' + r1(pts[0][0]) + ' ' + r1(mt + ih) + pts.map(function (p: number[]) { return 'L' + r1(p[0]) + ' ' + r1(p[1]); }).join('') + 'L' + r1(pts[pts.length - 1][0]) + ' ' + r1(mt + ih) + 'Z" fill="' + se.color + '" opacity=".10"/>';
    }
    s += '<path d="' + d + '" fill="none" stroke="' + se.color + '" stroke-width="' + (se.width || 2) + '" stroke-linecap="round" stroke-linejoin="round"/>';
  });
  series.forEach(function (se: any) {
    se.values.forEach(function (v: any, k: number) {
      if (v === null || v === undefined) return;
      const cx = X(k), cy = Y(v);
      if (!opts.noDots) s += '<circle cx="' + r1(cx) + '" cy="' + r1(cy) + '" r="' + (se.dot || 4.2) + '" fill="' + se.color + '" stroke="#fff" stroke-width="2" pointer-events="none"/>';
    });
  });
  // 悬停区（每个 x 一列）
  if (!opts.noHover) {
    labels.forEach(function (lb: any, k: number) {
      let tip = '<b>' + attr(lb) + '</b>';
      series.forEach(function (se: any) { const v = se.values[k]; if (v !== null && v !== undefined) tip += '<br><span class="tk">' + attr(se.name) + '</span> ' + (opts.tipFmt || fmt)(v); });
      const w = n === 1 ? iw : iw / (n - 1);
      s += '<rect x="' + r1(X(k) - w / 2) + '" y="' + mt + '" width="' + r1(w) + '" height="' + ih + '" fill="transparent" data-tip="' + attr(tip) + '"/>';
    });
  }
  // 末端标签（仅主系列）
  if (opts.endLabel !== false && series.length) {
    const se0 = series[0]; let lastK = -1;
    se0.values.forEach(function (v: any, k: number) { if (v !== null && v !== undefined) lastK = k; });
    if (lastK >= 0) {
      const lv = se0.values[lastK], lx = X(lastK), ly = Y(lv);
      s += '<text class="lab" x="' + r1(lx) + '" y="' + r1(ly - 10) + '" text-anchor="' + (lastK === n - 1 && n > 1 ? 'end' : 'middle') + '" pointer-events="none">' + (opts.tipFmt || fmt)(lv) + '</text>';
    }
  }
  return s + '</svg>';
}

/* 雷达图：axes [name]，series [{name,color,values 0..1}] */
export function radar(axes: any[], series: any[], W: number, opts?: any): string {
  opts = opts || {};
  const H = opts.h || 260, cx = W / 2, cy = H / 2 + 4, R = Math.min(W / 2 - 52, H / 2 - 30);
  const n = axes.length;
  function P(i: number, v: number) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; }
  let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img">';
  [0.2, 0.4, 0.6, 0.8, 1].forEach(function (lv: number) {
    const pts: number[][] = []; for (let i = 0; i < n; i++) pts.push(P(i, lv));
    s += '<polygon points="' + pts.map(function (p: number[]) { return r1(p[0]) + ',' + r1(p[1]); }).join(' ') + '" fill="none" class="grid"/>';
  });
  for (let i = 0; i < n; i++) {
    const p = P(i, 1), q = P(i, 1.16);
    s += '<line class="grid" x1="' + cx + '" y1="' + cy + '" x2="' + r1(p[0]) + '" y2="' + r1(p[1]) + '"/>';
    s += '<text class="ax-cn" x="' + r1(q[0]) + '" y="' + r1(q[1] + 4) + '" text-anchor="middle">' + attr(axes[i]) + '</text>';
  }
  series.forEach(function (se: any) {
    const pts = se.values.map(function (v: any, i: number) { return P(i, Math.max(0, Math.min(1, v || 0))); });
    s += '<polygon points="' + pts.map(function (p: number[]) { return r1(p[0]) + ',' + r1(p[1]); }).join(' ') + '" fill="' + se.color + '" fill-opacity="' + (se.fill === false ? 0 : .10) + '" stroke="' + se.color + '" stroke-width="2" stroke-linejoin="round"/>';
  });
  series.forEach(function (se: any) {
    se.values.forEach(function (v: any, i: number) {
      const p = P(i, Math.max(0, Math.min(1, v || 0)));
      s += '<circle cx="' + r1(p[0]) + '" cy="' + r1(p[1]) + '" r="4" fill="' + se.color + '" stroke="#fff" stroke-width="2" pointer-events="none"/>';
    });
  });
  for (let k = 0; k < n; k++) {
    let tip = '<b>' + attr(axes[k]) + '</b>';
    series.forEach(function (se: any) { tip += '<br><span class="tk">' + attr(se.name) + '</span> ' + Math.round((se.values[k] || 0) * 1000) / 10 + '%'; });
    const pp = P(k, 1);
    s += '<circle cx="' + r1(pp[0]) + '" cy="' + r1(pp[1]) + '" r="' + Math.max(14, R / n) + '" fill="transparent" data-tip="' + attr(tip) + '"/>';
  }
  return s + '</svg>';
}

export function spark(values: any[], W: number, H: number, color?: string): string {
  const v = values.filter(function (x: any) { return x !== null && x !== undefined; });
  if (v.length < 2) return '';
  let lo = Math.min(...v), hi = Math.max(...v); if (hi === lo) { hi += 1; lo -= 1; }
  const n = values.length, pts: number[][] = [];
  values.forEach(function (x: any, i: number) { if (x !== null && x !== undefined) pts.push([4 + (W - 8) * i / (n - 1), 4 + (H - 8) * (1 - (x - lo) / (hi - lo))]); });
  const d = pts.map(function (p: number[], i: number) { return (i ? 'L' : 'M') + r1(p[0]) + ' ' + r1(p[1]); }).join('');
  const last = pts[pts.length - 1];
  return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '"><path d="' + d + '" fill="none" stroke="' + (color || C.base) + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="' + r1(last[0]) + '" cy="' + r1(last[1]) + '" r="3.5" fill="' + (color || C.s1) + '" stroke="#fff" stroke-width="1.5"/></svg>';
}

/* 分组柱状图：cats [类别]，series [{name, color, values}]；用来对比几个班 */
export function groupBars(cats: any[], series: any[], W: number, opts?: any): string {
  opts = opts || {};
  const H = opts.h || 240, ml = 40, mr = 12, mt = 18, mb = 30;
  const iw = W - ml - mr, ih = H - mt - mb;
  const allv: number[] = [1]; series.forEach(function (se: any) { se.values.forEach(function (v: any) { allv.push(v || 0); }); });
  const max = opts.max || niceMax(Math.max(...allv));
  const fmt = opts.fmt || function (v: number) { return String(Math.round(v)); }, tipFmt = opts.tipFmt || fmt;
  let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img">';
  for (let i = 0; i <= 4; i++) {
    const v = max * i / 4, y = mt + ih - ih * i / 4;
    s += '<line class="' + (i === 0 ? 'base' : 'grid') + '" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + r1(y) + '" y2="' + r1(y) + '"/>';
    s += '<text class="ax" x="' + (ml - 8) + '" y="' + r1(y + 3.5) + '" text-anchor="end">' + fmt(v) + '</text>';
  }
  const band = iw / cats.length, ns = series.length, gap = ns > 1 ? 3 : 0;
  const gw = Math.min(band * 0.8, ns * 22 + (ns - 1) * gap), bw = Math.max(3, (gw - (ns - 1) * gap) / ns);
  cats.forEach(function (c: any, k: number) {
    const x0 = ml + band * k + band / 2 - gw / 2;
    const tip = '<b>' + attr(c) + '</b>' + series.map(function (se: any) { return '<br><span class="tk">' + attr(se.name) + '</span> ' + tipFmt(se.values[k] || 0); }).join('');
    s += '<rect x="' + r1(ml + band * k) + '" y="' + mt + '" width="' + r1(band) + '" height="' + ih + '" fill="transparent" data-tip="' + attr(tip) + '"/>';
    series.forEach(function (se: any, j: number) {
      const val = se.values[k] || 0, hh = ih * Math.min(1, val / max), x = x0 + j * (bw + gap), yy = mt + ih - hh;
      s += '<path d="' + colTop(x, yy, bw, hh, 3) + '" fill="' + se.color + '" pointer-events="none"/>';
      if (ns <= 2 && bw >= 16 && opts.valueLabels !== false) s += '<text class="lab" x="' + r1(x + bw / 2) + '" y="' + r1(yy - 5) + '" text-anchor="middle" pointer-events="none" style="font-size:10.5px">' + fmt(val) + '</text>';
    });
    let lb = String(c); const maxW = band - 4; while (lb.length > 1 && estW(lb, 11.5) > maxW) lb = lb.slice(0, -1);
    s += '<text class="ax-cn" x="' + r1(ml + band * k + band / 2) + '" y="' + (H - 9) + '" text-anchor="middle">' + attr(lb === String(c) ? lb : lb + '…') + '</text>';
  });
  if (opts.ref !== undefined) {
    const ry = mt + ih - ih * opts.ref / max;
    s += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + r1(ry) + '" y2="' + r1(ry) + '" stroke="' + C.crit + '" stroke-width="1" opacity=".7" stroke-dasharray="4 3" pointer-events="none"/>';
  }
  return s + '</svg>';
}
