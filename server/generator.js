const { LEVELS, startsWithVerb, leadingVerb } = require('./bloom');
const bankLib = require('./bank');
const { splitUnits, extractTopics } = require('./syllabus');
const { ASSESSMENTS } = require('./patterns');
const ai = require('./ai');
const engine = require('./engine');
const { validateNumerical } = require('./engine/validate');
const { assignPO } = require('./outcomes');

const PART_LETTERS = 'ABCDEFGH';

// ---------- fallback templates (every one starts with a verb from Table II) ----------
const SHORT = {
  1: ['Define {t}.', 'What is {t}?', 'List the key features of {t}.', 'Name the components of {t}.', 'Recall the purpose of {t}.', 'Why is {t} needed?', 'Tell the main use of {t}.', 'Who uses {t}, and where?'],
  2: ['Explain {t} briefly.', 'Describe {t}.', 'Summarize {t}.', 'Outline the role of {t}.', 'Illustrate {t} with an example.', 'Differentiate {t} from a related concept.', 'Interpret the need for {t}.', 'Show how {t} works.'],
  3: ['Apply {t} to a simple example.', 'Identify where {t} is used in practice.', 'Utilize {t} to solve a small problem.', 'Construct a simple example of {t}.', 'Make use of {t} in a short scenario.'],
  4: ['Analyze {t} in brief.', 'Examine the parts of {t}.', 'Categorize the types of {t}.', 'Differentiate the types of {t}.', 'Inspect the role of {t}.'],
  5: ['Assess the importance of {t}.', 'Justify the need for {t}.', 'Judge the usefulness of {t}.', 'Evaluate {t} briefly.'],
  6: ['Design a simple model for {t}.', 'Propose an improvement for {t}.', 'Formulate a short plan for {t}.', 'Create an example of {t}.'],
};
const LONG = {
  1: ['Define {t} and list its important characteristics.', 'Recall the main terms related to {t} and relate them to each other.'],
  2: ['Explain {t} in detail with suitable examples.', 'Describe {t} with a neat diagram.', 'Discuss {t} and its significance in detail.', 'Summarize {t} with its components and applications.', 'Illustrate {t} with suitable examples and diagrams.', 'Elucidate the concepts of {t} in a detailed manner.', 'Outline {t} and explain each step involved.', 'Interpret {t} and explain how it is used in practice.'],
  3: ['Apply the concepts of {t} to solve a real-world problem and explain each step.', 'Develop a suitable solution using {t} and explain it with an example.', 'Construct an example for {t} and explain the procedure in detail.', 'Utilize {t} to solve a given problem and justify the steps followed.', 'Identify the key elements of {t} and demonstrate their use with a case study.', 'Solve a suitable problem using {t} and explain the method in detail.'],
  4: ['Analyze {t} in detail and examine how its parts relate to one another.', 'Compare and contrast the approaches related to {t} with suitable examples.', 'Categorize the different types of {t} and examine each of them.', 'Examine {t} through a case study and discuss your findings.', 'Differentiate the major concepts within {t} and analyze their impact.'],
  5: ['Evaluate {t} and justify its importance with suitable examples.', 'Assess the strengths and limitations of {t} and recommend improvements.', 'Appraise {t} against suitable criteria and defend your conclusion.', 'Judge the effectiveness of {t} using a case study.'],
  6: ['Design a solution based on {t} and justify your design choices.', 'Propose a new approach for {t} and explain how it improves on existing methods.', 'Formulate a complete plan for {t} with suitable examples.', 'Develop a model for {t} and explain its working in detail.'],
};


// Sum / problem-solving wording (verbs from Table II: Solve, Apply, Analyze, Determine, Formulate...).
// Without an AI key these are generic; real numeric values come from the AI writer or from the
// uploaded previous questions.
const SUMS_SHORT = {
  3: ['Solve a simple numerical problem on {t}.', 'Apply {t} to solve a short numerical problem.', 'Utilize {t} to solve a simple problem.'],
  4: ['Analyze a short numerical problem on {t}.', 'Examine the result of a simple problem on {t}.'],
  5: ['Determine the result of a short problem on {t}.', 'Estimate the value in a simple problem on {t}.'],
  6: ['Solve a short design problem on {t}.', 'Formulate and solve a simple problem on {t}.'],
};
const SUMS_LONG = {
  3: ['Solve a numerical problem on {t} and show every step of the working.', 'Apply the concepts of {t} to solve the given problem and explain each step.', 'Utilize {t} to solve a numerical problem and justify the steps followed.', 'Solve a problem based on {t} using a suitable method and write the final result.'],
  4: ['Analyze a numerical problem on {t}, examine each step and discuss the result.', 'Examine a worked problem on {t} and categorize the methods used to solve it.'],
  5: ['Determine the result of a problem on {t} and justify the method you used.', 'Estimate and evaluate the outcome of a numerical problem on {t}.'],
  6: ['Solve a design problem on {t} and propose the best solution with working.', 'Formulate a problem on {t}, solve it and explain how the solution can be improved.'],
};
const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi'];

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Random template, avoiding any wording already used in this paper / the previous paper.
function fallbackQuestion(item, taken) {
  const short = item.marks <= 3;
  const bank = item.isSum
    ? (short ? SUMS_SHORT : SUMS_LONG)[item.level] || (short ? SUMS_SHORT : SUMS_LONG)[3]
    : (short ? SHORT : LONG)[item.level] || SHORT[2];
  const texts = bank.map((b) => b.replace('{t}', item.topic));
  const fresh = texts.filter((t) => !taken.has(t.toLowerCase()));
  const pool = fresh.length ? fresh : texts;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------- syllabus coverage of a unit ----------
const COVERAGES = ['full', 'first', 'second', 'middle'];
const COVERAGE_LABEL = { full: 'Full unit', first: '1st half of the unit', second: '2nd half of the unit', middle: 'Middle part of the unit' };
const cleanCoverage = (v) => (COVERAGES.includes(v) ? v : 'full');

// Which part of a unit's topic list a question may be drawn from.
function sliceTopics(list, coverage) {
  const n = list.length;
  if (n < 3 || coverage === 'full') return list;
  if (coverage === 'first') return list.slice(0, Math.ceil(n / 2));
  if (coverage === 'second') return list.slice(Math.ceil(n / 2));
  if (coverage === 'middle') return list.slice(Math.floor(n / 4), Math.ceil((3 * n) / 4));
  return list;
}

// ---------- slot planning ----------
const cleanSplit = (v, marks) => Math.max(1, Math.min(6, Math.round(Number(v) || 1), marks));

function cleanPattern(pattern) {
  return (pattern || [])
    .map((r) => {
      const marks = Math.max(1, Math.round(Number(r.marks) || 0));
      return {
        marks,
        count: Math.max(0, Math.round(Number(r.count) || 0)),
        choice: Boolean(r.choice),
        coverage: cleanCoverage(r.coverage),
        coverageB: cleanCoverage(r.coverageB || r.coverage),
        splitA: cleanSplit(r.splitA, marks),
        splitB: cleanSplit(r.splitB ?? r.splitA, marks),
        sumA: Boolean(r.sumA),
        sumB: Boolean(r.choice ? r.sumB : r.sumA),
        // per-question choices (question i of this part); fall back to the part-wide value
        splitsA: Array.from({ length: Math.max(0, Math.round(Number(r.count) || 0)) }, (_, i) => cleanSplit(r.splitsA?.[i] ?? r.splitA, marks)),
        splitsB: Array.from({ length: Math.max(0, Math.round(Number(r.count) || 0)) }, (_, i) => cleanSplit(r.splitsB?.[i] ?? r.splitB ?? r.splitA, marks)),
        sumsA: Array.from({ length: Math.max(0, Math.round(Number(r.count) || 0)) }, (_, i) => Boolean(r.sumsA?.[i] ?? r.sumA)),
        sumsB: Array.from({ length: Math.max(0, Math.round(Number(r.count) || 0)) }, (_, i) => Boolean(r.choice ? (r.sumsB?.[i] ?? r.sumB) : (r.sumsA?.[i] ?? r.sumA))),
        levels: (Array.isArray(r.levels) && r.levels.length ? r.levels : [2]).map(Number).filter((n) => n >= 1 && n <= 6),
      };
    })
    .filter((r) => r.count > 0 && r.marks > 0);
}

const anySumRequested = (pattern) => cleanPattern(pattern).some((r) => r.sumsA.some(Boolean) || r.sumsB.some(Boolean));

function totalMarks(pattern) {
  return cleanPattern(pattern).reduce((t, r) => t + r.marks * r.count, 0);
}

// 13 marks in 2 parts -> [7, 6]
function splitMarks(marks, n) {
  const base = Math.floor(marks / n);
  const rem = marks % n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

function planSlots(pattern, unitList) {
  const rows = cleanPattern(pattern);
  const U = unitList.length;
  const slots = [];
  let qNo = 0;
  rows.forEach((row, ri) => {
    const L = row.levels.length ? row.levels : [2];
    for (let i = 0; i < row.count; i++) {
      qNo += 1;
      const subs = row.choice ? ['a', 'b'] : [''];
      subs.forEach((sub, k) => {
        let unit;
        if (row.choice && row.count === 1 && U > 1) {
          unit = unitList[k === 0 ? Math.floor(U * 0.25) : Math.min(U - 1, Math.floor(U * 0.75))];
        } else {
          unit = unitList[Math.min(U - 1, Math.floor((i * U) / row.count))];
        }
        const isSum = sub === 'b' ? row.sumsB[i] : row.sumsA[i];
        // problems need at least K3 (Applying): use the row's higher levels, or K3
        const pool = isSum ? (L.filter((x) => x >= 3).length ? L.filter((x) => x >= 3) : [3]) : L;
        const level = pool[(i + k) % pool.length];
        const parts = sub === 'b' ? row.splitsB[i] : row.splitsA[i];
        slots.push({
          id: `q${qNo}${sub}`,
          part: ri,
          no: qNo,
          sub,
          marks: row.marks,
          level,
          unit,
          co: `CO${unit}`,
          coverage: sub === 'b' ? row.coverageB : row.coverage,
          isSum,
          parts,
          partMarks: splitMarks(row.marks, parts),
        });
      });
    }
  });
  return { rows, slots };
}

// One generated item per (sub-)question: a slot split into (i), (ii)... gives several items.
function expandItems(slots) {
  const items = [];
  for (const s of slots) {
    for (let j = 0; j < s.parts; j++) {
      items.push({
        id: s.parts > 1 ? `${s.id}_${j + 1}` : s.id,
        slotId: s.id,
        partIdx: j,
        marks: s.partMarks[j],
        level: s.level,
        unit: s.unit,
        coverage: s.coverage,
        isSum: s.isSum,
      });
    }
  }
  return items;
}

function assignTopics(items, unitTopics, ctx) {
  const ptr = ctx.ptr;
  const used = new Set();
  for (const s of items) {
    const all = unitTopics[s.unit] && unitTopics[s.unit].length ? unitTopics[s.unit] : [`Unit ${s.unit} concepts`];
    const key = `${s.unit}:${s.coverage}`;
    if (!ctx.lists[key]) ctx.lists[key] = shuffle(sliceTopics(all, s.coverage));
    const list = ctx.lists[key];
    s.scopeTopics = list;
    if (ptr[key] === undefined) ptr[key] = 0;
    let topic;
    for (let tries = 0; tries < list.length; tries++) {
      const cand = list[ptr[key] % list.length];
      ptr[key] += 1;
      if (!used.has(cand.toLowerCase())) {
        topic = cand;
        break;
      }
    }
    if (!topic) topic = list[ptr[key]++ % list.length];
    used.add(topic.toLowerCase());
    s.topic = topic;
  }
}

// ---------- main ----------
/**
 * Generates Set A and Set B for one assessment.
 * bank: parsed previous / important questions; bankPercent: share of questions to take from them.
 */
/** A written question is accepted when it starts with its Bloom verb; sums may open with a scenario but need real numbers. */
function okText(text, it) {
  if (it.isSum) return validateNumerical(text).ok;
  return startsWithVerb(text, it.level);
}

async function generatePapers({ subject, syllabusText, assessmentKey, pattern, units, meta = {}, avoidTexts = [], bankText = '', bankPercent = 0, sumSource = 'own', varyNumbers = false, seed }) {
  const def = ASSESSMENTS[assessmentKey];
  if (!def) throw Object.assign(new Error('Unknown assessment type'), { status: 400 });

  const { units: parsedUnits, fallback: unitFallback } = splitUnits(syllabusText);
  const available = parsedUnits.map((u) => u.n);
  let unitList = (Array.isArray(units) && units.length ? units : def.units).map(Number).filter((n) => available.includes(n));
  if (!unitList.length) unitList = available.slice(0, Math.min(2, available.length));
  if (!unitList.length) throw Object.assign(new Error('Could not find any units in the syllabus.'), { status: 400 });

  const unitTexts = {};
  const unitTopics = {};
  for (const u of parsedUnits) {
    unitTexts[u.n] = `${u.title}\n${u.text}`;
    unitTopics[u.n] = extractTopics(u.text);
  }

  const warnings = [];
  if (unitFallback) warnings.push('No "UNIT I / UNIT II" headings were found in the syllabus, so it was split into 5 equal parts.');
  if (unitList.some((u) => (unitTopics[u] || []).length < 3)) warnings.push('Some units have very few detectable topics; questions may repeat. Check the syllabus upload.');

  // previous / important questions
  const pct = Math.max(0, Math.min(100, Math.round(Number(bankPercent) || 0)));
  let bank = [];
  if (bankText) bank = bankLib.tagUnits(bankLib.parseQuestions(bankText), bankLib.unitWordSets(unitTexts));
  const styleExamples = bank.filter((q) => q.isSum).sort(() => Math.random() - 0.5).slice(0, 5).map((q) => q.text.replace(/\n+/g, ' '));
  const variedIds = new Set();
  const engineRng = engine.makeRng(seed);
  const engineStats = { used: 0, missed: new Set() };
  const bankStats = { percent: pct, available: bank.length, requested: 0, used: 0 };
  const usedBank = new Set();

  const papers = [];
  const avoid = [];
  const ctx = { ptr: {}, lists: {} };
  const taken = new Set((Array.isArray(avoidTexts) ? avoidTexts : []).map((t) => String(t).toLowerCase()));
  for (const [setIdx, setLabel] of ['A', 'B'].entries()) {
    const { rows, slots } = planSlots(pattern, unitList);
    const items = expandItems(slots);
    assignTopics(items, unitTopics, ctx);

    // 1) questions taken from the uploaded bank
    const textById = {};
    const fromBank = {};
    if (bank.length || sumSource === 'bank') {
      const theory = items.filter((it) => !it.isSum);
      const sums = items.filter((it) => it.isSum);
      const jobs = [];
      if (pct > 0) jobs.push([theory, pct]);
      if (sumSource === 'bank' && sums.length) jobs.push([sums, 100, true]); // sums come from the uploaded paper
      for (const [list, p, isSumJob] of jobs) {
        const { picks, want, got } = bankLib.pickFromBank(list, bank, p, { used: usedBank, taken });
        if (isSumJob) { bankStats.sumWanted = (bankStats.sumWanted || 0) + want; bankStats.sumGot = (bankStats.sumGot || 0) + got; } else { bankStats.requested += want; bankStats.used += got; }
        for (const it of list) {
          const q = picks.get(it.id);
          if (q) {
            let t = q.text.replace(/\n+/g, ' ');
            if (varyNumbers && it.isSum) { const v = bankLib.varyNumbers(t); t = v.text; if (v.changed) variedIds.add(it.id); }
            textById[it.id] = t; fromBank[it.id] = q;
          }
        }
      }
    }

    // sums found on the web (needs the AI key); the rest fall through to the writer below
    const sourceById = {};
    const answerById = {};
    const unsupported = new Set();
    if (sumSource === 'google' && ai.available()) {
      const need = items.filter((it) => it.isSum && !textById[it.id]);
      if (need.length) {
        try {
          const found = await ai.findProblems({ subject, items: need, unitTexts, avoid: [...avoid, ...taken].slice(0, 40), styleExamples });
          for (const it of need) {
            if (found && found[it.id] && okText(found[it.id], it)) { textById[it.id] = found[it.id]; sourceById[it.id] = 'web'; }
          }
        } catch (e) {
          warnings.push(`Web search for problems failed (${e.message || e}); problems were written by the app instead.`);
        }
      }
    }

    // AI key set + a sample paper uploaded: let the AI write sums in the style of that paper (answers stay "review");
    // anything it cannot produce, or that fails validation, falls through to the built-in engine below
    if (ai.available() && styleExamples.length && sumSource !== 'bank' && sumSource !== 'google') {
      const need = items.filter((it) => it.isSum && !textById[it.id]);
      if (need.length) {
        try {
          const aiSums = await ai.writeQuestions({ subject, slots: need, unitTexts, setLabel, avoid: [...avoid, ...taken].slice(0, 40), styleExamples });
          for (const it of need) if (aiSums && aiSums[it.id] && okText(aiSums[it.id], it)) { textById[it.id] = aiSums[it.id]; sourceById[it.id] = 'ai'; }
        } catch (e) { warnings.push(`AI could not write sums in your sample's style (${String(e.message || e).slice(0, 140)}); the built-in generators were used instead.`); }
      }
    }

    // local engine: numerical problems with answers computed (and checked) by the app itself - no API key needed
    for (const it of items.filter((x) => x.isSum && !textById[x.id])) {
      const unit = parsedUnits.find((u) => u.n === it.unit);
      const make = (topic) => engine.generateSum({ subject, syllabusText, topic, unitTitle: unit ? unit.title : '', level: it.level, taken, rng: engineRng });
      let g = make(it.topic);
      if (!g) { // the drawn topic is purely descriptive: use another topic of the same unit / coverage that can be calculated
        for (const t of engineRng.shuffle(it.scopeTopics || [])) { g = make(t); if (g) { it.topic = t; break; } }
      }
      if (g) {
        textById[it.id] = g.text; sourceById[it.id] = 'engine'; answerById[it.id] = { text: g.answer, verified: g.verified };
        taken.add(g.text.toLowerCase()); engineStats.used += 1;
      } else engineStats.missed.add(it.topic);
    }

    // no AI key: build sums from the uploaded paper's sums, with the numbers changed, so they look like the sample
    if (!ai.available() && sumSource !== 'bank') {
      const need = items.filter((it) => it.isSum && !textById[it.id]);
      if (need.length && bank.some((q) => q.isSum)) {
        const { picks } = bankLib.pickFromBank(need, bank, 100, { used: usedBank, taken });
        for (const it of need) {
          const q = picks.get(it.id);
          if (!q) continue;
          const v = bankLib.varyNumbers(q.text.replace(/\n+/g, ' '));
          textById[it.id] = v.text; fromBank[it.id] = q; if (v.changed) variedIds.add(it.id);
          bankStats.sumFallback = (bankStats.sumFallback || 0) + 1;
        }
      }
    }

    // 2) the rest: AI writer if available, else templates
    const rest = items.filter((it) => !textById[it.id]);
    let aiMap = null;
    let aiError = null;
    if (ai.available() && rest.length) {
      try {
        aiMap = await ai.writeQuestions({ subject, slots: rest, unitTexts, setLabel, avoid: [...avoid, ...taken].slice(0, 40), styleExamples });
      } catch (e) {
        aiError = e.message || String(e);
      }
    }
    if (aiError) warnings.push(`AI generation failed for Set ${setLabel} (${aiError}); built-in generators and templates were used.`);

    for (const it of rest) {
      let text = aiMap && aiMap[it.id];
      sourceById[it.id] = 'ai';
      if (!text || !okText(text, it)) {
        if (it.isSum) {
          // never hand back a generic "solve a numerical problem on X" line as if it were a question
          text = `[NUMERICAL QUESTION NOT GENERATED: no calculation generator or approved sum exists for “${it.topic}”. Upload a previous paper that has sums, type the problem here, or choose a topic that can be calculated.]`;
          sourceById[it.id] = 'unsupported'; unsupported.add(it.id); engineStats.missed.add(it.topic);
        } else {
          text = fallbackQuestion(it, taken);
          sourceById[it.id] = 'template';
        }
      }
      textById[it.id] = text;
    }
    for (const it of items) { taken.add(String(textById[it.id]).toLowerCase()); if (fromBank[it.id]) sourceById[it.id] = 'bank'; }

    // 3) assemble each question (split slots become "(i) ... (ii) ...")
    const questions = slots.map((s) => {
      const its = items.filter((it) => it.slotId === s.id);
      const text = s.parts > 1
        ? its.map((it, j) => `(${ROMAN[j]}) ${textById[it.id]} (${it.marks})`).join('\n')
        : textById[its[0].id];
      const srcs = its.map((it) => sourceById[it.id]);
      const uniq = new Set(srcs);
      const source = uniq.size === 1 ? srcs[0] : 'mixed';
      const ans = its.map((it) => answerById[it.id]);
      const verified = ans.every((a) => a && a.verified);
      const answer = ans.every((a) => a) ? (s.parts > 1 ? ans.map((a, j) => `(${ROMAN[j]}) ${a.text}`).join('\n') : ans[0].text) : '';
      // a question taken from the bank keeps its own Bloom level when its verb is recognised
      const bankLevels = its.map((it) => fromBank[it.id] && fromBank[it.id].level).filter(Boolean);
      const bl = bankLevels.length === its.length ? Math.min(...bankLevels) : s.level;
      return {
        id: s.id,
        no: s.no,
        sub: s.sub,
        text,
        marks: s.marks,
        co: s.co,
        po: assignPO(bl, text, its[0].topic),
        bl,
        verb: leadingVerb(text, bl),
        unit: s.unit,
        coverage: s.coverage,
        topic: its.map((it) => it.topic).join('; '),
        parts: s.parts,
        isSum: s.isSum,
        source,
        answer,
        answerStatus: verified ? 'verified' : 'review',
        incomplete: its.some((it) => unsupported.has(it.id)),
        qtype: s.isSum ? 'sum' : 'theory',
        varied: its.some((it) => variedIds.has(it.id)),
        part: s.part,
      };
    });
    if (setIdx === 0) questions.forEach((q) => avoid.push(q.text.replace(/\n/g, ' ')));

    const parts = rows.map((row, ri) => {
      const mark = row.marks * row.count;
      return {
        letter: PART_LETTERS[ri] || String(ri + 1),
        title: `PART – ${PART_LETTERS[ri] || ri + 1} (${row.count} × ${row.marks} = ${mark} Marks)`,
        marks: mark,
        questions: questions.filter((q) => q.part === ri),
      };
    });

    const outcomes = (subject.outcomes || []).map((text, i) => ({ co: `CO${i + 1}`, text }));
    papers.push({
      meta: {
        date: meta.date || '',
        academicYear: meta.academicYear,
        yearSem: meta.yearSem,
        department: meta.department,
        subjectCode: subject.code,
        subjectName: subject.name,
        regulation: subject.regulation || '',
        assessmentKey,
        assessmentLabel: def.label,
        title: def.title,
        time: meta.time || def.time,
        set: setLabel,
        maxMarks: rows.reduce((t, r) => t + r.marks * r.count, 0),
        units: unitList,
      },
      parts,
      outcomes,
    });
  }

  if (pct > 0 && !bank.length) warnings.push('No previous / important questions could be read from the uploaded file, so all questions were generated from the syllabus.');
  else if (pct > 0 && bankStats.used < bankStats.requested) warnings.push(`Asked for ${pct}% from the uploaded questions (${bankStats.requested} question parts) but only ${bankStats.used} matched the units, levels or sums of this paper. The rest were generated from the syllabus.`);
  if (sumSource === 'bank' && anySumRequested(pattern) && !bank.some((q) => q.isSum)) warnings.push('You chose sums from the previous-year paper, but no sums were found in the uploaded questions, so the app wrote the problems itself.');
  if (sumSource === 'google' && anySumRequested(pattern) && !ai.available()) warnings.push('Problems from Google need an ANTHROPIC_API_KEY on the server (it searches the web). The app wrote the problems itself.');
  if (sumSource === 'bank' && bankStats.sumWanted > bankStats.sumGot && bank.some((q) => q.isSum)) warnings.push(`Only ${bankStats.sumGot} of ${bankStats.sumWanted} sum parts could be taken from the uploaded paper (it has ${bank.filter((q) => q.isSum).length} sums for these units); the rest were written by the app.`);
  const anySum = (cleanPattern(pattern) || []).some((r) => r.sumsA.some(Boolean) || r.sumsB.some(Boolean));
  if (bankStats.sumFallback) warnings.push(`${bankStats.sumFallback} sum part(s) were built from the sums in your uploaded paper (same style, numbers changed). Please solve each one once to check the numbers still work.`);
  else if (varyNumbers && variedIds.size) warnings.push('Numbers were changed in some sums taken from the uploaded paper. Please solve each one once to check.');
  if (engineStats.used) warnings.push(`${engineStats.used} sum part(s) were generated by the built-in engine with answers computed by the app (see the answer key). Descriptive questions have no verified answer and need instructor review.`);
  if (engineStats.missed.size) warnings.push(`No built-in numerical generator exists for: ${[...engineStats.missed].slice(0, 8).join('; ')}. These sums were NOT generated (they are marked in the paper): upload a previous paper with sums, type them yourself, or pick a topic that can be calculated.`);
  if (anySum && !ai.available() && !bankStats.used && !bankStats.sumFallback && !engineStats.used) warnings.push('No numerical problems could be produced for these sums: no calculation generator matches the selected topics. Choose calculable topics, upload a previous paper with sums, or add an ANTHROPIC_API_KEY.');

  return { papers, warnings, aiUsed: ai.available(), bank: bankStats, engine: { used: engineStats.used, missed: [...engineStats.missed] } };
}


/**
 * Regenerates ONE question (same unit, marks, Bloom level and Sum/Theory type); nothing else in the paper changes.
 * A Sum stays a Sum: if no calculation can be generated the question is returned flagged "incomplete", never as theory.
 */
async function regenerateQuestion({ subject, syllabusText, question, avoidTexts = [], seed }) {
  const { units: parsedUnits } = splitUnits(syllabusText);
  const unit = parsedUnits.find((u) => u.n === Number(question.unit));
  if (!unit) throw Object.assign(new Error('That unit was not found in the syllabus.'), { status: 400 });
  const marks = Math.max(1, Number(question.marks) || 2);
  const level = Math.max(1, Math.min(6, Number(question.bl) || 2));
  const parts = Math.max(1, Math.min(6, Number(question.parts) || 1, marks));
  const isSum = Boolean(question.isSum);
  const topics = sliceTopics(extractTopics(unit.text), cleanCoverage(question.coverage));
  const rng = engine.makeRng(seed);
  const taken = new Set([...avoidTexts, question.text].map((t) => String(t || '').toLowerCase()));
  const pm = splitMarks(marks, parts);
  const order = rng.shuffle(topics.length ? topics : [`Unit ${unit.n} concepts`]);
  const texts = []; const answers = []; const used = []; let incomplete = false; let verified = true;
  for (let j = 0; j < parts; j++) {
    const it = { id: `r${j}`, marks: pm[j], level, unit: unit.n, isSum, topic: order[j % order.length], scopeTopics: order };
    let text = null; let ans = null;
    if (isSum) {
      for (const t of [it.topic, ...order]) {
        const g = engine.generateSum({ subject, syllabusText, topic: t, unitTitle: unit.title, level, taken, rng });
        if (g) { text = g.text; ans = { text: g.answer, verified: g.verified }; it.topic = t; break; }
      }
      if (!text) { incomplete = true; text = `[NUMERICAL QUESTION NOT GENERATED: no calculation generator exists for the topics of Unit ${unit.n}. Type the problem here or choose another unit.]`; }
    } else text = fallbackQuestion(it, taken);
    taken.add(text.toLowerCase()); texts.push(text); answers.push(ans); used.push(it.topic);
    if (!ans || !ans.verified) verified = false;
  }
  const text = parts > 1 ? texts.map((t, j) => `(${ROMAN[j]}) ${t} (${pm[j]})`).join('\n') : texts[0];
  const answer = answers.every(Boolean) ? (parts > 1 ? answers.map((a, j) => `(${ROMAN[j]}) ${a.text}`).join('\n') : answers[0].text) : '';
  return { text, answer, answerStatus: verified && answer ? 'verified' : 'review', topic: used.join('; '), source: isSum ? (incomplete ? 'unsupported' : 'engine') : 'template', incomplete, qtype: isSum ? 'sum' : 'theory', varied: false };
}

module.exports = { regenerateQuestion, generatePapers, totalMarks, cleanPattern, planSlots, expandItems, splitMarks, sliceTopics, COVERAGES, COVERAGE_LABEL };
