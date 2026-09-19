import { ArrowLeft, FileMagnifyingGlass } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adapter } from "../adapterClient";
import { availableActions, currentAttemptId, type ActionDescriptor } from "../actions";
import type { AttemptModel, AssessmentModel, CreditModel, TransactionState } from "../adapter";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { TransactionFeedback } from "../components/TransactionFeedback";
import { isContractConfigured } from "../config";
import { explorerAddressUrl, launchModeLabel, phaseLabel, phaseTone, shortHex, tierLabel } from "../labels";
import { useWallet } from "../wallet/WalletProvider";

function participantName(address: string, assessment: AssessmentModel, account: string): string {
  const normalized = address.toLowerCase();
  const isConnected = account.toLowerCase() === normalized;
  if (assessment.sponsor.toLowerCase() === normalized) return isConnected ? "Sponsor (you)" : shortHex(address);
  if (assessment.operator.toLowerCase() === normalized) return isConnected ? "AI operator (you)" : shortHex(address);
  if (assessment.steward.toLowerCase() === normalized) return isConnected ? "Safety steward (you)" : shortHex(address);
  return shortHex(address);
}

function formatTimestamp(seconds: number): string {
  if (!seconds) return "Not recorded";
  return new Date(seconds * 1000).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function AssessmentDetailPage() {
  const { assessmentId = "" } = useParams();
  const { account } = useWallet();
  const [assessment, setAssessment] = useState<AssessmentModel | null>(null);
  const [attempt, setAttempt] = useState<AttemptModel | null>(null);
  const [credit, setCredit] = useState<CreditModel | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [txState, setTxState] = useState<TransactionState | null>(null);
  const [busyAction, setBusyAction] = useState("");

  const reload = useCallback(async () => {
    if (!isContractConfigured || !assessmentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const record = await adapter.getAssessment(assessmentId);
      setAssessment(record);
      setLoadError("");
      if (record.attemptCount > 0) {
        setAttempt(await adapter.getAttempt(currentAttemptId(record)));
      } else {
        setAttempt(null);
      }
      if (account) {
        setCredit(await adapter.getCredit(record.assessmentId, account));
      } else {
        setCredit(null);
      }
    } catch (cause) {
      setAssessment(null);
      setLoadError(cause instanceof Error ? cause.message : "The canonical assessment could not be read.");
    } finally {
      setLoading(false);
    }
  }, [assessmentId, account]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const runAction = async (action: ActionDescriptor) => {
    if (!assessment) return;
    setBusyAction(action.key);
    setTxState({ phase: "AWAITING_SIGNATURE", message: "Confirm this transaction in your selected wallet." });
    try {
      if (action.key === "ratify") {
        const digest = await adapter.getProfileDigest(assessment.assessmentId);
        await adapter.ratifyAssessment(assessment.assessmentId, digest, setTxState);
      } else if (action.key === "request-review") {
        await adapter.requestReview(assessment.assessmentId, setTxState);
      } else if (action.key === "retry-review") {
        await adapter.retryReview(assessment.assessmentId, currentAttemptId(assessment), setTxState);
      } else if (action.key === "cancel-unratified") {
        await adapter.cancelUnratified(assessment.assessmentId, setTxState);
      } else if (action.key === "recover-expired") {
        await adapter.recoverExpired(assessment.assessmentId, setTxState);
      } else if (action.key === "withdraw") {
        await adapter.withdrawCredit(assessment.assessmentId, setTxState);
      }
      await reload();
    } catch {
      // Failure state is already reported through txState by the adapter.
    } finally {
      setBusyAction("");
    }
  };

  const actions = assessment ? availableActions(account, assessment, credit) : [];
  const unresolved = Boolean(txState && txState.phase !== "FINALIZED" && txState.phase !== "FAILED");

  return (
    <div>
      <Link className="back-link" to="/assessments"><ArrowLeft aria-hidden="true" />All assessments</Link>
      <PageHeader
        eyebrow="Canonical assessment"
        title={assessment ? assessment.systemName : assessmentId || "Assessment"}
        description={assessment ? `${assessment.assessmentId} · ${phaseLabel(assessment.phase)}` : "Profile approvals, neutral review status, launch mode, and budget routing appear here after a canonical read."}
      />
      {loading && <p className="field-intro" role="status">Reading canonical contract state…</p>}
      {!loading && !assessment && (
        <EmptyState
          icon={FileMagnifyingGlass}
          title={isContractConfigured ? "Assessment not found" : "Canonical detail unavailable"}
          description={
            !isContractConfigured
              ? "Tierline will not invent a profile or outcome. Configure a deployed contract before this route can read canonical state."
              : loadError || "No assessment with this ID was returned by the configured contract."
          }
          action={<Link className="button secondary" to="/assessments">Return to assessments</Link>}
        />
      )}
      {assessment && (
        <div className="detail-grid">
          <div className="detail-panel">
            <span className={`status-pill ${phaseTone(assessment.phase)}`}>{phaseLabel(assessment.phase)}</span>
            <h2 style={{ marginTop: 12 }}>Launch route</h2>
            <p style={{ color: "var(--text-muted)", marginTop: 0 }}>{launchModeLabel(assessment.launchMode)}{assessment.tier ? ` · ${tierLabel(assessment.tier)}` : ""}</p>
            <p style={{ color: "var(--text-muted)" }}>{assessment.purpose}</p>
            <dl>
              <div><dt>People affected</dt><dd>{assessment.affectedPeople}</dd></div>
              <div><dt>Decision role</dt><dd>{assessment.decisionRole}</dd></div>
              <div><dt>Budget locked</dt><dd>{assessment.lockedGen} GEN</dd></div>
              <div><dt>Credited to roles</dt><dd>{assessment.creditedTotalGen} GEN</dd></div>
              <div><dt>Withdrawn</dt><dd>{assessment.withdrawnTotalGen} GEN</dd></div>
            </dl>
          </div>

          <div className="detail-panel">
            <h2>Participants</h2>
            <dl>
              <div><dt>Sponsor</dt><dd><a href={explorerAddressUrl(assessment.sponsor)} target="_blank" rel="noreferrer">{participantName(assessment.sponsor, assessment, account)}</a></dd></div>
              <div><dt>AI operator</dt><dd><a href={explorerAddressUrl(assessment.operator)} target="_blank" rel="noreferrer">{participantName(assessment.operator, assessment, account)}</a> · {assessment.operatorRatified ? "approved" : "pending"}</dd></div>
              <div><dt>Safety steward</dt><dd><a href={explorerAddressUrl(assessment.steward)} target="_blank" rel="noreferrer">{participantName(assessment.steward, assessment, account)}</a> · {assessment.stewardRatified ? "approved" : "pending"}</dd></div>
              <div><dt>Ratification deadline</dt><dd>{formatTimestamp(assessment.ratificationDeadline)}</dd></div>
              <div><dt>Review deadline</dt><dd>{formatTimestamp(assessment.reviewDeadline)}</dd></div>
            </dl>
          </div>

          {(actions.length > 0 || txState || (credit && credit.amountGen !== "0")) && (
            <div className="detail-panel">
              <h2>Available actions</h2>
              {credit && credit.amountGen !== "0" && (
                <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
                  Owned credit: <strong>{credit.amountGen} GEN</strong> ({credit.kind === "SPONSOR_REFUND" ? "sponsor refund" : credit.kind === "OPERATOR" ? "operator credit" : "stewardship credit"}{credit.withdrawn ? ", already withdrawn" : ""}).
                </p>
              )}
              {actions.length === 0 && !unresolved && <p style={{ color: "var(--text-muted)" }}>No action is available for the connected wallet in this state.</p>}
              <div className="action-rail">
                {actions.map((action) => (
                  <button
                    key={action.key}
                    className="button primary"
                    type="button"
                    title={action.description}
                    disabled={unresolved || busyAction !== ""}
                    onClick={() => void runAction(action)}
                  >
                    {busyAction === action.key ? "Waiting…" : action.label}
                  </button>
                ))}
              </div>
              <TransactionFeedback state={txState} onRetry={busyAction === "" ? () => setTxState(null) : undefined} />
            </div>
          )}

          {attempt && (
            <div className="detail-panel">
              <h2>Latest review attempt</h2>
              <dl>
                <div><dt>Outcome</dt><dd>{attempt.outcome === "TERMINAL" ? tierLabel(attempt.tier) : "Could not be verified — retry allowed"}</dd></div>
                <div><dt>Policy coverage</dt><dd>{attempt.sourceCoverage === "FULL" ? "Official guide read in full" : "Official guide unavailable"}</dd></div>
                {attempt.basisCodes.length > 0 && <div><dt>Policy basis</dt><dd>{attempt.basisCodes.join(", ").replaceAll("_", " ").toLowerCase()}</dd></div>}
                <div><dt>Recorded</dt><dd>{formatTimestamp(attempt.txTime)}</dd></div>
                {attempt.reason && <div><dt>Reviewer note</dt><dd>{attempt.reason}</dd></div>}
              </dl>
            </div>
          )}

          <details className="tech-details">
            <summary>Technical details</summary>
            <dl>
              <div><dt>Assessment ID</dt><dd className="mono">{assessment.assessmentId}</dd></div>
              <div><dt>Profile digest</dt><dd className="mono">{assessment.profileDigest}</dd></div>
              <div><dt>Policy source</dt><dd><a href={assessment.sourceUrl} target="_blank" rel="noreferrer">EC AI Act risk guide</a> · {assessment.sourceVersion}</dd></div>
              <div><dt>Canonical phase</dt><dd className="mono">{assessment.phase}</dd></div>
              <div><dt>Attempts recorded</dt><dd>{assessment.attemptCount}</dd></div>
              <div><dt>Sponsor</dt><dd className="mono">{assessment.sponsor}</dd></div>
              <div><dt>Operator</dt><dd className="mono">{assessment.operator}</dd></div>
              <div><dt>Safety steward</dt><dd className="mono">{assessment.steward}</dd></div>
            </dl>
            <p className="fine-print">The launch mode describes this co-ratified profile under the locked policy version. It is not legal advice, a legal ruling, or proof that a deployed system behaves as described.</p>
          </details>
        </div>
      )}
    </div>
  );
}
