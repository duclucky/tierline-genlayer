import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { WalletProvider } from "./wallet/WalletProvider";

function renderApp(path = "/") {
  return render(<MemoryRouter initialEntries={[path]}><WalletProvider><App /></WalletProvider></MemoryRouter>);
}

describe("Tierline product shell", () => {
  it("renders the honest landing promise and persistent navigation", () => {
    renderApp();
    expect(screen.getByRole("heading", { name: /agree on the facts/i })).toBeInTheDocument();
    expect(screen.getByText(/not legal advice/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Assessments" }).length).toBeGreaterThan(0);
  });

  it("keeps canonical assessment state honest when no contract exists", () => {
    renderApp("/assessments");
    expect(screen.getByText(/no deployed contract address is configured/i)).toBeInTheDocument();
    expect(screen.getByText(/connect to find your assessments/i)).toBeInTheDocument();
  });

  it("supports the multi-step assessment journey without simulating submission", async () => {
    const user = userEvent.setup();
    renderApp("/assessments/new");
    expect(screen.getByRole("heading", { name: "New assessment" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/complete the highlighted fields/i);
    expect(screen.getByRole("group", { name: /who must agree/i })).toBeInTheDocument();
  });

  it("opens an explicit provider chooser instead of auto-picking a wallet", async () => {
    const user = userEvent.setup();
    renderApp("/settings");
    await user.click(screen.getAllByRole("button", { name: /choose a wallet/i })[0]);
    expect(screen.getByRole("dialog", { name: /choose a wallet/i })).toBeInTheDocument();
    expect(screen.getByText(/no evm wallet detected/i)).toBeInTheDocument();
  });
});
