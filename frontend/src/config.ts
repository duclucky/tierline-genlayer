export const appConfig = {
  network: import.meta.env.VITE_GENLAYER_NETWORK || "studio-dev",
  contractAddress: import.meta.env.VITE_GENLAYER_CONTRACT_ADDRESS || "",
  icRpcUrl: import.meta.env.VITE_GENLAYER_IC_RPC_URL || "",
} as const;

export const isContractConfigured = /^0x[a-fA-F0-9]{40}$/.test(
  appConfig.contractAddress,
);
