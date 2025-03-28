import { supabase } from "../lib/supabase";
import type { WalletTransaction } from "../types/types";
import { Wallet, ethers, JsonRpcProvider, WebSocketProvider, TransactionResponse, Contract, formatEther, parseEther, formatUnits, parseUnits } from "ethers";
import * as CryptoJS from "crypto-js";
import EventEmitter from "eventemitter3";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../../contract/AgriculturalContract";

// USDT contract details for Sepolia
const USDT_CONTRACT_ADDRESS = "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0"; // Verify or replace with a valid Sepolia USDT address
const USDT_ABI = [
  {"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"},{"internalType":"uint8","name":"decimals","type":"uint8"},{"internalType":"address","name":"owner","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},
  {"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"EIP712_REVISION","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"PERMIT_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"mint","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"value","type":"uint256"}],"name":"mint","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"nonces","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"}
] as const;

type USDTContract = Omit<Contract, "transfer" | "balanceOf" | "decimals"> & {
  balanceOf(address: string): Promise<ethers.BigNumberish>;
  transfer(to: string, value: ethers.BigNumberish): Promise<TransactionResponse>;
  decimals(): Promise<number>;
  approve(spender: string, amount: ethers.BigNumberish): Promise<TransactionResponse>;
  allowance(owner: string, spender: string): Promise<ethers.BigNumberish>;
  transferFrom(sender: string, recipient: string, amount: ethers.BigNumberish): Promise<TransactionResponse>;
  totalSupply(): Promise<ethers.BigNumberish>;
  name(): Promise<string>;
  symbol(): Promise<string>;
};

export class WalletService {
  private static TESTNET_RPC_URL = import.meta.env.VITE_PUBLIC_ALCHEMY_RPC_URL || "https://rpc.sepolia.org";
  private static TESTNET_WS_URL = import.meta.env.VITE_PUBLIC_ALCHEMY_WS_URL;
  private static ENCRYPTION_KEY = import.meta.env.VITE_WALLET_ENCRYPTION_KEY;
  public static provider = new JsonRpcProvider(WalletService.TESTNET_RPC_URL);
  private static wsProvider: WebSocketProvider | null = null;
  private static usdtContract: USDTContract = new Contract(
    USDT_CONTRACT_ADDRESS,
    USDT_ABI,
    WalletService.provider
  ) as unknown as USDTContract;
  private static sellContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, WalletService.provider);
  private static eventEmitter = new EventEmitter();
  private static processedTxHashes: Set<string> = new Set();
  private static usdtDecimals: number | null = null;

  static async initialize() {
    try {
      const network = await this.provider.getNetwork();
      console.log("Initializing WalletService with provider:", network);

      if (network.chainId !== 11155111n) { // Sepolia chain ID
        throw new Error(`Provider not connected to Sepolia (chainId: ${network.chainId})`);
      }

      const usdtCode = await this.provider.getCode(USDT_CONTRACT_ADDRESS);
      if (usdtCode === "0x") {
        throw new Error(`No USDT contract deployed at ${USDT_CONTRACT_ADDRESS} on Sepolia`);
      }

      const sellContractCode = await this.provider.getCode(CONTRACT_ADDRESS);
      if (sellContractCode === "0x") {
        throw new Error(`No sell contract deployed at ${CONTRACT_ADDRESS} on Sepolia`);
      }

      this.usdtDecimals = await this.usdtContract.decimals();
      console.log(`USDT contract decimals: ${this.usdtDecimals}`);
    } catch (error) {
      console.error("Error initializing WalletService, defaulting to 6 decimals:", error);
      this.usdtDecimals = 6; // Fallback to 6 if fetching fails
    }
  }

  static subscribeToBalanceUpdates(address: string, callback: (balance: { eth: string; usdt: string }) => void) {
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
      this.wsProvider.on("error", (err) => console.error("WebSocket error:", err));
      this.wsProvider.on("close", () => console.log("WebSocket closed, reconnecting..."));
    }

    const addressLower = address.toLowerCase();

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

        if (tx.from.toLowerCase() !== addressLower && tx.to?.toLowerCase() !== addressLower) {
          return;
        }

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
        const value = parseFloat(formatEther(tx.value));

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
      } catch (error) {
        console.error("Error processing ETH WebSocket transaction:", error);
      }
    };

    const usdtListener = async (from: string, to: string, value: ethers.BigNumberish, event: ethers.EventLog) => {
      try {
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
          const amount = parseFloat(formatUnits(value, decimals));
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
            eth: formatEther(await this.provider.getBalance(address)),
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
        const formattedBalance = formatEther(balance);
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
      const formattedBalance = formatUnits(balance, decimals);
      await supabase
        .from("wallets")
        .update({ token_balance: parseFloat(formattedBalance) })
        .eq("wallet_address", address);
      this.eventEmitter.emit(`balance:${address}`, {
        eth: formatEther(await this.provider.getBalance(address)),
        usdt: formattedBalance,
      });
      return formattedBalance;
    } catch (error) {
      console.error(`Error fetching USDT balance for ${address}:`, error);
      const fallbackBalance = "0";
      this.eventEmitter.emit(`balance:${address}`, {
        eth: formatEther(await this.provider.getBalance(address).catch(() => "0")),
        usdt: fallbackBalance,
      });
      return fallbackBalance;
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

      if (existingTx) return existingTx;
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

      const { data: transactions, error: fetchError } = await query;

      if (fetchError) throw fetchError;

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
            } else if (receipt?.status === 0) {
              await supabase
                .from("wallet_transactions")
                .update({ status: "FAILED" })
                .eq("id", tx.id);
              return { ...tx, status: "FAILED" };
            }
          }
          return tx;
        })
      );

      if (!this.wsProvider) {
        await this.startTransactionListener(walletId, wallet.wallet_address);
      }

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
        const tx = await usdtContractWithSigner.transfer(toAddress, parseUnits(amountString, this.usdtDecimals || 6));

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
          this.eventEmitter.emit(`transaction:${fromWalletId}`, { ...newTx, status: "COMPLETED" });

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
        value: parseEther(amount),
        gasLimit: 21000, // Standard ETH transfer gas limit
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
      const newTx = await this.createTransaction(
        walletData.id,
        parseFloat(amount),
        "WITHDRAWAL",
        {
          txHash: tx.hash,
          toAddress,
          network: "sepolia",
          tokenType: "ETH",
        }
      );

      this.eventEmitter.emit(`transaction:${walletData.id}`, newTx);
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error(`Transaction failed: ${tx.hash}`);
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

      const { data: newWallet, error } = await supabase
        .from("wallets")
        .insert({
          user_id: user.id,
          wallet_address: wallet.address,
          encrypted_private_key: await this.encrypt(wallet.privateKey),
          encrypted_mnemonic: await this.encrypt(wallet.mnemonic?.phrase || ""),
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

      if (error) throw error;
      if (!newWallet) throw new Error("Wallet created but no data returned");

      const ethBalance = await this.provider.getBalance(wallet.address);
      const usdtBalance = await this.getUsdtBalance(wallet.address);
      await supabase
        .from("wallets")
        .update({
          balance: parseFloat(formatEther(ethBalance)),
          token_balance: parseFloat(usdtBalance),
        })
        .eq("wallet_address", wallet.address);

      return { address: wallet.address, privateKey: wallet.privateKey, mnemonic: wallet.mnemonic?.phrase || "" };
    } catch (error) {
      console.error("Wallet creation failed:", error);
      throw error;
    }
  }

  static async requestTestEth(address: string) {
    console.log("Requesting test ETH for address:", address);
    console.log("Please get test ETH from: https://sepoliafaucet.com");
  }

  static async getEthPriceInINR(): Promise<number> {
    try {
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr");
      const data = await response.json();
      return data.ethereum.inr;
    } catch (error) {
      console.error("Error fetching ETH price:", error);
      return 200000; // Fallback
    }
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

      if (!wallet?.wallet_address || !wallet?.encrypted_private_key || !wallet?.encrypted_mnemonic) return null;

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

  static async createSellContract(walletId: string, params: {
    cropName: string;
    quantity: string;
    amount: string;
    startDate: string;
    endDate: string;
  }) {
    const walletInfo = await this.getWalletInfo();
    if (!walletInfo) throw new Error("No wallet found");

    const wallet = new Wallet(walletInfo.privateKey, this.provider);
    const contractWithSigner = this.sellContract.connect(wallet) as Contract & {
      createSellContract(cropName: string, quantity: bigint, amount: bigint, startDate: number, endDate: number): Promise<TransactionResponse>;
    };

    const amountWei = parseEther(params.amount);
    if (amountWei === 0n) throw new Error("Amount cannot be 0");

    const tx = await contractWithSigner.createSellContract(
      params.cropName,
      BigInt(params.quantity),
      amountWei,
      Math.floor(new Date(params.startDate).getTime() / 1000),
      Math.floor(new Date(params.endDate).getTime() / 1000)
    );

    const { data: farmer } = await supabase
      .from("farmers")
      .select("id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();
    if (!farmer) throw new Error("Farmer not found");

    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Transaction failed: ${tx.hash}`);

    if (this.processedTxHashes.has(tx.hash)) {
      console.log(`Transaction ${tx.hash} already processed, fetching existing contract`);
      const { data: existingContract } = await supabase
        .from("smart_contracts")
        .select("contract_id")
        .eq("blockchain_tx_hash", tx.hash)
        .single();
      if (!existingContract) throw new Error("Processed transaction not found in DB");
      return { txHash: tx.hash, contractId: existingContract.contract_id.toString() };
    }

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.provider);
    const contractCreatedEvent = receipt.logs
      .map((log) => contract.interface.parseLog(log))
      .find((event) => event?.name === "ContractCreated");
    if (!contractCreatedEvent) throw new Error("ContractCreated event not found");

    const contractId = contractCreatedEvent.args.contractId.toString();
    this.processedTxHashes.add(tx.hash);

    console.log(`Syncing sell contract: contractId=${contractId}, txHash=${tx.hash}`);

    const { error: rpcError } = await supabase.rpc("sync_sell_contract_creation", {
      p_contract_id: Number(contractId),
      p_farmer_id: farmer.id,
      p_crop_name: params.cropName,
      p_quantity: Number(params.quantity),
      p_amount_eth: parseFloat(params.amount),
      p_start_date: params.startDate,
      p_end_date: params.endDate,
      p_delivery_method: "",
      p_delivery_location: "",
      p_additional_notes: "",
      p_tx_hash: tx.hash,
      p_contract_address: CONTRACT_ADDRESS,
    });
    if (rpcError) {
      console.error(`RPC error for contractId=${contractId}, txHash=${tx.hash}: ${rpcError.message}`);
      throw new Error(`RPC sync_sell_contract_creation error: ${rpcError.message}`);
    }

    return { txHash: tx.hash, contractId };
  }

  static async createBuyContract(walletId: string, params: {
    cropName: string;
    quantity: string;
    amount: string;
    startDate: string;
    endDate: string;
    deliveryMethod: string;
    deliveryLocation: string;
    additionalNotes: string;
  }) {
    const walletInfo = await this.getWalletInfo();
    if (!walletInfo) throw new Error("No wallet found");

    const wallet = new Wallet(walletInfo.privateKey, this.provider);
    const contractWithSigner = this.sellContract.connect(wallet) as Contract & {
      createBuyContract(
        cropName: string,
        quantity: bigint,
        amount: bigint,
        startDate: number,
        endDate: number,
        deliveryMethod: string,
        deliveryLocation: string,
        additionalNotes: string,
        overrides?: { value: bigint }
      ): Promise<TransactionResponse>;
    };

    const amountWei = parseEther(params.amount);
    if (amountWei === 0n) throw new Error("Amount cannot be 0");

    const tx = await contractWithSigner.createBuyContract(
      params.cropName,
      BigInt(params.quantity),
      amountWei,
      Math.floor(new Date(params.startDate).getTime() / 1000),
      Math.floor(new Date(params.endDate).getTime() / 1000),
      params.deliveryMethod,
      params.deliveryLocation,
      params.additionalNotes,
      { value: amountWei }
    );

    const { data: buyer } = await supabase
      .from("buyers")
      .select("id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();
    if (!buyer) throw new Error("Buyer not found");

    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Transaction failed: ${tx.hash}`);

    if (this.processedTxHashes.has(tx.hash)) {
      console.log(`Transaction ${tx.hash} already processed, fetching existing contract`);
      const { data: existingContract } = await supabase
        .from("smart_contracts")
        .select("contract_id")
        .eq("blockchain_tx_hash", tx.hash)
        .single();
      if (!existingContract) throw new Error("Processed transaction not found in DB");
      return { txHash: tx.hash, contractId: existingContract.contract_id.toString() };
    }

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.provider);
    const contractCreatedEvent = receipt.logs
      .map((log) => contract.interface.parseLog(log))
      .find((event) => event?.name === "ContractCreated");
    if (!contractCreatedEvent) throw new Error("ContractCreated event not found");

    const contractId = contractCreatedEvent.args.contractId.toString();
    this.processedTxHashes.add(tx.hash);

    console.log(`Syncing buy contract: contractId=${contractId}, txHash=${tx.hash}`);

    const { error: rpcError } = await supabase.rpc("sync_buyer_contract_creation", {
      p_contract_id: Number(contractId),
      p_buyer_id: buyer.id,
      p_crop_name: params.cropName,
      p_quantity: Number(params.quantity),
      p_amount_eth: parseFloat(params.amount),
      p_start_date: params.startDate,
      p_end_date: params.endDate,
      p_delivery_method: params.deliveryMethod,
      p_delivery_location: params.deliveryLocation,
      p_additional_notes: params.additionalNotes,
      p_tx_hash: tx.hash,
      p_contract_address: CONTRACT_ADDRESS,
    });
    if (rpcError) {
      console.error(`RPC error for contractId=${contractId}, txHash=${tx.hash}: ${rpcError.message}`);
      throw new Error(`RPC sync_buyer_contract_creation error: ${rpcError.message}`);
    }

    return { txHash: tx.hash, contractId };
  }

  static async acceptSellContract(walletId: string, contractId: number, params: {
    deliveryMethod: string;
    deliveryLocation: string;
    additionalNotes: string;
  }) {
    const walletInfo = await this.getWalletInfo();
    if (!walletInfo) throw new Error("No wallet found");
  
    const wallet = new Wallet(walletInfo.privateKey, this.provider);
    const contractWithSigner = this.sellContract.connect(wallet) as Contract & {
      acceptSellContract(
        contractId: number,
        deliveryMethod: string,
        deliveryLocation: string,
        additionalNotes: string,
        overrides?: { value?: bigint; gasLimit?: number }
      ): Promise<TransactionResponse>;
      getContractDetails(contractId: number): Promise<any>;
      estimateGas: {
        acceptSellContract(
          contractId: number,
          deliveryMethod: string,
          deliveryLocation: string,
          additionalNotes: string,
          overrides?: { value?: bigint }
        ): Promise<bigint>;
      };
    };
  
    // Fetch contract details to get the exact amount
    const contractDetails = await contractWithSigner.getContractDetails(contractId);
    const amountWei = contractDetails.basic.amount;
    console.log(`Contract ${contractId} requires ${ethers.formatEther(amountWei)} ETH`);
  
    // Check buyer's balance
    const buyerBalance = await this.provider.getBalance(wallet.address);
    if (buyerBalance < amountWei) {
      throw new Error(`Insufficient balance: ${ethers.formatEther(buyerBalance)} ETH available, ${ethers.formatEther(amountWei)} ETH required`);
    }
  
    // Estimate gas dynamically
    const gasEstimate = await contractWithSigner.estimateGas.acceptSellContract(
      contractId,
      params.deliveryMethod,
      params.deliveryLocation,
      params.additionalNotes,
      { value: amountWei }
    );
    const feeData = await this.provider.getFeeData();
    const gasCost = gasEstimate * (feeData.gasPrice ?? 0n);
    const totalCost = amountWei.add(gasCost);
  
    if (buyerBalance < totalCost) {
      throw new Error(`Insufficient balance including gas: ${ethers.formatEther(buyerBalance)} ETH available, ${ethers.formatEther(totalCost)} ETH required`);
    }
  
    // Execute transaction
    const tx = await contractWithSigner.acceptSellContract(
      contractId,
      params.deliveryMethod,
      params.deliveryLocation,
      params.additionalNotes,
      { value: amountWei, gasLimit: Number((gasEstimate * 120n) / 100n) } // 20% buffer
    );
    console.log(`Accepting sell contract: contractId=${contractId}, txHash=${tx.hash}, sent ${ethers.formatEther(amountWei)} ETH`);
  
    // Sync with Supabase
    const { data: buyer } = await supabase
      .from("buyers")
      .select("id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();
    if (!buyer) throw new Error("Buyer not found");
  
    const { error: rpcError } = await supabase.rpc("sync_sell_contract_acceptance", {
      p_contract_id: contractId,
      p_buyer_id: buyer.id,
      p_amount_eth: parseFloat(ethers.formatEther(amountWei)),
      p_tx_hash: tx.hash,
      p_delivery_method: params.deliveryMethod,
      p_delivery_location: params.deliveryLocation,
      p_additional_notes: params.additionalNotes,
    });
    if (rpcError) {
      throw new Error(`RPC sync_sell_contract_acceptance error: ${rpcError.message}`);
    }
  
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Transaction failed: ${tx.hash}`);
    return tx.hash;
  }

  static async acceptBuyContract(walletId: string, contractId: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data: wallet } = await supabase
      .from("wallets")
      .select("wallet_address, encrypted_private_key")
      .eq("user_id", user.id)
      .eq("id", walletId)
      .single();

    if (!wallet?.wallet_address || !wallet?.encrypted_private_key) {
      throw new Error("No wallet found for this user in wallets table");
    }

    const privateKey = await this.decrypt(wallet.encrypted_private_key);
    const walletInstance = new Wallet(privateKey, this.provider);
    const contractWithSigner = this.sellContract.connect(walletInstance) as Contract & {
      acceptBuyContract(contractId: number, overrides?: { gasLimit?: number }): Promise<TransactionResponse>;
    };

    const contractDetails = await contractWithSigner.getContractDetails(contractId);
    const escrowBalance = contractDetails.status.escrowBalance;
    const advanceAmount = contractDetails.basic.advanceAmount;
    if (advanceAmount === 0n) throw new Error("Advance amount is 0");
    if (escrowBalance < advanceAmount) {
      throw new Error(`Insufficient escrow balance: ${formatEther(escrowBalance)} ETH available, ${formatEther(advanceAmount)} ETH required`);
    }

    const tx = await contractWithSigner.acceptBuyContract(contractId, { gasLimit: 300000 });
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Transaction failed: ${tx.hash}`);

    const { data: farmer } = await supabase
      .from("farmers")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!farmer) throw new Error("Farmer not found");

    const { error: rpcError } = await supabase.rpc("sync_farmer_acceptance", {
      p_contract_id: contractId,
      p_farmer_id: farmer.id,
      p_tx_hash: tx.hash,
    });
    if (rpcError) {
      console.error(`RPC error for contractId=${contractId}, txHash=${tx.hash}: ${rpcError.message}`);
      throw new Error(`RPC sync_farmer_acceptance error: ${rpcError.message}`);
    }

    const { data: contract } = await supabase
      .from("smart_contracts")
      .select("buyer_id")
      .eq("contract_id", contractId)
      .single();
    if (!contract) throw new Error("Contract not found");

    const { data: buyer } = await supabase
      .from("buyers")
      .select("user_id")
      .eq("id", contract.buyer_id)
      .single();
    if (!buyer) throw new Error("Buyer not found");

    await supabase.from("notifications").insert({
      user_id: buyer.user_id,
      type: "CONTRACT_ACCEPTED",
      message: `Your buy contract #${contractId} has been accepted by a farmer.`,
      related_id: contractId,
      created_at: new Date().toISOString(),
    });

    return tx.hash;
  }

  static async confirmDelivery(walletId: string, contractId: number) {
    const walletInfo = await this.getWalletInfo();
    if (!walletInfo) throw new Error("No wallet found");

    const wallet = new Wallet(walletInfo.privateKey, this.provider);
    const contractWithSigner = this.sellContract.connect(wallet) as Contract & {
      confirmDelivery(contractId: number, overrides?: { gasLimit?: number }): Promise<TransactionResponse>;
    };

    const tx = await contractWithSigner.confirmDelivery(contractId, { gasLimit: 300000 });

    const { error: rpcError } = await supabase.rpc("sync_confirm_delivery", {
      p_contract_id: contractId,
      p_tx_hash: tx.hash,
    });
    if (rpcError) {
      console.error(`RPC error for contractId=${contractId}, txHash=${tx.hash}: ${rpcError.message}`);
      throw new Error(`RPC sync_confirm_delivery error: ${rpcError.message}`);
    }

    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Transaction failed: ${tx.hash}`);
    return tx.hash;
  }

  static async confirmReceipt(walletId: string, contractId: number) {
    const walletInfo = await this.getWalletInfo();
    if (!walletInfo) throw new Error("No wallet found");

    const wallet = new Wallet(walletInfo.privateKey, this.provider);
    const contractWithSigner = this.sellContract.connect(wallet) as Contract & {
      confirmReceipt(contractId: number): Promise<TransactionResponse>;
    };

    const tx = await contractWithSigner.confirmReceipt(contractId);

    const { error: rpcError } = await supabase.rpc("sync_confirm_receipt", {
      p_contract_id: contractId,
      p_tx_hash: tx.hash,
    });
    if (rpcError) {
      console.error(`RPC error for contractId=${contractId}, txHash=${tx.hash}: ${rpcError.message}`);
      throw new Error(`RPC sync_confirm_receipt error: ${rpcError.message}`);
    }

    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Transaction failed: ${tx.hash}`);
    return tx.hash;
  }

  static async claimRemainingAfterTimeout(walletId: string, contractId: number) {
    const walletInfo = await this.getWalletInfo();
    if (!walletInfo) throw new Error("No wallet found");

    const wallet = new Wallet(walletInfo.privateKey, this.provider);
    const contractWithSigner = this.sellContract.connect(wallet) as Contract & {
      claimRemainingAfterTimeout(contractId: number, overrides?: { gasLimit?: number }): Promise<TransactionResponse>;
    };

    const tx = await contractWithSigner.claimRemainingAfterTimeout(contractId, { gasLimit: 300000 });

    const { error: rpcError } = await supabase.rpc("sync_claim_remaining_after_timeout", {
      p_contract_id: contractId,
      p_tx_hash: tx.hash,
    });
    if (rpcError) {
      console.error(`RPC error for contractId=${contractId}, txHash=${tx.hash}: ${rpcError.message}`);
      throw new Error(`RPC sync_claim_remaining_after_timeout error: ${rpcError.message}`);
    }

    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Transaction failed: ${tx.hash}`);
    return tx.hash;
  }

  static async raiseDispute(walletId: string, contractId: number, reason: string) {
    const walletInfo = await this.getWalletInfo();
    if (!walletInfo) throw new Error("No wallet found");

    const wallet = new Wallet(walletInfo.privateKey, this.provider);
    const contractWithSigner = this.sellContract.connect(wallet) as Contract & {
      raiseDispute(contractId: number, overrides?: { gasLimit?: number }): Promise<TransactionResponse>;
    };

    const tx = await contractWithSigner.raiseDispute(contractId, { gasLimit: 300000 });

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Not authenticated");

    const { error: rpcError } = await supabase.rpc("sync_raise_dispute", {
      p_contract_id: contractId,
      p_raised_by: user.id,
      p_reason: reason,
      p_tx_hash: tx.hash,
    });
    if (rpcError) {
      console.error(`RPC error for contractId=${contractId}, txHash=${tx.hash}: ${rpcError.message}`);
      throw new Error(`RPC sync_raise_dispute error: ${rpcError.message}`);
    }

    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Transaction failed: ${tx.hash}`);
    return tx.hash;
  }

  static async resolveDispute(walletId: string, contractId: number, payFarmer: boolean, resolution: string) {
    const walletInfo = await this.getWalletInfo();
    if (!walletInfo) throw new Error("No wallet found");

    const wallet = new Wallet(walletInfo.privateKey, this.provider);
    const contractWithSigner = this.sellContract.connect(wallet) as Contract & {
      resolveDispute(contractId: number, payFarmer: boolean): Promise<TransactionResponse>;
    };

    const tx = await contractWithSigner.resolveDispute(contractId, payFarmer);

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Not authenticated");

    const { error: rpcError } = await supabase.rpc("sync_resolve_dispute", {
      p_contract_id: contractId,
      p_resolved_by: user.id,
      p_pay_farmer: payFarmer,
      p_resolution: resolution,
      p_tx_hash: tx.hash,
    });
    if (rpcError) {
      console.error(`RPC error for contractId=${contractId}, txHash=${tx.hash}: ${rpcError.message}`);
      throw new Error(`RPC sync_resolve_dispute error: ${rpcError.message}`);
    }

    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Transaction failed: ${tx.hash}`);
    return tx.hash;
  }

  static async cancelContract(walletId: string, contractId: number): Promise<string> {
    const walletInfo = await this.getWalletInfo();
    if (!walletInfo) throw new Error("No wallet found");

    const wallet = new Wallet(walletInfo.privateKey, this.provider);
    const contractWithSigner = this.sellContract.connect(wallet) as Contract & {
      cancelContract(contractId: number, overrides?: { gasLimit?: number }): Promise<TransactionResponse>;
    };

    // Check contract details to ensure it's cancellable
    const contractDetails = await contractWithSigner.getContractDetails(contractId);
    if (contractDetails.status.status !== "PENDING") {
      throw new Error(`Contract ${contractId} is not in PENDING state and cannot be cancelled`);
    }

    // Execute the cancelContract transaction
    const tx = await contractWithSigner.cancelContract(contractId, { gasLimit: 200000 });

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Transaction failed: ${tx.hash}`);

    // Update the smart_contracts table in Supabase
    const { error: updateError } = await supabase
      .from("smart_contracts")
      .update({
        status: "CANCELLED",
        blockchain_tx_hash: tx.hash,
        updated_at: new Date().toISOString(),
      })
      .eq("contract_id", contractId);
    if (updateError) {
      console.error(`Error updating contract ${contractId} in DB: ${updateError.message}`);
      throw new Error(`Failed to update contract status: ${updateError.message}`);
    }

    // If buyer-initiated, record the refund transaction
    if (contractDetails.status.isBuyerInitiated && contractDetails.status.escrowBalance > 0n) {
      const refundAmount = formatEther(contractDetails.status.escrowBalance);
      const newTx = await this.createTransaction(
        walletId,
        parseFloat(refundAmount),
        "DEPOSIT",
        {
          txHash: tx.hash,
          fromAddress: CONTRACT_ADDRESS,
          toAddress: walletInfo.address,
          network: "sepolia",
          tokenType: "ETH",
          note: `Refund for cancelled contract #${contractId}`,
        }
      );

      await supabase
        .from("wallet_transactions")
        .update({ status: "COMPLETED" })
        .eq("id", newTx.id);

      this.eventEmitter.emit(`transaction:${walletId}`, { ...newTx, status: "COMPLETED" });
    }

    console.log(`Contract ${contractId} cancelled successfully. Tx Hash: ${tx.hash}`);
    return tx.hash;
  }

  static async getContractDetails(contractId: number) {
    const contract = this.sellContract as Contract & {
      getContractDetails(contractId: number): Promise<{
        basic: {
          contractId: bigint;
          farmerWallet: string;
          buyerWallet: string;
          cropName: string;
          quantity: bigint;
          amount: bigint;
          advanceAmount: bigint;
          remainingAmount: bigint;
        };
        time: {
          startDate: bigint;
          endDate: bigint;
          confirmationDeadline: bigint;
        };
        delivery: {
          deliveryMethod: string;
          deliveryLocation: string;
          additionalNotes: string;
        };
        status: {
          status: "PENDING" | "FUNDED" | "IN_PROGRESS" | "COMPLETED" | "DISPUTED" | "RESOLVED" | "CANCELLED";
          escrowBalance: bigint;
          farmerConfirmedDelivery: boolean;
          buyerConfirmedReceipt: boolean;
          isBuyerInitiated: boolean;
        };
      }>;
    };
    return await contract.getContractDetails(contractId);
  }

  private static async encrypt(text: string): Promise<string> {
    if (!this.ENCRYPTION_KEY) throw new Error("Encryption key not set");
    return CryptoJS.AES.encrypt(text, this.ENCRYPTION_KEY).toString();
  }

  private static async decrypt(text: string | null): Promise<string> {
    if (!text) throw new Error("Cannot decrypt null value");
    if (!this.ENCRYPTION_KEY) throw new Error("Encryption key not set");
    const bytes = CryptoJS.AES.decrypt(text, this.ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}

WalletService.initialize();