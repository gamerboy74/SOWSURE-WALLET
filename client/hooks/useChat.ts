import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

const TABLES = {
  FARMERS: "farmers",
  BUYERS: "buyers",
  CHATS: "chats",
} as const;

interface ChatParams {
  currentUserId: string | null;
  product: {
    id: string;
    type: "sell" | "buy";
    farmer?: { id: string } | null;
    buyer?: { id: string } | null;
  } | null;
  disableChat?: boolean;
}

export const useChat = ({ currentUserId, product, disableChat = false }: ChatParams) => {
  const [showChat, setShowChat] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateChat = useCallback(async () => {
    if (!currentUserId || !product || disableChat) {
      setError("Chat initiation is disabled or user/product data is missing.");
      return;
    }

    setChatLoading(true);
    setError(null);

    try {
      const [farmerRes, buyerRes] = await Promise.all([
        supabase.from(TABLES.FARMERS).select("id").eq("user_id", currentUserId).single(),
        supabase.from(TABLES.BUYERS).select("id").eq("user_id", currentUserId).single(),
      ]);

      const currentUserFarmerId = farmerRes.data?.id;
      const currentUserBuyerId = buyerRes.data?.id;

      if (!currentUserFarmerId && !currentUserBuyerId) {
        throw new Error("Current user must be registered as a farmer or buyer to initiate a chat.");
      }

      const chatData = {
        farmer_id:
          product.type === "sell"
            ? product.farmer?.id ?? null
            : currentUserFarmerId ?? currentUserId, // Fallback to user_id if no farmer record
        buyer_id:
          product.type === "buy"
            ? product.buyer?.id ?? null
            : currentUserBuyerId ?? currentUserId, // Fallback to user_id if no buyer record
        product_id: product.id,
      };

      if (!chatData.farmer_id || !chatData.buyer_id) {
        throw new Error("Both farmer and buyer IDs are required to create a chat.");
      }

      const { data: existingChats, error: existingChatError } = await supabase
        .from(TABLES.CHATS)
        .select("id")
        .eq("product_id", product.id)
        .eq("farmer_id", chatData.farmer_id)
        .eq("buyer_id", chatData.buyer_id)
        .limit(1);

      if (existingChatError) throw new Error(`Chat check failed: ${existingChatError.message}`);

      if (existingChats?.length > 0) {
        setChatId(existingChats[0].id);
        setShowChat(true);
        setChatLoading(false);
        return;
      }

      const { data: newChat, error: chatError } = await supabase
        .from(TABLES.CHATS)
        .insert(chatData)
        .select("id")
        .single();

      if (chatError) throw new Error(`Chat creation failed: ${chatError.message}`);
      setChatId(newChat?.id);
      setShowChat(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  }, [currentUserId, product, disableChat]);

  const closeChat = useCallback(() => {
    setShowChat(false);
  }, []);

  return {
    showChat,
    chatId,
    chatLoading,
    error,
    initiateChat,
    closeChat,
  };
};