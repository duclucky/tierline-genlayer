import { Moon, Plug, Sun } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { appConfig, isContractConfigured } from "../config";
import { useWallet } from "../wallet/WalletProvider";

type Theme = "light" | "dark";

export function SettingsPage() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("tierline-theme") === "dark" ? "dark" : "light"));
  const { account, selectedWallet, openModal, disconnect } = useWallet();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("tierline-theme", theme);
  }, [theme]);

  return (
    <div>
      <PageHeader eyebrow="Preferences" title="Settings" description="Manage this browser’s wallet session and harmless display preferences." />
      <div className="settings-stack">
        <section className="settings-card"><div><span className="settings-icon"><Plug aria-hidden="true" /></span><h2>Wallet</h2><p>{account ? `Connected through ${selectedWallet?.info.name || "an EVM provider"}.` : "No wallet is connected."}</p>{account && <span className="mono wrapped">{account}</span>}</div><div>{account ? <button className="button danger-outline" onClick={disconnect}>Disconnect</button> : <button className="button secondary" onClick={openModal}>Choose a wallet</button>}</div></section>
        <section className="settings-card"><div><span className="settings-icon">{theme === "light" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</span><h2>Appearance</h2><p>Theme is the only preference Tierline stores locally. Wallet and contract state are never stored here.</p></div><div className="segmented" aria-label="Theme"><button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")} aria-pressed={theme === "light"}>Light</button><button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")} aria-pressed={theme === "dark"}>Dark</button></div></section>
        <section className="settings-card"><div><span className="settings-label">Network</span><h2>{appConfig.network}</h2><p>Wallet writes will use the selected EVM provider. Intelligent Contract reads use the configured GenLayer IC RPC path.</p></div><dl><div><dt>Contract</dt><dd>{isContractConfigured ? "Configured" : "Not deployed"}</dd></div><div><dt>Read path</dt><dd>{appConfig.icRpcUrl ? "Configured" : "Not configured"}</dd></div></dl></section>
      </div>
    </div>
  );
}

