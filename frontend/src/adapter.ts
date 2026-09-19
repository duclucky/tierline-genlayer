import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { isAddress, type Address } from "viem";
import {
  ensureStudionet,
  getActiveWalletSession,
  type ActiveWalletSession,
} from "./wallet/session";
import type { Eip1193Provider } from "./wallet/types";

// Typed adapter boundary between the Tierline UI and the deployed
// Intelligent Contract. Canonical reads go through the GenLayer IC RPC
// endpoint (same-origin proxy by default); wallet writes go through the
// selected EVM provider after an explicit Studionet chain check.

export const BUDGET_GEN = 2;
export const BUDGET_BASE_UNITS = BigInt(BUDGET_GEN) * 10n ** 18n;

const CONTRACT_ADDRESS = String(
  import.meta.env.VITE_GENLAYER_CONTRACT_ADDRESS ?? "",
).trim();
const IC_ENDPOINT = String(
  import.meta.env.VITE_GENLAYER_IC_RPC_URL ?? "/genlayer-rpc",
).trim();

export type AdapterOptions = {
  contractAddress?: string;
  endpoint?: string;
  sessionGetter?: typeof getActiveWalletSession;
  clientFactory?: typeof createClient;
};

export type TransactionPhase =
  | "AWAITING_SIGNATURE"
  | "SUBMITTED"
  | "ACCEPTED"
  | "FINALIZED"
  | "FAILED";

export type TransactionState = {
  phase: TransactionPhase;
  message: string;
  hash?: string;
};

export type TransactionHash = string;

export class ContractNotConfiguredError extends Error {
  constructor() {
    super("No deployed Tierline contract address is configured.");
    this.name = "ContractNotConfiguredError";
  }
}

export class WalletNotConfiguredError extends Error {
  constructor() {
    super("Connect a selected wallet before signing this transaction.");
    this.name = "WalletNotConfiguredError";
  }
}

export type AssessmentModel = {
  assessmentId: string;
  sponsor: string;
  operator: string;
  steward: string;
  systemName: string;
  purpose: string;
  affectedPeople: string;
  decisionRole: string;
  profileDigest: string;
  sourceUrl: string;
  sourceVersion: string;
  ratificationDeadline: number;
  reviewDeadline: number;
  createdAt: number;
  operatorRatified: boolean;
  stewardRatified: boolean;
  phase: string;
  tier: string;
  launchMode: string;
  attemptCount: number;
  settled: boolean;
  fundedGen: string;
  lockedGen: string;
  creditedTotalGen: string;
  withdrawnTotalGen: string;
};

export type AttemptModel = {
  attemptId: string;
  assessmentId: string;
  requestedBy: string;
  txTime: number;
  outcome: string;
  tier: string;
  sourceCoverage: string;
  basisCodes: string[];
  reason: string;
};

export type CreditModel = {
  creditKey: string;
  assessmentId: string;
  owner: string;
  amountGen: string;
  kind: string;
  withdrawn: boolean;
};

export type AccountingModel = {
  totalFundedGen: string;
  totalLockedGen: string;
  totalOutstandingCreditGen: string;
  totalWithdrawnGen: string;
};

export type NewAssessmentInput = {
  operator: string;
  steward: string;
  systemName: string;
  purpose: string;
  affectedPeople: string;
  decisionRole: string;
  ratificationDeadline: number;
  reviewDeadline: number;
};

export interface TierlineAdapter {
  configured: boolean;
  getAssessment(assessmentId: string): Promise<AssessmentModel>;
  getProfileDigest(assessmentId: string): Promise<string>;
  getAttempt(attemptId: string): Promise<AttemptModel>;
  getCredit(assessmentId: string, owner: string): Promise<CreditModel>;
  getAccounting(): Promise<AccountingModel>;
  listAssessmentIds(): Promise<string[]>;
  createAssessment(
    input: NewAssessmentInput,
    onPhase: (state: TransactionState) => void,
  ): Promise<TransactionHash>;
  ratifyAssessment(
    assessmentId: string,
    profileDigest: string,
    onPhase: (state: TransactionState) => void,
  ): Promise<TransactionHash>;
  requestReview(
    assessmentId: string,
    onPhase: (state: TransactionState) => void,
  ): Promise<TransactionHash>;
  retryReview(
    assessmentId: string,
    expectedAttempt: string,
    onPhase: (state: TransactionState) => void,
  ): Promise<TransactionHash>;
  cancelUnratified(
    assessmentId: string,
    onPhase: (state: TransactionState) => void,
  ): Promise<TransactionHash>;
  recoverExpired(
    assessmentId: string,
    onPhase: (state: TransactionState) => void,
  ): Promise<TransactionHash>;
  withdrawCredit(
    assessmentId: string,
    onPhase: (state: TransactionState) => void,
  ): Promise<TransactionHash>;
}

function requireContractAddress(value: string): Address {
  if (!isAddress(value)) throw new ContractNotConfiguredError();
  return value;
}

function requireSigner(
  sessionGetter: typeof getActiveWalletSession,
): ActiveWalletSession {
  const session = sessionGetter();
  if (!session || !isAddress(session.account)) throw new WalletNotConfiguredError();
  return session;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The contract returned invalid JSON.");
  }
  return value as Record<string, unknown>;
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") {
    throw new Error("The contract returned a non-JSON view.");
  }
  return JSON.parse(value) as unknown;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function boolValue(value: unknown): boolean {
  return value === true || value === "true";
}

// Convert a base-unit string (1 GEN = 10**18) to whole GEN with up to four
// decimals using BigInt arithmetic only; a raw base-unit integer is never
// shown to a user as if it were GEN.
export function baseUnitsToGen(value: unknown): string {
  const raw = typeof value === "bigint" ? value : BigInt(numberValue(value, 0));
  const negative = raw < 0n;
  const absolute = negative ? -raw : raw;
  const whole = absolute / 10n ** 18n;
  const fraction = (absolute % 10n ** 18n).toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
  const rendered = fraction === "" ? whole.toString() : `${whole}.${fraction}`;
  return negative ? `-${rendered}` : rendered;
}

function toAssessment(value: unknown): AssessmentModel {
  const item = asRecord(value);
  return {
    assessmentId: text(item.assessment_id),
    sponsor: text(item.sponsor),
    operator: text(item.operator),
    steward: text(item.steward),
    systemName: text(item.system_name),
    purpose: text(item.purpose),
    affectedPeople: text(item.affected_people),
    decisionRole: text(item.decision_role),
    profileDigest: text(item.profile_digest),
    sourceUrl: text(item.source_url),
    sourceVersion: text(item.source_version),
    ratificationDeadline: numberValue(item.ratification_deadline),
    reviewDeadline: numberValue(item.review_deadline),
    createdAt: numberValue(item.created_at),
    operatorRatified: boolValue(item.operator_ratified),
    stewardRatified: boolValue(item.steward_ratified),
    phase: text(item.phase, "UNKNOWN"),
    tier: text(item.tier),
    launchMode: text(item.launch_mode, "UNDECIDED"),
    attemptCount: numberValue(item.attempt_count),
    settled: boolValue(item.settled),
    fundedGen: baseUnitsToGen(item.funded),
    lockedGen: baseUnitsToGen(item.locked),
    creditedTotalGen: baseUnitsToGen(item.credited_total),
    withdrawnTotalGen: baseUnitsToGen(item.withdrawn_total),
  };
}

function toAttempt(value: unknown): AttemptModel {
  const item = asRecord(value);
  const codes = Array.isArray(item.basis_codes)
    ? item.basis_codes.map((code) => text(code)).filter(Boolean)
    : [];
  return {
    attemptId: text(item.attempt_id),
    assessmentId: text(item.assessment_id),
    requestedBy: text(item.requested_by),
    txTime: numberValue(item.tx_time),
    outcome: text(item.outcome),
    tier: text(item.tier),
    sourceCoverage: text(item.source_coverage),
    basisCodes: codes,
    reason: text(item.reason),
  };
}

function toCredit(value: unknown): CreditModel {
  const item = asRecord(value);
  return {
    creditKey: text(item.credit_key),
    assessmentId: text(item.assessment_id),
    owner: text(item.owner),
    amountGen: baseUnitsToGen(item.amount),
    kind: text(item.kind, "NONE"),
    withdrawn: boolValue(item.withdrawn),
  };
}

function toAccounting(value: unknown): AccountingModel {
  const item = asRecord(value);
  return {
    totalFundedGen: baseUnitsToGen(item.total_funded),
    totalLockedGen: baseUnitsToGen(item.total_locked),
    totalOutstandingCreditGen: baseUnitsToGen(item.total_outstanding_credit),
    totalWithdrawnGen: baseUnitsToGen(item.total_withdrawn),
  };
}

function hasFailureMarker(value: unknown): boolean {
  const marker = typeof value === "string" ? value.toUpperCase() : "";
  return (
    marker.includes("ERROR") ||
    marker.includes("FAILURE") ||
    marker.includes("REVERT")
  );
}

function isBenignQuorumStop(entry: Record<string, unknown>): boolean {
  const genvm = entry.genvm_result;
  if (!genvm || typeof genvm !== "object" || Array.isArray(genvm)) return false;
  return (
    String((genvm as Record<string, unknown>).error_code ?? "").toUpperCase() ===
    "CONSENSUS_VALIDATOR_QUORUM_REACHED"
  );
}

// Understands both the raw Studio receipt shape
// (consensus_data.leader_receipt[].execution_result) and the normalized SDK
// shape; a parser that only handles one silently misreads the other.
function isFailedReceipt(receipt: unknown): boolean {
  const item = asRecord(receipt);
  if (
    [
      item.txExecutionResultName,
      item.executionResultName,
      item.tx_execution_result_name,
      item.execution_result,
      item.tx_execution_result,
    ].some(hasFailureMarker)
  ) {
    return true;
  }
  const consensus = item.consensus_data;
  if (!consensus || typeof consensus !== "object" || Array.isArray(consensus)) {
    return (
      hasFailureMarker(item.resultName) || hasFailureMarker(item.result_name)
    );
  }
  const data = consensus as Record<string, unknown>;
  const receipts = [...asList(data.leader_receipt), ...asList(data.validators)];
  return receipts.some((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const nested = entry as Record<string, unknown>;
    if (isBenignQuorumStop(nested)) return false;
    return (
      hasFailureMarker(nested.execution_result) ||
      hasFailureMarker(nested.txExecutionResultName) ||
      hasFailureMarker(nested.executionResultName)
    );
  });
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function writeTransaction(
  method: string,
  args: Array<string | number>,
  value: bigint,
  onPhase: (state: TransactionState) => void,
  options: AdapterOptions,
): Promise<TransactionHash> {
  const sessionGetter = options.sessionGetter ?? getActiveWalletSession;
  const signer = requireSigner(sessionGetter);
  const address = requireContractAddress(
    options.contractAddress ?? CONTRACT_ADDRESS,
  );
  try {
    // The wallet may have switched networks since connect. Enforce the
    // wallet-compatible Studionet chain immediately before every write.
    await ensureStudionet(signer.provider);
    // The selected account is configured here at createClient; individual
    // write calls never override it with a raw string.
    const client = (options.clientFactory ?? createClient)({
      chain: studionet,
      endpoint: options.endpoint ?? IC_ENDPOINT,
      account: signer.account,
      provider: signer.provider,
    });
    onPhase({
      phase: "AWAITING_SIGNATURE",
      message: "Confirm this transaction in your selected wallet.",
    });
    const rawHash = await client.writeContract({ address, functionName: method, args, value });
    const hash = String(rawHash);
    onPhase({
      phase: "SUBMITTED",
      message: "Transaction submitted; waiting for the network.",
      hash,
    });
    const accepted = await client.waitForTransactionReceipt({
      hash: rawHash,
      status: TransactionStatus.ACCEPTED,
      interval: 1500,
      retries: 40,
    });
    if (isFailedReceipt(accepted)) {
      throw new Error("The accepted transaction contains a contract execution error.");
    }
    onPhase({
      phase: "ACCEPTED",
      message: "Decision accepted; waiting for network finality.",
      hash,
    });
    const finalized = await client.waitForTransactionReceipt({
      hash: rawHash,
      status: TransactionStatus.FINALIZED,
      interval: 2500,
      retries: 120,
    });
    if (isFailedReceipt(finalized)) {
      throw new Error("The finalized transaction did not execute successfully.");
    }
    onPhase({
      phase: "FINALIZED",
      message: "Transaction finalized. Reloading canonical contract state.",
      hash,
    });
    return hash;
  } catch (cause) {
    onPhase({
      phase: "FAILED",
      message:
        cause instanceof Error
          ? cause.message
          : "The transaction failed before finality.",
    });
    throw cause;
  }
}

export function createContractAdapter(options: AdapterOptions = {}): TierlineAdapter {
  const contractAddress = options.contractAddress ?? CONTRACT_ADDRESS;
  const endpoint = options.endpoint ?? IC_ENDPOINT;
  const configured = isAddress(contractAddress);

  function readClientFactory() {
    return (options.clientFactory ?? createClient)({
      chain: studionet,
      endpoint,
    });
  }

  async function readView(method: string, args: Array<string | number>): Promise<unknown> {
    if (!configured) throw new ContractNotConfiguredError();
    const client = readClientFactory();
    const raw = await client.readContract({
      address: requireContractAddress(contractAddress),
      functionName: method,
      args,
    });
    return parseJson(raw);
  }

  return {
    configured,
    async getAssessment(assessmentId) {
      return toAssessment(await readView("get_assessment", [assessmentId]));
    },
    async getProfileDigest(assessmentId) {
      if (!configured) throw new ContractNotConfiguredError();
      const client = readClientFactory();
      const raw = await client.readContract({
        address: requireContractAddress(contractAddress),
        functionName: "get_profile_digest",
        args: [assessmentId],
      });
      if (typeof raw !== "string") {
        throw new Error("The contract returned a non-string profile digest.");
      }
      return raw;
    },
    async getAttempt(attemptId) {
      return toAttempt(await readView("get_attempt", [attemptId]));
    },
    async getCredit(assessmentId, owner) {
      return toCredit(await readView("get_credit", [assessmentId, owner]));
    },
    async getAccounting() {
      return toAccounting(await readView("get_accounting", []));
    },
    async listAssessmentIds() {
      if (!configured) throw new ContractNotConfiguredError();
      const client = readClientFactory();
      const address = requireContractAddress(contractAddress);
      const countRaw = await client.readContract({
        address,
        functionName: "get_assessment_count",
        args: [],
      });
      const count = numberValue(countRaw, 0);
      if (count <= 0) return [];
      const bounded = Math.min(count, 200);
      const ids: string[] = [];
      for (let index = 0; index < bounded; index += 1) {
        const id = await client.readContract({
          address,
          functionName: "get_assessment_id",
          args: [index],
        });
        if (typeof id === "string" && id) ids.push(id);
      }
      return ids;
    },
    async createAssessment(input, onPhase) {
      return writeTransaction(
        "create_assessment",
        [
          input.operator,
          input.steward,
          input.systemName,
          input.purpose,
          input.affectedPeople,
          input.decisionRole,
          input.ratificationDeadline,
          input.reviewDeadline,
        ],
        BUDGET_BASE_UNITS,
        onPhase,
        options,
      );
    },
    async ratifyAssessment(assessmentId, profileDigest, onPhase) {
      return writeTransaction(
        "ratify_assessment",
        [assessmentId, profileDigest],
        0n,
        onPhase,
        options,
      );
    },
    async requestReview(assessmentId, onPhase) {
      return writeTransaction(
        "request_review",
        [assessmentId],
        0n,
        onPhase,
        options,
      );
    },
    async retryReview(assessmentId, expectedAttempt, onPhase) {
      return writeTransaction(
        "retry_review",
        [assessmentId, expectedAttempt],
        0n,
        onPhase,
        options,
      );
    },
    async cancelUnratified(assessmentId, onPhase) {
      return writeTransaction(
        "cancel_unratified",
        [assessmentId],
        0n,
        onPhase,
        options,
      );
    },
    async recoverExpired(assessmentId, onPhase) {
      return writeTransaction(
        "recover_expired",
        [assessmentId],
        0n,
        onPhase,
        options,
      );
    },
    async withdrawCredit(assessmentId, onPhase) {
      return writeTransaction(
        "withdraw_credit",
        [assessmentId],
        0n,
        onPhase,
        options,
      );
    },
  };
}
