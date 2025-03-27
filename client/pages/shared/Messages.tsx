import React, { useState, useEffect } from "react";
import { Search, User } from "lucide-react";
import { supabase } from "../../lib/supabase";
import ChatWindow from "../../components/chat/ChatWindow";
import { useNotification } from "../../../src/context/NotificationContext";

interface Chat {
  id: string;
  productId?: string;
  user: {
    id: string;
    name: string;
    type: "Farmer" | "Buyer";
    image: string | null;
    lastSeen: string;
  };
  lastMessage: {
    content: string;
    timestamp: string;
    unread: boolean;
    sender_id: string;
  };
}

const customStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in { animation: fadeIn 0.3s ease-out; }
  .chat-hover { transition: all 0.2s ease; }
  .chat-hover:hover { background: #ecfdf5; transform: translateX(5px); }
  .tab-active { 
    border-bottom: 2px solid #10b981;
    color: #10b981;
    font-weight: 600;
  }
`;

function Messages() {
  const notification = useNotification();
  const [searchQuery, setSearchQuery] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");

  useEffect(() => {
    const fetchUserAndChats = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setError("Please log in to view messages");
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);
      await fetchChats(user.id);
      subscribeToChats(user.id);
      subscribeToMessages(user.id);
    };

    fetchUserAndChats();
  }, []);

  const fetchChats = async (userId: string) => {
    try {
      setLoading(true);

      const { data: farmerData, error: farmerError } = await supabase
        .from("farmers")
        .select("id")
        .eq("user_id", userId);

      const { data: buyerData, error: buyerError } = await supabase
        .from("buyers")
        .select("id")
        .eq("user_id", userId);

      const farmer = farmerData && farmerData.length > 0 ? farmerData[0] : null;
      const buyer = buyerData && buyerData.length > 0 ? buyerData[0] : null;

      const isFarmer = !!farmer && !farmerError;
      const isBuyer = !!buyer && !buyerError;

      if (!isFarmer && !isBuyer) {
        throw new Error("User is neither a registered farmer nor buyer");
      }

      const userIdField = isFarmer ? "farmer_id" : "buyer_id";
      const otherUserIdField = isFarmer ? "buyer_id" : "farmer_id";
      const otherUserTable = isFarmer ? "buyers" : "farmers";
      const otherUserNameField = isFarmer ? "company_name" : "name";
      const otherUserImageField = "profile_photo_url";
      const userTableId = isFarmer ? farmer?.id : buyer?.id;

      const { data: chatData, error: chatError } = await supabase
        .from("chats")
        .select(
          `
          id,
          product_id,
          ${otherUserIdField},
          ${otherUserTable} (
            id,
            ${otherUserNameField},
            ${otherUserImageField}
          ),
          messages (content, created_at, sender_id, read_at)
        `
        )
        .eq(userIdField, userTableId)
        .order("updated_at", { ascending: false });

      if (chatError) throw chatError;

      const formattedChats: Chat[] =
        chatData?.map((chat: any) => {
          const lastMessage = chat.messages.sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )[0] || {
            content: "No messages yet",
            created_at: chat.created_at,
            read_at: null,
            sender_id: null,
          };

          return {
            id: chat.id,
            productId: chat.product_id,
            user: {
              id: chat[otherUserIdField],
              name: chat[otherUserTable][otherUserNameField],
              type: isFarmer ? "Buyer" : "Farmer",
              image: chat[otherUserTable][otherUserImageField] || null,
              lastSeen: "online",
            },
            lastMessage: {
              content: lastMessage.content,
              timestamp: lastMessage.created_at,
              unread:
                lastMessage.read_at === null &&
                lastMessage.sender_id !== userId,
              sender_id: lastMessage.sender_id,
            },
          };
        }) || [];

      setChats(formattedChats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chats");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChats = (userId: string) => {
    const channel = supabase
      .channel("chats")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chats" },
        async (payload) => {
          const newChat = payload.new as any;
          const { data: farmer } = await supabase
            .from("farmers")
            .select("id")
            .eq("user_id", userId);
          const isRelevantChat =
            farmer && farmer.length > 0
              ? newChat.farmer_id === farmer[0].id
              : newChat.buyer_id ===
                (
                  await supabase
                    .from("buyers")
                    .select("id")
                    .eq("user_id", userId)
                ).data?.[0]?.id;

          if (isRelevantChat) await fetchChats(userId);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const subscribeToMessages = (userId: string) => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newMessage = payload.new as any;
          const { data: farmer } = await supabase
            .from("farmers")
            .select("id")
            .eq("user_id", userId);
          const { data: buyer } = await supabase
            .from("buyers")
            .select("id")
            .eq("user_id", userId);

          const isFarmer = farmer && farmer.length > 0;
          const userTableId = isFarmer ? farmer?.[0]?.id : buyer?.[0]?.id;
          const userIdField = isFarmer ? "farmer_id" : "buyer_id";

          const { data: chat, error: chatError } = await supabase
            .from("chats")
            .select("id")
            .eq("id", newMessage.chat_id)
            .eq(userIdField, userTableId)
            .single();

          if (chatError || !chat) return;

          setChats((prevChats) => {
            const updatedChats = [...prevChats];
            const chatIndex = updatedChats.findIndex(
              (c) => c.id === newMessage.chat_id
            );

            if (chatIndex !== -1) {
              const chat = updatedChats[chatIndex];
              chat.lastMessage = {
                content: newMessage.content,
                timestamp: newMessage.created_at,
                unread: newMessage.sender_id !== userId,
                sender_id: newMessage.sender_id,
              };

              updatedChats.splice(chatIndex, 1);
              updatedChats.unshift(chat);
            }

            return updatedChats;
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const handleChatSelect = (chatId: string) => {
    try {
      setSelectedChat(chatId);
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === chatId
            ? { ...chat, lastMessage: { ...chat.lastMessage, unread: false } }
            : chat
        )
      );
      notification.info("Chat opened");
    } catch (err) {
      notification.error("Failed to open chat");
      console.error(err);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", notificationId);

      if (updateError) throw updateError;
      notification.success("Message marked as read");
    } catch (err) {
      notification.error("Failed to mark message as read");
      console.error(err);
    }
  };

  const handleSendMessage = async (content: string) => {
    try {
      // ...existing code...
      notification.success("Message sent successfully");
    } catch (err) {
      notification.error("Failed to send message");
    }
  };

  const filteredChats = chats
    .filter((chat) =>
      chat.user.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((chat) =>
      activeTab === "received"
        ? chat.lastMessage.sender_id !== currentUserId
        : chat.lastMessage.sender_id === currentUserId
    );

  if (loading)
    return (
      <div className="p-4 text-emerald-600 animate-pulse">Loading chats...</div>
    );
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-100 to-emerald-50">
      <style>{customStyles}</style>
      <div className="w-96 bg-white shadow-xl rounded-l-xl overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
          <h2 className="text-xl font-bold tracking-tight">Messages</h2>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-200 h-5 w-5" />
            <input
              type="text"
              placeholder="Search messages..."
              className="pl-10 pr-4 py-2 w-full bg-white bg-opacity-20 text-white placeholder-emerald-200 rounded-full focus:ring-2 focus:ring-emerald-300 focus:outline-none transition-all duration-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("received")}
            className={`flex-1 py-3 text-sm font-medium text-gray-700 ${
              activeTab === "received" ? "tab-active" : ""
            }`}
          >
            Received
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={`flex-1 py-3 text-sm font-medium text-gray-700 ${
              activeTab === "sent" ? "tab-active" : ""
            }`}
          >
            Sent
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-14rem)] bg-gray-50">
          {filteredChats.length === 0 ? (
            <div className="p-4 text-center text-gray-600">
              No {activeTab} messages found.
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => handleChatSelect(chat.id)}
                className={`w-full p-4 flex items-start space-x-4 chat-hover ${
                  selectedChat === chat.id
                    ? "bg-emerald-100 border-l-4 border-emerald-500"
                    : ""
                }`}
              >
                {chat.user.image ? (
                  <img
                    src={chat.user.image}
                    alt={chat.user.name}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-400 shadow-md"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center ring-2 ring-emerald-400 shadow-md">
                    <User className="h-6 w-6 text-emerald-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {chat.user.name}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {new Date(chat.lastMessage.timestamp).toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {chat.user.type}: {chat.lastMessage.content}
                  </p>
                  <div className="flex items-center mt-1">
                    <span
                      className={`text-xs ${
                        chat.user.lastSeen === "online"
                          ? "text-emerald-500 font-medium"
                          : "text-gray-500"
                      }`}
                    >
                      {chat.user.lastSeen}
                    </span>
                    {chat.lastMessage.unread && activeTab === "received" && (
                      <span className="ml-2 h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        {selectedChat && currentUserId ? (
          <ChatWindow
            chatId={selectedChat}
            currentUserId={currentUserId}
            otherUser={{
              name: chats.find((chat) => chat.id === selectedChat)!.user.name,
              image:
                chats.find((chat) => chat.id === selectedChat)!.user.image ||
                "",
            }}
            productId={
              chats.find((chat) => chat.id === selectedChat)?.productId
            }
            onClose={() => setSelectedChat(null)}
            isFullHeight={true}
            roundedCorners="right"
            className="overflow-hidden"
            autoScrollToBottom={false} // Disable auto-scroll in Messages
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-gray-100">
            <div className="text-center p-8 bg-white rounded-xl shadow-xl animate-fade-in">
              <User className="h-16 w-16 text-emerald-500 mx-auto" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                No Chat Selected
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Messages;
