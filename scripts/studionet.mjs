import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

// Studionet deploy + consequential lifecycle for Tierline.
// Resumable and idempotent: every step reads canonical state (deployment.json,
// lifecycle.json, contract views) before writing and never replays a
// finalized transaction. Evidence is allowlist-projected; keys and raw RPC
// payloads are never printed or stored.

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT_PATH = path.join(PROJECT, "contracts", "tierline.py");
const EVIDENCE_DIR = path.join(PROJECT, "docs", "evidence", "studionet");
const DEPLOYMENT_PATH = path.join(EVIDENCE_DIR, "deployment.json");
const LIFECYCLE_PATH = path.join(EVIDENCE_DIR, "lifecycle.json");
const CHAIN_ID = 61999;
const GEN = 10n ** 18n;
const BUDGET = 2n * GEN;
const SPONSOR_KEY = "STUDIONET_PRIVATE_KEY";
const OPERATOR_KEY = "STUDIONET_INTEGRATOR_PRIVATE_KEY";
const STEWARD_KEY = "STUDIONET_STEWARD_PRIVATE_KEY";

function formatGen(value) {
  const amount = BigInt(value);
  const whole = amount / GEN;
  const fraction = amount % GEN;
  if (fraction === 0n) return `${whole} GEN`;
  return `${whole}.${fraction.toString().padStart(18, "0").replace(/0+$/, "")} GEN`;
}

function formatAccounting(accounting) {
  return {
    totalFundedGen: formatGen(accounting.total_funded),
    totalLockedGen: formatGen(accounting.total_locked),
    totalOutstandingCreditGen: formatGen(accounting.total_outstanding_credit),
    totalWithdrawnGen: formatGen(accounting.total_withdrawn),
  };
}

function parseEnv(text) {
  const result = {};
  for (const line of String(text).split(/\r?\n/)) {
    const index = line.indexOf("=");
    if (index <= 0 || line.trim().startsWith("#")) continue;
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[line.slice(0, index).trim()] = value;
  }
  return result;
}

function loadEnv() {
  const merged = {};
  for (const file of [path.join(PROJECT, ".env"), path.resolve(PROJECT, "..", ".env"), path.join(PROJECT, ".env.local")]) {
    if (!fs.existsSync(file)) continue;
    Object.assign(merged, parseEnv(fs.readFileSync(file, "utf8")));
  }
  for (const [key, value] of Object.entries(merged)) if (value && !process.env[key]) process.env[key] = value;
}

function keyFor(name) {
  const value = process.env[name]?.trim() ?? "";
  if (!value) throw new Error(`missing ${name}`);
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(value)) throw new Error(`${name} is not a 32-byte hex key`);
  return value.startsWith("0x") ? value : `0x${value}`;
}

function sourceCommit() {
  return execSync("git rev-parse HEAD", { cwd: PROJECT, encoding: "utf8" }).trim();
}

function sourceHash() {
  return crypto.createHash("sha256").update(fs.readFileSync(CONTRACT_PATH)).digest("hex");
}

function safe(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(safe);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, safe(v)]));
  return value;
}

function writeEvidence(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(safe(value), null, 2)}\n`, "utf8");
}

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

function extractAddress(receipt) {
  const values = [receipt?.contractAddress, receipt?.result?.contractAddress, receipt?.deployment?.contractAddress, receipt?.txDataDecoded?.contractAddress, receipt?.tx_data_decoded?.contract_address, receipt?.recipient, receipt?.to_address, receipt?.execution_result?.return_data?.contractAddress, receipt?.consensus_data?.leader_receipt?.[0]?.execution_result?.contract_address].filter(Boolean);
  if (!values.length) throw new Error("contract address not found in sanitized receipt fields");
  return String(values[0]);
}

function summarizeReceipt(hash, receipt) {
  const execution = receipt?.execution_result ?? receipt?.executionResult ?? receipt?.consensus_data?.leader_receipt?.[0]?.execution_result ?? {};
  return {
    transactionHash: hash,
    status: receipt?.networkStatus ?? receipt?.status_name ?? receipt?.statusName ?? receipt?.status ?? "",
    resultName: receipt?.result_name ?? receipt?.resultName ?? receipt?.txResultName ?? "",
    executionResult: typeof execution === "string" ? execution : execution?.result ?? execution?.status ?? receipt?.txExecutionResultName ?? receipt?.executionResult ?? receipt?.txExecutionResult ?? "UNKNOWN",
    executionError: execution?.error ?? execution?.message ?? "",
  };
}

function assertExecutionSuccess(receipt) {
  const summary = summarizeReceipt("", receipt);
  if (!["SUCCESS", "FINISHED_WITH_RETURN"].includes(String(summary.executionResult).toUpperCase())) {
    const keys = Object.keys(receipt ?? {}).sort().join(",");
    throw new Error(`execution failed: ${summary.executionResult} ${summary.executionError} receiptKeys=${keys}`);
  }
  return summary;
}

async function waitFinal(client, hash) {
  const receipt = await client.waitForTransactionReceipt({ hash, status: "FINALIZED", interval: 5000, retries: 120 });
  assertExecutionSuccess(receipt);
  return receipt;
}

async function makeClients() {
  const sdkImport = async (subpath = "") => {
    try {
      return await import(`genlayer-js${subpath}`);
    } catch {
      const file = path.join(PROJECT, "frontend", "node_modules", "genlayer-js", "dist", subpath ? subpath.slice(1) : "index.js", subpath ? "index.js" : "");
      return import(pathToFileURL(file).href);
    }
  };
  const { createAccount, createClient } = await sdkImport();
  const { studionet } = await sdkImport("/chains");
  const keys = { sponsor: keyFor(SPONSOR_KEY), operator: keyFor(OPERATOR_KEY), steward: keyFor(STEWARD_KEY) };
  const accounts = {
    sponsor: createAccount(keys.sponsor),
    operator: createAccount(keys.operator),
    steward: createAccount(keys.steward),
  };
  const endpoint = process.env.STUDIONET_RPC_URL || studionet.rpcUrls.default.http[0];
  const clients = {
    sponsor: createClient({ chain: studionet, endpoint, account: accounts.sponsor }),
    operator: createClient({ chain: studionet, endpoint, account: accounts.operator }),
    steward: createClient({ chain: studionet, endpoint, account: accounts.steward }),
    reader: createClient({ chain: studionet, endpoint }),
  };
  return { clients, accounts, endpoint };
}

function readView(client, functionName, args = []) {
  return client.readContract({ address: readJson(DEPLOYMENT_PATH).contractAddress, functionName, args });
}

async function writeTx(client, functionName, args = [], value = 0n) {
  const address = readJson(DEPLOYMENT_PATH).contractAddress;
  const hash = await client.writeContract({ address, functionName, args, value });
  console.log(`WRITE_SUBMITTED ${functionName} hash=${hash}`);
  const receipt = await waitFinal(client, hash);
  return { hash, summary: summarizeReceipt(hash, receipt) };
}

async function viewJson(client, functionName, args = []) {
  return JSON.parse(String(await readView(client, functionName, args)));
}

async function balance(address) {
  const response = await fetch(process.env.STUDIONET_RPC_URL || "https://studio.genlayer.com/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }),
  });
  const body = await response.json();
  return BigInt(body.result);
}

async function deploy() {
  loadEnv();
  if (execSync("git status --short -- contracts scripts tests frontend/src frontend/package.json docs/README.md", { cwd: PROJECT, encoding: "utf8" }).trim()) {
    throw new Error("commit local changes before Studionet deployment");
  }
  const existing = readJson(DEPLOYMENT_PATH);
  if (existing?.active && existing.status === "FINALIZED" && existing.sourceSha256 === sourceHash()) {
    console.log(`DEPLOYMENT_REUSED contract=${existing.contractAddress}`);
    return;
  }
  const { clients } = await makeClients();
  const code = fs.readFileSync(CONTRACT_PATH, "utf8");
  const hash = await clients.sponsor.deployContract({ code, args: [] });
  console.log(`STUDIONET_DEPLOY_SUBMITTED hash=${hash}`);
  const receipt = await waitFinal(clients.sponsor, hash);
  const address = extractAddress(receipt);
  const deployment = {
    network: "studionet",
    chainId: CHAIN_ID,
    contract: "Tierline",
    contractAddress: address,
    explorerUrl: `https://explorer-studio.genlayer.com/address/${address}`,
    deploy: summarizeReceipt(hash, receipt),
    sourceCommit: sourceCommit(),
    sourceSha256: sourceHash(),
    depends: "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6",
    rpc: "https://studio.genlayer.com/api",
    deployedAt: new Date().toISOString(),
    active: true,
    evidenceIsSanitized: true,
  };
  writeEvidence(DEPLOYMENT_PATH, deployment);
  console.log(`STUDIONET_DEPLOYED contract=${address}`);
  console.log(`EXPLORER_URL=${deployment.explorerUrl}`);
}

async function lifecycle() {
  loadEnv();
  const deployment = readJson(DEPLOYMENT_PATH);
  if (!deployment?.contractAddress) throw new Error("no active deployment; run deploy first");
  const { clients, accounts } = await makeClients();
  const record = readJson(LIFECYCLE_PATH) ?? { network: "studionet", evidenceIsSanitized: true, actors: {}, steps: {} };
  record.actors = {
    sponsor: accounts.sponsor.address,
    operator: accounts.operator.address,
    steward: accounts.steward.address,
  };
  const now = Math.floor(Date.now() / 1000);

  // Step 1: create (sponsor, exactly 2 GEN). Resume if already recorded.
  let assessmentId = record.steps.create?.assessmentId ?? "";
  if (assessmentId) {
    const canonical = await viewJson(clients.reader, "get_assessment", [assessmentId]);
    console.log(`CREATE_RESUMED assessment=${assessmentId} phase=${canonical.phase}`);
  } else {
    const countBefore = Number(await readView(clients.reader, "get_assessment_count"));
    const ratificationDeadline = now + 60 * 60;
    const reviewDeadline = now + 3 * 60 * 60;
    const { hash } = await writeTx(clients.sponsor, "create_assessment", [
      accounts.operator.address,
      accounts.steward.address,
      "ApplicantRank EU Hiring Assistant",
      "Ranks entry level engineering job applicants for the EU based team from their submitted resumes and structured skill evidence, producing an ordered shortlist for recruiters.",
      "Job applicants aged 18 to 67 in the European Union who submit resumes to the participating employer.",
      "The system ranks and shortlists candidates; a human recruiter makes every final hiring decision.",
      ratificationDeadline,
      reviewDeadline,
    ], BUDGET);
    const countAfter = Number(await readView(clients.reader, "get_assessment_count"));
    if (countAfter !== countBefore + 1) throw new Error("assessment count did not advance by one after creation");
    assessmentId = `A-${countAfter}`;
    const canonical = await viewJson(clients.reader, "get_assessment", [assessmentId]);
    if (canonical.locked !== "2000000000000000000") throw new Error("locked budget is not exactly 2 GEN after creation");
    record.steps.create = { assessmentId, hash, phase: canonical.phase };
    writeEvidence(LIFECYCLE_PATH, record);
    console.log(`CREATE_FINALIZED assessment=${assessmentId} phase=${canonical.phase}`);
  }

  const readAssessment = () => viewJson(clients.reader, "get_assessment", [assessmentId]);

  // Step 2: independent ratifications (operator, then steward).
  if (!record.steps.ratifyOperator) {
    const digest = String(await readView(clients.reader, "get_profile_digest", [assessmentId]));
    const { hash } = await writeTx(clients.operator, "ratify_assessment", [assessmentId, digest]);
    record.steps.ratifyOperator = { hash };
    writeEvidence(LIFECYCLE_PATH, record);
    console.log(`RATIFY_OPERATOR_FINALIZED assessment=${assessmentId}`);
  }
  if (!record.steps.ratifySteward) {
    const afterOperator = await readAssessment();
    if (afterOperator.phase !== "AWAITING_RATIFICATION") throw new Error(`unexpected phase before steward ratification: ${afterOperator.phase}`);
    const digest = String(await readView(clients.reader, "get_profile_digest", [assessmentId]));
    const { hash } = await writeTx(clients.steward, "ratify_assessment", [assessmentId, digest]);
    record.steps.ratifySteward = { hash };
    writeEvidence(LIFECYCLE_PATH, record);
    console.log(`RATIFY_STEWARD_FINALIZED assessment=${assessmentId}`);
  }
  const ready = await readAssessment();
  if (ready.phase !== "READY_FOR_REVIEW") throw new Error(`assessment is not READY_FOR_REVIEW after ratifications: ${ready.phase}`);

  // Step 3: neutral review over the live official policy source.
  if (!record.steps.requestReview) {
    const { hash } = await writeTx(clients.sponsor, "request_review", [assessmentId]);
    record.steps.requestReview = { hash };
    writeEvidence(LIFECYCLE_PATH, record);
  }
  let reviewed = await readAssessment();
  console.log(`REVIEW_STATE phase=${reviewed.phase} tier=${reviewed.tier || "-"} attempt=${reviewed.attempt_count}`);

  // Step 4: one honest retry if the network returned a non-penalizing RETRYABLE.
  if (reviewed.phase === "RETRYABLE" && !record.steps.retryReview) {
    const attemptId = `${assessmentId}-T-${reviewed.attempt_count}`;
    console.log(`RETRY_PENDING current attempt=${attemptId}`);
    const { hash } = await writeTx(clients.sponsor, "retry_review", [assessmentId, attemptId]);
    record.steps.retryReview = { hash, expectedAttempt: attemptId };
    writeEvidence(LIFECYCLE_PATH, record);
    reviewed = await readAssessment();
    console.log(`RETRY_STATE phase=${reviewed.phase} tier=${reviewed.tier || "-"} attempt=${reviewed.attempt_count}`);
  }
  if (!["FINAL_MINIMAL", "FINAL_TRANSPARENCY", "FINAL_HIGH_RISK", "FINAL_PROHIBITED"].includes(reviewed.phase)) {
    throw new Error(`assessment did not reach a terminal tier (phase=${reviewed.phase}); value must not be treated as settled`);
  }

  // Step 5: read the finalized consequence and balances before withdrawal.
  const attempt = await viewJson(clients.reader, "get_attempt", [`${assessmentId}-T-${reviewed.attempt_count}`]);
  const accountingBefore = await viewJson(clients.reader, "get_accounting");
  const creditOwner =
    reviewed.phase === "FINAL_MINIMAL" ? accounts.operator.address :
    reviewed.phase === "FINAL_TRANSPARENCY" ? accounts.operator.address :
    reviewed.phase === "FINAL_HIGH_RISK" ? accounts.steward.address :
    accounts.sponsor.address;
  const creditOwnerRole =
    reviewed.phase === "FINAL_MINIMAL" ? "operator" :
    reviewed.phase === "FINAL_TRANSPARENCY" ? "operator" :
    reviewed.phase === "FINAL_HIGH_RISK" ? "steward" :
    "sponsor";
  const creditBefore = await viewJson(clients.reader, "get_credit", [assessmentId, creditOwner]);
  const balanceBefore = await balance(creditOwner);
  console.log(`CONSEQUENCE phase=${reviewed.phase} launch=${reviewed.launch_mode} credit=${formatGen(creditBefore.amount)} to ${creditOwnerRole}`);
  record.steps.consequence = {
    phase: reviewed.phase,
    tier: reviewed.tier,
    launch_mode: reviewed.launch_mode,
    attempt: `${assessmentId}-T-${reviewed.attempt_count}`,
    attemptOutcome: attempt.outcome,
    basisCodes: attempt.basis_codes,
    sourceCoverage: attempt.source_coverage,
    creditOwner: creditOwnerRole,
    creditBeforeGen: formatGen(creditBefore.amount),
  };
  writeEvidence(LIFECYCLE_PATH, record);

  // Step 6: withdraw the credit (debit before external transfer).
  if (!record.steps.withdraw) {
    const { hash } = await writeTx(clients[creditOwnerRole], "withdraw_credit", [assessmentId]);
    record.steps.withdraw = { hash, owner: creditOwnerRole };
    writeEvidence(LIFECYCLE_PATH, record);
  }
  const creditAfter = await viewJson(clients.reader, "get_credit", [assessmentId, creditOwner]);
  const balanceAfter = await balance(creditOwner);
  const accountingAfter = await viewJson(clients.reader, "get_accounting");
  if (creditAfter.amount !== "0") throw new Error("credit was not zeroed after withdrawal");
  const delta = balanceAfter - balanceBefore;
  if (delta !== BigInt(creditBefore.amount)) {
    throw new Error(`balance delta ${delta} does not equal credited amount ${creditBefore.amount}`);
  }
  record.steps.withdraw = {
    ...record.steps.withdraw,
    owner: creditOwnerRole,
    creditedGen: formatGen(creditBefore.amount),
    balanceDeltaGen: formatGen(delta),
    creditAfterGen: formatGen(creditAfter.amount),
    accountingBefore: formatAccounting(accountingBefore),
    accountingAfter: formatAccounting(accountingAfter),
  };
  writeEvidence(LIFECYCLE_PATH, record);

  // Ledger invariant: funded == locked + outstanding + withdrawn.
  const a = accountingAfter;
  const funded = BigInt(a.total_funded);
  const locked = BigInt(a.total_locked);
  const outstanding = BigInt(a.total_outstanding_credit);
  const withdrawn = BigInt(a.total_withdrawn);
  if (funded !== locked + outstanding + withdrawn) throw new Error("global accounting invariant violated");
  console.log(`LIFECYCLE_COMPLETE assessment=${assessmentId} phase=${reviewed.phase} launch=${reviewed.launch_mode} withdrawn=${formatGen(withdrawn)}`);
  console.log(`ACCOUNTING funded=${formatGen(funded)} locked=${formatGen(locked)} outstanding=${formatGen(outstanding)} withdrawn=${formatGen(withdrawn)}`);
}

const command = process.argv[2] ?? "";
try {
  if (command === "deploy") await deploy();
  else if (command === "lifecycle") await lifecycle();
  else {
    console.log("usage: node scripts/studionet.mjs <deploy|lifecycle>");
    process.exit(1);
  }
} catch (cause) {
  console.error(`ERROR: ${cause?.message ?? cause}`);
  process.exit(1);
}
