// Fixed footer: team credit in the left corner, department copyright in the right.
export default function CornerBar() {
  return (
    <footer className="corner-bar">
      <span className="made-by">
        <img src="/brand/otc-logo.png" alt="" width="26" height="26" />
        <span>Made By The Team OTC</span>
      </span>
      <span className="copyright">
        &copy; Copyright &ndash; Department of Computer Science <span className="nowrap">(Batch : 2024 &ndash; 2028)</span>
      </span>
    </footer>
  );
}
