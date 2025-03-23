// components/chat/ChatWindow.tsx
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
  productId?: string;
  onClose: () => void;
}

function ChatWindow({ chatId, currentUserId, otherUser, productId, onClose }: ChatWindowProps) {
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
    scrollToBottom();
  }, [messages]);

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

    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: currentUserId,
        content: messageContent,
        product_id: productId,
      });

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

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <img src={otherUser.image} alt={otherUser.name} className="h-8 w-8 rounded-full object-cover" />
          <span className="ml-2 font-medium">{otherUser.name}</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '400px' }}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.sender_id === currentUserId ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p>{message.content}</p>
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

      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="space-y-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full rounded-full border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
            disabled={loading}
          />
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={suggestedPrice}
              onChange={(e) => setSuggestedPrice(e.target.value)}
              placeholder="Suggest a price (₹)"
              className="flex-1 rounded-full border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || (!newMessage.trim() && !suggestedPrice)}
              className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 disabled:opacity-50"
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