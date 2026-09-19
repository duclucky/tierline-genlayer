# Phase 7 - Frontend integration and browser-local RPC verification

Date: 2026-09-19
Environment: local Windows machine, Vite dev server on port 5199, ZCode in-app
browser (Chromium-based IAB). This is browser-local evidence only; it is not
Studionet network evidence and not browser-wallet write evidence.

## What was proven

1. **Same-origin IC read path, in a real browser.** The application page at
   `http://localhost:5199/` executed an in-page `fetch("/genlayer-rpc")`
   POST (JSON-RPC `eth_chainId`). Result: HTTP 200 with
   `{"jsonrpc":"2.0","result":"0xf22f","id":1}`. The decimal chain id is
   61999, the current official GenLayer Studionet wallet chain id. No
   `Failed to fetch` or CORS error occurred.
2. **Vite dev proxy** forwards `/genlayer-rpc` to
   `https://studio.genlayer.com/api` (verified same request through curl
   before the browser check).
3. **Production proxy plan**: `vercel.json` rewrites `/genlayer-rpc` to the
   `api/genlayer-rpc.mjs` serverless function, which forwards JSON-RPC POST
   bodies to the same official endpoint with a 64 KB size bound.
4. **Real-SDK wallet-account preflight regression** (offline, intercepted
   I/O): `frontend/src/adapter-preflight.test.ts` proves through the real
   `genlayer-js` client that
   - the value-bearing `create_assessment` write encodes `from` = selected
     wallet address and `value` = exactly `2 * 10**18` base units (2 GEN);
   - zero-value writes (`ratify_assessment`, `retry_review`) encode
     `value = 0` with the selected account;
   - `wallet_switchEthereumChain` is requested before every write and the
     chain check reads `eth_chainId` = `0xf22f`;
   - the selected account is configured at `createClient`; no per-call raw
     string account override exists in the adapter;
   - missing session or invalid contract address fails before signing.
5. **Transaction lifecycle** is tracked as AWAITING_SIGNATURE, SUBMITTED,
   ACCEPTED, FINALIZED, FAILED with both raw Studio and normalized SDK
   receipt-shape failure detection (`isFailedReceipt`).
6. **Full check**: `npm run check` = genvm-lint (pass) + 35 direct tests
   (pass) + frontend typecheck + 16 frontend tests + production build (all
   pass).

## Wallet flow implemented (FE-WALLET-EVM / FE-WALLET-ACCOUNT)

- EIP-6963 provider discovery plus injected fallbacks
  (window.ethereum, OKX, Rabby, Coinbase, Brave, MetaMask-compatible);
  centered provider-selection modal; no auto-pick; no MetaMask-only path.
- On connect: `eth_requestAccounts` -> address validation ->
  `wallet_switchEthereumChain` (`wallet_addEthereumChain` on 4902/-32603)
  -> `eth_chainId` confirmation -> session registered for the adapter.
- Clickable address in the top bar opens an account menu with Disconnect;
  disconnect clears the module session and disables all writes.
- localStorage holds only the theme preference; never wallet, contract,
  transaction, or canonical state.

## What is still pending (honest limits)

- Browser-wallet writes against the deployed contract (Phase 8 lifecycle).
- The deployed contract address is not yet configured; the app shows honest
  "Preview mode" states until Phase 9 wires `VITE_GENLAYER_CONTRACT_ADDRESS`.
- Vercel production deploy and live-URL verification (Phases 12-13).
