const { f, sum, rows, out } = require('./core');
const G = [];
const add = (id, cat, re, make) => G.push({ id, cat, re, make });
const ip = (n) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
const toInt = (a, b, c, d) => (((a << 24) | (b << 16) | (c << 8) | d) >>> 0);
const maskOf = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);

function subnet(addr, p) { const m = maskOf(p); const net = (addr & m) >>> 0; const bc = (net | (~m >>> 0)) >>> 0; return { mask: ip(m), net, bc, first: net + 1, last: bc - 1, hosts: 2 ** (32 - p) - 2 }; }
add('subnetting', 'networks', /subnet|ip address|cidr|addressing|network layer|vlsm|classful|netmask/i, (r) => {
  const kind = r.pick(['find', 'divide']);
  const a = r.pick([10, 172, 192]); const b = a === 192 ? 168 : a === 172 ? r.int(16, 31) : r.int(0, 255); const c = r.int(0, 255); const d = r.int(1, 254);
  if (kind === 'find') {
    const p = r.int(20, 28); const addr = toInt(a, b, c, d); const s = subnet(addr, p);
    return out(`A host has the IP address ${ip(addr)}/${p}. Find (i) the subnet mask, (ii) the network address, (iii) the broadcast address, (iv) the range of usable host addresses and (v) the number of usable hosts in this subnet.`,
      `(i) Mask = ${s.mask}. (ii) Network = ${ip(s.net)}. (iii) Broadcast = ${ip(s.bc)}. (iv) Usable hosts: ${ip(s.first)} to ${ip(s.last)}. (v) 2^${32 - p} - 2 = ${s.hosts} hosts.`);
  }
  const base = toInt(192, 168, c, 0); const k = r.pick([2, 4, 8, 16]); const bits = Math.log2(k); const p = 24 + bits; const size = 2 ** (32 - p);
  const nets = Array.from({ length: k }, (_, i) => `${ip(base + i * size)}/${p}`);
  const need = r.pick([k, k - 1]);
  return out(`The network 192.168.${c}.0/24 must be divided into ${need} equal-sized subnets. Find the new subnet mask, the number of usable hosts per subnet and the network address of every subnet.`,
    `${need} subnets need ${bits} borrowed bits (2^${bits} = ${k} ≥ ${need}). New prefix /${p}, mask ${ip(maskOf(p))}. Usable hosts per subnet = 2^${32 - p} - 2 = ${size - 2}. Subnet addresses: ${nets.slice(0, Math.max(need, 1)).join(', ')}${need < k ? ` (the ${k}-th subnet ${nets[k - 1]} is spare)` : ''}.`);
});

function crcRem(bits, gen) { const a = bits.split('').map(Number); const g = gen.split('').map(Number); for (let i = 0; i <= a.length - g.length; i++) if (a[i]) g.forEach((x, j) => { a[i + j] ^= x; }); return a.slice(a.length - (g.length - 1)).join(''); }
add('crc', 'networks', /crc|cyclic|error detection|parity|checksum|data link|framing/i, (r) => {
  const gen = r.pick(['1101', '1011', '10011', '1001']); const len = r.int(8, 11);
  const data = Array.from({ length: len }, (_, i) => (i === 0 ? 1 : r.int(0, 1))).join('');
  const rem = crcRem(data + '0'.repeat(gen.length - 1), gen); const frame = data + rem;
  if (!/^0+$/.test(crcRem(frame, gen))) throw new Error('crc check');
  const flip = r.int(0, frame.length - 1); const bad = frame.slice(0, flip) + (frame[flip] === '1' ? '0' : '1') + frame.slice(flip + 1);
  const detected = !/^0+$/.test(crcRem(bad, gen));
  return out(`A sender uses CRC with the generator polynomial ${gen} (the bit pattern). For the data bits ${data}, find the CRC remainder and the transmitted frame. Then check the received frame ${bad} and state whether an error is detected.`,
    `Append ${gen.length - 1} zeros and divide by ${gen} (modulo-2). Remainder = ${rem}; transmitted frame = ${frame}. The received frame ${bad} leaves remainder ${crcRem(bad, gen)}, so ${detected ? 'an error is detected' : 'the error is not detected'}.`);
});

add('hamming', 'networks', /hamming|error correct|single.?bit/i, (r) => {
  const d = Array.from({ length: 4 }, () => r.int(0, 1)); // d1..d4 at positions 3,5,6,7
  const cw = [0, 0, d[0], 0, d[1], d[2], d[3]];
  cw[0] = cw[2] ^ cw[4] ^ cw[6]; cw[1] = cw[2] ^ cw[5] ^ cw[6]; cw[3] = cw[4] ^ cw[5] ^ cw[6];
  const pos = r.int(1, 7); const rx = cw.slice(); rx[pos - 1] ^= 1;
  const s1 = rx[0] ^ rx[2] ^ rx[4] ^ rx[6]; const s2 = rx[1] ^ rx[2] ^ rx[5] ^ rx[6]; const s4 = rx[3] ^ rx[4] ^ rx[5] ^ rx[6]; const synd = s4 * 4 + s2 * 2 + s1;
  if (synd !== pos) throw new Error('hamming');
  return out(`Using the (7,4) Hamming code with even parity (parity bits at positions 1, 2 and 4, data bits d3 d5 d6 d7 at positions 3, 5, 6 and 7), encode the data bits ${d.join('')}. The word ${rx.join('')} is later received; find the position of the single-bit error and the corrected word.`,
    `Code word = ${cw.join('')} (p1 = ${cw[0]}, p2 = ${cw[1]}, p4 = ${cw[3]}). For the received word the check bits give the syndrome ${s4}${s2}${s1} = ${synd}, so bit ${synd} is in error. Corrected word = ${cw.join('')}.`);
});

add('delay-throughput', 'networks', /delay|throughput|latency|bandwidth|propagation|stop.?and.?wait|sliding window|flow control|efficiency|utili[sz]ation|go.?back|selective/i, (r) => {
  const L = r.pick([1000, 1500, 4000, 8000]) * 8; const R = r.pick([1, 2, 10, 100]) * 1e6; const dist = r.pick([500, 1000, 2000, 3000]); const v = 2e8;
  const tt = L / R; const tp = (dist * 1000) / v; const U = tt / (tt + 2 * tp); const W = r.pick([4, 7, 15]); const Uw = Math.min(1, (W * tt) / (tt + 2 * tp));
  const ms = (x) => f(x * 1000, 4);
  return out(`A link of ${dist} km carries frames of ${L / 8} bytes at ${R / 1e6} Mbps. The signal speed is 2×10⁸ m/s. Calculate (i) the transmission delay, (ii) the propagation delay, (iii) the link utilization of Stop-and-Wait and (iv) the utilization of a sliding-window protocol with window size ${W}.`,
    `(i) Tt = L/R = ${L}/${R} = ${ms(tt)} ms. (ii) Tp = d/v = ${ms(tp)} ms. (iii) U = Tt/(Tt + 2Tp) = ${f(U * 100, 3)}%. (iv) U = min(1, W·Tt/(Tt + 2Tp)) = ${f(Uw * 100, 3)}%.`);
});

add('shortest-path', 'networks', /routing|dijkstra|shortest path|distance vector|link state|bellman|ospf|rip\b|network layer/i, (r) => {
  const N = ['A', 'B', 'C', 'D', 'E', 'F']; const E = []; const w = {};
  for (let i = 1; i < N.length; i++) { const j = r.int(0, i - 1); E.push([N[j], N[i], r.int(1, 9)]); }
  for (let k = 0; k < 4; k++) { const a = r.pick(N); const b = r.pick(N); if (a !== b && !E.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) E.push([a, b, r.int(1, 9)]); }
  const adj = Object.fromEntries(N.map((n) => [n, []])); E.forEach(([a, b, c]) => { adj[a].push([b, c]); adj[b].push([a, c]); });
  const dist = Object.fromEntries(N.map((n) => [n, Infinity])); const prev = {}; dist.A = 0; const done = new Set();
  while (done.size < N.length) { const u = N.filter((n) => !done.has(n)).sort((x, y) => dist[x] - dist[y])[0]; if (dist[u] === Infinity) break; done.add(u); adj[u].forEach(([v, c]) => { if (dist[u] + c < dist[v]) { dist[v] = dist[u] + c; prev[v] = u; } }); }
  // Bellman-Ford cross-check
  const bf = Object.fromEntries(N.map((n) => [n, Infinity])); bf.A = 0; for (let i = 0; i < N.length; i++) E.forEach(([a, b, c]) => { if (bf[a] + c < bf[b]) bf[b] = bf[a] + c; if (bf[b] + c < bf[a]) bf[a] = bf[b] + c; });
  if (N.some((n) => bf[n] !== dist[n])) throw new Error('dijkstra check');
  const pathTo = (t) => { const p = [t]; while (prev[p[0]]) p.unshift(prev[p[0]]); return p.join('→'); };
  return out(`A network has the links (cost): ${E.map(([a, b, c]) => `${a}-${b} (${c})`).join(', ')}. Using Dijkstra's algorithm, find the least-cost path from router A to every other router and the cost of each path.`,
    N.slice(1).map((n) => (dist[n] === Infinity ? `${n}: unreachable` : `${n}: ${pathTo(n)} (cost ${dist[n]})`)).join('; ') + '. (Equal-cost alternative paths, if any, are also acceptable.)');
});

module.exports = G;
module.exports.crcRem = crcRem; module.exports.subnet = subnet; module.exports.ip = ip; module.exports.toInt = toInt;
