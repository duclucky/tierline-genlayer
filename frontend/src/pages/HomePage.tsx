import { ArrowRight, CheckCircle, Coins, Scales, ShieldCheck } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

const outcomes = [
  { icon: CheckCircle, label: "Minimal risk", mode: "Launch allowed", route: "2 GEN to operator" },
  { icon: ShieldCheck, label: "Transparency", mode: "Disclosure required", route: "1 GEN + 1 GEN" },
  { icon: Scales, label: "High risk", mode: "Safeguards required", route: "2 GEN to steward" },
  { icon: Coins, label: "Prohibited", mode: "Launch blocked", route: "2 GEN sponsor refund" },
];

export function HomePage() {
  return (
    <div className="home-page">
      <section className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Neutral AI launch decisions</span>
          <h1>Agree on the facts. Let validators draw the line.</h1>
          <p className="hero-lede">
            Tierline turns one co-ratified AI use profile into a canonical launch mode and routes a 2 GEN readiness budget under a locked European Commission policy guide.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/assessments/new">Start an assessment <ArrowRight aria-hidden="true" /></Link>
            <Link className="button secondary" to="/methodology">See how it works</Link>
          </div>
          <p className="honesty-note">Private policy routing—not legal advice, regulator approval, or proof of a deployed AI system.</p>
        </div>
        <div className="decision-board" aria-label="Tierline outcome routing overview">
          <div className="board-topline"><span>One agreed profile</span><span>2 GEN readiness budget</span></div>
          <div className="board-flow" aria-hidden="true"><span /><span /><span /><span /></div>
          <div className="outcome-list">
            {outcomes.map(({ icon: Icon, label, mode, route }) => (
              <article key={label}>
                <Icon aria-hidden="true" />
                <div><strong>{label}</strong><span>{mode}</span></div>
                <small>{route}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="three-up" aria-labelledby="workflow-title">
        <div className="section-intro">
          <span className="eyebrow">A shared decision path</span>
          <h2 id="workflow-title">Three parties. One immutable profile.</h2>
        </div>
        <article><span className="step-number">01</span><h3>Sponsor the question</h3><p>Name the operator and steward, lock the source version, describe the use, and fund exactly 2 GEN.</p></article>
        <article><span className="step-number">02</span><h3>Ratify the same meaning</h3><p>Operator and steward inspect the exact profile digest and sign independently before review can begin.</p></article>
        <article><span className="step-number">03</span><h3>Follow the canonical route</h3><p>Validators interpret the policy. Contract code derives the launch mode and every credit destination.</p></article>
      </section>

      <section className="boundary-panel">
        <div><span className="eyebrow inverse">Designed for honest limits</span><h2>Unavailable evidence never becomes a penalty.</h2></div>
        <p>If the official source cannot be authenticated or the verdict fails its settlement invariants, Tierline records a retryable result and moves no launch right or GEN.</p>
        <Link to="/methodology">Read the evidence boundary <ArrowRight aria-hidden="true" /></Link>
      </section>
    </div>
  );
}

