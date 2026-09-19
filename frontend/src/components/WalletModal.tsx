import { Wallet, X } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { useWallet } from "../wallet/WalletProvider";

export function WalletModal() {
  const { wallets, isModalOpen, closeModal, connect, error } = useWallet();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isModalOpen) return;
    const prior = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      prior?.focus();
    };
  }, [isModalOpen, closeModal]);

  if (!isModalOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={closeModal}>
      <section
        aria-labelledby="wallet-dialog-title"
        aria-modal="true"
        className="wallet-modal"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button ref={closeRef} className="icon-button modal-close" onClick={closeModal} aria-label="Close wallet selector">
          <X aria-hidden="true" />
        </button>
        <span className="eyebrow">Wallet connection</span>
        <h2 id="wallet-dialog-title">Choose a wallet</h2>
        <p>
          Tierline scans this browser for compatible EVM wallet providers. You decide which provider to connect.
        </p>
        {error && <div className="inline-alert danger" role="alert">{error}</div>}
        <div className="wallet-list">
          {wallets.length > 0 ? (
            wallets.map((wallet) => (
              <button className="wallet-option" key={wallet.info.uuid} onClick={() => void connect(wallet)}>
                {wallet.info.icon ? (
                  <img src={wallet.info.icon} alt="" width="32" height="32" />
                ) : (
                  <span className="wallet-glyph"><Wallet aria-hidden="true" /></span>
                )}
                <span>
                  <strong>{wallet.info.name}</strong>
                  <small>{wallet.info.rdns || "Injected provider"}</small>
                </span>
              </button>
            ))
          ) : (
            <div className="empty-compact">
              <strong>No EVM wallet detected</strong>
              <p>Install or enable a compatible browser wallet, then reopen this selector.</p>
            </div>
          )}
        </div>
        <p className="fine-print">Tierline never receives or stores your private key.</p>
      </section>
    </div>
  );
}

