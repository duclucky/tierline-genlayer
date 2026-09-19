import { describe, expect, it } from "vitest";
import { availableActions, currentAttemptId, participantRole } from "./actions";
import type { AssessmentModel, CreditModel } from "./adapter";

const baseTime = 1_900_000_000;

function assessment(overrides: Partial<AssessmentModel> = {}): AssessmentModel {
  return {
    assessmentId: "A-1",
    sponsor: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    operator: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    steward: "0xcccccccccccccccccccccccccccccccccccccccc",
    systemName: "Ranker",
    purpose: "Ranks applicants.",
    affectedPeople: "EU applicants.",
    decisionRole: "Human decides.",
    profileDigest: "0x123",
    sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
    sourceVersion: "EC-AI-RISK-2026-08-03",
    ratificationDeadline: baseTime + 3600,
    reviewDeadline: baseTime + 7200,
    createdAt: baseTime,
    operatorRatified: false,
    stewardRatified: false,
    phase: "AWAITING_RATIFICATION",
    tier: "",
    launchMode: "UNDECIDED",
    attemptCount: 0,
    settled: false,
    fundedGen: "2",
    lockedGen: "2",
    creditedTotalGen: "0",
    withdrawnTotalGen: "0",
    ...overrides,
  };
}

function credit(overrides: Partial<CreditModel> = {}): CreditModel {
  return {
    creditKey: "A-1|0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    assessmentId: "A-1",
    owner: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    amountGen: "2",
    kind: "OPERATOR",
    withdrawn: false,
    ...overrides,
  };
}

const keys = (account: string | null, record: AssessmentModel, owned: CreditModel | null = null, now = baseTime) =>
  availableActions(account, record, owned, now).map((action) => action.key);

describe("role and state action gating", () => {
  it("offers ratification only to the role that has not signed before the deadline", () => {
    const record = assessment();
    expect(keys("0x" + "b".repeat(40), record)).toEqual(["ratify"]);
    expect(keys("0x" + "c".repeat(40), record)).toEqual(["ratify"]);
    expect(keys("0x" + "a".repeat(40), record)).toEqual([]);
    expect(keys(null, record)).toEqual([]);
  });

  it("hides ratification once the role signed or the deadline passed", () => {
    const signed = assessment({ operatorRatified: true });
    expect(keys("0x" + "b".repeat(40), signed)).toEqual([]);
    expect(keys("0x" + "b".repeat(40), assessment(), null, baseTime + 3600)).toEqual([]);
  });

  it("offers cancellation to the sponsor only at or after the ratification deadline", () => {
    const record = assessment({ operatorRatified: true });
    expect(keys("0x" + "a".repeat(40), record, null, baseTime + 3600 - 1)).toEqual([]);
    expect(keys("0x" + "a".repeat(40), record, null, baseTime + 3600)).toEqual(["cancel-unratified"]);
    expect(keys("0x" + "b".repeat(40), record, null, baseTime + 3600)).toEqual([]);
  });

  it("offers review to participants only when ready, and retry only when retryable", () => {
    const ready = assessment({ phase: "READY_FOR_REVIEW" });
    expect(keys("0x" + "a".repeat(40), ready)).toEqual(["request-review"]);
    expect(keys("0x" + "d".repeat(40), ready)).toEqual([]);
    const retryable = assessment({ phase: "RETRYABLE", attemptCount: 1 });
    expect(keys("0x" + "b".repeat(40), retryable)).toEqual(["retry-review"]);
  });

  it("offers expiry recovery to the sponsor only at or after the review deadline", () => {
    const record = assessment({ phase: "READY_FOR_REVIEW" });
    expect(keys("0x" + "a".repeat(40), record, null, baseTime + 7200 - 1)).toEqual(["request-review"]);
    expect(keys("0x" + "a".repeat(40), record, null, baseTime + 7200)).toEqual(["recover-expired"]);
    expect(keys("0x" + "a".repeat(40), assessment({ phase: "FINAL_MINIMAL", settled: true }), null, baseTime + 7200)).toEqual([]);
  });

  it("offers withdrawal only for positive unwithdrawn owned credit on a settled assessment", () => {
    const settled = assessment({ phase: "FINAL_MINIMAL", settled: true });
    expect(keys("0x" + "b".repeat(40), settled, credit())).toEqual(["withdraw"]);
    expect(keys("0x" + "b".repeat(40), settled, credit({ withdrawn: true }))).toEqual([]);
    expect(keys("0x" + "b".repeat(40), settled, credit({ amountGen: "0" }))).toEqual([]);
    expect(keys("0x" + "d".repeat(40), assessment({ phase: "READY_FOR_REVIEW", settled: false }), credit())).toEqual([]);
  });

  it("derives the current attempt id from the canonical attempt count", () => {
    expect(currentAttemptId(assessment())).toBe("");
    expect(currentAttemptId(assessment({ attemptCount: 2 }))).toBe("A-1-T-2");
    expect(participantRole(null, assessment())).toBe("NONE");
  });
});
