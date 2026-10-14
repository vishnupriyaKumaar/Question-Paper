// Assessment types and their default mark patterns (taken from the sample papers).
// Each row: marks x count = total. `choice` = either/or (a / b) questions.
// `levels` = Bloom's levels (1-6) the questions in that part are drawn from.
// `units` = syllabus units covered (Assessment 1 -> Units 1-2, Assessment 2 -> Units 3-4).
const ASSESSMENTS = {
  assessment1: {
    key: 'assessment1',
    label: 'Assessment 1',
    title: 'ASSESSMENT TEST - I',
    time: '1 ½ Hours',
    units: [1, 2],
    pattern: [
      { marks: 2, count: 7, choice: false, levels: [1, 2] },
      { marks: 13, count: 2, choice: true, levels: [2, 3] },
      { marks: 10, count: 1, choice: true, levels: [3, 4] },
    ],
  },
  assessment2: {
    key: 'assessment2',
    label: 'Assessment 2',
    title: 'ASSESSMENT TEST - II',
    time: '1:30 Hours',
    units: [3, 4],
    pattern: [
      { marks: 2, count: 7, choice: false, levels: [1, 2] },
      { marks: 13, count: 2, choice: true, levels: [2, 3] },
      { marks: 10, count: 1, choice: true, levels: [3, 4] },
    ],
  },
  model: {
    key: 'model',
    label: 'Model Test',
    title: 'MODEL EXAMINATION',
    time: '3 Hrs',
    units: [1, 2, 3, 4, 5],
    pattern: [
      { marks: 2, count: 10, choice: false, levels: [1, 2] },
      { marks: 13, count: 5, choice: true, levels: [2, 3] },
      { marks: 15, count: 1, choice: true, levels: [3, 4] },
    ],
  },
};

module.exports = { ASSESSMENTS };
