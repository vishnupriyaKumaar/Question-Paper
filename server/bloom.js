// Bloom's Taxonomy action verbs (Table II of the department's rules sheet).
const LEVELS = {
  1: {
    code: 'K1',
    name: 'Remembering',
    definition: 'Retrieving, recognizing and recalling relevant knowledge from long term memory.',
    verbs: ['Choose', 'Define', 'Find', 'How', 'Label', 'List', 'Match', 'Name', 'Omit', 'Recall', 'Relate', 'Select', 'Show', 'Spell', 'Tell', 'What', 'When', 'Where', 'Which', 'Who', 'Why'],
  },
  2: {
    code: 'K2',
    name: 'Understanding',
    definition: 'Demonstrate understanding of facts and ideas by organizing, comparing, translating, interpreting, giving descriptions, and stating main ideas.',
    verbs: ['Classify', 'Compare', 'Contrast', 'Demonstrate', 'Explain', 'Discuss', 'Describe', 'Elucidate', 'Explicate', 'Extend', 'Illustrate', 'Infer', 'Interpret', 'Outline', 'Relate', 'Rephrase', 'Show', 'Summarize', 'Translate', 'Distinguish', 'Differentiate'],
  },
  3: {
    code: 'K3',
    name: 'Applying',
    definition: 'Carrying out or using a procedure through executing or implementing.',
    verbs: ['Apply', 'Build', 'Choose', 'Construct', 'Develop', 'Experiment with', 'Identify', 'Interview', 'Make use of', 'Model', 'Organize', 'Plan', 'Select', 'Solve', 'Utilize'],
  },
  4: {
    code: 'K4',
    name: 'Analyzing',
    definition: 'Breaking material into constituent parts, determining how the parts relate to one another and to an overall structure or purpose through differentiating, organizing and attributing.',
    verbs: ['Analyze', 'Assume', 'Categorize', 'Classify', 'Compare', 'Contrast', 'Discover', 'Dissect', 'Divide', 'Examine', 'Inspect', 'Simplify', 'Survey', 'Take part in', 'Test for', 'Differentiate'],
  },
  5: {
    code: 'K5',
    name: 'Evaluating',
    definition: 'Making judgements based on criteria and standards through checking and critiquing.',
    verbs: ['Agree', 'Appraise', 'Assess', 'Award', 'Choose', 'Compare', 'Conclude', 'Criticize', 'Decide', 'Deduct', 'Defend', 'Determine', 'Disprove', 'Estimate', 'Evaluate', 'Explain', 'Interpret', 'Judge', 'Justify', 'Mark', 'Measure', 'Perceive', 'Prioritize', 'Prove', 'Rate', 'Recommend', 'Rule on', 'Select', 'Support', 'Value'],
  },
  6: {
    code: 'K6',
    name: 'Creating',
    definition: 'Putting elements together to form a coherent or functional whole; reorganizing elements into a new pattern or structure through generating, planning or producing.',
    verbs: ['Adapt', 'Build', 'Change', 'Choose', 'Combine', 'Compile', 'Compose', 'Construct', 'Create', 'Delete', 'Design', 'Develop', 'Discuss', 'Elaborate', 'Estimate', 'Formulate', 'Imagine', 'Improve', 'Invent', 'Maximize', 'Minimize', 'Modify', 'Originate', 'Plan', 'Predict', 'Propose', 'Solve', 'Suppose', 'Test'],
  },
};

// "(i) Define ..." / "ii) Explain ..." -> the wording after the sub-part label.
function stripLead(line) {
  return String(line || '').replace(/^\s*\(?(?:i{1,3}|iv|v|vi|[a-f])\)\s*/i, '').trim();
}

function lineStartsWithVerb(line, lv) {
  const t = stripLead(line).toLowerCase();
  return lv.verbs.some((v) => {
    const vv = v.toLowerCase();
    return t === vv || t.startsWith(vv + ' ') || t.startsWith(vv + ',');
  });
}

// Every line of a (possibly split) question must open with a verb of the level.
function startsWithVerb(text, level) {
  const lv = LEVELS[level];
  if (!lv) return false;
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.length > 0 && lines.every((l) => lineStartsWithVerb(l, lv));
}

// First matching verb, used by the K-level analysis document.
function leadingVerb(text, level) {
  const first = stripLead(String(text || '').split('\n').find((l) => l.trim()) || '').toLowerCase();
  const lv = LEVELS[level];
  if (!lv) return '';
  const hit = [...lv.verbs]
    .sort((a, b) => b.length - a.length)
    .find((v) => first === v.toLowerCase() || first.startsWith(v.toLowerCase() + ' ') || first.startsWith(v.toLowerCase() + ','));
  return hit || '';
}

// Lowest Bloom level whose verb list the sentence opens with (0 = none).
function detectLevel(text) {
  for (let k = 1; k <= 6; k++) if (lineStartsWithVerb(text, LEVELS[k])) return k;
  return 0;
}

module.exports = { LEVELS, startsWithVerb, leadingVerb, detectLevel, stripLead };
