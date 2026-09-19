import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import {
  BUDGET_BASE_UNITS,
  baseUnitsToGen,
  createContractAdapter,
} from "./adapter";

const sender = "0x1111111111111111111111111111111111111111" as const;
const contract = "0x2222222222222222222222222222222222222222" as const;
const operator = "0x3333333333333333333333333333333333333333" as const;
const steward = "0x4444444444444444444444444444444444444444" as const;
const fixtureHash = `0x${"44".repeat(32)}` as const;

const assessmentFixture = JSON.stringify({
  assessment_id: "A-1",
  sponsor: sender,
  operator,
  steward,
  system_name: "Ranker",
  purpose: "Ranks applicants.",
  affected_people: "EU applicants.",
  decision_role: "Human decides.",
  profile_digest: `0x${"ab".repeat(32)}`,
  source_url: "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai",
  source_version: "EC-AI-RISK-2026-08-03",
  ratification_deadline: "1900003600",
  review_deadline: "1900007200",
  created_at: "1900000000",
  operator_ratified: false,
  steward_ratified: false,
  phase: "AWAITING_RATIFICATION",
  tier: "",
  launch_mode: "UNDECIDED",
  attempt_count: 1,
  settled: false,
  funded: "2000000000000000000",
  locked: "2000000000000000000",
  credited_total: "0",
  withdrawn_total: "0",
});

describe("Tierline adapter view mapping", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps canonical view JSON to typed models with GEN formatting", async () => {
    const readCalls: Array<{ functionName: string; args: unknown[] }> = [];
    const clientFactory: typeof createClient = (config) => {
      const client = createClient(config);
      client.readContract = (async (request: { functionName: string; args: unknown[] }) => {
        readCalls.push({ functionName: request.functionName, args: request.args });
        if (request.functionName === "get_assessment") return assessmentFixture;
        if (request.functionName === "get_assessment_count") return 1;
        if (request.functionName === "get_assessment_id") return "A-1";
        throw new Error(`Unexpected view ${request.functionName}`);
      }) as typeof client.readContract;
      return client;
    };
    const adapter = createContractAdapter({
      contractAddress: contract,
      endpoint: "https://offline-tierline.invalid",
      clientFactory,
    });
    const record = await adapter.getAssessment("A-1");
    expect(record.assessmentId).toBe("A-1");
    expect(record.phase).toBe("AWAITING_RATIFICATION");
    expect(record.fundedGen).toBe("2");
    expect(record.lockedGen).toBe("2");
    expect(record.ratificationDeadline).toBe(1900003600);
    expect(record.attemptCount).toBe(1);
    const ids = await adapter.listAssessmentIds();
    expect(ids).toEqual(["A-1"]);
    expect(readCalls.some((call) => call.functionName === "get_assessment_count")).toBe(true);
  });

  it("formats base units as GEN without floats and never shows raw base units", () => {
    expect(baseUnitsToGen("2000000000000000000")).toBe("2");
    expect(baseUnitsToGen("1000000000000000000")).toBe("1");
    expect(baseUnitsToGen("1500000000000000000")).toBe("1.5");
    expect(baseUnitsToGen(0)).toBe("0");
  });
});
