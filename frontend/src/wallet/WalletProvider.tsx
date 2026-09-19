import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { DetectedWallet, Eip1193Provider } from "./types";
import {
  asValidatedAddress,
  ensureStudionet,
  setActiveWalletSession,
} from "./session";

type WalletContextValue = {
  wallets: DetectedWallet[];
  account: string;
  selectedWallet: DetectedWallet | null;
  isModalOpen: boolean;
  error: string;
  openModal: () => void;
  closeModal: () => void;
  connect: (wallet: DetectedWallet) => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function fallbackName(provider: Eip1193Provider, index: number) {
  if (provider.isRabby) return "Rabby";
  if (provider.isCoinbaseWallet) return "Coinbase Wallet";
  if (provider.isBraveWallet) return "Brave Wallet";
  if (provider.isMetaMask) return "MetaMask-compatible wallet";
  return index === 0 ? "Injected wallet" : `Injected wallet ${index + 1}`;
}

function collectFallbackWallets(): DetectedWallet[] {
  const candidates: Eip1193Provider[] = [];
  const add = (provider?: Eip1193Provider) => {
    if (provider && !candidates.includes(provider)) candidates.push(provider);
  };

  window.ethereum?.providers?.forEach(add);
  add(window.ethereum);
  add(window.okxwallet);
  add(window.rabby);
  add(window.coinbaseWalletExtension);

  return candidates.map((provider, index) => ({
    info: {
      uuid: `injected-${index}`,
      name: fallbackName(provider, index),
      rdns: "injected.browser",
    },
    provider,
  }));
}

export function WalletProvider({ children }: PropsWithChildren) {
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);
  const [account, setAccount] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<DetectedWallet | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const announced = new Map<string, DetectedWallet>();
    const addWallet = (wallet: DetectedWallet) => {
      const key = wallet.info.rdns || wallet.info.uuid;
      announced.set(key, wallet);
      const combined = [...announced.values(), ...collectFallbackWallets()];
      const unique = new Map<string, DetectedWallet>();
      combined.forEach((item) => {
        const identity = item.info.rdns || item.info.uuid;
        if (!unique.has(identity)) unique.set(identity, item);
      });
      setWallets([...unique.values()]);
    };

    const onAnnouncement = (event: WindowEventMap["eip6963:announceProvider"]) =>
      addWallet(event.detail);

    window.addEventListener("eip6963:announceProvider", onAnnouncement);
    collectFallbackWallets().forEach(addWallet);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () =>
      window.removeEventListener("eip6963:announceProvider", onAnnouncement);
  }, []);

  const disconnect = useCallback(() => {
    setActiveWalletSession(null);
    setAccount("");
    setSelectedWallet(null);
    setError("");
  }, []);

  const connect = useCallback(async (wallet: DetectedWallet) => {
    setError("");
    try {
      const result = await wallet.provider.request({ method: "eth_requestAccounts" });
      const accounts = Array.isArray(result) ? result : [];
      const nextAccount = typeof accounts[0] === "string" ? accounts[0] : "";
      if (!/^0x[a-fA-F0-9]{40}$/.test(nextAccount)) {
        throw new Error("The wallet did not return a valid EVM address.");
      }
      await ensureStudionet(wallet.provider);
      setActiveWalletSession({ account: asValidatedAddress(nextAccount), provider: wallet.provider });
      setSelectedWallet(wallet);
      setAccount(nextAccount);
      setModalOpen(false);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Wallet connection was declined.";
      setError(message);
    }
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      wallets,
      account,
      selectedWallet,
      isModalOpen,
      error,
      openModal: () => setModalOpen(true),
      closeModal: () => setModalOpen(false),
      connect,
      disconnect,
    }),
    [wallets, account, selectedWallet, isModalOpen, error, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
}

