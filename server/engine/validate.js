// A numerical (Sum) question is only valid when a student can actually solve it: it must carry
// real data and an explicit task, and must not be one of the old generic placeholders.
const GENERIC = /(numerical|short|simple|worked|design|sample) problems? (on|based on|about)\b|solve a problem based on|suitable (method|formula)|calculate the answer using|show every step of the working|^(explain|discuss|define|describe|list|state|what is|why is)\b/i;
const TASK = /\b(find|calculate|compute|determine|evaluate|estimate|encrypt|decrypt|predict|trace|draw|write|construct|apply|show|translate|classify|test|check|identify|derive|solve)\b/i;

function validateNumerical(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  const problems = [];
  if (t.length < 60) problems.push('too short to contain a full problem');
  if (GENERIC.test(t)) problems.push('generic placeholder wording');
  const nums = t.match(/-?\d+(?:\.\d+)?/g) || [];
  const given = nums.length + (t.match(/"[^"]{2,}"/g) || []).length + (t.match(/→|->/g) || []).length + (t.match(/\([^()]*,[^()]*\)/g) || []).length;
  if (given < 2) problems.push('fewer than 2 given values');
  if (!TASK.test(t)) problems.push('no clear task for the student');
  return { ok: problems.length === 0, problems };
}
module.exports = { validateNumerical };
