import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { WalletService } from "../../services/wallet.service";
import { useWallet } from "../../hooks/useWallet";
import { Loader2, Plus, Wallet } from "lucide-react";
import type {
  Wallet as WalletType,
  WalletTransaction,
  WalletFundingRequest,
} from "../../types/types";
import { WalletBalanceCard } from "./WalletBalanceCard";
import { TransferSection } from "./TransferSection";
import { FundingRequestsTable } from "./FundingRequestsTable";
import { TransactionHistoryTable } from "./TransactionHistoryTable";
import { FundingFormModal } from "./FundingFormModal";
import { BackupInfoModal } from "./BackupInfoModal";
import { DarkModeToggle } from "../DarkModeToggle";

export default function WalletDashboard() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFundingForm, setShowFundingForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fundingRequests, setFundingRequests] = useState<WalletFundingRequest[]>([]);
  const [backupInfo, setBackupInfo] = useState<{
    address: string;
    privateKey: string;
    mnemonic: string;
  } | null>(null);

  const { address, createWallet, balance, prices, checkNewWalletCredentials } = useWallet();

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          navigate("/login");
          return;
        }

        const cachedWallet = localStorage.getItem('wallet_data');
        if (cachedWallet) {
          const parsedWallet = JSON.parse(cachedWallet);
          setWallet(parsedWallet);
          setLoading(false);
          if (parsedWallet?.id) {
            await loadTransactions();
          }
        }

        await loadWalletData();

        if (wallet?.id) {
          await Promise.all([loadFundingRequests(), loadTransactions()]);
        }

        setLoading(false);
      } catch (error) {
        console.error("Initialization error:", error);
        setError(error instanceof Error ? error.message : "Failed to load wallet data");
      }
    };
    init();
  }, [navigate]);

  useEffect(() => {
    if (wallet?.id) {
      const loadData = async () => {
        await Promise.all([loadTransactions(), loadFundingRequests()]);
      };
      loadData();
    }
  }, [wallet?.id]);

  useEffect(() => {
    if (address) {
      loadWalletData();
    }
  }, [address]);

  useEffect(() => {
    const credentials = checkNewWalletCredentials();
    if (credentials?.isNew) {
      setBackupInfo({
        address: credentials.address,
        privateKey: credentials.privateKey,
        mnemonic: credentials.mnemonic,
      });
    }
  }, [checkNewWalletCredentials]);

  useEffect(() => {
    if (!wallet?.id || !wallet?.wallet_address) return;
  
    const unsubscribeTransactions = WalletService.subscribeToTransactions(
      wallet.id,
      (newTx: WalletTransaction) => {
        console.log("Received transaction update:", newTx);
        setTransactions((prev) => {
          const existingIndex = prev.findIndex(tx => tx.id === newTx.id);
          if (existingIndex !== -1) {
            const updatedTransactions = [...prev];
            updatedTransactions[existingIndex] = newTx;
            return [...updatedTransactions]; // Force new array
          }
          return [newTx, ...prev];
        });
      }
    );
  
    let unsubscribeWebSocket: (() => void) | undefined;
    const startListener = async () => {
      console.log("Starting WebSocket listener for wallet:", wallet.id);
      unsubscribeWebSocket = await WalletService.startTransactionListener(wallet.id, wallet.wallet_address!);
    };
    startListener();
  
    return () => {
      unsubscribeTransactions();
      if (unsubscribeWebSocket) unsubscribeWebSocket();
    };
  }, [wallet?.id, wallet?.wallet_address]);

  const loadWalletData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return;

      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (walletError) throw new Error(`Failed to fetch wallet: ${walletError.message}`);

      if (walletData) {
        setWallet(walletData);
        localStorage.setItem('wallet_data', JSON.stringify(walletData));
      }
    } catch (error) {
      console.error("Error loading wallet:", error);
      setError(error instanceof Error ? error.message : "Failed to load wallet data");
    }
  };

  const loadFundingRequests = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return;

      const { data, error } = await supabase
        .from("wallet_funding_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFundingRequests(data || []);
    } catch (error) {
      console.error("Error loading funding requests:", error);
      setError(error instanceof Error ? error.message : "Failed to load funding requests");
    }
  };

  const loadTransactions = async () => {
    if (!wallet?.id) return;
    try {
      const txs = await WalletService.getTransactionHistory(wallet.id, 50); // Set limit to 50
      console.log('Loaded transactions:', txs.length, txs);
      setTransactions(txs || []);
    } catch (error) {
      console.error("Error loading transactions:", error);
      setError(error instanceof Error ? error.message : "Failed to load transactions");
    }
  };

  const handleCreateWallet = async () => {
    try {
      setLoading(true);
      setError(null);

      const walletData = await createWallet();
      if (!walletData) throw new Error("Failed to create wallet - no data returned");

      await loadWalletData();
      if (wallet?.id) {
        await Promise.all([loadTransactions(), loadFundingRequests()]);
      }
    } catch (error) {
      console.error("Failed to create wallet:", error);
      setError(error instanceof Error ? error.message : "Failed to create wallet");
    } finally {
      setLoading(false);
    }
  };

  if (!wallet && !loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="glass-card rounded-2xl p-8 max-w-lg mx-auto text-center bg-white/90 dark:bg-gray-800/90 animate-fade-in">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center justify-center">
            <Wallet className="w-6 h-6 mr-2 text-emerald-600 dark:text-emerald-400" />
            Welcome to Your Wallet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have a blockchain wallet yet. Create one to start managing your crypto assets.
          </p>
          <button
            onClick={handleCreateWallet}
            className="gradient-btn-primary px-6 py-3 rounded-lg text-white font-medium flex items-center justify-center mx-auto"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Create Blockchain Wallet
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 mb-8 mx-auto"></div>
          <div className="dashboard-grid">
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            </div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 flex items-center">
          <Wallet className="w-8 h-8 mr-2 text-emerald-600 dark:text-emerald-400" />
          Wallet Dashboard
        </h1>
        <DarkModeToggle />
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg text-sm font-medium shadow-md">
          {error}
        </div>
      )}

      <div className="dashboard-grid">
        <div className="space-y-6">
          <div className="card-elevated">
            <WalletBalanceCard
              address={address}
              balance={balance}
              prices={prices}
              onAddFunds={() => setShowFundingForm(true)}
            />
          </div>
          <TransferSection
            wallet={wallet}
            onTransferComplete={loadTransactions}
            setError={setError}
          />
        </div>

        <div className="space-y-6">
          <FundingRequestsTable fundingRequests={fundingRequests} />
        </div>
      </div>

      <div className="section-separator my-8"></div>

      <div className="animate-fade-in-delayed">
        <TransactionHistoryTable
          transactions={transactions}
          onRefresh={loadTransactions}
        />
      </div>

      {wallet && showFundingForm && (
        <FundingFormModal
          wallet={wallet}
          prices={prices}
          onClose={() => setShowFundingForm(false)}
          onSubmit={async () => {
            await Promise.all([loadFundingRequests(), loadTransactions()]);
          }}
          setError={setError}
        />
      )}

      {backupInfo && (
        <BackupInfoModal
          backupInfo={backupInfo}
          onClose={() => setBackupInfo(null)}
        />
      )}
    </div>
  );
}