// Firebase Firestore store (replaces MongoDB). Credentials are read from
// environment variables at runtime - set them in your hosting dashboard.
const admin = require('firebase-admin');
const seed = require('./seed');

function init() {
  if (admin.apps.length) return;
  const e = process.env;
  let credential;
  if (e.FIREBASE_SERVICE_ACCOUNT) {
    credential = admin.credential.cert(JSON.parse(e.FIREBASE_SERVICE_ACCOUNT));
  } else if (e.FIREBASE_PROJECT_ID && e.FIREBASE_CLIENT_EMAIL && e.FIREBASE_PRIVATE_KEY) {
    credential = admin.credential.cert({
      projectId: e.FIREBASE_PROJECT_ID,
      clientEmail: e.FIREBASE_CLIENT_EMAIL,
      privateKey: e.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  } else {
    // Cloud Run / Firebase / GCP: uses the platform's own service account.
    credential = admin.credential.applicationDefault();
  }
  admin.initializeApp({ credential, projectId: e.FIREBASE_PROJECT_ID || undefined });
}

let db;
function fs() {
  if (!db) {
    init();
    db = admin.firestore();
  }
  return db;
}
const now = () => new Date().toISOString();
const subjects = () => fs().collection('subjects');
const syllabi = () => fs().collection('syllabi');
const banks = () => fs().collection('banks');

async function ensureSeed() {
  const metaRef = fs().collection('meta').doc('app');
  const meta = await metaRef.get();
  if (meta.exists && meta.data().seeded) return;
  const batch = fs().batch();
  for (const s of seed) {
    const ref = subjects().doc();
    batch.set(ref, { ...s, patterns: {}, createdAt: now(), updatedAt: now() });
  }
  batch.set(metaRef, { seeded: true });
  await batch.commit();
}

const withId = (doc) => ({ id: doc.id, ...doc.data() });

module.exports = {
  name: 'firebase-firestore',

  async listSubjects() {
    await ensureSeed();
    const snap = await subjects().get();
    return snap.docs.map(withId).sort((a, b) => a.code.localeCompare(b.code));
  },
  async getSubject(id) {
    const d = await subjects().doc(id).get();
    return d.exists ? withId(d) : null;
  },
  async createSubject(data) {
    await ensureSeed();
    const ref = subjects().doc();
    await ref.set({ patterns: {}, ...data, createdAt: now(), updatedAt: now() });
    return withId(await ref.get());
  },
  async updateSubject(id, data) {
    const ref = subjects().doc(id);
    if (!(await ref.get()).exists) return null;
    await ref.set({ ...data, updatedAt: now() }, { merge: true });
    return withId(await ref.get());
  },
  async deleteSubject(id) {
    await subjects().doc(id).delete();
    await syllabi().doc(id).delete();
    await banks().doc(id).delete();
  },
  async getSyllabus(id) {
    const d = await syllabi().doc(id).get();
    return d.exists ? d.data() : null;
  },
  async saveSyllabus(id, data) {
    // Firestore documents are limited to 1 MiB; syllabus text is capped upstream.
    const doc = { ...data, uploadedAt: now() };
    await syllabi().doc(id).set(doc);
    return doc;
  },
  async deleteSyllabus(id) {
    await syllabi().doc(id).delete();
  },
  async getBank(id) {
    const d = await banks().doc(id).get();
    return d.exists ? d.data() : null;
  },
  async saveBank(id, data) {
    const doc = { ...data, uploadedAt: now() };
    await banks().doc(id).set(doc);
    return doc;
  },
  async deleteBank(id) {
    await banks().doc(id).delete();
  },
};
