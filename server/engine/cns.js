const { gcd, modpow, modinv, PRIMES, f, rows, out } = require('./core');
const G = [];
const add = (id, cat, re, make) => G.push({ id, cat, re, make });
const A = 65;
const WORDS = ['NETWORK', 'SECURITY', 'CIPHER', 'ENCRYPT', 'FIREWALL', 'PROTOCOL', 'MESSAGE', 'SECRET', 'GATEWAY', 'PACKET', 'ATTACK', 'DEFENCE', 'HASHING', 'SERVER'];
const caesar = (s, k) => [...s].map((c) => String.fromCharCode(((c.charCodeAt(0) - A + k + 26) % 26) + A)).join('');
const vig = (s, key, dir = 1) => [...s].map((c, i) => String.fromCharCode(((c.charCodeAt(0) - A + dir * (key.charCodeAt(i % key.length) - A) + 26) % 26) + A)).join('');
const affine = (s, a, b) => [...s].map((c) => String.fromCharCode(((a * (c.charCodeAt(0) - A) + b) % 26) + A)).join('');
const hill = (s, k) => { let o = ''; for (let i = 0; i < s.length; i += 2) { const x = s.charCodeAt(i) - A; const y = s.charCodeAt(i + 1) - A; o += String.fromCharCode(((k[0] * x + k[1] * y) % 26) + A) + String.fromCharCode(((k[2] * x + k[3] * y) % 26) + A); } return o; };

add('classical-ciphers', 'cns', /classical|caesar|substitution|vigen|affine|hill cipher|transposition|playfair|(?<!a)symmetric/i, (r) => {
  const kind = r.pick(['caesar', 'vigenere', 'affine', 'hill']);
  if (kind === 'caesar') {
    const w = r.pick(WORDS); const k = r.int(3, 13); const c = caesar(w, k);
    if (caesar(c, -k) !== w) throw new Error('caesar');
    return out(`Using a Caesar cipher with a shift of ${k}, (i) encrypt the plaintext "${w}" and (ii) decrypt the ciphertext "${c}" back to its plaintext, stating the rule used in each direction.`, `(i) ${w} → ${c} using C = (P + ${k}) mod 26. (ii) "${c}" → ${w} using P = (C - ${k}) mod 26.`);
  }
  if (kind === 'vigenere') {
    const w = r.pick(WORDS); const key = r.pick(['KEY', 'LEMON', 'CODE', 'SAFE', 'BLUE']); const c = vig(w, key);
    if (vig(c, key, -1) !== w) throw new Error('vig');
    return out(`Encrypt the plaintext "${w}" using the Vigenère cipher with the keyword "${key}" (repeat the key as needed) and show how the ciphertext is decrypted again.`, `Add each plaintext letter to the repeated key letter (A=0...Z=25) modulo 26: ${w} → ${c}. Decryption subtracts the key letters modulo 26 and returns "${vig(c, key, -1)}".`);
  }
  if (kind === 'affine') {
    const a = r.pick([3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]); const b = r.int(1, 25); const w = r.pick(WORDS); const c = affine(w, a, b); const inv = modinv(a, 26);
    const back = affine(c, inv, ((-inv * b) % 26 + 26) % 26); if (back !== w) throw new Error('affine');
    return out(`An affine cipher uses the key (a, b) = (${a}, ${b}) with C = (aP + b) mod 26. Encrypt the plaintext "${w}", find the multiplicative inverse of ${a} modulo 26 and write the decryption function.`, `${w} → ${c}. a⁻¹ mod 26 = ${inv}. Decryption: P = ${inv}(C - ${b}) mod 26 = ${inv}C + ${((-inv * b) % 26 + 26) % 26} (mod 26).`);
  }
  let k; do { k = [r.int(1, 9), r.int(1, 9), r.int(1, 9), r.int(1, 9)]; } while (gcd(((k[0] * k[3] - k[1] * k[2]) % 26 + 26) % 26, 26) !== 1);
  const w = r.pick(['HELP', 'MEET', 'SAFE', 'CODE', 'DATA', 'LOCK']); const c = hill(w, k); const det = ((k[0] * k[3] - k[1] * k[2]) % 26 + 26) % 26;
  return out(`Encrypt the plaintext "${w}" with a Hill cipher using the key matrix K = [${k[0]} ${k[1]} ; ${k[2]} ${k[3]}] (A=0, ..., Z=25, blocks of 2 letters). Also verify that K is a valid key.`, `Blocks: ${w.slice(0, 2)}, ${w.slice(2)}. C = K·P mod 26 gives "${c}". det(K) = ${det} (mod 26) and gcd(${det}, 26) = 1, so K is invertible modulo 26 and valid.`);
});

add('rsa', 'cns', /\\brsa\\b|public key|(?<!a)symmetric key|asymmetric|digital signature/i, (r) => {
  const ps = PRIMES(5, 23); let p; let q; let e; let n; let phi; let d;
  for (let t = 0; t < 100; t++) {
    p = r.pick(ps); q = r.pick(ps); if (p === q) continue; n = p * q; phi = (p - 1) * (q - 1);
    const es = [3, 5, 7, 11, 13, 17].filter((x) => x < phi && gcd(x, phi) === 1); if (!es.length) continue; e = r.pick(es); d = modinv(e, phi); if (d && d !== e) break;
  }
  const M = r.int(2, n - 2); const C = modpow(M, e, n); if (modpow(C, d, n) !== M || (e * d) % phi !== 1) throw new Error('rsa check');
  const S = modpow(M, d, n); if (modpow(S, e, n) !== M) throw new Error('rsa sign');
  return out(`In an RSA teaching example, p = ${p}, q = ${q} and the public exponent e = ${e}. Calculate n, φ(n) and the private key d, then (i) encrypt the message M = ${M} and (ii) decrypt the result to verify it, and (iii) find the signature of M using the private key.`,
    `n = ${p}×${q} = ${n}; φ(n) = ${p - 1}×${q - 1} = ${phi}; d = e⁻¹ mod φ(n) = ${d} (since ${e}×${d} = ${e * d} ≡ 1 mod ${phi}). (i) C = M^e mod n = ${M}^${e} mod ${n} = ${C}. (ii) M = C^d mod n = ${modpow(C, d, n)}. (iii) S = M^d mod n = ${S}; verification S^e mod n = ${modpow(S, e, n)}. (Small numbers are for teaching only - not secure.)`);
});

add('diffie-hellman', 'cns', /diffie|hellman|key exchange|key agreement|key management|key distribution/i, (r) => {
  let p; let g; const ps = PRIMES(11, 47);
  for (;;) { p = r.pick(ps); const roots = []; for (let c = 2; c < p; c++) { const seen = new Set(); let x = 1; for (let i = 0; i < p - 1; i++) { x = (x * c) % p; seen.add(x); } if (seen.size === p - 1) roots.push(c); } if (roots.length) { g = r.pick(roots); break; } }
  const a = r.int(2, p - 2); const b = r.int(2, p - 2); const Ya = modpow(g, a, p); const Yb = modpow(g, b, p); const ka = modpow(Yb, a, p); const kb = modpow(Ya, b, p);
  if (ka !== kb) throw new Error('dh check');
  return out(`Alice and Bob use the Diffie–Hellman key exchange with the public values p = ${p} and g = ${g}. Alice's private key is ${a} and Bob's private key is ${b}. Calculate the public values each of them sends and the shared secret key, and explain why an eavesdropper cannot easily find it.`,
    `Alice sends A = g^a mod p = ${g}^${a} mod ${p} = ${Ya}. Bob sends B = ${g}^${b} mod ${p} = ${Yb}. Alice computes B^a mod p = ${ka}; Bob computes A^b mod p = ${kb}. Shared secret = ${ka}. An eavesdropper sees p, g, A, B but would need the discrete logarithm (reasoning to be reviewed by the instructor).`);
});

add('number-theory', 'cns', /euclid|\\bgcd\\b|euler|totient|modular arithmetic|fermat|congruen|number theory|primality/i, (r) => {
  let m; let a; do { m = r.int(20, 99); a = r.int(3, m - 1); } while (gcd(a, m) !== 1);
  const inv = modinv(a, m); if ((a * inv) % m !== 1) throw new Error('inv');
  const phi = (() => { let c = 0; for (let i = 1; i <= m; i++) if (gcd(i, m) === 1) c++; return c; })();
  const b = r.int(5, 40); const e = r.int(10, 60);
  return out(`Using the extended Euclidean algorithm, find the multiplicative inverse of ${a} modulo ${m}. Also compute Euler's totient φ(${m}) and the value of ${b}^${e} mod ${m} using fast exponentiation.`,
    `${a}⁻¹ mod ${m} = ${inv} (check: ${a}×${inv} = ${a * inv} ≡ 1 mod ${m}). φ(${m}) = ${phi}. ${b}^${e} mod ${m} = ${modpow(b, e, m)}.`);
});

add('hash-mac', 'cns', /hash|digest|integrity|authentication|mac\b|checksum|message authentication/i, (r) => {
  const w = r.pick(WORDS); const mod = r.pick([97, 101, 127, 251]); const h = [...w].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % mod, 7);
  const w2 = w.slice(0, -1) + String.fromCharCode(((w.charCodeAt(w.length - 1) - A + 1) % 26) + A); const h2 = [...w2].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % mod, 7);
  return out(`A toy hash function (for classroom use only) is defined as H = 7 initially, then for each character c: H = (H × 31 + ASCII(c)) mod ${mod}. Calculate the hash of "${w}" and of "${w2}" and explain what this shows about the avalanche effect of a real hash function.`,
    `H("${w}") = ${h}; H("${w2}") = ${h2}. ${h === h2 ? 'Both collide here.' : 'A one-letter change gives a different digest.'} A real cryptographic hash (e.g. SHA-256) changes about half of its output bits for a one-bit change (explanation to be reviewed by the instructor).`);
});

module.exports = G;
module.exports.caesar = caesar; module.exports.vig = vig;
