import { studionet } from "genlayer-js/chains";
import type { Address } from "viem";
import type { Eip1193Provider } from "./types";

// Wallet-compatible Studionet chain parameters, derived from the SDK chain
// object (id read at runtime, never hardcoded).
export const STUDIONET_WALLET_CHAIN = {
  chainId: `0x${studionet.id.toString(16)}`,
  chainName: "GenLayer Studionet",
  rpcUrls: ["https://studio.genlayer.com/api"],
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

export async function ensureStudionet(provider: Eip1193Provider): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIONET_WALLET_CHAIN.chainId }],
    });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? Number((error as { code: unknown }).code)
        : null;
    if (code !== 4902 && code !== -32603) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [STUDIONET_WALLET_CHAIN],
    });
  }
  const activeChainId = await provider.request({ method: "eth_chainId" });
  if (String(activeChainId).toLowerCase() !== STUDIONET_WALLET_CHAIN.chainId.toLowerCase()) {
    throw new Error(
      `The wallet is on chain ${String(activeChainId)}. Switch to GenLayer Studionet (${studionet.id}) before signing.`,
    );
  }
}
