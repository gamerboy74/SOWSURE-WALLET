import { BrowserProvider, JsonRpcSigner } from "ethers";

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (request: { method: string; params?: Array<any> }) => Promise<any>;
      on?: (...args: any[]) => void;
      removeListener?: (...args: any[]) => void;
      providers?: any[];
      selectedAddress?: string;
      networkVersion?: string;
    };
  }
}

export async function connectWallet(): Promise<{
  address: string;
  signer: JsonRpcSigner;
}> {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask to connect your wallet");
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    localStorage.setItem("walletAddress", address);

    return { address, signer };
  } catch (error) {
    localStorage.removeItem("walletAddress");
    console.error("Error connecting wallet:", error);
    throw error;
  }
}

export async function disconnectWallet(): Promise<void> {
  try {
    if (!window.ethereum) return;

    // Clear local storage
    localStorage.removeItem("walletAddress");

    // Attempt to revoke permissions from MetaMask
    if (window.ethereum.request) {
      try {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (revokeError) {
        console.warn("wallet_revokePermissions not supported:", revokeError);
      }
    }
  } catch (error) {
    console.error("Error disconnecting wallet:", error);
  }
}