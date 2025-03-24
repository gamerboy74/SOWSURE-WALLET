// services/wallet.service.ts
import { supabase } from "../lib/supabase";
import type { WalletTransaction } from "../types/types";
import { Wallet, ethers, JsonRpcProvider, WebSocketProvider, TransactionResponse, Contract } from "ethers";
import * as CryptoJS from "crypto-js";
import EventEmitter from "eventemitter3";

// USDT contract details for Sepolia
const USDT_CONTRACT_ADDRESS = "0xd16B472C1b3AB8bc40C1321D7b33dB857e823f01"; // Updated address
const USDT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "allowance", "type": "uint256" },
      { "internalType": "uint256", "name": "needed", "type": "uint256" }
    ],
    "name": "ERC20InsufficientAllowance",
    "type": "error"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "sender", "type": "address" },
      { "internalType": "uint256", "name": "balance", "type": "uint256" },
      { "internalType": "uint256", "name": "needed", "type": "uint256" }
    ],
    "name": "ERC20InsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [{ "internalType": "address", "name": "approver", "type": "address" }],
    "name": "ERC20InvalidApprover",
    "type": "error"
  },
  {
    "inputs": [{ "internalType": "address", "name": "receiver", "type": "address" }],
    "name": "ERC20InvalidReceiver",
    "type": "error"
  },
  {
    "inputs": [{ "internalType": "address", "name": "sender", "type": "address" }],
    "name": "ERC20InvalidSender",
    "type": "error"
  },
  {
    "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }],
    "name": "ERC20InvalidSpender",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "spender", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "transferFrom",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Define a type alias for the USDT contract
type USDTContract = Omit<Contract, "transfer" | "balanceOf" | "decimals"> & {
  balanceOf(address: string): Promise<ethers.BigNumberish>;
  transfer(to: string, value: ethers.BigNumberish): Promise<TransactionResponse>;
  decimals(): Promise<number>;
};

// Type the contract instance
export class WalletService {
  private static TESTNET_RPC_URL = import.meta.env.VITE_PUBLIC_ALCHEMY_RPC_URL;
  private static TESTNET_WS_URL = import.meta.env.VITE_PUBLIC_ALCHEMY_WS_URL;
  private static ENCRYPTION_KEY = import.meta.env.VITE_WALLET_ENCRYPTION_KEY;
  public static provider = new JsonRpcProvider(WalletService.TESTNET_RPC_URL);
  private static wsProvider: WebSocketProvider | null = null;
  private static usdtContract: USDTContract = new Contract(
    USDT_CONTRACT_ADDRESS,
    USDT_ABI,
    WalletService.provider
  ) as unknown as USDTContract;
  private static eventEmitter = new EventEmitter();
  private static processedTxHashes: Set<string> = new Set();
  private static usdtDecimals: number | null = null;

  // Initialize USDT decimals on startup
  static async initialize() {
    try {
      this.usdtDecimals = await this.usdtContract.decimals();
      console.log(`USDT contract decimals: ${this.usdtDecimals}`);
    } catch (error) {
      console.error("Error fetching USDT decimals, defaulting to 6:", error);
      this.usdtDecimals = 6; // Fallback to 6 if fetching fails
    }
  }

  static subscribeToBalanceUpdates(
    address: string,
    callback: (balance: { eth: string; usdt: string }) => void
  ) {
    this.eventEmitter.on(`balance:${address}`, callback);
    return () => this.eventEmitter.off(`balance:${address}`, callback);
  }

  static subscribeToTransactions(walletId: string, callback: (tx: WalletTransaction) => void) {
    this.eventEmitter.on(`transaction:${walletId}`, callback);
    return () => this.eventEmitter.off(`transaction:${walletId}`, callback);
  }

  static async startTransactionListener(walletId: string, address: string): Promise<() => void> {
    if (!this.TESTNET_WS_URL) {
      console.error("WebSocket URL not configured in environment variables");
      return () => {};
    }

    if (!this.wsProvider) {
      this.wsProvider = new WebSocketProvider(this.TESTNET_WS_URL);
    }

    const ethListener = async (txHash: string) => {
      try {
        if (this.processedTxHashes.has(txHash)) {
          console.log(`Skipping already processed ETH txHash: ${txHash}`);
          return;
        }

        const tx = await this.wsProvider!.getTransaction(txHash);
        if (!tx) {
          console.log(`No transaction found for txHash: ${txHash}`);
          return;
        }

        const addressLower = address.toLowerCase();
        if (tx.from.toLowerCase() === addressLower || tx.to?.toLowerCase() === addressLower) {
          const { data: existingTx } = await supabase
            .from("wallet_transactions")
            .select("*")
            .eq("wallet_id", walletId)
            .eq("metadata->>txHash", tx.hash)
            .single();

          if (existingTx) {
            console.log(`ETH transaction already exists in DB: ${tx.hash}`);
            this.processedTxHashes.add(tx.hash);
            return;
          }

          this.processedTxHashes.add(tx.hash);
          console.log(`Processing new ETH transaction: ${tx.hash}`);

          const isReceived = tx.to?.toLowerCase() === addressLower;
          const value = parseFloat(ethers.formatEther(tx.value));

          const newTx = await this.createTransaction(
            walletId,
            value,
            isReceived ? "DEPOSIT" : "WITHDRAWAL",
            {
              txHash: tx.hash,
              fromAddress: tx.from,
              toAddress: tx.to || "",
              network: "sepolia",
              tokenType: "ETH",
            }
          );

          console.log("Emitting new ETH transaction from WebSocket:", newTx);
          this.eventEmitter.emit(`transaction:${walletId}`, newTx);

          const receipt = await this.wsProvider!.waitForTransaction(tx.hash);
          if (receipt?.status === 1) {
            const { data: currentTx } = await supabase
              .from("wallet_transactions")
              .select("*")
              .eq("metadata->>txHash", tx.hash)
              .single();

            if (currentTx && currentTx.status !== "COMPLETED") {
              await supabase
                .from("wallet_transactions")
                .update({ status: "COMPLETED" })
                .eq("id", currentTx.id);
              const updatedTx = { ...currentTx, status: "COMPLETED" };
              console.log("Emitting ETH status update from WebSocket:", updatedTx);
              this.eventEmitter.emit(`transaction:${walletId}`, updatedTx);
            }
          }
        }
      } catch (error) {
        console.error("Error processing ETH WebSocket transaction:", error);
      }
    };

    const usdtListener = async (from: string, to: string, value: ethers.BigNumberish, event: ethers.EventLog) => {
      try {
        const addressLower = address.toLowerCase();
        if (from.toLowerCase() === addressLower || to.toLowerCase() === addressLower) {
          const txHash = event.transactionHash;
          const { data: existingTx } = await supabase
            .from("wallet_transactions")
            .select("*")
            .eq("wallet_id", walletId)
            .eq("metadata->>txHash", txHash)
            .single();

          if (existingTx) {
            console.log(`USDT transaction already exists in DB: ${txHash}`);
            return;
          }

          const decimals = this.usdtDecimals || 6;
          const amount = parseFloat(ethers.formatUnits(value, decimals));
          const type = from.toLowerCase() === addressLower ? "WITHDRAWAL" : "DEPOSIT";

          const newTx = await this.createTransaction(
            walletId,
            amount,
            type,
            {
              txHash,
              fromAddress: from,
              toAddress: to,
              network: "sepolia",
              tokenType: "USDT",
            }
          );

          await supabase.from("wallet_transactions").update({ status: "COMPLETED" }).eq("id", newTx.id);
          console.log("Emitting new USDT transaction from WebSocket:", newTx);
          this.eventEmitter.emit(`transaction:${walletId}`, { ...newTx, status: "COMPLETED" });

          const usdtBalance = await this.getUsdtBalance(address);
          await supabase
            .from("wallets")
            .update({ token_balance: parseFloat(usdtBalance) })
            .eq("wallet_address", address);
          this.eventEmitter.emit(`balance:${address}`, {
            eth: ethers.formatEther(await this.provider.getBalance(address)),
            usdt: usdtBalance,
          });
        }
      } catch (error) {
        console.error("Error processing USDT WebSocket transaction:", error);
      }
    };

    this.wsProvider.on("pending", ethListener);
    this.usdtContract.on("Transfer", usdtListener);

    return () => {
      if (this.wsProvider) {
        this.wsProvider.off("pending", ethListener);
        this.usdtContract.off("Transfer", usdtListener);
        if (!this.wsProvider.listenerCount("pending")) {
          this.wsProvider.destroy();
          this.wsProvider = null;
          this.processedTxHashes.clear();
        }
      }
    };
  }

  static async getWalletBalance(addressOrUserId: string, type: "onchain" | "token" = "token") {
    try {
      if (type === "onchain") {
        const balance = await this.provider.getBalance(addressOrUserId);
        const formattedBalance = ethers.formatEther(balance);
        this.eventEmitter.emit(`balance:${addressOrUserId}`, { eth: formattedBalance, usdt: null });
        return { balance: formattedBalance, type: "ETH" };
      } else {
        const usdtBalance = await this.getUsdtBalance(addressOrUserId);
        return { balance: parseFloat(usdtBalance), type: "USDT" };
      }
    } catch (error) {
      console.error("Error getting balance:", error);
      throw error;
    }
  }

  static async getUsdtBalance(address: string): Promise<string> {
    try {
      const balance = await this.usdtContract.balanceOf(address);
      const decimals = this.usdtDecimals || 6;
      const formattedBalance = ethers.formatUnits(balance, decimals);
      await supabase
        .from("wallets")
        .update({ token_balance: parseFloat(formattedBalance) })
        .eq("wallet_address", address);
      this.eventEmitter.emit(`balance:${address}`, {
        eth: ethers.formatEther(await this.provider.getBalance(address)),
        usdt: formattedBalance,
      });
      return formattedBalance;
    } catch (error) {
      console.error("Error fetching USDT balance:", error);
      return "0";
    }
  }

  static async createTransaction(
    walletId: string,
    amount: number,
    type: WalletTransaction["type"],
    metadata?: WalletTransaction["metadata"]
  ): Promise<WalletTransaction> {
    if (metadata?.txHash) {
      const { data: existingTx } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", walletId)
        .eq("metadata->>txHash", metadata.txHash)
        .single();

      if (existingTx) {
        console.log(`Transaction already exists for txHash: ${metadata.txHash}`);
        return existingTx;
      }
    }

    const { data, error } = await supabase
      .from("wallet_transactions")
      .insert({
        wallet_id: walletId,
        amount,
        type,
        status: "PENDING",
        metadata,
        created_at: new Date().toISOString(),
        token_type: metadata?.tokenType || "USDT",
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to create transaction");

    this.eventEmitter.emit(`transaction:${walletId}`, data);
    return data;
  }

  static async getTransactionHistory(walletId: string, limit?: number): Promise<WalletTransaction[]> {
    try {
      if (!walletId) throw new Error("Invalid wallet ID provided");

      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("id, wallet_address")
        .eq("id", walletId)
        .single();

      if (walletError) throw walletError;
      if (!wallet?.wallet_address) throw new Error("Wallet not found or missing address");

      let query = supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", walletId)
        .order("created_at", { ascending: false });

      if (limit !== undefined) {
        query = query.limit(limit);
      }

      const { data: transactions, error: finalError } = await query;

      if (finalError) throw finalError;

      const updatedTransactions = await Promise.all(
        (transactions || []).map(async (tx) => {
          if (tx.status === "PENDING" && tx.metadata?.txHash) {
            const receipt = await this.provider.getTransactionReceipt(tx.metadata.txHash);
            if (receipt?.status === 1) {
              await supabase
                .from("wallet_transactions")
                .update({ status: "COMPLETED" })
                .eq("id", tx.id);
              return { ...tx, status: "COMPLETED" };
            }
          }
          return tx;
        })
      );

      return updatedTransactions;
    } catch (error) {
      console.error("Error getting transaction history:", error);
      throw error;
    }
  }

  static async transferTokens(
    fromWalletId: string,
    toAddress: string,
    amount: number | string,
    isEth: boolean = false
  ): Promise<{ txHash?: string; message: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const walletInfo = await this.getWalletInfo();
      if (!walletInfo?.privateKey) throw new Error("No wallet found");

      const amountString = amount.toString();

      if (isEth) {
        const tx = await this.sendTransaction(walletInfo.privateKey, toAddress, amountString);
        return { txHash: tx.hash, message: "ETH transfer initiated" };
      } else {
        const wallet = new Wallet(walletInfo.privateKey, this.provider);
        const usdtContractWithSigner = this.usdtContract.connect(wallet) as unknown as USDTContract;
        const tx = await usdtContractWithSigner.transfer(toAddress, ethers.parseUnits(amountString, this.usdtDecimals || 6));

        const newTx = await this.createTransaction(
          fromWalletId,
          parseFloat(amountString),
          "WITHDRAWAL",
          {
            txHash: tx.hash,
            toAddress,
            note: "USDT Transfer",
            network: "sepolia",
            tokenType: "USDT",
          }
        );

        const receipt = await tx.wait();
        if (receipt && receipt.status === 1) {
          await supabase.from("wallet_transactions").update({ status: "COMPLETED" }).eq("id", newTx.id);
          const updatedTx = { ...newTx, status: "COMPLETED" };
          console.log("Emitting USDT transfer:", updatedTx);
          this.eventEmitter.emit(`transaction:${fromWalletId}`, updatedTx);

          const usdtBalance = await this.getUsdtBalance(walletInfo.address);
          await supabase
            .from("wallets")
            .update({ token_balance: parseFloat(usdtBalance) })
            .eq("wallet_address", walletInfo.address);
        }

        return { txHash: tx.hash, message: "USDT transfer completed" };
      }
    } catch (error) {
      console.error("Error transferring funds:", error);
      throw error instanceof Error ? error : new Error("Transfer failed");
    }
  }

  static async sendTransaction(
    fromPrivateKey: string,
    toAddress: string,
    amount: string
  ): Promise<TransactionResponse> {
    try {
      const wallet = new Wallet(fromPrivateKey, this.provider);
      const tx = await wallet.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(amount),
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: walletData } = await supabase
        .from("wallets")
        .select("id, wallet_address")
        .eq("user_id", user.id)
        .single();

      if (!walletData) throw new Error("Wallet not found");

      this.processedTxHashes.add(tx.hash);
      console.log(`Added ETH txHash to processedTxHashes: ${tx.hash}`);

      const newTx = await this.createTransaction(
        walletData.id,
        parseFloat(amount),
        "WITHDRAWAL",
        {
          txHash: tx.hash,
          toAddress,
          network: "sepolia",
          tokenType: "ETH"
        }
      );

      console.log("Emitting ETH withdrawal (PENDING):", newTx);
      this.eventEmitter.emit(`transaction:${walletData.id}`, newTx);

      return tx;
    } catch (error) {
      console.error("Error sending transaction:", error);
      throw error;
    }
  }

  static async createWallet(): Promise<{ address: string; privateKey: string; mnemonic: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const randomWallet = Wallet.createRandom();
      const wallet = randomWallet.connect(this.provider);

      const address = wallet.address;
      const privateKey = wallet.privateKey;
      const mnemonic = wallet.mnemonic?.phrase || "";

      const { data: newWallet, error: insertError } = await supabase
        .from("wallets")
        .insert({
          user_id: user.id,
          wallet_address: address,
          encrypted_private_key: await this.encrypt(privateKey),
          encrypted_mnemonic: await this.encrypt(mnemonic),
          balance: 0,
          token_balance: 0,
          network: "sepolia",
          wallet_type: "ETH",
          status: "ACTIVE",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          blockchain_network: "sepolia",
          token_type: "USDT",
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newWallet) throw new Error("Wallet created but no data returned");

      return { address, privateKey, mnemonic };
    } catch (error) {
      console.error("Wallet creation failed:", error);
      throw error;
    }
  }

  static async requestTestEth(address: string) {
    console.log("Requesting test ETH for address:", address);
    console.log("Please get test ETH from: https://sepoliafaucet.com");
  }

  static async getWalletInfo(): Promise<{ address: string; privateKey: string; mnemonic: string } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: wallet } = await supabase
        .from("wallets")
        .select("wallet_address, encrypted_private_key, encrypted_mnemonic")
        .eq("user_id", user.id)
        .single();

      if (!wallet?.wallet_address || !wallet?.encrypted_private_key || !wallet?.encrypted_mnemonic) {
        return null;
      }

      const privateKey = await this.decrypt(wallet.encrypted_private_key);
      const mnemonic = await this.decrypt(wallet.encrypted_mnemonic);

      return { address: wallet.wallet_address, privateKey, mnemonic };
    } catch (error) {
      console.error("Error getting wallet info:", error);
      return null;
    }
  }

  static async getOrCreateWallet(): Promise<{ address: string; privateKey: string; mnemonic: string } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: existingWallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (existingWallet && !existingWallet.wallet_address) {
        const wallet = Wallet.createRandom().connect(this.provider);
        const address = wallet.address;
        const privateKey = wallet.privateKey;
        const mnemonic = wallet.mnemonic?.phrase || "";

        await supabase
          .from("wallets")
          .update({
            wallet_address: address,
            encrypted_private_key: await this.encrypt(privateKey),
            encrypted_mnemonic: await this.encrypt(mnemonic),
            network: "sepolia",
          })
          .eq("id", existingWallet.id);

        return { address, privateKey, mnemonic };
      }

      if (existingWallet?.wallet_address) {
        return {
          address: existingWallet.wallet_address,
          privateKey: await this.decrypt(existingWallet.encrypted_private_key),
          mnemonic: await this.decrypt(existingWallet.encrypted_mnemonic),
        };
      }

      return await this.createWallet();
    } catch (error) {
      console.error("Error in getOrCreateWallet:", error);
      throw error;
    }
  }

  static async sendFunds(toAddress: string, amount: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const walletInfo = await this.getWalletInfo();
      if (!walletInfo?.privateKey) throw new Error("No wallet found");

      await this.sendTransaction(walletInfo.privateKey, toAddress, amount);
      return true;
    } catch (error) {
      console.error("Error sending funds:", error);
      throw error;
    }
  }

  static async fundWallet(amount: number): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: wallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!wallet) throw new Error("No wallet found");

      const { error } = await supabase.from("wallet_funding_requests").insert([
        {
          user_id: user.id,
          wallet_id: wallet.id,
          amount_usdt: amount,
          amount_inr: amount * 83, // Update to use real-time INR rate if integrated elsewhere
          status: "PENDING",
        },
      ]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error funding wallet:", error);
      throw error;
    }
  }

  static async encryptWalletInfo(text: string): Promise<string> {
    return this.encrypt(text);
  }

  private static async encrypt(text: string): Promise<string> {
    return CryptoJS.AES.encrypt(text, this.ENCRYPTION_KEY).toString();
  }

  private static async decrypt(text: string | null): Promise<string> {
    if (!text) throw new Error("Cannot decrypt null value");
    const bytes = CryptoJS.AES.decrypt(text, this.ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}

// Initialize USDT decimals on module load
WalletService.initialize();