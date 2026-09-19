import { ArrowLeft, ArrowRight, Check, WarningCircle } from "@phosphor-icons/react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { TransactionFeedback } from "../components/TransactionFeedback";
import { isContractConfigured } from "../config";
import { adapter } from "../adapterClient";
import type { TransactionState } from "../adapter";
import { useWallet } from "../wallet/WalletProvider";

const steps = ["Participants", "Use profile", "Timing", "Review & fund"];

type FormState = {
  operator: string;
  steward: string;
  systemName: string;
  purpose: string;
  affectedPeople: string;
  decisionRole: string;
  ratificationDays: string;
  reviewDays: string;
};

const initialForm: FormState = {
  operator: "",
  steward: "",
  systemName: "",
  purpose: "",
  affectedPeople: "",
  decisionRole: "",
  ratificationDays: "3",
  reviewDays: "7",
};

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function NewAssessmentPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [showErrors, setShowErrors] = useState(false);
  const [txState, setTxState] = useState<TransactionState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { account, openModal } = useWallet();
  const navigate = useNavigate();

  const stepValid = useMemo(() => {
    if (step === 0) return isAddress(form.operator) && isAddress(form.steward) && form.operator.toLowerCase() !== form.steward.toLowerCase();
    if (step === 1) return form.systemName.trim().length >= 3 && form.purpose.trim().length >= 40 && form.affectedPeople.trim().length >= 20 && form.decisionRole.trim().length >= 20;
    if (step === 2) return Number(form.ratificationDays) >= 1 && Number(form.ratificationDays) <= 14 && Number(form.reviewDays) >= 1 && Number(form.reviewDays) <= 30;
    return true;
  }, [step, form]);

  const update = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const next = () => {
    if (!stepValid) { setShowErrors(true); return; }
    setShowErrors(false);
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };
  const previous = () => { setShowErrors(false); setStep((current) => Math.max(0, current - 1)); };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setTxState({ phase: "AWAITING_SIGNATURE", message: "Confirm the 2 GEN creation transaction in your selected wallet." });
    try {
      const now = Math.floor(Date.now() / 1000);
      await adapter.createAssessment(
        {
          operator: form.operator.trim(),
          steward: form.steward.trim(),
          systemName: form.systemName.trim(),
          purpose: form.purpose.trim(),
          affectedPeople: form.affectedPeople.trim(),
          decisionRole: form.decisionRole.trim(),
          ratificationDeadline: now + Number(form.ratificationDays) * 24 * 60 * 60,
          reviewDeadline: now + (Number(form.ratificationDays) + Number(form.reviewDays)) * 24 * 60 * 60,
        },
        setTxState,
      );
      const ids = await adapter.listAssessmentIds();
      const newest = ids[ids.length - 1];
      setTxState(null);
      if (newest) navigate(`/assessments/${newest}`);
    } catch {
      // Failure is reported through txState by the adapter.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-page">
      <PageHeader eyebrow="Sponsor workflow" title="New assessment" description="Lock one precise use profile for independent ratification and neutral policy review." />
      <ol className="stepper" aria-label="Assessment creation progress">
        {steps.map((label, index) => (
          <li key={label} className={index === step ? "current" : index < step ? "complete" : ""} aria-current={index === step ? "step" : undefined}>
            <span>{index < step ? <Check aria-hidden="true" /> : index + 1}</span><small>{label}</small>
          </li>
        ))}
      </ol>

      <form className="assessment-form" onSubmit={submit} noValidate>
        {showErrors && <div className="error-summary" role="alert" tabIndex={-1}><WarningCircle aria-hidden="true" /><span><strong>Check this step.</strong> Complete the highlighted fields before continuing.</span></div>}

        {step === 0 && (
          <fieldset><legend>Who must agree?</legend><p className="field-intro">The connected sponsor creates the assessment. The operator and steward must be different valid EVM addresses.</p>
            <label>AI operator address<input value={form.operator} onChange={(e) => update("operator", e.target.value)} placeholder="0x…" aria-invalid={showErrors && !isAddress(form.operator)} /><small>The team seeking a launch route and operator credit.</small></label>
            <label>Safety steward address<input value={form.steward} onChange={(e) => update("steward", e.target.value)} placeholder="0x…" aria-invalid={showErrors && (!isAddress(form.steward) || form.operator.toLowerCase() === form.steward.toLowerCase())} /><small>The independent role responsible for safeguard readiness.</small></label>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset><legend>Describe the exact AI use</legend><p className="field-intro">Write observable purpose and decision context. Do not include private or personal data.</p>
            <label>System name<input value={form.systemName} onChange={(e) => update("systemName", e.target.value)} maxLength={80} aria-invalid={showErrors && form.systemName.trim().length < 3} /><small>{form.systemName.length}/80 characters</small></label>
            <label>Purpose and operating context<textarea value={form.purpose} onChange={(e) => update("purpose", e.target.value)} rows={5} maxLength={900} aria-invalid={showErrors && form.purpose.trim().length < 40} /><small>At least 40 characters. Explain what the system does and where it is used.</small></label>
            <label>People or groups affected<textarea value={form.affectedPeople} onChange={(e) => update("affectedPeople", e.target.value)} rows={3} maxLength={500} aria-invalid={showErrors && form.affectedPeople.trim().length < 20} /><small>Describe whose access, work, safety, or information may be affected.</small></label>
            <label>Role in decisions<textarea value={form.decisionRole} onChange={(e) => update("decisionRole", e.target.value)} rows={3} maxLength={500} aria-invalid={showErrors && form.decisionRole.trim().length < 20} /><small>State whether the AI informs, recommends, ranks, or makes a decision.</small></label>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset><legend>Set the review windows</legend><p className="field-intro">Every time-bounded write enforces its own deadline. Equality is late.</p>
            <div className="field-pair">
              <label>Ratification window (days)<input type="number" min="1" max="14" value={form.ratificationDays} onChange={(e) => update("ratificationDays", e.target.value)} aria-invalid={showErrors && (Number(form.ratificationDays) < 1 || Number(form.ratificationDays) > 14)} /><small>1–14 days for both parties to sign.</small></label>
              <label>Review window (days)<input type="number" min="1" max="30" value={form.reviewDays} onChange={(e) => update("reviewDays", e.target.value)} aria-invalid={showErrors && (Number(form.reviewDays) < 1 || Number(form.reviewDays) > 30)} /><small>1–30 days for review and any retry.</small></label>
            </div>
          </fieldset>
        )}

        {step === 3 && (
          <fieldset><legend>Review before funding</legend>
            <div className="review-grid">
              <div><span>Sponsor</span><strong className="mono">{account || "Wallet not connected"}</strong></div>
              <div><span>Operator</span><strong className="mono">{form.operator}</strong></div>
              <div><span>Safety steward</span><strong className="mono">{form.steward}</strong></div>
              <div><span>System</span><strong>{form.systemName}</strong></div>
              <div><span>Policy source</span><strong>EC guide · 3 August 2026</strong></div>
              <div><span>Creation value</span><strong>2 GEN</strong></div>
            </div>
            <div className="profile-preview"><span>Use profile</span><p>{form.purpose}</p><p><strong>Affected:</strong> {form.affectedPeople}</p><p><strong>Decision role:</strong> {form.decisionRole}</p></div>
            {!account && <div className="inline-alert"><strong>Wallet required.</strong> Connect the sponsor wallet to continue.</div>}
            {account && !isContractConfigured && <div className="inline-alert"><strong>Contract unavailable.</strong> The 2 GEN write stays disabled until a deployed contract address is configured.</div>}
            <TransactionFeedback state={txState} onRetry={submitting ? undefined : () => setTxState(null)} />
          </fieldset>
        )}

        <div className="form-actions">
          <div>{step > 0 ? <button className="button ghost" type="button" onClick={previous}><ArrowLeft aria-hidden="true" />Back</button> : <Link className="button ghost" to="/assessments">Cancel</Link>}</div>
          {step < steps.length - 1 ? (
            <button className="button primary" type="button" onClick={next}>Continue <ArrowRight aria-hidden="true" /></button>
          ) : !account ? (
            <button className="button primary" type="button" onClick={openModal}>Connect sponsor wallet</button>
          ) : (
            <button className="button primary" type="submit" disabled={!isContractConfigured || submitting}>{submitting ? "Waiting…" : "Create with 2 GEN"}</button>
          )}
        </div>
      </form>
    </div>
  );
}

