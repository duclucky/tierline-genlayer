import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

// Studio-dev v0.6 RC deployment for Tierline. This script deliberately does
// not run the value-bearing product lifecycle: deployment fees are quoted and
// passed to the SDK, while a 2 GEN assessment needs its own explicit run.

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT_PATH = path.join(PROJECT, "contracts", "tierline.py");
const EVIDENCE_PATH = path.join(PROJECT, "docs", "evidence", "studio-dev", "deployment.json");
const FRONTEND_ENV_PATH = path.join(PROJECT, "frontend", ".env");
const GEN = 10n ** 18n;
const DEPLOYER_KEY = "STUDIONET_PRIVATE_KEY";

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
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(value)) throw new Error(`required authorized account ${name} is absent or invalid`);
  return value.startsWith("0x") ? value : `0x${value}`;
}

function formatGen(value) {
  const amount = BigInt(value);
  const whole = amount / GEN;
  const fractional = amount % GEN;
  return fractional === 0n ? `${whole} GEN` : `${whole}.${fractional.toString().padStart(18, "0").replace(/0+$/, "")} GEN`;
}

function sourceHash() {
  return crypto.createHash("sha256").update(fs.readFileSync(CONTRACT_PATH)).digest("hex");
}

function sourceCommit() {
  return execSync("git rev-parse HEAD", { cwd: PROJECT, encoding: "utf8" }).trim();
}

function isWorkingTreeDirty() {
  return Boolean(execSync("git status --porcelain", { cwd: PROJECT, encoding: "utf8" }).trim());
}

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function receiptProjection(hash, receipt) {
  return {
    transactionHash: hash,
    status: String(receipt.statusName ?? receipt.status ?? ""),
    executionResult: String(receipt.txExecutionResultName ?? receipt.txExecutionResult ?? ""),
    contractAddress: receipt.contractAddress ? String(receipt.contractAddress) : (receipt.recipient ? String(receipt.recipient) : ""),
  };
}

function deployedAddress(receipt) {
  const address = receipt.contractAddress ?? receipt.result?.contractAddress ?? receipt.deployment?.contractAddress ?? receipt.recipient;
  if (!/^0x[a-fA-F0-9]{40}$/.test(String(address ?? ""))) throw new Error("finalized deployment receipt did not contain a valid contract address");
  return String(address);
}

function upsertEnv(text, name, value) {
  const line = `${name}=${value}`;
  const lines = text.split(/\r?\n/);
  let replaced = false;
  const next = lines.map((current) => {
    if (current.startsWith(`${name}=`)) {
      replaced = true;
      return line;
    }
    return current;
  });
  if (!replaced) next.push(line);
  return `${next.filter((line, index) => line || index < next.length - 1).join("\n")}\n`;
}

function configureLocalFrontend(contractAddress, rpcUrl) {
  const current = fs.existsSync(FRONTEND_ENV_PATH) ? fs.readFileSync(FRONTEND_ENV_PATH, "utf8") : "";
  let next = upsertEnv(current, "VITE_GENLAYER_NETWORK", "studio-dev");
  next = upsertEnv(next, "VITE_GENLAYER_CONTRACT_ADDRESS", contractAddress);
  next = upsertEnv(next, "VITE_GENLAYER_IC_RPC_URL", rpcUrl);
  fs.writeFileSync(FRONTEND_ENV_PATH, next, "utf8");
}

async function sdk() {
  const root = path.join(PROJECT, "frontend", "node_modules", "genlayer-js", "dist");
  const api = await import(pathToFileURL(path.join(root, "index.js")).href);
  const chains = await import(pathToFileURL(path.join(root, "chains", "index.js")).href);
  return { ...api, studioDevnet: chains.studioDevnet };
}

async function main() {
  loadAuthorizedEnv();
  const { createAccount, createClient, isSuccessful, studioDevnet } = await sdk();
  const account = createAccount(requiredPrivateKey(DEPLOYER_KEY));
  const endpoint = process.env.STUDIO_DEV_RPC_URL?.trim() || studioDevnet.rpcUrls.default.http[0];
  const client = createClient({ chain: studioDevnet, endpoint, account });
  const command = process.argv[2] ?? "deploy";
  if (command === "balance") {
    const target = String(process.argv[3] ?? "");
    if (!/^0x[a-fA-F0-9]{40}$/.test(target)) throw new Error("balance requires a valid address");
    const [ownerBalance, targetBalance, ownerNonce] = await Promise.all([
      client.getBalance({ address: account.address }),
      client.getBalance({ address: target }),
      client.getCurrentNonce({ address: account.address, block: "latest" }),
    ]);
    console.log(`STUDIO_DEV_BALANCE owner=${formatGen(ownerBalance)} target=${formatGen(targetBalance)} ownerNonce=${ownerNonce}`);
    return;
  }
  if (command === "locate-transfer") {
    const target = String(process.argv[3] ?? "").toLowerCase();
    const amount = BigInt(process.argv[4] ?? "10") * GEN;
    if (!/^0x[a-f0-9]{40}$/.test(target)) throw new Error("locate-transfer requires a valid destination address");
    const head = BigInt(await client.request({ method: "eth_blockNumber", params: [] }));
    for (let offset = 0n; offset < 24n && head >= offset; offset += 1n) {
      const block = await client.request({ method: "eth_getBlockByNumber", params: [`0x${(head - offset).toString(16)}`, true] });
      for (const tx of block?.transactions ?? []) {
        const from = String(tx.from_address ?? tx.from ?? tx.sender ?? "").toLowerCase();
        const to = String(tx.to ?? tx.to_address ?? tx.recipient ?? "").toLowerCase();
        if (from === account.address.toLowerCase() && to === target && BigInt(tx.value ?? 0) === amount) {
          console.log(`STUDIO_DEV_TRANSFER_LOCATED hash=${tx.hash} block=${block.number ?? ""} amount=${formatGen(amount)}`);
          return;
        }
      }
    }
    throw new Error("recent matching transfer was not found; do not retry before manual reconciliation");
  }
  if (command === "fund") {
    const target = String(process.argv[3] ?? "");
    const amountGen = BigInt(process.argv[4] ?? "10");
    if (!/^0x[a-fA-F0-9]{40}$/.test(target)) throw new Error("fund requires a valid destination address");
    if (amountGen <= 0n) throw new Error("fund amount must be a positive whole GEN amount");
    const amount = amountGen * GEN;
    const ownerBefore = await client.getBalance({ address: account.address });
    const targetBefore = await client.getBalance({ address: target });
    if (ownerBefore < amount) throw new Error(`owner balance is below ${amountGen} GEN`);
    const receipt = await client.transfer({ to: target, value: amount });
    if (receipt.status === "reverted") throw new Error("native GEN transfer reverted");
    const targetAfter = await client.getBalance({ address: target });
    console.log(`STUDIO_DEV_FUND_RECEIPT to=${target} amount=${amountGen} GEN hash=${receipt.transactionHash}`);
    if (targetAfter < targetBefore + amount) throw new Error("destination balance did not increase by the requested GEN amount");
    console.log(`STUDIO_DEV_FUND_FINALIZED to=${target} amount=${amountGen} GEN hash=${receipt.transactionHash}`);
    return;
  }
  const code = fs.readFileSync(CONTRACT_PATH, "utf8");
  const feeQuote = await client.estimateTransactionFees();

  if (command === "quote") {
    console.log(`STUDIO_DEV_FEE_QUOTE deposit=${formatGen(feeQuote.feeValue)} chainId=${studioDevnet.id}`);
    return;
  }
  if (command !== "deploy" && command !== "recover") throw new Error("usage: node scripts/studio-dev.mjs [quote|deploy|recover <transaction-hash>|fund <address> <whole-gen>]");

  const prior = readJson(EVIDENCE_PATH);
  if (prior?.active && prior?.status === "FINALIZED" && prior?.sourceSha256 === sourceHash()) {
    console.log(`STUDIO_DEV_DEPLOYMENT_REUSED contract=${prior.contractAddress}`);
    return;
  }

  const hash = command === "recover"
    ? process.argv[3]
    : await client.deployContract({
      code,
      args: [],
      fees: { distribution: feeQuote.distribution, feeValue: feeQuote.feeValue },
    });
  if (!/^0x[a-fA-F0-9]{64}$/.test(String(hash ?? ""))) throw new Error("recover requires a transaction hash");
  console.log(command === "recover"
    ? `STUDIO_DEV_DEPLOY_RECOVERING hash=${hash}`
    : `STUDIO_DEV_DEPLOY_SUBMITTED hash=${hash} feeDeposit=${formatGen(feeQuote.feeValue)}`);
  const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 5000, retries: 120 });
  if (!isSuccessful(receipt)) {
    const summary = receiptProjection(hash, receipt);
    throw new Error(`deployment finalized without successful execution: status=${summary.status} result=${summary.executionResult}`);
  }

  const contractAddress = deployedAddress(receipt);
  const count = await client.readContract({ address: contractAddress, functionName: "get_assessment_count" });
  if (String(count) !== "0") throw new Error("new deployment did not return zero assessment count");

  const evidence = {
    network: "studio-dev",
    chainId: studioDevnet.id,
    rpc: endpoint,
    contract: "Tierline",
    contractAddress,
    explorerUrl: `https://explorer-studio-dev.genlayer.com/address/${contractAddress}`,
    status: "FINALIZED",
    deploy: receiptProjection(hash, receipt),
    feeDepositGen: formatGen(feeQuote.feeValue),
    sourceCommit: sourceCommit(),
    sourceSha256: sourceHash(),
    sourceDirtyAtDeployment: isWorkingTreeDirty(),
    depends: "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng",
    deployedAt: new Date().toISOString(),
    active: true,
    evidenceIsSanitized: true,
    smoke: { method: "get_assessment_count", result: "0" },
  };
  writeJson(EVIDENCE_PATH, evidence);
  configureLocalFrontend(contractAddress, endpoint);
  console.log(`STUDIO_DEV_DEPLOYED contract=${contractAddress}`);
  console.log(`STUDIO_DEV_SMOKE get_assessment_count=0`);
}

main().catch((error) => {
  console.error(`STUDIO_DEV_DEPLOY_FAILED ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
