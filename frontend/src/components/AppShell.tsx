import {
  BookOpen,
  CirclesThreePlus,
  GearSix,
  House,
  ListChecks,
  Wallet,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { appConfig, isContractConfigured } from "../config";
import { useWallet } from "../wallet/WalletProvider";
import { WalletModal } from "./WalletModal";

const navigation = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/assessments", label: "Assessments", icon: ListChecks },
  { to: "/credits", label: "Credits", icon: Wallet },
  { to: "/methodology", label: "Method", icon: BookOpen },
  { to: "/settings", label: "Settings", icon: GearSix },
];

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function AppShell() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const { account, selectedWallet, openModal, disconnect } = useWallet();

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="sidebar" aria-label="Primary navigation">
        <NavLink className="brand" to="/" aria-label="Tierline home">
          <span className="brand-mark"><CirclesThreePlus weight="bold" aria-hidden="true" /></span>
          <span><strong>Tierline</strong><small>AI launch routing</small></span>
        </NavLink>
        <nav className="nav-list">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="network-dot" aria-hidden="true" />
          <span><strong>{appConfig.network}</strong><small>{isContractConfigured ? "Contract configured" : "Contract not deployed"}</small></span>
        </div>
      </aside>

      <div className="app-column">
        <header className="topbar">
          <NavLink className="mobile-brand" to="/">Tierline</NavLink>
          <span className="network-chip"><span aria-hidden="true" />{appConfig.network}</span>
          <div className="account-area">
            {account ? (
              <>
                <button className="account-button" onClick={() => setAccountOpen((value) => !value)} aria-expanded={accountOpen}>
                  <span className="account-identicon" aria-hidden="true" />
                  <span>{shortAddress(account)}</span>
                </button>
                {accountOpen && (
                  <div className="account-menu">
                    <strong>{selectedWallet?.info.name || "Connected wallet"}</strong>
                    <span className="mono">{account}</span>
                    <button className="text-button danger-text" onClick={() => { disconnect(); setAccountOpen(false); }}>Disconnect</button>
                  </div>
                )}
              </>
            ) : (
              <button className="button secondary compact" onClick={openModal}>Connect wallet</button>
            )}
          </div>
        </header>

        {!isContractConfigured && (
          <div className="configuration-banner" role="status">
            <strong>Preview mode:</strong> no deployed contract address is configured. Canonical reads and writes remain unavailable.
          </div>
        )}

        <main id="main-content" className="main-content" ref={mainRef} tabIndex={-1}>
          <Outlet />
        </main>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? "active" : ""}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <WalletModal />
    </div>
  );
}

