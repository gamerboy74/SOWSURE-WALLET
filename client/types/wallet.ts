import { BrowserProvider, JsonRpcSigner } from 'ethers';

export async function connectWallet(): Promise<{ address: string; signer: JsonRpcSigner }> {
  if (!window.ethereum) {
    throw new Error('Please install MetaMask to connect your wallet');
  }

  try {
    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    return { address, signer };
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
}