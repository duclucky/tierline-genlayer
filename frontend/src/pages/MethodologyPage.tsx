import { ArrowSquareOut, CheckCircle, Prohibit, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import { PageHeader } from "../components/PageHeader";

export function MethodologyPage() {
  return (
    <article className="method-page">
      <PageHeader eyebrow="Methodology" title="A policy route, not a legal verdict" description="Tierline limits what validators may inspect, what consensus may decide, and what the contract may do next." />
      <nav className="anchor-nav" aria-label="Methodology sections"><a href="#source">Source</a><a href="#tiers">Tier meanings</a><a href="#failure">Failure policy</a><a href="#limits">Limits</a></nav>
      <section id="source"><span className="section-icon"><ShieldCheck aria-hidden="true" /></span><div><h2>One authoritative source version</h2><p>Validators fetch the allowlisted European Commission AI Act risk guide and require the official page identity, four risk headings, and the locked “Last update 3 August 2026” marker.</p><a href="https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai" target="_blank" rel="noreferrer">Open the official Commission guide <ArrowSquareOut aria-hidden="true" /></a></div></section>
      <section id="tiers"><span className="section-icon"><Sparkle aria-hidden="true" /></span><div><h2>Meaning before consequence</h2><p>The model classifies only the exact profile ratified onchain. It returns one bounded tier and supported basis codes. Contract code validates the structure, then derives the launch mode and credit destinations.</p><div className="tier-definitions"><p><strong>Minimal</strong> Launch allowed under the private policy.</p><p><strong>Transparency</strong> Disclosure is required before the consumer treats the route as ready.</p><p><strong>High risk</strong> Safeguard review is required.</p><p><strong>Prohibited</strong> The consumer must block the route under this policy.</p></div></div></section>
      <section id="failure"><span className="section-icon"><CheckCircle aria-hidden="true" /></span><div><h2>Failure cannot become punishment</h2><p>A missing source marker, wrong origin, malformed verdict, wrong assessment binding, or unsupported basis code produces a retryable result or reverts before mutation. No launch right, credit, settlement, or GEN moves.</p></div></section>
      <section id="limits"><span className="section-icon"><Prohibit aria-hidden="true" /></span><div><h2>What Tierline does not prove</h2><ul><li>It does not confirm that the described AI system exists.</li><li>It does not inspect private data or operational logs.</li><li>It does not prove disclosures or safeguards were implemented.</li><li>It is not legal advice, a regulator decision, or a compliance certificate.</li></ul></div></section>
    </article>
  );
}

