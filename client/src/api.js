// Set VITE_API_URL at build time only if the API is hosted on a different domain.
const BASE = import.meta.env.VITE_API_URL || '';
let onUnauthorized = () => {};

export const getToken = () => {
  try { return sessionStorage.getItem('qp_token') || ''; } catch { return ''; }
};
export const setToken = (t) => {
  try { t ? sessionStorage.setItem('qp_token', t) : sessionStorage.removeItem('qp_token'); } catch { /* storage blocked */ }
};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function request(path, { method = 'GET', body, form, blob } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, { method, headers, body: payload });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  if (res.status === 401 && path !== '/login') onUnauthorized();
  if (!res.ok) {
    let msg = res.status === 413 ? 'This file is too big for one upload on this host (about 4.5 MB on Vercel; 10 MB when run on your own computer). Use a smaller file or split it.'
      : res.status === 504 || res.status === 502 ? `The server took too long to read this file (HTTP ${res.status}). Try fewer or smaller files, or a PDF/Word file instead of a big picture.`
      : `Request failed (HTTP ${res.status}). The server did not give a reason - try again, or upload fewer/smaller files.`;
    try { const j = await res.json(); if (j && j.error) msg = j.error; } catch { /* not json */ }
    throw new Error(msg);
  }
  return blob ? res.blob() : res.json();
}

export const api = {
  login: (password) => request('/login', { method: 'POST', body: { password } }),
  meta: () => request('/meta'),
  subjects: () => request('/subjects'),
  addSubject: (s) => request('/subjects', { method: 'POST', body: s }),
  updateSubject: (id, s) => request(`/subjects/${id}`, { method: 'PUT', body: s }),
  deleteSubject: (id) => request(`/subjects/${id}`, { method: 'DELETE' }),
  syllabus: (id) => request(`/subjects/${id}/syllabus`),
  uploadSyllabus: (id, { files, text }, replace, append) => {
    const form = new FormData();
    (files || []).forEach((f) => form.append('files', f));
    if (text) form.append('text', text);
    return request(`/subjects/${id}/syllabus${append ? '?append=1' : ''}`, { method: replace ? 'PUT' : 'POST', form });
  },
  bank: (id) => request(`/subjects/${id}/bank`),
  uploadBank: (id, { files, text }, replace, append) => {
    const form = new FormData();
    (files || []).forEach((f) => form.append('files', f));
    if (text) form.append('text', text);
    return request(`/subjects/${id}/bank${append ? '?append=1' : ''}`, { method: replace ? 'PUT' : 'POST', form });
  },
  deleteBank: (id) => request(`/subjects/${id}/bank`, { method: 'DELETE' }),
  deleteSyllabus: (id) => request(`/subjects/${id}/syllabus`, { method: 'DELETE' }),
  downloadZip: () => request('/guide/download', { blob: true }),
  generate: (payload) => request('/generate', { method: 'POST', body: payload }),
  exportPaper: (papers) => request('/export/paper', { method: 'POST', body: { papers }, blob: true }),
  regenerateQuestion: (subjectId, question, avoidTexts) => request('/regenerate-question', { method: 'POST', body: { subjectId, question, avoidTexts } }),
  exportAnswers: (papers) => request('/export/answers', { method: 'POST', body: { papers }, blob: true }),
  exportAnalysis: (papers) => request('/export/analysis', { method: 'POST', body: { papers }, blob: true }),
};

export function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
