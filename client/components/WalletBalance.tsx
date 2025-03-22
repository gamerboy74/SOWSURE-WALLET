import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Wallet } from "lucide-react";
import type { Wallet as WalletType } from "../types/types";

export default function WalletBalance() {
  const [balance, setBalance] = useState<number>(0);
  const [userType, setUserType] = useState<string>("");

  useEffect(() => {
    async function loadBalance() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserType(user.user_metadata.type);

      const { data: wallet } = await supabase
        .from("wallets")
        .select("token_balance")
        .eq("user_id", user.id)
        .single();

      if (wallet) {
        setBalance(wallet.token_balance);
      }
    }

    loadBalance();

    // Subscribe to wallet changes
    const walletSubscription = supabase
      .channel("wallet_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallets",
        },
        (payload) => {
          if (payload.new) {
            setBalance((payload.new as WalletType).token_balance);
          }
        }
      )
      .subscribe();

    return () => {
      walletSubscription.unsubscribe();
    };
  }, []);

  return (
    <Link
      to={`/${userType}/wallet`}
      className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"
    >
      <Wallet className="w-5 h-5" />
      <span className="font-medium">{balance.toLocaleString()} AGRI</span>
    </Link>
  );
}
