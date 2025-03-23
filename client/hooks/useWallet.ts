import { useState, useEffect } from "react";
import { Wallet } from "ethers";
import { supabase } from "../lib/supabase";
import { WalletService } from "../services/wallet.service";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState({ eth: "0", token: 0 });
  const [prices, setPrices] = useState({ eth: 150000, usdt: 83 }); // Default prices in INR
  const [loading, setLoading] = useState(false);

  const createWallet = async () => {
    try {
      console.log("Starting wallet creation...");
      setLoading(true);

      const response = await WalletService.createWallet();
      console.log("Wallet created, updating state...");

      setAddress(response.address);
      setBalance((prev) => ({
        ...prev,
        eth: "0",
        token: 1000,
      }));

      if (response.address) {
        const { balance } = await WalletService.getWalletBalance(
          response.address,
          "onchain"
        );
        setBalance((prev) => ({ ...prev, eth: balance }));
      }

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

        if (error) {
          throw new Error(`Supabase query failed: ${error.message}`);
        }

        if (!walletRecords || walletRecords.length === 0) {
          console.log("No wallet found, creating new wallet automatically...");
          const response = await WalletService.createWallet();
          if (mounted) {
            setAddress(response.address);
            setBalance((prev) => ({
              ...prev,
              token: 1000,
            }));
            localStorage.setItem(
              "tempWalletCredentials",
              JSON.stringify({
                address: response.address,
                privateKey: response.privateKey,
                mnemonic: response.mnemonic,
                isNew: true,
              })
            );
          }
          return;
        }

        if (walletRecords.length > 1) {
          console.warn(
            `Multiple wallets found for user ${user.id}. Using the first one.`
          );
        }

        const walletRecord = walletRecords[0];

        if (!walletRecord.wallet_address) {
          const walletInfo = await WalletService.getOrCreateWallet();
          if (mounted && walletInfo) {
            setAddress(walletInfo.address);
          }
        } else if (mounted) {
          setAddress(walletRecord.wallet_address);
        }
      } catch (error) {
        console.error("Error initializing wallet:", error);
      }
    };

    initWallet();

    const loadEthBalance = async () => {
      if (address) {
        try {
          const { balance } = await WalletService.getWalletBalance(
            address,
            "onchain"
          );
          if (mounted) {
            setBalance((prev) => ({ ...prev, eth: balance }));
          }
        } catch (error) {
          console.error("Error loading ETH balance:", error);
        }
      }
    };

    loadEthBalance();
    const pollEthBalance = setInterval(loadEthBalance, 10000);

    const walletSubscription = supabase
      .channel("wallet_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallets" },
        async (payload) => {
          if (mounted) {
            setBalance((prev) => ({
              ...prev,
              token: payload.new.token_balance,
            }));
            await loadEthBalance();
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      clearInterval(pollEthBalance);
      walletSubscription.unsubscribe();
    };
  }, [address]);

  useEffect(() => {
    let mounted = true;
    const pollInterval = 15000;

    const loadEthBalance = async () => {
      if (address) {
        try {
          const { balance } = await WalletService.getWalletBalance(
            address,
            "onchain"
          );
          if (mounted) {
            setBalance((prev) => ({ ...prev, eth: balance }));
          }
        } catch (error) {
          console.error("Error loading ETH balance:", error);
        }
      }
    };

    loadEthBalance();
    const intervalId = setInterval(loadEthBalance, pollInterval);

    if (address) {
      const provider = WalletService.provider;
      provider.on("block", async () => {
        if (mounted) {
          await loadEthBalance();
        }
      });

      return () => {
        mounted = false;
        clearInterval(intervalId);
        provider.removeAllListeners("block");
      };
    }

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [address]);

  useEffect(() => {
    let mounted = true;

    const fetchPrices = async () => {
      try {
        const cached = localStorage.getItem("cached_prices");
        if (cached) {
          const { prices: cachedPrices, timestamp } = JSON.parse(cached);
          const cacheAge = Date.now() - timestamp;

          if (cacheAge < 10 * 60 * 1000) {
            setPrices(cachedPrices);
            return;
          }
        }

        const [ethResponse, usdtResponse] = await Promise.all([
          fetch("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT"),
          fetch("https://api.binance.com/api/v3/ticker/price?symbol=USDTBIDR"),
        ]);

        if (!ethResponse.ok || !usdtResponse.ok) {
          throw new Error("Failed to fetch prices");
        }

        const [ethData, usdtData] = await Promise.all([
          ethResponse.json(),
          usdtResponse.json(),
        ]);

        const usdToInr = 83;
        const newPrices = {
          eth: Math.round(parseFloat(ethData.price) * usdToInr),
          usdt: usdToInr,
        };

        if (mounted) {
          setPrices(newPrices);
          localStorage.setItem(
            "cached_prices",
            JSON.stringify({
              prices: newPrices,
              timestamp: Date.now(),
            })
          );
        }
      } catch (error) {
        console.warn("Price fetch error:", error);
        const defaultPrices = { eth: 150000, usdt: 83 };

        const cached = localStorage.getItem("cached_prices");
        if (cached) {
          const { prices: cachedPrices } = JSON.parse(cached);
          setPrices(cachedPrices);
        } else {
          setPrices(defaultPrices);
        }
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