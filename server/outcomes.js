// Programme Outcomes (POs) of the B.E./B.Tech CSE programme, plus the rule that
// picks a PO for each generated question.
const PROGRAM_OUTCOMES = [
  { code: 'PO1', name: 'Engineering Knowledge', domain: 'Cognitive', text: 'Apply the knowledge of mathematics, science, engineering fundamentals and an engineering specialization to the solution of complex engineering problems.' },
  { code: 'PO2', name: 'Problem Analysis', domain: 'Cognitive', text: 'Identify, formulate, research the literature and analyze complex engineering problems and reach substantiated conclusions using first principles of mathematics, the natural sciences and the engineering sciences.' },
  { code: 'PO3', name: 'Design/Development of Solutions', domain: 'Cognitive, Affective', text: 'Design solutions for complex engineering problems and design system components or processes that meet the specified needs with appropriate consideration for public health and safety as well as cultural, societal and environmental concerns.' },
  { code: 'PO4', name: 'Investigation', domain: 'Cognitive, Psychomotor', text: 'Conduct investigations of complex problems, considering design of experiments, analysis and interpretation of data and synthesis of information to provide valid conclusions.' },
  { code: 'PO5', name: 'Modern Tool Usage', domain: 'Psychomotor, Cognitive', text: 'Create, select and apply appropriate techniques, resources and modern engineering and IT tools including prediction and modeling to complex engineering activities with an understanding of the limitations.' },
  { code: 'PO6', name: 'The Engineer and Society', domain: 'Affective', text: 'Apply reasoning informed by contextual knowledge to assess societal, health, safety, legal and cultural issues and the consequent responsibilities relevant to professional engineering practice.' },
  { code: 'PO7', name: 'Environment and Sustainability', domain: 'Affective, Cognitive', text: 'Understand the impact of professional engineering solutions in societal and environmental contexts and demonstrate the knowledge of, and need for sustainable development.' },
  { code: 'PO8', name: 'Ethics', domain: 'Affective', text: 'Apply ethical principles and commit to professional ethics, responsibilities and the norms of the engineering practice.' },
  { code: 'PO9', name: 'Individual Work and Teamwork', domain: 'Psychomotor, Affective', text: 'Function effectively as an individual and as a member or leader of diverse teams as well as in multidisciplinary settings.' },
  { code: 'PO10', name: 'Communication', domain: 'Psychomotor, Affective', text: 'Communicate effectively about complex engineering activities with the engineering community and with society at large. Be able to comprehend and write effective reports, design documentation, make effective presentations and give and receive clear instructions.' },
  { code: 'PO11', name: 'Project Management and Finance', domain: 'Cognitive, Psychomotor', text: 'Demonstrate knowledge and understanding of the engineering and management principles and apply these to one’s own work as a member or a leader of a team to manage projects in multidisciplinary environments.' },
  { code: 'PO12', name: 'Life-Long Learning', domain: 'Affective, Psychomotor', text: 'Recognize the need for and have the preparation and ability to engage in independent, life-long learning in the broadest context of technological change.' },
];

// Subject-matter cues that point to a specific PO (checked for K3 and above only;
// recall/understanding questions stay on PO1, as in the department's sample papers).
const KEYWORD_RULES = [
  [/\b(ethic\w*|plagiari\w+|integrity|privacy)\b/i, 'PO8'],
  [/\b(environment\w*|sustainab\w+|pollution|climate|ecolog\w+|renewable|carbon|waste)\b/i, 'PO7'],
  [/\b(safety|legal|law|laws|societ\w+|public health|cultural|compliance)\b/i, 'PO6'],
  [/\b(team\w*|collaborat\w+|leader\w*)\b/i, 'PO9'],
  [/\b(report|presentation|documentation|communicat\w+)\b/i, 'PO10'],
  [/\b(project (management|plan\w*)|budget\w*|financ\w+)\b/i, 'PO11'],
  [/\b(life-?long|emerging (trends|technolog\w+))\b/i, 'PO12'],
  [/\b(tools?|software|simulat\w+|case tools?)\b/i, 'PO5'],
];

/** Picks the PO for a finished question from its Bloom level and wording. */
function assignPO(level, text, topic = '') {
  const lv = Number(level);
  const t = String(text || '').trim();
  if (lv >= 3) {
    const hay = `${t} ${topic}`;
    for (const [re, po] of KEYWORD_RULES) if (re.test(hay)) return po;
  }
  if (lv <= 2) return 'PO1';
  if (lv === 3) return /^(develop|construct|build|design|create|model|plan|organize)\b/i.test(t) ? 'PO3' : 'PO2';
  if (lv === 4) return /^(examine|inspect|survey|test|discover|dissect)\b/i.test(t) ? 'PO4' : 'PO2';
  if (lv === 5) return 'PO4';
  return 'PO3';
}

module.exports = { PROGRAM_OUTCOMES, assignPO };
