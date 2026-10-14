// Optional AI question writer (Claude API). If ANTHROPIC_API_KEY is not set or
// the call fails, the generator falls back to built-in Bloom's templates.
const config = require('./config');
const { LEVELS } = require('./bloom');
const COVERAGE_LABEL = { first: '1st half of the unit', second: '2nd half of the unit', middle: 'Middle part of the unit' };

let client;
function getClient() {
  if (!config.anthropicKey) return null;
  if (!client) {
    const Anthropic = require('@anthropic-ai/sdk');
    client = new Anthropic({ apiKey: config.anthropicKey, timeout: 90000 });
  }
  return client;
}

/** Prompt block that teaches the writer the house style of worked problems, using the user's own uploaded paper. */
function styleBlock(examples = []) {
  const ex = examples.filter(Boolean).slice(0, 5).map((e, i) => `Example ${i + 1}: ${String(e).replace(/\s+/g, ' ').slice(0, 600)}`).join('\n');
  return `STYLE OF NUMERICAL / PROBLEM-SOLVING QUESTIONS (SUMS)
Write every SUM like a real university exam problem for THIS subject: a short realistic scenario or a given function/data set, concrete numbers (tables written as "X | 1 | 2 | 3" rows when data is needed), then clearly asked parts such as (i) ..., (ii) ... where the marks allow. Use the notation and kind of problem normal for the subject (it varies by subject: probability and statistics, circuits, algorithms, networks, maths and so on).${ex ? `\nThe staff's own uploaded paper uses this style - imitate the style, difficulty and layout, but use NEW scenarios and NEW numbers (never copy these):\n${ex}` : ''}
`;
}

const available = () => Boolean(config.anthropicKey);

function parseJson(text) {
  const cleaned = String(text).replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('No JSON in AI response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

/**
 * @returns {Promise<Record<string,string>|null>} map of slot id -> question text
 */
async function writeQuestions({ subject, slots, unitTexts, setLabel, avoid = [], styleExamples = [] }) {
  const c = getClient();
  if (!c) return null;

  const units = [...new Set(slots.map((s) => s.unit))];
  const syllabus = units
    .map((u) => `### UNIT ${u}\n${(unitTexts[u] || '').slice(0, 3500)}`)
    .join('\n\n');

  const slotLines = slots
    .map((s) => {
      const lv = LEVELS[s.level];
      const scope = s.coverage && s.coverage !== 'full' && s.scopeTopics ? ` | syllabus part: ${COVERAGE_LABEL[s.coverage]} - draw ONLY from these topics: ${s.scopeTopics.slice(0, 14).join('; ')}` : '';
      return `- id=${s.id} | ${s.marks} marks | Unit ${s.unit} | Bloom ${lv.code} (${lv.name}) | must begin with one of: ${lv.verbs.join(', ')} | suggested topic: ${s.topic}${s.isSum ? ' | TYPE: numerical / problem-solving SUM - give concrete numbers or data so it can be solved by calculation' : ''}${scope}`;
    })
    .join('\n');

  const prompt = `You are an experienced university examiner writing a question paper (SET ${setLabel}) for:
${subject.code} - ${subject.name}

Write exactly one question for every slot listed below, using ONLY the syllabus text provided.

RULES
1. Each question MUST begin with one of the action verbs allowed for that slot's Bloom level (see slot). This is mandatory.
2. Stay inside the slot's unit and suggested topic. Where a slot names a syllabus part (1st half / 2nd half / middle), use only the topics listed for it. The two options (a / b) of the same question number must test different topics.
3. 2-mark questions: one short direct sentence. 10/13/15-mark questions: a substantial question (e.g. "...in detail with suitable examples/diagram/case study") that can be answered in that many marks.
4. No numbering, no marks in brackets, no answers. A slot marked TYPE: SUM must be a worked numerical or problem-solving question with actual values in the style described under STYLE; it may open with the scenario or data, but the asked parts must use an allowed verb (e.g. Find / Calculate / Determine / Solve). Slot ids ending in _1, _2... are sub-parts (i), (ii)... of one question: each must be a separate, complete, smaller question on its own topic.
${avoid.length ? `5. Do NOT repeat or paraphrase these questions already used in the other set:\n${avoid.map((q) => `   - ${q}`).join('\n')}\n` : ''}
${slots.some((x) => x.isSum) ? styleBlock(styleExamples) : ''}
SLOTS
${slotLines}

SYLLABUS
${syllabus}

Reply with ONLY valid JSON, no commentary: {"questions":[{"id":"<slot id>","text":"<question>"}]}`;

  const res = await c.messages.create({
    model: config.anthropicModel,
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const parsed = parseJson(text);
  const out = {};
  for (const q of parsed.questions || []) {
    if (q && q.id && typeof q.text === 'string') out[q.id] = q.text.trim();
  }
  return out;
}

/**
 * Finds worked-problem style questions on the web (Claude's web search tool) for the given sum items.
 * The problems are adapted into the app's own wording (not copied word for word).
 * @returns {Promise<Record<string,string>|null>}
 */
async function findProblems({ subject, items, unitTexts, avoid = [], styleExamples = [] }) {
  const c = getClient();
  if (!c || !items.length) return null;
  const lines = items
    .map((s) => {
      const lv = LEVELS[s.level];
      return `- id=${s.id} | ${s.marks} marks | Unit ${s.unit} | Bloom ${lv.code} | must begin with one of: ${lv.verbs.join(', ')} | topic: ${s.topic}`;
    })
    .join('\n');
  const prompt = `You are setting numerical / problem-solving questions for ${subject.code} - ${subject.name}.
Use web search to look at typical university exam problems for each topic below (textbooks, past papers, course notes), then WRITE one problem per slot in your own words with concrete numbers or data. Do not copy any source word for word; change the values and wording. Search for problems in the same style as the staff's sample below, for this subject, and write the final problems in that style. Each question must begin with an allowed verb for its Bloom level, stay on the given topic, suit the marks, and be solvable. No answers, no numbering, no source names.
${avoid.length ? `Do not repeat these:\n${avoid.map((q) => `- ${q}`).join('\n')}\n` : ''}
${styleBlock(styleExamples)}
SLOTS
${lines}

Reply with ONLY JSON: {"questions":[{"id":"<slot id>","text":"<question>"}]}`;
  const res = await c.messages.create({
    model: config.anthropicModel,
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
    messages: [{ role: 'user', content: prompt }],
  });
  const text = (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const parsed = parseJson(text);
  const out = {};
  for (const q of parsed.questions || []) if (q && q.id && typeof q.text === 'string') out[q.id] = q.text.trim();
  return out;
}

module.exports = { writeQuestions, findProblems, available };
