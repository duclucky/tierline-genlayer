import type { AssessmentModel, CreditModel } from "./adapter";

// Pure role/state gating shared by the UI. These rules decide which
// contextual actions are visible; the contract independently re-enforces
// every condition (roles, phases, and exact transaction-time windows) at its
// own entrypoints.

export type ParticipantRole = "SPONSOR" | "OPERATOR" | "STEWARD" | "NONE";

export type ActionKey =
  | "ratify"
  | "request-review"
  | "retry-review"
  | "cancel-unratified"
  | "recover-expired"
  | "withdraw";

export type ActionDescriptor = {
  key: ActionKey;
  label: string;
  description: string;
};

const UNRESOLVED_PHASES = [
  "AWAITING_RATIFICATION",
  "READY_FOR_REVIEW",
  "RETRYABLE",
];

export function participantRole(
  account: string | null,
  assessment: AssessmentModel,
): ParticipantRole {
  if (!account) return "NONE";
  const normalized = account.toLowerCase();
  if (assessment.sponsor.toLowerCase() === normalized) return "SPONSOR";
  if (assessment.operator.toLowerCase() === normalized) return "OPERATOR";
  if (assessment.steward.toLowerCase() === normalized) return "STEWARD";
  return "NONE";
}

export function isParticipant(account: string | null, assessment: AssessmentModel): boolean {
  return participantRole(account, assessment) !== "NONE";
}

export function availableActions(
  account: string | null,
  assessment: AssessmentModel,
  ownedCredit: CreditModel | null,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): ActionDescriptor[] {
  const actions: ActionDescriptor[] = [];
  const role = participantRole(account, assessment);

  if (assessment.phase === "AWAITING_RATIFICATION" && nowSeconds < assessment.ratificationDeadline) {
    if (role === "OPERATOR" && !assessment.operatorRatified) {
      actions.push({
        key: "ratify",
        label: "Approve profile as operator",
        description: "Sign the exact canonical profile before the ratification deadline.",
      });
    }
    if (role === "STEWARD" && !assessment.stewardRatified) {
      actions.push({
        key: "ratify",
        label: "Approve profile as safety steward",
        description: "Sign the exact canonical profile before the ratification deadline.",
      });
    }
  }

  if (
    assessment.phase === "AWAITING_RATIFICATION" &&
    role === "SPONSOR" &&
    nowSeconds >= assessment.ratificationDeadline &&
    nowSeconds < assessment.reviewDeadline
  ) {
    actions.push({
      key: "cancel-unratified",
      label: "Cancel unratified assessment",
      description: "Recover the 2 GEN budget as a sponsor credit.",
    });
  }

  if (
    assessment.phase === "READY_FOR_REVIEW" &&
    isParticipant(account, assessment) &&
    nowSeconds < assessment.reviewDeadline
  ) {
    actions.push({
      key: "request-review",
      label: "Request neutral review",
      description: "Validators independently read the locked official policy and classify this profile.",
    });
  }

  if (
    assessment.phase === "RETRYABLE" &&
    isParticipant(account, assessment) &&
    nowSeconds < assessment.reviewDeadline
  ) {
    actions.push({
      key: "retry-review",
      label: "Retry review",
      description: "Retry the review with the current attempt; no budget or launch right has moved.",
    });
  }

  if (
    UNRESOLVED_PHASES.includes(assessment.phase) &&
    !assessment.settled &&
    role === "SPONSOR" &&
    nowSeconds >= assessment.reviewDeadline
  ) {
    actions.push({
      key: "recover-expired",
      label: "Recover expired budget",
      description: "The review window ended unresolved; recover the 2 GEN as a sponsor credit.",
    });
  }

  if (
    ownedCredit &&
    !ownedCredit.withdrawn &&
    ownedCredit.amountGen !== "0" &&
    assessment.settled
  ) {
    actions.push({
      key: "withdraw",
      label: "Withdraw credit",
      description: "Transfer the owned credit to the connected wallet.",
    });
  }

  return actions;
}

export function currentAttemptId(assessment: AssessmentModel): string {
  if (assessment.attemptCount <= 0) return "";
  return `${assessment.assessmentId}-T-${assessment.attemptCount}`;
}
