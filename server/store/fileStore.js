// Local JSON-file store. Used automatically when no Firebase variables are set
// (local testing only - on most hosts the disk is wiped on redeploy).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const seed = require('./seed');

// Vercel's disk is read-only except /tmp (and /tmp is wiped), so use Firebase there.
const DIR = process.env.DATA_DIR || (process.env.VERCEL ? path.join(require('os').tmpdir(), 'qp-data') : path.join(__dirname, '..', 'data'));
const FILE = path.join(DIR, 'db.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return { subjects: {}, syllabi: {}, banks: {}, seeded: false };
  }
}
function save(db) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}
const now = () => new Date().toISOString();

function ensureSeed(db) {
  if (db.seeded) return db;
  for (const s of seed) {
    const id = crypto.randomUUID();
    db.subjects[id] = { id, ...s, patterns: {}, createdAt: now(), updatedAt: now() };
  }
  db.seeded = true;
  save(db);
  return db;
}

module.exports = {
  name: 'local-file',

  async listSubjects() {
    const db = ensureSeed(load());
    return Object.values(db.subjects).sort((a, b) => a.code.localeCompare(b.code));
  },
  async getSubject(id) {
    return load().subjects[id] || null;
  },
  async createSubject(data) {
    const db = ensureSeed(load());
    const id = crypto.randomUUID();
    db.subjects[id] = { id, patterns: {}, ...data, createdAt: now(), updatedAt: now() };
    save(db);
    return db.subjects[id];
  },
  async updateSubject(id, data) {
    const db = load();
    if (!db.subjects[id]) return null;
    db.subjects[id] = { ...db.subjects[id], ...data, id, updatedAt: now() };
    save(db);
    return db.subjects[id];
  },
  async deleteSubject(id) {
    const db = load();
    delete db.subjects[id];
    delete db.syllabi[id];
    if (db.banks) delete db.banks[id];
    save(db);
  },
  async getSyllabus(id) {
    return load().syllabi[id] || null;
  },
  async saveSyllabus(id, data) {
    const db = load();
    db.syllabi[id] = { ...data, uploadedAt: now() };
    save(db);
    return db.syllabi[id];
  },
  async deleteSyllabus(id) {
    const db = load();
    delete db.syllabi[id];
    save(db);
  },
  async getBank(id) {
    return (load().banks || {})[id] || null;
  },
  async saveBank(id, data) {
    const db = load();
    db.banks = db.banks || {};
    db.banks[id] = { ...data, uploadedAt: now() };
    save(db);
    return db.banks[id];
  },
  async deleteBank(id) {
    const db = load();
    if (db.banks) delete db.banks[id];
    save(db);
  },
};
