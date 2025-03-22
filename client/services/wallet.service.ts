import { supabase } from "../lib/supabase";
import type { WalletTransaction } from "../types/types";
import { Wallet, ethers, JsonRpcProvider, WebSocketProvider, TransactionResponse } from "ethers";
import * as CryptoJS from "crypto-js";
import EventEmitter from "eventemitter3";

export class WalletService {
  private static TESTNET_RPC_URL = import.meta.env.VITE_PUBLIC_ALCHEMY_RPC_URL;
  private static TESTNET_WS_URL = import.meta.env.VITE_PUBLIC_ALCHEMY_WS_URL;
  private static ENCRYPTION_KEY = import.meta.env.VITE_WALLET_ENCRYPTION_KEY;
  public static provider = new JsonRpcProvider(WalletService.TESTNET_RPC_URL);
  private static wsProvider: WebSocketProvider | null = null;
  private static eventEmitter = new EventEmitter();
  private static processedTxHashes: Set<string> = new Set();

  static subscribeToBalanceUpdates(address: string, callback: (balance: string) => void) {
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

    const listener = async (txHash: string) => {
      try {
        if (this.processedTxHashes.has(txHash)) return;

        const tx = await this.wsProvider!.getTransaction(txHash);
        if (!tx) return;

        const addressLower = address.toLowerCase();
        if (tx.from.toLowerCase() === addressLower || tx.to?.toLowerCase() === addressLower) {
          const { data: existingTx } = await supabase
            .from("wallet_transactions")
            .select("*")
            .eq("wallet_id", walletId)
            .eq("metadata->>txHash", tx.hash)
            .single();

          if (!existingTx) {
            this.processedTxHashes.add(tx.hash);
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
              }
            );

            const receipt = await this.wsProvider!.waitForTransaction(tx.hash);
            if (receipt?.status === 1) {
              await supabase
                .from("wallet_transactions")
                .update({ status: "COMPLETED" })
                .eq("id", newTx.id);
              this.eventEmitter.emit(`transaction:${walletId}`, { ...newTx, status: "COMPLETED" });
            }
          } else if (existingTx.status === "PENDING") {
            const receipt = await this.wsProvider!.getTransactionReceipt(tx.hash);
            if (receipt?.status === 1) {
              await supabase
                .from("wallet_transactions")
                .update({ status: "COMPLETED" })
                .eq("id", existingTx.id);
              this.eventEmitter.emit(`transaction:${walletId}`, { ...existingTx, status: "COMPLETED" });
            }
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket transaction:", error);
      }
    };

    this.wsProvider.on("pending", listener);

    return () => {
      if (this.wsProvider) {
        this.wsProvider.off("pending", listener);
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
        this.eventEmitter.emit(`balance:${addressOrUserId}`, formattedBalance);
        return { balance: formattedBalance, type: "ETH" };
      } else {
        const { data, error } = await supabase
          .from("wallets")
          .select("token_balance")
          .eq("user_id", addressOrUserId)
          .single();
        if (error) throw error;
        return { balance: data.token_balance, type: "TOKEN" };
      }
    } catch (error) {
      console.error("Error getting balance:", error);
      throw error;
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
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to create transaction");

    this.eventEmitter.emit(`transaction:${walletId}`, data);
    return data;
  }

  static async getTransactionHistory(walletId: string, limit = 10): Promise<WalletTransaction[]> {
    try {
      if (!walletId) throw new Error("Invalid wallet ID provided");

      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("id, wallet_address")
        .eq("id", walletId)
        .single();

      if (walletError) throw walletError;
      if (!wallet?.wallet_address) throw new Error("Wallet not found or missing address");

      const { data: transactions, error: finalError } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", walletId)
        .order("created_at", { ascending: false })
        .limit(limit);

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
        const { data, error } = await supabase.rpc("transfer_tokens", {
          from_wallet_id: fromWalletId,
          to_wallet_id: toAddress,
          amount: parseFloat(amountString),
        });

        if (error) throw new Error(`USDT transfer failed: ${error.message}`);

        const newTx = await this.createTransaction(
          fromWalletId,
          parseFloat(amountString),
          "WITHDRAWAL",
          { toAddress, note: "USDT Transfer", network: "sepolia" }
        );

        await supabase
          .from("wallet_transactions")
          .update({ status: "COMPLETED" })
          .eq("id", newTx.id);

        this.eventEmitter.emit(`transaction:${fromWalletId}`, { ...newTx, status: "COMPLETED" });
        return { message: "USDT transfer completed" };
      }
    } catch (error) {
      console.error("Error transferring funds:", error);
      throw error instanceof Error ? error : new Error("Transfer failed");
    }
  }

  static async createWallet(): Promise<{
    address: string;
    privateKey: string;
    mnemonic: string;
  }> {
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
          token_balance: 1000,
          network: "sepolia",
          balance: 0,
          wallet_type: "ETH",
          status: "ACTIVE",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          blockchain_network: "sepolia",
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newWallet) throw new Error("Wallet created but no data returned");

      await this.createTransaction(
        newWallet.id,
        1000,
        "DEPOSIT",
        { note: "Initial wallet creation" }
      );

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

  static async sendTransaction(fromPrivateKey: string, toAddress: string, amount: string): Promise<TransactionResponse> {
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

      const newTx = await this.createTransaction(
        walletData.id,
        parseFloat(amount),
        "WITHDRAWAL",
        {
          txHash: tx.hash,
          toAddress,
          network: "sepolia"
        }
      );

      // Status update handled by WebSocket listener
      return tx;
    } catch (error) {
      console.error("Error sending transaction:", error);
      throw error;
    }
  }

  static async getWalletInfo(): Promise<{
    address: string;
    privateKey: string;
    mnemonic: string;
  } | null> {
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

  static async getOrCreateWallet(): Promise<{
    address: string;
    privateKey: string;
    mnemonic: string;
  } | null> {
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
          amount_inr: amount * 83,
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