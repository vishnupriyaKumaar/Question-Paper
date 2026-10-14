// Shared helpers for the local (no API key) question engine.
function makeRng(seed) {
  let s = (seed === undefined || seed === null ? Math.floor(Math.random() * 2 ** 31) : Number(seed) >>> 0) || 1;
  const next = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const r = {
    next,
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    sample: (arr, n) => r.shuffle(arr).slice(0, n),
    chance: (p) => next() < p,
  };
  return r;
}
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
function modpow(b, e, m) { let r = 1; b %= m; while (e > 0) { if (e & 1) r = (r * b) % m; b = (b * b) % m; e = Math.floor(e / 2); } return r; }
function egcd(a, b) { if (!b) return [a, 1, 0]; const [g, x, y] = egcd(b, a % b); return [g, y, x - Math.floor(a / b) * y]; }
function modinv(a, m) { const [g, x] = egcd(((a % m) + m) % m, m); return g === 1 ? ((x % m) + m) % m : null; }
const isPrime = (n) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
const PRIMES = (lo, hi) => { const o = []; for (let i = lo; i <= hi; i++) if (isPrime(i)) o.push(i); return o; };
const f = (x, d = 2) => { const n = Number(Number(x).toFixed(d)); return Object.is(n, -0) ? '0' : String(n); };
const sum = (a) => a.reduce((x, y) => x + y, 0);
const mean = (a) => sum(a) / a.length;
const rows = (list) => list.join('; ');
// Phi(z) of the standard normal (Abramowitz-Stegun 7.1.26 erf, error < 1.5e-7)
function erf(x) { const s = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }
const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const comb = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); };
// unit tests / generators return {text, answer}; verified:true means the answer was computed by the app's own algorithm
const out = (text, answer) => ({ text, answer, verified: true });
module.exports = { makeRng, gcd, modpow, egcd, modinv, isPrime, PRIMES, f, sum, mean, rows, erf, Phi, comb, out };
