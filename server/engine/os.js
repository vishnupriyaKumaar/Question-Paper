const { f, sum, rows, out } = require('./core');
const G = [];
const add = (id, cat, re, make) => G.push({ id, cat, re, make });

// ---------- CPU scheduling simulators (exported for tests) ----------
function schedule(procs, algo, q = 2) {
  const P = procs.map((p, i) => ({ ...p, i, rem: p.bt, ct: 0, started: -1 }));
  let t = 0; const gantt = []; let done = 0;
  const push = (name, s, e) => { if (e <= s) return; const l = gantt[gantt.length - 1]; if (l && l.name === name && l.e === s) l.e = e; else gantt.push({ name, s, e }); };
  if (algo === 'FCFS') {
    for (const p of P.slice().sort((a, b) => a.at - b.at || a.i - b.i)) { if (t < p.at) { push('idle', t, p.at); t = p.at; } p.started = t; push(p.name, t, t + p.bt); t += p.bt; p.ct = t; p.rem = 0; }
  } else if (algo === 'SJF' || algo === 'PRIORITY') {
    const key = (p) => (algo === 'SJF' ? p.bt : p.pr);
    while (done < P.length) {
      const ready = P.filter((p) => p.rem > 0 && p.at <= t).sort((a, b) => key(a) - key(b) || a.at - b.at || a.i - b.i);
      if (!ready.length) { const nx = Math.min(...P.filter((p) => p.rem > 0).map((p) => p.at)); push('idle', t, nx); t = nx; continue; }
      const p = ready[0]; p.started = t; push(p.name, t, t + p.bt); t += p.bt; p.ct = t; p.rem = 0; done++;
    }
  } else if (algo === 'SRTF') {
    while (done < P.length) {
      const ready = P.filter((p) => p.rem > 0 && p.at <= t).sort((a, b) => a.rem - b.rem || a.at - b.at || a.i - b.i);
      if (!ready.length) { const nx = Math.min(...P.filter((p) => p.rem > 0).map((p) => p.at)); push('idle', t, nx); t = nx; continue; }
      const p = ready[0]; if (p.started < 0) p.started = t; push(p.name, t, t + 1); t += 1; p.rem -= 1; if (p.rem === 0) { p.ct = t; done++; }
    }
  } else if (algo === 'RR') {
    const order = P.slice().sort((a, b) => a.at - b.at || a.i - b.i); const queue = []; let nxt = 0;
    const admit = () => { while (nxt < order.length && order[nxt].at <= t) queue.push(order[nxt++]); };
    admit();
    while (done < P.length) {
      if (!queue.length) { push('idle', t, order[nxt].at); t = order[nxt].at; admit(); continue; }
      const p = queue.shift(); if (p.started < 0) p.started = t;
      const run = Math.min(q, p.rem); push(p.name, t, t + run); t += run; p.rem -= run; admit();
      if (p.rem > 0) queue.push(p); else { p.ct = t; done++; }
    }
  }
  const res = P.map((p) => ({ name: p.name, at: p.at, bt: p.bt, pr: p.pr, ct: p.ct, tat: p.ct - p.at, wt: p.ct - p.at - p.bt, rt: p.started - p.at }));
  return { res, gantt, avgWT: sum(res.map((x) => x.wt)) / res.length, avgTAT: sum(res.map((x) => x.tat)) / res.length, avgRT: sum(res.map((x) => x.rt)) / res.length };
}
const NAMES = ['P1', 'P2', 'P3', 'P4', 'P5'];
add('cpu-scheduling', 'os', /schedul|\\bcpu\\b|process management|fcfs|sjf|round robin|priority scheduling|turnaround|waiting time/i, (r) => {
  const algo = r.pick(['FCFS', 'SJF', 'SRTF', 'RR', 'PRIORITY']); const n = r.int(4, 5); const q = r.pick([2, 3, 4]);
  const procs = NAMES.slice(0, n).map((name) => ({ name, at: r.int(0, 6), bt: r.int(2, 9), pr: r.int(1, 5) }));
  procs[0].at = 0;
  const s = schedule(procs, algo, q);
  // invariants: every process finishes, busy time equals total burst time, TAT = CT - AT, WT >= 0
  const busy = sum(s.gantt.filter((g) => g.name !== 'idle').map((g) => g.e - g.s));
  if (busy !== sum(procs.map((p) => p.bt)) || s.res.some((x) => x.wt < 0 || x.tat !== x.ct - x.at)) throw new Error('schedule check failed');
  const label = { FCFS: 'First Come First Served (FCFS)', SJF: 'non-preemptive Shortest Job First (SJF)', SRTF: 'Shortest Remaining Time First (preemptive SJF)', RR: `Round Robin with a time quantum of ${q} ms`, PRIORITY: 'non-preemptive Priority scheduling (a smaller number means a higher priority)' }[algo];
  const data = rows(procs.map((p) => `${p.name} (arrival ${p.at}, burst ${p.bt}${algo === 'PRIORITY' ? `, priority ${p.pr}` : ''})`));
  const g = s.gantt.map((x) => `${x.name} [${x.s}-${x.e}]`).join(' → ');
  return out(`Consider these processes (times in ms): ${data}. Draw the Gantt chart for ${label} and calculate the completion time, turnaround time and waiting time of every process, and the average turnaround time and average waiting time.`,
    `Gantt: ${g}. ${s.res.map((x) => `${x.name}: CT=${x.ct}, TAT=${x.tat}, WT=${x.wt}`).join('; ')}. Average WT = ${f(s.avgWT, 2)} ms, average TAT = ${f(s.avgTAT, 2)} ms.`);
});

// ---------- page replacement ----------
function pageFaults(ref, frames, algo) {
  let mem = []; let faults = 0; const trace = [];
  ref.forEach((pg, i) => {
    const hit = mem.includes(pg);
    if (!hit) {
      faults++;
      if (mem.length < frames) mem.push(pg);
      else if (algo === 'FIFO') { mem.shift(); mem.push(pg); }
      else if (algo === 'LRU') {
        let lru = 0; let best = Infinity;
        mem.forEach((m, k) => { const last = ref.slice(0, i).lastIndexOf(m); if (last < best) { best = last; lru = k; } });
        mem.splice(lru, 1); mem.push(pg);
      } else {
        let far = 0; let bd = -1;
        mem.forEach((m, k) => { const nx = ref.indexOf(m, i + 1); const d = nx < 0 ? Infinity : nx; if (d > bd) { bd = d; far = k; } });
        mem[far] = pg;
      }
    }
    trace.push(`${pg}${hit ? ' hit' : ' fault'}`);
  });
  return { faults, trace };
}
add('page-replacement', 'os', /page replacement|paging|virtual memory|demand paging|fifo|\\blru\\b|thrash/i, (r) => {
  const frames = r.int(3, 4); const len = r.int(12, 16); const ref = Array.from({ length: len }, () => r.int(0, 6));
  const algo = r.pick(['FIFO', 'LRU', 'OPT']); const a = pageFaults(ref, frames, algo);
  const all = ['FIFO', 'LRU', 'OPT'].map((x) => `${x}: ${pageFaults(ref, frames, x).faults}`);
  const full = algo === 'FIFO' ? 'First-In-First-Out (FIFO)' : algo === 'LRU' ? 'Least Recently Used (LRU)' : 'Optimal';
  const hits = len - a.faults;
  return out(`A process refers to the pages ${ref.join(', ')} in this order, and the memory has ${frames} empty frames. Show the contents of the frames after each page reference and calculate the total number of page faults and the hit ratio using the ${full} page-replacement algorithm.`,
    `${full}: ${a.faults} page faults, ${hits} hits, hit ratio = ${hits}/${len} = ${f(hits / len, 3)}. Trace: ${a.trace.join(', ')}. (For comparison with the same string and frames - ${all.join(', ')}.)`);
});

// ---------- Banker's algorithm ----------
function banker(alloc, max, avail) {
  const n = alloc.length; const need = alloc.map((a, i) => a.map((x, j) => max[i][j] - x));
  const work = avail.slice(); const fin = Array(n).fill(false); const seq = [];
  for (let guard = 0; guard < n; guard++) {
    let progressed = false;
    for (let i = 0; i < n; i++) {
      if (!fin[i] && need[i].every((x, j) => x <= work[j])) { alloc[i].forEach((x, j) => { work[j] += x; }); fin[i] = true; seq.push(`P${i}`); progressed = true; }
    }
    if (!progressed) break;
  }
  return { need, safe: fin.every(Boolean), seq };
}
add('bankers', 'os', /deadlock|banker|resource allocation|safe state|safe sequence|avoidance/i, (r) => {
  const n = 5; const m = 3; let alloc; let max; let avail; let b;
  for (let tries = 0; tries < 50; tries++) {
    max = Array.from({ length: n }, () => Array.from({ length: m }, () => r.int(1, 8)));
    alloc = max.map((row) => row.map((x) => r.int(0, x)));
    avail = Array.from({ length: m }, () => r.int(0, 4));
    b = banker(alloc, max, avail);
    if (b.safe || r.chance(0.2)) break;
  }
  const names = ['A', 'B', 'C'];
  const tab = (t) => rows(t.map((row, i) => `P${i}: ${row.join(' ')}`));
  const sentence = b.safe ? `The system is in a SAFE state. A safe sequence is <${b.seq.join(', ')}>.` : `The system is NOT in a safe state (no process can be completed from the remaining resources: finished order reached = ${b.seq.length ? b.seq.join(', ') : 'none'}).`;
  return out(`A system has 5 processes (P0-P4) and 3 resource types (${names.join(', ')}). Allocation (${names.join(' ')}) - ${tab(alloc)}. Maximum - ${tab(max)}. Available = ${avail.join(' ')}. Using the Banker's algorithm, (i) find the Need matrix and (ii) determine whether the system is in a safe state, giving a safe sequence if one exists.`,
    `Need = Max - Allocation: ${tab(b.need)}. ${sentence}`);
});

// ---------- disk scheduling ----------
function disk(reqs, head, max, algo, dir = 'up') {
  const path = [head]; let rest = reqs.slice();
  if (algo === 'FCFS') path.push(...reqs);
  else if (algo === 'SSTF') { let cur = head; while (rest.length) { let bi = 0; rest.forEach((x, i) => { if (Math.abs(x - cur) < Math.abs(rest[bi] - cur)) bi = i; }); cur = rest[bi]; path.push(cur); rest.splice(bi, 1); } }
  else {
    const lo = rest.filter((x) => x < head).sort((a, b) => b - a); const hi = rest.filter((x) => x >= head).sort((a, b) => a - b);
    if (algo === 'SCAN') { if (dir === 'up') { path.push(...hi, max, ...lo); } else { path.push(...lo, 0, ...hi); } }
    else if (algo === 'CSCAN') { path.push(...hi, max, 0, ...lo.slice().reverse()); }
    else if (algo === 'LOOK') { if (dir === 'up') path.push(...hi, ...lo); else path.push(...lo, ...hi); }
  }
  let total = 0; for (let i = 1; i < path.length; i++) total += Math.abs(path[i] - path[i - 1]);
  return { total, path };
}
add('disk-scheduling', 'os', /disk|seek|\\bscan\\b|c-scan|sstf|secondary storage|mass storage/i, (r) => {
  const max = r.pick([199, 199, 255]); const reqs = Array.from(new Set(Array.from({ length: 8 }, () => r.int(5, max - 5)))); const head = r.int(20, max - 20);
  const algo = r.pick(['FCFS', 'SSTF', 'SCAN', 'CSCAN', 'LOOK']); const dir = r.pick(['up', 'down']);
  const d = disk(reqs, head, max, algo, dir);
  const name = { FCFS: 'FCFS', SSTF: 'SSTF', SCAN: `SCAN (the head first moves towards ${dir === 'up' ? max : 0})`, CSCAN: 'C-SCAN (the head moves towards the higher cylinders and jumps back through 0; count the return jump)', LOOK: `LOOK (the head first moves towards the ${dir === 'up' ? 'higher' : 'lower'} cylinders)` }[algo];
  return out(`A disk has cylinders 0 to ${max}. The request queue is ${reqs.join(', ')} and the head is currently at cylinder ${head}. Find the order in which requests are served and the total head movement using ${name}.`,
    `Service order: ${d.path.join(' → ')}. Total head movement = ${d.total} cylinders.`);
});

add('memory-allocation', 'os', /memory management|first fit|best fit|worst fit|partition|memory allocation|fragmentation|contiguous/i, (r) => {
  const parts = Array.from({ length: 5 }, () => r.pick([100, 150, 200, 250, 300, 350, 400, 500, 600])); const procs = Array.from({ length: 4 }, () => r.pick([90, 120, 180, 210, 240, 280, 330, 450]));
  const algo = r.pick(['first', 'best', 'worst']);
  const free = parts.slice(); const res = procs.map((p) => {
    let idx = -1;
    free.forEach((s, i) => { if (s >= p) { if (idx < 0 || (algo === 'first' ? false : algo === 'best' ? s < free[idx] : s > free[idx])) idx = i; } });
    if (idx < 0) return `${p} KB → not allocated`; const where = idx + 1; free[idx] -= p; return `${p} KB → partition ${where}`;
  });
  return out(`The memory has partitions of ${parts.join(', ')} KB (in this order). Processes of sizes ${procs.join(', ')} KB arrive in this order. Show how the ${algo}-fit strategy allocates them and find the total memory left unused in the partitions.`,
    `${algo}-fit: ${res.join('; ')}. Remaining free space in partitions = ${free.join(', ')} KB (total ${sum(free)} KB).`);
});

add('address-translation', 'os', /paging|page table|segment|logical address|physical address|address translation|tlb|effective access/i, (r) => {
  const ps = r.pick([256, 512, 1024, 2048]); const frames = r.int(8, 40); const pages = r.int(5, 12);
  const pt = Array.from({ length: pages }, (_, i) => i); const fr = r.shuffle(Array.from({ length: frames }, (_, i) => i)).slice(0, pages);
  const pg = r.int(0, pages - 1); const off = r.int(0, ps - 1); const la = pg * ps + off; const pa = fr[pg] * ps + off;
  const tlb = r.pick([20, 50]); const mem = r.pick([100, 200]); const h = r.pick([0.8, 0.9, 0.95]);
  const eat = h * (tlb + mem) + (1 - h) * (tlb + 2 * mem);
  return out(`A system uses paging with a page size of ${ps} bytes. The page table (page → frame) is: ${rows(pt.map((p) => `${p} → ${fr[p]}`))}. (i) Translate the logical address ${la} into a physical address. (ii) If a TLB lookup takes ${tlb} ns, a memory access takes ${mem} ns and the TLB hit ratio is ${h * 100}%, find the effective memory access time.`,
    `(i) Page number = ${la} div ${ps} = ${pg}, offset = ${la} mod ${ps} = ${off}. Frame = ${fr[pg]}, so physical address = ${fr[pg]} × ${ps} + ${off} = ${pa}. (ii) EAT = ${h}(${tlb} + ${mem}) + ${f(1 - h, 2)}(${tlb} + 2×${mem}) = ${f(eat, 2)} ns.`);
});

module.exports = G;
module.exports.schedule = schedule; module.exports.pageFaults = pageFaults; module.exports.banker = banker; module.exports.disk = disk;
