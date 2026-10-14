const stripLead = (line) => String(line || '').replace(/^\s*\(?(?:i{1,3}|iv|v|vi|[a-f])\)\s*/i, '').trim();

// Every line of a (possibly split) question must open with a verb of the level.
export function startsWithVerb(text, level, levels) {
  const lv = levels && levels[level];
  if (!lv) return true;
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return false;
  return lines.every((line) => {
    const t = stripLead(line).toLowerCase();
    return lv.verbs.some((v) => {
      const vv = v.toLowerCase();
      return t === vv || t.startsWith(vv + ' ') || t.startsWith(vv + ',');
    });
  });
}
