# GRT Question Paper Generator

React (Vite) + Express + Node, with **Firebase Firestore** instead of MongoDB.
Builds Assessment 1, Assessment 2 and Model Test papers (Set A and Set B) from an uploaded
syllabus, following Bloom's Taxonomy action verbs (K1–K6), and exports editable Word files
plus a separate K-level analysis document.

## Flow in the app
1. Sign in with the staff password.
2. Choose a subject from the dropdown (code + name). **Manage subjects** adds, edits and deletes subjects.
3. Upload the syllabus (PDF, Word or text, or paste it). Shown as *Uploaded*; you can **Update** or **Delete** it.
4. Pick one of three containers: **Assessment 1**, **Assessment 2**, **Model Test**.
5. Set *Marks × Questions = Total* per part (add or delete parts, Either/Or on or off, Bloom levels, units). For every part you also choose the **syllabus part** the questions come from: *Full unit*, *1st half of the unit*, *2nd half of the unit* or *Middle part of the unit*. For Either/Or parts, option **a** and option **b** each get their own choice. The halves never overlap, and the preview shows the unit and part under every question.
6. **Generate** → Set A and Set B. Edit any question, CO, PO or BL in the preview (a live check
   flags any question that does not start with a verb from its K-level).
7. Download Set A, Set B, both, or the **K-level analysis** as editable `.docx` (it also lists PO coverage and the PO1–PO12 reference).

**Programme Outcomes:** PO1–PO12 (Engineering Knowledge … Life-Long Learning) are built in (`server/outcomes.js`). Each question gets a PO automatically from its Bloom level and wording (recall/understanding → PO1; apply/analyse → PO2/PO4; design/develop → PO3; environment, ethics, tools etc. → PO7, PO8, PO5…). You can change any PO in the preview.

Defaults follow your sample papers: Assessment 50 marks (7×2, 2×13, 1×10), Model Test 100 marks
(10×2, 5×13, 1×15). Assessment 1 covers Units 1–2, Assessment 2 covers Units 3–4, Model Test all units.

## Run it locally (VS Code)
```bash
npm install          # installs the server AND the website part
npm run dev          # open http://localhost:5173  (API on :5000)
```
Or like the live site: `npm run build` then `npm start` → http://localhost:5000.
Copy `.env.example` to `.env` for your settings. With no Firebase variables, data is kept in `server/data/db.json` (testing only).

## Deploy on Vercel (one project, one time)
Frontend and backend deploy together: Vercel serves `client/dist` as static files and runs the whole Express API as one serverless function (`api/index.js`, routed by `vercel.json`).
1. Push the folder to GitHub, then on vercel.com: **Add New → Project** → import it. Keep the default settings.
2. In **Settings → Environment Variables** add the Firebase variables, `JWT_SECRET` (and optionally `APP_PASSWORD`, `ANTHROPIC_API_KEY`).
3. Deploy, then open `/api/health` – it should show `"store":"firestore"`.
Or from a terminal: `npm i -g vercel` then `vercel --prod`.
Vercel's disk is temporary, so Firebase is required there. Uploads are limited to about 4.5 MB per request (pictures are shrunk automatically in the browser).

## Environment variables (set in your hosting dashboard, not in VS Code)
See `.env.example` for the names. In short:

| Variable | Purpose |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` **or** `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` | Firestore access |
| `JWT_SECRET` | Signs logins. Set a long random value. |
| `APP_PASSWORD` | Optional. Defaults to `grtcse@1234`. |
| `ANTHROPIC_API_KEY` | Optional. Fuller syllabus-specific questions, and reading of scanned PDFs / hard pictures. |

Create the Firestore database in the Firebase console. The app creates the `subjects`, `syllabi` and `meta` collections itself. Keep Firestore rules closed: only the server (Admin SDK) reads and writes.

## Split-up, sums and previous questions
- **Split up:** every individual question (Q1, Q2 … 8a, 8b …) can be split into 1–6 parts `(i) … (ii) …`; the marks are shared (13 → 7 + 6) and printed after each part.
- **Sum:** a per-question switch (and *Make every question a sum*); problems can be set by the app, taken from the uploaded previous-year paper, or found by web search (needs `ANTHROPIC_API_KEY`). Sum questions are K3+ and only take sum-type questions from the uploaded bank. Real numbers come from the AI writer (`ANTHROPIC_API_KEY`) or from uploaded questions.
- **Previous / important questions:** a separate step uploads them (any file type, or paste). A slider sets the % of question parts taken from them; they are matched by unit, Bloom level, sum/theory and length, and never repeat between Set A and Set B.

## Syllabus files
PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), OpenDocument, RTF, HTML, text/CSV/JSON and pictures (JPG, PNG, WebP, GIF, BMP, TIFF). Pictures are read with OCR (tesseract.js, English data bundled) and several files can be uploaded together; text is then split unit by unit. Old .doc/.ppt/.xls and HEIC photos must be converted first.

## Install on devices (PWA)
The app is installable on Android/Pixel, iPhone/iPad, Windows, macOS, Linux and ChromeOS (manifest + service worker). The gear icon (after sign-in) explains each device and offers an *Install app* button.

## In-app guide and ZIP
The gear icon opens the guide (using the app, installing, VS Code, Vercel, fixes) and a download of the project ZIP stored in `server/assets/downloads/`.

## Customising
- **Word header logo:** `server/assets/grt-logo.png` (the wide GRT logo) is printed at the top of every question paper and K-level analysis. Replace the file to change it.
- **Brand images, tab icon, intro:** `client/public/brand/` (campus photo `campus-bg.jpg`, `grt-logo.png`, `otc-logo.png`, favicons, and the OTC intro in `intro-v6/` + `sound/`). The intro plays on every page load and can be skipped.
- **Footer corners:** `client/src/components/CornerBar.jsx` ("Made By The Team OTC" bottom-left, copyright bottom-right).
- **College name / header lines / defaults:** `server/config.js`.
- **Mark patterns:** `server/patterns.js`.
- **Bloom verbs:** `server/bloom.js` (Table II).

## Model / previous question paper (sums like your sample)
Upload one or many files (PDF, Word .docx/.doc, PowerPoint, Excel, ODT, RTF, text, pictures). Tables, "11a(i)" rows and equations are read. Sums are then written in the same style (scenario + data + (i)/(ii) parts). With `ANTHROPIC_API_KEY` set, "From Google" searches the web for problems like the sample; without it, sums are built from the uploaded paper's sums with the numbers changed (check them once).

## Local question engine (no API key, free)
`server/engine/` generates numerical / problem-solving questions with random valid numbers and **computes the answer with the app's own algorithms** (nothing is sent to any service). Run the tests with `npm test`.

| Subject | Generators (topics that trigger them) |
|---|---|
| Mathematics / Statistics | linear equations, determinants, eigenvalues, derivatives and stationary points, definite integrals, first-order ODE, probability (binomial, Poisson, normal, exponential, Bayes), Newton–Raphson, trapezoidal/Simpson, z-test |
| Operating Systems | CPU scheduling (FCFS, SJF, SRTF, RR, priority) with Gantt + WT/TAT, page replacement (FIFO/LRU/OPT), Banker's algorithm, disk scheduling, memory allocation, paging/TLB |
| EDA | descriptive statistics + outliers, regression/correlation, cleaning/normalisation/z-score, confusion-matrix metrics, moving average/smoothing, entropy/information gain |
| Cryptography & Network Security | Caesar/Vigenère/Affine/Hill, RSA (+signature), Diffie–Hellman, extended Euclid/totient/modular power, toy hash |
| DBMS | closure, candidate keys, normal form, SQL/relational algebra on a generated table, conflict serializability, blocking factor / B-tree order |
| Computer Networks | subnetting, CRC, Hamming code, delay/throughput/window efficiency, Dijkstra |
| Programming / Data structures | output prediction (C/Java/Python), recursion, sorting/searching traces, loop complexity, stack/queue/hash/BST |
| Others | COCOMO, cyclomatic complexity, function points, Amdahl/CPI/pipeline, cache AMAT, DFA tracing, perceptron/gradient descent/k-NN, availability/cloud cost, circuits |

* A sum question uses a generator only when its syllabus **topic** matches. If the drawn topic is purely descriptive, another calculable topic of the same unit is used; if none exists the paper shows a warning and the app falls back to your uploaded paper / generic wording. Nothing is invented.
* Answers: sums from the engine are marked **Verified**; theory questions, uploaded-paper questions and AI-written questions are marked **Needs instructor review** (answers can be typed in the paper step; the Word answer key shows the status).
* Optional `seed` in the generate request makes a paper reproducible.
* Limits: no MCQ / fill-in-the-blank / true-false types, SQL answers are computed by the app's own evaluator (not a real database), programming outputs by the app's own tracing code (user code is never executed).

## Adding your Claude API key (optional - the app works without it)
The key is never stored in the code or the ZIP. **Local:** copy `.env.example` to `.env`, set `ANTHROPIC_API_KEY=sk-ant-...`, restart `npm start` (the log shows `AI: on`). **Vercel:** Project → Settings → Environment Variables → add `ANTHROPIC_API_KEY` → Redeploy. The account needs API credit (Anthropic Console → Plans & Billing). With a key and an uploaded sample paper, sums are written in the sample's style and "From Google" searches the web; answers written by the AI are marked "Needs instructor review".

## Sum questions - how they are decided
Selecting **Sum** never produces a generic "solve a numerical problem on X" line. Order: AI in the sample's style (key + sample paper) → built-in calculation engine (verified answers) → uploaded paper's sums → otherwise the question is flagged **NOT GENERATED** with a clear message. "Regenerate this Sum only" keeps it a Sum.
