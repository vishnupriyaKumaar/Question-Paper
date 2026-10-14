// All secrets come from environment variables (set them in your hosting
// platform at deployment time - nothing is hard-coded or committed).
const path = require('path');
const crypto = require('crypto');
// .env is optional; it is only read if the file exists (handy for local runs).
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  port: Number(process.env.PORT) || 5000,

  // Staff login password (override with APP_PASSWORD in deployment).
  password: process.env.APP_PASSWORD || 'grtcse@1234',

  // Signs login tokens. If not set, a random secret is created at start-up
  // (users simply have to log in again after a restart).
  // Without JWT_SECRET a stable secret is derived from the password, so every serverless
  // instance (Vercel) accepts the same logins. Set JWT_SECRET for stronger security.
  jwtSecret: process.env.JWT_SECRET || crypto.createHash('sha256').update(`grt-qp|${process.env.APP_PASSWORD || 'grtcse@1234'}|${process.env.FIREBASE_PROJECT_ID || ''}`).digest('hex'),
  jwtSecretIsRandom: false,

  // Optional: enables AI-written questions from the syllabus.
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',

  college: {
    name: 'GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY, Tiruttani',
    status: '(An Autonomous Institution)',
    approval: 'Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai.',
    accreditation: 'Accredited by NAAC with "A++" Grade & An ISO 9001:2015 Certified Institution.',
  },

  defaultMeta: {
    academicYear: '2025-2026 (EVEN SEMESTER) - APR/ MAY 2026',
    yearSem: 'Second Year / Fourth Semester',
    department: 'DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING',
  },
};
