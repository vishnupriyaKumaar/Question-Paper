const { f, sum, mean, rows, out } = require('./core');
const G = [];
const add = (id, cat, re, make) => G.push({ id, cat, re, make });

add('cocomo', 'software', /cocomo|effort estimation|cost estimation|software project estimation|person.?month/i, (r) => {
  const kloc = r.pick([10, 20, 30, 40, 50, 60]); const mode = r.pick([['Organic', 2.4, 1.05, 2.5, 0.38], ['Semi-detached', 3.0, 1.12, 2.5, 0.35], ['Embedded', 3.6, 1.20, 2.5, 0.32]]);
  const E = mode[1] * kloc ** mode[2]; const D = mode[3] * E ** mode[4];
  return out(`A ${mode[0].toLowerCase()} software project is estimated at ${kloc} KLOC. Using Basic COCOMO (E = ${mode[1]} × KLOC^${mode[2]}, D = ${mode[3]} × E^${mode[4]}), calculate the effort, the development time and the average staff size.`,
    `E = ${mode[1]} × ${kloc}^${mode[2]} = ${f(E, 2)} person-months. D = ${mode[3]} × ${f(E, 2)}^${mode[4]} = ${f(D, 2)} months. Average staff = E/D = ${f(E / D, 2)} persons.`);
});
add('cyclomatic', 'software', /cyclomatic|basis path|control flow graph|white.?box|independent paths/i, (r) => {
  const nodes = r.int(8, 14); const edges = nodes + r.int(1, 4); const preds = edges - nodes + 1; const reg = preds + 1; const lines = r.int(120, 600);
  return out(`The control-flow graph of a module has ${nodes} nodes and ${edges} edges (one connected component). Calculate its cyclomatic complexity in two ways and state how many independent paths must be tested.`,
    `V(G) = E - N + 2 = ${edges} - ${nodes} + 2 = ${edges - nodes + 2}. Using predicate nodes, V(G) = P + 1 (so P = ${edges - nodes + 1}). The number of independent paths to test = ${edges - nodes + 2}.`);
});
add('function-points', 'software', /function point|size estimation|\\bfp\\b/i, (r) => {
  const t = { 'External inputs': [r.int(3, 12), 4], 'External outputs': [r.int(3, 10), 5], 'External inquiries': [r.int(2, 8), 4], 'Internal files': [r.int(2, 6), 10], 'External interfaces': [r.int(1, 4), 7] };
  const ufp = sum(Object.values(t).map(([c, w]) => c * w)); const vaf = r.pick([0.9, 1.0, 1.05, 1.1]); const prod = r.pick([8, 10, 12]);
  return out(`A system has ${Object.entries(t).map(([k, [c, w]]) => `${c} ${k.toLowerCase()} (average weight ${w})`).join(', ')}. The value adjustment factor is ${vaf}. Calculate the unadjusted and adjusted function points and the effort in person-months if the productivity is ${prod} FP per person-month.`,
    `UFP = ${Object.values(t).map(([c, w]) => `${c}×${w}`).join(' + ')} = ${ufp}. FP = UFP × VAF = ${f(ufp * vaf, 2)}. Effort = ${f(ufp * vaf, 2)}/${prod} = ${f((ufp * vaf) / prod, 2)} person-months.`);
});

add('amdahl', 'architecture', /amdahl|speedup|\\bcpi\\b|mips|pipelin|clock cycle|instruction (set|execution|cycle)|processor performance/i, (r) => {
  const kind = r.pick(['amdahl', 'cpi', 'pipeline']);
  if (kind === 'amdahl') { const p = r.pick([0.6, 0.7, 0.8, 0.9]); const s = r.pick([2, 4, 8, 10]); const sp = 1 / ((1 - p) + p / s); return out(`In a program, ${p * 100}% of the execution time can be made ${s} times faster by an enhancement. Calculate the overall speedup using Amdahl's law and the maximum speedup possible however large the enhancement.`, `Speedup = 1/((1 - ${p}) + ${p}/${s}) = ${f(sp, 3)}. Maximum possible speedup = 1/(1 - ${p}) = ${f(1 / (1 - p), 3)}.`); }
  if (kind === 'cpi') { const mix = [[r.int(30, 50), 1], [r.int(20, 30), 2], [r.int(10, 20), 3]]; const tot = sum(mix.map((m) => m[0])); const cpi = sum(mix.map(([c, k]) => c * k)) / tot; const clk = r.pick([1, 2, 2.5, 3]);
    return out(`A processor with a ${clk} GHz clock executes a program whose instructions are in the mix ${mix.map(([c, k]) => `${c} instructions of CPI ${k}`).join(', ')}. Find the average CPI, the MIPS rate and the execution time of the program.`, `Average CPI = ${f(cpi, 3)}. MIPS = clock(MHz)/CPI = ${clk * 1000}/${f(cpi, 3)} = ${f((clk * 1000) / cpi, 2)}. Execution time = (instruction count × CPI)/clock = ${tot} × ${f(cpi, 3)} / ${clk}×10⁹ s = ${f((tot * cpi) / (clk * 1e9) * 1e6, 4)} µs.`); }
  const k = r.int(4, 6); const n = r.pick([50, 100, 200]); const sp = (n * k) / (k + n - 1);
  return out(`A ${k}-stage pipeline executes ${n} instructions with no stalls. Calculate the total number of clock cycles, the speedup compared with a non-pipelined processor that needs ${k} cycles per instruction, and the pipeline efficiency.`, `Cycles = k + (n - 1) = ${k + n - 1}. Speedup = ${n * k}/${k + n - 1} = ${f(sp, 3)}. Efficiency = speedup/k = ${f(sp / k, 3)}.`);
});
add('cache', 'architecture', /cache|memory hierarchy|amat|hit ratio|miss|direct.?mapped|associative|locality|main memory/i, (r) => {
  const h = r.pick([0.9, 0.95, 0.98]); const tc = r.pick([1, 2, 4]); const tm = r.pick([50, 100]); const amat = tc + (1 - h) * tm;
  const cache = r.pick([8, 16, 32]); const blk = r.pick([16, 32, 64]); const lines = (cache * 1024) / blk; const sets = lines; const idx = Math.log2(sets); const off = Math.log2(blk); const addrBits = r.pick([24, 32]);
  return out(`A cache has an access time of ${tc} ns, the main memory access time is ${tm} ns and the hit ratio is ${h}. Find the average memory access time. For a direct-mapped cache of ${cache} KB with ${blk}-byte blocks and ${addrBits}-bit addresses, find the number of lines and the sizes of the tag, index and offset fields.`,
    `AMAT = hit time + miss rate × miss penalty = ${tc} + ${f(1 - h, 3)} × ${tm} = ${f(amat, 3)} ns. Lines = ${cache * 1024}/${blk} = ${lines}. Offset = ${off} bits, index = ${idx} bits, tag = ${addrBits - idx - off} bits.`);
});

add('dfa-trace', 'compiler', /\\bdfa\\b|automata|finite|lexical|regular (expression|language)|\\btoken|\\bnfa\\b|state machine/i, (r) => {
  const nS = 3; const tr = Array.from({ length: nS }, () => ({ a: r.int(0, nS - 1), b: r.int(0, nS - 1) })); const acc = new Set([r.int(0, nS - 1)]);
  const run = (w) => { let s = 0; for (const c of w) s = tr[s][c]; return s; };
  const words = Array.from({ length: 3 }, () => Array.from({ length: r.int(3, 6) }, () => r.pick(['a', 'b'])).join(''));
  const res = words.map((w) => `${w}: ends in q${run(w)} → ${acc.has(run(w)) ? 'accepted' : 'rejected'}`);
  return out(`A DFA over {a, b} has states q0, q1, q2 (start q0, accepting state q${[...acc][0]}) and transitions ${tr.map((t, i) => `δ(q${i}, a) = q${t.a}, δ(q${i}, b) = q${t.b}`).join('; ')}. Trace the strings ${words.join(', ')} and decide which are accepted.`, `${res.join('; ')}.`);
});

add('perceptron', 'ml', /perceptron|neural|gradient descent|learning rate|backprop|k-?nn|nearest neighbo|machine learning|optimi[sz]ation/i, (r) => {
  const kind = r.pick(['perceptron', 'gd', 'knn']);
  if (kind === 'perceptron') { const w = [r.int(-1, 1), r.int(-1, 1)]; const b = r.int(-1, 1); const x = [r.int(0, 2), r.int(0, 2)]; const t = r.pick([0, 1]); const lr = r.pick([0.5, 1]); const act = w[0] * x[0] + w[1] * x[1] + b; const y = act >= 0 ? 1 : 0; const nw = w.map((wi, i) => wi + lr * (t - y) * x[i]); const nb = b + lr * (t - y);
    return out(`A perceptron with a step activation (output 1 if the net input ≥ 0, else 0) has weights w1 = ${w[0]}, w2 = ${w[1]} and bias ${b}. For the training example x = (${x[0]}, ${x[1]}) with target ${t} and learning rate ${lr}, find the output and the updated weights and bias using w = w + η(t - y)x.`, `Net = ${w[0]}×${x[0]} + ${w[1]}×${x[1]} + ${b} = ${act}; output y = ${y}. Error = ${t - y}. New w1 = ${f(nw[0], 2)}, w2 = ${f(nw[1], 2)}, bias = ${f(nb, 2)}.`); }
  if (kind === 'gd') { const w0 = r.int(3, 9); const lr = r.pick([0.1, 0.2, 0.25]); const c = r.int(1, 4); let w = w0; const log = []; for (let i = 0; i < 3; i++) { w -= lr * 2 * (w - c); log.push(f(w, 4)); }
    return out(`Gradient descent is used to minimize J(w) = (w - ${c})² starting from w = ${w0} with a learning rate of ${lr}. Calculate the value of w after each of the first three iterations.`, `Gradient = 2(w - ${c}). w after iterations 1, 2, 3 = ${log.join(', ')}; w moves towards the minimum at w = ${c}.`); }
  const pts = Array.from({ length: 6 }, () => ({ x: r.int(1, 9), y: r.int(1, 9), c: r.pick(['A', 'B']) })); const q = { x: r.int(1, 9), y: r.int(1, 9) }; const k = 3;
  const d = pts.map((p) => ({ ...p, d: Math.hypot(p.x - q.x, p.y - q.y) })).sort((a, b) => a.d - b.d || a.x - b.x);
  const near = d.slice(0, k); const cnt = {}; near.forEach((p) => { cnt[p.c] = (cnt[p.c] || 0) + 1; }); const best = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  if (d[k - 1].d === d[k].d) throw new Error('tie');
  return out(`The training points (x, y, class) are ${pts.map((p) => `(${p.x}, ${p.y}, ${p.c})`).join(', ')}. Using the k-nearest-neighbour algorithm with k = ${k} and Euclidean distance, classify the new point (${q.x}, ${q.y}).`, `Distances: ${d.map((p) => `(${p.x},${p.y},${p.c}) = ${f(p.d, 3)}`).join('; ')}. The ${k} nearest neighbours vote ${Object.entries(cnt).map(([a, b]) => `${a}:${b}`).join(', ')}, so the point is classified as class ${best}.`);
});

add('availability', 'cloud', /availability|reliability|mtbf|mttr|fault tolerance|redundan|\\bsla\\b|cloud cost|pricing/i, (r) => {
  const mtbf = r.pick([500, 1000, 2000]); const mttr = r.pick([2, 4, 10]); const A = mtbf / (mtbf + mttr); const par = 1 - (1 - A) ** 2; const hrs = 8760;
  const vm = r.int(2, 8); const rate = r.pick([0.05, 0.1, 0.2]); const hours = r.pick([100, 250, 720]);
  return out(`A cloud server has an MTBF of ${mtbf} hours and an MTTR of ${mttr} hours. Calculate its availability, the expected downtime per year (${hrs} hours) and the availability of a system with two such servers in parallel. Also find the monthly bill for ${vm} virtual machines used for ${hours} hours at $${rate} per VM-hour.`,
    `A = MTBF/(MTBF + MTTR) = ${f(A * 100, 4)}%. Downtime per year = ${f((1 - A) * hrs, 2)} hours. Two in parallel: 1 - (1 - A)² = ${f(par * 100, 5)}%. Bill = ${vm} × ${hours} × ${rate} = $${f(vm * hours * rate, 2)}.`);
});

add('circuits', 'electronics', /circuit|resistor|ohm|kirchhoff|thevenin|network theorem|voltage divider|dc analysis/i, (r) => {
  const R1 = r.pick([10, 20, 30, 40]); const R2 = r.pick([10, 15, 30, 60]); const R3 = r.pick([20, 25, 50]); const V = r.pick([6, 9, 12, 24]);
  const par = (R2 * R3) / (R2 + R3); const Rt = R1 + par; const I = V / Rt; const Vp = I * par;
  return out(`A ${V} V source is connected to a resistor R1 = ${R1} Ω in series with the parallel combination of R2 = ${R2} Ω and R3 = ${R3} Ω. Find the total resistance, the source current, the voltage across the parallel combination and the current through R3.`,
    `Rparallel = (${R2}×${R3})/(${R2}+${R3}) = ${f(par, 3)} Ω. Rtotal = ${f(Rt, 3)} Ω. I = V/R = ${f(I, 4)} A. V(parallel) = I × Rparallel = ${f(Vp, 4)} V. I3 = V/R3 = ${f(Vp / R3, 4)} A.`);
});

module.exports = G;
