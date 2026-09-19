import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Performs a bounded, real Studio-dev lifecycle with two ephemeral role EOAs.
// Private keys are generated in memory only, are never logged or persisted, and
// the saved evidence contains an allowlist of public addresses and outcomes.

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT = "0x9A1875a12Cb5d65969E7DbDE96D310e80534357c";
const RPC = "https://studio-dev.genlayer.com/api";
const GEN = 10n ** 18n;
const ROLE_FUNDING = 2n * GEN;
const ASSESSMENT_BUDGET = 2n * GEN;
const DEPLOYER_KEY = "STUDIONET_PRIVATE_KEY";
const EVIDENCE = path.join(PROJECT, "docs", "evidence", "studio-dev", "role-lifecycle-test.json");
const LOCAL_STATE = path.join(PROJECT, ".local", "studio-dev-role-lifecycle.json");

function parseEnv(text) {
  const values = {};
  for (const line of String(text).split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator <= 0 || line.trimStart().startsWith("#")) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

function loadAuthorizedEnv() {
  for (const file of [path.join(PROJECT, ".env"), path.resolve(PROJECT, "..", ".env")]) {
    if (!fs.existsSync(file)) continue;
    for (const [key, value] of Object.entries(parseEnv(fs.readFileSync(file, "utf8")))) {
      if (value && !process.env[key]) process.env[key] = value;
    }
  }
}

function requiredPrivateKey(name) {
  const value = process.env[name]?.trim() ?? "";
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(value)) throw new Error(`authorized account ${name} is absent or invalid`);
  return value.startsWith("0x") ? value : `0x${value}`;
}

function formatGen(value) {
  const amount = BigInt(value);
  const whole = amount / GEN;
  const fractional = amount % GEN;
  return fractional === 0n ? `${whole} GEN` : `${whole}.${fractional.toString().padStart(18, "0").replace(/0+$/, "")} GEN`;
}

function assertSuccessful(receipt, label) {
  if (!receipt || String(receipt.statusName ?? receipt.status) === "REVERTED" || String(receipt.txExecutionResultName ?? receipt.txExecutionResult) === "FAILED") {
    throw new Error(`${label} did not execute successfully`);
  }
}

function loadState() {
  if (!fs.existsSync(LOCAL_STATE)) return {};
  return JSON.parse(fs.readFileSync(LOCAL_STATE, "utf8"));
}

function saveState(state) {
  fs.mkdirSync(path.dirname(LOCAL_STATE), { recursive: true });
  fs.writeFileSync(LOCAL_STATE, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function sdk() {
  const root = path.join(PROJECT, "frontend", "node_modules", "genlayer-js", "dist");
  const api = await import(pathToFileURL(path.join(root, "index.js")).href);
  const chains = await import(pathToFileURL(path.join(root, "chains", "index.js")).href);
  return { ...api, studioDevnet: chains.studioDevnet };
}

async function main() {
  loadAuthorizedEnv();
  const { CALL_KEY_UNNAMED, createAccount, createClient, encodeExternalMessageFeeParams, MessageType, studioDevnet } = await sdk();
  const state = loadState();
  const owner = createAccount(requiredPrivateKey(DEPLOYER_KEY));
  if (!state.operatorPrivateKey || !state.stewardPrivateKey) {
    state.operatorPrivateKey = `0x${crypto.randomBytes(32).toString("hex")}`;
    state.stewardPrivateKey = `0x${crypto.randomBytes(32).toString("hex")}`;
    saveState(state);
  }
  const operator = createAccount(state.operatorPrivateKey);
  const steward = createAccount(state.stewardPrivateKey);
  const clientFor = (account) => createClient({ chain: studioDevnet, endpoint: RPC, account });
  const ownerClient = clientFor(owner);
  const operatorClient = clientFor(operator);
  const stewardClient = clientFor(steward);
  const hashes = state.hashes ?? {};
  state.hashes = hashes;

  async function fund(role, address) {
    if (state[`${role}Funded`]) return;
    const before = await ownerClient.getBalance({ address });
    if (before >= ROLE_FUNDING) {
      state[`${role}Funded`] = true;
      saveState(state);
      console.log(`ROLE_FUND_RECONCILED role=${role} address=${address} amount=2 GEN`);
      return;
    }
    const receipt = await ownerClient.transfer({ to: address, value: ROLE_FUNDING });
    assertSuccessful(receipt, `${role} funding`);
    let after = await ownerClient.getBalance({ address });
    for (let attempt = 0; after < before + ROLE_FUNDING && attempt < 6; attempt += 1) {
      await delay(2000);
      after = await ownerClient.getBalance({ address });
    }
    if (after < before + ROLE_FUNDING) throw new Error(`${role} funding receipt was returned but destination balance is not yet visible; reconcile before rerunning`);
    hashes[`${role}Funding`] = String(receipt.transactionHash);
    state[`${role}Funded`] = true;
    saveState(state);
    console.log(`ROLE_FUND_FINALIZED role=${role} address=${address} amount=2 GEN hash=${receipt.transactionHash}`);
  }

  async function write(client, role, method, args, value = 0n) {
    const messageAllocations = method === "withdraw_credit" ? [{
      messageType: MessageType.External,
      recipient: client.account.address,
      callKey: CALL_KEY_UNNAMED,
      budget: 42_000n,
      feeParams: encodeExternalMessageFeeParams({ gasLimit: 21_000n, maxGasPrice: 2n }),
    }] : undefined;
    const feeQuote = await client.estimateTransactionFeesForWrite({
      address: CONTRACT,
      functionName: method,
      args,
      value,
      ...(messageAllocations ? { messageAllocations } : {}),
    });
    const hash = await client.writeContract({
      address: CONTRACT,
      functionName: method,
      args,
      value,
      fees: {
        distribution: feeQuote.distribution,
        ...(feeQuote.messageAllocations?.length ? { messageAllocations: feeQuote.messageAllocations } : {}),
        feeValue: feeQuote.feeValue,
      },
    });
    const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 2500, retries: 120 });
    assertSuccessful(receipt, `${role} ${method}`);
    hashes[`${role}${method}`] = String(hash);
    saveState(state);
    console.log(`ROLE_WRITE_FINALIZED role=${role} method=${method} value=${formatGen(value)} feeDeposit=${formatGen(feeQuote.feeValue)} hash=${hash}`);
    return receipt;
  }

  await fund("operator", operator.address);
  await fund("steward", steward.address);

  if (!state.assessmentId) {
    const count = Number(await ownerClient.readContract({ address: CONTRACT, functionName: "get_assessment_count" }));
    state.assessmentId = `A-${count + 1}`;
    const now = Math.floor(Date.now() / 1000);
    state.ratificationDeadline = now + 24 * 60 * 60;
    state.reviewDeadline = now + 48 * 60 * 60;
    saveState(state);
    await write(ownerClient, "owner", "create_assessment", [
      operator.address,
      steward.address,
      "Tierline ephemeral-role lifecycle test",
      "Classifies a synthetic internal launch-routing scenario for a bounded Studio-dev end-to-end test.",
      "No real people or personal data; this is a controlled synthetic test.",
      "The tool recommends a route and a human remains the final decision-maker.",
      state.ratificationDeadline,
      state.reviewDeadline,
    ], ASSESSMENT_BUDGET);
  }
  const assessmentId = state.assessmentId;

  const created = JSON.parse(await ownerClient.readContract({ address: CONTRACT, functionName: "get_assessment", args: [assessmentId] }));
  if (!["AWAITING_RATIFICATION", "READY_FOR_REVIEW", "RETRYABLE", "FINAL_MINIMAL", "FINAL_TRANSPARENCY", "FINAL_HIGH_RISK", "FINAL_PROHIBITED"].includes(created.phase) || created.operator.toLowerCase() !== operator.address.toLowerCase() || created.steward.toLowerCase() !== steward.address.toLowerCase()) {
    throw new Error("created assessment does not bind the ephemeral role addresses canonically");
  }
  if (!created.operator_ratified) {
    await write(operatorClient, "operator", "ratify_assessment", [assessmentId, created.profile_digest]);
    console.log(`ROLE_LIFECYCLE_CHECKPOINT assessment=${assessmentId} next=steward_ratification`);
    return;
  }
  if (!created.steward_ratified) {
    await write(stewardClient, "steward", "ratify_assessment", [assessmentId, created.profile_digest]);
    console.log(`ROLE_LIFECYCLE_CHECKPOINT assessment=${assessmentId} next=request_review`);
    return;
  }

  const ready = JSON.parse(await ownerClient.readContract({ address: CONTRACT, functionName: "get_assessment", args: [assessmentId] }));
  if (!ready.operator_ratified || !ready.steward_ratified) throw new Error("two independent ratifications did not advance the assessment");
  if (Number(ready.attempt_count) === 0) {
    if (ready.phase !== "READY_FOR_REVIEW") throw new Error("assessment is not ready for its first review");
    await write(operatorClient, "operator", "request_review", [assessmentId]);
  }

  let afterReview = JSON.parse(await ownerClient.readContract({ address: CONTRACT, functionName: "get_assessment", args: [assessmentId] }));
  if (afterReview.settled) {
    for (const [role, account, client] of [["operator", operator, operatorClient], ["steward", steward, stewardClient]]) {
      const credit = JSON.parse(await ownerClient.readContract({ address: CONTRACT, functionName: "get_credit", args: [assessmentId, account.address] }));
      if (BigInt(credit.amount) > 0n && !credit.withdrawn) {
        await write(client, role, "withdraw_credit", [assessmentId]);
      }
    }
    afterReview = JSON.parse(await ownerClient.readContract({ address: CONTRACT, functionName: "get_assessment", args: [assessmentId] }));
  }
  const accounting = JSON.parse(await ownerClient.readContract({ address: CONTRACT, functionName: "get_accounting" }));
  const evidence = {
    network: "studio-dev",
    chainId: studioDevnet.id,
    contractAddress: CONTRACT,
    test: "ephemeral role EOA lifecycle",
    owner: owner.address,
    operator: operator.address,
    steward: steward.address,
    fundingPerRole: "2 GEN",
    assessmentBudget: "2 GEN",
    assessmentId,
    ratificationDeadline: state.ratificationDeadline,
    reviewDeadline: state.reviewDeadline,
    finalPhase: afterReview.phase,
    tier: afterReview.tier,
    launchMode: afterReview.launch_mode,
    settled: Boolean(afterReview.settled),
    attemptCount: Number(afterReview.attempt_count),
    lockedAfterLifecycle: formatGen(afterReview.locked),
    creditedAfterLifecycle: formatGen(afterReview.credited_total),
    withdrawnAfterLifecycle: formatGen(afterReview.withdrawn_total),
    contractAccountingAfterLifecycle: {
      totalFunded: formatGen(accounting.total_funded),
      totalLocked: formatGen(accounting.total_locked),
      totalOutstandingCredit: formatGen(accounting.total_outstanding_credit),
      totalWithdrawn: formatGen(accounting.total_withdrawn),
    },
    transactions: hashes,
    evidenceIsSanitized: true,
    privateKeysPersisted: "local ignored recovery state only",
  };
  fs.mkdirSync(path.dirname(EVIDENCE), { recursive: true });
  fs.writeFileSync(EVIDENCE, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`ROLE_LIFECYCLE_FINALIZED assessment=${assessmentId} phase=${afterReview.phase} tier=${afterReview.tier || "NONE"} settled=${Boolean(afterReview.settled)}`);
}

main().catch((error) => {
  console.error(`ROLE_LIFECYCLE_FAILED ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
