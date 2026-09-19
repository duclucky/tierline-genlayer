import { ArrowClockwise, Coins } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adapter } from "../adapterClient";
import type { CreditModel, TransactionState } from "../adapter";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { TransactionFeedback } from "../components/TransactionFeedback";
import { isContractConfigured } from "../config";
import { useWallet } from "../wallet/WalletProvider";

const CREDIT_KIND_LABELS: Record<string, string> = {
  OPERATOR: "Operator credit",
  STEWARD: "Stewardship credit",
  SPONSOR_REFUND: "Sponsor refund",
};

export function CreditsPage() {
  const { account, openModal } = useWallet();
  const [credits, setCredits] = useState<CreditModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [txState, setTxState] = useState<TransactionState | null>(null);
  const [withdrawing, setWithdrawing] = useState("");

  const reload = useCallback(async () => {
    if (!account || !isContractConfigured) {
      setCredits([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const ids = await adapter.listAssessmentIds();
      const found: CreditModel[] = [];
      for (const id of ids) {
        try {
          const credit = await adapter.getCredit(id, account);
          if (credit.amountGen !== "0" || credit.withdrawn) found.push(credit);
        } catch {
          // A missing credit row for one assessment does not block the rest.
        }
      }
      setCredits(found);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Canonical credits could not be read.");
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const withdraw = async (credit: CreditModel) => {
    setWithdrawing(credit.assessmentId);
    setTxState({ phase: "AWAITING_SIGNATURE", message: "Confirm this transaction in your selected wallet." });
    try {
      await adapter.withdrawCredit(credit.assessmentId, setTxState);
      await reload();
    } catch {
      // Failure is reported through txState by the adapter.
    } finally {
      setWithdrawing("");
    }
  };

  const unresolved = Boolean(txState && txState.phase !== "FINALIZED" && txState.phase !== "FAILED");
  const available = credits.filter((credit) => !credit.withdrawn && credit.amountGen !== "0");
  const availableTotal = available.reduce((sum, credit) => sum + Number(credit.amountGen), 0);

  return (
    <div>
      <PageHeader eyebrow="Value recovery" title="Credits" description="Withdraw only credits owned by the connected address after a finalized Tierline outcome." />
      <section className="balance-strip" aria-label="Credit summary">
        <div><span>Available to withdraw</span><strong>{account && isContractConfigured && !loading && !error ? `${availableTotal} GEN` : "— GEN"}</strong></div>
        <div><span>Network</span><strong>Studionet</strong></div>
        <div><span>Canonical source</span><strong>{isContractConfigured ? "Contract view" : "Not configured"}</strong></div>
      </section>
      <TransactionFeedback state={txState} onRetry={!unresolved ? () => setTxState(null) : undefined} />
      {!account && (
        <EmptyState icon={Coins} title="Connect to check your credits" description="Tierline reads credit ownership from the contract for the connected address." action={<button className="button secondary" onClick={openModal}>Choose a wallet</button>} />
      )}
      {account && !isContractConfigured && (
        <EmptyState icon={Coins} title="Canonical reads unavailable" description="Without a deployed contract, Tierline cannot show a balance and will not simulate a withdrawal." />
      )}
      {account && isContractConfigured && loading && <p className="field-intro" role="status">Reading canonical credits…</p>}
      {account && isContractConfigured && !loading && error && (
        <EmptyState icon={Coins} title="Canonical read failed" description={error} action={<button className="button secondary" onClick={() => void reload()}>Try again</button>} />
      )}
      {account && isContractConfigured && !loading && !error && credits.length === 0 && (
        <EmptyState icon={Coins} title="No canonical credits to show" description="The configured contract returned no credit for this address. Credits appear after a finalized assessment routes the budget to one of your roles." action={<Link className="button secondary" to="/assessments">Open assessments</Link>} />
      )}
      {account && isContractConfigured && !loading && !error && credits.length > 0 && (
        <div className="assessment-list">
          {credits.map((credit) => (
            <div key={credit.creditKey} className="credit-card">
              <div>
                <strong>{credit.amountGen} GEN</strong>
                <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>
                  {CREDIT_KIND_LABELS[credit.kind] ?? credit.kind} · <Link to={`/assessments/${credit.assessmentId}`}>{credit.assessmentId}</Link>
                </p>
              </div>
              {credit.withdrawn ? (
                <span className="status-pill neutral">Withdrawn</span>
              ) : (
                <button
                  className="button primary"
                  type="button"
                  disabled={unresolved || withdrawing !== ""}
                  onClick={() => void withdraw(credit)}
                >
                  {withdrawing === credit.assessmentId ? "Waiting…" : "Withdraw"}
                </button>
              )}
            </div>
          ))}
          <button className="button ghost compact" type="button" onClick={() => void reload()} disabled={unresolved}>
            <ArrowClockwise aria-hidden="true" />Refresh canonical state
          </button>
        </div>
      )}
    </div>
  );
}
