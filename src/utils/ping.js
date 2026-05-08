export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const rand = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Ease in-out quadratic */
export const ease = (t) =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

/** Format rtt stats line */
export const formatRtt = (times) => {
  if (!times.length) return null;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1);
  return `rtt min/avg/max = ${min}/${avg}/${max} ms`;
};
