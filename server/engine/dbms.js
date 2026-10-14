const { f, sum, mean, rows, out } = require('./core');
const G = [];
const add = (id, cat, re, make) => G.push({ id, cat, re, make });

// ---------- functional dependencies ----------
const closure = (X, fds) => { const c = new Set(X); let ch = true; while (ch) { ch = false; for (const [l, rr] of fds) if (l.every((a) => c.has(a)) && !rr.every((a) => c.has(a))) { rr.forEach((a) => c.add(a)); ch = true; } } return c; };
function keys(attrs, fds) {
  const res = []; const n = attrs.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const s = attrs.filter((_, i) => mask & (1 << i));
    if (closure(s, fds).size === n && !res.some((k) => k.every((a) => s.includes(a)))) res.push(s);
  }
  return res.sort((a, b) => a.length - b.length || a.join('').localeCompare(b.join('')));
}
function normalForm(attrs, fds, K) {
  const prime = new Set(K.reduce((a, k) => a.concat(k), [])); const isSuper = (x) => closure(x, fds).size === attrs.length;
  const nontriv = fds.flatMap(([l, rr]) => rr.filter((a) => !l.includes(a)).map((a) => [l, a]));
  const bcnf = nontriv.every(([l]) => isSuper(l));
  const tnf = nontriv.every(([l, a]) => isSuper(l) || prime.has(a));
  const partial = nontriv.some(([l, a]) => !prime.has(a) && K.some((k) => l.every((x) => k.includes(x)) && l.length < k.length));
  return bcnf ? 'BCNF' : tnf ? '3NF' : !partial ? '2NF' : '1NF';
}
add('fd-normalization', 'dbms', /normali[sz]|normal form|functional dependenc|candidate key|closure|bcnf|3nf|2nf|armstrong|decomposition/i, (r) => {
  const attrs = ['A', 'B', 'C', 'D', 'E'].slice(0, r.int(4, 5)); let fds; let K;
  for (let t = 0; t < 200; t++) {
    const nf = r.int(3, 4); fds = [];
    for (let i = 0; i < nf; i++) { const l = r.sample(attrs, r.int(1, 2)).sort(); const rhs = r.sample(attrs.filter((a) => !l.includes(a)), r.int(1, 2)).sort(); fds.push([l, rhs]); }
    K = keys(attrs, fds); if (K.length >= 1 && K.length <= 3 && K[0].length < attrs.length) break;
  }
  const X = r.sample(attrs, 2).sort(); const cl = [...closure(X, fds)].sort();
  const fdText = fds.map(([l, rr]) => `${l.join('')} → ${rr.join('')}`).join(', ');
  const nf = normalForm(attrs, fds, K);
  return out(`Consider the relation R(${attrs.join(', ')}) with the functional dependencies ${fdText}. Find (i) the closure of {${X.join(', ')}}, (ii) all candidate keys of R, and (iii) the highest normal form that R satisfies (check the given dependencies).`,
    `(i) {${X.join(', ')}}⁺ = {${cl.join(', ')}}. (ii) Candidate key(s): ${K.map((k) => `{${k.join(', ')}}`).join(', ')}. (iii) Highest normal form of the given dependencies: ${nf}.`);
});

// ---------- SQL / relational algebra on a generated table ----------
const NAMES = ['Anitha', 'Bala', 'Charan', 'Divya', 'Eswar', 'Farah', 'Gokul', 'Hema', 'Ilan', 'Jaya', 'Kiran', 'Lakshmi'];
add('sql-queries', 'dbms', /\\bsql\\b|relational algebra|\\bjoin|group by|aggregate|relational model|query|tuple|calculus/i, (r) => {
  const depts = ['CSE', 'ECE', 'MECH']; const n = r.int(6, 8);
  const T = r.sample(NAMES, n).map((name, i) => ({ id: 101 + i, name, dept: r.pick(depts), marks: r.int(35, 98) }));
  const kind = r.pick(['where', 'group', 'having']); const th = r.int(50, 75);
  const tab = rows(T.map((t) => `(${t.id}, ${t.name}, ${t.dept}, ${t.marks})`));
  const head = `STUDENT(RollNo, Name, Dept, Marks) contains the tuples ${tab}.`;
  if (kind === 'where') {
    const d = r.pick(depts); const res = T.filter((t) => t.dept === d && t.marks > th).sort((a, b) => b.marks - a.marks);
    return out(`${head} Write the SQL query and the equivalent relational-algebra expression to list the names and marks of ${d} students who scored more than ${th}, in descending order of marks, and show the output.`,
      `SQL: SELECT Name, Marks FROM STUDENT WHERE Dept = '${d}' AND Marks > ${th} ORDER BY Marks DESC; Algebra: π(Name, Marks)(σ(Dept='${d}' ∧ Marks>${th})(STUDENT)). Output: ${res.length ? res.map((t) => `(${t.name}, ${t.marks})`).join(', ') : 'empty result'}.`);
  }
  const grp = {}; T.forEach((t) => { (grp[t.dept] = grp[t.dept] || []).push(t.marks); });
  if (kind === 'group') {
    const o = Object.keys(grp).sort().map((d) => `(${d}, ${grp[d].length}, ${f(mean(grp[d]), 2)}, ${Math.max(...grp[d])})`);
    return out(`${head} Write an SQL query to display, for each department, the number of students, the average marks and the highest marks, and show the output.`,
      `SQL: SELECT Dept, COUNT(*), AVG(Marks), MAX(Marks) FROM STUDENT GROUP BY Dept ORDER BY Dept; Output (Dept, count, average, maximum): ${o.join(', ')}.`);
  }
  const avg = mean(T.map((t) => t.marks)); const o = Object.keys(grp).sort().filter((d) => mean(grp[d]) > avg).map((d) => `(${d}, ${f(mean(grp[d]), 2)})`);
  return out(`${head} Write an SQL query to list the departments whose average marks are higher than the average marks of all students, and show the output.`,
    `SQL: SELECT Dept, AVG(Marks) FROM STUDENT GROUP BY Dept HAVING AVG(Marks) > (SELECT AVG(Marks) FROM STUDENT); Overall average = ${f(avg, 2)}. Output: ${o.length ? o.join(', ') : 'empty result'}.`);
});

// ---------- conflict serializability ----------
add('serializability', 'dbms', /transaction|serializab|concurrency|schedule|acid|lock|precedence|recovery/i, (r) => {
  const items = ['X', 'Y', 'Z']; const tr = [1, 2, 3].slice(0, r.int(2, 3)); const ops = [];
  for (const t of tr) { const k = r.int(2, 3); for (let i = 0; i < k; i++) ops.push({ t, op: r.pick(['R', 'W']), x: r.pick(items), ord: r.next() }); }
  // keep each transaction's own order by sorting random keys per transaction
  const per = tr.map((t) => ops.filter((o) => o.t === t)); const seq = []; const pos = per.map(() => 0);
  while (seq.length < ops.length) { const c = per.map((_, i) => i).filter((i) => pos[i] < per[i].length); const i = r.pick(c); seq.push(per[i][pos[i]++]); }
  const edges = new Set();
  for (let i = 0; i < seq.length; i++) for (let j = i + 1; j < seq.length; j++) { const a = seq[i]; const b = seq[j]; if (a.t !== b.t && a.x === b.x && (a.op === 'W' || b.op === 'W')) edges.add(`${a.t}>${b.t}`); }
  const E = [...edges].map((e) => e.split('>').map(Number)); const indeg = Object.fromEntries(tr.map((t) => [t, 0])); E.forEach(([, b]) => { indeg[b]++; });
  const order = []; const q = tr.filter((t) => !indeg[t]); const ind = { ...indeg };
  while (q.length) { const t = q.shift(); order.push(t); E.filter(([a]) => a === t).forEach(([, b]) => { if (--ind[b] === 0) q.push(b); }); }
  const ok = order.length === tr.length;
  const sched = seq.map((o) => `${o.op}${o.t}(${o.x})`).join(' ');
  return out(`Consider the schedule S: ${sched}. Draw the precedence (serialization) graph, determine whether S is conflict serializable, and if it is, give an equivalent serial schedule.`,
    `Edges (Ti → Tj for conflicting operations on the same item with at least one write): ${E.length ? E.map(([a, b]) => `T${a}→T${b}`).join(', ') : 'none'}. ${ok ? `The graph has no cycle, so S is conflict serializable; an equivalent serial order is ${order.map((t) => `T${t}`).join(' → ')}.` : 'The graph contains a cycle, so S is NOT conflict serializable.'}`);
});

add('blocking-factor', 'dbms', /file organi[sz]ation|blocking factor|indexing|b\\+? ?tree|disk block|storage structure|hashing technique/i, (r) => {
  const B = r.pick([512, 1024, 2048, 4096]); const R = r.pick([60, 80, 100, 120, 150]); const rec = r.pick([2000, 5000, 10000, 20000, 50000]);
  const bf = Math.floor(B / R); const blocks = Math.ceil(rec / bf); const pt = r.pick([4, 6, 8]); const k = r.pick([10, 12, 16]);
  const order = Math.floor((B + k) / (pt + k));
  return out(`A file has ${rec} fixed-length records of ${R} bytes each stored in blocks of ${B} bytes (unspanned). Calculate (i) the blocking factor, (ii) the number of blocks needed, and (iii) the number of block accesses for a binary search on the file. (iv) If a B-tree node must hold pointers of ${pt} bytes and keys of ${k} bytes, find the maximum order p that fits in one block, using p·${pt} + (p-1)·${k} ≤ ${B}.`,
    `(i) bf = ⌊${B}/${R}⌋ = ${bf}. (ii) Blocks = ⌈${rec}/${bf}⌉ = ${blocks}. (iii) Binary search ≈ ⌈log₂ ${blocks}⌉ = ${Math.ceil(Math.log2(blocks))} block accesses. (iv) p = ${order} (largest p with ${order}×${pt} + ${order - 1}×${k} = ${order * pt + (order - 1) * k} ≤ ${B}).`);
});

module.exports = G;
module.exports.closure = closure; module.exports.keys = keys; module.exports.normalForm = normalForm;
