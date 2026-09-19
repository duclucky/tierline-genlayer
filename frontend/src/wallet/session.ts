import { studioDevnet } from "genlayer-js/chains";
import type { Address } from "viem";
import type { Eip1193Provider } from "./types";

// Wallet-compatible Studio-dev chain parameters, derived from the SDK chain
// object (id and RPC read at runtime, never hardcoded).
export const STUDIO_DEV_WALLET_CHAIN = {
  chainId: `0x${studioDevnet.id.toString(16)}`,
  chainName: studioDevnet.name,
  rpcUrls: [studioDevnet.rpcUrls.default.http[0]],
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
} as const;

export interface ActiveWalletSession {
  account: Address;
  provider: Eip1193Provider;
}

let activeSession: ActiveWalletSession | null = null;

export function getActiveWalletSession(): ActiveWalletSession | null {
  return activeSession;
}

export function setActiveWalletSession(session: ActiveWalletSession | null): void {
  activeSession = session;
}

export function asValidatedAddress(value: string): Address {
  // Callers validate the 0x-40-hex shape before invoking this cast.
  return value as Address;
}

export async function ensureStudioDevnet(provider: Eip1193Provider): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIO_DEV_WALLET_CHAIN.chainId }],
    });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? Number((error as { code: unknown }).code)
        : null;
    if (code !== 4902 && code !== -32603) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [STUDIO_DEV_WALLET_CHAIN],
    });
  }
  const activeChainId = await provider.request({ method: "eth_chainId" });
  if (String(activeChainId).toLowerCase() !== STUDIO_DEV_WALLET_CHAIN.chainId.toLowerCase()) {
    throw new Error(
      `The wallet is on chain ${String(activeChainId)}. Switch to GenLayer Studio-dev (${studioDevnet.id}) before signing.`,
    );
  }
}
