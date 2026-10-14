import { useEffect, useRef, useState } from 'react';
import { api, saveBlob } from '../api.js';

const TABS = [
  { id: 'use', label: 'Using the app' },
  { id: 'install', label: 'Install on devices' },
  { id: 'vscode', label: 'Run in VS Code' },
  { id: 'deploy', label: 'Deploy on Vercel' },
  { id: 'fix', label: 'Problems & fixes' },
  { id: 'zip', label: 'ZIP download' },
];

const Code = ({ children }) => <span className="guide-code">{children}</span>;

function UseTab() {
  return (
    <>
      <h4>1. Sign in</h4>
      <p>Enter the staff password. After the intro you land on the home page; the numbered bar at the top jumps between the five steps.</p>
      <h4>2. Subject</h4>
      <p>Pick a subject (code and name) from the drop-down. <b>Manage subjects</b> lets you add, edit or delete subjects and their course outcomes (CO1…CO5).</p>
      <h4>3. Syllabus</h4>
      <ul>
        <li>Upload the syllabus once. Any file works: <b>PDF, Word, PowerPoint, Excel, text, or a photo / screenshot (JPG, PNG…)</b>. Pick several pages together if the syllabus is split across pictures.</li>
        <li>Pictures are read with OCR and sorted unit by unit (“UNIT I”, “UNIT II”…). Use a sharp, upright photo for best results.</li>
        <li>It then shows <b>Syllabus uploaded</b> with the units found. Use <b>Update</b> or <b>Delete</b> to change it.</li>
      </ul>
      <h4>4. Assessment</h4>
      <p>Choose <b>Assessment 1</b> (Units 1–2), <b>Assessment 2</b> (Units 3–4) or <b>Model Test</b> (all units).</p>
      <h4>5. Marks × Questions</h4>
      <ul>
        <li>For each part set <b>Marks × Questions = Total</b>; <b>Add part</b> / <b>Delete</b> change the pattern.</li>
        <li>Tick <b>a / b</b> for Either/Or questions and pick the syllabus part for each option: <b>Full unit, 1st half, 2nd half or Middle part</b>.</li>
        <li>Choose the Bloom levels (K1–K6) allowed for each part. Every question starts with a verb from that level.</li>
        <li><b>Split up:</b> every question has its own box (Q1, Q2 … 8a, 8b, 9a …) in Part A, B and C. Pick No split or 2–6 parts (i, ii, iii…). The marks are shared between the parts, e.g. 13 marks in 2 parts is 7 + 6, printed as (i) … (7). “Same for all” sets a whole option at once.</li>
        <li><b>Sum:</b> tick “Sum” on any question that must be a numerical or problem-solving question (Maths and similar), or press <b>Make every question a sum</b>. Sums are K3 or higher.</li>
        <li><b>Where problems come from:</b> choose <i>Set by the app</i> (the built-in engine writes numerical problems with random valid numbers and calculates the answer - works with no API key for Maths, Probability and Statistics, Operating Systems, EDA, Cryptography, DBMS, Computer Networks, Programming and more; topics without a generator are listed as a warning), <i>Previous year question paper</i> (sums are taken from the paper you upload, optionally with the numbers changed) or <i>From Google</i> (web search for problems like your uploaded paper; needs an API key; problems are rewritten, not copied). Upload a sample paper with sums (several files at once are fine: PDF, Word, .doc, PowerPoint, Excel, text, pictures) so new sums copy its style: a scenario, real data or tables, and (i)/(ii) parts. Without an API key the app builds sums from the sums in that paper with the numbers changed.</li>
      </ul>
      <h4>5a. Previous / important questions (optional)</h4>
      <ul>
        <li>Upload a previous-year, model or important question paper in step 4, or directly inside “Set the marks and questions” (any file, several files, or pasted text). The app lists how many questions it found.</li>
        <li>In the Questions step, the slider says what <b>% of the paper</b> comes from them. The rest is generated from the syllabus.</li>
        <li>Uploaded questions go to their matching unit and Bloom level, sums only go to sum questions, and nothing is repeated between Set A and Set B. Each question shows “From uploaded questions”.</li>
      </ul>
      <h4>6. Generate and review</h4>
      <ul>
        <li><b>Generate</b> builds <b>Set A</b> and <b>Set B</b>. <b>Generate again</b> writes a completely new set every time.</li>
        <li>Every question text, CO, PO and BL can be edited. The green/red line tells you if the verb matches the K-level.</li>
        <li>Open <b>Set A K-Values</b> / <b>Set B K-Values</b> to see the K-level spread, CO and PO coverage for that set.</li>
      </ul>
      <h4>7. Download</h4>
      <p>Download Set A, Set B or both as editable Word files in the college format, and the K-Values of each set (or both) as a separate Word document.</p>
    </>
  );
}

function InstallTab({ canInstall, onInstall, installed }) {
  return (
    <>
      <p>The app installs like a normal app and opens in its own window with the GRT icon. It works on <b>Android, iPhone/iPad, Pixel, Windows, macOS, Linux and Chromebook</b>, and the layout adapts to every screen size. An internet connection is needed to generate papers.</p>
      <div className="guide-install">
        {installed ? <p className="ok-line">✓ Already installed on this device.</p> : canInstall ? <button className="primary" onClick={onInstall}>Install this app now</button> : <p className="muted">No install button appears here when your browser installs from its own menu (see below).</p>}
      </div>
      <h4>Android and Google Pixel (Chrome)</h4>
      <p>Tap the <b>⋮</b> menu → <b>Install app</b> (or <b>Add to Home screen</b>) → <b>Install</b>.</p>
      <h4>iPhone and iPad (Safari)</h4>
      <p>Tap the <b>Share</b> button (square with an arrow) → <b>Add to Home Screen</b> → <b>Add</b>. Open the site in Safari, not inside another app.</p>
      <h4>Windows, Linux and Chromebook (Chrome or Edge)</h4>
      <p>Click the install icon at the right end of the address bar (or <b>⋮ → Cast, save and share → Install page as app</b> in Chrome, <b>… → Apps → Install this site as an app</b> in Edge).</p>
      <h4>macOS</h4>
      <p>Chrome or Edge: install icon in the address bar. Safari 17 or newer: <b>File → Add to Dock</b>.</p>
    </>
  );
}

function VsCodeTab() {
  return (
    <>
      <h4>What you need</h4>
      <ul>
        <li><b>Node.js 18 or newer</b> (LTS) from <code>nodejs.org</code>. Check with <code>node -v</code>.</li>
        <li><b>Visual Studio Code</b> from <code>code.visualstudio.com</code>.</li>
        <li>For saving subjects permanently: a <b>Firebase project</b> with Firestore created. Without it the app still runs and keeps data in a local file (testing only).</li>
      </ul>
      <h4>Step by step</h4>
      <ol>
        <li><b>Unzip</b> <code>GRT-Question-Paper-Generator.zip</code>. You get a folder <code>qp-generator</code>.</li>
        <li>In VS Code: <b>File → Open Folder…</b> and choose that folder (the one containing <code>package.json</code>).</li>
        <li>Open the terminal: <b>Terminal → New Terminal</b>.</li>
        <li>Install everything once (this installs the website part too):
          <Code>npm install</Code>
        </li>
        <li>Make your settings file by copying <code>.env.example</code> to <code>.env</code>:
          <Code>{'Windows (Command Prompt):  copy .env.example .env\nPowerShell / Mac / Linux:     cp .env.example .env'}</Code>
          Fill <code>JWT_SECRET</code> (any long random text) and the Firebase values. Optional: <code>ANTHROPIC_API_KEY</code>.
        </li>
        <li>Start it:
          <Code>npm run dev</Code>
          Open <code>http://localhost:5173</code> (the page) – the API runs on port 5000 automatically.
        </li>
        <li>Click the intro once, sign in with <code>grtcse@1234</code>, and use it.</li>
        <li>Stop with <b>Ctrl + C</b> in the terminal.</li>
      </ol>
      <h4>Run it like the live site</h4>
      <Code>{'npm run build\nnpm start'}</Code>
      <p>Then open <code>http://localhost:5000</code>.</p>
      <div className="guide-note"><b>Keep secret:</b> never share <code>.env</code> or your Firebase key. They are in <code>.gitignore</code> and are not inside the ZIP.</div>
    </>
  );
}

function DeployTab() {
  return (
    <>
      <p>The website and the server deploy <b>together as one Vercel project, in one go</b>. The pages are served as static files and everything under <code>/api</code> runs as one serverless function (<code>api/index.js</code>).</p>
      <h4>Project layout</h4>
      <Code>{`api/index.js       Vercel function (exports the Express app)
server/            routes, generator, Word export, syllabus reader
client/            React app (Vite) → built into client/dist
vercel.json        build + routing settings (already done)
package.json       one install for everything`}</Code>
      <h4>Deploy from GitHub (easiest)</h4>
      <ol>
        <li>Create a GitHub repository and push the unzipped folder (<code>git init</code>, <code>git add .</code>, <code>git commit -m "first"</code>, <code>git push</code>).</li>
        <li>On <code>vercel.com</code>: <b>Add New → Project</b> → import the repository. Leave all build settings as they are (they come from <code>vercel.json</code>).</li>
        <li>Open <b>Settings → Environment Variables</b> and add the Firebase variables (see below). Do this in Vercel, not in VS Code.</li>
        <li>Press <b>Deploy</b>. When it is ready, open <code>https://YOUR-APP.vercel.app/api/health</code>; it should say <code>{'"store":"firestore"'}</code>.</li>
      </ol>
      <h4>Or deploy from the terminal</h4>
      <Code>{'npm i -g vercel\nvercel --prod'}</Code>
      <h4>Environment variables</h4>
      <ul>
        <li><code>FIREBASE_SERVICE_ACCOUNT</code> – the whole service-account JSON on one line <b>(or)</b> <code>FIREBASE_PROJECT_ID</code> + <code>FIREBASE_CLIENT_EMAIL</code> + <code>FIREBASE_PRIVATE_KEY</code>.</li>
        <li><code>JWT_SECRET</code> – long random text.</li>
        <li><code>APP_PASSWORD</code> – optional, default <code>grtcse@1234</code>.</li>
        <li><code>ANTHROPIC_API_KEY</code> – optional (fuller AI-written questions and reading of scanned pages).</li>
      </ul>
      <p>After changing a variable: <b>Deployments → ⋯ → Redeploy</b>.</p>
      <div className="guide-note"><b>Important:</b> Vercel’s disk is temporary, so the Firebase variables are required there; without them subjects would not be saved. Syllabus files can be up to 10 MB each. Pictures are reduced automatically and several files are sent in small batches; note that Vercel itself refuses a single non-picture file above about 4.5 MB (on your own computer the full 10 MB works).</div>
    </>
  );
}

function FixTab() {
  return (
    <>
      <h4>“npm is not recognized”</h4><p>Install Node.js LTS, then close and reopen VS Code.</p>
      <h4>Login says it cannot reach the server</h4><p>Run <code>npm run dev</code> again and open <code>localhost:5173</code>. On Vercel check <code>/api/health</code>.</p>
      <h4>Subjects disappear after a while on Vercel</h4><p>Firebase variables are missing, so the temporary disk is used. Add them and redeploy.</p>
      <h4>Picture syllabus gives wrong units</h4><p>Use a straight, bright photo where “UNIT I”, “UNIT II” are on their own lines, or pick the pages in order. You can also paste the text.</p>
      <h4>Scanned PDF cannot be read</h4><p>A scan has no text. Upload the pages as JPG/PNG pictures instead.</p>
      <h4>Old .doc / .ppt / .xls files</h4><p>Open the file and <b>Save as</b> .docx / .pptx / .xlsx first.</p>
      <h4>iPhone photo is HEIC</h4><p>On iPhone: Settings → Camera → Formats → Most Compatible, or take a screenshot of the page.</p>
      <h4>No sound on the intro</h4><p>Browsers allow sound only after a tap. Tap once on the intro screen.</p>
      <h4>Packages broken</h4><p>Delete the <code>node_modules</code> folders (also inside <code>client</code>) and run <code>npm install</code> again.</p>
    </>
  );
}

function ZipTab() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function get() {
    setBusy(true); setErr('');
    try { saveBlob(await api.downloadZip(), 'GRT-Question-Paper-Generator.zip'); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <>
      <p>This is the complete project (source code, ready for VS Code and Vercel). Passwords and keys are never inside it.</p>
      <p><button className="primary" onClick={get} disabled={busy}>{busy ? 'Preparing…' : 'Download GRT-Question-Paper-Generator.zip'}</button></p>
      {err && <p className="error" role="alert">{err}</p>}
      <h4>After downloading</h4>
      <ol><li>Unzip it.</li><li>Open the folder in VS Code (see <b>Run in VS Code</b>).</li><li>Run <code>npm install</code> then <code>npm run dev</code>.</li></ol>
    </>
  );
}

export default function GuideModal({ open, onClose, canInstall, onInstall, installed }) {
  const [tab, setTab] = useState('use');
  const closeRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    document.body.classList.add('modal-open');
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('modal-open'); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="guide-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="guide-box" role="dialog" aria-modal="true" aria-labelledby="guide-title">
        <div className="guide-head">
          <h3 id="guide-title">Guidelines &amp; settings</h3>
          <button ref={closeRef} className="guide-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="guide-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={`guide-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div className="guide-body">
          {tab === 'use' && <UseTab />}
          {tab === 'install' && <InstallTab canInstall={canInstall} onInstall={onInstall} installed={installed} />}
          {tab === 'vscode' && <VsCodeTab />}
          {tab === 'deploy' && <DeployTab />}
          {tab === 'fix' && <FixTab />}
          {tab === 'zip' && <ZipTab />}
        </div>
      </div>
    </div>
  );
}
