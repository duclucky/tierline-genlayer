// Canonical contract states mapped to user-facing language without changing
// their meaning (FE-SURFACE). Raw enums stay available behind the technical
// details disclosure on the assessment detail route.

const PHASE_LABELS: Record<string, string> = {
  AWAITING_RATIFICATION: "Waiting for profile approval",
  READY_FOR_REVIEW: "Ready for neutral review",
  RETRYABLE: "Source could not be verified",
  FINAL_MINIMAL: "Launch allowed under this policy",
  FINAL_TRANSPARENCY: "Disclosure required before launch",
  FINAL_HIGH_RISK: "Safeguard review required",
  FINAL_PROHIBITED: "Launch blocked under this policy",
  CANCELLED: "Cancelled before ratification",
  EXPIRED: "Review window ended",
};

const LAUNCH_LABELS: Record<string, string> = {
  ALLOW: "Launch allowed",
  REQUIRE_DISCLOSURE: "Launch requires disclosure",
  REQUIRE_SAFEGUARDS: "Launch requires safeguards",
  BLOCK: "Launch blocked",
  UNDECIDED: "Undecided",
};

const TIER_LABELS: Record<string, string> = {
  PROHIBITED: "Prohibited practice",
  HIGH_RISK: "High risk",
  TRANSPARENCY: "Transparency obligation",
  MINIMAL: "Minimal or no risk",
  RETRYABLE: "Not yet classified",
};

const TIER_TONES: Record<string, string> = {
  FINAL_MINIMAL: "positive",
  FINAL_TRANSPARENCY: "attention",
  FINAL_HIGH_RISK: "attention",
  FINAL_PROHIBITED: "negative",
  RETRYABLE: "attention",
  AWAITING_RATIFICATION: "neutral",
  READY_FOR_REVIEW: "neutral",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
};

export function phaseLabel(phase: string): string {
  return PHASE_LABELS[phase] ?? "Unknown status";
}

export function launchModeLabel(launchMode: string): string {
  return LAUNCH_LABELS[launchMode] ?? "Undecided";
}

export function tierLabel(tier: string): string {
  return TIER_LABELS[tier] ?? tier;
}

export function phaseTone(phase: string): string {
  return TIER_TONES[phase] ?? "neutral";
}

export function explorerAddressUrl(address: string): string {
  return `https://explorer-studio.genlayer.com/address/${address}`;
}

export function explorerTransactionUrl(hash: string): string {
  return `https://explorer-studio.genlayer.com/transaction/${hash}`;
}

export function shortHex(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}
