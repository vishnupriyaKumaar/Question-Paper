const { f, sum, mean, rows, out } = require('./core');
const G = [];
const add = (id, cat, re, make) => G.push({ id, cat, re, make });

const median = (a) => { const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
// quartiles by the "median of halves" method (the middle value is left out for odd n)
const quart = (a) => { const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; const lo = s.slice(0, m); const hi = s.slice(s.length % 2 ? m + 1 : m); return [median(lo), median(s), median(hi)]; };
const sampleVar = (a) => { const m = mean(a); return sum(a.map((x) => (x - m) ** 2)) / (a.length - 1); };
function regress(x, y) {
  const n = x.length; const mx = mean(x); const my = mean(y);
  const sxy = sum(x.map((v, i) => (v - mx) * (y[i] - my))); const sxx = sum(x.map((v) => (v - mx) ** 2)); const syy = sum(y.map((v) => (v - my) ** 2));
  const b = sxy / sxx; return { b, a: my - b * mx, r: sxy / Math.sqrt(sxx * syy), n, mx, my };
}

add('descriptive', 'eda', /descriptive|statistic|central tendency|dispersion|variance|standard deviation|exploratory|quartile|outlier|box plot/i, (r) => {
  const n = r.int(9, 12); const base = r.int(10, 60);
  const d = Array.from({ length: n }, () => base + r.int(0, 12));
  d[r.int(0, n - 1)] = base + r.int(60, 90); // one clear outlier candidate
  const cnt = {}; d.forEach((x) => { cnt[x] = (cnt[x] || 0) + 1; }); const mx = Math.max(...Object.values(cnt)); const modes = Object.keys(cnt).filter((k) => cnt[k] === mx).map(Number).sort((a, b) => a - b);
  const modeTxt = mx === 1 ? 'no mode (all values occur once)' : modes.join(', ');
  const m = mean(d); const v = sampleVar(d); const [q1, q2, q3] = quart(d); const iqr = q3 - q1; const lo = q1 - 1.5 * iqr; const hi = q3 + 1.5 * iqr;
  const outl = d.filter((x) => x < lo || x > hi);
  return out(`The response times (in ms) recorded for ${n} requests are ${d.join(', ')}. Calculate (i) the mean, median, mode and range, (ii) the sample standard deviation, and (iii) the quartiles and IQR, and use the 1.5 × IQR rule to identify any outliers.`,
    `(i) Mean = ${f(m, 2)}, median = ${f(q2, 2)}, mode = ${modeTxt}, range = ${Math.max(...d) - Math.min(...d)}. (ii) Sample variance = ${f(v, 2)}, standard deviation = ${f(Math.sqrt(v), 2)}. (iii) Q1 = ${f(q1, 2)}, Q3 = ${f(q3, 2)}, IQR = ${f(iqr, 2)}; fences = [${f(lo, 2)}, ${f(hi, 2)}]; outliers: ${outl.length ? outl.join(', ') : 'none'}. (Quartiles by the median-of-halves method.)`);
});

add('regression', 'eda', /regression|correlation|scatter|least squares|covariance/i, (r) => {
  const n = r.int(6, 8); const x = Array.from({ length: n }, (_, i) => r.int(1, 4) + i * r.int(2, 3));
  const slope = r.pick([2, 3, 1.5, -2]); const y = x.map((v) => Math.round(slope * v + r.int(5, 20) + r.int(-4, 4)));
  const g = regress(x, y); const x0 = Math.max(...x) + r.int(1, 4);
  if (!Number.isFinite(g.r)) throw new Error('degenerate');
  return out(`The values of two variables are: X | ${x.join(' | ')} ; Y | ${y.join(' | ')}. Calculate the correlation coefficient and fit the regression line of Y on X, then predict Y when X = ${x0}.`,
    `x̄ = ${f(g.mx, 3)}, ȳ = ${f(g.my, 3)}. r = ${f(g.r, 4)}. Slope b = Sxy/Sxx = ${f(g.b, 4)}, intercept a = ${f(g.a, 4)}; Y = ${f(g.a, 3)} ${g.b < 0 ? '-' : '+'} ${f(Math.abs(g.b), 3)}X. At X = ${x0}: Y = ${f(g.a + g.b * x0, 2)}.`);
});

add('preprocessing', 'eda', /clean|preprocess|normali[sz]|standardi[sz]|scaling|transformation|missing|imputation|wrangl|z-?score|min-?max/i, (r) => {
  const n = 8; const d = Array.from({ length: n }, () => r.int(20, 95)); const miss = r.int(1, n - 2); const shown = d.map((v, i) => (i === miss ? 'NA' : v));
  const known = d.filter((_, i) => i !== miss); const m = mean(known); const sdv = Math.sqrt(sum(known.map((x) => (x - m) ** 2)) / known.length);
  const mn = Math.min(...known); const mx = Math.max(...known); const probe = known[r.int(0, known.length - 1)];
  return out(`A sensor column contains the values ${shown.join(', ')} (NA = missing). (i) Replace the missing value by the mean of the available values, (ii) apply min–max normalization to the value ${probe}, and (iii) find the z-score of ${probe} (use the population standard deviation of the available values).`,
    `(i) Mean of the ${known.length} available values = ${f(m, 2)}, so NA → ${f(m, 2)}. (ii) Min = ${mn}, max = ${mx}: (${probe} - ${mn})/(${mx} - ${mn}) = ${f((probe - mn) / (mx - mn), 4)}. (iii) σ = ${f(sdv, 3)}; z = (${probe} - ${f(m, 2)})/${f(sdv, 3)} = ${f((probe - m) / sdv, 3)}.`);
});

add('confusion-matrix', 'eda', /confusion|precision|recall|accuracy|classification|performance metric|\\bf1\\b|model evaluation/i, (r) => {
  const tp = r.int(30, 80); const fn = r.int(5, 30); const fp = r.int(5, 30); const tn = r.int(40, 120); const t = tp + fn + fp + tn;
  const acc = (tp + tn) / t; const p = tp / (tp + fp); const rc = tp / (tp + fn); const f1 = (2 * p * rc) / (p + rc);
  return out(`A classifier tested on ${t} records gives TP = ${tp}, FN = ${fn}, FP = ${fp} and TN = ${tn}. Calculate the accuracy, precision, recall and F1-score, and comment on which measure is more suitable if missing a positive case is costly.`,
    `Accuracy = (TP+TN)/total = ${f(acc, 4)}; Precision = TP/(TP+FP) = ${f(p, 4)}; Recall = TP/(TP+FN) = ${f(rc, 4)}; F1 = 2PR/(P+R) = ${f(f1, 4)}. When missing positives is costly, recall is the more suitable measure (reasoning to be reviewed by the instructor).`);
});

add('moving-average', 'eda', /time series|moving average|trend|forecast|smoothing|seasonal/i, (r) => {
  const n = 8; const d = Array.from({ length: n }, () => r.int(40, 120)); const w = 3; const alpha = r.pick([0.3, 0.5]);
  const ma = []; for (let i = w - 1; i < n; i++) ma.push(f(mean(d.slice(i - w + 1, i + 1)), 2));
  let s = d[0]; const ex = [f(s, 2)]; for (let i = 1; i < n; i++) { s = alpha * d[i] + (1 - alpha) * s; ex.push(f(s, 2)); }
  return out(`The monthly sales of a product (in units) are ${d.join(', ')}. Calculate (i) the 3-month simple moving average and (ii) the exponentially smoothed series with α = ${alpha} (take the first smoothed value equal to the first observation).`,
    `(i) 3-month moving averages (months 3 to ${n}): ${ma.join(', ')}. (ii) Exponential smoothing: ${ex.join(', ')}.`);
});

add('entropy', 'eda', /entropy|information gain|decision tree|gini|naive bayes/i, (r) => {
  const yes = r.int(3, 9); const no = r.int(3, 9); const t = yes + no;
  const H = (a, b) => [a, b].filter((x) => x > 0).reduce((s, x) => s - (x / (a + b)) * Math.log2(x / (a + b)), 0);
  const y1 = r.int(1, yes - 1 || 1); const n1 = r.int(1, no - 1 || 1); const s1 = y1 + n1; const s2 = t - s1;
  if (s2 <= 0 || yes - y1 < 0 || no - n1 < 0) throw new Error('split invalid');
  const gain = H(yes, no) - (s1 / t) * H(y1, n1) - (s2 / t) * H(yes - y1, no - n1);
  return out(`A data set has ${t} records: ${yes} belong to class Yes and ${no} to class No. A candidate attribute splits it into two groups: group 1 with ${y1} Yes and ${n1} No, group 2 with ${yes - y1} Yes and ${no - n1} No. Calculate the entropy of the whole data set and the information gain of this split.`,
    `Entropy(S) = ${f(H(yes, no), 4)} bits. Entropy(group 1) = ${f(H(y1, n1), 4)}, Entropy(group 2) = ${f(H(yes - y1, no - n1), 4)}. Gain = ${f(H(yes, no), 4)} - (${s1}/${t})(${f(H(y1, n1), 4)}) - (${s2}/${t})(${f(H(yes - y1, no - n1), 4)}) = ${f(gain, 4)} bits.`);
});

module.exports = G;
module.exports.regress = regress; module.exports.quart = quart;
