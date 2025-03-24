import { useEffect, useState, useCallback, memo } from "react";
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

const MemoizedWalletBalanceCard = memo(WalletBalanceCard);
const MemoizedTransferSection = memo(TransferSection);
const MemoizedFundingRequestsTable = memo(FundingRequestsTable);
const MemoizedTransactionHistoryTable = memo(TransactionHistoryTable);

const WalletDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [fundingRequests, setFundingRequests] = useState<WalletFundingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFundingForm, setShowFundingForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backupInfo, setBackupInfo] = useState<{
    address: string;
    privateKey: string;
    mnemonic: string;
  } | null>(null);

  const { address, createWallet, balance, prices, checkNewWalletCredentials } = useWallet();

  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    const message = error instanceof Error ? error.message : defaultMessage;
    console.error(defaultMessage, error);
    setError(message);
  }, []);

  const loadWalletData = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        navigate("/login");
        return;
      }
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (walletError && walletError.code !== "PGRST116") throw new Error(`Failed to fetch wallet: ${walletError.message}`);
      if (walletData) {
        setWallet(walletData);
        localStorage.setItem("wallet_data", JSON.stringify(walletData));
      }
    } catch (error) {
      handleError(error, "Failed to load wallet data");
    }
  }, [navigate, handleError]);

  const loadFundingRequests = useCallback(async () => {
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
      handleError(error, "Failed to load funding requests");
    }
  }, [handleError]);

  const loadTransactions = useCallback(async () => {
    if (!wallet?.id) return;
    try {
      const txs = await WalletService.getTransactionHistory(wallet.id, 50);
      setTransactions(txs || []);
    } catch (error) {
      setError("No transactions found for this wallet yet.");
    }
  }, [wallet?.id]);

  const init = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        navigate("/login");
        return;
      }
      const cachedWallet = localStorage.getItem("wallet_data");
      if (cachedWallet) setWallet(JSON.parse(cachedWallet));
      await loadWalletData();
      if (wallet?.id) await Promise.all([loadTransactions(), loadFundingRequests()]);
    } catch (error) {
      handleError(error, "Failed to initialize wallet dashboard");
    } finally {
      setLoading(false);
    }
  }, [navigate, loadWalletData, loadTransactions, loadFundingRequests, handleError, wallet?.id]);

  const handleCreateWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const walletData = await createWallet();
      if (!walletData) throw new Error("Failed to create wallet - no data returned");
      await loadWalletData();
      if (wallet?.id) await Promise.all([loadTransactions(), loadFundingRequests()]);
    } catch (error) {
      handleError(error, "Failed to create wallet");
    } finally {
      setLoading(false);
    }
  }, [createWallet, loadWalletData, loadTransactions, loadFundingRequests, handleError, wallet?.id]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (address && !wallet) loadWalletData();
  }, [address, wallet, loadWalletData]);

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
        setTransactions((prev) => {
          const existingIndex = prev.findIndex((tx) => tx.id === newTx.id);
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = newTx;
            return updated;
          }
          return [newTx, ...prev];
        });
      }
    );
    let unsubscribeWebSocket: (() => void) | undefined;
    const startListener = async () => {
      unsubscribeWebSocket = await WalletService.startTransactionListener(wallet.id, wallet.wallet_address!);
    };
    startListener();
    return () => {
      unsubscribeTransactions();
      unsubscribeWebSocket?.();
    };
  }, [wallet?.id, wallet?.wallet_address]);

  if (!wallet && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-lg border border-gray-200 dark:border-gray-700 transform transition-all hover:scale-[1.02] hover:shadow-xl">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-2">
            <Wallet className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
            Welcome to Your Wallet
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-6 text-center">
            You don’t have a blockchain wallet yet. Create one to start managing your crypto assets.
          </p>
          <button
            onClick={handleCreateWallet}
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 dark:from-indigo-600 dark:to-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-600 hover:to-blue-600 hover:scale-105 transition-all duration-300 shadow-md"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5" />
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-4xl animate-pulse">
          <div className="h-8 sm:h-10 w-48 sm:w-64 bg-gray-200 dark:bg-gray-700 rounded-lg mb-6 sm:mb-8 mx-auto" />
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-6">
              <div className="h-40 sm:h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
              <div className="h-56 sm:h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            </div>
            <div className="h-80 sm:h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 py-6 sm:py-10">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4 sm:mb-0">
            <Wallet className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-500 dark:text-indigo-400" />
            Wallet Dashboard
          </h1>
          <DarkModeToggle />
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-xl text-sm font-medium shadow-sm border border-red-200 dark:border-red-800 flex items-center justify-between hover:shadow-md transition-all duration-200">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 dark:text-red-300 dark:hover:text-red-100 hover:scale-105 transition-all duration-200"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 transform transition-all hover:shadow-lg hover:scale-[1.01]">
              <MemoizedWalletBalanceCard
                address={address}
                balance={balance}
                prices={prices}
                onAddFunds={() => setShowFundingForm(true)}
              />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 transform transition-all hover:shadow-lg hover:scale-[1.01]">
              <MemoizedTransferSection
                wallet={wallet}
                onTransferComplete={loadTransactions}
                setError={setError}
              />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 transform transition-all hover:shadow-lg hover:scale-[1.01]">
            <MemoizedFundingRequestsTable fundingRequests={fundingRequests} />
          </div>
        </div>

        <hr className="my-6 sm:my-8 border-gray-200 dark:border-gray-700" />

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 transform transition-all hover:shadow-lg hover:scale-[1.01]">
          <MemoizedTransactionHistoryTable
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
    </div>
  );
};

export default memo(WalletDashboard);