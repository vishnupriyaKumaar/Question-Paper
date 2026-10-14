const { gcd, f, sum, mean, rows, Phi, comb, out } = require('./core');
const G = [];
const add = (id, cat, re, make) => G.push({ id, cat, re, make });

add('linear2', 'math', /linear (system|equation)|simultaneous|cramer|gauss|jacobi|elimination|system of (linear )?equations|solution of equations/i, (r) => {
  let x, y, a1, b1, a2, b2;
  do { x = r.int(-5, 8); y = r.int(-5, 8); a1 = r.int(1, 6); b1 = r.int(-5, 6); a2 = r.int(-5, 6); b2 = r.int(1, 6); } while (a1 * b2 - a2 * b1 === 0 || b1 === 0 || a2 === 0);
  const c1 = a1 * x + b1 * y; const c2 = a2 * x + b2 * y;
  const D = a1 * b2 - a2 * b1; const Dx = c1 * b2 - c2 * b1; const Dy = a1 * c2 - a2 * c1;
  if (Dx / D !== x || Dy / D !== y) throw new Error('linear2 check failed');
  const sg = (n) => (n < 0 ? `- ${-n}` : `+ ${n}`);
  return out(`Find the values of x and y that satisfy the equations ${a1}x ${sg(b1)}y = ${c1} and ${a2}x ${sg(b2)}y = ${c2} using Cramer's rule or matrix methods.`,
    `Determinant D = ${a1}(${b2}) - (${b1})(${a2}) = ${D}. x = Dx/D = ${Dx}/${D} = ${x}; y = Dy/D = ${Dy}/${D} = ${y}.`);
});

const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
add('det3', 'math', /determinant|matri|inverse|rank/i, (r) => {
  const m = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => r.int(-3, 6)));
  const d = det3(m);
  const tr = m[0][0] + m[1][1] + m[2][2];
  return out(`Evaluate the determinant of the matrix A = [${m.map((x) => x.join(' ')).join(' ; ')}] and state whether A is invertible. Also find the trace of A.`,
    `det(A) = ${d}. ${d === 0 ? 'A is singular (not invertible).' : 'A is invertible because det(A) is not zero.'} Trace = ${m[0][0]} + ${m[1][1]} + ${m[2][2]} = ${tr}.`);
});

add('eigen2', 'math', /eigen|characteristic|cayley|diagonal/i, (r) => {
  let l1, l2; do { l1 = r.int(-3, 6); l2 = r.int(-3, 6); } while (l1 === l2);
  const a = r.int(-2, 5); const d = l1 + l2 - a; const b = r.pick([1, -1]); const c = (a * d - l1 * l2) / b;
  const tr = a + d; const dt = a * d - b * c;
  const disc = tr * tr - 4 * dt; const sq = Math.round(Math.sqrt(disc));
  if (sq * sq !== disc) throw new Error('eigen check failed');
  const e = [(tr - sq) / 2, (tr + sq) / 2].sort((p, q) => p - q);
  return out(`Find the characteristic equation and the eigenvalues of the matrix A = [${a} ${b} ; ${c} ${d}].`,
    `Characteristic equation: λ² - ${tr}λ + (${dt}) = 0. Eigenvalues: λ = ${e[0]} and λ = ${e[1]}. (Sum = trace = ${tr}, product = determinant = ${dt}.)`);
});

add('derivative', 'math', /differentiat|derivative|calculus|maxima|minima|stationary|slope/i, (r) => {
  const m = r.int(1, 3); const r1 = r.int(-3, 1); const r2 = r1 + 2 * r.int(1, 2) - 0; // r1 + r2 even
  const s = r1 + r2; if (s % 2) throw new Error('parity');
  const A = 1; const B = (-3 * s) / 2; const C = 3 * r1 * r2; const D0 = r.int(-5, 10);
  const F = (x) => A * x ** 3 + B * x ** 2 + C * x + D0; const F2 = (x) => 6 * x + 2 * B;
  const sgn = (n, v) => (n < 0 ? `- ${-n}${v}` : n === 0 ? '' : `+ ${n}${v}`);
  const nature = (x) => (F2(x) > 0 ? 'minimum' : 'maximum');
  return out(`Find the stationary points of f(x) = x³ ${sgn(B, 'x²')} ${sgn(C, 'x')} ${D0 < 0 ? `- ${-D0}` : `+ ${D0}`} and decide whether each gives a maximum or a minimum.`,
    `f'(x) = 3x² ${sgn(2 * B, 'x')} ${sgn(C, '')} = 3(x - ${r1})(x - ${r2}), so x = ${r1} and x = ${r2}. f''(x) = 6x ${sgn(2 * B, '')}. At x = ${r1}: f'' = ${F2(r1)} → ${nature(r1)}, f = ${F(r1)}. At x = ${r2}: f'' = ${F2(r2)} → ${nature(r2)}, f = ${F(r2)}.`);
});

add('integral', 'math', /integrat|integral|area under|definite/i, (r) => {
  const a = r.int(1, 4); const b = r.int(-4, 5); const c = r.int(-3, 6); const p = r.int(0, 2); const q = p + r.int(1, 3);
  const num = 6 * (a * (q ** 3 - p ** 3) / 3 + b * (q ** 2 - p ** 2) / 2 + c * (q - p)); // value * 6
  const val = num / 6;
  let steps = 0; const n = 20000; const h = (q - p) / n; for (let i = 0; i < n; i++) { const x = p + (i + 0.5) * h; steps += (a * x * x + b * x + c) * h; }
  if (Math.abs(steps - val) > 1e-6) throw new Error('integral check failed');
  return out(`Evaluate the definite integral of (${a}x² ${b < 0 ? `- ${-b}` : `+ ${b}`}x ${c < 0 ? `- ${-c}` : `+ ${c}`}) dx from x = ${p} to x = ${q}.`,
    `Integral = [${a}x³/3 + ${b}x²/2 + ${c}x] from ${p} to ${q} = ${f(val, 4)}.`);
});

add('ode', 'math', /differential equation|\bode\b|first order|linear differential|initial value/i, (r) => {
  const a = r.int(1, 4); const b = r.int(1, 8); const y0 = r.int(0, 6);
  const ys = (x) => b / a + (y0 - b / a) * Math.exp(-a * x);
  let y = y0; const N = 20000; const h = 1 / N; const dy = (v) => b - a * v;
  for (let i = 0; i < N; i++) { const k1 = dy(y); const k2 = dy(y + h * k1 / 2); const k3 = dy(y + h * k2 / 2); const k4 = dy(y + h * k3); y += h * (k1 + 2 * k2 + 2 * k3 + k4) / 6; }
  if (Math.abs(y - ys(1)) > 1e-7) throw new Error('ode check failed');
  return out(`Solve the differential equation dy/dx + ${a}y = ${b} with y(0) = ${y0}, and find the value of y at x = 1 (correct to four decimal places).`,
    `Integrating factor e^(${a}x). General solution y = ${f(b / a, 4)} + C e^(-${a}x); with y(0) = ${y0}, C = ${f(y0 - b / a, 4)}. y(1) = ${f(ys(1), 4)}.`);
});

const poisson = (k, lam) => { let p = Math.exp(-lam); for (let i = 1; i <= k; i++) p *= lam / i; return p; };
const binom = (n, k, p) => comb(n, k) * p ** k * (1 - p) ** (n - k);
add('probability', 'math', /probab|binomial|poisson|normal distribution|bayes|distribution|random variable|exponential|expectation/i, (r) => {
  const tp = String(r.topic || '');
  const kind = /binomial/i.test(tp) ? 'binom' : /poisson/i.test(tp) ? 'poisson' : /normal/i.test(tp) ? 'normal' : /bayes|total probab/i.test(tp) ? 'bayes' : /expon/i.test(tp) ? 'exp' : r.pick(['binom', 'poisson', 'normal', 'bayes', 'exp']);
  if (kind === 'binom') {
    const n = r.int(6, 12); const p = r.pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5]); const k = r.int(2, 4);
    const exact = binom(n, k, p); let atLeast = 0; for (let i = k; i <= n; i++) atLeast += binom(n, i, p);
    let tot = 0; for (let i = 0; i <= n; i++) tot += binom(n, i, p); if (Math.abs(tot - 1) > 1e-9) throw new Error('binom check');
    return out(`A machine produces a defective item with probability ${p}. In a random sample of ${n} items, find (i) the probability that exactly ${k} are defective, (ii) the probability that at least ${k} are defective, and (iii) the mean and variance of the number of defectives.`,
      `X ~ Binomial(${n}, ${p}). (i) P(X=${k}) = C(${n},${k})(${p})^${k}(${f(1 - p, 2)})^${n - k} = ${f(exact, 4)}. (ii) P(X ≥ ${k}) = ${f(atLeast, 4)}. (iii) Mean = np = ${f(n * p, 3)}, variance = npq = ${f(n * p * (1 - p), 4)}.`);
  }
  if (kind === 'poisson') {
    const lam = r.int(2, 6); const k = r.int(lam, lam + 3);
    let le = 0; for (let i = 0; i <= k; i++) le += poisson(i, lam);
    return out(`The number of calls received by a help desk per hour follows a Poisson distribution with mean ${lam}. Find (i) the probability of exactly ${k} calls in an hour and (ii) the probability of at most ${k} calls in an hour.`,
      `λ = ${lam}. (i) P(X=${k}) = e^-${lam} ${lam}^${k}/${k}! = ${f(poisson(k, lam), 4)}. (ii) P(X ≤ ${k}) = ${f(le, 4)}.`);
  }
  if (kind === 'normal') {
    const mu = r.int(40, 80); const sd = r.int(4, 12); const x1 = mu + sd * r.pick([1, 1.5, 2]); const x0 = mu - sd * r.pick([0.5, 1]);
    const z1 = (x1 - mu) / sd; const z0 = (x0 - mu) / sd;
    return out(`The marks of students in an examination are normally distributed with mean ${mu} and standard deviation ${sd}. Find (i) the percentage of students scoring more than ${x1} and (ii) the percentage of students scoring between ${x0} and ${x1}.`,
      `(i) z = (${x1}-${mu})/${sd} = ${f(z1, 2)}; P(X > ${x1}) = 1 - Φ(${f(z1, 2)}) = ${f((1 - Phi(z1)) * 100, 2)}%. (ii) z = ${f(z0, 2)} to ${f(z1, 2)}: Φ(${f(z1, 2)}) - Φ(${f(z0, 2)}) = ${f((Phi(z1) - Phi(z0)) * 100, 2)}%.`);
  }
  if (kind === 'exp') {
    const m = r.pick([20, 25, 40, 50, 100]); const t = m * r.pick([0.5, 1, 1.5]);
    return out(`The lifetime of a component is exponentially distributed with a mean of ${m} hours. Find (i) the probability that it lasts more than ${t} hours and (ii) the probability that it fails within ${t / 2} hours.`,
      `λ = 1/${m}. (i) P(X > ${t}) = e^(-${t}/${m}) = ${f(Math.exp(-t / m), 4)}. (ii) P(X ≤ ${t / 2}) = 1 - e^(-${t / 2}/${m}) = ${f(1 - Math.exp(-t / m / 2), 4)}.`);
  }
  const shares = r.pick([[50, 30, 20], [40, 35, 25], [60, 25, 15]]); const d = r.pick([[2, 3, 5], [1, 2, 4], [3, 4, 6]]);
  const tot = shares.reduce((s, v, i) => s + (v / 100) * (d[i] / 100), 0);
  const post = (shares[0] / 100) * (d[0] / 100) / tot;
  return out(`Three machines M1, M2 and M3 produce ${shares[0]}%, ${shares[1]}% and ${shares[2]}% of the items in a factory, and ${d[0]}%, ${d[1]}% and ${d[2]}% of their items are defective respectively. An item is chosen at random. Find (i) the probability that it is defective and (ii) the probability that a defective item came from M1.`,
    `(i) P(D) = Σ P(Mi)P(D|Mi) = ${f(tot, 5)}. (ii) By Bayes' theorem P(M1|D) = P(M1)P(D|M1)/P(D) = ${f(post, 4)}.`);
});

add('newton', 'math', /newton|raphson|bisection|root finding|roots of|non-?linear equation|iterative method/i, (r) => {
  const N = r.pick([2, 3, 5, 6, 7, 10, 11, 13]); const x0 = Math.ceil(Math.sqrt(N)) + r.int(0, 1);
  const x1 = (x0 + N / x0) / 2; const x2 = (x1 + N / x1) / 2;
  if (Math.abs(x2 * x2 - N) > 0.2) throw new Error('newton check');
  return out(`Using the Newton–Raphson method, find the square root of ${N} by solving x² - ${N} = 0. Start from x0 = ${x0} and carry out two iterations (give values to five decimal places).`,
    `x(n+1) = x(n) - (x² - ${N})/(2x) = (x + ${N}/x)/2. x1 = ${f(x1, 5)}, x2 = ${f(x2, 5)} (true √${N} = ${f(Math.sqrt(N), 5)}).`);
});

add('simpson', 'math', /trapez|simpson|numerical integration|interpolat|quadrature/i, (r) => {
  const a = r.int(1, 3); const b = r.int(0, 3); const c = r.int(0, 4); const h = r.pick([0.5, 1, 2]); const x0 = r.int(0, 2);
  const xs = [0, 1, 2, 3, 4].map((i) => x0 + i * h); const ys = xs.map((x) => a * x ** 3 + b * x * x + c);
  const trap = (h / 2) * (ys[0] + 2 * (ys[1] + ys[2] + ys[3]) + ys[4]);
  const simp = (h / 3) * (ys[0] + 4 * (ys[1] + ys[3]) + 2 * ys[2] + ys[4]);
  const L = xs[4]; const x = x0; const exact = a * (L ** 4 - x ** 4) / 4 + b * (L ** 3 - x ** 3) / 3 + c * (L - x);
  if (Math.abs(simp - exact) > 1e-9) throw new Error('simpson check');
  return out(`The following values of y = f(x) are known: x | ${xs.join(' | ')} ; y | ${ys.join(' | ')}. Estimate the integral of y dx from x = ${xs[0]} to x = ${xs[4]} using (i) the trapezoidal rule and (ii) Simpson's 1/3 rule.`,
    `h = ${h}. Trapezoidal = (h/2)[y0 + 2(y1+y2+y3) + y4] = ${f(trap, 4)}. Simpson 1/3 = (h/3)[y0 + 4(y1+y3) + 2y2 + y4] = ${f(simp, 4)}.`);
});

add('ztest', 'math', /hypothes|significance|z-?test|t-?test|testing of|confidence|sampling|estimation/i, (r) => {
  const mu0 = r.int(40, 120); const sd = r.pick([4, 5, 8, 10, 12]); const n = r.pick([25, 36, 49, 64, 100]);
  const xbar = mu0 + r.pick([-1, 1]) * sd * r.pick([0.2, 0.3, 0.4, 0.5]) * (n >= 49 ? 1 : 0.8) * 2;
  const alpha = r.pick([0.05, 0.01]); const zc = alpha === 0.05 ? 1.96 : 2.576;
  const z = (xbar - mu0) / (sd / Math.sqrt(n));
  return out(`A manufacturer claims that the mean life of its product is ${mu0} hours. A random sample of ${n} items has a mean life of ${f(xbar, 2)} hours. Assuming the population standard deviation is ${sd} hours, test the claim at the ${alpha * 100}% level of significance (two-tailed) and state your conclusion.`,
    `H0: μ = ${mu0}; H1: μ ≠ ${mu0}. z = (x̄ - μ)/(σ/√n) = ${f(z, 3)}. Critical value = ±${zc}. ${Math.abs(z) > zc ? `|z| > ${zc}: reject H0, the claim is not supported.` : `|z| ≤ ${zc}: do not reject H0, the claim is accepted.`}`);
});

module.exports = G;
