// Just enough color handling to decide which text colors to keep and to check
// their contrast against a white page (WCAG 2 contrast ratio).

const NAMED = {
  black: '#000000', white: '#ffffff', gray: '#808080', grey: '#808080', silver: '#c0c0c0',
  red: '#ff0000', darkred: '#8b0000', maroon: '#800000', crimson: '#dc143c', firebrick: '#b22222',
  orange: '#ffa500', darkorange: '#ff8c00', orangered: '#ff4500', gold: '#ffd700', yellow: '#ffff00',
  green: '#008000', darkgreen: '#006400', lime: '#00ff00', forestgreen: '#228b22', seagreen: '#2e8b57', olive: '#808000', teal: '#008080',
  blue: '#0000ff', navy: '#000080', darkblue: '#00008b', mediumblue: '#0000cd', royalblue: '#4169e1', steelblue: '#4682b4', dodgerblue: '#1e90ff',
  purple: '#800080', indigo: '#4b0082', darkviolet: '#9400d3', magenta: '#ff00ff', fuchsia: '#ff00ff', violet: '#ee82ee',
  brown: '#a52a2a', saddlebrown: '#8b4513', chocolate: '#d2691e', pink: '#ffc0cb', hotpink: '#ff69b4', deeppink: '#ff1493',
  cyan: '#00ffff', aqua: '#00ffff', darkcyan: '#008b8b', tomato: '#ff6347', coral: '#ff7f50', salmon: '#fa8072',
};

/** Parses #rgb, #rrggbb, rgb()/rgba() and common color names. Returns null if unknown. */
export function parseColor(value) {
  if (!value) return null;
  let v = value.trim().toLowerCase();
  if (NAMED[v]) v = NAMED[v];
  let m;
  if ((m = v.match(/^#([0-9a-f]{3})$/))) {
    const [r, g, b] = m[1].split('').map((c) => parseInt(c + c, 16));
    return make(r, g, b);
  }
  if ((m = v.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/))) {
    const n = m[1];
    return make(parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16));
  }
  if ((m = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/))) {
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return null; // fully transparent
    return make(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  return null;
}

function make(r, g, b) {
  const hex = '#' + [r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('');
  return { r, g, b, hex };
}

function luminance({ r, g, b }) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast ratio of a text color on a white page (1 to 21). */
export function contrastWithWhite(color) {
  return 1.05 / (luminance(color) + 0.05);
}

/**
 * Black, near-black, grays and white carry no meaning of their own: they are the
 * normal text color, or left over from a dark theme. Everything else is "a color".
 */
export function isNeutral({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = (max - min) / 255;
  if (chroma < 0.15) return true; // black, gray, white
  return max < 60; // so dark it reads as black
}
