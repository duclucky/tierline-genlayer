# Tierline

Tierline is a GenLayer Projects dApp that turns a co-ratified AI-use profile
into a neutral launch mode and routes a 2 GEN readiness budget from a
validator-agreed interpretation of the official European Commission AI Act
risk guide.

## Deployed contract

- Network: GenLayer Studionet
- Address: `0x79e9B3f5e844b46F1DD7a33da038CAF92E1BC20f`
- Explorer: https://explorer-studio.genlayer.com/address/0x79e9B3f5e844b46F1DD7a33da038CAF92E1BC20f

## How it works

1. A sponsor creates an assessment with exactly 2 GEN and assigns distinct
   operator and safety-steward roles.
2. The operator and steward ratify the locked profile.
3. GenLayer validators retrieve the locked Commission source and agree on the
   semantic tier: prohibited, high risk, transparency, minimal, or retryable.
4. Contract code derives the launch mode and opens the deterministic GEN
   credit. The owner withdraws it once.

The live Studionet lifecycle recorded a `HIGH_RISK` assessment, selected
`REQUIRE_SAFEGUARDS`, credited the safety steward 2 GEN, and completed the
withdrawal. Sanitized evidence is in `docs/evidence/studionet/`.

## Run locally

```powershell
npm install
npm run check
npm --prefix frontend run dev
```

The frontend requires an EVM wallet selected by the user and uses the
Studionet address above. It keeps browser-wallet traffic separate from
GenLayer intelligent-contract reads.

## Verification

`npm run check` runs GenVM lint, 35 direct tests, frontend TypeScript checks,
16 frontend tests, and the production build.

## Limitations

Tierline is a private policy-routing workflow, not legal advice, a regulator
approval, or proof that an AI system exists or has implemented safeguards.
Browser-wallet writes are not yet independently proven in a production browser.
