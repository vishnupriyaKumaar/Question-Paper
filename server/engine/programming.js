const { f, sum, rows, out } = require('./core');
const G = [];
const add = (id, cat, re, make) => G.push({ id, cat, re, make });
const oneLine = (s) => s.replace(/\s*\n\s*/g, ' ');
let LANG = 'C'; // set by the engine from the subject name
const setLang = (l) => { LANG = l || 'C'; };
const lang = () => LANG;

add('loop-output', 'programming', /loop|iteration|control (flow|structure)|conditional|operators?|expressions?|c programming|java programming|python programming/i, (r) => {
  const a = r.int(1, 4); const b = r.int(8, 20); const s = r.pick([1, 3]); const k = r.pick([2, 3, 4]);
  let total = 0; for (let i = a; i <= b; i += s) if (i % k !== 0) total += i; else total -= 1;
  const L = lang();
  const code = L === 'Python'
    ? `total = 0\nfor i in range(${a}, ${b + 1}, ${s}):\n    if i % ${k} != 0:\n        total += i\n    else:\n        total -= 1\nprint(total)`
    : L === 'Java'
      ? `int total = 0;\nfor (int i = ${a}; i <= ${b}; i += ${s}) {\n    if (i % ${k} != 0) total += i;\n    else total -= 1;\n}\nSystem.out.println(total);`
      : `int total = 0;\nfor (int i = ${a}; i <= ${b}; i += ${s}) {\n    if (i % ${k} != 0) total += i;\n    else total -= 1;\n}\nprintf("%d", total);`;
  const trace = []; for (let i = a; i <= b; i += s) trace.push(`${i}:${i % k !== 0 ? '+' + i : '-1'}`);
  return out(`Predict the output of the following ${L} fragment and show the trace of the loop: ${oneLine(code)}`, `Output = ${total}. Trace (i : change) = ${trace.join(', ')}.`);
});

const fib = (n) => (n < 2 ? n : fib(n - 1) + fib(n - 2));
add('recursion', 'programming', /recursi|call stack|factorial|fibonacci|divide and conquer/i, (r) => {
  const kind = r.pick(['fib', 'gcd', 'sum', 'power']); const L = lang(); let code; let ans; let call; let calls = null;
  const fn = { fib: 'fib', gcd: 'gcd', sum: 'sumTo', power: 'power' }[kind];
  if (kind === 'fib') { const n = r.int(5, 8); let c = 0; const g = (x) => { c++; return x < 2 ? x : g(x - 1) + g(x - 2); }; ans = g(n); calls = c; call = `fib(${n})`; code = L === 'Python' ? 'def fib(n):\n    if n < 2: return n\n    return fib(n - 1) + fib(n - 2)' : `int fib(int n) {\n    if (n < 2) return n;\n    return fib(n - 1) + fib(n - 2);\n}`; }
  if (kind === 'gcd') { const a = r.int(20, 90); const b = r.int(10, 60); const g = (x, y) => (y === 0 ? x : g(y, x % y)); ans = g(a, b); call = `gcd(${a}, ${b})`; code = L === 'Python' ? 'def gcd(a, b):\n    return a if b == 0 else gcd(b, a % b)' : `int gcd(int a, int b) {\n    return (b == 0) ? a : gcd(b, a % b);\n}`; }
  if (kind === 'sum') { const n = r.int(5, 12); ans = (n * (n + 1)) / 2; call = `sumTo(${n})`; code = L === 'Python' ? 'def sumTo(n):\n    return 0 if n == 0 else n + sumTo(n - 1)' : `int sumTo(int n) {\n    return (n == 0) ? 0 : n + sumTo(n - 1);\n}`; }
  if (kind === 'power') { const b = r.int(2, 4); const e = r.int(3, 7); ans = b ** e; call = `power(${b}, ${e})`; code = L === 'Python' ? 'def power(b, e):\n    return 1 if e == 0 else b * power(b, e - 1)' : `int power(int b, int e) {\n    return (e == 0) ? 1 : b * power(b, e - 1);\n}`; }
  return out(`Trace the execution of the ${L} function below for the call ${call}, show the sequence of recursive calls and find the value returned: ${oneLine(code)}`, `${call} returns ${ans}.${calls ? ` The recursion makes ${calls} calls in total.` : ''}`);
});

add('sorting-trace', 'programming', /sort|binary search|searching|linear search/i, (r) => {
  const n = r.int(6, 8); const a = Array.from({ length: n }, () => r.int(5, 60)); const k = r.int(2, 3);
  const kind = r.pick(['bubble', 'selection', 'insertion', 'binary']);
  if (kind === 'binary') {
    const s = Array.from(new Set(a)).sort((x, y) => x - y); const t = r.chance(0.7) ? r.pick(s) : r.int(1, 70); let lo = 0; let hi = s.length - 1; let steps = 0; let found = -1; const mids = [];
    while (lo <= hi) { const m = (lo + hi) >> 1; steps++; mids.push(`mid=${m} (${s[m]})`); if (s[m] === t) { found = m; break; } if (s[m] < t) lo = m + 1; else hi = m - 1; }
    return out(`Apply binary search to find the key ${t} in the sorted array [${s.join(', ')}] (indices from 0). Show every comparison, the number of comparisons made and the result.`, `Comparisons: ${mids.join(', ')}. Number of comparisons = ${steps}. ${found >= 0 ? `Key found at index ${found}.` : 'Key not found.'}`);
  }
  const x = a.slice(); const states = [];
  if (kind === 'bubble') { for (let p = 0; p < k; p++) { for (let i = 0; i < n - 1 - p; i++) if (x[i] > x[i + 1]) [x[i], x[i + 1]] = [x[i + 1], x[i]]; states.push(`pass ${p + 1}: [${x.join(', ')}]`); } }
  if (kind === 'selection') { for (let p = 0; p < k; p++) { let m = p; for (let i = p + 1; i < n; i++) if (x[i] < x[m]) m = i; [x[p], x[m]] = [x[m], x[p]]; states.push(`pass ${p + 1}: [${x.join(', ')}]`); } }
  if (kind === 'insertion') { for (let i = 1; i <= k; i++) { const v = x[i]; let j = i - 1; while (j >= 0 && x[j] > v) { x[j + 1] = x[j]; j--; } x[j + 1] = v; states.push(`after inserting element ${i + 1}: [${x.join(', ')}]`); } }
  const full = a.slice().sort((p, q) => p - q);
  return out(`Apply ${kind} sort (ascending) to the array [${a.join(', ')}] and write the contents of the array after each of the first ${k} ${kind === 'insertion' ? 'insertions (the first element is already sorted)' : 'passes'}. Also give the final sorted array.`, `${states.join('; ')}. Final sorted array = [${full.join(', ')}].`);
});

add('loop-complexity', 'programming', /complexity|big.?o|asymptotic|analysis of algorithm|running time/i, (r) => {
  const n = r.pick([16, 32, 64, 100, 128, 200]); const kind = r.pick(['double', 'nested', 'tri']);
  let c = 0; let code; let big;
  if (kind === 'double') { for (let i = 1; i < n; i *= 2) c++; code = `for (i = 1; i < n; i *= 2) { count++; }`; big = 'O(log n)'; }
  if (kind === 'nested') { for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) c++; code = `for (i = 0; i < n; i++) for (j = 0; j < 3; j++) { count++; }`; big = 'O(n)'; }
  if (kind === 'tri') { for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) c++; code = `for (i = 0; i < n; i++) for (j = 0; j < i; j++) { count++; }`; big = 'O(n²)'; }
  return out(`For the loop ${code}, find the exact value of count when n = ${n} and express the running time in Big-O notation, justifying your answer.`, `count = ${c} for n = ${n}. Time complexity = ${big}.`);
});

add('data-structure-ops', 'programming', /stack|queue|binary (search )?tree|\\bbst\\b|traversal|hash(ing)? table|collision/i, (r) => {
  const kind = r.pick(['stack', 'bst', 'hash', 'queue']);
  if (kind === 'stack') { const st = []; const log = []; const ops = []; const n = r.int(7, 10); for (let i = 0; i < n; i++) { if (st.length > 1 && r.chance(0.4)) { ops.push('pop'); log.push(`pop → ${st.pop()}`); } else { const v = r.int(1, 50); ops.push(`push(${v})`); st.push(v); } }
    return out(`A stack is initially empty. The operations ${ops.join(', ')} are performed in order. Show the value returned by each pop and the final contents of the stack (bottom to top).`, `Pops: ${log.length ? log.join(', ') : 'none'}. Final stack (bottom → top) = [${st.join(', ')}].`); }
  if (kind === 'queue') { const q = []; const log = []; const ops = []; const n = r.int(7, 10); for (let i = 0; i < n; i++) { if (q.length > 1 && r.chance(0.4)) { ops.push('dequeue'); log.push(`dequeue → ${q.shift()}`); } else { const v = r.int(1, 50); ops.push(`enqueue(${v})`); q.push(v); } }
    return out(`A queue is initially empty. The operations ${ops.join(', ')} are performed in order. Show the value returned by each dequeue and the final contents of the queue (front to rear).`, `Dequeues: ${log.length ? log.join(', ') : 'none'}. Final queue (front → rear) = [${q.join(', ')}].`); }
  if (kind === 'hash') { const m = r.pick([7, 10, 11]); const keys = Array.from(new Set(Array.from({ length: 6 }, () => r.int(10, 99)))); const t = Array(m).fill(null);
    keys.forEach((k) => { let i = k % m; while (t[i] !== null) i = (i + 1) % m; t[i] = k; });
    return out(`Insert the keys ${keys.join(', ')} in this order into an empty hash table of size ${m} using h(k) = k mod ${m} and linear probing for collisions. Show the final table.`, `Final table (index: key) = ${t.map((v, i) => `${i}: ${v === null ? '-' : v}`).join(', ')}.`); }
  const keys = Array.from(new Set(Array.from({ length: 7 }, () => r.int(10, 90)))); const root = { k: keys[0] };
  keys.slice(1).forEach((k) => { let c = root; for (;;) { const side = k < c.k ? 'l' : 'r'; if (!c[side]) { c[side] = { k }; break; } c = c[side]; } });
  const ino = (x) => (x ? [...ino(x.l), x.k, ...ino(x.r)] : []); const pre = (x) => (x ? [x.k, ...pre(x.l), ...pre(x.r)] : []); const post = (x) => (x ? [...post(x.l), ...post(x.r), x.k] : []); const h = (x) => (x ? 1 + Math.max(h(x.l), h(x.r)) : 0);
  if (ino(root).join() !== keys.slice().sort((a, b) => a - b).join()) throw new Error('bst check');
  return out(`Construct a binary search tree by inserting the keys ${keys.join(', ')} in the given order and write the inorder, preorder and postorder traversals. Also find the height of the tree (a single node has height 1).`, `Inorder = ${ino(root).join(', ')}; Preorder = ${pre(root).join(', ')}; Postorder = ${post(root).join(', ')}. Height = ${h(root)}. (Inorder is the sorted order, which checks the tree.)`);
});

module.exports = G;
module.exports.setLang = setLang;
