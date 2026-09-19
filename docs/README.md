# Tierline product and contract specification

## Identity

- Idea ID: `IDEA-029`
- Project name: Tierline
- Project slug: `tierline`
- Category: Projects
- Status: `DEPLOYED` (Studionet contract and Vercel app verified)
- Repository: https://github.com/duclucky/tierline-genlayer
- Target network: GenLayer Studionet

## One-sentence product hook

Tierline turns one co-ratified AI use profile into a neutral launch mode and
routes a 2 GEN readiness budget without letting the operator, safety steward,
or sponsor choose the result.

## Trust problem

- Decision that must not depend on one party: which locked private-policy tier
  applies to a co-ratified AI use profile.
- Why a database or backend LLM is insufficient: its operator can alter the
  classification, launch route, or budget recipient after seeing the profile.
- Value, rights, and access at risk: a 2 GEN readiness budget and the canonical
  launch mode consumed by downstream marketplaces, vaults, or gateways.

## Fingerprint

- Trust problem: no sponsor, operator, or steward may unilaterally select the
  tier that controls launch routing and the readiness budget.
- Actors/adversary: sponsor, AI operator, safety steward, validators, and
  downstream consumers have distinct roles and incentives.
- Evidence class + authenticity mechanism: an allowlisted, version-marked
  European Commission AI Act risk guide plus a profile whose canonical digest
  is separately ratified by all three transaction senders.
- Consensus question: which one of `PROHIBITED`, `HIGH_RISK`, `TRANSPARENCY`,
  `MINIMAL`, or `RETRYABLE` best describes the exact co-ratified profile under
  the locked guide version?
- State machine: funded draft, independent ratification, review attempts,
  terminal tier or retry, expiry/refund, pull credits, and one-time withdrawal.
- Direct consequence: the accepted tier changes launch mode and routes exactly
  2 GEN to operator, steward, split credits, or sponsor refund.
- Reuse surface: canonical assessment, launch-mode, credit, accounting, and
  lifecycle views and writes.

## Scope and non-goals

### In scope

- Contractual co-ratification of one bounded AI use profile.
- Validator interpretation of the exact locked Commission guide version.
- One canonical private launch mode and deterministic 2 GEN budget routing.
- Honest retry, expiry, refund, and pull-withdrawal paths.
- A full user-facing web application for sponsor, operator, and steward jobs.

### Out of scope

- Legal advice, legal compliance certification, or regulator endorsement.
- Proof that a described AI system exists or behaves as the profile states.
- Proof that disclosure, safeguards, monitoring, or remediation happened offchain.
- Private evidence, uploaded reports, claimant-hosted JSON, or screenshots.
- A generic AI oracle, admin dashboard, or contract explorer.

## Provisional contract-capability sketch

### Human roles

- **Sponsor:** defines the participants and profile, locks the Commission source
  version, and funds exactly 2 GEN.
- **AI operator:** verifies and ratifies the exact profile it wants assessed.
- **Safety steward:** independently verifies and ratifies the same profile.
- **Any participant:** requests semantic review when all ratifications are valid;
  retries only after an explicit non-penalizing result and before expiry.
- **Credit recipient:** withdraws only its own canonical credit after settlement.

### User-visible capabilities

- Create a funded assessment.
- Inspect the canonical profile and source-policy version before signing.
- Ratify as the connected operator or steward.
- Request or retry review when the connected role and state permit it.
- Read the accepted tier, plain-language launch mode, budget routing, and history.
- Recover an expired unresolved assessment and withdraw an owned credit.

### Minimum view data

- Assessment ID; sponsor/operator/steward; profile summary and canonical digest.
- Current phase, tier, launch mode, ratification flags, and relevant deadlines.
- Current attempt status and user-actionable failure/retry message.
- Budget locked, credit destinations, owned withdrawable credit, and settlement state.

### Meaningful product states

`AWAITING_RATIFICATION`, `READY_FOR_REVIEW`, `REVIEW_SUBMITTED`,
`REVIEW_ACCEPTED`, `FINALIZED`, `RETRYABLE`, `EXPIRED_REFUNDABLE`,
`MINIMAL_ALLOWED`, `TRANSPARENCY_REQUIRED`, `SAFEGUARDS_REQUIRED`,
`BLOCKED`, and `WITHDRAWN`.

### Value, finality, and recovery expectations

- Human-facing amounts are always GEN. Creation requires exactly 2 GEN.
- Every write shows submitted, accepted/decided, finalized, failed, or retryable.
- Canonical state is re-read after finalization; transaction hashes are supporting
  links, never substitutes for state.
- Source/authentication failure moves no GEN or launch right. A participant may
  retry within the review window; after expiry the sponsor can recover the
  unresolved 2 GEN as a pull credit.

## Product/frontend blueprint

### Human users and jobs

| User/role | Primary job | Decision or outcome needed |
| --- | --- | --- |
| Sponsor | Open and fund one assessment with the right participants and source version | Know the assessment is ratifiable and all 2 GEN have a defined destination |
| AI operator | Verify the description before committing to it | Ratify safely, follow review progress, and know whether launch is allowed or conditioned |
| Safety steward | Confirm the profile and act when safeguards are required | Ratify independently, request review, and withdraw stewardship credit when eligible |
| Credit recipient | Recover finalized value | See owned credit, submit withdrawal, and confirm the canonical zeroed credit |
| Integrator/evaluator | Understand the public method and limitations | Know what the launch mode means and what it explicitly does not prove |

### Information architecture and route map

Persistent desktop navigation uses a left rail; mobile uses a compact top bar
and a labeled five-item bottom navigation. Deep assessment URLs remain directly
addressable and route changes focus the main heading.

| Route | Screen/view | User purpose | Primary action | Required states | Mobile behavior |
| --- | --- | --- | --- | --- | --- |
| `/` | Landing | Understand Tierline in user terms and its honest limits | Start an assessment | Contract configured or clearly unconfigured | Single-column hero, outcome explainer, no fabricated logos/testimonials |
| `/assessments` | Assessments | Revisit assessments involving the connected address | Open an assessment | loading, empty, error, loaded, disconnected | Filter sheet and stacked cards instead of a wide table |
| `/assessments/new` | New assessment | Complete a four-step sponsor workflow | Fund 2 GEN and create | disconnected, wrong network, validation error, submitting, accepted, finalized, failed | Full-width stepper, one field group per step, persistent back/cancel |
| `/assessments/:id` | Assessment detail | Verify profile, ratify, review, retry, recover, and inspect outcome | One role/state-legal action | all canonical phases plus unavailable/not-found | Summary first; technical details collapsed; action bar remains reachable |
| `/credits` | Credits | Find and withdraw credit owned by the connected account | Withdraw available credit | disconnected, empty, available, submitting, finalized, failed | One credit card per assessment; no dense finance table |
| `/methodology` | Methodology | Understand the policy source, tier meanings, evidence boundary, and limitations | Open official source | source available/unavailable | Readable long-form measure and anchored sections |
| `/settings` | Settings | Manage wallet, network visibility, theme, and accessibility preferences | Connect/disconnect wallet | no wallet, provider list, connected, wrong network | Centered provider sheet; destructive disconnect separated |

### Visibility matrix

| Function/data group | Visibility | Eligible role/state | User need or reason hidden |
| --- | --- | --- | --- |
| Profile summary, parties, deadlines, launch mode | `USER_PRIMARY` | Any assessment viewer | Required to understand and act safely |
| Create/fund assessment | `USER_PRIMARY` | Connected sponsor | Core sponsor job |
| Ratify | `USER_PRIMARY` | Connected operator or steward before deadline | Core commitment job |
| Request/retry review | `USER_PRIMARY` | Participant in a legal review state | Core outcome/recovery job |
| Withdraw owned credit | `USER_PRIMARY` | Connected credited address | Core value-recovery job |
| Transaction lifecycle and actionable failure | `USER_PRIMARY` | Actor who submitted a write | Needed to avoid blind retry or duplicate writes |
| Official source link, digest, transaction/explorer link | `USER_CONTEXTUAL` | Any viewer | Useful verification, not the primary product task |
| Raw tier enum and basis codes | `USER_CONTEXTUAL` | Any viewer after result | Available in restrained technical details with plain-language label first |
| Validator prompts, leader output, attempt internals | `SYSTEM_ONLY` | None in primary UI | Not user-actionable and may mislead users about final state |
| Submission/reviewer evidence and internal acceptance checks | `SYSTEM_ONLY` | None in product UI | Repository/process evidence, not product functionality |

### Provisional UI action matrix

| Visible control | Expected contract capability | Eligible role | Legal state | Input/value | Expected finality | Failure/recovery |
| --- | --- | --- | --- | --- | --- | --- |
| Create assessment | `create_assessment` | Sponsor | New entity | parties, profile, deadlines, exactly 2 GEN | Submitted through finalized, then canonical reload | Edit validation; inspect failure; never auto-resubmit |
| Ratify profile | `ratify_assessment` | Operator or steward | Awaiting that role before deadline | assessment ID + canonical digest, 0 GEN | Submitted through finalized, then canonical reload | Digest/state error keeps UI actionable after reload |
| Request review | `request_review` | Any participant | Ready before review deadline | assessment ID, 0 GEN | Submitted, accepted/decided, finalized, canonical reload | Source/model failure displays retryable result, no hard consequence |
| Retry review | `retry_review` | Any participant | Retryable before deadline | assessment ID/current attempt, 0 GEN | Same lifecycle as review | Current attempt read dynamically; no hardcoded attempt |
| Recover expired assessment | `recover_expired` | Sponsor | Unsettled after exact deadline | assessment ID, 0 GEN | Finalized sponsor credit then canonical reload | Early/wrong-role rejection leaves accounting unchanged |
| Withdraw credit | `withdraw_credit` | Credit owner | Positive unwithdrawn credit | assessment ID, 0 GEN | Finalized transfer then canonical zero reload | Debit-before-transfer; duplicate stays disabled/rejected |
| Connect wallet | Browser provider request | Any visitor | Disconnected | Chosen detected EVM provider | Connected account or explicit rejection | Reopen modal; no auto-pick and no persisted account |
| Disconnect | Local provider/account UI reset | Connected visitor | Connected | None | Immediate UI state only | Writes disabled until a new explicit connection |

### User-facing state language

| Canonical status/violation | User-facing label | User consequence/next step |
| --- | --- | --- |
| `AWAITING_RATIFICATION` | Waiting for profile approval | The named operator or steward must verify and sign the same profile |
| `READY_FOR_REVIEW` | Ready for neutral review | A participant can request validator review |
| `REVIEW_SUBMITTED` | Review submitted | Wait for a network decision; do not submit again |
| `REVIEW_ACCEPTED` | Decision accepted | Wait for finality before treating the launch mode as canonical |
| `RETRYABLE` | Source could not be verified | Retry before the deadline; no budget or launch right moved |
| `MINIMAL_ALLOWED` | Launch allowed under this policy | Operator credit is available after finalization |
| `TRANSPARENCY_REQUIRED` | Disclosure required before launch | Budget is split between operator and steward |
| `SAFEGUARDS_REQUIRED` | Safeguard review required | Route stays conditioned and stewardship credit is available |
| `BLOCKED` | Launch blocked under this policy | Sponsor refund is available; this is not a legal ruling |
| `EXPIRED_REFUNDABLE` | Review window ended | Sponsor can recover the unresolved budget |
| `WITHDRAWN` | Credit withdrawn | No remaining credit for this recipient |

### Wallet and network behavior

- Discover EIP-6963 providers and explicit injected fallbacks for `window.ethereum`,
  OKX, Rabby, MetaMask, Coinbase, Brave, and compatible providers.
- Always present a centered provider-selection modal; never select the first
  provider automatically and never hardcode a MetaMask-only path.
- Connect the selected account, configure that account on the eventual
  `genlayer-js` client, validate all addresses, and never pass a raw-string
  per-call account override.
- Switch or add the current SDK-derived Studionet EVM wallet chain before writes.
- Send wallet writes over the selected EVM provider; send Intelligent Contract
  reads through the GenLayer IC RPC, using a same-origin proxy if browser CORS
  requires it.
- The header address opens an account menu with a clear Disconnect action.
  Disconnect clears provider/account UI state and disables every write.
- Theme is a harmless UI preference and may be stored locally; wallet, contract,
  finance, transaction, and canonical assessment state may not be stored there.

### Visual direction and preservation constraints

- Preserve the verified `ui-ux-pro-max` direction: Enterprise Gateway pattern,
  Minimalism/Swiss grid, trust navy, restrained audit green, Lexend headings,
  Source Sans 3 body, subtle 200-250 ms interactions, and standard density.
- Do not add fabricated testimonials, client logos, usage metrics, balances,
  assessments, transaction hashes, or success claims.
- Maintain strong focus indicators, minimum 44 px targets, visible labels,
  inline recovery, reduced-motion handling, 375/768/1024/1440 layouts, and no
  horizontal mobile scroll.
- Allowed later edits are contract wiring, canonical data bindings, legal
  role/state gating, RPC/finality feedback, and small layout adjustments needed
  for real content.
- Raw storage, validator output, prompts, attempt mechanics, reviewer evidence,
  and submission material remain out of the primary UI.

## Phase 2 admission summary

All 14 mandatory gates passed before this repository or frontend was created.
The complete rationale and Evidence Authority Matrix are recorded in the shared
IDEA-029 registry entry and will be copied into the completed Phase 4
specification before contract implementation.

## Mandatory gate matrix

| Gate | PASS/FAIL | Evidence/reason |
| --- | --- | --- |
| Replacement | PASS | Replacing GenLayer with a signed database or one LLM operator removes transaction-authenticated co-ratification, replicated semantic consensus, and atomic neutral routing of rights and native GEN. |
| Judgment | PASS | Applying qualitative risk language to a bounded AI use profile is semantic interpretation, not deterministic lookup. |
| Evidence availability | PASS | The official Commission guide returned HTTP 200, 92,376 bytes, and all four tier markers; a bounded identity/size/version probe distinguishes source failure from parser/model failure. |
| Evidence authenticity | PASS | Policy bytes come from the official Commission origin; profile authority comes from exact transaction senders; every authentication failure remains non-penalizing. |
| Equivalence | PASS | Critical output is an exact assessment/source/attempt tuple, one tier, full source coverage, and a sorted unique allowlisted basis-code set. |
| Consequence | PASS | An accepted tier changes canonical launch mode and routes exactly 2 GEN. |
| Adversarial | PASS | Operator, steward, and sponsor have conflicting launch and financial incentives. |
| State model | PASS | Per-assessment isolation, immutable ratification, append-only attempts, direct time guards, complete value destinations, one-time settlement, and debit-before-transfer withdrawals are locked below. |
| Reuse | PASS | Builders use stable lifecycle writes and canonical assessment, launch-mode, credit, and accounting views without copying judgment logic. |
| Contract count | PASS | One contract owns judgment, state, rights, credits, and accounting; no pass-through guard is justified. |
| Differentiation | PASS | The primitive combines official versioned policy, tri-party profile ratification, four persistent launch modes, and tier-specific budget routing. |
| Claim-to-code | PASS | Every important claim maps to a method/state, view, direct test, UI path, and planned network evidence below. |
| Full lifecycle | PASS | Projects coverage requires real browser-wallet writes, full finality/error/retry handling, and canonical reload for every claimed action. |
| Scope honesty | PASS | The result covers only a co-ratified contractual profile and locked guide version; it proves neither a deployed system nor legal compliance. |

## Actors, roles and incentives

| Actor | Permissions | Value at risk | Incentive to bias |
| --- | --- | --- | --- |
| Sponsor | Create/fund, read, request review, cancel unratified, recover expired, withdraw sponsor credit | Exactly 2 GEN per assessment | Prefer a cheap launch or refund and may understate risk |
| AI operator | Ratify exact digest, request/retry review, withdraw operator credit | Launch route and up to 2 GEN | Prefer `MINIMAL` or `TRANSPARENCY` |
| Safety steward | Ratify exact digest, request/retry review, withdraw steward credit | Safeguard authority and up to 2 GEN | Prefer adequate safeguards and stewardship budget |
| Validators | Independently fetch and semantically classify | Consensus integrity | Must reject malformed, unsupported, or mismatched output |
| Downstream consumer | Read finalized launch mode | Its own routing safety | Needs one canonical, non-overwritable result |

## State model

### Stable IDs

- Assessment IDs are contract-derived `A-<monotonic u256>` strings.
- Attempt IDs are `<assessment-id>-T-<monotonic u16>` strings.
- Credit identity is the deterministic pair `<assessment-id>|<recipient-address>`.
- IDs, role addresses, source URL/version, profile fields, digest, and deadlines
  are immutable after creation.

### Structured storage

- `assessments: TreeMap[str, AssessmentRecord]` owns roles, profile fields,
  source binding, deadlines, ratifications, phase, tier, launch mode, attempt
  count, and per-assessment accounting.
- `attempts: TreeMap[str, AttemptRecord]` is append-only and records source
  coverage, normalized tier/basis codes, retry reason, and transaction time.
- `credits: TreeMap[str, CreditRecord]` owns recipient, amount, kind, and
  withdrawal state; credit amount is debited before transfer.
- Global counters and aggregate `total_funded`, `total_locked`,
  `total_outstanding_credits`, and `total_withdrawn` are accounting totals, not
  global last-result fields.

### State machine

```text
NONE --create_assessment/sponsor + 2 GEN--> AWAITING_RATIFICATION
AWAITING_RATIFICATION --ratify/operator or steward, both complete--> READY_FOR_REVIEW
AWAITING_RATIFICATION --cancel_unratified/sponsor after ratification deadline--> CANCELLED
READY_FOR_REVIEW --request_review/participant--> FINAL_MINIMAL
READY_FOR_REVIEW --request_review/participant--> FINAL_TRANSPARENCY
READY_FOR_REVIEW --request_review/participant--> FINAL_HIGH_RISK
READY_FOR_REVIEW --request_review/participant--> FINAL_PROHIBITED
READY_FOR_REVIEW --request_review/participant, source/output failure--> RETRYABLE
RETRYABLE --retry_review/participant--> FINAL_* | RETRYABLE
AWAITING_RATIFICATION | READY_FOR_REVIEW | RETRYABLE
  --recover_expired/sponsor at review deadline--> EXPIRED
FINAL_* | CANCELLED | EXPIRED --withdraw_credit/credit owner--> same terminal state
```

### Temporal entrypoint rules

- Canonical transaction-time source: `gl.message_raw["datetime"]`, falling back
  to `gl.message.datetime`, normalized to Unix seconds; unavailable time reverts.
- `create_assessment`: `now < ratification_deadline < review_deadline`; equality
  at either future deadline check is invalid.
- `ratify_assessment`: `now < ratification_deadline`; equality is late even when
  phase still says `AWAITING_RATIFICATION`.
- `request_review` and `retry_review`: `now < review_deadline`; equality is late
  even when phase is stale `READY_FOR_REVIEW` or `RETRYABLE`.
- `cancel_unratified`: sponsor only, `ratification_deadline <= now < review_deadline`,
  at least one ratification missing, exact stale phase checked, and unsettled.
- `recover_expired`: sponsor only, `now >= review_deadline`, unresolved phase,
  unsettled, and positive locked budget. Equality is recoverable.
- `withdraw_credit` is genuinely non-temporal because a finalized pull credit
  does not expire; caller, ownership, amount, and withdrawn state still apply.

### Illegal transitions

- No ratification by sponsor, wrong role, duplicate role, wrong digest, after
  deadline, or after leaving `AWAITING_RATIFICATION`.
- No review before both ratifications, after deadline, by a nonparticipant, or
  after any terminal settlement.
- No retry without the current phase `RETRYABLE` and current attempt identity.
- No cancellation while both roles have ratified, before the ratification
  deadline, at/after the review deadline, or by a non-sponsor.
- No recovery before review expiry or after settlement.
- No credit withdrawal by another address, at zero, or twice.

### Authorization

- Sponsor is `gl.message.sender` at creation.
- Operator and steward are immutable, nonzero, distinct addresses and distinct
  from sponsor.
- Participant means exactly sponsor, operator, or steward.
- No admin can edit an assessment, override a tier, redirect credit, or settle.

### Idempotency and double-action prevention

- Ratification flags reject a duplicate transaction from the same role.
- Attempt count increments once and each attempt key is immutable.
- `settled` changes before any terminal credit allocation can repeat.
- Credit creation requires an absent deterministic credit key.
- Withdrawal sets amount to zero and status `WITHDRAWN` before external transfer.

## Write-method safety matrix

| Method | Caller | Allowed states | Forbidden states | Temporal/expiry gate | Idempotency | Value/accounting effect | Views affected | Negative tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `create_assessment` | Any valid sponsor | New unique ID | N/A entity absent; invalid/equal roles or empty/out-of-bound profile | `now < ratification_deadline < review_deadline` | Contract-derived ID and one creation transaction | Payable exactly 2 GEN; funded and locked totals +2 GEN | list count, assessment, accounting | 0/1/3 GEN, invalid roles, past/equal/reversed deadlines, oversized fields, payability metadata |
| `ratify_assessment` | Exact operator or steward | `AWAITING_RATIFICATION`, caller flag false | Wrong role/digest, duplicate, terminal, ready | `now < ratification_deadline`; equality late | One flag per role | None; locked 2 GEN unchanged | assessment, action eligibility | wrong caller/object/digest/source version, duplicate, boundary -1/0/+1 with stale phase |
| `request_review` | Sponsor/operator/steward | `READY_FOR_REVIEW` | Awaiting, retryable, terminal, nonparticipant | `now < review_deadline`; equality late | Exactly first attempt; attempt count must be zero | On terminal valid output move 2 GEN locked to exact credits; retry moves none | assessment, attempt, credits, accounting | wrong role/state, duplicate, boundary -1/0/+1, source outage, malicious output, unchanged accounting on rejection |
| `retry_review` | Sponsor/operator/steward | `RETRYABLE` | Ready, awaiting, terminal, nonparticipant | `now < review_deadline`; equality late | Requires current attempt and creates next append-only attempt | Same terminal mapping; another retry moves none | assessment, attempts, credits, accounting | stale/hardcoded attempt, duplicate, wrong role/state, boundary -1/0/+1, no double settlement |
| `cancel_unratified` | Sponsor | `AWAITING_RATIFICATION`, at least one approval missing | Ready/retryable/terminal, both ratified, wrong caller | `ratification_deadline <= now < review_deadline` | `settled` false and positive locked budget | Move all 2 GEN from locked to sponsor credit | assessment, sponsor credit, accounting | wrong caller/state, early/equality at review deadline/duplicate, unchanged accounting after reject |
| `recover_expired` | Sponsor | Awaiting, ready, or retryable and unsettled | Any terminal state, wrong caller | `now >= review_deadline`; equality allowed | `settled` false and positive locked budget | Move all 2 GEN from locked to sponsor credit | assessment, sponsor credit, accounting | boundary -1/0/+1 with stale phase, wrong caller/state, duplicate, retry funds not orphaned |
| `withdraw_credit` | Exact credit owner | Terminal assessment and positive owned credit | Wrong owner, zero, already withdrawn, unresolved | N/A: finalized pull credit intentionally has no expiry | Debit and mark withdrawn before transfer | Outstanding credit -amount; withdrawn +amount; emit exact transfer | credit, assessment accounting, global accounting | wrong caller, wrong state, duplicate, transfer amount, no double withdrawal, invariant on transfer failure |

## Frontend lifecycle coverage matrix

| Canonical state | User action | Contract write | UI component | Frontend test | Evidence status |
| --- | --- | --- | --- | --- | --- |
| `NONE` | Create and fund | `create_assessment` | Four-step New assessment wizard | Validation + honest-disabled baseline; real adapter test required Phase 7 | Pending browser wallet/Studionet |
| `AWAITING_RATIFICATION` | Ratify exact profile | `ratify_assessment` | Detail role action | Role/digest/action-visibility test planned | Pending Phase 7 |
| `AWAITING_RATIFICATION` after deadline | Cancel unratified | `cancel_unratified` | Detail recovery action | Boundary/role/action test planned | Pending Phase 7 |
| `READY_FOR_REVIEW` | Request review | `request_review` | Detail primary action | Finality + canonical reload test planned | Pending Phase 7 |
| `RETRYABLE` | Retry current attempt | `retry_review` | Detail recovery action | Dynamic-attempt + retry test planned | Pending Phase 7 |
| unresolved at review deadline | Recover expired | `recover_expired` | Detail recovery action | Boundary/role/reload test planned | Pending Phase 7 |
| terminal with owned credit | Withdraw | `withdraw_credit` | Credits and detail actions | Value-bearing real-SDK adapter + zero-reload test planned | Pending Phase 7 |
| any configured state | Refresh canonical data | view calls only | Assessments/detail/credits | Read mapping and error test planned | Pending Phase 7 |

## Evidence policy

- Authoritative source: exact
  `https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai`.
- Provenance/authentication: HTTPS official Commission host/path allowlist plus
  identity, four heading, and legal-citation version-marker checks over the
  normalized rendered text (lowercase, whitespace-collapsed) of each fetched
  representation.
- Authorized attestor/signer: no offchain attestor. Sponsor, operator, and steward
  authenticate contractual profile approval through transaction sender.
- Anti-replay identity: assessment ID + profile digest + source version + role;
  attempt ID is monotonically derived from the assessment.
- Signed timestamp bounds: transaction consensus time supplies freshness; no
  actor-supplied timestamp can extend a deadline.
- Immutable policy/source version URLs and hashes: exact URL and version marker
  are contract constants; profile digest binds them. No actor-supplied source URL.
- Allowed schemes/domains/paths: HTTPS, exact host and exact path only.
- Time/window rules: fetch occurs only within the review window; transaction-time
  rules above are enforced inside every affected public write.
- Size/count bounds: rendered source must be nonempty, no more than 160,000
  characters, and contain each required marker once or more; profile components
  and prompt/output lengths are separately bounded.
- Missing, contradictory, unavailable, or invalid source: append `RETRYABLE`,
  retain all 2 GEN locked, and change no launch mode or credit.
- Invalid/unverifiable profile authority: revert before nondeterministic review.
- Canonical objective/policy source: contract constants and immutable assessment
  fields, never profile prose or model output.
- Workflow/entity, step/requirement, actor/subject binding: exact assessment,
  attempt, three addresses, digest, source version, and expected tier taxonomy.
- Prompt-injection boundary: fetched policy and profile are delimited untrusted
  inputs; prompts explicitly forbid following embedded instructions. Deterministic
  schema and settlement validation, not prompt wording, is the hard boundary.
- Private/unverifiable evidence excluded: files, screenshots, logs, URLs,
  claimant-hosted JSON, and claims of deployed behavior are never fetched.
- No fetched-content digest is stored in v1; therefore no stored digest can be
  mistaken for origin authentication. The leader and validator independently
  fetch the exact allowlisted rendered representation for each attempt.

### Evidence Authority Matrix

| Consequential claim/fact | Evidence/artifact | Data controller | Authoritative source/issuer | Deterministic verification | Canonical objective/entity/actor binding | Freshness/anti-replay | Semantic role after verification | Non-penalizing failure state | Consequence blocked | Required negative test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Meaning of the four policy tiers | Rendered official risk-guide page | European Commission controls origin bytes | Exact allowlisted Commission HTTPS URL | Exact scheme/host/path constant; bounded length; identity and version markers over the normalized (lowercase, whitespace-collapsed) rendered text: `shaping europe`, `unacceptable risk`, `high risk`, `transparency risk`, `minimal or no risk`, `regulation (eu) 2024/1689`. The CMS footer stamp is outside the official rendering validators fetch; the legal citation is the version anchor. | Assessment locks constant source ID/version; attempt output must repeat exact IDs | Fresh fetch per attempt; monotonic attempt ID; no alternate URL | Supply authoritative policy language for semantic classification | `RETRYABLE`, 2 GEN remains locked, no launch mode | Every credit, settlement, route/launch right, withdrawal eligibility | Serve byte-identical/valid-digest content from claimant origin or wrong path/version; prove no hard state/accounting change |
| Profile the parties agree to classify | Structured bounded profile fields and canonical digest | Sponsor authors fields; three onchain roles control approvals | Transaction sender is authority only for contractual assent, not external truth | Sponsor equals sender; immutable role addresses; deterministic digest over assessment/source/profile/deadlines; operator/steward must submit same digest | Exact assessment, source version, sponsor/operator/steward, deadlines and profile fields | One approval per role before deadline; assessment ID prevents cross-case replay | Allow only the co-ratified representation into judgment | Revert before review; no attempt or value/right mutation | Review, tier, launch mode, credit, settlement, GEN movement | Correct digest signed by wrong actor, for wrong assessment/source/role, replayed, or at/after deadline; accounting unchanged |
| Consensus tier for one attempt | Normalized leader output plus independent validator replay | Validator set; no interested actor supplies accepted output | GenLayer consensus over official fetch and locked profile | Exact assessment/source/attempt; full coverage; one allowed tier; sorted unique compatible basis codes; no extras | Expected IDs/taxonomy/value destinations loaded only from state/constants | Current monotonic attempt only; stale attempt rejected | Supply semantic tier and basis codes only | Revert before mutation or append `RETRYABLE`; no hard consequence | Every terminal state, credit, launch right, settlement, GEN movement | Shape-valid wrong assessment/source/attempt, duplicate/extra/invalid basis, tier/basis mismatch, payout instruction in rationale; no hard change |

## Consensus design

### Leader task

- Inputs: immutable structured profile, exact assessment/attempt/source IDs, and
  contract-owned tier taxonomy and priority rules.
- Fetch: render the one allowlisted Commission page as text.
- Extraction: verify objective markers and isolate relevant tier descriptions.
- Normalization: choose one tier and a sorted unique set of allowed basis codes;
  `PROHIBITED` outranks `HIGH_RISK`, which outranks `TRANSPARENCY`, then `MINIMAL`.
- Structured output: JSON with exactly `assessment_id`, `attempt_id`,
  `source_version`, `source_coverage`, `tier`, `basis_codes`, and bounded `reason`.

### Consensus-critical fields

| Field | Type/bounds | Comparison rule | Why critical |
| --- | --- | --- | --- |
| `assessment_id` | exact existing string | Exact equality | Prevents cross-assessment replay |
| `attempt_id` | exact current derived string | Exact equality | Prevents stale output reuse |
| `source_version` | constant `EC-AI-RISK-2026-08-03` | Exact equality | Prevents policy-version drift |
| `source_coverage` | `FULL` or `NONE` | Consequence requires exact `FULL` | Missing authority cannot cause harm |
| `tier` | one of five allowed enums | Semantic validator must agree on same tier | Owns launch-mode branch |
| `basis_codes` | 1-8 sorted unique allowlisted strings; empty only for retry | Exact set equality after normalization | Proves bounded policy basis and tier compatibility |
| `reason` | ASCII/UTF-8 text, max 360 chars | Non-critical; length/content sanitization only | Human explanation cannot define consequence |

Allowed basis families are fixed in source: prohibited-practice codes
(`MANIPULATION`, `VULNERABILITY_EXPLOITATION`, `SOCIAL_SCORING`,
`CRIMINAL_RISK_PREDICTION`, `FACIAL_SCRAPING`, `EMOTION_WORK_EDUCATION`,
`BIOMETRIC_SENSITIVE`, `REAL_TIME_BIOMETRIC_LAW_ENFORCEMENT`); high-risk codes
(`CRITICAL_INFRASTRUCTURE`, `EDUCATION_ACCESS`, `PRODUCT_SAFETY`, `EMPLOYMENT`,
`ESSENTIAL_SERVICES`, `LAW_ENFORCEMENT`, `MIGRATION_BORDER`,
`JUSTICE_DEMOCRACY`); transparency codes (`CHATBOT_DISCLOSURE`,
`SYNTHETIC_CONTENT`, `DEEPFAKE_LABEL`, `PUBLIC_INTEREST_TEXT`); and
`NO_LISTED_TRIGGER` for minimal risk.

### Validator

- Independently re-fetch and marker-check the same URL, then independently
  classify the same immutable profile.
- Reject non-`gl.vm.Return`, malformed JSON, extra/missing keys, wrong IDs,
  non-full source coverage for a terminal tier, unknown/duplicate/unsorted basis
  codes, wrong tier family, unsupported priority, or reason overflow.
- Agree on the meaning of the tier and exact normalized basis set, not the
  wording of `reason`.
- Source/model/parser uncertainty produces `RETRYABLE`; it never selects a
  convenient terminal tier.

### Settlement invariants

| Invariant | Deterministic rule | Invalid behavior |
| --- | --- | --- |
| Source coverage | Terminal consequence requires `FULL` and all objective markers | Append retry or revert; no hard state/value |
| Expected entity coverage | Exactly current assessment and current attempt; no entity list or extra ID | Reject before mutation |
| Accepted enums | Tier and every basis code from fixed allowlists | Reject before mutation |
| Basis/tier compatibility | Every basis belongs to selected tier family; minimal exactly `NO_LISTED_TRIGGER`; retry has no basis | Reject before mutation |
| Priority | Any supported higher-risk basis forbids a lower tier | Reject before mutation |
| Root-cause set | N/A: v1 performs no causal/root classification; any root field is an unknown extra key | Reject before mutation |
| Downstream dependency/path | N/A: v1 performs no downstream/blocked inheritance; any such field is extra | Reject before mutation |
| Consequence derivation | Contract maps tier to launch mode and recipients; model cannot name recipients/amounts | Reject unknown output keys; ignore rationale instructions |
| Value destination | Exactly 2 GEN: operator 2; operator/steward 1+1; steward 2; sponsor 2; no fee/remainder | Revert before settlement if locked amount is not exactly 2 GEN or credit key exists |

### Rationale policy

`reason` is bounded display context only. It cannot define authority, expected
IDs, a tier, payout, recipient, amount, launch mode, or settlement behavior.

## Consequence and accounting

| Verdict | Canonical state change | Consumer action | Value movement |
| --- | --- | --- | --- |
| `MINIMAL` | `FINAL_MINIMAL`, `ALLOW` | Consumer may allow under this private policy | 2 GEN operator credit |
| `TRANSPARENCY` | `FINAL_TRANSPARENCY`, `REQUIRE_DISCLOSURE` | Consumer conditions route on disclosure | 1 GEN operator + 1 GEN steward credits |
| `HIGH_RISK` | `FINAL_HIGH_RISK`, `REQUIRE_SAFEGUARDS` | Consumer conditions route on safeguard review | 2 GEN steward credit |
| `PROHIBITED` | `FINAL_PROHIBITED`, `BLOCK` | Consumer blocks route under this private policy | 2 GEN sponsor refund credit |
| `RETRYABLE` | `RETRYABLE`, `UNDECIDED` | Consumer makes no allow/block inference | No movement; 2 GEN stays locked |
| cancel/expiry | `CANCELLED` or `EXPIRED`, `UNDECIDED` | Consumer treats assessment as unresolved | 2 GEN sponsor refund credit |

- Accepted/finalized boundary: GenLayer commits the review transaction's
  validator-agreed state; frontend waits through accepted/decided and finalized
  before presenting the canonical consequence.
- Ledger invariant per assessment: `funded == locked + outstanding_credit + withdrawn`.
- Global invariant: aggregate funded equals locked + outstanding + withdrawn.
- There is no fee, slash, burn, residual, or rounding remainder.
- Withdrawal debits the internal ledger before `emit_transfer` and is proven by
  receipt, canonical zero credit, aggregate accounting, and recipient balance.
- No callback contract is present. Consumers read the owning contract directly.
- V1 has no appeal/cure because the output is a private policy classification;
  source failure retries, unresolved expiry refunds, and a later source-version
  migration is milestone scope rather than a hidden override.

## Reusable interface

### Write methods

- `create_assessment(operator, steward, system_name, purpose, affected_people,
  decision_role, ratification_deadline, review_deadline) -> str` — payable 2 GEN.
- `ratify_assessment(assessment_id, profile_digest)`.
- `request_review(assessment_id)`.
- `retry_review(assessment_id, expected_attempt)`.
- `cancel_unratified(assessment_id)`.
- `recover_expired(assessment_id)`.
- `withdraw_credit(assessment_id)`.

### View methods

- `get_assessment(assessment_id) -> str` canonical JSON.
- `get_attempt(attempt_id) -> str` canonical JSON.
- `get_credit(assessment_id, owner) -> str` canonical JSON.
- `get_assessment_count() -> int` and `get_assessment_id(index) -> str` for
  bounded discovery; frontend filters roles client-side only after canonical reads.
- `get_accounting() -> str` aggregate GEN base-unit ledger values.
- `get_profile_digest(assessment_id) -> str` for exact ratification display.

### Consumer/callback

- Authentication: no callback. Consumers authenticate the configured Tierline
  contract address and read canonical finalized state.
- Idempotency key: assessment ID plus terminal status.
- Failure/retry: consumer treats missing, nonterminal, cancelled, expired, or
  retryable state as `UNDECIDED`.
- Authorized cancellation: only the sponsor paths specified above; no consumer write.

## Threat model

| Threat | Attack | Mitigation | Test |
| --- | --- | --- | --- |
| Sponsor lies about reality | Profile omits actual behavior | Three-party ratification; scope states contractual profile only | UI/spec limitation and wrong-digest refusal |
| Wrong actor ratifies | Reuse correct digest from another wallet/case | Sender, role, case, source, digest, deadline binding | Wrong actor/object/version/replay tests |
| Source spoof | Mirror official bytes on attacker host | URL is a contract constant; no caller URL | Valid-byte wrong-origin tripwire |
| Source drift/outage | Page changes markers or disappears | Locked version marker and bounded probe; retry only | Missing/wrong marker and outage mocks |
| Prompt injection | Policy/profile text instructs payout or override | Untrusted delimiters, strict schema, contract-derived mapping | Injection attempts redefine authority/payout |
| Malicious leader | Extra recipient, amount, lower tier, duplicate basis | Independent validator plus deterministic settlement invariants | Shape-valid semantic-invalid fixtures |
| Stale verdict | Old attempt output replayed | Exact current attempt ID | Wrong/stale attempt tests |
| Frontend spoof | UI invents result or stores it locally | Canonical reads after finality; no canonical localStorage | Adapter/read reload tests |
| Double settlement | Repeat review/recovery/withdraw | State, settled flag, credit-key absence, debit first | Duplicate and accounting tests |
| Deadline bypass | Phase remains stale after time boundary | Entrypoint-local time checks | -1/equality/+1 tests with stale phase |

## Test plan

- Happy path: all four terminal tiers, split routing, cancellations, expiry,
  withdrawals, and exact canonical views.
- Unauthorized: every write with wrong caller; wrong recipient withdrawal.
- Isolation/config lock: multiple assessments cannot overwrite roles, attempts,
  source version, credits, or launch modes.
- Evidence failure: missing/malformed/oversized/wrong-origin/wrong-version page,
  contradictory marker combinations, and unavailable render.
- Malicious leader/validator: valid JSON with wrong IDs, extra keys, duplicate or
  incompatible basis, unsupported lower tier, payout/recipient prose, and invalid coverage.
- Prompt injection: profile and fetched text attempt to redefine authority,
  policy, expected IDs, success, amount, recipient, or output instructions.
- Verdict classes: prohibited, high, transparency, minimal, retry.
- Duplicate: ratification, request, retry attempt, settlement, recovery, cancel,
  credit creation, and withdrawal.
- Recovery/value safety: wrong caller/state, already terminal, locked ledger,
  no double-credit/withdraw/settle, transfer amount, zero closure.
- Temporal: boundary -1, exact boundary, +1 for create constraints,
  ratification, request/retry, cancellation and expiry, with deliberately stale phase.
- Payability metadata: creation is payable and every other public write is not.
- Receipt parser: raw Studio `consensus_data.leader_receipt[].execution_result`
  and normalized SDK shapes.
- Direct-mode assertions inspect canonical state/accounting, not only exceptions.
- Bounded Studionet smoke precedes the 2 GEN consequential lifecycle.

## Claim-to-code matrix

| Claim | Contract method/state | View/read | Test | Network evidence |
| --- | --- | --- | --- | --- |
| Three parties ratify one exact profile | create + ratify; immutable roles/digest/flags | assessment + profile digest | signer/digest/replay/isolation | create and two ratification receipts + reads |
| Validators interpret the locked official guide | request/retry nondeterministic review | attempt source/version/coverage | source mocks, semantic replay, outage | review receipt and canonical attempt |
| One canonical launch mode follows the tier | terminal phase + contract mapping | assessment launch mode | every tier and invalid mapping | finalized terminal state read |
| Exactly 2 GEN routes without remainder | creation ledger + terminal settlement | assessment credit + global accounting | all branches and invariant rejection | balances, credits, zero locked proof |
| Retry never penalizes | `RETRYABLE`, locked unchanged | assessment/attempt/accounting | source/output/auth failures | retryable receipt and unchanged accounting |
| Expiry cannot orphan value | cancel/recover sponsor credit | assessment/credit/accounting | time boundaries and duplicates | recovery, withdrawal, zero closure |
| Frontend performs the full role-gated lifecycle | all writes via real SDK adapter | all canonical views after finality | frontend adapter, action, provider, finality tests | browser wallet + browser-local RPC evidence |
| Result is not legal compliance or real-system proof | no such method/state | Methodology and limitation copy | claim/language scan | README/UI/live-app review |

## Analogue and differentiation matrix

| Analogue/prior idea | Similar dimensions | Structural difference | Collision decision |
| --- | --- | --- | --- |
| SemanticPolicyQuorum | Multi-party qualitative policy judgment and right grant | Multiple private constraints authorize one execution; Tierline uses one official versioned authority, tri-party profile assent, four persistent launch modes, and budget routing | Distinct |
| Tariff Classification Bond | Official policy text, semantic classification, GEN reserve | Binary adversarial challenge; Tierline has no challenger and derives four multi-recipient branches from co-ratification | Distinct |
| VexConcord | Opposed actors, official evidence, canonical status | Bilateral vulnerability applicability; Tierline is tri-party AI governance with no side-selected verdict | Distinct |
| GrantLattice | Rights affected by semantic judgment | Capability graph attenuation; Tierline has no delegation graph and owns funded policy-tier routing | Distinct |
| Legacy generic compliance oracle | Policy prompt and pass/fail output | Tierline has fixed authority/version, exact actors, state machine, direct launch rights, closed value destinations, recovery, and reuse views | Reject analogue; not duplicated |

## Deployment and evidence plan

- Network: Studionet only; never label it testnet or mix evidence.
- Actors: authorized existing sponsor EOA plus distinct operator and steward EOAs
  only when safely available and authorized; keys remain ignored/local.
- Deploy: lint/check, safe configuration discovery, network/status check,
  idempotent inspect, source-commit identity, deploy, verify execution success,
  schema/code, then archive allowlisted receipt fields.
- Consequential lifecycle: create with 2 GEN; both roles ratify; review one real
  bounded profile; wait accepted/finalized; read launch mode/credit; withdraw;
  prove exact ledger and balance delta. If the real source yields retry, exercise
  retry or expiry recovery honestly rather than inventing a terminal tier.
- Evidence path: `docs/evidence/studionet/` with active `deployment.json`, safe
  transaction summaries, canonical snapshots, and browser evidence; superseded
  revisions archived with status/reason.
- Resume/idempotency: scripts inspect canonical deployment/case/attempt/credit
  state before every write and never replay ambiguous transactions.

## Definition of Done

### Intelligent Contract core

- [ ] Reusable primitive with semantic validator judgment and direct consequence.
- [ ] One ASCII contract with correct pinned header and exactly one visible `gl.Contract` class.
- [ ] Adversarial direct tests and clean GenVM lint.
- [ ] Real Studionet lifecycle and canonical evidence.

### Projects

- [ ] Real frontend wallet writes for every claimed lifecycle action.
- [ ] Submitted, accepted/decided, finalized, failed, and retry UI handling.
- [ ] Canonical reads and reload after finality.
- [ ] Meaningful launch-mode and value outcome.
- [ ] Browser-local RPC/CORS and browser-wallet lifecycle evidence.
- [ ] Every claimed action has wrapper, control, test, finality, and reload.
- [ ] Primary UI remains user-facing; system/reviewer details stay contextual.

## Kill criteria

- Official Commission source cannot be fetched and bounded reliably in GenVM.
- Current runner cannot produce stable semantic agreement on real examples.
- Any actor-controlled bytes can open a hard consequence without the locked
  origin/sender bindings above.
- Tier/basis settlement invariants cannot fail closed before rights/value mutate.
- Browser wallet path cannot use a selected EVM provider with separate IC reads.
- 2 GEN can become orphaned or double-credited in any terminal/recovery branch.

## Honest limitations

- No contract is deployed yet; no Studionet verdict, credit, or browser write is claimed.
- Until Phase 7, the application presents contract reads/writes as unavailable,
  not simulated.
- The official policy source probe is local design evidence only; it is not a
  GenVM or Studionet consensus result.
- The model judges a co-ratified representation, not a live AI system.
- Policy categories can evolve; v1 deliberately locks one source-version marker
  rather than silently changing prior assessments.
