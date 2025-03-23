// hooks/useWallet.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { WalletService } from "../services/wallet.service";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState({ eth: "0", token: 0 });
  const [prices, setPrices] = useState({ eth: 150000, usdt: 83 }); // Default prices in INR
  const [loading, setLoading] = useState(false);

  // Fetch ETH balance for a given address
  const loadEthBalance = async (walletAddress: string) => {
    try {
      const { balance } = await WalletService.getWalletBalance(walletAddress, "onchain");
      setBalance((prev) => ({ ...prev, eth: balance }));
    } catch (error) {
      console.error("Error loading ETH balance:", error);
      setBalance((prev) => ({ ...prev, eth: "0" }));
    }
  };

  // Create a new wallet
  const createWallet = async () => {
    try {
      setLoading(true);
      const response = await WalletService.createWallet();
      console.log("Wallet created:", response);

      // Update state immediately
      setAddress(response.address);
      setBalance({ eth: "0", token: 1000 });

      // Fetch ETH balance after creation
      await loadEthBalance(response.address);

      // Store credentials temporarily (if needed elsewhere)
      localStorage.setItem(
        "tempWalletCredentials",
        JSON.stringify({
          address: response.address,
          privateKey: response.privateKey,
          mnemonic: response.mnemonic,
          isNew: true,
        })
      );

      return response;
    } catch (error) {
      console.error("Error creating wallet:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Initialize wallet and set up balance polling
  useEffect(() => {
    let mounted = true;
    const pollInterval = 10000; // Poll every 10 seconds

    const initWallet = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        const { data: walletRecords, error } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", user.id);

        if (error) throw new Error(`Supabase query failed: ${error.message}`);

        if (!walletRecords || walletRecords.length === 0) {
          console.log("No wallet found, creating new wallet...");
          await createWallet(); // This will set address and balance
          return;
        }

        const walletRecord = walletRecords[0];
        if (mounted) {
          setAddress(walletRecord.wallet_address);
          setBalance((prev) => ({ ...prev, token: walletRecord.token_balance || 0 }));
          await loadEthBalance(walletRecord.wallet_address);
        }
      } catch (error) {
        console.error("Error initializing wallet:", error);
      }
    };

    initWallet();

    // Poll ETH balance if address exists
    const intervalId = address
      ? setInterval(async () => {
          if (mounted && address) {
            await loadEthBalance(address);
          }
        }, pollInterval)
      : null;

    // Cleanup
    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [address]); // Re-run when address changes

  // Fetch and update prices
  useEffect(() => {
    let mounted = true;
    const fetchPrices = async () => {
      try {
        const cached = localStorage.getItem("cached_prices");
        if (cached) {
          const { prices: cachedPrices, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 10 * 60 * 1000) {
            setPrices(cachedPrices);
            return;
          }
        }

        const [ethResponse, usdtResponse] = await Promise.all([
          fetch("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT"),
          fetch("https://api.binance.com/api/v3/ticker/price?symbol=USDTBIDR"),
        ]);

        if (!ethResponse.ok || !usdtResponse.ok) throw new Error("Failed to fetch prices");

        const [ethData, usdtData] = await Promise.all([ethResponse.json(), usdtResponse.json()]);
        const usdToInr = 83;
        const newPrices = {
          eth: Math.round(parseFloat(ethData.price) * usdToInr),
          usdt: usdToInr,
        };

        if (mounted) {
          setPrices(newPrices);
          localStorage.setItem("cached_prices", JSON.stringify({ prices: newPrices, timestamp: Date.now() }));
        }
      } catch (error) {
        console.warn("Price fetch error:", error);
        setPrices({ eth: 150000, usdt: 83 }); // Fallback to defaults
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 10 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const checkNewWalletCredentials = () => {
    const stored = localStorage.getItem("tempWalletCredentials");
    if (stored) {
      const credentials = JSON.parse(stored);
      localStorage.removeItem("tempWalletCredentials");
      return credentials;
    }
    return null;
  };

  return {
    address,
    balance,
    prices,
    createWallet,
    loading,
    checkNewWalletCredentials,
  };
}