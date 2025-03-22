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
}

interface ChatWindowProps {
  chatId: string;
  currentUserId: string;
  otherUser: {
    name: string;
    image: string;
  };
  onClose: () => void;
}

function ChatWindow({ chatId, currentUserId, otherUser, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    subscribeToMessages();
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

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from('messages')
      .insert([{
        chat_id: chatId,
        sender_id: currentUserId,
        content: newMessage.trim(),
      }]);

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
    }
    setLoading(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <img
            src={otherUser.image}
            alt={otherUser.name}
            className="h-8 w-8 rounded-full object-cover"
          />
          <span className="ml-2 font-medium">{otherUser.name}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '400px' }}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.sender_id === currentUserId
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p>{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.sender_id === currentUserId ? 'text-emerald-100' : 'text-gray-500'
              }`}>
                {format(new Date(message.created_at), 'HH:mm')}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newMessage.trim()}
            className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatWindow;