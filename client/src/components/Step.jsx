// One numbered step of the workflow. Locked steps are dimmed and inert until the
// previous step is finished, so the page reads as a sequence while scrolling.
export default function Step({ n, id, title, hint, locked, lockedNote, done, active, children }) {
  return (
    <section id={id} className={`step${locked ? ' locked' : ''}${active && !locked ? ' in-view' : ''}`} data-step={n} aria-labelledby={`${id}-h`}>
      <header className="step-head">
        <span className={`step-no${done ? ' done' : ''}`} aria-hidden="true">{done ? '✓' : n}</span>
        <div>
          <h2 id={`${id}-h`}>{title}</h2>
          {hint && <p className="muted">{hint}</p>}
        </div>
      </header>
      {locked ? <p className="locked-note">{lockedNote}</p> : <div className="step-body">{children}</div>}
    </section>
  );
}
