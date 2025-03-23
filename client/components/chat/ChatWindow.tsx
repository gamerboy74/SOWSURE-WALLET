import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Send, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
  chat_id: string;
}

interface ChatWindowProps {
  chatId: string;
  currentUserId: string;
  otherUser: { name: string; image: string };
  productId?: string | null;
  onClose: () => void;
  className?: string;
  isFullHeight?: boolean;
  hideShadow?: boolean;
  roundedCorners?: 'none' | 'left' | 'right' | 'all';
  autoScrollToBottom?: boolean; // New prop to control scrolling
}

function ChatWindow({
  chatId,
  currentUserId,
  otherUser,
  productId,
  onClose,
  className = '',
  isFullHeight = false,
  hideShadow = false,
  roundedCorners = 'all',
  autoScrollToBottom = true, // Default to true for other uses
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const unsubscribe = subscribeToMessages();
    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    if (autoScrollToBottom) {
      scrollToBottom();
    }
  }, [messages, autoScrollToBottom]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe((status, error) => {
        if (error) console.error('Subscription error:', error);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !suggestedPrice) return;

    setLoading(true);
    const messageContent = suggestedPrice
      ? `${newMessage.trim()}\nSuggested Price: ₹${suggestedPrice}`
      : newMessage.trim();

    const messageData: any = {
      chat_id: chatId,
      sender_id: currentUserId,
      content: messageContent,
    };

    if (productId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
      messageData.product_id = productId;
    }

    const { error } = await supabase
      .from('messages')
      .insert(messageData);

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
      setSuggestedPrice('');
    }
    setLoading(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const containerClasses = [
    'flex flex-col bg-white',
    isFullHeight ? 'h-[calc(100vh-4rem)]' : 'w-96 max-h-[500px]',
    hideShadow ? '' : 'shadow-xl',
    roundedCorners === 'all' ? 'rounded-lg' : '',
    roundedCorners === 'left' ? 'rounded-l-xl' : '',
    roundedCorners === 'right' ? 'rounded-r-xl' : '',
    roundedCorners === 'none' ? '' : '',
    !isFullHeight ? 'fixed bottom-4 right-4' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
        <div className="flex items-center space-x-3">
          {otherUser.image ? (
            <img
              src={otherUser.image}
              alt={otherUser.name}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-400"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center ring-2 ring-emerald-400">
              <X className="h-5 w-5 text-emerald-600" />
            </div>
          )}
          <span className="font-semibold text-lg">{otherUser.name}</span>
        </div>
        <button onClick={onClose} className="text-emerald-100 hover:text-white">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto p-6 ${isFullHeight ? 'bg-gray-50' : 'bg-white'}`}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'} mb-4`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 shadow-md ${
                message.sender_id === currentUserId
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p
                className={`text-xs mt-1 ${
                  message.sender_id === currentUserId ? 'text-emerald-100' : 'text-gray-500'
                }`}
              >
                {format(new Date(message.created_at), 'HH:mm')}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t bg-white">
        <div className="space-y-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full rounded-full border-gray-300 focus:ring-emerald-500 focus:border-emerald-500 px-4 py-2 text-sm"
            disabled={loading}
          />
          <div className="flex items-center space-x-3">
            <input
              type="number"
              value={suggestedPrice}
              onChange={(e) => setSuggestedPrice(e.target.value)}
              placeholder="Suggest a price (₹)"
              className="flex-1 rounded-full border-gray-300 focus:ring-emerald-500 focus:border-emerald-500 px-4 py-2 text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || (!newMessage.trim() && !suggestedPrice)}
              className="bg-emerald-600 text-white p-3 rounded-full hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ChatWindow;