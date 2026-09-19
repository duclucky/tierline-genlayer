import { CircleNotch, WarningCircle, CheckCircle, ArrowClockwise } from "@phosphor-icons/react";
import type { TransactionState } from "../adapter";
import { explorerTransactionUrl } from "../labels";

const PHASE_COPY: Record<TransactionState["phase"], string> = {
  FEE_QUOTED: "Fee quoted",
  AWAITING_SIGNATURE: "Waiting for your signature",
  SUBMITTED: "Submitted to the network",
  ACCEPTED: "Accepted by validators",
  FINALIZED: "Finalized",
  FAILED: "Failed",
};

export function TransactionFeedback({
  state,
  onRetry,
}: {
  state: TransactionState | null;
  onRetry?: () => void;
}) {
  if (!state) return null;
  const icon =
    state.phase === "FAILED" ? (
      <WarningCircle aria-hidden="true" />
    ) : state.phase === "FINALIZED" ? (
      <CheckCircle aria-hidden="true" />
    ) : (
      <CircleNotch className="spin" aria-hidden="true" />
    );
  return (
    <div className={`tx-feedback ${state.phase === "FAILED" ? "tx-error" : ""}`} role="status">
      <span className="tx-icon">{icon}</span>
      <div>
        <strong>{PHASE_COPY[state.phase]}</strong>
        <p>{state.message}</p>
        {state.feeDepositGen !== undefined && (
          <p className="mono">Fee deposit: {state.feeDepositGen} GEN</p>
        )}
        {state.phase === "FINALIZED" && (
          <p className="mono">
            Fee consumed: {state.feeConsumedGen ?? "unavailable"}
            {state.feeConsumedGen !== undefined ? " GEN" : ""} · Refund: {state.feeRefundGen ?? "unavailable"}
            {state.feeRefundGen !== undefined ? " GEN" : ""}
          </p>
        )}
        {state.phase === "FAILED" && onRetry && (
          <button className="button secondary compact" type="button" onClick={onRetry}>
            <ArrowClockwise aria-hidden="true" />Try again
          </button>
        )}
        {state.hash && state.phase !== "AWAITING_SIGNATURE" && (
          <a className="mono tx-hash" href={explorerTransactionUrl(state.hash)} target="_blank" rel="noreferrer">
            View transaction <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </div>
  );
}
