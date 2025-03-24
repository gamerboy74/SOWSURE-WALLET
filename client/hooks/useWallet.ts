// hooks/useWallet.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { WalletService } from "../services/wallet.service";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState({ eth: "0", token: 0 });
  const [prices, setPrices] = useState({ eth: 150000, usdt: 83 }); // Fallback prices in INR
  const [loading, setLoading] = useState(false);

  const loadBalances = async (walletAddress: string) => {
    try {
      const [ethData, usdtBalance] = await Promise.all([
        WalletService.getWalletBalance(walletAddress, "onchain"),
        WalletService.getUsdtBalance(walletAddress),
      ]);
      setBalance({ eth: String(ethData.balance), token: parseFloat(usdtBalance) });
    } catch (error) {
      console.error("Error loading balances:", error);
      setBalance({ eth: "0", token: 0 });
    }
  };

  const createWallet = async () => {
    try {
      setLoading(true);
      const response = await WalletService.createWallet();
      setAddress(response.address);
      setBalance({ eth: "0", token: 0 });

      await loadBalances(response.address);

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

  useEffect(() => {
    let mounted = true;
    const pollInterval = 10000;

    const initWallet = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      const { data: walletRecords, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw new Error(`Supabase query failed: ${error.message}`);

      if (!walletRecords || walletRecords.length === 0) {
        await createWallet();
        return;
      }

      const walletRecord = walletRecords[0];
      if (mounted) {
        setAddress(walletRecord.wallet_address);
        await loadBalances(walletRecord.wallet_address);
      }
    };

    initWallet();

    const unsubscribe = address
      ? WalletService.subscribeToBalanceUpdates(address, ({ eth, usdt }) => {
          if (mounted) setBalance({ eth, token: parseFloat(usdt || "0") });
        })
      : () => {};

    const intervalId = address
      ? setInterval(() => {
          if (mounted && address) loadBalances(address);
        }, pollInterval)
      : null;

    return () => {
      mounted = false;
      unsubscribe();
      if (intervalId) clearInterval(intervalId);
    };
  }, [address]);

  useEffect(() => {
    let mounted = true;
    const fetchPrices = async () => {
      try {
        const cached = localStorage.getItem("cached_prices");
        if (cached) {
          const { prices: cachedPrices, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 10 * 60 * 1000) { // 10-minute cache
            if (mounted) setPrices(cachedPrices);
            return;
          }
        }

        // Fetch ETH/USDT and USD/INR prices using free APIs
        const [ethResponse, usdInrResponse] = await Promise.all([
          fetch("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT"), // Free Binance API
          fetch("https://api.exchangerate-api.com/v4/latest/USD"), // Free USD/INR API (no key needed for basic use)
        ]);

        if (!ethResponse.ok || !usdInrResponse.ok) throw new Error("Failed to fetch prices");

        const [ethData, usdInrData] = await Promise.all([ethResponse.json(), usdInrResponse.json()]);
        
        // Get USD/INR exchange rate
        const usdToInr = parseFloat(usdInrData.rates.INR);
        const ethPriceUsd = parseFloat(ethData.price); // ETH price in USD

        const newPrices = {
          eth: Math.round(ethPriceUsd * usdToInr), // ETH price in INR
          usdt: usdToInr, // USDT price in INR (1 USDT = usdToInr INR)
        };

        if (mounted) {
          setPrices(newPrices);
          localStorage.setItem("cached_prices", JSON.stringify({ prices: newPrices, timestamp: Date.now() }));
        }
      } catch (error) {
        console.warn("Price fetch error:", error);
        if (mounted) setPrices({ eth: 150000, usdt: 83 }); // Fallback prices in INR
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 10 * 60 * 1000); // Refresh every 10 minutes

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

  return { address, balance, prices, createWallet, loading, checkNewWalletCredentials };
}