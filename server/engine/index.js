// Local, API-free question engine: generates numerical / problem-solving questions whose answers
// are computed (and checked) by the app's own algorithms. See README section "Local question engine".
const { makeRng } = require('./core');
const programming = require('./programming');
const MODULES = [require('./math'), require('./os'), require('./eda'), require('./cns'), require('./dbms'), require('./networks'), programming, require('./other')];
const GENERATORS = MODULES.flat();

const SUBJECTS = [
  { cats: ['math', 'eda'], re: /math|calculus|algebra|statistic|probab|numerical|transform|discrete|differential|linear/i },
  { cats: ['os'], re: /operating system|\bos\b/i },
  { cats: ['eda', 'math', 'ml'], re: /analytic|data science|\beda\b|data mining|big data|exploratory/i },
  { cats: ['cns', 'networks'], re: /cryptograph|network security|information security|cyber|\bcns\b|security/i },
  { cats: ['dbms'], re: /database|dbms|\bsql\b|data management/i },
  { cats: ['networks', 'cns'], re: /computer network|networking|communication|data communication|\bnetworks?\b/i },
  { cats: ['programming'], re: /programming|\bjava\b|python|c\+\+|\bc\b|data structure|algorithm|object oriented|\boop\b|problem solving/i },
  { cats: ['software'], re: /software engineering|software project|project management|testing/i },
  { cats: ['architecture'], re: /architecture|organi[sz]ation|microprocessor|microcontroller|embedded/i },
  { cats: ['compiler'], re: /compiler|automata|formal language|theory of computation/i },
  { cats: ['ml'], re: /machine learning|artificial intelligence|deep learning|neural|\bai\b|\bml\b/i },
  { cats: ['cloud'], re: /cloud|distributed|virtuali[sz]ation|iot|internet of things/i },
  { cats: ['electronics'], re: /electronic|circuit|electrical|signals|analog|digital/i },
];

function detectSubject(subject = {}, syllabusText = '') {
  const label = `${subject.name || ''} ${subject.code || ''}`;
  const cats = []; 
  for (const s of SUBJECTS) if (s.re.test(label)) for (const c of s.cats) if (!cats.includes(c)) cats.push(c);
  if (!cats.length) for (const s of SUBJECTS) if (s.re.test(String(syllabusText).slice(0, 1500))) for (const c of s.cats) if (!cats.includes(c)) cats.push(c);
  const all = `${label} ${String(syllabusText).slice(0, 3000)}`;
  const language = /python/i.test(label) ? 'Python' : /\bjava\b/i.test(label) ? 'Java' : /python/i.test(all) && !/\bjava\b/i.test(all) ? 'Python' : /\bjava\b/i.test(all) && !/\bc programming|\bc language/i.test(all) ? 'Java' : 'C';
  return { categories: cats, language };
}

const LEADS = {
  3: ['Solve the following problem.', 'Solve the problem given below.', 'Apply the relevant method to solve the following problem.'],
  4: ['Analyze the following problem and work out the results.', 'Examine the problem given below and find the results.'],
  5: ['Determine the results for the following problem.', 'Evaluate the following problem and justify your result.'],
  6: ['Formulate and solve the following problem.', 'Develop a complete solution for the following problem.'],
};

function candidates(topic, unitTitle, categories) {
  const scored = [];
  for (const g of GENERATORS) {
    const inCat = categories.includes(g.cat);
    let s = 0;
    if (g.re.test(topic)) s = 10 + (inCat ? 6 : 0);
    else if (inCat && unitTitle && g.re.test(unitTitle)) s = 4;
    if (s) scored.push({ g, s });
  }
  const best = Math.max(0, ...scored.map((x) => x.s));
  return scored.filter((x) => x.s === best).map((x) => x.g);
}

/**
 * @returns {{text, answer, verified, generator, category}|null}
 *  null when no verified generator exists for the topic - the caller must say so (nothing is invented).
 */
function generateSum({ subject, syllabusText = '', topic = '', unitTitle = '', level = 3, taken = new Set(), rng, seed }) {
  const det = detectSubject(subject, syllabusText);
  const cands = candidates(String(topic), String(unitTitle), det.categories);
  if (!cands.length) return null;
  const r = rng || makeRng(seed);
  r.topic = String(topic);
  programming.setLang(det.language);
  const lvl = Math.max(3, Math.min(6, Number(level) || 3));
  const order = r.shuffle(cands);
  let fallback = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const g = order[attempt % order.length];
    let o;
    try { o = g.make(r); } catch { continue; } // an invalid instance is rejected and re-drawn
    if (!o || !o.text || !o.answer) continue;
    const sub = (t) => String(t).replace(/\(iv\)/g, '(d)').replace(/\(iii\)/g, '(c)').replace(/\(ii\)/g, '(b)').replace(/\(i\)/g, '(a)'); // inner parts use (a)(b) so they never clash with the paper's (i)(ii) split
    const res = { text: sub(`${r.pick(LEADS[lvl])} ${o.text}`.replace(/\s{2,}/g, ' ').replace(/\+ -/g, '- ')), answer: sub(o.answer), verified: o.verified !== false, generator: g.id, category: g.cat };
    if (!taken.has(res.text.toLowerCase())) return res;
    fallback = fallback || res;
  }
  return fallback; // repeated text only if the generator space for this topic is exhausted
}

const listGenerators = () => GENERATORS.map((g) => ({ id: g.id, category: g.cat, topics: g.re.source }));

module.exports = { generateSum, detectSubject, listGenerators, GENERATORS, makeRng };
