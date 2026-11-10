/* =========================================================
   ART · 成长之家场景与家人角色（纯 SVG 字符串，无依赖）
   本文件由单文件版 index.html 中的 ART IIFE（第 985–1663 行）逐行移植而来，
   只做语法层面的 var → const/let 与类型标注转换；几何、坐标、颜色、
   defs 的渐变/滤镜 id、动画 class 名均保持完全一致（像素级复刻）。
   俯视剖面的家：书房(智) / 客厅(德) / 艺术角(美) / 运动角(体) / 厨房(劳) / 儿童房(成长)
   白色 3D 家具 + 右上方打光的长软阴影 + 黑色扁平角色 + 彩色围巾
   ========================================================= */

export const INK = '#171717';
export const KID_COLORS: string[] = ['#e5483b', '#2f7ff0', '#f2b01e', '#14b0a6', '#7a5af5', '#3ea35c', '#e2569a', '#f08a24'];

function r1(v: number): number { return Math.round(v * 10) / 10; }
function at(o: Record<string, any>): string { let s = ''; for (const k in o) { if (o[k] === undefined || o[k] === null || o[k] === false) continue; s += ' ' + k + '="' + o[k] + '"'; } return s; }
function T(name: string, o: Record<string, any>, inner?: any): string { return '<' + name + at(o) + (inner === undefined ? '/>' : '>' + inner + '</' + name + '>'); }
function ext(o: Record<string, any>, e?: Record<string, any> | null): Record<string, any> { if (e) for (const k in e) o[k] = e[k]; return o; }
function rect(x: number, y: number, w: number, h: number, rx?: any, fill?: any, e?: any): string { const o: Record<string, any> = { x: r1(x), y: r1(y), width: r1(Math.max(0, w)), height: r1(Math.max(0, h)) }; if (rx) o.rx = rx; if (fill) o.fill = fill; return T('rect', ext(o, e)); }
function circ(cx: number, cy: number, r: number, fill?: any, e?: any): string { const o: Record<string, any> = { cx: r1(cx), cy: r1(cy), r: r }; if (fill) o.fill = fill; return T('circle', ext(o, e)); }
function ell(cx: number, cy: number, rx: number, ry: number, fill?: any, e?: any): string { const o: Record<string, any> = { cx: r1(cx), cy: r1(cy), rx: rx, ry: ry }; if (fill) o.fill = fill; return T('ellipse', ext(o, e)); }
function path(d: string, fill?: any, e?: any): string { const o: Record<string, any> = { d: d }; if (fill) o.fill = fill; return T('path', ext(o, e)); }
function line(x1: number, y1: number, x2: number, y2: number, stroke?: any, w?: any, e?: any): string { return T('line', ext({ x1: r1(x1), y1: r1(y1), x2: r1(x2), y2: r1(y2), stroke: stroke, 'stroke-width': w || 1 }, e)); }
function poly(pts: number[][], fill?: any, e?: any): string { const o: Record<string, any> = { points: pts.map(function (p: number[]) { return r1(p[0]) + ',' + r1(p[1]); }).join(' ') }; if (fill) o.fill = fill; return T('polygon', ext(o, e)); }
function txt(x: number, y: number, s: any, e?: any): string { return T('text', ext({ x: r1(x), y: r1(y) }, e), s); }
function escx(s: any): string { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
export function hash(str: string): number { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed: number): () => number { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function kidColor(i: number): string { return KID_COLORS[((i % KID_COLORS.length) + KID_COLORS.length) % KID_COLORS.length]; }
function clip(s: any, n: number): string { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

/* ---------- 户型 ---------- */
export const W = 1640, H = 958, WT = 14;
const AF0 = 150, AF1 = 470, BW0 = 466, BF0 = 596, BF1 = 944;
const X0 = 14, X1 = 520, X2 = 1120, X3 = 1626;
export const ROOMS: Record<string, any> = {
  study: { x: X0, y: AF0, w: X1 - X0, h: AF1 - AF0, wy: 0, name: '书房', dim: 'zhi', spot: [318, 352] },
  living: { x: X1, y: AF0, w: X2 - X1, h: AF1 - AF0, wy: 0, name: '客厅', dim: 'de', spot: [690, 356] },
  art: { x: X2, y: AF0, w: X3 - X2, h: AF1 - AF0, wy: 0, name: '艺术角', dim: 'mei', spot: [1346, 356] },
  sport: { x: X0, y: BF0, w: X1 - X0, h: BF1 - BF0, wy: BW0, name: '运动角', dim: 'ti', spot: [238, 872] },
  kitchen: { x: X1, y: BF0, w: X2 - X1, h: BF1 - BF0, wy: BW0, name: '厨房', dim: 'lao', spot: [612, 742] },
  bedroom: { x: X2, y: BF0, w: X3 - X2, h: BF1 - BF0, wy: BW0, name: '儿童房', dim: 'grow', spot: [1298, 856] }
};
const WALLC: Record<string, string> = { study: '#eef2f8', living: '#f7f4ef', art: '#f4f1f9', sport: '#eef5f0', kitchen: '#f8f5ec', bedroom: '#fbf1ed' };
const FLOOR: Record<string, string> = { study: 'url(#pWood)', living: 'url(#pWood)', art: 'url(#pWoodA)', sport: 'url(#pDeck)', kitchen: 'url(#pTile)', bedroom: 'url(#pCarpet)' };

function defs(): string {
  return '<defs>' +
    '<filter id="hBlur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>' +
    '<filter id="hBlurS" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>' +
    '<filter id="hBlurL" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="26"/></filter>' +
    '<linearGradient id="gTop" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f4f4f3"/></linearGradient>' +
    '<linearGradient id="gFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ebebea"/><stop offset="1" stop-color="#dcdcda"/></linearGradient>' +
    '<linearGradient id="gWallShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".05"/></linearGradient>' +
    '<linearGradient id="gFloorAO" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="gScreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b9bff"/><stop offset="1" stop-color="#2a6fe0"/></linearGradient>' +
    '<linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcdcfb"/><stop offset="1" stop-color="#eaf4fe"/></linearGradient>' +
    '<linearGradient id="gSkyDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6b48a"/><stop offset="1" stop-color="#fde6c8"/></linearGradient>' +
    '<linearGradient id="gSkyNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2748"/><stop offset="1" stop-color="#3a4f7f"/></linearGradient>' +
    '<linearGradient id="gGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9e9fb"/><stop offset="1" stop-color="#eef5fd"/></linearGradient>' +
    '<linearGradient id="gCork" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9d2a9"/><stop offset="1" stop-color="#dfc392"/></linearGradient>' +
    '<linearGradient id="gSofa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9ecf1"/><stop offset="1" stop-color="#dde2ea"/></linearGradient>' +
    '<linearGradient id="gFridge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eeeeed"/></linearGradient>' +
    '<radialGradient id="gGlow"><stop offset="0" stop-color="#ffd98a" stop-opacity=".9"/><stop offset=".45" stop-color="#ffcf72" stop-opacity=".35"/><stop offset="1" stop-color="#ffcf72" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="gGround" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
    '<pattern id="pWood" width="180" height="48" patternUnits="userSpaceOnUse"><rect width="180" height="48" fill="#f3ece2"/><path d="M0 23.5H180M0 47.5H180" stroke="#e8ddcd"/><path d="M70.5 0V24M160.5 0V24M30.5 24V48M120.5 24V48" stroke="#ebe1d3"/></pattern>' +
    '<pattern id="pWoodA" width="160" height="40" patternUnits="userSpaceOnUse"><rect width="160" height="40" fill="#f5f0e9"/><path d="M0 19.5H160M0 39.5H160" stroke="#ebe3d7"/><path d="M50.5 0V20M140.5 0V20M100.5 20V40" stroke="#ede6db"/></pattern>' +
    '<pattern id="pTile" width="52" height="52" patternUnits="userSpaceOnUse"><rect width="52" height="52" fill="#f3f3f0"/><path d="M51.5 0V52M0 51.5H52" stroke="#e2e2de"/></pattern>' +
    '<pattern id="pDeck" width="40" height="220" patternUnits="userSpaceOnUse"><rect width="40" height="220" fill="#ebf1ea"/><path d="M39.5 0V220" stroke="#dbe5d9"/><path d="M0 140.5H40" stroke="#dfe8dd"/></pattern>' +
    '<pattern id="pCarpet" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#f8f0ec"/><circle cx="11" cy="11" r="1.2" fill="#efdfd8"/></pattern>' +
    '<pattern id="pPeg" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#efe2cc"/><circle cx="7" cy="7" r="1.6" fill="#d8c5a4"/></pattern>' +
    '<pattern id="pBack" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#f9f3ec"/><path d="M0 23.5H24M23.5 0V24" stroke="#f0e6da"/></pattern>' +
    '</defs>';
}

/* ---------- 阴影 ---------- */
function drop(x: number, y: number, w: number, h: number, d?: any, op?: any): string {
  d = d || 34;
  return poly([[x + w, y + h * 0.15], [x + w, y + h], [x, y + h], [x - d, y + h + d * 0.85], [x + w - d, y + h + d * 0.85], [x + w - d * 0.4, y + h * 0.5]], '#000', { 'fill-opacity': op || '.13' });
}
function dropC(cx: number, cy: number, r: number, d?: any, op?: any): string { return ell(cx - (d || 16) * 0.6, cy + (d || 16) * 0.55, r * 1.04, r * 0.9, '#000', { 'fill-opacity': op || '.12' }); }
function wallShadow(x: number, y: number, w: number, h: number): string { return rect(x - 2, y + 4, w + 3, h + 2, 3, '#000', { 'fill-opacity': '.10', filter: 'url(#hBlurS)' }); }

/* ---------- 通用家具 ---------- */
function box(x: number, y: number, w: number, d: number, f: number, top?: any, face?: any, stroke?: any): string {
  // 俯视的家具：顶面 + 正面一条
  return rect(x + 0.5, y + d - 2, w - 1, f + 2, 2, face || 'url(#gFace)') + rect(x, y, w, d, 4, top || 'url(#gTop)', { stroke: stroke || '#e2e2df', 'stroke-width': .8 });
}
function plant(cx: number, cy: number, r: number, pot?: any): string {
  return circ(cx, cy, r * 0.6, pot || '#efe9df', { stroke: '#ddd4c5', 'stroke-width': 1 }) +
    ell(cx - r * 0.38, cy - r * 0.2, r * 0.58, r * 0.32, '#5fb276', { transform: 'rotate(-30 ' + r1(cx - r * 0.38) + ' ' + r1(cy - r * 0.2) + ')' }) +
    ell(cx + r * 0.4, cy - r * 0.1, r * 0.58, r * 0.3, '#3f9a5e', { transform: 'rotate(25 ' + r1(cx + r * 0.4) + ' ' + r1(cy - r * 0.1) + ')' }) +
    ell(cx, cy + r * 0.4, r * 0.52, r * 0.28, '#7cc48a', { transform: 'rotate(80 ' + r1(cx) + ' ' + r1(cy + r * 0.4) + ')' }) +
    ell(cx + r * 0.05, cy - r * 0.48, r * 0.44, r * 0.26, '#8fd09c', { transform: 'rotate(-80 ' + r1(cx + r * 0.05) + ' ' + r1(cy - r * 0.48) + ')' }) +
    ell(cx - r * 0.5, cy + r * 0.25, r * 0.42, r * 0.24, '#4fa968', { transform: 'rotate(40 ' + r1(cx - r * 0.5) + ' ' + r1(cy + r * 0.25) + ')' }) +
    circ(cx, cy, r * 0.14, '#2f7d4c');
}
function lampTop(cx: number, cy: number, r: number): string { return circ(cx, cy, r, '#fff7e0', { stroke: '#e7dcbc', 'stroke-width': 1.2 }) + circ(cx, cy, r * 0.42, '#ffe7a3'); }
function bookSpines(x: number, y: number, w: number, h: number, seed: number): string {
  const R = rng(seed); let s = '', cx = x + 4; const cols = ['#e5483b', '#2f7ff0', '#f2b01e', '#14b0a6', '#7a5af5', '#ebe9e4', '#dbe7f6', '#f2dada', '#dfeee1', '#3ea35c', '#f6ecc9'];
  while (cx < x + w - 10) {
    const bw = 6 + Math.floor(R() * 7), bh = h * (0.7 + R() * 0.28), c = cols[Math.floor(R() * cols.length)];
    if (R() < 0.08) { s += rect(cx, y + h - bh * 0.9, bh * 0.9, bw, 1, c, { transform: 'rotate(-8 ' + r1(cx) + ' ' + r1(y + h) + ')', opacity: .9 }); cx += bh * 0.6; continue; }
    s += rect(cx, y + h - bh, bw, bh, 1, c, { opacity: R() < 0.35 ? .95 : .7 });
    if (bw > 9) s += rect(cx + 2, y + h - bh + 4, bw - 4, 2, .5, '#fff', { opacity: .55 });
    cx += bw + (R() < 0.15 ? 5 : 1);
  }
  return s;
}
function frame(x: number, y: number, w: number, h: number, inner: string, fc?: any): string {
  return wallShadow(x, y, w, h) + rect(x, y, w, h, 2, fc || '#ffffff', { stroke: '#dedad3', 'stroke-width': .8 }) + rect(x + 5, y + 5, w - 10, h - 10, 1, '#fbfaf7') + inner;
}
function windowEl(x: number, y: number, w: number, h: number, tod: any, curtain: any): string {
  const sky = tod === 'night' ? 'url(#gSkyNight)' : tod === 'dusk' ? 'url(#gSkyDusk)' : 'url(#gSky)'; let s = '';
  s += wallShadow(x, y, w, h) + rect(x, y, w, h, 3, '#ffffff', { stroke: '#dedcd7', 'stroke-width': .8 }) + rect(x + 6, y + 6, w - 12, h - 12, 2, sky);
  if (tod === 'night') {
    s += circ(x + w * 0.7, y + h * 0.32, 7, '#fff6d6') + circ(x + w * 0.7 + 3, y + h * 0.32 - 2, 6, '#2a3a63');
    [[0.2, 0.3], [0.38, 0.55], [0.55, 0.22], [0.25, 0.7], [0.82, 0.68]].forEach(function (p: number[]) { s += circ(x + w * p[0], y + h * p[1], 1.2, '#fff', { opacity: .85 }); });
  } else {
    s += circ(x + w * 0.74, y + h * 0.3, 7, tod === 'dusk' ? '#ffd17a' : '#fff4c4', { opacity: .95 });
    s += ell(x + w * 0.3, y + h * 0.42, 13, 5, '#fff', { opacity: .9 }) + ell(x + w * 0.38, y + h * 0.38, 9, 5, '#fff', { opacity: .9 });
    s += path('M' + r1(x + 6) + ' ' + r1(y + h - 6) + ' q' + r1(w * 0.22) + ' -14 ' + r1(w * 0.45) + ' -4 t' + r1(w * 0.55 - 12) + ' -6 V' + r1(y + h - 6) + ' Z', '#bfe0c5', { opacity: .9 });
  }
  s += rect(x + w / 2 - 1.5, y + 6, 3, h - 12, 0, '#ffffff') + rect(x + 6, y + h / 2 - 1.5, w - 12, 3, 0, '#ffffff');
  if (curtain) {
    s += path('M' + (x - 8) + ' ' + (y - 6) + 'h' + (w * 0.26) + 'q-6 ' + (h * 0.5) + ' 4 ' + (h + 10) + 'h-' + (w * 0.26 + 4) + 'z', curtain, { opacity: .92 });
    s += path('M' + (x + w + 8) + ' ' + (y - 6) + 'h-' + (w * 0.26) + 'q6 ' + (h * 0.5) + ' -4 ' + (h + 10) + 'h' + (w * 0.26 + 4) + 'z', curtain, { opacity: .92 });
    s += rect(x - 14, y - 10, w + 28, 4, 2, '#cfc7bb');
  }
  return s;
}
function clockEl(cx: number, cy: number, r: number): string {
  let c = circ(cx + 2, cy + 4, r, '#000', { 'fill-opacity': '.08', filter: 'url(#hBlurS)' });
  c += circ(cx, cy, r, '#fff', { stroke: '#dadad8', 'stroke-width': 2.5 });
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, k = i % 3 === 0; c += line(cx + Math.sin(a) * (r - 5), cy - Math.cos(a) * (r - 5), cx + Math.sin(a) * (r - (k ? 9 : 7)), cy - Math.cos(a) * (r - (k ? 9 : 7)), '#9a9a98', k ? 1.6 : 1); }
  c += '<g class="clock" data-cx="' + r1(cx) + '" data-cy="' + r1(cy) + '">' + line(cx, cy, cx, cy - r * 0.42, INK, 2.4, { 'class': 'clock-h', 'stroke-linecap': 'round' }) + line(cx, cy, cx, cy - r * 0.64, INK, 1.6, { 'class': 'clock-m', 'stroke-linecap': 'round' }) + circ(cx, cy, 2, '#e5483b') + '</g>';
  return c;
}
function wallBand(id: string, x: number, y: number, w: number, h: number, isB?: boolean): string {
  let s = '';
  if (isB) {
    s += rect(x, y, w, 10, 0, '#fbfbfa') + rect(x, y + 9.5, w, 1, 0, '#e2e2df');
    s += rect(x, y + 10, w, h - 10, 0, WALLC[id]) + rect(x, y + 10, w, h - 10, 0, 'url(#gWallShade)');
  } else {
    s += rect(x, y, w, h, 0, WALLC[id]) + rect(x, y, w, h, 0, 'url(#gWallShade)') + rect(x, y, w, 7, 0, '#ffffff') + rect(x, y + 7, w, 1, 0, '#e8e8e5');
  }
  s += rect(x, y + h - 10, w, 10, 0, '#ebe7e0') + rect(x, y + h - 10, w, 1, 0, '#dcd7ce');
  return s;
}
function doorway(x: number, y: number, w: number, h: number): string {
  // 墙上的门洞：门框 + 看进去的另一侧地板
  return rect(x - 4, y, w + 8, h, 3, '#ffffff', { stroke: '#dedad3', 'stroke-width': .8 }) + rect(x, y + 4, w, h - 4, 2, '#e7e1d6') +
    rect(x, y + 4, w, (h - 4) * 0.55, 2, '#000', { 'fill-opacity': '.05' }) + rect(x, y + h - 10, w, 10, 0, '#efe8dc');
}

/* ---------- 角色：孩子（正面站立，原点 = 脚底中心） ---------- */
const STAGE_SCALE: Record<string, number> = { k: 1.0, p1: 1.12, p2: 1.22, m: 1.32, h: 1.4 };
function hairBack(g: boolean, v: number, color: string): string {
  let s = '';
  if (g) {
    if (v === 0) s += ell(-17, 9, 6.2, 10, INK, { transform: 'rotate(28 -17 9)' }) + ell(17, 9, 6.2, 10, INK, { transform: 'rotate(-28 17 9)' }) + circ(-14.5, 1.5, 2.6, color) + circ(14.5, 1.5, 2.6, color);
    else if (v === 1) s += path('M-19 -2 C-21 10 -19 18 -13 20 L13 20 C19 18 21 10 19 -2 Z', INK);
    else s += circ(0, -18, 8.5, INK) + rect(-6, -12.5, 12, 3.2, 1.6, color);
  } else s += circ(-16.5, 2, 4.4, INK) + circ(16.5, 2, 4.4, INK);
  return s;
}
function hairFront(g: boolean, v: number, color: string): string {
  if (g) {
    if (v === 0) return path('M-2 -21 C 2 -26 9 -25 10 -19 C 6 -21 3 -20 -2 -21 Z', INK);
    if (v === 1) return path('M-17 -4 C -15 -18 15 -18 17 -4 C 9 -12 -9 -12 -17 -4 Z', INK) + rect(8, -13, 7, 3.2, 1.6, color, { transform: 'rotate(-30 11 -11)' });
    return '';
  }
  if (v === 0) return path('M-7 -14 L-5 -23 L-1 -16 L3 -25 L5 -15 L10 -21 L9 -12 Z', INK);
  if (v === 1) return path('M-12 -12 C -10 -24 6 -27 14 -18 C 8 -19 2 -18 -2 -14 Z', INK);
  return path('M-3 -16 C -2 -24 5 -26 8 -22 C 4 -21 2 -19 2 -15 Z', INK);
}
function face17(happy: boolean): string {
  let s = ell(-6.6, -0.5, 4.3, 5.1, '#fff') + ell(6.6, -0.5, 4.3, 5.1, '#fff') + '<g class="pupil">' + circ(-5.8, 0.4, 2.3, INK) + circ(7.4, 0.4, 2.3, INK) + '</g>' +
    ell(-11, 7, 3, 1.7, '#ff8f86', { opacity: '.55' }) + ell(11, 7, 3, 1.7, '#ff8f86', { opacity: '.55' });
  if (happy) s += path('M-3.5 8.5 Q0 11.5 3.5 8.5', 'none', { stroke: '#fff', 'stroke-width': 1.4, 'stroke-linecap': 'round' });
  return s;
}
function kidHead(k: any, color: string): string {
  const g = k.gender === 'F', v = hash(k.id || k.name) % 3;
  return hairBack(g, v, color) + circ(0, 0, 17, INK) + hairFront(g, v, color) + '<g class="face">' + face17(true) + '</g>';
}
function kidBody(k: any, color: string): string {
  const g = k.gender === 'F'; let s = '';
  s += rect(-8.5, -26, 7.5, 25, 3.7, INK) + rect(1, -26, 7.5, 25, 3.7, INK);
  s += ell(-5.2, -1.6, 6.2, 3.1, '#ffffff', { stroke: '#cfcfcc', 'stroke-width': .8 }) + ell(5.2, -1.6, 6.2, 3.1, '#ffffff', { stroke: '#cfcfcc', 'stroke-width': .8 });
  s += '<g class="arm-l">' + path('M-12 -45 C-18 -38 -19 -32 -18 -26', 'none', { stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }) + '</g>';
  s += '<g class="arm-r">' + path('M12 -45 C18 -38 19 -32 18 -26', 'none', { stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round' }) + '</g>';
  s += g ? path('M-14 -22 C-15 -40 -10 -52 0 -52 C10 -52 15 -40 14 -22 L18 -16 L-18 -16 Z', INK) : path('M-15 -22 C-16 -42 -10 -52 0 -52 C10 -52 16 -42 15 -22 Z', INK);
  s += path('M-11 -52 Q0 -46 11 -52 L12 -46.5 Q0 -40 -12 -46.5 Z', color) + path('M5 -45 L10 -34 L5 -33 L2 -44 Z', color);
  return s;
}
export function kidFigure(k: any, color?: string): string {
  return '<g class="body">' + kidBody(k, color as string) + '</g><g class="head" transform="translate(0,-68)">' + kidHead(k, color as string) + '</g>';
}
/* 头像（正面半身，用在卡片里） */
export function avatar(k: any, size: number, opts?: any): string {
  opts = opts || {};
  const color = opts.color || kidColor(k.color || 0); let s = '';
  s += path('M-26 58 C-27 32 -16 18 0 18 C16 18 27 32 26 58 Z', INK);
  s += path('M-14 16 Q0 24 14 16 L15 23 Q0 31 -15 23 Z', color) + path('M-5 25 L-10 39 L-3 40 L1 27 Z', color);
  s += kidHead(k, color);
  const bg = opts.bg === false ? '' : circ(0, 8, 46, opts.bg || '#f3f3f2');
  return '<svg class="ava" viewBox="-46 -38 92 92" width="' + size + '" height="' + size + '" aria-hidden="true">' + bg + '<g transform="translate(0,6)">' + s + '</g></svg>';
}

/* ---------- 角色：家长（正面站立，原点 = 脚底中心） ---------- */
function adultHead(p: any): string {
  const f = p.gender === 'F', old = !!p.old; let s = '';
  if (f) { s += circ(3, -27, 11, INK); }
  else s += circ(-22.5, 3, 5.5, INK) + circ(22.5, 3, 5.5, INK);
  s += circ(0, 0, 23, INK);
  if (f) {
    s += path('M-20 -10 C -14 -22 6 -26 18 -14', 'none', { stroke: '#3b3b3a', 'stroke-width': 1.4, 'stroke-linecap': 'round' });
    s += rect(-5, -24, 16, 4.4, 2.2, p.color || '#ef5b4c', { transform: 'rotate(-5 3 -22)' });
  } else s += path('M-18 -12 C -16 -30 12 -36 24 -16 C 22 -22 12 -22 6 -20 C 2 -27 -10 -24 -18 -12 Z', INK);
  if (old) s += path('M-21 -6 C -19 -16 -12 -20 -6 -21 M21 -6 C 19 -16 12 -20 6 -21', 'none', { stroke: '#cfcfcc', 'stroke-width': 2.2, 'stroke-linecap': 'round' });
  s += ell(-8.5, 1, 4.6, 5.4, '#fff') + ell(8.5, 1, 4.6, 5.4, '#fff') + '<g class="pupil">' + circ(-8, 2.4, 2.5, INK) + circ(9, 2.4, 2.5, INK) + '</g>';
  s += ell(-14, 10, 3.4, 2, '#ff8f86', { opacity: '.5' }) + ell(14, 10, 3.4, 2, '#ff8f86', { opacity: '.5' });
  if (!f || old) s += rect(-16, -6, 15, 13, 4, 'none', { stroke: '#fff', 'stroke-width': 1.7 }) + rect(1, -6, 15, 13, 4, 'none', { stroke: '#fff', 'stroke-width': 1.7 }) + path('M-1 -1 L1 -1', 'none', { stroke: '#fff', 'stroke-width': 1.7 });
  s += path('M-4 13 Q0 16 4 13', 'none', { stroke: '#fff', 'stroke-width': 1.5, 'stroke-linecap': 'round' });
  return s;
}
export function adultFigure(p: any): string {
  const f = p.gender === 'F', c = p.color || (f ? '#ef5b4c' : '#2f7ff0'); let s = '';
  s += rect(-12, -42, 10, 41, 5, INK) + rect(2, -42, 10, 41, 5, INK);
  s += ell(-7, -1.8, 8.2, 3.6, '#ffffff', { stroke: '#cfcfcc', 'stroke-width': .8 }) + ell(7, -1.8, 8.2, 3.6, '#ffffff', { stroke: '#cfcfcc', 'stroke-width': .8 });
  s += '<g class="arm-l">' + path('M-18 -72 C-26 -60 -27 -50 -26 -40', 'none', { stroke: INK, 'stroke-width': 8.5, 'stroke-linecap': 'round' }) + '</g>';
  s += '<g class="arm-r">' + path('M18 -72 C26 -60 27 -50 26 -40', 'none', { stroke: INK, 'stroke-width': 8.5, 'stroke-linecap': 'round' }) + '</g>';
  s += f ? path('M-20 -36 C-22 -66 -14 -84 0 -84 C14 -84 22 -66 20 -36 L25 -26 L-25 -26 Z', INK) : path('M-21 -38 C-23 -68 -14 -84 0 -84 C14 -84 23 -68 21 -38 Z', INK);
  s += path('M-13 -84 Q0 -77 13 -84 L14 -77 Q0 -68 -14 -77 Z', c) + path('M5 -77 L12 -61 L5 -59 L1 -75 Z', c);
  return '<g class="body">' + s + '</g><g class="head" transform="translate(0,-106)">' + adultHead(p) + '</g>';
}
export function adultAvatar(p: any, size: number, bg?: any): string {
  const f = p.gender === 'F', c = p.color || (f ? '#ef5b4c' : '#2f7ff0'); let s = '';
  s += path('M-44 92 C-46 52 -30 26 0 26 C30 26 46 52 44 92 Z', INK);
  s += path('M-14 24 Q0 33 14 24 L16 32 Q0 42 -16 32 Z', c) + path('M5 33 L13 50 L5 52 L1 35 Z', c);
  s += adultHead(p);
  return '<svg class="ava" viewBox="-60 -50 120 120" width="' + size + '" height="' + size + '" aria-hidden="true">' + (bg === false ? '' : circ(0, 10, 60, bg || '#f3f3f2')) + '<g transform="translate(0,4)">' + s + '</g></svg>';
}
function cat(cx: number, cy: number): string {
  return '<g class="cat" transform="translate(' + cx + ',' + cy + ')">' + ell(-6, 8, 22, 8, '#000', { 'fill-opacity': '.12', filter: 'url(#hBlurS)' }) +
    path('M14 4 C 26 4 28 -8 20 -10', 'none', { stroke: INK, 'stroke-width': 4.5, 'stroke-linecap': 'round', 'class': 'cat-tail' }) +
    ell(0, 0, 17, 11, INK) + circ(-14, -4, 8.5, INK) + poly([[-21, -8], [-20, -17], [-14, -11]], INK) + poly([[-12, -11], [-7, -17], [-7, -7]], INK) +
    path('M-18.5 -4 q1.6 1.6 3.2 0 M-12.5 -4 q1.6 1.6 3.2 0', 'none', { stroke: '#fff', 'stroke-width': 1.2, 'stroke-linecap': 'round' }) +
    path('M-19 1.5 Q-14 4.5 -9 1.5 L-8.5 4 Q-14 8 -19.5 4 Z', '#f2b01e') +
    '<g class="zz">' + txt(-6, -14, 'z', { 'font-size': 10, 'font-weight': 700, fill: '#a3a3a0' }) + txt(1, -22, 'z', { 'font-size': 7, 'font-weight': 700, fill: '#bdbdb9' }) + '</g></g>';
}

/* ---------- 各房间 · 墙面（数据会写在墙上） ---------- */
function studyWall(d: any): string {
  const r = ROOMS.study, x = r.x; let s = wallBand('study', x, 0, r.w, AF0);
  // 书架
  s += wallShadow(32, 14, 164, 136) + rect(32, 14, 164, 136, 3, '#ffffff', { stroke: '#e0ddd6', 'stroke-width': .8 });
  [16, 48, 80, 112].forEach(function (yy: number, i: number) { s += rect(38, yy + 4, 152, 28, 0, '#f6f3ee') + bookSpines(38, yy + 4, 152, 28, 31 + i * 7) + rect(36, yy + 31, 156, 3, 1, '#e3ded5'); });
  s += circ(176, 26, 6, '#f6d37a', { stroke: '#d9ad3c', 'stroke-width': 1 });
  // 学习计划软木板（今天的学习安排）
  const bx = 214, by = 20, bw = 198, bh = 108, cork = d.cork || { lines: [] };
  s += '<g class="wall-act" data-sact="go-study">' + wallShadow(bx, by, bw, bh) + rect(bx, by, bw, bh, 4, '#cfb38a') + rect(bx + 5, by + 5, bw - 10, bh - 10, 2, 'url(#gCork)');
  s += circ(bx + 18, by + 13, 3.2, '#e5483b') + circ(bx + bw - 18, by + 13, 3.2, '#2f7ff0');
  s += txt(bx + 28, by + 25, escx(cork.title || '今日学习'), { 'font-size': 12.5, 'font-weight': 700, fill: '#5a4426' });
  if (cork.prog) s += txt(bx + bw - 14, by + 25, escx(cork.prog), { 'font-size': 11, fill: '#7a6240', 'text-anchor': 'end' });
  const notes = ['#fff6b8', '#ffe1e1', '#d9f0ff', '#dff5dd'];
  if (!cork.lines.length) s += txt(bx + bw / 2, by + 66, escx(cork.empty || '还没有学习计划'), { 'font-size': 11.5, fill: '#7a6240', 'text-anchor': 'middle' });
  cork.lines.slice(0, 4).forEach(function (ln: any, i: number) {
    const nx = bx + 12 + (i % 2) * 90, ny = by + 34 + Math.floor(i / 2) * 34, rot = (i % 2 ? 2 : -2);
    s += '<g transform="rotate(' + rot + ' ' + (nx + 40) + ' ' + (ny + 14) + ')">' + rect(nx + 1, ny + 2, 82, 28, 1, '#000', { 'fill-opacity': '.08' }) + rect(nx, ny, 82, 28, 1, notes[i % 4]) +
      txt(nx + 6, ny + 12, escx(clip(ln.t, 8)), { 'font-size': 10.5, 'font-weight': 600, fill: '#3a3226', opacity: ln.done ? .45 : 1 }) +
      txt(nx + 6, ny + 24, escx(ln.sub || ''), { 'font-size': 9.5, fill: '#7a6a52' }) + (ln.done ? path('M' + (nx + 66) + ' ' + (ny + 15) + 'l4 4 l8 -9', 'none', { stroke: '#1d9a57', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }) : '') + '</g>';
  });
  s += '</g>';
  s += clockEl(462, 62, 27);
  s += rect(436, 104, 52, 30, 2, '#fff', { stroke: '#e0ddd6', 'stroke-width': .8 }) + txt(462, 123, escx(d.wkLabel || ''), { 'font-size': 10.5, 'font-weight': 700, fill: '#5c5c5a', 'text-anchor': 'middle' });
  return s;
}
function livingWall(d: any): string {
  const r = ROOMS.living; let s = wallBand('living', r.x, 0, r.w, AF0); const sc = d.screen || {};
  // 全家福
  s += frame(548, 26, 66, 52, rect(553, 31, 56, 42, 1, '#e9f1fb') + circ(570, 50, 7, INK) + circ(590, 48, 8, INK) + circ(580, 58, 5, INK) + path('M553 73 h56 v-8 q-28 -10 -56 0 z', '#cfe3c8'));
  s += frame(560, 86, 44, 42, rect(565, 91, 34, 32, 1, '#fdf0e6') + circ(582, 104, 7, INK) + path('M571 123 q11 -12 22 0 z', INK) + path('M575 110 q7 4 14 0 l1 3 q-8 5 -16 0 z', '#e5483b'));
  // 家庭日程屏
  const sx = 636, sy = 14, sw = 360, sh = 118;
  s += '<g class="wall-act" data-sact="go-cal">' + rect(sx - 4, sy + 6, sw + 8, sh + 4, 6, '#000', { 'fill-opacity': '.12', filter: 'url(#hBlurS)' }) + rect(sx, sy, sw, sh, 6, '#141414') + rect(sx + 5, sy + 5, sw - 10, sh - 10, 3, 'url(#gScreen)') + rect(sx + 5, sy + 5, sw - 10, (sh - 10) * 0.42, 3, '#fff', { opacity: '.06' });
  s += '<g font-family="inherit" fill="#fff">' + txt(sx + 18, sy + 26, escx(sc.title || '今天'), { 'font-size': 12.5, 'font-weight': 700 }) + txt(sx + 210, sy + 26, escx(sc.sub || ''), { 'font-size': 10.5, opacity: '.75', 'text-anchor': 'end' });
  const items = (sc.items || []).slice(0, 4);
  if (!items.length) s += txt(sx + 18, sy + 58, escx(sc.empty || '今天没有安排，一起玩点什么吧'), { 'font-size': 11.5, opacity: '.8' });
  items.forEach(function (it: any, i: number) {
    const yy = sy + 47 + i * 18;
    s += txt(sx + 18, yy, escx(it.time || '全天'), { 'font-size': 10.5, opacity: it.st === 'past' ? .45 : .75, 'font-family': 'var(--num)' });
    s += circ(sx + 62, yy - 3.5, 3.2, it.color || '#fff', { opacity: it.st === 'past' ? .5 : 1 });
    s += txt(sx + 71, yy, escx(clip(it.t, 10)) + (it.st === 'past' || it.done ? ' ✓' : ''), { 'font-size': 11.5, 'font-weight': it.st === 'now' ? 700 : 500, opacity: it.st === 'past' ? .5 : 1, fill: it.st === 'now' ? '#ffe08a' : '#fff' });
  });
  s += line(sx + 226, sy + 18, sx + 226, sy + sh - 18, '#fff', 1, { opacity: .25 });
  const cx2 = sx + 293;
  s += txt(cx2, sy + 36, escx(sc.countLabel || ''), { 'font-size': 11, opacity: '.85', 'text-anchor': 'middle' });
  s += txt(cx2, sy + 80, escx(sc.countNum === undefined || sc.countNum === null ? '—' : String(sc.countNum)), { 'font-size': 38, 'font-weight': 700, 'text-anchor': 'middle', 'letter-spacing': '-1', 'class': 'scr-num' });
  s += txt(cx2, sy + 100, escx(sc.countUnit || ''), { 'font-size': 10.5, opacity: '.75', 'text-anchor': 'middle' });
  s += '</g></g>';
  s += rect(sx + sw / 2 - 30, sy + sh, 60, 6, 2, '#d3d4d6');
  // 好习惯星星榜（本周的「德」打卡）
  const st = d.stars || { got: 0, total: 0 }, kx = 1016, ky = 24, kw = 88, kh = 104;
  s += '<g class="wall-act" data-sact="go-wuyu-de">' + wallShadow(kx, ky, kw, kh) + rect(kx, ky, kw, kh, 6, '#ffffff', { stroke: '#e3e3e1', 'stroke-width': .8 }) + rect(kx, ky, kw, 4, 2, '#e5483b');
  s += txt(kx + kw / 2, ky + 22, '好习惯', { 'font-size': 12, 'font-weight': 700, fill: '#2a2a29', 'text-anchor': 'middle' });
  const tot = Math.min(12, Math.max(st.total, 6));
  for (let i = 0; i < tot; i++) {
    const col = i % 4, row = Math.floor(i / 4), cx = kx + 16 + col * 19, cy = ky + 38 + row * 19, on = i < st.got;
    s += path(starPath(cx, cy, 7, 3.2), on ? '#f2b01e' : '#ecebe8');
  }
  s += txt(kx + kw / 2, ky + kh - 8, '本周 ' + st.got + ' 颗', { 'font-size': 10, fill: '#8b8a85', 'text-anchor': 'middle' });
  s += '</g>';
  return s;
}
export function starPath(cx: number, cy: number, R: number, r: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; d += (i ? 'L' : 'M') + r1(cx + Math.cos(a) * rr) + ' ' + r1(cy + Math.sin(a) * rr); }
  return d + 'Z';
}
function artWall(d: any): string {
  const r = ROOMS.art; let s = wallBand('art', r.x, 0, r.w, AF0);
  s += path('M1136 12 Q1250 30 1360 14 Q1440 26 1508 12', 'none', { stroke: '#d6cfc4', 'stroke-width': 1 });
  ['#e5483b', '#f2b01e', '#2f7ff0', '#14b0a6', '#7a5af5', '#e2569a', '#3ea35c', '#f08a24', '#e5483b', '#2f7ff0', '#f2b01e'].forEach(function (c: string, i: number) {
    const x = 1146 + i * 33, y = 16 + Math.sin(i * 1.3) * 4 + (i % 2 ? 3 : 0); s += poly([[x, y], [x + 14, y], [x + 7, y + 13]], c, { opacity: .85 });
  });
  s += '<g class="wall-act" data-sact="go-journal">';
  s += frame(1144, 38, 96, 74, rect(1149, 43, 86, 64, 1, '#eef6ff') + circ(1214, 58, 9, '#f2b01e') + path('M1160 100 l16 -22 l14 16 l10 -10 l18 16 z', '#5fb276') + rect(1166, 74, 22, 18, 1, '#e5483b') + poly([[1163, 76], [1177, 64], [1191, 76]], '#b8423a'));
  s += frame(1252, 30, 62, 48, rect(1257, 35, 52, 38, 1, '#fff8ef') + path('M1262 70 a22 22 0 0 1 42 0', 'none', { stroke: '#e5483b', 'stroke-width': 3 }) + path('M1266 70 a18 18 0 0 1 34 0', 'none', { stroke: '#f2b01e', 'stroke-width': 3 }) + path('M1270 70 a14 14 0 0 1 26 0', 'none', { stroke: '#2f7ff0', 'stroke-width': 3 }));
  s += frame(1252, 86, 62, 44, rect(1257, 91, 52, 34, 1, '#f6fbf2') + circ(1283, 103, 6, '#e2569a') + circ(1276, 108, 5, '#e2569a') + circ(1290, 108, 5, '#e2569a') + circ(1283, 107, 3, '#f2b01e') + line(1283, 112, 1283, 124, '#3ea35c', 2));
  s += frame(1328, 36, 92, 88, rect(1333, 41, 82, 78, 1, '#fdf6f0') + circ(1358, 72, 9, INK) + circ(1388, 70, 10, INK) + circ(1374, 92, 6.5, INK) + path('M1346 116 q12 -26 24 0 z M1376 116 q12 -28 26 0 z', INK) + path('M1366 112 q8 -14 16 0 z', INK) + path('M1348 82 q10 5 20 0', 'none', { stroke: '#e5483b', 'stroke-width': 3 }));
  s += frame(1434, 50, 66, 56, rect(1439, 55, 56, 46, 1, '#e9f7fb') + ell(1464, 78, 16, 9, '#f08a24') + poly([[1478, 78], [1490, 70], [1490, 86]], '#f08a24') + circ(1458, 76, 1.8, INK) + circ(1446, 66, 3, '#fff', { stroke: '#9cc6ec' }) + circ(1452, 60, 2, '#fff', { stroke: '#9cc6ec' }));
  s += '</g>';
  const wk = d.works || 0;
  s += rect(1344, 128, 76, 16, 8, '#ffffff', { stroke: '#e3e0da', 'stroke-width': .8 }) + txt(1382, 139.5, '作品墙 · ' + wk + ' 件', { 'font-size': 9.5, fill: '#8b8a85', 'text-anchor': 'middle' });
  s += windowEl(1522, 28, 86, 96, d.tod, null);
  return s;
}
function sportWall(d: any): string {
  const r = ROOMS.sport; let s = wallBand('sport', r.x, BW0, r.w, BF0 - BW0, true);
  // 奖牌墙：完成的技能挑战挂在这里
  const px = 34, py = 488, pw = 268, ph = 96, md = d.medals || [];
  s += '<g class="wall-act" data-sact="go-skills">' + wallShadow(px, py, pw, ph) + rect(px, py, pw, ph, 4, 'url(#pPeg)', { stroke: '#dcc9a8', 'stroke-width': 1 });
  s += rect(px + pw / 2 - 40, py - 6, 80, 16, 8, '#ffffff', { stroke: '#e0d6c4', 'stroke-width': .8 }) + txt(px + pw / 2, py + 5.5, '奖牌墙', { 'font-size': 10, 'font-weight': 700, fill: '#7a6240', 'text-anchor': 'middle' });
  if (!md.length) s += txt(px + pw / 2, py + 56, '完成一个技能挑战，奖牌挂这里', { 'font-size': 11, fill: '#8b7556', 'text-anchor': 'middle' });
  md.slice(0, 5).forEach(function (m: any, i: number) {
    const mx = px + 32 + i * 51, my = py + 18;
    s += poly([[mx - 9, my], [mx - 2, my], [mx + 2, my + 28], [mx - 5, my + 28]], m.c1 || '#2f7ff0') + poly([[mx + 9, my], [mx + 2, my], [mx - 2, my + 28], [mx + 5, my + 28]], m.c2 || '#e5483b');
    s += circ(mx + 1, my + 40, 13, '#000', { 'fill-opacity': '.1', filter: 'url(#hBlurS)' }) + circ(mx, my + 38, 12.5, '#f6d37a', { stroke: '#d9ad3c', 'stroke-width': 1.4 }) + path(starPath(mx, my + 38, 6.5, 3), '#e9b93c');
    s += txt(mx, my + 66, escx(clip(m.t, 4)), { 'font-size': 9.5, 'font-weight': 600, fill: '#6b5638', 'text-anchor': 'middle' });
  });
  s += '</g>';
  // 跳绳
  s += circ(334, 494, 3, '#bdbab4') + path('M334 496 C 316 520 318 556 326 574 M334 496 C 352 522 350 556 342 574', 'none', { stroke: '#e2569a', 'stroke-width': 2.4 }) + rect(321, 572, 9, 18, 4, '#7a5af5') + rect(339, 572, 9, 18, 4, '#7a5af5');
  s += doorway(410, 486, 76, 110);
  return s;
}
function kitchenWall(d: any): string {
  const r = ROOMS.kitchen; let s = wallBand('kitchen', r.x, BW0, r.w, BF0 - BW0, true);
  s += rect(534, 532, 336, 54, 0, 'url(#pBack)');
  s += wallShadow(534, 480, 150, 44) + rect(534, 480, 150, 44, 3, '#ffffff', { stroke: '#e0ddd6', 'stroke-width': .8 }) + line(609, 482, 609, 522, '#e6e3dc', 1) + rect(596, 496, 8, 2.4, 1, '#cfcbc3') + rect(614, 496, 8, 2.4, 1, '#cfcbc3');
  s += poly([[702, 480], [788, 480], [804, 524], [686, 524]], '#f2f2f1', { stroke: '#dedcd7', 'stroke-width': .8 }) + rect(686, 522, 118, 6, 2, '#e3e2df');
  s += wallShadow(818, 480, 52, 44) + rect(818, 480, 52, 44, 3, '#ffffff', { stroke: '#e0ddd6', 'stroke-width': .8 });
  s += rect(560, 544, 18, 26, 2, '#ffffff', { stroke: '#e0ddd6' }) + rect(584, 548, 14, 22, 2, '#ffffff', { stroke: '#e0ddd6' }) + circ(569, 552, 3, '#e5483b') + circ(591, 556, 3, '#3ea35c');
  // 冰箱 + 冰箱贴（今天的家务）
  const fx = 884, fy = 476, fw = 132, fh = 120, fr = d.fridge || { lines: [] };
  s += '<g class="wall-act" data-sact="go-wuyu-lao">' + rect(fx - 4, fy + 6, fw + 6, fh, 6, '#000', { 'fill-opacity': '.10', filter: 'url(#hBlurS)' }) + rect(fx, fy, fw, fh + 2, 6, 'url(#gFridge)', { stroke: '#dcdcd9', 'stroke-width': 1 });
  s += line(fx + 4, fy + 34, fx + fw - 4, fy + 34, '#dededb', 1.2) + rect(fx + fw - 12, fy + 10, 4, 18, 2, '#cfcfcc') + rect(fx + fw - 12, fy + 44, 4, 26, 2, '#cfcfcc');
  s += txt(fx + 10, fy + 24, escx(fr.title || '今日家务'), { 'font-size': 11, 'font-weight': 700, fill: '#5c5c5a' });
  if (fr.prog) s += txt(fx + fw - 22, fy + 24, escx(fr.prog), { 'font-size': 10, fill: '#9a9a97', 'text-anchor': 'end' });
  const pc = ['#fff3a8', '#ffd9e0', '#cfeafe'];
  if (!fr.lines.length) s += txt(fx + fw / 2 - 6, fy + 72, escx(fr.empty || '今天休息'), { 'font-size': 10.5, fill: '#9a9a97', 'text-anchor': 'middle' });
  fr.lines.slice(0, 3).forEach(function (ln: any, i: number) {
    const ny = fy + 40 + i * 25, nx = fx + 8 + (i % 2) * 4;
    s += rect(nx, ny, fw - 34, 21, 1.5, pc[i % 3], { transform: 'rotate(' + (i % 2 ? 1.5 : -1.5) + ' ' + (nx + 50) + ' ' + (ny + 10) + ')' }) + circ(nx + 8, ny + 2, 3, ['#e5483b', '#2f7ff0', '#3ea35c'][i % 3]);
    s += txt(nx + 16, ny + 14.5, escx(clip(ln.t, 7)), { 'font-size': 10.5, 'font-weight': 600, fill: '#3a3226', opacity: ln.done ? .45 : 1 });
    if (ln.done) s += path('M' + (nx + fw - 52) + ' ' + (ny + 10) + 'l3.5 3.5 l7 -8', 'none', { stroke: '#1d9a57', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  });
  s += '</g>';
  s += doorway(1036, 486, 70, 110);
  return s;
}
function bedroomWall(d: any): string {
  const r = ROOMS.bedroom; let s = wallBand('bedroom', r.x, BW0, r.w, BF0 - BW0, true);
  s += doorway(1136, 486, 70, 110);
  // 身高尺：孩子每次量的身高都画一道
  const rx = 1246, top = 478, bot = 586, ru = d.ruler || { marks: [] }, lo = ru.lo || 60, hi = ru.hi || 180;
  function yOf(h: number): number { return bot - (h - lo) / (hi - lo) * (bot - top); }
  s += '<g class="wall-act" data-sact="add-growth">' + wallShadow(rx, top, 30, bot - top) + rect(rx, top, 30, bot - top, 3, '#fff8e8', { stroke: '#ecd9ae', 'stroke-width': 1 });
  for (let h = Math.ceil(lo / 10) * 10; h <= hi; h += 10) { const yy = yOf(h); s += line(rx, yy, rx + 12, yy, '#d7b46a', 1.1) + txt(rx + 28, yy + 3, String(h), { 'font-size': 8, fill: '#b08d47', 'text-anchor': 'end', 'font-family': 'var(--num)' }); }
  for (let h5 = Math.ceil(lo / 5) * 5; h5 <= hi; h5 += 10) s += line(rx, yOf(h5), rx + 6, yOf(h5), '#e3c98f', 1);
  s += circ(rx + 15, top - 2, 7, '#f2b01e') + circ(rx + 11, top - 4, 1.4, INK) + circ(rx + 19, top - 4, 1.4, INK);
  (ru.marks || []).slice(-4).forEach(function (m: any) {
    const yy = yOf(m.h);
    s += line(rx - 10, yy, rx + 30, yy, m.cur ? m.color : '#c9c5bd', m.cur ? 2.4 : 1.4, { 'stroke-linecap': 'round' });
    if (!m.cur) s += txt(rx - 13, yy + 3, escx(m.label), { 'font-size': 8.5, fill: '#a3a09a', 'text-anchor': 'end' });
  });
  const cm = (ru.marks || []).filter(function (m: any) { return m.cur; })[0];
  if (cm) { const cy2 = yOf(cm.h); s += rect(rx + 36, cy2 - 10, 58, 20, 10, cm.color) + txt(rx + 65, cy2 + 4, escx(cm.label), { 'font-size': 10.5, 'font-weight': 700, fill: '#fff', 'text-anchor': 'middle' }) + poly([[rx + 36, cy2 - 4], [rx + 30, cy2], [rx + 36, cy2 + 4]], cm.color); }
  else s += txt(rx + 40, bot - 40, '点这里量身高', { 'font-size': 10, fill: '#a3a09a' });
  s += '</g>';
  s += windowEl(1352, 494, 104, 82, d.tod, '#f6d9cf');
  for (let i = 0; i < 6; i++) s += path(starPath(1336 + i * 27 + (i % 2) * 6, 482 + (i % 2) * 4, 3.6, 1.6), ['#f2b01e', '#e2569a', '#2f7ff0'][i % 3], { opacity: .8 });
  s += wallShadow(1496, 478, 116, 118) + rect(1496, 478, 116, 120, 4, '#ffffff', { stroke: '#e0ddd6', 'stroke-width': .8 }) + line(1554, 482, 1554, 594, '#e8e5df', 1.2) + circ(1548, 536, 2.6, '#cfcbc3') + circ(1560, 536, 2.6, '#cfcbc3');
  return s;
}

/* ---------- 各房间 · 地面家具 ---------- */
function studyFloor(d: any, sh: string[]): string {
  let s = '';
  sh.push(drop(220, 152, 200, 70, 40) + dropC(118, 354, 46, 18) + dropC(448, 300, 22, 14) + dropC(316, 250, 22, 14));
  s += circ(118, 364, 86, '#e6eef8', { opacity: .9 }) + circ(118, 364, 74, 'none', { stroke: '#d6e3f3', 'stroke-width': 1.2, 'stroke-dasharray': '3 5' });
  s += box(220, 152, 200, 62, 10);
  s += rect(240, 166, 20, 20, 4, '#ffffff', { stroke: '#d8d8d5' }) + rect(243, 160, 3, 12, 1, '#e5483b') + rect(249, 158, 3, 14, 1, '#2f7ff0') + rect(254, 161, 3, 11, 1, '#f2b01e');
  s += '<g transform="rotate(-6 312 186)">' + rect(284, 170, 58, 34, 2, '#fff', { stroke: '#d8d8d5', 'stroke-width': .8 }) + line(313, 171, 313, 203, '#d6d6d3', .8) + path('M290 180h18M290 186h18M290 192h14M318 180h18M318 186h16', 'none', { stroke: '#cfcfcc', 'stroke-width': .9 }) + '</g>';
  s += rect(352, 176, 26, 30, 1.5, '#dbe7f6', { stroke: '#9fbde3', 'stroke-width': .8 }) + rect(355, 172, 26, 30, 1.5, '#f6ecc9', { stroke: '#e2c66e', 'stroke-width': .8 });
  s += lampTop(402, 176, 13);
  s += circ(316, 250, 21, '#f0f0ef', { stroke: '#deded9', 'stroke-width': .9 }) + rect(296, 262, 40, 10, 5, '#e6e6e3');
  s += ell(110, 350, 40, 32, '#dbe7f6', { stroke: '#b9cfec', 'stroke-width': 1 }) + ell(104, 343, 18, 12, '#fff', { opacity: .55 });
  s += lampTop(58, 270, 15);
  s += rect(160, 404, 30, 22, 1.5, '#f2dada', { stroke: '#dfa9a9', 'stroke-width': .8, transform: 'rotate(10 175 415)' }) + rect(166, 398, 30, 22, 1.5, '#dfeee1', { stroke: '#a8cdb0', 'stroke-width': .8, transform: 'rotate(-4 181 409)' });
  s += circ(448, 300, 20, '#cfe3f7', { stroke: '#8fb7e6', 'stroke-width': 1.2 }) + path('M432 292 q8 -6 16 0 q8 6 16 0 M434 306 q7 5 14 0 q7 -5 14 0', 'none', { stroke: '#5fb276', 'stroke-width': 3, 'stroke-linecap': 'round' }) + ell(448, 300, 20, 7, 'none', { stroke: '#8fb7e6', 'stroke-width': .8 });
  s += plant(470, 430, 22);
  return s;
}
function livingFloor(d: any, sh: string[]): string {
  let s = '';
  sh.push(drop(676, 152, 280, 30, 30) + drop(740, 266, 164, 64, 26) + drop(640, 380, 380, 76, 44) + drop(552, 250, 72, 72, 26) + dropC(1076, 410, 18, 16));
  s += rect(684, 152, 266, 26, 4, 'url(#gTop)', { stroke: '#e2e2df', 'stroke-width': .8 }) + rect(696, 158, 54, 12, 3, '#e6e7ea') + circ(918, 165, 6, '#e1e2e5');
  s += rect(616, 214, 410, 214, 30, '#f4ede3', { stroke: '#e6dccb', 'stroke-width': 1 }) + rect(630, 228, 382, 186, 22, 'none', { stroke: '#e6dccb', 'stroke-width': 1, 'stroke-dasharray': '4 6' });
  s += rect(740, 266, 164, 64, 14, 'url(#gTop)', { stroke: '#e0e0dd', 'stroke-width': .9 });
  s += circ(866, 296, 15, '#fff', { stroke: '#e0dcd5', 'stroke-width': 1 }) + circ(861, 292, 5, '#e5483b') + circ(871, 294, 5, '#f2b01e') + circ(865, 301, 5, '#3ea35c');
  s += rect(806, 284, 34, 26, 2, '#dbe7f6', { stroke: '#9fbde3', 'stroke-width': .8, transform: 'rotate(-8 823 297)' });
  if (d.gift) {
    const gc = d.gift.color || '#e2569a';
    s += '<g class="wall-act gift" data-sact="go-people" id="waGift">' + rect(746, 182, 160, 122, 10, 'transparent') + rect(752, 274, 30, 26, 3, gc) + rect(764, 274, 6, 26, 0, '#fff', { opacity: .9 }) + rect(752, 284, 30, 6, 0, '#fff', { opacity: .9 }) + path('M767 274 q-10 -10 -12 0 M767 274 q10 -10 12 0', 'none', { stroke: '#fff', 'stroke-width': 2 });
    s += path('M774 272 C 780 246 768 226 780 210', 'none', { stroke: '#bdbab4', 'stroke-width': 1 }) + ell(782, 200, 12, 14, gc, { opacity: .92 }) + ell(778, 195, 3.5, 5, '#fff', { opacity: .5 });
    s += rect(798, 186, 104, 34, 9, '#ffffff', { stroke: '#f0c8d8', 'stroke-width': 1 }) + txt(808, 200, escx(clip(d.gift.name, 5)) + ' 的生日', { 'font-size': 10.5, 'font-weight': 700, fill: '#2a2a29' }) + txt(808, 214, escx(d.gift.when), { 'font-size': 9.5, fill: '#c0396f' }) + '</g>';
  }
  s += rect(640, 380, 380, 70, 16, 'url(#gSofa)', { stroke: '#d6dbe3', 'stroke-width': 1 }) + rect(640, 432, 380, 22, 10, '#d5dbe4');
  [652, 776, 900].forEach(function (x: number) { s += rect(x, 390, 112, 40, 9, '#eef1f5', { stroke: '#dce1e8', 'stroke-width': .8 }); });
  s += rect(640, 384, 18, 64, 8, '#d5dbe4') + rect(1002, 384, 18, 64, 8, '#d5dbe4');
  s += rect(668, 392, 30, 22, 6, d.accent || '#f2b01e', { transform: 'rotate(-10 683 403)', opacity: .9 }) + rect(960, 392, 30, 22, 6, '#e5483b', { transform: 'rotate(10 975 403)', opacity: .85 });
  s += rect(552, 250, 72, 72, 16, 'url(#gSofa)', { stroke: '#d6dbe3', 'stroke-width': 1 }) + rect(552, 250, 16, 72, 8, '#d5dbe4') + rect(572, 262, 42, 48, 9, '#eef1f5');
  s += lampTop(1076, 408, 17) + plant(1076, 200, 28);
  s += plant(552, 430, 20);
  return s;
}
function artFloor(d: any, sh: string[]): string {
  let s = '';
  sh.push(drop(1146, 152, 176, 48, 36) + drop(1188, 222, 96, 26, 20) + dropC(1508, 386, 22, 14));
  s += circ(1384, 370, 82, '#f3eefa') + circ(1384, 370, 68, 'none', { stroke: '#e3d9f2', 'stroke-width': 8 }) + circ(1384, 370, 52, 'none', { stroke: '#f6e3ec', 'stroke-width': 8 }) + circ(1384, 370, 36, 'none', { stroke: '#e5f1fb', 'stroke-width': 8 });
  s += rect(1146, 152, 176, 44, 4, '#2b2b2b') + rect(1146, 152, 176, 8, 3, '#3a3a3a') + rect(1150, 194, 168, 18, 2, '#ffffff', { stroke: '#cfcfcc', 'stroke-width': .8 });
  for (let i = 0; i < 24; i++) s += line(1150 + i * 7, 194, 1150 + i * 7, 212, '#d6d6d3', .6);
  [1, 2, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16, 18, 19, 20, 22].forEach(function (k: number) { s += rect(1150 + k * 7 - 2, 194, 4, 11, .8, '#222'); });
  s += rect(1162, 168, 26, 18, 1.5, '#fff', { opacity: .9 }) + path('M1166 174h18M1166 179h14', 'none', { stroke: '#bbb', 'stroke-width': .8 });
  s += rect(1188, 222, 96, 26, 8, '#3a3a3a') + rect(1192, 226, 88, 18, 6, '#4a4a4a');
  // 画架（侧面）
  const ex = 1468, ey = 368;
  s += ell(ex - 14, ey + 6, 38, 8, '#000', { 'fill-opacity': '.1', filter: 'url(#hBlurS)' });
  s += line(ex - 26, ey, ex - 4, ey - 120, '#c9a46c', 4, { 'stroke-linecap': 'round' }) + line(ex + 22, ey, ex + 2, ey - 120, '#c9a46c', 4, { 'stroke-linecap': 'round' }) + line(ex, ey - 2, ex - 1, ey - 112, '#b8925a', 3.5, { 'stroke-linecap': 'round' });
  s += rect(ex - 38, ey - 64, 74, 8, 2, '#c9a46c');
  s += rect(ex - 36, ey - 128, 70, 62, 2, '#ffffff', { stroke: '#dcd6cc', 'stroke-width': 1 }) + circ(ex - 14, ey - 108, 8, '#f2b01e') + path('M' + (ex - 32) + ' ' + (ey - 72) + ' q16 -26 30 -8 q12 -18 32 4 v4 h-62z', '#7cc48a') + path('M' + (ex + 4) + ' ' + (ey - 112) + ' q8 -6 16 0', 'none', { stroke: '#2f7ff0', 'stroke-width': 2, 'stroke-linecap': 'round' });
  s += '<g transform="rotate(-18 1508 386)">' + ell(1508, 386, 24, 17, '#f4e6cf', { stroke: '#dcc9a8', 'stroke-width': 1 }) + circ(1496, 380, 4, '#e5483b') + circ(1506, 376, 4, '#2f7ff0') + circ(1517, 380, 4, '#f2b01e') + circ(1520, 391, 4, '#3ea35c') + circ(1500, 392, 4.5, '#f4e6cf', { stroke: '#dcc9a8' }) + '</g>';
  s += rect(1540, 300, 16, 16, 3, '#cfe3f7', { stroke: '#8fb7e6' }) + rect(1560, 306, 16, 16, 3, '#f6d9cf', { stroke: '#e3b6b0' }) + line(1546, 296, 1552, 278, '#c9a46c', 2.4) + line(1566, 304, 1572, 286, '#e5483b', 2.4);
  s += plant(1590, 196, 22) + plant(1592, 432, 24);
  return s;
}
function bike(cx: number, gy: number, color: string, tw: boolean): string {
  // 儿童自行车（侧面）；还没学会就带辅助轮
  const r = 26, x1 = cx - 40, x2 = cx + 40, wy = gy - r; let s = '';
  s += ell(cx - 14, gy + 3, 70, 8, '#000', { 'fill-opacity': '.12', filter: 'url(#hBlurS)' });
  [x1, x2].forEach(function (x: number) { s += circ(x, wy, r, 'none', { stroke: '#2a2a29', 'stroke-width': 5 }) + circ(x, wy, r - 6, 'none', { stroke: '#d6d6d3', 'stroke-width': 1 }) + circ(x, wy, 3.5, '#9a9a97'); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; s += line(x, wy, x + Math.cos(a) * (r - 3), wy + Math.sin(a) * (r - 3), '#cfcfcc', .8); } });
  s += path('M' + x1 + ' ' + wy + ' L' + (cx - 6) + ' ' + wy + ' L' + (cx + 18) + ' ' + (wy - 32) + ' L' + (cx - 18) + ' ' + (wy - 32) + ' Z', 'none', { stroke: color, 'stroke-width': 5, 'stroke-linejoin': 'round' });
  s += line(cx + 18, wy - 32, x2, wy, color, 5, { 'stroke-linecap': 'round' }) + line(cx - 18, wy - 32, cx - 22, wy - 42, color, 4.5) + rect(cx - 34, wy - 47, 26, 7, 3.5, '#2a2a29');
  s += line(cx + 18, wy - 32, cx + 22, wy - 50, '#9a9a97', 4) + path('M' + (cx + 12) + ' ' + (wy - 52) + ' h18', 'none', { stroke: '#2a2a29', 'stroke-width': 5, 'stroke-linecap': 'round' });
  s += circ(cx - 6, wy, 6, '#9a9a97') + line(cx - 6, wy, cx - 2, wy + 10, '#2a2a29', 3) + rect(cx - 8, wy + 8, 12, 4, 2, '#2a2a29');
  if (tw) s += line(x1, wy, x1 - 6, gy - 8, '#9a9a97', 2.4) + circ(x1 - 6, gy - 8, 8, '#fff', { stroke: '#2a2a29', 'stroke-width': 3 });
  s += rect(x1 - 2, wy - 34, 30, 6, 3, '#ffffff', { stroke: '#d6d6d3', 'stroke-width': .8, transform: 'rotate(-12 ' + x1 + ' ' + (wy - 30) + ')' });
  return s;
}
function sportFloor(d: any, sh: string[]): string {
  let s = '';
  s += rect(48, 640, 168, 260, 12, '#cfe7dc', { stroke: '#b4d6c6', 'stroke-width': 1 }) + rect(58, 650, 148, 240, 8, 'none', { stroke: '#e2f2ea', 'stroke-width': 1.5 });
  const b = d.bike || {};
  s += '<g class="wall-act" data-sact="go-skills" id="waBike">' + rect(278, 662, 152, 176, 12, 'transparent') + bike(348, 800, d.accent || '#2f7ff0', !b.done) +
    '<g transform="translate(408,820)">' + ell(0, 0, 16, 12, d.accent || '#2f7ff0') + ell(-3, -3, 8, 5, '#fff', { opacity: .45 }) + rect(-14, 6, 28, 4, 2, '#2a2a29') + '</g>';
  if (b.label) s += rect(298, 668, 112, 26, 13, '#ffffff', { stroke: '#d9e7f9', 'stroke-width': 1 }) + txt(312, 685.5, escx(b.label), { 'font-size': 11, 'font-weight': 700, fill: '#1f63c7' }) + rect(372, 678, 30, 6, 3, '#e7eefb') + rect(372, 678, 30 * Math.min(1, b.rate || 0), 6, 3, '#2f7ff0');
  s += '</g>';
  sh.push(dropC(300, 908, 18, 12));
  s += circ(300, 906, 18, '#f08a24', { stroke: '#c96a24', 'stroke-width': 1.2 }) + path('M282 906h36M300 888v36M287 893q13 13 0 26M313 893q-13 13 0 26', 'none', { stroke: '#a85618', 'stroke-width': 1.1 });
  s += circ(450, 900, 13, '#ffffff', { stroke: '#cfcfcc', 'stroke-width': 1 }) + path('M450 894 l5 3.6 l-1.9 5.9 h-6.2 l-1.9 -5.9 z', '#2a2a29');
  s += rect(240, 640, 24, 10, 5, '#9a9ea2') + rect(238, 636, 6, 18, 3, '#6b6f73') + rect(260, 636, 6, 18, 3, '#6b6f73');
  s += ell(140, 920, 22, 9, '#ffffff', { stroke: '#cfcfcc' }) + ell(170, 920, 22, 9, '#ffffff', { stroke: '#cfcfcc' }) + rect(122, 914, 14, 4, 2, d.accent || '#2f7ff0') + rect(152, 914, 14, 4, 2, d.accent || '#2f7ff0');
  s += plant(478, 636, 22) + plant(478, 904, 20);
  return s;
}
function kitchenFloor(d: any, sh: string[]): string {
  let s = '';
  sh.push(drop(530, 598, 350, 58, 34) + drop(646, 738, 230, 92, 40));
  s += box(530, 598, 350, 52, 10);
  s += ell(596, 622, 30, 16, '#e9eef3', { stroke: '#c8d0d8', 'stroke-width': 1.2 }) + circ(596, 610, 3, '#c8d0d8');
  s += rect(700, 604, 92, 40, 4, '#2b2b2b') + [[722, 616], [770, 616], [722, 634], [770, 634]].map(function (p: number[]) { return circ(p[0], p[1], 8, 'none', { stroke: '#5a5a5a', 'stroke-width': 2 }); }).join('');
  s += circ(722, 616, 13, '#d8dde3', { stroke: '#b8c0c9', 'stroke-width': 1.2 }) + circ(722, 616, 9, '#f2b01e', { opacity: .6 });
  s += rect(816, 606, 44, 32, 4, '#efd9b4', { stroke: '#d8bd8e', 'stroke-width': .8 }) + circ(830, 618, 5, '#3ea35c') + circ(844, 626, 5, '#e5483b') + ell(836, 632, 6, 3, '#f2b01e');
  s += rect(548, 668, 34, 26, 4, '#ffffff', { stroke: '#d6d6d3' }) + rect(552, 672, 26, 4, 2, '#e3e3df');
  [['#2f7ff0', 1046], ['#3ea35c', 1066], ['#e5483b', 1086], ['#8b9099', 1106]].forEach(function (b: any[]) { s += rect(b[1] - 9, 634, 17, 22, 3, b[0], { opacity: .85 }) + rect(b[1] - 9, 634, 17, 5, 2, '#fff', { opacity: .4 }); });
  s += txt(1076, 670, '垃圾分类', { 'font-size': 9.5, fill: '#a3a3a0', 'text-anchor': 'middle' });
  // 餐桌
  [[668, 712], [800, 712], [668, 836], [800, 836]].forEach(function (p: number[]) { s += rect(p[0], p[1], 44, 26, 8, '#f0f0ef', { stroke: '#deded9', 'stroke-width': .9 }); });
  s += rect(646, 738, 230, 92, 10, 'url(#gTop)', { stroke: '#e0e0dd', 'stroke-width': .9 });
  [[690, 762], [822, 762], [690, 806], [822, 806]].forEach(function (p: number[]) { s += circ(p[0], p[1], 12, '#fff', { stroke: '#e0dcd5', 'stroke-width': 1 }) + circ(p[0], p[1], 7, '#f6f3ee'); });
  s += circ(758, 784, 14, '#fff', { stroke: '#e0dcd5' }) + circ(754, 780, 4.5, '#f08a24') + circ(762, 786, 4.5, '#e5483b') + circ(756, 790, 4, '#3ea35c');
  s += line(1080, 760, 1092, 900, '#c9a46c', 3.2, { 'stroke-linecap': 'round' }) + path('M1082 900 l18 -2 l5 20 l-24 3 z', '#e8d6a8', { stroke: '#d6bf86', 'stroke-width': .8 });
  s += rect(1036, 880, 30, 30, 4, '#cfe3f7', { stroke: '#a9c9ec' });
  s += plant(546, 918, 18);
  return s;
}
function bedroomFloor(d: any, sh: string[]): string {
  let s = ''; const kc = d.accent || '#e2569a', young = d.young !== false;
  sh.push(drop(1450, 604, 160, 236, 44) + drop(1400, 610, 42, 44, 18) + drop(1150, 880, 86, 50, 22));
  s += circ(1298, 790, 92, '#fbe7e2', { opacity: .9 }) + circ(1298, 790, 78, 'none', { stroke: '#f6d6ce', 'stroke-width': 1.2, 'stroke-dasharray': '3 6' });
  for (let i = 0; i < 5; i++) { const a = i * 1.256 - 1.5; s += path(starPath(1298 + Math.cos(a) * 50, 790 + Math.sin(a) * 50, 6, 2.6), '#f6d6ce'); }
  s += rect(1450, 604, 160, 236, 12, '#ffffff', { stroke: '#e0dcd6', 'stroke-width': 1 }) + rect(1450, 604, 160, 18, 8, '#e9e2da');
  s += rect(1468, 628, 124, 40, 12, '#f7f5f2', { stroke: '#e6e1da' });
  s += rect(1456, 680, 148, 152, 12, kc, { opacity: .82 }) + rect(1456, 680, 148, 22, 10, '#ffffff', { opacity: .55 });
  for (let j = 0; j < 4; j++) s += circ(1486 + j * 30, 740 + (j % 2) * 30, 5, '#fff', { opacity: .4 });
  s += '<g transform="translate(1530,650)">' + circ(-9, -9, 6, '#c79a6a') + circ(9, -9, 6, '#c79a6a') + circ(0, 0, 12, '#d4a776') + circ(0, 18, 14, '#d4a776') + circ(-4, -2, 1.6, INK) + circ(4, -2, 1.6, INK) + ell(0, 3, 3, 2, '#8a5a3c') + '</g>';
  s += box(1400, 610, 42, 40, 8) + lampTop(1421, 628, 11);
  s += box(1150, 880, 86, 42, 10, '#f6ecc9', null, '#e6d394') + rect(1158, 884, 70, 6, 3, '#fff', { opacity: .6 });
  if (young) {
    s += rect(1254, 770, 18, 18, 3, '#e5483b', { transform: 'rotate(12 1263 779)' }) + rect(1276, 790, 18, 18, 3, '#2f7ff0') + rect(1262, 796, 18, 18, 3, '#f2b01e', { transform: 'rotate(-8 1271 805)' });
    s += circ(1336, 760, 10, '#7a5af5', { opacity: .85 }) + path('M1328 760h16', 'none', { stroke: '#fff', 'stroke-width': 1.5, opacity: .7 });
  } else {
    s += rect(1258, 770, 46, 30, 3, '#ffffff', { stroke: '#d8d8d5', transform: 'rotate(-8 1281 785)' }) + path('M1316 782 a16 16 0 0 1 32 0', 'none', { stroke: '#2a2a29', 'stroke-width': 5, 'stroke-linecap': 'round' }) + rect(1310, 780, 10, 14, 4, '#2a2a29') + rect(1344, 780, 10, 14, 4, '#2a2a29');
  }
  s += plant(1156, 640, 20);
  return s;
}

/* ---------- 墙体 ---------- */
function walls(tod: string): string {
  let s = '';
  function vwall(x: number, y1: number, y2: number, g1?: any, g2?: any): string {
    let o = '';
    if (g1) { o += rect(x - 6, y1, 12, g1 - y1, 0, '#fcfcfb') + rect(x - 6, g2, 12, y2 - g2, 0, '#fcfcfb'); o += line(x - 6, y1, x - 6, g1, '#e2e2e0') + line(x + 6, y1, x + 6, g1, '#e2e2e0') + line(x - 6, g2, x - 6, y2, '#e2e2e0') + line(x + 6, g2, x + 6, y2, '#e2e2e0'); o += rect(x - 6, g1 - 3, 12, 3, 0, '#e8e8e5') + rect(x - 6, g2, 12, 3, 0, '#e8e8e5'); }
    return o;
  }
  s += vwall(X1, AF0, AF1, 312, 404) + vwall(X2, AF0, AF1, 312, 404) + vwall(X1, BF0, BF1, 760, 856) + vwall(X2, BF0, BF1, 760, 856);
  s += rect(0, 0, WT, H, 0, '#fcfcfb') + line(WT, 0, WT, H - WT, '#e2e2e0');
  s += rect(W - WT, 0, WT, H, 0, '#fcfcfb') + line(W - WT, 0, W - WT, H - WT, '#e2e2e0');
  s += rect(0, H - WT, W, WT, 0, '#fcfcfb') + line(WT, H - WT, W - WT, H - WT, '#e2e2e0');
  s += rect(0, 0, W, 6, 0, '#ffffff');
  [[AF0 + 70, 150], [BF0 + 70, 170]].forEach(function (w: number[]) { s += rect(W - WT + 3, w[0], WT - 6, w[1], 1, 'url(#gGlass)', { stroke: '#c9dcf1', 'stroke-width': .8 }) + rect(W - WT + 3, w[0] + w[1] / 2 - 1, WT - 6, 2, 0, '#c9dcf1'); });
  [[WT + 0, AF0 + 160, 120], [WT + 0, BF0 + 40, 120]].forEach(function (w: number[]) { s += rect(3, w[1], WT - 6, w[2], 1, 'url(#gGlass)', { stroke: '#c9dcf1', 'stroke-width': .8 }); });
  s += rect(770, H - WT, 90, WT, 0, '#efe8dc') + rect(770, H - WT, 90, 2, 0, '#dcd7ce');
  return s;
}

/* ---------- 房间标签 ---------- */
export const DIMC: Record<string, any> = { de: '#e5483b', zhi: '#2f7ff0', ti: '#1d9a57', mei: '#7a5af5', lao: '#e89a0c', grow: '#e2569a' };
const DIMT: Record<string, string> = { de: '德', zhi: '智', ti: '体', mei: '美', lao: '劳', grow: '长' };
function roomLabel(id: string, info: any): string {
  const r = ROOMS[id], dim = r.dim, c = DIMC[dim]; let x = r.x + 16, y = r.y + 14, s = '';
  if (id === 'study') { x = r.x + 16; y = r.y + 14; }
  if (id === 'living') { x = r.x + 16; y = r.y + 36; }
  if (id === 'art') { x = r.x + 196; y = r.y + 72; }
  if (id === 'kitchen') { x = r.x + 16; y = r.y + 104; }
  if (id === 'sport') { x = r.x + 32; y = r.y + 14; x = 60; y = BF0 + 12; }
  if (id === 'bedroom') { x = r.x + 16; y = r.y + 14; x = r.x + 136; }
  const prog = info && info.prog ? info.prog : '', wid = 92 + (prog ? prog.length * 6.4 + 10 : 0);
  s += '<g class="room-tag" data-room="' + id + '" transform="translate(' + x + ',' + y + ')">' + rect(1, 3, wid, 28, 14, '#000', { 'fill-opacity': '.08', filter: 'url(#hBlurS)' }) + rect(0, 0, wid, 28, 14, '#ffffff', { stroke: '#e6e6e3', 'stroke-width': .8 });
  s += circ(14, 14, 10, c) + txt(14, 18.4, DIMT[dim], { 'font-size': 11.5, 'font-weight': 700, fill: '#fff', 'text-anchor': 'middle' });
  s += txt(30, 18.5, escx(r.name), { 'font-size': 12, 'font-weight': 600, fill: '#2a2a29' });
  if (prog) {
    const ok = info.done;
    s += rect(30 + r.name.length * 12.5 + 6, 6, prog.length * 6.4 + 12, 16, 8, ok ? '#e6f5ec' : '#f3f3f2') + txt(30 + r.name.length * 12.5 + 12, 18, escx(prog), { 'font-size': 10.5, 'font-weight': 600, fill: ok ? '#167a45' : '#5c5c5a', 'font-family': 'var(--num)' });
  }
  return s + '</g>';
}

/* ---------- 夜晚 ---------- */
function nightLayer(tod: string): string {
  if (tod === 'day') return '';
  let s = '<g class="night" pointer-events="none">';
  s += rect(0, 0, W, H, 0, tod === 'night' ? '#14213f' : '#f08a24', { opacity: tod === 'night' ? .2 : .055, style: 'mix-blend-mode:multiply' });
  if (tod === 'night') [[402, 176, 120], [58, 270, 110], [1076, 408, 150], [1421, 628, 130], [744, 520, 120]].forEach(function (g: number[]) { s += circ(g[0], g[1], g[2], 'url(#gGlow)', { style: 'mix-blend-mode:screen', opacity: .75 }); });
  return s + '</g>';
}

/* ---------- 整个场景 ---------- */
/* data: { kids:[{id,name,gender,color,stage,room,active}], parents:[{gender,color,name,room}], rooms:{id:{prog,done,rate}},
          screen, cork, fridge, ruler, medals, stars, works, gift, bike, tod, mode, accent, young, wkLabel } */
export interface HomeScene {
  svg: string
  W: number
  H: number
  rooms: Record<string, any>
}

export function home(d: any): HomeScene {
  d = d || {};
  const tod = d.tod || 'day', sh: string[] = []; let s = '';
  s += '<svg class="scene-svg home-svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg">' + defs();
  s += ell(W / 2 - 40, H + 6, W * 0.56, 46, 'url(#gGround)');
  s += rect(-6, 10, W + 12, H, 18, '#000', { 'fill-opacity': '.10', filter: 'url(#hBlurL)' });
  Object.keys(ROOMS).forEach(function (id: string) { const r = ROOMS[id]; s += rect(r.x, r.y, r.w, r.h, 0, FLOOR[id]) + rect(r.x, r.y, r.w, 26, 0, 'url(#gFloorAO)'); });
  if (tod !== 'night') {
    let lb = '';
    [[AF0 + 70, 150], [BF0 + 70, 170]].forEach(function (w: number[]) { const y1 = w[0], y2 = w[0] + w[1]; lb += poly([[X3, y1], [X3, y2], [X3 - 330, y2 + 120], [X3 - 330, y1 + 120]], '#fff', { 'fill-opacity': tod === 'dusk' ? '.35' : '.6' }); });
    s += '<g filter="url(#hBlur)" pointer-events="none">' + lb + '</g>';
  }
  s += studyWall(d) + livingWall(d) + artWall(d);
  s += sportWall(d) + kitchenWall(d) + bedroomWall(d);
  const fl = studyFloor(d, sh) + livingFloor(d, sh) + artFloor(d, sh) + sportFloor(d, sh) + kitchenFloor(d, sh) + bedroomFloor(d, sh);
  s += '<g filter="url(#hBlur)" pointer-events="none">' + sh.join('') + '</g>' + fl;
  s += walls(tod);
  // 本周五育：按完成率给房间染色
  if (d.mode === 'week') Object.keys(ROOMS).forEach(function (id: string) {
    const r = ROOMS[id], info = (d.rooms || {})[id] || {}; if (info.rate === undefined || info.rate === null) return;
    s += rect(r.x, r.y, r.w, r.h, 0, DIMC[r.dim], { opacity: r1(0.05 + info.rate * 0.22), 'pointer-events': 'none', style: 'mix-blend-mode:multiply' });
    s += '<g pointer-events="none">' + rect(r.x + r.w / 2 - 54, r.y + r.h / 2 - 30, 108, 60, 16, '#ffffff', { opacity: .94, stroke: '#e6e6e3' }) + txt(r.x + r.w / 2, r.y + r.h / 2 + 2, Math.round(info.rate * 100) + '%', { 'font-size': 26, 'font-weight': 700, fill: DIMC[r.dim], 'text-anchor': 'middle', 'font-family': 'var(--num)' }) +
      txt(r.x + r.w / 2, r.y + r.h / 2 + 20, escx(info.sub || '本周完成率'), { 'font-size': 10.5, fill: '#8b8a85', 'text-anchor': 'middle' }) + '</g>';
  });
  Object.keys(ROOMS).forEach(function (id: string) { const r = ROOMS[id]; s += rect(r.x, r.y, r.w, r.h, 0, 'transparent', { 'class': 'room-hit', 'data-room': id }); });
  // 地上的可点物件（礼物、自行车）在房间点击层之上再放一份透明的点击区
  if (s.indexOf('id="waGift"') > 0) s += '<use href="#waGift" class="wall-act" data-sact="go-people" opacity="0"/>';
  if (s.indexOf('id="waBike"') > 0) s += '<use href="#waBike" class="wall-act" data-sact="go-skills" opacity="0"/>';
  Object.keys(ROOMS).forEach(function (id: string) { s += roomLabel(id, (d.rooms || {})[id]); });
  if (d.cat !== false) s += cat(d.catAt ? d.catAt[0] : 116, d.catAt ? d.catAt[1] : 344);
  // 角色
  s += '<g class="figs">';
  (d.parents || []).forEach(function (p: any, i: number) {
    const pos = p.at || [i ? 1010 : 940, i ? 344 : 360];
    s += '<g class="fig parent" data-fig="parent' + i + '" style="transform:translate(' + pos[0] + 'px,' + pos[1] + 'px)">' + ell(-4, 0, 30, 7, '#000', { 'fill-opacity': '.16', filter: 'url(#hBlurS)' }) +
      '<g class="fig-in" style="animation-delay:-' + (i * 1.3) + 's">' + adultFigure(p) + '</g><rect x="-32" y="-136" width="64" height="140" fill="transparent"/></g>';
  });
  (d.kids || []).forEach(function (k: any, i: number) {
    const r = ROOMS[k.room] || ROOMS.living, sc = STAGE_SCALE[k.stage] || 1, pos = k.at || [r.spot[0] + (k.active ? 0 : 40 + i * 18), r.spot[1] + (k.active ? 0 : -8)];
    s += '<g class="fig kid' + (k.active ? ' active' : ' other') + '" data-kid="' + k.id + '" style="transform:translate(' + r1(pos[0]) + 'px,' + r1(pos[1]) + 'px)">' + ell(-3, 0, 20 * sc, 5.5, '#000', { 'fill-opacity': '.16', filter: 'url(#hBlurS)' }) +
      '<g class="fig-in" style="animation-delay:-' + (i * 0.9) + 's"><g transform="scale(' + sc + ')">' + kidFigure(k, k.colorHex || kidColor(k.color || 0)) + '</g></g>' +
      (k.active ? '<g class="name-tag" transform="translate(0,' + r1(-92 * sc - 18) + ')">' + rect(-(escx(k.name).length * 6.5 + 14), -11, escx(k.name).length * 13 + 28, 22, 11, k.colorHex || kidColor(k.color || 0)) + txt(0, 4.5, escx(k.name), { 'font-size': 12, 'font-weight': 700, fill: '#fff', 'text-anchor': 'middle' }) + '</g>' :
        txt(0, 16, escx(k.name), { 'font-size': 11, 'font-weight': 600, fill: '#5c5c5a', 'text-anchor': 'middle', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 3 })) +
      '<rect x="' + r1(-24 * sc) + '" y="' + r1(-92 * sc) + '" width="' + r1(48 * sc) + '" height="' + r1(96 * sc) + '" fill="transparent"/></g>';
  });
  s += '</g>';
  s += nightLayer(tod);
  s += txt(W - WT - 10, H - 3.5, 'Developed by @赛博老爸', { 'class': 'wm', 'text-anchor': 'end' });
  s += '<g class="fx-layer"></g></svg>';
  return { svg: s, W: W, H: H, rooms: ROOMS };
}

/* ---------- 小图标（技能、五育） ---------- */
function ico(d: string, size?: any, color?: any, sw?: any): string {
  return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="' + (color || 'currentColor') + '" stroke-width="' + (sw || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
}
export const ICONS: Record<string, string> = {
  bike: '<circle cx="6" cy="16" r="3.6"/><circle cx="18" cy="16" r="3.6"/><path d="M6 16l4-7h5l3 7M10 9l2 7h-6M14.5 9l-1-2.5h-2.5M15 6.5h2.5"/>',
  swim: '<path d="M2 18c2 1.4 4 1.4 6 0s4-1.4 6 0 4 1.4 6 0M2 14c2 1.4 4 1.4 6 0s4-1.4 6 0 4 1.4 6 0"/><circle cx="16" cy="6" r="2"/><path d="M5 11l5-3 3 3"/>',
  rope: '<path d="M6 4v5M18 4v5"/><path d="M6 9c0 9 12 9 12 0"/><circle cx="12" cy="4" r="1.5"/>',
  shoe: '<path d="M3 16h17a1 1 0 0 0 1-1c0-2-2-3-5-3l-3-4H8L6 11H3z"/><path d="M9 11l1 1M11 10l1 1M3 19h18"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  poem: '<path d="M5 4h11l3 3v13H5z"/><path d="M9 9h6M9 13h6M9 17h3"/>',
  egg: '<path d="M4 13h16a8 8 0 0 1-16 0z"/><circle cx="12" cy="13" r="2.6"/><path d="M20 13l2-2"/>',
  bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M7 21v-3M17 21v-3"/><circle cx="8" cy="14.5" r="1"/><circle cx="16" cy="14.5" r="1"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M9.5 8.5l2.5 3 2.5-3M12 11.5V16M9.5 12.5h5M9.5 14.5h5"/>',
  piano: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v9M11 5v9M15 5v9M3 14h18"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>',
  pot: '<path d="M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M2 10h20M9 6c0-1 1-2 0-3M14 6c0-1 1-2 0-3"/>',
  code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12"/>',
  run: '<circle cx="14" cy="4.5" r="2"/><path d="M8 21l3-5 3 2v4M6 12l3-3h4l3 3 3 1M11 9l-1 5"/>',
  star: '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.2l5.9-.9z"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.3-1.7-.4-1 .3-2.1 1.4-2.1H17a4 4 0 0 0 4-4C21 7 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7.2" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  broom: '<path d="M20 4l-8 8M12 12l-6 1-2 7 7-2 1-6M7 17l2-2"/>',
  tree: '<path d="M12 21v-6M12 3l6 8h-3l4 5H5l4-5H6z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M9 7h6"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a3 3 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
  tent: '<path d="M3 20L12 4l9 16zM12 4v16M9 20l3-5 3 5"/>',
  gift: '<rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M3 13h18M12 9v12M12 9c-2-4-6-4-6-1.5S9 9 12 9zM12 9c2-4 6-4 6-1.5S15 9 12 9z"/>'
};
export function icon(name: string, size?: number, color?: string, sw?: number): string { return ico(ICONS[name] || ICONS.star, size, color, sw); }
