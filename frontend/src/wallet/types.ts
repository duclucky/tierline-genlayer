export type RequestArguments = {
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

export type Eip1193Provider = {
  request: (args: RequestArguments) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isRabby?: boolean;
  isCoinbaseWallet?: boolean;
  isBraveWallet?: boolean;
};

export type WalletInfo = {
  uuid: string;
  name: string;
  icon?: string;
  rdns?: string;
};

export type DetectedWallet = {
  info: WalletInfo;
  provider: Eip1193Provider;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider & { providers?: Eip1193Provider[] };
    okxwallet?: Eip1193Provider;
    rabby?: Eip1193Provider;
    coinbaseWalletExtension?: Eip1193Provider;
  }

  interface WindowEventMap {
    "eip6963:announceProvider": CustomEvent<{
      info: WalletInfo;
      provider: Eip1193Provider;
    }>;
  }
}

