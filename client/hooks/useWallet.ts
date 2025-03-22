import { useState, useEffect } from "react";
import { Wallet } from "ethers";
import { supabase } from "../lib/supabase";
import { WalletService } from "../services/wallet.service";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState({ eth: "0", token: 0 });
  const [prices, setPrices] = useState({ eth: 150000, usdt: 83 }); // Default prices in INR
  const [loading, setLoading] = useState(false); // Add loading state

  const createWallet = async () => {
    try {
      console.log("Starting wallet creation...");
      setLoading(true); // Add loading state

      const response = await WalletService.createWallet();
      console.log("Wallet created, updating state...");

      // Update state immediately
      setAddress(response.address);
      setBalance((prev) => ({
        ...prev,
        eth: "0",
        token: 1000,
      }));

      // Force immediate balance check
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

        // First try to get existing wallet with proper headers
        const { data: walletRecord } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", user.id)
          .single()
          .throwOnError();

        // If no wallet exists, create one immediately
        if (!walletRecord) {
          console.log("Creating new wallet automatically...");
          const response = await WalletService.createWallet();
          if (mounted) {
            setAddress(response.address);
            setBalance((prev) => ({
              ...prev,
              token: 1000,
            }));
            // Store credentials in localStorage temporarily
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

        // If wallet exists but needs blockchain setup
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

    // Load initial ETH balance
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

    // Poll ETH balance more frequently (every 10 seconds)
    loadEthBalance();
    const pollEthBalance = setInterval(loadEthBalance, 10000);

    // Real-time subscription to wallet changes
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
            // Also refresh ETH balance when token balance changes
            loadEthBalance();
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      clearInterval(pollEthBalance);
      walletSubscription.unsubscribe();
    };
  }, [address]); // Add address as dependency

  useEffect(() => {
    let mounted = true;
    const pollInterval = 15000; // 15 seconds

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

    // Load initial balance
    loadEthBalance();

    // Set up polling
    const intervalId = setInterval(loadEthBalance, pollInterval);

    // Set up block listener for quicker updates
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
        // Check cache first
        const cached = localStorage.getItem("cached_prices");
        if (cached) {
          const { prices: cachedPrices, timestamp } = JSON.parse(cached);
          const cacheAge = Date.now() - timestamp;

          // Use cache if less than 10 minutes old
          if (cacheAge < 10 * 60 * 1000) {
            setPrices(cachedPrices);
            return;
          }
        }

        // Attempt to fetch from Binance API (better CORS support)
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

        // Convert prices to INR (approximate conversion)
        const usdToInr = 83; // Fixed conversion rate
        const newPrices = {
          eth: Math.round(parseFloat(ethData.price) * usdToInr),
          usdt: usdToInr,
        };

        // Cache the new prices
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
        // Use default prices on error
        const defaultPrices = { eth: 150000, usdt: 83 };

        // Try to use cached prices first if available
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
    // Update prices every 10 minutes
    const interval = setInterval(fetchPrices, 10 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Add function to check and clear credentials
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
    loading, // Return loading state
    checkNewWalletCredentials,
  };
}
