// The three containers: Assessment 1, Assessment 2, Model Test.
export default function AssessStep({ assessments, value, onChange, syl }) {
  const unitCount = syl?.units?.length || 0;
  return (
    <div className="assess-grid" role="radiogroup" aria-label="Assessment type">
      {assessments.map((a) => {
        const total = a.pattern.reduce((t, r) => t + r.marks * r.count, 0);
        const covers = a.units.filter((u) => u <= unitCount);
        const selected = value === a.key;
        return (
          <button key={a.key} role="radio" aria-checked={selected} className={`assess${selected ? ' on' : ''}`} onClick={() => onChange(a.key)}>
            <span className="assess-name">{a.label}</span>
            <span className="assess-meta">{total} marks · {a.time}</span>
            <span className="assess-units">{covers.length ? `Covers unit${covers.length > 1 ? 's' : ''} ${covers.join(' and ')}` : 'Units not found in syllabus'}</span>
          </button>
        );
      })}
    </div>
  );
}
