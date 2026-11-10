// 线性图标库 · 与原版 ICON 完全一致的路径数据

export type IconName =
  | 'room' | 'users' | 'edit' | 'chart' | 'spark' | 'gear' | 'search' | 'plus' | 'x' | 'dice'
  | 'zin' | 'zout' | 'unfull' | 'fit' | 'lock' | 'down' | 'up' | 'trash' | 'copy' | 'doc'
  | 'check' | 'cake' | 'send' | 'stop' | 'side' | 'print' | 'userplus' | 'back' | 'refresh'
  | 'eye' | 'shuffle' | 'star' | 'cal' | 'flag' | 'clip' | 'timer' | 'fwd' | 'link' | 'home'
  | 'bulb' | 'ruler' | 'heart' | 'gift' | 'book' | 'pin' | 'smile' | 'pen' | 'medal'

const P: Record<IconName, string> = {
  room: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><path d="M5 14h4M15 14h4M5 18h4M15 18h4"/>',
  users:
    '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><path d="M15.5 5.2a3 3 0 0 1 0 5.6M17 14.6c2 .5 3.2 2 3.6 4.4"/>',
  edit: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.5 6.5l3 3"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16l3.5-4 3 2.5L19 8"/>',
  spark:
    '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="15" r="1.1" fill="currentColor"/><circle cx="15" cy="9" r="1.1" fill="currentColor"/><circle cx="9" cy="15" r="1.1" fill="currentColor"/>',
  zin: '<path d="M12 6v12M6 12h12"/>',
  zout: '<path d="M6 12h12"/>',
  unfull: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  up: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  cake: '<path d="M4 20h16M5 20v-7h14v7"/><path d="M5 15.5c1.5 1.2 3 1.2 4.5 0s3-1.2 4.5 0 3 1.2 4.5 0M12 13V9.5"/><path d="M12 6.5c.9-.6.9-1.8 0-2.6-.9.8-.9 2 0 2.6z"/>',
  send: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
  side: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M15 4v16"/>',
  print: '<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7" rx="1"/>',
  userplus: '<circle cx="10" cy="8" r="3.4"/><path d="M3.5 19.5c.7-3.2 3.2-5 6.5-5s5.8 1.8 6.5 5M19 8v6M16 11h6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  shuffle: '<path d="M4 17h3l9-10h4M4 7h3l2.5 2.8M14.5 14.2L16 17h4M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2h5"/>',
  fwd: '<path d="M9 5l7 7-7 7"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  ruler: '<rect x="3" y="8" width="18" height="8" rx="1.5" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l1.5 1.5M12 7l1.5 1.5M7 12l1.5 1.5M14.5 4.5L16 6"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  gift: '<rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M3 13h18M12 9v12M12 9c-2-4-6-4-6-1.5S9 9 12 9zM12 9c2-4 6-4 6-1.5S15 9 12 9z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M9 7h6"/>',
  pin: '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
  smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2M9 9.5h.01M15 9.5h.01"/>',
  pen: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"/>',
  medal: '<circle cx="12" cy="15" r="5"/><path d="M8.5 3l2.5 7M15.5 3L13 10M12 13l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>'
}

/** 返回一段完整的 svg 字符串，用于插画 / 字符串模板场景 */
export function icon(name: IconName | string, size = 16, color?: string, sw = 1.8): string {
  const d = P[(name as IconName)] || P.star
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color || 'currentColor'}"` +
    ` stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`
  )
}

export function iconPath(name: IconName | string): string {
  return P[(name as IconName)] || P.star
}

export default P
