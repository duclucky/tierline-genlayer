import { createContractAdapter, type TierlineAdapter } from "./adapter";

// Shared adapter instance. Pages read canonical state and submit wallet
// writes through this single boundary; tests replace it via vi.mock.
export const adapter: TierlineAdapter = createContractAdapter();
