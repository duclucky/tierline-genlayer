# Tierline

Public repository: https://github.com/duclucky/tierline-genlayer

Tierline is a GenLayer Projects dApp that turns a co-ratified AI-use profile
into a neutral launch mode and routes a 2 GEN readiness budget from a
validator-agreed interpretation of the official European Commission AI Act
risk guide.

## Active test deployment

- Network: GenLayer Studio-dev (v0.6 RC, chain ID 61997)
- Address: `0x9A1875a12Cb5d65969E7DbDE96D310e80534357c`
- Explorer: https://explorer-studio-dev.genlayer.com/address/0x9A1875a12Cb5d65969E7DbDE96D310e80534357c
- Deployment transaction: https://explorer-studio-dev.genlayer.com/transaction/0x74ad35722de47f36d750b4e0f16de29f70869c48e2b1ae3be41aceb052e6f588

## Live app

https://tierline-genlayer.vercel.app

## How it works

1. A sponsor creates an assessment with exactly 2 GEN and assigns distinct
   operator and safety-steward roles.
2. The operator and steward ratify the locked profile.
3. GenLayer validators retrieve the locked Commission source and agree on the
   semantic tier: prohibited, high risk, transparency, minimal, or retryable.
4. Contract code derives the launch mode and opens the deterministic GEN
   credit for the applicable operator, steward, or sponsor. Only that credit
   recipient can withdraw it once.

The active RC deployment has a finalized deploy receipt, a Chrome browser-wallet
assessment creation, and a separate two-role API lifecycle through settled
credit withdrawal. The former Studionet lifecycle is historical evidence only;
its contract is not the active frontend target and must not receive further
value. Sanitized evidence is in
`docs/evidence/studio-dev/` and `docs/evidence/studionet/` respectively.

## Run locally

```powershell
npm install
npm run check
npm --prefix frontend run dev
```

The frontend requires an EVM wallet selected by the user and uses the
Studio-dev address above. It keeps browser-wallet traffic separate from
GenLayer intelligent-contract reads.

## Verification

`npm run check` runs GenVM lint, 36 direct tests, frontend TypeScript checks,
17 frontend tests, and the production build.

## Limitations

Tierline is a private policy-routing workflow, not legal advice, a regulator
approval, or proof that an AI system exists or has implemented safeguards.
The sponsor's creation/funding flow is proven with a Chrome browser wallet.
Ratification, review, and withdrawal are proven with temporary role EOAs through
the Studio-dev API, not independent Chrome wallet interactions.
