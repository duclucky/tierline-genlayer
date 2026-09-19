import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { createContractAdapter } from "./adapter";

// Wallet-account preflight (docs/05 section 12): exercise the real
// genlayer-js client created by this project's adapter with intercepted
// RPC/provider I/O. Mocking writeContract alone cannot catch account-shape
// failures, so the real SDK encodes the transaction here.

const sender = "0x1111111111111111111111111111111111111111" as const;
const contract = "0x2222222222222222222222222222222222222222" as const;
const fixtureHash = `0x${"55".repeat(32)}` as const;

type WalletRequest = { method: string; params?: unknown[] | Record<string, unknown> };

function interceptWallet(requests: WalletRequest[]) {
  return {
    async request(request: WalletRequest) {
      requests.push(request);
      if (request.method === "wallet_switchEthereumChain") return null;
      if (request.method === "eth_chainId") return `0x${studioDevnet.id.toString(16)}`;
      if (request.method === "eth_sendTransaction") return fixtureHash;
      throw new Error(`Unexpected wallet method ${request.method}`);
    },
  };
}

function stubValueRpc() {
  const rpcMethods: string[] = [];
  const originalFetch = globalThis.fetch;
  vi.stubGlobal("fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { method?: string; id?: number };
    rpcMethods.push(String(body.method));
    const fixtures: Record<string, string> = {
      eth_getTransactionCount: "0x0",
      eth_estimateGas: "0x30d40",
      eth_gasPrice: "0x0",
      eth_blockNumber: "0x1",
    };
    if (body.method === "eth_getTransactionReceipt") {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: body.id ?? 1,
        result: {
          transactionHash: fixtureHash,
          transactionIndex: "0x0",
          blockHash: `0x${"aa".repeat(32)}`,
          blockNumber: "0x1",
          from: sender,
          to: contract,
          cumulativeGasUsed: "0x0",
          gasUsed: "0x0",
          contractAddress: null,
          logs: [],
          logsBloom: `0x${"00".repeat(256)}`,
          status: "0x1",
          effectiveGasPrice: "0x0",
          type: "0x0",
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    const result = fixtures[body.method ?? ""];
    if (!result) throw new Error(`Unexpected RPC ${body.method}`);
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id ?? 1, result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  return { rpcMethods, restore: () => (globalThis.fetch = originalFetch) };
}

function offlineClientFactory(
  waitRequests: Array<{ waitUntil?: string }> = [],
  feeRequests: Array<Record<string, unknown>> = [],
) {
  const factory: typeof createClient = (config) => {
    const client = createClient({
      ...config,
      chain: { ...studioDevnet, rpcUrls: { default: { http: ["https://offline-tierline.invalid"] } } },
    });
    client.estimateTransactionFeesForWrite = (async (request: unknown) => {
      feeRequests.push(request as Record<string, unknown>);
      return {
      distribution: {
        leaderTimeunitsAllocation: 0n,
        validatorTimeunitsAllocation: 0n,
        appealRounds: 0n,
        executionBudgetPerRound: 0n,
        maxPriceGenPerTimeUnit: 0n,
        storageFeeMaxGasPrice: 0n,
        receiptFeeMaxGasPrice: 0n,
      },
      feeValue: 0n,
      policy: { enabled: false },
      };
    }) as unknown as typeof client.estimateTransactionFeesForWrite;
    client.waitForTransactionReceipt = (async (request: unknown) => {
      waitRequests.push(request as { waitUntil?: string });
      return {
      statusName: "ACCEPTED",
      txExecutionResultName: "FINISHED_WITH_RETURN",
      };
    }) as unknown as typeof client.waitForTransactionReceipt;
    return client;
  };
  return factory;
}

describe("Tierline adapter wallet-account boundary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the value-bearing 2 GEN creation from the selected account without a raw account override", async () => {
    const walletRequests: WalletRequest[] = [];
    const provider = interceptWallet(walletRequests);
    const { rpcMethods, restore } = stubValueRpc();
    const waitRequests: Array<{ waitUntil?: string }> = [];
    const factory = offlineClientFactory(waitRequests);
    const adapter = createContractAdapter({
      contractAddress: contract,
      endpoint: "https://offline-tierline.invalid",
      clientFactory: factory,
      sessionGetter: () => ({ account: sender, provider }),
    });
    const phases: string[] = [];
    const hash = await adapter.createAssessment(
      {
        operator: "0x3333333333333333333333333333333333333333",
        steward: "0x4444444444444444444444444444444444444444",
        systemName: "Ranker",
        purpose: "Ranks applicants for entry level engineering roles.",
        affectedPeople: "Job applicants in the European Union.",
        decisionRole: "The tool ranks; a human recruiter decides.",
        ratificationDeadline: 1_900_003_600,
        reviewDeadline: 1_900_007_200,
      },
      (state) => phases.push(state.phase),
    );
    expect(hash).toBe(fixtureHash);
    const send = walletRequests.find((request) => request.method === "eth_sendTransaction");
    const transaction = Array.isArray(send?.params) ? (send.params[0] as Record<string, string>) : {};
    expect(transaction.from.toLowerCase()).toBe(sender);
    expect(BigInt(transaction.value)).toBe(2n * 10n ** 18n);
    expect(walletRequests.some((request) => request.method === "wallet_switchEthereumChain")).toBe(true);
    expect(phases).toEqual(["FEE_QUOTED", "AWAITING_SIGNATURE", "SUBMITTED", "ACCEPTED", "FINALIZED"]);
    expect(waitRequests.map((request) => request.waitUntil)).toEqual(["decided", "finalized"]);
    expect(rpcMethods).toContain("eth_estimateGas");
    restore();
  });

  it("encodes zero-value writes and the exact retry args through the same boundary", async () => {
    const walletRequests: WalletRequest[] = [];
    const provider = interceptWallet(walletRequests);
    const { restore } = stubValueRpc();
    const factory = offlineClientFactory();
    const adapter = createContractAdapter({
      contractAddress: contract,
      endpoint: "https://offline-tierline.invalid",
      clientFactory: factory,
      sessionGetter: () => ({ account: sender, provider }),
    });
    await adapter.ratifyAssessment("A-1", `0x${"ab".repeat(32)}`, () => undefined);
    await adapter.retryReview("A-1", "A-1-T-1", () => undefined);
    const sends = walletRequests.filter((request) => request.method === "eth_sendTransaction");
    expect(sends.length).toBe(2);
    for (const send of sends) {
      const transaction = (send.params as unknown[])[0] as Record<string, string>;
      expect(transaction.from.toLowerCase()).toBe(sender);
      expect(BigInt(transaction.value)).toBe(0n);
    }
    restore();
  });

  it("allocates an external GEN-transfer message before withdrawing a credit", async () => {
    const walletRequests: WalletRequest[] = [];
    const provider = interceptWallet(walletRequests);
    const { restore } = stubValueRpc();
    const feeRequests: Array<Record<string, unknown>> = [];
    const adapter = createContractAdapter({
      contractAddress: contract,
      endpoint: "https://offline-tierline.invalid",
      clientFactory: offlineClientFactory([], feeRequests),
      sessionGetter: () => ({ account: sender, provider }),
    });
    await adapter.withdrawCredit("A-1", () => undefined);
    const request = feeRequests.at(-1);
    expect(request?.functionName).toBe("withdraw_credit");
    expect(request?.messageAllocations).toMatchObject([{
      messageType: 0,
      recipient: sender,
      callKey: `0x${"00".repeat(32)}`,
      budget: 42_000n,
    }]);
    restore();
  });

  it("refuses to sign without a selected wallet and rejects an invalid contract address", async () => {
    const factory = offlineClientFactory();
    const unconnected = createContractAdapter({
      contractAddress: contract,
      endpoint: "https://offline-tierline.invalid",
      clientFactory: factory,
      sessionGetter: () => null,
    });
    await expect(
      unconnected.requestReview("A-1", () => undefined),
    ).rejects.toThrow(/connect a selected wallet/i);
    const invalid = createContractAdapter({
      contractAddress: "not-an-address",
      endpoint: "https://offline-tierline.invalid",
      clientFactory: factory,
      sessionGetter: () => ({
        account: sender,
        provider: interceptWallet([]),
      }),
    });
    await expect(invalid.requestReview("A-1", () => undefined)).rejects.toThrow(/no deployed/i);
  });
});
